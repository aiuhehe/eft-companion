      {/* ===== TAB: WEAPON PRESETS ===== */}
      {activeTab === 'presets' && (() => {
        // トレーダー解放済みLLと照合して最安入手価格を返す。入手不可なら 0
        // traderStatus[id] = { ll, rep, commerce } なので .ll で参照する
        const getBestPrice = (item) => {
          if (!item) return 0;
          let best = item.avg24hPrice > 0 ? item.avg24hPrice : Infinity;
          (item.buyFor || []).forEach(offer => {
            if (!offer.vendor?.trader) return;
            const myLL = traderStatus[offer.vendor.trader.id]?.ll || 0;
            if (myLL >= (offer.vendor.minTraderLevel || 1) && offer.priceRUB > 0) {
              if (offer.priceRUB < best) best = offer.priceRUB;
            }
          });
          return best === Infinity ? 0 : best;
        };

        // 最安値の入手元ラベルも返す（表示用）
        const getBestPriceInfo = (item) => {
          if (!item) return { price: 0, source: null };
          let best = item.avg24hPrice > 0 ? item.avg24hPrice : Infinity;
          let source = item.avg24hPrice > 0 ? 'フリマ' : null;
          (item.buyFor || []).forEach(offer => {
            if (!offer.vendor?.trader) return;
            const myLL = traderStatus[offer.vendor.trader.id]?.ll || 0;
            if (myLL >= (offer.vendor.minTraderLevel || 1) && offer.priceRUB > 0) {
              if (offer.priceRUB < best) {
                best   = offer.priceRUB;
                source = offer.vendor.trader.name + ' LL' + offer.vendor.minTraderLevel;
              }
            }
          });
          return { price: best === Infinity ? 0 : best, source };
        };

        const standardPreset = weaponPresets.find(p => p.id === standardPresetId) || null;
        const standardItemIds = new Set((standardPreset?.parts || []).map(p => p.itemId));

        const addPreset = () => {
          const id = 'preset_' + Date.now();
          const next = [...weaponPresets, { id, name: '新しいプリセット', weapon: presetWeaponFilter || '', ergo: 0, vrecoil: 0, baseErgo: 0, baseVrecoil: 0, baseHrecoil: 0, baseMOA: 0, parts: [] }];
          savePresets(next);
          setPresetEditId(id);
          setPresetSearch('');
        };

        const updatePreset = (id, patch) => {
          savePresets(weaponPresets.map(p => p.id === id ? { ...p, ...patch } : p));
        };

        const duplicatePreset = (preset) => {
          const id   = 'preset_' + Date.now();
          const next = [...weaponPresets, { ...preset, id, name: preset.name + '（コピー）', parts: preset.parts.map(p => ({ ...p })) }];
          savePresets(next);
          setPresetEditId(id);
        };

        const deletePreset = (id) => {
          if (!confirm('このプリセットを削除しますか？')) return;
          savePresets(weaponPresets.filter(p => p.id !== id));
          if (presetEditId === id) setPresetEditId(null);
          if (standardPresetId === id) setStandardPreset(null);
        };

        const addPart = (preset, item) => {
          const existing = preset.parts.find(p => p.itemId === item.id);
          const parts = existing
            ? preset.parts.map(p => p.itemId === item.id ? { ...p, qty: p.qty + 1 } : p)
            : [...preset.parts, { itemId: item.id, itemName: item.name, qty: 1 }];
          updatePreset(preset.id, { parts });
          setPresetSearch('');
        };

        const removePart = (preset, itemId) => {
          updatePreset(preset.id, { parts: preset.parts.filter(p => p.itemId !== itemId) });
        };

        const changePartQty = (preset, itemId, delta) => {
          updatePreset(preset.id, {
            parts: preset.parts.map(p =>
              p.itemId === itemId ? { ...p, qty: Math.max(1, p.qty + delta) } : p
            )
          });
        };

        const getPresetPrice = (preset) =>
          preset.parts.reduce((sum, part) => {
            const item = apiData.items.find(it => it.id === part.itemId);
            return sum + getBestPrice(item) * part.qty;
          }, 0);

        // 登録パーツのmod修正値を集計し理論値を返す。baseXxxが未設定の項目はnull
        const calcPresetStats = (preset) => {
          const modMap = new Map(apiData.weaponMods.map(m => [m.id, m]));
          let ergoModSum = 0;
          let recoilModSum = 0;
          let accuracyModSum = 0;
          let weightSum = 0;
          preset.parts.forEach(part => {
            const mod = modMap.get(part.itemId);
            if (!mod) return;
            if (typeof mod.weight === 'number') weightSum += mod.weight * part.qty;
            if (mod.properties) {
              ergoModSum     += (mod.properties.ergonomics       || 0) * part.qty;
              recoilModSum   += (mod.properties.recoilModifier   || 0) * part.qty;
              accuracyModSum += (mod.properties.accuracyModifier || 0) * part.qty;
            }
          });
          const hasData = ergoModSum !== 0 || recoilModSum !== 0 || weightSum > 0;
          if (!hasData && !preset.baseErgo && !preset.baseVrecoil && !preset.baseHrecoil && !preset.baseMOA) return null;
          return {
            ergo:         preset.baseErgo    ? Math.round((preset.baseErgo || 0) + ergoModSum) : null,
            vrecoil:      preset.baseVrecoil ? Math.round(preset.baseVrecoil * (1 + recoilModSum)) : null,
            hrecoil:      preset.baseHrecoil ? Math.round(preset.baseHrecoil * (1 + recoilModSum)) : null,
            moa:          preset.baseMOA     ? (preset.baseMOA * (1 + accuracyModSum)).toFixed(2) : null,
            weight:       weightSum > 0 ? weightSum.toFixed(2) : null,
            ergoModSum:   Math.round(ergoModSum),
            recoilPct:    (recoilModSum * 100).toFixed(1),
            accuracyPct:  (accuracyModSum * 100).toFixed(1),
          };
        };

        // 登録済み武器名一覧（重複除去・空文字除く）
        const weaponNames = [...new Set(weaponPresets.map(p => p.weapon || '').filter(Boolean))].sort();

        const filteredPresets = presetWeaponFilter
          ? weaponPresets.filter(p => (p.weapon || '') === presetWeaponFilter)
          : weaponPresets;

        const sortedPresets = [...filteredPresets].sort((a, b) => {
          if (presetSort === 'ergo') {
            const ae = calcPresetStats(a)?.ergo ?? a.ergo;
            const be = calcPresetStats(b)?.ergo ?? b.ergo;
            return be - ae;
          }
          if (presetSort === 'vrecoil') {
            const av = calcPresetStats(a)?.vrecoil ?? a.vrecoil;
            const bv = calcPresetStats(b)?.vrecoil ?? b.vrecoil;
            return av - bv;
          }
          return getPresetPrice(a) - getPresetPrice(b);
        });

        const partSearchResults = presetSearch.length >= 2
          ? apiData.items
              .filter(it =>
                (it.name || '').toLowerCase().includes(presetSearch.toLowerCase()) ||
                (it.shortName || '').toLowerCase().includes(presetSearch.toLowerCase())
              )
              .slice(0, 15)
          : [];

        return (
          <div>
            {/* ヘッダー */}
            <div className="section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div className="section-title">
                  <Icon name="tool" size={14} color="var(--accent)" /> 武器プリセット比較
                </div>
                <button className="btn btn-yellow" onClick={addPreset} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <Icon name="plus" size={13} color="var(--accent-on)" /> プリセット追加
                </button>
              </div>

              {/* APIデータ警告 */}
              {apiData.items.length === 0 && (
                <div style={{ marginTop: 10, color: 'var(--warn)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Icon name="alert-triangle" size={12} color="var(--warn)" />
                  フリマ価格を表示するには「APIデータ取得」を先に実行してください。
                </div>
              )}

              {/* 武器フィルター */}
              {weaponNames.length > 0 && (
                <div style={{ display: 'flex', gap: 6, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Icon name="search" size={12} color="var(--text-dim)" /> 武器:
                  </span>
                  <button
                    className={`btn btn-sm ${!presetWeaponFilter ? 'btn-yellow' : 'btn-gray'}`}
                    onClick={() => setPresetWeaponFilter('')}>
                    すべて
                  </button>
                  {weaponNames.map(w => (
                    <button key={w}
                      className={`btn btn-sm ${presetWeaponFilter === w ? 'btn-yellow' : 'btn-gray'}`}
                      onClick={() => setPresetWeaponFilter(presetWeaponFilter === w ? '' : w)}>
                      {w}
                    </button>
                  ))}
                </div>
              )}

              {/* ソート＋共通非表示 */}
              <div style={{ display: 'flex', gap: 6, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Icon name="sort" size={12} color="var(--text-dim)" /> ソート:
                </span>
                {[
                  { key: 'price',   label: '価格 安い順' },
                  { key: 'ergo',    label: 'エルゴ 高い順' },
                  { key: 'vrecoil', label: '垂直反動 低い順' },
                ].map(s => (
                  <button key={s.key}
                    className={`btn btn-sm ${presetSort === s.key ? 'btn-yellow' : 'btn-gray'}`}
                    onClick={() => setPresetSort(s.key)}>
                    {s.label}
                  </button>
                ))}
                {standardPreset && (
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none', marginLeft: 6 }}>
                    <input
                      type="checkbox"
                      checked={hideStandardParts}
                      onChange={e => setHideStandardParts(e.target.checked)}
                      style={{ accentColor: 'var(--accent)', width: 14, height: 14 }}
                    />
                    「{standardPreset.name}」の共通部品を非表示
                  </label>
                )}
              </div>
            </div>

            {/* プリセットなし */}
            {weaponPresets.length === 0 && (
              <div className="section" style={{ color: 'var(--text-dim)', fontSize: 13, textAlign: 'center', padding: '28px 0' }}>
                プリセットがありません。「プリセット追加」ボタンで登録してください。
              </div>
            )}

            {/* プリセット一覧 */}
            {weaponPresets.length > 0 && (
              <div className="section" style={{ padding: 0 }}>
                {/* テーブルヘッダー */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '20px 1fr 70px 80px 140px 28px',
                  gap: 4, padding: '6px 12px',
                  color: 'var(--text-dim)', fontSize: 11,
                  borderBottom: '1px solid var(--border)',
                  background: 'var(--bg-secondary)',
                }}>
                  <span title="標準プリセット"><Icon name="anchor" size={11} color="var(--text-dim)" /></span>
                  <span>プリセット名</span>
                  <span style={{ textAlign: 'center' }}>エルゴ</span>
                  <span style={{ textAlign: 'center' }}>垂直反動</span>
                  <span style={{ textAlign: 'right' }}>フリマ推定価格</span>
                  <span></span>
                </div>

                {sortedPresets.map(preset => {
                  const isOpen     = presetEditId === preset.id;
                  const isStandard = standardPresetId === preset.id;
                  const price      = getPresetPrice(preset);
                  const calc       = calcPresetStats(preset);
                  const displayErgo    = calc?.ergo    ?? preset.ergo;
                  const displayVrecoil = calc?.vrecoil ?? preset.vrecoil;

                  // 標準プリセットと共通のパーツを除いた差分パーツ
                  const diffParts  = preset.parts.filter(p => !standardItemIds.has(p.itemId));
                  const diffPrice  = diffParts.reduce((sum, part) => {
                    const item = apiData.items.find(it => it.id === part.itemId);
                    return sum + getBestPrice(item) * part.qty;
                  }, 0);

                  // 表示するパーツ（チェック時は差分のみ、標準プリセット自身は常に全表示）
                  const visibleParts = (hideStandardParts && !isStandard && standardPreset)
                    ? diffParts
                    : preset.parts;

                  return (
                    <div key={preset.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      {/* 行クリックで展開 */}
                      <div
                        onClick={() => { setPresetEditId(isOpen ? null : preset.id); setPresetSearch(''); }}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '20px 1fr 70px 80px 140px 28px',
                          gap: 4, padding: '9px 12px',
                          cursor: 'pointer', alignItems: 'center',
                          background: isOpen ? 'var(--bg-secondary)' : 'transparent',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = 'var(--bg-secondary)'; }}
                        onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = 'transparent'; }}
                      >
                        {/* 標準マーク */}
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {isStandard && <Icon name="anchor" size={13} color="var(--accent)" title="標準プリセット" />}
                        </span>
                        <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: isOpen ? 'bold' : 'normal', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
                          {preset.weapon && !presetWeaponFilter && (
                            <span style={{ fontSize: 10, color: 'var(--accent)', background: 'var(--accent-muted)', borderRadius: 3, padding: '1px 5px', flexShrink: 0, fontWeight: 'normal' }}>
                              {preset.weapon}
                            </span>
                          )}
                          {preset.name}
                        </span>
                        <span style={{ textAlign: 'center', fontSize: 14, fontWeight: 'bold', color: displayErgo ? 'var(--text-primary)' : 'var(--text-dim)', display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.2 }}>
                          {displayErgo || '—'}
                          {calc?.ergo != null && displayErgo ? <span style={{ fontSize: 9, color: 'var(--text-dim)', fontWeight: 'normal' }}>理論値</span> : null}
                        </span>
                        <span style={{ textAlign: 'center', fontSize: 14, fontWeight: 'bold', color: displayVrecoil ? 'var(--text-primary)' : 'var(--text-dim)', display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.2 }}>
                          {displayVrecoil || '—'}
                          {calc?.vrecoil != null && displayVrecoil ? <span style={{ fontSize: 9, color: 'var(--text-dim)', fontWeight: 'normal' }}>理論値</span> : null}
                        </span>
                        <span style={{ textAlign: 'right', fontSize: 13, color: price > 0 ? 'var(--accent)' : 'var(--text-dim)', fontWeight: price > 0 ? 'bold' : 'normal' }}>
                          {price > 0 ? `₽${price.toLocaleString()}` : preset.parts.length > 0 ? '価格取得中' : '—'}
                        </span>
                        <span style={{ display: 'flex', justifyContent: 'center' }}>
                          <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size={14} color="var(--text-dim)" />
                        </span>
                      </div>

                      {/* 展開パネル */}
                      {isOpen && (
                        <div style={{ padding: '12px 14px 16px', background: 'var(--bg-primary)', borderTop: '1px solid var(--border-light)' }}>

                          {/* 編集フィールド */}
                          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                            <div style={{ flex: 1, minWidth: 120 }}>
                              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 3 }}>武器名</div>
                              <input
                                type="text"
                                value={preset.weapon || ''}
                                onChange={e => updatePreset(preset.id, { weapon: e.target.value })}
                                placeholder="M4A1, AK-74..."
                                list={`weapon-list-${preset.id}`}
                                style={{ width: '100%', fontSize: 13, padding: '5px 8px', boxSizing: 'border-box' }}
                              />
                              <datalist id={`weapon-list-${preset.id}`}>
                                {weaponNames.map(w => <option key={w} value={w} />)}
                              </datalist>
                            </div>
                            <div style={{ flex: 2, minWidth: 140 }}>
                              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 3 }}>プリセット名</div>
                              <input
                                type="text"
                                value={preset.name}
                                onChange={e => updatePreset(preset.id, { name: e.target.value })}
                                style={{ width: '100%', fontSize: 13, padding: '5px 8px', boxSizing: 'border-box' }}
                              />
                            </div>
                            <div style={{ width: 80 }}>
                              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 3 }}>エルゴ</div>
                              <input
                                type="number"
                                value={preset.ergo}
                                onChange={e => updatePreset(preset.id, { ergo: parseInt(e.target.value) || 0 })}
                                style={{ width: '100%', fontSize: 13, padding: '5px 8px', boxSizing: 'border-box' }}
                              />
                            </div>
                            <div style={{ width: 80 }}>
                              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 3 }}>垂直反動</div>
                              <input
                                type="number"
                                value={preset.vrecoil}
                                onChange={e => updatePreset(preset.id, { vrecoil: parseInt(e.target.value) || 0 })}
                                style={{ width: '100%', fontSize: 13, padding: '5px 8px', boxSizing: 'border-box' }}
                              />
                            </div>
                          </div>

                          {/* ベース武器スタッツ（理論値計算用） */}
                          <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: 4, border: '1px solid var(--border-light)' }}>
                            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 }}>
                              ベース武器スタッツ（素の状態で入力 → パーツのmod修正値から理論値を自動計算）
                            </div>
                            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                              <div style={{ width: 80 }}>
                                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 3 }}>素エルゴ</div>
                                <input type="number" value={preset.baseErgo || ''}
                                  onChange={e => updatePreset(preset.id, { baseErgo: parseInt(e.target.value) || 0 })}
                                  placeholder="—"
                                  style={{ width: '100%', fontSize: 13, padding: '5px 8px', boxSizing: 'border-box' }} />
                              </div>
                              <div style={{ width: 90 }}>
                                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 3 }}>素垂直反動</div>
                                <input type="number" value={preset.baseVrecoil || ''}
                                  onChange={e => updatePreset(preset.id, { baseVrecoil: parseInt(e.target.value) || 0 })}
                                  placeholder="—"
                                  style={{ width: '100%', fontSize: 13, padding: '5px 8px', boxSizing: 'border-box' }} />
                              </div>
                              <div style={{ width: 90 }}>
                                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 3 }}>素水平反動</div>
                                <input type="number" value={preset.baseHrecoil || ''}
                                  onChange={e => updatePreset(preset.id, { baseHrecoil: parseInt(e.target.value) || 0 })}
                                  placeholder="—"
                                  style={{ width: '100%', fontSize: 13, padding: '5px 8px', boxSizing: 'border-box' }} />
                              </div>
                              <div style={{ width: 80 }}>
                                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 3 }}>素MOA</div>
                                <input type="number" step="0.01" value={preset.baseMOA || ''}
                                  onChange={e => updatePreset(preset.id, { baseMOA: parseFloat(e.target.value) || 0 })}
                                  placeholder="—"
                                  style={{ width: '100%', fontSize: 13, padding: '5px 8px', boxSizing: 'border-box' }} />
                              </div>
                              {(() => {
                                const c = calcPresetStats(preset);
                                if (!c) return null;
                                return (
                                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>→ 理論値:</span>
                                    {c.ergo    != null && <span style={{ fontSize: 13, fontWeight: 'bold', color: 'var(--text-primary)' }}>エルゴ {c.ergo}</span>}
                                    {c.vrecoil != null && <span style={{ fontSize: 13, fontWeight: 'bold', color: 'var(--text-primary)' }}>垂直 {c.vrecoil}</span>}
                                    {c.hrecoil != null && <span style={{ fontSize: 13, fontWeight: 'bold', color: 'var(--text-primary)' }}>水平 {c.hrecoil}</span>}
                                    {c.moa     != null && <span style={{ fontSize: 13, fontWeight: 'bold', color: 'var(--text-primary)' }}>MOA {c.moa}</span>}
                                    {c.weight  != null && <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>重量 {c.weight}kg</span>}
                                    <button className="btn btn-yellow btn-sm"
                                      onClick={() => updatePreset(preset.id, {
                                        ergo:    c.ergo    ?? preset.ergo,
                                        vrecoil: c.vrecoil ?? preset.vrecoil,
                                      })}
                                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                      <Icon name="download" size={12} color="var(--accent-on)" /> エルゴ・反動に反映
                                    </button>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>

                          {/* ボタン群 */}
                          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginTop: 10 }}>
                            {/* 標準プリセット設定ボタン */}
                            <button
                              className="btn btn-sm"
                              onClick={() => setStandardPreset(isStandard ? null : preset.id)}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                background: isStandard ? 'var(--warn-bg)' : 'transparent',
                                border: `1px solid ${isStandard ? 'var(--warn)' : 'var(--border)'}`,
                                color: isStandard ? 'var(--warn-text)' : 'var(--text-secondary)',
                              }}>
                              <Icon name="anchor" size={12} color={isStandard ? 'var(--warn-text)' : 'var(--text-dim)'} />
                              {isStandard ? '標準を解除' : '標準に設定'}
                            </button>
                            <button
                              className="btn btn-gray btn-sm"
                              onClick={() => duplicatePreset(preset)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <Icon name="copy" size={12} color="currentColor" /> 複製
                            </button>
                            <button
                              className="btn btn-sm"
                              onClick={() => deletePreset(preset.id)}
                              style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border-weak)', color: 'var(--danger-text)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <Icon name="x" size={12} color="var(--danger-text)" /> 削除
                            </button>
                          </div>

                          {/* パーツ一覧ヘッダー */}
                          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}>
                              <Icon name="package" size={12} color="var(--text-dim)" />
                              パーツ構成 ({preset.parts.length}件)
                              {price > 0 && (
                                <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>
                                  合計 ₽{price.toLocaleString()}
                                </span>
                              )}
                            </span>

                            {/* 共通非表示ON時の差分情報 */}
                            {hideStandardParts && !isStandard && standardPreset && diffParts.length < preset.parts.length && (
                              <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                                {preset.parts.length - diffParts.length}件を非表示
                                {diffPrice > 0 && <span style={{ color: 'var(--accent)', marginLeft: 4 }}>差分 ₽{diffPrice.toLocaleString()}</span>}
                              </span>
                            )}
                          </div>

                          {/* パーツ行 */}
                          {visibleParts.length === 0 && preset.parts.length === 0 && (
                            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8, padding: '8px 10px', border: '1px dashed var(--border)', borderRadius: 4 }}>
                              パーツが登録されていません。下の検索欄から追加してください。
                            </div>
                          )}
                          {visibleParts.length === 0 && preset.parts.length > 0 && (
                            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8, padding: '8px 10px', border: '1px dashed var(--border)', borderRadius: 4 }}>
                              標準プリセットと同じ部品のみで構成されています（差分なし）。
                            </div>
                          )}

                          {visibleParts.map(part => {
                            const item                  = apiData.items.find(it => it.id === part.itemId);
                            const { price: unitPrice, source } = getBestPriceInfo(item);
                            const partPrice             = unitPrice * part.qty;
                            return (
                              <div key={part.itemId} style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '5px 8px', marginBottom: 3,
                                background: 'var(--bg-secondary)', borderRadius: 4,
                                border: '1px solid var(--border-light)',
                              }}>
                                {item?.iconLink && (
                                  <img src={item.iconLink} alt=""
                                    style={{ width: 22, height: 22, objectFit: 'contain', flexShrink: 0 }}
                                    onError={e => e.target.style.display = 'none'} />
                                )}
                                {(() => { const cat = item?.categories?.[0]?.name; return cat && (
                                  <span style={{ fontSize: 10, color: 'var(--text-dim)', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 3, padding: '1px 4px', flexShrink: 0, whiteSpace: 'nowrap' }}>{cat}</span>
                                ); })()}
                                <span style={{ flex: 1, fontSize: 12, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {part.itemName}
                                </span>
                                <span style={{ fontSize: 11, color: unitPrice > 0 ? 'var(--text-secondary)' : 'var(--text-dim)', flexShrink: 0, textAlign: 'right' }}>
                                  {unitPrice > 0 ? (
                                    <>
                                      {part.qty > 1
                                        ? `₽${unitPrice.toLocaleString()} × ${part.qty} = ₽${partPrice.toLocaleString()}`
                                        : `₽${unitPrice.toLocaleString()}`}
                                      {source && <span style={{ marginLeft: 4, color: source === 'フリマ' ? 'var(--text-dim)' : 'var(--state-ok)', fontSize: 10 }}>({source})</span>}
                                    </>
                                  ) : '価格不明'}
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                                  <button className="btn btn-gray btn-sm" style={{ padding: '1px 7px' }}
                                    onClick={() => changePartQty(preset, part.itemId, -1)}>－</button>
                                  <span style={{ fontSize: 12, minWidth: 18, textAlign: 'center' }}>{part.qty}</span>
                                  <button className="btn btn-gray btn-sm" style={{ padding: '1px 7px' }}
                                    onClick={() => changePartQty(preset, part.itemId, 1)}>＋</button>
                                </div>
                                <button
                                  onClick={() => removePart(preset, part.itemId)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 3px', color: 'var(--danger-text)', flexShrink: 0 }}>
                                  <Icon name="x" size={13} color="var(--danger-text)" />
                                </button>
                              </div>
                            );
                          })}

                          {/* パーツ追加検索 */}
                          <div style={{ position: 'relative', marginTop: 8 }}>
                            <input
                              type="text"
                              placeholder="パーツ名を入力して検索・追加（2文字以上）..."
                              value={presetSearch}
                              onChange={e => { setPresetSearch(e.target.value); setPresetSearchIdx(-1); }}
                              onKeyDown={e => {
                                if (partSearchResults.length === 0) return;
                                if (e.key === 'ArrowDown') {
                                  e.preventDefault();
                                  setPresetSearchIdx(i => Math.min(i + 1, partSearchResults.length - 1));
                                } else if (e.key === 'ArrowUp') {
                                  e.preventDefault();
                                  setPresetSearchIdx(i => Math.max(i - 1, 0));
                                } else if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const target = presetSearchIdx >= 0 ? partSearchResults[presetSearchIdx] : partSearchResults[0];
                                  if (target) { addPart(preset, target); setPresetSearchIdx(-1); }
                                } else if (e.key === 'Escape') {
                                  setPresetSearch(''); setPresetSearchIdx(-1);
                                }
                              }}
                              style={{ width: '100%', fontSize: 13, padding: '6px 10px', boxSizing: 'border-box' }}
                            />
                            {partSearchResults.length > 0 && (
                              <div style={{
                                position: 'absolute', top: '100%', left: 0, right: 0,
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--border)', borderRadius: 4,
                                zIndex: 20, maxHeight: 220, overflowY: 'auto',
                                boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
                              }}>
                                {partSearchResults.map((item, idx) => {
                                  const isActive = idx === presetSearchIdx || (presetSearchIdx < 0 && idx === 0);
                                  return (
                                    <div key={item.id}
                                      onClick={() => { addPart(preset, item); setPresetSearchIdx(-1); }}
                                      onMouseEnter={() => setPresetSearchIdx(idx)}
                                      style={{
                                        display: 'flex', alignItems: 'center', gap: 7, padding: '6px 10px', cursor: 'pointer',
                                        background: isActive ? 'var(--accent-muted)' : 'transparent',
                                        borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                                      }}
                                    >
                                      <span style={{ fontSize: 11, color: 'var(--accent)', width: 10, flexShrink: 0, opacity: isActive ? 1 : 0 }}>▶</span>
                                      {item.iconLink && (
                                        <img src={item.iconLink} alt=""
                                          style={{ width: 22, height: 22, objectFit: 'contain' }}
                                          onError={e => e.target.style.display = 'none'} />
                                      )}
                                      <span style={{ flex: 1, fontSize: 12, color: isActive ? 'var(--accent)' : 'var(--text-primary)' }}>{item.name}</span>
                                      {item.shortName && (
                                        <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{item.shortName}</span>
                                      )}
                                      {(() => { const bp = getBestPrice(item); return bp > 0 && (
                                        <span style={{ fontSize: 11, color: 'var(--accent)', flexShrink: 0 }}>
                                          ₽{bp.toLocaleString()}
                                        </span>
                                      ); })()}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                          {/* 候補ドロップダウンが隠れないよう下部スペース確保 */}
                          {partSearchResults.length > 0 && <div style={{ height: 340 }} />}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {/* ===== スロット別モッドおすすめ ===== */}
            <div className="section">
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
                onClick={() => setPresetAdvisorOpen(o => !o)}>
                <div className="section-title" style={{ margin: 0 }}>
                  <Icon name="star" size={14} color="var(--accent)" /> スロット別モッドおすすめ
                </div>
                <Icon name={presetAdvisorOpen ? 'chevron-up' : 'chevron-down'} size={14} color="var(--text-dim)" />
              </div>

              {presetAdvisorOpen && (() => {
                const cats = [...new Set(
                  apiData.weaponMods.map(m => m.categories?.[0]?.name || '').filter(Boolean)
                )].sort();
                const currentCat = presetAdvisorCat || cats[0] || '';
                const targetPreset = weaponPresets.find(p => p.id === presetEditId) || null;
                const targetCalc   = targetPreset ? calcPresetStats(targetPreset) : null;
                const targetPrice  = targetPreset ? getPresetPrice(targetPreset) : 0;

                // プリセット部品がどのカテゴリに属するか（items/weaponMods 両方から判定）
                const presetPartIds = new Set((targetPreset?.parts || []).map(p => p.itemId));
                const usedCatSet = new Set();
                apiData.items.forEach(it => {
                  if (presetPartIds.has(it.id)) {
                    const cat = it.categories?.[0]?.name;
                    if (cat) usedCatSet.add(cat);
                  }
                });
                apiData.weaponMods.forEach(m => {
                  if (presetPartIds.has(m.id)) {
                    const cat = m.categories?.[0]?.name;
                    if (cat) usedCatSet.add(cat);
                  }
                });

                // .properties フィルターを外す（フォアグリップ等 ItemPropertiesWeaponMod を持たない
                // アタッチメントも表示するため）
                const mods = apiData.weaponMods
                  .filter(m => (m.categories?.[0]?.name || '') === currentCat)
                  .map(m => ({
                    ...m,
                    ergo:     m.properties?.ergonomics       || 0,
                    recoil:   m.properties?.recoilModifier   || 0,
                    accuracy: m.properties?.accuracyModifier || 0,
                  }));

                const sortedMods = [...mods].sort((a, b) =>
                  presetAdvisorSort === 'ergo'   ? b.ergo - a.ergo :
                  presetAdvisorSort === 'recoil' ? a.recoil - b.recoil :
                                                   a.accuracy - b.accuracy
                ).slice(0, 25);

                // サマリー表示用ヘルパー
                const statCell = (label, value, unit = '', subText = null, highlight = false) => (
                  <div style={{ textAlign: 'center', minWidth: 70, padding: '0 6px' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: 15, fontWeight: 'bold', color: highlight ? 'var(--accent)' : value != null ? 'var(--text-primary)' : 'var(--text-dim)' }}>
                      {value != null ? `${value}${unit}` : '—'}
                    </div>
                    {subText && <div style={{ fontSize: 9, color: 'var(--text-dim)' }}>{subText}</div>}
                  </div>
                );

                return (
                  <div>
                    {/* ─── サマリーバー ─── */}
                    <div style={{
                      marginTop: 12,
                      padding: '10px 12px',
                      background: 'var(--bg-secondary)',
                      borderRadius: 6,
                      border: '1px solid var(--border)',
                    }}>
                      {!targetPreset ? (
                        <div style={{ fontSize: 12, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Icon name="alert-triangle" size={12} color="var(--text-dim)" />
                          プリセットを展開すると理論値がここに表示されます
                        </div>
                      ) : (
                        <>
                          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 6 }}>
                            <Icon name="tool" size={11} color="var(--text-dim)" style={{ marginRight: 4 }} />
                            {targetPreset.name}
                            {(targetCalc?.ergo != null || targetCalc?.vrecoil != null) && (
                              <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--accent)' }}>（理論値）</span>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: 0, alignItems: 'stretch', flexWrap: 'wrap' }}>
                            {statCell('エルゴ',
                              targetCalc?.ergo ?? (targetPreset.ergo || null),
                              '',
                              targetCalc?.ergo != null ? '理論値' : null
                            )}
                            <div style={{ width: 1, background: 'var(--border-light)', margin: '0 2px' }} />
                            {statCell('垂直反動',
                              targetCalc?.vrecoil ?? (targetPreset.vrecoil || null),
                              '',
                              targetCalc?.vrecoil != null ? '理論値' : null
                            )}
                            <div style={{ width: 1, background: 'var(--border-light)', margin: '0 2px' }} />
                            {statCell('水平反動',
                              targetCalc?.hrecoil ?? null,
                              '',
                              targetCalc?.hrecoil != null ? '理論値' : (targetPreset.baseHrecoil ? null : '素値未入力')
                            )}
                            <div style={{ width: 1, background: 'var(--border-light)', margin: '0 2px' }} />
                            {statCell('MOA',
                              targetCalc?.moa ?? null,
                              '',
                              targetCalc?.moa != null ? '理論値' : (targetPreset.baseMOA ? null : '素値未入力')
                            )}
                            <div style={{ width: 1, background: 'var(--border-light)', margin: '0 2px' }} />
                            {statCell('重量', targetCalc?.weight ?? null, 'kg')}
                            <div style={{ width: 1, background: 'var(--border-light)', margin: '0 2px' }} />
                            {statCell('推定コスト',
                              targetPrice > 0 ? `₽${targetPrice.toLocaleString()}` : null,
                              '',
                              null,
                              true
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {/* ─── カテゴリタブ ─── */}
                    {cats.length === 0 ? (
                      <div style={{ marginTop: 10, color: 'var(--warn)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Icon name="alert-triangle" size={12} color="var(--warn)" /> APIデータ取得後に表示されます。
                      </div>
                    ) : (
                      <>
                        <div style={{
                          display: 'flex', marginTop: 14, borderBottom: '2px solid var(--border)',
                          overflowX: 'auto', gap: 0,
                        }}>
                          {cats.map(c => {
                            const isActive = currentCat === c;
                            const isUsed   = usedCatSet.has(c);
                            return (
                              <button key={c}
                                onClick={() => setPresetAdvisorCat(c)}
                                style={{
                                  flexShrink: 0,
                                  padding: '6px 12px',
                                  fontSize: 12,
                                  background: 'none',
                                  border: 'none',
                                  borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                                  marginBottom: -2,
                                  color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                                  fontWeight: isActive ? 'bold' : 'normal',
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                  position: 'relative',
                                }}>
                                {c}
                                {targetPreset && !isUsed && (
                                  <span style={{
                                    position: 'absolute', top: 4, right: 3,
                                    width: 6, height: 6, borderRadius: '50%',
                                    background: 'var(--danger)',
                                    display: 'inline-block',
                                  }} />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* ソート */}
                        <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'center' }}>
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>優先:</span>
                          <button className={`btn btn-sm ${presetAdvisorSort === 'ergo'    ? 'btn-yellow' : 'btn-gray'}`}
                            onClick={() => setPresetAdvisorSort('ergo')}>エルゴ修正 高い順</button>
                          <button className={`btn btn-sm ${presetAdvisorSort === 'recoil'  ? 'btn-yellow' : 'btn-gray'}`}
                            onClick={() => setPresetAdvisorSort('recoil')}>反動修正 低い順</button>
                          <button className={`btn btn-sm ${presetAdvisorSort === 'accuracy' ? 'btn-yellow' : 'btn-gray'}`}
                            onClick={() => setPresetAdvisorSort('accuracy')}>精度修正 低い順</button>
                        </div>

                        {/* モッドテーブル（20行固定高・内部スクロール） */}
                        <div style={{ marginTop: 10, overflowX: 'auto', overflowY: 'auto', height: 680 }}>
                          <div style={{
                            display: 'grid', gridTemplateColumns: '24px 1fr 64px 72px 64px 1fr 64px',
                            gap: 4, padding: '4px 6px',
                            fontSize: 11, color: 'var(--text-dim)',
                            borderBottom: '1px solid var(--border)',
                          }}>
                            <span></span>
                            <span>名前</span>
                            <span style={{ textAlign: 'center' }}>エルゴ</span>
                            <span style={{ textAlign: 'center' }}>垂直反動</span>
                            <span style={{ textAlign: 'center' }}>精度</span>
                            <span style={{ textAlign: 'right' }}>最安値（入手元）</span>
                            <span></span>
                          </div>
                          {sortedMods.length === 0 && (
                            <div style={{ padding: '12px 6px', color: 'var(--text-dim)', fontSize: 12 }}>該当データなし</div>
                          )}
                          {sortedMods.map((mod, i) => {
                            const { price, source } = getBestPriceInfo(mod);
                            const ergoColor    = mod.ergo     > 0 ? 'var(--state-ok)' : mod.ergo     < 0 ? 'var(--danger-text)' : 'var(--text-dim)';
                            const recoilColor  = mod.recoil   < 0 ? 'var(--state-ok)' : mod.recoil   > 0 ? 'var(--danger-text)' : 'var(--text-dim)';
                            const accuracyColor= mod.accuracy < 0 ? 'var(--state-ok)' : mod.accuracy > 0 ? 'var(--danger-text)' : 'var(--text-dim)';
                            const inPreset = targetPreset?.parts.some(p => p.itemId === mod.id) ?? false;
                            return (
                              <div key={mod.id} style={{
                                display: 'grid', gridTemplateColumns: '24px 1fr 64px 72px 64px 1fr 64px',
                                gap: 4, padding: '5px 6px',
                                borderBottom: '1px solid var(--border-light)',
                                background: inPreset
                                  ? 'var(--accent-muted)'
                                  : i % 2 === 0 ? 'transparent' : 'var(--bg-secondary)',
                                borderLeft: inPreset ? '3px solid var(--accent)' : '3px solid transparent',
                                alignItems: 'center',
                              }}>
                                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {inPreset
                                    ? <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 'bold' }}>▶</span>
                                    : mod.iconLink
                                      ? <img src={mod.iconLink} alt="" style={{ width: 22, height: 22, objectFit: 'contain' }} onError={e => e.target.style.display='none'} />
                                      : null}
                                </span>
                                <span style={{ fontSize: 12, color: inPreset ? 'var(--accent)' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: inPreset ? 'bold' : 'normal' }}>
                                  {mod.name}
                                  {mod.shortName && <span style={{ marginLeft: 5, fontSize: 10, color: 'var(--text-dim)', fontWeight: 'normal' }}>({mod.shortName})</span>}
                                </span>
                                <span style={{ textAlign: 'center', fontSize: 12, fontWeight: 'bold', color: ergoColor }}>
                                  {mod.ergo > 0 ? `+${mod.ergo}` : mod.ergo === 0 ? '0' : mod.ergo}
                                </span>
                                <span style={{ textAlign: 'center', fontSize: 12, fontWeight: 'bold', color: recoilColor }}>
                                  {mod.recoil === 0 ? '0%'
                                    : mod.recoil > 0 ? `+${(mod.recoil * 100).toFixed(0)}%`
                                    : `${(mod.recoil * 100).toFixed(0)}%`}
                                </span>
                                <span style={{ textAlign: 'center', fontSize: 12, fontWeight: 'bold', color: accuracyColor }}>
                                  {mod.accuracy === 0 ? '0%'
                                    : mod.accuracy > 0 ? `+${(mod.accuracy * 100).toFixed(0)}%`
                                    : `${(mod.accuracy * 100).toFixed(0)}%`}
                                </span>
                                <span style={{ fontSize: 11, color: 'var(--text-secondary)', textAlign: 'right' }}>
                                  {price > 0 ? `₽${price.toLocaleString()}` : '—'}
                                  {source && <span style={{ fontSize: 10, marginLeft: 4, color: source === 'フリマ' ? 'var(--text-dim)' : 'var(--state-ok)' }}>({source})</span>}
                                </span>
                                <span style={{ display: 'flex', justifyContent: 'center' }}>
                                  {inPreset ? (
                                    <button
                                      className="btn btn-sm"
                                      onClick={() => targetPreset && removePart(targetPreset, mod.id)}
                                      title="プリセットから削除"
                                      style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11,
                                        background: 'var(--danger-bg)',
                                        border: '1px solid var(--danger-border-weak)',
                                        color: 'var(--danger-text)',
                                      }}>
                                      <Icon name="x" size={11} color="var(--danger-text)" /> 削除
                                    </button>
                                  ) : (
                                    <button
                                      className="btn btn-sm"
                                      disabled={!targetPreset}
                                      onClick={() => targetPreset && addPart(targetPreset, mod)}
                                      title={targetPreset ? `「${targetPreset.name}」に追加` : 'プリセットを展開してください'}
                                      style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11,
                                        background: targetPreset ? 'var(--accent-muted)' : 'transparent',
                                        border: `1px solid ${targetPreset ? 'var(--accent)' : 'var(--border)'}`,
                                        color: targetPreset ? 'var(--accent)' : 'var(--text-dim)',
                                        opacity: targetPreset ? 1 : 0.5,
                                        cursor: targetPreset ? 'pointer' : 'not-allowed',
                                      }}>
                                      <Icon name="plus" size={11} color={targetPreset ? 'var(--accent)' : 'var(--text-dim)'} /> 追加
                                    </button>
                                  )}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        );
      })()}

