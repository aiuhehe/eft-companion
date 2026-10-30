
  // ================== JOURNAL ==================
  // タスクツリータグ（ワイプしても消えない・専用localStorageキーで永続化）
  const TASK_TAGS_KEY = modeKey('eft_task_tags_v1');   // 旧: タグ（タブへの移行元）
  const TASK_TABS_KEY = modeKey('eft_task_tabs_v1');   // 新: プロジェクトタブ [{ id, name, color, goalTaskId }]
  const [tagPopoverTaskId, setTagPopoverTaskId] = useState(null);
  // タブ色パレット — color として localStorage に保存されるため var() 不可（生hexを維持）
  const TAG_COLORS = ['#ef4444', '#f59e0b', '#facc15', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7', '#ec4899'];

  const [taskTabs, setTaskTabs] = useState(() => {
    try { return JSON.parse(localStorage.getItem(TASK_TABS_KEY)) || []; } catch { return []; }
  });
  const [activeTaskTab, setActiveTaskTab] = useState('all'); // 'all' = 全タスク

  // taskId起点で前提タスクを再帰的に辿り、自分自身を含むIDのSetを返す
  const getAncestorTaskIds = (taskId, visited = new Set()) => {
    if (visited.has(taskId)) return visited;
    visited.add(taskId);
    const task = apiData.tasks.find(t => t.id === taskId);
    (task?.taskRequirements || []).forEach(req => getAncestorTaskIds(req.task.id, visited));
    return visited;
  };

  const persistTaskTabs = (next) => { localStorage.setItem(TASK_TABS_KEY, JSON.stringify(next)); return next; };

  // タスクをゴールにしたタブを作成 or 更新（1ゴール=1タブ、id は goalTaskId 由来で安定）
  const upsertTaskTab = (goalTaskId, { name, color }) => {
    const tabId = 'tab_' + goalTaskId;
    setTaskTabs(prev => {
      const exists = prev.some(t => t.goalTaskId === goalTaskId);
      const next = exists
        ? prev.map(t => t.goalTaskId === goalTaskId ? { ...t, name, color } : t)
        : [...prev, { id: tabId, name, color, goalTaskId }];
      return persistTaskTabs(next);
    });
    setActiveTaskTab(tabId);
    setTagPopoverTaskId(null);
  };

  const removeTaskTab = (tabId) => {
    setTaskTabs(prev => persistTaskTabs(prev.filter(t => t.id !== tabId)));
    setActiveTaskTab('all');
  };

  // 旧タグ(taskTags)→タブへの一度きり移行：タグ群ごとに「他メンバーの前提になっていない末端タスク」をゴールと推定
  useEffect(() => {
    if (apiData.tasks.length === 0) return;
    if (localStorage.getItem(TASK_TABS_KEY)) return; // 既に新形式あり
    let oldTags;
    try { oldTags = JSON.parse(localStorage.getItem(TASK_TAGS_KEY)) || {}; } catch { oldTags = {}; }
    const ids = Object.keys(oldTags);
    if (ids.length === 0) return;
    const groups = {};
    ids.forEach(id => { const t = oldTags[id]; const k = (t.label || '') + '|' + t.color; (groups[k] = groups[k] || []).push(id); });
    const migrated = [];
    Object.values(groups).forEach(members => {
      // goal = メンバーのうち、他メンバーの祖先集合に含まれないもの（末端/sink）
      const goals = members.filter(m => !members.some(n => n !== m && getAncestorTaskIds(n).has(m)));
      (goals.length ? goals : members).forEach(goalId => {
        const info = oldTags[goalId];
        const name = (info.label && info.label.trim()) || apiData.tasks.find(t => t.id === goalId)?.name || 'タブ';
        if (!migrated.some(m => m.goalTaskId === goalId)) migrated.push({ id: 'tab_' + goalId, name, color: info.color, goalTaskId: goalId });
      });
    });
    if (migrated.length) setTaskTabs(persistTaskTabs(migrated));
  }, [apiData.tasks]);

  // 各タスクが属するタブの色（カードのボーダー表示用）。先頭タブ優先。
  const taskTabColorMap = useMemo(() => {
    const map = {};
    taskTabs.forEach(tb => { getAncestorTaskIds(tb.goalTaskId).forEach(id => { if (!map[id]) map[id] = tb.color; }); });
    return map;
  }, [taskTabs, apiData.tasks]);

  // アクティブタブ（'all' またはタブが見つからなければ null = 全タスク扱い）と祖先ID集合
  const activeTabObj = taskTabs.find(t => t.id === activeTaskTab) || null;
  const tabAncestorIds = useMemo(
    () => activeTabObj ? getAncestorTaskIds(activeTabObj.goalTaskId) : null,
    [activeTabObj, apiData.tasks]
  );

  // タブ上部スキルツリーのチップから、該当タスクの検索カードを開いてスクロール
  const openAndScrollToTask = (taskId) => {
    setOpenSearchTaskIds(prev => prev.includes(taskId) ? prev : [...prev, taskId]);
    setTimeout(() => { const el = document.getElementById('taskcard_' + taskId); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 60);
  };

  // タスクツリー内のノードをクリック → タスク名検索欄にその名前を入れて検索し、検索欄へスクロール
  // プロジェクトタブは開いたまま維持する。ただしクリックしたタスクが現在のタブの絞り込み対象外
  // （前提タスク集合に含まれない）の場合だけ「全タスク」に戻す（そうしないと結果が0件で表示できないため）。
  const searchForTaskByName = (taskName, taskId) => {
    if (!taskName) return;
    if (activeTaskTab !== 'all' && tabAncestorIds && taskId && !tabAncestorIds.has(taskId)) {
      setActiveTaskTab('all');
    }
    setTaskSearch(taskName);
    setWikiPanels({});
    setTimeout(() => { const el = document.getElementById('task-search-input'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 80);
  };

  // ================== MANUAL UNLOCKS ==================
  const [manualUnlocks, setManualUnlocks] = useState(() => loadManualUnlocks());
  const [manualFormTaskId, setManualFormTaskId] = useState(null); // フォームを開いているタスクID

  // 弾薬タブ → ハイドアウトの該当施設へ遷移（クラフト解禁レベル確認用）。
  // 施設フィルタをその施設だけONにし、ハイドアウトタブへ切り替える。
  const goToHideoutStation = (stationId) => {
    setActiveTab('hideout');
    if (stationId && apiData.hideout.some(s => s.id === stationId)) {
      const next = {};
      apiData.hideout.forEach(s => { next[s.id] = s.id === stationId; });
      setHideoutStationFilters(next);
    }
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 80);
  };

  // 出撃準備 目標チェック状態の永続化
  useEffect(() => {
    try { localStorage.setItem(modeKey('eft_raid_obj_checked_v1'), JSON.stringify(raidObjChecked)); }
    catch {}
  }, [raidObjChecked]);

  // マップタブ：選択マップ切替時に画像を自動読み込み
  useEffect(() => {
    if (activeTab !== 'maps') return;
    const selected = mapsSelectedMap || Object.keys(RAID_MAP_IMAGE_FILES)[0];
    if (!selected || mapImages[selected] || mapsLoadFailed[selected]) return;
    ensureMapImageRegistered(selected).then(result => {
      if (!result) setMapsLoadFailed(prev => ({ ...prev, [selected]: true }));
    });
  }, [activeTab, mapsSelectedMap]);

  // 差し替え画像の読込完了後、「見つかりません」状態のマップを差し替え画像で再登録できるようにする
  useEffect(() => {
    const names = Object.keys(mapImageOverrides).filter(n => mapsLoadFailed[n]);
    if (!names.length) return;
    setMapsLoadFailed(prev => { const next = { ...prev }; names.forEach(n => { next[n] = false; }); return next; });
    names.forEach(n => ensureMapImageRegistered(n));
  }, [mapImageOverrides]);

  // マップタブ：マップ切替時にズーム・パンをリセット
  useEffect(() => {
    const v = { zoom: 1, panX: 0, panY: 0 };
    mapsViewportRef.current = v;
    setMapsZoom(1); setMapsPanX(0); setMapsPanY(0);
  }, [mapsSelectedMap]);

  // マップタブ：ホイールズーム（非パッシブリスナー）
  useEffect(() => {
    if (activeTab !== 'maps') return;
    const outer = mapsContainerRef.current;
    if (!outer) return;
    const onWheel = (e) => {
      const inner = mapsInnerContainerRef.current;
      if (!inner) return;
      e.preventDefault();
      const { zoom, panX, panY } = mapsViewportRef.current;
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      const newZoom = Math.max(1, Math.min(8, zoom * factor));
      if (newZoom === zoom) return;
      const innerRect = inner.getBoundingClientRect();
      const dx = e.clientX - innerRect.left;
      const dy = e.clientY - innerRect.top;
      const ratio = newZoom / zoom;
      const cw = inner.offsetWidth;
      const ch = inner.offsetHeight;
      const clp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
      const newPanX = clp(panX + dx * (1 - ratio), cw * (1 - newZoom), 0);
      const newPanY = clp(panY + dy * (1 - ratio), ch * (1 - newZoom), 0);
      const v = { zoom: newZoom, panX: newPanX, panY: newPanY };
      mapsViewportRef.current = v;
      setMapsZoom(newZoom); setMapsPanX(newPanX); setMapsPanY(newPanY);
    };
    outer.addEventListener('wheel', onWheel, { passive: false });
    return () => outer.removeEventListener('wheel', onWheel);
  }, [activeTab]);
