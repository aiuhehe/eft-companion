      {/* ===== TAB: TASKS ===== */}
      {activeTab === 'tasks' && (
        <div>
          <div className="section">
            <div className="section-title"><Icon name="list-check" size={14} color="var(--accent)" /> タスク検索</div>
            {apiData.tasks.length === 0 ? (
              <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>APIデータを取得してください。</div>
            ) : (
              <>
                {/* プロジェクトタブ（サブタブ）バー — タスク検索の上 */}
                <div className="task-subtab-bar">
                  <button className={`task-subtab${activeTaskTab === 'all' ? ' active' : ''}`}
                    onClick={() => setActiveTaskTab('all')}>全タスク</button>
                  {taskTabs.map(tb => (
                    <button key={tb.id}
                      className={`task-subtab${activeTaskTab === tb.id ? ' active' : ''}`}
                      onClick={() => setActiveTaskTab(tb.id)}
                      style={activeTaskTab === tb.id ? { borderColor: tb.color, color: tb.color } : {}}>
                      <span className="task-subtab-dot" style={{ background: tb.color }} />
                      {tb.name}
                    </button>
                  ))}
                  {taskTabs.length === 0 && (
                    <span className="task-subtab-hint">
                      <Icon name="sitemap" size={12} color="var(--text-dim)" /> 各タスク左上のツリーアイコンから、そのタスクに至るプロジェクトタブを作成できます
                    </span>
                  )}
                </div>

                {/* フィルター行 + プロジェクトタブボタン */}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12, alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>タスク名</span>
                    <input type="text" id="task-search-input" placeholder="タスク名で検索..."
                      value={taskSearch}
                      onChange={e => { setTaskSearch(e.target.value); setWikiPanels({}); }}
                      onCompositionEnd={e => { setTaskSearch(e.target.value); setWikiPanels({}); }}
                      style={{ width: 220, fontSize: 14, padding: '6px 10px' }} autoFocus />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>トレーダー</span>
                    <select value={taskTraderFilter} onChange={e => setTaskTraderFilter(e.target.value)} style={{ fontSize: 14, padding: '6px 10px' }}>
                      <option value="all">全トレーダー</option>
                      {apiData.traders.filter(t => t.id !== TRADER_IDS.fence).map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>マップ</span>
                    <select value={taskMapFilter} onChange={e => setTaskMapFilter(e.target.value)} style={{ fontSize: 14, padding: '6px 10px' }}>
                      <option value="all">全マップ</option>
                      {taskMaps.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>種別</span>
                    <select value={taskTypeFilter} onChange={e => setTaskTypeFilter(e.target.value)} style={{ fontSize: 14, padding: '6px 10px' }}>
                      {TASK_TYPE_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: 11, color: 'transparent' }}>_</span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none', height: 32 }}>
                      <input type="checkbox" checked={showCompletedTasks} onChange={e => setShowCompletedTasks(e.target.checked)}
                        style={{ cursor: 'pointer' }} />
                      完了タスクも表示
                    </label>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: 11, color: 'transparent' }}>_</span>
                    <span style={{ fontSize: 12, color: 'var(--text-dim)', height: 32, display: 'flex', alignItems: 'center' }}>{apiData.tasks.length} タスク中</span>
                  </div>
                  {activeTabObj && (() => {
                    const planId = 'plan_tab_' + activeTabObj.id;
                    const inPlan = planItems.some(p => p.id === planId);
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, justifyContent: 'flex-end', marginLeft: 'auto' }}>
                        <span style={{ fontSize: 11, color: 'transparent' }}>_</span>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', height: 32 }}>
                          <Tooltip text={inPlan ? 'プランに追加済み' : 'このタブをプランに追加'}>
                            <button onClick={() => { if (!inPlan) addPlanItem({ id: planId, type: 'project_tab', tabId: activeTabObj.id, goalTaskId: activeTabObj.goalTaskId, name: activeTabObj.name, color: activeTabObj.color, addedAt: new Date().toISOString() }); }}
                              className={`task-tab-del${inPlan ? ' is-plan' : ''}`}
                              style={{ color: inPlan ? 'var(--accent)' : 'var(--text-secondary)', borderColor: inPlan ? 'var(--accent)' : undefined }}>
                              <Icon name="calendar-plus" size={13} color="currentColor" /> {inPlan ? '追加済み' : 'プランに追加'}
                            </button>
                          </Tooltip>
                          <Tooltip text="このタブを削除します（タスクの完了状態は消えません）">
                            <button onClick={() => removeTaskTab(activeTabObj.id)} className="task-tab-del">
                              <Icon name="x" size={13} color="currentColor" /> タブ削除
                            </button>
                          </Tooltip>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* アクティブタブの最上部スキルツリー */}
                {activeTabObj && (() => {
                  const goal = apiData.tasks.find(t => t.id === activeTabObj.goalTaskId);
                  if (!goal) return (
                    <div className="task-tab-tree" style={{ borderColor: activeTabObj.color }}>
                      <div className="task-tab-tree-head">
                        <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>ゴールタスクが見つかりません（APIデータ未取得の可能性）</span>
                        <button onClick={() => removeTaskTab(activeTabObj.id)} className="task-tab-del"><Icon name="x" size={13} color="currentColor" /> タブ削除</button>
                      </div>
                    </div>
                  );
                  // ゴール完了済み & 「完了タスクも表示」OFF のときは何も表示しない
                  if (completedTaskIds.includes(goal.id) && !showCompletedTasks) return null;
                  const ProjectTree = ({ taskId, seen = new Set() }) => {
                    const t = apiData.tasks.find(x => x.id === taskId);
                    if (!t) return null;
                    const dup = seen.has(taskId);
                    const nextSeen = new Set(seen); nextSeen.add(taskId);
                    const prereqs = dup ? [] : (t.taskRequirements || []);
                    const done = completedTaskIds.includes(taskId);
                    const isGoal = taskId === goal.id;
                    return (
                      <div className="ptree-node">
                        {prereqs.length > 0 && (
                          <div className="ptree-prereqs">
                            {prereqs.map(req => <ProjectTree key={req.task.id} taskId={req.task.id} seen={nextSeen} />)}
                          </div>
                        )}
                        {prereqs.length > 0 && <span className="tree-arrow">→</span>}
                        <span
                          onClick={() => searchForTaskByName(t.name, taskId)}
                          className={`ptree-chip${done ? ' is-done' : ''}${isGoal ? ' is-goal' : ''}`}
                          style={isGoal ? { borderColor: activeTabObj.color, color: activeTabObj.color } : {}}
                          title={`${t.trader?.name || ''} ${t.name}`}>
                          <span className="task-muted-sm">{t.trader?.name || ''}</span>
                          {t.name}
                          {done && <Icon name="check" size={11} color="var(--state-ok-text)" />}
                        </span>
                      </div>
                    );
                  };
                  const treeCount = getAncestorTaskIds(goal.id).size;
                  return (
                    <div className="task-tab-tree" style={{ borderColor: activeTabObj.color }}>
                      <div className="task-tab-tree-head">
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 'bold', color: activeTabObj.color }}>
                          <Icon name="sitemap" size={15} color={activeTabObj.color} /> {activeTabObj.name}
                          <span style={{ color: 'var(--text-dim)', fontWeight: 'normal', fontSize: 11 }}>スキルツリー（{treeCount}タスク）</span>
                        </span>
                      </div>
                      <div className="task-tab-tree-body">
                        <ProjectTree taskId={goal.id} />
                      </div>
                    </div>
                  );
                })()}

                {/* タスク内容アイコン凡例 */}
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 10, fontSize: 11, color: 'var(--text-dim)' }}>
                  <span>持ち物アイコン：</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="search" size={11} color="var(--text-dim)" /> 見つける・手に入れる（FIR含む）</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="package" size={11} color="var(--text-dim)" /> 納品</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="skull" size={11} color="var(--text-dim)" /> キル</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="download" size={11} color="var(--text-dim)" /> マーク設置</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="arrow-right" size={11} color="var(--text-dim)" /> 脱出・生還</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="star" size={11} color="var(--text-dim)" /> レベル条件</span>
                </div>

                {/* タスク行の共通レンダラー */}
                {(() => {
                  const isOpen = (task, ctx) => (ctx === 'search' ? openSearchTaskIds : openTaskIds).includes(task.id);
                  const toggleTask = (task, ctx) => {
                    const setter = ctx === 'search' ? setOpenSearchTaskIds : setOpenTaskIds;
                    setter(prev => prev.includes(task.id) ? prev.filter(id => id !== task.id) : [...prev, task.id]);
                  };

                  const TaskRow = ({ task, isInProgress, isMapPinned, ctx = 'board', boardCtx = false }) => {
                    const items = getTaskItems(task);
                    const open = isOpen(task, ctx);
                    const exp = task.experience || 0;
                    const standings = task.finishRewards?.traderStanding || [];
                    const isDone = completedTaskIds.includes(task.id);
                    const ownTab = taskTabs.find(t => t.goalTaskId === task.id);   // このタスクをゴールにしたタブ
                    const memberColor = taskTabColorMap[task.id];                  // いずれかのタブのツリーに含まれる色
                    // 背景・ボーダーの優先順位: open > boardCtx > mapPin > inProgress > done > default
                    const bg = open ? 'var(--bg-secondary)' : boardCtx ? 'var(--bg-primary)' : isMapPinned ? 'var(--state-pin-bg-weak)' : isInProgress ? 'var(--state-progress-bg-weak)' : 'var(--bg-primary)';
                    const bd = open ? 'var(--accent)' : memberColor ? memberColor : isMapPinned ? 'var(--state-pin-border)' : isInProgress ? 'var(--state-progress-border)' : 'var(--border)';
                    return (
                      <div key={task.id} id={'taskcard_' + task.id} className="task-card" style={{
                        background: bg, border: `1px solid ${bd}`,
                        opacity: isDone ? 0.5 : 1,
                      }}>
                        {/* ヘッダー行 — グリッドで列を揃える（タブ作成ボタンは完了ボタンの左に配置） */}
                        <div
                          onClick={() => toggleTask(task, ctx)}
                          className="task-head"
                          style={{ gridTemplateColumns: COL }}>
                          {/* ピン止めボタン（ボード上部表示） */}
                          <Tooltip text={isMapPinned ? 'ピンを外す' : 'ボード上部にピン止め'}>
                            <button onClick={e => { e.stopPropagation(); toggleMapPin(task.id); }}
                              className={`taskrow-btn${isMapPinned ? ' is-pinned' : ''}`}>
                              <Icon name="map-pin" size={13} color={isMapPinned ? 'var(--state-pin-muted)' : 'var(--text-dim)'} />
                            </button>
                          </Tooltip>
                          {/* 進行タスクボード追加ボタン */}
                          <Tooltip text={isInProgress ? '進行タスクボードから外す' : '進行タスクボードに追加'}>
                            <button onClick={e => { e.stopPropagation(); togglePin(task.id); }}
                              className={`taskrow-btn${isInProgress ? ' is-progress' : ''}`}>
                              <Icon name="list-check" size={13} color={isInProgress ? 'var(--state-progress-muted)' : 'var(--text-dim)'} />
                            </button>
                          </Tooltip>
                          {/* タスク名 */}
                          <div className="task-cell">
                            <span className="task-name" style={{ color: isMapPinned ? 'var(--state-pin-muted)' : isInProgress ? 'var(--state-progress-name)' : 'var(--text-primary)' }}>
                              {task.name}
                            </span>
                            {GUIDE_BY_TASKNAME.has(task.name) && (
                              <a
                                href={`guide-viewer.html#${GUIDE_BY_TASKNAME.get(task.name)}`}
                                target="_blank"
                                onClick={e => e.stopPropagation()}
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 3,
                                  marginLeft: 8, padding: '1px 7px', borderRadius: 10,
                                  fontSize: 11, fontWeight: 600, textDecoration: 'none',
                                  background: 'var(--accent-muted)', color: 'var(--accent)',
                                  border: '1px solid var(--accent)', opacity: 0.85,
                                  verticalAlign: 'middle',
                                }}
                              >
                                <Icon name="book" size={11} color="var(--accent)" /> ガイド
                              </a>
                            )}
                          </div>
                          {/* タスクツリー / カスタムタスク編集ボタン */}
                          <div className="task-tree-btn-cell">
                            {task.id.startsWith('custom_') ? (
                              <Tooltip text="カスタムタスクを編集（出撃準備タブへ）">
                                <button onClick={e => { e.stopPropagation(); openCustomTaskEdit(task.id); }}
                                  className="task-tag-btn">
                                  <Icon name="pencil" size={16} color="var(--text-secondary)" />
                                </button>
                              </Tooltip>
                            ) : <>
                              <Tooltip text={ownTab ? `タブ「${ownTab.name}」を編集` : 'このタスクをゴールにしたタブを作成'}>
                                <button onClick={e => { e.stopPropagation(); setTagPopoverTaskId(v => v === task.id ? null : task.id); }}
                                  className="task-tag-btn">
                                  <Icon name="sitemap" size={16} color={ownTab ? ownTab.color : memberColor ? memberColor : 'var(--text-dim)'} />
                                </button>
                              </Tooltip>
                              {tagPopoverTaskId === task.id && (() => {
                                const TabPopover = () => {
                                  const [name, setName] = useState(ownTab?.name || task.name || '');
                                  const [color, setColor] = useState(ownTab?.color || TAG_COLORS[0]);
                                  return (
                                    <div onClick={e => e.stopPropagation()} className="task-tag-popover">
                                      <div className="task-tag-popover-label">
                                        {ownTab ? 'タブを編集' : 'このタスクをゴールにしたタブを作成'}（前提タスクまで絞り込み表示）
                                      </div>
                                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                                        {TAG_COLORS.map(c => (
                                          <button key={c} onClick={() => setColor(c)}
                                            className="task-tag-swatch"
                                            style={{ background: c, border: color === c ? '2px solid var(--text-primary)' : '1px solid var(--border)' }} />
                                        ))}
                                      </div>
                                      <input type="text" value={name} onChange={e => setName(e.target.value)}
                                        placeholder="タブ名（例: 防弾プレートケース解放）"
                                        style={{ width: '100%', boxSizing: 'border-box', marginBottom: 8, fontSize: 12 }} />
                                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                        <button onClick={() => setTagPopoverTaskId(null)}
                                          className="btn btn-sm" style={{ background: 'var(--border)', color: 'var(--text-secondary)' }}>
                                          閉じる
                                        </button>
                                        <button onClick={() => upsertTaskTab(task.id, { name: (name.trim() || task.name), color })}
                                          className="btn btn-sm btn-yellow">
                                          {ownTab ? '更新' : 'タブを作成'}
                                        </button>
                                      </div>
                                    </div>
                                  );
                                };
                                return <TabPopover />;
                              })()}
                            </>}
                          </div>
                          {/* 手動登録ボタン */}
                          {(() => {
                            const hasManual = manualUnlocks.some(u => u.taskId === task.id);
                            const isFormOpen = manualFormTaskId === task.id;
                            return (
                              <Tooltip text={hasManual ? '手動登録済み（クリックで追加/閉じる）' : '購入解放・クラフト解放を手動登録'}>
                                <button onClick={e => {
                                  e.stopPropagation();
                                  const opening = !isFormOpen;
                                  setManualFormTaskId(opening ? task.id : null);
                                  if (opening && !open) toggleTask(task, ctx);
                                }}
                                  className={`taskrow-btn${isFormOpen ? ' is-plan' : ''}`}
                                  style={hasManual && !isFormOpen ? { color: 'var(--manual)' } : {}}>
                                  <Icon name="link" size={13} color={isFormOpen ? 'var(--accent)' : hasManual ? 'var(--manual)' : 'var(--text-dim)'} />
                                </button>
                              </Tooltip>
                            );
                          })()}
                          {/* プランに追加ボタン */}
                          {(() => {
                            const planId = 'plan_task_' + task.id;
                            const inPlan = planItems.some(p => p.id === planId);
                            return (
                              <Tooltip text={inPlan ? 'プランに追加済み' : 'プランに追加'}>
                                <button onClick={e => { e.stopPropagation(); if (!inPlan) addPlanItem({ id: planId, type: 'task', taskId: task.id, addedAt: new Date().toISOString() }); }}
                                  className={`taskrow-btn${inPlan ? ' is-plan' : ''}`}>
                                  <Icon name="calendar-plus" size={13} color={inPlan ? 'var(--accent)' : 'var(--text-dim)'} />
                                </button>
                              </Tooltip>
                            );
                          })()}
                          {/* 完了ボタン（クリック領域を広めに・タスクツリーボタンと誤クリックしないよう左右余白） */}
                          <Tooltip text={isDone ? '完了を取り消す' : 'タスク完了'}>
                            <button onClick={e => { e.stopPropagation(); toggleComplete(task.id); }}
                              className={`taskrow-btn taskrow-complete${isDone ? ' is-done' : ''}`}>
                              <Icon name="check" size={15} color={isDone ? 'var(--state-ok-muted)' : 'var(--text-dim)'} />
                            </button>
                          </Tooltip>
                          {/* トレーダー + Lv */}
                          <div className="task-cell">
                            <span className="task-trader">
                              {task.trader?.name}
                            </span>
                            {task.minPlayerLevel > 0 && (
                              <span className="task-muted">Lv{task.minPlayerLevel}+</span>
                            )}
                          </div>
                          {/* EXP */}
                          <div className="task-cell-right">
                            {exp > 0
                              ? <span className="task-exp">+{exp.toLocaleString()}</span>
                              : <span className="task-muted">—</span>}
                          </div>
                          {/* 信頼度 */}
                          <div>
                            {standings.length > 0
                              ? standings.map((ts, i) => (
                                  <div key={i} className="task-standing">
                                    {ts.trader.name} <span style={{ color: '#4ade80' }}>+{ts.standing.toFixed(2)}</span>
                                  </div>
                                ))
                              : <span className="task-muted">—</span>}
                          </div>
                          {/* 開閉アイコン */}
                          <Icon name={open?'chevron-down':'chevron-right'} size={14} color="var(--text-dim)" />
                        </div>

                        {/* 持ち物（常時表示・type別アイコン付き） */}
                        {items.length > 0 && (
                          <div className="task-obj-strip">
                            {items.map((oi, i) => {
                              const have = parseInt(stash[oi.item.id] || 0);
                              const ok = have >= oi.count;
                              const { iconName } = getObjTypeLabel(oi.type);
                              const typeColor = oi.type === 'giveItem' ? 'var(--info)'
                                : oi.type === 'findItem' ? 'var(--warn-text)' : 'var(--text-secondary)';
                              return (
                                <span key={i} className={`obj-chip${ok ? ' is-ok' : ''}`}>
                                  <span className="obj-type-icon"><Icon name={iconName} size={11} color={typeColor} /></span>
                                  {oi.item.iconLink && <img src={oi.item.iconLink} alt="" className="obj-img" onError={e => { e.target.style.display='none'; }} />}
                                  {oi.item.name} ×{oi.count}
                                  {oi.foundInRaid && <span className="obj-fir">[FIR]</span>}
                                  <span className="task-muted-sm">({have}所持)</span>
                                </span>
                              );
                            })}
                          </div>
                        )}

                        {/* ── インライン詳細（open時に展開） ── */}
                        <div className="task-detail" style={{ display: open ? 'block' : 'none' }}>

                            {/* Wikiリンク・アクションボタン */}
                            {task.wikiLink && (() => {
                              const m = task.wikiLink.match(/\/wiki\/(.+)$/);
                              const taskSlug = m ? m[1] : null;
                              const taskNameDecoded = taskSlug ? decodeURIComponent(taskSlug).replace(/_/g, ' ') : null;
                              const traderName = task.trader?.name || '';
                              const jpWikiUrl = taskNameDecoded
                                ? `https://wikiwiki.jp/eft/${encodeURIComponent(traderName)}/${encodeURIComponent(taskNameDecoded)}`
                                : null;
                              const gtUrl = `https://translate.google.com/translate?sl=en&tl=ja&u=${encodeURIComponent(task.wikiLink)}`;
                              return (
                                <div className="task-wiki-row">
                                  {jpWikiUrl && (
                                    <Tooltip text="日本語Wikiを開きます（wikiwiki.jp）">
                                      <a href={jpWikiUrl} target="_blank" rel="noopener noreferrer" className="wiki-btn"
                                        style={{ background: 'var(--state-ok-bg-soft)', color: 'var(--state-ok-text)', border: '1px solid var(--state-ok)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                        <Icon name="book" size={12} color="var(--state-ok-text)" /> 日本語Wiki
                                      </a>
                                    </Tooltip>
                                  )}
                                  <Tooltip text="Google翻訳で英語Wikiを日本語表示します">
                                    <a href={gtUrl} target="_blank" rel="noopener noreferrer" className="wiki-btn"
                                      style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                      <Icon name="globe" size={12} color="var(--text-secondary)" /> 翻訳Wiki
                                    </a>
                                  </Tooltip>
                                  {jpWikiUrl && (
                                    <Tooltip text="日本語wikiの内容をアプリ内に表示します（広告除去済み）">
                                      <button
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          const wp = wikiPanels[jpWikiUrl] || {};
                                          if (wp.open) {
                                            closeWikiPanel(jpWikiUrl);
                                            return;
                                          }
                                          // キャッシュ済みなら再読み込みなし
                                          if (wp.blobUrl) {
                                            setWikiPanel(jpWikiUrl, { open: true });
                                            return;
                                          }
                                          setWikiPanel(jpWikiUrl, { open: true, loading: true, blobUrl: null, error: null, title: task.name });
                                          try {
                                            const blobUrl = await fetchWikiHTML(jpWikiUrl);
                                            wikiBlobCache.current[jpWikiUrl] = blobUrl; // Refキャッシュにも保存
                                            setWikiPanel(jpWikiUrl, { open: true, loading: false, blobUrl, error: null, title: task.name });
                                          } catch(err) {
                                            setWikiPanel(jpWikiUrl, { open: true, loading: false, blobUrl: null, error: err.message, title: task.name });
                                          }
                                        }}
                                        className="wiki-btn"
                                        style={{ border: 'none',
                                          background: (wikiPanels[jpWikiUrl]?.open) ? 'var(--border)' : 'var(--state-ok-bg-soft)',
                                          color: 'var(--state-ok-text)' }}>
                                        {wikiPanels[jpWikiUrl]?.loading
                                          ? <><Icon name='refresh' size={12} color='var(--state-ok-text)' style={{animation:'spin 1s linear infinite'}} /> 読込中...</>
                                          : wikiPanels[jpWikiUrl]?.open
                                            ? <><Icon name='x' size={12} color='var(--state-ok-text)' /> 閉じる</>
                                            : <><Icon name='book' size={12} color='var(--state-ok-text)' /> アプリ内表示</>
                                        }
                                      </button>
                                    </Tooltip>
                                  )}
                                </div>
                              );
                            })()}

                            {/* タスクツリー */}
                            {(() => {
                              const prereqs = task.taskRequirements || [];
                              const successors = taskSuccessorsMap[task.id] || [];
                              if (prereqs.length === 0 && successors.length === 0) return null;
                              const TaskChip = ({ task: ct, color, border: b, bg }) => (
                                <span onClick={e => { e.stopPropagation(); searchForTaskByName(ct.name, ct.id); }}
                                  className="task-chip"
                                  style={{ background: bg, color, border: `1px solid ${b}` }}>
                                  <span className="task-muted-sm">
                                    {apiData.tasks.find(x => x.id === ct.id)?.trader?.name || ''}
                                  </span>
                                  {ct.name}
                                </span>
                              );
                              return (
                                <div className="task-tree">
                                  <div className="task-tree-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="link" size={13} color="var(--accent)" /> タスクツリー</div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                    {prereqs.length > 0 && (
                                      <div className="task-tree-col" style={{ alignItems: 'flex-end' }}>
                                        <div className="tree-col-label">前提タスク</div>
                                        {prereqs.map(req => (
                                          <TaskChip key={req.task.id} task={req.task} color="var(--info)" border="var(--info-border)" bg="var(--info-bg-weak)" />
                                        ))}
                                      </div>
                                    )}
                                    {prereqs.length > 0 && <span className="tree-arrow">→</span>}
                                    <div className="task-tree-node">
                                      {task.name}
                                    </div>
                                    {successors.length > 0 && <span className="tree-arrow">→</span>}
                                    {successors.length > 0 && (
                                      <div className="task-tree-col">
                                        <div className="tree-col-label">解放されるタスク</div>
                                        {successors.map(ct => (
                                          <TaskChip key={ct.id} task={ct} color="var(--state-ok-text)" border="var(--state-ok)" bg="var(--state-ok-bg-faint)" />
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}

                            {/* タスク内容 */}
                            {task.objectives?.length > 0 && (
                              <div style={{ marginBottom: 12 }}>
                                <div className="task-detail-title" style={{ color: 'var(--accent)' }}>
                                  <Icon name="target" size={13} color="var(--accent)" /> タスク内容
                                </div>
                                <div className="task-detail-list">
                                  {task.objectives.map((obj, i) => {
                                    const { iconName, label } = getObjTypeLabel(obj.type);
                                    const translated = translateObjective(obj.description);
                                    return (
                                      <div key={obj.id || i} className="obj-row">
                                        <span className="obj-row-icon" title={label}><Icon name={iconName} size={14} color="var(--text-secondary)" /></span>
                                        {(obj.item?.iconLink || obj.markerItem?.iconLink) && (
                                          <img src={obj.item?.iconLink || obj.markerItem?.iconLink} alt=""
                                            className="obj-row-img"
                                            onError={e => { e.target.style.display='none'; }} />
                                        )}
                                        <span className="obj-row-text">
                                          {translated}
                                          {obj.count > 1 && <span style={{ color: 'var(--accent)', marginLeft: 6 }}>×{obj.count}</span>}
                                          {obj.foundInRaid && <span style={{ color: 'var(--state-ok-text)', fontSize: 11, marginLeft: 6 }}>[FIR]</span>}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* 完了報酬 */}
                            {task.finishRewards && (
                              <div style={{ marginBottom: 10 }}>
                                <div className="task-detail-title" style={{ color: 'var(--state-ok-text)' }}>
                                  <Icon name="trophy" size={13} color="var(--state-ok-text)" /> 完了報酬
                                </div>
                                <div className="reward-list">
                                  {task.experience > 0 && (
                                    <span className="reward-badge" style={{ background: 'var(--bg-secondary)', color: 'var(--warn-text)', border: '1px solid var(--border)' }}>
                                      EXP +{task.experience.toLocaleString()}
                                    </span>
                                  )}
                                  {task.finishRewards.traderStanding?.map((ts, i) => (
                                    <Tooltip key={i} text={`${ts.trader.name}の信頼度が +${ts.standing.toFixed(2)} 上昇します`}>
                                      <span className="reward-badge" style={{ background: 'var(--bg-secondary)', color: 'var(--state-ok-text)', border: '1px solid var(--border)', cursor: 'default', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                        <Icon name="trending-up" size={12} color="var(--state-ok-text)" /> {ts.trader.name} 信頼度 +{ts.standing.toFixed(2)}
                                      </span>
                                    </Tooltip>
                                  ))}
                                  {task.finishRewards.items?.map((r, i) => (
                                    <Tooltip key={i} text={`アイテム「${r.item.name}」×${r.count} を受け取れます`}>
                                      <div className="reward-badge" style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--bg-secondary)', border: '1px solid var(--border)', cursor: 'default' }}>
                                        {r.item.iconLink && <img src={r.item.iconLink} alt="" className="reward-img" onError={e => { e.target.style.display='none'; }} />}
                                        <span style={{ color: 'var(--text-primary)' }}>{r.item.name}</span>
                                        {r.count > 1 && <span style={{ color: 'var(--accent)' }}>×{r.count}</span>}
                                      </div>
                                    </Tooltip>
                                  ))}
                                  {task.finishRewards.offerUnlock?.map((u, i) => (
                                    <Tooltip key={i} text={`${u.trader.name} LL${u.level} で「${u.item.name}」の購入が解放されます`}>
                                      <div className="reward-badge" style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--state-ok-deep)', border: '1px solid var(--state-ok)', cursor: 'default' }}>
                                        {u.item.iconLink && <img src={u.item.iconLink} alt="" className="reward-img" onError={e => { e.target.style.display='none'; }} />}
                                        <span style={{ color: 'var(--state-ok-text)' }}><Icon name="lock-open" size={11} color="var(--state-ok-text)" /> {u.trader.name} LL{u.level} {u.item.name}</span>
                                      </div>
                                    </Tooltip>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* 手動登録フォーム（ボタンクリック時に展開） */}
                            {manualFormTaskId === task.id && (() => {
                              const TRADERS = TRADER_LIST
                                .filter(t => t.id !== TRADER_IDS.fence && t.id !== TRADER_IDS.ref)
                                .map(t => t.name);
                              const ManualUnlockForm = () => {
                                const [q, setQ] = useState('');
                                const [sugg, setSugg] = useState([]);
                                const [sel, setSel] = useState(null);
                                const [type, setType] = useState('unlock');
                                const [trader, setTrader] = useState(task.trader?.name && TRADERS.includes(task.trader.name) ? task.trader.name : TRADERS[0]);
                                const [ll, setLL] = useState(1);
                                const [station, setStation] = useState(apiData.hideout[0]?.name || 'Workbench');
                                const [slv, setSLv] = useState(1);
                                const [dur, setDur] = useState('');
                                const [note, setNote] = useState('');

                                const handleQ = (v) => {
                                  setQ(v);
                                  setSel(null);
                                  if (!v) { setSugg([]); return; }
                                  const ql = v.toLowerCase();
                                  setSugg(
                                    apiData.items
                                      .filter(it => it.name.toLowerCase().includes(ql) || (it.shortName || '').toLowerCase().includes(ql))
                                      .slice(0, 8)
                                  );
                                };

                                const pickItem = (item) => {
                                  setSel({ id: item.id, name: item.name, iconLink: item.iconLink || '' });
                                  setQ(item.name);
                                  setSugg([]);
                                };

                                return (
                                  <div onClick={e => e.stopPropagation()} style={{ margin: '0 0 12px', padding: '10px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--manual-border)', borderRadius: 6 }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--manual)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                      <Icon name="link" size={12} color="var(--manual)" /> アイテムを手動登録
                                      {isManualUnlocksInherited() && (
                                        <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--warn-text)', background: 'var(--warn-bg)', padding: '1px 6px', borderRadius: 3, border: '1px solid var(--warn)' }}>
                                          PvPデータを継承中 — 保存するとSeason独自データになります
                                        </span>
                                      )}
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                                      <div style={{ position: 'relative' }}>
                                        <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 3 }}>アイテム名で検索</div>
                                        <input
                                          autoFocus
                                          value={q}
                                          onChange={e => handleQ(e.target.value)}
                                          placeholder="例: AK-308"
                                          style={{ width: '100%', boxSizing: 'border-box', fontSize: 12, padding: '5px 8px' }}
                                        />
                                        {sugg.length > 0 && (
                                          <div style={{ position: 'absolute', left: 0, right: 0, zIndex: 10, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 4, maxHeight: 180, overflowY: 'auto', top: '100%', marginTop: 2 }}>
                                            {sugg.map(it => (
                                              <div key={it.id} onClick={() => pickItem(it)}
                                                style={{ padding: '5px 8px', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, borderBottom: '1px solid var(--border-light)' }}
                                                onMouseOver={e => { e.currentTarget.style.background = 'var(--accent-muted)'; }}
                                                onMouseOut={e => { e.currentTarget.style.background = ''; }}>
                                                {it.iconLink && <img src={it.iconLink} style={{ width: 24, height: 24, objectFit: 'contain' }} alt="" onError={e => { e.target.style.display = 'none'; }} />}
                                                <div>
                                                  <div>{it.name}</div>
                                                  {it.shortName && <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{it.shortName}</div>}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                        {sel && (
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3, fontSize: 11, color: 'var(--state-ok-text)' }}>
                                            <Icon name="check" size={11} color="var(--state-ok-text)" /> 選択済み
                                          </div>
                                        )}
                                      </div>
                                      <div>
                                        <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 3 }}>種別</div>
                                        <select value={type} onChange={e => setType(e.target.value)} style={{ width: '100%', fontSize: 12, padding: '5px 8px' }}>
                                          <option value="unlock">購入解放（トレーダーLL）</option>
                                          <option value="craft">クラフト解放（ハイドアウト）</option>
                                        </select>
                                      </div>
                                    </div>

                                    {type === 'unlock' && (
                                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 72px', gap: 8, marginBottom: 8 }}>
                                        <div>
                                          <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 3 }}>トレーダー</div>
                                          <select value={trader} onChange={e => setTrader(e.target.value)} style={{ width: '100%', fontSize: 12, padding: '5px 8px' }}>
                                            {TRADERS.map(t => <option key={t} value={t}>{t}</option>)}
                                          </select>
                                        </div>
                                        <div>
                                          <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 3 }}>LL</div>
                                          <select value={ll} onChange={e => setLL(e.target.value)} style={{ width: '100%', fontSize: 12, padding: '5px 8px' }}>
                                            {[1, 2, 3, 4].map(v => <option key={v} value={v}>{v}</option>)}
                                          </select>
                                        </div>
                                      </div>
                                    )}

                                    {type === 'craft' && (
                                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 72px 100px', gap: 8, marginBottom: 8 }}>
                                        <div>
                                          <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 3 }}>施設</div>
                                          {apiData.hideout.length > 0 ? (
                                            <select value={station} onChange={e => setStation(e.target.value)} style={{ width: '100%', fontSize: 12, padding: '5px 8px' }}>
                                              {apiData.hideout.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                            </select>
                                          ) : (
                                            <input value={station} onChange={e => setStation(e.target.value)} placeholder="施設名" style={{ width: '100%', boxSizing: 'border-box', fontSize: 12, padding: '5px 8px' }} />
                                          )}
                                        </div>
                                        <div>
                                          <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 3 }}>レベル</div>
                                          <select value={slv} onChange={e => setSLv(e.target.value)} style={{ width: '100%', fontSize: 12, padding: '5px 8px' }}>
                                            {[1, 2, 3].map(v => <option key={v} value={v}>{v}</option>)}
                                          </select>
                                        </div>
                                        <div>
                                          <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 3 }}>所要時間（任意）</div>
                                          <input value={dur} onChange={e => setDur(e.target.value)} placeholder="例: 4h30m" style={{ width: '100%', boxSizing: 'border-box', fontSize: 12, padding: '5px 8px' }} />
                                        </div>
                                      </div>
                                    )}

                                    <div style={{ marginBottom: 8 }}>
                                      <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 3 }}>メモ（任意）</div>
                                      <input value={note} onChange={e => setNote(e.target.value)} placeholder="例: wiki確認済み" style={{ width: '100%', boxSizing: 'border-box', fontSize: 12, padding: '5px 8px' }} />
                                    </div>

                                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                      <button onClick={() => setManualFormTaskId(null)} className="btn btn-sm" style={{ background: 'var(--border)', color: 'var(--text-secondary)' }}>キャンセル</button>
                                      <button
                                        onClick={() => addManualUnlock(task.id, task.name, {
                                          type,
                                          itemId: sel?.id || '', itemName: sel?.name || '', itemIconLink: sel?.iconLink || '',
                                          trader, traderLevel: ll,
                                          station, stationLevel: slv, duration: dur,
                                          note,
                                        })}
                                        disabled={!sel}
                                        className="btn btn-sm"
                                        style={{
                                          background: sel ? 'var(--manual-bg)' : 'var(--border)',
                                          color: sel ? 'var(--manual)' : 'var(--text-dim)',
                                          border: sel ? '1px solid var(--manual-border)' : '1px solid var(--border)',
                                          fontWeight: 700,
                                        }}>
                                        <Icon name="check" size={12} color={sel ? 'var(--manual)' : 'var(--text-dim)'} /> 登録
                                      </button>
                                    </div>
                                  </div>
                                );
                              };
                              return <ManualUnlockForm />;
                            })()}

                            {/* 手動登録済みエントリ表示 */}
                            {manualUnlocks.filter(u => u.taskId === task.id).map(u => (
                              <div key={u.id} style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '6px 8px', borderRadius: 5, marginBottom: 4,
                                background: 'var(--manual-bg)', border: '1px solid var(--manual-border)',
                              }}>
                                {u.itemIconLink
                                  ? <img src={u.itemIconLink} style={{ width: 28, height: 28, objectFit: 'contain', flexShrink: 0 }} alt="" onError={e => { e.target.style.display = 'none'; }} />
                                  : <div style={{ width: 28, height: 28, background: 'var(--bg-primary)', borderRadius: 3, border: '1px solid var(--border)', flexShrink: 0 }} />}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 12, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.itemName}</div>
                                  {u.note && <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{u.note} · {u.addedAt}</div>}
                                </div>
                                <span style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                                  {u.type === 'unlock' ? `${u.trader} LL${u.traderLevel}` : `${u.station} Lv${u.stationLevel}`}
                                </span>
                                <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: 'var(--manual-bg)', color: 'var(--manual-text)', border: '1px solid var(--manual-border)', fontWeight: 600, flexShrink: 0 }}>
                                  {u.type === 'unlock' ? '購入解放' : 'クラフト解放'}
                                </span>
                                <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: 'var(--manual-bg)', color: 'var(--manual-text)', border: '1px solid var(--manual-border)', fontWeight: 700, flexShrink: 0 }}>手動</span>
                                <Tooltip text="この登録を削除">
                                  <button onClick={e => { e.stopPropagation(); removeManualUnlock(u.id); }}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}>
                                    <Icon name="x" size={12} color="var(--text-dim)" />
                                  </button>
                                </Tooltip>
                              </div>
                            ))}

                            {/* アプリ内Wikiパネル（このタスクのもの） */}
                            {/* アプリ内wikiパネル — blobUrlをキャッシュして再読み込みなし */}
                            {task.wikiLink && (() => {
                              const m2 = task.wikiLink.match(/\/wiki\/(.+)$/);
                              const slug2 = m2 ? m2[1] : null;
                              const name2 = slug2 ? decodeURIComponent(slug2).replace(/_/g, ' ') : null;
                              const trader2 = task.trader?.name || '';
                              const jpUrl2 = name2
                                ? `https://wikiwiki.jp/eft/${encodeURIComponent(trader2)}/${encodeURIComponent(name2)}`
                                : null;
                              if (!jpUrl2) return null;
                              const wp = wikiPanels[jpUrl2] || {};
                              if (!wp.open && !wp.blobUrl) return null;
                              return (
                                <div className="wiki-panel" style={{ display: wp.open ? 'block' : 'none' }}>
                                  <div className="wiki-panel-head">
                                    <span style={{ fontSize: 12, color: 'var(--state-ok-text)' }}><Icon name="book" size={12} color="var(--state-ok-text)" /> 日本語Wiki — アプリ内表示（広告除去済み）</span>
                                    <button onClick={() => closeWikiPanel(jpUrl2)} className="wiki-panel-close"><Icon name="x" size={14} color="currentColor" /></button>
                                  </div>
                                  {wp.loading && (
                                    <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
                                      <Icon name="refresh" size={14} color="var(--text-dim)" style={{animation:'spin 1s linear infinite', marginRight:6}} /> Wikiを読み込み中...（最大3つのプロキシを自動試行）
                                    </div>
                                  )}
                                  {wp.error && (
                                    <div style={{ padding: 16, color: 'var(--danger)', fontSize: 13 }}>
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="alert-triangle" size={13} color="var(--danger)" /> 読み込みエラー: {wp.error}</span>
                                      <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-dim)' }}>ページが存在しない可能性があります。「日本語Wiki」ボタンから直接ご確認ください。</div>
                                    </div>
                                  )}
                                  {(wp.blobUrl || wikiBlobCache.current[jpUrl2]) && (
                                    <iframe src={wikiBlobCache.current[jpUrl2] || wp.blobUrl} sandbox="allow-same-origin"
                                      className="wiki-iframe" />
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                      </div>
                    );
                  };

                  // タスクリストのサマリー計算
                  const calcTotals = (tasks) => tasks.reduce((acc, task) => {
                    acc.exp += task.experience || 0;
                    (task.finishRewards?.traderStanding || []).forEach(ts => {
                      acc.rep[ts.trader.name] = (acc.rep[ts.trader.name] || 0) + ts.standing;
                    });
                    return acc;
                  }, { exp: 0, rep: {} });

                  const mapTotals = calcTotals(mapTasks);
                  const pinnedTotals = calcTotals(pinnedTasks);

                  // 📍 📋 タスク名 🌐プロジェクト 🔗手動登録 📅プラン ✓完了 トレーダー EXP 信頼度 ▸
                  const COL = '28px 28px 1fr 28px 28px 28px 44px 110px 72px 130px 28px';
                  const ColHeader = () => (
                    <div style={{ display: 'grid', gridTemplateColumns: COL,
                      gap: 6, padding: '2px 10px', marginBottom: 2, alignItems: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}><Icon name="map-pin" size={10} color="#4b5563" /></div>
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}><Icon name="list-check" size={10} color="#4b5563" /></div>
                      <div style={{ fontSize: 10, color: '#4b5563', display: 'flex', alignItems: 'center' }}>タスク名</div>
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}><Icon name="sitemap" size={10} color="#4b5563" /></div>
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}><Icon name="link" size={10} color="#4b5563" /></div>
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}><Icon name="calendar-plus" size={10} color="#4b5563" /></div>
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}><Icon name="check" size={10} color="#4b5563" /></div>
                      <div style={{ fontSize: 10, color: '#4b5563', display: 'flex', alignItems: 'center' }}>トレーダー</div>
                      <div style={{ fontSize: 10, color: '#4b5563', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>EXP</div>
                      <div style={{ fontSize: 10, color: '#4b5563', display: 'flex', alignItems: 'center' }}>信頼度</div>
                      <div />
                    </div>
                  );

                  const SummaryBadges = ({ totals }) => (
                    <>
                      {totals.exp > 0 && (
                        <span style={{ fontSize: 11, color: 'var(--warn-text)' }}>
                          合計EXP +{totals.exp.toLocaleString()}
                        </span>
                      )}
                      {Object.entries(totals.rep).map(([trader, val]) => (
                        <span key={trader} style={{ fontSize: 11, color: 'var(--state-ok-text)' }}>
                          {trader} +{val.toFixed(2)}
                        </span>
                      ))}
                    </>
                  );

                  return (
                    <>
                      {/* ── 進行タスクボード（ピン止め済みを上部に表示） ── */}
                      {pinnedTasks.length > 0 && (() => {
                        const q = taskSearch.trim().toLowerCase();
                        const pinned = pinnedTasks.filter(t => mapTaskIds.includes(t.id));
                        const rest   = pinnedTasks.filter(t => !mapTaskIds.includes(t.id) && (!q || (t.name || '').toLowerCase().includes(q)));
                        return (
                          <div style={{ marginBottom: 16, background: 'var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                            <div
                              onClick={() => setPinnedBoardOpen(v => !v)}
                              style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', cursor: 'pointer', userSelect: 'none', borderBottom: pinnedBoardOpen ? '1px solid var(--border-light)' : 'none' }}>
                              <Icon name={pinnedBoardOpen ? 'chevron-down' : 'chevron-right'} size={14} color="var(--text-primary)" />
                              <span style={{ color: 'var(--text-primary)', fontWeight: 'bold', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                                進行タスクボード <span style={{ color: 'var(--text-secondary)', fontWeight: 'normal' }}>({pinnedTasks.length} 件)</span>
                                {pinned.length > 0 && <span style={{ color: 'var(--text-secondary)', fontWeight: 'normal', fontSize: 11, display:'flex', alignItems:'center', gap:3 }}><Icon name="map-pin" size={11} color="var(--text-secondary)" /> {pinned.length}</span>}
                              </span>
                              <SummaryBadges totals={pinnedTotals} />
                              {activeTaskTab === 'all' && pinned.length > 0 && (
                                <button
                                  onClick={e => { e.stopPropagation(); if (confirm('ボード上部のピン止めをすべて外しますか？\n（進行タスクボードからは外れず、ピン止め（上部固定）だけ解除されます）')) { setMapTaskIds([]); } }}
                                  className="btn btn-gray btn-sm"
                                  style={{ marginLeft: 'auto' }}>
                                  ピン止めをすべて外す
                                </button>
                              )}
                            </div>
                            {pinnedDeliveryItems.length > 0 && (
                              <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-light)', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                <div style={{ width: '100%', fontSize: 11, color: 'var(--text-secondary)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                                  <Icon name="package" size={12} color="var(--accent)" /> 納品アイテム集計
                                </div>
                                {pinnedDeliveryItems.map(({ item, count, foundInRaid, entries }) => {
                                  const checkKey = `${item.id}`;
                                  const delivered = Number(deliveryChecks[checkKey]) || 0;
                                  const allDone = delivered >= count;
                                  return (
                                    <Tooltip key={item.id} text={entries.map(e => `${e.taskName} ×${e.count}`).join('\n')}>
                                      <span className={`delivery-chip${allDone ? ' is-checked' : ''}`}>
                                        {item.iconLink && <img src={item.iconLink} alt="" style={{ width: 18, height: 18, objectFit: 'contain' }} onError={e => { e.target.style.display='none'; }} />}
                                        <span style={{ color: allDone ? 'var(--state-ok-text)' : 'var(--text-primary)' }}>{item.name}</span>
                                        {foundInRaid && <span style={{ color: 'var(--warn)', fontSize: 10 }}>[FIR]</span>}
                                        <span style={{ color: 'var(--accent)' }}>×{count}</span>
                                        <button onClick={() => setDeliveryCount(checkKey, -1, count)} className="btn btn-sm" style={{ padding: '0 5px', minWidth: 22, lineHeight: 1, fontSize: 13 }}>−</button>
                                        <span style={{ fontSize: 12, minWidth: 16, textAlign: 'center', color: allDone ? 'var(--state-ok-text)' : 'var(--text-primary)' }}>{delivered}</span>
                                        <button onClick={() => setDeliveryCount(checkKey, 1, count)} className="btn btn-sm" style={{ padding: '0 5px', minWidth: 22, lineHeight: 1, fontSize: 13 }}>+</button>
                                      </span>
                                    </Tooltip>
                                  );
                                })}
                              </div>
                            )}
                            {pinnedBoardOpen && (
                              <div style={{ padding: '8px 8px 4px' }}>
                                <ColHeader />
                                {pinned.map(task => TaskRow({ task, isInProgress: true, isMapPinned: true, boardCtx: true }))}
                                {pinned.length > 0 && rest.length > 0 && (
                                  <div style={{ borderTop: '1px dashed var(--border-light)', margin: '4px 0' }} />
                                )}
                                {rest.map(task => TaskRow({ task, isInProgress: true, isMapPinned: false, boardCtx: true }))}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* 完了後に解放されたタスク */}
                      {recentlyUnlockedTaskIds.length > 0 && (() => {
                        const unlockedTasks = recentlyUnlockedTaskIds.map(id => apiData.tasks.find(t => t.id === id)).filter(Boolean);
                        if (unlockedTasks.length === 0) return null;
                        return (
                          <div style={{ marginBottom: 16, background: 'var(--state-ok-bg-faint)', border: '1px solid var(--state-ok-border-weak)', borderRadius: 8, overflow: 'hidden' }}>
                            <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--state-ok-border-weak)' }}>
                              <Icon name="arrow-right" size={14} color="var(--state-ok-text)" />
                              <span style={{ color: 'var(--state-ok-text)', fontWeight: 'bold', fontSize: 12 }}>
                                完了後に解放されたタスク <span style={{ fontWeight: 'normal' }}>({unlockedTasks.length} 件)</span>
                              </span>
                              <button onClick={() => setRecentlyUnlockedTaskIds([])} className="btn btn-sm" style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <Icon name="x" size={12} color="currentColor" /> 閉じる
                              </button>
                            </div>
                            <div style={{ padding: '8px 8px 4px' }}>
                              <ColHeader />
                              {unlockedTasks.map(task => TaskRow({ task,
                                isInProgress: pinnedTaskIds.includes(task.id),
                                isMapPinned: mapTaskIds.includes(task.id),
                                ctx: 'search' }))}
                            </div>
                          </div>
                        );
                      })()}

                      {/* 検索結果 */}
                      {filteredTasks.length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                          <ColHeader />
                          {taskSearch.trim() && (
                            <div style={{ color: 'var(--text-dim)', fontSize: 11, marginBottom: 6 }}>
                              検索結果: {filteredTasks.length} 件
                            </div>
                          )}
                          {filteredTasks.map(task =>
                            TaskRow({ task,
                              isInProgress: pinnedTaskIds.includes(task.id),
                              isMapPinned: mapTaskIds.includes(task.id),
                              ctx: 'search' })
                          )}
                        </div>
                      )}
                      {taskSearch && filteredTasks.length === 0 && (
                        <div style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 12 }}>タスクが見つかりません</div>
                      )}
                    </>
                  );
                })()}


              </>
            )}
          </div>
        </div>
      )}

