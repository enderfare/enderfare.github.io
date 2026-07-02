document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('post-grid');
    const tagFilterContainer = document.getElementById('sidebar-tag-filters');
    const listFilterContainer = document.getElementById('sidebar-list-filters');
    const sortContainer = document.getElementById('sort-filters');
    const groupContainer = document.getElementById('group-filters');
    const postCountEl = document.getElementById('post-count');
    const backToTopBtn = document.getElementById('back-to-top');
    let posts = [];
    let lists = [];

    let currentTag = 'all';
    let currentList = 'all';
    let currentSort = 'newest';
    let currentGroup = 'none';

    // ---- Back to top ----
    window.addEventListener('scroll', () => {
        if (window.scrollY > 400) {
            backToTopBtn.classList.add('visible');
        } else {
            backToTopBtn.classList.remove('visible');
        }
    });
    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

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

    function getListName(slug) {
        const list = lists.find(l => l.slug === slug);
        return list ? list.name : slug;
    }

    // ---- Get all descendant list slugs (recursive) ----
    function getDescendantSlugs(parentSlug) {
        const children = lists.filter(l => l.parent === parentSlug);
        let result = [parentSlug];
        children.forEach(child => {
            result = result.concat(getDescendantSlugs(child.slug));
        });
        return result;
    }

    // ---- Get all posts under a list (including descendants) ----
    function getPostsUnderList(listSlug) {
        const allSlugs = getDescendantSlugs(listSlug);
        return posts.filter(p => p.lists && p.lists.some(s => allSlugs.includes(s)));
    }

    // ---- Build tag filters ----
    function buildTagFilters(postList) {
        const tagSet = new Set();
        postList.forEach(post => {
            if (post.tags) post.tags.forEach(tag => tagSet.add(tag));
        });
        const tags = Array.from(tagSet).sort();

        const totalPosts = postList.length;
        let html = `<label class="filter-option"><input type="radio" name="tag" value="all" checked> <span>All</span> <span class="filter-count">${totalPosts}</span></label>`;
        tags.forEach(tag => {
            const count = postList.filter(p => p.tags && p.tags.includes(tag)).length;
            html += `<label class="filter-option"><input type="radio" name="tag" value="${tag}"> <span>#${tag}</span> <span class="filter-count">${count}</span></label>`;
        });
        tagFilterContainer.innerHTML = html;

        tagFilterContainer.querySelectorAll('input[name="tag"]').forEach(radio => {
            radio.addEventListener('change', () => {
                currentTag = radio.value;
                renderPosts(posts);
            });
        });
    }

    // ---- Build tree of lists that have posts ----
    function buildListTree(parentSlug = null) {
        const children = lists.filter(l => l.parent === parentSlug);
        const result = [];
        children.forEach(child => {
            const postsInTree = getPostsUnderList(child.slug);
            if (postsInTree.length > 0) {
                const subTree = buildListTree(child.slug);
                result.push({
                    slug: child.slug,
                    name: child.name,
                    count: postsInTree.length,
                    children: subTree
                });
            } else {
                // Check if any descendant has posts
                const hasPostDescendant = (slug) => {
                    const descendants = lists.filter(l => l.parent === slug);
                    for (const d of descendants) {
                        const postsInD = getPostsUnderList(d.slug);
                        if (postsInD.length > 0) return true;
                        if (hasPostDescendant(d.slug)) return true;
                    }
                    return false;
                };
                if (hasPostDescendant(child.slug)) {
                    const subTree = buildListTree(child.slug);
                    if (subTree.length > 0) {
                        result.push({
                            slug: child.slug,
                            name: child.name,
                            count: 0,
                            children: subTree
                        });
                    }
                }
            }
        });
        // Sort by name
        result.sort((a, b) => a.name.localeCompare(b.name));
        return result;
    }

    // ---- Render list tree as HTML with radio buttons ----
    function renderListTree(tree, indent = 0) {
        let html = '';
        tree.forEach(node => {
            const isParent = node.children && node.children.length > 0;
            const padLeft = indent * 0.8 + 0.5;
            html += `<div class="filter-tree-node" style="padding-left: ${padLeft}rem;">`;
            html += `<label class="filter-option tree-option">`;
            html += `<input type="radio" name="list" value="${node.slug}">`;
            html += `<span>`;
            if (isParent) {
                html += `<i class="fas fa-folder-open"></i> `;
            } else {
                html += `<i class="fas fa-layer-group"></i> `;
            }
            html += `${node.name}`;
            html += `</span>`;
            html += `<span class="filter-count">${node.count}</span>`;
            html += `</label>`;
            if (isParent) {
                html += `<div class="filter-tree-children">`;
                html += renderListTree(node.children, indent + 1);
                html += `</div>`;
            }
            html += `</div>`;
        });
        return html;
    }

    // ---- Build list filters (tree-based) ----
    function buildListFilters(postList) {
        if (lists.length === 0) {
            listFilterContainer.innerHTML = '<p class="empty-filter">No lists defined.</p>';
            return;
        }

        const totalPosts = postList.length;
        const tree = buildListTree();

        if (tree.length === 0) {
            listFilterContainer.innerHTML = '<p class="empty-filter">No lists with posts.</p>';
            return;
        }

        let html = `<div class="filter-tree">`;
        html += `<div class="filter-tree-node">`;
        html += `<label class="filter-option tree-option all-option">`;
        html += `<input type="radio" name="list" value="all" checked>`;
        html += `<span><i class="fas fa-list-ul"></i> All</span>`;
        html += `<span class="filter-count">${totalPosts}</span>`;
        html += `</label>`;
        html += `</div>`;
        html += renderListTree(tree);
        html += `</div>`;

        listFilterContainer.innerHTML = html;

        listFilterContainer.querySelectorAll('input[name="list"]').forEach(radio => {
            radio.addEventListener('change', () => {
                currentList = radio.value;
                renderPosts(posts);
            });
        });
    }

    // ---- Sort & group listeners ----
    function buildSortAndGroupListeners() {
        sortContainer.querySelectorAll('input[name="sort"]').forEach(radio => {
            radio.addEventListener('change', () => {
                currentSort = radio.value;
                renderPosts(posts);
            });
        });
        groupContainer.querySelectorAll('input[name="group"]').forEach(radio => {
            radio.addEventListener('change', () => {
                currentGroup = radio.value;
                renderPosts(posts);
            });
        });
    }

    // ---- Apply URL filters (list or tag) ----
    function applyUrlFilters() {
        const params = new URLSearchParams(window.location.search);
        const listParam = params.get('list');
        const tagParam = params.get('tag');

        if (listParam) {
            const listRadio = document.querySelector('input[name="list"][value="' + listParam + '"]');
            if (listRadio) {
                listRadio.checked = true;
                currentList = listParam;
            }
        } else if (tagParam) {
            const tagRadio = document.querySelector('input[name="tag"][value="' + tagParam + '"]');
            if (tagRadio) {
                tagRadio.checked = true;
                currentTag = tagParam;
            }
        }
    }

    // ---- Render posts ----
    function renderPosts(postList) {
        const activeTag = document.querySelector('input[name="tag"]:checked');
        const tagValue = activeTag ? activeTag.value : 'all';
        const activeList = document.querySelector('input[name="list"]:checked');
        const listValue = activeList ? activeList.value : 'all';
        const activeSort = document.querySelector('input[name="sort"]:checked');
        const sortValue = activeSort ? activeSort.value : 'newest';
        const activeGroup = document.querySelector('input[name="group"]:checked');
        const groupValue = activeGroup ? activeGroup.value : 'none';

        // Filter
        let filtered = [...postList];
        if (tagValue !== 'all') {
            filtered = filtered.filter(post => post.tags && post.tags.includes(tagValue));
        }
        if (listValue !== 'all') {
            const allSlugs = getDescendantSlugs(listValue);
            filtered = filtered.filter(post => post.lists && post.lists.some(s => allSlugs.includes(s)));
        }

        // Sort
        const sortByDate = (a, b) => {
            const da = new Date(a.date);
            const db = new Date(b.date);
            return sortValue === 'newest' ? db - da : da - db;
        };
        filtered.sort(sortByDate);

        // Group
        let grouped = {};
        if (groupValue === 'none') {
            grouped = { 'All': filtered };
        } else if (groupValue === 'list') {
            // Build group tree (same as before)...
            function buildGroupTree(parentSlug = null) {
                const children = lists.filter(l => l.parent === parentSlug);
                const result = [];
                children.forEach(child => {
                    const postsInTree = getPostsUnderList(child.slug);
                    if (postsInTree.length > 0) {
                        const subTree = buildGroupTree(child.slug);
                        result.push({
                            slug: child.slug,
                            name: child.name,
                            posts: postsInTree.filter(p => p.lists && p.lists.includes(child.slug)),
                            children: subTree
                        });
                    } else {
                        const hasPostDescendant = (slug) => {
                            const descendants = lists.filter(l => l.parent === slug);
                            for (const d of descendants) {
                                const postsInD = getPostsUnderList(d.slug);
                                if (postsInD.length > 0) return true;
                                if (hasPostDescendant(d.slug)) return true;
                            }
                            return false;
                        };
                        if (hasPostDescendant(child.slug)) {
                            const subTree = buildGroupTree(child.slug);
                            if (subTree.length > 0) {
                                result.push({
                                    slug: child.slug,
                                    name: child.name,
                                    posts: [],
                                    children: subTree
                                });
                            }
                        }
                    }
                });
                return result;
            }

            const tree = buildGroupTree();

            function flattenTree(node, path = []) {
                const currentPath = [...path, node.name];
                const postsHere = node.posts || [];
                const result = {};
                if (postsHere.length > 0 || node.children.length > 0) {
                    result[node.slug] = {
                        name: currentPath.join(' / '),
                        posts: postsHere,
                        children: node.children
                    };
                }
                node.children.forEach(child => {
                    const childResult = flattenTree(child, currentPath);
                    Object.assign(result, childResult);
                });
                return result;
            }

            const flatGroups = {};
            tree.forEach(node => {
                const flattened = flattenTree(node);
                Object.assign(flatGroups, flattened);
            });

            const uncategorized = filtered.filter(p => !p.lists || p.lists.length === 0);
            if (uncategorized.length > 0) {
                flatGroups['uncategorized'] = {
                    name: 'Uncategorized',
                    posts: uncategorized,
                    children: []
                };
            }

            const finalGroups = {};
            Object.keys(flatGroups).forEach(key => {
                const group = flatGroups[key];
                let allPostsInGroup = [...group.posts];
                function collectChildPosts(children) {
                    children.forEach(child => {
                        const childKey = child.slug;
                        const childGroup = flatGroups[childKey];
                        if (childGroup) {
                            allPostsInGroup = allPostsInGroup.concat(childGroup.posts);
                            collectChildPosts(childGroup.children);
                        }
                    });
                }
                collectChildPosts(group.children);
                const uniquePosts = [];
                const seenSlugs = new Set();
                allPostsInGroup.forEach(p => {
                    if (!seenSlugs.has(p.slug)) {
                        seenSlugs.add(p.slug);
                        uniquePosts.push(p);
                    }
                });
                uniquePosts.sort(sortByDate);
                finalGroups[group.name] = uniquePosts;
            });

            const sortedKeys = Object.keys(finalGroups).sort();
            grouped = {};
            sortedKeys.forEach(key => {
                grouped[key] = finalGroups[key];
            });

        } else if (groupValue === 'tag') {
            filtered.forEach(p => {
                let key = 'Untagged';
                if (p.tags && p.tags.length > 0) {
                    key = p.tags[0];
                }
                if (!grouped[key]) grouped[key] = [];
                grouped[key].push(p);
            });
            const sortedKeys = Object.keys(grouped).sort();
            const newGrouped = {};
            sortedKeys.forEach(key => { newGrouped[key] = grouped[key]; });
            grouped = newGrouped;
        }

        // Update count
        const total = postList.length;
        const shown = filtered.length;
        let countText = `${shown} post${shown !== 1 ? 's' : ''}`;
        if (tagValue !== 'all') countText += ` · #${tagValue}`;
        if (listValue !== 'all') countText += ` · list: ${getListName(listValue)}`;
        if (sortValue === 'oldest') countText += ' · oldest first';
        if (groupValue !== 'none') countText += ` · grouped by ${groupValue}`;
        postCountEl.textContent = countText;

        if (filtered.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><i class="fas fa-inbox"></i></div>
                    <h3>No posts found</h3>
                    <p>Try different filters.</p>
                </div>
            `;
            return;
        }

        let html = '';
        const groupKeys = Object.keys(grouped);
        groupKeys.forEach(groupName => {
            const postsInGroup = grouped[groupName];
            if (postsInGroup.length === 0) return;

            html += `<div class="group-section">`;
            if (groupValue !== 'none') {
                html += `<h3 class="group-header"><i class="fas fa-folder-open"></i> ${groupName}</h3>`;
            }
            postsInGroup.forEach(post => {
                html += renderCard(post);
            });
            html += `</div>`;
        });

        grid.innerHTML = html;
    }

    // ---- Render a single card ----
    function renderCard(post) {
        // ... (same as before, no changes)
        const date = new Date(post.date);
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = monthNames[date.getMonth()];
        const day = date.getDate();
        const year = date.getFullYear();

        let readTime = '';
        if (post.readTime) {
            readTime = post.readTime;
        } else if (post.excerpt) {
            readTime = estimateReadTime(post.excerpt, post.format || 'text') + ' min read';
        }

        let parentInfo = '';
        if (post.parent) {
            const parentPost = posts.find(p => p.slug === post.parent);
            if (parentPost) {
                parentInfo = `<span class="parent-badge title-parent"><i class="fas fa-level-up-alt"></i> <a href="post.html?slug=${parentPost.slug}">${parentPost.title}</a></span>`;
            }
        }

        let tagsHtml = '';
        if (post.tags && post.tags.length > 0) {
            tagsHtml = post.tags.map(tag => `<span class="post-tag">#${tag}</span>`).join('');
        }

        let listBadges = '';
        if (post.lists && Array.isArray(post.lists)) {
            listBadges = post.lists.map(slug => {
                const name = getListName(slug);
                return `<span class="list-badge"><i class="fas fa-layer-group"></i> ${name}</span>`;
            }).join(' ');
        }

        let metaHtml = '';
        if (tagsHtml || listBadges) {
            metaHtml = `<div class="excerpt-meta">${tagsHtml} ${listBadges}</div>`;
        }

        return `
            <article class="post-card">
                <div class="post-header">
                    <div class="post-title-wrapper">
                        <h2 class="post-title">
                            <a href="post.html?slug=${post.slug}">${post.title}</a>
                        </h2>
                        ${parentInfo}
                    </div>
                    <span class="post-date-badge">
                        <span class="month">${month}</span>
                        <span class="day">${day}</span>
                        <span class="year">${year}</span>
                    </span>
                </div>

                <div class="post-excerpt">
                    ${post.excerpt ? renderExcerpt(post.excerpt, post.format) : ''}
                    <div class="excerpt-footer">
                        ${metaHtml}
                        <a class="post-readmore" href="post.html?slug=${post.slug}">
                            Read more →
                            ${readTime ? `<span class="post-readtime"><i class="far fa-clock"></i> ${readTime}</span>` : ''}
                        </a>
                    </div>
                </div>
            </article>
        `;
    }

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

    // ---- Fetch data ----
    fetch('posts.json')
        .then(res => res.json())
        .then(data => {
            lists = data.lists || [];
            posts = data.posts || [];
            buildTagFilters(posts);
            buildListFilters(posts);
            buildSortAndGroupListeners();
            applyUrlFilters(); // <-- NEW: auto-select filter from URL
            renderPosts(posts);
        })
        .catch(err => {
            grid.innerHTML = '<p style="color: var(--text-color2);">Sorry, couldn\'t load posts.</p>';
            console.error(err);
        });
});