#!/usr/bin/env python3
"""
Create a new novel with directory structure and data.json
Usage: python scripts/create_novel.py --title "My Novel" --description "A fantasy story" --tags fantasy,adventure
"""

import argparse
import json
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

def create_novel(title, description="", language="English", tags=None, cover=""):
    REPO_ROOT = get_repo_root()
    slug = slugify(title)
    novel_dir = REPO_ROOT / NOVELS_DIR / slug
    chapters_dir = novel_dir / CHAPTERS_DIR

    novel_dir.mkdir(parents=True, exist_ok=True)
    chapters_dir.mkdir(exist_ok=True)

    # Create data.json with markdown as default format
    data = {
        "title": title,
        "description": description,
        "language": language,
        "tags": tags or [],
        "cover": cover,
        "chapters": []
    }

    data_file = novel_dir / "data.json"
    with open(data_file, 'w') as f:
        json.dump(data, f, indent=2)

    print(f"✅ Created novel: {novel_dir.relative_to(REPO_ROOT)}")
    print(f"   Data file: {data_file.relative_to(REPO_ROOT)}")
    print(f"   Chapters directory: {chapters_dir.relative_to(REPO_ROOT)}")
    print(f"   Use 'create_chapter.py' to add chapters with markdown files")

def main():
    parser = argparse.ArgumentParser(description="Create a new novel")
    parser.add_argument("--title", required=True, help="Novel title")
    parser.add_argument("--description", default="", help="Novel description")
    parser.add_argument("--language", default="English", help="Language")
    parser.add_argument("--tags", default="", help="Comma-separated tags")
    parser.add_argument("--cover", default="", help="Path to cover image")
    args = parser.parse_args()

    tags = [t.strip() for t in args.tags.split(",") if t.strip()]
    create_novel(args.title, args.description, args.language, tags, args.cover)

if __name__ == "__main__":
    main()