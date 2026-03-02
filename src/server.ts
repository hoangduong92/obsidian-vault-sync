// HTTP server — Desktop only (Node.js http module via Electron)
// Endpoints: /auth, /manifest (GET/POST), /file (GET/POST), /complete

import * as http from 'http';
import { App, Platform } from 'obsidian';
import { generateCode, generateToken } from './crypto';
import { scanVault, readVaultFile, writeVaultFile } from './vault-scanner';
import {
  AuthRequest, AuthResponse, ManifestDiffRequest,
  ManifestDiffResponse, ServerSession, SyncSettings,
} from './types';
import { computeDiff } from './sync-engine';

const PORT = 53217;

// CORS + JSON helpers
function sendJson(res: http.ServerResponse, status: number, data: unknown): void {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'X-Token, Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  });
  res.end(body);
}

function sendBinary(res: http.ServerResponse, data: Buffer): void {
  res.writeHead(200, {
    'Content-Type': 'application/octet-stream',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'X-Token, Content-Type',
  });
  res.end(data);
}

async function readBody(req: http.IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function validateToken(req: http.IncomingMessage, session: ServerSession): boolean {
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

  const server = http.createServer(async (req, res) => {
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
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const os = require('os') as typeof import('os');
    const ifaces = os.networkInterfaces();
    let ip = '127.0.0.1';
    for (const iface of Object.values(ifaces)) {
      for (const addr of iface ?? []) {
        if (addr.family === 'IPv4' && !addr.internal) { ip = addr.address; break; }
      }
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
  req: http.IncomingMessage,
  res: http.ServerResponse,
): Promise<void> {
  const path = url.pathname;

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

  // POST /complete — client signals done; stop server
  if (path === '/complete' && method === 'POST') {
    sendJson(res, 200, { ok: true });
    session.active = false;
    return;
  }

  sendJson(res, 404, { error: 'Not found' });
}
