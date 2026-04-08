<script setup>
import { computed, ref } from 'vue';

const tabs = [
  { id: 'home', label: 'Home' },
  { id: 'upload', label: 'Upload File' },
  { id: 'record', label: 'Record Audio' },
  { id: 'translate', label: 'Live Translate' },
  { id: 'history', label: 'History' },
  { id: 'about', label: 'About' }
];

const featureCards = [
  {
    title: 'Auto Detection',
    text: 'Speech input is detected automatically so users can jump in without setup.',
    icon: '◎'
  },
  {
    title: 'Text Conversion',
    text: 'Audio becomes structured text that can be reviewed, copied, and exported.',
    icon: '▣'
  },
  {
    title: 'AI Conversation',
    text: 'Translation cards are laid out for real-time multilingual communication.',
    icon: '◌'
  }
];

const pipelineSteps = [
  { title: 'Analyzing', caption: 'Waveform intake and language signal scan' },
  { title: 'Processing', caption: 'Chunk cleanup and transcript assembly' },
  { title: 'Translating', caption: 'Semantic conversion into target language' }
];

const workflowSteps = [
  { step: '1', title: 'Analyzing' },
  { step: '2', title: 'Processing' },
  { step: '3', title: 'Translating' },
  { step: '4', title: 'Finalizing' }
];

const historyItems = [
  { date: 'Apr 09, 2026', source: 'Japanese', target: 'English', status: 'Completed' },
  { date: 'Apr 08, 2026', source: 'Spanish', target: 'French', status: 'Saved' },
  { date: 'Apr 07, 2026', source: 'Tamil', target: 'German', status: 'Exported' }
];

const activeTab = ref('home');

const currentTab = computed(() => tabs.find((tab) => tab.id === activeTab.value));

const handleReflectiveMove = (event) => {
  const rect = event.currentTarget.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 100;
  const y = ((event.clientY - rect.top) / rect.height) * 100;
  event.currentTarget.style.setProperty('--mx', `${x}%`);
  event.currentTarget.style.setProperty('--my', `${y}%`);
};

const resetReflectiveMove = (event) => {
  event.currentTarget.style.removeProperty('--mx');
  event.currentTarget.style.removeProperty('--my');
};
</script>

<template>
  <div class="planned-ui min-h-screen text-white">
    <div class="planned-ui__bg"></div>
    <div class="planned-ui__glow planned-ui__glow--left"></div>
    <div class="planned-ui__glow planned-ui__glow--right"></div>

    <main class="relative z-10 px-4 py-6 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-7xl">
        <section class="planned-shell">
          <header class="planned-topbar">
            <div class="planned-brand">
              <div class="planned-brand__mark">◈</div>
              <div class="planned-brand__text">
                <p class="planned-brand__name">
                  <span class="planned-brand__lang">Lang</span><span class="planned-brand__ify">ify</span>
                </p>
                <p class="planned-brand__sub">Universal language workspace</p>
              </div>
            </div>

            <nav class="planned-nav">
              <button
                v-for="tab in tabs"
                :key="tab.id"
                type="button"
                class="planned-nav__item"
                :class="{ 'planned-nav__item--active': activeTab === tab.id }"
                @click="activeTab = tab.id"
                @mousemove="handleReflectiveMove"
                @mouseleave="resetReflectiveMove"
              >
                {{ tab.label }}
              </button>
            </nav>

            <div class="planned-actions">
              <div class="planned-current-tab">{{ currentTab?.label }}</div>
              <button type="button" class="planned-btn planned-btn--ghost" @mousemove="handleReflectiveMove" @mouseleave="resetReflectiveMove">Sign in</button>
              <button type="button" class="planned-btn planned-btn--primary" @mousemove="handleReflectiveMove" @mouseleave="resetReflectiveMove">Try Free</button>
            </div>
          </header>

          <section v-if="activeTab === 'home'" class="planned-section-stack">
            <div class="planned-hero">
              <div class="planned-hero__copy">
                <p class="planned-kicker">Your voice. Any language. Instant text.</p>
                <h1>Break down language barriers and connect with the world.</h1>
                <p class="planned-copy">
                  This new screen is the visual direction for the app. We can now plug real upload,
                  record, translate, and history features into these panels.
                </p>

                <div class="planned-hero__actions">
                  <button type="button" class="planned-btn planned-btn--primary" @mousemove="handleReflectiveMove" @mouseleave="resetReflectiveMove">Start Translating</button>
                  <button type="button" class="planned-btn planned-btn--soft" @mousemove="handleReflectiveMove" @mouseleave="resetReflectiveMove">See How It Works</button>
                </div>
              </div>

              <div class="planned-hero__signal">
                <div class="planned-wave">
                  <span v-for="bar in 16" :key="bar" :style="{ animationDelay: `${bar * 0.08}s` }"></span>
                </div>
                <div class="planned-hero__meta">
                  <span>Realtime Speech</span>
                  <span>33 Languages</span>
                  <span>Low-latency Output</span>
                </div>
              </div>
            </div>

            <div class="planned-panel">
              <div class="planned-panel__header">
                <h2>Our Key Features</h2>
                <p>Built as card regions so we can swap in live data later.</p>
              </div>

              <div class="planned-feature-grid">
                <article v-for="feature in featureCards" :key="feature.title" class="planned-card">
                  <div class="planned-card__icon">{{ feature.icon }}</div>
                  <h3>{{ feature.title }}</h3>
                  <p>{{ feature.text }}</p>
                </article>
              </div>
            </div>

            <div class="planned-language-strip">
              <span>Japanese</span>
              <span>English</span>
              <span>German</span>
              <span>Italian</span>
              <span>Arabic</span>
              <span>French</span>
              <span>Tamil</span>
              <span>Spanish</span>
            </div>
          </section>

          <section v-else-if="activeTab === 'upload'" class="planned-section-stack planned-section-stack--airy">
            <div class="planned-panel planned-panel--wide">
              <div class="planned-panel__header centered">
                <h2>Upload Your File</h2>
                <p>Frontend mock panel for drag and drop, file validation, and export actions.</p>
              </div>

              <div class="planned-dropzone">
                <p>Drag &amp; drop your file here or <span>Browse</span></p>
                <div class="planned-chip-row">
                  <span class="planned-chip">TXT</span>
                  <span class="planned-chip">SRT</span>
                  <span class="planned-chip">VTT</span>
                </div>
              </div>
            </div>

            <div class="planned-panel planned-panel--wide">
              <div class="planned-panel__header centered">
                <h2>Download Your Transcript</h2>
                <p>These blocks are ready to hold actual frontend status from the upload flow.</p>
              </div>

              <div class="planned-process-grid">
                <article v-for="step in pipelineSteps" :key="step.title" class="planned-process-card">
                  <div class="planned-process-card__visual"></div>
                  <h3>{{ step.title }}</h3>
                  <p>{{ step.caption }}</p>
                </article>
              </div>

              <div class="planned-download-row">
                <button type="button" class="planned-btn planned-btn--soft" @mousemove="handleReflectiveMove" @mouseleave="resetReflectiveMove">Download TXT</button>
                <button type="button" class="planned-btn planned-btn--soft" @mousemove="handleReflectiveMove" @mouseleave="resetReflectiveMove">Download SRT</button>
                <button type="button" class="planned-btn planned-btn--soft" @mousemove="handleReflectiveMove" @mouseleave="resetReflectiveMove">Download VTT</button>
              </div>
            </div>
          </section>

          <section v-else-if="activeTab === 'record'" class="planned-section-stack planned-section-stack--airy">
            <div class="planned-panel centered-panel">
              <div class="planned-panel__header centered">
                <h2>Record Audio</h2>
                <p>A dedicated surface for the live recording controls and chunk status.</p>
              </div>

              <div class="planned-recorder">
                <div class="planned-recorder__orb"></div>
                <div class="planned-wave planned-wave--compact">
                  <span v-for="bar in 12" :key="bar" :style="{ animationDelay: `${bar * 0.06}s` }"></span>
                </div>
                <div class="planned-recorder__actions">
                  <button type="button" class="planned-btn planned-btn--primary" @mousemove="handleReflectiveMove" @mouseleave="resetReflectiveMove">Start Recording</button>
                  <button type="button" class="planned-btn planned-btn--ghost" @mousemove="handleReflectiveMove" @mouseleave="resetReflectiveMove">Stop</button>
                </div>
              </div>
            </div>
          </section>

          <section v-else-if="activeTab === 'translate'" class="planned-section-stack planned-section-stack--airy">
            <div class="planned-panel">
              <div class="planned-panel__header centered">
                <h2>The Universal Language Agent</h2>
                <p>Understanding. Translating. Delivering.</p>
              </div>

              <div class="planned-workflow-grid">
                <article v-for="item in workflowSteps" :key="item.step" class="planned-workflow-card">
                  <div class="planned-workflow-card__step">{{ item.step }}</div>
                  <h3>{{ item.title }}</h3>
                </article>
              </div>

              <div class="planned-download-row">
                <button type="button" class="planned-btn planned-btn--soft" @mousemove="handleReflectiveMove" @mouseleave="resetReflectiveMove">Upload or Record</button>
                <button type="button" class="planned-btn planned-btn--soft" @mousemove="handleReflectiveMove" @mouseleave="resetReflectiveMove">Instant Translation</button>
                <button type="button" class="planned-btn planned-btn--soft" @mousemove="handleReflectiveMove" @mouseleave="resetReflectiveMove">Download or Save</button>
              </div>

              <div class="planned-footnote">
                <p>High Accuracy &amp; Confidence</p>
                <span>Powered by Whisper, GPT-style translation, and Supabase-ready frontend regions</span>
              </div>
            </div>
          </section>

          <section v-else-if="activeTab === 'history'" class="planned-section-stack planned-section-stack--airy">
            <div class="planned-panel">
              <div class="planned-panel__header">
                <h2>Session History</h2>
                <p>Card layout for past sessions, exports, and quick reopen actions.</p>
              </div>

              <div class="planned-history-list">
                <article v-for="item in historyItems" :key="`${item.date}-${item.source}`" class="planned-history-card">
                  <div>
                    <p class="planned-history-card__date">{{ item.date }}</p>
                    <h3>{{ item.source }} to {{ item.target }}</h3>
                  </div>
                  <span class="planned-history-card__status">{{ item.status }}</span>
                </article>
              </div>
            </div>
          </section>

          <section v-else class="planned-section-stack planned-section-stack--airy">
            <div class="planned-about-grid">
              <div class="planned-panel">
                <div class="planned-panel__header centered">
                  <h2>Contact Us</h2>
                  <p>Frontend-only contact layout matching the planned style.</p>
                </div>

                <form class="planned-form" @submit.prevent>
                  <input type="text" placeholder="Your Name" />
                  <input type="email" placeholder="Your Email" />
                  <textarea rows="5" placeholder="Your Message"></textarea>
                  <button type="submit" class="planned-btn planned-btn--primary" @mousemove="handleReflectiveMove" @mouseleave="resetReflectiveMove">Send Message</button>
                </form>
              </div>

              <div class="planned-panel">
                <div class="planned-panel__header">
                  <h2>Connect With Us</h2>
                  <p>Reserved for links, design notes, and supporting app information.</p>
                </div>

                <div class="planned-link-list">
                  <a href="#" @click.prevent>GitHub</a>
                  <a href="#" @click.prevent>Twitter</a>
                  <a href="#" @click.prevent>Support Email</a>
                </div>

                <div class="planned-tag-cloud">
                  <span>Vision &amp; Philosophy</span>
                  <span>Technology Stack</span>
                  <span>Design Principles</span>
                  <span>Credits</span>
                </div>
              </div>
            </div>
          </section>
        </section>
      </div>
    </main>
  </div>
</template>

<style scoped>
.planned-ui {
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(circle at top, rgba(112, 99, 255, 0.12), transparent 30%),
    radial-gradient(circle at 20% 20%, rgba(248, 183, 94, 0.08), transparent 25%),
    linear-gradient(180deg, #08070d 0%, #0f0c18 45%, #07070c 100%);
}

.planned-ui__bg,
.planned-ui__glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.planned-ui__bg {
  opacity: 0.22;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
  background-size: 42px 42px;
  mask-image: radial-gradient(circle at center, black 50%, transparent 95%);
}

.planned-ui__glow--left {
  background: radial-gradient(circle at 15% 40%, rgba(111, 210, 255, 0.14), transparent 25%);
}

.planned-ui__glow--right {
  background: radial-gradient(circle at 85% 25%, rgba(255, 193, 117, 0.12), transparent 22%);
}

.planned-shell {
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(11, 10, 19, 0.78);
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(22px);
  border-radius: 28px;
  overflow: hidden;
}

.planned-section-stack {
  display: grid;
  gap: 2rem;
  padding-bottom: 2rem;
}

.planned-section-stack--airy {
  gap: 2.4rem;
}

.planned-topbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01));
}

.planned-brand {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.planned-brand__text {
  display: flex;
  flex-direction: column;
}

.planned-brand__mark {
  display: grid;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 14px;
  color: #f8d39b;
  background: linear-gradient(135deg, rgba(142, 121, 255, 0.18), rgba(245, 181, 116, 0.18));
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.planned-brand__name {
  position: relative;
  display: inline-flex;
  align-items: baseline;
  gap: 0.08em;
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  line-height: 1;
}

.planned-brand__name::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -0.32rem;
  height: 1px;
  background: linear-gradient(90deg, rgba(124, 212, 255, 0.12), rgba(249, 206, 142, 0.85), rgba(124, 212, 255, 0.12));
}

.planned-brand__lang {
  color: #f8f4ff;
  text-shadow: 0 0 22px rgba(124, 212, 255, 0.18);
}

.planned-brand__ify {
  color: #f5c98f;
  transform: skewX(-10deg);
  text-shadow: 0 0 22px rgba(245, 201, 143, 0.28);
}

.planned-brand__sub {
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.45);
  margin-top: 0.55rem;
}

.planned-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.planned-nav__item {
  position: relative;
  overflow: hidden;
  border: 1px solid transparent;
  border-radius: 999px;
  padding: 0.65rem 0.9rem;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.56);
  background: transparent;
  transition: 0.25s ease;
}

.planned-nav__item::before,
.planned-btn::before {
  content: '';
  position: absolute;
  inset: 1px;
  border-radius: inherit;
  background:
    radial-gradient(circle at var(--mx, 50%) var(--my, 50%), rgba(249, 222, 178, 0.28), transparent 34%),
    linear-gradient(120deg, rgba(130, 213, 255, 0.14), rgba(255, 255, 255, 0.03), rgba(245, 188, 123, 0.16));
  opacity: 0;
  transition: opacity 0.25s ease;
  pointer-events: none;
}

.planned-nav__item:hover,
.planned-nav__item--active {
  color: #fff;
  border-color: rgba(255, 255, 255, 0.12);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.09), rgba(255, 255, 255, 0.03));
  box-shadow: inset 0 0 20px rgba(255, 255, 255, 0.02);
}

.planned-nav__item:hover::before,
.planned-nav__item--active::before,
.planned-btn:hover::before {
  opacity: 1;
}

.planned-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.planned-current-tab {
  padding: 0.55rem 0.85rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.09);
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.72);
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.planned-hero,
.planned-panel,
.planned-language-strip,
.planned-about-grid {
  margin: 0 1.75rem;
}

.planned-hero,
.planned-panel {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 24px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.015)),
    radial-gradient(circle at center, rgba(255, 191, 128, 0.06), transparent 50%);
}

.planned-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.12fr) minmax(360px, 0.88fr);
  gap: 2.75rem;
  padding: 2.8rem 2.6rem;
}

.planned-kicker {
  color: #f4d2ae;
  font-size: 0.85rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  margin-bottom: 0.9rem;
}

.planned-hero h1,
.planned-panel h2 {
  font-size: clamp(1.9rem, 3vw, 3rem);
  line-height: 1.08;
  font-weight: 700;
}

.planned-panel h2 {
  font-size: clamp(1.5rem, 2vw, 2rem);
}

.planned-copy,
.planned-panel p {
  color: rgba(255, 255, 255, 0.62);
  line-height: 1.7;
}

.planned-panel__header p {
  max-width: 64ch;
  margin: 0 auto;
  font-size: 1rem;
}

.planned-hero__copy {
  max-width: 780px;
}

.planned-hero__copy .planned-copy {
  max-width: 60ch;
  font-size: 1.08rem;
}

.planned-hero__actions,
.planned-download-row,
.planned-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.9rem;
}

.planned-hero__actions {
  margin-top: 2.2rem;
}

.planned-btn {
  position: relative;
  overflow: hidden;
  border-radius: 999px;
  padding: 0.85rem 1.2rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  font-size: 0.78rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  transition: 0.25s ease;
}

.planned-btn:hover {
  transform: translateY(-1px);
}

.planned-btn--primary {
  color: #fff;
  background: linear-gradient(135deg, rgba(110, 177, 255, 0.35), rgba(242, 176, 104, 0.28));
  box-shadow: 0 16px 30px rgba(72, 105, 201, 0.18);
}

.planned-btn--ghost,
.planned-btn--soft {
  color: rgba(255, 255, 255, 0.82);
  background: rgba(255, 255, 255, 0.04);
}

.planned-btn::after,
.planned-nav__item::after {
  content: '';
  position: absolute;
  top: -120%;
  left: -30%;
  width: 40%;
  height: 320%;
  transform: rotate(20deg) translateX(-180%);
  background: linear-gradient(180deg, transparent, rgba(255, 255, 255, 0.22), transparent);
  transition: transform 0.55s ease;
  pointer-events: none;
}

.planned-btn:hover::after,
.planned-nav__item:hover::after {
  transform: rotate(20deg) translateX(420%);
}

.planned-hero__signal {
  display: grid;
  align-content: center;
  gap: 1.4rem;
  min-height: 320px;
  padding: 2rem 1.8rem;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.planned-wave {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 0.45rem;
  min-height: 120px;
}

.planned-wave span {
  width: 8px;
  border-radius: 999px;
  background: linear-gradient(180deg, #f7dfb3, #7cd4ff);
  animation: planned-wave 1.6s ease-in-out infinite;
}

.planned-wave span:nth-child(odd) {
  height: 38px;
}

.planned-wave span:nth-child(even) {
  height: 72px;
}

.planned-wave--compact {
  min-height: 80px;
}

.planned-hero__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.planned-hero__meta span,
.planned-language-strip span,
.planned-chip,
.planned-tag-cloud span,
.planned-history-card__status {
  padding: 0.45rem 0.75rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.75);
}

.planned-panel {
  padding: 2.2rem 1.7rem 1.8rem;
}

.planned-panel--wide {
  padding: 2.4rem 1.8rem 2rem;
}

.planned-panel__header {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  margin-bottom: 1.6rem;
}

.centered,
.centered-panel {
  text-align: center;
}

.planned-feature-grid,
.planned-process-grid,
.planned-workflow-grid,
.planned-about-grid {
  display: grid;
  gap: 1.35rem;
}

.planned-feature-grid,
.planned-process-grid,
.planned-workflow-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.planned-card,
.planned-process-card,
.planned-workflow-card,
.planned-history-card {
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.035);
  border-radius: 20px;
  padding: 1.45rem;
}

.planned-card__icon,
.planned-workflow-card__step {
  display: inline-grid;
  place-items: center;
  width: 2.4rem;
  height: 2.4rem;
  margin-bottom: 0.8rem;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(124, 212, 255, 0.2), rgba(255, 202, 132, 0.18));
  color: #f8deb9;
}

.planned-card h3,
.planned-process-card h3,
.planned-workflow-card h3,
.planned-history-card h3 {
  font-size: 1.05rem;
  font-weight: 600;
  line-height: 1.45;
  margin-bottom: 0.4rem;
}

.planned-card p,
.planned-process-card p,
.planned-history-card p {
  font-size: 0.98rem;
  line-height: 1.65;
}

.planned-process-card {
  text-align: center;
  padding: 1.55rem 1.35rem 1.45rem;
}

.planned-process-card__visual {
  height: 162px;
  margin-bottom: 1.35rem;
  border-radius: 18px;
  background:
    radial-gradient(circle at center, rgba(255, 195, 120, 0.2), transparent 45%),
    linear-gradient(135deg, rgba(108, 139, 255, 0.18), rgba(255, 255, 255, 0.04));
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.planned-language-strip,
.planned-download-row,
.planned-footnote,
.planned-recorder__actions,
.planned-link-list,
.planned-tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
}

.planned-download-row {
  justify-content: center;
  margin-top: 1.6rem;
}

.planned-dropzone,
.planned-recorder {
  padding: 2.5rem 2.4rem;
  border: 1px dashed rgba(255, 255, 255, 0.14);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.025);
}

.planned-dropzone {
  display: grid;
  justify-items: start;
  gap: 1.2rem;
  min-height: 180px;
}

.planned-dropzone p {
  max-width: 42ch;
  font-size: 1.05rem;
}

.planned-dropzone span {
  color: #f4c488;
}

.planned-recorder {
  display: grid;
  gap: 1.6rem;
  justify-items: center;
  min-height: 420px;
}

.planned-recorder__orb {
  width: 110px;
  height: 110px;
  border-radius: 999px;
  background: radial-gradient(circle at 30% 30%, rgba(255, 225, 179, 0.65), rgba(106, 157, 255, 0.16));
  box-shadow: 0 0 0 12px rgba(255, 255, 255, 0.03), 0 0 80px rgba(115, 179, 255, 0.16);
}

.planned-footnote {
  justify-content: center;
  margin-top: 1.8rem;
  color: rgba(255, 255, 255, 0.55);
}

.planned-footnote p {
  width: 100%;
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.84);
}

.planned-history-list {
  display: grid;
  gap: 1rem;
}

.planned-history-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.4rem 1.5rem;
}

.planned-history-card__date {
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.4);
  margin-bottom: 0.4rem;
}

.planned-about-grid {
  grid-template-columns: 1.4fr 0.8fr;
}

.planned-form {
  display: grid;
  gap: 1rem;
}

.planned-form input,
.planned-form textarea {
  width: 100%;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  padding: 0.95rem 1rem;
  color: white;
}

.planned-link-list {
  flex-direction: column;
  margin-bottom: 1rem;
}

.planned-link-list a {
  color: rgba(255, 255, 255, 0.75);
  text-decoration: none;
}

@keyframes planned-wave {
  0%, 100% {
    transform: scaleY(0.45);
    opacity: 0.45;
  }
  50% {
    transform: scaleY(1);
    opacity: 1;
  }
}

@media (max-width: 1024px) {
  .planned-hero,
  .planned-feature-grid,
  .planned-process-grid,
  .planned-workflow-grid,
  .planned-about-grid {
    grid-template-columns: 1fr;
  }

  .planned-hero {
    gap: 2rem;
  }
}

@media (max-width: 768px) {
  .planned-topbar,
  .planned-actions {
    flex-direction: column;
    align-items: flex-start;
  }

  .planned-actions,
  .planned-nav {
    width: 100%;
  }

  .planned-actions {
    justify-content: flex-start;
  }

  .planned-hero,
  .planned-panel,
  .planned-language-strip,
  .planned-about-grid {
    margin: 0 1rem;
  }

  .planned-hero {
    padding: 1.5rem 1.2rem;
  }

  .planned-panel,
  .planned-panel--wide,
  .planned-dropzone,
  .planned-recorder {
    padding-left: 1.15rem;
    padding-right: 1.15rem;
  }

  .planned-section-stack,
  .planned-section-stack--airy {
    gap: 1.35rem;
    padding-bottom: 1.35rem;
  }

  .planned-history-card {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
