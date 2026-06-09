/* =============================================================
   IMSO · JavaScript común para apuntes e prácticas
   -------------------------------------------------------------
   Funcións incluídas:
   - Cambio de tema claro/escuro con persistencia en localStorage.
   - Compatibilidade co botón existente: onclick="toggleTheme()".
   - Actualización automática da icona #theme-icon.
   - Botóns de copiar en bloques <pre><code>...</code></pre>.
   - Marcado automático da sección activa no índice lateral.
   - Melloras menores de accesibilidade e ligazóns externas.
   ============================================================= */

(function () {
  'use strict';

  const THEME_STORAGE_KEY = 'imso-theme';
  const DARK_THEME = 'dark';
  const LIGHT_THEME = 'light';

  function safeLocalStorageGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function safeLocalStorageSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      // Se o navegador ou Moodle bloquea localStorage, simplemente non persistimos.
    }
  }

  function getCurrentTheme() {
    return document.documentElement.getAttribute('data-bs-theme') || LIGHT_THEME;
  }

  function getPreferredTheme() {
    const storedTheme = safeLocalStorageGet(THEME_STORAGE_KEY);
    if (storedTheme === DARK_THEME || storedTheme === LIGHT_THEME) {
      return storedTheme;
    }

    const htmlTheme = getCurrentTheme();
    if (htmlTheme === DARK_THEME || htmlTheme === LIGHT_THEME) {
      return htmlTheme;
    }

    return LIGHT_THEME;
  }

  function updateThemeIcon(theme) {
    const iconClass = theme === DARK_THEME ? 'bi bi-sun-fill' : 'bi bi-moon-stars';
    const label = theme === DARK_THEME ? 'Cambiar a tema claro' : 'Cambiar a tema escuro';

    document.querySelectorAll('#theme-icon, [data-theme-icon]').forEach((icon) => {
      icon.className = iconClass;
    });

    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      button.setAttribute('aria-label', label);
      button.setAttribute('title', label);
    });

    document.querySelectorAll('button[onclick*="toggleTheme"]').forEach((button) => {
      button.setAttribute('aria-label', label);
      button.setAttribute('title', label);
    });
  }

  function setTheme(theme, persist) {
    const normalizedTheme = theme === DARK_THEME ? DARK_THEME : LIGHT_THEME;
    document.documentElement.setAttribute('data-bs-theme', normalizedTheme);
    updateThemeIcon(normalizedTheme);

    if (persist) {
      safeLocalStorageSet(THEME_STORAGE_KEY, normalizedTheme);
    }
  }

  // Mantemos esta función en global porque os HTML xa xerados usan onclick="toggleTheme()".
  window.toggleTheme = function toggleTheme() {
    const nextTheme = getCurrentTheme() === DARK_THEME ? LIGHT_THEME : DARK_THEME;
    setTheme(nextTheme, true);
  };

  function initTheme() {
    setTheme(getPreferredTheme(), false);

    // Para páxinas futuras sen onclick inline: <button data-theme-toggle>...</button>
    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      if (button.hasAttribute('onclick')) return;
      button.addEventListener('click', window.toggleTheme);
    });
  }

  function getCodeText(pre) {
    const code = pre.querySelector('code');
    return (code ? code.innerText : pre.innerText).trim();
  }

  function initCopyButtons() {
    const preBlocks = document.querySelectorAll('pre');

    preBlocks.forEach((pre) => {
      if (pre.classList.contains('no-copy')) return;
      if (pre.querySelector('.btn-copy')) return;

      const text = getCodeText(pre);
      if (!text) return;

      // Se non ten clase específica, engadimos unha clase común para que o CSS poida aplicarse.
      if (!pre.classList.contains('block-code') && !pre.classList.contains('cmd-pre') && !pre.classList.contains('cmd-block')) {
        pre.classList.add('block-code');
      }

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn btn-sm btn-outline-light btn-copy no-print';
      button.innerHTML = '<i class="bi bi-clipboard"></i><span class="visually-hidden">Copiar código</span>';
      button.setAttribute('aria-label', 'Copiar código');
      button.setAttribute('title', 'Copiar código');

      button.addEventListener('click', async () => {
        const codeText = getCodeText(pre);

        try {
          await navigator.clipboard.writeText(codeText);
          button.innerHTML = '<i class="bi bi-check2"></i><span class="visually-hidden">Copiado</span>';
          button.setAttribute('title', 'Copiado');
          setTimeout(() => {
            button.innerHTML = '<i class="bi bi-clipboard"></i><span class="visually-hidden">Copiar código</span>';
            button.setAttribute('title', 'Copiar código');
          }, 1500);
        } catch (error) {
          button.innerHTML = '<i class="bi bi-exclamation-triangle"></i><span class="visually-hidden">Non se puido copiar</span>';
          button.setAttribute('title', 'Non se puido copiar automaticamente');
          setTimeout(() => {
            button.innerHTML = '<i class="bi bi-clipboard"></i><span class="visually-hidden">Copiar código</span>';
            button.setAttribute('title', 'Copiar código');
          }, 2000);
        }
      });

      pre.appendChild(button);
    });
  }

  function initActiveToc() {
    const tocLinks = Array.from(document.querySelectorAll('#toc a[href^="#"], .toc a[href^="#"]'));
    if (tocLinks.length === 0) return;

    const sections = tocLinks
      .map((link) => {
        const id = decodeURIComponent(link.getAttribute('href').slice(1));
        const section = document.getElementById(id);
        return section ? { link, section } : null;
      })
      .filter(Boolean);

    if (sections.length === 0) return;

    function setActiveLink(activeLink) {
      tocLinks.forEach((link) => link.classList.remove('active'));
      if (activeLink) activeLink.classList.add('active');
    }

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          const visibleEntries = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

          if (visibleEntries.length > 0) {
            const active = sections.find((item) => item.section === visibleEntries[0].target);
            if (active) setActiveLink(active.link);
          }
        },
        {
          root: null,
          rootMargin: '-20% 0px -65% 0px',
          threshold: [0.1, 0.25, 0.5, 0.75]
        }
      );

      sections.forEach((item) => observer.observe(item.section));
    } else {
      window.addEventListener('scroll', () => {
        let current = sections[0];
        sections.forEach((item) => {
          if (item.section.getBoundingClientRect().top <= 120) {
            current = item;
          }
        });
        setActiveLink(current.link);
      }, { passive: true });
    }
  }

  function initExternalLinks() {
    const currentHost = window.location.host;
    document.querySelectorAll('a[href^="http://"], a[href^="https://"]').forEach((link) => {
      try {
        const url = new URL(link.href);
        if (url.host !== currentHost) {
          link.setAttribute('target', '_blank');
          link.setAttribute('rel', 'noopener noreferrer');
        }
      } catch (error) {
        // Ligazón non válida: non facemos nada.
      }
    });
  }

  function init() {
    initTheme();
    initCopyButtons();
    initActiveToc();
    initExternalLinks();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
