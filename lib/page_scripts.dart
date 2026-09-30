import 'dart:convert';

/// Small scripts run inside the website pages.

/// Pull down at the top of a page to reload it. Messages go to the `EdenApp` channel.
const String pullToRefreshScript = r'''
(function () {
  if (window.__edenApp) return;
  window.__edenApp = true;
  document.documentElement.classList.add('in-app');
  var startY = null, dist = 0, ind = null;
  function innerScrolled(el) {
    while (el && el !== document.body && el !== document.documentElement) {
      if (el.scrollTop > 0) return true;
      el = el.parentElement;
    }
    return false;
  }
  function overlayOpen() {
    return document.querySelector('dialog[open], .modal.open, .modal.is-open, .side-menu.open, .sm-open, details[open].user-menu');
  }
  function hide() { if (ind) { ind.remove(); ind = null; } }
  addEventListener('touchstart', function (e) {
    startY = null; dist = 0;
    if (window.scrollY > 0 || e.touches.length !== 1 || innerScrolled(e.target) || overlayOpen()) return;
    startY = e.touches[0].clientY;
  }, { passive: true });
  addEventListener('touchmove', function (e) {
    if (startY === null) return;
    dist = e.touches[0].clientY - startY;
    if (dist <= 0 || window.scrollY > 0) { hide(); return; }
    if (!ind) {
      ind = document.createElement('div');
      ind.setAttribute('aria-hidden', 'true');
      ind.style.cssText = 'position:fixed;left:50%;top:0;z-index:2147483647;width:40px;height:40px;margin-left:-20px;border-radius:50%;' +
        'background:#fff;box-shadow:0 3px 10px rgba(0,0,0,.22);display:flex;align-items:center;justify-content:center;' +
        'font:bold 22px/1 sans-serif;color:#0e7c66;pointer-events:none';
      ind.textContent = '↻';
      document.body.appendChild(ind);
    }
    var y = Math.min(dist / 2.2, 72);
    ind.style.transform = 'translateY(' + y + 'px) rotate(' + Math.round(dist * 1.6) + 'deg)';
    ind.style.opacity = String(Math.min(1, dist / 150));
  }, { passive: true });
  addEventListener('touchend', function () {
    if (startY !== null && dist > 160 && window.scrollY <= 0) {
      if (ind) ind.style.opacity = '1';
      EdenApp.postMessage(JSON.stringify({ t: 'refresh' }));
    } else {
      hide();
    }
    startY = null;
  });
})();
''';

/// Downloads [url] with the page's login cookies and hands the file to the app.
String downloadScript(String url) {
  const template = r'''
(async function () {
  var url = __URL__;
  try {
    var r = await fetch(url, { credentials: 'include' });
    if (!r.ok) { EdenApp.postMessage(JSON.stringify({ t: 'dlerr', msg: 'The server answered ' + r.status + '.' })); return; }
    var cd = r.headers.get('content-disposition') || '';
    var m = /filename\*=UTF-8''([^;]+)/i.exec(cd) || /filename="?([^";]+)"?/i.exec(cd);
    var blob = await r.blob();
    var fr = new FileReader();
    fr.onload = function () {
      var data = String(fr.result);
      EdenApp.postMessage(JSON.stringify({
        t: 'dl', url: r.url || url, name: m ? decodeURIComponent(m[1]) : '',
        mime: blob.type || r.headers.get('content-type') || '', data: data.substring(data.indexOf(',') + 1)
      }));
    };
    fr.onerror = function () { EdenApp.postMessage(JSON.stringify({ t: 'dlerr', msg: 'Could not read the file.' })); };
    fr.readAsDataURL(blob);
  } catch (e) {
    EdenApp.postMessage(JSON.stringify({ t: 'dlerr', msg: String(e) }));
  }
})();
''';
  return template.replaceFirst('__URL__', jsonEncode(url));
}
