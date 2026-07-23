(function () {
  'use strict';

  const state = {
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
  const icon = (name, className = '') => `<i data-lucide="${name}"${className ? ` class="${className}"` : ''}></i>`;
  const refreshIcons = () => window.lucide?.createIcons();
  const analysisTable = (headers, rows, label = '') => `<div class="v4-analysis-table"${label ? ` aria-label="${esc(label)}"` : ''}><table><thead><tr>${headers.map((item) => `<th>${esc(item)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((item) => `<td>${esc(item)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const duration = (ms) => state.reducedMotion ? 12 : Math.max(18, ms * (state.quick ? .06 : 1));
  const wait = (ms, signal) => new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(Object.assign(new Error('已停止'), { name: 'AbortError' }));
    const timer = setTimeout(resolve, duration(ms));
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(Object.assign(new Error('已停止'), { name: 'AbortError' }));
    }, { once: true });
  });

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
      const scrollingElement = document.scrollingElement || document.documentElement || document.body;
      const maxScrollHeight = Math.max(
        document.documentElement.scrollHeight,
        document.body ? document.body.scrollHeight : 0,
        scrollingElement ? scrollingElement.scrollHeight : 0
      );
      const currentScroll = window.scrollY || document.documentElement.scrollTop || (document.body ? document.body.scrollTop : 0);
      const nearBottom = window.innerHeight + currentScroll >= maxScrollHeight - 220;
      if (force || nearBottom || state.quick) {
        const behavior = state.reducedMotion ? 'auto' : 'smooth';
        window.scrollTo({ top: maxScrollHeight, behavior });
        [scrollingElement, document.documentElement, document.body].filter(Boolean).forEach((element) => { element.scrollTop = maxScrollHeight; });
        $('finishMessage')?.scrollIntoView({ block: 'end', behavior });
      }
    };
    if (force) {
      requestAnimationFrame(() => requestAnimationFrame(scroll));
      return;
    }
    scroll();
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
    turn = createTurn('research-canvas', { title: '学校作文综合学情分析已完成', meta: '7步分析流程 · 7个报告板块' });
    turn.classList.add('v4-turn--canvas', 'is-spotlight');
    turn.querySelector('.v4-turn-lead').textContent = '我将以教研报告学校部分为统计与结论口径，并结合学校汇总表确认六至九年级、16个班的覆盖范围；随后依次研判年级与班级表现、定位共性及差异化问题、复盘训练闭环、形成校级综合结论与分层教研方案，最后完成报告内审。';
    turn.querySelector('.v4-turn-content').innerHTML = `<section class="v4-research-canvas"><header class="v4-canvas-head"><div><span>基于作文学情数据的校级语文学科作文教学诊断与教研支撑</span><h2>上海民办克勒外国语学校本学期初中语文学科作文综合学情分析</h2></div><div class="v4-canvas-state"><i></i><span>正在综合分析</span></div></header><div class="v4-research-timeline" id="researchTimeline"></div><footer class="v4-canvas-foot"><span>${icon('shield-check')}统计口径 · 教研报告学校部分</span><span>${icon('book-open')}覆盖范围 · 六至九年级16个班</span></footer></section>`;
    refreshIcons();
    return turn;
  }

  async function runSchoolOverview(signal) {
    compressCompleted();
    const turn = ensureResearchCanvas();
    const stage = appendStage('school-overview', '第一步 · 调取汇总全校初中各年级作文学情数据', '形成校级学期数据概览与口径说明', '报告统计 · 4,250份');
    const content = stage.querySelector('.v4-stage-content');
    content.innerHTML = `<p class="v4-stage-copy">全校初中作文整体学情总览，整体写作水平概览、年级区间差异、有效习作样本总量、数据来源与统计口径说明。结论摘要：概括全校初中写作整体优势与共性薄弱方向。</p><div class="v4-research-contract"><div><span>学校</span><strong>上海民办克勒外国语学校</strong></div><div><span>分析周期</span><strong>本学期</strong></div><div><span>分析对象</span><strong>全校初中各年级学生习作样本</strong></div><div><span>报告用途</span><strong>学科教研与教学复盘</strong></div></div><div class="v4-source-grid"><article class="v4-source-card">${icon('files')}<span>有效作文样本</span><strong>4,250份</strong><small>教研报告统计口径</small></article><article class="v4-source-card">${icon('scan-text')}<span>有效 AI 评分</span><strong>3,921份</strong><small>教研报告统计口径</small></article><article class="v4-source-card">${icon('pen-line')}<span>二次修改样本</span><strong>1,647份</strong><small>教研报告统计口径</small></article><article class="v4-source-card">${icon('school')}<span>学校任务覆盖</span><strong>16个班</strong><small>汇总表确认 · 六至九年级</small></article></div><div class="v4-index-result v4-data-ledger"><div><strong>4,250</strong><span>有效作文样本</span></div><div><strong>3,921</strong><span>有效 AI 评分</span></div><div><strong>32.47</strong><span>全校整体均分</span></div><div><strong>1,647</strong><span>二次修改样本</span></div></div><div class="v4-triple-note"><article><b>整体基础</b><p>全校初中记叙文写作具备扎实基础，学生能够依托反馈开展习作修改。</p></article><article><b>学段差异</b><p>九年级写作水平显著领先，六、八年级能力持平，七年级为能力提升关键薄弱学段。</p></article><article><b>共性方向</b><p>篇章统筹、素材思辨、多元文体驾驭存在普遍短板，学段发展不均衡现象突出。</p></article></div><div class="v4-boundary-strip"><span>${icon('shield-check')}口径说明：核心数值与结论按教研报告学校部分呈现；六至九年级、16个班覆盖范围由学校汇总表确认。</span></div>`;
    await playActivity(content, '正在调取并汇总学校作文学情数据', [
      ['school', '确认学校与分析范围', '上海民办克勒外国语学校 · 本学期 · 全校初中'],
      ['files', '读取有效作文样本口径', '教研报告统计4,250份'],
      ['scan-text', '读取有效 AI 评分口径', '教研报告统计3,921份'],
      ['pen-line', '读取二次修改样本口径', '教研报告统计1,647份'],
      ['users-round', '确认年级与班级覆盖', '学校汇总表覆盖六至九年级 · 16个班'],
      ['calendar-range', '建立学期时间范围', '学校任务记录覆盖本学期主要写作训练'],
      ['badge-check', '区分两类数据用途', '教研报告用于核心指标与结论，学校汇总表用于确认覆盖范围'],
      ['shield-check', '锁定报告呈现口径', '后续分析不跨口径换算或补造未提供的数值']
    ], signal);
    await wait(950, signal);
    commitStage(stage);
    finishTurn(turn);
  }

  async function runLayerAnalysis(signal) {
    const stage = appendStage('layer-analysis', '第二步 · 分层研判年级、各班作文整体表现与学期动态变化', '形成校级作文学情分层分析', '六至九年级 · 16个班');
    const content = stage.querySelector('.v4-stage-content');
    content.innerHTML = `<p class="v4-stage-copy">学生整体具备稳定叙事基础，初中写作呈现清晰年级梯度。九年级写作水平显著领先，六、八年级能力持平，七年级为能力提升关键薄弱学段。</p><div class="v4-discovery-grid"><article><span>整体水平</span><strong>32.47分</strong><small>绝大多数学生可确立清晰中心、完成完整叙事</small></article><article><span>即时改进</span><strong>68.7%</strong><small>习作修改后得分上涨，但结构性调整偏少</small></article></div>${analysisTable(['年级', '整体表现', '修改表现', '本学期研判'], [['六年级', '写作基础与八年级能力持平', '二次修改平均提分2.41分', '素材内容、创新亮点偏弱'], ['七年级', '能力提升关键薄弱学段', '二次修改平均提分1.63分', '审题立意、篇章结构短板最突出'], ['八年级', '写作基础与六年级能力持平', '二次修改平均提分2.41分', '逻辑思维、谋篇布局不足'], ['九年级', '写作水平显著领先', '二次修改平均提分3.82分', '创新立意、思辨深度仍需加强']], '分年级作文学情分析')}<div class="v4-cross-matrix"><div class="v4-cross-row"><span>记叙基础</span><strong>中心确立 × 完整叙事 × 场景描写</strong><b class="is-support">全年级底盘稳定</b></div><div class="v4-cross-row"><span>学段梯度</span><strong>六年级 × 七年级 × 八年级 × 九年级</strong><b class="is-support">年级差异清晰</b></div><div class="v4-cross-row"><span>班级实施</span><strong>任务布置 × 提交 × 批改 × 二改</strong><b>闭环落实不均衡</b></div></div><div class="v4-boundary-strip"><span>${icon('chart-no-axes-combined')}阶段结果：形成校级作文学情分层分析。</span></div>`;
    await playActivity(content, '正在分层研判年级与班级表现', [
      ['chart-no-axes-combined', '读取全校整体水平', '教研报告给定整体均分32.47分'],
      ['layers-3', '建立年级写作梯度', '九年级领先，六、八年级持平，七年级重点提升'],
      ['school', '确认班级任务覆盖', '学校汇总表覆盖16个班，班级结论沿用教研报告表述'],
      ['calendar-range', '整理学期训练过程', '按报告中的布置、批改、讲评、二改闭环进行复盘'],
      ['pen-line', '比较年级修改提分', '九3.82 · 六/八2.41 · 七1.63'],
      ['arrow-right-left', '整合年级长短板', '能力维度与修改效果按教研报告结论并列呈现'],
      ['badge-check', '形成分层分析', '保留全校共性与年级差异']
    ], signal);
    await wait(1100, signal);
    commitStage(stage);
  }

  async function runProblemDiagnosis(signal) {
    const stage = appendStage('problem-diagnosis', '第三步 · 定位全校作文教学共性问题、年级差异化问题', '形成核心问题清单与数据支撑依据', '8个写作维度');
    const content = stage.querySelector('.v4-stage-content');
    content.innerHTML = `<p class="v4-stage-copy">围绕审题立意、中心主旨、内容素材、篇章结构、细节描写、语言表达、创新亮点、逻辑思维八大写作维度，区分全年级共同短板与不同学段的典型问题。</p>${analysisTable(['分析层级', '优势或问题', '数据支撑与典型表现'], [['全校优势', '语言表达、细节描写', '全年级得分相对均衡，场景与感官细节运用较好'], ['全校优势', '中心主旨', '大部分习作可以确立清晰中心，严重偏题跑题较少'], ['全校共性问题', '素材组织与详略安排', '结构平铺直叙，铺垫冗长，核心事件展开不足'], ['全校共性问题', '审题思辨与主题升华', '立意停留表层，缺少多层次感悟和独立思考'], ['六年级', '素材内容、创新亮点', '素材同质化，个性化生活素材不足'], ['七年级', '审题立意、篇章结构', '立意浅层，段落排布松散，详略失衡'], ['八年级', '逻辑思维、谋篇布局', '细节丰富但材料取舍随意，主线不够突出'], ['九年级', '创新立意、思辨深度', '框架成熟稳定，构思趋于保守']], '核心问题清单与数据支撑依据')}<div class="v4-hypothesis-list"><article><span>文体结构</span><strong>记叙文 92.7%</strong><small>研究调查报告2.8%、读后感2.3%、演讲稿2.3%</small></article><article><span>正向特征</span><strong>善于捕捉生活小事和运用细节烘托情绪</strong><small>多数习作立意贴合命题，语言通顺</small></article><article><span>核心问题</span><strong>审题广度、素材储备、篇章统筹、思辨思维</strong><small>四类问题跨年级反复出现</small></article></div><div class="v4-final-boundary">${icon('scale')}阶段结果：形成全校共性问题、年级差异化问题及数据支撑依据。</div>`;
    await playActivity(content, '正在定位核心问题并核对数据依据', [
      ['scan-search', '分析审题立意', '核对偏题、立意层次与题意贴合程度'],
      ['target', '分析中心主旨', '核对中心明确度与素材服务关系'],
      ['library', '分析内容素材', '识别素材同质化与生活素材挖掘程度'],
      ['layout-list', '分析篇章结构', '检查段落主次、铺垫长度与详略安排'],
      ['scan-text', '分析细节描写', '检查场景、动作与感官细节的表达效果'],
      ['languages', '分析语言表达', '核对语句通顺度与文字可读性'],
      ['sparkles', '分析创新亮点与逻辑思维', '检查构思新意、观点提炼与主题升华'],
      ['files', '比较不同文体表现', '记叙文与读后感、研究报告、演讲稿分开研判'],
      ['list-checks', '生成核心问题清单', '区分全校共性与四个年级差异']
    ], signal);
    await wait(1200, signal);
    commitStage(stage);
  }

  async function runTeachingReview(signal) {
    const stage = appendStage('teaching-review', '第四步 · 复盘作文课堂实施、训练闭环与学生写作学习状态', '梳理教学推进成效与薄弱环节', '布置—批改—讲评—二改');
    const content = stage.querySelector('.v4-stage-content');
    content.innerHTML = `<p class="v4-stage-copy">全校学生能够依托作文讲评反馈开展习作修改优化，但习得的写作方法难以持续迁移，同类写作问题存在反复发生的现象。</p><div class="v4-index-result"><div><strong>+2.31</strong><span>二次修改平均提分</span></div><div><strong>68.7%</strong><span>修改提分转化率</span></div><div><strong>39.2%</strong><span>方法稳定迁移占比</span></div><div><strong>72.4%</strong><span>规范修改完成率</span></div></div>${analysisTable(['复盘项目', '本学期表现', '教学研判'], [['习作布置与批改', '训练总量充足，记叙文序列训练较成熟', '基础写作底盘稳固'], ['课堂讲评与即时修改', '超过六成习作修改后得分上涨', '讲评反馈能够带来即时改进'], ['结构性修改', '文字润色、细节补充较多，框架和选材调整较少', '需从表层修改转向思维迭代'], ['方法稳定迁移', '仅39.2%学生将写作策略迁移到后续习作', '同类问题在新任务中反复出现'], ['年级闭环差异', '九年级89.1%，七年级61.5%', '年级、班级执行力度差距明显'], ['多元文体闭环', '调查报告、读后感等缺少配套讲评与二改', '需完善全文体训练机制']], '作文教学实施与改进成效复盘')}<div class="v4-cross-matrix"><div class="v4-cross-row"><span>九年级</span><strong>习作规范修改完成率</strong><b class="is-support">89.1% · 闭环成效突出</b></div><div class="v4-cross-row"><span>七年级</span><strong>习作规范修改完成率</strong><b>61.5% · 订正复盘薄弱</b></div><div class="v4-cross-row"><span>全校</span><strong>单篇修改 → 思维迭代</strong><b class="is-support">下一阶段教研重点</b></div></div><div class="v4-final-boundary">${icon('badge-check')}阶段结果：梳理作文教学推进成效与薄弱环节。</div>`;
    await playActivity(content, '正在复盘作文课堂实施与训练闭环', [
      ['clipboard-list', '复盘习作布置', '依据教研报告梳理文体结构与训练安排'],
      ['scan-text', '复盘作文批改', '连接教师反馈、AI多维诊断与修改记录'],
      ['presentation', '复盘课堂讲评', '检查反馈是否落到语言、细节、结构和选材'],
      ['pen-line', '分析二次修改成效', '1,647份样本 · 平均提分2.31分'],
      ['trending-up', '读取修改提分转化率', '教研报告给定68.7%习作修改后得分上涨'],
      ['repeat-2', '读取方法稳定迁移结论', '教研报告给定39.2%迁移到后续习作'],
      ['school', '比较年级闭环落实', '九年级89.1% · 七年级61.5%'],
      ['badge-check', '形成教学复盘结论', '推动单篇修改转向思维迭代']
    ], signal);
    await wait(1200, signal);
    commitStage(stage);
  }

  async function runSchoolJudgment(signal) {
    const stage = appendStage('school-judgment', '第五步 · 综合研判校级作文学业整体水平', '形成本学期初中作文教学综合研判结论', '2项优势 · 2项问题');
    const content = stage.querySelector('.v4-stage-content');
    content.innerHTML = `<p class="v4-stage-copy">全校记叙文教学体系成型，学生具备基础叙事能力与习作修改提升空间；写作核心短板集中在谋篇布局、素材思辨、多元文体驾驭，同时不同学段呈现差异化薄弱特征。</p><div class="v4-discovery-grid"><article><span>整体优势 01</span><strong>学生接纳写作指导的能力较强</strong><small>68.7%二改样本得分上涨，修改提分通道通畅</small></article><article><span>整体优势 02</span><strong>记叙文序列训练体系完善</strong><small>大部分学生能够读懂题意、确立中心并完成基础叙事</small></article></div>${analysisTable(['综合研判项', '本学期判断', '主要依据'], [['整体写作水平', '记叙文写作具备扎实基础，呈现清晰年级梯度', '4,250份样本、3,921份有效AI评分、整体均分32.47'], ['即时修改成效', '学生能够吸收讲评反馈完成当前习作优化', '1,647份二改样本，68.7%修改后得分上涨'], ['长期迁移情况', '习得方法难以持续迁移', '方法稳定迁移占比39.2%'], ['共性核心问题', '篇章规划、素材组织、思辨表达、多元文体', '跨年级能力维度与典型习作特征共同指向'], ['年级差异问题', '六素材、七审题结构、八谋篇逻辑、九创新思辨', '年级分层画像与修改提分差异'], ['教学实施差异', '训练总量充足，年级班级闭环执行不均衡', '规范修改完成率72.4%，九89.1%，七61.5%']], '校级作文教学综合研判')}<div class="v4-hypothesis-list"><article><span>核心问题 01</span><strong>篇章规划意识不足</strong><small>素材组织与详略安排普遍失衡</small></article><article><span>核心问题 02</span><strong>写作能力发展不均衡</strong><small>思辨能力与非记叙文体存在明显短板</small></article><article><span>教研转向</span><strong>从文字润色转向思维训练</strong><small>把单次修改收获转化为稳定可迁移能力</small></article></div><div class="v4-boundary-strip"><span>${icon('shield-check')}阶段结果：形成本学期初中作文教学综合研判结论。</span></div>`;
    await playActivity(content, '正在综合研判校级作文整体水平', [
      ['files', '汇总整体水平与年级梯度', '按教研报告中的样本、评分、均分与年级画像综合呈现'],
      ['sparkles', '提炼校级教学优势', '指导吸收能力与记叙文训练体系进入优势清单'],
      ['triangle-alert', '识别共性核心问题', '篇章规划、素材思辨与多元文体进入问题清单'],
      ['layers-3', '核对年级差异问题', '六、七、八、九年级分别形成典型问题'],
      ['history', '连接教学实施与学习结果', '即时提分与长期迁移分开判断'],
      ['scale', '确定校级综合结论', '优势、问题、学段差异和实施差异相互印证']
    ], signal);
    await wait(1250, signal);
    commitStage(stage);
  }

  async function runSupportPlan(signal) {
    const stage = appendStage('support-plan', '第六步 · 提出分层改进实施建议', '面向教研组、年级备课组、各班教师输出教学优化方案', '3类实施主体');
    const content = stage.querySelector('.v4-stage-content');
    content.innerHTML = `<p class="v4-stage-copy">面向语文教研组、各年级备课组、全体语文教师，输出校级教研优化策略、分层教学指导方向、校本写作资源建设方案。</p><div class="v4-support-grid"><div class="v4-plan-column"><h4>语文教研组层面</h4><div class="v4-plan-item is-keep">${icon('school')}<span><b>课程框架</b>构建阶梯式写作序列，补齐非记叙文体教学缺口。</span></div><div class="v4-plan-item is-keep">${icon('list-checks')}<span><b>评价标准</b>建立全校统一的作文多维评价标准。</span></div><div class="v4-plan-item is-watch">${icon('library')}<span><b>资源建设</b>汇编范例、问题诊疗清单和分层训练任务包。</span></div></div><div class="v4-plan-column"><h4>各年级备课组层面</h4><div class="v4-plan-item is-keep">${icon('layers-3')}<span><b>分层训练</b>依据本年级短板定制专题讲评内容。</span></div><div class="v4-plan-item is-keep">${icon('repeat-2')}<span><b>完整闭环</b>规范布置、批改、讲评、二次修改流程。</span></div><div class="v4-plan-item is-watch">${icon('chart-no-axes-combined')}<span><b>跟踪样本</b>监测方法迁移，开展班际学情对比研讨。</span></div></div><div class="v4-plan-column"><h4>全体语文教师层面</h4><div class="v4-plan-item is-keep">${icon('users-round')}<span><b>分层指导</b>区分优生、中等生、待提升群体设置目标。</span></div><div class="v4-plan-item is-keep">${icon('layout-list')}<span><b>结构指导</b>引导学生重构素材、调整文章布局。</span></div><div class="v4-plan-item is-watch">${icon('history')}<span><b>持续追踪</b>以后续习作检验改进要点是否稳定保持。</span></div></div></div>${analysisTable(['实施主体', '重点任务', '对应诊断问题', '跟踪方式'], [['语文教研组', '阶梯式写作序列与全文体课程框架', '非记叙文训练占比不足，多元文体驾驭薄弱', '学期文体配比与校本资源建设进度'], ['各年级备课组', '学段差异化专题讲评与完整训练闭环', '年级长短板不同，班级执行力度不均衡', '年级修改完成率与方法迁移样本'], ['全体语文教师', '班级分层指导与结构性修改训练', '表层修改多，谋篇选材调整少', '代表性习作及后续同类任务表现']], '分层改进与协同支持方案')}<div class="v4-final-boundary">${icon('shield-check')}阶段结果：形成校级教研优化策略、分层教学指导方向、校本写作资源建设方案。</div>`;
    await playActivity(content, '正在生成分层改进与协同支持方案', [
      ['school', '生成语文教研组方案', '完善校本写作课程框架与统一评价标准'],
      ['library', '生成校本资源建设方案', '范例、问题诊疗清单和分层任务包'],
      ['layers-3', '生成各年级备课组方案', '按六、七、八、九年级短板靶向训练'],
      ['repeat-2', '规范完整教学闭环', '习作布置—批改—讲评—二次修改'],
      ['users-round', '生成任课教师分层指导方案', '优生、中等生、待提升群体设置差异化目标'],
      ['layout-list', '强化结构性问题指导', '从词句修改转向素材重构与篇章调整'],
      ['history', '建立后续习作追踪', '检验方法是否稳定迁移到新任务'],
      ['list-checks', '绑定问题与实施主体', '每项建议对应诊断问题和跟踪方式']
    ], signal);
    await wait(1250, signal);
    commitStage(stage);
  }

  async function runReportReview(signal) {
    const stage = appendStage('report-review', '第七步 · 撰写、复核校级初中作文综合学情分析报告', '按既定板块完成报告内审', '7个板块 · 8项检查');
    const content = stage.querySelector('.v4-stage-content');
    content.innerHTML = `<div class="v4-report-sections"><span>01 标题与基本信息</span><span>02 学期初中语文作文学情发展全景</span><span>03 作文专项能力深度分析</span><span>04 写作实施与改进成效</span><span>05 关键优势与核心问题诊断</span><span>06 分层改进与协同支持方案</span><span>07 发展期待</span></div>${analysisTable(['审核项', '审核口径', '结果'], [['学校、周期、对象和报告日期是否准确', '上海民办克勒外国语学校 · 本学期 · 全校初中 · 2026年7月', '通过'], ['核心指标是否与教研报告学校部分一致', '4,250、3,921、32.47、1,647及修改指标逐项核对', '通过'], ['整体结论是否覆盖优势、共性问题和年级差异', '总览、专项分析和综合诊断交叉核对', '通过'], ['作文分析是否具体到写作维度与文体', '八大写作维度及四类文体分别呈现', '通过'], ['改进成效是否区分即时提分与稳定迁移', '68.7%与39.2%分开解释', '通过'], ['分层建议是否对应三类实施主体', '教研组、备课组、任课教师分别明确', '通过'], ['建议是否与诊断问题对应', '课程、训练闭环、分层指导和跟踪方式逐项绑定', '通过'], ['报告文字是否严格遵循教研材料学校部分', '结论、数据、建议与发展期待按原文呈现', '通过']], '校级作文综合学情分析报告内审')}<div class="v4-final-boundary">${icon('file-check-2')}阶段结果：《上海民办克勒外国语学校・本学期初中语文学科作文综合分析报告》已按七个板块生成并完成内审。</div>`;
    await playActivity(content, '正在生成报告并执行质量复核', [
      ['file-text', '生成标题与基本信息', '写入学校、周期、对象、编制单位和日期'],
      ['chart-no-axes-combined', '生成学期作文学情发展全景', '呈现整体水平、年级梯度与结论摘要'],
      ['scan-text', '生成作文专项能力深度分析', '呈现八大维度、文体差异和典型特征'],
      ['history', '生成写作实施与改进成效', '复盘训练闭环、即时提分与稳定迁移'],
      ['clipboard-check', '生成关键优势与核心问题诊断', '区分整体亮点、共性问题和年级差异'],
      ['users-round', '生成分层改进与协同支持方案', '教研组、备课组、任课教师分层呈现'],
      ['sparkles', '生成发展期待', '明确下一阶段校级作文教学发展方向'],
      ['calculator', '核对报告指标', '与教研报告学校部分逐项核对样本、评分、均分、修改与文体占比'],
      ['search-check', '核对报告文字', '严格遵循教研材料学校部分内容'],
      ['badge-check', '完成报告内审', '七个板块与八项审核全部通过']
    ], signal);
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

  const REPORT_URL = 'assets/shanghai-keller-school-writing-report.html?v=school-writing-v4-06';

  function renderReport() {
    $('reportDocument').innerHTML = `<iframe class="v4-report-frame" title="上海民办克勒外国语学校本学期初中语文学科作文综合分析报告" src="${REPORT_URL}"></iframe>`;
  }

  function openReportPreview() {
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

  async function downloadReport() {
    const response = await fetch(REPORT_URL, { cache: 'no-store' });
    if (!response.ok) return;
    const html = await response.text();
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = '上海民办克勒外国语学校 · 本学期初中语文学科作文综合分析报告.html';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
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
    const statuses = [
      '正在调取并汇总学校作文学情数据',
      '正在分层研判年级与班级表现',
      '正在定位共性与差异化问题',
      '正在复盘作文教学实施与训练闭环',
      '正在综合研判校级作文整体水平',
      '正在提出分层改进实施建议',
      '正在撰写并复核校级作文报告'
    ];
    try {
      while (state.cursor < state.runners.length) {
        $('runStatus').textContent = statuses[state.cursor] || '正在研究';
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
      $('runStatus').textContent = '研究已暂停 · 可从当前判断继续';
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
    const turn = createTurn(`followup-${Date.now()}`, { title: '追问已回应', meta: '基于当前学校作文报告' });
    const lead = turn.querySelector('.v4-turn-lead');
    if (/七年级|审题|结构/.test(text)) {
      lead.textContent = '七年级是本学期能力提升关键薄弱学段，审题立意、篇章结构短板最突出；习作修改平均提分1.63分，较多学生仍停留在字词修改。';
    } else if (/修改|二改|迁移/.test(text)) {
      lead.textContent = '全校二次修改平均提分2.31分，68.7%习作修改后得分上涨；但方法稳定迁移占比仅39.2%，下一阶段需要把“单篇修改”转向“思维迭代”。';
    } else if (/文体|读后感|调查/.test(text)) {
      lead.textContent = '本学期记叙文占92.7%，研究调查报告2.8%、读后感2.3%、演讲稿2.3%。非记叙文体训练和配套讲评、二次修改仍需补齐。';
    } else {
      lead.textContent = '这个关注方向已记录。当前回答继续以学校作文报告的数据口径和七步分析结果为依据。';
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
    });
    $('reportDialog').addEventListener('close', () => document.body.classList.remove('report-open'));
  }

  function init() {
    $('queryText').textContent = new URLSearchParams(location.search).get('q') || '帮我分析这个学校的作文数据';
    state.runners = [runSchoolOverview, runLayerAnalysis, runProblemDiagnosis, runTeachingReview, runSchoolJudgment, runSupportPlan, runReportReview];
    bindEvents();
    refreshIcons();
    runResearch();
  }

  init();
}());
