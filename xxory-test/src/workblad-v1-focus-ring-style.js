export const WORKBLAD_V1_FOCUS_RING_STYLE = String.raw`
.voice-layer{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
.voice-center{position:relative;isolation:isolate}
.voice-center::before{content:none}
.voice-center .core-wrap{position:relative;z-index:1;isolation:isolate;overflow:visible}
.voice-center .core-wrap::before{content:"";position:absolute;inset:-28%;border-radius:50%;pointer-events:none;z-index:-1;background:rgba(255,254,252,.012);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);-webkit-mask-image:radial-gradient(circle,#000 0 49%,rgba(0,0,0,.94) 55%,rgba(0,0,0,.78) 63%,rgba(0,0,0,.56) 72%,rgba(0,0,0,.34) 81%,rgba(0,0,0,.17) 89%,rgba(0,0,0,.06) 95%,transparent 100%);mask-image:radial-gradient(circle,#000 0 49%,rgba(0,0,0,.94) 55%,rgba(0,0,0,.78) 63%,rgba(0,0,0,.56) 72%,rgba(0,0,0,.34) 81%,rgba(0,0,0,.17) 89%,rgba(0,0,0,.06) 95%,transparent 100%)}
.voice-center .core-wrap .halo,.voice-center .core-wrap .core{position:relative;z-index:1}
.voice-center .voice-status{position:relative;z-index:2}
`;
