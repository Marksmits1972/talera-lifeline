import { CAPABILITY_SCOPE } from './domain.js';

export function randomToken(bytes = 32) {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  let binary = '';
  for (const byte of data) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export async function sha256Hex(value) {
  const input = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', input));
  return [...digest].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function issueStoryCapabilities() {
  const ownerToken = randomToken(32);
  const readerToken = randomToken(32);
  return {
    ownerToken,
    readerToken,
    ownerHash: await sha256Hex(ownerToken),
    readerHash: await sha256Hex(readerToken),
  };
}

export function bearerToken(request) {
  const value = request.headers.get('authorization') || '';
  if (!value.toLowerCase().startsWith('bearer ')) return '';
  return value.slice(7).trim();
}

export async function verifyCapability(token, expectedHash) {
  if (!token || !expectedHash) return false;
  const actual = await sha256Hex(token);
  if (actual.length !== expectedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i += 1) {
    diff |= actual.charCodeAt(i) ^ expectedHash.charCodeAt(i);
  }
  return diff === 0;
}

export function scopeAllows(scope, action) {
  if (scope === CAPABILITY_SCOPE.OWNER) return true;
  if (scope === CAPABILITY_SCOPE.READER) return action === 'read' || action === 'listen';
  return false;
}
