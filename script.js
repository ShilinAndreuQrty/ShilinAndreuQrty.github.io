document.documentElement.classList.add('js');

const menuToggle = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
const header = document.querySelector('.site-header');

function updateHeaderOffset() {
  document.documentElement.style.setProperty('--anchor-offset', `${header.getBoundingClientRect().bottom + 24}px`);
}
new ResizeObserver(updateHeaderOffset).observe(header);
updateHeaderOffset();
menuToggle.hidden = false;

function closeMenu() {
  navigation.classList.remove('is-open');
  menuToggle.setAttribute('aria-expanded', 'false');
  updateHeaderOffset();
}

menuToggle.addEventListener('click', () => {
  const open = menuToggle.getAttribute('aria-expanded') !== 'true';
  navigation.classList.toggle('is-open', open);
  menuToggle.setAttribute('aria-expanded', String(open));
});
navigation.addEventListener('click', (event) => {
  if (event.target.closest('a')) closeMenu();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') {
    closeMenu();
    menuToggle.focus();
  }
});
document.addEventListener('click', (event) => {
  if (!event.target.closest('.site-header')) closeMenu();
});
window.matchMedia('(max-width: 900px)').addEventListener('change', closeMenu);

const video = document.querySelector('#hero-video');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let playbackRequested = !reducedMotion.matches && !navigator.connection?.saveData;
let videoVisible = true;
video.controls = false;

function showVideoFallback() {
  if (!video.isConnected) return;
  const poster = document.createElement('img');
  poster.className = 'hero-video-fallback';
  poster.src = video.poster;
  poster.alt = 'Андрей Шилин с ноутбуком';
  poster.width = 560;
  poster.height = 720;
  video.replaceWith(poster);
}
video.addEventListener('error', showVideoFallback, true);
if (video.error || video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) showVideoFallback();

function syncPlayback() {
  if (!video.isConnected) return;
  if (playbackRequested && videoVisible && !document.hidden) {
    video.play().catch(() => { /* Keep the poster if autoplay is blocked. */ });
  } else {
    video.pause();
  }
}

reducedMotion.addEventListener('change', () => {
  playbackRequested = !reducedMotion.matches && !navigator.connection?.saveData;
  syncPlayback();
});
document.addEventListener('visibilitychange', syncPlayback);
if ('IntersectionObserver' in window) {
  new IntersectionObserver(([entry]) => {
    videoVisible = entry.isIntersecting;
    syncPlayback();
  }, { threshold: 0.1 }).observe(video);
}
syncPlayback();

// A native scroll-snap carousel: touch scrolling works even without JavaScript.
const track = document.querySelector('#app-screens');
const slides = [...track.querySelectorAll('.app-slide')];
const dots = [...document.querySelectorAll('[data-slide]')];
const status = document.querySelector('#carousel-status');
let currentSlide = 0;
let requestedSlide = 0;
let scrollSettled;
let scrollFrame = 0;
document.querySelector('.carousel-controls').hidden = false;
status.hidden = false;

function updateCarousel(index) {
  currentSlide = Math.max(0, Math.min(slides.length - 1, index));
  dots.forEach((dot, i) => dot.setAttribute('aria-pressed', String(i === currentSlide)));
  status.textContent = `${String(currentSlide + 1).padStart(2, '0')} / 03 · ${slides[currentSlide].dataset.title}`;
}

function goToSlide(index) {
  const next = (index + slides.length) % slides.length;
  requestedSlide = next;
  clearTimeout(scrollSettled);
  // Update first, so rapid clicks advance from the requested slide.
  updateCarousel(next);
  track.scrollTo({ left: next * track.clientWidth, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
}

document.querySelector('#slide-prev').addEventListener('click', () => goToSlide(requestedSlide - 1));
document.querySelector('#slide-next').addEventListener('click', () => goToSlide(requestedSlide + 1));
dots.forEach(dot => dot.addEventListener('click', () => goToSlide(Number(dot.dataset.slide))));
track.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    goToSlide(requestedSlide + (event.key === 'ArrowLeft' ? -1 : 1));
  }
});
track.addEventListener('scroll', () => {
  clearTimeout(scrollSettled);
  scrollSettled = setTimeout(() => { requestedSlide = currentSlide; }, 150);
  if (scrollFrame) return;
  scrollFrame = requestAnimationFrame(() => {
    updateCarousel(Math.round(track.scrollLeft / track.clientWidth));
    scrollFrame = 0;
  });
}, { passive: true });
new ResizeObserver(() => {
  track.scrollTo({ left: currentSlide * track.clientWidth, behavior: 'instant' });
}).observe(track);

// Reflect the section currently being read in the fixed navigation.
const navLinks = [...navigation.querySelectorAll('a')];
const navSections = navLinks.map(link => document.querySelector(link.getAttribute('href')));
let navigationFrame = 0;
function updateCurrentSection() {
  const threshold = header.getBoundingClientRect().bottom + 100;
  let active = null;
  navSections.forEach(section => {
    if (section.getBoundingClientRect().top <= threshold) active = section.id;
  });
  if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4) {
    active = navSections.at(-1).id;
  }
  navLinks.forEach(link => {
    if (link.getAttribute('href') === `#${active}`) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  navigationFrame = 0;
}
window.addEventListener('scroll', () => {
  if (!navigationFrame) navigationFrame = requestAnimationFrame(updateCurrentSection);
}, { passive: true });
updateCurrentSection();
