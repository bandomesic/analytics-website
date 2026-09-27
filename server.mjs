import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const pages = createRequire(import.meta.url)('./documentation/pages.json');

const files = new Map([
    ['/', ['index.html', 'text/html']],
    ['/index.html', ['index.html', 'text/html']],
    ['/base.css', ['base.css', 'text/css']],
    ['/landing.css', ['landing.css', 'text/css']],
    ['/landing.js', ['landing.js', 'text/javascript']],
    ['/site.js', ['site.js', 'text/javascript']],
    ['/documentation.css', ['documentation.css', 'text/css']],
    ['/documentation.js', ['documentation.js', 'text/javascript']],
    ['/config.js', ['config.js', 'text/javascript']],
    ['/LICENSE', ['LICENSE', 'text/plain']],
    ['/stakeholder-demo.html', ['stakeholder-demo.html', 'text/html']],
    ['/technical-overview.html', ['technical-overview.html', 'text/html']],
]);

files.set('/docs', ['docs/index.html', 'text/html']);
files.set('/docs/', ['docs/index.html', 'text/html']);
files.set('/docs/index.html', ['docs/index.html', 'text/html']);
for (const slug of Object.keys(pages)) {
    const asset = [`docs/${slug}/index.html`, 'text/html'];
    for (const path of [`/docs/${slug}`, `/docs/${slug}/`, `/docs/${slug}/index.html`]) {
        files.set(path, asset);
    }
}

export function createWebsiteServer({ demoUrl = process.env.DEMO_URL } = {}) {
    if (demoUrl && !['http:', 'https:'].includes(new URL(demoUrl).protocol)) {
        throw new Error('DEMO_URL must use HTTP or HTTPS.');
    }
    return createServer(async (request, response) => {
        const pathname = new URL(request.url, 'http://localhost').pathname;
        const asset = files.get(pathname);
        if (!asset || !['GET', 'HEAD'].includes(request.method)) {
            response.writeHead(404).end('Not found');
            return;
        }
        try {
            const content = pathname === '/config.js' && demoUrl
                ? `export const demoUrl = ${JSON.stringify(demoUrl)};\n`
                : await readFile(new URL(asset[0], import.meta.url));
            response.writeHead(200, {
                'Content-Type': `${asset[1]}; charset=utf-8`,
                'Cache-Control': 'no-cache',
                'X-Content-Type-Options': 'nosniff',
            });
            response.end(request.method === 'HEAD' ? undefined : content);
        } catch {
            response.writeHead(500).end('Unable to load the page');
        }
    });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const host = process.env.HOST ?? '127.0.0.1';
    const port = Number(process.env.PORT ?? 8081);
    const server = createWebsiteServer();
    server.listen(port, host, () => {
        console.log(`Privacy Analytics website: http://${host}:${server.address().port}`);
    });
}
