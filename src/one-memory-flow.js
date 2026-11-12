const roundMs = (value, name = 'time') => {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${name} must be a finite non-negative number`);
  return Math.round(value);
};
const requireId = (value, name) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${name} is required`);
  return value;
};

export class RecordingClock {
  constructor({ nowMs = () => performance.now() } = {}) {
    this.nowMs = nowMs;
    this.phase = 'idle';
    this.accumulatedMs = 0;
    this.runningSinceMs = 0;
  }
  start() {
    if (this.phase !== 'idle') throw new Error('Recording already started');
    this.runningSinceMs = this.nowMs();
    this.phase = 'recording';
  }
  positionMs() {
    if (this.phase === 'idle') return 0;
    return roundMs(this.accumulatedMs + (this.phase === 'recording' ? Math.max(0, this.nowMs() - this.runningSinceMs) : 0));
  }
  pause() {
    if (this.phase !== 'recording') return;
    this.accumulatedMs = this.positionMs();
    this.phase = 'paused';
  }
  resume() {
    if (this.phase !== 'paused') return;
    this.runningSinceMs = this.nowMs();
    this.phase = 'recording';
  }
  finish() {
    if (this.phase === 'recording') this.accumulatedMs = this.positionMs();
    this.phase = 'finished';
    return this.positionMs();
  }
}

export function normalizeMedia(items) {
  if (!Array.isArray(items)) throw new Error('media must be an array');
  const ids = new Set();
  return items.map((item, index) => {
    if (!item || typeof item !== 'object') throw new Error(`media[${index}] is invalid`);
    const mediaId = requireId(item.mediaId, `media[${index}].mediaId`);
    const storageKey = requireId(item.storageKey, `media[${index}].storageKey`);
    if (ids.has(mediaId)) throw new Error(`duplicate mediaId: ${mediaId}`);
    ids.add(mediaId);
    const type = item.type === 'image' ? 'photo' : item.type;
    if (type !== 'photo' && type !== 'video') throw new Error(`invalid media type for ${mediaId}`);
    const normalized = { mediaId, storageKey, type, order: index, muted: type === 'video' };
    if (type === 'video') {
      if (item.videoDurationMs == null) throw new Error(`video duration missing: ${mediaId}`);
      normalized.videoDurationMs = roundMs(item.videoDurationMs, `${mediaId}.videoDurationMs`);
    }
    return normalized;
  });
}

export class CaptureTimeline {
  constructor({ memoryId, media, clock }) {
    this.memoryId = requireId(memoryId, 'memoryId');
    this.media = normalizeMedia(media);
    this.validIds = new Set(this.media.map(m => m.mediaId));
    if (!clock || typeof clock.positionMs !== 'function') throw new Error('recording clock is required');
    this.clock = clock;
    this.phase = 'idle';
    this.cues = [];
  }
  start(visibleMediaId = null) {
    if (this.phase !== 'idle') throw new Error('Capture already started');
    if (visibleMediaId !== null && !this.validIds.has(visibleMediaId)) throw new Error('First mediaId is unknown');
    if (this.media.length && visibleMediaId === null) throw new Error('First visible mediaId is required');
    if (typeof this.clock.start === 'function') this.clock.start();
    this.phase = 'recording';
    if (visibleMediaId !== null) this.cues.push({ audioTimeMs: 0, mediaId: visibleMediaId });
  }
  confirmedVisible(mediaId) {
    if (this.phase !== 'recording') return false;
    if (!this.validIds.has(mediaId)) throw new Error(`unknown visible mediaId: ${mediaId}`);
    if (this.cues.at(-1)?.mediaId === mediaId) return false;
    const audioTimeMs = roundMs(this.clock.positionMs(), 'audioTimeMs');
    if (audioTimeMs < (this.cues.at(-1)?.audioTimeMs ?? 0)) throw new Error('Audio time moved backwards');
    this.cues.push({ audioTimeMs, mediaId });
    return true;
  }
  pause() {
    if (this.phase !== 'recording') return;
    if (typeof this.clock.pause === 'function') this.clock.pause();
    this.phase = 'paused';
  }
  resume() {
    if (this.phase !== 'paused') return;
    if (typeof this.clock.resume === 'function') this.clock.resume();
    this.phase = 'recording';
  }
  finish() {
    if (this.phase !== 'recording' && this.phase !== 'paused') throw new Error('No recording to finish');
    const measuredDurationMs = typeof this.clock.finish === 'function' ? this.clock.finish() : this.clock.positionMs();
    this.phase = 'finished';
    return { memoryId: this.memoryId, cues: this.cues.map(c => ({ ...c })), measuredDurationMs: roundMs(measuredDurationMs) };
  }
}

export function upgradeLegacyCues(narrationCues, media) {
  const canonical = normalizeMedia(media);
  if (!Array.isArray(narrationCues)) throw new Error('legacy cues must be an array');
  return narrationCues.map((cue, index) => {
    if (!cue || !Number.isInteger(cue.index) || !canonical[cue.index]) throw new Error(`legacy cue ${index} references absent media`);
    // Older TALERA narrationCues store t in seconds, indices refer to original saved order.
    return { audioTimeMs: roundMs(cue.t * 1000), mediaId: canonical[cue.index].mediaId };
  });
}

export async function buildMemoryManifest({
  memoryId, media, audio = null, narrationDurationMs = 0, cues = [],
  photoDurationMs = 4000, speechStartOffsetMs = 0, verifyMedia, verifyAudio,
}) {
  requireId(memoryId, 'memoryId');
  const ordered = normalizeMedia(media);
  const duration = roundMs(narrationDurationMs, 'narrationDurationMs');
  const photoTime = roundMs(photoDurationMs, 'photoDurationMs');
  if (photoTime <= 0) throw new Error('photoDurationMs must be positive');
  if (typeof verifyMedia !== 'function') throw new Error('verifyMedia is required');
  if (audio !== null && (typeof verifyAudio !== 'function' || !audio.storageKey)) throw new Error('Original audio and verifyAudio are required');
  if ((audio === null) !== (duration === 0)) throw new Error('Audio and narration duration must both be present or both absent');
  if (!Array.isArray(cues)) throw new Error('cues must be an array');
  if (duration === 0 && cues.length) throw new Error('Silent memories cannot have narration cues');
  if (duration && ordered.length && (!cues.length || cues[0]?.audioTimeMs !== 0)) throw new Error('First cue must start at audio time 0');
  const lookup = new Map(ordered.map(item => [item.mediaId, item]));
  let prev = -1;
  const checkedCues = cues.map((cue, index) => {
    if (!cue || !lookup.has(cue.mediaId)) throw new Error(`cue ${index} references absent media`);
    const audioTimeMs = roundMs(cue.audioTimeMs, `cue[${index}].audioTimeMs`);
    if (audioTimeMs < prev || audioTimeMs > duration) throw new Error(`cue ${index} is outside chronological audio`);
    prev = audioTimeMs;
    return { audioTimeMs, mediaId: cue.mediaId };
  });
  // Verify originals before publishing. A missing file is a hard stop, never silently skipped.
  for (const item of ordered) {
    if ((await verifyMedia(item)) !== true) throw new Error(`Original media missing: ${item.mediaId}`);
  }
  if (audio && (await verifyAudio(audio)) !== true) throw new Error('Original audio missing');

  const visited = new Set(checkedCues.map(c => c.mediaId));
  const tail = [];
  let startMs = 0;
  const addTail = (item, durationMs, videoStartMs = undefined) => {
    if (durationMs <= 0) return;
    const seg = { mediaId: item.mediaId, startMs, durationMs };
    if (item.type === 'video') seg.videoStartMs = videoStartMs ?? 0;
    tail.push(seg);
    startMs += durationMs;
  };
  const lastCue = checkedCues.at(-1);
  const lastItem = lastCue && lookup.get(lastCue.mediaId);
  if (lastItem?.type === 'video') {
    const elapsed = Math.max(0, duration - lastCue.audioTimeMs);
    addTail(lastItem, Math.max(0, lastItem.videoDurationMs - elapsed), Math.min(elapsed, lastItem.videoDurationMs));
  }
  for (const item of ordered) {
    if (visited.has(item.mediaId)) continue;
    addTail(item, item.type === 'video' ? item.videoDurationMs : photoTime);
  }
  return {
    schemaVersion: 1, memoryId, media: ordered, audio: audio ? { ...audio } : null,
    narrationDurationMs: duration, speechStartOffsetMs: roundMs(speechStartOffsetMs, 'speechStartOffsetMs'),
    cues: checkedCues, tail, tailDurationMs: startMs, photoDurationMs: photoTime,
  };
}

export function resolveFrame(manifest, rawPositionMs) {
  const narrationMs = roundMs(manifest.narrationDurationMs ?? 0);
  const tailMs = roundMs(manifest.tailDurationMs ?? 0);
  const totalMs = narrationMs + tailMs;
  const positionMs = Math.min(totalMs, roundMs(rawPositionMs, 'positionMs'));
  const lookup = new Map((manifest.media || []).map(m => [m.mediaId, m]));
  if (positionMs < narrationMs) {
    const cue = [...(manifest.cues || [])].reverse().find(c => c.audioTimeMs <= positionMs);
    const item = cue && lookup.get(cue.mediaId);
    const videoPositionMs = item?.type === 'video' ? Math.min(item.videoDurationMs, positionMs - cue.audioTimeMs) : null;
    return { segment: 'narration', positionMs, mediaId: item?.mediaId ?? null, type: item?.type ?? null, videoPositionMs, ended: false };
  }
  const localMs = positionMs - narrationMs;
  const tailItem = (manifest.tail || []).find(t => localMs >= t.startMs && localMs < t.startMs + t.durationMs);
  if (tailItem) {
    const item = lookup.get(tailItem.mediaId);
    if (!item) throw new Error('Tail references absent media');
    const videoPositionMs = item.type === 'video' ? Math.min(item.videoDurationMs, (tailItem.videoStartMs ?? 0) + localMs - tailItem.startMs) : null;
    return { segment: 'tail', positionMs, mediaId: item.mediaId, type: item.type, videoPositionMs, ended: false };
  }
  // Preserve the last picture in the same viewport after playback is complete.
  const lastTail = manifest.tail?.at(-1);
  const lastCue = manifest.cues?.at(-1);
  const item = lookup.get(lastTail?.mediaId ?? lastCue?.mediaId);
  return { segment: 'ended', positionMs, mediaId: item?.mediaId ?? null, type: item?.type ?? null, videoPositionMs: item?.type === 'video' ? item.videoDurationMs : null, ended: true };
}

export class OnePresentation {
  constructor({ manifest, audioElement = null, nowMs = () => performance.now(), showMedia, syncVideo = () => {}, setIndicator = () => {}, onError = () => {}, onEnded = () => {} }) {
    if (!manifest?.memoryId) throw new Error('Memory manifest is required');
    if (typeof showMedia !== 'function') throw new Error('Existing viewport showMedia callback required');
    if (manifest.audio && !audioElement) throw new Error('Use existing narration audio element');
    this.manifest = manifest;
    this.audio = audioElement;
    this.nowMs = nowMs;
    this.showMedia = showMedia;
    this.syncVideo = syncVideo;
    this.setIndicator = setIndicator;
    this.onError = onError;
    this.onEnded = onEnded;
    this.state = { memoryId: manifest.memoryId, playState: 'paused', segment: manifest.narrationDurationMs ? 'narration' : 'tail', positionMs: 0, visibleMediaId: null };
    this.tailAnchorMs = 0;
    this.renderGeneration = 0;
    this.requestedMediaId = null;
    this.failedMediaId = null;
    this.endedNotified = false;
  }
  get totalDurationMs() { return this.manifest.narrationDurationMs + this.manifest.tailDurationMs; }
  _position() {
    if (this.state.playState !== 'playing') return this.state.positionMs;
    if (this.state.positionMs < this.manifest.narrationDurationMs && this.audio && !this.audio.ended) {
      return Math.min(this.manifest.narrationDurationMs, roundMs(this.audio.currentTime * 1000));
    }
    return Math.min(this.totalDurationMs, Math.max(this.manifest.narrationDurationMs, this.nowMs() - this.tailAnchorMs + this.manifest.narrationDurationMs));
  }
  async play() {
    if (this.state.playState === 'playing') return true;
    if (this.state.playState === 'ended') this.seek(0);
    if (this.state.positionMs < this.manifest.narrationDurationMs && this.audio) {
      try { await this.audio.play(); } catch (error) { this.onError(error); return false; }
    } else {
      this.tailAnchorMs = this.nowMs() - (this.state.positionMs - this.manifest.narrationDurationMs);
    }
    this.state.playState = 'playing';
    this.tick();
    return true;
  }
  pause() {
    this.tick();
    if (this.audio) this.audio.pause();
    this.state.playState = 'paused';
    this.syncVideo({ playing: false, muted: true });
  }
  seek(rawPositionMs) {
    const positionMs = Math.min(this.totalDurationMs, roundMs(rawPositionMs));
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = Math.min(this.manifest.narrationDurationMs, positionMs) / 1000;
    }
    this.state.positionMs = positionMs;
    this.state.segment = positionMs < this.manifest.narrationDurationMs ? 'narration' : 'tail';
    this.state.playState = positionMs === this.totalDurationMs ? 'ended' : 'paused';
    this.endedNotified = false;
    this.failedMediaId = null;
    this.renderGeneration++; // cancel any stale asynchronous image loads
    this.requestedMediaId = null;
    this.tick();
  }
  onAudioEnded() {
    if (this.state.positionMs >= this.manifest.narrationDurationMs && this.state.segment !== 'narration') return;
    this.state.positionMs = this.manifest.narrationDurationMs;
    this.state.segment = 'tail';
    this.tailAnchorMs = this.nowMs();
    this.tick();
  }
  retryMedia() {
    this.failedMediaId = null;
    this.requestedMediaId = null;
    this.tick();
  }
  tick() {
    if (this.state.playState === 'playing' && this.state.segment === 'narration' && this.audio?.ended) {
      this.onAudioEnded();
      return this.state;
    }
    const positionMs = this._position();
    this.state.positionMs = positionMs;
    const frame = resolveFrame(this.manifest, positionMs);
    this.state.segment = frame.segment;
    if (frame.ended) {
      this.state.playState = 'ended';
      if (!this.endedNotified) { this.endedNotified = true; this.onEnded(); }
    }
    if (frame.mediaId && this.requestedMediaId !== frame.mediaId && this.failedMediaId !== frame.mediaId) {
      const generation = ++this.renderGeneration;
      this.requestedMediaId = frame.mediaId;
      // showMedia must resolve the actual painted ID, not the requested ID or active dot.
      Promise.resolve().then(() => this.showMedia(frame.mediaId, frame)).then(paintedMediaId => {
        if (generation !== this.renderGeneration || paintedMediaId !== frame.mediaId) return;
        this.state.visibleMediaId = frame.mediaId;
        this.setIndicator(frame.mediaId);
        this._syncVideo(resolveFrame(this.manifest, this.state.positionMs));
      }).catch(error => {
        if (generation !== this.renderGeneration) return;
        this.failedMediaId = frame.mediaId;
        this.requestedMediaId = null;
        this.onError(error);
      });
    }
    if (frame.mediaId === this.state.visibleMediaId) this._syncVideo(frame);
    return { ...this.state };
  }
  _syncVideo(frame) {
    const video = frame.type === 'video' && this.manifest.media.find(m => m.mediaId === frame.mediaId);
    const finishedClip = !!(video && frame.videoPositionMs >= video.videoDurationMs);
    this.syncVideo({ mediaId: frame.mediaId, videoPositionMs: frame.videoPositionMs, playing: this.state.playState === 'playing' && !frame.ended && !finishedClip, muted: true, playsInline: true });
  }
}
