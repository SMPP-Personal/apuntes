/**
 * DWCC · Portal del módulo · Curso 26/27
 * Funcionalidades no críticas: tema, efecto de escritura, abrir/cerrar unidades.
 * La navegación principal funciona aunque JavaScript no cargue.
 */
(() => {
  'use strict';

  const STORAGE_KEY = 'dwcc-portal-theme';
  const root = document.documentElement;

  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initTypewriter();
    initDetailsControls();
    initNavHighlight();
  });

  function safeGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function safeSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      // El portal debe seguir funcionando aunque localStorage esté bloqueado.
    }
  }

  function applyTheme(theme) {
    const finalTheme = theme === 'light' ? 'light' : 'dark';
    root.dataset.theme = finalTheme;
    updateThemeButton(finalTheme);
  }

  function updateThemeButton(theme) {
    const button = document.getElementById('theme-toggle');
    if (!button) return;

    const isDark = theme === 'dark';
    button.setAttribute('aria-pressed', String(isDark));
    button.setAttribute('aria-label', isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro');

    const text = button.querySelector('.theme-toggle__text');
    const icon = button.querySelector('.theme-toggle__icon');

    if (text) text.textContent = isDark ? 'Tema claro' : 'Tema oscuro';
    if (icon) icon.textContent = isDark ? '☀' : '☾';
  }

  function initTheme() {
    const saved = safeGet(STORAGE_KEY);
    const prefersLight = window.matchMedia?.('(prefers-color-scheme: light)').matches;
    const initialTheme = saved || (prefersLight ? 'light' : 'dark');

    applyTheme(initialTheme);

    const button = document.getElementById('theme-toggle');
    if (!button) return;

    button.addEventListener('click', () => {
      const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      safeSet(STORAGE_KEY, next);
    });
  }

  function initTypewriter() {
    const element = document.getElementById('hero-typewriter');
    if (!element) return;

    const text = element.dataset.text || '';
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (reducedMotion) {
      element.textContent = text;
      return;
    }

    let index = 0;
    const step = () => {
      element.textContent = text.slice(0, index);
      index += 1;

      if (index <= text.length) {
        window.setTimeout(step, index < 22 ? 18 : 11);
      }
    };

    step();
  }

  function initDetailsControls() {
    const units = Array.from(document.querySelectorAll('.unit-card'));
    const expandAll = document.querySelector('[data-expand-all]');
    const collapseAll = document.querySelector('[data-collapse-all]');

    if (expandAll) {
      expandAll.addEventListener('click', () => {
        units.forEach((unit) => unit.setAttribute('open', ''));
      });
    }

    if (collapseAll) {
      collapseAll.addEventListener('click', () => {
        units.forEach((unit) => unit.removeAttribute('open'));
      });
    }
  }

  function initNavHighlight() {
    const sections = Array.from(document.querySelectorAll('main section[id]'));
    const links = Array.from(document.querySelectorAll('.main-nav a[href^="#"]'));

    if (sections.length === 0 || links.length === 0) return;

    const setActive = (id) => {
      links.forEach((link) => {
        const active = link.getAttribute('href') === `#${id}`;
        link.classList.toggle('is-active', active);
        if (active) {
          link.setAttribute('aria-current', 'true');
        } else {
          link.removeAttribute('aria-current');
        }
      });
    };

    if (!('IntersectionObserver' in window)) {
      let ticking = false;
      window.addEventListener('scroll', () => {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(() => {
          const current = sections
            .filter((section) => window.scrollY + 160 >= section.offsetTop)
            .at(-1);
          if (current) setActive(current.id);
          ticking = false;
        });
      }, { passive: true });
      return;
    }

    const visible = new Map();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          visible.set(entry.target.id, entry.intersectionRatio);
        } else {
          visible.delete(entry.target.id);
        }
      });

      if (visible.size === 0) return;

      const [id] = Array.from(visible.entries()).sort((a, b) => b[1] - a[1])[0];
      setActive(id);
    }, {
      root: null,
      rootMargin: '-20% 0px -65% 0px',
      threshold: [0.1, 0.25, 0.5, 0.75]
    });

    sections.forEach((section) => observer.observe(section));
  }
})();
