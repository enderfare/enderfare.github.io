document.addEventListener('DOMContentLoaded', () => {
  let allProjects = [];
  let currentSource = 'all';
  let currentTopic = 'all';
  let showForks = false;

  // ---- Fetch projects from data/projects.json ----
  async function fetchProjects() {
    try {
      const res = await fetch('/data/projects.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data;
    } catch (err) {
      console.error('Failed to load projects:', err);
      return [];
    }
  }

  // ---- Language colors (coding) ----
  function getLangColor(lang) {
    const colors = {
      'JavaScript': '#f1e05a',
      'Python': '#3572A5',
      'HTML': '#e34c26',
      'CSS': '#563d7c',
      'Java': '#b07219',
      'C#': '#178600',
      'C++': '#f34b7d',
      'C': '#555555',
      'Go': '#00ADD8',
      'Rust': '#dea584',
      'TypeScript': '#3178c6',
      'PHP': '#4F5D95',
      'Ruby': '#701516',
      'Swift': '#ffac45',
      'Kotlin': '#A97BFF',
      'Vue': '#41b883',
      'Shell': '#89e051',
      'Markdown': '#083fa1',
    };
    return colors[lang] || '#6e7681';
  }

  // ---- Build topic filters ----
  function buildTopicFilters(projects) {
    const container = document.getElementById('sidebar-topic-filters');
    const topicCount = {};
    projects.forEach(p => {
      (p.topics || []).forEach(t => { topicCount[t] = (topicCount[t] || 0) + 1; });
    });
    const topics = Object.keys(topicCount).sort();

    let html = `<label class="filter-option all-option">
      <input type="radio" name="topic" value="all" checked>
      <span>All</span>
      <span class="filter-count">${projects.length}</span>
    </label>`;
    topics.forEach(t => {
      html += `<label class="filter-option">
        <input type="radio" name="topic" value="${t}">
        <span>#${t}</span>
        <span class="filter-count">${topicCount[t]}</span>
      </label>`;
    });
    container.innerHTML = html;

    container.querySelectorAll('input[name="topic"]').forEach(radio => {
      radio.addEventListener('change', () => {
        currentTopic = radio.value;
        renderProjects();
      });
    });
  }

  // ---- Update source counts ----
  function updateSourceCounts(projects) {
    const total = projects.length;
    const github = projects.filter(p => p.source === 'github').length;
    const other = projects.filter(p => p.source === 'other').length;
    document.getElementById('source-count-all').textContent = total;
    document.getElementById('source-count-github').textContent = github;
    document.getElementById('source-count-other').textContent = other;
  }

  // ---- Build source filter listeners ----
  function buildSourceFilters() {
    const container = document.getElementById('sidebar-source-filters');
    container.querySelectorAll('input[name="source"]').forEach(radio => {
      radio.addEventListener('change', () => {
        currentSource = radio.value;
        renderProjects();
      });
    });
  }

  // ---- Render project cards ----
  function renderProjects() {
    const grid = document.getElementById('project-grid');
    let filtered = [...allProjects];

    // Source filter
    if (currentSource === 'github') {
      filtered = filtered.filter(p => p.source === 'github');
    } else if (currentSource === 'other') {
      filtered = filtered.filter(p => p.source === 'other');
    }

    // Fork filter (only applies if isFork exists)
    if (!showForks) {
      filtered = filtered.filter(p => !p.isFork);
    }

    // Topic filter
    if (currentTopic !== 'all') {
      filtered = filtered.filter(p => (p.topics || []).includes(currentTopic));
    }

    // Sort by updated date (newest first)
    filtered.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

    if (filtered.length === 0) {
      grid.innerHTML = '<p style="color: var(--text-color2); padding: 1rem 0;">No projects match the current filters.</p>';
      return;
    }

    // Inside renderProjects, where you build the grid HTML
    grid.innerHTML = filtered.map(p => {
      const langColor = getLangColor(p.language);
      const forkBadge = p.isFork ? `<span class="fork-indicator"><i class="fas fa-code-branch"></i> fork</span>` : '';
      const sourceBadge = p.source === 'github'
        ? `<span class="source-badge github"><i class="fab fa-github"></i> GitHub</span>`
        : `<span class="source-badge other"><i class="fas fa-box"></i> Other</span>`;
      const spokenBadge = p.spoken_language
        ? `<span class="spoken-badge"><i class="fas fa-globe"></i> ${p.spoken_language}</span>`
        : '';

      // --- NEW: Detect internal vs external links ---
      const isInternal = p.html_url && p.html_url.startsWith('/');
      const targetAttr = isInternal ? '' : 'target="_blank"';
      const relAttr = isInternal ? '' : 'rel="noopener noreferrer"';

      return `
    <a href="${p.html_url}" ${targetAttr} ${relAttr} class="project-card" style="position: relative; padding-right: 2.5rem;">
      <div class="card-header">
        <span class="repo-name">
          <i class="fas fa-code"></i> ${p.name}
          ${sourceBadge}
          ${spokenBadge}
          ${forkBadge}
        </span>
        <span class="repo-stars"><i class="fas fa-star"></i> ${p.stargazers_count || 0}</span>
      </div>
      <p class="repo-desc">${p.description || 'No description provided.'}</p>
      ${p.topics && p.topics.length > 0 ? `
        <div class="repo-topics">
          ${p.topics.map(t => `<span class="topic-tag">#${t}</span>`).join('')}
        </div>
      ` : ''}
      <div class="repo-meta">
        <span class="repo-language">
          ${p.language ? `<span class="lang-dot" style="background: ${langColor};"></span> ${p.language}` : ''}
        </span>
        <span class="repo-updated">Updated ${new Date(p.updated_at).toLocaleDateString()}</span>
      </div>
      <span class="github-corner"><i class="fab fa-github"></i></span>
    </a>
  `;
    }).join('');
  }

  // ---- Main init ----
  async function init() {
    try {
      allProjects = await fetchProjects();
      if (allProjects.length === 0) {
        document.getElementById('project-grid').innerHTML = '<p style="color: var(--text-color2);">No projects found.</p>';
        return;
      }

      buildTopicFilters(allProjects);
      updateSourceCounts(allProjects);
      buildSourceFilters();
      renderProjects();

      const toggle = document.getElementById('showForks');
      toggle.addEventListener('change', () => {
        showForks = toggle.checked;
        renderProjects();
      });

    } catch (err) {
      console.error('Projects page error:', err);
      document.getElementById('project-grid').innerHTML = '<p style="color: var(--text-color2);">Could not load projects.</p>';
    }
  }

  init();
});