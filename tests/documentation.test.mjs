import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWebsiteServer } from '../server.mjs';

const guides = {
    overview: 'Understand your product without giving up control.',
    requirements: 'Server requirements',
    installation: 'Installation',
    forge: 'Laravel Forge',
    'getting-started': 'Your first workspace',
    tutorials: 'Learn by building something real.',
    'tracking-events': 'Tracking and events',
    analytics: 'Analytics reports',
    'entity-analytics': 'Object analytics',
    'data-sources': 'External data sources',
    dashboards: 'Custom dashboards',
    'insights-reporting': 'Insights and reporting',
    'privacy-security': 'Privacy and security',
    environment: 'Environment variables',
    troubleshooting: 'Troubleshooting',
    operations: 'Production operations',
};

async function website(context) {
    const server = createWebsiteServer();
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    context.after(() => new Promise(resolve => server.close(resolve)));
    return `http://127.0.0.1:${server.address().port}`;
}

for (const [slug, heading] of Object.entries(guides)) {
    test(`serves the ${slug} guide and its navigation links locally`, async context => {
        const origin = await website(context);
        const response = await fetch(`${origin}/docs/${slug}/`);
        assert.equal(response.status, 200);
        const html = await response.text();
        for (const expected of [heading, 'Search documentation', 'Built in the open.']) {
            assert.ok(html.includes(expected), expected);
        }
        for (const [, href] of html.matchAll(/href="([^"]+)"/g)) {
            const url = new URL(href, `${origin}/docs/${slug}/`);
            if (url.origin !== origin) {
                assert.ok(!['/install', '/login', '/dashboard'].includes(url.pathname), href);
                continue;
            }
            const linked = await fetch(url);
            assert.equal(linked.status, 200, href);
            if (url.hash && linked.headers.get('content-type').includes('text/html')) {
                assert.ok((await linked.text()).includes(`id="${url.hash.slice(1)}"`), href);
            }
        }
    });
}

test('uses the introduction at the documentation home and returns 404 for unknown guides', async context => {
    const origin = await website(context);
    const response = await fetch(`${origin}/docs/`);
    assert.equal(response.status, 200);
    assert.ok((await response.text()).includes(guides.overview));
    assert.equal((await fetch(`${origin}/docs/not-a-guide/`)).status, 404);
});

test('preserves the accessible interactive tutorial content', async context => {
    const origin = await website(context);
    const html = await (await fetch(`${origin}/docs/tutorials/`)).text();
    for (const expected of ['Choose a tutorial', 'Track a URL collection', 'Measure repeating cards', 'Model nested objects', 'Use a regular expression', 'Before you start', 'Tracker connected', 'What you should see', 'You are done when', 'Previous step', 'Next step', 'aria-live="polite"']) {
        assert.ok(html.includes(expected), expected);
    }
});

test('preserves the optional object analytics reference', async context => {
    const origin = await website(context);
    const html = await (await fetch(`${origin}/docs/entity-analytics/`)).text();
    for (const expected of ['No fixed taxonomy.', 'Templates leave', 'Object type', '/collections/*/items/*', 'Repeating cards', 'Regular expressions', 'What happens after publishing', 'Verify a mapping']) {
        assert.ok(html.includes(expected), expected);
    }
});
