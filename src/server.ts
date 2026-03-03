// HTTP server — Desktop only (Node.js http module via Electron)
// Endpoints: /auth, /manifest (GET/POST), /file (GET/POST), /complete

// http is loaded dynamically inside startServer() to avoid crashing on iOS
import { App, Platform, TFile } from 'obsidian';
import { generateCode, generateToken, deriveKey, encrypt, decrypt } from './crypto';
import { scanVault, readVaultFile, writeVaultFile } from './vault-scanner';
import {
  AuthRequest, AuthResponse, ManifestDiffRequest,
  ManifestDiffResponse, ServerSession, SyncSettings,
} from './types';
import { computeDiff } from './sync-engine';

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
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function validateToken(req: any, session: ServerSession): boolean {
  return req.headers['x-token'] === session.token;
}

export interface ServerCallbacks {
  onReady: (code: string, ip: string) => void;
  onClientConnected?: () => void;
  onComplete?: () => void;
}

/** Start the sync HTTP server. Returns a stop function. */
export async function startServer(
  app: App,
  settings: SyncSettings,
  callbacks: ServerCallbacks,
): Promise<() => void> {
  if (!Platform.isDesktop) throw new Error('Server only supported on desktop');

  const code = generateCode();
  const encryptionKey = await deriveKey(code);

  const session: ServerSession = {
    code,
    token: null,
    manifest: await scanVault(app, settings),
    active: true,
    failedAuthAttempts: 0,
    lastFailedAuthTime: 0,
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
      await handleRequest(app, settings, session, encryptionKey, url, method, req, res, stopServer, callbacks);
    } catch (err) {
      console.error('[VaultSync server] error:', err);
      sendJson(res, 500, { error: String(err) });
    }
  });

  function stopServer(): void {
    session.active = false;
    server.close();
  }

  server.listen(settings.port, '0.0.0.0', () => {
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
    callbacks.onReady(session.code, ip);
  });

  return stopServer;
}

async function handleRequest(
  app: App,
  settings: SyncSettings,
  session: ServerSession,
  encryptionKey: CryptoKey,
  url: URL,
  method: string,
  req: any,
  res: any,
  stopServer: () => void,
  callbacks: ServerCallbacks,
): Promise<void> {
  const path = url.pathname;

  // POST /auth — validate code, issue token, return manifest
  if (path === '/auth' && method === 'POST') {
    // Rate limit: after 5 failures, lock out with exponential backoff
    if (session.failedAuthAttempts >= 5) {
      const backoffMs = Math.min(1000 * Math.pow(2, session.failedAuthAttempts - 5), 60000);
      const elapsed = Date.now() - session.lastFailedAuthTime;
      if (elapsed < backoffMs) {
        sendJson(res, 429, { error: 'Too many attempts. Try again later.' });
        return;
      }
    }

    const body = JSON.parse((await readBody(req)).toString()) as AuthRequest;
    if (body.code !== session.code) {
      session.failedAuthAttempts++;
      session.lastFailedAuthTime = Date.now();
      sendJson(res, 401, { error: 'Invalid code' });
      return;
    }
    session.failedAuthAttempts = 0;
    session.token = generateToken();
    const response: AuthResponse = { token: session.token, manifest: session.manifest };
    sendJson(res, 200, response);
    callbacks.onClientConnected?.();
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

  // GET /file?path=xxx — return encrypted file bytes
  if (path === '/file' && method === 'GET') {
    const filePath = url.searchParams.get('path');
    if (!filePath) { sendJson(res, 400, { error: 'Missing path' }); return; }
    const content = await readVaultFile(app, filePath);
    const encrypted = await encrypt(content, encryptionKey);
    sendBinary(res, Buffer.from(encrypted));
    return;
  }

  // POST /file?path=xxx — receive encrypted file bytes, decrypt and write
  if (path === '/file' && method === 'POST') {
    const filePath = url.searchParams.get('path');
    if (!filePath) { sendJson(res, 400, { error: 'Missing path' }); return; }
    const body = await readBody(req);
    const decrypted = await decrypt(body.buffer as ArrayBuffer, encryptionKey);
    await writeVaultFile(app, filePath, decrypted);
    sendJson(res, 200, { ok: true });
    return;
  }

  // POST /delete?path=xxx — delete a file from the vault
  if (path === '/delete' && method === 'POST') {
    const filePath = url.searchParams.get('path');
    if (!filePath) { sendJson(res, 400, { error: 'Missing path' }); return; }
    const file = app.vault.getAbstractFileByPath(filePath);
    if (file instanceof TFile) {
      await app.vault.delete(file);
    }
    sendJson(res, 200, { ok: true });
    return;
  }

  // POST /complete — client signals done; stop server
  if (path === '/complete' && method === 'POST') {
    sendJson(res, 200, { ok: true });
    stopServer();
    callbacks.onComplete?.();
    return;
  }

  sendJson(res, 404, { error: 'Not found' });
}
