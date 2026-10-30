      {/* ===== TAB: 出撃準備 ===== */}
      {activeTab === 'raid' && (() => {
        const RAID_MAPS = [
          'Customs', 'Factory', 'Woods', 'Shoreline', 'Interchange',
          'Reserve', 'Lighthouse', 'Streets of Tarkov', 'The Lab', 'Ground Zero',
        ];

        // カテゴリ名 英語→日本語
        const CATEGORY_JA = {
          'Household goods': '家庭用品', 'Flammable materials': '可燃物',
          'Electronic components': '電子部品', 'Mechanical components': '機械部品',
          'Medicine': '薬品', 'Food and drink': '食料・飲料',
          'Building materials': '建築資材', 'Lubricants': '潤滑剤',
          'Tools': '工具', 'Fuel': '燃料', 'Provisions': '食料品',
          'Barter items': 'バーターアイテム', 'Medical supplies': '医薬品',
          'Electronics': '電子機器', 'Valuables': '貴重品', 'Money': '通貨',
          'Containers': 'コンテナ', 'Info items': '情報アイテム',
          'Weapon parts & mods': '武器パーツ&MOD',
        };
        const catJa = (name) => name ? (CATEGORY_JA[name] || name) : name;

        // objective ごとのカテゴリ別グループ
        const grpSpec = { bring: [], collect: [], place: [], kill: [], extract: [], locate: [] };
        const grpAny  = { bring: [], collect: [], place: [], kill: [], extract: [], locate: [] };
        (raidObjectives.specific || []).forEach(x => { if (grpSpec[x.cat]) grpSpec[x.cat].push(x); });
        // place(設置)は特定の場所が必要なため、マップ未指定でも「どのマップでもOK」に含めない
        (raidObjectives.anywhere || []).forEach(x => { if (grpAny[x.cat] && x.cat !== 'place') grpAny[x.cat].push(x); });

        const activeTasks = raidObjectives.activeTasks || [];

        // 目標チェック用ヘルパー
        const getObjKey = (taskId, obj) => obj.id || (taskId + obj.type + (obj.item?.id || obj.questItem?.id || obj.target || ''));
        const isObjChecked = (taskId, obj) => !!(raidObjChecked[taskId]?.[getObjKey(taskId, obj)]);
        const toggleObjCheck = (taskId, obj) => {
          const k = getObjKey(taskId, obj);
          setRaidObjChecked(prev => {
            const tc = { ...(prev[taskId] || {}) };
            if (tc[k]) delete tc[k]; else tc[k] = true;
            return { ...prev, [taskId]: tc };
          });
        };

        // 個別 objective のレンダリング
        const renderObj = ({ obj, task }) => {
          const key = obj.id || (task.id + obj.type + (obj.item?.id || obj.questItem?.id || ''));
          const checked = isObjChecked(task.id, obj);
          const pinsForObj = taskPins.filter(p => p.taskId === task.id && p.objectiveId === obj.id);
          const hasPinMeta = p => p.memo || (p.requiredItems && p.requiredItems.length > 0) || (p.memoImages && p.memoImages.length > 0);
          const pinMetaBlock = pinsForObj.some(hasPinMeta) ? (
            <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
              {pinsForObj.filter(hasPinMeta).map((p, pi) => (
                <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {p.memo && (
                    <div style={{ fontSize: 10, color: 'var(--text-secondary)', display: 'flex', alignItems: 'flex-start', gap: 3 }}>
                      <Icon name="map-pin" size={9} color="var(--state-pin)" style={{ marginTop: 1, flexShrink: 0 }} />
                      <span style={{ lineHeight: 1.4 }}>{pinsForObj.length > 1 ? `[スポーン${pi+1}] ` : ''}{p.memo}</span>
                    </div>
                  )}
                  {p.requiredItems && p.requiredItems.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                      {p.requiredItems.map(item => <PinItemChip key={item.id} item={item} />)}
                    </div>
                  )}
                  <PinImageChips images={p.memoImages} />
                </div>
              ))}
            </div>
          ) : null;
          // マップピン登録済みバッジ（マップ名ごとにグループ化）
          const pinBadge = pinsForObj.length > 0 ? (() => {
            const byMap = {};
            pinsForObj.forEach(p => { (byMap[p.mapName] = byMap[p.mapName] || []).push(p); });
            return (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 4 }}>
                {Object.entries(byMap).map(([mapName, pins]) => (
                  <button key={mapName}
                    onClick={() => {
                      setActiveTab('maps');
                      setMapsSelectedMap(mapName);
                      setMapsHighlightedPinId(pins[0].id);
                    }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10,
                      padding: '1px 7px', borderRadius: 10, cursor: 'pointer',
                      background: 'var(--state-pin-bg-weak)', color: 'var(--state-pin)',
                      border: '1px solid var(--state-pin-border)' }}>
                    <Icon name="map-pin" size={9} color="var(--state-pin)" />
                    {mapName}{pins.length > 1 ? ` ×${pins.length}` : ''}
                  </button>
                ))}
              </div>
            );
          })() : null;

          const chipStyle = { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', opacity: checked ? 0.4 : 1, transition: 'opacity 0.15s' };
          const chkBox = (
            <input type="checkbox" checked={checked} onChange={() => toggleObjCheck(task.id, obj)}
              style={{ width: 15, height: 15, accentColor: 'var(--state-ok)', flexShrink: 0, cursor: 'pointer' }} />
          );
          const traderBadge = (
            <span style={{ fontSize: 10, color: 'var(--text-dim)', background: 'var(--bg-secondary)', padding: '1px 5px', borderRadius: 3, flexShrink: 0 }}>
              {task.trader?.name}
            </span>
          );
          const taskLabel = (
            <button onClick={() => setRaidDetailTask(task)}
              style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>
              {task.name}
            </button>
          );

          if (obj.type === 'findItem' || obj.type === 'giveItem' || obj.type === 'plantItem') {
            const catName = obj.itemCategory?.name;
            const displayName = obj.item?.name || (catName ? `${catJa(catName)} カテゴリ` : obj.description);
            return (
              <div key={key} className="delivery-chip" style={chipStyle}>
                {chkBox}
                {(obj.item?.iconLink || obj.questItem?.iconLink) ? (
                  <img src={obj.item?.iconLink || obj.questItem?.iconLink} alt="" style={{ width: 28, height: 28, objectFit: 'contain', background: 'var(--bg-secondary)', borderRadius: 3, flexShrink: 0 }}
                    onError={e => { e.target.style.display = 'none'; }} />
                ) : catName ? (
                  <Icon name="package" size={22} color="var(--text-dim)" />
                ) : null}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 'bold', color: 'var(--text-primary)' }}>{displayName}</div>
                  {obj.description && (obj.item?.name || catName) && (
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 1 }}>{obj.description}</div>
                  )}
                  <div style={{ display: 'flex', gap: 6, marginTop: 2, flexWrap: 'wrap', alignItems: 'center' }}>{taskLabel}{traderBadge}</div>
                  {pinBadge}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  {obj.foundInRaid && (
                    <span style={{ fontSize: 10, color: 'var(--warn-text)', background: 'var(--warn-bg)', border: '1px solid var(--warn)', padding: '1px 5px', borderRadius: 3 }}>FIR</span>
                  )}
                  <span style={{ fontSize: 14, fontWeight: 'bold', color: 'var(--accent)' }}>×{obj.count}</span>
                </div>
              </div>
            );
          }

          if (obj.type === 'findQuestItem') {
            return (
              <div key={key} className="delivery-chip" style={chipStyle}>
                {chkBox}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 'bold', color: 'var(--text-primary)' }}>{obj.questItem?.name || obj.description}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 2, flexWrap: 'wrap', alignItems: 'center' }}>{taskLabel}{traderBadge}</div>
                  {pinBadge}
                </div>
                <span style={{ fontSize: 10, color: 'var(--info)', background: 'var(--info-bg)', padding: '1px 5px', borderRadius: 3, flexShrink: 0 }}>クエストアイテム</span>
                <span style={{ fontSize: 14, fontWeight: 'bold', color: 'var(--accent)', flexShrink: 0 }}>×{obj.count}</span>
              </div>
            );
          }

          if (obj.type === 'mark') {
            return (
              <div key={key} className="delivery-chip" style={chipStyle}>
                {chkBox}
                {obj.markerItem?.iconLink && (
                  <img src={obj.markerItem.iconLink} alt="" style={{ width: 28, height: 28, objectFit: 'contain', background: 'var(--bg-secondary)', borderRadius: 3, flexShrink: 0 }}
                    onError={e => { e.target.style.display = 'none'; }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{obj.description}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 2, flexWrap: 'wrap', alignItems: 'center' }}>{taskLabel}{traderBadge}</div>
                  {pinMetaBlock}
                  {pinBadge}
                </div>
                {obj.markerItem?.name && (
                  <span style={{ fontSize: 11, color: 'var(--text-dim)', flexShrink: 0 }}>{obj.markerItem.name}</span>
                )}
              </div>
            );
          }

          if (obj.type === 'kill' || obj.type === 'shoot') {
            const parts = (obj.bodyParts || []).join('/');
            const dist = obj.distance ? `${obj.distance.compareMethod}${obj.distance.value}m` : '';
            const killDetail = [obj.target, `×${obj.count}`, parts ? `(${parts})` : '', dist].filter(Boolean).join(' ');
            return (
              <div key={key} className="delivery-chip" style={chipStyle}>
                {chkBox}
                <Icon name="skull" size={20} color="var(--danger)" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                    {obj.description || killDetail}
                  </div>
                  {obj.description && killDetail && (
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 1 }}>{killDetail}</div>
                  )}
                  <div style={{ display: 'flex', gap: 6, marginTop: 2, flexWrap: 'wrap', alignItems: 'center' }}>{taskLabel}{traderBadge}</div>
                  {pinMetaBlock}
                  {pinBadge}
                </div>
              </div>
            );
          }

          if (obj.type === 'extract') {
            return (
              <div key={key} className="delivery-chip" style={chipStyle}>
                {chkBox}
                <Icon name="arrow-right" size={16} color="var(--state-ok)" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{obj.description}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 2, flexWrap: 'wrap', alignItems: 'center' }}>{taskLabel}{traderBadge}</div>
                  {pinBadge}
                </div>
              </div>
            );
          }

          if (obj.type === 'locate' || obj.type === 'visit') {
            return (
              <div key={key} className="delivery-chip" style={chipStyle}>
                {chkBox}
                <Icon name="search" size={18} color="var(--info)" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{obj.description || obj.target || '調査'}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 2, flexWrap: 'wrap', alignItems: 'center' }}>{taskLabel}{traderBadge}</div>
                  {pinMetaBlock}
                  {pinBadge}
                </div>
              </div>
            );
          }
          return null;
        };

        const renderSection = (label, iconName, color, items) => {
          if (!items || items.length === 0) return null;
          return (
            <div className="section" key={label}>
              <div className="section-title">
                <Icon name={iconName} size={14} color={color} /> {label}
                <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 6 }}>{items.length}件</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {items.map(renderObj)}
              </div>
            </div>
          );
        };

        // 収集セクション専用レンダラー（表示モード対応）
        const renderCollectSection = (label, items) => {
          if (!items || items.length === 0) return null;
          if (collectViewMode === 'hidden') return null;
          const sectionHeader = (
            <div className="section-title">
              <Icon name="package" size={14} color="var(--warn)" /> {label}
              <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 6 }}>{items.length}件</span>
            </div>
          );
          const cols = collectViewMode === '2col' ? 2 : collectViewMode === '3col' ? 3 : null;
          if (cols) {
            return (
              <div className="section" key={label}>
                {sectionHeader}
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 3 }}>
                  {items.map(({ obj, task }) => {
                    const catName = obj.itemCategory?.name;
                    const dispName = obj.item?.name || obj.questItem?.name || (catName ? `${catJa(catName)} カテゴリ` : obj.description || '');
                    const k = obj.id || (task.id + obj.type + (obj.item?.id || obj.questItem?.id || ''));
                    const checked = isObjChecked(task.id, obj);
                    const iconLink = obj.item?.iconLink || obj.questItem?.iconLink;
                    return (
                      <div key={k} onClick={() => toggleObjCheck(task.id, obj)}
                        style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '3px 6px', background: 'var(--bg-secondary)', borderRadius: 4, fontSize: 11, minWidth: 0, opacity: checked ? 0.4 : 1, cursor: 'pointer', transition: 'opacity 0.15s', outline: checked ? '1px solid var(--state-ok)' : 'none' }}>
                        {iconLink ? (
                          <img src={iconLink} alt="" style={{ width: 16, height: 16, objectFit: 'contain', flexShrink: 0 }} onError={e => { e.target.style.display = 'none'; }} />
                        ) : catName ? <Icon name="package" size={13} color="var(--text-dim)" /> : null}
                        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>{dispName}</span>
                        <span style={{ fontWeight: 'bold', color: 'var(--accent)', flexShrink: 0 }}>×{obj.count || 1}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }
          // normal: 1行コンパクト
          return (
            <div className="section" key={label}>
              {sectionHeader}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {items.map(({ obj, task }) => {
                  const catName = obj.itemCategory?.name;
                  const dispName = obj.item?.name || obj.questItem?.name || (catName ? `${catJa(catName)} カテゴリ` : obj.description || '');
                  const k = obj.id || (task.id + obj.type + (obj.item?.id || obj.questItem?.id || ''));
                  const checked = isObjChecked(task.id, obj);
                  return (
                    <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 8px', background: 'var(--bg-secondary)', borderRadius: 4, fontSize: 12, minWidth: 0, opacity: checked ? 0.4 : 1, transition: 'opacity 0.15s' }}>
                      <input type="checkbox" checked={checked} onChange={() => toggleObjCheck(task.id, obj)}
                        style={{ width: 13, height: 13, accentColor: 'var(--state-ok)', flexShrink: 0, cursor: 'pointer' }} />
                      {(obj.item?.iconLink || obj.questItem?.iconLink) ? (
                        <img src={obj.item?.iconLink || obj.questItem?.iconLink} alt="" style={{ width: 20, height: 20, objectFit: 'contain', flexShrink: 0 }} onError={e => { e.target.style.display = 'none'; }} />
                      ) : catName ? <Icon name="package" size={16} color="var(--text-dim)" /> : null}
                      <span style={{ fontWeight: 'bold', color: 'var(--text-primary)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dispName}</span>
                      {obj.description && <span style={{ color: 'var(--text-dim)', fontSize: 10, flexShrink: 0 }}>({obj.description})</span>}
                      {obj.foundInRaid && (
                        <span style={{ fontSize: 10, color: 'var(--warn-text)', background: 'var(--warn-bg)', border: '1px solid var(--warn)', padding: '0 3px', borderRadius: 3, flexShrink: 0 }}>FIR</span>
                      )}
                      <span style={{ fontSize: 13, fontWeight: 'bold', color: 'var(--accent)', flexShrink: 0 }}>×{obj.count || 1}</span>
                      <button onClick={() => setRaidDetailTask(task)}
                        style={{ color: 'var(--accent)', fontSize: 10, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>{task.name}</button>
                      {task.trader?.name && <span style={{ fontSize: 10, color: 'var(--text-dim)', background: 'var(--bg-primary)', padding: '0 3px', borderRadius: 2, flexShrink: 0 }}>{task.trader.name}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        };

        return (
          <div>
            {/* ─── マップ選択 ─── */}
            <div className="section">
              <div className="section-title"><Icon name="map" size={14} color="var(--accent)" /> マップ選択</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {RAID_MAPS.map(m => (
                  <button key={m}
                    className={`btn btn-sm ${raidMap === m ? 'btn-yellow' : 'btn-gray'}`}
                    onClick={() => setRaidMap(prev => prev === m ? '' : m)}>
                    {m}
                  </button>
                ))}
              </div>
              {raidMap && (
                <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                  選択中: <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{raidMap}</span>
                </div>
              )}
            </div>

            {/* ─── 進行タスク ─── */}
            <div className="section">
              <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span onClick={() => setRaidActiveTasksOpen(v => !v)}
                  title={raidActiveTasksOpen ? '進行タスク一覧を閉じる' : '進行タスク一覧を開く'}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', userSelect: 'none' }}>
                  <Icon name={raidActiveTasksOpen ? 'chevron-down' : 'chevron-right'} size={14} color="var(--text-secondary)" />
                  <Icon name="list-check" size={14} color="var(--accent)" /> 進行タスク
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 'normal' }}>({activeTasks.length} 件)</span>
                  <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>タスク検索タブのボードと共有</span>
                </span>
                <button className="btn btn-gray btn-sm"
                  onClick={() => {
                    if (customTaskFormOpen) {
                      setCustomTaskFormOpen(false);
                      setCustomTaskEditId(null);
                      setApiTaskToUnpin(null);
                      setCustomTaskDraft({ name: '', traderName: '', objectives: [], wikiLink: '' });
                      setCustomFormItemSearchIdx(-1);
                      setCustomFormTraderOpen(false);
                    } else {
                      setCustomTaskEditId(null);
                      setCustomTaskFormOpen(true);
                    }
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <Icon name="pencil" size={11} color="currentColor" />
                  {customTaskFormOpen ? (customTaskEditId ? 'キャンセル' : apiTaskToUnpin ? 'キャンセル' : '閉じる') : 'カスタム追加'}
                </button>
              </div>

              {/* 進行タスク一覧（トグルで開閉・デフォルト閉）。閉じていても下の検索欄は常に表示 */}
              {raidActiveTasksOpen && activeTasks.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                  {activeTasks.map(t => {
                    const isCustom = t.id.startsWith('custom_');
                    return (
                      <span key={t.id} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        background: isCustom ? 'var(--warn-bg-weak)' : 'var(--bg-secondary)',
                        border: `1px solid ${isCustom ? 'var(--warn)' : 'var(--border)'}`,
                        borderRadius: 14, padding: '3px 8px 3px 10px', fontSize: 12
                      }}>
                        {isCustom && <span style={{ fontSize: 10, color: 'var(--warn)', fontWeight: 'bold', flexShrink: 0 }}>カスタム</span>}
                        {t.trader?.name && <span style={{ fontSize: 10, color: isCustom ? 'var(--warn-text)' : 'var(--accent)', fontWeight: 'bold' }}>{t.trader.name}</span>}
                        <span style={{ color: 'var(--text-primary)' }}>{t.name}</span>
                        <button
                          onClick={() => isCustom ? openCustomTaskEdit(t.id) : openApiTaskEdit(t)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex', lineHeight: 1 }}
                          title={isCustom ? '編集' : 'カスタムタスクとして上書き編集'}>
                          <Icon name="pencil" size={12} color="var(--text-secondary)" />
                        </button>
                        <button onClick={() => setPinnedTaskIds(prev => prev.filter(id => id !== t.id))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex', lineHeight: 1 }} title="進行中から外す">
                          <Icon name="x" size={12} color="var(--text-dim)" />
                        </button>
                        {isCustom && (
                          <button onClick={() => {
                            saveCustomTasks(customTasks.filter(ct => ct.id !== t.id));
                            setPinnedTaskIds(prev => prev.filter(id => id !== t.id));
                            setCompletedTaskIds(prev => prev.filter(id => id !== t.id));
                          }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex', lineHeight: 1 }} title="カスタムタスクを削除">
                            <Icon name="trash" size={12} color="var(--danger)" />
                          </button>
                        )}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* 手動タスク検索 */}
              <input
                type="text"
                placeholder="タスク名で検索して追加..."
                value={raidTaskSearch}
                onChange={e => setRaidTaskSearch(e.target.value)}
                style={{ width: '100%', padding: '6px 10px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 13, boxSizing: 'border-box' }}
              />
              {raidTaskSearchResults.length > 0 && (
                <div style={{ marginTop: 4, border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
                  {raidTaskSearchResults.map(t => {
                    const isCustom = t.id.startsWith('custom_');
                    const alreadyPinned = pinnedTaskIds.includes(t.id);
                    return (
                      <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-primary)', gap: 8 }}>
                        <div style={{ minWidth: 0, flex: 1, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                          {isCustom && <span style={{ fontSize: 10, color: 'var(--warn)', fontWeight: 'bold', flexShrink: 0 }}>カスタム</span>}
                          {t.trader?.name && <span style={{ fontSize: 11, color: 'var(--text-secondary)', flexShrink: 0 }}>{t.trader.name}</span>}
                          <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{t.name}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                          {alreadyPinned ? (
                            <button className="btn btn-gray btn-sm"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--state-ok)' }}
                              onClick={() => {
                                setRaidTaskSearch('');
                                if (isCustom) { openCustomTaskEdit(t.id); } else { openApiTaskEdit(t); }
                              }}>
                              <Icon name="pencil" size={11} color="var(--state-ok)" /> 進行中・編集
                            </button>
                          ) : (
                            <button className="btn btn-gray btn-sm"
                              onClick={() => { setPinnedTaskIds(prev => prev.includes(t.id) ? prev : [...prev, t.id]); setRaidTaskSearch(''); }}>
                              + 追加
                            </button>
                          )}
                          {isCustom && (
                            <button onClick={() => {
                              saveCustomTasks(customTasks.filter(ct => ct.id !== t.id));
                              setPinnedTaskIds(prev => prev.filter(id => id !== t.id));
                              setCompletedTaskIds(prev => prev.filter(id => id !== t.id));
                            }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex', lineHeight: 1 }} title="カスタムタスクを削除">
                              <Icon name="trash" size={14} color="var(--danger)" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {raidTaskSearch.length > 0 && (
                <div style={{ marginTop: 6, textAlign: 'right' }}>
                  <button className="btn btn-gray btn-sm"
                    onClick={() => { setCustomTaskEditId(null); setCustomTaskDraft({ name: raidTaskSearch, traderName: '', objectives: [], wikiLink: '' }); setCustomTaskFormOpen(true); setRaidTaskSearch(''); }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                    <Icon name="pencil" size={11} color="currentColor" /> 「{raidTaskSearch}」をカスタムタスクとして登録
                  </button>
                </div>
              )}
              {activeTasks.length === 0 && raidTaskSearch.length === 0 && (
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-dim)' }}>
                  タスク検索タブでボードに追加するか、上の検索から登録してください
                </div>
              )}

              {customTaskFormOpen && (() => {
                const draft = customTaskDraft;
                const setDraft = setCustomTaskDraft;
                const updateObj = (idx, patch) => setDraft(d => ({
                  ...d, objectives: d.objectives.map((o, i) => i === idx ? { ...o, ...patch } : o)
                }));
                const removeObj = (idx) => setDraft(d => ({
                  ...d, objectives: d.objectives.filter((_, i) => i !== idx)
                }));
                const toggleObjMap = (idx, map) => {
                  const curr = draft.objectives[idx]?.maps || [];
                  updateObj(idx, { maps: curr.includes(map) ? curr.filter(m => m !== map) : [...curr, map] });
                };
                const canSave = draft.name.trim().length > 0;
                const saveDraft = () => {
                  const ts = Date.now();
                  const taskId = customTaskEditId || 'custom_' + ts;
                  // フォームで編集しない項目（イベントタブから登録した報酬など）は編集前の値を引き継ぐ
                  const prevTask = customTaskEditId ? customTasks.find(t => t.id === customTaskEditId) : null;
                  const newTask = {
                    ...(prevTask?.finishRewards ? { finishRewards: prevTask.finishRewards, experience: prevTask.experience || 0 } : {}),
                    id: taskId,
                    name: draft.name.trim(),
                    trader: draft.traderName.trim() ? { name: draft.traderName.trim() } : null,
                    wikiLink: draft.wikiLink.trim() || '',
                    objectives: draft.objectives.map((o, i) => {
                      const base = { id: o.origId || `custom_obj_${ts}_${i}`, maps: (o.maps || []).map(m => ({ name: m })), count: o.count || 1 };
                      if (o.catKey === 'collect') {
                        if (o.useCategory) return { ...base, type: 'findItem', foundInRaid: true, item: null, itemCategory: { name: o.itemName || '' }, description: o.description || '' };
                        return { ...base, type: 'findItem', foundInRaid: true, item: { id: o.itemId || `custom_item_${ts}_${i}`, name: o.itemName || '', iconLink: o.itemIconLink || '' }, description: o.description || '' };
                      }
                      if (o.catKey === 'bring') {
                        if (o.useCategory) return { ...base, type: 'giveItem', foundInRaid: false, item: null, itemCategory: { name: o.itemName || '' }, description: o.description || '' };
                        return { ...base, type: 'findItem', foundInRaid: false, item: { id: o.itemId || `custom_item_${ts}_${i}`, name: o.itemName || '', iconLink: o.itemIconLink || '' }, description: o.description || '' };
                      }
                      if (o.catKey === 'kill')    return { ...base, type: 'kill', foundInRaid: false,
                        target: o.itemName || 'Any target', description: o.description || '',
                        bodyParts: [], distance: null };
                      if (o.catKey === 'place')   return { ...base, type: 'mark', foundInRaid: false,
                        description: o.description || '',
                        markerItem: o.itemId ? { id: o.itemId, name: o.itemName, iconLink: o.itemIconLink || '' } : null };
                      if (o.catKey === 'extract') return { ...base, type: 'extract', foundInRaid: false,
                        description: o.itemName || '' };
                      if (o.catKey === 'locate')  return { ...base, type: 'locate', foundInRaid: false,
                        description: o.itemName || '' };
                      return { ...base, type: 'findItem', foundInRaid: false,
                        item: { id: o.itemId || `custom_item_${ts}_${i}`, name: o.itemName || '', iconLink: o.itemIconLink || '' } };
                    }),
                  };
                  if (customTaskEditId) {
                    saveCustomTasks(customTasks.map(t => t.id === taskId ? newTask : t));
                  } else {
                    saveCustomTasks([...customTasks, newTask]);
                    setPinnedTaskIds(prev => {
                      let next = prev.includes(newTask.id) ? prev : [...prev, newTask.id];
                      if (apiTaskToUnpin) next = next.filter(id => id !== apiTaskToUnpin);
                      return next;
                    });
                    if (apiTaskToUnpin) setCompletedTaskIds(prev => prev.filter(id => id !== apiTaskToUnpin));
                  }
                  setCustomTaskEditId(null);
                  setApiTaskToUnpin(null);
                  setDraft({ name: '', traderName: '', objectives: [], wikiLink: '' });
                  setCustomTaskFormOpen(false);
                  setCustomFormItemSearchIdx(-1);
                  setCustomFormTraderOpen(false);
                };
                const CAT_OPTIONS = [
                  { key: 'bring',   label: '持ち込む' },
                  { key: 'collect', label: '収集（FIR）' },
                  { key: 'kill',    label: '倒す' },
                  { key: 'place',   label: '設置/マーク' },
                  { key: 'extract', label: '脱出' },
                  { key: 'locate',  label: '調査/特定' },
                ];
                const filteredTraders = raidTraderNames.filter(n =>
                  !draft.traderName || n.toLowerCase().includes(draft.traderName.toLowerCase())
                );
                const dropStyle = {
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
                  background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                  borderRadius: 4, maxHeight: 160, overflowY: 'auto',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                };
                return (
                  <div style={{ marginTop: 8, background: 'var(--bg-primary)', border: `1px solid ${customTaskEditId ? 'var(--warn)' : apiTaskToUnpin ? 'var(--info)' : 'var(--border)'}`, borderRadius: 8, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {customTaskEditId && (
                      <div style={{ fontSize: 11, color: 'var(--warn-text)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <Icon name="pencil" size={11} color="var(--warn-text)" /> 編集中
                      </div>
                    )}
                    {apiTaskToUnpin && !customTaskEditId && (
                      <div style={{ fontSize: 11, color: 'var(--info)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <Icon name="pencil" size={11} color="var(--info)" /> APIタスクをカスタムで上書き（保存後に元タスクを進行中から除外）
                      </div>
                    )}
                    {/* タスク名 + トレーダーコンボボックス */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <label style={{ fontSize: 12, color: 'var(--text-dim)', flexShrink: 0 }}>タスク名</label>
                      <input type="text" value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                        placeholder="タスク名（必須）"
                        style={{ flex: 1, minWidth: 120, padding: '5px 8px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 5, color: 'var(--text-primary)', fontSize: 13 }} />
                      <label style={{ fontSize: 12, color: 'var(--text-dim)', flexShrink: 0 }}>トレーダー</label>
                      <div style={{ position: 'relative', width: 130 }}>
                        <input type="text" value={draft.traderName}
                          onChange={e => { setDraft(d => ({ ...d, traderName: e.target.value })); setCustomFormTraderOpen(true); }}
                          onFocus={() => setCustomFormTraderOpen(true)}
                          onBlur={() => setTimeout(() => setCustomFormTraderOpen(false), 150)}
                          placeholder="省略可"
                          style={{ width: '100%', padding: '5px 8px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 5, color: 'var(--text-primary)', fontSize: 13, boxSizing: 'border-box' }} />
                        {customFormTraderOpen && filteredTraders.length > 0 && (
                          <div style={dropStyle}>
                            {filteredTraders.map(n => (
                              <div key={n}
                                onMouseDown={() => { setDraft(d => ({ ...d, traderName: n })); setCustomFormTraderOpen(false); }}
                                style={{ padding: '5px 10px', cursor: 'pointer', fontSize: 12, color: 'var(--text-primary)' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-muted)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                {n}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Wiki URL */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <label style={{ fontSize: 12, color: 'var(--text-dim)', flexShrink: 0 }}>Wiki URL</label>
                      <input type="text" value={draft.wikiLink || ''} onChange={e => setDraft(d => ({ ...d, wikiLink: e.target.value }))}
                        placeholder="省略可（例: https://escapefromtarkov.fandom.com/wiki/...）"
                        style={{ flex: 1, padding: '5px 8px', background: 'var(--bg-secondary)', border: `1px solid ${draft.wikiLink ? 'var(--state-ok)' : 'var(--border)'}`, borderRadius: 5, color: 'var(--text-primary)', fontSize: 12 }} />
                    </div>

                    {/* 目標リスト */}
                    {draft.objectives.map((o, idx) => (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 6, background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: 6, padding: '8px 10px' }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                          <select value={o.catKey}
                            onChange={e => updateObj(idx, { catKey: e.target.value, itemName: '', itemId: null, itemIconLink: '', useCategory: false, description: '' })}
                            style={{ padding: '4px 6px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-primary)', fontSize: 12 }}>
                            {CAT_OPTIONS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                          </select>

                          {/* アイテム / カテゴリ / ターゲット 検索 */}
                          <div style={{ display: 'flex', gap: 4, flex: 1, minWidth: 0, alignItems: 'center' }}>
                            {(o.catKey === 'bring' || o.catKey === 'collect') && (
                              <div style={{ display: 'inline-flex', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden', flexShrink: 0 }}>
                                <button onClick={() => updateObj(idx, { useCategory: false, itemName: '', itemId: null, itemIconLink: '' })}
                                  style={{ padding: '3px 7px', fontSize: 10, cursor: 'pointer', border: 'none', background: !o.useCategory ? 'var(--accent)' : 'var(--bg-primary)', color: !o.useCategory ? 'var(--accent-on)' : 'var(--text-secondary)' }}>
                                  アイテム
                                </button>
                                <button onClick={() => updateObj(idx, { useCategory: true, itemName: '', itemId: null, itemIconLink: '' })}
                                  style={{ padding: '3px 7px', fontSize: 10, cursor: 'pointer', border: 'none', background: o.useCategory ? 'var(--accent)' : 'var(--bg-primary)', color: o.useCategory ? 'var(--accent-on)' : 'var(--text-secondary)' }}>
                                  カテゴリ
                                </button>
                              </div>
                            )}
                            <div style={{ position: 'relative', flex: 1, minWidth: 120 }}>
                              {!o.useCategory && o.itemIconLink && (
                                <img src={o.itemIconLink} alt=""
                                  style={{ position: 'absolute', left: 5, top: '50%', transform: 'translateY(-50%)', width: 20, height: 20, objectFit: 'contain', pointerEvents: 'none' }} />
                              )}
                              <input type="text" value={o.itemName || ''}
                                onChange={e => { updateObj(idx, { itemName: e.target.value, itemId: null, itemIconLink: '' }); setCustomFormItemSearchIdx(idx); }}
                                onFocus={() => setCustomFormItemSearchIdx(idx)}
                                onBlur={() => setTimeout(() => setCustomFormItemSearchIdx(cur => cur === idx ? -1 : cur), 150)}
                                placeholder={
                                  o.catKey === 'locate' ? '場所の説明（例: Woods 地雷エリア）' :
                                  o.catKey === 'kill' ? 'ターゲット（Scav / ボス名）' :
                                  o.catKey === 'extract' ? '脱出ルート（省略可）' :
                                  o.useCategory ? 'カテゴリ名（例: Household goods）' :
                                  o.catKey === 'place' ? 'マーカーアイテム名' : 'アイテム名'
                                }
                                style={{ width: '100%', padding: `4px 8px 4px ${!o.useCategory && o.itemIconLink ? '30px' : '8px'}`, background: 'var(--bg-primary)', border: `1px solid ${o.itemId ? 'var(--state-ok)' : 'var(--border)'}`, borderRadius: 4, color: 'var(--text-primary)', fontSize: 12, boxSizing: 'border-box' }} />
                              {customFormItemSearchIdx === idx && (o.itemName || '').length > 0 && o.catKey !== 'extract' && o.catKey !== 'locate' && (() => {
                                const low = (o.itemName || '').toLowerCase();
                                let results;
                                if (o.catKey === 'kill') {
                                  results = killTargets
                                    .filter(t => t.toLowerCase().includes(low))
                                    .slice(0, 10)
                                    .map(t => ({ label: t, sub: null, icon: null, id: null, iconLink: '' }));
                                } else if (o.useCategory) {
                                  const CATS = ['Household goods', 'Flammable materials', 'Electronic components', 'Mechanical components', 'Medicine', 'Food and drink', 'Building materials', 'Lubricants', 'Tools', 'Fuel', 'Provisions', 'Barter items', 'Medical supplies'];
                                  results = CATS
                                    .filter(c => c.toLowerCase().includes(low) || (CATEGORY_JA[c] || '').includes(low))
                                    .slice(0, 8)
                                    .map(c => ({ label: CATEGORY_JA[c] || c, sub: null, icon: null, id: null, iconLink: '', categoryKey: c }));
                                } else {
                                  results = apiData.items
                                    .filter(it => (it.name || '').toLowerCase().includes(low) || (it.shortName || '').toLowerCase().includes(low))
                                    .slice(0, 8)
                                    .map(it => ({ label: it.name, sub: it.shortName !== it.name ? it.shortName : null, icon: it.iconLink || null, id: it.id, iconLink: it.iconLink || '' }));
                                }
                                if (results.length === 0) return null;
                                return (
                                  <div style={dropStyle}>
                                    {results.map((r, ri) => (
                                      <div key={ri}
                                        onMouseDown={() => {
                                          updateObj(idx, { itemName: r.categoryKey || r.label, itemId: r.id || null, itemIconLink: r.iconLink });
                                          setCustomFormItemSearchIdx(-1);
                                        }}
                                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 12, color: 'var(--text-primary)' }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-muted)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                        {r.icon && <img src={r.icon} alt="" style={{ width: 24, height: 24, objectFit: 'contain', flexShrink: 0, background: 'var(--bg-primary)', borderRadius: 2 }} />}
                                        <span>{r.label}</span>
                                        {r.sub && <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>({r.sub})</span>}
                                      </div>
                                    ))}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>

                          {(o.catKey === 'bring' || o.catKey === 'collect' || o.catKey === 'kill') && (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                              <button style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 4, width: 22, height: 22, cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                onClick={() => updateObj(idx, { count: Math.max(1, (o.count || 1) - 1) })}>-</button>
                              <span style={{ fontSize: 13, minWidth: 26, textAlign: 'center', color: 'var(--text-primary)' }}>{o.count || 1}</span>
                              <button style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 4, width: 22, height: 22, cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                onClick={() => updateObj(idx, { count: (o.count || 1) + 1 })}>+</button>
                            </div>
                          )}
                          <button onClick={() => removeObj(idx)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'inline-flex' }}>
                            <Icon name="x" size={14} color="var(--danger)" />
                          </button>
                        </div>
                        {(o.catKey === 'bring' || o.catKey === 'collect' || o.catKey === 'kill' || o.catKey === 'place') && (
                          <input type="text" value={o.description || ''}
                            onChange={e => updateObj(idx, { description: e.target.value })}
                            placeholder={
                              o.catKey === 'kill' ? '詳細条件（例: Eliminate any target without armor or helmet）' :
                              o.catKey === 'place' ? '設置場所の詳細（例: Woodsにある測候所のどれか）' :
                              '詳細・補足（省略可）'
                            }
                            style={{ width: '100%', padding: '4px 8px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-primary)', fontSize: 12, boxSizing: 'border-box' }} />
                        )}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center' }}>
                          <span style={{ fontSize: 11, color: 'var(--text-dim)', marginRight: 2 }}>マップ:</span>
                          {RAID_MAPS.map(m => (
                            <button key={m} onClick={() => toggleObjMap(idx, m)}
                              style={{
                                padding: '1px 7px', fontSize: 10, borderRadius: 10, cursor: 'pointer',
                                background: (o.maps || []).includes(m) ? 'var(--accent)' : 'var(--bg-primary)',
                                color: (o.maps || []).includes(m) ? 'var(--accent-on)' : 'var(--text-secondary)',
                                border: `1px solid ${(o.maps || []).includes(m) ? 'var(--accent)' : 'var(--border)'}`,
                              }}>
                              {m}
                            </button>
                          ))}
                          {(o.maps || []).length === 0 && <span style={{ fontSize: 10, color: 'var(--text-dim)', marginLeft: 4 }}>未選択 = どのマップでもOK</span>}
                        </div>
                      </div>
                    ))}

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <button className="btn btn-gray btn-sm"
                        onClick={() => setDraft(d => ({ ...d, objectives: [...d.objectives, { catKey: 'bring', itemName: '', itemId: null, itemIconLink: '', description: '', count: 1, maps: [], useCategory: false }] }))}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        + 目標を追加
                      </button>
                      <div style={{ flex: 1 }} />
                      <button className="btn btn-gray btn-sm"
                        onClick={() => { setCustomTaskFormOpen(false); setCustomTaskEditId(null); setApiTaskToUnpin(null); setDraft({ name: '', traderName: '', objectives: [], wikiLink: '' }); setCustomFormItemSearchIdx(-1); setCustomFormTraderOpen(false); }}>
                        キャンセル
                      </button>
                      <button className="btn btn-yellow btn-sm" disabled={!canSave} onClick={saveDraft}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Icon name="circle-check" size={12} color="var(--accent-on)" />
                        {customTaskEditId ? '保存して更新' : '保存して追加'}
                      </button>
                    </div>
                    {(customTaskEditId || apiTaskToUnpin) && (() => {
                      const completeTaskId = customTaskEditId || apiTaskToUnpin;
                      const isAlreadyComplete = completedTaskIds.includes(completeTaskId);
                      const closeForm = () => {
                        setCustomTaskFormOpen(false);
                        setCustomTaskEditId(null);
                        setApiTaskToUnpin(null);
                        setDraft({ name: '', traderName: '', objectives: [], wikiLink: '' });
                        setCustomFormItemSearchIdx(-1);
                        setCustomFormTraderOpen(false);
                      };
                      return (
                        <div style={{ display: 'flex', justifyContent: 'center', borderTop: '1px solid var(--border-light)', paddingTop: 10 }}>
                          {isAlreadyComplete ? (
                            <button className="btn btn-gray"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 14, padding: '9px 32px' }}
                              onClick={() => {
                                setCompletedTaskIds(prev => prev.filter(id => id !== completeTaskId));
                                setPinnedTaskIds(prev => prev.includes(completeTaskId) ? prev : [...prev, completeTaskId]);
                                closeForm();
                              }}>
                              <Icon name="circle-x" size={16} color="currentColor" /> 完了を取り消す
                            </button>
                          ) : (
                            <button className="btn btn-yellow"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 14, padding: '9px 32px' }}
                              onClick={() => { toggleComplete(completeTaskId); closeForm(); }}>
                              <Icon name="circle-check" size={16} color="var(--accent-on)" /> このタスクを完了にする
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                );
              })()}
            </div>

            {/* ─── スクショOCR ─── */}
            <div className="section">
              <div className="section-title">
                <Icon name="camera" size={14} color="var(--accent)" /> スクショからタスク登録
                <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 6 }}>複数枚OK・ジャーナルに写っていないタスクを完了候補に</span>
              </div>

              {/* ドロップゾーン */}
              <div
                onDrop={e => { e.preventDefault(); setRaidOcrDragOver(false); if (e.dataTransfer.files.length) handleRaidOcrFiles(e.dataTransfer.files); }}
                onDragOver={e => { e.preventDefault(); setRaidOcrDragOver(true); }}
                onDragLeave={() => setRaidOcrDragOver(false)}
                style={{
                  border: `2px dashed ${raidOcrDragOver ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 8, padding: raidOcrFiles.length > 0 ? '12px 16px' : '20px 16px', textAlign: 'center',
                  background: raidOcrDragOver ? 'var(--info-bg)' : 'transparent',
                  transition: 'all 0.2s',
                }}
              >
                {raidOcrFiles.length === 0 ? (
                  <>
                    <div style={{ marginBottom: 6, display: 'flex', justifyContent: 'center' }}>
                      <Icon name="camera" size={28} color="var(--text-dim)" />
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>タスクジャーナルのスクショをドロップ（複数枚可）</div>
                    <div style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 4 }}>
                      <kbd style={{ background: 'var(--border)', borderRadius: 3, padding: '1px 5px' }}>Ctrl+V</kbd> でそのまま貼り付け可 ・ ゲーム言語は英語推奨
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', alignItems: 'flex-end' }}>
                    {raidOcrFiles.map((f, i) => (
                      <div key={i} style={{ position: 'relative', flexShrink: 0 }}>
                        <img src={f.url} alt={f.name}
                          style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--border)', display: 'block' }} />
                        <button
                          onClick={e => { e.stopPropagation(); setRaidOcrFiles(prev => prev.filter((_, j) => j !== i)); }}
                          style={{ position: 'absolute', top: -6, right: -6, background: 'var(--danger)', border: 'none', borderRadius: '50%', width: 18, height: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                          <Icon name="x" size={10} color="white" />
                        </button>
                        <div style={{ fontSize: 9, color: 'var(--text-dim)', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center', marginTop: 2 }}>{f.name}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <input id="raidOcrInput" type="file" accept=".jpg,.jpeg,.png" multiple style={{ display: 'none' }}
                onChange={e => { if (e.target.files.length) handleRaidOcrFiles(e.target.files); e.target.value = ''; }} />

              <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <button className="btn btn-gray" onClick={() => document.getElementById('raidOcrInput').click()}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <Icon name="download" size={13} color="currentColor" /> ファイルを選択
                </button>
                {raidOcrFiles.length > 0 && (<>
                  <button className="btn btn-yellow" onClick={runRaidOcr} disabled={raidOcrRunning}
                    style={{ minWidth: 130, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    {raidOcrRunning
                      ? <><Icon name="refresh" size={13} color="currentColor" style={{ animation: 'spin 1s linear infinite' }} /> OCR解析中… {raidOcrProgress}%</>
                      : <><Icon name="search" size={13} color="var(--accent-on)" /> {raidOcrFiles.length}枚を解析</>}
                  </button>
                  <button className="btn btn-gray" onClick={() => { setRaidOcrFiles([]); setRaidOcrMatches([]); setRaidCompleteCandidates([]); setRaidOcrProgress(0); }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <Icon name="x" size={13} color="currentColor" /> クリア
                  </button>
                  <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{raidOcrFiles.length}枚選択中</span>
                </>)}
              </div>
              {raidOcrRunning && (
                <div className="progress-bar" style={{ marginTop: 8 }}>
                  <div className="progress-fill" style={{ width: `${raidOcrProgress}%` }} />
                </div>
              )}

              {/* OCR認識結果 */}
              {raidOcrMatches.length > 0 && (() => {
                const allTasksForSearch = [...apiData.tasks, ...customTasks];
                const updateM = (i, patch) => setRaidOcrMatches(prev => prev.map((x, j) => j === i ? { ...x, ...patch } : x));
                return (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 'bold', color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <Icon name="clipboard-list" size={13} color="var(--accent)" /> 認識結果
                        <span style={{ fontWeight: 'normal', fontSize: 11, color: 'var(--text-secondary)', marginLeft: 4 }}>
                          ({raidOcrMatches.filter(m => m.checked && m.task).length}件追加予定)
                        </span>
                      </span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-gray btn-sm" onClick={() => setRaidOcrMatches(prev => prev.map(m => m.task ? { ...m, checked: true } : m))}>全選択</button>
                        <button className="btn btn-gray btn-sm" onClick={() => setRaidOcrMatches(prev => prev.map(m => ({ ...m, checked: false })))}>全解除</button>
                        <button className="btn btn-yellow btn-sm"
                          disabled={!raidOcrMatches.some(m => m.checked && m.task)}
                          onClick={addRaidOcrTasksToPinned}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Icon name="circle-check" size={12} color="var(--accent-on)" /> 進行タスクに追加
                        </button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {raidOcrMatches.map((m, i) => {
                        const searchResults = (m.inlineSearch || '').trim().length >= 1
                          ? allTasksForSearch.filter(t => (t.name || '').toLowerCase().includes(m.inlineSearch.toLowerCase())).slice(0, 8)
                          : [];
                        const updateObj = (oi, patch) => {
                          const newObjs = (m.inlineFormObjectives || []).map((o, j) => j === oi ? { ...o, ...patch } : o);
                          updateM(i, { inlineFormObjectives: newObjs });
                        };
                        const handleInlineFormSubmit = () => {
                          const name = (m.inlineFormName || '').trim();
                          if (!name) return;
                          const ts = Date.now();
                          const objectives = (m.inlineFormObjectives || []).map((o, oi) => {
                            const base = { id: `custom_obj_${ts}_${oi}`, maps: (o.maps || []).map(mn => ({ name: mn })), count: o.count || 1 };
                            if (o.catKey === 'collect') return { ...base, type: 'findItem', foundInRaid: true, item: { id: `custom_item_${ts}_${oi}`, name: o.itemName || '', iconLink: '' }, description: '' };
                            if (o.catKey === 'kill') return { ...base, type: 'kill', target: o.itemName || '', description: '' };
                            if (o.catKey === 'place') return { ...base, type: 'mark', markerItem: { name: o.itemName || '' }, description: '' };
                            if (o.catKey === 'extract') return { ...base, type: 'extract', description: o.itemName || '' };
                            if (o.catKey === 'locate') return { ...base, type: 'locate', description: o.itemName || '' };
                            return { ...base, type: 'findItem', foundInRaid: false, item: { id: `custom_item_${ts}_${oi}`, name: o.itemName || '', iconLink: '' }, description: '' };
                          });
                          const newTask = { id: 'custom_' + ts, name, trader: (m.inlineFormTrader || '').trim() ? { name: m.inlineFormTrader.trim() } : null, wikiLink: '', objectives };
                          saveCustomTasks([...customTasks, newTask]);
                          setPinnedTaskIds(prev => prev.includes(newTask.id) ? prev : [...prev, newTask.id]);
                          updateM(i, { task: newTask, checked: true, mode: 'match', inlineSearch: '', inlineFormName: '', inlineFormTrader: '', inlineFormObjectives: [] });
                        };
                        const isMatched = m.task && m.mode === 'match';
                        return (
                          <div key={i} style={{
                            background: isMatched ? 'var(--bg-primary)' : 'var(--danger-bg-faint)',
                            border: `1px solid ${isMatched ? 'var(--border)' : 'var(--danger-border-weak)'}`,
                            borderRadius: 6, padding: '7px 10px',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                              <input type="checkbox" checked={!!m.checked} disabled={!m.task}
                                onChange={e => updateM(i, { checked: e.target.checked })}
                                style={{ width: 16, height: 16, accentColor: 'var(--accent)', flexShrink: 0, marginTop: 3 }} />
                              {isMatched ? (
                                /* ── 照合済み：コンパクト表示 ── */
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                    {m.task.id.startsWith('custom_') && (
                                      <span style={{ fontSize: 10, color: 'var(--warn-text)', background: 'var(--warn-bg)', padding: '0 4px', borderRadius: 2, flexShrink: 0 }}>カスタム</span>
                                    )}
                                    {m.task.trader?.name && (
                                      <span style={{ fontSize: 11, color: 'var(--text-secondary)', flexShrink: 0 }}>{m.task.trader.name}</span>
                                    )}
                                    <span style={{ fontSize: 13, color: 'var(--text-primary)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.task.name}</span>
                                    {m.score > 0 && (
                                      <span style={{ fontSize: 10, color: m.score >= 0.8 ? 'var(--state-ok)' : 'var(--warn)', flexShrink: 0 }}>{Math.round(m.score * 100)}%</span>
                                    )}
                                    {m.task.id.startsWith('custom_') && (
                                      <button className="btn btn-gray btn-sm" style={{ padding: '1px 6px', fontSize: 10, flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 3 }}
                                        onClick={() => openCustomTaskEdit(m.task.id)} title="カスタムタスクを編集（全項目）">
                                        <Icon name="pencil" size={10} color="currentColor" /> 編集
                                      </button>
                                    )}
                                    <button className="btn btn-gray btn-sm" style={{ padding: '1px 6px', fontSize: 10, flexShrink: 0 }}
                                      onClick={() => updateM(i, { mode: 'search', inlineSearch: '' })}>
                                      変更
                                    </button>
                                  </div>
                                  <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>認識: {m.line}</div>
                                  {m.candidates.filter(c => c.task.id !== m.task.id).length > 0 && (
                                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center', marginTop: 4 }}>
                                      <span style={{ fontSize: 10, color: 'var(--text-dim)', flexShrink: 0 }}>他の候補:</span>
                                      {m.candidates.filter(c => c.task.id !== m.task.id).map(c => (
                                        <button key={c.task.id} className="btn btn-gray btn-sm"
                                          style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}
                                          onClick={() => updateM(i, { task: c.task, checked: true, score: c.score, mode: 'match' })}>
                                          {c.task.id.startsWith('custom_') && <span style={{ fontSize: 9, color: 'var(--warn-text)' }}>カスタム</span>}
                                          {c.task.name}
                                          <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>{Math.round(c.score * 100)}%</span>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                /* ── 未照合 / 変更モード ── */
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                    <Icon name="alert-triangle" size={12} color="var(--danger-text)" />
                                    <span style={{ fontSize: 12, color: 'var(--danger-text)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.line}</span>
                                    {m.task && (
                                      <button className="btn btn-gray btn-sm" style={{ padding: '1px 6px', fontSize: 10, flexShrink: 0 }}
                                        onClick={() => updateM(i, { mode: 'match' })}>キャンセル</button>
                                    )}
                                  </div>

                                  {/* 候補ボタン */}
                                  {m.candidates.length > 0 && m.mode !== 'form' && (
                                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center', marginBottom: 6 }}>
                                      <span style={{ fontSize: 10, color: 'var(--text-dim)', flexShrink: 0 }}>候補:</span>
                                      {m.candidates.slice(0, 4).map(c => (
                                        <button key={c.task.id} className="btn btn-gray btn-sm"
                                          style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}
                                          onClick={() => updateM(i, { task: c.task, checked: true, score: c.score, mode: 'match' })}>
                                          {c.task.id.startsWith('custom_') && <span style={{ fontSize: 9, color: 'var(--warn-text)' }}>カスタム</span>}
                                          {c.task.name}
                                          <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>{Math.round(c.score * 100)}%</span>
                                        </button>
                                      ))}
                                    </div>
                                  )}

                                  {m.mode !== 'form' ? (
                                    <>
                                      {/* インライン検索 */}
                                      <input type="text" value={m.inlineSearch || ''}
                                        placeholder="タスク名で検索（API・カスタム共通）..."
                                        onChange={e => updateM(i, { inlineSearch: e.target.value })}
                                        style={{ width: '100%', padding: '4px 8px', fontSize: 12, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-primary)', boxSizing: 'border-box' }} />
                                      {searchResults.length > 0 && (
                                        <div style={{ marginTop: 2, border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                                          {searchResults.map(t => (
                                            <div key={t.id}
                                              onClick={() => updateM(i, { task: t, checked: true, inlineSearch: '', mode: 'match' })}
                                              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', cursor: 'pointer', fontSize: 12, color: 'var(--text-primary)', background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-light)' }}
                                              onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-muted)'}
                                              onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-primary)'}>
                                              {t.id.startsWith('custom_') && (
                                                <span style={{ fontSize: 10, color: 'var(--warn-text)', background: 'var(--warn-bg)', padding: '0 3px', borderRadius: 2, flexShrink: 0 }}>カスタム</span>
                                              )}
                                              {t.trader?.name && <span style={{ fontSize: 10, color: 'var(--text-secondary)', flexShrink: 0 }}>{t.trader.name}</span>}
                                              <span style={{ flex: 1 }}>{t.name}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      {(m.inlineSearch || '').trim().length > 0 && searchResults.length === 0 && (
                                        <div style={{ marginTop: 2, fontSize: 11, color: 'var(--text-dim)', padding: '2px 8px' }}>「{m.inlineSearch}」は見つかりませんでした</div>
                                      )}
                                      <button className="btn btn-gray btn-sm"
                                        style={{ marginTop: 5, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                        onClick={() => updateM(i, { mode: 'form', inlineFormName: m.inlineSearch || m.line, inlineFormTrader: '', inlineSearch: '' })}>
                                        <Icon name="pencil" size={11} color="currentColor" /> カスタムタスクとして登録
                                      </button>
                                    </>
                                  ) : (
                                    /* インラインカスタムタスクフォーム */
                                    (() => {
                                      const inSty = { padding: '4px 8px', fontSize: 12, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-primary)' };
                                      const catOpts = [['collect','収集(FIR)'],['bring','持込'],['kill','倒す'],['place','設置'],['extract','脱出'],['locate','調査/特定']];
                                      const countBtnSty = { background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 4, width: 22, height: 22, cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' };
                                      return (
                                        <div style={{ padding: '8px 10px', background: 'var(--bg-primary)', border: '1px solid var(--warn)', borderRadius: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                          <div style={{ fontSize: 11, color: 'var(--warn-text)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                            <Icon name="pencil" size={11} color="var(--warn-text)" /> カスタムタスクとして登録
                                          </div>
                                          {/* タスク名 + トレーダー */}
                                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                            <input type="text" value={m.inlineFormName || ''}
                                              onChange={e => updateM(i, { inlineFormName: e.target.value })}
                                              placeholder="タスク名（必須）"
                                              style={{ flex: 1, minWidth: 140, ...inSty }} />
                                            <select value={m.inlineFormTrader || ''}
                                              onChange={e => updateM(i, { inlineFormTrader: e.target.value })}
                                              style={{ width: 130, ...inSty }}>
                                              <option value="">トレーダー（省略可）</option>
                                              {raidTraderNames.map(n => <option key={n} value={n}>{n}</option>)}
                                            </select>
                                          </div>
                                          {/* 目標リスト */}
                                          {(m.inlineFormObjectives || []).map((o, oi) => (
                                            <div key={oi} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: 5, padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                              <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                                                <select value={o.catKey} onChange={e => updateObj(oi, { catKey: e.target.value, itemName: '', count: 1 })}
                                                  style={{ ...inSty, padding: '3px 6px', width: 90 }}>
                                                  {catOpts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                                                </select>
                                                <input type="text" value={o.itemName || ''}
                                                  onChange={e => updateObj(oi, { itemName: e.target.value })}
                                                  placeholder={o.catKey === 'kill' ? 'ターゲット' : o.catKey === 'extract' ? '脱出ポイント' : o.catKey === 'locate' ? '場所・ポイント名' : 'アイテム名'}
                                                  style={{ flex: 1, minWidth: 80, ...inSty, padding: '3px 6px' }} />
                                                {['collect','bring','kill'].includes(o.catKey) && (
                                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                                                    <button style={countBtnSty} onClick={() => updateObj(oi, { count: Math.max(1, (o.count || 1) - 1) })}>−</button>
                                                    <span style={{ fontSize: 12, minWidth: 20, textAlign: 'center', color: 'var(--text-primary)' }}>{o.count || 1}</span>
                                                    <button style={countBtnSty} onClick={() => updateObj(oi, { count: (o.count || 1) + 1 })}>+</button>
                                                  </div>
                                                )}
                                                <button onClick={() => updateM(i, { inlineFormObjectives: (m.inlineFormObjectives || []).filter((_, j) => j !== oi) })}
                                                  style={{ ...countBtnSty, width: 18, height: 18 }}>
                                                  <Icon name="x" size={10} color="var(--danger)" />
                                                </button>
                                              </div>
                                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center' }}>
                                                <span style={{ fontSize: 10, color: 'var(--text-dim)', flexShrink: 0 }}>マップ:</span>
                                                {RAID_MAPS.map(mn => {
                                                  const sel = (o.maps || []).includes(mn);
                                                  return (
                                                    <button key={mn} onClick={() => {
                                                      const cur = o.maps || [];
                                                      updateObj(oi, { maps: sel ? cur.filter(x => x !== mn) : [...cur, mn] });
                                                    }} style={{ padding: '1px 5px', fontSize: 10, borderRadius: 3, border: '1px solid var(--border)', background: sel ? 'var(--accent)' : 'var(--bg-primary)', color: sel ? 'var(--accent-on)' : 'var(--text-dim)', cursor: 'pointer' }}>
                                                      {mn}
                                                    </button>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          ))}
                                          <button className="btn btn-gray btn-sm"
                                            style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                                            onClick={() => updateM(i, { inlineFormObjectives: [...(m.inlineFormObjectives || []), { catKey: 'collect', itemName: '', count: 1, maps: [] }] })}>
                                            + 目標を追加
                                          </button>
                                          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                            <button className="btn btn-gray btn-sm" onClick={() => updateM(i, { mode: 'search' })}>キャンセル</button>
                                            <button className="btn btn-yellow btn-sm"
                                              disabled={!(m.inlineFormName || '').trim()}
                                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                              onClick={handleInlineFormSubmit}>
                                              <Icon name="circle-check" size={11} color="var(--accent-on)" /> 登録して追加
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })()
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* 完了候補（進行中だがOCRに写っていなかったタスク） */}
              {raidCompleteCandidates.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 'bold', color: 'var(--state-ok)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <Icon name="circle-check" size={13} color="var(--state-ok)" /> 完了候補
                      <span style={{ fontWeight: 'normal', fontSize: 11, color: 'var(--text-secondary)', marginLeft: 4 }}>
                        ジャーナルに写っていない進行中タスク（{raidCompleteCandidates.filter(c => c.checked).length}件選択）
                      </span>
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                      <button className="btn btn-gray btn-sm" onClick={() => setRaidCompleteCandidates(prev => prev.map(c => ({ ...c, checked: true })))}>全選択</button>
                      <button className="btn btn-gray btn-sm" onClick={() => setRaidCompleteCandidates(prev => prev.map(c => ({ ...c, checked: false })))}>全解除</button>
                      {raidCompleteCandidates.some(c => c.checked) ? (
                        <button className="btn btn-yellow btn-sm"
                          onClick={bulkCompleteFromOcr}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Icon name="circle-check" size={12} color="var(--accent-on)" /> 選択したタスクを完了にする
                        </button>
                      ) : (
                        <button className="btn btn-gray btn-sm"
                          onClick={bulkCompleteFromOcr}
                          title="完了処理はせず、スクショ・認識結果・完了候補の表示を閉じます"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Icon name="x" size={12} color="currentColor" /> なにもしない
                        </button>
                      )}
                      <label style={{ fontSize: 11, color: 'var(--text-dim)', display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer', marginLeft: 4 }}>
                        <input type="checkbox" checked={ocrAutoNext} onChange={e => setOcrAutoNext(e.target.checked)} style={{ accentColor: 'var(--accent)' }} />
                        次タスク自動追加（APIが古い場合はOFF推奨）
                      </label>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {raidCompleteCandidates.map((c, i) => (
                      <div key={c.taskId} style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
                        background: 'var(--state-ok-bg-faint)', border: '1px solid var(--state-ok-border-weak)',
                        borderRadius: 6,
                      }}>
                        <input type="checkbox" checked={c.checked}
                          onChange={e => setRaidCompleteCandidates(prev => prev.map((x, j) => j === i ? { ...x, checked: e.target.checked } : x))}
                          style={{ width: 16, height: 16, accentColor: 'var(--accent)', flexShrink: 0 }} />
                        {c.traderName && <span style={{ fontSize: 10, color: 'var(--text-secondary)', flexShrink: 0, background: 'var(--bg-secondary)', padding: '1px 5px', borderRadius: 3 }}>{c.traderName}</span>}
                        <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{c.taskName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ─── 目標一覧 ─── */}
            {!raidMap ? (
              <div className="section" style={{ textAlign: 'center', padding: '24px 16px' }}>
                <Icon name="map" size={28} color="var(--text-dim)" />
                <div style={{ marginTop: 8, color: 'var(--text-dim)', fontSize: 13 }}>マップを選択すると、このマップでの目標が表示されます</div>
              </div>
            ) : activeTasks.length === 0 ? (
              <div className="section" style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--text-dim)', fontSize: 13 }}>
                進行タスクが登録されていません
              </div>
            ) : (
              <>
                <div style={{ padding: '6px 0 4px', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="map-pin" size={14} color="var(--accent)" />
                  <span style={{ color: 'var(--accent)' }}>{raidMap}</span> での目標
                </div>

                {/* ─── マップ可視化（ピン） ─── */}
                <MapPinVisual mapName={raidMap} mapImages={mapImages} ensureMapImageRegistered={ensureMapImageRegistered}
                  pins={taskPins.filter(p => p.mapName === raidMap)}
                  allTasks={activeTasks /* 現モードの進行中（pinnedTaskIds）かつ未完了のタスクのみ。ピン座標はグローバルだが表示はモードごと */}
                  onToggleCheck={toggleObjCheck}
                  isChecked={isObjChecked}
                  onOpenTask={setRaidDetailTask} />

                {/* 収集セクション表示切替 */}
                {(grpSpec.collect.length + grpAny.collect.length > 0) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-dim)', marginRight: 2 }}>収集一覧:</span>
                    {[{ k: 'normal', l: '1列' }, { k: '2col', l: '2列' }, { k: '3col', l: '3列' }, { k: 'hidden', l: '非表示' }].map(m => (
                      <button key={m.k}
                        className={`btn btn-sm ${collectViewMode === m.k ? 'btn-yellow' : 'btn-gray'}`}
                        style={{ padding: '1px 7px', fontSize: 10 }}
                        onClick={() => setCollectViewMode(m.k)}>{m.l}</button>
                    ))}
                  </div>
                )}

                {renderSection('持ち込むもの', 'backpack', 'var(--info)', grpSpec.bring)}
                {renderCollectSection('収集するもの（FIR）', grpSpec.collect)}
                {renderSection('設置・マーキング', 'download', 'var(--accent)', grpSpec.place)}
                {renderSection('倒すもの', 'skull', 'var(--danger)', grpSpec.kill)}
                {renderSection('脱出', 'arrow-right', 'var(--state-ok)', grpSpec.extract)}
                {renderSection('調査・特定', 'search', 'var(--info)', grpSpec.locate)}

                {raidObjectives.specific.length === 0 && (
                  <div className="section" style={{ color: 'var(--text-dim)', fontSize: 13, textAlign: 'center', padding: '16px' }}>
                    {raidMap} 固有の目標はありません
                  </div>
                )}

                {/* どのマップでもOK */}
                {raidObjectives.anywhere.filter(x => x.cat !== 'place').length > 0 && (
                  <details style={{ marginTop: 4 }}>
                    <summary style={{
                      cursor: 'pointer', padding: '8px 12px',
                      background: 'var(--bg-secondary)', borderRadius: 6,
                      fontSize: 13, color: 'var(--text-secondary)',
                      listStyle: 'none', display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                      <Icon name="globe" size={13} color="var(--text-secondary)" />
                      どのマップでもOKな目標 ({raidObjectives.anywhere.filter(x => x.cat !== 'place').length}件) — このレイドでも消化できます
                    </summary>
                    <div style={{ marginTop: 4 }}>
                      {renderSection('持ち込むもの', 'backpack', 'var(--info)', grpAny.bring)}
                      {renderCollectSection('収集するもの（FIR）', grpAny.collect)}
                      {renderSection('設置・マーキング', 'download', 'var(--accent)', grpAny.place)}
                      {renderSection('倒すもの', 'skull', 'var(--danger)', grpAny.kill)}
                      {renderSection('脱出', 'arrow-right', 'var(--state-ok)', grpAny.extract)}
                      {renderSection('調査・特定', 'search', 'var(--info)', grpAny.locate)}
                    </div>
                  </details>
                )}
              </>
            )}
            {/* ─── タスク詳細ポップアップ ─── */}
            {raidDetailTask && (() => {
              const t = raidDetailTask;
              const isCompleted = completedTaskIds.includes(t.id);
              const isPinned = pinnedTaskIds.includes(t.id);
              const getCatLabelLocal = (obj) => {
                if (obj.type === 'findItem') return obj.foundInRaid ? '収集(FIR)' : '持込';
                if (obj.type === 'giveItem') return '持込';
                if (obj.type === 'findQuestItem') return '収集(FIR)';
                if (obj.type === 'kill' || obj.type === 'shoot') return '倒す';
                if (obj.type === 'mark' || obj.type === 'plantItem') return '設置';
                if (obj.type === 'extract') return '脱出';
                if (obj.type === 'locate' || obj.type === 'visit') return '調査';
                return '';
              };
              const getObjText = (obj) => {
                if (obj.item?.name) return obj.item.name;
                if (obj.questItem?.name) return obj.questItem.name;
                if (obj.itemCategory?.name) return `${catJa(obj.itemCategory.name)} カテゴリ`;
                if (obj.target) return obj.target;
                if (obj.markerItem?.name) return obj.markerItem.name;
                return obj.description || '';
              };
              const visibleObjs = (t.objectives || []).filter(o => !['taskStatus','experience'].includes(o.type));
              return (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
                  onClick={e => { if (e.target === e.currentTarget) setRaidDetailTask(null); }}>
                  <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 20px', maxWidth: 480, width: '100%', maxHeight: '80vh', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* ヘッダー */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                          {t.trader?.name && (
                            <span style={{ fontSize: 11, color: 'var(--text-dim)', background: 'var(--bg-primary)', padding: '1px 6px', borderRadius: 3 }}>{t.trader.name}</span>
                          )}
                          {t.id.startsWith('custom_') && (
                            <span style={{ fontSize: 10, color: 'var(--warn-text)', background: 'var(--warn-bg)', padding: '1px 5px', borderRadius: 3 }}>カスタム</span>
                          )}
                          {isCompleted && (
                            <span style={{ fontSize: 10, color: 'var(--state-ok)', background: 'var(--state-ok-bg-faint)', padding: '1px 5px', borderRadius: 3 }}>完了済み</span>
                          )}
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--text-primary)', lineHeight: 1.3 }}>{t.name}</div>
                      </div>
                      <button onClick={() => setRaidDetailTask(null)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0 }}>
                        <Icon name="x" size={18} color="var(--text-secondary)" />
                      </button>
                    </div>
                    {/* 目標リスト */}
                    <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {visibleObjs.length === 0 ? (
                        <div style={{ fontSize: 12, color: 'var(--text-dim)', padding: '8px 0' }}>目標情報がありません</div>
                      ) : visibleObjs.map((obj, oi) => {
                        const maps = (obj.maps || []).map(m => m.name);
                        const parts = obj.bodyParts?.length ? `(${obj.bodyParts.join('/')})` : '';
                        const dist = obj.distance ? `${obj.distance.compareMethod}${obj.distance.value}m` : '';
                        const popupChecked = isObjChecked(t.id, obj);
                        return (
                          <div key={obj.id || oi} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', background: 'var(--bg-primary)', borderRadius: 5, fontSize: 12, opacity: popupChecked ? 0.4 : 1, transition: 'opacity 0.15s' }}>
                            <input type="checkbox" checked={popupChecked} onChange={() => toggleObjCheck(t.id, obj)}
                              style={{ width: 15, height: 15, accentColor: 'var(--state-ok)', flexShrink: 0, cursor: 'pointer' }} />
                            {obj.item?.iconLink ? (
                              <img src={obj.item.iconLink} alt="" style={{ width: 24, height: 24, objectFit: 'contain', flexShrink: 0 }} onError={e => { e.target.style.display='none'; }} />
                            ) : obj.markerItem?.iconLink ? (
                              <img src={obj.markerItem.iconLink} alt="" style={{ width: 24, height: 24, objectFit: 'contain', flexShrink: 0 }} onError={e => { e.target.style.display='none'; }} />
                            ) : null}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ color: 'var(--text-primary)' }}>
                                {getObjText(obj)}{obj.count > 1 ? ` ×${obj.count}` : ''}{parts ? ` ${parts}` : ''}{dist ? ` ${dist}` : ''}
                              </div>
                              {obj.description && getObjText(obj) !== obj.description && (
                                <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 1 }}>{obj.description}</div>
                              )}
                              {maps.length > 0 && (
                                <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 1 }}>{maps.join(' / ')}</div>
                              )}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
                              <span style={{ fontSize: 10, color: 'var(--text-dim)', background: 'var(--bg-secondary)', padding: '1px 5px', borderRadius: 3 }}>{getCatLabelLocal(obj)}</span>
                              {obj.foundInRaid && (
                                <span style={{ fontSize: 9, color: 'var(--warn-text)', background: 'var(--warn-bg)', border: '1px solid var(--warn)', padding: '0 3px', borderRadius: 3 }}>FIR</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {/* アクション */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', paddingTop: 8, borderTop: '1px solid var(--border-light)', flexWrap: 'wrap' }}>
                      {t.wikiLink && (
                        <a href={t.wikiLink} target="_blank" rel="noopener noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>
                          <Icon name="link" size={12} color="var(--accent)" /> Wiki
                        </a>
                      )}
                      {raidObjChecked[t.id] && Object.keys(raidObjChecked[t.id]).length > 0 && (
                        <button className="btn btn-gray btn-sm"
                          onClick={() => setRaidObjChecked(prev => { const n = { ...prev }; delete n[t.id]; return n; })}>
                          チェックをリセット
                        </button>
                      )}
                      <div style={{ flex: 1 }} />
                      {!isPinned && !isCompleted && (
                        <button className="btn btn-gray btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          onClick={() => setPinnedTaskIds(prev => prev.includes(t.id) ? prev : [...prev, t.id])}>
                          <Icon name="circle-check" size={12} color="var(--state-ok)" /> 進行中に追加
                        </button>
                      )}
                      {isCompleted ? (
                        <button className="btn btn-gray btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          onClick={() => {
                            setCompletedTaskIds(prev => prev.filter(id => id !== t.id));
                            setPinnedTaskIds(prev => prev.includes(t.id) ? prev : [...prev, t.id]);
                            setRaidDetailTask(null);
                          }}>
                          <Icon name="circle-x" size={12} color="var(--text-secondary)" /> 完了を取り消す
                        </button>
                      ) : (
                        <button className="btn btn-yellow btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          onClick={() => { toggleComplete(t.id); setRaidDetailTask(null); }}>
                          <Icon name="circle-check" size={12} color="var(--accent-on)" /> 完了にする
                        </button>
                      )}
                      <button className="btn btn-gray btn-sm" onClick={() => setRaidDetailTask(null)}>閉じる</button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        );
      })()}

