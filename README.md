# EFT コンパニオン（eft-companion）

Escape from Tarkov の**非公式**プレイ支援ツールです。タスク進行・出撃準備・ハイドアウト・マップピンなどをブラウザだけで管理できます。

**公開URL: https://aiuhehe.github.io/eft-companion/**

> Unofficial Escape from Tarkov companion web app. Not affiliated with Battlestate Games.

## できること

| タブ | 内容 |
|---|---|
| プラン | タスク・ハイドアウト・トレーダー解放などのゴールをまとめて、今やることと必要アイテムを表示 |
| トレーダー | トレーダーLL解放条件のアドバイス |
| ハイドアウト | 施設アップグレードに必要なアイテムの収集ナビ |
| 欲しい物 | 物々交換・クラフト候補リスト |
| タスク | タスク検索・完了管理・ゴールタスク別のプロジェクトタブ |
| 出撃準備 | 進行中タスクをマップで絞り込み、持ち込み/収集/設置/撃破の目標を一覧表示 |
| マップ | タスク目標をマップ画像上にピン登録 |
| アイテム / 鍵 | フリマ価格・価格推移 |
| 在庫 | スクリーンショットからスタッシュを読み取り（OCR） |
| 日誌 | 日々の活動記録 |

※ 弾薬・プレート・プリセットのタブは、データ元（tarkov.dev GraphQL API）の停止中は利用できません。

## データの保存について

- 入力した進捗・設定は**すべて自分のブラウザ内（localStorage / IndexedDB）に保存**されます。サーバーには送信されません。
- ブラウザやPCを変えるとデータは引き継がれません。**設定タブ（歯車）→「データのバックアップ」**で書き出し・復元できます。
- PvP / PvE / シーズンごとにデータは分かれています（画面上部のモードバーで切り替え）。

## マップ画像の登録（初回のみ）

マップ画像はアプリに同梱していません。各自で入手して登録してください。

1. [REƎMR EFTMAPS](https://reemr.se/) から使いたいマップの画像をダウンロード
2. アプリの「マップ」タブでマップを選び、地図エリア下の「画像を差し替え」から登録
3. 自分でメモを書き込んだ画像に差し替えることもできます（ピンの位置は同じ範囲を写した画像なら維持されます）

> Maps by **REƎMR** — https://reemr.se/ — licensed under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/).

## クレジット

- ゲームデータ: [tarkov.dev](https://tarkov.dev/)（API）
- マップ: [REƎMR EFTMAPS](https://reemr.se/)
- Escape from Tarkov は Battlestate Games の商標です。本ツールは Battlestate Games とは関係のない非公式のファンツールです。

## 開発

- ソースは `src/js/*.js`（JSX）と `style.css`。`eft-tool.html` はビルド出力です。
- ビルド: `./build.sh`（Mac / WSL / Git Bash）または `.\build.ps1`（Windows PowerShell）→ `eft-tool.html` をブラウザで開く
- 公開: `main` に push すると GitHub Actions が `./build.sh --dist` を実行し、`dist/` を GitHub Pages に公開します。
- 機能仕様は [docs/README.md](docs/README.md) を参照。
