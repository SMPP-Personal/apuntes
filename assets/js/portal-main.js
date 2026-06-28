(() => {
  'use strict';

  const STORAGE_KEY = 'smpp-main-portal-theme';
  const root = document.documentElement;
  const toggle = document.getElementById('theme-toggle');
  const label = toggle?.querySelector('.theme-toggle-label');
  const typewriter = document.getElementById('hero-typewriter');

  function safeGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function safeSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // El portal debe seguir funcionando aunque localStorage esté bloqueado.
    }
  }

  function applyTheme(theme) {
    const normalized = theme === 'light' ? 'light' : 'dark';
    root.setAttribute('data-theme', normalized);

    if (toggle) {
      const isLight = normalized === 'light';
      toggle.setAttribute('aria-pressed', String(isLight));
      toggle.setAttribute('aria-label', isLight ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro');
      toggle.title = isLight ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro';
    }

    if (label) {
      label.textContent = normalized === 'light' ? 'Tema oscuro' : 'Tema claro';
    }
  }

  function initTheme() {
    const saved = safeGet(STORAGE_KEY);
    const prefersLight = window.matchMedia?.('(prefers-color-scheme: light)').matches;
    const initial = saved === 'light' || saved === 'dark' ? saved : (prefersLight ? 'light' : 'dark');

    applyTheme(initial);

    if (!toggle) return;

    toggle.addEventListener('click', () => {
      const current = root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
      const next = current === 'light' ? 'dark' : 'light';
      applyTheme(next);
      safeSet(STORAGE_KEY, next);
    });
  }

  function initTypewriter() {
    if (!typewriter) return;

    const text = typewriter.dataset.text || '';
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (reducedMotion) {
      typewriter.textContent = text;
      return;
    }

    let index = 0;
    typewriter.textContent = '';

    const tick = () => {
      typewriter.textContent = text.slice(0, index);
      index += 1;

      if (index <= text.length) {
        window.setTimeout(tick, 38);
      }
    };

    window.setTimeout(tick, 450);
  }

  function initCardTilt() {
    const cards = Array.from(document.querySelectorAll('.module-card'));
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (reducedMotion) return;

    cards.forEach((card) => {
      card.addEventListener('mousemove', (event) => {
        const rect = card.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width - 0.5) * 6;
        const y = ((event.clientY - rect.top) / rect.height - 0.5) * -6;
        card.style.transform = `translateY(-7px) rotateX(${y}deg) rotateY(${x}deg)`;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initTypewriter();
    initCardTilt();
  });
})();
