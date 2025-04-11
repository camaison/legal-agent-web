// API client for the legal document analyzer backend

// Base API URL - configure in .env if needed
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Type definitions
export interface ClausePosition {
  start: number;
  end: number;
}

export interface ClauseResult {
  selected_text: string;
  reason: string;
  confidence: number;
  position?: ClausePosition;
}

export interface DocumentResults {
  [clauseType: string]: ClauseResult[];
}

export interface DocumentAnalysis {
  document_id: string;
  status: 'processing' | 'completed' | 'failed';
  timestamp: string;
  results: DocumentResults;
  content?: string;
  content_type?: string;
}

export interface Document {
  id: string;
  name: string;
  upload_date: string;
  status: 'processing' | 'completed' | 'failed';
  clauses?: string[]; // For frontend display purposes
}

// API functions
export async function uploadDocument(file: File): Promise<Document> {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to upload document: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      id: data.document_id,
      name: data.name,
      upload_date: data.upload_date,
      status: data.status,
      clauses: [] // No clauses yet since it's just being processed
    };
  } catch (error) {
    console.error("Upload error:", error);
    throw error;
  }
}

export async function fetchDocuments(): Promise<Document[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/documents`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to fetch documents: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Fetch documents error:", error);
    throw error;
  }
}

export async function fetchDocumentAnalysis(documentId: string, includeContent: boolean = true): Promise<DocumentAnalysis> {
  try {
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}?include_content=${includeContent}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to fetch document analysis: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Fetch analysis error:", error);
    throw error;
  }
}

export async function deleteDocument(documentId: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to delete document: ${response.statusText}`);
    }
  } catch (error) {
    console.error("Delete document error:", error);
    throw error;
  }
}

// Helper functions for displaying results
export function getClauseDisplayName(clauseType: string): string {
  // Convert snake_case to display names
  const displayNames: Record<string, string> = {
    'force_majeure': 'Force Majeure',
    'limitation_of_liability': 'Limitation of Liability',
    'assignment': 'Assignment',
    'severability': 'Severability',
    'no_waiver': 'No Waiver',
    'confidentiality': 'Confidentiality',
    'governing_law': 'Governing Law',
  };
  
  return displayNames[clauseType] || clauseType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export function getClauseColor(clauseType: string): string {
  const colors: Record<string, string> = {
    'force_majeure': '#6366F1', // Indigo
    'limitation_of_liability': '#0EA5E9', // Sky blue
    'assignment': '#F97316', // Orange
    'severability': '#EC4899', // Pink
    'no_waiver': '#14B8A6', // Teal
    'confidentiality': '#10B981', // Emerald
    'governing_law': '#64748B', // Slate
  };
  
  return colors[clauseType] || '#64748B'; // Default to slate
}

// Convert backend clause type (snake_case) to frontend clause type (kebab-case)
export function convertClauseTypeToFrontendFormat(clauseType: string): string {
  return clauseType.replace(/_/g, '-');
}

// Convert frontend clause type (kebab-case) to backend clause type (snake_case)
export function convertClauseTypeToBackendFormat(clauseType: string): string {
  return clauseType.replace(/-/g, '_');
}

export async function addNoteToAnnotation(
  documentId: string,
  annotationId: string,
  text: string
): Promise<number> {
  try {
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}/annotations/${annotationId}/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error(`Failed to add note: ${response.status}`);
    }

    const data = await response.json();
    return data.id;
  } catch (error) {
    console.error('Error adding note:', error);
    throw error;
  }
}

export async function getNoteForAnnotation(
  documentId: string,
  annotationId: string
): Promise<{ id: number; text: string; created_at: string; updated_at: string } | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}/annotations/${annotationId}/notes`);

    if (!response.ok) {
      throw new Error(`Failed to get note: ${response.status}`);
    }

    const data = await response.json();
    return data.note;
  } catch (error) {
    console.error('Error getting note:', error);
    throw error;
  }
}

export async function getDocumentNotes(
  documentId: string
): Promise<Array<{ id: number; annotation_id: string; text: string; created_at: string; updated_at: string }>> {
  try {
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}/notes`);

    if (!response.ok) {
      throw new Error(`Failed to get notes: ${response.status}`);
    }

    const data = await response.json();
    return data.notes;
  } catch (error) {
    console.error('Error getting notes:', error);
    throw error;
  }
}

export async function updateNote(
  documentId: string,
  noteId: number,
  text: string
): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}/notes/${noteId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update note: ${response.status}`);
    }
  } catch (error) {
    console.error('Error updating note:', error);
    throw error;
  }
}

export async function deleteNote(
  documentId: string,
  noteId: number
): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}/notes/${noteId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete note: ${response.status}`);
    }
  } catch (error) {
    console.error('Error deleting note:', error);
    throw error;
  }
} 