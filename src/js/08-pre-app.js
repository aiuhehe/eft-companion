// ================== EVENT（期間限定イベント） ==================
// 開催中イベントのタスク定義（イベントごとに差し替え。手順は docs/イベント機能仕様書.md）。
// 名前の BLACKOUT_ は最初に対応したイベント名に由来する歴史的な名前。
// tarkov.dev API への反映が遅れる場合があるため、
// 既知タスクはハードコードで保持し、API に同名タスクが登録されたら自動的に
// completedTaskIds（共有）へ移行できるよう id フィールドを設ける。
// 新タスクが追加されたらここに追記する（apiId は API 登録後に埋める）。
// 現在: ハロウィン2026（情報源: Fandom Wiki 各クエストページ・2026-10-30 時点）
const BLACKOUT_TASKS_STATIC = [
  {
    key: 'hw26_rumors',
    apiId: null,
    name: 'Halloween: Rumors',
    nameJa: '噂',
    trader: 'Skier',
    branch: null,
    prereqs: [],
    map: 'Infected Factory',
    lore: '感染して正気を失う者が出ているという噂が Tarkov 中に広まっている。Skier は工場の様子を見てくるよう依頼し、出くわした感染者は始末しろと言う。',
    objectives: [
      { type: 'visit', description: 'Infected Factory を訪れる' },
      { type: 'kill', description: 'Infected Factory で感染者を10体倒す' },
    ],
    experience: 26000,
    euros: 1800,
    rewardItems: [
      { name: 'AA-12 Gen 2（TerraGroup Labs版）', count: 1 },
      { name: 'AA-12 20連ドラムマガジン', count: 3 },
      { name: '12/70 SuperFormance HP スラッグ（25発パック）', count: 4 },
    ],
  },
  {
    key: 'hw26_best_defense',
    apiId: null,
    name: 'Halloween: The Best Defense',
    nameJa: '最大の防御',
    trader: 'Skier',
    branch: null,
    prereqs: ['hw26_rumors'],
    map: 'Infected Lab',
    lore: 'ギャング同士が手を組むほど事態は深刻化している。発生直前にラボへ送り込んだ Skier の部隊は「明かりが消えた」という通信を最後に消息を絶った。生存者がいないか見てきてほしい。',
    objectives: [
      { type: 'visit', description: 'Infected Lab を訪れる' },
      { type: 'extract', description: '（任意）Infected Lab から生還する' },
      { type: 'findItem', description: '（任意）脱出口を使うための特殊アイテムを入手する' },
      { type: 'kill', description: 'Infected Lab で感染者を10体倒す' },
    ],
    tips: [
      'Infected Lab の脱出（Parking Gate / Sewage Conduit）には Collector map か Car keys が必要',
      'Car keys・Collector map は Recreation Area の丸い会議室にある。Collector map はサーバールームの PMC 死体にもある',
    ],
    experience: 36000,
    euros: 2700,
    rewardItems: [
      { name: 'Norinco QBZ-191', count: 1 },
      { name: 'QBZ-191 30連マガジン', count: 3 },
      { name: '5.8x42mm DBX95（30発パック）', count: 4 },
    ],
  },
  {
    key: 'hw26_followup',
    apiId: null,
    name: 'Halloween: Follow-Up Examination',
    nameJa: '追加検査',
    trader: 'Therapist',
    branch: null,
    prereqs: ['hw26_rumors'],
    unlockNote: '「最大の防御」を受注した時点で解放',
    map: 'Infected Lab / Infected Factory',
    lore: 'Therapist は以前の感染騒ぎと同じ病原体かを確かめたい。必要なのは自分で殺した個体ではなく、ウイルスで自然に死んだ者の血液。最初に被害を受けたであろう防護服姿のラボ職員を探してほしい。',
    objectives: [
      { type: 'locate', description: 'Infected Lab か Infected Factory で、防護服を着た科学者の死体を探す' },
      { type: 'findQuestItem', description: 'Medical tools（医療器具）で死体から血液サンプルを採る' },
      { type: 'giveItem', description: '血液サンプルを納品する' },
    ],
    tips: [
      'Medical tools を持ち込む（採取時に消費）',
      'Lab: Sewage Conduit へ向かうトンネル内 / 青カード部屋近くの交差点 / 作業エリア中央',
      'Factory: 医療ラボの外 / ポンプ設備のタンクの上',
    ],
    experience: 40000,
    euros: 2700,
    rewardItems: [
      { name: 'TerraGroup Labs アクセスキーカード', count: 2 },
      { name: 'アドレナリン注射器', count: 2 },
      { name: 'Trimadol', count: 2 },
    ],
  },
  {
    key: 'hw26_unexpected_help',
    apiId: null,
    name: 'Halloween: Unexpected Help',
    nameJa: '思わぬ助け',
    trader: 'Skier',
    branch: 'skier',
    choice: 'c1',
    prereqs: ['hw26_followup'],
    map: 'Lighthouse → Customs',
    lore: 'Skier は付き合いの長い業者から「前回の流行時に開発された本物のワクチン」を手に入れたという。Lighthouse の浄水施設で受け取り、Customs の寮に隠せ。荷を失くしたらただじゃおかない、と。',
    objectives: [
      { type: 'findQuestItem', description: 'Lighthouse の浄水場で TG-VI-26 ワクチン（FIR）を回収する' },
      { type: 'plantItem', description: 'Customs の2階建て寮 105号室にワクチンを隠す' },
    ],
    tips: [
      'ワクチンは浄水場（WTP）3号棟の2階',
      '寮の 105号室の鍵が必要',
      '「初期検査」でワクチンを Therapist に渡すと、このタスクは失敗になる',
    ],
    experience: 38000,
    euros: 2700,
    rewardItems: [
      { name: 'Ammunition case', count: 1 },
    ],
  },
  {
    key: 'hw26_initial_exam',
    apiId: null,
    name: 'Halloween: Initial Examination',
    nameJa: '初期検査',
    trader: 'Therapist',
    branch: 'therapist',
    choice: 'c1',
    prereqs: ['hw26_followup'],
    unlockNote: '「思わぬ助け」を受注した時点で解放',
    map: 'Lighthouse',
    lore: 'Skier に渡ればワクチンはすぐ一般に配られてしまう。素性も保管状態もろくに確認されていない薬を使わせる前に、自分のところへ持ってきて検査させてほしい、と Therapist は頼む。',
    objectives: [
      { type: 'giveItem', description: 'TG-VI-26 ワクチン（FIR）を Therapist に納品する' },
    ],
    tips: [
      'ワクチンの場所は「思わぬ助け」と同じ（Lighthouse 浄水場 3号棟2階）',
      'ワクチンを寮に隠すと、このタスクは失敗になる',
    ],
    experience: 38000,
    rubles: 200000,
    rewardItems: [
      { name: 'Document case', count: 1 },
    ],
  },
  {
    key: 'hw26_tightening',
    apiId: null,
    name: 'Halloween: Tightening The Quarantine',
    nameJa: '隔離の強化',
    trader: 'Skier',
    branch: 'skier',
    choice: 'c2',
    prereqs: [],
    prereqsAny: ['hw26_unexpected_help', 'hw26_initial_exam'],
    unlockNote: '分岐①の完了から15〜60分後に解放',
    map: '納品のみ',
    lore: 'ワクチンが出回ってから死者が増え、感染者は凶暴化した。業者は姿を消し、Skier が非難の矢面に立たされている。隔離を維持するため、部下に配る医療品を集めろ。そして、どちらの側につくかをここで決めろ。',
    variants: [
      {
        label: '分岐①で Skier 側（ワクチンを隠した）',
        objectives: [
          { type: 'giveItem', description: '重度出血を止められる医療キット 5個（FIR）を納品' },
          { type: 'giveItem', description: '医療用バーム 2個（FIR）を納品' },
          { type: 'giveItem', description: '手術キット 2個（FIR）を納品' },
        ],
        experience: 48000,
        euros: 1800,
        rewardItems: [
          { name: 'AK-12', count: 1 },
          { name: 'AK-12 初期型30連マガジン', count: 3 },
          { name: '5.45x39mm 7N40（120発パック）', count: 1 },
        ],
      },
      {
        label: '分岐①で Therapist 側（ワクチンを渡した）',
        objectives: [
          { type: 'giveItem', description: '重度出血を止められる医療キット 7個（FIR）を納品' },
          { type: 'giveItem', description: '医療用バーム 3個（FIR）を納品' },
          { type: 'giveItem', description: '手術キット 3個（FIR）を納品' },
        ],
        experience: 48000,
        euros: 2700,
        rewardItems: [
          { name: 'Money case', count: 1 },
        ],
      },
    ],
  },
  {
    key: 'hw26_new_vaccine',
    apiId: null,
    name: 'Halloween: A new Vaccine',
    nameJa: '新たなワクチン',
    trader: 'Therapist',
    branch: 'therapist',
    choice: 'c2',
    prereqs: [],
    prereqsAny: ['hw26_unexpected_help', 'hw26_initial_exam'],
    unlockNote: '分岐①の完了から15分後に解放',
    map: 'Infected Factory / Infected Lab',
    lore: '（Wiki 未掲載）',
    variants: [
      {
        label: '分岐①で Skier 側（ワクチンを隠した）',
        objectives: [
          { type: 'extract', description: 'Infected Factory から生還する' },
          { type: 'extract', description: 'Infected Lab から生還する' },
          { type: 'giveItem', description: '2,000 ドルを納品する' },
          { type: 'findItem', description: '脱出口を使うための特殊アイテムを入手する' },
        ],
        experience: 41000,
        rubles: 300000,
        rewardItems: [
          { name: 'Mr. Holodilnick 保冷バッグ', count: 2 },
        ],
      },
      {
        label: '分岐①で Therapist 側（ワクチンを渡した）',
        objectives: [
          { type: 'extract', description: 'Infected Factory か Infected Lab から生還する' },
        ],
        experience: 41000,
        rubles: 150000,
        rewardItems: [
          { name: 'TerraGroup Labs アクセスキーカード', count: 2 },
          { name: 'Surv12 手術キット', count: 2 },
        ],
      },
    ],
  },
  {
    key: 'hw26_danger_zone',
    apiId: null,
    name: 'Halloween: Danger Zone',
    nameJa: '危険地帯',
    trader: 'Skier',
    branch: 'skier',
    prereqs: ['hw26_tightening'],
    map: '一般マップ8か所',
    lore: '検問ではボスたちが締め付けを強め、怪しい者は問答無用で撃たれている。Skier は自分が事態を収められると見せつけたい。怪しい者を見つけたら始末しろ。見返りに感染者の死体を漁る許可をやる。組織サンプルは Therapist が高く買うらしい。',
    objectives: [
      { type: 'kill', description: 'Ground Zero か Customs で、どの敵でも15体倒す' },
      { type: 'kill', description: 'Woods か Interchange で、どの敵でも15体倒す' },
      { type: 'kill', description: 'Shoreline か Streets of Tarkov で、どの敵でも15体倒す' },
      { type: 'kill', description: 'Lighthouse か Reserve で、どの敵でも15体倒す' },
    ],
    experience: 44000,
    euros: 2800,
    rewardItems: [
      { name: '武器修理キット', count: 1 },
      { name: 'IOTV Gen4（Full Protection Kit, MultiCam）', count: 1 },
      { name: '感染組織サンプル', count: 1 },
      { name: 'バーター解放: Lucky Scav Junk box（Therapist LL1）', count: 1 },
      { name: 'バーター解放: Medicine case（Therapist LL2）', count: 1 },
    ],
  },
  {
    key: 'hw26_coincidence',
    apiId: null,
    name: 'Halloween: Coincidence?',
    nameJa: '偶然か？',
    trader: 'Skier',
    branch: 'skier',
    prereqs: ['hw26_danger_zone'],
    map: 'Lighthouse',
    lore: '感染があまりに整然と広がっている。誰かが隔離の限界を試しているかのようだ。そのうえ Lighthouse から怪しい信号が出ている。発信源を突き止め、周辺を探って役に立ちそうな物を持ち帰れ。',
    objectives: [
      { type: 'locate', description: 'Lighthouse で信号の発信源を探す' },
      { type: 'findQuestItem', description: '周辺で手がかり（TerraGroup 感染進行データのフォルダ・FIR）を入手する' },
      { type: 'giveItem', description: '手がかりを納品する' },
    ],
    experience: 42000,
    rubles: 2700,
    rewardItems: [
      { name: 'PKM', count: 1 },
      { name: 'PK 100連ボックスマガジン', count: 2 },
      { name: '7.62x54mm R BT（20発パック）', count: 10 },
    ],
  },
  {
    key: 'hw26_prototyping',
    apiId: null,
    name: 'Halloween: Prototyping',
    nameJa: '試作',
    trader: '不明',
    branch: 'skier',
    pending: true,
    prereqs: ['hw26_danger_zone'],
    lore: '',
    objectives: [],
    experience: 0,
    rewardItems: [],
  },
  {
    key: 'hw26_high_risk',
    apiId: null,
    name: 'Halloween: High-Risk, High-Rewards',
    nameJa: 'ハイリスク・ハイリターン',
    trader: '不明',
    branch: 'therapist',
    pending: true,
    prereqs: ['hw26_new_vaccine'],
    lore: '',
    objectives: [],
    experience: 0,
    rewardItems: [],
  },
];

// イベントタスクのフロー図レイアウト（上から順に1行ずつ描画）。
// center: 中央1列 / skier・therapist: 左右の陣営列。choice を持つ行は「どちらか一方」の分岐。
const EVENT_FLOW = [
  { center: ['hw26_rumors'] },
  { center: ['hw26_best_defense'] },
  { center: ['hw26_followup'] },
  { choice: '分岐① ワクチンをどうする？', skier: ['hw26_unexpected_help'], therapist: ['hw26_initial_exam'] },
  { choice: '分岐② どちらの陣営につく？', skier: ['hw26_tightening'], therapist: ['hw26_new_vaccine'] },
  { skier: ['hw26_danger_zone'], therapist: ['hw26_high_risk'] },
  { skier: ['hw26_coincidence', 'hw26_prototyping'], therapist: [] },
];

// 事前に用意しておくと詰まらないもの
const EVENT_PREP = [
  { name: 'Medical tools（医療器具）', note: '追加検査で血液採取に使用（消費）' },
  { name: 'Customs 寮 105号室の鍵', note: '思わぬ助け（Skier 側）でワクチンを隠す' },
  { name: 'Collector map か Car keys', note: 'Infected Lab の脱出に必要（Lab 内で入手可）' },
  { name: '重度出血を止められる医療キット 7個（FIR）', note: '隔離の強化。Skier 側なら5個' },
  { name: '医療用バーム 3個・手術キット 3個（FIR）', note: '隔離の強化。Skier 側なら各2個' },
  { name: '2,000 ドル', note: '新たなワクチン（分岐①で Skier 側を選んだ場合）' },
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

