
      {/* ===== TAB: ARMOR PLATES (アーマープレート) ===== */}
      {activeTab === 'armor' && (
        <div>
          <div className="section" style={{ paddingBottom: 12 }}>
            <div className="section-title" style={{ marginBottom: 10 }}>
              <Icon name="shield" size={14} color="var(--accent)" /> プレート一覧（クラス別）
            </div>
            {/* クラス・部位フィルタ（どちらも複数選択。何も選ばない＝「全て」）。弾薬タブと同じくラベル列＋ボタン列のグリッドで縦に揃える */}
            <div className="armor-filters">
              {[
                { label: 'クラス', group: 'is-class', selected: armorClasses, setSelected: setArmorClasses,
                  options: armorClassOptions.map(c => [c, String(c), `Class ${c}`]) },
                { label: '部位', group: 'is-zone', selected: armorZones, setSelected: setArmorZones,
                  options: ARMOR_ZONE_FILTERS.map(([kind, label]) => [kind, label, kind === 'front' ? 'FR. PLATE / F. PLATE（前面）' : label]) },
              ].map(({ label, group, selected, setSelected, options }) => (
                <React.Fragment key={group}>
                  <span className="armor-filter-label">{label}</span>
                  <div className="armor-filter">
                  <button className={`armor-filter-btn ${group}${selected.length === 0 ? ' is-active' : ''}`}
                    onClick={() => setSelected([])}>全て</button>
                  {options.map(([val, text, title]) => {
                    const on = selected.includes(val);
                    return (
                      <button key={val} title={title} className={`armor-filter-btn ${group}${on ? ' is-active' : ''}`}
                        onClick={() => setSelected(prev => {
                          const next = on ? prev.filter(v => v !== val) : [...prev, val];
                          return next.length === options.length ? [] : next; // 全部選んだら「全て」に戻す
                        })}>{text}</button>
                    );
                  })}
                  </div>
                </React.Fragment>
              ))}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <span>ブラント透過率: 弾丸が貫通しなかった場合にダメージの何%が素通りするか。低いほど防御力が高い。</span>
              <span>比べ方: クラス → 耐久値 → ブラント透過率。各クラスの「ブラント」見出しをクリックで低い順 → 高い順 → 耐久値順。クラス・部位は複数選択でき、選んだもののどれかに当てはまるプレートを表示。</span>
            </div>
          </div>

          {apiData.armorPlates.length === 0 ? (
            <div className="section" style={{ color: 'var(--text-dim)', fontSize: 13 }}>APIデータを取得してください。</div>
          ) : armorByClass.length === 0 ? (
            <div className="section" style={{ color: 'var(--text-dim)', fontSize: 13 }}>選択したクラス・部位に合うプレートはありません。</div>
          ) : (
            armorByClass.map(({ cls, items }) => {
              const clsColor = cls >= 6 ? '#f59e0b' : cls === 5 ? '#fb923c' : cls === 4 ? '#facc15' : cls === 3 ? '#4ade80' : 'var(--text-dim)';
              const clsBg   = cls >= 6 ? 'rgba(245,158,11,0.15)' : cls === 5 ? 'rgba(251,146,60,0.15)' : cls === 4 ? 'rgba(250,204,21,0.12)' : cls === 3 ? 'rgba(74,222,128,0.12)' : 'var(--bg-card)';
              return (
                <div key={cls} className="section" style={{ marginBottom: 12 }}>
                  <div className="section-title" style={{ marginBottom: 8 }}>
                    <Icon name="shield" size={13} color={clsColor} />
                    <span style={{ color: clsColor }}>Class {cls}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 'normal', marginLeft: 6 }}>{items.length}種</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {/* 列見出し（ブラント透過率でクラスごとに並び替え） */}
                    <div style={{
                      display: 'grid', gridTemplateColumns: ARMOR_GRID_COLS, alignItems: 'center', gap: 8,
                      padding: '0 8px', fontSize: 10, color: 'var(--text-dim)',
                    }}>
                      <span style={{ textAlign: 'center' }}>クラス</span>
                      <span style={{ textAlign: 'center' }}>耐久値</span>
                      <button
                        onClick={() => setArmorBluntSort(prev => {
                          const next = { ...prev };
                          const cur = prev[cls];
                          if (cur === 'asc') next[cls] = 'desc';
                          else if (cur === 'desc') delete next[cls];
                          else next[cls] = 'asc';
                          return next;
                        })}
                        title={armorBluntSort[cls] === 'asc' ? '低い順（クリックで高い順）'
                          : armorBluntSort[cls] === 'desc' ? '高い順（クリックで耐久値順に戻す）'
                          : '耐久値順（クリックでブラント透過率の低い順）'}
                        style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 2,
                          fontSize: 10, padding: '1px 2px', borderRadius: 4, cursor: 'pointer', whiteSpace: 'nowrap',
                          background: armorBluntSort[cls] ? 'var(--accent-muted)' : 'transparent',
                          color: armorBluntSort[cls] ? 'var(--accent)' : 'var(--text-dim)',
                          border: `1px solid ${armorBluntSort[cls] ? 'var(--accent)' : 'var(--border)'}`,
                        }}>
                        ブラント
                        <Icon name={armorBluntSort[cls] === 'desc' ? 'chevron-down' : armorBluntSort[cls] === 'asc' ? 'chevron-up' : 'sort'} size={10}
                          color={armorBluntSort[cls] ? 'var(--accent)' : 'var(--text-dim)'} />
                      </button>
                      <span />
                      <span>名前</span>
                      <span>部位</span>
                      <span>入手手段</span>
                    </div>
                    {items.map(item => {
                      const p = item.properties || {};
                      const zones = (p.zones || []);
                      const blunt = p.bluntThroughput != null ? Math.round(p.bluntThroughput * 100) : null;
                      const flea = (item.buyFor || []).some(o => (o.vendor || {}).normalizedName === 'flea-market');
                      const traders = (item.buyFor || [])
                        .filter(o => (o.vendor || {}).normalizedName !== 'flea-market' && o.vendor?.minTraderLevel)
                        .map(o => ({ name: o.vendor.name, ll: o.vendor.minTraderLevel, task: o.vendor.taskUnshield }));
                      const barters = (item.bartersFor || []).map(b => ({ name: b.trader.name, level: b.level, task: b.taskUnshield }));
                      const crafts = (item.craftsFor || []).map(c => ({ station: c.station.name, stationId: c.station.id, level: c.level }));
                      const chipBase = {
                        fontSize: 11, padding: '2px 7px', borderRadius: 10, whiteSpace: 'nowrap',
                        display: 'inline-flex', alignItems: 'center', gap: 3, border: '1px solid transparent',
                      };
                      return (
                        <div key={item.id} style={{
                          display: 'grid',
                          gridTemplateColumns: ARMOR_GRID_COLS,
                          alignItems: 'center', gap: 8, padding: '5px 8px',
                          background: 'var(--bg-secondary)', borderRadius: 6, border: '1px solid var(--border-light)',
                        }}>
                          {/* クラスバッジ */}
                          <span title={`アーマークラス ${cls}`} style={{
                            textAlign: 'center', fontWeight: 'bold', fontSize: 12,
                            color: clsColor, background: clsBg, borderRadius: 4, padding: '2px 4px',
                          }}>Cls {cls}</span>
                          {/* 耐久値 */}
                          <span title="最大耐久値" style={{
                            textAlign: 'center', fontWeight: 'bold', fontSize: 13,
                            color: 'var(--accent)', background: 'var(--accent-muted)', borderRadius: 4, padding: '2px 4px',
                          }}>{p.durability ?? '—'}</span>
                          {/* ブラント透過率 */}
                          <span title="ブラント透過率（低いほど良い）" style={{
                            textAlign: 'center', fontWeight: 'bold', fontSize: 12,
                            color: 'var(--text-secondary)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 4px',
                          }}>{blunt != null ? `${blunt}%` : '—'}</span>
                          {/* アイコン */}
                          <span style={{ display: 'inline-flex', justifyContent: 'center' }}>
                            {item.iconLink && <img src={item.iconLink} alt="" className="item-icon-32" onError={e => { e.target.style.display = 'none'; }} />}
                          </span>
                          {/* 名前 */}
                          <span style={{ fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            title={item.name}>{item.name}</span>
                          {/* カバーゾーン */}
                          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                            {zones.length > 0 ? zones.map((z, i) => (
                              <span key={i} style={{
                                fontSize: 10, padding: '1px 5px', borderRadius: 8,
                                background: 'var(--info-bg-weak)', color: 'var(--info)', border: '1px solid var(--info-border)',
                                whiteSpace: 'nowrap',
                              }}>{z}</span>
                            )) : <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>—</span>}
                          </div>
                          {/* 入手手段 */}
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                            {traders.map((t, i) => (
                              <span key={'tr'+i} style={{ ...chipBase, background: 'var(--bg-card)', color: 'var(--text-secondary)', borderColor: 'var(--border)' }}>
                                {t.name} LL{t.ll}
                                {t.task && <span style={{ fontSize: 9, color: 'var(--accent)', marginLeft: 2 }}>(タスク)</span>}
                              </span>
                            ))}
                            {flea && (
                              <span style={{ ...chipBase, background: 'var(--warn-bg-weak)', color: 'var(--warn-text)', borderColor: 'var(--warn)' }}>
                                <Icon name="shopping-cart" size={10} color="var(--warn)" /> フリマ
                              </span>
                            )}
                            {barters.map((b, i) => (
                              <span key={'bt'+i} style={{ ...chipBase, background: 'var(--warn-bg-weak)', color: 'var(--warn-text)', borderColor: 'var(--warn)' }}>
                                <Icon name="shopping-cart" size={10} color="var(--warn)" /> {b.name} LL{b.level} 交換
                                {b.task && <span style={{ fontSize: 9, color: 'var(--accent)', marginLeft: 2 }}>(タスク)</span>}
                              </span>
                            ))}
                            {crafts.map((c, i) => (
                              <button key={'cr'+i} onClick={() => goToHideoutStation(c.stationId)}
                                style={{ ...chipBase, cursor: 'pointer', background: 'var(--info-bg)', color: 'var(--info)', borderColor: 'var(--info)' }}
                                title="ハイドアウトへ移動">
                                <Icon name="home" size={10} color="var(--info)" /> {c.station} Lv{c.level}
                              </button>
                            ))}
                            {traders.length === 0 && !flea && barters.length === 0 && crafts.length === 0 && (
                              <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>ルートのみ</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

