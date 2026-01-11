// Database types will be generated via:
// npx supabase gen types typescript --local > lib/types/database.ts

export type Database = {
  public: {
    Tables: {
      workflows: {
        Row: {
          id: string
          name: string
          n8n_workflow_id: string | null
          raw_json: any
          node_count: number
          edge_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          n8n_workflow_id?: string | null
          raw_json: any
          node_count: number
          edge_count: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          n8n_workflow_id?: string | null
          raw_json?: any
          node_count?: number
          edge_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      // Add other tables as needed
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
