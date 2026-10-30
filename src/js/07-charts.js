// ================== FLEA PRICE HISTORY CHART ==================
// tarkov.dev の historicalItemPrices（最大30日分）を時系列SVG折れ線で表示。
// 外部チャートライブラリは使わずインラインSVGで描画。ホバーでガイド線＋数値ツールチップ。
const PERIOD_OPTIONS = [
  { label: '7日',   days: 7  },
  { label: '2週間', days: 14 },
  { label: '1ヶ月', days: 30 },
];

function FleaHistoryChart({ points, loading, error, showPeriodSelector }) {
  const svgRef = useRef(null);
  const [hover, setHover] = useState(null); // { idx, leftPx }
  const [days, setDays] = useState(7);

  const filteredPoints = React.useMemo(() => {
    if (!points || !showPeriodSelector) return points;
    const maxT = points[points.length - 1].t;
    const perDay = maxT > 1e12 ? 86400000 : 86400;
    const cutoff = maxT - days * perDay;
    return points.filter(p => p.t >= cutoff);
  }, [points, days, showPeriodSelector]);

  const fmtTime = t => new Date(t).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (loading) return (
    <div className="flea-chart-msg">
      <Icon name="refresh" size={14} color="var(--text-secondary)" style={{ animation: 'spin 1s linear infinite' }} /> 価格履歴を取得中…
    </div>
  );
  if (error) return (
    <div className="flea-chart-msg" style={{ color: 'var(--danger-text)' }}>
      <Icon name="alert-triangle" size={14} color="var(--danger-text)" /> 履歴の取得に失敗しました: {error}
    </div>
  );
  if (!points || points.length === 0) return (
    <div className="flea-chart-msg">フリマ価格の履歴データがありません。</div>
  );

  const pts = filteredPoints && filteredPoints.length > 0 ? filteredPoints : points;

  // 横長レイアウト（アスペクト比 約4.5:1）
  const W = 1080, H = 240;
  const m = { top: 16, right: 20, bottom: 30, left: 76 };
  const plotW = W - m.left - m.right;
  const plotH = H - m.top - m.bottom;

  const allVals = [];
  pts.forEach(p => { if (p.price) allVals.push(p.price); if (p.priceMin) allVals.push(p.priceMin); });
  let yMin = Math.min(...allVals), yMax = Math.max(...allVals);
  if (yMin === yMax) { yMin = yMin * 0.95; yMax = yMax * 1.05 || 1; }
  else { const pad = (yMax - yMin) * 0.08; yMin -= pad; yMax += pad; }
  const xMin = pts[0].t, xMax = pts[pts.length - 1].t;
  const xSpan = (xMax - xMin) || 1;

  const sx = t => m.left + ((t - xMin) / xSpan) * plotW;
  const sy = v => m.top + (1 - (v - yMin) / (yMax - yMin)) * plotH;

  const lineFor = key => pts.filter(p => p[key]).map(p => `${sx(p.t).toFixed(1)},${sy(p[key]).toFixed(1)}`).join(' ');
  const avgLine = lineFor('price');
  const minLine = lineFor('priceMin');

  const yTickCount = 5;
  const yTicks = Array.from({ length: yTickCount }, (_, i) => yMax - (i / (yTickCount - 1)) * (yMax - yMin));
  const xTickCount = Math.min(pts.length, 7);
  const xTickIdx = pts.length <= 1
    ? [0]
    : [...new Set(Array.from({ length: xTickCount }, (_, i) => Math.round(i * (pts.length - 1) / (xTickCount - 1))))];

  const handleMove = (e) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const xv = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0, bd = Infinity;
    pts.forEach((p, i) => { const d = Math.abs(sx(p.t) - xv); if (d < bd) { bd = d; best = i; } });
    const px = (sx(pts[best].t) / W) * rect.width;
    const leftPx = Math.max(70, Math.min(rect.width - 70, px));
    setHover({ idx: best, leftPx });
  };

  const hp = hover ? pts[hover.idx] : null;

  return (
    <div style={{ position: 'relative' }}>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', cursor: 'crosshair' }}
        onMouseMove={handleMove} onMouseLeave={() => setHover(null)}>
        {yTicks.map((v, i) => {
          const y = sy(v);
          return (
            <g key={'y' + i}>
              <line x1={m.left} y1={y} x2={W - m.right} y2={y} stroke="var(--border)" strokeWidth="1" strokeDasharray="3 3" />
              <text x={m.left - 8} y={y + 3} textAnchor="end" fontSize="11" fill="var(--text-dim)">{fmtNum(Math.round(v))}</text>
            </g>
          );
        })}
        {xTickIdx.map((idx, i) => {
          const p = pts[idx]; const x = sx(p.t);
          const anchor = i === 0 ? 'start' : (i === xTickIdx.length - 1 ? 'end' : 'middle');
          return <text key={'x' + i} x={x} y={H - 10} textAnchor={anchor} fontSize="11" fill="var(--text-dim)">{fmtTime(p.t)}</text>;
        })}
        {minLine && <polyline points={minLine} fill="none" stroke="var(--state-ok)" strokeWidth="2" />}
        {avgLine && <polyline points={avgLine} fill="none" stroke="var(--accent)" strokeWidth="2" />}
        {pts.map((p, i) => (
          <g key={'d' + i}>
            {p.priceMin ? <circle cx={sx(p.t)} cy={sy(p.priceMin)} r="2" fill="var(--state-ok)" /> : null}
            {p.price ? <circle cx={sx(p.t)} cy={sy(p.price)} r="2" fill="var(--accent)" /> : null}
          </g>
        ))}
        {hp && (
          <g style={{ pointerEvents: 'none' }}>
            <line x1={sx(hp.t)} y1={m.top} x2={sx(hp.t)} y2={H - m.bottom} stroke="var(--text-secondary)" strokeWidth="1" strokeDasharray="4 3" />
            {hp.priceMin ? <circle cx={sx(hp.t)} cy={sy(hp.priceMin)} r="4.5" fill="var(--state-ok)" stroke="var(--bg-secondary)" strokeWidth="1.5" /> : null}
            {hp.price ? <circle cx={sx(hp.t)} cy={sy(hp.price)} r="4.5" fill="var(--accent)" stroke="var(--bg-secondary)" strokeWidth="1.5" /> : null}
          </g>
        )}
      </svg>
      {hp && (
        <div style={{
          position: 'absolute', top: 0, left: hover.leftPx, transform: 'translateX(-50%)',
          pointerEvents: 'none', background: 'var(--bg-primary)', border: '1px solid var(--border)',
          borderRadius: 6, padding: '6px 9px', fontSize: 11, lineHeight: 1.5, whiteSpace: 'nowrap',
          boxShadow: '0 2px 10px rgba(0,0,0,0.35)', zIndex: 5,
        }}>
          <div style={{ color: 'var(--text-dim)', marginBottom: 2 }}>{fmtTime(hp.t)}</div>
          <div style={{ color: 'var(--accent)' }}>平均 {fmt(hp.price)}</div>
          <div style={{ color: 'var(--state-ok-text)' }}>最安 {fmt(hp.priceMin)}</div>
        </div>
      )}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, paddingLeft: 8 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 12, height: 2, background: 'var(--accent)', display: 'inline-block' }} /> 平均価格</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 12, height: 2, background: 'var(--state-ok)', display: 'inline-block' }} /> 最安値</span>
        {showPeriodSelector && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
            {PERIOD_OPTIONS.map(({ label, days: d }) => (
              <button key={d} onClick={() => { setHover(null); setDays(d); }}
                style={{
                  background: days === d ? 'var(--accent)' : 'var(--border)',
                  color: days === d ? 'var(--accent-on)' : 'var(--text-secondary)',
                  fontWeight: days === d ? 'bold' : 'normal',
                  border: 'none', borderRadius: 4, cursor: 'pointer',
                  padding: '2px 8px', fontSize: 11,
                }}>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ================== KEYS (鍵一覧) ==================
// 鍵 → 利用可能マップの対応。tarkov.dev API はキー→マップの構造化データを持たないため、
// 英語名(nameEn)のキーワードで推定する（最善努力・完全ではない）。複数マッチ可。未マッチは「その他」。
// 新しい鍵やマップを足したいときはここに { test, map } を追加する。
const KEY_MAP_RULES = [
  { map: 'Customs',     test: /\bdorm|dormitory|old gas|new gas|portable cabin|portacabin|zb-?\d|factory exit|\bicu\b|cms\b|trailer park|machinery|\bsku\b/i },
  { map: 'Reserve',     test: /\brb-|reserve|\bd-?2\b|\bk-?21\b|armored|\bcmd\b|\bw-?\d/i },
  { map: 'Woods',       test: /\bruaf|scav house|wooden house|usec|\bwz-/i },
  { map: 'Shoreline',   test: /resort|health resort|\bsan\b|west wing|east wing|\bpier\b|cottage|tunnel/i },
  { map: 'Interchange', test: /kiba|\boli\b|idea|goshan|emercom|ultra|mantis|power station|\bnec\b|\bcfm\b|tech light|kands|brutkasten|rasmussen/i },
  { map: 'Lighthouse',  test: /lightkeeper|\bgrunt|rogue|\blk-|salty|side door|chalet|water treatment|mechanic|\bvip\b|hermetic|\blkz/i },
  { map: 'Streets',     test: /streets|chekannaya|lexos|cardinal|primorsky|\bsbih|klimov|pinewood|\btl-|abandoned factory|financial|expansion|concordia|relaxation|nakatani|\bsk-|tg shop|cult/i },
  { map: 'The Lab',     test: /keycard|terragroup|access keycard|\blab\b|object #?\d|ground level|manager.?s office|arsenal|parking gate|violet|cyan|crimson/i },
  { map: 'Factory',     test: /\bfactory key|pumping station|office key.*factory|\b3rd floor/i },
  { map: 'Ground Zero', test: /ground zero|\bgz\b|teamhaus|nikita|unknown key|capital|terragroup heating|emercom medical/i },
];
function keyMapsFor(item) {
  const s = (item.nameEn || item.name || '').toLowerCase();
  const maps = KEY_MAP_RULES.filter(r => r.test.test(s)).map(r => r.map);
  return maps.length ? [...new Set(maps)] : ['その他'];
}
function isKeyItem(item) {
  return (item.types || []).includes('keys')
    || (item.categories || []).some(c => /key|鍵|キー/i.test(c.name || ''));
}

// 複数の鍵のフリマ平均価格を1枚のグラフに重ねて表示。カーソル最寄りの線をハイライトして鍵名を表示。
// series: [{ id, name, shortName, color, points: [{ t, price }] }]
function MultiLineFleaChart({ series, loadingCount = 0 }) {
  const svgRef = useRef(null);
  const [hover, setHover] = useState(null); // { si, pi, leftPx }

  const fmtTime = t => new Date(t).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const valid = (series || []).filter(s => s.points && s.points.length);

  if (!valid.length) return (
    <div className="flea-chart-msg">
      {loadingCount > 0
        ? <><Icon name="refresh" size={14} color="var(--text-secondary)" style={{ animation: 'spin 1s linear infinite' }} /> 価格履歴を取得中…（{loadingCount}件）</>
        : 'この条件に該当する鍵のフリマ履歴データがありません。'}
    </div>
  );

  const W = 1080, H = 320;
  const m = { top: 16, right: 20, bottom: 30, left: 86 };
  const plotW = W - m.left - m.right;
  const plotH = H - m.top - m.bottom;

  let yMin = Infinity, yMax = -Infinity, xMin = Infinity, xMax = -Infinity;
  valid.forEach(s => s.points.forEach(p => {
    if (p.price < yMin) yMin = p.price; if (p.price > yMax) yMax = p.price;
    if (p.t < xMin) xMin = p.t; if (p.t > xMax) xMax = p.t;
  }));
  if (yMin === yMax) { yMin *= 0.95; yMax = yMax * 1.05 || 1; }
  else { const pad = (yMax - yMin) * 0.08; yMin -= pad; yMax += pad; }
  const xSpan = (xMax - xMin) || 1;
  const sx = t => m.left + ((t - xMin) / xSpan) * plotW;
  const sy = v => m.top + (1 - (v - yMin) / (yMax - yMin)) * plotH;

  const yTickCount = 5;
  const yTicks = Array.from({ length: yTickCount }, (_, i) => yMax - (i / (yTickCount - 1)) * (yMax - yMin));
  const xTickCount = 6;
  const xTicks = Array.from({ length: xTickCount }, (_, i) => xMin + (i / (xTickCount - 1)) * xSpan);

  const handleMove = (e) => {
    const svg = svgRef.current; if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const xv = ((e.clientX - rect.left) / rect.width) * W;
    const yv = ((e.clientY - rect.top) / rect.height) * H;
    let best = null, bd = Infinity;
    valid.forEach((s, si) => s.points.forEach((p, pi) => {
      const d = Math.hypot(sx(p.t) - xv, sy(p.price) - yv);
      if (d < bd) { bd = d; best = { si, pi }; }
    }));
    if (!best) return;
    const p = valid[best.si].points[best.pi];
    const px = (sx(p.t) / W) * rect.width;
    setHover({ ...best, leftPx: Math.max(80, Math.min(rect.width - 80, px)) });
  };

  const hs = hover ? valid[hover.si] : null;
  const hp = hover ? hs.points[hover.pi] : null;

  return (
    <div style={{ position: 'relative' }}>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', cursor: 'crosshair' }}
        onMouseMove={handleMove} onMouseLeave={() => setHover(null)}>
        {yTicks.map((v, i) => {
          const y = sy(v);
          return (
            <g key={'y' + i}>
              <line x1={m.left} y1={y} x2={W - m.right} y2={y} stroke="var(--border)" strokeWidth="1" strokeDasharray="3 3" />
              <text x={m.left - 8} y={y + 3} textAnchor="end" fontSize="11" fill="var(--text-dim)">{fmtNum(Math.round(v))}</text>
            </g>
          );
        })}
        {xTicks.map((t, i) => {
          const x = sx(t);
          const anchor = i === 0 ? 'start' : (i === xTicks.length - 1 ? 'end' : 'middle');
          return <text key={'x' + i} x={x} y={H - 10} textAnchor={anchor} fontSize="11" fill="var(--text-dim)">{fmtTime(t)}</text>;
        })}
        {valid.map((s, si) => {
          const dim = hover && hover.si !== si;
          const line = s.points.map(p => `${sx(p.t).toFixed(1)},${sy(p.price).toFixed(1)}`).join(' ');
          return <polyline key={s.id} points={line} fill="none" stroke={s.color}
            strokeWidth={hover && hover.si === si ? 2.6 : 1.5} opacity={dim ? 0.18 : 0.9} />;
        })}
        {hp && (
          <g style={{ pointerEvents: 'none' }}>
            <line x1={sx(hp.t)} y1={m.top} x2={sx(hp.t)} y2={H - m.bottom} stroke="var(--text-secondary)" strokeWidth="1" strokeDasharray="4 3" />
            <circle cx={sx(hp.t)} cy={sy(hp.price)} r="4.5" fill={hs.color} stroke="var(--bg-secondary)" strokeWidth="1.5" />
          </g>
        )}
      </svg>
      {hp && (
        <div style={{
          position: 'absolute', top: 0, left: hover.leftPx, transform: 'translateX(-50%)',
          pointerEvents: 'none', background: 'var(--bg-primary)', border: `1px solid ${hs.color}`,
          borderRadius: 6, padding: '6px 9px', fontSize: 11, lineHeight: 1.5, whiteSpace: 'nowrap',
          boxShadow: '0 2px 10px rgba(0,0,0,0.35)', zIndex: 5,
        }}>
          <div style={{ color: hs.color, fontWeight: 'bold' }}>{hs.name}</div>
          <div style={{ color: 'var(--text-dim)' }}>{fmtTime(hp.t)}</div>
          <div style={{ color: 'var(--text-primary)' }}>平均 {fmt(hp.price)}</div>
        </div>
      )}
      {/* 凡例 */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 11, color: 'var(--text-secondary)', marginTop: 6, paddingLeft: 8 }}>
        {valid.map((s, si) => (
          <span key={s.id}
            onMouseEnter={() => setHover({ si, pi: s.points.length - 1, leftPx: 0 })}
            onMouseLeave={() => setHover(null)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'default',
              opacity: hover && hover.si !== si ? 0.4 : 1 }}>
            <span style={{ width: 12, height: 2, background: s.color, display: 'inline-block' }} /> {s.shortName || s.name}
          </span>
        ))}
        {loadingCount > 0 && <span style={{ color: 'var(--text-dim)' }}>（{loadingCount}件 読込中…）</span>}
      </div>
    </div>
  );
}

