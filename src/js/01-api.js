// ================== API ==================
// リトライはしない（API障害中の負荷を増やさないため）。
// GraphQL が 503 等で失敗した場合は json.tarkov.dev の JSON API にフォールバックする。
// fetch自体の失敗はTypeErrorとしてthrowされる → 呼び出し側でエラー種別を判別。
//
// 翻訳方式: json.tarkov.dev の翻訳は /{mode}/{endpoint}_ja エンドポイントから取得する
// (クエリパラメータ ?lang=ja は無効)。
// main.data 内の "{24hexId} ..." 形式の文字列値が翻訳キーで、_applyLocale で一括置換する。

const JSON_API_BASE = 'https://json.tarkov.dev';

// フォールバック使用フラグ（loadAPIData の呼び出し単位でリセット）
let _fallbackUsed = false;
function resetFallbackFlag() { _fallbackUsed = false; }
function isFallbackActive() { return _fallbackUsed; }

// URL キーでフェッチをキャッシュ（同時リクエストを1回に集約）
const _jsonApiCache = {};

async function _fetchJson(url) {
  if (!_jsonApiCache[url]) {
    _jsonApiCache[url] = fetch(url)
      .then(r => {
        if (!r.ok) throw new Error(`JSON API ${r.status}: ${url}`);
        return r.json();
      })
      .catch(err => {
        delete _jsonApiCache[url]; // エラー時はキャッシュ除去して次回リトライ可能に
        throw err;
      });
  }
  return _jsonApiCache[url];
}

// "first-in-line" → "First In Line"（翻訳未解決時のフォールバック）
function _slugToTitle(slug) {
  if (!slug) return '';
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ロケール翻訳を適用: 文字列値がロケールキーとして存在すれば置換
// ({hexId} Name, hideout_area_7_name, MOD_PISTOL_GRIP 等、全形式に対応)
function _applyLocale(obj, locale) {
  if (Array.isArray(obj)) return obj.map(x => _applyLocale(x, locale));
  if (obj && typeof obj === 'object') {
    const r = {};
    for (const [k, v] of Object.entries(obj)) r[k] = _applyLocale(v, locale);
    return r;
  }
  if (typeof obj === 'string' && Object.prototype.hasOwnProperty.call(locale, obj))
    return locale[obj];
  return obj;
}

// メインデータ + ロケールを並列取得して翻訳適用（翻訳済み data を返す）
async function _fetchTranslated(jMode, path, lang) {
  const base = `${JSON_API_BASE}/${jMode}/${path}`;
  const [main, loc] = await Promise.all([
    _fetchJson(base),
    _fetchJson(`${base}_${lang}`).then(r => r.data ?? {}).catch(() => ({})),
  ]);
  return _applyLocale(main.data, loc);
}

// items をIDキーのマップとして取得（翻訳済み）
async function _getItemsMap(jMode, lang) {
  const data = await _fetchTranslated(jMode, 'items', lang);
  return data?.items ?? {};
}

// maps ロケールのみ取得（軽量・約20KB）してマップID→名前の解決に使う
async function _getMapsLocale(jMode, lang) {
  const j = await _fetchJson(`${JSON_API_BASE}/${jMode}/maps_${lang}`).catch(() => ({ data: {} }));
  return j.data ?? {};
}

// アイテムIDからGraphQL互換の{id,name,shortName,iconLink}を作成
function _makeItemRef(itemId, itemsMap) {
  const item = itemsMap[itemId];
  if (!item) return { id: itemId, name: '', shortName: '', iconLink: '' };
  // 翻訳されなかった場合(翻訳キーが残っている)はnormalizedNameフォールバック
  const isUntranslated = s => s && /^[0-9a-f]{24} /.test(s);
  const name = isUntranslated(item.name) ? _slugToTitle(item.normalizedName) : (item.name || '');
  const shortName = isUntranslated(item.shortName)
    ? (_slugToTitle(item.normalizedName)?.split(' ').slice(0, 2).join(' ') || '')
    : (item.shortName || '');
  return { id: item.id, name, shortName, iconLink: item.iconLink || '' };
}

// ── トランスフォーム関数群 ──────────────────────────────────────────

function _transformTraders(data) {
  const traders = Object.values(data || {}).map(t => ({
    id: t.id,
    name: TRADER_NAMES[t.id] || t.name || t.id,
    imageLink: t.imageLink || '',
    currency: {
      shortName: typeof t.currency === 'string' ? t.currency : (t.currency?.shortName || 'RUB'),
    },
    levels: (t.levels || []).map(l => ({
      level: l.level,
      requiredPlayerLevel: l.requiredPlayerLevel || 0,
      requiredReputation: l.requiredReputation || 0,
      requiredCommerce: l.requiredCommerce || 0,
    })),
  }));
  return { traders };
}

function _transformItems(data) {
  const rawItems = data?.items ?? {};
  const catMap = {};
  Object.values(data?.itemCategories ?? {}).forEach(c => {
    if (c?.id) catMap[c.id] = c.name || _slugToTitle(c.normalizedName) || c.id;
  });

  const items = Object.values(rawItems).map(item => ({
    id: item.id,
    name: item.name || '',
    shortName: item.shortName || '',
    iconLink: item.iconLink || '',
    categories: (item.categories || []).map(cId => ({ name: catMap[cId] || cId })),
    types: item.types || [],
    sellFor: (item.sellToTrader || []).map(s => ({
      vendor: {
        trader: { id: s.trader, name: TRADER_NAMES[s.trader] || s.trader },
        minTraderLevel: s.minTraderLevel || 1,
      },
      priceRUB: s.priceRUB ?? s.price ?? 0,
    })),
    buyFor: (item.buyFromTrader || []).map(b => ({
      vendor: {
        trader: { id: b.trader, name: TRADER_NAMES[b.trader] || b.trader },
        minTraderLevel: b.minTraderLevel || 1,
        taskUnlock: b.taskUnlock ? { id: b.taskUnlock, name: '' } : null,
      },
      priceRUB: b.priceRUB ?? b.price ?? 0,
      currency: b.currency || 'RUB',
      price: b.price ?? 0,
    })),
    low24hPrice: item.low24hPrice ?? 0,
    high24hPrice: item.high24hPrice ?? 0,
    avg24hPrice: item.avg24hPrice ?? 0,
  }));
  return { items };
}

function _transformTasks(data, itemsMap, mapsLocale) {
  // JSON API: data.tasks は {taskId: taskObj} のオブジェクト（配列ではない）
  const questItemsMap = data?.questItems ?? {};
  const tasksArr = Object.values(data?.tasks ?? {});
  const ml = mapsLocale || {};

  const taskNameMap = {};
  tasksArr.forEach(t => { taskNameMap[t.id] = t.name || ''; });

  const tasks = tasksArr.map(task => {
    const objectives = (task.objectives || []).map(obj => {
      const base = {
        id: obj.id,
        description: obj.description || '',
        type: obj.type || '',
        // マップIDを maps_ja ロケールで名前に変換（例: "55f2d3fd... Name" → "Factory"）
        maps: (obj.maps || []).map(m => ({ name: ml[`${m} Name`] || m })),
      };

      // findItem / giveItem: items は受け入れ可能アイテムID配列
      if (obj.items?.length > 0) {
        return {
          ...base,
          item: _makeItemRef(obj.items[0], itemsMap),
          count: obj.count || 1,
          foundInRaid: obj.foundInRaid || false,
        };
      }

      // findQuestItem: questItem は ID 文字列
      if (obj.questItem) {
        const qi = questItemsMap[obj.questItem] || {};
        return {
          ...base,
          questItem: { id: obj.questItem, name: qi.name || obj.questItem, shortName: qi.shortName || '' },
          count: obj.count || 1,
        };
      }

      // kill / shoot: JSON API は targetNames 配列を使用
      if (obj.type === 'kill' || obj.type === 'shoot') {
        return {
          ...base,
          target: (obj.targetNames && obj.targetNames[0]) || obj.target || '',
          count: obj.count || 1,
          distance: obj.distance || null,
          bodyParts: obj.bodyParts || [],
        };
      }

      // mark: JSON API は markerItem が ID 文字列
      if (obj.type === 'mark' && obj.markerItem) {
        return {
          ...base,
          markerItem: _makeItemRef(obj.markerItem, itemsMap),
        };
      }

      return base;
    });

    return {
      id: task.id,
      name: task.name || '',
      wikiLink: task.wikiLink || '',
      trader: { id: task.trader, name: TRADER_NAMES[task.trader] || task.trader },
      minPlayerLevel: task.minPlayerLevel || 0,
      taskRequirements: (task.taskRequirements || []).map(r => ({
        task: { id: r.task, name: taskNameMap[r.task] || '' },
        status: r.status || [],
      })),
      objectives,
      finishRewards: {
        traderStanding: (task.finishRewards?.traderStanding || []).map(s => ({
          trader: { name: TRADER_NAMES[s.trader] || s.trader },
          standing: s.standing || 0,
        })),
        items: (task.finishRewards?.items || []).map(ri => ({
          item: _makeItemRef(ri.item, itemsMap),
          count: ri.count || 1,
        })),
        offerUnlock: (task.finishRewards?.offerUnlock || []).map(o => ({
          trader: { name: TRADER_NAMES[o.trader] || o.trader },
          level: o.level || 1,
          item: _makeItemRef(o.item, itemsMap),
        })),
      },
      experience: task.experience || 0,
    };
  });

  return { tasks };
}

function _transformHideout(data, itemsMap) {
  // ステーションID → name の解決マップ
  const stationNameMap = {};
  Object.values(data || {}).forEach(s => {
    stationNameMap[s.id] = s.name || _slugToTitle(s.normalizedName) || s.id;
  });

  const hideoutStations = Object.values(data || {}).map(station => ({
    id: station.id,
    name: station.name || _slugToTitle(station.normalizedName) || station.id,
    levels: (station.levels || []).map(lv => ({
      level: lv.level,
      itemRequirements: (lv.itemRequirements || []).map(req => ({
        item: _makeItemRef(req.item, itemsMap),
        count: req.count || 1,
      })),
      stationLevelRequirements: (lv.stationLevelRequirements || []).map(req => ({
        station: { id: req.station, name: stationNameMap[req.station] || req.station },
        level: req.level,
      })),
    })),
  }));
  return { hideoutStations };
}

function _transformBarters(data, itemsMap) {
  const barters = Object.values(data || {}).map(b => ({
    trader: { id: b.trader, name: TRADER_NAMES[b.trader] || b.trader },
    level: b.minTraderLevel || 1,
    requiredItems: (b.requiredItems || []).map(ri => ({
      item: _makeItemRef(ri.item, itemsMap),
      count: ri.count || 1,
    })),
    rewardItems: b.offeredItem
      ? [{ item: _makeItemRef(b.offeredItem.item, itemsMap), count: b.offeredItem.count || 1 }]
      : [],
  }));
  return { barters };
}

function _transformCrafts(data, itemsMap, stationsMap) {
  const crafts = Object.values(data || {}).map(c => {
    const st = stationsMap[c.station] || {};
    const stName = st.name || _slugToTitle(st.normalizedName) || c.station || '';
    return {
      station: { id: c.station, name: stName },
      level: c.level || 1,
      duration: c.duration || 0,
      requiredItems: (c.requiredItems || []).map(ri => ({
        item: _makeItemRef(ri.item, itemsMap),
        count: ri.count || 1,
      })),
      rewardItems: c.productItem
        ? [{ item: { ..._makeItemRef(c.productItem.item, itemsMap), categories: [] }, count: c.productItem.count || 1 }]
        : [],
    };
  });
  return { crafts };
}

// ── クエリ解析ヘルパー ─────────────────────────────────────────────

function _detectQueryType(query) {
  return query.match(/\{\s*(\w+)\s*[\(\{]/)?.[1] || '';
}

function _detectGameMode(query) {
  // GraphQL クエリの gameMode: pvp/pve を JSON API の regular/pve にマップ
  const gm = query.match(/gameMode:\s*(\w+)/)?.[1] || 'regular';
  return gm === 'pve' ? 'pve' : 'regular';
}

function _detectLang(query) {
  return query.match(/\blang:\s*(\w+)/)?.[1] || 'ja';
}

// ── JSON API フォールバック本体 ────────────────────────────────────

async function fetchJsonApiFallback(query) {
  // ammoPacks / armorPlates / weapons / weaponMods は fallback 中は空表示で許容
  if (/type:\s*ammoBox|type:\s*armorPlate|types:\s*\[gun|types:\s*\[mods/.test(query)) {
    return { items: [] };
  }

  const type = _detectQueryType(query);
  const jMode = _detectGameMode(query);
  const lang = _detectLang(query);

  switch (type) {
    case 'traders': {
      const data = await _fetchTranslated(jMode, 'traders', lang);
      return _transformTraders(data);
    }

    case 'items': {
      const data = await _fetchTranslated(jMode, 'items', lang);
      return _transformItems(data);
    }

    case 'hideoutStations': {
      const [data, itemsMap] = await Promise.all([
        _fetchTranslated(jMode, 'hideout', lang),
        _getItemsMap(jMode, lang),
      ]);
      return _transformHideout(data, itemsMap);
    }

    case 'barters': {
      const [bartersData, itemsMap] = await Promise.all([
        _fetchJson(`${JSON_API_BASE}/${jMode}/barters`).then(r => r.data),
        _getItemsMap(jMode, lang),
      ]);
      return _transformBarters(bartersData, itemsMap);
    }

    case 'crafts': {
      const [craftsData, itemsMap, hideoutData] = await Promise.all([
        _fetchJson(`${JSON_API_BASE}/${jMode}/crafts`).then(r => r.data),
        _getItemsMap(jMode, lang),
        _fetchTranslated(jMode, 'hideout', lang),
      ]);
      const stationsMap = {};
      Object.values(hideoutData || {}).forEach(s => { stationsMap[s.id] = s; });
      return _transformCrafts(craftsData, itemsMap, stationsMap);
    }

    case 'tasks': {
      const [data, itemsMap, mapsLocale] = await Promise.all([
        _fetchTranslated(jMode, 'tasks', lang),
        _getItemsMap(jMode, lang),
        _getMapsLocale(jMode, lang),
      ]);
      return _transformTasks(data, itemsMap, mapsLocale);
    }

    case 'ammo':
      return { ammo: [] };

    default:
      throw new Error(`JSON API fallback: unsupported query type "${type}"`);
  }
}

// ── メイン fetchGraphQL ──────────────────────────────────────────

async function fetchGraphQL(query) {
  let graphqlErr;
  try {
    const res = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.errors) throw new Error(json.errors[0].message);
    if (!json.data) throw new Error('no data in response');
    return json.data;
  } catch (err) {
    graphqlErr = err;
  }
  // GraphQL 失敗 → JSON API フォールバック
  console.warn('[EFT] GraphQL failed, using JSON API fallback:', graphqlErr.message);
  _fallbackUsed = true;
  try {
    return await fetchJsonApiFallback(query);
  } catch (fallbackErr) {
    throw new Error(`GraphQL: ${graphqlErr.message} / JSON API: ${fallbackErr.message}`);
  }
}
