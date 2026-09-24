/* ===== 游戏数据（角色 / 技能 / 敌人 / 道具 / 遗物 / 节点 / 剧情） ===== */

const BURN_DMG = 4;
const BURN_TURNS = 3;
const MAP_TOTAL = 8;

const HEROES = [
  {
    id: 'swordsman', name: '艾洛', title: '疾风剑士', emoji: '⚔️', color: '#e43b44',
    hp: 120, atk: 22, def: 6, mp: 50,
    skills: ['attack', 'power_strike', 'whirlwind', 'summon_blade'],
    desc: '均衡的剑客，攻守兼备，出手迅捷。',
    storyLines: [
      '剑圣的关门弟子艾洛，握紧了手中的剑。',
      '黑暗吞没了半个大陆，魔王的大军步步逼近。',
      '“师傅说过，胜利会在余烬中留下力量。”',
      '“出发吧——这条远征之路，只能由我走下去。”'
    ]
  },
  {
    id: 'mage', name: '露娜', title: '星辉贤者', emoji: '🔮', color: '#7e2553',
    hp: 90, atk: 18, def: 4, mp: 70,
    skills: ['attack', 'fireball', 'life_drain', 'meditate'],
    desc: '法力充沛的法师，火球可引燃敌人。',
    storyLines: [
      '星辉塔的贤者露娜，凝视着水晶球中翻滚的黑暗。',
      '魔王的火焰即将烧到星辉塔，她不能再等待。',
      '“星光会为我指路。”',
      '“熄灭那团火，是我的使命。”'
    ]
  },
  {
    id: 'guard', name: '铁心', title: '磐石守卫', emoji: '🛡️', color: '#41a6f6',
    hp: 150, atk: 16, def: 12, mp: 40,
    skills: ['attack', 'shield_bash', 'heal', 'steadfast'],
    desc: '皮糙肉厚的坦克，靠防御和续航磨死对手。',
    storyLines: [
      '王国的最后一位守卫铁心，系紧了破损的肩甲。',
      '身后是需要守护的家园，身前是望不到头的黑暗。',
      '“只要我还站着，就没有人能跨过我。”',
      '“以身为盾，挡下一切。”'
    ]
  },
  {
    id: 'nightblade', name: '影', title: '夜刃刺客', emoji: '🗡️', color: '#9b5de5',
    hp: 85, atk: 26, def: 4, mp: 45,
    skills: ['attack', 'blood_slash', 'thunder', 'shadow_clone'],
    desc: '高爆发的刺客，刀刀见血，以攻代守。',
    storyLines: [
      '暗巷里走出的刺客影，刀尖还滴着昨夜的血。',
      '她没有名字，只有一柄刀，和一颗未冷的复仇之心。',
      '“魔王欠下的，我要他百倍偿还。”',
      '“夜，是我的战场。”'
    ]
  }
];

/* 技能：element 用于遗物协同（fire 等），burn 表示命中后引燃敌人 */
const SKILLS = {
  attack:      { id: 'attack', name: '普通攻击', emoji: '⚔️', mp: 0,  mult: 1.0, type: 'attack', element: 'physical', desc: '无消耗的基础攻击' },
  defend:      { id: 'defend', name: '防御', emoji: '🛡️', mp: 0,  type: 'buff', buff: 'defend', desc: '本回合受到的伤害减半' },
  power_strike:{ id: 'power_strike', name: '强力一击', emoji: '💥', mp: 10, mult: 1.8, type: 'attack', element: 'physical', desc: '消耗10MP，造成180%伤害' },
  whirlwind:   { id: 'whirlwind', name: '回旋斩', emoji: '🌪️', mp: 12, mult: 1.4, type: 'attack', element: 'physical', aoe: true, desc: '消耗12MP，对全体敌人造成140%伤害' },
  firestorm:   { id: 'firestorm', name: '烈焰风暴', emoji: '🌋', mp: 18, mult: 1.8, type: 'attack', element: 'fire', aoe: true, desc: '消耗18MP，对全体敌人造成180%火焰伤害' },
  frost_nova:  { id: 'frost_nova', name: '冰霜新星', emoji: '🧊', mp: 14, mult: 1.5, type: 'attack', element: 'ice', aoe: true, desc: '消耗14MP，对全体敌人造成150%冰霜伤害' },
  fireball:    { id: 'fireball', name: '火球术', emoji: '🔥', mp: 15, mult: 2.0, type: 'attack', element: 'fire', burn: true, desc: '消耗15MP，造成200%伤害并引燃' },
  thunder:     { id: 'thunder', name: '闪电', emoji: '⚡', mp: 18, mult: 2.4, type: 'attack', element: 'lightning', desc: '消耗18MP，造成240%伤害' },
  blood_slash: { id: 'blood_slash', name: '吸血斩', emoji: '🩸', mp: 12, mult: 1.2, type: 'attack', element: 'physical', lifesteal: 0.5, desc: '消耗12MP，造成120%伤害并吸取50%为生命' },
  shield_bash: { id: 'shield_bash', name: '盾击', emoji: '🔨', mp: 8,  mult: 1.5, type: 'attack', element: 'physical', desc: '消耗8MP，造成150%伤害' },
  life_drain:  { id: 'life_drain', name: '生命汲取', emoji: '💚', mp: 10, type: 'heal', heal: [0, 20], element: 'holy', desc: '消耗10MP，恢复0~20点生命' },
  heal:        { id: 'heal', name: '治愈术', emoji: '✨', mp: 15, type: 'heal', heal: [25, 25], element: 'holy', desc: '消耗15MP，恢复25点生命' },
  holy_bolt:   { id: 'holy_bolt', name: '光之冲击', emoji: '☀️', mp: 12, mult: 1.6, type: 'attack', element: 'holy', desc: '消耗12MP，造成160%伤害，克制黑暗生物' },
  summon_blade:{ id: 'summon_blade', name: '剑灵', emoji: '🗡️', mp: 0, type: 'summon', pet: 'blade', signature: true, desc: '召唤剑灵并肩作战，每回合自动攻击，阵亡后可重新召唤' },
  meditate:    { id: 'meditate', name: '冥想', emoji: '🧘', mp: 0, type: 'mpheal', pct: 0.3, signature: true, desc: '恢复30%最大法力值' },
  steadfast:   { id: 'steadfast', name: '坚定', emoji: '💪', mp: 0, type: 'hpheal', pct: 0.25, shield: 10, signature: true, desc: '恢复25%生命并获得10点护盾' },
  shadow_clone:{ id: 'shadow_clone', name: '影分身', emoji: '🥷', mp: 0, type: 'summon', pet: 'shadow', signature: true, desc: '召唤影分身并肩作战，每回合自动攻击，阵亡后可重新召唤' }
};

/* 遗物：被动效果，可叠加成流派。rarity: common/rare */
const RELICS = [
  { id: 'whetstone', name: '磨刀石', emoji: '🔪', rarity: 'common', desc: '攻击 +3' },
  { id: 'ironplate', name: '铁甲片', emoji: '🧱', rarity: 'common', desc: '防御 +3' },
  { id: 'lifegem', name: '生命宝石', emoji: '❤️', rarity: 'common', desc: '生命上限 +25（并回复）' },
  { id: 'mpgem', name: '蓝晶石', emoji: '💧', rarity: 'common', desc: '法力上限 +15（并回复）' },
  { id: 'critblade', name: '暴击之刃', emoji: '🗡️', rarity: 'rare', desc: '攻击有 20% 概率暴击，伤害 ×1.6' },
  { id: 'vampfang', name: '吸血獠牙', emoji: '🧛', rarity: 'rare', desc: '攻击回复造成伤害的 20%' },
  { id: 'thorns', name: '荆棘护甲', emoji: '🌵', rarity: 'common', desc: '受到伤害时反弹 5 点' },
  { id: 'embertalisman', name: '余烬护符', emoji: '🔥', rarity: 'rare', desc: '灼烧伤害翻倍（燃烧流核心）' },
  { id: 'firemark', name: '火焰印记', emoji: '☀️', rarity: 'rare', desc: '火系技能伤害 +40%' },
  { id: 'regenheart', name: '再生之心', emoji: '💚', rarity: 'common', desc: '每回合开始恢复 3 点生命' },
  { id: 'wardrum', name: '狂热战鼓', emoji: '🥁', rarity: 'rare', desc: '生命低于 30% 时攻击 +50%' },
  { id: 'glasscannon', name: '玻璃大炮', emoji: '🔫', rarity: 'rare', desc: '攻击 +12，但生命上限 -30（高风险）' },
  { id: 'chainlightning', name: '连锁闪电', emoji: '⚡', rarity: 'rare', desc: '技能命中后额外造成 5 点真实伤害' },
  { id: 'holysigil', name: '守护圣印', emoji: '🛡️', rarity: 'rare', desc: '每场战斗开始获得 10 点护盾' },
  { id: 'skill_amp', name: '奥术宝石', emoji: '💎', rarity: 'rare', desc: '消耗法力的技能伤害 +25%' },
  { id: 'lucky_coin', name: '幸运金币', emoji: '🪙', rarity: 'common', desc: '战斗胜利获得的金币 +50%' },
  { id: 'first_strike', name: '疾风之靴', emoji: '🥾', rarity: 'rare', desc: '每场战斗的第一次攻击伤害 +50%' },
  { id: 'execute', name: '处决者', emoji: '🔪', rarity: 'rare', desc: '对生命低于 30% 的敌人伤害 +30%' },
  { id: 'phoenix', name: '不死鸟之羽', emoji: '🪶', rarity: 'rare', desc: '死亡时自动以 50% 生命复活一次（一次性）' }
];

const ENEMIES = [
  { id: 'slime', name: '史莱姆', emoji: '🟢', hp: 50,  atk: 12, def: 3, element: 'water',
    skills: [{ name: '普通攻击', mult: 1.0, w: 60 }, { name: '酸液喷射', mult: 1.2, w: 40, burn: true }],
    taunts: ['你打不破我的身体！', '软软的也能赢你！'] },
  { id: 'goblin', name: '哥布林', emoji: '👺', hp: 75,  atk: 16, def: 6,
    skills: [{ name: '普通攻击', mult: 1.0, w: 55 }, { name: '偷袭', mult: 1.3, w: 45 }],
    taunts: ['嘿嘿，你的金币归我了！'] },
  { id: 'warrior', name: '初级战士', emoji: '🪖', hp: 80,  atk: 15, def: 10,
    skills: [{ name: '普通攻击', mult: 1.0, w: 50 }, { name: '猛击', mult: 1.5, w: 50 }],
    taunts: ['就这点本事？还是回家多练练吧！'] },
  { id: 'assassin', name: '敏捷刺客', emoji: '🥷', hp: 60,  atk: 20, def: 5,
    skills: [{ name: '普通攻击', mult: 1.0, w: 50 }, { name: '快速攻击', mult: 0.5, w: 50, hits: 2 }],
    taunts: ['你的攻击像是在给我挠痒痒！'] },
  { id: 'tank', name: '重装坦克', emoji: '🏋️', hp: 120, atk: 10, def: 20,
    skills: [{ name: '普通攻击', mult: 1.0, w: 45 }, { name: '防御姿态', mult: 0, w: 55, defend: true }],
    taunts: ['来，尽管往我身上招呼！'] },
  { id: 'mage', name: '神秘法师', emoji: '🧙', hp: 70,  atk: 25, def: 8, element: 'fire',
    skills: [{ name: '普通攻击', mult: 1.0, w: 50 }, { name: '火球术', mult: 1.8, w: 50 }],
    taunts: ['弱者，不配站在这个竞技场！'] },
  { id: 'skeleton', name: '骷髅兵', emoji: '💀', hp: 90,  atk: 18, def: 8, element: 'dark',
    skills: [{ name: '普通攻击', mult: 1.0, w: 55 }, { name: '骨刃', mult: 1.4, w: 45 }],
    taunts: ['咔咔咔……献上你的骨头！'] },
  { id: 'ice', name: '冰霜元素', emoji: '❄️', hp: 85,  atk: 19, def: 9, element: 'ice',
    skills: [{ name: '普通攻击', mult: 1.0, w: 50 }, { name: '冰锥', mult: 1.5, w: 50 }],
    taunts: ['你的热血，将被冻结！'] },
  { id: 'healer', name: '治疗师', emoji: '🧑‍⚕️', hp: 85,  atk: 10, def: 6, ai: 'healer', element: 'holy',
    skills: [{ name: '普通攻击', mult: 1.0, w: 55 }, { name: '圣光治疗', mult: 0, w: 45, heal: 18 }],
    taunts: ['圣光会庇佑我！'] },
  { id: 'bomber', name: '自爆怪', emoji: '💣', hp: 45,  atk: 24, def: 2, deathrattle: 15, element: 'fire',
    skills: [{ name: '普通攻击', mult: 1.0, w: 60 }, { name: '猛烈撞击', mult: 1.2, w: 40 }],
    taunts: ['嘿嘿，一起上路吧！'] },
  { id: 'summoner', name: '召唤师', emoji: '🧙‍♂️', hp: 90,  atk: 12, def: 6, ai: 'summoner', element: 'dark',
    skills: [{ name: '普通攻击', mult: 1.0, w: 45 }, { name: '召唤魔物', mult: 0, w: 55, summon: true }],
    taunts: ['我的奴仆无穷无尽！'] },
  { id: 'clone', name: '分身魔', emoji: '👥', hp: 80,  atk: 18, def: 6, ai: 'clone', element: 'dark',
    skills: [{ name: '普通攻击', mult: 1.0, w: 60 }, { name: '影袭', mult: 1.2, w: 40 }],
    taunts: ['你分不清哪个才是真的我！'] }
];

/* 我方随从（职业特色召唤物） */
const PETS = {
  blade:  { name: '剑灵',   emoji: '🗡️', mult: 0.4, hpMult: 0.4,  def: 5 },
  shadow: { name: '影分身', emoji: '🥷', mult: 0.5, hpMult: 0.35, def: 3 }
};

/* 召唤物 / 小怪 */
const MINIONS = [
  { id: 'imp', name: '小恶魔', emoji: '👿', hp: 30, atk: 10, def: 2, element: 'dark',
    skills: [{ name: '普通攻击', mult: 1.0, w: 100 }] },
  { id: 'mini_slime', name: '小史莱姆', emoji: '🟢', hp: 26, atk: 8, def: 1, element: 'water',
    skills: [{ name: '普通攻击', mult: 1.0, w: 100 }] }
];

const BOSSES = [
  { id: 'shadow_lord', name: '暗影领主', emoji: '👹', hp: 180, atk: 26, def: 14, element: 'dark',
    skills: [{ name: '暗影斩', mult: 1.8, w: 55, charge: true }, { name: '暗影侵蚀', mult: 1.4, w: 45, burn: true }],
    taunts: ['黑暗将吞噬一切！'] },
  { id: 'inferno', name: '炎魔', emoji: '🔥', hp: 200, atk: 28, def: 16, element: 'fire',
    skills: [{ name: '烈焰风暴', mult: 2.0, w: 55, charge: true, aoe: true }, { name: '灼热吐息', mult: 1.5, w: 45, burn: true }],
    taunts: ['在烈焰中化为灰烬吧！'] },
  { id: 'dragon', name: '龙裔魔王', emoji: '🐲', hp: 220, atk: 32, def: 18, elements: ['dragon'],
    skills: [{ name: '龙息', mult: 2.2, w: 65, charge: true, aoe: true }, { name: '鳞甲防御', mult: 0, w: 35, defend: true }],
    taunts: ['蝼蚁，也敢挑战龙威？'] }
];

const ITEMS = [
  { id: 'peach',   name: '桃子',     emoji: '🍑', effect: 'heal', amount: 10 },
  { id: 'egg',     name: '煎蛋',     emoji: '🍳', effect: 'heal', amount: 20 },
  { id: 'chicken', name: '花酿鸡',   emoji: '🍗', effect: 'heal', amount: 30 },
  { id: 'fish',    name: '黑背鲈鱼', emoji: '🐟', effect: 'heal', amount: 40 },
  { id: 'soup',    name: '白玉汤',   emoji: '🍲', effect: 'heal', amount: 50 },
  { id: 'mp_potion', name: '魔力药水', emoji: '🧪', effect: 'mp', amount: 30 },
  { id: 'shield_potion', name: '护盾药水', emoji: '🧱', effect: 'shield', amount: 15 },
  { id: 'rage_potion', name: '狂暴药水', emoji: '💢', effect: 'buff', amount: 8 }
];

function itemDesc(it) {
  switch (it.effect) {
    case 'mp': return '恢复 ' + it.amount + ' 点法力';
    case 'shield': return '获得 ' + it.amount + ' 点护盾';
    case 'buff': return '本场战斗攻击 +' + it.amount;
    default: return '恢复 ' + it.amount + ' 点生命';
  }
}

/* 开局祝福：每局从 3 个中选 1，收益相当 */
const BOONS = [
  { id: 'boon_hp', name: '生命祝福', emoji: '❤️', desc: '生命上限 +40，并回复 40 生命', apply: p => { p.maxHp += 40; p.hp += 40; } },
  { id: 'boon_atk', name: '力量祝福', emoji: '⚔️', desc: '攻击力 +6', apply: p => { p.atk += 6; } },
  { id: 'boon_def', name: '守护祝福', emoji: '🛡️', desc: '防御力 +6', apply: p => { p.def += 6; } },
  { id: 'boon_mp', name: '法力祝福', emoji: '💧', desc: '法力上限 +30，并回复 30 法力', apply: p => { p.maxMp += 30; p.mp += 30; } },
  { id: 'boon_gold', name: '幸运祝福', emoji: '🪙', desc: '初始金币 +80', apply: p => { p.gold += 80; } }
];

const TAUNTS = [
  '就这点本事？还是回家多练练吧！',
  '你的攻击像是在给我挠痒痒！',
  '弱者，不配站在这个竞技场！',
  '看来今天的热身运动结束了。'
];

/* 属性克制：攻击方元素 → 防御方元素 → 倍率（>1 效果拔群，<1 效果不佳） */
const ELEMENT_META = {
  fire:      { name: '火', emoji: '🔥' },
  ice:       { name: '冰', emoji: '❄️' },
  water:     { name: '水', emoji: '💧' },
  lightning: { name: '电', emoji: '⚡' },
  holy:      { name: '光', emoji: '✨' },
  dark:      { name: '暗', emoji: '🌑' },
  dragon:    { name: '龙', emoji: '🐲' },
  physical:  { name: '物', emoji: '🗡️' }
};

const TYPE_CHART = {
  fire:      { ice: 1.5, water: 0.75, dragon: 0.75 },   // 火克冰；被水抗；龙抗火
  ice:       { dragon: 1.5, fire: 0.75, ice: 0.75 },    // 冰克龙；被火抗；冰抗冰
  water:     { fire: 1.5, ice: 0.75, dragon: 0.75 },    // 水克火；被冰抗；龙抗水
  lightning: { water: 1.5, lightning: 0.75, dragon: 0.75 }, // 电克水；电抗电；龙抗电
  holy:      { dark: 1.5, ice: 0.75 },                  // 光克暗；冰抗光
  dark:      { holy: 1.5, dark: 1.5, physical: 0.75 },  // 暗克光、克暗；物理抗暗
  physical:  { dark: 0.75 },                            // 暗抗物理
  dragon:    { dragon: 1.5 }                             // 龙克龙
};

const NODE_POOL = ['battle', 'battle', 'battle', 'battle', 'elite', 'elite', 'rest', 'rest', 'shop', 'event', 'event'];

const NODE_META = {
  battle: { emoji: '⚔️', name: '战斗' },
  elite:  { emoji: '💀', name: '精英' },
  rest:   { emoji: '🏕️', name: '休息' },
  shop:   { emoji: '🏪', name: '商店' },
  event:  { emoji: '❓', name: '事件' },
  boss:   { emoji: '👑', name: 'Boss' }
};

/* 随机事件：风险 / 收益抉择 */
const EVENTS = [
  {
    id: 'altar', name: '神秘祭坛', emoji: '⛩️',
    text: '布满青苔的祭坛低语着：用你的生命，换取力量……',
    choices: [
      { text: '献祭 20 生命上限，获得一件稀有遗物', do: G => {
          const r = G.grantRareRelic();
          if (!r) { G.player.gold += 30; return '祭坛沉默了，给了你 30 金币（已无稀有遗物可给）。'; }
          G.player.maxHp = Math.max(1, G.player.maxHp - 20);
          G.player.hp = Math.min(G.player.hp, G.player.maxHp);
          return '你献祭了 20 点生命上限，获得稀有遗物「' + r.name + '」。';
        } },
      { text: '恭敬地离开', do: G => '你选择离开祭坛。' }
    ]
  },
  {
    id: 'gamble', name: '赌徒的帐篷', emoji: '🎲',
    text: '一个咧嘴大笑的赌徒邀请你玩一局。',
    choices: [
      { text: '押上运气（50% 得 60 金币，50% 损失 20 生命）', do: G => {
          if (Math.random() < 0.5) { G.player.gold += 60; return '你赢了！获得 60 金币。'; }
          G.player.hp = Math.max(0, G.player.hp - 20);
          return '你输了，损失 20 点生命。';
        } },
      { text: '拒绝', do: G => '你转身离开了赌桌。' }
    ]
  },
  {
    id: 'chest', name: '上锁的宝箱', emoji: '🧰',
    text: '一只镶金的宝箱，旁边散落着野兽的爪印。',
    choices: [
      { text: '打开宝箱（60% 得道具，40% 遭遇伏击）', do: G => {
          if (Math.random() < 0.6) {
            const it = ITEMS[Math.floor(Math.random() * ITEMS.length)];
            G.player.bag.push({ id: it.id, name: it.name, emoji: it.emoji, effect: it.effect, amount: it.amount });
            return '你打开宝箱，得到了道具「' + it.name + '」！';
          }
          G.eventAmbush = true;
          return '宝箱是陷阱！一群敌人冲了出来！';
        } },
      { text: '离开', do: G => '你谨慎地绕开了宝箱。' }
    ]
  },
  {
    id: 'soul', name: '灵魂商人', emoji: '🕯️',
    text: '黑袍人递来一纸契约，笔尖滴着暗红的墨水。',
    choices: [
      { text: '签订契约（-15 生命上限，+8 攻击）', do: G => {
          G.player.maxHp = Math.max(1, G.player.maxHp - 15);
          G.player.hp = Math.min(G.player.hp, G.player.maxHp);
          G.player.atk += 8;
          return '契约生效：生命上限 -15，攻击 +8。';
        } },
      { text: '拒绝', do: G => '你拒绝了契约，黑袍人冷笑一声消失。' }
    ]
  },
  {
    id: 'fountain', name: '生命之泉', emoji: '⛲',
    text: '清澈的泉水散发着温暖的光辉。',
    choices: [
      { text: '饮下泉水（恢复 50% 生命）', do: G => {
          const h = Math.round(G.player.maxHp * 0.5);
          G.player.hp = Math.min(G.player.maxHp, G.player.hp + h);
          return '你饮下泉水，恢复了 ' + h + ' 点生命。';
        } },
      { text: '装满水壶（获得 40 金币）', do: G => { G.player.gold += 40; return '你装满了水壶，获得 40 金币。'; } }
    ]
  }
];

const REST_CHOICES = [
  { id: 'rest_full', name: '休整', emoji: '🛌', desc: '完全恢复生命和法力',
    apply: p => { p.hp = p.maxHp; p.mp = p.maxMp; } }
];

const BOSS_INTRO = [
  '大地震颤，浓重的黑暗气息扑面而来……',
  '魔王的军团首领，正拦在你的前方！',
  '“到此为止了，勇者。”'
];

const VICTORY_LINES = [
  '黑暗的君王轰然倒下，化作漫天光尘。',
  '你以剑与信念，为这片大陆夺回了黎明。',
  '旅人们的传颂，将永远记住你的名字。',
  '—— 传说，就此落幕。'
];

const DEFEAT_LINES = [
  '你的意识渐渐模糊，黑暗吞没了视线……',
  '远征戛然而止，但你的故事不会被遗忘。',
  '—— 勇士，来生再战。'
];

/* ===== 工具函数 ===== */
function randInt(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }

function weightedPick(list) {
  const total = list.reduce((s, x) => s + (x.w || 1), 0);
  let r = Math.random() * total;
  for (const x of list) { r -= (x.w || 1); if (r <= 0) return x; }
  return list[list.length - 1];
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function relicTag(r) { return (r.rarity === 'rare' ? '【稀有遗物】' : '【遗物】'); }

/* 生成三选一奖励（含遗物，可能产生流派构筑） */
function genRewards(player) {
  const pool = [];
  const owned = new Set(player.skills);
  const ownedRelics = new Set(player.relics);

  const avail = Object.values(SKILLS).filter(s => s.id !== 'attack' && s.id !== 'defend' && !s.signature && !owned.has(s.id));
  if (avail.length) {
    const s = avail[Math.floor(Math.random() * avail.length)];
    pool.push({ type: 'skill', skillId: s.id, name: s.name, emoji: s.emoji, desc: s.desc });
  }
  pool.push({ type: 'maxhp', amount: 25, name: '生命上限 +25', emoji: '❤️', desc: '提升25点生命上限，并回复等量生命' });
  pool.push({ type: 'atk',   amount: 5,  name: '攻击力 +5',   emoji: '⚔️', desc: '永久提升5点攻击力' });
  pool.push({ type: 'def',   amount: 4,  name: '防御力 +4',   emoji: '🛡️', desc: '永久提升4点防御力' });
  pool.push({ type: 'maxmp', amount: 15, name: '法力上限 +15', emoji: '💧', desc: '提升15点法力上限，并回复等量法力' });
  const it = ITEMS[Math.floor(Math.random() * ITEMS.length)];
  pool.push({ type: 'item', itemId: it.id, name: '道具「' + it.name + '」', emoji: it.emoji, desc: itemDesc(it) });
  pool.push({ type: 'fullheal', name: '完全回复', emoji: '💖', desc: '将生命完全恢复至上限' });

  const availRelics = RELICS.filter(r => !ownedRelics.has(r.id));
  if (availRelics.length) {
    const r = availRelics[Math.floor(Math.random() * availRelics.length)];
    pool.push({ type: 'relic', relicId: r.id, name: '遗物「' + r.name + '」', emoji: r.emoji, desc: relicTag(r) + ' ' + r.desc });
  }

  const result = shuffle(pool).slice(0, 3);
  /* 保底：至少一个恢复/续航类选项 */
  if (!result.some(r => ['maxhp', 'maxmp', 'item', 'fullheal'].includes(r.type))) {
    result[2] = { type: 'fullheal', name: '完全回复', emoji: '💖', desc: '将生命完全恢复至上限' };
  }
  return result;
}

/* 生成商店货架：1 道具 + 1 属性 + 1 遗物 */
function genShopOffers() {
  const offers = [];
  const it = ITEMS[Math.floor(Math.random() * ITEMS.length)];
  offers.push({ type: 'item', itemId: it.id, name: it.name, emoji: it.emoji, desc: itemDesc(it), cost: it.amount * 2 });

  const stats = [
    { type: 'atk',   name: '攻击 +3',     emoji: '⚔️', desc: '永久提升 3 点攻击力',  cost: 50, amount: 3 },
    { type: 'def',   name: '防御 +2',     emoji: '🛡️', desc: '永久提升 2 点防御力',  cost: 40, amount: 2 },
    { type: 'maxhp', name: '生命上限 +20', emoji: '❤️', desc: '提升 20 点生命上限',  cost: 60, amount: 20 },
    { type: 'maxmp', name: '法力上限 +15', emoji: '💧', desc: '提升 15 点法力上限',  cost: 50, amount: 15 }
  ];
  offers.push(stats[Math.floor(Math.random() * stats.length)]);

  const r = RELICS[Math.floor(Math.random() * RELICS.length)];
  offers.push({ type: 'relic', relicId: r.id, name: '遗物「' + r.name + '」', emoji: r.emoji, desc: relicTag(r) + ' ' + r.desc, cost: 90 });

  return offers;
}
