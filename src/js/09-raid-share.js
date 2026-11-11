// ── Discord 出撃共有: 共有データ形式 v1（docs/Discord出撃共有Bot設計書.md §4）──
// 自動送信・「送る内容を確認」（JSON 保存）で共通に使う。App の外の純粋関数。

const RAID_SHARE_VERSION = 1;

/** 撃破目標の補足（部位・距離）。例: "(head) <=50m" */
const _raidShareKillDetail = (obj) => {
  const parts = (obj.bodyParts || []).filter(Boolean);
  // 距離 0（JSON API は条件なしでも {value:0, compareMethod:'>='} を持つ）は書かない
  const dist = Number(obj.distance?.value) > 0 ? `${obj.distance.compareMethod || ''}${obj.distance.value}m` : '';
  return [parts.length ? `(${parts.join('/')})` : '', dist].filter(Boolean).join(' ');
};

/** 共有データの label（§4.2「label の決め方」）。空なら説明文などで埋める */
const _raidShareLabel = (obj, cat) => {
  const desc = obj.description || '';
  if (cat === 'bring' || cat === 'collect') {
    return obj.questItem?.name || obj.item?.name || obj.itemCategory?.name || desc;
  }
  if (cat === 'kill') return obj.target || desc;
  // place / extract / locate は説明文（無ければマーカー名）
  return desc || obj.markerItem?.name || obj.target || '';
};

/**
 * 進行中（ボード登録済み・未完了）のタスクから共有データ v1 を作る。全マップ分を一括。
 * 目標以外の個人データ・マップピンは含めない。値が無いキーは書き出さない。
 */
function buildRaidShareData({ tasks, customTasks, pinnedTaskIds, completedTaskIds, raidObjChecked, activeMode, gameMode, uiLang, playerLevel }) {
  const pinned = new Set(pinnedTaskIds || []);
  const completed = new Set(completedTaskIds || []);
  const customIds = new Set((customTasks || []).map(t => t.id));
  const allTasks = [...(tasks || []), ...(customTasks || [])];

  const outTasks = [];
  for (const task of allTasks) {
    if (!pinned.has(task.id) || completed.has(task.id)) continue;

    // 出撃準備タブと同じ分類。分類できない目標（スキル・トレーダー LL など）は除く
    const entries = (task.objectives || [])
      .map(obj => ({ obj, cat: classifyRaidObj(obj.type, obj.foundInRaid) }))
      .filter(x => x.cat);

    // 同タスク内で同アイテムが collect と bring の両方にあれば bring を除く（出撃準備タブと同じ）
    const collectItemIds = new Set(entries.filter(x => x.cat === 'collect' && x.obj.item?.id).map(x => x.obj.item.id));
    const kept = entries.filter(x => x.cat !== 'bring' || !x.obj.item?.id || !collectItemIds.has(x.obj.item.id));

    const objectives = kept.map(({ obj, cat }) => {
      // 正規化済みのマップ名。マップ未指定は [] のまま（＝どのマップでもよい・出撃準備タブでもどのマップでも表示される）
      const maps = normalizeRaidMaps(obj.maps);
      const key = raidObjKey(task.id, obj);
      const label = _raidShareLabel(obj, cat);
      const o = {
        id: key,
        cat,
        label,
        count: Number(obj.count) > 0 ? Number(obj.count) : 1,
        maps,
        done: !!raidObjChecked?.[task.id]?.[key],
      };
      if (obj.foundInRaid && (cat === 'bring' || cat === 'collect')) o.fir = true;
      // カスタムタスクの仮アイテムID（custom_item_…）はアプリ内でしか通用しないので送らない
      const itemId = obj.item?.id;
      if (itemId && !String(itemId).startsWith('custom_item_')) o.itemId = itemId;
      if (!obj.item && obj.itemCategory?.name) o.categoryName = obj.itemCategory.name;
      if (obj.questItem) o.questItem = true;
      if (obj.description && obj.description !== label) o.desc = obj.description;
      if (cat === 'kill') {
        const detail = _raidShareKillDetail(obj);
        if (detail) o.detail = detail;
      }
      return o;
    });
    if (objectives.length === 0) continue;

    const t = {
      id: task.id,
      name: task.name || '',
      trader: (typeof task.trader === 'string' ? task.trader : task.trader?.name) || '',
      custom: customIds.has(task.id),
      objectives,
    };
    outTasks.push(t);
  }

  return {
    v: RAID_SHARE_VERSION,
    app: 'eft-tool',
    mode: activeMode,
    // loadAPIData と同じ判定（シーズンは設定のゲームモードに関わらず pvp-season）
    gameMode: isSeasonMode(activeMode) ? 'pvp-season' : gameMode === 'pve' ? 'pve' : 'regular',
    lang: uiLang === 'ja' ? 'ja' : 'en',
    level: Number(playerLevel) || 1,
    createdAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    tasks: outTasks,
  };
}

/** 「送る内容を確認」: 共有データを eft_raidshare_YYYY-MM-DD.json として保存 */
function downloadRaidShareData(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `eft_raidshare_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
