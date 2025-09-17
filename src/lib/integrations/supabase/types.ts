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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      archetype_muscle_map: {
        Row: {
          archetype_id: string
          created_at: string | null
          muscle_id: string
        }
        Insert: {
          archetype_id: string
          created_at?: string | null
          muscle_id: string
        }
        Update: {
          archetype_id?: string
          created_at?: string | null
          muscle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "archetype_muscle_map_archetype_id_fkey"
            columns: ["archetype_id"]
            isOneToOne: false
            referencedRelation: "movement_archetypes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "archetype_muscle_map_muscle_id_fkey"
            columns: ["muscle_id"]
            isOneToOne: false
            referencedRelation: "muscle_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_types: {
        Row: {
          created_at: string | null
          id: string
          name: string
          order: number
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          order?: number
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          order?: number
          user_id?: string | null
        }
        Relationships: []
      }
      exercise_muscle_groups: {
        Row: {
          created_at: string | null
          exercise_id: string
          muscle_definition_id: string
        }
        Insert: {
          created_at?: string | null
          exercise_id: string
          muscle_definition_id: string
        }
        Update: {
          created_at?: string | null
          exercise_id?: string
          muscle_definition_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_muscle_groups_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_muscle_groups_muscle_definition_id_fkey"
            columns: ["muscle_definition_id"]
            isOneToOne: false
            referencedRelation: "muscle_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_sets: {
        Row: {
          completed: boolean
          created_at: string | null
          distance_km: number | null
          equipment_type: string | null
          id: string
          reps: number | null
          set_number: number
          time_seconds: number | null
          variation: string | null
          weight: number
          workout_exercise_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string | null
          distance_km?: number | null
          equipment_type?: string | null
          id?: string
          reps?: number | null
          set_number: number
          time_seconds?: number | null
          variation?: string | null
          weight: number
          workout_exercise_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string | null
          distance_km?: number | null
          equipment_type?: string | null
          id?: string
          reps?: number | null
          set_number?: number
          time_seconds?: number | null
          variation?: string | null
          weight?: number
          workout_exercise_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_sets_workout_exercise_id_fkey"
            columns: ["workout_exercise_id"]
            isOneToOne: false
            referencedRelation: "workout_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_variations: {
        Row: {
          created_at: string | null
          exercise_id: string
          id: string
          variation_name: string
        }
        Insert: {
          created_at?: string | null
          exercise_id: string
          id?: string
          variation_name: string
        }
        Update: {
          created_at?: string | null
          exercise_id?: string
          id?: string
          variation_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_variations_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          archetype_id: string | null
          created_at: string | null
          created_by_user_id: string | null
          default_equipment_type: string | null
          exercise_type: string | null
          id: string
          is_static: boolean | null
          name: string
          order: number
        }
        Insert: {
          archetype_id?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          default_equipment_type?: string | null
          exercise_type?: string | null
          id?: string
          is_static?: boolean | null
          name: string
          order?: number
        }
        Update: {
          archetype_id?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          default_equipment_type?: string | null
          exercise_type?: string | null
          id?: string
          is_static?: boolean | null
          name?: string
          order?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_exercise_archetype"
            columns: ["archetype_id"]
            isOneToOne: false
            referencedRelation: "movement_archetypes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_exercises_archetype_id_unique"
            columns: ["archetype_id"]
            isOneToOne: false
            referencedRelation: "movement_archetypes"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_reflections: {
        Row: {
          created_at: string
          goal_id: string
          id: string
          note: string | null
          user_id: string
          week_start_date: string
        }
        Insert: {
          created_at?: string
          goal_id: string
          id?: string
          note?: string | null
          user_id: string
          week_start_date: string
        }
        Update: {
          created_at?: string
          goal_id?: string
          id?: string
          note?: string | null
          user_id?: string
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_reflections_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_reflections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_completions: {
        Row: {
          created_at: string
          date: string
          habit_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          habit_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          habit_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_completions_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habit_completions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          created_at: string
          frequency: string
          id: string
          is_active: boolean
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          frequency?: string
          id?: string
          is_active?: boolean
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          frequency?: string
          id?: string
          is_active?: boolean
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      movement_archetypes: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      muscle_definitions: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          avatar_url: string | null
          created_at: string
          focus: string | null
          height: number | null
          id: string
          preferred_distance_unit: string | null
          preferred_height_unit: string | null
          preferred_weight_unit: string | null
          updated_at: string
          username: string | null
          weight: number | null
        }
        Insert: {
          age?: number | null
          avatar_url?: string | null
          created_at?: string
          focus?: string | null
          height?: number | null
          id: string
          preferred_distance_unit?: string | null
          preferred_height_unit?: string | null
          preferred_weight_unit?: string | null
          updated_at?: string
          username?: string | null
          weight?: number | null
        }
        Update: {
          age?: number | null
          avatar_url?: string | null
          created_at?: string
          focus?: string | null
          height?: number | null
          id?: string
          preferred_distance_unit?: string | null
          preferred_height_unit?: string | null
          preferred_weight_unit?: string | null
          updated_at?: string
          username?: string | null
          weight?: number | null
        }
        Relationships: []
      }
      protein_intake: {
        Row: {
          amount_grams: number
          created_at: string | null
          date: string
          id: string
          user_id: string
        }
        Insert: {
          amount_grams: number
          created_at?: string | null
          date: string
          id?: string
          user_id: string
        }
        Update: {
          amount_grams?: number
          created_at?: string | null
          date?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      sun_exposure_log: {
        Row: {
          created_at: string
          date: string
          hours: number
          id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          hours: number
          id?: number
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          hours?: number
          id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sun_exposure_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_exercise_stats: {
        Row: {
          custom_variations: string[] | null
          exercise_id: string
          last_used_equipment_type: string | null
          one_rep_max: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          custom_variations?: string[] | null
          exercise_id: string
          last_used_equipment_type?: string | null
          one_rep_max?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          custom_variations?: string[] | null
          exercise_id?: string
          last_used_equipment_type?: string | null
          one_rep_max?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_exercise_stats_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      user_hidden_exercises: {
        Row: {
          created_at: string
          exercise_id: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          exercise_id?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          exercise_id?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_hidden_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_hidden_exercises_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_exercises: {
        Row: {
          created_at: string | null
          exercise_id: string
          id: string
          order: number
          workout_id: string
        }
        Insert: {
          created_at?: string | null
          exercise_id: string
          id?: string
          order: number
          workout_id: string
        }
        Update: {
          created_at?: string | null
          exercise_id?: string
          id?: string
          order?: number
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_exercises_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
          completed: boolean
          created_at: string | null
          duration_seconds: number | null
          id: string
          is_single_log: boolean
          notes: string | null
          session_focus: string | null
          type: string | null
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          is_single_log?: boolean
          notes?: string | null
          session_focus?: string | null
          type?: string | null
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          is_single_log?: boolean
          notes?: string | null
          session_focus?: string | null
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      exercise_sets_readable: {
        Row: {
          completed: boolean | null
          created_at: string | null
          distance_km: number | null
          equipment_type: string | null
          exercise_name: string | null
          exercise_type: string | null
          id: string | null
          reps: number | null
          set_number: number | null
          time_seconds: number | null
          username: string | null
          variation: string | null
          weight: number | null
          workout_exercise_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_sets_workout_exercise_id_fkey"
            columns: ["workout_exercise_id"]
            isOneToOne: false
            referencedRelation: "workout_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_variations_readable: {
        Row: {
          created_at: string | null
          exercise_id: string | null
          exercise_name: string | null
          id: string | null
          variation_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_variations_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      fetch_exercise_volume_history: {
        Args: { p_exercise_id: string; p_user_id: string }
        Returns: {
          equipment_type: string
          total_reps: number
          total_sets: number
          total_volume: number
          variation: string
          workout_date: string
        }[]
      }
      fetch_weekly_archetype_sets: {
        Args: { p_user_id: string }
        Returns: {
          archetype_subtype_name: string
          base_archetype_name: string
          total_sets: number
        }[]
      }
      fetch_weekly_archetype_sets_v2: {
        Args: { p_end_date: string; p_start_date: string; p_user_id: string }
        Returns: {
          archetype_subtype_name: string
          base_archetype_name: string
          total_sets: number
        }[]
      }
      fetch_weekly_sets_per_muscle_group: {
        Args: { p_user_id: string }
        Returns: {
          archetype_subtype_name: string
          base_archetype_name: string
          muscle_definition_name: string
          total_sets: number
        }[]
      }
      get_exercise_max_e1rm_history: {
        Args: { p_exercise_id: string; p_user_id: string }
        Returns: {
          equipment_type: string
          max_e1rm: number
          variation: string
          workout_date: string
        }[]
      }
      get_exercise_muscle_group_map: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_latest_max_e1rm_for_exercises: {
        Args: { p_exercise_ids: string[]; p_user_id: string }
        Returns: {
          equipment_type: string
          exercise_id: string
          max_e1rm: number
        }[]
      }
      get_latest_max_reps_for_exercises: {
        Args: { p_exercise_ids: string[]; p_user_id: string }
        Returns: {
          exercise_id: string
          max_reps: number
        }[]
      }
      get_recent_workouts_summary: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          duration_seconds: number
          exercise_names: string[]
          total_completed_sets: number
          workout_created_at: string
          workout_id: string
        }[]
      }
      get_user_performance_stats: {
        Args: { p_user_id: string }
        Returns: {
          most_common_exercise_id: string
          total_duration_seconds: number
          total_workouts: number
        }[]
      }
      get_weekly_zone2_cardio_minutes: {
        Args: { start_date: string; user_id: string }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
