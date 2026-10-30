// EFT Gunsmith ガイドデータ
// guide-viewer.html と eft-tool.html の両方から <script src> で読み込む
// taskId: tarkov.dev のタスクID（後で埋める）

const GUIDES = [
  {
    "id": "gunsmith-1",
    "title": "Gunsmith - Old Friend's Request (PP-19-01 Vityaz)",
    "taskId": "",
    "taskName": "Gunsmith - Old Friend's Request",
    "steps": [
      {
        "id": "s1",
        "title": "ハンドガードを交換",
        "item": "PP-19-01 Vityaz SAG MK1 M-LOK handguard with gas tube",
        "traders": [{ "name": "Mechanic", "ll": 2 }],
        "substeps": null,
        "notes": null
      },
      {
        "id": "s2",
        "title": "ストックを交換",
        "item": "AK Zenit PT-3 \"Klassika\" stock",
        "traders": [{ "name": "Skier", "ll": 3 }],
        "substeps": [
          "AK-74M/AK-100 Zenit PT Lock を先に取り付け",
          "PT Lock に PT-3 Klassika stock を取り付け"
        ],
        "notes": null
      },
      {
        "id": "s3",
        "title": "PT Lock を取り付け（ストック取付に必要）",
        "item": "AK-74M/AK-100 Zenit PT Lock",
        "traders": [{ "name": "Skier", "ll": 2 }],
        "substeps": null,
        "notes": null
      },
      {
        "id": "s4",
        "title": "ピストルグリップを交換",
        "item": "AK Zenit RK-3 pistol grip (Black)",
        "traders": [{ "name": "Skier", "ll": 3 }],
        "substeps": null,
        "notes": null
      },
      {
        "id": "s5",
        "title": "チャージングハンドルを交換",
        "item": "AK Zenit RP-1 charging handle",
        "traders": [{ "name": "Skier", "ll": 1 }],
        "substeps": null,
        "notes": null
      },
      {
        "id": "s6",
        "title": "ダストカバーを交換",
        "item": "PP-19-01 Vityaz-SN dust cover",
        "traders": [{ "name": "Prapor", "ll": 1 }],
        "substeps": null,
        "notes": null
      },
      {
        "id": "s7",
        "title": "マズルデバイスを交換",
        "item": "PP-19-01 Vityaz 9x19 sound suppressor",
        "traders": [{ "name": "Mechanic", "ll": 2 }],
        "substeps": null,
        "notes": null
      },
      {
        "id": "s8",
        "title": "SAG MK1 の M-LOK スロットにレールを追加",
        "item": "Magpul M-LOK 4.1 inch rail",
        "traders": [{ "name": "Mechanic", "ll": 1 }],
        "substeps": null,
        "notes": null
      },
      {
        "id": "s9",
        "title": "M-LOK レールにフォアグリップを追加",
        "item": "Zenit RK-6 Tactical Foregrip",
        "traders": [{ "name": "Skier", "ll": 1 }],
        "substeps": null,
        "notes": null
      },
      {
        "id": "s10",
        "title": "M-LOK レールに Cantilever Mount を追加",
        "item": "Magpul M-LOK Cantilever Mount",
        "traders": [{ "name": "Skier", "ll": 2 }],
        "substeps": null,
        "notes": null
      },
      {
        "id": "s11",
        "title": "Cantilever Mount に PEQ-15 を追加",
        "item": "L3Harris AN/PEQ-15 tactical device (Tan)",
        "traders": [{ "name": "Peacekeeper", "ll": 3 }],
        "substeps": null,
        "notes": null
      },
      {
        "id": "s12",
        "title": "Klesch-2P をハンドガードに追加",
        "item": "Zenit Klesch-2P flashlight with laser",
        "traders": [{ "name": "Skier", "ll": 2 }],
        "substeps": [
          "Cantilever Mount のスロットに空きがあればそのまま取り付け可能",
          "空きがない場合は Magpul M-LOK Offset Light Mount を SAG MK1 の別 M-LOK スロットに追加して取り付け"
        ],
        "notes": [
          "ゲーム内でスロットを確認してどちらの方法かを判断してください。見た目が似ている Zenit Klesch-2IRS IR illuminator with laser と間違えないよう注意。"
        ]
      },
      {
        "id": "s13",
        "title": "レシーバー上部にサイトを組み付け",
        "item": "Aimpoint T-1 reflex sight",
        "traders": [{ "name": "Peacekeeper", "ll": 2 }],
        "substeps_label": "3パーツを下から順に重ねて取り付け",
        "substeps": [
          "Aimpoint Micro H-2 Standard Mount をレシーバーに取り付け",
          "Aimpoint Micro Spacer High を H-2 Mount に取り付け",
          "Aimpoint T-1 reflex sight を Spacer High に取り付け"
        ],
        "notes": null
      },
      {
        "id": "s14",
        "title": "30発マガジンを確認",
        "item": "PP-19-01 Vityaz 9x19 30-round magazine",
        "traders": [{ "name": "Prapor", "ll": 1 }],
        "substeps": null,
        "notes": [
          "デフォルトが30発なら交換不要"
        ]
      }
    ]
  },
  {
    "id": "gunsmith-2",
    "title": "Gunsmith - Old Friend's Request (Glock 17)",
    "taskId": "",
    "taskName": "Gunsmith - Old Friend's Request",
    "steps": [
      {
        "id": "s1",
        "title": "バレルを交換",
        "item": "Glock 9x19 Double Diamond 114mm threaded barrel",
        "traders": [{ "name": "Mechanic", "ll": 2 }],
        "substeps": null,
        "notes": null
      },
      {
        "id": "s2",
        "title": "スレッドプロテクターを追加",
        "item": "Glock 9x19 Double Diamond thread protector",
        "traders": [{ "name": "Mechanic", "ll": 1 }],
        "substeps": [
          "バレル交換後にバレル先端へ取り付け"
        ],
        "notes": null
      },
      {
        "id": "s3",
        "title": "グリップを交換",
        "item": "Glock Pachmayr Tactical Grip Glove",
        "traders": [{ "name": "Mechanic", "ll": 1 }],
        "substeps": null,
        "notes": null
      },
      {
        "id": "s4",
        "title": "タクティカルデバイスを追加",
        "item": "Zenit Kleshch-2P flashlight with laser",
        "traders": [{ "name": "Skier", "ll": 2 }],
        "substeps": null,
        "notes": [
          "見た目が似ている Zenit Klesch-2IRS IR illuminator with laser と間違えないよう注意"
        ]
      },
      {
        "id": "s5",
        "title": "マガジンを交換",
        "item": "Glock 9x19 Magpul PMAG GL9 21-round magazine",
        "traders": [{ "name": "Mechanic", "ll": 1 }],
        "substeps": null,
        "notes": [
          "日本語タスク説明文には記載なし。納品には必須なので忘れずに装着すること"
        ]
      }
    ]
  },
  {
    "id": "gunsmith-3",
    "title": "Gunsmith - Old Friend's Request (ORSIS T-5000M)",
    "taskId": "",
    "taskName": "Gunsmith - Old Friend's Request",
    "steps": [
      {
        "id": "s1",
        "title": "スコープマウントを取り付け",
        "item": "ORSIS T-5000M scope mount",
        "traders": [],
        "substeps": null,
        "notes": [
          "Nightforce ATACR を取り付けるために必須のマウント。先に取り付けること"
        ]
      },
      {
        "id": "s2",
        "title": "スコープマウントに Nightforce ATACR を取り付け",
        "item": "Nightforce ATACR 7-35x56 rifle scope",
        "traders": [{ "name": "Jaeger", "ll": 4 }],
        "substeps": [
          "ORSIS T-5000M scope mount をレシーバーに取り付け",
          "scope mount に Nightforce Magmount 34mm ring scope mount を取り付け",
          "ring mount に Nightforce ATACR 7-35x56 を取り付け"
        ],
        "notes": [
          "ATACRは34mmチューブ。Nightforce Magmount 34mm ring scope mountが中間マウントとして必要な場合あり。ゲーム内スロットを確認してください"
        ]
      },
      {
        "id": "s3",
        "title": "ハンドガードのバイポッドスロットに取り付け",
        "item": "Harris S-BRM 6-9\" Bipod",
        "traders": [{ "name": "Skier", "ll": 4 }],
        "substeps": null,
        "notes": [
          "T-5000Mハンドガードにバイポッド専用スロットあり。追加マウント不要で直接取り付け可能"
        ]
      },
      {
        "id": "s4",
        "title": "マズルデバイスをサプレッサーアダプターに交換",
        "item": "SilencerCo Hybrid 46 Direct Thread Mount adapter",
        "traders": [],
        "substeps": [
          "デフォルトのマズルブレーキを取り外し",
          "SilencerCo Hybrid 46 Direct Thread Mount adapter を取り付け"
        ],
        "notes": null
      },
      {
        "id": "s5",
        "title": "アダプターにサプレッサーを取り付け",
        "item": "SilencerCo Hybrid 46 multi-caliber sound silencer",
        "traders": [],
        "substeps": [
          "STEP4のアダプター取り付け後に装着"
        ],
        "notes": [
          "Daniel Defense WAVE QD sound suppressor でも納品可能"
        ]
      },
      {
        "id": "s6",
        "title": "マガジンが装着されているか確認",
        "item": "Default magazine",
        "traders": [],
        "substeps": null,
        "notes": [
          "タスク文章に記載なしだが「マガジン着用」が要件。デフォルトマガジンが装着されていれば問題ないが、外れている場合は必ず装着すること"
        ]
      }
    ]
  }
];
