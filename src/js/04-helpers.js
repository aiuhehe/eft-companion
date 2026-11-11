// ================== HELPERS ==================
// "13M" → 13000000, "13.4M" → 13400000, "34k" → 34000, "500" → 500
function parseShorthand(v) {
  if (v === '' || v === null || v === undefined) return 0;
  const s = String(v).trim().replace(/,/g, '');
  const m = s.match(/^([\d.]+)\s*([kmKM]?)$/i);
  if (!m) return parseInt(s) || 0;
  const num = parseFloat(m[1]);
  const suffix = m[2].toLowerCase();
  if (suffix === 'k') return Math.round(num * 1_000);
  if (suffix === 'm') return Math.round(num * 1_000_000);
  return Math.round(num);
}

function fmt(n) {
  if (n === undefined || n === null) return '-';
  return Number(n).toLocaleString('ja-JP') + ' ₽';
}
function fmtNum(n) {
  return Number(n).toLocaleString('ja-JP');
}
function fmtCurrency(n, currency) {
  if (n === undefined || n === null) return '-';
  const num = Number(n).toLocaleString('ja-JP');
  if (currency === 'USD') return `$${num}`;
  if (currency === 'EUR') return `€${num}`;
  return `${num} ₽`;
}
// トレーダーの通貨記号
function getCurrencySymbol(currency) {
  if (currency === 'USD') return '$';
  if (currency === 'EUR') return '€';
  return '₽';
}

// ================== WIKI FETCH ==================
const AD_SELECTORS = [
  '.adsbygoogle', '[id^="ad-"]', '[class*="advertisement"]',
  '[class*="sidebar"]', '.page-header', '#header', 'header',
  '#footer', 'footer', 'nav', '.navigation', '.breadcrumb',
  '.edit-btn', '.page-tools', '#toolbar', '.toolbar',
  'script', 'style[data-ad]',
];

async function fetchWikiHTML(jpWikiUrl) {
  // 複数プロキシをフォールバック
  const proxies = [
    async (url) => {
      const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(20000) });
      if (!res.ok) throw new Error(res.status);
      return res.text();
    },
    async (url) => {
      const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(20000) });
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      return data.contents;
    },
    async (url) => {
      const res = await fetch(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(20000) });
      if (!res.ok) throw new Error(res.status);
      return res.text();
    },
  ];

  let html = null;
  let lastError = null;
  for (const proxy of proxies) {
    try { html = await proxy(jpWikiUrl); break; }
    catch (e) { lastError = e; }
  }
  if (!html) throw new Error('全プロキシ失敗: ' + lastError?.message);

  // DOMParserで解析・広告除去
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // 広告・ナビゲーション除去
  AD_SELECTORS.forEach(sel => {
    doc.querySelectorAll(sel).forEach(el => el.remove());
  });

  // base タグを追加してCSSや画像の相対パスを解決
  const base = doc.createElement('base');
  base.href = 'https://wikiwiki.jp';
  doc.head.prepend(base);

  // レイアウト補助CSS（色は元ページのまま）
  const style = doc.createElement('style');
  style.textContent = `
    body { padding: 16px !important; }
    img { max-width: 100% !important; }
    table { border-collapse: collapse !important; width: 100% !important; }
  `;
  doc.head.appendChild(style);

  const finalHtml = '<!DOCTYPE html>' + doc.documentElement.outerHTML;
  const blob = new Blob([finalHtml], { type: 'text/html;charset=utf-8' });
  return URL.createObjectURL(blob);
}


// 画像ファイル(Blob)を縮小して dataURL 化（タスク品アイコン用・localStorage 容量対策で最大 maxSize px）
function imageFileToIconDataUrl(file, maxSize = 128) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type || !file.type.startsWith('image/')) { reject(new Error('画像ファイルではありません')); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('画像を読み込めませんでした')); };
    img.src = url;
  });
}

// スクリーンショット等を縮小して JPEG dataURL 化（ピンの詳細位置画像用・localStorage 容量対策）
function imageFileToPhotoDataUrl(file, maxSize = 1280, quality = 0.8) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type || !file.type.startsWith('image/')) { reject(new Error('画像ファイルではありません')); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('画像を読み込めませんでした')); };
    img.src = url;
  });
}

// アーマープレートの部位（zones の表示名）→ 'front' | 'back' | 'left' | 'right' | null
// 日本語訳は FR. PLATE / F. PLATE（前）・BCK. PLATE・L. PLATE・R. PLATE。
// 未翻訳時の生キー（`Armor Zone Plate_Granit_SAPI_chest` 等）や英語表記にも対応する
const ARMOR_ZONE_FILTERS = [
  ['front', 'FR. PLATE'],
  ['back',  'BCK. PLATE'],
  ['left',  'L. PLATE'],
  ['right', 'R. PLATE'],
];
function armorZoneKind(label) {
  const s = String(label || '').toLowerCase();
  if (/back|bck/.test(s)) return 'back';
  if (/left|^l\./.test(s)) return 'left';
  if (/right|^r\./.test(s)) return 'right';
  if (/chest|front|^fr?\./.test(s)) return 'front';
  return null;
}
// プレート一覧の列: クラス / 耐久値 / ブラント透過率 / アイコン / 名前 / 部位 / 入手手段
const ARMOR_GRID_COLS = '40px 52px 66px 34px minmax(130px,1fr) minmax(0,0.8fr) minmax(0,1.4fr)';

// ===== タスクの受注条件・プライオリティ（2026-11-11） =====
// API に priority の値はないため、経験値の段階（3,000 / 10,000 / 28,000 / 65,000）から推定する。
// 同じ解放グループ（globalVariable）のタスクはほぼ全件この4段階のどれかに揃っている
const TASK_PRIORITY_TIERS = [
  { tier: 1, exp: 3000,  label: 'P1', color: 'var(--text-secondary)' },
  { tier: 2, exp: 10000, label: 'P2', color: 'var(--info)' },
  { tier: 3, exp: 28000, label: 'P3', color: 'var(--warn-text)' },
  { tier: 4, exp: 65000, label: 'P4', color: 'var(--danger-text)' },
];
function getTaskPriorityTier(exp) {
  return TASK_PRIORITY_TIERS.find(t => t.exp === exp) || null;
}
function _compareReq(actual, method, value) {
  switch (method) {
    case '>':  return actual > value;
    case '<':  return actual < value;
    case '<=': return actual <= value;
    case '=': case '==': return actual === value;
    default:   return actual >= value;
  }
}
// 受注条件の判定。group（解放グループ）はカウンターの増え方が API に無く判定できないので blocking に含めない
// 戻り値: { ok, levelOk, traderReqs: [{ ...req, ok, label }], prereqs: [{ id, name, ok }] }
function getTaskUnlockStatus(task, { playerLevel, traderStatus, completedSet }) {
  const levelOk = !(task.minPlayerLevel > 0) || playerLevel >= task.minPlayerLevel;
  const traderReqs = (task.traderRequirements || []).map(r => {
    const st = traderStatus?.[r.trader?.id] || {};
    const isLevel = r.requirementType === 'level';
    const actual = isLevel ? (st.ll || 1) : (parseFloat(st.rep) || 0);
    const ok = _compareReq(actual, r.compareMethod, r.value);
    const label = isLevel
      ? `${r.trader?.name} LL${r.value}`
      : `${r.trader?.name} 信頼度 ${r.compareMethod} ${r.value}`;
    return { ...r, ok, label };
  });
  // 前提が「完了」以外（受注中・失敗）の条件はアプリで追跡していないので満たしている扱い
  const prereqs = (task.taskRequirements || []).map(r => ({
    id: r.task.id, name: r.task.name,
    ok: completedSet.has(r.task.id) || (r.status?.length > 0 && !r.status.includes('complete')),
  }));
  const ok = levelOk && traderReqs.every(r => r.ok) && prereqs.every(r => r.ok);
  return { ok, levelOk, traderReqs, prereqs };
}
