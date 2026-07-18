/* ============================================================
   page-header.js · 飞象老师校园版统一页面顶栏脚本
   --------------------------------------------------------------
   职责：监听主滚动容器的滚动事件，超过阈值给 .page-header 加
   data-compact="true"，触发 CSS 压扁动画。

   使用方式：
   - 在页面引入本脚本即可，自动绑定。
   - 主滚动容器优先使用 .workspace-scroll；若没有则退回 window。
   - 若页面有特殊结构，可在 .page-header 上加 data-scroll-target
     属性指向自定义滚动容器选择器。
   ============================================================ */
(function(){
  'use strict';

  var COMPACT_THRESHOLD = 12;

  function findScrollTarget(header){
    // 1. 显式指定
    var sel = header.getAttribute('data-scroll-target');
    if(sel){
      var explicit = document.querySelector(sel);
      if(explicit) return explicit;
    }
    // 2. 同级或祖先里的 .workspace-scroll
    var ws = document.querySelector('.workspace-scroll');
    if(ws) return ws;
    // 3. 同级或祖先里的可滚动祖先
    var el = header.parentElement;
    while(el && el !== document.body){
      var cs = getComputedStyle(el);
      if((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight > el.clientHeight){
        return el;
      }
      el = el.parentElement;
    }
    // 4. fallback
    return window;
  }

  function getScrollTop(target){
    if(target === window) return window.scrollY || document.documentElement.scrollTop || 0;
    return target.scrollTop || 0;
  }

  function bind(){
    var headers = document.querySelectorAll('.page-header');
    if(!headers.length) return;

    headers.forEach(function(header){
      var target = findScrollTarget(header);
      var ticking = false;

      function update(){
        ticking = false;
        var top = getScrollTop(target);
        header.dataset.compact = top > COMPACT_THRESHOLD ? 'true' : 'false';
      }

      function onScroll(){
        if(!ticking){
          window.requestAnimationFrame(update);
          ticking = true;
        }
      }

      var listenOn = (target === window) ? window : target;
      listenOn.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll, { passive: true });

      // 初始一次
      update();

      // 暴露给页面：在 view 切换、动态加载内容后可手动刷新
      header._phUpdate = update;
    });
  }

  // 提供给外部调用：内容动态变化后重新计算
  window.refreshPageHeader = function(){
    document.querySelectorAll('.page-header').forEach(function(h){
      if(typeof h._phUpdate === 'function') h._phUpdate();
    });
  };

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();
