// ==============================================================================
// PansGPT 2.0 Shared TypeScript Contracts
// ==============================================================================

export * from './supabase';

// Re-export core helper types and application DTOs
export type AppTheme = 'light' | 'dark' | 'sepia';

export interface AuthSessionUser {
  id: string;
  email: string;
  fullName: string;
  role: 'student' | 'lecturer' | 'university_admin' | 'super_admin';
  universityId: string | null;
  level: string | null;
}
