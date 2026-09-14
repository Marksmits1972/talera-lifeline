# Workblad v9 r3 handoff

Purpose: expose the current in-memory Workblad v2 state read-only to the proven v9 integration bridge.

The v9 storage engine is not changed. The handoff exposes only the current audio Blob, local photo file(s), title, event time, story text, duration and voiceAttempted flag from the existing Workblad closure. This prevents the bridge from depending on IndexedDB timing or stale draft Blobs.
