export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface ComplexityFactors {
  systemic_problem?: boolean;
  recurring_problem?: boolean;
  multi_domain?: boolean;
  research_required?: boolean;
  technology_potential?: boolean;
  large_scale_impact?: boolean;
  multiple_stakeholders?: boolean;
  existing_municipal_solution?: boolean;
}

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
          employee_id: string | null;
          designation: string | null;
          is_active: boolean;
          avatar_url: string | null;
          institution_id: string | null;
          joined_at: string | null;
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
          employee_id?: string | null;
          designation?: string | null;
          is_active?: boolean;
          avatar_url?: string | null;
          institution_id?: string | null;
          joined_at?: string | null;
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
          employee_id?: string | null;
          designation?: string | null;
          is_active?: boolean;
          avatar_url?: string | null;
          institution_id?: string | null;
          joined_at?: string | null;
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
            foreignKeyName: "profiles_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
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
          code: string | null;
          description: string | null;
          is_active: boolean;
          manager_profile_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          code?: string | null;
          description?: string | null;
          is_active?: boolean;
          manager_profile_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          code?: string | null;
          description?: string | null;
          is_active?: boolean;
          manager_profile_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "departments_manager_profile_id_fkey";
            columns: ["manager_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
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
          ai_issue_type: "SIMPLE" | "COMPLEX" | null;
          ai_complexity_score: number | null;
          ai_complexity_reasoning: string | null;
          ai_required_expertise: string[];
          ai_classification_confidence: number | null;
          ai_complexity_factors?: ComplexityFactors | null;
          final_issue_type: "SIMPLE" | "COMPLEX" | null;
          classification_decided_by: string | null;
          classification_decided_at: string | null;
          classification_override_reason: string | null;
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
          ai_issue_type?: "SIMPLE" | "COMPLEX" | null;
          ai_complexity_score?: number | null;
          ai_complexity_reasoning?: string | null;
          ai_required_expertise?: string[];
          ai_classification_confidence?: number | null;
          ai_complexity_factors?: ComplexityFactors | null;
          final_issue_type?: "SIMPLE" | "COMPLEX" | null;
          classification_decided_by?: string | null;
          classification_decided_at?: string | null;
          classification_override_reason?: string | null;
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
          ai_issue_type?: "SIMPLE" | "COMPLEX" | null;
          ai_complexity_score?: number | null;
          ai_complexity_reasoning?: string | null;
          ai_required_expertise?: string[];
          ai_classification_confidence?: number | null;
          ai_complexity_factors?: ComplexityFactors | null;
          final_issue_type?: "SIMPLE" | "COMPLEX" | null;
          classification_decided_by?: string | null;
          classification_decided_at?: string | null;
          classification_override_reason?: string | null;
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
          {
            foreignKeyName: "issues_classification_decided_by_fkey";
            columns: ["classification_decided_by"];
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
          issue_type?: "SIMPLE" | "COMPLEX" | null;
          complexity_score?: number | null;
          complexity_reasoning?: string | null;
          required_expertise?: string[];
          confidence_score: number | null;
          classification_confidence?: number | null;
          complexity_factors?: ComplexityFactors | null;
          classification_note?: string | null;
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
          issue_type?: "SIMPLE" | "COMPLEX" | null;
          complexity_score?: number | null;
          complexity_reasoning?: string | null;
          required_expertise?: string[];
          confidence_score?: number | null;
          classification_confidence?: number | null;
          complexity_factors?: ComplexityFactors | null;
          classification_note?: string | null;
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
          issue_type?: "SIMPLE" | "COMPLEX" | null;
          complexity_score?: number | null;
          complexity_reasoning?: string | null;
          required_expertise?: string[];
          confidence_score?: number | null;
          classification_confidence?: number | null;
          complexity_factors?: ComplexityFactors | null;
          classification_note?: string | null;
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
      issue_department_assignments: {
        Row: {
          id: string;
          issue_id: string;
          department_id: string;
          assigned_by_profile_id: string;
          status: Database["public"]["Enums"]["department_assignment_status"];
          notes: string | null;
          assigned_at: string;
          accepted_at: string | null;
          completed_at: string | null;
          reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          issue_id: string;
          department_id: string;
          assigned_by_profile_id: string;
          status?: Database["public"]["Enums"]["department_assignment_status"];
          notes?: string | null;
          assigned_at?: string;
          accepted_at?: string | null;
          completed_at?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          issue_id?: string;
          department_id?: string;
          assigned_by_profile_id?: string;
          status?: Database["public"]["Enums"]["department_assignment_status"];
          notes?: string | null;
          assigned_at?: string;
          accepted_at?: string | null;
          completed_at?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "issue_department_assignments_assigned_by_profile_id_fkey";
            columns: ["assigned_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "issue_department_assignments_department_id_fkey";
            columns: ["department_id"];
            isOneToOne: false;
            referencedRelation: "departments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "issue_department_assignments_issue_id_fkey";
            columns: ["issue_id"];
            isOneToOne: false;
            referencedRelation: "issues";
            referencedColumns: ["id"];
          },
        ];
      };
      department_worker_assignments: {
        Row: {
          id: string;
          issue_department_assignment_id: string;
          worker_profile_id: string;
          assigned_by_profile_id: string;
          status: Database["public"]["Enums"]["worker_assignment_status"];
          notes: string | null;
          assigned_at: string;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          issue_department_assignment_id: string;
          worker_profile_id: string;
          assigned_by_profile_id: string;
          status?: Database["public"]["Enums"]["worker_assignment_status"];
          notes?: string | null;
          assigned_at?: string;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          issue_department_assignment_id?: string;
          worker_profile_id?: string;
          assigned_by_profile_id?: string;
          status?: Database["public"]["Enums"]["worker_assignment_status"];
          notes?: string | null;
          assigned_at?: string;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "department_worker_assignments_assigned_by_profile_id_fkey";
            columns: ["assigned_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "department_worker_assignments_issue_department_assignment__fkey";
            columns: ["issue_department_assignment_id"];
            isOneToOne: false;
            referencedRelation: "issue_department_assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "department_worker_assignments_worker_profile_id_fkey";
            columns: ["worker_profile_id"];
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
          similarity_score: number | null;
          confidence: "HIGH" | "MEDIUM" | "LOW" | null;
          matching_signals: Record<string, unknown>;
          detection_method: Database["public"]["Enums"]["duplicate_detection_method"];
          status: Database["public"]["Enums"]["duplicate_status"];
          reviewed_at: string | null;
          reviewed_by: string | null;
          review_notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          source_issue_id: string;
          duplicate_issue_id: string;
          confidence_score?: number | null;
          similarity_score?: number | null;
          confidence?: "HIGH" | "MEDIUM" | "LOW" | null;
          matching_signals?: Record<string, unknown>;
          detection_method: Database["public"]["Enums"]["duplicate_detection_method"];
          status?: Database["public"]["Enums"]["duplicate_status"];
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          review_notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          source_issue_id?: string;
          duplicate_issue_id?: string;
          confidence_score?: number | null;
          similarity_score?: number | null;
          confidence?: "HIGH" | "MEDIUM" | "LOW" | null;
          matching_signals?: Record<string, unknown>;
          detection_method?: Database["public"]["Enums"]["duplicate_detection_method"];
          status?: Database["public"]["Enums"]["duplicate_status"];
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          review_notes?: string | null;
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
      innovation_challenges: {
        Row: {
          id: string;
          source_issue_id: string;
          title: string;
          problem_statement: string;
          category: string;
          problem_category: string | null;
          complexity_score: number | null;
          required_expertise: string[];
          required_domains: string[];
          affected_population: string | null;
          geographic_scope: string | null;
          root_cause: string | null;
          current_limitations: string | null;
          objectives: string[];
          expected_outcomes: string[];
          constraints: string[];
          potential_technology_areas: string[];
          research_requirements: string | null;
          success_criteria: string[];
          status: "DRAFT" | "APPROVED" | "READY_FOR_MATCHING" | "OPEN_FOR_PROPOSALS" | "PILOT_ACTIVE" | "SOLVED" | "ARCHIVED";
          created_by: string;
          approved_by: string | null;
          created_at: string;
          updated_at: string;
          approved_at: string | null;
          ai_generated_draft: Json | null;
          ai_generated_at: string | null;
          ai_model_version: string | null;
        };
        Insert: {
          id?: string;
          source_issue_id: string;
          title: string;
          problem_statement: string;
          category: string;
          problem_category?: string | null;
          complexity_score?: number | null;
          required_expertise?: string[];
          required_domains?: string[];
          affected_population?: string | null;
          geographic_scope?: string | null;
          root_cause?: string | null;
          current_limitations?: string | null;
          objectives?: string[];
          expected_outcomes?: string[];
          constraints?: string[];
          potential_technology_areas?: string[];
          research_requirements?: string | null;
          success_criteria?: string[];
          status?: "DRAFT" | "APPROVED" | "READY_FOR_MATCHING" | "OPEN_FOR_PROPOSALS" | "PILOT_ACTIVE" | "SOLVED" | "ARCHIVED";
          created_by: string;
          approved_by?: string | null;
          created_at?: string;
          updated_at?: string;
          approved_at?: string | null;
          ai_generated_draft?: Json | null;
          ai_generated_at?: string | null;
          ai_model_version?: string | null;
        };
        Update: {
          id?: string;
          source_issue_id?: string;
          title?: string;
          problem_statement?: string;
          category?: string;
          problem_category?: string | null;
          complexity_score?: number | null;
          required_expertise?: string[];
          required_domains?: string[];
          affected_population?: string | null;
          geographic_scope?: string | null;
          root_cause?: string | null;
          current_limitations?: string | null;
          objectives?: string[];
          expected_outcomes?: string[];
          constraints?: string[];
          potential_technology_areas?: string[];
          research_requirements?: string | null;
          success_criteria?: string[];
          status?: "DRAFT" | "APPROVED" | "READY_FOR_MATCHING" | "OPEN_FOR_PROPOSALS" | "PILOT_ACTIVE" | "SOLVED" | "ARCHIVED";
          created_by?: string;
          approved_by?: string | null;
          created_at?: string;
          updated_at?: string;
          approved_at?: string | null;
          ai_generated_draft?: Json | null;
          ai_generated_at?: string | null;
          ai_model_version?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "innovation_challenges_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "innovation_challenges_approved_by_fkey";
            columns: ["approved_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "innovation_challenges_source_issue_id_fkey";
            columns: ["source_issue_id"];
            isOneToOne: false;
            referencedRelation: "issues";
            referencedColumns: ["id"];
          },
        ];
      };
      institutions: {
        Row: {
          id: string;
          name: string;
          official_name: string | null;
          institution_type: string;
          acronym: string | null;
          description: string | null;
          official_email: string | null;
          phone: string | null;
          website: string | null;
          address: string | null;
          city: string;
          district: string | null;
          state: string;
          pincode: string | null;
          latitude: number | null;
          longitude: number | null;
          established_year: number | null;
          departments: string[];
          research_domains: string[];
          areas_of_expertise: string[];
          technologies: string[];
          laboratories: string[];
          facilities: string[];
          equipment: string[];
          research_areas: string[];
          field_capabilities: string[];
          collaboration_capabilities: string[];
          nirf_rank: number | null;
          naac_grade: string | null;
          verification_status: Database["public"]["Enums"]["institution_verification_status"];
          is_active: boolean;
          verified_at: string | null;
          verified_by: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          official_name?: string | null;
          institution_type?: string;
          acronym?: string | null;
          description?: string | null;
          official_email?: string | null;
          phone?: string | null;
          website?: string | null;
          address?: string | null;
          city: string;
          district?: string | null;
          state: string;
          pincode?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          established_year?: number | null;
          departments?: string[];
          research_domains?: string[];
          areas_of_expertise?: string[];
          technologies?: string[];
          laboratories?: string[];
          facilities?: string[];
          equipment?: string[];
          research_areas?: string[];
          field_capabilities?: string[];
          collaboration_capabilities?: string[];
          nirf_rank?: number | null;
          naac_grade?: string | null;
          verification_status?: Database["public"]["Enums"]["institution_verification_status"];
          is_active?: boolean;
          verified_at?: string | null;
          verified_by?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          official_name?: string | null;
          institution_type?: string;
          acronym?: string | null;
          description?: string | null;
          official_email?: string | null;
          phone?: string | null;
          website?: string | null;
          address?: string | null;
          city?: string;
          district?: string | null;
          state?: string;
          pincode?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          established_year?: number | null;
          departments?: string[];
          research_domains?: string[];
          areas_of_expertise?: string[];
          technologies?: string[];
          laboratories?: string[];
          facilities?: string[];
          equipment?: string[];
          research_areas?: string[];
          field_capabilities?: string[];
          collaboration_capabilities?: string[];
          nirf_rank?: number | null;
          naac_grade?: string | null;
          verification_status?: Database["public"]["Enums"]["institution_verification_status"];
          is_active?: boolean;
          verified_at?: string | null;
          verified_by?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "institutions_verified_by_fkey";
            columns: ["verified_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "institutions_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      institution_projects: {
        Row: {
          id: string;
          institution_id: string;
          title: string;
          description: string | null;
          domain: string | null;
          technologies: string[];
          outcomes: string[];
          start_year: number | null;
          end_year: number | null;
          is_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          title: string;
          description?: string | null;
          domain?: string | null;
          technologies?: string[];
          outcomes?: string[];
          start_year?: number | null;
          end_year?: number | null;
          is_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          institution_id?: string;
          title?: string;
          description?: string | null;
          domain?: string | null;
          technologies?: string[];
          outcomes?: string[];
          start_year?: number | null;
          end_year?: number | null;
          is_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "institution_projects_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          },
        ];
      };
      institution_members: {
        Row: {
          id: string;
          institution_id: string;
          profile_id: string;
          role_title: string;
          is_primary_contact: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          profile_id: string;
          role_title?: string;
          is_primary_contact?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          institution_id?: string;
          profile_id?: string;
          role_title?: string;
          is_primary_contact?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "institution_members_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "institution_members_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      assignment_status: "ACTIVE" | "COMPLETED" | "UNASSIGNED";
      department_assignment_status: "ASSIGNED" | "IN_PROGRESS" | "UNDER_REVIEW" | "COMPLETED" | "REJECTED" | "REOPENED";
      worker_assignment_status: "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "REASSIGNED" | "CANCELLED";
      duplicate_detection_method: "GPS_PROXIMITY" | "CATEGORY" | "TIME" | "IMAGE_SIMILARITY" | "MANUAL_REVIEW" | "AI_MULTI_SIGNAL";
      duplicate_status: "PENDING" | "CONFIRMED" | "DISMISSED" | "REJECTED";
      institution_verification_status: "DRAFT" | "PENDING_VERIFICATION" | "VERIFIED" | "SUSPENDED" | "ARCHIVED";
      issue_image_type: "INITIAL_REPORT" | "RESOLUTION_EVIDENCE";
      issue_priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
      issue_severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
      issue_status:
        | "SUBMITTED"
        | "AI_ANALYZED"
        | "AWAITING_ADMIN_CLASSIFICATION"
        | "CLASSIFIED_SIMPLE"
        | "CLASSIFIED_COMPLEX"
        | "UNDER_REVIEW"
        | "VERIFIED"
        | "REJECTED"
        | "ASSIGNED"
        | "IN_PROGRESS"
        | "PARTIALLY_COMPLETED"
        | "RESOLVED"
        | "CITIZEN_VERIFIED"
        | "REOPENED";
      notification_type: "STATUS_CHANGE" | "ASSIGNMENT" | "SYSTEM" | "VERIFICATION";
      role_code: "CITIZEN" | "MUNICIPAL_OFFICER" | "DEPARTMENT_MANAGER" | "FIELD_WORKER" | "ADMIN" | "INNOVATION_MANAGER" | "INSTITUTION";
      verification_result: "VERIFIED" | "UNRESOLVED";
    };
    CompositeTypes: Record<string, never>;
  };
}

export type InstitutionRow = Database["public"]["Tables"]["institutions"]["Row"];
export type InstitutionInsert = Database["public"]["Tables"]["institutions"]["Insert"];
export type InstitutionUpdate = Database["public"]["Tables"]["institutions"]["Update"];
export type InstitutionVerificationStatus = Database["public"]["Enums"]["institution_verification_status"];

export type InstitutionProjectRow = Database["public"]["Tables"]["institution_projects"]["Row"];
export type InstitutionProjectInsert = Database["public"]["Tables"]["institution_projects"]["Insert"];
export type InstitutionProjectUpdate = Database["public"]["Tables"]["institution_projects"]["Update"];

export type InstitutionMemberRow = Database["public"]["Tables"]["institution_members"]["Row"];
export type InstitutionMemberInsert = Database["public"]["Tables"]["institution_members"]["Insert"];
export type InstitutionMemberUpdate = Database["public"]["Tables"]["institution_members"]["Update"];
