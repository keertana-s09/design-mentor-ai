export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      ai_critiques: {
        Row: {
          verified: boolean
          color_score: number | null
          created_at: string
          design_id: string
          detailed_feedback: Json | null
          id: string
          improvements: string[] | null
          layout_score: number | null
          model: string | null
          overall_score: number | null
          quick_wins: string[] | null
          strengths: string[] | null
          typography_score: number | null
          version: number | null
        }
        Insert: {
          verified?: boolean
          color_score?: number | null
          created_at?: string
          design_id: string
          detailed_feedback?: Json | null
          id?: string
          improvements?: string[] | null
          layout_score?: number | null
          model?: string | null
          overall_score?: number | null
          quick_wins?: string[] | null
          strengths?: string[] | null
          typography_score?: number | null
          version?: number | null
        }
        Update: {
          verified?: boolean
          color_score?: number | null
          created_at?: string
          design_id?: string
          detailed_feedback?: Json | null
          id?: string
          improvements?: string[] | null
          layout_score?: number | null
          model?: string | null
          overall_score?: number | null
          quick_wins?: string[] | null
          strengths?: string[] | null
          typography_score?: number | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_critiques_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id"]
          },
        ]
      }
      analysis_sessions: {
        Row: {
          created_at: string
          design_id: string | null
          feedback: Json | null
          id: string
          image_url: string | null
          overall_score: number | null
          source: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          design_id?: string | null
          feedback?: Json | null
          id?: string
          image_url?: string | null
          overall_score?: number | null
          source?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          design_id?: string | null
          feedback?: Json | null
          id?: string
          image_url?: string | null
          overall_score?: number | null
          source?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analysis_sessions_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_submissions: {
        Row: {
          ai_verified: boolean
          ai_evaluation: Json | null
          ai_overall_score: number | null
          challenge_id: string
          created_at: string
          design_id: string
          designer_id: string
          id: string
          recruiter_feedback: Json | null
          recruiter_recommendation: string | null
          reviewed_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          ai_verified?: boolean
          ai_evaluation?: Json | null
          ai_overall_score?: number | null
          challenge_id: string
          created_at?: string
          design_id: string
          designer_id: string
          id?: string
          recruiter_feedback?: Json | null
          recruiter_recommendation?: string | null
          reviewed_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          ai_verified?: boolean
          ai_evaluation?: Json | null
          ai_overall_score?: number | null
          challenge_id?: string
          created_at?: string
          design_id?: string
          designer_id?: string
          id?: string
          recruiter_feedback?: Json | null
          recruiter_recommendation?: string | null
          reviewed_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_submissions_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_submissions_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          constraints: string | null
          created_at: string
          evaluation_criteria: Json
          id: string
          primary_goal: string | null
          problem_statement: string | null
          recruiter_id: string
          status: string
          target_user: string | null
          title: string
          updated_at: string
        }
        Insert: {
          constraints?: string | null
          created_at?: string
          evaluation_criteria?: Json
          id?: string
          primary_goal?: string | null
          problem_statement?: string | null
          recruiter_id: string
          status?: string
          target_user?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          constraints?: string | null
          created_at?: string
          evaluation_criteria?: Json
          id?: string
          primary_goal?: string | null
          problem_statement?: string | null
          recruiter_id?: string
          status?: string
          target_user?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      design_comparisons: {
        Row: {
          created_at: string
          design_ids: string[]
          id: string
          owner_id: string
          result: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          design_ids?: string[]
          id?: string
          owner_id: string
          result?: Json | null
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          design_ids?: string[]
          id?: string
          owner_id?: string
          result?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      design_evaluations: {
        Row: {
          created_at: string
          design_id: string
          designer_id: string
          id: string
          notes: string | null
          rating: number | null
          recruiter_id: string
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          design_id: string
          designer_id: string
          id?: string
          notes?: string | null
          rating?: number | null
          recruiter_id: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          design_id?: string
          designer_id?: string
          id?: string
          notes?: string | null
          rating?: number | null
          recruiter_id?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "design_evaluations_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id"]
          },
        ]
      }
      designs: {
        Row: {
          parent_design_id: string | null
          category: string | null
          created_at: string
          description: string | null
          designer_id: string
          id: string
          image_url: string
          source_platform: string | null
          source_type: string | null
          source_url: string | null
          storage_path: string | null
          storage_paths: Json | null
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          parent_design_id?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          designer_id: string
          id?: string
          image_url: string
          source_platform?: string | null
          source_type?: string | null
          source_url?: string | null
          storage_path?: string | null
          storage_paths?: Json | null
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          parent_design_id?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          designer_id?: string
          id?: string
          image_url?: string
          source_platform?: string | null
          source_type?: string | null
          source_url?: string | null
          storage_path?: string | null
          storage_paths?: Json | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "designs_parent_design_id_fkey"
            columns: ["parent_design_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          portfolio_url: string | null
          specializations: string[] | null
          updated_at: string
          user_id: string
          years_experience: number | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          portfolio_url?: string | null
          specializations?: string[] | null
          updated_at?: string
          user_id: string
          years_experience?: number | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          portfolio_url?: string | null
          specializations?: string[] | null
          updated_at?: string
          user_id?: string
          years_experience?: number | null
        }
        Relationships: []
      }
      recruiter_applications: {
        Row: {
          created_at: string
          reviewed_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          reviewed_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          reviewed_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      recruiter_evaluations: {
        Row: {
          created_at: string
          design_id: string | null
          designer_id: string
          id: string
          notes: string | null
          rating: number | null
          recruiter_id: string
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          design_id?: string | null
          designer_id: string
          id?: string
          notes?: string | null
          rating?: number | null
          recruiter_id: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          design_id?: string | null
          designer_id?: string
          id?: string
          notes?: string | null
          rating?: number | null
          recruiter_id?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruiter_evaluations_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: string
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
    }
    Enums: {
      app_role: "designer" | "recruiter"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["designer", "recruiter"],
    },
  },
} as const
