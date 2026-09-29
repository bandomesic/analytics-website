import './site.js';

const sidebar = document.getElementById('docs-sidebar');
const menuButton = document.querySelector('[data-docs-menu]');
const search = document.querySelector('[data-docs-search]');
const entries = [...document.querySelectorAll('[data-docs-entry]')];
const groups = [...document.querySelectorAll('[data-docs-group]')];
const empty = document.querySelector('[data-docs-empty]');

function closeMenu() {
    sidebar?.classList.remove('is-open');
    menuButton?.setAttribute('aria-expanded', 'false');
}

menuButton?.addEventListener('click', () => {
    const open = sidebar?.classList.toggle('is-open') ?? false;
    menuButton.setAttribute('aria-expanded', String(open));
});

document.addEventListener('click', event => {
    if (sidebar?.classList.contains('is-open') && !event.target.closest('#docs-sidebar') && !event.target.closest('[data-docs-menu]')) closeMenu();
});

document.addEventListener('keydown', event => {
    if (event.key === '/' && document.activeElement !== search) {
        event.preventDefault();
        search?.focus();
    }
    if (event.key === 'Escape') {
        closeMenu();
        search?.blur();
    }
});

let searchIndex;
let searchRequest;
search?.addEventListener('input', async event => {
    const query = event.target.value.trim().toLowerCase();
    if (query && !searchIndex) {
        searchRequest ??= fetch('/docs/search-index.json').then(response => {
            if (!response.ok) throw new Error('Documentation search is unavailable.');
            return response.json();
        }).catch(() => ({}));
        searchIndex = await searchRequest;
    }
    if (query !== search.value.trim().toLowerCase()) return;
    entries.forEach(entry => {
        const slug = new URL(entry.href).pathname.split('/')[2];
        entry.hidden = query !== '' && !(searchIndex?.[slug] ?? entry.dataset.docsEntry).includes(query);
    });
    groups.forEach(group => { group.hidden = ![...group.querySelectorAll('[data-docs-entry]')].some(entry => !entry.hidden); });
    empty.hidden = entries.some(entry => !entry.hidden);
});

document.querySelectorAll('.docs-code').forEach(block => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Copy';
    button.addEventListener('click', async () => {
        await navigator.clipboard.writeText(block.querySelector('code')?.textContent ?? '');
        button.textContent = 'Copied';
        window.setTimeout(() => { button.textContent = 'Copy'; }, 1400);
    });
    block.append(button);
});

const headings = [...document.querySelectorAll('[data-docs-article] > h2, [data-docs-article] > h3, [data-docs-article] > .tutorial-prerequisites h2, [data-docs-article] > .tutorial-stage > .tutorial-deck > header h2')];
const tableOfContents = document.querySelector('[data-docs-toc]');

headings.forEach((heading, index) => {
    if (!heading.id) heading.id = `section-${index + 1}`;
    const link = document.createElement('a');
    link.href = `#${heading.closest('[data-tutorial-deck]')?.id ?? heading.id}`;
    link.textContent = heading.textContent;
    if (heading.tagName === 'H3') link.classList.add('subsection');
    tableOfContents?.append(link);
});

if ('IntersectionObserver' in window && headings.length) {
    const links = [...(tableOfContents?.querySelectorAll('a') ?? [])];
    const observer = new IntersectionObserver(records => {
        const visible = records.find(record => record.isIntersecting);
        if (!visible) return;
        links.forEach(link => link.classList.toggle('active', link.hash === `#${visible.target.closest('[data-tutorial-deck]')?.id ?? visible.target.id}`));
    }, { rootMargin: '-100px 0px -70% 0px' });
    headings.forEach(heading => observer.observe(heading));
}

const tutorialStage = document.querySelector('[data-tutorial-stage]');
const tutorialSelectors = [...document.querySelectorAll('[data-tutorial-select]')];
const tutorialDecks = [...document.querySelectorAll('[data-tutorial-deck]')];

if (tutorialStage && tutorialDecks.length) {
    tutorialStage.classList.add('is-enhanced');
    const filterBar = document.querySelector('[data-tutorial-filters]');
    const topicFilters = [...document.querySelectorAll('[data-tutorial-topic-filter]')];
    const filterCount = filterBar?.querySelector('[data-tutorial-filter-count]');
    filterBar?.classList.add('is-ready');
    const positions = new Map(tutorialDecks.map(deck => [deck.dataset.tutorialDeck, 0]));
    let activeTutorial = tutorialDecks.some(deck => `#${deck.id}` === window.location.hash)
        ? tutorialDecks.find(deck => `#${deck.id}` === window.location.hash)?.dataset.tutorialDeck
        : tutorialDecks[0].dataset.tutorialDeck;

    const renderDeck = deck => {
        const slides = [...deck.querySelectorAll('[data-tutorial-slide]')];
        const current = positions.get(deck.dataset.tutorialDeck) ?? 0;
        const progress = deck.querySelector('[data-tutorial-progress]');
        const status = deck.querySelector('[data-tutorial-status]');
        const previous = deck.querySelector('[data-tutorial-previous]');
        const next = deck.querySelector('[data-tutorial-next]');

        slides.forEach((slide, index) => {
            slide.hidden = index !== current;
            slide.classList.toggle('is-active', index === current);
        });
        if (progress) progress.style.width = `${((current + 1) / slides.length) * 100}%`;
        if (status) status.textContent = `Step ${current + 1} of ${slides.length}`;
        if (previous) previous.disabled = current === 0;
        if (next) next.textContent = current === slides.length - 1 ? 'Start again ↻' : 'Next step →';
    };

    const setTopicFilter = topic => {
        tutorialSelectors.forEach(selector => {
            selector.hidden = topic !== 'all' && selector.dataset.tutorialTopic !== topic;
        });
        topicFilters.forEach(filter => {
            filter.setAttribute('aria-pressed', String(filter.dataset.tutorialTopicFilter === topic));
        });
        const count = tutorialSelectors.filter(selector => !selector.hidden).length;
        if (filterCount) filterCount.textContent = `${count} ${count === 1 ? 'tutorial' : 'tutorials'}`;
    };

    const selectTutorial = name => {
        const selector = tutorialSelectors.find(candidate => candidate.dataset.tutorialSelect === name);
        if (!selector) return;
        if (selector.hidden) setTopicFilter(selector.dataset.tutorialTopic);
        activeTutorial = name;
        tutorialSelectors.forEach(selector => {
            const selected = selector.dataset.tutorialSelect === name;
            selector.setAttribute('aria-selected', String(selected));
            selector.tabIndex = selected ? 0 : -1;
        });
        tutorialDecks.forEach(deck => {
            const selected = deck.dataset.tutorialDeck === name;
            deck.hidden = !selected;
            if (selected) renderDeck(deck);
        });
    };

    topicFilters.forEach(filter => {
        filter.addEventListener('click', () => {
            setTopicFilter(filter.dataset.tutorialTopicFilter);
            const selected = tutorialSelectors.find(selector => selector.dataset.tutorialSelect === activeTutorial);
            if (selected?.hidden) {
                const firstVisible = tutorialSelectors.find(selector => !selector.hidden);
                if (firstVisible) {
                    selectTutorial(firstVisible.dataset.tutorialSelect);
                    history.replaceState(null, '', `#tutorial-${firstVisible.dataset.tutorialSelect}`);
                }
            }
        });
    });

    tutorialSelectors.forEach(selector => {
        selector.addEventListener('click', () => {
            selectTutorial(selector.dataset.tutorialSelect);
            history.replaceState(null, '', `#tutorial-${selector.dataset.tutorialSelect}`);
        });
        selector.addEventListener('keydown', event => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            const visibleSelectors = tutorialSelectors.filter(candidate => !candidate.hidden);
            const selectorIndex = visibleSelectors.indexOf(selector);
            let nextIndex = selectorIndex;
            if (event.key === 'ArrowLeft') nextIndex = (selectorIndex - 1 + visibleSelectors.length) % visibleSelectors.length;
            if (event.key === 'ArrowRight') nextIndex = (selectorIndex + 1) % visibleSelectors.length;
            if (event.key === 'Home') nextIndex = 0;
            if (event.key === 'End') nextIndex = visibleSelectors.length - 1;
            visibleSelectors[nextIndex].focus();
            selectTutorial(visibleSelectors[nextIndex].dataset.tutorialSelect);
            history.replaceState(null, '', `#tutorial-${visibleSelectors[nextIndex].dataset.tutorialSelect}`);
        });
    });

    window.addEventListener('hashchange', () => {
        const linkedDeck = tutorialDecks.find(deck => `#${deck.id}` === window.location.hash);
        if (linkedDeck) selectTutorial(linkedDeck.dataset.tutorialDeck);
    });

    tutorialDecks.forEach(deck => {
        const slides = [...deck.querySelectorAll('[data-tutorial-slide]')];
        deck.querySelector('[data-tutorial-previous]')?.addEventListener('click', () => {
            const current = positions.get(deck.dataset.tutorialDeck) ?? 0;
            positions.set(deck.dataset.tutorialDeck, Math.max(0, current - 1));
            renderDeck(deck);
        });
        deck.querySelector('[data-tutorial-next]')?.addEventListener('click', () => {
            const current = positions.get(deck.dataset.tutorialDeck) ?? 0;
            positions.set(deck.dataset.tutorialDeck, current === slides.length - 1 ? 0 : current + 1);
            renderDeck(deck);
        });
    });

    tutorialStage.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight'].includes(event.key) || event.target.closest('[role="tab"]')) return;
        const deck = tutorialDecks.find(candidate => candidate.dataset.tutorialDeck === activeTutorial);
        const button = event.key === 'ArrowLeft'
            ? deck?.querySelector('[data-tutorial-previous]')
            : deck?.querySelector('[data-tutorial-next]');
        if (!button?.disabled) button?.click();
    });

    setTopicFilter('all');
    selectTutorial(activeTutorial);
}

const linkedTutorial = document.querySelector(`[data-tutorial-redirect][href$="${window.location.hash}"]`);
if (linkedTutorial && window.location.hash.startsWith('#tutorial-')) {
    window.location.replace(linkedTutorial.href);
}
