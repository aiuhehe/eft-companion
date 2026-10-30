// ================== EVENT（期間限定イベント） ==================
// 開催中イベントのタスク定義（イベントごとに差し替え。手順は docs/イベント機能仕様書.md）。
// 名前の BLACKOUT_ は最初に対応したイベント名に由来する歴史的な名前。
// tarkov.dev API への反映が遅れる場合があるため、
// 既知タスクはハードコードで保持し、API に同名タスクが登録されたら自動的に
// completedTaskIds（共有）へ移行できるよう id フィールドを設ける。
// 新タスクが追加されたらここに追記する（apiId は API 登録後に埋める）。
const BLACKOUT_TASKS_STATIC = [
  {
    key: 'blackout_1',
    apiId: null,                // tarkov.dev API への登録後に埋める
    name: 'Wrench and Waterboarding',
    nameJa: 'レンチと水責め',
    trader: 'Skier',
    prereqs: [],
    lore: 'よし、相棒。ちょっと本格的な仕事に興味あるか？楽な仕事じゃねえぞ、先に言っとく。あの地下ラボを根こそぎ空っぽにしてやる。\n数日前、TerraGroupのあの施設で働いてた民間人を1人捕まえた。入館セキュリティか何かの担当だったらしい。最初は口を割らなかったが、じっくり"話し合った"らちゃんと吐いたよ。\nやつが言うには、ラボが非常用電源に切り替わると、封鎖区画が全部同じアクセスコードで開けられるようになるらしい。これがどういうことか分かるか？こんな好条件で中に入った奴なんて今までいねえ！\nあそこについちゃまだよく分かってねえが、すでに何組かのクルーを送り込んで叩かせてる。まずはお前にも中を見てきてもらいたい。',
    objectives: [
      { type: 'extract', description: 'ラボを訪れる' },
    ],
    experience: 15000,
    rubles: 89962,
    rewardItems: [
      { name: 'Cyclone Shakhin 3.7x サーマルスコープ', count: 2 },
      { name: 'Torrey Pines Logic T12W 30Hz サーマルリフレックスサイト', count: 2 },
    ],
  },
  {
    key: 'blackout_2',
    apiId: null,
    name: 'Key to Every Door',
    nameJa: 'あらゆるドアの鍵',
    trader: 'Skier',
    prereqs: ['blackout_1'],
    lore: 'あの締め上げた男が本当のことを言ってたか、確かめる時が来た。あの情報提供者を捕まえるのにどれだけ骨を折ったか、お前には分からんだろうな…\nラボがまだ非常用電源で動いてる間に、お前にはその緊急アクセスコードを見つけてもらいたい。あと、それがちゃんと機能するかも確認しろ。設計図は持ってないが、お前らの中に前にあそこへ入ったことがある奴がいるって聞いた。何とかなるだろ？\n俺だったら管理オフィスから当たるね。セキュリティ関連か、電源システム、あるいはメインサーバールームの近くだ。どうせ特殊な鍵で施錠されてるだろうよ。\n今大事なのは、そのコードを見つけて、普段キーカードで施錠されてるドアならどこでも試してみることだ。分かったか？',
    objectives: [
      { type: 'findQuestItem', description: 'ラボ内で緊急アクセスコードを見つける' },
      { type: 'findQuestItem', description: '緊急アクセスコードが機能するか確認する' },
    ],
    experience: 33000,
    rubles: 197917,
    rewardItems: [
      { name: 'Trijicon REAP-IR サーマルスコープ', count: 1 },
      { name: 'FLIR RS-32 2.25-9x35mm 60Hz サーマルライフルスコープ', count: 1 },
    ],
  },
];

// ================== PLAN (プラン) ==================
// プランタブ用定数・ストレージキー
const PLAN_KEY = 'eft_plan_v1';
// プランアイテム type: 'task' | 'project_tab' | 'hideout' | 'trader' | 'barter'
const PLAN_TYPE_META = {
  task:        { icon: 'clipboard-list', color: 'var(--info)' },
  project_tab: { icon: 'sitemap',        color: 'var(--accent)' },
  hideout:     { icon: 'home',           color: 'var(--state-ok-text)' },
  trader:      { icon: 'chart-bar',      color: 'var(--warn-text)' },
  barter:      { icon: 'shopping-cart',  color: 'var(--fav-text)' },
};

// ================== AMMO ACQUISITION ==================
// 弾薬アイテムの入手手段を分類して返す（弾薬タブで使用）。
// 返り値: [{ kind:'direct'|'task'|'craft'|'barter'|'none', label, taskName?, taskId?, stationId? }]
// kind='task' はタスク検索へ、kind='craft' はハイドアウトへ遷移可能（onClick対象）。
function getAmmoAcquisitions(item) {
  const out = [];
  const direct = [];
  const tasked = [];
  (item.buyFor || []).forEach(b => {
    const v = b.vendor || {};
    const nm = v.name;
    if (!nm || v.normalizedName === 'flea-market') return; // 弾は全てnoFlea。フリマは対象外
    const ll = v.minTraderLevel;
    const tk = v.taskUnlock;
    if (tk) {
      tasked.push({ kind: 'task', label: `${nm} LL${ll}／${tk.name}`, taskName: tk.name, taskId: tk.id });
    } else {
      direct.push({ ll: ll || 99, kind: 'direct', label: `直販 ${nm} LL${ll}` });
    }
  });
  if (direct.length) {
    direct.sort((a, b) => a.ll - b.ll);
    out.push(direct[0]);
  }
  tasked.forEach(t => out.push(t));
  (item.craftsFor || []).forEach(c => {
    out.push({ kind: 'craft', label: `クラフト ${c.station.name} Lv${c.level}`, stationId: c.station.id });
  });
  (item.bartersFor || []).forEach(b => {
    const tk = b.taskUnlock;
    out.push({
      kind: 'barter',
      label: `物々交換 ${b.trader.name} LL${b.level}${tk ? `（要:${tk.name}）` : ''}`,
      taskName: tk ? tk.name : null, taskId: tk ? tk.id : null,
    });
  });
  if (!out.length) out.push({ kind: 'none', label: '入手手段なし（ルート/タスク報酬のみ）' });
  return out;
}

// 口径キー（Caliber除去後）→ 実口径mm（並び替え用）
// 追加ゲームアップデートで新口径が増えたらここに追記する
const CALIBER_MM = {
  '46x30':      4.6,
  '545x39':     5.45,
  '556x45NATO': 5.56,
  '57x28':      5.7,
  '68x51':      6.8,
  '762x25TT':   7.62,
  '762x35':     7.62,
  '762x39':     7.62,
  '762x51':     7.62,
  '762x54R':    7.62,
  '300BLK':     7.62,
  '338LM':      8.58,
  '9x18PM':     9.0,
  '9x19PARA':   9.0,
  '9x21':       9.0,
  '9x39':       9.0,
  '366TKM':     9.3,
  '127x55':     12.7,
  '20Gauge':    15.6,
  '12Gauge':    18.5,
  '23x75':      23.0,
  '40mmRU':     40.0,
};
// テーブル未登録の場合の簡易フォールバック（3桁→/100、2桁かつGauge含む→gauge変換）
function caliberToMm(cal) {
  if (CALIBER_MM[cal] !== undefined) return CALIBER_MM[cal];
  if (cal.includes('Gauge')) return 1000 / parseInt(cal); // ゲージ→大きいほど小口径
  const m = cal.match(/^(\d+)/);
  if (!m) return 0;
  const n = parseInt(m[1]);
  return n >= 100 ? n / 100 : n;
}

