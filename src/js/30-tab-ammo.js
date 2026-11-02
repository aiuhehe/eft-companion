      {/* ===== TAB: AMMO (弾薬) ===== */}
      {activeTab === 'ammo' && (
        <div>
          <div className="section" style={{ paddingBottom: 12 }}>
            <div className="section-title" style={{ marginBottom: 10 }}>
              <Icon name="target" size={14} color="var(--accent)" /> 弾薬一覧（口径別）
            </div>
            {/* 絞り込み・並び順（ラベル列＋ボタン列のグリッドで縦に揃える） */}
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 10, rowGap: 6, alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>貫通力</span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[[0, '全て'], [20, '20+'], [35, '35+'], [47, '47+']].map(([val, label]) => (
                  <button key={val} onClick={() => setAmmoMinPen(val)} className="btn btn-sm"
                    style={{
                      background: ammoMinPen === val ? 'var(--accent)' : 'var(--bg-card)',
                      color: ammoMinPen === val ? 'var(--accent-on)' : 'var(--text-secondary)',
                      border: '1px solid var(--border)', fontWeight: ammoMinPen === val ? 'bold' : 'normal',
                    }}>{label}</button>
                ))}
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>肉ダメ</span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[[0, '全て'], [50, '50+'], [70, '70+'], [100, '100+'], [120, '120+'], [140, '140+'], [160, '160+']].map(([val, label]) => (
                  <button key={val} onClick={() => setAmmoMinDmg(val)} className="btn btn-sm"
                    style={{
                      background: ammoMinDmg === val ? 'var(--danger-bg-mid)' : 'var(--bg-card)',
                      color: ammoMinDmg === val ? 'var(--danger-text)' : 'var(--text-secondary)',
                      border: `1px solid ${ammoMinDmg === val ? 'var(--danger-text)' : 'var(--border)'}`,
                      fontWeight: ammoMinDmg === val ? 'bold' : 'normal',
                    }}>{label}</button>
                ))}
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>並び順</span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[
                  ['pen',     '貫通力の高い順'],
                  ['damage',  '肉ダメの高い順'],
                  ['caliber', '口径大きい順'],
                  ['weapons', '武器数多い順'],
                ].map(([val, label]) => (
                  <button key={val} onClick={() => setAmmoCaliberSort(val)} className="btn btn-sm"
                    style={{
                      background: ammoCaliberSort === val ? 'var(--accent)' : 'var(--bg-card)',
                      color: ammoCaliberSort === val ? 'var(--accent-on)' : 'var(--text-secondary)',
                      border: '1px solid var(--border)', fontWeight: ammoCaliberSort === val ? 'bold' : 'normal',
                    }}>{label}</button>
                ))}
              </div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
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
              ammoMinDmg={ammoMinDmg}
            />
          )}
        </div>
      )}

