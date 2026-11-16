// ── Discord 出撃共有: 仲間の目標（出撃準備タブ）── docs/Discord出撃共有Bot設計書.md §11.4
// 参加中の Discord のボード（GET /api/boards → GET /api/boards/:id）の参加者の共有データを
// 合算（09-raid-aggregate.js）して、メンバー別の色で自分の目標に重ねて出す。出す参加者は参加者のボタン（FriendMemberBar）で選ぶ。出撃準備タブで表示している間だけ30秒ごとに読み直す。

const FRIEND_BOARD_POLL_MS = 30 * 1000;
const FRIEND_BOARD_MODE_LABEL = { regular: 'PvP', pve: 'PvE', 'pvp-season': 'シーズン' };
/** メンバー別の色（colorIdx 0〜4 = Discord の 🟥🟦🟩🟨🟪・style.css の --member-0〜4） */
const memberColor = (idx) => `var(--member-${Math.min(4, Math.max(0, Number(idx) || 0))})`;

/** GET /api/boards。{ status:'ok', boards } / { status:'unauthorized'|'network'|'error', httpStatus? } */
async function discordGetBoards(botUrl, token) {
  let res;
  try {
    res = await fetch(`${botUrl}/api/boards`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  } catch { return { status: 'network' }; }
  if (res.status === 401) return { status: 'unauthorized' };
  if (!res.ok) return { status: 'error', httpStatus: res.status };
  const body = await _readJson(res);
  return Array.isArray(body) ? { status: 'ok', boards: body } : { status: 'error', httpStatus: res.status };
}

/** GET /api/boards/:id。{ status:'ok', data:{ board, members } } / { status:'unauthorized'|'forbidden'|'not_found'|'network'|'error', httpStatus? } */
async function discordGetBoard(botUrl, token, id) {
  let res;
  try {
    res = await fetch(`${botUrl}/api/boards/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  } catch { return { status: 'network' }; }
  if (res.status === 401) return { status: 'unauthorized' };
  if (res.status === 403) return { status: 'forbidden' };
  if (res.status === 404) return { status: 'not_found' };
  if (!res.ok) return { status: 'error', httpStatus: res.status };
  const body = await _readJson(res);
  if (!body || !body.board || !Array.isArray(body.members)) return { status: 'error', httpStatus: res.status };
  return { status: 'ok', data: body };
}

/** 「14:32」（今日でなければ「11/12 14:32」） */
function formatBoardTime(ms) {
  if (!ms) return '';
  const d = new Date(ms);
  if (isNaN(d)) return '';
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return d.toDateString() === new Date().toDateString() ? hm : `${d.getMonth() + 1}/${d.getDate()} ${hm}`;
}

/**
 * 仲間の目標の読み込み。discord は useDiscordSync の戻り値（連携トークン・401 時の連携解除・表示の切り替えの保存に使う）。
 * active = 出撃準備タブを表示中（このときだけ読む）。onFirstLoad(board, source) は開いたボードを最初に読めたときに1回呼ぶ
 * （source = 'hash'（[地図で見る] のリンク）/ 'auto'（参加中のボードを自動で開いた））。
 *
 * 参加中のボード（GET /api/boards）を自動で開く（ボード ID を意識させない）。
 * 1人が参加できるボードは1つ（Bot 側で保証・aiuhehe/tarkov-raid-bot#28）なので、一覧は0件か1件で、先頭を開けばよい。
 * ボードを開いていない間は一覧も30秒ごとに読み直すので、後から始まったボードも自動で開く。
 * 目標一覧に出す参加者は、参加者のボタン（FriendMemberBar）で1人ずつ外せる（hiddenMembers = 外した userId。
 * 連携情報 eft_discord_link_v1 の hiddenMembers に保存・リロードしても同じ。1レイドだけ休む仲間を外して見るなど）
 */
function useFriendBoard(discord, active, onFirstLoad) {
  const { link, updateLink } = discord;
  const token = link.token || '';
  const botUrl = getDiscordBotUrl(link);
  const hiddenMembers = useMemo(() => new Set(Array.isArray(link.hiddenMembers) ? link.hiddenMembers : []), [link.hiddenMembers]);

  const [boardId, setBoardId] = useState(getBoardIdFromHash);
  const [detail, setDetail] = useState(null);       // { board, members }（表示中のボードの最後に読めた内容）
  const [loadedAt, setLoadedAt] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);         // { kind:'error'|'info', text }（表示中のボードの一時的な失敗・連携解除）
  const [notice, setNotice] = useState('');         // ボードを閉じた理由（終了した・参加していない）
  const [boards, setBoards] = useState(null);       // 参加中のボード一覧（未取得は null）
  const [boardsLoading, setBoardsLoading] = useState(false);
  const [boardsError, setBoardsError] = useState('');

  const boardIdRef = useRef(boardId);
  boardIdRef.current = boardId;
  const sourceRef = useRef(boardId ? 'hash' : '');
  const dismissedRef = useRef(new Set());           // 終了した・参加していなかったボード（自動で開き直さない）
  const firstLoadRef = useRef({ id: '', fn: onFirstLoad });
  firstLoadRef.current.fn = onFirstLoad;

  const openBoard = useCallback((id, source) => {
    if (boardIdRef.current === id) return;
    boardIdRef.current = id;
    sourceRef.current = source;
    setBoardId(id); setDetail(null); setLoadedAt(0); setError(null); setNotice(''); setLoading(false);
  }, []);
  // ボードを閉じる。reason があれば出す。dismiss = そのボードを自動で開き直さない（終了した・参加していない）
  const dropBoard = useCallback((reason, dismiss) => {
    if (dismiss && boardIdRef.current) dismissedRef.current.add(boardIdRef.current);
    boardIdRef.current = '';
    sourceRef.current = '';
    firstLoadRef.current.id = '';
    setBoardId(''); setDetail(null); setLoadedAt(0); setError(null); setLoading(false);
    setNotice(reason || '');
    setBoards(null);                                 // 一覧を読み直す（終了・参加の変化を反映）
  }, []);

  // 参加者を目標一覧に出す／外す
  const toggleMember = useCallback((userId) => {
    const next = new Set(hiddenMembers);
    if (next.has(userId)) next.delete(userId); else next.add(userId);
    updateLink({ hiddenMembers: next.size ? [...next] : undefined });
  }, [hiddenMembers, updateLink]);

  // 以前の「自分の目標だけ」⇔「仲間の目標も表示」の切り替え（hideFriends）は廃止。残っていれば消す
  useEffect(() => { if (link.hideFriends !== undefined) updateLink({ hideFriends: undefined }); }, [link.hideFriends, updateLink]);

  // [地図で見る] のリンクで開いたらそのボードを開く（ページを開いたまま踏んだとき＝hashchange も）
  useEffect(() => {
    const fromLink = () => {
      const id = getBoardIdFromHash();
      if (!id) return;
      openBoard(id, 'hash');
    };
    fromLink();
    window.addEventListener('hashchange', fromLink);
    return () => window.removeEventListener('hashchange', fromLink);
  }, [openBoard, updateLink]);

  const authLost = () => {
    updateLink({ token: undefined, userName: undefined, linkedAt: undefined, lastSyncAt: undefined, lastSentAt: undefined, lastShareHash: undefined });
    setError({ kind: 'error', text: 'Discord 連携が解除されています。設定タブでもう一度連携してください' });
  };

  const loadBoards = useCallback(async () => {
    if (!token || !botUrl) return;
    setBoardsLoading(true);
    const r = await discordGetBoards(botUrl, token);
    setBoardsLoading(false);
    if (r.status === 'ok') { setBoards(r.boards); setBoardsError(''); }
    else if (r.status === 'unauthorized') authLost();
    else setBoardsError(r.status === 'network' ? '参加中のボードを読み込めませんでした' : `参加中のボードを読み込めませんでした（HTTP ${r.httpStatus}）`);
  }, [token, botUrl]);

  const loadBoard = useCallback(async (id) => {
    if (!token || !botUrl || !id) return;
    setLoading(true);
    const r = await discordGetBoard(botUrl, token, id);
    if (boardIdRef.current !== id) return;          // 読んでいる間に閉じた・別のボードに切り替えた
    setLoading(false);
    if (r.status === 'ok') {
      setDetail(r.data); setLoadedAt(Date.now()); setError(null);
      if (firstLoadRef.current.id !== id) {
        firstLoadRef.current.id = id;
        firstLoadRef.current.fn?.(r.data.board, sourceRef.current);
      }
    } else if (r.status === 'unauthorized') {
      authLost();
    } else if (r.status === 'forbidden') {
      dropBoard('参加していないボードです。Discord のボードで [参加する] を押すと、ここに自動で出ます', true);
    } else if (r.status === 'not_found') {
      dropBoard('ボードが終了しました', true);
    } else {
      // 一時的な失敗。前回の内容を出したまま、次の30秒後にもう一度読む
      setError({ kind: 'error', text: r.status === 'network' ? '読み込めませんでした（30秒後にもう一度読みます）' : `読み込めませんでした（HTTP ${r.httpStatus}）` });
    }
  }, [token, botUrl, dropBoard]);

  // 出撃準備タブを表示している間だけ30秒ごとに読み直す（ブラウザのタブが裏にある間は読まず、表に戻ったときに読む）。
  // ボードを開いていればそのボード、開いていなければ参加中のボードの一覧
  useEffect(() => {
    if (!active || !token || !botUrl) return;
    let last = 0;
    const tick = () => {
      if (document.hidden) return;
      last = Date.now();
      if (boardId) loadBoard(boardId); else loadBoards();
    };
    tick();
    const id = setInterval(tick, FRIEND_BOARD_POLL_MS);
    const onVis = () => { if (!document.hidden && Date.now() - last >= FRIEND_BOARD_POLL_MS) tick(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVis); };
  }, [active, boardId, token, botUrl, loadBoard, loadBoards]);

  // 参加中のボードがあれば自動で開く（終了した・参加していなかったボードは開き直さない）
  useEffect(() => {
    if (!active || !token || boardId || !boards) return;
    const next = boards.find(b => !dismissedRef.current.has(b.id));
    if (next) openBoard(next.id, 'auto');
  }, [active, token, boardId, boards, openBoard]);

  const reload = useCallback(() => {
    if (boardIdRef.current) loadBoard(boardIdRef.current); else loadBoards();
  }, [loadBoard, loadBoards]);

  return {
    linked: !!token, botUrl, hiddenMembers, toggleMember, boardId, detail, loadedAt, loading, error, notice,
    boards, boardsLoading, boardsError, reload,
  };
}

/** 色マーカー（Discord の 🟥🟦🟩🟨🟪 の代わり） */
function MemberMarker({ colorIdx, title, size = 10 }) {
  return <span className="fb-marker" title={title} style={{ width: size, height: size, background: memberColor(colorIdx) }} />;
}

/**
 * 出撃準備タブの参加者のボタンの列（枠なし・「{マップ} での目標」の見出しのすぐ下）。
 * ボタン1つ = 参加者1人（色の四角・アバター・名前・最後に同期した時刻）。押すとその人を目標一覧に出す／外す（複数選べる）。
 * 外した人は薄く・点線・取り消し線で出す。右端の更新ボタンは今すぐ読み込み直す（乗せるとボード名・最終読み込み・自動終了の時刻）。
 * ボードが無ければ何も出さない（閉じた理由・失敗だけ1行で出す）。fb は useFriendBoard、people は useFriendBoardPeople の戻り値
 */
function FriendMemberBar({ fb, people, onOpenSettings }) {
  const { linked, botUrl, hiddenMembers, toggleMember, boardId, detail, loadedAt, loading, error, notice,
    boardsLoading, boardsError, reload } = fb;

  // 連携していない人には、ボードのリンクで開いたときだけ案内を出す（Bot を使っていない人の画面を増やさない）
  if (!linked || !botUrl) {
    if (!boardId) return null;
    return (
      <div className="fb-bar">
        <span className="fb-note">
          {!linked ? (error?.text || '仲間の目標を見るには、設定タブで Discord と連携してください。') : 'Bot の URL が設定されていないため、仲間の目標を読み込めません。'}
        </span>
        <button className="btn btn-sm btn-yellow" onClick={onOpenSettings}>設定タブを開く</button>
      </div>
    );
  }

  if (!boardId) {
    const msg = boardsError || notice;
    if (!msg) return null;
    return (
      <div className="fb-bar">
        <span className="fb-error"><Icon name="alert-triangle" size={12} color="currentColor" /> {msg}</span>
      </div>
    );
  }

  const board = detail?.board;
  const members = detail?.members || [];
  const place = board ? ([board.guildName, board.channelName && `#${board.channelName}`].filter(Boolean).join(' ') || 'Discord のボード') : '';
  const busy = loading || boardsLoading;
  const reloadTitle = [
    board && `${place}（${FRIEND_BOARD_MODE_LABEL[board.gameMode] || board.gameMode}）`,
    loadedAt && `最終読み込み ${formatBoardTime(loadedAt)}（30秒ごとに更新）`,
    board?.expiresAt && `${formatBoardTime(board.expiresAt)} ごろ自動終了（操作があれば延長）`,
    '押すと今すぐ読み込み直す',
  ].filter(Boolean).join('\n');

  return (
    <div className="fb-bar" role="group" aria-label="目標一覧に出す参加者">
      {!detail && !error && <span className="fb-note">仲間の目標を読み込んでいます…</span>}
      {members.map(m => {
        const on = !hiddenMembers.has(m.userId);
        const self = m.userId === people.selfId;
        return (
          <button key={m.userId} className={`fb-member${on ? '' : ' is-off'}`} aria-pressed={on}
            style={{ borderColor: memberColor(m.colorIdx) }} onClick={() => toggleMember(m.userId)}
            title={`${m.displayName || '（名前不明）'}${self ? '（自分）' : ''}: ${on ? '押すと目標一覧から外す' : '押すと目標一覧に出す'}`}>
            <MemberMarker colorIdx={m.colorIdx} />
            {m.avatarUrl && <img className="fb-avatar" src={m.avatarUrl} alt="" onError={e => { e.target.style.display = 'none'; }} />}
            <span className="fb-member-name">{m.displayName || '（名前不明）'}</span>
            <span className="fb-member-sync">{m.share && m.syncedAt ? formatBoardTime(m.syncedAt) : '未同期'}</span>
          </button>
        );
      })}
      <button className="fb-bar-reload" onClick={reload} disabled={busy} title={reloadTitle} aria-label="仲間の目標を今すぐ読み込み直す">
        <Icon name="refresh" size={12} color="currentColor" className={busy ? 'spinner' : ''} />
      </button>
      {error && <span className="fb-error"><Icon name="alert-triangle" size={12} color="currentColor" /> {error.text}</span>}
    </div>
  );
}

const FB_CAT_META = {
  bring:   { label: '持ち込み', icon: 'backpack',    color: 'var(--info)' },
  collect: { label: '収集',     icon: 'package',     color: 'var(--warn)' },
  place:   { label: '設置',     icon: 'download',    color: 'var(--accent)' },
  kill:    { label: '撃破',     icon: 'skull',       color: 'var(--danger)' },
  extract: { label: '脱出',     icon: 'arrow-right', color: 'var(--state-ok)' },
  locate:  { label: '調査',     icon: 'search',      color: 'var(--info)' },
};

/**
 * 合算した1行の簡易表示。各自の残りを色マーカーと並べる（撃破も合計しない）。
 * 出撃準備タブは自分の API データで引けない目標（仲間のカスタムタスクなど）にだけ使う
 */
function FriendGoalRow({ goal, nameOf, iconOf }) {
  const meta = FB_CAT_META[goal.cat] || FB_CAT_META.locate;
  const icon = goal.itemId ? iconOf(goal.itemId) : '';
  return (
    <div className={`fb-goal${goal.common ? ' is-common' : ''}`}>
      <span className="fb-goal-spacer" />
      {icon
        ? <img className="fb-goal-icon" src={icon} alt="" onError={e => { e.target.style.display = 'none'; }} />
        : <Icon name={meta.icon} size={16} color={meta.color} />}
      <div className="fb-goal-body">
        <div className="fb-goal-label">
          <span className="fb-goal-cat" style={{ color: meta.color }}>{meta.label}</span>
          <span>{goal.label || '（名前なし）'}</span>
          {goal.fir && <span className="fb-fir">FIR</span>}
          {goal.detail && <span className="fb-goal-detail">{goal.detail}</span>}
        </div>
        <div className="fb-goal-task">
          {[...new Set((goal.entries || []).map(e => e.taskName + (e.custom ? '（カスタム）' : '')).filter(Boolean))].join(' / ') || goal.taskName}
        </div>
      </div>
      <div className="fb-goal-members">
        {goal.members.map(m => (
          <span key={m.userId} className="fb-goal-member" title={nameOf(m.userId)}>
            <MemberMarker colorIdx={m.colorIdx} />×{m.remaining}
          </span>
        ))}
      </div>
    </div>
  );
}

/** 共有データの中身の目印（タスク ID・目標 ID・チェック）。送った時刻やキーの順に左右されない */
function _shareSignature(share) {
  if (!share || !Array.isArray(share.tasks)) return '';
  return JSON.stringify(share.tasks
    .map(t => [t.id, (t.objectives || []).map(o => `${o.id}:${o.done ? 1 : 0}`).sort()])
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)));
}

/**
 * ボードの参加者のうち自分を探す（API は自分の userId を返さないため）。
 * ① 共有データの中身が今の自分の共有データと同じ人（1人だけのとき） ② 連携時の名前と同じ表示名の人（1人だけのとき） ③ 前回見つけた人
 */
function findSelfMember(members, selfShare, selfName, lastId) {
  const sig = _shareSignature(selfShare);
  if (sig && sig !== '[]') {
    const hit = members.filter(m => _shareSignature(m.share) === sig);
    if (hit.length === 1) return hit[0].userId;
  }
  if (selfName) {
    const hit = members.filter(m => m.displayName === selfName);
    if (hit.length === 1) return hit[0].userId;
  }
  return lastId && members.some(m => m.userId === lastId) ? lastId : '';
}

/**
 * ボードの参加者（参加者のボタンで外した人を除き、自分の分は手元の共有データに差し替えたもの）と、自分の userId・表示名。
 * 自分の分は Bot に届いた内容ではなく手元の内容で合算する（チェックしたらすぐ反映する。ボードのゲームモードと同じときだけ）。
 * App で1回だけ呼び、目標一覧（FriendBoardView）と地図の右の一覧（MapPinVisual の memberMarksOf）の両方で使う。
 * detail が無ければ members は空
 */
function useFriendBoardPeople(detail, selfShare, selfName, hiddenMembers) {
  const rawMembers = detail?.members || [];
  const gameMode = detail?.board?.gameMode;
  const selfIdRef = useRef('');
  const selfId = useMemo(() => findSelfMember(rawMembers, selfShare, selfName, selfIdRef.current), [rawMembers, selfShare, selfName]);
  selfIdRef.current = selfId;
  // 参加者のボタンで外した人は除く
  const members = useMemo(() => {
    const shown = rawMembers.filter(m => !hiddenMembers?.has(m.userId));
    if (!selfId || !selfShare || selfShare.gameMode !== gameMode) return shown;
    return shown.map(m => (m.userId === selfId ? { ...m, share: selfShare } : m));
  }, [rawMembers, selfId, selfShare, gameMode, hiddenMembers]);
  // 自分以外を1人でも出しているか（出していなければ出撃準備タブはふだんの自分の目標一覧を出す）
  const showsFriends = members.some(m => m.userId !== selfId);
  const nameById = useMemo(() => new Map(rawMembers.map(m => [m.userId, (m.displayName || '（名前不明）') + (m.userId === selfId ? '（自分）' : '')])), [rawMembers, selfId]);
  const nameOf = useCallback((id) => nameById.get(id) || '', [nameById]);
  // 「タスク ID + 目標キー（raidObjKey）」→ その目標が未チェックで残っている参加者 [{ userId, colorIdx }]（参加順）
  const holders = useMemo(() => {
    const out = new Map();
    for (const m of members) {
      for (const t of m.share?.tasks || []) {
        for (const o of t.objectives || []) {
          if (o.done) continue;
          const k = t.id + '|' + o.id;
          const list = out.get(k) || [];
          if (!list.some(x => x.userId === m.userId)) list.push({ userId: m.userId, colorIdx: m.colorIdx });
          out.set(k, list);
        }
      }
    }
    return out;
  }, [members]);
  const holdersOf = useCallback((taskId, objKey) => holders.get(taskId + '|' + objKey) || [], [holders]);
  // 誰かの共有データに入っているタスク ID（地図に仲間のタスクのピンも出すため）
  const taskIds = useMemo(() => new Set(members.flatMap(m => (m.share?.tasks || []).map(t => t.id))), [members]);
  return { members, selfId, nameOf, holdersOf, taskIds, showsFriends };
}

/**
 * 仲間の目標の中身（出撃準備タブの目標一覧の位置に出す）。
 * map が空ならマップ別の目標一覧（§7.1・行を押すとそのマップを選ぶ）、選んでいればマップ表示（§7.2）。
 * items はアイコンを引くための apiData.items。people は useFriendBoardPeople の戻り値（自分の分は手元の共有データで合算済み）。
 * render（出撃準備タブから渡す）: { row(goal, nameOf), collectList(goals, nameOf), collectToggle }。
 * 行を自分の目標と同じ見た目（タスク名のリンク・トレーダー・チェック・ピン）で出す。無ければ簡易表示
 */
function FriendBoardView({ detail, map, onSelectMap, items, people, render }) {
  const { members, nameOf } = people;
  const iconById = useMemo(() => new Map((items || []).map(i => [i.id, i.iconLink])), [items]);
  const iconOf = (id) => iconById.get(id) || '';
  const overview = useMemo(() => (map ? null : aggregateRaidOverview(members)), [members, map]);
  const agg = useMemo(() => (map ? aggregateRaidMap(members, map) : null), [members, map]);
  const synced = members.filter(m => m.share).length;

  if (synced === 0) {
    return <div className="section fb-note" style={{ textAlign: 'center', padding: 16 }}>まだ誰の目標も届いていません（参加者のアプリが同期すると表示されます）</div>;
  }

  if (!map) {
    const a = overview.anyMap;
    return (
      <div className="section">
        <div className="section-title"><Icon name="map" size={14} color="var(--accent)" /> マップ別の目標（行き先選び）</div>
        {overview.maps.length === 0 ? (
          <div className="fb-note">マップの決まった目標はありません</div>
        ) : (
          <div className="fb-goal-list">
            {overview.maps.map((s, i) => (
              <button key={s.map} className="fb-map-row" onClick={() => onSelectMap(s.map)} title={`${s.map} を選んで目標を見る`}>
                <span className="fb-map-rank">{i + 1}.</span>
                <span className="fb-map-name">{s.map}</span>
                <span className="fb-map-markers">{s.members.map(m => <MemberMarker key={m.userId} colorIdx={m.colorIdx} title={nameOf(m.userId)} />)}</span>
                <span className="fb-map-count">目標 {s.goals}件{s.commonGoals ? `（共通 ${s.commonGoals}件）` : ''}</span>
              </button>
            ))}
          </div>
        )}
        {a.total > 0 && (
          <div className="fb-footer" style={{ marginTop: 6 }}>
            どのマップでもOKな目標: {a.total}件（撃破 {a.kill} / 収集・持ち込み {a.items} / 設置・調査・脱出 {a.other}）
          </div>
        )}
      </div>
    );
  }

  const row = (g) => (render ? render.row(g, nameOf) : <FriendGoalRow key={g.key} goal={g} nameOf={nameOf} iconOf={iconOf} />);
  // 欄は自分の目標一覧と同じ6種類・同じ順（2026-11-13）。共通の目標は欄の先頭に来て（持っている人が多い順）、左の線と色の四角でわかる。
  // 収集（FIR）は自分の目標と同じ表示切替（1列／2列／3列／非表示）で出し、「非表示」なら欄ごと出さない
  const section = (title, iconName, color, goals, body) => {
    if (!goals.length) return null;
    const content = body ? body(goals) : goals.map(row);
    if (!content) return null;
    return (
      <div className="section" key={title}>
        <div className="section-title">
          <Icon name={iconName} size={14} color={color} /> {title}
          <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 6 }}>{goals.length}件</span>
        </div>
        <div className="fb-goal-list">{content}</div>
      </div>
    );
  };
  const collectBody = render ? (goals) => render.collectList(goals, nameOf) : undefined;
  const sections = (goals) => {
    const of = (cat) => goals.filter(g => g.cat === cat);
    return (
      <>
        {section('持ち込むもの', 'backpack', 'var(--info)', of('bring'))}
        {section('収集するもの（FIR）', 'package', 'var(--warn)', of('collect'), collectBody)}
        {section('設置・マーキング', 'download', 'var(--accent)', of('place'))}
        {section('倒すもの', 'skull', 'var(--danger)', of('kill'))}
        {section('脱出', 'arrow-right', 'var(--state-ok)', of('extract'))}
        {section('調査・特定', 'search', 'var(--info)', of('locate'))}
      </>
    );
  };
  // aggregateRaidMap の欄（Discord のボードと同じ分け方）をつなぎ直す。common が先なので、どの種類の中でも共通の目標が先頭に来る
  const specific = [...agg.common, ...agg.kill, ...agg.items, ...agg.other];
  const hasCollect = [...specific, ...agg.anyMap].some(g => g.cat === 'collect');
  const empty = specific.length === 0;
  return (
    <>
      {render && hasCollect && render.collectToggle}
      {/* Discord のボードの「共通のタスク（タスク「Debut」）」の行は出さない。Discord は文字数の都合で行ごとにタスク名を書けないための行で、
          アプリは各行の下にタスク名と誰のタスクか（色の四角）を出すので要らない */}
      {sections(specific)}
      {empty && <div className="section fb-note" style={{ textAlign: 'center', padding: 16 }}>{map} 固有の目標はありません</div>}
      {agg.anyMap.length > 0 && (
        <details style={{ marginTop: 4 }}>
          <summary className="fb-anymap-summary">
            <Icon name="globe" size={13} color="var(--text-secondary)" />
            どのマップでもOKな目標 ({agg.anyMap.length}件) — このレイドでも消化できます
          </summary>
          <div style={{ marginTop: 4 }}>{sections(agg.anyMap)}</div>
        </details>
      )}
    </>
  );
}
