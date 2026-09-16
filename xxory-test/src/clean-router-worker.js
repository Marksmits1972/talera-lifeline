import legacyWorker from './orb-app-v79-worker-timeline-publish.js';
import { handleCleanRebuildV2 } from './clean-rebuild-v2.js';
import { handleStoryLabFresh } from './storylab-fresh.js';

export default {
  async fetch(request, env, ctx) {
    const storyLabResponse = await handleStoryLabFresh(request, env);
    if (storyLabResponse) return storyLabResponse;
    const cleanResponse = await handleCleanRebuildV2(request, env);
    if (cleanResponse) return cleanResponse;
    return legacyWorker.fetch(request, env, ctx);
  }
};
