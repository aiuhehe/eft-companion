      {/* ===== TAB: HIDEOUT ===== */}
      {activeTab === 'hideout' && (
        <div>
          {/* Controls */}
          <div className="section" style={{ paddingBottom: 12 }}>
            <div style={{ display: 'flex', gap: 16, marginBottom: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <div className="section-title" style={{ marginBottom: 0 }}><Icon name="home" size={14} color="var(--accent)" /> ハイドアウト収集ナビ</div>
              <div style={{ display: 'flex', gap: 12 }}>
                {[['next', '次のレベルまで'], ['max', 'MAXまでの累計']].map(([val, label]) => (
                  <label key={val} className="radio-label">
                    <input type="radio" name="hideoutMode" value={val}
                      checked={hideoutMode === val} onChange={e => setHideoutMode(e.target.value)} />
                    {label}
                  </label>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>ソート:</span>
                <select value={stationSort} onChange={e => setStationSort(e.target.value)} style={{ fontSize: 12 }}>
                  <option value="default">デフォルト (あと1個優先)</option>
                  <option value="close">達成に近い順 (進捗率高い順)</option>
                  <option value="remaining">残りアイテム数が少ない順</option>
                </select>
              </div>
            </div>
            {/* Station filter */}
            {hideoutCalc.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>施設:</span>
                <button
                  onClick={() => setHideoutStationFilters({})}
                  className="station-filter-btn"
                  style={{
                    background: Object.keys(hideoutStationFilters).length === 0 ? 'var(--accent)' : 'var(--border)',
                    color: Object.keys(hideoutStationFilters).length === 0 ? 'var(--accent-on)' : 'var(--text-secondary)',
                    fontWeight: Object.keys(hideoutStationFilters).length === 0 ? 'bold' : 'normal',
                  }}>ALL</button>
                {hideoutCalc.map(({ station }) => {
                  const name = STATION_NAME_OVERRIDES[station.name] ?? station.name;
                  const on = hideoutStationFilters[station.id] !== false;
                  const isFiltered = Object.keys(hideoutStationFilters).length > 0;
                  const active = !isFiltered || on;
                  return (
                    <button key={station.id}
                      onClick={() => {
                        if (Object.keys(hideoutStationFilters).length === 0) {
                          // ALLから特定1つをOFFにする
                          const next = {};
                          hideoutCalc.forEach(s => { next[s.station.id] = s.station.id !== station.id; });
                          setHideoutStationFilters(next);
                        } else {
                          setHideoutStationFilters(prev => {
                            const updated = { ...prev, [station.id]: !on };
                            const allOn = hideoutCalc.every(s => updated[s.station.id] !== false);
                            return allOn ? {} : updated;
                          });
                        }
                      }}
                      className="station-filter-btn"
                      style={{
                        background: active ? 'var(--state-ok-bg)' : 'var(--bg-secondary)',
                        color: active ? 'var(--state-ok-text)' : 'var(--text-dim)',
                        fontWeight: active ? 'bold' : 'normal',
                      }}>{name}</button>
                  );
                })}
              </div>
            )}
          </div>

          {apiData.hideout.length === 0 ? (
            <div className="section" style={{ color: 'var(--text-dim)', fontSize: 13 }}>APIデータを取得してください。</div>
          ) : hideoutCalc.length === 0 ? (
            <div className="section" style={{ color: 'var(--state-ok-text)', fontSize: 13 }}><Icon name="circle-check" size={14} color="var(--state-ok)" />{" "}全施設が最大レベルです！</div>
          ) : (
            <div>
              {/* Ready for upgrade */}
              {filteredHideoutCalc.some(s => s.isReadyForUpgrade) && (() => {
                const readyStations = filteredHideoutCalc.filter(s => s.isReadyForUpgrade);
                // 全準備完了ステーションの合計必要アイテムを集計して充足チェック
                const combinedMap = {};
                readyStations.forEach(s => {
                  s.nextLevelItems.forEach(({ item, needed }) => {
                    if (!combinedMap[item.id]) combinedMap[item.id] = { item, needed: 0, have: parseInt(stash[item.id] || 0) };
                    combinedMap[item.id].needed += needed;
                  });
                });
                const combinedItems = Object.values(combinedMap);
                const shortItems = combinedItems.filter(i => i.have < i.needed);
                const allCovered = shortItems.length === 0;
                return (
                  <div className="section" style={{ background: 'var(--state-ok-bg-weak)', borderColor: 'var(--state-ok)', marginBottom: 12 }}>
                    <div style={{ color: 'var(--state-ok-text)', fontWeight: 'bold', fontSize: 13, marginBottom: 10 }}>
                      <Icon name="circle-check" size={14} color="var(--state-ok)" />{" "}アップグレード準備完了！
                    </div>
                    {/* 合計アイテム充足チェック（2施設以上のとき） */}
                    {readyStations.length > 1 && (
                      <div style={{ marginBottom: 10, padding: '6px 10px', borderRadius: 5,
                        background: allCovered ? 'var(--state-ok-bg)' : 'var(--warn-bg-weak)',
                        border: `1px solid ${allCovered ? 'var(--state-ok)' : 'var(--warn)'}` }}>
                        {allCovered ? (
                          <span style={{ fontSize: 12, color: 'var(--state-ok-text)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            <Icon name="circle-check" size={12} color="var(--state-ok)" />
                            全{readyStations.length}施設分のアイテムが揃っています
                          </span>
                        ) : (
                          <div>
                            <div style={{ fontSize: 12, color: 'var(--warn-text)', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                              <Icon name="alert-triangle" size={12} color="var(--warn)" />
                              合計すると不足するアイテムがあります（同時アップグレード不可）
                            </div>
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {shortItems.map(({ item, needed, have }) => (
                                <span key={item.id} style={{ fontSize: 11, background: 'var(--danger-bg)', border: '1px solid var(--danger)', borderRadius: 4, padding: '2px 6px', color: 'var(--danger-text)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                  {item.iconLink && <img src={item.iconLink} alt="" style={{ width: 14, height: 14, objectFit: 'contain' }} onError={e => { e.target.style.display='none'; }} />}
                                  {item.name} {have}/{needed}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {/* ステーション一覧 */}
                    {readyStations.map(({ station, currentLv, nextLevelItems, stationReqs }) => {
                      const displayName = STATION_NAME_OVERRIDES[station.name] ?? station.name;
                      return (
                        <div key={station.id} style={{ marginBottom: 8 }}>
                          <div style={{ color: 'var(--state-ok-text)', fontWeight: 'bold', fontSize: 12, marginBottom: 4 }}>
                            <Icon name="circle-check" size={12} color="var(--state-ok)" />{" "}{displayName} Lv{currentLv} → Lv{currentLv + 1}
                          </div>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {nextLevelItems.map(({ item, needed }) => (
                              <span key={item.id} style={{ fontSize: 11, background: 'var(--state-ok-bg)', border: '1px solid var(--state-ok)', borderRadius: 4, padding: '2px 6px', color: 'var(--state-ok-text)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                {item.iconLink && <img src={item.iconLink} alt="" style={{ width: 16, height: 16, objectFit: 'contain' }} onError={e => { e.target.style.display='none'; }} />}
                                {item.name} ×{needed}
                              </span>
                            ))}
                            {(stationReqs || []).map(r => (
                              <span key={r.station.id} style={{ fontSize: 11, background: 'var(--state-ok-bg)', border: '1px solid var(--state-ok)', borderRadius: 4, padding: '2px 6px', color: 'var(--state-ok-text)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <Icon name="building" size={11} color="var(--state-ok)" />
                                {STATION_NAME_OVERRIDES[r.station.name] ?? r.station.name} Lv{r.requiredLevel}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Alert: あと1個（ステーション全体の合計残りが1のみ） */}
              {filteredHideoutCalc.some(s => s.totalRemaining === 1) && (
                <div className="section" style={{ background: 'var(--danger-bg-weak)', borderColor: 'var(--danger)', marginBottom: 12 }}>
                  <div style={{ color: 'var(--danger)', fontWeight: 'bold', fontSize: 13, marginBottom: 10 }}>
                    <Icon name="flag" size={14} color="var(--danger)" />{" "}あと1個で完成！
                  </div>
                  {filteredHideoutCalc.filter(s => s.totalRemaining === 1).map(({ station, currentLv, items, stationReqs }) => {
                    const stName = STATION_NAME_OVERRIDES[station.name] ?? station.name;
                    const unmetReqs = (stationReqs || []).filter(r => !r.met);
                    return (
                      <div key={station.id} style={{ marginBottom: 14 }}>
                        {/* 前提ステーション条件ツリー */}
                        {unmetReqs.map(r => {
                          const prereqName = STATION_NAME_OVERRIDES[r.station.name] ?? r.station.name;
                          const prereqData = hideoutCalc.find(s => s.station.id === r.station.id);
                          const gap = r.requiredLevel - r.currentLevel;
                          return (
                            <div key={r.station.id} style={{ marginBottom: 2 }}>
                              <div style={{ fontSize: 11, color: 'var(--warn-text)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                                <Icon name="lock" size={11} color="var(--warn)" />
                                前提: {prereqName} Lv{r.requiredLevel} 必要（現在 Lv{r.currentLevel}{gap > 1 ? `・あと${gap}段階` : ''}）
                              </div>
                              <div style={{ marginLeft: 6, paddingLeft: 10, borderLeft: '2px solid var(--warn)', marginBottom: 6 }}>
                                {prereqData ? (
                                  prereqData.items.length === 0 && prereqData.completedItems.length > 0 ? (
                                    <span style={{ fontSize: 11, color: 'var(--state-ok-text)' }}>
                                      <Icon name="circle-check" size={11} color="var(--state-ok)" />{" "}アイテム充足済み — 設定タブでレベルを更新してください
                                    </span>
                                  ) : (
                                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                                      {prereqData.items.map(({ item, needed, have, remaining }) => (
                                        <span key={item.id} style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 3,
                                          background: remaining === 1 ? 'var(--danger-bg-mid)' : 'var(--danger-bg-faint)',
                                          border: `1px solid ${remaining === 1 ? 'var(--danger)' : 'var(--warn)'}`,
                                          borderRadius: 4, padding: '2px 6px',
                                          color: remaining === 1 ? 'var(--danger-text)' : 'var(--text-primary)' }}>
                                          {remaining === 1 && <Icon name="fire" size={10} color="var(--warn)" />}
                                          {item.name} {have}/{needed}
                                        </span>
                                      ))}
                                      {prereqData.completedItems.map(({ item, needed, have }) => (
                                        <span key={item.id} style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 3,
                                          background: 'var(--state-ok-bg-faint)', border: '1px solid var(--state-ok)',
                                          borderRadius: 4, padding: '2px 6px', color: 'var(--state-ok-text)', opacity: 0.65 }}>
                                          <Icon name="check" size={10} color="var(--state-ok)" />
                                          {item.name} {have}/{needed}
                                        </span>
                                      ))}
                                    </div>
                                  )
                                ) : (
                                  <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>アイテム不要（設定タブでレベルを確認してください）</span>
                                )}
                              </div>
                              <div style={{ fontSize: 13, color: 'var(--text-dim)', marginLeft: 6, marginBottom: 4, lineHeight: 1 }}>↓</div>
                            </div>
                          );
                        })}
                        {/* メインステーション */}
                        <div>
                          <div style={{ color: 'var(--danger-text)', fontWeight: 'bold', fontSize: 12, marginBottom: 6 }}>
                            {stName} Lv{currentLv} → Lv{currentLv + 1}
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 6, maxWidth: '100%' }}>
                            {items.map(({ item, needed, have }) => (
                              <div key={item.id} className="hideout-card" style={{
                                background: 'var(--danger-bg-mid)', border: '1px solid var(--danger)',
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  {item.iconLink && <img src={item.iconLink} alt="" className="item-icon-32" onError={e => { e.target.style.display='none'; }} />}
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
                                      <span style={{ fontSize: 12, color: 'var(--danger-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        <Icon name="fire" size={12} color="var(--warn)" />{" "}{item.name}
                                      </span>
                                      <span style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                                        {have}/{needed}
                                      </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                      <div className="progress-bar" style={{ flex: 1 }}>
                                        <div className="progress-fill" style={{ width: `${Math.min(100, Math.round((have / needed) * 100))}%` }} />
                                      </div>
                                      <StashControl itemId={item.id} have={have} onUpdate={updateStash} />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Summary */}
              {Object.keys(hideoutSummary).length > 0 && (() => {
                // スナップショットがあれば区分を固定、なければ現在値で判定
                const isDoneItem = (id) => summaryItemOrder
                  ? summaryItemOrder.doneIds.has(id)
                  : (hideoutSummary[id]?.remaining === 0);
                const needingItems = hideoutSummaryDisplay.filter(i => !isDoneItem(i.item.id));
                const doneItems = hideoutSummaryDisplay.filter(i => isDoneItem(i.item.id));
                const renderCard = ({ item, needed, have, remaining }) => {
                  const pct = Math.min(100, Math.round((have / needed) * 100));
                  const isAlert = remaining === 1;
                  const isDone = isDoneItem(item.id);
                  return (
                    <div key={item.id} className="hideout-card" style={{
                      background: isDone ? 'var(--state-ok-bg-weak)' : 'var(--danger-bg-weak)',
                      border: `1px solid ${isDone ? 'var(--state-ok)' : 'var(--danger)'}`,
                      opacity: isDone ? 0.75 : 1,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {item.iconLink && <img src={item.iconLink} alt="" className="item-icon-32" onError={e => { e.target.style.display='none'; }} />}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 12, color: isDone ? 'var(--state-ok-text)' : isAlert ? 'var(--danger-text)' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {isDone ? <><Icon name="circle-check" size={12} color="var(--state-ok)" />{" "}</> : isAlert ? <><Icon name="fire" size={12} color="var(--warn)" />{" "}</> : null}{item.name}
                            </span>
                            <span style={{ fontSize: 12, color: isDone ? 'var(--state-ok-text)' : isAlert ? 'var(--danger)' : 'var(--text-secondary)', fontWeight: 'bold', marginLeft: 6, whiteSpace: 'nowrap' }}>
                              {have}/{needed}{isDone ? '' : remaining > 1 ? ` (残${remaining})` : ''}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                            <div className="progress-bar" style={{ flex: 1 }}>
                              <div className={`progress-fill${isDone ? ' green' : ''}`} style={{ width: `${pct}%` }} />
                            </div>
                            <StashControl itemId={item.id} have={have} onUpdate={updateStash} />
                            {/* このアイテムを使うステーションへスクロール */}
                            {(() => {
                              const stationsUsingItem = filteredHideoutCalc.filter(s =>
                                [...s.items, ...(s.completedItems||[])].some(i => i.item.id === item.id)
                              );
                              if (stationsUsingItem.length === 0) return null;
                              return (
                                <Tooltip text={`使用施設: ${stationsUsingItem.map(s => STATION_NAME_OVERRIDES[s.station.name] ?? s.station.name).join(', ')}`}>
                                  <button
                                    onClick={() => {
                                      const el = document.getElementById(`station-${stationsUsingItem[0].station.id}`);
                                      if (el) {
                                        // 折りたたまれていれば開く
                                        setCollapsedStations(p => ({ ...p, [stationsUsingItem[0].station.id]: false }));
                                        setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
                                      }
                                    }}
                                    style={{ padding: '1px 6px', borderRadius: 3, fontSize: 11, cursor: 'pointer',
                                      border: '1px solid #374151', background: '#1e2536', color: 'var(--text-secondary)' }}>
                                    <Icon name="anchor" size={12} color="var(--text-secondary)" />
                                  </button>
                                </Tooltip>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                };
                return (
                  <div className="section" style={{ marginBottom: 12, padding: 0, overflow: 'hidden' }}>
                    {/* まとめヘッダー（クリックでトグル） */}
                    <div
                      onClick={() => setSummaryOpen(v => !v)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                        cursor: 'pointer', userSelect: 'none', background: 'var(--bg-secondary)' }}>
                      <Icon name={summaryOpen ? 'chevron-down' : 'chevron-right'} size={14} color="var(--text-dim)" />
                      <div style={{ color: 'var(--accent)', fontWeight: 'bold', fontSize: 13, flex: 1 }}>
                        <Icon name="package" size={14} color="var(--accent)" />{" "}まとめ — 選択ステーション横断アイテム集計
                        <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 'normal', marginLeft: 8 }}>
                          ({filteredHideoutCalc.length} 施設 / 残り {needingItems.length} 種)
                        </span>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); applyHideoutSummarySort(); }}
                        style={{ padding: '3px 12px', borderRadius: 4, fontSize: 12, cursor: 'pointer',
                          border: 'none', background: 'var(--accent)', color: '#0f1117', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                        <Icon name="sort" size={13} color="var(--accent-on)" />{" "}集計する
                      </button>
                      {!summaryItemOrder && (
                        <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>← 押すとあと1個が上位に並びます</span>
                      )}
                    </div>
                    {/* まとめ本体 */}
                    {summaryOpen && (
                      <div style={{ padding: '10px 14px 12px' }}>
                        {/* 集まったアイテム — タイトル直下アコーディオン */}
                        {doneItems.length > 0 && (
                          <div style={{ marginBottom: 8 }}>
                            <button
                              onClick={() => setSummaryCompletedOpen(v => !v)}
                              style={{ width: '100%', padding: '5px 10px', borderRadius: 4, fontSize: 12, cursor: 'pointer',
                                border: '1px solid #166534', background: '#0a1a0a', color: 'var(--state-ok-text)', textAlign: 'left' }}>
                              {summaryCompletedOpen ? <Icon name="chevron-up" size={13} color="var(--state-ok-text)" /> : <Icon name="chevron-right" size={13} color="var(--state-ok-text)" />}{" "}<Icon name="circle-check" size={12} color="var(--state-ok)" />{" "}集まったアイテム ({doneItems.length} 種) — クリックで{summaryCompletedOpen ? '閉じる' : '展開'}
                            </button>
                            {summaryCompletedOpen && (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 6, marginTop: 6 }}>
                                {doneItems.map(renderCard)}
                              </div>
                            )}
                          </div>
                        )}
                        {/* 不足アイテム */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 6 }}>
                          {needingItems.map(renderCard)}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Station cards (collapsible) */}
              {filteredHideoutCalc.map(({ station, currentLv, items, completedItems, stationReqs, stationReqsMet }) => {
                const name = STATION_NAME_OVERRIDES[station.name] ?? station.name;
                const collapsed = collapsedStations[station.id];
                const label = hideoutMode === 'next'
                  ? `Lv${currentLv} → Lv${currentLv + 1}`
                  : `Lv${currentLv} → MAX`;
                return (
                  <div key={station.id} id={`station-${station.id}`} className="section" style={{ marginBottom: 8, padding: 0, overflow: 'hidden' }}>
                    {/* Card header */}
                    <div
                      onClick={() => setCollapsedStations(p => ({ ...p, [station.id]: !collapsed }))}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '10px 14px', cursor: 'pointer', userSelect: 'none',
                        background: 'var(--bg-secondary)',
                      }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{color:'var(--accent)',fontWeight:'bold',fontSize:13,display:'flex',alignItems:'center',gap:5}}><Icon name="building" size={14} color="var(--accent)" />{name}</span>
                        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{label}</span>
                        <span style={{ fontSize: 11, background: '#2d3748', color: 'var(--text-secondary)', padding: '1px 7px', borderRadius: 10 }}>
                          {items.length} 種
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {(() => {
                          const targetLv = currentLv + 1;
                          const planId = `plan_hideout_${station.id}_${targetLv}`;
                          const inPlan = planItems.some(p => p.id === planId);
                          return (
                            <Tooltip text={inPlan ? 'プランに追加済み' : `${name} Lv${targetLv} をプランに追加`}>
                              <button onClick={e => { e.stopPropagation(); if (!inPlan) addPlanItem({ id: planId, type: 'hideout', stationId: station.id, stationName: name, level: targetLv, addedAt: new Date().toISOString() }); }}
                                className="card-btn"
                                style={{ background: inPlan ? 'var(--accent-muted)' : 'var(--bg-secondary)', color: inPlan ? 'var(--accent)' : 'var(--text-dim)' }}>
                                <Icon name="calendar-plus" size={13} color="currentColor" />
                              </button>
                            </Tooltip>
                          );
                        })()}
                        <Icon name={collapsed?'chevron-right':'chevron-down'} size={14} color="var(--text-dim)" />
                      </div>
                    </div>
                    {/* Card body */}
                    {!collapsed && (
                      <div style={{ padding: '0 14px 12px' }}>
                        {/* 未充足ステーション依存条件 */}
                        {stationReqs && stationReqs.some(r => !r.met) && (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10, marginBottom: 2 }}>
                            {stationReqs.filter(r => !r.met).map(r => {
                              const sName = STATION_NAME_OVERRIDES[r.station.name] ?? r.station.name;
                              return (
                                <span key={r.station.id} style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4,
                                  background: 'var(--warn-bg)', border: '1px solid var(--warn)', borderRadius: 4, padding: '2px 8px', color: 'var(--warn-text)' }}>
                                  <Icon name="lock" size={11} color="var(--warn)" />
                                  {sName} Lv{r.requiredLevel} 必要（現在 Lv{r.currentLevel}）
                                </span>
                              );
                            })}
                          </div>
                        )}
                        <table style={{ marginTop: 8 }}>
                          <thead>
                            <tr>
                              <th style={{ width: '45%' }}>アイテム</th>
                              <th style={{ width: '10%', textAlign: 'right' }}>所持</th>
                              <th style={{ width: '10%', textAlign: 'right' }}>必要</th>
                              <th style={{ width: '10%', textAlign: 'right' }}>残り</th>
                              <th style={{ width: '25%' }}>操作</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map(({ item, needed, have, remaining }) => {
                              const isAlert = remaining === 1;
                              return (
                                <tr key={item.id} style={{ background: 'var(--danger-bg-faint)' }}>
                                  <td style={{ color: isAlert ? 'var(--danger-text)' : 'var(--text-primary)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                      {item.iconLink && <img src={item.iconLink} alt="" className="item-icon-28" onError={e => { e.target.style.display='none'; }} />}
                                      <span>
                                        {isAlert && <><Icon name="fire" size={12} color="var(--warn)" />{" "}</>}
                                        {item.name}
                                        <span style={{ color: '#4b5563', marginLeft: 4 }}>({item.shortName})</span>
                                      </span>
                                    </div>
                                  </td>
                                  <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{have}</td>
                                  <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{needed}</td>
                                  <td style={{ textAlign: 'right', fontWeight: isAlert ? 'bold' : 'normal',
                                    color: isAlert ? 'var(--danger)' : remaining <= 3 ? 'var(--warn)' : '#64748b' }}>
                                    {remaining}
                                  </td>
                                  <td><StashControl itemId={item.id} have={have} onUpdate={updateStash} /></td>
                                </tr>
                              );
                            })}
                            {(completedItems || []).map(({ item, needed, have }) => (
                              <tr key={item.id} style={{ opacity: 0.45 }}>
                                <td style={{ color: 'var(--state-ok-text)' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                    {item.iconLink && <img src={item.iconLink} alt="" className="item-icon-28" onError={e => { e.target.style.display='none'; }} />}
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="check" size={13} color="var(--state-ok-text)" /> {item.name}<span style={{ color: 'var(--text-dim)', marginLeft: 4 }}>({item.shortName})</span></span>
                                  </div>
                                </td>
                                <td style={{ textAlign: 'right', color: 'var(--state-ok-text)' }}>{have}</td>
                                <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{needed}</td>
                                <td style={{ textAlign: 'right', color: 'var(--state-ok-text)' }}>0</td>
                                <td><StashControl itemId={item.id} have={have} onUpdate={updateStash} /></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

