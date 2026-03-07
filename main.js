"use strict";var St=Object.create;var M=Object.defineProperty;var Et=Object.getOwnPropertyDescriptor;var bt=Object.getOwnPropertyNames;var xt=Object.getPrototypeOf,Ct=Object.prototype.hasOwnProperty;var C=(s,i)=>()=>(s&&(i=s(s=0)),i);var W=(s,i)=>{for(var t in i)M(s,t,{get:i[t],enumerable:!0})},X=(s,i,t,e)=>{if(i&&typeof i=="object"||typeof i=="function")for(let n of bt(i))!Ct.call(s,n)&&n!==t&&M(s,n,{get:()=>i[n],enumerable:!(e=Et(i,n))||e.enumerable});return s};var Pt=(s,i,t)=>(t=s!=null?St(xt(s)):{},X(i||!s||!s.__esModule?M(t,"default",{value:s,enumerable:!0}):t,s)),q=s=>X(M({},"__esModule",{value:!0}),s);async function et(s){let i=await crypto.subtle.digest("SHA-256",s);return Array.from(new Uint8Array(i)).map(t=>t.toString(16).padStart(2,"0")).join("")}function nt(){return(crypto.getRandomValues(new Uint32Array(1))[0]%1e4).toString().padStart(4,"0")}function ot(){let s=crypto.getRandomValues(new Uint8Array(32));return Array.from(s).map(i=>i.toString(16).padStart(2,"0")).join("")}var te,z=C(()=>{"use strict";te=new TextEncoder().encode("vault-sync-salt-v1")});function kt(s,i){return i.length===0?!0:i.some(t=>s===t||s.startsWith(t.endsWith("/")?t:t+"/"))}async function S(s,i){let t=s.vault.getFiles(),e=[];for(let n of t)if(kt(n.path,i.selectedPaths))try{let o=n.stat,r=await s.vault.readBinary(n),a=await et(r);e.push({path:n.path,mtime:o.mtime,size:o.size,hash:a})}catch(o){console.warn(`[VaultSync] skipping ${n.path}:`,o)}return e}async function I(s,i){let t=s.vault.getAbstractFileByPath(i);if(!(t instanceof st.TFile))throw new Error(`File not found: ${i}`);return s.vault.readBinary(t)}async function v(s,i,t){let e=s.vault.getAbstractFileByPath(i),n=i.split("/");if(n.length>1){let o=n.slice(0,-1).join("/");s.vault.getAbstractFileByPath(o)||await s.vault.createFolder(o)}e?await s.vault.modifyBinary(e,t):await s.vault.createBinary(i,t)}var st,O=C(()=>{"use strict";st=require("obsidian");z()});function E(s,i,t){let e=new Map(s.map(a=>[a.path,a])),n=new Map(i.map(a=>[a.path,a])),o=new Set([...e.keys(),...n.keys()]),r=[];for(let a of o){let l=e.get(a),c=n.get(a);if(l&&!c){r.push({path:a,action:"upload",localEntry:l});continue}if(!l&&c){r.push({path:a,action:"download",remoteEntry:c});continue}if(l&&c){if(l.hash===c.hash)continue;if(t!==void 0){let d=l.mtime>t,p=c.mtime>t;if(d&&p){r.push({path:a,action:"conflict",localEntry:l,remoteEntry:c});continue}}l.mtime>=c.mtime?r.push({path:a,action:"upload",localEntry:l,remoteEntry:c}):r.push({path:a,action:"download",localEntry:l,remoteEntry:c})}}return r}function it(s){let i=new Date().toISOString().replace(/[:.]/g,"-"),t=s.lastIndexOf(".");return t===-1?`${s}.sync-conflict-${i}`:`${s.slice(0,t)}.sync-conflict-${i}${s.slice(t)}`}var U=C(()=>{"use strict"});function rt(){return`<!DOCTYPE html>
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
  document.getElementById('sync-counter').textContent = 'In Obsidian: Command palette \u2192 "Sync Now (from Safari)"';
  document.getElementById('sync-current').textContent = '';
  document.getElementById('sync-errors').innerHTML = '';

  // Start polling \u2014 will update once plugin starts syncing
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
<\/script>
</body>
</html>`}var at=C(()=>{"use strict"});function lt(s){let i=[],t=[],e=0;for(let r of s){let a=Buffer.from(r.path,"utf-8"),l=Buffer.alloc(30);l.writeUInt32LE(67324752,0),l.writeUInt16LE(20,4),l.writeUInt16LE(0,6),l.writeUInt16LE(0,8),l.writeUInt16LE(0,10),l.writeUInt16LE(0,12),l.writeUInt32LE(ct(r.data),14),l.writeUInt32LE(r.data.length,18),l.writeUInt32LE(r.data.length,22),l.writeUInt16LE(a.length,26),l.writeUInt16LE(0,28),i.push(l,a,r.data);let c=Buffer.alloc(46);c.writeUInt32LE(33639248,0),c.writeUInt16LE(20,4),c.writeUInt16LE(20,6),c.writeUInt16LE(0,8),c.writeUInt16LE(0,10),c.writeUInt16LE(0,12),c.writeUInt16LE(0,14),c.writeUInt32LE(ct(r.data),16),c.writeUInt32LE(r.data.length,20),c.writeUInt32LE(r.data.length,24),c.writeUInt16LE(a.length,28),c.writeUInt16LE(0,30),c.writeUInt16LE(0,32),c.writeUInt16LE(0,34),c.writeUInt16LE(0,36),c.writeUInt32LE(0,38),c.writeUInt32LE(e,42),t.push(c,a),e+=30+a.length+r.data.length}let n=t.reduce((r,a)=>r+a.length,0),o=Buffer.alloc(22);return o.writeUInt32LE(101010256,0),o.writeUInt16LE(0,4),o.writeUInt16LE(0,6),o.writeUInt16LE(s.length,8),o.writeUInt16LE(s.length,10),o.writeUInt32LE(n,12),o.writeUInt32LE(e,16),o.writeUInt16LE(0,20),Buffer.concat([...i,...t,o])}function ct(s){let i=4294967295;for(let t=0;t<s.length;t++)i=Tt[(i^s[t])&255]^i>>>8;return(i^4294967295)>>>0}var Tt,dt=C(()=>{"use strict";Tt=(()=>{let s=new Uint32Array(256);for(let i=0;i<256;i++){let t=i;for(let e=0;e<8;e++)t=t&1?3988292384^t>>>1:t>>>1;s[i]=t}return s})()});var ut={};W(ut,{startServer:()=>Lt});function h(s,i,t){let e=JSON.stringify(t);s.writeHead(i,{"Content-Type":"application/json","Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"X-Token, Content-Type","Access-Control-Allow-Methods":"GET, POST, OPTIONS"}),s.end(e)}function It(s,i){s.writeHead(200,{"Content-Type":"application/octet-stream","Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"X-Token, Content-Type"}),s.end(i)}async function B(s){return new Promise((i,t)=>{let e=[];s.on("data",n=>e.push(n)),s.on("end",()=>i(Buffer.concat(e))),s.on("error",t)})}function Bt(s,i){return s.headers["x-token"]===i.token}async function Lt(s,i,t){if(!pt.Platform.isDesktop)throw new Error("Server only supported on desktop");let e={code:nt(),token:null,manifest:await S(s,i),active:!0,syncStatus:{phase:"idle",progress:0,current:"",total:0,done:0,errors:[]},syncIntent:null},o=require("http").createServer(async(r,a)=>{var d,p;if(!e.active){h(a,503,{error:"Server stopped"});return}let l=new URL((d=r.url)!=null?d:"/","http://localhost"),c=(p=r.method)!=null?p:"GET";if(c==="OPTIONS"){h(a,204,{});return}try{await Mt(s,i,e,l,c,r,a)}catch(u){console.error("[VaultSync server] error:",u),h(a,500,{error:String(u)})}});return o.listen(At,"0.0.0.0",()=>{let a=require("os").networkInterfaces(),l="127.0.0.1",c=/^(vEthernet|WSL|docker|br-|virbr|vmnet|vbox|tun|tap)/i;for(let[d,p]of Object.entries(a))if(!c.test(d)){for(let u of p!=null?p:[])if(u.family==="IPv4"&&!u.internal){l=u.address;break}if(l!=="127.0.0.1")break}t(e.code,l)}),()=>{e.active=!1,o.close()}}async function Mt(s,i,t,e,n,o,r){let a=e.pathname;if(a==="/"&&n==="GET"){let l=rt();r.writeHead(200,{"Content-Type":"text/html; charset=utf-8"}),r.end(l);return}if(a==="/vault-info"&&n==="GET"){h(r,200,{name:s.vault.getName()});return}if(a==="/sync-intent"&&n==="GET"){t.syncIntent?(h(r,200,t.syncIntent),t.syncIntent=null):h(r,200,{action:null,token:null});return}if(a==="/auth"&&n==="POST"){if(JSON.parse((await B(o)).toString()).code!==t.code){h(r,401,{error:"Invalid code"});return}t.token=ot();let c={token:t.token,manifest:t.manifest};h(r,200,c);return}if(!Bt(o,t)){h(r,401,{error:"Unauthorized"});return}if(a==="/manifest"&&n==="GET"){h(r,200,{manifest:t.manifest});return}if(a==="/manifest"&&n==="POST"){let l=JSON.parse((await B(o)).toString()),d={diff:E(l.files,t.manifest)};h(r,200,d);return}if(a==="/file"&&n==="GET"){let l=e.searchParams.get("path");if(!l){h(r,400,{error:"Missing path"});return}let c=await I(s,l);It(r,Buffer.from(c));return}if(a==="/file"&&n==="POST"){let l=e.searchParams.get("path");if(!l){h(r,400,{error:"Missing path"});return}let c=await B(o);await v(s,l,c.buffer),h(r,200,{ok:!0});return}if(a==="/download-all"&&n==="GET"){let l=[];for(let d of t.manifest)try{let p=await I(s,d.path);l.push({path:d.path,data:Buffer.from(p)})}catch(p){}let c=lt(l);r.writeHead(200,{"Content-Type":"application/zip","Content-Disposition":'attachment; filename="vault-sync.zip"',"Access-Control-Allow-Origin":"*"}),r.end(c);return}if(a==="/sync-intent"&&n==="POST"){let l=JSON.parse((await B(o)).toString());t.syncIntent={action:l.action,token:t.token},h(r,200,{ok:!0});return}if(a==="/sync-status"&&n==="GET"){h(r,200,t.syncStatus);return}if(a==="/sync-status"&&n==="POST"){let l=JSON.parse((await B(o)).toString());t.syncStatus=l,h(r,200,{ok:!0});return}if(a==="/complete"&&n==="POST"){h(r,200,{ok:!0}),t.active=!1;return}h(r,404,{error:"Not found"})}var pt,At,ft=C(()=>{"use strict";pt=require("obsidian");z();O();U();at();dt();At=53217});var zt={};W(zt,{default:()=>V});module.exports=q(zt);var m=require("obsidian");var P=require("obsidian"),D=class extends P.PluginSettingTab{constructor(i,t){super(i,t),this.plugin=t}display(){let{containerEl:i}=this;i.empty(),i.createEl("h2",{text:"Vault Sync Settings"}),new P.Setting(i).setName("Last host IP").setDesc("IP address of the last desktop host (auto-filled after first connect).").addText(t=>t.setPlaceholder("192.168.1.x").setValue(this.plugin.settings.lastHostIp).onChange(async e=>{this.plugin.settings.lastHostIp=e.trim(),await this.plugin.saveSettings()})),new P.Setting(i).setName("Port").setDesc("HTTP port the host server listens on (default: 53217).").addText(t=>t.setPlaceholder("53217").setValue(String(this.plugin.settings.port)).onChange(async e=>{let n=parseInt(e.trim(),10);!isNaN(n)&&n>0&&n<65536&&(this.plugin.settings.port=n,await this.plugin.saveSettings())})),new P.Setting(i).setName("Selected paths").setDesc("Files or folders to include in sync, one per line. Leave empty to sync the entire vault.").addTextArea(t=>{t.setPlaceholder(`Notes/
Projects/work.md`).setValue(this.plugin.settings.selectedPaths.join(`
`)).onChange(async e=>{this.plugin.settings.selectedPaths=e.split(`
`).map(n=>n.trim()).filter(Boolean),await this.plugin.saveSettings()}),t.inputEl.rows=6,t.inputEl.style.width="100%"}),i.createEl("p",{text:'Tip: Use "Host Sync Session" on your desktop, then "Connect to Sync" on mobile.',cls:"setting-item-description"})}};function Y(s){var i,t,e;return{lastHostIp:(i=s.lastHostIp)!=null?i:"",selectedPaths:(t=s.selectedPaths)!=null?t:[],port:(e=s.port)!=null?e:53217}}var Z=require("obsidian"),H=class extends Z.Modal{constructor(i,t,e){super(i),this.settings=t,this.onSubmit=e}onOpen(){let{contentEl:i}=this;i.empty(),i.createEl("h2",{text:"Vault Sync \u2014 Connect"}),i.createEl("label",{text:"Host IP address"});let t=i.createEl("input",{type:"text"});t.placeholder="192.168.1.x",t.value=this.settings.lastHostIp||"",t.style.width="100%",t.style.marginBottom="12px",t.style.padding="8px",t.style.fontSize="16px",i.createEl("label",{text:"4-digit code"});let e=i.createEl("input",{type:"text"});e.placeholder="0000",e.maxLength=4,e.inputMode="numeric",e.style.width="100%",e.style.marginBottom="12px",e.style.padding="8px",e.style.fontSize="24px",e.style.textAlign="center",e.style.letterSpacing="8px";let n=i.createEl("p");n.style.color="red",n.style.display="none";let o=i.createDiv();o.style.display="flex",o.style.gap="8px",o.style.marginTop="12px";let r=o.createEl("button",{text:"Connect"});r.classList.add("mod-cta");let a=o.createEl("button",{text:"Cancel"}),l=()=>{let c=t.value.trim(),d=e.value.trim();if(!c||c.split(".").length!==4){n.textContent="Enter a valid IP (e.g. 192.168.1.105)",n.style.display="block";return}if(!/^\d{4}$/.test(d)){n.textContent="Code must be 4 digits",n.style.display="block";return}this.close(),this.onSubmit(c,d)};r.addEventListener("click",l),e.addEventListener("keydown",c=>{c.key==="Enter"&&l()}),a.addEventListener("click",()=>this.close()),setTimeout(()=>{this.settings.lastHostIp?e.focus():t.focus()},100)}onClose(){this.contentEl.empty()}};var j=require("obsidian");var Q=require("obsidian"),$=class extends Q.Modal{constructor(i,t){super(i),this.opts=t}onOpen(){let{contentEl:i}=this;i.addClass("vault-sync-host-modal"),i.createEl("h2",{text:"Vault Sync \u2014 Host"});let t=i.createDiv({cls:"vault-sync-row"});t.createEl("span",{text:"Your IP:",cls:"vault-sync-label"}),t.createEl("span",{text:this.opts.ip,cls:"vault-sync-ip"});let e=i.createDiv({cls:"vault-sync-row"});e.createEl("span",{text:"Code:",cls:"vault-sync-label"});let n=e.createEl("span",{cls:"vault-sync-code"});n.textContent=this.opts.code.split("").join(" ");let o=i.createDiv({cls:"vault-sync-row"});o.createEl("span",{text:"Port:",cls:"vault-sync-label"}),o.createEl("span",{text:String(this.opts.port),cls:"vault-sync-ip"}),this.statusEl=i.createEl("p",{text:"Waiting for connection...",cls:"vault-sync-status vault-sync-status--waiting"});let r=i.createDiv({cls:"vault-sync-btn-row"});this.cancelBtn=r.createEl("button",{text:"Cancel"}),this.cancelBtn.addEventListener("click",()=>{this.opts.onCancel(),this.close()})}setConnected(){this.statusEl&&(this.statusEl.textContent="Client connected!",this.statusEl.removeClass("vault-sync-status--waiting"),this.statusEl.addClass("vault-sync-status--connected"),this.cancelBtn.textContent="Close")}complete(){this.close()}onClose(){this.contentEl.empty()}};var tt=require("obsidian"),F=class extends tt.Modal{constructor(t,e){super(t);this.allFiles=[];this.opts=e,this.checkedPaths=new Set(e.initialPaths)}onOpen(){let{contentEl:t}=this;t.addClass("vault-sync-picker-modal"),t.createEl("h2",{text:"Select Files to Sync"});let e=t.createDiv({cls:"vault-sync-btn-row vault-sync-btn-row--left"}),n=e.createEl("button",{text:"Select All"}),o=e.createEl("button",{text:"Deselect All"}),r=t.createDiv({cls:"vault-sync-tree"});this.summaryEl=t.createEl("p",{cls:"vault-sync-summary"});let a=t.createDiv({cls:"vault-sync-btn-row"}),l=a.createEl("button",{text:"Confirm",cls:"mod-cta"}),c=a.createEl("button",{text:"Cancel"});this.allFiles=this.app.vault.getFiles(),this.checkedPaths.size===0&&this.allFiles.forEach(p=>this.checkedPaths.add(p.path));let d=this.groupByTopFolder(this.allFiles);this.renderTree(r,d),this.updateSummary(),n.addEventListener("click",()=>{this.allFiles.forEach(p=>this.checkedPaths.add(p.path)),this.renderTree(r,d),this.updateSummary()}),o.addEventListener("click",()=>{this.checkedPaths.clear(),this.renderTree(r,d),this.updateSummary()}),l.addEventListener("click",()=>{this.opts.onConfirm([...this.checkedPaths]),this.close()}),c.addEventListener("click",()=>{var p,u;(u=(p=this.opts).onCancel)==null||u.call(p),this.close()})}groupByTopFolder(t){let e=new Map;for(let n of t){let o=n.path.split("/"),r=o.length>1?o[0]:"";e.has(r)||e.set(r,[]),e.get(r).push(n)}return[...e.entries()].sort((n,o)=>n[0]===""?-1:o[0]===""?1:n[0].localeCompare(o[0])).map(([n,o])=>({folder:n,files:o}))}renderTree(t,e){t.empty();for(let n of e)if(n.folder!=="")this.renderFolderGroup(t,n);else for(let o of n.files)this.renderFileRow(t,o,0)}renderFolderGroup(t,e){let n=e.files,o=n.every(c=>this.checkedPaths.has(c.path)),r=t.createDiv({cls:"vault-sync-checkbox vault-sync-checkbox--folder"}),a=r.createEl("input",{type:"checkbox"});a.checked=o,a.indeterminate=!o&&n.some(c=>this.checkedPaths.has(c.path)),r.createEl("span",{text:e.folder+"/"}),a.addEventListener("change",()=>{var d;a.checked?n.forEach(p=>this.checkedPaths.add(p.path)):n.forEach(p=>this.checkedPaths.delete(p.path));let c=r.nextElementSibling;if(c)for(let p=0;p<n.length;p++){let u=(d=c.children[p])==null?void 0:d.querySelector("input");u&&(u.checked=a.checked)}this.updateSummary()});let l=t.createDiv({cls:"vault-sync-tree-children"});for(let c of n)this.renderFileRow(l,c,1)}renderFileRow(t,e,n){let o=t.createDiv({cls:"vault-sync-checkbox"});n>0&&o.addClass("vault-sync-checkbox--child");let r=o.createEl("input",{type:"checkbox"});r.checked=this.checkedPaths.has(e.path),o.createEl("span",{text:e.name}),r.addEventListener("change",()=>{r.checked?this.checkedPaths.add(e.path):this.checkedPaths.delete(e.path),this.updateSummary()})}updateSummary(){let t=this.checkedPaths.size,e=this.allFiles.filter(n=>this.checkedPaths.has(n.path)).reduce((n,o)=>n+o.stat.size,0);this.summaryEl.textContent=`Selected: ${t} file(s) (${Ft(e)})`}onClose(){this.contentEl.empty()}};function Ft(s){return s<1024?`${s} B`:s<1024*1024?`${(s/1024).toFixed(1)} KB`:`${(s/(1024*1024)).toFixed(1)} MB`}function ht(s,i,t,e){new F(s,{initialPaths:i.selectedPaths,onConfirm:async n=>{i.selectedPaths=n,await e(),await Dt(s,i,t)}}).open()}async function Dt(s,i,t){let e=null;try{let{startServer:n}=(ft(),q(ut));t.stopServer=await n(s,i,(o,r)=>{e=new $(s,{ip:r,code:o,port:i.port,onCancel:()=>{var a;(a=t.stopServer)==null||a.call(t),t.stopServer=null}}),e.open()}),setTimeout(()=>{t.stopServer&&(t.stopServer(),t.stopServer=null,e==null||e.close(),new j.Notice("Vault Sync server timed out and was stopped."))},10*60*1e3)}catch(n){new j.Notice(`Failed to start server: ${n}`)}}var g=require("obsidian");O();U();var mt=require("obsidian"),N=class extends mt.Modal{constructor(t,e){super(t);this.resolutions=new Map;this.opts=e}onOpen(){let{contentEl:t}=this;t.addClass("vault-sync-diff-modal"),t.createEl("h2",{text:"Sync Preview"});let{diff:e}=this.opts;if(e.length===0)t.createEl("p",{text:"No changes needed \u2014 vault is already in sync."});else{let a=e.filter(d=>d.action==="upload"),l=e.filter(d=>d.action==="download"),c=e.filter(d=>d.action==="conflict");a.length>0&&this.renderSection(t,`Upload to host (${a.length} file(s))`,"\u2191",a),l.length>0&&this.renderSection(t,`Download from host (${l.length} file(s))`,"\u2193",l),c.length>0&&this.renderConflicts(t,c)}let n=t.createDiv({cls:"vault-sync-btn-row"}),o=n.createEl("button",{text:e.length===0?"Close":"Sync Now",cls:"mod-cta"}),r=n.createEl("button",{text:"Cancel"});o.addEventListener("click",()=>{this.opts.onConfirm(this.resolutions),this.close()}),r.addEventListener("click",()=>{var a,l;(l=(a=this.opts).onCancel)==null||l.call(a),this.close()})}renderSection(t,e,n,o){var a,l,c,d;let r=t.createDiv({cls:"vault-sync-diff-section"});r.createEl("h3",{text:`${n} ${e}`});for(let p of o){let u=r.createDiv({cls:"vault-sync-diff-row"});u.createEl("span",{text:p.path,cls:"vault-sync-diff-path"});let f=(d=(c=(a=p.localEntry)==null?void 0:a.size)!=null?c:(l=p.remoteEntry)==null?void 0:l.size)!=null?d:0;u.createEl("span",{text:Ht(f),cls:"vault-sync-diff-size"})}}renderConflicts(t,e){let n=t.createDiv({cls:"vault-sync-diff-section vault-sync-diff-section--conflict"});n.createEl("h3",{text:`Conflicts (${e.length} file(s))`});for(let o of e){let r=n.createDiv({cls:"vault-sync-conflict-row"});r.createEl("span",{text:o.path,cls:"vault-sync-diff-path"});let a=[{value:"keep_local",label:"Keep local"},{value:"keep_remote",label:"Keep remote"},{value:"keep_both",label:"Keep both"}];this.resolutions.set(o.path,"keep_both");let l=r.createDiv({cls:"vault-sync-radio-group"}),c=`conflict-${o.path.replace(/[^a-z0-9]/gi,"_")}`;for(let d of a){let p=l.createEl("label",{cls:"vault-sync-radio-label"}),u=p.createEl("input",{type:"radio"});u.name=c,u.value=d.value,u.checked=d.value==="keep_both",p.createEl("span",{text:d.label}),u.addEventListener("change",()=>{u.checked&&this.resolutions.set(o.path,d.value)})}}}onClose(){this.contentEl.empty()}};function Ht(s){return s<1024?`${s} B`:s<1024*1024?`${(s/1024).toFixed(1)} KB`:`${(s/(1024*1024)).toFixed(1)} MB`}var yt=require("obsidian"),R=class extends yt.Modal{constructor(t,e){super(t);this.cancelled=!1;this.opts=e,this.modalEl.addClass("vault-sync-progress-modal")}onOpen(){let{contentEl:t}=this;t.createEl("h2",{text:"Syncing..."});let e=t.createDiv({cls:"vault-sync-progress-bar"});this.progressFillEl=e.createDiv({cls:"vault-sync-progress-fill"}),this.percentEl=t.createEl("p",{text:"0%",cls:"vault-sync-status"}),this.fileNameEl=t.createEl("p",{text:"Preparing...",cls:"vault-sync-current-file"}),this.countEl=t.createEl("p",{text:`0 of ${this.opts.total} files`,cls:"vault-sync-status"});let n=t.createDiv({cls:"vault-sync-btn-row"});this.cancelBtn=n.createEl("button",{text:"Cancel"}),this.cancelBtn.addEventListener("click",()=>{var o,r;this.cancelled=!0,(r=(o=this.opts).onCancel)==null||r.call(o),this.close()})}get isCancelled(){return this.cancelled}updateProgress(t,e,n){let o=e>0?Math.round(t/e*100):0;this.progressFillEl.style.width=`${o}%`,this.percentEl.textContent=`${o}%`,this.fileNameEl.textContent=n,this.countEl.textContent=`${t} of ${e} files`}complete(){this.progressFillEl.style.width="100%",this.percentEl.textContent="100%",this.fileNameEl.textContent="Done!",this.cancelBtn.disabled=!0,setTimeout(()=>this.close(),1e3)}error(t){this.fileNameEl.textContent=`Error: ${t}`,this.fileNameEl.addClass("vault-sync-error"),this.cancelBtn.textContent="Close"}onClose(){this.contentEl.empty()}};var b=require("obsidian");function k(s,i){return`http://${s}:${i}`}function G(s){return{"X-Token":s,"Content-Type":"application/json"}}async function gt(s,i,t,e){let n=await(0,b.requestUrl)({url:`${k(s,i)}/auth`,method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code:t,deviceName:e}),throw:!1});if(n.status!==200)throw new Error(`Auth failed: ${n.status}`);return n.json}async function _(s,i,t){let e=await(0,b.requestUrl)({url:`${k(s,i)}/manifest`,method:"GET",headers:G(t),throw:!1});if(e.status!==200)throw new Error(`getManifest failed: ${e.status}`);return e.json.manifest}async function T(s,i,t,e){let n=await(0,b.requestUrl)({url:`${k(s,i)}/file?path=${encodeURIComponent(e)}`,method:"GET",headers:{"X-Token":t},throw:!1});if(n.status!==200)throw new Error(`downloadFile failed: ${n.status} (${e})`);return n.arrayBuffer}async function L(s,i,t,e,n){let o=await(0,b.requestUrl)({url:`${k(s,i)}/file?path=${encodeURIComponent(e)}`,method:"POST",headers:{"X-Token":t,"Content-Type":"application/octet-stream"},body:n,throw:!1});if(o.status!==200)throw new Error(`uploadFile failed: ${o.status} (${e})`)}async function K(s,i,t,e){await(0,b.requestUrl)({url:`${k(s,i)}/sync-status`,method:"POST",headers:G(t),body:JSON.stringify(e),throw:!1})}async function A(s,i,t){await(0,b.requestUrl)({url:`${k(s,i)}/complete`,method:"POST",headers:G(t),throw:!1})}async function wt(s,i,t,e,n,o){let r=g.Platform.isMobileApp?"iOS":"Desktop";new g.Notice(`[VaultSync] Connecting to ${t}:${e}...`,5e3);let a,l;try{let c=await gt(t,e,n,r);a=c.token,l=c.manifest,new g.Notice(`[VaultSync] Connected! ${l.length} remote files.`,5e3)}catch(c){new g.Notice(`[VaultSync] Connection failed: ${c}`,1e4);return}new F(s,{initialPaths:i.selectedPaths,onConfirm:async c=>{i.selectedPaths=c,await o(),new g.Notice("Scanning local vault\u2026");try{let d=await S(s,i),p=E(d,l);Ot(s,t,e,a,p)}catch(d){new g.Notice(`Scan failed: ${d}`)}},onCancel:async()=>{await A(t,e,a).catch(()=>{})}}).open()}function Ot(s,i,t,e,n){new N(s,{diff:n,onConfirm:async o=>{if(n.length===0){await A(i,t,e).catch(()=>{});return}await Ut(s,i,t,e,n,o)},onCancel:async()=>{await A(i,t,e).catch(()=>{})}}).open()}async function Ut(s,i,t,e,n,o){var u;let r=n.filter(f=>f.action!=="delete_local"&&f.action!=="delete_remote"),a=new R(s,{total:r.length,onCancel:async()=>{await A(i,t,e).catch(()=>{})}});a.open();let l=0,c=0,d=0,p=0;try{for(let f of r){if(a.isCancelled)break;if(p++,a.updateProgress(p,r.length,f.path),f.action==="upload"){let x=s.vault.getAbstractFileByPath(f.path);if(!x)continue;let vt=await s.vault.readBinary(x);await L(i,t,e,f.path,vt),l++}else if(f.action==="download"){let x=await T(i,t,e,f.path);await v(s,f.path,x),c++}else if(f.action==="conflict"){let x=(u=o.get(f.path))!=null?u:"keep_both";await Nt(s,i,t,e,f.path,x),d++}}await A(i,t,e),a.complete(),new g.Notice(`Sync complete! \u2191 ${l}  \u2193 ${c}  \u26A0 ${d} conflict(s)`)}catch(f){a.error(String(f)),new g.Notice(`Sync failed: ${f}`)}}async function Nt(s,i,t,e,n,o){if(o==="keep_local"){let r=s.vault.getAbstractFileByPath(n);if(r){let a=await s.vault.readBinary(r);await L(i,t,e,n,a)}}else if(o==="keep_remote"){let r=await T(i,t,e,n);await v(s,n,r)}else{let r=await T(i,t,e,n);await v(s,it(n),r)}}var w=require("obsidian");O();U();async function y(s,i,t,e,n){let o={...n,...e};return e.done!==void 0&&o.total>0&&(o.progress=Math.round(o.done/o.total*100)),await K(s,i,t,o).catch(()=>{}),o}async function Rt(s,i,t,e,n){new w.Notice("[VaultSync] Starting pull...");let o={phase:"scanning",progress:0,current:"",total:0,done:0,errors:[]};o=await y(t,e,n,o,o);let r=await _(t,e,n),a=await S(s,i),c=E(a,r).filter(u=>u.action==="download");if(c.length===0){o=await y(t,e,n,{phase:"complete",progress:100,done:0,total:0},o),new w.Notice("[VaultSync] Already up to date!");return}o=await y(t,e,n,{phase:"downloading",total:c.length,done:0},o);for(let u of c){o=await y(t,e,n,{current:u.path,phase:"downloading"},o);try{let f=await T(t,e,n,u.path);await v(s,u.path,f),o=await y(t,e,n,{done:o.done+1},o)}catch(f){o.errors.push(`${u.path}: ${f}`),o=await y(t,e,n,{done:o.done+1,errors:o.errors},o)}}o=await y(t,e,n,{phase:"complete",progress:100,current:""},o);let d=o.errors.length,p=d>0?`[VaultSync] Done! ${o.done-d}/${o.total} files, ${d} errors`:`[VaultSync] Done! ${o.done} files synced`;new w.Notice(p,8e3)}async function Vt(s,i,t,e,n){new w.Notice("[VaultSync] Starting push...");let o={phase:"scanning",progress:0,current:"",total:0,done:0,errors:[]};o=await y(t,e,n,o,o);let r=await _(t,e,n),a=await S(s,i),c=E(a,r).filter(u=>u.action==="upload");if(c.length===0){o=await y(t,e,n,{phase:"complete",progress:100,done:0,total:0},o),new w.Notice("[VaultSync] Nothing to push \u2014 PC is up to date!");return}o=await y(t,e,n,{phase:"uploading",total:c.length,done:0},o);for(let u of c){o=await y(t,e,n,{current:u.path,phase:"uploading"},o);try{let f=await I(s,u.path);await L(t,e,n,u.path,f),o=await y(t,e,n,{done:o.done+1},o)}catch(f){o.errors.push(`${u.path}: ${f}`),o=await y(t,e,n,{done:o.done+1,errors:o.errors},o)}}o=await y(t,e,n,{phase:"complete",progress:100,current:""},o);let d=o.errors.length,p=d>0?`[VaultSync] Done! ${o.done-d}/${o.total} uploaded, ${d} errors`:`[VaultSync] Done! ${o.done} files uploaded`;new w.Notice(p,8e3)}async function J(s,i,t,e,n,o){try{t==="pull"?await Rt(s,i,e,n,o):t==="push"?await Vt(s,i,e,n,o):new w.Notice(`[VaultSync] Unknown action: ${t}`,8e3)}catch(r){new w.Notice(`[VaultSync] Sync failed: ${r}`,1e4),await K(e,n,o,{phase:"error",progress:0,current:"",total:0,done:0,errors:[String(r)]}).catch(()=>{})}}var V=class extends m.Plugin{constructor(){super(...arguments);this.hostHandle={stopServer:null}}async onload(){await this.loadSettings(),this.addSettingTab(new D(this.app,this)),this.addCommand({id:"host-sync-session",name:"Host Sync Session",callback:()=>this.hostSyncSession()}),this.addCommand({id:"connect-to-sync",name:"Connect to Sync",callback:()=>this.connectToSync()}),this.addCommand({id:"sync-now",name:"Sync Now (from Safari)",callback:()=>this.syncNow()}),this.registerObsidianProtocolHandler("vaultsync",async t=>{let{action:e,token:n,ip:o,port:r}=t;if(!e||!n||!o){new m.Notice("[VaultSync] Invalid URI \u2014 missing action, token, or ip");return}await J(this.app,this.settings,e,o,parseInt(r||"53217"),n)})}onunload(){var t,e;(e=(t=this.hostHandle).stopServer)==null||e.call(t),this.hostHandle.stopServer=null}async loadSettings(){var t;this.settings=Y((t=await this.loadData())!=null?t:{})}async saveSettings(){await this.saveData(this.settings)}async syncNow(){let t=this.settings.lastHostIp,e=this.settings.port;if(!t){new m.Notice("[VaultSync] No server IP configured. Use Safari UI first.",8e3);return}new m.Notice("[VaultSync] Checking for sync intent...");try{let{requestUrl:n}=await import("obsidian"),o=await n({url:`http://${t}:${e}/sync-intent`,method:"GET",throw:!1});if(o.status!==200){new m.Notice("[VaultSync] No pending sync or server not running.",8e3);return}let r=o.json;if(!r.action||!r.token){new m.Notice("[VaultSync] No pending sync intent.",8e3);return}await J(this.app,this.settings,r.action,t,e,r.token)}catch(n){new m.Notice(`[VaultSync] Sync error: ${n}`,1e4)}}hostSyncSession(){if(!m.Platform.isDesktop){new m.Notice("Host mode is only available on desktop.");return}if(this.hostHandle.stopServer){new m.Notice("Sync server is already running. Stop it first.");return}ht(this.app,this.settings,this.hostHandle,()=>this.saveSettings())}connectToSync(){if(m.Platform.isMobile){let t=this.settings.lastHostIp||"<PC-IP>";new m.Notice(`On mobile, use Safari: http://${t}:${this.settings.port}`,1e4);return}new m.Notice("[VaultSync] Opening connect dialog...");try{new H(this.app,this.settings,async(t,e)=>{try{this.settings.lastHostIp=t,await this.saveSettings(),await wt(this.app,this.settings,t,this.settings.port,e,()=>this.saveSettings())}catch(n){new m.Notice(`Vault Sync error: ${n}`,1e4)}}).open()}catch(t){new m.Notice(`Vault Sync modal error: ${t}`,1e4)}}};
