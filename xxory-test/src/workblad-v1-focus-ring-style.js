export const WORKBLAD_V1_FOCUS_RING_STYLE = String.raw`
.voice-layer{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
.voice-center{position:relative;isolation:isolate}
.voice-center::before{content:none}
.voice-center .core-wrap{position:relative;z-index:1;isolation:isolate;overflow:visible}
.voice-center .core-wrap::before{content:"";position:absolute;inset:-19%;border-radius:50%;pointer-events:none;z-index:-1;background:radial-gradient(circle,rgba(255,254,252,.075) 0 58%,rgba(255,254,252,.055) 70%,rgba(255,254,252,.025) 82%,transparent 100%);backdrop-filter:blur(9px);-webkit-backdrop-filter:blur(9px);-webkit-mask-image:radial-gradient(circle,#000 0 66%,rgba(0,0,0,.92) 74%,rgba(0,0,0,.58) 84%,rgba(0,0,0,.18) 94%,transparent 100%);mask-image:radial-gradient(circle,#000 0 66%,rgba(0,0,0,.92) 74%,rgba(0,0,0,.58) 84%,rgba(0,0,0,.18) 94%,transparent 100%)}
.voice-center .core-wrap .halo,.voice-center .core-wrap .core{position:relative;z-index:1}
.voice-center .voice-status{position:relative;z-index:2}
`;
