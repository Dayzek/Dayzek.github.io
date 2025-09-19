const opts = { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 };

function fmt(n, d = 6) { return (n == null || Number.isNaN(n)) ? "—" : Number(n).toFixed(d); }
function fmtAlt(n) { return (n == null) ? "—" : Number(n).toFixed(1) + " m"; }
function fmtAcc(n) { return (n == null) ? "—" : Number(n).toFixed(1); }
function fmtSpeed(n) { return (n == null) ? "—" : Number(n).toFixed(2); }
function fmtDate(ts) { return ts ? new Date(ts).toLocaleString() : "—"; }
function set(el, v) { document.getElementById(el).textContent = v; }

function showPosition(prefix, pos) {
  const c = pos.coords;
  set(prefix + '-lat', fmt(c.latitude));
  set(prefix + '-lon', fmt(c.longitude));
  set(prefix + '-alt', fmtAlt(c.altitude));
  set(prefix + '-acc', fmtAcc(c.accuracy));
  set(prefix + '-speed', fmtSpeed(c.speed));
  set(prefix + '-date', fmtDate(pos.timestamp));
}

function showError(targetId, err) {
  const map = { 1: "Permission refusée.", 2: "Position indisponible.", 3: "Délai dépassé." };
  document.getElementById(targetId).textContent =
    (map[err.code] || "Erreur") + (err.message ? " (" + err.message + ")" : "");
}

const onceBtn = document.getElementById('btn-once');
onceBtn.addEventListener('click', () => {
  document.getElementById('once-err').textContent = "";
  if (!('geolocation' in navigator)) {
    document.getElementById('once-err').textContent = "API non disponible.";
    return;
  }
  navigator.geolocation.getCurrentPosition(
    p => showPosition('once', p),
    e => showError('once-err', e),
    opts
  );
});

let watchId = null;
const startBtn = document.getElementById('btn-start');
const stopBtn = document.getElementById('btn-stop');

startBtn.addEventListener('click', () => {
  document.getElementById('watch-err').textContent = "";
  if (!('geolocation' in navigator)) {
    document.getElementById('watch-err').textContent = "API non disponible.";
    return;
  }
  if (watchId != null) return;
  watchId = navigator.geolocation.watchPosition(
    p => { showPosition('watch', p); },
    e => { showError('watch-err', e); },
    opts
  );
  startBtn.disabled = true;
  stopBtn.disabled = false;
  document.getElementById('hint').textContent =
    "Il faut bouger un peu avec le téléphone pour voir la vitesse/altitude.";
});

stopBtn.addEventListener('click', () => {
  if (watchId != null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  startBtn.disabled = false;
  stopBtn.disabled = true;
  document.getElementById('hint').textContent = "";
});