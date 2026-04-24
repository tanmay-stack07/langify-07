<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import MagneticButton from '../components/landing/MagneticButton.vue';
import OrbScene from '../components/landing/OrbScene.vue';
import TiltPanel from '../components/landing/TiltPanel.vue';

gsap.registerPlugin(ScrollTrigger);

const router = useRouter();

const rootEl = ref(null);
const experienceEl = ref(null);
const stageEl = ref(null);
const cursorGlowEl = ref(null);
const featureRefs = ref([]);
const sceneRefs = ref([]);
const stepRefs = ref([]);
const cardRefs = ref([]);

const activeScene = ref(0);
const isMobile = ref(false);
const prefersReducedMotion = ref(false);
const isLowPerf = ref(false);

let ctx;
let lenis;
let tickerCallback;
let pointerGlowTween;

const scenes = [
  {
    eyebrow: 'Idle AI',
    title: 'A cinematic language engine waiting for speech.',
    body: 'Langify begins as a quiet intelligence: a hovering orb, drifting languages, and a live HUD ready to interpret any voice.'
  },
  {
    eyebrow: 'Audio Input',
    title: 'The system hears signal before it hears meaning.',
    body: 'Microphone capture sharpens, waveform energy rises, and the live relay starts pulling structure from sound.'
  },
  {
    eyebrow: 'Detection',
    title: 'Language identification happens in motion.',
    body: 'As words surface, the system tags their origin, scores confidence, and builds a multilingual understanding in real time.'
  },
  {
    eyebrow: 'Translation Morph',
    title: 'Meaning crosses language boundaries without friction.',
    body: 'Source text dissolves into translated intent through smooth particle-like transitions and controlled semantic shifts.'
  },
  {
    eyebrow: 'UI Formation',
    title: 'Speech becomes usable output.',
    body: 'Detected phrases settle into layered glass cards that feel like product UI materializing directly from the translation engine.'
  },
  {
    eyebrow: 'Activation',
    title: 'The experience resolves into action.',
    body: 'By the final scene, the system has moved from ambient intelligence to a ready-to-use workspace for live translation.'
  }
];

const translationCards = [
  {
    source: 'Client call',
    original: 'Hola, podemos empezar la reunion ahora.',
    translated: 'Hello, we can start the meeting now.'
  },
  {
    source: 'Travel voice note',
    original: 'こんにちは、空港に向かっています。',
    translated: 'Hello, I am heading to the airport.'
  }
];

const featureCards = [
  {
    title: 'Zero-friction input',
    body: 'Upload audio or speak naturally. Langify turns raw voice into structured signal with minimal user effort.'
  },
  {
    title: 'Clear translation flow',
    body: 'The interface guides attention through capture, detection, translation, and output instead of throwing every effect on screen at once.'
  },
  {
    title: 'Polished confidence',
    body: 'Subtle glow, spacing discipline, and calm motion make the product feel reliable before the user even starts a session.'
  }
];

const activeCopy = computed(() => scenes[activeScene.value]);
const orbMode = computed(() => ['idle', 'input', 'detect', 'morph', 'cards', 'cta'][activeScene.value] || 'idle');

const setSceneRef = (el, index) => {
  if (el) sceneRefs.value[index] = el.$el || el;
};

const setStepRef = (el, index) => {
  if (el) stepRefs.value[index] = el.$el || el;
};

const setCardRef = (el, index) => {
  if (el) cardRefs.value[index] = el.$el || el;
};

const setFeatureRef = (el, index) => {
  if (el) featureRefs.value[index] = el.$el || el;
};

const updateViewportMode = () => {
  isMobile.value = window.innerWidth < 768;
  prefersReducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const memory = navigator.deviceMemory ?? 8;
  const cores = navigator.hardwareConcurrency ?? 8;
  isLowPerf.value = memory <= 4 || cores <= 4;
};

const scrollToExperience = () => {
  experienceEl.value?.scrollIntoView({ behavior: 'smooth' });
};

const moveCursorGlow = (event) => {
  if (!cursorGlowEl.value || isMobile.value || prefersReducedMotion.value || isLowPerf.value) return;

  pointerGlowTween?.kill();
  pointerGlowTween = gsap.to(cursorGlowEl.value, {
    x: event.clientX - 180,
    y: event.clientY - 180,
    duration: 0.2,
    overwrite: 'auto',
    ease: 'power2.out'
  });
};

const setupLenis = () => {
  if (prefersReducedMotion.value || isMobile.value || isLowPerf.value) return;

  lenis = new Lenis({
    lerp: 0.085,
    duration: 1.1,
    smoothWheel: true
  });

  lenis.on('scroll', ScrollTrigger.update);
  tickerCallback = (time) => {
    lenis.raf(time * 1000);
  };
  gsap.ticker.add(tickerCallback);
  gsap.ticker.lagSmoothing(0);
};

const setupAnimations = () => {
  if (!rootEl.value || !experienceEl.value || !stageEl.value) return;

  ctx = gsap.context(() => {
    const validSceneRefs = sceneRefs.value.filter(Boolean);
    const validCardRefs = cardRefs.value.filter(Boolean);

    gsap.set(validSceneRefs, { autoAlpha: 0, y: 42 });
    gsap.set(sceneRefs.value[0], { autoAlpha: 1, y: 0 });
    gsap.set(validCardRefs, { autoAlpha: 0, y: 80, rotateX: 18 });

    const sequence = gsap.timeline({
      scrollTrigger: {
        trigger: experienceEl.value,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1.2,
        pin: stageEl.value,
        invalidateOnRefresh: true,
        onUpdate(self) {
          const nextScene = Math.min(scenes.length - 1, Math.floor(self.progress * scenes.length));
          activeScene.value = nextScene;
          stepRefs.value.forEach((step, index) => {
            if (!step) return;
            step.classList.toggle('experience-step--active', index === nextScene);
          });
        }
      }
    });

    sequence
      .to(sceneRefs.value[0], { autoAlpha: 0, y: -46, duration: 0.85 })
      .fromTo(sceneRefs.value[1], { autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0, duration: 1 }, '<0.18')
      .to(sceneRefs.value[1], { autoAlpha: 0, y: -42, duration: 0.8 }, '+=0.7')
      .fromTo(sceneRefs.value[2], { autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0, duration: 1 }, '<0.16')
      .to(sceneRefs.value[2], { autoAlpha: 0, y: -42, duration: 0.8 }, '+=0.7')
      .fromTo(sceneRefs.value[3], { autoAlpha: 0, y: 64 }, { autoAlpha: 1, y: 0, duration: 1.05 }, '<0.16')
      .to(sceneRefs.value[3], { autoAlpha: 0, y: -42, duration: 0.8 }, '+=0.8')
      .fromTo(sceneRefs.value[4], { autoAlpha: 0, y: 68 }, { autoAlpha: 1, y: 0, duration: 1.05 }, '<0.16')
      .to(validCardRefs, {
        autoAlpha: 1,
        y: 0,
        rotateX: 0,
        duration: 0.9,
        stagger: 0.12,
        ease: 'power3.out'
      }, '<0.08')
      .to(sceneRefs.value[4], { autoAlpha: 0, y: -36, duration: 0.75 }, '+=0.95')
      .fromTo(sceneRefs.value[5], { autoAlpha: 0, y: 72 }, { autoAlpha: 1, y: 0, duration: 1.1, ease: 'power3.out' }, '<0.1');

    if (!prefersReducedMotion.value && !isLowPerf.value) {
      gsap.to('.hero-grid__scan', {
        yPercent: 100,
        duration: 5.2,
        repeat: -1,
        ease: 'none'
      });

      gsap.to('.audio-wave span', {
        height: (_, target) => 34 + ((Number(target.dataset.index) % 5) * 18),
        duration: 1.35,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        stagger: {
          each: 0.06,
          from: 'center'
        }
      });

      gsap.to('.processing-word', {
        y: (_, el) => (Number(el.dataset.offset) % 2 === 0 ? -10 : 12),
        opacity: 1,
        scale: 1.02,
        duration: 1.9,
        repeat: -1,
        yoyo: true,
        stagger: 0.16,
        ease: 'sine.inOut'
      });

      gsap.to('.translation-morph__particle', {
        x: (_, el) => Number(el.dataset.x),
        y: (_, el) => Number(el.dataset.y),
        scale: (_, el) => Number(el.dataset.scale),
        opacity: 0.82,
        duration: 1.55,
        repeat: -1,
        yoyo: true,
        stagger: 0.1,
        ease: 'sine.inOut'
      });

      gsap.to('.data-bars span', {
        scaleY: (_, el) => 0.45 + (Number(el.dataset.bar) % 4) * 0.28,
        opacity: 0.95,
        duration: 1.4,
        repeat: -1,
        yoyo: true,
        stagger: 0.1,
        ease: 'power1.inOut'
      });
    }

    gsap.from('.hero-intro__copy > *', {
      autoAlpha: 0,
      y: 24,
      duration: 0.8,
      stagger: 0.08,
      ease: 'power2.out'
    });

    gsap.from('.hero-preview > *', {
      autoAlpha: 0,
      y: 26,
      duration: 0.8,
      stagger: 0.08,
      ease: 'power2.out'
    });

    featureRefs.value.forEach((card, index) => {
      if (!card) return;
      gsap.from(card, {
        autoAlpha: 0,
        y: 42,
        scale: 0.96,
        duration: 0.8,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: card,
          start: 'top 84%'
        },
        delay: index * 0.06
      });
    });

    gsap.from('.demo-shell__panel', {
      autoAlpha: 0,
      y: 48,
      filter: 'blur(16px)',
      duration: 0.9,
      stagger: 0.12,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: '.demo-shell',
        start: 'top 72%'
      }
    });

  }, rootEl.value);
};

onMounted(() => {
  updateViewportMode();
  setupLenis();
  setupAnimations();
  window.addEventListener('resize', updateViewportMode);
  window.addEventListener('pointermove', moveCursorGlow, { passive: true });
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateViewportMode);
  window.removeEventListener('pointermove', moveCursorGlow);
  pointerGlowTween?.kill();
  ctx?.revert();
  ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
  if (tickerCallback) gsap.ticker.remove(tickerCallback);
  lenis?.destroy();
});
</script>

<template>
  <div ref="rootEl" class="langify-landing">
    <div
      v-if="!isMobile && !prefersReducedMotion && !isLowPerf"
      ref="cursorGlowEl"
      class="cursor-glow"
    ></div>

    <div class="hero-grid">
      <div class="hero-grid__mesh"></div>
      <div class="hero-grid__scan"></div>
      <div class="hero-grid__aurora hero-grid__aurora--left"></div>
      <div class="hero-grid__aurora hero-grid__aurora--right"></div>
    </div>

    <section class="hero-intro">
      <div class="hero-intro__copy">
        <p class="hero-intro__eyebrow">Langify / Universal Speech Translation</p>
        <h1>Watch AI listen, understand, and translate speech as you scroll.</h1>
        <p class="hero-intro__body">
          Built as a cinematic product experience, this landing page simulates live signal capture,
          language detection, translation morphing, and UI formation in one continuous narrative.
        </p>

        <div class="hero-intro__actions">
          <MagneticButton @click="router.push('/auth')">Start Translating</MagneticButton>
          <MagneticButton variant="ghost" @click="scrollToExperience">
            Enter The System
          </MagneticButton>
        </div>
      </div>

      <div class="hero-preview">
        <div class="hero-preview__orb"></div>
        <div class="hero-preview__panel">
          <span>Live speech preview</span>
          <strong>Soft, readable, premium motion</strong>
          <div class="hero-preview__wave">
            <i v-for="bar in 18" :key="bar" :style="{ animationDelay: `${bar * 0.08}s` }"></i>
          </div>
        </div>
        <div class="hero-preview__stats">
          <div class="hero-stat">
            <span>Source languages</span>
            <strong>57+</strong>
          </div>
          <div class="hero-stat">
            <span>Target outputs</span>
            <strong>100+</strong>
          </div>
          <div class="hero-stat">
            <span>Mode</span>
            <strong>Live translation</strong>
          </div>
        </div>
        <div class="hero-preview__caption">
          <span>Intentional motion</span>
          <p>Subtle waveform energy and layered glass panels create movement without making the page feel noisy.</p>
        </div>
      </div>
    </section>

    <section ref="experienceEl" class="experience-scroll">
      <div ref="stageEl" class="experience-stage">
        <div class="experience-stage__canvas">
          <OrbScene :mode="orbMode" />
        </div>

        <div class="experience-stage__chrome">
          <div class="data-bars">
            <span v-for="bar in 8" :key="bar" :data-bar="bar"></span>
          </div>
        </div>

        <div class="experience-stage__overlay">
          <div class="experience-copy">
            <p>{{ activeCopy.eyebrow }}</p>
            <h2>{{ activeCopy.title }}</h2>
            <span>{{ activeCopy.body }}</span>
          </div>

          <div class="experience-rail">
            <button
              v-for="(scene, index) in scenes"
              :key="scene.eyebrow"
              :ref="(el) => setStepRef(el, index)"
              type="button"
              class="experience-step"
            >
              <small>{{ String(index + 1).padStart(2, '0') }}</small>
              <span>{{ scene.eyebrow }}</span>
            </button>
          </div>

          <div class="scene-layer scene-layer--hero" :ref="(el) => setSceneRef(el, 0)">
            <div class="floating-languages">
              <span>English</span>
              <span>Spanish</span>
              <span>Japanese</span>
              <span>Arabic</span>
              <span>French</span>
              <span>Korean</span>
            </div>
          </div>

          <div class="scene-layer scene-layer--audio" :ref="(el) => setSceneRef(el, 1)">
            <div class="audio-shell">
              <div class="audio-shell__mic"></div>
              <div class="audio-shell__rings">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <div class="audio-wave">
                <span v-for="index in 15" :key="index" :data-index="index"></span>
              </div>
              <p>Realtime intake sharpening from ambient sound to usable signal.</p>
            </div>
          </div>

          <div class="scene-layer scene-layer--detect" :ref="(el) => setSceneRef(el, 2)">
            <div class="processing-cloud">
              <div class="processing-word" data-offset="0">
                Bonjour <small>[FR]</small>
              </div>
              <div class="processing-word" data-offset="1">
                Hola <small>[ES]</small>
              </div>
              <div class="processing-word" data-offset="2">
                こんにちは <small>[JP]</small>
              </div>
              <div class="processing-cloud__hud">
                <span>Detecting language...</span>
                <strong>Confidence: 98%</strong>
              </div>
            </div>
          </div>

          <div class="scene-layer scene-layer--morph" :ref="(el) => setSceneRef(el, 3)">
            <div class="translation-morph">
              <div class="translation-morph__line">
                <span>Bonjour</span>
                <div class="translation-morph__beam"></div>
                <strong>Hello</strong>
              </div>
              <div class="translation-morph__line">
                <span>Hola</span>
                <div class="translation-morph__beam"></div>
                <strong>Hello</strong>
              </div>
              <div class="translation-morph__particles">
                <span v-for="particle in 10" :key="particle" class="translation-morph__particle"
                  :data-x="particle % 2 === 0 ? 26 : -22"
                  :data-y="particle % 3 === 0 ? -10 : 14"
                  :data-scale="0.75 + particle * 0.03"
                ></span>
              </div>
            </div>
          </div>

          <div class="scene-layer scene-layer--cards" :ref="(el) => setSceneRef(el, 4)">
            <div class="card-cluster">
              <TiltPanel
                v-for="(card, index) in translationCards"
                :key="card.source"
              >
                <div :ref="(el) => setCardRef(el, index)" class="translation-card">
                  <div class="translation-card__body">
                    <div class="translation-card__meta">
                      <span>{{ card.source }}</span>
                      <small>Detected + translated</small>
                    </div>
                    <p>{{ card.original }}</p>
                    <strong>{{ card.translated }}</strong>
                  </div>
                </div>
              </TiltPanel>
            </div>
          </div>

          <div class="scene-layer scene-layer--cta" :ref="(el) => setSceneRef(el, 5)">
            <div class="cta-shell">
              <p class="cta-shell__eyebrow">Production-ready live translation</p>
              <h3>Bring the same cinematic intelligence into the working product.</h3>
              <div class="cta-shell__actions">
                <MagneticButton @click="router.push('/auth')">Start Translating</MagneticButton>
                <MagneticButton variant="ghost" @click="router.push('/planned-ui')">Open Workspace</MagneticButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="feature-strip">
      <div class="feature-strip__header">
        <p>Premium by design</p>
        <h2>Cleaner spacing, calmer motion, and stronger hierarchy make the story easier to trust.</h2>
      </div>
      <div class="feature-strip__grid">
        <TiltPanel
          v-for="(feature, index) in featureCards"
          :key="feature.title"
          :ref="(el) => setFeatureRef(el, index)"
          class="feature-card"
        >
          <div class="feature-card__body">
            <div class="feature-card__icon"></div>
            <h3>{{ feature.title }}</h3>
            <p>{{ feature.body }}</p>
          </div>
        </TiltPanel>
      </div>
    </section>

    <section class="landing-detail">
      <TiltPanel class="landing-detail__panel">
        <div class="landing-detail__content">
          <p class="landing-detail__eyebrow">Why it feels premium</p>
          <h3>Every section feels polished because the page behaves like a live product, not a flat marketing screen.</h3>
          <div class="landing-detail__grid">
            <div>
              <span>Feels alive</span>
              <strong>Each scroll step reveals a new stage of listening, detecting, translating, and presenting speech.</strong>
            </div>
            <div>
              <span>Looks refined</span>
              <strong>Glass panels, glow depth, motion, and spacing make the interface feel closer to a premium product launch.</strong>
            </div>
            <div>
              <span>Builds trust</span>
              <strong>The experience shows how Langify works in seconds, so visitors immediately understand the app before entering it.</strong>
            </div>
          </div>
        </div>
      </TiltPanel>
    </section>

    <section class="demo-shell">
      <div class="demo-shell__header">
        <p>Realtime interaction</p>
        <h2>A mock session shows the app working without burying the user in noise.</h2>
      </div>
      <div class="demo-shell__grid">
        <TiltPanel class="demo-shell__panel">
          <div class="demo-shell__mock">
            <div class="demo-shell__topline">
              <span>Listening in English</span>
              <small>Typing live</small>
            </div>
            <div class="demo-shell__typing">
              <span>Bonjour, on commence maintenant...</span>
            </div>
            <div class="demo-shell__translation">
              <strong>Hello, we are starting now.</strong>
              <p>Language switches and output cards are framed as product UI, not decorative noise.</p>
            </div>
          </div>
        </TiltPanel>
        <TiltPanel class="demo-shell__panel">
          <div class="demo-shell__languages">
            <span>English</span>
            <span>French</span>
            <span>Spanish</span>
            <span>Japanese</span>
          </div>
          <div class="demo-shell__reason">
            <h3>Purposeful transitions</h3>
            <p>Language changes, typing, and translation updates all animate with soft fades, slight lift, and controlled timing.</p>
          </div>
        </TiltPanel>
      </div>
    </section>

  </div>
</template>

<style scoped>
.langify-landing {
  position: relative;
  overflow-x: hidden;
  color: #eff6ff;
  background:
    radial-gradient(circle at 18% 12%, rgba(56, 189, 248, 0.16), transparent 22%),
    radial-gradient(circle at 82% 16%, rgba(83, 74, 183, 0.2), transparent 22%),
    linear-gradient(180deg, #090914 0%, #0d0d1a 42%, #0a0a14 100%);
}

.cursor-glow {
  position: fixed;
  top: 0;
  left: 0;
  width: 360px;
  height: 360px;
  border-radius: 999px;
  pointer-events: none;
  z-index: 2;
  opacity: 0.48;
  background: radial-gradient(circle, rgba(56, 189, 248, 0.24), transparent 58%);
  filter: blur(28px);
}

.hero-grid {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.hero-grid__mesh,
.hero-grid__scan,
.hero-grid__aurora {
  position: absolute;
  inset: 0;
}

.hero-grid__mesh {
  opacity: 0.18;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
  background-size: 68px 68px;
  mask-image: radial-gradient(circle at center, black 35%, transparent 92%);
}

.hero-grid__scan {
  top: -100%;
  height: 38%;
  background: linear-gradient(180deg, transparent, rgba(56, 189, 248, 0.12), transparent);
  filter: blur(18px);
}

.hero-grid__aurora--left {
  background: radial-gradient(circle at 22% 26%, rgba(56, 189, 248, 0.14), transparent 26%);
}

.hero-grid__aurora--right {
  background: radial-gradient(circle at 78% 24%, rgba(242, 201, 138, 0.12), transparent 24%);
}

.hero-intro,
.landing-detail {
  position: relative;
  z-index: 1;
  max-width: 1320px;
  margin: 0 auto;
  padding: 6.5rem 1.6rem 2rem;
}

.hero-intro,
.feature-strip,
.demo-shell {
  display: grid;
  max-width: 1320px;
  margin: 0 auto;
  padding: 6rem 1.6rem;
}

.hero-intro {
  grid-template-columns: minmax(0, 1.05fr) minmax(320px, 0.72fr);
  gap: 2rem;
  min-height: 92vh;
  align-items: center;
}

.hero-intro__copy {
  max-width: 880px;
}

.hero-intro__eyebrow,
.landing-detail__eyebrow,
.experience-copy p,
.cta-shell__eyebrow {
  color: #f2c98a;
  text-transform: uppercase;
  letter-spacing: 0.24em;
  font-size: 0.76rem;
}

.hero-intro h1 {
  margin-top: 1rem;
  max-width: 12ch;
  font-size: clamp(3.4rem, 7vw, 6.35rem);
  line-height: 0.92;
  letter-spacing: -0.06em;
}

.hero-intro__body,
.experience-copy span,
.landing-detail__content h3,
.landing-detail__grid strong,
.cta-shell h3 {
  color: rgba(237, 245, 255, 0.76);
  line-height: 1.78;
}

.hero-intro__body {
  max-width: 60ch;
  margin-top: 1.3rem;
  font-size: 1.08rem;
}

.hero-intro__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 2rem;
}

.hero-preview {
  display: grid;
  gap: 1rem;
  align-self: center;
  position: relative;
}

.hero-preview__orb {
  position: absolute;
  inset: 6% 14% auto auto;
  width: 180px;
  height: 180px;
  border-radius: 999px;
  background: radial-gradient(circle at 30% 30%, rgba(56, 189, 248, 0.28), rgba(83, 74, 183, 0.16), transparent 70%);
  filter: blur(10px);
  pointer-events: none;
}

.hero-preview__panel,
.hero-preview__caption {
  padding: 1.25rem;
  border-radius: 28px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(20px);
}

.hero-preview__panel span,
.hero-preview__caption span,
.feature-strip__header p,
.demo-shell__header p,
.demo-shell__topline span,
.demo-shell__topline small {
  color: #f2c98a;
  font-size: 0.76rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.hero-preview__panel strong {
  display: block;
  margin-top: 0.6rem;
  color: #edf5ff;
  font-size: 1.24rem;
  line-height: 1.4;
}

.hero-preview__wave {
  display: flex;
  align-items: flex-end;
  gap: 0.32rem;
  height: 78px;
  margin-top: 1rem;
}

.hero-preview__wave i {
  width: 8px;
  height: 28px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(242, 201, 138, 0.88), rgba(56, 189, 248, 0.92));
  animation: preview-wave 1.8s ease-in-out infinite;
}

.hero-preview__stats {
  display: grid;
  gap: 1rem;
}

.hero-stat {
  padding: 1.25rem 1.15rem;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(18px);
}

.hero-stat span,
.translation-card__meta small,
.landing-detail__grid span {
  display: block;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.76rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero-stat strong {
  display: block;
  margin-top: 0.45rem;
  font-size: 1.38rem;
}

.hero-preview__caption p {
  margin-top: 0.7rem;
  color: rgba(237, 245, 255, 0.68);
  line-height: 1.7;
}

.experience-scroll {
  position: relative;
  height: 620vh;
}

.experience-stage {
  position: relative;
  height: 100vh;
  overflow: hidden;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  background:
    radial-gradient(circle at center, rgba(56, 189, 248, 0.08), transparent 28%),
    linear-gradient(180deg, rgba(8, 10, 20, 0.94), rgba(7, 9, 17, 0.98));
}

.experience-stage__canvas,
.experience-stage__overlay,
.experience-stage__chrome {
  position: absolute;
  inset: 0;
}

.experience-stage__overlay {
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(220px, 0.82fr) 1fr;
  gap: 1rem;
  padding: 2rem 1.6rem;
}

.experience-stage__chrome {
  pointer-events: none;
}

.data-bars {
  position: absolute;
  right: 1.4rem;
  bottom: 1.4rem;
  display: flex;
  align-items: flex-end;
  gap: 0.32rem;
  height: 88px;
}

.data-bars span {
  width: 8px;
  height: 28px;
  transform-origin: bottom center;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(242, 201, 138, 0.82), rgba(56, 189, 248, 0.9));
  opacity: 0.54;
}

.experience-copy {
  align-self: end;
  max-width: 420px;
  padding: 1.25rem;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(20px);
}

.experience-copy,
.experience-rail {
  position: relative;
  z-index: 3;
}

.experience-copy h2 {
  margin: 0.85rem 0;
  font-size: clamp(2rem, 4vw, 3.4rem);
  line-height: 0.96;
  letter-spacing: -0.05em;
}

.experience-rail {
  display: grid;
  align-content: center;
  justify-items: end;
  gap: 0.7rem;
}

.experience-step {
  display: grid;
  justify-items: end;
  gap: 0.18rem;
  border: 0;
  background: transparent;
  color: rgba(237, 245, 255, 0.32);
  text-align: right;
  transition: color 0.2s ease, transform 0.2s ease;
}

.experience-step small {
  font-size: 0.66rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.experience-step span {
  font-size: 0.96rem;
}

.experience-step--active {
  color: #f0f8ff;
  transform: translateX(-8px);
}

.scene-layer {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  pointer-events: none;
  z-index: 2;
}

.floating-languages {
  position: absolute;
  inset: 0;
}

.floating-languages span {
  position: absolute;
  padding: 0.55rem 0.8rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(10, 14, 26, 0.38);
  backdrop-filter: blur(16px);
  color: rgba(237, 245, 255, 0.8);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-size: 0.72rem;
  box-shadow: 0 0 24px rgba(56, 189, 248, 0.12);
}

.floating-languages span:nth-child(1) { top: 16%; left: 18%; }
.floating-languages span:nth-child(2) { top: 26%; right: 18%; }
.floating-languages span:nth-child(3) { top: 48%; left: 10%; }
.floating-languages span:nth-child(4) { top: 58%; right: 9%; }
.floating-languages span:nth-child(5) { bottom: 20%; left: 24%; }
.floating-languages span:nth-child(6) { bottom: 16%; right: 24%; }

.audio-shell,
.processing-cloud,
.translation-morph,
.cta-shell {
  max-width: 560px;
  width: min(58vw, 560px);
  padding: 1.5rem;
  border-radius: 30px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(24px);
  box-shadow: 0 22px 80px rgba(0, 0, 0, 0.36);
}

.audio-shell {
  position: relative;
  display: grid;
  justify-items: center;
  gap: 1.25rem;
}

.audio-shell__mic {
  width: 110px;
  height: 110px;
  border-radius: 999px;
  background:
    radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.85), rgba(56, 189, 248, 0.2)),
    linear-gradient(180deg, rgba(56, 189, 248, 0.12), rgba(83, 74, 183, 0.16));
  box-shadow: 0 0 42px rgba(56, 189, 248, 0.35);
}

.audio-shell__rings {
  position: absolute;
  width: 170px;
  height: 170px;
}

.audio-shell__rings span {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  border: 1px solid rgba(56, 189, 248, 0.26);
  animation: ring-pulse 2.8s ease-out infinite;
}

.audio-shell__rings span:nth-child(2) { animation-delay: 0.8s; }
.audio-shell__rings span:nth-child(3) { animation-delay: 1.6s; }

.audio-wave {
  display: flex;
  align-items: flex-end;
  gap: 0.32rem;
  height: 88px;
}

.audio-wave span {
  width: 9px;
  height: 24px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(242, 201, 138, 0.88), rgba(56, 189, 248, 0.9));
  box-shadow: 0 0 18px rgba(56, 189, 248, 0.18);
}

.audio-shell p {
  color: rgba(237, 245, 255, 0.66);
  text-align: center;
  line-height: 1.72;
}

.processing-cloud {
  display: grid;
  gap: 1rem;
}

.processing-word {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.05rem;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.09);
  color: rgba(241, 248, 255, 0.88);
  font-size: clamp(1.2rem, 2vw, 1.7rem);
}

.processing-word small {
  color: #7fdcff;
  font-size: 0.74rem;
  letter-spacing: 0.18em;
}

.processing-cloud__hud {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  color: rgba(237, 245, 255, 0.62);
  font-size: 0.86rem;
}

.processing-cloud__hud strong {
  color: #f2c98a;
}

.translation-morph {
  display: grid;
  gap: 1rem;
  position: relative;
  overflow: hidden;
}

.translation-morph__line {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 1rem;
  padding: 0.9rem 0;
}

.translation-morph__line span,
.translation-morph__line strong {
  font-size: clamp(1.4rem, 2vw, 1.9rem);
}

.translation-morph__line strong {
  justify-self: end;
  color: #eef7ff;
}

.translation-morph__beam {
  width: min(20vw, 150px);
  height: 2px;
  background: linear-gradient(90deg, rgba(56, 189, 248, 0.18), rgba(56, 189, 248, 1), rgba(242, 201, 138, 0.4));
  box-shadow: 0 0 18px rgba(56, 189, 248, 0.3);
}

.translation-morph__particles {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.translation-morph__particle {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.9), rgba(56, 189, 248, 0.2));
  opacity: 0.22;
}

.card-cluster {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  width: min(62vw, 700px);
}

.translation-card {
  height: 100%;
  min-height: 260px;
}

.translation-card__body {
  display: grid;
  gap: 1rem;
  padding: 1.2rem;
  height: 100%;
}

.translation-card__meta {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: start;
}

.translation-card__meta span {
  color: #f2c98a;
  font-size: 0.82rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.translation-card p {
  color: rgba(235, 243, 252, 0.68);
  line-height: 1.7;
}

.translation-card strong {
  align-self: end;
  color: #eef7ff;
  font-size: 1.2rem;
  line-height: 1.55;
}

.cta-shell {
  text-align: center;
}

.cta-shell h3 {
  margin: 1rem auto 0;
  max-width: 18ch;
  font-size: clamp(2rem, 4vw, 3.4rem);
  line-height: 0.96;
  letter-spacing: -0.05em;
}

.cta-shell__actions {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 1.8rem;
}

.scene-layer--cards,
.scene-layer--cta {
  pointer-events: auto;
}

.landing-detail {
  padding-top: 2rem;
  padding-bottom: 4rem;
}

.feature-strip {
  gap: 2rem;
}

.feature-strip__header,
.demo-shell__header {
  max-width: 840px;
}

.feature-strip__header h2,
.demo-shell__header h2 {
  margin-top: 1rem;
  font-size: clamp(2.2rem, 4vw, 3.7rem);
  line-height: 1;
  letter-spacing: -0.05em;
  color: rgba(237, 245, 255, 0.92);
}

.feature-strip__grid,
.demo-shell__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}

.feature-card__body,
.demo-shell__mock,
.demo-shell__reason {
  height: 100%;
  padding: 1.3rem;
}

.feature-card__icon {
  width: 52px;
  height: 52px;
  border-radius: 18px;
  margin-bottom: 1rem;
  background:
    radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.36), transparent 40%),
    linear-gradient(135deg, rgba(56, 189, 248, 0.28), rgba(83, 74, 183, 0.34));
  box-shadow: 0 0 24px rgba(56, 189, 248, 0.18);
}

.feature-card h3,
.demo-shell__reason h3 {
  color: rgba(237, 245, 255, 0.94);
  font-size: clamp(1.4rem, 2.2vw, 2rem);
  line-height: 1.12;
}

.feature-card p,
.demo-shell__reason p,
.demo-shell__translation p {
  margin-top: 0.8rem;
  color: rgba(237, 245, 255, 0.68);
  line-height: 1.72;
}

.landing-detail__panel {
  max-width: 1240px;
}

.landing-detail__content {
  padding: 2rem;
}

.landing-detail__content h3 {
  max-width: 18ch;
  margin-top: 1rem;
  font-size: clamp(2rem, 4vw, 3rem);
  line-height: 1;
  letter-spacing: -0.05em;
}

.landing-detail__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
  margin-top: 1.8rem;
}

.landing-detail__grid div {
  padding: 1.15rem;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
}

.landing-detail__grid strong {
  display: block;
  margin-top: 0.5rem;
}

.demo-shell {
  gap: 2rem;
}

.demo-shell__grid {
  grid-template-columns: 1.1fr 0.9fr;
}

.demo-shell__topline {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.demo-shell__typing {
  margin-top: 1rem;
  padding: 1rem 1.05rem;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
}

.demo-shell__typing span {
  color: rgba(237, 245, 255, 0.86);
  font-size: 1.1rem;
  letter-spacing: 0.01em;
  border-right: 2px solid rgba(56, 189, 248, 0.7);
  padding-right: 0.3rem;
  animation: caret-blink 1s step-end infinite;
}

.demo-shell__translation {
  margin-top: 1rem;
}

.demo-shell__translation strong {
  display: block;
  color: #edf5ff;
  font-size: 1.5rem;
  line-height: 1.34;
}

.demo-shell__languages {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
  padding: 1.3rem;
}

.demo-shell__languages span {
  padding: 0.6rem 0.85rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(237, 245, 255, 0.78);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-size: 0.72rem;
}

@keyframes preview-wave {
  0%, 100% { transform: scaleY(0.5); opacity: 0.5; }
  50% { transform: scaleY(1); opacity: 1; }
}

@keyframes caret-blink {
  50% { border-color: transparent; }
}

@media (max-width: 1024px) {
  .hero-intro,
  .experience-stage__overlay,
  .card-cluster,
  .landing-detail__grid,
  .feature-strip__grid,
  .demo-shell__grid {
    grid-template-columns: 1fr;
  }

  .hero-intro {
    min-height: auto;
    padding-top: 5rem;
  }

  .experience-stage__overlay {
    padding-top: 6rem;
  }

  .experience-rail {
    display: none;
  }

  .experience-copy {
    max-width: 100%;
  }

  .card-cluster {
    width: min(88vw, 640px);
  }
}

@media (max-width: 768px) {
  .cursor-glow {
    display: none;
  }

  .hero-intro,
  .landing-detail,
  .feature-strip,
  .demo-shell {
    padding-left: 1rem;
    padding-right: 1rem;
  }

  .experience-scroll {
    height: 520vh;
  }

  .data-bars {
    transform: scale(0.9);
    transform-origin: top left;
  }

  .experience-stage__overlay {
    padding: 5.8rem 1rem 1rem;
  }

  .audio-shell,
  .processing-cloud,
  .translation-morph,
  .cta-shell {
    width: min(86vw, 560px);
  }

  .translation-morph__line {
    grid-template-columns: 1fr;
    justify-items: start;
  }

  .translation-morph__line strong {
    justify-self: start;
  }

  .landing-detail__content {
    padding: 1.3rem;
  }

  .hero-preview__orb {
    width: 130px;
    height: 130px;
  }
}
</style>
