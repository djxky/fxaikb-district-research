/**
 * 飞象老师校园版 · 统一侧边栏注入器
 *
 * 用法：
 *   1. 在页面 <head> 引入：
 *      <link rel="stylesheet" href="assets/feixiang-shell.css">
 *   2. 在 <body> 里放置容器：
 *      <aside id="feixiang-sidebar"></aside>
 *   3. 引入并调用：
 *      <script src="assets/feixiang-shell.js"></script>
 *      <script>renderFeixiangSidebar('my-wiki');</script>
 *
 *   activeKey 取值（决定哪个菜单项高亮）：
 *     'home' | 'chat' | 'chat-history' | 'my-apps' | 'my-wiki'
 *     | 'school-wiki' | 'apps' | 'resources'
 */

(function () {
  const ICONS = {
    plus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>',
    history: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
    person: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/><circle cx="12" cy="7" r="4"/></svg>',
    school: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
    apps: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>',
    resources: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 12 12 17 22 12"/><polyline points="2 17 12 22 22 17"/></svg>',
    classes: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    bell: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
    dashboard: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>',
    shield: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V5l8-3 8 3v8z"/><path d="m9 12 2 2 4-4"/></svg>',
    sparkle: '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/></svg>',
    chevron: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>',
    home: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/></svg>',
    panel: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/><path d="m15 9-3 3 3 3"/></svg>',
  };

  const KB_SIDEBAR_STATE = {
    personal: {
      fileCount: 87,
      updatedAt: 'today-09:14',
      storageKey: 'fx_kb_last_opened_at_personal'
    },
    school: {
      fileCount: 925,
      updatedAt: 'today-09:14',
      storageKey: 'fx_kb_last_opened_at_school'
    }
  };

  function getDemoTodayTime(hour, minute){
    const d = new Date();
    d.setHours(hour, minute, 0, 0);
    return d.getTime();
  }

  function resolveKbUpdatedAt(value){
    if(value === 'today-09:14') return getDemoTodayTime(9, 14);
    const parsed = Date.parse(value || '');
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function getKbLastOpenedAt(meta){
    try{
      const raw = localStorage.getItem(meta.storageKey);
      const n = Number(raw);
      return Number.isFinite(n) ? n : 0;
    }catch(e){
      return 0;
    }
  }

  function getKbSidebarState(kbId){
    const meta = KB_SIDEBAR_STATE[kbId];
    if(!meta) return { fileCount: '', hasUpdate: false };
    const updatedAt = resolveKbUpdatedAt(meta.updatedAt);
    const lastOpenedAt = getKbLastOpenedAt(meta);
    return {
      fileCount: meta.fileCount,
      hasUpdate: updatedAt > lastOpenedAt
    };
  }

  function recordKbOpened(kbId){
    const meta = KB_SIDEBAR_STATE[kbId];
    if(!meta) return;
    try{
      localStorage.setItem(meta.storageKey, String(Date.now()));
    }catch(e){}
  }

  /* ---- toast 兜底：如果页面没有 showToast，提供一个 ---- */
  function ensureToastFallback() {
    if (typeof window.showToast === 'function') return;
    if (!document.getElementById('toast')) {
      const t = document.createElement('div');
      t.id = 'toast';
      t.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:rgba(17,17,16,0.92);color:#fff;padding:10px 18px;border-radius:22px;font-size:12.5px;opacity:0;pointer-events:none;transition:opacity .2s;z-index:9999;backdrop-filter:blur(6px)';
      document.body.appendChild(t);
    }
    let timer = null;
    window.showToast = function (msg) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.style.opacity = '1';
      clearTimeout(timer);
      timer = setTimeout(() => (t.style.opacity = '0'), 2400);
    };
  }

  /* ---- 注入下拉 / Popup 所需样式（不重复注入） ---- */
  function injectPopupStyles() {
    if (document.getElementById('fx-pop-styles')) return;
    const css = `
      .fx-pop {
        position: fixed;
        background: #fff;
        border: 1px solid rgba(0,0,0,0.12);
        border-radius: 14px;
        padding: 6px;
        box-shadow: 0 18px 48px rgba(0,0,0,0.10);
        z-index: 99999;
        min-width: 240px;
      }
      .fx-pop-section-title {
        font-size: 11px; color: #a19f99; font-weight: 600;
        padding: 8px 12px 4px;
      }
      .fx-pop button {
        width: 100%; text-align: left;
        padding: 9px 12px; border-radius: 8px;
        font-size: 13px; cursor: pointer;
        display: flex; align-items: center; gap: 10px;
        color: #111110; border: 0; background: transparent;
        font-family: inherit;
      }
      .fx-pop button:hover { background: #f4f3ef; }
      .fx-pop button.active { background: #fbf5e6; color: #a87e2c; font-weight: 600; }
      .fx-pop button svg { width: 14px; height: 14px; flex-shrink: 0; color: #a19f99; }
      .fx-pop button.active svg { color: #a87e2c; }
      .fx-pop-submenu { position: relative; }
      .fx-pop-submenu > button::after {
        content: '';
        width: 6px; height: 6px;
        border-top: 1.5px solid currentColor;
        border-right: 1.5px solid currentColor;
        transform: rotate(45deg);
        margin-left: auto;
        opacity: .55;
      }
      .fx-pop-flyout {
        position: absolute;
        left: calc(100% - 1px);
        bottom: -6px;
        width: 252px;
        background: #fff;
        border: 1px solid rgba(0,0,0,0.12);
        border-radius: 14px;
        padding: 6px;
        box-shadow: 0 18px 48px rgba(0,0,0,0.10);
        opacity: 0;
        transform: translateX(-4px);
        pointer-events: none;
        transition: opacity .12s ease, transform .12s ease;
      }
      .fx-pop-submenu:hover .fx-pop-flyout,
      .fx-pop-submenu:focus-within .fx-pop-flyout {
        opacity: 1;
        transform: translateX(0);
        pointer-events: auto;
      }
      .fx-pop-divider { height: 1px; background: rgba(0,0,0,0.06); margin: 4px 8px; }
      .fx-pop-meta { font-size: 11px; color: #a19f99; font-weight: 400; margin-top: 1px; }
      .fx-pop-row-body { flex: 1; min-width: 0; }
      .fx-pop-row-title { font-size: 13px; line-height: 1.3; }
      .fx-notif-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 10px 8px;
        border-bottom: 1px solid rgba(0,0,0,0.06);
      }
      .fx-notif-head-title {
        font-size: 13.5px;
        font-weight: 700;
        color: #111110;
      }
      .fx-pop .fx-notif-clear {
        width: auto;
        padding: 2px 6px;
        border-radius: 6px;
        color: #8a8880;
        font-size: 11.5px;
        font-weight: 500;
      }
      .fx-pop .fx-notif-clear:hover {
        color: #6b6a65;
        background: #f4f3ef;
      }
      .fx-notif-list {
        max-height: min(420px, calc(100vh - 180px));
        overflow-y: auto;
        overscroll-behavior: contain;
        padding: 6px 0 2px;
        scrollbar-width: thin;
        scrollbar-color: rgba(0,0,0,0.18) transparent;
      }
      .fx-notif-list::-webkit-scrollbar { width: 6px; }
      .fx-notif-list::-webkit-scrollbar-thumb {
        background: rgba(0,0,0,0.16);
        border-radius: 999px;
      }
      .fx-notif-list::-webkit-scrollbar-track { background: transparent; }
      .fx-notif-item {
        padding: 12px; border-radius: 10px;
        display: flex; gap: 10px; cursor: pointer;
      }
      .fx-notif-item:hover { background: #f4f3ef; }
      .fx-notif-dot {
        width: 7px; height: 7px; border-radius: 50%;
        background: #e65252; margin-top: 6px; flex-shrink: 0;
      }
      .fx-notif-dot.read { background: transparent; }
      .fx-notif-body { flex: 1; min-width: 0; }
      .fx-notif-title { font-size: 13px; font-weight: 600; color: #111110; margin-bottom: 2px; line-height: 1.4; }
      .fx-notif-desc { font-size: 12px; color: #6b6a65; line-height: 1.5; }
      .fx-notif-time { font-size: 11px; color: #a19f99; margin-top: 4px; }
      .fx-workspace { position: relative; }
      .fx-ws-arrow { transition: transform .2s; }
      .fx-workspace.open .fx-ws-arrow { transform: rotate(180deg); }
    `;
    const style = document.createElement('style');
    style.id = 'fx-pop-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function closeAllPops() {
    document.getElementById('fx-ws-pop')?.remove();
    document.getElementById('fx-notif-pop')?.remove();
    document.querySelector('.fx-user-btn')?.classList.remove('open');
  }

  const FX_NOTIF_READ_KEY = 'fx-school-demo-notifications-read';

  function hasUnreadFxNotifs() {
    try {
      return localStorage.getItem(FX_NOTIF_READ_KEY) !== '1';
    } catch {
      return true;
    }
  }

  function markFxNotifsRead() {
    try {
      localStorage.setItem(FX_NOTIF_READ_KEY, '1');
    } catch {}
    document.querySelectorAll('[data-fx-nav-key="notifications"] .fx-nav-right').forEach((el) => el.remove());
  }

  /* ---- 用户区下拉 · 账号 + 工作空间切换（取代原 workspace 下拉） ---- */
  window.toggleFxUserMenu = function (e) {
    e.stopPropagation();
    const btn = e.currentTarget;
    if (btn.classList.contains('open')) { closeAllPops(); return; }
    closeAllPops();
    btn.classList.add('open');
    const rect = btn.getBoundingClientRect();
    const popWidth = 260;
    const pop = document.createElement('div');
    pop.className = 'fx-pop';
    pop.id = 'fx-ws-pop';
    pop.style.position = 'fixed';
    pop.style.left = rect.left + 'px';
    pop.style.bottom = (window.innerHeight - rect.top + 6) + 'px';
    pop.style.width = popWidth + 'px';
    pop.innerHTML = `
      <div style="padding:10px 12px 6px;border-bottom:1px solid rgba(0,0,0,0.06);margin-bottom:4px">
        <div style="font-size:13.5px;font-weight:700;color:#111110">张老师</div>
        <div style="font-size:11.5px;color:#6b6a65;margin-top:2px">13800138000</div>
      </div>
      <div class="fx-pop-submenu">
        <button onclick="event.stopPropagation()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 2v4M16 2v4M3 10h18"/></svg>
          <div class="fx-pop-row-body"><div class="fx-pop-row-title">切换空间</div></div>
        </button>
        <div class="fx-pop-flyout">
          <div class="fx-pop-section-title">校园版</div>
          <button class="active" onclick="event.stopPropagation();closeFxAll();showToast('当前 · 北京市实验中学')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            <div class="fx-pop-row-body"><div class="fx-pop-row-title">北京市实验中学</div></div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="color:#a87e2c"><path d="M5 13l4 4L19 7"/></svg>
          </button>
          <button onclick="event.stopPropagation();closeFxAll();showToast('（演示）切换到 · 人大附中')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            <div class="fx-pop-row-body"><div class="fx-pop-row-title">人大附中</div></div>
          </button>
          <div class="fx-pop-section-title">个人版</div>
          <button onclick="event.stopPropagation();closeFxAll();showToast('（演示）切换到 · 飞象个人版')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/></svg>
            <div class="fx-pop-row-body"><div class="fx-pop-row-title">张老师 · 飞象个人版</div></div>
          </button>
        </div>
      </div>
      <div class="fx-pop-divider"></div>
      <button onclick="event.stopPropagation();closeFxAll();showToast('（演示）账号设置')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        <div class="fx-pop-row-body"><div class="fx-pop-row-title">账号设置</div></div>
      </button>
      <button onclick="event.stopPropagation();closeFxAll();window.location.href='teacher-login.html?logout=1'">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        <div class="fx-pop-row-body"><div class="fx-pop-row-title">退出登录</div></div>
      </button>
    `;
    document.body.appendChild(pop);
    setTimeout(() => document.addEventListener('click', closeAllPops, { once: true }), 50);
  };

  /* 向后兼容旧代码可能还在调 toggleWsMenu */
  window.toggleWsMenu = function (e) { 
    e?.stopPropagation();
    window.location.href = 'index.html';
  };

  /* ---- 通知下拉 ---- */
  window.toggleFxNotif = function (e) {
    e.stopPropagation();
    if (document.getElementById('fx-notif-pop')) { closeAllPops(); return; }
    closeAllPops();
    markFxNotifsRead();
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const pop = document.createElement('div');
    pop.className = 'fx-pop';
    pop.id = 'fx-notif-pop';
    pop.style.bottom = (window.innerHeight - rect.top + 6) + 'px';
    pop.style.left = (rect.right + 8) + 'px';
    pop.style.width = '320px';
    pop.style.padding = '8px';
    pop.innerHTML = `
      <div class="fx-notif-head">
        <div class="fx-notif-head-title">通知</div>
        <button class="fx-notif-clear" onclick="event.stopPropagation();showToast('（演示）全部已读');closeFxAll()">全部已读</button>
      </div>
      <div class="fx-notif-list">
        <div class="fx-notif-item" onclick="closeFxAll();window.location.href='ai-record-jobs.html'">
          <span class="fx-notif-dot read"></span>
          <div class="fx-notif-body">
            <div class="fx-notif-title">错因报告已生成</div>
            <div class="fx-notif-desc">高一(3)班期中模拟卷已整理出 6 类共性错因</div>
            <div class="fx-notif-time">5 分钟前</div>
          </div>
        </div>
        <div class="fx-notif-item" onclick="closeFxAll();window.location.href='ai-qbank.html'">
          <span class="fx-notif-dot read"></span>
          <div class="fx-notif-body">
            <div class="fx-notif-title">AI 题库处理完成</div>
            <div class="fx-notif-desc">《函数单调性》资料已生成 24 道分层练习题</div>
            <div class="fx-notif-time">2 小时前</div>
          </div>
        </div>
        <div class="fx-notif-item" onclick="closeFxAll();window.location.href='compose-sheet.html'">
          <span class="fx-notif-dot read"></span>
          <div class="fx-notif-body">
            <div class="fx-notif-title">作文个册已生成</div>
            <div class="fx-notif-desc">高一(5)班 42 份作文已生成学生个人反馈册</div>
            <div class="fx-notif-time">今天 09:12</div>
          </div>
        </div>
        <div class="fx-notif-item" style="opacity:.72" onclick="closeFxAll();window.location.href='ai-record-jobs.html'">
          <span class="fx-notif-dot read"></span>
          <div class="fx-notif-body">
            <div class="fx-notif-title">AI 录题已完成</div>
            <div class="fx-notif-desc">12 页手写题目已结构化录入到题库草稿</div>
            <div class="fx-notif-time">昨天 16:30</div>
          </div>
        </div>
        <div class="fx-notif-item" style="opacity:.72" onclick="closeFxAll();window.location.href='compose-sheet.html'">
          <span class="fx-notif-dot read"></span>
          <div class="fx-notif-body">
            <div class="fx-notif-title">作文讲评报告已生成</div>
            <div class="fx-notif-desc">已整理本次作文共性问题、优秀片段和讲评建议</div>
            <div class="fx-notif-time">周一 10:08</div>
          </div>
        </div>
        <div class="fx-notif-item" style="opacity:.72" onclick="closeFxAll();window.location.href='ai-record-jobs.html'">
          <span class="fx-notif-dot read"></span>
          <div class="fx-notif-body">
            <div class="fx-notif-title">知识点归因完成</div>
            <div class="fx-notif-desc">八年级物理周测已匹配 9 个薄弱知识点</div>
            <div class="fx-notif-time">上周五 18:42</div>
          </div>
        </div>
        <div class="fx-notif-item" style="opacity:.72" onclick="closeFxAll();window.location.href='ai-qbank.html'">
          <span class="fx-notif-dot read"></span>
          <div class="fx-notif-body">
            <div class="fx-notif-title">个性化练习已生成</div>
            <div class="fx-notif-desc">AI 已按基础、提高、挑战整理成 3 组练习</div>
            <div class="fx-notif-time">上周三 09:20</div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(pop);
    setTimeout(() => document.addEventListener('click', closeAllPops, { once: true }), 50);
  };

  window.closeFxAll = closeAllPops;

  /* ---- 劫持 openChat：所有二级页面统一跳 chat.html，不再走 v28 的 wiki panel ---- */
  /* 用 DOMContentLoaded 在所有 script 加载后覆盖 v28.js 里的 openChat */
  function hijackOpenChat() {
    window.openChat = function (mode, initialText) {
      if (mode === 'history') {
        window.location.href = 'chat-history.html';
        return;
      }
      if (mode === 'resume') {
        window.location.href = 'chat.html?resume=1';
        return;
      }
      if (initialText) {
        window.location.href = 'chat.html?q=' + encodeURIComponent(initialText);
        return;
      }
      window.location.href = 'chat.html';
    };
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hijackOpenChat);
  } else {
    hijackOpenChat();
  }
  /* 兜底：晚一拍再劫持一次，防止后加载的脚本又覆盖回去 */
  setTimeout(hijackOpenChat, 300);

  /* ---- 自定义 Tooltip (仅在折叠态生效) ---- */
  window.showFxTooltip = function(e) {
    const container = document.getElementById('feixiang-sidebar');
    if (!container || container.dataset.fxSidebar !== 'collapsed') return;
    const target = e.currentTarget;
    const text = target.dataset.tooltip;
    if (!text) return;

    let tip = document.getElementById('fx-tooltip');
    if (!tip) {
      tip = document.createElement('div');
      tip.id = 'fx-tooltip';
      tip.style.cssText = 'position:fixed;background:rgba(17,17,16,0.85);color:#fff;padding:6px 12px;border-radius:6px;font-size:12.5px;font-weight:500;pointer-events:none;z-index:100000;opacity:0;transition:opacity 0.15s, transform 0.15s;transform:translateX(4px);box-shadow:0 4px 12px rgba(0,0,0,0.1);white-space:nowrap;';
      document.body.appendChild(tip);
    }
    const rect = target.getBoundingClientRect();
    tip.textContent = text;
    tip.style.top = (rect.top + rect.height / 2 - 14) + 'px';
    tip.style.left = (rect.right + 12) + 'px';
    tip.style.opacity = '1';
    tip.style.transform = 'translateX(0)';
  };
  window.hideFxTooltip = function() {
    const tip = document.getElementById('fx-tooltip');
    if (tip) {
      tip.style.opacity = '0';
      tip.style.transform = 'translateX(4px)';
    }
  };

  function navItem({ key, icon, label, href, count, dot, primary, activeKey, onclick, parent, sub, parentActive, staticItem }) {
    const isActive = key === activeKey || parentActive;
    const cls = ['fx-nav-btn', primary && 'primary', parent && 'parent', sub && 'sub', isActive && 'active'].filter(Boolean).join(' ');
    const right = (count || dot)
      ? `<div class="fx-nav-right">${dot ? '<span class="fx-nav-dot"></span>' : ''}${count ? `<span class="fx-nav-count">${count}</span>` : ''}</div>`
      : '';
    const content = `${icon}<span class="fx-nav-label">${label}</span>${right}`;
    const tipAttrs = `data-tooltip="${label}" onmouseenter="window.showFxTooltip && window.showFxTooltip(event)" onmouseleave="window.hideFxTooltip && window.hideFxTooltip()"`;
    
    if (onclick) {
      return `<a class="${cls}" data-fx-nav-key="${key}" onclick="${onclick}" style="cursor:pointer" ${tipAttrs}>${content}</a>`;
    }
    if (staticItem) {
      return `<div class="${cls}" data-fx-nav-key="${key}" aria-current="${isActive ? 'true' : 'false'}" ${tipAttrs}>${content}</div>`;
    }
    return `<a class="${cls}" data-fx-nav-key="${key}" href="${href}" ${tipAttrs}>${content}</a>`;
  }

  function getShellApp(container) {
    const app = container.closest('.app');
    if (!app) return null;
    app.classList.add('fx-shell-app');
    return app;
  }

  function applySidebarState(container, state) {
    const app = getShellApp(container);
    const collapsed = state === 'collapsed';
    container.classList.toggle('is-collapsed', collapsed);
    container.dataset.fxSidebar = collapsed ? 'collapsed' : 'open';
    if (app) {
      app.dataset.fxSidebar = collapsed ? 'collapsed' : 'open';
      if (container.classList.contains('sidebar-left')) {
        if (collapsed) {
          app.dataset.left = 'collapsed';
          app.dataset.fxManagedLeft = '1';
        } else if (app.dataset.fxManagedLeft === '1') {
          delete app.dataset.left;
          delete app.dataset.fxManagedLeft;
        }
      }
    }
    const toggle = container.querySelector('.fx-sidebar-toggle');
    if (toggle) toggle.title = collapsed ? '展开侧栏' : '收起侧栏';
  }

  window.toggleFeixiangSidebar = function () {
    const container = document.getElementById('feixiang-sidebar');
    if (!container) return;
    const next = container.dataset.fxSidebar === 'collapsed' ? 'open' : 'collapsed';
    applySidebarState(container, next);
  };

  window.renderFeixiangSidebar = function (activeKey) {
    ensureToastFallback();
    injectPopupStyles();

    const container = document.getElementById('feixiang-sidebar');
    if (!container) return;
    if (container.dataset.fxRenderedActive === activeKey && container.childElementCount) {
      applySidebarState(container, container.dataset.fxSidebar || 'open');
      return;
    }

    const currentPage = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
    const isHomePage = currentPage === 'index.html' || currentPage === '';

    container.classList.add('fx-sidebar');
    getShellApp(container);
    container.dataset.fxRenderedActive = activeKey;
    container.innerHTML = `
      <div class="fx-sidebar-head">
        <a class="fx-workspace" href="${isHomePage ? '#' : 'index.html'}" ${isHomePage ? 'onclick="event.preventDefault()"' : ''} title="回到首页">
          <div class="fx-ws-main">
            <div class="fx-school-logo">实</div>
            <div class="fx-school-name">北京市实验中学</div>
          </div>
          <div class="fx-ws-footer">
            <div class="fx-power-by">
              ${ICONS.sparkle}
              飞象老师校园版
            </div>
          </div>
        </a>
        <button type="button" class="fx-sidebar-toggle" onclick="toggleFeixiangSidebar()" data-tooltip="展开/收起" onmouseenter="window.showFxTooltip(event)" onmouseleave="window.hideFxTooltip()">
          ${ICONS.panel}
        </button>
      </div>

      ${navItem({ key: 'home', icon: ICONS.home, label: '首页', href: 'index.html', activeKey })}
      ${navItem({ key: 'chat', icon: ICONS.plus, label: '新对话', href: 'chat.html', primary: true, activeKey })}
      ${navItem({ key: 'chat-history', icon: ICONS.history, label: '历史对话', href: 'chat-history.html', count: 86, activeKey })}

      <div class="fx-nav-section">我的空间</div>
      ${navItem({ key: 'my-apps', icon: ICONS.apps, label: '我的作品', href: 'my-apps.html', activeKey })}
      ${navItem({ key: 'my-wiki', icon: ICONS.person, label: '我的知识库', href: 'my-wiki.html', activeKey })}

      <div class="fx-nav-section">发现</div>
      ${navItem({ key: 'school-wiki', icon: ICONS.school, label: '学校知识库', href: 'school-wiki.html', count: 348, dot: true, activeKey })}
      ${navItem({ key: 'apps', icon: ICONS.apps, label: '应用广场', href: 'app-square.html', activeKey })}
      ${navItem({ key: 'resources', icon: ICONS.resources, label: '资源广场', href: 'resource-square.html', activeKey })}

      <div class="fx-nav-section">管理</div>
      ${navItem({ key: 'school-dashboard', icon: ICONS.dashboard, label: '学校看板', onclick: "showToast('（演示）学校看板')", activeKey })}
      ${navItem({ key: 'admin-teachers', icon: ICONS.shield, label: '学校管理', href: 'admin-teachers.html', activeKey })}

      <div class="fx-spacer"></div>

      <button type="button" class="fx-user fx-user-btn" onclick="toggleFxUserMenu(event)" data-tooltip="账号设置" onmouseenter="window.showFxTooltip(event)" onmouseleave="window.hideFxTooltip()">
        <div class="fx-avatar">张</div>
        <div style="flex:1;min-width:0;text-align:left">
          <div class="fx-user-name">张老师</div>
        </div>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:#a19f99;flex-shrink:0"><path d="M6 9l6 6 6-6"/></svg>
      </button>
    `;
    applySidebarState(container, container.dataset.fxSidebar || 'open');
  };
})();
