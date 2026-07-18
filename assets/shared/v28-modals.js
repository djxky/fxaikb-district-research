/* ============================================================
 * v28-modals.js · 全站浮层底座 + 下载弹窗
 * ------------------------------------------------------------
 * API：
 *   V28Modal.open({ html, onMount, onClose, size })   → id
 *   V28Modal.close(id)                                 关闭指定弹窗
 *   V28Modal.closeTop()                                关闭最上层
 *   V28Modal.closeAll()                                关闭全部
 *
 *   V28DownloadDialog.open({ context, kbName?, subject? })
 *
 * 关闭路径：× 按钮 / overlay 点击 / ESC
 * ============================================================ */

(function(global){
  'use strict';

  /* ─────────── 通用 Modal 管理器 ─────────── */
  const STACK = [];
  let UID = 0;
  let lastFocus = null;

  function ensureRoot(){
    let root = document.getElementById('v28m-root');
    if(root) return root;
    root = document.createElement('div');
    root.id = 'v28m-root';
    document.body.appendChild(root);
    return root;
  }

  function open(opts){
    opts = opts || {};
    const id = `v28m-${++UID}`;
    const root = ensureRoot();

    if(!STACK.length) lastFocus = document.activeElement;

    const overlay = document.createElement('div');
    overlay.className = 'v28m-overlay';
    overlay.dataset.modalId = id;
    overlay.addEventListener('click', () => close(id));

    const dialog = document.createElement('div');
    dialog.className = `v28m${opts.size ? ' size-' + opts.size : ''}`;
    dialog.dataset.modalId = id;
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    if(opts.docId) dialog.dataset.doc = opts.docId;
    dialog.innerHTML = opts.html || '';
    dialog.addEventListener('click', (e) => e.stopPropagation());

    root.appendChild(overlay);
    root.appendChild(dialog);

    /* 给 × 按钮自动挂关闭 */
    dialog.querySelectorAll('[data-v28m-close]').forEach(btn => {
      btn.addEventListener('click', () => close(id));
    });

    STACK.push({ id, overlay, dialog, onClose: opts.onClose });

    requestAnimationFrame(() => {
      overlay.classList.add('open');
      dialog.classList.add('open');
      try{ window.lucide && window.lucide.createIcons(); }catch(e){}
      if(typeof opts.onMount === 'function') opts.onMount(dialog, id);
      const auto = dialog.querySelector('[autofocus], .v28m-btn.primary, .v28m-input');
      if(auto && typeof auto.focus === 'function') auto.focus({ preventScroll: true });
    });

    return id;
  }

  function close(id){
    const idx = STACK.findIndex(x => x.id === id);
    if(idx < 0) return;
    const item = STACK[idx];
    STACK.splice(idx, 1);

    item.overlay.classList.remove('open');
    item.dialog.classList.remove('open');
    setTimeout(() => {
      item.overlay.remove();
      item.dialog.remove();
      if(typeof item.onClose === 'function') item.onClose();
      if(!STACK.length && lastFocus && typeof lastFocus.focus === 'function'){
        try{ lastFocus.focus({ preventScroll: true }); }catch(e){}
        lastFocus = null;
      }
    }, 200);
  }

  function closeTop(){
    const top = STACK[STACK.length - 1];
    if(top) close(top.id);
  }

  function closeAll(){
    while(STACK.length) close(STACK[STACK.length - 1].id);
  }

  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape' && STACK.length) closeTop();
  });

  global.V28Modal = { open, close, closeTop, closeAll, _stack: STACK };


  /* ════════════════════════════════════════════════════════════
   *  下载弹窗 · 5 场景配置驱动
   * ════════════════════════════════════════════════════════════ */

  /* 下载场景配置
   * --------------------------------------------------------
   * mode: 'confirm' | 'options' | 'instant'
   *   confirm  → 弹二次确认 → 点下载进 loading → 浏览器下载
   *   options  → 选项弹窗（compose-sheet 专用）→ 点确定进 loading → 浏览器下载
   *   instant  → 不弹窗，直接触发浏览器下载（file-preview 原文件）
   * isOriginal=true → 原文件下载（文案：下载中）；false → AI 生成（文案：文档生成中）
   */
  const DL_CONTEXTS = {
    'personal-home': {
      mode: 'confirm',
      title: '导出 · 我的知识库',
      defaultName: () => `张老师_我的知识库_${dateTag()}`,
      format: 'docx'
    },
    'wiki-home': {
      mode: 'confirm',
      title: ({ kbName }) => `导出 · ${kbName || '团队'} Wiki 汇总`,
      defaultName: ({ kbName }) => `${kbName || '初中数学教研组'}_Wiki汇总_${dateTag()}`,
      format: 'docx'
    },
    'wiki-entry': {
      mode: 'confirm',
      title: ({ subject }) => `导出 · ${subject || 'Wiki 词条'}`,
      defaultName: ({ subject }) => `${subject || '二次函数图像与性质'}_${dateTag()}`,
      format: 'docx'
    },
    'file-preview': {
      mode: 'instant',
      isOriginal: true,
      defaultName: ({ subject }) => subject || '二次函数·导入课件.pptx',
      format: 'source'
    },
    'compose-sheet': {
      mode: 'options',
      title: '下载',
      description: '文件将自动生成姓名和学号区域，用于扫描批改时自动识别学生身份。',
      defaultName: ({ subject }) => `${subject || '二次函数练习_八(3)班'}_${dateTag()}`,
      format: 'docx',
      /* options 是函数 · 按来源切换：
       *   source='ai'    AI 组题 → 答案解析 + 命题说明书（默认）
       *   source='qbank' 题库组题 → 仅答案解析（题库题没有 AI 命题说明书）
       * 由 07-compose-sheet.html 调用时通过 source 参数传入
       */
      options: (meta) => {
        const isQbank = meta && meta.source === 'qbank';
        const arr = [{ v: 'answer', label: '答案解析' }];
        if(!isQbank) arr.push({ v: 'spec', label: '命题说明书' });
        return arr;
      }
    }
  };

  function dateTag(){
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  }
  function fmtExt(v){
    /* source = 保留原后缀（由 filename 自带），不补扩展名 */
    return { pdf:'.pdf', docx:'.docx', source:'' }[v] || `.${v}`;
  }
  function escHtml(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }

  /* ─────────────────────────────────────────────────────────────
   * 主路由 · 按 ctx.mode 派发
   * ─────────────────────────────────────────────────────────── */
  function openDownload(opts){
    opts = opts || {};
    const ctxKey = opts.context || 'wiki-entry';
    const ctx = DL_CONTEXTS[ctxKey];
    if(!ctx){ console.warn('[V28DownloadDialog] unknown context:', ctxKey); return; }

    const meta = {
      kbName: opts.kbName || '',
      subject: opts.subject || '',
      source: opts.source || ''   /* compose-sheet 专用：'ai' | 'qbank' */
    };

    const state = {
      format: ctx.format,
      options: {},
      filename: (typeof ctx.defaultName === 'function' ? ctx.defaultName(meta) : (ctx.defaultName || 'download'))
    };
    const fullName = state.filename + fmtExt(state.format);

    switch(ctx.mode){
      case 'instant':
        /* 原文件 · 不弹窗 · 直接 toast + 浏览器下载 */
        if(typeof window.showToast === 'function') window.showToast(`已开始下载 ${fullName}`);
        triggerBrowserDownload(fullName);
        return;
      case 'confirm':
        openConfirmDialog(ctx, state, meta, fullName);
        return;
      case 'options':
        openOptionsDialog(ctx, state, meta, fullName);
        return;
      default:
        console.warn('[V28DownloadDialog] unknown mode:', ctx.mode);
    }
  }

  /* ─────────────────────────────────────────────────────────────
   * confirm 模式 · Wiki 类 · 二次确认 → loading → 浏览器下载
   * 参考图：标题副标题为文件名，按钮"取消 / 下载"
   * ─────────────────────────────────────────────────────────── */
  function openConfirmDialog(ctx, state, meta, fullName){
    const title = typeof ctx.title === 'function' ? ctx.title(meta) : ctx.title;

    const html = `
      <div class="v28m-head">
        <div class="v28m-title">
          ${escHtml(title)}
          <div class="v28m-title-sub">${escHtml(fullName)}</div>
        </div>
        <button class="v28m-close" data-v28m-close aria-label="关闭">
          <i data-lucide="x"></i>
        </button>
      </div>
      <div class="v28m-foot">
        <button class="v28m-btn" data-v28m-close>取消</button>
        <button class="v28m-btn primary" data-role="confirm">
          <i data-lucide="download"></i><span>下载</span>
        </button>
      </div>
    `;

    V28Modal.open({
      html, docId: 'download-dialog',
      onMount: (root, id) => {
        const btn = root.querySelector('[data-role="confirm"]');
        if(btn) btn.addEventListener('click', () => switchToLoading(root, id, ctx, fullName));
      }
    });
  }

  /* ─────────────────────────────────────────────────────────────
   * options 模式 · compose-sheet · 文件卡片 + checkbox
   * ─────────────────────────────────────────────────────────── */
  function openOptionsDialog(ctx, state, meta, fullName){
    /* options 支持函数（按 meta 动态返回）或数组 */
    const opts = typeof ctx.options === 'function' ? ctx.options(meta) : (ctx.options || []);

    const html = `
      <div class="v28m-head">
        <div class="v28m-title">${escHtml(ctx.title)}</div>
        <button class="v28m-close" data-v28m-close aria-label="关闭">
          <i data-lucide="x"></i>
        </button>
      </div>
      <div class="v28m-body">
        ${ctx.description ? `<p class="v28m-desc">${escHtml(ctx.description)}</p>` : ''}
        <div class="v28-dl-card">
          <div class="v28-dl-card-icon"><i data-lucide="file-text"></i></div>
          <div class="v28-dl-card-body">
            <div class="v28-dl-card-name" title="${escHtml(fullName)}">${escHtml(fullName)}</div>
            ${opts.length ? `
              <div class="v28-dl-card-opts">
                ${opts.map(o => `
                  <label class="v28m-check">
                    <input type="checkbox" data-opt="${escHtml(o.v)}" />
                    <span>${escHtml(o.label)}</span>
                  </label>
                `).join('')}
              </div>
            ` : ''}
          </div>
        </div>
      </div>
      <div class="v28m-foot">
        <button class="v28m-btn" data-v28m-close>取消</button>
        <button class="v28m-btn primary" data-role="confirm">确定</button>
      </div>
    `;

    V28Modal.open({
      html, docId: 'download-dialog',
      onMount: (root, id) => {
        root.querySelectorAll('[data-opt]').forEach(cb => {
          cb.addEventListener('change', () => { state.options[cb.dataset.opt] = cb.checked; });
        });
        const btn = root.querySelector('[data-role="confirm"]');
        if(btn) btn.addEventListener('click', () => switchToLoading(root, id, ctx, fullName));
      }
    });
  }

  /* ─────────────────────────────────────────────────────────────
   * 切到 loading 态 · 无进度条 · 只 spinner + 副文案
   * 1.5s 后触发浏览器下载并关闭弹窗
   * ─────────────────────────────────────────────────────────── */
  function switchToLoading(root, id, ctx, fullName){
    const isOriginal = !!ctx.isOriginal;
    const head = root.querySelector('.v28m-head');
    const foot = root.querySelector('.v28m-foot');

    if(head){
      head.innerHTML = `
        <div class="v28m-title is-loading">
          <i class="v28m-title-spin" data-lucide="loader-2"></i>
          <span>${isOriginal ? '下载中…' : '文档生成中…'}</span>
        </div>
        <button class="v28m-close" data-v28m-close aria-label="关闭">
          <i data-lucide="x"></i>
        </button>
      `;
      head.querySelectorAll('[data-v28m-close]').forEach(b => b.addEventListener('click', () => V28Modal.close(id)));
    }

    /* 替换 body 为副文案；options 模式原本就有 body，confirm 模式没有 → 动态插一个 */
    let body = root.querySelector('.v28m-body');
    if(!body){
      body = document.createElement('div');
      body.className = 'v28m-body';
      if(head) head.insertAdjacentElement('afterend', body);
    }
    body.innerHTML = `
      <p class="v28m-loading-sub">${isOriginal ? '请稍候。' : '可能需要一点时间，请暂时不要离开或关闭本页面。'}</p>
    `;

    if(foot){
      foot.innerHTML = `<button class="v28m-btn" data-v28m-close>取消</button>`;
      foot.querySelectorAll('[data-v28m-close]').forEach(b => b.addEventListener('click', () => V28Modal.close(id)));
    }

    try{ window.lucide && window.lucide.createIcons(); }catch(e){}

    /* 标记任务 id，关闭时判断是用户取消还是已完成 */
    const taskId = ++DL_TASK_SEQ;
    DL_ACTIVE_TASK = taskId;

    setTimeout(() => {
      if(DL_ACTIVE_TASK !== taskId) return; /* 已被用户取消 */
      DL_ACTIVE_TASK = null;
      V28Modal.close(id);
      if(typeof window.showToast === 'function'){
        window.showToast(`已开始下载 ${fullName}`);
      }
      triggerBrowserDownload(fullName);
    }, isOriginal ? 700 : 1500);
  }

  let DL_TASK_SEQ = 0;
  let DL_ACTIVE_TASK = null;

  /* 浏览器原生下载 · 演示态用 Blob 占位 */
  function triggerBrowserDownload(fullName){
    try{
      const blob = new Blob(
        [`飞象 AI · 演示文件\n文件名：${fullName}\n生成时间：${new Date().toLocaleString('zh-CN')}\n\n（实际上线后，此处为真实文档内容。）`],
        { type: 'application/octet-stream' }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fullName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    }catch(e){
      console.warn('[V28Download] 浏览器下载触发失败', e);
    }
  }

  global.V28DownloadDialog = { open: openDownload };


  /* ════════════════════════════════════════════════════════════
   *  分享弹窗 · 最简版
   * ------------------------------------------------------------
   *  设计原则：
   *  - 链接驱动：本校老师通过链接访问
   *  - 不做：权限分级、过期时间、密码、邀请指定人、二维码、海报、对外公开
   *  - UI：标题 + 只读链接 + 复制按钮 + 一行权限说明
   *
   *  API：V28ShareDialog.open({ context, subject?, kbName? })
   *  context: 'personal-home' | 'wiki-home' | 'wiki-entry' | 'file-preview'
   * ════════════════════════════════════════════════════════════ */

  const SHARE_CONTEXTS = {
    'personal-home': {
      title: '分享',
      urlPath: 'k',
      hint: '本校老师可通过链接访问'
    },
    'wiki-home': {
      title: '分享',
      urlPath: 'k',
      hint: '本校老师可通过链接访问'
    },
    'wiki-entry': {
      title: '分享',
      urlPath: 'w',
      hint: '本校老师可通过链接访问'
    },
    'file-preview': {
      title: '分享',
      urlPath: 'f',
      hint: '本校老师可通过链接访问'
    }
  };

  /* 简单稳定 hash · 同 subject/kbName 生成同一短码（避免每次开都不同看上去像 bug） */
  function shortHash(seed){
    seed = String(seed || 'feixiang');
    let h = 5381;
    for(let i = 0; i < seed.length; i++) h = ((h * 33) ^ seed.charCodeAt(i)) >>> 0;
    return h.toString(36).padStart(8, '0').slice(0, 8);
  }

  function openShare(opts){
    opts = opts || {};
    const ctxKey = opts.context || 'wiki-entry';
    const ctx = SHARE_CONTEXTS[ctxKey];
    if(!ctx){ console.warn('[V28ShareDialog] unknown context:', ctxKey); return; }

    const meta = { kbName: opts.kbName || '', subject: opts.subject || '' };
    const title = typeof ctx.title === 'function' ? ctx.title(meta) : ctx.title;
    const seed = meta.subject || meta.kbName || ctxKey;
    const url = `https://feixiang.ai/${ctx.urlPath}/${shortHash(seed)}`;

    const html = `
      <div class="v28m-head">
        <div class="v28m-title">${escHtml(title)}</div>
        <button class="v28m-close" data-v28m-close aria-label="关闭">
          <i data-lucide="x"></i>
        </button>
      </div>
      <div class="v28m-body">
        <div class="v28-share-row">
          <input class="v28m-input v28-share-url" readonly value="${escHtml(url)}" />
          <button class="v28m-btn primary v28-share-copy" data-role="copy">
            <i data-lucide="copy"></i><span>复制</span>
          </button>
        </div>
        <p class="v28-share-hint">
          <i data-lucide="info"></i>
          <span>${escHtml(ctx.hint)}</span>
        </p>
      </div>
    `;

    V28Modal.open({
      html, docId: 'share-dialog',
      onMount: (root, id) => {
        const btn = root.querySelector('[data-role="copy"]');
        const inp = root.querySelector('.v28-share-url');
        if(btn) btn.addEventListener('click', () => copyShareLink(btn, inp, url));
        /* 进入弹窗即自动选中文本 · 老师 cmd+c 也能复制 */
        if(inp){
          setTimeout(() => { try{ inp.focus(); inp.select(); }catch(e){} }, 80);
        }
      }
    });
  }

  function copyShareLink(btn, inp, url){
    const done = (ok) => {
      if(btn){
        const span = btn.querySelector('span');
        if(span){
          const orig = span.textContent;
          span.textContent = ok ? '已复制' : '复制失败';
          btn.classList.toggle('is-copied', ok);
          setTimeout(() => {
            span.textContent = orig;
            btn.classList.remove('is-copied');
          }, 1500);
        }
      }
      if(typeof window.showToast === 'function'){
        window.showToast(ok ? '链接已复制' : '复制失败，请手动选择链接复制');
      }
    };
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(url).then(() => done(true)).catch(() => fallbackCopy(inp, done));
    } else {
      fallbackCopy(inp, done);
    }
  }

  function fallbackCopy(inp, done){
    /* execCommand 兜底（HTTP 环境或老浏览器） */
    try{
      if(inp){
        inp.focus();
        inp.select();
        const ok = document.execCommand && document.execCommand('copy');
        done(!!ok);
      } else { done(false); }
    }catch(e){ done(false); }
  }

  global.V28ShareDialog = { open: openShare };


  /* ════════════════════════════════════════════════════════════
   *  AI 录题 · 选文件弹窗 + 任务状态机 + 进度 panel
   * ------------------------------------------------------------
   *  产品上下文（详见 AGENT-HANDOFF §53/§54）：
   *  AI 录题是"一次性任务"流程（不是持久配置）：
   *    1. 老师点 [+ AI 录题]
   *    2. 弹窗选 KB 里的 PDF/Word 文件（多选,每个文件 = 一个独立任务）
   *    3. 提交后后台 AI 解析(8-15s)
   *    4. 解析完进入"待校对"
   *    5. 老师点 [去校对] 跳 08-ai-review.html 校对
   *    6. 确认后题目入题库
   *
   *  当前校园版 demo 简化：
   *  - 校对页 08-ai-review.html 是占位页（实际校对功能由独立"AI 智能录题"
   *    项目提供,不在 v28 范围内）
   *  - 占位页提供"演示·直接入题库"按钮,推任务进"已入库"态,demo 闭环
   *
   *  对外 API：
   *    V28RecordDialog.open({ onSubmit(jobs) })   选文件弹窗
   *    V28RecordJobs.createBatch(files) → [jobs]  批量建任务
   *    V28RecordJobs.list()                       全部任务（新→旧）
   *    V28RecordJobs.get(id)                      单任务
   *    V28RecordJobs.markCommitted(id)            入库
   *    V28RecordJobs.pendingCount()               待校对数
   *    V28RecordJobs.parsingCount()               解析中数
   *    V28RecordJobs.syncTriggerBadge()           外部按钮 badge 同步
   *    V28RecordJobs.subscribe(fn)                状态变化订阅
   * ════════════════════════════════════════════════════════════ */

  /* mock KB 文件树 · 仅 PDF / Word（产品边界:其他格式 AI 暂不支持录题）
   * 实际接入时改为后端拉取 KB 的文件夹层级
   *
   * 节点类型:
   *   kb       知识库根（顶级）
   *   folder   文件夹
   *   file     文件（叶子,只展示 PDF/Word）
   */
  const RECORD_TREE = [
    {
      id:'kb-math', name:'初中数学教研组', type:'kb',
      children:[
        { id:'fld-zhongkao', name:'2024 中考真题集', type:'folder', children:[
          { id:'s1', type:'file', name:'2024 杭州中考真题.pdf', ext:'pdf',  size:'2.4 MB' },
          { id:'s2', type:'file', name:'2023 上海中考真题.pdf', ext:'pdf',  size:'1.8 MB' }
        ]},
        { id:'fld-textbook', name:'教材教案', type:'folder', children:[
          { id:'fld-grade8', name:'八年级下册', type:'folder', children:[
            { id:'s3', type:'file', name:'二次函数图像与性质·教案.docx', ext:'docx', size:'1.2 MB' },
            { id:'s6', type:'file', name:'圆与三角形综合训练.docx',       ext:'docx', size:'520 KB' }
          ]},
          { id:'s4', type:'file', name:'人教版八年级数学下册.pdf', ext:'pdf', size:'18.6 MB' }
        ]},
        { id:'fld-mock', name:'期中模拟卷', type:'folder', children:[
          { id:'s5', type:'file', name:'初二期中模拟卷.pdf', ext:'pdf', size:'860 KB' }
        ]}
      ]
    },
    {
      id:'kb-personal', name:'我的知识库', type:'kb',
      children:[
        { id:'s7', type:'file', name:'八(3)班错题汇总.docx', ext:'docx', size:'480 KB' },
        { id:'s8', type:'file', name:'2024 月考易错题.pdf', ext:'pdf', size:'1.1 MB' }
      ]
    }
  ];

  /* 把树展平为扁平文件列表(用于:搜索/createBatch/blocked 判断/路径展示)
   * 每个 file 节点带 kbId/kbLabel/pathLabels(数组,不含 KB) */
  function flattenTreeFiles(tree){
    const out = [];
    function walk(node, kbId, kbLabel, path){
      if(node.type === 'file'){
        out.push({
          id: node.id,
          name: node.name,
          type: node.ext,
          size: node.size,
          kb: kbId,
          kbLabel: kbLabel,
          path: path.slice()   /* 不含 KB,不含文件本身 */
        });
        return;
      }
      const childKbId   = node.type === 'kb'     ? node.id   : kbId;
      const childKbLbl  = node.type === 'kb'     ? node.name : kbLabel;
      const childPath   = node.type === 'folder' ? path.concat(node.name) : path;
      (node.children || []).forEach(c => walk(c, childKbId, childKbLbl, childPath));
    }
    tree.forEach(n => walk(n, null, null, []));
    return out;
  }
  /* 收集树某节点下所有 file id(递归,用于文件夹/KB 全选) */
  function collectFileIds(node){
    if(node.type === 'file') return [node.id];
    return (node.children || []).reduce((acc, c) => acc.concat(collectFileIds(c)), []);
  }
  /* 判断节点本身/子树是否含至少一个 file(用于过滤空文件夹) */
  function hasAnyFile(node){
    if(node.type === 'file') return true;
    return (node.children || []).some(hasAnyFile);
  }

  const RECORD_FILE_POOL = flattenTreeFiles(RECORD_TREE);
  /* fileId → file 对象 · 加速查找 */
  const RECORD_FILE_MAP = {};
  RECORD_FILE_POOL.forEach(f => { RECORD_FILE_MAP[f.id] = f; });

  /* —— 任务状态机 + 持久化 —— */
  const RECORD_LS_KEY = 'v28-ai-record-jobs';
  const JOB_PARSE_MIN_MS = 8000;
  const JOB_PARSE_MAX_MS = 14000;
  const _scheduled = {};
  let _listeners = [];

  function _now(){ return Date.now(); }
  function _newJobId(){ return 'rec-' + Math.random().toString(36).slice(2, 10); }
  function _hash(s){
    s = String(s || '');
    let h = 5381;
    for(let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
    return h;
  }
  function _loadJobs(){
    try{
      const raw = localStorage.getItem(RECORD_LS_KEY);
      if(!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    }catch(e){ return []; }
  }
  function _saveJobs(jobs){
    try{ localStorage.setItem(RECORD_LS_KEY, JSON.stringify(jobs)); }catch(e){}
    _emit();
  }
  function _emit(){ _listeners.forEach(fn => { try{ fn(); }catch(e){} }); }

  function subscribeJobs(fn){
    if(typeof fn === 'function') _listeners.push(fn);
    return () => { _listeners = _listeners.filter(x => x !== fn); };
  }
  function listJobs(){
    return _loadJobs().sort((a, b) => b.createdAt - a.createdAt);
  }
  function getJob(id){
    return _loadJobs().find(j => j.id === id) || null;
  }
  function pendingCount(){
    return _loadJobs().filter(j => j.state === 'review-pending').length;
  }
  function parsingCount(){
    return _loadJobs().filter(j => j.state === 'parsing').length;
  }

  function createBatch(files){
    const jobs = _loadJobs();
    const created = [];
    files.forEach(f => {
      const id = _newJobId();
      const parseMs = JOB_PARSE_MIN_MS + Math.floor(Math.random() * (JOB_PARSE_MAX_MS - JOB_PARSE_MIN_MS));
      /* mock 题数:用文件名 hash 得 6~24,稳定可复现 */
      const qCount = 6 + (Math.abs(_hash(f.name)) % 19);
      const job = {
        id,
        fileId: f.id,
        fileName: f.name,
        fileType: f.type,
        fileSize: f.size,
        kbLabel: f.kbLabel || '',
        state: 'parsing',
        createdAt: _now(),
        parseDoneAt: null,
        committedAt: null,
        questionCount: qCount,
        _parseMs: parseMs
      };
      jobs.push(job);
      created.push(job);
      _scheduleFinish(id, parseMs);
    });
    _saveJobs(jobs);
    return created;
  }

  function _scheduleFinish(jobId, ms){
    if(_scheduled[jobId]) clearTimeout(_scheduled[jobId]);
    _scheduled[jobId] = setTimeout(() => {
      delete _scheduled[jobId];
      const jobs = _loadJobs();
      const j = jobs.find(x => x.id === jobId);
      if(!j || j.state !== 'parsing') return;
      j.state = 'review-pending';
      j.parseDoneAt = _now();
      _saveJobs(jobs);
      if(typeof window.showToast === 'function'){
        window.showToast(`AI 已解析完《${j.fileName}》· ${j.questionCount} 题待校对`);
      }
    }, ms);
  }

  function restorePending(){
    /* 跨页恢复:页面刷新/切换后,继续推进"解析中"任务的 setTimeout
     * (基于 createdAt + _parseMs 算剩余时间;超时则立刻置完成) */
    const jobs = _loadJobs();
    let dirty = false;
    jobs.forEach(j => {
      if(j.state !== 'parsing') return;
      const total = j._parseMs || 10000;
      const elapsed = _now() - j.createdAt;
      if(elapsed >= total){
        j.state = 'review-pending';
        j.parseDoneAt = _now();
        dirty = true;
      } else {
        _scheduleFinish(j.id, total - elapsed);
      }
    });
    if(dirty) _saveJobs(jobs);
  }

  function markCommitted(jobId){
    const jobs = _loadJobs();
    const j = jobs.find(x => x.id === jobId);
    if(!j) return null;
    j.state = 'committed';
    j.committedAt = _now();
    _saveJobs(jobs);
    return j;
  }

  function clearAllJobs(){
    Object.keys(_scheduled).forEach(k => { clearTimeout(_scheduled[k]); delete _scheduled[k]; });
    _saveJobs([]);
  }

  /* —— 选文件弹窗 · 树形展开 + 三态 checkbox + 兜底搜索 ——
   *
   * 树视图（默认折叠 KB,老师点开 → 看 → 勾）
   *   ▶ 📚 初中数学教研组        [☐]  ← KB checkbox = 全选所有 PDF/Word
   *     ▶ 📁 2024 中考真题集     [☐]  ← 文件夹 checkbox = 全选该文件夹下所有
   *       [☐] 🔴 杭州.pdf
   *       [☐] 🔴 上海.pdf
   *
   * 搜索模式（输入关键字 → 切扁平,带完整路径）
   *   [☐] 🔴 杭州.pdf      初中数学教研组 / 2024 中考真题集
   *
   * 三态:全选 ✓ / 半选 ◧ / 未选 ☐
   *   点半选/未选 → 全选; 点全选 → 全部取消
   *
   * 过滤规则:整个子树没有 PDF/Word 的文件夹不展示（避免空文件夹）
   */
  /* —— Q1 权限：团队 KB id 列表(demo 数据写死,实际由后端给) ——
   * 团队 KB 录题仅管理员可触发,普通老师视角 disabled
   * 详见 AGENT-HANDOFF §55 Q1 */
  const TEAM_KB_IDS = new Set(['kb-math']);

  function getCurrentRole(){
    /* URL `?role=teacher` → 普通老师视角(只读) · 否则默认 admin
     * 演示需要时也支持 localStorage['v28-role'] 持久化 */
    try{
      const params = new URLSearchParams(window.location.search);
      const r = params.get('role');
      if(r === 'teacher' || r === 'admin') return r;
      const ls = localStorage.getItem('v28-role');
      if(ls === 'teacher' || ls === 'admin') return ls;
    }catch(e){}
    return 'admin';
  }
  /* 节点是否在团队 KB 子树下(file/folder/kb 都能查) */
  function isInTeamKb(nodeOrId, tree){
    tree = tree || RECORD_TREE;
    function walk(node, underTeam){
      const nextUnder = underTeam || (node.type === 'kb' && TEAM_KB_IDS.has(node.id));
      if(node.id === nodeOrId || node === nodeOrId) return nextUnder;
      if(!node.children) return null;
      for(const c of node.children){
        const r = walk(c, nextUnder);
        if(r !== null) return r;
      }
      return null;
    }
    for(const root of tree){
      const r = walk(root, false);
      if(r !== null) return r;
    }
    return false;
  }

  function openRecordDialog(opts){
    opts = opts || {};
    const selectedIds = new Set();
    const expandedIds = new Set();   /* 哪些 KB/文件夹被展开 */
    let keyword = '';

    const role = getCurrentRole();
    const isTeacher = role === 'teacher';

    /* 排除"已在解析中或待校对"的文件,避免重复提交同一文件 */
    const blockedIds = new Set();
    /* Q2 已入库去重:fileId → questionCount 映射,提示"再录会重复" */
    const committedCounts = {};
    _loadJobs().forEach(j => {
      if(j.state === 'parsing' || j.state === 'review-pending') blockedIds.add(j.fileId);
      if(j.state === 'committed'){
        committedCounts[j.fileId] = (committedCounts[j.fileId] || 0) + (j.questionCount || 0);
      }
    });

    /* 节点是否被权限锁定(Q1):普通老师 + 团队 KB 子树下的所有文件不可选 */
    function isPermLocked(node){
      if(!isTeacher) return false;
      return isInTeamKb(node);
    }

    /* 节点(KB/folder)下可选 file id(排除 blocked + 排除权限锁定) */
    function selectableIdsOf(node){
      if(isPermLocked(node)) return [];
      return collectFileIds(node).filter(id => !blockedIds.has(id));
    }
    /* 节点三态:'all' | 'partial' | 'none'  ·  blocked/permLocked 不计入分母 */
    function tristate(node){
      const ids = selectableIdsOf(node);
      if(!ids.length) return 'none';
      const sel = ids.filter(id => selectedIds.has(id)).length;
      if(sel === 0) return 'none';
      if(sel === ids.length) return 'all';
      return 'partial';
    }

    /* preselectFileIds 支持(09 重新录题用):自动勾选 + 展开父节点链 */
    if(Array.isArray(opts.preselectFileIds) && opts.preselectFileIds.length){
      opts.preselectFileIds.forEach(fid => {
        const file = RECORD_FILE_MAP[fid];
        if(!file) return;
        if(blockedIds.has(fid)) return;
        if(isTeacher && isInTeamKb(fid)) return;
        selectedIds.add(fid);
        if(file.kb) expandedIds.add(file.kb);
        /* 把路径链上所有父文件夹也展开 */
        let n = findNode(RECORD_TREE, file.kb);
        if(n && file.path && file.path.length){
          const parts = file.path;
          let cursor = n;
          for(let i = 0; i < parts.length; i++){
            const next = (cursor.children || []).find(c => c.type === 'folder' && c.name === parts[i]);
            if(!next) break;
            expandedIds.add(next.id);
            cursor = next;
          }
        }
      });
    }

    const html = `
      <div class="v28m-head">
        <div class="v28m-title">
          AI 录题 · 选取要解析的文件
          <div class="v28m-title-sub">仅支持 PDF / Word · AI 解析为题面 / 答案 / 知识点 / 难度 · 完成后老师校对入库</div>
        </div>
        <button class="v28m-close" data-v28m-close aria-label="关闭">
          <i data-lucide="x"></i>
        </button>
      </div>
      <div class="v28m-body v28-src-body">
        <div class="v28-src-search">
          <i data-lucide="search"></i>
          <input class="v28m-input v28-src-search-input" type="text" placeholder="搜索文件名…（或层级浏览）" autocomplete="off" />
        </div>
        <div class="v28-src-list" id="v28-src-list"></div>
      </div>
      <div class="v28m-foot">
        <span class="v28m-foot-meta" id="v28-src-foot-meta">请勾选要解析的文件</span>
        <button class="v28m-btn" data-v28m-close>取消</button>
        <button class="v28m-btn primary" data-role="submit" disabled>
          <i data-lucide="sparkles"></i><span id="v28-src-submit-label">开始 AI 录题 (0)</span>
        </button>
      </div>
    `;

    V28Modal.open({
      html, docId: 'ai-record-dialog', size: 'md',
      onMount: (root, id) => {
        const listEl = root.querySelector('#v28-src-list');
        const searchInp = root.querySelector('.v28-src-search-input');
        const submitBtn = root.querySelector('[data-role="submit"]');
        const submitLabel = root.querySelector('#v28-src-submit-label');
        const footMeta = root.querySelector('#v28-src-foot-meta');

        function refreshSummary(){
          const n = selectedIds.size;
          if(submitLabel) submitLabel.textContent = `开始 AI 录题 (${n})`;
          if(footMeta) footMeta.textContent = n > 0
            ? `已选 ${n} 个文件 · 提交后每个文件生成 1 个独立任务`
            : '请勾选要解析的文件';
          if(submitBtn) submitBtn.disabled = n === 0;
        }

        /* —— 树渲染 —— */
        function renderNode(node, level){
          if(!hasAnyFile(node)) return '';   /* 过滤空文件夹 */

          if(node.type === 'file'){
            const isBlocked = blockedIds.has(node.id);
            const permLocked = isTeacher && isInTeamKb(node.id);
            const committedQ = committedCounts[node.id] || 0;
            const isCommitted = committedQ > 0;
            const isChecked = selectedIds.has(node.id);
            const disabled = isBlocked || permLocked;
            return `
              <div class="v28-tree-row v28-tree-file${isChecked ? ' is-checked' : ''}${disabled ? ' is-disabled' : ''}"
                   style="--lv:${level}" data-fid="${node.id}">
                <span class="v28-tree-caret v28-tree-caret--empty"></span>
                <span class="v28-tree-check ${isChecked ? 'is-on' : ''}" data-act="toggle-file" data-fid="${node.id}">
                  ${isChecked ? '<i data-lucide="check"></i>' : ''}
                </span>
                <span class="v28-src-icon v28-src-icon--${node.ext}"><i data-lucide="file-text"></i></span>
                <span class="v28-tree-name" title="${escHtml(node.name)}">${escHtml(node.name)}</span>
                <span class="v28-src-size">${escHtml(node.size)}</span>
                ${isBlocked ? '<span class="v28-src-tag">已在录题进度中</span>' : ''}
                ${!isBlocked && isCommitted ? `<span class="v28-src-tag v28-src-tag--committed" title="该文件已入库 ${committedQ} 题,再次录题会产生重复"><i data-lucide="check"></i>已入库 ${committedQ} 题</span>` : ''}
              </div>
            `;
          }

          /* KB / folder */
          const isExpanded = expandedIds.has(node.id);
          const tri = tristate(node);
          const isKb = node.type === 'kb';
          const permLocked = isTeacher && isKb && TEAM_KB_IDS.has(node.id);
          const allBlocked = selectableIdsOf(node).length === 0;
          const checkCls = tri === 'all' ? 'is-on' : (tri === 'partial' ? 'is-partial' : '');
          const checkInner = tri === 'all'     ? '<i data-lucide="check"></i>'
                           : tri === 'partial' ? '<i data-lucide="minus"></i>'
                           : '';
          const childHtml = isExpanded
            ? (node.children || []).map(c => renderNode(c, level + 1)).join('')
            : '';
          const metaHtml = permLocked
            ? `<span class="v28-tree-meta v28-tree-meta--locked" title="团队知识库录题仅管理员可触发"><i data-lucide="lock"></i>管理员触发</span>`
            : `<span class="v28-tree-meta">${selectableIdsOf(node).length} 个可解析</span>`;
          return `
            <div class="v28-tree-row v28-tree-${node.type}${isExpanded ? ' is-expanded' : ''}${allBlocked ? ' is-disabled' : ''}"
                 style="--lv:${level}" data-nid="${node.id}" data-act="toggle-expand">
              <span class="v28-tree-caret" data-act="toggle-expand-only">
                <i data-lucide="chevron-right"></i>
              </span>
              <span class="v28-tree-check ${checkCls}" data-act="toggle-folder" data-nid="${node.id}">
                ${checkInner}
              </span>
              <span class="v28-tree-icon v28-tree-icon--${node.type}">
                <i data-lucide="${isKb ? 'library' : (isExpanded ? 'folder-open' : 'folder')}"></i>
              </span>
              <span class="v28-tree-name v28-tree-name--${node.type}">${escHtml(node.name)}</span>
              ${metaHtml}
            </div>
            ${childHtml}
          `;
        }

        function renderTree(){
          listEl.innerHTML = `<div class="v28-tree">${RECORD_TREE.map(n => renderNode(n, 0)).join('')}</div>`;
          if(window.lucide) lucide.createIcons();
        }

        /* —— 搜索扁平渲染 —— */
        function renderSearch(kw){
          const matched = RECORD_FILE_POOL.filter(f => f.name.toLowerCase().includes(kw));
          if(!matched.length){
            listEl.innerHTML = `<div class="v28-src-empty"><i data-lucide="folder-search"></i><span>没有匹配"${escHtml(keyword)}"的文件</span></div>`;
            if(window.lucide) lucide.createIcons();
            return;
          }
          listEl.innerHTML = `<div class="v28-tree v28-tree--flat">` + matched.map(f => {
            const isBlocked = blockedIds.has(f.id);
            const permLocked = isTeacher && isInTeamKb(f.id);
            const committedQ = committedCounts[f.id] || 0;
            const isCommitted = committedQ > 0;
            const isChecked = selectedIds.has(f.id);
            const disabled = isBlocked || permLocked;
            const pathLabel = [f.kbLabel].concat(f.path || []).join(' / ');
            return `
              <div class="v28-tree-row v28-tree-file v28-tree-file--flat${isChecked ? ' is-checked' : ''}${disabled ? ' is-disabled' : ''}" data-fid="${f.id}">
                <span class="v28-tree-check ${isChecked ? 'is-on' : ''}" data-act="toggle-file" data-fid="${f.id}">
                  ${isChecked ? '<i data-lucide="check"></i>' : ''}
                </span>
                <span class="v28-src-icon v28-src-icon--${f.type}"><i data-lucide="file-text"></i></span>
                <div class="v28-tree-flat-main">
                  <div class="v28-tree-name" title="${escHtml(f.name)}">${escHtml(f.name)}</div>
                  <div class="v28-tree-flat-path"><i data-lucide="corner-down-right"></i><span>${escHtml(pathLabel)}</span></div>
                </div>
                <span class="v28-src-size">${escHtml(f.size)}</span>
                ${isBlocked ? '<span class="v28-src-tag">已在录题进度中</span>' : ''}
                ${!isBlocked && permLocked ? '<span class="v28-src-tag v28-src-tag--locked"><i data-lucide="lock"></i>管理员触发</span>' : ''}
                ${!isBlocked && !permLocked && isCommitted ? `<span class="v28-src-tag v28-src-tag--committed"><i data-lucide="check"></i>已入库 ${committedQ} 题</span>` : ''}
              </div>
            `;
          }).join('') + `</div>`;
          if(window.lucide) lucide.createIcons();
        }

        function render(){
          const kw = (keyword || '').trim().toLowerCase();
          if(kw) renderSearch(kw);
          else renderTree();
        }

        /* —— 交互:事件委托到列表容器 —— */
        listEl.addEventListener('click', (e) => {
          const checkEl = e.target.closest('[data-act="toggle-file"], [data-act="toggle-folder"]');
          const caretEl = e.target.closest('[data-act="toggle-expand-only"]');
          const rowEl   = e.target.closest('[data-act="toggle-expand"]');

          /* 1. 单文件勾选 */
          if(checkEl && checkEl.dataset.act === 'toggle-file'){
            e.stopPropagation();
            const fid = checkEl.dataset.fid;
            const row = checkEl.closest('.v28-tree-row');
            if(row && row.classList.contains('is-disabled')) return;
            if(selectedIds.has(fid)) selectedIds.delete(fid); else selectedIds.add(fid);
            render(); refreshSummary();
            return;
          }
          /* 2. 文件夹/KB 全选/取消 */
          if(checkEl && checkEl.dataset.act === 'toggle-folder'){
            e.stopPropagation();
            const nid = checkEl.dataset.nid;
            const node = findNode(RECORD_TREE, nid);
            if(!node) return;
            const ids = selectableIdsOf(node);
            if(!ids.length) return;
            const tri = tristate(node);
            if(tri === 'all'){ ids.forEach(i => selectedIds.delete(i)); }
            else { ids.forEach(i => selectedIds.add(i)); }
            render(); refreshSummary();
            return;
          }
          /* 3. caret 单独点 → toggle 展开(避免冒泡到行 click) */
          if(caretEl){
            e.stopPropagation();
            const row = caretEl.closest('[data-nid]');
            if(row) toggleExpand(row.dataset.nid);
            return;
          }
          /* 4. 点行（KB/folder 整行）→ toggle 展开 */
          if(rowEl && rowEl.dataset.nid){
            toggleExpand(rowEl.dataset.nid);
          }
        });

        function toggleExpand(nid){
          if(expandedIds.has(nid)) expandedIds.delete(nid);
          else expandedIds.add(nid);
          renderTree();
        }

        if(searchInp){
          searchInp.addEventListener('input', () => { keyword = searchInp.value; render(); });
        }
        if(submitBtn){
          submitBtn.addEventListener('click', () => {
            if(selectedIds.size === 0) return;
            const files = RECORD_FILE_POOL.filter(f => selectedIds.has(f.id));

            /* Q2 已入库二次确认:选中里有已入库文件,弹 confirm 提示重复风险 */
            const recommitFiles = files.filter(f => committedCounts[f.id] > 0);
            if(recommitFiles.length){
              const list = recommitFiles
                .map(f => `· ${f.name}（已入库 ${committedCounts[f.id]} 题）`)
                .join('\n');
              const ok = window.confirm(
                `以下 ${recommitFiles.length} 个文件已经入库过：\n\n${list}\n\n再次录题会与已有题目合并，可能产生重复题。是否确认继续？`
              );
              if(!ok) return;
            }

            const jobs = createBatch(files);
            V28Modal.close(id);
            if(typeof opts.onSubmit === 'function') opts.onSubmit(jobs);
          });
        }

        render();
        refreshSummary();
      }
    });
  }

  /* 树中按 id 查节点（KB/folder/file 都能找） */
  function findNode(tree, id){
    for(let i = 0; i < tree.length; i++){
      const n = tree[i];
      if(n.id === id) return n;
      if(n.children){
        const r = findNode(n.children, id);
        if(r) return r;
      }
    }
    return null;
  }

  global.V28RecordDialog = { open: openRecordDialog };


  /* ════════════════════════════════════════════════════════════
   *  录题进度 · 视图层
   *  v28-r1（2026-05-22）已废弃 panel 浮层方案,改为独立页 09-ai-record-jobs.html
   *  此处仅保留 syncTriggerBadge（05 顶栏 badge 同步）
   *  详见 AGENT-HANDOFF §55
   * ════════════════════════════════════════════════════════════ */

  function syncTriggerBadge(){
    const badge = document.getElementById('qbk-jobs-badge');
    const btn = document.getElementById('qbk-jobs-btn');
    const r = pendingCount();
    const p = parsingCount();
    if(badge){
      if(r > 0){ badge.hidden = false; badge.textContent = String(r); }
      else { badge.hidden = true; }
    }
    if(btn){
      btn.setAttribute('data-has-pending', r > 0 ? 'true' : 'false');
      btn.setAttribute('data-has-parsing', p > 0 ? 'true' : 'false');
    }
  }

  /* badge 跟随状态变化自动同步 */
  subscribeJobs(syncTriggerBadge);

  /* 启动恢复 · 跨页持久化 parsing 任务继续推进 */
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', () => { restorePending(); syncTriggerBadge(); });
  } else {
    restorePending();
    syncTriggerBadge();
  }

  global.V28RecordJobs = {
    createBatch,
    list: listJobs,
    get: getJob,
    pendingCount,
    parsingCount,
    markCommitted,
    clearAll: clearAllJobs,
    syncTriggerBadge,
    subscribe: subscribeJobs,
    _pool: () => RECORD_FILE_POOL.slice()
  };

})(typeof window !== 'undefined' ? window : this);
