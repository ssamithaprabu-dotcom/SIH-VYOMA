from ai_backend.rag.loader import DocumentLoader
from ai_backend.rag.chunker import MarkdownChunker
from ai_backend.rag.retriever import HybridRetriever

def test_document_loader():
    loader = DocumentLoader("knowledge")
    docs = loader.load_documents()
    assert len(docs) >= 3

def test_hybrid_retriever_for_gps_loss():
    retriever = HybridRetriever("knowledge")
    results = retriever.retrieve_for_fault(
        sensor="gps",
        fault_id="GPS_LOSS",
        flight_phase="ASCENT",
        top_k=3
    )
    assert len(results) > 0
    sources = [r["source"] for r in results]
    assert "gps_loss.md" in sources or "neo6m.md" in sources
