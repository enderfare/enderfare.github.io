document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('slug');

    if (!slug) {
        document.getElementById('post-content').innerHTML = '<p>No post specified.</p>';
        return;
    }

    fetch('posts.json')
        .then(res => res.json())
        .then(posts => {
            const post = posts.find(p => p.slug === slug);

            if (!post) {
                document.getElementById('post-content').innerHTML = '<p>Post not found.</p>';
                return;
            }

            // ─── BUILD CONTENT FILE PATH FROM DATE ───
            const dateParts = post.date.split('-'); // "2026-06-30" → ["2026","06","30"]
            const year = dateParts[0];
            const month = dateParts[1];
            const day = dateParts[2];

            let ext = '';
            if (post.format === 'markdown') ext = '.md';
            else if (post.format === 'html') ext = '.html';
            else ext = '.txt';

            const contentPath = `content/${year}/${month}/${day}/${post.slug}${ext}`;

            // ─── FETCH CONTENT ───
            return fetch(contentPath)
                .then(res => {
                    if (!res.ok) throw new Error(`Content file not found: ${contentPath}`);
                    return res.text();
                })
                .then(rawContent => {
                    // ─── RENDER BASED ON FORMAT ───
                    let renderedContent = '';

                    if (post.format === 'markdown') {
                        renderedContent = marked.parse(rawContent || '');
                    } else if (post.format === 'html') {
                        renderedContent = rawContent || '';
                    } else {
                        // Plain text – escape it
                        const div = document.createElement('div');
                        div.textContent = rawContent || '';
                        renderedContent = `<pre style="white-space: pre-wrap;">${div.innerHTML}</pre>`;
                    }

                    // ─── BUILD THE PAGE ───
                    document.getElementById('post-content').innerHTML = `
            <h1>${post.title}</h1>
            <div class="post-meta">
              <span class="post-date">${formatDate(post.date)}</span>
              <div class="post-tags">
                ${post.tags.map(tag => `<span class="post-tag">#${tag}</span>`).join('')}
              </div>
            </div>
            <div class="post-body">${renderedContent}</div>
          `;

                    document.title = `${post.title} · Ender's Domain`;
                });
        })
        .catch(err => {
            document.getElementById('post-content').innerHTML = `
        <p>Error loading post: ${err.message}</p>
      `;
            console.error(err);
        });

    function formatDate(dateStr) {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }
});