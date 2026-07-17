document.addEventListener('DOMContentLoaded', async () => {
    // Determine novel slug from URL path
    const path = window.location.pathname;
    const parts = path.split('/').filter(Boolean);
    const novelSlug = parts[1]; // e.g., "my-fantasy-novel"
    const isChapterPage = parts.includes('chapter.html') || window.location.search.includes('slug=');

    if (!novelSlug) return;

    // Fetch novel meta and chapters
    async function fetchJSON(url) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed ${url}`);
        return res.json();
    }

    try {
        const meta = await fetchJSON(`/novels/${novelSlug}/meta.json`);
        const chaptersData = await fetchJSON(`/novels/${novelSlug}/chapters.json`);
        const chapters = chaptersData.chapters || [];

        // Update page title and headings
        document.title = `${meta.title} · Ender's Domain`;
        document.getElementById('novel-title').textContent = meta.title;
        document.getElementById('novel-headline').textContent = meta.title;
        document.getElementById('novel-description').textContent = meta.description;

        // If we are on the chapter viewer page, handle that
        if (isChapterPage) {
            renderChapter(novelSlug, meta, chapters);
            return;
        }

        // Otherwise, render chapter list with filters
        renderChapterList(meta, chapters);

    } catch (err) {
        console.error('Error loading novel:', err);
        document.getElementById('chapter-grid').innerHTML = '<p style="color:var(--text-color2);">Could not load novel.</p>';
    }

    function renderChapterList(meta, chapters) {
        const grid = document.getElementById('chapter-grid');
        const tagContainer = document.getElementById('sidebar-tag-filters');
        const langContainer = document.getElementById('sidebar-language-filters');
        let currentTag = 'all';
        let currentLang = 'all';

        // Build filters from chapters' own tags? But tags are per novel, not per chapter.
        // We'll use the novel's tags and language for filtering the novel itself.
        // Actually, the user wants filters on chapters? The requirement: "i wnat a tag and langage filter" – likely for the novel list, but they might want to filter chapters by tags too.
        // Since chapters don't have separate tags, we'll keep the filters for the novel listing, but here we only have one novel, so filters are redundant. But we can still show them to filter chapters by some custom property, or we can just show all chapters.

        // For simplicity, I'll skip filters in the chapter list, but we can implement per-chapter tags if needed.
        // The user said "similar to the blogs" – blogs have filters per post. So maybe each chapter should have tags.
        // Let's extend chapters.json to include tags and language per chapter.

        // Build a flat list of all chapters' tags and languages for filtering.
        // We'll assume chapters can have their own tags and language (override novel's).
        // For now, we'll just list chapters without filters, but we can add them if needed.

        // If we have per-chapter tags, we can build filters similarly to the blog.
        // Let's assume chapters.json includes tags and language for each chapter.
        // Example:
        // { "slug": "chapter-1", "title": "...", "date": "...", "tags": ["intro"], "language": "English" }

        // We'll implement filtering by tags and language for chapters.
        const allChapterTags = new Set();
        const allChapterLangs = new Set();
        chapters.forEach(c => {
            (c.tags || []).forEach(t => allChapterTags.add(t));
            if (c.language) allChapterLangs.add(c.language);
        });

        // Build filter UIs
        function buildTagFilters() {
            const tagCount = {};
            chapters.forEach(c => (c.tags || []).forEach(t => tagCount[t] = (tagCount[t] || 0) + 1));
            const tags = Object.keys(tagCount).sort();
            let html = `<label class="filter-option all-option">
        <input type="radio" name="ch-tag" value="all" checked>
        <span>All</span>
        <span class="filter-count">${chapters.length}</span>
      </label>`;
            tags.forEach(t => {
                html += `<label class="filter-option">
          <input type="radio" name="ch-tag" value="${t}">
          <span>#${t}</span>
          <span class="filter-count">${tagCount[t]}</span>
        </label>`;
            });
            tagContainer.innerHTML = html;
            tagContainer.querySelectorAll('input[name="ch-tag"]').forEach(radio => {
                radio.addEventListener('change', () => { currentTag = radio.value; render(); });
            });
        }

        function buildLanguageFilters() {
            const langCount = {};
            chapters.forEach(c => {
                const lang = c.language || meta.language || 'Unknown';
                langCount[lang] = (langCount[lang] || 0) + 1;
            });
            const langs = Object.keys(langCount).sort();
            let html = `<label class="filter-option all-option">
        <input type="radio" name="ch-lang" value="all" checked>
        <span>All</span>
        <span class="filter-count">${chapters.length}</span>
      </label>`;
            langs.forEach(l => {
                html += `<label class="filter-option">
          <input type="radio" name="ch-lang" value="${l}">
          <span>${l}</span>
          <span class="filter-count">${langCount[l]}</span>
        </label>`;
            });
            langContainer.innerHTML = html;
            langContainer.querySelectorAll('input[name="ch-lang"]').forEach(radio => {
                radio.addEventListener('change', () => { currentLang = radio.value; render(); });
            });
        }

        function render() {
            let filtered = chapters;
            if (currentTag !== 'all') filtered = filtered.filter(c => (c.tags || []).includes(currentTag));
            if (currentLang !== 'all') filtered = filtered.filter(c => (c.language || meta.language || 'Unknown') === currentLang);

            // Show chapter counter
            const total = chapters.length;
            const shown = filtered.length;
            document.getElementById('chapter-counter').textContent = `Showing ${shown} of ${total} chapters`;

            if (!filtered.length) {
                grid.innerHTML = '<p style="color:var(--text-color2);">No chapters match the filters.</p>';
                return;
            }

            // Sort by date (newest first) or by order? We'll sort by date or by index.
            // Since we have no explicit order, we'll sort by date descending.
            filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

            // Determine current chapter index if we are on a chapter page? Not here.
            // For the list, we just show each chapter card.

            grid.innerHTML = filtered.map((c, index) => {
                const totalChapters = filtered.length;
                const chapterNumber = index + 1; // if sorted by date, this is not stable. Better to use an explicit order field.
                // For simplicity, we'll use the array index.
                const date = new Date(c.date);
                const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getMonth()];
                const day = date.getDate();
                const year = date.getFullYear();

                return `
          <a href="/novels/${novelSlug}/chapter.html?slug=${c.slug}" class="chapter-card" style="display:block; background:var(--bg-color); border:1px solid var(--favorite-color); border-radius:var(--radius-md); padding:1rem 1.2rem; margin-bottom:1rem; text-decoration:none; transition:0.2s;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <h3 style="margin:0; color:var(--text-color);">${c.title}</h3>
              <span class="post-date-badge" style="background:rgba(252,129,74,0.15); color:var(--accent-color); font-size:0.6rem; padding:0.1rem 0.6rem; border-radius:1rem; border:1px solid var(--favorite-color);">${month} ${day}, ${year}</span>
            </div>
            ${c.tags && c.tags.length ? `<div style="margin-top:0.3rem; display:flex; flex-wrap:wrap; gap:0.3rem;">${c.tags.map(t => `<span class="topic-tag" style="background:var(--bg-color); border:1px solid var(--text-color2); border-radius:1rem; padding:0.1rem 0.6rem; font-size:0.7rem; color:var(--text-color2);">#${t}</span>`).join('')}</div>` : ''}
            ${c.language ? `<span class="language-badge"><i class="fas fa-globe"></i> ${c.language}</span>` : ''}
          </a>
        `;
            }).join('');
        }

        buildTagFilters();
        buildLanguageFilters();
        render();
    }

    // Chapter viewer function (for chapter.html)
    function renderChapter(novelSlug, meta, chapters) {
        const params = new URLSearchParams(window.location.search);
        const slug = params.get('slug');
        const container = document.getElementById('chapter-grid'); // we'll reuse this container
        if (!slug) {
            container.innerHTML = '<p>No chapter specified.</p>';
            return;
        }

        // Find chapter data
        const chapterIndex = chapters.findIndex(c => c.slug === slug);
        if (chapterIndex === -1) {
            container.innerHTML = '<p>Chapter not found.</p>';
            return;
        }

        const chapter = chapters[chapterIndex];
        const total = chapters.length;

        // Fetch content
        const ext = chapter.format === 'markdown' ? '.md' : '.html';
        const contentPath = `/novels/${novelSlug}/chapters/${slug}${ext}`;

        fetch(contentPath)
            .then(res => {
                if (!res.ok) throw new Error('Content not found');
                return res.text();
            })
            .then(raw => {
                let htmlContent = '';
                if (chapter.format === 'markdown') {
                    // Use marked library
                    htmlContent = marked.parse(raw);
                } else {
                    htmlContent = raw;
                }

                // Show chapter title and navigation
                const prevChapter = chapters[chapterIndex - 1] || null;
                const nextChapter = chapters[chapterIndex + 1] || null;

                let navHtml = `
          <div style="display:flex; justify-content:space-between; margin:1rem 0;">
            ${prevChapter ? `<a href="?slug=${prevChapter.slug}" style="color:var(--link-color);"><i class="fas fa-chevron-left"></i> ${prevChapter.title}</a>` : '<span></span>'}
            <span style="color:var(--text-color2);">Chapter ${chapterIndex + 1} of ${total}</span>
            ${nextChapter ? `<a href="?slug=${nextChapter.slug}" style="color:var(--link-color);">${nextChapter.title} <i class="fas fa-chevron-right"></i></a>` : '<span></span>'}
          </div>
        `;

                container.innerHTML = `
          <h1>${chapter.title}</h1>
          <div style="font-size:0.9rem; color:var(--text-color2); margin-bottom:1rem;">
            <span>${new Date(chapter.date).toLocaleDateString()}</span>
            ${chapter.tags ? chapter.tags.map(t => `<span class="topic-tag" style="background:var(--bg-color); border:1px solid var(--text-color2); border-radius:1rem; padding:0.1rem 0.6rem; font-size:0.7rem; color:var(--text-color2); margin-left:0.5rem;">#${t}</span>`).join('') : ''}
            ${chapter.language ? `<span class="language-badge"><i class="fas fa-globe"></i> ${chapter.language}</span>` : ''}
          </div>
          ${navHtml}
          <div class="chapter-content" style="line-height:1.7; max-width:70ch; margin:0 auto;">
            ${htmlContent}
          </div>
          ${navHtml}
        `;
            })
            .catch(err => {
                container.innerHTML = `<p style="color:var(--text-color2);">Error loading chapter: ${err.message}</p>`;
                console.error(err);
            });
    }
});