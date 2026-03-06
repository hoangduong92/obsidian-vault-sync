// HTTP server — Desktop only (Node.js http module via Electron)
// Endpoints: /auth, /manifest (GET/POST), /file (GET/POST), /complete

// http is loaded dynamically inside startServer() to avoid crashing on iOS
import { App, Platform } from 'obsidian';
import { generateCode, generateToken } from './crypto';
import { scanVault, readVaultFile, writeVaultFile } from './vault-scanner';
import {
  AuthRequest, AuthResponse, ManifestDiffRequest,
  ManifestDiffResponse, ServerSession, SyncSettings,
} from './types';
import { computeDiff } from './sync-engine';
import { getWebUiHtml } from './web-ui-html';
import { createZip } from './zip-builder';

const PORT = 53217;

// CORS + JSON helpers
function sendJson(res: any, status: number, data: unknown): void {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'X-Token, Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  });
  res.end(body);
}

function sendBinary(res: any, data: Buffer): void {
  res.writeHead(200, {
    'Content-Type': 'application/octet-stream',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'X-Token, Content-Type',
  });
  res.end(data);
}

async function readBody(req: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function validateToken(req: any, session: ServerSession): boolean {
  return req.headers['x-token'] === session.token;
}

/** Start the sync HTTP server. Returns a stop function. */
export async function startServer(
  app: App,
  settings: SyncSettings,
  onReady: (code: string, ip: string) => void,
): Promise<() => void> {
  if (!Platform.isDesktop) throw new Error('Server only supported on desktop');

  const session: ServerSession = {
    code: generateCode(),
    token: null,
    manifest: await scanVault(app, settings),
    active: true,
  };

  // Dynamic require to avoid loading on iOS
  const http = require('http');
  const server = http.createServer(async (req: any, res: any) => {
    if (!session.active) { sendJson(res, 503, { error: 'Server stopped' }); return; }

    const url = new URL(req.url ?? '/', `http://localhost`);
    const method = req.method ?? 'GET';

    // Preflight
    if (method === 'OPTIONS') { sendJson(res, 204, {}); return; }

    try {
      await handleRequest(app, settings, session, url, method, req, res);
    } catch (err) {
      console.error('[VaultSync server] error:', err);
      sendJson(res, 500, { error: String(err) });
    }
  });

  server.listen(PORT, '0.0.0.0', () => {
    // Determine local IP via os.networkInterfaces
    // Skip virtual adapters (WSL, Hyper-V, Docker, VPN) to find real WiFi/Ethernet IP
    const os = require('os') as typeof import('os');
    const ifaces = os.networkInterfaces();
    let ip = '127.0.0.1';
    const skipNames = /^(vEthernet|WSL|docker|br-|virbr|vmnet|vbox|tun|tap)/i;
    for (const [name, addrs] of Object.entries(ifaces)) {
      if (skipNames.test(name)) continue;
      for (const addr of addrs ?? []) {
        if (addr.family === 'IPv4' && !addr.internal) { ip = addr.address; break; }
      }
      if (ip !== '127.0.0.1') break;
    }
    onReady(session.code, ip);
  });

  return () => { session.active = false; server.close(); };
}

async function handleRequest(
  app: App,
  settings: SyncSettings,
  session: ServerSession,
  url: URL,
  method: string,
  req: any,
  res: any,
): Promise<void> {
  const path = url.pathname;

  // GET / — serve web UI for mobile browser sync
  if (path === '/' && method === 'GET') {
    const html = getWebUiHtml();
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  // GET /vault-info — return vault name (no auth needed, used by web UI)
  if (path === '/vault-info' && method === 'GET') {
    sendJson(res, 200, { name: app.vault.getName() });
    return;
  }

  // POST /auth — validate code, issue token, return manifest
  if (path === '/auth' && method === 'POST') {
    const body = JSON.parse((await readBody(req)).toString()) as AuthRequest;
    if (body.code !== session.code) { sendJson(res, 401, { error: 'Invalid code' }); return; }
    session.token = generateToken();
    const response: AuthResponse = { token: session.token, manifest: session.manifest };
    sendJson(res, 200, response);
    return;
  }

  // All subsequent routes require token
  if (!validateToken(req, session)) { sendJson(res, 401, { error: 'Unauthorized' }); return; }

  // GET /manifest — return current host manifest
  if (path === '/manifest' && method === 'GET') {
    sendJson(res, 200, { manifest: session.manifest });
    return;
  }

  // POST /manifest — receive client manifest, compute and return diff
  if (path === '/manifest' && method === 'POST') {
    const body = JSON.parse((await readBody(req)).toString()) as ManifestDiffRequest;
    const diff = computeDiff(body.files, session.manifest);
    const response: ManifestDiffResponse = { diff };
    sendJson(res, 200, response);
    return;
  }

  // GET /file?path=xxx — return raw file bytes
  if (path === '/file' && method === 'GET') {
    const filePath = url.searchParams.get('path');
    if (!filePath) { sendJson(res, 400, { error: 'Missing path' }); return; }
    const content = await readVaultFile(app, filePath);
    sendBinary(res, Buffer.from(content));
    return;
  }

  // POST /file?path=xxx — receive and write file bytes
  if (path === '/file' && method === 'POST') {
    const filePath = url.searchParams.get('path');
    if (!filePath) { sendJson(res, 400, { error: 'Missing path' }); return; }
    const body = await readBody(req);
    await writeVaultFile(app, filePath, body.buffer as ArrayBuffer);
    sendJson(res, 200, { ok: true });
    return;
  }

  // GET /download-all — zip all selected vault files into one download
  if (path === '/download-all' && method === 'GET') {
    const files: { path: string; data: Buffer }[] = [];
    for (const entry of session.manifest) {
      try {
        const content = await readVaultFile(app, entry.path);
        files.push({ path: entry.path, data: Buffer.from(content) });
      } catch { /* skip unreadable */ }
    }
    const zip = createZip(files);
    res.writeHead(200, {
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="vault-sync.zip"',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(zip);
    return;
  }

  // POST /complete — client signals done; stop server
  if (path === '/complete' && method === 'POST') {
    sendJson(res, 200, { ok: true });
    session.active = false;
    return;
  }

  sendJson(res, 404, { error: 'Not found' });
}
