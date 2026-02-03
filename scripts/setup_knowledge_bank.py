"""Script to set up and populate the knowledge bank.

Note: For comprehensive knowledge bank building with multiple sources (Wikipedia, tech docs, etc.),
use scripts/build_knowledge_bank.py instead.
"""

import argparse
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from knowledge.loader import KnowledgeLoader


def main():
    parser = argparse.ArgumentParser(description="Set up and populate dant knowledge bank")
    parser.add_argument(
        "source",
        type=str,
        help="Source directory or file to load"
    )
    parser.add_argument(
        "--extensions",
        nargs="+",
        default=[".txt", ".md"],
        help="File extensions to load (default: .txt .md)"
    )
    parser.add_argument(
        "--no-recursive",
        action="store_true",
        help="Don't search recursively in directories"
    )
    parser.add_argument(
        "--chunk-size",
        type=int,
        default=512,
        help="Size of text chunks (default: 512)"
    )
    parser.add_argument(
        "--chunk-overlap",
        type=int,
        default=50,
        help="Overlap between chunks (default: 50)"
    )
    
    args = parser.parse_args()
    
    source_path = Path(args.source)
    if not source_path.exists():
        print(f"Error: Source path does not exist: {args.source}")
        sys.exit(1)
    
    # Initialize loader
    loader = KnowledgeLoader(
        chunk_size=args.chunk_size,
        chunk_overlap=args.chunk_overlap
    )
    
    # Load from source
    if source_path.is_file():
        print(f"Loading file: {source_path}")
        if source_path.suffix == '.md':
            chunks = loader.load_markdown_file(str(source_path))
            documents = [chunk["text"] for chunk in chunks]
            metadatas = [chunk["metadata"] for chunk in chunks]
        else:
            documents = loader.load_text_file(str(source_path))
            metadatas = [{"source": source_path.name}] * len(documents)
        
        loader.add_to_knowledge_bank(documents, metadatas)
        print(f"Added {len(documents)} chunks to knowledge bank")
    
    elif source_path.is_dir():
        print(f"Loading directory: {source_path}")
        loader.load_directory(
            str(source_path),
            file_extensions=args.extensions,
            recursive=not args.no_recursive
        )
        print("Knowledge bank populated successfully!")
    
    else:
        print(f"Error: Source path is neither a file nor directory: {args.source}")
        sys.exit(1)


if __name__ == "__main__":
    main()
