// ================== MAIN APP ==================
function App() {
  const saved = loadState(); // 進捗データのみ（設定キーは含まない）

  // ===== モードシステム（セッション中は不変・切替時はリロード） =====
  const activeMode = getActiveMode();
  const seasons    = getSeasons();  // ['season_1', 'season_2', ...]

  // Settings（localStorageから復元、なければデフォルト）
  const [gameMode, setGameMode] = useState(saved.gameMode || 'regular');
  const [edition, setEdition] = useState(saved.edition || 'standard');
  const [uiLang, setUiLang] = useState(saved.uiLang || 'ja');
  const [theme, setTheme] = useState(saved.theme || 'tarkov');
  useEffect(() => { applyTheme(theme); }, [theme]);

  // 設定ファイルインポート（ファイル選択ダイアログ）
  // 全データのバックアップから復元（旧 config.json 形式も受け付ける）
  const importAllData = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          const cfg = JSON.parse(ev.target.result);
          if (cfg && cfg.type === BACKUP_TYPE) {
            const n = Object.keys(cfg.data || {}).length;
            const when = cfg.exportedAt ? new Date(cfg.exportedAt).toLocaleString() : '不明';
            if (!confirm(`バックアップ（${when}・${n}件）で全データを置き換えます。\n現在の全モードの進捗・設定は上書きされます。よろしいですか？`)) return;
            try { restoreAllData(cfg); }
            catch (err) { alert('復元に失敗しました（データは元のままです）: ' + err.message); return; }
            restoreMediaFromBackup(cfg)
              .catch(err => alert('差し替えマップ画像の復元に失敗しました（その他のデータは復元済み）: ' + err.message))
              .finally(() => window.location.reload());
            return;
          }
          // 旧 config.json 形式（設定項目のみ）
          if (cfg.gameMode)      setGameMode(cfg.gameMode);
          if (cfg.edition)       setEdition(cfg.edition);
          if (cfg.uiLang)        setUiLang(cfg.uiLang);
          if (cfg.theme)       { setTheme(cfg.theme); applyTheme(cfg.theme); }
          if (cfg.playerLevel)   setPlayerLevel(cfg.playerLevel);
          if (cfg.traderStatus)  setTraderStatus(cfg.traderStatus);
          if (cfg.hideoutLevels) setHideoutLevels(cfg.hideoutLevels);
        } catch { alert('JSONの読み込みに失敗しました'); }
      };
      reader.readAsText(file);
    };
    input.click();
  }, []);

  // Player status
  const [playerLevel, setPlayerLevel] = useState(saved.playerLevel || 1);
  const [traderStatus, setTraderStatus] = useState(saved.traderStatus || {});
  const [hideoutLevels, setHideoutLevels] = useState(saved.hideoutLevels || {});
  const [stash, setStash] = useState(saved.stash || {});

  // API data
  const [apiData, setApiData] = useState({ traders: [], items: [], hideout: [], barters: [], crafts: [], tasks: [], ammo: [], ammoPacks: [], armorPlates: [], weaponMods: [], weapons: [] });
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [isFallback, setIsFallback] = useState(false);
  const [lastLoaded, setLastLoaded] = useState(saved.lastLoaded || null);

  // UI
  const [activeTab, setActiveTab] = useState('status');
  const [hideoutMode, setHideoutMode] = useState('next');
  const [searchQuery, setSearchQuery] = useState('');
  const itemSearchRef = useRef(null);

  // アイテム検索：フリマ価格履歴チャート
  const [historyOpenId, setHistoryOpenId] = useState(null);       // 展開中アイテムID（null = 閉じている）
  const [historyCache, setHistoryCache] = useState({});           // { [itemId]: { loading, error, points } }
  const historyReqRef = useRef(new Set());                        // 取得済み/取得中のID（重複fetch防止）

  const loadItemHistory = useCallback((itemId) => {
    if (historyReqRef.current.has(itemId)) return;                // 取得済み or 取得中なら何もしない
    historyReqRef.current.add(itemId);
    const gm = gameMode === 'pve' ? 'pve' : 'regular';
    // 既存データがあれば点を残したまま再取得（チラつき防止）。無ければローディング表示。
    setHistoryCache(prev => prev[itemId]?.points
      ? prev
      : ({ ...prev, [itemId]: { loading: true, error: null, points: null } }));
    // historicalItemPrices = 最大30日分の履歴（item.historicalPrices は約2日のみ）
    fetchGraphQL(`{ historicalItemPrices(id: "${itemId}", days: 30, gameMode: ${gm}) { price priceMin timestamp } }`)
      .then(data => {
        const points = (data.historicalItemPrices || [])
          .map(p => ({ price: p.price, priceMin: p.priceMin, t: Number(p.timestamp) }))
          .filter(p => p.t)
          .sort((a, b) => a.t - b.t);
        setHistoryCache(prev => ({ ...prev, [itemId]: { loading: false, error: null, points } }));
      })
      .catch(e => {
        historyReqRef.current.delete(itemId);                    // 失敗時は再取得を許可
        setHistoryCache(prev => ({ ...prev, [itemId]: { loading: false, error: e.message, points: prev[itemId]?.points || null } }));
      });
  }, [gameMode]);

  const toggleItemHistory = useCallback((itemId) => {
    setHistoryOpenId(prev => (prev === itemId ? null : itemId));
    loadItemHistory(itemId);
  }, [loadItemHistory]);

  // ゲームモード切替時は価格が変わるため履歴キャッシュを破棄
  useEffect(() => {
    historyReqRef.current = new Set();
    setHistoryCache({});
    setHistoryOpenId(null);
  }, [gameMode]);

  // アイテム一覧タブを開いた / APIデータ再取得時に、ウォッチボード・展開中チャートの履歴を取得
  // （loadAPIData が成功時に historyCache/historyReqRef をクリア → lastLoaded 変化でここが再実行され最新化）
  useEffect(() => {
    if (activeTab !== 'items') return;
    watchBoardIds.forEach(id => loadItemHistory(id));
    if (historyOpenId) loadItemHistory(historyOpenId);
  }, [activeTab, watchBoardIds, loadItemHistory, lastLoaded, historyOpenId]);

  // ===== イベント（Blackout）: 独自完了フラグ =====
  // API未登録の間は BLACKOUT_TASKS_STATIC のハードコードデータで表示し、
  // localStorage "eft_blackout_v1" でキー単位の完了状態を管理する。
  // API に登録された後は apiId が埋まり completedTaskIds（共有）側で管理される。
  const [blackoutDone, setBlackoutDone] = useState(() => {
    try { return JSON.parse(localStorage.getItem('eft_blackout_v1') || '{}'); } catch { return {}; }
  });
  const toggleBlackoutDone = useCallback((key, apiId) => {
    if (apiId) { toggleComplete(apiId); return; }
    setBlackoutDone(prev => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem('eft_blackout_v1', JSON.stringify(next));
      return next;
    });
  }, [toggleComplete]);
  const isBlackoutDone = useCallback((task) =>
    task.apiId ? completedTaskIds.includes(task.apiId) : !!blackoutDone[task.key]
  , [blackoutDone, completedTaskIds]);

  // ===== ボスイベント: bossItemタイプのアイテムを要求するバーター =====
  // ボス100%スポーン＋ボスアイテム交換イベント。
  // barters クエリの requiredItems.item には types が含まれないため、
  // apiData.items（items クエリ側で types を取得済み）と id で突き合わせる。
  const bossEventBarters = useMemo(() => {
    const itemMap = new Map(apiData.items.map(i => [i.id, i]));
    return apiData.barters.filter(b =>
      (b.requiredItems || []).some(r => {
        const full = r.item?.id ? itemMap.get(r.item.id) : null;
        return (full?.types || []).includes('bossItem');
      })
    );
  }, [apiData.barters, apiData.items]);

  // historyCacheを過去N日分に切り出す（必要アイテムは7日分表示）
  const sliceDays = useCallback((hc, days) => (
    (hc && hc.points) ? { ...hc, points: hc.points.filter(p => p.t >= Date.now() - days * 86400000) } : hc
  ), []);

  // ===== 鍵一覧（keysタブ） =====
  const [keyThreshold, setKeyThreshold] = useState(saved.keyThreshold || '50000'); // 平均価格しきい値（これ未満は非表示）
  const [keySort, setKeySort]           = useState(saved.keySort || 'avgDesc');      // avgDesc / avgAsc / name
  const [keyGroupByMap, setKeyGroupByMap] = useState(saved.keyGroupByMap !== false); // 既定: マップ別
  const [keyView, setKeyView]           = useState(saved.keyView || 'list');         // list / overlay
  const [keyOpenId, setKeyOpenId]       = useState(null);                            // リスト表示で展開中の鍵（個別チャート）
  const [keyOpenMaps, setKeyOpenMaps]   = useState({});                              // マップ別セクション開閉

  // 全鍵（しきい値前）
  const allKeys = useMemo(() => apiData.items.filter(isKeyItem), [apiData.items]);

  // しきい値＋ソート適用後の鍵リスト
  const keysFiltered = useMemo(() => {
    const th = parseShorthand(keyThreshold) || 0;
    let list = allKeys.filter(k => (k.avg24hPrice || 0) >= th);
    list = [...list].sort((a, b) => {
      if (keySort === 'name') return (a.name || '').localeCompare(b.name || '', 'ja');
      const av = a.avg24hPrice || 0, bv = b.avg24hPrice || 0;
      return keySort === 'avgAsc' ? av - bv : bv - av;
    });
    return list;
  }, [allKeys, keyThreshold, keySort]);

  // マップ別グループ（1鍵が複数マップに入りうる）
  const keysByMap = useMemo(() => {
    const map = {};
    keysFiltered.forEach(k => keyMapsFor(k).forEach(mp => { (map[mp] = map[mp] || []).push(k); }));
    return map;
  }, [keysFiltered]);

  // マップ表示順（主要マップ→その他を末尾に）
  const keyMapOrder = useMemo(() => {
    const pref = ['Customs', 'Factory', 'Woods', 'Shoreline', 'Interchange', 'Reserve', 'Lighthouse', 'Streets', 'The Lab', 'Ground Zero'];
    const present = Object.keys(keysByMap);
    const ordered = pref.filter(m => present.includes(m));
    present.filter(m => !pref.includes(m) && m !== 'その他').forEach(m => ordered.push(m));
    if (present.includes('その他')) ordered.push('その他');
    return ordered;
  }, [keysByMap]);

  const toggleKeyMap = useCallback((mp) => setKeyOpenMaps(prev => ({ ...prev, [mp]: !prev[mp] })), []);
  const toggleKeyOpen = useCallback((id) => {
    setKeyOpenId(prev => (prev === id ? null : id));
    loadItemHistory(id);
  }, [loadItemHistory]);

  // series 構築（重ねグラフ用）。色は index ベースの HSL。
  const buildKeySeries = useCallback((keys) => keys.map((k, i) => {
    const hc = historyCache[k.id];
    const points = (hc?.points || []).filter(p => p.price).map(p => ({ t: p.t, price: p.price }));
    return {
      id: k.id, name: k.name, shortName: k.shortName,
      color: `hsl(${Math.round(i * 360 / Math.max(1, keys.length))}, 70%, 60%)`,
      points,
    };
  }), [historyCache]);

  // keysタブ：必要な履歴を取得（リスト=展開中のみ / 重ね=開いているマップ or 全件）
  useEffect(() => {
    if (activeTab !== 'keys') return;
    if (keyView === 'list') {
      if (keyOpenId) loadItemHistory(keyOpenId);
      return;
    }
    let ids = [];
    if (keyGroupByMap) {
      keyMapOrder.forEach(mp => { if (keyOpenMaps[mp]) (keysByMap[mp] || []).forEach(k => ids.push(k.id)); });
    } else {
      ids = keysFiltered.map(k => k.id);
    }
    [...new Set(ids)].forEach(id => loadItemHistory(id));
  }, [activeTab, keyView, keyGroupByMap, keyOpenMaps, keyMapOrder, keysByMap, keysFiltered, keyOpenId, loadItemHistory, lastLoaded]);

  // 鍵リスト（行クリックで個別フリマチャートを展開）。グループ/非グループ両方で再利用。
  const renderKeyList = (keys) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {keys.map(k => {
        const open = keyOpenId === k.id;
        return (
          <React.Fragment key={k.id}>
            <div className="key-row" onClick={() => toggleKeyOpen(k.id)}
              style={{ cursor: 'pointer', borderColor: open ? 'var(--accent)' : undefined }}>
              {k.iconLink && <img src={k.iconLink} alt="" className="item-icon-32" onError={e => { e.target.style.display = 'none'; }} />}
              <div style={{ flex: '1 1 200px', minWidth: 160 }}>
                <span style={{ fontSize: 13, fontWeight: 'bold', color: 'var(--text-primary)' }}>{k.name}</span>
                {k.shortName && k.shortName !== k.name && (
                  <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 6, background: 'var(--bg-secondary)', padding: '1px 5px', borderRadius: 3 }}>{k.shortName}</span>
                )}
              </div>
              {!keyGroupByMap && <span style={{ fontSize: 11, color: 'var(--text-dim)', flexShrink: 0 }}>{keyMapsFor(k).join('/')}</span>}
              <span style={{ fontSize: 12, whiteSpace: 'nowrap', width: 190, textAlign: 'right', flexShrink: 0 }}>
                <span style={{ color: 'var(--state-ok-text)' }} title="最安値（24h）">{fmt(k.low24hPrice || 0)}</span>
                <span style={{ color: 'var(--text-dim)', margin: '0 3px' }}>/</span>
                <span style={{ color: 'var(--text-secondary)' }} title="平均値（24h）">{fmt(k.avg24hPrice || 0)}</span>
                <span style={{ color: 'var(--text-dim)', margin: '0 3px' }}>/</span>
                <span style={{ color: 'var(--danger-text)' }} title="最高値（24h）">{fmt(k.high24hPrice || 0)}</span>
              </span>
              <Icon name={open ? 'chevron-up' : 'chevron-down'} size={14} color="var(--text-dim)" />
            </div>
            {open && <div className="key-chart-wrap"><FleaHistoryChart {...(historyCache[k.id] || { loading: true })} /></div>}
          </React.Fragment>
        );
      })}
    </div>
  );

  const renderKeyOverlay = (keys) => {
    const series = buildKeySeries(keys);
    const loadingCount = keys.length - series.filter(s => s.points.length).length;
    return <MultiLineFleaChart series={series} loadingCount={loadingCount} />;
  };

  const jumpToItemSearch = useCallback((itemName) => {
    setSearchQuery(itemName);
    setTimeout(() => {
      itemSearchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }, []);
  const [traderFilters, setTraderFilters] = useState({});
  const [onlyTradeable, setOnlyTradeable] = useState(false);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [profitCategoryFilter, setProfitCategoryFilter] = useState([]);
  const [profitBuyTrader, setProfitBuyTrader] = useState('');
  const [profitSellTrader, setProfitSellTrader] = useState('');
  // ピン止め: [{ itemId, qty, item }] 最大6件
  const [pinnedItems, setPinnedItems] = useState(saved.pinnedItems || []);

  // ウォッチボード：常時価格推移を表示するアイテムIDの配列（localStorage永続化）
  const [watchBoardIds, setWatchBoardIds] = useState(saved.watchBoardIds || []);
  const toggleWatchBoard = useCallback((itemId) => {
    setWatchBoardIds(prev => prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]);
  }, []);

  const pinItem = useCallback((item) => {
    setPinnedItems(prev => {
      if (prev.find(p => p.itemId === item.id)) return prev; // 既にピン済み
      if (prev.length >= 6) return prev; // 上限
      return [...prev, { itemId: item.id, qty: 1, item }];
    });
  }, []);

  const unpinItem = useCallback((itemId) => {
    setPinnedItems(prev => prev.filter(p => p.itemId !== itemId));
  }, []);

  const updatePinQty = useCallback((itemId, delta) => {
    setPinnedItems(prev => prev.map(p =>
      p.itemId === itemId ? { ...p, qty: Math.max(1, p.qty + delta) } : p
    ));
  }, []);

  const [pinTargetTrader, setPinTargetTrader] = useState('');
  const [pinTargetAmount, setPinTargetAmount] = useState('');

  // 目標金額が設定されたら各ピンアイテムの個数を自動更新
  useEffect(() => {
    const amount = parseShorthand(pinTargetAmount);
    if (!pinTargetTrader || !amount || amount <= 0) return;
    setPinnedItems(prev => prev.map(p => {
      // カードに表示される最良の購入・売却トレーダーを特定
      const traderBuys  = (p.item.buyFor  || []).filter(b => b.vendor?.trader?.id);
      const traderSells = (p.item.sellFor || []).filter(s => s.vendor?.trader?.id);
      const bestBuyRUB  = traderBuys.length  > 0 ? Math.min(...traderBuys.map(b => b.priceRUB))  : 0;
      const bestBuy     = traderBuys.find(b => b.priceRUB === bestBuyRUB);
      const bestSellRUB = traderSells.length > 0 ? Math.max(...traderSells.map(s => s.priceRUB)) : 0;
      const bestSell    = traderSells.find(s => s.priceRUB === bestSellRUB);
      // 表示されているトレーダーが指定トレーダーと一致する分のみ合算
      let unitPrice = 0;
      if (bestBuy?.vendor?.trader?.id  === pinTargetTrader) unitPrice += bestBuyRUB;
      if (bestSell?.vendor?.trader?.id === pinTargetTrader) unitPrice += bestSellRUB;
      if (unitPrice <= 0) return p;
      const qty = Math.ceil(amount / unitPrice);
      return { ...p, qty: Math.max(1, qty) };
    }));
  }, [pinTargetTrader, pinTargetAmount]);
  const [advisorSort, setAdvisorSort] = useState('priority');
  const [hideoutStationFilters, setHideoutStationFilters] = useState(saved.hideoutStationFilters || {});
  const [collapsedStations, setCollapsedStations] = useState({});
  const [showCompletedItems, setShowCompletedItems] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(true);
  const [summaryCompletedOpen, setSummaryCompletedOpen] = useState(false);
  const [stationSort, setStationSort] = useState('default');
  const [summaryItemOrder, setSummaryItemOrder] = useState(null); // null = 未集計
  const [wishlistOpen, setWishlistOpen] = useState(saved.wishlistOpen !== false);
  const [favoritesOpen, setFavoritesOpen] = useState(saved.favoritesOpen !== false);
  const [wishlist, setWishlist] = useState(saved.wishlist || []);
  const [favorites, setFavorites] = useState(saved.favorites || []);
  const [wishlistCrafts, setWishlistCrafts] = useState(saved.wishlistCrafts || []);
  const [listSearch, setListSearch] = useState('');
  const [listCategoryFilter, setListCategoryFilter] = useState('all');
  const [barterTraderFilter, setBarterTraderFilter] = useState('all');
  const [barterLLFilter, setBarterLLFilter] = useState('all');
  const [barterSubTab, setBarterSubTab] = useState('barter'); // 'barter' | 'craft'
  const [taskSearch, setTaskSearch] = useState('');
  const [taskTraderFilter, setTaskTraderFilter] = useState('all');
  const [taskMapFilter, setTaskMapFilter] = useState('all');
  const [taskTypeFilter, setTaskTypeFilter] = useState('all');
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);
  const [pinnedBoardOpen, setPinnedBoardOpen] = useState(true);
  const [openTaskIds, setOpenTaskIds] = useState([]);           // 詳細展開中のタスクID（進行中ボード用）
  const [openSearchTaskIds, setOpenSearchTaskIds] = useState([]); // 詳細展開中のタスクID（検索結果用）
  const [pinnedTaskIds, setPinnedTaskIds] = useState(saved.pinnedTaskIds || []);   // 進行中タスク
  const [mapTaskIds, setMapTaskIds] = useState(saved.mapTaskIds || []);             // ピン止め（出撃マップ用）
  const [completedTaskIds, setCompletedTaskIds] = useState(saved.completedTaskIds || []);
  const [deliveryChecks, setDeliveryChecks] = useState(saved.deliveryChecks || {}); // 納品アイテム納品済み数 { itemId: number }
  const setDeliveryCount = (key, delta, max) => setDeliveryChecks(prev => {
    const n = { ...prev };
    const current = Number(n[key]) || 0;
    const next = Math.max(0, Math.min(max, current + delta));
    if (next === 0) delete n[key];
    else n[key] = next;
    return n;
  });
  const [recentlyUnlockedTaskIds, setRecentlyUnlockedTaskIds] = useState([]);
  // wikiPanels: { [url]: { open, loading, blobUrl, error, title } } — タスクごとに独立
  const [wikiPanels, setWikiPanels] = useState({});
  // blobUrlキャッシュ — stateと独立して保持、再マウント時も即復元
  const wikiBlobCache = useRef({});
  const setWikiPanel = (url, patch) => setWikiPanels(prev => ({
    ...prev,
    [url]: typeof patch === 'function' ? patch(prev[url] || {}) : { ...(prev[url] || {}), ...patch }
  }));
  const closeWikiPanel = (url) => setWikiPanels(prev => ({ ...prev, [url]: { ...(prev[url] || {}), open: false } }));

  // ── 武器プリセット ──
  const [weaponPresets, setWeaponPresets] = useState(() => {
    try { return JSON.parse(localStorage.getItem('eft_presets_v1')) || []; } catch { return []; }
  });
  const [presetEditId,       setPresetEditId]       = useState(null);
  const [presetSearch,       setPresetSearch]        = useState('');
  const [presetSort,         setPresetSort]          = useState('price');
  const [presetSearchIdx,    setPresetSearchIdx]     = useState(-1);
  const [presetWeaponFilter, setPresetWeaponFilter]  = useState('');
  const [presetAdvisorOpen,  setPresetAdvisorOpen]    = useState(false);
  const [presetAdvisorCat,   setPresetAdvisorCat]     = useState('');
  const [presetAdvisorSort,  setPresetAdvisorSort]    = useState('ergo');
  const [standardPresetId,   setStandardPresetId]    = useState(() => localStorage.getItem('eft_presets_standard') || null);
  const [hideStandardParts,  setHideStandardParts]   = useState(false);
  const savePresets = (next) => {
    localStorage.setItem('eft_presets_v1', JSON.stringify(next));
    setWeaponPresets(next);
  };
  const setStandardPreset = (id) => {
    if (id) localStorage.setItem('eft_presets_standard', id);
    else    localStorage.removeItem('eft_presets_standard');
    setStandardPresetId(id);
  };

  // ── OCR ──
  const [ocrFile, setOcrFile] = useState(null);        // { url, name }
  const [ocrRunning, setOcrRunning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrMatches, setOcrMatches] = useState([]);
  const [ocrDragOver, setOcrDragOver] = useState(false);
  const [ocrCropRatio, setOcrCropRatio] = useState(1.0);
  const [ocrDropdownIdx, setOcrDropdownIdx] = useState(null);
  const [ocrDropdownSearch, setOcrDropdownSearch] = useState('');
  const ocrImgRef = useRef(null);

  // ── 出撃準備 ──
  const [raidMap, setRaidMap] = useState(saved.raidMap || '');
  const [raidOcrFiles, setRaidOcrFiles] = useState([]);
  const [raidOcrRunning, setRaidOcrRunning] = useState(false);
  const [raidOcrProgress, setRaidOcrProgress] = useState(0);
  const [raidOcrMatches, setRaidOcrMatches] = useState([]);
  const [raidOcrDragOver, setRaidOcrDragOver] = useState(false);
  const [raidCompleteCandidates, setRaidCompleteCandidates] = useState([]);
  const [ocrAutoNext, setOcrAutoNext] = useState(false);
  const [raidTaskSearch, setRaidTaskSearch] = useState('');
  const [raidActiveTasksOpen, setRaidActiveTasksOpen] = useState(false); // 出撃準備: 進行タスク一覧の開閉（デフォルト閉）
  const [raidDetailTask, setRaidDetailTask] = useState(null);
  const [raidObjChecked, setRaidObjChecked] = useState(() => {
    try { return JSON.parse(localStorage.getItem(modeKey('eft_raid_obj_checked_v1')) || '{}'); }
    catch { return {}; }
  });

  // ── カスタムタスク（APIに未登録のタスクを手動登録・全モード共通）──
  const CUSTOM_TASKS_LS_KEY = 'eft_custom_tasks_v1';
  const [customTasks, setCustomTasks] = useState(() => {
    try {
      // グローバルキー（全モード共通）を優先
      const globalData = localStorage.getItem(CUSTOM_TASKS_LS_KEY);
      if (globalData !== null) return JSON.parse(globalData);
      // 旧モード別キーから移行
      const modeData = localStorage.getItem(modeKey(CUSTOM_TASKS_LS_KEY));
      if (modeData) {
        const tasks = JSON.parse(modeData);
        localStorage.setItem(CUSTOM_TASKS_LS_KEY, JSON.stringify(tasks));
        return tasks;
      }
      return [];
    } catch { return []; }
  });
  const saveCustomTasks = useCallback((tasks) => {
    localStorage.setItem(CUSTOM_TASKS_LS_KEY, JSON.stringify(tasks));
    setCustomTasks(tasks);
  }, []);
  const [customTaskDraft, setCustomTaskDraft] = useState({ name: '', traderName: '', objectives: [], wikiLink: '' });
  const [customTaskFormOpen, setCustomTaskFormOpen] = useState(false);
  const [customTaskEditId, setCustomTaskEditId] = useState(null); // null=新規, string=編集中のタスクID
  const [customFormTraderOpen, setCustomFormTraderOpen] = useState(false);
  const [customFormItemSearchIdx, setCustomFormItemSearchIdx] = useState(-1); // 開いているアイテム検索ドロップダウンの目標インデックス（-1=閉）
  const [collectViewMode, setCollectViewMode] = useState('normal'); // 収集セクション表示モード: 'normal'|'2col'|'3col'|'hidden'
  const [customTaskSectionOpen, setCustomTaskSectionOpen] = useState(true); // カスタムタスクカード一覧の開閉
  const [apiTaskToUnpin, setApiTaskToUnpin] = useState(null); // APIタスク上書き保存後にアンピンするID

  const openCustomTaskEdit = useCallback((taskId) => {
    const ct = customTasks.find(t => t.id === taskId);
    if (!ct) return;
    const objs = (ct.objectives || []).map(o => {
      const maps = (o.maps || []).map(m => m.name);
      if (o.type === 'findItem' && o.foundInRaid)
        return { origId: o.id, catKey: 'collect', itemName: o.item?.name || o.itemCategory?.name || '', itemId: o.item?.id || null, itemIconLink: o.item?.iconLink || '', description: o.description || '', count: o.count || 1, maps, useCategory: !!o.itemCategory };
      if ((o.type === 'findItem' || o.type === 'giveItem') && !o.foundInRaid)
        return { origId: o.id, catKey: 'bring', itemName: o.item?.name || o.itemCategory?.name || '', itemId: o.item?.id || null, itemIconLink: o.item?.iconLink || '', description: o.description || '', count: o.count || 1, maps, useCategory: !!o.itemCategory };
      if (o.type === 'kill')
        return { origId: o.id, catKey: 'kill', itemName: o.target || '', itemId: null, itemIconLink: '', description: o.description || '', count: o.count || 1, maps, useCategory: false };
      if (o.type === 'mark') {
        const savedDesc = (o.markerItem && o.description === o.markerItem.name) ? '' : (o.description || '');
        return { origId: o.id, catKey: 'place', itemName: o.markerItem?.name || '', itemId: o.markerItem?.id || null, itemIconLink: o.markerItem?.iconLink || '', description: savedDesc, count: 1, maps, useCategory: false };
      }
      if (o.type === 'extract')
        return { origId: o.id, catKey: 'extract', itemName: o.description || '', itemId: null, itemIconLink: '', description: '', count: 1, maps, useCategory: false };
      if (o.type === 'locate')
        return { origId: o.id, catKey: 'locate', itemName: o.description || '', itemId: null, itemIconLink: '', description: '', count: 1, maps, useCategory: false };
      return { origId: o.id, catKey: 'bring', itemName: '', itemId: null, itemIconLink: '', description: '', count: 1, maps: [], useCategory: false };
    });
    setCustomTaskDraft({ name: ct.name, traderName: ct.trader?.name || '', objectives: objs, wikiLink: ct.wikiLink || '' });
    setCustomTaskEditId(ct.id);
    setCustomTaskFormOpen(true);
    setActiveTab('raid');
  }, [customTasks]);

  const openApiTaskEdit = useCallback((task) => {
    const objs = (task.objectives || []).flatMap(o => {
      const maps = (o.maps || []).map(m => m.name);
      // レイド内収集（FIR）
      if (o.type === 'findItem' && o.foundInRaid)
        return [{ catKey: 'collect', itemName: o.item?.name || o.itemCategory?.name || o.description || '', itemId: o.item?.id || null, itemIconLink: o.item?.iconLink || '', description: o.description || '', count: o.count || 1, maps, useCategory: !!o.itemCategory }];
      // クエストアイテム収集（findQuestItem型 + JSON APIでfindItemだがquestItemフィールドがある場合も対応）
      if (o.type === 'findQuestItem' || (o.questItem && !o.item))
        return [{ catKey: 'collect', itemName: o.questItem?.name || o.description || '', itemId: o.questItem?.id || null, itemIconLink: '', description: '', count: o.count || 1, maps, useCategory: false }];
      // 持ち込み・納品
      if (o.type === 'findItem' || o.type === 'giveItem')
        return [{ catKey: 'bring', itemName: o.item?.name || o.itemCategory?.name || o.description || '', itemId: o.item?.id || null, itemIconLink: o.item?.iconLink || '', description: o.description || '', count: o.count || 1, maps, useCategory: !!o.itemCategory }];
      // 倒す（kill / shoot 両方）
      if (o.type === 'kill' || o.type === 'shoot')
        return [{ catKey: 'kill', itemName: o.target || o.description || '', itemId: null, itemIconLink: '', description: o.description || '', count: o.count || 1, maps, useCategory: false }];
      // マーク設置（plantItemはJSON APIでo.itemになる場合もあるため両方参照）
      if (o.type === 'mark' || o.type === 'plantItem') {
        const markerName = o.markerItem?.name || o.item?.name || '';
        const savedDesc = (markerName && o.description === markerName) ? '' : (o.description || '');
        return [{ catKey: 'place', itemName: markerName, itemId: o.markerItem?.id || o.item?.id || null, itemIconLink: o.markerItem?.iconLink || o.item?.iconLink || '', description: savedDesc, count: 1, maps, useCategory: false }];
      }
      // 脱出・生還
      if (o.type === 'extract')
        return [{ catKey: 'extract', itemName: o.description || '', itemId: null, itemIconLink: '', description: '', count: 1, maps, useCategory: false }];
      // 場所を特定 / visit
      if (o.type === 'locate' || o.type === 'visit')
        return [{ catKey: 'locate', itemName: o.description || '', itemId: null, itemIconLink: '', description: '', count: 1, maps, useCategory: false }];
      // buildItem / taskStatus / experience など: descriptionがあれば locate として表示（空フォーム防止）
      if (o.description)
        return [{ catKey: 'locate', itemName: o.description, itemId: null, itemIconLink: '', description: '', count: o.count || 1, maps: [], useCategory: false }];
      return [];
    });
    setCustomTaskDraft({ name: task.name, traderName: task.trader?.name || '', objectives: objs, wikiLink: task.wikiLink || '' });
    setCustomTaskEditId(null); // 新規カスタムタスクとして保存
    setApiTaskToUnpin(task.id);
    setCustomTaskFormOpen(true);
    setActiveTab('raid');
  }, []);

  const [itemsProfitOpen, setItemsProfitOpen] = useState(false);
  const [itemsPinOpen,    setItemsPinOpen]    = useState(false);
  const [watchBoardOpen,   setWatchBoardOpen]   = useState(saved.watchBoardOpen !== false); // 既定: 開
  const [watchBoardTwoCol, setWatchBoardTwoCol] = useState(saved.watchBoardTwoCol || false); // 既定: 1列

  // ── マップ画像・タスクピン（全モード共通）──
  const MAPS_LS_KEY = 'eft_maps_v1';
  const TASK_PINS_LS_KEY = 'eft_task_pins_v1';

  const [mapImages, setMapImages] = useState(() => {
    try { return JSON.parse(localStorage.getItem(MAPS_LS_KEY)) || {}; } catch { return {}; }
  });
  const [taskPins, setTaskPins] = useState(() => {
    try { return JSON.parse(localStorage.getItem(TASK_PINS_LS_KEY)) || []; } catch { return []; }
  });

  const mapImageLoadingRef = useRef({});

  // 利用者が差し替えたマップ画像（IndexedDB）→ { [mapName]: objectURL }
  const [mapImageOverrides, setMapImageOverrides] = useState({});
  const mapImageOverridesRef = useRef({});
  useEffect(() => { mapImageOverridesRef.current = mapImageOverrides; }, [mapImageOverrides]);
  useEffect(() => {
    mediaGetAllMapOverrides()
      .then(all => setMapImageOverrides(Object.fromEntries(Object.entries(all).map(([k, b]) => [k, URL.createObjectURL(b)]))))
      .catch(e => console.warn('[EFT] 差し替えマップ画像の読み込みに失敗:', e));
  }, []);

  /** 表示用のマップ画像URL（差し替え画像があれば優先、なければ maps/<file>） */
  const getMapImageSrc = useCallback((mapName, meta) =>
    mapImageOverrides[mapName] || `maps/${meta?.file || RAID_MAP_IMAGE_FILES[mapName]}`,
  [mapImageOverrides]);

  const _loadImageSize = (src) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('画像を読み込めませんでした'));
    img.src = src;
  });

  /**
   * マップ画像を差し替える。ピン座標の基準（eft_maps_v1 の width/height）は変えず、表示画像だけを替える。
   * 基準が未登録（maps/ に元画像が無い）なら差し替え画像のサイズで登録する。成功時 true。
   */
  const replaceMapImage = useCallback(async (mapName, file) => {
    const url = URL.createObjectURL(file);
    let size;
    try { size = await _loadImageSize(url); }
    catch (e) { URL.revokeObjectURL(url); alert(e.message); return false; }
    const meta = mapImages[mapName];
    if (meta && Math.abs(size.width / size.height - meta.width / meta.height) > 0.02 * (meta.width / meta.height)) {
      if (!confirm(`差し替え画像の縦横比が元の画像と異なります（元 ${meta.width}×${meta.height} / 新 ${size.width}×${size.height}）。\n登録済みピンの位置がずれる可能性があります。差し替えますか？`)) {
        URL.revokeObjectURL(url); return false;
      }
    }
    try { await mediaPutMapOverride(mapName, file); }
    catch (e) { URL.revokeObjectURL(url); alert('画像の保存に失敗しました: ' + e.message); return false; }
    if (!meta) {
      setMapImages(prev => {
        const next = { ...prev, [mapName]: { file: RAID_MAP_IMAGE_FILES[mapName] || '', width: size.width, height: size.height } };
        localStorage.setItem(MAPS_LS_KEY, JSON.stringify(next));
        return next;
      });
    }
    setMapImageOverrides(prev => {
      if (prev[mapName]) URL.revokeObjectURL(prev[mapName]);
      return { ...prev, [mapName]: url };
    });
    return true;
  }, [mapImages]);

  /** 差し替えを解除して元の maps/<file> に戻す */
  const resetMapImage = useCallback(async (mapName) => {
    try { await mediaDeleteMapOverride(mapName); }
    catch (e) { alert('元の画像に戻せませんでした: ' + e.message); return; }
    setMapImageOverrides(prev => {
      if (prev[mapName]) URL.revokeObjectURL(prev[mapName]);
      const next = { ...prev }; delete next[mapName];
      return next;
    });
  }, []);

  const ensureMapImageRegistered = useCallback((mapName) => {
    return new Promise((resolve) => {
      setMapImages(prev => {
        if (prev[mapName]) { resolve(prev[mapName]); return prev; }
        if (mapImageLoadingRef.current[mapName]) return prev;
        const file = RAID_MAP_IMAGE_FILES[mapName];
        if (!file) { resolve(null); return prev; }
        mapImageLoadingRef.current[mapName] = true;
        const img = new Image();
        img.onload = () => {
          const entry = { file, width: img.naturalWidth, height: img.naturalHeight };
          setMapImages(p2 => {
            const next = { ...p2, [mapName]: entry };
            localStorage.setItem(MAPS_LS_KEY, JSON.stringify(next));
            return next;
          });
          mapImageLoadingRef.current[mapName] = false;
          resolve(entry);
        };
        img.onerror = () => {
          // maps/ に元画像が無い場合は差し替え画像で基準サイズを登録する
          const override = mapImageOverridesRef.current[mapName];
          if (override && img.src !== override) { img.src = override; return; }
          mapImageLoadingRef.current[mapName] = false;
          resolve(null);
        };
        img.src = `maps/${file}`;
        return prev;
      });
    });
  }, []);

  // 新規ピン追加（同じ目標に複数スポーン地点を登録可能）
  const addTaskPin = useCallback((mapName, taskId, objectiveId, x, y) => {
    setTaskPins(prev => {
      const id = `pin_${objectiveId}_${Date.now()}`;
      const next = [...prev, { id, mapName, taskId, objectiveId, x, y }];
      localStorage.setItem(TASK_PINS_LS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);
  // 既存ピンの座標更新（再配置・ステージング確定）
  const updateTaskPinPosition = useCallback((pinId, x, y) => {
    setTaskPins(prev => {
      const next = prev.map(p => p.id === pinId ? { ...p, x, y } : p);
      localStorage.setItem(TASK_PINS_LS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeTaskPin = useCallback((pinId) => {
    setTaskPins(prev => {
      const next = prev.filter(p => p.id !== pinId);
      localStorage.setItem(TASK_PINS_LS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // ピンのメモ・持参アイテム・詳細位置画像を更新（updates は object か (pin) => object）
  const updatePinMeta = useCallback((pinId, updates) => {
    setTaskPins(prev => {
      const next = prev.map(p => p.id === pinId ? { ...p, ...(typeof updates === 'function' ? updates(p) : updates) } : p);
      try { localStorage.setItem(TASK_PINS_LS_KEY, JSON.stringify(next)); }
      catch { alert('ピンの保存に失敗しました（localStorage の容量不足の可能性があります。不要な詳細位置画像を削除してください）'); return prev; }
      return next;
    });
  }, []);

  // ── タスク品（アイテム一覧に無いクエストアイテム等）のユーザー登録（全モード共通）──
  // [{ id:'citem_<ts>', name, shortName, iconLink(dataURL) }]。ピンの requiredItems からは id で参照し、表示時に最新の名前・画像へ解決する
  const CUSTOM_ITEMS_LS_KEY = 'eft_custom_items_v1';
  const [customItems, setCustomItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem(CUSTOM_ITEMS_LS_KEY)) || []; } catch { return []; }
  });
  const saveCustomItems = (next) => {
    try { localStorage.setItem(CUSTOM_ITEMS_LS_KEY, JSON.stringify(next)); }
    catch { alert('タスク品の保存に失敗しました（localStorage の容量不足の可能性があります）'); }
  };
  const addCustomItem = useCallback(({ name, shortName, iconLink }) => {
    const item = { id: `citem_${Date.now()}`, name: name.trim(), shortName: (shortName || '').trim(), iconLink: iconLink || '' };
    setCustomItems(prev => { const next = [...prev, item]; saveCustomItems(next); return next; });
    return item;
  }, []);
  const updateCustomItem = useCallback((id, updates) => {
    setCustomItems(prev => { const next = prev.map(c => c.id === id ? { ...c, ...updates } : c); saveCustomItems(next); return next; });
  }, []);
  // 削除時は全ピンの requiredItems からも外す
  const removeCustomItem = useCallback((id) => {
    setCustomItems(prev => { const next = prev.filter(c => c.id !== id); saveCustomItems(next); return next; });
    setTaskPins(prev => {
      const next = prev.map(p => p.requiredItems?.some(i => i.id === id)
        ? { ...p, requiredItems: p.requiredItems.filter(i => i.id !== id) } : p);
      localStorage.setItem(TASK_PINS_LS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // ── マップタブ用 state ──
  const [mapsItemMgrOpen, setMapsItemMgrOpen] = useState(false);
  // タスク品登録/編集フォーム: null | { editId|null, name, shortName, iconLink, attachPinId|null, error }
  const [mapsItemForm, setMapsItemForm] = useState(null);
  const [mapsSelectedMap, setMapsSelectedMap] = useState(null);
  const [mapsPlacingObjective, setMapsPlacingObjective] = useState(null);
  const [mapsRepositioningPinId, setMapsRepositioningPinId] = useState(null);
  const [mapsPendingPinCoords, setMapsPendingPinCoords] = useState(null);
  const [mapsPendingSearch, setMapsPendingSearch] = useState('');
  const [mapsLoadFailed, setMapsLoadFailed] = useState({});
  const [mapsDetailTask, setMapsDetailTask] = useState(null);
  const [mapsPinEditId, setMapsPinEditId] = useState(null);
  const [mapsPinMemoInput, setMapsPinMemoInput] = useState('');
  const [mapsPinItemSearch, setMapsPinItemSearch] = useState('');
  const [pinImageViewer, setPinImageViewer] = useState(null); // 拡大表示中の詳細位置画像 { name, dataUrl }
  const [mapsHighlightedPinId, setMapsHighlightedPinId] = useState(null);
  const [mapsZoom, setMapsZoom] = useState(1);
  const [mapsPanX, setMapsPanX] = useState(0);
  const [mapsPanY, setMapsPanY] = useState(0);
  const [mapsIsDragging, setMapsIsDragging] = useState(false);
  const mapsContainerRef = useRef(null);
  const mapsInnerContainerRef = useRef(null);
  const mapsViewportRef = useRef({ zoom: 1, panX: 0, panY: 0 });
  const mapsDragRef = useRef(null);
  const mapsWasDraggingRef = useRef(false);


  // Save state（設定・ステータス・進捗すべて保存）
  useEffect(() => {
    saveState({ gameMode, edition, uiLang, theme, playerLevel, traderStatus, hideoutLevels, stash, lastLoaded, hideoutStationFilters, wishlist, favorites, wishlistCrafts, pinnedTaskIds, mapTaskIds, pinnedItems, watchBoardIds, watchBoardOpen, watchBoardTwoCol, completedTaskIds, wishlistOpen, favoritesOpen, deliveryChecks, keyThreshold, keySort, keyGroupByMap, keyView, raidMap });
  }, [gameMode, edition, uiLang, theme, playerLevel, traderStatus, hideoutLevels, stash, lastLoaded, hideoutStationFilters, wishlist, favorites, wishlistCrafts, pinnedTaskIds, mapTaskIds, pinnedItems, watchBoardIds, watchBoardOpen, watchBoardTwoCol, completedTaskIds, wishlistOpen, favoritesOpen, deliveryChecks, keyThreshold, keySort, keyGroupByMap, keyView, raidMap]);

  // ===== PROMO CODES =====
