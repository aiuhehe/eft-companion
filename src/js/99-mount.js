
initModeSystem(); // 初回起動時に既存データを pvp ネームスペースへ移行
migrateSeasonIds(); // 番号付きシーズン（season_N）を固定 id season_current へ（Issue #57）
migrateMapNameKeys(); // 旧マップ名（'Labyrinth'）のピン・画像メタを新しい名前へ
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
