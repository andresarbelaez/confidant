#!/usr/bin/env python3
"""
Import phone book data into ChromaDB (dant_phonebook collection).
Reads JSON array of entries with: country, postal_code, profession, name, phone; optional address, city, state.
Uses the same embeddings_helper and chromadb_helper as the app so embeddings and format match.
Usage:
  python import_phonebook.py path/to/phonebook.json [--db /path/to/chromadb]
Default db: current dir data/chromadb or env CONFIDANT_PHONEBOOK_DB_PATH.
"""
import argparse
import json
import os
import subprocess
import sys
from pathlib import Path

# Assume we're run from desktop/ or repo root; find scripts
DESKTOP_DIR = Path(__file__).resolve().parent.parent
SRC_TAURI_SCRIPTS = DESKTOP_DIR / "src-tauri" / "scripts"
RESOURCES_SCRIPTS = DESKTOP_DIR / "src-tauri" / "resources" / "scripts"


def find_scripts_dir():
    for d in [SRC_TAURI_SCRIPTS, RESOURCES_SCRIPTS]:
        if (d / "chromadb_helper.py").exists() and (d / "embeddings_helper.py").exists():
            return d
    return None


def run_python_script(script_name: str, command: str, args: list, stdin_data: str | None = None) -> str:
    scripts_dir = find_scripts_dir()
    if not scripts_dir:
        print("ERROR: chromadb_helper.py and embeddings_helper.py not found", file=sys.stderr)
        sys.exit(1)
    script_path = scripts_dir / script_name
    cmd = [sys.executable, str(script_path), command] + args
    result = subprocess.run(
        cmd,
        input=stdin_data,
        capture_output=True,
        text=True,
        cwd=str(scripts_dir),
    )
    if result.returncode != 0:
        print(result.stderr, file=sys.stderr)
        raise RuntimeError(f"{script_name} failed: {result.stderr}")
    return result.stdout


def main():
    parser = argparse.ArgumentParser(description="Import phone book JSON into ChromaDB")
    parser.add_argument("json_path", help="Path to JSON file (array of entries)")
    parser.add_argument("--db", default=os.environ.get("CONFIDANT_PHONEBOOK_DB_PATH"), help="ChromaDB path")
    args = parser.parse_args()

    db_path = args.db
    if not db_path:
        db_path = str(DESKTOP_DIR / "data" / "chromadb")
    os.makedirs(db_path, exist_ok=True)

    with open(args.json_path) as f:
        entries = json.load(f)
    if not isinstance(entries, list):
        print("ERROR: JSON must be an array of entries", file=sys.stderr)
        sys.exit(1)

    texts = []
    for e in entries:
        name = e.get("name", "")
        profession = e.get("profession", "")
        phone = e.get("phone", "")
        texts.append(f"{name} — {profession}, {phone}")

    print("Generating embeddings...", file=sys.stderr)
    texts_json = json.dumps(texts)
    out = run_python_script("embeddings_helper.py", "batch", [], stdin_data=texts_json)
    emb_result = json.loads(out)
    if emb_result.get("status") != "success":
        print("ERROR: embeddings failed", emb_result, file=sys.stderr)
        sys.exit(1)
    embeddings = emb_result["embeddings"]

    print("Initializing collection dant_phonebook...", file=sys.stderr)
    run_python_script("chromadb_helper.py", "init", [db_path, "dant_phonebook"])

    collection = "dant_phonebook"
    batch_size = 20
    for i in range(0, len(entries), batch_size):
        batch_entries = entries[i : i + batch_size]
        batch_texts = texts[i : i + batch_size]
        batch_embeddings = embeddings[i : i + batch_size]
        documents = []
        for j, (e, text, emb) in enumerate(zip(batch_entries, batch_texts, batch_embeddings)):
            doc_id = f"phonebook_{i + j}_{e.get('name', 'entry').replace(' ', '_')}"
            metadata = {
                "country": str(e.get("country", "")),
                "postal_code": str(e.get("postal_code", "")),
                "profession": str(e.get("profession", "")),
                "name": str(e.get("name", "")),
                "phone": str(e.get("phone", "")),
                "address": str(e.get("address", "")),
                "city": str(e.get("city", "")),
                "state": str(e.get("state", "")),
            }
            documents.append({"id": doc_id, "text": text, "embedding": emb, "metadata": metadata})
        docs_json = json.dumps(documents)
        run_python_script("chromadb_helper.py", "add", [db_path, collection], stdin_data=docs_json)
        print(f"  Added {len(documents)} documents", file=sys.stderr)

    print("Done.", file=sys.stderr)


if __name__ == "__main__":
    main()
