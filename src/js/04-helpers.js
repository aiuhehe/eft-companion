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
