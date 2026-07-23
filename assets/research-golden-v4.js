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

  const demoProfile = {
    sourceRows: [
      ['数学', '58次 / 1,026条', '146条', '744条', '专项、测评、订正与复查'],
      ['语文', '37次 / 612条', '128条', '458条', '开放任务、考试与作文互证'],
      ['英语', '49次 / 733条', '137条', '573条', '任务异质性较高，仅保留线索'],
      ['物理', '29次 / 384条', '91条', '331条', '单项探究表达仅作观察'],
      ['道德与法治', '13次 / 88条', '22条', '22条', '仅3周有效记录，停止学期判断']
    ],
    mathSeries: [
      ['前6周', 67, 96, '69.8%'],
      ['中6周', 82, 108, '75.9%'],
      ['后6周', 95, 118, '80.5%']
    ],
    writingScores: ['3.00', '3.10', '3.00', '3.20', '3.20', '3.50', '3.60', '3.70', '3.80', '3.80'],
    assessmentScores: ['0.04', '0.09', '0.11', '0.07', '0.12', '0.14'],
    retentionRows: [
      ['方程移项符号', '31', '运算规则在延时任务中再次出错'],
      ['函数条件与范围', '29', '变量范围表达保持不稳定'],
      ['图像交点意义', '24', '情境解释尚未稳定'],
      ['材料与观点关系', '21', '解释与回扣在新材料中仍有遗漏'],
      ['控制条件表达', '14', '物理单项线索，仅作观察']
    ],
    evidenceLedger: [
      ['支持性证据', 78, '支持具体变化或改进成效'],
      ['限制性证据', 61, '限制结论范围或可信程度'],
      ['反例记录', 19, '主动检验初步判断是否过度'],
      ['边界记录', 26, '说明数据缺失与停止判断条件']
    ]
  };

  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
  const num = (value) => Number(value ?? 0).toLocaleString('zh-CN');
  const icon = (name, className = '') => `<i data-lucide="${name}"${className ? ` class="${className}"` : ''}></i>`;
  const analysisTable = (headers, rows, label = '') => `<div class="v4-analysis-table"${label ? ` aria-label="${esc(label)}"` : ''}><table><thead><tr>${headers.map((item) => `<th>${esc(item)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((item) => `<td>${esc(item)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
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

  function scrollLatest(force = false) {
    const scroll = () => {
      const nearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 220;
      if (force || nearBottom || state.quick) {
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: state.reducedMotion ? 'auto' : 'smooth' });
      }
    };
    if (force) {
      requestAnimationFrame(() => requestAnimationFrame(scroll));
      return;
    }
    scroll();
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
    turn = createTurn('research-canvas', { title: '学生学期发展综合分析已完成', meta: '7步分析流程 · 6个报告板块' });
    turn.classList.add('v4-turn--canvas', 'is-spotlight');
    turn.querySelector('.v4-turn-lead').textContent = '我将先汇总并核验本学期多源教育数据，再依次分析学科表现、定位具体问题、检验学习过程与改进成效，形成综合评估、协同支持方案和审核后的学习报告。数据不足的内容只说明缺口，不替学生作判断。';
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
      ['04', '学习过程与改进成效', '有订正保持证据，缺少完整投入度数据', '有限', 'is-medium'],
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

  async function runGatherStudentDataV2(signal) {
    compressCompleted();
    const context = state.context;
    const coverage = context.coverage;
    const turn = ensureResearchCanvas();
    const stage = appendStage('gather-student-data', '第一步 · 调取并汇总学生发展数据', '形成学生学期数据概览和数据质量说明', '3,408条通过');
    const content = stage.querySelector('.v4-stage-content');
    content.innerHTML = `<p class="v4-stage-copy">先形成“学生基本情况与数据说明”：本轮分析对象为八年级林知遥，周期为2025—2026学年第二学期，数据范围覆盖语文作文、数学与英语作业、相关考试、出勤/阅读等学习过程记录。随后说明哪些记录通过质检、哪些记录被剔除或隔离，以及本轮结论的可信范围。</p><div class="v4-research-contract"><div><span>学生与学段</span><strong>林知遥 · 八年级</strong></div><div><span>分析周期</span><strong>2025—2026学年第二学期 · 18周</strong></div><div><span>报告用途</span><strong>教学支持与后续复查</strong></div><div><span>可信口径</span><strong>同口径比较 · 证据不足则停止判断</strong></div></div><div class="v4-source-grid"><article class="v4-source-card">${icon('notebook-pen')}<span>智能作业</span><strong>186次作业</strong><small>2,843条数学、英语等题目级作答</small></article><article class="v4-source-card">${icon('file-chart-column')}<span>相关考试</span><strong>6次阶段测评</strong><small>524条分题得分，保留原始量尺</small></article><article class="v4-source-card">${icon('scan-text')}<span>语文作文</span><strong>14篇作文</strong><small>47次修改，形成61条过程记录</small></article><article class="v4-source-card">${icon('calendar-days')}<span>学习过程</span><strong>91个教学日</strong><small>17/18周有记录，阅读打卡连续性不足</small></article><article class="v4-source-card">${icon('network')}<span>课程映射</span><strong>${num(coverage.curriculum_mapping_items)}条</strong><small>关联学科、单元、知识内容和任务类型</small></article></div><div class="v4-index-result v4-data-ledger"><div><strong>3,428</strong><span>学习业务记录</span></div><div><strong>3,408</strong><span>通过基础质检</span></div><div><strong>2,128</strong><span>同口径比较记录</span></div><div><strong>184</strong><span>证据记录</span></div><div><strong>12</strong><span>代表证据</span></div></div><div class="v4-triple-note"><article><b>数据来源</b><p>智能作业2,843条、考试评价524条、AI作文及修改61条，并接入91个教学日、212条课程内容映射；其中作业侧对应186次任务，作文侧对应14篇作文和47次修改。</p></article><article><b>质量处理</b><p>完成完整性、连续性和可比性检查；去除重复记录8条，隔离缺少学科或任务标签记录12条，保留作业、作文量规和考试标准分的原始评价单位。</p></article><article><b>分析边界</b><p>个人敏感信息在画布中脱敏；心理健康数据未调用。体育、社会参与、志愿服务和研学数据本轮未达到判断条件；阅读打卡连续性不足，只说明缺口，不替代事实。</p></article></div><div class="v4-boundary-strip"><span>${icon('shield-check')}阶段结果：形成学生学期数据概览和数据质量说明。后续分析只使用通过质检且具备比较条件的数据，不能由缺失数据推导学生判断。</span></div>`;
    await playActivity(content, '正在调取并汇总学生发展数据', [
      ['user-round-check', '确认分析对象与报告用途', '八年级第二学期 · 用于教学支持与后续复查'],
      ['notebook-pen', '调取智能作业记录', '186次作业 · 2,843条题目级作答'],
      ['file-chart-column', '调取考试评价记录', '6次阶段测评 · 524条分题得分'],
      ['scan-text', '调取作文及修改过程', '14篇作文 · 47次修改 · 61条过程记录'],
      ['calendar-days', '调取出勤与阅读打卡等过程数据', '91个教学日 · 阅读连续记录不足，仅说明缺口'],
      ['network', '关联课程学习内容', '212条课程映射保留学科、单元和任务关系'],
      ['calendar-check-2', '检查完整性、连续性和可比性', '按学科、任务、时间和评价口径逐项筛选'],
      ['copy-x', '检查重复与标签缺失', '去除8条重复记录 · 隔离12条缺标签记录'],
      ['arrow-right-left', '建立可比数据范围', '3,428 → 3,408 → 2,128'],
      ['shield-check', '完成脱敏与范围说明', '只读取最小必要字段，缺失数据不替代事实']
    ], signal);
    refreshIcons();
    await wait(950, signal);
    commitStage(stage);
    finishTurn(turn);
  }

  async function runSubjectPerformanceV2(signal) {
    const context = state.context;
    const stage = appendStage('subject-performance', '第二步 · 分析各学科学习表现与变化', '形成语文、数学、英语学科学习分析', '语文 · 数学 · 英语');
    const content = stage.querySelector('.v4-stage-content');
    content.innerHTML = `<p class="v4-stage-copy">语文、数学、英语分别按各自评价单位分析，不把作文量规、题目正确率和考试标准分直接相加。系统沿学期时间轴比较阶段变化，同时核对日常作业与考试表现是否一致，最后只保留能落到具体文体、知识内容或任务类型的判断。</p><div class="v4-discovery-grid"><article><span>数学 · 一次函数具体任务</span><strong>${num(context.earlyMath.correct)}/${num(context.earlyMath.total)} → ${num(context.lateMath.correct)}/${num(context.lateMath.total)}</strong><small>前6周69.8% → 中6周75.9% → 后6周80.5%；连续抬升但测评转化有限</small></article><article><span>语文 · 材料支持观点</span><strong>${context.earlyWriting.toFixed(2)} → ${context.lateWriting.toFixed(2)}</strong><small>10篇同量规作文逐篇值：${demoProfile.writingScores.join(' / ')}</small></article></div>${analysisTable(['学科', '文档要求', '本轮分析动作', '阶段发现'], [['语文', '不同文体作文得分、评语和表现变化', '比较14篇作文、47次修改、教师评语与量规维度', '材料支持观点前5篇3.10 → 后5篇3.68'], ['语文', '比较作文一稿与二稿修改情况', '追踪WR-003-REV-02中材料替换、观点解释和二稿回扣', '反馈吸收有具体证据'], ['数学', '作业正确情况及阶段性变化', '按一次函数同口径任务分前/中/后三段', '67/96 → 82/108 → 95/118'], ['数学', '错误集中的知识内容和题目类型', '定位变量关系、函数图像意义、参数变化、移项符号', '问题集中在情境解释和保持'], ['数学', '结合作业与考试表现', '专项任务与常规测评标准分并列核对', '0.08 → 0.11，综合转化有限'], ['英语', '作业正确情况、稳定程度与综合运用', '检查一般过去时语篇任务及相关作业/考试口径', '只保留HW-EN-GRAM-052波动线索']], 'V2 第二步学科分析清单')}<div class="v4-cross-matrix"><div class="v4-cross-row"><span>语文</span><strong>作文量规 × 一二稿修改 × 教师反馈 × 开放任务</strong><b class="is-support">提炼写作亮点、问题与阶段变化</b></div><div class="v4-cross-row"><span>数学</span><strong>日常作业 × 阶段测评 × 订正 × 延时复查</strong><b class="is-support">识别正确率变化和错误集中点</b></div><div class="v4-cross-row"><span>英语</span><strong>作业稳定性 × 语篇语法任务 × 考试口径</strong><b>只作观察，不扩大为学期结论</b></div><div class="v4-cross-row"><span>阶段结果</span><strong>形成语文、数学、英语学科学习分析</strong><b class="is-support">保留原量尺和证据边界</b></div></div>`;
    await playActivity(content, '正在分析各学科学习表现与变化', [
      ['notebook-pen', '比较语文作文量规', '前5篇3.10 → 后5篇3.68'],
      ['message-square-text', '读取作文评语与文体表现', '定位观点、材料、解释、回扣四类表达维度'],
      ['git-compare', '核对一稿与修改过程', 'WR-003-REV-02显示材料与观点关系得到调整'],
      ['file-check-2', '复核作文外开放任务', 'HW-CN-OPEN-061与作文变化方向一致'],
      ['calculator', '比较数学阶段表现', '一次函数前6周67/96 → 后6周95/118'],
      ['list-filter', '识别数学错误集中内容', '变量关系、图像意义、参数变化和移项符号'],
      ['chart-no-axes-combined', '核对数学测评转化', '常规测评前3次0.08 → 后3次0.11'],
      ['languages', '检查英语任务稳定性与考试口径', 'HW-EN-GRAM-052仅支持一般过去时波动线索'],
      ['arrow-right-left', '比对日常与综合任务', '专项任务变化较明显，综合评价转化有限'],
      ['calendar-range', '识别阶段变化与转折', '只保留有连续数据支持的变化']
    ], signal);
    refreshIcons();
    await wait(1100, signal);
    commitStage(stage);
  }

  async function runProblemLocalizationV2(signal) {
    const stage = appendStage('problem-localization', '第三步 · 定位各学科主要学习问题', '形成主要学习问题清单及分析依据', '2项重点 · 2项观察');
    const content = stage.querySelector('.v4-stage-content');
    content.innerHTML = `<p class="v4-stage-copy">把“哪里出问题”拆到学科、时间段、具体内容和任务类型，而不是给学生下笼统判断。每项问题都按“问题表现—具体数据—出现时间—涉及内容—变化情况—可能影响因素”呈现，并区分偶发、反复、持续；可能因素只作为教学假设，不写成学生标签。</p>${analysisTable(['问题表现', '具体数据', '出现时间', '涉及内容', '变化情况', '可能影响因素 / 处理'], [['订正后保持不稳定', '21天复查119/384复现', '全学期延时复查', '方程移项符号、函数图像意义等5类标签', '即时订正后仍有延时复现', '间隔巩固不足 · 优先复查'], ['专项到测评转化有限', '69.8%→80.5%；0.08→0.11', '一次函数学习后段', '情境应用、综合评价任务', '专项变化明显，测评变化有限', '任务综合度不同 · 优先跟踪'], ['一般过去时波动', 'HW-EN-GRAM-052', 'Last Sunday语篇任务', '英语语篇语法', '单项出现', '偶发线索 · 不作学期结论'], ['控制条件表达遗漏', 'HW-PHY-INQ-017', '滑动摩擦力实验任务', '物理实验结论表达', '单项出现', '偶发线索 · 仅作观察']], '主要学习问题清单及分析依据')}<div class="v4-hypothesis-list"><article><span>尚未掌握 / 掌握不稳 / 迁移运用困难</span><strong>三类问题分开处理</strong><small>一次函数基础、情境解释、综合应用和订正保持分别核对，不把所有错误混为“基础薄弱”。</small></article><article><span>多项数据支持</span><strong>作业、考试、教师反馈、订正复查共同验证</strong><small>只有能被多次或不同类型数据支持的问题，才进入优先改进清单。</small></article><article><span>数据不足说明</span><strong>投入不足、非知识性失误暂不判断</strong><small>缺少稳定过程证据，本轮只说明边界，不作归因。</small></article></div><div class="v4-boundary-strip"><span>${icon('scale')}阶段结果：形成2项优先问题与2项观察线索；不使用“粗心、态度、能力”等标签化归因。</span></div>`;
    await playActivity(content, '正在定位主要学习问题并核对依据', [
      ['list-filter', '按学科和时间定位问题', '问题落到具体周次、知识内容和任务类型'],
      ['repeat-2', '识别反复出现的问题', '21天复查119/384条同类错误再次出现'],
      ['chart-no-axes-combined', '识别阶段性转化差异', '专项变化明显，常规测评变化有限'],
      ['tags', '区分问题性质', '尚未掌握、掌握不稳定、迁移运用困难和非知识性失误分别处理'],
      ['files', '对照作业、考试和教师评语', '多项数据共同支持才进入主要问题清单'],
      ['circle-help', '分析可能影响因素', '只作为待验证教学假设，不写成学生标签'],
      ['search-check', '查找反例与限制证据', '检出2条数学反例，主动收窄结论'],
      ['circle-dashed', '标记偶发观察线索', '英语与物理各仅1项代表记录'],
      ['shield-check', '停止证据不足的归因', '非知识性失误和投入不足均不作判断']
    ], signal);
    refreshIcons();
    await wait(1200, signal);
    commitStage(stage);
  }

  async function runLearningProcessV2(signal) {
    const stage = appendStage('learning-process', '第四步 · 分析学习过程与学习状态', '形成学习过程与改进成效分析', '订正 · 修改 · 复查');
    const content = stage.querySelector('.v4-stage-content');
    content.innerHTML = `<p class="v4-stage-copy">把作业完成、提交连续性、订正、作文修改、教师反馈、阅读打卡和延时复查放在同一条过程链里，判断结果变化是否来自稳定学习过程。过程证据不足时，系统不会把成绩波动解释为投入不足或自我管理问题。</p>${analysisTable(['过程维度', '本轮证据', '分析判断'], [['作业完成与订正', '186次作业；保留首次作答、订正与复查链条', '可以分析订正后保持情况'], ['作业提交连续性', '17/18个教学周有学习记录', '支持学期过程观察，但不推断每日投入'], ['阅读打卡频次与持续性', '记录未形成可靠连续链条', '只说明缺口，不判断阅读习惯'], ['作文反馈落实', 'WR-003-REV-02；14篇作文、47次修改', '部分反馈能够进入二稿表达'], ['过程与结果一致性', '数学专项提升，常规测评变化有限', '存在任务转化待核实现象']], 'V2 第四步学习过程与状态检查')} ${analysisTable(['延时复现标签', '复现条数', '过程解释'], demoProfile.retentionRows, '21天订正保持复查的错误分布')}<div class="v4-volume-note"><strong>119/384</strong><span>同类错误延时复现</span><i></i><span>5类标签</span><i></i><span>第2、7、14天复查</span></div><div class="v4-cross-matrix"><div class="v4-cross-row"><span>知识不会</span><strong>需同时出现首次错误、订正困难和复查不通过</strong><b>当前只对具体内容保留</b></div><div class="v4-cross-row"><span>掌握不稳</span><strong>即时订正后，延时复查仍有119/384复现</strong><b class="is-support">作为优先支持点</b></div><div class="v4-cross-row"><span>综合运用困难</span><strong>专项练习变化明显，常规测评变化有限</strong><b>继续核实任务转化</b></div><div class="v4-cross-row"><span>投入不足</span><strong>阅读、作答节奏等连续证据不足</strong><b class="is-stop">停止判断</b></div></div><div class="v4-final-boundary">${icon('badge-check')}阶段结果：形成学生学习过程与学习状态分析；可以确认“部分反馈已落实”“订正后保持不稳”“专项到综合任务转化有限”，尚不能确认“投入不足”。</div>`;
    await playActivity(content, '正在分析学习过程与学习状态', [
      ['clipboard-list', '分析作业完成、订正和反馈落实', '首次作答、订正、教师反馈和复查链条一并保留'],
      ['calendar-check-2', '分析作业提交连续性', '17/18个教学周有记录，但不推断每日投入'],
      ['book-open', '检查阅读打卡频次和持续性', '连续过程证据不足，只说明缺口'],
      ['history', '连接首次作答与订正记录', '保留错误、修改和反馈落实过程'],
      ['scan-text', '检查作文反馈吸收', 'WR-003-REV-02显示材料与观点关系得到修订'],
      ['book-open-check', '分析过程与学业结果是否一致', '作文反馈落实较清楚，数学测评转化仍需复核'],
      ['calendar-clock', '执行21天延时复查', '119/384条同类错误再次出现'],
      ['arrow-right-left', '比较专项与综合任务', '专项变化尚未稳定进入常规测评'],
      ['timer-off', '检查作答节奏证据', '仅2次有效分题时长，停止判断'],
      ['badge-check', '区分知识不会、掌握不稳和投入不足', '只确认有证据支持的过程判断']
    ], signal);
    refreshIcons();
    await wait(1200, signal);
    commitStage(stage);
  }

  async function runComprehensiveEvaluationV2(signal) {
    const stage = appendStage('comprehensive-evaluation', '第五步 · 评估综合学业表现', '形成学生学期发展综合分析结论', '2项优势 · 2项重点');
    const content = stage.querySelector('.v4-stage-content');
    content.innerHTML = `<div class="v4-discovery-grid"><article><span>主要优势 01 · 有限至中等可信</span><strong>数学一次函数具体任务出现阶段变化</strong><small>前6周69.8% → 中6周75.9% → 后6周80.5%；结论不扩大到数学整体</small></article><article><span>主要优势 02 · 中等可信</span><strong>语文材料支持观点的表现增强</strong><small>10篇同量规作文3.10 → 3.68，并有修改过程与开放任务印证</small></article></div>${analysisTable(['V2 评估项', '本轮判断', '依据与可信程度'], [['整体学习表现', '总体评价结果相对稳定，内部出现两处具体变化', '3,408条通过质检；2,128条可比记录；结论限于低风险教学支持'], ['2—3项主要优势', '数学一次函数具体任务变化；语文材料支持观点增强', '均有多次记录或不同类型数据支持'], ['2—3项优先改进问题', '订正后的稳定保持；专项表现向综合任务转化', '21天复查119/384；常规测评0.08→0.11'], ['各学科趋势和稳定程度', '语文、数学有具体变化；英语仅观察线索', '不以记录量替代连续同类证据'], ['阅读理解、语言表达、逻辑思考、知识运用共同特点', '语言表达与数学情境解释均涉及“证据/条件—结论”关系', '跨学科共同特点证据有限，只作为待验证线索'], ['数据依据与可信程度', '数据基础较充分，学科结论有限至中等', '184条证据记录；12条代表证据；19条反例/边界记录'], ['需补充信息', '阅读打卡连续性、更多综合任务、后续复查数据', '不补数据则不扩大判断']], 'V2 第五步综合评估清单')}<div class="v4-hypothesis-list"><article><span>优先改进 01</span><strong>提高订正后的稳定保持</strong><small>21天复查119/384条同类错误复现 · 建议第2、7、14天复查</small></article><article><span>优先改进 02</span><strong>检验专项表现能否转化为综合任务</strong><small>常规测评0.08 → 0.11 · 需要更多变式和情境任务验证</small></article><article><span>证据账本 · 184条</span><strong>78支持 / 61限制 / 19反例 / 26边界</strong><small>从中选取12条代表证据进入报告。</small></article></div><div class="v4-boundary-strip"><span>${icon('shield-check')}阶段结果：形成学生学期发展综合分析结论；跨学科结论需要两个及以上学科连续证据，当前只保留待验证线索。</span></div>`;
    await playActivity(content, '正在评估综合学业表现', [
      ['sparkles', '提炼主要优势', '只保留多次、不同类型数据共同支持的变化'],
      ['triangle-alert', '识别优先改进问题', '订正保持与综合任务转化进入优先级'],
      ['chart-no-axes-combined', '判断发展趋势与稳定程度', '区分持续变化、阶段差异和偶发线索'],
      ['languages', '分析阅读理解、语言表达、逻辑思考和知识运用共同特点', '仅形成“证据/条件—结论”关系的待验证线索'],
      ['badge-check', '标明重要结论的数据依据和可信程度', '数据基础较充分，学科结论有限至中等'],
      ['circle-help', '列出需要补充的问题', '阅读连续性、更多学科任务和后续复查'],
      ['scale', '形成综合学业结论', '不计算综合总分，不用单项表现替代整体判断']
    ], signal);
    refreshIcons();
    await wait(1250, signal);
    commitStage(stage);
  }

  async function runLayeredSupport(signal) {
    const stage = appendStage('layered-support', '第六步 · 提出针对性改进建议', '形成学生、教师与学校两个层面的改进建议', '行动可执行');
    const content = stage.querySelector('.v4-stage-content');
    content.innerHTML = `<p class="v4-stage-copy">建议不按“多做题”处理，而是从诊断问题反推行动：学生知道下一阶段优先改什么、怎么做、用什么指标自查；教师、家长和学校知道如何支持、如何跟踪、哪些结论还需要补证。</p><div class="v4-support-grid"><div class="v4-plan-column"><h4>学生层面 · 两周</h4><div class="v4-plan-item is-keep">${icon('calculator')}<span><b>优先问题</b>订正后保持与一次函数综合运用。</span></div><div class="v4-plan-item is-keep">${icon('replace')}<span><b>具体行动</b>用变式任务复查变量、条件、交点意义和反例。</span></div><div class="v4-plan-item is-watch">${icon('calendar-check-2')}<span><b>自我检查</b>第2、7、14天记录独立完成情况和复现错误。</span></div></div><div class="v4-plan-column"><h4>教师、家长与学校层面</h4><div class="v4-plan-item is-keep">${icon('presentation')}<span><b>教学支持</b>围绕一次函数情境解释和语文材料表达设计短周期任务。</span></div><div class="v4-plan-item is-keep">${icon('history')}<span><b>反馈跟踪</b>保留首次作答、订正、二稿修改和延时复查链条。</span></div><div class="v4-plan-item is-watch">${icon('users-round')}<span><b>家庭配合</b>只协助按时复查和说明思路，不额外叠加重复训练。</span></div></div><div class="v4-plan-column"><h4>学校与区域教研层面</h4><div class="v4-plan-item is-keep">${icon('school')}<span><b>群体验证</b>检查同类“专项会做、综合转化有限”是否在班级或年级普遍出现。</span></div><div class="v4-plan-item is-keep">${icon('chart-no-axes-combined')}<span><b>教研线索</b>分别复核作业订正机制、测评任务结构和课程实施节奏。</span></div><div class="v4-plan-item is-watch">${icon('shield-check')}<span><b>使用边界</b>个体发现只作为待验证线索，不直接推导区域结论。</span></div></div></div>${analysisTable(['改进建议', '对应诊断问题', '实施主体', '周期与跟踪指标'], [['数学变式复查', '专项到综合任务转化有限', '学生、数学教师', '2周；变式任务正确率与解释完整度'], ['订正后间隔复查', '21天复查119/384复现', '学生、任课教师、家长协助提醒', '第2、7、14天；同类错误复现率'], ['语文开放表达任务', '材料支持观点需持续巩固', '学生、语文教师', '2次开放任务；观点—材料—解释—回扣完整度'], ['学校教研复核', '个体发现是否具有群体意义', '备课组、教研组', '同类任务抽样；班级/年级层面对比']], 'V2 第六步建议与诊断对应关系')}<div class="v4-final-boundary">${icon('shield-check')}阶段结果：形成学生、教师、家长与学校两个层面的改进建议；每项建议绑定问题依据、责任主体、实施周期和跟踪指标。</div>`;
    await playActivity(content, '正在提出针对性改进建议', [
      ['user-round', '明确学生层面优先改进问题', '订正保持与综合任务转化进入两周行动'],
      ['calculator', '生成数学支持行动', '变式复查变量、条件与交点意义'],
      ['notebook-pen', '生成语文支持行动', '开放任务复查材料与观点关系'],
      ['presentation', '生成教师支持行动', '针对具体知识内容和能力问题组织反馈'],
      ['users-round', '生成家长配合建议', '按周期提醒复查，不额外增加重复练习量'],
      ['school', '生成学校支持行动', '完善作业反馈、订正和持续跟踪'],
      ['landmark', '生成区域研判事项', '开展班级、学校或区域比较验证'],
      ['list-checks', '绑定跟踪指标', '第2、7、14天复查，不增加每日作业总时长']
    ], signal);
    refreshIcons();
    await wait(1250, signal);
    commitStage(stage);
  }

  async function runReportQuality(signal) {
    const stage = appendStage('report-quality', '第七步 · 生成并审核分析报告', '按照六个一级板块完成报告复核', '6个板块 · 9项检查');
    const content = stage.querySelector('.v4-stage-content');
    content.innerHTML = `<div class="v4-report-sections"><span>01 学生基本情况与数据说明</span><span>02 学期学业发展全景</span><span>03 学科学习能力深度分析</span><span>04 学习过程与改进成效</span><span>05 关键优势与核心问题诊断</span><span>06 个性化提升与协同支持方案</span></div>${analysisTable(['审核项', '审核口径', '结果'], [['数据引用和指标计算是否准确', '逐项核对分子、分母、均值、阶段区间和原始量尺', '通过'], ['变化、波动和关键转折是否有连续数据支持', '只保留17/18周覆盖内的连续或同口径记录', '通过'], ['学科分析是否具体到文体、能力维度、知识内容或任务类型', '语文到量规维度；数学到一次函数任务；英语到语篇语法线索', '通过'], ['是否区分偶发、反复和持续性问题', '英语/物理为观察线索；订正保持为反复问题', '通过'], ['优势和核心问题是否有多次、不同类型数据支持', '优势需作文/作业/测评/修改/复查等多源印证', '通过'], ['跨学科结论是否有两个及以上学科数据依据', '不足条件时只写待验证线索，不写结论', '通过'], ['改进建议是否与诊断问题一一对应', '每条建议绑定具体问题、主体和指标', '通过'], ['建议是否明确实施主体、周期和跟踪指标', '学生、教师、家长、学校分别标明', '通过'], ['语言是否客观、清楚、通俗并尊重学生', '删除标签化归因和高风险用途表述', '通过']], 'V2 第七步报告质量审核')}<div class="v4-final-boundary">${icon('file-check-2')}阶段结果：《林知遥 · 八年级第二学期综合发展分析两页学习报告》已按六个一级板块生成，并完成9项质量复核。</div>`;
    await playActivity(content, '正在生成报告并执行质量复核', [
      ['user-round-check', '生成基本情况与数据说明', '说明对象、周期、数据范围、缺失和可信度'],
      ['chart-no-axes-combined', '生成学期学业发展全景', '呈现学科趋势、阶段变化与任务转化'],
      ['graduation-cap', '生成学科学习深度分析', '具体到量规、知识内容和任务类型'],
      ['history', '生成学习过程与改进成效', '呈现订正、修改、反馈和延时保持'],
      ['clipboard-check', '生成优势与核心问题诊断', '标注数据依据、持续程度和优先级'],
      ['users-round', '生成协同支持方案', '学生、教师学校与区域行动相互对应'],
      ['calculator', '核验数据引用和指标计算', '逐项复核数字、分母、量尺和阶段区间'],
      ['search-check', '核验结论支持条件', '检查连续证据、多源印证、反例和判断边界'],
      ['badge-check', '完成报告语言与行动审核', '建议明确主体、周期和跟踪指标']
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

  const REPORT_V2_URL = 'assets/lin-zhiyao-learning-report-v2.html';

  function renderTwoPageReport() {
    const mount = $('reportDocument');
    if (!mount) return;
    mount.innerHTML = `<iframe class="v4-report-frame" title="林知遥·八年级第二学期综合发展分析报告" src="${REPORT_V2_URL}"></iframe>`;
  }

  function openReportPreview() {
    if (!state.artifact) return;
    renderTwoPageReport();
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

  async function downloadReport() {
    const response = await fetch(REPORT_V2_URL, { cache: 'no-store' });
    if (!response.ok) return;
    const html = await response.text();
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
    scrollLatest(true);
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
        $('runStatus').textContent = ['正在调取并汇总学生发展数据', '正在分析各学科学习表现与变化', '正在定位各学科主要学习问题', '正在分析学习过程与改进成效', '正在评估综合学业表现', '正在提出针对性改进建议', '正在生成并审核分析报告'][state.cursor] || '正在研究';
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
      state.runners = [runGatherStudentDataV2, runSubjectPerformanceV2, runProblemLocalizationV2, runLearningProcessV2, runComprehensiveEvaluationV2, runLayeredSupport, runReportQuality];
      runResearch();
    } catch (error) {
      $('runStatus').textContent = '数据载入失败';
      $('errorMessage').hidden = false;
      $('errorMessage').textContent = `无法载入黄金样板数据：${error.message}`;
    }
  }

  init();
}());
