/* Shared blog data helpers. Keep post metadata in /data/blog.json. */
(function () {
    const DATA_URL = '/data/blog.json';

    async function getBlogData() {
        const response = await fetch(DATA_URL);
        if (!response.ok) throw new Error(`Couldn't load blog data (${response.status}).`);
        const data = await response.json();
        return {
            lists: Array.isArray(data.lists) ? data.lists : [],
            posts: Array.isArray(data.posts) ? data.posts : []
        };
    }

    function getPostContentPath(post) {
        if (post.content) return post.content;
        const [year, month, day] = post.date.split('-');
        const extensions = { markdown: 'md', html: 'html', text: 'txt' };
        return `/blog/content/${year}/${month}/${day}/${post.slug}.${extensions[post.format] || 'txt'}`;
    }

    function formatDate(date) {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC'
        }).format(new Date(`${date}T00:00:00Z`));
    }

    window.blogData = { getBlogData, getPostContentPath, formatDate };
}());
