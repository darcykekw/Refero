/**
 * Supabase Database Type Definitions
 *
 * These are hand-written to match 001_init_schema.sql.
 * You can replace this file with auto-generated types by running:
 *   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      colleges: {
        Row: {
          id: string
          college_name: string
          date_added: string
          date_modified: string
        }
        Insert: {
          id?: string
          college_name: string
          date_added?: string
          date_modified?: string
        }
        Update: {
          id?: string
          college_name?: string
          date_added?: string
          date_modified?: string
        }
      }
      programs: {
        Row: {
          id: string
          prog_name: string
          college_id: string
          logo: string
          date_added: string
          date_modified: string
        }
        Insert: {
          id?: string
          prog_name: string
          college_id: string
          logo?: string
          date_added?: string
          date_modified?: string
        }
        Update: {
          id?: string
          prog_name?: string
          college_id?: string
          logo?: string
          date_added?: string
          date_modified?: string
        }
      }
      tags: {
        Row: {
          id: string
          name: string
          date_added: string
          date_modified: string
        }
        Insert: {
          id?: string
          name: string
          date_added?: string
          date_modified?: string
        }
        Update: {
          id?: string
          name?: string
          date_added?: string
          date_modified?: string
        }
      }
      theses: {
        Row: {
          id: string
          title: string
          abstract: string
          authors: string
          adviser: string | null
          year_submitted: number
          uploaded_by: string
          college_id: string
          program_id: string
          panel_score: number | null
          pdf_file: string
          view_count: number
          ss_paper_id: string | null
          date_added: string
          date_modified: string
        }
        Insert: {
          id?: string
          title: string
          abstract: string
          authors: string
          adviser?: string | null
          year_submitted: number
          uploaded_by: string
          college_id: string
          program_id: string
          panel_score?: number | null
          pdf_file?: string
          view_count?: number
          ss_paper_id?: string | null
          date_added?: string
          date_modified?: string
        }
        Update: {
          id?: string
          title?: string
          abstract?: string
          authors?: string
          adviser?: string | null
          year_submitted?: number
          uploaded_by?: string
          college_id?: string
          program_id?: string
          panel_score?: number | null
          pdf_file?: string
          view_count?: number
          ss_paper_id?: string | null
          date_added?: string
          date_modified?: string
        }
      }
      thesis_tags: {
        Row: {
          thesis_id: string
          tag_id: string
        }
        Insert: {
          thesis_id: string
          tag_id: string
        }
        Update: {
          thesis_id?: string
          tag_id?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

// ── Convenience aliases ──────────────────────────────────────────────────────
export type College   = Database['public']['Tables']['colleges']['Row']
export type Program   = Database['public']['Tables']['programs']['Row']
export type Tag       = Database['public']['Tables']['tags']['Row']
export type Thesis    = Database['public']['Tables']['theses']['Row']
export type ThesisTag = Database['public']['Tables']['thesis_tags']['Row']

/** Thesis with its related college, program, and tags joined */
export interface ThesisWithRelations extends Thesis {
  college: College
  program: Program
  tags: Tag[]
}
