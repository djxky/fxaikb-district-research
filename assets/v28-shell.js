/* ========================================================
   飞象 AI · v28 — 公共壳渲染
   目标：让 Sidebar / Topbar / Search / AccountMenu 只维护一份。
   页面仍保留静态主内容，便于 demo 快速迭代。
   ======================================================== */

(function(){

  /* ────── 通知中心 · 轻面板（教研组共建 AI 沉淀回执） ────── */
  const NOTIFY_STYLE = `
    .notify-popover{
      position:fixed; top:54px; right:12px;
      width:min(360px, calc(100vw - 24px));
      max-height:min(440px, calc(100vh - 80px));
      background:var(--surface);
      border:1px solid var(--border);
      border-radius:14px;
      box-shadow:0 18px 48px -12px rgba(30,24,14,.22);
      z-index:118;
      display:flex; flex-direction:column;
      opacity:0; transform:translateY(-6px) scale(.98);
      pointer-events:none;
      transition:opacity .18s var(--ease, cubic-bezier(.4,0,.2,1)),
                 transform .18s var(--ease, cubic-bezier(.4,0,.2,1));
    }
    body[data-notify="open"] .notify-popover{
      opacity:1; transform:translateY(0) scale(1); pointer-events:auto;
    }
    .notify-popover::before{
      content:''; position:absolute; top:-7px; right:18px;
      width:12px; height:12px; transform:rotate(45deg);
      background:var(--surface);
      border-top:1px solid var(--border);
      border-left:1px solid var(--border);
    }
    .notify-head{
      padding:14px 16px 8px;
      display:flex; align-items:center; gap:8px;
      flex-shrink:0;
    }
    .notify-title{ font-size:13.5px; font-weight:700; color:var(--text); }
    .notify-count{
      font-size:11.5px; color:var(--gold-deep);
      background:var(--gold-bg); padding:2px 8px; border-radius:999px;
      font-weight:600;
    }
    .notify-clear{
      margin-left:auto; font-size:11.5px; color:var(--text-3);
      background:transparent; border:none; cursor:pointer;
      transition:color .15s;
    }
    .notify-clear:hover{ color:var(--gold-deep); }
    .notify-body{
      padding:0 8px 12px; overflow:auto; min-height:0;
    }
    .notify-item{
      display:flex; gap:10px; padding:10px 8px;
      border-radius:8px;
      cursor:pointer;
      transition:background .15s;
    }
    .notify-item:hover{ background:var(--surface-2); }
    .notify-item-icon{
      width:28px; height:28px; flex-shrink:0;
      border-radius:8px;
      display:grid; place-items:center;
      background:var(--gold-bg);
      color:var(--gold-deep);
    }
    .notify-item-icon [data-lucide]{ width:14px; height:14px; }
    .notify-item-body{ flex:1; min-width:0; }
    .notify-item-text{
      font-size:12.5px; line-height:1.55;
      color:var(--text-1);
    }
    .notify-item-text b{ color:var(--text); font-weight:600; }
    .notify-item-meta{
      margin-top:4px; font-size:11px; color:var(--text-4);
      display:flex; align-items:center; gap:6px;
    }
    /* 未读小金点 · 列表项最左侧 */
    .notify-item{ position:relative; padding-left:20px; }
    .notify-item-unread-dot{
      position:absolute; left:6px; top:18px;
      width:6px; height:6px; border-radius:50%;
      background:var(--gold);
      transition:opacity .15s;
    }
    .notify-item:not(.is-unread) .notify-item-unread-dot{ opacity:0; }
    /* 已读态 · 整条灰一档，icon 也变灰 */
    .notify-item:not(.is-unread) .notify-item-text{ color:var(--text-3); }
    .notify-item:not(.is-unread) .notify-item-text b{ color:var(--text-2); font-weight:500; }
    .notify-item:not(.is-unread) .notify-item-icon{
      background:var(--surface-3); color:var(--text-4);
    }
    /* 全部已读时 · 顶部加一条置顶提示 */
    .notify-allread-bar{
      display:flex; align-items:center; justify-content:center; gap:6px;
      padding:8px 12px; margin:0 8px 6px;
      border-radius:8px;
      background:rgba(46,160,67,.08);
      font-size:11.5px; color:#2EA043; font-weight:600;
    }
    .notify-allread-bar [data-lucide]{ width:13px; height:13px; }
    /* 全部已读按钮 · 禁用态 */
    .notify-clear:disabled{
      color:var(--text-4); cursor:not-allowed;
    }
    .notify-clear:disabled:hover{ color:var(--text-4); }

    .tb-btn[aria-expanded="true"]{
      background:var(--gold-bg);
      color:var(--gold-deep);
    }
    .tb-btn .notify-dot{
      position:absolute; top:7px; right:7px;
      width:7px; height:7px; border-radius:50%;
      background:var(--gold);
      border:1.5px solid var(--surface);
      transition:opacity .15s, transform .15s;
    }
    .tb-btn .notify-dot.is-hidden{
      opacity:0; transform:scale(.6);
    }
    .tb-btn{ position:relative; }
  `;

  /* 通知数据池 · 演示态 mock；研发对接时改为后端拉取
   * unread 字段控制未读视觉态 + 顶栏小红点
   * href 字段控制点击跳转目标（同 url 多条会聚合到同一页，可加 anchor 区分）
   */
  let NOTIFY_ITEMS = [
    {
      id: 'n1',
      icon: 'file-plus-2',
      iconStyle: null,
      text: '王老师上传 <b>《二次函数易错题 35 道》</b> → AI 已并入「二次函数图像与性质」',
      time: '09:30 · 自动整理',
      href: 'wiki-entry.html',
      unread: true
    },
    {
      id: 'n2',
      icon: 'sparkles',
      iconStyle: null,
      text: '李老师上传 <b>《圆与三角形综合》</b> → AI 已新建「函数综合」Wiki 页',
      time: '11:45 · 自动整理',
      href: 'wiki-entry.html',
      unread: true
    },
    {
      id: 'n3',
      icon: 'refresh-cw',
      iconStyle: 'background:rgba(168,126,44,.08)',
      text: '刘老师反馈 <b>"这段整理错了"</b> → AI 已重新整理「圆与三角形综合 §4」',
      time: '14:20 · 老师反馈',
      href: 'wiki-entry.html',
      unread: true
    }
  ];

  function ensureNotifyMounted(){
    if(document.getElementById('v28-notify-style')) return;
    const style = document.createElement('style');
    style.id = 'v28-notify-style';
    style.textContent = NOTIFY_STYLE;
    document.head.appendChild(style);

    const popover = document.createElement('aside');
    popover.className = 'notify-popover';
    popover.id = 'v28-notify-popover';
    popover.setAttribute('aria-hidden', 'true');
    popover.innerHTML = `
      <div class="notify-head">
        <span class="notify-title">今日教研组沉淀</span>
        <span class="notify-count" id="v28-notify-count">0 条</span>
        <button class="notify-clear" id="v28-notify-clear" onclick="markAllNotifyRead()">全部已读</button>
      </div>
      <div class="notify-body" id="v28-notify-body"></div>
    `;
    document.body.appendChild(popover);

    renderNotifyList();
    updateNotifyTriggers();

    document.addEventListener('click', (event) => {
      if(document.body.dataset.notify !== 'open') return;
      if(event.target.closest('#v28-notify-popover')) return;
      if(event.target.closest('.tb-btn[data-notify-toggle]')) return;
      closeNotifyPanel();
    });

    document.addEventListener('keydown', (event) => {
      if(event.key === 'Escape' && document.body.dataset.notify === 'open'){
        closeNotifyPanel();
      }
    });
  }

  /* 渲染通知列表 · 基于 NOTIFY_ITEMS unread 状态出未读金点 / 已读灰色态
   * 全部已读时顶部插一条绿色「✓ 今日通知已全部读完」提示
   */
  function renderNotifyList(){
    const body = document.getElementById('v28-notify-body');
    const count = document.getElementById('v28-notify-count');
    const clearBtn = document.getElementById('v28-notify-clear');
    if(!body) return;

    const unreadCount = NOTIFY_ITEMS.filter(it => it.unread).length;
    const total = NOTIFY_ITEMS.length;

    /* 头部计数：有未读显未读数（金）；全读时显已读完 */
    if(count){
      if(unreadCount > 0){
        count.textContent = `${unreadCount} 条未读`;
        count.style.background = '';
        count.style.color = '';
      } else {
        count.textContent = `${total} 条 · 已读完`;
        count.style.background = 'var(--surface-3)';
        count.style.color = 'var(--text-3)';
      }
    }
    /* 全部已读按钮 disabled 联动 */
    if(clearBtn){
      clearBtn.disabled = unreadCount === 0;
    }

    /* 渲染列表 */
    const allRead = unreadCount === 0 && total > 0;
    const bar = allRead ? `
      <div class="notify-allread-bar">
        <i data-lucide="check-circle-2"></i>
        <span>今日通知已全部读完 · 共 ${total} 条</span>
      </div>
    ` : '';

    body.innerHTML = bar + NOTIFY_ITEMS.map(it => `
      <button class="notify-item${it.unread ? ' is-unread' : ''}"
              data-notify-id="${it.id}"
              onclick="onNotifyItemClick('${it.id}')">
        <span class="notify-item-unread-dot" aria-hidden="true"></span>
        <div class="notify-item-icon"${it.iconStyle ? ` style="${it.iconStyle}"` : ''}>
          <i data-lucide="${it.icon}"></i>
        </div>
        <div class="notify-item-body">
          <div class="notify-item-text">${it.text}</div>
          <div class="notify-item-meta">
            <i data-lucide="clock-3" style="width:11px;height:11px"></i>
            <span>${it.time}</span>
          </div>
        </div>
      </button>
    `).join('');

    if(window.lucide) lucide.createIcons();
  }

  /* 同步所有顶栏通知按钮的小红点 + title */
  function updateNotifyTriggers(){
    const unreadCount = NOTIFY_ITEMS.filter(it => it.unread).length;
    document.querySelectorAll('.tb-btn[data-notify-toggle]').forEach(btn => {
      btn.setAttribute('title', unreadCount > 0 ? `通知 · ${unreadCount} 条未读` : '通知 · 已读完');
      const dot = btn.querySelector('.notify-dot');
      if(dot) dot.classList.toggle('is-hidden', unreadCount === 0);
    });
  }

  /* 单条点击 · 标已读 + 真跳转
   * mock 阶段所有通知都跳 03-wiki-entry，研发对接时按业务字段动态决定 href
   */
  function onNotifyItemClick(id){
    const item = NOTIFY_ITEMS.find(x => x.id === id);
    if(!item) return;
    if(item.unread){
      item.unread = false;
      saveNotifyState();
      renderNotifyList();
      updateNotifyTriggers();
    }
    closeNotifyPanel();
    if(item.href){
      setTimeout(() => { window.location.href = item.href; }, 120);
    }
  }

  /* 全部已读 · 把所有 unread 置 false 后重渲 */
  function markAllNotifyRead(){
    let changed = false;
    NOTIFY_ITEMS.forEach(it => { if(it.unread){ it.unread = false; changed = true; } });
    if(!changed) return;
    saveNotifyState();
    renderNotifyList();
    updateNotifyTriggers();
    if(typeof window.showToast === 'function') window.showToast('已全部标为已读');
  }

  /* 持久化已读状态到 localStorage · 跨页面保留
   * 避免老师"全部已读"后切页面又看到红点的假体验
   * key 简单存已读 id 数组；新通知 mock 增加时不影响（默认 unread）
   */
  const NOTIFY_LS_KEY = 'v28-notify-read-ids';

  function loadNotifyState(){
    try{
      const raw = localStorage.getItem(NOTIFY_LS_KEY);
      if(!raw) return;
      const readIds = JSON.parse(raw);
      if(!Array.isArray(readIds)) return;
      NOTIFY_ITEMS.forEach(it => {
        if(readIds.includes(it.id)) it.unread = false;
      });
    }catch(e){ /* localStorage 不可用就静默放过 */ }
  }

  function saveNotifyState(){
    try{
      const readIds = NOTIFY_ITEMS.filter(it => !it.unread).map(it => it.id);
      localStorage.setItem(NOTIFY_LS_KEY, JSON.stringify(readIds));
    }catch(e){}
  }

  /* IIFE 加载即恢复状态；DOMContentLoaded 时同步顶栏 dot
   * 这样老师切页面回来红点状态准确，不会"全部已读后又出现"
   */
  loadNotifyState();
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', updateNotifyTriggers);
  } else {
    setTimeout(updateNotifyTriggers, 0);
  }

  window.onNotifyItemClick = onNotifyItemClick;
  window.markAllNotifyRead = markAllNotifyRead;

  function toggleNotifyPanel(event){
    if(event){ event.stopPropagation(); }
    ensureNotifyMounted();
    if(document.body.dataset.notify === 'open'){
      closeNotifyPanel();
    } else {
      openNotifyPanel();
    }
  }

  function openNotifyPanel(){
    document.body.dataset.notify = 'open';
    const popover = document.getElementById('v28-notify-popover');
    if(popover) popover.setAttribute('aria-hidden', 'false');
    document.querySelectorAll('.tb-btn[data-notify-toggle]').forEach(btn => btn.setAttribute('aria-expanded', 'true'));
  }

  function closeNotifyPanel(){
    delete document.body.dataset.notify;
    const popover = document.getElementById('v28-notify-popover');
    if(popover) popover.setAttribute('aria-hidden', 'true');
    document.querySelectorAll('.tb-btn[data-notify-toggle]').forEach(btn => btn.setAttribute('aria-expanded', 'false'));
  }

  window.toggleNotifyPanel = toggleNotifyPanel;
  window.closeNotifyPanel = closeNotifyPanel;

  const KB_ITEMS_DEFAULT = [
    { id:'personal', name:'我的知识库', switchName:'张老师 · 个人', count:'87', icon:'bookmark', tip:'我的知识库 · 87 份', scope:'personal' },
    { type:'group', label:'团队知识库', className:'sb-group-label-muted' },
    { id:'math-group', name:'初中数学教研组', count:'925', icon:'users-round', tip:'初中数学教研组 · 925 份', scope:'team' },
    { id:'school', name:'北京 101 中学', switchName:'北京 101 中学 · 公共库', count:'1,247', icon:'school', scope:'team' },
    { id:'grade-2', name:'初二数学备课组', count:'412', icon:'book-marked', scope:'team' },
    { id:'grade-3', name:'初三数学备课组', count:'531', icon:'book-marked', scope:'team' },
    { type:'create-kb', label:'+ 新建知识库' },
    { type:'divider', className:'sb-nav-divider' },
    { id:'ai-qbank', name:'AI 题库', icon:'file-stack', className:'sb-ai-qbank', tip:'AI 题库', onclick:"navTo('qbank')" },
  ];
  const KB_ITEMS_STORAGE_KEY = 'v28_kb_items_state';
  let KB_ITEMS = loadKbItems();
  let TEAM_KB_IDS = new Set();
  syncTeamKbIds();
  const TEAM_MEMBERS = ['张老师', '王老师', '李老师', '刘老师', '陈老师', '赵老师', '周老师', '吴老师'];
  // demo 约定：当前账号即知识库创建者（学校内任意老师；可见性的"创建者锁定行"始终是这位）
  const KB_CREATOR = '张老师';
  /* 当前账号在每个 KB 里的角色。demo 阶段写死：
     - personal 永远 admin
     - 张老师作为创建者，math-group 也是 admin（默认演示完整能力）
     - 其它团队 KB 是 member（演示"非管理员"的视图） */
  const KB_ROLE_MAP = {
    'personal': 'admin',
    'math-group': 'admin',
    'school': 'member',
    'grade-2': 'member',
    'grade-3': 'member',
  };
  function getKbRole(kbId){
    return KB_ROLE_MAP[kbId] || 'member';
  }
  function isKbAdmin(kbId){
    return getKbRole(kbId) === 'admin';
  }
  window.getKbRole = getKbRole;
  window.isKbAdmin = isKbAdmin;

  /* ────── 对话上下文：跨页面共用的"AI 基于哪些 KB 回答" ────── */
  const CHAT_SCOPE_STORAGE_KEY = 'v28_chat_scope_kbs';
  function getAllKbIds(){
    return KB_ITEMS.filter(i => i.scope === 'personal' || i.scope === 'team').map(i => i.id);
  }
  function getDefaultChatScopeIds(){
    const school = KB_ITEMS.find(i => i.id === 'school');
    if(school) return ['school'];
    const team = KB_ITEMS.find(i => i.scope === 'team');
    if(team) return [team.id];
    const personal = KB_ITEMS.find(i => i.scope === 'personal');
    return personal ? [personal.id] : [];
  }
  function loadChatScopeIds(){
    try {
      const raw = sessionStorage.getItem(CHAT_SCOPE_STORAGE_KEY);
      if(raw){
        const parsed = JSON.parse(raw);
        if(Array.isArray(parsed) && parsed.length){
          /* 过滤掉已经不存在的 KB */
          const valid = parsed.filter(id => KB_ITEMS.some(i => i.id === id));
          if(valid.length) return valid;
        }
      }
    } catch(_){}
    return getDefaultChatScopeIds();
  }
  function saveChatScopeIds(ids){
    try {
      sessionStorage.setItem(CHAT_SCOPE_STORAGE_KEY, JSON.stringify(ids));
    } catch(_){}
  }
  let CHAT_SCOPE_IDS = loadChatScopeIds();

  function getChatScopeIds(){
    if(!CHAT_SCOPE_IDS || !CHAT_SCOPE_IDS.length) CHAT_SCOPE_IDS = getDefaultChatScopeIds();
    return CHAT_SCOPE_IDS.slice();
  }
  function setChatScopeIds(ids){
    if(!Array.isArray(ids) || !ids.length) return;
    CHAT_SCOPE_IDS = ids.slice();
    saveChatScopeIds(CHAT_SCOPE_IDS);
    syncChatScopeLabels();
  }
  function getChatScopeLabel(){
    const ids = getChatScopeIds();
    if(ids.length === 1){
      const item = KB_ITEMS.find(i => i.id === ids[0]);
      return item ? item.name : ids[0];
    }
    return `${ids.length} 个知识库`;
  }

  /* 同步两处显示：chat-empty（ce-kb-name / ce-kb-label）+ bottom-bar（ctx-name） */
  function syncChatScopeLabels(){
    const label = getChatScopeLabel();
    const ceName = document.getElementById('ce-kb-name');
    const ceLabel = document.getElementById('ce-kb-label');
    if(ceName) ceName.textContent = label;
    if(ceLabel) ceLabel.textContent = label;
    document.querySelectorAll('.bb-ctx .ctx-name').forEach(el => {
      if(el.closest('.bottom-bar[data-mode="knowledge-qa"]')) return;
      el.textContent = label;
    });
  }
  window.getChatScopeIds = getChatScopeIds;
  window.setChatScopeIds = setChatScopeIds;
  window.getChatScopeLabel = getChatScopeLabel;
  window.syncChatScopeLabels = syncChatScopeLabels;

  /* ────── KB 多选下拉（chat-empty / bottom-bar 共用） ────── */
  const KB_PICKER_STYLE = `
    .kbsel-pop{
      position:fixed; min-width:240px;
      background:var(--surface);
      border:1px solid var(--border); border-radius:12px;
      box-shadow:0 22px 56px -22px rgba(30,24,14,.32);
      padding:6px;
      z-index:160;
      display:none;
      max-height:min(380px, calc(100vh - 80px));
      overflow:auto;
    }
    .kbsel-pop.open{ display:block; }
    .kbsel-head{
      padding:8px 10px 6px;
      font-size:11.5px; color:var(--text-3);
      letter-spacing:.02em;
    }
    .kbsel-item{
      width:100%;
      display:flex; align-items:center; gap:9px;
      padding:8px 10px; border-radius:8px;
      border:none; background:transparent; cursor:pointer;
      font-family:inherit; font-size:13px; color:var(--text-1); text-align:left;
    }
    .kbsel-item:hover{ background:var(--surface-3); }
    .kbsel-check{
      width:16px; height:16px; flex-shrink:0;
      border:1.5px solid var(--border-2);
      border-radius:4px;
      display:grid; place-items:center;
      transition:all .12s var(--ease);
    }
    .kbsel-item.checked .kbsel-check{
      background:var(--gold);
      border-color:var(--gold);
    }
    .kbsel-check [data-lucide]{
      width:11px; height:11px; color:#fff;
      opacity:0;
    }
    .kbsel-item.checked .kbsel-check [data-lucide]{ opacity:1; }
    .kbsel-icon{ width:14px; height:14px; color:var(--text-3); flex-shrink:0; }
    .kbsel-item.checked .kbsel-icon{ color:var(--gold-deep); }
    .kbsel-name{ flex:1; min-width:0; }
    .kbsel-divider{ height:1px; margin:4px 6px; background:var(--border); }
    .kbsel-foot{
      padding:8px 10px 4px;
      font-size:11.5px; color:var(--text-4);
      text-align:right;
    }
  `;

  function ensureKbPickerMounted(){
    if(document.getElementById('kbsel-pop')) return;
    const style = document.createElement('style');
    style.id = 'kbsel-style';
    style.textContent = KB_PICKER_STYLE;
    document.head.appendChild(style);

    const pop = document.createElement('div');
    pop.className = 'kbsel-pop';
    pop.id = 'kbsel-pop';
    document.body.appendChild(pop);

    document.addEventListener('click', (event) => {
      if(event.target.closest('#kbsel-pop')) return;
      if(event.target.closest('[data-kb-picker-trigger]')) return;
      closeKbPicker();
    });
    document.addEventListener('keydown', (event) => {
      if(event.key === 'Escape') closeKbPicker();
    });
  }

  function renderKbPickerInner(){
    const pop = document.getElementById('kbsel-pop');
    if(!pop) return;
    const selected = new Set(getChatScopeIds());
    const personal = KB_ITEMS.find(i => i.scope === 'personal');
    const teams = KB_ITEMS.filter(i => i.scope === 'team');
    const renderItem = (item) => {
      const checked = selected.has(item.id) ? ' checked' : '';
      return `
        <button class="kbsel-item${checked}" data-kb-id="${item.id}" onclick="toggleChatScopeKb(event,'${item.id}')">
          <span class="kbsel-check"><i data-lucide="check"></i></span>
          <i data-lucide="${item.icon || 'book-marked'}" class="kbsel-icon"></i>
          <span class="kbsel-name">${item.name}</span>
        </button>
      `;
    };
    pop.innerHTML = `
      <div class="kbsel-head">飞象基于这些知识库回答</div>
      ${personal ? renderItem(personal) : ''}
      ${teams.length ? '<div class="kbsel-divider"></div>' : ''}
      ${teams.map(renderItem).join('')}
      <div class="kbsel-foot">至少保留 1 个</div>
    `;
    if(window.lucide) lucide.createIcons();
  }

  function openKbPicker(triggerEl){
    ensureKbPickerMounted();
    renderKbPickerInner();
    const pop = document.getElementById('kbsel-pop');
    if(!pop || !triggerEl) return;
    const r = triggerEl.getBoundingClientRect();
    /* 默认在触发元素下方对齐左边；空间不够则改上方 */
    pop.classList.add('open');
    const w = pop.offsetWidth || 260;
    const h = pop.offsetHeight || 280;
    let left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left));
    let top = r.bottom + 6;
    if(top + h > window.innerHeight - 8){
      top = Math.max(8, r.top - h - 6);
    }
    pop.style.left = `${left}px`;
    pop.style.top = `${top}px`;
  }
  function closeKbPicker(){
    const pop = document.getElementById('kbsel-pop');
    if(pop) pop.classList.remove('open');
  }
  window.openKbPicker = openKbPicker;
  window.closeKbPicker = closeKbPicker;

  function toggleChatScopeKb(event, kbId){
    if(event){ event.preventDefault(); event.stopPropagation(); }
    const ids = new Set(getChatScopeIds());
    if(ids.has(kbId)){
      if(ids.size <= 1){
        if(typeof showToast === 'function') showToast('至少保留 1 个知识库');
        return;
      }
      ids.delete(kbId);
    } else {
      ids.add(kbId);
    }
    setChatScopeIds(Array.from(ids));
    renderKbPickerInner();
  }
  window.toggleChatScopeKb = toggleChatScopeKb;
  const KB_VISIBILITY_STORAGE_KEY = 'v28_kb_visibility_state';
  const KB_ADMIN_STYLE = `
    .sb-kb-row{
      display:flex; align-items:center; gap:4px;
      position:relative;
    }
    .sb-kb-row .sb-kb{ width:auto; flex:1; }
    .sb-kb-more{
      width:22px; height:22px; border-radius:6px;
      color:var(--text-4); cursor:pointer; flex-shrink:0;
      display:grid; place-items:center;
      opacity:0.3; transition:opacity .15s, background .15s, color .15s;
    }
    .sb-kb-more [data-lucide]{ width:13px; height:13px; }
    .sb-kb-row:hover .sb-kb-more,
    .sb-kb-row.active .sb-kb-more{ opacity:1; }
    .sb-kb-more:hover{ background:var(--surface-3); color:var(--text-2); }
    .app[data-left="collapsed"] .sb-kb-more{ display:none; }
    .sb-kb-create{
      width:100%;
      margin-top:4px;
      border:1px dashed var(--border-2);
      border-radius:8px;
      height:30px;
      font-size:12.5px;
      color:var(--text-3);
      display:flex; align-items:center; justify-content:center; gap:6px;
      transition:all .15s;
    }
    .sb-kb-create [data-lucide]{ width:13px; height:13px; }
    .sb-kb-create:hover{
      color:var(--gold-deep);
      border-color:var(--gold-light);
      background:var(--gold-bg);
    }
    .app[data-left="collapsed"] .sb-kb-create{ display:none; }
    .kb-admin-menu{
      position:fixed; width:176px; background:var(--surface);
      border:1px solid var(--border); border-radius:10px;
      box-shadow:0 18px 44px -18px rgba(30,24,14,.28);
      padding:6px; z-index:130; display:none;
    }
    .kb-admin-menu.open{ display:block; }
    .kb-admin-item{
      width:100%; border-radius:7px; padding:7px 8px;
      display:flex; align-items:center; gap:8px; cursor:pointer;
      font-size:12.5px; color:var(--text-2); text-align:left;
    }
    .kb-admin-item [data-lucide]{ width:13px; height:13px; color:var(--text-3); }
    .kb-admin-item:hover{ background:var(--surface-3); color:var(--text); }
    .kb-admin-item:hover [data-lucide]{ color:var(--gold); }
    .kb-admin-item.danger{ color:#A4372F; }
    .kb-admin-item.danger [data-lucide]{ color:#A4372F; }
    .kb-admin-divider{ height:1px; margin:5px 4px; background:var(--border); }
    .kbv-pop{
      position:fixed; width:min(360px, calc(100vw - 24px)); background:var(--surface);
      border:1px solid var(--border); border-radius:12px;
      box-shadow:0 20px 54px -22px rgba(30,24,14,.32);
      z-index:131; padding:12px; display:none;
    }
    .kbv-pop.open{ display:block; }
    .kbv-title{ font-size:13px; font-weight:700; color:var(--text); }
    .kbv-sub{ margin-top:2px; font-size:11.5px; color:var(--text-3); }
    .kbv-radio-row{ margin-top:10px; display:grid; grid-template-columns:1fr 1fr; gap:8px; }
    .kbv-radio{
      border:1px solid var(--border); border-radius:9px; padding:8px;
      display:flex; align-items:center; gap:7px; cursor:pointer;
    }
    .kbv-radio:has(input:checked){ border-color:var(--gold-light); background:var(--gold-bg); }
    .kbv-radio input{ accent-color:var(--gold); }
    .kbv-radio span{ font-size:12px; color:var(--text-2); }
    /* 成员选择器：搜索 + 下拉候选 + 已选列表，参考 Figma / Google Docs 模式，适配 5-50 人范围 */
    .kbv-picker{
      margin-top:9px;
      display:flex; flex-direction:column; gap:8px;
    }
    .kbv-picker.disabled{ opacity:.45; pointer-events:none; }
    .kbv-search-row{
      position:relative;
      display:flex; align-items:center;
      border:1px solid var(--border); border-radius:9px;
      background:var(--surface);
      padding:0 10px;
      height:32px;
    }
    .kbv-search-row:focus-within{
      border-color:var(--gold-light);
      box-shadow:0 0 0 3px var(--gold-bg);
    }
    .kbv-search-icon{ width:13px; height:13px; color:var(--text-3); flex-shrink:0; }
    .kbv-search-input{
      flex:1; border:none; outline:none; background:transparent;
      font-size:12.5px; color:var(--text); padding:0 8px; min-width:0;
    }
    .kbv-search-input::placeholder{ color:var(--text-4); }
    .kbv-dropdown{
      display:none;
      background:var(--surface);
      border:1px solid var(--border); border-radius:9px;
      max-height:148px; overflow:auto;
      padding:4px;
    }
    .kbv-dropdown.open{ display:block; }
    .kbv-candidate{
      width:100%; display:flex; align-items:center; gap:8px;
      padding:5px 7px; border-radius:6px; border:none;
      background:transparent; cursor:pointer; text-align:left;
    }
    .kbv-candidate:hover{ background:var(--gold-bg); }
    .kbv-candidate-name{ flex:1; font-size:12.5px; color:var(--text-2); }
    .kbv-candidate-add{ width:13px; height:13px; color:var(--gold); flex-shrink:0; }
    .kbv-dropdown-empty{
      padding:10px; text-align:center; font-size:11.5px; color:var(--text-4);
    }
    .kbv-selected{
      border:1px solid var(--border); border-radius:9px;
      background:var(--surface);
      max-height:152px; overflow:auto;
    }
    .kbv-selected:empty{ display:none; }
    .kbv-row{
      display:flex; align-items:center; gap:8px;
      padding:6px 8px;
      border-bottom:1px solid var(--border);
    }
    .kbv-row:last-child{ border-bottom:none; }
    .kbv-row.creator{ background:linear-gradient(90deg, var(--gold-bg) 0%, var(--surface) 100%); }
    .kbv-avatar{
      width:22px; height:22px; border-radius:50%;
      display:grid; place-items:center;
      background:var(--gold-bg); color:var(--gold-deep);
      font-size:11px; font-weight:600; flex-shrink:0;
    }
    .kbv-row.creator .kbv-avatar{
      background:var(--gold); color:#fff;
    }
    .kbv-row-name{ flex:1; font-size:12.5px; color:var(--text); }
    .kbv-row-tag{
      font-size:10.5px; color:var(--gold-deep);
      background:var(--gold-bg); border-radius:4px;
      padding:1px 5px; font-weight:600;
    }
    .kbv-row-lock{
      width:13px; height:13px; color:var(--text-4);
    }
    .kbv-row-remove{
      width:22px; height:22px; border-radius:5px;
      display:grid; place-items:center;
      background:transparent; border:none; cursor:pointer;
      color:var(--text-4);
    }
    .kbv-row-remove:hover{ background:#FFE9E1; color:#A4372F; }
    .kbv-row-remove [data-lucide]{ width:13px; height:13px; }
    .kbv-foot{
      margin-top:10px; display:flex; justify-content:flex-end; gap:8px;
    }
    .kbv-btn{
      height:30px; padding:0 11px; border-radius:8px;
      border:1px solid var(--border); font-size:12px; color:var(--text-2);
      background:var(--surface); cursor:pointer;
    }
    .kbv-btn.primary{
      border-color:var(--gold-light); color:var(--gold-deep); background:var(--gold-bg); font-weight:600;
    }
    .kbe-pop{
      position:fixed; width:min(390px, calc(100vw - 24px)); background:var(--surface);
      border:1px solid var(--border); border-radius:12px;
      box-shadow:0 20px 54px -22px rgba(30,24,14,.32);
      z-index:132; padding:12px; display:none;
    }
    .kbe-pop.open{ display:block; }
    .kbe-title{ font-size:13.5px; font-weight:700; color:var(--text); }
    .kbe-sub{ margin-top:2px; font-size:11.5px; color:var(--text-3); }
    .kbe-field{ margin-top:10px; display:flex; flex-direction:column; gap:6px; }
    .kbe-label{ font-size:12px; color:var(--text-2); font-weight:600; }
    .kbe-input{
      height:34px; border:1px solid var(--border); border-radius:8px;
      padding:0 10px; font-size:12.5px; color:var(--text);
      background:var(--surface);
    }
    .kbe-input:focus{ outline:none; border-color:var(--gold-light); box-shadow:0 0 0 3px var(--gold-bg); }
  `;
  let kbVisibilityCurrentId = 'math-group';
  let kbVisibilityState = loadKbVisibilityState();
  let kbVisibilityDraft = null;
  let kbEditorMode = null;
  let kbEditorTargetId = null;

  function buildKbItemsFromTeamList(teamItems){
    const personal = KB_ITEMS_DEFAULT.find(item => item.scope === 'personal');
    const groupLabel = KB_ITEMS_DEFAULT.find(item => item.type === 'group');
    const createBtn = KB_ITEMS_DEFAULT.find(item => item.type === 'create-kb');
    const divider = KB_ITEMS_DEFAULT.find(item => item.type === 'divider');
    const qbank = KB_ITEMS_DEFAULT.find(item => item.id === 'ai-qbank');
    return [
      { ...personal },
      { ...groupLabel },
      ...teamItems.map(item => ({ ...item, scope: 'team' })),
      { ...createBtn },
      { ...divider },
      { ...qbank },
    ];
  }

  function normalizeTeamKbItem(item){
    if(!item || typeof item !== 'object') return null;
    if(!item.id || !item.name) return null;
    return {
      id: String(item.id),
      name: String(item.name),
      count: item.count ?? '0',
      icon: item.icon || 'book-marked',
      tip: item.tip || '',
      scope: 'team',
    };
  }

  function loadKbItems(){
    const defaultTeamItems = KB_ITEMS_DEFAULT.filter(item => item.scope === 'team');
    try{
      const raw = localStorage.getItem(KB_ITEMS_STORAGE_KEY);
      if(!raw) return buildKbItemsFromTeamList(defaultTeamItems);
      const parsed = JSON.parse(raw);
      if(!Array.isArray(parsed)) return buildKbItemsFromTeamList(defaultTeamItems);
      const teamItems = parsed.map(normalizeTeamKbItem).filter(Boolean);
      if(!teamItems.length) return buildKbItemsFromTeamList(defaultTeamItems);
      return buildKbItemsFromTeamList(teamItems);
    }catch(error){
      return buildKbItemsFromTeamList(defaultTeamItems);
    }
  }

  function saveKbItems(){
    const teamItems = KB_ITEMS.filter(item => item.scope === 'team').map(item => ({
      id: item.id,
      name: item.name,
      count: item.count,
      icon: item.icon,
      tip: item.tip || '',
    }));
    try{
      localStorage.setItem(KB_ITEMS_STORAGE_KEY, JSON.stringify(teamItems));
    }catch(error){
      /* 忽略存储异常，保持 demo 可继续演示 */
    }
  }

  function syncTeamKbIds(){
    TEAM_KB_IDS = new Set(
      KB_ITEMS.filter(item => item.scope === 'team').map(item => item.id),
    );
  }

  function getKbItemById(id){
    return KB_ITEMS.find(item => item.id === id);
  }

  function buildSwitchKbOnclick(item){
    if(item.onclick) return item.onclick;
    const switchName = (item.switchName || item.name || '').replace(/'/g, "\\'");
    const safeCount = String(item.count ?? '0').replace(/'/g, "\\'");
    return `switchKb('${item.id}','${switchName}','${safeCount}')`;
  }

  function getDefaultKbVisibilityState(){
    // 注：mode='all' 表示"对全校老师可见"；mode='members' 表示"仅指定老师可见"，且必须含创建者
    return {
      'math-group': { mode: 'all', members: [] },
      'school': { mode: 'all', members: [] },
      'grade-2': { mode: 'members', members: [KB_CREATOR, '王老师', '李老师'] },
      'grade-3': { mode: 'all', members: [] },
    };
  }

  function loadKbVisibilityState(){
    const defaults = getDefaultKbVisibilityState();
    try {
      const raw = localStorage.getItem(KB_VISIBILITY_STORAGE_KEY);
      if(!raw) return defaults;
      const parsed = JSON.parse(raw);
      const merged = { ...defaults };
      Object.keys(defaults).forEach((id) => {
        const item = parsed && parsed[id];
        if(!item) return;
        const mode = item.mode === 'members' ? 'members' : 'all';
        const members = Array.isArray(item.members)
          ? item.members.filter(name => TEAM_MEMBERS.includes(name))
          : [];
        merged[id] = { mode, members };
      });
      return merged;
    } catch (error){
      return defaults;
    }
  }

  function saveKbVisibilityState(){
    try{
      localStorage.setItem(KB_VISIBILITY_STORAGE_KEY, JSON.stringify(kbVisibilityState));
    }catch(error){
      /* 忽略存储异常，保持 demo 可继续演示 */
    }
  }

  function getTeamKbItems(){
    return KB_ITEMS.filter(item => TEAM_KB_IDS.has(item.id));
  }

  function ensureKbAdminMounted(){
    if(document.getElementById('kb-admin-menu')) return;
    const style = document.createElement('style');
    style.id = 'kb-admin-style';
    style.textContent = KB_ADMIN_STYLE;
    document.head.appendChild(style);

    const menu = document.createElement('div');
    menu.className = 'kb-admin-menu';
    menu.id = 'kb-admin-menu';
    menu.innerHTML = `
      <button class="kb-admin-item" onclick="uploadTeamKbContent(event)">
        <i data-lucide="upload"></i>
        <span>上传资料</span>
      </button>
      <button class="kb-admin-item" onclick="openKbVisibilityEditor(event)">
        <i data-lucide="shield-check"></i>
        <span>管理可见性</span>
      </button>
      <button class="kb-admin-item" onclick="openRenameKbEditor(event)">
        <i data-lucide="pencil-line"></i>
        <span>重命名</span>
      </button>
      <div class="kb-admin-divider"></div>
      <button class="kb-admin-item danger" onclick="deleteTeamKb(event)">
        <i data-lucide="trash-2"></i>
        <span>删除知识库</span>
      </button>
    `;

    const popover = document.createElement('div');
    popover.className = 'kbv-pop';
    popover.id = 'kb-visibility-popover';
    popover.innerHTML = `
      <div class="kbv-title" id="kbv-title"></div>
      <div class="kbv-sub">管理员可配置“全校可见 / 指定老师可见”</div>
      <div class="kbv-radio-row">
        <label class="kbv-radio">
          <input type="radio" name="kbv-mode-pop" value="all" onchange="handleKbVisibilityModeChange(this.value)" />
          <span>全校可见</span>
        </label>
        <label class="kbv-radio">
          <input type="radio" name="kbv-mode-pop" value="members" onchange="handleKbVisibilityModeChange(this.value)" />
          <span>指定老师</span>
        </label>
      </div>
      <div class="kbv-picker" data-scope="kbv">
        <div class="kbv-search-row">
          <i data-lucide="search" class="kbv-search-icon"></i>
          <input class="kbv-search-input" type="text" placeholder="输入老师姓名搜索…" oninput="filterMemberCandidates(this.value,'kbv')" />
        </div>
        <div class="kbv-dropdown"></div>
        <div class="kbv-selected"></div>
      </div>
      <div class="kbv-foot">
        <button class="kbv-btn" onclick="closeKbVisibilityEditor()">取消</button>
        <button class="kbv-btn primary" onclick="saveKbVisibilityConfig()">保存</button>
      </div>
    `;

    const editor = document.createElement('div');
    editor.className = 'kbe-pop';
    editor.id = 'kb-editor-popover';
    editor.innerHTML = `
      <div class="kbe-title" id="kbe-title">新建知识库</div>
      <div class="kbe-sub" id="kbe-sub">创建后会自动切换到新知识库</div>
      <div class="kbe-field">
        <label class="kbe-label" for="kbe-name">知识库名称</label>
        <input id="kbe-name" class="kbe-input" type="text" maxlength="24" placeholder="例如：初一数学备课组" />
      </div>
      <div class="kbe-field" id="kbe-visibility-field">
        <span class="kbe-label">可见范围</span>
        <div class="kbv-radio-row">
          <label class="kbv-radio">
            <input type="radio" name="kbe-mode" value="all" onchange="handleKbEditorModeChange(this.value)" />
            <span>全校可见</span>
          </label>
          <label class="kbv-radio">
            <input type="radio" name="kbe-mode" value="members" onchange="handleKbEditorModeChange(this.value)" />
            <span>指定老师</span>
          </label>
        </div>
        <div class="kbv-picker" data-scope="kbe">
          <div class="kbv-search-row">
            <i data-lucide="search" class="kbv-search-icon"></i>
            <input class="kbv-search-input" type="text" placeholder="输入老师姓名搜索…" oninput="filterMemberCandidates(this.value,'kbe')" />
          </div>
          <div class="kbv-dropdown"></div>
          <div class="kbv-selected"></div>
        </div>
      </div>
      <div class="kbv-foot">
        <button class="kbv-btn" onclick="closeKbEditor()">取消</button>
        <button class="kbv-btn primary" id="kbe-submit-btn" onclick="submitKbEditor()">创建并进入</button>
      </div>
    `;

    document.body.append(menu, popover, editor);
    if(window.lucide) lucide.createIcons();

    document.addEventListener('click', (event) => {
      if(event.target.closest('#kb-admin-menu')) return;
      if(event.target.closest('#kb-visibility-popover')) return;
      if(event.target.closest('#kb-editor-popover')) return;
      if(event.target.closest('.sb-kb-more')) return;
      if(event.target.closest('.sb-kb-create')) return;
      closeKbAdminMenu();
      closeKbVisibilityEditor();
      closeKbEditor();
    });

    document.addEventListener('keydown', (event) => {
      if(event.key === 'Escape'){
        closeKbAdminMenu();
        closeKbVisibilityEditor();
        closeKbEditor();
      }
    });
  }

  // 统一的成员选择器渲染：搜索 + 下拉候选 + 已选列表 + 状态条
  // scope: 'kbv'（管理可见性浮层）或 'kbe'（新建/重命名浮层）
  function renderMemberPicker(scope){
    const picker = document.querySelector(`.kbv-picker[data-scope="${scope}"]`);
    if(!picker) return;
    const draft = kbVisibilityDraft || { mode:'all', members:[] };
    const isMembersMode = draft.mode === 'members';
    picker.classList.toggle('disabled', !isMembersMode);

    // 确保创建者始终在已选列表中（指定老师模式下）
    let members = (draft.members || []).slice();
    if(isMembersMode){
      members = members.filter(name => TEAM_MEMBERS.includes(name) && name !== KB_CREATOR);
      members.unshift(KB_CREATOR);
    }

    // 渲染已选列表
    const selectedEl = picker.querySelector('.kbv-selected');
    if(selectedEl){
      selectedEl.innerHTML = members.map((name) => {
        const safe = name.replace(/'/g, "\\'");
        const initial = name.charAt(0);
        if(name === KB_CREATOR){
          return `
            <div class="kbv-row creator">
              <span class="kbv-avatar">${initial}</span>
              <span class="kbv-row-name">${name}</span>
              <span class="kbv-row-tag">创建者</span>
              <i data-lucide="lock" class="kbv-row-lock"></i>
            </div>`;
        }
        return `
          <div class="kbv-row">
            <span class="kbv-avatar">${initial}</span>
            <span class="kbv-row-name">${name}</span>
            <button class="kbv-row-remove" type="button" onclick="event.stopPropagation();removeMemberFromDraft('${safe}','${scope}')"><i data-lucide="x"></i></button>
          </div>`;
      }).join('');
    }

    // 候选下拉：只有当用户输入了关键字才展开（Figma / Google Docs 模式）
    const dropdownEl = picker.querySelector('.kbv-dropdown');
    if(dropdownEl){
      const searchInput = picker.querySelector('.kbv-search-input');
      const keyword = (searchInput && searchInput.value || '').trim().toLowerCase();
      if(!keyword){
        dropdownEl.classList.remove('open');
        dropdownEl.innerHTML = '';
      } else {
        const remaining = TEAM_MEMBERS.filter(name => !members.includes(name));
        const filtered = remaining.filter(name => name.toLowerCase().includes(keyword));
        dropdownEl.classList.add('open');
        if(filtered.length === 0){
          dropdownEl.innerHTML = `<div class="kbv-dropdown-empty">没有找到这位老师</div>`;
        } else {
          dropdownEl.innerHTML = filtered.map((name) => {
            const safe = name.replace(/'/g, "\\'");
            const initial = name.charAt(0);
            return `
              <button class="kbv-candidate" type="button" onclick="event.stopPropagation();addMemberToDraft('${safe}','${scope}')">
                <span class="kbv-avatar">${initial}</span>
                <span class="kbv-candidate-name">${name}</span>
                <i data-lucide="plus" class="kbv-candidate-add"></i>
              </button>`;
          }).join('');
        }
      }
    }

    if(window.lucide) lucide.createIcons();
  }

  function syncKbVisibilityEditor(){
    const title = document.getElementById('kbv-title');
    const kb = KB_ITEMS.find(item => item.id === kbVisibilityCurrentId);
    if(title) title.textContent = kb ? `可见性 · ${kb.name}` : '可见性设置';
    const config = kbVisibilityDraft || kbVisibilityState[kbVisibilityCurrentId] || { mode:'all', members:[] };
    document.querySelectorAll('input[name="kbv-mode-pop"]').forEach((radio) => {
      radio.checked = radio.value === config.mode;
    });
    // 重置搜索框，下拉会因为 keyword 为空自动收起
    const searchInput = document.querySelector('.kbv-picker[data-scope="kbv"] .kbv-search-input');
    if(searchInput) searchInput.value = '';
    renderMemberPicker('kbv');
  }

  function openKbAdminMenu(event, id){
    if(event){
      event.preventDefault();
      event.stopPropagation();
    }
    ensureKbAdminMounted();
    kbVisibilityCurrentId = id;
    const menu = document.getElementById('kb-admin-menu');
    if(!menu) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const width = 176;
    const left = Math.max(8, Math.min(window.innerWidth - width - 8, rect.right - width));
    menu.style.left = `${left}px`;
    menu.style.top = `${Math.min(window.innerHeight - 160, rect.bottom + 6)}px`;
    menu.classList.add('open');
    closeKbVisibilityEditor();
    closeKbEditor();
  }

  function closeKbAdminMenu(){
    const menu = document.getElementById('kb-admin-menu');
    if(menu) menu.classList.remove('open');
  }

  function openKbVisibilityEditor(event){
    if(event){
      event.preventDefault();
      event.stopPropagation();
    }
    ensureKbAdminMounted();
    kbVisibilityDraft = { ...(kbVisibilityState[kbVisibilityCurrentId] || { mode:'all', members:[] }) };
    kbVisibilityDraft.members = [...(kbVisibilityDraft.members || [])];
    const pop = document.getElementById('kb-visibility-popover');
    const menu = document.getElementById('kb-admin-menu');
    if(!pop || !menu) return;
    const rect = menu.getBoundingClientRect();
    const width = 360;
    const left = Math.max(8, Math.min(window.innerWidth - width - 8, rect.left + rect.width + 8));
    pop.style.left = `${left}px`;
    pop.style.top = `${Math.min(window.innerHeight - 300, rect.top)}px`;
    pop.classList.add('open');
    syncKbVisibilityEditor();
    closeKbEditor();
  }

  function closeKbVisibilityEditor(){
    kbVisibilityDraft = null;
    const pop = document.getElementById('kb-visibility-popover');
    if(pop) pop.classList.remove('open');
  }

  function uploadTeamKbContent(event){
    if(event){
      event.preventDefault();
      event.stopPropagation();
    }
    closeKbAdminMenu();
    closeKbVisibilityEditor();
    closeKbEditor();
    if(typeof window.personalUploadToCurrentFolder === 'function'){
      window.personalUploadToCurrentFolder();
      return;
    }
    window.location.href = 'school-wiki.html?view=folder';
  }

  function openKbEditor(mode, anchorRect){
    const pop = document.getElementById('kb-editor-popover');
    if(!pop) return;
    kbEditorMode = mode;
    kbEditorTargetId = kbVisibilityCurrentId;

    const title = document.getElementById('kbe-title');
    const sub = document.getElementById('kbe-sub');
    const nameInput = document.getElementById('kbe-name');
    const submitBtn = document.getElementById('kbe-submit-btn');
    const visibilityField = document.getElementById('kbe-visibility-field');
    const currentKb = getKbItemById(kbEditorTargetId);

    if(title) title.textContent = mode === 'rename' ? '重命名知识库' : '新建知识库';
    if(sub) sub.textContent = mode === 'rename' ? '更新后会同步到侧栏与顶部标题' : '创建后会自动切换到新知识库';
    if(submitBtn) submitBtn.textContent = mode === 'rename' ? '保存名称' : '创建并进入';
    if(visibilityField) visibilityField.style.display = mode === 'rename' ? 'none' : 'flex';
    if(nameInput){
      nameInput.value = mode === 'rename' ? (currentKb?.name || '') : '';
      setTimeout(() => nameInput.focus(), 30);
    }

    if(mode === 'create'){
      kbVisibilityDraft = { mode:'all', members:[KB_CREATOR] };
      document.querySelectorAll('input[name="kbe-mode"]').forEach((radio) => {
        radio.checked = radio.value === 'all';
      });
      const searchInput = document.querySelector('.kbv-picker[data-scope="kbe"] .kbv-search-input');
      if(searchInput) searchInput.value = '';
      renderMemberPicker('kbe');
    }

    const width = 390;
    const left = Math.max(8, Math.min(window.innerWidth - width - 8, anchorRect.left + anchorRect.width + 8));
    pop.style.left = `${left}px`;
    pop.style.top = `${Math.min(window.innerHeight - 360, anchorRect.top)}px`;
    pop.classList.add('open');
  }

  function closeKbEditor(){
    const pop = document.getElementById('kb-editor-popover');
    if(pop) pop.classList.remove('open');
    kbEditorMode = null;
    kbEditorTargetId = null;
    // 不清 kbVisibilityDraft：kbe-pop 与 kbv-pop 共用 draft 但二者互斥打开，
    // 各自的 open 路径会负责重置 draft；这里清会破坏从 kbv-pop 切到 kbe-pop 或反过来的场景。
  }

  function handleKbEditorModeChange(mode){
    if(!kbVisibilityDraft) kbVisibilityDraft = { mode:'all', members:[] };
    kbVisibilityDraft.mode = mode === 'members' ? 'members' : 'all';
    if(kbVisibilityDraft.mode === 'members' && !(kbVisibilityDraft.members || []).includes(KB_CREATOR)){
      kbVisibilityDraft.members = [KB_CREATOR, ...(kbVisibilityDraft.members || [])];
    }
    renderMemberPicker('kbe');
  }

  function addMemberToDraft(name, scope){
    if(!kbVisibilityDraft) kbVisibilityDraft = { mode:'members', members:[] };
    kbVisibilityDraft.mode = 'members';
    const set = new Set(kbVisibilityDraft.members || []);
    set.add(KB_CREATOR);
    set.add(name);
    kbVisibilityDraft.members = Array.from(set);
    // 切换 radio 视觉态以同步 mode
    const radios = document.querySelectorAll(scope === 'kbv' ? 'input[name="kbv-mode-pop"]' : 'input[name="kbe-mode"]');
    radios.forEach((radio) => { radio.checked = radio.value === 'members'; });
    // 添加成功后清空搜索框 & 保持 focus，方便连续添加多人
    const searchInput = document.querySelector(`.kbv-picker[data-scope="${scope}"] .kbv-search-input`);
    if(searchInput){
      searchInput.value = '';
      setTimeout(() => searchInput.focus(), 0);
    }
    renderMemberPicker(scope);
  }

  function removeMemberFromDraft(name, scope){
    if(!kbVisibilityDraft) return;
    if(name === KB_CREATOR) return; // 创建者不可移除
    const set = new Set(kbVisibilityDraft.members || []);
    set.delete(name);
    kbVisibilityDraft.members = Array.from(set);
    renderMemberPicker(scope);
  }

  function filterMemberCandidates(_keyword, scope){
    // renderMemberPicker 内部按当前输入框 value 决定 dropdown 是否展开
    renderMemberPicker(scope);
  }

  function buildNewKbId(name){
    const safe = name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\u4e00-\u9fa5-]/g, '')
      .slice(0, 18) || 'team-kb';
    let id = `team-${safe}`;
    let i = 2;
    while(getKbItemById(id)){
      id = `team-${safe}-${i}`;
      i += 1;
    }
    return id;
  }

  function submitKbEditor(){
    const nameInput = document.getElementById('kbe-name');
    const name = nameInput ? nameInput.value.trim() : '';
    if(!name){
      showToast('请先填写知识库名称');
      return;
    }
    const duplicated = KB_ITEMS.some(item => item.scope === 'team' && item.name === name && item.id !== kbEditorTargetId);
    if(duplicated){
      showToast('该知识库名称已存在');
      return;
    }

    if(kbEditorMode === 'rename'){
      const target = getKbItemById(kbEditorTargetId);
      if(!target) return;
      target.name = name;
      saveKbItems();
      renderSidebar();
      const tbKbName = document.getElementById('tb-kb-name');
      if(tbKbName && document.querySelector(`.sb-kb.active[data-kb="${target.id}"]`)){
        tbKbName.textContent = target.name;
      }
      if(window.lucide) lucide.createIcons();
      closeKbAdminMenu();
      closeKbEditor();
      showToast('（演示）知识库名称已更新');
      return;
    }

    if(!kbVisibilityDraft) kbVisibilityDraft = { mode:'all', members:[KB_CREATOR] };
    // members 模式兜底：确保创建者始终可见（红线）
    let createMembers = [...(kbVisibilityDraft.members || [])];
    if(kbVisibilityDraft.mode === 'members'){
      if(!createMembers.includes(KB_CREATOR)) createMembers.unshift(KB_CREATOR);
    } else {
      createMembers = [];
    }

    const id = buildNewKbId(name);
    const item = {
      id,
      name,
      count: 0,
      icon: 'book-marked',
      tip: `${name} · 新建知识库`,
      scope: 'team',
    };
    const createIndex = KB_ITEMS.findIndex(entry => entry.type === 'create-kb');
    const insertIndex = createIndex > -1 ? createIndex : KB_ITEMS.length;
    KB_ITEMS.splice(insertIndex, 0, item);
    kbVisibilityState[id] = {
      mode: kbVisibilityDraft.mode,
      members: createMembers,
    };
    syncTeamKbIds();
    saveKbItems();
    saveKbVisibilityState();
    renderSidebar();
    if(window.lucide) lucide.createIcons();
    closeKbAdminMenu();
    closeKbEditor();
    const countValue = item.count || 0;
    switchKb(id, name, countValue);
  }

  function deleteTeamKb(event){
    if(event){
      event.preventDefault();
      event.stopPropagation();
    }
    const deletingId = kbVisibilityCurrentId;
    const wasDeletingActive = document.querySelector('.sb-kb.active')?.dataset.kb === deletingId;
    const index = KB_ITEMS.findIndex(item => item.id === deletingId && item.scope === 'team');
    const kb = index > -1 ? KB_ITEMS[index] : null;
    if(!kb) return;
    const ok = window.confirm(`确认删除「${kb.name}」？\n（演示）删除后仅移出侧栏展示`);
    if(!ok) return;
    KB_ITEMS.splice(index, 1);
    syncTeamKbIds();
    saveKbItems();
    delete kbVisibilityState[kb.id];
    saveKbVisibilityState();
    closeKbAdminMenu();
    closeKbVisibilityEditor();
    closeKbEditor();
    renderSidebar();
    if(window.lucide) lucide.createIcons();
    if(wasDeletingActive){
      const fallback = getTeamKbItems()[0];
      if(fallback){
        switchKb(fallback.id, fallback.name, fallback.count || 0);
      }
    }
    showToast(`（演示）已删除「${kb.name}」`);
  }

  function handleKbVisibilityModeChange(mode){
    if(!kbVisibilityDraft) return;
    kbVisibilityDraft.mode = mode === 'members' ? 'members' : 'all';
    if(kbVisibilityDraft.mode === 'members' && !(kbVisibilityDraft.members || []).includes(KB_CREATOR)){
      kbVisibilityDraft.members = [KB_CREATOR, ...(kbVisibilityDraft.members || [])];
    }
    renderMemberPicker('kbv');
  }

  function saveKbVisibilityConfig(){
    if(!kbVisibilityDraft) return;
    const current = kbVisibilityDraft;
    // members 模式兜底：确保创建者始终可见（红线）
    let members = [...(current.members || [])];
    if(current.mode === 'members'){
      if(!members.includes(KB_CREATOR)) members.unshift(KB_CREATOR);
    } else {
      members = [];
    }
    kbVisibilityState[kbVisibilityCurrentId] = {
      mode: current.mode,
      members,
    };
    saveKbVisibilityState();
    renderSidebar();
    if(window.lucide) lucide.createIcons();
    closeKbAdminMenu();
    closeKbVisibilityEditor();
    showToast('（演示）知识库可见性已更新');
  }

  window.openKbAdminMenu = openKbAdminMenu;
  window.uploadTeamKbContent = uploadTeamKbContent;
  window.openKbVisibilityEditor = openKbVisibilityEditor;
  window.closeKbVisibilityEditor = closeKbVisibilityEditor;
  window.openRenameKbEditor = function(event){
    if(event){
      event.preventDefault();
      event.stopPropagation();
    }
    const menu = document.getElementById('kb-admin-menu');
    if(!menu) return;
    openKbEditor('rename', menu.getBoundingClientRect());
  };
  window.openCreateKbEditor = function(event){
    if(event){
      event.preventDefault();
      event.stopPropagation();
    }
    const rect = event && event.currentTarget ? event.currentTarget.getBoundingClientRect() : { left: 18, top: 120, width: 160 };
    openKbEditor('create', rect);
  };
  window.closeKbEditor = closeKbEditor;
  window.handleKbEditorModeChange = handleKbEditorModeChange;
  window.submitKbEditor = submitKbEditor;
  window.deleteTeamKb = deleteTeamKb;
  window.handleKbVisibilityModeChange = handleKbVisibilityModeChange;
  window.saveKbVisibilityConfig = saveKbVisibilityConfig;
  window.addMemberToDraft = addMemberToDraft;
  window.removeMemberFromDraft = removeMemberFromDraft;
  window.filterMemberCandidates = filterMemberCandidates;

  function getPageId(){
    if(document.body.dataset.page) return document.body.dataset.page;
    const file = (location.pathname.split('/').pop() || '').replace('.html','');
    if(file === '02-wiki-home') return 'wiki-home';
    return file || 'wiki-home';
  }

  function getActiveKb(pageId){
    if(pageId === 'personal-home') return 'personal';
    const current = document.querySelector('.sb-kb.active')?.dataset?.kb;
    if(current && TEAM_KB_IDS.has(current)) return current;
    const firstTeamKb = getTeamKbItems()[0];
    return firstTeamKb ? firstTeamKb.id : 'math-group';
  }

  function getTopbarKb(pageId){
    if(pageId === 'personal-home'){
      return { name:'张老师 · 个人知识库', icon:'bookmark' };
    }
    return { name:'初中数学教研组', icon:'library' };
  }

  function getActiveView(pageId){
    if(pageId === 'file-preview') return 'folder';
    if(pageId === 'personal-home'){
      return document.getElementById('app')?.dataset.view || 'wiki';
    }
    if(pageId !== 'wiki-entry') return 'wiki';
    const view = new URLSearchParams(location.search).get('view');
    return view || (document.getElementById('app')?.dataset.view || 'wiki');
  }

  function renderSidebar(){
    const sidebar = document.getElementById('v28-sidebar');
    if(!sidebar) return;
    const pageId = getPageId();
    const activeKb = getActiveKb(pageId);
    const moduleOnlyPages = new Set(['ai-qbank', 'chat-history', 'upload-onboarding']);
    const kbHtml = KB_ITEMS.map(item => {
      if(item.type === 'group') return `<div class="sb-group-label ${item.className || ''}">${item.label}</div>`;
      if(item.type === 'create-kb'){
        return `
          <button class="sb-kb-create" onclick="openCreateKbEditor(event)">
            <i data-lucide="plus"></i>
            <span>${item.label}</span>
          </button>
        `;
      }
      if(item.type === 'divider') return `<div class="${item.className || 'sb-nav-divider'}" aria-hidden="true"></div>`;
      const isQbankPage = pageId === 'ai-qbank' && item.id === 'ai-qbank';
      const isKbActive = !moduleOnlyPages.has(pageId) && item.id === activeKb;
      const active = (isKbActive || isQbankPage) ? ' active' : '';
      const extra = item.className ? ` ${item.className}` : '';
      const count = '';
      const canManage = TEAM_KB_IDS.has(item.id);
      const itemOnclick = buildSwitchKbOnclick(item);
      const menuBtn = canManage ? `
        <button class="sb-kb-more" title="管理知识库" onclick="openKbAdminMenu(event,'${item.id}')">
          <i data-lucide="ellipsis"></i>
        </button>
      ` : '';
      const tip = item.tip ? `<span class="sb-tip">${item.tip}</span>` : '';
      return `
        <div class="sb-kb-row${active}">
          <button class="sb-kb${extra}${active}" data-kb="${item.id}" onclick="${itemOnclick}">
            <i data-lucide="${item.icon}"></i>
            <span class="kb-name">${item.name}</span>
            ${count}
            ${tip}
          </button>
          ${menuBtn}
        </div>
      `;
    }).join('');

    sidebar.innerHTML = `
      <div class="sb-brand">
        <div class="sb-brand-mark" title="飞象 AI">FX</div>
        <div class="sb-brand-name">飞象 AI</div>
        <button class="sb-collapse-btn" onclick="toggleSide('left')" title="收起 / 展开 (⌘\\)">
          <i data-lucide="panel-left-close" id="left-icon"></i>
        </button>
      </div>

      <button class="sb-new-chat" onclick="openChat('new')">
        <i data-lucide="message-square-plus"></i>
        <span class="sb-new-chat-label">新对话</span>
        <span class="sb-tip">新对话</span>
      </button>
      <button class="sb-item sb-chat-entry${pageId === 'chat-history' ? ' active' : ''}" id="sb-chat" onclick="openChat('history')">
        <i data-lucide="message-square-text"></i>
        <span class="sb-item-label">历史对话</span>
        <span class="sb-tip">历史对话</span>
      </button>
      <div class="sb-divider" aria-hidden="true"></div>

      <div class="sb-scroll">
        <div class="sb-section">
          ${kbHtml}
        </div>
      </div>

      <div class="sb-foot">
        <div class="sb-account">
          <button class="sb-user" onclick="toggleAccountMenu(event)" aria-haspopup="menu" aria-expanded="false">
            <span class="sb-avatar">张</span>
            <span class="sb-user-name">张老师</span>
            <i data-lucide="chevron-up"></i>
            <span class="sb-tip">张老师</span>
          </button>
          <div class="sb-account-menu" role="menu" aria-label="张老师账号菜单">
            <button type="button" role="menuitem" onclick="accountMenuAction('个人信息')">
              <i data-lucide="user-round"></i>
              <span>个人信息</span>
            </button>
            <button type="button" role="menuitem" onclick="accountMenuAction('设置')">
              <i data-lucide="settings"></i>
              <span>设置</span>
            </button>
            <button type="button" role="menuitem" onclick="accountMenuAction('账号与安全')">
              <i data-lucide="shield-check"></i>
              <span>账号与安全</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function viewButton(view, label, icon, active, onclick, title = ''){
    const activeClass = active ? ' active' : '';
    const titleAttr = title ? ` title="${title}"` : '';
    return `
      <button class="vs-btn${activeClass}" data-view="${view}" onclick="${onclick}"${titleAttr}>
        <i data-lucide="${icon}"></i>
        ${label}
      </button>
    `;
  }

  function renderTopbar(){
    const topbar = document.getElementById('v28-topbar');
    if(!topbar) return;
    const pageId = getPageId();
    const activeView = getActiveView(pageId);
    const kb = getTopbarKb(pageId);

    /* 飞象老师校园版：轻量页面（题库/历史对话/上传）不渲染 topbar
       搜索由各页面自己提供；通知已迁移到 sidebar */
    if(pageId === 'ai-qbank' || pageId === 'chat-history' || pageId === 'upload-onboarding'){
      topbar.innerHTML = '';
      topbar.style.display = 'none';
      return;
    }

    let buttons;
    if(pageId === 'file-preview'){
      buttons = [
        viewButton('wiki', 'Wiki', 'book-open', false, "window.location.href='school-wiki.html'", '回 Wiki 首页'),
        viewButton('graph', '知识图谱', 'network', false, "window.location.href='wiki-entry.html?view=graph'", '回知识图谱视图'),
        viewButton('folder', '文件夹', 'folder', true, "window.location.href='wiki-entry.html?view=folder'", '回到 文件夹视图'),
      ].join('');
    } else if(pageId === 'personal-home'){
      /* 个人 KB · 三视图都在同一页面切换（folder 视图由 v28.js renderPersonalFolderView 渲染） */
      buttons = [
        viewButton('wiki', 'Wiki', 'book-open', activeView === 'wiki', "switchPersonalView('wiki')"),
        viewButton('graph', '知识图谱', 'network', activeView === 'graph', "switchPersonalView('graph')"),
        viewButton('folder', '文件夹', 'folder', activeView === 'folder', "switchPersonalView('folder')"),
      ].join('');
    } else {
      const wikiAction = pageId === 'wiki-entry'
        ? "switchView('wiki','二次函数图像与性质')"
        : "switchView('wiki')";
      buttons = [
        viewButton('wiki', 'Wiki', 'book-open', activeView === 'wiki', wikiAction),
        viewButton('graph', '知识图谱', 'network', activeView === 'graph', pageId === 'wiki-entry' ? "switchView('graph','二次函数图像与性质')" : "switchView('graph')"),
        viewButton('folder', '文件夹', 'folder', activeView === 'folder', pageId === 'wiki-entry' ? "switchView('folder','二次函数图像与性质')" : "switchView('folder')"),
      ].join('');
    }

    topbar.innerHTML = `
      <span class="tb-kb-current" id="tb-kb-current">
        <i data-lucide="${kb.icon}"></i>
        <span class="tb-kb-name" id="tb-kb-name">${kb.name}</span>
      </span>
      <div class="view-switcher" role="tablist">
        ${buttons}
      </div>
      <div class="tb-spacer"></div>
      <button class="tb-search" onclick="toggleTopSearch(event)" aria-expanded="false">
        <i data-lucide="search"></i>
        <span>搜索 Wiki、文件…</span>
      </button>
      <!-- 通知铃铛已迁移到侧边栏底部，topbar 不再展示 -->
    `;
  }

  function renderV28Shell(){
    ensureKbAdminMounted();
    renderSidebar();
    renderTopbar();
    ensureNotifyMounted();
    ensureKbPickerMounted();
    syncChatScopeLabels();
    if(window.lucide) lucide.createIcons();
  }

  document.addEventListener('DOMContentLoaded', renderV28Shell);
  window.renderV28Shell = renderV28Shell;
})();
