import { demoUrl } from './config.js';

const demo = demoUrl ? new URL(demoUrl) : null;
if (demo && !['http:', 'https:'].includes(demo.protocol)) {
    throw new Error('The demo URL must use HTTP or HTTPS.');
}
for (const link of document.querySelectorAll('[data-demo-link], [data-app-path]')) {
    if (!demo) {
        link.hidden = true;
        link.removeAttribute('href');
        continue;
    }
    const path = link.dataset.appPath?.replace(/^\/demo\/?/, '') ?? '';
    link.href = path ? new URL(path, `${demo.href.replace(/\/$/, '')}/`).href : demo.href;
    link.hidden = false;
}
for (const element of document.querySelectorAll('[data-demo-pending]')) {
    element.hidden = Boolean(demo);
}
for (const element of document.querySelectorAll('[data-demo-ready]')) {
    element.hidden = !demo;
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
