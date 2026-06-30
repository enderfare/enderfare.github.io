document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('post-grid');
    const filterContainer = document.getElementById('tag-filters');
    let posts = [];

    // ─── FETCH POSTS ───
    fetch('posts.json')
        .then(res => res.json())
        .then(data => {
            posts = data;
            buildTagFilters(posts);
            renderPosts(posts);
        })
        .catch(err => {
            grid.innerHTML = '<p>Sorry, couldn\'t load posts.</p>';
            console.error(err);
        });

    // ─── BUILD TAG FILTERS ───
    function buildTagFilters(postList) {
        const tagSet = new Set();
        postList.forEach(post => {
            if (post.tags) post.tags.forEach(tag => tagSet.add(tag));
        });
        const tags = Array.from(tagSet).sort();

        let html = `<label><input type="radio" name="tag" value="all" checked> All</label>`;
        tags.forEach(tag => {
            html += `<label><input type="radio" name="tag" value="${tag}"> #${tag}</label>`;
        });
        filterContainer.innerHTML = html;

        filterContainer.querySelectorAll('input[name="tag"]').forEach(radio => {
            radio.addEventListener('change', () => {
                renderPosts(posts);
            });
        });
    }

    // ─── RENDER POSTS (with pin support) ───
    function renderPosts(postList) {
        const activeFilter = document.querySelector('input[name="tag"]:checked');
        const filterValue = activeFilter ? activeFilter.value : 'all';

        // Separate pinned from non‑pinned
        const pinned = postList.filter(p => p.pinned === true);
        let normal = postList.filter(p => p.pinned !== true);

        // Apply tag filter to normal posts (ignore filter for pinned)
        if (filterValue !== 'all') {
            normal = normal.filter(post => post.tags && post.tags.includes(filterValue));
        }

        // Sort both by date (newest first)
        const sortByDate = (a, b) => new Date(b.date) - new Date(a.date);
        pinned.sort(sortByDate);
        normal.sort(sortByDate);

        // Combine: pinned first, then normal
        const filtered = [...pinned, ...normal];

        if (filtered.length === 0) {
            grid.innerHTML = '<p>No posts found for this tag.</p>';
            return;
        }

        grid.innerHTML = filtered.map(post => `
      <article class="post-card ${post.pinned ? 'pinned-post' : ''}">
        <div class="post-header">
          <h2 class="post-title">
            <a href="post.html?slug=${post.slug}">${post.title}</a>
            ${post.pinned ? '<span class="pinned-badge">📌 Pinned</span>' : ''}
          </h2>
          <span class="post-date">${formatDate(post.date)}</span>
        </div>
        <div class="post-tags">
          ${post.tags.map(tag => `<span class="post-tag">#${tag}</span>`).join('')}
        </div>
        <div class="post-excerpt">
          ${post.excerpt ? renderExcerpt(post.excerpt, post.format) : ''}
          <a class="post-readmore" href="post.html?slug=${post.slug}">Read more →</a>
        </div>
      </article>
    `).join('');
    }

    // ─── RENDER EXCERPT ───
    function renderExcerpt(excerpt, format) {
        if (format === 'markdown') {
            return marked.parseInline(excerpt);
        } else if (format === 'html') {
            return excerpt;
        } else {
            const div = document.createElement('div');
            div.textContent = excerpt;
            return div.innerHTML;
        }
    }

    // ─── DATE FORMATTER ───
    function formatDate(dateStr) {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }
});