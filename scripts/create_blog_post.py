#!/usr/bin/env python3
"""
Create a new blog post markdown file and update data/blog.json
Usage: python scripts/create_blog_post.py --title "My Post" --tags writing,dev --lists novel-series
"""

import argparse
import json
from datetime import datetime
from pathlib import Path

BLOG_CONTENT_DIR = "blog/content"
DATA_FILE = "data/blog.json"

def get_repo_root():
    return Path(__file__).parent.parent

def slugify(text):
    import re
    text = text.lower()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_]+', '-', text)
    text = re.sub(r'-+', '-', text)
    return text.strip('-')

def create_blog_post(title, tags=None, lists=None, excerpt="", pinned=False, fmt="markdown"):
    REPO_ROOT = get_repo_root()
    slug = slugify(title)
    today = datetime.now()
    date_str = today.strftime("%Y-%m-%d")
    year, month, day = today.strftime("%Y"), today.strftime("%m"), today.strftime("%d")

    content_dir = REPO_ROOT / BLOG_CONTENT_DIR / year / month / day
    content_dir.mkdir(parents=True, exist_ok=True)

    filename = f"{slug}.md"
    filepath = content_dir / filename
    content_path = f"/{BLOG_CONTENT_DIR}/{year}/{month}/{day}/{filename}"

    markdown_content = f"""# {title}

{excerpt}

---
*Posted on {date_str}*
"""
    filepath.write_text(markdown_content)

    post_entry = {
        "id": generate_next_id(REPO_ROOT, DATA_FILE),
        "slug": slug,
        "title": title,
        "date": date_str,
        "tags": tags or [],
        "format": fmt,
        "content": content_path,
        "pinned": pinned,
        "lists": lists or [],
        "excerpt": excerpt
    }

    update_blog_json(REPO_ROOT, DATA_FILE, post_entry)
    print(f"✅ Created blog post: {filepath.relative_to(REPO_ROOT)}")

def generate_next_id(repo_root, data_file):
    try:
        with open(repo_root / data_file, 'r') as f:
            data = json.load(f)
            posts = data.get("posts", [])
            return max(post.get("id", 0) for post in posts) + 1
    except (FileNotFoundError, json.JSONDecodeError, ValueError):
        return 1

def update_blog_json(repo_root, data_file, post_entry):
    try:
        with open(repo_root / data_file, 'r') as f:
            data = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        data = {"posts": [], "lists": []}

    data["posts"].append(post_entry)
    data["posts"].sort(key=lambda p: p["date"], reverse=True)

    with open(repo_root / data_file, 'w') as f:
        json.dump(data, f, indent=2)

def main():
    parser = argparse.ArgumentParser(description="Create a new blog post")
    parser.add_argument("--title", required=True, help="Post title")
    parser.add_argument("--tags", default="", help="Comma-separated tags")
    parser.add_argument("--lists", default="", help="Comma-separated list slugs")
    parser.add_argument("--excerpt", default="", help="Post excerpt")
    parser.add_argument("--pinned", action="store_true", help="Pin this post")
    parser.add_argument("--format", default="markdown", choices=["markdown", "html", "text"])
    args = parser.parse_args()

    tags = [t.strip() for t in args.tags.split(",") if t.strip()]
    lists = [l.strip() for l in args.lists.split(",") if l.strip()]

    create_blog_post(args.title, tags, lists, args.excerpt, args.pinned, args.format)

if __name__ == "__main__":
    main()