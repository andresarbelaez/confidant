#!/usr/bin/env python3
"""
Fetch 211 (US) crisis/support resources by zip and write CSV in phonebook seed format.
Requires 211 API access: sign up at https://apiportal.211.org/ and set 211_API_KEY (and
optionally 211_API_BASE_URL) in the environment.

Usage:
  export 211_API_KEY=your_key
  export 211_API_BASE_URL=https://your-api.azure-api.net   # from portal if different
  python fetch_211_by_zip.py --zips zips.txt -o 211_hotlines.csv
  python fetch_211_by_zip.py --csv us_zip_city_state.csv -o 211_hotlines.csv
  python fetch_211_by_zip.py 21093 21201 -o 211_hotlines.csv
"""
import argparse
import csv
import json
import os
import sys
import urllib.request
from pathlib import Path


def _env(key: str, default: str = "") -> str:
    return (os.environ.get(key) or default).strip()


def _get_zips_from_args(args) -> list[tuple[str, str, str]]:
    """Return list of (zip, city, state). City/state may be empty."""
    zips_with_place = []
    if args.zips:
        path = Path(args.zips)
        if not path.exists():
            print(f"ERROR: File not found: {path}", file=sys.stderr)
            sys.exit(1)
        with open(path, encoding="utf-8") as f:
            for line in f:
                z = line.strip()
                if z and not z.startswith("#"):
                    zips_with_place.append((z, "", ""))
    elif args.csv:
        path = Path(args.csv)
        if not path.exists():
            print(f"ERROR: File not found: {path}", file=sys.stderr)
            sys.exit(1)
        with open(path, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            fn = [c for c in (reader.fieldnames or []) if c.strip().lower() == "zip"]
            zip_col = fn[0] if fn else None
            if not zip_col:
                print("ERROR: CSV must have a 'zip' column", file=sys.stderr)
                sys.exit(1)
            city_col = next((c for c in (reader.fieldnames or []) if c.strip().lower() == "city"), None)
            state_col = next((c for c in (reader.fieldnames or []) if c.strip().lower() == "state"), None)
            for row in reader:
                z = (row.get(zip_col) or "").strip()
                if not z:
                    continue
                city = (row.get(city_col) or "").strip() if city_col else ""
                state = (row.get(state_col) or "").strip() if state_col else ""
                zips_with_place.append((z, city, state))
    else:
        for z in args.zip_codes:
            z = (z or "").strip()
            if z:
                zips_with_place.append((z, "", ""))
    return zips_with_place


def _nested_get(obj, *keys, default=""):
    for k in keys:
        if isinstance(obj, dict) and k in obj:
            obj = obj[k]
        else:
            return default
    return obj if isinstance(obj, str) else (str(obj) if obj is not None else default)


def _extract_phone(item: dict) -> str:
    p = _nested_get(item, "phone") or _nested_get(item, "number")
    if p:
        return p
    for key in ("phones", "phoneNumbers", "contacts"):
        arr = item.get(key) if isinstance(item, dict) else None
        if isinstance(arr, list) and arr:
            first = arr[0]
            if isinstance(first, dict):
                return (first.get("number") or first.get("phone") or first.get("value") or "").strip() or ""
            if isinstance(first, str):
                return first.strip()
    return ""


def _extract_address(item: dict) -> str:
    addr = _nested_get(item, "address", "address1") or _nested_get(item, "physical_address") or _nested_get(item, "location", "address")
    if addr:
        return addr
    if isinstance(item.get("address"), dict):
        a = item["address"]
        parts = [a.get("address_1"), a.get("address_2"), a.get("city"), a.get("state_province"), a.get("postal_code")]
        return ", ".join(str(p) for p in parts if p)
    return ""


def _map_211_item_to_row(item: dict, zip_code: str, city: str, state: str) -> dict | None:
    """Map one 211 API result item to our seed row. Returns None if no name or phone."""
    name = (_nested_get(item, "name") or _nested_get(item, "organization", "name") or _nested_get(item, "service", "name") or _nested_get(item, "title") or "").strip()
    phone = _extract_phone(item)
    if not name and not phone:
        return None
    if not name:
        name = "211 resource"
    profession = (_nested_get(item, "profession") or _nested_get(item, "description") or "local 211").strip() or "local 211"
    address = _extract_address(item)
    # Prefer item's city/state if present
    c = (_nested_get(item, "city") or _nested_get(item, "address", "city") or _nested_get(item, "location", "city") or city or "").strip()
    s = (_nested_get(item, "state") or _nested_get(item, "state_province") or _nested_get(item, "address", "state_province") or _nested_get(item, "location", "state") or state or "").strip()
    return {
        "country": "US",
        "postal_code": zip_code,
        "name": name,
        "phone": phone or "See 211 listing",
        "profession": profession[:200] if profession else "local 211",
        "address": address[:500] if address else "",
        "city": c,
        "state": s,
    }


def _flatten_results(data: dict, zip_code: str, city: str, state: str) -> list[dict]:
    """Turn 211-style API response into list of seed rows."""
    rows = []
    # Common response shapes: { "data": [...] }, { "results": [...] }, { "services": [...] }, { "hits": [...] }
    candidates = (
        data.get("data")
        or data.get("results")
        or data.get("services")
        or data.get("resources")
        or data.get("hits")
        or data.get("organizations")
    )
    if isinstance(candidates, list):
        for item in candidates:
            if isinstance(item, dict):
                row = _map_211_item_to_row(item, zip_code, city, state)
                if row:
                    rows.append(row)
    elif isinstance(data, list):
        for item in data:
            if isinstance(item, dict):
                row = _map_211_item_to_row(item, zip_code, city, state)
                if row:
                    rows.append(row)
    return rows


def main():
    ap = argparse.ArgumentParser(description="Fetch 211 resources by zip and output phonebook seed CSV")
    ap.add_argument("--zips", metavar="FILE", help="File with one zip code per line")
    ap.add_argument("--csv", metavar="FILE", help="CSV with 'zip' column (and optionally city, state)")
    ap.add_argument("zip_codes", nargs="*", help="Zip codes as positional args (if not using --zips/--csv)")
    ap.add_argument("-o", "--output", default="211_hotlines.csv", help="Output CSV path")
    ap.add_argument("--dry-run", action="store_true", help="Print request info and exit without calling API")
    ap.add_argument("--limit", type=int, default=0, help="Max zips to process (0 = all)")
    args = ap.parse_args()

    zips_with_place = _get_zips_from_args(args)
    if not zips_with_place:
        print("ERROR: No zips provided. Use --zips FILE, --csv FILE, or positional zip codes.", file=sys.stderr)
        sys.exit(1)

    api_key = _env("211_API_KEY")
    base_url = _env("211_API_BASE_URL")
    if not base_url:
        base_url = "https://api.211.org"  # placeholder; user sets from apiportal.211.org

    if args.dry_run:
        print(f"Would request up to {len(zips_with_place)} zips.", file=sys.stderr)
        print(f"211_API_BASE_URL={base_url}", file=sys.stderr)
        print(f"211_API_KEY={'*' * 8 if api_key else '(not set)'}", file=sys.stderr)
        if zips_with_place:
            z, c, s = zips_with_place[0]
            # Many 211-style APIs use ?location= or ?zip= or ?postalCode=
            example = f"{base_url.rstrip('/')}/search?location={z}"
            print(f"Example URL: {example}", file=sys.stderr)
        return

    if not api_key:
        print("ERROR: Set 211_API_KEY in the environment (get key from https://apiportal.211.org/).", file=sys.stderr)
        sys.exit(1)

    # Azure API Management often uses Ocp-Apim-Subscription-Key; some use Authorization: Bearer
    auth_header = _env("211_API_AUTH_HEADER", "Ocp-Apim-Subscription-Key")
    if auth_header.lower() == "bearer":
        headers = {"Authorization": f"Bearer {api_key}", "Accept": "application/json"}
    else:
        headers = {"Ocp-Apim-Subscription-Key": api_key, "Accept": "application/json"}

    limit = args.limit or len(zips_with_place)
    all_rows = []
    for i, (zip_code, city, state) in enumerate(zips_with_place):
        if i >= limit:
            break
        # Search endpoint: adjust path/query to match your 211 API (from portal docs)
        url = f"{base_url.rstrip('/')}/search?location={zip_code}"
        req = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            print(f"WARN: {zip_code} -> HTTP {e.code}: {e.reason}", file=sys.stderr)
            continue
        except Exception as e:
            print(f"WARN: {zip_code} -> {e}", file=sys.stderr)
            continue
        for row in _flatten_results(data, zip_code, city, state):
            all_rows.append(row)
        if (i + 1) % 50 == 0:
            print(f"Processed {i + 1} zips, {len(all_rows)} rows so far...", file=sys.stderr)

    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = ["country", "postal_code", "name", "phone", "profession", "address", "city", "state"]
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        w.writeheader()
        w.writerows(all_rows)
    print(f"Wrote {len(all_rows)} rows to {out_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
