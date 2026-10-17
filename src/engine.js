import { CLASSES, CARDS, RELICS, ENEMIES, EVENTS, UPGRADES, ACHIEVEMENTS, NODE_TYPES, CATEGORIES, STANCES, NODE_NAMES, GAME_TITLE, GAME_TITLE_EN } from './content.js';

const byId = (list, id) => list.find(x => x.id === id);
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const copy = x => JSON.parse(JSON.stringify(x));

export function rng(seed = 1) {
  let state = (typeof seed === 'number' ? seed : hash(String(seed))) >>> 0;
  if (!state) state = 0x6d2b79f5;
  const next = () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) / 4294967296; };
  return { next, int(max) { return Math.floor(next() * max); }, range(min, max) { return min + Math.floor(next() * (max - min + 1)); }, pick(items) { return items[this.int(items.length)]; }, shuffle(items) { const a = [...items]; for (let i = a.length - 1; i > 0; i--) { const j = this.int(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; } };
}
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

export function createProfile() { return { fragments: 0, xp: 0, level: 1, totalRuns: 0, wins: 0, bestAct: 0, upgrades: [], achievements: [], stats: { questions: 0, correct: 0, battles: 0, goldEarned: 0, bestCombo: 0 } }; }

export function createRun({ classId = 'scholar', seed = Date.now(), difficulty = 'normal', mode = 'standard', profile = createProfile() } = {}) {
  const hero = byId(CLASSES, classId) || CLASSES[0];
  const random = rng(seed);
  const permanent = (profile.upgrades || []).map(id => byId(UPGRADES, id)?.effect).filter(Boolean);
  let maxHp = hero.hp + (permanent.includes('maxHp') ? 5 : 0);
  if (difficulty === 'easy') maxHp = Math.round(maxHp * 1.15);
  if (difficulty === 'hard') maxHp = Math.round(maxHp * 0.88);
  const deck = hero.starterCards.map((cardId, i) => ({ id: `c${i + 1}`, cardId, upgraded: false }));
  if (permanent.includes('starterUpgrade')) deck[0].upgraded = true;
  const run = {
    id: `run-${String(seed)}`, seed, rngState: (typeof seed === 'number' ? seed : hash(String(seed))) >>> 0,
    classId: hero.id, className: hero.name, difficulty, mode, state: 'map', act: 1, floor: 0,
    hp: maxHp, maxHp, gold: hero.gold + (permanent.includes('startingGold') ? 25 : 0), fragments: 0,
    deck, nextCardId: deck.length + 1, relics: [hero.relicId], potions: permanent.includes('healingPotion') ? ['healing'] : [], answers: [], stats: { questions: 0, correct: 0, battles: 0, goldEarned: 0, bestCombo: 0 },
    map: [], currentNodeId: null, clearedNodeIds: [], visitedNodeIds: [], battle: null,
    rewardOptions: [], shop: null, event: null, restOptions: null, pendingQuestion: null,
    combo: 0, permanentUpgrades: permanent, achievements: [], log: [], uiQuestionId: null,
  };
  buildMap(run, random);
  run.rngState = (run.rngState || 1) >>> 0;
  run.rngState = (random.next() * 0x100000000) >>> 0;
  if (run.permanentUpgrades.includes('maxHp')) run.hp = run.maxHp;
  addLog(run, `${hero.name}踏入${GAME_TITLE}。`);
  return run;
}

function randomFor(run) {
  let state = (run.rngState || run.seed || 1) >>> 0;
  if (!state) state = 0x6d2b79f5;
  const next = () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) / 4294967296; };
  return { next, int(max) { return Math.floor(next() * max); }, pick(items) { return items[this.int(items.length)]; }, shuffle(items) { const a = [...items]; for (let i = a.length - 1; i > 0; i--) { const j = this.int(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }, commit() { run.rngState = state >>> 0; } };
}
// Map structure is fully materialized so a run can be JSON serialized and resumed.
function buildMap(run, random = rng(run.seed)) {
  run.map = [];
  const acts = [];
  for (let act = 1; act <= 3; act++) {
    const rows = [];
    for (let floor = 1; floor <= 6; floor++) {
      const nodes = [];
      for (let lane = 0; lane < 3; lane++) {
        let type;
        if (floor === 6) type = 'boss';
        else if (floor === 1) type = lane === 1 ? 'combat' : random.pick(['combat', 'event', 'combat']);
        else type = random.pick(NODE_TYPES);
        const node = { id: `a${act}-f${floor}-n${lane}`, act, floor, lane, type, name: nodeName(type), connections: [], status: floor === 1 ? 'available' : 'locked' };
        nodes.push(node);
      }
      rows.push(nodes);
    }
    for (let floor = 0; floor < rows.length - 1; floor++) {
      rows[floor].forEach(node => {
        const left = Math.max(0, node.lane - 1), right = Math.min(2, node.lane + 1);
        const possible = [left, node.lane, right];
        node.connections = [...new Set([random.pick(possible), random.pick(possible)])].map(lane => `a${act}-f${floor + 2}-n${lane}`);
      });
    }
    // Ensure every next-row lane can be reached and every route offers a choice.
    for (let floor = 0; floor < rows.length - 1; floor++) {
      for (const dest of rows[floor + 1]) if (!rows[floor].some(n => n.connections.includes(dest.id))) rows[floor][dest.lane].connections.push(dest.id);
    }
    acts.push(rows.flat());
  }
  run.map = acts.flat();
}
function nodeName(type) { return NODE_NAMES[type] || '未知'; }
function addLog(run, message) { run.log ||= []; run.log.push(message); if (run.log.length > 40) run.log.shift(); }
function awardAchievement(run, id) { run.achievements ||= []; if (!run.achievements.includes(id)) run.achievements.push(id); }
function addCard(run, cardId, upgraded = false) { const instance = { id: `card-${run.nextCardId || 1}`, cardId, upgraded }; run.nextCardId = (run.nextCardId || 1) + 1; run.deck.push(instance); return instance; }
function markGoldAchievement(run) { if (run.gold >= 300) awardAchievement(run, 'deep_pockets'); }
function markUpgradeAchievement(run) { if (run.deck.filter(c => c.upgraded).length >= 5) awardAchievement(run, 'polished_deck'); }
export function getAvailableNodes(run) { return run.map.filter(n => n.act === run.act && n.status === 'available'); }
function currentNode(run) { return run.map.find(n => n.id === run.currentNodeId); }

export function enterNode(run, nodeId) {
  if (!['map'].includes(run.state)) return run;
  const node = run.map.find(n => n.id === nodeId && n.act === run.act && n.status === 'available');
  if (!node) return run;
  for (const sibling of run.map) if (sibling.act === node.act && sibling.floor === node.floor && sibling.id !== node.id && sibling.status === 'available') sibling.status = 'passed';
  node.status = 'active'; run.currentNodeId = node.id; run.floor = node.floor;
  if (node.floor > 1) { for (const relicId of run.relics) if (byId(RELICS, relicId)?.effect === 'floorHeal') heal(run, 3); }
  run.visitedNodeIds.push(node.id);
  if (node.type === 'combat' || node.type === 'elite' || node.type === 'boss') startBattle(run, node.type);
  else if (node.type === 'rest') { run.state = 'rest'; run.restOptions = ['heal', 'upgrade', 'remove']; }
  else if (node.type === 'shop') { run.state = 'shop'; createShop(run); }
  else if (node.type === 'event') { run.state = 'event'; const r = randomFor(run); run.event = copy(r.pick(EVENTS)); r.commit(); }
  else if (node.type === 'treasure') { run.state = 'treasure'; const r = randomFor(run); const relic = r.pick(RELICS.filter(x => !run.relics.includes(x.id))); run.treasure = { relicId: relic?.id || null, gold: 30 }; r.commit(); }
  return run;
}

function startBattle(run, nodeType) {
  delete run.uiQuestionId;
  run.pendingQuestion = null;
  const r = randomFor(run);
  const pool = ENEMIES.filter(e => e.act === run.act && (nodeType === 'boss' ? e.boss : nodeType === 'elite' ? e.elite : !e.boss && !e.elite));
  const enemy = r.pick(pool);
  const difficultyHp = run.difficulty === 'easy' ? 0.9 : run.difficulty === 'hard' ? 1.18 : 1;
  const difficultyDamage = run.difficulty === 'easy' ? 0.8 : run.difficulty === 'hard' ? 1.25 : 1;
  const hpScale = enemy.boss ? ({ 1: 1.15, 2: 0.85, 3: 0.65 })[run.act] : ({ 1: 1.15, 2: 0.65, 3: 0.5 })[run.act];
  const damageScale = difficultyDamage * ({ 1: 0.95, 2: 1.05, 3: 1.2 })[run.act];
  const makeFoe = (source, pairScale = 1) => {
    const hp = Math.round(source.hp * difficultyHp * hpScale * pairScale);
    return { ...copy(source), hp, maxHp: hp, damage: Math.max(1, Math.round(source.damage * damageScale * (pairScale < 1 ? 0.75 : 1))), block: 0, status: { burn: 0, vulnerable: 0, strength: 0 }, intentIndex: 0, intent: null, dead: false };
  };
  const foes = [makeFoe(enemy)];
  const pairChance = run.act === 2 ? 0.35 : run.act === 3 ? 0.5 : 0;
  if (nodeType === 'combat' && pairChance > 0 && r.next() < pairChance) {
    const secondPool = pool.filter(e => e.id !== enemy.id);
    if (secondPool.length) foes.push(makeFoe(r.pick(secondPool), 0.62));
  }
  r.commit();
  const drawPile = shuffled(run, run.deck);
  const opening = 5 + (run.permanentUpgrades.includes('openingDraw') ? 1 : 0) + (run.relics.some(id => byId(RELICS, id)?.effect === 'firstTurnDraw') ? 1 : 0);
  const battle = { phase: 'question', turn: 1, energy: 0, baseEnergy: 0, block: 0, drawPile, hand: [], discard: [], exhaust: [], enemies: foes, playerStatus: { weakened: 0 }, stance: 'assault', answeredThisTurn: false, firstCorrectEnergyUsed: false, firstCorrectDrawUsed: false, firstHitUsed: false, firstTurnUsed: false, firstSkillThisTurn: false, extraDrawNext: 0, combos: 0, nodeType, damageTaken: 0, defeated: false };
  run.battle = battle; run.state = 'battle'; run.stats.battles++;
  for (const id of run.relics) { const effect = byId(RELICS, id)?.effect; if (effect === 'battleBlock') battle.block += 5; if (effect === 'startEnergy') battle.energy++; }
  if (run.permanentUpgrades.includes('smallBattleBlock')) battle.block += 2;
  draw(run, opening);
  for (const foe of foes) setIntent(foe);
}
function shuffled(run, cards) { const r = randomFor(run); const arr = r.shuffle(cards.map(x => ({ ...x }))); r.commit(); return arr; }
function draw(run, amount = 1) { const b = run.battle; for (let i = 0; i < amount; i++) { if (!b.drawPile.length && b.discard.length) { b.drawPile = shuffled(run, b.discard); b.discard = []; } if (b.drawPile.length && b.hand.length < 10) b.hand.push(b.drawPile.pop()); } }
function getCard(instance) { return byId(CARDS, instance.cardId); }
function upgradeValue(card, upgraded, key) { const raw = card[key] || 0; return upgraded && typeof raw === 'number' && raw > 0 ? raw + (key === 'cost' ? 0 : Math.max(1, Math.floor(raw * 0.3))) : raw; }
export function getCardCost(run, instance) { const card = getCard(instance); if (!card) return Infinity; let cost = card.cost; if (instance.upgraded && card.cost > 0 && ['grand_thesis', 'ratio'].includes(card.id)) cost--; if (card.conditionLowHp && run.hp <= run.maxHp / 2) cost = 0; return cost; }
const cardCost = getCardCost;
function setIntent(enemy) {
  const kind = enemy.pattern[enemy.intentIndex % enemy.pattern.length];
  enemy.intent = { type: kind, damage: kind === 'attack' ? enemy.damage + (enemy.status.strength || 0) : 0, label: ({ attack: '攻击', defend: '格挡', buff: '蓄势', debuff: '扰乱' })[kind] };
}
export function selectQuestion(run, questionId) { if (run.state === 'battle' && run.battle.phase === 'question') run.pendingQuestion = questionId ?? null; return run; }
export function selectStance(run, stanceId = 'assault') { if (run.state === 'battle' && run.battle.phase === 'question' && STANCES.some(s => s.id === stanceId)) run.battle.stance = stanceId; return run; }

export function answerQuestion(run, { correct = false, questionId = run.pendingQuestion, option = null, answer = null, elapsed = null, category = null } = {}) {
  if (run.state !== 'battle' || run.battle.phase !== 'question') return run;
  const b = run.battle;
  run.stats.questions++; run.answers.push({ questionId, correct: Boolean(correct), option, answer, elapsed, category: CATEGORIES.includes(category) ? category : null, act: run.act, floor: run.floor, turn: b.turn });
  if (run.answers.length > 300) run.answers.shift();
  b.answeredThisTurn = true;
  if (correct) {
    run.stats.correct++; run.combo++; run.stats.bestCombo = Math.max(run.stats.bestCombo, run.combo); b.combos++;
    if (run.stats.correct >= 20) awardAchievement(run, 'answers_20');
    if (run.combo >= 10) awardAchievement(run, 'combo_10');
    b.energy += 3;
    if (run.combo >= 2 && run.combo % 2 === 0) b.energy++;
    if (b.stance === 'assault') piercingDamage(run, null, 4);
    else if (b.stance === 'guard') b.block += 7;
    else if (b.stance === 'insight') { draw(run, 1); b.energy++; }
    for (const id of run.relics) {
      const effect = byId(RELICS, id)?.effect;
      if (effect === 'firstCorrectEnergy' && !b.firstCorrectEnergyUsed) { b.energy++; b.firstCorrectEnergyUsed = true; }
      if (effect === 'firstCorrectDraw' && !b.firstCorrectDrawUsed) { draw(run, 1); b.firstCorrectDrawUsed = true; }
      if (effect === 'answerProc' && run.stats.correct % 3 === 0) damageEnemy(run, 0, 4);
      if (effect === 'comboBlock' && run.combo === 3) b.block += 4;
    }
    if (run.permanentUpgrades.includes('firstCorrectDraw') && !b.firstCorrectDrawUsed) { draw(run, 1); b.firstCorrectDrawUsed = true; }
    if (elapsed != null && elapsed <= 20 && run.relics.some(id => byId(RELICS, id)?.effect === 'fastAnswerBlock')) b.block += 2;
  } else {
    run.combo = 0; b.energy += 1;
    if (run.relics.some(id => byId(RELICS, id)?.effect === 'wrongBlock')) b.block += 2;
    if (b.stance === 'guard') b.block += 2;
  }
  if (b.enemies.every(e => e.dead)) finishBattle(run);
  if (run.state !== 'battle') return run;
  b.energy = clamp(b.energy, 0, 12);
  run.pendingQuestion = null; b.phase = 'action';
  addLog(run, correct ? `答题正确，连击 ${run.combo}，专注凝成。` : '答题失误，仍凝成1点专注。');
  return run;
}

export function playCard(run, instanceId, targetIndex = 0) {
  if (run.state !== 'battle' || run.battle.phase !== 'action') return run;
  const b = run.battle; const index = b.hand.findIndex(c => c.id === instanceId); if (index < 0) return run;
  const instance = b.hand[index], card = getCard(instance); if (!card || b.energy < cardCost(run, instance)) return run;
  const target = b.enemies[targetIndex] && !b.enemies[targetIndex].dead ? targetIndex : b.enemies.findIndex(e => !e.dead);
  if (target < 0) return run;
  b.energy -= cardCost(run, instance); b.hand.splice(index, 1);
  const bonus = instance.upgraded ? 2 : 0;
  if (card.damage) {
    const hits = card.repeatOnCombo && run.combo > 0 ? 2 : 1;
    for (let i = 0; i < hits; i++) damageEnemy(run, card.aoe ? null : target, upgradeValue(card, instance.upgraded, 'damage') + bonus + (card.comboDamage ? Math.min(4, run.combo) : 0));
  }
  if (card.block) b.block += upgradeValue(card, instance.upgraded, 'block') + bonus;
  if (card.burn) for (const enemy of card.aoe ? b.enemies : [b.enemies[target]]) if (enemy && !enemy.dead) enemy.status.burn += upgradeValue(card, instance.upgraded, 'burn');
  if (card.vulnerable) b.enemies[target].status.vulnerable = Math.max(b.enemies[target].status.vulnerable, card.vulnerable + (instance.upgraded ? 1 : 0));
  if (card.draw) draw(run, card.draw + (instance.upgraded ? 1 : 0));
  if (card.energy) b.energy += card.energy;
  if (card.heal) heal(run, card.heal + (instance.upgraded ? 2 : 0));
  if (card.selfDamage) {
    loseHealth(run, card.selfDamage);
    if (run.state === 'defeat') return run;
  }
  if (card.nextDraw) b.extraDrawNext += card.nextDraw;
  if (card.retrieve && b.discard.length) b.hand.push(b.discard.pop());
  if (card.cleanse) { b.playerStatus.weakened = 0; b.playerStatus.burn = 0; }
  if (card.type === 'skill' && !b.firstSkillThisTurn) {
    b.firstSkillThisTurn = true;
    if (run.relics.some(id => byId(RELICS, id)?.effect === 'skillDraw')) draw(run, 1);
  }
  (instance.exhaust || card.exhaust) ? b.exhaust.push(instance) : b.discard.push(instance);
  if (b.enemies.every(e => e.dead)) finishBattle(run);
  return run;
}
function damageEnemy(run, targetIndex, amount) {
  const b = run.battle; if (!b) return;
  const targets = targetIndex == null ? b.enemies.filter(e => !e.dead) : [b.enemies[targetIndex]].filter(e => e && !e.dead);
  for (const enemy of targets) {
    let damage = amount;
    if (b.playerStatus?.weakened > 0) damage = Math.floor(damage * 0.75);
    if (enemy.status.vulnerable > 0) damage = Math.floor(damage * (run.relics.some(id => byId(RELICS, id)?.effect === 'vulnerableDamage') ? 1.25 : 1.5));
    damage = Math.max(0, damage - enemy.block); enemy.block = Math.max(0, enemy.block - amount); enemy.hp -= damage;
    if (enemy.hp <= 0) { enemy.hp = 0; enemy.dead = true; }
  }
  if (b.enemies.every(e => e.dead)) finishBattle(run);
}
function heal(run, amount) { run.hp = Math.min(run.maxHp, run.hp + amount); }
function piercingDamage(run, targetIndex, amount) {
  const b = run.battle;
  const enemy = b?.enemies.find((e, i) => !e.dead && (targetIndex == null || i === targetIndex));
  if (!enemy) return;
  let damage = amount;
  if (enemy.status.vulnerable > 0) damage = Math.floor(damage * (run.relics.some(id => byId(RELICS, id)?.effect === 'vulnerableDamage') ? 1.25 : 1.5));
  if (b.playerStatus?.weakened > 0) damage = Math.floor(damage * 0.75);
  enemy.hp = Math.max(0, enemy.hp - damage);
  if (enemy.hp === 0) enemy.dead = true;
  addLog(run, `攻势穿透造成${damage}点伤害。`);
}
function takeDamage(run, amount) {
  const b = run.battle;
  let incoming = amount;
  if (b && !b.firstHitUsed && run.relics.some(id => byId(RELICS, id)?.effect === 'firstHitBlock')) { incoming = Math.max(0, incoming - 3); b.firstHitUsed = true; }
  if (b) { const blocked = Math.min(b.block, incoming); b.block -= blocked; incoming -= blocked; b.damageTaken += incoming; }
  run.hp -= incoming;
  checkSurvival(run);
}
function loseHealth(run, amount) {
  run.hp -= Math.max(0, amount);
  checkSurvival(run);
}
function checkSurvival(run) {
  const b = run.battle;
  if (run.hp <= 0) {
    const revive = run.relics.some(id => byId(RELICS, id)?.effect === 'revive') && !run.usedRevive;
    if (revive) { run.usedRevive = true; run.hp = 8; }
    else { run.hp = 0; run.state = 'defeat'; if (b) b.phase = 'ended'; addLog(run, '生命耗尽，远征止步于此。'); }
  }
}
function finishBattle(run) {
  const b = run.battle; if (!b || b.defeated) return;
  b.defeated = true; b.phase = 'ended'; run.combo = 0;
  const enemy = b.enemies[0]; const gold = Math.round(enemy.reward * (run.relics.some(id => byId(RELICS, id)?.effect === 'goldBonus') ? 1.25 : 1));
  run.gold += gold; run.stats.goldEarned += gold; run.fragments += b.nodeType === 'boss' ? 35 : b.nodeType === 'elite' ? 14 : 6; markGoldAchievement(run);
  awardAchievement(run, 'first_blood');
  if (run.stats.bestCombo >= 5 && !run.achievements.includes('perfect_chain')) run.achievements.push('perfect_chain');
  for (const id of run.relics) if (byId(RELICS, id)?.effect === 'battleHeal') heal(run, 4);
  if (run.permanentUpgrades.includes('smallBattleHeal')) heal(run, 2);
  addLog(run, `${enemy.name}倒下，获得${gold}枚裂币。`);
  if (b.nodeType === 'boss') {
    if (run.act === 1) awardAchievement(run, 'act_one');
    if (run.act >= 3) { run.state = 'victory'; awardAchievement(run, 'tower_clear'); return; }
    run.pendingActAdvance = true;
  }
  run.rewardOptions = makeRewards(run, b.nodeType);
  run.state = 'reward';
}
function makeRewards(run, nodeType) {
  const r = randomFor(run); const pool = CARDS.filter(c => !run.deck.some(i => i.cardId === c.id) || r.next() < .6);
  const cards = r.shuffle(pool).slice(0, 3).map(card => ({ kind: 'card', id: card.id, name: card.name, cardId: card.id, description: card.text }));
  if (cards.length < 3) for (const card of r.shuffle(CARDS).slice(0, 3 - cards.length)) cards.push({ kind: 'card', id: card.id, name: card.name, cardId: card.id, description: card.text });
  const rewards = [{ kind: 'gold', id: 'gold', name: '拾取裂币', amount: nodeType === 'boss' ? 35 : 15 + r.int(11) }, ...cards.slice(0, 2)];
  if (nodeType === 'elite' || nodeType === 'boss') { const relic = r.pick(RELICS.filter(x => !run.relics.includes(x.id))); if (relic) rewards[2] = { kind: 'relic', id: relic.id, name: relic.name, relicId: relic.id, description: relic.description }; }
  r.commit(); return rewards;
}
export function chooseReward(run, choice) {
  if (run.state !== 'reward') return run;
  let selected = typeof choice === 'number' ? run.rewardOptions[choice] : run.rewardOptions.find(x => x.id === choice || x.cardId === choice || x.relicId === choice);
  if (selected) {
    if (selected.kind === 'gold') { run.gold += selected.amount; run.stats.goldEarned += selected.amount; markGoldAchievement(run); }
    if (selected.kind === 'card') addCard(run, selected.cardId);
    if (selected.kind === 'relic' && !run.relics.includes(selected.relicId)) grantRelic(run, selected.relicId);
    addLog(run, `获得：${selected.name}。`);
  }
  run.rewardOptions = [];
  completeNode(run);
  return run;
}
function applyRelicPickup(run, id) { if (byId(RELICS, id)?.effect === 'maxHp') { run.maxHp += 8; run.hp = Math.min(run.maxHp, run.hp + 8); } }
function grantRelic(run, id) { if (!id || run.relics.includes(id)) return false; run.relics.push(id); applyRelicPickup(run, id); if (run.relics.length >= 10) awardAchievement(run, 'collector'); return true; }

export function endTurn(run) {
  if (run.state !== 'battle' || run.battle.phase !== 'action') return run;
  const b = run.battle;
  for (const enemy of b.enemies) {
    if (enemy.dead) continue;
    if (enemy.status.burn > 0) {
      const bonus = run.relics.some(id => byId(RELICS, id)?.effect === 'burnBonus') ? 2 : 0;
      enemy.hp -= enemy.status.burn + bonus; enemy.status.burn = Math.max(0, enemy.status.burn - 1);
      if (enemy.hp <= 0) { enemy.hp = 0; enemy.dead = true; awardAchievement(run, 'burn_kill'); }
    }
  }
  if (b.enemies.every(e => e.dead)) { finishBattle(run); return run; }
  for (const enemy of b.enemies) {
    if (enemy.dead) continue;
    const intent = enemy.intent;
    if (intent.type === 'attack') takeDamage(run, intent.damage);
    else if (intent.type === 'defend') enemy.block += 8;
    else if (intent.type === 'buff') enemy.status.strength += 2;
    else if (intent.type === 'debuff') { b.playerStatus.weakened = Math.max(b.playerStatus.weakened || 0, 2); }
    enemy.intentIndex++; enemy.block = Math.max(0, enemy.block - 2); enemy.status.vulnerable = Math.max(0, enemy.status.vulnerable - 1); setIntent(enemy);
  }
  if (run.state === 'defeat') return run;
  b.block = Math.floor(b.block / 2); // player block decays between turns
  for (const card of b.hand) b.discard.push(card); b.hand = [];
  b.turn++; b.energy = b.baseEnergy; b.firstSkillThisTurn = false; b.answeredThisTurn = false; b.playerStatus.weakened = Math.max(0, b.playerStatus.weakened - 1);
  draw(run, 5 + b.extraDrawNext); b.extraDrawNext = 0;
  if (b.enemies.every(e => e.dead)) { finishBattle(run); return run; }
  b.phase = 'question'; run.pendingQuestion = null;
  return run;
}

function completeNode(run) {
  const node = currentNode(run); if (!node) return;
  node.status = 'cleared'; run.clearedNodeIds.push(node.id); run.state = 'map'; run.battle = null; run.event = null; run.shop = null; run.treasure = null; run.restOptions = null; run.pendingQuestion = null; delete run.uiQuestionId;
  if (run.pendingActAdvance) { run.act++; run.floor = 0; run.pendingActAdvance = false; run.currentNodeId = null; for (const n of run.map) if (n.act === run.act && n.floor === 1) n.status = 'available'; return; }
  for (const nextId of node.connections) { const next = run.map.find(n => n.id === nextId); if (next && next.status === 'locked') next.status = 'available'; }
  // If this branch was the last uncleared route, allow any remaining reachable nodes; no dead ends.
  const nextFloor = run.map.filter(n => n.act === run.act && n.floor === node.floor + 1);
  if (nextFloor.length && nextFloor.every(n => n.status === 'locked')) nextFloor.forEach(n => { n.status = 'available'; });
  run.currentNodeId = null;
}
export function leaveNode(run) { if (['reward', 'shop', 'event', 'rest', 'treasure'].includes(run.state)) { if (run.state === 'reward') chooseReward(run, null); else if (run.state === 'treasure') openTreasure(run); else completeNode(run); } return run; }

export function rest(run, action = 'heal', cardId = null) {
  if (run.state !== 'rest') return run;
  if (action === 'heal') heal(run, Math.ceil(run.maxHp * 0.3));
  else if (action === 'upgrade') {
    const card = run.deck.find(c => (cardId ? c.id === cardId : true) && !c.upgraded);
    if (card) { card.upgraded = true; markUpgradeAchievement(run); }
  } else if (action === 'remove') {
    const idx = run.deck.findIndex(c => cardId ? c.id === cardId : c.cardId === 'quick_calc');
    if (idx >= 0 && run.deck.length > 1) run.deck.splice(idx, 1);
  } else return run;
  completeNode(run); return run;
}
function createShop(run) {
  const r = randomFor(run);
  const items = r.shuffle(CARDS).slice(0, 3).map(c => ({ id: `card:${c.id}`, kind: 'card', cardId: c.id, name: c.name, price: 55, description: c.text }));
  const relics = r.shuffle(RELICS.filter(x => !run.relics.includes(x.id))).slice(0, 2).map(x => ({ id: `relic:${x.id}`, kind: 'relic', relicId: x.id, name: x.name, price: 95, description: x.description }));
  items.push({ id: 'remove_card', kind: 'remove', name: '卸下累赘', price: 70, description: '移除一张牌。' }, { id: 'potion:healing', kind: 'potion', potionId: 'healing', name: '灰烬药剂', price: 45, description: '回复12点生命。' });
  r.commit(); run.shop = { items, bought: [], removeUsed: false };
}
export function buyItem(run, itemId) {
  if (run.state !== 'shop' || !run.shop) return run;
  const item = run.shop.items.find(x => x.id === itemId); if (!item || run.shop.bought.includes(itemId) || run.gold < item.price) return run;
  if (item.kind === 'remove' && run.deck.length <= 1) return run;
  run.gold -= item.price; run.shop.bought.push(itemId); item.sold = true;
  if (item.kind === 'card') addCard(run, item.cardId);
  if (item.kind === 'relic' && !run.relics.includes(item.relicId)) grantRelic(run, item.relicId);
  if (item.kind === 'potion') run.potions.push(item.potionId);
  if (item.kind === 'remove') run.shop.removePending = true;
  return run;
}
export function removeShopCard(run, cardId) { if (run.state !== 'shop' || !run.shop?.removePending) return run; const i = run.deck.findIndex(x => x.id === cardId); if (i >= 0 && run.deck.length > 1) run.deck.splice(i, 1); run.shop.removePending = false; return run; }

export function usePotion(run, potionId = 'healing') {
  if (!['battle', 'map'].includes(run.state) || !Array.isArray(run.potions)) return run;
  const index = run.potions.indexOf(potionId);
  if (index < 0) return run;
  if (potionId === 'healing') {
    if (run.hp >= run.maxHp) return run;
    heal(run, 12);
  } else return run;
  run.potions.splice(index, 1);
  addLog(run, '饮下灰烬药剂，恢复12点生命。');
  return run;
}

function resolveEventChoice(run, choice) {
  if (!run.event) return null;
  return typeof choice === 'number' ? run.event.choices[choice] : run.event.choices.find(x => x.label === choice || x.id === choice || x.effect === choice);
}
export function canChooseEvent(run, choice) {
  if (run.state !== 'event') return false;
  const selected = resolveEventChoice(run, choice);
  if (!selected) return false;
  const cost = selected.cost || {};
  if (selected.effect === 'upgrade' && !run.deck.some(card => !card.upgraded)) return false;
  return run.gold >= (cost.gold || 0) && run.hp > (cost.hp || 0);
}
export function chooseEvent(run, choice) {
  if (run.state !== 'event' || !run.event) return run;
  if (!canChooseEvent(run, choice)) return run;
  const selected = resolveEventChoice(run, choice); const cost = selected.cost || {}; const value = selected.value || {};
  run.gold -= cost.gold || 0; run.hp -= cost.hp || 0;
  if (selected.effect === 'heal') heal(run, value.heal ?? Math.ceil(run.maxHp * .2));
  if (selected.effect === 'gold') { const amount = value.gold ?? 25; run.gold += amount; run.stats.goldEarned += amount; markGoldAchievement(run); }
  if (selected.effect === 'upgrade') {
    let remaining = value.upgrades ?? 1;
    for (const card of run.deck) if (!card.upgraded && remaining > 0) { card.upgraded = true; remaining--; }
    markUpgradeAchievement(run);
  }
  if (selected.effect === 'relic') {
    const r = randomFor(run); const relic = r.pick(RELICS.filter(x => !run.relics.includes(x.id))); r.commit();
    if (relic) grantRelic(run, relic.id);
    else { run.gold += 15; run.stats.goldEarned += 15; markGoldAchievement(run); }
  }
  if (run.gold >= 300) awardAchievement(run, 'deep_pockets');
  completeNode(run); return run;
}
export function openTreasure(run) { if (run.state !== 'treasure' || !run.treasure) return run; if (run.treasure.relicId) grantRelic(run, run.treasure.relicId); run.gold += run.treasure.gold; run.stats.goldEarned += run.treasure.gold; markGoldAchievement(run); completeNode(run); return run; }

export function settleRun(run, profile = createProfile()) {
  if (run.settled) return { run, profile };
  const win = run.state === 'victory'; const fragments = run.fragments + (win ? 50 : Math.max(0, run.act - 1) * 8);
  const xp = Math.floor(run.stats.correct * 2 + run.stats.questions + (win ? 100 : run.act * 20));
  profile.fragments = (profile.fragments || 0) + fragments; profile.xp = (profile.xp || 0) + xp; profile.level = Math.floor(Math.sqrt(profile.xp / 80)) + 1; profile.totalRuns = (profile.totalRuns || 0) + 1;
  if (win) profile.wins = (profile.wins || 0) + 1;
  profile.bestAct = Math.max(profile.bestAct || 0, run.act);
  profile.stats ||= { questions: 0, correct: 0, battles: 0, goldEarned: 0, bestCombo: 0 };
  for (const key of Object.keys(run.stats)) {
    if (key === 'bestCombo') profile.stats.bestCombo = Math.max(profile.stats.bestCombo || 0, run.stats.bestCombo);
    else profile.stats[key] = (profile.stats[key] || 0) + run.stats[key];
  }
  profile.achievements = [...new Set([...(profile.achievements || []), ...run.achievements])];
  run.settled = true; run.settlement = { win, fragments, xp, actReached: run.act, questions: run.stats.questions, correct: run.stats.correct };
  return { run, profile };
}
export function upgradeProfile(profile, id) {
  const item = byId(UPGRADES, id); if (!item || (profile.upgrades || []).includes(id) || profile.fragments < item.cost) return profile;
  profile.fragments -= item.cost; profile.upgrades ||= []; profile.upgrades.push(id); return profile;
}

export { CLASSES, CARDS, RELICS, ENEMIES, EVENTS, UPGRADES, ACHIEVEMENTS, STANCES, NODE_NAMES, GAME_TITLE, GAME_TITLE_EN };
