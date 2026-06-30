document.addEventListener('DOMContentLoaded', () => {
    const GITHUB_USER = 'EnderFare';

    // ---- Fetch blog posts ----
    async function fetchPosts() {
        const res = await fetch('/blog/posts.json');
        if (!res.ok) throw new Error('Failed to load posts');
        return res.json();
    }

    // ---- Fetch repositories: try local JSON first, then API ----
    async function fetchRepos() {
        // Try to load from the local data file (updated by GitHub Action)
        try {
            const localRes = await fetch('/data/repos.json');
            if (localRes.ok) {
                const data = await localRes.json();
                // The file should contain the full array of repos
                if (Array.isArray(data) && data.length > 0) {
                    return data;
                }
            }
        } catch (e) {
            // fall through to API
        }

        // Fallback: fetch from GitHub API
        const res = await fetch(`https://api.github.com/users/${GITHUB_USER}/repos?sort=updated&per_page=100`);
        if (!res.ok) throw new Error('Failed to load repositories from GitHub API');
        return res.json();
    }

    // ---- Get the latest non‑fork repo ----
    async function getLatestRepo() {
        const repos = await fetchRepos();
        const nonForks = repos.filter(repo => !repo.fork);
        if (nonForks.length === 0) throw new Error('No non‑fork repositories found');
        // already sorted by updated date (descending) from the API
        return nonForks[0];
    }

    // ---- Render latest project ----
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
        // ensure FontAwesome is loaded
        if (!document.querySelector('link[href*="font-awesome"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css';
            document.head.appendChild(link);
        }
    }

    // ---- Render latest blog post ----
    function renderLatestPost(posts) {
        const container = document.getElementById('latest-post');
        if (!posts || posts.length === 0) {
            container.innerHTML = '<p>No blog posts yet.</p>';
            return;
        }
        const sorted = [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));
        const latest = sorted[0];
        container.innerHTML = `
            <p><strong><a href="/blog/post.html?slug=${latest.slug}">${latest.title}</a></strong></p>
            <p style="color: var(--text-color2);">${latest.excerpt || ''}</p>
            <p><small>${new Date(latest.date).toLocaleDateString()}</small></p>
        `;
    }

    // ---- Render pinned posts with a "tab" (left padding) ----
    function renderPinnedPosts(posts) {
        const container = document.getElementById('pinned-posts');
        const pinned = posts.filter(p => p.pinned === true);
        if (pinned.length === 0) {
            container.innerHTML = '<p>No pinned posts.</p>';
            return;
        }
        const list = pinned.map(post =>
            `<li><a href="/blog/post.html?slug=${post.slug}">${post.title}</a> <small>(${new Date(post.date).toLocaleDateString()})</small></li>`
        ).join('');
        container.innerHTML = `<ul style="padding-left: 1.5rem;">${list}</ul>`;
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