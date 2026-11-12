// ── Discord 出撃共有: 連携（設定タブ）── docs/Discord出撃共有Bot設計書.md §11.1・§11.3
// 6桁の連携コードで Bot からトークンをもらい、グローバルキー eft_discord_link_v1 に保存する。
// 全データバックアップには含めない（03-storage.js の BACKUP_EXCLUDE_KEYS）。

// Bot の URL はビルド時に build.sh / build.ps1 が環境変数 DISCORD_BOT_URL で置き換える（ソースには書かない）。
// 置き換えられていない（空でビルドした file:// 版）ときは設定タブに URL の入力欄を出す
const _DISCORD_BOT_URL_EMBED = '__DISCORD_BOT_URL__';
const DISCORD_BOT_URL = /^https?:\/\/[^\s'"]+$/.test(_DISCORD_BOT_URL_EMBED) ? _DISCORD_BOT_URL_EMBED.replace(/\/+$/, '') : '';

/** 連携情報 { token, userName, linkedAt, lastSyncAt, botUrl? }。連携中＝同期する（オン/オフの設定は持たない）。botUrl は URL を埋め込まずにビルドしたときだけ */
function loadDiscordLink() {
  try {
    const v = JSON.parse(localStorage.getItem(DISCORD_LINK_KEY) || 'null');
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch { return {}; }
}

function saveDiscordLink(link) {
  try { localStorage.setItem(DISCORD_LINK_KEY, JSON.stringify(link)); }
  catch (e) { console.warn('[EFT] Discord 連携情報を保存できません:', e); }
}

/** 連携コードを整える（全角数字→半角・空白/ハイフンを除く）。Discord では「482 913」と区切って表示される */
function normalizeDiscordLinkCode(input) {
  return String(input || '')
    .replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    .replace(/[\s　\-‐－ー]/g, '');
}

const _normBotUrl = (u) => String(u || '').trim().replace(/\/+$/, '');
/** 予備の入力欄で受け付ける Bot の URL（https、または手元の開発用 http://localhost） */
const isValidDiscordBotUrl = (u) =>
  /^https:\/\/[^\s'"/]+(\/[^\s'"]*)?$/.test(u) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/[^\s'"]*)?$/.test(u);

/** 使う Bot の URL（埋め込み定数を優先。無ければ入力欄の値）。使えなければ '' */
function getDiscordBotUrl(link) {
  if (DISCORD_BOT_URL) return DISCORD_BOT_URL;
  const u = _normBotUrl(link?.botUrl);
  return isValidDiscordBotUrl(u) ? u : '';
}

/** 429 の待ち秒数。Retry-After は CORS で公開されていないと読めないので、本文の retryAfter も見る */
const _discordRetryAfter = (res, body) => {
  const n = Number(res.headers.get('Retry-After') ?? body?.retryAfter);
  return Number.isFinite(n) && n > 0 ? Math.ceil(n) : 0;
};
const _fmtDiscordWait = (sec) => sec >= 90 ? `約${Math.ceil(sec / 60)}分` : `約${sec}秒`;
const _readJson = async (res) => { try { return await res.json(); } catch { return null; } };

/** POST /api/link。成功 { ok:true, token, userName } / 失敗 { ok:false, message } */
async function discordLinkWithCode(botUrl, code) {
  let res;
  try {
    res = await fetch(`${botUrl}/api/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
  } catch {
    return { ok: false, message: 'Bot に接続できませんでした。時間をおいてもう一度お試しください' };
  }
  const body = await _readJson(res);
  if (res.ok && body?.token) return { ok: true, token: body.token, userName: body.userName || '' };
  if (res.status === 429) {
    const sec = _discordRetryAfter(res, body);
    return { ok: false, message: `試行回数が多すぎます。しばらく待ってからもう一度お試しください${sec ? `（${_fmtDiscordWait(sec)}）` : ''}` };
  }
  if (body?.error === 'expired_code') return { ok: false, message: '連携コードの有効期限（5分）が切れています。Discord で /raid link をやり直してください' };
  if (body?.error === 'invalid_code') return { ok: false, message: '連携コードが違うか、使用済みです。コードを確かめるか、Discord で /raid link をやり直してください' };
  return { ok: false, message: `連携できませんでした（HTTP ${res.status}）` };
}

/** DELETE /api/link。Bot に届いたら true（既に無効なトークンでも 204） */
async function discordUnlink(botUrl, token) {
  try {
    const res = await fetch(`${botUrl}/api/link`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    return res.ok;
  } catch { return false; }
}

/**
 * PUT /api/share（共有データ v1 をそのまま送る）。§11.2 の応答の扱い。useDiscordSync が使う。
 * 戻り値 { status: 'ok' | 'unauthorized' | 'outdated' | 'rate' | 'network' | 'error', retryAfter?, httpStatus? }
 */
async function discordPutShare(botUrl, token, data) {
  let res;
  try {
    res = await fetch(`${botUrl}/api/share`, {
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

/** 最終同期日時の表示「2026年11月12日 14:32」 */
function formatDiscordSyncTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${hm}`;
}

/**
 * テキストをクリップボードへ。クリック直後に同期で execCommand('copy') を試す
 * （file:// や埋め込みブラウザでは navigator.clipboard が拒否されることがあるため）。だめなら navigator.clipboard
 */
async function copyTextToClipboard(text) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    if (ok) return true;
  } catch {}
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

/** コマンドを `code` 表示＋コピー ボタンで出す（例: /raid link） */
function DiscordCommandChip({ command }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const handleCopy = async () => {
    if (!(await copyTextToClipboard(command))) return;
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1500);
  };
  return (
    <span className="discord-cmd">
      <code>{command}</code>
      <button type="button" className="discord-cmd-copy" onClick={handleCopy}
        title={copied ? 'コピーしました' : `${command} をコピー`} aria-label={`${command} をコピー`}>
        <Icon name={copied ? 'check' : 'copy'} size={12} color={copied ? 'var(--state-ok)' : 'currentColor'} />
      </button>
    </span>
  );
}

// ── 自動送信・即時同期（§11.2・Issue #33 / #54）──

const DISCORD_SYNC_DELAY_MS = 30 * 1000;          // 最後の変更から30秒待ってまとめて送る
const DISCORD_SHARE_FRESH_MS = 6 * 60 * 60 * 1000; // Bot は6時間で共有データを消すので、それより前に送った内容なら同じでも送り直す
const DISCORD_RATE_FALLBACK_SEC = 60;              // 429 で Retry-After が読めないときの待ち秒数
const DISCORD_SYNC_MIN_SPIN_MS = 800;              // 即時同期ボタンの「同期中…」を最低これだけ出す（押した手応え・連打防止）

/** 文字列のハッシュ（16進32文字・cyrb53 系を2つの種で）。前回送った内容と比べるだけなので暗号強度は要らない */
function _discordHash(str) {
  const h = (seed) => {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
  };
  return h(0) + h(1);
}

/** 共有データの内容ハッシュ（作成日時 createdAt は毎回変わるので除く） */
const raidShareHash = (data) => _discordHash(JSON.stringify({ ...data, createdAt: undefined }));

/**
 * Discord 連携の状態と自動送信（App の中で1回だけ呼ぶ）。
 * shareData: 現在の共有データ v1（useMemo 済み）／ ready: API のタスクを読み込み済みか（読む前の空の内容は送らない）
 * 戻り値: { link, updateLink, sending, waitSec, syncMsg, syncNow, clearSyncMsg }
 *  - sending: 同期中（即時同期ボタンを押したときは、送らなかったときも最低 DISCORD_SYNC_MIN_SPIN_MS は true）
 *  - syncMsg: { kind: 'error' | 'info', text } 同期状態の欄に出すメッセージ（次に成功したら消す）
 */
function useDiscordSync(shareData, ready) {
  const [link, setLink] = useState(loadDiscordLink);
  const [sending, setSending] = useState(false);
  const [waitSec, setWaitSec] = useState(0);       // 429 で送り直しを待っている残り秒数
  const [syncMsg, setSyncMsg] = useState(null);
  const sendingRef = useRef(false);
  const timerRef = useRef(null);                    // 30秒待ち / 429 の送り直し
  const waitUntilRef = useRef(0);
  const failedHashRef = useRef('');                 // 413/422 になった内容（中身が変わるまで送り直さない）

  const shareHash = useMemo(() => (shareData ? raidShareHash(shareData) : ''), [shareData]);
  const latestRef = useRef({ shareData, shareHash });
  latestRef.current = { shareData, shareHash };

  // 別タブで連携・解除したときに追従する
  useEffect(() => {
    const onStorage = (e) => { if (e.key === DISCORD_LINK_KEY) setLink(loadDiscordLink()); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // 保存済みの値に差分を当てて保存（非同期処理の後でも古い state で上書きしない）
  const updateLink = useCallback((patch) => {
    const next = { ...loadDiscordLink(), ...patch };
    Object.keys(next).forEach(k => next[k] === undefined && delete next[k]);
    saveDiscordLink(next);
    setLink(next);
  }, []);

  /** 前回送った内容と同じで、Bot 側にまだ残っている（送ってから6時間以内）か */
  const isSameAsSent = (cur, hash) =>
    !!hash && cur.lastShareHash === hash && Date.now() - (Date.parse(cur.lastSentAt) || 0) < DISCORD_SHARE_FRESH_MS;

  const doSyncRef = useRef(null);
  // 同期1回分。重ねて走らないよう sendingRef で鍵をかける（ref なので連打の2回目以降は描画を待たずに弾く）
  const doSync = async (manual) => {
    if (sendingRef.current) return;                  // 同期中は重ねて送らない
    if (waitUntilRef.current > Date.now()) return;   // 429 の待ち中（送り直しは予約済み）
    sendingRef.current = true;
    const started = Date.now();
    if (manual) setSending(true);                    // 押したら、送らないときも「同期中…」にしてボタンを押せなくする
    try {
      await syncOnce(manual);
    } finally {
      if (manual) {
        const rest = DISCORD_SYNC_MIN_SPIN_MS - (Date.now() - started);
        if (rest > 0) await new Promise(r => setTimeout(r, rest));
      }
      sendingRef.current = false; setSending(false);
    }
  };

  const syncOnce = async (manual) => {
    clearTimeout(timerRef.current);
    const cur = loadDiscordLink();
    if (!cur.token) return;
    const { shareData: data, shareHash: hash } = latestRef.current;
    if (!data) return;
    if (isSameAsSent(cur, hash)) {
      // 前回送った内容と同じなら送らない。押したときは最終同期日時を今にする（「同期中…」の後に日時が変わる）
      if (manual) updateLink({ lastSyncAt: new Date().toISOString() });
      return;
    }
    if (hash === failedHashRef.current) return;      // 413/422 になった内容は送り直さない（メッセージは出したまま）
    const botUrl = getDiscordBotUrl(cur);
    if (!botUrl) { setSyncMsg({ kind: 'error', text: 'Bot の URL が設定されていないため同期できません' }); return; }

    setSending(true);
    const r = await discordPutShare(botUrl, cur.token, { ...data, createdAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z') });

    if (r.status === 'ok') {
      const now = new Date().toISOString();
      updateLink({ lastSyncAt: now, lastSentAt: now, lastShareHash: hash });
      failedHashRef.current = '';
      setSyncMsg(null);
      // 送っている間に内容が変わっていたら、また30秒後に送る
      if (latestRef.current.shareHash !== hash) timerRef.current = setTimeout(() => doSyncRef.current(false), DISCORD_SYNC_DELAY_MS);
    } else if (r.status === 'unauthorized') {
      updateLink({ token: undefined, userName: undefined, linkedAt: undefined, lastSyncAt: undefined, lastSentAt: undefined, lastShareHash: undefined });
      setSyncMsg({ kind: 'error', text: 'Discord 連携が解除されています。もう一度連携してください' });
    } else if (r.status === 'outdated') {
      failedHashRef.current = hash;
      setSyncMsg({ kind: 'error', text: 'アプリ（または Bot）を更新してください' });
    } else if (r.status === 'rate') {
      const sec = r.retryAfter || DISCORD_RATE_FALLBACK_SEC;
      waitUntilRef.current = Date.now() + sec * 1000;
      setWaitSec(sec);
      setSyncMsg({ kind: 'info', text: `送信が多すぎるため、${_fmtDiscordWait(sec)}後に送り直します` });
      timerRef.current = setTimeout(() => { waitUntilRef.current = 0; setWaitSec(0); doSyncRef.current(false); }, sec * 1000);
    } else {
      setSyncMsg({ kind: 'error', text: r.status === 'network' ? '同期できませんでした' : `同期できませんでした（HTTP ${r.httpStatus}）` });
    }
  };
  doSyncRef.current = doSync;

  // 内容が変わったら、最後の変更から30秒後に送る（前回送った内容と同じなら何もしない）
  useEffect(() => {
    if (!ready || !link.token || !shareHash) return;
    if (waitUntilRef.current > Date.now()) return;   // 429 の送り直しで最新の内容が送られる
    clearTimeout(timerRef.current);
    if (isSameAsSent(loadDiscordLink(), shareHash) || shareHash === failedHashRef.current) return;
    timerRef.current = setTimeout(() => doSyncRef.current(false), DISCORD_SYNC_DELAY_MS);
  }, [ready, link.token, shareHash]);

  // 429 の残り秒数を数える
  const waiting = waitSec > 0;
  useEffect(() => {
    if (!waiting) return;
    const id = setInterval(() => setWaitSec(Math.max(0, Math.ceil((waitUntilRef.current - Date.now()) / 1000))), 1000);
    return () => clearInterval(id);
  }, [waiting]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const syncNow = useCallback(() => { if (ready) doSyncRef.current(true); }, [ready]);
  const clearSyncMsg = useCallback(() => { failedHashRef.current = ''; setSyncMsg(null); }, []);

  return { link, updateLink, sending, waitSec, syncMsg, syncNow, clearSyncMsg };
}

/** 同期メッセージ（ヘッダー・設定タブ共通） */
function DiscordSyncMsg({ msg, className = 'discord-link-msg', style }) {
  if (!msg) return null;
  const isError = msg.kind === 'error';
  return (
    <span className={className} style={{ color: isError ? 'var(--danger-text)' : 'var(--text-dim)', ...style }}>
      <Icon name={isError ? 'alert-triangle' : 'clock'} size={12} color="currentColor" /> {msg.text}
    </span>
  );
}

/** ヘッダーの即時同期ボタン（連携中だけ出す）。メッセージは DiscordSyncMsg、最終同期は DiscordSyncTime で別に置く（ヘッダーの2段の並びに合わせるため） */
function DiscordSyncButton({ discord, ready }) {
  const { link, sending, waitSec, syncNow } = discord;
  if (!link.token) return null;
  const waiting = waitSec > 0;
  const label = sending ? '同期中…' : waiting ? `待機中（${waitSec}秒）` : 'Discord 同期';
  const lastSync = link.lastSyncAt ? formatDiscordSyncTime(link.lastSyncAt) : 'まだ同期していません';
  return (
    <button className="btn btn-yellow discord-sync-btn" onClick={syncNow} disabled={sending || waiting || !ready}
      title={`Discord の出撃ボードへ今すぐ送ります（変更は30秒後に自動でも送られます）
最終同期日時: ${lastSync}`}>
      <Icon name="refresh" size={14} color="currentColor"
        style={sending ? { animation: 'spin 1s linear infinite' } : undefined} />
      {label}
    </button>
  );
}

/** ヘッダー2段目の「最終同期: …」（連携中だけ） */
function DiscordSyncTime({ discord }) {
  const { link } = discord;
  if (!link.token) return null;
  return <span className="header-sub discord-sync-time">最終同期: {link.lastSyncAt ? formatDiscordSyncTime(link.lastSyncAt) : 'まだ'}</span>;
}

/**
 * 同期状態「最終同期日時: …」＋メッセージ（設定タブ・出撃準備タブ共通・Issue #34）。連携中だけ出す。
 * 送るのはヘッダーの即時同期ボタンと30秒後の自動送信なので、ここに送信ボタンは置かない（§11.2）
 */
function DiscordSyncStatus({ discord, showLabel = false, style }) {
  const { link, syncMsg } = discord;
  if (!link.token) return null;
  return (
    <span className="discord-sync-status" style={style}>
      {showLabel && <Icon name="link" size={12} color="var(--text-dim)" />}
      <span>
        {showLabel && 'Discord '}最終同期日時: {link.lastSyncAt ? formatDiscordSyncTime(link.lastSyncAt) : 'まだ同期していません'}
      </span>
      <DiscordSyncMsg msg={syncMsg} style={{ marginLeft: 0 }} />
    </span>
  );
}

/** 設定タブ「Discord 連携」セクション。discord は useDiscordSync の戻り値 */
function DiscordLinkSection({ discord }) {
  const { link, updateLink: update, syncMsg, clearSyncMsg } = discord;
  const [code, setCode] = useState('');
  const [botUrlDraft, setBotUrlDraft] = useState(() => loadDiscordLink().botUrl || '');
  const [busy, setBusy] = useState('');       // '' | 'link' | 'unlink'
  const [error, setError] = useState('');     // エラーだけ出す（成功・解除のお知らせは出さない）

  const linked = !!link.token;
  const botUrl = getDiscordBotUrl(link);
  const codeReady = /^\d{6}$/.test(normalizeDiscordLinkCode(code));

  const handleLink = async () => {
    const c = normalizeDiscordLinkCode(code);
    if (!/^\d{6}$/.test(c)) { setError('連携コードは6桁の数字です'); return; }
    if (!botUrl) { setError('Bot の URL を入力してください'); return; }
    setBusy('link'); setError('');
    const r = await discordLinkWithCode(botUrl, c);
    setBusy('');
    if (!r.ok) { setError(r.message); return; }
    update({ token: r.token, userName: r.userName, linkedAt: new Date().toISOString(), lastSyncAt: undefined, lastSentAt: undefined, lastShareHash: undefined });
    clearSyncMsg();
    setCode('');
  };

  const handleUnlink = async () => {
    if (!confirm('Discord 連携を解除しますか？\n（もう一度使うには Discord で /raid link からやり直します）')) return;
    setBusy('unlink'); setError('');
    const reached = botUrl ? await discordUnlink(botUrl, link.token) : false;
    setBusy('');
    update({ token: undefined, userName: undefined, linkedAt: undefined, lastSyncAt: undefined, lastSentAt: undefined, lastShareHash: undefined });
    clearSyncMsg();
    if (!reached) setError('このブラウザの連携は解除しましたが、Bot に届きませんでした。確実に無効にするには Discord で /raid unlink を実行してください');
  };

  const rowStyle = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' };
  const hint = { fontSize: 11, color: 'var(--text-dim)' };

  return (
    <div className="section discord-link">
      <div className="section-title" style={{ flexWrap: 'wrap' }}>
        <Icon name="link" size={14} color="var(--accent)" /> Discord 連携
        {error && (
          <span className="discord-link-msg" style={{ color: 'var(--danger-text)' }}>
            <Icon name="alert-triangle" size={12} color="currentColor" />
            {error}
          </span>
        )}
      </div>

      {!DISCORD_BOT_URL && (
        <div style={{ ...rowStyle, marginBottom: 10 }}>
          <span className="setting-label" style={{ margin: 0 }}>Bot の URL</span>
          <input type="text" value={botUrlDraft} placeholder="https://…" spellCheck={false}
            style={{ width: 320, maxWidth: '100%' }}
            onChange={e => setBotUrlDraft(e.target.value)}
            onBlur={() => {
              const u = _normBotUrl(botUrlDraft);
              if (u && !isValidDiscordBotUrl(u)) { setError('Bot の URL は https:// で始まる URL を入力してください'); return; }
              update({ botUrl: u || undefined });
            }} />
          <span style={hint}>この版には Bot の URL が入っていないため入力してください（GitHub Pages 版では不要）</span>
        </div>
      )}

      {!linked ? (
        <div>
          {syncMsg && <div style={{ marginBottom: 8 }}><DiscordSyncMsg msg={syncMsg} style={{ marginLeft: 0 }} /></div>}
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
            Discord で <DiscordCommandChip command="/raid link" /> を実行すると届く6桁の連携コードを入力してください。進行中タスクをお友達と連携できるようになります。
          </div>
          <div style={rowStyle}>
            <input type="text" className="discord-code-input" inputMode="numeric" autoComplete="one-time-code" value={code} placeholder="000 000"
              maxLength={12} style={{ width: 120, fontSize: 16, letterSpacing: '0.1em', textAlign: 'center' }}
              onChange={e => setCode(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && codeReady && !busy) handleLink(); }} />
            <button className="btn btn-yellow" disabled={!codeReady || !!busy} onClick={handleLink}
              title={codeReady ? undefined : '6桁の連携コードを入力してください'}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Icon name={busy === 'link' ? 'refresh' : 'link'} size={13} color="currentColor" />
              {busy === 'link' ? '連携中…' : '連携する'}
            </button>
          </div>
        </div>
      ) : (
        <div style={rowStyle}>
          <Icon name="circle-check" size={14} color="var(--state-ok)" />
          <span style={{ fontSize: 13 }}>連携中: <b>{link.userName || '（名前不明）'}</b></span>
          <button className="btn btn-gray btn-sm" disabled={!!busy} onClick={handleUnlink}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Icon name="x" size={11} color="currentColor" /> {busy === 'unlink' ? '解除中…' : '連携解除'}
          </button>
          <DiscordSyncStatus discord={discord} style={{ marginLeft: 6 }} />
        </div>
      )}
    </div>
  );
}
