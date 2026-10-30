      {/* ===== TAB: OCR ===== */}
      {activeTab === 'ocr' && (
        <div>
          {/* ドロップゾーン */}
          <div className="section">
            <div className="section-title"><Icon name="camera" size={14} color="var(--accent)" /> スクリーンショットから登録</div>
            <div
              onDrop={e => { e.preventDefault(); setOcrDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleOcrFile(f); }}
              onDragOver={e => { e.preventDefault(); setOcrDragOver(true); }}
              onDragLeave={() => setOcrDragOver(false)}
              onClick={() => { if (!ocrFile) document.getElementById('ocrFileInput').click(); }}
              style={{
                border: `2px dashed ${ocrDragOver ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 8, padding: '28px 16px', textAlign: 'center',
                cursor: ocrFile ? 'default' : 'pointer',
                background: ocrDragOver ? '#1e2536' : 'transparent',
                transition: 'all 0.2s',
              }}
            >
              {!ocrFile ? (
                <>
                  <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'center' }}><Icon name="camera" size={36} color="var(--text-dim)" /></div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>画像をドラッグ＆ドロップ、またはクリックして選択</div>
                  <div style={{ color: 'var(--text-dim)', fontSize: 12, marginTop: 6 }}>
                    クリップボードの画像は <kbd style={{ background: 'var(--border)', borderRadius: 3, padding: '1px 5px', fontSize: 11 }}>Ctrl+V</kbd> で貼り付け可 ・ JPG / PNG ・ 最大 10MB
                  </div>
                </>
              ) : (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <img ref={ocrImgRef} src={ocrFile.url} alt="preview"
                    style={{ maxWidth: '100%', maxHeight: 360, borderRadius: 6, border: '1px solid var(--border)', display: 'block' }} />
                </div>
              )}
              <input id="ocrFileInput" type="file" accept=".jpg,.jpeg,.png" style={{ display: 'none' }}
                onChange={e => { if (e.target.files[0]) handleOcrFile(e.target.files[0]); e.target.value = ''; }} />
            </div>

            {ocrFile && (
              <>
                {/* クロップスライダー */}
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      ラベル行の高さ: <strong style={{ color: 'var(--accent)' }}>{Math.round(ocrCropRatio * 100)}%</strong>
                    </span>
                    <input type="range" min="10" max="100" step="5"
                      value={Math.round(ocrCropRatio * 100)}
                      onChange={e => setOcrCropRatio(parseInt(e.target.value) / 100)}
                      style={{ flex: 1 }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                    複数行スタッシュ: 100% ／ 1行のみ: 25〜35% が目安
                  </div>
                </div>
                <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button className="btn btn-yellow" onClick={runOcr} disabled={ocrRunning} style={{ minWidth: 120 }}>
                    {ocrRunning
                      ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="refresh" size={13} color="currentColor" style={{ animation: 'spin 1s linear infinite' }} /> OCR解析中… {ocrProgress}%</span>
                      : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="search" size={13} color="var(--accent-on)" /> OCR解析実行</span>}
                  </button>
                  <button className="btn btn-gray" onClick={() => { setOcrFile(null); setOcrMatches([]); setOcrProgress(0); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <Icon name="x" size={13} color="currentColor" /> クリア
                  </button>
                  <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>{ocrFile.name}</span>
                </div>
                {ocrRunning && (
                  <div className="progress-bar" style={{ marginTop: 8 }}>
                    <div className="progress-fill" style={{ width: `${ocrProgress}%` }} />
                  </div>
                )}
              </>
            )}
          </div>

          {/* 撮り方・コツ */}
          <div className="section" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            <div className="section-title"><Icon name="camera" size={14} color="var(--accent)" /> スクリーンショットの撮り方</div>
            <ol style={{ paddingLeft: 20, lineHeight: 2.0, margin: 0 }}>
              <li><kbd style={{ background: 'var(--border)', borderRadius: 3, padding: '1px 5px', fontSize: 11 }}>Win+Shift+S</kbd> で全画面もしくは矩形選択で必要な範囲を選択</li>
              <li>このページに戻って <kbd style={{ background: 'var(--border)', borderRadius: 3, padding: '1px 5px', fontSize: 11 }}>Ctrl+V</kbd> で貼り付け</li>
              <li>必要に応じて範囲選択でアイテム部分を絞り込む</li>
              <li>「実行」ボタンをクリックして OCR 解析開始</li>
            </ol>
            <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--bg-primary)', borderRadius: 6, border: '1px solid var(--border)' }}>
              <div style={{ color: 'var(--accent)', fontSize: 12, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}><Icon name="alert-triangle" size={12} color="var(--accent)" /> 認識精度を上げるコツ</div>
              <ul style={{ paddingLeft: 18, margin: 0, lineHeight: 1.9 }}>
                <li>アイテム名が画面端で途切れないようにする</li>
                <li>ドッグタグが写らないようにする</li>
                <li>弾薬・鍵・武器アタッチメントは手動登録推奨</li>
              </ul>
            </div>
          </div>

          {/* 認識結果 */}
          {ocrMatches.length > 0 && (
            <div className="section">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                <span style={{ color: 'var(--accent)', fontWeight: 'bold', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <Icon name="clipboard-list" size={14} color="var(--accent)" /> 認識結果
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 'normal', fontSize: 12, marginLeft: 8 }}>
                    ({ocrMatches.filter(m => m.item && m.checked).length} 件追加予定)
                  </span>
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-gray btn-sm" onClick={() => setOcrMatches(prev => prev.map(x => x.item ? { ...x, checked: true } : x))}>全選択</button>
                  <button className="btn btn-gray btn-sm" onClick={() => setOcrMatches(prev => prev.map(x => ({ ...x, checked: false })))}>全解除</button>
                  <button className="btn btn-yellow" disabled={!ocrMatches.some(m => m.checked && m.item)} onClick={addOcrItemsToStash} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <Icon name="circle-check" size={13} color="var(--accent-on)" /> 在庫に追加
                  </button>
                </div>
              </div>

              {apiData.items.length === 0 && (
                <div style={{ marginBottom: 8, color: 'var(--warn)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Icon name="alert-triangle" size={12} color="var(--warn)" /> アイテムデータが未取得です。「APIデータ取得」を先に実行してください。
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {ocrMatches.map((m, i) => {
                  const isUnmatched = !m.item;
                  // 補完候補0件の未認識行は非表示
                  if (isUnmatched && (!m.looseCandidates || m.looseCandidates.length === 0)) return null;
                  const dropOpen = ocrDropdownIdx === i;
                  // 補完候補ドロップダウン内の検索フィルター（全アイテムを対象）
                  const dropSearchLow = ocrDropdownSearch.toLowerCase();
                  const searchedItems = dropOpen && isUnmatched && dropSearchLow.length >= 1
                    ? apiData.items.filter(it =>
                        (it.name || '').toLowerCase().includes(dropSearchLow) ||
                        (it.shortName || '').toLowerCase().includes(dropSearchLow)
                      ).slice(0, 20)
                    : null; // null = 検索なし → looseCandidates を表示
                  return (
                    <div key={i} className="ocr-row" style={{
                      background: isUnmatched ? '#1a0505' : 'var(--bg-primary)',
                      border: `1px solid ${isUnmatched ? 'var(--danger-deep)' : 'var(--border)'}`,
                    }}>
                      {/* チェックボックス */}
                      <input type="checkbox" checked={!!m.checked} disabled={isUnmatched}
                        onChange={e => setOcrMatches(prev => prev.map((x, j) => j === i ? { ...x, checked: e.target.checked } : x))}
                        style={{ width: 18, height: 18, cursor: isUnmatched ? 'default' : 'pointer', accentColor: 'var(--accent)', flexShrink: 0 }} />

                      {/* アイテム情報 or 未認識トークン */}
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {isUnmatched ? (
                          <>
                            <span style={{ color: 'var(--danger-text)', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="alert-triangle" size={12} color="var(--danger-text)" /> {m.line}</span>
                            <div style={{ position: 'relative' }}>
                              <button
                                onClick={e => { e.stopPropagation(); setOcrDropdownIdx(dropOpen ? null : i); }}
                                className="cand-btn"
                                style={{ background: 'var(--info-deep)', color: 'var(--info)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <Icon name="chevron-down" size={12} color="var(--info)" /> 補完候補 {m.looseCandidates.length}件
                              </button>
                              {dropOpen && (
                                <div onClick={e => e.stopPropagation()} className="ocr-dropdown">
                                  {/* 検索欄 */}
                                  <div className="ocr-dropdown-search">
                                    <input
                                      type="text"
                                      placeholder="アイテム名 / shortName で検索..."
                                      value={ocrDropdownSearch}
                                      onChange={e => setOcrDropdownSearch(e.target.value)}
                                      onClick={e => e.stopPropagation()}
                                      autoFocus
                                      style={{ width: '100%', fontSize: 12, padding: '4px 8px', boxSizing: 'border-box' }}
                                    />
                                  </div>
                                  {/* 候補一覧：検索中は全アイテム、未入力は looseCandidates */}
                                  <div className="ocr-cand-list">
                                    {(searchedItems ?? m.looseCandidates.map(c => ({ ...c.item, _score: c.score }))).map((entry, ci) => {
                                      // entry は searchedItems なら item オブジェクト、looseCandidates なら {item, score} 形式
                                      const item = entry.id ? entry : entry.item;
                                      const score = entry._score ?? entry.score;
                                      return (
                                        <div key={item.id + ci}
                                          onClick={() => {
                                            setOcrMatches(prev => prev.map((x, j) => j === i
                                              ? { ...x, item, checked: true, topCandidates: [{ item, score: score || 0 }], looseCandidates: [] }
                                              : x));
                                            setOcrDropdownIdx(null);
                                          }}
                                          className="ocr-cand-row"
                                          onMouseEnter={e => e.currentTarget.style.background='#2d3748'}
                                          onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                                          {item.iconLink && <img src={item.iconLink} alt="" className="cand-icon" onError={e=>{e.target.style.display='none';}} />}
                                          <span style={{ fontSize: 12, flex: 1 }}>{item.name}</span>
                                          {item.shortName && <span style={{ fontSize: 10, color: '#6b7280' }}>{item.shortName}</span>}
                                          {score > 0 && <span style={{ fontSize: 10, color: '#4b5563', marginLeft: 4 }}>{Math.round(score*100)}%</span>}
                                        </div>
                                      );
                                    })}
                                    {searchedItems !== null && searchedItems.length === 0 && (
                                      <div style={{ padding: '10px', color: 'var(--text-dim)', fontSize: 12, textAlign: 'center' }}>該当なし</div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </>
                        ) : (
                          <>
                            {m.item.iconLink && <img src={m.item.iconLink} alt="" style={{ width: 24, height: 24, objectFit: 'contain', background: 'var(--bg-secondary)', borderRadius: 3, flexShrink: 0 }} onError={e=>{e.target.style.display='none';}} />}
                            <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{m.item.name}</span>
                            {m.topCandidates?.length > 1 && (
                              <div style={{ position: 'relative' }}>
                                <button
                                  onClick={e => { e.stopPropagation(); setOcrDropdownIdx(dropOpen ? null : i); }}
                                  className="cand-btn"
                                  style={{ background: 'var(--warn-deep)', color: 'var(--warn-text)' }}>
                                  ▼ {m.topCandidates.length}候補
                                </button>
                                {dropOpen && (() => {
                                  const matchedSearchLow = ocrDropdownSearch.toLowerCase();
                                  const matchedSearchedItems = matchedSearchLow.length >= 1
                                    ? apiData.items.filter(it =>
                                        (it.name || '').toLowerCase().includes(matchedSearchLow) ||
                                        (it.shortName || '').toLowerCase().includes(matchedSearchLow) ||
                                        (it.nameEn || '').toLowerCase().includes(matchedSearchLow) ||
                                        (it.shortNameEn || '').toLowerCase().includes(matchedSearchLow)
                                      ).slice(0, 20)
                                    : null;
                                  const displayList = matchedSearchedItems
                                    ?? m.topCandidates.map(c => ({ ...c.item, _score: c.score }));
                                  return (
                                    <div onClick={e => e.stopPropagation()} className="ocr-dropdown">
                                      {/* 検索欄 */}
                                      <div className="ocr-dropdown-search">
                                        <input
                                          type="text"
                                          placeholder="アイテム名 / shortName で検索..."
                                          value={ocrDropdownSearch}
                                          onChange={e => setOcrDropdownSearch(e.target.value)}
                                          onClick={e => e.stopPropagation()}
                                          autoFocus
                                          style={{ width: '100%', fontSize: 12, padding: '4px 8px', boxSizing: 'border-box' }}
                                        />
                                      </div>
                                      {/* 候補一覧：検索中は全アイテム、未入力はtopCandidates */}
                                      <div className="ocr-cand-list">
                                        {displayList.map((entry, ci) => {
                                          const item = entry.id ? entry : entry.item;
                                          const score = entry._score ?? entry.score;
                                          const isCurrent = item.id === m.item.id;
                                          return (
                                            <div key={item.id + ci}
                                              onClick={() => {
                                                setOcrMatches(prev => prev.map((x, j) => j === i
                                                  ? { ...x, item, topCandidates: [{ item, score: score || 0 }, ...x.topCandidates.filter(t => t.item.id !== item.id)] }
                                                  : x));
                                                setOcrDropdownIdx(null);
                                                setOcrDropdownSearch('');
                                              }}
                                              className="ocr-cand-row"
                                              style={{ background: isCurrent ? '#2d3748' : 'transparent' }}
                                              onMouseEnter={e => e.currentTarget.style.background='#374151'}
                                              onMouseLeave={e => e.currentTarget.style.background = isCurrent ? '#2d3748' : 'transparent'}>
                                              {item.iconLink && <img src={item.iconLink} alt="" className="cand-icon" onError={e=>{e.target.style.display='none';}} />}
                                              <span style={{ fontSize: 12, flex: 1 }}>{item.name}</span>
                                              {isCurrent && <Icon name="check" size={11} color="var(--accent)" />}
                                              {item.shortName && <span style={{ fontSize: 10, color: '#6b7280' }}>{item.shortName}</span>}
                                              {score > 0 && <span style={{ fontSize: 10, color: '#4b5563', marginLeft: 4 }}>{Math.round(score*100)}%</span>}
                                            </div>
                                          );
                                        })}
                                        {matchedSearchedItems !== null && matchedSearchedItems.length === 0 && (
                                          <div style={{ padding: '10px', color: '#64748b', fontSize: 12, textAlign: 'center' }}>該当なし</div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* 個数 */}
                      {!isUnmatched && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                          <button className="btn btn-gray btn-sm" onClick={() => setOcrMatches(prev => prev.map((x, j) => j === i ? { ...x, qty: Math.max(1, x.qty - 1) } : x))}>－</button>
                          <span style={{ minWidth: 24, textAlign: 'center', fontSize: 13 }}>{m.qty}</span>
                          <button className="btn btn-gray btn-sm" onClick={() => setOcrMatches(prev => prev.map((x, j) => j === i ? { ...x, qty: x.qty + 1 } : x))}>＋</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

