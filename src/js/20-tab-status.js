      {/* ===== TAB: STATUS ===== */}
      {activeTab === 'status' && (
        <div>
          {/* Basic Settings */}
          <div className="section">
            <div className="section-title"><Icon name="settings" size={14} color="var(--accent)" /> 基本情報設定</div>
            <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
              <div>
                <div className="setting-label">ゲームモード</div>
                <div style={{ display: 'flex', gap: 12 }}>
                  {[['regular', 'PvP'], ['pve', 'PvE']].map(([val, label]) => (
                    <label key={val} className="radio-label">
                      <input type="radio" name="gameMode" value={val}
                        checked={gameMode === val} onChange={e => setGameMode(e.target.value)} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <div className="setting-label">購入エディション</div>
                <div style={{ display: 'flex', gap: 12 }}>
                  {[['standard', 'スタンダード / その他'], ['eod', 'EoD (+0.20)'], ['unheard', 'Unheard (+0.20)']].map(([val, label]) => (
                    <label key={val} className="radio-label">
                      <input type="radio" name="edition" value={val}
                        checked={edition === val} onChange={e => setEdition(e.target.value)} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <div className="setting-label">表示言語（ハイドアウト名など）</div>
                <div style={{ display: 'flex', gap: 12 }}>
                  {[['ja', '日本語'], ['en', 'English']].map(([val, label]) => (
                    <label key={val} className="radio-label">
                      <input type="radio" name="uiLang" value={val}
                        checked={uiLang === val} onChange={e => setUiLang(e.target.value)} />
                      {label}
                    </label>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>※ 変更後はAPIデータを再取得してください</div>
              </div>
              <div>
                <div className="setting-label">プレイヤーレベル</div>
                <input type="number" min="1" max="80" value={playerLevel}
                  onChange={e => {
                    const v = e.target.value;
                    if (v === '' || v === '-') { setPlayerLevel(v); return; }
                    const n = parseInt(v);
                    if (!isNaN(n)) setPlayerLevel(Math.min(80, Math.max(1, n)));
                  }}
                  onBlur={e => {
                    const n = parseInt(e.target.value);
                    setPlayerLevel(isNaN(n) ? 1 : Math.min(80, Math.max(1, n)));
                  }}
                  style={{ width: 70 }} />
              </div>
            </div>
          </div>

          {/* Theme Picker */}
          <div className="section">
            <div className="section-title"><Icon name="palette" size={14} color="var(--accent)" /> カラーテーマ</div>
            <div style={{display:'flex',gap:14,flexWrap:'wrap',alignItems:'flex-start'}}>
              {THEMES.map(t => (
                <div key={t.id} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                  <button className={`theme-swatch${theme===t.id?' active':''}`}
                    style={{background:t.swatch}} title={t.name} onClick={() => setTheme(t.id)} />
                  <span style={{fontSize:9,color:theme===t.id?'var(--accent)':'var(--text-dim)',textAlign:'center',maxWidth:56,lineHeight:1.2}}>
                    {t.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Full Backup Export / Restore */}
          <div className="section">
            <div className="section-title"><Icon name="settings" size={14} color="var(--accent)" /> データのバックアップ</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn" style={{ background: 'var(--accent)', color: 'var(--accent-on)', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                onClick={exportAllData}>
                <Icon name="upload" size={13} color="var(--accent-on)" /> バックアップを書き出し
              </button>
              <button className="btn" style={{ fontSize: 12, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                onClick={importAllData}>
                <Icon name="download" size={12} color="var(--text-primary)" /> バックアップから復元
              </button>
              <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                全モード（PvP/PvE/Season）の進捗・設定・カスタムタスク・マップピン等をまとめて保存 / 現在の保存量 約{(getBackupSizeChars() / 1e6).toFixed(2)}MB（ブラウザ上限 約5MB）
              </span>
            </div>
          </div>

          {/* Trader Status */}
          <div className="section">
            <div className="section-title"><Icon name="chart-bar" size={14} color="var(--accent)" /> トレーダー現在値</div>
            <table>
              <thead>
                <tr>
                  <th>トレーダー</th>
                  <th>現在LL</th>
                  <th>信頼度 (Rep)</th>
                  <th>取引額 (各通貨)</th>
                </tr>
              </thead>
              <tbody>
                {TRADER_LIST.map(trader => {
                  const st = traderStatus[trader.id] || { ll: 1, rep: 0, commerce: 0 };
                  const apiTrader = apiData.traders.find(t => t.id === trader.id);
                  const currShortName = (apiTrader?.currency?.shortName || '').toUpperCase();
                  const traderCurrency = currShortName.includes('DOL') || currShortName === 'USD' ? 'USD'
                    : currShortName.includes('EUR') ? 'EUR' : 'RUB';
                  const currencySym = getCurrencySymbol(traderCurrency);
                  return (
                    <tr key={trader.id}>
                      <td style={{ color: 'var(--accent)', fontWeight: 'bold' }}>
                        {trader.name}
                        {trader.noCommerce && <span style={{ fontSize: 10, color: 'var(--text-dim)', marginLeft: 4 }}>(取引額なし)</span>}
                      </td>
                      <td>
                        <select value={st.ll || 1}
                          onChange={e => updateTraderStatus(trader.id, 'll', parseInt(e.target.value))}>
                          {[1, 2, 3, 4].map(l => <option key={l} value={l}>LL{l}</option>)}
                        </select>
                      </td>
                      <td>
                        <input type="number" step="0.01" min="0" max="10"
                          value={st.rep ?? 0}
                          onChange={e => updateTraderStatus(trader.id, 'rep', e.target.value)}
                          onBlur={e => {
                            const n = parseFloat(e.target.value);
                            updateTraderStatus(trader.id, 'rep', isNaN(n) ? 0 : Math.min(10, Math.max(0, n)));
                          }}
                          style={{ width: 80 }} />
                      </td>
                      <td>
                        {trader.noCommerce
                          ? <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>—</span>
                          : <input type="text"
                              value={st.commerce ?? 0}
                              onChange={e => updateTraderStatus(trader.id, 'commerce', e.target.value)}
                              onBlur={e => {
                                const n = parseShorthand(e.target.value);
                                updateTraderStatus(trader.id, 'commerce', n);
                              }}
                              placeholder={`例: 13.4M, 34k (${currencySym})`}
                              style={{ width: 130 }} />
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Hideout Levels */}
          {apiData.hideout.length > 0 && (
            <div className="section">
              <div className="section-title"><Icon name="home" size={14} color="var(--accent)" /> ハイドアウト現在レベル</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {apiData.hideout.map(station => {
                  const maxLv = Math.max(...station.levels.map(l => l.level));
                  const curLv = parseInt(hideoutLevels[station.id] || 0);
                  const displayName = STATION_NAME_OVERRIDES[station.name] ?? station.name;
                  const isStash = station.name?.toLowerCase().includes('stash') || station.name?.includes('スタッシュ');
                  const isCultist = station.name?.toLowerCase().includes('cultist') || station.name?.includes('カルチスト') || station.name?.includes('呪詛') || station.name?.includes('サークル');
                  const isEditionBonus =
                    (isStash && (edition === 'eod' || edition === 'unheard')) ||
                    (isCultist && edition === 'unheard');
                  const bonusLabel = isStash ? (edition === 'unheard' ? 'Unheard特典' : 'EoD特典') : 'Unheard特典';
                  return (
                    <div key={station.id} className="hideout-level-card" style={{
                      border: `1px solid ${isEditionBonus ? '#166534' : '#2d3748'}`,
                    }}>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {displayName}
                        {isEditionBonus && <span style={{ fontSize: 10, background: '#166534', color: 'var(--state-ok-text)', padding: '0 5px', borderRadius: 3 }}>{bonusLabel}</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button className="btn btn-gray btn-sm"
                          onClick={() => setHideoutLevels(p => ({ ...p, [station.id]: Math.max(0, curLv - 1) }))}>－</button>
                        <span style={{ minWidth: 60, textAlign: 'center', fontSize: 13 }}>
                          Lv{curLv} / {maxLv}
                        </span>
                        <button className="btn btn-gray btn-sm"
                          onClick={() => {
                            if (curLv >= maxLv) return;
                            setHideoutLevels(p => ({ ...p, [station.id]: curLv + 1 }));
                            addJournalGet(`${displayName} Lv${curLv + 1}`, 'hideout');
                          }}>＋</button>
                      </div>
                      <div className="progress-bar" style={{ marginTop: 6 }}>
                        <div className={`progress-fill ${curLv === maxLv ? 'green' : ''}`}
                          style={{ width: `${(curLv / maxLv) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ===== WIPE ===== */}
          <div className="section" style={{ border: '2px solid var(--danger-border-strong)', background: 'var(--danger-bg-faint)' }}>
            <div className="section-title" style={{ color: 'var(--danger-text)' }}>
              <Icon name="alert-triangle" size={14} color="var(--danger)" /> ワイプ
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 14px' }}>
              ワイプが来たらここを押してください。スタッシュ・完了タスク・ハイドアウト進行・トレーダー進行度をすべてリセットします。<br />
              <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>欲しいものリスト・ジャーナルはそのまま残ります。ジャーナルにワイプ日として記録されます。</span>
            </p>
            <button onClick={handleWipe} style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              background: 'var(--danger-strong)', color: 'var(--danger-pale)',
              border: '2px solid var(--danger)', borderRadius: 8,
              padding: '12px 28px', fontSize: 16, fontWeight: 'bold', cursor: 'pointer',
              letterSpacing: '0.05em',
            }}>
              <Icon name="alert-triangle" size={20} color="var(--danger-pale)" />
              ワイプ！進行データをリセット
            </button>
          </div>
        </div>
      )}

