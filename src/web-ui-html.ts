// Self-contained HTML for Safari-based sync client (served at GET /)
// v2.0.0: Auth → File list → Pull/Push via obsidian:// URI → Progress polling

export function getWebUiHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<title>Vault Sync</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #1e1e2e; color: #cdd6f4; padding: 16px; max-width: 480px; margin: 0 auto; }
  h1 { font-size: 20px; margin-bottom: 16px; text-align: center; color: #89b4fa; }
  .step { display: none; }
  .step.active { display: block; }
  label { display: block; font-size: 14px; color: #a6adc8; margin-bottom: 4px; }
  input[type=text] { width: 100%; padding: 12px; font-size: 18px; border: 1px solid #45475a; border-radius: 8px; background: #313244; color: #cdd6f4; margin-bottom: 12px; }
  input.code-input { font-size: 28px; text-align: center; letter-spacing: 12px; }
  button { width: 100%; padding: 14px; font-size: 16px; border: none; border-radius: 8px; cursor: pointer; margin-bottom: 8px; }
  .btn-primary { background: #89b4fa; color: #1e1e2e; font-weight: 600; }
  .btn-push { background: #a6e3a1; color: #1e1e2e; font-weight: 600; }
  .btn-secondary { background: #45475a; color: #cdd6f4; }
  .btn-primary:disabled, .btn-push:disabled { opacity: 0.5; }
  .error { color: #f38ba8; font-size: 14px; margin-bottom: 8px; display: none; }
  .status { text-align: center; color: #a6adc8; font-size: 14px; margin: 12px 0; }
  .file-item { padding: 8px 10px; background: #313244; border-radius: 6px; margin-bottom: 4px; display: flex; justify-content: space-between; align-items: center; }
  .file-name { font-size: 13px; word-break: break-all; flex: 1; }
  .file-size { font-size: 12px; color: #6c7086; margin-left: 8px; white-space: nowrap; }
  .file-count { text-align: center; color: #6c7086; font-size: 13px; margin-bottom: 12px; }
  .file-list-scroll { max-height: 50vh; overflow-y: auto; margin-bottom: 12px; }
  .progress-bar { width: 100%; height: 10px; background: #313244; border-radius: 5px; overflow: hidden; margin: 12px 0; }
  .progress-fill { height: 100%; background: #89b4fa; width: 0%; transition: width 0.3s; }
  .phase-label { text-align: center; font-size: 15px; color: #89b4fa; margin-bottom: 4px; }
  .current-file { text-align: center; font-size: 13px; color: #a6adc8; word-break: break-all; margin-bottom: 8px; }
  .counter { text-align: center; font-size: 14px; color: #6c7086; margin-bottom: 8px; }
  .error-list { background: #302030; border-radius: 8px; padding: 10px; margin: 8px 0; font-size: 13px; color: #f38ba8; max-height: 120px; overflow-y: auto; }
  .summary { text-align: center; margin: 16px 0; font-size: 16px; }
  .success { color: #a6e3a1; }
  .note { text-align: center; font-size: 12px; color: #585b70; margin: 8px 0; }
  details { margin-top: 16px; }
  summary { font-size: 13px; color: #585b70; cursor: pointer; }
  #debug-log { background: #181825; border-radius: 6px; padding: 8px; margin-top: 6px; font-size: 11px; font-family: monospace; max-height: 200px; overflow-y: auto; color: #6c7086; white-space: pre-wrap; }
  .folder-group { margin-bottom: 8px; }
  .folder-name { font-size: 12px; color: #585b70; padding: 4px 0; font-weight: 600; }
</style>
</head>
<body>
<h1>Vault Sync</h1>

<!-- Step 1: Auth -->
<div id="step-auth" class="step active">
  <label>4-digit code from PC</label>
  <input type="text" id="code" class="code-input" maxlength="4" inputmode="numeric" placeholder="0000" autofocus>
  <p id="auth-error" class="error"></p>
  <button class="btn-primary" onclick="doAuth()">Connect</button>
</div>

<!-- Step 2: File list + actions -->
<div id="step-files" class="step">
  <p class="file-count" id="file-count"></p>
  <div class="file-list-scroll" id="file-list"></div>
  <button class="btn-primary" id="btn-pull" onclick="doSync('pull')">Pull All to iPhone</button>
  <button class="btn-push" id="btn-push" onclick="doSync('push')">Push iPhone to PC</button>
  <p class="note">Unchanged files will be skipped automatically</p>
</div>

<!-- Step 3: Syncing progress -->
<div id="step-sync" class="step">
  <p class="phase-label" id="sync-phase">Connecting...</p>
  <div class="progress-bar"><div class="progress-fill" id="sync-progress"></div></div>
  <p class="counter" id="sync-counter"></p>
  <p class="current-file" id="sync-current"></p>
  <div id="sync-errors"></div>
</div>

<!-- Step 4: Complete -->
<div id="step-done" class="step">
  <p class="summary" id="done-summary"></p>
  <div id="done-errors"></div>
  <button class="btn-secondary" onclick="doComplete()">Done</button>
</div>

<!-- Debug log -->
<details>
  <summary>Debug Log</summary>
  <div id="debug-log"></div>
</details>

<script>
let token = '';
let manifest = [];
let vaultName = '';
let pollTimer = null;
const BASE = location.origin;
const HOST_IP = location.hostname;
const HOST_PORT = location.port || '53217';

function show(stepId) {
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  document.getElementById(stepId).classList.add('active');
}

function showError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.style.display = 'block';
}

function log(msg) {
  const el = document.getElementById('debug-log');
  const ts = new Date().toLocaleTimeString();
  el.textContent += '[' + ts + '] ' + msg + '\\n';
  el.scrollTop = el.scrollHeight;
}

async function api(method, path, body) {
  const opts = { method, headers: {} };
  if (token) opts.headers['X-Token'] = token;
  if (body) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  return fetch(BASE + path, opts);
}

function fmtSize(b) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b/1024).toFixed(1) + ' KB';
  return (b/1048576).toFixed(1) + ' MB';
}

async function doAuth() {
  const code = document.getElementById('code').value.trim();
  if (!/^\\d{4}$/.test(code)) { showError('auth-error', 'Enter 4 digits'); return; }
  log('Authenticating...');
  try {
    const res = await api('POST', '/auth', { code, deviceName: 'Safari' });
    if (!res.ok) { showError('auth-error', 'Invalid code'); log('Auth failed: ' + res.status); return; }
    const data = await res.json();
    token = data.token;
    manifest = data.manifest;
    log('Auth OK, ' + manifest.length + ' files in manifest');

    const viRes = await fetch(BASE + '/vault-info');
    vaultName = (await viRes.json()).name;
    log('Vault: ' + vaultName);

    renderFileList();
    show('step-files');
  } catch (e) {
    showError('auth-error', 'Connection failed: ' + e.message);
    log('Auth error: ' + e.message);
  }
}

function renderFileList() {
  const list = document.getElementById('file-list');
  document.getElementById('file-count').textContent = manifest.length + ' file(s) on PC';

  // Group by folder
  const folders = {};
  manifest.forEach(f => {
    const parts = f.path.split('/');
    const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : '(root)';
    if (!folders[folder]) folders[folder] = [];
    folders[folder].push(f);
  });

  list.innerHTML = '';
  const sortedFolders = Object.keys(folders).sort();
  for (const folder of sortedFolders) {
    const group = document.createElement('div');
    group.className = 'folder-group';
    const header = document.createElement('div');
    header.className = 'folder-name';
    header.textContent = folder + ' (' + folders[folder].length + ')';
    group.appendChild(header);
    for (const f of folders[folder]) {
      const item = document.createElement('div');
      item.className = 'file-item';
      const name = document.createElement('span');
      name.className = 'file-name';
      name.textContent = f.path.split('/').pop();
      const size = document.createElement('span');
      size.className = 'file-size';
      size.textContent = fmtSize(f.size || 0);
      item.appendChild(name);
      item.appendChild(size);
      group.appendChild(item);
    }
    list.appendChild(group);
  }
}

async function doSync(action) {
  log('Storing sync intent: ' + action);
  try {
    const res = await api('POST', '/sync-intent', { action });
    if (!res.ok) { log('Failed to store intent: ' + res.status); return; }
  } catch (e) { log('Intent error: ' + e.message); return; }

  show('step-sync');
  document.getElementById('sync-phase').textContent = 'Intent stored! Open Obsidian now.';
  document.getElementById('sync-progress').style.width = '0%';
  document.getElementById('sync-counter').textContent = 'In Obsidian: Command palette → "Sync Now (from Safari)"';
  document.getElementById('sync-current').textContent = '';
  document.getElementById('sync-errors').innerHTML = '';

  // Start polling — will update once plugin starts syncing
  startPolling();
}

function startPolling() {
  log('Starting status polling');
  pollTimer = setInterval(async () => {
    try {
      const res = await api('GET', '/sync-status');
      if (!res.ok) { log('Poll error: ' + res.status); return; }
      const s = await res.json();
      updateProgress(s);
    } catch (e) {
      log('Poll fetch error: ' + e.message);
    }
  }, 500);
}

function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

const PHASE_LABELS = {
  idle: 'Waiting...',
  scanning: 'Scanning vault...',
  downloading: 'Downloading files...',
  uploading: 'Uploading files...',
  writing: 'Writing files...',
  complete: 'Complete!',
  error: 'Error',
};

function updateProgress(s) {
  document.getElementById('sync-phase').textContent = PHASE_LABELS[s.phase] || s.phase;
  document.getElementById('sync-progress').style.width = s.progress + '%';
  if (s.total > 0) {
    document.getElementById('sync-counter').textContent = s.done + ' / ' + s.total + ' files';
  }
  document.getElementById('sync-current').textContent = s.current || '';

  if (s.errors && s.errors.length > 0) {
    const el = document.getElementById('sync-errors');
    el.innerHTML = '<div class="error-list">' + s.errors.map(e => e + '<br>').join('') + '</div>';
  }

  if (s.phase === 'complete' || s.phase === 'error') {
    stopPolling();
    log('Sync finished: ' + s.phase);
    showComplete(s);
  }
}

function showComplete(s) {
  const errCount = s.errors ? s.errors.length : 0;
  const synced = s.done - errCount;
  const skipped = (s.total > 0) ? 0 : manifest.length; // if total=0, all skipped
  let html = '';
  if (s.phase === 'error') {
    html = '<span style="color:#f38ba8">Sync failed</span>';
  } else if (errCount > 0) {
    html = '<span class="success">' + synced + ' files synced</span>, <span style="color:#f38ba8">' + errCount + ' errors</span>';
  } else if (s.total === 0) {
    html = '<span class="success">Already up to date!</span>';
  } else {
    html = '<span class="success">' + synced + ' files synced</span>';
  }
  document.getElementById('done-summary').innerHTML = html;

  if (errCount > 0) {
    document.getElementById('done-errors').innerHTML =
      '<div class="error-list">' + s.errors.map(e => e + '<br>').join('') + '</div>';
  }

  show('step-done');
}

async function doComplete() {
  await api('POST', '/complete').catch(() => {});
  log('Session complete');
  location.reload();
}

// Auto-focus code input
document.getElementById('code').focus();
</script>
</body>
</html>`;
}
