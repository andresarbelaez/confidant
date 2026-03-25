#!/usr/bin/env python3
"""
Download a free US zip → city, state CSV and write a normalized table.
Use the output to build or validate local hotline rows (e.g. for 211 API input).

Source: public CSV on GitHub (zip, primary_city, state, etc.).
Output: us_zip_city_state.csv with columns zip, city, state.

Usage:
  python fetch_us_zip_city_state.py [-o us_zip_city_state.csv] [--zips-only zips.txt]
"""
import argparse
import csv
import sys
import urllib.request
from pathlib import Path

# Stable public CSV: zip, type, decommissioned, primary_city, acceptable_cities, state, county, ...
ZIP_DB_URL = "https://raw.githubusercontent.com/brsingh7/DATA607/main/Week6/Project2A/zip_code_database.csv"


def main():
    ap = argparse.ArgumentParser(description="Fetch US zip→city, state CSV and optionally emit zip list")
    ap.add_argument(
        "-o",
        "--output",
        default="us_zip_city_state.csv",
        help="Output CSV path (default: us_zip_city_state.csv)",
    )
    ap.add_argument(
        "--zips-only",
        metavar="FILE",
        help="Also write a file with one zip per line (for 211 script input)",
    )
    args = ap.parse_args()

    try:
        with urllib.request.urlopen(ZIP_DB_URL, timeout=60) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
    except Exception as e:
        print(f"ERROR: Failed to fetch {ZIP_DB_URL}: {e}", file=sys.stderr)
        sys.exit(1)

    reader = csv.DictReader(raw.splitlines())
    if not reader.fieldnames:
        print("ERROR: Source CSV has no header", file=sys.stderr)
        sys.exit(1)

    rows = []
    zips_seen = set()
    for row in reader:
        zip_code = (row.get("zip") or "").strip()
        city = (row.get("primary_city") or "").strip()
        state = (row.get("state") or "").strip()
        if not zip_code:
            continue
        # Dedupe by zip (keep first; primary_city can vary by type)
        if zip_code in zips_seen:
            continue
        zips_seen.add(zip_code)
        rows.append({"zip": zip_code, "city": city, "state": state})

    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["zip", "city", "state"])
        w.writeheader()
        w.writerows(rows)
    print(f"Wrote {len(rows)} rows to {out_path}", file=sys.stderr)

    if args.zips_only:
        zips_path = Path(args.zips_only)
        zips_path.parent.mkdir(parents=True, exist_ok=True)
        with open(zips_path, "w", encoding="utf-8") as f:
            for r in rows:
                f.write(r["zip"] + "\n")
        print(f"Wrote {len(rows)} zips to {zips_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
