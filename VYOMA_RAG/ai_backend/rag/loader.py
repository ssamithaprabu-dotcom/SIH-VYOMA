import os
import glob
from typing import List, Dict, Any, Tuple
from pypdf import PdfReader

class Document:
    def __init__(self, content: str, metadata: Dict[str, Any], filepath: str):
        self.content = content
        self.metadata = metadata
        self.filepath = filepath

class DocumentLoader:
    """
    Loads Markdown (.md), TXT (.txt), and PDF (.pdf) documents from knowledge base directory.
    Extracts YAML front-matter metadata (category, sensor, fault_id).
    """
    def __init__(self, knowledge_base_dir: str = "knowledge"):
        self.base_dir = knowledge_base_dir

    def parse_front_matter(self, text: str) -> Tuple[Dict[str, Any], str]:
        metadata: Dict[str, Any] = {}
        content = text
        if text.startswith("---"):
            parts = text.split("---", 2)
            if len(parts) >= 3:
                yaml_text = parts[1]
                content = parts[2].strip()
                for line in yaml_text.splitlines():
                    if ":" in line:
                        k, v = line.split(":", 1)
                        metadata[k.strip()] = v.strip()
        return metadata, content

    def load_documents(self) -> List[Document]:
        documents: List[Document] = []
        if not os.path.exists(self.base_dir):
            return documents

        # Load Markdown and TXT files
        for ext in ("*.md", "*.txt"):
            for filepath in glob.glob(os.path.join(self.base_dir, "**", ext), recursive=True):
                try:
                    with open(filepath, "r", encoding="utf-8") as f:
                        raw_text = f.read()
                    meta, clean_text = self.parse_front_matter(raw_text)
                    meta["filepath"] = filepath
                    meta["filename"] = os.path.basename(filepath)
                    documents.append(Document(content=clean_text, metadata=meta, filepath=filepath))
                except Exception as e:
                    print(f"[DocumentLoader] Error reading {filepath}: {e}")

        # Load PDF files (lower priority, parsed if present)
        for filepath in glob.glob(os.path.join(self.base_dir, "**", "*.pdf"), recursive=True):
            try:
                reader = PdfReader(filepath)
                text = ""
                for page in reader.pages:
                    text += (page.extract_text() or "") + "\n"
                meta = {
                    "filepath": filepath,
                    "filename": os.path.basename(filepath),
                    "category": "pdf_datasheet"
                }
                documents.append(Document(content=text, metadata=meta, filepath=filepath))
            except Exception as e:
                print(f"[DocumentLoader] Error reading PDF {filepath}: {e}")

        return documents
