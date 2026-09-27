export const LIMITS = Object.freeze({
  title: 140,
  eventTimeText: 120,
  storyText: 20_000,
  displayName: 80,
  audioBytes: 50 * 1024 * 1024,
  mediaBytes: 25 * 1024 * 1024,
});

export const STORY_STATUS = Object.freeze({
  ACTIVE: 'active',
  DELETED: 'deleted',
});

export const CAPABILITY_SCOPE = Object.freeze({
  OWNER: 'owner',
  READER: 'reader',
});

export function cleanText(value, maxLength) {
  if (typeof value !== 'string') return '';
  const cleaned = value.replace(/\r\n/g, '\n').trim();
  if (!cleaned) return '';
  return cleaned.slice(0, maxLength);
}

export function normalizeStoryInput(input = {}) {
  const title = cleanText(input.title, LIMITS.title);
  const eventTimeText = cleanText(input.eventTimeText, LIMITS.eventTimeText);
  const storyText = cleanText(input.storyText, LIMITS.storyText);
  const displayName = cleanText(input.displayName, LIMITS.displayName);
  const eventAt = normalizeIsoDate(input.eventAt);
  const eventTimePrecision = normalizePrecision(input.eventTimePrecision);

  if (!title) throw validationError('title', 'Vul eerst een titel in.');
  if (!eventTimeText) throw validationError('eventTimeText', 'Kies eerst wanneer dit verhaal speelde.');
  if (!eventAt) throw validationError('eventAt', 'De datum van deze herinnering is ongeldig.');

  return {
    title,
    eventTimeText,
    eventAt,
    eventTimePrecision,
    storyText,
    displayName,
  };
}

export function normalizeStoryPatch(input = {}) {
  const patch = {};
  if (Object.hasOwn(input, 'title')) {
    patch.title = cleanText(input.title, LIMITS.title);
    if (!patch.title) throw validationError('title', 'Een herinnering heeft een titel nodig.');
  }
  if (Object.hasOwn(input, 'eventTimeText')) {
    patch.eventTimeText = cleanText(input.eventTimeText, LIMITS.eventTimeText);
    if (!patch.eventTimeText) throw validationError('eventTimeText', 'Een herinnering heeft een datum nodig.');
  }
  if (Object.hasOwn(input, 'eventAt')) {
    patch.eventAt = normalizeIsoDate(input.eventAt);
    if (!patch.eventAt) throw validationError('eventAt', 'De datum van deze herinnering is ongeldig.');
  }
  if (Object.hasOwn(input, 'eventTimePrecision')) {
    patch.eventTimePrecision = normalizePrecision(input.eventTimePrecision);
  }
  if (Object.hasOwn(input, 'storyText')) {
    patch.storyText = cleanText(input.storyText, LIMITS.storyText);
  }
  if (!Object.keys(patch).length) throw validationError('story', 'Er zijn geen wijzigingen ontvangen.');
  return patch;
}

export function normalizePrecision(value) {
  const allowed = new Set(['exact', 'day', 'month', 'season', 'year', 'approximate', 'unknown', 'gebruiker']);
  const cleaned = String(value || '').trim().toLowerCase();
  return allowed.has(cleaned) ? cleaned : 'unknown';
}

export function normalizeIsoDate(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return '';
  const date = new Date(timestamp);
  if (date.getUTCFullYear() < 1900 || date.getUTCFullYear() > 2200) return '';
  return date.toISOString();
}

export function audioExtensionForMime(mimeType) {
  const type = String(mimeType || '').toLowerCase();
  if (type.includes('mp4') || type.includes('m4a')) return 'm4a';
  if (type.includes('aac')) return 'aac';
  if (type.includes('ogg')) return 'ogg';
  if (type.includes('mpeg') || type.includes('mp3')) return 'mp3';
  if (type.includes('wav')) return 'wav';
  return 'webm';
}

export function mediaExtensionForMime(mimeType) {
  const type = String(mimeType || '').toLowerCase();
  if (type.includes('png')) return 'png';
  if (type.includes('webp')) return 'webp';
  if (type.includes('heic') || type.includes('heif')) return 'heic';
  if (type.includes('gif')) return 'gif';
  if (type.includes('quicktime')) return 'mov';
  if (type.includes('mp4')) return 'mp4';
  return 'jpg';
}

export function validationError(field, message) {
  const error = new Error(message);
  error.name = 'ValidationError';
  error.field = field;
  error.status = 422;
  return error;
}
