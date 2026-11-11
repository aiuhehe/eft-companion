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
 * PUT /api/share（共有データ v1 をそのまま送る）。§11.2 の応答の扱い。自動同期（#33）で使う。
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

/** 最終同期時刻の表示（今日なら「14:32」、それ以外は「11/12 14:32」） */
function formatDiscordSyncTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return d.toDateString() === new Date().toDateString() ? hm : `${d.getMonth() + 1}/${d.getDate()} ${hm}`;
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

/** 設定タブ「Discord 連携」セクション。getShareData() は現在の共有データ v1 を返す */
function DiscordLinkSection({ getShareData }) {
  const [link, setLink] = useState(loadDiscordLink);
  const [code, setCode] = useState('');
  const [botUrlDraft, setBotUrlDraft] = useState(() => loadDiscordLink().botUrl || '');
  const [busy, setBusy] = useState('');       // '' | 'link' | 'unlink'
  const [error, setError] = useState('');     // エラーだけ出す（成功・解除のお知らせは出さない）

  // 別タブで連携・解除したときに追従する
  useEffect(() => {
    const onStorage = (e) => { if (e.key === DISCORD_LINK_KEY) setLink(loadDiscordLink()); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // 保存済みの値に差分を当てて保存（非同期処理の後でも古い state で上書きしない）
  const update = (patch) => {
    const next = { ...loadDiscordLink(), ...patch };
    Object.keys(next).forEach(k => next[k] === undefined && delete next[k]);
    saveDiscordLink(next);
    setLink(next);
  };

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
    update({ token: r.token, userName: r.userName, linkedAt: new Date().toISOString(), lastSyncAt: undefined });
    setCode('');
  };

  const handleUnlink = async () => {
    if (!confirm('Discord 連携を解除しますか？\n（もう一度使うには Discord で /raid link からやり直します）')) return;
    setBusy('unlink'); setError('');
    const reached = botUrl ? await discordUnlink(botUrl, link.token) : false;
    setBusy('');
    update({ token: undefined, userName: undefined, linkedAt: undefined, lastSyncAt: undefined });
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
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 6 }}>
            <Icon name="clock" size={11} color="var(--text-secondary)" />
            {link.lastSyncAt ? `${formatDiscordSyncTime(link.lastSyncAt)} に同期` : 'まだ同期していません'}
          </span>
        </div>
      )}

      {/* 開発中だけ出す枠。自動同期（#33）・同期状態（#34）ができたら枠ごと消す */}
      <div className="dev-only-box">
        <div className="dev-only-box-label">開発中（今だけ表示）</div>
        <div style={rowStyle}>
          <button className="btn btn-gray btn-sm"
            title="Discord 出撃共有で送る内容（進行タスクの目標・全マップ分）を JSON で保存して確認する"
            onClick={() => downloadRaidShareData(getShareData())}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Icon name="upload" size={11} color="currentColor" /> 送る内容を確認
          </button>
          <span style={hint}>送るのは進行タスク（ボード登録済み・未完了）の目標だけ</span>
        </div>
      </div>
    </div>
  );
}
