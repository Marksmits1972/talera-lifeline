import { chunk1 } from "./html/chunk1.js";
import { chunk2 } from "./html/chunk2.js";
import { chunk3 } from "./html/chunk3.js";
import { chunk4 } from "./html/chunk4.js";
import { chunk5 } from "./html/chunk5.js";
import { chunk6 } from "./html/chunk6.js";
import { chunk7 } from "./html/chunk7.js";
import { chunk8 } from "./html/chunk8.js";
import { chunk9 } from "./html/chunk9.js";
import { enhancementStyle } from "./enhancement.js";
import { interactionFixStyle } from "./interaction-fixes.js";
import { presentationControllerScript } from "./presentation-controller.js";
import { fastFlickFallbackScript } from "./fast-flick-fallback.js";

const BASE_HTML = [
  ...chunk1,
  ...chunk2,
  ...chunk3,
  ...chunk4,
  ...chunk5,
  ...chunk6,
  ...chunk7,
  ...chunk8,
  ...chunk9,
].join("\n");

const HTML = BASE_HTML
  .replace("</head>", `<style id="talera-immersive-photo">${enhancementStyle}</style><style id="talera-interaction-fixes">${interactionFixStyle}</style><style id="talera-hide-zoom-hint">.zoom-hint{display:none!important}</style></head>`)
  .replace("</body>", `<script id="talera-presentation-controller">${presentationControllerScript}</script><script id="talera-fast-flick-fallback">${fastFlickFallbackScript}</script></body>`);

export default {
  async fetch() {
    return new Response(HTML, {
      headers: {
        "content-type": "text/html; charset=UTF-8",
        "cache-control": "no-store",
      },
    });
  },
};
