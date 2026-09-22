from typing import List, Dict, Any
from ai_backend.rag.loader import DocumentLoader
from ai_backend.rag.chunker import MarkdownChunker
from ai_backend.rag.vectorstore import VectorStore

class HybridRetriever:
    """
    Hybrid retriever combining metadata filtering (sensor + fault_id) with semantic search.
    """
    def __init__(self, knowledge_base_path: str = "knowledge"):
        self.loader = DocumentLoader(knowledge_base_path)
        self.chunker = MarkdownChunker()
        self.vectorstore = VectorStore()
        self.is_indexed = False
        self.index_knowledge_base()

    def index_knowledge_base(self):
        docs = self.loader.load_documents()
        all_chunks = []
        for d in docs:
            all_chunks.extend(self.chunker.chunk_document(d))
        if all_chunks:
            self.vectorstore.add_chunks(all_chunks)
        self.is_indexed = True

    def retrieve_for_fault(self, sensor: str, fault_id: str, flight_phase: str, top_k: int = 3) -> List[Dict[str, Any]]:
        query_text = f"Sensor: {sensor} Fault: {fault_id} Flight Phase: {flight_phase} troubleshooting procedures and causes"
        filter_dict = {"fault_id": fault_id}
        
        # Metadata filter search first
        results = self.vectorstore.query(query_text, top_k=top_k, metadata_filter=filter_dict)
        
        # If empty, fallback to sensor filter
        if not results:
            filter_dict = {"sensor": sensor}
            results = self.vectorstore.query(query_text, top_k=top_k, metadata_filter=filter_dict)
        
        # If still empty, plain semantic search
        if not results:
            results = self.vectorstore.query(query_text, top_k=top_k, metadata_filter=None)

        return results

    def query_semantic(self, query_text: str, top_k: int = 3) -> List[Dict[str, Any]]:
        return self.vectorstore.query(query_text, top_k=top_k, metadata_filter=None)
