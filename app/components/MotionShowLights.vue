<template>
  <div class="motion-show-lights" aria-hidden="true"><i /><i /><span /></div>
</template>
<style scoped>
.motion-show-lights {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  border-radius: inherit;
}
.motion-show-lights i {
  position: absolute;
  top: -12%;
  left: 0;
  width: 48%;
  height: 125%;
  transform-origin: top center;
  transform: rotate(-18deg);
  background: linear-gradient(180deg, rgba(196, 243, 50, 0.24), transparent 85%);
  clip-path: polygon(48% 0, 52% 0, 100% 100%, 0 100%);
  animation: motion-spotlight 4s ease-in-out infinite alternate;
}
.motion-show-lights i:nth-child(2) {
  left: auto;
  right: 0;
  background: linear-gradient(180deg, rgba(255, 90, 36, 0.22), transparent 85%);
  transform: rotate(18deg);
  animation-name: motion-spotlight-right;
}
.motion-show-lights span {
  position: absolute;
  width: 45%;
  aspect-ratio: 1;
  inset: 20% auto auto 28%;
  border: 1px solid var(--motion-glow);
  border-radius: 50%;
  animation: motion-stage-ring 5s ease-out infinite;
}
@keyframes motion-spotlight {
  from {
    opacity: 0;
    transform: rotate(12deg);
  }
  to {
    opacity: 1;
    transform: rotate(-18deg);
  }
}
@keyframes motion-spotlight-right {
  from {
    opacity: 0;
    transform: rotate(-12deg);
  }
  to {
    opacity: 1;
    transform: rotate(18deg);
  }
}
@keyframes motion-stage-ring {
  from {
    opacity: 0;
    transform: scale(0.6);
  }
  40% {
    opacity: 1;
  }
  to {
    opacity: 0;
    transform: scale(1.7);
  }
}
@media (prefers-reduced-motion: reduce) {
  .motion-show-lights {
    display: none;
  }
}
</style>
