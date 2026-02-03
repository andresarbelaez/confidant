"""Wikipedia downloader and processor."""

import sys
from pathlib import Path
from typing import List, Dict, Optional
import re
from tqdm import tqdm

# Add utils to path
sys.path.insert(0, str(Path(__file__).parent.parent))
from utils.text_processing import html_to_text, clean_text

try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False


class WikipediaDownloader:
    """Downloads and processes Wikipedia articles."""
    
    def __init__(self, cache_dir: Optional[Path] = None):
        """
        Initialize Wikipedia downloader.
        
        Args:
            cache_dir: Directory to cache downloaded files
        """
        if cache_dir is None:
            cache_dir = Path.home() / ".cache" / "dant" / "wikipedia"
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
    
    def download_simple_wikipedia_articles(
        self,
        limit: Optional[int] = None,
        min_length: int = 50
    ) -> List[Dict[str, str]]:
        """
        Download articles from Simple English Wikipedia.
        
        Args:
            limit: Maximum number of articles to download. If None, downloads all.
            min_length: Minimum article length in characters
            
        Returns:
            List of dicts with 'title' and 'text' keys
        """
        if not HAS_REQUESTS:
            print("Warning: requests not installed. Install with: pip install requests")
            return []
        
        articles = []
        
        # Simple English Wikipedia API endpoint
        base_url = "https://simple.wikipedia.org/w/api.php"
        
        params = {
            "action": "query",
            "format": "json",
            "list": "allpages",
            "aplimit": "500",  # Max per request
            "apnamespace": "0"
        }
        
        print("Downloading Simple English Wikipedia articles...")
        
        try:
            # Set User-Agent header (required by Wikipedia)
            headers = {
                "User-Agent": "dant-knowledge-bank-builder/1.0 (https://github.com/yourusername/dant; contact@example.com)"
            }
            
            # Get list of pages
            # Request 3x the limit to account for filtering (many articles are too short)
            target_pages = (limit * 3) if limit else None
            all_pages = []
            continue_token = None
            
            while True:
                if continue_token:
                    params["apcontinue"] = continue_token
                
                response = requests.get(base_url, params=params, headers=headers, timeout=30)
                response.raise_for_status()
                data = response.json()
                
                pages = data.get("query", {}).get("allpages", [])
                all_pages.extend(pages)
                
                # Stop when we have enough pages (we'll filter later)
                if target_pages and len(all_pages) >= target_pages:
                    all_pages = all_pages[:target_pages]
                    break
                
                if "continue" in data:
                    continue_token = data["continue"]["apcontinue"]
                else:
                    break
            
            # Download article content
            print(f"Downloading content for {len(all_pages)} articles...")
            
            # Process in batches
            batch_size = 50
            total_batches = (len(all_pages) + batch_size - 1) // batch_size
            for i in tqdm(range(0, len(all_pages), batch_size), desc="Downloading articles", total=total_batches):
                batch = all_pages[i:i + batch_size]
                page_ids = [str(page["pageid"]) for page in batch]
                
                # Get content for batch
                content_params = {
                    "action": "query",
                    "format": "json",
                    "pageids": "|".join(page_ids),
                    "prop": "extracts",
                    "exintro": "false",
                    "explaintext": "true"
                }
                
                content_response = requests.get(base_url, params=content_params, headers=headers, timeout=30)
                content_response.raise_for_status()
                content_data = content_response.json()
                
                pages_data = content_data.get("query", {}).get("pages", {})
                
                for page_id, page_data in pages_data.items():
                    title = page_data.get("title", "")
                    extract = page_data.get("extract", "")
                    
                    # Skip redirects and very short articles
                    if extract and len(extract) >= min_length and not title.startswith("List of"):
                        articles.append({
                            "title": title,
                            "text": clean_text(extract),
                            "source": "simple.wikipedia.org"
                        })
                    
                    # If we have enough articles, stop
                    if limit and len(articles) >= limit:
                        break
                
                if limit and len(articles) >= limit:
                    break
            
            print(f"Downloaded {len(articles)} articles from Simple English Wikipedia")
            return articles
            
        except Exception as e:
            print(f"Error downloading Wikipedia articles: {e}")
            return articles
    
    def process_wikipedia_dump(
        self,
        dump_file: Path,
        limit: Optional[int] = None,
        min_length: int = 100
    ) -> List[Dict[str, str]]:
        """
        Process a Wikipedia XML dump file.
        
        Args:
            dump_file: Path to Wikipedia XML dump
            limit: Maximum number of articles to process
            min_length: Minimum article length
            
        Returns:
            List of dicts with 'title' and 'text' keys
        """
        if not dump_file.exists():
            print(f"Error: Dump file not found: {dump_file}")
            return []
        
        articles = []
        
        print(f"Processing Wikipedia dump: {dump_file}")
        
        try:
            import xml.etree.ElementTree as ET
            
            # Parse XML (this is simplified - full dumps are complex)
            tree = ET.parse(dump_file)
            root = tree.getroot()
            
            # Wikipedia dumps use namespaces
            ns = {'ns': 'http://www.mediawiki.org/xml/export-0.10/'}
            
            pages = root.findall('.//ns:page', ns)
            
            for page in tqdm(pages[:limit] if limit else pages, desc="Processing articles"):
                title_elem = page.find('ns:title', ns)
                revision = page.find('.//ns:revision', ns)
                text_elem = revision.find('ns:text', ns) if revision is not None else None
                
                if title_elem is not None and text_elem is not None:
                    title = title_elem.text
                    text = text_elem.text or ""
                    
                    # Clean and extract text
                    text = html_to_text(text)
                    text = clean_text(text)
                    
                    # Skip redirects and very short articles
                    if not text.startswith("#REDIRECT") and len(text) >= min_length:
                        articles.append({
                            "title": title,
                            "text": text,
                            "source": "wikipedia.org"
                        })
            
            print(f"Processed {len(articles)} articles from dump")
            return articles
            
        except Exception as e:
            print(f"Error processing dump file: {e}")
            print("Note: Full Wikipedia dumps require special parsing. Consider using Simple English Wikipedia API instead.")
            return articles
