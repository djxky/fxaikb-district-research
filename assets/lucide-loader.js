(function(){
  if (window.lucide && typeof window.lucide.createIcons === 'function') return;

  window.lucide = {
    createIcons: function(){}
  };

  function loadRealLucide(){
    var script = document.createElement('script');
    script.src = 'https://unpkg.com/lucide@latest';
    script.async = true;
    script.onload = function(){
      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      }
    };
    document.head.appendChild(script);
  }

  if (document.readyState === 'complete') {
    setTimeout(loadRealLucide, 0);
  } else {
    window.addEventListener('load', function(){ setTimeout(loadRealLucide, 0); }, { once: true });
  }
})();
