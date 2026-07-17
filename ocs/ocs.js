document.addEventListener('DOMContentLoaded', async () => {
    const grid = document.getElementById('oc-grid');
    const count = document.getElementById('oc-count');
    let characters = [];
    let tag = 'all';
    let language = 'all';
    let sort = 'name';

    function buildFilters(container, name, values, onChange, prefix = '') {
        container.innerHTML = [`<label class="filter-option all-option"><input type="radio" name="${name}" value="all" checked><span>All</span><span class="filter-count">${characters.length}</span></label>`, ...Object.keys(values).sort().map(value => `<label class="filter-option"><input type="radio" name="${name}" value="${value}"><span>${prefix}${value}</span><span class="filter-count">${values[value]}</span></label>`)].join('');
        container.querySelectorAll(`input[name="${name}"]`).forEach(input => input.addEventListener('change', () => onChange(input.value)));
    }

    function render() {
        const filtered = characters.filter(character => (tag === 'all' || (character.tags || []).includes(tag)) && (language === 'all' || character.language === language))
            .sort((a, b) => sort === 'tags' ? (b.tags || []).length - (a.tags || []).length || a.name.localeCompare(b.name) : a.name.localeCompare(b.name));
        count.textContent = `${filtered.length} ${filtered.length === 1 ? 'character' : 'characters'}`;
        if (!filtered.length) { grid.innerHTML = '<div class="empty-state"><i class="fas fa-user-slash"></i><h2>No characters found</h2><p>Try a different filter.</p></div>'; return; }
        grid.innerHTML = filtered.map(character => `<article class="oc-card">
            <img src="${character.image || '/media/images/icon.jpg'}" alt="Portrait of ${character.name}" class="oc-avatar">
            <div class="oc-info">
                <div class="oc-card-topline"><span class="language-badge"><i class="fas fa-globe"></i> ${character.language || 'Unknown'}</span><span>${(character.tags || []).length} tags</span></div>
                <h2 class="oc-name"><a href="${character.link}">${character.name}</a></h2>
                <p class="oc-description">${character.description || 'No description yet.'}</p>
                <div class="oc-tags">${(character.tags || []).map(item => `<span class="topic-tag">#${item}</span>`).join('')}</div>
                <a class="oc-open-link" href="${character.link}">Open profile <i class="fas fa-arrow-right"></i></a>
            </div>
        </article>`).join('');
    }

    try {
        const response = await fetch('/data/ocs.json');
        if (!response.ok) throw new Error('Could not load characters');
        characters = await response.json();
        const tags = {};
        const languages = {};
        characters.forEach(character => {
            (character.tags || []).forEach(item => { tags[item] = (tags[item] || 0) + 1; });
            const itemLanguage = character.language || 'Unknown';
            languages[itemLanguage] = (languages[itemLanguage] || 0) + 1;
        });
        buildFilters(document.getElementById('sidebar-tag-filters'), 'oc-tag', tags, value => { tag = value; render(); }, '#');
        buildFilters(document.getElementById('sidebar-language-filters'), 'oc-language', languages, value => { language = value; render(); });
        document.querySelectorAll('input[name="oc-sort"]').forEach(input => input.addEventListener('change', () => { sort = input.value; render(); }));
        render();
    } catch (error) {
        console.error(error);
        grid.innerHTML = '<div class="empty-state"><i class="fas fa-triangle-exclamation"></i><h2>Characters could not load</h2></div>';
    }
});
