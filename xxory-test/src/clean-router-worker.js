import legacyWorker from './orb-app-v79-worker-timeline-publish.js';
import { handleCleanRebuild } from './clean-rebuild-v1.js';

export default {
  async fetch(request, env, ctx) {
    const cleanResponse = await handleCleanRebuild(request, env);
    if (cleanResponse) return cleanResponse;
    return legacyWorker.fetch(request, env, ctx);
  }
};
