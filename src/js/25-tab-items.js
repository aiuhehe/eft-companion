      {/* ===== TAB: ITEMS ===== */}
      {activeTab === 'items' && (
        <div>

          {/* 損益計算TOP3 */}
          <div className="section">
            <div className="section-title"
              onClick={() => setItemsProfitOpen(o => !o)}
              style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="trending-up" size={14} color="var(--accent)" />
              損益計算 — カテゴリ別TOP3（損失が少ない順）
              <span style={{ marginLeft: 'auto' }}>
                <Icon name={itemsProfitOpen ? 'chevron-up' : 'chevron-down'} size={14} color="var(--text-dim)" />
              </span>
            </div>
            {itemsProfitOpen && (<><div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10, alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>購入トレーダー（任意）</span>
                <select value={profitBuyTrader} onChange={e => { setProfitBuyTrader(e.target.value); setProfitCategoryFilter([]); }} style={{ minWidth: 130 }}>
                  <option value="">指定なし</option>
                  {apiData.traders.filter(t => t.id !== TRADER_IDS.fence).map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 2 }}>
                <button
                  onClick={() => { const tmp = profitBuyTrader; setProfitBuyTrader(profitSellTrader); setProfitSellTrader(tmp); setProfitCategoryFilter([]); }}
                  title="購入・売却トレーダーを入れ替え"
                  style={{ background: '#2d3748', border: '1px solid #4b5563', borderRadius: 4, color: 'var(--accent)', cursor: 'pointer', padding: '4px 8px', display: 'inline-flex', alignItems: 'center' }}>
                  <Icon name="sort" size={15} color="var(--accent)" />
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>売却トレーダー（任意）</span>
                <select value={profitSellTrader} onChange={e => { setProfitSellTrader(e.target.value); setProfitCategoryFilter([]); }} style={{ minWidth: 130 }}>
                  <option value="">指定なし</option>
                  {apiData.traders.filter(t => t.id !== TRADER_IDS.fence).map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              {itemCategories.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>カテゴリ（複数可）</span>
                    {profitCategoryFilter.length > 0 && (
                      <button onClick={() => setProfitCategoryFilter([])}
                        style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 11, padding: 0, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <Icon name="x" size={11} color="var(--danger)" /> リセット
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {itemCategories.map(cat => {
                      const on = profitCategoryFilter.includes(cat);
                      return (
                        <button key={cat}
                          onClick={() => setProfitCategoryFilter(prev =>
                            on ? prev.filter(c => c !== cat) : [...prev, cat]
                          )}
                          className="cat-btn"
                          style={{
                            background: on ? 'var(--accent)' : 'var(--border)',
                            color: on ? 'var(--accent-on)' : 'var(--text-secondary)',
                            fontWeight: on ? 'bold' : 'normal',
                          }}>
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            {apiData.items.length === 0 && (
              <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>APIデータを取得してください。</div>
            )}
            {apiData.items.length > 0 && profitTop3.length === 0 && (
              <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>条件に一致するトレーダー間取引可能なアイテムがありません。</div>
            )}
            {profitTop3.length > 0 && (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {profitTop3.map(({ item, bestBuy, bestBuyRUB, bestSell, bestSellRUB, loss }, idx) => {
                  const isProfit = loss <= 0;
                  const absCurrency = bestBuy.currency !== 'RUB'
                    ? (bestBuy.currency === 'USD' ? `$${bestBuy.price}` : `€${bestBuy.price}`)
                    : null;
                  const isPinned = pinnedItems.some(p => p.itemId === item.id);
                  return (
                    <div key={item.id}
                      onClick={() => jumpToItemSearch(item.name)}
                      title="クリックでアイテム検索" className="profit-card"
                      style={{ border: `1px solid ${isProfit ? 'var(--state-ok)' : '#2d3748'}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ color: 'var(--accent)', fontWeight: 'bold', fontSize: 16 }}>#{idx + 1}</span>
                        {item.iconLink && (
                          <img src={item.iconLink} alt="" className="item-icon-32"
                            onError={e => { e.target.style.display = 'none'; }} />
                        )}
                        <span style={{ fontSize: 13, fontWeight: 'bold', color: 'var(--text-primary)', flex: 1 }}>{item.name}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); isPinned ? unpinItem(item.id) : pinItem(item); }}
                          title={isPinned ? 'ピンを外す' : 'ピン止め'}
                          style={{
                            background: isPinned ? '#7c3aed' : '#2d3748', border: 'none', borderRadius: 4,
                            color: isPinned ? '#fff' : '#94a3b8', cursor: 'pointer', padding: '2px 7px', fontSize: 14,
                            display: 'flex', alignItems: 'center',
                          }}>
                          <Icon name="pin" size={14} color={isPinned ? '#fff' : 'var(--text-secondary)'} />
                        </button>
                      </div>
                      <div style={{ fontSize: 12, lineHeight: 1.8 }}>
                        <div>
                          <span style={{ color: 'var(--text-secondary)' }}>購入: </span>
                          <span style={{ color: 'var(--warn-text)' }}>
                            {bestBuy.vendor.trader?.name}
                            {' → '}
                            {absCurrency ? `${absCurrency} (${fmt(bestBuyRUB)})` : fmt(bestBuyRUB)}
                          </span>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-secondary)' }}>売却: </span>
                          <span style={{ color: 'var(--state-ok-text)' }}>
                            {bestSell.vendor.trader?.name}
                            {' → '}
                            {fmt(bestSellRUB)}
                          </span>
                        </div>
                        <div style={{ marginTop: 4, borderTop: '1px solid #2d3748', paddingTop: 4 }}>
                          <span style={{ color: 'var(--text-secondary)' }}>損益: </span>
                          <span style={{
                            fontWeight: 'bold',
                            color: isProfit ? 'var(--state-ok)' : 'var(--danger)'
                          }}>
                            {isProfit ? '+' : ''}{fmt(-loss)} {isProfit ? '利益' : '損失'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}</>)}
          </div>

          {/* ピン止め比較エリア */}
          {pinnedItems.length > 0 && (
            <div className="section">
              <div className="section-title"
                onClick={() => setItemsPinOpen(o => !o)}
                style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="pin" size={14} color="var(--accent)" />
                ピン止め比較 ({pinnedItems.length}/6)
                <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 'normal', marginLeft: 4 }}>
                  個数を変えて損益を比較できます
                </span>
                <span style={{ marginLeft: 'auto' }}>
                  <Icon name={itemsPinOpen ? 'chevron-up' : 'chevron-down'} size={14} color="var(--text-dim)" />
                </span>
              </div>
              {itemsPinOpen && <>{/* 目標金額による個数一括計算 */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 12, padding: '8px 10px', background: 'var(--bg-primary)', borderRadius: 6, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>トレーダー取引額から個数を自動計算</span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              
                    <select value={pinTargetTrader} onChange={e => setPinTargetTrader(e.target.value)} style={{ minWidth: 120 }}>
                      <option value="">トレーダー選択</option>
                      {apiData.traders.filter(t => t.id !== TRADER_IDS.fence).map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={pinTargetAmount}
                      onChange={e => setPinTargetAmount(e.target.value)}
                      placeholder="目標金額 (例: 2M, 500K)"
                      style={{ width: 150 }}
                    />
                    <button className="btn btn-gray btn-sm"
                      onClick={() => { setPinTargetTrader(''); setPinTargetAmount(''); }}>
                      クリア
                    </button>
                  </div>
                </div>
              </div>

              {/* ピン止めカード一覧 */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {pinnedItems.map(({ itemId, qty, item }) => {
                  const traderBuys  = (item.buyFor  || []).filter(b => b.vendor?.trader?.id);
                  const traderSells = (item.sellFor || []).filter(s => s.vendor?.trader?.id);
                  const bestBuyRUB  = traderBuys.length  > 0 ? Math.min(...traderBuys.map(b => b.priceRUB))  : 0;
                  const bestBuy     = traderBuys.find(b => b.priceRUB === bestBuyRUB);
                  const bestSellRUB = traderSells.length > 0 ? Math.max(...traderSells.map(s => s.priceRUB)) : 0;
                  const bestSell    = traderSells.find(s => s.priceRUB === bestSellRUB);
                  const loss = (bestBuyRUB - bestSellRUB) * qty;
                  const isProfit = loss <= 0;
                  const absCurrency = bestBuy?.currency !== 'RUB'
                    ? (bestBuy?.currency === 'USD' ? `$${bestBuy.price}` : `€${bestBuy.price}`)
                    : null;
                  return (
                    <div key={itemId}
                      onClick={() => jumpToItemSearch(item.name)}
                      title="クリックでアイテム検索" className="profit-card"
                      style={{ border: `1px solid ${isProfit ? 'var(--state-ok)' : '#2d3748'}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        {item.iconLink && (
                          <img src={item.iconLink} alt="" className="item-icon-32"
                            onError={e => { e.target.style.display = 'none'; }} />
                        )}
                        <span style={{ fontSize: 13, fontWeight: 'bold', color: 'var(--text-primary)', flex: 1 }}>{item.name}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); unpinItem(itemId); }}
                          title="ピンを外す"
                          style={{ background: 'var(--danger-deep)', border: 'none', borderRadius: 4, color: 'var(--danger-text)', cursor: 'pointer', padding: '2px 7px', display: 'inline-flex', alignItems: 'center' }}><Icon name="x" size={14} color="var(--danger-text)" /></button>
                      </div>
                      <div style={{ fontSize: 12, lineHeight: 1.8 }}>
                        {bestBuyRUB > 0 && (
                          <div>
                            <span style={{ color: 'var(--text-secondary)' }}>購入: </span>
                            <span style={{ color: 'var(--warn-text)' }}>
                              {bestBuy.vendor.trader?.name}{' → '}
                              {absCurrency ? `${absCurrency} (${fmt(bestBuyRUB)})` : fmt(bestBuyRUB)}
                            </span>
                          </div>
                        )}
                        {bestSellRUB > 0 && (
                          <div>
                            <span style={{ color: 'var(--text-secondary)' }}>売却: </span>
                            <span style={{ color: 'var(--state-ok-text)' }}>
                              {bestSell.vendor.trader?.name}{' → '}{fmt(bestSellRUB)}
                            </span>
                          </div>
                        )}
                        {(bestBuyRUB > 0 || bestSellRUB > 0) && (
                          <div style={{ marginTop: 4, borderTop: '1px solid #2d3748', paddingTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                              <span style={{ color: 'var(--text-secondary)' }}>損益×{qty}: </span>
                              <span style={{ fontWeight: 'bold', color: isProfit ? 'var(--state-ok)' : 'var(--danger)' }}>
                                {isProfit ? '+' : ''}{fmt(-loss)} {isProfit ? '利益' : '損失'}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={e => e.stopPropagation()}>
                              <button className="btn btn-gray btn-sm" onClick={() => updatePinQty(itemId, -1)}>－</button>
                              <span style={{ minWidth: 24, textAlign: 'center', fontSize: 13 }}>{qty}</span>
                              <button className="btn btn-gray btn-sm" onClick={() => updatePinQty(itemId, +1)}>＋</button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              </>}
            </div>
          )}

          {/* ウォッチボード */}
          <div className="section">
            <div className="section-title"
              onClick={() => setWatchBoardOpen(o => !o)}
              style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="eye" size={14} color="var(--accent)" /> ウォッチボード
              {watchBoardIds.length > 0 && <span style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 'normal' }}>（{watchBoardIds.length}）</span>}
              <span style={{ marginLeft: 'auto' }}>
                <Icon name={watchBoardOpen ? 'chevron-up' : 'chevron-down'} size={14} color="var(--text-dim)" />
              </span>
            </div>
            {watchBoardOpen && (watchBoardIds.length === 0 ? (
              <div style={{ color: 'var(--text-dim)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                アイテム検索結果の <Icon name="eye" size={13} color="var(--text-secondary)" /> ボタンで登録すると、ここに価格推移が常時表示されます。
              </div>
            ) : (<>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: 10 }}>
                <input type="checkbox" checked={watchBoardTwoCol} onChange={e => setWatchBoardTwoCol(e.target.checked)} />
                2列で表示（半分の幅で2個ずつ並べる）
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: watchBoardTwoCol ? '1fr 1fr' : '1fr', gap: 12 }}>
                {watchBoardIds.map(id => {
                  const item = apiData.items.find(i => i.id === id);
                  if (!item) return (
                    <div key={id} className="watch-card" style={{ color: 'var(--text-dim)', fontSize: 12 }}>
                      アイテムデータ未取得（APIデータを取得してください）
                      <button className="btn btn-gray btn-sm" style={{ marginLeft: 10 }} onClick={() => toggleWatchBoard(id)}>外す</button>
                    </div>
                  );
                  const wLow = item.low24hPrice || 0, wAvg = item.avg24hPrice || 0, wHigh = item.high24hPrice || 0;
                  return (
                    <div key={id} className="watch-card">
                      <div className="watch-card-head">
                        {item.iconLink && (
                          <img src={item.iconLink} alt="" className="item-icon-32"
                            onError={e => { e.target.style.display = 'none'; }} />
                        )}
                        <div style={{ flex: '1 1 160px', minWidth: 140 }}>
                          <span style={{ fontSize: 13, fontWeight: 'bold', color: 'var(--text-primary)' }}>{item.name}</span>
                          {item.shortName && item.shortName !== item.name && (
                            <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 6,
                              background: 'var(--bg-secondary)', padding: '1px 5px', borderRadius: 3 }}>{item.shortName}</span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                          {wLow > 0 || wHigh > 0 ? (
                            <>
                              <span style={{ color: 'var(--state-ok-text)' }} title="最安値（24h）">{fmt(wLow)}</span>
                              <span style={{ color: 'var(--text-dim)', margin: '0 3px' }}>/</span>
                              <span style={{ color: 'var(--text-secondary)' }} title="平均値（24h）">{fmt(wAvg)}</span>
                              <span style={{ color: 'var(--text-dim)', margin: '0 3px' }}>/</span>
                              <span style={{ color: 'var(--danger-text)' }} title="最高値（24h）">{fmt(wHigh)}</span>
                            </>
                          ) : <span style={{ color: 'var(--text-dim)' }}>—</span>}
                        </div>
                        <button
                          onClick={() => toggleWatchBoard(id)}
                          title="ウォッチボードから外す"
                          style={{ background: '#2d3748', border: 'none', borderRadius: 4, color: 'var(--text-secondary)',
                            cursor: 'pointer', padding: '4px 10px', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                          <Icon name="x" size={14} color="var(--text-secondary)" />
                        </button>
                      </div>
                      <FleaHistoryChart {...(historyCache[id] || { loading: true })} showPeriodSelector />
                    </div>
                  );
                })}
              </div>
            </>))}
          </div>

          {/* アイテム検索 */}
          <div className="section" ref={itemSearchRef}>
            <div className="section-title"><Icon name="search" size={14} color="var(--accent)" /> アイテム検索</div>
            {apiData.items.length === 0 ? (
              <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>APIデータを取得してください。</div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="アイテム名で検索..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ flex: 1, minWidth: 180 }}
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={onlyTradeable} onChange={e => setOnlyTradeable(e.target.checked)} />
                    トレーダー取引可能のみ
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={onlyInStock} onChange={e => setOnlyInStock(e.target.checked)} />
                    在庫あり のみ
                  </label>
                  {searchQuery && (
                    <button className="btn btn-gray btn-sm" onClick={() => setSearchQuery('')}>クリア</button>
                  )}
                </div>
                {filteredItems.length === 0 && searchQuery && (
                  <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>アイテムが見つかりません</div>
                )}
                {filteredItems.length === 0 && !searchQuery && (
                  <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>アイテム名を入力して検索してください。</div>
                )}
                {/* ヘッダー行 */}
                {filteredItems.length > 0 && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '4px 14px 4px 56px',
                    fontSize: 11, color: 'var(--text-dim)', borderBottom: '1px solid var(--border)',
                    marginBottom: 2,
                  }}>
                    <div style={{ flex: '1 1 160px', minWidth: 160 }}>アイテム名</div>
                    <div style={{ width: 160, flexShrink: 0 }}>
                      <Icon name="shopping-cart" size={11} color="var(--text-dim)" /> 購入（トレーダー）
                    </div>
                    <div style={{ width: 160, flexShrink: 0 }}>
                      <Icon name="trending-up" size={11} color="var(--text-dim)" /> 売却（トレーダー）
                    </div>
                    <div style={{ width: 260, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Icon name="chart-bar" size={11} color="var(--text-dim)" />
                      フリマ（最安値 / 平均 / 最高値）
                      <Tooltip text={
                        '全リージョンの集計データ（過去24時間）のため\n' +
                        'ゲーム内価格とは異なる場合があります。\n' +
                        '参考値としてご利用ください。'
                      }>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: 14, height: 14, borderRadius: '50%',
                          background: 'var(--border)', color: 'var(--text-dim)',
                          fontSize: 9, fontWeight: 'bold', cursor: 'help', marginLeft: 2,
                        }}>?</span>
                      </Tooltip>
                    </div>
                    <div style={{ width: 90, flexShrink: 0 }}>在庫数</div>
                    <div style={{ width: 100, flexShrink: 0 }} />
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {filteredItems.map(item => {
                    const traderBuys  = (item.buyFor  || []).filter(b => b.vendor?.trader?.id);
                    const traderSells = (item.sellFor || []).filter(s => s.vendor?.trader?.id);
                    const bestBuyRUB  = traderBuys.length  > 0 ? Math.min(...traderBuys.map(b => b.priceRUB))  : 0;
                    const bestBuy     = traderBuys.find(b => b.priceRUB === bestBuyRUB);
                    const bestSellRUB = traderSells.length > 0 ? Math.max(...traderSells.map(s => s.priceRUB)) : 0;
                    const bestSell    = traderSells.find(s => s.priceRUB === bestSellRUB);
                    const isPinned = pinnedItems.some(p => p.itemId === item.id);
                    const fleaLow  = item.low24hPrice  || 0;
                    const fleaHigh = item.high24hPrice || 0;
                    const fleaAvg  = item.avg24hPrice  || 0;
                    const have = parseInt(stash[item.id] || 0);
                    const historyOpen = historyOpenId === item.id;
                    const isWatched = watchBoardIds.includes(item.id);
                    return (
                      <React.Fragment key={item.id}>
                      <div className="item-row" style={{ cursor: 'pointer', borderColor: historyOpen ? 'var(--accent)' : undefined }}
                        onClick={() => toggleItemHistory(item.id)} title="クリックでフリマ価格の推移を表示">
                        {item.iconLink && (
                          <img src={item.iconLink} alt="" className="item-icon-32"
                            onError={e => { e.target.style.display = 'none'; }} />
                        )}
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          {/* アイテム名 + shortName */}
                          <div style={{ flex: '1 1 160px', minWidth: 160 }}>
                            <span style={{ fontSize: 13, fontWeight: 'bold', color: 'var(--text-primary)' }}>{item.name}</span>
                            {item.shortName && item.shortName !== item.name && (
                              <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 6,
                                background: 'var(--bg-secondary)', padding: '1px 5px', borderRadius: 3 }}>
                                {item.shortName}
                              </span>
                            )}
                          </div>
                          {/* 購入（トレーダー） */}
                          <div style={{ width: 160, flexShrink: 0, fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {bestBuyRUB > 0
                              ? <>{bestBuy.vendor.trader?.name} <span style={{ color: 'var(--warn-text)' }}>{fmt(bestBuyRUB)}</span></>
                              : <span style={{ color: 'var(--text-dim)' }}>—</span>}
                          </div>
                          {/* 売却（トレーダー） */}
                          <div style={{ width: 160, flexShrink: 0, fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {bestSellRUB > 0
                              ? <>{bestSell.vendor.trader?.name} <span style={{ color: 'var(--state-ok-text)' }}>{fmt(bestSellRUB)}</span></>
                              : <span style={{ color: 'var(--text-dim)' }}>—</span>}
                          </div>
                          {/* フリマ価格 */}
                          <div style={{ width: 260, flexShrink: 0, fontSize: 12, whiteSpace: 'nowrap' }}>
                            {fleaLow > 0 || fleaHigh > 0 ? (
                              <>
                                <span style={{ color: 'var(--state-ok-text)' }} title="最安値（24h）">{fmt(fleaLow)}</span>
                                <span style={{ color: 'var(--text-dim)', margin: '0 3px' }}>/</span>
                                <span style={{ color: 'var(--text-secondary)' }} title="平均値（24h）">{fmt(fleaAvg)}</span>
                                <span style={{ color: 'var(--text-dim)', margin: '0 3px' }}>/</span>
                                <span style={{ color: 'var(--danger-text)' }} title="最高値（24h）">{fmt(fleaHigh)}</span>
                              </>
                            ) : (
                              <span style={{ color: 'var(--text-dim)' }}>—</span>
                            )}
                          </div>
                        </div>
                        <div style={{ width: 90, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                          <StashControl itemId={item.id} have={have} onUpdate={updateStash} />
                        </div>
                        <Icon name={historyOpen ? 'chevron-up' : 'chevron-down'} size={16}
                          color={historyOpen ? 'var(--accent)' : 'var(--text-dim)'} />
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleWatchBoard(item.id); }}
                          title={isWatched ? 'ウォッチボードから外す' : 'ウォッチボードに追加'}
                          style={{
                            background: isWatched ? 'var(--accent-muted)' : '#2d3748', border: 'none', borderRadius: 4,
                            color: isWatched ? 'var(--accent)' : 'var(--text-secondary)', cursor: 'pointer', padding: '4px 10px', fontSize: 13, flexShrink: 0,
                            display: 'flex', alignItems: 'center',
                          }}>
                          <Icon name="eye" size={14} color={isWatched ? 'var(--accent)' : 'var(--text-secondary)'} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); isPinned ? unpinItem(item.id) : pinItem(item); }}
                          title={isPinned ? 'ピンを外す' : 'ピン止め'}
                          style={{
                            background: isPinned ? '#7c3aed' : '#2d3748', border: 'none', borderRadius: 4,
                            color: isPinned ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', padding: '4px 10px', fontSize: 13, flexShrink: 0,
                            display: 'flex', alignItems: 'center',
                          }}>
                          <Icon name="pin" size={14} color={isPinned ? '#fff' : 'var(--text-secondary)'} />
                        </button>
                      </div>
                      {historyOpen && (
                        <div className="flea-chart-panel">
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Icon name="chart-bar" size={13} color="var(--accent)" />
                            <strong style={{ color: 'var(--text-primary)' }}>{item.name}</strong> のフリマ価格推移
                          </div>
                          <FleaHistoryChart {...(historyCache[item.id] || { loading: true })} showPeriodSelector />
                        </div>
                      )}
                      </React.Fragment>
                    );
                  })}
                </div>
                {filteredItems.length === 200 && (
                  <div style={{ color: 'var(--text-dim)', fontSize: 12, marginTop: 8 }}>※ 最大200件まで表示。絞り込むには検索ワードを入力してください。</div>
                )}
              </>
            )}
          </div>
        </div>
      )}

