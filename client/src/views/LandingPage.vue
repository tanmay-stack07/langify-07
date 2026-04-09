<script setup>
import heroImage from '../assets/hero.png';
import projectLogo from '../../../logo.jpeg';
import { computed, onMounted, onUnmounted, ref } from 'vue';

const story = [
  {
    id: 'capture',
    step: '01',
    label: 'Voice Capture',
    title: 'Conversations enter as live signal.',
    description:
      'Langify listens, stabilizes the stream, and prepares incoming speech without making the user manage technical setup.',
    points: ['Microphone or upload intake', 'Fast session start', 'Realtime-ready signal flow'],
    media: heroImage,
    position: 'center center'
  },
  {
    id: 'detect',
    step: '02',
    label: 'Language Detection',
    title: 'Language and speaking rhythm are identified automatically.',
    description:
      'The system separates language cues and cadence first, so the translated output stays cleaner and more natural.',
    points: ['Automatic source detection', 'Rhythm-aware parsing', 'Structured transcript prep'],
    media: projectLogo,
    position: 'center 22%'
  },
  {
    id: 'translate',
    step: '03',
    label: 'Translation Relay',
    title: 'Meaning moves across languages in a continuous stream.',
    description:
      'Words are carried with context, so the app behaves like a relay for meaning instead of a simple word swapper.',
    points: ['Context-aware conversion', 'Continuous live output', 'Target-language switching'],
    media: heroImage,
    position: 'center 78%'
  },
  {
    id: 'deliver',
    step: '04',
    label: 'Delivery Layer',
    title: 'Results settle into transcripts, downloads, and history.',
    description:
      'The final layer turns live translation into something useful after the moment passes: text, exports, and saved sessions.',
    points: ['Transcript view', 'Download-ready outputs', 'Session history and reuse'],
    media: projectLogo,
    position: 'center center'
  }
];

const activeIndex = ref(0);
const chapterEls = ref([]);

const setChapterEl = (el, index) => {
  if (el) chapterEls.value[index] = el;
};

const activeItem = computed(() => story[activeIndex.value]);

const syncActiveByScroll = () => {
  const trigger = window.innerHeight * 0.7;
  let nextIndex = 0;

  chapterEls.value.forEach((el, index) => {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.top <= trigger) nextIndex = index;
  });

  activeIndex.value = nextIndex;
};

onMounted(() => {
  syncActiveByScroll();
  window.addEventListener('scroll', syncActiveByScroll, { passive: true });
  window.addEventListener('resize', syncActiveByScroll);
});

onUnmounted(() => {
  window.removeEventListener('scroll', syncActiveByScroll);
  window.removeEventListener('resize', syncActiveByScroll);
});
</script>

<template>
  <div class="landing-page">
    <div class="landing-page__grid"></div>
    <div class="landing-page__glow landing-page__glow--left"></div>
    <div class="landing-page__glow landing-page__glow--right"></div>

    <section class="hero-shell">
      <div class="hero-copy">
        <p class="hero-copy__eyebrow">Langify</p>
        <h1>Speak once. Watch the translation story unfold.</h1>
        <p class="hero-copy__body">
          Scroll down and the background scene changes with the product story. Information appears on
          top of the media, then users continue into login and the main app.
        </p>
      </div>

      <div class="hero-void">
        <div class="hero-void__line hero-void__line--left"></div>
        <div class="hero-void__focus"></div>
        <div class="hero-void__line hero-void__line--right"></div>
      </div>

      <div class="hero-actions">
        <router-link to="/auth" class="hero-btn hero-btn--primary">Start</router-link>
        <a href="#story" class="hero-btn hero-btn--ghost">Scroll Story</a>
      </div>
    </section>

    <section id="story" class="scroll-story">
      <div class="scroll-story__sticky">
        <div class="story-stage">
          <transition name="story-media" mode="out-in">
            <div
              :key="activeItem.id"
              class="story-stage__media"
              :style="{
                backgroundImage: `url(${activeItem.media})`,
                backgroundPosition: activeItem.position
              }"
            ></div>
          </transition>

          <div class="story-stage__shade"></div>
          <div class="story-stage__vignette"></div>

          <div class="story-stage__content">
            <div class="story-card">
              <div class="story-card__top">
                <span class="story-card__step">{{ activeItem.step }}</span>
                <span class="story-card__label">{{ activeItem.label }}</span>
              </div>

              <transition name="story-pop" mode="out-in">
                <div :key="activeItem.id" class="story-card__body">
                  <h2>{{ activeItem.title }}</h2>
                  <p>{{ activeItem.description }}</p>

                  <div class="story-card__points">
                    <div v-for="point in activeItem.points" :key="point" class="story-card__point">
                      {{ point }}
                    </div>
                  </div>
                </div>
              </transition>

              <div class="story-card__progress">
                <span
                  v-for="(item, index) in story"
                  :key="item.id"
                  class="story-card__bar"
                  :class="{ 'story-card__bar--active': index === activeIndex }"
                ></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="scroll-story__chapters">
        <section
          v-for="(item, index) in story"
          :key="item.id"
          :ref="(el) => setChapterEl(el, index)"
          class="scroll-story__chapter"
        ></section>
      </div>
    </section>

    <section class="landing-finish">
      <div class="landing-finish__card">
        <p class="landing-finish__eyebrow">Next Step</p>
        <h2>Enter the app when you’re ready.</h2>
        <p>
          The landing page tells the story, the auth page opens the door, and the main app handles
          the working product experience.
        </p>
        <div class="hero-actions">
          <router-link to="/auth" class="hero-btn hero-btn--primary">Go to Login</router-link>
          <router-link to="/planned-ui" class="hero-btn hero-btn--ghost">Open App</router-link>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.landing-page {
  position: relative;
  min-height: 100vh;
  overflow-x: hidden;
  color: #f4f1ef;
  background:
    radial-gradient(circle at top, rgba(84, 141, 182, 0.16), transparent 22%),
    radial-gradient(circle at 80% 18%, rgba(244, 178, 120, 0.12), transparent 20%),
    linear-gradient(180deg, #05070c 0%, #090d14 45%, #05070b 100%);
}

.landing-page__grid,
.landing-page__glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.landing-page__grid {
  opacity: 0.16;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
  background-size: 56px 56px;
  mask-image: radial-gradient(circle at center, black 40%, transparent 92%);
}

.landing-page__glow--left {
  background: radial-gradient(circle at 18% 50%, rgba(123, 219, 255, 0.12), transparent 22%);
}

.landing-page__glow--right {
  background: radial-gradient(circle at 84% 24%, rgba(244, 178, 120, 0.12), transparent 22%);
}

.hero-shell,
.landing-finish {
  position: relative;
  z-index: 1;
  max-width: 1280px;
  margin: 0 auto;
  padding: 6.5rem 2rem 1.25rem;
}

.hero-copy {
  max-width: 820px;
}

.hero-copy__eyebrow,
.landing-finish__eyebrow,
.story-card__label {
  color: #efc18e;
  text-transform: uppercase;
  letter-spacing: 0.28em;
  font-size: 0.78rem;
}

.hero-copy h1,
.landing-finish h2,
.story-card h2 {
  margin-top: 1rem;
  font-size: clamp(3rem, 8vw, 6.1rem);
  line-height: 0.94;
  letter-spacing: -0.05em;
  font-weight: 800;
}

.hero-copy__body,
.landing-finish p,
.story-card p {
  margin-top: 1.3rem;
  max-width: 62ch;
  color: rgba(244, 241, 239, 0.72);
  line-height: 1.9;
  font-size: 1.08rem;
}

.hero-void {
  position: relative;
  min-height: 7vh;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0.5rem 0 0.55rem;
}

.hero-void__line,
.hero-void__focus {
  position: absolute;
  pointer-events: none;
}

.hero-void__line {
  top: 50%;
  width: min(30vw, 380px);
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.18), transparent);
}

.hero-void__line--left {
  left: calc(50% - min(18vw, 220px));
  transform: translate(-100%, -50%);
}

.hero-void__line--right {
  right: calc(50% - min(18vw, 220px));
  transform: translate(100%, -50%);
}

.hero-void__focus {
  width: min(18vw, 220px);
  height: min(18vw, 220px);
  border-radius: 999px;
  background:
    radial-gradient(circle at center, rgba(128, 220, 255, 0.16), rgba(242, 195, 138, 0.08) 35%, transparent 68%);
  filter: blur(10px);
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.hero-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 180px;
  padding: 1rem 1.3rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  text-decoration: none;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.78rem;
  font-weight: 700;
  transition: transform 0.25s ease, border-color 0.25s ease, background 0.25s ease;
}

.hero-btn:hover {
  transform: translateY(-2px);
}

.hero-btn--primary {
  color: #071017;
  background: linear-gradient(135deg, #86dfff, #f2c38a);
}

.hero-btn--ghost {
  color: #f4f1ef;
  background: rgba(255, 255, 255, 0.03);
}

.scroll-story {
  position: relative;
  z-index: 1;
  height: 150vh;
  margin-top: 0;
}

.scroll-story__sticky {
  position: sticky;
  top: 0;
  min-height: 100vh;
}

.story-stage {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
}

.story-stage__media,
.story-stage__shade,
.story-stage__vignette {
  position: absolute;
  inset: 0;
}

.story-stage__media {
  background-size: cover;
  background-repeat: no-repeat;
  transform: scale(1.06);
  filter: saturate(0.82) brightness(0.52);
  animation: media-drift 18s ease-in-out infinite alternate;
}

.story-stage__shade {
  background:
    linear-gradient(90deg, rgba(4, 7, 12, 0.84) 0%, rgba(4, 7, 12, 0.42) 45%, rgba(4, 7, 12, 0.72) 100%),
    linear-gradient(180deg, rgba(4, 7, 12, 0.2), rgba(4, 7, 12, 0.68));
}

.story-stage__vignette {
  background: radial-gradient(circle at center, transparent 28%, rgba(4, 7, 12, 0.28) 100%);
}

.story-stage__content {
  position: relative;
  z-index: 1;
  display: grid;
  align-items: end;
  min-height: 100vh;
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 2rem 4rem;
}

.story-card {
  max-width: 760px;
  padding: 2.5rem;
  border-radius: 28px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(8, 11, 18, 0.46);
  backdrop-filter: blur(14px);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.22);
}

.story-card__top {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.story-card__step {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 54px;
  height: 54px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #fff;
  font-size: 0.95rem;
  font-weight: 700;
}

.story-card h2 {
  margin-top: 0;
  font-size: clamp(3rem, 6.2vw, 5.7rem);
  line-height: 0.98;
  max-width: 12ch;
}

.story-card__points {
  display: grid;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.story-card__point {
  padding: 1.1rem 1.15rem;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(244, 241, 239, 0.82);
  font-size: 1.02rem;
}

.story-card__progress {
  display: flex;
  gap: 0.55rem;
  margin-top: 1.7rem;
}

.story-card__bar {
  flex: 1;
  height: 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
}

.story-card__bar--active {
  background: linear-gradient(90deg, #86dfff, #f2c38a);
}

.scroll-story__chapters {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.scroll-story__chapter {
  height: 14vh;
}

.landing-finish {
  padding-top: 0.5rem;
  padding-bottom: 4rem;
}

.landing-finish__card {
  width: 100%;
  max-width: 1240px;
  margin: 0 auto;
  padding: 3.25rem 3.4rem;
  border-radius: 28px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(16px);
}

.landing-finish h2 {
  font-size: clamp(2.8rem, 6vw, 5rem);
  line-height: 1;
  max-width: 14ch;
}

.landing-finish p {
  max-width: 68ch;
  font-size: 1.1rem;
  line-height: 1.95;
}

.landing-finish .hero-actions {
  margin-top: 2rem;
  gap: 1.15rem;
}

.story-pop-enter-active,
.story-pop-leave-active {
  transition: opacity 0.28s ease, transform 0.28s ease;
}

.story-pop-enter-from,
.story-pop-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

.story-media-enter-active,
.story-media-leave-active {
  transition: opacity 0.45s ease, transform 0.45s ease;
}

.story-media-enter-from,
.story-media-leave-to {
  opacity: 0;
  transform: scale(1.02);
}

@keyframes media-drift {
  0% {
    transform: scale(1.05) translate3d(-1.2%, -1%, 0);
  }
  100% {
    transform: scale(1.1) translate3d(1.2%, 1%, 0);
  }
}

@media (max-width: 768px) {
  .hero-shell,
  .story-stage__content,
  .landing-finish {
    padding-left: 1rem;
    padding-right: 1rem;
  }

  .landing-finish {
    padding-top: 0.25rem;
  }

  .hero-copy h1,
  .story-card h2 {
    font-size: clamp(2.5rem, 14vw, 4.2rem);
  }

  .hero-void {
    min-height: 3vh;
  }

  .story-card {
    padding: 1.35rem;
  }

  .landing-finish__card {
    padding: 1.4rem;
  }

  .scroll-story {
    height: 122vh;
  }

  .scroll-story__chapter {
    height: 10vh;
  }

  .story-stage__content {
    align-items: end;
    padding-bottom: 1.5rem;
  }
}
</style>
