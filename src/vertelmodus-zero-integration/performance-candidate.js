/* Candidate V2 decoder hygiene, inside approved zero-player.
During dispose(), pause, remove video src, call load() to release active decoder, then remove element.
During syncVideo(), do not set currentTime while v.seeking. Keep same clock and original cue timestamps.
Only the active video decoder plays; no separate all-video preload pool is started.
*/