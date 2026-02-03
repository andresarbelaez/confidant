"""Comprehensive knowledge bank builder."""

import argparse
import sys
import os
from pathlib import Path
from typing import List, Dict, Optional
from tqdm import tqdm

# Get the project root directory
project_root = Path(__file__).parent.parent
src_dir = project_root / "src"
scripts_dir = Path(__file__).parent

# Add project root to path so we can import src as a package
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

# Import from src package
from src.knowledge.loader import KnowledgeLoader

# Import source handlers (these use absolute imports from scripts)
from sources.wikipedia import WikipediaDownloader
from sources.tech_docs import TechDocProcessor
from sources.personal_docs import PersonalDocLoader


class KnowledgeBankBuilder:
    """Builds knowledge bank from multiple sources."""
    
    def __init__(
        self,
        size_limit_gb: Optional[float] = None,
        article_limit: Optional[int] = None
    ):
        """
        Initialize knowledge bank builder.
        
        Args:
            size_limit_gb: Maximum size in GB (approximate)
            article_limit: Maximum number of articles/documents
        """
        self.size_limit_gb = size_limit_gb
        self.article_limit = article_limit
        self.loader = KnowledgeLoader()
    
    def estimate_size(self, documents: List[Dict[str, str]]) -> float:
        """
        Estimate size of documents in GB.
        
        Args:
            documents: List of document dicts
            
        Returns:
            Estimated size in GB
        """
        total_chars = sum(len(doc.get("text", "")) for doc in documents)
        # Rough estimate: 1 character ≈ 1 byte, plus overhead
        size_gb = (total_chars * 1.5) / (1024 ** 3)  # 1.5x for overhead
        return size_gb
    
    def limit_documents(
        self,
        documents: List[Dict[str, str]],
        by_size: bool = True
    ) -> List[Dict[str, str]]:
        """
        Limit documents by size or count.
        
        Args:
            documents: List of documents
            by_size: If True, limit by size; if False, limit by count
            
        Returns:
            Limited list of documents
        """
        if not documents:
            return documents
        
        if by_size and self.size_limit_gb:
            # Sort by length (longer articles first for better coverage)
            sorted_docs = sorted(documents, key=lambda x: len(x.get("text", "")), reverse=True)
            
            limited = []
            current_size = 0.0
            
            for doc in sorted_docs:
                doc_size = len(doc.get("text", "")) / (1024 ** 3)  # GB
                if current_size + doc_size <= self.size_limit_gb:
                    limited.append(doc)
                    current_size += doc_size
                else:
                    break
            
            print(f"Limited to {len(limited)} documents (~{current_size:.2f} GB)")
            return limited
        
        elif self.article_limit:
            limited = documents[:self.article_limit]
            print(f"Limited to {len(limited)} documents")
            return limited
        
        return documents
    
    def build_from_wikipedia(
        self,
        simple: bool = True,
        dump_file: Optional[Path] = None
    ) -> List[Dict[str, str]]:
        """
        Build knowledge bank from Wikipedia.
        
        Args:
            simple: If True, use Simple English Wikipedia
            dump_file: Optional path to Wikipedia dump file
            
        Returns:
            List of document dicts
        """
        downloader = WikipediaDownloader()
        
        if dump_file and Path(dump_file).exists():
            print("Processing Wikipedia dump file...")
            articles = downloader.process_wikipedia_dump(
                dump_file,
                limit=self.article_limit
            )
        elif simple:
            print("Downloading from Simple English Wikipedia...")
            articles = downloader.download_simple_wikipedia_articles(
                limit=self.article_limit
            )
        else:
            print("Warning: Full Wikipedia download not implemented. Use Simple English or provide dump file.")
            return []
        
        return self.limit_documents(articles, by_size=True)
    
    def build_from_tech_docs(
        self,
        directory: Path,
        recursive: bool = True
    ) -> List[Dict[str, str]]:
        """
        Build knowledge bank from technical documentation.
        
        Args:
            directory: Directory containing technical docs
            recursive: Whether to search recursively
            
        Returns:
            List of document dicts
        """
        processor = TechDocProcessor()
        documents = processor.process_directory(
            directory,
            recursive=recursive
        )
        
        return self.limit_documents(documents, by_size=True)
    
    def build_from_personal_docs(
        self,
        directory: Path,
        recursive: bool = True
    ) -> List[Dict[str, str]]:
        """
        Build knowledge bank from personal documents.
        
        Args:
            directory: Directory containing personal docs
            recursive: Whether to search recursively
            
        Returns:
            List of document dicts
        """
        loader = PersonalDocLoader()
        documents = loader.load_directory(
            directory,
            recursive=recursive
        )
        
        return self.limit_documents(documents, by_size=True)
    
    def add_to_knowledge_bank(
        self,
        documents: List[Dict[str, str]],
        show_progress: bool = True
    ) -> None:
        """
        Add documents to the knowledge bank.
        
        Args:
            documents: List of document dicts
            show_progress: Whether to show progress bar
        """
        if not documents:
            print("No documents to add.")
            return
        
        print(f"\nAdding {len(documents)} documents to knowledge bank...")
        
        # Extract texts and metadata
        texts = [doc["text"] for doc in documents]
        metadatas = [
            {
                "title": doc.get("title", "Unknown"),
                "source": doc.get("source", "unknown")
            }
            for doc in documents
        ]
        
        # Add to knowledge bank
        self.loader.add_to_knowledge_bank(
            documents=texts,
            metadatas=metadatas,
            show_progress=show_progress
        )
        
        print(f"✓ Successfully added {len(documents)} documents to knowledge bank")
        print(f"  Total documents in knowledge bank: {self.loader.vector_store.count()}")


def main():
    parser = argparse.ArgumentParser(
        description="Build dant knowledge bank from multiple sources"
    )
    parser.add_argument(
        "--sources",
        type=str,
        default="all",
        help="Comma-separated list of sources: wiki,tech,personal,all (default: all)"
    )
    parser.add_argument(
        "--size-limit",
        type=float,
        help="Maximum size in GB (approximate)"
    )
    parser.add_argument(
        "--article-limit",
        type=int,
        help="Maximum number of articles/documents"
    )
    parser.add_argument(
        "--input-dir",
        type=str,
        help="Input directory for tech/personal docs"
    )
    parser.add_argument(
        "--wiki-dump",
        type=str,
        help="Path to Wikipedia XML dump file (optional)"
    )
    parser.add_argument(
        "--simple-wiki",
        action="store_true",
        default=True,
        help="Use Simple English Wikipedia (default: True)"
    )
    parser.add_argument(
        "--full-wiki",
        action="store_true",
        help="Use full Wikipedia (requires dump file)"
    )
    parser.add_argument(
        "--recursive",
        action="store_true",
        default=True,
        help="Search directories recursively (default: True)"
    )
    
    args = parser.parse_args()
    
    # Parse sources
    sources = [s.strip().lower() for s in args.sources.split(",")]
    if "all" in sources:
        sources = ["wiki", "tech", "personal"]
    
    # Initialize builder
    builder = KnowledgeBankBuilder(
        size_limit_gb=args.size_limit,
        article_limit=args.article_limit
    )
    
    print("="*60)
    print("dant Knowledge Bank Builder")
    print("="*60)
    print(f"\nSources: {', '.join(sources)}")
    if args.size_limit:
        print(f"Size limit: {args.size_limit} GB")
    if args.article_limit:
        print(f"Article limit: {args.article_limit}")
    print("="*60)
    
    all_documents = []
    
    # Process each source
    if "wiki" in sources:
        print("\n[1/3] Processing Wikipedia...")
        wiki_docs = builder.build_from_wikipedia(
            simple=args.simple_wiki and not args.full_wiki,
            dump_file=Path(args.wiki_dump) if args.wiki_dump else None
        )
        all_documents.extend(wiki_docs)
        print(f"  Collected {len(wiki_docs)} Wikipedia articles")
    
    if "tech" in sources:
        if not args.input_dir:
            print("\n[2/3] Skipping technical docs (--input-dir not specified)")
        else:
            print("\n[2/3] Processing technical documentation...")
            tech_docs = builder.build_from_tech_docs(
                directory=Path(args.input_dir),
                recursive=args.recursive
            )
            all_documents.extend(tech_docs)
            print(f"  Collected {len(tech_docs)} technical documents")
    
    if "personal" in sources:
        personal_input_dir = args.input_dir
        if not personal_input_dir:
            # Try default personal docs location
            default_personal = Path.home() / "Documents"
            if default_personal.exists():
                personal_input_dir = str(default_personal)
                print(f"\n[3/3] Using default personal docs directory: {personal_input_dir}")
            else:
                print("\n[3/3] Skipping personal docs (--input-dir not specified and no default found)")
                personal_input_dir = None
        
        if personal_input_dir:
            print("\n[3/3] Processing personal documents...")
            personal_docs = builder.build_from_personal_docs(
                directory=Path(personal_input_dir),
                recursive=args.recursive
            )
            all_documents.extend(personal_docs)
            print(f"  Collected {len(personal_docs)} personal documents")
    
    # Apply final size limit if needed (if not already applied per-source)
    if args.size_limit and all_documents:
        estimated_size = builder.estimate_size(all_documents)
        print(f"\nTotal documents: {len(all_documents)}")
        print(f"Estimated size: {estimated_size:.2f} GB")
        
        if estimated_size > args.size_limit:
            print(f"Applying final size limit of {args.size_limit} GB...")
            # Temporarily set limit for final filtering
            original_limit = builder.size_limit_gb
            builder.size_limit_gb = args.size_limit
            all_documents = builder.limit_documents(all_documents, by_size=True)
            builder.size_limit_gb = original_limit
    
    # Add to knowledge bank
    if all_documents:
        builder.add_to_knowledge_bank(all_documents)
        print("\n" + "="*60)
        print("✓ Knowledge bank build complete!")
        print("="*60)
    else:
        print("\n✗ No documents collected. Check your source options.")
        sys.exit(1)


if __name__ == "__main__":
    main()
