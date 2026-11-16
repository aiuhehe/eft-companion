// ── Discord 出撃共有: 合算ロジック（仲間の目標）── Bot の設計書 §7.1・§7.2・§8 / docs/Discord出撃共有Bot設計書.md §11.4
// ボードの参加者の共有データ（buildRaidShareData の形）を、マップごとに「同じ目標」をまとめて数える。
// Bot の src/aggregate.ts（BOT-5）と同じルール。コードは共有せず、仕様と Bot のテスト（test/aggregate.test.ts）の例でそろえる。
//
// - 対象マップの目標 = maps にそのマップを含む目標 ＋ maps が空の目標（設置・持ち込みを除く）。done:false だけ
// - 撃破は合計しない。キルはパーティーで共有されるので、各自の残りのうち一番多い数を倒せば全員が終わる
// - 2人以上が持つ目標は「共通」。どのマップでもよい目標は共通欄に入れず、末尾にまとめる
//
// members は参加順の [{ userId, colorIdx, share }]（share が null の人は無視）。DOM にも API にも触らない純粋な関数だけを置く。

/** 表示の欄。kill = 撃破 / items = 収集・持ち込み / other = 設置・調査・脱出 */
function raidGoalGroupOf(cat) {
  if (cat === 'kill') return 'kill';
  if (cat === 'bring' || cat === 'collect') return 'items';
  return 'other';
}

/**
 * 「同じ目標」とみなすキー（§8.1）
 * bring / collect（アイテム）: cat + itemId + fir ／（カテゴリ指定）: cat + categoryName + fir ／ クエストアイテム: 目標 id
 * kill: label + detail + 固有／どこでも ／ place / extract / locate: 目標 id
 * custom:true のタスクの目標は id で突き合わせない（その人だけのキー）
 */
function raidGoalKey(userId, task, o) {
  const fir = o.fir ? '1' : '0';
  if ((o.cat === 'bring' || o.cat === 'collect') && !o.questItem) {
    if (o.itemId) return JSON.stringify([o.cat, 'item', o.itemId, fir]);
    if (o.categoryName) return JSON.stringify([o.cat, 'category', o.categoryName, fir]);
  }
  if (o.cat === 'kill') {
    return JSON.stringify(['kill', o.label, o.detail ?? '', o.maps.length ? 'map' : 'any']);
  }
  if (task.custom) return JSON.stringify(['custom', userId, task.id, o.id]);
  return JSON.stringify(['id', o.id]);
}

/** maps が空の目標を「どのマップでもOK」に出すか。設置（場所が決まらない）と持ち込み（買えば済む納品など）は出さない */
const isRaidAnyMapTarget = (o) => o.cat !== 'place' && o.cat !== 'bring';

/** その目標がマップ map の対象か */
function isRaidTargetOn(o, map) {
  if (o.done) return false;
  if (o.maps.length === 0) return isRaidAnyMapTarget(o);
  return o.maps.includes(map);
}

/** 参加者の未チェックの目標を並べ、キーを1回だけ作る */
function _raidAllEntries(members) {
  const out = [];
  for (const member of members) {
    if (!member.share || !Array.isArray(member.share.tasks)) continue;
    for (const task of member.share.tasks) {
      for (const objective of task.objectives || []) {
        if (objective.done) continue;
        out.push({ member, task, objective, key: raidGoalKey(member.userId, task, objective) });
      }
    }
  }
  return out;
}

/**
 * 同じキーの目標を1行にまとめる。行は { key, cat, group, label, detail?, fir, questItem, itemId?, categoryName?, taskName, count, anyMap, members:[{userId,colorIdx,remaining}], common, entries }
 * entries（アプリだけ・Bot の Goal には無い）= まとめる前の目標 [{ userId, colorIdx, taskId, taskName, trader, custom, objId }]。
 * 出撃準備タブが自分の API データ（タスク・目標）と突き合わせて、自分の目標と同じ見た目で出すのに使う
 */
function _raidBuildGoals(entries) {
  const goals = new Map();
  for (const { member, task, objective: o, key } of entries) {
    let g = goals.get(key);
    if (!g) {
      g = {
        key,
        cat: o.cat,
        group: raidGoalGroupOf(o.cat),
        label: o.label,
        ...(o.detail !== undefined ? { detail: o.detail } : {}),
        fir: !!o.fir,
        questItem: !!o.questItem,
        // アプリだけで使う（アイテムアイコンを出すため）。Bot の Goal には無い
        ...(o.itemId ? { itemId: o.itemId } : {}),
        ...(o.categoryName ? { categoryName: o.categoryName } : {}),
        taskName: task.name,
        count: null,
        anyMap: o.maps.length === 0,
        members: [],
        common: false,
        entries: [],
        required: new Set(),
      };
      goals.set(key, g);
    }
    g.entries.push({ userId: member.userId, colorIdx: member.colorIdx, taskId: task.id, taskName: task.name, trader: task.trader || '', custom: !!task.custom, objId: o.id });
    g.required.add(o.count);
    const mine = g.members.find(m => m.userId === member.userId);
    if (!mine) {
      g.members.push({ userId: member.userId, colorIdx: member.colorIdx, remaining: o.count });
    } else if (o.cat === 'kill') {
      // 同じ人の複数のタスクが同じ撃破を求めていても、1回のキルで両方が進むので大きいほうだけ
      mine.remaining = Math.max(mine.remaining, o.count);
    } else {
      // アイテムはタスクごとに納品するので、同じ人の分は足す
      mine.remaining += o.count;
    }
  }
  return [...goals.values()].map(({ required, ...g }) => {
    g.common = g.members.length >= 2;
    g.count = g.cat === 'kill' ? Math.max(...g.members.map(m => m.remaining)) : required.size === 1 ? [...required][0] : null;
    return g;
  });
}

/** 共通の目標が先・持っている人が多い順（同じなら最初に共有された順） */
function _raidSortGoals(goals) {
  return goals
    .map((g, i) => ({ g, i }))
    .sort((a, b) => b.g.members.length - a.g.members.length || a.i - b.i)
    .map(({ g }) => g);
}

/** そのマップに対象の目標を持つタスクのうち、2人以上が同じタスク ID（custom:false）を進めているもの（§8.2） */
function _raidBuildCommonTasks(entries) {
  const tasks = new Map();
  for (const { member, task } of entries) {
    if (task.custom) continue;
    let t = tasks.get(task.id);
    if (!t) {
      t = { taskId: task.id, name: task.name, members: [] };
      tasks.set(task.id, t);
    }
    if (!t.members.some(m => m.userId === member.userId)) {
      t.members.push({ userId: member.userId, colorIdx: member.colorIdx });
    }
  }
  return [...tasks.values()].filter(t => t.members.length >= 2);
}

/** マップ表示（§7.2）: { map, common, commonTasks, kill, items, other, anyMap } */
function aggregateRaidMap(members, map) {
  const entries = _raidAllEntries(members).filter(e => isRaidTargetOn(e.objective, map));
  const goals = _raidSortGoals(_raidBuildGoals(entries));
  const specific = goals.filter(g => !g.anyMap);
  const rest = specific.filter(g => !g.common);
  return {
    map,
    common: specific.filter(g => g.common),
    // 「どのマップでもよい」だけで重なっているタスクは共通欄に出さない
    commonTasks: _raidBuildCommonTasks(entries.filter(e => e.objective.maps.length > 0)),
    kill: rest.filter(g => g.group === 'kill'),
    items: rest.filter(g => g.group === 'items'),
    other: rest.filter(g => g.group === 'other'),
    anyMap: goals.filter(g => g.anyMap),
  };
}

/**
 * マップ別の目標一覧（§7.1）: { maps: [{ map, members, goals, common, total }], anyMap: { total, kill, items, other } }
 * 並び: 未チェックの固有目標がある参加者の数 → 共通目標の数 → 固有目標の合計数（多い順）。同点は RAID_MAPS の順。
 * 固有目標が無いマップは出さない
 */
function aggregateRaidOverview(members) {
  const entries = _raidAllEntries(members);
  const maps = [];
  for (const map of RAID_MAPS) {
    const specificEntries = entries.filter(e => e.objective.maps.includes(map));
    if (!specificEntries.length) continue;
    const goals = _raidBuildGoals(specificEntries);
    const memberIds = new Set(specificEntries.map(e => e.member.userId));
    maps.push({
      map,
      members: members.filter(m => memberIds.has(m.userId)).map(({ userId, colorIdx }) => ({ userId, colorIdx })),
      goals: goals.length,
      common: goals.filter(g => g.common).length + _raidBuildCommonTasks(specificEntries).length,
      // アプリだけ（Bot には無い）: 共通のタスクを数えない共通の目標の数。アプリは共通のタスクの行を出さないので、件数表示はこちら
      commonGoals: goals.filter(g => g.common).length,
      total: specificEntries.length,
    });
  }
  const order = (m) => RAID_MAPS.indexOf(m);
  maps.sort((a, b) =>
    b.members.length - a.members.length || b.common - a.common || b.total - a.total || order(a.map) - order(b.map));
  const anyMapGoals = _raidBuildGoals(entries.filter(e => e.objective.maps.length === 0 && isRaidAnyMapTarget(e.objective)));
  const count = (group) => anyMapGoals.filter(g => g.group === group).length;
  return {
    maps,
    anyMap: { total: anyMapGoals.length, kill: count('kill'), items: count('items'), other: count('other') },
  };
}
