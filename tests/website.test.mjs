import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWebsiteServer } from '../server.mjs';

async function website(context, options) {
    const server = createWebsiteServer(options);
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    context.after(() => new Promise(resolve => server.close(resolve)));
    return `http://127.0.0.1:${server.address().port}`;
}

test('serves the standalone page and every local asset without Laravel', async context => {
    const origin = await website(context);
    const response = await fetch(origin);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.ok(html.includes('See the story'));
    assert.ok(!html.includes('/build/assets/'));
    for (const page of ['stakeholder-demo.html', 'technical-overview.html']) {
        const presentation = await fetch(`${origin}/${page}`);
        assert.equal(presentation.status, 200);
        for (const [, href] of (await presentation.text()).matchAll(/href="([^"#]+\.html)"/g)) {
            assert.equal((await fetch(new URL(href, `${origin}/${page}`))).status, 200, href);
        }
    }
    for (const [, path] of html.matchAll(/(?:src|href)="([^"#][^"]*\.(?:js|css))"/g)) {
        assert.equal((await fetch(new URL(path, `${origin}/`))).status, 200, path);
    }
    for (const [, fragment] of html.matchAll(/href="#([^"]+)"/g)) {
        assert.ok(html.includes(`id="${fragment}"`), `Missing anchor: ${fragment}`);
    }
});

test('allows the public demo URL to be configured independently', async context => {
    const origin = await website(context, { demoUrl: 'https://demo.example.test/demo' });
    const response = await fetch(`${origin}/config.js`);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), 'export const demoUrl = "https://demo.example.test/demo";\n');
});

test('does not serve private files or application routes', async context => {
    const origin = await website(context);
    for (const path of ['/.env', '/server.mjs', '/package.json', '/install', '/demo']) {
        assert.equal((await fetch(`${origin}${path}`)).status, 404, path);
    }
});


test('hides unavailable demo links without linking to workspace login or setup', async context => {
    const origin = await website(context);
    const html = await (await fetch(origin)).text();
    const links = [...html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>/g)].map(match => match[1]);
    assert.ok(html.includes('hidden data-demo-link'));
    assert.ok(!html.includes('127.0.0.1:8082'));
    for (const link of links) {
        assert.ok(!['/install', '/login', '/dashboard'].includes(new URL(link, origin).pathname), link);
    }
    assert.ok(!html.includes('Set up your workspace'));
    assert.ok(!html.includes('Start installation'));
});
