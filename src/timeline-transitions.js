export const timelineTransitionStyle = String.raw`
/* TALERA timeline presence — calm rise, readable hold, soft return to rest */
.timeline canvas{
  transition:
    opacity 1.35s cubic-bezier(.22,.61,.36,1) .18s,
    filter 1.35s cubic-bezier(.22,.61,.36,1) .18s!important;
}
.timeline .center-needle{
  transition:
    opacity 1.35s cubic-bezier(.22,.61,.36,1) .18s,
    filter 1.35s cubic-bezier(.22,.61,.36,1) .18s!important;
}
.timeline .focus{
  transition:
    opacity 1.35s cubic-bezier(.22,.61,.36,1) .18s,
    transform 1.35s cubic-bezier(.22,.61,.36,1) .18s,
    filter 1.35s cubic-bezier(.22,.61,.36,1) .18s!important;
}
.timeline::after{
  transition:opacity 1.35s cubic-bezier(.22,.61,.36,1) .18s!important;
}

/* Waking up may be a little quicker than going back to rest, but never abrupt. */
.timeline.is-active canvas,
.timeline.is-active .center-needle,
.timeline.is-active .focus,
.timeline.is-active::after{
  transition-duration:.62s!important;
  transition-delay:0s!important;
  transition-timing-function:cubic-bezier(.22,.72,.25,1)!important;
}

/* On touch devices, losing explicit touch intent should feel like a slow release,
   not like the timeline suddenly switching off while the user is still looking. */
@media (pointer:coarse){
  .timeline.is-active:not(.touch-intent) canvas,
  .timeline.is-active:not(.touch-intent) .center-needle,
  .timeline.is-active:not(.touch-intent) .focus,
  .timeline.is-active:not(.touch-intent)::after{
    transition-duration:1.35s!important;
    transition-delay:.18s!important;
    transition-timing-function:cubic-bezier(.22,.61,.36,1)!important;
  }

  .timeline.is-active.touch-intent canvas,
  .timeline.is-active.touch-intent .center-needle,
  .timeline.is-active.touch-intent .focus,
  .timeline.is-active.touch-intent::after{
    transition-duration:.62s!important;
    transition-delay:0s!important;
    transition-timing-function:cubic-bezier(.22,.72,.25,1)!important;
  }
}
`;
