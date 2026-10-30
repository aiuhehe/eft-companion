# EFT コンパニオン — 開発ガイド

## ファイル構成

| ファイル / フォルダ | 役割 |
|---|---|
| `src/js/*.js` | **ソースコード（編集対象）** — 番号順に結合される JSX/JS |
| `src/head.html` | HTML骨格の先頭（`<script type="text/babel">` 開始タグまで） |
| `src/tail.html` | HTML骨格の末尾（`</script></body></html>`） |
| `build.sh` | ビルドスクリプト（Mac / WSL / Git Bash）。`--dist` で公開用 `dist/`（`index.html` 化・マップ画像なし）も作成 |
| `build.ps1` | ビルドスクリプト（Windows PowerShell） |
| `eft-tool.html` | **ビルド出力（直接編集しない）** — `build.sh` or `build.ps1` で生成 |
| `style.css` | スタイルシート（`<link>` で読み込み） |
| `docs/` | 機能仕様書・設計ドキュメント |
| `backups/` | バックアップファイル |
| `README.md` | 公開用の説明（GitHub リポジトリ `aiuhehe/eft-companion`） |
| `.github/workflows/ci.yml` | `main` 向け PR ごとに `./build.sh --dist` を実行してビルドが通るか確認（公開はしない） |
| `.github/workflows/pages.yml` | `main` への push で `./build.sh --dist` → `dist/` を GitHub Pages（https://aiuhehe.github.io/eft-companion/）に公開 |
| `.gitignore` | `eft-tool.html`・`dist/`・`backups/`・`.claude/`・`maps/`・開発用作業ファイルを除外 |

### ソースファイル一覧（`src/js/`）

| ファイル | 内容 | 行数目安 |
|---|---|---|
| `00-constants.js` | React destructuring, GUIDE_MAP, TRADER定数, マップ画像定数, GraphQLクエリ | ~290 |
| `01-api.js` | fetchGraphQL + json.tarkov.dev フォールバック変換 | ~410 |
| `02-translations.js` | translateObjective, getObjTypeLabel | ~75 |
| `03-storage.js` | loadState, saveState, 全データバックアップ（exportAllData/restoreAllData）, IndexedDB（差し替えマップ画像）, モードシステム | ~200 |
| `04-helpers.js` | 数値フォーマット, Wiki取得, levenshtein | ~145 |
| `05-icons.js` | IP(SVGパス) + Icon コンポーネント (JSX) | ~75 |
| `06-themes.js` | THEMES + applyTheme | ~16 |
| `07-charts.js` | FleaHistoryChart, MultiLineFleaChart (JSX) | ~295 |
| `08-pre-app.js` | イベント定数, プラン定数, getAmmoAcquisitions | ~135 |
| `09-manual-unlocks.js` | 手動登録したタスク↔アイテム紐づけの読み書き | ~35 |
| `10-app-state.js` | `function App() {` + 全useState/useRef + 初期effect | ~740 |
| `11-app-effects.js` | ジャーナル/タスクタブ state + 永続化effect | ~175 |
| `12-app-callbacks.js` | ammo memo + plan/journal/wipe callbacks + API読込 | ~500 |
| `13-app-memos.js` | traderAnalytics, hideoutCalc, filteredTasks 等の全useMemo | ~1200 |
| `14-app-components.js` | StashControl, Tooltip, BarterCard, CraftCard, MapPinVisual 等 (JSX) | ~1120 |
| `15-render-open.js` | return文の開始 + ヘッダー + タブバー | ~80 |
| `20-tab-status.js` | 設定タブ | ~230 |
| `21-tab-advisor.js` | トレーダー解放タブ | ~140 |
| `22-tab-hideout.js` | ハイドアウトタブ | ~490 |
| `23-tab-barter.js` | 欲しいものリストタブ | ~370 |
| `24-tab-tasks.js` | タスク検索タブ | ~960 |
| `25-tab-items.js` | アイテム一覧タブ | ~510 |
| `26-tab-ocr.js` | OCR（在庫）タブ | ~295 |
| `27-tab-journal.js` | 活動ジャーナルタブ | ~390 |
| `28-tab-promo.js` | （削除済みのプロモコードタブ・コメント1行のみ） | 1 |
| `29-tab-event.js` | イベントタブ | ~240 |
| `30-tab-ammo.js` | 弾薬タブ | ~60 |
| `31-tab-keys.js` | 鍵一覧タブ | ~75 |
| `32-tab-wipeflow.js` | プランタブ（id は `wipeflow` のまま） | ~360 |
| `33-tab-armor.js` | アーマープレート一覧タブ | ~135 |
| `33-tab-presets.js` | 武器プリセット比較タブ | ~900 |
| `33-tab-raid.js` | 出撃準備タブ | ~1380 |
| `34-tab-maps.js` | マップタブ（ピン登録・画像差し替え） | ~1060 |
| `90-render-close.js` | return文のクロージング | ~12 |
| `99-mount.js` | ReactDOM.createRoot + render | ~4 |

### 機能仕様書（タブごと）

各タブの機能・内部ロジックは以下の仕様書にまとめてある（コードを追わなくても把握できる粒度）。

> **【必須・例外なし】機能変更・仕様変更を行ったら、同じ作業内で必ず該当する仕様書を更新すること。**
> UIラベル・ボタン・操作フロー・状態・関数の挙動が変わった場合も対象。ユーザーから都度指示されなくても自動的に更新する（毎回の指示を待たない）。コード変更と仕様書更新は1セット。該当仕様書が下表のどれか不明なら、変更したタブから判断して更新する。

| タブ | 仕様書 |
|---|---|
| プラン | `docs/プラン機能仕様書.md` |
| タスク検索 | `docs/タスク検索機能仕様書.md` |
| 出撃準備 | `docs/出撃準備機能仕様書.md` |
| トレーダー解放 | `docs/トレーダー解放機能仕様書.md` |
| ハイドアウト | `docs/ハイドアウト機能仕様書.md` |
| 欲しいものリスト | `docs/欲しいものリスト機能仕様書.md` |
| 日誌（活動ジャーナル） | `docs/日誌機能仕様書.md` |
| ステータス・設定 | `docs/ステータス・設定機能仕様書.md` |
| イベント | `docs/イベント機能仕様書.md` |
| アイテム一覧 | `docs/アイテム一覧機能仕様書.md` |
| 弾薬 | `docs/弾薬一覧機能仕様書.md` |
| アーマープレート | `docs/アーマープレート機能仕様書.md` |
| 武器プリセット | `docs/プリセット機能仕様書.md` |
| 鍵一覧 | `docs/鍵一覧機能仕様書.md` |
| 在庫（スクリーンショット登録・OCR） | `docs/在庫機能仕様書.md` |
| マップ | `docs/マップ機能仕様書.md` |

> **JSXソース分割について（2026-07-03）**
> JSXコードは `src/js/` 以下に分割されている（約35ファイル）。
> `build.sh`（Mac/WSL/Git Bash）または `build.ps1`（Windows PowerShell）で
> 番号順に結合し、`eft-tool.html` を生成する。
> 出力は1つの `<script type="text/babel">` ブロックとしてインラインに埋め込まれるため、
> `file://` で直接開くワークフローはそのまま維持される。
> **コード編集は `src/js/` 内のファイルを対象にし、`eft-tool.html` は直接編集しない。**
> 編集後の作業フロー: `src/js/` のファイルを編集 → `./build.sh` or `.\build.ps1` → ブラウザリロード。
> スタイル変更は `style.css` を編集 → ブラウザをリロードで即反映（ビルド不要）。

> **インラインstyleのクラス化について（2026-06-11）**
> 各タブの意味のある反復ブロック（カード・チップ・バッジ・ボタン・行など）は
> `style.css` の名前付きクラスに切り出し済み。**スタイル変更はクラス名で指定できる**
> （例: 「`.task-card` の余白を」「`.reward-badge` のフォントを」）。
> 背景色・ボーダー色・opacity など**状態で変わる値はインライン `style={{}}` に残してある**ので、
> クラスは静的プロパティのみを持つ（インラインがクラスを上書きする想定）。
> 全クラスの一覧と対応タブは `docs/スタイルクラス一覧.md` を参照。
> flexラッパー等の一回限りレイアウトは意図的にインライン維持。

## アーキテクチャ

- **ソース分割 + ビルド結合** — `src/js/` の JSX ファイルを `build.sh`/`build.ps1` で結合し `eft-tool.html` を生成。ブラウザで直接開く（`file://` 可）
- スタイルは `style.css`（ビルド不要で直接編集可）、ロジック(JSX)は `src/js/` 以下に分割
- React 18 + Babel (CDN) + Tailwind (CDN)
- **データ保存**: localStorage（モードシステムあり・後述）＋ IndexedDB `eft_media`（利用者が差し替えたマップ画像のみ・ストア `mapOverrides`）。全データバックアップ（設定タブ）は両方を含む

### API 接続状況（2026-08-09 確認）

> **GraphQL API は現在停止中。** これは tarkov.dev 側の都合であり、このアプリの意図・設定によるものではない。

| エンドポイント | 状態 | 用途 |
|---|---|---|
| `api.tarkov.dev/graphql` | **停止中**（HTTP 422 "GraphQL server unavailable"） | 第1優先・全データ取得 |
| `json.tarkov.dev` | 稼働中 | GraphQL 失敗時の自動フォールバック（`01-api.js`） |

GraphQL が復旧すれば `fetchGraphQL()` が自動的にそちらを使い始める（フォールバック切替はコード変更不要）。実装を追加する際はフォールバック時の挙動も考慮すること。

**モードと API の gameMode の対応（2026-08-30 調査）:**

| アプリのモード | 取得するデータ |
|---|---|
| `pvp` | `regular` |
| `pve` | `pve` |
| `season_N` | **現状 `regular`**（JSON API には `pvp-season` があるが未対応。`01-api.js` の `_detectGameMode` は `pve` 以外をすべて `regular` 扱い） |

**`stationLevelRequirements`（ステーション間依存条件）の取得可否（2026-08-09 確認）:**
- GraphQL: スキーマ上フィールドあり・現在停止中のため取得不可
- JSON API: フィールドあり・取得可能。ただし `station` はIDの文字列のみ（GraphQLはオブジェクト）で、同レスポンスのステーション一覧で名前解決が必要

### localStorage キー一覧

#### グローバルキー（全モード共通・ネームスペースなし）

| キー | 内容 |
|---|---|
| `eft_active_mode` | 現在アクティブなモード文字列（`'pvp'` / `'pve'` / `'season_1'` など）|
| `eft_seasons` | 追加済みシーズンの id 配列（例: `["season_1","season_2"]`）|
| `eft_guides_v1` | ガイドビューアのチェック済みステップ（モード非依存）|
| `eft_custom_tasks_v1` | 出撃準備タブで手動登録したカスタムタスク（全モード共通）|
| `eft_presets_v1` / `eft_presets_standard` | 武器プリセット比較の登録プリセット / 基準プリセットID |
| `eft_blackout_v1` | イベントタスクの独自完了フラグ（キー名は歴史的経緯・全イベント共通）|
| `eft_manual_unlocks_v1` | 手動登録したタスク↔アイテム紐づけ（PvP/PvE共通）。Seasonは `eft_manual_unlocks_v1__season_N` キーが存在すれば専用データ、なければこのキーを継承（コピーオンライト）。|
| `eft_maps_v1` | マップ画像メタデータ（`{ [mapName]: { file, width, height } }`）— 自動取得・グローバル |
| `eft_task_pins_v1` | タスク目標のピン座標配列（`[{ id, mapName, taskId, objectiveId, x, y, memo?, requiredItems?, memoImages? }]`）— グローバル。`memoImages` は詳細位置画像 `[{ id, name(省略名), dataUrl(JPEG) }]` |
| `eft_custom_items_v1` | 登録タスク品（API に無いクエストアイテム等）`[{ id:'citem_…', name, shortName, iconLink(128px PNG dataURL) }]` — グローバル。ピンの `requiredItems` から id 参照 |

#### モードごとに独立するキー（`__${mode}` サフィックス付き）

実際のキー名は `ベースキー + '__' + activeMode`（例: `eft_tool_v2__pvp`）。
**コード内では必ず `modeKey(ベースキー)` を使うこと。直接文字列で書かない。**

| ベースキー | 内容 |
|---|---|
| `eft_tool_v2` | メイン設定・進捗（レベル・トレーダー・ハイドアウト・スタッシュ等）|
| `eft_journal_v1` | 活動ジャーナル |
| `eft_plan_v1` | プランアイテム `[{ id, type, ... }]` |
| `eft_task_tabs_v1` | プロジェクトタブ `[{ id, name, color, goalTaskId }]` |
| `eft_raid_obj_checked_v1` | 出撃準備タブの目標ごとのチェック状態 |
| `eft_task_tags_v1` | 旧タグ機能（**廃止**・`eft_task_tabs_v1` への移行元としてのみ参照）|

### モードシステム設計（2026-07-04）

**モードの種類**: `pvp`（通常PvP）・`pve`（PvEサーバ）・`season_N`（シーズン1,2,3…）

**UIの位置**: タイトル下・タブバー上の「モードバー」（`.mode-bar`）  
→ `[PvP] [PvE] [Season 1] [+ シーズン追加]`。アクティブモードはアクセントカラーで強調。

**切り替え動作**: `switchMode(mode)` が `eft_active_mode` を書き換えて `window.location.reload()`。
セッション中にモードは変わらないので、`activeMode` と `seasons` は App 内でローカル変数（useState 不要）。

**初回マイグレーション**: `eft_active_mode` が未設定の場合、`initModeSystem()`（`99-mount.js` で呼出）が
既存データを `__pvp` キーに複製してモードを `pvp` に設定する。

**外部HTMLファイルでの対応**:
- `task-reward-lookup.html` — `getActivePlanKey()` で `eft_plan_v1__${mode}` に追加
- `task-tree-viewer.html` — `getTaskTabsKey()` で `eft_task_tabs_v1__${mode}` に保存
- `guide-viewer.html` — テーマ読み込みに `eft_tool_v2__${mode}` を参照（ガイドデータ自体はグローバル）
- 上記3ファイルは `window.addEventListener('storage', e => { if (e.key === 'eft_active_mode') location.reload(); })` で
  eft-tool.html のモード切替に追従して自動リロードする（guide-viewer.html は対象外・全モード共通のため）

**プランのエクスポート/インポート**: プランタブ上部のボタンから  
エクスポート → `eft_plan_${mode}_YYYY-MM-DD.json` としてダウンロード  
インポート → JSON を現在モードの `eft_plan_v1__${mode}` に上書きしてリロード

## タブ一覧

| id | ラベル | 役割 |
|---|---|---|
| `status` | （設定アイコン）| 基本設定・テーマ・トレーダー/ハイドアウトレベル入力 |
| `wipeflow` | プラン | タスク・ハイドアウト・トレーダー解放・バーターのゴールを1枚にまとめ、「今すぐやること」「必要アイテム合算」を表示（`eft_plan_v1` 保存・旧「序盤フロー」は廃止）|
| `advisor` | トレーダー解放 | LL解放条件アドバイザー |
| `hideout` | ハイドアウト | 施設アップグレード収集ナビ |
| `barter` | 欲しいものリスト | 物々交換・クラフト候補リスト |
| `tasks` | タスク検索 | タスク検索・完了管理・**プロジェクトタブ**（下記）|
| `raid` | 出撃準備 | 進行中タスクをマップで絞り込み、持ち込み/収集/設置/撃破の目標を一覧表示。スクショOCRまたは手動検索でタスク追加。`pinnedTaskIds`共有 |
| `maps` | マップ | タスク目標のマップ画像上へのピン登録・管理。出撃準備タブの地図可視化のデータ元 |
| `items` | アイテム一覧 | アイテム価格・利益計算 |
| `armor` | プレート | アーマープレート一覧（GraphQL停止中は利用不可）|
| `presets` | プリセット | 武器プリセット比較（GraphQL停止中は理論値・おすすめモッドが利用不可）|
| `ammo` | 弾薬 | 口径別・貫通力順の弾薬一覧＋入手手段。タスク解禁弾/クラフト弾はチップクリックでタスク検索/ハイドアウトへ遷移 |
| `keys` | 鍵一覧 | 鍵のフリマ価格推移・マップ別/平均価格ソート・重ねグラフ |
| `ocr` | スクリーンショット登録 | OCRによるスタッシュ自動入力 |
| `journal` | 活動ジャーナル | 日次活動グラフ・記録 |
| `event` | イベント | 開催中の期間限定イベントのタスク進行管理（イベントごとに内容を差し替え）|

### プロジェクトタブ（タスク検索内のサブタブ・2026-06-17）

旧「タグ付け」を置き換えた機能。各タスクカードのヘッダー行**完了ボタンの左にある**スキルツリーアイコン（`sitemap`・`.task-tree-btn-cell` 内）から
「このタスクをゴールにしたタブ」を作成すると、タスク検索の上部にサブタブ（`[全タスク] [タブ…]`）が並ぶ。

- **1タブ = 1ゴールタスク**。データは `eft_task_tabs_v1` = `[{ id:'tab_'+goalTaskId, name, color, goalTaskId }]`。
- タブ選択時：**検索結果リストも進行タスクボード（旧「進行中タスク」）も** `getAncestorTaskIds(goalTaskId)`（ゴール＋全前提タスクを再帰）に**絞り込み**（`tabAncestorIds`／`filteredTasks`・`pinnedTasks`・`mapTasks`）。検索/トレーダー/マップ/種別フィルタはその部分集合に対して従来通り機能。
- タブ**最上部にスキルツリー**（`ProjectTree` 再帰コンポーネント）を表示。**チップクリックで `searchForTaskByName(taskName, taskId)`** ＝そのタスク名で検索欄を埋めて検索（カード詳細内のタスクツリーのチップも同じ挙動）。プロジェクトタブは維持し、対象が現タブの絞り込み外のときだけ `'all'` に戻す。**タブ削除**はツリー右上の「タブ削除」ボタン（ポップオーバーには無い）。
- **進行タスクボード**: `pinnedTaskIds` がボード登録（＝進行中）、`mapTaskIds` がボード内ピン止め（上部固定）。ヘッダー右の「ピン止めをすべて外す」ボタン（**全タスク表示時＆ピン止め1件以上のときのみ**）は `setMapTaskIds([])` で**上部固定だけ解除**（`pinnedTaskIds` は不変＝タスクはボードに進行中として残る。完了状態も不変）。ボードからの除外は各行の list-check ボタンで個別に行う。
- **ゴールタスクが完了済み & 「完了タスクも表示」OFF のときは、ツリーもリストも何も表示しない**（ツリーブロックで早期 `return null`）。
- カードのボーダー色 = 所属タブ色（`taskTabColorMap`、先頭タブ優先）。
- 完了ボタンはツリーアイコンとの誤クリック防止に左右余白を広げてある（`.taskrow-complete`）。ヘッダーのグリッド列は `COL`（9列）＋ `ColHeader` で揃える。
- 旧 `eft_task_tags_v1` は新形式が無いときだけ一度きり移行（タグ群の末端タスクをゴールと推定）。

---

## アイテムID定数

### `LARGE_INPUT_ITEM_IDS`（`StashControl` の入力切替）

`StashControl` コンポーネントはデフォルトで `+`/`−` ボタンだが、このセットに含まれる `itemId` の場合は **数値入力欄（`<input type="number">`）** に切り替わる。

| アイテム | ID |
|---|---|
| ルーブル紙幣 (RUB) | `5449016a4bdc2d6f028b456f` |
| ドル紙幣 (USD) | `5696686a4bdc2da3298b456a` |
| ユーロ紙幣 (EUR) | `569668774bdc2da2298b4568` |

大量枚数になる通貨類は `+`/`−` での入力が現実的でないため。新たに同様の大量個数アイテムが出てきた場合はこのセットに追加する。

---

## ★ アイコン使用ルール（必ず守ること）

**絵文字（emoji）はUI描画に一切使わない。例外なし。** 過去に全タブ・ボタン・バッジ・セクションタイトルの絵文字をSVGアイコンに置換した経緯がある。
2026-06-12に **目的種別アイコン（旧 📦📍💀🚪📋📌⭐）・凡例・OCR/プロモ/Wikiタブの残存絵文字（📸📁🗑🎟📡🐦🟠💬🌐🔗📈🇯🇵✅❌✓✕▼⇄⟳ など）も全て `<Icon>` 化済み**。
`getObjTypeLabel` は絵文字ではなく **Iconコンポーネント名（`iconName`）を返す**ようになった。

全てのアイコンは `<Icon name="..." />` SVGコンポーネントで統一する。

```jsx
// ✅ 正しい
<div className="section-title">
  <Icon name="clipboard-list" size={14} color="var(--accent)" /> タスク検索
</div>
<button style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
  <Icon name="upload" size={12} color="var(--text-primary)" /> エクスポート
</button>

// ❌ 禁止（絵文字をUIに使う）
<span>✅ タスク完了</span>
<button>📤 エクスポート</button>
<div>🔥 ストリーク</div>
```

**唯一の許容（技術的制約のみ）:**
- `alert()` / `confirm()` などブラウザネイティブダイアログの文字列内（SVGを埋め込めないため）

それ以外は **一切例外なし**。開発中マーカーは絵文字（🚧）ではなく「（開発中）」のテキストで表す。
タイポグラフィの方向矢印（`→` `←` U+2190/2192 などをテキスト接続記号として使う箇所、例: `Lv2 → Lv3`）は絵文字ではないので対象外。

**目的種別 type → Icon name 対応（`getObjTypeLabel`）:**

| type | iconName | type | iconName |
|---|---|---|---|
| `findItem`/`findQuestItem` | `search` | `extract` | `arrow-right` |
| `giveItem` | `package` | `taskStatus` | `list-check` |
| `kill`/`shoot` | `skull` | `buildItem` | `tool` |
| `mark` | `download` | `plantItem` | `download` |
| `locate`/`visit` | `search` | `experience` | `star` |
| （default） | `arrow-right` | | |

**利用可能な Icon name 一覧:**

| name | 用途 |
|---|---|
| `target` | クロスヘア（アプリロゴ・狙う） |
| `settings` | 設定歯車 |
| `chart-bar` | 棒グラフ |
| `home` | ハイドアウト・家 |
| `shopping-cart` | カート・買い物 |
| `clipboard-list` | タスク・リスト |
| `search` | 検索 |
| `camera` | カメラ・OCR |
| `circle-check` | 完了済み・チェック |
| `circle-x` | ×・キャンセル |
| `alert-triangle` | 警告 |
| `package` | パッケージ・アイテム |
| `refresh` | 更新・ローディング |
| `pin` | ピン止め |
| `download` | ダウンロード |
| `chevron-up/down/right` | 折りたたみ矢印 |
| `map` | マップ |
| `link` | リンク |
| `star` | お気に入り（黄色） |
| `heart` | ハート（ピンク） |
| `building` | 施設・ビル |
| `backpack` | バックパック |
| `lock` / `lock-open` | ロック |
| `trophy` | トロフィー |
| `trending-up` | 上昇トレンド |
| `clock` | 時計・残り時間 |
| `fire` | 炎・緊急 |
| `globe` | 地球・Web |
| `book` | 本 |
| `x` | 閉じる・削除 |
| `arrow-right` | 右矢印 |
| `anchor` | 固定 |
| `sort` | ソート |
| `palette` | パレット・テーマ |
| `flag` | フラグ・残り1個 |
| `check` / `check-circle` | チェック |
| `map-pin` | マップピン |
| `skull` | スカル |
| `list-check` | チェックリスト |
| `tag` | タグ |
| `eye` / `eye-off` | ウォッチ（価格推移ウォッチボード登録） |

### 活動ジャーナル 入手種別 → Iconコンポーネント対応

| Icon name | type 値 | 意味 |
|---|---|---|
| `circle-check` | —（tasks フィールド） | タスク完了 |
| `shopping-cart` | `barter` | 物々交換で入手 |
| `tool` | `craft` | ハイドアウトで作成 |
| `home` | `hideout` | 施設アップグレード |

### ボタン・操作UI → Iconコンポーネント対応

| Icon name | 用途 |
|---|---|
| `upload` | エクスポート（ファイル書き出し） |
| `download` | インポート（ファイル読み込み）・保存 |
| `circle-check` | 完了・保存済み確認 |
| `x` | 閉じる・削除 |
| `pencil` | メモ・編集ラベル |
| `calendar` | 日付（今日表示など） |

---

## カラーシステム（CSS変数）

| 変数 | 用途 |
|---|---|
| `var(--accent)` | アクセントカラー（テーマで変わる、デフォルト黄色）|
| `var(--accent-on)` | アクセント上のテキスト色 |
| `var(--accent-muted)` | 薄いアクセント（背景など）|
| `var(--bg-primary)` | メイン背景 |
| `var(--bg-secondary)` | セクション背景 |
| `var(--border)` | ボーダー |
| `var(--border-light)` | 薄いボーダー |
| `var(--text-primary)` | メインテキスト |
| `var(--text-secondary)` | サブテキスト |
| `var(--text-dim)` | 薄いテキスト（ヒント・補足）|

意味のある固定色（テーマに依存しない・**2026-06-11に全てCSS変数化済み**）:

**JSX/CSSに生のhexを書かないこと。** 以下の変数を使う（`style.css` の `:root` で一元管理）:

| 変数ファミリ | 用途 | 主な内訳 |
|---|---|---|
| `--state-ok-*` | 成功・OK・完了・充足 | `--state-ok`(#22c55e) `--state-ok-text`(#86efac) `--state-ok-deep` bg各種 |
| `--danger-*` | エラー・危険・削除・ワイプ | `--danger`(#ef4444) `--danger-text`(#fca5a5) `--danger-pale/strong/deep` / 半透明 `--danger-bg`(0.18) `--danger-bg-mid`(0.1) `--danger-bg-weak`(0.08) `--danger-bg-faint`(0.07) `--danger-border-weak`(0.4) `--danger-border-strong`(0.5) |
| `--warn-*` | 警告・注意・狙いリスト★ | `--warn`(#f59e0b) `--warn-text`(#fcd34d) `--warn-deep` / 半透明 `--warn-bg`(0.2) `--warn-bg-mid`(0.18) `--warn-bg-weak`(0.08) |
| `--info-*` | 情報・クラフト系 | `--info`(#7dd3fc) `--info-deep` `--info-border`(#2563eb) / 半透明 `--info-bg`(0.15) `--info-bg-weak`(0.1) |
| `--fav-*` | ハート・お気に入り | `--fav`(#f472b6) `--fav-text`(#f9a8d4) `--fav-deep` `--fav-bg`(0.2) |

> `--state-ok-*` にも完了系の濃背景・半透明がある: `--state-ok-deep`(#14532d) `--state-ok-bg`(0.18) `--state-ok-bg-mid`(0.15) `--state-ok-bg-weak`(0.08) `--state-ok-bg-soft`(0.12) `--state-ok-bg-faint`(0.1) `--state-ok-border-weak`(0.4)。
> 全変数の正確な定義は **`style.css` の `:root` が一次情報**。新しい意味色が必要なときも生hex/rgbaを書かず、ここに変数を足してから使う。

**例外（生hexを維持しているデータ）:** `TAG_COLORS` 配列はプロジェクトタブの色として localStorage（`eft_task_tabs_v1`）に保存されるため var() 不可。生hexのまま変更しないこと。

**操作状態カラー（2026-06-11追加・`style.css` の `:root` で一元管理）:**

ピン止め・進行中・完了/充足・未解放など「ユーザー操作で切り替わる状態」の色は
`--state-*` CSS変数に統一済み。**状態の色を変えたい場合は変数を1箇所変えるだけで全タブに反映される。**

| 変数ファミリ | 状態 | 主な値 |
|---|---|---|
| `--state-pin-*` | ピン止め（マップピン） | `#ef4444` / muted `#c08080` / bg・border各種 |
| `--state-progress-*` | 進行中 | `#f59e0b` / muted `#a08050` / name `#b8a070` |
| `--state-ok-*` | 完了・充足・OK | `#22c55e` / text `#86efac` / muted `#5a9a70` / bg 3段階 |
| `--state-locked-*` | 未解放・LLロック | `#ef4444` / bg |

状態の見た目はモディファイアクラスで切り替える（JSX側は class 切替のみ）:
`.is-ok`（req-chip/obj-chip/ll-badge）、`.is-locked`（ll-badge）、
`.is-pinned` `.is-progress` `.is-done`（taskrow-btn）、`.is-checked` `.is-stocked`（delivery-chip）

**危険ゾーン（破壊的操作・警告エリア）の背景パターン:**

固定の暗色背景（例: `#1a0808`）は使わない。テーマの背景色を維持しつつ色味を乗せるため、半透明オーバーレイの**変数**を使う（生rgbaも直接書かない）。

```jsx
// ✅ 変数で色味を乗せる（テーマのベース背景に赤みが乗る・一元管理）
style={{ background: 'var(--danger-bg-faint)', border: '1px solid var(--danger-border-weak)' }}

// ❌ 固定の暗色背景（ライト系テーマで浮く） / ❌ 生rgbaの直書き（管理から外れる）
style={{ background: '#1a0808', border: '1px solid rgba(239,68,68,0.4)' }}
```

---

## UIコンポーネントパターン

```jsx
// セクション
<div className="section">
  <div className="section-title">
    <Icon name="..." size={14} color="var(--accent)" /> タイトル
  </div>
  {/* コンテンツ */}
</div>

// ボタン
<button className="btn btn-yellow">主要アクション</button>
<button className="btn btn-gray">補助アクション</button>
<button className="btn btn-sm">小さいボタン</button>

// バッジ
<span className="badge-urgent">緊急</span>
<span className="badge-soon">もうすぐ</span>
<span className="badge-ok">OK</span>
```

---

## 活動ジャーナル データ構造

```json
// localStorage: "eft_journal_v1"
{
  "2026-06-02": {
    "tasks": 3,
    "memo": "今日の一言",
    "gets": [
      { "name": "ADAR 2-15", "type": "barter", "time": "14:30" },
      { "name": "GPU",       "type": "craft",  "time": "15:00" },
      { "name": "Medstation Lv2", "type": "hideout", "time": "16:00" }
    ]
  }
}
```

**自動記録のトリガー:**
- `tasks` カウント加算: タスク検索タブで完了ボタンを押したとき（`toggleComplete`）
- `gets` 追記: 欲しいものリストの「✅ GET」「⚙️ GET」ボタン、ステータス画面のハイドアウトレベル「＋」ボタン

---

## 開発上の注意

- **バックアップを作ってから編集する**: 編集前に `eft-tool.html` を `backups/eft-tool.backup_YYYYMMDD.html` としてコピー
- **コード編集は `src/js/` 内のファイルを対象にする**: `eft-tool.html` は `build.sh`/`build.ps1` で生成される出力ファイルなので直接編集しない
- **ビルド → リロードで反映**: `src/js/` のファイルを編集 → `./build.sh`（Mac）or `.\build.ps1`（Windows）→ ブラウザリロード。`style.css` の変更はビルド不要でリロードのみ
- **既存のlocalStorageキーを変えない**: データが消える
- **`Icon` が未定義の name を参照すると `□` と表示される**: 新しいアイコンが必要なら `IP` オブジェクトにSVGパスを追加する
