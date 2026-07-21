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
    turn = createTurn('research-canvas', { title: '综合学情研究已完成', meta: '5类数据来源 · 6组分析任务 · 184条证据记录' });
    turn.classList.add('v4-turn--canvas', 'is-spotlight');
    turn.querySelector('.v4-turn-lead').textContent = '我会把这个问题拆成数据覆盖、学科变化、任务表现、测评转化、订正保持和证据边界六类研究任务，并根据新发现动态调整分析计划。';
    turn.querySelector('.v4-turn-content').innerHTML = `<section class="v4-research-canvas"><header class="v4-canvas-head"><div><span>围绕教师问题开展学情研究</span><h2>林知遥本学期整体学习情况</h2></div><div class="v4-canvas-state"><i></i><span>正在组织分析</span></div></header><div class="v4-research-timeline" id="researchTimeline"></div><footer class="v4-canvas-foot"><span>${icon('shield-check')}可进行同口径比较 · 2,128条</span><span>${icon('book-open')}已形成证据记录 · 184条</span></footer></section>`;
    refreshIcons();
    return turn;
  }

  async function runFraming(signal) {
    compressCompleted();
    const turn = createTurn('framing', { title: '研究问题已界定', meta: '18周 · 低风险教学支持' });
    const lead = turn.querySelector('.v4-turn-lead');
    await streamText(lead, '这是一个综合学情研究任务。我会先建立可用数据范围，再按学科、课程内容、任务类型、评价来源和时间窗口组织分析；发现冲突时不会直接下结论，而会继续寻找限制性证据和反例。', signal);
    turn.querySelector('.v4-turn-content').innerHTML = `<div class="v4-research-contract"><div><span>研究对象</span><strong>本学期18周学习记录</strong></div><div><span>分析方法</span><strong>过程、结果与增值证据互证</strong></div><div><span>判断粒度</span><strong>落到学科内容与具体任务</strong></div><div><span>结果用途</span><strong>低风险教学支持</strong></div></div><div class="v4-boundary-note">${icon('shield-check')}<span>本次仅使用已授权学习数据；心理健康数据未调用；不同系统原始分不直接相加；结论只用于低风险教学支持。</span></div>`;
    await playActivity(turn.querySelector('.v4-turn-content'), '正在确认研究范围', [
      ['calendar-range', '确认研究时间', '本学期18周 · 覆盖17个教学周'],
      ['shield-check', '确认可用数据', '仅使用已授权的学习业务记录与课程信息'],
      ['circle-slash-2', '排除不适用数据', '心理健康数据未调用'],
      ['scale', '明确判断原则', '不同系统原始分不直接相加'],
      ['graduation-cap', '明确结果用途', '仅用于低风险教学支持与后续复查']
    ], signal);
    await wait(520, signal);
    finishTurn(turn);
  }

  async function runDataUniverse(signal) {
    compressCompleted();
    const context = state.context;
    const coverage = context.coverage;
    const turn = ensureResearchCanvas();
    const stage = appendStage('data-universe', '数据全景接入', '已连接5类教育数据', '跨系统读取');
    const content = stage.querySelector('.v4-stage-content');
    content.innerHTML = `<p class="v4-stage-copy">已同时调取题目级作答、考试分题、作文修改、教学日和课程映射。系统保留各类评价原有计分方式，再按教学周、学科内容和任务类型建立对应关系，不把不可比较的分数直接相加。</p><div class="v4-source-grid"></div><div class="v4-volume-note"><strong>${num(coverage.raw_learning_business_records)}</strong><span>条学习业务记录</span><i></i><span>${num(coverage.covered_weeks)}/18周覆盖</span><i></i><span>91个教学日</span><i></i><span>${num(coverage.curriculum_mapping_items)}条课程映射</span></div><div class="v4-lineage-flow"><span><b>01</b>汇集原始记录</span>${icon('arrow-right')}<span><b>02</b>核对题目与任务</span>${icon('arrow-right')}<span><b>03</b>对应课程内容</span>${icon('arrow-right')}<span><b>04</b>形成证据记录</span></div><details class="v4-tool"><summary>${icon('braces')}<strong>查看已接入信息</strong><span class="v4-tool-meta">知识点、首次作答、订正、复查、难度、年级分布、作文量规</span>${icon('chevron-down', 'v4-tool-chevron')}</summary><div class="v4-tool-body"><span><b>题目与作业</b>学科、知识点、任务类型、首次作答、订正、延时复查</span><span><b>考试评价</b>试题得分、难度、年级分布、有效分题时长</span><span><b>作文过程</b>量规版本、教师评分、AI复核、修改次数</span><span><b>课程内容</b>教材单元、学习内容、课程映射可靠程度</span></div></details>`;
    await playActivity(content, '正在汇集本学期学习数据', [
      ['notebook-pen', '调取智能作业', '2,843条题目级作答 · 186次作业'],
      ['file-chart-column', '调取考试评价', '524条分题得分 · 6次阶段测评'],
      ['scan-text', '调取AI作文及修改', '61条过程记录 · 14篇作文 · 47次修改'],
      ['calendar-days', '核对教学时间', '91个教学日 · 17/18个教学周有记录'],
      ['network', '读取课程对应关系', '212条课程映射 · 覆盖学科、单元和学习内容'],
      ['database', '汇总学习业务记录', '共3,428条，保留各系统原有评价单位'],
      ['copy-x', '排除重复记录', '发现并去除8条重复记录'],
      ['tag', '隔离缺少标签记录', '12条缺少学科或任务标签，暂不进入比较'],
      ['badge-check', '完成基础质量核验', '3,408条记录通过基础质检'],
      ['arrow-right-left', '建立可比较范围', '2,128条记录进入同口径比较']
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
    await wait(420, signal);
    commitStage(stage);
    finishTurn(turn);
  }

  async function runResearchIndex(signal) {
    const context = state.context;
    const stage = appendStage('research-index', '课程标准对照', '围绕问题组织分析内容', '已完成');
    stage.querySelector('.v4-stage-content').innerHTML = `<p class="v4-stage-copy">围绕教师提出的问题，按课程标准的“课程内容—学业要求—任务表现—评价证据”逐项对应，确保变化落到具体学习内容和任务表现，而不是停留在总分层面。</p><div class="v4-index-axis"><span>学科</span>${icon('chevron-right')}<span>课程内容</span>${icon('chevron-right')}<span>任务类型</span>${icon('chevron-right')}<span>评价来源</span>${icon('chevron-right')}<span>时间范围</span>${icon('chevron-right')}<span>订正与复查</span></div><div class="v4-standard-map"><div><span>数学 · 一次函数</span><strong>变量关系 → 函数表示 → 图像意义 → 情境应用</strong><small>作业、测评、订正与延时复查共同定位</small></div><div><span>语文 · 表达与交流</span><strong>观点 → 材料 → 解释 → 回扣</strong><small>作文量规与作文外开放任务相互印证</small></div></div><div class="v4-index-result"><div><strong>4/5</strong><span>学科达到分析所需的数据条件</span></div><div><strong>${num(context.coverage.same_criteria_records)}</strong><span>条记录可进行同口径比较</span></div><div><strong>${num(context.coverage.evidence_ledger_entries)}</strong><span>条记录进入证据记录</span></div></div>`;
    await playActivity(stage.querySelector('.v4-stage-content'), '正在对照课程标准组织分析', [
      ['book-open-check', '读取课程对应关系', '212条映射用于定位学科、单元和学习内容'],
      ['calculator', '定位数学分析内容', '一次函数 · 变量关系、图像意义与情境应用'],
      ['notebook-pen', '定位语文分析内容', '表达与交流 · 观点、材料、解释与回扣'],
      ['languages', '检查英语数据条件', '保留一般过去时语篇任务作为观察线索'],
      ['flask-conical', '检查物理数据条件', '保留实验控制条件表达作为观察线索'],
      ['list-checks', '完成分学科数据检查', '4/5学科达到分析所需的数据条件'],
      ['book-marked', '建立证据记录', '184条记录进入证据汇总，选取12条代表记录']
    ], signal);
    refreshIcons();
    await wait(1050, signal);
    commitStage(stage);
  }

  async function runParallelJobs(signal) {
    const context = state.context;
    const stage = appendStage('analysis-jobs', '并行分析', '已启动6组教育分析任务', '0/6');
    const content = stage.querySelector('.v4-stage-content');
    content.innerHTML = `<div class="v4-job-list"></div>`;
    const jobs = [
      ['数据质量与可比口径', '3,428 → 3,408 → 2,128', '去重、标签完整性、同口径筛选'],
      ['分学科数据充分性', '4/5学科通过', '道德与法治仅3周、22条有效作答'],
      ['数学一次函数任务对齐', '69.8% → 80.5%', '214条带标签同口径任务'],
      ['作文材料支持观点量规', `${context.earlyWriting.toFixed(2)} → ${context.lateWriting.toFixed(2)}`, '前5篇与后5篇同量规作文'],
      ['常规测评标准化比较', '0.08 → 0.11', '前3次与后3次 · 519条有效分题'],
      ['21天订正保持与错误复现', '119/384', '5类错误标签 · 同类任务复查']
    ];
    await playActivity(content, '正在同时开展6组分析', [
      ['shield-check', '核验数据质量与比较口径', '3,428 → 3,408 → 2,128'],
      ['library', '检查各学科数据是否充分', '4/5学科达到分析条件'],
      ['calculator', '比较数学一次函数任务', '前6周69.8% → 后6周80.5%'],
      ['pen-line', '比较作文材料支持观点', '前5篇3.10 → 后5篇3.68'],
      ['chart-no-axes-combined', '比较常规测评结果', '前3次0.08 → 后3次0.11'],
      ['history', '检查订正后的保持情况', '21天复查中119/384条同类错误再次出现']
    ], signal);
    for (let index = 0; index < jobs.length; index += 1) {
      const job = jobs[index];
      content.querySelector('.v4-job-list').insertAdjacentHTML('beforeend', `<div class="v4-job-row"><span class="v4-job-status">${icon('check')}</span><div><strong>${job[0]}</strong><small>${job[2]}</small></div><b>${job[1]}</b></div>`);
      stage.querySelector('.v4-stage-heading small').textContent = `${index + 1}/6`;
      refreshIcons();
      await wait(260, signal);
    }
    await wait(520, signal);
    commitStage(stage);
  }

  async function runDiscovery(signal) {
    const context = state.context;
    const stage = appendStage('discovery', '阶段发现', '总体评价结果相对稳定，内部出现两处具体变化', '计划已更新');
    stage.querySelector('.v4-stage-content').innerHTML = `<div class="v4-discovery-grid"><article><span>数学 · 一次函数具体任务</span><strong>${num(context.earlyMath.correct)}/${num(context.earlyMath.total)} → ${num(context.lateMath.correct)}/${num(context.lateMath.total)}</strong><small>前6周69.8% → 后6周80.5%，约提高11个百分点</small></article><article><span>语文 · 材料支持观点</span><strong>${context.earlyWriting.toFixed(2)} → ${context.lateWriting.toFixed(2)}</strong><small>作文修改过程与开放任务出现方向一致的变化</small></article></div><div class="v4-evidence-scan"><span><b>专项任务</b><strong>出现变化</strong></span><span><b>常规测评</b><strong>变化有限</strong></span><span><b>延时复查</b><strong>仍有错误复现</strong></span><span><b>反例复核</b><strong>发现限制证据</strong></span></div><div class="v4-conflict-callout">${icon('git-compare-arrows')}<div><span>发现证据不一致</span><strong>具体任务表现发生变化，但常规测评标准分仅由0.08变为0.11。</strong><p>暂不形成宽泛结论，继续核对同类任务、常规测评、延时复查和反例记录。</p></div></div>`;
    await playActivity(stage.querySelector('.v4-stage-content'), '正在检查各项结果是否一致', [
      ['trending-up', '发现数学专项变化', '67/96 → 95/118，正确率约提高11个百分点'],
      ['pen-line', '发现语文表达变化', '材料支持观点由3.10变为3.68'],
      ['chart-spline', '核对常规测评', '标准分均值仅由0.08变为0.11'],
      ['triangle-alert', '发现结果并不完全一致', '专项任务变化较明显，常规测评变化有限'],
      ['list-plus', '补充后续复查内容', '增加延时保持、反例和学科边界检查']
    ], signal);
    refreshIcons();
    await wait(1250, signal);
    commitStage(stage);
  }

  async function runMathCalibration(signal) {
    const context = state.context;
    const stage = appendStage('math-calibration', '综合研判', '数学一次函数变化信号', '正在复核');
    const content = stage.querySelector('.v4-stage-content');
    content.innerHTML = `<div class="v4-judgment-chain"></div>`;
    const chain = content.querySelector('.v4-judgment-chain');
    await playActivity(content, '正在复核数学一次函数判断', [
      ['search', '读取一次函数同口径任务', '214条带标签任务进入专项复核'],
      ['badge-check', '核对支持性记录', 'HW-MATH-FUNC-041、EX-MATH-FUNC-018、HW-MATH-FUNC-063'],
      ['chart-no-axes-combined', '核对阶段测评转化', '前3次0.08 → 后3次0.11，变化有限'],
      ['history', '检查21天延时复查', '119/384条同类错误再次出现'],
      ['search-check', '主动查找数学反例', '检出HW-MATH-U07-034、HW-MATH-U12-019'],
      ['scale', '重新确定判断范围', '支持具体任务变化，不支持扩大为数学整体提升'],
      ['target', '形成校准后判断', '常规测评转化和延时保持仍需继续复查']
    ], signal);
    const steps = [
      `<div class="v4-chain-step is-initial"><span>${icon('circle-dot')}</span><div><small>初步判断 · 待核验</small><strong>一次函数情境与综合应用任务出现改善信号</strong></div></div>`,
      `<div class="v4-chain-step is-support"><span>${icon('check')}</span><div><small>同口径专项证据</small><strong>前6周 ${num(context.earlyMath.correct)}/${num(context.earlyMath.total)}（69.8%） → 后6周 ${num(context.lateMath.correct)}/${num(context.lateMath.total)}（80.5%）</strong><p>214条带标签任务，约提高11个百分点。</p></div></div>`,
      `<div class="v4-chain-step is-limit"><span>${icon('alert-circle')}</span><div><small>限制性证据 · 常规测评</small><strong>前3次标准分均值 0.08 → 后3次 0.11</strong><p>变化有限，尚未形成明显的测评转化。</p></div></div>`,
      `<div class="v4-chain-step is-review"><span>${icon('search')}</span><div><small>延时复查与反例</small><strong>21天复查中119/384条同类错误再次出现；另检出2条数学反例</strong><p>不能把专项变化直接解释为稳定保持或数学学科整体提升。</p></div></div>`,
      `<div class="v4-chain-step is-revision"><span>${icon('refresh-cw')}</span><div><small>研判依据更新</small><strong>根据不同来源的核对结果，主动收窄结论范围</strong></div></div>`,
      `<div class="v4-chain-step is-final"><span>${icon('target')}</span><div><small>校准后判断</small><strong>可以确认的变化集中在数学一次函数情境与综合应用任务；常规测评转化和延时保持仍需复查，暂不扩大为数学学科整体提升。</strong><button class="v4-inline-action" type="button" data-open-evidence>${icon('link-2')}查看本次判断依据</button></div></div>`
    ];
    for (const step of steps) {
      chain.insertAdjacentHTML('beforeend', step);
      refreshIcons();
      await wait(430, signal);
    }
    stage.querySelector('.v4-stage-heading small').textContent = '结论已校准';
    await wait(620, signal);
    commitStage(stage);
  }

  async function runCrossSourceReview(signal) {
    const stage = appendStage('cross-source', '复查分析', '跨学科、跨来源逐项复核', '明确判断边界');
    stage.querySelector('.v4-stage-content').innerHTML = `<p class="v4-stage-copy">把过程表现、阶段结果和限制性证据放在一起核对。只有不同来源在相同课程内容和时间范围内方向一致，才形成有限判断。</p><div class="v4-cross-matrix"><div class="v4-cross-row"><span>数学</span><strong>同口径任务 × 阶段测评 × 延时复查</strong><b class="is-support">支持具体任务变化，保持情况待复查</b></div><div class="v4-cross-row"><span>语文</span><strong>作文量规 × 修改过程 × 开放作业</strong><b class="is-support">方向一致，较强支持材料表达变化</b></div><div class="v4-cross-row"><span>英语</span><strong>日常作业 × 语篇语法任务</strong><b>仅保留一般过去时波动线索</b></div><div class="v4-cross-row"><span>物理</span><strong>实验作业 × 控制条件表达</strong><b>仅保留探究表达观察线索</b></div><div class="v4-cross-row"><span>作答节奏</span><strong>数字化考试分题时长</strong><b class="is-stop">仅2次有效记录，停止判断</b></div></div><div class="v4-hypothesis-head"><span>可能原因逐项复核</span><small>同时查看支持证据、反例和数据是否充分</small></div><div class="v4-hypothesis-list"><article><span>部分订正内容保持不稳定</span><strong>有一定支持</strong><small>6条支持证据 · 2条反例 · 保留为可能因素之一</small></article><article><span>本学期试卷整体变难</span><strong>暂不支持</strong><small>2条支持证据 · 4条反例 · 不作为主要解释</small></article><article><span>作答节奏影响成绩转化</span><strong>证据不足</strong><small>只有2次有效分题时长 · 停止判断</small></article></div><div class="v4-boundary-strip"><span>${icon('check-circle-2')}语文、数学可做有限学期观察</span><span>${icon('eye')}英语、物理仅保留观察线索</span><span>${icon('minus-circle')}道德与法治仅3周、22条有效作答，停止判断</span></div>`;
    await playActivity(stage.querySelector('.v4-stage-content'), '正在逐项核对判断边界', [
      ['calculator', '核对数学多类证据', '专项任务、阶段测评、订正记录和延时复查'],
      ['notebook-pen', '核对语文多类证据', '10篇同量规作文与作文外开放任务方向一致'],
      ['languages', '检查英语记录', 'HW-EN-GRAM-052仅支持一般过去时波动线索'],
      ['flask-conical', '检查物理记录', 'HW-PHY-INQ-017仅支持控制条件表达观察'],
      ['landmark', '检查道德与法治数据', '仅3周、22条有效作答，停止学期判断'],
      ['timer-off', '检查作答节奏数据', '仅2次有效分题时长，停止判断'],
      ['shield-check', '完成判断边界复核', '数学、语文有限判断；英语、物理仅作观察']
    ], signal);
    refreshIcons();
    await wait(1400, signal);
    commitStage(stage);
  }

  async function runPlanAndSupport(signal) {
    const stage = appendStage('plan-support', '研究计划更新', '结论、教学支持与复查条件已经绑定', '可执行');
    stage.querySelector('.v4-stage-content').innerHTML = `<div class="v4-plan-grid"><div class="v4-plan-column"><h4>研究范围调整</h4><div class="v4-plan-item is-keep">${icon('check-circle-2')}<span><b>继续</b>数学具体内容的间隔与变式复查；语文材料与观点关系复查。</span></div><div class="v4-plan-item is-stop">${icon('minus-circle')}<span><b>停止</b>作答节奏和道德与法治学期判断。</span></div><div class="v4-plan-item is-watch">${icon('eye')}<span><b>观察</b>英语一般过去时、物理实验控制条件。</span></div></div><div class="v4-plan-column"><h4>两周教学支持</h4><div class="v4-plan-item is-keep">${icon('calculator')}<span><b>数学</b>更换数字、字母或情境，复查变量、条件和交点意义。</span></div><div class="v4-plan-item is-keep">${icon('notebook-pen')}<span><b>语文</b>用作文以外开放任务复查“观点—材料—解释—回扣”。</span></div><div class="v4-plan-item is-watch">${icon('calendar-check-2')}<span><b>复查</b>第2、7、14天；不增加每日作业总时长。</span></div></div></div><div class="v4-final-boundary">${icon('shield-check')}支持结果用于调整任务设计与课堂支架，不用于定级、排名或评价学生优劣。</div>`;
    await playActivity(stage.querySelector('.v4-stage-content'), '正在形成教学支持与复查安排', [
      ['calculator', '生成数学支持重点', '变式任务复查变量、条件与交点的实际意义'],
      ['notebook-pen', '生成语文支持重点', '用开放任务复查“观点—材料—解释—回扣”'],
      ['calendar-check-2', '安排后续复查', '第2、7、14天，不增加每日作业总时长'],
      ['eye', '保留观察项目', '英语一般过去时、物理实验控制条件'],
      ['circle-stop', '保留停止判断项目', '道德与法治学期表现、作答节奏'],
      ['file-check-2', '完成研究报告', '两周支持方案 · 12条代表记录 · 184条证据记录']
    ], signal);
    refreshIcons();
    await wait(1350, signal);
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
    const sections = (doc.sections || []).filter((section) => section.id !== 'appendix');
    const appendixSection = (doc.sections || []).find((section) => section.id === 'appendix');
    const summary = (doc.executive_summary || []).map((paragraph) => `<p>${reportText(paragraph)}</p>`).join('');
    let tableIndex = 1;
    const body = sections.map((section) => {
      const tables = (section.tables || []).map((table) => reportTable(table, tableIndex++)).join('');
      const subsections = (section.subsections || []).map((subsection) => `<section class="golden-report-subsection"><h3>${esc(subsection.title)}</h3>${(subsection.paragraphs || []).map((paragraph) => `<p>${reportText(paragraph)}</p>`).join('')}${(subsection.tables || []).map((table) => reportTable(table, tableIndex++)).join('')}</section>`).join('');
      return `<section class="golden-report-section" id="report-section-${esc(section.id)}"><div class="golden-report-chapter-kicker">${esc(section.number)} · 研究报告正文</div><h2>${esc(section.title)}</h2>${(section.paragraphs || []).map((paragraph) => `<p>${reportText(paragraph)}</p>`).join('')}${tables}${subsections}</section>`;
    }).join('');
    const appendixHtml = reportAppendix(doc.appendix, appendixSection);
    $('reportDocument').innerHTML = `<article class="golden-report"><div class="golden-report-running-head"><span>飞象教育 · 学情分析</span><span>林知遥本学期整体学习情况分析报告</span></div><header id="report-cover" class="golden-report-cover"><div class="golden-report-brand"><span class="golden-report-mark">飞</span><span>飞象教育 · 学情分析</span></div><div class="golden-report-cover-rule"></div><div class="golden-eyebrow">${esc(doc.cover.generated_label)}</div><h1>${esc(doc.cover.title)}</h1><p class="golden-report-subtitle">${esc(doc.cover.subtitle)}</p><div class="golden-report-cover-meta"><span>研究对象</span><strong>林知遥 · 八年级（3）班</strong><span>研究期间</span><strong>2025—2026 学年第二学期 · 18 周</strong><span>报告用途</span><strong>低风险教学支持与后续复查</strong></div><p class="golden-report-boundary">${esc(doc.cover.boundary)}</p></header><section class="golden-report-titlepage"><div class="golden-report-chapter-kicker">研究说明</div><h2>本报告回答什么问题</h2><p>本报告围绕“林知遥本学期整体学习情况如何？”展开，仅使用本学期已授权的学习业务记录、课程映射和教学覆盖背景。</p><dl><dt>数据处理</dt><dd>3,428 条学习业务记录 → 3,408 条通过基础质检 → 2,128 条进入同口径比较 → 184 条证据账本 → 12 条代表记录</dd><dt>数据边界</dt><dd>心理健康数据未调用；道德与法治、作答节奏等证据不足项目保留为停止判断。</dd><dt>阅读方式</dt><dd>正文先给出学习表现和教学含义，随后说明数据口径、具体案例、限制条件与证据来源。</dd></dl></section><section class="golden-report-summary" id="report-summary"><div class="golden-report-chapter-kicker">执行摘要</div><h2>先看可以确认的变化</h2>${summary}</section>${body}${appendixHtml}<footer class="golden-report-footer"><span>飞象教育 · 整体学习情况分析报告</span><span>仅用于低风险教学支持</span><span class="golden-report-page-number">页面可打印</span></footer></article>`;
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
    const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>林知遥本学期整体学习情况分析报告</title><link rel="stylesheet" href="assets/research-golden.css"></head><body><main class="report-page"><div>${article}</div></main></body></html>`;
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = '林知遥本学期整体学习情况分析报告.html';
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
        $('runStatus').textContent = ['正在界定研究问题', '正在接入全景学习数据', '正在建立多维研究索引', '正在并行执行6组分析', '正在识别跨来源矛盾', '正在校准数学研判', '正在复查假设与证据边界', '正在形成教学支持'][state.cursor] || '正在研究';
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
      state.runners = [runFraming, runDataUniverse, runResearchIndex, runParallelJobs, runDiscovery, runMathCalibration, runCrossSourceReview, runPlanAndSupport];
      runResearch();
    } catch (error) {
      $('runStatus').textContent = '数据载入失败';
      $('errorMessage').hidden = false;
      $('errorMessage').textContent = `无法载入黄金样板数据：${error.message}`;
    }
  }

  init();
}());
