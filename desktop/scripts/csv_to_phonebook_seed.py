#!/usr/bin/env python3
"""
Convert a CSV of local crisis/support hotlines into phonebook_seed.json format.
Use this after sourcing zip→city/state and hotline data (e.g. 211 API export).

CSV columns (header row required, case-insensitive):
  country, postal_code, name, phone, profession, address, city, state

Optional: merge with existing phonebook_seed.json so national entries are preserved.

Usage:
  python csv_to_phonebook_seed.py local_hotlines.csv -o seed_additions.json
  python csv_to_phonebook_seed.py local_hotlines.csv --merge ../src-tauri/resources/phonebook_seed.json -o phonebook_seed.json
"""
import argparse
import csv
import json
import sys
from pathlib import Path

REQUIRED = ("country", "postal_code", "name", "phone", "profession")
OPTIONAL = ("address", "city", "state")


def _get(raw: dict, field: str) -> str:
    for k, v in raw.items():
        if k.strip().lower() == field.lower():
            return (v or "").strip()
    return ""


def normalize_row(raw: dict) -> dict:
    """Produce one seed entry from a dict of CSV columns (header names case-insensitive)."""
    return {
        "country": _get(raw, "country"),
        "postal_code": _get(raw, "postal_code"),
        "profession": _get(raw, "profession"),
        "name": _get(raw, "name"),
        "phone": _get(raw, "phone"),
        "address": _get(raw, "address"),
        "city": _get(raw, "city"),
        "state": _get(raw, "state"),
    }


def main():
    ap = argparse.ArgumentParser(description="Convert CSV to phonebook seed JSON")
    ap.add_argument("csv_path", help="Path to CSV file (header: country, postal_code, name, phone, profession, ...)")
    ap.add_argument("-o", "--output", required=True, help="Output JSON path")
    ap.add_argument(
        "--merge",
        metavar="JSON",
        help="Merge with existing seed file (national entries first, then CSV rows)",
    )
    args = ap.parse_args()

    csv_path = Path(args.csv_path)
    if not csv_path.exists():
        print(f"ERROR: CSV not found: {csv_path}", file=sys.stderr)
        sys.exit(1)

    rows = []
    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        if not reader.fieldnames:
            print("ERROR: CSV has no header row", file=sys.stderr)
            sys.exit(1)
        for row in reader:
            # DictReader keys are column names; allow any casing
            normalized = normalize_row(row)
            if not normalized["country"] or not normalized["postal_code"] or not normalized["name"] or not normalized["phone"]:
                continue
            rows.append(normalized)

    if args.merge:
        merge_path = Path(args.merge)
        if not merge_path.exists():
            print(f"ERROR: Merge file not found: {merge_path}", file=sys.stderr)
            sys.exit(1)
        with open(merge_path, encoding="utf-8") as f:
            existing = json.load(f)
        if not isinstance(existing, list):
            print("ERROR: Merge file must be a JSON array", file=sys.stderr)
            sys.exit(1)
        out_list = existing + rows
    else:
        out_list = rows

    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out_list, f, indent=0, ensure_ascii=False)
    print(f"Wrote {len(out_list)} entries to {out_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
