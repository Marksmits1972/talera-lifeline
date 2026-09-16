import legacyWorker from './orb-app-v79-worker-timeline-publish.js';
import { handleCleanRebuildV2 } from './clean-rebuild-v2.js';
import { handleStoryLabV1 } from './storylab-v1.js';

export default {
  async fetch(request, env, ctx) {
    const storyLabResponse = await handleStoryLabV1(request, env);
    if (storyLabResponse) return storyLabResponse;
    const cleanResponse = await handleCleanRebuildV2(request, env);
    if (cleanResponse) return cleanResponse;
    return legacyWorker.fetch(request, env, ctx);
  }
};
