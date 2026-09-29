import { readFile, writeFile, mkdir } from 'node:fs/promises';

const root = new URL('./', import.meta.url);
const pages = JSON.parse(await readFile(new URL('documentation/pages.json', root), 'utf8'));
const layout = await readFile(new URL('documentation/layout.html', root), 'utf8');
const slugs = Object.keys(pages);
const searchIndex = {};
const escape = value => String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
})[character]);
const pageUrl = slug => `/docs/${slug}/`;

for (const [position, slug] of slugs.entries()) {
    const current = pages[slug];
    const groups = new Map();
    for (const entry of Object.entries(pages)) {
        const group = entry[1].group;
        if (!groups.has(group)) groups.set(group, []);
        groups.get(group).push(entry);
    }
    const navigation = [...groups].map(([group, entries]) => `<section data-docs-group>
<h2>${escape(group)}</h2>
${entries.map(([name, page]) => `<a href="${pageUrl(name)}" ${name === slug ? 'class="active" aria-current="page"' : ''} data-docs-entry="${escape(`${page.title} ${page.description} ${page.keywords}`.toLowerCase())}"><span>${escape(page.title)}</span>${name === slug ? '<b aria-hidden="true">●</b>' : ''}</a>`).join('\n')}
</section>`).join('\n') + '<p class="docs-search-empty" data-docs-empty hidden>No matching guide.</p>';
    const previous = slugs[position - 1];
    const next = slugs[position + 1];
    const pagination = `<nav class="docs-page-navigation" aria-label="Previous and next documentation pages">
${previous ? `<a href="${pageUrl(previous)}"><small>Previous</small><span>← ${escape(pages[previous].title)}</span></a>` : '<span></span>'}
${next ? `<a href="${pageUrl(next)}"><small>Next</small><span>${escape(pages[next].title)} →</span></a>` : '<span></span>'}
</nav>`;
    const content = await readFile(new URL(`documentation/pages/${slug}.html`, root), 'utf8');
    searchIndex[slug] = `${current.title} ${current.description} ${current.keywords} ${content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')}`.toLowerCase();
    const replacements = { title: escape(current.title), description: escape(current.description), navigation, content, pagination, slug: escape(slug) };
    const html = layout.replace(/\{\{(title|description|navigation|content|pagination|slug)\}\}/g, (_, key) => replacements[key]);
    const directory = new URL(`docs/${slug}/`, root);
    await mkdir(directory, { recursive: true });
    await writeFile(new URL('index.html', directory), html);
    if (slug === 'overview') {
        await writeFile(new URL('docs/index.html', root), html);
    }
}
await writeFile(new URL('docs/search-index.json', root), JSON.stringify(searchIndex));
console.log(`Built ${slugs.length} documentation guides.`);
