document.addEventListener('DOMContentLoaded', async () => {
    const grid = document.getElementById('novel-grid');
    const tagContainer = document.getElementById('sidebar-tag-filters');
    const langContainer = document.getElementById('sidebar-language-filters');
    const count = document.getElementById('novel-count');
    let novels = [];
    let currentTag = 'all';
    let currentLanguage = 'all';
    let currentSort = 'title';

    const fetchJSON = async url => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Couldn't load ${url}`);
        return response.json();
    };

    const formatDate = date => new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric', timeZone: 'UTC' })
        .format(new Date(`${date}T00:00:00Z`));

    function buildRadioFilters(container, name, values, onChange) {
        const labels = Object.keys(values).sort((a, b) => a.localeCompare(b));
        container.innerHTML = [
            `<label class="filter-option all-option"><input type="radio" name="${name}" value="all" checked><span>All</span><span class="filter-count">${novels.length}</span></label>`,
            ...labels.map(value => `<label class="filter-option"><input type="radio" name="${name}" value="${value}"><span>${name === 'novel-tag' ? '#' : ''}${value}</span><span class="filter-count">${values[value]}</span></label>`)
        ].join('');
        container.querySelectorAll(`input[name="${name}"]`).forEach(input => input.addEventListener('change', () => onChange(input.value)));
    }

    function getLatestChapter(novel) {
        return (novel.chapters || []).reduce((latest, chapter) => !latest || chapter.date > latest.date ? chapter : latest, null);
    }

    function render() {
        let filtered = novels.filter(novel =>
            (currentTag === 'all' || (novel.tags || []).includes(currentTag))
            && (currentLanguage === 'all' || novel.language === currentLanguage)
        );

        filtered = [...filtered].sort((a, b) => {
            if (currentSort === 'chapters') return (b.chapters || []).length - (a.chapters || []).length;
            if (currentSort === 'newest') return (getLatestChapter(b)?.date || '').localeCompare(getLatestChapter(a)?.date || '');
            return a.title.localeCompare(b.title);
        });

        count.textContent = `${filtered.length} ${filtered.length === 1 ? 'story' : 'stories'}`;
        if (!filtered.length) {
            grid.innerHTML = '<div class="empty-state"><i class="fas fa-book-open"></i><h2>No stories found</h2><p>Try a different filter.</p></div>';
            return;
        }

        grid.innerHTML = filtered.map(novel => {
            const latest = getLatestChapter(novel);
            const chapterCount = (novel.chapters || []).length;
            return `<article class="novel-card">
                ${novel.cover ? `<img src="${novel.cover}" alt="Cover for ${novel.title}" class="novel-cover">` : '<div class="novel-cover novel-cover--placeholder"><i class="fas fa-book"></i></div>'}
                <div class="novel-info">
                    <div class="novel-card-topline"><span class="language-badge"><i class="fas fa-globe"></i> ${novel.language || 'Unknown'}</span><span>${chapterCount} ${chapterCount === 1 ? 'chapter' : 'chapters'}</span></div>
                    <h2 class="novel-title"><a href="/novels/novel.html?novel=${novel.slug}">${novel.title}</a></h2>
                    <p class="novel-description">${novel.description || 'No description yet.'}</p>
                    <div class="novel-meta">${(novel.tags || []).map(tag => `<span class="topic-tag">#${tag}</span>`).join('')}</div>
                    <div class="novel-card-footer"><span>${latest ? `Last update ${formatDate(latest.date)}` : 'No chapters yet'}</span><a href="/novels/novel.html?novel=${novel.slug}">Open story <i class="fas fa-arrow-right"></i></a></div>
                </div>
            </article>`;
        }).join('');
    }

    try {
        const manifest = await fetchJSON('/novels/manifest.json');
        novels = (await Promise.all((manifest.novels || []).map(async slug => ({ slug, ...await fetchJSON(`/novels/${slug}/data.json`) }))));
        const tags = {};
        const languages = {};
        novels.forEach(novel => {
            (novel.tags || []).forEach(tag => { tags[tag] = (tags[tag] || 0) + 1; });
            const language = novel.language || 'Unknown';
            languages[language] = (languages[language] || 0) + 1;
        });
        buildRadioFilters(tagContainer, 'novel-tag', tags, value => { currentTag = value; render(); });
        buildRadioFilters(langContainer, 'novel-language', languages, value => { currentLanguage = value; render(); });
        document.querySelectorAll('input[name="novel-sort"]').forEach(input => input.addEventListener('change', () => { currentSort = input.value; render(); }));
        render();
    } catch (error) {
        console.error(error);
        grid.innerHTML = '<div class="empty-state"><i class="fas fa-triangle-exclamation"></i><h2>Stories could not load</h2><p>Please try again later.</p></div>';
    }
});
