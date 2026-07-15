"""
Error Embedding Generation Module

This module provides semantic embedding generation for error messages using
HuggingFace's sentence-transformers library with the all-MiniLM-L6-v2 model.

The model runs locally (no API key needed) and generates 384-dimensional vectors
optimized for cosine similarity search.
"""

import threading

from sentence_transformers import SentenceTransformer
from typing import List, Dict, Any
import numpy as np
from dataclasses import dataclass


@dataclass
class ErrorEvent:
    """Represents an error event with context for embedding generation"""
    event_id: str
    node_id: str
    node_name: str
    node_type: str
    error_message: str
    error_type: str = None
    stack_trace: str = None
    timestamp: str = None


class ErrorEmbedder:
    """
    Generates semantic embeddings for error messages using HuggingFace models.

    Uses the sentence-transformers/all-MiniLM-L6-v2 model which:
    - Runs locally (no API key needed)
    - Generates 384-dimensional vectors
    - Fast inference (~5-10ms per error on CPU)
    - Good semantic understanding of technical errors

    The embeddings are L2-normalized for cosine similarity search.
    """

    def __init__(self, model_name: str = 'sentence-transformers/all-MiniLM-L6-v2'):
        """
        Initialize the embedder with a pre-trained model.

        Args:
            model_name: HuggingFace model identifier
                       Default: sentence-transformers/all-MiniLM-L6-v2

        Note: First run will download the model (~80MB). Subsequent runs
              load from cache.
        """
        self.model = SentenceTransformer(model_name)
        self.model.eval()  # Set to evaluation mode (no training)
        self.embedding_dim = 384  # Dimension for all-MiniLM-L6-v2

    def generate_embedding(self, error: ErrorEvent) -> np.ndarray:
        """
        Generate semantic embedding for a single error.

        Combines multiple fields for rich context:
        - Error message (primary signal)
        - Node type (context: what was being attempted)
        - Error type (class: timeout, auth, etc.)

        Args:
            error: ErrorEvent object with error details

        Returns:
            384-dimensional L2-normalized numpy array

        Example:
            >>> embedder = ErrorEmbedder()
            >>> error = ErrorEvent(
            ...     error_message="API timeout after 30s",
            ...     node_type="n8n-nodes-base.httpRequest",
            ...     error_type="TimeoutError"
            ... )
            >>> embedding = embedder.generate_embedding(error)
            >>> embedding.shape
            (384,)
        """
        text = self._create_text_representation(error)

        embedding = self.model.encode(
            text,
            convert_to_numpy=True,
            normalize_embeddings=True  # L2 normalization for cosine similarity
        )

        return embedding

    def generate_embeddings_batch(
        self,
        errors: List[ErrorEvent],
        batch_size: int = 32
    ) -> np.ndarray:
        """
        Generate embeddings for multiple errors efficiently.

        Uses batching for 3-5x speedup vs sequential processing.
        Useful when processing many errors from an execution.

        Args:
            errors: List of ErrorEvent objects
            batch_size: Number of errors to process at once
                       Default: 32 (optimal for CPU)

        Returns:
            Array of shape (len(errors), 384)

        Example:
            >>> embedder = ErrorEmbedder()
            >>> errors = [error1, error2, error3, ...]
            >>> embeddings = embedder.generate_embeddings_batch(errors)
            >>> embeddings.shape
            (len(errors), 384)
        """
        if not errors:
            return np.array([])

        texts = [
            self._create_text_representation(error)
            for error in errors
        ]

        embeddings = self.model.encode(
            texts,
            batch_size=batch_size,
            show_progress_bar=False,  # Disable progress bar for API use
            convert_to_numpy=True,
            normalize_embeddings=True
        )

        return embeddings

    def _create_text_representation(self, error: ErrorEvent) -> str:
        """
        Create rich text representation from error for embedding.

        Format:
            Error: <error_message>
            Type: <error_type>
            Node: <readable_node_type>

        This structured format helps the model understand:
        1. What went wrong (error message)
        2. How it failed (error type)
        3. Where it failed (node context)

        Args:
            error: ErrorEvent object

        Returns:
            Structured text representation

        Example:
            Input: ErrorEvent(
                error_message="timeout after 30s",
                error_type="TimeoutError",
                node_type="n8n-nodes-base.httpRequest"
            )
            Output: "Error: timeout after 30s\nType: TimeoutError\nNode: HTTP Request"
        """
        parts = []

        # 1. Error message (most important signal)
        if error.error_message:
            parts.append(f"Error: {error.error_message}")

        # 2. Error type (category)
        if error.error_type:
            parts.append(f"Type: {error.error_type}")

        # 3. Node type (context)
        if error.node_type:
            # Convert technical name to readable format
            # 'n8n-nodes-base.httpRequest' → 'HTTP Request'
            readable_type = self._humanize_node_type(error.node_type)
            parts.append(f"Node: {readable_type}")

        # 4. Combine with newlines (helps model understand structure)
        return "\n".join(parts)

    def _humanize_node_type(self, node_type: str) -> str:
        """
        Convert technical node type to human-readable format.

        Examples:
            'n8n-nodes-base.httpRequest' → 'HTTP Request'
            'n8n-nodes-base.anthropic' → 'Anthropic'
            '@n8n/n8n-nodes-langchain.agent' → 'Agent'

        Args:
            node_type: Technical node type identifier

        Returns:
            Human-readable node type
        """
        # Extract the last part after the final dot
        readable = node_type.split('.')[-1]

        # Insert spaces before capital letters
        # 'httpRequest' → 'http Request' → 'HTTP Request'
        spaced = ''.join([
            ' ' + c if c.isupper() else c
            for c in readable
        ]).strip()

        # Title case each word
        return spaced.title()


def clean_error_message(raw_message: str) -> str:
    """
    Remove noise from error messages while preserving semantic meaning.

    Cleaning steps:
    1. Remove UUIDs, IDs, timestamps (ephemeral data)
    2. Normalize paths (e.g., /home/user/app → <path>)
    3. Remove line numbers from stack traces
    4. Remove IP addresses
    5. Normalize whitespace
    6. Lowercase for consistency

    This ensures similar errors cluster together even if they have different
    IDs, timestamps, or paths.

    Args:
        raw_message: Original error message

    Returns:
        Cleaned error message

    Examples:
        >>> clean_error_message("Error in request abc-123-def")
        "error in request <id>"

        >>> clean_error_message("Timeout after 30s at 2024-01-11T10:30:00Z")
        "timeout after 30s at <timestamp>"

        >>> clean_error_message("File /home/user/app.py line 42")
        "file <path> line <num>"
    """
    import re

    if not raw_message:
        return ""

    cleaned = raw_message

    # Remove UUIDs (8-4-4-4-12 format)
    cleaned = re.sub(
        r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}',
        '<id>',
        cleaned,
        flags=re.IGNORECASE
    )

    # Remove timestamps (ISO 8601 format)
    cleaned = re.sub(
        r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?',
        '<timestamp>',
        cleaned
    )

    # Remove file paths (Unix and Windows)
    cleaned = re.sub(
        r'(?:/|[A-Z]:\\)[a-zA-Z0-9_/\\.-]+\.(py|js|ts|json)',
        '<path>',
        cleaned
    )

    # Remove line numbers
    cleaned = re.sub(r'line \d+', 'line <num>', cleaned)

    # Remove IP addresses
    cleaned = re.sub(
        r'\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b',
        '<ip>',
        cleaned
    )

    # Remove ports
    cleaned = re.sub(r':(\d{2,5})\b', ':<port>', cleaned)

    # Normalize whitespace
    cleaned = ' '.join(cleaned.split())

    # Lowercase for consistency
    cleaned = cleaned.lower()

    return cleaned


# =============================================================================
# Shared embedder singleton
# =============================================================================
# Loading the SentenceTransformer model costs ~1.4s and ~80MB RAM. Endpoints
# construct analyzers per request, so the model must be loaded once per
# process and shared. The lock prevents duplicate loads when concurrent
# requests (asyncio.to_thread workers) race on first access.

_shared_embedder = None
_shared_embedder_lock = threading.Lock()


def get_shared_embedder() -> ErrorEmbedder:
    """Return the process-wide ErrorEmbedder, loading the model on first use."""
    global _shared_embedder
    if _shared_embedder is None:
        with _shared_embedder_lock:
            if _shared_embedder is None:
                _shared_embedder = ErrorEmbedder()
    return _shared_embedder
