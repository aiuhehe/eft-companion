// ================== EVENT（期間限定イベント） ==================
// 開催中イベントのタスク定義（イベントごとに差し替え。手順は docs/イベント機能仕様書.md）。
// 名前の BLACKOUT_ は最初に対応したイベント名に由来する歴史的な名前。
// tarkov.dev API への反映が遅れる場合があるため、
// 既知タスクはハードコードで保持し、API に同名タスクが登録されたら自動的に
// completedTaskIds（共有）へ移行できるよう id フィールドを設ける。
// 新タスクが追加されたらここに追記する（apiId は API 登録後に埋める）。
// 現在: ハロウィン2026（情報源: Fandom Wiki 各クエストページ・2026-10-30 時点）
// objectives の追加フィールド（カスタムタスク化で使う。表示には影響しない）:
//   maps: 出撃準備タブのマップ名（RAID_MAPS の英語名。Infected Factory→'Factory'、Infected Lab→'The Lab'）
//   count / target（kill）/ itemId・itemName・fir（アイテム系）/ category（「任意の○○」系）/ questItemName（findQuestItem）
// rewardItems の id は tarkov.dev のアイテムID（アイコン表示・カスタムタスクの報酬に使用）。
// unlock: { trader, level } があれば「バーター解放」報酬として扱う。
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
      { type: 'visit', description: 'Infected Factory を訪れる', maps: ['Factory'] },
      { type: 'kill', description: 'Infected Factory で感染者を10体倒す', maps: ['Factory'], target: 'Infected', count: 10 },
    ],
    experience: 26000,
    euros: 1800,
    rewardItems: [
      { id: '671a425a7d49aea42c029b56', name: 'AA-12 Gen 2（TerraGroup Labs版）', count: 1 },
      { id: '6709133fa532466d5403fb7c', name: 'AA-12 20連ドラムマガジン', count: 3 },
      { id: '6570247ebfc87b3a34093229', name: '12/70 SuperFormance HP スラッグ（25発パック）', count: 4 },
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
      { type: 'visit', description: 'Infected Lab を訪れる', maps: ['The Lab'] },
      { type: 'extract', description: '（任意）Infected Lab から生還する', maps: ['The Lab'] },
      { type: 'findItem', description: '（任意）脱出口を使うための特殊アイテム（Collector map か Car keys）を入手する', maps: ['The Lab'], itemId: '6ad5f06c0d239d9ef60e7670', itemName: 'Collector map / Car keys' },
      { type: 'kill', description: 'Infected Lab で感染者を10体倒す', maps: ['The Lab'], target: 'Infected', count: 10 },
    ],
    tips: [
      'Infected Lab の脱出（Parking Gate / Sewage Conduit）には Collector map か Car keys が必要',
      'Car keys・Collector map は Recreation Area の丸い会議室にある。Collector map はサーバールームの PMC 死体にもある',
    ],
    experience: 36000,
    euros: 2700,
    rewardItems: [
      { id: '69f9ebbcaae020b0db02f65d', name: 'Norinco QBZ-191', count: 1 },
      { id: '69f9ec5a7596e93e340c0a1e', name: 'QBZ-191 30連マガジン', count: 3 },
      { id: '6a9961d053d704c9d005660e', name: '5.8x42mm DBX95（30発パック）', count: 4 },
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
      { type: 'locate', description: 'Infected Lab か Infected Factory で、防護服を着た科学者の死体を探す', maps: ['The Lab', 'Factory'] },
      { type: 'findQuestItem', description: 'Medical tools（医療器具）で死体から血液サンプルを採る', maps: ['The Lab', 'Factory'], questItemName: '血液サンプル' },
      { type: 'giveItem', description: '血液サンプルを納品する', questItemName: '血液サンプル' },
    ],
    tips: [
      'Medical tools を持ち込む（採取時に消費）',
      'Lab: Sewage Conduit へ向かうトンネル内 / 青カード部屋近くの交差点 / 作業エリア中央',
      'Factory: 医療ラボの外 / ポンプ設備のタンクの上',
    ],
    experience: 40000,
    euros: 2700,
    rewardItems: [
      { id: '5c94bbff86f7747ee735c08f', name: 'TerraGroup Labs アクセスキーカード', count: 2 },
      { id: '5c10c8fd86f7743d7d706df3', name: 'アドレナリン注射器', count: 2 },
      { id: '637b620db7afa97bfc3d7009', name: 'Trimadol', count: 2 },
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
      { type: 'findQuestItem', description: 'Lighthouse の浄水場で TG-VI-26 ワクチン（FIR）を回収する', maps: ['Lighthouse'], questItemName: 'TG-VI-26 ワクチン' },
      { type: 'plantItem', description: 'Customs の2階建て寮 105号室にワクチンを隠す', maps: ['Customs'] },
    ],
    tips: [
      'ワクチンは浄水場（WTP）3号棟の2階',
      '寮の 105号室の鍵が必要',
      '「初期検査」でワクチンを Therapist に渡すと、このタスクは失敗になる',
    ],
    experience: 38000,
    euros: 2700,
    rewardItems: [
      { id: '5aafbde786f774389d0cbc0f', name: 'Ammunition case', count: 1 },
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
      { type: 'findQuestItem', description: 'Lighthouse の浄水場で TG-VI-26 ワクチン（FIR）を回収する', maps: ['Lighthouse'], questItemName: 'TG-VI-26 ワクチン' },
      { type: 'giveItem', description: 'TG-VI-26 ワクチンを Therapist に納品する', questItemName: 'TG-VI-26 ワクチン' },
    ],
    tips: [
      'ワクチンの場所は「思わぬ助け」と同じ（Lighthouse 浄水場 3号棟2階）',
      'ワクチンを寮に隠すと、このタスクは失敗になる',
    ],
    experience: 38000,
    rubles: 200000,
    rewardItems: [
      { id: '590c60fc86f77412b13fddcf', name: 'Document case', count: 1 },
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
          { type: 'giveItem', description: '重度出血を止められる医療キット 5個（FIR）を納品', category: '重度出血を止められる医療キット', count: 5, fir: true },
          { type: 'giveItem', description: '医療用バーム 2個（FIR）を納品', category: '医療用バーム', count: 2, fir: true },
          { type: 'giveItem', description: '手術キット 2個（FIR）を納品', category: '手術キット', count: 2, fir: true },
        ],
        experience: 48000,
        euros: 1800,
        rewardItems: [
          { id: '6499849fc93611967b034949', name: 'AK-12', count: 1 },
          { id: '649ec30cb013f04a700e60fb', name: 'AK-12 初期型30連マガジン', count: 3 },
          { id: '6570900858b315e8b70a8a98', name: '5.45x39mm 7N40（120発パック）', count: 1 },
        ],
      },
      {
        label: '分岐①で Therapist 側（ワクチンを渡した）',
        objectives: [
          { type: 'giveItem', description: '重度出血を止められる医療キット 7個（FIR）を納品', category: '重度出血を止められる医療キット', count: 7, fir: true },
          { type: 'giveItem', description: '医療用バーム 3個（FIR）を納品', category: '医療用バーム', count: 3, fir: true },
          { type: 'giveItem', description: '手術キット 3個（FIR）を納品', category: '手術キット', count: 3, fir: true },
        ],
        experience: 48000,
        euros: 2700,
        rewardItems: [
          { id: '59fb016586f7746d0d4b423a', name: 'Money case', count: 1 },
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
          { type: 'extract', description: 'Infected Factory から生還する', maps: ['Factory'] },
          { type: 'extract', description: 'Infected Lab から生還する', maps: ['The Lab'] },
          { type: 'giveItem', description: '2,000 ドルを納品する', itemId: '5696686a4bdc2da3298b456a', itemName: 'ドル', count: 2000 },
          { type: 'findItem', description: '脱出口を使うための特殊アイテム（Collector map か Car keys）を入手する', maps: ['The Lab'], itemId: '6ad5f06c0d239d9ef60e7670', itemName: 'Collector map / Car keys' },
        ],
        experience: 41000,
        rubles: 300000,
        rewardItems: [
          { id: '5c093db286f7740a1b2617e3', name: 'Mr. Holodilnick 保冷バッグ', count: 2 },
        ],
      },
      {
        label: '分岐①で Therapist 側（ワクチンを渡した）',
        objectives: [
          { type: 'extract', description: 'Infected Factory か Infected Lab から生還する', maps: ['Factory', 'The Lab'] },
        ],
        experience: 41000,
        rubles: 150000,
        rewardItems: [
          { id: '5c94bbff86f7747ee735c08f', name: 'TerraGroup Labs アクセスキーカード', count: 2 },
          { id: '5d02797c86f774203f38e30a', name: 'Surv12 手術キット', count: 2 },
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
      { type: 'kill', description: 'Ground Zero か Customs で、どの敵でも15体倒す', maps: ['Ground Zero', 'Customs'], target: 'Any target', count: 15 },
      { type: 'kill', description: 'Woods か Interchange で、どの敵でも15体倒す', maps: ['Woods', 'Interchange'], target: 'Any target', count: 15 },
      { type: 'kill', description: 'Shoreline か Streets of Tarkov で、どの敵でも15体倒す', maps: ['Shoreline', 'Streets of Tarkov'], target: 'Any target', count: 15 },
      { type: 'kill', description: 'Lighthouse か Reserve で、どの敵でも15体倒す', maps: ['Lighthouse', 'Reserve'], target: 'Any target', count: 15 },
    ],
    experience: 44000,
    euros: 2800,
    rewardItems: [
      { id: '5910968f86f77425cf569c32', name: '武器修理キット', count: 1 },
      { id: '5b44cd8b86f774503d30cba2', name: 'IOTV Gen4（Full Protection Kit, MultiCam）', count: 1 },
      { id: '6acc4af5ada0d6309902b049', name: '感染組織サンプル', count: 1 },
      { id: '5b7c710788a4506dec015957', name: 'Lucky Scav Junk box', count: 1, unlock: { trader: 'Therapist', level: 1 } },
      { id: '5aafbcd986f7745e590fff23', name: 'Medicine case', count: 1, unlock: { trader: 'Therapist', level: 2 } },
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
      { type: 'locate', description: 'Lighthouse で信号の発信源を探す', maps: ['Lighthouse'] },
      { type: 'findQuestItem', description: '周辺で手がかり（TerraGroup 感染進行データのフォルダ・FIR）を入手する', maps: ['Lighthouse'], questItemName: 'TerraGroup 感染進行データのフォルダ' },
      { type: 'giveItem', description: '手がかりを納品する', questItemName: 'TerraGroup 感染進行データのフォルダ' },
    ],
    experience: 42000,
    rubles: 2700,
    rewardItems: [
      { id: '64637076203536ad5600c990', name: 'PKM', count: 1 },
      { id: '646372518610c40fc20204e8', name: 'PK 100連ボックスマガジン', count: 2 },
      { id: '65702572c5d7d4cb4d078576', name: '7.62x54mm R BT（20発パック）', count: 10 },
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

// 事前に用意しておくと詰まらないもの（itemIds はアイコン表示用。複数なら代表例を並べる）
const EVENT_PREP = [
  { name: 'Medical tools（医療器具）', note: '追加検査で血液採取に使用（消費）', itemIds: ['619cc01e0a7c3a1a2731940c'] },
  { name: 'Customs 寮 105号室の鍵', note: '思わぬ助け（Skier 側）でワクチンを隠す', itemIds: ['591382d986f774465a6413a7'] },
  { name: 'Collector map か Car keys', note: 'Infected Lab の脱出に必要（Lab 内で入手可）', itemIds: ['6ad5f06c0d239d9ef60e7670', '6ad5f141e8c146f24d0ea9b6'] },
  { name: '重度出血を止められる医療キット 7個（FIR）', note: '隔離の強化。Skier 側なら5個（AFAK・IFAK・Grizzly・Salewa など）', itemIds: ['60098ad7c2240c0fe85c570a', '590c678286f77426c9660122', '590c657e86f77412b013051d', '544fb45d4bdc2dee738b4568'] },
  { name: '医療用バーム 3個・手術キット 3個（FIR）', note: '隔離の強化。Skier 側なら各2個', itemIds: ['5751a89d24597722aa0e8db0', '5d02778e86f774203e7dedbe', '5d02797c86f774203f38e30a'] },
  { name: '2,000 ドル', note: '新たなワクチン（分岐①で Skier 側を選んだ場合）', itemIds: ['5696686a4bdc2da3298b456a'] },
];

// 通貨報酬 → tarkov.dev のアイテムID（カスタムタスクの報酬に変換するとき使う）
const CURRENCY_ITEM_IDS = { rubles: '5449016a4bdc2d6f028b456f', euros: '569668774bdc2da2298b4568', dollars: '5696686a4bdc2da3298b456a' };
const CURRENCY_NAMES = { rubles: 'ルーブル', euros: 'ユーロ', dollars: 'ドル' };

// イベントタスク（variant を選んだもの）を出撃準備タブのカスタムタスク形式に変換する。
// id は 'custom_event_{key}' 固定（同じタスクを追加し直すと上書き）。
// itemIcon(id) はアイテムIDからアイコンURLを返す関数。
function eventTaskToCustomTask(task, variant, itemIcon) {
  const src = variant || task;
  const itemRef = (id, name) => ({ id, name, iconLink: itemIcon(id) || '' });
  // クエストアイテムの「納品」は同じタスク内の「入手」と重複するので除く（出撃準備では入手だけ表示すれば足りる）
  const collectedQi = new Set((src.objectives || []).filter(o => o.type === 'findQuestItem').map(o => o.questItemName));
  const objectives = (src.objectives || []).flatMap((o, i) => {
    if (o.type === 'giveItem' && o.questItemName && collectedQi.has(o.questItemName)) return [];
    const base = {
      id: `custom_event_${task.key}_obj${i}`,
      maps: (o.maps || []).map(m => ({ name: m })),
      count: o.count || 1,
      description: o.description,
    };
    // 出撃準備タブの編集フォームで開き直しても崩れない型（findItem / giveItem / kill / mark / extract / locate）に揃える
    if (o.type === 'kill') return { ...base, type: 'kill', foundInRaid: false, target: o.target || 'Any target', bodyParts: [], distance: null };
    if (o.type === 'extract') return { ...base, type: 'extract', foundInRaid: false };
    if (o.type === 'visit' || o.type === 'locate') return { ...base, type: 'locate', foundInRaid: false };
    if (o.type === 'plantItem' || o.type === 'mark') return { ...base, type: 'mark', foundInRaid: false, markerItem: null };
    if (o.questItemName) return { ...base, type: 'findItem', foundInRaid: true, item: { id: `custom_qi_${task.key}_${i}`, name: o.questItemName, iconLink: '' } };
    if (o.category) return { ...base, type: o.fir ? 'findItem' : 'giveItem', foundInRaid: !!o.fir, item: null, itemCategory: { name: o.category } };
    if (o.itemId) return { ...base, type: 'findItem', foundInRaid: !!o.fir, item: itemRef(o.itemId, o.itemName || '') };
    return { ...base, type: 'locate', foundInRaid: false };
  });
  const money = Object.keys(CURRENCY_ITEM_IDS).filter(f => src[f] > 0)
    .map(f => ({ item: itemRef(CURRENCY_ITEM_IDS[f], CURRENCY_NAMES[f]), count: src[f] }));
  const rewards = src.rewardItems || [];
  return {
    id: `custom_event_${task.key}`,
    name: `${task.nameJa}（${task.name}）`,
    trader: { name: task.trader },
    wikiLink: `https://escapefromtarkov.fandom.com/wiki/${encodeURIComponent(task.name.replace(/ /g, '_'))}`,
    objectives,
    experience: src.experience || 0,
    finishRewards: {
      traderStanding: [],
      items: [...money, ...rewards.filter(r => !r.unlock).map(r => ({ item: itemRef(r.id, r.name), count: r.count || 1 }))],
      offerUnlock: rewards.filter(r => r.unlock).map(r => ({ trader: { name: r.unlock.trader }, level: r.unlock.level, item: itemRef(r.id, r.name) })),
    },
  };
}

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

