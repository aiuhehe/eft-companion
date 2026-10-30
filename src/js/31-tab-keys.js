      {/* ===== TAB: KEYS (鍵一覧) ===== */}
      {activeTab === 'keys' && (
        <div>
          {/* コントロール */}
          <div className="section">
            <div className="section-title"><Icon name="lock" size={14} color="var(--accent)" /> 鍵一覧（フリマ価格推移）</div>
            {apiData.items.length === 0 ? (
              <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>APIデータを取得してください。</div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
                  <div className="key-seg">
                    {[['list', 'リスト'], ['overlay', '重ねグラフ']].map(([v, l]) => (
                      <button key={v} className={`key-seg-btn ${keyView === v ? 'active' : ''}`} onClick={() => setKeyView(v)}>{l}</button>
                    ))}
                  </div>
                  <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    平均価格しきい値
                    <input type="text" value={keyThreshold} onChange={e => setKeyThreshold(e.target.value)}
                      placeholder="例: 50000 / 5万 / 100k" style={{ width: 130 }} />
                    ルーブル以上
                  </label>
                  <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Icon name="sort" size={13} color="var(--text-secondary)" /> 並び替え
                    <select value={keySort} onChange={e => setKeySort(e.target.value)}>
                      <option value="avgDesc">平均価格 高い順</option>
                      <option value="avgAsc">平均価格 安い順</option>
                      <option value="name">名前順</option>
                    </select>
                  </label>
                  <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input type="checkbox" checked={keyGroupByMap} onChange={e => setKeyGroupByMap(e.target.checked)} />
                    マップ別に分ける
                  </label>
                  <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>該当 {keysFiltered.length} / 全 {allKeys.length} 鍵</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                  ※ マップ分類は鍵の英語名からの推定（API にマップ情報が無いため・不正確な場合あり）。未分類は「その他」。
                  重ねグラフはカーソルを合わせるとどの鍵の線か表示。しきい値で安い鍵を除外してグラフを見やすくできます。
                </div>
              </>
            )}
          </div>

          {/* 本体 */}
          {apiData.items.length > 0 && (
            keyGroupByMap ? (
              keyMapOrder.length === 0 ? (
                <div className="section" style={{ color: 'var(--text-dim)', fontSize: 13 }}>
                  該当する鍵がありません。しきい値を下げてください。
                </div>
              ) : keyMapOrder.map(mp => {
                const keys = keysByMap[mp] || [];
                const open = !!keyOpenMaps[mp];
                return (
                  <div key={mp} className="section">
                    <div className="section-title" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                      onClick={() => toggleKeyMap(mp)}>
                      <Icon name={open ? 'chevron-down' : 'chevron-right'} size={14} color="var(--text-dim)" />
                      <Icon name="map" size={14} color="var(--accent)" /> {mp}
                      <span style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 'normal' }}>（{keys.length}）</span>
                    </div>
                    {open && (keyView === 'overlay' ? renderKeyOverlay(keys) : renderKeyList(keys))}
                  </div>
                );
              })
            ) : (
              <div className="section">
                {keyView === 'overlay' ? renderKeyOverlay(keysFiltered) : renderKeyList(keysFiltered)}
              </div>
            )
          )}
        </div>
      )}

