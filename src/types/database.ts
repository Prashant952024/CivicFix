export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      roles: {
        Row: {
          id: string;
          code: Database["public"]["Enums"]["role_code"];
          name: string;
          description: string | null;
          is_system_role: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: Database["public"]["Enums"]["role_code"];
          name: string;
          description?: string | null;
          is_system_role?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: Database["public"]["Enums"]["role_code"];
          name?: string;
          description?: string | null;
          is_system_role?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          clerk_user_id: string;
          full_name: string;
          email: string | null;
          phone: string | null;
          role_id: string;
          department_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          clerk_user_id: string;
          full_name?: string;
          email?: string | null;
          phone?: string | null;
          role_id?: string;
          department_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          clerk_user_id?: string;
          full_name?: string;
          email?: string | null;
          phone?: string | null;
          role_id?: string;
          department_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey";
            columns: ["department_id"];
            isOneToOne: false;
            referencedRelation: "departments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profiles_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
        ];
      };
      departments: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      issues: {
        Row: {
          id: string;
          reporter_profile_id: string;
          title: string;
          description: string;
          category: string;
          severity: Database["public"]["Enums"]["issue_severity"];
          priority: Database["public"]["Enums"]["issue_priority"];
          status: Database["public"]["Enums"]["issue_status"];
          latitude: string | null;
          longitude: string | null;
          location_text: string | null;
          address_text: string | null;
          department_id: string | null;
          resolved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          reporter_profile_id: string;
          title: string;
          description: string;
          category: string;
          severity?: Database["public"]["Enums"]["issue_severity"];
          priority?: Database["public"]["Enums"]["issue_priority"];
          status?: Database["public"]["Enums"]["issue_status"];
          latitude?: string | null;
          longitude?: string | null;
          location_text?: string | null;
          address_text?: string | null;
          department_id?: string | null;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          reporter_profile_id?: string;
          title?: string;
          description?: string;
          category?: string;
          severity?: Database["public"]["Enums"]["issue_severity"];
          priority?: Database["public"]["Enums"]["issue_priority"];
          status?: Database["public"]["Enums"]["issue_status"];
          latitude?: string | null;
          longitude?: string | null;
          location_text?: string | null;
          address_text?: string | null;
          department_id?: string | null;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "issues_department_id_fkey";
            columns: ["department_id"];
            isOneToOne: false;
            referencedRelation: "departments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "issues_reporter_profile_id_fkey";
            columns: ["reporter_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      issue_images: {
        Row: {
          id: string;
          issue_id: string;
          storage_bucket: string;
          storage_path: string;
          image_type: Database["public"]["Enums"]["issue_image_type"];
          uploaded_by_profile_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          issue_id: string;
          storage_bucket: string;
          storage_path: string;
          image_type: Database["public"]["Enums"]["issue_image_type"];
          uploaded_by_profile_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          issue_id?: string;
          storage_bucket?: string;
          storage_path?: string;
          image_type?: Database["public"]["Enums"]["issue_image_type"];
          uploaded_by_profile_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "issue_images_issue_id_fkey";
            columns: ["issue_id"];
            isOneToOne: false;
            referencedRelation: "issues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "issue_images_uploaded_by_profile_id_fkey";
            columns: ["uploaded_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      issue_ai_analysis: {
        Row: {
          id: string;
          issue_id: string;
          provider: string;
          model: string;
          category_recommendation: string | null;
          severity_recommendation: Database["public"]["Enums"]["issue_severity"] | null;
          priority_recommendation: Database["public"]["Enums"]["issue_priority"] | null;
          department_recommendation: string | null;
          confidence_score: number | null;
          structured_response: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          issue_id: string;
          provider: string;
          model: string;
          category_recommendation?: string | null;
          severity_recommendation?: Database["public"]["Enums"]["issue_severity"] | null;
          priority_recommendation?: Database["public"]["Enums"]["issue_priority"] | null;
          department_recommendation?: string | null;
          confidence_score?: number | null;
          structured_response?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          issue_id?: string;
          provider?: string;
          model?: string;
          category_recommendation?: string | null;
          severity_recommendation?: Database["public"]["Enums"]["issue_severity"] | null;
          priority_recommendation?: Database["public"]["Enums"]["issue_priority"] | null;
          department_recommendation?: string | null;
          confidence_score?: number | null;
          structured_response?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "issue_ai_analysis_issue_id_fkey";
            columns: ["issue_id"];
            isOneToOne: false;
            referencedRelation: "issues";
            referencedColumns: ["id"];
          },
        ];
      };
      issue_assignments: {
        Row: {
          id: string;
          issue_id: string;
          department_id: string | null;
          worker_id: string | null;
          assigned_by_profile_id: string;
          status: Database["public"]["Enums"]["assignment_status"];
          assigned_at: string;
          unassigned_at: string | null;
        };
        Insert: {
          id?: string;
          issue_id: string;
          department_id?: string | null;
          worker_id?: string | null;
          assigned_by_profile_id: string;
          status?: Database["public"]["Enums"]["assignment_status"];
          assigned_at?: string;
          unassigned_at?: string | null;
        };
        Update: {
          id?: string;
          issue_id?: string;
          department_id?: string | null;
          worker_id?: string | null;
          assigned_by_profile_id?: string;
          status?: Database["public"]["Enums"]["assignment_status"];
          assigned_at?: string;
          unassigned_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "issue_assignments_assigned_by_profile_id_fkey";
            columns: ["assigned_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "issue_assignments_department_id_fkey";
            columns: ["department_id"];
            isOneToOne: false;
            referencedRelation: "departments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "issue_assignments_issue_id_fkey";
            columns: ["issue_id"];
            isOneToOne: false;
            referencedRelation: "issues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "issue_assignments_worker_id_fkey";
            columns: ["worker_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      issue_status_history: {
        Row: {
          id: string;
          issue_id: string;
          old_status: Database["public"]["Enums"]["issue_status"] | null;
          new_status: Database["public"]["Enums"]["issue_status"];
          changed_by_profile_id: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          issue_id: string;
          old_status?: Database["public"]["Enums"]["issue_status"] | null;
          new_status: Database["public"]["Enums"]["issue_status"];
          changed_by_profile_id: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          issue_id?: string;
          old_status?: Database["public"]["Enums"]["issue_status"] | null;
          new_status?: Database["public"]["Enums"]["issue_status"];
          changed_by_profile_id?: string;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "issue_status_history_changed_by_profile_id_fkey";
            columns: ["changed_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "issue_status_history_issue_id_fkey";
            columns: ["issue_id"];
            isOneToOne: false;
            referencedRelation: "issues";
            referencedColumns: ["id"];
          },
        ];
      };
      issue_duplicates: {
        Row: {
          id: string;
          source_issue_id: string;
          duplicate_issue_id: string;
          confidence_score: number | null;
          detection_method: Database["public"]["Enums"]["duplicate_detection_method"];
          status: Database["public"]["Enums"]["duplicate_status"];
          created_at: string;
        };
        Insert: {
          id?: string;
          source_issue_id: string;
          duplicate_issue_id: string;
          confidence_score?: number | null;
          detection_method: Database["public"]["Enums"]["duplicate_detection_method"];
          status?: Database["public"]["Enums"]["duplicate_status"];
          created_at?: string;
        };
        Update: {
          id?: string;
          source_issue_id?: string;
          duplicate_issue_id?: string;
          confidence_score?: number | null;
          detection_method?: Database["public"]["Enums"]["duplicate_detection_method"];
          status?: Database["public"]["Enums"]["duplicate_status"];
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "issue_duplicates_duplicate_issue_id_fkey";
            columns: ["duplicate_issue_id"];
            isOneToOne: false;
            referencedRelation: "issues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "issue_duplicates_source_issue_id_fkey";
            columns: ["source_issue_id"];
            isOneToOne: false;
            referencedRelation: "issues";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          recipient_profile_id: string;
          notification_type: Database["public"]["Enums"]["notification_type"];
          title: string;
          message: string;
          related_issue_id: string | null;
          is_read: boolean;
          created_at: string;
          read_at: string | null;
        };
        Insert: {
          id?: string;
          recipient_profile_id: string;
          notification_type: Database["public"]["Enums"]["notification_type"];
          title: string;
          message: string;
          related_issue_id?: string | null;
          is_read?: boolean;
          created_at?: string;
          read_at?: string | null;
        };
        Update: {
          id?: string;
          recipient_profile_id?: string;
          notification_type?: Database["public"]["Enums"]["notification_type"];
          title?: string;
          message?: string;
          related_issue_id?: string | null;
          is_read?: boolean;
          created_at?: string;
          read_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_profile_id_fkey";
            columns: ["recipient_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_related_issue_id_fkey";
            columns: ["related_issue_id"];
            isOneToOne: false;
            referencedRelation: "issues";
            referencedColumns: ["id"];
          },
        ];
      };
      resolution_verifications: {
        Row: {
          id: string;
          issue_id: string;
          citizen_id: string;
          result: Database["public"]["Enums"]["verification_result"];
          feedback: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          issue_id: string;
          citizen_id: string;
          result: Database["public"]["Enums"]["verification_result"];
          feedback?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          issue_id?: string;
          citizen_id?: string;
          result?: Database["public"]["Enums"]["verification_result"];
          feedback?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "resolution_verifications_citizen_id_fkey";
            columns: ["citizen_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "resolution_verifications_issue_id_fkey";
            columns: ["issue_id"];
            isOneToOne: false;
            referencedRelation: "issues";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      assignment_status: "ACTIVE" | "COMPLETED" | "UNASSIGNED";
      duplicate_detection_method: "GPS_PROXIMITY" | "CATEGORY" | "TIME" | "IMAGE_SIMILARITY" | "MANUAL_REVIEW";
      duplicate_status: "PENDING" | "CONFIRMED" | "DISMISSED";
      issue_image_type: "INITIAL_REPORT" | "RESOLUTION_EVIDENCE";
      issue_priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
      issue_severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
      issue_status:
        | "SUBMITTED"
        | "AI_ANALYZED"
        | "UNDER_REVIEW"
        | "VERIFIED"
        | "REJECTED"
        | "ASSIGNED"
        | "IN_PROGRESS"
        | "RESOLVED"
        | "CITIZEN_VERIFIED"
        | "REOPENED";
      notification_type: "STATUS_CHANGE" | "ASSIGNMENT" | "SYSTEM" | "VERIFICATION";
      role_code: "CITIZEN" | "MUNICIPAL_OFFICER" | "FIELD_WORKER" | "ADMIN";
      verification_result: "VERIFIED" | "UNRESOLVED";
    };
    CompositeTypes: Record<string, never>;
  };
}
