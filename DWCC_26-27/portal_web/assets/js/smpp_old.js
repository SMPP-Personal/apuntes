/**
 * DWCC - Funcionalidades de Interfaz Comunes
 * Gestiona el Modo Oscuro y la Sincronización Dinámica de los Badges de navegación.
 */

document.addEventListener('DOMContentLoaded', () => {
    initThemeManager();
    initScrollSpy();
});

/**
 * 1. GESTIÓN DE TEMA (CLARO / OSCURO)
 */
function initThemeManager() {
    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) return;

    // Verificar si ya existe una preferencia guardada en localStorage
    const savedTheme = localStorage.getItem('theme');
    
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
    }

    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        
        // Guardar el estado actual en LocalStorage para persistencia
        if (document.body.classList.contains('dark-theme')) {
            localStorage.setItem('theme', 'dark');
        } else {
            localStorage.setItem('theme', 'light');
        }
    });
}

/**
 * 2. SCROLL SPY PARA LOS RECUADROS DE BADGES
 * Ilumina dinámicamente el badge de la sección que el usuario está leyendo.
 */
function initScrollSpy() {
    const sections = document.querySelectorAll('.content-section');
    const badgeLinks = document.querySelectorAll('.badge-link');
    
    if (sections.length === 0 || badgeLinks.length === 0) return;

    window.addEventListener('scroll', () => {
        let currentSectionId = '';
        const scrollPosition = window.scrollY + 120; // Compensación por la altura del header

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            
            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                currentSectionId = section.getAttribute('id');
            }
        });

        // Aplicar o quitar la clase 'active' al badge correspondiente
        badgeLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${currentSectionId}`) {
                link.classList.add('active');
            }
        });
    });
}