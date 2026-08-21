/**
 * Supabase Database Type Definitions
 *
 * These are hand-written to match the SQL migrations in supabase/migrations/.
 * You can replace this file with auto-generated types by running:
 *   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts
 *
 * Every table carries a `Relationships` array, and it is not decoration:
 * supabase-js only accepts this type as a schema if each table matches its
 * `GenericTable` shape, which requires that key. Without it the client silently
 * resolved the whole schema to `never`, which is why `.rpc()` calls reported
 * their arguments as `undefined` and inserts had to be cast through `as never`.
 */

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
        Relationships: []
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
        Relationships: [
          {
            foreignKeyName: 'programs_college_id_fkey'
            columns: ['college_id']
            isOneToOne: false
            referencedRelation: 'colleges'
            referencedColumns: ['id']
          },
        ]
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
        Relationships: []
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
        Relationships: [
          {
            foreignKeyName: 'theses_college_id_fkey'
            columns: ['college_id']
            isOneToOne: false
            referencedRelation: 'colleges'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'theses_program_id_fkey'
            columns: ['program_id']
            isOneToOne: false
            referencedRelation: 'programs'
            referencedColumns: ['id']
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: 'thesis_tags_thesis_id_fkey'
            columns: ['thesis_id']
            isOneToOne: false
            referencedRelation: 'theses'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'thesis_tags_tag_id_fkey'
            columns: ['tag_id']
            isOneToOne: false
            referencedRelation: 'tags'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      /** Atomically bumps view_count and returns the new total. */
      increment_thesis_views: {
        Args: { thesis_uuid: string }
        Returns: number
      }
      /** Thesis IDs carrying every one of the given tags. */
      theses_with_all_tags: {
        Args: { tag_ids: string[] }
        Returns: { thesis_id: string }[]
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// ── Convenience aliases ──────────────────────────────────────────────────────
// No alias for thesis_tags: nothing consumes the junction row on its own, because
// every read reaches tags through the nested select in lib/data.ts.
export type College = Database['public']['Tables']['colleges']['Row']
export type Program = Database['public']['Tables']['programs']['Row']
export type Tag     = Database['public']['Tables']['tags']['Row']
export type Thesis  = Database['public']['Tables']['theses']['Row']

/** Thesis with its related college, program, and tags joined */
export interface ThesisWithRelations extends Thesis {
  college: College
  program: Program
  tags: Tag[]
}
