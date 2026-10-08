/**
 * TV pairing state protocol: references only, never story content or media URLs.
 * The TV must still get its own authorized access before fetching private media.
 */
const MODES = new Set(['timeline', 'photo', 'story', 'video']);
const PLAYBACK = new Set(['paused', 'playing']);
const SAFE_STORY_ID = /^[A-Za-z0-9_-]{1,100}$/;
export const MAX_PRESENTATION_SEQ = 2147483647;

export function applyPresentationUpdate(session, input) {
  if (!session || !session.connected) {
    return { ok: false, status: 409, error: 'De presentatie is niet verbonden.' };
  }
  const body = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const seq = body.seq;
  if (!Number.isSafeInteger(seq) || seq < 1 || seq > MAX_PRESENTATION_SEQ) {
    return { ok: false, status: 400, error: 'Ongeldig opdrachtnummer.' };
  }
  // A delayed request must never send the timeline back to an earlier position.
  if (seq <= (session.presentationSeq || 0)) {
    return { ok: true, replayed: true, session };
  }

  const mode = body.mode;
  const playback = body.playback ?? 'paused';
  const storyId = body.storyId ?? '';
  const timestampMs = body.timestampMs;
  const mediaIndex = body.mediaIndex ?? 0;
  if (!MODES.has(mode) || !PLAYBACK.has(playback) ||
      typeof storyId !== 'string' ||
      (storyId !== '' && !SAFE_STORY_ID.test(storyId)) ||
      (mode !== 'timeline' && !storyId) ||
      !Number.isSafeInteger(timestampMs) ||
      timestampMs < 0 || timestampMs > 4102444800000 ||
      !Number.isSafeInteger(mediaIndex) || mediaIndex < 0 || mediaIndex > 999) {
    return { ok: false, status: 400, error: 'Ongeldige presentatiepositie.' };
  }

  const revision = (session.presentationVersion || 0) + 1;
  return {
    ok: true,
    replayed: false,
    session: {
      ...session,
      presentationSeq: seq,
      presentationVersion: revision,
      presentation: { storyId, timestampMs, mediaIndex, mode, playback, revision }
    }
  };
}
