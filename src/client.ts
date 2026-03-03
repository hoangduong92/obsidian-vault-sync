// HTTP client — uses Obsidian requestUrl() (works on iOS + desktop)

import { requestUrl } from 'obsidian';
import {
  AuthResponse, FileManifestEntry,
  ManifestDiffResponse, SyncDiffEntry,
} from './types';
import { encrypt, decrypt } from './crypto';

function baseUrl(host: string, port: number): string {
  return `http://${host}:${port}`;
}

function authHeaders(token: string): Record<string, string> {
  return { 'X-Token': token, 'Content-Type': 'application/json' };
}

/** Authenticate with host; returns token + host manifest. */
export async function authenticate(
  host: string,
  port: number,
  code: string,
  deviceName: string,
): Promise<AuthResponse> {
  const resp = await requestUrl({
    url: `${baseUrl(host, port)}/auth`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, deviceName }),
    throw: false,
  });
  if (resp.status !== 200) throw new Error(`Auth failed: ${resp.status}`);
  return resp.json as AuthResponse;
}

/** Fetch the host's current manifest. */
export async function getManifest(
  host: string,
  port: number,
  token: string,
): Promise<FileManifestEntry[]> {
  const resp = await requestUrl({
    url: `${baseUrl(host, port)}/manifest`,
    method: 'GET',
    headers: authHeaders(token),
    throw: false,
  });
  if (resp.status !== 200) throw new Error(`getManifest failed: ${resp.status}`);
  return (resp.json as { manifest: FileManifestEntry[] }).manifest;
}

/** Send client manifest to host; receive computed diff. */
export async function postManifest(
  host: string,
  port: number,
  token: string,
  files: FileManifestEntry[],
): Promise<SyncDiffEntry[]> {
  const resp = await requestUrl({
    url: `${baseUrl(host, port)}/manifest`,
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ files }),
    throw: false,
  });
  if (resp.status !== 200) throw new Error(`postManifest failed: ${resp.status}`);
  return (resp.json as ManifestDiffResponse).diff;
}

/** Download a file from the host; returns decrypted bytes. */
export async function downloadFile(
  host: string,
  port: number,
  token: string,
  filePath: string,
  key: CryptoKey,
): Promise<ArrayBuffer> {
  const resp = await requestUrl({
    url: `${baseUrl(host, port)}/file?path=${encodeURIComponent(filePath)}`,
    method: 'GET',
    headers: { 'X-Token': token },
    throw: false,
  });
  if (resp.status !== 200) throw new Error(`downloadFile failed: ${resp.status} (${filePath})`);
  return decrypt(resp.arrayBuffer, key);
}

/** Encrypt and upload raw bytes to a path on the host. */
export async function uploadFile(
  host: string,
  port: number,
  token: string,
  filePath: string,
  content: ArrayBuffer,
  key: CryptoKey,
): Promise<void> {
  const encrypted = await encrypt(content, key);
  const resp = await requestUrl({
    url: `${baseUrl(host, port)}/file?path=${encodeURIComponent(filePath)}`,
    method: 'POST',
    headers: { 'X-Token': token, 'Content-Type': 'application/octet-stream' },
    body: encrypted,
    throw: false,
  });
  if (resp.status !== 200) throw new Error(`uploadFile failed: ${resp.status} (${filePath})`);
}

/** Delete a file on the host. */
export async function deleteRemoteFile(
  host: string,
  port: number,
  token: string,
  filePath: string,
): Promise<void> {
  const resp = await requestUrl({
    url: `${baseUrl(host, port)}/delete?path=${encodeURIComponent(filePath)}`,
    method: 'POST',
    headers: authHeaders(token),
    throw: false,
  });
  if (resp.status !== 200) throw new Error(`deleteFile failed: ${resp.status} (${filePath})`);
}

/** Signal to host that the sync session is complete. */
export async function complete(host: string, port: number, token: string): Promise<void> {
  await requestUrl({
    url: `${baseUrl(host, port)}/complete`,
    method: 'POST',
    headers: authHeaders(token),
    throw: false,
  });
}
