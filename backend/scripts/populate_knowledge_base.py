#!/usr/bin/env python3
"""
Script to populate the medical knowledge base with vector embeddings.

This script loads medical knowledge from JSON files and creates vector embeddings
for use in RAG (Retrieval-Augmented Generation) by the AI agents.
"""

import asyncio
import json
import logging
from pathlib import Path
from typing import List, Dict, Any

from app.core.config import settings
from app.core.logging import setup_logging
from app.services.vector_store import vector_store_service

# Setup logging
setup_logging()
logger = logging.getLogger(__name__)


async def load_medical_knowledge() -> List[Dict[str, Any]]:
    """
    Load medical knowledge from data files.

    Returns:
        List of medical knowledge documents
    """
    knowledge_base = []

    # Load from JSON file
    data_dir = Path(__file__).parent.parent / "data"
    knowledge_file = data_dir / "medical_knowledge.json"

    if knowledge_file.exists():
        try:
            with open(knowledge_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                knowledge_base.extend(data)
                logger.info(f"Loaded {len(data)} medical knowledge entries from {knowledge_file}")
        except Exception as e:
            logger.error(f"Failed to load medical knowledge from {knowledge_file}: {e}")
    else:
        logger.warning(f"Medical knowledge file not found: {knowledge_file}")

    # Additional knowledge sources can be added here
    # e.g., load from CSV, database, or external APIs

    return knowledge_base


async def populate_knowledge_base() -> None:
    """
    Populate the vector store with medical knowledge.
    """
    try:
        logger.info("Starting medical knowledge base population...")

        # Load medical knowledge
        medical_docs = await load_medical_knowledge()

        if not medical_docs:
            logger.warning("No medical knowledge documents found to populate")
            return

        logger.info(f"Processing {len(medical_docs)} medical knowledge documents...")

        # Add documents to vector store
        await vector_store_service.add_medical_documents(medical_docs)

        # Get collection stats
        stats = await vector_store_service.get_collection_stats()

        logger.info("Medical knowledge base population completed successfully")
        logger.info(f"Vector store stats: {stats}")

    except Exception as e:
        logger.error(f"Failed to populate knowledge base: {e}")
        raise


async def clear_knowledge_base() -> None:
    """
    Clear all documents from the knowledge base.

    WARNING: This will delete all stored medical knowledge.
    """
    try:
        logger.warning("Clearing medical knowledge base...")

        await vector_store_service.clear_collection()

        logger.info("Medical knowledge base cleared")

    except Exception as e:
        logger.error(f"Failed to clear knowledge base: {e}")
        raise


async def main() -> None:
    """
    Main function to run the knowledge base population script.
    """
    import argparse

    parser = argparse.ArgumentParser(description="Populate medical knowledge base")
    parser.add_argument(
        "--clear",
        action="store_true",
        help="Clear the knowledge base before populating"
    )
    parser.add_argument(
        "--stats",
        action="store_true",
        help="Show knowledge base statistics only"
    )

    args = parser.parse_args()

    if args.stats:
        # Show current statistics
        stats = await vector_store_service.get_collection_stats()
        print("Current Knowledge Base Statistics:")
        print(json.dumps(stats, indent=2))
        return

    if args.clear:
        # Clear existing knowledge base
        await clear_knowledge_base()

    # Populate knowledge base
    await populate_knowledge_base()


if __name__ == "__main__":
    # Run the script
    asyncio.run(main())