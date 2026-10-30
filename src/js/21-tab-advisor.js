      {/* ===== TAB: ADVISOR ===== */}
      {activeTab === 'advisor' && (
        <div>
          <div className="section" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px 8px', borderBottom: '1px solid #2d3748', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div className="section-title" style={{ marginBottom: 0 }}><Icon name="chart-bar" size={14} color="var(--accent)" /> トレーダーLL解放アドバイザー</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>ソート:</span>
                <select value={advisorSort} onChange={e => setAdvisorSort(e.target.value)} style={{ fontSize: 12 }}>
                  <option value="priority">優先度順</option>
                  <option value="commerce">取引額不足が少ない順</option>
                  <option value="level">レベルに近い順</option>
                  <option value="close">総合 (条件達成に近い順)</option>
                </select>
              </div>
            </div>
            {apiData.traders.length === 0 ? (
              <div style={{ padding: 16, color: 'var(--text-dim)', fontSize: 13 }}>APIデータを取得してください。</div>
            ) : (
              <table style={{ tableLayout: 'fixed', width: '100%' }}>
                <colgroup>
                  <col style={{ width: 110 }} />{/* トレーダー名 */}
                  <col style={{ width: 80 }} />{/* LL */}
                  <col style={{ width: 110 }} />{/* 優先度 */}
                  <col style={{ width: 115 }} />{/* プレイヤーLv */}
                  <col style={{ width: 115 }} />{/* 信頼度 */}
                  <col style={{ width: 180 }} />{/* 取引額 */}
                  <col />{/* 備考 - 残り幅を使う */}
                  <col style={{ width: 36 }} />{/* プラン */}
                </colgroup>
                <thead>
                  <tr>
                    <th>トレーダー</th>
                    <th>LL</th>
                    <th>優先度</th>
                    <th>プレイヤーLv</th>
                    <th>信頼度</th>
                    <th>取引額</th>
                    <th>備考</th>
                    <th><Icon name="calendar-plus" size={11} color="var(--text-dim)" /></th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const sorted = [...traderAnalytics];
                    if (advisorSort === 'commerce') {
                      sorted.sort((a, b) => (a.commerceDiff <= 0 ? -Infinity : a.commerceDiff) - (b.commerceDiff <= 0 ? -Infinity : b.commerceDiff));
                    } else if (advisorSort === 'level') {
                      sorted.sort((a, b) => (a.levelOk ? -1 : a.levelDiff) - (b.levelOk ? -1 : b.levelDiff));
                    } else if (advisorSort === 'close') {
                      sorted.sort((a, b) => {
                        const score = r => [!r.levelOk, !r.repOk, !r.commerceOk].filter(Boolean).length;
                        return score(a) - score(b);
                      });
                    }
                    return sorted;
                  })().map(({ trader, currentLL, nextLL, priority, reason, reqLevel, reqRep, reqCommerce, levelOk, repOk, commerceOk, effectiveRep, currency }) => {
                    const st = traderStatus[trader.id] || {};
                    const noCommerce = TRADER_LIST.find(t => t.id === trader.id)?.noCommerce;
                    const rowBg = priority === 'urgent' ? 'var(--danger-bg-weak)' : priority === 'soon' ? 'var(--warn-bg-weak)' : 'transparent';
                    const badgeLabel = priority === 'urgent' ? '最優先' : priority === 'soon' ? 'あと少し' : priority === 'ok' ? 'OK' : '遠い';
                    const badgeDot = priority === 'urgent' ? 'var(--danger)' : priority === 'soon' ? 'var(--warn)' : priority === 'ok' ? 'var(--state-ok)' : '#64748b';
                    const badgeStyle = {
                      urgent: { background: 'var(--danger-bg)',  color: 'var(--danger-text)', border: '1px solid var(--danger)' },
                      soon:   { background: 'var(--warn-bg-mid)', color: 'var(--warn-text)', border: '1px solid var(--warn)' },
                      ok:     { background: 'var(--state-ok-bg)',  color: 'var(--state-ok-text)', border: '1px solid var(--state-ok)' },
                      far:    { background: 'var(--bg-secondary)', color: 'var(--text-dim)', border: '1px solid var(--border)' },
                    }[priority] || {};
                    return (
                      <tr key={trader.id} style={{ background: rowBg }}>
                        <td style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{trader.name}</td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>LL{currentLL}→{nextLL}</td>
                        <td>
                          <span className="priority-badge" style={badgeStyle}>
                            <span style={{width:7,height:7,borderRadius:'50%',background:badgeDot,display:'inline-block',flexShrink:0}} /> {badgeLabel}
                          </span>
                        </td>
                        <td>
                          <div className="check-cell">
                            <Icon name={levelOk ? 'circle-check' : 'circle-x'} size={14} color={levelOk ? 'var(--state-ok)' : 'var(--danger)'} />
                            <span style={{ color: levelOk ? 'var(--state-ok-text)' : 'var(--danger-text)' }}>{playerLevel} / {reqLevel}</span>
                          </div>
                        </td>
                        <td>
                          <div className="check-cell">
                            <Icon name={repOk ? 'circle-check' : 'circle-x'} size={14} color={repOk ? 'var(--state-ok)' : 'var(--danger)'} />
                            <span style={{ color: repOk ? 'var(--state-ok-text)' : 'var(--danger-text)' }}>{effectiveRep.toFixed(2)} / {reqRep}</span>
                          </div>
                        </td>
                        <td>
                          {noCommerce
                            ? <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>—</span>
                            : <div className="check-cell">
                                <Icon name={commerceOk ? 'circle-check' : 'circle-x'} size={14} color={commerceOk ? 'var(--state-ok)' : 'var(--danger)'} />
                                <span style={{ color: commerceOk ? 'var(--state-ok-text)' : 'var(--danger-text)' }}>
                                  {fmtCurrency(st.commerce || 0, currency)} / {fmtCurrency(reqCommerce, currency)}
                                </span>
                              </div>
                          }
                        </td>
                        <td style={{ fontSize: 11, verticalAlign: 'top', paddingTop: 7 }}>
                          {priority === 'urgent'
                            ? <span style={{ color: 'var(--danger-text)' }}>タスクを消化してください</span>
                            : reason.length === 0
                              ? <span style={{ color: '#4b5563' }}>—</span>
                              : <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                  {reason.map((r, i) => (
                                    <span key={i} style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{r}</span>
                                  ))}
                                </div>
                          }
                        </td>
                        <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                          {(() => {
                            const planId = `plan_trader_${trader.id}_${nextLL}`;
                            const inPlan = planItems.some(p => p.id === planId);
                            return (
                              <Tooltip text={inPlan ? 'プランに追加済み' : 'プランに追加'}>
                                <button onClick={() => { if (!inPlan) addPlanItem({ id: planId, type: 'trader', traderId: trader.id, traderName: trader.name, level: nextLL, addedAt: new Date().toISOString() }); }}
                                  className="card-btn"
                                  style={{ background: inPlan ? 'var(--accent-muted)' : 'var(--bg-secondary)', color: inPlan ? 'var(--accent)' : 'var(--text-dim)' }}>
                                  <Icon name="calendar-plus" size={13} color="currentColor" />
                                </button>
                              </Tooltip>
                            );
                          })()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

