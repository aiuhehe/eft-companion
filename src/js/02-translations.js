// ================== OBJECTIVE TRANSLATION ==================
// APIの英語オブジェクティブ説明を日本語化
function translateObjective(desc) {
  if (!desc) return desc;
  let s = desc;
  // 一般パターン置換
  const rules = [
    [/Find (\d+) (.+?) in raid/i,         (_, n, item) => `レイド内で「${item}」を${n}個見つける`],
    [/Hand over (\d+) (.+?) to (.+)/i,    (_, n, item, trader) => `${trader}に「${item}」を${n}個渡す`],
    [/Hand over (.+?) to (.+)/i,          (_, item, trader) => `${trader}に「${item}」を渡す`],
    [/Locate (.+?) on (.+)/i,             (_, target, map) => `${map}で${target}の場所を特定する`],
    [/Mark (.+?) with .+/i,               (_, target) => `${target}にマーカーを設置する`],
    [/Kill (\d+) (.+)/i,                  (_, n, target) => `${target}を${n}体倒す`],
    [/Eliminate (\d+) (.+)/i,             (_, n, target) => `${target}を${n}体倒す`],
    [/Survive and extract from (.+)/i,    (_, map) => `${map}から生き残って脱出する`],
    [/Extract from (.+)/i,                (_, map) => `${map}から脱出する`],
    [/Reach level (\d+)/i,                (_, n) => `プレイヤーレベル${n}に到達する`],
    [/Visit (.+)/i,                       (_, loc) => `${loc}を訪れる`],
    [/Place (.+?) in (.+)/i,              (_, item, loc) => `${loc}に「${item}」を設置する`],
    [/Pick up (.+)/i,                     (_, item) => `「${item}」を拾う`],
    [/Obtain (.+)/i,                      (_, item) => `「${item}」を入手する`],
    [/Complete the task (.+)/i,           (_, t) => `タスク「${t}」を完了する`],
    [/Plant (.+?) at (.+)/i,              (_, item, loc) => `${loc}に「${item}」を設置する`],
    [/Stash (.+?) at (.+)/i,              (_, item, loc) => `${loc}に「${item}」を隠す`],
    [/Mount (.+)/i,                       (_, item) => `「${item}」を取り付ける`],
  ];
  for (const [re, fn] of rules) {
    const m = s.match(re);
    if (m) return fn(...m);
  }
  return s; // 翻訳できなければ原文のまま
}

// objectiveのtypeを日本語ラベルとIconコンポーネント名に変換
function getObjTypeLabel(type) {
  switch (type) {
    case 'findItem':      return { iconName: 'search',      label: '見つける' };
    case 'giveItem':      return { iconName: 'package',     label: '納品' };
    case 'findQuestItem': return { iconName: 'search',      label: '手に入れる' };
    case 'mark':          return { iconName: 'download',    label: 'マーク' };
    case 'shoot':
    case 'kill':          return { iconName: 'skull',       label: 'キル' };
    case 'extract':       return { iconName: 'arrow-right', label: '脱出・生還' };
    case 'taskStatus':    return { iconName: 'list-check',  label: 'タスク条件' };
    case 'buildItem':     return { iconName: 'tool',        label: '作成' };
    case 'plantItem':     return { iconName: 'download',    label: '設置' };
    case 'locate':
    case 'visit':         return { iconName: 'search',      label: '調査・特定' };
    case 'experience':    return { iconName: 'star',        label: 'レベル' };
    default:              return { iconName: 'arrow-right', label: '' };
  }
}

// タスク種別フィルター定義：value → { label, types(マッチ対象のobjective type群) }
// タスクは複数objectiveを持つので「指定typeを1つ以上含む」タスクにマッチさせる
const TASK_TYPE_FILTERS = [
  { value: 'all',       label: '全種類',       types: null },
  { value: 'kill',      label: 'キル',         types: ['kill', 'shoot'] },
  { value: 'giveItem',  label: '納品',         types: ['giveItem'] },
  { value: 'findItem',  label: '回収・収集',    types: ['findItem', 'findQuestItem'] },
  { value: 'mark',      label: 'マーク設置',    types: ['mark'] },
  { value: 'plantItem', label: '設置',         types: ['plantItem'] },
  { value: 'extract',   label: '脱出・生還',    types: ['extract'] },
  { value: 'buildItem', label: '作成',         types: ['buildItem'] },
];

// タスクが指定フィルター値の種別objectiveを含むか
function taskMatchesType(task, filterValue) {
  if (filterValue === 'all') return true;
  const def = TASK_TYPE_FILTERS.find(f => f.value === filterValue);
  if (!def || !def.types) return true;
  return (task.objectives || []).some(o => def.types.includes(o.type));
}

