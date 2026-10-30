      {/* ===== TAB: EVENT（期間限定イベント・内容はイベントごとに差し替え） ===== */}
      {activeTab === 'event' && (
        <div>
          {/* イベント概要 */}
          <div className="section">
            <div className="section-title">
              <Icon name="trophy" size={14} color="var(--accent)" /> Blackout（期間限定イベント）
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
              <strong style={{ color: 'var(--warn-text)' }}>Skier</strong> がラボのセキュリティ脆弱性を発見し侵入計画を立案。
              しかし先行して謎の武装集団{' '}
              <strong style={{ color: 'var(--danger-text)' }}>Black Division</strong>（元SAS・リーダー: Wedge）がラボを占拠済み。
              ラボは停電・非常用電源に切り替わっており、封鎖区画が全て同一コードで開放可能になっている。
              <br />
              <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                ※ イベント終了日は未発表。全タスク完了で専用実績獲得。パッチ1.1.0「Kord Breach」への導入イベント。
              </span>
            </div>
          </div>

          {/* タスクツリー */}
          <div className="section">
            <div className="section-title">
              <Icon name="clipboard-list" size={14} color="var(--accent)" /> イベントタスク
              <span style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 'normal' }}>
                （{BLACKOUT_TASKS_STATIC.filter(t => isBlackoutDone(t)).length} / {BLACKOUT_TASKS_STATIC.length} クリア済み）
              </span>
            </div>

            {BLACKOUT_TASKS_STATIC.map((task, idx) => {
              const isDone = isBlackoutDone(task);
              const isLocked = task.prereqs.some(pk => {
                const dep = BLACKOUT_TASKS_STATIC.find(t => t.key === pk);
                return dep ? !isBlackoutDone(dep) : false;
              });

              return (
                <div key={task.key} style={{
                  background: isDone ? 'var(--state-ok-bg-faint)' : isLocked ? 'var(--bg-secondary)' : 'var(--bg-primary)',
                  border: `1px solid ${isDone ? 'var(--state-ok-border-weak)' : isLocked ? 'var(--border-light)' : 'var(--border)'}`,
                  borderRadius: 6,
                  marginBottom: 8,
                  opacity: isDone ? 0.75 : 1,
                }}>
                  {/* ヘッダー行 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, minWidth: 22, height: 22,
                      borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: isDone ? 'var(--state-ok)' : isLocked ? 'var(--border)' : 'var(--accent)',
                      color: isDone ? '#fff' : isLocked ? 'var(--text-dim)' : 'var(--accent-on)',
                      flexShrink: 0,
                    }}>{idx + 1}</span>

                    <span style={{ flex: 1 }}>
                      <span style={{
                        fontSize: 14, fontWeight: 'bold', display: 'block',
                        color: isDone ? 'var(--state-ok-text)' : isLocked ? 'var(--text-dim)' : 'var(--text-primary)',
                      }}>{task.nameJa || task.name}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{task.name}</span>
                    </span>

                    <span style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 10,
                      background: 'var(--bg-secondary)', color: 'var(--text-secondary)',
                      border: '1px solid var(--border)', whiteSpace: 'nowrap',
                    }}>{task.trader}</span>

                    {isLocked ? (
                      <span style={{ fontSize: 12, color: 'var(--state-locked)', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                        <Icon name="lock" size={12} color="var(--state-locked)" /> 前提未完了
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

                  {/* フレーバーテキスト（依頼トレーダーのセリフ） */}
                  {task.lore && (
                    <div style={{ padding: '6px 12px 8px', borderTop: '1px solid var(--border-light)' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 5 }}>
                        <Icon name="book" size={11} color="var(--text-dim)" /> {task.trader}
                      </div>
                      <div style={{
                        fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7,
                        fontStyle: 'italic', whiteSpace: 'pre-line',
                        borderLeft: '3px solid var(--border)', paddingLeft: 10,
                      }}>
                        {task.lore}
                      </div>
                    </div>
                  )}

                  {/* 目標 */}
                  <div style={{ padding: '6px 12px 8px', borderTop: '1px solid var(--border-light)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 5 }}>目標</div>
                    {task.objectives.map((obj, oi) => {
                      const typeInfo = getObjTypeLabel(obj.type);
                      return (
                        <div key={oi} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                          <span style={{ flexShrink: 0, marginTop: 1 }}>
                            <Icon name={typeInfo?.iconName || 'arrow-right'} size={12} color="var(--text-dim)" />
                          </span>
                          <span>{obj.description}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* 報酬 */}
                  <div style={{ padding: '6px 12px 8px', borderTop: '1px solid var(--border-light)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 5 }}>報酬</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                      {task.experience > 0 && (
                        <span className="reward-badge" style={{ background: 'var(--warn-bg)', color: 'var(--warn-text)', border: '1px solid rgba(245,158,11,0.3)' }}>
                          EXP +{task.experience.toLocaleString()}
                        </span>
                      )}
                      {task.rubles > 0 && (
                        <span className="reward-badge" style={{ background: 'var(--state-ok-bg-weak)', color: 'var(--state-ok-text)', border: '1px solid var(--state-ok-border-weak)' }}>
                          ₽{task.rubles.toLocaleString()}
                        </span>
                      )}
                      {task.rewardItems.map((ri, ii) => (
                        <span key={ii} className="reward-badge">
                          {ri.count > 1 ? `${ri.count}× ` : ''}{ri.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}

            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 8, textAlign: 'center' }}>
              イベントは進行中です。新タスクが追加され次第、ここに反映されます。
            </div>
          </div>

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

