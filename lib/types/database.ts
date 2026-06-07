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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      food_preferences: {
        Row: {
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["preference_kind"]
          severity: string | null
          user_id: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["preference_kind"]
          severity?: string | null
          user_id: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["preference_kind"]
          severity?: string | null
          user_id?: string
          value?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          calorie_target: number | null
          created_at: string
          id: string
          is_active: boolean
          protein_target_g: number | null
          target_date: string | null
          target_weight_kg: number | null
          type: Database["public"]["Enums"]["goal_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          calorie_target?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          protein_target_g?: number | null
          target_date?: string | null
          target_weight_kg?: number | null
          type: Database["public"]["Enums"]["goal_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          calorie_target?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          protein_target_g?: number | null
          target_date?: string | null
          target_weight_kg?: number | null
          type?: Database["public"]["Enums"]["goal_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      inventory: {
        Row: {
          category: string | null
          created_at: string
          expires_at: string | null
          id: string
          item_name: string
          quantity: number
          unit: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          item_name: string
          quantity?: number
          unit?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          item_name?: string
          quantity?: number
          unit?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      meal_plan_items: {
        Row: {
          day: string
          id: string
          meal: Database["public"]["Enums"]["meal_type"]
          meal_plan_id: string
          recipe_id: string | null
          servings: number
        }
        Insert: {
          day: string
          id?: string
          meal: Database["public"]["Enums"]["meal_type"]
          meal_plan_id: string
          recipe_id?: string | null
          servings?: number
        }
        Update: {
          day?: string
          id?: string
          meal?: Database["public"]["Enums"]["meal_type"]
          meal_plan_id?: string
          recipe_id?: string | null
          servings?: number
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_items_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plan_items_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plans: {
        Row: {
          created_at: string
          end_date: string
          id: string
          start_date: string
          status: Database["public"]["Enums"]["plan_status"]
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          start_date: string
          status?: Database["public"]["Enums"]["plan_status"]
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["plan_status"]
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          activity_level: string | null
          created_at: string
          display_name: string | null
          dob: string | null
          height_cm: number | null
          id: string
          sex: string | null
          tier: Database["public"]["Enums"]["tier_type"]
          updated_at: string
        }
        Insert: {
          activity_level?: string | null
          created_at?: string
          display_name?: string | null
          dob?: string | null
          height_cm?: number | null
          id: string
          sex?: string | null
          tier?: Database["public"]["Enums"]["tier_type"]
          updated_at?: string
        }
        Update: {
          activity_level?: string | null
          created_at?: string
          display_name?: string | null
          dob?: string | null
          height_cm?: number | null
          id?: string
          sex?: string | null
          tier?: Database["public"]["Enums"]["tier_type"]
          updated_at?: string
        }
        Relationships: []
      }
      recipe_ingredients: {
        Row: {
          id: string
          item_name: string
          quantity: number | null
          recipe_id: string
          unit: string | null
        }
        Insert: {
          id?: string
          item_name: string
          quantity?: number | null
          recipe_id: string
          unit?: string | null
        }
        Update: {
          id?: string
          item_name?: string
          quantity?: number | null
          recipe_id?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          calories_per_serving: number | null
          created_at: string
          id: string
          is_public: boolean
          method: string | null
          protein_g: number | null
          servings: number
          source: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          calories_per_serving?: number | null
          created_at?: string
          id?: string
          is_public?: boolean
          method?: string | null
          protein_g?: number | null
          servings?: number
          source?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          calories_per_serving?: number | null
          created_at?: string
          id?: string
          is_public?: boolean
          method?: string | null
          protein_g?: number | null
          servings?: number
          source?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shopping_list_items: {
        Row: {
          category: string | null
          have_in_pantry: boolean
          id: string
          item_name: string
          purchased: boolean
          quantity: number | null
          shopping_list_id: string
          unit: string | null
        }
        Insert: {
          category?: string | null
          have_in_pantry?: boolean
          id?: string
          item_name: string
          purchased?: boolean
          quantity?: number | null
          shopping_list_id: string
          unit?: string | null
        }
        Update: {
          category?: string | null
          have_in_pantry?: boolean
          id?: string
          item_name?: string
          purchased?: boolean
          quantity?: number | null
          shopping_list_id?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shopping_list_items_shopping_list_id_fkey"
            columns: ["shopping_list_id"]
            isOneToOne: false
            referencedRelation: "shopping_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_lists: {
        Row: {
          created_at: string
          id: string
          meal_plan_id: string | null
          status: Database["public"]["Enums"]["list_status"]
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          meal_plan_id?: string | null
          status?: Database["public"]["Enums"]["list_status"]
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          meal_plan_id?: string | null
          status?: Database["public"]["Enums"]["list_status"]
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_lists_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      weight_logs: {
        Row: {
          created_at: string
          id: string
          logged_at: string
          note: string | null
          user_id: string
          weight_kg: number
        }
        Insert: {
          created_at?: string
          id?: string
          logged_at?: string
          note?: string | null
          user_id: string
          weight_kg: number
        }
        Update: {
          created_at?: string
          id?: string
          logged_at?: string
          note?: string | null
          user_id?: string
          weight_kg?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      goal_type: "weight_loss" | "maintain" | "weight_gain" | "event"
      list_status: "open" | "completed" | "archived"
      meal_type: "breakfast" | "lunch" | "dinner" | "snack"
      plan_status: "draft" | "active" | "completed" | "archived"
      preference_kind: "like" | "dislike" | "allergy" | "diet"
      tier_type: "free" | "premium"
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
    Enums: {
      goal_type: ["weight_loss", "maintain", "weight_gain", "event"],
      list_status: ["open", "completed", "archived"],
      meal_type: ["breakfast", "lunch", "dinner", "snack"],
      plan_status: ["draft", "active", "completed", "archived"],
      preference_kind: ["like", "dislike", "allergy", "diet"],
      tier_type: ["free", "premium"],
    },
  },
} as const
