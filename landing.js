import './site.js';

const revealElements = document.querySelectorAll('.lp-body [data-reveal]');

if (revealElements.length && 'IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.classList.add('lp-has-motion');

    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('lp-visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.08, rootMargin: '0px 0px 40px 0px' });

    revealElements.forEach(element => revealObserver.observe(element));
}

document.querySelectorAll('.lp-mobile-menu nav a').forEach(link => {
    link.addEventListener('click', () => {
        link.closest('details').open = false;
    });
});
