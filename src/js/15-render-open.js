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
            <span title="GraphQL API（api.tarkov.dev）が使えないため json.tarkov.dev から取得しています。全タブ通常どおり利用できます。"
              style={{ color: 'var(--text-dim)', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <Icon name="globe" size={12} color="var(--text-dim)" /> JSON API 接続中
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
        {TAB_DEFS.map(t => (
          <div key={t.id} className={`tab ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}
            title={t.full}>
            <div style={{position:'relative',display:'inline-flex'}}>
              <Icon name={t.icon} size={24}
                color={activeTab===t.id ? 'var(--accent)' : 'var(--text-secondary)'} />
              {t.plan && <span style={{position:'absolute',top:-4,right:-5,fontSize:10,fontWeight:'bold',color:'var(--accent)',lineHeight:1}}>+</span>}
            </div>
            {t.label}
          </div>
        ))}
      </div>

