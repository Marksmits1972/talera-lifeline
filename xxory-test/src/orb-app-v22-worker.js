import baseWorker from "./worker.js";

const ORB_V22_STYLE = String.raw`
/* TALERA ORB v22 — cloud-shape calibration. Directly on worker.js. */

.core-wrap{
  position:relative!important;
  width:min(58vw,250px)!important;
  min-width:190px!important;
  min-height:190px!important;
  aspect-ratio:1/1!important;
  display:grid!important;
  place-items:center!important;
  overflow:visible!important;
}

.halo{display:none!important}

.core,
.core.active,
.core.listening{
  display:block!important;
  width:80%!important;
  height:80%!important;
  position:relative!important;
  opacity:1!important;
  visibility:visible!important;
  overflow:hidden!important;
  isolation:isolate!important;
  border-radius:48% 52% 49% 51% / 52% 47% 53% 48%!important;

  background:
    radial-gradient(ellipse at 16% 18%, rgba(246,252,255,.58) 0 8%, rgba(209,233,245,.26) 20%, transparent 34%),
    radial-gradient(ellipse at 79% 19%, rgba(220,241,250,.44) 0 10%, rgba(150,197,221,.22) 24%, transparent 39%),
    radial-gradient(ellipse at 24% 80%, rgba(233,246,252,.42) 0 10%, rgba(150,197,220,.22) 23%, transparent 40%),
    radial-gradient(ellipse at 80% 74%, rgba(73,131,170,.28) 0 11%, rgba(50,98,136,.16) 24%, transparent 39%),
    radial-gradient(ellipse at 48% 48%, rgba(72,130,167,.22) 0 12%, rgba(51,98,134,.12) 24%, transparent 38%),
    linear-gradient(140deg,#c9e2ed 0%,#97c2d7 33%,#6ea5c3 66%,#497b9d 100%)!important;

  background-size:136% 132%,132% 134%,138% 136%,130% 132%,126% 124%,100% 100%!important;
  background-position:24% 22%,76% 22%,27% 74%,74% 72%,47% 48%,50% 50%!important;
  background-repeat:no-repeat!important;

  box-shadow:
    0 18px 54px rgba(15,39,71,.10),
    0 0 18px rgba(100,176,215,.30),
    0 0 44px rgba(100,176,215,.18),
    0 0 80px rgba(100,176,215,.10),
    inset 10px 9px 24px rgba(255,255,255,.10),
    inset -16px -19px 30px rgba(15,39,71,.12)!important;

  transform:scale(calc(.986 + var(--awake)*.135 + var(--voice)*.055))!important;
  transition:transform .22s cubic-bezier(.18,.72,.2,1)!important;
  animation:
    taleraOrb22Shape 7.8s ease-in-out infinite,
    taleraOrb22Heartbeat 5.6s cubic-bezier(.42,0,.30,1) infinite,
    taleraOrb22DeepFlow 16s ease-in-out infinite alternate,
    taleraOrb22Aura 7.4s ease-in-out infinite!important;
}

.core.active,
.core.listening{
  animation-duration:5.2s,4.2s,10.8s,5.2s!important;
}

/* Layer B: elongated cloud ribbons, less blob-like and more like real sluiers. */
.core::before{
  content:""!important;
  display:block!important;
  position:absolute!important;
  inset:-3%!important;
  border-radius:inherit!important;

  background:
    radial-gradient(56% 14% at 18% 25%, rgba(250,254,255,.78) 0 34%, rgba(209,234,245,.34) 50%, transparent 66%),
    radial-gradient(62% 15% at 58% 18%, rgba(242,251,255,.68) 0 34%, rgba(184,219,238,.30) 51%, transparent 67%),
    radial-gradient(60% 15% at 78% 40%, rgba(235,248,254,.64) 0 33%, rgba(165,208,231,.28) 50%, transparent 67%),
    radial-gradient(58% 14% at 24% 69%, rgba(248,253,255,.70) 0 34%, rgba(186,221,239,.28) 50%, transparent 67%),
    radial-gradient(54% 14% at 70% 73%, rgba(243,251,255,.66) 0 33%, rgba(173,214,236,.28) 50%, transparent 67%),
    radial-gradient(30% 10% at 32% 44%, rgba(57,111,150,.34) 0 42%, rgba(42,84,119,.18) 56%, transparent 70%),
    radial-gradient(28% 10% at 71% 57%, rgba(47,101,140,.30) 0 42%, rgba(35,75,109,.16) 56%, transparent 70%),
    radial-gradient(26% 9% at 49% 52%, rgba(240,251,255,.34) 0 44%, rgba(164,211,234,.16) 60%, transparent 72%)!important;

  background-size:84% 32%,78% 30%,82% 32%,76% 29%,72% 28%,46% 17%,44% 16%,34% 13%!important;
  background-position:-6% 18%,34% 8%,60% 34%,4% 66%,46% 64%,26% 42%,66% 56%,44% 50%!important;
  background-repeat:no-repeat!important;

  opacity:.95!important;
  animation:taleraOrb22RibbonFlow 9.4s cubic-bezier(.45,.05,.40,.96) infinite alternate!important;
  pointer-events:none!important;
  z-index:1!important;
}

.core.active::before,
.core.listening::before{
  animation-duration:6.1s!important;
  opacity:1!important;
}

/* Layer C: front haze and softer lamp. No blend-mode tricks to avoid square artifacts on iPhone Safari. */
.core::after{
  content:""!important;
  display:block!important;
  position:absolute!important;
  inset:0!important;
  border-radius:inherit!important;

  background:
    radial-gradient(48% 12% at 20% 38%, rgba(255,255,255,.30) 0 36%, rgba(209,234,245,.18) 54%, transparent 70%),
    radial-gradient(52% 12% at 74% 68%, rgba(248,253,255,.28) 0 36%, rgba(203,231,244,.18) 54%, transparent 70%),
    radial-gradient(40% 10% at 38% 78%, rgba(244,252,255,.26) 0 36%, rgba(198,227,242,.16) 54%, transparent 70%),
    radial-gradient(circle at 55% 41%, rgba(255,255,255,.80) 0 5%, rgba(246,252,255,.62) 9%, rgba(208,235,247,.34) 17%, rgba(140,198,225,.14) 27%, transparent 40%),
    radial-gradient(circle at 55% 41%, rgba(255,255,255,.18) 0 14%, rgba(182,223,241,.09) 24%, transparent 36%)!important;

  background-size:74% 24%,72% 24%,54% 18%,26% 26%,40% 40%!important;
  background-position:-4% 34%,52% 63%,22% 76%,46% 33%,42% 29%!important;
  background-repeat:no-repeat!important;

  opacity:.74!important;
  animation:taleraOrb22FrontFlow 6.6s ease-in-out infinite!important;
  pointer-events:none!important;
  z-index:2!important;
}

.core.active::after,
.core.listening::after{
  animation-duration:4.8s!important;
  opacity:.82!important;
}

.status::after{
  content:"  · v22";
  font-size:9px;
  opacity:.32;
  vertical-align:middle;
}

@keyframes taleraOrb22Shape{
  0%,100%{border-radius:48% 52% 49% 51% / 52% 47% 53% 48%}
  28%{border-radius:52% 48% 46% 54% / 48% 55% 45% 52%}
  62%{border-radius:48% 52% 54% 46% / 55% 47% 53% 45%}
}

@keyframes taleraOrb22Heartbeat{
  0%,12%,100%{scale:.973}
  30%{scale:.994}
  40%{scale:1.047}
  50%{scale:.993}
  61%{scale:1.030}
  74%{scale:.985}
}

@keyframes taleraOrb22Aura{
  0%,100%{
    box-shadow:
      0 18px 54px rgba(15,39,71,.10),
      0 0 18px rgba(100,176,215,.30),
      0 0 44px rgba(100,176,215,.18),
      0 0 80px rgba(100,176,215,.10),
      inset 10px 9px 24px rgba(255,255,255,.10),
      inset -16px -19px 30px rgba(15,39,71,.12);
  }
  48%{
    box-shadow:
      0 20px 58px rgba(15,39,71,.11),
      0 0 25px rgba(100,176,215,.42),
      0 0 58px rgba(100,176,215,.26),
      0 0 94px rgba(100,176,215,.14),
      inset 10px 9px 24px rgba(255,255,255,.11),
      inset -16px -19px 30px rgba(15,39,71,.12);
  }
}

@keyframes taleraOrb22DeepFlow{
  0%{background-position:24% 22%,76% 22%,27% 74%,74% 72%,47% 48%,50% 50%}
  29%{background-position:34% 28%,68% 16%,36% 66%,79% 64%,40% 54%,50% 50%}
  56%{background-position:18% 35%,80% 30%,21% 80%,66% 77%,53% 42%,50% 50%}
  82%{background-position:31% 17%,62% 36%,37% 69%,76% 81%,44% 45%,50% 50%}
  100%{background-position:21% 31%,77% 17%,31% 75%,69% 64%,50% 55%,50% 50%}
}

@keyframes taleraOrb22RibbonFlow{
  0%{
    transform:translate(-6%,-4%) scale(1.01) rotate(-.8deg);
    background-position:-6% 18%,34% 8%,60% 34%,4% 66%,46% 64%,26% 42%,66% 56%,44% 50%;
  }
  24%{
    transform:translate(3%,-3%) scale(1.05) rotate(.35deg);
    background-position:8% 12%,43% 14%,54% 28%,14% 61%,56% 58%,34% 47%,58% 62%,39% 45%;
  }
  49%{
    transform:translate(7%,4%) scale(1.03) rotate(.85deg);
    background-position:4% 24%,54% 18%,62% 41%,8% 71%,49% 69%,26% 39%,73% 51%,48% 54%;
  }
  76%{
    transform:translate(-2%,8%) scale(1.07) rotate(-.45deg);
    background-position:18% 10%,31% 19%,72% 26%,18% 57%,57% 63%,41% 49%,61% 58%,36% 43%;
  }
  100%{
    transform:translate(-7%,1%) scale(1.04) rotate(.15deg);
    background-position:6% 20%,48% 4%,58% 38%,7% 67%,43% 60%,31% 45%,69% 66%,45% 50%;
  }
}

@keyframes taleraOrb22FrontFlow{
  0%{
    transform:translate(-3%,-3%) scale(.99) rotate(-.5deg);
    background-position:-4% 34%,52% 63%,22% 76%,46% 33%,42% 29%;
    opacity:.68;
  }
  21%{
    transform:translate(4%,-6%) scale(1.02) rotate(.25deg);
    background-position:10% 26%,60% 54%,34% 68%,54% 25%,48% 31%;
    opacity:.80;
  }
  45%{
    transform:translate(7%,1%) scale(1.04) rotate(.7deg);
    background-position:18% 29%,73% 50%,26% 58%,63% 37%,56% 39%;
    opacity:.72;
  }
  69%{
    transform:translate(1%,7%) scale(1.01) rotate(-.2deg);
    background-position:7% 36%,64% 72%,42% 65%,57% 58%,50% 52%;
    opacity:.84;
  }
  87%{
    transform:translate(-6%,4%) scale(1.03) rotate(-.7deg);
    background-position:15% 18%,56% 62%,20% 80%,34% 53%,39% 43%;
    opacity:.74;
  }
  100%{
    transform:translate(-3%,-3%) scale(.99) rotate(-.5deg);
    background-position:-4% 34%,52% 63%,22% 76%,46% 33%,42% 29%;
    opacity:.68;
  }
}
`;

function enhance(html){
  return html.replace("</head>", `<style>${ORB_V22_STYLE}</style></head>`);
}

export default {
  async fetch(request, env, ctx){
    const response = await baseWorker.fetch(request, env, ctx);
    const type = response.headers.get("content-type") || "";
    if (request.method === "HEAD" || !type.includes("text/html")) return response;

    const html = await response.text();
    const headers = new Headers(response.headers);
    headers.delete("content-length");
    headers.set("cache-control", "no-store");
    headers.set("x-talera-orb-app", "organic-v22-direct-cloud-shapes");

    return new Response(enhance(html), {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
};
