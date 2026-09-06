// ==============================================================================
// PansGPT 2.0 Shared TypeScript Contracts
// ==============================================================================

export type UserRole = 'student' | 'lecturer' | 'admin' | 'super_admin';

export interface UserProfile {
  id: string; // UUIDv7
  email: string;
  fullName: string;
  avatarUrl?: string;
  role: UserRole;
  universityId: string;
  academicLevel: number; // e.g. 100, 200, 300, 400, 500
  createdAt: string;
}

export interface UniversityTenant {
  id: string; // UUIDv7
  name: string;
  slug: string;
  logoUrl?: string;
  isActive: boolean;
}

export interface CourseDocument {
  id: string; // UUIDv7
  universityId: string;
  courseCode: string;
  title: string;
  r2StorageKey: string;
  fileSizeBytes: number;
  pageCount: number;
  isIngested: boolean;
  isApproved: boolean;
  createdAt: string;
}

export interface ChatSession {
  id: string; // UUIDv7
  userId: string;
  documentId?: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string; // UUIDv7
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: Array<{
    toolName: string;
    arguments: Record<string, unknown>;
    result?: unknown;
  }>;
  createdAt: string;
}

export interface QuizQuestion {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'fill_blank' | 'short_answer' | 'clinical_scenario';
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
}
