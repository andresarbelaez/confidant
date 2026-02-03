"""Personal documents loader."""

import sys
from pathlib import Path
from typing import List, Dict, Optional
from tqdm import tqdm

# Add utils to path
sys.path.insert(0, str(Path(__file__).parent.parent))
from utils.text_processing import extract_text_from_file, detect_file_type


class PersonalDocLoader:
    """Loads and processes personal documents."""
    
    def __init__(self):
        """Initialize personal documents loader."""
        # Common document extensions
        self.supported_extensions = [
            '.txt', '.text', '.md', '.markdown',
            '.html', '.htm', '.rst'
        ]
    
    def load_directory(
        self,
        directory: Path,
        recursive: bool = True,
        min_size: int = 50,
        exclude_patterns: Optional[List[str]] = None
    ) -> List[Dict[str, str]]:
        """
        Load all personal documents from a directory.
        
        Args:
            directory: Directory containing documents
            recursive: Whether to search recursively
            min_size: Minimum file size in characters
            exclude_patterns: List of patterns to exclude (e.g., ['*.log', '*.tmp'])
            
        Returns:
            List of dicts with 'title', 'text', and 'source' keys
        """
        directory = Path(directory)
        if not directory.exists():
            print(f"Error: Directory not found: {directory}")
            return []
        
        documents = []
        
        # Find all supported files
        pattern = "**/*" if recursive else "*"
        files = []
        for ext in self.supported_extensions:
            files.extend(directory.glob(f"{pattern}{ext}"))
        
        # Apply exclude patterns
        if exclude_patterns:
            import fnmatch
            filtered_files = []
            for file_path in files:
                should_exclude = False
                for pattern in exclude_patterns:
                    if fnmatch.fnmatch(file_path.name, pattern) or fnmatch.fnmatch(str(file_path), pattern):
                        should_exclude = True
                        break
                if not should_exclude:
                    filtered_files.append(file_path)
            files = filtered_files
        
        print(f"Found {len(files)} personal documents")
        
        for file_path in tqdm(files, desc="Loading documents"):
            text = extract_text_from_file(file_path)
            
            if text and len(text) >= min_size:
                # Use filename as title
                title = file_path.stem
                
                # Try to extract title from content (markdown headers)
                if file_path.suffix in ['.md', '.markdown']:
                    lines = text.split('\n')
                    for line in lines[:10]:
                        if line.startswith('#'):
                            title = line.lstrip('#').strip()
                            break
                
                # Preserve relative path for context
                try:
                    rel_path = file_path.relative_to(directory)
                except ValueError:
                    rel_path = Path(file_path.name)
                
                documents.append({
                    "title": title,
                    "text": text,
                    "source": f"personal/{rel_path}",
                    "file_path": str(file_path)
                })
        
        print(f"Loaded {len(documents)} personal documents")
        return documents
    
    def load_file(self, file_path: Path) -> Optional[Dict[str, str]]:
        """
        Load a single personal document.
        
        Args:
            file_path: Path to file
            
        Returns:
            Dict with 'title', 'text', and 'source' keys, or None if loading fails
        """
        file_path = Path(file_path)
        if not file_path.exists():
            return None
        
        if file_path.suffix.lower() not in self.supported_extensions:
            print(f"Warning: Unsupported file type: {file_path.suffix}")
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
            "source": f"personal/{file_path.name}",
            "file_path": str(file_path)
        }
