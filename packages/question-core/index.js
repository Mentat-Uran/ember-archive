/**
 * Shared question normalization and scoring rules for Ember Archive clients.
 * Keep this module dependency-free so both Vite and Node can import it.
 */

export const ANSWER_LETTERS = Object.freeze(['A', 'B', 'C', 'D']);

/** Apply the review ledger to source questions using the browser's canonical rules. */
export function applyQuestionReviews(questions, records) {
  const byId = new Map((records || []).map(record => [String(record.id), record]));
  return questions.map(question => {
    const review = byId.get(String(question.sourceId ?? question.id));
    if (!review) return question;

    const flags = new Set(question.qualityFlags || []);
    for (const flag of review.clearQualityFlags || []) flags.delete(flag);
    for (const flag of review.qualityFlags || []) flags.add(flag);

    const acceptedAnswers = Array.isArray(review.acceptedAnswers)
      ? [...new Set(review.acceptedAnswers
        .filter(answer => ANSWER_LETTERS.includes(answer))
        .map(answer => ANSWER_LETTERS.indexOf(answer)))]
      : [];
    const answer = review.answer === null
      ? null
      : typeof review.answer === 'string' && ANSWER_LETTERS.includes(review.answer)
        ? ANSWER_LETTERS.indexOf(review.answer)
        : question.answer;
    const options = Array.isArray(review.correctedOptions)
      && review.correctedOptions.length >= 2 && review.correctedOptions.length <= 4
      ? review.correctedOptions
      : question.options;
    const stem = typeof review.correctedStem === 'string' ? review.correctedStem : question.stem;
    const material = typeof review.correctedMaterial === 'string'
      ? review.correctedMaterial
      : question.material;

    return {
      ...question,
      answer,
      ...(acceptedAnswers.length > 1 ? {correctAnswers: acceptedAnswers} : {}),
      stem,
      options,
      material,
      category: review.correctedCategory || question.category,
      module: review.correctedModule || question.module,
      topic: review.correctedTopic || question.topic,
      year: review.correctedYear || question.year,
      exam: review.correctedExam || question.exam,
      qualityFlags: [...flags],
      usable: review.usable === true && flags.size === 0,
      review,
    };
  });
}

export function answerIndices(question) {
  if (Array.isArray(question?.correctAnswers) && question.correctAnswers.length) {
    return question.correctAnswers;
  }
  return Number.isInteger(question?.answer) ? [question.answer] : [];
}

export const hasScorableAnswer = question => answerIndices(question).length > 0;

export const answerLabel = question => answerIndices(question)
  .map(index => ANSWER_LETTERS[index])
  .filter(Boolean)
  .join('、') || '无唯一标准答案';

export const selectedLabel = selected => (Array.isArray(selected) ? selected : [selected])
  .filter(Number.isInteger)
  .map(index => ANSWER_LETTERS[index])
  .filter(Boolean)
  .join('、');

export function answerMatches(question, selected) {
  const expected = answerIndices(question);
  const actual = [...new Set(Array.isArray(selected) ? selected : [selected])]
    .filter(Number.isInteger);
  return expected.length > 0
    && actual.length === expected.length
    && expected.every(index => actual.includes(index));
}

/**
 * Shared gate for questions presented for scored play. By default multi-answer
 * items are accepted; clients such as the STS2 mod can require one answer.
 */
export function isEligibleQuestion(question, {singleAnswerOnly = false} = {}) {
  if (!question || question.usable === false) return false;
  if (!Array.isArray(question.options)
    || question.options.length < 2
    || question.options.length > 4
    || !question.options.every(option => typeof option === 'string')) return false;

  const answers = answerIndices(question);
  return answers.length > 0
    && (!singleAnswerOnly || answers.length === 1)
    && answers.every(index => Number.isInteger(index)
      && index >= 0 && index < question.options.length);
}
