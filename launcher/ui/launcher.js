// Oberfläche des Launchers: zeigt den Zustand, den launcher.mjs über /api/events meldet.
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const rich = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`(.+?)`/g, '<code>$1</code>');
const act = (a, extra = {}) => fetch('/api/action', { method: 'POST', headers: { 'content-type': 'application/json', 'x-em-launcher': '1' }, body: JSON.stringify({ a, ...extra }) }).catch(() => {});

let S = null, uiVer = null, notesKey = '', playWait = 0;

// Fenster: quer liegendes DIN-A4-Format (1,414 : 1), mittig auf dem Bildschirm. In einem gewöhnlichen Browser-Tab
// ignoriert der Browser diese Aufrufe; sie wirken nur im eigenen Launcher-Fenster.
(function place() {
  try {
    const sw = screen.availWidth, sh = screen.availHeight, sx = screen.availLeft || 0, sy = screen.availTop || 0;
    let w = Math.min(1120, Math.floor(sw * 0.92)), h = Math.round(w / 1.414);
    if (h > sh * 0.92) { h = Math.floor(sh * 0.92); w = Math.round(h * 1.414); }
    window.resizeTo(w, h);
    window.moveTo(sx + Math.round((sw - w) / 2), sy + Math.round((sh - h) / 2));
  } catch {}
})();

// Hintergrund: Bilder aus dem Spiel, langsam überblendet
const ART = ['neu_gw', 'neu_kristall', 'neu_glut', 'neu_frost', 'neu_ruinen', 'neu_schatten'];
let artI = 0, artTop = false;
function nextArt() {
  const el = $(artTop ? 'bgA' : 'bgB'), other = $(artTop ? 'bgB' : 'bgA');
  const url = `/art/${ART[artI++ % ART.length]}.jpg`;
  const img = new Image();
  img.onload = () => { el.style.backgroundImage = `url(${url})`; el.classList.add('on'); other.classList.remove('on'); artTop = !artTop; };
  img.src = url;
}
nextArt();
setInterval(nextArt, 14000);

function renderNotes(notes, fresh) {
  const key = JSON.stringify(notes) + fresh;
  if (key === notesKey) return;
  notesKey = key;
  $('newBadge').hidden = !fresh;
  $('notes').innerHTML = notes.length ? notes.map((n, i) => {
    let html = '', open = false;
    for (const it of n.items) {
      if (it.h) { if (open) { html += '</ul>'; open = false; } html += `<h4>${esc(it.h)}</h4>`; }
      else { if (!open) { html += '<ul>'; open = true; } html += `<li>${rich(it.t)}</li>`; }
    }
    if (open) html += '</ul>';
    return `<article class="note${i ? ' old' : ''}"><h3><small>${esc(n.version)}</small>${esc(n.title)}</h3>${n.date ? `<time>${esc(n.date)}</time>` : ''}${html}</article>`;
  }).join('') : '<p class="muted">Noch keine Neuigkeiten.</p>';
}

function render() {
  const busy = !['ready', 'error', 'deferred'].includes(S.phase);
  document.body.classList.toggle('err', S.phase === 'error');
  $('label').textContent = S.label;
  $('detail').textContent = S.detail || '';
  $('detail').title = S.detail || '';
  const pct = Math.round(S.progress * 100);
  $('pct').textContent = S.phase === 'error' || S.phase === 'deferred' ? '' : pct + ' %';
  $('fill').style.width = pct + '%';
  $('bar').setAttribute('aria-valuenow', pct);
  $('bar').classList.toggle('busy', !!S.busyBar);
  $('bar').classList.toggle('done', S.phase === 'ready');
  $('ver').textContent = S.version ? `Version ${S.version}${S.build ? ' · ' + S.build : ''}` : '';
  $('btnCheck').disabled = $('btnRepair').disabled = busy;
  $('btnRepair').hidden = S.dev;
  $('btnShortcut').hidden = !S.win;
  const a = $('btnAction');
  a.hidden = !(S.phase === 'deferred' || S.phase === 'error');
  a.className = 'link hot';
  a.textContent = S.phase === 'deferred' ? 'Server beenden und aktualisieren' : 'Erneut versuchen';
  a.dataset.a = S.phase === 'deferred' ? 'update-now' : 'check';

  // Server
  const sv = S.server, join = S.joinAddr.trim();
  $('srvDot').className = 'dot' + (sv.running ? ' on' : sv.starting ? ' wait' : sv.error ? ' err' : '');
  $('srvTitle').textContent = sv.running ? 'Server läuft' : sv.starting ? 'Server startet …' : 'Server aus';
  $('srvOnline').hidden = !sv.running;
  $('srvOnline').textContent = sv.online === 1 ? '1 Held online' : `${sv.online} Helden online`;
  $('srvText').textContent = sv.error && !sv.running ? sv.error
    : sv.running ? (sv.mine ? 'Der Server läuft weiter, wenn du dieses Fenster schließt. ' : '') + (sv.addresses.length ? 'Mitspielende erreichen dich unter:' : 'Er ist nur auf diesem Rechner erreichbar.')
    : 'Zum Alleinspielen startet der Server von selbst. Für eine Koop-Runde starte ihn hier und gib deine Adresse weiter.';
  const addrKey = JSON.stringify(sv.addresses);
  if ($('srvAddrs').dataset.k !== addrKey) {
    $('srvAddrs').dataset.k = addrKey;
    $('srvAddrs').innerHTML = sv.addresses.map(x => `<li><span class="k">${x.kind === 'tailscale' ? 'Tailscale' : 'Heimnetz'}</span><code>${esc(x.url)}</code><button data-copy="${esc(x.url)}">Kopieren</button></li>`).join('');
  }
  const bs = $('btnServer');
  bs.textContent = sv.running ? 'Server stoppen' : sv.starting ? 'Startet …' : 'Server starten';
  bs.classList.toggle('stop', sv.running);
  bs.disabled = sv.starting || (!sv.running && (!S.ready || busy));
  const bp = $('btnPlay');
  bp.textContent = Date.now() < playWait ? 'Wird geöffnet …' : join ? 'Beitreten' : 'Spiel starten';
  bp.disabled = Date.now() < playWait || (!join && (!S.ready || busy || sv.starting));
  if (document.activeElement !== $('joinAddr')) $('joinAddr').value = S.joinAddr;
  renderNotes(S.notes, S.updated > 0);
}

$('btnPlay').onclick = () => { playWait = Date.now() + 2500; act('play'); render(); setTimeout(render, 2600); };
$('btnServer').onclick = () => act(S.server.running ? 'server-stop' : 'server-start');
$('btnCheck').onclick = () => act('check');
$('btnShortcut').onclick = e => { act('shortcut'); e.currentTarget.textContent = 'Verknüpfung angelegt'; };
$('btnRepair').onclick = () => act('repair');
$('btnAction').onclick = e => act(e.currentTarget.dataset.a);
$('joinAddr').onchange = e => act('join', { addr: e.target.value });
$('srvAddrs').onclick = e => {
  const b = e.target.closest('button[data-copy]');
  if (!b) return;
  navigator.clipboard?.writeText(b.dataset.copy).then(() => { b.textContent = 'Kopiert'; setTimeout(() => (b.textContent = 'Kopieren'), 1400); });
};

// Verbindung zum Launcher-Prozess; bricht sie länger ab, wurde er beendet
let lostTimer = null;
function connect() {
  const es = new EventSource('/api/events');
  es.onmessage = e => {
    clearTimeout(lostTimer); lostTimer = null; $('lost').hidden = true;
    S = JSON.parse(e.data);
    if (uiVer && S.ui && S.ui !== uiVer) return location.reload();
    uiVer = S.ui || uiVer;
    render();
  };
  es.onerror = () => { if (!lostTimer) lostTimer = setTimeout(() => ($('lost').hidden = false), 12000); };
}
connect();
