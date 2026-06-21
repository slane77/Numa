export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          job_title: string | null
          department: string | null
          location: string | null
          avatar_url: string | null
          role: Database["public"]["Enums"]["user_role"]
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          job_title?: string | null
          department?: string | null
          location?: string | null
          avatar_url?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          job_title?: string | null
          department?: string | null
          location?: string | null
          avatar_url?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      editor_allowlist: {
        Row: {
          email: string
          role: Database["public"]["Enums"]["user_role"]
          note: string | null
          created_at: string
        }
        Insert: {
          email: string
          role?: Database["public"]["Enums"]["user_role"]
          note?: string | null
          created_at?: string
        }
        Update: {
          email?: string
          role?: Database["public"]["Enums"]["user_role"]
          note?: string | null
          created_at?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          id: string
          organiser_id: string | null
          title: string
          description: string
          location: string | null
          cover_image_url: string | null
          starts_at: string
          ends_at: string | null
          all_day: boolean
          published: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organiser_id?: string | null
          title: string
          description?: string
          location?: string | null
          cover_image_url?: string | null
          starts_at: string
          ends_at?: string | null
          all_day?: boolean
          published?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organiser_id?: string | null
          title?: string
          description?: string
          location?: string | null
          cover_image_url?: string | null
          starts_at?: string
          ends_at?: string | null
          all_day?: boolean
          published?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      event_rsvps: {
        Row: {
          id: string
          event_id: string
          user_id: string
          status: Database["public"]["Enums"]["rsvp_status"]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          event_id: string
          user_id: string
          status?: Database["public"]["Enums"]["rsvp_status"]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          user_id?: string
          status?: Database["public"]["Enums"]["rsvp_status"]
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      event_media: {
        Row: {
          id: string
          event_id: string
          uploaded_by: string | null
          url: string
          kind: string
          caption: string | null
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          uploaded_by?: string | null
          url: string
          kind?: string
          caption?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          uploaded_by?: string | null
          url?: string
          kind?: string
          caption?: string | null
          created_at?: string
        }
        Relationships: []
      }
      work_status: {
        Row: {
          id: string
          user_id: string
          day: string
          location: Database["public"]["Enums"]["work_location"]
          note: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          day: string
          location: Database["public"]["Enums"]["work_location"]
          note?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          day?: string
          location?: Database["public"]["Enums"]["work_location"]
          note?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      news_posts: {
        Row: {
          id: string
          author_id: string | null
          title: string
          body: string
          excerpt: string | null
          category: string
          cover_image_url: string | null
          is_pinned: boolean
          published: boolean
          published_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          author_id?: string | null
          title: string
          body?: string
          excerpt?: string | null
          category?: string
          cover_image_url?: string | null
          is_pinned?: boolean
          published?: boolean
          published_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          author_id?: string | null
          title?: string
          body?: string
          excerpt?: string | null
          category?: string
          cover_image_url?: string | null
          is_pinned?: boolean
          published?: boolean
          published_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<never, never>
    Functions: {
      current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_editor: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      user_role: "employee" | "editor" | "admin"
      rsvp_status: "going" | "maybe" | "not_going"
      work_location: "office" | "home" | "away"
    }
    CompositeTypes: Record<never, never>
  }
}

type PublicSchema = Database["public"]

export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"]

export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"]

export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"]

export type Enums<T extends keyof PublicSchema["Enums"]> =
  PublicSchema["Enums"][T]
