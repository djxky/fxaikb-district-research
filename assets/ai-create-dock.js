/* ============================================================
   ai-create-dock.js · 飞象老师校园版「AI 创造入口」浮动 dock
   --------------------------------------------------------------
   职责：
   - placeholder 自动轮播（用户没聚焦/没输入时）
   - textarea 自动展开（最多 120px）
   - 发送：Enter 提交 / Shift+Enter 换行 / 点击发送按钮
   - 提交后：演示 Toast + 清空输入

   配置（dock 元素上的 data-* 属性）：
   - data-kind="资源" / "应用" 等：决定 toast 文案的"生成 XX"
   - data-placeholders="A|B|C"：竖线分隔的轮播示例，至少 1 条
   ============================================================ */
(function () {
  'use strict';

  var ROTATE_INTERVAL = 3500;
  var AI_CAPABILITIES = [
    { id: 'qbank', label: 'AI 组题', desc: '根据知识点、题型和难度快速生成练习、测验或试卷。', placeholder: 'AI 组题｜帮我生成一份北京朝阳区七年级上册数学期末考试模拟题', svg: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>' },
    { id: 'animation', label: '教学动画', badge: '新功能', desc: '生成用于课堂讲解的专业级互动教学动画。', placeholder: '教学动画｜设计初中数学勾股定理互动教学活动，引导学生主动探究，培养几何直观、逻辑推理能力。', svg: '<path d="M12 3v4"/><path d="M12 17v4"/><path d="M3 12h4"/><path d="M17 12h4"/><path d="m5.6 5.6 2.8 2.8"/><path d="m15.6 15.6 2.8 2.8"/><path d="m18.4 5.6-2.8 2.8"/><path d="m8.4 15.6-2.8 2.8"/><circle cx="12" cy="12" r="3"/>' },
    { id: 'game', label: '教学游戏', badge: '新功能', desc: '把知识点设计成可在课堂中使用的小游戏。', placeholder: '教学游戏｜以《西游记》取经之路为故事线，生成六年级课内古诗词闯关游戏，让学生在游戏化体验中变“被动背诵”为“主动探究”。', svg: '<line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><line x1="15" y1="13" x2="15.01" y2="13"/><line x1="18" y1="11" x2="18.01" y2="11"/><rect x="2" y="6" width="20" height="12" rx="3"/>' },
    { id: 'interactive', label: '互动课件', badge: '新功能', desc: '上传教案文件后，生成可操作、可演示的课堂互动课件。', placeholder: '互动课件｜帮我生成初英人教七下U1 Grammar Focus的互动课件，通过精简而高效的语言活动，帮助学生掌握并巩固与动物相关的词汇、句型及原因状语从句引导词because的用法。', svg: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 9h6v6H9z"/>' },
    { id: 'data', label: '数据回收', badge: '新功能', desc: '上传 HTML 文件后，为课件增加答题、统计和课堂数据回收。', placeholder: '数据回收｜我想在课件的练习环节，增加数据回收功能，了解每道题的正确率及高频错题的情况。', svg: '<path d="M3 3v18h18"/><path d="M7 15v2"/><path d="M12 9v8"/><path d="M17 12v5"/>' }
  ];
  var AI_MODE_SVG = '<path d="M12 2L9 9l-7 1 5 5-1 7 6-3 6 3-1-7 5-5-7-1z"/>';

  function init() {
    var docks = document.querySelectorAll('.ai-dock');
    docks.forEach(setup);
  }

  function setup(dock) {
	    var input = dock.querySelector('.ai-dock-input');
	    var sendBtn = dock.querySelector('.ai-dock-send');
	    if (!input || !sendBtn) return;
    var panelEnabled = dock.getAttribute('data-ai-panel') === 'true';
    var panel = dock.querySelector('.ai-dock-panel');
    var chipList = dock.querySelector('.ai-dock-chip-list') || panel;
    var modeEl = dock.querySelector('.ai-dock-mode');
    var uploadCard = dock.querySelector('.ai-dock-upload-card');
    var activeCapability = null;
    var capabilityUploads = {};
    var skipCapabilityClick = false;
    var suppressCapabilityForCurrentClick = false;

    var raw = dock.getAttribute('data-placeholders') || '';
    var placeholders = raw.split('|').map(function (s) { return s.trim(); }).filter(Boolean);

    if (placeholders.length > 0) {
      input.placeholder = placeholders[0];
    }

	    if (placeholders.length > 1) {
      var i = 0;
      setInterval(function () {
	        if (document.activeElement === input || input.value || activeCapability) return;
        input.classList.add('is-fading');
        setTimeout(function () {
          i = (i + 1) % placeholders.length;
          input.placeholder = placeholders[i];
          input.classList.remove('is-fading');
        }, 260);
      }, ROTATE_INTERVAL);
	    }

    if (panelEnabled && panel) {
      renderAiCapabilities();
      input.addEventListener('mousedown', function () {
        suppressCapabilityForCurrentClick = true;
      });
      document.addEventListener('click', function () {
        if (!suppressCapabilityForCurrentClick) return;
        setTimeout(function () {
          suppressCapabilityForCurrentClick = false;
        }, 0);
      }, true);
      dock.addEventListener('mousedown', function (event) {
        var btn = event.target.closest('[data-capability]');
        if (!btn || !dock.contains(btn)) return;
        if (suppressCapabilityForCurrentClick) return;
        event.preventDefault();
        event.stopPropagation();
        skipCapabilityClick = true;
        selectCapability(btn.getAttribute('data-capability'));
      });
      dock.addEventListener('click', function (event) {
        var btn = event.target.closest('[data-capability]');
        if (!btn || !dock.contains(btn)) return;
        if (suppressCapabilityForCurrentClick) return;
        event.preventDefault();
        event.stopPropagation();
        if (skipCapabilityClick) {
          skipCapabilityClick = false;
          return;
        }
        selectCapability(btn.getAttribute('data-capability'));
      });
      dock.addEventListener('click', function () {
        dock.classList.add('is-expanded');
      });
      input.addEventListener('focus', function () {
        dock.classList.add('is-expanded');
      });
      document.addEventListener('click', function (event) {
        if (dock.contains(event.target)) return;
        if (!input.value && !activeCapability) {
          dock.classList.remove('is-expanded');
          input.style.height = '';
        }
      });
      if (uploadCard) {
        uploadCard.addEventListener('click', function (event) {
          event.preventDefault();
          event.stopPropagation();
          var req = getUploadRequirement(activeCapability);
          if (!req) return;
          capabilityUploads[req.id] = { name: req.fileName };
          renderUploadCard();
          showToast(req.toast);
        });
      }
    }

	    sendBtn.addEventListener('click', function () { submit(dock, input, activeCapability); });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
	        submit(dock, input, activeCapability);
	      }
	    });

    input.addEventListener('input', function () {
      input.style.height = 'auto';
	      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
	    });

    function renderAiCapabilities() {
      if (!chipList) return;
      chipList.innerHTML = AI_CAPABILITIES.map(function (cap) {
        return '<button type="button" class="ai-dock-chip' + (activeCapability === cap.id ? ' active' : '') + '" data-capability="' + cap.id + '">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' + cap.svg + '</svg>' +
          cap.label +
          (cap.beta ? '<span class="chip-beta">BETA</span>' : '') +
        '</button>';
      }).join('');
    }

    function selectCapability(id) {
      activeCapability = activeCapability === id ? null : id;
      var cap = getCapability(activeCapability);
      input.placeholder = cap ? cap.placeholder : (placeholders[0] || '描述你想要的资源…');
      dock.classList.add('is-expanded');
      renderMode();
      renderUploadCard();
      renderAiCapabilities();
      input.focus();
    }

    function renderMode() {
      var cap = getCapability(activeCapability);
      dock.classList.toggle('has-mode', !!cap);
      if (!modeEl) return;
      if (!cap) {
        modeEl.style.display = 'none';
        modeEl.innerHTML = '';
        return;
      }
      modeEl.style.display = 'inline-flex';
      modeEl.innerHTML = '<svg class="mode-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' + AI_MODE_SVG + '</svg>' +
        cap.label +
        '<span class="mode-x" title="取消"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg></span>';
      var clear = modeEl.querySelector('.mode-x');
      if (clear) {
        clear.addEventListener('click', function (event) {
          event.stopPropagation();
          activeCapability = null;
          input.placeholder = placeholders[0] || '描述你想要的资源…';
          renderMode();
          renderUploadCard();
          renderAiCapabilities();
          input.focus();
        });
      }
    }

    function renderUploadCard() {
      var req = getUploadRequirement(activeCapability);
      dock.classList.toggle('upload-required', !!req);
      if (!uploadCard) return;
      if (!req) {
        uploadCard.classList.remove('is-uploaded');
        uploadCard.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12"/><path d="m7 8 5-5 5 5"/><path d="M5 21h14"/></svg><span>上传附件</span>';
        return;
      }
      var uploaded = capabilityUploads[req.id];
      uploadCard.classList.toggle('is-uploaded', !!uploaded);
      uploadCard.innerHTML = uploaded
        ? '<span class="uploaded-label">已上传</span><span class="uploaded-line"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg><span class="uploaded-name">' + uploaded.name + '</span><span class="upload-remove" title="移除"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></span></span>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12"/><path d="m7 8 5-5 5 5"/><path d="M5 21h14"/></svg><span>' + req.label + '</span>';
      var remove = uploadCard.querySelector('.upload-remove');
      if (remove) {
        remove.addEventListener('click', function (event) {
          event.stopPropagation();
          delete capabilityUploads[req.id];
          renderUploadCard();
        });
      }
    }
	  }

  function getCapability(id) {
    if (!id) return null;
    return AI_CAPABILITIES.find(function (item) { return item.id === id; }) || null;
  }

  function getUploadRequirement(id) {
    if (id === 'interactive') return { id: 'interactive', label: '上传教案文件', fileName: '初英U1互动课件教案.docx', toast: '已添加教案文件' };
    if (id === 'data') return { id: 'data', label: '上传HTML文件', fileName: '课堂练习数据回收.html', toast: '已添加 HTML 文件' };
    return null;
  }

	  function submit(dock, input, activeCapability) {
	    var text = (input.value || '').trim();
	    if (!text) {
	      input.focus();
	      return;
	    }
	    var fixedIntent = dock.getAttribute('data-fixed-intent') || '';
	    var kind = fixedIntent === 'create-app' ? '应用' : (dock.getAttribute('data-kind') || '内容');
    var cap = getCapability(activeCapability);
	    var preview = text.length > 24 ? text.slice(0, 24) + '…' : text;
	    var prefix = fixedIntent === 'create-app' ? '已进入创建应用' : '已收到';
	    showToast(prefix + '「' + preview + '」· AI 正在为你生成' + (cap ? ' · ' + cap.label : kind));

	    input.value = '';
	    input.style.height = '';
  }

  function showToast(msg) {
    var t = document.getElementById('ai-dock-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'ai-dock-toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    // 强制重排让 transition 生效
    void t.offsetWidth;
    t.classList.add('show');
    if (t._timer) clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.classList.remove('show'); }, 3600);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
