#!/usr/bin/env python3
"""
Create a new OC (Original Character) with directory and update data/ocs.json
Usage: python scripts/create_oc.py --name "Aria" --description "Elf ranger" --tags dnd,elf --category dnd
"""

import argparse
import json
from pathlib import Path

OCS_DIR = "ocs"
DATA_FILE = "data/ocs.json"

def get_repo_root():
    return Path(__file__).parent.parent

def slugify(text):
    import re
    text = text.lower()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_]+', '-', text)
    return text.strip('-')

def create_oc(name, description="", tags=None, category="dnd", image="", language="English"):
    REPO_ROOT = get_repo_root()
    slug = slugify(name)
    oc_dir = REPO_ROOT / OCS_DIR / category / slug

    oc_dir.mkdir(parents=True, exist_ok=True)
    images_dir = oc_dir / "images"
    images_dir.mkdir(exist_ok=True)

    index_html = oc_dir / "index.html"
    index_html.write_text(f"""<!DOCTYPE html>
<html>
<head>
    <title>{name}</title>
    <meta charset="UTF-8">
</head>
<body>
    <h1>{name}</h1>
    <p>{description}</p>
</body>
</html>""")

    style_css = oc_dir / "style.css"
    style_css.write_text("/* Add your custom styles here */")

    oc_entry = {
        "name": name,
        "description": description,
        "link": f"/{OCS_DIR}/{category}/{slug}/",
        "image": image or f"/{OCS_DIR}/{category}/{slug}/images/avatar.jpg",
        "tags": tags or [],
        "language": language
    }

    update_ocs_json(REPO_ROOT, DATA_FILE, oc_entry)
    print(f"✅ Created OC: {oc_dir.relative_to(REPO_ROOT)}")
    print(f"   Data added to {DATA_FILE}")

def update_ocs_json(repo_root, data_file, oc_entry):
    try:
        with open(repo_root / data_file, 'r') as f:
            data = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        data = []

    data.append(oc_entry)

    with open(repo_root / data_file, 'w') as f:
        json.dump(data, f, indent=2)

def main():
    parser = argparse.ArgumentParser(description="Create a new OC")
    parser.add_argument("--name", required=True, help="Character name")
    parser.add_argument("--description", default="", help="Character description")
    parser.add_argument("--tags", default="", help="Comma-separated tags")
    parser.add_argument("--category", default="dnd", help="Category (e.g., dnd, original)")
    parser.add_argument("--image", default="", help="Path to character image")
    parser.add_argument("--language", default="English", help="Language")
    args = parser.parse_args()

    tags = [t.strip() for t in args.tags.split(",") if t.strip()]
    create_oc(args.name, args.description, tags, args.category, args.image, args.language)

if __name__ == "__main__":
    main()