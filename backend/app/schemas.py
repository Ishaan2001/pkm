from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class NoteBase(BaseModel):
    content: str

class NoteCreate(NoteBase):
    pass

class NoteUpdate(BaseModel):
    content: str
    regenerate_summary: bool = False

class Note(NoteBase):
    id: int
    ai_summary: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Notebook schemas
class NotebookBase(BaseModel):
    title: str

class NotebookCreate(NotebookBase):
    pass

class NotebookUpdate(BaseModel):
    title: str

class Notebook(NotebookBase):
    id: int
    created_at: datetime
    updated_at: datetime
    note_count: Optional[int] = 0
    
    class Config:
        from_attributes = True

class NotebookWithNotes(Notebook):
    notes: List[Note] = []

# Search schema
class SearchResult(BaseModel):
    notes: List[Note]
    total_count: int