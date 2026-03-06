"use strict";var D=Object.defineProperty;var ut=Object.getOwnPropertyDescriptor;var ht=Object.getOwnPropertyNames;var mt=Object.prototype.hasOwnProperty;var v=(o,n)=>()=>(o&&(n=o(o=0)),n);var V=(o,n)=>{for(var t in n)D(o,t,{get:n[t],enumerable:!0})},yt=(o,n,t,e)=>{if(n&&typeof n=="object"||typeof n=="function")for(let i of ht(n))!mt.call(o,i)&&i!==t&&D(o,i,{get:()=>n[i],enumerable:!(e=ut(n,i))||e.enumerable});return o};var j=o=>yt(D({},"__esModule",{value:!0}),o);async function W(o){let n=await crypto.subtle.digest("SHA-256",o);return Array.from(new Uint8Array(n)).map(t=>t.toString(16).padStart(2,"0")).join("")}function X(){return(crypto.getRandomValues(new Uint32Array(1))[0]%1e4).toString().padStart(4,"0")}function q(){let o=crypto.getRandomValues(new Uint8Array(32));return Array.from(o).map(n=>n.toString(16).padStart(2,"0")).join("")}var Gt,H=v(()=>{"use strict";Gt=new TextEncoder().encode("vault-sync-salt-v1")});function vt(o,n){return n.length===0?!0:n.some(t=>o===t||o.startsWith(t.endsWith("/")?t:t+"/"))}async function P(o,n){let t=o.vault.getFiles(),e=[];for(let i of t)if(vt(i.path,n.selectedPaths))try{let r=i.stat,s=await o.vault.readBinary(i),a=await W(s);e.push({path:i.path,mtime:r.mtime,size:r.size,hash:a})}catch(r){console.warn(`[VaultSync] skipping ${i.path}:`,r)}return e}async function U(o,n){let t=o.vault.getAbstractFileByPath(n);if(!(t instanceof Y.TFile))throw new Error(`File not found: ${n}`);return o.vault.readBinary(t)}async function b(o,n,t){let e=o.vault.getAbstractFileByPath(n),i=n.split("/");if(i.length>1){let r=i.slice(0,-1).join("/");o.vault.getAbstractFileByPath(r)||await o.vault.createFolder(r)}e?await o.vault.modifyBinary(e,t):await o.vault.createBinary(n,t)}var Y,R=v(()=>{"use strict";Y=require("obsidian");H()});function T(o,n,t){let e=new Map(o.map(a=>[a.path,a])),i=new Map(n.map(a=>[a.path,a])),r=new Set([...e.keys(),...i.keys()]),s=[];for(let a of r){let l=e.get(a),c=i.get(a);if(l&&!c){s.push({path:a,action:"upload",localEntry:l});continue}if(!l&&c){s.push({path:a,action:"download",remoteEntry:c});continue}if(l&&c){if(l.hash===c.hash)continue;if(t!==void 0){let d=l.mtime>t,p=c.mtime>t;if(d&&p){s.push({path:a,action:"conflict",localEntry:l,remoteEntry:c});continue}}l.mtime>=c.mtime?s.push({path:a,action:"upload",localEntry:l,remoteEntry:c}):s.push({path:a,action:"download",localEntry:l,remoteEntry:c})}}return s}function Z(o){let n=new Date().toISOString().replace(/[:.]/g,"-"),t=o.lastIndexOf(".");return t===-1?`${o}.sync-conflict-${n}`:`${o.slice(0,t)}.sync-conflict-${n}${o.slice(t)}`}var O=v(()=>{"use strict"});function Q(){return`<!DOCTYPE html>
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
    // Send empty manifest (web client has no local files) \u2192 everything becomes "download"
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
<\/script>
</body>
</html>`}var tt=v(()=>{"use strict"});function nt(o){let n=[],t=[],e=0;for(let s of o){let a=Buffer.from(s.path,"utf-8"),l=Buffer.alloc(30);l.writeUInt32LE(67324752,0),l.writeUInt16LE(20,4),l.writeUInt16LE(0,6),l.writeUInt16LE(0,8),l.writeUInt16LE(0,10),l.writeUInt16LE(0,12),l.writeUInt32LE(et(s.data),14),l.writeUInt32LE(s.data.length,18),l.writeUInt32LE(s.data.length,22),l.writeUInt16LE(a.length,26),l.writeUInt16LE(0,28),n.push(l,a,s.data);let c=Buffer.alloc(46);c.writeUInt32LE(33639248,0),c.writeUInt16LE(20,4),c.writeUInt16LE(20,6),c.writeUInt16LE(0,8),c.writeUInt16LE(0,10),c.writeUInt16LE(0,12),c.writeUInt16LE(0,14),c.writeUInt32LE(et(s.data),16),c.writeUInt32LE(s.data.length,20),c.writeUInt32LE(s.data.length,24),c.writeUInt16LE(a.length,28),c.writeUInt16LE(0,30),c.writeUInt16LE(0,32),c.writeUInt16LE(0,34),c.writeUInt16LE(0,36),c.writeUInt32LE(0,38),c.writeUInt32LE(e,42),t.push(c,a),e+=30+a.length+s.data.length}let i=t.reduce((s,a)=>s+a.length,0),r=Buffer.alloc(22);return r.writeUInt32LE(101010256,0),r.writeUInt16LE(0,4),r.writeUInt16LE(0,6),r.writeUInt16LE(o.length,8),r.writeUInt16LE(o.length,10),r.writeUInt32LE(i,12),r.writeUInt32LE(e,16),r.writeUInt16LE(0,20),Buffer.concat([...n,...t,r])}function et(o){let n=4294967295;for(let t=0;t<o.length;t++)n=wt[(n^o[t])&255]^n>>>8;return(n^4294967295)>>>0}var wt,ot=v(()=>{"use strict";wt=(()=>{let o=new Uint32Array(256);for(let n=0;n<256;n++){let t=n;for(let e=0;e<8;e++)t=t&1?3988292384^t>>>1:t>>>1;o[n]=t}return o})()});var st={};V(st,{startServer:()=>St});function h(o,n,t){let e=JSON.stringify(t);o.writeHead(n,{"Content-Type":"application/json","Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"X-Token, Content-Type","Access-Control-Allow-Methods":"GET, POST, OPTIONS"}),o.end(e)}function bt(o,n){o.writeHead(200,{"Content-Type":"application/octet-stream","Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"X-Token, Content-Type"}),o.end(n)}async function $(o){return new Promise((n,t)=>{let e=[];o.on("data",i=>e.push(i)),o.on("end",()=>n(Buffer.concat(e))),o.on("error",t)})}function xt(o,n){return o.headers["x-token"]===n.token}async function St(o,n,t){if(!it.Platform.isDesktop)throw new Error("Server only supported on desktop");let e={code:X(),token:null,manifest:await P(o,n),active:!0},r=require("http").createServer(async(s,a)=>{var d,p;if(!e.active){h(a,503,{error:"Server stopped"});return}let l=new URL((d=s.url)!=null?d:"/","http://localhost"),c=(p=s.method)!=null?p:"GET";if(c==="OPTIONS"){h(a,204,{});return}try{await Ct(o,n,e,l,c,s,a)}catch(f){console.error("[VaultSync server] error:",f),h(a,500,{error:String(f)})}});return r.listen(Et,"0.0.0.0",()=>{let a=require("os").networkInterfaces(),l="127.0.0.1",c=/^(vEthernet|WSL|docker|br-|virbr|vmnet|vbox|tun|tap)/i;for(let[d,p]of Object.entries(a))if(!c.test(d)){for(let f of p!=null?p:[])if(f.family==="IPv4"&&!f.internal){l=f.address;break}if(l!=="127.0.0.1")break}t(e.code,l)}),()=>{e.active=!1,r.close()}}async function Ct(o,n,t,e,i,r,s){let a=e.pathname;if(a==="/"&&i==="GET"){let l=Q();s.writeHead(200,{"Content-Type":"text/html; charset=utf-8"}),s.end(l);return}if(a==="/vault-info"&&i==="GET"){h(s,200,{name:o.vault.getName()});return}if(a==="/auth"&&i==="POST"){if(JSON.parse((await $(r)).toString()).code!==t.code){h(s,401,{error:"Invalid code"});return}t.token=q();let c={token:t.token,manifest:t.manifest};h(s,200,c);return}if(!xt(r,t)){h(s,401,{error:"Unauthorized"});return}if(a==="/manifest"&&i==="GET"){h(s,200,{manifest:t.manifest});return}if(a==="/manifest"&&i==="POST"){let l=JSON.parse((await $(r)).toString()),d={diff:T(l.files,t.manifest)};h(s,200,d);return}if(a==="/file"&&i==="GET"){let l=e.searchParams.get("path");if(!l){h(s,400,{error:"Missing path"});return}let c=await U(o,l);bt(s,Buffer.from(c));return}if(a==="/file"&&i==="POST"){let l=e.searchParams.get("path");if(!l){h(s,400,{error:"Missing path"});return}let c=await $(r);await b(o,l,c.buffer),h(s,200,{ok:!0});return}if(a==="/download-all"&&i==="GET"){let l=[];for(let d of t.manifest)try{let p=await U(o,d.path);l.push({path:d.path,data:Buffer.from(p)})}catch(p){}let c=nt(l);s.writeHead(200,{"Content-Type":"application/zip","Content-Disposition":'attachment; filename="vault-sync.zip"',"Access-Control-Allow-Origin":"*"}),s.end(c);return}if(a==="/complete"&&i==="POST"){h(s,200,{ok:!0}),t.active=!1;return}h(s,404,{error:"Not found"})}var it,Et,rt=v(()=>{"use strict";it=require("obsidian");H();R();O();tt();ot();Et=53217});var It={};V(It,{default:()=>M});module.exports=j(It);var y=require("obsidian");var w=require("obsidian"),C=class extends w.PluginSettingTab{constructor(n,t){super(n,t),this.plugin=t}display(){let{containerEl:n}=this;n.empty(),n.createEl("h2",{text:"Vault Sync Settings"}),new w.Setting(n).setName("Last host IP").setDesc("IP address of the last desktop host (auto-filled after first connect).").addText(t=>t.setPlaceholder("192.168.1.x").setValue(this.plugin.settings.lastHostIp).onChange(async e=>{this.plugin.settings.lastHostIp=e.trim(),await this.plugin.saveSettings()})),new w.Setting(n).setName("Port").setDesc("HTTP port the host server listens on (default: 53217).").addText(t=>t.setPlaceholder("53217").setValue(String(this.plugin.settings.port)).onChange(async e=>{let i=parseInt(e.trim(),10);!isNaN(i)&&i>0&&i<65536&&(this.plugin.settings.port=i,await this.plugin.saveSettings())})),new w.Setting(n).setName("Selected paths").setDesc("Files or folders to include in sync, one per line. Leave empty to sync the entire vault.").addTextArea(t=>{t.setPlaceholder(`Notes/
Projects/work.md`).setValue(this.plugin.settings.selectedPaths.join(`
`)).onChange(async e=>{this.plugin.settings.selectedPaths=e.split(`
`).map(i=>i.trim()).filter(Boolean),await this.plugin.saveSettings()}),t.inputEl.rows=6,t.inputEl.style.width="100%"}),n.createEl("p",{text:'Tip: Use "Host Sync Session" on your desktop, then "Connect to Sync" on mobile.',cls:"setting-item-description"})}};function G(o){var n,t,e;return{lastHostIp:(n=o.lastHostIp)!=null?n:"",selectedPaths:(t=o.selectedPaths)!=null?t:[],port:(e=o.port)!=null?e:53217}}var K=require("obsidian"),k=class extends K.Modal{constructor(n,t,e){super(n),this.settings=t,this.onSubmit=e}onOpen(){let{contentEl:n}=this;n.empty(),n.createEl("h2",{text:"Vault Sync \u2014 Connect"}),n.createEl("label",{text:"Host IP address"});let t=n.createEl("input",{type:"text"});t.placeholder="192.168.1.x",t.value=this.settings.lastHostIp||"",t.style.width="100%",t.style.marginBottom="12px",t.style.padding="8px",t.style.fontSize="16px",n.createEl("label",{text:"4-digit code"});let e=n.createEl("input",{type:"text"});e.placeholder="0000",e.maxLength=4,e.inputMode="numeric",e.style.width="100%",e.style.marginBottom="12px",e.style.padding="8px",e.style.fontSize="24px",e.style.textAlign="center",e.style.letterSpacing="8px";let i=n.createEl("p");i.style.color="red",i.style.display="none";let r=n.createDiv();r.style.display="flex",r.style.gap="8px",r.style.marginTop="12px";let s=r.createEl("button",{text:"Connect"});s.classList.add("mod-cta");let a=r.createEl("button",{text:"Cancel"}),l=()=>{let c=t.value.trim(),d=e.value.trim();if(!c||c.split(".").length!==4){i.textContent="Enter a valid IP (e.g. 192.168.1.105)",i.style.display="block";return}if(!/^\d{4}$/.test(d)){i.textContent="Code must be 4 digits",i.style.display="block";return}this.close(),this.onSubmit(c,d)};s.addEventListener("click",l),e.addEventListener("keydown",c=>{c.key==="Enter"&&l()}),a.addEventListener("click",()=>this.close()),setTimeout(()=>{this.settings.lastHostIp?e.focus():t.focus()},100)}onClose(){this.contentEl.empty()}};var z=require("obsidian");var _=require("obsidian"),F=class extends _.Modal{constructor(n,t){super(n),this.opts=t}onOpen(){let{contentEl:n}=this;n.addClass("vault-sync-host-modal"),n.createEl("h2",{text:"Vault Sync \u2014 Host"});let t=n.createDiv({cls:"vault-sync-row"});t.createEl("span",{text:"Your IP:",cls:"vault-sync-label"}),t.createEl("span",{text:this.opts.ip,cls:"vault-sync-ip"});let e=n.createDiv({cls:"vault-sync-row"});e.createEl("span",{text:"Code:",cls:"vault-sync-label"});let i=e.createEl("span",{cls:"vault-sync-code"});i.textContent=this.opts.code.split("").join(" ");let r=n.createDiv({cls:"vault-sync-row"});r.createEl("span",{text:"Port:",cls:"vault-sync-label"}),r.createEl("span",{text:String(this.opts.port),cls:"vault-sync-ip"}),this.statusEl=n.createEl("p",{text:"Waiting for connection...",cls:"vault-sync-status vault-sync-status--waiting"});let s=n.createDiv({cls:"vault-sync-btn-row"});this.cancelBtn=s.createEl("button",{text:"Cancel"}),this.cancelBtn.addEventListener("click",()=>{this.opts.onCancel(),this.close()})}setConnected(){this.statusEl&&(this.statusEl.textContent="Client connected!",this.statusEl.removeClass("vault-sync-status--waiting"),this.statusEl.addClass("vault-sync-status--connected"),this.cancelBtn.textContent="Close")}complete(){this.close()}onClose(){this.contentEl.empty()}};var J=require("obsidian"),E=class extends J.Modal{constructor(t,e){super(t);this.allFiles=[];this.opts=e,this.checkedPaths=new Set(e.initialPaths)}onOpen(){let{contentEl:t}=this;t.addClass("vault-sync-picker-modal"),t.createEl("h2",{text:"Select Files to Sync"});let e=t.createDiv({cls:"vault-sync-btn-row vault-sync-btn-row--left"}),i=e.createEl("button",{text:"Select All"}),r=e.createEl("button",{text:"Deselect All"}),s=t.createDiv({cls:"vault-sync-tree"});this.summaryEl=t.createEl("p",{cls:"vault-sync-summary"});let a=t.createDiv({cls:"vault-sync-btn-row"}),l=a.createEl("button",{text:"Confirm",cls:"mod-cta"}),c=a.createEl("button",{text:"Cancel"});this.allFiles=this.app.vault.getFiles(),this.checkedPaths.size===0&&this.allFiles.forEach(p=>this.checkedPaths.add(p.path));let d=this.groupByTopFolder(this.allFiles);this.renderTree(s,d),this.updateSummary(),i.addEventListener("click",()=>{this.allFiles.forEach(p=>this.checkedPaths.add(p.path)),this.renderTree(s,d),this.updateSummary()}),r.addEventListener("click",()=>{this.checkedPaths.clear(),this.renderTree(s,d),this.updateSummary()}),l.addEventListener("click",()=>{this.opts.onConfirm([...this.checkedPaths]),this.close()}),c.addEventListener("click",()=>{var p,f;(f=(p=this.opts).onCancel)==null||f.call(p),this.close()})}groupByTopFolder(t){let e=new Map;for(let i of t){let r=i.path.split("/"),s=r.length>1?r[0]:"";e.has(s)||e.set(s,[]),e.get(s).push(i)}return[...e.entries()].sort((i,r)=>i[0]===""?-1:r[0]===""?1:i[0].localeCompare(r[0])).map(([i,r])=>({folder:i,files:r}))}renderTree(t,e){t.empty();for(let i of e)if(i.folder!=="")this.renderFolderGroup(t,i);else for(let r of i.files)this.renderFileRow(t,r,0)}renderFolderGroup(t,e){let i=e.files,r=i.every(c=>this.checkedPaths.has(c.path)),s=t.createDiv({cls:"vault-sync-checkbox vault-sync-checkbox--folder"}),a=s.createEl("input",{type:"checkbox"});a.checked=r,a.indeterminate=!r&&i.some(c=>this.checkedPaths.has(c.path)),s.createEl("span",{text:e.folder+"/"}),a.addEventListener("change",()=>{var d;a.checked?i.forEach(p=>this.checkedPaths.add(p.path)):i.forEach(p=>this.checkedPaths.delete(p.path));let c=s.nextElementSibling;if(c)for(let p=0;p<i.length;p++){let f=(d=c.children[p])==null?void 0:d.querySelector("input");f&&(f.checked=a.checked)}this.updateSummary()});let l=t.createDiv({cls:"vault-sync-tree-children"});for(let c of i)this.renderFileRow(l,c,1)}renderFileRow(t,e,i){let r=t.createDiv({cls:"vault-sync-checkbox"});i>0&&r.addClass("vault-sync-checkbox--child");let s=r.createEl("input",{type:"checkbox"});s.checked=this.checkedPaths.has(e.path),r.createEl("span",{text:e.name}),s.addEventListener("change",()=>{s.checked?this.checkedPaths.add(e.path):this.checkedPaths.delete(e.path),this.updateSummary()})}updateSummary(){let t=this.checkedPaths.size,e=this.allFiles.filter(i=>this.checkedPaths.has(i.path)).reduce((i,r)=>i+r.stat.size,0);this.summaryEl.textContent=`Selected: ${t} file(s) (${gt(e)})`}onClose(){this.contentEl.empty()}};function gt(o){return o<1024?`${o} B`:o<1024*1024?`${(o/1024).toFixed(1)} KB`:`${(o/(1024*1024)).toFixed(1)} MB`}function at(o,n,t,e){new E(o,{initialPaths:n.selectedPaths,onConfirm:async i=>{n.selectedPaths=i,await e(),await kt(o,n,t)}}).open()}async function kt(o,n,t){let e=null;try{let{startServer:i}=(rt(),j(st));t.stopServer=await i(o,n,(r,s)=>{e=new F(o,{ip:s,code:r,port:n.port,onCancel:()=>{var a;(a=t.stopServer)==null||a.call(t),t.stopServer=null}}),e.open()}),setTimeout(()=>{t.stopServer&&(t.stopServer(),t.stopServer=null,e==null||e.close(),new z.Notice("Vault Sync server timed out and was stopped."))},10*60*1e3)}catch(i){new z.Notice(`Failed to start server: ${i}`)}}var m=require("obsidian");R();O();var ct=require("obsidian"),A=class extends ct.Modal{constructor(t,e){super(t);this.resolutions=new Map;this.opts=e}onOpen(){let{contentEl:t}=this;t.addClass("vault-sync-diff-modal"),t.createEl("h2",{text:"Sync Preview"});let{diff:e}=this.opts;if(e.length===0)t.createEl("p",{text:"No changes needed \u2014 vault is already in sync."});else{let a=e.filter(d=>d.action==="upload"),l=e.filter(d=>d.action==="download"),c=e.filter(d=>d.action==="conflict");a.length>0&&this.renderSection(t,`Upload to host (${a.length} file(s))`,"\u2191",a),l.length>0&&this.renderSection(t,`Download from host (${l.length} file(s))`,"\u2193",l),c.length>0&&this.renderConflicts(t,c)}let i=t.createDiv({cls:"vault-sync-btn-row"}),r=i.createEl("button",{text:e.length===0?"Close":"Sync Now",cls:"mod-cta"}),s=i.createEl("button",{text:"Cancel"});r.addEventListener("click",()=>{this.opts.onConfirm(this.resolutions),this.close()}),s.addEventListener("click",()=>{var a,l;(l=(a=this.opts).onCancel)==null||l.call(a),this.close()})}renderSection(t,e,i,r){var a,l,c,d;let s=t.createDiv({cls:"vault-sync-diff-section"});s.createEl("h3",{text:`${i} ${e}`});for(let p of r){let f=s.createDiv({cls:"vault-sync-diff-row"});f.createEl("span",{text:p.path,cls:"vault-sync-diff-path"});let u=(d=(c=(a=p.localEntry)==null?void 0:a.size)!=null?c:(l=p.remoteEntry)==null?void 0:l.size)!=null?d:0;f.createEl("span",{text:Ft(u),cls:"vault-sync-diff-size"})}}renderConflicts(t,e){let i=t.createDiv({cls:"vault-sync-diff-section vault-sync-diff-section--conflict"});i.createEl("h3",{text:`Conflicts (${e.length} file(s))`});for(let r of e){let s=i.createDiv({cls:"vault-sync-conflict-row"});s.createEl("span",{text:r.path,cls:"vault-sync-diff-path"});let a=[{value:"keep_local",label:"Keep local"},{value:"keep_remote",label:"Keep remote"},{value:"keep_both",label:"Keep both"}];this.resolutions.set(r.path,"keep_both");let l=s.createDiv({cls:"vault-sync-radio-group"}),c=`conflict-${r.path.replace(/[^a-z0-9]/gi,"_")}`;for(let d of a){let p=l.createEl("label",{cls:"vault-sync-radio-label"}),f=p.createEl("input",{type:"radio"});f.name=c,f.value=d.value,f.checked=d.value==="keep_both",p.createEl("span",{text:d.label}),f.addEventListener("change",()=>{f.checked&&this.resolutions.set(r.path,d.value)})}}}onClose(){this.contentEl.empty()}};function Ft(o){return o<1024?`${o} B`:o<1024*1024?`${(o/1024).toFixed(1)} KB`:`${(o/(1024*1024)).toFixed(1)} MB`}var lt=require("obsidian"),B=class extends lt.Modal{constructor(t,e){super(t);this.cancelled=!1;this.opts=e,this.modalEl.addClass("vault-sync-progress-modal")}onOpen(){let{contentEl:t}=this;t.createEl("h2",{text:"Syncing..."});let e=t.createDiv({cls:"vault-sync-progress-bar"});this.progressFillEl=e.createDiv({cls:"vault-sync-progress-fill"}),this.percentEl=t.createEl("p",{text:"0%",cls:"vault-sync-status"}),this.fileNameEl=t.createEl("p",{text:"Preparing...",cls:"vault-sync-current-file"}),this.countEl=t.createEl("p",{text:`0 of ${this.opts.total} files`,cls:"vault-sync-status"});let i=t.createDiv({cls:"vault-sync-btn-row"});this.cancelBtn=i.createEl("button",{text:"Cancel"}),this.cancelBtn.addEventListener("click",()=>{var r,s;this.cancelled=!0,(s=(r=this.opts).onCancel)==null||s.call(r),this.close()})}get isCancelled(){return this.cancelled}updateProgress(t,e,i){let r=e>0?Math.round(t/e*100):0;this.progressFillEl.style.width=`${r}%`,this.percentEl.textContent=`${r}%`,this.fileNameEl.textContent=i,this.countEl.textContent=`${t} of ${e} files`}complete(){this.progressFillEl.style.width="100%",this.percentEl.textContent="100%",this.fileNameEl.textContent="Done!",this.cancelBtn.disabled=!0,setTimeout(()=>this.close(),1e3)}error(t){this.fileNameEl.textContent=`Error: ${t}`,this.fileNameEl.addClass("vault-sync-error"),this.cancelBtn.textContent="Close"}onClose(){this.contentEl.empty()}};var S=require("obsidian");function L(o,n){return`http://${o}:${n}`}function Pt(o){return{"X-Token":o,"Content-Type":"application/json"}}async function dt(o,n,t,e){let i=await(0,S.requestUrl)({url:`${L(o,n)}/auth`,method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code:t,deviceName:e}),throw:!1});if(i.status!==200)throw new Error(`Auth failed: ${i.status}`);return i.json}async function I(o,n,t,e){let i=await(0,S.requestUrl)({url:`${L(o,n)}/file?path=${encodeURIComponent(e)}`,method:"GET",headers:{"X-Token":t},throw:!1});if(i.status!==200)throw new Error(`downloadFile failed: ${i.status} (${e})`);return i.arrayBuffer}async function N(o,n,t,e,i){let r=await(0,S.requestUrl)({url:`${L(o,n)}/file?path=${encodeURIComponent(e)}`,method:"POST",headers:{"X-Token":t,"Content-Type":"application/octet-stream"},body:i,throw:!1});if(r.status!==200)throw new Error(`uploadFile failed: ${r.status} (${e})`)}async function x(o,n,t){await(0,S.requestUrl)({url:`${L(o,n)}/complete`,method:"POST",headers:Pt(t),throw:!1})}async function pt(o,n,t,e,i,r){let s=m.Platform.isMobileApp?"iOS":"Desktop";new m.Notice("Connecting\u2026");let a,l;try{let c=await dt(t,e,i,s);a=c.token,l=c.manifest}catch(c){new m.Notice(`Connection failed: ${c}`);return}new E(o,{initialPaths:n.selectedPaths,onConfirm:async c=>{n.selectedPaths=c,await r(),new m.Notice("Scanning local vault\u2026");try{let d=await P(o,n),p=T(d,l);At(o,t,e,a,p)}catch(d){new m.Notice(`Scan failed: ${d}`)}},onCancel:async()=>{await x(t,e,a).catch(()=>{})}}).open()}function At(o,n,t,e,i){new A(o,{diff:i,onConfirm:async r=>{if(i.length===0){await x(n,t,e).catch(()=>{});return}await Bt(o,n,t,e,i,r)},onCancel:async()=>{await x(n,t,e).catch(()=>{})}}).open()}async function Bt(o,n,t,e,i,r){var f;let s=i.filter(u=>u.action!=="delete_local"&&u.action!=="delete_remote"),a=new B(o,{total:s.length,onCancel:async()=>{await x(n,t,e).catch(()=>{})}});a.open();let l=0,c=0,d=0,p=0;try{for(let u of s){if(a.isCancelled)break;if(p++,a.updateProgress(p,s.length,u.path),u.action==="upload"){let g=o.vault.getAbstractFileByPath(u.path);if(!g)continue;let ft=await o.vault.readBinary(g);await N(n,t,e,u.path,ft),l++}else if(u.action==="download"){let g=await I(n,t,e,u.path);await b(o,u.path,g),c++}else if(u.action==="conflict"){let g=(f=r.get(u.path))!=null?f:"keep_both";await Lt(o,n,t,e,u.path,g),d++}}await x(n,t,e),a.complete(),new m.Notice(`Sync complete! \u2191 ${l}  \u2193 ${c}  \u26A0 ${d} conflict(s)`)}catch(u){a.error(String(u)),new m.Notice(`Sync failed: ${u}`)}}async function Lt(o,n,t,e,i,r){if(r==="keep_local"){let s=o.vault.getAbstractFileByPath(i);if(s){let a=await o.vault.readBinary(s);await N(n,t,e,i,a)}}else if(r==="keep_remote"){let s=await I(n,t,e,i);await b(o,i,s)}else{let s=await I(n,t,e,i);await b(o,Z(i),s)}}var M=class extends y.Plugin{constructor(){super(...arguments);this.hostHandle={stopServer:null}}async onload(){await this.loadSettings(),this.addSettingTab(new C(this.app,this)),this.addCommand({id:"host-sync-session",name:"Host Sync Session",callback:()=>this.hostSyncSession()}),this.addCommand({id:"connect-to-sync",name:"Connect to Sync",callback:()=>this.connectToSync()})}onunload(){var t,e;(e=(t=this.hostHandle).stopServer)==null||e.call(t),this.hostHandle.stopServer=null}async loadSettings(){var t;this.settings=G((t=await this.loadData())!=null?t:{})}async saveSettings(){await this.saveData(this.settings)}hostSyncSession(){if(!y.Platform.isDesktop){new y.Notice("Host mode is only available on desktop.");return}if(this.hostHandle.stopServer){new y.Notice("Sync server is already running. Stop it first.");return}at(this.app,this.settings,this.hostHandle,()=>this.saveSettings())}connectToSync(){try{new k(this.app,this.settings,async(t,e)=>{this.settings.lastHostIp=t,await this.saveSettings(),await pt(this.app,this.settings,t,this.settings.port,e,()=>this.saveSettings())}).open()}catch(t){new y.Notice(`Vault Sync error: ${t}`)}}};
