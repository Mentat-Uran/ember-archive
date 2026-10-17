import React, { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, BookOpen, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Compass, ExternalLink, Filter, Flame, Layers3, RotateCcw, Search, Target, Timer, X } from 'lucide-react';
import { ALL, buildLearningStats, filterLibraryQuestions, getQuestionCategory, getQuestionModule, isQuestionNeedsReview } from './learning.js';
import './learning.css';

const PAGE_SIZE = 50;
const MODULES = ['判断推理', '资料分析'];
const nf = new Intl.NumberFormat('zh-CN');
const pct = value => value == null ? '—' : `${Math.round(value * 100)}%`;
const duration = seconds => {
  if (!Number.isFinite(seconds)) return '—';
  const value = Math.max(0, Math.round(seconds));
  return value < 60 ? `${value}秒` : `${Math.floor(value / 60)}分${String(value % 60).padStart(2, '0')}秒`;
};

export function LibraryView({ questions = [], learning = {}, onPractice = () => {}, onSource = () => {}, initialOnlyWrong = false }) {
  const [module, setModule] = useState(ALL);
  const [category, setCategory] = useState(ALL);
  const [search, setSearch] = useState('');
  const [topic, setTopic] = useState('');
  const [onlyWrong, setOnlyWrong] = useState(initialOnlyWrong);
  const [includeReview, setIncludeReview] = useState(false);
  const [page, setPage] = useState(0);
  const modules = useMemo(() => [...new Set([...MODULES, ...questions.map(getQuestionModule)])].filter(x => x !== '未分类').sort((a, b) => MODULES.indexOf(a) - MODULES.indexOf(b) || a.localeCompare(b, 'zh-CN')), [questions]);
  const categoryOptions = useMemo(() => [...new Set(questions.filter(q => module === ALL || getQuestionModule(q) === module).map(getQuestionCategory))].sort((a, b) => a.localeCompare(b, 'zh-CN')), [questions, module]);
  const filtered = useMemo(() => filterLibraryQuestions(questions, learning, { module, category, search, topic, onlyWrong, includeReview }), [questions, learning, module, category, search, topic, onlyWrong, includeReview]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageQuestions = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const wrongCount = useMemo(() => Object.values(learning).filter(x => x?.attempts > 0 && x.lastCorrect === false).length, [learning]);
  const reviewCount = useMemo(() => questions.filter(isQuestionNeedsReview).length, [questions]);
  useEffect(() => { setCategory(ALL); setPage(0); }, [module]);
  useEffect(() => { setOnlyWrong(initialOnlyWrong); }, [initialOnlyWrong]);
  useEffect(() => { setPage(0); }, [category, search, topic, onlyWrong, includeReview]);
  useEffect(() => { if (page >= pageCount) setPage(pageCount - 1); }, [page, pageCount]);

  const queueContext = order => ({ ids: filtered.map(question => question.id), order });
  const startRandom = () => { if (filtered.length) onPractice(filtered[Math.floor(Math.random() * filtered.length)], queueContext('random')); };
  return <main className="inner-page learn-page">
    <div className="page-heading learn-heading">
      <div><div className="eyebrow">THE LIVING ARCHIVE</div><h1>每一道题，都是一处可重返的路标。</h1><p>按模块、题型与考点检索真题；从错题和薄弱处继续研习。</p></div>
      <div className="learn-heading-actions"><button className="secondary" onClick={() => filtered[0] && onPractice(filtered[0], queueContext('sequential'))} disabled={!filtered.length}><Layers3 size={16}/>按序研习</button><button className="primary" onClick={startRandom} disabled={!filtered.length}><Compass size={17}/>随机研习</button></div>
    </div>
    <div className="learn-overview" aria-label="题库概况"><span><BookOpen size={16}/><b>{nf.format(questions.length)}</b>道真题</span><span><Check size={16}/><b>{nf.format(Object.keys(learning).length)}</b>道有记录</span><span><RotateCcw size={16}/><b>{nf.format(wrongCount)}</b>待复习</span><span><Activity size={16}/><b>{nf.format(reviewCount)}</b>待复核</span></div>
    <section className="learn-browser" aria-label="筛选题库">
      <div className="learn-module-tabs" role="group" aria-label="知识模块">{[ALL, ...modules].map(item => <button key={item} className={module === item ? 'active' : ''} aria-pressed={module === item} onClick={() => setModule(item)}>{item}</button>)}</div>
      <div className="learn-filter-grid">
        <label className="learn-search"><Search size={17}/><span className="sr-only">搜索题干、材料、解析或来源</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder="全文搜索题干、材料、解析、来源…"/></label>
        <label className="learn-topic-search"><Target size={16}/><span className="sr-only">搜索考点</span><input value={topic} onChange={e => setTopic(e.target.value)} placeholder="考点 / 主题"/></label>
        <label className="learn-select"><span>题型</span><select aria-label="筛选题型" value={category} onChange={e => setCategory(e.target.value)}><option value={ALL}>全部题型</option>{categoryOptions.map(item => <option key={item} value={item}>{item}</option>)}</select></label>
      </div>
      <div className="learn-toggles">
        <label className={`learn-check ${onlyWrong ? 'selected' : ''}`}><input type="checkbox" checked={onlyWrong} onChange={e => setOnlyWrong(e.target.checked)}/><RotateCcw size={14}/>只看错题 <b>{wrongCount}</b></label>
        <label className={`learn-check ${includeReview ? 'selected' : ''}`}><input type="checkbox" checked={includeReview} onChange={e => setIncludeReview(e.target.checked)}/><Filter size={14}/>包含待复核题 <b>{reviewCount}</b></label>
        <span className="learn-filter-note">筛选范围：当前题库全部 {nf.format(questions.length)} 题</span>
      </div>
    </section>
    <div className="learn-list-heading"><div><span>检索结果</span><strong>{nf.format(filtered.length)}</strong><small>道题</small></div><span>第 {Math.min(page + 1, pageCount)} / {pageCount} 页 · 每页 {PAGE_SIZE} 道</span></div>
    {pageQuestions.length ? <section className="learn-question-list" aria-label="题目列表">{pageQuestions.map((question, index) => {
      const record = learning[question.id]; const state = record?.attempts ? (record.lastCorrect ? 'known' : 'wrong') : 'new';
      return <article className="learn-question-row" key={question.id}>
        <span className={`learn-question-index ${state}`} aria-label={state === 'new' ? '未作答' : state === 'wrong' ? '最近答错' : '最近答对'}>{state === 'known' ? <Check size={15}/> : state === 'wrong' ? <RotateCcw size={14}/> : String(page * PAGE_SIZE + index + 1).padStart(2, '0')}</span>
        <button className="learn-question-main" onClick={() => onPractice(question, { ids: filtered.map(item => item.id), order: 'sequential' })}><span className="learn-question-stem">{String(question.stem || '').replace(/!\[[^\]]*\]\([^)]*\)/g, '〔原题配图〕').replace(/\s+/g, ' ').slice(0, 220)}</span><span className="learn-question-meta"><i>{getQuestionModule(question)}</i><i>{getQuestionCategory(question)}</i>{question.topic && <i>{question.topic}</i>}<i>{question.exam || question.year || '考试来源未标注'}</i>{record?.attempts ? <i>已作答 {record.attempts} 次 · 正确 {record.correct}/{record.attempts}</i> : <i>尚未作答</i>}{isQuestionNeedsReview(question) && <b>待复核</b>}</span></button>
        {question.sourceUrl && <button className="learn-source-button" onClick={() => onSource(question)} aria-label={`打开来源：${question.exam || question.id}`} title="打开原题来源"><ExternalLink size={16}/></button>}
      <button className="learn-practice-arrow" onClick={() => onPractice(question, { ids: filtered.map(item => item.id), order: 'sequential' })} aria-label="开始研习"><ChevronRight size={19}/></button>
      </article>;
    })}</section> : <section className="learn-empty"><BookOpen size={32}/><h2>{onlyWrong ? '暂时没有符合条件的错题' : '没有找到符合条件的题目'}</h2><p>{questions.length ? '调整模块、题型或搜索词，继续浏览题库。' : '题库载入后，这里会显示可研习的真题。'}</p><button className="text-button" onClick={() => { setModule(ALL); setCategory(ALL); setSearch(''); setTopic(''); setOnlyWrong(false); setIncludeReview(false); }}>清除筛选 <X size={14}/></button></section>}
    {filtered.length > PAGE_SIZE && <nav className="learn-pagination" aria-label="题库分页"><button className="secondary" disabled={page === 0} onClick={() => setPage(value => Math.max(0, value - 1))}><ChevronLeft size={16}/>上一页</button><span>第 <b>{page + 1}</b> 页，共 {pageCount} 页</span><button className="secondary" disabled={page + 1 >= pageCount} onClick={() => setPage(value => Math.min(pageCount - 1, value + 1))}>下一页<ChevronRight size={16}/></button></nav>}
  </main>;
}

export function StatsView({ questions = [], learning = {}, studyLog = [], onPractice = () => {} }) {
  const [range, setRange] = useState('30');
  const [mode, setMode] = useState('all');
  const [trendMetric, setTrendMetric] = useState('accuracy');
  const stats = useMemo(() => buildLearningStats(studyLog, questions, learning, { range, mode }), [studyLog, questions, learning, range, mode]);
  const { totals } = stats;
  const maxDay = Math.max(1, ...stats.trend.map(day => day.attempts));
  const maxTrendSeconds = Math.max(1, ...stats.trend.map(day => day.avgSeconds || 0));
  const secondsAxisTop = maxTrendSeconds < 10 ? Math.max(1, Math.ceil(maxTrendSeconds)) : Math.ceil(maxTrendSeconds / 10) * 10;
  const secondsAxisMid = Number((secondsAxisTop / 2).toFixed(1));
  const chartPoints = stats.trend.map((day, index) => {
    const x = stats.trend.length <= 1 ? 300 : 14 + index * (572 / (stats.trend.length - 1));
    const value = trendMetric === 'accuracy' ? day.accuracy : day.avgSeconds == null ? null : day.avgSeconds / secondsAxisTop;
    const y = value == null ? null : 126 - value * 108;
    return y == null ? null : `${x},${y}`;
  }).filter(Boolean).join(' ');
  const trendHasSamples = stats.trend.some(day => trendMetric === 'accuracy' ? day.attempts > 0 : day.timedAttempts > 0);
  const topModules = stats.byModule.slice(0, 4);
  const practiceWeakTopic = topic => {
    const candidates = questions.filter(question => getQuestionModule(question) === topic.module && (question.topic || '未分类') === topic.label);
    if (!candidates.length) return;
    const retry = candidates.find(question => learning[question.id]?.attempts && learning[question.id]?.lastCorrect === false);
    onPractice(retry || candidates[0]);
  };
  const practiceQuestion = () => {
    const candidate = questions.find(question => learning[question.id]?.attempts && learning[question.id]?.lastCorrect === false) || questions[0];
    if (candidate) onPractice(candidate);
  };
  return <main className="inner-page learn-page stats-page">
    <div className="page-heading learn-heading"><div><div className="eyebrow">YOUR STUDY RECORD</div><h1>看见每一次进步，也看清下一步。</h1><p>按答题记录汇总模块、题型、速度与练习趋势。</p></div><div className="learn-heading-actions"><button className="secondary" onClick={practiceQuestion} disabled={!questions.length}><BookOpen size={16}/>继续练习</button></div></div>
    {stats.source === 'learning' && totals.attempts > 0 && <div className="learn-legacy-note"><Clock3 size={15}/><span>这是旧档累计概况。完整答题日志从新记录开始；旧档没有按日或按模式的明细，因此不展示趋势与历史速度。</span></div>}
    <div className="stats-toolbar"><div className="stats-range" role="group" aria-label="统计时间范围">{[['7','近7天'],['30','近30天'],['all','全部时间']].map(([value,label])=><button key={value} className={range===value?'active':''} aria-pressed={range===value} onClick={()=>setRange(value)}>{label}</button>)}</div><label><span>练习来源</span><select value={mode} onChange={e=>setMode(e.target.value)}><option value="all">全部模式</option><option value="battle">远征答题</option><option value="practice">自由研习</option></select></label><span className="stats-source-label">{stats.sourceLabel}</span></div>
    {totals.attempts === 0 ? <section className="learn-empty stats-empty"><Activity size={36}/><h2>没有符合当前筛选条件的作答记录</h2><p>切换时间范围或练习来源；完成一道题后，这里会显示正确率、答题用时与薄弱考点。</p><button className="primary" onClick={practiceQuestion} disabled={!questions.length}><BookOpen size={16}/>开始研习一道题</button></section> : <>
      <section className="stats-metrics" aria-label="学习总览">
        <article><span><BookOpen size={16}/>作答总数</span><strong>{nf.format(totals.attempts)}</strong><small>{range==='all'?'累计记录':`所选${range}天`}</small></article>
        <article><span><Target size={16}/>整体正确率</span><strong>{pct(totals.accuracy)}</strong><small>{totals.correct} 道正确 / {totals.attempts} 道</small></article>
        <article><span><Timer size={16}/>平均答题时间</span><strong>{duration(totals.avgSeconds)}</strong><small>只统计有有效用时的作答</small></article>
        <article><span><CalendarDays size={16}/>活跃天数</span><strong>{stats.source === 'studyLog' ? totals.activeDays : '—'}</strong><small>{stats.source === 'studyLog' ? '所选时段内有作答的日期' : '旧存档未记录日期明细'}</small></article>
      </section>
      <div className="stats-main-grid">
        <section className="stats-panel stats-trend"><div className="stats-panel-heading"><div><span className="section-kicker">PACE & ACCURACY</span><h2>练习趋势</h2></div><div className="trend-heading-actions"><div className="trend-metric-toggle" role="group" aria-label="趋势指标"><button className={trendMetric==='accuracy'?'active':''} aria-pressed={trendMetric==='accuracy'} onClick={()=>setTrendMetric('accuracy')}>正确率</button><button className={trendMetric==='speed'?'active':''} aria-pressed={trendMetric==='speed'} onClick={()=>setTrendMetric('speed')}>答题用时</button></div><span>{stats.source === 'studyLog' ? `${stats.trendWindow}天` : '无时序记录'}</span></div></div>
          {stats.source === 'studyLog' && trendHasSamples ? <><div className="trend-chart"><div className="trend-y-labels"><span>{trendMetric==='accuracy'?'100%':`${secondsAxisTop}秒`}</span><span>{trendMetric==='accuracy'?'50%':`${secondsAxisMid}秒`}</span><span>{trendMetric==='accuracy'?'0%':'0秒'}</span></div><svg viewBox="0 0 600 140" role="img" aria-label={trendMetric==='accuracy'?'每日答题正确率趋势':'每日平均答题秒数趋势'} preserveAspectRatio="none"><path className="trend-grid-line" d="M14 18H586 M14 72H586 M14 126H586"/>{chartPoints && <polyline className="trend-line" points={chartPoints}/ >}{stats.trend.map((day,index)=>{const x=stats.trend.length<=1?300:14+index*(572/(stats.trend.length-1));const barHeight=(day.attempts/maxDay)*40;const value=trendMetric==='accuracy'?day.accuracy:day.avgSeconds==null?null:day.avgSeconds/secondsAxisTop;return <g key={day.date}><rect className="trend-bar" x={x-3} y={128-barHeight} width="6" height={barHeight} rx="3"><title>{day.date}：{day.attempts} 题</title></rect>{value!=null&&<circle className="trend-dot" cx={x} cy={126-value*108} r="3.5"><title>{day.date}：{trendMetric==='accuracy'?`正确率 ${pct(day.accuracy)}`:`平均用时 ${day.avgSeconds.toFixed(1)} 秒（${day.timedAttempts} 次计时）`}</title></circle>}</g>;})}</svg></div><div className="trend-axis">{stats.trend.filter((_,i)=>i===0||i===stats.trend.length-1||i%Math.max(1,Math.floor(stats.trend.length/6))===0).map(day=><span key={day.date}>{day.date.slice(5)}</span>)}</div><div className="trend-legend"><span><i className="trend-legend-line"/>{trendMetric==='accuracy'?'每日准确率':'每日均时（秒）'}</span><span><i className="trend-legend-bar"/>答题数量</span>{trendMetric==='speed'&&<span>均时样本 {stats.trend.reduce((sum,day)=>sum+day.timedAttempts,0)} 次 · 按有有效用时的作答计算</span>}</div></> : <div className="trend-no-data"><Activity size={24}/><span>{stats.source==='learning'?'旧档没有按日记录':trendMetric==='speed'?'该时段暂无有效用时':'该时段暂无按日记录'}</span></div>}
        </section>
        <section className="stats-panel module-stats"><div className="stats-panel-heading"><div><span className="section-kicker">MODULES</span><h2>模块表现</h2></div><Layers3 size={18}/></div>
          {topModules.length ? topModules.map(item=><button className="module-stat-row" key={item.key} onClick={() => { const q=questions.find(question=>getQuestionModule(question)===item.label && learning[question.id]?.attempts && learning[question.id]?.lastCorrect===false) || questions.find(question=>getQuestionModule(question)===item.label); if(q)onPractice(q); }}><span className="module-stat-name">{item.label}</span><span className="module-stat-bar"><i style={{width:`${item.accuracy*100}%`}}/></span><strong>{pct(item.accuracy)}</strong><small>{item.attempts}题 · 均时 {duration(item.avgSeconds)}</small></button>) : <div className="trend-no-data">当前筛选下没有模块记录</div>}
        </section>
      </div>
      <section className="stats-panel category-panel"><div className="stats-panel-heading"><div><span className="section-kicker">QUESTION TYPES</span><h2>题型表现</h2></div><span>正确率按作答次数加权</span></div>
        {stats.byCategory.length ? <div className="stats-table-wrap"><table className="stats-table"><thead><tr><th>模块 / 题型</th><th>作答</th><th>正确率</th><th>平均用时</th><th>中位用时</th><th>累计用时</th></tr></thead><tbody>{stats.byCategory.map(item=><tr key={item.key}><td><span>{item.module}</span><strong>{item.label}</strong></td><td>{nf.format(item.attempts)}</td><td><span className="accuracy-cell"><i><b style={{width:`${Math.max(0,Math.min(100,item.accuracy*100))}%`}}/></i>{pct(item.accuracy)}</span></td><td>{duration(item.avgSeconds)}</td><td>{duration(item.medianSeconds)}</td><td>{duration(item.totalSeconds)}</td></tr>)}</tbody></table></div> : <div className="trend-no-data">当前筛选下没有题型记录</div>}
      </section>
      <section className="stats-panel weak-panel"><div className="stats-panel-heading"><div><span className="section-kicker">NEXT STEPS</span><h2>建议回看的考点</h2></div><span>至少作答 2 次，按正确率由低到高</span></div>
        {stats.weakTopics.length ? <div className="weak-topic-list">{stats.weakTopics.map((topic,index)=><button key={topic.key} onClick={() => practiceWeakTopic(topic)}><span className="weak-rank">{String(index+1).padStart(2,'0')}</span><span className="weak-topic-name"><strong>{topic.label}</strong><small>{topic.module} · {topic.attempts} 次作答</small></span><span className="weak-topic-result"><b>{pct(topic.accuracy)}</b><i><b style={{width:`${topic.accuracy*100}%`}}/></i></span><ArrowRight size={16}/></button>)}</div> : <div className="trend-no-data"><Check size={20}/><span>目前还没有重复作答的薄弱考点。完成更多练习后会显示建议。</span></div>}
      </section>
      <div className="stats-footnote"><span><Clock3 size={14}/>有效用时：非负且可解析的单题秒数</span><span><Activity size={14}/>计时 {totals.timedAttempts} / {totals.attempts} 次</span><span><ArrowUpRight size={14}/>总耗时 {duration(totals.totalSeconds)}</span><span><ArrowDownRight size={14}/>中位用时 {duration(totals.medianSeconds)}</span></div>
    </>}
  </main>;
}
