export const ALL = '全部';

export function getQuestionModule(question = {}) {
  const raw = question.module || question.subject || question.category || question.topic || '';
  if (/资料分析|data.?analysis|quant/i.test(raw)) return '资料分析';
  if (/判断推理|reasoning|judg/i.test(raw)) return '判断推理';
  if (!question.module && !question.subject && /定义判断|图形推理|类比推理|逻辑判断|判断推理/.test(raw)) return '判断推理';
  return raw || '未分类';
}

export function getQuestionCategory(question = {}) {
  return question.category || question.questionType || '未分类';
}

export function isQuestionNeedsReview(question = {}) {
  return question.usable === false || (Array.isArray(question.qualityFlags) && question.qualityFlags.length > 0);
}

function asDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}
const hongKongDateFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Hong_Kong', year: 'numeric', month: '2-digit', day: '2-digit',
});
function dayKey(value) {
  const date = asDate(value);
  if (!date) return null;
  const parts = Object.fromEntries(hongKongDateFormatter.formatToParts(date).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
function finiteTime(value) {
  if (value == null || (typeof value === 'string' && value.trim() === '') || typeof value === 'boolean') return false;
  return Number.isFinite(Number(value)) && Number(value) >= 0;
}
function hongKongDayStart(value) {
  const key = dayKey(value);
  return key ? new Date(`${key}T00:00:00+08:00`) : null;
}
function addDays(key, amount) {
  const date = new Date(`${key}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}
function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
function blankGroup(key, label, meta = {}) {
  return { key, label, ...meta, attempts: 0, correct: 0, accuracy: null, avgSeconds: null, medianSeconds: null, totalSeconds: 0, timedAttempts: 0 };
}
function finishGroup(group) {
  group.accuracy = group.attempts ? group.correct / group.attempts : null;
  group.avgSeconds = group.timedAttempts ? group.totalSeconds / group.timedAttempts : null;
  group.medianSeconds = median(group._times || []);
  delete group._times;
  return group;
}
function addAttempt(group, correct, elapsed) {
  group.attempts++;
  if (correct) group.correct++;
  if (finiteTime(elapsed)) {
    const seconds = Number(elapsed);
    group.totalSeconds += seconds;
    group.timedAttempts++;
    (group._times ||= []).push(seconds);
  }
}
function sortGroups(groups) {
  return [...groups.values()].map(finishGroup).sort((a, b) => b.attempts - a.attempts || a.label.localeCompare(b.label, 'zh-CN'));
}

/**
 * Aggregate answer-level studyLog records. If no usable log is available,
 * reconstruct cumulative question totals from legacy learning records without
 * inventing dates, modes, or per-attempt speed values.
 */
export function buildLearningStats(studyLog, questions = [], learning = {}, filters = {}) {
  const now = asDate(filters.now) || new Date();
  const range = ['7', '30', 7, 30].includes(filters.range) ? Number(filters.range) : 'all';
  const mode = filters.mode || 'all';
  const questionById = new Map(questions.map(question => [String(question.id), question]));
  const sourceLogs = Array.isArray(studyLog) ? studyLog : [];
  const hasStudyLog = sourceLogs.length > 0;
  const selectedLogs = hasStudyLog ? sourceLogs.filter(entry => {
    if (mode !== 'all' && entry.mode !== mode) return false;
    if (range === 'all') return true;
    const date = asDate(entry.at);
    if (!date) return false;
    const cutoff = hongKongDayStart(now);
    cutoff.setUTCDate(cutoff.getUTCDate() - (range - 1));
    return date >= cutoff && date <= now;
  }) : [];
  const modules = new Map(), categories = new Map(), topics = new Map();
  const timed = [];
  const days = new Map();
  let attempts = 0, correct = 0, totalSeconds = 0;
  const countEntry = (entry, question, aggregate = false) => {
    const moduleName = entry.module || getQuestionModule(question || {});
    const categoryName = entry.category || getQuestionCategory(question || {});
    const topicName = entry.topic || question?.topic || '未分类';
    const groups = [
      [modules, moduleName, moduleName],
      [categories, `${moduleName}\u0000${categoryName}`, categoryName, { module: moduleName }],
      [topics, `${moduleName}\u0000${topicName}`, topicName, { module: moduleName }],
    ];
    const n = aggregate ? Math.max(0, Number(entry.attempts) || 0) : 1;
    const c = aggregate ? Math.min(n, Math.max(0, Number(entry.correct) || 0)) : (entry.correct === true ? 1 : 0);
    attempts += n; correct += c;
    for (const [map, key, label, meta] of groups) {
      if (!map.has(key)) map.set(key, blankGroup(key, label, meta));
      const group = map.get(key);
      group.attempts += n; group.correct += c;
      if (!aggregate && finiteTime(entry.elapsed)) {
        const seconds = Number(entry.elapsed);
        group.totalSeconds += seconds; group.timedAttempts++; (group._times ||= []).push(seconds);
      }
    }
    if (!aggregate && finiteTime(entry.elapsed)) { timed.push(Number(entry.elapsed)); totalSeconds += Number(entry.elapsed); }
    if (!aggregate) {
      const key = dayKey(entry.at);
      if (key) {
        const day = days.get(key) || { date: key, attempts: 0, correct: 0, times: [] };
        day.attempts++; if (entry.correct === true) day.correct++;
        if (finiteTime(entry.elapsed)) day.times.push(Number(entry.elapsed));
        days.set(key, day);
      }
    }
  };

  if (hasStudyLog) {
    for (const entry of selectedLogs) {
      if (typeof entry.correct !== 'boolean') continue;
      countEntry(entry, questionById.get(String(entry.questionId)) || null);
    }
  } else {
    for (const [id, record] of Object.entries(learning || {})) {
      const n = Math.max(0, Math.floor(Number(record?.attempts) || 0));
      if (!n) continue;
      countEntry({ attempts: n, correct: record.correct }, questionById.get(String(id)), true);
    }
  }

  const completedGroups = map => sortGroups(map);
  const byModule = completedGroups(modules);
  const byCategory = completedGroups(categories);
  const allTopics = completedGroups(topics);
  const weakTopics = allTopics.filter(topic => topic.attempts >= 2 && topic.accuracy != null)
    .sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts).slice(0, 8);
  const activeDays = hasStudyLog ? days.size : 0;
  const trendDays = [];
  if (hasStudyLog) {
    const trendLength = range === 'all' ? 30 : range;
    const startKey = addDays(dayKey(now), -trendLength + 1);
    for (let i = 0; i < trendLength; i++) {
      const key = addDays(startKey, i);
      const item = days.get(key) || { date: key, attempts: 0, correct: 0, times: [] };
      trendDays.push({ date: key, attempts: item.attempts, correct: item.correct,
        accuracy: item.attempts ? item.correct / item.attempts : null,
        timedAttempts: item.times.length, totalSeconds: item.times.reduce((sum, seconds) => sum + seconds, 0),
        avgSeconds: item.times.length ? item.times.reduce((sum, seconds) => sum + seconds, 0) / item.times.length : null,
        medianSeconds: median(item.times) });
    }
  }
  const timedAttempts = hasStudyLog ? timed.length : 0;
  return {
    source: hasStudyLog ? 'studyLog' : 'learning',
    sourceLabel: hasStudyLog ? '完整学习记录' : '旧档累计概况',
    range: hasStudyLog ? range : 'all', mode: hasStudyLog ? mode : 'all',
    totals: {
      attempts, correct, accuracy: attempts ? correct / attempts : null,
      avgSeconds: timedAttempts ? totalSeconds / timedAttempts : null,
      medianSeconds: hasStudyLog ? median(timed) : null,
      totalSeconds, timedAttempts, activeDays,
    },
    byModule, byCategory, weakTopics,
    trend: trendDays,
    trendWindow: hasStudyLog ? (range === 'all' ? 30 : range) : null,
  };
}

export function filterLibraryQuestions(questions, learning, filters = {}) {
  const moduleName = filters.module || ALL;
  const category = filters.category || ALL;
  const search = String(filters.search || '').trim().toLocaleLowerCase();
  const topicSearch = String(filters.topic || '').trim().toLocaleLowerCase();
  return questions.filter(question => {
    if (!filters.includeReview && isQuestionNeedsReview(question)) return false;
    if (moduleName !== ALL && getQuestionModule(question) !== moduleName) return false;
    if (category !== ALL && getQuestionCategory(question) !== category) return false;
    const record = learning?.[question.id];
    if (filters.onlyWrong && !(record?.attempts > 0 && record.lastCorrect === false)) return false;
    if (topicSearch && !String(question.topic || '').toLocaleLowerCase().includes(topicSearch)) return false;
    if (search) {
      const haystack = [question.stem, question.material, question.explanation, question.exam, question.year, question.sourceUrl, question.topic, ...Object.values(question.analysis || {})].filter(Boolean).join(' ').toLocaleLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
}
