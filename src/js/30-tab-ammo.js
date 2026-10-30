      {/* ===== TAB: AMMO (弾薬) ===== */}
      {activeTab === 'ammo' && (
        <div>
          <div className="section" style={{ paddingBottom: 12 }}>
            <div style={{ display: 'flex', gap: 16, marginBottom: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <div className="section-title" style={{ marginBottom: 0 }}>
                <Icon name="target" size={14} color="var(--accent)" /> 弾薬一覧（口径別）
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>貫通力:</span>
                {[[0, '全て'], [20, '20+'], [35, '35+'], [47, '強い弾 47+']].map(([val, label]) => (
                  <button key={val} onClick={() => setAmmoMinPen(val)} className="btn btn-sm"
                    style={{
                      background: ammoMinPen === val ? 'var(--accent)' : 'var(--bg-card)',
                      color: ammoMinPen === val ? 'var(--accent-on)' : 'var(--text-secondary)',
                      border: '1px solid var(--border)', fontWeight: ammoMinPen === val ? 'bold' : 'normal',
                    }}>{label}</button>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>並び順:</span>
                {[
                  ['pen',     'PEN最大順',  'target'],
                  ['caliber', '口径大きい順', 'sort'],
                  ['weapons', '武器数多い順', 'backpack'],
                ].map(([val, label, icon]) => (
                  <button key={val} onClick={() => setAmmoCaliberSort(val)} className="btn btn-sm"
                    style={{
                      background: ammoCaliberSort === val ? 'var(--accent)' : 'var(--bg-card)',
                      color: ammoCaliberSort === val ? 'var(--accent-on)' : 'var(--text-secondary)',
                      border: '1px solid var(--border)', fontWeight: ammoCaliberSort === val ? 'bold' : 'normal',
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                    }}>
                    <Icon name={icon} size={11} color={ammoCaliberSort === val ? 'var(--accent-on)' : 'var(--text-secondary)'} />
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <span>全弾フリマ禁止(noFlea)。</span>
              <span><Icon name="list-check" size={11} color="var(--accent)" /> タスク解禁 / <Icon name="home" size={11} color="var(--info)" /> クラフト はクリックで該当ページへ遷移。</span>
              <span><Icon name="backpack" size={11} color="var(--text-dim)" /> 口径名をクリックすると使用できる銃を表示。</span>
            </div>
          </div>

          {apiData.ammo.length === 0 ? (
            <div className="section" style={{ color: 'var(--text-dim)', fontSize: 13 }}>APIデータを取得してください。</div>
          ) : (
            <AmmoCaliberContent
              sortedAmmoByCaliber={sortedAmmoByCaliber}
              ammoMinPen={ammoMinPen}
            />
          )}
        </div>
      )}

