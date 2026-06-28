/**
 * IMSO · Portal de apuntes
 * Funcionalidades comunes del index del módulo.
 *
 * - Modo claro/oscuro robusto.
 * - Compatible con :root[data-theme="light"], body.light-theme/body.dark-theme,
 *   body.light-mode/body.dark-mode.
 * - Scroll suave para enlaces internos .js-scroll.
 * - Efecto typewriter opcional para #hero-typewriter.
 */
(() => {
  'use strict';

  const STORAGE_KEYS = ['imso-theme', 'portal-imso-theme', 'silvia-theme', 'theme'];
  const DEFAULT_THEME = 'dark';

  document.addEventListener('DOMContentLoaded', () => {
    initThemeToggle();
    initSmoothScroll();
    initTypewriter();
  });

  function safeGetStorage(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function safeSetStorage(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      // localStorage puede estar bloqueado; no debe romper la interfaz.
    }
  }

  function getSavedTheme() {
    for (const key of STORAGE_KEYS) {
      const value = safeGetStorage(key);
      if (value === 'light' || value === 'dark') {
        return value;
      }
    }
    return null;
  }

  function detectInitialTheme() {
    const savedTheme = getSavedTheme();
    if (savedTheme) return savedTheme;

    const rootTheme = document.documentElement.getAttribute('data-theme');
    if (rootTheme === 'light' || rootTheme === 'dark') return rootTheme;

    if (document.body.classList.contains('light-theme') || document.body.classList.contains('light-mode')) {
      return 'light';
    }

    if (document.body.classList.contains('dark-theme') || document.body.classList.contains('dark-mode')) {
      return 'dark';
    }

    return DEFAULT_THEME;
  }

  function applyTheme(theme) {
    const isLight = theme === 'light';
    const isDark = theme === 'dark';

    document.documentElement.setAttribute('data-theme', theme);

    document.body.classList.toggle('light-theme', isLight);
    document.body.classList.toggle('light-mode', isLight);
    document.body.classList.toggle('dark-theme', isDark);
    document.body.classList.toggle('dark-mode', isDark);

    safeSetStorage('imso-theme', theme);
    safeSetStorage('portal-imso-theme', theme);

    updateThemeButton(theme);
  }

  function updateThemeButton(theme) {
    const button = document.getElementById('theme-toggle');
    if (!button) return;

    const isLight = theme === 'light';

    // El texto indica la acción disponible, no el estado actual.
    button.textContent = isLight ? 'Tema oscuro' : 'Tema claro';
    button.setAttribute('aria-pressed', String(isLight));
    button.setAttribute('aria-label', isLight ? 'Cambiar a tema oscuro' : 'Cambiar a tema claro');
    button.setAttribute('title', isLight ? 'Cambiar a tema oscuro' : 'Cambiar a tema claro');
  }

  function initThemeToggle() {
    const button = document.getElementById('theme-toggle');
    const initialTheme = detectInitialTheme();

    applyTheme(initialTheme);

    if (!button) return;

    button.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
      const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
      applyTheme(nextTheme);
    });
  }

  function initSmoothScroll() {
    const links = document.querySelectorAll('a.js-scroll[href^="#"]');

    links.forEach((link) => {
      link.addEventListener('click', (event) => {
        const targetId = link.getAttribute('href');
        if (!targetId || targetId === '#') return;

        const target = document.querySelector(targetId);
        if (!target) return;

        event.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        history.pushState(null, '', targetId);
      });
    });
  }

  function initTypewriter() {
    const element = document.getElementById('hero-typewriter');
    if (!element) return;

    const text = element.dataset.text || element.textContent || '';
    if (!text.trim()) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      element.textContent = text;
      return;
    }

    element.textContent = '';
    let index = 0;

    const write = () => {
      element.textContent = text.slice(0, index);
      index += 1;

      if (index <= text.length) {
        window.setTimeout(write, 24);
      }
    };

    write();
  }
})();
