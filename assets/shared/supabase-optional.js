(function(){
  if (window.supabase) return;

  function loadSupabase(src, onError){
    var script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = function(){
      if (!window.supabase && typeof supabase !== 'undefined') {
        window.supabase = supabase;
      }
      window.dispatchEvent(new CustomEvent('supabase:ready'));
    };
    if (onError) script.onerror = onError;
    document.head.appendChild(script);
  }

  function start(){
    loadSupabase('assets/shared/supabase-js-v2.js', function(){
      loadSupabase('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2');
    });
  }

  if (document.readyState === 'complete') {
    setTimeout(start, 0);
  } else {
    window.addEventListener('load', function(){ setTimeout(start, 0); }, { once: true });
  }
})();
