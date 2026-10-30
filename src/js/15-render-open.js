  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h1 style={{ color: 'var(--accent)', fontSize: 20, fontWeight: 'bold', margin: 0, display:'flex', alignItems:'center', gap:8 }}>
            <Icon name="target" size={22} color="var(--accent)" /> EFT コンパニオン
          </h1>
          {lastLoaded && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>最終取得: {lastLoaded}</div>}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {loadError && (
            <span style={{ color: 'var(--danger)', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4, maxWidth: 340 }}>
              <Icon name="alert-triangle" size={14} color="var(--danger)" /> {loadError}
            </span>
          )}
          {isFallback && !loadError && (
            <span style={{ color: 'var(--text-dim)', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <Icon name="alert-triangle" size={12} color="var(--text-dim)" /> 一部機能制限中
            </span>
          )}
          <button className="btn btn-yellow" onClick={loadAPIData} disabled={loading} style={{display:'inline-flex',alignItems:'center',gap:6}}>
            {loading ? <><Icon name="refresh" size={14} color="var(--accent-on)" style={{animation:'spin 1s linear infinite'}} /> 読込中...</> : <><Icon name="download" size={14} color="var(--accent-on)" /> APIデータ取得</>}
          </button>
          <button onClick={() => setActiveTab('status')} title="設定・ステータス"
            style={{background: activeTab==='status' ? 'var(--accent)' : 'var(--bg-card)', border:'1px solid var(--border)', borderRadius:6, padding:'5px 8px', cursor:'pointer', display:'inline-flex', alignItems:'center', color: activeTab==='status' ? 'var(--accent-on)' : 'var(--text-secondary)'}}>
            <Icon name="settings" size={16} color={activeTab==='status' ? 'var(--accent-on)' : 'var(--text-secondary)'} />
          </button>
        </div>
      </div>

      {/* Mode Bar */}
      <div className="mode-bar">
        {['pvp', 'pve', ...seasons].map(mode => (
          <button
            key={mode}
            className={`mode-btn${activeMode === mode ? ' active' : ''}`}
            onClick={() => { if (activeMode !== mode) switchMode(mode); }}>
            {getModeLabel(mode)}
          </button>
        ))}
        <button className="mode-btn mode-btn-add" onClick={addNewSeason}
          title="新しいシーズンを追加">
          + シーズン追加
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #2d3748', marginBottom: 16, flexWrap: 'nowrap', overflowX: 'auto' }}>
        {[
          { id:'wipeflow',icon:'calendar-plus', label:'プラン',       full:'序盤フロー' },
          { id:'advisor', icon:'chart-bar',     label:'トレーダー', full:'トレーダー解放', plan:true },
          { id:'hideout', icon:'home',          label:'ハイドアウト',full:'ハイドアウト', plan:true },
          { id:'barter',  icon:'shopping-cart', label:'欲しい物',   full:'欲しいものリスト', plan:true },
          { id:'tasks',   icon:'list-check',    label:'タスク',     full:'タスク検索', plan:true },
          { id:'raid',    icon:'backpack',      label:'出撃準備',   full:'出撃準備チェック' },
          { id:'maps',    icon:'map',           label:'マップ',     full:'マップ・ピン登録' },
          { id:'items',   icon:'search',        label:'アイテム',   full:'アイテム一覧' },
          { id:'ammo',    icon:'target',        label:'弾薬',       full:'弾薬一覧',             restricted:true },
          { id:'armor',   icon:'shield',        label:'プレート',   full:'アーマープレート一覧', restricted:true },
          { id:'presets', icon:'tool',           label:'プリセット', full:'武器プリセット比較',   restricted:true },
          { id:'keys',    icon:'key',           label:'鍵',         full:'鍵一覧' },
          { id:'ocr',     icon:'camera',        label:'在庫',       full:'スクリーンショット登録' },
          { id:'journal', icon:'book',          label:'日誌',       full:'活動ジャーナル' },
          { id:'event',   icon:'trophy',        label:'イベント',   full:'イベント' },
        ].map(t => (
          <div key={t.id} className={`tab ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}
            title={t.full}
            style={isFallback && t.restricted ? { opacity: 0.45 } : undefined}>
            <div style={{position:'relative',display:'inline-flex'}}>
              <Icon name={t.icon} size={24}
                color={isFallback && t.restricted ? 'var(--text-dim)' : activeTab===t.id ? 'var(--accent)' : 'var(--text-secondary)'} />
              {t.plan && <span style={{position:'absolute',top:-4,right:-5,fontSize:10,fontWeight:'bold',color:'var(--accent)',lineHeight:1}}>+</span>}
            </div>
            {t.label}
          </div>
        ))}
      </div>

