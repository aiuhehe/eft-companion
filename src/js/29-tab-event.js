      {/* ===== TAB: EVENT（期間限定イベント・内容はイベントごとに差し替え） ===== */}
      {activeTab === 'event' && (
        <div>
          {/* イベント概要 */}
          <div className="section">
            <div className="section-title">
              <Icon name="trophy" size={14} color="var(--accent)" /> ハロウィン2026（期間限定イベント）
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
              Tarkov で新たな感染症が発生。感染者で溢れた <strong style={{ color: 'var(--danger-text)' }}>Infected Factory</strong> と{' '}
              <strong style={{ color: 'var(--danger-text)' }}>Infected Lab</strong> が専用マップとして登場（少人数のみ・保険なし）。
              感染者を力で封じ込める <strong style={{ color: 'var(--warn-text)' }}>Skier</strong> と、
              治療法を探る <strong style={{ color: 'var(--info)' }}>Therapist</strong> のどちらに協力するかで、クエストが途中から分岐する。
              <br />
              <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                ※ 分岐では選ばなかった側のタスクが失敗扱いになる。イベント終了日は未発表。情報源: Fandom Wiki（2026-10-30 時点・編集途中の項目あり）。
              </span>
            </div>
          </div>

          {(() => {
            const TASKS = BLACKOUT_TASKS_STATIC;
            const byKey = Object.fromEntries(TASKS.map(t => [t.key, t]));
            const done = key => byKey[key] ? isBlackoutDone(byKey[key]) : false;
            // 状態: done（完了）/ failed（分岐で反対側を完了）/ locked（前提未完了）/ pending（詳細不明）/ open
            const statusOf = t => {
              if (isBlackoutDone(t)) return 'done';
              if (t.choice && TASKS.some(o => o.choice === t.choice && o.key !== t.key && isBlackoutDone(o))) return 'failed';
              const allOk = (t.prereqs || []).every(done);
              const anyOk = !(t.prereqsAny || []).length || t.prereqsAny.some(done);
              if (!allOk || !anyOk) return 'locked';
              if (t.pending) return 'pending';
              return 'open';
            };
            const BRANCH_COLOR = { skier: 'var(--warn)', therapist: 'var(--info)' };
            const branchColor = t => BRANCH_COLOR[t.branch] || 'var(--accent)';
            const STATUS_META = {
              done:    { icon: 'circle-check',   color: 'var(--state-ok)',     label: '完了' },
              failed:  { icon: 'circle-x',       color: 'var(--danger)',       label: '失敗（選択外）' },
              locked:  { icon: 'lock',           color: 'var(--text-dim)',     label: '前提未完了' },
              pending: { icon: 'clock',          color: 'var(--text-dim)',     label: '詳細未判明' },
              open:    { icon: 'arrow-right',    color: 'var(--accent)',       label: '受注可能' },
            };
            const scrollToTask = key => {
              document.getElementById(`event-task-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            };
            const doneCount = TASKS.filter(t => isBlackoutDone(t)).length;
            const numOf = k => TASKS.findIndex(t => t.key === k) + 1;

            // アイテムID → アイコンURL（API取得済みならそのiconLink、未取得なら tarkov.dev の画像URL規則で組み立て）
            const neededIds = new Set([
              ...TASKS.flatMap(t => [t, ...(t.variants || [])].flatMap(s => (s.rewardItems || []).map(r => r.id))),
              ...EVENT_PREP.flatMap(p => p.itemIds || []),
              ...Object.values(CURRENCY_ITEM_IDS),
            ].filter(Boolean));
            const apiIcons = {};
            apiData.items.forEach(i => { if (neededIds.has(i.id) && i.iconLink && !i.iconLink.includes('unknown-item')) apiIcons[i.id] = i.iconLink; });
            const itemIcon = id => id ? (apiIcons[id] || `https://assets.tarkov.dev/${id}-icon.webp`) : '';
            const ItemImg = ({ id, size }) => id ? (
              <img src={itemIcon(id)} alt="" className="event-item-img" style={{ width: size, height: size }}
                onError={e => { e.target.style.display = 'none'; }} />
            ) : null;

            // カスタムタスクとして出撃準備タブに追加（同じタスクは上書き）
            const customIdOf = t => `custom_event_${t.key}`;
            const isAddedAsCustom = t => customTasks.some(ct => ct.id === customIdOf(t));
            const addAsCustomTask = (t, variant) => {
              const ct = eventTaskToCustomTask(t, variant, itemIcon);
              saveCustomTasks([...customTasks.filter(x => x.id !== ct.id), ct]);
              setPinnedTaskIds(prev => prev.includes(ct.id) ? prev : [...prev, ct.id]);
            };
            const AddCustomButton = ({ t, variant }) => {
              const added = isAddedAsCustom(t);
              return (
                <button className="btn btn-sm btn-gray" onClick={() => addAsCustomTask(t, variant)}
                  title={added ? '出撃準備タブのカスタムタスクを、この内容で上書きします' : '目標・報酬ごと出撃準備タブのカスタムタスクに登録し、進行中にします'}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', color: added ? 'var(--state-ok-text)' : undefined }}>
                  <Icon name={added ? 'circle-check' : 'plus'} size={12} color={added ? 'var(--state-ok-text)' : 'currentColor'} />
                  {added ? 'カスタムタスク登録済み（上書き）' : 'カスタムタスクに追加'}
                </button>
              );
            };

            const FlowNode = ({ k }) => {
              const t = byKey[k];
              if (!t) return null;
              const st = statusOf(t);
              const meta = STATUS_META[st];
              return (
                <button className={`event-flow-node is-${st}`} onClick={() => scrollToTask(k)}
                  style={{ borderLeftColor: branchColor(t) }} title={`${t.name}（${meta.label}）`}>
                  <span className="event-flow-num" style={{
                    background: st === 'done' ? 'var(--state-ok)' : st === 'open' ? 'var(--accent)' : 'var(--border)',
                    color: st === 'done' ? '#fff' : st === 'open' ? 'var(--accent-on)' : 'var(--text-dim)',
                  }}>{numOf(k)}</span>
                  <Icon name={meta.icon} size={14} color={meta.color} />
                  <span style={{ minWidth: 0 }}>
                    <span className="event-flow-name">{t.nameJa}</span>
                    <span className="event-flow-sub">{t.trader}{t.map ? ` ・ ${t.map}` : ''}</span>
                  </span>
                </button>
              );
            };

            const MoneyBadges = ({ src }) => (
              <>
                {src.experience > 0 && (
                  <span className="reward-badge" style={{ background: 'var(--warn-bg)', color: 'var(--warn-text)', border: '1px solid var(--warn)' }}>
                    EXP +{src.experience.toLocaleString()}
                  </span>
                )}
                {[['rubles', '₽'], ['euros', '€'], ['dollars', '$']].map(([f, sym]) => src[f] > 0 && (
                  <span key={f} className="reward-badge" style={{ background: 'var(--state-ok-bg-weak)', color: 'var(--state-ok-text)', border: '1px solid var(--state-ok-border-weak)' }}>
                    {sym}{src[f].toLocaleString()}
                  </span>
                ))}
              </>
            );
            const ObjectiveList = ({ objectives }) => objectives.map((obj, oi) => {
              const typeInfo = getObjTypeLabel(obj.type);
              return (
                <div key={oi} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  <span style={{ flexShrink: 0, marginTop: 1 }}>
                    <Icon name={typeInfo?.iconName || 'arrow-right'} size={12} color="var(--text-dim)" />
                  </span>
                  <span>{obj.description}</span>
                </div>
              );
            });
            const RewardList = ({ src }) => (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                <MoneyBadges src={src} />
                {(src.rewardItems || []).map((ri, ii) => (
                  <span key={ii} className="reward-badge event-reward-item"
                    style={ri.unlock ? { background: 'var(--state-ok-deep)', border: '1px solid var(--state-ok)', color: 'var(--state-ok-text)' } : {}}>
                    <ItemImg id={ri.id} size={20} />
                    {ri.unlock && <Icon name="lock-open" size={11} color="var(--state-ok-text)" />}
                    {ri.unlock ? `バーター解放 ${ri.unlock.trader} LL${ri.unlock.level}: ` : ''}
                    {ri.count > 1 ? `${ri.count}× ` : ''}{ri.name}
                  </span>
                ))}
              </div>
            );

            return (
              <>
                {/* 分岐フロー図 */}
                <div className="section">
                  <div className="section-title">
                    <Icon name="sitemap" size={14} color="var(--accent)" /> タスクツリー
                    <span style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 'normal' }}>
                      （{doneCount} / {TASKS.length} クリア済み・クリックで詳細へ）
                    </span>
                  </div>
                  <div className="event-flow-legend">
                    <span><i style={{ background: 'var(--warn)' }} /> Skier 陣営</span>
                    <span><i style={{ background: 'var(--info)' }} /> Therapist 陣営</span>
                    <span><i style={{ background: 'var(--accent)' }} /> 共通</span>
                    {['done', 'failed', 'locked', 'pending'].map(s => (
                      <span key={s}><Icon name={STATUS_META[s].icon} size={12} color={STATUS_META[s].color} /> {STATUS_META[s].label}</span>
                    ))}
                  </div>
                  <div className="event-flow">
                    {EVENT_FLOW.map((row, ri) => (
                      <React.Fragment key={ri}>
                        {ri > 0 && (
                          <div className="event-flow-arrow"><Icon name="chevron-down" size={16} color="var(--text-dim)" /></div>
                        )}
                        {row.choice && (
                          <div className="event-flow-choice-label">
                            <Icon name="alert-triangle" size={12} color="var(--warn-text)" /> {row.choice}
                            <span style={{ color: 'var(--text-dim)', fontWeight: 'normal' }}>（どちらか一方・反対側は失敗）</span>
                          </div>
                        )}
                        {row.center ? (
                          <div className="event-flow-row is-center">
                            {row.center.map(k => <FlowNode key={k} k={k} />)}
                          </div>
                        ) : (
                          <div className={`event-flow-row${row.choice ? ' is-choice' : ''}`}>
                            <div className="event-flow-lane">{row.skier.map(k => <FlowNode key={k} k={k} />)}</div>
                            {row.choice && <div className="event-flow-or">or</div>}
                            <div className="event-flow-lane">{row.therapist.map(k => <FlowNode key={k} k={k} />)}</div>
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {/* 準備するもの */}
                <div className="section">
                  <div className="section-title">
                    <Icon name="backpack" size={14} color="var(--accent)" /> 先に用意しておくもの
                  </div>
                  <div className="event-prep-grid">
                    {EVENT_PREP.map((p, i) => (
                      <div key={i} className="event-prep-item">
                        {(p.itemIds || []).length > 0 && (
                          <div className="event-prep-icons">
                            {p.itemIds.map(id => <ItemImg key={id} id={id} size={36} />)}
                          </div>
                        )}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 'bold', color: 'var(--text-primary)' }}>{p.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{p.note}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* タスク詳細カード */}
                <div className="section">
                  <div className="section-title">
                    <Icon name="clipboard-list" size={14} color="var(--accent)" /> イベントタスク詳細
                  </div>

                  {TASKS.map((task, idx) => {
                    const st = statusOf(task);
                    const isDone = st === 'done';
                    const isLocked = st === 'locked';
                    const isFailed = st === 'failed';
                    const dim = isLocked || isFailed;

                    return (
                      <div key={task.key} id={`event-task-${task.key}`} style={{
                        background: isDone ? 'var(--state-ok-bg-faint)' : isFailed ? 'var(--danger-bg-faint)' : dim ? 'var(--bg-secondary)' : 'var(--bg-primary)',
                        border: `1px solid ${isDone ? 'var(--state-ok-border-weak)' : isFailed ? 'var(--danger-border-weak)' : dim ? 'var(--border-light)' : 'var(--border)'}`,
                        borderLeft: `4px solid ${branchColor(task)}`,
                        borderRadius: 6,
                        marginBottom: 8,
                        opacity: isDone || isFailed ? 0.75 : 1,
                        scrollMarginTop: 12,
                      }}>
                        {/* ヘッダー行 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: 11, fontWeight: 700, minWidth: 22, height: 22,
                            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: isDone ? 'var(--state-ok)' : dim ? 'var(--border)' : 'var(--accent)',
                            color: isDone ? '#fff' : dim ? 'var(--text-dim)' : 'var(--accent-on)',
                            flexShrink: 0,
                          }}>{idx + 1}</span>

                          <span style={{ flex: 1, minWidth: 160 }}>
                            <span style={{
                              fontSize: 14, fontWeight: 'bold', display: 'block',
                              color: isDone ? 'var(--state-ok-text)' : dim ? 'var(--text-dim)' : 'var(--text-primary)',
                              textDecoration: isFailed ? 'line-through' : 'none',
                            }}>{task.nameJa || task.name}</span>
                            <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{task.name}</span>
                          </span>

                          {task.choice && (
                            <span className="event-choice-badge">
                              <Icon name="alert-triangle" size={11} color="var(--warn-text)" />
                              {task.choice === 'c1' ? '分岐①' : '分岐②'}
                            </span>
                          )}
                          {task.map && (
                            <span style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap' }}>
                              <Icon name="map" size={11} color="var(--text-dim)" /> {task.map}
                            </span>
                          )}
                          <span style={{
                            fontSize: 11, padding: '2px 8px', borderRadius: 10,
                            background: 'var(--bg-secondary)', color: branchColor(task),
                            border: `1px solid ${branchColor(task)}`, whiteSpace: 'nowrap',
                          }}>{task.trader}</span>

                          {isLocked ? (
                            <span style={{ fontSize: 12, color: 'var(--state-locked)', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                              <Icon name="lock" size={12} color="var(--state-locked)" /> 前提未完了
                            </span>
                          ) : isFailed ? (
                            <span style={{ fontSize: 12, color: 'var(--danger-text)', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                              <Icon name="circle-x" size={12} color="var(--danger-text)" /> 反対側を選択済み
                            </span>
                          ) : task.pending ? (
                            <span style={{ fontSize: 12, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                              <Icon name="clock" size={12} color="var(--text-dim)" /> 詳細未判明
                            </span>
                          ) : (
                            <button onClick={() => toggleBlackoutDone(task.key, task.apiId)}
                              className={`btn btn-sm${isDone ? '' : ' btn-yellow'}`}
                              style={isDone ? { background: 'var(--state-ok-bg)', color: 'var(--state-ok-text)', border: '1px solid var(--state-ok-border-weak)' } : {}}>
                              <Icon name={isDone ? 'circle-x' : 'circle-check'} size={13}
                                color={isDone ? 'var(--state-ok-text)' : 'var(--accent-on)'} />
                              {isDone ? '完了を取り消す' : 'クリア済みにする'}
                            </button>
                          )}
                        </div>

                        {task.unlockNote && (
                          <div style={{ padding: '0 12px 6px 42px', fontSize: 11, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Icon name="lock-open" size={11} color="var(--text-dim)" /> {task.unlockNote}
                          </div>
                        )}

                        {task.pending ? (
                          <div style={{ padding: '6px 12px 10px', borderTop: '1px solid var(--border-light)', fontSize: 12, color: 'var(--text-dim)' }}>
                            前のタスクの「次のタスク」として名前だけ判明。目標・報酬は Wiki 未掲載。
                          </div>
                        ) : (
                          <>
                            {/* 概要（依頼内容の要約） */}
                            {task.lore && (
                              <div style={{ padding: '6px 12px 8px', borderTop: '1px solid var(--border-light)' }}>
                                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 5 }}>
                                  <Icon name="book" size={11} color="var(--text-dim)" /> {task.trader} の依頼
                                </div>
                                <div style={{
                                  fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7,
                                  whiteSpace: 'pre-line', borderLeft: '3px solid var(--border)', paddingLeft: 10,
                                }}>
                                  {task.lore}
                                </div>
                              </div>
                            )}

                            {task.variants ? (
                              /* 分岐①の選択で内容が変わるタスク: 両パターンを並べる */
                              <div className="event-variant-grid">
                                {task.variants.map((v, vi) => (
                                  <div key={vi} className="event-variant">
                                    <div style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 6, color: vi === 0 ? 'var(--warn-text)' : 'var(--info)' }}>
                                      {v.label}
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 5 }}>目標</div>
                                    <ObjectiveList objectives={v.objectives} />
                                    <div style={{ fontSize: 11, color: 'var(--text-dim)', margin: '6px 0 5px' }}>報酬</div>
                                    <RewardList src={v} />
                                    <div style={{ marginTop: 8 }}>
                                      <AddCustomButton t={task} variant={v} />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <>
                                <div style={{ padding: '6px 12px 8px', borderTop: '1px solid var(--border-light)' }}>
                                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 5 }}>目標</div>
                                  <ObjectiveList objectives={task.objectives} />
                                </div>
                                <div style={{ padding: '6px 12px 8px', borderTop: '1px solid var(--border-light)' }}>
                                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 5 }}>報酬</div>
                                  <RewardList src={task} />
                                </div>
                              </>
                            )}

                            {/* 攻略メモ */}
                            {task.tips?.length > 0 && (
                              <div style={{ padding: '6px 12px 8px', borderTop: '1px solid var(--border-light)' }}>
                                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 5 }}>攻略メモ</div>
                                {task.tips.map((tip, ti) => (
                                  <div key={ti} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 3 }}>
                                    <span style={{ flexShrink: 0, marginTop: 1 }}><Icon name="map-pin" size={12} color="var(--text-dim)" /></span>
                                    <span>{tip}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* カスタムタスクとして出撃準備タブへ（分岐パターンがあるタスクは各パターン内のボタンから） */}
                            {!task.variants && (
                              <div style={{ padding: '6px 12px 8px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'flex-end' }}>
                                <AddCustomButton t={task} />
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}

                  <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 8, textAlign: 'center' }}>
                    イベントは進行中です。新タスクが判明し次第、ここに反映されます。
                  </div>
                </div>
              </>
            );
          })()}

          {/* ===== ボスイベント: ボスアイテム交換バーター ===== */}
          <div className="section">
            <div className="section-title">
              <Icon name="skull" size={14} color="var(--accent)" /> ボスアイテム交換イベント
              {bossEventBarters.length > 0 && (
                <span style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 'normal' }}>
                  （{bossEventBarters.length}件）
                </span>
              )}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 10 }}>
              ボス100%スポーン中。ボスドロップアイテムをトレーダーに渡すと限定アイテムと交換できます。
            </div>

            {apiData.barters.length === 0 ? (
              <div style={{
                padding: '12px 14px', borderRadius: 6, fontSize: 13,
                background: 'var(--bg-secondary)', color: 'var(--text-dim)',
                border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <Icon name="refresh" size={14} color="var(--text-dim)" />
                ステータスタブの「データ取得」ボタンを押すと自動で一覧が表示されます。
              </div>
            ) : bossEventBarters.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>
                ボスアイテム交換バーターが見つかりません（イベント終了またはAPI未反映の可能性）。
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {bossEventBarters.map((barter, idx) => {
                  const reward = barter.rewardItems?.[0];
                  if (!reward) return null;
                  return (
                    <div key={idx} style={{
                      background: 'var(--bg-primary)', border: '1px solid var(--border)',
                      borderRadius: 6, padding: '8px 12px',
                      display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                    }}>
                      {/* 報酬アイテム */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 160 }}>
                        {reward.item.iconLink && (
                          <img src={reward.item.iconLink} alt="" style={{ width: 32, height: 32, objectFit: 'contain', flexShrink: 0 }}
                            onError={e => { e.target.style.display = 'none'; }} />
                        )}
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 'bold', color: 'var(--text-primary)' }}>
                            {reward.count > 1 ? `${reward.count}× ` : ''}{reward.item.name}
                          </div>
                          {barter.rewardItems.length > 1 && (
                            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                              +{barter.rewardItems.slice(1).map(r => `${r.count}× ${r.item.name}`).join(', ')}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 矢印 */}
                      <Icon name="arrow-right" size={14} color="var(--text-dim)" />

                      {/* 必要アイテム */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                        {(barter.requiredItems || []).map((r, ri) => (
                          <span key={ri} style={{
                            fontSize: 12, padding: '2px 8px', borderRadius: 10,
                            background: 'var(--danger-bg-faint)', color: 'var(--danger-text)',
                            border: '1px solid var(--danger-border-weak)', whiteSpace: 'nowrap',
                            display: 'flex', alignItems: 'center', gap: 4,
                          }}>
                            {r.item.iconLink && (
                              <img src={r.item.iconLink} alt="" style={{ width: 16, height: 16, objectFit: 'contain' }}
                                onError={e => { e.target.style.display = 'none'; }} />
                            )}
                            {r.count > 1 ? `${r.count}× ` : ''}{r.item.shortName || r.item.name}
                          </span>
                        ))}
                      </div>

                      {/* トレーダー */}
                      <span style={{
                        fontSize: 11, padding: '2px 8px', borderRadius: 10, whiteSpace: 'nowrap',
                        background: 'var(--bg-secondary)', color: 'var(--text-secondary)',
                        border: '1px solid var(--border)', marginLeft: 'auto',
                      }}>
                        {barter.trader?.name} LL{barter.level}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

