#!/usr/bin/env python3
"""
Add a new project to enderfare.github.io (feature/novels-ocs branch).
Supports both local image paths and remote URLs.
Usage: python add_project.py --title "Title" --description "Desc" --image "path_or_url" --link "url" --tags "tag1,tag2"
"""

import json
import os
import shutil
import argparse
import re
import time
import sys
from pathlib import Path
import urllib.request
import urllib.parse

def slugify(text):
    """Convert a string to a URL-safe slug."""
    text = re.sub(r'[^\w\s-]', '', text).strip().lower()
    return re.sub(r'[-\s]+', '-', text)

def load_json(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return []

def save_json(filepath, data):
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def download_image(url, dest_path):
    """Download an image from a URL to dest_path."""
    try:
        urllib.request.urlretrieve(url, dest_path)
        print(f"✅ Downloaded image from {url}")
        return True
    except Exception as e:
        print(f"❌ Failed to download image: {e}")
        return False

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--title", required=True)
    parser.add_argument("--description", required=True)
    parser.add_argument("--image", required=True, help="Local path or remote URL of the image")
    parser.add_argument("--link", required=True)
    parser.add_argument("--tags", help="Comma-separated tags")
    parser.add_argument("--repo-root", default=".")
    args = parser.parse_args()

    root = Path(args.repo_root)
    json_path = root / "data" / "projects.json"
    images_dir = root / "projects" / "images"
    images_dir.mkdir(parents=True, exist_ok=True)

    # Load existing projects
    projects = load_json(json_path)
    if isinstance(projects, dict) and "projects" in projects:
        projects = projects["projects"]
    elif not isinstance(projects, list):
        projects = []

    base_id = slugify(args.title)
    unique_id = f"{base_id}-{int(time.time())}"

    # Determine file extension and copy/download image
    image_input = args.image
    is_url = image_input.startswith(('http://', 'https://'))
    ext = None

    if is_url:
        # Try to guess extension from URL
        parsed = urllib.parse.urlparse(image_input)
        path = parsed.path
        if '.' in path:
            ext = Path(path).suffix.lower()
        else:
            # Default to .png if we can't tell
            ext = '.png'
    else:
        src_path = Path(image_input)
        if not src_path.exists():
            print(f"❌ Local image not found: {src_path}")
            sys.exit(1)
        ext = src_path.suffix.lower()

    if ext not in ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']:
        print(f"⚠️  Warning: Unusual extension '{ext}'. Using .png as fallback.")
        ext = '.png'

    dest_filename = f"{unique_id}{ext}"
    dest_path = images_dir / dest_filename

    # Copy or download
    if is_url:
        success = download_image(image_input, dest_path)
        if not success:
            sys.exit(1)
    else:
        shutil.copy2(src_path, dest_path)
        print(f"✅ Copied image to: {dest_path}")

    # Tags
    tags_list = [tag.strip() for tag in args.tags.split(',')] if args.tags else []

    new_project = {
        "id": unique_id,
        "title": args.title,
        "description": args.description,
        "image": f"/projects/images/{dest_filename}",
        "link": args.link,
        "tags": tags_list,
        "date": time.strftime("%Y-%m-%d")
    }

    projects.append(new_project)
    save_json(json_path, projects)
    print(f"✅ Added project '{args.title}' to {json_path}")
    print(f"   ID: {unique_id}")

if __name__ == "__main__":
    main()