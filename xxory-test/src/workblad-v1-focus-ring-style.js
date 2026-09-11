export const WORKBLAD_V1_FOCUS_RING_STYLE = String.raw`
.voice-layer{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
.voice-center{position:relative;isolation:isolate}
.voice-center::before{content:"";position:absolute;left:50%;top:50%;width:min(86vw,360px);aspect-ratio:1;transform:translate(-50%,-53%);border-radius:50%;pointer-events:none;z-index:0;background:radial-gradient(circle,transparent 0 54%,rgba(255,254,252,.035) 58%,rgba(255,254,252,.10) 68%,rgba(255,254,252,.055) 78%,transparent 88%);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);-webkit-mask-image:radial-gradient(circle,transparent 0 52%,#000 59%,#000 75%,transparent 88%);mask-image:radial-gradient(circle,transparent 0 52%,#000 59%,#000 75%,transparent 88%)}
.voice-center .core-wrap,.voice-center .voice-status{position:relative;z-index:1}
`;
