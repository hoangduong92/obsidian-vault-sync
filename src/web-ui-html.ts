// Self-contained HTML for the web-based sync client (served at GET /)
// iPhone/Android opens this in Safari/Chrome — no plugin needed

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
  .btn-secondary { background: #45475a; color: #cdd6f4; }
  .btn-primary:disabled { opacity: 0.5; }
  .error { color: #f38ba8; font-size: 14px; margin-bottom: 8px; display: none; }
  .status { text-align: center; color: #a6adc8; font-size: 14px; margin: 12px 0; }
  .diff-section { margin-bottom: 12px; }
  .diff-section h3 { font-size: 14px; color: #a6adc8; margin-bottom: 4px; }
  .diff-item { padding: 6px 8px; background: #313244; border-radius: 4px; margin-bottom: 2px; font-size: 13px; word-break: break-all; }
  .diff-upload { border-left: 3px solid #a6e3a1; }
  .diff-download { border-left: 3px solid #89b4fa; }
  .diff-conflict { border-left: 3px solid #f9e2af; }
  .progress-bar { width: 100%; height: 8px; background: #313244; border-radius: 4px; overflow: hidden; margin: 12px 0; }
  .progress-fill { height: 100%; background: #89b4fa; width: 0%; transition: width 0.2s; }
  .summary { text-align: center; margin: 16px 0; }
  .file-item { padding: 12px; background: #313244; border-radius: 8px; margin-bottom: 6px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; }
  .file-item:active { background: #45475a; }
  .file-name { font-size: 14px; word-break: break-all; flex: 1; }
  .file-size { font-size: 12px; color: #6c7086; margin-left: 8px; white-space: nowrap; }
  .file-count { text-align: center; color: #6c7086; font-size: 13px; margin-bottom: 12px; }
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

<!-- Step 2: File browser -->
<div id="step-browse" class="step">
  <div id="file-list"></div>
</div>

<!-- Step 3: File viewer -->
<div id="step-view" class="step">
  <div style="display:flex;gap:8px;margin-bottom:12px;">
    <button class="btn-secondary" onclick="backToList()" style="flex:1">Back</button>
    <button class="btn-primary" onclick="saveToObsidian()" style="flex:1">Save to Obsidian</button>
  </div>
  <h2 id="view-title" style="font-size:16px;margin-bottom:8px;"></h2>
  <div id="view-content" style="background:#313244;padding:12px;border-radius:8px;white-space:pre-wrap;font-size:14px;line-height:1.6;max-height:70vh;overflow-y:auto;"></div>
</div>

<script>
let token = '';
let diff = [];
let vaultName = '';
const BASE = location.origin;

function show(stepId) {
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  document.getElementById(stepId).classList.add('active');
}

function showError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.style.display = 'block';
}

async function api(method, path, body, isJson = true) {
  const opts = { method, headers: {} };
  if (token) opts.headers['X-Token'] = token;
  if (body && isJson) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  } else if (body) {
    opts.headers['Content-Type'] = 'application/octet-stream';
    opts.body = body;
  }
  return fetch(BASE + path, opts);
}

async function doAuth() {
  const code = document.getElementById('code').value.trim();
  if (!/^\\d{4}$/.test(code)) { showError('auth-error', 'Enter 4 digits'); return; }
  try {
    const res = await api('POST', '/auth', { code, deviceName: 'Web' });
    if (!res.ok) { showError('auth-error', 'Invalid code'); return; }
    const data = await res.json();
    token = data.token;
    // Get vault name for obsidian:// URI scheme
    const viRes = await fetch(BASE + '/vault-info');
    vaultName = (await viRes.json()).name;
    // Send empty manifest (web client has no local files) → everything becomes "download"
    const diffRes = await api('POST', '/manifest', { files: [] });
    const diffData = await diffRes.json();
    diff = diffData.diff;
    renderFileList();
    show('step-browse');
  } catch (e) {
    showError('auth-error', 'Connection failed: ' + e.message);
  }
}

let currentFile = null;
let currentContent = '';

function fmtSize(b) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b/1024).toFixed(1) + ' KB';
  return (b/1048576).toFixed(1) + ' MB';
}

function renderFileList() {
  const list = document.getElementById('file-list');
  const files = diff.filter(d => d.action === 'download');
  list.innerHTML = '<p class="file-count">' + files.length + ' file(s) on PC</p>';
  files.forEach(d => {
    const item = document.createElement('div');
    item.className = 'file-item';
    const name = document.createElement('span');
    name.className = 'file-name';
    name.textContent = d.path;
    const size = document.createElement('span');
    size.className = 'file-size';
    size.textContent = fmtSize(d.remoteEntry?.size || 0);
    item.appendChild(name);
    item.appendChild(size);
    item.onclick = () => viewFile(d.path);
    list.appendChild(item);
  });
}

async function viewFile(path) {
  currentFile = path;
  try {
    const res = await fetch(BASE + '/file?path=' + encodeURIComponent(path), {
      headers: { 'X-Token': token }
    });
    currentContent = await res.text();
    document.getElementById('view-title').textContent = path;
    document.getElementById('view-content').textContent = currentContent;
    show('step-view');
  } catch (e) {
    alert('Failed to load: ' + e.message);
  }
}

function backToList() { show('step-browse'); }

function saveToObsidian() {
  if (!currentFile || !currentContent) return;
  const uri = 'obsidian://new?vault=' + encodeURIComponent(vaultName)
    + '&file=' + encodeURIComponent(currentFile.replace(/\\.md$/, ''))
    + '&content=' + encodeURIComponent(currentContent)
    + '&overwrite=true';
  window.location.href = uri;
}

async function doCancel() {
  await api('POST', '/complete').catch(() => {});
  location.reload();
}

// Auto-focus code input
document.getElementById('code').focus();
</script>
</body>
</html>`;
}
