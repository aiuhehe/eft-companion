
initModeSystem(); // 初回起動時に既存データを pvp ネームスペースへ移行
migrateMapNameKeys(); // 旧マップ名（'Labyrinth'）のピン・画像メタを新しい名前へ
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
