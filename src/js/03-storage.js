// ================== STORAGE ==================
const LS_KEY = 'eft_tool_v2';

// ================== MODE SYSTEM ==================
const MODE_META_KEY   = 'eft_active_mode';
const SEASONS_META_KEY = 'eft_seasons';
// ネームスペース化対象のキー一覧（モードごとに独立保存）
const NAMESPACED_KEYS = ['eft_tool_v2', 'eft_task_tabs_v1', 'eft_task_tags_v1', 'eft_journal_v1', 'eft_plan_v1'];

/** 現在アクティブなモード文字列を返す（例: 'pvp', 'pve', 'season_1'） */
function getActiveMode() {
  return localStorage.getItem(MODE_META_KEY) || 'pvp';
}

/** baseKey にモードサフィックスを付けて返す（例: 'eft_plan_v1__pvp'） */
function modeKey(baseKey) {
  return baseKey + '__' + getActiveMode();
}

/** シーズン一覧を返す（例: ['season_1', 'season_2']） */
function getSeasons() {
  try { return JSON.parse(localStorage.getItem(SEASONS_META_KEY)) || []; } catch { return []; }
}

/** シーズン一覧を保存する */
function saveSeasons(seasons) {
  localStorage.setItem(SEASONS_META_KEY, JSON.stringify(seasons));
}

/**
 * 初回起動時のマイグレーション。
 * eft_active_mode が未設定の場合、既存データを __pvp キーに複製してモードを pvp に設定する。
 */
function initModeSystem() {
  if (localStorage.getItem(MODE_META_KEY)) return; // 既に初期化済み
  NAMESPACED_KEYS.forEach(key => {
    const data = localStorage.getItem(key);
    if (data) localStorage.setItem(key + '__pvp', data);
  });
  localStorage.setItem(MODE_META_KEY, 'pvp');
}

/** モードを切り替えてページをリロードする */
function switchMode(mode) {
  localStorage.setItem(MODE_META_KEY, mode);
  window.location.reload();
}

/** 新しいシーズンを追加してそのモードに切り替える */
function addNewSeason() {
  const seasons = getSeasons();
  const next = seasons.length + 1;
  const id = 'season_' + next;
  saveSeasons([...seasons, id]);
  switchMode(id);
}

/** シーズンモード（'season_N'）かどうか */
function isSeasonMode(mode) {
  return /^season_\d+$/.test(mode);
}

/** モード id を表示ラベルに変換する */
function getModeLabel(mode) {
  if (mode === 'pvp') return 'PvP';
  if (mode === 'pve') return 'PvE';
  const m = mode.match(/^season_(\d+)$/);
  if (m) return 'Season ' + m[1];
  return mode;
}

// ==========================================

function loadState() {
  try { return JSON.parse(localStorage.getItem(modeKey(LS_KEY))) || {}; } catch { return {}; }
}
function saveState(s) {
  localStorage.setItem(modeKey(LS_KEY), JSON.stringify(s));
}

// ================== FULL BACKUP ==================
// 全モード・全グローバルの eft_* キーを1つのJSONに書き出す / 復元する
const BACKUP_KEY_PREFIX = 'eft_';
const BACKUP_TYPE = 'eft-tool-full-backup';
const BACKUP_VERSION = 1;

/** バックアップ対象の localStorage キー一覧（eft_ で始まるもの全て） */
function getBackupKeys() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(BACKUP_KEY_PREFIX)) keys.push(k);
  }
  return keys.sort();
}

/** バックアップ対象データの合計サイズ（文字数。主要ブラウザの上限は約500万文字） */
function getBackupSizeChars() {
  return getBackupKeys().reduce((sum, k) => sum + (k.length + (localStorage.getItem(k) || '').length), 0);
}

/** 全データ（localStorage＋差し替えマップ画像）を eft_backup_YYYY-MM-DD.json としてダウンロード */
async function exportAllData() {
  const data = {};
  getBackupKeys().forEach(k => { data[k] = localStorage.getItem(k); });
  const mapOverrides = {};
  try {
    const all = await mediaGetAllMapOverrides();
    for (const [name, blob] of Object.entries(all)) mapOverrides[name] = await blobToDataUrl(blob);
  } catch (e) { console.warn('[EFT] マップ画像の書き出しをスキップ:', e); }
  const backup = { type: BACKUP_TYPE, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), data, media: { mapOverrides } };
  const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `eft_backup_${new Date().toISOString().slice(0, 10)}.json`; a.click();
  URL.revokeObjectURL(url);
}

/**
 * バックアップJSONで全データを置き換える（既存の eft_* キーは全削除してから書き込む）。
 * 成功時 true。呼び出し側でリロードすること。
 */
function restoreAllData(backup) {
  if (!backup || backup.type !== BACKUP_TYPE || typeof backup.data !== 'object' || !backup.data) {
    throw new Error('バックアップファイルの形式ではありません');
  }
  const entries = Object.entries(backup.data).filter(([k, v]) => k.startsWith(BACKUP_KEY_PREFIX) && typeof v === 'string');
  // 書き込み失敗（容量超過等）に備えて現データを退避し、失敗時は元に戻す
  const prev = getBackupKeys().map(k => [k, localStorage.getItem(k)]);
  try {
    prev.forEach(([k]) => localStorage.removeItem(k));
    entries.forEach(([k, v]) => localStorage.setItem(k, v));
  } catch (e) {
    getBackupKeys().forEach(k => localStorage.removeItem(k));
    prev.forEach(([k, v]) => localStorage.setItem(k, v));
    throw e;
  }
  return true;
}

/**
 * バックアップ内の差し替えマップ画像を IndexedDB に復元する（media が無い旧バックアップでは何もしない）。
 * localStorage の復元後に呼ぶ。
 */
async function restoreMediaFromBackup(backup) {
  const overrides = backup?.media?.mapOverrides;
  if (!overrides || typeof overrides !== 'object') return;
  await mediaClearMapOverrides();
  for (const [name, dataUrl] of Object.entries(overrides)) {
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) continue;
    await mediaPutMapOverride(name, await (await fetch(dataUrl)).blob());
  }
}

// ================== MEDIA (IndexedDB) ==================
// localStorage に入らない大きな画像（利用者が差し替えたマップ画像）を保存する。
// DB: eft_media / store: mapOverrides（key = マップ名, value = 画像Blob）
const MEDIA_DB_NAME = 'eft_media';
const MEDIA_MAP_STORE = 'mapOverrides';

function _openMediaDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(MEDIA_DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(MEDIA_MAP_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function _mediaTx(mode, fn) {
  const db = await _openMediaDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MEDIA_MAP_STORE, mode);
    const result = fn(tx.objectStore(MEDIA_MAP_STORE));
    tx.oncomplete = () => { db.close(); resolve(result); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

/** { [mapName]: Blob } */
async function mediaGetAllMapOverrides() {
  const out = {};
  await _mediaTx('readonly', store => {
    store.openCursor().onsuccess = e => {
      const cur = e.target.result;
      if (cur) { out[cur.key] = cur.value; cur.continue(); }
    };
  });
  return out;
}
function mediaPutMapOverride(mapName, blob) { return _mediaTx('readwrite', store => { store.put(blob, mapName); }); }
function mediaDeleteMapOverride(mapName)    { return _mediaTx('readwrite', store => { store.delete(mapName); }); }
function mediaClearMapOverrides()           { return _mediaTx('readwrite', store => { store.clear(); }); }

// ── マップ名の改名に伴う保存データの移行（起動時に毎回呼ぶ・冪等） ──
// 2026-11-11: マップタブの 'Labyrinth' を tarkov.dev と同じ 'The Labyrinth' に改名（RAID_MAP_ALIASES）。
// 旧名のピン（eft_task_pins_v1）・画像メタ（eft_maps_v1）・差し替え画像（IndexedDB）を新しい名前へ移す。
// 旧バックアップを復元した場合もリロード後にここを通る。
function migrateMapNameKeys() {
  try {
    const pins = JSON.parse(localStorage.getItem('eft_task_pins_v1') || 'null');
    if (Array.isArray(pins) && pins.some(p => RAID_MAP_ALIASES[p?.mapName])) {
      localStorage.setItem('eft_task_pins_v1', JSON.stringify(
        pins.map(p => RAID_MAP_ALIASES[p?.mapName] ? { ...p, mapName: RAID_MAP_ALIASES[p.mapName] } : p)));
    }
    const maps = JSON.parse(localStorage.getItem('eft_maps_v1') || 'null');
    if (maps && typeof maps === 'object' && Object.keys(maps).some(k => RAID_MAP_ALIASES[k])) {
      const next = {};
      for (const [k, v] of Object.entries(maps)) {
        const nk = RAID_MAP_ALIASES[k] || k;
        if (!(nk in next) || nk === k) next[nk] = v;
      }
      localStorage.setItem('eft_maps_v1', JSON.stringify(next));
    }
  } catch (e) { console.warn('[EFT] マップ名の移行に失敗:', e); }
}

/** 差し替え画像（IndexedDB）の旧マップ名キーを新しい名前へ移す。新しい名前が既にあれば旧キーを消すだけ */
async function migrateMapOverrideNames() {
  const all = await mediaGetAllMapOverrides();
  for (const [oldName, blob] of Object.entries(all)) {
    const newName = RAID_MAP_ALIASES[oldName];
    if (!newName) continue;
    if (!all[newName]) await mediaPutMapOverride(newName, blob);
    await mediaDeleteMapOverride(oldName);
  }
}

// ── 訳文になっていた目標IDの移行（Issue #45・起動時に API 読み込み後に呼ぶ・冪等） ──
// 修正前の JSON API フォールバックは目標 id を訳文に書き換えていたため、出撃準備タブのチェック
// （eft_raid_obj_checked_v1__*・全モード）とマップピン（eft_task_pins_v1 の objectiveId）が訳文をキーに保存されている。
// API タスク（ID が24桁hex）なのに目標キーが24桁hexでないものを、fetchObjectiveTextIndex の索引で本来の ID に置き換える。
// 同じタスク内で訳文が重複する目標（例:「アイテム を渡す」が3つ）は、修正前はチェックも共有されていたので
//   チェック → 該当する目標すべてをチェック済みにする（見た目を修正前と同じに保つ）
//   ピン     → 並び順で最初の目標に付ける（ピンは複製しない）
// 索引に無い訳文（API から消えた目標など）はそのまま残す。
const _HEX24_RE = /^[0-9a-f]{24}$/;
const _isTranslatedObjKey = (taskId, key) => _HEX24_RE.test(taskId || '') && !!key && !_HEX24_RE.test(key);

function _raidObjCheckedStorageKeys() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('eft_raid_obj_checked_v1__')) keys.push(k);
  }
  return keys;
}

/** 移行が必要な保存データ（訳文キーのチェック・ピン）があるか。無ければ索引の取得自体を省く */
function needsObjectiveIdMigration() {
  try {
    const pins = JSON.parse(localStorage.getItem('eft_task_pins_v1') || 'null');
    if (Array.isArray(pins) && pins.some(p => _isTranslatedObjKey(p?.taskId, p?.objectiveId))) return true;
    return _raidObjCheckedStorageKeys().some(lsKey => {
      const checked = JSON.parse(localStorage.getItem(lsKey) || 'null');
      return checked && typeof checked === 'object' &&
        Object.entries(checked).some(([taskId, tc]) => tc && Object.keys(tc).some(k => _isTranslatedObjKey(taskId, k)));
    });
  } catch { return false; }
}

/** index = fetchObjectiveTextIndex() の戻り値。戻り値: { pins: 移行したピン数, checks: 移行したチェック数 } */
function migrateTranslatedObjectiveIds(index) {
  const result = { pins: 0, checks: 0 };
  if (!index) return result;
  try {
    const pins = JSON.parse(localStorage.getItem('eft_task_pins_v1') || 'null');
    if (Array.isArray(pins)) {
      const next = pins.map(p => {
        if (!_isTranslatedObjKey(p?.taskId, p?.objectiveId)) return p;
        const ids = index[p.taskId]?.[p.objectiveId];
        if (!ids?.length) return p;
        result.pins++;
        return { ...p, objectiveId: ids[0] };
      });
      if (result.pins) localStorage.setItem('eft_task_pins_v1', JSON.stringify(next));
    }
    for (const lsKey of _raidObjCheckedStorageKeys()) {
      const checked = JSON.parse(localStorage.getItem(lsKey) || 'null');
      if (!checked || typeof checked !== 'object') continue;
      let changed = false;
      const next = {};
      for (const [taskId, tc] of Object.entries(checked)) {
        if (!tc || typeof tc !== 'object') { next[taskId] = tc; continue; }
        const ntc = {};
        for (const [k, v] of Object.entries(tc)) {
          const ids = _isTranslatedObjKey(taskId, k) ? index[taskId]?.[k] : null;
          if (!ids?.length) { ntc[k] = ntc[k] || v; continue; }
          ids.forEach(id => { ntc[id] = ntc[id] || v; });
          changed = true;
          result.checks++;
        }
        next[taskId] = ntc;
      }
      if (changed) localStorage.setItem(lsKey, JSON.stringify(next));
    }
  } catch (e) { console.warn('[EFT] 目標IDの移行に失敗:', e); }
  return result;
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}
