(function(){
  const REVIEW_PARAM = 'review';

  function getData(){
    const tpl = document.getElementById('review-template');
    if(tpl){
      try {
        const raw = (tpl.content && tpl.content.textContent) || tpl.textContent || '{}';
        const data = JSON.parse(raw);
        if(data && Array.isArray(data.sections) && data.sections.length) return data;
      } catch (error) {
        console.warn('[review] invalid review-template JSON', error);
      }
    }
    const file = (window.location.pathname.split('/').pop() || 'index.html') || 'index.html';
    const fallback = window.REVIEW_CONTENT && window.REVIEW_CONTENT[file];
    if(fallback) return fallback;
    return null;
  }

  function escapeHtml(value){
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderLogicGroup(title, items){
    if(!Array.isArray(items) || !items.length) return '';
    return `
      <div class="review-logic-group">
        <div class="review-logic-title">${escapeHtml(title)}</div>
        <ul class="review-logic-list">
          ${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  function renderStructuredItem(item){
    if(typeof item === 'string') return `<li>${escapeHtml(item)}</li>`;
    if(!item || typeof item !== 'object') return '';
    const label = item.label ? `<strong>${escapeHtml(item.label)}</strong>` : '';
    const separator = item.label && item.text ? '：' : '';
    const text = item.text ? `<span>${escapeHtml(item.text)}</span>` : '';
    const children = Array.isArray(item.children) && item.children.length
      ? `<ul class="review-nested-list">${item.children.map(child => `<li>${escapeHtml(child)}</li>`).join('')}</ul>`
      : '';
    return `<li>${label}${separator}${text}${children}</li>`;
  }

  function getVersionOptions(data){
    const versions = Array.isArray(data && data.reviewVersions) ? data.reviewVersions : [];
    if(!versions.length) return [];
    const base = {
      id: 'v0.9',
      label: 'v0.9 历史完整稿',
      title: data.title,
      summary: data.summary,
      sections: data.sections || [],
      source: 'base'
    };
    return versions.concat(base);
  }

  function getSelectedVersionId(data){
    const versions = getVersionOptions(data);
    if(!versions.length) return '';
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('reviewVersion');
    if(fromUrl && versions.some(version => version.id === fromUrl)) return fromUrl;
    const latest = versions.find(version => version.default) || versions[0];
    return latest.id;
  }

  function resolveReviewData(data){
    const versions = getVersionOptions(data);
    if(!versions.length){
      return { data, versions: [], selectedVersionId: '' };
    }
    const selectedVersionId = getSelectedVersionId(data);
    const selected = versions.find(version => version.id === selectedVersionId) || versions[0];
    return {
      data: {
        ...data,
        title: selected.title || data.title,
        summary: selected.summary || data.summary,
        sections: selected.sections || []
      },
      versions,
      selectedVersionId
    };
  }

  function renderVersionSelector(versions, selectedVersionId){
    if(!versions.length) return '';
    return `
      <div class="review-version-bar">
        <label class="review-version-label" for="review-version-select">过稿版本</label>
        <select class="review-version-select" id="review-version-select" aria-label="切换过稿版本">
          ${versions.map(version => `<option value="${escapeHtml(version.id)}" ${version.id === selectedVersionId ? 'selected' : ''}>${escapeHtml(version.label || version.id)}</option>`).join('')}
        </select>
      </div>
    `;
  }

  function getReviewStatus(value){
    const text = String(value || '').trim();
    if(text === '可用') return { key: 'available', label: text };
    if(text === '置灰') return { key: 'disabled', label: text };
    if(text === '删除') return { key: 'removed', label: text };
    return null;
  }

  function renderTableCell(value){
    const status = getReviewStatus(value);
    if(status){
      return `
        <td class="review-table-status-cell">
          <span class="review-status-badge is-${status.key}">${escapeHtml(status.label)}</span>
        </td>
      `;
    }
    return `<td>${escapeHtml(value)}</td>`;
  }

  function renderReviewBlock(block){
    if(!block || typeof block !== 'object') return '';
    if(block.type === 'callout'){
      return `<div class="review-callout">${escapeHtml(block.text || '')}</div>`;
    }
    if(block.type === 'link' && block.href){
      const label = block.label || '查看链接';
      return `
        <div class="review-block">
          ${block.title ? `<h4>${escapeHtml(block.title)}</h4>` : ''}
          <a class="review-link" href="${escapeHtml(block.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>
        </div>
      `;
    }
    if(block.type === 'image' && block.src){
      return `
        <div class="review-block">
          ${block.title ? `<h4>${escapeHtml(block.title)}</h4>` : ''}
          <figure class="review-image-card">
            <img src="${escapeHtml(block.src)}" alt="${escapeHtml(block.alt || block.title || '过稿配图')}" loading="lazy">
            ${block.caption ? `<figcaption>${escapeHtml(block.caption)}</figcaption>` : ''}
          </figure>
        </div>
      `;
    }
    if(block.type === 'table' && Array.isArray(block.rows) && block.rows.length){
      const columns = Array.isArray(block.columns) && block.columns.length ? block.columns : Object.keys(block.rows[0] || {});
      return `
        <div class="review-block">
          ${block.title ? `<h4>${escapeHtml(block.title)}</h4>` : ''}
          <div class="review-table-wrap">
            <table class="review-table">
              <thead><tr>${columns.map(col => `<th>${escapeHtml(col)}</th>`).join('')}</tr></thead>
              <tbody>
                ${block.rows.map(row => `<tr>${columns.map(col => renderTableCell(row[col])).join('')}</tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }
    const paragraphs = Array.isArray(block.body)
      ? block.body
      : (block.body ? [block.body] : []);
    const items = Array.isArray(block.items) && block.items.length
      ? `<${block.ordered ? 'ol' : 'ul'} class="review-block-list">${block.items.map(renderStructuredItem).join('')}</${block.ordered ? 'ol' : 'ul'}>`
      : '';
    return `
      <div class="review-block">
        ${block.title ? `<h4>${escapeHtml(block.title)}</h4>` : ''}
        ${paragraphs.map(text => `<p>${escapeHtml(text)}</p>`).join('')}
        ${items}
      </div>
    `;
  }

  function renderSectionBody(section){
    if(Array.isArray(section.blocks) && section.blocks.length){
      return section.blocks.map(renderReviewBlock).join('');
    }
    return `
      ${renderLogicGroup('交互流程', section.flow)}
      ${renderLogicGroup('状态 / 边界', section.states)}
      ${renderLogicGroup('数据 / 关联', section.dataRules)}
    `;
  }

  function isSectionOpenByDefault(section, index){
    if(section && typeof section.expanded === 'boolean') return section.expanded;
    return false;
  }

  function summarizeSection(section){
    const blocks = Array.isArray(section && section.blocks) ? section.blocks : [];
    if(!blocks.length) return '';
    const flowBlock = blocks.find(block => block && block.title === '交互流程' && Array.isArray(block.items));
    const qaBlock = blocks.find(block => block && block.title === 'QA 检查点' && Array.isArray(block.items));
    const parts = [];
    if(flowBlock) parts.push(`${flowBlock.items.length} 个交互`);
    if(qaBlock) parts.push(`${qaBlock.items.length} 个检查点`);
    return parts.join(' · ');
  }

  function renderPanel(data){
    const resolved = resolveReviewData(data);
    data = resolved.data;
    let panel = document.getElementById('review-panel');
    if(!panel){
      panel = document.createElement('aside');
      panel.id = 'review-panel';
      panel.className = 'review-panel';
      panel.setAttribute('aria-label', '产品稿');
      document.body.appendChild(panel);
    }
    const hasSections = data && Array.isArray(data.sections) && data.sections.length;
    const sections = hasSections ? data.sections.map((section, index) => {
      const body = renderSectionBody(section);
      const tag = section.tag ? `<span class="review-tag">${escapeHtml(section.tag)}</span>` : '';
      const title = escapeHtml(section.title);
      const sectionId = escapeHtml(section.id || ('section-' + index));
      const bodyId = `review-section-body-${index}`;
      const isOpen = isSectionOpenByDefault(section, index);
      const summary = summarizeSection(section);
      return `
        <section class="review-section ${isOpen ? 'is-open' : 'is-collapsed'}" data-review-doc="${sectionId}">
          <button type="button" class="review-section-toggle" aria-expanded="${String(isOpen)}" aria-controls="${bodyId}" data-review-toggle>
            <span class="review-section-main">
              <span class="review-section-title">${title}${tag}</span>
              ${section.body ? `<span class="review-section-purpose">${escapeHtml(section.body)}</span>` : ''}
            </span>
            ${summary ? `<span class="review-section-summary">${escapeHtml(summary)}</span>` : ''}
            <span class="review-section-chevron" aria-hidden="true">⌄</span>
          </button>
          <div class="review-section-body" id="${bodyId}" ${isOpen ? '' : 'hidden'}>
            ${body}
          </div>
        </section>
      `;
    }).join('') : '<div class="review-empty">本页暂未写入过稿文字。你仍然可以拖动顶部标题栏调整位置，也可以拖右下角改变大小。</div>';
    panel.innerHTML = `
      <div class="review-drag" id="review-drag">
        <span class="review-drag-dots">•••</span>
        <span class="review-drag-title">产品稿 · 过稿模式</span>
        <span class="review-drag-hint">拖动这里</span>
        <button type="button" class="review-close" id="review-close" aria-label="关闭过稿">×</button>
      </div>
      <div class="review-scroll">
        <div class="review-inner">
          <div class="review-kicker">产品稿 · 过稿模式</div>
          ${renderVersionSelector(resolved.versions, resolved.selectedVersionId)}
          <h2 class="review-title">${escapeHtml((data && data.title) || document.title)}</h2>
          <p class="review-summary">${escapeHtml((data && data.summary) || '')}</p>
          ${sections}
        </div>
      </div>
      <div class="review-resize" id="review-resize" aria-hidden="true"></div>
    `;
  }

  function isReview(){
    const params = new URLSearchParams(window.location.search);
    return params.get(REVIEW_PARAM) === '1' || params.get('mode') === 'review';
  }

  function setMode(next){
    const url = new URL(window.location.href);
    if(next === 'review') url.searchParams.set(REVIEW_PARAM, '1');
    else url.searchParams.delete(REVIEW_PARAM);
    window.history.replaceState({}, '', url);
    applyMode();
  }

  function applyMode(){
    const on = isReview();
    document.body.classList.toggle('review-mode', on);
    document.querySelectorAll('[data-review-mode]').forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.reviewMode === (on ? 'review' : 'demo'));
      btn.setAttribute('aria-pressed', String(btn.classList.contains('is-active')));
    });
  }

  function renderSwitcher(){
    if(document.getElementById('review-switcher')) return;
    const switcher = document.createElement('div');
    switcher.id = 'review-switcher';
    switcher.className = 'review-switcher';
    switcher.setAttribute('role', 'tablist');
    switcher.setAttribute('aria-label', '演示和过稿模式切换');
    switcher.innerHTML = `
      <button type="button" role="tab" data-review-mode="demo">演示</button>
      <button type="button" role="tab" data-review-mode="review">过稿</button>
    `;
    switcher.addEventListener('click', event => {
      const btn = event.target.closest('[data-review-mode]');
      if(!btn) return;
      setMode(btn.dataset.reviewMode);
    });
    document.body.appendChild(switcher);
  }

  function bindFocus(){
    document.addEventListener('click', event => {
      const section = event.target.closest('[data-review-doc]');
      if(!section) return;
      const id = section.dataset.reviewDoc;
      const target = document.querySelector(`[data-doc="${CSS.escape(id)}"]`);
      if(!target) return;
      target.scrollIntoView({ block: 'center', behavior: 'smooth' });
      target.classList.add('review-focus');
      setTimeout(() => target.classList.remove('review-focus'), 1200);
    });
  }

  function setSectionOpen(section, open){
    if(!section) return;
    section.classList.toggle('is-open', open);
    section.classList.toggle('is-collapsed', !open);
    const toggle = section.querySelector('[data-review-toggle]');
    if(toggle) toggle.setAttribute('aria-expanded', String(open));
    const body = section.querySelector('.review-section-body');
    if(body) body.hidden = !open;
  }

  function bindSectionToggles(){
    document.addEventListener('click', event => {
      const toggle = event.target.closest('[data-review-toggle]');
      if(!toggle) return;
      event.preventDefault();
      event.stopPropagation();
      const section = toggle.closest('.review-section');
      setSectionOpen(section, !section.classList.contains('is-open'));
    });
  }

  function bindVersionSelector(){
    document.addEventListener('change', event => {
      const select = event.target.closest('#review-version-select');
      if(!select) return;
      const url = new URL(window.location.href);
      url.searchParams.set('reviewVersion', select.value);
      window.history.replaceState({}, '', url);
      renderPanel(getData());
      bindClose();
      bindDragAndResize();
    });
  }

  function bindClose(){
    const close = document.getElementById('review-close');
    if(close) close.addEventListener('click', () => setMode('demo'));
  }

  function bindDragAndResize(){
    const panel = document.getElementById('review-panel');
    const drag = document.getElementById('review-drag');
    const resize = document.getElementById('review-resize');
    if(!panel || !drag) return;

    let dragging = false;
    let dragPointerId = null;
    let offsetX = 0;
    let offsetY = 0;

    function startDrag(event){
      if(event.target.closest('.review-close')) return;
      event.preventDefault();
      dragging = true;
      dragPointerId = event.pointerId;
      const rect = panel.getBoundingClientRect();
      offsetX = event.clientX - rect.left;
      offsetY = event.clientY - rect.top;
      panel.style.left = rect.left + 'px';
      panel.style.top = rect.top + 'px';
      panel.style.right = 'auto';
      panel.style.transform = 'none';
      panel.classList.add('is-dragging');
      if(typeof drag.setPointerCapture === 'function'){
        drag.setPointerCapture(event.pointerId);
      }
      document.body.style.userSelect = 'none';
    }

    function moveDrag(event){
      if(!dragging || event.pointerId !== dragPointerId) return;
      const rect = panel.getBoundingClientRect();
      const nextLeft = Math.max(0, Math.min(event.clientX - offsetX, window.innerWidth - Math.min(80, rect.width)));
      const nextTop = Math.max(0, Math.min(event.clientY - offsetY, window.innerHeight - Math.min(60, rect.height)));
      panel.style.left = nextLeft + 'px';
      panel.style.top = nextTop + 'px';
      panel.style.right = 'auto';
    }

    function endDrag(event){
      if(!dragging || (event && event.pointerId !== dragPointerId)) return;
      dragging = false;
      if(event && typeof drag.releasePointerCapture === 'function'){
        try { drag.releasePointerCapture(event.pointerId); } catch (_) {}
      }
      dragPointerId = null;
      panel.classList.remove('is-dragging');
      document.body.style.userSelect = '';
    }

    drag.addEventListener('pointerdown', startDrag);
    drag.addEventListener('pointermove', moveDrag);
    drag.addEventListener('pointerup', endDrag);
    drag.addEventListener('pointercancel', endDrag);
    drag.addEventListener('lostpointercapture', endDrag);

    if(!resize) return;
    let resizing = false;
    let resizePointerId = null;
    let startX = 0;
    let startY = 0;
    let startWidth = 0;
    let startHeight = 0;

    resize.addEventListener('pointerdown', event => {
      event.preventDefault();
      event.stopPropagation();
      resizing = true;
      resizePointerId = event.pointerId;
      const rect = panel.getBoundingClientRect();
      startX = event.clientX;
      startY = event.clientY;
      startWidth = rect.width;
      startHeight = rect.height;
      panel.style.left = rect.left + 'px';
      panel.style.top = rect.top + 'px';
      panel.style.right = 'auto';
      panel.style.transform = 'none';
      if(typeof resize.setPointerCapture === 'function'){
        resize.setPointerCapture(event.pointerId);
      }
      document.body.style.userSelect = 'none';
    });

    resize.addEventListener('pointermove', event => {
      if(!resizing || event.pointerId !== resizePointerId) return;
      const maxWidth = Math.max(320, window.innerWidth - panel.getBoundingClientRect().left - 10);
      const maxHeight = Math.max(260, window.innerHeight - panel.getBoundingClientRect().top - 10);
      panel.style.width = Math.max(320, Math.min(maxWidth, startWidth + (event.clientX - startX))) + 'px';
      panel.style.height = Math.max(260, Math.min(maxHeight, startHeight + (event.clientY - startY))) + 'px';
    });

    function endResize(event){
      if(!resizing || (event && event.pointerId !== resizePointerId)) return;
      if(!resizing) return;
      resizing = false;
      if(event && typeof resize.releasePointerCapture === 'function'){
        try { resize.releasePointerCapture(event.pointerId); } catch (_) {}
      }
      resizePointerId = null;
      document.body.style.userSelect = '';
    }
    resize.addEventListener('pointerup', endResize);
    resize.addEventListener('pointercancel', endResize);
    resize.addEventListener('lostpointercapture', endResize);
  }

  function init(){
    renderPanel(getData());
    renderSwitcher();
    bindSectionToggles();
    bindVersionSelector();
    bindFocus();
    bindClose();
    bindDragAndResize();
    applyMode();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
