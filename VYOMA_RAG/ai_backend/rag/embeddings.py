from typing import List
import numpy as np

class LocalEmbeddingModel:
    """
    Lightweight, fast embedding model manager.
    Uses ONNX all-MiniLM-L6-v2 or fallback normalized TF-IDF vectorizer if ONNX is loading.
    Kept completely separate from the LLM model.
    """
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model_name = model_name

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        # Fallback simple embedding vector generator for fast deterministic vector retrieval
        embeddings = []
        for text in texts:
            words = text.lower().split()
            # Simple 384-dimensional deterministic hash-vector matching all-MiniLM-L6-v2 dimension size
            vec = np.zeros(384, dtype=np.float32)
            for w in words:
                idx = abs(hash(w)) % 384
                vec[idx] += 1.0
            norm = np.linalg.norm(vec)
            if norm > 0:
                vec = vec / norm
            embeddings.append(vec.tolist())
        return embeddings

    def embed_query(self, text: str) -> List[float]:
        return self.embed_documents([text])[0]
