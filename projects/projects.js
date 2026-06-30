document.addEventListener('DOMContentLoaded', () => {
  const GITHUB_USER = 'EnderFare';
  let allRepos = [];
  let currentTopic = 'all';
  let showForks = false;

  // ---- Fetch repositories: local JSON first, then API ----
  async function fetchRepos() {
    try {
      const localRes = await fetch('/data/repos.json');
      if (localRes.ok) {
        const data = await localRes.json();
        if (Array.isArray(data) && data.length > 0) {
          return data;
        }
      }
    } catch (e) { /* fall through */ }

    const res = await fetch(`https://api.github.com/users/${GITHUB_USER}/repos?sort=updated&per_page=100`);
    if (!res.ok) throw new Error('Failed to load repositories');
    return res.json();
  }

  // ---- Language color mapping ----
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

  // ---- Build topic chips ----
  function buildTopics(repos) {
    const container = document.getElementById('topic-scroll');
    const topicCount = {};
    repos.forEach(repo => {
      if (repo.topics && Array.isArray(repo.topics)) {
        repo.topics.forEach(t => { topicCount[t] = (topicCount[t] || 0) + 1; });
      }
    });
    const topics = Object.keys(topicCount).sort();

    let html = `<span class="topic-chip all-chip ${currentTopic === 'all' ? 'active' : ''}" data-topic="all">All</span>`;
    topics.forEach(t => {
      const count = topicCount[t];
      html += `<span class="topic-chip ${currentTopic === t ? 'active' : ''}" data-topic="${t}">#${t} <span class="chip-count">${count}</span></span>`;
    });
    container.innerHTML = html;

    // Click handler for chips
    container.querySelectorAll('.topic-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        currentTopic = chip.dataset.topic;
        renderProjects();
      });
    });
  }

  // ---- Render project cards ----
  function renderProjects() {
    const grid = document.getElementById('project-grid');
    let filtered = [...allRepos];

    // Filter forks
    if (!showForks) {
      filtered = filtered.filter(repo => !repo.fork);
    }

    // Filter by topic
    if (currentTopic !== 'all') {
      filtered = filtered.filter(repo => repo.topics && repo.topics.includes(currentTopic));
    }

    // Sort by updated date (newest first)
    filtered.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

    if (filtered.length === 0) {
      grid.innerHTML = '<p style="color: var(--text-color2); padding: 1rem 0;">No projects match the current filters.</p>';
      return;
    }

    // Update active chip styles
    document.querySelectorAll('.topic-chip').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.topic === currentTopic);
    });

    grid.innerHTML = filtered.map(repo => {
      const langColor = getLangColor(repo.language);
      const isLocal = repo.isLocal || false; // you can set this in data/repos.json if you want
      return `
                <a href="${repo.html_url}" target="_blank" class="project-card ${isLocal ? 'has-local' : ''}" style="position: relative; padding-right: 2.5rem;">
                    <div class="card-header">
                        <span class="repo-name"><i class="fas fa-code"></i> ${repo.name}</span>
                        <span class="repo-stars"><i class="fas fa-star"></i> ${repo.stargazers_count}</span>
                    </div>
                    <p class="repo-desc">${repo.description || 'No description provided.'}</p>
                    ${repo.topics && repo.topics.length > 0 ? `
                        <div class="repo-topics">
                            ${repo.topics.map(t => `<span class="topic-tag">#${t}</span>`).join('')}
                        </div>
                    ` : ''}
                    <div class="repo-meta">
                        <span class="repo-language">
                            ${repo.language ? `<span class="lang-dot" style="background: ${langColor};"></span> ${repo.language}` : ''}
                        </span>
                        <span class="repo-updated">Updated ${new Date(repo.updated_at).toLocaleDateString()}</span>
                    </div>
                    <span class="github-corner"><i class="fab fa-github"></i></span>
                </a>
            `;
    }).join('');

    // Ensure FontAwesome is loaded
    if (!document.querySelector('link[href*="font-awesome"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css';
      document.head.appendChild(link);
    }
  }

  // ---- Main init ----
  async function init() {
    try {
      allRepos = await fetchRepos();
      buildTopics(allRepos);
      renderProjects();

      // Fork toggle
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