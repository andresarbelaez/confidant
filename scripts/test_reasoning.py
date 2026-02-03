#!/usr/bin/env python3
"""
Test runner for dant agent reasoning capabilities.
Runs a series of test queries and displays results.
"""

import sys
import os
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from src.agent.core import DantAgent

# Test queries organized by category
TEST_QUERIES = {
    "Logical Reasoning": [
        "If all cats are mammals, and Fluffy is a cat, what can we conclude about Fluffy?",
        "If it's raining, then the ground is wet. The ground is not wet. What can we conclude?",
        "All roses are flowers. All flowers need water. Do roses need water?",
    ],
    "Mathematical Reasoning": [
        "What is 15 multiplied by 23?",
        "Sarah has 3 times as many books as Tom. Tom has 5 books. How many books does Sarah have?",
        "What is 25% of 80?",
        "What comes next in this sequence: 2, 4, 8, 16, ?",
    ],
    "Causal Reasoning": [
        "Why do plants need sunlight?",
        "Why does ice float on water?",
        "What causes the seasons to change?",
    ],
    "Comparative Reasoning": [
        "What's the difference between a lake and an ocean?",
        "Compare and contrast cats and dogs as pets.",
        "A book is to reading as a movie is to what?",
    ],
    "Problem-Solving": [
        "I need to bake a cake that takes 45 minutes, but I only have a timer that goes up to 30 minutes. How can I solve this?",
        "A farmer has 17 sheep. All but 9 die. How many are left?",
    ],
    "Multi-Step Reasoning": [
        "If a store has 50 apples, sells 15 on Monday, receives 20 more on Tuesday, and sells 10 on Wednesday, how many apples does it have left?",
        "A recipe calls for 2 cups of flour to make 12 cookies. How many cups of flour do you need to make 36 cookies?",
    ],
    "Abstract Reasoning": [
        "What do a car, a bicycle, and a skateboard have in common?",
        "Which doesn't belong: apple, orange, banana, carrot? Why?",
    ],
    "Common Sense": [
        "Why shouldn't you touch a hot stove?",
        "What would happen if you tried to breathe underwater without equipment?",
    ],
    "Knowledge Bank (RAG)": [
        "What is Antarctica?",
        "Tell me about the .aq domain",
        "What do you know about science from your knowledge base?",
    ],
    "Creative Reasoning": [
        "What would happen if gravity was twice as strong on Earth?",
        "How would you get a ping pong ball out of a 10-foot deep hole using only a rope, a bucket, and a magnet?",
    ],
}

def run_tests(categories=None, use_rag=True, max_tokens=256):
    """
    Run reasoning tests on the dant agent.
    
    Args:
        categories: List of category names to test (None = all)
        use_rag: Whether to use RAG for knowledge bank queries
        max_tokens: Maximum tokens per response
    """
    print("=" * 70)
    print("dant Agent Reasoning Test Suite")
    print("=" * 70)
    print()
    
    # Initialize agent
    print("Initializing agent...")
    try:
        agent = DantAgent()
        print("✓ Agent loaded successfully\n")
    except Exception as e:
        print(f"✗ Failed to load agent: {e}")
        return
    
    # Determine which categories to test
    if categories is None:
        categories = list(TEST_QUERIES.keys())
    else:
        categories = [c for c in categories if c in TEST_QUERIES]
    
    if not categories:
        print("No valid categories specified.")
        return
    
    # Run tests
    total_queries = sum(len(TEST_QUERIES[cat]) for cat in categories)
    query_count = 0
    
    for category in categories:
        print(f"\n{'=' * 70}")
        print(f"Category: {category}")
        print(f"{'=' * 70}\n")
        
        queries = TEST_QUERIES[category]
        
        for i, query in enumerate(queries, 1):
            query_count += 1
            print(f"[{query_count}/{total_queries}] Query: {query}")
            print("-" * 70)
            
            try:
                # Determine if RAG should be used
                use_rag_for_query = use_rag and ("knowledge" in category.lower() or "rag" in category.lower())
                
                response = agent.process_query(
                    query=query,
                    use_rag=use_rag_for_query,
                    max_tokens=max_tokens,
                    stream=False
                )
                
                print(f"Response: {response}")
                print()
                
            except Exception as e:
                print(f"✗ Error: {e}\n")
    
    print("=" * 70)
    print("Testing Complete")
    print("=" * 70)

def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Test dant agent reasoning capabilities")
    parser.add_argument(
        "--categories",
        nargs="+",
        choices=list(TEST_QUERIES.keys()),
        help="Specific categories to test (default: all)"
    )
    parser.add_argument(
        "--no-rag",
        action="store_true",
        help="Disable RAG for all queries"
    )
    parser.add_argument(
        "--max-tokens",
        type=int,
        default=256,
        help="Maximum tokens per response (default: 256)"
    )
    
    args = parser.parse_args()
    
    run_tests(
        categories=args.categories,
        use_rag=not args.no_rag,
        max_tokens=args.max_tokens
    )

if __name__ == "__main__":
    main()
