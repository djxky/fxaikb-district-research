(function () {
  'use strict';

  const app = document.getElementById('researchApp');
  const $ = (id) => document.getElementById(id);

  const sources = [
    { name: '飞象智能作业', detail: '186 次作业 · 2,843 道题', icon: 'notebook-tabs', color: '#5ab8e2' },
    { name: '飞象 AI 作文星', detail: '14 篇作文 · 47 次修改', icon: 'square-pen', color: '#a98ad0' },
    { name: '海岳区统测平台', detail: '6 次统测 · 782 个题目结果', icon: 'clipboard-check', color: '#5e91d0' },
    { name: '学生体质健康', detail: '3 学期 · 18 项指标', icon: 'activity', color: '#60bc87' },
    { name: '心理关爱平台', detail: '3 次支持信号 · 原文不可见', icon: 'heart-handshake', color: '#df8794' },
    { name: '学生成长档案', detail: '42 条记录 · 4 个项目', icon: 'folder-clock', color: '#dfb15c' },
    { name: '区域阅读平台', detail: '96 次阅读 · 28 条批注', icon: 'book-open-check', color: '#5fa0b8' },
    { name: '学生管理系统', detail: '158 日出勤 · 22 条评语', icon: 'school', color: '#8fa36b' }
  ];

  const steps = [
    {
      title: '问题编译', english: 'QUERY COMPILATION',
      narrative: '把自然语言问题编译为对象、范围、时间、比较基准、决策用途和禁止用途明确的研究任务。',
      method: '教育问题语义解析 · 决策用途识别', source: '用户指令 · 权限策略 · 学生主数据', finding: '形成 1 份研究任务书与 5 条使用边界', confidence: '任务口径 · 已确认',
      log: ['10:36:02 对象：林知遥 / 学生个体', '10:36:03 范围：本学期 / 与上学期同期比较', '10:36:04 用途：学校支持，不进入升学评价'],
      evidenceAdded: 0
    },
    {
      title: '研究拆解', english: 'RESEARCH DECOMPOSITION',
      narrative: '将“全面分析”拆为五个发展领域、七个可回答子问题，并设置“全面扫描后再选择重点深挖”的研究路径。',
      method: '问题树 · 领域覆盖矩阵 · 优先级规则', source: '义务教育质量评价指南 · 课程标准 · 数据目录', finding: '5 个领域中 3 个可分析、1 个部分覆盖、1 个暂不判断', confidence: '证据可覆盖 · 76%',
      log: ['10:36:05 建立五领域覆盖矩阵', '10:36:06 生成 7 个可回答子问题', '10:36:07 审美素养证据不足，标记不判断'],
      evidenceAdded: 0
    },
    {
      title: '指标解析', english: 'CONSTRUCT & METRIC',
      narrative: '为每个研究问题定义可观察指标、计算口径和不能被该指标代表的内容，避免用现成字段替代教育概念。',
      method: '概念—指标契约 · 标准引用', source: '国家课程标准 · 体质健康标准 · 区域指标库', finding: '生成 18 个可计算指标与 6 条禁止推断规则', confidence: '指标口径 · 可审计',
      log: ['10:36:08 区分成绩水平与学业增长', '10:36:10 体质健康只使用标准测试项目', '10:36:12 心理数据不进入学业解释模型'],
      evidenceAdded: 72
    },
    {
      title: '证据规划', english: 'EVIDENCE CONTRACT',
      narrative: '先规定每项结论需要哪些证据、最低时间跨度、来源独立性和失败处理，再寻找数据。',
      method: '主张—证据—数据模型 · 最小证据门槛', source: '7 个子问题 · 18 个指标 · 8 个系统目录', finding: '12 类证据需求中 9 类完整、2 类部分、1 类缺失', confidence: '证据契约 · 已建立',
      log: ['10:36:13 规定趋势至少需要 8 个时间点', '10:36:14 跨域结论至少需要 2 个独立来源', '10:36:15 缺失领域不得生成替代分数'],
      evidenceAdded: 38
    },
    {
      title: '数据校验', english: 'DATA QUALITY GATE',
      narrative: '对身份、粒度、完整度、时效性、重复、缺失和跨系统连接进行校验；任何修正都保留审计记录。',
      method: '完整性 · 唯一性 · 有效性 · 一致性 · 时效性', source: '3,612 条原始记录 · 8 个系统', finding: '3,428 条进入分析 · 184 条降级或排除', confidence: '数据质量 · A 级',
      log: ['10:36:16 排除 7 条重复提交', '10:36:17 标记 1 项体测缺失，不插值', '10:36:18 跨系统身份匹配率 100%'],
      evidenceAdded: 29
    },
    {
      title: '全面扫描', english: 'PARALLEL ANALYSIS',
      narrative: '并行执行现状、趋势、同起点比较、分布与跨域关联分析，先发现稳定变化和异常，不预设重点结论。',
      method: '稳健趋势 · 同起点比较 · 分布与跨域三角验证', source: '18 周学习序列 · 作文版本 · 体测 · 项目与出勤', finding: '发现 2 项稳定优势、1 项支持问题、2 项数据不足', confidence: '扫描覆盖 · 4/5 领域',
      log: ['10:36:19 学业增长与常规得分出现分化', '10:36:20 写作修改质量持续改善', '10:36:21 耐力指标下降但尚无学业影响证据'],
      evidenceAdded: 34
    },
    {
      title: '重点深挖', english: 'FOCUSED DIAGNOSIS',
      narrative: '选择“高阶任务提升但常规成绩未同步”作为重点问题，同时保留任务难度、熟悉度和作答节奏等替代解释。',
      method: '竞争性假设 · 题型分解 · 情境敏感性分析', source: '开放题 37 道 · 基础题 624 道 · 6 次统测', finding: '主要差异集中在限时基础计算，不是知识点普遍缺失', confidence: '解释证据 · B 级',
      log: ['10:36:22 H1：基础稳定性限制优势转化', '10:36:23 H2：试题难度变化，证据不足', '10:36:24 H3：作答节奏影响，部分成立'],
      evidenceAdded: 18
    },
    {
      title: '反证校准', english: 'COUNTER-EVIDENCE',
      narrative: '主动寻找可以推翻当前解释的证据，并检查试卷口径、教师偏差、缺勤和任务熟悉度等替代原因。',
      method: '反例扫描 · 替代解释排除 · 敏感性检查', source: '同卷难度 · 限时任务 · 出勤 · 多教师评语', finding: '排除试题难度与缺勤解释 · 保留节奏因素', confidence: '反证检查 · 4/5 完成',
      log: ['10:36:25 同卷难度变化不足以解释下降', '10:36:26 出勤稳定，排除缺勤因素', '10:36:27 两次限时任务支持节奏解释'],
      evidenceAdded: 27
    },
    {
      title: '结论治理', english: 'CLAIM GOVERNANCE',
      narrative: '将事实、比较、趋势、关联、解释和建议分层，给出证据等级、适用范围、未解决问题与人工复核要求。',
      method: '结论分层 · 证据定级 · 人工复核门槛', source: '238 条证据 · 3 项反证 · 6 类有效来源', finding: '2 项 A 级发现 · 1 项 B 级解释 · 2 项不判断', confidence: '结论可追溯 · 100%',
      log: ['10:36:28 禁止把相关表达为因果', '10:36:29 审美素养与品德发展暂不判断', '10:36:30 每项建议写入复核与退出条件'],
      evidenceAdded: 20
    },
    {
      title: '生成报告', english: 'REPORT ORCHESTRATION',
      narrative: '根据校长阅读场景组织结论、证据、行动建议和方法附录，并保留从结论反查原始数据的完整路径。',
      method: '受众化报告编排 · 事实一致性检查', source: '研究任务书 · 结论账本 · 数据血缘', finding: '学生支持报告与区域洞察已就绪', confidence: '交付检查 · 通过',
      log: ['10:36:31 完成结论与证据一致性检查', '10:36:32 生成学校支持行动计划', '10:36:33 研究过程与数据调用完整留痕'],
      evidenceAdded: 0
    }
  ];

  const evidenceByStep = {
    2: [
      { type: 'method', icon: 'braces', title: '18 个教育概念完成指标化定义', source: '课程标准 / 体质标准 / 区域指标库', meta: '6 条禁止推断规则 · 10:36:12', score: '可审计' },
      { type: 'support', icon: 'notebook-tabs', title: '学业发展具备完整纵向序列', source: '飞象智能作业 · 186 次作业', meta: '18 个有效周 · 10:36:12', score: '完整' }
    ],
    3: [
      { type: 'counter', icon: 'triangle-alert', title: '体测耐力指标存在 1 项缺测', source: '学生体质健康 · 已保留缺失标记', meta: '不进行插值 · 10:36:14', score: '注意' },
      { type: 'method', icon: 'shield-check', title: '作文师机评价一致率达到 0.86', source: '作文星 · 14 篇作文 / 教师复核', meta: '可进入跨源分析 · 10:36:15', score: '86%' }
    ],
    4: [
      { type: 'support', icon: 'shield-check', title: '3,428 条记录通过质量闸门', source: '8 个系统 · 统一学生标识', meta: '原始 3,612 条 · 10:36:18', score: 'A 级' },
      { type: 'counter', icon: 'file-warning', title: '184 条记录被降级或排除', source: '重复、缺测、粒度不一致', meta: '保留完整审计原因 · 10:36:18', score: '已处理' }
    ],
    5: [
      { type: 'support', icon: 'trending-up', title: '开放任务表现连续 18 周上升', source: '智能作业 · 37 道新情境题', meta: '稳健趋势 +0.73 · 10:36:20', score: 'A 级' },
      { type: 'support', icon: 'square-pen', title: '作文实质性修改比例持续上升', source: '作文星 · 14 篇 / 47 次修改', meta: '教师复核一致率 0.86 · 10:36:21', score: 'A 级' }
    ],
    6: [
      { type: 'counter', icon: 'scale', title: '两次限时任务表现明显回落', source: '区统测平台 · 数学限时任务', meta: '与主要假设部分冲突 · 10:36:22', score: '反证' },
      { type: 'counter', icon: 'chart-no-axes-column', title: '常规总分仅处于年级第 58 百分位', source: '区统测平台 · 6 次统测', meta: '不能用高分替代潜质判断 · 10:36:23', score: '有效' }
    ],
    7: [
      { type: 'method', icon: 'badge-check', title: '当前解释完成 4/5 项反证检查', source: '难度 / 缺勤 / 熟悉度 / 节奏 / 教师偏差', meta: '保留作答节奏因素 · 10:36:27', score: 'B 级' }
    ],
    8: [
      { type: 'support', icon: 'lightbulb', title: '形成三项可执行支持建议', source: '教师 / 教研组 / 项目课程', meta: '均设置验证指标 · 10:36:30', score: '可执行' }
    ],
    9: [
      { type: 'method', icon: 'file-check-2', title: '学生与区域双层报告完成一致性检查', source: '研究编号 HY-2026-0718-042', meta: '全部结论可回溯 · 10:36:33', score: '98%' }
    ]
  };

  const hypothesisByStep = {
    5: { text: '高阶任务表现持续改善，但基础稳定性限制了常规成绩转化', score: 62, meta: '扫描发现 · 等待专题深挖' },
    6: { text: '表现分化主要来自限时基础计算稳定性，而非普遍知识缺失', score: 78, meta: '题型分解支持 · 仍需排除试题口径' },
    7: { text: '基础稳定性与作答节奏共同限制优势转化，试题难度和缺勤解释已排除', score: 86, meta: '纳入反证后修正 · B 级证据' },
    8: { text: '建议先进行低压力短测确认问题来源，再提供针对性支持', score: 86, meta: '解释有边界 · 需教师复核' },
    9: { text: '全面研究完成：2 项优势、1 项支持问题、2 个领域暂不判断', score: 86, meta: '报告与证据账本已就绪' }
  };

  const phases = [
    { title: '定义问题', detail: '问题编译 · 研究拆解', step: 0 },
    { title: '建立证据', detail: '指标解析 · 证据规划', step: 2 },
    { title: '执行分析', detail: '数据校验 · 全面扫描', step: 4 },
    { title: '验证结论', detail: '重点深挖 · 反证校准', step: 6 },
    { title: '形成行动', detail: '结论治理 · 生成报告', step: 8 }
  ];

  let currentStep = -1;
  let inspectedStep = 0;
  let isPaused = false;
  let isComplete = false;
  let startedAt = 0;
  let stepTimer = null;
  let elapsedTimer = null;
  let evidenceTotal = 0;
  let flowAnimation = null;

  function iconRefresh() {
    if (window.lucide) window.lucide.createIcons();
  }

  function renderSources() {
    $('sourceStack').innerHTML = sources.map((source, index) => `
      <div class="source-card" data-source="${index}">
        <span class="source-icon" style="color:${source.color}"><i data-lucide="${source.icon}"></i></span>
        <span class="source-copy"><strong>${source.name}</strong><small>${source.detail}</small></span>
        <span class="source-state"><i data-lucide="circle-dashed"></i></span>
      </div>`).join('');
  }

  function renderChain() {
    $('researchChain').innerHTML = phases.map((phase, index) => `
      <button class="chain-step" type="button" data-step="${phase.step}" data-phase="${index}" title="${phase.detail}">
        <span class="chain-num">${String(index + 1).padStart(2, '0')}</span><span><b>${phase.title}</b><small>${phase.detail}</small></span>
      </button>`).join('');
    $('researchChain').addEventListener('click', (event) => {
      const target = event.target.closest('.chain-step');
      if (!target) return;
      const index = Number(target.dataset.step);
      if (index <= currentStep || isComplete) {
        inspectedStep = index;
        updateStepCard(index, index === currentStep && !isComplete);
      }
    });
  }

  function setMode(mode) {
    app.dataset.mode = mode;
    const title = $('pageTitle');
    const subtitle = $('pageSubtitle');
    if (mode === 'brief') {
      title.textContent = '区域教育智能研究';
      subtitle.textContent = '让每一次教育判断都有证据';
    } else if (mode === 'analysis') {
      title.textContent = '学生综合发展研究';
      subtitle.textContent = '可审计 AI 分析链';
      requestAnimationFrame(resizeFlowCanvas);
    } else {
      title.textContent = '循证研究报告';
      subtitle.textContent = '学生支持与区域治理双层成果';
    }
  }

  function resetAnalysis() {
    clearTimeout(stepTimer);
    clearInterval(elapsedTimer);
    currentStep = -1;
    inspectedStep = 0;
    isPaused = false;
    isComplete = false;
    evidenceTotal = 0;
    $('evidenceList').innerHTML = '<div class="evidence-empty"><i data-lucide="radar"></i><strong>等待证据汇入</strong><span>AI 将显示来源、方法、时间与可信度</span></div>';
    $('evidenceCount').textContent = '0 条证据';
    $('evidenceSummary').textContent = '证据将在分析过程中持续汇入';
    $('generateReport').disabled = true;
    $('chainProgress').style.width = '0%';
    $('confidenceMeter').style.width = '0%';
    $('hypothesisText').textContent = '尚未形成研究假设';
    $('hypothesisMeta').textContent = '等待跨源证据';
    $('counterCard').classList.remove('verified');
    document.querySelectorAll('.chain-step').forEach(el => el.classList.remove('active', 'completed'));
    document.querySelectorAll('.source-card').forEach(el => {
      el.classList.remove('active', 'complete');
      el.querySelector('.source-state').innerHTML = '<i data-lucide="circle-dashed"></i>';
    });
    $('pauseAnalysis').innerHTML = '<i data-lucide="pause"></i><span>暂停研究</span>';
    $('analysisStatus').innerHTML = '<span class="status-pulse"></span><strong>AI 正在建立研究计划</strong><small id="elapsedTime">00:00</small>';
    iconRefresh();
  }

  function startAnalysis() {
    resetAnalysis();
    setMode('analysis');
    startedAt = Date.now();
    elapsedTimer = setInterval(updateElapsed, 1000);
    stepTimer = setTimeout(() => advanceStep(), 420);
    startFlowAnimation();
  }

  function updateElapsed() {
    const elapsed = Math.floor((Date.now() - startedAt) / 1000);
    const min = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const sec = String(elapsed % 60).padStart(2, '0');
    const el = $('elapsedTime');
    if (el) el.textContent = `${min}:${sec}`;
  }

  function advanceStep(forceIndex) {
    if (isPaused && forceIndex == null) return;
    currentStep = forceIndex == null ? currentStep + 1 : forceIndex;
    if (currentStep >= steps.length) {
      finishAnalysis();
      return;
    }
    inspectedStep = currentStep;
    updateStepCard(currentStep, true);
    updateChain(currentStep);
    updateSources(currentStep);
    updateHypothesis(currentStep);
    appendEvidence(currentStep);
    const step = steps[currentStep];
    $('analysisStatus').querySelector('strong').textContent = currentStep === steps.length - 1 ? 'AI 正在完成一致性检查' : `AI 正在${step.title}`;
    $('footerProgressText').textContent = `${step.title} · ${step.narrative.slice(0, 24)}…`;
    stepTimer = setTimeout(() => advanceStep(), 2350);
  }

  function updateStepCard(index, running) {
    const step = steps[index];
    $('activeStepIndex').textContent = String(index + 1).padStart(2, '0');
    $('activeStepEyebrow').textContent = step.english;
    $('activeStepTitle').textContent = step.title;
    $('stepNarrative').textContent = step.narrative;
    $('methodValue').textContent = step.method;
    $('sourceValue').textContent = step.source;
    $('findingValue').textContent = step.finding;
    $('confidenceValue').textContent = step.confidence;
    $('activeLog').innerHTML = step.log.map(item => `<span>${item}</span>`).join('');
    $('runningBadge').innerHTML = running ? '<i data-lucide="loader-circle"></i>分析中' : '<i data-lucide="circle-check"></i>已完成';
    $('runningBadge').classList.toggle('done', !running);
    iconRefresh();
  }

  function updateChain(index) {
    const activePhase = Math.min(phases.length - 1, Math.floor(index / 2));
    document.querySelectorAll('.chain-step').forEach((node, nodeIndex) => {
      node.classList.toggle('completed', nodeIndex < activePhase);
      node.classList.toggle('active', nodeIndex === activePhase);
    });
    $('chainProgress').style.width = `${((index + 1) / steps.length) * 100}%`;
  }

  function updateSources(index) {
    document.querySelectorAll('.source-card').forEach((node, sourceIndex) => {
      const shouldActivate = index === 2 || index === 3 || (index >= 4 && sourceIndex < Math.min(8, index + 1));
      node.classList.toggle('active', shouldActivate);
      if (index >= 3) {
        node.classList.add('complete');
        node.querySelector('.source-state').innerHTML = '<i data-lucide="circle-check"></i>';
      }
    });
    iconRefresh();
  }

  function updateHypothesis(index) {
    const key = Object.keys(hypothesisByStep).map(Number).filter(step => step <= index).pop();
    if (key == null) return;
    const hypothesis = hypothesisByStep[key];
    $('hypothesisText').textContent = hypothesis.text;
    $('hypothesisMeta').textContent = hypothesis.meta;
    $('confidenceMeter').style.width = `${hypothesis.score}%`;
    if (index >= 6) {
      $('counterCard').innerHTML = '<i data-lucide="scale"></i><span><b>反证已纳入结论</b><small>2 项有效反证 · 假设已完成一次修正</small></span>';
      $('counterCard').classList.add('verified');
      iconRefresh();
    }
  }

  function appendEvidence(index) {
    const newItems = evidenceByStep[index];
    evidenceTotal += steps[index].evidenceAdded || 0;
    $('evidenceCount').textContent = `${evidenceTotal} 条证据`;
    $('evidenceSummary').textContent = evidenceTotal ? `已汇聚 ${evidenceTotal} 条可追溯证据` : '正在建立数据目录';
    if (!newItems) return;
    const empty = $('evidenceList').querySelector('.evidence-empty');
    if (empty) empty.remove();
    newItems.forEach((evidence) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'evidence-item';
      item.innerHTML = `
        <span class="evidence-kind ${evidence.type}"><i data-lucide="${evidence.icon}"></i></span>
        <span class="evidence-copy"><strong>${evidence.title}</strong><span>${evidence.source}</span><small>${evidence.meta}</small></span>
        <span class="evidence-score"><b>${evidence.score}</b><span>可信</span></span>`;
      item.addEventListener('click', () => openEvidenceDrawer(evidence));
      $('evidenceList').prepend(item);
    });
    iconRefresh();
  }

  function finishAnalysis() {
    clearTimeout(stepTimer);
    clearInterval(elapsedTimer);
    isComplete = true;
    currentStep = steps.length - 1;
    document.querySelectorAll('.chain-step').forEach(node => {
      node.classList.add('completed');
      node.classList.remove('active');
    });
    $('chainProgress').style.width = '100%';
    $('generateReport').disabled = false;
    $('analysisStatus').innerHTML = '<span class="status-pulse complete"></span><strong>研究完成 · 238 条证据已归档</strong><small>00:33</small>';
    $('footerProgressText').textContent = '研究完成 · 结论、方法、反证与数据血缘均已校验';
    $('runningBadge').innerHTML = '<i data-lucide="circle-check"></i>已完成';
    $('pauseAnalysis').innerHTML = '<i data-lucide="play"></i><span>回放分析</span>';
    iconRefresh();
  }

  function togglePause() {
    if (isComplete) {
      startAnalysis();
      return;
    }
    isPaused = !isPaused;
    clearTimeout(stepTimer);
    $('pauseAnalysis').innerHTML = isPaused ? '<i data-lucide="play"></i><span>继续研究</span>' : '<i data-lucide="pause"></i><span>暂停研究</span>';
    $('analysisStatus').querySelector('strong').textContent = isPaused ? '研究已暂停 · 可展开节点核验' : `AI 正在${steps[currentStep].title}`;
    if (!isPaused) stepTimer = setTimeout(() => advanceStep(), 800);
    iconRefresh();
  }

  function quickFinish() {
    clearTimeout(stepTimer);
    const remaining = [];
    for (let i = currentStep + 1; i < steps.length; i += 1) remaining.push(i);
    let delay = 0;
    remaining.forEach(index => {
      setTimeout(() => {
        currentStep = index;
        inspectedStep = index;
        updateStepCard(index, index !== steps.length - 1);
        updateChain(index);
        updateSources(index);
        updateHypothesis(index);
        appendEvidence(index);
        if (index === steps.length - 1) setTimeout(finishAnalysis, 350);
      }, delay);
      delay += 190;
    });
    if (!remaining.length) finishAnalysis();
  }

  function showDrawer(title, eyebrow, content) {
    $('drawerTitle').textContent = title;
    $('drawerEyebrow').textContent = eyebrow;
    $('drawerContent').innerHTML = content;
    $('detailDrawer').classList.add('open');
    $('detailDrawer').setAttribute('aria-hidden', 'false');
    iconRefresh();
  }

  function openAuditDrawer(type) {
    const step = steps[inspectedStep];
    const contentMap = {
      method: `
        <section class="drawer-section"><span>METHOD</span><h4>${step.method}</h4><p>${methodDescription(inspectedStep)}</p></section>
        <section class="drawer-section"><span>适用边界</span><h4>方法不会替代教育判断</h4><p>该方法仅用于识别稳定信号和需要进一步验证的问题。涉及学生发展机会、评价与资源配置的决定，必须由有权限人员复核。</p></section>
        <div class="drawer-metrics"><div><span>有效样本</span><strong>${inspectedStep >= 5 ? '186 名配对学生' : '3,612 条记录'}</strong></div><div><span>最低形成结论门槛</span><strong>2 个独立来源</strong></div></div>`,
      source: `
        <section class="drawer-section"><span>DATA PROVENANCE</span><h4>${step.source}</h4><p>所有引用均保存来源系统、记录标识、采集时间、更新时间、授权范围和质量检查结果。敏感数据仅使用完成研究所需的最小字段。</p></section>
        <section class="drawer-section"><span>本节点主要来源</span><div class="drawer-list">${sources.slice(0, Math.max(3, Math.min(8, inspectedStep + 2))).map(item => `<div><strong>${item.name}</strong><span>${item.detail}</span></div>`).join('')}</div></section>`,
      finding: `
        <section class="drawer-section"><span>INTERMEDIATE FINDING</span><h4>${step.finding}</h4><p>${step.narrative}</p></section>
        <section class="drawer-section"><span>正反证据</span><div class="drawer-list"><div><strong>支持证据</strong><span>开放任务表现与写作实质性修改在多个时间窗口方向一致。</span></div><div class="counter"><strong>反证 / 限制</strong><span>两次限时任务回落，常规总分未同步改善；当前解释不能扩展为普遍能力判断。</span></div></div></section>`,
      confidence: `
        <section class="drawer-section"><span>EVIDENCE GRADE</span><h4>${step.confidence}</h4><p>证据等级由数据质量、样本充分度、来源独立性、时间持续性和反证完成度共同决定；不生成无法解释的神秘概率。</p></section>
        <div class="drawer-metrics"><div><span>数据质量</span><strong>A 级</strong></div><div><span>来源独立性</span><strong>通过</strong></div><div><span>时间持续性</span><strong>18 周</strong></div><div><span>反证检查</span><strong>4 / 5</strong></div></div>`
    };
    const labels = { method: '分析方法', source: '引用数据与血缘', finding: '中间发现与反证', confidence: '可信程度评估' };
    showDrawer(labels[type], `第 ${String(inspectedStep + 1).padStart(2, '0')} 步 · ${step.title}`, contentMap[type]);
  }

  function methodDescription(index) {
    const descriptions = [
      '把用户问题转换成研究对象、时间窗口、判断目标和禁止推断项，避免模型在数据丰富时擅自扩大研究范围。',
      '将抽象的“综合发展”映射到可观察行为指标，并为每个指标指定来源、最低证据门槛和结论边界。',
      '通过统一学生标识连接不同系统，只提取完成研究所需的最小数据集，降低错误匹配与敏感信息暴露风险。',
      '对数据完整度、时效性、一致性和异常值进行检查；缺失数据保留缺失标记，不进行不可解释的静默补齐。',
      '贝叶斯知识追踪估计知识状态随时间变化；Theil–Sen 斜率降低极端值对趋势判断的影响。',
      '从 1,248 名同年级学生中按基线成绩和学习机会匹配 186 人，并通过多个独立来源检查信号是否重复出现。',
      '系统主动检索与主要假设冲突的证据，并重新评估情境差异，防止确认偏误和优势叙事过度放大。',
      '对覆盖、质量、样本、时效和一致性进行加权；分值表示证据充分程度，不等于学生能力概率。',
      '将事实、关联、假设和建议分层表达；行动建议必须包含责任角色、观察周期、验证指标和退出条件。',
      '学生报告与区域报告共享同一证据标准，生成后进行事实、数字、来源和结论边界的一致性检查。'
    ];
    return descriptions[index];
  }

  function openEvidenceDrawer(evidence) {
    showDrawer(evidence.title, '实时证据包', `
      <section class="drawer-section"><span>来源与时间</span><h4>${evidence.source}</h4><p>${evidence.meta}。该证据已保存原始记录定位信息，演示环境隐藏学生级原文。</p></section>
      <section class="drawer-section"><span>证据解释</span><h4>为什么它能进入研究结论</h4><p>数据经过身份匹配、时间对齐和质量校验，并与至少一个独立来源方向一致。当前显示的是研究证据，不代表因果关系。</p></section>
      <div class="drawer-metrics"><div><span>证据状态</span><strong>${evidence.score}</strong></div><div><span>人工复核</span><strong>建议保留</strong></div></div>`);
  }

  function closeDrawer() {
    $('detailDrawer').classList.remove('open');
    $('detailDrawer').setAttribute('aria-hidden', 'true');
  }

  function generateReportFlow() {
    if (!isComplete) return;
    const overlay = $('reportGeneration');
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    const labels = ['正在复核学生级核心结论……', '正在写入方法、数据血缘与限制条件……', '正在匹配区域相似群体并进行匿名聚合……', '正在执行数字与来源一致性检查……'];
    const items = Array.from($('generationSteps').children);
    let index = 0;
    $('generationProgress').style.width = '18%';
    const timer = setInterval(() => {
      items[index].classList.remove('active');
      items[index].classList.add('done');
      index += 1;
      $('generationProgress').style.width = `${Math.min(100, 18 + index * 23)}%`;
      if (index < items.length) {
        items[index].classList.add('active');
        $('generationText').textContent = labels[index];
      } else {
        clearInterval(timer);
        setTimeout(() => {
          overlay.classList.remove('open');
          overlay.setAttribute('aria-hidden', 'true');
          setMode('report');
          $('reportScroll').scrollTop = 0;
          requestAnimationFrame(() => { drawRadar(); drawTrend(); });
        }, 420);
      }
    }, 620);
  }

  function resizeFlowCanvas() {
    const canvas = $('flowCanvas');
    if (!canvas) return;
    const rect = $('analysisCanvas').getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    canvas.dataset.dpr = dpr;
  }

  function startFlowAnimation() {
    if (!$('flowCanvas')) return;
    if (flowAnimation) cancelAnimationFrame(flowAnimation);
    const animate = (time) => {
      drawFlow(time);
      flowAnimation = requestAnimationFrame(animate);
    };
    flowAnimation = requestAnimationFrame(animate);
  }

  function drawFlow(time) {
    if (app.dataset.mode !== 'analysis') return;
    const canvas = $('flowCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = Number(canvas.dataset.dpr || 1);
    const canvasRect = $('analysisCanvas').getBoundingClientRect();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    const targetRect = $('activeAnalysisCard').getBoundingClientRect();
    const targetX = targetRect.left - canvasRect.left;
    const targetY = targetRect.top - canvasRect.top + targetRect.height * .5;
    document.querySelectorAll('.source-card').forEach((card, index) => {
      const rect = card.getBoundingClientRect();
      const startX = rect.right - canvasRect.left;
      const startY = rect.top - canvasRect.top + rect.height / 2;
      const active = card.classList.contains('active') || card.classList.contains('complete');
      const color = active ? sources[index].color : 'rgba(130,165,190,.18)';
      const controlX = startX + (targetX - startX) * .55;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.bezierCurveTo(controlX, startY, controlX - 18, targetY, targetX, targetY);
      ctx.strokeStyle = color;
      ctx.globalAlpha = active ? .48 : .15;
      ctx.lineWidth = active ? 1.2 : .7;
      ctx.stroke();
      if (active) {
        const t = ((time / 2100) + index * .13) % 1;
        const point = cubicPoint(t, startX, startY, controlX, startY, controlX - 18, targetY, targetX, targetY);
        ctx.beginPath();
        ctx.arc(point.x, point.y, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = .95;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });
    ctx.globalAlpha = 1;
  }

  function cubicPoint(t, x0, y0, x1, y1, x2, y2, x3, y3) {
    const mt = 1 - t;
    return {
      x: mt ** 3 * x0 + 3 * mt ** 2 * t * x1 + 3 * mt * t ** 2 * x2 + t ** 3 * x3,
      y: mt ** 3 * y0 + 3 * mt ** 2 * t * y1 + 3 * mt * t ** 2 * y2 + t ** 3 * y3
    };
  }

  function setupCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, width: rect.width, height: rect.height };
  }

  function drawRadar() {
    const canvas = $('radarChart');
    const { ctx, width, height } = setupCanvas(canvas);
    const labels = ['学业发展', '身心发展', '劳动实践', '品德发展', '审美素养'];
    const values = [96, 81, 68, 43, 21];
    const centerX = width / 2;
    const centerY = height / 2 + 7;
    const radius = Math.min(width, height) * .31;
    ctx.clearRect(0, 0, width, height);
    for (let ring = 1; ring <= 4; ring += 1) {
      ctx.beginPath();
      labels.forEach((_, i) => {
        const angle = -Math.PI / 2 + (i * Math.PI * 2 / labels.length);
        const r = radius * ring / 4;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.strokeStyle = 'rgba(35,31,24,.11)';
      ctx.stroke();
    }
    labels.forEach((label, i) => {
      const angle = -Math.PI / 2 + (i * Math.PI * 2 / labels.length);
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      ctx.beginPath(); ctx.moveTo(centerX, centerY); ctx.lineTo(x, y); ctx.strokeStyle = 'rgba(35,31,24,.08)'; ctx.stroke();
      const labelX = centerX + Math.cos(angle) * (radius + 25);
      const labelY = centerY + Math.sin(angle) * (radius + 18);
      ctx.fillStyle = '#716f68'; ctx.font = '10px PingFang SC'; ctx.textAlign = Math.cos(angle) > .25 ? 'left' : Math.cos(angle) < -.25 ? 'right' : 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, labelX, labelY);
    });
    ctx.beginPath();
    values.forEach((value, i) => {
      const angle = -Math.PI / 2 + (i * Math.PI * 2 / values.length);
      const x = centerX + Math.cos(angle) * radius * value / 100;
      const y = centerY + Math.sin(angle) * radius * value / 100;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.closePath(); ctx.fillStyle = 'rgba(168,126,44,.17)'; ctx.fill(); ctx.strokeStyle = '#a87e2c'; ctx.lineWidth = 2; ctx.stroke();
    values.forEach((value, i) => {
      const angle = -Math.PI / 2 + (i * Math.PI * 2 / values.length);
      const x = centerX + Math.cos(angle) * radius * value / 100;
      const y = centerY + Math.sin(angle) * radius * value / 100;
      ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fillStyle = '#a87e2c'; ctx.fill();
    });
  }

  function drawTrend() {
    const canvas = $('trendChart');
    const { ctx, width, height } = setupCanvas(canvas);
    const series = [
      { name: '高阶任务表现', color: '#4b78a8', values: [54,55,57,59,60,63,62,66,67,69,71,70,73,74,76,77,78,78] },
      { name: '写作实质性修改', color: '#755c95', values: [62,61,64,66,67,69,70,72,73,74,77,78,80,81,82,84,85,86] },
      { name: '基础稳定性', color: '#b77923', values: [63,58,61,55,60,57,62,54,59,56,64,58,61,57,65,60,63,62] }
    ];
    const pad = { left: 42, right: 20, top: 36, bottom: 30 };
    const chartW = width - pad.left - pad.right;
    const chartH = height - pad.top - pad.bottom;
    ctx.clearRect(0, 0, width, height);
    for (let i = 0; i <= 4; i += 1) {
      const y = pad.top + chartH * i / 4;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(width - pad.right, y); ctx.strokeStyle = 'rgba(35,31,24,.08)'; ctx.stroke();
      ctx.fillStyle = '#a4a198'; ctx.font = '9px PingFang SC'; ctx.textAlign = 'right'; ctx.fillText(String(100 - i * 20), pad.left - 8, y + 3);
    }
    series.forEach((item, seriesIndex) => {
      ctx.beginPath();
      item.values.forEach((value, index) => {
        const x = pad.left + chartW * index / (item.values.length - 1);
        const y = pad.top + chartH * (100 - value) / 100;
        if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = item.color; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = item.color; ctx.fillRect(pad.left + seriesIndex * 110, 12, 14, 2);
      ctx.fillStyle = '#716f68'; ctx.font = '9px PingFang SC'; ctx.textAlign = 'left'; ctx.fillText(item.name, pad.left + 20 + seriesIndex * 110, 16);
    });
    ['第1周','第4周','第8周','第12周','第16周','第18周'].forEach((label, i, labels) => {
      const x = pad.left + chartW * i / (labels.length - 1);
      ctx.fillStyle = '#a4a198'; ctx.font = '9px PingFang SC'; ctx.textAlign = 'center'; ctx.fillText(label, x, height - 10);
    });
  }

  function setupEvents() {
    $('startResearch').addEventListener('click', startAnalysis);
    $('restartResearch').addEventListener('click', startAnalysis);
    $('skipAnalysis').addEventListener('click', quickFinish);
    $('pauseAnalysis').addEventListener('click', togglePause);
    $('generateReport').addEventListener('click', generateReportFlow);
    $('backToAnalysis').addEventListener('click', () => setMode('analysis'));
    $('printReport').addEventListener('click', () => window.print());
    $('openMethodology').addEventListener('click', () => $('methodology').scrollIntoView({ behavior: 'smooth', block: 'start' }));
    document.querySelectorAll('.audit-block').forEach(button => button.addEventListener('click', () => openAuditDrawer(button.dataset.detail)));
    $('closeDrawer').addEventListener('click', closeDrawer);
    $('closeDrawerScrim').addEventListener('click', closeDrawer);
    document.querySelectorAll('[data-report-evidence]').forEach(button => button.addEventListener('click', () => openEvidenceDrawer({ title: '高阶任务表现与常规成绩出现分化', source: '智能作业 37 道开放题 · 624 道基础题 · 6 次统测', meta: '2025-09—2026-07 · 三个独立来源', score: 'A 级' })));
    document.querySelectorAll('.report-toc a').forEach(link => link.addEventListener('click', () => {
      document.querySelectorAll('.report-toc a').forEach(item => item.classList.remove('active'));
      link.classList.add('active');
    }));
    window.addEventListener('resize', () => {
      if (app.dataset.mode === 'analysis') resizeFlowCanvas();
      if (app.dataset.mode === 'report') { drawRadar(); drawTrend(); }
    });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeDrawer(); });
  }

  renderSources();
  renderChain();
  setupEvents();
  updateStepCard(0, false);
  iconRefresh();
})();
