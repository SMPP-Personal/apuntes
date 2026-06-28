/**
 * DWCC - Funcionalidades de interfaz comunes.
 *
 * Incluye:
 * - Gestión robusta del modo claro/oscuro con localStorage.
 * - Compatibilidad con dark-theme y dark-mode.
 * - Navegación interna activa para índices laterales y badges antiguos.
 * - Fallback para navegadores sin IntersectionObserver.
 */

(() => {
  'use strict';

  const THEME_STORAGE_KEY = 'theme';
  const DARK_CLASS = 'dark-theme';
  const LEGACY_DARK_CLASS = 'dark-mode';
  const ACTIVE_CLASS = 'active';

  document.addEventListener('DOMContentLoaded', () => {
    initThemeManager();
    initInternalNavigation();
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
      // localStorage puede estar bloqueado; la interfaz no debe romperse.
    }
  }

  function applyTheme(theme) {
    const isDark = theme === 'dark';
    document.body.classList.toggle(DARK_CLASS, isDark);
    document.body.classList.toggle(LEGACY_DARK_CLASS, isDark);
    return isDark;
  }

  function updateThemeToggleState(themeToggle, isDark) {
    if (!themeToggle) return;

    themeToggle.setAttribute('aria-pressed', String(isDark));
    themeToggle.setAttribute('aria-label', isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
    themeToggle.setAttribute('title', isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');

    if (themeToggle.dataset.updateText === 'true') {
      themeToggle.textContent = isDark ? '☀️ Modo claro' : '🌙 Modo oscuro';
    }
  }

  function initThemeManager() {
    const savedTheme = safeGetStorage(THEME_STORAGE_KEY);
    const themeToggle = document.getElementById('theme-toggle');

    let isDark = document.body.classList.contains(DARK_CLASS)
      || document.body.classList.contains(LEGACY_DARK_CLASS);

    if (savedTheme === 'dark' || savedTheme === 'light') {
      isDark = applyTheme(savedTheme);
    } else if (isDark) {
      applyTheme('dark');
    }

    updateThemeToggleState(themeToggle, isDark);

    if (!themeToggle) return;

    themeToggle.addEventListener('click', () => {
      const nextTheme = document.body.classList.contains(DARK_CLASS) ? 'light' : 'dark';
      const nextIsDark = applyTheme(nextTheme);
      safeSetStorage(THEME_STORAGE_KEY, nextTheme);
      updateThemeToggleState(themeToggle, nextIsDark);
    });
  }

  function setActiveNavigationLink(sectionId, navLinks) {
    if (!sectionId) return;

    navLinks.forEach((link) => {
      const isActive = link.getAttribute('href') === `#${sectionId}`;
      link.classList.toggle(ACTIVE_CLASS, isActive);

      if (isActive) {
        link.setAttribute('aria-current', 'true');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  function getCurrentSectionByScroll(sections) {
    const offset = 130;
    const scrollPosition = window.scrollY + offset;
    let currentSectionId = sections[0]?.id || '';

    sections.forEach((section) => {
      if (scrollPosition >= section.offsetTop) {
        currentSectionId = section.id;
      }
    });

    return currentSectionId;
  }

  function initNavigationFallback(sections, navLinks) {
    let ticking = false;

    const update = () => {
      const currentSectionId = getCurrentSectionByScroll(sections);
      setActiveNavigationLink(currentSectionId, navLinks);
      ticking = false;
    };

    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });

    update();
  }

  function initInternalNavigation() {
    const sections = Array.from(document.querySelectorAll('.content-section[id]'));
    const navLinks = Array.from(document.querySelectorAll('.section-nav-link[href^="#"], .badge-link[href^="#"]'));

    if (sections.length === 0 || navLinks.length === 0) return;

    const initialId = window.location.hash ? window.location.hash.slice(1) : sections[0].id;
    setActiveNavigationLink(initialId, navLinks);

    navLinks.forEach((link) => {
      link.addEventListener('click', () => {
        const targetId = link.getAttribute('href')?.slice(1);
        setActiveNavigationLink(targetId, navLinks);
      });
    });

    if (!('IntersectionObserver' in window)) {
      initNavigationFallback(sections, navLinks);
      return;
    }

    const visibleSections = new Map();

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          visibleSections.set(entry.target.id, entry.intersectionRatio);
        } else {
          visibleSections.delete(entry.target.id);
        }
      });

      if (visibleSections.size === 0) {
        const currentSectionId = getCurrentSectionByScroll(sections);
        setActiveNavigationLink(currentSectionId, navLinks);
        return;
      }

      const mostVisibleSectionId = Array.from(visibleSections.entries())
        .sort((a, b) => b[1] - a[1])[0][0];

      setActiveNavigationLink(mostVisibleSectionId, navLinks);
    }, {
      root: null,
      rootMargin: '-18% 0px -66% 0px',
      threshold: [0.1, 0.25, 0.5, 0.75]
    });

    sections.forEach((section) => observer.observe(section));
  }
})();
