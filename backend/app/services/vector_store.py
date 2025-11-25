"""
Vector store service for RAG (Retrieval-Augmented Generation).

Provides medical knowledge base with vector embeddings for enhanced AI responses.
"""

import os
import asyncio
from typing import List, Dict, Any, Optional
import logging

from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema import Document

from app.core.config import settings
from app.core.logging import get_logger

# Get logger
logger = get_logger(__name__)

# Global vector store instance
_vector_store = None

# Import simple vector store as fallback
try:
    from app.services.vector_store_simple import simple_vector_store as _simple_store
    _use_simple_store = True
except ImportError:
    _simple_store = None
    _use_simple_store = False


class VectorStoreService:
    """
    Service for managing medical knowledge base with vector embeddings.

    Supports Chroma and Pinecone vector databases for RAG functionality.
    """

    def __init__(self):
        """Initialize vector store service."""
        self.embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2",
            model_kwargs={'device': 'cpu'},
            encode_kwargs={'normalize_embeddings': True}
        )

        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.MEDICAL_KB_CHUNK_SIZE,
            chunk_overlap=settings.MEDICAL_KB_CHUNK_OVERLAP,
            separators=["\n\n", "\n", ". ", " ", ""]
        )

    async def initialize_store(self) -> Chroma:
        """
        Initialize and return the vector store.

        Returns:
            Chroma: Initialized vector store
        """
        global _vector_store

        if _vector_store is not None:
            return _vector_store

        try:
            if settings.VECTOR_DB_TYPE == "chroma":
                _vector_store = await self._initialize_chroma()
            elif settings.VECTOR_DB_TYPE == "pinecone":
                _vector_store = await self._initialize_pinecone()
            else:
                raise ValueError(f"Unsupported vector DB type: {settings.VECTOR_DB_TYPE}")

            logger.info(f"Vector store initialized with {settings.VECTOR_DB_TYPE}")
            return _vector_store

        except Exception as e:
            logger.error(f"Failed to initialize vector store: {e}")
            raise

    async def _initialize_chroma(self) -> Chroma:
        """
        Initialize Chroma vector store.

        Returns:
            Chroma: Chroma vector store instance
        """
        # Ensure persist directory exists
        os.makedirs(settings.CHROMA_PERSIST_DIR, exist_ok=True)

        # Initialize Chroma with persistence
        vector_store = Chroma(
            persist_directory=settings.CHROMA_PERSIST_DIR,
            embedding_function=self.embeddings,
            collection_name="medical_knowledge"
        )

        # Load or create collection
        try:
            collection = vector_store._collection
            doc_count = collection.count()
            logger.info(f"Loaded existing Chroma collection with {doc_count} documents")
        except Exception:
            logger.info("Creating new Chroma collection")

        return vector_store

    async def _initialize_pinecone(self):
        """
        Initialize Pinecone vector store.

        Note: This would require pinecone-client and proper configuration.
        """
        # Placeholder for Pinecone implementation
        raise NotImplementedError("Pinecone integration not yet implemented")

    async def add_medical_documents(self, documents: List[Dict[str, Any]]) -> None:
        """
        Add medical documents to the vector store.

        Args:
            documents: List of document dictionaries with 'content' and 'metadata'
        """
        try:
            vector_store = await self.initialize_store()

            # Convert to LangChain documents
            langchain_docs = []
            for doc in documents:
                content = doc.get('content', '')
                metadata = doc.get('metadata', {})

                # Split text into chunks
                chunks = self.text_splitter.split_text(content)

                for chunk in chunks:
                    langchain_doc = Document(
                        page_content=chunk,
                        metadata=metadata
                    )
                    langchain_docs.append(langchain_doc)

            # Add to vector store
            if langchain_docs:
                await asyncio.get_event_loop().run_in_executor(
                    None,
                    lambda: vector_store.add_documents(langchain_docs)
                )

                # Persist if using Chroma
                if hasattr(vector_store, 'persist'):
                    vector_store.persist()

                logger.info(f"Added {len(langchain_docs)} document chunks to vector store")

        except Exception as e:
            logger.error(f"Failed to add documents to vector store: {e}")
            raise

    async def search_medical_knowledge(
        self,
        query: str,
        top_k: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Search medical knowledge base for relevant information.

        Args:
            query: Search query
            top_k: Number of top results to return

        Returns:
            List of relevant documents with scores
        """
        try:
            vector_store = await self.initialize_store()

            if top_k is None:
                top_k = settings.MEDICAL_KB_TOP_K

            # Perform similarity search
            docs_and_scores = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: vector_store.similarity_search_with_score(query, k=top_k)
            )

            # Format results
            results = []
            for doc, score in docs_and_scores:
                results.append({
                    'content': doc.page_content,
                    'metadata': doc.metadata,
                    'score': float(score)
                })

            logger.info(f"Found {len(results)} relevant documents for query: {query[:50]}...")
            return results

        except Exception as e:
            logger.error(f"Failed to search vector store: {e}")
            return []

    async def get_collection_stats(self) -> Dict[str, Any]:
        """
        Get statistics about the vector store collection.

        Returns:
            Dict containing collection statistics
        """
        try:
            vector_store = await self.initialize_store()

            if hasattr(vector_store, '_collection'):
                # Chroma stats
                collection = vector_store._collection
                count = collection.count()
                return {
                    'total_documents': count,
                    'vector_db_type': 'chroma',
                    'collection_name': collection.name
                }
            else:
                return {
                    'total_documents': 'unknown',
                    'vector_db_type': settings.VECTOR_DB_TYPE
                }

        except Exception as e:
            logger.error(f"Failed to get collection stats: {e}")
            return {'error': str(e)}

    async def clear_collection(self) -> None:
        """
        Clear all documents from the vector store.

        WARNING: This will delete all stored medical knowledge.
        """
        try:
            vector_store = await self.initialize_store()

            if hasattr(vector_store, '_collection'):
                # Chroma clear
                vector_store._collection.delete()
                logger.warning("Cleared all documents from vector store")
            else:
                logger.warning("Clear operation not supported for this vector store type")

        except Exception as e:
            logger.error(f"Failed to clear vector store: {e}")
            raise


# Global service instance
vector_store_service = VectorStoreService()


async def initialize_vector_store() -> None:
    """
    Initialize the global vector store during application startup.
    """
    global _vector_store

    try:
        # Try to initialize the advanced vector store
        _vector_store = await vector_store_service.initialize_store()
        logger.info("Advanced vector store initialized")
    except Exception as e:
        logger.warning(f"Failed to initialize advanced vector store: {e}")
        if _use_simple_store:
            logger.info("Falling back to simple vector store")
            _vector_store = _simple_store
        else:
            logger.error("No vector store available")
            raise

    logger.info("Vector store service initialized")