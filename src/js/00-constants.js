const { useState, useEffect, useCallback, useMemo, useRef } = React;

// ================== GUIDE MAP ==================
// guides-data.js が読み込まれている場合、タスク名 → ガイドID のマップを構築
const GUIDE_BY_TASKNAME = (() => {
  if (typeof GUIDES === 'undefined') return new Map();
  const map = new Map();
  GUIDES.forEach(g => { if (g.taskName) map.set(g.taskName, g.id); });
  return map;
})();

// ================== CONSTANTS ==================
const TRADER_IDS = {
  prapor:     '54cb50c76803fa8b248b4571',
  therapist:  '54cb57776803fa99248b456e',
  fence:      '579dc571d53a0658a154fbec',
  skier:      '58330581ace78e27b8b10cee',
  peacekeeper:'5935c25fb3acc3127c3d8cd9',
  mechanic:   '5a7c2eca46aef81a7ca2145d',
  ragman:     '5ac3b934156ae10c4430e83c',
  jaeger:     '5c0647fdd443bc2504c2d371',
  ref:        '6617beeaa9cfa777ca915b7c',
};

const TRADER_NAMES = {
  '54cb50c76803fa8b248b4571': 'Prapor',
  '54cb57776803fa99248b456e': 'Therapist',
  '579dc571d53a0658a154fbec': 'Fence',
  '58330581ace78e27b8b10cee': 'Skier',
  '5935c25fb3acc3127c3d8cd9': 'Peacekeeper',
  '5a7c2eca46aef81a7ca2145d': 'Mechanic',
  '5ac3b934156ae10c4430e83c': 'Ragman',
  '5c0647fdd443bc2504c2d371': 'Jaeger',
  '6617beeaa9cfa777ca915b7c': 'Ref',
};

// noCommerce: true = 取引額要件なし（信頼度のみ）
const TRADER_LIST = [
  { id: TRADER_IDS.prapor,      name: 'Prapor' },
  { id: TRADER_IDS.therapist,   name: 'Therapist' },
  { id: TRADER_IDS.fence,       name: 'Fence',      noCommerce: true },
  { id: TRADER_IDS.skier,       name: 'Skier' },
  { id: TRADER_IDS.peacekeeper, name: 'Peacekeeper' },
  { id: TRADER_IDS.mechanic,    name: 'Mechanic' },
  { id: TRADER_IDS.ragman,      name: 'Ragman' },
  { id: TRADER_IDS.jaeger,      name: 'Jaeger' },
  { id: TRADER_IDS.ref,         name: 'Ref',        noCommerce: true },
];

const GRAPHQL_URL = 'https://api.tarkov.dev/graphql';

// マップ画像は同梱しない（作者 REƎMR 氏の許可待ち）。利用者が入手して「画像を差し替え」で登録する
const MAP_IMAGE_SOURCE_URL = 'https://reemr.se/';

const RAID_MAP_IMAGE_FILES = {
  'Customs':           'Customs.png',
  'Factory':           'Factory.png',
  'Woods':             'Woods.png',
  'Shoreline':         'Shoreline.png',
  'Interchange':       'Interchange.png',
  'Reserve':           'Reserve.png',
  'Lighthouse':        'Lighthouse.png',
  'Streets of Tarkov': 'StreetsOfTarkov.png',
  'The Lab':           'Labs.png',
  'Ground Zero':       'GroundZero.png',
  'Labyrinth':         'Labyrinth.png',
  'Icebreaker':        'Icebreaker.png',
  'Terminal':          'Terminal.png',
};

// ── OCR ユーティリティ（コンポーネント外） ──
const levenshtein = (a, b) => {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[a.length][b.length];
};

// APIの日本語翻訳ミスを上書きするマッピング
// ※ lang:ja 取得後にSCAVケースはAPIが正しく返すようになったため、
//   誤って「コレクション」→「SCAVケース」にしていたオーバーライドを削除
const STATION_NAME_OVERRIDES = {
};

const QUERIES = {
  traders: (gameMode) => `{
    traders(gameMode: ${gameMode}) {
      id name imageLink
      currency { shortName }
      levels {
        level
        requiredPlayerLevel
        requiredReputation
        requiredCommerce
      }
    }
  }`,
  items: (gameMode) => `{
    items(gameMode: ${gameMode}, lang: ja, limit: 100000) {
      id
      name
      shortName
      iconLink
      categories { name }
      types
      sellFor {
        vendor { ... on TraderOffer { trader { id name } minTraderLevel } }
        priceRUB
      }
      buyFor {
        vendor { ... on TraderOffer { trader { id name } minTraderLevel taskUnlock { id name } } }
        priceRUB
        currency
        price
      }
      low24hPrice
      high24hPrice
      avg24hPrice
    }
  }`,
  barters: (gameMode, lang) => `{
    barters(gameMode: ${gameMode}, lang: ${lang}) {
      trader { id name }
      level
      requiredItems {
        item { id name shortName iconLink }
        count
      }
      rewardItems {
        item { id name shortName iconLink }
        count
      }
    }
  }`,
  crafts: (gameMode, lang) => `{
    crafts(gameMode: ${gameMode}, lang: ${lang}) {
      station { id name }
      level
      duration
      requiredItems {
        item { id name shortName iconLink }
        count
      }
      rewardItems {
        item { id name shortName iconLink categories { name } }
        count
      }
    }
  }`,
  tasks: (gameMode, lang) => `{
    tasks(gameMode: ${gameMode}, lang: ${lang}) {
      id name wikiLink
      trader { id name }
      minPlayerLevel
      taskRequirements { task { id name } status }
      objectives {
        id description type
        maps { name }
        ... on TaskObjectiveItem {
          item { id name shortName iconLink }
          count
          foundInRaid
        }
        ... on TaskObjectiveQuestItem {
          questItem { id name shortName }
          count
        }
        ... on TaskObjectiveShoot {
          target
          count
          distance { value compareMethod }
          bodyParts
        }
        ... on TaskObjectiveMark {
          markerItem { name iconLink }
        }
        ... on TaskObjectiveBasic { __typename }
      }
      finishRewards {
        traderStanding { trader { name } standing }
        items { item { name iconLink } count }
        offerUnlock { trader { name } level item { name iconLink } }
      }
      experience
    }
  }`,
  hideout: (lang) => `{
    hideoutStations(lang: ${lang}) {
      id name
      levels {
        level
        itemRequirements {
          item { id name shortName iconLink }
          count
        }
        stationLevelRequirements {
          station { id name }
          level
        }
      }
    }
  }`,
  itemsEn: (gameMode) => `{
    items(gameMode: ${gameMode}, lang: en, limit: 100000) {
      id name shortName
    }
  }`,
  ammo: (gameMode, lang) => `{
    ammo(gameMode: ${gameMode}, lang: ${lang}) {
      caliber
      damage
      penetrationPower
      armorDamage
      fragmentationChance
      item {
        id name shortName iconLink types
        buyFor {
          price currency
          vendor { name normalizedName ... on TraderOffer { minTraderLevel taskUnlock { id name } } }
        }
        craftsFor { station { id name } level }
        bartersFor { trader { id name } level taskUnlock { id name } }
      }
    }
  }`,
  weapons: (gameMode, lang) => `{
    items(gameMode: ${gameMode}, types: [gun, preset], lang: ${lang}, limit: 10000) {
      id name shortName iconLink
      types
      properties {
        ... on ItemPropertiesWeapon { caliber }
        ... on ItemPropertiesPreset { baseItem { id } }
      }
    }
  }`,
  ammoPacks: (gameMode, lang) => `{
    items(gameMode: ${gameMode}, type: ammoBox, lang: ${lang}) {
      id name shortName iconLink
      buyFor { vendor { name normalizedName ... on TraderOffer { minTraderLevel } } }
      bartersFor { trader { name } level }
      containsItems { item { id } count }
    }
  }`,
  weaponMods: (gameMode, lang) => `{
    items(gameMode: ${gameMode}, types: [mods], lang: ${lang}, limit: 10000) {
      id name shortName iconLink
      categories { name }
      avg24hPrice
      buyFor {
        vendor { ... on TraderOffer { trader { id name } minTraderLevel } }
        priceRUB
      }
      weight
      properties {
        ... on ItemPropertiesWeaponMod {
          ergonomics
          recoilModifier
          accuracyModifier
        }
      }
    }
  }`,
  armorPlates: (gameMode, lang) => `{
    items(gameMode: ${gameMode}, type: armorPlate, lang: ${lang}) {
      id name shortName iconLink wikiLink
      avg24hPrice
      buyFor {
        price currency
        vendor { name normalizedName ... on TraderOffer { minTraderLevel taskUnlock { id name } } }
      }
      bartersFor { trader { id name } level taskUnlock { id name } }
      craftsFor { station { id name } level }
      properties {
        ... on ItemPropertiesArmorAttachment {
          class
          material { name }
          bluntThroughput
          repairCost
          speedPenalty
          turnPenalty
          ergoPenalty
          zones
          durability
        }
      }
    }
  }`,
};

