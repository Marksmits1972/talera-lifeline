import legacyWorker from './orb-app-v79-worker-timeline-publish.js';
import { handleCleanRebuildV2 } from './clean-rebuild-v2.js';
import { handleFreshVertelV1 } from './fresh-vertel-v1.js';

export default {
  async fetch(request, env, ctx) {
    const freshResponse = await handleFreshVertelV1(request, env, ctx);
    if (freshResponse) return freshResponse;
    const cleanResponse = await handleCleanRebuildV2(request, env);
    if (cleanResponse) return cleanResponse;
    return legacyWorker.fetch(request, env, ctx);
  }
};
