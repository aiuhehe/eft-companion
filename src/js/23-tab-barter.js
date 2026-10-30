      {/* ===== TAB: BARTER ===== */}
      {activeTab === 'barter' && (
        <div>
          {/* サマリー */}
          <div className="section" style={{ marginBottom: 12 }}>
            <div className="section-title"><Icon name="shopping-cart" size={14} color="var(--accent)" /> 欲しいものサマリー</div>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <BarterSummaryBlock
                label="狙っているものリスト"
                labelIcon="target"
                color="var(--accent)"
                barters={wishlistBarters}
                items={wishlistItems}
                stash={stash}
                traderStatus={traderStatus}
              />
              <div style={{ width: 1, background: 'var(--border)' }} />
              <BarterSummaryBlock
                label="お気に入り"
                labelIcon="heart"
                color="var(--fav)"
                barters={favoritesBarters}
                items={favoritesItems}
                stash={stash}
                traderStatus={traderStatus}
              />
            </div>
          </div>

          {/* 欲しいリスト */}
          <div className="section" style={{ marginBottom: 12, padding: 0, overflow: 'hidden' }}>
            <div
              onClick={() => setWishlistOpen(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
                cursor: 'pointer', userSelect: 'none', background: 'var(--bg-secondary)' }}>
              <Icon name={wishlistOpen ? 'chevron-down' : 'chevron-right'} size={14} color="var(--text-dim)" />
              <span style={{ color: 'var(--accent)', fontWeight: 'bold', fontSize: 13, flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="target" size={14} color="var(--accent)" /> 狙っているものリスト
                <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 'normal' }}>
                  ({wishlistBarters.length + wishlistCraftsBarters.length}件)
                </span>
              </span>
            </div>
            {wishlistOpen && (
              <div style={{ padding: '10px 14px 12px' }}>
                {wishlistBarters.length === 0 && wishlistCraftsBarters.length === 0
                  ? <div style={{ color: '#4b5563', fontSize: 13 }}>下の一覧から追加してください</div>
                  : <>
                      {wishlistBarters.map(b => {
                        const planId = 'plan_barter_' + b.key;
                        const inPlan = planItems.some(p => p.id === planId);
                        return (
                          <BarterCard key={b.key} barter={b} stash={stash} traderStatus={traderStatus}
                            onRemove={() => removeFromWishlist(b.key)}
                            onAddFav={() => addToFavorites(b.key)}
                            isFav={favorites.includes(b.key)}
                            onAddPlan={() => { if (!inPlan) addPlanItem({ id: planId, type: 'barter', barterId: b.id, barterKey: b.key, name: b.resultItem.name, addedAt: new Date().toISOString() }); }}
                            inPlan={inPlan}
                            updateStash={updateStash}
                            accentColor="var(--accent)"
                          />
                        );
                      })}
                      {wishlistCraftsBarters.map(c => (
                        <CraftCard key={c.key} craft={c} stash={stash}
                          onRemove={() => removeFromWishlistCraft(c.key)}
                          updateStash={updateStash}
                          hideoutLevels={hideoutLevels}
                        />
                      ))}
                    </>
                }
              </div>
            )}
          </div>

          {/* お気に入り */}
          <div className="section" style={{ marginBottom: 12, padding: 0, overflow: 'hidden' }}>
            <div
              onClick={() => setFavoritesOpen(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
                cursor: 'pointer', userSelect: 'none', background: 'var(--bg-secondary)' }}>
              <Icon name={favoritesOpen ? 'chevron-down' : 'chevron-right'} size={14} color="var(--text-dim)" />
              <span style={{ color: 'var(--fav)', fontWeight: 'bold', fontSize: 13, flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="heart" size={14} color="var(--fav)" /> お気に入り
                <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 'normal' }}>
                  ({favoritesBarters.length}件)
                </span>
              </span>
            </div>
            {favoritesOpen && (
              <div style={{ padding: '10px 14px 12px' }}>
                {favoritesBarters.length === 0
                  ? <div style={{ color: '#4b5563', fontSize: 13 }}>下の検索から追加してください</div>
                  : favoritesBarters.map(b => {
                      const planId = 'plan_barter_' + b.key;
                      const inPlan = planItems.some(p => p.id === planId);
                      return (
                        <BarterCard key={b.key} barter={b} stash={stash} traderStatus={traderStatus}
                          onRemove={() => removeFromFavorites(b.key)}
                          onAddWishlist={() => addToWishlist(b.key)}
                          isWishlisted={wishlist.includes(b.key)}
                          onAddPlan={() => { if (!inPlan) addPlanItem({ id: planId, type: 'barter', barterId: b.id, barterKey: b.key, name: b.resultItem.name, addedAt: new Date().toISOString() }); }}
                          inPlan={inPlan}
                          updateStash={updateStash}
                          accentColor="var(--fav)"
                        />
                      );
                    })
                }
              </div>
            )}
          </div>

          {/* バーター / クラフト サブタブ */}
          <div className="section" style={{ padding: 0, overflow: 'hidden' }}>
            {/* ===== 共通フィルター（タブの上） ===== */}
            <div style={{ padding: '12px 16px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10, alignItems: 'center' }}>
                <input type="text" placeholder="アイテム名で絞り込み..."
                  value={listSearch}
                  onChange={e => { setListSearch(e.target.value); setCraftDisplayLimit(50); }}
                  onCompositionEnd={e => { setListSearch(e.target.value); setCraftDisplayLimit(50); }}
                  style={{ width: 220 }} />
                <select value={listCategoryFilter}
                  onChange={e => { setListCategoryFilter(e.target.value); setCraftDisplayLimit(50); }}>
                  <option value="all">全カテゴリ</option>
                  {craftCategories.map(c => (
                    <option key={c} value={c}>{catLabel(c)}</option>
                  ))}
                </select>
                <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                  {barterSubTab === 'barter'
                    ? `${filteredBarterList.length} 件`
                    : craftFiltered
                      ? `${filteredCraftList.length} 件`
                      : `${Math.min(craftDisplayLimit, filteredCraftList.length)} / ${filteredCraftList.length} 件`
                  }
                </span>
              </div>

              {/* サブタブヘッダー */}
              <div style={{ display: 'flex' }}>
                {[
                  { id: 'barter', label: '物々交換品一覧', icon: 'refresh' },
                  { id: 'craft',  label: 'ハイドアウト作成品一覧', icon: 'building' },
                ].map(t => (
                  <div key={t.id}
                    onClick={() => setBarterSubTab(t.id)}
                    style={{
                      padding: '8px 18px', cursor: 'pointer', fontSize: 13,
                      color: barterSubTab === t.id ? 'var(--accent)' : 'var(--text-secondary)',
                      borderBottom: `2px solid ${barterSubTab === t.id ? 'var(--accent)' : 'transparent'}`,
                      fontWeight: barterSubTab === t.id ? 'bold' : 'normal',
                      marginBottom: -1,
                    }}>{t.label}</div>
                ))}
              </div>
            </div>

            <div style={{ padding: 16 }}>
              {/* ===== サブタブ: 物々交換品一覧 ===== */}
              {barterSubTab === 'barter' && (
                allBarters.length === 0
                  ? <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>APIデータを取得してください</div>
                  : <>
                      {/* タブ固有フィルター（トレーダー・LL） */}
                      <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        <select value={barterTraderFilter} onChange={e => setBarterTraderFilter(e.target.value)}>
                          <option value="all">全トレーダー</option>
                          {[...new Set(allBarters.map(b => b.traderId))].map(tid => {
                            const name = allBarters.find(b => b.traderId === tid)?.traderName || tid;
                            return <option key={tid} value={tid}>{name}</option>;
                          })}
                        </select>
                        <select value={barterLLFilter} onChange={e => setBarterLLFilter(e.target.value)}>
                          <option value="all">全LL</option>
                          {[1,2,3,4].map(l => <option key={l} value={l}>LL{l}</option>)}
                        </select>
                      </div>
                      {filteredBarterList.length === 0
                        ? <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-dim)', fontSize: 14 }}>
                            検索結果 0 ヒット
                          </div>
                        : <div style={{ maxHeight: 500, overflowY: 'auto' }}>
                            {filteredBarterList.map(b => {
                              const st = traderStatus[b.traderId] || { ll: 1 };
                              const accessible = st.ll >= b.level;
                              const inWishlist = wishlist.includes(b.key);
                              const inFavorites = favorites.includes(b.key);
                              const allReady = b.requiredItems.every(({ item, count }) => parseInt(stash[item.id] || 0) >= count);
                              return (
                                <div key={b.key} className="barter-list-row" style={{
                                  background: allReady ? 'var(--state-ok-bg-weak)' : 'var(--bg-primary)',
                                  border: `1px solid ${inWishlist ? 'var(--accent-muted)' : inFavorites ? 'var(--fav-deep)' : allReady ? 'var(--state-ok)' : 'var(--border)'}`,
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 200 }}>
                                    {b.resultItem.iconLink
                                      ? <img src={b.resultItem.iconLink} alt={b.resultItem.shortName}
                                          className="result-icon-48"
                                          onError={e => { e.target.style.display = 'none'; }} />
                                      : <div className="result-icon-48" />
                                    }
                                    <div>
                                      <div style={{ fontWeight: 'bold', fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                                        {b.resultItem.name}
                                        {b.rewardCount > 1 && <span style={{ color: 'var(--accent)', marginLeft: 4 }}>×{b.rewardCount}</span>}
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
                                          {item.iconLink && <img src={item.iconLink} alt="" style={{ width: 20, height: 20, objectFit: 'contain', borderRadius: 2 }} onError={e => { e.target.style.display='none'; }} />}
                                          {item.name} {have}/{count}
                                        </span>
                                      );
                                    })}
                                  </div>
                                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                                    <button
                                      onClick={() => {
                                        b.requiredItems.forEach(({ item, count }) => updateStash(item.id, -count));
                                        addJournalGet(`${b.resultItem.name}${b.rewardCount > 1 ? ` ×${b.rewardCount}` : ''}`, 'barter');
                                      }}
                                      title="入手済み — 作った分だけ素材が減算されます"
                                      className="card-btn"
                                      style={{ background: 'var(--state-ok-bg)', color: 'var(--state-ok-text)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                      <Icon name="circle-check" size={13} color="var(--state-ok-text)" /> GET
                                    </button>
                                    <button onClick={() => inWishlist ? removeFromWishlist(b.key) : addToWishlist(b.key)}
                                      title={inWishlist ? '狙いリストから削除' : '狙いリストに追加'}
                                      className="card-btn"
                                      style={{ background: inWishlist ? 'var(--warn-bg)' : 'var(--bg-secondary)',
                                        color: inWishlist ? 'var(--warn-text)' : 'var(--text-dim)' }}><Icon name="star" size={13} color={inWishlist?'var(--warn-text)':'var(--text-dim)'} /></button>
                                    <button onClick={() => inFavorites ? removeFromFavorites(b.key) : addToFavorites(b.key)}
                                      title={inFavorites ? 'お気に入りから削除' : 'お気に入りに追加'}
                                      className="card-btn"
                                      style={{ background: inFavorites ? 'var(--fav-bg)' : 'var(--bg-secondary)',
                                        color: inFavorites ? 'var(--fav-text)' : 'var(--text-dim)' }}><Icon name="heart" size={13} color={inFavorites?'var(--fav-text)':'var(--text-dim)'} /></button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                      }
                    </>
              )}

              {/* ===== サブタブ: ハイドアウト作成品一覧 ===== */}
              {barterSubTab === 'craft' && (
                allCrafts.length === 0
                  ? <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>APIデータを取得してください</div>
                  : <>
                      {/* タブ固有フィルター（施設） */}
                      <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        <select value={craftStationFilter}
                          onChange={e => { setCraftStationFilter(e.target.value); setCraftDisplayLimit(50); }}>
                          <option value="all">全施設</option>
                          {craftStations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </div>
                      {filteredCraftList.length === 0
                        ? <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-dim)', fontSize: 14 }}>
                            検索結果 0 ヒット
                          </div>
                        : <div>
                            {displayedCrafts.map(c => {
                              const inWishlist = wishlistCrafts.includes(c.key);
                              const currentStationLv = parseInt(hideoutLevels[c.stationId] || 0);
                              const canCraft = currentStationLv >= c.level;
                              const mins = Math.floor((c.duration || 0) / 60);
                              const hrs = Math.floor(mins / 60);
                              const timeStr = hrs > 0 ? `${hrs}h${mins % 60}m` : `${mins}m`;
                              return (
                                <div key={c.key} className="barter-list-row" style={{
                                  background: inWishlist ? 'var(--warn-bg-weak)' : 'var(--bg-primary)',
                                  border: `1px solid ${inWishlist ? 'var(--accent-muted)' : 'var(--border)'}`,
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 200 }}>
                                    {c.resultItem.iconLink && <img src={c.resultItem.iconLink} alt=""
                                      className="result-icon-48"
                                      onError={e => { e.target.style.display='none'; }} />}
                                    <div>
                                      <div style={{ fontWeight: 'bold', fontSize: 13, color: 'var(--text-primary)' }}>
                                        {c.resultItem.name}
                                        {c.rewardCount > 1 && <span style={{ color: 'var(--accent)', marginLeft: 4 }}>×{c.rewardCount}</span>}
                                      </div>
                                      <div style={{ marginTop: 2, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                        <span className={`ll-badge ${canCraft ? 'is-ok' : 'is-locked'}`}>
                                          {c.stationName} Lv{c.level}{canCraft ? '' : <Icon name="lock" size={11} color="var(--danger)" style={{marginLeft:3}} />}
                                        </span>
                                        {c.duration > 0 && <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}><Icon name="clock" size={11} color="var(--text-secondary)" />{" "}{timeStr}</span>}
                                      </div>
                                    </div>
                                  </div>
                                  <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                    {c.requiredItems.map(({ item, count }) => {
                                      const have = parseInt(stash[item.id] || 0);
                                      const ok = have >= count;
                                      return (
                                        <span key={item.id} style={{
                                          display: 'inline-flex', alignItems: 'center', gap: 3,
                                          fontSize: 11, padding: '2px 7px', borderRadius: 3,
                                          background: ok ? 'var(--state-ok-bg)' : 'var(--bg-secondary)',
                                          color: ok ? 'var(--state-ok-text)' : 'var(--text-secondary)',
                                          border: `1px solid ${ok ? 'var(--state-ok)' : 'var(--border)'}`, whiteSpace: 'nowrap',
                                        }}>
                                          {item.iconLink && <img src={item.iconLink} alt="" className="req-chip-icon" onError={e => { e.target.style.display='none'; }} />}
                                          {item.name} {have}/{count}
                                        </span>
                                      );
                                    })}
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0, alignItems: 'flex-end' }}>
                                    <button
                                      onClick={() => {
                                        c.requiredItems.forEach(({ item, count }) => updateStash(item.id, -count));
                                        addJournalGet(`${c.resultItem.name}${c.rewardCount > 1 ? ` ×${c.rewardCount}` : ''}`, 'craft');
                                      }}
                                      title="作成完了 — 作った分だけ素材が減算されます"
                                      className="card-btn"
                                      style={{ background: 'var(--info-bg)', color: 'var(--info)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                      <Icon name="tool" size={13} color="var(--info)" /> GET
                                    </button>
                                    <button onClick={() => inWishlist ? removeFromWishlistCraft(c.key) : addToWishlistCraft(c.key)}
                                      title={inWishlist ? '狙いリストから削除' : '狙いリストに追加'}
                                      className="card-btn"
                                      style={{ background: inWishlist ? 'var(--warn-bg)' : 'var(--bg-secondary)',
                                        color: inWishlist ? 'var(--warn-text)' : 'var(--text-dim)' }}><Icon name="target" size={12} color={inWishlist?'var(--warn-text)':'var(--text-dim)'} />{inWishlist?'登録済':'狙う'}</button>
                                    {(c.resultItem.categories || []).slice(0, 2).map(cat => (
                                      <span key={cat.name}
                                        onClick={() => setListCategoryFilter(cat.name)}
                                        style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, cursor: 'pointer',
                                          background: listCategoryFilter === cat.name ? 'var(--info-bg)' : 'var(--bg-secondary)',
                                          color: listCategoryFilter === cat.name ? 'var(--info)' : 'var(--text-dim)',
                                          border: `1px solid ${listCategoryFilter === cat.name ? 'var(--info-border)' : 'var(--border)'}` }}>
                                        {catLabel(cat.name)}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                            {!craftFiltered && filteredCraftList.length > craftDisplayLimit && (
                              <div ref={craftSentinelRef} style={{ padding: 12, textAlign: 'center', color: '#4b5563', fontSize: 12 }}>
                                <Icon name="refresh" size={13} color="var(--text-dim)" style={{animation:'spin 1s linear infinite',marginRight:4}} /> 読み込み中... (残り {filteredCraftList.length - craftDisplayLimit} 件)
                              </div>
                            )}
                          </div>
                      }
                    </>
              )}
            </div>
          </div>
        </div>
      )}

