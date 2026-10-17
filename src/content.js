export const CLASSES = [
  { id: 'scholar', name: '烬誓骑士', title: '以推理破局', description: '起始遗物「灰誓石」：每场战斗首次答对，额外获得1点专注。', hp: 76, gold: 80, relicId: 'inkstone', starterCards: ['quick_calc', 'quick_calc', 'steady_hand', 'steady_hand', 'keen_eye', 'keen_eye', 'annotate', 'annotate', 'breath', 'breath'] },
  { id: 'astronomer', name: '观星者', title: '在坠星间辨路', description: '起始遗物「残星仪」：每场战斗第一回合多抽1张牌。', hp: 70, gold: 90, relicId: 'astrolabe', starterCards: ['quick_calc', 'quick_calc', 'steady_hand', 'steady_hand', 'keen_eye', 'keen_eye', 'forecast', 'forecast', 'breath', 'breath'] },
  { id: 'scribe', name: '守卷人', title: '守住最后一页', description: '起始遗物「铁封印」：每场战斗首次受到伤害时，减免3点。', hp: 84, gold: 65, relicId: 'cinnabar_seal', starterCards: ['quick_calc', 'quick_calc', 'steady_hand', 'steady_hand', 'keen_eye', 'keen_eye', 'redline', 'redline', 'breath', 'breath'] },
];

export const CARDS = [
  { id: 'quick_calc', name: '破题之刃', type: 'attack', cost: 1, damage: 7, text: '以截位直除斩击，造成7点伤害。', category: 'quant' },
  { id: 'steady_hand', name: '铁页壁垒', type: 'skill', cost: 1, block: 7, text: '获得7点护甲。', category: 'general' },
  { id: 'keen_eye', name: '识破虚妄', type: 'attack', cost: 1, damage: 5, vulnerable: 1, text: '洞察破绽，造成5点伤害并使敌人易伤1回合。', category: 'reasoning' },
  { id: 'annotate', name: '余烬注记', type: 'skill', cost: 1, draw: 1, block: 3, text: '圈出设问中的关键，获得3点护甲并抽1张牌。', category: 'verbal' },
  { id: 'breath', name: '残火喘息', type: 'skill', cost: 0, block: 4, text: '借一口残火，获得4点护甲。', category: 'general' },
  { id: 'forecast', name: '星痕推演', type: 'skill', cost: 1, draw: 2, text: '先读设问，再抽2张牌。', category: 'quant' },
  { id: 'redline', name: '焦痕批注', type: 'attack', cost: 1, damage: 6, burn: 2, text: '以证据划开伤口，造成6点伤害并施加2层灼烧。', category: 'verbal' },
  { id: 'chain_reason', name: '因果锁链', type: 'attack', cost: 1, damage: 4, repeatOnCombo: true, text: '沿因果关系造成4点伤害；连击时再触发一次。', category: 'reasoning' },
  { id: 'ratio', name: '分率断斩', type: 'attack', cost: 2, damage: 15, text: '拆解份数关系，造成15点伤害。', category: 'quant' },
  { id: 'iron_page', name: '沉铁护卷', type: 'skill', cost: 2, block: 14, text: '以沉铁卷页格挡，获得14点护甲。', category: 'general' },
  { id: 'burning_glyph', name: '余烬蔓延', type: 'attack', cost: 1, damage: 3, burn: 5, text: '引燃伤口，造成3点伤害并施加5层灼烧。', category: 'verbal' },
  { id: 'read_ahead', name: '逆读设问', type: 'skill', cost: 1, draw: 1, energy: 1, text: '回看设问，获得1点专注并抽1张牌。', category: 'verbal' },
  { id: 'expose_flaw', name: '寻隙而入', type: 'skill', cost: 1, vulnerable: 2, text: '分析敌人弱点，使其易伤2回合。', category: 'reasoning' },
  { id: 'ink_wave', name: '灰潮横扫', type: 'attack', cost: 2, damage: 8, aoe: true, text: '挥出灰烬浪潮，对所有敌人造成8点伤害。', category: 'verbal' },
  { id: 'counterproof', name: '逆向验算', type: 'skill', cost: 1, block: 5, damage: 5, text: '反向验证论证，造成5点伤害并获得5点护甲。', category: 'quant' },
  { id: 'perfect_stride', name: '谨慎推进', type: 'skill', cost: 1, block: 5, nextDraw: 1, text: '稳步逼近，获得5点护甲；下回合多抽1张牌。', category: 'general' },
  { id: 'combo_surge', name: '连击余势', type: 'attack', cost: 1, damage: 3, comboDamage: 4, text: '造成3点伤害；当前连击每层额外造成1点（最多4）。', category: 'reasoning' },
  { id: 'ember_script', name: '焚尽残卷', type: 'attack', cost: 2, damage: 7, burn: 4, draw: 1, text: '灼烧旧卷，造成7点伤害、施加4层灼烧并抽1张牌。', category: 'verbal' },
  { id: 'calm_mind', name: '凝神守息', type: 'skill', cost: 0, heal: 3, block: 2, text: '回复3点生命并获得2点护甲。', category: 'general' },
  { id: 'piercing_line', name: '孤注破题', type: 'attack', cost: 1, damage: 9, selfDamage: 2, text: '以险招直取核心，造成9点伤害并损失2点生命。', category: 'quant' },
  { id: 'echo_page', name: '回声残页', type: 'skill', cost: 1, retrieve: 1, text: '从弃牌堆取回最上方的牌。', category: 'general' },
  { id: 'grand_thesis', name: '终局论证', type: 'attack', cost: 3, damage: 22, text: '将证据与结论贯为一线，造成22点伤害。', category: 'verbal' },
  { id: 'warding_seal', name: '铁誓护手', type: 'skill', cost: 1, block: 8, cleanse: true, text: '获得8点护甲并清除自身虚弱。', category: 'general' },
  { id: 'swift_notation', name: '疾笔断句', type: 'attack', cost: 0, damage: 4, text: '抓住句眼，造成4点伤害。', category: 'quant' },
  { id: 'last_page', name: '最后一页', type: 'attack', cost: 1, damage: 12, conditionLowHp: true, text: '背水一击，造成12点伤害；生命低于一半时费用为0。', category: 'reasoning' },
  { id: 'burning_barrier', name: '灰烬为盾', type: 'skill', cost: 1, block: 6, burn: 2, text: '以灰烬筑盾，获得6点护甲并施加2层灼烧。', category: 'verbal' },
];
for (const card of CARDS) {
  card.description = card.text;
  card.rarity = ['grand_thesis', 'last_page', 'ember_script', 'ink_wave', 'ratio'].includes(card.id) ? 'rare' : ['counterproof', 'combo_surge', 'burning_glyph', 'expose_flaw'].includes(card.id) ? 'uncommon' : 'common';
  card.icon = card.type === 'attack' ? (card.burn ? 'Flame' : 'Swords') : (card.heal ? 'Heart' : card.draw ? 'BookOpen' : 'Shield');
}

export const RELICS = [
  { id: 'inkstone', name: '灰誓石', description: '每场战斗首次答对额外获得1点专注。', effect: 'firstCorrectEnergy' },
  { id: 'astrolabe', name: '残星仪', description: '每场战斗第一回合多抽1张牌。', effect: 'firstTurnDraw' },
  { id: 'cinnabar_seal', name: '铁封印', description: '每场战斗首次受伤减免3点。', effect: 'firstHitBlock' },
  { id: 'bronze_abacus', name: '骨刻算筹', description: '每第三次答对，向首个敌人造成4点伤害。', effect: 'answerProc' },
  { id: 'paper_crane', name: '白灰纸鸦', description: '每场战斗首次答对抽1张牌。', effect: 'firstCorrectDraw' },
  { id: 'jade_bead', name: '冷釉珠', description: '每次进入新层回复3点生命。', effect: 'floorHeal' },
  { id: 'iron_bookmark', name: '断刃书签', description: '战斗开始获得5点护甲。', effect: 'battleBlock' },
  { id: 'red_tassel', name: '血线结', description: '连击达到3层时获得4点护甲。', effect: 'comboBlock' },
  { id: 'phoenix_ash', name: '不灭灰芯', description: '每场战斗首次濒死时回复8点生命。', effect: 'revive' },
  { id: 'quiet_bell', name: '哑钟', description: '答错时额外获得2点护甲。', effect: 'wrongBlock' },
  { id: 'golden_thread', name: '缝卷金丝', description: '每回合第一次打出技能牌，抽1张牌。', effect: 'skillDraw' },
  { id: 'ink_dragon', name: '黑曜龙牙', description: '对易伤敌人的伤害提高25%。', effect: 'vulnerableDamage' },
  { id: 'warm_lamp', name: '守夜灯盏', description: '每场战斗结束回复4点生命。', effect: 'battleHeal' },
  { id: 'lucky_coin', name: '裂币', description: '裂币获取增加25%。', effect: 'goldBonus' },
  { id: 'cracked_seal', name: '裂隙徽印', description: '每场战斗开始时获得1点临时专注。', effect: 'startEnergy' },
  { id: 'bronze_mirror', name: '黑铜镜', description: '战斗中答题耗时少于20秒时获得2点护甲。', effect: 'fastAnswerBlock' },
  { id: 'scroll_case', name: '铁骨卷匣', description: '最大生命增加8点，并回复8点。', effect: 'maxHp' },
  { id: 'ember_bead', name: '余烬髓珠', description: '灼烧每次触发时额外造成2点伤害。', effect: 'burnBonus' },
];

export const ENEMIES = [
  { id: 'dust_sprite', name: '灰烬爬行者', hp: 32, damage: 6, pattern: ['attack', 'attack', 'defend'], reward: 24, act: 1 },
  { id: 'ink_bandit', name: '弃名掠夺者', hp: 40, damage: 7, pattern: ['attack', 'buff', 'attack'], reward: 28, act: 1 },
  { id: 'exam_wraith', name: '残页幽影', hp: 36, damage: 5, pattern: ['attack', 'debuff', 'attack'], reward: 26, act: 1 },
  { id: 'book_golem', name: '铁脊守卫', hp: 58, damage: 9, pattern: ['attack', 'defend', 'attack'], reward: 36, act: 1, elite: true },
  { id: 'gatekeeper', name: '灰门守望者', hp: 92, damage: 10, pattern: ['attack', 'buff', 'attack', 'debuff'], reward: 55, act: 1, boss: true },
  { id: 'number_eater', name: '蚀数兽', hp: 50, damage: 8, pattern: ['attack', 'debuff', 'attack'], reward: 34, act: 2 },
  { id: 'red_paper_demon', name: '赤蜡行刑者', hp: 54, damage: 9, pattern: ['attack', 'attack', 'buff'], reward: 38, act: 2 },
  { id: 'logic_beast', name: '悖论猎犬', hp: 62, damage: 8, pattern: ['debuff', 'attack', 'attack'], reward: 40, act: 2 },
  { id: 'archive_guard', name: '藏库巨卫', hp: 78, damage: 11, pattern: ['attack', 'defend', 'buff'], reward: 52, act: 2, elite: true },
  { id: 'examiner', name: '无面监阅者', hp: 126, damage: 12, pattern: ['attack', 'debuff', 'attack', 'buff'], reward: 75, act: 2, boss: true },
  { id: 'void_librarian', name: '虚空守卷者', hp: 68, damage: 10, pattern: ['attack', 'debuff', 'attack'], reward: 48, act: 3 },
  { id: 'mirror_scholar', name: '镜魇骑士', hp: 74, damage: 10, pattern: ['buff', 'attack', 'attack'], reward: 52, act: 3 },
  { id: 'paper_tiger', name: '纸铠猛虎', hp: 80, damage: 11, pattern: ['attack', 'attack', 'defend'], reward: 55, act: 3 },
  { id: 'four_seals', name: '四印巨像', hp: 102, damage: 13, pattern: ['attack', 'buff', 'attack'], reward: 68, act: 3, elite: true },
  { id: 'heavenly_exam', name: '长夜档案主', hp: 172, damage: 15, pattern: ['attack', 'debuff', 'attack', 'buff'], reward: 100, act: 3, boss: true },
];

export const EVENTS = [
  { id: 'abandoned_study', name: '无火营地', description: '冷灰下埋着半截旧炭。墙上潦草地记着几种推演方法。', choices: [{ label: '靠近余火', description: '恢复18点生命。', effect: 'heal', cost: {}, value: { heal: 18 } }, { label: '搜寻残物', description: '获得12枚裂币。', effect: 'gold', cost: {}, value: { gold: 12 } }, { label: '重温笔记', description: '失去4点生命，强化一张未升级招式。', effect: 'upgrade', cost: { hp: 4 }, value: { upgrades: 1 } }] },
  { id: 'wandering_master', name: '失声朝圣者', description: '披着破斗篷的旅人守着一盏将熄的灯。他只用手势与你交谈。', choices: [{ label: '研读他的手势', description: '免费强化一张未升级招式。', effect: 'upgrade', cost: {}, value: { upgrades: 1 } }, { label: '交出30枚裂币换取遗物', description: '支付30枚裂币，获得一件随机遗物。', effect: 'relic', cost: { gold: 30 }, value: { relics: 1 } }, { label: '掘开石缝', description: '失去5点生命，获得22枚裂币。', effect: 'gold', cost: { hp: 5 }, value: { gold: 22 } }] },
  { id: 'ink_well', name: '枯井余烬', description: '井底没有水，只有一枚仍然发热的黑色石片。', choices: [{ label: '握住石片', description: '恢复14点生命。', effect: 'heal', cost: {}, value: { heal: 14 } }, { label: '支付40枚裂币磨利旧刃', description: '支付40枚裂币，强化一张未升级招式。', effect: 'upgrade', cost: { gold: 40 }, value: { upgrades: 1 } }, { label: '敲下碎屑', description: '失去7点生命，获得30枚裂币。', effect: 'gold', cost: { hp: 7 }, value: { gold: 30 } }] },
  { id: 'oath_stone', name: '断誓石', description: '石碑上刻着被刮去一半的誓词。留下血，或留下钱，才能取走其中的东西。', choices: [{ label: '以8点生命换取遗物', description: '失去8点生命，获得一件随机遗物。', effect: 'relic', cost: { hp: 8 }, value: { relics: 1 } }, { label: '支付25枚裂币，回复20点生命', description: '支付25枚裂币，恢复20点生命。', effect: 'heal', cost: { gold: 25 }, value: { heal: 20 } }, { label: '刻下自己的誓言', description: '失去12点生命，强化一张未升级招式。', effect: 'upgrade', cost: { hp: 12 }, value: { upgrades: 1 } }] },
  { id: 'fallen_scout', name: '倒下的斥候', description: '斥候仍有气息，掌中攥着一枚裂币。他的地图标出了安全的歇脚处。', choices: [{ label: '替他包扎', description: '支付10枚裂币，恢复24点生命。', effect: 'heal', cost: { gold: 10 }, value: { heal: 24 } }, { label: '取走他的遗物', description: '失去6点生命，获得一件随机遗物。', effect: 'relic', cost: { hp: 6 }, value: { relics: 1 } }, { label: '照着地图前行', description: '获得8枚裂币。', effect: 'gold', cost: {}, value: { gold: 8 } }] },
  { id: 'sealed_archive', name: '封死的档案室', description: '铁门后传来翻页声。门缝里塞出一张写满论证步骤的残纸。', choices: [{ label: '支付35枚裂币解读残纸', description: '支付35枚裂币，强化一张未升级招式。', effect: 'upgrade', cost: { gold: 35 }, value: { upgrades: 1 } }, { label: '撬开铁门（损失10点生命）', description: '失去10点生命，获得一件随机遗物。', effect: 'relic', cost: { hp: 10 }, value: { relics: 1 } }, { label: '不惊动里面的东西', description: '恢复10点生命。', effect: 'heal', cost: {}, value: { heal: 10 } }] },
  { id: 'ashen_wager', name: '灰烬赌局', description: '一枚黑骨骰在地上自行滚动。它停下时，朝上的刻痕与你的选择相同。', choices: [{ label: '押上20枚裂币，强化一张牌', description: '支付20枚裂币，强化一张未升级招式。', effect: 'upgrade', cost: { gold: 20 }, value: { upgrades: 1 } }, { label: '以5点生命换取25枚裂币', description: '失去5点生命，获得25枚裂币。', effect: 'gold', cost: { hp: 5 }, value: { gold: 25 } }, { label: '拒绝赌局，恢复少许生命', description: '恢复8点生命。', effect: 'heal', cost: {}, value: { heal: 8 } }] },
];

export const UPGRADES = [
  { id: 'extra_lesson', name: '灰烬操练', description: '每场战斗额外抽1张起手牌。', cost: 30, effect: 'openingDraw' },
  { id: 'inner_breath', name: '血契续命', description: '最大生命永久增加5点。', cost: 35, effect: 'maxHp' },
  { id: 'purse', name: '裂币囊', description: '每次试炼开始多带25枚裂币。', cost: 40, effect: 'startingGold' },
  { id: 'study', name: '残页研习', description: '每次试炼开始时随机升级一张初始牌。', cost: 45, effect: 'starterUpgrade' },
  { id: 'iron_oath', name: '铁誓不坠', description: '每场战斗开始获得2点护甲。', cost: 50, effect: 'smallBattleBlock' },
  { id: 'field_rations', name: '斥候口粮', description: '每次试炼开始携带1瓶灰烬药剂。', cost: 55, effect: 'healingPotion' },
  { id: 'long_memory', name: '长夜记忆', description: '每场战斗首次答对时抽1张牌。', cost: 60, effect: 'firstCorrectDraw' },
  { id: 'night_watch', name: '守夜之火', description: '每场战斗结束恢复2点生命。', cost: 65, effect: 'smallBattleHeal' },
];

export const ACHIEVEMENTS = [
  { id: 'first_blood', name: '第一滴血', description: '赢得第一场战斗。' },
  { id: 'act_one', name: '越过灰门', description: '击败第一幕守望者。' },
  { id: 'tower_clear', name: '长夜尽头', description: '完成余烬试炼。' },
  { id: 'perfect_chain', name: '不灭连击', description: '单场连击达到5。' },
  { id: 'collector', name: '残物收藏家', description: '收集10件遗物。' },
  { id: 'answers_20', name: '循证而行', description: '单次试炼答对20道题。' },
  { id: 'combo_10', name: '心如磐石', description: '单次试炼连击达到10。' },
  { id: 'burn_kill', name: '余火收割', description: '以灼烧击败一名敌人。' },
  { id: 'deep_pockets', name: '裂币成堆', description: '一次持有至少300枚裂币。' },
  { id: 'polished_deck', name: '磨砺有成', description: '单次试炼强化5张牌。' },
];

export const NODE_TYPES = ['combat', 'combat', 'event', 'rest', 'shop', 'treasure', 'elite'];
export const CATEGORIES = ['quant', 'verbal', 'reasoning', 'general'];
export const GAME_TITLE = '余烬试炼';
export const GAME_TITLE_EN = 'EMBER ARCHIVE';
export const NODE_NAMES = { combat: '荒径交锋', elite: '精英试炼', rest: '无火营地', shop: '流亡商贩', event: '命运残响', treasure: '遗物密室', boss: '幕主之战' };
export const STANCES = [
  { id: 'assault', name: '攻势', description: '答对后，对首个存活敌人造成4点穿透伤害。' },
  { id: 'guard', name: '守势', description: '答对后获得7点护甲；答错仍获得2点护甲。' },
  { id: 'insight', name: '洞察', description: '答对后抽1张牌并额外获得1点专注。' },
];
