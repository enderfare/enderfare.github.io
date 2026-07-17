document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('slug');
    const container = document.getElementById('post-content');
    const navContainer = document.getElementById('post-navigation');
    const listTreeContainer = document.getElementById('list-tree');
    let allPosts = [];
    let allLists = [];

    if (!slug) {
        container.innerHTML = '<p>No post specified.</p>';
        return;
    }

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

    // ---- Build full list tree ----
    function buildFullListTree(lists, parentSlug = null) {
        const children = lists.filter(l => l.parent === parentSlug);
        const sorted = children.sort((a, b) => a.name.localeCompare(b.name));
        return sorted.map(list => {
            const subTree = buildFullListTree(lists, list.slug);
            return { ...list, children: subTree };
        });
    }

    // ---- Get ancestors of a list (for breadcrumb) ----
    function getAncestors(lists, listSlug) {
        const path = [];
        let current = lists.find(l => l.slug === listSlug);
        while (current) {
            path.unshift(current);
            if (!current.parent) break;
            current = lists.find(l => l.slug === current.parent);
        }
        return path;
    }

    // ---- Filter tree to show relevant lists AND their empty parents ----
    function filterTreeForPost(tree, postSlugs, allPosts) {
        const relevantSlugs = new Set(postSlugs);
        postSlugs.forEach(slug => {
            const ancestors = getAncestors(allLists, slug);
            ancestors.forEach(a => relevantSlugs.add(a.slug));
        });
        // Also include siblings (lists with same parent as any relevant list)
        const extraSlugs = new Set();
        relevantSlugs.forEach(slug => {
            const list = allLists.find(l => l.slug === slug);
            if (list && list.parent) {
                const siblings = allLists.filter(l => l.parent === list.parent);
                siblings.forEach(s => extraSlugs.add(s.slug));
            }
        });
        extraSlugs.forEach(s => relevantSlugs.add(s));

        // Also include any parent that has relevant descendants (even if empty itself)
        const allParentSlugs = new Set();
        relevantSlugs.forEach(slug => {
            const list = allLists.find(l => l.slug === slug);
            if (list && list.parent) {
                let current = list;
                while (current && current.parent) {
                    const parent = allLists.find(l => l.slug === current.parent);
                    if (parent) {
                        allParentSlugs.add(parent.slug);
                        current = parent;
                    } else {
                        break;
                    }
                }
            }
        });
        allParentSlugs.forEach(s => relevantSlugs.add(s));

        function filterNode(node) {
            // Keep node if it's relevant OR if any descendant is relevant
            const hasRelevantDescendant = node.children.some(child => {
                return filterNode(child).keep;
            });

            if (relevantSlugs.has(node.slug) || hasRelevantDescendant) {
                const filteredChildren = node.children
                    .map(child => filterNode(child))
                    .filter(result => result.keep)
                    .map(result => result.node);
                return {
                    keep: true,
                    node: { ...node, children: filteredChildren }
                };
            }
            return { keep: false, node: null };
        }

        const results = tree
            .map(node => filterNode(node))
            .filter(result => result.keep)
            .map(result => result.node);
        return results;
    }

    // ---- Render list tree as HTML ----
    function renderListTree(tree, currentPostSlug, postList) {
        if (!tree || tree.length === 0) {
            return '<p class="no-lists">No series available.</p>';
        }

        let html = '<ul class="list-tree">';
        tree.forEach(list => {
            const postsInList = postList.filter(p => p.lists && p.lists.includes(list.slug));
            const hasPosts = postsInList.length > 0;
            const hasChildren = list.children && list.children.length > 0;
            const isActive = postsInList.some(p => p.slug === currentPostSlug);

            // Only show if it has posts OR has children
            if (hasPosts || hasChildren) {
                html += `<li class="list-node ${isActive ? 'active-list' : ''}">`;
                html += `<div class="list-name"><i class="fas fa-folder-open"></i> ${list.name}`;
                if (!hasPosts && hasChildren) {
                    html += ` <span class="empty-parent-badge">(parent)</span>`;
                }
                html += `</div>`;
                if (hasPosts) {
                    html += '<ul class="post-in-list">';
                    const sortedPosts = postsInList.sort((a, b) => new Date(b.date) - new Date(a.date));
                    sortedPosts.forEach(p => {
                        const isCurrent = p.slug === currentPostSlug;
                        html += `<li class="post-in-list-item ${isCurrent ? 'current-post' : ''}">
                            <a href="?slug=${p.slug}">${p.title}</a>
                        </li>`;
                    });
                    html += '</ul>';
                }
                if (hasChildren) {
                    html += renderListTree(list.children, currentPostSlug, postList);
                }
                html += '</li>';
            }
        });
        html += '</ul>';
        return html;
    }

    // ---- Build breadcrumb path for a list slug ----
    function buildBreadcrumb(listSlug) {
        const path = getAncestors(allLists, listSlug);
        return path.map(l => l.name).join(' / ');
    }

    // ---- Get display name for a list slug ----
    function getListName(slug) {
        const list = allLists.find(l => l.slug === slug);
        return list ? list.name : slug;
    }

    // ---- Main fetch ----
    window.blogData.getBlogData()
        .then(data => {
            allLists = data.lists || [];
            allPosts = data.posts || [];
            const sorted = [...allPosts].sort((a, b) => new Date(b.date) - new Date(a.date));
            const currentIndex = sorted.findIndex(p => p.slug === slug);

            if (currentIndex === -1) {
                container.innerHTML = '<p>Post not found.</p>';
                return;
            }

            const post = sorted[currentIndex];
            const prevPost = sorted[currentIndex + 1] || null;
            const nextPost = sorted[currentIndex - 1] || null;

            const contentPath = window.blogData.getPostContentPath(post);

            return fetch(contentPath)
                .then(res => {
                    if (!res.ok) throw new Error(`Content file not found: ${contentPath}`);
                    return res.text();
                })
                .then(rawContent => {
                    const readTime = estimateReadTime(rawContent, post.format);

                    let renderedContent = '';
                    if (post.format === 'markdown') {
                        renderedContent = marked.parse(rawContent || '');
                    } else if (post.format === 'html') {
                        renderedContent = rawContent || '';
                    } else {
                        const div = document.createElement('div');
                        div.textContent = rawContent || '';
                        renderedContent = `<pre style="white-space: pre-wrap;">${div.innerHTML}</pre>`;
                    }

                    // ---- Build breadcrumb for the post's lists ----
                    let breadcrumbHtml = '';
                    if (post.lists && post.lists.length > 0) {
                        const breadcrumbs = post.lists.map(slug => {
                            const path = buildBreadcrumb(slug);
                            return `<span class="breadcrumb-item"><a href="/blog/index.html?list=${encodeURIComponent(slug)}">${path}</a></span>`;
                        });
                        breadcrumbHtml = `<div class="post-breadcrumb"><i class="fas fa-link"></i> ${breadcrumbs.join(' &nbsp;|&nbsp; ')}</div>`;
                    }

                    // ---- Build context (parent, children) ----
                    let contextHtml = '';

                    let parentPost = null;
                    if (post.parent) {
                        parentPost = allPosts.find(p => p.slug === post.parent);
                        if (parentPost) {
                            contextHtml += `<div class="post-context-parent"><i class="fas fa-level-up-alt"></i> Parent: <a href="?slug=${parentPost.slug}">${parentPost.title}</a></div>`;
                        }
                    }

                    const children = allPosts.filter(p => p.parent === post.slug);
                    if (children.length > 0) {
                        const childLinks = children.map(child => {
                            return `<a href="?slug=${child.slug}" class="child-link">${child.title}</a>`;
                        }).join(' · ');
                        contextHtml += `<div class="post-context-children"><i class="fas fa-sitemap"></i> Subposts: ${childLinks}</div>`;
                    }

                    // ---- Render main post ----
                    container.innerHTML = `
                        <h1>${post.title}</h1>
                        <div class="post-meta">
                            <span class="post-date"><i class="far fa-calendar-alt"></i> ${window.blogData.formatDate(post.date)}</span>
                            <span class="post-readtime"><i class="far fa-clock"></i> ${readTime} min read</span>
                            <div class="post-tags">
                                ${post.tags.map(tag => `<span class="post-tag">#${tag}</span>`).join('')}
                            </div>
                        </div>
                        ${breadcrumbHtml}
                        ${contextHtml ? `<div class="post-context">${contextHtml}</div>` : ''}
                        <div class="post-body">${renderedContent}</div>
                    `;

                    document.title = `${post.title} · Ender's Domain`;

                    // ---- Navigation: prev | next (no "Back to Blog") ----
                    let navHtml = '';
                    if (prevPost) {
                        navHtml += `<a href="?slug=${prevPost.slug}" class="prev-post"><i class="fas fa-chevron-left"></i> ${prevPost.title}</a>`;
                    } else {
                        navHtml += `<span class="nav-placeholder"></span>`;
                    }
                    if (nextPost) {
                        navHtml += `<a href="?slug=${nextPost.slug}" class="next-post">${nextPost.title} <i class="fas fa-chevron-right"></i></a>`;
                    } else {
                        navHtml += `<span class="nav-placeholder"></span>`;
                    }
                    navContainer.innerHTML = navHtml;

                    // ---- Build filtered list tree (only lists the post belongs to) ----
                    if (allLists.length > 0 && post.lists && post.lists.length > 0) {
                        const fullTree = buildFullListTree(allLists);
                        const filteredTree = filterTreeForPost(fullTree, post.lists, allPosts);
                        if (filteredTree.length > 0) {
                            const treeHtml = renderListTree(filteredTree, post.slug, allPosts);
                            listTreeContainer.innerHTML = treeHtml;
                        } else {
                            listTreeContainer.innerHTML = '<p class="no-lists">No series available.</p>';
                        }
                    } else {
                        listTreeContainer.innerHTML = '<p class="no-lists">No series defined.</p>';
                    }
                });
        })
        .catch(err => {
            container.innerHTML = `<p>Error loading post: ${err.message}</p>`;
            console.error(err);
        });
});
