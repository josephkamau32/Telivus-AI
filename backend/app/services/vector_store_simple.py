"""
Simple vector store service for basic RAG functionality.

This is a simplified version that works without complex dependencies.
In production, this would be replaced with Chroma or Pinecone.
"""

import json
import os
from typing import List, Dict, Any, Optional
from pathlib import Path
import logging

from app.core.logging import get_logger

# Get logger
logger = get_logger(__name__)


class SimpleVectorStore:
    """
    Simple in-memory vector store for medical knowledge.

    This is a basic implementation for development/testing.
    In production, use Chroma, Pinecone, or similar.
    """

    def __init__(self, storage_path: str = "./data/simple_vector_store.json"):
        """
        Initialize the simple vector store.

        Args:
            storage_path: Path to store the vector data
        """
        self.storage_path = Path(storage_path)
        self.storage_path.parent.mkdir(parents=True, exist_ok=True)
        self.documents: List[Dict[str, Any]] = []
        self._load_documents()

    def _load_documents(self) -> None:
        """Load documents from storage file."""
        if self.storage_path.exists():
            try:
                with open(self.storage_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.documents = data.get('documents', [])
                    logger.info(f"Loaded {len(self.documents)} documents from {self.storage_path}")
            except Exception as e:
                logger.error(f"Failed to load documents: {e}")
                self.documents = []
        else:
            logger.info("No existing vector store found, starting empty")
            self.documents = []

    def _save_documents(self) -> None:
        """Save documents to storage file."""
        try:
            data = {'documents': self.documents}
            with open(self.storage_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            logger.info(f"Saved {len(self.documents)} documents to {self.storage_path}")
        except Exception as e:
            logger.error(f"Failed to save documents: {e}")

    async def add_documents(self, documents: List[Dict[str, Any]]) -> None:
        """
        Add documents to the vector store.

        Args:
            documents: List of document dictionaries with 'content' and 'metadata'
        """
        try:
            for doc in documents:
                if 'content' not in doc:
                    logger.warning("Document missing 'content' field, skipping")
                    continue

                # Create a simple document entry
                document_entry = {
                    'id': f"doc_{len(self.documents)}",
                    'content': doc['content'],
                    'metadata': doc.get('metadata', {}),
                    'embedding': None,  # No actual embeddings in simple version
                    'created_at': "2024-01-01T00:00:00Z"  # Placeholder
                }

                self.documents.append(document_entry)

            self._save_documents()
            logger.info(f"Added {len(documents)} documents to vector store")

        except Exception as e:
            logger.error(f"Failed to add documents: {e}")
            raise

    async def search_documents(
        self,
        query: str,
        top_k: int = 5,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Search for relevant documents.

        Args:
            query: Search query
            top_k: Number of results to return
            filters: Optional metadata filters

        Returns:
            List of relevant documents with scores
        """
        try:
            # Simple keyword-based search (no actual vector similarity)
            query_lower = query.lower()
            scored_docs = []

            for doc in self.documents:
                content = doc.get('content', '').lower()
                metadata = doc.get('metadata', {})

                # Apply filters if provided
                if filters:
                    if not self._matches_filters(metadata, filters):
                        continue

                # Simple scoring based on keyword matches
                score = self._calculate_simple_score(query_lower, content, metadata)

                if score > 0:
                    scored_docs.append({
                        'content': doc['content'],
                        'metadata': metadata,
                        'score': score,
                        'id': doc['id']
                    })

            # Sort by score and return top_k
            scored_docs.sort(key=lambda x: x['score'], reverse=True)
            results = scored_docs[:top_k]

            logger.info(f"Found {len(results)} documents for query: {query[:50]}...")
            return results

        except Exception as e:
            logger.error(f"Failed to search documents: {e}")
            return []

    def _calculate_simple_score(self, query: str, content: str, metadata: Dict) -> float:
        """
        Calculate a simple relevance score.

        Args:
            query: Search query
            content: Document content
            metadata: Document metadata

        Returns:
            Relevance score (0.0 to 1.0)
        """
        score = 0.0
        query_words = set(query.split())

        # Count word matches in content
        content_words = set(content.split())
        word_matches = len(query_words.intersection(content_words))

        if word_matches > 0:
            score += min(word_matches / len(query_words), 0.7)  # Max 0.7 for content matches

        # Boost score for category matches
        category = metadata.get('category', '')
        if any(word in category.lower() for word in query_words):
            score += 0.2

        # Boost score for topic matches
        topic = metadata.get('topic', '')
        if any(word in topic.lower() for word in query_words):
            score += 0.1

        return min(score, 1.0)

    def _matches_filters(self, metadata: Dict, filters: Dict) -> bool:
        """
        Check if document metadata matches the given filters.

        Args:
            metadata: Document metadata
            filters: Filter criteria

        Returns:
            True if document matches filters
        """
        for key, value in filters.items():
            if key not in metadata or metadata[key] != value:
                return False
        return True

    async def get_stats(self) -> Dict[str, Any]:
        """
        Get vector store statistics.

        Returns:
            Dictionary with store statistics
        """
        try:
            categories = {}
            topics = {}

            for doc in self.documents:
                metadata = doc.get('metadata', {})

                # Count categories
                category = metadata.get('category', 'unknown')
                categories[category] = categories.get(category, 0) + 1

                # Count topics
                topic = metadata.get('topic', 'unknown')
                topics[topic] = topics.get(topic, 0) + 1

            return {
                'total_documents': len(self.documents),
                'categories': categories,
                'topics': topics,
                'storage_path': str(self.storage_path)
            }

        except Exception as e:
            logger.error(f"Failed to get stats: {e}")
            return {'error': str(e)}

    async def clear_store(self) -> None:
        """Clear all documents from the store."""
        try:
            self.documents = []
            self._save_documents()
            logger.info("Vector store cleared")
        except Exception as e:
            logger.error(f"Failed to clear store: {e}")
            raise


# Global instance
simple_vector_store = SimpleVectorStore()


async def initialize_vector_store() -> None:
    """
    Initialize the vector store during application startup.
    """
    try:
        stats = await simple_vector_store.get_stats()
        logger.info(f"Simple vector store initialized: {stats}")
    except Exception as e:
        logger.error(f"Failed to initialize vector store: {e}")
        raise