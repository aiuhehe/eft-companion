// ================== MANUAL UNLOCKS (手動登録) ==================
// PvP/PvEは共通グローバルキー（eft_manual_unlocks_v1）。
// Seasonは初回は PvP/PvEデータを継承し、最初の書き込み時に Season専用キーを作成する（コピーオンライト）。

const MANUAL_UNLOCKS_BASE_KEY = 'eft_manual_unlocks_v1';

function getManualUnlocksKey() {
  const mode = getActiveMode();
  if (mode && mode.startsWith('season_')) return `${MANUAL_UNLOCKS_BASE_KEY}__${mode}`;
  return MANUAL_UNLOCKS_BASE_KEY; // pvp も pve も同じグローバルキー
}

function loadManualUnlocks() {
  const mode = getActiveMode();
  if (mode && mode.startsWith('season_')) {
    const seasonKey = `${MANUAL_UNLOCKS_BASE_KEY}__${mode}`;
    const seasonData = localStorage.getItem(seasonKey);
    if (seasonData !== null) {
      try { return JSON.parse(seasonData) || []; } catch {}
    }
    // Season独自データなし → PvP/PvEグローバルデータを継承（読み取り専用・保存時に専用キーが作られる）
  }
  try { return JSON.parse(localStorage.getItem(MANUAL_UNLOCKS_BASE_KEY)) || []; } catch { return []; }
}

function saveManualUnlocks(entries) {
  localStorage.setItem(getManualUnlocksKey(), JSON.stringify(entries));
}

// SeasonモードがPvP/PvEデータを継承中（まだ独自データを書いていない）かどうか
function isManualUnlocksInherited() {
  const mode = getActiveMode();
  if (!mode || !mode.startsWith('season_')) return false;
  return localStorage.getItem(`${MANUAL_UNLOCKS_BASE_KEY}__${mode}`) === null;
}
