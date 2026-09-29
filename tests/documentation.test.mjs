import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWebsiteServer } from '../server.mjs';

const guides = {
    overview: 'Understand your product without giving up control.',
    requirements: 'Server requirements',
    installation: 'Installation',
    forge: 'Laravel Forge',
    'getting-started': 'Your first workspace',
    tutorials: 'Learn the workflows you will actually use.',
    'tutorials-object': 'Object analytics tutorials',
    'tutorials-tracking': 'Tracking tutorials',
    'tutorials-analysis': 'Analysis tutorials',
    'tutorials-reporting': 'Reporting tutorials',
    'tutorials-data': 'Connected data tutorials',
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
        assert.ok(html.includes(`https://github.com/bandomesic/analytics-website/blob/main/documentation/pages/${slug}.html`));
        const linkedHtml = html.replace(/<pre><code>[\s\S]*?<\/code><\/pre>/g, '');
        for (const [, href] of linkedHtml.matchAll(/href="([^"]+)"/g)) {
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

test('organizes all interactive tutorials by topic and keeps their deep links', async context => {
    const origin = await website(context);
    const index = await (await fetch(`${origin}/docs/tutorials/`)).text();
    let tutorialCount = 0;
    for (const topic of ['object', 'tracking', 'analysis', 'reporting', 'data']) {
        const html = await (await fetch(`${origin}/docs/tutorials-${topic}/`)).text();
        const selectors = [...html.matchAll(/data-tutorial-select="([^"]+)"/g)].map(match => match[1]);
        const decks = [...html.matchAll(/data-tutorial-deck="([^"]+)"/g)].map(match => match[1]);
        assert.deepEqual(selectors, decks);
        assert.ok(selectors.length > 0);
        assert.ok(html.includes('Before you start'));
        assert.doesNotMatch(html, /data-tutorial-(player|play|restart|speed|time|chapters)/);
        tutorialCount += decks.length;
        for (const deck of decks) {
            assert.ok(index.includes(`id="tutorial-${deck}"`), deck);
            assert.ok(index.includes(`/docs/tutorials-${topic}/#tutorial-${deck}`), deck);
            const section = html.match(new RegExp(`<section id="tutorial-${deck}"[\\s\\S]*?</section>`))?.[0];
            assert.ok(section, deck);
            const slides = [...section.matchAll(/data-tutorial-slide/g)];
            assert.ok(slides.length >= 6, `${deck} has ${slides.length} steps`);
            const picker = html.match(new RegExp(`<button[^>]*data-tutorial-select="${deck}"[\\s\\S]*?</button>`))?.[0];
            assert.ok(picker?.includes(`<b>${slides.length} steps</b>`), deck);
            for (let step = 1; step <= slides.length; step++) {
                assert.ok(section.includes(`<span>Step ${step} of ${slides.length}</span>`), `${deck} step ${step}`);
            }
        }
    }
    assert.equal(tutorialCount, 24);
});

test('searches guide content as well as navigation labels', async context => {
    const origin = await website(context);
    const index = await (await fetch(`${origin}/docs/search-index.json`)).json();
    assert.ok(index.operations.includes('revoke an individual link'));
    assert.ok(index['tutorials-object'].includes('one identity across actions'));
});

test('preserves the optional object analytics reference', async context => {
    const origin = await website(context);
    const html = await (await fetch(`${origin}/docs/entity-analytics/`)).text();
    for (const expected of ['No fixed taxonomy.', 'Templates leave', 'Object type', '/collections/*/items/*', 'Repeating cards', 'Regular expressions', 'What happens after publishing', 'Verify a mapping', 'id="worked-detail-page"', 'id="worked-repeating-cards"', 'product:sku-10042']) {
        assert.ok(html.includes(expected), expected);
    }
});
