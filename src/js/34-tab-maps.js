      {/* ===== TAB: マップ ===== */}
      {activeTab === 'maps' && (() => {
        const ALL_MAP_NAMES = Object.keys(RAID_MAP_IMAGE_FILES);
        const selected = mapsSelectedMap || ALL_MAP_NAMES[0];
        const meta = mapImages[selected];

        // 選択マップのタスク目標（完了済みタスク除外）
        const allTasks = [...(apiData?.tasks || []), ...(customTasks || [])];
        const tasksForMap = [];
        allTasks.forEach(task => {
          if (!pinnedTaskIds.includes(task.id)) return;
          if (completedTaskIds.includes(task.id)) return;
          (task.objectives || []).forEach(obj => {
            if ((obj.maps || []).some(m => m.name === selected)) {
              tasksForMap.push({ task, obj });
            }
          });
        });

        const pinnedForMap = taskPins.filter(p => p.mapName === selected);
        // objectiveId → [pin, ...] のマップ（複数スポーン対応）
        const pinsByObjId  = {};
        pinnedForMap.forEach(pin => {
          (pinsByObjId[pin.objectiveId] = pinsByObjId[pin.objectiveId] || []).push(pin);
        });
        const pinnedObjIds = new Set(Object.keys(pinsByObjId));

        const unpinned = tasksForMap.filter(({ task, obj }) => {
          if (pinnedObjIds.has(obj.id)) return false;
          const objKey = obj.id || (task.id + obj.type + (obj.item?.id || obj.questItem?.id || obj.target || ''));
          return !raidObjChecked[task.id]?.[objKey];
        });
        const pinned   = tasksForMap.filter(({ obj }) =>  pinnedObjIds.has(obj.id));

        // isPlacing && isPendingCoord = ステージングモード（位置確認中）
        const isPendingCoord  = !!mapsPendingPinCoords;
        const isPlacing       = !!mapsPlacingObjective;
        const isRepositioning = !!mapsRepositioningPinId;
        const isStaging       = isPlacing && isPendingCoord;
        const isReverseFlow   = isPendingCoord && !isPlacing;
        const cursorStyle     = (isPlacing || isRepositioning || isPendingCoord) ? 'crosshair' : 'default';

        const getCat = (obj) => {
          if (obj.type === 'findItem' && obj.foundInRaid) return 'collect';
          if (obj.type === 'findQuestItem') return 'collect';
          if (obj.type === 'findItem' || obj.type === 'giveItem') return 'bring';
          if (obj.type === 'kill' || obj.type === 'shoot') return 'kill';
          if (obj.type === 'mark' || obj.type === 'plantItem') return 'place';
          if (obj.type === 'extract') return 'extract';
          return 'locate';
        };

        const CAT_ORDER = ['collect', 'bring', 'place', 'kill', 'extract', 'locate'];
        const CAT_LABEL = {
          collect: '収集（FIR）',
          bring:   '持込・納品',
          place:   '設置・マーキング',
          kill:    '倒すもの',
          extract: '脱出',
          locate:  '調査・特定',
        };

        // ドラッグ・パン
        const clpV = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
        const handleInnerMouseDown = (e) => {
          if (isPlacing || isRepositioning || isPendingCoord) return;
          if (e.button !== 0) return;
          e.preventDefault();
          const { panX, panY } = mapsViewportRef.current;
          mapsDragRef.current = { startX: e.clientX, startY: e.clientY, startPanX: panX, startPanY: panY, hasMoved: false };
          setMapsIsDragging(true);
        };
        const handleInnerMouseMove = (e) => {
          if (!mapsDragRef.current) return;
          const dx = e.clientX - mapsDragRef.current.startX;
          const dy = e.clientY - mapsDragRef.current.startY;
          if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
            mapsDragRef.current.hasMoved = true;
            mapsWasDraggingRef.current = true;
          }
          if (!mapsDragRef.current.hasMoved) return;
          const inner = mapsInnerContainerRef.current;
          if (!inner) return;
          const { zoom } = mapsViewportRef.current;
          const cw = inner.offsetWidth;
          const ch = inner.offsetHeight;
          const newPanX = clpV(mapsDragRef.current.startPanX + dx, cw * (1 - zoom), 0);
          const newPanY = clpV(mapsDragRef.current.startPanY + dy, ch * (1 - zoom), 0);
          mapsViewportRef.current = { zoom, panX: newPanX, panY: newPanY };
          setMapsPanX(newPanX); setMapsPanY(newPanY);
        };
        const handleInnerMouseUp = () => {
          mapsDragRef.current = null;
          setMapsIsDragging(false);
        };

        // 地図クリック
        const handleMapClick = (e) => {
          if (mapsWasDraggingRef.current) { mapsWasDraggingRef.current = false; return; }
          const rect = e.currentTarget.getBoundingClientRect();
          const x = Math.round((e.clientX - rect.left) / rect.width  * meta.width);
          const y = Math.round((e.clientY - rect.top)  / rect.height * meta.height);

          if (isPlacing) {
            // ステージングモードへ（クリックするたびに仮ピン移動）
            setMapsPendingPinCoords({ x, y });
            return;
          }
          if (isRepositioning) {
            updateTaskPinPosition(mapsRepositioningPinId, x, y);
            setMapsRepositioningPinId(null);
            return;
          }
          // 逆順フロー：仮ピン
          setMapsPendingPinCoords({ x, y });
          setMapsPendingSearch('');
        };

        // ステージングモード確定（新規ピン追加）
        const confirmPlacement = () => {
          if (!mapsPlacingObjective || !mapsPendingPinCoords) return;
          addTaskPin(selected, mapsPlacingObjective.taskId, mapsPlacingObjective.objectiveId,
            mapsPendingPinCoords.x, mapsPendingPinCoords.y);
          setMapsPlacingObjective(null);
          setMapsPendingPinCoords(null);
        };

        // 逆順フロー：候補選択
        const handlePendingSelect = ({ task, obj }) => {
          if (!mapsPendingPinCoords) return;
          addTaskPin(selected, task.id, obj.id, mapsPendingPinCoords.x, mapsPendingPinCoords.y);
          setMapsPendingPinCoords(null);
          setMapsPendingSearch('');
        };

        const cancelAll = () => {
          setMapsPlacingObjective(null);
          setMapsRepositioningPinId(null);
          setMapsPendingPinCoords(null);
          setMapsPendingSearch('');
        };

        const filteredPending = mapsPendingSearch
          ? unpinned.filter(({ task, obj }) =>
              task.name.includes(mapsPendingSearch) || objDisplayName(obj).includes(mapsPendingSearch))
          : unpinned;

        // タスク名クリックボタン（ポップアップを開く）
        const taskNameBtn = (task) => (
          <button
            onClick={() => setMapsDetailTask(task)}
            style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer',
              textDecoration: 'underline dotted', padding: 0, maxWidth: 200, overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>
            {task.name}
          </button>
        );

        // 目標行（ピン未登録・登録済み共通テンプレート）
        const objRow = ({ task, obj }, header, pinRows) => (
          <div key={obj.id} className="mapreg-task-row" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', width: '100%', gap: 8, alignItems: 'flex-start' }}>
              <Icon name={CAT_ICON[getCat(obj)] || 'map-pin'} size={13} color={CAT_COLOR[getCat(obj)] || 'var(--accent)'} style={{ marginTop: 3, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                  <span style={{ color: 'var(--text-primary)', fontSize: 13 }}>
                    {objDisplayName(obj)}{obj.count > 1 ? ` ×${obj.count}` : ''}
                  </span>
                  {taskNameBtn(task)}
                  {task.trader?.name && (
                    <span style={{ fontSize: 10, color: 'var(--text-dim)', background: 'var(--bg-primary)', padding: '1px 5px', borderRadius: 3 }}>
                      {task.trader.name}
                    </span>
                  )}
                </div>
                {obj.description && obj.description !== objDisplayName(obj) && (
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.35, marginTop: 3 }}>
                    {obj.description}
                  </div>
                )}
              </div>
              {header}
            </div>
            {pinRows}
          </div>
        );

        // ─── ピンの詳細位置画像（スクショ貼り付け・省略名「画像N」で登録）───
        const addPinImage = (pinId, file) => {
          imageFileToPhotoDataUrl(file)
            .then(dataUrl => updatePinMeta(pinId, p => {
              const imgs = p.memoImages || [];
              let n = imgs.length + 1;
              while (imgs.some(m => m.name === `画像${n}`)) n++;
              return { memoImages: [...imgs, { id: `pimg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, name: `画像${n}`, dataUrl }] };
            }))
            .catch(err => alert(err.message));
        };

        // ─── タスク品 登録/編集 ───
        const openItemForm = ({ editId = null, name = '', shortName = '', iconLink = '', attachPinId = null } = {}) => {
          setMapsItemForm({ editId, name, shortName, iconLink, attachPinId, error: '' });
        };
        const loadItemImage = (file) => {
          imageFileToIconDataUrl(file)
            .then(url => setMapsItemForm(f => f && { ...f, iconLink: url, error: '' }))
            .catch(err => setMapsItemForm(f => f && { ...f, error: err.message }));
        };
        const saveItemForm = () => {
          const f = mapsItemForm;
          if (!f || !f.name.trim()) { setMapsItemForm(x => ({ ...x, error: 'アイテム名を入力してください' })); return; }
          if (f.editId) {
            updateCustomItem(f.editId, { name: f.name.trim(), shortName: f.shortName.trim(), iconLink: f.iconLink });
          } else {
            const item = addCustomItem(f);
            const pin = f.attachPinId && taskPins.find(p => p.id === f.attachPinId);
            if (pin) {
              updatePinMeta(pin.id, { requiredItems: [...(pin.requiredItems || []),
                { id: item.id, name: item.name, shortName: item.shortName, custom: true }] });
            }
            setMapsPinItemSearch('');
          }
          setMapsItemForm(null);
        };
        const itemFormModal = mapsItemForm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1100,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
            onClick={e => { if (e.target === e.currentTarget) setMapsItemForm(null); }}>
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10,
              padding: '16px 18px', maxWidth: 420, width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 'bold', color: 'var(--text-primary)' }}>
                <Icon name="package" size={15} color="var(--info)" />
                {mapsItemForm.editId ? 'タスク品を編集' : 'タスク品を登録'}
                <div style={{ flex: 1 }} />
                <button onClick={() => setMapsItemForm(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                  <Icon name="x" size={16} color="var(--text-secondary)" />
                </button>
              </div>
              {mapsItemForm.attachPinId && !mapsItemForm.editId && (
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>登録後、編集中のピンの必要アイテムに追加されます。</div>
              )}
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                {/* 画像（クリックで選択・ドロップ・Ctrl+V 貼り付け） */}
                <label
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); const file = e.dataTransfer.files?.[0]; if (file) loadItemImage(file); }}
                  title="Ctrl+V でスクリーンショットを貼り付け（ドロップ・クリックで選択も可）"
                  style={{ width: 96, height: 96, flexShrink: 0, borderRadius: 6, cursor: 'pointer',
                    border: '1px dashed var(--border)', background: 'var(--bg-primary)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                    overflow: 'hidden', position: 'relative' }}>
                  {mapsItemForm.iconLink ? (
                    <img src={mapsItemForm.iconLink} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  ) : (
                    <>
                      <Icon name="camera" size={22} color="var(--text-dim)" />
                      <span style={{ fontSize: 9, color: 'var(--text-dim)', textAlign: 'center', lineHeight: 1.3 }}>Ctrl+V で貼り付け<br />ドロップ / クリック</span>
                    </>
                  )}
                  <input type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => { const file = e.target.files?.[0]; if (file) loadItemImage(file); e.target.value = ''; }} />
                </label>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 2 }}>アイテム名（必須）</div>
                    <input type="text" value={mapsItemForm.name} autoFocus placeholder="例：Secure Flash drive"
                      onChange={e => setMapsItemForm(f => ({ ...f, name: e.target.value, error: '' }))}
                      onKeyDown={e => { if (e.key === 'Enter') saveItemForm(); }}
                      style={{ width: '100%', fontSize: 12, padding: '4px 7px', borderRadius: 4, boxSizing: 'border-box',
                        border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 2 }}>短縮名（任意・チップ表示用）</div>
                    <input type="text" value={mapsItemForm.shortName} placeholder="例：Flash"
                      onChange={e => setMapsItemForm(f => ({ ...f, shortName: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') saveItemForm(); }}
                      style={{ width: '100%', fontSize: 12, padding: '4px 7px', borderRadius: 4, boxSizing: 'border-box',
                        border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                  </div>
                  {mapsItemForm.iconLink && (
                    <button className="btn btn-sm btn-gray" style={{ alignSelf: 'flex-start', fontSize: 10, padding: '1px 7px' }}
                      onClick={() => setMapsItemForm(f => ({ ...f, iconLink: '' }))}>
                      画像を外す
                    </button>
                  )}
                </div>
              </div>
              {mapsItemForm.error && (
                <div style={{ fontSize: 11, color: 'var(--danger-text)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Icon name="alert-triangle" size={11} color="var(--danger-text)" /> {mapsItemForm.error}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-gray btn-sm" onClick={() => setMapsItemForm(null)}>キャンセル</button>
                <button className="btn btn-yellow btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }} onClick={saveItemForm}>
                  <Icon name="circle-check" size={12} color="var(--accent-on)" /> 保存
                </button>
              </div>
            </div>
          </div>
        );

        // タスク品の管理セクション（一覧・編集・削除）
        const itemManagerSection = (
          <div className="section" style={{ marginTop: 8 }}>
            <div className="section-title" style={{ marginBottom: mapsItemMgrOpen ? 8 : 0, cursor: 'pointer' }}
              onClick={() => setMapsItemMgrOpen(o => !o)}>
              <Icon name={mapsItemMgrOpen ? 'chevron-down' : 'chevron-right'} size={13} color="var(--text-dim)" />
              <Icon name="package" size={14} color="var(--info)" /> 登録タスク品 ({customItems.length}件)
              <span style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 'normal' }}>アイテム一覧に無いタスク品を名前と画像で登録し、ピンの必要アイテムに紐づけ</span>
              <div style={{ flex: 1 }} />
              <button className="btn btn-sm btn-yellow" style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}
                onClick={e => { e.stopPropagation(); openItemForm(); }}>
                <Icon name="plus" size={11} color="var(--accent-on)" /> 新規登録
              </button>
            </div>
            {mapsItemMgrOpen && (customItems.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>登録済みのタスク品はありません。</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 6 }}>
                {customItems.map(c => {
                  const usedPins = taskPins.filter(p => p.requiredItems?.some(i => i.id === c.id));
                  return (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
                      background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 5 }}>
                      <div style={{ width: 40, height: 40, flexShrink: 0, borderRadius: 4, background: 'var(--bg-secondary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {c.iconLink
                          ? <img src={c.iconLink} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                          : <Icon name="package" size={18} color="var(--text-dim)" />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                          {c.shortName ? `${c.shortName} · ` : ''}ピン {usedPins.length}件
                          {usedPins.length > 0 && ` (${[...new Set(usedPins.map(p => p.mapName))].join(' / ')})`}
                        </div>
                      </div>
                      <button className="btn btn-sm btn-gray" style={{ padding: '2px 5px', display: 'inline-flex' }} title="編集"
                        onClick={() => openItemForm({ editId: c.id, name: c.name, shortName: c.shortName || '', iconLink: c.iconLink || '' })}>
                        <Icon name="pencil" size={11} color="currentColor" />
                      </button>
                      <button className="btn btn-sm" title="削除"
                        style={{ padding: '2px 5px', display: 'inline-flex', background: 'var(--danger-bg)', border: '1px solid var(--danger)' }}
                        onClick={() => {
                          if (confirm(`「${c.name}」を削除しますか？${usedPins.length ? `\n紐づいているピン ${usedPins.length}件 からも外れます。` : ''}`)) removeCustomItem(c.id);
                        }}>
                        <Icon name="trash" size={11} color="var(--danger-text)" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        );

        // ─── タスク詳細ポップアップ ───
        const detailPopup = mapsDetailTask && (() => {
          const t = mapsDetailTask;
          const CATEGORY_JA_LOCAL = {
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
          const catJaLocal = (name) => name ? (CATEGORY_JA_LOCAL[name] || name) : name;
          const getCatLabel = (obj) => {
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
            if (obj.itemCategory?.name) return `${catJaLocal(obj.itemCategory.name)} カテゴリ`;
            if (obj.target) return obj.target;
            if (obj.markerItem?.name) return obj.markerItem.name;
            return obj.description || '';
          };
          const getObjKey = (taskId, obj) => obj.id || (taskId + obj.type + (obj.item?.id || obj.questItem?.id || obj.target || ''));
          const isObjChecked  = (taskId, obj) => !!(raidObjChecked[taskId]?.[getObjKey(taskId, obj)]);
          const toggleObjCheck = (taskId, obj) => {
            const k = getObjKey(taskId, obj);
            setRaidObjChecked(prev => {
              const tc = { ...(prev[taskId] || {}) };
              if (tc[k]) delete tc[k]; else tc[k] = true;
              return { ...prev, [taskId]: tc };
            });
          };
          const isCompleted = completedTaskIds.includes(t.id);
          const isPinned    = pinnedTaskIds.includes(t.id);
          const visibleObjs = (t.objectives || []).filter(o => !['taskStatus', 'experience'].includes(o.type));
          return (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
              onClick={e => { if (e.target === e.currentTarget) setMapsDetailTask(null); }}>
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10,
                padding: '18px 20px', maxWidth: 540, width: '100%', maxHeight: '85vh',
                display: 'flex', flexDirection: 'column', gap: 12 }}>
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
                  <button onClick={() => setMapsDetailTask(null)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0 }}>
                    <Icon name="x" size={18} color="var(--text-secondary)" />
                  </button>
                </div>

                {/* 目標リスト */}
                <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {visibleObjs.length === 0 ? (
                    <div style={{ fontSize: 12, color: 'var(--text-dim)', padding: '8px 0' }}>目標情報がありません</div>
                  ) : visibleObjs.map((obj, oi) => {
                    const maps = (obj.maps || []).map(m => m.name);
                    const parts = obj.bodyParts?.length ? `(${obj.bodyParts.join('/')})` : '';
                    const dist  = obj.distance ? `${obj.distance.compareMethod}${obj.distance.value}m` : '';
                    const popupChecked = isObjChecked(t.id, obj);
                    const isOnCurrentMap = maps.includes(selected);
                    const existingPins = pinsByObjId[obj.id] || [];
                    return (
                      <div key={obj.id || oi} style={{ padding: '6px 8px',
                        background: 'var(--bg-primary)', borderRadius: 5, fontSize: 12,
                        border: isOnCurrentMap ? '1px solid var(--border-light)' : '1px solid transparent' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8,
                          opacity: popupChecked ? 0.4 : 1, transition: 'opacity 0.15s' }}>
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
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
                            <span style={{ fontSize: 10, color: 'var(--text-dim)', background: 'var(--bg-secondary)', padding: '1px 5px', borderRadius: 3 }}>{getCatLabel(obj)}</span>
                            {obj.foundInRaid && (
                              <span style={{ fontSize: 9, color: 'var(--warn-text)', background: 'var(--warn-bg)', border: '1px solid var(--warn)', padding: '0 3px', borderRadius: 3 }}>FIR</span>
                            )}
                          </div>
                        </div>
                        {/* 現在選択中マップのピン操作 */}
                        {isOnCurrentMap && !isCompleted && (
                          <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--border-light)',
                            display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                            <Icon name="map-pin" size={10} color="var(--text-dim)" />
                            <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                              {selected} — ピン {existingPins.length}件
                            </span>
                            {existingPins.map((pin, pi) => (
                              <button key={pin.id} className="btn btn-sm btn-gray"
                                style={{ fontSize: 9, padding: '1px 6px', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                                onClick={() => {
                                  setMapsDetailTask(null);
                                  setMapsRepositioningPinId(pin.id);
                                }}>
                                <Icon name="map-pin" size={9} color="var(--text-secondary)" />
                                ピン{pi + 1}を再配置
                              </button>
                            ))}
                            <button className="btn btn-sm btn-yellow"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9, padding: '1px 6px' }}
                              onClick={() => {
                                setMapsDetailTask(null);
                                cancelAll();
                                setMapsPlacingObjective({ taskId: t.id, objectiveId: obj.id });
                              }}>
                              <Icon name="map-pin" size={9} color="var(--accent-on)" />
                              {existingPins.length > 0 ? 'ピンを追加' : 'ピンを設置'}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* アクション */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', paddingTop: 8,
                  borderTop: '1px solid var(--border-light)', flexWrap: 'wrap' }}>
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
                  {!isCompleted && isPinned && (
                    <button className="btn btn-gray btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4,
                        color: 'var(--danger-text)', borderColor: 'var(--danger)', background: 'var(--danger-bg-faint)' }}
                      onClick={() => setPinnedTaskIds(prev => prev.filter(id => id !== t.id))}>
                      <Icon name="x" size={12} color="var(--danger-text)" />
                      進行中から外す
                    </button>
                  )}
                  {!isCompleted && (
                    <button className="btn btn-yellow btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      onClick={() => {
                        setCompletedTaskIds(prev => [...prev, t.id]);
                        setMapsDetailTask(null);
                      }}>
                      <Icon name="circle-check" size={12} color="var(--accent-on)" />
                      完了にする
                    </button>
                  )}
                  <button className="btn btn-gray btn-sm" onClick={() => setMapsDetailTask(null)}>閉じる</button>
                </div>
              </div>
            </div>
          );
        })();

        return (
          <div ref={mapsContainerRef}>
            {/* マップ選択バー */}
            <div className="section">
              <div className="section-title"><Icon name="map" size={14} color="var(--accent)" /> マップ選択</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {ALL_MAP_NAMES.map(m => (
                  <button key={m}
                    className={`btn btn-sm ${selected === m ? 'btn-yellow' : 'btn-gray'}`}
                    onClick={() => { setMapsSelectedMap(m); cancelAll(); setMapsLoadFailed(prev => ({ ...prev, [m]: false })); }}>
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* マップ表示エリア */}
            {mapsLoadFailed[selected] ? (
              <div className="section" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dim)', fontSize: 13 }}>
                <Icon name="alert-triangle" size={20} color="var(--warn)" />
                <div style={{ marginTop: 6 }}>{selected} のマップ画像が未登録です。</div>
                <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.6 }}>
                  地図画像は <a href={MAP_IMAGE_SOURCE_URL} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>REƎMR EFTMAPS</a> から無料で入手できます。<br />
                  ダウンロードした画像を、下の「画像を差し替え」から登録してください。
                </div>
                <div style={{ marginTop: 4, fontSize: 10 }}>Maps by REƎMR — CC BY-NC-SA 4.0</div>
                <button className="btn btn-gray" style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                  onClick={() => {
                    setMapsLoadFailed(prev => ({ ...prev, [selected]: false }));
                    ensureMapImageRegistered(selected).then(r => { if (!r) setMapsLoadFailed(prev => ({ ...prev, [selected]: true })); });
                  }}>
                  <Icon name="refresh" size={12} color="var(--text-secondary)" /> 再試行
                </button>
              </div>
            ) : meta ? (
              <div ref={mapsInnerContainerRef} style={{ position: 'relative', marginBottom: 12, border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
                {/* 操作モード案内（ズームに追従しない固定オーバーレイ） */}
                {(isPlacing || isRepositioning || isReverseFlow) && (
                  <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', zIndex: 10,
                    background: 'rgba(0,0,0,0.78)', color: 'var(--accent)', fontSize: 12, padding: '6px 14px',
                    borderRadius: 20, border: '1px solid var(--accent)', whiteSpace: 'nowrap',
                    display: 'flex', alignItems: 'center', gap: 10, pointerEvents: 'auto' }}>
                    {isStaging
                      ? '地図をクリックして位置を調整'
                      : isPlacing ? '地図をクリックしてピンを設置'
                      : isRepositioning ? '新しい位置をクリック'
                      : '下のリストで紐づける目標を選択'}
                    {isStaging && (
                      <button onClick={confirmPlacement}
                        style={{ fontSize: 11, fontWeight: 'bold', color: 'var(--accent-on)',
                          background: 'var(--accent)', border: 'none', borderRadius: 12,
                          padding: '2px 10px', cursor: 'pointer' }}>
                        この位置で確定
                      </button>
                    )}
                    <button onClick={cancelAll}
                      style={{ fontSize: 11, color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      キャンセル
                    </button>
                  </div>
                )}

                {/* ズーム倍率インジケーター */}
                {mapsZoom > 1 && (
                  <div style={{ position: 'absolute', bottom: 8, right: 8, zIndex: 10, pointerEvents: 'none',
                    background: 'rgba(0,0,0,0.6)', color: 'var(--accent)', fontSize: 11,
                    padding: '2px 8px', borderRadius: 10, border: '1px solid var(--border)' }}>
                    ×{mapsZoom.toFixed(1)}
                  </div>
                )}

                {/* ズーム可能・ドラッグ可能なコンテンツ */}
                <div
                  style={{
                    transform: mapsZoom > 1 ? `translate(${mapsPanX}px, ${mapsPanY}px) scale(${mapsZoom})` : undefined,
                    transformOrigin: '0 0',
                    cursor: mapsIsDragging ? 'grabbing' : (isPlacing || isRepositioning || isPendingCoord) ? 'crosshair' : mapsZoom > 1 ? 'grab' : 'default',
                    userSelect: 'none',
                  }}
                  onMouseDown={handleInnerMouseDown}
                  onMouseMove={handleInnerMouseMove}
                  onMouseUp={handleInnerMouseUp}
                  onMouseLeave={handleInnerMouseUp}
                >
                  <img src={getMapImageSrc(selected, meta)} alt={selected}
                    style={{ width: '100%', display: 'block' }}
                    draggable={false}
                    onClick={handleMapClick} />

                  {/* 登録済みピン — ピン配置中はクリック不可 */}
                  <div style={{ pointerEvents: (isPlacing || isRepositioning || isPendingCoord) ? 'none' : undefined }}>
                    {pinnedForMap.map(pin => {
                      const found = tasksForMap.find(x => x.obj.id === pin.objectiveId);
                      if (!found) return null;
                      const { task, obj } = found;
                      const pinsForObj = pinsByObjId[pin.objectiveId] || [];
                      const pinIdx = pinsForObj.findIndex(p => p.id === pin.id);
                      return (
                        <MapPinMarker key={pin.id}
                          leftPct={pin.x / meta.width * 100}
                          topPct={pin.y / meta.height * 100}
                          obj={obj} task={task} cat={getCat(obj)} pin={pin}
                          pinIndex={pinsForObj.length > 1 ? pinIdx + 1 : null}
                          forceOpen={mapsHighlightedPinId === pin.id}
                          onRemove={() => removeTaskPin(pin.id)}
                          onReposition={() => { setMapsRepositioningPinId(pin.id); setMapsPlacingObjective(null); setMapsPendingPinCoords(null); }}
                        />
                      );
                    })}
                  </div>

                  {/* 仮ピン（ステージング or 逆順フロー） */}
                  {isPendingCoord && (
                    <div style={{
                      position: 'absolute',
                      left: `${mapsPendingPinCoords.x / meta.width * 100}%`,
                      top:  `${mapsPendingPinCoords.y / meta.height * 100}%`,
                      transform: 'translate(-50%, -100%)', pointerEvents: 'none',
                    }}>
                      <Icon name="map-pin" size={28}
                        color={isStaging ? 'var(--accent)' : 'rgba(255,255,255,0.7)'}
                        style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.7))' }} />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-dim)', fontSize: 13,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Icon name="refresh" size={14} color="var(--text-dim)" /> 読み込み中...
              </div>
            )}

            {/* マップ画像の差し替え（控えめなテキストリンク） */}
            <div className="map-image-replace">
              {mapImageOverrides[selected] && (
                <>
                  <span>差し替え画像を表示中</span>
                  <button type="button" className="map-image-replace-link" onClick={() => resetMapImage(selected)}>元の画像に戻す</button>
                  <span>/</span>
                </>
              )}
              <label className="map-image-replace-link">
                画像を差し替え
                <input type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => {
                    const file = e.target.files[0];
                    e.target.value = '';
                    if (!file) return;
                    replaceMapImage(selected, file).then(ok => {
                      if (ok) setMapsLoadFailed(prev => ({ ...prev, [selected]: false }));
                    });
                  }} />
              </label>
            </div>

            {/* 逆順フロー：仮ピン後の目標絞り込み */}
            {isReverseFlow && (
              <div className="section" style={{ marginBottom: 8, background: 'var(--accent-muted)', border: '1px solid var(--accent)' }}>
                <div style={{ fontSize: 12, color: 'var(--accent)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="map-pin" size={12} color="var(--accent)" /> 紐づける目標を検索・選択
                </div>
                <input type="text" placeholder="タスク名・目標名で絞り込み..."
                  value={mapsPendingSearch} onChange={e => setMapsPendingSearch(e.target.value)} autoFocus
                  style={{ width: '100%', padding: '6px 10px', borderRadius: 5, border: '1px solid var(--border)',
                    background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 13, marginBottom: 6 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 200, overflowY: 'auto' }}>
                  {filteredPending.length === 0 ? (
                    <div style={{ color: 'var(--text-dim)', fontSize: 12 }}>該当する目標がありません</div>
                  ) : filteredPending.map(({ task, obj }) => (
                    <button key={obj.id} onClick={() => handlePendingSelect({ task, obj })}
                      style={{ textAlign: 'left', background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                        borderRadius: 4, padding: '6px 10px', cursor: 'pointer', fontSize: 12, color: 'var(--text-primary)' }}>
                      <span style={{ color: 'var(--accent)' }}>{task.name}</span>
                      {' — '}{objDisplayName(obj)}{obj.count > 1 ? ` ×${obj.count}` : ''}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ピン未登録 / ピン登録済み — 横並び */}
            {!isReverseFlow && (unpinned.length > 0 || pinned.length > 0) && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>

                {/* ピン未登録 */}
                {unpinned.length > 0 && (
                  <div className="section" style={{ flex: 1, minWidth: 0, marginBottom: 0 }}>
                    <div className="section-title" style={{ marginBottom: 8 }}>
                      <Icon name="map-pin" size={13} color="var(--text-dim)" /> ピン未登録 ({unpinned.length}件)
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {CAT_ORDER.filter(cat => unpinned.some(x => getCat(x.obj) === cat)).map(cat => {
                        const items = unpinned.filter(x => getCat(x.obj) === cat);
                        return (
                          <div key={cat}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5,
                              fontSize: 11, fontWeight: 'bold', color: CAT_COLOR[cat] || 'var(--text-secondary)',
                              paddingBottom: 4, marginBottom: 5, borderBottom: '1px solid var(--border-light)' }}>
                              <Icon name={CAT_ICON[cat] || 'map-pin'} size={11} color={CAT_COLOR[cat] || 'var(--accent)'} />
                              {CAT_LABEL[cat]}
                              <span style={{ fontWeight: 'normal', color: 'var(--text-dim)', fontSize: 10 }}>({items.length})</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              {items.map(({ task, obj }) => objRow({ task, obj },
                                <button
                                  className={`btn btn-sm${mapsPlacingObjective?.objectiveId === obj.id ? ' btn-yellow' : ' btn-gray'}`}
                                  style={{ flexShrink: 0 }}
                                  onClick={() => { setMapsPlacingObjective({ taskId: task.id, objectiveId: obj.id }); setMapsRepositioningPinId(null); setMapsPendingPinCoords(null); }}>
                                  <Icon name="map-pin" size={11} color="currentColor" /> ピンを設置
                                </button>,
                                null
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ピン登録済み */}
                {pinned.length > 0 && (
                  <div className="section" style={{ flex: 1, minWidth: 0, marginBottom: 0 }}>
                    <div className="section-title" style={{ marginBottom: 8 }}>
                      <Icon name="circle-check" size={13} color="var(--state-ok)" /> ピン登録済み ({pinned.length}件)
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {CAT_ORDER.filter(cat => pinned.some(x => getCat(x.obj) === cat)).map(cat => {
                        const items = pinned.filter(x => getCat(x.obj) === cat);
                        return (
                          <div key={cat}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5,
                              fontSize: 11, fontWeight: 'bold', color: CAT_COLOR[cat] || 'var(--text-secondary)',
                              paddingBottom: 4, marginBottom: 5, borderBottom: '1px solid var(--border-light)' }}>
                              <Icon name={CAT_ICON[cat] || 'map-pin'} size={11} color={CAT_COLOR[cat] || 'var(--accent)'} />
                              {CAT_LABEL[cat]}
                              <span style={{ fontWeight: 'normal', color: 'var(--text-dim)', fontSize: 10 }}>({items.length})</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {items.map(({ task, obj }) => {
                        const pinsForObj = pinsByObjId[obj.id] || [];
                        return objRow({ task, obj },
                          // ヘッダー右：ピンを追加ボタン
                          <button className="btn btn-sm btn-yellow"
                            style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 3 }}
                            onClick={() => { setMapsPlacingObjective({ taskId: task.id, objectiveId: obj.id }); setMapsRepositioningPinId(null); setMapsPendingPinCoords(null); }}>
                            <Icon name="map-pin" size={11} color="var(--accent-on)" /> ピンを追加
                          </button>,
                          // ピン行（番号 + 再配置 + 削除 + メモ編集）
                          <div style={{ paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {pinsForObj.map((pin, pi) => {
                              const isEditing = mapsPinEditId === pin.id;
                              const itemSearchLower = mapsPinItemSearch.toLowerCase();
                              const matchItem = it => it.name?.toLowerCase().includes(itemSearchLower) || it.shortName?.toLowerCase().includes(itemSearchLower);
                              // タスク品（ユーザー登録）を先頭に、続いてアイテム一覧（API）
                              const itemSearchResults = isEditing && mapsPinItemSearch.length >= 2
                                ? [
                                    ...customItems.filter(matchItem).map(c => ({ ...c, custom: true })),
                                    ...(apiData?.items || []).filter(matchItem).slice(0, 10),
                                  ]
                                : [];
                              const addPinItem = (it) => {
                                if ((pin.requiredItems || []).some(i => i.id === it.id)) return;
                                // タスク品は画像(dataURL)を複製せず id 参照のみ保存（表示時に resolvePinItem で解決）
                                const entry = it.custom
                                  ? { id: it.id, name: it.name, shortName: it.shortName || '', custom: true }
                                  : { id: it.id, name: it.name, shortName: it.shortName, iconLink: it.iconLink || '' };
                                updatePinMeta(pin.id, { requiredItems: [...(pin.requiredItems || []), entry] });
                              };
                              return (
                                <div key={pin.id} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                  {/* ピン操作行 */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6,
                                    fontSize: 11, color: 'var(--text-secondary)' }}>
                                    <Icon name="map-pin" size={11} color={CAT_COLOR[getCat(obj)] || 'var(--accent)'} />
                                    <span style={{ minWidth: 28, color: 'var(--text-dim)' }}>
                                      スポーン{pi + 1}
                                    </span>
                                    <button className="btn btn-sm btn-gray"
                                      style={{ fontSize: 10, padding: '1px 7px' }}
                                      onClick={() => { setMapsRepositioningPinId(pin.id); setMapsPlacingObjective(null); setMapsPendingPinCoords(null); }}>
                                      再配置
                                    </button>
                                    <button className="btn btn-sm btn-gray"
                                      style={{ fontSize: 10, padding: '1px 5px', display: 'inline-flex', alignItems: 'center',
                                        color: isEditing ? 'var(--accent)' : undefined,
                                        border: isEditing ? '1px solid var(--accent)' : undefined }}
                                      onClick={() => {
                                        if (isEditing) {
                                          setMapsPinEditId(null);
                                        } else {
                                          setMapsPinEditId(pin.id);
                                          setMapsPinMemoInput(pin.memo || '');
                                          setMapsPinItemSearch('');
                                        }
                                      }}>
                                      <Icon name="pencil" size={10} color={isEditing ? 'var(--accent)' : 'currentColor'} />
                                    </button>
                                    <button className="btn btn-sm"
                                      onClick={() => removeTaskPin(pin.id)}
                                      style={{ fontSize: 10, padding: '1px 7px', background: 'var(--danger-bg)', color: 'var(--danger-text)', border: '1px solid var(--danger)' }}>
                                      <Icon name="x" size={10} color="var(--danger-text)" />
                                    </button>
                                  </div>

                                  {/* 登録済みメモ・アイテム表示（非編集時） */}
                                  {!isEditing && (pin.memo || (pin.requiredItems && pin.requiredItems.length > 0) || (pin.memoImages && pin.memoImages.length > 0)) && (
                                    <div style={{ marginLeft: 16, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                      {pin.memo && (
                                        <div style={{ fontSize: 10, color: 'var(--text-secondary)',
                                          background: 'var(--bg-primary)', borderRadius: 3, padding: '2px 6px',
                                          border: '1px solid var(--border-light)', display: 'flex', alignItems: 'flex-start', gap: 3 }}>
                                          <Icon name="pencil" size={9} color="var(--text-dim)" style={{ marginTop: 1, flexShrink: 0 }} />
                                          <span style={{ lineHeight: 1.4 }}>{pin.memo}</span>
                                        </div>
                                      )}
                                      {pin.requiredItems && pin.requiredItems.length > 0 && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                                          {pin.requiredItems.map(item => <PinItemChip key={item.id} item={item} />)}
                                        </div>
                                      )}
                                      <PinImageChips images={pin.memoImages} />
                                    </div>
                                  )}

                                  {/* 編集フォーム */}
                                  {isEditing && (
                                    <div style={{ marginLeft: 16, display: 'flex', flexDirection: 'column', gap: 6,
                                      padding: '7px 8px', background: 'var(--bg-primary)',
                                      border: '1px solid var(--border)', borderRadius: 4 }}
                                      onPaste={e => {
                                        const file = [...(e.clipboardData?.items || [])].find(it => it.type.startsWith('image/'))?.getAsFile();
                                        if (file) { e.preventDefault(); addPinImage(pin.id, file); }
                                      }}>

                                      {/* メモ入力 */}
                                      <div>
                                        <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 3,
                                          display: 'flex', alignItems: 'center', gap: 3 }}>
                                          <Icon name="pencil" size={9} color="var(--text-dim)" /> メモ（場所の詳細など）
                                        </div>
                                        <input
                                          type="text"
                                          value={mapsPinMemoInput}
                                          placeholder="例：404号室の机の上"
                                          onChange={e => setMapsPinMemoInput(e.target.value)}
                                          onBlur={() => updatePinMeta(pin.id, { memo: mapsPinMemoInput })}
                                          style={{ width: '100%', fontSize: 11, padding: '3px 6px', borderRadius: 3,
                                            border: '1px solid var(--border)', background: 'var(--bg-secondary)',
                                            color: 'var(--text-primary)', boxSizing: 'border-box' }}
                                        />
                                        {/* 詳細位置画像（Ctrl+V 貼り付け / ドロップ・省略名で表示） */}
                                        <div className="pin-img-paste-zone" tabIndex={0}
                                          onDragOver={e => e.preventDefault()}
                                          onDrop={e => { e.preventDefault(); [...(e.dataTransfer.files || [])].forEach(f => addPinImage(pin.id, f)); }}
                                          title="クリックしてから Ctrl+V でスクリーンショットを貼り付け（ドロップも可）">
                                          <Icon name="camera" size={10} color="var(--text-dim)" />
                                          <span>詳細位置画像: クリックして Ctrl+V で貼り付け</span>
                                        </div>
                                        {pin.memoImages && pin.memoImages.length > 0 && (
                                          <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                            {pin.memoImages.map(img => (
                                              <div key={img.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                                <img src={img.dataUrl} alt="" onClick={() => setPinImageViewer(img)}
                                                  style={{ width: 48, height: 30, objectFit: 'cover', borderRadius: 2, cursor: 'zoom-in',
                                                    border: '1px solid var(--border)', flexShrink: 0 }} />
                                                <input type="text" defaultValue={img.name} placeholder="省略名"
                                                  onBlur={e => {
                                                    const name = e.target.value.trim() || img.name;
                                                    if (name !== img.name) updatePinMeta(pin.id, p => ({ memoImages: (p.memoImages || []).map(m => m.id === img.id ? { ...m, name } : m) }));
                                                  }}
                                                  onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
                                                  style={{ flex: 1, minWidth: 0, fontSize: 10, padding: '2px 5px', borderRadius: 3,
                                                    border: '1px solid var(--border)', background: 'var(--bg-secondary)',
                                                    color: 'var(--text-primary)', boxSizing: 'border-box' }} />
                                                <button title="画像を削除"
                                                  onClick={() => updatePinMeta(pin.id, p => ({ memoImages: (p.memoImages || []).filter(m => m.id !== img.id) }))}
                                                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'inline-flex' }}>
                                                  <Icon name="x" size={10} color="var(--danger-text)" />
                                                </button>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>

                                      {/* 登録済み必要アイテム */}
                                      {pin.requiredItems && pin.requiredItems.length > 0 && (
                                        <div>
                                          <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 3,
                                            display: 'flex', alignItems: 'center', gap: 3 }}>
                                            <Icon name="backpack" size={9} color="var(--text-dim)" /> 必要アイテム
                                          </div>
                                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                                            {pin.requiredItems.map(item => (
                                              <PinItemChip key={item.id} item={item}
                                                onRemove={() => updatePinMeta(pin.id, { requiredItems: (pin.requiredItems || []).filter(i => i.id !== item.id) })} />
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {/* アイテム追加検索 */}
                                      <div style={{ position: 'relative' }}>
                                        <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 3,
                                          display: 'flex', alignItems: 'center', gap: 3 }}>
                                          <Icon name="search" size={9} color="var(--text-dim)" /> アイテムを追加（鍵・タスク品など）
                                          <div style={{ flex: 1 }} />
                                          <button className="btn btn-sm btn-gray"
                                            style={{ fontSize: 9, padding: '1px 6px', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                                            onClick={() => openItemForm({ name: mapsPinItemSearch, attachPinId: pin.id })}>
                                            <Icon name="plus" size={9} color="currentColor" /> タスク品を登録
                                          </button>
                                        </div>
                                        <input
                                          type="text"
                                          value={mapsPinItemSearch}
                                          placeholder="アイテム名で検索..."
                                          onChange={e => setMapsPinItemSearch(e.target.value)}
                                          style={{ width: '100%', fontSize: 11, padding: '3px 6px', borderRadius: 3,
                                            border: '1px solid var(--border)', background: 'var(--bg-secondary)',
                                            color: 'var(--text-primary)', boxSizing: 'border-box' }}
                                        />
                                        {/* 登録済みタスク品のクイック追加（検索欄が空のとき） */}
                                        {mapsPinItemSearch.length < 2 && customItems.some(c => !(pin.requiredItems || []).some(i => i.id === c.id)) && (
                                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 4 }}>
                                            {customItems.filter(c => !(pin.requiredItems || []).some(i => i.id === c.id)).map(c => (
                                              <button key={c.id} onClick={() => addPinItem({ ...c, custom: true })} title={`${c.name} を追加`}
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, padding: '1px 5px',
                                                  borderRadius: 3, cursor: 'pointer', background: 'var(--bg-secondary)',
                                                  color: 'var(--text-secondary)', border: '1px dashed var(--info-border)' }}>
                                                <Icon name="plus" size={8} color="var(--info)" />
                                                {c.iconLink && <img src={c.iconLink} alt="" style={{ width: 14, height: 14, objectFit: 'contain' }} />}
                                                {c.shortName || c.name}
                                              </button>
                                            ))}
                                          </div>
                                        )}
                                        {mapsPinItemSearch.length >= 2 && (
                                          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                                            background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                                            borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
                                            maxHeight: 160, overflowY: 'auto' }}>
                                            {itemSearchResults.map(it => {
                                              const alreadyAdded = (pin.requiredItems || []).some(i => i.id === it.id);
                                              return (
                                                <div key={it.id}
                                                  onClick={() => {
                                                    if (!alreadyAdded) addPinItem(it);
                                                    setMapsPinItemSearch('');
                                                  }}
                                                  style={{ display: 'flex', alignItems: 'center', gap: 5,
                                                    padding: '4px 7px', cursor: alreadyAdded ? 'default' : 'pointer',
                                                    fontSize: 11, color: alreadyAdded ? 'var(--text-dim)' : 'var(--text-primary)',
                                                    borderBottom: '1px solid var(--border-light)',
                                                    background: alreadyAdded ? 'var(--bg-primary)' : undefined }}>
                                                  {it.iconLink && <img src={it.iconLink} alt="" style={{ width: 20, height: 20, objectFit: 'contain', borderRadius: 2 }} onError={e => { e.target.style.display='none'; }} />}
                                                  <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</span>
                                                  {it.custom && <span style={{ fontSize: 9, color: 'var(--info)', background: 'var(--info-bg)', padding: '0 4px', borderRadius: 2 }}>タスク品</span>}
                                                  {alreadyAdded && <span style={{ fontSize: 9, color: 'var(--state-ok-text)' }}>追加済み</span>}
                                                </div>
                                              );
                                            })}
                                            {/* 見つからないタスク品はその場で登録 → このピンに追加 */}
                                            <div onClick={() => openItemForm({ name: mapsPinItemSearch, attachPinId: pin.id })}
                                              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 7px', cursor: 'pointer',
                                                fontSize: 11, color: 'var(--info)' }}>
                                              <Icon name="plus" size={11} color="var(--info)" />
                                              「{mapsPinItemSearch}」をタスク品として登録（画像付き）
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {tasksForMap.length === 0 && !mapsLoadFailed[selected] && (
              <div className="section" style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 13, padding: '20px' }}>
                {selected} の進行中タスク目標はありません（タスク検索タブで進行中に追加してください）
              </div>
            )}

            {/* 登録タスク品 */}
            {itemManagerSection}

            {/* タスク詳細ポップアップ */}
            {detailPopup}
            {itemFormModal}
          </div>
        );
      })()}
