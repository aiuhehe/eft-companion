
  // アーマープレートタブの表示制御
  const [armorMinClass, setArmorMinClass] = useState(0);
  const armorByClass = useMemo(() => {
    const groups = {};
    (apiData.armorPlates || []).forEach(item => {
      const props = (item.properties || {});
      const cls = props.class || 0;
      (groups[cls] = groups[cls] || []).push(item);
    });
    return Object.entries(groups)
      .map(([cls, items]) => ({
        cls: Number(cls),
        items: items.slice().sort((a, b) => (b.properties?.durability || 0) - (a.properties?.durability || 0)),
      }))
      .sort((a, b) => b.cls - a.cls);
  }, [apiData.armorPlates]);

  // 弾薬タブの表示制御
  const [ammoMinPen, setAmmoMinPen] = useState(0); // 貫通力の下限フィルタ
  const [ammoCaliberSort, setAmmoCaliberSort] = useState('pen'); // 'pen' | 'caliber' | 'weapons'
  // 口径ごとにグルーピングし、口径は最大貫通力の高い順、弾は貫通力の高い順に並べる
  const ammoByCaliber = useMemo(() => {
    const groups = {};
    (apiData.ammo || []).forEach(a => {
      const cal = (a.caliber || 'Unknown').replace('Caliber', '');
      (groups[cal] = groups[cal] || []).push(a);
    });
    const arr = Object.entries(groups).map(([caliber, rounds]) => ({
      caliber,
      maxPen: Math.max(...rounds.map(r => r.penetrationPower || 0)),
      rounds: rounds.slice().sort((x, y) => (y.penetrationPower || 0) - (x.penetrationPower || 0)),
    }));
    arr.sort((a, b) => b.maxPen - a.maxPen);
    return arr;
  }, [apiData.ammo]);

  // 弾薬ID → 対応するammo pack（箱）一覧。パック単位(pcs)ごとにまとめ、入手元を集約。
  // 弾は noFlea だが「パック」はフリマ取引可＝パックがフリマ入手ルートになる点が重要。
  const ammoPackMap = useMemo(() => {
    const byAmmo = {};
    (apiData.ammoPacks || []).forEach(pk => {
      (pk.containsItems || []).forEach(ci => {
        const ammoId = ci.item && ci.item.id;
        if (!ammoId) return;
        const traders = [];
        (pk.buyFor || []).forEach(o => {
          const v = o.vendor || {};
          if (v.normalizedName !== 'flea-market') traders.push(`${v.name} LL${v.minTraderLevel} 販売`);
        });
        (pk.bartersFor || []).forEach(b => traders.push(`${b.trader.name} LL${b.level} 物々交換`));
        const flea = (pk.buyFor || []).some(o => (o.vendor || {}).normalizedName === 'flea-market');
        (byAmmo[ammoId] = byAmmo[ammoId] || []).push({ name: pk.name, icon: pk.iconLink, count: ci.count, traders, flea });
      });
    });
    // パック単位(count)ごとに重複を集約（同サイズの別ID版・入手元をマージ）
    const result = {};
    Object.entries(byAmmo).forEach(([ammoId, packs]) => {
      const byCount = {};
      packs.forEach(p => {
        const cur = byCount[p.count] || { count: p.count, name: p.name, icon: p.icon, traders: new Set(), flea: false };
        p.traders.forEach(t => cur.traders.add(t));
        if (p.flea) cur.flea = true;
        if (!cur.icon && p.icon) cur.icon = p.icon;
        byCount[p.count] = cur;
      });
      result[ammoId] = Object.values(byCount)
        .map(p => ({ ...p, traders: [...p.traders] }))
        .filter(p => p.flea || p.traders.length > 0) // 入手元が無い（loot専用の箱）は表示しない
        .sort((a, b) => a.count - b.count);
    });
    return result;
  }, [apiData.ammoPacks]);

  // 口径 → 武器リスト（口径文字列から "Caliber" プレフィックスを除いた形でキー管理）
  const weaponsByCaliber = useMemo(() => {
    const map = new Map();
    (apiData.weapons || []).forEach(w => {
      const cal = w.properties && w.properties.caliber;
      if (!cal) return;
      const key = cal.replace(/^Caliber/, '');
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(w);
    });
    // 各口径内を名前順ソート
    map.forEach(arr => arr.sort((a, b) => (a.name || '').localeCompare(b.name || '')));
    return map;
  }, [apiData.weapons]);

  // 武器ID → 入手手段リスト（apiData.barters/crafts/items から組み立て）
  // プリセット武器（Mosin PU 3.5x等）の入手情報をベース銃IDに集約するため
  // apiData.weapons（gun + preset 両方含む）の baseItem.id を使って逆引きマップを作る
  const weaponAcqMap = useMemo(() => {
    // preset ID → base gun ID のマッピング
    const presetToBase = new Map();
    (apiData.weapons || []).forEach(w => {
      const baseId = w.properties?.baseItem?.id;
      if (baseId) presetToBase.set(w.id, baseId);
    });
    // IDをベース銃に解決（プリセットならそのベース銃ID、それ以外はそのまま）
    const resolve = id => presetToBase.get(id) || id;

    const map = new Map();
    const get = id => {
      if (!map.has(id)) map.set(id, { buy: [], barter: [], craft: [] });
      return map.get(id);
    };
    // アイテム直販（buyFor に taskUnlock 含む）
    (apiData.items || []).forEach(item => {
      const targetId = resolve(item.id);
      (item.buyFor || []).forEach(b => {
        const v = b.vendor || {};
        if (!v.trader) return; // TraderOffer 以外（フリマ等）はスキップ
        const entry = get(targetId);
        if (v.taskUnlock) {
          entry.buy.push({ ll: v.minTraderLevel, traderName: v.trader.name, taskId: v.taskUnlock.id, taskName: v.taskUnlock.name });
        } else {
          entry.buy.push({ ll: v.minTraderLevel, traderName: v.trader.name });
        }
      });
    });
    // バーター（rewardItems をベース銃IDに集約）
    (apiData.barters || []).forEach(b => {
      (b.rewardItems || []).forEach(ri => {
        if (!ri.item?.id) return;
        get(resolve(ri.item.id)).barter.push({ ll: b.level, traderName: b.trader.name });
      });
    });
    // クラフト（rewardItems をベース銃IDに集約）
    (apiData.crafts || []).forEach(c => {
      (c.rewardItems || []).forEach(ri => {
        if (!ri.item?.id) return;
        get(resolve(ri.item.id)).craft.push({ stationName: c.station.name, ll: c.level });
      });
    });
    return map;
  }, [apiData.weapons, apiData.items, apiData.barters, apiData.crafts]);

  // 口径並び替え済みリスト（weaponsByCaliber が確定した後に定義）
  const sortedAmmoByCaliber = useMemo(() => {
    if (ammoCaliberSort === 'pen') return ammoByCaliber;
    const arr = ammoByCaliber.slice();
    if (ammoCaliberSort === 'caliber') {
      arr.sort((a, b) => caliberToMm(b.caliber) - caliberToMm(a.caliber));
    } else if (ammoCaliberSort === 'weapons') {
      arr.sort((a, b) => (weaponsByCaliber.get(b.caliber)?.length || 0) - (weaponsByCaliber.get(a.caliber)?.length || 0));
    }
    return arr;
  }, [ammoByCaliber, ammoCaliberSort, weaponsByCaliber]);

  const JOURNAL_KEY = modeKey('eft_journal_v1');
  const todayStr = new Date().toISOString().slice(0, 10);
  const [journalLog, setJournalLog] = useState(() => {
    try { return JSON.parse(localStorage.getItem(JOURNAL_KEY)) || {}; } catch { return {}; }
  });
  const [journalEntryDate, setJournalEntryDate] = useState(todayStr);
  const [journalDraft, setJournalDraft] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(JOURNAL_KEY)) || {};
      return saved[new Date().toISOString().slice(0, 10)] || { tasks: 0, memo: '' };
    } catch { return { tasks: 0, memo: '' }; }
  });
  const [journalTooltip, setJournalTooltip] = useState(null);
  const [journalDays, setJournalDays] = useState(60);
  const [expandedJournalDates, setExpandedJournalDates] = useState(new Set());
  const [movingJournalItem, setMovingJournalItem] = useState(null); // { fromDate, type, index, name }
  const [moveTargetDate, setMoveTargetDate] = useState('');

  // ===== プラン =====
  const [planItems, setPlanItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem(modeKey(PLAN_KEY))) || []; } catch { return []; }
  });
  const [planShowNext, setPlanShowNext] = useState(true);  // 次のタスクをプレビュー表示
  const [planMapTab, setPlanMapTab] = useState(null);       // 選択中マップタブ（null = 先頭タブ）
  const [planOpenGoals, setPlanOpenGoals] = useState({});   // ゴール詳細ツリーの開閉状態

  const addPlanItem = useCallback((item) => {
    setPlanItems(prev => {
      if (prev.some(p => p.id === item.id)) return prev;
      const next = [...prev, item];
      localStorage.setItem(modeKey(PLAN_KEY), JSON.stringify(next));
      return next;
    });
  }, []);

  const removePlanItem = useCallback((id) => {
    setPlanItems(prev => {
      const next = prev.filter(p => p.id !== id);
      localStorage.setItem(modeKey(PLAN_KEY), JSON.stringify(next));
      return next;
    });
  }, []);

  const resetPlan = useCallback(() => {
    if (!confirm('プランをすべてリセットしますか？')) return;
    setPlanItems([]);
    localStorage.setItem(modeKey(PLAN_KEY), JSON.stringify([]));
  }, []);

  const exportPlan = useCallback(() => {
    const data = localStorage.getItem(modeKey(PLAN_KEY)) || '[]';
    const date = new Date().toISOString().slice(0, 10);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eft_plan_${activeMode}_${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [activeMode]);

  const importPlan = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          const items = JSON.parse(ev.target.result);
          if (!Array.isArray(items)) throw new Error('invalid');
          localStorage.setItem(modeKey(PLAN_KEY), JSON.stringify(items));
          window.location.reload();
        } catch { alert('プランファイルの読み込みに失敗しました'); }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [activeMode]);

  const saveJournalEntry = useCallback(() => {
    const targetDate = journalEntryDate || todayStr;
    setJournalLog(prev => {
      const existing = prev[targetDate] || {};
      const entry = { ...existing, tasks: journalDraft.tasks || 0, memo: journalDraft.memo || '' };
      const next = { ...prev, [targetDate]: entry };
      localStorage.setItem(JOURNAL_KEY, JSON.stringify(next));
      return next;
    });
  }, [journalDraft, journalEntryDate, todayStr]);

  const addJournalTaskComplete = useCallback((taskNames = []) => {
    const count = taskNames.length;
    setJournalLog(prev => {
      const today = new Date().toISOString().slice(0, 10);
      const entry = prev[today] || {};
      const completedTasks = [...(entry.completedTasks || []), ...taskNames.map(name => ({ name }))];
      const next = { ...prev, [today]: { ...entry, tasks: (entry.tasks || 0) + count, completedTasks } };
      localStorage.setItem(JOURNAL_KEY, JSON.stringify(next));
      return next;
    });
    setJournalDraft(d => ({ ...d, tasks: (d.tasks || 0) + count }));
  }, []);

  const addJournalGet = useCallback((itemName, type) => {
    const time = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    setJournalLog(prev => {
      const today = new Date().toISOString().slice(0, 10);
      const entry = prev[today] || {};
      const gets = [...(entry.gets || []), { name: itemName, type, time }];
      const next = { ...prev, [today]: { ...entry, gets } };
      localStorage.setItem(JOURNAL_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const deleteJournalEntry = useCallback((dateStr) => {
    const next = { ...journalLog };
    delete next[dateStr];
    setJournalLog(next);
    localStorage.setItem(JOURNAL_KEY, JSON.stringify(next));
  }, [journalLog]);

  const moveJournalItem = useCallback((fromDate, type, index, toDate) => {
    if (!toDate || toDate === fromDate) return;
    setJournalLog(prev => {
      const next = { ...prev };
      const fromEntry = { ...(next[fromDate] || {}) };
      const toEntry = { ...(next[toDate] || {}) };
      if (type === 'task') {
        const tasks = [...(fromEntry.completedTasks || [])];
        const [item] = tasks.splice(index, 1);
        fromEntry.completedTasks = tasks;
        fromEntry.tasks = Math.max(0, (fromEntry.tasks || 0) - 1);
        toEntry.completedTasks = [...(toEntry.completedTasks || []), item];
        toEntry.tasks = (toEntry.tasks || 0) + 1;
      } else {
        const gets = [...(fromEntry.gets || [])];
        const [item] = gets.splice(index, 1);
        fromEntry.gets = gets;
        toEntry.gets = [...(toEntry.gets || []), item];
      }
      next[fromDate] = fromEntry;
      next[toDate] = toEntry;
      localStorage.setItem(JOURNAL_KEY, JSON.stringify(next));
      return next;
    });
    setMovingJournalItem(null);
  }, []);

  const exportJournal = useCallback(() => {
    const blob = new Blob([JSON.stringify(journalLog, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `eft_journal_${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [journalLog]);

  const importJournal = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target.result);
        if (typeof imported !== 'object' || Array.isArray(imported)) throw new Error();
        const merged = { ...journalLog, ...imported };
        setJournalLog(merged);
        localStorage.setItem(JOURNAL_KEY, JSON.stringify(merged));
        setJournalDraft(merged[todayStr] || { tasks: 0, memo: '' });
        alert(`✅ ${Object.keys(imported).length}件の記録をインポートしました（既存データとマージ済）`);
      } catch {
        alert('❌ ファイルの形式が正しくありません。');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [journalLog, todayStr]);

  const handleWipe = useCallback(() => {
    if (!confirm('⚠️ ワイプを記録しますか？\n\n以下の進行データがリセットされます：\n・スタッシュ（アイテム・通貨）\n・完了タスク記録\n・ハイドアウト進行\n・トレーダーLL／信頼度／取引額\n\n欲しいものリスト・ジャーナルは残ります。\n※この操作は元に戻せません。')) return;
    // 進行データをリセット
    setStash({});
    setCompletedTaskIds([]);
    setHideoutLevels({});
    setTraderStatus({});
    setPinnedTaskIds([]);
    // ジャーナルにワイプ日として記録
    setJournalLog(prev => {
      const today = new Date().toISOString().slice(0, 10);
      const entry = prev[today] || {};
      const next = { ...prev, [today]: { ...entry, wipe: true } };
      localStorage.setItem(JOURNAL_KEY, JSON.stringify(next));
      return next;
    });
  }, [JOURNAL_KEY]);

  // Init trader status
  useEffect(() => {
    const init = {};
    TRADER_LIST.forEach(t => {
      if (!traderStatus[t.id]) {
        init[t.id] = { ll: 1, rep: 0, commerce: 0 };
      }
    });
    if (Object.keys(init).length > 0) {
      setTraderStatus(prev => ({ ...init, ...prev }));
    }
  }, []);

  // EoD/Unheard: スタッシュをMAXに / Unheard: カルチストサークルをLv1に
  useEffect(() => {
    if (apiData.hideout.length === 0) return;
    if (edition !== 'eod' && edition !== 'unheard') return;

    setHideoutLevels(prev => {
      const next = { ...prev };

      // EoD / Unheard 共通: スタッシュ MAX
      const stash = apiData.hideout.find(s =>
        s.name?.toLowerCase().includes('stash') || s.name?.includes('スタッシュ')
      );
      if (stash) {
        const maxLv = Math.max(...stash.levels.map(l => l.level));
        next[stash.id] = maxLv;
      }

      // Unheard 限定: カルチストサークル Lv1
      if (edition === 'unheard') {
        const cultist = apiData.hideout.find(s =>
          s.name?.toLowerCase().includes('cultist') ||
          s.name?.includes('カルチスト') ||
          s.name?.includes('呪詛') ||
          s.name?.includes('サークル')
        );
        if (cultist && (next[cultist.id] || 0) < 1) {
          next[cultist.id] = 1;
        }
      }

      return next;
    });
  }, [edition, apiData.hideout]);

  // Init trader filters
  useEffect(() => {
    if (apiData.traders.length > 0) {
      const f = {};
      apiData.traders.forEach(t => { if (f[t.id] === undefined) f[t.id] = true; });
      setTraderFilters(prev => ({ ...f, ...prev }));
    }
  }, [apiData.traders]);

  const loadAPIData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    resetFallbackFlag();
    try {
      const gm = gameMode === 'pve' ? 'pve' : 'regular';
      const lang = uiLang === 'ja' ? 'ja' : 'en';
      const [traderData, itemData, itemEnData, hideoutData, barterData, craftData, taskData, ammoData, ammoPacksData, armorPlatesData, weaponModsData, weaponsData] = await Promise.all([
        fetchGraphQL(QUERIES.traders(gm)),
        fetchGraphQL(QUERIES.items(gm)),
        fetchGraphQL(QUERIES.itemsEn(gm)),
        fetchGraphQL(QUERIES.hideout(lang)),
        fetchGraphQL(QUERIES.barters(gm, lang)),
        fetchGraphQL(QUERIES.crafts(gm, lang)),
        fetchGraphQL(QUERIES.tasks(gm, lang)),
        fetchGraphQL(QUERIES.ammo(gm, lang)),
        fetchGraphQL(QUERIES.ammoPacks(gm, lang)),
        fetchGraphQL(QUERIES.armorPlates(gm, lang)),
        fetchGraphQL(QUERIES.weaponMods(gm, lang)),
        fetchGraphQL(QUERIES.weapons(gm, lang)),
      ]);
      const enMap = new Map((itemEnData.items || []).map(i => [i.id, i]));
      const mergedItems = (itemData.items || []).map(item => {
        const en = enMap.get(item.id);
        return { ...item, nameEn: en?.name || '', shortNameEn: en?.shortName || '' };
      });
      setApiData({
        traders: traderData.traders || [],
        items: mergedItems,
        hideout: hideoutData.hideoutStations || [],
        barters: barterData.barters || [],
        crafts: craftData.crafts || [],
        tasks: taskData.tasks || [],
        ammo: ammoData.ammo || [],
        ammoPacks: ammoPacksData.items || [],
        armorPlates: armorPlatesData.items || [],
        weaponMods: weaponModsData.items || [],
        weapons: weaponsData.items || [],
      });
      // 重複防止refだけリセット（キャッシュは残す＝チラつき防止）。lastLoaded 変化で上の useEffect が
      // ウォッチボード／展開中チャートを再取得し、解決後に最新の点へ差し替わる。
      historyReqRef.current = new Set();
      setIsFallback(isFallbackActive());
      setLastLoaded(new Date().toLocaleString('ja-JP'));
    } catch (e) {
      // fetch のネットワーク失敗（サーバー無応答・接続切断・CORS等）は TypeError、
      // レスポンスがJSONでない（503のHTML等）は SyntaxError になる。
      // GraphQL + JSON API フォールバックの両方が失敗した場合も同じメッセージを出す。
      const serverDown = (e instanceof TypeError) || (e instanceof SyntaxError)
        || /Failed to fetch|NetworkError|Load failed|aborted|HTTP 5\d\d/i.test(e.message || '');
      setLoadError(serverDown
        ? 'tarkov.dev / json.tarkov.dev ともに応答していません（時間をおいて「再取得」してください）'
        : 'APIエラー: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [gameMode, uiLang]);

  // ページロード時に自動でAPIデータ取得
  useEffect(() => { loadAPIData(); }, []);

  // ================== MANUAL UNLOCK CALLBACKS ==================
  const addManualUnlock = useCallback((taskId, taskName, formData) => {
    if (!formData.itemId) return;
    const entry = {
      id: `manual_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      taskId,
      taskName,
      type: formData.type,
      itemId: formData.itemId,
      itemName: formData.itemName,
      itemIconLink: formData.itemIconLink || '',
      ...(formData.type === 'unlock'
        ? { trader: formData.trader, traderLevel: Number(formData.traderLevel) }
        : { station: formData.station, stationLevel: Number(formData.stationLevel), duration: formData.duration || '' }
      ),
      note: (formData.note || '').trim(),
      addedAt: new Date().toISOString().slice(0, 10),
    };
    const next = [...manualUnlocks, entry];
    setManualUnlocks(next);
    saveManualUnlocks(next);
    setManualFormTaskId(null);
  }, [manualUnlocks]);

  const removeManualUnlock = useCallback((id) => {
    const next = manualUnlocks.filter(u => u.id !== id);
    setManualUnlocks(next);
    saveManualUnlocks(next);
  }, [manualUnlocks]);
