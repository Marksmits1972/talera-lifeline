import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createPresentationControllerScript} from '../src/presentation-controller.js';
import {createTimelineVisualStateScript} from '../src/timeline-visual-state.js';
import {makePages} from './pages.js';

const {JSDOM}=await import(process.env.FREE_JSDOM_MODULE||'jsdom');
const dom=new JSDOM('<section class="timeline"></section><div id="photoStage"><div class="photo-layer"><img class="example-photo"></div></div><div id="memoryStoryScroll"></div>',{runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window;
const image=w.document.querySelector('img');
Object.defineProperties(image,{complete:{value:true},naturalWidth:{value:1600},naturalHeight:{value:900}});
let observers=0,resizeObservers=0;
w.MutationObserver=class{constructor(){observers++;}observe(){}};
w.ResizeObserver=class{constructor(){resizeObservers++;}observe(){}};
// No book means setup stops before the swipe engine. Layout must stay native,
// including when ready images load or the viewport changes.
w.eval(createPresentationControllerScript({nativePhotoLayout:true,timelineFeedback:false}));
image.dispatchEvent(new w.Event('load'));
w.dispatchEvent(new w.Event('resize'));
assert.equal(observers,0);
assert.equal(resizeObservers,0);
assert.equal(image.getAttribute('style'),null);
assert.equal(w.document.querySelector('.photo-aligned-blur'),null);
dom.window.close();

const html=(await makePages()).timeline;
const script=id=>html.match(new RegExp(`<script[^>]*id="${id}"[^>]*>([\\s\\S]*?)</script>`))[1];
const presentation=script('talera-presentation-controller');
const feedback=script('talera-timeline-visual-state-controller');
new vm.Script(presentation);
new vm.Script(feedback);
assert.doesNotMatch(presentation,/containScale|ensureAlignedBlur|activePointers/);
assert.doesNotMatch(feedback,/WATCH_MS|setInterval/);
assert.match(presentation,/settleFromRelease/);
assert.match(feedback,/enterEngaged/);
// Historical consumers keep their existing behavior through default options.
assert.match(createPresentationControllerScript(),/containScale|ensureAlignedBlur/);
assert.match(createTimelineVisualStateScript(),/WATCH_MS/);
console.log('Free: native photo layout, one feedback owner, no legacy watchdog; shared defaults retained.');
