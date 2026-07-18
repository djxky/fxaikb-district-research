/* ========================================================
   飞象 AI · v28 — 交互逻辑
   架构：
     - 主区永远是内容（Wiki / 文件 / 图谱）
     - 底部 command bar 常驻（AI 入口）
     - 右栏 chat drawer 召唤式滑入，展开时底部 bar 自动隐藏
   ======================================================== */

const app = document.getElementById('app');

/* ──────────────────────────────────────────────
   左栏 dock 收折（保留 ⌘\ 快捷键）
   ────────────────────────────────────────────── */
function toggleSide(which){
  if(which !== 'left') return;
  const current = app.dataset.left;
  if(current === 'collapsed') delete app.dataset.left;
  else app.dataset.left = 'collapsed';
  refreshCollapseIcons();
}

function refreshCollapseIcons(){
  const leftCollapsed = app.dataset.left === 'collapsed';
  const li = document.getElementById('left-icon');
  if(li) li.setAttribute('data-lucide', leftCollapsed ? 'panel-left-open' : 'panel-left-close');
  if(window.lucide) lucide.createIcons();
}

/* 账号菜单 · 设置等低频入口收进张老师头像 */
function closeAccountMenus(){
  document.querySelectorAll('.sb-account.open').forEach(account => {
    account.classList.remove('open');
    const trigger = account.querySelector('.sb-user');
    if(trigger) trigger.setAttribute('aria-expanded', 'false');
  });
}

function toggleAccountMenu(event){
  if(event) event.stopPropagation();
  const trigger = event && event.currentTarget;
  const account = trigger && trigger.closest('.sb-account');
  if(!account) return;
  const willOpen = !account.classList.contains('open');
  closeAccountMenus();
  account.classList.toggle('open', willOpen);
  trigger.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
}

function accountMenuAction(label){
  closeAccountMenus();
  showToast(`（演示）打开${label}`);
}

/* ============================================================
 * 顶栏搜索 · 实时筛选 + 关键字高亮 + 类型分组
 * ------------------------------------------------------------
 * mock 数据池覆盖 2 种类型（Wiki / 文件）
 * 关键字模糊匹配 main + sub 字段，命中处 <mark> 高亮
 * 空输入态显示"推荐内容"前 4 条；无命中态显示空态 + AI 兜底
 * ============================================================ */

/* 搜索范围 · 下拉选择器
 * 用下拉而非 chip 平铺：KB 多了 chip 会换行挤压结果区，下拉永远单行
 * 不显示文件数量（避免信息噪音误导老师按数量选 KB）
 * groupLabel 用于分隔个人/团队两段，仅显示在下拉内
 */
/* 飞象老师校园版：知识库只有「我的」+「学校」两个，团队知识库概念已废除 */
const TOP_SEARCH_SCOPES = [
  { id:'all',      label:'全部' },
  { id:'personal', label:'我的知识库', group:'mine' },
  { id:'school',   label:'学校知识库', group:'school' }
];

/* mock 数据池 · kb 字段只有 personal / school 两种；传统搜索只做标题定位 */
const TOP_SEARCH_POOL = [
  /* Wiki 词条 */
  { type:'wiki', label:'主题', icon:'book-open', kb:'school',   main:'二次函数图像与性质', sub:'学校知识库', href:'wiki-entry.html' },
  { type:'wiki', label:'主题', icon:'book-open', kb:'school',   main:'相似三角形的判定方法', sub:'学校知识库', href:'wiki-entry.html' },
  { type:'wiki', label:'主题', icon:'book-open', kb:'school',   main:'圆与切线的位置关系', sub:'学校知识库', href:'wiki-entry.html' },
  { type:'wiki', label:'主题', icon:'book-open', kb:'school',   main:'勾股定理及其逆定理', sub:'学校知识库', href:'wiki-entry.html' },
  /* 资料：全局搜索不把原文件预览页作为独立入口，先回到知识库上下文 */
  { type:'resource', label:'资料', icon:'presentation',     kb:'personal', main:'二次函数·导入课件.pptx', sub:'我的知识库 · 4.2 MB', href:'my-wiki.html' },
  { type:'resource', label:'资料', icon:'file-text',        kb:'school',   main:'二次函数公开课教案.docx', sub:'学校知识库 · 1.8 MB', href:'wiki-entry.html' },
  { type:'resource', label:'资料', icon:'image',            kb:'school',   main:'相似三角形板书照片.jpg', sub:'学校知识库 · 2.1 MB', href:'wiki-entry.html' },
  { type:'resource', label:'资料', icon:'file-spreadsheet', kb:'personal', main:'八年级期中成绩单.xlsx', sub:'我的知识库 · 38 KB', href:'my-wiki.html' }
];

let _topSearchDebounce = null;
let _topSearchScope = 'all';  /* 当前搜索范围 · 默认全部 */

function getFixedTopSearchScope(){
  const pageId = document.body?.dataset?.page || '';
  const kb = document.getElementById('app')?.dataset?.kb || '';
  if(pageId === 'wiki-home' || kb === 'school') return 'school';
  if(pageId === 'personal-home' || kb === 'personal') return 'personal';
  return null;
}

function getTopSearchPlaceholder(scopeId){
  if(scopeId === 'school') return '搜索学校知识库的标题或文件名…';
  if(scopeId === 'personal') return '搜索我的知识库标题或文件名…';
  return '搜索知识库标题或文件名…';
}

function ensureTopSearchPanel(){
  let panel = document.getElementById('top-search-panel');
  if(panel) return panel;
  const workspace = document.querySelector('.workspace');
  /* 飞象老师校园版：原 v28 .topbar 已被 .page-header 取代，作为锚点 fallback */
  const anchor = document.querySelector('.topbar') || document.querySelector('.page-header');
  if(!workspace || !anchor) return null;

  const fixedScope = getFixedTopSearchScope();
  if(fixedScope) _topSearchScope = fixedScope;

  panel = document.createElement('div');
  panel.className = 'top-search-panel';
  panel.id = 'top-search-panel';
  panel.innerHTML = `
    <div class="top-search-input">
      <i data-lucide="search"></i>
      <input id="top-search-input" type="text" placeholder="${escapeHtml(getTopSearchPlaceholder(_topSearchScope))}" autocomplete="off"
             oninput="onTopSearchInput(this.value)"
             onkeydown="if(event.key==='Escape'){ closeTopSearch(); }" />
      <span class="spot-esc" onclick="closeTopSearch()">Esc</span>
    </div>
    <div class="top-search-scope">
      ${fixedScope ? `
        <div class="top-search-scope-trigger is-fixed" id="top-search-scope-trigger" aria-disabled="true">
          <span class="top-search-scope-trigger-label">
            范围 · <b id="top-search-scope-current">${escapeHtml(getScopeLabel(_topSearchScope))}</b>
          </span>
        </div>
      ` : `
        <button class="top-search-scope-trigger" id="top-search-scope-trigger"
                onclick="toggleTopSearchScopeDropdown(event)"
                aria-haspopup="listbox" aria-expanded="false">
          <span class="top-search-scope-trigger-label">
            范围 · <b id="top-search-scope-current">${escapeHtml(getScopeLabel(_topSearchScope))}</b>
          </span>
          <i data-lucide="chevron-down"></i>
        </button>
        <div class="top-search-scope-dropdown" id="top-search-scope-dropdown" role="listbox">
          ${renderScopeDropdownItems()}
        </div>
      `}
    </div>
    <div class="top-search-results" id="top-search-results"></div>
  `;
  anchor.insertAdjacentElement('afterend', panel);
  renderTopSearchResults('');
  return panel;
}

function getScopeLabel(scopeId){
  const s = TOP_SEARCH_SCOPES.find(x => x.id === scopeId);
  return s ? s.label : '全部';
}

function renderScopeDropdownItems(){
  if(getFixedTopSearchScope()) return '';
  /* 按 group 分段：all → mine → team
   * 用 group 字段做分隔标签，让"我的"和"团队"视觉分开
   */
  let html = '';
  TOP_SEARCH_SCOPES.forEach(s => {
    /* 校园版只剩 全部 / 我的 / 学校 三项，扁平展示，不再加分组分隔 */
    const selected = s.id === _topSearchScope;
    html += `
      <button class="top-search-scope-option${selected ? ' is-selected' : ''}"
              data-scope="${s.id}"
              role="option"
              aria-selected="${selected}"
              onclick="switchTopSearchScope('${s.id}')">
        <i class="top-search-scope-check" data-lucide="${selected ? 'check' : ''}"></i>
        <span>${escapeHtml(s.label)}</span>
      </button>
    `;
  });
  return html;
}

/* 打开/关闭下拉 · 点外部自动关闭由全局 click 监听处理 */
function toggleTopSearchScopeDropdown(event){
  if(event) event.stopPropagation();
  if(getFixedTopSearchScope()) return;
  const dropdown = document.getElementById('top-search-scope-dropdown');
  const trigger = document.getElementById('top-search-scope-trigger');
  if(!dropdown || !trigger) return;
  const open = !dropdown.classList.contains('open');
  dropdown.classList.toggle('open', open);
  trigger.setAttribute('aria-expanded', open);
}

function closeTopSearchScopeDropdown(){
  const dropdown = document.getElementById('top-search-scope-dropdown');
  const trigger = document.getElementById('top-search-scope-trigger');
  if(dropdown) dropdown.classList.remove('open');
  if(trigger) trigger.setAttribute('aria-expanded', 'false');
}

/* 切换搜索范围 · 重新渲染下拉 + 结果 */
function switchTopSearchScope(scopeId){
  const fixedScope = getFixedTopSearchScope();
  if(fixedScope) scopeId = fixedScope;
  _topSearchScope = scopeId;
  /* 更新触发器显示的当前选中名 */
  const cur = document.getElementById('top-search-scope-current');
  if(cur) cur.textContent = getScopeLabel(scopeId);
  /* 重新渲染下拉项 · 更新对勾位置 */
  const dropdown = document.getElementById('top-search-scope-dropdown');
  if(dropdown) dropdown.innerHTML = renderScopeDropdownItems();
  closeTopSearchScopeDropdown();
  /* 取当前关键字重渲结果 */
  const input = document.getElementById('top-search-input');
  const kw = input ? input.value : '';
  renderTopSearchResults(kw);
  if(window.lucide) lucide.createIcons();
}

/* input 防抖渲染 · 120ms 既快又不卡 */
function onTopSearchInput(value){
  clearTimeout(_topSearchDebounce);
  _topSearchDebounce = setTimeout(() => renderTopSearchResults(value), 120);
}

function renderTopSearchResults(keyword){
  const wrap = document.getElementById('top-search-results');
  if(!wrap) return;
  const kw = (keyword || '').trim();
  const fixedScope = getFixedTopSearchScope();
  if(fixedScope) _topSearchScope = fixedScope;
  const scope = _topSearchScope;
  const scopeLabel = (TOP_SEARCH_SCOPES.find(s => s.id === scope) || {}).label || '全部';

  /* 范围过滤 · scope='all' 不过滤 */
  const inScope = (it) => scope === 'all' || it.kb === scope;

  /* 空输入态 · 不展示推荐内容（用户决策：搜索是目的性极强的动作，老师打开 = 已有关键字）
   * 只给一行 hint 引导，跟 VSCode ⌘P / Spotlight / Linear ⌘K 等主流搜索框模式对齐
   */
  if(!kw){
    const hintText = scope === 'all'
      ? '输入标题或文件名关键字'
      : `输入标题或文件名 · 范围 ${escapeHtml(scopeLabel)}`;
    wrap.innerHTML = `
      <div class="top-search-hint">
        <i data-lucide="search"></i>
        <span>${hintText}</span>
      </div>
    `;
    if(window.lucide) lucide.createIcons();
    return;
  }

  /* 模糊匹配标题 / 文件名 · 同时受 scope 限制 */
  const kwLower = kw.toLowerCase();
  const hits = TOP_SEARCH_POOL.filter(it =>
    inScope(it) &&
    it.main.toLowerCase().includes(kwLower)
  );

  /* 无命中态 · 给一个 AI 兜底 + 提示当前 scope 影响 */
  if(!hits.length){
    /* 如果当前 scope 没命中，看看更大范围下是否有结果 */
    const allHits = !fixedScope && scope !== 'all'
      ? TOP_SEARCH_POOL.filter(it => it.main.toLowerCase().includes(kwLower)).length
      : 0;
    const scopeHint = fixedScope
      ? '当前知识库内未找到匹配标题，可换个关键字或让 AI 帮你找'
      : (scope !== 'all' && allHits > 0)
      ? `当前范围"${escapeHtml(scopeLabel)}"内没找到，其他范围内有 ${allHits} 条`
      : '换个标题关键字试试，或让 AI 帮你找';
    const switchAllBtn = (scope !== 'all' && allHits > 0)
      ? `<button class="top-search-empty-btn top-search-empty-btn--ghost" onclick="switchTopSearchScope('all')">
           <i data-lucide="layers"></i><span>切到全部 · ${allHits} 条</span>
         </button>`
      : '';
    wrap.innerHTML = `
      <div class="top-search-empty">
        <i data-lucide="search-x"></i>
        <div class="top-search-empty-title">未找到包含「${escapeHtml(kw)}」的内容</div>
        <div class="top-search-empty-sub">${scopeHint}</div>
        <div class="top-search-empty-actions">
          ${switchAllBtn}
          <button class="top-search-empty-btn" onclick="closeTopSearch(); openChat('new', '帮我找：${escapeHtml(kw)}')">
            <i data-lucide="sparkles"></i><span>用 AI 帮我找「${escapeHtml(kw)}」</span>
          </button>
        </div>
      </div>
    `;
    if(window.lucide) lucide.createIcons();
    return;
  }

  /* 简单列表渲染 · 传统搜索只负责快速定位 */
  const scopeBadge = scope === 'all' ? '' : ` · 范围 <b>${escapeHtml(scopeLabel)}</b>`;
  let html = `<div class="top-search-count">找到 ${hits.length} 条结果${scopeBadge}</div>`;
  html += hits.map(it => itemHtml(it, kw)).join('');
  wrap.innerHTML = html;
  if(window.lucide) lucide.createIcons();
}

function itemHtml(it, kw){
  const main = kw ? highlightKw(it.main, kw) : escapeHtml(it.main);
  const sub  = kw ? highlightKw(it.sub, kw)  : escapeHtml(it.sub);
  const href = it.href || '#';
  return `
    <a class="top-search-item top-search-item--${it.type}" href="${href}">
      <i data-lucide="${it.icon}"></i>
      <span>
        <span class="top-search-main">${main}</span>
        <span class="top-search-sub">${sub}</span>
      </span>
      <span class="top-search-type top-search-type--${it.type}">${escapeHtml(it.label)}</span>
    </a>
  `;
}

function highlightKw(text, kw){
  if(!kw) return escapeHtml(text);
  const safeText = escapeHtml(text);
  const safeKw = escapeHtml(kw);
  /* 转义 regex 特殊字符 */
  const escaped = safeKw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return safeText.replace(new RegExp(escaped, 'gi'), m => `<mark>${m}</mark>`);
}

function escapeHtml(s){
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function closeTopSearch(){
  const panel = document.getElementById('top-search-panel');
  if(panel) panel.classList.remove('open');
  document.querySelectorAll('.tb-search[aria-expanded="true"]').forEach(btn => {
    btn.setAttribute('aria-expanded', 'false');
  });
  closeTopSearchScopeDropdown();
}

/* 全局监听 · 点下拉外部关闭下拉（panel 自身不关） */
document.addEventListener('click', (e) => {
  const dropdown = document.getElementById('top-search-scope-dropdown');
  if(!dropdown || !dropdown.classList.contains('open')) return;
  if(e.target.closest('#top-search-scope-trigger')) return;
  if(e.target.closest('#top-search-scope-dropdown')) return;
  closeTopSearchScopeDropdown();
});

function openTopSearch(){
  closeAccountMenus();
  const panel = ensureTopSearchPanel();
  if(!panel) return;
  panel.classList.add('open');
  document.querySelectorAll('.tb-search').forEach(btn => btn.setAttribute('aria-expanded', 'true'));
  setTimeout(() => {
    const input = document.getElementById('top-search-input');
    if(input) input.focus();
  }, 40);
}

function toggleTopSearch(event){
  if(event) event.stopPropagation();
  const panel = ensureTopSearchPanel();
  if(!panel) return;
  if(panel.classList.contains('open')) closeTopSearch();
  else openTopSearch();
}

/* ──────────────────────────────────────────────
   对话页 · 切到对话模块（不是浮窗，是页面切换）
   · 左栏保持原状（用户靠它回到知识库）
   · 中间 = 对话流，右栏 = Canvas
   ────────────────────────────────────────────── */
let _streamingTimer = null;
let _lastUserText = '';

function openChat(mode = 'new', initialText = ''){
  const pageId = document.body?.dataset?.page || '';
  const fromHistoryPage = pageId === 'chat-history';
  const fromUploadOnboarding = pageId === 'upload-onboarding';
  const isModulePage = fromHistoryPage || fromUploadOnboarding;
  const inFolderView = pageId === 'wiki-entry' && app?.dataset?.view === 'folder';

  if(inFolderView){
    if(mode === 'history'){
      window.location.href = 'chat-history.html';
      return;
    }
    const targetMode = mode === 'resume' ? 'resume' : 'new';
    const initial = initialText ? '&initial=' + encodeURIComponent(initialText) : '';
    window.location.href = `02-wiki-home.html?chat=${targetMode}${initial}`;
    return;
  }

  if(mode === 'history'){
    window.location.href = 'chat-history.html';
    return;
  }
  if(mode === 'resume'){
    if(isModulePage){
      window.location.href = 'school-wiki.html?chat=resume';
      return;
    }
    app.dataset.chat = 'open';
    setActiveModule('chat');
    showToast('（演示）已恢复上次对话 · 围绕《二次函数》出 5 道分层练习');
    runChatDemo('围绕「二次函数图像与性质」出 5 道分层练习，A/B/C 三难度，给八(3)班用');
    return;
  }
  /* 新对话：
     · 有 initialText（从底部 command bar 带入题）→ 直接进对话流
     · 没 initialText（点击 sidebar「+ 新对话」）→ 进空状态欢迎页，等老师自由输入 */
  if(initialText){
    if(isModulePage){
      window.location.href = 'school-wiki.html?chat=new&initial=' + encodeURIComponent(initialText);
      return;
    }
    app.dataset.chat = 'open';
    setActiveModule('chat');
    runChatDemo(initialText);
    return;
  }
  if(isModulePage){
    window.location.href = 'school-wiki.html?chat=new';
    return;
  }
  enterChatEmpty();
}

/* 新对话空状态：老师自由输入页（Gemini / ChatGPT 风格 new chat）
   · 不预填任何 prompt，不跑 AI mock
   · chip 点击 = 填入输入框（让老师再编辑），不直接发送
   · 老师按发送 → 切到 data-chat="open" 走 runChatDemo */
function enterChatEmpty(){
  clearTimeout(_streamingTimer);
  app.dataset.chat = 'empty';
  setActiveModule('chat');
  toggleMemoryToast(false);

  const h = new Date().getHours();
  const greet = h < 11 ? '早上好' : h < 14 ? '中午好' : h < 18 ? '下午好' : '晚上好';
  const greetEl = document.getElementById('ce-greet');
  if(greetEl) greetEl.textContent = `${greet}，张老师`;

  /* KB 上下文：从 chat scope（多选）取，由 v28-shell 统一管理 */
  if(typeof window.syncChatScopeLabels === 'function'){
    window.syncChatScopeLabels();
  }

  const ta = document.getElementById('ce-input');
  if(ta){
    ta.value = '';
    autosize(ta);
  }
  /* 进入空状态时清掉之前的 chip 选中 */
  _activeCeChip = null;
  refreshCeChipsUI();
  refreshCeSend();

  setTimeout(()=>{
    const t = document.getElementById('ce-input');
    if(t) t.focus();
  }, 120);
}

/* ──────────────────────────────────────────────
   新对话空状态 · chips 单选
   · 点 chip → 进入选中态（切 placeholder + 工具样式）
   · 再点同一个 → 取消
   · 切到别的 chip → 互斥
   · 老师有输入 → 优先用老师输入；没输入 + 有 chip → 用 chip 的 fallback prompt
   ────────────────────────────────────────────── */
let _activeCeChip = null;
const CE_CHIP_PROMPTS = {
  quiz: {
    placeholder: '比如：基于这一组二次函数资料 给八(3)班出 5 道分层练习，A/B/C 三难度',
    fallback: '基于当前知识库给学生出一组分层练习题，A/B/C 三难度',
    label: 'AI 组题',
  },
  slides: {
    placeholder: '比如：第二课时 12 页 主题"相似三角形判定"',
    fallback: '基于当前知识库做一份课件',
    label: '多页课件',
  },
  anim: {
    placeholder: '比如：2 分钟 讲清"圆与切线"',
    fallback: '基于当前知识库做一个 2 分钟教学动画',
    label: '教学动画',
  },
  game: {
    placeholder: '比如：5 分钟课堂小游戏 主题"根的判别式"',
    fallback: '基于当前知识库设计一个 5 分钟课堂小游戏',
    label: '教学游戏',
  },
};
const CE_DEFAULT_PLACEHOLDER = '想做什么？告诉飞象，或先选一个工具…';

function ceToggleChip(kind){
  if(_activeCeChip === kind){
    _activeCeChip = null;
  } else {
    _activeCeChip = kind;
  }
  refreshCeChipsUI();
  const ta = document.getElementById('ce-input');
  if(ta){
    ta.focus();
    autosize(ta);
  }
}

function refreshCeChipsUI(){
  const ta = document.getElementById('ce-input');
  document.querySelectorAll('#chat-empty .ce-chip').forEach(btn => {
    const kind = btn.dataset.chip;
    btn.classList.toggle('active', !!kind && kind === _activeCeChip);
  });
  if(ta){
    if(_activeCeChip && CE_CHIP_PROMPTS[_activeCeChip]){
      ta.placeholder = CE_CHIP_PROMPTS[_activeCeChip].placeholder;
    } else {
      ta.placeholder = CE_DEFAULT_PLACEHOLDER;
    }
  }
}
window.ceToggleChip = ceToggleChip;

function ceSend(){
  const ta = document.getElementById('ce-input');
  if(!ta) return;
  let text = ta.value.trim();
  /* 老师输入优先；没输入但选了 chip → 用 chip 的 fallback；都没有 → toast */
  if(!text){
    if(_activeCeChip && CE_CHIP_PROMPTS[_activeCeChip]){
      text = CE_CHIP_PROMPTS[_activeCeChip].fallback;
    } else {
      showToast('先输入点什么');
      return;
    }
  } else if(_activeCeChip && CE_CHIP_PROMPTS[_activeCeChip]){
    /* 老师有输入 + 选了 chip：把意图前缀拼上（让 AI 知道做什么类型） */
    const prefix = `[${CE_CHIP_PROMPTS[_activeCeChip].label}] `;
    if(!text.startsWith('[')) text = prefix + text;
  }
  app.dataset.chat = 'open';
  runChatDemo(text);
  ta.value = '';
  _activeCeChip = null;
  refreshCeChipsUI();
  autosize(ta);
  refreshCeSend();
}

function refreshCeSend(){
  const ta = document.getElementById('ce-input');
  const btn = document.getElementById('ce-send');
  if(!ta || !btn) return;
  btn.classList.toggle('idle', !ta.value.trim());
}

/* 兼容旧调用：closeChat 现在等同于 → 回到知识库（当前 active 库） */
function closeChat(){
  backToKnowledgeBase();
}

function backToKnowledgeBase(){
  clearTimeout(_streamingTimer);
  delete app.dataset.chat;
  switchCanvas('wiki');
  toggleMemoryToast(false);

  const activeKb = document.querySelector('.sb-kb.active');
  setActiveModule(activeKb ? 'kb' : null);

  setTimeout(()=>{
    const tb = document.getElementById('bb-textarea');
    if(tb) tb.focus();
  }, 320);
}

/* 设置左栏当前 active 模块 */
function setActiveModule(mode){
  const chatBtn = document.getElementById('sb-chat');
  if(chatBtn) chatBtn.classList.toggle('active', mode === 'chat');
}

function toggleMemoryToast(show){
  const toast = document.getElementById('mem-toast-row');
  if(!toast) return;
  toast.classList.toggle('show', !!show);
}

function shouldShowMemoryToast(userText = ''){
  const text = String(userText || '').trim();
  if(!text) return false;

  const hasRuleIntent = /(以后|统一|固定|默认|优先|习惯|偏好|都按|命名|规则|比例|分配|归到|模板)/.test(text);
  const hasConfirmSignal = /(^|[\s，。！？])(对|是的|可以|确认|同意|就这样|按这个|以后都)([\s，。！？]|$)/.test(text);
  const hasTargetObject = /(出题|题目|难度|A\/B\/C|命名|函数|学情|课件|分类|模板|班级|八\(3\)班)/.test(text);

  return hasRuleIntent && hasConfirmSignal && hasTargetObject;
}

/* ──────────────────────────────────────────────
   对话 demo · 用户消息 + AI 流式打字 + 自动切到 Canvas 题目集
   ────────────────────────────────────────────── */
function runChatDemo(userText){
  clearTimeout(_streamingTimer);
  const showMemoryToast = shouldShowMemoryToast(userText);
  _lastUserText = userText;

  /* 重新生成时旧消息可能还有 cites/actions/thumbs 残留，先清掉 */
  const aiMsgEl = document.getElementById('chat-ai-msg');
  if(aiMsgEl){
    const content = aiMsgEl.querySelector('.msg-content');
    if(content){
      content.querySelectorAll('.msg-cites, .msg-actions, .msg-fb-bar').forEach(el => el.remove());
    }
  }

  const userEl = document.getElementById('chat-user-text');
  const aiText = document.getElementById('chat-ai-text');
  const aiMsg  = document.getElementById('chat-ai-msg');
  const title  = document.getElementById('ch-title');
  const bcFrom = document.getElementById('bc-from');
  if(userEl) userEl.textContent = userText;
  if(title)  title.textContent  = userText.slice(0, 40) + (userText.length>40?'…':'');

  /* 面包屑入口跟当前 active 库联动 */
  const activeKb = document.querySelector('.sb-kb.active .kb-name');
  if(bcFrom && activeKb) bcFrom.textContent = activeKb.textContent.trim();

  const isQuiz   = /出.*题|组题|练习/.test(userText);
  const isSlides = /课件|讲评|备课/.test(userText);
  const isAnim   = /动画|讲解|动效/.test(userText);

  let body, citesHtml = '', actionsHtml = '';

  if(isQuiz){
    body = '好的。我从你们组共建库的「二次函数」相关 <b>12 份资料</b> 里挑了高频考点：'
         + '<span class="cite-link" data-src-hover data-src-key="导入课件.pptx · P3">开口方向<sup class="cite-sup">[1]</sup></span>、'
         + '<span class="cite-link" data-src-hover data-src-key="配套习题汇编.pdf · P12">对称轴与顶点<sup class="cite-sup">[2]</sup></span>、'
         + '<span class="cite-link" data-src-hover data-src-key="海淀区 2026 一模卷 · T6">增减性应用<sup class="cite-sup">[3]</sup></span>'
         + '，按 A / B / C 三档难度生成了 5 道题——已展示在右边 Canvas。';
    citesHtml = '<div class="msg-cites">'
      + '<i data-lucide="link-2"></i><span class="msg-cites-label">引用</span>'
      + '<span class="msg-cite-chip" data-src-hover data-src-key="导入课件.pptx · P3"><b>[1]</b> 导入课件.pptx · P3</span>'
      + '<span class="msg-cite-chip" data-src-hover data-src-key="配套习题汇编.pdf · P12"><b>[2]</b> 配套习题汇编.pdf · P12</span>'
      + '<span class="msg-cite-chip" data-src-hover data-src-key="海淀区 2026 一模卷 · T6"><b>[3]</b> 海淀一模 · T6</span>'
      + '</div>';
    actionsHtml = '<div class="msg-actions">'
      + '<button class="msg-action" onclick="switchCanvas(\'quiz\')"><i data-lucide="sparkles"></i>查看题目集</button>'
      + '<button class="msg-action" onclick="showToast(\'（演示）让 AI 再改改难度\')"><i data-lucide="refresh-ccw"></i>调整难度</button>'
      + '</div>';
    setTimeout(()=>{
      const tab = document.getElementById('cv-tab-quiz');
      if(tab) tab.hidden = false;
      switchCanvas('quiz');
    }, 1400);
  } else if(isSlides){
    body = '收到。我会基于「二次函数图像与性质」整理一份 <b>12 页课件</b>，包含：导入 → 开口方向 → 对称轴 → 顶点 → 增减性 → 综合例题 → 课后小结。准备就绪后展示在 Canvas。';
    actionsHtml = '<div class="msg-actions"><button class="msg-action" onclick="showToast(\'（演示）课件生成中…\')"><i data-lucide="layout"></i>查看课件预览</button></div>';
  } else if(isAnim){
    body = '好的。我会做一个 <b>2 分钟动画</b>，用图形动态演示判定过程。Canvas 区域加载视频预览中…';
  } else {
    body = '好的，我基于你们组共建库（925 份）来回答。当前你正在看「二次函数图像与性质」，已自动锁定上下文——右边 Canvas 实时显示我引用的位置。';
  }

  /* D-2 + D-4：每条 AI 回复末尾统一追加反馈三件套（重新生成 / 👍 / 👎） */
  const fbBarHtml = '<div class="msg-fb-bar">'
    + '<button class="msg-fb-btn" onclick="regenerateAnswer()" title="重新生成"><i data-lucide="rotate-ccw"></i><span>重新生成</span></button>'
    + '<span class="msg-fb-sep"></span>'
    + '<button class="msg-fb-thumb" onclick="thumbAnswer(this,\'up\')" title="有用" aria-label="点赞"><i data-lucide="thumbs-up"></i></button>'
    + '<button class="msg-fb-thumb" onclick="thumbAnswer(this,\'down\')" title="不太对" aria-label="点踩"><i data-lucide="thumbs-down"></i></button>'
    + '</div>';

  if(aiText){
    aiText.innerHTML = '';
    typeText(aiText, body, () => {
      const wrap = document.createElement('div');
      wrap.innerHTML = citesHtml + actionsHtml + fbBarHtml;
      while(wrap.firstChild) aiMsg.querySelector('.msg-content').appendChild(wrap.firstChild);
      if(window.lucide) lucide.createIcons();
      /* D-3：给 body 内 cite-link[data-src-hover] 和 chips 都绑 hover */
      if(typeof bindSourceHovers === 'function') bindSourceHovers(aiMsg);
      toggleMemoryToast(showMemoryToast);
    });
  }

  setTimeout(()=>{
    const ta = document.getElementById('cc-textarea');
    if(ta) ta.focus();
  }, 340);
}

function typeText(el, html, done){
  el.innerHTML = '<span class="typing-cursor"></span>';
  let i = 0;
  const len = html.length;
  const step = () => {
    i += 3;
    const chunk = html.slice(0, i);
    el.innerHTML = chunk + '<span class="typing-cursor"></span>';
    if(i >= len){
      el.innerHTML = html;
      done && done();
      return;
    }
    _streamingTimer = setTimeout(step, 18);
  };
  step();
}

/* ──────────────────────────────────────────────
   Canvas tab 切换
   ────────────────────────────────────────────── */
function switchCanvas(name){
  document.querySelectorAll('.cv-tab').forEach(b=>{
    b.classList.toggle('active', b.dataset.cv === name);
  });
  document.querySelectorAll('.cv-pane').forEach(p=>{
    p.classList.toggle('active', p.dataset.pane === name);
  });
}

/* 右栏面板 toggle：Wiki 展示整理依据，文件展示 AI 解读 */
function toggleRight(){
  if(!app) return;
  if(app.dataset.right === 'expanded'){
    delete app.dataset.right;
  } else {
    app.dataset.right = 'expanded';
  }
}
/* 兼容旧调用 */
function collapseRight(){ if(app) delete app.dataset.right; }
function expandRight(){ if(app) app.dataset.right = 'expanded'; }

/* 右栏「来源资料」展开 / 收起更多文件（仅 03-wiki-entry） */
function toggleSources(){
  document.body.classList.toggle('sources-expanded');
  const more = document.getElementById('cm-source-more');
  if(more){
    const label = more.querySelector('.cm-src-name');
    if(label){
      const expanded = document.body.classList.contains('sources-expanded');
      label.innerHTML = expanded
        ? '<i data-lucide="chevron-up"></i>收起'
        : '<i data-lucide="chevron-down"></i>展开全部 12 份';
      if(window.lucide) lucide.createIcons();
    }
  }
}

/* ──────────────────────────────────────────────
   中间对话区 · 输入提交
   ────────────────────────────────────────────── */
function sendInChat(){
  const ta = document.getElementById('cc-textarea');
  if(!ta || !ta.value.trim()){
    showToast('先输入点什么');
    return;
  }
  const text = ta.value.trim();
  ta.value = '';
  autosize(ta);
  refreshCcSend();
  runChatDemo(text);
}

function refreshCcSend(){
  const ta = document.getElementById('cc-textarea');
  const btn = document.getElementById('cc-send');
  if(!ta || !btn) return;
  btn.classList.toggle('idle', !ta.value.trim());
}

/* ──────────────────────────────────────────────
   底部 command bar · 提交 / 工具 chip / 上次对话回溯
   ────────────────────────────────────────────── */
function submitFromBar(){
  const ta = document.getElementById('bb-textarea');
  if(!ta || !ta.value.trim()){
    showToast('先输入点什么');
    return;
  }
  const text = ta.value.trim();
  ta.value = '';
  autosize(ta);
  refreshBarSend();
  openChat('new', text);
}

function useFromBar(text){
  const ta = document.getElementById('bb-textarea');
  if(!ta) return;
  ta.value = text;
  autosize(ta);
  refreshBarSend();
  ta.focus();
}

function refreshBarSend(){
  const ta = document.getElementById('bb-textarea');
  const btn = document.getElementById('bb-send');
  if(!ta || !btn) return;
  btn.classList.toggle('idle', !ta.value.trim());
}

/* ──────────────────────────────────────────────
   中栏视图切换
   ────────────────────────────────────────────── */
/* ──────────────────────────────────────────────
   视图切换 · wiki / graph / folder
   - graph：直接新窗口打开研发真实图谱（来自 KB 3 实数据）
   - folder：统一进入 03 的 canonical 文件夹视图，不在每页复制 DOM
   - wiki：保留当前页 Wiki，或从 03 的 folder 回到词条
   ────────────────────────────────────────────── */
const GRAPH_SRC = 'https://mapi.feixiangxingqiu.biz/fedebug/agora/feat/wiki-knowledge-graph/index.html#/knowledge-graph?kbId=3';
let _prevLeftBeforeFolder = null;

function getKnowledgeHeaderRoot(){
  const crumb = document.querySelector('.knowledge-header-crumb');
  return {
    el: crumb,
    name: crumb?.dataset.rootName || (CURRENT_KB_SCOPE === 'personal' ? '我的知识库' : '学校知识库'),
    icon: crumb?.dataset.rootIcon || (CURRENT_KB_SCOPE === 'personal' ? 'bookmark' : 'library')
  };
}

function renderKnowledgeHeaderWiki(){
  const { el, name, icon } = getKnowledgeHeaderRoot();
  if(!el) return;
  el.innerHTML = `
    <span class="ph-crumb-current"><i data-lucide="${icon}"></i><span>${escHtml(name)}</span></span>
    <span class="ph-crumb-sep" aria-hidden="true"><i data-lucide="chevron-right"></i></span>
    <span class="ph-crumb-current"><span>Wiki 首页</span></span>
  `;
  if(app) delete app.dataset.folderDepth;
  if(window.lucide) lucide.createIcons();
}

function renderKnowledgeHeaderFolder(rootName, rootIcon, trail){
  const { el } = getKnowledgeHeaderRoot();
  if(!el) return;
  const parts = Array.isArray(trail) ? trail : [];
  const visibleParts = parts.length > 2
    ? [{ name:'…', id:null, isEllipsis:true }, ...parts.slice(-2)]
    : parts;
  const crumbParts = visibleParts.length
    ? visibleParts.map((folder, idx) => {
        const isLast = idx === visibleParts.length - 1;
        if(folder.isEllipsis){
          const hidden = parts.slice(0, -2).map(item => item.name).join(' / ');
          return `
            <span class="ph-crumb-sep" aria-hidden="true"><i data-lucide="chevron-right"></i></span>
            <span class="ph-crumb-item ph-crumb-ellipsis" title="${escHtml(hidden)}">…</span>
          `;
        }
        return `
          <span class="ph-crumb-sep" aria-hidden="true"><i data-lucide="chevron-right"></i></span>
          ${isLast
            ? `<span class="ph-crumb-current"><span>${escHtml(folder.name)}</span></span>`
            : `<button class="ph-crumb-item ph-crumb-btn" onclick="personalEnterFolder('${escHtml(folder.id)}')" title="跳到「${escHtml(folder.name)}」">${escHtml(folder.name)}</button>`}
        `;
      }).join('')
    : `
      <span class="ph-crumb-sep" aria-hidden="true"><i data-lucide="chevron-right"></i></span>
      <span class="ph-crumb-current"><i data-lucide="folder-open"></i><span>根目录</span></span>
    `;
  el.innerHTML = `
    <button class="ph-crumb-item ph-crumb-btn" onclick="personalBackToRoot()" title="返回 ${escHtml(rootName)} 根目录">
      <i data-lucide="${escHtml(rootIcon)}"></i><span>${escHtml(rootName)}</span>
    </button>
    ${crumbParts}
  `;
  if(app) app.dataset.folderDepth = parts.length ? 'nested' : 'root';
  if(window.lucide) lucide.createIcons();
}

function renderFolderHeaderActions(state = {}){
  const wrap = document.querySelector('.folder-header-actions');
  if(!wrap) return;
  const allowSchoolHeaderWrite = document.body.dataset.page === 'wiki-home' && CURRENT_KB_SCOPE === 'school';
  const canWrite = state.canWrite !== false || allowSchoolHeaderWrite;
  const inFolder = !!state.inFolder;
  const selectedCount = state.selectedCount || 0;
  const selectableCount = state.selectableCount || 0;
  const allSelected = !!state.allSelected;
  const rootLabel = getKbRootLabel();
  const searchTitle = `搜索${rootLabel}文件`;
  const searchLabel = '搜索';
  const searchButton = `
    <button class="ph-action ph-folder-search tb-search" onclick="toggleTopSearch(event)" title="${escHtml(searchTitle)}" aria-expanded="false">
      <i data-lucide="search"></i><span>${searchLabel}</span>
    </button>
  `;

  if(!canWrite){
    wrap.innerHTML = `
      ${searchButton}
      ${inFolder ? `
      <span class="ph-action-sep" aria-hidden="true"></span>
      <button class="ph-action folder-sort-action" onclick="showToast('按上传时间 / 名称 / 大小排序')" title="排序">
        <i data-lucide="arrow-up-down"></i><span>排序</span>
      </button>` : ''}
    `;
  } else if(_folderManageMode){
    wrap.innerHTML = `
      <button class="ph-action" onclick="toggleSelectAllInFolder(${allSelected ? 'false' : 'true'})" ${selectableCount ? '' : 'disabled'}>
        <i data-lucide="${allSelected ? 'square' : 'check-square'}"></i><span>${allSelected ? '取消全选' : '全选'}</span>
      </button>
      <button class="ph-action" onclick="openBatchMovePop(event)" ${selectedCount ? '' : 'disabled'}>
        <i data-lucide="folder-input"></i><span>移动到…</span>
      </button>
      <button class="ph-action is-danger" onclick="deleteSelectedFolderItems()" ${selectedCount ? '' : 'disabled'}>
        <i data-lucide="trash-2"></i><span>删除</span>
      </button>
      <button class="ph-action is-meta" onclick="setFolderManageMode(false)">
        <i data-lucide="check"></i><span>完成</span>
      </button>
    `;
  } else {
    wrap.innerHTML = `
      ${searchButton}
      <button class="ph-action" onclick="setFolderManageMode(true)" title="批量管理">
        <i data-lucide="list-checks"></i><span>管理</span>
      </button>
      <button class="ph-action" onclick="openCreateFolderPop(event)" title="新建文件夹">
        <i data-lucide="folder-plus"></i><span>新建文件夹</span>
      </button>
      <button class="ph-action is-primary" onclick="openKbUploadModal()" title="上传文件">
        <i data-lucide="upload"></i><span>上传文件</span>
      </button>
      ${inFolder ? `
      <button class="ph-action folder-sort-action" onclick="showToast('按上传时间 / 名称 / 大小排序')" title="排序">
        <i data-lucide="arrow-up-down"></i><span>排序</span>
      </button>` : ''}
    `;
  }
  if(window.lucide) lucide.createIcons();
}

function switchView(v, entryName){
  /* 图谱 = 研发独立 SPA，直接新窗口打开。不动当前视图，保持上下文 */
  if(v === 'graph'){
    window.open(GRAPH_SRC, '_blank', 'noopener,noreferrer');
    showToast('知识图谱已在新窗口打开 · 来自研发实时数据');
    return;
  }

  if(v === 'folder' && document.body.dataset.page !== 'wiki-entry'){
    const hasLocalFolderView = !!document.getElementById('view-folder');
    if(!hasLocalFolderView){
      window.location.href = 'wiki-entry.html?view=folder';
      return;
    }
    if(document.body.dataset.page === 'wiki-home' && typeof setCurrentKbScope === 'function'){
      setCurrentKbScope('school');
    }
  }

  document.querySelectorAll('.vs-btn').forEach(b=>{
    const isActive = b.dataset.view === v;
    b.classList.toggle('active', isActive);
    b.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });

  const prevView = app.dataset.view;
  app.dataset.view = v;
  if(v === 'wiki'){
    renderKnowledgeHeaderWiki();
  }

  /* 进入文件夹视图：记住左栏状态后自动折叠到 dock，给文件树腾空间 */
  if(v === 'folder' && prevView !== 'folder'){
    _prevLeftBeforeFolder = app.dataset.left || 'expanded';
    /* 飞象老师校园版：sidebar 是金色 VIP 设计 240px，不再自动折叠 */
    /* app.dataset.left = 'collapsed'; */
    refreshCollapseIcons();
  }
  /* 离开文件夹视图：恢复用户原本的左栏状态 */
  if(v !== 'folder' && prevView === 'folder' && _prevLeftBeforeFolder !== null){
    if(_prevLeftBeforeFolder === 'collapsed'){
      app.dataset.left = 'collapsed';
    } else {
      delete app.dataset.left;
    }
    refreshCollapseIcons();
    _prevLeftBeforeFolder = null;
  }

  const hasFolderView = !!document.getElementById('view-folder');
  if(v === 'folder' && !hasFolderView){
    const msg = entryName
      ? `（演示）文件夹视图 · 定位到「${entryName}」的 12 份来源 — 即将上线`
      : '（演示）文件夹视图 — 即将上线，先看 Wiki';
    showToast(msg);
    setTimeout(()=>switchView('wiki'), 1200);
  }
  if(v === 'folder' && typeof renderPersonalFolderView === 'function'){
    renderPersonalFolderView();
  }
}

function openGraphExternal(){
  window.open(GRAPH_SRC, '_blank', 'noopener,noreferrer');
}

/* 个人 KB · 三视图切换
   · wiki：保留 hero + AI 整理纪要 + 主题目录
   · folder：本页 #view-folder 接管（renderPersonalFolderView）
   · graph：复用研发实时图谱新窗口
*/
function switchPersonalView(view){
  if(view === 'graph'){
    window.open(GRAPH_SRC, '_blank', 'noopener,noreferrer');
    showToast('知识图谱已在新窗口打开 · 来自研发实时数据');
    return;
  }
  if(!app) return;
  app.dataset.view = view;
  document.querySelectorAll('.vs-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.view === view);
  });
  if(view === 'folder'){
    renderPersonalFolderView();
  }
  if(window.lucide) lucide.createIcons();
}
window.switchPersonalView = switchPersonalView;

/* 文件夹树 · 展开/折叠 */
function toggleFolder(itemEl){
  const li = itemEl.closest('li');
  if(!li) return;
  li.classList.toggle('open');
  const caret = itemEl.querySelector('.ti-caret');
  const icon  = itemEl.querySelector('.ti-icon');
  if(caret){
    caret.setAttribute('data-lucide', li.classList.contains('open') ? 'chevron-down' : 'chevron-right');
  }
  if(icon && !icon.classList.contains('keep')){
    const isFolder = icon.getAttribute('data-lucide')?.startsWith('folder');
    if(isFolder){
      icon.setAttribute('data-lucide', li.classList.contains('open') ? 'folder-open' : 'folder');
    }
  }
  if(window.lucide) lucide.createIcons();
}

function openFolder(folderId){
  document.querySelectorAll('.fv-tree-list li.active').forEach(li=>li.classList.remove('active'));
  const item = document.querySelector(`.fv-tree-item[onclick*="${folderId}"]`);
  if(item){
    const li = item.closest('li');
    if(li) li.classList.add('active');
  }
  showToast(`（演示）切换到文件夹「${folderId}」 · 这里只展开了「二次函数」做演示`);
}

/* ──────────────────────────────────────────────
   左栏 nav 跳转占位
   ────────────────────────────────────────────── */
function navTo(target){
  if(target === 'qbank'){
    window.location.href = 'ai-qbank.html';
    return;
  }
  const labels = {
    workbench: '工作台',
    qbank: '题库',
    history: '历史对话',
  };
  showToast(`（演示）打开「${labels[target]||target}」`);
}

/* ──────────────────────────────────────────────
   切换知识库（demo mock）
   · 若在对话页：自动退出对话回到 Wiki 浏览态
   ────────────────────────────────────────────── */
function switchKb(id, name, count){
  /* 跨页跳转：个人 vs 团队 不是同一个页面 */
  const pageId = document.body.dataset.page || '';
  const onPersonalPage = pageId === 'personal-home';
  const modulePageNeedsWorkbench = pageId === 'chat-history' || pageId === 'ai-qbank' || pageId === 'upload-onboarding';

  if(id === 'personal' && !onPersonalPage){
    window.location.href = 'my-wiki.html';
    return;
  }
  if(id !== 'personal' && onPersonalPage){
    /* 个人页 → 团队 KB 系页面 */
    window.location.href = 'school-wiki.html';
    return;
  }
  if(id === 'personal' && onPersonalPage){
    /* 已经在个人页：把视图回到 Wiki 首页（不刷新整页） */
    if(typeof switchPersonalView === 'function' && app && app.dataset.view !== 'wiki'){
      switchPersonalView('wiki');
    }
    document.querySelectorAll('.sb-kb').forEach(b => {
      b.classList.toggle('active', b.dataset.kb === 'personal');
    });
    return;
  }

  if(modulePageNeedsWorkbench){
    /* 模块页（历史对话/题库）点击知识库，回到团队工作台 */
    window.location.href = 'school-wiki.html';
    return;
  }

  /* 以下是同页 in-page 切换团队 KB（仅在 team-home 页生效） */
  if(app.dataset.chat){
    clearTimeout(_streamingTimer);
    delete app.dataset.chat;
    switchCanvas('wiki');
    setActiveModule(null);
  }

  document.querySelectorAll('.sb-kb').forEach(b=>{
    b.classList.toggle('active', b.dataset.kb === id);
  });

  const title = document.getElementById('hero-title');
  const countEl = document.getElementById('hero-count');
  if(title){
    if(id === 'school'){
      title.innerHTML = `北京 101 中学 · <em>公共库</em>`;
    } else {
      title.innerHTML = `北京 101 中学 · <em>${name}</em>`;
    }
  }
  if(countEl) countEl.textContent = count.toLocaleString();

  /* 同步 topbar 当前 KB 名 */
  const tbKbName = document.getElementById('tb-kb-name');
  if(tbKbName){
    tbKbName.textContent = name;
  }

  /* 文件夹视图下切团队 KB → 切 scope + 重渲染（保留各 KB 自己的进入态） */
  if(typeof setCurrentKbScope === 'function' && document.getElementById('view-folder')){
    setCurrentKbScope(id);
    if(typeof renderPersonalFolderView === 'function'){
      renderPersonalFolderView();
    }
  }

  showToast(`（演示）已切换到「${name}」 · ${count} 份资料`);
}

/* ──────────────────────────────────────────────
   Wiki 词条 / 新对话 / 右栏 prompt
   ────────────────────────────────────────────── */
function openWiki(name){
  if(name === '飞象使用指南'){
    showToast('（演示）这里会打开《飞象使用指南》— 5 分钟读完');
    return;
  }
  /* 所有 wiki 词条共用 03 模板，靠 query 参数传词条名 */
  window.location.href = 'wiki-entry.html?w=' + encodeURIComponent(name);
}

function scrollToSec(id){
  const el = document.getElementById(id);
  if(!el){ return; }
  const scroller = document.querySelector('.workspace-scroll') || window;
  if(scroller === window){
    el.scrollIntoView({behavior:'smooth', block:'start'});
  }else{
    const top = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - 16;
    scroller.scrollTo({top, behavior:'smooth'});
  }
  el.style.transition = 'background .8s';
  el.style.background = 'rgba(192,142,79,.08)';
  setTimeout(()=>{ el.style.background = ''; }, 1100);
}

function newChat(){
  openChat('new');
}

function useQuick(text){
  openChat('new', text);
}

function sendMessage(){
  sendInChat();
}

/* ──────────────────────────────────────────────
   textarea 自动高度
   ────────────────────────────────────────────── */
function autosize(ta){
  ta.style.height = 'auto';
  ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
}

/* ──────────────────────────────────────────────
   Toast
   ────────────────────────────────────────────── */
let _toastTimer = null;
function showToast(msg, duration = 2200){
  const t = document.getElementById('toast');
  if(!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(()=>t.classList.remove('show'), duration);
}

/* ══════════════════════════════════════════════
   KB 文件夹演示数据（个人 + 团队，共用一份渲染逻辑）
   · 个人 KB（personal）   : 张老师私人，41 份演示资料 / 5 个文件夹
   · 团队 KB（math-group） : 张老师作为 admin，演示完整管理能力
   · 其它团队 KB           : 按 demo 演示"非管理员视图"，仅展示 mock 列表
   ·
   · 切换 KB（switchKb / 路由）时，currentScope 跟着切，所有 helper / render 自动用对应数据
   · CRUD 仍只在 admin KB 起效（演示数据 → localStorage 持久化）
   ══════════════════════════════════════════════ */
/* 旧名保留兼容（个人 KB 的 localStorage key 已经存了一些用户数据） */
const PERSONAL_KB_STORAGE_KEY = 'v28_personal_kb_state_wiki_demo_v2';
/* 根目录"散文件"桶的 id：显式给一个非空字符串便于复用 files[id] 索引 */
const ROOT_FOLDER_ID = '__root__';

const PERSONAL_KB_DEFAULT = {
  /* parentId === null  → 顶层（根目录直接子节点） */
  folders: [
    { id:'prep', parentId:null, name:'备课资源', count:12 },
    { id:'teaching', parentId:null, name:'课堂教学', count:7 },
    { id:'assessment', parentId:null, name:'作业与测评', count:11 },
    { id:'exam', parentId:null, name:'复习备考', count:8 },
    { id:'notes', parentId:null, name:'我的笔记', count:3 },
  ],
  /* 每个文件夹的演示文件（每个文件夹列 8-10 条，剩下作"还有 N 条"占位） */
  files: {
    prep: [
      { name:'二次函数第二课时·导入与图像.pptx', icon:'presentation', source:'张老师', time:'今天 10:42', size:'8.2 MB', wiki:'二次函数图像与性质' },
      { name:'相似三角形判定·公开课设计.docx', icon:'file-text', source:'张老师', time:'昨天 16:08', size:'1.4 MB', wiki:'相似三角形判定与应用' },
      { name:'一元二次方程·配方法教学设计.docx', icon:'file-text', source:'张老师', time:'12-09 09:31', size:'860 KB', wiki:'一元二次方程根的判别式' },
      { name:'相似三角形·实际应用例题.pptx', icon:'presentation', source:'张老师', time:'11-28 17:50', size:'5.6 MB', wiki:'相似三角形判定与应用' },
      { name:'函数综合·中考压轴专题.pptx', icon:'presentation', source:'张老师', time:'11-22 10:40', size:'9.8 MB', wiki:null },
      { name:'圆的辅助线·常用套路.docx', icon:'file-text', source:'张老师', time:'11-18 15:20', size:'620 KB', wiki:'圆与三角形综合' },
      { name:'复习课教学设计·函数单元.docx', icon:'file-text', source:'张老师', time:'11-16 19:30', size:'740 KB', wiki:'函数图像变换' },
      { name:'锐角三角函数·基础概念课件.pptx', icon:'presentation', source:'张老师', time:'11-14 08:45', size:'4.8 MB', wiki:'锐角三角函数应用' },
      { name:'反比例函数·错题导入课件.pptx', icon:'presentation', source:'张老师', time:'11-12 09:00', size:'5.1 MB', wiki:'反比例函数' },
      { name:'九年级数学·期末复习计划.docx', icon:'file-text', source:'张老师', time:'11-10 17:20', size:'360 KB', wiki:null },
      { name:'二次函数单元目标与重难点.docx', icon:'file-text', source:'张老师', time:'11-08 20:10', size:'280 KB', wiki:'二次函数图像与性质' },
      { name:'圆与三角形综合·例题整理.docx', icon:'file-text', source:'张老师', time:'11-06 18:40', size:'510 KB', wiki:'圆与三角形综合' },
    ],
    teaching: [
      { name:'二次函数对称轴·板书图.jpg', icon:'image', source:'张老师', time:'今天 09:18', size:'2.1 MB', wiki:'二次函数图像与性质' },
      { name:'圆的切线性质·教学动画.mp4', icon:'video', source:'张老师', time:'12-05 14:22', size:'34 MB', wiki:'圆与三角形综合' },
      { name:'课堂追问记录·相似三角形.docx', icon:'file-text', source:'张老师', time:'12-03 18:20', size:'160 KB', wiki:'相似三角形判定与应用' },
      { name:'函数图像平移·课堂活动照片.jpg', icon:'image', source:'张老师', time:'11-30 10:25', size:'3.4 MB', wiki:'函数图像变换' },
      { name:'公开课评课记录·二次函数.docx', icon:'file-text', source:'张老师', time:'11-28 16:10', size:'220 KB', wiki:'二次函数图像与性质' },
      { name:'课堂提问 4 类问句.docx', icon:'file-text', source:'张老师', time:'11-15 22:30', size:'95 KB', wiki:'课堂提问 4 类问句' },
      { name:'图像法导入·教学反思.docx', icon:'file-text', source:'张老师', time:'11-12 21:00', size:'110 KB', wiki:null },
    ],
    assessment: [
      { name:'八(3)班·二次函数周测卷.pdf', icon:'file', source:'张老师', time:'今天 09:18', size:'1.8 MB', wiki:'二次函数图像与性质' },
      { name:'相似三角形·专项练习 30 题.docx', icon:'file-text', source:'张老师', time:'12-10 14:00', size:'1.1 MB', wiki:'相似三角形判定与应用' },
      { name:'一元二次方程·根的判别式分层练习.docx', icon:'file-text', source:'张老师', time:'12-07 19:42', size:'780 KB', wiki:'一元二次方程根的判别式' },
      { name:'二次函数·配套习题汇编.pdf', icon:'file', source:'张老师', time:'11-25 11:30', size:'2.9 MB', wiki:'二次函数图像与性质' },
      { name:'相似三角形·错题精选.docx', icon:'file-text', source:'张老师', time:'11-19 17:55', size:'520 KB', wiki:'相似三角形判定与应用' },
      { name:'八(3)班·期中数学卷及答案.pdf', icon:'file', source:'教研组', time:'11-10 08:20', size:'2.3 MB', wiki:null },
      { name:'八(3)班·作业完成情况周表.xlsx', icon:'sheet', source:'飞象自动汇总', time:'今天 07:15', size:'180 KB', wiki:'本学期作业完成质量趋势' },
      { name:'八(3)班·二次函数单元错题集.pdf', icon:'file', source:'张老师', time:'昨天 22:08', size:'1.2 MB', wiki:'八(3)班数学薄弱点画像' },
      { name:'张明·上周周测错题分析.docx', icon:'file-text', source:'张老师', time:'12-08 18:25', size:'340 KB', wiki:'八(3)班数学薄弱点画像' },
      { name:'李婷·学情访谈记录.docx', icon:'file-text', source:'张老师', time:'12-02 14:50', size:'180 KB', wiki:'八(3)班数学薄弱点画像' },
      { name:'班级学情·月度趋势图.png', icon:'image', source:'飞象自动生成', time:'11-30 23:00', size:'920 KB', wiki:'本学期作业完成质量趋势' },
    ],
    exam: [
      { name:'海淀 2026 一模卷·数学.pdf', icon:'file', source:'网络资料', time:'昨天 21:30', size:'3.2 MB', wiki:'中考压轴 · 函数综合' },
      { name:'圆·中考真题汇编 2020-2025.pdf', icon:'file', source:'网络资料', time:'12-04 10:15', size:'5.6 MB', wiki:'圆与三角形综合' },
      { name:'函数综合·压轴模拟 10 套.pdf', icon:'file', source:'网络资料', time:'11-30 16:48', size:'4.4 MB', wiki:'中考压轴 · 函数综合' },
      { name:'动点问题与变化规律·专题练习.docx', icon:'file-text', source:'张老师', time:'11-26 16:33', size:'760 KB', wiki:'动点问题与变化规律' },
      { name:'一模二模试卷讲评模板.docx', icon:'file-text', source:'张老师', time:'11-18 09:40', size:'420 KB', wiki:'中考压轴 · 函数综合' },
      { name:'新定义题型训练.pdf', icon:'file', source:'网络资料', time:'11-10 08:20', size:'1.9 MB', wiki:null },
      { name:'命题趋势·近 5 年中考分析.docx', icon:'file-text', source:'张老师', time:'10-30 14:20', size:'520 KB', wiki:null },
      { name:'中考考纲·2026 版.pdf', icon:'file', source:'官方文件', time:'09-15 10:30', size:'2.4 MB', wiki:null },
    ],
    notes: [
      { name:'分层练习设计法·学习笔记.docx', icon:'file-text', source:'张老师', time:'11-29 21:50', size:'140 KB', wiki:'分层练习设计法' },
      { name:'错题归因·四类错误分类法.docx', icon:'file-text', source:'张老师', time:'11-23 19:08', size:'180 KB', wiki:'错题归因模板' },
      { name:'飞象使用指南.pdf', icon:'file', source:'飞象官方', time:'你加入飞象时', size:'1.2 MB', wiki:null, isGuide:true },
    ],
    other: [
      { name:'课程标准·初中数学.pdf', icon:'file', source:'官方文件', time:'09-01 09:00', size:'1.8 MB', wiki:null },
      { name:'教学计划·本学期数学.docx', icon:'file-text', source:'张老师', time:'09-08 08:20', size:'180 KB', wiki:null },
      { name:'本学期教学反思·上半.docx', icon:'file-text', source:'张老师', time:'10-30 22:00', size:'320 KB', wiki:null },
      { name:'校历·2025-2026 学年.pdf', icon:'file', source:'学校', time:'08-25 11:00', size:'180 KB', wiki:null },
      { name:'安全教育材料.pdf', icon:'file', source:'学校', time:'08-30 14:00', size:'420 KB', wiki:null },
    ],
    __root__: [],
  },
  /* 每个文件夹关联的 wiki（演示给文件夹视图顶部 chips） */
  wikiByFolder: {
    prep: ['二次函数图像与性质', '相似三角形判定与应用', '圆与三角形综合', '函数图像变换'],
    teaching: ['二次函数图像与性质', '课堂提问 4 类问句'],
    assessment: ['作业与测评', '八(3)班数学薄弱点画像', '本学期作业完成质量趋势'],
    exam: ['中考压轴 · 函数综合', '动点问题与变化规律'],
    notes: ['分层练习设计法', '错题归因模板'],
    other:   [],
  },
};

/* 团队 KB · 初中数学教研组（演示完整管理能力 = 张老师在这是 admin） */
const TEAM_MATH_KB_DEFAULT = {
  folders: [
    { id:'mg-grade-7', parentId:null, name:'七年级', count:0 },
    { id:'mg-grade-8', parentId:null, name:'八年级', count:0 },
    { id:'mg-grade-9', parentId:null, name:'九年级', count:0 },
    { id:'mg-zhongkao', parentId:null, name:'中考专题', count:0 },
    { id:'mg-grade-9-quad', parentId:'mg-grade-9', name:'二次函数', count:0 },
    { id:'mg-grade-9-sim',  parentId:'mg-grade-9', name:'相似三角形', count:0 },
  ],
  files: {
    'mg-grade-9-quad': [
      { name:'二次函数·导入课件.pptx', icon:'presentation', source:'张老师', time:'5 天前', size:'4.2 MB', wiki:'二次函数图像与性质' },
      { name:'教学设计·二次函数.docx', icon:'file-text', source:'张老师', time:'5 天前', size:'340 KB', wiki:'二次函数图像与性质' },
      { name:'海淀区 2026 一模卷·数学.pdf', icon:'file', source:'李素芬', time:'1 周前', size:'1.2 MB', wiki:'二次函数图像与性质' },
      { name:'王建华·公开课板书（4 张）', icon:'image', source:'王建华', time:'2 周前', size:'3.6 MB', wiki:'二次函数图像与性质' },
      { name:'赵明杰·错题剖析.docx', icon:'file-text', source:'赵明杰', time:'2 周前', size:'220 KB', wiki:'二次函数图像与性质' },
      { name:'八(3)班·错题精选.xlsx', icon:'sheet', source:'张老师', time:'3 周前', size:'180 KB', wiki:'二次函数图像与性质' },
    ],
    'mg-grade-9-sim': [
      { name:'相似三角形 · 公开课设计.docx', icon:'file-text', source:'张老师', time:'昨天 16:08', size:'1.4 MB', wiki:'相似三角形判定与应用' },
      { name:'相似三角形 · 实际应用例题.pptx', icon:'presentation', source:'王建华', time:'1 周前', size:'5.6 MB', wiki:'相似三角形判定与应用' },
      { name:'相似三角形 · 错题精选.docx', icon:'file-text', source:'李素芬', time:'2 周前', size:'520 KB', wiki:'相似三角形判定与应用' },
    ],
    'mg-zhongkao': [
      { name:'函数综合·中考压轴专题.pptx', icon:'presentation', source:'张老师', time:'11-22', size:'9.8 MB', wiki:null },
      { name:'北京中考真题 2021-2025（5 份）', icon:'folder-archive', source:'学校公共库', time:'3 周前', size:'12 MB', wiki:null },
    ],
    __root__: [],
  },
  wikiByFolder: {},
};

/* 学校知识库 · 与 school-wiki.html 首页口径一致：年级 / 学科 / 专题结构 */
const TEAM_SCHOOL_DEFAULT = {
  folders: [
    { id:'sch-grade-7', parentId:null, name:'七年级', count:0 },
    { id:'sch-grade-8', parentId:null, name:'八年级', count:0 },
    { id:'sch-grade-9', parentId:null, name:'九年级', count:0 },
    { id:'sch-zhongkao', parentId:null, name:'中考专题', count:0 },
    { id:'sch-shared', parentId:null, name:'全校共建', count:0 },
    { id:'sch-grade-9-math', parentId:'sch-grade-9', name:'数学', count:0 },
    { id:'sch-grade-9-open', parentId:'sch-grade-9', name:'公开课 / 板书', count:0 },
    { id:'sch-quad', parentId:'sch-grade-9-math', name:'二次函数', count:0 },
    { id:'sch-quadratic-eq', parentId:'sch-grade-9-math', name:'一元二次方程', count:0 },
    { id:'sch-similar', parentId:'sch-grade-9-math', name:'相似三角形', count:0 },
    { id:'sch-circle', parentId:'sch-grade-9-math', name:'圆', count:0 },
    { id:'sch-trig', parentId:'sch-grade-9-math', name:'锐角三角函数', count:0 },
  ],
  files: {
    'sch-quad': [
      { name:'二次函数·导入课件.pptx', icon:'presentation', source:'张老师', time:'5 天前', size:'4.2 MB', wiki:'二次函数图像与性质' },
      { name:'二次函数公开课教案.docx', icon:'file-text', source:'王老师', time:'5 天前', size:'1.8 MB', wiki:'二次函数图像与性质' },
      { name:'海淀区 2026 一模卷·数学.pdf', icon:'file', source:'李素芬', time:'1 周前', size:'1.2 MB', wiki:'二次函数图像与性质' },
      { name:'王建华·公开课板书（4 张）', icon:'image', source:'王建华', time:'2 周前', size:'3.6 MB', wiki:'二次函数图像与性质' },
      { name:'赵明杰·错题剖析.docx', icon:'file-text', source:'赵明杰', time:'2 周前', size:'220 KB', wiki:'二次函数图像与性质' },
      { name:'八(3)班·错题精选.xlsx', icon:'sheet', source:'张老师', time:'3 周前', size:'180 KB', wiki:'二次函数图像与性质' },
      { name:'二次函数·配套习题汇编.pdf', icon:'file', source:'教研组', time:'3 周前', size:'2.9 MB', wiki:'二次函数图像与性质' },
      { name:'抛物线图像专题.pptx', icon:'presentation', source:'李素芬', time:'1 个月前', size:'3.1 MB', wiki:'二次函数图像与性质' },
    ],
    'sch-quadratic-eq': [
      { name:'一元二次方程·配方法教学设计.docx', icon:'file-text', source:'陈老师', time:'12-09', size:'860 KB', wiki:'一元二次方程根的判别式' },
      { name:'根的判别式分层练习.docx', icon:'file-text', source:'张老师', time:'12-07', size:'780 KB', wiki:'一元二次方程根的判别式' },
      { name:'一元二次方程单元测评.pdf', icon:'file', source:'九年级备课组', time:'12-02', size:'1.6 MB', wiki:'一元二次方程根的判别式' },
    ],
    'sch-similar': [
      { name:'相似三角形·公开课设计.docx', icon:'file-text', source:'张老师', time:'昨天 16:08', size:'1.4 MB', wiki:'相似三角形判定与应用' },
      { name:'相似三角形·实际应用例题.pptx', icon:'presentation', source:'王建华', time:'1 周前', size:'5.6 MB', wiki:'相似三角形判定与应用' },
      { name:'相似三角形·错题精选.docx', icon:'file-text', source:'李素芬', time:'2 周前', size:'520 KB', wiki:'相似三角形判定与应用' },
      { name:'相似三角形板书照片.jpg', icon:'image', source:'李老师', time:'2 周前', size:'2.1 MB', wiki:'相似三角形判定与应用' },
    ],
    'sch-circle': [
      { name:'圆的切线性质·教学动画.mp4', icon:'video', source:'王建华', time:'12-05', size:'34 MB', wiki:'圆与三角形综合' },
      { name:'圆·中考真题汇编 2020-2025.pdf', icon:'file', source:'教研组', time:'12-04', size:'5.6 MB', wiki:'圆与三角形综合' },
      { name:'圆的辅助线·常用套路.docx', icon:'file-text', source:'张老师', time:'11-18', size:'620 KB', wiki:'圆与三角形综合' },
    ],
    'sch-trig': [
      { name:'锐角三角函数·基础概念课件.pptx', icon:'presentation', source:'备课组', time:'11-26', size:'4.8 MB', wiki:'锐角三角函数' },
      { name:'解直角三角形·应用题精选.pdf', icon:'file', source:'李素芬', time:'11-20', size:'2.2 MB', wiki:'锐角三角函数' },
    ],
    'sch-grade-9-open': [
      { name:'王老师·公开课听课记录.docx', icon:'file-text', source:'张老师', time:'12-11', size:'160 KB', wiki:null },
      { name:'公开课课件优先选图像导入风格.md', icon:'file-text', source:'飞象自动沉淀', time:'4/15', size:'42 KB', wiki:'教研组共识' },
    ],
    'sch-zhongkao': [
      { name:'函数综合·中考压轴专题.pptx', icon:'presentation', source:'张老师', time:'11-22', size:'9.8 MB', wiki:'中考压轴·函数综合' },
      { name:'北京中考真题 2021-2025（5 份）', icon:'folder-archive', source:'学校公共库', time:'3 周前', size:'12 MB', wiki:'中考压轴·函数综合' },
      { name:'命题趋势·近 5 年中考分析.docx', icon:'file-text', source:'教研组', time:'10-30', size:'520 KB', wiki:'中考压轴·函数综合' },
    ],
    'sch-shared': [
      { name:'课程标准·初中数学.pdf', icon:'file', source:'学校', time:'09-01', size:'1.8 MB', wiki:null },
      { name:'安全教育材料.pdf', icon:'file', source:'学校', time:'08-30', size:'420 KB', wiki:null },
      { name:'教学计划·本学期数学.docx', icon:'file-text', source:'王教务', time:'09-08', size:'180 KB', wiki:null },
    ],
    __root__: [],
  },
  wikiByFolder: {
    'sch-quad': ['二次函数图像与性质'],
    'sch-quadratic-eq': ['一元二次方程根的判别式'],
    'sch-similar': ['相似三角形判定与应用'],
    'sch-circle': ['圆与三角形综合'],
    'sch-trig': ['锐角三角函数'],
    'sch-zhongkao': ['中考压轴·函数综合'],
  },
};
const TEAM_GRADE2_DEFAULT = {
  folders: [
    { id:'g2-prepare', parentId:null, name:'集体备课', count:0 },
  ],
  files: {
    'g2-prepare': [
      { name:'初二数学·上学期教学计划.docx', icon:'file-text', source:'李素芬', time:'09-05', size:'180 KB', wiki:null },
      { name:'勾股定理·章末复习课件.pptx', icon:'presentation', source:'王建华', time:'11-12', size:'7.4 MB', wiki:null },
    ],
    __root__: [],
  },
  wikiByFolder: {},
};
const TEAM_GRADE3_DEFAULT = {
  folders: [
    { id:'g3-mock', parentId:null, name:'一模二模卷', count:0 },
  ],
  files: {
    'g3-mock': [
      { name:'海淀 2026 一模卷·数学.pdf', icon:'file', source:'李素芬', time:'1 周前', size:'1.2 MB', wiki:null },
      { name:'西城 2026 一模卷·数学.pdf', icon:'file', source:'王建华', time:'2 周前', size:'1.4 MB', wiki:null },
    ],
    __root__: [],
  },
  wikiByFolder: {},
};

/* KB → 数据 默认表（注：personal 单独有 localStorage 持久化，其它 KB 只在内存里改） */
const KB_FOLDER_DEFAULT = {
  'personal': PERSONAL_KB_DEFAULT,
  'math-group': TEAM_MATH_KB_DEFAULT,
  'school': TEAM_SCHOOL_DEFAULT,
  'grade-2': TEAM_GRADE2_DEFAULT,
  'grade-3': TEAM_GRADE3_DEFAULT,
};

/* 运行态 */
const KB_FOLDER_STATE = {};
const KB_CURRENT_FOLDER = {};

function clonePersonalKbData(src){
  return JSON.parse(JSON.stringify(src));
}

function ensureKbFolderState(scope){
  if(KB_FOLDER_STATE[scope]) return;
  const seed = KB_FOLDER_DEFAULT[scope] || PERSONAL_KB_DEFAULT;
  KB_FOLDER_STATE[scope] = clonePersonalKbData(seed);
  /* 散文件桶兜底 */
  if(!Array.isArray(KB_FOLDER_STATE[scope].files[ROOT_FOLDER_ID])){
    KB_FOLDER_STATE[scope].files[ROOT_FOLDER_ID] = [];
  }
  /* 个人 KB 从 localStorage 恢复 */
  if(scope === 'personal'){
    loadPersonalKbState();
  }
  /* 兜底：count 用 file 数同步一遍 */
  KB_FOLDER_STATE[scope].folders.forEach(f => {
    f.count = (KB_FOLDER_STATE[scope].files[f.id] || []).length;
  });
}

function setCurrentKbScope(scope){
  ensureKbFolderState(scope);
  CURRENT_KB_SCOPE = scope;
}
window.setCurrentKbScope = setCurrentKbScope;

let CURRENT_KB_SCOPE = 'personal';
ensureKbFolderState('personal');
let _folderManageMode = false;
const _folderSelection = {};

/* 当前数据。所有 helper / 渲染都用这个，跟当前 scope 联动 */
function kbData(){
  ensureKbFolderState(CURRENT_KB_SCOPE);
  return KB_FOLDER_STATE[CURRENT_KB_SCOPE];
}

/* 别名：保留旧名，让现有函数不用改 */
Object.defineProperty(window, 'PERSONAL_KB_DATA', {
  get(){ return kbData(); },
  configurable: true,
});

function loadPersonalKbState(){
  try{
    const raw = localStorage.getItem(PERSONAL_KB_STORAGE_KEY);
    if(!raw) return;
    const parsed = JSON.parse(raw);
    if(!parsed || typeof parsed !== 'object') return;
    const target = KB_FOLDER_STATE['personal'];
    if(!target) return;
    if(Array.isArray(parsed.folders)){
      target.folders = parsed.folders.map(f => ({
        ...f,
        parentId: (f && 'parentId' in f) ? (f.parentId ?? null) : null,
      }));
    }
    if(parsed.files && typeof parsed.files === 'object') target.files = parsed.files;
    if(parsed.wikiByFolder && typeof parsed.wikiByFolder === 'object') target.wikiByFolder = parsed.wikiByFolder;
    if(!Array.isArray(target.files[ROOT_FOLDER_ID])){
      target.files[ROOT_FOLDER_ID] = [];
    }
  }catch(error){
    /* 解析失败保持默认值 */
  }
}

function savePersonalKbState(){
  /* 只有 personal scope 持久化（其它 KB demo 不落盘） */
  if(CURRENT_KB_SCOPE !== 'personal') return;
  try{
    const target = KB_FOLDER_STATE['personal'];
    localStorage.setItem(PERSONAL_KB_STORAGE_KEY, JSON.stringify({
      folders: target.folders,
      files: target.files,
      wikiByFolder: target.wikiByFolder,
    }));
  }catch(error){
    /* 忽略 */
  }
}

/* 重新计算每个文件夹真实文件数（CRUD 后保持 hero 数字一致） */
function recountPersonalFolders(){
  const childMap = new Map();
  PERSONAL_KB_DATA.folders.forEach(folder => {
    const parentKey = folder.parentId ?? ROOT_FOLDER_ID;
    if(!childMap.has(parentKey)) childMap.set(parentKey, []);
    childMap.get(parentKey).push(folder.id);
  });
  const countFilesDeep = (folderId) => {
    const own = (PERSONAL_KB_DATA.files[folderId] || []).length;
    const children = childMap.get(folderId) || [];
    return children.reduce((sum, childId) => sum + countFilesDeep(childId), own);
  };
  PERSONAL_KB_DATA.folders.forEach(folder => {
    folder.count = countFilesDeep(folder.id);
  });
}

function getPersonalTotalCount(){
  const inFolders = PERSONAL_KB_DATA.folders.reduce((sum, f) => sum + (PERSONAL_KB_DATA.files[f.id]?.length || 0), 0);
  const inRoot = (PERSONAL_KB_DATA.files[ROOT_FOLDER_ID] || []).length;
  return inFolders + inRoot;
}

/* 文件类型 icon 映射（lucide name） */
const FILE_ICON_MAP = {
  'file-text':'file-text', 'file':'file', 'presentation':'presentation',
  'sheet':'sheet', 'video':'video', 'image':'image',
};

/* 每个 KB scope 各自记一个"当前所在文件夹"。null = 根，string = 已进入。
   切换 KB（switchKb）时不会清，老师切回来还在原来那层。
   说明：现有大量函数都直接读写 _personalCurrentFolder。我们用 Object.defineProperty
   把它代理到 KB_CURRENT_FOLDER[scope]，这样老逻辑不用改一行。注意必须先 delete，
   防止变量已经在全局挂过。 */
try { delete window._personalCurrentFolder; } catch(_){}
Object.defineProperty(window, '_personalCurrentFolder', {
  get(){ return KB_CURRENT_FOLDER[CURRENT_KB_SCOPE] ?? null; },
  set(v){ KB_CURRENT_FOLDER[CURRENT_KB_SCOPE] = v ?? null; },
  configurable: true,
});

/* 渲染左侧文件夹树 */
function renderPersonalFolderTree(){
  const tree = document.getElementById('personal-folder-tree');
  if(!tree) return;
  tree.innerHTML = PERSONAL_KB_DATA.folders.map(f => `
    <li class="${f.id === _personalCurrentFolder ? 'active' : ''}">
      <div class="fv-tree-item" data-level="1" onclick="personalOpenFolder('${f.id}')">
        <i data-lucide="circle" class="ti-caret hide"></i>
        <i data-lucide="folder" class="ti-icon"></i>
        <span class="ti-name">${f.name}</span>
        <span class="ti-count">${f.count}</span>
      </div>
    </li>
  `).join('');
  if(window.lucide) lucide.createIcons();
}

/* 渲染右侧文件列表（按当前文件夹） */
function renderPersonalFiles(folderId){
  const folder = PERSONAL_KB_DATA.folders.find(f => f.id === folderId);
  if(!folder) return;

  /* 面包屑当前 */
  const cur = document.getElementById('personal-current-folder');
  const meta = document.getElementById('personal-current-meta');
  if(cur)  cur.textContent  = folder.name;
  if(meta) meta.textContent = `${folder.count} 份资料`;

  /* 关联 Wiki chips */
  const wikiList = PERSONAL_KB_DATA.wikiByFolder[folderId] || [];
  const chipsCountEl = document.getElementById('personal-wiki-chip-count');
  const chipsListEl  = document.getElementById('personal-wiki-chips-list');
  const chipsContainer = document.getElementById('personal-wiki-chips');
  if(chipsContainer) chipsContainer.style.display = wikiList.length ? '' : 'none';
  if(chipsCountEl) chipsCountEl.textContent = `${wikiList.length} 个 Wiki`;
  if(chipsListEl){
    chipsListEl.innerHTML = wikiList.map(name => `
      <a class="fwc-chip" onclick="openWiki('${name}')">
        <i data-lucide="book-open"></i>
        <span>${name}</span>
      </a>
    `).join('');
  }

  /* 文件列表 */
  const files = PERSONAL_KB_DATA.files[folderId] || [];
  const tbody = document.getElementById('personal-file-tbody');
  if(!tbody) return;
  const rows = files.map((f, i) => {
    const wikiCell = f.wiki
      ? `<a class="wlink" onclick="event.stopPropagation();openWiki('${f.wiki}')">${f.wiki}</a>`
      : `<span class="fv-no-wiki">—</span>`;
    return `
      <tr onclick="showToast('（演示）预览《${f.name}》')">
        <td class="col-name">
          <i data-lucide="${FILE_ICON_MAP[f.icon] || 'file'}"></i>
          ${f.name}
          ${f.isGuide ? '<span class="fv-tag-guide">官方</span>' : ''}
        </td>
        <td>${f.source}</td>
        <td>${f.time}</td>
        <td>${f.size}</td>
        <td>${wikiCell}</td>
      </tr>
    `;
  }).join('');

  const moreCount = folder.count - files.length;
  const moreRow = moreCount > 0 ? `
    <tr class="more" onclick="showToast('（演示）展开剩余 ${moreCount} 份资料')">
      <td class="col-name" colspan="5"><i data-lucide="more-horizontal"></i> …还有 ${moreCount} 份资料</td>
    </tr>
  ` : '';

  tbody.innerHTML = rows + moreRow;

  /* 同步左侧 tree 的 active 状态 */
  document.querySelectorAll('#personal-folder-tree li').forEach(li => {
    const item = li.querySelector('.fv-tree-item');
    const name = item && item.querySelector('.ti-name');
    li.classList.toggle('active', name && name.textContent.trim() === folder.name);
  });

  if(window.lucide) lucide.createIcons();
}

function personalOpenFolder(folderId){
  _personalCurrentFolder = folderId;
  renderPersonalFiles(folderId);
}

/* 一键清空所有演示数据（个人 KB 主页）
   · 淡出 Wiki 视图的 demo-zone（米色 callout 容器）
   · 清空文件夹视图的所有文件
   · Hero 数字归零 + 文案换成"已清空" */
function clearDemoData(){
  if(!confirmDemo('这会清空所有演示数据（41 份资料 + 16 个主题），仅在本次演示中生效。继续吗？')) return;

  PERSONAL_KB_DATA.folders.forEach(f => { f.count = 0; });
  Object.keys(PERSONAL_KB_DATA.files).forEach(k => { PERSONAL_KB_DATA.files[k] = []; });
  savePersonalKbState();
  renderPersonalFolderTree();
  renderPersonalFiles(_personalCurrentFolder);
  renderPersonalFolderView();
  syncPersonalHeroCounts();

  const demoZone = document.getElementById('demo-zone');
  if(demoZone){
    demoZone.style.opacity = '0';
    demoZone.style.transform = 'translateY(-6px)';
    setTimeout(() => demoZone.remove(), 420);
  }

  const heroSub = document.getElementById('hero-sub');
  if(heroSub) heroSub.innerHTML = '你的私人 AI 工作台。<b>演示数据已清空</b>，上传几份资料试试，AI 会帮你自动整理 Wiki。';
  const heroCount = document.getElementById('hero-count');
  if(heroCount) heroCount.textContent = '0';

  showToast('已清空演示数据');
}

/* 极简版 confirm（demo 用，不写自定义 modal） */
function confirmDemo(msg){
  return window.confirm(msg);
}

/* ══════════════════════════════════════════════
   个人 KB · 文件夹视图（list 风格）+ 文件夹/文件 CRUD
   · 渲染容器：#view-folder
   · 入口：v28-shell.js 在 personal-home 时也提供 view-switcher
   · 数据：上面的 PERSONAL_KB_DATA + savePersonalKbState
   ══════════════════════════════════════════════ */

function escHtml(value){
  return String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;',
  }[ch]));
}

function getPersonalFolder(id){
  return PERSONAL_KB_DATA.folders.find(f => f.id === id) || null;
}

function getPersonalFiles(id){
  /* id === null 表示根目录散文件 */
  const key = (id == null) ? ROOT_FOLDER_ID : id;
  return PERSONAL_KB_DATA.files[key] || [];
}

/* 当前层（parentId = currentId）的子文件夹 */
function getPersonalChildFolders(currentId){
  const target = currentId ?? null;
  return PERSONAL_KB_DATA.folders.filter(f => (f.parentId ?? null) === target);
}

/* 面包屑：从根到当前，自上而下 */
function getPersonalBreadcrumb(currentId){
  const trail = [];
  let cursor = currentId;
  let safety = 100;
  while(cursor && safety-- > 0){
    const folder = getPersonalFolder(cursor);
    if(!folder) break;
    trail.unshift(folder);
    cursor = folder.parentId ?? null;
  }
  return trail;
}

/* 收集某文件夹的所有子孙（含自己，便于递归删除/移动校验） */
function collectPersonalDescendants(folderId){
  const out = [folderId];
  const queue = [folderId];
  while(queue.length){
    const id = queue.shift();
    PERSONAL_KB_DATA.folders.forEach(f => {
      if((f.parentId ?? null) === id){
        out.push(f.id);
        queue.push(f.id);
      }
    });
  }
  return out;
}

function buildPersonalFolderId(name){
  const safe = String(name || '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9一-龥-]/g, '')
    .slice(0, 16) || 'folder';
  let id = `f-${safe}`;
  let i = 2;
  while(getPersonalFolder(id)){
    id = `f-${safe}-${i}`;
    i += 1;
  }
  return id;
}

function syncPersonalHeroCounts(){
  const heroCount = document.getElementById('hero-count');
  if(heroCount){
    heroCount.textContent = String(getPersonalTotalCount());
  }
  const heroMeta = document.getElementById('hero-meta-counts');
  if(heroMeta){
    const folderCount = PERSONAL_KB_DATA.folders.length;
    heroMeta.innerHTML = `
      <span class="item"><b>${getPersonalTotalCount()}</b> 份演示资料</span>
      <span class="sep">·</span>
      <span class="item"><b>16</b> 个主题</span>
      <span class="sep">·</span>
      <span class="item"><b>${folderCount}</b> 个文件夹</span>
      <span class="sep">·</span>
      <span class="item">上次更新 <b>今天 10:42</b></span>
    `;
  }
}

/* ────── 文件夹顶部 Wiki chips ────── */
const PERSONAL_CHIPS_VISIBLE_LIMIT = 5;
const PERSONAL_CHIPS_DISMISS_KEY = 'v28_personal_chips_dismissed';
/* 当前文件夹"展开全部"的运行时状态（不持久化，切走文件夹自动收起） */
let _personalChipsExpanded = {};

function aggregateWikisFromFiles(files){
  const counts = new Map();
  (files || []).forEach(file => {
    const w = file && file.wiki;
    if(!w) return;
    counts.set(w, (counts.get(w) || 0) + 1);
  });
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name, count]) => ({ name, count }));
}

function loadChipsDismissed(){
  try{
    const raw = localStorage.getItem(PERSONAL_CHIPS_DISMISS_KEY);
    if(!raw) return {};
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === 'object') ? parsed : {};
  }catch(error){
    return {};
  }
}

function saveChipsDismissed(state){
  try{
    localStorage.setItem(PERSONAL_CHIPS_DISMISS_KEY, JSON.stringify(state));
  }catch(error){
    /* 忽略 */
  }
}

function isChipsDismissedForFolder(folderId, currentWikiCount){
  if(!folderId) return false;
  const state = loadChipsDismissed();
  const entry = state[folderId];
  if(!entry || typeof entry !== 'object') return false;
  /* 若关闭后又新增了 wiki，则复活 */
  return currentWikiCount <= (entry.atWikiCount || 0);
}

function dismissChipsForCurrentFolder(){
  const folderId = _personalCurrentFolder;
  if(!folderId) return;
  const wikis = aggregateWikisFromFiles(getPersonalFiles(folderId));
  const state = loadChipsDismissed();
  state[folderId] = { atWikiCount: wikis.length };
  saveChipsDismissed(state);
  delete _personalChipsExpanded[folderId];
  renderPersonalFolderView();
}
window.dismissChipsForCurrentFolder = dismissChipsForCurrentFolder;

function expandChipsForCurrentFolder(){
  const folderId = _personalCurrentFolder;
  if(!folderId) return;
  _personalChipsExpanded[folderId] = true;
  renderPersonalFolderView();
}
window.expandChipsForCurrentFolder = expandChipsForCurrentFolder;

function renderWikiChipsRow(folder, wikis){
  if(!folder || !wikis || !wikis.length) return '';
  if(isChipsDismissedForFolder(folder.id, wikis.length)) return '';

  const expanded = !!_personalChipsExpanded[folder.id];
  const visible = expanded ? wikis : wikis.slice(0, PERSONAL_CHIPS_VISIBLE_LIMIT);
  const hiddenCount = wikis.length - visible.length;

  const chips = visible.map(item => `
    <a class="fwc-chip" onclick="openWiki('${escHtml(item.name)}')">
      <i data-lucide="book-open"></i>
      <span>${escHtml(item.name)}</span>
    </a>
  `).join('');

  const moreBtn = hiddenCount > 0 ? `
    <button class="fwc-more" onclick="expandChipsForCurrentFolder()">
      +${hiddenCount} 更多
    </button>
  ` : '';

  return `
    <div class="fv-wiki-chips">
      <div class="fwc-label">
        <i data-lucide="sparkles"></i>
        <span>这个文件夹的资料被整理成 <b>${wikis.length} 个 Wiki</b></span>
      </div>
      <div class="fwc-chips">
        ${chips}
        ${moreBtn}
      </div>
      <button class="fwc-dismiss" title="不再提示（这个文件夹）" onclick="dismissChipsForCurrentFolder()">
        <i data-lucide="x"></i>
      </button>
    </div>
  `;
}

/* ────── 文件夹视图渲染（嵌套 / Finder 模式）──────
   · _personalCurrentFolder = null  → 根目录
   · _personalCurrentFolder = id    → 已进入某个文件夹（可任意层级）
   · 当前层始终展示：同 parentId 的子文件夹（排前）+ 当前层级的文件（排后）
   · 切到 Wiki 视图再切回，仍保留完整路径
*/
function getCurrentTeamKbName(){
  /* 从顶栏当前 KB 名拿（v28-shell.js 渲染好的） */
  const tb = document.getElementById('tb-kb-name');
  if(tb && tb.textContent.trim()) return tb.textContent.trim();
  /* 兜底：侧栏 active 项 */
  const active = document.querySelector('.sb-kb.active .kb-name');
  return active ? active.textContent.trim() : '';
}

function renderPersonalFolderView(){
  const root = document.getElementById('view-folder');
  if(!root) return;
  const pageId = document.body.dataset.page;
  /* 校园版：个人页和学校页都在本页三视图切换；词条页仍兼容 ?view=folder */
  if(pageId !== 'personal-home' && pageId !== 'wiki-home' && pageId !== 'wiki-entry') return;

  /* 团队 KB 文件夹视图只在 view=folder 时活跃 */
  if(pageId === 'wiki-entry'){
    const view = new URLSearchParams(location.search).get('view');
    if(view !== 'folder') return;
  }

  /* 当前 scope 的 admin 状态决定写操作显隐 */
  const canWrite = (typeof window.isKbAdmin === 'function')
    ? window.isKbAdmin(CURRENT_KB_SCOPE)
    : true;
  /* 根 KB 名（面包屑首段） */
  const rootName = CURRENT_KB_SCOPE === 'personal'
    ? '我的知识库'
    : CURRENT_KB_SCOPE === 'school'
      ? '学校知识库'
    : (getCurrentTeamKbName() || '团队知识库');
  const folderRootName = rootName.replace('知识库', '文件夹');
  const rootIcon = CURRENT_KB_SCOPE === 'personal' ? 'bookmark' : 'library';

  recountPersonalFolders();

  /* 兜底：进入的文件夹被删了（或它的祖先被删了）→ 回根目录 */
  if(_personalCurrentFolder && !getPersonalFolder(_personalCurrentFolder)){
    _personalCurrentFolder = null;
  }

  const currentId = _personalCurrentFolder; // null 表示根
  const inFolder = currentId != null;
  const currentFolder = inFolder ? getPersonalFolder(currentId) : null;
  const selectionKey = getFolderSelectionKey(currentId);
  const selection = ensureFolderSelection(selectionKey);

  /* 当前层的子文件夹（按名称） */
  const childFolders = getPersonalChildFolders(currentId)
    .slice();

  /* 当前层的文件（根目录散文件 / 子文件夹直接文件） */
  const currentFiles = getPersonalFiles(currentId);

  const manageColumnHead = _folderManageMode ? '<th class="col-select"></th>' : '';
  const selectedCount = selection.folders.size + selection.files.size;
  const selectableCount = childFolders.length + currentFiles.length;
  const allSelected = selectableCount > 0 && selectedCount === selectableCount;

  const folderRows = childFolders.map(folder => `
    <tr class="fv-row-folder"
        data-folder-id="${escHtml(folder.id)}"
        onclick="${_folderManageMode ? `toggleFolderSelection('folder','${escHtml(folder.id)}')` : `personalEnterFolder('${escHtml(folder.id)}')`}"
        ondblclick="personalEnterFolder('${escHtml(folder.id)}')"
        title="进入「${escHtml(folder.name)}」">
      ${_folderManageMode ? `
      <td class="col-select" onclick="event.stopPropagation()">
        <input type="checkbox" class="fv-check" ${selection.folders.has(folder.id) ? 'checked' : ''}
               onchange="toggleFolderSelection('folder','${escHtml(folder.id)}')" aria-label="选择文件夹 ${escHtml(folder.name)}">
      </td>` : ''}
      <td class="col-name">
        <div class="col-name-inner">
          <i data-lucide="folder"></i>
          <span class="fv-folder-name">${escHtml(folder.name)}</span>
        </div>
      </td>
      <td class="col-by">—</td>
      <td class="col-time">—</td>
      <td class="col-size">—</td>
      <td class="col-actions">
        ${canWrite && !_folderManageMode ? `
        <button class="fv-row-action" title="管理文件夹"
                onclick="event.stopPropagation();openFolderRowMenu(event,'${escHtml(folder.id)}')">
          <i data-lucide="ellipsis"></i>
        </button>` : ''}
      </td>
    </tr>
  `).join('');

  const fileRows = currentFiles.map((file, index) => `
    <tr data-file-index="${index}"
        onclick="${_folderManageMode ? `toggleFolderSelection('file','${index}')` : `openFolderFilePreview(${index})`}"
        title="查看文件预览与 AI 解读">
      ${_folderManageMode ? `
      <td class="col-select" onclick="event.stopPropagation()">
        <input type="checkbox" class="fv-check" ${selection.files.has(index) ? 'checked' : ''}
               onchange="toggleFolderSelection('file','${index}')" aria-label="选择文件 ${escHtml(file.name)}">
      </td>` : ''}
      <td class="col-name">
        <div class="col-name-inner">
          <i data-lucide="${escHtml(FILE_ICON_MAP[file.icon] || 'file')}"></i>
          <span class="fv-file-name">${escHtml(file.name)}</span>
          ${file.isGuide ? '<span class="fv-tag-guide">官方</span>' : ''}
        </div>
      </td>
      <td class="col-by">${escHtml(file.source || '')}</td>
      <td class="col-time">${escHtml(file.time || '')}</td>
      <td class="col-size">${escHtml(file.size || '')}</td>
      <td class="col-actions">
        ${canWrite && !_folderManageMode ? `
        <button class="fv-row-action" title="管理文件"
                onclick="event.stopPropagation();openFileRowMenu(event,${index})">
          <i data-lucide="ellipsis"></i>
        </button>` : ''}
      </td>
    </tr>
  `).join('');

  /* 完全空的层级（既无子文件夹也无文件） */
  const emptyText = canWrite
    ? (inFolder
        ? '这个文件夹还是空的 · 可新建子文件夹整理资料'
        : '还没有任何内容 · 可新建文件夹整理资料')
    : (inFolder
        ? '这个文件夹还是空的'
        : '这个知识库还没有内容');
  const emptyHint = (!childFolders.length && !currentFiles.length) ? `
    <tr class="more">
      <td class="col-name" colspan="${_folderManageMode ? 6 : 5}">
        <div class="col-name-inner" style="justify-content:center">
          <i data-lucide="${inFolder ? 'inbox' : 'folder-plus'}"></i>
          <span>${emptyText}</span>
        </div>
      </td>
    </tr>
  ` : '';

  /* chips：仅在子文件夹层、且当前层文件聚合出 ≥1 个 Wiki 时显示 */
  const wikiList = inFolder ? aggregateWikisFromFiles(currentFiles) : [];
  const wikiChips = inFolder ? renderWikiChipsRow(currentFolder, wikiList) : '';

  /* 面包屑：根目录单层；子层级沿 parentId 回溯 */
  const trail = inFolder ? getPersonalBreadcrumb(currentId) : [];
  if(app?.dataset.view === 'folder'){
    renderKnowledgeHeaderFolder(rootName, rootIcon, trail);
  }
  const breadcrumbInner = inFolder ? `
    <a class="fv-bc-item" onclick="personalBackToRoot()" title="返回根目录">
      ${escHtml(folderRootName)}
    </a>
    ${trail.map((folder, idx) => {
      const isLast = idx === trail.length - 1;
      return `
        <span class="fv-bc-sep"><i data-lucide="chevron-right"></i></span>
        ${isLast
          ? `<span class="fv-bc-current">${escHtml(folder.name)}</span>`
          : `<a class="fv-bc-item" onclick="personalEnterFolder('${escHtml(folder.id)}')" title="跳到「${escHtml(folder.name)}」">${escHtml(folder.name)}</a>`}
      `;
    }).join('')}
  ` : `
    <span class="fv-bc-current fv-bc-root">${escHtml(folderRootName)}</span>
  `;

  /* 返回按钮：仅子层级显示，回到上一级（不是直接回根） */
  const parentId = inFolder ? (currentFolder?.parentId ?? null) : null;
  const backBtn = inFolder ? `
    <button class="fv-back-btn" onclick="personalEnterFolderId(${parentId === null ? 'null' : `'${escHtml(parentId)}'`})" title="返回上一级">
      <i data-lucide="arrow-left"></i>
    </button>
  ` : '';

  /* 工具按钮：admin 显示上传、管理和新建 */
  const tools = canWrite ? (
    _folderManageMode ? `
      <button class="fv-tool" onclick="toggleSelectAllInFolder(${allSelected ? 'false' : 'true'})" ${selectableCount ? '' : 'disabled'}>
        <i data-lucide="${allSelected ? 'square' : 'check-square'}"></i> ${allSelected ? '取消全选' : '全选'}
      </button>
      <button class="fv-tool" onclick="openBatchMovePop(event)" ${selectedCount ? '' : 'disabled'}>
        <i data-lucide="folder-input"></i> 移动到…
      </button>
      <button class="fv-tool danger" onclick="deleteSelectedFolderItems()" ${selectedCount ? '' : 'disabled'}>
        <i data-lucide="trash-2"></i> 删除
      </button>
      <button class="fv-tool" onclick="setFolderManageMode(false)">
        <i data-lucide="x"></i> 完成
      </button>
    ` : `
      <button class="fv-tool" onclick="setFolderManageMode(true)">
        <i data-lucide="list-checks"></i> 管理
      </button>
      <button class="fv-tool" onclick="openCreateFolderPop(event)">
        <i data-lucide="folder-plus"></i> 新建文件夹
      </button>
      <button class="fv-tool primary" onclick="openKbUploadModal()">
        <i data-lucide="upload"></i> 上传文件
      </button>
      ${inFolder ? `
        <button class="fv-tool" onclick="showToast('（演示）按上传时间 / 名称 / 大小排序')">
          <i data-lucide="arrow-up-down"></i> 排序
        </button>
      ` : ''}
    `
  ) : (inFolder ? `
    <button class="fv-tool" onclick="showToast('（演示）按上传时间 / 名称 / 大小排序')">
      <i data-lucide="arrow-up-down"></i> 排序
    </button>
  ` : '');
  const manageBar = _folderManageMode ? `
    <div class="fv-manage-bar">
      <span>${selectedCount ? `已选择 ${selectedCount} 项` : '选择文件夹或文件后可批量移动、删除'}</span>
    </div>
  ` : '';
  renderFolderHeaderActions({ canWrite, inFolder, selectedCount, selectableCount, allSelected });

  root.innerHTML = `
    <div class="fv-list personal-folder-view">
      <div class="fv-list-head ${inFolder ? 'is-nested' : 'is-root'}">
        ${backBtn}
        <nav class="fv-breadcrumb" aria-label="路径">
          ${breadcrumbInner}
        </nav>
        <div class="fv-tools">
          ${tools}
        </div>
      </div>

      ${manageBar}
      ${wikiChips}

      <table class="fv-table" id="personal-fv-table">
        <thead>
          <tr>
            ${manageColumnHead}
            <th class="col-name">文件名</th>
            <th class="col-by">上传者</th>
            <th class="col-time">更新时间</th>
            <th class="col-size">大小</th>
            <th class="col-actions">操作</th>
          </tr>
        </thead>
        <tbody>
          ${folderRows}
          ${fileRows}
          ${emptyHint}
        </tbody>
      </table>
    </div>
  `;

  if(window.lucide) lucide.createIcons();
}

function personalEnterFolder(id){
  if(!getPersonalFolder(id)) return;
  _folderManageMode = false;
  _personalCurrentFolder = id;
  renderPersonalFolderView();
}

/* null = 跳到根；id = 跳到该文件夹（用于返回上级 / 面包屑跨层） */
function personalEnterFolderId(id){
  if(id == null){
    _personalCurrentFolder = null;
  } else {
    if(!getPersonalFolder(id)) return;
    _folderManageMode = false;
    _personalCurrentFolder = id;
  }
  renderPersonalFolderView();
}

function personalBackToRoot(){
  _folderManageMode = false;
  _personalCurrentFolder = null;
  renderPersonalFolderView();
}

const KB_UPLOAD_MAX_FILE_SIZE = 100 * 1024 * 1024;
const KB_UPLOAD_ALLOWED_EXTS = new Set(['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png']);
const KB_AUTO_RECORD_EXTS = new Set(['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png']);
const KB_UPLOAD_DEMO_FILES = [
  { name:'一年级', ext:'docx', size:26700, path:'编辑题目/一年级.docx' },
  { name:'二年级', ext:'pptx', size:13000, path:'编辑题目/二年级.pptx' },
  { name:'二年级', ext:'docx', size:13000, path:'编辑题目/二年级.docx' },
  { name:'二年级', ext:'docx', size:13000, path:'编辑题目/二年级-复习.docx' },
  { name:'单元录音', ext:'mp3', size:8000, path:'编辑题目/单元录音.mp3' },
  { name:'课堂视频', ext:'mp4', size:18000, path:'编辑题目/课堂视频.mp4' },
  { name:'资料压缩包', ext:'zip', size:42000, path:'编辑题目/资料压缩包.zip' },
  { name:'整册资料包', ext:'pptx', size:128 * 1024 * 1024, path:'编辑题目/整册资料包.pptx' },
  { name:'一年级', ext:'docx', size:26700, path:'编辑题目/一年级-补充.docx' },
  { name:'二年级', ext:'pptx', size:13000, path:'编辑题目/二年级-拓展.pptx' },
];
const KB_UPLOAD_FIXED_UNSUPPORTED_FILES = [
  { name:'单元录音', ext:'mp3', size:8000, path:'编辑题目/单元录音.mp3', reason:'格式不支持' },
  { name:'课堂视频', ext:'mp4', size:18000, path:'编辑题目/课堂视频.mp4', reason:'格式不支持' },
  { name:'资料压缩包', ext:'zip', size:42000, path:'编辑题目/资料压缩包.zip', reason:'格式不支持' },
  { name:'整册资料包', ext:'pptx', size:128 * 1024 * 1024, path:'编辑题目/整册资料包.pptx', reason:'超过 100M' },
];
let _kbUploadState = null;
let _kbUploadTimer = null;
let _kbUploadHasSelection = false;
let _kbUploadAutoRecord = false;

function getUploadFileExt(name){
  const parts = String(name || '').split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

function getUploadFileIcon(ext, isFolder){
  if(isFolder) return 'folder';
  if(['ppt', 'pptx'].includes(ext)) return 'presentation';
  if(['xls', 'xlsx'].includes(ext)) return 'file-spreadsheet';
  if(['jpg', 'jpeg', 'png'].includes(ext)) return 'image';
  if(ext === 'pdf') return 'file-text';
  return 'file';
}

function getKbFileExt(file){
  const byName = getUploadFileExt(file?.name || '');
  if(byName) return byName;
  const icon = String(file?.icon || '').toLowerCase();
  if(icon === 'presentation') return 'pptx';
  if(icon === 'file-text') return 'docx';
  if(icon === 'image') return 'jpg';
  if(icon === 'sheet') return 'xlsx';
  if(icon === 'video') return 'mp4';
  if(icon === 'folder-archive') return 'folder';
  return 'pdf';
}

function getKbFileQbankState(file){
  const ext = getKbFileExt(file);
  const name = String(file?.name || '');
  if(!KB_AUTO_RECORD_EXTS.has(ext)) return 'unsupported';
  if(ext === 'jpg' || ext === 'jpeg' || ext === 'png'){
    if(/[（(]\s*\d+\s*张/.test(name)) return 'unsupported';
  }
  if(name.includes('配套习题汇编') || name.includes('期中数学卷')) return 'done';
  if(name.includes('一模卷') || name.includes('周测卷')) return 'processing';
  if(name.includes('板书')) return 'failed';
  return 'none';
}

function openFolderFilePreview(fileIndex){
  const file = getPersonalFiles(_personalCurrentFolder ?? null)[fileIndex];
  if(!file) return;
  const ext = getKbFileExt(file);
  const params = new URLSearchParams({
    file: file.name || '知识库资料',
    type: ext,
    source: file.source || '',
    time: file.time || '',
    size: file.size || '',
    scope: CURRENT_KB_SCOPE || 'school',
    qbank: getKbFileQbankState(file),
  });
  if(file.wiki) params.set('wiki', file.wiki);
  window.location.href = `file-preview.html?${params.toString()}`;
}

function formatUploadSize(bytes){
  const value = Number(bytes || 0);
  if(value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(value >= 10 * 1024 * 1024 ? 0 : 1)}MB`;
  if(value >= 1024) return `${(value / 1024).toFixed(value >= 10 * 1024 ? 0 : 1)} kB`;
  return value ? `${value} B` : '-';
}

function getUnsupportedReason(file){
  if(!KB_UPLOAD_ALLOWED_EXTS.has(file.ext)) return '格式不支持';
  if((file.size || 0) > KB_UPLOAD_MAX_FILE_SIZE) return '超过 100M';
  return '';
}

function getVisibleUnsupportedFiles(){
  return KB_UPLOAD_FIXED_UNSUPPORTED_FILES;
}

function buildUploadPayload(fileList){
  const files = Array.from(fileList || []);
  const isDemo = files.length === 0;
  const source = files.length ? files.map(file => ({
    name: file.name,
    ext: getUploadFileExt(file.name),
    size: file.size || 0,
    path: file.webkitRelativePath || file.name,
  })) : KB_UPLOAD_DEMO_FILES;

  const supported = source.filter(file => !getUnsupportedReason(file));
  const unsupported = source
    .filter(file => getUnsupportedReason(file))
    .map(file => ({ ...file, reason: getUnsupportedReason(file) }));
  const folders = new Set();
  source.forEach(file => {
    const parts = String(file.path || '').split('/').filter(Boolean);
    parts.slice(0, -1).forEach((_, idx) => folders.add(parts.slice(0, idx + 1).join('/')));
  });

  return {
    isDemo,
    files: supported,
    unsupported,
    totalFiles: supported.length,
    folderCount: folders.size || 3,
    size: supported.reduce((sum, file) => sum + (file.size || 0), 0) || 6.3 * 1024 * 1024,
  };
}

function getKbRecordableUploadFiles(){
  if(!_kbUploadState) return [];
  return (_kbUploadState.files || []).filter(file => KB_AUTO_RECORD_EXTS.has(file.ext));
}

function normalizeKbRecordFile(file, index){
  const ext = (file.type || file.ext || getUploadFileExt(file.name) || 'pdf').toLowerCase();
  const name = String(file.name || `知识库资料${index + 1}`);
  const hasExt = new RegExp(`\\.${ext}$`, 'i').test(name);
  return {
    id: file.id || `kb-auto-${Date.now()}-${index}`,
    name: hasExt ? name : `${name}.${ext}`,
    type: ext,
    size: typeof file.size === 'number' ? formatUploadSize(file.size) : (file.size || '-'),
    kbLabel: file.kbLabel || '学校知识库 / 九年级 / 数学 / 二次函数'
  };
}

function createKbRecordJobs(files){
  const list = Array.isArray(files) ? files : [files];
  const recordFiles = list.map(normalizeKbRecordFile).filter(file => KB_AUTO_RECORD_EXTS.has(file.type));
  if(!recordFiles.length) return [];
  if(window.V28RecordJobs && typeof V28RecordJobs.createBatch === 'function'){
    return V28RecordJobs.createBatch(recordFiles);
  }
  return recordFiles;
}

function getKbDemoQuestionCount(name){
  let h = 5381;
  String(name || '').split('').forEach(ch => { h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0; });
  return 6 + (Math.abs(h) % 19);
}

function seedKbRecordDemoJob(fileName, state, questionCount){
  const name = String(fileName || '知识库资料.pdf');
  const type = getUploadFileExt(name) || 'pdf';
  const recordableType = KB_AUTO_RECORD_EXTS.has(type) ? type : 'pdf';
  const key = 'v28-ai-record-jobs';
  let jobs = [];
  try{
    const raw = localStorage.getItem(key);
    jobs = raw ? JSON.parse(raw) : [];
    if(!Array.isArray(jobs)) jobs = [];
  }catch(_){ jobs = []; }
  const existing = jobs.find(job => job.fileName === name);
  if(existing){
    existing.state = state || existing.state || 'parsing';
    existing.questionCount = questionCount || existing.questionCount || getKbDemoQuestionCount(name);
    if(existing.state === 'committed'){
      existing.parseDoneAt = existing.parseDoneAt || Date.now() - 60 * 60 * 1000;
      existing.committedAt = existing.committedAt || Date.now() - 30 * 60 * 1000;
    }
  }else{
    const now = Date.now();
    const done = state === 'committed';
    jobs.push({
      id: `rec-kb-${Math.random().toString(36).slice(2, 10)}`,
      fileId: `kb-${name}`,
      fileName: name,
      fileType: recordableType,
      fileSize: type === 'docx' ? '340 KB' : '1.2 MB',
      kbLabel: '学校知识库 / 九年级 / 数学 / 二次函数',
      state: state || 'parsing',
      createdAt: now - (done ? 24 * 60 * 60 * 1000 : 1200),
      parseDoneAt: done ? now - 23 * 60 * 60 * 1000 : null,
      committedAt: done ? now - 22 * 60 * 60 * 1000 : null,
      questionCount: questionCount || getKbDemoQuestionCount(name),
      _parseMs: 12000
    });
  }
  try{ localStorage.setItem(key, JSON.stringify(jobs)); }catch(_){}
}

function createKbAutoRecordTask(event, file){
  if(event){
    event.preventDefault();
    event.stopPropagation();
  }
  const created = createKbRecordJobs([file]);
  const fileName = file && file.name ? file.name : '当前文件';
  const message = created.length
    ? `已创建《${fileName}》AI 录题任务`
    : `《${fileName}》暂不支持自动沉淀`;
  if(typeof showToast === 'function') showToast(message, 2200);
  if(created.length){
    setTimeout(() => { window.location.href = 'ai-record-jobs.html'; }, 520);
  }
}

function goAiRecordFromKb(event, fileName, state, questionCount){
  if(event){
    event.preventDefault();
    event.stopPropagation();
  }
  seedKbRecordDemoJob(fileName, state || 'committed', questionCount);
  if(typeof showToast === 'function') showToast(`打开《${fileName || '当前文件'}》的 AI 录题结果`, 1400);
  setTimeout(() => { window.location.href = 'ai-record-jobs.html'; }, 360);
}

function ensureKbUploadModal(){
  let overlay = document.getElementById('kb-upload-overlay');
  if(overlay) return overlay;

  overlay = document.createElement('div');
  overlay.id = 'kb-upload-overlay';
  overlay.className = 'kb-upload-overlay';
  overlay.innerHTML = `
    <div class="kb-upload-modal" role="dialog" aria-modal="true" aria-labelledby="kb-upload-title">
      <button class="kb-upload-close" type="button" onclick="closeKbUploadModal()" aria-label="关闭">
        <i data-lucide="x"></i>
      </button>
      <div class="kb-upload-head">
        <h2 id="kb-upload-title">上传文件</h2>
        <p>上传后，AI 会自动整理并生成 Wiki 内容。</p>
      </div>
      <div class="kb-upload-body" id="kb-upload-body"></div>
      <input class="kb-upload-input" id="kb-upload-file-input" type="file" multiple
        accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png"
        onchange="handleKbUploadInput(this.files)" />
      <input class="kb-upload-input" id="kb-upload-folder-input" type="file" multiple webkitdirectory directory
        onchange="handleKbUploadInput(this.files)" />
    </div>
  `;
  document.body.appendChild(overlay);
  if(window.lucide) lucide.createIcons();
  return overlay;
}

function ensureKbUnsupportedModal(){
  let overlay = document.getElementById('kb-unsupported-overlay');
  if(overlay) return overlay;

  overlay = document.createElement('div');
  overlay.id = 'kb-unsupported-overlay';
  overlay.className = 'kb-upload-overlay kb-unsupported-overlay';
  overlay.innerHTML = `
    <div class="kb-upload-modal kb-unsupported-modal" role="dialog" aria-modal="true" aria-labelledby="kb-unsupported-title">
      <button class="kb-upload-close" type="button" onclick="closeKbUnsupportedList()" aria-label="关闭">
        <i data-lucide="x"></i>
      </button>
      <div class="kb-upload-head">
        <h2 id="kb-unsupported-title">4 个不支持的文件</h2>
      </div>
      <div class="kb-upload-body" id="kb-unsupported-body"></div>
    </div>
  `;
  document.body.appendChild(overlay);
  if(window.lucide) lucide.createIcons();
  return overlay;
}

function openKbUploadModal(){
  const overlay = ensureKbUploadModal();
  const title = document.getElementById('kb-upload-title');
  if(title) title.textContent = '上传文件';
  _kbUploadState = buildUploadPayload([]);
  _kbUploadHasSelection = false;
  _kbUploadAutoRecord = false;
  overlay.classList.add('open');
  renderKbUploadDrop();
}

function closeKbUploadModal(){
  const overlay = document.getElementById('kb-upload-overlay');
  closeKbUnsupportedList();
  if(_kbUploadTimer){
    clearInterval(_kbUploadTimer);
    _kbUploadTimer = null;
  }
  if(overlay) overlay.classList.remove('open');
}

function renderKbUploadDrop(){
  const body = document.getElementById('kb-upload-body');
  if(!body) return;
  body.innerHTML = `
    <div class="kb-upload-drop" ondragover="event.preventDefault()" ondrop="handleKbUploadDrop(event)">
      <div class="kb-upload-folder-art"><i data-lucide="folder-open"></i></div>
      <div class="kb-upload-main-copy">拖入文件，或点击下方按钮选择</div>
      <div class="kb-upload-sub-copy">仅支持 PDF、DOC、DOCX、XLS、XLSX、PPT、PPTX、JPG、PNG 格式文件，<br>单个文件不超过 100M，可一次拖入或选择多个文件，也可拖入或选择整个文件夹</div>
      <div class="kb-upload-selected"></div>
      <div class="kb-upload-actions">
        <button class="kb-upload-pick" type="button" onclick="triggerKbUploadInput('file')">
          <i data-lucide="upload"></i><span>选择文件</span>
        </button>
        <button class="kb-upload-pick" type="button" onclick="triggerKbUploadInput('folder')">
          <i data-lucide="folder-plus"></i><span>选择文件夹</span>
        </button>
      </div>
    </div>
  `;
  if(window.lucide) lucide.createIcons();
}

function renderKbUploadTree(files, unsupportedOnly){
  const rootCount = unsupportedOnly ? files.length : Math.max(26, files.length);
  const rows = files.map(file => `
    <div class="kb-upload-tree-file">
      <i data-lucide="${getUploadFileIcon(file.ext)}"></i>
      <span>${escHtml(file.name.replace(/\.[^.]+$/, ''))}</span>
      ${unsupportedOnly ? `<strong class="kb-upload-reason">${escHtml(file.reason || getUnsupportedReason(file))}</strong>` : ''}
      <em>${formatUploadSize(file.size)}</em>
    </div>
  `).join('');

  return `
    <div class="kb-upload-tree">
      ${unsupportedOnly ? '<div class="kb-upload-tree-note">以下文件不会上传，可调整后重新选择</div>' : ''}
      <div class="kb-upload-tree-folder is-open">
        <i data-lucide="chevron-down"></i>
        <i data-lucide="folder"></i>
        <b>编辑题目</b>
        <span>${rootCount} 个</span>
      </div>
      ${rows}
      <div class="kb-upload-tree-folder">
        <i data-lucide="chevron-right"></i>
        <i data-lucide="folder"></i>
        <b>编辑题目</b>
        <span>26 个</span>
      </div>
    </div>
  `;
}

function renderKbUploadPreview(){
  const body = document.getElementById('kb-upload-body');
  if(!body || !_kbUploadState) return;
  const unsupportedCount = getVisibleUnsupportedFiles().length;
  const totalFiles = _kbUploadState.totalFiles;
  const canStart = totalFiles > 0;
  const recordableCount = getKbRecordableUploadFiles().length;
  body.innerHTML = `
    <div class="kb-upload-preview ${recordableCount ? '' : 'no-recordable'}">
      <div class="kb-upload-stats">
        <div class="kb-upload-stat-main">
          <span>文件 <b>${totalFiles}</b></span>
          <span>文件夹 <b>${_kbUploadState.folderCount || 3}</b></span>
          <span>大小 <b>${formatUploadSize(_kbUploadState.size)}</b></span>
        </div>
        <button class="kb-upload-unsupported-link" type="button" onclick="openKbUnsupportedList()">
          <span>不支持文件 <b>${unsupportedCount}</b> 个</span>
          <i data-lucide="chevron-right"></i>
        </button>
      </div>
      ${renderKbUploadTree(_kbUploadState.files.length ? _kbUploadState.files : KB_UPLOAD_DEMO_FILES.filter(file => !getUnsupportedReason(file)), false)}
      <label class="kb-upload-auto-record ${recordableCount ? '' : 'disabled'}" title="${recordableCount ? `本次有 ${recordableCount} 个 PDF / Word / 图片可进入 AI 录题` : '本次没有可进入 AI 录题的 PDF / Word / 图片'}">
        <input id="kb-upload-auto-record" type="checkbox" ${_kbUploadAutoRecord ? 'checked' : ''} ${recordableCount ? '' : 'disabled'} onchange="_kbUploadAutoRecord = this.checked" />
        <span class="kb-upload-checkmark" aria-hidden="true"></span>
        <span class="kb-upload-auto-record-copy">
          <b>允许文件中的题目进入 AI 校本题库</b>
          <small>勾选后，AI 会自动分析符合条件的图片、PDF、Word，进入 AI 录题处理。</small>
        </span>
      </label>
    </div>
    <button class="kb-upload-start" type="button" onclick="startKbUploadImport()" ${canStart ? '' : 'disabled'}>${canStart ? '开始上传' : '没有可上传文件'}</button>
  `;
  if(window.lucide) lucide.createIcons();
}

function openKbUnsupportedList(){
  if(!_kbUploadState) return;
  const overlay = ensureKbUnsupportedModal();
  const body = document.getElementById('kb-unsupported-body');
  const title = document.getElementById('kb-unsupported-title');
  if(!body) return;
  const unsupported = getVisibleUnsupportedFiles();
  const count = unsupported.length;
  if(title) title.textContent = `${count} 个不支持的文件`;
  body.innerHTML = renderKbUploadTree(unsupported, true);
  overlay.classList.add('open');
  if(window.lucide) lucide.createIcons();
}

function closeKbUnsupportedList(){
  const overlay = document.getElementById('kb-unsupported-overlay');
  if(overlay) overlay.classList.remove('open');
}

function triggerKbUploadInput(type){
  const input = document.getElementById(type === 'folder' ? 'kb-upload-folder-input' : 'kb-upload-file-input');
  if(input){
    input.value = '';
    input.click();
  }
}

function handleKbUploadInput(files){
  const selected = Array.from(files || []);
  if(!selected.length) return;
  _kbUploadState = buildUploadPayload(selected);
  _kbUploadHasSelection = true;
  const title = document.getElementById('kb-upload-title');
  if(title) title.textContent = '上传文件';
  renderKbUploadPreview();
}

function handleKbUploadDrop(event){
  event.preventDefault();
  handleKbUploadInput(event.dataTransfer?.files);
}

function goKbUploadNext(){
  if(!_kbUploadHasSelection){
    if(typeof showToast === 'function') showToast('请先选择文件或文件夹');
    return;
  }
  renderKbUploadPreview();
}

function startKbUploadImport(){
  const body = document.getElementById('kb-upload-body');
  if(!body) return;
  if(_kbUploadTimer){
    clearInterval(_kbUploadTimer);
    _kbUploadTimer = null;
  }
  const total = _kbUploadState?.totalFiles || 157;
  const shouldAutoRecord = !!document.getElementById('kb-upload-auto-record')?.checked || _kbUploadAutoRecord;
  const autoRecordFiles = shouldAutoRecord ? getKbRecordableUploadFiles() : [];
  body.innerHTML = `
    <div class="kb-upload-progress">
      <div class="kb-upload-percent"><span id="kb-upload-pct">0</span>%</div>
      <div class="kb-upload-bar"><span id="kb-upload-fill"></span></div>
      <div class="kb-upload-steps">
        <div class="kb-upload-step doing" id="kb-up-step-1">
          <span>01</span>
          <div><b>读取文件并保留原结构</b><p id="kb-up-step-1-copy">已读取 0/${total} 个文件</p></div>
          <em>进行中</em>
        </div>
        <div class="kb-upload-step" id="kb-up-step-2">
          <span>02</span>
          <div><b>AI 自动打标签</b><p>识别学科、章节和资料类型</p></div>
          <em>等待中</em>
        </div>
        <div class="kb-upload-step" id="kb-up-step-3">
          <span>03</span>
          <div><b>抽取知识点，生成摘要</b><p>PDF/PPT 抽目录，图片做 OCR</p></div>
          <em>等待中</em>
        </div>
        <div class="kb-upload-step" id="kb-up-step-4">
          <span>04</span>
          <div><b>建立关联与图谱</b><p>${shouldAutoRecord ? '同步创建 AI 录题任务' : '同主题资料自动关联'}</p></div>
          <em>等待中</em>
        </div>
      </div>
    </div>
  `;
  if(window.lucide) lucide.createIcons();

  let pct = 0;
  _kbUploadTimer = setInterval(() => {
    pct = Math.min(100, pct + 5 + Math.floor(Math.random() * 6));
    const pctEl = document.getElementById('kb-upload-pct');
    const fill = document.getElementById('kb-upload-fill');
    const stepCopy = document.getElementById('kb-up-step-1-copy');
    if(pctEl) pctEl.textContent = pct;
    if(fill) fill.style.width = pct + '%';
    if(stepCopy) stepCopy.textContent = `已读取 ${Math.floor(total * pct / 100)}/${total} 个文件`;
    updateKbUploadStep(2, pct >= 35, pct >= 58);
    updateKbUploadStep(3, pct >= 58, pct >= 80);
    updateKbUploadStep(4, pct >= 80, pct >= 100);
    if(pct >= 100){
      clearInterval(_kbUploadTimer);
      _kbUploadTimer = null;
      setTimeout(() => {
        const created = autoRecordFiles.length ? createKbRecordJobs(autoRecordFiles) : [];
        renderKbUploadComplete(created.length);
      }, 520);
    }
  }, 360);
}

function renderKbUploadComplete(recordTaskCount = 0){
  const body = document.getElementById('kb-upload-body');
  const title = document.getElementById('kb-upload-title');
  if(title) title.textContent = '';
  if(!body) return;
  body.innerHTML = `
    <div class="kb-upload-complete">
      <div class="kb-upload-complete-icon">
        <i data-lucide="file-check-2"></i>
      </div>
      <h3>导入完成，文件已入库</h3>
      <p>AI 正在后台整理内容，完成后知识库内容会自动更新。</p>
      ${recordTaskCount ? '<p class="kb-upload-complete-note">符合条件的题目录入进度，可在「应用广场 - AI 录题」页面查看。</p>' : ''}
    </div>
  `;
  if(window.lucide) lucide.createIcons();
}

function updateKbUploadStep(step, active, done){
  const el = document.getElementById(`kb-up-step-${step}`);
  if(!el) return;
  el.classList.toggle('doing', active && !done);
  el.classList.toggle('done', done);
  const status = el.querySelector('em');
  if(status) status.textContent = done ? '已完成' : (active ? '进行中' : '等待中');
}

function personalUploadToCurrentFolder(){
  openKbUploadModal();
}

function getFolderSelectionKey(folderId){
  return `${CURRENT_KB_SCOPE}:${folderId ?? ROOT_FOLDER_ID}`;
}

function ensureFolderSelection(key){
  if(!_folderSelection[key]){
    _folderSelection[key] = { folders: new Set(), files: new Set() };
  }
  return _folderSelection[key];
}

function clearCurrentFolderSelection(){
  delete _folderSelection[getFolderSelectionKey(_personalCurrentFolder ?? null)];
}

function setFolderManageMode(enabled){
  _folderManageMode = !!enabled;
  closeRowMenu();
  if(!_folderManageMode) clearCurrentFolderSelection();
  renderPersonalFolderView();
}

function toggleFolderSelection(type, idRaw){
  const key = getFolderSelectionKey(_personalCurrentFolder ?? null);
  const selection = ensureFolderSelection(key);
  const bucket = type === 'folder' ? selection.folders : selection.files;
  const id = type === 'file' ? Number(idRaw) : String(idRaw);
  if(bucket.has(id)) bucket.delete(id);
  else bucket.add(id);
  renderPersonalFolderView();
}

function toggleSelectAllInFolder(shouldSelect){
  const selection = ensureFolderSelection(getFolderSelectionKey(_personalCurrentFolder ?? null));
  selection.folders.clear();
  selection.files.clear();
  if(shouldSelect){
    getPersonalChildFolders(_personalCurrentFolder ?? null).forEach(folder => selection.folders.add(folder.id));
    getPersonalFiles(_personalCurrentFolder ?? null).forEach((_, index) => selection.files.add(index));
  }
  renderPersonalFolderView();
}

function getSelectedFolderItems(){
  const folderId = _personalCurrentFolder ?? null;
  const selection = ensureFolderSelection(getFolderSelectionKey(folderId));
  const files = getPersonalFiles(folderId);
  return {
    folderId,
    folderIds: Array.from(selection.folders).filter(id => !!getPersonalFolder(id)),
    fileIndexes: Array.from(selection.files)
      .map(Number)
      .filter(index => Number.isInteger(index) && index >= 0 && index < files.length)
      .sort((a, b) => b - a),
  };
}

function getKbRootLabel(){
  if(CURRENT_KB_SCOPE === 'personal') return '我的知识库';
  if(CURRENT_KB_SCOPE === 'school') return '学校知识库';
  return getCurrentTeamKbName() || '团队知识库';
}

function openBatchMovePop(event){
  if(event){
    event.preventDefault && event.preventDefault();
    event.stopPropagation && event.stopPropagation();
  }
  const selected = getSelectedFolderItems();
  const total = selected.folderIds.length + selected.fileIndexes.length;
  if(!total){
    showToast('先选择要移动的文件夹或文件');
    return;
  }
  const pop = ensureFvPopMounted();
  const excludeIds = new Set();
  selected.folderIds.forEach(id => collectPersonalDescendants(id).forEach(childId => excludeIds.add(childId)));
  const disabledIds = new Set([selected.folderId]);
  const targetsHtml = renderFolderTreePicker('confirmBatchMoveSelected(__ID__)', { excludeIds, disabledIds });
  pop.innerHTML = `
    <div class="fv-pop-title">移动所选内容到…</div>
    <div class="fv-pop-sub">已选择 ${total} 项：${selected.folderIds.length} 个文件夹，${selected.fileIndexes.length} 个文件</div>
    <div class="fv-pop-list">${targetsHtml}</div>
    <div class="fv-pop-foot">
      <button class="fv-pop-btn" onclick="closeFvPop()">取消</button>
    </div>
  `;
  openFvPop();
  if(window.lucide) lucide.createIcons();
}

function confirmBatchMoveSelected(toFolderId){
  const selected = getSelectedFolderItems();
  const total = selected.folderIds.length + selected.fileIndexes.length;
  if(!total){
    closeFvPop();
    return;
  }

  const targetParent = toFolderId ?? null;
  const foldersToMove = selected.folderIds
    .map(id => getPersonalFolder(id))
    .filter(Boolean);
  const conflict = foldersToMove.some(folder => PERSONAL_KB_DATA.folders.some(
    item => item.id !== folder.id && (item.parentId ?? null) === targetParent && item.name === folder.name
  ));
  if(conflict){
    showToast('目标位置已有同名文件夹');
    closeFvPop();
    return;
  }

  foldersToMove.forEach(folder => { folder.parentId = targetParent; });

  const fromKey = fileBucketKey(selected.folderId);
  const toKey = fileBucketKey(targetParent);
  if(!Array.isArray(PERSONAL_KB_DATA.files[toKey])) PERSONAL_KB_DATA.files[toKey] = [];
  selected.fileIndexes.forEach(index => {
    const file = PERSONAL_KB_DATA.files[fromKey]?.[index];
    if(file){
      PERSONAL_KB_DATA.files[fromKey].splice(index, 1);
      PERSONAL_KB_DATA.files[toKey].unshift(file);
    }
  });

  clearCurrentFolderSelection();
  _folderManageMode = false;
  recountPersonalFolders();
  savePersonalKbState();
  closeFvPop();
  renderPersonalFolderView();
  renderPersonalFolderTree && renderPersonalFolderTree();
  syncPersonalHeroCounts();
  const targetName = targetParent == null
    ? `${getKbRootLabel()}（根目录）`
    : (getPersonalFolder(targetParent)?.name || '其它位置');
  showToast(`已将 ${total} 项移到「${targetName}」`);
}

function deleteSelectedFolderItems(){
  const selected = getSelectedFolderItems();
  const total = selected.folderIds.length + selected.fileIndexes.length;
  if(!total){
    showToast('先选择要删除的文件夹或文件');
    return;
  }

  let affectedFiles = selected.fileIndexes.length;
  const deleteIds = new Set();
  selected.folderIds.forEach(id => {
    collectPersonalDescendants(id).forEach(childId => deleteIds.add(childId));
  });
  deleteIds.forEach(id => { affectedFiles += (PERSONAL_KB_DATA.files[id] || []).length; });

  const ok = confirmDemo(
    `确认删除所选 ${total} 项？\n包含 ${selected.folderIds.length} 个文件夹、${selected.fileIndexes.length} 个文件；文件夹内共 ${affectedFiles - selected.fileIndexes.length} 份资料将一并删除。\n（演示）此操作仅在本次演示中生效。`
  );
  if(!ok) return;

  PERSONAL_KB_DATA.folders = PERSONAL_KB_DATA.folders.filter(folder => !deleteIds.has(folder.id));
  deleteIds.forEach(id => {
    delete PERSONAL_KB_DATA.files[id];
    delete PERSONAL_KB_DATA.wikiByFolder[id];
  });

  const fromKey = fileBucketKey(selected.folderId);
  selected.fileIndexes.forEach(index => {
    if(PERSONAL_KB_DATA.files[fromKey]) PERSONAL_KB_DATA.files[fromKey].splice(index, 1);
  });

  if(deleteIds.has(_personalCurrentFolder)){
    _personalCurrentFolder = null;
  }
  clearCurrentFolderSelection();
  _folderManageMode = false;
  recountPersonalFolders();
  savePersonalKbState();
  renderPersonalFolderView();
  renderPersonalFolderTree && renderPersonalFolderTree();
  syncPersonalHeroCounts();
  showToast(`已删除 ${total} 项`);
}

/* ────── 行级 · 菜单（文件夹 / 文件） ────── */
function ensureRowMenuMounted(){
  let menu = document.getElementById('fv-row-menu');
  if(menu) return menu;
  menu = document.createElement('div');
  menu.className = 'fv-row-menu';
  menu.id = 'fv-row-menu';
  document.body.appendChild(menu);

  document.addEventListener('click', (event) => {
    const m = document.getElementById('fv-row-menu');
    if(!m) return;
    if(event.target.closest('#fv-row-menu')) return;
    if(event.target.closest('.fv-row-action')) return;
    closeRowMenu();
  });
  document.addEventListener('keydown', (event) => {
    if(event.key === 'Escape') closeRowMenu();
  });
  return menu;
}

function positionRowMenu(menu, anchorRect){
  const width = menu.offsetWidth || 170;
  const height = menu.offsetHeight || 160;
  const left = Math.max(8, Math.min(window.innerWidth - width - 8, anchorRect.right - width));
  const top = Math.min(window.innerHeight - height - 8, anchorRect.bottom + 4);
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
}

function closeRowMenu(){
  const menu = document.getElementById('fv-row-menu');
  if(menu) menu.classList.remove('open');
}

function openFolderRowMenu(event, folderId){
  event.preventDefault();
  event.stopPropagation();
  const menu = ensureRowMenuMounted();
  menu.innerHTML = `
    <button class="fv-row-menu-item" onclick="closeRowMenu();openMoveFolderPop(event,'${escHtml(folderId)}')">
      <i data-lucide="folder-input"></i><span>移动到…</span>
    </button>
    <button class="fv-row-menu-item" onclick="closeRowMenu();startRenamePersonalFolder('${escHtml(folderId)}')">
      <i data-lucide="pencil-line"></i><span>重命名</span>
    </button>
    <div class="fv-row-menu-divider"></div>
    <button class="fv-row-menu-item danger" onclick="closeRowMenu();deletePersonalFolder('${escHtml(folderId)}')">
      <i data-lucide="trash-2"></i><span>删除文件夹</span>
    </button>
  `;
  menu.classList.add('open');
  positionRowMenu(menu, event.currentTarget.getBoundingClientRect());
  if(window.lucide) lucide.createIcons();
}

function openFileRowMenu(event, fileIndex){
  event.preventDefault();
  event.stopPropagation();
  const menu = ensureRowMenuMounted();
  menu.innerHTML = `
    <button class="fv-row-menu-item" onclick="closeRowMenu();openMoveFilePop(event,${fileIndex})">
      <i data-lucide="folder-input"></i><span>移动到…</span>
    </button>
    <button class="fv-row-menu-item" onclick="closeRowMenu();startRenamePersonalFile(${fileIndex})">
      <i data-lucide="pencil-line"></i><span>重命名</span>
    </button>
    <div class="fv-row-menu-divider"></div>
    <button class="fv-row-menu-item danger" onclick="closeRowMenu();deletePersonalFile(${fileIndex})">
      <i data-lucide="trash-2"></i><span>删除</span>
    </button>
  `;
  menu.classList.add('open');
  positionRowMenu(menu, event.currentTarget.getBoundingClientRect());
  if(window.lucide) lucide.createIcons();
}

/* ────── 文件夹 CRUD ────── */
function ensureFvPopMounted(){
  let pop = document.getElementById('fv-pop');
  if(pop) return pop;

  const overlay = document.createElement('div');
  overlay.className = 'fv-pop-overlay';
  overlay.id = 'fv-pop-overlay';
  overlay.addEventListener('click', () => closeFvPop());
  document.body.appendChild(overlay);

  pop = document.createElement('div');
  pop.className = 'fv-pop';
  pop.id = 'fv-pop';
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-modal', 'true');
  document.body.appendChild(pop);

  document.addEventListener('keydown', (event) => {
    if(event.key === 'Escape') closeFvPop();
  });
  return pop;
}

function openFvPop(){
  const pop = document.getElementById('fv-pop');
  const overlay = document.getElementById('fv-pop-overlay');
  if(pop) pop.classList.add('open');
  if(overlay) overlay.classList.add('open');
}

function closeFvPop(){
  const pop = document.getElementById('fv-pop');
  const overlay = document.getElementById('fv-pop-overlay');
  if(pop) pop.classList.remove('open');
  if(overlay) overlay.classList.remove('open');
}

function openCreateFolderPop(event){
  event.preventDefault();
  event.stopPropagation();
  const pop = ensureFvPopMounted();
  pop.innerHTML = `
    <div class="fv-pop-title">新建文件夹</div>
    <div class="fv-pop-sub">仅你可见，飞象会按这个文件夹整理 Wiki</div>
    <div class="fv-pop-field">
      <input id="fv-new-folder-name" class="fv-pop-input" type="text"
             maxlength="20" placeholder="例如：阅读理解专题"
             onkeydown="if(event.key==='Enter'){event.preventDefault();confirmCreatePersonalFolder()}" />
    </div>
    <div class="fv-pop-foot">
      <button class="fv-pop-btn" onclick="closeFvPop()">取消</button>
      <button class="fv-pop-btn primary" onclick="confirmCreatePersonalFolder()">创建</button>
    </div>
  `;
  openFvPop();
  setTimeout(() => {
    const input = document.getElementById('fv-new-folder-name');
    if(input) input.focus();
  }, 30);
}

function confirmCreatePersonalFolder(){
  const input = document.getElementById('fv-new-folder-name');
  const name = input ? input.value.trim() : '';
  if(!name){
    showToast('先填一个文件夹名');
    return;
  }
  /* 同名校验只在当前层级（不同层可以重名） */
  const parentId = _personalCurrentFolder ?? null;
  const siblings = getPersonalChildFolders(parentId);
  if(siblings.some(f => f.name === name)){
    showToast('当前位置已有同名文件夹');
    return;
  }
  const id = buildPersonalFolderId(name);
  PERSONAL_KB_DATA.folders.push({ id, parentId, name, count: 0 });
  PERSONAL_KB_DATA.files[id] = [];
  PERSONAL_KB_DATA.wikiByFolder[id] = [];
  /* 留在当前层级，让用户看到新建项；不自动进入空文件夹 */
  savePersonalKbState();
  closeFvPop();
  renderPersonalFolderView();
  renderPersonalFolderTree && renderPersonalFolderTree();
  syncPersonalHeroCounts();
  showToast(`已新建「${name}」`);
}

function startRenamePersonalFolder(folderId){
  const folder = getPersonalFolder(folderId);
  if(!folder) return;
  const tr = document.querySelector(`tr.fv-row-folder[data-folder-id="${folderId}"]`);
  if(!tr) return;
  const nameSpan = tr.querySelector('.fv-folder-name');
  if(!nameSpan) return;
  const original = folder.name;
  nameSpan.outerHTML = `<input class="fv-rename-input" value="${escHtml(original)}"
                                maxlength="20"
                                onclick="event.stopPropagation()"
                                onblur="commitRenamePersonalFolder('${escHtml(folderId)}',this.value)"
                                onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}else if(event.key==='Escape'){this.value='${escHtml(original)}';this.blur()}" />`;
  const input = tr.querySelector('.fv-rename-input');
  if(input){
    input.focus();
    input.select();
  }
}

function commitRenamePersonalFolder(folderId, newNameRaw){
  const folder = getPersonalFolder(folderId);
  if(!folder){
    renderPersonalFolderView();
    return;
  }
  const newName = String(newNameRaw || '').trim();
  if(!newName || newName === folder.name){
    renderPersonalFolderView();
    return;
  }
  const parentId = folder.parentId ?? null;
  const conflict = PERSONAL_KB_DATA.folders.some(
    f => f.id !== folderId && (f.parentId ?? null) === parentId && f.name === newName
  );
  if(conflict){
    showToast('当前位置已有同名文件夹');
    renderPersonalFolderView();
    return;
  }
  folder.name = newName;
  savePersonalKbState();
  renderPersonalFolderView();
  renderPersonalFolderTree && renderPersonalFolderTree();
  showToast('已重命名');
}

function deletePersonalFolder(folderId){
  const folder = getPersonalFolder(folderId);
  if(!folder) return;

  /* 收集所有子孙（含自己）→ 算出总文件数 + 子文件夹数 */
  const allIds = collectPersonalDescendants(folderId);
  const subFolderCount = allIds.length - 1; // 不算自己
  let totalFiles = 0;
  allIds.forEach(id => {
    totalFiles += (PERSONAL_KB_DATA.files[id] || []).length;
  });

  const detail = [];
  if(subFolderCount > 0) detail.push(`${subFolderCount} 个子文件夹`);
  if(totalFiles > 0) detail.push(`${totalFiles} 份资料`);
  const detailText = detail.length
    ? `文件夹中的 ${detail.join(' + ')} 将一并删除。`
    : '文件夹是空的。';

  const ok = confirmDemo(
    `确认删除文件夹「${folder.name}」？\n${detailText}\n（演示）此操作仅在本次演示中生效。`
  );
  if(!ok) return;

  /* 真正递归删 */
  const idSet = new Set(allIds);
  PERSONAL_KB_DATA.folders = PERSONAL_KB_DATA.folders.filter(f => !idSet.has(f.id));
  allIds.forEach(id => {
    delete PERSONAL_KB_DATA.files[id];
    delete PERSONAL_KB_DATA.wikiByFolder[id];
  });

  /* 如果当前进入的文件夹（或它的祖先）正在被删 → 回到被删文件夹的父级，体感更自然 */
  if(idSet.has(_personalCurrentFolder)){
    _personalCurrentFolder = folder.parentId ?? null;
  }

  savePersonalKbState();
  renderPersonalFolderView();
  renderPersonalFolderTree && renderPersonalFolderTree();
  syncPersonalHeroCounts();
  showToast(`已删除「${folder.name}」`);
}

/* ────── 文件 CRUD ────── */
/* 把 folder/null 转换成 files[] 索引键 */
function fileBucketKey(folderIdOrNull){
  return folderIdOrNull == null ? ROOT_FOLDER_ID : folderIdOrNull;
}

/* 渲染整棵树作为目标选择器（含「我的知识库」根）。
   excludeIds 用于"移动文件夹"时排除自己和子孙；移动文件时传空集 */
function renderFolderTreePicker(onPickAttr, options = {}){
  const excludeIds = options.excludeIds || new Set();
  const disabledIds = options.disabledIds || new Set();
  const rootLabel = getKbRootLabel();
  const rootIcon = CURRENT_KB_SCOPE === 'personal' ? 'bookmark' : 'library';

  const lines = [];
  /* 根目录入口（始终显示，跟下方文件夹列表用 divider 分开，强调它是"特殊目标"） */
  const rootDisabled = disabledIds.has(null) || disabledIds.has(ROOT_FOLDER_ID);
  lines.push(`
    <button class="fv-pop-list-item is-root ${rootDisabled ? 'disabled' : ''}"
            style="padding-left:9px"
            ${rootDisabled ? 'disabled' : `onclick="${onPickAttr.replace('__ID__', 'null')}"`}>
      <i data-lucide="${rootIcon}"></i>
      <span>${escHtml(rootLabel)}（根目录）</span>
    </button>
    <div class="fv-pop-list-divider"></div>
  `);

  /* 深度遍历：父-子顺序，缩进表示层级 */
  const walk = (parentId, depth) => {
    const children = PERSONAL_KB_DATA.folders
      .filter(f => (f.parentId ?? null) === parentId && !excludeIds.has(f.id))
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
    children.forEach(folder => {
      const isDisabled = disabledIds.has(folder.id);
      const padLeft = 9 + depth * 16;
      const onclickAttr = isDisabled ? '' : `onclick="${onPickAttr.replace('__ID__', `'${escHtml(folder.id)}'`)}"`;
      lines.push(`
        <button class="fv-pop-list-item ${isDisabled ? 'disabled' : ''}"
                style="padding-left:${padLeft}px"
                ${isDisabled ? 'disabled' : onclickAttr}>
          <i data-lucide="folder"></i>
          <span>${escHtml(folder.name)}</span>
          <span class="pi-count">${folder.count} 份</span>
        </button>
      `);
      walk(folder.id, depth + 1);
    });
  };
  walk(null, 0);

  return lines.join('');
}

function openMoveFilePop(event, fileIndex){
  if(event){
    event.preventDefault && event.preventDefault();
    event.stopPropagation && event.stopPropagation();
  }
  const fromFolderId = _personalCurrentFolder ?? null;
  const file = getPersonalFiles(fromFolderId)[fileIndex];
  if(!file) return;

  const pop = ensureFvPopMounted();
  /* 当前所在层级置灰（移过去等于没动） */
  const disabledIds = new Set([fromFolderId]);
  const targetsHtml = renderFolderTreePicker(
    `confirmMovePersonalFile(${fileIndex},__ID__)`,
    { disabledIds }
  );

  pop.innerHTML = `
    <div class="fv-pop-title">移动到…</div>
    <div class="fv-pop-sub">${escHtml(file.name)}</div>
    <div class="fv-pop-list">${targetsHtml}</div>
    <div class="fv-pop-foot">
      <button class="fv-pop-btn" onclick="closeFvPop()">取消</button>
    </div>
  `;
  openFvPop();
  if(window.lucide) lucide.createIcons();
}

/* toFolderId === null  → 移到根目录散文件桶 */
function confirmMovePersonalFile(fileIndex, toFolderId){
  const fromFolderId = _personalCurrentFolder ?? null;
  if(fromFolderId === toFolderId){
    closeFvPop();
    return;
  }
  const fromKey = fileBucketKey(fromFolderId);
  const toKey = fileBucketKey(toFolderId);
  const fromList = PERSONAL_KB_DATA.files[fromKey];
  if(!fromList){
    closeFvPop();
    return;
  }
  if(!Array.isArray(PERSONAL_KB_DATA.files[toKey])){
    PERSONAL_KB_DATA.files[toKey] = [];
  }
  const toList = PERSONAL_KB_DATA.files[toKey];
  const file = fromList[fileIndex];
  if(!file){
    closeFvPop();
    return;
  }
  fromList.splice(fileIndex, 1);
  toList.unshift(file);
  recountPersonalFolders();
  savePersonalKbState();
  closeFvPop();
  renderPersonalFolderView();
  renderPersonalFolderTree && renderPersonalFolderTree();
  const targetName = toFolderId == null
    ? `${getKbRootLabel()}（根目录）`
    : (getPersonalFolder(toFolderId)?.name || '其它文件夹');
  showToast(`已移到「${targetName}」`);
}

/* 移动文件夹：选目标层级（不能移到自己 / 自己的子孙 / 当前父级 / 自己） */
function openMoveFolderPop(event, folderId){
  if(event){
    event.preventDefault && event.preventDefault();
    event.stopPropagation && event.stopPropagation();
  }
  const folder = getPersonalFolder(folderId);
  if(!folder) return;

  const pop = ensureFvPopMounted();
  /* 排除 = 自己 + 所有子孙（避免循环） */
  const excludeIds = new Set(collectPersonalDescendants(folderId));
  /* 置灰 = 当前父级（移过去等于没动） */
  const currentParent = folder.parentId ?? null;
  const disabledIds = new Set([currentParent]);

  const targetsHtml = renderFolderTreePicker(
    `confirmMovePersonalFolder('${escHtml(folderId)}',__ID__)`,
    { excludeIds, disabledIds }
  );

  pop.innerHTML = `
    <div class="fv-pop-title">移动文件夹到…</div>
    <div class="fv-pop-sub">${escHtml(folder.name)}</div>
    <div class="fv-pop-list">${targetsHtml}</div>
    <div class="fv-pop-foot">
      <button class="fv-pop-btn" onclick="closeFvPop()">取消</button>
    </div>
  `;
  openFvPop();
  if(window.lucide) lucide.createIcons();
}

function confirmMovePersonalFolder(folderId, newParentId){
  const folder = getPersonalFolder(folderId);
  if(!folder){
    closeFvPop();
    return;
  }
  /* 防御：目标不能是自己或子孙 */
  if(newParentId === folderId) {
    closeFvPop();
    return;
  }
  if(newParentId != null){
    const desc = new Set(collectPersonalDescendants(folderId));
    if(desc.has(newParentId)){
      showToast('不能移到自己的子文件夹里');
      closeFvPop();
      return;
    }
  }
  const targetParent = newParentId ?? null;
  /* 同名校验：目标层级里不能有同名 */
  const conflict = PERSONAL_KB_DATA.folders.some(
    f => f.id !== folderId && (f.parentId ?? null) === targetParent && f.name === folder.name
  );
  if(conflict){
    showToast('目标位置已有同名文件夹');
    closeFvPop();
    return;
  }
  folder.parentId = targetParent;
  savePersonalKbState();
  closeFvPop();
  renderPersonalFolderView();
  const targetName = targetParent == null
    ? '我的知识库（根目录）'
    : (getPersonalFolder(targetParent)?.name || '其它位置');
  showToast(`已移到「${targetName}」`);
}

function startRenamePersonalFile(fileIndex){
  const folderId = _personalCurrentFolder ?? null;
  const file = getPersonalFiles(folderId)[fileIndex];
  if(!file) return;
  const tr = document.querySelector(`#personal-fv-table tbody tr[data-file-index="${fileIndex}"]`);
  if(!tr) return;
  const nameSpan = tr.querySelector('.fv-file-name');
  if(!nameSpan) return;
  const original = file.name;
  nameSpan.outerHTML = `<input class="fv-rename-input" value="${escHtml(original)}"
                                maxlength="40"
                                onclick="event.stopPropagation()"
                                onblur="commitRenamePersonalFile(${fileIndex},this.value)"
                                onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}else if(event.key==='Escape'){this.value='${escHtml(original)}';this.blur()}" />`;
  const input = tr.querySelector('.fv-rename-input');
  if(input){
    input.focus();
    input.select();
  }
}

function commitRenamePersonalFile(fileIndex, newNameRaw){
  const folderId = _personalCurrentFolder ?? null;
  const file = getPersonalFiles(folderId)[fileIndex];
  if(!file){
    renderPersonalFolderView();
    return;
  }
  const newName = String(newNameRaw || '').trim();
  if(!newName || newName === file.name){
    renderPersonalFolderView();
    return;
  }
  file.name = newName;
  savePersonalKbState();
  renderPersonalFolderView();
  showToast('已重命名');
}

function deletePersonalFile(fileIndex){
  const folderId = _personalCurrentFolder ?? null;
  const list = PERSONAL_KB_DATA.files[fileBucketKey(folderId)];
  if(!list) return;
  const file = list[fileIndex];
  if(!file) return;
  const ok = confirmDemo(`确认删除《${file.name}》？\n（演示）此操作仅在本次演示中生效。`);
  if(!ok) return;
  list.splice(fileIndex, 1);
  recountPersonalFolders();
  savePersonalKbState();
  renderPersonalFolderView();
  renderPersonalFolderTree && renderPersonalFolderTree();
  syncPersonalHeroCounts();
  showToast(`已删除《${file.name}》`);
}

/* 暴露给 inline onclick */
window.renderPersonalFolderView = renderPersonalFolderView;
window.personalEnterFolder = personalEnterFolder;
window.personalEnterFolderId = personalEnterFolderId;
window.personalBackToRoot = personalBackToRoot;
window.openFolderFilePreview = openFolderFilePreview;
window.personalUploadToCurrentFolder = personalUploadToCurrentFolder;
window.openKbUploadModal = openKbUploadModal;
window.createKbAutoRecordTask = createKbAutoRecordTask;
window.goAiRecordFromKb = goAiRecordFromKb;
window.setFolderManageMode = setFolderManageMode;
window.toggleFolderSelection = toggleFolderSelection;
window.toggleSelectAllInFolder = toggleSelectAllInFolder;
window.openBatchMovePop = openBatchMovePop;
window.confirmBatchMoveSelected = confirmBatchMoveSelected;
window.deleteSelectedFolderItems = deleteSelectedFolderItems;
window.openFolderRowMenu = openFolderRowMenu;
window.openFileRowMenu = openFileRowMenu;
window.closeRowMenu = closeRowMenu;
window.openCreateFolderPop = openCreateFolderPop;
window.confirmCreatePersonalFolder = confirmCreatePersonalFolder;
window.startRenamePersonalFolder = startRenamePersonalFolder;
window.commitRenamePersonalFolder = commitRenamePersonalFolder;
window.deletePersonalFolder = deletePersonalFolder;
window.openMoveFilePop = openMoveFilePop;
window.confirmMovePersonalFile = confirmMovePersonalFile;
window.openMoveFolderPop = openMoveFolderPop;
window.confirmMovePersonalFolder = confirmMovePersonalFolder;
window.startRenamePersonalFile = startRenamePersonalFile;
window.commitRenamePersonalFile = commitRenamePersonalFile;
window.deletePersonalFile = deletePersonalFile;
window.closeFvPop = closeFvPop;

/* ──────────────────────────────────────────────
   初始化
   ────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  if(window.lucide) lucide.createIcons();
  const params = new URLSearchParams(window.location.search);

  const ta = document.getElementById('ai-textarea');
  if(ta){
    ta.addEventListener('input', () => autosize(ta));
    ta.addEventListener('keydown', e => {
      if(e.key === 'Enter' && !e.shiftKey){
        e.preventDefault();
        sendMessage();
      }
    });
  }

  refreshBarSend();

  /* 个人 KB 主页：scope=personal，初始化文件夹视图 */
  if(document.body.dataset.page === 'personal-home'){
    setCurrentKbScope('personal');
    renderPersonalFolderTree();
    renderPersonalFiles(_personalCurrentFolder);
    renderPersonalFolderView();
    syncPersonalHeroCounts();
  }

  /* 学校知识库主页：scope=school，三视图中的文件夹视图在本页渲染 */
  if(document.body.dataset.page === 'wiki-home'){
    setCurrentKbScope('school');
    renderPersonalFolderView();
  }

  const initialView = params.get('view');
  if((document.body.dataset.page === 'personal-home' || document.body.dataset.page === 'wiki-home') &&
    ['wiki', 'graph', 'folder'].includes(initialView)){
    switchView(initialView);
  }

  /* 飞象老师校园版：sidebar 240px 永远 expanded，不再永久 collapsed */
  /* Wiki 条目页原本默认折叠让出空间，现保持展开
  if(document.body.dataset.page === 'wiki-entry' && app){
    app.dataset.left = 'collapsed';
  }
  */

  if(params.get('imported') === '1'){
    showToast('（演示）导入完成，资料已更新到当前知识库', 2600);
    params.delete('imported');
    const query = params.toString();
    const base = window.location.pathname.split('/').pop() || 'school-wiki.html';
    const cleanUrl = query ? `${base}?${query}` : base;
    window.history.replaceState({}, '', cleanUrl);
  }

  /* 跨页对话路由：从历史页跳回工作台后再进入对话态 */
  const pageId = document.body.dataset.page || '';
  if(pageId === 'wiki-home' || pageId === 'personal-home'){
    const chatMode = params.get('chat');
    const initial = params.get('initial') || '';
    if(chatMode === 'resume'){
      openChat('resume');
    } else if(chatMode === 'new'){
      openChat('new', initial);
    }
  }

  document.addEventListener('keydown', e => {
    if((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k'){
      e.preventDefault();
      openTopSearch();
    }
    if((e.metaKey || e.ctrlKey) && e.key === '\\'){
      e.preventDefault();
      toggleSide('left');
    }
    if(e.key === 'Escape' && app.dataset.chat === 'open'){
      closeChat();
    }
    if(e.key === 'Escape'){
      closeAccountMenus();
      closeTopSearch();
    }
  });

  document.addEventListener('click', e => {
    if(!e.target.closest('.sb-account')) closeAccountMenus();
    if(!e.target.closest('.top-search-panel') && !e.target.closest('.tb-search') && !e.target.closest('.ph-search')) closeTopSearch();
  });

  /* C-1 / D-2 / D-4：注入反馈样式 + 给 03 段落加工具栏（不在 03 也安全无副作用） */
  injectChatExtrasStyle();
  enhanceWikiSections();
});

/* ──────────────────────────────────────────────
   反馈浮层 + 重新生成 + 段级反馈（D-2 / D-4 / C-1）
   - 一个浮层共用：答案点踩 + 段级"这段不对"
   - 点赞 = 直接 toast 落记录；点踩 = 弹反馈表单
   - 重新生成 = 拿最近一次 _lastUserText 重跑 runChatDemo
   ────────────────────────────────────────────── */

let _fbPop = null;
let _fbBackdrop = null;
let _fbContext = null;

function ensureFeedbackMounted(){
  if(_fbPop) return;
  _fbBackdrop = document.createElement('div');
  _fbBackdrop.className = 'fb-backdrop';
  _fbBackdrop.addEventListener('click', closeFeedback);
  document.body.appendChild(_fbBackdrop);

  _fbPop = document.createElement('div');
  _fbPop.className = 'fb-pop';
  document.body.appendChild(_fbPop);
}

function openFeedback(triggerEl, ctx){
  ensureFeedbackMounted();
  _fbContext = ctx || { type: 'answer', subject: '这条回答' };

  const presets = _fbContext.type === 'segment'
    ? ['内容不准', '解释生硬', '引用不对', '术语用错']
    : ['内容不准', '答非所问', '引用不对', '解释生硬'];

  const headTitle = _fbContext.type === 'segment' ? '这段反馈给飞象' : '这条回答反馈给飞象';
  const subjectLabel = _fbContext.subject ? '针对：' + escapeHtml(_fbContext.subject) : '帮飞象学习哪里出了问题';

  _fbPop.innerHTML = `
    <div class="fb-head">
      <div>
        <div class="fb-title">${headTitle}</div>
        <div class="fb-sub">${subjectLabel}</div>
      </div>
      <button class="fb-close" type="button" onclick="closeFeedback()" aria-label="关闭">
        <i data-lucide="x"></i>
      </button>
    </div>
    <div class="fb-tags">
      ${presets.map(p => `<button type="button" class="fb-tag" data-tag="${escapeHtml(p)}">${escapeHtml(p)}</button>`).join('')}
    </div>
    <textarea class="fb-text" id="fb-text" rows="3" placeholder="还可以告诉飞象具体哪里不对（可选）"></textarea>
    <div class="fb-foot">
      <button class="fb-cancel" type="button" onclick="closeFeedback()">取消</button>
      <button class="fb-submit" type="button" onclick="submitFeedback()">提交反馈</button>
    </div>
  `;

  _fbPop.querySelectorAll('.fb-tag').forEach(b => {
    b.addEventListener('click', () => b.classList.toggle('on'));
  });

  positionFeedbackPop(triggerEl);
  _fbBackdrop.classList.add('show');
  _fbPop.classList.add('show');
  if(window.lucide) lucide.createIcons();

  setTimeout(() => {
    const ta = _fbPop.querySelector('#fb-text');
    if(ta) ta.focus();
  }, 80);
}

function positionFeedbackPop(triggerEl){
  if(!_fbPop) return;
  const w = 320;
  _fbPop.style.width = w + 'px';
  if(!triggerEl){
    _fbPop.style.left = `${Math.max(8, (window.innerWidth - w) / 2)}px`;
    _fbPop.style.top = `${Math.max(60, window.innerHeight / 2 - 140)}px`;
    return;
  }
  const r = triggerEl.getBoundingClientRect();
  const h = _fbPop.offsetHeight || 220;
  let left = Math.max(8, Math.min(window.innerWidth - w - 8, r.right - w));
  let top = r.bottom + 8;
  if(top + h > window.innerHeight - 8){
    top = Math.max(8, r.top - h - 8);
  }
  _fbPop.style.left = left + 'px';
  _fbPop.style.top = top + 'px';
}

function closeFeedback(){
  if(_fbPop) _fbPop.classList.remove('show');
  if(_fbBackdrop) _fbBackdrop.classList.remove('show');
}

function submitFeedback(){
  if(!_fbPop) return;
  const tags = Array.from(_fbPop.querySelectorAll('.fb-tag.on')).map(b => b.dataset.tag);
  const ta = _fbPop.querySelector('#fb-text');
  const text = ta ? ta.value.trim() : '';
  closeFeedback();
  if(tags.length || text){
    showToast('已记录 · 谢谢反馈，飞象会改进');
  } else {
    showToast('已收到，谢谢');
  }
}

function thumbAnswer(triggerEl, kind){
  if(kind === 'up'){
    triggerEl.classList.add('voted');
    /* 兄弟点踩按钮恢复未选态 */
    const sib = triggerEl.parentElement && triggerEl.parentElement.querySelectorAll('.msg-fb-thumb');
    if(sib) sib.forEach(b => { if(b !== triggerEl) b.classList.remove('voted'); });
    showToast('已记录 · 谢谢反馈');
    return;
  }
  /* 点踩：弹反馈表单 */
  triggerEl.classList.add('voted');
  const sib = triggerEl.parentElement && triggerEl.parentElement.querySelectorAll('.msg-fb-thumb');
  if(sib) sib.forEach(b => { if(b !== triggerEl) b.classList.remove('voted'); });
  openFeedback(triggerEl, { type: 'answer', subject: '这条回答' });
}

function regenerateAnswer(){
  if(!_lastUserText){
    showToast('没有可重新生成的回答');
    return;
  }
  runChatDemo(_lastUserText);
}

window.openFeedback = openFeedback;
window.closeFeedback = closeFeedback;
window.submitFeedback = submitFeedback;
window.thumbAnswer = thumbAnswer;
window.regenerateAnswer = regenerateAnswer;

/* ──────────────────────────────────────────────
   C-1' / C-2'（已重做）：03 词条页"选中文本 → 加入对话"
   - 老师选中正文 → 浮起小气泡「💬 加入对话」
   - 点击 → 选中文本作为 markdown 引用（带词条名 + 段标题前缀）插到 bb-textarea
     顶部, focus + 滚动到对话框, 老师自由打字接续
   - 不再做段级"让 AI 改这段 / 这段不对"两按钮（认知糊 + 反馈黑洞 §3.20）
   - 累积策略: textarea 里多次"加入对话"会累积多个引用块, 老师可手动删除
   ────────────────────────────────────────────── */
function enhanceWikiSections(){
  /* C-3：03 段末「来源：xx · 页码」的 .flink hover 出原文片段 */
  document.querySelectorAll('.entry-cite .flink').forEach(el => {
    if(el.hasAttribute('data-src-hover')) return;
    el.setAttribute('data-src-hover', '');
    /* textContent 直接当 key（"导入课件.pptx · P3"），SOURCE_DATA 已对齐 */
  });
  if(typeof bindSourceHovers === 'function') bindSourceHovers(document);
  /* 选中文本浮气泡只在 03 词条页挂载 */
  if(document.querySelector('.entry-text, .entry-sec')){
    setupSelectionToChat();
  }
  if(window.lucide) lucide.createIcons();
}

/* ──────────────────────────────────────────────
   选中文本 → 加入对话（cursor-style）
   ────────────────────────────────────────────── */
let _selPop = null;
let _selPopHideTimer = null;
const SEL_MIN_CHARS = 6;
const SEL_QUOTE_MAX = 140;

function setupSelectionToChat(){
  if(window._selToChatBound) return;
  window._selToChatBound = true;
  document.addEventListener('mouseup', handleSelectionMouseUp);
  document.addEventListener('selectionchange', () => {
    /* 选中清空时立刻隐藏气泡 */
    const sel = window.getSelection();
    if(!sel || !sel.toString().trim()){
      hideSelPop();
    }
  });
  document.addEventListener('mousedown', e => {
    if(_selPop && !_selPop.contains(e.target)) hideSelPop();
  });
}

function handleSelectionMouseUp(e){
  /* 排除：点在气泡上 / 点在 textarea 内 / 点在 chat 气泡内 */
  if(_selPop && _selPop.contains(e.target)) return;
  if(e.target.closest && (e.target.closest('.bb-bar, .bb-textarea, .msg, .chat-msg'))) return;
  setTimeout(() => {
    const sel = window.getSelection();
    if(!sel || sel.rangeCount === 0) return;
    const text = sel.toString().trim();
    if(text.length < SEL_MIN_CHARS){ hideSelPop(); return; }
    const range = sel.getRangeAt(0);
    /* 必须落在词条正文区内（.entry-text / .entry-sec / .entry-cite），排除标题 / chat / 顶栏 */
    const anchor = range.commonAncestorContainer.nodeType === 1
      ? range.commonAncestorContainer
      : range.commonAncestorContainer.parentElement;
    if(!anchor) { hideSelPop(); return; }
    if(!anchor.closest('.entry-text, .entry-sec, .entry-cite, .entry-list')){ hideSelPop(); return; }
    if(anchor.closest('.msg, .chat-msg, .bb-bar, .es-tools')) { hideSelPop(); return; }
    showSelPop(range, text);
  }, 0);
}

function ensureSelPopMounted(){
  if(_selPop) return;
  _selPop = document.createElement('div');
  _selPop.className = 'sel-pop';
  _selPop.innerHTML = `
    <button type="button" class="sel-pop-btn" data-act="add-to-chat">
      <i data-lucide="message-square-plus"></i><span>加入对话</span>
    </button>
  `;
  _selPop.querySelector('[data-act="add-to-chat"]').addEventListener('click', () => {
    if(_selPop && _selPop.dataset.text){
      addSelectionToChat(_selPop.dataset.text, _selPop.dataset.section || '');
    }
  });
  document.body.appendChild(_selPop);
}

function showSelPop(range, text){
  ensureSelPopMounted();
  clearTimeout(_selPopHideTimer);
  /* 找选中所在的最近 .entry-sec[id] 拿段标题（"1 · 开口方向"），找不到 fallback "正文" */
  const node = range.commonAncestorContainer.nodeType === 1
    ? range.commonAncestorContainer
    : range.commonAncestorContainer.parentElement;
  const sec = node && node.closest ? node.closest('.entry-sec[id]') : null;
  const sectionTitle = sec && sec.querySelector('.entry-h2')
    ? sec.querySelector('.entry-h2').textContent.trim()
    : '正文';
  _selPop.dataset.text = text;
  _selPop.dataset.section = sectionTitle;
  /* 定位：选中末端下方 6px，靠左对齐选中起点 */
  const rects = range.getClientRects();
  const lastRect = rects.length ? rects[rects.length - 1] : range.getBoundingClientRect();
  const popW = 116, popH = 32;
  let left = Math.min(window.innerWidth - popW - 12, Math.max(12, lastRect.right - popW));
  let top = lastRect.bottom + 6;
  if(top + popH > window.innerHeight - 12){
    top = Math.max(12, lastRect.top - popH - 6);
  }
  _selPop.style.left = left + 'px';
  _selPop.style.top = top + 'px';
  _selPop.classList.add('show');
  if(window.lucide) lucide.createIcons();
}

function hideSelPop(){
  if(_selPop) _selPop.classList.remove('show');
}

function addSelectionToChat(text, sectionTitle){
  const ta = document.getElementById('bb-textarea');
  if(!ta){
    showToast('对话框不可用');
    return;
  }
  /* 取词条名 */
  const titleEl = document.querySelector('.entry-title');
  const entryName = titleEl ? titleEl.textContent.trim() : '本词条';
  /* 截断长引用 */
  const oneLine = text.replace(/\s+/g, ' ').trim();
  const cut = oneLine.length > SEL_QUOTE_MAX ? (oneLine.slice(0, SEL_QUOTE_MAX) + '…') : oneLine;
  const header = `> 来自《${entryName}》${sectionTitle ? ' · ' + sectionTitle : ''}：`;
  const block = `${header}\n> ${cut}\n\n`;
  /* 累积：插到 textarea 顶部，老师已打的指令保留在下方 */
  const existing = ta.value;
  ta.value = block + existing;
  if(typeof autosize === 'function') autosize(ta);
  if(typeof refreshBarSend === 'function') refreshBarSend();
  /* 光标移到末尾，方便老师继续打字 */
  setTimeout(() => {
    ta.focus();
    const pos = ta.value.length;
    ta.setSelectionRange(pos, pos);
    ta.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, 0);
  hideSelPop();
  /* 清空浏览器选区，避免气泡反复出现 */
  const sel = window.getSelection();
  if(sel && sel.removeAllRanges) sel.removeAllRanges();
  showToast('已加入对话，输入指令后按 Enter 发送');
}

/* ──────────────────────────────────────────────
   D-3 + C-3：信源回查浮卡（共用 source-popover 组件）
   - 触发：hover 任何 [data-src-hover] 元素 → 弹卡（文件名 + 定位 + 片段 + 作者更新 + 打开原文件）
   - 用法：03 .entry-cite .flink 由 enhanceWikiSections 自动打标
           chat 答案 [1][2] 标号在 runChatDemo 拼装时手打 data-src-key
   ────────────────────────────────────────────── */

const SOURCE_DATA = {
  '导入课件.pptx · P3': { file: '导入课件.pptx', locator: 'P3', snippet: '将抛物线 y = ax² + bx + c 按 a 的正负画出开口方向：a>0 开口向上有最小值；a<0 开口向下有最大值；|a| 越大开口越窄。', author: '张老师', updated: '5 天前' },
  '教学设计 · P2': { file: '教学设计·二次函数.docx', locator: 'P2', snippet: '从抛物线轨迹引入开口方向，分情况讨论 a 对图象的影响（板书示意图）。', author: '张老师', updated: '5 天前' },
  '教学设计 · P5': { file: '教学设计·二次函数.docx', locator: 'P5', snippet: '推荐配方为顶点式 y = a(x-h)²+k，顶点直接是 (h,k)，避开公式 (-b/(2a), (4ac-b²)/(4a)) 的记忆错误。', author: '张老师', updated: '5 天前' },
  '配套习题汇编.pdf · P12': { file: '八下函数·配套习题汇编.pdf', locator: 'P12', snippet: '题：已知 y = -2x²+4x-1，求对称轴方程与顶点坐标。考查 §2 对称轴 + §3 顶点配方法。', author: '教研组共建', updated: '1 个月前' },
  '配套习题汇编.pdf · P15': { file: '八下函数·配套习题汇编.pdf', locator: 'P15', snippet: '判别式 Δ 与 x 轴交点关系：Δ>0 两交点；Δ=0 相切；Δ<0 无交点。配套例题 12 道。', author: '教研组共建', updated: '1 个月前' },
  '公开课板书 · 王建华': { file: '王建华·公开课板书.pdf', locator: '第 2 张', snippet: '推导对称轴：从顶点式 y = a(x-h)²+k 反推 h = -b/(2a)，由对称性证明。', author: '王建华', updated: '2 周前' },
  '赵明杰·错题剖析': { file: '赵明杰·错题剖析.docx', locator: '§3 顶点', snippet: '常见错点：求顶点时把 -b/(2a) 写成 b/(2a)（遗漏负号）。建议先配方再求顶点，避开公式记忆错误。', author: '赵明杰', updated: '2 周前' },
  '海淀区 2026 一模卷 · T6': { file: '海淀区 2026 一模卷·数学.pdf', locator: 'T6', snippet: '已知 y = mx² + (m-1)x - 2 在 [0,2] 上单调递减，求 m 的取值范围。考查增减性 + 含参不等式综合。', author: '李素芬', updated: '1 周前' },
  '八(3)班·错题精选': { file: '八(3)班·错题精选.xlsx', locator: '§4 增减性', snippet: '高频错点统计（35 份样本）：87% 学生把 m 当已知数代入，忽略对称轴随参数变化；建议先讲对称轴位置随 m 移动。', author: '张老师', updated: '3 周前' },
  '北京中考真题 2021-2025': { file: '北京中考真题 2021-2025（5 份合集）', locator: '8 处引用', snippet: '近 5 年北京中考函数综合：6/10 出现"判别式 + 函数图象"题型；3/10 涉及含参数顶点求最值；建议作为综合题压轴训练。', author: '学校公共库', updated: '3 周前' },
};

let _srcPop = null;
let _srcHideTimer = null;

function ensureSourcePopMounted(){
  if(_srcPop) return;
  _srcPop = document.createElement('div');
  _srcPop.className = 'src-pop';
  _srcPop.addEventListener('mouseenter', () => clearTimeout(_srcHideTimer));
  _srcPop.addEventListener('mouseleave', scheduleHideSourcePop);
  document.body.appendChild(_srcPop);
}

function showSourcePop(triggerEl){
  ensureSourcePopMounted();
  clearTimeout(_srcHideTimer);
  const key = (triggerEl.dataset.srcKey || '').trim() || (triggerEl.textContent || '').trim();
  const data = SOURCE_DATA[key] || { file: key, locator: '', snippet: '（演示数据·点击下方按钮可打开原文件）' };
  const safeKey = key.replace(/'/g, "\\'");
  _srcPop.innerHTML = `
    <div class="src-pop-head">
      <i data-lucide="file-text"></i>
      <div class="src-pop-title">${escapeHtml(data.file || key)}</div>
      ${data.locator ? `<span class="src-pop-loc">${escapeHtml(data.locator)}</span>` : ''}
    </div>
    <div class="src-pop-snippet">${escapeHtml(data.snippet || '')}</div>
    <div class="src-pop-foot">
      <span class="src-pop-meta">${data.author ? escapeHtml(data.author) + ' · ' + escapeHtml(data.updated || '') : '老师上传 · 教研组共建'}</span>
      <button class="src-pop-open" type="button" onclick="openSource('${safeKey}')">
        <i data-lucide="external-link"></i><span>打开原文件</span>
      </button>
    </div>
  `;
  positionSourcePop(triggerEl);
  _srcPop.classList.add('show');
  if(window.lucide) lucide.createIcons();
}

function positionSourcePop(triggerEl){
  if(!_srcPop || !triggerEl) return;
  const w = 340;
  _srcPop.style.width = w + 'px';
  const r = triggerEl.getBoundingClientRect();
  /* 临时显示一下读高度，再决定位置 */
  _srcPop.style.visibility = 'hidden';
  _srcPop.style.display = 'block';
  const h = _srcPop.offsetHeight || 160;
  _srcPop.style.display = '';
  _srcPop.style.visibility = '';
  let left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left));
  let top = r.bottom + 6;
  if(top + h > window.innerHeight - 8){
    top = Math.max(8, r.top - h - 6);
  }
  _srcPop.style.left = left + 'px';
  _srcPop.style.top = top + 'px';
}

function scheduleHideSourcePop(){
  clearTimeout(_srcHideTimer);
  _srcHideTimer = setTimeout(() => {
    if(_srcPop) _srcPop.classList.remove('show');
  }, 140);
}

function bindSourceHovers(rootEl){
  const root = rootEl || document;
  root.querySelectorAll('[data-src-hover]:not([data-src-bound])').forEach(el => {
    el.dataset.srcBound = '1';
    el.addEventListener('mouseenter', () => showSourcePop(el));
    el.addEventListener('mouseleave', scheduleHideSourcePop);
  });
}

function openSource(label){
  if(_srcPop) _srcPop.classList.remove('show');
  showToast('（演示）打开 ' + label);
}

window.openSource = openSource;
window.bindSourceHovers = bindSourceHovers;

/* ──────────────────────────────────────────────
   反馈 / 段级工具样式（自包含，不污染 v28.css）
   ────────────────────────────────────────────── */
function injectChatExtrasStyle(){
  if(document.getElementById('v28-chat-extras-style')) return;
  const style = document.createElement('style');
  style.id = 'v28-chat-extras-style';
  style.textContent = `
    /* 答案末尾反馈条 */
    .msg-fb-bar{
      margin-top:10px; padding-top:8px;
      border-top:1px dashed var(--border, #E5E2DA);
      display:flex; align-items:center; gap:6px;
    }
    .msg-fb-btn{
      display:inline-flex; align-items:center; gap:5px;
      padding:5px 10px; height:26px;
      background:transparent; border:1px solid var(--border, #E5E2DA);
      border-radius:13px; font-size:12px; color:var(--text-3, #777264);
      cursor:pointer; transition:all .15s;
    }
    .msg-fb-btn [data-lucide]{ width:13px; height:13px; }
    .msg-fb-btn:hover{
      color:var(--text, #2C2A24); border-color:var(--text-4, #B6AFA1);
      background:var(--surface-3, #F5F2EB);
    }
    .msg-fb-sep{ flex:1; }
    .msg-fb-thumb{
      width:28px; height:26px; padding:0;
      background:transparent; border:1px solid transparent;
      border-radius:8px; color:var(--text-4, #B6AFA1);
      cursor:pointer; display:grid; place-items:center;
      transition:all .15s;
    }
    .msg-fb-thumb [data-lucide]{ width:13px; height:13px; }
    .msg-fb-thumb:hover{
      color:var(--text-2, #4F4A40);
      background:var(--surface-3, #F5F2EB);
    }
    .msg-fb-thumb.voted{
      color:var(--gold-deep, #8B6914); background:var(--gold-bg, #FAF6EC);
    }

    /* 反馈浮层 */
    .fb-backdrop{
      position:fixed; inset:0; background:rgba(30,24,14,.18);
      opacity:0; pointer-events:none; transition:opacity .18s;
      z-index:200;
    }
    .fb-backdrop.show{ opacity:1; pointer-events:auto; }
    .fb-pop{
      position:fixed; width:320px; background:var(--surface, #fff);
      border:1px solid var(--border, #E5E2DA); border-radius:14px;
      box-shadow:0 24px 60px -22px rgba(30,24,14,.32);
      padding:14px 14px 12px; z-index:201;
      opacity:0; transform:translateY(-4px); pointer-events:none;
      transition:opacity .18s, transform .18s;
    }
    .fb-pop.show{ opacity:1; transform:translateY(0); pointer-events:auto; }
    .fb-head{ display:flex; align-items:flex-start; justify-content:space-between; gap:8px; }
    .fb-title{ font-size:13.5px; font-weight:700; color:var(--text, #2C2A24); }
    .fb-sub{ margin-top:2px; font-size:11.5px; color:var(--text-3, #777264); line-height:1.4; }
    .fb-close{
      width:24px; height:24px; padding:0;
      background:transparent; border:0; border-radius:6px;
      color:var(--text-4, #B6AFA1); cursor:pointer;
      display:grid; place-items:center; flex-shrink:0;
    }
    .fb-close [data-lucide]{ width:14px; height:14px; }
    .fb-close:hover{ background:var(--surface-3, #F5F2EB); color:var(--text-2, #4F4A40); }

    .fb-tags{
      margin-top:11px;
      display:flex; flex-wrap:wrap; gap:6px;
    }
    .fb-tag{
      padding:5px 10px; height:26px;
      border:1px solid var(--border, #E5E2DA); border-radius:13px;
      background:var(--surface, #fff); font-size:12px;
      color:var(--text-2, #4F4A40); cursor:pointer; transition:all .15s;
    }
    .fb-tag:hover{ border-color:var(--text-4, #B6AFA1); }
    .fb-tag.on{
      background:var(--gold-bg, #FAF6EC); border-color:var(--gold-light, #E0CC93);
      color:var(--gold-deep, #8B6914); font-weight:600;
    }

    .fb-text{
      width:100%; margin-top:10px; padding:8px 10px;
      border:1px solid var(--border, #E5E2DA); border-radius:9px;
      font-size:12.5px; color:var(--text, #2C2A24);
      font-family:inherit; resize:none; line-height:1.5;
      background:var(--surface, #fff); transition:border-color .15s;
    }
    .fb-text:focus{ outline:none; border-color:var(--gold, #C9A227); }

    .fb-foot{
      margin-top:11px;
      display:flex; justify-content:flex-end; gap:8px;
    }
    .fb-cancel, .fb-submit{
      padding:6px 14px; height:30px;
      border-radius:8px; font-size:12.5px; cursor:pointer;
      transition:all .15s;
    }
    .fb-cancel{
      background:transparent; border:1px solid var(--border, #E5E2DA);
      color:var(--text-2, #4F4A40);
    }
    .fb-cancel:hover{ background:var(--surface-3, #F5F2EB); }
    .fb-submit{
      background:var(--text, #2C2A24); border:1px solid var(--text, #2C2A24);
      color:#fff; font-weight:600;
    }
    .fb-submit:hover{ background:#1A1812; border-color:#1A1812; }

    /* 03 选中文本浮气泡（cursor-style "加入对话"） */
    .sel-pop{
      position:fixed; z-index:210;
      display:inline-flex; align-items:center;
      padding:0; background:var(--text, #2C2A24);
      border-radius:8px;
      box-shadow:0 12px 28px -10px rgba(30,24,14,.32), 0 2px 6px -2px rgba(30,24,14,.18);
      opacity:0; transform:translateY(-3px) scale(.96);
      pointer-events:none;
      transition:opacity .14s, transform .14s;
    }
    .sel-pop.show{ opacity:1; transform:translateY(0) scale(1); pointer-events:auto; }
    .sel-pop-btn{
      display:inline-flex; align-items:center; gap:5px;
      padding:7px 12px; height:32px;
      background:transparent; border:0; cursor:pointer;
      color:#fff; font-size:12px; font-weight:600;
      border-radius:8px;
    }
    .sel-pop-btn [data-lucide]{ width:13px; height:13px; color:var(--gold-light, #E0CC93); }
    .sel-pop-btn:hover{ background:rgba(255,255,255,.06); }
    .sel-pop-btn:active{ transform:scale(.97); }

    /* D-3：答案里 cite-link 上标 + 引用 chips */
    .cite-link .cite-sup{
      font-size:9.5px; vertical-align:super; line-height:1;
      margin-left:1px; padding:0 2px;
      color:var(--gold-deep, #8B6914); font-weight:700;
      letter-spacing:0;
    }
    .msg-cites{
      margin-top:8px; display:flex; flex-wrap:wrap; align-items:center; gap:6px;
      font-size:11.5px; color:var(--text-3, #777264);
    }
    .msg-cites > [data-lucide]{ width:13px; height:13px; flex-shrink:0; }
    .msg-cites-label{ flex-shrink:0; }
    .msg-cite-chip{
      display:inline-flex; align-items:center; gap:4px;
      padding:3px 9px; height:22px;
      background:var(--surface-3, #F5F2EB); border:1px solid transparent;
      border-radius:11px; font-size:11.5px; color:var(--text-2, #4F4A40);
      cursor:pointer; transition:all .15s;
      max-width:100%;
    }
    .msg-cite-chip b{
      color:var(--gold-deep, #8B6914); font-weight:700;
      font-variant-numeric:tabular-nums;
    }
    .msg-cite-chip:hover{
      border-color:var(--gold-light, #E0CC93);
      background:var(--gold-bg, #FAF6EC);
      color:var(--text, #2C2A24);
    }

    /* D-3 + C-3：信源回查浮卡 */
    .src-pop{
      position:fixed; width:340px; background:var(--surface, #fff);
      border:1px solid var(--border, #E5E2DA); border-radius:12px;
      box-shadow:0 24px 56px -22px rgba(30,24,14,.28);
      z-index:202; overflow:hidden;
      opacity:0; transform:translateY(-3px); pointer-events:none;
      transition:opacity .14s, transform .14s;
    }
    .src-pop.show{ opacity:1; transform:translateY(0); pointer-events:auto; }
    .src-pop-head{
      display:flex; align-items:center; gap:7px;
      padding:10px 12px 6px;
    }
    .src-pop-head [data-lucide]{ width:14px; height:14px; color:var(--gold, #C9A227); flex-shrink:0; }
    .src-pop-title{
      flex:1; font-size:12.5px; font-weight:700; color:var(--text, #2C2A24);
      overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
    }
    .src-pop-loc{
      flex-shrink:0; font-size:11px; color:var(--gold-deep, #8B6914);
      background:var(--gold-bg, #FAF6EC); border-radius:4px;
      padding:1px 6px; font-variant-numeric:tabular-nums;
    }
    .src-pop-snippet{
      padding:4px 12px 10px;
      font-size:12px; line-height:1.55; color:var(--text-2, #4F4A40);
      max-height:120px; overflow:hidden;
      display:-webkit-box; -webkit-line-clamp:5; -webkit-box-orient:vertical;
    }
    .src-pop-foot{
      display:flex; align-items:center; justify-content:space-between; gap:8px;
      padding:8px 12px; border-top:1px solid var(--border, #E5E2DA);
      background:var(--surface-2, #FAF8F2);
    }
    .src-pop-meta{
      font-size:11px; color:var(--text-3, #777264);
      overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
    }
    .src-pop-open{
      flex-shrink:0;
      display:inline-flex; align-items:center; gap:4px;
      padding:4px 10px; height:24px;
      background:var(--text, #2C2A24); border:0;
      border-radius:6px; color:#fff; font-size:11.5px; font-weight:600;
      cursor:pointer; transition:background .15s;
    }
    .src-pop-open [data-lucide]{ width:12px; height:12px; }
    .src-pop-open:hover{ background:#1A1812; }
  `;
  document.head.appendChild(style);
}
