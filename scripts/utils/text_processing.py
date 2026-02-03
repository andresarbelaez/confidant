"""Text processing utilities for knowledge bank."""

import re
from typing import Optional
from pathlib import Path

try:
    from bs4 import BeautifulSoup
    HAS_BS4 = True
except ImportError:
    HAS_BS4 = False

try:
    import markdown
    HAS_MARKDOWN = True
except ImportError:
    HAS_MARKDOWN = False


def html_to_text(html_content: str) -> str:
    """
    Convert HTML content to plain text.
    
    Args:
        html_content: HTML string
        
    Returns:
        Plain text
    """
    if not HAS_BS4:
        # Fallback: simple regex-based extraction
        # Remove script and style tags
        text = re.sub(r'<script[^>]*>.*?</script>', '', html_content, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r'<style[^>]*>.*?</style>', '', text, flags=re.DOTALL | re.IGNORECASE)
        # Remove HTML tags
        text = re.sub(r'<[^>]+>', ' ', text)
        # Decode HTML entities (basic)
        text = text.replace('&nbsp;', ' ')
        text = text.replace('&amp;', '&')
        text = text.replace('&lt;', '<')
        text = text.replace('&gt;', '>')
        text = text.replace('&quot;', '"')
        # Clean up whitespace
        text = re.sub(r'\s+', ' ', text)
        return text.strip()
    
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # Remove script and style elements
    for script in soup(["script", "style"]):
        script.decompose()
    
    # Get text
    text = soup.get_text()
    
    # Clean up whitespace
    lines = (line.strip() for line in text.splitlines())
    chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
    text = ' '.join(chunk for chunk in chunks if chunk)
    
    return text


def markdown_to_text(markdown_content: str) -> str:
    """
    Convert markdown to plain text (removes formatting but keeps structure).
    
    Args:
        markdown_content: Markdown string
        
    Returns:
        Plain text
    """
    if HAS_MARKDOWN:
        # Convert markdown to HTML first, then to text
        html = markdown.markdown(markdown_content)
        return html_to_text(html)
    else:
        # Simple fallback: just remove markdown syntax
        # Remove headers
        text = re.sub(r'^#+\s+', '', markdown_content, flags=re.MULTILINE)
        # Remove bold/italic
        text = re.sub(r'\*\*([^\*]+)\*\*', r'\1', text)
        text = re.sub(r'\*([^\*]+)\*', r'\1', text)
        text = re.sub(r'__([^_]+)__', r'\1', text)
        text = re.sub(r'_([^_]+)_', r'\1', text)
        # Remove links but keep text
        text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', text)
        # Remove code blocks
        text = re.sub(r'```[^`]*```', '', text, flags=re.DOTALL)
        text = re.sub(r'`([^`]+)`', r'\1', text)
        return text.strip()


def clean_text(text: str) -> str:
    """
    Clean and normalize text.
    
    Args:
        text: Raw text
        
    Returns:
        Cleaned text
    """
    # Remove excessive whitespace
    text = re.sub(r'\s+', ' ', text)
    # Remove leading/trailing whitespace
    text = text.strip()
    # Remove non-printable characters (keep newlines)
    text = ''.join(char for char in text if char.isprintable() or char in '\n\t')
    return text


def detect_file_type(file_path: Path) -> str:
    """
    Detect file type from extension.
    
    Args:
        file_path: Path to file
        
    Returns:
        File type: 'html', 'markdown', 'text', 'unknown'
    """
    ext = file_path.suffix.lower()
    
    if ext in ['.html', '.htm']:
        return 'html'
    elif ext in ['.md', '.markdown']:
        return 'markdown'
    elif ext in ['.txt', '.text']:
        return 'text'
    else:
        return 'unknown'


def extract_text_from_file(file_path: Path, encoding: str = 'utf-8') -> Optional[str]:
    """
    Extract text from a file, auto-detecting format.
    
    Args:
        file_path: Path to file
        encoding: File encoding
        
    Returns:
        Extracted text, or None if extraction fails
    """
    if not file_path.exists():
        return None
    
    try:
        with open(file_path, 'r', encoding=encoding, errors='ignore') as f:
            content = f.read()
    except Exception as e:
        print(f"Warning: Could not read {file_path}: {e}")
        return None
    
    file_type = detect_file_type(file_path)
    
    if file_type == 'html':
        return clean_text(html_to_text(content))
    elif file_type == 'markdown':
        return clean_text(markdown_to_text(content))
    elif file_type == 'text':
        return clean_text(content)
    else:
        # Try as plain text
        return clean_text(content)
