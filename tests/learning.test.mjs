import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLearningStats, filterLibraryQuestions, getQuestionModule, isQuestionNeedsReview } from '../src/learning.js';

const questions = [
  { id: 'a', stem: '甲题', module: '判断推理', category: '定义判断', topic: '主体要件', exam: '甲省行测', sourceUrl: 'https://example.test/a', usable: true },
  { id: 'b', stem: '乙题', module: '判断推理', category: '图形推理', topic: '空间重构', exam: '乙省行测', usable: true },
  { id: 'c', stem: '丙题材料关键词', module: '资料分析', category: '增长率', topic: '比重变化', material: '同比数据材料', usable: true },
  { id: 'd', stem: '丁题待核', module: '资料分析', category: '增长率', topic: '比重变化', usable: false, qualityFlags: ['答案待核'] },
];

test('library filters across modules, linked categories, full text, wrong answers, and review questions', () => {
  const learning = { a: { attempts: 2, correct: 1, lastCorrect: false }, b: { attempts: 1, correct: 1, lastCorrect: true } };
  assert.equal(getQuestionModule({ category: '资料分析-增长率' }), '资料分析');
  assert.equal(isQuestionNeedsReview(questions[3]), true);
  assert.deepEqual(filterLibraryQuestions(questions, learning, { module: '判断推理' }).map(q => q.id), ['a', 'b']);
  assert.deepEqual(filterLibraryQuestions(questions, learning, { module: '资料分析', category: '增长率' }).map(q => q.id), ['c']);
  assert.deepEqual(filterLibraryQuestions(questions, learning, { search: '同比数据材料' }).map(q => q.id), ['c']);
  assert.deepEqual(filterLibraryQuestions(questions, learning, { search: 'example.test/a' }).map(q => q.id), ['a']);
  assert.deepEqual(filterLibraryQuestions(questions, learning, { onlyWrong: true }).map(q => q.id), ['a']);
  assert.deepEqual(filterLibraryQuestions(questions, learning, { includeReview: true }).map(q => q.id), ['a', 'b', 'c', 'd']);
});

test('answer-level stats use weighted accuracy and calculate mean, median, totals, and distinct active days', () => {
  const log = [
    { id: '1', questionId: 'a', module: '判断推理', category: '定义判断', topic: '主体要件', correct: true, elapsed: 10, at: '2026-01-30T10:00:00Z', mode: 'practice' },
    { id: '2', questionId: 'a', module: '判断推理', category: '定义判断', topic: '主体要件', correct: false, elapsed: 20, at: '2026-01-30T11:00:00Z', mode: 'battle' },
    { id: '3', questionId: 'b', module: '判断推理', category: '图形推理', topic: '空间重构', correct: true, elapsed: 50, at: '2026-01-31T09:00:00Z', mode: 'practice' },
  ];
  const stats = buildLearningStats(log, questions, {}, { now: '2026-01-31T12:00:00Z', range: 'all' });
  assert.equal(stats.source, 'studyLog');
  assert.equal(stats.totals.attempts, 3);
  assert.equal(stats.totals.correct, 2);
  assert.ok(Math.abs(stats.totals.accuracy - 2 / 3) < 1e-12);
  assert.equal(stats.totals.avgSeconds, 80 / 3);
  assert.equal(stats.totals.medianSeconds, 20);
  assert.equal(stats.totals.totalSeconds, 80);
  assert.equal(stats.totals.timedAttempts, 3);
  assert.equal(stats.totals.activeDays, 2);
  assert.equal(stats.byModule[0].attempts, 3);
  assert.equal(stats.byCategory.length, 2);
  assert.equal(stats.weakTopics[0].label, '主体要件');
  assert.equal(stats.trend.find(day => day.date === '2026-01-30').avgSeconds, 15);
  assert.equal(stats.trend.find(day => day.date === '2026-01-30').medianSeconds, 15);
  assert.equal(stats.trend.find(day => day.date === '2026-01-30').timedAttempts, 2);
});

test('time and mode filters apply to log records without mixing filtered and unfiltered attempts', () => {
  const log = [
    { questionId: 'a', correct: false, elapsed: 60, at: '2026-01-24T15:59:00Z', mode: 'practice' },
    { questionId: 'a', correct: true, elapsed: 30, at: '2026-01-25T00:00:00Z', mode: 'battle' },
    { questionId: 'b', correct: true, elapsed: 20, at: '2026-01-31T11:00:00Z', mode: 'practice' },
  ];
  const filtered = buildLearningStats(log, questions, {}, { now: '2026-01-31T12:00:00Z', range: 7, mode: 'practice' });
  assert.equal(filtered.totals.attempts, 1);
  assert.equal(filtered.totals.correct, 1);
  assert.equal(filtered.totals.avgSeconds, 20);
  assert.equal(filtered.totals.activeDays, 1);
  assert.equal(filtered.trend.length, 7);
  assert.equal(filtered.trend.at(-1).attempts, 1);
});

test('same category label in different modules remains separate and module inference works', () => {
  const log = [
    { questionId: 'a', category: '同名题型', topic: '同名考点', correct: true, at: 1760000000000, elapsed: 12 },
    { questionId: 'c', category: '同名题型', topic: '同名考点', correct: false, at: 1760000001000, elapsed: 24 },
  ];
  const stats = buildLearningStats(log, questions, {}, { range: 'all' });
  assert.equal(stats.byCategory.length, 2);
  assert.deepEqual(stats.byCategory.map(x => x.module).sort(), ['判断推理', '资料分析']);
  assert.deepEqual(stats.byModule.map(x => x.label).sort(), ['判断推理', '资料分析']);
});

test('legacy learning records give cumulative accuracy without inventing speed, dates, modes, or trends', () => {
  const learning = {
    a: { attempts: 5, correct: 3, lastCorrect: false, lastTime: 1760000000000, elapsed: 9 },
    c: { attempts: 1, correct: 1, lastCorrect: true, lastTime: 1760000000000, elapsed: 18 },
  };
  const stats = buildLearningStats([], questions, learning, { range: 7, mode: 'battle', now: '2026-01-31T12:00:00Z' });
  assert.equal(stats.source, 'learning');
  assert.equal(stats.sourceLabel, '旧档累计概况');
  assert.equal(stats.totals.attempts, 6);
  assert.equal(stats.totals.correct, 4);
  assert.equal(stats.totals.accuracy, 4 / 6);
  assert.equal(stats.totals.avgSeconds, null);
  assert.equal(stats.totals.medianSeconds, null);
  assert.equal(stats.totals.activeDays, 0);
  assert.deepEqual(stats.trend, []);
});

test('empty study data returns zero-safe metrics', () => {
  const stats = buildLearningStats([], questions, {});
  assert.equal(stats.totals.attempts, 0);
  assert.equal(stats.totals.accuracy, null);
  assert.equal(stats.totals.avgSeconds, null);
  assert.equal(stats.totals.medianSeconds, null);
});

test('Hong Kong local-day boundaries govern range filters, active days, and trend buckets', () => {
  const log = [
    { questionId: 'a', correct: true, elapsed: 8, at: '2026-01-25T15:59:59Z', mode: 'practice' }, // Jan 25 23:59 HK, before the 7-day window
    { questionId: 'a', correct: false, elapsed: 12, at: '2026-01-25T16:00:00Z', mode: 'practice' }, // Jan 26 00:00 HK, included
    { questionId: 'b', correct: true, elapsed: 20, at: '2026-01-31T15:59:59Z', mode: 'practice' }, // Jan 31 23:59 HK
    { questionId: 'c', correct: true, elapsed: 30, at: '2026-01-31T16:00:00Z', mode: 'practice' }, // Feb 1 00:00 HK
  ];
  const stats = buildLearningStats(log, questions, {}, { now: '2026-01-31T17:00:00Z', range: 7 });
  assert.equal(stats.totals.attempts, 3, 'the cutoff is Hong Kong midnight, not UTC midnight');
  assert.equal(stats.totals.activeDays, 3);
  assert.equal(stats.trend[0].date, '2026-01-26');
  assert.equal(stats.trend.at(-1).date, '2026-02-01');
  assert.equal(stats.trend.at(-1).attempts, 1);
});

test('missing and boolean elapsed values are excluded while real zero-second times remain valid', () => {
  const log = [
    { questionId: 'a', correct: true, elapsed: null, at: '2026-02-01T02:00:00Z' },
    { questionId: 'a', correct: true, elapsed: undefined, at: '2026-02-01T03:00:00Z' },
    { questionId: 'a', correct: false, elapsed: '', at: '2026-02-01T04:00:00Z' },
    { questionId: 'a', correct: true, elapsed: false, at: '2026-02-01T05:00:00Z' },
    { questionId: 'a', correct: false, elapsed: 0, at: '2026-02-01T06:00:00Z' },
    { questionId: 'a', correct: true, elapsed: '12', at: '2026-02-01T07:00:00Z' },
  ];
  const stats = buildLearningStats(log, questions, {}, { now: '2026-02-01T10:00:00Z', range: 'all' });
  assert.equal(stats.totals.attempts, 6);
  assert.equal(stats.totals.timedAttempts, 2);
  assert.equal(stats.totals.totalSeconds, 12);
  assert.equal(stats.totals.avgSeconds, 6);
  assert.equal(stats.totals.medianSeconds, 6);
  const today = stats.trend.at(-1);
  assert.equal(today.date, '2026-02-01');
  assert.equal(today.timedAttempts, 2);
  assert.equal(today.avgSeconds, 6);
});

test('invalid answer outcomes never create active days or daily trends', () => {
  const stats = buildLearningStats([{ questionId: 'a', elapsed: 2, at: '2026-02-01T02:00:00Z' }], questions, {}, { now: '2026-02-01T10:00:00Z', range: 7 });
  assert.equal(stats.totals.attempts, 0);
  assert.equal(stats.totals.activeDays, 0);
  assert.equal(stats.trend.every(day => day.attempts === 0), true);
});
