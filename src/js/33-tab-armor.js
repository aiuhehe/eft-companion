
      {/* ===== TAB: ARMOR PLATES (アーマープレート) ===== */}
      {activeTab === 'armor' && (
        <div>
          <div className="section" style={{ paddingBottom: 12 }}>
            <div style={{ display: 'flex', gap: 16, marginBottom: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <div className="section-title" style={{ marginBottom: 0 }}>
                <Icon name="shield" size={14} color="var(--accent)" /> プレート一覧（クラス別・耐久値順）
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>クラス:</span>
                {[[0, '全て'], [3, '3+'], [4, '4+'], [5, '5+'], [6, '6']].map(([val, label]) => (
                  <button key={val} onClick={() => setArmorMinClass(val)} className="btn btn-sm"
                    style={{
                      background: armorMinClass === val ? 'var(--accent)' : 'var(--bg-card)',
                      color: armorMinClass === val ? 'var(--accent-on)' : 'var(--text-secondary)',
                      border: '1px solid var(--border)', fontWeight: armorMinClass === val ? 'bold' : 'normal',
                    }}>{label}</button>
                ))}
              </div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <span>ブラント透過率: 弾丸が貫通しなかった場合にダメージの何%が素通りするか。低いほど防御力が高い。</span>
            </div>
          </div>

          {apiData.armorPlates.length === 0 ? (
            <div className="section" style={{ color: 'var(--text-dim)', fontSize: 13 }}>APIデータを取得してください。</div>
          ) : (
            armorByClass.map(({ cls, items }) => {
              if (armorMinClass === 6 && cls !== 6) return null;
              if (armorMinClass > 0 && armorMinClass < 6 && cls < armorMinClass) return null;
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
                          gridTemplateColumns: '40px 34px minmax(130px,1fr) 52px 52px minmax(0,0.8fr) minmax(0,1.4fr)',
                          alignItems: 'center', gap: 8, padding: '5px 8px',
                          background: 'var(--bg-secondary)', borderRadius: 6, border: '1px solid var(--border-light)',
                        }}>
                          {/* クラスバッジ */}
                          <span title={`アーマークラス ${cls}`} style={{
                            textAlign: 'center', fontWeight: 'bold', fontSize: 12,
                            color: clsColor, background: clsBg, borderRadius: 4, padding: '2px 4px',
                          }}>Cls {cls}</span>
                          {/* アイコン */}
                          <span style={{ display: 'inline-flex', justifyContent: 'center' }}>
                            {item.iconLink && <img src={item.iconLink} alt="" className="item-icon-32" onError={e => { e.target.style.display = 'none'; }} />}
                          </span>
                          {/* 名前 */}
                          <span style={{ fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            title={item.name}>{item.name}</span>
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

