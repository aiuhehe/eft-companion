  const StashControl = ({ itemId, have, onUpdate }) => {
    if (LARGE_INPUT_ITEM_IDS.has(itemId)) {
      return (
        <input
          key={have}
          type="number" min="0" defaultValue={have}
          onBlur={e => {
            const next = Math.max(0, parseInt(e.target.value) || 0);
            if (next !== have) onUpdate(itemId, next - have);
          }}
          style={{ width: 72, padding: '2px 6px', borderRadius: 3, border: '1px solid var(--border)',
            background: 'var(--bg-secondary)', color: have > 0 ? 'var(--accent)' : 'var(--text-dim)',
            fontSize: 13, fontWeight: have > 0 ? 'bold' : 'normal', textAlign: 'right' }}
        />
      );
    }
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
        <button onClick={() => onUpdate(itemId, -1)} disabled={have <= 0}
          style={{ width: 20, height: 20, border: 'none', borderRadius: 3, cursor: have > 0 ? 'pointer' : 'default',
            background: have > 0 ? 'var(--border)' : 'var(--bg-secondary)', color: have > 0 ? 'var(--text-primary)' : 'var(--text-dim)',
            fontSize: 14, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
        <span style={{ minWidth: 24, textAlign: 'center', fontSize: 13, color: have > 0 ? 'var(--accent)' : 'var(--text-dim)', fontWeight: have > 0 ? 'bold' : 'normal' }}>{have}</span>
        <button onClick={() => onUpdate(itemId, 1)}
          style={{ width: 20, height: 20, border: 'none', borderRadius: 3, cursor: 'pointer',
            background: 'var(--border)', color: 'var(--text-primary)',
            fontSize: 14, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>＋</button>
      </span>
    );
  };

  const Tooltip = ({ text, children }) => {
    const [show, setShow] = React.useState(false);
    return (
      <span style={{ position: 'relative', display: 'inline-flex' }}
        onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
        {children}
        {show && (
          <span style={{
            position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
            background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)',
            fontSize: 11, padding: '4px 8px', borderRadius: 4, whiteSpace: 'nowrap',
            pointerEvents: 'none', zIndex: 9999, marginBottom: 4,
          }}>{text}</span>
        )}
      </span>
    );
  };

  const BarterCard = ({ barter: b, stash, traderStatus, onRemove, onAddFav, onAddWishlist, onAddPlan, isFav, isWishlist, inPlan, updateStash, accentColor }) => {
    const st = traderStatus[b.traderId] || { ll: 1 };
    const accessible = st.ll >= b.level;
    const allReady = b.requiredItems.every(({ item, count }) => parseInt(stash[item.id] || 0) >= count);
    return (
      <div className="barter-card" style={{
        background: allReady ? 'var(--state-ok-bg-weak)' : 'var(--bg-primary)',
        border: `1px solid ${allReady ? 'var(--state-ok)' : accentColor || 'var(--accent)'}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 180 }}>
            {b.resultItem.iconLink
              ? <img src={b.resultItem.iconLink} alt={b.resultItem.shortName}
                  className="result-icon"
                  onError={e => { e.target.style.display = 'none'; }} />
              : <div className="result-icon" />
            }
            <div>
              <div style={{ fontWeight: 'bold', fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                {b.resultItem.name}
                {b.rewardCount > 1 && <span style={{ color: accentColor || 'var(--accent)', marginLeft: 4 }}>×{b.rewardCount}</span>}
              </div>
              <div style={{ marginTop: 2 }}>
                <span className={`ll-badge ${accessible ? 'is-ok' : 'is-locked'}`}>
                  {b.traderName} LL{b.level}{accessible ? '' : <Icon name="lock" size={11} color="var(--danger)" style={{marginLeft:3}} />}
                </span>
                {allReady && <span style={{ fontSize: 11, color: 'var(--state-ok-text)', marginLeft: 6 }}><Icon name="circle-check" size={12} color="var(--state-ok-text)" />{" "}交換可能</span>}
              </div>
            </div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {b.requiredItems.map(({ item, count }) => {
              const have = parseInt(stash[item.id] || 0);
              const ok = have >= count;
              return (
                <span key={item.id} className={`req-chip${ok ? ' is-ok' : ''}`}>
                  {item.iconLink && <img src={item.iconLink} alt="" className="req-chip-icon" onError={e => { e.target.style.display='none'; }} />}
                  {item.name} {have}/{count}
                  <StashControl itemId={item.id} have={have} onUpdate={updateStash} />
                </span>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            {onAddFav && (
              <button onClick={onAddFav} title="お気に入りに追加" className="card-btn"
                style={{ background: isFav ? 'var(--fav-bg)' : 'var(--bg-secondary)', color: isFav ? 'var(--fav-text)' : 'var(--text-dim)' }}>
                <Icon name="heart" size={13} color={isFav?'var(--fav-text)':'var(--text-dim)'} />
              </button>
            )}
            {onAddWishlist && (
              <button onClick={onAddWishlist} title="狙いリストに追加" className="card-btn"
                style={{ background: isWishlist ? 'var(--warn-bg)' : 'var(--bg-secondary)', color: isWishlist ? 'var(--warn-text)' : 'var(--text-dim)' }}>
                <Icon name="star" size={13} color={isWishlist?'var(--warn-text)':'var(--text-dim)'} />
              </button>
            )}
            {onAddPlan && (
              <button onClick={onAddPlan} title={inPlan ? 'プランに追加済み' : 'プランに追加'} className="card-btn"
                style={{ background: inPlan ? 'var(--accent-muted)' : 'var(--bg-secondary)', color: inPlan ? 'var(--accent)' : 'var(--text-dim)' }}>
                <Icon name="calendar-plus" size={13} color="currentColor" />
              </button>
            )}
            <button
              onClick={() => {
                b.requiredItems.forEach(({ item, count }) => updateStash(item.id, -count));
                addJournalGet(`${b.resultItem.name}${b.rewardCount > 1 ? ` ×${b.rewardCount}` : ''}`, 'barter');
              }}
              title="入手済み — 作った分だけ素材が減算されます"
              className="card-btn"
              style={{ background: 'var(--state-ok-bg)', color: 'var(--state-ok-text)', display:'inline-flex', alignItems:'center', gap:4 }}>
              <Icon name="circle-check" size={13} color="var(--state-ok-text)" /> GET
            </button>
            <button onClick={onRemove} title="リストから削除" className="card-btn"
              style={{ background: 'var(--bg-secondary)', color: 'var(--danger)' }}>
              <Icon name="x" size={13} color="var(--danger)" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const CraftCard = ({ craft: c, stash, onRemove, updateStash, hideoutLevels }) => {
    const stationLv = hideoutLevels?.[c.stationId] || 0;
    const accessible = stationLv >= c.level;
    const allReady = c.requiredItems.every(({ item, count }) => parseInt(stash[item.id] || 0) >= count);
    const durationMin = Math.round((c.duration || 0) / 60);
    return (
      <div className="craft-card" style={{
        background: allReady ? 'var(--state-ok-bg-weak)' : 'var(--bg-primary)',
        border: `1px solid ${allReady ? 'var(--state-ok)' : 'var(--border)'}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 180 }}>
            {c.resultItem.iconLink
              ? <img src={c.resultItem.iconLink} alt={c.resultItem.shortName}
                  className="result-icon"
                  onError={e => { e.target.style.display = 'none'; }} />
              : <div className="result-icon" />
            }
            <div>
              <div style={{ fontWeight: 'bold', fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                {c.resultItem.name}
                {c.rewardCount > 1 && <span style={{ color: '#a78bfa', marginLeft: 4 }}>×{c.rewardCount}</span>}
              </div>
              <div style={{ marginTop: 2 }}>
                <span className={`ll-badge ${accessible ? 'is-ok' : 'is-locked'}`}>
                  <Icon name="building" size={10} color={accessible?'var(--state-ok-text)':'var(--danger)'} style={{marginRight:2}} />
                  {c.stationName} Lv{c.level}
                </span>
                {durationMin > 0 && <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 6 }}><Icon name="clock" size={11} color="#94a3b8" />{" "}{durationMin}分</span>}
                {allReady && <span style={{ fontSize: 11, color: 'var(--state-ok-text)', marginLeft: 6 }}><Icon name="circle-check" size={12} color="var(--state-ok-text)" />{" "}作成可能</span>}
              </div>
            </div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {c.requiredItems.map(({ item, count }) => {
              const have = parseInt(stash[item.id] || 0);
              const ok = have >= count;
              return (
                <span key={item.id} className={`req-chip${ok ? ' is-ok' : ''}`}>
                  {item.iconLink && <img src={item.iconLink} alt="" className="req-chip-icon" onError={e => { e.target.style.display='none'; }} />}
                  {item.name} {have}/{count}
                  <StashControl itemId={item.id} have={have} onUpdate={updateStash} />
                </span>
              );
            })}
          </div>
          <button
            onClick={() => {
              c.requiredItems.forEach(({ item, count }) => updateStash(item.id, -count));
              addJournalGet(`${c.resultItem.name}${c.rewardCount > 1 ? ` ×${c.rewardCount}` : ''}`, 'craft');
            }}
            title="作成完了 — 作った分だけ素材が減算されます"
            className="card-btn"
            style={{ background: 'var(--info-bg)', color: 'var(--info)', flexShrink: 0, display:'inline-flex', alignItems:'center', gap:4 }}>
            <Icon name="tool" size={13} color="var(--info)" /> GET
          </button>
          <button onClick={onRemove} title="リストから削除" className="card-btn"
            style={{ background: '#2d3748', color: 'var(--danger)', flexShrink: 0 }}>
            <Icon name="x" size={13} color="var(--danger)" />
          </button>
        </div>
      </div>
    );
  };

  const BarterSummaryBlock = ({ label, labelIcon, color, barters, items, stash, traderStatus }) => {
    const [onlyMissing, setOnlyMissing] = React.useState(true);
    const [expanded, setExpanded] = React.useState(true);
    const readyCount = barters.filter(b =>
      b.requiredItems.every(({ item, count }) => parseInt(stash[item.id] || 0) >= count)
    ).length;
    const displayItems = onlyMissing ? items.filter(({ remaining }) => remaining > 0) : items;
    const LIMIT = 8;
    const visibleItems = expanded ? displayItems : displayItems.slice(0, LIMIT);
    const hiddenCount = displayItems.length - LIMIT;
    return (
      <div style={{ minWidth: 200, flex: '1 1 200px' }}>
        <div style={{ fontSize: 13, fontWeight: 'bold', color, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name={labelIcon} size={13} color={color} /> {label}
          <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 'normal' }}>({barters.length}件)</span>
        </div>
        {barters.length === 0
          ? <div style={{ color: 'var(--text-dim)', fontSize: 12 }}>なし</div>
          : <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                <div style={{ fontSize: 12, color: 'var(--state-ok-text)' }}>
                  交換可能: <span style={{ fontWeight: 'bold' }}>{readyCount} / {barters.length}</span>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
                  <input type="checkbox" checked={onlyMissing} onChange={e => { setOnlyMissing(e.target.checked); setExpanded(false); }} style={{ cursor: 'pointer' }} />
                  不足のみ
                </label>
              </div>
              {displayItems.length === 0
                ? <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>材料はすべて揃っています</div>
                : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                  {visibleItems.map(({ item, needed, have, remaining }) => {
                    const ok = remaining === 0;
                    return (
                      <span key={item.id} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 3,
                        fontSize: 10, padding: '1px 5px', borderRadius: 3,
                        background: ok ? 'var(--state-ok-bg)' : 'var(--bg-secondary)',
                        color: ok ? 'var(--state-ok-text)' : remaining === 1 ? 'var(--danger-text)' : 'var(--text-secondary)',
                        border: `1px solid ${ok ? 'var(--state-ok)' : remaining === 1 ? 'var(--danger)' : 'var(--border)'}`,
                        whiteSpace: 'nowrap',
                      }}>
                        {item.iconLink && <img src={item.iconLink} alt="" style={{ width: 14, height: 14, objectFit: 'contain', borderRadius: 2 }} onError={e => { e.target.style.display='none'; }} />}
                        {item.name} {have}/{needed}
                      </span>
                    );
                  })}
                  {!expanded && hiddenCount > 0 && (
                    <span
                      onClick={() => setExpanded(true)}
                      style={{ fontSize: 10, color: 'var(--accent)', cursor: 'pointer', padding: '1px 5px', borderRadius: 3,
                        border: '1px solid var(--accent-muted)', background: 'var(--bg-secondary)', whiteSpace: 'nowrap' }}>
                      他{hiddenCount}種 ▼
                    </span>
                  )}
                  {expanded && displayItems.length > LIMIT && (
                    <span
                      onClick={() => setExpanded(false)}
                      style={{ fontSize: 10, color: 'var(--text-dim)', cursor: 'pointer', padding: '1px 5px', borderRadius: 3,
                        border: '1px solid var(--border)', background: 'var(--bg-secondary)', whiteSpace: 'nowrap' }}>
                      閉じる ▲
                    </span>
                  )}
                </div>
              )}
            </>
        }
      </div>
    );
  };

  // 武器カード（入手方法ホバーツールチップ付き）
  const WeaponCard = ({ weapon }) => {
    const [show, setShow] = React.useState(false);
    const [pos, setPos] = React.useState({ x: 0, y: 0 });
    const hideTimer = React.useRef(null);

    const startHide = () => { hideTimer.current = setTimeout(() => setShow(false), 180); };
    const cancelHide = () => { if (hideTimer.current) clearTimeout(hideTimer.current); };

    // 入手方法を収集（weaponAcqMap はクロージャ経由で参照）
    const acqLines = React.useMemo(() => {
      const lines = [];
      const acq = weaponAcqMap.get(weapon.id) || { buy: [], barter: [], craft: [] };
      // 直販（LL昇順・重複トレーダー名除去）
      const seenBuy = new Set();
      acq.buy.slice().sort((a, b) => (a.ll || 99) - (b.ll || 99)).forEach(b => {
        const key = `${b.traderName}-${b.taskId || ''}`;
        if (seenBuy.has(key)) return;
        seenBuy.add(key);
        if (b.taskId) {
          lines.push({ kind: 'buyTask', label: `${b.traderName} LL${b.ll} 購入解放`, taskName: b.taskName, taskId: b.taskId });
        } else {
          lines.push({ kind: 'buy', label: `${b.traderName} LL${b.ll} 直販` });
        }
      });
      // 物々交換（重複除去）
      const seenBarter = new Set();
      acq.barter.slice().sort((a, b) => (a.ll || 99) - (b.ll || 99)).forEach(b => {
        const key = `${b.traderName}-${b.ll}`;
        if (seenBarter.has(key)) return;
        seenBarter.add(key);
        lines.push({ kind: 'barter', label: `${b.traderName} LL${b.ll} 物々交換` });
      });
      // クラフト
      acq.craft.forEach(c => {
        lines.push({ kind: 'craft', label: `${c.stationName} Lv${c.ll} クラフト` });
      });
      if (lines.length === 0) lines.push({ kind: 'none', label: '入手手段不明' });
      return lines;
    }, [weapon.id, weaponAcqMap]);

    const TOOLTIP_W = 260;
    const vpW = window.innerWidth;
    const vpH = window.innerHeight;
    const left = Math.min(pos.x + 12, vpW - TOOLTIP_W - 8);
    const estH = 32 + acqLines.length * 28;
    const top = pos.y + 12 + estH > vpH ? pos.y - estH - 8 : pos.y + 12;

    const chipColor = {
      buy:        { bg: 'var(--bg-card)', color: 'var(--text-secondary)', border: 'var(--border)' },
      buyTask:    { bg: 'var(--accent-muted)', color: 'var(--accent)', border: 'var(--accent)' },
      barter:     { bg: 'var(--warn-bg-weak)', color: 'var(--warn-text)', border: 'var(--warn)' },
      barterTask: { bg: 'var(--warn-bg-weak)', color: 'var(--warn-text)', border: 'var(--warn)' },
      craft:      { bg: 'var(--info-bg)', color: 'var(--info)', border: 'var(--info)' },
      none:       { bg: 'var(--bg-card)', color: 'var(--text-dim)', border: 'var(--border-light)' },
    };
    const chipIcon = { buy: 'shopping-cart', buyTask: 'shopping-cart', barter: 'refresh', barterTask: 'refresh', craft: 'tool', none: 'circle-x' };

    return (
      <div
        onMouseEnter={e => { cancelHide(); setShow(true); setPos({ x: e.clientX, y: e.clientY }); }}
        onMouseLeave={startHide}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px',
          background: 'var(--bg-card)', borderRadius: 5, border: '1px solid var(--border-light)',
          cursor: 'default', position: 'relative',
        }}
      >
        {weapon.iconLink && (
          <img src={weapon.iconLink} alt="" style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: 3, flexShrink: 0 }}
            onError={e => { e.target.style.display = 'none'; }} />
        )}
        <span style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {weapon.shortName || weapon.name}
        </span>
        {show && (
          <div
            onMouseEnter={cancelHide}
            onMouseLeave={startHide}
            style={{
              position: 'fixed', left, top, width: TOOLTIP_W, zIndex: 99999,
              background: 'var(--bg-secondary)', border: '1px solid var(--border)',
              borderRadius: 7, padding: '8px 10px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 7, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Icon name="backpack" size={11} color="var(--text-dim)" />
              {weapon.name}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {acqLines.map((line, i) => {
                const c = chipColor[line.kind] || chipColor.none;
                const ic = chipIcon[line.kind] || 'arrow-right';
                const hasTask = line.taskId;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontSize: 11, padding: '3px 8px', borderRadius: 10,
                      background: c.bg, color: c.color, border: `1px solid ${c.border}`, whiteSpace: 'nowrap',
                    }}>
                      <Icon name={ic} size={10} color={c.color} /> {line.label}
                    </span>
                    {hasTask && (
                      <button
                        onClick={() => { setActiveTab('tasks'); searchForTaskByName(line.taskName, line.taskId); }}
                        style={{
                          fontSize: 10, padding: '2px 7px', borderRadius: 10, cursor: 'pointer',
                          background: 'var(--accent-muted)', color: 'var(--accent)', border: '1px solid var(--accent)',
                          display: 'inline-flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap', flexShrink: 0,
                        }}
                        title="タスク検索へ移動"
                      >
                        <Icon name="list-check" size={10} color="var(--accent)" /> {line.taskName}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  // 口径別セクション（クリックで武器パネル開閉）
  const AmmoCaliberSection = ({ caliber, maxPen, rounds, weaponsByCaliber, ammoPackMap, sectionId }) => {
    const [expanded, setExpanded] = React.useState(false);
    const weapons = (weaponsByCaliber && weaponsByCaliber.get(caliber)) || [];

    return (
      <div id={sectionId} data-caliber={caliber} className="section" style={{ marginBottom: 12 }}>
        {/* 口径タイトル（クリックで武器パネル開閉） */}
        <div
          className="section-title"
          onClick={() => weapons.length > 0 && setExpanded(e => !e)}
          style={{ marginBottom: 8, cursor: weapons.length > 0 ? 'pointer' : 'default', userSelect: 'none' }}
        >
          <Icon name="target" size={13} color="var(--accent)" /> {caliber}
          <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 'normal', marginLeft: 6 }}>最大PEN {maxPen}</span>
          {weapons.length > 0 && (
            <span style={{ fontSize: 10, color: 'var(--text-dim)', marginLeft: 8, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <Icon name="backpack" size={10} color="var(--text-dim)" /> {weapons.length}種の銃
              <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={10} color="var(--text-dim)" />
            </span>
          )}
        </div>

        {/* 武器パネル */}
        {expanded && weapons.length > 0 && (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: 5, marginBottom: 10, padding: '8px 10px',
            background: 'var(--bg-primary)', borderRadius: 6, border: '1px solid var(--border-light)',
          }}>
            {weapons.map(w => <WeaponCard key={w.id} weapon={w} />)}
          </div>
        )}

        {/* 弾薬リスト */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {rounds.map(a => {
            const it = a.item;
            const acqs = getAmmoAcquisitions(it);
            const packs = ammoPackMap[it.id] || [];
            const base = {
              fontSize: 11, padding: '2px 7px', borderRadius: 10, whiteSpace: 'nowrap',
              display: 'inline-flex', alignItems: 'center', gap: 3, border: '1px solid transparent',
            };
            const labelStyle = { fontSize: 10, fontWeight: 'bold', color: 'var(--text-dim)', width: 38, flexShrink: 0 };
            const lineStyle = { display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' };
            const looseChips = acqs.filter(q => q.kind !== 'barter');
            const barterAcqs = acqs.filter(q => q.kind === 'barter');
            const hasPackBarter = packs.some(p => p.traders.some(t => t.includes('物々交換')));
            const barterFallback = hasPackBarter ? [] : barterAcqs;
            const showPackLine = packs.length > 0 || barterFallback.length > 0;
            const renderLoose = (q, i) => {
              if (q.kind === 'task') {
                return (
                  <button key={i} onClick={() => { setActiveTab('tasks'); searchForTaskByName(q.taskName, q.taskId); }}
                    style={{ ...base, cursor: 'pointer', background: 'var(--accent-muted)', color: 'var(--accent)', borderColor: 'var(--accent)' }}
                    title="タスク検索へ移動">
                    <Icon name="list-check" size={11} color="var(--accent)" /> {q.label}
                  </button>
                );
              }
              if (q.kind === 'craft') {
                return (
                  <button key={i} onClick={() => goToHideoutStation(q.stationId)}
                    style={{ ...base, cursor: 'pointer', background: 'var(--info-bg)', color: 'var(--info)', borderColor: 'var(--info)' }}
                    title="ハイドアウトへ移動">
                    <Icon name="home" size={11} color="var(--info)" /> {q.label}
                  </button>
                );
              }
              const dim = q.kind === 'none';
              return (
                <span key={i} style={{ ...base, background: 'var(--bg-card)', color: dim ? 'var(--text-dim)' : 'var(--text-secondary)', borderColor: 'var(--border)' }}>
                  {q.label}
                </span>
              );
            };
            return (
              <div key={it.id} style={{
                display: 'grid',
                gridTemplateColumns: '46px 46px 34px minmax(120px,1fr) 54px minmax(0,1.7fr)',
                alignItems: 'center', gap: 8, padding: '5px 8px',
                background: 'var(--bg-secondary)', borderRadius: 6, border: '1px solid var(--border-light)',
              }}>
                <span title="貫通力（アーマーを貫通できるか）" style={{
                  textAlign: 'center', fontWeight: 'bold', fontSize: 13,
                  color: 'var(--accent)', background: 'var(--accent-muted)', borderRadius: 4, padding: '2px 4px',
                }}>{a.penetrationPower}</span>
                <span title="ダメージ" style={{
                  textAlign: 'center', fontWeight: 'bold', fontSize: 13,
                  color: 'var(--danger-text)', background: 'var(--danger-bg-mid)', borderRadius: 4, padding: '2px 4px',
                }}>{a.damage}</span>
                <span style={{ display: 'inline-flex', justifyContent: 'center' }}>
                  {it.iconLink && <img src={it.iconLink} alt="" className="item-icon-32" onError={e => { e.target.style.display = 'none'; }} />}
                </span>
                <span style={{ fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</span>
                <span title={"「アーマーをどれだけ破壊するか」を表します。\n例：アーマーダメージ59%の弾なら、2発命中でそのアーマーはほぼ耐久ゼロ（＝貫通しやすくなる／防具として機能しなくなる）。"} style={{
                  textAlign: 'center', fontWeight: 'bold', fontSize: 12,
                  color: 'var(--text-secondary)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 4px',
                }}>{a.armorDamage}%</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                  <div style={lineStyle}>
                    <span style={labelStyle}>バラ弾</span>
                    {looseChips.map(renderLoose)}
                  </div>
                  {showPackLine && (
                    <div style={lineStyle}>
                      <span style={labelStyle}>パック</span>
                      {packs.map((p, pi) => {
                        const src = [p.flea ? 'フリマ' : null, ...p.traders].filter(Boolean).join(' / ');
                        return (
                          <span key={'pk' + pi} title={p.name}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 'bold',
                              padding: '1px 7px 1px 2px', borderRadius: 10, whiteSpace: 'nowrap',
                              background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)',
                            }}>
                            {p.icon && <img src={p.icon} alt="" style={{ height: 20, width: 'auto', borderRadius: 3 }} onError={e => { e.target.style.display = 'none'; }} />}
                            ×{p.count}
                            <span style={{ fontWeight: 'normal', fontSize: 10, color: 'var(--text-dim)' }}>{src || '—'}</span>
                          </span>
                        );
                      })}
                      {barterFallback.map((q, i) => {
                        const clickable = !!q.taskId;
                        return (
                          <button key={'bf' + i} disabled={!clickable}
                            onClick={clickable ? () => { setActiveTab('tasks'); searchForTaskByName(q.taskName, q.taskId); } : undefined}
                            style={{ ...base, cursor: clickable ? 'pointer' : 'default', background: 'var(--warn-bg-weak)', color: 'var(--warn-text)', borderColor: 'var(--warn)' }}
                            title={clickable ? '前提タスクへ移動' : ''}>
                            <Icon name="shopping-cart" size={11} color="var(--warn)" /> {q.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const AmmoCaliberContent = ({ sortedAmmoByCaliber, ammoMinPen }) => {
    const [activeCaliber, setActiveCaliber] = React.useState(null);
    const sidebarRef = React.useRef(null);

    React.useEffect(() => {
      const sections = sortedAmmoByCaliber
        .filter(({ caliber, rounds }) => rounds.filter(r => (r.penetrationPower || 0) >= ammoMinPen).length > 0)
        .map(({ caliber }) => caliber);
      if (sections.length === 0) return;

      const obs = new IntersectionObserver(
        entries => {
          let topEntry = null;
          entries.forEach(e => {
            if (e.isIntersecting) {
              if (!topEntry || e.boundingClientRect.top < topEntry.boundingClientRect.top) {
                topEntry = e;
              }
            }
          });
          if (topEntry) {
            const cal = topEntry.target.dataset.caliber;
            setActiveCaliber(cal);
            if (sidebarRef.current) {
              const activeEl = sidebarRef.current.querySelector(`[data-sidebar-cal="${cal}"]`);
              if (activeEl) activeEl.scrollIntoView({ block: 'nearest' });
            }
          }
        },
        { rootMargin: '0px 0px -88% 0px', threshold: 0 }
      );

      sections.forEach(cal => {
        const el = document.getElementById(`ammo-cal-${cal}`);
        if (el) obs.observe(el);
      });
      return () => obs.disconnect();
    }, [sortedAmmoByCaliber, ammoMinPen]);

    const visibleSections = sortedAmmoByCaliber.filter(({ caliber, rounds }) =>
      rounds.filter(r => (r.penetrationPower || 0) >= ammoMinPen).length > 0
    );

    return (
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        {/* 左サイドバー: 口径TOC */}
        <div ref={sidebarRef} style={{
          position: 'sticky', top: 4, width: 130, flexShrink: 0,
          maxHeight: 'calc(100vh - 100px)', overflowY: 'auto',
          background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)',
          padding: '6px 4px',
        }}>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 'bold', padding: '2px 6px 6px', borderBottom: '1px solid var(--border-light)', marginBottom: 4 }}>
            <Icon name="target" size={10} color="var(--text-dim)" /> 口径
          </div>
          {visibleSections.map(({ caliber, maxPen }) => {
            const isActive = caliber === activeCaliber;
            return (
              <button
                key={caliber}
                data-sidebar-cal={caliber}
                onClick={() => {
                  const el = document.getElementById(`ammo-cal-${caliber}`);
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', padding: '4px 6px',
                  background: isActive ? 'var(--accent-muted)' : 'transparent',
                  color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                  border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 11,
                  fontWeight: isActive ? 'bold' : 'normal', lineHeight: 1.3, marginBottom: 1,
                }}
              >
                {caliber}
                <span style={{ display: 'block', fontSize: 9, color: isActive ? 'var(--accent)' : 'var(--text-dim)', fontWeight: 'normal' }}>PEN {maxPen}</span>
              </button>
            );
          })}
        </div>

        {/* 右コンテンツ */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {visibleSections.map(({ caliber, maxPen, rounds }) => {
            const shown = rounds.filter(r => (r.penetrationPower || 0) >= ammoMinPen);
            return (
              <AmmoCaliberSection
                key={caliber}
                sectionId={`ammo-cal-${caliber}`}
                caliber={caliber}
                maxPen={maxPen}
                rounds={shown}
                weaponsByCaliber={weaponsByCaliber}
                ammoPackMap={ammoPackMap}
              />
            );
          })}
        </div>
      </div>
    );
  };

  // ── マップピン表示コンポーネント ──
  const CAT_ICON  = { bring: 'backpack', collect: 'package', place: 'download', kill: 'skull', extract: 'arrow-right', locate: 'search' };
  const CAT_COLOR = { bring: 'var(--info)', collect: 'var(--warn)', place: 'var(--accent)', kill: 'var(--danger)', extract: 'var(--state-ok)', locate: 'var(--info)' };

  const objDisplayName = (obj) =>
    obj.item?.name || obj.questItem?.name || obj.markerItem?.name
    || (obj.itemCategory?.name ? `${obj.itemCategory.name} カテゴリ` : null)
    || obj.target || obj.description || '';

  // ピンの requiredItems 要素を表示用に解決（タスク品は登録データの最新の名前・画像を使う）
  const resolvePinItem = (item) => {
    if (!item?.custom) return item;
    const c = customItems.find(x => x.id === item.id);
    return c ? { ...item, ...c, custom: true } : item;
  };
  // ピンの必要アイテムチップ（マップタブ・吹き出し・出撃準備で共通）
  const PinItemChip = ({ item, size = 'md', onRemove }) => {
    const it = resolvePinItem(item);
    const imgPx = size === 'sm' ? 14 : 18;
    return (
      <span title={it.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 3,
        fontSize: size === 'sm' ? 9 : 10, padding: size === 'sm' ? '0 3px' : '1px 4px', borderRadius: 3,
        background: it.custom ? 'var(--info-bg-weak)' : 'var(--warn-bg-weak)',
        color: it.custom ? 'var(--info)' : 'var(--warn-text)',
        border: `1px solid ${it.custom ? 'var(--info-border)' : 'var(--warn)'}` }}>
        {it.iconLink && <img src={it.iconLink} alt="" style={{ width: imgPx, height: imgPx, objectFit: 'contain' }} onError={e => { e.target.style.display='none'; }} />}
        {it.shortName || it.name}
        {onRemove && (
          <button onClick={onRemove}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex', marginLeft: 1 }}>
            <Icon name="x" size={8} color="var(--danger-text)" />
          </button>
        )}
      </span>
    );
  };

  // ピンの詳細位置画像チップ（省略名表示・クリックで拡大）
  const PinImageChips = ({ images, size = 'md' }) => {
    if (!images || images.length === 0) return null;
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {images.map(img => (
          <span key={img.id} title={`${img.name}（クリックで拡大）`}
            onClick={e => { e.stopPropagation(); setPinImageViewer(img); }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 3, cursor: 'zoom-in',
              fontSize: size === 'sm' ? 9 : 10, padding: size === 'sm' ? '0 3px' : '1px 4px', borderRadius: 3,
              background: 'var(--bg-primary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
            <Icon name="camera" size={size === 'sm' ? 9 : 10} color="var(--text-dim)" />
            {img.name}
          </span>
        ))}
      </div>
    );
  };

  const MapPinMarker = ({ leftPct, topPct, obj, task, cat, pin, onRemove, onReposition, forceOpen }) => {
    const [open, setOpen] = React.useState(false);
    const pinRef = React.useRef(null);

    React.useEffect(() => { if (forceOpen) setOpen(true); }, [forceOpen]);

    // 吹き出し外クリックで閉じる
    React.useEffect(() => {
      if (!open) return;
      const close = (e) => {
        if (pinRef.current && !pinRef.current.contains(e.target)) setOpen(false);
      };
      document.addEventListener('mousedown', close);
      return () => document.removeEventListener('mousedown', close);
    }, [open]);

    return (
      <div ref={pinRef}
        style={{ position: 'absolute', left: `${leftPct}%`, top: `${topPct}%`,
          transform: 'translate(-50%, -100%)', cursor: 'pointer', zIndex: open ? 5 : 2 }}
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}>
        <Icon name={CAT_ICON[cat] || 'map-pin'} size={20}
          color={open ? '#fff' : (CAT_COLOR[cat] || 'var(--state-pin)')} />
        {open && (
          <div className="map-pin-bubble" onClick={e => e.stopPropagation()}>
            <div className="map-pin-bubble-task">{task.name}</div>
            <div className="map-pin-bubble-obj">{objDisplayName(obj)}{obj.count > 1 ? ` ×${obj.count}` : ''}</div>
            {pin?.memo && (
              <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 4,
                display: 'flex', alignItems: 'flex-start', gap: 3, lineHeight: 1.4 }}>
                <Icon name="pencil" size={9} color="var(--text-dim)" style={{ marginTop: 1, flexShrink: 0 }} />
                <span>{pin.memo}</span>
              </div>
            )}
            {pin?.requiredItems && pin.requiredItems.length > 0 && (
              <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {pin.requiredItems.map(item => <PinItemChip key={item.id} item={item} />)}
              </div>
            )}
            {pin?.memoImages && pin.memoImages.length > 0 && (
              <div style={{ marginTop: 4 }}><PinImageChips images={pin.memoImages} /></div>
            )}
            {(onRemove || onReposition) && (
              <div style={{ display: 'flex', gap: 4, marginTop: 5 }}>
                {onReposition && (
                  <button onClick={e => { e.stopPropagation(); onReposition(); setOpen(false); }}
                    style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, cursor: 'pointer',
                      background: 'var(--accent-muted)', color: 'var(--accent)', border: '1px solid var(--accent)' }}>
                    再配置
                  </button>
                )}
                {onRemove && (
                  <button onClick={e => { e.stopPropagation(); onRemove(); setOpen(false); }}
                    style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, cursor: 'pointer',
                      background: 'var(--danger-bg)', color: 'var(--danger-text)', border: '1px solid var(--danger)' }}>
                    削除
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const MapPinVisual = ({ mapName, mapImages, ensureMapImageRegistered, pins, allTasks, onToggleCheck, isChecked, onOpenTask }) => {
    const meta = mapImages[mapName];
    const containerRef = React.useRef(null);
    const imgRef       = React.useRef(null);
    const imgWrapRef   = React.useRef(null);
    const itemRefs     = React.useRef({});
    const [lines,      setLines]      = React.useState([]);
    const [imgRev,     setImgRev]     = React.useState(0);
    const [imgHeight,  setImgHeight]  = React.useState(0);
    const [highlighted, setHighlighted] = React.useState(null);
    const [zoom,   setZoom]   = React.useState(1);
    const [panX,   setPanX]   = React.useState(0);
    const [panY,   setPanY]   = React.useState(0);
    const [dragging, setDragging] = React.useState(false);
    const vpRef    = React.useRef({ zoom: 1, panX: 0, panY: 0 });
    const dragRef2 = React.useRef(null);

    React.useEffect(() => { if (mapName && !meta) ensureMapImageRegistered(mapName); }, [mapName]);

    // マップ切替時にズーム・パンをリセット
    React.useEffect(() => {
      const v = { zoom: 1, panX: 0, panY: 0 };
      vpRef.current = v;
      setZoom(1); setPanX(0); setPanY(0);
    }, [mapName]);

    // ホイールズーム（非パッシブ）
    React.useEffect(() => {
      const el = imgWrapRef.current;
      if (!el) return;
      const onWheel = (e) => {
        e.preventDefault();
        const { zoom: z, panX: px, panY: py } = vpRef.current;
        const factor = e.deltaY < 0 ? 1.2 : 1 / 1.2;
        const newZoom = Math.max(1, Math.min(6, z * factor));
        if (newZoom === z) return;
        const img = imgRef.current;
        if (!img) return;
        const rect = img.getBoundingClientRect();
        const dx = e.clientX - rect.left;
        const dy = e.clientY - rect.top;
        const ratio = newZoom / z;
        const cw = img.offsetWidth;
        const ch = img.offsetHeight;
        const clp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
        const newPanX = clp(px + dx * (1 - ratio), cw * (1 - newZoom), 0);
        const newPanY = clp(py + dy * (1 - ratio), ch * (1 - newZoom), 0);
        vpRef.current = { zoom: newZoom, panX: newPanX, panY: newPanY };
        setZoom(newZoom); setPanX(newPanX); setPanY(newPanY);
      };
      el.addEventListener('wheel', onWheel, { passive: false });
      return () => el.removeEventListener('wheel', onWheel);
    }, []);

    const classifyObj = (type, foundInRaid) => {
      if (type === 'findItem') return foundInRaid ? 'collect' : 'bring';
      if (type === 'giveItem') return 'bring';
      if (type === 'findQuestItem') return 'collect';
      if (type === 'mark' || type === 'plantItem') return 'place';
      if (type === 'kill' || type === 'shoot') return 'kill';
      if (type === 'extract') return 'extract';
      return 'locate';
    };

    const pinsWithData = React.useMemo(() => {
      const taskMap = {};
      (allTasks || []).forEach(t => { taskMap[t.id] = t; });
      return pins.map(pin => {
        const task = taskMap[pin.taskId];
        if (!task) return null;
        const obj = (task.objectives || []).find(o => o.id === pin.objectiveId);
        if (!obj) return null;
        const cat = classifyObj(obj.type, obj.foundInRaid);
        return { pin, obj, task, cat };
      }).filter(Boolean);
    }, [pins, allTasks]);

    // チェック済み状態（isChecked は毎レンダー新規関数のため文字列キーで依存を安定化）
    const checkedKey = pinsWithData.map(d => (isChecked && isChecked(d.task.id, d.obj)) ? '1' : '0').join('');

    // 未チェック → チェック済みの順、各グループ内は縦位置順（地図の上から下へ）
    const sortedPins = React.useMemo(
      () => pinsWithData
        .map((d, i) => ({ ...d, checked: checkedKey[i] === '1' }))
        .sort((a, b) => (a.checked - b.checked) || (a.pin.y - b.pin.y)),
      [pinsWithData, checkedKey]
    );

    // ドラッグ操作ハンドラー
    const handleDragStart = React.useCallback((e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      dragRef2.current = { startX: e.clientX, startY: e.clientY,
        startPanX: vpRef.current.panX, startPanY: vpRef.current.panY, moved: false };
      setDragging(true);
    }, []);

    const handleDragMove = React.useCallback((e) => {
      if (!dragRef2.current) return;
      const dx = e.clientX - dragRef2.current.startX;
      const dy = e.clientY - dragRef2.current.startY;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragRef2.current.moved = true;
      if (!dragRef2.current.moved) return;
      const img = imgRef.current;
      if (!img) return;
      const { zoom: z } = vpRef.current;
      const cw = img.offsetWidth;
      const ch = img.offsetHeight;
      const clp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
      const newPanX = clp(dragRef2.current.startPanX + dx, cw * (1 - z), 0);
      const newPanY = clp(dragRef2.current.startPanY + dy, ch * (1 - z), 0);
      vpRef.current = { zoom: z, panX: newPanX, panY: newPanY };
      setPanX(newPanX); setPanY(newPanY);
    }, []);

    const handleDragEnd = React.useCallback(() => {
      dragRef2.current = null;
      setDragging(false);
    }, []);

    // ズームイン時：画像ビューポートに映っているピンのみ右パネルに表示
    const visiblePins = React.useMemo(() => {
      if (!meta || zoom <= 1) return sortedPins;
      const img = imgRef.current;
      if (!img) return sortedPins;
      const cw = img.offsetWidth;
      const ch = img.offsetHeight;
      const vx0 = (-panX / zoom) / cw * meta.width;
      const vx1 = ((-panX + cw) / zoom) / cw * meta.width;
      const vy0 = (-panY / zoom) / ch * meta.height;
      const vy1 = ((-panY + ch) / zoom) / ch * meta.height;
      return sortedPins.filter(({ pin }) =>
        pin.x >= vx0 && pin.x <= vx1 && pin.y >= vy0 && pin.y <= vy1
      );
    }, [sortedPins, zoom, panX, panY, meta]);

    const recalcLines = React.useCallback(() => {
      if (!containerRef.current || !imgRef.current) return;
      const cRect = containerRef.current.getBoundingClientRect();
      const iRect = imgRef.current.getBoundingClientRect();
      if (iRect.width === 0) return;
      const next = sortedPins.map(({ pin }) => {
        const el = itemRefs.current[pin.id];
        if (!el || !meta) return null;
        const eRect = el.getBoundingClientRect();
        return {
          id: pin.id,
          x1: iRect.left - cRect.left + (pin.x / meta.width)  * iRect.width,
          y1: iRect.top  - cRect.top  + (pin.y / meta.height) * iRect.height,
          x2: eRect.left - cRect.left,
          y2: eRect.top  - cRect.top  + eRect.height / 2,
        };
      }).filter(Boolean);
      setLines(next);
    }, [sortedPins, meta]);

    React.useLayoutEffect(() => {
      recalcLines();
      window.addEventListener('resize', recalcLines);
      return () => window.removeEventListener('resize', recalcLines);
    }, [recalcLines, imgRev, zoom, panX, panY]);

    if (!mapName) return null;
    if (!meta) {
      return (
        <div className="section" style={{ fontSize: 12, color: 'var(--text-dim)' }}>
          <Icon name="alert-triangle" size={13} color="var(--warn)" /> マップ画像が未登録です。
          「マップ」タブの「画像を差し替え」から地図画像を登録してください（入手先: <a href={MAP_IMAGE_SOURCE_URL} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>REƎMR EFTMAPS</a>）。
        </div>
      );
    }
    if (sortedPins.length === 0) return null;

    return (
      <div ref={containerRef} className="section"
        style={{ padding: 0, overflow: 'hidden', marginBottom: 8, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start' }}>

          {/* ── 左：マップ画像（ズーム・ドラッグ対応） ── */}
          <div ref={imgWrapRef} style={{ flex: 1, position: 'relative', minWidth: 0, overflow: 'hidden' }}>
            {zoom > 1 && (
              <div style={{ position: 'absolute', top: 4, right: 4, zIndex: 10, pointerEvents: 'none',
                background: 'rgba(0,0,0,0.65)', color: 'var(--accent)', fontSize: 10,
                padding: '1px 6px', borderRadius: 8, border: '1px solid var(--border)' }}>
                ×{zoom.toFixed(1)}
              </div>
            )}
            <div style={{
              transform: zoom > 1 ? `translate(${panX}px, ${panY}px) scale(${zoom})` : undefined,
              transformOrigin: '0 0',
              cursor: dragging ? 'grabbing' : zoom > 1 ? 'grab' : 'default',
              userSelect: 'none',
            }}
              onMouseDown={handleDragStart}
              onMouseMove={handleDragMove}
              onMouseUp={handleDragEnd}
              onMouseLeave={handleDragEnd}>
              <img ref={imgRef} src={getMapImageSrc(mapName, meta)} alt={mapName}
                style={{ width: '100%', display: 'block' }}
                draggable={false}
                onLoad={() => { setImgRev(r => r + 1); if (imgRef.current) setImgHeight(imgRef.current.offsetHeight); }} />

              {sortedPins.map(({ pin, cat, checked }, idx) => {
                const hl = highlighted === pin.id;
                const col = checked ? 'var(--text-dim)' : (CAT_COLOR[cat] || 'var(--accent)');
                return (
                  <div key={pin.id} style={{
                    opacity: checked && !hl ? 0.7 : 1,
                    position: 'absolute',
                    left: `${pin.x / meta.width  * 100}%`,
                    top:  `${pin.y / meta.height * 100}%`,
                    transform: 'translate(-50%, -50%)',
                    width: 22, height: 22, borderRadius: '50%',
                    background: hl ? '#fff' : col,
                    border: `2px solid ${hl ? col : 'rgba(0,0,0,0.55)'}`,
                    color: hl ? col : '#000',
                    fontSize: 11, fontWeight: 'bold',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: hl ? 3 : checked ? 1 : 2, boxShadow: '0 1px 5px rgba(0,0,0,0.65)',
                    transition: 'all 0.15s', cursor: 'default',
                  }}
                    onMouseEnter={() => { setHighlighted(pin.id); recalcLines(); }}
                    onMouseLeave={() => setHighlighted(null)}>
                    {checked ? <Icon name="check" size={12} color={hl ? col : '#000'} /> : idx + 1}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── 右：目標リスト ── */}
          <div style={{
            width: 188, flexShrink: 0,
            background: 'var(--bg-secondary)',
            borderLeft: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column',
            overflowY: 'auto',
            maxHeight: imgHeight > 0 ? imgHeight : undefined,
          }}>
            {zoom > 1 && visiblePins.length < sortedPins.length && (
              <div style={{ padding: '4px 8px', fontSize: 10, color: 'var(--text-dim)',
                borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Icon name="search" size={10} color="var(--accent)" />
                <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{visiblePins.length}</span>
                <span>/ {sortedPins.length} 件</span>
              </div>
            )}
            {visiblePins.map(({ pin, obj, task, cat, checked }) => {
              const hl  = highlighted === pin.id;
              const col = checked ? 'var(--text-dim)' : (CAT_COLOR[cat] || 'var(--accent)');
              const idx = sortedPins.findIndex(p => p.pin.id === pin.id);
              const clickable = !!onOpenTask;
              return (
                <div key={pin.id}
                  ref={el => { itemRefs.current[pin.id] = el; }}
                  onMouseEnter={() => { setHighlighted(pin.id); recalcLines(); }}
                  onMouseLeave={() => setHighlighted(null)}
                  onClick={clickable ? () => onOpenTask(task) : undefined}
                  style={{
                    display: 'flex', gap: 7, padding: '7px 8px',
                    borderBottom: '1px solid var(--border-light)',
                    background: checked ? 'var(--state-ok-bg-faint)' : hl ? 'var(--accent-muted)' : 'transparent',
                    transition: 'background 0.15s',
                    cursor: clickable ? 'pointer' : 'default',
                    opacity: checked ? 0.5 : 1,
                    alignItems: 'flex-start',
                  }}>
                  {/* 番号バッジ（チェック済みはチェックアイコンに変化） */}
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                    background: col, color: '#000',
                    fontSize: 11, fontWeight: 'bold',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginTop: 1, boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                  }}>
                    {checked ? <Icon name="check" size={12} color="#000" /> : idx + 1}
                  </div>
                  {/* テキスト */}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 'bold',
                      lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {task.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-primary)', lineHeight: 1.4, marginTop: 1,
                      display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                      {cat === 'place' && (obj.item?.iconLink || obj.markerItem?.iconLink) && (
                        <img src={obj.item?.iconLink || obj.markerItem?.iconLink} alt=""
                          style={{ width: 20, height: 20, objectFit: 'contain', flexShrink: 0, borderRadius: 2 }}
                          onError={e => { e.target.style.display = 'none'; }} />
                      )}
                      <span>{objDisplayName(obj)}{obj.count > 1 ? ` ×${obj.count}` : ''}</span>
                    </div>
                    {obj.description && obj.description !== objDisplayName(obj) && (
                      <div style={{ fontSize: 10, color: 'var(--text-dim)', lineHeight: 1.35, marginTop: 2 }}>
                        {obj.description}
                      </div>
                    )}
                    {obj.foundInRaid && (
                      <span style={{ fontSize: 9, color: 'var(--warn-text)', background: 'var(--warn-bg)',
                        border: '1px solid var(--warn)', padding: '0 3px', borderRadius: 2,
                        marginTop: 2, display: 'inline-block' }}>FIR</span>
                    )}
                    {pin.memo && (
                      <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 3,
                        display: 'flex', alignItems: 'flex-start', gap: 3, lineHeight: 1.35 }}>
                        <Icon name="pencil" size={9} color="var(--text-dim)" style={{ marginTop: 1, flexShrink: 0 }} />
                        <span>{pin.memo}</span>
                      </div>
                    )}
                    {pin.requiredItems && pin.requiredItems.length > 0 && (
                      <div style={{ marginTop: 3, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        {pin.requiredItems.map(item => <PinItemChip key={item.id} item={item} size="sm" />)}
                      </div>
                    )}
                    {pin.memoImages && pin.memoImages.length > 0 && (
                      <div style={{ marginTop: 3 }}><PinImageChips images={pin.memoImages} size="sm" /></div>
                    )}
                  </div>
                  <Icon name={CAT_ICON[cat] || 'map-pin'} size={12} color={col} style={{ marginTop: 3, flexShrink: 0 }} />
                </div>
              );
            })}
          </div>
        </div>

        {/* ── SVG 接続線 ── */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%',
          pointerEvents: 'none', overflow: 'visible' }}>
          {lines.map(l => {
            const entry = sortedPins.find(p => p.pin.id === l.id);
            const col = !entry ? 'var(--accent)' : entry.checked ? 'var(--text-dim)' : (CAT_COLOR[entry.cat] || 'var(--accent)');
            const hl  = highlighted === l.id;
            // ベジェ曲線：ピンから横に伸ばしてサイドパネルへ
            const cx1 = l.x1 + (l.x2 - l.x1) * 0.6;
            const cx2 = l.x2 - (l.x2 - l.x1) * 0.15;
            return (
              <path key={l.id}
                d={`M ${l.x1} ${l.y1} C ${cx1} ${l.y1}, ${cx2} ${l.y2}, ${l.x2} ${l.y2}`}
                style={{
                  fill: 'none',
                  stroke: col,
                  strokeWidth: hl ? 2 : 1,
                  strokeDasharray: hl ? 'none' : '5 3',
                  strokeOpacity: hl ? 0.9 : 0.45,
                }}
              />
            );
          })}
        </svg>
      </div>
    );
  };

  // ================== RENDER ==================
