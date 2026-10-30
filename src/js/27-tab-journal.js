      {/* ===== TAB: JOURNAL ===== */}
      {activeTab === 'journal' && (() => {
        const days = Array.from({ length: journalDays }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (journalDays - 1 - i));
          const key = d.toISOString().slice(0, 10);
          const entry = journalLog[key] || {};
          return { key, date: d, tasks: entry.tasks || 0, gets: (entry.gets || []).length, memo: entry.memo || '', getsArr: entry.gets || [], completedTasksArr: entry.completedTasks || [], wipe: entry.wipe || false };
        });

        const maxVal = Math.max(...days.map(d => d.tasks + d.gets), 1);

        let streak = 0;
        for (let i = 0; i < 365; i++) {
          const d = new Date(); d.setDate(d.getDate() - i);
          const e = journalLog[d.toISOString().slice(0, 10)];
          if (e && ((e.tasks || 0) + (e.gets || []).length) > 0) streak++;
          else break;
        }

        const thisMonth = todayStr.slice(0, 7);
        const allEntries = Object.entries(journalLog);
        const monthEntries = allEntries.filter(([k]) => k.startsWith(thisMonth));
        const monthTasks = monthEntries.reduce((s, [, v]) => s + (v.tasks || 0), 0);
        const monthGets  = monthEntries.reduce((s, [, v]) => s + (v.gets || []).length, 0);
        const totalTasks = allEntries.reduce((s, [, v]) => s + (v.tasks || 0), 0);
        const totalGets  = allEntries.reduce((s, [, v]) => s + (v.gets || []).length, 0);
        const bestDay = allEntries.reduce((best, [k, v]) => {
          const t = (v.tasks || 0) + (v.gets || []).length;
          return t > best.total ? { key: k, total: t } : best;
        }, { key: '', total: 0 });

        return (
          <div>
            {/* Stats row */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              {[
                { icon: 'fire',         iconColor: '#f97316', label: 'ストリーク',  value: `${streak}日`,                                      sub: '連続プレイ中' },
                { icon: 'circle-check', iconColor: 'var(--state-ok)', label: '今月タスク',  value: monthTasks,                                         sub: `入手記録: ${monthGets}件` },
                { icon: 'clipboard-list',iconColor:'var(--accent)',label:'累計タスク',value: totalTasks,                                        sub: `累計入手: ${totalGets}件` },
                { icon: 'trophy',        iconColor: 'var(--warn-text)', label: '最高活動日', value: bestDay.total ? `${bestDay.total}アクション` : '—', sub: bestDay.key || '記録なし' },
              ].map(stat => (
                <div key={stat.label} className="stat-box">
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    <Icon name={stat.icon} size={12} color={stat.iconColor} /> {stat.label}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 'bold', color: 'var(--accent)' }}>{stat.value}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{stat.sub}</div>
                </div>
              ))}
            </div>

            {/* Entry form */}
            <div className="section">
              <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="clipboard-list" size={14} color="var(--accent)" />
                  記録する日付
                </span>
                <input
                  type="date"
                  value={journalEntryDate}
                  max={todayStr}
                  onChange={e => {
                    const d = e.target.value;
                    if (!d) return;
                    setJournalEntryDate(d);
                    const existing = journalLog[d] || {};
                    setJournalDraft({ tasks: existing.tasks || 0, memo: existing.memo || '' });
                  }}
                  style={{ fontSize: 13, padding: '2px 6px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                />
                {journalEntryDate !== todayStr && (
                  <button className="btn btn-sm btn-gray" onClick={() => {
                    setJournalEntryDate(todayStr);
                    const existing = journalLog[todayStr] || {};
                    setJournalDraft({ tasks: existing.tasks || 0, memo: existing.memo || '' });
                  }}>今日に戻す</button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', minWidth: 72, display: 'flex', alignItems: 'center', gap: 4 }}><Icon name="circle-check" size={12} color="var(--state-ok)" /> タスク完了</span>
                  <button className="btn btn-gray btn-sm"
                    onClick={() => setJournalDraft(d => ({ ...d, tasks: Math.max(0, (d.tasks || 0) - 1) }))}>−</button>
                  <input type="number" min="0" max="99"
                    value={journalDraft.tasks || 0}
                    onChange={e => setJournalDraft(d => ({ ...d, tasks: Math.max(0, parseInt(e.target.value) || 0) }))}
                    style={{ width: 48, textAlign: 'center' }} />
                  <button className="btn btn-gray btn-sm"
                    onClick={() => setJournalDraft(d => ({ ...d, tasks: (d.tasks || 0) + 1 }))}>＋</button>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                  デイリー・ウィークリーはこちらで手動加算
                </div>
                <div style={{ flex: '1 1 180px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}><Icon name="pencil" size={12} color="var(--text-secondary)" /> メモ</span>
                  <input type="text" placeholder="今日の一言（任意）"
                    value={journalDraft.memo || ''}
                    onChange={e => setJournalDraft(d => ({ ...d, memo: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && saveJournalEntry()}
                    style={{ flex: 1, padding: '5px 8px', fontSize: 13 }} />
                </div>
                <button className="btn btn-yellow" onClick={saveJournalEntry} style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="download" size={14} color="var(--accent-on)" /> 保存</button>
              </div>
              {journalLog[journalEntryDate] && (
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--state-ok-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="circle-check" size={13} color="var(--state-ok-text)" /> 保存済 — タスク {journalLog[journalEntryDate].tasks || 0}個 / 入手 {(journalLog[journalEntryDate].gets || []).length}件
                  {journalLog[journalEntryDate].memo && ` — 「${journalLog[journalEntryDate].memo}」`}
                </div>
              )}
            </div>

            {/* Bar chart */}
            <div className="section">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                <div className="section-title" style={{ marginBottom: 0 }}>
                  <Icon name="chart-bar" size={14} color="var(--accent)" /> 活動グラフ（過去{journalDays}日）
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[30, 60, 90].map(n => (
                    <button key={n} className={`btn btn-sm ${journalDays === n ? 'btn-yellow' : 'btn-gray'}`}
                      onClick={() => setJournalDays(n)}>{n}日</button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 16, marginBottom: 10, fontSize: 11, color: 'var(--text-secondary)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--accent)', display: 'inline-block' }}></span>タスク完了
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--state-ok)', display: 'inline-block' }}></span>入手（物々交換・作成）
                </span>
              </div>

              <div style={{ position: 'relative' }}>
                {/* Tooltip */}
                {journalTooltip && (
                  <div style={{
                    position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                    background: 'var(--bg-primary)', border: '1px solid var(--accent)',
                    borderRadius: 8, padding: '8px 14px', fontSize: 12,
                    zIndex: 10, pointerEvents: 'none', textAlign: 'center', minWidth: 150,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                  }}>
                    <div style={{ color: 'var(--accent)', fontWeight: 'bold', marginBottom: 4 }}>{journalTooltip.key}</div>
                    {journalTooltip.wipe && (
                      <div style={{ color: 'var(--danger-text)', fontWeight: 'bold', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                        <Icon name="alert-triangle" size={11} color="var(--danger)" /> WIPE DAY
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}><Icon name="circle-check" size={11} color="var(--accent)" /> タスク: <strong>{journalTooltip.tasks}</strong></div>
                    <div style={{ color: 'var(--state-ok-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}><Icon name="package" size={11} color="var(--state-ok-text)" /> 入手: <strong>{journalTooltip.gets}</strong>件</div>
                    {(journalTooltip.completedTasksArr || []).length > 0 && (
                      <div style={{ color: 'var(--text-dim)', marginTop: 4, fontSize: 10, textAlign: 'left' }}>
                        {journalTooltip.completedTasksArr.slice(0, 3).map((t, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Icon name="clipboard-list" size={10} color="var(--text-dim)" />{t.name}
                          </div>
                        ))}
                        {journalTooltip.completedTasksArr.length > 3 && <div>…他{journalTooltip.completedTasksArr.length - 3}件</div>}
                      </div>
                    )}
                    {journalTooltip.getsArr && journalTooltip.getsArr.length > 0 && (
                      <div style={{ color: 'var(--text-dim)', marginTop: 2, fontSize: 10, textAlign: 'left' }}>
                        {journalTooltip.getsArr.slice(0, 3).map((g, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Icon name={g.type === 'craft' ? 'tool' : g.type === 'hideout' ? 'home' : 'shopping-cart'} size={10} color="var(--text-dim)" />
                            {g.name}
                          </div>
                        ))}
                        {journalTooltip.getsArr.length > 3 && <div>…他{journalTooltip.getsArr.length - 3}件</div>}
                      </div>
                    )}
                    {journalTooltip.memo && (
                      <div style={{ color: 'var(--text-dim)', marginTop: 4, fontSize: 11 }}>「{journalTooltip.memo}」</div>
                    )}
                  </div>
                )}

                {/* Bars */}
                <div style={{
                  display: 'flex', alignItems: 'flex-end', gap: journalDays > 60 ? 2 : 3,
                  height: 140, paddingBottom: 20, overflowX: 'auto',
                }}>
                  {days.map(day => {
                    const total = day.tasks + day.gets;
                    const taskH = maxVal > 0 ? (day.tasks / maxVal) * 100 : 0;
                    const getsH = maxVal > 0 ? (day.gets / maxVal) * 100 : 0;
                    const isToday = day.key === todayStr;
                    const bw = journalDays > 60 ? 7 : 10;
                    return (
                      <div key={day.key}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, position: 'relative', width: bw, cursor: 'pointer' }}
                        onMouseEnter={() => setJournalTooltip(day)}
                        onMouseLeave={() => setJournalTooltip(null)}
                      >
                        {isToday && (
                          <div style={{ position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: '50%', background: 'var(--accent)' }} />
                        )}
                        {day.wipe && (
                          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 20, borderLeft: '1px solid var(--danger)', borderRight: '1px solid var(--danger)', background: 'var(--danger-bg-weak)', pointerEvents: 'none' }} />
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: 120, width: '100%' }}>
                          {day.gets > 0 && (
                            <div style={{
                              width: '100%', height: `${getsH}%`, minHeight: 3,
                              background: 'var(--state-ok)', borderRadius: '2px 2px 0 0',
                              opacity: isToday ? 1 : 0.8,
                            }} />
                          )}
                          {day.tasks > 0 && (
                            <div style={{
                              width: '100%', height: `${taskH}%`, minHeight: 3,
                              background: 'var(--accent)',
                              borderRadius: day.gets > 0 ? 0 : '2px 2px 0 0',
                              opacity: isToday ? 1 : 0.8,
                            }} />
                          )}
                          {total === 0 && (
                            <div style={{ width: '100%', height: 3, background: 'var(--border-light)', borderRadius: 2 }} />
                          )}
                        </div>
                        {(day.date.getDate() === 1 || day.date.getDate() === 15 || isToday) && (
                          <div style={{
                            position: 'absolute', bottom: 0, fontSize: 9,
                            color: isToday ? 'var(--accent)' : 'var(--text-dim)',
                            whiteSpace: 'nowrap', transform: 'translateX(-50%)', left: '50%',
                            fontWeight: isToday ? 'bold' : 'normal',
                          }}>
                            {isToday ? '今日' : `${day.date.getMonth() + 1}/${day.date.getDate()}`}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {days.every(d => d.tasks === 0 && d.gets === 0) && (
                  <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 13, paddingTop: 8 }}>
                    まだ記録がありません。上のフォームから今日の活動を記録してみましょう！
                  </div>
                )}
              </div>
            </div>

            {/* History list */}
            <div className="section">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <div className="section-title" style={{ marginBottom: 0 }}>
                  <Icon name="clipboard-list" size={14} color="var(--accent)" /> 記録一覧
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button className="btn btn-gray btn-sm" onClick={exportJournal}
                    title="記録をJSONファイルとして保存"
                    style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Icon name="upload" size={12} color="var(--text-primary)" /> エクスポート
                  </button>
                  <label className="btn btn-gray btn-sm" title="JSONファイルから記録を読み込む"
                    style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                    <Icon name="download" size={12} color="var(--text-primary)" /> インポート
                    <input type="file" accept=".json" onChange={importJournal} style={{ display: 'none' }} />
                  </label>
                </div>
              </div>
              {/* 日付移動モーダル */}
              {movingJournalItem && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  onClick={e => e.target === e.currentTarget && setMovingJournalItem(null)}>
                  <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, minWidth: 280, maxWidth: 340 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontWeight: 'bold', fontSize: 13 }}>
                      <Icon name="arrow-right" size={14} color="var(--accent)" />
                      日付を移動
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>対象:</div>
                    <div style={{ fontSize: 12, color: 'var(--text-primary)', marginBottom: 12, padding: '6px 8px', background: 'var(--bg-primary)', borderRadius: 6, border: '1px solid var(--border-light)' }}>
                      <Icon name={movingJournalItem.type === 'task' ? 'clipboard-list' : movingJournalItem.type === 'craft' ? 'tool' : movingJournalItem.type === 'hideout' ? 'home' : 'shopping-cart'} size={11} color="var(--text-dim)" />
                      {' '}{movingJournalItem.name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>移動先の日付:</div>
                    <input type="date" value={moveTargetDate}
                      onChange={e => setMoveTargetDate(e.target.value)}
                      style={{ width: '100%', fontSize: 13, padding: '5px 8px', marginBottom: 16, boxSizing: 'border-box' }} />
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button className="btn btn-gray btn-sm" onClick={() => setMovingJournalItem(null)}>キャンセル</button>
                      <button className="btn btn-yellow btn-sm"
                        disabled={!moveTargetDate || moveTargetDate === movingJournalItem.fromDate}
                        onClick={() => moveJournalItem(movingJournalItem.fromDate, movingJournalItem.type, movingJournalItem.index, moveTargetDate)}>移動</button>
                    </div>
                  </div>
                </div>
              )}
              {allEntries.length === 0 ? (
                <div style={{ color: 'var(--text-dim)', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>
                  記録がありません。まず上のフォームから今日の活動を保存してみましょう。
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: '70vh', overflowY: 'auto' }}>
                  {allEntries.sort(([a], [b]) => b.localeCompare(a)).map(([dateStr, entry]) => {
                    const isExpanded = expandedJournalDates.has(dateStr);
                    const tasks = entry.completedTasks || [];
                    const gets = entry.gets || [];
                    const hasDetail = tasks.length > 0 || gets.length > 0 || entry.memo;
                    const toggleExpand = () => setExpandedJournalDates(prev => {
                      const next = new Set(prev);
                      next.has(dateStr) ? next.delete(dateStr) : next.add(dateStr);
                      return next;
                    });
                    return (
                      <div key={dateStr} className="journal-entry" style={{
                        background: entry.wipe ? 'var(--danger-bg-faint)' : 'var(--bg-primary)',
                        border: `1px solid ${entry.wipe ? 'var(--danger-border-weak)' : dateStr === todayStr ? 'var(--accent-muted)' : isExpanded ? 'var(--border)' : 'var(--border-light)'}`,
                      }}>
                        {/* サマリ行 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', cursor: hasDetail ? 'pointer' : 'default' }}
                          onClick={hasDetail ? toggleExpand : undefined}>
                          <span style={{ color: entry.wipe ? 'var(--danger-text)' : dateStr === todayStr ? 'var(--accent)' : 'var(--text-secondary)', minWidth: 90, fontWeight: (entry.wipe || dateStr === todayStr) ? 'bold' : 'normal', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                            {entry.wipe
                              ? <Icon name="alert-triangle" size={11} color="var(--danger)" />
                              : dateStr === todayStr && <Icon name="calendar" size={11} color="var(--accent)" />}
                            {dateStr === todayStr ? '今日' : dateStr}
                          </span>
                          {entry.wipe && (
                            <span style={{ background: 'var(--danger-deep)', color: 'var(--danger-pale)', fontSize: 10, fontWeight: 'bold', padding: '1px 7px', borderRadius: 4, flexShrink: 0, letterSpacing: '0.05em' }}>WIPE</span>
                          )}
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}><Icon name="circle-check" size={11} color="var(--accent)" /> {entry.tasks || 0}</span>
                          <span style={{ color: 'var(--state-ok-text)', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}><Icon name="package" size={11} color="var(--state-ok-text)" /> {gets.length}件</span>
                          <span style={{ color: 'var(--text-dim)', flex: 1, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                            {entry.memo && `「${entry.memo}」`}
                          </span>
                          {hasDetail && (
                            <span style={{ flexShrink: 0, color: 'var(--text-dim)', display: 'flex', alignItems: 'center' }}>
                              <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} size={13} color="var(--text-dim)" />
                            </span>
                          )}
                        </div>
                        {/* 展開詳細 */}
                        {isExpanded && (
                          <div style={{ borderTop: '1px solid var(--border-light)', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {tasks.length > 0 && (
                              <div>
                                <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Icon name="clipboard-list" size={10} color="var(--text-dim)" /> タスク完了 ({tasks.length}件)
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                  {tasks.map((t, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                                      <Icon name="circle-check" size={10} color="var(--accent)" />
                                      <span style={{ flex: 1, color: 'var(--text-primary)' }}>{t.name}</span>
                                      <button className="btn btn-sm move-btn" title="日付を移動"
                                        onClick={() => { setMoveTargetDate(dateStr); setMovingJournalItem({ fromDate: dateStr, type: 'task', index: i, name: t.name }); }}
                                        >
                                        <Icon name="calendar" size={10} color="var(--text-dim)" /> 移動
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {gets.length > 0 && (
                              <div>
                                <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Icon name="package" size={10} color="var(--text-dim)" /> 入手 ({gets.length}件)
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                  {gets.map((g, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                                      <Icon name={g.type === 'craft' ? 'tool' : g.type === 'hideout' ? 'home' : 'shopping-cart'} size={10} color={g.type === 'hideout' ? 'var(--info)' : g.type === 'craft' ? 'var(--warn-text)' : 'var(--state-ok-text)'} />
                                      <span style={{ flex: 1, color: 'var(--text-primary)' }}>{g.name}</span>
                                      {g.time && <span style={{ color: 'var(--text-dim)', fontSize: 10, flexShrink: 0 }}>{g.time}</span>}
                                      <button className="btn btn-sm move-btn" title="日付を移動"
                                        onClick={() => { setMoveTargetDate(dateStr); setMovingJournalItem({ fromDate: dateStr, type: g.type || 'barter', index: i, name: g.name }); }}
                                        >
                                        <Icon name="calendar" size={10} color="var(--text-dim)" /> 移動
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })()}

