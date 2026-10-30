
  // ---- Trader analytics ----
  const traderAnalytics = useMemo(() => {
    const results = [];
    apiData.traders.forEach(trader => {
      const traderDef = TRADER_LIST.find(t => t.id === trader.id);
      const st = traderStatus[trader.id] || { ll: 1, rep: 0, commerce: 0 };
      const currentLL = st.ll || 1;
      const nextLevelData = trader.levels?.find(l => l.level === currentLL + 1);
      if (!nextLevelData) return;

      // 入力値はゲーム内表示値（エディションボーナス込み）のためそのまま使用
      const effectiveRep = parseFloat(st.rep || 0);
      const reqLevel = nextLevelData.requiredPlayerLevel || 0;
      const reqRep = nextLevelData.requiredReputation || 0;
      const reqCommerce = nextLevelData.requiredCommerce || 0;
      const noCommerce = traderDef?.noCommerce || reqCommerce === 0;
      const currShort = (trader.currency?.shortName || '').toUpperCase();
      const currency = currShort.includes('DOL') || currShort === 'USD' ? 'USD'
        : currShort.includes('EUR') ? 'EUR'
        : 'RUB';

      const levelOk = playerLevel >= reqLevel;
      const repOk = effectiveRep >= reqRep;
      const commerceOk = noCommerce || parseFloat(st.commerce || 0) >= reqCommerce;

      const levelDiff = reqLevel - playerLevel;
      const repDiff = (reqRep - effectiveRep).toFixed(2);
      const commerceDiff = reqCommerce - parseFloat(st.commerce || 0);
      const sym = getCurrencySymbol(currency);

      let priority = 'ok';
      let reason = [];

      if (levelOk && commerceOk && !repOk) {
        priority = 'urgent';
        reason.push(`信頼度が ${repDiff} 不足`);
      } else if (!levelOk || !repOk || !commerceOk) {
        const missingCount = [!levelOk, !repOk, !commerceOk].filter(Boolean).length;
        if (missingCount <= 2) {
          priority = 'soon';
          if (!levelOk) reason.push(`レベルがあと ${levelDiff} 不足`);
          if (!repOk) reason.push(`信頼度があと ${repDiff} 不足`);
          if (!commerceOk) reason.push(`取引額があと ${fmtNum(commerceDiff)} ${sym} 不足`);
        } else {
          priority = 'far';
          if (!levelOk) reason.push(`Lv${reqLevel}必要`);
          if (!repOk) reason.push(`信頼度${reqRep}`);
          if (!commerceOk) reason.push(`取引額${fmtCurrency(reqCommerce, currency)}`);
        }
      }

      results.push({
        trader, currency,
        currentLL, nextLL: currentLL + 1,
        priority, reason,
        reqLevel, reqRep, reqCommerce,
        levelOk, repOk, commerceOk, effectiveRep,
        levelDiff, commerceDiff: noCommerce ? 0 : commerceDiff,
      });
    });

    const order = { urgent: 0, soon: 1, far: 2, ok: 3 };
    results.sort((a, b) => order[a.priority] - order[b.priority]);
    return results;
  }, [apiData.traders, traderStatus, playerLevel, edition]);

  // ---- Hideout calculation ----
  const hideoutCalc = useMemo(() => {
    const results = [];
    apiData.hideout.forEach(station => {
      const currentLv = parseInt(hideoutLevels[station.id] || 0);
      const levelsToCalc = hideoutMode === 'next'
        ? station.levels.filter(l => l.level === currentLv + 1)
        : station.levels.filter(l => l.level > currentLv);

      if (levelsToCalc.length === 0) return;

      const itemMap = {};
      levelsToCalc.forEach(lv => {
        lv.itemRequirements?.forEach(req => {
          const id = req.item.id;
          if (!itemMap[id]) itemMap[id] = { item: req.item, needed: 0, toLv: lv.level };
          itemMap[id].needed += req.count;
        });
      });

      const allItems = Object.values(itemMap).map(({ item, needed, toLv }) => {
        const have = parseInt(stash[item.id] || 0);
        const remaining = Math.max(0, needed - have);
        return { item, needed, have, remaining, toLv };
      });
      const items = allItems.filter(i => i.remaining > 0);
      const completedItems = allItems.filter(i => i.remaining === 0);

      const nextLv = station.levels.find(l => l.level === currentLv + 1);
      const nextLevelItems = nextLv ? (nextLv.itemRequirements || []).map(req => ({
        item: req.item, needed: req.count, have: parseInt(stash[req.item.id] || 0),
      })) : [];
      // 次レベルのステーション依存条件と充足判定
      const stationReqs = (nextLv?.stationLevelRequirements || []).map(req => ({
        station: req.station,
        requiredLevel: req.level,
        currentLevel: parseInt(hideoutLevels[req.station.id] || 0),
        met: parseInt(hideoutLevels[req.station.id] || 0) >= req.level,
      }));
      const stationReqsMet = stationReqs.every(r => r.met);
      const isReadyForUpgrade = nextLevelItems.length > 0 && nextLevelItems.every(i => i.have >= i.needed) && stationReqsMet;

      if (allItems.length > 0) {
        const alertItems = items.filter(i => i.remaining === 1);
        const totalNeeded = allItems.reduce((s, i) => s + i.needed, 0);
        const totalHave = allItems.reduce((s, i) => s + Math.min(i.have, i.needed), 0);
        const pct = totalNeeded > 0 ? totalHave / totalNeeded : 0;
        results.push({ station, currentLv, items, completedItems, alertItems, pct, totalRemaining: items.reduce((s,i)=>s+i.remaining,0), nextLevelItems, isReadyForUpgrade, stationReqs, stationReqsMet });
      }
    });

    return results;
  }, [apiData.hideout, hideoutLevels, stash, hideoutMode]);

  // ソート用: stashを含まないhideoutCalc（在庫ゼロ扱い）
  // → ソート順がstash入力で変わらないようにするため
  const hideoutCalcForSort = useMemo(() => {
    const results = [];
    apiData.hideout.forEach(station => {
      const currentLv = parseInt(hideoutLevels[station.id] || 0);
      const levelsToCalc = hideoutMode === 'next'
        ? station.levels.filter(l => l.level === currentLv + 1)
        : station.levels.filter(l => l.level > currentLv);
      if (levelsToCalc.length === 0) return;
      const totalNeeded = levelsToCalc.reduce((s, lv) =>
        s + (lv.itemRequirements || []).reduce((a, r) => a + r.count, 0), 0);
      results.push({ stationId: station.id, totalNeeded });
    });
    return results;
  }, [apiData.hideout, hideoutLevels, hideoutMode]); // stash非依存

  // フィルター＋ソート済み hideoutCalc
  const filteredHideoutCalc = useMemo(() => {
    // まずフィルター適用（データはstashあり）
    const filtered = Object.keys(hideoutStationFilters).length === 0
      ? hideoutCalc
      : hideoutCalc.filter(s => hideoutStationFilters[s.station.id] !== false);

    // ソート順をstash非依存データで決定
    const sortOrderMap = Object.fromEntries(
      hideoutCalcForSort.map((s, i) => [s.stationId, i])
    );

    const sorted = [...filtered].sort((a, b) => {
      if (stationSort === 'close') {
        // 総アイテム数が少ない施設を上位（stash非依存）
        const na = hideoutCalcForSort.find(s => s.stationId === a.station.id)?.totalNeeded ?? 9999;
        const nb = hideoutCalcForSort.find(s => s.stationId === b.station.id)?.totalNeeded ?? 9999;
        return na - nb;
      } else if (stationSort === 'remaining') {
        const na = hideoutCalcForSort.find(s => s.stationId === a.station.id)?.totalNeeded ?? 9999;
        const nb = hideoutCalcForSort.find(s => s.stationId === b.station.id)?.totalNeeded ?? 9999;
        return na - nb;
      }
      // default: 元の順序を保持（stash入力中に動かないようalertItemsでのソートは行わない）
      return (sortOrderMap[a.station.id] ?? 999) - (sortOrderMap[b.station.id] ?? 999);
    });

    return sorted;
  }, [hideoutCalc, hideoutCalcForSort, hideoutStationFilters, stationSort]);

  // サマリー: 選択ステーション横断のアイテム集計（ソートなし・データのみ）
  const hideoutSummary = useMemo(() => {
    const map = {};
    filteredHideoutCalc.forEach(({ items, completedItems }) => {
      [...items, ...(completedItems || [])].forEach(({ item, needed, have }) => {
        if (!map[item.id]) map[item.id] = { item, needed: 0 };
        map[item.id].needed += needed;
      });
    });
    return Object.fromEntries(
      Object.entries(map).map(([id, { item, needed }]) => {
        const have = parseInt(stash[id] || 0);
        return [id, { item, needed, have, remaining: Math.max(0, needed - have) }];
      })
    );
  }, [filteredHideoutCalc, stash]);

  // スナップショット: { order: string[], doneIds: Set<string> }
  // ボタンを押した瞬間の順序 + needing/done区分を固定
  const applyHideoutSummarySort = useCallback(() => {
    const items = Object.values(hideoutSummary);
    const alerts = items.filter(i => i.remaining === 1);
    const needing = items.filter(i => i.remaining > 1);
    const done = items.filter(i => i.remaining === 0);
    needing.sort((a, b) => a.remaining - b.remaining);
    const sorted = [...alerts, ...needing, ...done];
    setSummaryItemOrder({
      order: sorted.map(i => i.item.id),
      doneIds: new Set(done.map(i => i.item.id)),
    });
  }, [hideoutSummary]);

  // 表示用: スナップショット順。未集計時は自然順
  const hideoutSummaryDisplay = useMemo(() => {
    const allItems = Object.values(hideoutSummary);
    if (!summaryItemOrder) return allItems;
    const orderMap = Object.fromEntries(summaryItemOrder.order.map((id, i) => [id, i]));
    return [...allItems].sort((a, b) => (orderMap[a.item.id] ?? 9999) - (orderMap[b.item.id] ?? 9999));
  }, [hideoutSummary, summaryItemOrder]);

  // ---- Pinned tasks ----
  const taskHasMap = (task, mapName) =>
    (task.objectives || []).some(obj => (obj.maps || []).some(m => m.name === mapName));

  const pinnedTasks = useMemo(() => {
    let tasks = pinnedTaskIds.map(id => apiData.tasks.find(t => t.id === id)).filter(Boolean);
    if (tabAncestorIds) tasks = tasks.filter(t => tabAncestorIds.has(t.id)); // アクティブタブの祖先に絞り込み
    return taskMapFilter === 'all' ? tasks : tasks.filter(t => taskHasMap(t, taskMapFilter));
  }, [pinnedTaskIds, apiData.tasks, taskMapFilter, tabAncestorIds]);

  const mapTasks = useMemo(() => {
    let tasks = mapTaskIds.map(id => apiData.tasks.find(t => t.id === id)).filter(Boolean);
    if (tabAncestorIds) tasks = tasks.filter(t => tabAncestorIds.has(t.id)); // アクティブタブの祖先に絞り込み
    return taskMapFilter === 'all' ? tasks : tasks.filter(t => taskHasMap(t, taskMapFilter));
  }, [mapTaskIds, apiData.tasks, taskMapFilter, tabAncestorIds]);

  // id → タスク の高速ルックアップ（プラン・序盤フローのツリー描画などで使用）
  const taskById = useMemo(() => Object.fromEntries(apiData.tasks.map(t => [t.id, t])), [apiData.tasks]);

  // タスクの登場マップ名（重複除去）
  const taskMapNames = (task) => [...new Set((task.objectives || []).flatMap(o => (o.maps || []).map(m => m.name)).filter(Boolean))];

  // ===== プラン useMemo =====
  // プランの全タスク/project_tabゴールの祖先ID集合（前提タスク含む）
  const planTaskIds = useMemo(() => {
    const ids = new Set();
    planItems.forEach(item => {
      const goalId = item.type === 'task' ? item.taskId
        : item.type === 'project_tab' ? item.goalTaskId : null;
      if (goalId) getAncestorTaskIds(goalId).forEach(id => ids.add(id));
    });
    return ids;
  }, [planItems, apiData.tasks]);

  // 着手可能タスク（planTaskIds内・未完了・全前提が完了済み）
  const planAvailableNow = useMemo(() => {
    if (!planTaskIds.size) return [];
    return [...planTaskIds]
      .map(id => taskById[id])
      .filter(Boolean)
      .filter(t => !completedTaskIds.includes(t.id))
      .filter(t => (t.taskRequirements || []).every(r => completedTaskIds.includes(r.task.id)))
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ja'));
  }, [planTaskIds, taskById, completedTaskIds]);

  // プランの着手可能タスクに登場するマップ一覧
  const planAvailableMaps = useMemo(() => {
    const names = new Set();
    planAvailableNow.forEach(t => taskMapNames(t).forEach(m => names.add(m)));
    return [...names].sort((a, b) => a.localeCompare(b, 'ja'));
  }, [planAvailableNow]);

  // プランの全タスクに必要なアイテム集計（section E: 必要アイテム合算）
  const planRequiredItems = useMemo(() => {
    const map = {}; // itemId → { item, totalCount, firCount, sources: [{label, count, fir}] }
    const addItem = (item, count, fir, label) => {
      if (!item?.id || !count) return;
      if (!map[item.id]) map[item.id] = { item, totalCount: 0, firCount: 0, sources: [] };
      map[item.id].totalCount += count;
      if (fir) map[item.id].firCount += count;
      map[item.id].sources.push({ label, count, fir: !!fir });
    };
    // タスク納品アイテム（planTaskIds内の未完了タスクのgiveItem/giveQuestItem）
    [...planTaskIds].forEach(id => {
      if (completedTaskIds.includes(id)) return;
      const task = taskById[id];
      if (!task) return;
      (task.objectives || []).forEach(obj => {
        if (!obj.item || !obj.count) return;
        if (obj.type === 'giveItem' || obj.type === 'giveQuestItem') {
          addItem(obj.item, obj.count, obj.foundInRaid, `タスク「${task.name}」`);
        }
      });
    });
    // ハイドアウトゴール
    planItems.filter(p => p.type === 'hideout').forEach(p => {
      const station = apiData.hideout.find(s => s.id === p.stationId);
      const lvl = station?.levels?.find(l => l.level === p.level);
      (lvl?.itemRequirements || []).forEach(r => {
        if (r.item && r.count) addItem(r.item, r.count, false, `${station.name} Lv${p.level}`);
      });
    });
    // バーターゴール
    planItems.filter(p => p.type === 'barter').forEach(p => {
      const barter = apiData.barters.find(b => b.id === p.barterId);
      (barter?.requiredItems || []).forEach(r => {
        if (r.item && r.count) addItem(r.item, r.count, false, `${barter.trader?.name || ''}バーター`);
      });
    });
    return Object.values(map)
      .sort((a, b) => (b.firCount > 0 ? 1 : 0) - (a.firCount > 0 ? 1 : 0)
        || Math.max(0, a.totalCount - (stash[a.item.id] || 0)) < Math.max(0, b.totalCount - (stash[b.item.id] || 0)) ? 1 : -1);
  }, [planTaskIds, planItems, taskById, completedTaskIds, apiData.hideout, apiData.barters, stash]);

  // 進行中タスクの納品(giveItem)アイテムを集計（同一アイテムは合算、不足分のみ）
  const pinnedDeliveryItems = useMemo(() => {
    const map = {};
    pinnedTasks.forEach(task => {
      (task.objectives || []).forEach(obj => {
        if (obj.type !== 'giveItem' || !obj.item || !obj.count) return;
        const key = obj.item.id;
        if (!map[key]) map[key] = { item: obj.item, count: 0, foundInRaid: false, entries: [] };
        map[key].count += obj.count;
        if (obj.foundInRaid) map[key].foundInRaid = true;
        map[key].entries.push({ taskId: task.id, taskName: task.name, count: obj.count, objId: obj.id });
      });
    });
    return Object.values(map).sort((a, b) => a.item.name.localeCompare(b.item.name, 'ja'));
  }, [pinnedTasks]);

  const togglePin = (taskId) => setPinnedTaskIds(prev =>
    prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
  );
  const toggleMapPin = (taskId) => {
    const isPinned = mapTaskIds.includes(taskId);
    setMapTaskIds(prev => isPinned ? prev.filter(id => id !== taskId) : [...prev, taskId]);
    // ピン止め → 進行中にも追加。ピン解除 → 進行中からは外さない
    if (!isPinned) setPinnedTaskIds(prev => prev.includes(taskId) ? prev : [...prev, taskId]);
  };
  const toggleComplete = (taskId) => {
    const isCurrentlyDone = completedTaskIds.includes(taskId);
    if (isCurrentlyDone) {
      // 完了取り消しは対象タスクのみ
      setCompletedTaskIds(prev => prev.filter(id => id !== taskId));
      setRecentlyUnlockedTaskIds([]);
    } else {
      // 完了にする場合：対象タスク＋すべての前提タスクを再帰的に収集
      const collectPrereqs = (id, visited = new Set()) => {
        if (visited.has(id)) return visited;
        visited.add(id);
        const task = apiData.tasks.find(t => t.id === id);
        (task?.taskRequirements || []).forEach(req => collectPrereqs(req.task.id, visited));
        return visited;
      };
      const allIds = [...collectPrereqs(taskId)];
      const newlyCompleted = allIds.filter(id => !completedTaskIds.includes(id));
      const nextCompleted = new Set([...completedTaskIds, ...allIds]);
      setCompletedTaskIds([...nextCompleted]);
      // 完了済みをリストから除去し、後続タスクのうち前提がすべて完了したものを進行中に追加
      const withoutDone = pinnedTaskIds.filter(id => !allIds.includes(id));
      const autoAdd = [];
      allIds.forEach(completedId => {
        (taskSuccessorsMap[completedId] || []).forEach(successor => {
          if (nextCompleted.has(successor.id)) return; // 既に完了済み
          if (withoutDone.includes(successor.id)) return; // 既に進行中
          if (autoAdd.includes(successor.id)) return;
          const allPrereqsDone = (successor.taskRequirements || [])
            .every(req => nextCompleted.has(req.task.id));
          if (allPrereqsDone) autoAdd.push(successor.id);
        });
      });
      setPinnedTaskIds([...withoutDone, ...autoAdd]);
      setMapTaskIds(prev => prev.filter(id => !allIds.includes(id)));
      setRecentlyUnlockedTaskIds(autoAdd);
      if (newlyCompleted.length > 0) {
        const names = newlyCompleted.map(id => apiData.tasks.find(t => t.id === id)?.name).filter(Boolean);
        addJournalTaskComplete(names);
      }
    }
  };

  // タスクの持ち物（type付き）を抽出
  const getTaskItems = (task) =>
    (task.objectives || [])
      .filter(o => o.item && o.count)
      .map(o => ({ item: o.item, count: o.count, foundInRaid: o.foundInRaid, type: o.type }));

  // ---- Task tree ----
  // taskId → そのタスクを前提とする後続タスク一覧
  const taskSuccessorsMap = useMemo(() => {
    const map = {};
    apiData.tasks.forEach(task => {
      (task.taskRequirements || []).forEach(req => {
        if (!map[req.task.id]) map[req.task.id] = [];
        map[req.task.id].push(task);
      });
    });
    return map;
  }, [apiData.tasks]);

  // ---- Task search ----
  const taskMaps = useMemo(() => {
    const names = new Set();
    apiData.tasks.forEach(t => (t.objectives || []).forEach(obj => { (obj.maps || []).forEach(m => { if (m.name) names.add(m.name); }); }));
    return [...names].sort((a, b) => a.localeCompare(b, 'ja'));
  }, [apiData.tasks]);

  const filteredTasks = useMemo(() => {
    const tabActive = !!tabAncestorIds;
    if (!tabActive && !taskSearch.trim() && taskTraderFilter === 'all' && taskMapFilter === 'all' && taskTypeFilter === 'all') return [];
    const q = taskSearch.trim().toLowerCase();
    const apiFiltered = apiData.tasks.filter(t => {
      if (tabActive && !tabAncestorIds.has(t.id)) return false;
      if (!showCompletedTasks && completedTaskIds.includes(t.id)) return false;
      if (taskTraderFilter !== 'all' && t.trader?.id !== taskTraderFilter) return false;
      if (taskMapFilter !== 'all' && !taskHasMap(t, taskMapFilter)) return false;
      if (taskTypeFilter !== 'all' && !taskMatchesType(t, taskTypeFilter)) return false;
      if (q) return (t.name || '').toLowerCase().includes(q);
      return true;
    });
    // カスタムタスクは名前検索があるときのみ末尾に追加（プロジェクトタブ時は除外）
    const customFiltered = (q && !tabActive) ? customTasks.filter(t => {
      if (!showCompletedTasks && completedTaskIds.includes(t.id)) return false;
      return (t.name || '').toLowerCase().includes(q);
    }) : [];
    return [...apiFiltered, ...customFiltered].slice(0, tabActive ? 999 : 50);
  }, [apiData.tasks, customTasks, taskSearch, taskTraderFilter, taskMapFilter, taskTypeFilter, showCompletedTasks, completedTaskIds, tabAncestorIds]);

  // ---- Barter helpers ----
  // barterKey = "resultItemId::traderId::level"
  const makeBarterKey = (resultItemId, traderId, level) => `${resultItemId}::${traderId}::${level}`;

  const allBarters = useMemo(() => {
    return apiData.barters
      .filter(b => b.trader?.id && b.rewardItems?.length > 0)
      .map(b => {
        const rewardItem = b.rewardItems[0].item;
        return {
          key: makeBarterKey(rewardItem.id, b.trader.id, b.level),
          resultItem: rewardItem,
          rewardCount: b.rewardItems[0].count,
          traderId: b.trader.id,
          traderName: b.trader.name,
          level: b.level,
          requiredItems: b.requiredItems || [],
        };
      });
  }, [apiData.barters]);

  const getBartersByKeys = (keys) =>
    keys.map(k => allBarters.find(b => b.key === k)).filter(Boolean);

  // Aggregate required items across a list of barter trades
  const aggregateRequiredItems = (barterList) => {
    const map = {};
    barterList.forEach(b => {
      b.requiredItems.forEach(({ item, count }) => {
        if (!map[item.id]) map[item.id] = { item, needed: 0 };
        map[item.id].needed += count;
      });
    });
    return Object.values(map).map(({ item, needed }) => {
      const have = parseInt(stash[item.id] || 0);
      return { item, needed, have, remaining: Math.max(0, needed - have) };
    }).sort((a, b) => a.remaining - b.remaining);
  };

  const wishlistBarters = useMemo(() => getBartersByKeys(wishlist), [wishlist, allBarters]);
  const favoritesBarters = useMemo(() => getBartersByKeys(favorites), [favorites, allBarters]);
  const favoritesItems = useMemo(() => aggregateRequiredItems(favoritesBarters), [favoritesBarters, stash]);


  // バーター・クラフト共通カテゴリ一覧（和集合）
  // ※ バーター側はAPIがcategoriesを返さないためitemsデータと突合
  const barterCategories = useMemo(() => {
    const set = new Set();
    allBarters.forEach(b => {
      const item = apiData.items.find(i => i.id === b.resultItem.id);
      if (item) (item.categories || []).forEach(cat => set.add(cat.name));
    });
    return [...set];
  }, [allBarters, apiData.items]);

  const filteredBarterList = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    return allBarters.filter(b => {
      if (barterTraderFilter !== 'all' && b.traderId !== barterTraderFilter) return false;
      if (barterLLFilter !== 'all' && String(b.level) !== barterLLFilter) return false;
      if (listCategoryFilter !== 'all') {
        const item = apiData.items.find(i => i.id === b.resultItem.id);
        const cats = item ? (item.categories || []).map(c => c.name) : [];
        if (!cats.includes(listCategoryFilter)) return false;
      }
      if (q) {
        const nameMatch = (b.resultItem.name || '').toLowerCase().includes(q);
        const shortMatch = (b.resultItem.shortName || '').toLowerCase().includes(q);
        if (!nameMatch && !shortMatch) return false;
      }
      return true;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allBarters, barterTraderFilter, barterLLFilter, listCategoryFilter, listSearch, apiData.items]);

  const addToWishlist = (key) => setWishlist(prev => prev.includes(key) ? prev : [...prev, key]);
  const removeFromWishlist = (key) => setWishlist(prev => prev.filter(k => k !== key));
  const addToFavorites = (key) => setFavorites(prev => prev.includes(key) ? prev : [...prev, key]);
  const removeFromFavorites = (key) => setFavorites(prev => prev.filter(k => k !== key));

  // ---- Craft helpers ----
  const makeCraftKey = (resultItemId, stationId, level) => `craft::${resultItemId}::${stationId}::${level}`;

  const allCrafts = useMemo(() => {
    return apiData.crafts
      .filter(c => c.rewardItems?.length > 0)
      .map(c => {
        const rewardItem = c.rewardItems[0].item;
        const stationName = STATION_NAME_OVERRIDES[c.station?.name] ?? c.station?.name;
        return {
          key: makeCraftKey(rewardItem.id, c.station?.id, c.level),
          resultItem: rewardItem,
          rewardCount: c.rewardItems[0].count,
          stationId: c.station?.id,
          stationName,
          level: c.level,
          duration: c.duration,
          requiredItems: c.requiredItems || [],
          isCraft: true,
        };
      });
  }, [apiData.crafts]);

  const wishlistCraftsBarters = useMemo(() =>
    wishlistCrafts.map(k => allCrafts.find(c => c.key === k)).filter(Boolean),
    [wishlistCrafts, allCrafts]
  );

  const wishlistItems = useMemo(() => aggregateRequiredItems([...wishlistBarters, ...wishlistCraftsBarters]), [wishlistBarters, wishlistCraftsBarters, stash]);

  const [craftStationFilter, setCraftStationFilter] = useState('all');
  const [craftDisplayLimit, setCraftDisplayLimit] = useState(50);
  const craftSentinelRef = useRef(null);

  // カテゴリ名の日本語マップ（APIは英語固定のため手動マッピング）
  const CATEGORY_JA = {
    'Containers': 'コンテナ', 'Keys': '鍵', 'Keycards': 'キーカード',
    'Barter items': '物々交換品', 'Provisions': '食料品', 'Medical supplies': '医療品',
    'Electronics': '電子機器', 'Building materials': '建材', 'Tools': '工具',
    'Ammo': '弾薬', 'Ammunition': '弾薬', 'Weapons': '武器', 'Mods': 'モッド',
    'Gear': '装備', 'Suppressors': 'サプレッサー', 'Maps': 'マップ',
    'Info items': '情報アイテム', 'Spec. weapons': '特殊武器',
    'Special equipment': '特殊装備', 'Flammables': '引火物',
    'Assault rifles': 'アサルトライフル', 'Shotguns': 'ショットガン',
    'SMGs': 'SMG', 'Pistols': 'ピストル', 'Sniper rifles': 'スナイパーライフル',
    'Machinegun': '機関銃', 'Grenades': 'グレネード',
  };
  const catLabel = (name) => uiLang === 'ja' ? (CATEGORY_JA[name] || name) : name;

  // 施設一覧（ユニーク）
  const craftStations = useMemo(() => {
    const map = {};
    allCrafts.forEach(c => { if (c.stationId) map[c.stationId] = c.stationName; });
    return Object.entries(map).map(([id, name]) => ({ id, name })).sort((a,b) => a.name.localeCompare(b.name, 'ja'));
  }, [allCrafts]);

  // バーター＋クラフト 共通カテゴリ（和集合・ソート済み）
  const craftCategories = useMemo(() => {
    const set = new Set(barterCategories);
    allCrafts.forEach(c => {
      (c.resultItem.categories || []).forEach(cat => set.add(cat.name));
    });
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [barterCategories, allCrafts]);

  const filteredCraftList = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    return allCrafts.filter(c => {
      if (craftStationFilter !== 'all' && c.stationId !== craftStationFilter) return false;
      if (listCategoryFilter !== 'all') {
        const cats = (c.resultItem.categories || []).map(cat => cat.name);
        if (!cats.includes(listCategoryFilter)) return false;
      }
      if (q) {
        return (c.resultItem.name || '').toLowerCase().includes(q) ||
               (c.resultItem.shortName || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [allCrafts, listSearch, craftStationFilter, listCategoryFilter]);

  // フィルターON = 全件, フィルターOFF = 無限スクロール（craftDisplayLimit件ずつ）
  const craftFiltered = craftStationFilter !== 'all' || listCategoryFilter !== 'all' || listSearch.trim();
  const displayedCrafts = craftFiltered ? filteredCraftList : filteredCraftList.slice(0, craftDisplayLimit);

  // IntersectionObserver: センチネルが見えたら自動追加
  useEffect(() => {
    if (!craftSentinelRef.current || craftFiltered) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        setCraftDisplayLimit(prev => prev + 50);
      }
    }, { rootMargin: '200px' });
    observer.observe(craftSentinelRef.current);
    return () => observer.disconnect();
  }, [craftFiltered, craftDisplayLimit, displayedCrafts.length]);

  const addToWishlistCraft = (key) => setWishlistCrafts(prev => prev.includes(key) ? prev : [...prev, key]);
  const removeFromWishlistCraft = (key) => setWishlistCrafts(prev => prev.filter(k => k !== key));

  // アイテムID → wishlist/favorites に含まれるバーターがあるか
  const itemBarterStatusMap = useMemo(() => {
    const map = {};
    wishlistBarters.forEach(b => { map[b.resultItem.id] = { ...map[b.resultItem.id], wishlist: true }; });
    favoritesBarters.forEach(b => { map[b.resultItem.id] = { ...map[b.resultItem.id], favorites: true }; });
    return map;
  }, [wishlistBarters, favoritesBarters]);

  // ---- Item list ----
  const filteredItems = useMemo(() => {
    let items = apiData.items;
    if (searchQuery) {
      const tokens = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
      items = items.filter(i => {
        const name = i.name?.toLowerCase() || '';
        const sn = i.shortName?.toLowerCase() || '';
        return tokens.every(t => name.includes(t) || sn.includes(t));
      });
    }
    if (onlyTradeable) {
      items = items.filter(i => {
        return i.buyFor?.some(b => {
          const tid = b.vendor?.trader?.id;
          if (!tid) return false;
          const st = traderStatus[tid] || { ll: 1 };
          const reqLL = b.vendor?.minTraderLevel || 1;
          const reqPL = apiData.traders.find(t => t.id === tid)
            ?.levels?.find(l => l.level === reqLL)?.requiredPlayerLevel || 0;
          return st.ll >= reqLL && playerLevel >= reqPL;
        });
      });
    }
    if (onlyInStock) {
      items = items.filter(i => parseInt(stash[i.id] || 0) > 0);
    }
    return items.slice(0, 200);
  }, [apiData.items, searchQuery, onlyTradeable, onlyInStock, stash, traderStatus, playerLevel, apiData.traders]);

  // ---- カテゴリ一覧 (選択中のトレーダー間で取引可能なアイテムのカテゴリのみ) ----
  const itemCategories = useMemo(() => {
    const set = new Set();
    apiData.items.forEach(item => {
      const hasBuy = profitBuyTrader
        ? (item.buyFor || []).some(b => b.vendor?.trader?.id === profitBuyTrader)
        : (item.buyFor || []).some(b => b.vendor?.trader?.id);
      const hasSell = profitSellTrader
        ? (item.sellFor || []).some(s => s.vendor?.trader?.id === profitSellTrader)
        : (item.sellFor || []).some(s => s.vendor?.trader?.id);
      if (hasBuy && hasSell) {
        (item.categories || []).forEach(c => set.add(c.name));
      }
    });
    return Array.from(set).sort();
  }, [apiData.items, profitBuyTrader, profitSellTrader]);

  // ---- 損益TOP3計算 ----
  // 損益 = 購入コスト(priceRUB) - 売却価格(priceRUB)  → 正=損失、負=利益
  const profitTop3 = useMemo(() => {
    if (apiData.items.length === 0) return [];
    const results = [];
    for (const item of apiData.items) {
      // カテゴリ絞り込み（指定なしなら全通過、複数選択はOR）
      if (profitCategoryFilter.length > 0) {
        const cats = (item.categories || []).map(c => c.name);
        if (!profitCategoryFilter.some(f => cats.includes(f))) continue;
      }
      // 売却候補: トレーダーへ売却（売却トレーダー指定があればそのトレーダーのみ）
      let traderSells = (item.sellFor || []).filter(s => s.vendor?.trader?.id);
      if (profitSellTrader) traderSells = traderSells.filter(s => s.vendor.trader.id === profitSellTrader);
      if (traderSells.length === 0) continue;
      const bestSellRUB = Math.max(...traderSells.map(s => s.priceRUB));
      const bestSell = traderSells.find(s => s.priceRUB === bestSellRUB);
      // 購入候補: トレーダーから購入（購入トレーダー指定があればそのトレーダーのみ）
      let traderBuys = (item.buyFor || []).filter(b => b.vendor?.trader?.id);
      if (profitBuyTrader) traderBuys = traderBuys.filter(b => b.vendor.trader.id === profitBuyTrader);
      if (traderBuys.length === 0) continue;
      const bestBuyRUB = Math.min(...traderBuys.map(b => b.priceRUB));
      const bestBuy = traderBuys.find(b => b.priceRUB === bestBuyRUB);
      const loss = bestBuyRUB - bestSellRUB; // 正=損失
      results.push({ item, bestBuy, bestBuyRUB, bestSell, bestSellRUB, loss });
    }
    results.sort((a, b) => a.loss - b.loss);
    return results.slice(0, 3);
  }, [apiData.items, profitCategoryFilter, profitBuyTrader, profitSellTrader]);

  const updateTraderStatus = useCallback((traderId, field, value) => {
    setTraderStatus(prev => {
      const current = prev[traderId] || {};
      const updated = { ...current, [field]: value };

      // LLが変更された場合、信頼度・取引額を必要最低値まで引き上げ
      if (field === 'll') {
        const apiTrader = apiData.traders.find(t => t.id === traderId);
        const levelInfo = apiTrader?.levels?.find(l => l.level === value);
        if (levelInfo) {
          const currentRep = parseFloat(current.rep ?? 0);
          const currentCommerce = parseFloat(current.commerce ?? 0);
          if (currentRep < (levelInfo.requiredReputation ?? 0))
            updated.rep = levelInfo.requiredReputation;
          if (currentCommerce < (levelInfo.requiredCommerce ?? 0))
            updated.commerce = levelInfo.requiredCommerce;
        }
      }

      return { ...prev, [traderId]: updated };
    });
  }, [apiData.traders]);


  // ── 出撃準備 ──
  const raidObjectives = useMemo(() => {
    const classifyObj = (type, foundInRaid) => {
      // findItem / giveItem は foundInRaid フラグで分類（giveItem FIR も収集扱い）
      if (type === 'findItem') return foundInRaid ? 'collect' : 'bring';
      if (type === 'giveItem') return 'bring';
      if (type === 'findQuestItem') return 'collect';
      if (type === 'mark' || type === 'plantItem') return 'place';
      if (type === 'kill' || type === 'shoot') return 'kill';
      if (type === 'extract') return 'extract';
      if (type === 'locate' || type === 'visit') return 'locate';
      return null;
    };
    const allTasks = [...apiData.tasks, ...customTasks];
    const activeTasks = allTasks.filter(t =>
      pinnedTaskIds.includes(t.id) && !completedTaskIds.includes(t.id)
    );
    if (!raidMap) return { activeTasks, specific: [], anywhere: [] };
    const specific = [], anywhere = [];
    for (const task of activeTasks) {
      for (const obj of (task.objectives || [])) {
        const cat = classifyObj(obj.type, obj.foundInRaid);
        if (!cat) continue;
        const objMaps = (obj.maps || []).map(m => m.name);
        if (objMaps.length === 0) anywhere.push({ obj, task, cat });
        else if (objMaps.includes(raidMap)) specific.push({ obj, task, cat });
      }
    }
    // findQuestItem でマップ未指定のものが、同タスクに specific な objective がある場合は specific に移動
    const specificTaskIds = new Set(specific.map(x => x.task.id));
    const newAnywhere = [];
    for (const item of anywhere) {
      if (item.obj.type === 'findQuestItem' && specificTaskIds.has(item.task.id)) {
        specific.push(item);
      } else {
        newAnywhere.push(item);
      }
    }
    anywhere.length = 0;
    newAnywhere.forEach(x => anywhere.push(x));

    // 同タスク内で同アイテムが collect と bring の両方にある場合 bring を除去
    const collectKeys = new Set(
      [...specific, ...anywhere]
        .filter(x => x.cat === 'collect' && x.obj.item?.id)
        .map(x => x.task.id + '_' + x.obj.item.id)
    );
    const dedup = list => list.filter(x =>
      x.cat !== 'bring' || !x.obj.item?.id || !collectKeys.has(x.task.id + '_' + x.obj.item.id)
    );
    return { activeTasks, specific: dedup(specific), anywhere: dedup(anywhere) };
  }, [apiData.tasks, customTasks, pinnedTaskIds, completedTaskIds, raidMap]);

  const raidTaskSearchResults = useMemo(() => {
    if (raidTaskSearch.length < 1) return [];
    const low = raidTaskSearch.toLowerCase();
    return [...apiData.tasks, ...customTasks]
      .filter(t => {
        if (completedTaskIds.includes(t.id)) return false;
        return true; // 進行中タスクも編集のために表示する
      })
      .filter(t => (t.name || '').toLowerCase().includes(low))
      .slice(0, 10);
  }, [apiData.tasks, customTasks, pinnedTaskIds, completedTaskIds, raidTaskSearch]);

  const killTargets = useMemo(() => {
    const seen = new Set();
    apiData.tasks.forEach(t => (t.objectives || []).forEach(o => {
      if ((o.type === 'kill' || o.type === 'shoot') && o.target) seen.add(o.target);
    }));
    const sorted = [...seen].sort();
    // "Any target" がAPIデータにない場合でも常に先頭に表示
    if (!seen.has('Any target')) sorted.unshift('Any target');
    return sorted;
  }, [apiData.tasks]);

  const raidTraderNames = useMemo(() => {
    const fromApi = apiData.traders.map(t => t.name).filter(Boolean).sort();
    return fromApi.length > 0 ? fromApi
      : ['Prapor', 'Therapist', 'Fence', 'Skier', 'Peacekeeper', 'Mechanic', 'Ragman', 'Jaeger', 'Lightkeeper', 'BTR Driver'];
  }, [apiData.traders]);

  // ── OCR functions ──
  const handleOcrFile = useCallback((file) => {
    if (!file) return;
    if (!file.type.match(/^image\/(jpeg|png)/i)) { alert('JPG / PNG ファイルのみ対応しています'); return; }
    if (file.size > 10 * 1024 * 1024) { alert('ファイルサイズは10MB以下にしてください'); return; }
    const url = URL.createObjectURL(file);
    setOcrFile({ url, name: file.name });
    setOcrMatches([]);
    setOcrProgress(0);
  }, []);

  // Ctrl+V ペースト（タスク品登録モーダル表示中はその画像へ。それ以外はタブに応じてスタッシュOCR or レイドOCRへ振り分け）
  const mapsItemFormOpen = !!mapsItemForm;
  useEffect(() => {
    const onPaste = (e) => {
      if (e.defaultPrevented) return; // ピン詳細位置画像など、個別の貼り付け処理で消費済み
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          if (mapsItemFormOpen) {
            e.preventDefault();
            imageFileToIconDataUrl(item.getAsFile())
              .then(url => setMapsItemForm(f => f && { ...f, iconLink: url, error: '' }))
              .catch(err => setMapsItemForm(f => f && { ...f, error: err.message }));
          }
          else if (activeTab === 'maps') return; // マップタブでは OCR に回さない
          else if (activeTab === 'raid') handleRaidOcrFiles([item.getAsFile()]);
          else handleOcrFile(item.getAsFile());
          break;
        }
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [handleOcrFile, handleRaidOcrFiles, activeTab, mapsItemFormOpen]);

  // 候補ドロップダウン外クリックで閉じる・検索リセット
  useEffect(() => {
    setOcrDropdownSearch('');
    if (ocrDropdownIdx === null) return;
    const close = () => setOcrDropdownIdx(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [ocrDropdownIdx]);

  const matchOcrText = useCallback((rawText) => {
    const compareStrings = (tLow, c) => {
      if (!c) return 0;
      if (c === tLow) return 1.0;
      if (c.startsWith(tLow)) return Math.min(1.0, (tLow.length / c.length) * 1.3);
      if (tLow.startsWith(c)) return Math.min(1.0, (c.length / tLow.length) * 1.3);
      if (c.includes(tLow) || tLow.includes(c))
        return Math.min(c.length, tLow.length) / Math.max(c.length, tLow.length);
      if (tLow.length >= 3 && c.length >= 3) {
        const dist = levenshtein(tLow, c);
        const maxLen = Math.max(tLow.length, c.length);
        const maxDist = maxLen >= 7 ? 3 : maxLen >= 5 ? 2 : 1;
        if (dist <= maxDist) return (1 - dist / maxLen) * 0.92;
      }
      return 0;
    };
    const calcScore = (tLow, c) => {
      const direct = compareStrings(tLow, c);
      const words = c.split(/[\s\-_]+/).filter(w => w.length >= 2);
      let wordBest = 0;
      if (words.length > 1) {
        for (const w of words) { const s = compareStrings(tLow, w) * 0.95; if (s > wordBest) wordBest = s; }
        for (let k = 0; k < words.length - 1; k++) {
          const s = compareStrings(tLow, words[k] + words[k+1]) * 0.90;
          if (s > wordBest) wordBest = s;
        }
        const sAll = compareStrings(tLow, words.join('')) * 0.88;
        if (sAll > wordBest) wordBest = sAll;
      }
      return Math.max(direct, wordBest);
    };

    const tokens = rawText
      .split(/\s+/)
      .map(w => w.replace(/[^a-zA-Z0-9\-]/g, '').trim())
      .filter(w => w.length >= 3);

    const scoreToken = (token) => {
      const tLow = token.toLowerCase();
      const allCandidates = [];
      for (const item of apiData.items) {
        const nameForms = [item.name, item.shortName, item.nameEn, item.shortNameEn]
          .filter(Boolean).map(s => s.toLowerCase());
        let itemBest = 0;
        for (const cand of nameForms) {
          const s = Math.max(calcScore(tLow, cand), calcScore(tLow, cand.replace(/\s+/g, '')));
          if (s > itemBest) itemBest = s;
        }
        if (itemBest >= 0.30) allCandidates.push({ item, score: itemBest });
      }
      allCandidates.sort((a, b) => b.score - a.score);
      return {
        token,
        item: allCandidates[0]?.score >= 0.60 ? allCandidates[0].item : null,
        score: allCandidates[0]?.score || 0,
        topCandidates: allCandidates.filter(c => c.score >= 0.60).slice(0, 5),
        looseCandidates: allCandidates.filter(c => c.score < 0.60).slice(0, 8),
      };
    };

    const tokenMatches = tokens.map(scoreToken);
    const itemMap = new Map();
    const unmatchedTokens = [];
    for (const m of tokenMatches) {
      if (m.item) {
        if (itemMap.has(m.item.id)) {
          itemMap.get(m.item.id).qty++;
          itemMap.get(m.item.id).tokens.push(m.token);
        } else {
          itemMap.set(m.item.id, { item: m.item, qty: 1, tokens: [m.token], topCandidates: m.topCandidates });
        }
      } else {
        unmatchedTokens.push({ token: m.token, looseCandidates: m.looseCandidates });
      }
    }
    const matchedTokenSet = new Set(Array.from(itemMap.values()).flatMap(e => e.tokens.map(t => t.toLowerCase())));
    const purelyUnmatched = unmatchedTokens.filter(m => !matchedTokenSet.has(m.token.toLowerCase()));
    return [
      ...purelyUnmatched.map(({ token, looseCandidates }) => ({
        line: token, item: null, qty: 1, checked: false, topCandidates: [], looseCandidates,
      })),
      ...Array.from(itemMap.values()).map(({ item, qty, tokens, topCandidates }) => ({
        line: tokens.join(' '), item, qty, checked: true, topCandidates, looseCandidates: [],
      })),
    ];
  }, [apiData.items]);

  const runOcr = useCallback(async () => {
    if (!ocrFile || ocrRunning) return;
    if (typeof Tesseract === 'undefined') {
      alert('Tesseract.js が読み込まれていません。ページを再読み込みしてください。');
      return;
    }
    setOcrRunning(true);
    setOcrProgress(0);
    setOcrMatches([]);
    try {
      // [1] img要素が完全ロードされるまで待機
      const img = ocrImgRef.current;
      if (!img.complete || img.naturalWidth === 0) {
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = () => reject(new Error('画像の読み込みに失敗しました'));
          setTimeout(() => reject(new Error('タイムアウト')), 10000);
        });
      }
      // [2] Canvas前処理（4倍拡大・クロップ・グレースケール）
      const SCALE = 4;
      const W = img.naturalWidth, H = img.naturalHeight;
      const cropH = Math.max(10, Math.round(H * ocrCropRatio));
      const canvas = document.createElement('canvas');
      canvas.width = W * SCALE;
      canvas.height = cropH * SCALE;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, W, cropH, 0, 0, W * SCALE, cropH * SCALE);
      const imageData = ctx.getImageData(0, 0, W * SCALE, cropH * SCALE);
      const d = imageData.data;
      for (let i = 0; i < d.length; i += 4) {
        const gray = 0.299 * d[i] + 0.587 * d[i+1] + 0.114 * d[i+2];
        d[i] = d[i+1] = d[i+2] = gray; d[i+3] = 255;
      }
      ctx.putImageData(imageData, 0, 0);
      const dataUrl = canvas.toDataURL('image/png');
      // [3] OCR実行（英語のみ・PSM11）
      const { data: { text } } = await Tesseract.recognize(
        dataUrl, 'eng',
        {
          logger: m => { if (m.status === 'recognizing text') setOcrProgress(Math.round(m.progress * 100)); },
          tessedit_pageseg_mode: '11',
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789- ',
        }
      );
      setOcrProgress(100);
      setOcrMatches(matchOcrText(text));
    } catch (e) {
      console.error('OCR error', e);
      alert('OCR実行中にエラーが発生しました: ' + (e?.message || String(e)));
    } finally {
      setOcrRunning(false);
    }
  }, [ocrFile, ocrRunning, matchOcrText, ocrCropRatio]);

  const addOcrItemsToStash = useCallback(() => {
    const toAdd = ocrMatches.filter(m => m.checked && m.item);
    if (toAdd.length === 0) return;
    setStash(prev => {
      const next = { ...prev };
      for (const m of toAdd) next[m.item.id] = (parseInt(next[m.item.id] || 0)) + m.qty;
      return next;
    });
    alert(`${toAdd.length} 件のアイテムを在庫に追加しました`);
    setOcrMatches([]);
    setOcrFile(null);
  }, [ocrMatches]);

  // ── 出撃準備 タスクOCR ──
  const handleRaidOcrFiles = useCallback((files) => {
    const arr = Array.from(files || []);
    const valid = arr.filter(f => {
      if (!f.type.match(/^image\/(jpeg|png)/i)) { alert(`${f.name}: JPG / PNG のみ対応しています`); return false; }
      if (f.size > 10 * 1024 * 1024) { alert(`${f.name}: 10MB以下にしてください`); return false; }
      return true;
    });
    if (valid.length === 0) return;
    setRaidOcrFiles(prev => [...prev, ...valid.map(f => ({ url: URL.createObjectURL(f), name: f.name }))]);
    setRaidOcrMatches([]);
    setRaidCompleteCandidates([]);
    setRaidOcrProgress(0);
  }, []);

  const matchTaskOcrLines = useCallback((rawText) => {
    const calcSim = (a, b) => {
      if (!a || !b) return 0;
      if (a === b) return 1.0;
      if (b.includes(a)) return Math.min(1.0, (a.length / b.length) * 1.4);
      if (a.includes(b)) return Math.min(1.0, (b.length / a.length) * 1.4);
      const dist = levenshtein(a, b);
      const maxLen = Math.max(a.length, b.length);
      return maxLen > 0 ? Math.max(0, (1 - dist / maxLen) * 0.92) : 0;
    };
    const allTasks = [...apiData.tasks, ...customTasks];
    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length >= 3);
    return lines.map(line => {
      const lineLow = line.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
      if (!lineLow) return null;
      const candidates = [];
      for (const task of allTasks) {
        const nameLow = (task.name || '').toLowerCase().replace(/[^a-z0-9 ]/g, '');
        const score = Math.max(
          calcSim(lineLow, nameLow),
          calcSim(lineLow.replace(/ /g, ''), nameLow.replace(/ /g, ''))
        );
        if (score >= 0.40) candidates.push({ task, score });
      }
      candidates.sort((a, b) => b.score - a.score);
      const matched = candidates[0]?.score >= 0.65;
      return {
        line,
        task: matched ? candidates[0].task : null,
        score: candidates[0]?.score || 0,
        candidates: candidates.slice(0, 5),
        checked: matched,
        mode: matched ? 'match' : 'search',
        inlineSearch: '',
        inlineFormName: line,
        inlineFormTrader: '',
        inlineFormObjectives: [],
      };
    }).filter(Boolean).filter(m => m.task || m.candidates.length > 0);
  }, [apiData.tasks, customTasks]);

  const runRaidOcr = useCallback(async () => {
    if (raidOcrFiles.length === 0 || raidOcrRunning) return;
    if (typeof Tesseract === 'undefined') {
      alert('Tesseract.js が読み込まれていません。ページを再読み込みしてください。');
      return;
    }
    setRaidOcrRunning(true);
    setRaidOcrProgress(0);
    setRaidOcrMatches([]);
    setRaidCompleteCandidates([]);
    const total = raidOcrFiles.length;
    let allText = '';
    try {
      for (let fi = 0; fi < total; fi++) {
        const fileEntry = raidOcrFiles[fi];
        const img = await new Promise((resolve, reject) => {
          const el = new Image();
          el.onload = () => resolve(el);
          el.onerror = () => reject(new Error(`画像の読み込みに失敗: ${fileEntry.name}`));
          setTimeout(() => reject(new Error('タイムアウト')), 10000);
          el.src = fileEntry.url;
        });
        const SCALE = 4;
        const W = img.naturalWidth, H = img.naturalHeight;
        const canvas = document.createElement('canvas');
        canvas.width = W * SCALE;
        canvas.height = H * SCALE;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, W, H, 0, 0, W * SCALE, H * SCALE);
        const imageData = ctx.getImageData(0, 0, W * SCALE, H * SCALE);
        const d = imageData.data;
        for (let i = 0; i < d.length; i += 4) {
          const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          d[i] = d[i + 1] = d[i + 2] = gray; d[i + 3] = 255;
        }
        ctx.putImageData(imageData, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        const baseProgress = (fi / total) * 100;
        const { data: { text } } = await Tesseract.recognize(
          dataUrl, 'eng',
          {
            logger: m => { if (m.status === 'recognizing text') setRaidOcrProgress(Math.round(baseProgress + (m.progress / total) * 100)); },
            tessedit_pageseg_mode: '6',
            tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-' ",
          }
        );
        allText += (allText ? '\n' : '') + text;
      }
      setRaidOcrProgress(100);
      const matches = matchTaskOcrLines(allText);
      setRaidOcrMatches(matches);
      // 完了候補: 進行中タスクのうちOCRで検出されなかったもの（カスタムタスクは除外）
      const matchedIds = new Set(matches.filter(m => m.task).map(m => m.task.id));
      const matchedNames = new Set(matches.filter(m => m.task).map(m => (m.task.name || '').toLowerCase().trim()));
      const allTasksList = [...apiData.tasks, ...customTasks];
      const candidates = pinnedTaskIds
        .filter(id => !completedTaskIds.includes(id) && !matchedIds.has(id))
        .map(id => {
          const t = allTasksList.find(t => t.id === id);
          if (!t) return null;
          return { taskId: id, taskName: t.name, traderName: t.trader?.name || '', checked: true };
        })
        .filter(Boolean)
        .filter(c => !matchedNames.has((c.taskName || '').toLowerCase().trim()));
      setRaidCompleteCandidates(candidates);
    } catch (e) {
      console.error('Raid OCR error', e);
      alert('OCR実行中にエラーが発生しました: ' + (e?.message || String(e)));
    } finally {
      setRaidOcrRunning(false);
    }
  }, [raidOcrFiles, raidOcrRunning, matchTaskOcrLines, pinnedTaskIds, completedTaskIds, apiData.tasks, customTasks]);

  const addRaidOcrTasksToPinned = useCallback(() => {
    const toAdd = raidOcrMatches.filter(m => m.checked && m.task);
    if (toAdd.length === 0) return;
    const idsToAdd = toAdd.map(m => m.task.id);
    setPinnedTaskIds(prev => {
      const next = [...prev];
      for (const id of idsToAdd) if (!next.includes(id)) next.push(id);
      return next;
    });
    // 完了済みだったタスクを進行中に戻す（誤完了の取り消し含む）
    setCompletedTaskIds(prev => prev.filter(id => !idsToAdd.includes(id)));
    setRaidOcrMatches([]);
    setRaidOcrFiles([]);
  }, [raidOcrMatches]);

  // OCR関連の表示（スクショ・認識結果・完了候補）を初期状態に戻す
  const resetRaidOcr = () => {
    setRaidOcrFiles([]);
    setRaidOcrMatches([]);
    setRaidCompleteCandidates([]);
    setRaidOcrProgress(0);
  };

  const bulkCompleteFromOcr = () => {
    const toComplete = raidCompleteCandidates.filter(c => c.checked);
    // チェック0件 =「なにもしない」: 完了処理はせず表示だけ片付ける
    if (toComplete.length === 0) { resetRaidOcr(); return; }
    const ids = toComplete.map(c => c.taskId);
    const collectPrereqs = (id, visited = new Set()) => {
      if (visited.has(id)) return visited;
      visited.add(id);
      const task = apiData.tasks.find(t => t.id === id);
      (task?.taskRequirements || []).forEach(req => collectPrereqs(req.task.id, visited));
      return visited;
    };
    const allIds = new Set();
    ids.forEach(id => collectPrereqs(id, allIds));
    const allIdsArr = [...allIds];
    const newlyCompleted = allIdsArr.filter(id => !completedTaskIds.includes(id));
    const nextCompleted = new Set([...completedTaskIds, ...allIdsArr]);
    setCompletedTaskIds([...nextCompleted]);
    const withoutDone = pinnedTaskIds.filter(id => !allIdsArr.includes(id));
    const autoAdd = [];
    allIdsArr.forEach(completedId => {
      (taskSuccessorsMap[completedId] || []).forEach(successor => {
        if (nextCompleted.has(successor.id)) return;
        if (withoutDone.includes(successor.id)) return;
        if (autoAdd.includes(successor.id)) return;
        const allPrereqsDone = (successor.taskRequirements || []).every(req => nextCompleted.has(req.task.id));
        if (allPrereqsDone) autoAdd.push(successor.id);
      });
    });
    if (ocrAutoNext) {
      setPinnedTaskIds([...withoutDone, ...autoAdd]);
      setRecentlyUnlockedTaskIds(autoAdd);
    } else {
      setPinnedTaskIds([...withoutDone]);
      setRecentlyUnlockedTaskIds([]);
    }
    setMapTaskIds(prev => prev.filter(id => !allIdsArr.includes(id)));
    if (newlyCompleted.length > 0) {
      const names = newlyCompleted.map(id => apiData.tasks.find(t => t.id === id)?.name).filter(Boolean);
      addJournalTaskComplete(names);
    }
    resetRaidOcr();
  };

  const updateStash = (itemId, delta) => {
    setStash(prev => {
      const cur = parseInt(prev[itemId] || 0);
      return { ...prev, [itemId]: Math.max(0, cur + delta) };
    });
  };

  // ================== LOCAL COMPONENTS ==================

  // ルーブル・ドル・ユーロは＋−では入力しづらいので数値入力に切り替える
  const LARGE_INPUT_ITEM_IDS = new Set([
    '5449016a4bdc2d6f028b456f', // RUB
    '5696686a4bdc2da3298b456a', // USD
    '569668774bdc2da2298b4568', // EUR
  ]);

