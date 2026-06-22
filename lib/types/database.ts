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
          manager_id: string | null
          annual_leave_days: number
          is_hr: boolean
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
          manager_id?: string | null
          annual_leave_days?: number
          is_hr?: boolean
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
          manager_id?: string | null
          annual_leave_days?: number
          is_hr?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      holiday_requests: {
        Row: {
          id: string
          user_id: string
          start_date: string
          end_date: string
          working_days: number
          note: string | null
          status: Database["public"]["Enums"]["holiday_status"]
          decided_by: string | null
          decided_at: string | null
          decision_note: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          start_date: string
          end_date: string
          working_days: number
          note?: string | null
          status?: Database["public"]["Enums"]["holiday_status"]
          decided_by?: string | null
          decided_at?: string | null
          decision_note?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          start_date?: string
          end_date?: string
          working_days?: number
          note?: string | null
          status?: Database["public"]["Enums"]["holiday_status"]
          decided_by?: string | null
          decided_at?: string | null
          decision_note?: string | null
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
          is_hr: boolean
          created_at: string
        }
        Insert: {
          email: string
          role?: Database["public"]["Enums"]["user_role"]
          note?: string | null
          is_hr?: boolean
          created_at?: string
        }
        Update: {
          email?: string
          role?: Database["public"]["Enums"]["user_role"]
          note?: string | null
          is_hr?: boolean
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
      personal_details: {
        Row: {
          user_id: string
          dob: string | null
          home_address: string | null
          personal_phone: string | null
          personal_email: string | null
          updated_at: string
        }
        Insert: {
          user_id: string
          dob?: string | null
          home_address?: string | null
          personal_phone?: string | null
          personal_email?: string | null
          updated_at?: string
        }
        Update: {
          user_id?: string
          dob?: string | null
          home_address?: string | null
          personal_phone?: string | null
          personal_email?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      next_of_kin: {
        Row: {
          id: string
          user_id: string
          name: string
          relationship: string | null
          phone: string | null
          email: string | null
          is_primary: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          relationship?: string | null
          phone?: string | null
          email?: string | null
          is_primary?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          relationship?: string | null
          phone?: string | null
          email?: string | null
          is_primary?: boolean
          created_at?: string
        }
        Relationships: []
      }
      hr_records: {
        Row: {
          user_id: string
          start_date: string | null
          employment_type: string | null
          salary: number | null
          pay_period: string
          ni_number: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          start_date?: string | null
          employment_type?: string | null
          salary?: number | null
          pay_period?: string
          ni_number?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          start_date?: string | null
          employment_type?: string | null
          salary?: number | null
          pay_period?: string
          ni_number?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      probation: {
        Row: {
          user_id: string
          end_date: string | null
          status: string
          reviewed_by: string | null
          reviewed_at: string | null
          notes: string | null
          updated_at: string
        }
        Insert: {
          user_id: string
          end_date?: string | null
          status?: string
          reviewed_by?: string | null
          reviewed_at?: string | null
          notes?: string | null
          updated_at?: string
        }
        Update: {
          user_id?: string
          end_date?: string | null
          status?: string
          reviewed_by?: string | null
          reviewed_at?: string | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      appraisals: {
        Row: {
          id: string
          user_id: string
          due_date: string | null
          scheduled_for: string | null
          status: string
          rating: string | null
          summary: string | null
          conducted_by: string | null
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          due_date?: string | null
          scheduled_for?: string | null
          status?: string
          rating?: string | null
          summary?: string | null
          conducted_by?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          due_date?: string | null
          scheduled_for?: string | null
          status?: string
          rating?: string | null
          summary?: string | null
          conducted_by?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      rtw_interviews: {
        Row: {
          id: string
          user_id: string
          absence_start: string | null
          absence_end: string | null
          reason: string | null
          notes: string | null
          conducted_by: string | null
          conducted_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          absence_start?: string | null
          absence_end?: string | null
          reason?: string | null
          notes?: string | null
          conducted_by?: string | null
          conducted_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          absence_start?: string | null
          absence_end?: string | null
          reason?: string | null
          notes?: string | null
          conducted_by?: string | null
          conducted_at?: string
          created_at?: string
        }
        Relationships: []
      }
      toil_entries: {
        Row: {
          id: string
          user_id: string
          entry_date: string
          hours: number
          reason: string | null
          recorded_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          entry_date?: string
          hours: number
          reason?: string | null
          recorded_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          entry_date?: string
          hours?: number
          reason?: string | null
          recorded_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      employee_documents: {
        Row: {
          id: string
          user_id: string
          title: string
          category: string
          file_path: string
          content_type: string | null
          uploaded_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          category?: string
          file_path: string
          content_type?: string | null
          uploaded_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          category?: string
          file_path?: string
          content_type?: string | null
          uploaded_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      service_awards: {
        Row: {
          id: string
          user_id: string
          years: number
          awarded_on: string
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          years: number
          awarded_on?: string
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          years?: number
          awarded_on?: string
          note?: string | null
          created_at?: string
        }
        Relationships: []
      }
      hr_audit: {
        Row: {
          id: string
          actor_id: string | null
          subject_id: string | null
          action: string
          detail: string | null
          created_at: string
        }
        Insert: {
          id?: string
          actor_id?: string | null
          subject_id?: string | null
          action: string
          detail?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          actor_id?: string | null
          subject_id?: string | null
          action?: string
          detail?: string | null
          created_at?: string
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
      holiday_status: "pending" | "approved" | "declined" | "cancelled"
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
