export interface Note {
  id: number;
  content: string;
  ai_summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface NoteCreate {
  content: string;
}

export interface NoteUpdate {
  content: string;
  regenerate_summary?: boolean;
}