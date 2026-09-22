class SeekQueue {
  constructor(video) {
    this.video = video;
    this.pending = null;
    this.seeking = false;
    this.ready = false;

    video.addEventListener("loadedmetadata", () => {
      this.ready = Number.isFinite(video.duration) && video.duration > 0;
      video.classList.toggle("ready", this.ready);
      if (this.ready && this.pending !== null) this.flush();
    });

    video.addEventListener("seeked", () => {
      this.seeking = false;
      if (this.pending !== null && Math.abs(this.video.currentTime - this.pending) > 0.015) {
        requestAnimationFrame(() => this.flush());
      }
    });

    video.addEventListener("error", () => video.classList.remove("ready"));
  }

  seek(progress) {
    if (!this.ready) return;
    const safeProgress = Math.min(1, Math.max(0, progress));
    this.pending = safeProgress * Math.max(0, this.video.duration - 0.025);
    this.flush();
  }

  flush() {
    if (!this.ready || this.seeking || this.pending === null) return;
    const next = this.pending;
    this.pending = null;
    this.seeking = true;
    try {
      if (typeof this.video.fastSeek === "function") this.video.fastSeek(next);
      else this.video.currentTime = next;
    } catch {
      this.seeking = false;
    }
  }
}

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const hero = document.querySelector(".hero");
const heroQueue = new SeekQueue(document.querySelector(".hero-video"));
const story = document.querySelector(".story");
const storyQueue = new SeekQueue(document.querySelector(".story-video"));
const directionButtons = [...document.querySelectorAll(".direction")];
const factPanels = [...document.querySelectorAll(".fact")];
const storyPages = [...document.querySelectorAll(".story-page")];

function activateView(view) {
  directionButtons.forEach((button) => {
    const active = button.dataset.view === view;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  factPanels.forEach((panel) => panel.classList.toggle("active", panel.dataset.panel === view));
}

function viewFromPosition(normalizedX) {
  if (normalizedX < -0.28) return "work";
  if (normalizedX > 0.28) return "ai";
  return "profile";
}

function handleHeroPointer(event) {
  if (prefersReducedMotion || event.pointerType === "touch") return;
  const rect = hero.getBoundingClientRect();
  const relativeX = (event.clientX - rect.left) / rect.width;
  const normalizedX = Math.min(1, Math.max(-1, (relativeX - 0.5) * 2));
  const sensitivity = 0.8;
  const scrubProgress = (normalizedX * sensitivity + 1) / 2;
  hero.style.setProperty("--look-x", normalizedX.toFixed(3));
  heroQueue.seek(scrubProgress);
  activateView(viewFromPosition(normalizedX));
}

hero.addEventListener("pointermove", handleHeroPointer, { passive: true });
directionButtons.forEach((button, index) => {
  button.addEventListener("click", () => {
    const positions = [0.1, 0.5, 0.9];
    activateView(button.dataset.view);
    heroQueue.seek(positions[index]);
  });
});

function updateStory() {
  const rect = story.getBoundingClientRect();
  const scrollable = Math.max(1, story.offsetHeight - window.innerHeight);
  const progress = Math.min(1, Math.max(0, -rect.top / scrollable));
  const step = Math.min(storyPages.length - 1, Math.floor(progress * storyPages.length));

  document.documentElement.style.setProperty("--story-progress", progress.toFixed(4));
  storyPages.forEach((page, index) => page.classList.toggle("active", index === step));
  if (!prefersReducedMotion) storyQueue.seek(progress);
}

let storyFrame = 0;
function scheduleStoryUpdate() {
  if (storyFrame) return;
  storyFrame = requestAnimationFrame(() => {
    storyFrame = 0;
    updateStory();
  });
}

window.addEventListener("scroll", scheduleStoryUpdate, { passive: true });
window.addEventListener("resize", scheduleStoryUpdate, { passive: true });

activateView("work");
storyPages[0].classList.add("active");
updateStory();
