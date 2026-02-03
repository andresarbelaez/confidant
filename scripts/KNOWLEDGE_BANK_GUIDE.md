# Knowledge Bank Setup Guide

This guide explains how to build a lightweight, mixed knowledge bank for dant.

## Quick Start

### Option 1: Simple English Wikipedia Only (Recommended for Lightweight)

```bash
source venv/bin/activate
python scripts/build_knowledge_bank.py --sources wiki --size-limit 1 --article-limit 1000
```

This downloads ~1000 articles from Simple English Wikipedia, approximately 1GB.

### Option 2: Wikipedia + Personal Documents

```bash
source venv/bin/activate
python scripts/build_knowledge_bank.py --sources wiki,personal --size-limit 2 --input-dir ~/Documents
```

### Option 3: All Sources

```bash
source venv/bin/activate
python scripts/build_knowledge_bank.py --sources all --size-limit 3 --input-dir ~/Documents
```

## Source Options

- `wiki` - Simple English Wikipedia (downloads automatically)
- `tech` - Technical documentation (requires --input-dir)
- `personal` - Personal documents (requires --input-dir or uses ~/Documents)
- `all` - All available sources

## Size Control

- `--size-limit <GB>` - Maximum size in GB (e.g., `--size-limit 2` for 2GB)
- `--article-limit <N>` - Maximum number of articles/documents

## Examples

### Lightweight Setup (~500MB)
```bash
python scripts/build_knowledge_bank.py --sources wiki --size-limit 0.5 --article-limit 500
```

### Medium Setup (~2GB)
```bash
python scripts/build_knowledge_bank.py --sources wiki,personal --size-limit 2 --input-dir ~/Documents
```

### Technical Docs Only
```bash
python scripts/build_knowledge_bank.py --sources tech --input-dir ~/path/to/docs
```

## What Gets Included

### Wikipedia
- Simple English Wikipedia articles (easier to understand, smaller size)
- Automatically filtered by length and quality
- Includes article titles and source metadata

### Technical Documentation
- Markdown files (.md, .markdown)
- Text files (.txt, .text)
- HTML files (.html, .htm)
- ReStructuredText (.rst)
- Maintains file structure and metadata

### Personal Documents
- All supported text formats from your directory
- Automatically excludes common non-document files
- Preserves relative paths for context

## Tips for Lightweight Knowledge Bank

1. **Start Small**: Begin with 500MB-1GB to test
2. **Prioritize Quality**: The builder automatically prioritizes longer, more complete articles
3. **Use Simple English Wikipedia**: Much smaller than full Wikipedia but still comprehensive
4. **Filter Personal Docs**: Use specific directories rather than entire Documents folder
5. **Monitor Size**: The builder shows size estimates before adding to knowledge bank

## Troubleshooting

### "requests not installed"
```bash
source venv/bin/activate
pip install requests beautifulsoup4 markdown
```

### Wikipedia download is slow
- This is normal - Simple English Wikipedia has thousands of articles
- Consider using `--article-limit` to reduce download time
- The download happens once and is cached

### Personal docs not found
- Make sure `--input-dir` points to a valid directory
- Check that files have supported extensions (.txt, .md, .html, etc.)

## Next Steps

After building your knowledge bank:
1. Test it: `python src/main.py --setup` to configure
2. Try queries: `python src/main.py` to start using dant
3. Add more later: Run the builder again to add more sources
