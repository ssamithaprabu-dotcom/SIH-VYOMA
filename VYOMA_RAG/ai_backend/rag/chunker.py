from typing import List, Dict, Any
from ai_backend.rag.loader import Document

class Chunk:
    def __init__(self, content: str, metadata: Dict[str, Any]):
        self.content = content
        self.metadata = metadata

class MarkdownChunker:
    """
    Splits Markdown by headings first (# ## ###), then by chunk_size and overlap.
    Preserves document metadata on every chunk.
    """
    def __init__(self, chunk_size: int = 500, chunk_overlap: int = 50):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def chunk_document(self, doc: Document) -> List[Chunk]:
        chunks: List[Chunk] = []
        raw_text = doc.content

        # Split by headings
        lines = raw_text.splitlines()
        sections: List[str] = []
        current_section: List[str] = []

        for line in lines:
            if line.startswith("#") and current_section:
                sections.append("\n".join(current_section))
                current_section = [line]
            else:
                current_section.append(line)
        if current_section:
            sections.append("\n".join(current_section))

        chunk_idx = 0
        for sec in sections:
            if len(sec) <= self.chunk_size:
                meta = doc.metadata.copy()
                meta["chunk_id"] = f"{meta.get('filename', 'doc')}_{chunk_idx}"
                chunks.append(Chunk(content=sec.strip(), metadata=meta))
                chunk_idx += 1
            else:
                # Sub-chunk larger sections
                start = 0
                while start < len(sec):
                    end = start + self.chunk_size
                    text_segment = sec[start:end].strip()
                    if text_segment:
                        meta = doc.metadata.copy()
                        meta["chunk_id"] = f"{meta.get('filename', 'doc')}_{chunk_idx}"
                        chunks.append(Chunk(content=text_segment, metadata=meta))
                        chunk_idx += 1
                    start += (self.chunk_size - self.chunk_overlap)

        return chunks
