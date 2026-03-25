# Sourcing Local Phone Book Data (US / UK / Canada)

This doc outlines how to mass-source **zip/postal code → location** and **local crisis/support hotlines** so we can populate `phonebook_seed.json` (and thus the Call For Help modal) with as many US, UK, and Canada locations as possible.

## Pipeline overview

1. **Zip/postal → city, state/region**  
   Use free or licensed datasets to get canonical lists of postal codes and their locations.

2. **Local hotline data**  
   Attach crisis/support hotline names and numbers to those locations (APIs, exports, or curated lists).

3. **Emit seed format**  
   Convert to the phone book seed schema and merge with existing national entries.

## Seed schema

Each entry in `phonebook_seed.json` (and in any CSV you convert) must have:

| Field         | Required | Example / notes                                      |
|---------------|----------|------------------------------------------------------|
| `country`     | Yes      | `"US"`, `"GB"`, `"CA"`                              |
| `postal_code` | Yes      | `"NATIONAL"` for country-wide, or e.g. `"21093"`, `"SW1A 1AA"`, `"K1A 0B1"` |
| `name`        | Yes      | Display name of the service                         |
| `phone`       | Yes      | Number or text (e.g. "Text HOME to 741741")         |
| `profession`  | Yes      | e.g. `"crisis hotline"`, `"local 211"`             |
| `address`     | No       | Street address (can be empty)                       |
| `city`        | No       | City name                                           |
| `state`       | No       | State / province / region                           |

National entries use `postal_code: "NATIONAL"` and can leave address/city/state empty. Local entries should set `postal_code` (and ideally city/state) so the app can filter by location.

---

## Step 1: Zip / postal code → city, state (location tables)

### US (ZIP codes)

- **Free CSV:** [Simplemaps US Zip Codes (Basic)](https://simplemaps.com/data/us-zips) – ~33k zips, city, state, lat/lon (CC BY, attribution required).  
- **Free CSV:** [USZipcodeList.com](http://uszipcodelist.com/download.html) – zip, primary city, state, county, etc.  
- **Government:** [Data.gov – ZCTA / PLACES](https://catalog.data.gov/dataset?tags=zcta&res_format=CSV) – ZCTA-level CSVs.

Use one of these to build a **US table**: `zip` → `city`, `state` (and optionally lat/lon for future use).

### UK (postcodes)

- **Free CSV:** [ONS Postcode Directory (ONSPD)](https://geoportal.statistics.gov.uk/search?q=ONS%20Postcode%20Directory) – official, postcode → admin geography.  
- **GitHub (archived):** [gibbs/uk-postcodes](https://github.com/gibbs/uk-postcodes) – out codes to towns, counties (CC0).

Build a **UK table**: `postcode` (or outcode) → town/city, county/region.

### Canada (postal codes)

- **Free (non‑profit):** [geocoder.ca freedata](https://geocoder.ca/?freedata=1) – postal code → city, province, etc. (CC-BY).  
- **Statistics Canada:** Postal Code Conversion File (PCCF) – postal code → census geography/coordinates.

Build a **CA table**: `postal_code` → city, province.

You can store these as CSVs (e.g. `us_zips.csv`, `uk_postcodes.csv`, `ca_postal_codes.csv`) and use them both to:
- Resolve user-entered zip/postal → city, state/region for display or for lookups.
- Generate or validate rows when building local hotline data (so every hotline row has a correct postal code and location).

---

## Step 2: Local crisis / support hotline data

### US – 211 and national resources

- **211 National Data Platform**  
  - [211 API Portal](https://apiportal.211.org/) – Search by location/zip, bulk Export API.  
  - Sign up for developer access; use **Search API** (by zip/city) and/or **Export API** to pull crisis/mental health/resources by area.  
  - Map results to our schema: `country=US`, `postal_code` = zip (or ZCTA), `name`, `phone`, `profession`, and optional `address`, `city`, `state` from 211.

- **National entries**  
  Keep existing national lines (988, 1-800-273-8255, Crisis Text Line) in the seed with `postal_code: "NATIONAL"` and add any other country-wide lines you want.

### UK

- **Samaritans** – national and some branch/region info; can be combined with postcode→location to create local-style entries if you have branch coverage.  
- **NHS / local mental health crisis lines** – often published by region; can be scraped or manually curated into a CSV (postcode/region, name, phone, profession) then converted to seed format.  
- **Postcode table** – use UK postcode→city/region from Step 1 to assign `city`/`state` (or region) to each hotline row.

### Canada

- **Crisis Services Canada** – national and provincial/regional lines.  
- **211 in Canada** – some regions have 211; check for bulk or API access.  
- Use the Canada postal→city, province table from Step 1 to attach location to each hotline.

“Searching the internet” here means: (1) prefer structured sources (211 API, official crisis line lists, freedata) and (2) if you scrape or hand-curate, output a simple table (e.g. CSV) with columns matching the seed schema, then use the conversion script below so everything stays in one seed format.

---

## Step 3: Convert to seed JSON and merge

- **CSV → seed JSON**  
  Use the script in `desktop/scripts/csv_to_phonebook_seed.py` (see below). Your CSV should have columns:  
  `country`, `postal_code`, `name`, `phone`, `profession`, `address`, `city`, `state`.

- **Merge with existing national seed**  
  - Keep `desktop/src-tauri/resources/phonebook_seed.json` as the single source of truth.  
  - Either:  
    - Replace its contents with the output of the script (national + all new local rows), or  
    - Script can read current `phonebook_seed.json`, merge in new rows (by some key, e.g. country+postal_code+name), and write back.

- **Re-import into the app**  
  After updating the seed file, the app’s bundled defaults will re-ingest on next run if the collection is recreated, or use `desktop/scripts/import_phonebook.py` to load the new JSON into the `dant_phonebook` collection (see that script’s usage).

---

## Scripts reference

| Script | Purpose |
|--------|--------|
| `desktop/scripts/fetch_us_zip_city_state.py` | Download US zip→city, state CSV from a free public source; optional `--zips-only` for 211 input. |
| `desktop/scripts/fetch_211_by_zip.py` | Call 211 API by zip (env: `211_API_KEY`); output CSV in seed format. |
| `desktop/scripts/csv_to_phonebook_seed.py` | Convert CSV to seed JSON; `--merge` with existing `phonebook_seed.json`. |

---

## Script: CSV → phonebook seed JSON

**Path:** `desktop/scripts/csv_to_phonebook_seed.py`

- **Input:** CSV with columns (order flexible; header row required):  
  `country`, `postal_code`, `name`, `phone`, `profession`, `address`, `city`, `state`  
  (Missing optional fields can be empty.)

- **Output:** JSON array of objects in the same shape as `phonebook_seed.json`, so you can:
  - Write to a new file and replace `phonebook_seed.json`, or  
  - Merge with the existing national seed (script can take `--merge path/to/phonebook_seed.json` and output national + CSV rows).

- **Usage (conceptual):**
  - `python csv_to_phonebook_seed.py local_hotlines.csv -o seed_additions.json`
  - `python csv_to_phonebook_seed.py local_hotlines.csv --merge ../src-tauri/resources/phonebook_seed.json -o phonebook_seed.json`

This gives you a repeatable way to turn any sourced table (211 export, hand-curated list, etc.) into valid seed JSON and keep national + local in one file.

---

## Suggested order of work

1. **US first**  
   Get a US zip→city, state CSV (e.g. Simplemaps or USZipcodeList).  
   Sign up for 211 API; run Search or Export by zip/state and export to CSV.  
   Map 211 columns to seed schema; run `csv_to_phonebook_seed.py` and merge with current national seed.  
   Re-import and test in the Call For Help modal (e.g. US + 21093).

2. **Canada**  
   Get postal→city, province (e.g. geocoder.ca).  
   Add Crisis Services Canada (and any 211) data into a CSV; convert and merge into seed.

3. **UK**  
   Get postcode→town/region (ONSPD or gibbs/uk-postcodes).  
   Add Samaritans / NHS crisis lines by region/postcode; convert and merge into seed.

---

## Practical flow: exact commands (US)

Run these from `desktop/scripts/` (or adjust paths).

### Step 1: Get US zip → city, state table

```bash
cd desktop/scripts
python fetch_us_zip_city_state.py -o us_zip_city_state.csv
```

Optional: also write a one-zip-per-line file for the 211 script:

```bash
python fetch_us_zip_city_state.py -o us_zip_city_state.csv --zips-only zips.txt
```

- **No env required.** Script downloads from a public GitHub CSV.
- **Output:** `us_zip_city_state.csv` (columns: `zip`, `city`, `state`).

### Step 2: Fetch 211 resources by zip (requires API key)

1. Sign up at [211 API Portal](https://apiportal.211.org/) and get an API key (and base URL if different from default).
2. Set env and run:

```bash
export 211_API_KEY=your_key
# If your portal gives a different base URL:
# export 211_API_BASE_URL=https://your-api.azure-api.net

# Using zip list from Step 1 (optional --zips-only file):
python fetch_211_by_zip.py --zips zips.txt -o 211_hotlines.csv

# Or using the zip/city/state CSV (passes city/state into output):
python fetch_211_by_zip.py --csv us_zip_city_state.csv -o 211_hotlines.csv

# Or a few zips by hand:
python fetch_211_by_zip.py 21093 21201 -o 211_hotlines.csv
```

- **Env:** `211_API_KEY` (required). Optional: `211_API_BASE_URL`, `211_API_AUTH_HEADER` (e.g. `Bearer` if the portal uses Bearer auth).
- **Output:** `211_hotlines.csv` in phonebook seed column format. If the 211 API response shape differs from what the script expects, you may need to adjust the mapping in `fetch_211_by_zip.py` or pre-process the API response.
- **Dry run:** `python fetch_211_by_zip.py --csv us_zip_city_state.csv --dry-run` to print request info without calling the API.

### Step 3: Merge into seed and re-import

Merge 211 CSV with the existing national seed and write the combined seed file:

```bash
python csv_to_phonebook_seed.py 211_hotlines.csv --merge ../src-tauri/resources/phonebook_seed.json -o ../src-tauri/resources/phonebook_seed.json
```

Re-import into the app’s phonebook collection (if needed):

```bash
python import_phonebook.py ../src-tauri/resources/phonebook_seed.json
```

(Exact `import_phonebook.py` usage may depend on your Tauri app’s DB path; see that script’s help.)

### Order summary

1. **Step 1** – `fetch_us_zip_city_state.py` → `us_zip_city_state.csv` (and optionally `zips.txt`).
2. **Step 2** – Set `211_API_KEY`, run `fetch_211_by_zip.py` with `--csv` or `--zips` or positional zips → `211_hotlines.csv`.
3. **Step 3** – `csv_to_phonebook_seed.py --merge ... -o phonebook_seed.json`, then run `import_phonebook.py` if you need to reload the collection.
