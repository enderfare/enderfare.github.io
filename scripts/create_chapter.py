#!/usr/bin/env python3
"""
Create a new chapter markdown file for a novel
Usage: python scripts/create_chapter.py --novel "my-novel" --title "Chapter 1" --content "Chapter content..."
"""

import argparse
import json
from datetime import datetime
from pathlib import Path

NOVELS_DIR = "novels"
CHAPTERS_DIR = "chapters"

def get_repo_root():
    return Path(__file__).parent.parent

def slugify(text):
    import re
    text = text.lower()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_]+', '-', text)
    return text.strip('-')

def create_chapter(novel_slug, title, content="", parent=None):
    REPO_ROOT = get_repo_root()
    novel_dir = REPO_ROOT / NOVELS_DIR / novel_slug
    chapters_dir = novel_dir / CHAPTERS_DIR

    if not novel_dir.exists():
        raise FileNotFoundError(f"Novel '{novel_slug}' not found. Create it first with create_novel.py")

    chapters_dir.mkdir(parents=True, exist_ok=True)

    chapter_slug = slugify(title)
    today = datetime.now()
    date_str = today.strftime("%Y-%m-%d")

    # Create markdown file
    md_file = chapters_dir / f"{chapter_slug}.md"
    md_file.write_text(content)

    # Update data.json
    data_file = novel_dir / "data.json"
    with open(data_file, 'r') as f:
        data = json.load(f)

    chapter_entry = {
        "slug": chapter_slug,
        "title": title,
        "date": date_str,
        "format": "markdown"
    }

    if parent:
        chapter_entry["parent"] = parent

    data["chapters"].append(chapter_entry)
    data["chapters"].sort(key=lambda c: c["date"])

    with open(data_file, 'w') as f:
        json.dump(data, f, indent=2)

    print(f"✅ Created chapter: {md_file.relative_to(REPO_ROOT)}")
    print(f"   Updated: {data_file.relative_to(REPO_ROOT)}")

def main():
    parser = argparse.ArgumentParser(description="Create a new chapter for a novel")
    parser.add_argument("--novel", required=True, help="Novel slug (directory name)")
    parser.add_argument("--title", required=True, help="Chapter title")
    parser.add_argument("--content", default="", help="Chapter content in markdown")
    parser.add_argument("--parent", default=None, help="Parent chapter slug for nested chapters")
    args = parser.parse_args()

    create_chapter(args.novel, args.title, args.content, args.parent)

if __name__ == "__main__":
    main()