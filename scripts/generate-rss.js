const fs = require('fs');
const path = require('path');

const postsPath = path.join(__dirname, '../data/blog.json');
const blog = JSON.parse(fs.readFileSync(postsPath, 'utf8'));

const siteUrl = 'https://enderfare.github.io';
const now = new Date().toUTCString();

let items = '';
blog.posts.forEach(post => {
  items += `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${siteUrl}/blog/post.html?post=${post.slug || post.id}</link>
      <guid>${siteUrl}/blog/post.html?post=${post.slug || post.id}</guid>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <description>${escapeXml(post.excerpt || post.content || '')}</description>
    </item>
  `;
});

const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Ender Fare's Blog</title>
    <link>${siteUrl}</link>
    <description>My personal blog</description>
    <atom:link href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml"/>
    <lastBuildDate>${now}</lastBuildDate>
    ${items}
  </channel>
</rss>`;

fs.writeFileSync(path.join(__dirname, '../feed.xml'), feed);
console.log('RSS feed generated!');

function escapeXml(unsafe) {
  if (!unsafe) return '';
  return unsafe.replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '"': return '&quot;';
      case "'": return '&apos;';
    }
  });
}