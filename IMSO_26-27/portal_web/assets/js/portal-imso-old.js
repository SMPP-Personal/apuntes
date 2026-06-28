// assets/js/portal-imso.js

document.addEventListener("DOMContentLoaded", () => {
  setupTypewriter();
  setupCursorBlink();
  setupSmoothScroll();
  setupThemeToggle();
});

/* =========================================
   Typewriter en el hero
========================================= */

function setupTypewriter() {
  const el = document.getElementById("hero-typewriter");
  if (!el) return;

  const text = el.getAttribute("data-text") ||
    "Aprende a instalar, configurar y documentar sistemas operativos en entornos reales.";

  let index = 0;
  const baseDelay = 50;

  const write = () => {
    if (index <= text.length) {
      el.textContent = text.slice(0, index);
      index++;
      const jitter = Math.random() * 40;
      setTimeout(write, baseDelay + jitter);
    }
  };

  write();
}

/* =========================================
   Cursor parpadeante en “terminal” del hero
========================================= */

function setupCursorBlink() {
  const cursor = document.querySelector(".hero-terminal-cursor");
  if (!cursor) return;

  setInterval(() => {
    cursor.style.opacity = cursor.style.opacity === "0" ? "1" : "0";
  }, 550);
}

/* =========================================
   Scroll suave para enlaces internos
========================================= */

function setupSmoothScroll() {
  const links = document.querySelectorAll("a.js-scroll[href^='#']");
  if (!links.length) return;

  links.forEach((link) => {
    link.addEventListener("click", (event) => {
      const targetId = link.getAttribute("href").slice(1);
      const target = document.getElementById(targetId);
      if (!target) return;

      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

/* =========================================
   Toggle tema (oscuro/“claro” básico)
========================================= */

function setupThemeToggle() {
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;

  const root = document.documentElement;
  const storedTheme = localStorage.getItem("imsoTheme");

  if (storedTheme === "light") {
    root.setAttribute("data-theme", "light");
    btn.textContent = "Tema oscuro";
  } else {
    root.setAttribute("data-theme", "dark");
    btn.textContent = "Tema claro";
  }

  btn.addEventListener("click", () => {
    const current = root.getAttribute("data-theme") || "dark";
    const next = current === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    localStorage.setItem("imsoTheme", next);
    btn.textContent = next === "dark" ? "Tema claro" : "Tema oscuro";
  });
}