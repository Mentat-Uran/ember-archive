#!/usr/bin/env node
// Reproducible importer for Mentat-Uran/kaogongzhentizhengliu question notes.
// Usage: node outputs/wanjuan/scripts/import-questions.mjs [source-vault] [output-dir]
// No third-party packages are required.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const workspace = path.resolve(scriptDir, '../../..');
const sourceRoot = path.resolve(process.argv[2] ?? (fs.existsSync(path.join(workspace, 'work/source-vault-safe')) ? path.join(workspace, 'work/source-vault-safe') : path.join(projectRoot, 'source-vault')));
const outputRoot = path.resolve(process.argv[3] ?? path.join(projectRoot, 'public'));
const dataRoot = path.join(outputRoot, 'data');
const imageRoot = path.join(outputRoot, 'question-images');
const repo = 'https://github.com/Mentat-Uran/kaogongzhentizhengliu';
// Keep per-question links stable at the content commit, even when later commits
// add the independent review ledger or update its documentation.
const questionContentCommit = '84ab93d4b64b61d897bece8a1c0a5bab06b4feb2';
const pinnedCommit = '84ab93d4b64b61d897bece8a1c0a5bab06b4feb2';
const sourceReviewCommit = (process.env.SOURCE_REVIEW_COMMIT ?? '').toLowerCase();
if (sourceReviewCommit && !/^[0-9a-f]{40}$/.test(sourceReviewCommit)) throw new Error('SOURCE_REVIEW_COMMIT must be a full 40-character Git commit SHA.');
const fullSourceIndexPath = fs.existsSync(path.join(projectRoot, 'public/data/source-index.json')) ? path.join(projectRoot, 'public/data/source-index.json') : path.join(workspace, 'work/all-question-paths.json');
const sourceIndex = fs.existsSync(fullSourceIndexPath) ? JSON.parse(fs.readFileSync(fullSourceIndexPath, 'utf8')) : [];
const sourceMetaByPath = new Map(sourceIndex.map((entry) => [entry.path, entry]));
const fullSourceMaterialIndexPath = fs.existsSync(path.join(projectRoot, 'public/data/source-material-index.json')) ? path.join(projectRoot, 'public/data/source-material-index.json') : path.join(workspace, 'work/source-material-index.json');
const sourceMaterialIndex = fs.existsSync(fullSourceMaterialIndexPath) ? JSON.parse(fs.readFileSync(fullSourceMaterialIndexPath, 'utf8')) : [];
const sourceMaterialMetaByPath = new Map(sourceMaterialIndex.map((entry) => [entry.path, entry]));
const missingSourceImages = new Set();

function recordMissingSourceImage(resolved, originalPath) {
  const relative = path.relative(sourceRoot, resolved).split(path.sep).join('/');
  missingSourceImages.add(relative.startsWith('../') ? originalPath : relative);
}

function listMarkdown(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...listMarkdown(p));
    else if (ent.isFile() && ent.name.toLowerCase().endsWith('.md')) out.push(p);
  }
  return out;
}

// The source vault appends a review record to each reviewed question note.
// Keep importing the original question content so its pinned blob hash remains
// reproducible and the appended editorial record does not become exam material.
const reviewRecordMarker = Buffer.from('<!-- CODEX-ANSWER-REVIEW:BEGIN -->');
function originalQuestionBytes(file) {
  const content = fs.readFileSync(file);
  const markerAt = content.lastIndexOf(reviewRecordMarker);
  if (markerAt < 0) return content;
  const prefix = content.subarray(0, markerAt);
  const separator = Buffer.from('\n\n');
  if (prefix.length < separator.length || !prefix.subarray(-separator.length).equals(separator)) {
    throw new Error(`Malformed appended review record: ${relSource(file)}`);
  }
  return prefix.subarray(0, prefix.length - separator.length);
}

function relSource(p) { return path.relative(sourceRoot, p).split(path.sep).join('/'); }
function parseFrontmatter(text) {
  const m = text.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/);
  const fields = {};
  if (!m) return { fields, body: text };
  for (const line of m[1].split(/\r?\n/)) {
    const x = line.match(/^([^:#][^:]*):\s*(.*)$/);
    if (x) fields[x[1].trim()] = x[2].trim().replace(/^(["'])(.*)\1$/, '$2');
  }
  return { fields, body: text.slice(m[0].length) };
}
function sections(text) {
  const out = new Map();
  let key = '';
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^#{1,6}\s+(.+?)\s*#*\s*$/);
    if (m) { key = m[1].trim(); if (!out.has(key)) out.set(key, []); }
    else if (key) out.get(key).push(line);
  }
  return new Map([...out].map(([k, v]) => [k, v.join('\n').trim()]));
}
function cleanScalar(s) { return (s ?? '').trim().replace(/^(["'])(.*)\1$/, '$2'); }
function optionRows(section) {
  const rows = new Map();
  for (const line of (section ?? '').split(/\r?\n/)) {
    const m = line.match(/^\s*(?:[-*+]\s*)?([A-Z])\s*[.、．:：)）]\s*(.*?)\s*$/);
    if (!m) continue;
    const letter = m[1];
    rows.set(letter, m[2].replace(/\s*✅\s*/g, '').trim());
  }
  return rows;
}
function answerEvidence(fileText, optionText, explanation) {
  const evidence = [];
  for (const m of optionText.matchAll(/^\s*(?:[-*+]\s*)?([A-D])\s*[.、．:：)）].*?✅/gm)) evidence.push(m[1]);
  const patterns = [
    /(?:正确答案|答案|故选|应选)\s*(?:为|是|：|:)?\s*[（(【\[]?([A-D])\s*[）)】\]]?/g,
    /选项\s*([A-D])\s*(?:符合|正确|当选)/g,
  ];
  for (const p of patterns) for (const m of explanation.matchAll(p)) evidence.push(m[1]);
  // Capture the answer when the source note records it outside the official explanation.
  for (const p of patterns) for (const m of fileText.matchAll(p)) evidence.push(m[1]);
  return [...new Set(evidence)];
}
function mdToMarkdown(s, sourceFile, usedImages, qualityFlags = new Set()) {
  let out = (s ?? '').trim();
  const replaceImg = (_whole, attrs) => {
    const srcMatch = attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
    if (!srcMatch) return '';
    const src = srcMatch[1].replaceAll('&amp;', '&');
    const resolved = path.resolve(path.dirname(sourceFile), src);
    const relativeToAssets = path.relative(path.join(sourceRoot, '90-图片'), resolved);
    if (relativeToAssets.startsWith('..') || path.isAbsolute(relativeToAssets) || !fs.existsSync(resolved) || fs.statSync(resolved).size === 0) {
      recordMissingSourceImage(resolved, src);
      qualityFlags.add('missing_source_image');
      return `【原图缺失：${path.basename(src)}】`;
    }
    const webPath = relativeToAssets.split(path.sep).join('/');
    const dest = path.join(imageRoot, ...webPath.split('/'));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (!fs.existsSync(dest)) fs.copyFileSync(resolved, dest);
    const url = `/question-images/${webPath}`;
    usedImages.add(url);
    const altMatch = attrs.match(/\balt\s*=\s*["']([^"']*)["']/i);
    return `![${altMatch?.[1] || (attrs.includes('flag="tex"') ? '公式' : '题目配图')}](${url})`;
  };
  out = out.replace(/<img\b([^>]*?)\/?\s*>/gi, replaceImg);
  out = out.replace(/<br\s*\/?\s*>/gi, '\n');
  out = out.replace(/<\/?(?:p|div|span|strong|em)\b[^>]*>/gi, '');
  out = out.replace(/&nbsp;/gi, ' ').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/&amp;/gi, '&');
  // Convert common Obsidian image embeds to ordinary Markdown and local public URLs.
  out = out.replace(/!\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g, (_m, target) => {
    const resolved = path.resolve(path.dirname(sourceFile), target.trim());
    const relativeToAssets = path.relative(path.join(sourceRoot, '90-图片'), resolved);
    if (relativeToAssets.startsWith('..') || !fs.existsSync(resolved) || fs.statSync(resolved).size === 0) { recordMissingSourceImage(resolved, target.trim()); qualityFlags.add('missing_source_image'); return `【原图缺失：${path.basename(target)}】`; }
    const webPath = relativeToAssets.split(path.sep).join('/');
    const dest = path.join(imageRoot, ...webPath.split('/'));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (!fs.existsSync(dest)) fs.copyFileSync(resolved, dest);
    const url = `/question-images/${webPath}`;
    usedImages.add(url);
    return `![题目配图](${url})`;
  });
  out = out.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (whole, alt, rawTarget) => {
    const target = rawTarget.trim().replace(/^<|>$/g, '');
    if (/^(?:https?:|data:|\/question-images\/)/i.test(target)) return whole;
    const resolved = path.resolve(path.dirname(sourceFile), decodeURI(target));
    const relativeToAssets = path.relative(path.join(sourceRoot, '90-图片'), resolved);
    if (relativeToAssets.startsWith('..') || path.isAbsolute(relativeToAssets) || !fs.existsSync(resolved) || fs.statSync(resolved).size === 0) { recordMissingSourceImage(resolved, target); qualityFlags.add('missing_source_image'); return `【原图缺失：${path.basename(target)}】`; }
    const webPath = relativeToAssets.split(path.sep).join('/');
    const dest = path.join(imageRoot, ...webPath.split('/'));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (!fs.existsSync(dest)) fs.copyFileSync(resolved, dest);
    const url = `/question-images/${webPath}`;
    usedImages.add(url);
    return `![${alt || '题目配图'}](${url})`;
  });
  return out.replace(/\n{3,}/g, '\n\n').trim();
}
function getCommit() {
  try { return execFileSync('git', ['-C', sourceRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { return process.env.SOURCE_COMMIT ?? pinnedCommit; }
}
function githubBlobUrl(commit, rel) {
  const encodedPath = rel.split('/').map(encodeURIComponent).join('/');
  return `${repo}/blob/${commit || 'main'}/${encodedPath}`;
}
function topicParts(value, sourcePath) {
  const pathParts = sourcePath.split('/');
  const module = pathParts[1] ?? '未知模块';
  const category = pathParts[2] ?? module;
  const t = cleanScalar(value);
  const topic = t.includes('/') ? t.slice(t.indexOf('/') + 1).trim() : t || category;
  return { module, category, topic };
}

function publishReviewImageLinks(record) {
  if (!record.sourcePath) return;
  const questionFile = path.resolve(sourceRoot, record.sourcePath);
  const imageSourceRoot = path.join(sourceRoot, '90-图片');
  const transform = (text) => {
    if (typeof text !== 'string') return text;
    return text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (whole, alt, rawTarget) => {
      const target = rawTarget.trim().replace(/^<|>$/g, '');
      if (/^(?:https?:|data:|\/question-images\/)/i.test(target)) return whole;
      const resolved = path.resolve(path.dirname(questionFile), decodeURI(target));
      const relative = path.relative(imageSourceRoot, resolved);
      if (relative.startsWith('..') || path.isAbsolute(relative) || !fs.existsSync(resolved) || fs.statSync(resolved).size === 0) {
        throw new Error(`Invalid review image for ${record.id}: ${target}`);
      }
      const webPath = relative.split(path.sep).join('/');
      const destination = path.join(imageRoot, ...webPath.split('/'));
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      if (!fs.existsSync(destination)) fs.copyFileSync(resolved, destination);
      return `![${alt}](/question-images/${webPath})`;
    });
  };
  for (const field of ['correctedStem', 'correctedMaterial', 'correctedExplanation']) {
    record[field] = transform(record[field]);
  }
  if (Array.isArray(record.correctedOptions)) record.correctedOptions = record.correctedOptions.map(transform);
}

function suspectIdsFromNotes() {
  const ids = new Set();
  const pathFile = path.join(sourceRoot, '30-疑点复核', '待补证题目.txt');
  if (!fs.existsSync(pathFile)) return ids;
  for (const line of fs.readFileSync(pathFile, 'utf8').split(/\r?\n/)) {
    const id = line.trim();
    if (/^\d{4,}$/.test(id)) ids.add(id);
  }
  return ids;
}

if (!fs.existsSync(sourceRoot)) throw new Error(`Source vault not found: ${sourceRoot}`);
const sourceFiles = listMarkdown(path.join(sourceRoot, '10-真题'));
if (sourceFiles.length !== 11282) throw new Error(`Expected all 11282 source question notes; found ${sourceFiles.length}. Refusing to overwrite output.`);
if (sourceIndex.length !== 11282) throw new Error(`Expected pinned source index of 11282 paths; found ${sourceIndex.length}. Refusing to overwrite output.`);
const sourceMaterialFiles = listMarkdown(path.join(sourceRoot, '15-材料'));
if (sourceMaterialFiles.length !== 717) throw new Error(`Expected all 717 source material notes; found ${sourceMaterialFiles.length}. Refusing to overwrite output.`);
if (sourceMaterialIndex.length !== 717) throw new Error(`Expected pinned source material index of 717 paths; found ${sourceMaterialIndex.length}. Refusing to overwrite output.`);
const indexedPaths = new Set(sourceIndex.map((entry) => entry.path));
const unindexedFiles = sourceFiles.map(relSource).filter((rel) => !indexedPaths.has(rel));
if (unindexedFiles.length) throw new Error(`Source index is missing ${unindexedFiles.length} fetched question paths. Refusing to overwrite output.`);
const indexedMaterialPaths = new Set(sourceMaterialIndex.map((entry) => entry.path));
const unindexedMaterials = sourceMaterialFiles.map(relSource).filter((rel) => !indexedMaterialPaths.has(rel));
if (unindexedMaterials.length) throw new Error(`Source material index is missing ${unindexedMaterials.length} paths. Refusing to overwrite output.`);
for (const file of sourceFiles) {
  const bytes = originalQuestionBytes(file), meta = sourceMetaByPath.get(relSource(file));
  const sha = crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
  if (meta?.size !== bytes.length || meta?.sha !== sha) throw new Error(`Source differs from pinned Git blob: ${relSource(file)}. Refusing to overwrite output.`);
}
for (const file of sourceMaterialFiles) {
  const bytes = fs.readFileSync(file), meta = sourceMaterialMetaByPath.get(relSource(file));
  const sha = crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
  if (meta?.size !== bytes.length || meta?.sha !== sha) throw new Error(`Source material differs from pinned Git blob: ${relSource(file)}. Refusing to overwrite output.`);
}
const commit = getCommit();
if (!commit) throw new Error('Cannot resolve source Git commit; refusing to create non-pinned source links.');
if (sourceReviewCommit && sourceReviewCommit !== commit) throw new Error(`SOURCE_REVIEW_COMMIT must match source checkout HEAD (${commit}).`);
if (commit !== pinnedCommit && sourceReviewCommit !== commit) throw new Error(`Check out pinned source commit ${pinnedCommit}, or set SOURCE_REVIEW_COMMIT to the exact review checkout HEAD.`);
if (sourceReviewCommit) {
  const dirty = execFileSync('git', ['-C', sourceRoot, 'status', '--porcelain', '--untracked-files=all'], { encoding: 'utf8' });
  if (dirty.trim()) throw new Error('Review imports require a clean source checkout so SOURCE_REVIEW_COMMIT identifies the imported ledger and notes.');
}
const suspectIds = suspectIdsFromNotes();
const reviewPath = path.join(sourceRoot, '31-复核记录', '复核记录.jsonl');
const reviewRecords = fs.existsSync(reviewPath)
  ? fs.readFileSync(reviewPath, 'utf8').split(/\r?\n/).filter((line) => line.trim()).map((line) => JSON.parse(line))
  : [];
const reviewsById = new Map();
for (const record of reviewRecords) {
  const id = String(record.id ?? '');
  if (!/^\d{4,}$/.test(id)) throw new Error(`Invalid review record ID: ${id || '(empty)'}`);
  if (reviewsById.has(id)) throw new Error(`Duplicate review record ID: ${id}`);
  reviewsById.set(id, record);
}
const questions = [];
const excluded = { missing_id: 0, missing_stem: 0, fewer_than_four_options: 0, ambiguous_or_missing_answer: 0, explicitly_flagged_suspect: 0, missing_explanation: 0, errors: 0 };
const moduleCounts = {};

const qualityFlagCounts = {};
const categoryCounts = {};
const yearCounts = {};
for (const file of sourceFiles) {
  try {
    const original = originalQuestionBytes(file).toString('utf8');
    const { fields, body } = parseFrontmatter(original);
    const rel = relSource(file);
    const qid = cleanScalar(fields.qid) || path.basename(file).match(/^\d+/)?.[0] || rel;
    const sourceMeta = sourceMetaByPath.get(rel);
    const parts = topicParts(fields.考点, rel);
    const flags = new Set();
    if (!cleanScalar(fields.qid)) flags.add('missing_id');
    if (suspectIds.has(qid)) flags.add('explicitly_flagged_suspect');
    const sec = sections(body);
    const stemSource = sec.get('题干') ?? '';
    if (!stemSource.trim()) flags.add('missing_stem');
    const optionSource = sec.get('选项') ?? '';
    const rows = optionRows(optionSource);
    if (['A', 'B', 'C', 'D'].some((k) => !rows.has(k)) || rows.size !== 4) flags.add('options_not_exactly_four');
    if ([...rows.values()].some((value) => !value.trim())) flags.add('empty_option_text');
    if (!sourceMeta?.sha || !Number.isFinite(sourceMeta?.size)) flags.add('source_metadata_missing');
    const explanationSource = sec.get('官方解析') ?? '';
    if (!explanationSource.trim()) flags.add('missing_explanation');
    const evidence = answerEvidence(original, optionSource, explanationSource);
    if (evidence.length === 0) flags.add('missing_answer_evidence');
    if (evidence.length > 1) flags.add('conflicting_answer_evidence');
    const answer = evidence.length === 1 ? 'ABCD'.indexOf(evidence[0]) : -1;
    if (answer < 0) flags.add('answer_not_scored');
    const usedImages = new Set();
    const stem = mdToMarkdown(stemSource, file, usedImages, flags);
    const optionLetters = [...rows.keys()].sort();
    const options = optionLetters.map((k) => mdToMarkdown(`${['A', 'B', 'C', 'D'].some((x) => x !== k && rows.has(x)) && !['A', 'B', 'C', 'D'].every((x) => rows.has(x)) ? `${k}. ` : ''}${rows.get(k)}`, file, usedImages, flags));
    const explanation = mdToMarkdown(explanationSource, file, usedImages, flags);
    const analysis = {};
    for (const key of ['推理链', '最快解法', '易错点', '母题抽象']) {
      const content = sec.get(key);
      if (content?.trim()) analysis[key] = mdToMarkdown(content, file, usedImages, flags);
    }
    const materialLink = body.match(/材料：\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/);
    const materialTarget = materialLink?.[1] ?? '';
    const materialPath = materialTarget
      ? path.resolve(sourceRoot, `${materialTarget}.md`)
      : null;
    let materialSourceMeta = null;
    let materialSourcePath = '';
    let material = sec.get('给定材料') ?? '';
    if (materialTarget && (!materialPath || !fs.existsSync(materialPath))) {
      throw new Error(`Linked source material is missing: ${materialTarget}`);
    }
    if (materialTarget) {
      materialSourcePath = relSource(materialPath);
      materialSourceMeta = sourceMaterialMetaByPath.get(materialSourcePath);
      if (!materialSourceMeta) throw new Error(`Linked source material is absent from the pinned index: ${materialSourcePath}`);
    }
    if (!material.trim() && materialPath && fs.existsSync(materialPath)) {
      const mtext = fs.readFileSync(materialPath, 'utf8');
      const { body: mb } = parseFrontmatter(mtext);
      material = sections(mb).get('材料正文') ?? sections(mb).get('材料') ?? mb.replace(/^#.*(?:\r?\n|$)/, '').trim();
      material = mdToMarkdown(material, materialPath, usedImages, flags);
    } else if (material) material = mdToMarkdown(material, file, usedImages, flags);
    else material = '';
    const noMaterial = material.match(/^\s*[（(]\s*无(?:材料)?\s*[）)]\s*(?:\r?\n|$)([\s\S]*)$/) || material.match(/^\s*无(?:材料)?\s*(?:\r?\n|$)([\s\S]*)$/);
    if (noMaterial) {
      material = '';
      if (noMaterial[1]?.trim()) analysis['材料区附注'] = mdToMarkdown(noMaterial[1], file, usedImages, flags);
    }
    const imageList = [...usedImages];
    const question = {
      id: qid,
      stem,
      options,
      answer: answer >= 0 ? answer : null,
      explanation,
      ...(Object.keys(analysis).length ? { analysis } : {}),
      category: parts.category,
      module: parts.module,
      topic: parts.topic,
      year: cleanScalar(fields.年份),
      exam: cleanScalar(fields.试卷),
      material,
      sourcePath: rel,
      sourceUrl: githubBlobUrl(questionContentCommit, rel),
      sourceId: qid,
      ...(sourceMeta ? { sourceSha: sourceMeta.sha, sourceSize: sourceMeta.size } : {}),
      ...(materialSourceMeta ? { materialSourcePath, materialSourceSha: materialSourceMeta.sha, materialSourceSize: materialSourceMeta.size, materialSourceUrl: githubBlobUrl(questionContentCommit, materialSourcePath) } : {}),
      qualityFlags: [...flags],
      usable: flags.size === 0,
      ...(imageList.length ? { images: imageList } : {}),
    };
    questions.push(question);
    moduleCounts[parts.module] = (moduleCounts[parts.module] ?? 0) + 1;
    categoryCounts[parts.category] = (categoryCounts[parts.category] ?? 0) + 1;
    yearCounts[question.year || 'unknown'] = (yearCounts[question.year || 'unknown'] ?? 0) + 1;
    for (const flag of flags) qualityFlagCounts[flag] = (qualityFlagCounts[flag] ?? 0) + 1;
  } catch (error) {
    excluded.errors++;
    console.error(`Import error ${relSource(file)}: ${error.message}`);
  }
}

if (excluded.errors || questions.length !== 11282) throw new Error(`Refusing to publish incomplete import: ${questions.length}/11282 questions, ${excluded.errors} import errors.`);

questions.sort((a, b) => a.module.localeCompare(b.module, 'zh') || a.category.localeCompare(b.category, 'zh') || a.id.localeCompare(b.id, 'en'));
const idCounts = new Map();
for (const q of questions) idCounts.set(q.sourceId, (idCounts.get(q.sourceId) ?? 0) + 1);
const usedIds = new Set();
for (const q of questions) {
  if (idCounts.get(q.sourceId) > 1) q.id = `${q.sourceId}-${q.sourceSha?.slice(0, 8) ?? crypto.createHash('sha1').update(q.sourcePath).digest('hex').slice(0, 8)}`;
  if (usedIds.has(q.id)) q.id = `${q.sourceId}-${crypto.createHash('sha1').update(q.sourcePath).digest('hex').slice(0, 10)}`;
  usedIds.add(q.id);
}
const questionIds = new Set(questions.map((q) => q.sourceId));
const unknownReviewIds = [...reviewsById.keys()].filter((id) => !questionIds.has(id));
if (unknownReviewIds.length) throw new Error(`Review ledger contains ${unknownReviewIds.length} IDs absent from imported source questions: ${unknownReviewIds.slice(0, 10).join(', ')}`);
const effectiveQuestions = questions.map((q) => {
  const review = reviewsById.get(q.sourceId);
  if (!review) return q;
  const flags = new Set(q.qualityFlags ?? []);
  for (const flag of review.clearQualityFlags ?? []) flags.delete(flag);
  for (const flag of review.qualityFlags ?? []) flags.add(flag);
  const reviewedAnswer = typeof review.answer === 'string' ? 'ABCD'.indexOf(review.answer) : null;
  const answer = reviewedAnswer >= 0 ? reviewedAnswer : (review.answer === null ? null : q.answer);
  return {
    ...q,
    answer,
    module: review.correctedModule || q.module,
    category: review.correctedCategory || q.category,
    topic: review.correctedTopic || q.topic,
    year: review.correctedYear || q.year,
    exam: review.correctedExam || q.exam,
    usable: review.usable === true && flags.size === 0,
    qualityFlags: [...flags],
  };
});
const effectiveModuleCounts = {};
const effectiveCategoryCounts = {};
for (const q of effectiveQuestions) {
  effectiveModuleCounts[q.module] = (effectiveModuleCounts[q.module] ?? 0) + 1;
  effectiveCategoryCounts[q.category] = (effectiveCategoryCounts[q.category] ?? 0) + 1;
}
fs.mkdirSync(dataRoot, { recursive: true });
fs.mkdirSync(imageRoot, { recursive: true });
for (const record of reviewRecords) publishReviewImageLinks(record);
const questionFiles = [];
const chunkSize = 700;
for (let i = 0; i < questions.length; i += chunkSize) {
  const name = `questions-${String(Math.floor(i / chunkSize) + 1).padStart(3, '0')}.json`;
  questionFiles.push(`/data/${name}`);
  fs.writeFileSync(path.join(dataRoot, name), `${JSON.stringify(questions.slice(i, i + chunkSize))}\n`, 'utf8');
}
fs.writeFileSync(path.join(dataRoot, 'questions.json'), `${JSON.stringify({ files: questionFiles, total: questions.length })}\n`, 'utf8');
fs.writeFileSync(path.join(dataRoot, 'source-index.json'), `${JSON.stringify(sourceIndex, null, 2)}\n`, 'utf8');
fs.writeFileSync(path.join(dataRoot, 'source-material-index.json'), `${JSON.stringify(sourceMaterialIndex, null, 2)}\n`, 'utf8');
const answerReviewFile = '/data/answer-reviews.json';
fs.writeFileSync(path.join(dataRoot, 'answer-reviews.json'), `${JSON.stringify(reviewRecords)}\n`, 'utf8');
const effectiveQualityFlagCounts = {};
for (const q of effectiveQuestions) for (const flag of q.qualityFlags ?? []) effectiveQualityFlagCounts[flag] = (effectiveQualityFlagCounts[flag] ?? 0) + 1;
const reviewStatusCounts = {};
for (const review of reviewRecords) reviewStatusCounts[review.status] = (reviewStatusCounts[review.status] ?? 0) + 1;
const manifest = {
  generatedAt: new Date().toISOString(),
  sourceRepository: repo,
  sourceCommit: commit,
  questionContentCommit,
  ...(sourceReviewCommit ? { sourceReviewCommit } : {}),
  sourceLicense: {
    annotations: 'CC BY-NC 4.0 (as declared in the upstream README)',
    examContentAndImages: 'Upstream states copyright belongs to original exam institutions and platforms; no separate redistribution permission is asserted here.',
    licenseFile: githubBlobUrl(commit, 'LICENSE'),
  },
  counts: { total: questions.length, usable: effectiveQuestions.filter((q) => q.usable).length, reviewRequired: effectiveQuestions.filter((q) => !q.usable).length, reviewed: reviewRecords.length, reviewStatusCounts, modules: effectiveModuleCounts, categories: effectiveCategoryCounts, years: yearCounts, sourceQuestionFiles: sourceFiles.length, expectedSourceQuestionFiles: 11282, sourceMaterialFiles: sourceMaterialFiles.length, expectedSourceMaterialFiles: 717, questionsWithLinkedMaterial: questions.filter((q) => q.materialSourcePath).length },
  questionFiles,
  answerReviewFile,
  sourceCoverage: { expected: 11282, imported: sourceFiles.length, complete: sourceFiles.length === 11282 },
  sourceMaterialCoverage: { expected: 717, imported: sourceMaterialFiles.length, complete: sourceMaterialFiles.length === 717, linkedQuestions: questions.filter((q) => q.materialSourcePath).length },
  sourceImagesMissing: [...missingSourceImages].sort(),
  qualityFlags: effectiveQualityFlagCounts,
  legacyImporterErrors: excluded.errors,
  importer: 'scripts/import-questions.mjs',
};
fs.writeFileSync(path.join(dataRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ total: effectiveQuestions.length, usable: effectiveQuestions.filter((q) => q.usable).length, reviewRequired: effectiveQuestions.filter((q) => !q.usable).length, reviewed: reviewRecords.length, reviewStatusCounts, modules: effectiveModuleCounts, categories: effectiveCategoryCounts, sourceQuestionFiles: sourceFiles.length, questionFiles: questionFiles.length, legacyImporterErrors: excluded.errors, commit }, null, 2));
