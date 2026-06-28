/**
 * IMSO · Portal de apuntes
 * Funcionalidades comunes del index del módulo.
 * - Modo claro/oscuro funcional ✅
 * - Guarda preferencia en localStorage ✅
 * - Scroll suave ✅
 */

(() => {
  'use strict';

  const STORAGE_KEYS = ['imso-theme', 'portal-imso-theme', 'silvia-theme', 'theme'];
  const DEFAULT_THEME = 'dark';

  document.addEventListener('DOMContentLoaded', () => {
    initThemeToggle();
    initSmoothScroll();
  });

  // =========================
  // LOCAL STORAGE
  // =========================
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
      // Si está bloqueado, ignoramos
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

  // =========================
  // DETECTAR / APLICAR TEMA
  // =========================
  function detectInitialTheme() {
    const savedTheme = getSavedTheme();
    if (savedTheme) return savedTheme;

    // fallback: preferencia del sistema
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    return prefersLight ? 'light' : DEFAULT_THEME;
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);

    // Guarda en varias keys (compatibilidad con tus versiones anteriores)
    STORAGE_KEYS.forEach(key => safeSetStorage(key, theme));
  }

  function updateThemeButton(theme) {
    const button = document.getElementById('theme-toggle');
    if (!button) return;

    if (theme === 'dark') {
      button.textContent = '🌞 Tema claro';
    } else {
      button.textContent = '🌙 Tema oscuro';
    }
  }

  // =========================
  // TOGGLE
  // =========================
  function initThemeToggle() {
    const button = document.getElementById('theme-toggle');
    if (!button) return;

    let currentTheme = detectInitialTheme();

    applyTheme(currentTheme);
    updateThemeButton(currentTheme);

    button.addEventListener('click', () => {
      currentTheme = (currentTheme === 'dark') ? 'light' : 'dark';
      applyTheme(currentTheme);
      updateThemeButton(currentTheme);
    });
  }

  // =========================
  // SCROLL SUAVE
  // =========================
  function initSmoothScroll() {
    const links = document.querySelectorAll('a.js-scroll[href^="#"]');

    links.forEach(link => {
      link.addEventListener('click', (event) => {
        const targetId = link.getAttribute('href');
        const target = document.querySelector(targetId);

        if (target) {
          event.preventDefault();
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      });
    });
  }

})();
