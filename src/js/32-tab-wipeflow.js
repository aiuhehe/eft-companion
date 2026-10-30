      {/* ===== TAB: PLAN (プラン) ===== */}
      {activeTab === 'wipeflow' && (() => {
        const hasData = apiData.tasks.length > 0;

        const getGoalLabel = (item) => {
          if (item.type === 'task')        return taskById[item.taskId]?.name || '（タスク）';
          if (item.type === 'project_tab') return item.name || '（タブ）';
          if (item.type === 'hideout')     return `${item.stationName} Lv${item.level}`;
          if (item.type === 'trader')      return `${item.traderName} LL${item.level}`;
          if (item.type === 'barter')      return item.name || '（バーター）';
          return '（不明）';
        };
        const isGoalDone = (item) => {
          if (item.type === 'task')        return completedTaskIds.includes(item.taskId);
          if (item.type === 'project_tab') return completedTaskIds.includes(item.goalTaskId);
          if (item.type === 'hideout')     return (hideoutLevels[item.stationId] || 0) >= item.level;
          if (item.type === 'trader')      return (traderStatus[item.traderId]?.ll || 1) >= item.level;
          return false;
        };

        // 複数ゴールに貢献するタスクのカウント
        const multiGoalCount = {};
        planItems.forEach(item => {
          const goalId = item.type === 'task' ? item.taskId : item.type === 'project_tab' ? item.goalTaskId : null;
          if (!goalId) return;
          getAncestorTaskIds(goalId).forEach(id => { multiGoalCount[id] = (multiGoalCount[id] || 0) + 1; });
        });

        // マップタブ設定
        const allMaps = planAvailableMaps;
        const noneCount = planAvailableNow.filter(t => taskMapNames(t).length === 0).length;
        const tabs = [...allMaps, ...(noneCount > 0 ? ['__none__'] : [])];
        const effectiveMapTab = planMapTab && tabs.includes(planMapTab)
          ? planMapTab : (tabs[0] || null);

        const getTasksForMap = (mapName) => {
          if (mapName === '__none__') return planAvailableNow.filter(t => taskMapNames(t).length === 0);
          return planAvailableNow.filter(t => {
            const maps = taskMapNames(t);
            return maps.includes(mapName) || maps.length === 0;
          });
        };

        const groupTasks = (tasks) => {
          const seqTasks = [], parTasks = [];
          tasks.forEach(t => {
            const nextLockedList = (taskSuccessorsMap[t.id] || [])
              .filter(s => planTaskIds.has(s.id) && !completedTaskIds.includes(s.id));
            if (nextLockedList.length > 0) seqTasks.push({ task: t, nextLocked: nextLockedList[0] });
            else parTasks.push(t);
          });
          return { parTasks, seqTasks };
        };

        const curMapTasks = effectiveMapTab ? getTasksForMap(effectiveMapTab) : [];
        const { parTasks, seqTasks } = groupTasks(curMapTasks);

        // タスク行（B section用）
        const PlanTaskRow = ({ task, locked, treePrefix }) => {
          const maps = taskMapNames(task);
          const isAnyMap = maps.length === 0;
          const multi = (multiGoalCount[task.id] || 0) > 1;
          return (
            <div className={`plan-task-row${locked ? ' is-locked' : ''}${treePrefix ? ' is-tree-child' : ''}`}>
              {treePrefix && <span className="plan-tree-prefix">{treePrefix}</span>}
              {locked && <Icon name="lock" size={12} color="var(--text-dim)" style={{ flexShrink: 0 }} />}
              <div className="plan-task-main">
                <span className="plan-task-name">{task.name}</span>
                {task.trader?.name && <span className="plan-badge plan-badge-trader">{task.trader.name}</span>}
                {task.experience > 0 && <span className="plan-badge plan-badge-exp">+{task.experience.toLocaleString()} EXP</span>}
                {isAnyMap && <span className="plan-badge plan-badge-any">どこでも</span>}
                {multi && <span className="plan-badge plan-badge-multi">★ {multiGoalCount[task.id]}ゴール</span>}
              </div>
              <div className="plan-task-actions">
                <button className="btn btn-sm plan-go-btn"
                  onClick={() => { setActiveTab('tasks'); searchForTaskByName(task.name, task.id); }}>
                  <Icon name="search" size={11} color="var(--text-secondary)" /> 検索へ
                </button>
                {!locked && (
                  <button onClick={() => toggleComplete(task.id)} className="btn btn-sm plan-done-btn">
                    <Icon name="circle-check" size={11} color="var(--state-ok-text)" /> 完了
                  </button>
                )}
              </div>
            </div>
          );
        };

        // ゴール詳細ツリー（Section F）
        const PlanTree = ({ taskId, seen = new Set() }) => {
          if (seen.has(taskId)) return null;
          const t = taskById[taskId];
          if (!t) return null;
          const done = completedTaskIds.includes(taskId);
          const prereqs = (t.taskRequirements || []).filter(r => r.task?.id && !seen.has(r.task.id));
          const nextSeen = new Set(seen); nextSeen.add(taskId);
          return (
            <div className="ptree-node">
              {prereqs.length > 0 && (
                <div className="ptree-prereqs">
                  {prereqs.map(r => <PlanTree key={r.task.id} taskId={r.task.id} seen={nextSeen} />)}
                </div>
              )}
              {prereqs.length > 0 && <span className="tree-arrow">→</span>}
              <span onClick={() => { setActiveTab('tasks'); searchForTaskByName(t.name, taskId); }}
                className={`ptree-chip${done ? ' is-done' : ''}`}
                title={`${t.trader?.name || ''} ${t.name}`}>
                <span className="task-muted-sm">{t.trader?.name || ''}</span>
                {t.name}
                {done && <Icon name="check" size={11} color="var(--state-ok-text)" />}
              </span>
            </div>
          );
        };

        return (
          <div>
            {/* ===== A: ゴール一覧 ===== */}
            <div className="section">
              <div className="section-title" style={{ justifyContent: 'space-between' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="calendar-plus" size={14} color="var(--accent)" /> プラン
                  <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 'normal' }}>（{getModeLabel(activeMode)}）</span>
                </span>
                <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                  <button className="btn btn-gray btn-sm" onClick={exportPlan}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Icon name="upload" size={12} color="var(--text-secondary)" /> エクスポート
                  </button>
                  <button className="btn btn-gray btn-sm" onClick={importPlan}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Icon name="download" size={12} color="var(--text-secondary)" /> インポート
                  </button>
                  {planItems.length > 0 && (
                    <button className="btn btn-gray btn-sm" onClick={resetPlan}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Icon name="refresh" size={12} color="var(--text-secondary)" /> リセット
                    </button>
                  )}
                </div>
              </div>
              {planItems.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.9 }}>
                  ゴールがまだありません。<br />
                  タスク検索・ハイドアウト・トレーダー解放・欲しいものリストの
                  <Icon name="calendar-plus" size={12} color="var(--text-dim)" style={{ margin: '0 3px', verticalAlign: 'middle' }} />
                  ボタンからゴールを追加してください。
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {planItems.map(item => {
                    const meta = PLAN_TYPE_META[item.type] || PLAN_TYPE_META.task;
                    const done = isGoalDone(item);
                    return (
                      <span key={item.id} className={`plan-goal-chip${done ? ' is-done' : ''}`}>
                        <Icon name={meta.icon} size={12} color={done ? 'var(--text-dim)' : meta.color} />
                        <span className="plan-goal-label">{getGoalLabel(item)}</span>
                        <button className="plan-chip-del" onClick={() => removePlanItem(item.id)} title="削除">
                          <Icon name="x" size={10} color="currentColor" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ===== B: 今すぐやること ===== */}
            {hasData && planTaskIds.size > 0 && (
              <div className="section">
                <div className="section-title" style={{ justifyContent: 'space-between' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Icon name="arrow-right" size={14} color="var(--accent)" /> 今すぐやること
                  </span>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 'normal' }}>
                    <input type="checkbox" checked={planShowNext} onChange={e => setPlanShowNext(e.target.checked)} />
                    次のタスクをプレビュー
                  </label>
                </div>
                {planAvailableNow.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--state-ok-text)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Icon name="circle-check" size={14} color="var(--state-ok)" /> 全タスクが完了しています！
                  </div>
                ) : (
                  <>
                    {/* マップタブ */}
                    <div className="plan-map-tabs">
                      {allMaps.map(m => {
                        const cnt = getTasksForMap(m).length;
                        return (
                          <button key={m} onClick={() => setPlanMapTab(m)}
                            className={`plan-map-tab${effectiveMapTab === m ? ' is-active' : ''}`}>
                            {m} <span className="plan-tab-cnt">{cnt}</span>
                          </button>
                        );
                      })}
                      {noneCount > 0 && (
                        <button onClick={() => setPlanMapTab('__none__')}
                          className={`plan-map-tab${effectiveMapTab === '__none__' ? ' is-active' : ''}`}>
                          マップ指定なし <span className="plan-tab-cnt">{noneCount}</span>
                        </button>
                      )}
                    </div>
                    {effectiveMapTab && (
                      curMapTasks.length === 0 ? (
                        <div style={{ fontSize: 12, color: 'var(--text-dim)', padding: '6px 0' }}>
                          このマップの着手可能タスクはありません
                        </div>
                      ) : (
                        <>
                          {parTasks.length > 0 && (
                            <div className="plan-group">
                              <div className="plan-group-head">
                                <Icon name="link" size={12} color="var(--text-dim)" />
                                同時進行可 — 独立しているので一緒に消化できます
                              </div>
                              {parTasks.map(t => <PlanTaskRow key={t.id} task={t} locked={false} />)}
                            </div>
                          )}
                          {seqTasks.length > 0 && (
                            <div className="plan-group">
                              <div className="plan-group-head">
                                <Icon name="arrow-right" size={12} color="var(--text-dim)" />
                                順番あり — 上から消化してください
                              </div>
                              {seqTasks.map(({ task, nextLocked }) => (
                                <div key={task.id}>
                                  <PlanTaskRow task={task} locked={false} />
                                  {planShowNext && nextLocked && (
                                    <PlanTaskRow task={nextLocked} locked={true} treePrefix="└─" />
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )
                    )}
                  </>
                )}
              </div>
            )}

            {/* ===== E: 必要アイテム合算 ===== */}
            {planRequiredItems.length > 0 && (
              <div className="section">
                <div className="section-title">
                  <Icon name="package" size={14} color="var(--accent)" /> 必要アイテム合算
                </div>
                {(() => {
                  const rows = planRequiredItems.filter(({ item, totalCount }) =>
                    Math.max(0, totalCount - parseInt(stash[item.id] || 0)) > 0
                  );
                  return rows.length === 0 ? (
                    <div style={{ fontSize: 12, color: 'var(--state-ok-text)', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Icon name="circle-check" size={13} color="var(--state-ok)" /> 必要アイテムはすべて揃っています
                    </div>
                  ) : (
                    <div className="plan-items-grid">
                      {rows.map(({ item, totalCount, firCount, sources }) => {
                        const have = parseInt(stash[item.id] || 0);
                        const remain = Math.max(0, totalCount - have);
                        const isFir = firCount > 0;
                        const isLarge = LARGE_INPUT_ITEM_IDS.has(item.id);
                        return (
                          <div key={item.id} className="plan-item-card">
                            <div className="plan-item-card-top">
                              {item.iconLink && <img src={item.iconLink} alt="" className="item-icon-32" onError={e => { e.target.style.display='none'; }} />}
                              <span className="plan-item-card-name">{item.shortName || item.name}</span>
                              {isFir && <span className="plan-fir-badge">FIR</span>}
                              {isLarge ? (
                                <input key={have} type="number" defaultValue={have} min={0}
                                  onBlur={e => {
                                    const next = Math.max(0, parseInt(e.target.value || '0') || 0);
                                    if (next !== have) updateStash(item.id, next - have);
                                  }}
                                  className="plan-stock-input" />
                              ) : (
                                <>
                                  <button className="plan-pm-btn" onClick={() => updateStash(item.id, -1)}>−</button>
                                  <span className="plan-stock-num">{have}/{totalCount}</span>
                                  <button className="plan-pm-btn" onClick={() => updateStash(item.id, 1)}>＋</button>
                                </>
                              )}
                              <span className="plan-item-card-remain" style={{ color: remain > 0 ? 'var(--danger-text)' : 'var(--state-ok-text)' }}>
                                残）{remain > 0 ? remain : '充足'}
                              </span>
                            </div>
                            <div className="plan-item-breakdown">
                              {sources.map(s => s.label).join('、')}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ===== F: ゴール詳細ツリー ===== */}
            {planItems.length > 0 && (
              <div className="section">
                <div className="section-title">
                  <Icon name="sitemap" size={14} color="var(--accent)" /> ゴール詳細ツリー
                </div>
                {planItems.map(item => {
                  const meta = PLAN_TYPE_META[item.type] || PLAN_TYPE_META.task;
                  const open = planOpenGoals[item.id];
                  const done = isGoalDone(item);
                  const goalTaskId = item.type === 'task' ? item.taskId
                    : item.type === 'project_tab' ? item.goalTaskId : null;
                  return (
                    <div key={item.id} className="plan-goal-card">
                      <div className="plan-goal-card-head"
                        onClick={() => setPlanOpenGoals(p => ({ ...p, [item.id]: !open }))}>
                        <Icon name={meta.icon} size={14} color={done ? 'var(--text-dim)' : meta.color} />
                        <span className="plan-goal-card-title" style={{ opacity: done ? 0.5 : 1 }}>
                          {getGoalLabel(item)}
                        </span>
                        {done && <span style={{ fontSize: 11, color: 'var(--state-ok-text)', display: 'inline-flex', alignItems: 'center', gap: 3 }}><Icon name="circle-check" size={12} color="var(--state-ok)" /> 達成済み</span>}
                        <Icon name={open ? 'chevron-down' : 'chevron-right'} size={13} color="var(--text-dim)" style={{ marginLeft: 'auto' }} />
                      </div>
                      {open && (
                        <div className="plan-goal-card-body">
                          {goalTaskId ? (
                            done ? (
                              <div style={{ fontSize: 12, color: 'var(--state-ok-text)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Icon name="circle-check" size={12} color="var(--state-ok)" /> 完了済み
                              </div>
                            ) : (
                              <div className="task-tab-tree-body" style={{ overflowX: 'auto' }}>
                                <PlanTree taskId={goalTaskId} />
                              </div>
                            )
                          ) : item.type === 'hideout' ? (
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                              {item.stationName} Lv{item.level} のアップグレードをゴールに設定中。<br />
                              必要素材は「必要アイテム合算」セクションに集計されています。
                            </div>
                          ) : item.type === 'trader' ? (
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                              {item.traderName} LL{item.level} の解放をゴールに設定中。<br />
                              条件はトレーダー解放タブで確認してください。
                            </div>
                          ) : item.type === 'barter' ? (
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                              {item.name} のバーターをゴールに設定中。<br />
                              必要素材は「必要アイテム合算」セクションに集計されています。
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

