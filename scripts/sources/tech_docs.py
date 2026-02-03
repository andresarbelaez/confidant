"""Technical documentation processor."""

import sys
from pathlib import Path
from typing import List, Dict, Optional
from tqdm import tqdm

# Add utils to path
sys.path.insert(0, str(Path(__file__).parent.parent))
from utils.text_processing import extract_text_from_file, detect_file_type


class TechDocProcessor:
    """Processes technical documentation files."""
    
    def __init__(self):
        """Initialize technical documentation processor."""
        pass
    
    def process_directory(
        self,
        directory: Path,
        extensions: Optional[List[str]] = None,
        recursive: bool = True,
        min_size: int = 50
    ) -> List[Dict[str, str]]:
        """
        Process all documentation files in a directory.
        
        Args:
            directory: Directory containing documentation
            extensions: List of file extensions to process. If None, uses defaults.
            recursive: Whether to search recursively
            min_size: Minimum file size in characters
            
        Returns:
            List of dicts with 'title', 'text', and 'source' keys
        """
        if extensions is None:
            extensions = ['.md', '.markdown', '.txt', '.text', '.rst', '.html', '.htm']
        
        directory = Path(directory)
        if not directory.exists():
            print(f"Error: Directory not found: {directory}")
            return []
        
        documents = []
        
        # Find all matching files
        pattern = "**/*" if recursive else "*"
        files = []
        for ext in extensions:
            files.extend(directory.glob(f"{pattern}{ext}"))
        
        print(f"Found {len(files)} documentation files")
        
        for file_path in tqdm(files, desc="Processing files"):
            text = extract_text_from_file(file_path)
            
            if text and len(text) >= min_size:
                # Use filename as title, or extract from content
                title = file_path.stem
                
                # Try to extract title from markdown header
                if file_path.suffix in ['.md', '.markdown']:
                    lines = text.split('\n')
                    for line in lines[:10]:  # Check first 10 lines
                        if line.startswith('#'):
                            title = line.lstrip('#').strip()
                            break
                
                documents.append({
                    "title": title,
                    "text": text,
                    "source": str(file_path.relative_to(directory)),
                    "file_path": str(file_path)
                })
        
        print(f"Processed {len(documents)} documentation files")
        return documents
    
    def process_file(self, file_path: Path) -> Optional[Dict[str, str]]:
        """
        Process a single documentation file.
        
        Args:
            file_path: Path to file
            
        Returns:
            Dict with 'title', 'text', and 'source' keys, or None if processing fails
        """
        file_path = Path(file_path)
        if not file_path.exists():
            return None
        
        text = extract_text_from_file(file_path)
        
        if not text:
            return None
        
        title = file_path.stem
        
        # Try to extract title from content
        if file_path.suffix in ['.md', '.markdown']:
            lines = text.split('\n')
            for line in lines[:10]:
                if line.startswith('#'):
                    title = line.lstrip('#').strip()
                    break
        
        return {
            "title": title,
            "text": text,
            "source": file_path.name,
            "file_path": str(file_path)
        }
