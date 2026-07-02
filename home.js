document.addEventListener('DOMContentLoaded', () => {
    const GITHUB_USER = 'EnderFare';

    // ---- Fetch blog posts ----
    async function fetchPosts() {
        const res = await fetch('/blog/posts.json');
        if (!res.ok) throw new Error('Failed to load posts');
        const data = await res.json();
        return data.posts || [];
    }

    // ---- Fetch repositories ----
    async function fetchRepos() {
        try {
            const localRes = await fetch('/data/repos.json');
            if (localRes.ok) {
                const data = await localRes.json();
                if (Array.isArray(data) && data.length > 0) return data;
            }
        } catch (e) { /* fall through */ }

        const res = await fetch(`https://api.github.com/users/${GITHUB_USER}/repos?sort=updated&per_page=100`);
        if (!res.ok) throw new Error('Failed to load repositories from GitHub API');
        return res.json();
    }

    // ---- Get latest non‑fork repo ----
    async function getLatestRepo() {
        const repos = await fetchRepos();
        const nonForks = repos.filter(repo => !repo.fork);
        if (nonForks.length === 0) throw new Error('No non‑fork repositories found');
        return nonForks[0];
    }

    // ---- Estimate read time ----
    function estimateReadTime(content, format) {
        let text = content || '';
        if (format === 'markdown') {
            text = text.replace(/[#*`_\[\]()!>]/g, ' ');
        } else if (format === 'html') {
            const div = document.createElement('div');
            div.innerHTML = text;
            text = div.textContent || '';
        }
        const words = text.trim().split(/\s+/).length;
        const minutes = Math.ceil(words / 200);
        return minutes > 0 ? minutes : 1;
    }

    // ---- Get list name from slug (mock) ----
    function getListName(slug) {
        // We don't have lists data here, but we can just return the slug or a friendly name
        // For simplicity, we'll return the slug as is.
        return slug;
    }

    // ---- Render a single post card (matches blog style) ----
    function renderPostCard(post, isPinned = false) {
        const date = new Date(post.date);
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = monthNames[date.getMonth()];
        const day = date.getDate();
        const year = date.getFullYear();

        // Estimate read time from excerpt or content (we don't have full content here)
        let readTime = '';
        if (post.readTime) {
            readTime = post.readTime;
        } else if (post.excerpt) {
            readTime = estimateReadTime(post.excerpt, post.format || 'text') + ' min read';
        }

        // Tags
        let tagsHtml = '';
        if (post.tags && post.tags.length > 0) {
            tagsHtml = post.tags.map(tag => `<span class="post-tag">#${tag}</span>`).join('');
        }

        // Lists badges
        let listBadges = '';
        if (post.lists && Array.isArray(post.lists)) {
            listBadges = post.lists.map(slug => {
                const name = getListName(slug);
                return `<span class="list-badge"><i class="fas fa-layer-group"></i> ${name}</span>`;
            }).join(' ');
        }

        // Parent badge if any
        let parentInfo = '';
        if (post.parent) {
            parentInfo = `<span class="parent-badge title-parent"><i class="fas fa-level-up-alt"></i> subpost</span>`;
        }

        // Pinned badge
        const pinnedBadge = isPinned ? `<span class="pinned-badge"><i class="fas fa-thumbtack"></i> Pinned</span>` : '';

        return `
      <article class="post-card">
        <div class="post-header">
          <div class="post-title-wrapper">
            <h2 class="post-title">
              <a href="/blog/post.html?slug=${post.slug}">${post.title}</a>
            </h2>
            ${pinnedBadge}
            ${parentInfo}
          </div>
          <span class="post-date-badge">
            <span class="month">${month}</span>
            <span class="day">${day}</span>
            <span class="year">${year}</span>
          </span>
        </div>

        <div class="post-excerpt">
          ${post.excerpt ? `<p>${post.excerpt}</p>` : ''}
          <div class="excerpt-footer">
            <div class="excerpt-meta">
              ${tagsHtml} ${listBadges}
            </div>
            <a class="post-readmore" href="/blog/post.html?slug=${post.slug}">
              Read more →
              ${readTime ? `<span class="post-readtime"><i class="far fa-clock"></i> ${readTime}</span>` : ''}
            </a>
          </div>
        </div>
      </article>
    `;
    }

    // ---- Render latest project (already a card) ----
    function renderProject(repo) {
        const container = document.getElementById('latest-project');
        if (!repo) {
            container.innerHTML = '<p>No project found.</p>';
            return;
        }
        container.innerHTML = `
    <div class="project-card" style="margin-bottom: 1rem; position: relative; padding-right: 2.5rem;">
      <div class="card-header">
        <span class="repo-name"><i class="fas fa-code"></i> ${repo.name}</span>
        <span class="repo-stars"><i class="fas fa-star"></i> ${repo.stargazers_count}</span>
      </div>
      <p class="repo-desc">${repo.description || 'No description provided.'}</p>
      ${repo.topics && repo.topics.length > 0 ? `
        <div class="repo-topics" style="margin: 0.6rem 0 0.8rem 0;">
          ${repo.topics.map(t => `<span class="topic-tag" style="display: inline-block; background: var(--bg-color); border: 1px solid var(--text-color2); border-radius: 1.2rem; padding: 0.1rem 0.6rem; font-size: 0.7rem; color: var(--text-color2); margin-right: 0.3rem;">#${t}</span>`).join('')}
        </div>
      ` : ''}
      <div class="repo-meta">
        <span class="repo-language">
          ${repo.language ? `<span class="lang-dot" style="background: #6e7681;"></span> ${repo.language}` : ''}
        </span>
        <span class="repo-updated">Updated ${new Date(repo.updated_at).toLocaleDateString()}</span>
      </div>
      <a href="${repo.html_url}" target="_blank" class="github-corner" style="position: absolute; bottom: 0.8rem; right: 0.8rem; color: var(--text-color2); font-size: 1.2rem; opacity: 0.4; transition: 0.2s; text-decoration: none;">
        <i class="fab fa-github"></i>
      </a>
    </div>
  `;
    }

    // ---- Render latest blog post (as a card) ----
    function renderLatestPost(posts) {
        const container = document.getElementById('latest-post');
        if (!posts || posts.length === 0) {
            container.innerHTML = '<p>No blog posts yet.</p>';
            return;
        }
        const sorted = [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));
        const latest = sorted[0];
        container.innerHTML = renderPostCard(latest);
    }

    // ---- Render pinned posts (each as a card) ----
    function renderPinnedPosts(posts) {
        const container = document.getElementById('pinned-posts');
        const pinned = posts.filter(p => p.pinned === true);
        if (pinned.length === 0) {
            container.innerHTML = '<p>No pinned posts.</p>';
            return;
        }
        const cards = pinned.map(post => renderPostCard(post, true)).join('');
        container.innerHTML = `<div class="pinned-grid">${cards}</div>`;
    }

    // ---- Main ----
    async function init() {
        try {
            const posts = await fetchPosts();
            renderLatestPost(posts);
            renderPinnedPosts(posts);

            const repo = await getLatestRepo();
            renderProject(repo);
        } catch (err) {
            console.error('Home page error:', err);
            document.getElementById('latest-project').innerHTML = `<p style="color: var(--text-color2);">Could not load latest project.</p>`;
            document.getElementById('latest-post').innerHTML = `<p style="color: var(--text-color2);">Could not load latest post.</p>`;
            document.getElementById('pinned-posts').innerHTML = `<p style="color: var(--text-color2);">Could not load pinned posts.</p>`;
        }
    }

    init();
});
