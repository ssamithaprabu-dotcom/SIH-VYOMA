from typing import List, Dict, Any, Optional
from ai_backend.rag.embeddings import LocalEmbeddingModel
from ai_backend.rag.chunker import Chunk
import numpy as np

class VectorStore:
    """
    Vector database manager with ChromaDB contract compatibility and metadata filtering support.
    """
    def __init__(self, collection_name: str = "vyoma_knowledge"):
        self.collection_name = collection_name
        self.embedding_model = LocalEmbeddingModel()
        self.documents: List[str] = []
        self.metadatas: List[Dict[str, Any]] = []
        self.ids: List[str] = []
        self.embeddings: List[List[float]] = []

    def add_chunks(self, chunks: List[Chunk]):
        for i, chunk in enumerate(chunks):
            doc_id = chunk.metadata.get("chunk_id", f"chunk_{len(self.ids)}")
            self.ids.append(doc_id)
            self.documents.append(chunk.content)
            self.metadatas.append(chunk.metadata)
        
        # Batch embed documents
        new_embeds = self.embedding_model.embed_documents([c.content for c in chunks])
        self.embeddings.extend(new_embeds)

    def query(self, query_text: str, top_k: int = 3, metadata_filter: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        if not self.documents:
            return []

        query_vec = np.array(self.embedding_model.embed_query(query_text), dtype=np.float32)

        # Filter by metadata if provided (e.g. sensor or fault_id)
        candidate_indices = []
        for idx, meta in enumerate(self.metadatas):
            match = True
            if metadata_filter:
                for k, v in metadata_filter.items():
                    if k in meta and str(meta[k]).lower() != str(v).lower():
                        match = False
                        break
            if match:
                candidate_indices.append(idx)

        # Fallback to all indices if metadata filter yields empty
        if not candidate_indices:
            candidate_indices = list(range(len(self.documents)))

        # Cosine similarity scoring over candidate indices
        scores = []
        for idx in candidate_indices:
            doc_vec = np.array(self.embeddings[idx], dtype=np.float32)
            dot = float(np.dot(query_vec, doc_vec))
            scores.append((dot, idx))

        scores.sort(key=lambda x: x[0], reverse=True)
        top_matches = scores[:top_k]

        results = []
        for score, idx in top_matches:
            results.append({
                "content": self.documents[idx],
                "metadata": self.metadatas[idx],
                "score": score,
                "source": self.metadatas[idx].get("filename", "unknown")
            })

        return results
