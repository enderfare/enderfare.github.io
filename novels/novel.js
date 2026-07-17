document.addEventListener('DOMContentLoaded', async () => {
    const slug = new URLSearchParams(window.location.search).get('novel');
    const grid = document.getElementById('chapter-grid');
    const tagContainer = document.getElementById('sidebar-tag-filters');
    const count = document.getElementById('chapter-counter');
    let novel;
    let currentTag = 'all';
    let currentSort = 'oldest';

    if (!slug) { grid.innerHTML = '<p>No novel was selected.</p>'; return; }
    const formatDate = date => new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));

    function render() {
        const matchingChapters = (novel.chapters || []).filter(chapter => currentTag === 'all' || (chapter.tags || []).includes(currentTag));
        const matchingSlugs = new Set(matchingChapters.map(chapter => chapter.slug));
        count.textContent = `Showing ${matchingChapters.length} of ${(novel.chapters || []).length} chapters`;
        if (!matchingChapters.length) { grid.innerHTML = '<div class="empty-state"><i class="fas fa-filter"></i><h2>No chapters found</h2><p>Try another filter.</p></div>'; return; }

        const nodes = new Map((novel.chapters || []).map(chapter => [chapter.slug, { ...chapter, children: [] }]));
        const roots = [];
        nodes.forEach(node => {
            if (node.parent && nodes.has(node.parent)) nodes.get(node.parent).children.push(node);
            else roots.push(node);
        });

        const compare = (a, b) => currentSort === 'newest' ? b.date.localeCompare(a.date)
            : currentSort === 'title' ? a.title.localeCompare(b.title)
                : a.date.localeCompare(b.date);
        const sortTree = items => items.sort(compare).forEach(item => sortTree(item.children));
        sortTree(roots);

        const pruneTree = items => items.reduce((visible, item) => {
            const children = pruneTree(item.children);
            if (matchingSlugs.has(item.slug) || children.length) visible.push({ ...item, children });
            return visible;
        }, []);

        const renderTree = (items, prefix = '') => items.map((chapter, index) => {
            const chapterNumber = prefix ? `${prefix}.${index + 1}` : `${index + 1}`;
            return `<li class="chapter-node">
                <a class="chapter-card" href="/novels/chapter.html?novel=${slug}&slug=${chapter.slug}">
                    <span class="chapter-number">${chapterNumber.padStart(2, '0')}</span>
                    <div class="chapter-info"><h2 class="chapter-title">${chapter.title}</h2><div class="chapter-tags">${(chapter.tags || []).map(tag => `<span class="topic-tag">#${tag}</span>`).join('')}</div></div>
                    <div class="chapter-date"><i class="far fa-calendar"></i> ${formatDate(chapter.date)}<i class="fas fa-arrow-right"></i></div>
                </a>
                ${chapter.children.length ? `<ul class="chapter-children">${renderTree(chapter.children, chapterNumber)}</ul>` : ''}
            </li>`;
        }).join('');

        grid.innerHTML = `<ul class="chapter-outline">${renderTree(pruneTree(roots))}</ul>`;
    }

    try {
        const response = await fetch(`/novels/${slug}/data.json`);
        if (!response.ok) throw new Error('Novel not found');
        novel = await response.json();
        document.title = `${novel.title} · Ender's Domain`;
        document.getElementById('novel-title').textContent = novel.title;
        document.getElementById('novel-headline').textContent = novel.title;
        document.getElementById('novel-description').textContent = novel.description || '';
        document.getElementById('novel-language').textContent = novel.language || 'Unknown';
        document.getElementById('novel-total').textContent = `${(novel.chapters || []).length} chapters`;
        const tags = {};
        (novel.chapters || []).forEach(chapter => (chapter.tags || []).forEach(tag => { tags[tag] = (tags[tag] || 0) + 1; }));
        tagContainer.innerHTML = [`<label class="filter-option all-option"><input type="radio" name="chapter-tag" value="all" checked><span>All</span><span class="filter-count">${(novel.chapters || []).length}</span></label>`, ...Object.keys(tags).sort().map(tag => `<label class="filter-option"><input type="radio" name="chapter-tag" value="${tag}"><span>#${tag}</span><span class="filter-count">${tags[tag]}</span></label>`)].join('');
        tagContainer.querySelectorAll('input[name="chapter-tag"]').forEach(input => input.addEventListener('change', () => { currentTag = input.value; render(); }));
        document.querySelectorAll('input[name="chapter-sort"]').forEach(input => input.addEventListener('change', () => { currentSort = input.value; render(); }));
        render();
    } catch (error) {
        console.error(error);
        grid.innerHTML = '<div class="empty-state"><i class="fas fa-triangle-exclamation"></i><h2>Story could not load</h2></div>';
    }
});
