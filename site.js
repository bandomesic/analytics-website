import { demoUrl } from './config.js';

const demo = new URL(demoUrl);
if (!['http:', 'https:'].includes(demo.protocol)) {
    throw new Error('The demo URL must use HTTP or HTTPS.');
}
for (const link of document.querySelectorAll('[data-demo-link]')) {
    link.href = demo.href;
}
document.querySelectorAll('[data-current-year]').forEach(element => {
    element.textContent = new Date().getFullYear();
});

function updateThemeControl() {
    const dark = document.documentElement.dataset.theme === 'dark';
    for (const button of document.querySelectorAll('[data-theme-toggle]')) {
        button.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
        button.querySelector('[data-theme-label]').textContent = dark ? 'Dark' : 'Light';
    }
}
document.addEventListener('click', event => {
    if (!event.target.closest('[data-theme-toggle]')) return;
    document.documentElement.dataset.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('analytics-theme', document.documentElement.dataset.theme); } catch { /* Storage may be unavailable. */ }
    updateThemeControl();
});
updateThemeControl();

