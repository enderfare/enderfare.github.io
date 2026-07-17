// novels/chapter.js
document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const novelSlug = params.get('novel');
    const slug = params.get('slug');
    const container = document.getElementById('chapter-content');
    const treeContainer = document.getElementById('chapter-tree');
    const navContainer = document.getElementById('post-navigation'); // we'll reuse this for prev/next

    if (!novelSlug || !slug) {
        container.innerHTML = '<p>Missing novel or chapter parameter.</p>';
        return;
    }

    async function fetchJSON(url) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    }

    try {
        const novelData = await fetchJSON(`/novels/${novelSlug}/data.json`);
        document.title = `${novelData.title} · Ender's Domain`;
        document.getElementById('novel-title').textContent = novelData.title;

        const chapters = novelData.chapters || [];
        const chapterIndex = chapters.findIndex(c => c.slug === slug);
        if (chapterIndex === -1) {
            container.innerHTML = '<p>Chapter not found.</p>';
            return;
        }

        const chapter = chapters[chapterIndex];
        const orderedChapters = [...chapters].sort((a, b) => a.date.localeCompare(b.date));
        const readingIndex = orderedChapters.findIndex(item => item.slug === slug);
        const total = chapters.length;

        // Fetch content
        const ext = chapter.format === 'markdown' ? '.md' : '.html';
        const contentPath = `/novels/${novelSlug}/chapters/${slug}${ext}`;
        const contentRes = await fetch(contentPath);
        if (!contentRes.ok) throw new Error('Content not found');
        const raw = await contentRes.text();

        let rendered = '';
        if (chapter.format === 'markdown') {
            rendered = marked.parse(raw);
        } else {
            rendered = raw;
        }

        // Prev / Next
        const prevChapter = chapters[chapterIndex - 1] || null;
        const nextChapter = chapters[chapterIndex + 1] || null;

        // Build navigation HTML (including "Back to Novel")
        const navHtml = `
            <div class="chapter-nav">
                <span>
                    ${prevChapter ? `<a href="?novel=${novelSlug}&slug=${prevChapter.slug}"><i class="fas fa-chevron-left"></i> ${prevChapter.title}</a>` : ''}
                </span>
                <span class="counter">Chapter ${readingIndex + 1} of ${total}</span>
                <span>
                    ${nextChapter ? `<a href="?novel=${novelSlug}&slug=${nextChapter.slug}">${nextChapter.title} <i class="fas fa-chevron-right"></i></a>` : ''}
                </span>
            </div>
            
        `;

        container.innerHTML = `
    <div class="chapter-header">
        <div><p class="eyebrow"><i class="fas fa-book-open"></i> Chapter ${readingIndex + 1} of ${total}</p><h1 class="chapter-title">${chapter.title}</h1></div>
        <a href="/novels/novel.html?novel=${novelSlug}" class="back-to-novel"><i class="fas fa-book"></i> Back to ${novelData.title}</a>
    </div>
    <div class="chapter-meta">
        <span>${new Date(chapter.date).toLocaleDateString()}</span>
        ${chapter.tags ? chapter.tags.map(t => `<span class="topic-tag">#${t}</span>`).join('') : ''}
        ${chapter.language ? `<span class="language-badge"><i class="fas fa-globe"></i> ${chapter.language}</span>` : ''}
    </div>
    <div class="reading-progress" aria-label="Reading progress"><span style="width:${((readingIndex + 1) / total) * 100}%"></span></div>
    ${navHtml}
    <div class="chapter-body">
        ${rendered}
    </div>
    ${navHtml}
`;

        // ---- Build chapter tree ----
        function buildTree(chapters) {
            const map = {};
            const roots = [];
            chapters.forEach(c => {
                map[c.slug] = { ...c, children: [] };
            });
            chapters.forEach(c => {
                if (c.parent && map[c.parent]) {
                    map[c.parent].children.push(map[c.slug]);
                } else {
                    roots.push(map[c.slug]);
                }
            });
            // Sort children by date (oldest first)
            const sortChildren = (node) => {
                node.children.sort((a, b) => new Date(a.date) - new Date(b.date));
                node.children.forEach(sortChildren);
            };
            roots.forEach(sortChildren);
            roots.sort((a, b) => new Date(a.date) - new Date(b.date));
            return roots;
        }

        function renderTree(nodes, activeSlug) {
            let html = '<ul class="chapter-tree">';
            nodes.forEach(node => {
                const isActive = node.slug === activeSlug;
                const hasChildren = node.children && node.children.length > 0;
                html += `<li class="tree-node ${isActive ? 'active' : ''}">`;
                html += `<div class="tree-item">`;
                if (hasChildren) {
                    html += `<details class="tree-details" ${isActive ? 'open' : ''}>`;
                    html += `<summary class="tree-summary">`;
                }
                html += `<a href="/novels/chapter.html?novel=${novelSlug}&slug=${node.slug}" class="tree-link ${isActive ? 'active-link' : ''}">${node.title}</a>`;
                if (hasChildren) {
                    html += `</summary>`;
                    html += `<div class="tree-children">${renderTree(node.children, activeSlug)}</div>`;
                    html += `</details>`;
                }
                html += `</div>`;
                html += `</li>`;
            });
            html += '</ul>';
            return html;
        }

        const tree = buildTree(chapters);
        if (treeContainer) {
            treeContainer.innerHTML = renderTree(tree, slug);
        }

    } catch (err) {
        console.error('Error loading chapter:', err);
        container.innerHTML = `<div class="empty-state"><i class="fas fa-book"></i><h2>This chapter is not available yet</h2><p>The chapter file has not been published.</p><a class="back-link" href="/novels/novel.html?novel=${novelSlug}">Back to the chapter list</a></div>`;
    }
});
