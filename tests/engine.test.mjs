import test from 'node:test';
import assert from 'node:assert/strict';
import { createProfile, createRun, getAvailableNodes, enterNode, leaveNode, answerQuestion, playCard, endTurn, chooseReward, chooseEvent, buyItem, settleRun, selectQuestion, selectStance, CARDS, RELICS, EVENTS, ACHIEVEMENTS, usePotion, canChooseEvent, rest, openTreasure, getCardCost } from '../src/engine.js';

function battleRun(seed = 11) {
  const run = createRun({ classId: 'scholar', seed });
  const node = getAvailableNodes(run).find(n => n.type === 'combat');
  assert.ok(node, 'first route should offer a combat');
  enterNode(run, node.id);
  return run;
}

test('answer phase records study history and turns a correct answer into energy and combo', () => {
  const run = battleRun();
  selectQuestion(run, 'q-17');
  const energy = run.battle.energy;
  assert.equal(energy, 0, 'a new question starts without free energy');
  answerQuestion(run, { correct: true, questionId: 'q-17', option: 'C', elapsed: 18, category: 'quant' });
  assert.equal(run.battle.phase, 'action');
  // Scholar's starting Inkstone adds one energy to the normal +3 answer reward.
  assert.equal(run.battle.energy, energy + 4);
  assert.equal(run.combo, 1);
  assert.deepEqual(run.answers[0], { questionId: 'q-17', correct: true, option: 'C', answer: null, elapsed: 18, category: 'quant', act: 1, floor: 1, turn: 1 });
});

test('stances trade answer bonuses between penetration, defense, and card flow', () => {
  const assault = battleRun(31);
  assault.battle.enemies[0].block = 9;
  const hp = assault.battle.enemies[0].hp;
  selectStance(assault, 'assault');
  answerQuestion(assault, { correct: true });
  assert.equal(assault.battle.enemies[0].hp, hp - 4, 'assault damage penetrates enemy block');

  const guard = battleRun(32);
  selectStance(guard, 'guard');
  answerQuestion(guard, { correct: true });
  assert.equal(guard.battle.block, 7);
  const wrongGuard = battleRun(33);
  selectStance(wrongGuard, 'guard');
  answerQuestion(wrongGuard, { correct: false });
  assert.equal(wrongGuard.battle.block, 2);

  const insight = battleRun(34);
  selectStance(insight, 'insight');
  const handSize = insight.battle.hand.length;
  answerQuestion(insight, { correct: true });
  assert.equal(insight.battle.hand.length, handSize + 1);
  assert.equal(insight.battle.energy, 5, 'three answer energy plus scholar relic and insight bonus');
});

test('first-correct energy and draw relics use independent once-per-battle flags', () => {
  const run = battleRun(35);
  run.relics.push('paper_crane');
  const hand = run.battle.hand.length;
  answerQuestion(run, { correct: true });
  assert.equal(run.battle.energy, 4);
  assert.equal(run.battle.hand.length, hand + 1);
  assert.equal(run.battle.firstCorrectEnergyUsed, true);
  assert.equal(run.battle.firstCorrectDrawUsed, true);
});

test('later acts can spawn paired enemies and AoE cards hit both', () => {
  let run;
  for (let seed = 1; seed <= 30; seed++) {
    run = createRun({ seed });
    run.act = 2;
    const node = run.map.find(n => n.act === 2 && n.floor === 1 && n.type === 'combat');
    node.status = 'available';
    enterNode(run, node.id);
    if (run.battle.enemies.length === 2) break;
  }
  assert.equal(run.battle.enemies.length, 2, 'seed sweep should find the configured act-two pair chance');
  const hp = run.battle.enemies.map(e => e.hp);
  run.battle.hand.push({ id: 'test-aoe', cardId: 'ink_wave', upgraded: false });
  answerQuestion(run, { correct: true });
  playCard(run, 'test-aoe', 0);
  assert.ok(run.battle.enemies.every((enemy, i) => enemy.hp < hp[i]));
});

test('cleanse removes the player debuff and difficulty changes enemy damage', () => {
  const normal = battleRun(36);
  const hard = createRun({ seed: 36, difficulty: 'hard' });
  const hardNode = getAvailableNodes(hard).find(n => n.type === 'combat');
  enterNode(hard, hardNode.id);
  assert.ok(hard.battle.enemies[0].damage > normal.battle.enemies[0].damage);

  normal.battle.hand.push({ id: 'test-cleanse', cardId: 'warding_seal', upgraded: false });
  answerQuestion(normal, { correct: true });
  normal.battle.playerStatus.weakened = 2;
  playCard(normal, 'test-cleanse');
  assert.equal(normal.battle.playerStatus.weakened, 0);
  assert.ok(CARDS.find(c => c.id === 'warding_seal').description.includes('虚弱'));
});

test('self-damage bypasses armor and first-hit reduction but still allows revival', () => {
  const run = battleRun(301);
  run.battle.block = 20;
  run.relics.push('cinnabar_seal');
  run.hp = 2;
  answerQuestion(run, { correct: false });
  const card = run.battle.hand.find(x => x.cardId === 'piercing_line');
  if (!card) { run.battle.hand.push({ id: `c${run.nextCardId++}`, cardId: 'piercing_line', upgraded: false }); }
  const instance = run.battle.hand.find(x => x.cardId === 'piercing_line');
  run.battle.energy = 10;
  playCard(run, instance.id, 0);
  assert.equal(run.hp, 0, 'self-cost is paid in life and is not absorbed by armor');
  assert.equal(run.state, 'defeat');
  assert.equal(run.battle.block, 20, 'self-cost does not consume armor');
  assert.equal(run.battle.firstHitUsed, false, 'self-cost does not consume first-hit protection');

  const revived = battleRun(302);
  revived.hp = 1; revived.relics.push('phoenix_ash'); revived.battle.block = 12;
  answerQuestion(revived, { correct: false });
  revived.battle.energy = 10;
  revived.battle.hand.push({ id: `c${revived.nextCardId++}`, cardId: 'piercing_line', upgraded: false });
  playCard(revived, revived.battle.hand.at(-1).id, 0);
  assert.equal(revived.hp, 8);
  assert.equal(revived.state, 'battle');
  assert.equal(revived.battle.block, 12);
});

test('wrong answers still grant one energy, and player block decays between turns', () => {
  const run = battleRun(12);
  const initial = run.battle.energy;
  answerQuestion(run, { correct: false, questionId: 'q-wrong' });
  assert.equal(run.battle.energy, initial + 1);
  run.battle.block = 10;
  // Prevent the enemy attack from obscuring the block-decay assertion.
  run.battle.enemies[0].intent = { type: 'defend', damage: 0, label: '格挡' };
  endTurn(run);
  assert.equal(run.battle.block, 5);
  assert.equal(run.battle.phase, 'question');
});

test('enemy intent can defeat the player and settlement records a failed run once', () => {
  const run = battleRun(13);
  answerQuestion(run, { correct: false });
  run.battle.enemies[0].intent = { type: 'attack', damage: 999, label: '攻击' };
  endTurn(run);
  assert.equal(run.state, 'defeat');
  const profile = createProfile();
  settleRun(run, profile);
  settleRun(run, profile);
  assert.equal(profile.totalRuns, 1);
  assert.equal(profile.wins, 0);
  assert.ok(profile.xp > 0);
});

test('reward choice adds the selected card and unlocks the next route', () => {
  const run = battleRun(14);
  // A deterministic lethal play keeps this test focused on the reward/progression API.
  const enemy = run.battle.enemies[0]; enemy.hp = 1;
  run.battle.hand.push({ id: 'test-lethal', cardId: 'grand_thesis', upgraded: false });
  answerQuestion(run, { correct: true });
  playCard(run, 'test-lethal', 0);
  assert.equal(run.state, 'reward');
  const reward = run.rewardOptions.find(x => x.kind === 'card');
  const deckSize = run.deck.length;
  chooseReward(run, reward.id);
  assert.equal(run.deck.length, deckSize + 1);
  assert.equal(run.state, 'map');
  assert.ok(getAvailableNodes(run).length > 0);
});

test('shop purchases respect currency and add the purchased card', () => {
  const run = createRun({ seed: 15 });
  const shop = run.map.find(n => n.act === 1 && n.type === 'shop');
  shop.status = 'available';
  enterNode(run, shop.id);
  const item = run.shop.items.find(x => x.kind === 'card');
  const before = run.deck.length;
  run.gold = item.price - 1;
  buyItem(run, item.id);
  assert.equal(run.deck.length, before);
  run.gold = item.price;
  buyItem(run, item.id);
  assert.equal(run.deck.length, before + 1);
  assert.equal(run.gold, 0);
});

test('each of the three act bosses can be cleared and the tower awards victory', () => {
  const run = createRun({ seed: 16 });
  for (let act = 1; act <= 3; act++) {
    const boss = run.map.find(n => n.act === act && n.type === 'boss');
    boss.status = 'available';
    enterNode(run, boss.id);
    run.battle.enemies[0].hp = 1;
    run.battle.hand.push({ id: `boss-finisher-${act}`, cardId: 'grand_thesis', upgraded: false });
    answerQuestion(run, { correct: true });
    playCard(run, `boss-finisher-${act}`, 0);
    if (act < 3) {
      assert.equal(run.state, 'reward');
      chooseReward(run, 0);
      assert.equal(run.act, act + 1);
    }
  }
  assert.equal(run.state, 'victory');
  const profile = createProfile();
  const result = settleRun(run, profile);
  assert.equal(result.profile.wins, 1);
  assert.ok(run.achievements.includes('tower_clear'));
});

test('purchased healing potion can be used in battle or on the map exactly once', () => {
  const run = createRun({ seed: 21 });
  const shopNode = run.map.find(n => n.act === 1 && n.type === 'shop') || run.map.find(n => n.act === 1 && n.floor === 2);
  shopNode.type = 'shop'; shopNode.status = 'available';
  enterNode(run, shopNode.id);
  run.gold = 80;
  assert.ok(buyItem(run, 'potion:healing').potions.includes('healing'));
  assert.equal(run.shop.items.find(x => x.id === 'potion:healing').sold, true);
  run.hp = 30; run.potions.push('healing');
  const next = run.map.find(n => n.act === 1 && n.type === 'combat'); next.status = 'available';
  leaveNode(run);
  usePotion(run, 'healing');
  assert.equal(run.hp, 42);
  assert.equal(run.potions.length, 1);
  enterNode(run, next.id);
  assert.equal(run.battle.phase, 'question');
  run.hp = 40; usePotion(run, 'healing');
  assert.equal(run.hp, 52);
  assert.equal(run.potions.length, 0);
  usePotion(run, 'healing');
  assert.equal(run.hp, 52);
});

test('card instance ids remain unique after deck removal and later purchases', () => {
  const run = createRun({ seed: 22 });
  const shopNode = run.map.find(n => n.act === 1 && n.type === 'shop') || run.map.find(n => n.act === 1 && n.floor === 2);
  shopNode.type = 'shop'; shopNode.status = 'available'; enterNode(run, shopNode.id); run.gold = 500;
  const cards = run.shop.items.filter(x => x.kind === 'card');
  buyItem(run, cards[0].id);
  run.deck.splice(3, 1);
  buyItem(run, cards[1].id);
  const ids = run.deck.map(x => x.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(run.nextCardId, 13);
});

test('event choices enforce exact gold and health costs before applying rewards', () => {
  const run = createRun({ seed: 23 });
  const node = run.map.find(n => n.act === 1 && n.type === 'event') || run.map.find(n => n.act === 1 && n.floor === 2);
  node.type = 'event'; node.status = 'available'; enterNode(run, node.id);
  run.event = structuredClone(EVENTS.find(e => e.id === 'wandering_master'));
  run.gold = 29;
  assert.equal(canChooseEvent(run, 1), false);
  chooseEvent(run, 1);
  assert.equal(run.state, 'event');
  assert.equal(run.gold, 29);
  run.gold = 30;
  assert.equal(canChooseEvent(run, 1), true);
  chooseEvent(run, 1);
  assert.equal(run.gold, 0);
  assert.equal(run.state, 'map');
  assert.equal(run.relics.length, 2);
  const noUpgrade = createRun({ seed: 231 });
  const eventNode = noUpgrade.map.find(n => n.act === 1 && n.type === 'event') || noUpgrade.map.find(n => n.act === 1 && n.floor === 2);
  eventNode.type = 'event'; eventNode.status = 'available'; enterNode(noUpgrade, eventNode.id);
  noUpgrade.event = structuredClone(EVENTS.find(e => e.id === 'wandering_master'));
  noUpgrade.deck.forEach(card => { card.upgraded = true; }); noUpgrade.gold = 100;
  assert.equal(canChooseEvent(noUpgrade, 0), false, 'cannot pay for an upgrade choice when every card is already upgraded');
  assert.ok(EVENTS.length >= 7);
  assert.ok(EVENTS.flatMap(e => e.choices).every(c => c.cost && c.value));
});

test('profile rank uses accumulated XP and best combo keeps the historical maximum', () => {
  const run = createRun({ seed: 24 });
  run.state = 'victory'; run.act = 3; run.stats = { questions: 100, correct: 100, battles: 4, goldEarned: 100, bestCombo: 4 };
  const profile = createProfile(); profile.xp = 70; profile.stats.bestCombo = 8;
  settleRun(run, profile);
  assert.equal(profile.xp, 470);
  assert.equal(profile.level, Math.floor(Math.sqrt(470 / 80)) + 1);
  assert.equal(profile.stats.bestCombo, 8);
});

test('all added achievements have live triggers for answers, combo, burn, gold, relics, and upgrades', () => {
  assert.equal(ACHIEVEMENTS.length, 10);
  const run = battleRun(25);
  run.battle.enemies[0].hp = 10000;
  run.battle.enemies[0].pattern = ['defend'];
  run.battle.enemies[0].intent = { type: 'defend', damage: 0, label: '格挡' };
  for (let i = 0; i < 20; i++) {
    answerQuestion(run, { correct: true });
    if (run.state !== 'battle') break;
    run.battle.enemies[0].intent = { type: 'defend', damage: 0, label: '格挡' };
    endTurn(run);
  }
  assert.ok(run.achievements.includes('answers_20'));
  assert.ok(run.achievements.includes('combo_10'));

  const fastWin = battleRun(30); fastWin.gold = 299; fastWin.battle.enemies[0].hp = 1;
  answerQuestion(fastWin, { correct: true });
  assert.ok(fastWin.achievements.includes('deep_pockets'), 'the gold threshold is checked when battle rewards arrive');

  const burn = battleRun(26); burn.battle.enemies[0].hp = 1;
  selectStance(burn, 'guard'); answerQuestion(burn, { correct: true });
  burn.battle.enemies[0].status.burn = 1;
  endTurn(burn);
  assert.ok(burn.achievements.includes('burn_kill'));

  const collector = createRun({ seed: 27 });
  collector.relics = RELICS.slice(0, 9).map(r => r.id);
  collector.state = 'treasure'; collector.treasure = { relicId: RELICS[9].id, gold: 0 };
  openTreasure(collector);
  assert.ok(collector.achievements.includes('collector'));

  const polished = createRun({ seed: 28 });
  polished.state = 'rest'; polished.deck.slice(0, 4).forEach(c => { c.upgraded = true; });
  rest(polished, 'upgrade', polished.deck[4].id);
  assert.ok(polished.achievements.includes('polished_deck'));
});

test('exported card cost includes upgrade discounts and low-health free attack', () => {
  const run = createRun({ seed: 29 });
  assert.equal(getCardCost(run, { cardId: 'grand_thesis', upgraded: false }), 3);
  assert.equal(getCardCost(run, { cardId: 'grand_thesis', upgraded: true }), 2);
  assert.equal(getCardCost(run, { cardId: 'last_page', upgraded: false }), 1);
  run.hp = Math.floor(run.maxHp / 2);
  assert.equal(getCardCost(run, { cardId: 'last_page', upgraded: false }), 0);
});
