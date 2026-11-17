// ── Discord 出撃共有: マップピンの持ち寄り ── docs/Discord出撃共有Bot設計書.md §11.5・Issue #36
// 自分のピン（eft_task_pins_v1）を PUT /api/pins で Bot に預け、同じボードの参加者のピンを GET /api/boards/:id/pins で読む。
// ピンの持ち主は登録した本人だけ（他人のピンは書き換えない）。近い位置のピンは1つにまとめて出し、
// 仲間のピンは「自分のピンとして保存」で自分のピンにできる。他人のピンは自分の画面でだけ隠せる（eft_friend_pins_hidden_v1）。

const PINS_SYNC_DELAY_MS = 10 * 1000;   // 最後の変更から10秒待ってまとめて送る（再配置やメモの入力を1回にまとめる）
// Bot の上限（tarkov-raid-bot src/pins.ts）。送る前に同じ上限で止める（超えた分は送らない・メモは先頭だけ）
const PINS_MAX = 2000;
const PINS_MAX_MEMO = 50;
const PINS_MAX_ITEMS = 1;
const PINS_MAX_STR = 500;
/** 同じ目標のピンをまとめる距離（標準マップ画像の幅・高さに対する比率・仮） */
const FRIEND_PIN_MERGE_DIST = 0.02;
/** 隠した仲間のピン `["<userId>/<pinId>", …]`（グローバル・自分の画面だけ） */
const FRIEND_PINS_HIDDEN_KEY = 'eft_friend_pins_hidden_v1';

/** UTF-16 の文字数で切る（Bot と同じ数え方）。サロゲートペアの片割れは残さない */
const _cutStr = (s, n) => {
  s = String(s ?? '');
  if (s.length <= n) return s;
  const t = s.slice(0, n);
  return /[\uD800-\uDBFF]$/.test(t) ? t.slice(0, -1) : t;
};
const _ratio = (v) => Math.round(Math.min(1, Math.max(0, v)) * 1e5) / 1e5;

/**
 * 送るピン一式 { v:1, app:'eft-tool', pins }（Bot §11.5）。
 * 座標は標準マップ画像（eft_maps_v1 の幅・高さ）に対する比率。基準の無いマップ・RAID_MAPS に無いマップのピンは送らない。
 * 登録タスク品は名前と略称を付けて custom:true で送る（画像・メモ画像は送らない）。
 */
function buildPinsShareData(taskPins, mapImages, customItems) {
  const customById = new Map((customItems || []).map(c => [c.id, c]));
  const pins = [];
  for (const p of taskPins || []) {
    if (pins.length >= PINS_MAX) break;
    const mapName = normalizeRaidMapName(p.mapName);
    const meta = mapImages?.[p.mapName] || mapImages?.[mapName];
    if (!RAID_MAPS.includes(mapName) || !meta?.width || !meta?.height) continue;
    if (!p.id || !p.taskId || !p.objectiveId) continue;
    const x = Number(p.x) / meta.width, y = Number(p.y) / meta.height;
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const out = {
      id: _cutStr(p.id, PINS_MAX_STR), mapName,
      taskId: _cutStr(p.taskId, PINS_MAX_STR), objectiveId: _cutStr(p.objectiveId, PINS_MAX_STR),
      x: _ratio(x), y: _ratio(y),
    };
    const memo = _cutStr(String(p.memo || '').trim(), PINS_MAX_MEMO).trim();
    if (memo) out.memo = memo;
    const items = [];
    for (const it of p.requiredItems || []) {
      if (items.length >= PINS_MAX_ITEMS) break;
      const c = it?.custom ? customById.get(it.id) : null;
      const name = _cutStr(String(c?.name || it?.name || '').trim(), PINS_MAX_STR);
      if (!it?.id || !name) continue;
      const e = { id: _cutStr(it.id, PINS_MAX_STR), name };
      const shortName = String(c?.shortName ?? it.shortName ?? '').trim();
      if (shortName) e.shortName = _cutStr(shortName, PINS_MAX_STR);
      if (it.custom) e.custom = true;
      items.push(e);
    }
    if (items.length) out.requiredItems = items;
    pins.push(out);
  }
  return { v: 1, app: 'eft-tool', pins };
}

/** PUT /api/pins。戻り値は discordPutShare と同じ形 */
async function discordPutPins(botUrl, token, data) {
  let res;
  try {
    res = await fetch(`${botUrl}/api/pins`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
  } catch { return { status: 'network' }; }
  if (res.ok) return { status: 'ok' };
  if (res.status === 401) return { status: 'unauthorized' };
  if (res.status === 413 || res.status === 422) return { status: 'outdated', httpStatus: res.status };
  if (res.status === 429) return { status: 'rate', retryAfter: _discordRetryAfter(res, await _readJson(res)) };
  return { status: 'error', httpStatus: res.status };
}

/** GET /api/boards/:id/pins。{ status:'ok', members } / { status:'unauthorized'|'forbidden'|'not_found'|'network'|'error' } */
async function discordGetBoardPins(botUrl, token, id) {
  let res;
  try {
    res = await fetch(`${botUrl}/api/boards/${encodeURIComponent(id)}/pins`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  } catch { return { status: 'network' }; }
  if (res.status === 401) return { status: 'unauthorized' };
  if (res.status === 403) return { status: 'forbidden' };
  if (res.status === 404) return { status: 'not_found' };
  if (!res.ok) return { status: 'error', httpStatus: res.status };
  const body = await _readJson(res);
  return body && Array.isArray(body.members) ? { status: 'ok', members: body.members } : { status: 'error', httpStatus: res.status };
}

/**
 * 自分のピンの自動送信（App の中で1回だけ呼ぶ）。連携中だけ、ピン一式が変わったら10秒後に PUT /api/pins で丸ごと送る。
 * 前回送った内容と同じなら送らない（eft_discord_link_v1 の lastPinsHash）。Bot はピンを期限で消さないので送り直しはしない。
 * 戻り値: { pinsMsg }（{ kind:'error'|'info', text } / null。マップタブに出す）
 */
function useDiscordPinSync(discord, pinsData) {
  const { link, updateLink } = discord;
  const [msg, setMsg] = useState(null);
  const hash = useMemo(() => _discordHash(JSON.stringify(pinsData)), [pinsData]);
  const latestRef = useRef({ pinsData, hash });
  latestRef.current = { pinsData, hash };
  const timerRef = useRef(null);
  const sendingRef = useRef(false);
  const waitUntilRef = useRef(0);
  const failedHashRef = useRef('');
  const sendRef = useRef(null);

  const schedule = (ms) => { clearTimeout(timerRef.current); timerRef.current = setTimeout(() => sendRef.current(), ms); };

  sendRef.current = async () => {
    clearTimeout(timerRef.current);
    if (sendingRef.current) { schedule(PINS_SYNC_DELAY_MS); return; }
    const cur = loadDiscordLink();
    if (!cur.token) return;
    const { pinsData: data, hash: h } = latestRef.current;
    if (cur.lastPinsHash === h || failedHashRef.current === h) return;
    const botUrl = getDiscordBotUrl(cur);
    if (!botUrl) return;
    sendingRef.current = true;
    const r = await discordPutPins(botUrl, cur.token, data);
    sendingRef.current = false;
    if (r.status === 'ok') {
      updateLink({ lastPinsHash: h, lastPinsSentAt: new Date().toISOString() });
      failedHashRef.current = '';
      setMsg(null);
      if (latestRef.current.hash !== h) schedule(PINS_SYNC_DELAY_MS);
    } else if (r.status === 'unauthorized') {
      updateLink({ token: undefined, userName: undefined, linkedAt: undefined, lastSyncAt: undefined, lastSentAt: undefined, lastShareHash: undefined, lastPinsHash: undefined, lastPinsSentAt: undefined });
      setMsg({ kind: 'error', text: 'Discord 連携が解除されています。設定タブでもう一度連携してください' });
    } else if (r.status === 'outdated') {
      failedHashRef.current = h;
      setMsg({ kind: 'error', text: 'ピンを Discord に送れませんでした。アプリ（または Bot）を更新してください' });
    } else if (r.status === 'rate') {
      const sec = r.retryAfter || DISCORD_RATE_FALLBACK_SEC;
      waitUntilRef.current = Date.now() + sec * 1000;
      timerRef.current = setTimeout(() => { waitUntilRef.current = 0; sendRef.current(); }, sec * 1000);
    } else {
      setMsg({ kind: 'error', text: r.status === 'network' ? 'ピンを Discord に送れませんでした（次の変更のときに送り直します）' : `ピンを Discord に送れませんでした（HTTP ${r.httpStatus}）` });
    }
  };

  useEffect(() => {
    if (!link.token) return;
    if (waitUntilRef.current > Date.now()) return;     // 429 の送り直しで最新の内容が送られる
    if (loadDiscordLink().lastPinsHash === hash || failedHashRef.current === hash) { clearTimeout(timerRef.current); return; }
    schedule(PINS_SYNC_DELAY_MS);
  }, [link.token, hash]);

  useEffect(() => () => clearTimeout(timerRef.current), []);
  return { pinsMsg: link.token ? msg : null };
}

/**
 * 開いているボードの参加者のピン。fb は useFriendBoard の戻り値。
 * GET /api/boards/:id（30秒ごと）の members[].pinsUpdatedAt が変わったときだけ GET /api/boards/:id/pins を読む。
 * 戻り値: { members: [{ userId, colorIdx, pinsUpdatedAt, pins }] }（ボードを開いていなければ空）
 */
function useFriendPins(discord, fb) {
  const token = discord.link.token || '';
  const botUrl = getDiscordBotUrl(discord.link);
  const { boardId, detail, loadedAt } = fb;
  const sig = boardId + '|' + (detail?.members || []).map(m => `${m.userId}:${m.pinsUpdatedAt ?? ''}`).join(',');
  const [data, setData] = useState(null);           // { boardId, members }
  const loadedSigRef = useRef('');

  useEffect(() => {
    if (!token || !botUrl || !boardId || !detail) return;
    if (loadedSigRef.current === sig) return;
    let cancelled = false;
    discordGetBoardPins(botUrl, token, boardId).then(r => {
      if (cancelled) return;
      if (r.status === 'ok') { loadedSigRef.current = sig; setData({ boardId, members: r.members }); }
      // 403 / 404（終わった・参加していない・Bot が古い）はピン無し。ボードを閉じるのは useFriendBoard に任せる。
      // 通信できないときは次の読み直し（loadedAt が変わる）でもう一度読む
      else if (r.status === 'forbidden' || r.status === 'not_found') { loadedSigRef.current = sig; setData({ boardId, members: [] }); }
    });
    return () => { cancelled = true; };
  }, [token, botUrl, boardId, sig, loadedAt]);

  useEffect(() => { if (!boardId) { loadedSigRef.current = ''; setData(null); } }, [boardId]);

  const members = useMemo(() => (data && data.boardId === boardId ? data.members : []), [data, boardId]);
  return { members };
}

/** 隠した仲間のピン（Set of "<userId>/<pinId>"）と、隠す・全部戻す */
function useHiddenFriendPins() {
  const [hidden, setHidden] = useState(() => {
    try {
      const v = JSON.parse(localStorage.getItem(FRIEND_PINS_HIDDEN_KEY) || '[]');
      return new Set(Array.isArray(v) ? v : []);
    } catch { return new Set(); }
  });
  const save = (next) => {
    try {
      if (next.size) localStorage.setItem(FRIEND_PINS_HIDDEN_KEY, JSON.stringify([...next]));
      else localStorage.removeItem(FRIEND_PINS_HIDDEN_KEY);
    } catch {}
  };
  const hide = useCallback((keys) => {
    setHidden(prev => { const next = new Set(prev); keys.forEach(k => next.add(k)); save(next); return next; });
  }, []);
  const unhideAll = useCallback(() => { const next = new Set(); save(next); setHidden(next); }, []);
  return { hidden, hide, unhideAll };
}

const friendPinKey = (userId, pinId) => `${userId}/${pinId}`;

/**
 * 1つのマップの自分のピンと仲間のピンをまとめて、表示用のピン（座標はピクセル）にする。
 * 同じ目標（taskId・objectiveId）で近い位置（比率で FRIEND_PIN_MERGE_DIST 以内）のピンを1つにまとめる。
 * 位置は自分のピンがあれば自分の位置、無ければ仲間のピンの平均。
 * - 自分のピン: 元のピンに friendPins（まとまった仲間のピン [{ userId, colorIdx, pin }]）を足したもの
 * - 仲間だけのピン: { id:'fp_…', mapName, taskId, objectiveId, x, y, friendOnly:true, friendPins }
 * members は自分と外した参加者を除いた仲間（useFriendPins の members）。hidden は隠した仲間のピン
 */
function mergeMapPins(mapName, meta, selfPins, members, hidden) {
  if (!meta?.width || !meta?.height) return selfPins;
  const W = meta.width, H = meta.height;
  const byObj = new Map();
  const groups = [];
  const add = (g) => {
    const k = g.taskId + '|' + g.objectiveId;
    (byObj.get(k) || byObj.set(k, []).get(k)).push(g);
    groups.push(g);
  };
  for (const p of selfPins) add({ taskId: p.taskId, objectiveId: p.objectiveId, x: p.x / W, y: p.y / H, self: p, friends: [] });
  for (const m of members) {
    if (!Array.isArray(m.pins)) continue;
    for (const fp of m.pins) {
      if (!fp || normalizeRaidMapName(fp.mapName) !== mapName) continue;
      if (hidden?.has(friendPinKey(m.userId, fp.id))) continue;
      const x = Number(fp.x), y = Number(fp.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      const entry = { userId: m.userId, colorIdx: m.colorIdx, pin: fp };
      let best = null, bestD = Infinity;
      for (const g of byObj.get(fp.taskId + '|' + fp.objectiveId) || []) {
        const d = Math.hypot(g.x - x, g.y - y);
        if (d <= FRIEND_PIN_MERGE_DIST && d < bestD) { best = g; bestD = d; }
      }
      if (best) {
        best.friends.push(entry);
        if (!best.self) {
          best.x = best.friends.reduce((s, f) => s + Number(f.pin.x), 0) / best.friends.length;
          best.y = best.friends.reduce((s, f) => s + Number(f.pin.y), 0) / best.friends.length;
        }
      } else {
        add({ taskId: fp.taskId, objectiveId: fp.objectiveId, x, y, self: null, friends: [entry], key: `fp_${m.userId}_${fp.id}` });
      }
    }
  }
  return groups.map(g => g.self
    ? (g.friends.length ? { ...g.self, friendPins: g.friends } : g.self)
    : { id: g.key, mapName, taskId: g.taskId, objectiveId: g.objectiveId, x: g.x * W, y: g.y * H, friendOnly: true, friendPins: g.friends });
}
