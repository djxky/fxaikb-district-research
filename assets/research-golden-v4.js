(function () {
  'use strict';

  const state = {
    data: null,
    trace: null,
    artifact: null,
    context: null,
    runners: [],
    cursor: 0,
    running: false,
    stopped: false,
    controller: null,
    startedAt: 0,
    elapsedBeforeStart: 0,
    timer: null,
    reducedMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    quick: new URLSearchParams(location.search).get('quick') === '1'
  };

  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
  const num = (value) => Number(value ?? 0).toLocaleString('zh-CN');
  const icon = (name, className = '') => `<i data-lucide="${name}"${className ? ` class="${className}"` : ''}></i>`;
  const refreshIcons = () => window.lucide?.createIcons();
  const duration = (ms) => state.reducedMotion ? 12 : Math.max(18, ms * (state.quick ? .06 : 1));
  const wait = (ms, signal) => new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(Object.assign(new Error('已停止'), { name: 'AbortError' }));
    const timer = setTimeout(resolve, duration(ms));
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(Object.assign(new Error('已停止'), { name: 'AbortError' }));
    }, { once: true });
  });
  const fetchJson = (path) => fetch(`${path}?v=golden-v4-02`).then((response) => {
    if (!response.ok) throw new Error(`${response.status}`);
    return response.json();
  });

  function buildContext(data, trace) {
    const coverage = data.source_coverage || {};
    const math = data.math_function_metric?.comparison || {};
    const earlyMath = math.early_period || {};
    const lateMath = math.late_period || {};
    const writing = data.writing_series || [];
    const average = (rows) => rows.reduce((sum, row) => sum + Number(row.evidence_use || 0), 0) / Math.max(rows.length, 1);
    return {
      coverage,
      earlyMath,
      lateMath,
      earlyWriting: average(writing.slice(0, 5)),
      lateWriting: average(writing.slice(-5)),
      sourceRuns: trace.source_runs || [],
      subjectSufficiency: data.subject_data_sufficiency || [],
      crossSourceEvidence: data.cross_source_evidence || [],
      hypotheses: data.hypothesis_review || [],
      metrics: data.derived_metrics || {}
    };
  }

  function elapsedText() {
    const active = state.running ? Date.now() - state.startedAt : 0;
    const seconds = Math.max(0, Math.floor((state.elapsedBeforeStart + active) / 1000));
    return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }

  function startTimer() {
    clearInterval(state.timer);
    state.timer = setInterval(() => { $('runElapsed').textContent = elapsedText(); }, 250);
  }

  function pauseTimer() {
    if (state.running) state.elapsedBeforeStart += Date.now() - state.startedAt;
    clearInterval(state.timer);
    state.timer = null;
    $('runElapsed').textContent = elapsedText();
  }

  function scrollLatest() {
    const nearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 220;
    if (nearBottom || state.quick) window.scrollTo({ top: document.documentElement.scrollHeight, behavior: state.reducedMotion ? 'auto' : 'smooth' });
  }

  async function streamText(node, text, signal) {
    node.textContent = '';
    const chunks = String(text).split('');
    for (let index = 0; index < chunks.length; index += 1) {
      if (signal.aborted) throw Object.assign(new Error('已停止'), { name: 'AbortError' });
      node.textContent += chunks[index];
      if (index % 5 === 0) await wait(32, signal);
    }
  }

  function createTurn(id, summary) {
    const turn = document.createElement('article');
    turn.className = 'v4-turn';
    turn.dataset.turn = id;
    turn.dataset.transient = 'true';
    turn.innerHTML = `
      <img class="v4-avatar" src="assets/home/chat-logo.png" alt="飞象老师">
      <div class="v4-turn-main">
        <button class="v4-turn-summary" type="button" aria-expanded="false">
          <span class="v4-summary-check">${icon('check')}</span>
          <strong>${esc(summary.title)}</strong>
          <span class="v4-summary-meta">${esc(summary.meta)}</span>
          ${icon('chevron-down', 'v4-summary-chevron')}
        </button>
        <div class="v4-turn-body"><p class="v4-turn-lead"></p><div class="v4-turn-content"></div></div>
      </div>`;
    $('agentStream').appendChild(turn);
    refreshIcons();
    scrollLatest();
    return turn;
  }

  function finishTurn(turn) {
    delete turn.dataset.transient;
    turn.dataset.complete = 'true';
    refreshIcons();
  }

  function compressCompleted(except = null) {
    document.querySelectorAll('.v4-turn[data-complete="true"]').forEach((turn) => {
      if (turn !== except && !turn.classList.contains('is-expanded') && !turn.classList.contains('is-spotlight')) turn.classList.add('is-compressed');
    });
  }

  function commitStage(node) {
    delete node.dataset.transient;
    node.classList.remove('is-running');
    node.classList.add('is-complete');
    const marker = node.querySelector('.v4-stage-marker');
    if (marker) marker.innerHTML = icon('check');
    refreshIcons();
  }

  function collapseResearchStages(except = null) {
    document.querySelectorAll('.v4-research-stage.is-complete').forEach((stage) => {
      if (stage === except) return;
      stage.classList.add('is-collapsed');
      stage.querySelector('.v4-stage-heading')?.setAttribute('aria-expanded', 'false');
    });
  }

  function appendStage(id, tag, title, meta = '') {
    const timeline = $('researchTimeline');
    collapseResearchStages();
    const node = document.createElement('section');
    node.className = 'v4-research-stage is-running';
    node.dataset.stage = id;
    node.dataset.transient = 'true';
    node.innerHTML = `<span class="v4-stage-marker">${icon('loader-circle')}</span><div class="v4-stage-main"><button class="v4-stage-heading" type="button" aria-expanded="true"><span class="v4-stage-heading-copy"><span>${esc(tag)}</span><strong>${esc(title)}</strong></span><span class="v4-stage-heading-side">${meta ? `<small>${esc(meta)}</small>` : ''}${icon('chevron-up', 'v4-stage-chevron')}</span></button><div class="v4-stage-content"></div></div>`;
    timeline.appendChild(node);
    refreshIcons();
    requestAnimationFrame(() => node.classList.add('is-visible'));
    if (state.quick || window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 300) {
      setTimeout(() => node.scrollIntoView({ behavior: state.reducedMotion ? 'auto' : 'smooth', block: 'center' }), 40);
    }
    return node;
  }

  async function playActivity(container, title, entries, signal) {
    container.classList.remove('is-result-ready');
    container.classList.add('is-activity-running');
    const panel = document.createElement('section');
    panel.className = 'v4-activity';
    panel.innerHTML = `<header><span>${icon('sparkles')}<strong>${esc(title)}</strong></span><small>0/${entries.length}</small></header><div class="v4-activity-window"><div class="v4-activity-list"></div></div>`;
    container.prepend(panel);
    const list = panel.querySelector('.v4-activity-list');
    const counter = panel.querySelector('header small');
    refreshIcons();
    for (let index = 0; index < entries.length; index += 1) {
      if (signal.aborted) throw Object.assign(new Error('已停止'), { name: 'AbortError' });
      const previousRow = list.querySelector('.is-current');
      if (previousRow) {
        previousRow.classList.remove('is-current');
        previousRow.querySelector('strong').textContent = previousRow.querySelector('strong').dataset.complete;
      }
      const entry = entries[index];
      const row = document.createElement('div');
      row.className = 'v4-activity-row is-current';
      row.innerHTML = `<span class="v4-activity-icon">${icon(entry[0])}</span><div><strong data-complete="${esc(`已${entry[1]}`)}">正在${esc(entry[1])}</strong><small>${esc(entry[2])}</small></div>`;
      list.appendChild(row);
      counter.textContent = `${index + 1}/${entries.length}`;
      refreshIcons();
      panel.querySelector('.v4-activity-window').scrollTo({ top: list.scrollHeight, behavior: state.reducedMotion ? 'auto' : 'smooth' });
      scrollLatest();
      await wait(entry[3] || 320, signal);
    }
    const finalRow = list.querySelector('.is-current');
    if (finalRow) {
      finalRow.classList.remove('is-current');
      finalRow.querySelector('strong').textContent = finalRow.querySelector('strong').dataset.complete;
    }
    panel.classList.add('is-complete');
    const activityTitle = panel.querySelector('header strong');
    if (activityTitle) activityTitle.textContent = activityTitle.textContent.replace(/^正在/, '已完成');
    panel.querySelector('header > span').insertAdjacentHTML('afterbegin', icon('check-circle-2'));
    panel.querySelector('header > span > svg:last-of-type')?.remove();
    container.classList.remove('is-activity-running');
    container.classList.add('is-result-ready');
    refreshIcons();
  }

  function ensureResearchCanvas() {
    let turn = document.querySelector('[data-turn="research-canvas"]');
    if (turn) return turn;
    turn = createTurn('research-canvas', { title: '学生学期发展综合分析已完成', meta: '9步研究流程 · 10维证据融合 · 6个报告板块' });
    turn.classList.add('v4-turn--canvas', 'is-spotlight');
    turn.querySelector('.v4-turn-lead').textContent = '我将按照多源教育数据综合分析流程，依次完成数据接入、质量检查、指标构建、分领域分析、十维证据融合、综合诊断、分层支持和报告复核。对于本轮没有可靠数据的体育、社会参与和综合实践领域，只标注证据缺口，不作学生判断。';
    turn.querySelector('.v4-turn-content').innerHTML = `<section class="v4-research-canvas"><header class="v4-canvas-head"><div><span>基于多源教育数据的个体诊断与支持建议</span><h2>林知遥 · 八年级第二学期综合发展分析</h2></div><div class="v4-canvas-state"><i></i><span>正在综合分析</span></div></header><div class="v4-research-timeline" id="researchTimeline"></div><footer class="v4-canvas-foot"><span>${icon('shield-check')}可进行同口径比较 · 2,128条</span><span>${icon('book-open')}已形成证据记录 · 184条</span></footer></section>`;
    refreshIcons();
    return turn;
  }

  async function runFraming(signal) {
    compressCompleted();
    const turn = createTurn('framing', { title: '分析任务已经明确', meta: '2025—2026学年第二学期 · 低风险教育支持' });
    const lead = turn.querySelector('.v4-turn-lead');
    await streamText(lead, '本次任务面向林知遥八年级第二学期综合发展情况，目标不是计算综合总分，而是说明学业表现、学习过程、证据边界和下一阶段支持重点。比较以学生自身前后阶段及同口径任务为主，不把不同评价量尺直接相加。', signal);
    turn.querySelector('.v4-turn-content').innerHTML = `<div class="v4-research-contract"><div><span>分析对象</span><strong>林知遥 · 八年级</strong></div><div><span>分析周期</span><strong>2025—2026学年第二学期</strong></div><div><span>比较基准</span><strong>自身阶段变化与同口径任务</strong></div><div><span>报告用途</span><strong>低风险教育支持</strong></div></div><div class="v4-boundary-note">${icon('shield-check')}<span>学号按1805****脱敏展示；心理健康数据未调用；学业、出勤、体育和活动数据不相互抵消；结论不用于定级、排名或评价学生优劣。</span></div>`;
    await playActivity(turn.querySelector('.v4-turn-content'), '正在明确综合分析任务', [
      ['user-round-check', '确认分析对象', '林知遥 · 八年级 · 学号脱敏'],
      ['calendar-range', '确认分析周期', '2025—2026学年第二学期 · 18周'],
      ['database', '界定数据范围', '学习业务记录、课程映射与教学覆盖信息'],
      ['scale', '确定比较基准', '自身前后阶段与同口径任务比较'],
      ['circle-slash-2', '明确不作判断领域', '无可靠证据的领域不进入学生结论'],
      ['graduation-cap', '明确报告用途', '用于教学支持、学校改进与后续复查']
    ], signal);
    await wait(700, signal);
    finishTurn(turn);
  }

  async function runDataAccess(signal) {
    compressCompleted();
    const context = state.context;
    const coverage = context.coverage;
    const turn = ensureResearchCanvas();
    const stage = appendStage('data-access', '数据接入与隐私处理', '接入5类教育数据，建立授权与脱敏边界', '5类来源');
    const content = stage.querySelector('.v4-stage-content');
    content.innerHTML = `<p class="v4-stage-copy">按来源分类、编号并关联数据，只读取本次任务所需字段。姓名、学号和其他直接身份信息在研究画布中脱敏；报告要求但本轮未接入的体育、志愿服务和研学记录，不以空缺代替事实。</p><div class="v4-source-grid"></div><div class="v4-volume-note"><strong>${num(coverage.raw_learning_business_records)}</strong><span>条学习业务记录</span><i></i><span>${num(coverage.covered_weeks)}/18周覆盖</span><i></i><span>91个教学日</span><i></i><span>${num(coverage.curriculum_mapping_items)}条课程映射</span></div><div class="v4-lineage-flow"><span><b>01</b>按来源分类</span>${icon('arrow-right')}<span><b>02</b>字段脱敏</span>${icon('arrow-right')}<span><b>03</b>建立关联</span>${icon('arrow-right')}<span><b>04</b>限定用途</span></div><details class="v4-tool"><summary>${icon('shield-check')}<strong>查看隐私处理记录</strong><span class="v4-tool-meta">最小必要、身份脱敏、授权访问、范围隔离</span>${icon('chevron-down', 'v4-tool-chevron')}</summary><div class="v4-tool-body"><span><b>身份字段</b>学号按1805****展示，不呈现家庭与证件信息</span><span><b>访问范围</b>仅调用本次学期综合分析所需字段</span><span><b>用途限定</b>仅用于低风险教育支持和复查</span><span><b>来源隔离</b>文档末尾其他学生原始数据说明未进入本案例</span></div></details>`;
    await playActivity(content, '正在接入并整理授权数据', [
      ['notebook-pen', '调取智能作业', '2,843条题目级作答 · 186次作业'],
      ['file-chart-column', '调取考试评价', '524条分题得分 · 6次阶段测评'],
      ['scan-text', '调取AI作文及修改', '61条过程记录 · 14篇作文 · 47次修改'],
      ['calendar-days', '调取教学覆盖信息', '91个教学日 · 17/18个教学周有记录'],
      ['network', '读取课程对应关系', '212条课程映射 · 覆盖学科、单元和学习内容'],
      ['fingerprint', '执行身份字段脱敏', '学号与直接身份信息不进入分析过程展示'],
      ['shield-check', '核对数据访问范围', '只保留本次任务最小必要字段'],
      ['database', '建立数据资产清单', '共3,428条学习业务记录，保留来源标识']
    ], signal);
    const sourceCards = [
      ['notebook-pen', '智能作业', '186次作业', `${num(coverage.homework_item_responses)}条题目级作答`],
      ['file-chart-column', '考试评价', '6次阶段测评', `${num(coverage.assessment_item_scores)}条分题得分`],
      ['scan-text', 'AI作文', '14篇作文', '47次修改 · 61条过程记录'],
      ['calendar-days', '学生管理', '91个教学日', '出勤与教师日常记录'],
      ['network', '课程与知识图谱', `${num(coverage.curriculum_mapping_items)}条映射`, '学科、单元与学习内容']
    ];
    for (const source of sourceCards) {
      content.querySelector('.v4-source-grid').insertAdjacentHTML('beforeend', `<article class="v4-source-card">${icon(source[0])}<span>${source[1]}</span><strong>${source[2]}</strong><small>${source[3]}</small></article>`);
      refreshIcons();
      await wait(210, signal);
    }
    await wait(650, signal);
    commitStage(stage);
    finishTurn(turn);
  }

  async function runDataQuality(signal) {
    const context = state.context;
    const stage = appendStage('data-quality', '数据质量与可比性检查', '3,428条记录完成完整性、异常与量尺检查', '3,408条通过');
    const content = stage.querySelector('.v4-stage-content');
    content.innerHTML = `<p class="v4-stage-copy">分别检查完整性、连续性、重复、标签缺失和评价量尺。不同满分、难度或评价标准的数据保留原有单位，只在同学科、同任务类型和同口径条件下比较。</p><div class="v4-index-result"><div><strong>3,428</strong><span>学习业务原始记录</span></div><div><strong>3,408</strong><span>通过基础质量检查</span></div><div><strong>2,128</strong><span>进入同口径比较</span></div></div><div class="v4-job-list"><div class="v4-job-row"><span class="v4-job-status">${icon('check')}</span><div><strong>重复记录</strong><small>按来源编号、任务与时间戳复核</small></div><b>去除8条</b></div><div class="v4-job-row"><span class="v4-job-status">${icon('check')}</span><div><strong>标签完整性</strong><small>缺少学科或任务标签的记录隔离</small></div><b>隔离12条</b></div><div class="v4-job-row"><span class="v4-job-status">${icon('check')}</span><div><strong>时间覆盖</strong><small>18周分析周期内17个教学周有记录</small></div><b>17/18周</b></div><div class="v4-job-row"><span class="v4-job-status">${icon('check')}</span><div><strong>量尺可比性</strong><small>作业、考试与作文评价分别处理</small></div><b>不直接相加</b></div></div><div class="v4-boundary-strip"><span>${icon('minus-circle')}体育、志愿服务、研学等数据未达到本轮分析条件，不据此形成学生判断</span></div>`;
    await playActivity(content, '正在检查数据质量与可比条件', [
      ['calendar-check-2', '检查时间连续性', '17/18个教学周有有效学习记录'],
      ['copy-x', '识别重复记录', '发现并去除8条重复记录'],
      ['tag', '检查字段完整性', '12条缺少学科或任务标签，隔离处理'],
      ['file-chart-column', '检查测评量尺', '满分、难度与评价标准分别保留'],
      ['notebook-pen', '检查作业代表性', '按任务类型与课程内容建立比较条件'],
      ['scan-text', '检查作文评价口径', '仅比较同量规作文与修改过程'],
      ['badge-check', '完成基础质量检查', '3,408条记录通过'],
      ['arrow-right-left', '建立可比记录范围', '2,128条记录进入同口径比较']
    ], signal);
    refreshIcons();
    await wait(850, signal);
    commitStage(stage);
  }

  async function runStructureMetrics(signal) {
    const context = state.context;
    const stage = appendStage('structure-metrics', '数据结构化与指标构建', '建立18周发展时间轴与184条证据记录', '12条代表记录');
    const content = stage.querySelector('.v4-stage-content');
    content.innerHTML = `<p class="v4-stage-copy">统一教学周、学科、课程内容、任务类型、评价来源、首次作答、订正和延时复查字段，建立从原始记录到阶段指标再到代表证据的可追溯关系。</p><div class="v4-index-axis"><span>教学周</span>${icon('chevron-right')}<span>学科</span>${icon('chevron-right')}<span>课程内容</span>${icon('chevron-right')}<span>任务类型</span>${icon('chevron-right')}<span>评价结果</span>${icon('chevron-right')}<span>订正与复查</span></div><div class="v4-standard-map"><div><span>数学 · 一次函数</span><strong>变量关系 → 函数表示 → 图像意义 → 情境应用</strong><small>作业、测评、订正和延时复查共同定位</small></div><div><span>语文 · 表达与交流</span><strong>观点 → 材料 → 解释 → 回扣</strong><small>作文量规、修改过程与开放任务相互印证</small></div></div><div class="v4-index-result"><div><strong>${num(context.coverage.curriculum_mapping_items)}</strong><span>条课程内容映射</span></div><div><strong>${num(context.coverage.evidence_ledger_entries)}</strong><span>条证据记录</span></div><div><strong>12</strong><span>条代表性学习记录</span></div></div>`;
    await playActivity(content, '正在构建基础指标与发展时间轴', [
      ['calendar-range', '统一教学周字段', '建立18周学期发展时间轴'],
      ['library', '统一学科与课程内容', '212条课程映射用于内容定位'],
      ['list-tree', '统一任务类型', '作业、测评、作文、订正与复查分别编码'],
      ['calculator', '构建数学阶段指标', '前6周67/96，后6周95/118'],
      ['pen-line', '构建语文表达指标', '前5篇3.10，后5篇3.68'],
      ['history', '构建订正保持指标', '21天复查119/384条同类错误复现'],
      ['book-marked', '形成证据记录', '184条记录进入证据汇总'],
      ['bookmark-check', '选择代表证据', '12条支持、限制与反例记录']
    ], signal);
    refreshIcons();
    await wait(950, signal);
    commitStage(stage);
  }

  async function runDomainAnalysis(signal) {
    const context = state.context;
    const stage = appendStage('domain-analysis', '分领域专项分析', '完成学业发展与学习过程分析，明确缺证领域', '4类领域');
    const content = stage.querySelector('.v4-stage-content');
    content.innerHTML = `<div class="v4-discovery-grid"><article><span>数学 · 一次函数具体任务</span><strong>${num(context.earlyMath.correct)}/${num(context.earlyMath.total)} → ${num(context.lateMath.correct)}/${num(context.lateMath.total)}</strong><small>正确率约提高11个百分点；测评转化与延时保持仍需复查</small></article><article><span>语文 · 材料支持观点</span><strong>${context.earlyWriting.toFixed(2)} → ${context.lateWriting.toFixed(2)}</strong><small>同量规作文与作文外开放任务方向一致</small></article></div><div class="v4-cross-matrix"><div class="v4-cross-row"><span>英语</span><strong>日常作业 × 语篇语法任务</strong><b>仅保留一般过去时波动线索</b></div><div class="v4-cross-row"><span>物理</span><strong>实验作业 × 控制条件表达</strong><b>仅保留探究表达观察线索</b></div><div class="v4-cross-row"><span>学习过程</span><strong>作业 × 订正 × 21天复查</strong><b class="is-support">119/384条同类错误再次出现</b></div><div class="v4-cross-row"><span>出勤与阅读</span><strong>教学覆盖信息</strong><b>不足以判断投入和自我管理</b></div><div class="v4-cross-row"><span>体育与实践</span><strong>阳光跑、活动、志愿与研学</strong><b class="is-stop">本轮未接入，不作判断</b></div></div>`;
    await playActivity(content, '正在开展分领域专项分析', [
      ['calculator', '分析数学学期表现', '专项任务、常规测评与延时复查联合分析'],
      ['notebook-pen', '分析语文表达发展', '同量规作文、修改过程与开放任务互证'],
      ['languages', '检查英语表现', '只保留HW-EN-GRAM-052观察线索'],
      ['flask-conical', '检查物理表现', '只保留HW-PHY-INQ-017观察线索'],
      ['history', '分析作业订正过程', '21天复查中119/384条同类错误再次出现'],
      ['calendar-days', '检查出勤与阅读条件', '当前记录不足以形成投入度判断'],
      ['activity', '检查体育与实践条件', '本轮无可靠数据，停止领域判断']
    ], signal);
    refreshIcons();
    await wait(1100, signal);
    commitStage(stage);
  }

  async function runEvidenceFusion(signal) {
    const stage = appendStage('evidence-fusion', '十维证据融合', '按统一结构核对10个综合发展维度', '10/10');
    const content = stage.querySelector('.v4-stage-content');
    const dimensions = [
      ['01', '数据基础与分析可信度', '3,428→3,408→2,128，口径明确', '较充分', 'is-strong'],
      ['02', '学业发展总体状况', '数学、语文出现具体变化，不能概括全部学科', '有限', 'is-medium'],
      ['03', '学科关键能力与主要问题', '一次函数应用与材料表达有证据支持', '中等', 'is-medium'],
      ['04', '学习过程与学习品质', '有订正保持证据，缺少完整投入度数据', '有限', 'is-medium'],
      ['05', '阅读与语言表达素养', '作文修改与开放任务方向一致', '中等', 'is-medium'],
      ['06', '身心健康与体育锻炼', '本轮未接入阳光跑、运动会等记录', '不足', 'is-weak'],
      ['07', '社会参与与责任意识', '本轮未接入志愿服务和学校活动记录', '不足', 'is-weak'],
      ['08', '实践学习与综合素养', '物理仅有单项观察，研学数据未接入', '不足', 'is-weak'],
      ['09', '五育融合与发展均衡性', '非学业领域证据不足，停止均衡性判断', '不足', 'is-weak'],
      ['10', '风险预警与支持需求', '订正保持需要持续关注，无重点关注证据', '中等', 'is-medium']
    ];
    content.innerHTML = `<p class="v4-stage-copy">每个维度统一呈现“主要判断—事实证据—发展趋势—比较基准—证据充分度—分析边界”，证据不足不会被其他维度的表现抵消。</p><div class="v4-dimension-grid">${dimensions.map((item) => `<article><span>${item[0]}</span><div><strong>${item[1]}</strong><small>${item[2]}</small></div><b class="${item[4]}">${item[3]}</b></article>`).join('')}</div>`;
    await playActivity(content, '正在进行十维证据融合', [
      ['database', '核对数据基础与可信度', '质量、口径、覆盖与分析限制'],
      ['chart-no-axes-combined', '核对学业发展总体状况', '趋势、稳定性与学科覆盖'],
      ['target', '核对学科关键能力', '具体内容、任务表现与主要困难'],
      ['history', '核对学习过程与品质', '作业、订正、保持与过程连续性'],
      ['book-open', '核对阅读与语言表达', '作文量规、修改与开放任务'],
      ['heart-pulse', '核对身心健康证据', '无可靠数据，标注证据不足'],
      ['hand-heart', '核对社会参与证据', '无可靠数据，标注证据不足'],
      ['telescope', '核对实践学习证据', '单项观察不足以形成综合判断'],
      ['shapes', '核对五育发展均衡性', '非学业证据不足，停止判断'],
      ['shield-alert', '核对风险与支持需求', '区分一般提示、持续关注和重点关注']
    ], signal);
    refreshIcons();
    await wait(1250, signal);
    commitStage(stage);
  }

  async function runDiagnosis(signal) {
    const stage = appendStage('diagnosis', '综合诊断与风险识别', '提炼2项主要优势、2项改进重点与3级风险信号', '结论有边界');
    const content = stage.querySelector('.v4-stage-content');
    content.innerHTML = `<div class="v4-discovery-grid"><article><span>主要优势 01</span><strong>数学一次函数具体任务出现阶段变化</strong><small>前6周69.8% → 后6周80.5%，但不扩大为数学整体提升</small></article><article><span>主要优势 02</span><strong>语文材料支持观点的表现增强</strong><small>前5篇3.10 → 后5篇3.68，并有开放任务印证</small></article></div><div class="v4-hypothesis-list"><article><span>需要改进 01</span><strong>订正后的稳定保持</strong><small>21天复查119/384条同类错误再次出现</small></article><article><span>需要改进 02</span><strong>专项表现向常规测评转化</strong><small>标准分均值仅由0.08变为0.11</small></article><article><span>发展均衡性</span><strong>暂不判断</strong><small>体育、社会参与与实践数据不足，不能计算综合总分</small></article></div><div class="v4-cross-matrix v4-risk-matrix"><div class="v4-cross-row"><span>一般提示</span><strong>英语、物理存在局部观察线索</strong><b>继续观察</b></div><div class="v4-cross-row"><span>持续关注</span><strong>部分订正内容在延时任务中再次出错</strong><b class="is-support">安排间隔复查</b></div><div class="v4-cross-row"><span>重点关注</span><strong>尚无多类数据共同指向同一高风险问题</strong><b>不形成重点预警</b></div></div><div class="v4-boundary-strip"><span>${icon('shield-check')}优势和改进重点均落到具体任务；不使用智力、能力、态度、粗心或情绪标签</span></div>`;
    await playActivity(content, '正在形成综合诊断并分级核对风险', [
      ['sparkles', '提炼主要优势', '只保留有多条记录支持的具体变化'],
      ['triangle-alert', '识别改进重点', '核对常规测评转化与延时保持'],
      ['scale', '检查发展均衡性', '非学业证据不足，停止综合总分判断'],
      ['circle-alert', '识别一般提示', '单次或局部异常保留为观察线索'],
      ['repeat-2', '识别持续关注项', '同类错误在延时任务中反复出现'],
      ['shield-alert', '核对重点关注条件', '无多类数据共同指向高风险问题'],
      ['badge-check', '标注结论充分度', '每项结论同时保留事实证据与判断边界']
    ], signal);
    refreshIcons();
    await wait(1300, signal);
    commitStage(stage);
  }

  async function runLayeredSupport(signal) {
    const stage = appendStage('layered-support', '分层支持建议生成', '形成学生、教师学校、区域三个层级的行动建议', '可跟踪');
    const content = stage.querySelector('.v4-stage-content');
    content.innerHTML = `<div class="v4-support-grid"><div class="v4-plan-column"><h4>学生层面 · 两周</h4><div class="v4-plan-item is-keep">${icon('calculator')}<span><b>数学</b>用变式任务复查变量、条件和交点意义。</span></div><div class="v4-plan-item is-keep">${icon('notebook-pen')}<span><b>语文</b>完成“观点—材料—解释—回扣”开放表达。</span></div><div class="v4-plan-item is-watch">${icon('calendar-check-2')}<span><b>跟踪</b>第2、7、14天记录独立完成情况。</span></div></div><div class="v4-plan-column"><h4>教师与学校层面</h4><div class="v4-plan-item is-keep">${icon('replace')}<span><b>任务</b>以同等时长变式练习替换重复训练。</span></div><div class="v4-plan-item is-keep">${icon('history')}<span><b>反馈</b>保留首次作答、订正和延时复查链条。</span></div><div class="v4-plan-item is-watch">${icon('eye')}<span><b>观察</b>英语、物理线索，不提前形成学期判断。</span></div></div><div class="v4-plan-column"><h4>区域管理层面</h4><div class="v4-plan-item is-keep">${icon('school')}<span><b>验证</b>在班级、学校层面检查同类现象是否普遍。</span></div><div class="v4-plan-item is-keep">${icon('chart-no-axes-combined')}<span><b>研判</b>分别检查作业订正、测评转化和课程实施。</span></div><div class="v4-plan-item is-watch">${icon('shield-check')}<span><b>边界</b>不以单个学生个案直接推导区域结论。</span></div></div></div><div class="v4-final-boundary">${icon('shield-check')}每项建议均绑定问题依据、改进目标、责任主体、实施周期和跟踪指标。</div>`;
    await playActivity(content, '正在生成三个层级的支持建议', [
      ['user-round', '生成学生层面建议', '明确任务、周期与自我检查方式'],
      ['calculator', '生成数学支持行动', '变式复查变量、条件与交点意义'],
      ['notebook-pen', '生成语文支持行动', '开放任务复查材料与观点关系'],
      ['presentation', '生成教师支持行动', '优化任务设计、反馈与延时跟踪'],
      ['school', '生成学校支持行动', '补足过程数据并提供适宜学习机会'],
      ['landmark', '生成区域研判事项', '开展班级、学校或区域比较验证'],
      ['list-checks', '绑定跟踪指标', '第2、7、14天复查，不增加每日作业总时长']
    ], signal);
    refreshIcons();
    await wait(1250, signal);
    commitStage(stage);
  }

  async function runReportQuality(signal) {
    const stage = appendStage('report-quality', '报告生成与质量复核', '完成6个一级板块与8项质量检查', '报告已生成');
    const content = stage.querySelector('.v4-stage-content');
    content.innerHTML = `<div class="v4-report-sections"><span>01 学生概况与数据说明</span><span>02 学业质量与学科关键能力</span><span>03 学习过程与学习品质</span><span>04 身心健康与综合实践</span><span>05 综合发展诊断</span><span>06 支持建议与区域启示</span></div><div class="v4-job-list"><div class="v4-job-row"><span class="v4-job-status">${icon('check')}</span><div><strong>数据引用与指标计算</strong><small>黄金样板一致性校验</small></div><b>通过</b></div><div class="v4-job-row"><span class="v4-job-status">${icon('check')}</span><div><strong>结论与证据一致性</strong><small>支持证据、限制证据和反例并列保留</small></div><b>通过</b></div><div class="v4-job-row"><span class="v4-job-status">${icon('check')}</span><div><strong>推断范围与比较基准</strong><small>无数据领域停止判断，不计算综合总分</small></div><b>通过</b></div><div class="v4-job-row"><span class="v4-job-status">${icon('check')}</span><div><strong>语言与教育评价规范</strong><small>客观、尊重学生，不使用人格与能力标签</small></div><b>通过</b></div></div><div class="v4-final-boundary">${icon('file-check-2')}《林知遥 · 八年级第二学期综合发展分析报告——基于多源教育数据的个体诊断与支持建议》已生成。</div>`;
    await playActivity(content, '正在生成报告并执行质量复核', [
      ['file-text', '生成学生概况与数据说明', '说明范围、时间、缺失和可信度'],
      ['graduation-cap', '生成学业质量分析', '呈现趋势、关键能力和主要困难'],
      ['history', '生成学习过程分析', '区分结果表现、稳定性与证据缺口'],
      ['activity', '生成身心健康与综合实践说明', '无可靠数据领域明确停止判断'],
      ['clipboard-check', '生成综合发展诊断', '优势、改进重点、风险与充分度'],
      ['landmark', '生成支持建议与区域启示', '学生、学校教师、区域三级建议'],
      ['search-check', '核验数据引用与结论', '数字、证据、比较基准和边界逐项复核'],
      ['badge-check', '完成教育评价规范检查', '建议具体可跟踪，语言客观尊重学生']
    ], signal);
    refreshIcons();
    await wait(1450, signal);
    commitStage(stage);
    const canvas = document.querySelector('.v4-research-canvas');
    canvas?.classList.add('is-finished');
    const canvasState = canvas?.querySelector('.v4-canvas-state span');
    if (canvasState) canvasState.textContent = '研究已完成';
    const canvasTurn = document.querySelector('[data-turn="research-canvas"]');
    if (canvasTurn) {
      canvasTurn.dataset.complete = 'true';
      delete canvasTurn.dataset.transient;
    }
  }

  function renderEvidenceDialog() {
    $('evidenceContent').innerHTML = `
      <section class="v4-chain-section"><h3>当前研判</h3><p>可以确认的变化集中在数学一次函数情境与综合应用任务；常规测评转化和延时保持仍需复查，暂不扩大为数学学科整体提升。</p></section>
      <section class="v4-chain-section"><h3>支持性证据</h3><div class="v4-chain-records"><div class="v4-chain-record"><code>HW-MATH-FUNC-041</code><span>水箱情境中起始量、变化量和取值范围的复查记录。</span></div><div class="v4-chain-record"><code>EX-MATH-FUNC-018</code><span>一次函数图像交点（6,38）实际意义的独立任务记录。</span></div><div class="v4-chain-record"><code>HW-MATH-FUNC-063</code><span>参数变化后增减性判断的任务记录。</span></div></div></section>
      <section class="v4-chain-section"><h3>限制性证据与反例</h3><div class="v4-chain-records"><div class="v4-chain-record"><code>常规测评</code><span>标准分前3次均值0.08、后3次0.11，变化有限。</span></div><div class="v4-chain-record"><code>21天复查</code><span>119/384条同类错误再次出现。</span></div><div class="v4-chain-record"><code>HW-MATH-U07-034</code><span>基础题稳定，但情境应用没有同步改善。</span></div><div class="v4-chain-record"><code>HW-MATH-U12-019</code><span>基础错误下降，但常规测评转化有限。</span></div></div></section>
      <section class="v4-chain-section"><h3>判断边界</h3><p>不同来源保持各自分母和评价单位；专项任务变化不直接写成学科整体提升。结论仅用于低风险教学支持，不用于定级、排名或其他高影响决定。</p></section>`;
  }

  const reportEvidenceLabels = {
    1: '相关数学作业记录', 2: '一次函数任务记录', 3: '参数条件专项记录', 4: '订正后延时复查记录',
    5: '数学反例记录一', 6: '数学反例记录二', 7: '语文材料修改记录', 8: '语文开放任务记录',
    9: '人物描写观察记录', 10: '英语语篇观察记录', 11: '物理实验观察记录', 12: '数据边界记录'
  };

  function reportText(text) {
    return esc(text).replace(/\[证据(\d+)\]/g, (_, id) => `<sup class="report-citation" title="${reportEvidenceLabels[id] || '相关记录'}">[${id}]</sup>`);
  }

  function reportTable(table, index = 1) {
    const head = (table.headers || []).map((cell) => `<th scope="col">${esc(cell)}</th>`).join('');
    const rows = (table.rows || []).map((row) => `<tr>${row.map((cell) => `<td>${esc(cell)}</td>`).join('')}</tr>`).join('');
    const title = table.type === 'funnel' ? '学习业务记录的数据处理过程' : table.type === 'support' ? '分学科两周支持安排' : table.type === 'method' ? '主要指标与判断口径' : '数据说明';
    const source = table.type === 'funnel' ? 'learning-data.json · source_coverage / quality_funnel' : table.type === 'support' ? 'artifact.json · report_document.sections[四]' : 'artifact.json · report_document';
    const note = table.type === 'funnel' ? '注：不同数据粒度分别处理；质检排除项不进入同口径比较。' : table.type === 'support' ? '注：支持安排替换同等时长的常规练习，不增加每日作业总时长。' : '注：课程映射用于解释学习内容，不据此判断学生达到具体课标等级。';
    return `<figure class="golden-report-table-figure"><figcaption><span>表 ${index}</span>${esc(title)}</figcaption><div class="golden-report-table-wrap"><table class="golden-report-table"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div><p class="golden-report-table-note">${esc(note)}<br><span>数据来源：${esc(source)}</span></p></figure>`;
  }

  function reportAppendix(appendix, section) {
    const evidence = (appendix?.evidence_records || []).map((record, index) => `<details class="golden-report-evidence"><summary><span class="report-evidence-number">[${index + 1}]</span><strong>${esc(record.evidence_type || record.record_id)}</strong><span>${esc(record.subject || '')} · 第${esc(record.week || '')}周</span></summary><div class="golden-report-evidence-body"><p>${esc(record.observation || '')}</p><dl><dt>来源记录</dt><dd><code>${esc(record.record_id || '')}</code></dd><dt>指标参考</dt><dd>${esc(record.metric || '')}</dd><dt>结论编号</dt><dd>${esc((record.claim_ids || []).join('、'))}</dd></dl></div></details>`).join('');
    return `<section class="golden-report-section golden-report-appendix" id="report-section-appendix"><h2>${esc(section?.number || '六')} ${esc(section?.title || '学情分析依据附录')}</h2>${(section?.paragraphs || []).map((paragraph) => `<p>${reportText(paragraph)}</p>`).join('')}${(section?.tables || []).map((table, index) => reportTable(table, index + 3)).join('')}<h3>附录 A　代表性学习记录</h3><div class="golden-report-evidence-list">${evidence}</div></section>`;
  }

  function renderReport() {
    const doc = state.artifact.report_document;
    const appendixSection = (doc.sections || []).find((section) => section.id === 'appendix');
    const appendixHtml = reportAppendix(doc.appendix, { ...appendixSection, number: '附录', title: '分析依据与代表性学习记录' });
    const dataTable = reportTable({ type: 'method', headers: ['数据环节', '记录数量', '处理说明'], rows: [['学习业务原始记录', '3,428条', '保留来源与原评价单位'], ['通过基础质量检查', '3,408条', '去除8条重复记录，隔离12条缺标签记录'], ['进入同口径比较', '2,128条', '按学科、任务、时间和评价口径筛选'], ['证据记录', '184条', '选取12条代表性学习记录']] }, 1);
    $('reportDocument').innerHTML = `<article class="golden-report"><div class="golden-report-running-head"><span>飞象老师 · 综合发展分析</span><span>林知遥 · 八年级第二学期综合发展分析报告</span></div><header id="report-cover" class="golden-report-cover"><div class="golden-report-brand"><span class="golden-report-mark">飞</span><span>飞象老师</span></div><div class="golden-report-cover-rule"></div><div class="golden-eyebrow">多源教育数据综合分析</div><h1>林知遥 · 八年级第二学期综合发展分析报告</h1><p class="golden-report-subtitle">——基于多源教育数据的个体诊断与支持建议</p><div class="golden-report-cover-meta"><span>分析对象</span><strong>林知遥 · 学号1805****</strong><span>分析周期</span><strong>2025—2026学年第二学期</strong><span>编制单位</span><strong>飞象老师 · 2026年7月</strong></div><p class="golden-report-boundary">本报告不计算综合总分，只用于低风险教育支持和后续复查；不用于定级、排名或其他高影响决定。</p></header><section class="golden-report-summary" id="report-summary"><div class="golden-report-chapter-kicker">综合结论</div><h2>可以确认的变化与需要继续核实的事项</h2><p>本学期能够确认的积极变化主要集中在两个具体领域：数学一次函数情境与综合应用任务的正确率由前6周69.8%变为后6周80.5%；语文“材料支持观点”量规由前5篇平均3.10变为后5篇3.68，并有作文外开放任务作为方向一致的证据。[证据1][证据2][证据7][证据8]</p><p>这些变化尚不能扩大为学科整体提升。常规测评标准分均值仅由0.08变为0.11；21天复查中119/384条同类错误再次出现，并检出2条数学反例。英语和物理只保留观察线索。[证据4][证据5][证据6][证据10][证据11]</p><p>体育锻炼、社会参与、志愿服务和研学活动等数据未达到本轮分析条件，因此不判断五育发展均衡性，也不以其他领域表现填补这一证据缺口。</p></section><section class="golden-report-section" id="report-section-overview"><div class="golden-report-chapter-kicker">一 · 报告正文</div><h2>学生概况与数据说明</h2><p>分析覆盖2025—2026学年第二学期18周，其中17个教学周有有效学习记录。数据来源包括智能作业、考试评价、AI作文及修改、教学覆盖信息和课程内容映射。身份字段按最小必要原则脱敏展示。</p>${dataTable}<p>不同系统的原始分、作文量规和题目级结果分别处理，不直接相加。心理健康数据未调用；体育、活动和研学等本轮无可靠数据的领域停止判断。</p></section><section class="golden-report-section" id="report-section-academic"><div class="golden-report-chapter-kicker">二 · 报告正文</div><h2>学业质量与学科关键能力</h2><section class="golden-report-subsection"><h3>数学</h3><p>一次函数情境与综合应用任务出现阶段变化，能够在水箱变化、图像交点实际意义和参数变化任务中表现出更完整的数量关系表达。[证据1][证据2][证据3] 但常规测评转化有限，订正后的延时保持仍需复查，不据此判断数学学科整体提升。</p></section><section class="golden-report-subsection"><h3>语文</h3><p>“材料支持观点”的表现由3.10变为3.68，社区志愿者材料的修改过程和作文外开放任务方向一致。[证据7][证据8] 人物描写仅有单篇观察，不扩大为稳定能力结论。[证据9]</p></section><section class="golden-report-subsection"><h3>英语、物理与跨学科判断</h3><p>英语一般过去时和物理实验控制条件仅保留局部观察线索。[证据10][证据11] 当前证据可以支持“在明确任务结构和材料支架下，部分具体表现出现变化”，但不能推导稳定的跨学科学习迁移或综合能力结论。</p></section></section><section class="golden-report-section" id="report-section-process"><div class="golden-report-chapter-kicker">三 · 报告正文</div><h2>学习过程与学习品质</h2><p>作业、订正和延时复查记录显示，部分内容在即时订正后能够改善，但21天后的同类任务仍出现119/384条错误复现。当前记录能够说明“订正后的稳定保持需要加强”，不能将其解释为投入不足、态度问题或自我管理能力不足。</p><p>出勤与阅读数据不足以完整判断学习投入度、持续性和自我管理。结果与过程之间可以确认的差异是：专项任务变化较明显，而常规测评转化有限，需要通过后续间隔复查继续观察。</p></section><section class="golden-report-section" id="report-section-health"><div class="golden-report-chapter-kicker">四 · 报告正文</div><h2>身心健康与综合实践</h2><p>本轮未接入能够支持学期判断的阳光跑、运动会、学校活动、志愿服务和研学成果记录，心理健康数据也未调用。因此不判断体育锻炼习惯、学校融入、社会责任、实践学习或五育发展均衡性。</p><p>该部分的结论是“证据不足”，不是“学生没有参与”或“相关表现不足”。后续如补充数据，应先核实活动机会、参与资格、客观条件和记录缺失，再开展分析。</p></section><section class="golden-report-section" id="report-section-diagnosis"><div class="golden-report-chapter-kicker">五 · 报告正文</div><h2>综合发展诊断</h2><h3>主要优势</h3><p>一是数学一次函数具体任务出现阶段变化；二是语文材料与观点关系的表达出现方向一致的改善。两项优势均落到具体课程内容和任务证据，不写成宽泛能力标签。</p><h3>需要改进</h3><p>一是加强订正后的间隔保持；二是继续观察专项任务变化能否转化为常规测评表现。发展均衡性因非学业证据不足暂不判断。</p><h3>风险信号与证据充分度</h3><p>英语和物理局部线索列为一般提示；订正后同类错误复现列为持续关注；当前没有多类数据共同指向同一高风险问题，因此不形成重点关注预警。数据基础证据较充分，数学和语文判断为有限至中等充分，其他综合发展领域证据不足。</p></section><section class="golden-report-section" id="report-section-support"><div class="golden-report-chapter-kicker">六 · 报告正文</div><h2>支持建议与区域启示</h2><h3>学生层面</h3><p>未来两周以数学变式任务复查变量、条件和交点意义，以语文开放任务复查“观点—材料—解释—回扣”，在第2、7、14天记录独立完成情况。</p><h3>教师与学校层面</h3><p>以同等时长的变式任务替换重复训练，保留首次作答、订正与延时复查链条；英语、物理只观察具体线索，不提前形成学期判断；不增加每日作业总时长。</p><h3>区域管理层面</h3><p>可在班级、学校和区域层面进一步检验“订正保持”“专项任务向测评转化”等现象是否具有普遍性，并分别研判作业管理、课程实施和评价机制。单个学生个案不能直接推导区域结论。</p></section>${appendixHtml}<footer class="golden-report-footer"><span>飞象老师 · 综合发展分析报告</span><span>仅用于低风险教育支持</span><span class="golden-report-page-number">页面可打印</span></footer></article>`;
  }

  function openReportPreview() {
    if (!state.artifact) return;
    renderReport();
    document.body.classList.add('report-open');
    const dialog = $('reportDialog');
    if (!dialog.open) {
      dialog.classList.remove('is-visible');
      dialog.show();
      requestAnimationFrame(() => requestAnimationFrame(() => dialog.classList.add('is-visible')));
    } else dialog.classList.add('is-visible');
  }

  function closeReportPreview() {
    const dialog = $('reportDialog');
    dialog.classList.remove('is-visible');
    document.body.classList.remove('report-open');
    setTimeout(() => { if (dialog.open) dialog.close(); }, state.reducedMotion ? 10 : 260);
  }

  function downloadReport() {
    const article = $('reportDocument')?.innerHTML;
    if (!article) return;
    const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>林知遥 · 八年级第二学期综合发展分析报告</title><link rel="stylesheet" href="assets/research-golden.css"></head><body><main class="report-page"><div>${article}</div></main></body></html>`;
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = '林知遥 · 八年级第二学期综合发展分析报告.html';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function openEvidence() {
    renderEvidenceDialog();
    const dialog = $('evidenceDialog');
    if (!dialog.open) dialog.showModal();
  }

  function completeResearch() {
    compressCompleted();
    pauseTimer();
    state.running = false;
    state.stopped = false;
    $('runToolbar').className = 'v4-runbar is-done';
    $('runStatus').textContent = '研究完成 · 报告已生成';
    $('stopResearch').hidden = true;
    $('continueResearch').hidden = true;
    $('restartResearch').hidden = false;
    $('finishMessage').hidden = false;
    $('followupInput').disabled = false;
    $('sendFollowup').disabled = !$('followupInput').value.trim();
    refreshIcons();
    scrollLatest();
  }

  async function runResearch() {
    if (state.running || !state.runners.length) return;
    state.running = true;
    state.stopped = false;
    state.startedAt = Date.now();
    state.controller = new AbortController();
    startTimer();
    $('runToolbar').className = 'v4-runbar';
    $('stopResearch').hidden = false;
    $('continueResearch').hidden = true;
    $('restartResearch').hidden = true;
    $('finishMessage').hidden = true;
    $('followupInput').disabled = true;
    $('sendFollowup').disabled = true;
    try {
      while (state.cursor < state.runners.length) {
        $('runStatus').textContent = ['正在明确综合分析任务', '正在接入数据并执行隐私处理', '正在检查数据质量与可比性', '正在构建基础指标与发展时间轴', '正在开展分领域专项分析', '正在进行十维证据融合', '正在形成综合诊断与风险提示', '正在生成分层支持建议', '正在生成报告并执行质量复核'][state.cursor] || '正在研究';
        await state.runners[state.cursor](state.controller.signal);
        state.cursor += 1;
      }
      completeResearch();
    } catch (error) {
      if (error.name !== 'AbortError') {
        pauseTimer();
        state.running = false;
        $('errorMessage').hidden = false;
        $('errorMessage').textContent = `研究过程暂时中断：${error.message}`;
        return;
      }
      document.querySelectorAll('[data-transient="true"]').forEach((node) => node.remove());
      pauseTimer();
      state.running = false;
      state.stopped = true;
      $('runToolbar').className = 'v4-runbar is-stopped';
      $('runStatus').textContent = `研究已暂停 · 可从当前判断继续`;
      $('stopResearch').hidden = true;
      $('continueResearch').hidden = false;
      $('restartResearch').hidden = false;
      refreshIcons();
    }
  }

  function restartResearch() {
    state.controller?.abort();
    setTimeout(() => {
      state.running = false;
      state.stopped = false;
      state.cursor = 0;
      state.elapsedBeforeStart = 0;
      $('runElapsed').textContent = '00:00';
      $('agentStream').innerHTML = '';
      $('finishMessage').hidden = true;
      $('errorMessage').hidden = true;
      closeReportPreview();
      runResearch();
    }, state.reducedMotion ? 15 : 80);
  }

  function appendFollowup() {
    const input = $('followupInput');
    const text = input.value.trim();
    if (!text) return;
    const user = document.createElement('div');
    user.className = 'v4-followup-user';
    user.textContent = text;
    $('agentStream').appendChild(user);
    input.value = '';
    $('sendFollowup').disabled = true;
    const turn = createTurn(`followup-${Date.now()}`, { title: '追问已回应', meta: '基于当前证据范围' });
    const lead = turn.querySelector('.v4-turn-lead');
    if (/数学|一次函数|反例/.test(text)) {
      lead.textContent = '当前数学结论只落在一次函数具体任务。支持性记录、常规测评限制和两条反例已经保留在同一条证据链中，你可以继续查看原始记录。';
      turn.querySelector('.v4-turn-content').innerHTML = `<button class="v4-inline-action" type="button" data-open-evidence>${icon('link-2')}查看数学判断依据</button>`;
    } else if (/语文|作文|材料/.test(text)) {
      lead.textContent = '语文可以确认的变化集中在“材料支持观点”：前5篇均值3.10，后5篇3.68；人物描写仍只作为单篇过程观察，不扩大为语文学科整体结论。';
    } else {
      lead.textContent = '这个关注方向已记录。当前黄金样板会继续保持原有数据范围，不新增未经授权的数据，也不会越过现有证据形成新的学生判断。';
    }
    finishTurn(turn);
    refreshIcons();
    scrollLatest();
  }

  function bindEvents() {
    $('stopResearch').addEventListener('click', () => state.controller?.abort());
    $('continueResearch').addEventListener('click', runResearch);
    $('restartResearch').addEventListener('click', restartResearch);
    $('openReport').addEventListener('click', openReportPreview);
    $('closeReport').addEventListener('click', closeReportPreview);
    $('downloadReport').addEventListener('click', downloadReport);
    $('openEvidenceFromFinish').addEventListener('click', openEvidence);
    $('closeEvidence').addEventListener('click', () => $('evidenceDialog').close());
    $('sendFollowup').addEventListener('click', appendFollowup);
    $('followupInput').addEventListener('input', () => { $('sendFollowup').disabled = !$('followupInput').value.trim(); });
    $('followupInput').addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); appendFollowup(); }
    });
    $('agentStream').addEventListener('click', (event) => {
      const stageHeading = event.target.closest('.v4-stage-heading');
      if (stageHeading) {
        const stage = stageHeading.closest('.v4-research-stage');
        if (stage?.classList.contains('is-complete')) {
          stage.classList.toggle('is-collapsed');
          stageHeading.setAttribute('aria-expanded', String(!stage.classList.contains('is-collapsed')));
        }
        return;
      }
      const summary = event.target.closest('.v4-turn-summary');
      if (summary) {
        const turn = summary.closest('.v4-turn');
        turn.classList.toggle('is-expanded');
        summary.setAttribute('aria-expanded', String(turn.classList.contains('is-expanded')));
      }
      if (event.target.closest('[data-open-evidence]')) openEvidence();
    });
    $('evidenceDialog').addEventListener('click', (event) => {
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) event.currentTarget.close();
    });
    $('reportDialog').addEventListener('close', () => document.body.classList.remove('report-open'));
  }

  async function init() {
    const query = new URLSearchParams(location.search).get('q') || '林知遥本学期整体学习情况如何？';
    $('queryText').textContent = query;
    bindEvents();
    refreshIcons();
    try {
      const [data, trace, artifact] = await Promise.all([
        fetchJson('reports/lin-zhiyao/learning-data.json'),
        fetchJson('reports/lin-zhiyao/agent-trace.json'),
        fetchJson('reports/lin-zhiyao/artifact.json')
      ]);
      state.data = data;
      state.trace = trace;
      state.artifact = artifact;
      state.context = buildContext(data, trace);
      state.runners = [runFraming, runDataAccess, runDataQuality, runStructureMetrics, runDomainAnalysis, runEvidenceFusion, runDiagnosis, runLayeredSupport, runReportQuality];
      runResearch();
    } catch (error) {
      $('runStatus').textContent = '数据载入失败';
      $('errorMessage').hidden = false;
      $('errorMessage').textContent = `无法载入黄金样板数据：${error.message}`;
    }
  }

  init();
}());
