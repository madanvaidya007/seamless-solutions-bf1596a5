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
      appointments: {
        Row: {
          created_at: string
          doctor_id: string | null
          doctor_message: string | null
          id: string
          intake_id: string | null
          mode: Database["public"]["Enums"]["appointment_mode"]
          patient_id: string
          preferred_at: string
          reason: string | null
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          doctor_id?: string | null
          doctor_message?: string | null
          id?: string
          intake_id?: string | null
          mode?: Database["public"]["Enums"]["appointment_mode"]
          patient_id: string
          preferred_at: string
          reason?: string | null
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          doctor_id?: string | null
          doctor_message?: string | null
          id?: string
          intake_id?: string | null
          mode?: Database["public"]["Enums"]["appointment_mode"]
          patient_id?: string
          preferred_at?: string
          reason?: string | null
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Relationships: []
      }
      assessments: {
        Row: {
          ai_model: string | null
          ai_summary: string | null
          created_at: string
          differentials: Json | null
          home_remedies: string[]
          id: string
          intake_id: string
          lifestyle_advice: string[]
          patient_id: string
          possible_diagnoses: Json
          recommended_actions: string[] | null
          red_flags: string[] | null
          risk_level: Database["public"]["Enums"]["risk_level"]
          risk_score: number
          rule_breakdown: Json | null
          suggested_medicines: Json
        }
        Insert: {
          ai_model?: string | null
          ai_summary?: string | null
          created_at?: string
          differentials?: Json | null
          home_remedies?: string[]
          id?: string
          intake_id: string
          lifestyle_advice?: string[]
          patient_id: string
          possible_diagnoses?: Json
          recommended_actions?: string[] | null
          red_flags?: string[] | null
          risk_level: Database["public"]["Enums"]["risk_level"]
          risk_score: number
          rule_breakdown?: Json | null
          suggested_medicines?: Json
        }
        Update: {
          ai_model?: string | null
          ai_summary?: string | null
          created_at?: string
          differentials?: Json | null
          home_remedies?: string[]
          id?: string
          intake_id?: string
          lifestyle_advice?: string[]
          patient_id?: string
          possible_diagnoses?: Json
          recommended_actions?: string[] | null
          red_flags?: string[] | null
          risk_level?: Database["public"]["Enums"]["risk_level"]
          risk_score?: number
          rule_breakdown?: Json | null
          suggested_medicines?: Json
        }
        Relationships: [
          {
            foreignKeyName: "assessments_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "patient_intakes"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata: Json | null
          resource_id: string | null
          resource_type: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      doctor_notes: {
        Row: {
          approved_at: string | null
          approved_medicines: Json
          created_at: string
          diagnosis: string | null
          doctor_id: string
          follow_up: string | null
          id: string
          intake_id: string
          notes: string | null
          override_risk: Database["public"]["Enums"]["risk_level"] | null
          treatment_plan: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_medicines?: Json
          created_at?: string
          diagnosis?: string | null
          doctor_id: string
          follow_up?: string | null
          id?: string
          intake_id: string
          notes?: string | null
          override_risk?: Database["public"]["Enums"]["risk_level"] | null
          treatment_plan?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_medicines?: Json
          created_at?: string
          diagnosis?: string | null
          doctor_id?: string
          follow_up?: string | null
          id?: string
          intake_id?: string
          notes?: string | null
          override_risk?: Database["public"]["Enums"]["risk_level"] | null
          treatment_plan?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doctor_notes_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "patient_intakes"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_intakes: {
        Row: {
          age: number | null
          allergies: string | null
          body_regions: string[]
          chief_complaint: string
          created_at: string
          current_medications: string | null
          duration_days: number | null
          id: string
          medical_history: string | null
          notes: string | null
          patient_id: string
          severity: number | null
          sex: string | null
          status: Database["public"]["Enums"]["intake_status"]
          symptoms: string[]
          updated_at: string
          vitals: Json | null
        }
        Insert: {
          age?: number | null
          allergies?: string | null
          body_regions?: string[]
          chief_complaint: string
          created_at?: string
          current_medications?: string | null
          duration_days?: number | null
          id?: string
          medical_history?: string | null
          notes?: string | null
          patient_id: string
          severity?: number | null
          sex?: string | null
          status?: Database["public"]["Enums"]["intake_status"]
          symptoms?: string[]
          updated_at?: string
          vitals?: Json | null
        }
        Update: {
          age?: number | null
          allergies?: string | null
          body_regions?: string[]
          chief_complaint?: string
          created_at?: string
          current_medications?: string | null
          duration_days?: number | null
          id?: string
          medical_history?: string | null
          notes?: string | null
          patient_id?: string
          severity?: number | null
          sex?: string | null
          status?: Database["public"]["Enums"]["intake_status"]
          symptoms?: string[]
          updated_at?: string
          vitals?: Json | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          date_of_birth: string | null
          email: string | null
          full_name: string | null
          gender: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name?: string | null
          gender?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
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
      get_primary_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "doctor" | "patient"
      appointment_mode: "in_person" | "video" | "phone"
      appointment_status:
        | "requested"
        | "confirmed"
        | "declined"
        | "completed"
        | "cancelled"
      intake_status: "pending" | "in_review" | "completed" | "archived"
      risk_level: "low" | "moderate" | "high" | "critical"
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
      app_role: ["admin", "doctor", "patient"],
      appointment_mode: ["in_person", "video", "phone"],
      appointment_status: [
        "requested",
        "confirmed",
        "declined",
        "completed",
        "cancelled",
      ],
      intake_status: ["pending", "in_review", "completed", "archived"],
      risk_level: ["low", "moderate", "high", "critical"],
    },
  },
} as const
