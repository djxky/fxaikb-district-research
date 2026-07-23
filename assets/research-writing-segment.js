(function () {
  'use strict';

  const scope = document.body.dataset.analysisScope === 'class' ? 'class' : 'grade';
  const configs = {
    grade: {
      defaultQuery: '帮我分析这个学校七年级本学期的作文数据',
      subject: '七年级',
      canvasEyebrow: '基于本年级各班多源习作数据的教学诊断与备课组改进建议',
      canvasTitle: '上海民办克勒外国语学校七年级本学期语文学科作文综合学情分析',
      lead: '我将以教研材料七年级部分为核心统计与结论口径，结合学校汇总表核对任务覆盖；依次完成年级概览、班际研判、问题定位、教学复盘、综合判断和分层建议，最后完成报告内审。',
      reportUrl: 'assets/shanghai-keller-grade7-writing-report.html?v=grade7-writing-v1-03',
      reportTitle: '上海民办克勒外国语学校七年级本学期语文学科作文综合分析报告',
      downloadName: '上海民办克勒外国语学校 · 七年级本学期语文学科作文综合分析报告.html',
      statuses: ['正在调取七年级作文学情数据', '正在比较各班表现与学期变化', '正在定位年级共性短板与班级差异', '正在复盘训练安排与订正反馈', '正在评估七年级整体发展水平', '正在形成分层改进建议', '正在撰写并复核七年级作文报告'],
      stages: [
        {
          tag: '第一步 · 调取汇总七年级各班作文学情数据', title: '形成年级学期数据概览与质量说明', meta: '1,344份样本',
          copy: '七年级共有1,344份有效作文样本，占全校31.6%，生均约7.2篇；其中1,326份获得有效AI评分，年级均分28.82分，较全校整体均分低3.65分。',
          cards: [['有效作文样本', '1,344份', '教研报告统计口径'], ['有效AI评分', '1,326份', '缺失2份，占0.15%'], ['年级整体均分', '28.82分', '低于全校3.65分'], ['平台任务记录', '4班 · 20条', '汇总表过程口径']],
          note: '七年级学生已具备基本叙事能力，但审题精准度和篇章结构是本学期最需要优先解决的问题。',
          activity: [['files', '读取有效作文样本', '教研报告统计1,344份'], ['scan-text', '核对有效AI评分', '1,326份，缺失2份'], ['chart-no-axes-combined', '计算年级整体水平', '28.82分，低于全校整体均分3.65分'], ['school', '核对班级覆盖', '学校汇总表覆盖七年级4个班'], ['list-checks', '形成数据质量说明', '89份无AI评分且无教师批改，占6.6%']]
        },
        {
          tag: '第二步 · 对比各班写作表现、群体得分变化', title: '形成年级班际学情分析', meta: '4个班',
          copy: '七年级写作水平处于能力提升关键阶段，语言表达与细节描写相对稳定，但班级之间在审题、结构和训练闭环落实上仍存在差异。',
          rows: [['分析维度', '七年级表现', '研判'], ['语言与细节', '整体得分相对稳定', '具备叙事基础'], ['偏题情况', '偏题习作占12.3%', '审题精准度不足'], ['篇章结构', '结构松散占41.5%', '年级共性短板'], ['高分区间', '31—40分占32%', '低于全校3.7个百分点']],
          note: '班际比较既保留年级共性，也关注训练安排和修改反馈造成的班级差异。',
          activity: [['layers-3', '建立班际比较框架', '比较整体表现、能力维度和学期变化'], ['languages', '研判语言与细节表现', '稳定基础得到保留'], ['target', '统计偏题表现', '偏题习作占12.3%'], ['layout-list', '定位结构问题', '结构松散占41.5%'], ['chart-no-axes-combined', '比较分数区间', '31—40分占32%']]
        },
        {
          tag: '第三步 · 定位年级共性短板、班级典型差异', title: '形成核心问题清单与数据依据', meta: '审题 · 结构',
          copy: '年级共性问题集中在审题精准度、篇章结构和文体适应：记叙文占94.2%，非记叙文仅58份，非记叙文平均得分低8—10分；篇章结构维度标准差达到5.8。',
          rows: [['问题', '数据依据', '教学含义'], ['审题精准度不足', '偏题习作占12.3%', '需建立题意拆解与立意校验流程'], ['结构组织松散', '结构松散占41.5%', '需强化提纲、主次和详略训练'], ['文体适应不足', '非记叙文仅58份，均分低8—10分', '需逐步补充说明、议论类训练'], ['班级发展不均衡', '班级均分极差4.2分', '需开展班际共备与针对性支持']],
          note: '核心短板并非语言表达，而是审题、谋篇和文体迁移。',
          activity: [['scan-search', '定位审题问题', '核对偏题比例与典型表现'], ['layout-list', '定位篇章结构问题', '检查段落主次与详略关系'], ['files', '比较不同文体表现', '非记叙文样本与得分单独研判'], ['school', '比较班级差异', '班级均分极差4.2分'], ['list-checks', '形成问题优先级', '审题精准度与篇章结构优先']]
        },
        {
          tag: '第四步 · 分析训练安排、订正反馈、学习状态', title: '梳理教学推进成效与薄弱环节', meta: '8次统一训练',
          copy: '七年级共开展8次统一写作训练，完整教学闭环落实率78.3%，低于九年级89.1%；512份习作完成二次修改，平均提分1.63分。',
          rows: [['过程指标', '结果', '判断'], ['统一写作训练', '8次', '训练安排较稳定'], ['完整教学闭环', '78.3%', '低于九年级89.1%'], ['二次修改', '512份，平均提分1.63分', '即时改进可见'], ['修改方式', '32%结构调整，68%表层修改', '深层修改不足'], ['修改完成/改善', '61.5% / 59.2%', '较全校低9.5个百分点']],
          note: '学生能够依据反馈修改，但多数仍停留在字词和句式层面，结构性重写比例不足。',
          activity: [['calendar-range', '复盘训练安排', '本学期8次统一写作训练'], ['repeat-2', '核对教学闭环', '落实率78.3%'], ['pen-line', '统计二次修改', '512份，平均提分1.63分'], ['layout-list', '区分修改层级', '32%结构调整，68%表层修改'], ['history', '判断学习状态', '修改完成率与改善率均有提升空间']]
        },
        {
          tag: '第五步 · 评估七年级整体发展水平', title: '形成综合学情判断', meta: '优势 · 问题 · 风险',
          copy: '七年级处于从“能写完整”向“写得准确、有层次”过渡的关键阶段。语言基础和真实生活素材是优势，审题、结构与训练闭环不均衡是当前主要制约。',
          rows: [['综合维度', '结论'], ['稳定基础', '语病率8.7%，低于全校2.1个百分点；82%习作包含真实生活场景'], ['核心短板', '审题立意浅层、段落排布松散、详略失衡'], ['班级差异', '部分班级二次修改完成率不足50%，班级均分极差4.2分'], ['发展判断', '需通过统一策略与班级分层支持缩小校级差距']],
          note: '七年级的主要任务不是增加训练数量，而是提高审题、谋篇与二次修改的训练质量。',
          activity: [['badge-check', '确认稳定优势', '语言基础与生活化素材较好'], ['triangle-alert', '确认核心短板', '审题、结构与修改深度'], ['users-round', '识别重点支持班级', '关注闭环完成率低于50%的班级'], ['scale', '形成发展判断', '从完整叙事走向准确审题和规范结构']]
        },
        {
          tag: '第六步 · 面向备课组、任课教师提出建议', title: '形成分层教学优化方案', meta: '3类实施主体',
          copy: '建议围绕审题精准度、篇章结构规范和教学闭环三个方向推进，分别明确年级备课组、任课教师和学生的行动任务。',
          rows: [['实施主体', '改进建议', '执行节奏'], ['年级备课组', '每月1次审题训练、2次结构仿写；统一二次修改反馈标准', '月度共备与复盘'], ['任课教师', '按学生基础设置分层目标；每两周开展1次班级集体修改', '双周实施'], ['学生', '写作前完成结构思维导图；建立个人写作错题本', '每次习作落实']],
          note: '所有建议均与审题、结构和二次修改三个诊断问题直接对应。',
          activity: [['layers-3', '生成备课组方案', '统一训练节奏与修改反馈标准'], ['users-round', '生成任课教师方案', '设置分层目标与集体修改'], ['notebook-pen', '生成学生行动方案', '结构思维导图与个人错题本'], ['calendar-check', '绑定执行节奏', '月度、双周与每次习作分层落实'], ['list-checks', '校验建议对应关系', '每项建议均绑定诊断问题']]
        },
        {
          tag: '第七步 · 生成、审核七年级作文综合分析报告', title: '按既定板块完成报告内审', meta: '7个板块',
          copy: '报告已依次覆盖基本信息、学情全景、专项能力、实施成效、问题诊断、分层建议和发展期待。',
          rows: [['审核项', '核对结果'], ['核心数值与教研材料七年级部分一致', '通过'], ['结论覆盖优势、短板、班级差异与过程成效', '通过'], ['建议对应备课组、任课教师与学生', '通过'], ['发展期待包含八年级衔接与非记叙文训练', '通过']],
          note: '发展期待：提升审题精准度和结构规范性，逐步引入简单议论文、说明文训练，为八年级写作衔接做准备。',
          activity: [['file-text', '生成报告基本信息', '写入学校、年级、周期和对象'], ['chart-no-axes-combined', '生成学情发展全景', '呈现样本、评分与年级差距'], ['scan-text', '生成专项能力分析', '呈现审题、结构与文体差异'], ['history', '生成训练实施复盘', '呈现闭环、二改与改善表现'], ['users-round', '生成分层支持方案', '备课组、教师和学生分层呈现'], ['calculator', '核对报告指标', '逐项核对教研材料原始数值'], ['badge-check', '完成报告内审', '七个板块全部通过']]
        }
      ],
      followups: [
        [/审题|偏题/, '七年级偏题习作占12.3%。建议把题意关键词、限制条件和中心句预设纳入每次写作前的固定检查。'],
        [/结构|详略/, '结构松散习作占41.5%，且仅32%的二次修改涉及结构调整。优先训练提纲、主次分配和核心事件展开。'],
        [/修改|二改/, '七年级512份习作完成二次修改，平均提分1.63分；目前68%仍以表层修改为主，需要把反馈指向结构重写。']
      ]
    },
    class: {
      defaultQuery: '九年级2班本学期的作文数据反映出哪些问题？',
      subject: '九年级2班',
      canvasEyebrow: '基于班级学生多源习作数据的学情诊断与分层指导建议',
      canvasTitle: '上海民办克勒外国语学校九年级2班本学期语文学科作文综合学情分析',
      lead: '我将以教研材料九年级2班部分为核心统计与结论口径，结合学校汇总表核对任务记录；依次完成班级概览、群体表现研判、问题定位、教学复盘、综合判断和分层建议，最后完成报告内审。',
      reportUrl: 'assets/shanghai-keller-grade9-class2-writing-report.html?v=class92-writing-v1-03',
      reportTitle: '上海民办克勒外国语学校九年级2班本学期语文学科作文综合分析报告',
      downloadName: '上海民办克勒外国语学校 · 九年级2班本学期语文学科作文综合分析报告.html',
      statuses: ['正在调取九年级2班作文学情数据', '正在研判班级整体与群体表现', '正在定位班级共性与个体差异', '正在复盘训练闭环与修改成效', '正在评估班级整体发展水平', '正在形成分层指导建议', '正在撰写并复核班级作文报告'],
      stages: [
        {
          tag: '第一步 · 调取汇总九年级2班作文学情数据', title: '形成班级学期数据概览与质量说明', meta: '48份样本',
          copy: '九年级2班共有48份有效作文样本，9名学生，生均5.3篇；48份均获得有效AI评分，班级均分42.3分，低于九年级均分44.64分，差距2.34分。',
          cards: [['有效作文样本', '48份', '教研报告统计口径'], ['有效AI评分', '48份', '数据完整率100%'], ['班级整体均分', '42.3分', '低于年级2.34分'], ['平台任务记录', '9条', '汇总表过程口径']],
          note: '班级已具备较成熟的叙事框架与中心表达，但整体得分仍低于年级均值，创新表达和思辨深度是主要提升方向。',
          activity: [['files', '读取有效作文样本', '教研报告统计48份'], ['users-round', '确认分析对象', '9名学生，生均5.3篇'], ['scan-text', '核对AI评分完整性', '48份有效评分，完整率100%'], ['calculator', '校正均分比较方向', '42.3分低于44.64分，差距2.34分'], ['calendar-range', '核对平台任务记录', '学校汇总表记录9条写作任务']]
        },
        {
          tag: '第二步 · 研判班级整体表现与群体得分变化', title: '形成班级作文学情分层分析', meta: '9名学生',
          copy: '班级中心主旨与篇章结构表现较好，中心明确度92%、结构完整度83%，均高于年级同维度3—4个百分点；但高分段占比仍有提升空间。',
          rows: [['分析维度', '班级表现', '研判'], ['中心主旨', '中心明确度92%', '班级稳定优势'], ['篇章结构', '结构完整度83%', '高于年级同维度'], ['分数区间', '41—50分占65%', '主体群体较稳定'], ['高分突破', '51分以上占8%', '拔尖表达不足']],
          note: '班级整体不是“不会写”，而是成熟框架下的高阶表达突破不足。',
          activity: [['target', '研判中心主旨', '中心明确度92%'], ['layout-list', '研判篇章结构', '结构完整度83%'], ['chart-no-axes-combined', '分析分数区间', '41—50分占65%'], ['sparkles', '识别高分突破情况', '51分以上仅占8%'], ['layers-3', '形成群体分层判断', '稳定主体与重点支持对象分开研判']]
        },
        {
          tag: '第三步 · 定位班级共性问题与学生典型差异', title: '形成核心问题清单与数据依据', meta: '创新 · 深度',
          copy: '75%的习作构思相似，62%的习作议论深度不足；叙事类习作46份，占96%，均分43.1分；2份读后感均分38.5分。',
          rows: [['问题', '数据依据', '教学含义'], ['构思同质化', '75%习作构思相似', '需拓展素材选择和切入角度'], ['议论深度不足', '62%习作议论深度不足', '需强化观点推进与主题升华'], ['文体适应偏弱', '2份读后感均分38.5分', '需补充非记叙文体训练'], ['个体差异', '2名学生逻辑衔接有缺口，1名学生写作速度偏慢', '需实施分层支持']],
          note: '班级没有严重跑题或结构缺失问题，主要矛盾已转向创新表达、论述深度和个体短板。',
          activity: [['sparkles', '分析构思创新', '75%习作构思相似'], ['messages-square', '分析议论深度', '62%习作议论深度不足'], ['files', '比较文体表现', '叙事类与读后感分开研判'], ['users-round', '识别个体差异', '2名逻辑衔接、1名写作速度需支持'], ['list-checks', '形成问题优先级', '创新表达与思辨深度优先']]
        },
        {
          tag: '第四步 · 分析训练安排、订正反馈、学习状态', title: '梳理教学推进成效与薄弱环节', meta: '6次训练',
          copy: '班级完成6次写作训练，完整教学闭环落实率92%，高于年级89.1%；44份习作完成二次修改，平均提分3.1分，低于年级均值3.82分，差距0.72分。',
          rows: [['过程指标', '结果', '判断'], ['写作训练', '6次', '训练安排稳定'], ['完整教学闭环', '92%', '高于年级89.1%'], ['二次修改', '44份，平均提分3.1分', '低于年级均值0.72分'], ['修改方式', '56%优化逻辑，23%实现创新', '修改层级较深'], ['修改完成/改善', '92% / 82%', '均高于年级89.1% / 78%']],
          note: '班级修改执行较好，但一名学生缺交2次修改；下一步需把较高的闭环完成率转化为更稳定的高分突破。',
          activity: [['calendar-range', '复盘训练安排', '本学期6次写作训练'], ['repeat-2', '核对教学闭环', '落实率92%，高于年级89.1%'], ['pen-line', '统计二次修改', '44份，平均提分3.1分'], ['calculator', '校正提分比较方向', '3.1分低于3.82分，差距0.72分'], ['history', '判断修改质量', '56%优化逻辑，23%实现创新']]
        },
        {
          tag: '第五步 · 评估九年级2班整体发展水平', title: '形成班级综合学情判断', meta: '优势 · 问题 · 个体',
          copy: '九年级2班叙事框架、中心表达和修改执行较稳定，具备中考写作的基本能力；高阶表达的主要瓶颈是构思趋同、论述深度不足及少数学生的逻辑与速度问题。',
          rows: [['综合维度', '结论'], ['稳定优势', '无严重结构缺失和偏题问题，中心与结构维度表现较好'], ['过程成效', '闭环落实率92%，修改完成率92%，改善率82%'], ['核心问题', '构思同质化、议论深度不足、高分段占比偏低'], ['重点对象', '2名学生逻辑衔接需加强，1名学生写作速度与篇幅需支持']],
          note: '班级下一阶段应从“稳定完成”转向“差异化构思、深入表达和高分突破”。',
          activity: [['badge-check', '确认稳定优势', '中心、结构与教学闭环较稳'], ['triangle-alert', '确认核心瓶颈', '创新表达与思辨深度'], ['users-round', '识别重点支持学生', '逻辑衔接与写作速度分别支持'], ['scale', '形成发展判断', '由稳定完成转向高阶表达']]
        },
        {
          tag: '第六步 · 面向任课教师与学生提出建议', title: '形成班级分层指导方案', meta: '教师 · 学生',
          copy: '建议按学生基础实施分层目标，并通过高分作文拆解、构思碰撞和个人论据素材积累，提升创新表达与思辨深度。',
          rows: [['实施主体', '改进建议', '执行节奏'], ['任课教师', '前3名侧重创新表达；中间5名强化论证深度；1名重点支持限时写作与逻辑衔接', '分层跟踪'], ['任课教师', '每两周开展1次高分作文拆解', '双周实施'], ['学生小组', '3人一组，每周开展1次构思碰撞', '每周实施'], ['学生个人', '建立个人论据与素材积累本', '持续积累']],
          note: '分层方案分别对应拔尖突破、主体群体深化和重点学生补弱。',
          activity: [['layers-3', '生成教师分层目标', '前3名、中间5名与1名重点支持对象分别设置任务'], ['scan-text', '设计高分作文拆解', '每两周聚焦构思、论证与表达'], ['users-round', '设计小组构思碰撞', '3人一组，每周1次'], ['notebook-pen', '设计个人积累任务', '建立论据与素材积累本'], ['list-checks', '校验分层对应关系', '建议与诊断问题逐项绑定']]
        },
        {
          tag: '第七步 · 生成、审核九年级2班作文综合分析报告', title: '按既定板块完成报告内审', meta: '7个板块',
          copy: '报告已依次覆盖基本信息、班级全景、专项能力、实施成效、问题诊断、分层建议和发展期待，并完成数值关系复核。',
          rows: [['审核项', '核对结果'], ['42.3分与44.64分的关系已校正为低2.34分', '通过'], ['3.1分与3.82分的关系已校正为低0.72分', '通过'], ['其余核心数据与教研材料九年级2班部分一致', '通过'], ['建议覆盖教师分层、小组协作与学生个人积累', '通过']],
          note: '发展期待：巩固稳定叙事基础，重点提升创新构思与思辨深度，增加高分段比例，并加强非记叙文体训练以服务中考备考。',
          activity: [['file-text', '生成报告基本信息', '写入学校、班级、周期和对象'], ['chart-no-axes-combined', '生成班级学情全景', '呈现样本、均分与分数区间'], ['scan-text', '生成专项能力分析', '呈现中心、结构、创新与文体差异'], ['history', '生成训练实施复盘', '呈现闭环、二改与改善表现'], ['calculator', '复核两处比较关系', '确认均分与提分均为低于年级均值'], ['users-round', '生成分层指导方案', '教师、小组与个人分层呈现'], ['badge-check', '完成报告内审', '七个板块全部通过']]
        }
      ],
      followups: [
        [/均分|2.34/, '九年级2班均分42.3分，低于九年级均值44.64分，差距2.34分。这里已按数值关系修正为“低于”。'],
        [/修改|提分|0.72/, '44份习作二次修改后平均提分3.1分，低于年级均值3.82分，差距0.72分；班级优势在于修改完成率和改善率。'],
        [/创新|思辨|高分/, '75%的习作构思相似，62%的习作议论深度不足，51分以上仅占8%。应把训练重点放在切入角度、论据推进和主题升华。']
      ]
    }
  };

  const config = configs[scope];
  const state = { cursor: 0, running: false, controller: null, startedAt: 0, elapsed: 0, timer: null, reducedMotion: matchMedia?.('(prefers-reduced-motion: reduce)').matches, quick: new URLSearchParams(location.search).get('quick') === '1' };
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const icon = (name, className = '') => `<i data-lucide="${name}"${className ? ` class="${className}"` : ''}></i>`;
  const refreshIcons = () => window.lucide?.createIcons();
  const duration = (ms) => state.reducedMotion ? 12 : Math.max(18, ms * (state.quick ? .055 : 1));
  const wait = (ms, signal) => new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(Object.assign(new Error('已停止'), { name: 'AbortError' }));
    const timer = setTimeout(resolve, duration(ms));
    signal?.addEventListener('abort', () => { clearTimeout(timer); reject(Object.assign(new Error('已停止'), { name: 'AbortError' })); }, { once: true });
  });
  const table = (rows) => `<div class="v4-analysis-table"><table><thead><tr>${rows[0].map((cell) => `<th>${esc(cell)}</th>`).join('')}</tr></thead><tbody>${rows.slice(1).map((row) => `<tr>${row.map((cell) => `<td>${esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const cards = (items) => `<div class="v4-source-grid">${items.map(([label, value, note], index) => `<article class="v4-source-card">${icon(['files', 'scan-text', 'chart-no-axes-combined', 'school'][index] || 'badge-check')}<span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(note)}</small></article>`).join('')}</div>`;

  function elapsedText() {
    const active = state.running ? Date.now() - state.startedAt : 0;
    const seconds = Math.floor((state.elapsed + active) / 1000);
    return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }
  function startTimer() { clearInterval(state.timer); state.timer = setInterval(() => { $('runElapsed').textContent = elapsedText(); }, 250); }
  function pauseTimer() { if (state.running) state.elapsed += Date.now() - state.startedAt; clearInterval(state.timer); state.timer = null; $('runElapsed').textContent = elapsedText(); }
  function scrollLatest(force = false) {
    const run = () => {
      const root = document.scrollingElement || document.documentElement;
      const max = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, root.scrollHeight);
      const near = innerHeight + scrollY >= max - 220;
      if (force || near || state.quick) {
        const behavior = state.reducedMotion ? 'auto' : 'smooth';
        scrollTo({ top: max, behavior });
        root.scrollTop = max;
        $('finishMessage')?.scrollIntoView({ block: 'end', behavior });
      }
    };
    force ? requestAnimationFrame(() => requestAnimationFrame(run)) : run();
  }
  function ensureCanvas() {
    let turn = document.querySelector('[data-turn="research-canvas"]');
    if (turn) return turn;
    turn = document.createElement('article');
    turn.className = 'v4-turn v4-turn--canvas is-spotlight';
    turn.dataset.turn = 'research-canvas';
    turn.innerHTML = `<img class="v4-avatar" src="assets/home/chat-logo.png" alt="飞象老师"><div class="v4-turn-main"><button class="v4-turn-summary" type="button" aria-expanded="false"><span class="v4-summary-check">${icon('check')}</span><strong>${esc(config.subject)}作文综合学情分析已完成</strong><span class="v4-summary-meta">7步分析流程 · 7个报告板块</span>${icon('chevron-down', 'v4-summary-chevron')}</button><div class="v4-turn-body"><p class="v4-turn-lead">${esc(config.lead)}</p><div class="v4-turn-content"><section class="v4-research-canvas"><header class="v4-canvas-head"><div><span>${esc(config.canvasEyebrow)}</span><h2>${esc(config.canvasTitle)}</h2></div><div class="v4-canvas-state"><i></i><span>正在综合分析</span></div></header><div class="v4-research-timeline" id="researchTimeline"></div><footer class="v4-canvas-foot"><span>${icon('shield-check')}统计与结论 · 教研材料对应部分</span><span>${icon('book-open')}任务覆盖 · 学校汇总表核对</span></footer></section></div></div></div>`;
    $('agentStream').appendChild(turn);
    refreshIcons();
    return turn;
  }
  function appendStage(index, data) {
    document.querySelectorAll('.v4-research-stage.is-complete').forEach((node) => {
      node.classList.add('is-collapsed');
      node.querySelector('.v4-stage-heading')?.setAttribute('aria-expanded', 'false');
    });
    const node = document.createElement('section');
    node.className = 'v4-research-stage is-running';
    node.dataset.stage = String(index + 1);
    node.dataset.transient = 'true';
    node.innerHTML = `<span class="v4-stage-marker">${icon('loader-circle')}</span><div class="v4-stage-main"><button class="v4-stage-heading" type="button" aria-expanded="true"><span class="v4-stage-heading-copy"><span>${esc(data.tag)}</span><strong>${esc(data.title)}</strong></span><span class="v4-stage-heading-side"><small>${esc(data.meta)}</small>${icon('chevron-up', 'v4-stage-chevron')}</span></button><div class="v4-stage-content"><p class="v4-stage-copy">${esc(data.copy)}</p>${data.cards ? cards(data.cards) : ''}${data.rows ? table(data.rows) : ''}<div class="v4-boundary-strip"><span>${icon('shield-check')}${esc(data.note)}</span></div></div></div>`;
    $('researchTimeline').appendChild(node);
    refreshIcons();
    requestAnimationFrame(() => node.classList.add('is-visible'));
    return node;
  }
  async function playActivity(content, data, signal) {
    content.classList.add('is-activity-running');
    const panel = document.createElement('section');
    panel.className = 'v4-activity';
    panel.innerHTML = `<header><span>${icon('sparkles')}<strong>正在执行本步分析</strong></span><small>0/${data.activity.length}</small></header><div class="v4-activity-window"><div class="v4-activity-list"></div></div>`;
    content.prepend(panel);
    const list = panel.querySelector('.v4-activity-list');
    for (let i = 0; i < data.activity.length; i += 1) {
      if (signal.aborted) throw Object.assign(new Error('已停止'), { name: 'AbortError' });
      const previous = list.querySelector('.is-current');
      if (previous) { previous.classList.remove('is-current'); previous.querySelector('strong').textContent = previous.querySelector('strong').dataset.complete; }
      const [name, action, detail] = data.activity[i];
      list.insertAdjacentHTML('beforeend', `<div class="v4-activity-row is-current"><span class="v4-activity-icon">${icon(name)}</span><div><strong data-complete="${esc(`已${action}`)}">正在${esc(action)}</strong><small>${esc(detail)}</small></div></div>`);
      panel.querySelector('header small').textContent = `${i + 1}/${data.activity.length}`;
      refreshIcons();
      panel.querySelector('.v4-activity-window').scrollTo({ top: list.scrollHeight, behavior: state.reducedMotion ? 'auto' : 'smooth' });
      scrollLatest();
      await wait(360, signal);
    }
    const current = list.querySelector('.is-current');
    if (current) { current.classList.remove('is-current'); current.querySelector('strong').textContent = current.querySelector('strong').dataset.complete; }
    panel.classList.add('is-complete');
    panel.querySelector('header strong').textContent = '本步分析已完成';
    content.classList.remove('is-activity-running');
    content.classList.add('is-result-ready');
    refreshIcons();
  }
  async function runStage(index, signal) {
    ensureCanvas();
    const node = appendStage(index, config.stages[index]);
    await playActivity(node.querySelector('.v4-stage-content'), config.stages[index], signal);
    await wait(700, signal);
    delete node.dataset.transient;
    node.classList.remove('is-running');
    node.classList.add('is-complete');
    node.querySelector('.v4-stage-marker').innerHTML = icon('check');
    refreshIcons();
    if (index === config.stages.length - 1) {
      const canvas = document.querySelector('.v4-research-canvas');
      canvas.classList.add('is-finished');
      canvas.querySelector('.v4-canvas-state span').textContent = '研究已完成';
    }
  }
  function completeResearch() {
    pauseTimer();
    state.running = false;
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
    if (state.running) return;
    state.running = true;
    state.startedAt = Date.now();
    state.controller = new AbortController();
    startTimer();
    $('runToolbar').className = 'v4-runbar';
    $('stopResearch').hidden = false;
    $('continueResearch').hidden = true;
    $('restartResearch').hidden = true;
    $('finishMessage').hidden = true;
    try {
      while (state.cursor < config.stages.length) {
        $('runStatus').textContent = config.statuses[state.cursor];
        await runStage(state.cursor, state.controller.signal);
        state.cursor += 1;
      }
      completeResearch();
    } catch (error) {
      if (error.name !== 'AbortError') {
        pauseTimer(); state.running = false; $('errorMessage').hidden = false; $('errorMessage').textContent = `研究过程暂时中断：${error.message}`; return;
      }
      document.querySelectorAll('[data-transient="true"]').forEach((node) => node.remove());
      pauseTimer();
      state.running = false;
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
      state.running = false; state.cursor = 0; state.elapsed = 0;
      $('runElapsed').textContent = '00:00'; $('agentStream').innerHTML = ''; $('finishMessage').hidden = true; $('errorMessage').hidden = true;
      closeReport(); runResearch();
    }, state.reducedMotion ? 15 : 80);
  }
  function openReport() {
    $('reportDocument').innerHTML = `<iframe class="v4-report-frame" title="${esc(config.reportTitle)}" src="${config.reportUrl}"></iframe>`;
    document.body.classList.add('report-open');
    const dialog = $('reportDialog');
    if (!dialog.open) dialog.show();
    requestAnimationFrame(() => dialog.classList.add('is-visible'));
  }
  function closeReport() {
    const dialog = $('reportDialog');
    dialog.classList.remove('is-visible');
    document.body.classList.remove('report-open');
    setTimeout(() => { if (dialog.open) dialog.close(); }, state.reducedMotion ? 10 : 260);
  }
  async function downloadReport() {
    const response = await fetch(config.reportUrl, { cache: 'no-store' });
    if (!response.ok) return;
    const url = URL.createObjectURL(new Blob([await response.text()], { type: 'text/html;charset=utf-8' }));
    const link = Object.assign(document.createElement('a'), { href: url, download: config.downloadName });
    document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function followup() {
    const input = $('followupInput');
    const text = input.value.trim();
    if (!text) return;
    const user = document.createElement('div');
    user.className = 'v4-followup-user';
    user.textContent = text;
    $('agentStream').appendChild(user);
    input.value = ''; $('sendFollowup').disabled = true;
    const answer = config.followups.find(([pattern]) => pattern.test(text))?.[1] || `这个关注方向已记录。当前回答继续以${config.subject}作文报告的数据口径和七步分析结果为依据。`;
    const turn = document.createElement('article');
    turn.className = 'v4-turn';
    turn.innerHTML = `<img class="v4-avatar" src="assets/home/chat-logo.png" alt="飞象老师"><div class="v4-turn-main"><div class="v4-turn-body" style="display:block"><p class="v4-turn-lead">${esc(answer)}</p></div></div>`;
    $('agentStream').appendChild(turn);
    refreshIcons(); scrollLatest();
  }
  function bind() {
    $('stopResearch').addEventListener('click', () => state.controller?.abort());
    $('continueResearch').addEventListener('click', runResearch);
    $('restartResearch').addEventListener('click', restartResearch);
    $('openReport').addEventListener('click', openReport);
    $('closeReport').addEventListener('click', closeReport);
    $('downloadReport').addEventListener('click', downloadReport);
    $('sendFollowup').addEventListener('click', followup);
    $('followupInput').addEventListener('input', () => { $('sendFollowup').disabled = !$('followupInput').value.trim(); });
    $('followupInput').addEventListener('keydown', (event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); followup(); } });
    $('agentStream').addEventListener('click', (event) => {
      const heading = event.target.closest('.v4-stage-heading');
      if (!heading) return;
      const stage = heading.closest('.v4-research-stage');
      if (!stage?.classList.contains('is-complete')) return;
      stage.classList.toggle('is-collapsed');
      heading.setAttribute('aria-expanded', String(!stage.classList.contains('is-collapsed')));
    });
    $('reportDialog').addEventListener('close', () => document.body.classList.remove('report-open'));
  }
  $('queryText').textContent = new URLSearchParams(location.search).get('q') || config.defaultQuery;
  bind();
  refreshIcons();
  runResearch();
}());
