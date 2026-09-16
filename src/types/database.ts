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
          organization_id: string | null;
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
          organization_id?: string | null;
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
          organization_id?: string | null;
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
          status: "DRAFT" | "APPROVED" | "READY_FOR_MATCHING" | "MATCHING_IN_PROGRESS" | "MATCHING_COMPLETED" | "INSTITUTIONS_SELECTED" | "READY_FOR_INVITATION" | "INVITATIONS_SENT" | "OPEN_FOR_PROPOSALS" | "PILOT_ACTIVE" | "SOLVED" | "ARCHIVED";
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
          status?: "DRAFT" | "APPROVED" | "READY_FOR_MATCHING" | "MATCHING_IN_PROGRESS" | "MATCHING_COMPLETED" | "INSTITUTIONS_SELECTED" | "READY_FOR_INVITATION" | "INVITATIONS_SENT" | "OPEN_FOR_PROPOSALS" | "PILOT_ACTIVE" | "SOLVED" | "ARCHIVED";
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
          status?: "DRAFT" | "APPROVED" | "READY_FOR_MATCHING" | "MATCHING_IN_PROGRESS" | "MATCHING_COMPLETED" | "INSTITUTIONS_SELECTED" | "READY_FOR_INVITATION" | "INVITATIONS_SENT" | "OPEN_FOR_PROPOSALS" | "PILOT_ACTIVE" | "SOLVED" | "ARCHIVED";
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
      institution_match_runs: {
        Row: {
          id: string;
          challenge_id: string;
          created_by: string | null;
          status: "IN_PROGRESS" | "COMPLETED" | "FAILED";
          algorithm_version: string;
          ai_model_version: string;
          eligible_candidates_count: number;
          top_10_institution_ids: string[];
          summary: Json;
          error_message: string | null;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          challenge_id: string;
          created_by?: string | null;
          status?: "IN_PROGRESS" | "COMPLETED" | "FAILED";
          algorithm_version?: string;
          ai_model_version?: string;
          eligible_candidates_count?: number;
          top_10_institution_ids?: string[];
          summary?: Json;
          error_message?: string | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          challenge_id?: string;
          created_by?: string | null;
          status?: "IN_PROGRESS" | "COMPLETED" | "FAILED";
          algorithm_version?: string;
          ai_model_version?: string;
          eligible_candidates_count?: number;
          top_10_institution_ids?: string[];
          summary?: Json;
          error_message?: string | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "institution_match_runs_challenge_id_fkey";
            columns: ["challenge_id"];
            isOneToOne: false;
            referencedRelation: "innovation_challenges";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "institution_match_runs_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      institution_matches: {
        Row: {
          id: string;
          match_run_id: string;
          challenge_id: string;
          institution_id: string;
          rank: number;
          is_top_10: boolean;
          overall_score: number;
          structured_score: number;
          ai_score: number | null;
          confidence: "HIGH" | "MEDIUM" | "LOW";
          dimension_scores: Json;
          matched_capabilities: string[];
          partial_matches: string[];
          missing_capabilities: string[];
          unknown_capabilities: string[];
          strengths: string[];
          concerns: string[];
          recommended_role: string | null;
          match_explanation: string | null;
          ai_reasoning: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          match_run_id: string;
          challenge_id: string;
          institution_id: string;
          rank: number;
          is_top_10?: boolean;
          overall_score: number;
          structured_score: number;
          ai_score?: number | null;
          confidence?: "HIGH" | "MEDIUM" | "LOW";
          dimension_scores?: Json;
          matched_capabilities?: string[];
          partial_matches?: string[];
          missing_capabilities?: string[];
          unknown_capabilities?: string[];
          strengths?: string[];
          concerns?: string[];
          recommended_role?: string | null;
          match_explanation?: string | null;
          ai_reasoning?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          match_run_id?: string;
          challenge_id?: string;
          institution_id?: string;
          rank?: number;
          is_top_10?: boolean;
          overall_score?: number;
          structured_score?: number;
          ai_score?: number | null;
          confidence?: "HIGH" | "MEDIUM" | "LOW";
          dimension_scores?: Json;
          matched_capabilities?: string[];
          partial_matches?: string[];
          missing_capabilities?: string[];
          unknown_capabilities?: string[];
          strengths?: string[];
          concerns?: string[];
          recommended_role?: string | null;
          match_explanation?: string | null;
          ai_reasoning?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "institution_matches_match_run_id_fkey";
            columns: ["match_run_id"];
            isOneToOne: false;
            referencedRelation: "institution_match_runs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "institution_matches_challenge_id_fkey";
            columns: ["challenge_id"];
            isOneToOne: false;
            referencedRelation: "innovation_challenges";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "institution_matches_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          },
        ];
      };
      challenge_institution_selections: {
        Row: {
          id: string;
          challenge_id: string;
          institution_id: string;
          match_run_id: string | null;
          selected_by: string;
          selection_rank: number | null;
          is_manual_override: boolean;
          override_reason: string | null;
          status: "SELECTED_FOR_OUTREACH" | "CANCELLED";
          selected_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          challenge_id: string;
          institution_id: string;
          match_run_id?: string | null;
          selected_by: string;
          selection_rank?: number | null;
          is_manual_override?: boolean;
          override_reason?: string | null;
          status?: "SELECTED_FOR_OUTREACH" | "CANCELLED";
          selected_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          challenge_id?: string;
          institution_id?: string;
          match_run_id?: string | null;
          selected_by?: string;
          selection_rank?: number | null;
          is_manual_override?: boolean;
          override_reason?: string | null;
          status?: "SELECTED_FOR_OUTREACH" | "CANCELLED";
          selected_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "challenge_institution_selections_challenge_id_fkey";
            columns: ["challenge_id"];
            isOneToOne: false;
            referencedRelation: "innovation_challenges";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "challenge_institution_selections_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "challenge_institution_selections_match_run_id_fkey";
            columns: ["match_run_id"];
            isOneToOne: false;
            referencedRelation: "institution_match_runs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "challenge_institution_selections_selected_by_fkey";
            columns: ["selected_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      institution_invitations: {
        Row: {
          id: string;
          challenge_id: string;
          institution_id: string;
          selection_id: string | null;
          status: "PENDING" | "SENT" | "ACCEPTED" | "REJECTED" | "CANCELLED";
          invited_by: string;
          invited_at: string;
          invitation_message: string;
          responded_by: string | null;
          responded_at: string | null;
          response_note: string | null;
          rejection_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          challenge_id: string;
          institution_id: string;
          selection_id?: string | null;
          status?: "PENDING" | "SENT" | "ACCEPTED" | "REJECTED" | "CANCELLED";
          invited_by: string;
          invited_at?: string;
          invitation_message: string;
          responded_by?: string | null;
          responded_at?: string | null;
          response_note?: string | null;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          challenge_id?: string;
          institution_id?: string;
          selection_id?: string | null;
          status?: "PENDING" | "SENT" | "ACCEPTED" | "REJECTED" | "CANCELLED";
          invited_by?: string;
          invited_at?: string;
          invitation_message?: string;
          responded_by?: string | null;
          responded_at?: string | null;
          response_note?: string | null;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "institution_invitations_challenge_id_fkey";
            columns: ["challenge_id"];
            isOneToOne: false;
            referencedRelation: "innovation_challenges";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "institution_invitations_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "institution_invitations_selection_id_fkey";
            columns: ["selection_id"];
            isOneToOne: false;
            referencedRelation: "challenge_institution_selections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "institution_invitations_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "institution_invitations_responded_by_fkey";
            columns: ["responded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      challenge_projects: {
        Row: {
          id: string;
          challenge_id: string;
          institution_id: string;
          invitation_id: string;
          project_title: string;
          project_summary: string | null;
          status: "FORMING_TEAM" | "ACTIVE" | "PAUSED" | "COMPLETED" | "ARCHIVED";
          project_lead_profile_id: string | null;
          update_cadence_days: number;
          research_stage:
            | "RESEARCH_STARTED"
            | "PROTOTYPE_DEVELOPMENT"
            | "PROTOTYPE_COMPLETED"
            | "TESTING"
            | "PILOT_READY"
            | "PILOT_ACTIVE"
            | "VALIDATION"
            | "DEPLOYMENT_READY"
            | "DEPLOYMENT_ACTIVE"
            | "IMPACT_MONITORING"
            | "COMPLETED";
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          challenge_id: string;
          institution_id: string;
          invitation_id: string;
          project_title: string;
          project_summary?: string | null;
          status?: "FORMING_TEAM" | "ACTIVE" | "PAUSED" | "COMPLETED" | "ARCHIVED";
          project_lead_profile_id?: string | null;
          update_cadence_days?: number;
          research_stage?:
            | "RESEARCH_STARTED"
            | "PROTOTYPE_DEVELOPMENT"
            | "PROTOTYPE_COMPLETED"
            | "TESTING"
            | "PILOT_READY"
            | "PILOT_ACTIVE"
            | "VALIDATION"
            | "DEPLOYMENT_READY"
            | "DEPLOYMENT_ACTIVE"
            | "IMPACT_MONITORING"
            | "COMPLETED";
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          challenge_id?: string;
          institution_id?: string;
          invitation_id?: string;
          project_title?: string;
          project_summary?: string | null;
          status?: "FORMING_TEAM" | "ACTIVE" | "PAUSED" | "COMPLETED" | "ARCHIVED";
          project_lead_profile_id?: string | null;
          update_cadence_days?: number;
          research_stage?:
            | "RESEARCH_STARTED"
            | "PROTOTYPE_DEVELOPMENT"
            | "PROTOTYPE_COMPLETED"
            | "TESTING"
            | "PILOT_READY"
            | "PILOT_ACTIVE"
            | "VALIDATION"
            | "DEPLOYMENT_READY"
            | "DEPLOYMENT_ACTIVE"
            | "IMPACT_MONITORING"
            | "COMPLETED";
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "challenge_projects_challenge_id_fkey";
            columns: ["challenge_id"];
            isOneToOne: false;
            referencedRelation: "innovation_challenges";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "challenge_projects_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "challenge_projects_invitation_id_fkey";
            columns: ["invitation_id"];
            isOneToOne: true;
            referencedRelation: "institution_invitations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "challenge_projects_project_lead_profile_id_fkey";
            columns: ["project_lead_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "challenge_projects_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      challenge_project_members: {
        Row: {
          id: string;
          project_id: string;
          profile_id: string | null;
          role:
            | "PROJECT_LEAD"
            | "FACULTY"
            | "RESEARCHER"
            | "STUDENT"
            | "MEMBER"
            | "TECHNICAL_MEMBER"
            | "DOMAIN_EXPERT"
            | "DATA_SCIENTIST"
            | "ENGINEER"
            | "OTHER";
          member_name: string | null;
          member_email: string | null;
          member_type:
            | "STUDENT"
            | "FACULTY"
            | "RESEARCHER"
            | "PROFESSIONAL"
            | "TECHNICAL_STAFF"
            | "OTHER"
            | null;
          designation: string | null;
          department: string | null;
          organization: string | null;
          institution_name: string | null;
          academic_program: string | null;
          academic_year: string | null;
          academic_level: string | null;
          specialization: string | null;
          expected_graduation_year: string | null;
          years_of_experience: number | null;
          primary_expertise: string | null;
          secondary_expertise: string | null;
          expertise: string | null;
          research_areas: string[];
          research_domains: string[];
          technical_skills: string[];
          technologies: string[];
          project_responsibility: string | null;
          project_contribution: string | null;
          professional_bio: string | null;
          research_profile_url: string | null;
          linkedin_url: string | null;
          website_url: string | null;
          joined_at: string;
          added_by: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          profile_id?: string | null;
          role?:
            | "PROJECT_LEAD"
            | "FACULTY"
            | "RESEARCHER"
            | "STUDENT"
            | "MEMBER"
            | "TECHNICAL_MEMBER"
            | "DOMAIN_EXPERT"
            | "DATA_SCIENTIST"
            | "ENGINEER"
            | "OTHER";
          member_name?: string | null;
          member_email?: string | null;
          member_type?:
            | "STUDENT"
            | "FACULTY"
            | "RESEARCHER"
            | "PROFESSIONAL"
            | "TECHNICAL_STAFF"
            | "OTHER"
            | null;
          designation?: string | null;
          department?: string | null;
          organization?: string | null;
          institution_name?: string | null;
          academic_program?: string | null;
          academic_year?: string | null;
          academic_level?: string | null;
          specialization?: string | null;
          expected_graduation_year?: string | null;
          years_of_experience?: number | null;
          primary_expertise?: string | null;
          secondary_expertise?: string | null;
          expertise?: string | null;
          research_areas?: string[];
          research_domains?: string[];
          technical_skills?: string[];
          technologies?: string[];
          project_responsibility?: string | null;
          project_contribution?: string | null;
          professional_bio?: string | null;
          research_profile_url?: string | null;
          linkedin_url?: string | null;
          website_url?: string | null;
          joined_at?: string;
          added_by?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          profile_id?: string | null;
          role?:
            | "PROJECT_LEAD"
            | "FACULTY"
            | "RESEARCHER"
            | "STUDENT"
            | "MEMBER"
            | "TECHNICAL_MEMBER"
            | "DOMAIN_EXPERT"
            | "DATA_SCIENTIST"
            | "ENGINEER"
            | "OTHER";
          member_name?: string | null;
          member_email?: string | null;
          member_type?:
            | "STUDENT"
            | "FACULTY"
            | "RESEARCHER"
            | "PROFESSIONAL"
            | "TECHNICAL_STAFF"
            | "OTHER"
            | null;
          designation?: string | null;
          department?: string | null;
          organization?: string | null;
          institution_name?: string | null;
          academic_program?: string | null;
          academic_year?: string | null;
          academic_level?: string | null;
          specialization?: string | null;
          expected_graduation_year?: string | null;
          years_of_experience?: number | null;
          primary_expertise?: string | null;
          secondary_expertise?: string | null;
          expertise?: string | null;
          research_areas?: string[];
          research_domains?: string[];
          technical_skills?: string[];
          technologies?: string[];
          project_responsibility?: string | null;
          project_contribution?: string | null;
          professional_bio?: string | null;
          research_profile_url?: string | null;
          linkedin_url?: string | null;
          website_url?: string | null;
          joined_at?: string;
          added_by?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "challenge_project_members_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "challenge_projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "challenge_project_members_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "challenge_project_members_added_by_fkey";
            columns: ["added_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      challenge_project_activity: {
        Row: {
          id: string;
          project_id: string;
          actor_profile_id: string;
          activity_type:
            | "PROJECT_CREATED"
            | "MEMBER_ADDED"
            | "MEMBER_ROLE_CHANGED"
            | "MEMBER_DETAILS_UPDATED"
            | "MEMBER_DEACTIVATED"
            | "MEMBER_REACTIVATED"
            | "PROJECT_LEAD_CHANGED"
            | "PROJECT_STATUS_CHANGED"
            | "PROJECT_DETAILS_UPDATED"
            | "PROPOSAL_CREATED"
            | "PROPOSAL_UPDATED"
            | "PROPOSAL_SUBMITTED"
            | "PROPOSAL_REVIEW_STARTED"
            | "PROPOSAL_REVISION_REQUESTED"
            | "PROPOSAL_RESUBMITTED"
            | "PROPOSAL_APPROVED"
            | "PROPOSAL_REJECTED"
            | "RESEARCH_STARTED"
            | "MILESTONE_CREATED"
            | "MILESTONE_UPDATED"
            | "MILESTONE_COMPLETED"
            | "PROGRESS_UPDATE_SUBMITTED"
            | "PROGRESS_UPDATE_ACKNOWLEDGED"
            | "EVIDENCE_ADDED"
            | "BLOCKER_REPORTED"
            | "BLOCKER_RESOLVED"
            | "RISK_REPORTED"
            | "RISK_UPDATED"
            | "EXTERNAL_RESOURCE_ADDED"
            | "SUPPORT_REQUEST_CREATED"
            | "SUPPORT_REQUEST_SUBMITTED"
            | "SUPPORT_REQUEST_APPROVED"
            | "SUPPORT_REQUEST_PUBLISHED"
            | "SUPPORT_APPLICATION_SUBMITTED"
            | "SUPPORT_APPLICATION_REVIEWED"
            | "SUPPORT_APPLICATION_ACCEPTED"
            | "SUPPORT_APPLICATION_REJECTED"
            | "SUPPORT_PARTNER_SELECTED"
            | "SUPPORT_REQUEST_FULFILLED"
            | "PILOT_PLAN_CREATED"
            | "PILOT_PLAN_UPDATED"
            | "PILOT_PLAN_SUBMITTED"
            | "PILOT_REVIEW_STARTED"
            | "PILOT_REVISION_REQUESTED"
            | "PILOT_RESUBMITTED"
            | "PILOT_APPROVED"
            | "PILOT_REJECTED"
            | "PILOT_STARTED"
            | "PILOT_MILESTONE_UPDATED"
            | "PILOT_EVIDENCE_ADDED"
            | "PILOT_BLOCKER_REPORTED"
            | "PILOT_BLOCKER_RESOLVED"
            | "VALIDATION_DRAFT_SAVED"
            | "VALIDATION_SUBMITTED"
            | "VALIDATION_REVIEW_STARTED"
            | "VALIDATION_REVISION_REQUESTED"
            | "VALIDATION_RESUBMITTED"
            | "VALIDATION_APPROVED"
            | "VALIDATION_REJECTED"
            | "DEPLOYMENT_PLAN_CREATED"
            | "DEPLOYMENT_PLAN_UPDATED"
            | "DEPLOYMENT_PLAN_SUBMITTED"
            | "DEPLOYMENT_REVIEW_STARTED"
            | "DEPLOYMENT_REVISION_REQUESTED"
            | "DEPLOYMENT_RESUBMITTED"
            | "DEPLOYMENT_APPROVED"
            | "DEPLOYMENT_REJECTED"
            | "DEPLOYMENT_STARTED"
            | "IMPACT_REPORT_SUBMITTED"
            | "IMPACT_REPORT_ACKNOWLEDGED"
            | "IMPACT_METRIC_UPDATED"
            | "SOLUTION_KNOWLEDGE_CREATED"
            | "SOLUTION_MARKED_REUSABLE"
            | "SOLUTION_ARCHIVED"
            | "SOLUTION_MATCH_DETECTED"
            | "SOLUTION_REUSE_REVIEWED"
            | "SOLUTION_REUSE_APPROVED"
            | "SOLUTION_ADAPTATION_REQUESTED"
            | "RECURRENCE_PATTERN_DETECTED"
            | "PREVENTIVE_RECOMMENDATION_CREATED"
            | "PREVENTIVE_RECOMMENDATION_ACKNOWLEDGED"
            | "PREVENTIVE_RECOMMENDATION_DISMISSED";
          description: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          actor_profile_id: string;
          activity_type:
            | "PROJECT_CREATED"
            | "MEMBER_ADDED"
            | "MEMBER_ROLE_CHANGED"
            | "MEMBER_DETAILS_UPDATED"
            | "MEMBER_DEACTIVATED"
            | "MEMBER_REACTIVATED"
            | "PROJECT_LEAD_CHANGED"
            | "PROJECT_STATUS_CHANGED"
            | "PROJECT_DETAILS_UPDATED"
            | "PROPOSAL_CREATED"
            | "PROPOSAL_UPDATED"
            | "PROPOSAL_SUBMITTED"
            | "PROPOSAL_REVIEW_STARTED"
            | "PROPOSAL_REVISION_REQUESTED"
            | "PROPOSAL_RESUBMITTED"
            | "PROPOSAL_APPROVED"
            | "PROPOSAL_REJECTED"
            | "RESEARCH_STARTED"
            | "MILESTONE_CREATED"
            | "MILESTONE_UPDATED"
            | "MILESTONE_COMPLETED"
            | "PROGRESS_UPDATE_SUBMITTED"
            | "PROGRESS_UPDATE_ACKNOWLEDGED"
            | "EVIDENCE_ADDED"
            | "BLOCKER_REPORTED"
            | "BLOCKER_RESOLVED"
            | "RISK_REPORTED"
            | "RISK_UPDATED"
            | "EXTERNAL_RESOURCE_ADDED"
            | "SUPPORT_REQUEST_CREATED"
            | "SUPPORT_REQUEST_SUBMITTED"
            | "SUPPORT_REQUEST_APPROVED"
            | "SUPPORT_REQUEST_PUBLISHED"
            | "SUPPORT_APPLICATION_SUBMITTED"
            | "SUPPORT_APPLICATION_REVIEWED"
            | "SUPPORT_APPLICATION_ACCEPTED"
            | "SUPPORT_APPLICATION_REJECTED"
            | "SUPPORT_PARTNER_SELECTED"
            | "SUPPORT_REQUEST_FULFILLED"
            | "PILOT_PLAN_CREATED"
            | "PILOT_PLAN_UPDATED"
            | "PILOT_PLAN_SUBMITTED"
            | "PILOT_REVIEW_STARTED"
            | "PILOT_REVISION_REQUESTED"
            | "PILOT_RESUBMITTED"
            | "PILOT_APPROVED"
            | "PILOT_REJECTED"
            | "PILOT_STARTED"
            | "PILOT_MILESTONE_UPDATED"
            | "PILOT_EVIDENCE_ADDED"
            | "PILOT_BLOCKER_REPORTED"
            | "PILOT_BLOCKER_RESOLVED"
            | "VALIDATION_DRAFT_SAVED"
            | "VALIDATION_SUBMITTED"
            | "VALIDATION_REVIEW_STARTED"
            | "VALIDATION_REVISION_REQUESTED"
            | "VALIDATION_RESUBMITTED"
            | "VALIDATION_APPROVED"
            | "VALIDATION_REJECTED"
            | "DEPLOYMENT_PLAN_CREATED"
            | "DEPLOYMENT_PLAN_UPDATED"
            | "DEPLOYMENT_PLAN_SUBMITTED"
            | "DEPLOYMENT_REVIEW_STARTED"
            | "DEPLOYMENT_REVISION_REQUESTED"
            | "DEPLOYMENT_RESUBMITTED"
            | "DEPLOYMENT_APPROVED"
            | "DEPLOYMENT_REJECTED"
            | "DEPLOYMENT_STARTED"
            | "IMPACT_REPORT_SUBMITTED"
            | "IMPACT_REPORT_ACKNOWLEDGED"
            | "IMPACT_METRIC_UPDATED"
            | "SOLUTION_KNOWLEDGE_CREATED"
            | "SOLUTION_MARKED_REUSABLE"
            | "SOLUTION_ARCHIVED"
            | "SOLUTION_MATCH_DETECTED"
            | "SOLUTION_REUSE_REVIEWED"
            | "SOLUTION_REUSE_APPROVED"
            | "SOLUTION_ADAPTATION_REQUESTED"
            | "RECURRENCE_PATTERN_DETECTED"
            | "PREVENTIVE_RECOMMENDATION_CREATED"
            | "PREVENTIVE_RECOMMENDATION_ACKNOWLEDGED"
            | "PREVENTIVE_RECOMMENDATION_DISMISSED";
          description: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          actor_profile_id?: string;
          activity_type?:
            | "PROJECT_CREATED"
            | "MEMBER_ADDED"
            | "MEMBER_ROLE_CHANGED"
            | "MEMBER_DETAILS_UPDATED"
            | "MEMBER_DEACTIVATED"
            | "MEMBER_REACTIVATED"
            | "PROJECT_LEAD_CHANGED"
            | "PROJECT_STATUS_CHANGED"
            | "PROJECT_DETAILS_UPDATED"
            | "PROPOSAL_CREATED"
            | "PROPOSAL_UPDATED"
            | "PROPOSAL_SUBMITTED"
            | "PROPOSAL_REVIEW_STARTED"
            | "PROPOSAL_REVISION_REQUESTED"
            | "PROPOSAL_RESUBMITTED"
            | "PROPOSAL_APPROVED"
            | "PROPOSAL_REJECTED"
            | "RESEARCH_STARTED"
            | "MILESTONE_CREATED"
            | "MILESTONE_UPDATED"
            | "MILESTONE_COMPLETED"
            | "PROGRESS_UPDATE_SUBMITTED"
            | "PROGRESS_UPDATE_ACKNOWLEDGED"
            | "EVIDENCE_ADDED"
            | "BLOCKER_REPORTED"
            | "BLOCKER_RESOLVED"
            | "RISK_REPORTED"
            | "RISK_UPDATED"
            | "EXTERNAL_RESOURCE_ADDED"
            | "SUPPORT_REQUEST_CREATED"
            | "SUPPORT_REQUEST_SUBMITTED"
            | "SUPPORT_REQUEST_APPROVED"
            | "SUPPORT_REQUEST_PUBLISHED"
            | "SUPPORT_APPLICATION_SUBMITTED"
            | "SUPPORT_APPLICATION_REVIEWED"
            | "SUPPORT_APPLICATION_ACCEPTED"
            | "SUPPORT_APPLICATION_REJECTED"
            | "SUPPORT_PARTNER_SELECTED"
            | "SUPPORT_REQUEST_FULFILLED"
            | "PILOT_PLAN_CREATED"
            | "PILOT_PLAN_UPDATED"
            | "PILOT_PLAN_SUBMITTED"
            | "PILOT_REVIEW_STARTED"
            | "PILOT_REVISION_REQUESTED"
            | "PILOT_RESUBMITTED"
            | "PILOT_APPROVED"
            | "PILOT_REJECTED"
            | "PILOT_STARTED"
            | "PILOT_MILESTONE_UPDATED"
            | "PILOT_EVIDENCE_ADDED"
            | "PILOT_BLOCKER_REPORTED"
            | "PILOT_BLOCKER_RESOLVED"
            | "VALIDATION_DRAFT_SAVED"
            | "VALIDATION_SUBMITTED"
            | "VALIDATION_REVIEW_STARTED"
            | "VALIDATION_REVISION_REQUESTED"
            | "VALIDATION_RESUBMITTED"
            | "VALIDATION_APPROVED"
            | "VALIDATION_REJECTED"
            | "DEPLOYMENT_PLAN_CREATED"
            | "DEPLOYMENT_PLAN_UPDATED"
            | "DEPLOYMENT_PLAN_SUBMITTED"
            | "DEPLOYMENT_REVIEW_STARTED"
            | "DEPLOYMENT_REVISION_REQUESTED"
            | "DEPLOYMENT_RESUBMITTED"
            | "DEPLOYMENT_APPROVED"
            | "DEPLOYMENT_REJECTED"
            | "DEPLOYMENT_STARTED"
            | "IMPACT_REPORT_SUBMITTED"
            | "IMPACT_REPORT_ACKNOWLEDGED"
            | "IMPACT_METRIC_UPDATED"
            | "SOLUTION_KNOWLEDGE_CREATED"
            | "SOLUTION_MARKED_REUSABLE"
            | "SOLUTION_ARCHIVED"
            | "SOLUTION_MATCH_DETECTED"
            | "SOLUTION_REUSE_REVIEWED"
            | "SOLUTION_REUSE_APPROVED"
            | "SOLUTION_ADAPTATION_REQUESTED"
            | "RECURRENCE_PATTERN_DETECTED"
            | "PREVENTIVE_RECOMMENDATION_CREATED"
            | "PREVENTIVE_RECOMMENDATION_ACKNOWLEDGED"
            | "PREVENTIVE_RECOMMENDATION_DISMISSED";
          description?: string;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "challenge_project_activity_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "challenge_projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "challenge_project_activity_actor_profile_id_fkey";
            columns: ["actor_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      challenge_project_messages: {
        Row: {
          id: string;
          project_id: string;
          sender_profile_id: string;
          sender_name: string;
          sender_role: string;
          topic: string;
          message_body: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          sender_profile_id?: string | null;
          sender_name: string;
          sender_role?: string;
          topic?: string;
          message_body: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          sender_profile_id?: string;
          sender_name?: string;
          sender_role?: string;
          topic?: string;
          message_body?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "challenge_project_messages_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "challenge_projects";
            referencedColumns: ["id"];
          },
        ];
      };
      research_proposals: {
        Row: {
          id: string;
          project_id: string;
          challenge_id: string;
          institution_id: string;
          version_number: number;
          status: "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "REQUESTED_REVISION" | "RESUBMITTED" | "APPROVED" | "REJECTED";
          is_current: boolean;
          project_objective: string;
          research_questions: Json;
          proposed_methodology: string;
          technical_approach: string;
          team_capability_summary: string | null;
          required_resources: Json;
          expected_prototype: string;
          milestones: Json;
          deliverables: Json;
          risks_and_mitigation: Json;
          success_metrics: Json;
          submitted_by: string | null;
          submitted_at: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          review_feedback: string | null;
          revision_requested_at: string | null;
          approved_by: string | null;
          approved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          challenge_id: string;
          institution_id: string;
          version_number?: number;
          status?: "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "REQUESTED_REVISION" | "RESUBMITTED" | "APPROVED" | "REJECTED";
          is_current?: boolean;
          project_objective?: string;
          research_questions?: Json;
          proposed_methodology?: string;
          technical_approach?: string;
          team_capability_summary?: string | null;
          required_resources?: Json;
          expected_prototype?: string;
          milestones?: Json;
          deliverables?: Json;
          risks_and_mitigation?: Json;
          success_metrics?: Json;
          submitted_by?: string | null;
          submitted_at?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          review_feedback?: string | null;
          revision_requested_at?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          challenge_id?: string;
          institution_id?: string;
          version_number?: number;
          status?: "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "REQUESTED_REVISION" | "RESUBMITTED" | "APPROVED" | "REJECTED";
          is_current?: boolean;
          project_objective?: string;
          research_questions?: Json;
          proposed_methodology?: string;
          technical_approach?: string;
          team_capability_summary?: string | null;
          required_resources?: Json;
          expected_prototype?: string;
          milestones?: Json;
          deliverables?: Json;
          risks_and_mitigation?: Json;
          success_metrics?: Json;
          submitted_by?: string | null;
          submitted_at?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          review_feedback?: string | null;
          revision_requested_at?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "research_proposals_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "challenge_projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "research_proposals_challenge_id_fkey";
            columns: ["challenge_id"];
            isOneToOne: false;
            referencedRelation: "innovation_challenges";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "research_proposals_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "research_proposals_submitted_by_fkey";
            columns: ["submitted_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "research_proposals_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "research_proposals_approved_by_fkey";
            columns: ["approved_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      research_project_milestones: {
        Row: {
          id: string;
          project_id: string;
          proposal_id: string | null;
          sequence_order: number;
          title: string;
          description: string | null;
          status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "BLOCKED" | "DELAYED" | "CANCELLED";
          planned_start_date: string | null;
          planned_completion_date: string | null;
          actual_completion_date: string | null;
          completion_percentage: number;
          deliverables: Json;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          proposal_id?: string | null;
          sequence_order?: number;
          title: string;
          description?: string | null;
          status?: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "BLOCKED" | "DELAYED" | "CANCELLED";
          planned_start_date?: string | null;
          planned_completion_date?: string | null;
          actual_completion_date?: string | null;
          completion_percentage?: number;
          deliverables?: Json;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          proposal_id?: string | null;
          sequence_order?: number;
          title?: string;
          description?: string | null;
          status?: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "BLOCKED" | "DELAYED" | "CANCELLED";
          planned_start_date?: string | null;
          planned_completion_date?: string | null;
          actual_completion_date?: string | null;
          completion_percentage?: number;
          deliverables?: Json;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "research_project_milestones_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "challenge_projects";
            referencedColumns: ["id"];
          },
        ];
      };
      research_progress_updates: {
        Row: {
          id: string;
          project_id: string;
          reporting_period_start: string;
          reporting_period_end: string;
          summary_completed: string;
          current_findings: string | null;
          milestone_id: string | null;
          milestone_progress_pct: number | null;
          next_planned_work: string;
          support_required: string | null;
          support_category:
            | "HARDWARE"
            | "DATA_ACCESS"
            | "TESTBED"
            | "REGULATORY"
            | "FINANCIAL"
            | "TECHNICAL_ADVISORY"
            | "OTHER"
            | null;
          submitted_by: string | null;
          submitted_at: string;
          manager_acknowledged_at: string | null;
          manager_acknowledged_by: string | null;
          manager_feedback: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          reporting_period_start: string;
          reporting_period_end: string;
          summary_completed: string;
          current_findings?: string | null;
          milestone_id?: string | null;
          milestone_progress_pct?: number | null;
          next_planned_work: string;
          support_required?: string | null;
          support_category?:
            | "HARDWARE"
            | "DATA_ACCESS"
            | "TESTBED"
            | "REGULATORY"
            | "FINANCIAL"
            | "TECHNICAL_ADVISORY"
            | "OTHER"
            | null;
          submitted_by?: string | null;
          submitted_at?: string;
          manager_acknowledged_at?: string | null;
          manager_acknowledged_by?: string | null;
          manager_feedback?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          reporting_period_start?: string;
          reporting_period_end?: string;
          summary_completed?: string;
          current_findings?: string | null;
          milestone_id?: string | null;
          milestone_progress_pct?: number | null;
          next_planned_work?: string;
          support_required?: string | null;
          support_category?:
            | "HARDWARE"
            | "DATA_ACCESS"
            | "TESTBED"
            | "REGULATORY"
            | "FINANCIAL"
            | "TECHNICAL_ADVISORY"
            | "OTHER"
            | null;
          submitted_by?: string | null;
          submitted_at?: string;
          manager_acknowledged_at?: string | null;
          manager_acknowledged_by?: string | null;
          manager_feedback?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "research_progress_updates_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "challenge_projects";
            referencedColumns: ["id"];
          },
        ];
      };
      research_evidence: {
        Row: {
          id: string;
          project_id: string;
          progress_update_id: string | null;
          milestone_id: string | null;
          title: string;
          evidence_type:
            | "REPORT"
            | "CODE_REPO"
            | "DATASET"
            | "IMAGE"
            | "VIDEO"
            | "DASHBOARD"
            | "PUBLICATION"
            | "PROTOTYPE_DOC"
            | "OTHER";
          url: string | null;
          file_path: string | null;
          description: string | null;
          uploaded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          progress_update_id?: string | null;
          milestone_id?: string | null;
          title: string;
          evidence_type:
            | "REPORT"
            | "CODE_REPO"
            | "DATASET"
            | "IMAGE"
            | "VIDEO"
            | "DASHBOARD"
            | "PUBLICATION"
            | "PROTOTYPE_DOC"
            | "OTHER";
          url?: string | null;
          file_path?: string | null;
          description?: string | null;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          progress_update_id?: string | null;
          milestone_id?: string | null;
          title?: string;
          evidence_type?:
            | "REPORT"
            | "CODE_REPO"
            | "DATASET"
            | "IMAGE"
            | "VIDEO"
            | "DASHBOARD"
            | "PUBLICATION"
            | "PROTOTYPE_DOC"
            | "OTHER";
          url?: string | null;
          file_path?: string | null;
          description?: string | null;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "research_evidence_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "challenge_projects";
            referencedColumns: ["id"];
          },
        ];
      };
      research_blockers_risks: {
        Row: {
          id: string;
          project_id: string;
          item_type: "BLOCKER" | "RISK";
          title: string;
          description: string;
          severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
          status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
          support_required: string | null;
          reported_by: string | null;
          reported_at: string;
          resolution_notes: string | null;
          resolved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          item_type: "BLOCKER" | "RISK";
          title: string;
          description: string;
          severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
          status?: "OPEN" | "IN_PROGRESS" | "RESOLVED";
          support_required?: string | null;
          reported_by?: string | null;
          reported_at?: string;
          resolution_notes?: string | null;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          item_type?: "BLOCKER" | "RISK";
          title?: string;
          description?: string;
          severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
          status?: "OPEN" | "IN_PROGRESS" | "RESOLVED";
          support_required?: string | null;
          reported_by?: string | null;
          reported_at?: string;
          resolution_notes?: string | null;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "research_blockers_risks_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "challenge_projects";
            referencedColumns: ["id"];
          },
        ];
      };
      industry_organizations: {
        Row: {
          id: string;
          name: string;
          legal_name: string | null;
          organization_type: OrganizationType;
          sector: string | null;
          website_url: string | null;
          contact_person: string | null;
          contact_email: string;
          contact_phone: string | null;
          address: string | null;
          verification_status: VerificationStatus;
          verified_at: string | null;
          verified_by: string | null;
          rejection_reason: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          legal_name?: string | null;
          organization_type?: OrganizationType;
          sector?: string | null;
          website_url?: string | null;
          contact_person?: string | null;
          contact_email: string;
          contact_phone?: string | null;
          address?: string | null;
          verification_status?: VerificationStatus;
          verified_at?: string | null;
          verified_by?: string | null;
          rejection_reason?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          legal_name?: string | null;
          organization_type?: OrganizationType;
          sector?: string | null;
          website_url?: string | null;
          contact_person?: string | null;
          contact_email?: string;
          contact_phone?: string | null;
          address?: string | null;
          verification_status?: VerificationStatus;
          verified_at?: string | null;
          verified_by?: string | null;
          rejection_reason?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "industry_organizations_verified_by_fkey";
            columns: ["verified_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      research_support_requests: {
        Row: {
          id: string;
          challenge_id: string;
          institution_id: string;
          project_id: string;
          linked_milestone_id: string | null;
          linked_blocker_id: string | null;
          title: string;
          description: string;
          category: SupportRequestCategory;
          priority: SupportRequestPriority;
          status: SupportRequestStatus;
          quantity: number | null;
          unit: string | null;
          amount: number | null;
          currency: string;
          purpose: string | null;
          justification: string | null;
          specifications: Json;
          required_by: string | null;
          delivery_location: string | null;
          created_by: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          review_feedback: string | null;
          published_at: string | null;
          closed_at: string | null;
          fulfilled_at: string | null;
          created_at: string;
          updated_at: string;
          // Compatibility getters
          specification?: string | null;
          quantity_or_scope?: string | null;
          estimated_cost?: number | null;
          required_by_date?: string | null;
          confidentiality_level?: SupportConfidentiality;
          review_notes?: string | null;
          metadata?: Json;
        };
        Insert: {
          id?: string;
          challenge_id: string;
          institution_id: string;
          project_id: string;
          linked_milestone_id?: string | null;
          linked_blocker_id?: string | null;
          title: string;
          description: string;
          category: SupportRequestCategory;
          priority?: SupportRequestPriority;
          status?: SupportRequestStatus;
          quantity?: number | null;
          unit?: string | null;
          amount?: number | null;
          currency?: string;
          purpose?: string | null;
          justification?: string | null;
          specifications?: Json;
          required_by?: string | null;
          delivery_location?: string | null;
          created_by?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          review_feedback?: string | null;
          published_at?: string | null;
          closed_at?: string | null;
          fulfilled_at?: string | null;
          created_at?: string;
          updated_at?: string;
          // Compatibility inputs
          specification?: string | null;
          quantity_or_scope?: string | null;
          estimated_cost?: number | null;
          required_by_date?: string | null;
          confidentiality_level?: SupportConfidentiality;
          review_notes?: string | null;
          metadata?: Json;
        };
        Update: {
          id?: string;
          challenge_id?: string;
          institution_id?: string;
          project_id?: string;
          linked_milestone_id?: string | null;
          linked_blocker_id?: string | null;
          title?: string;
          description?: string;
          category?: SupportRequestCategory;
          priority?: SupportRequestPriority;
          status?: SupportRequestStatus;
          quantity?: number | null;
          unit?: string | null;
          amount?: number | null;
          currency?: string;
          purpose?: string | null;
          justification?: string | null;
          specifications?: Json;
          required_by?: string | null;
          delivery_location?: string | null;
          created_by?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          review_feedback?: string | null;
          published_at?: string | null;
          closed_at?: string | null;
          fulfilled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "research_support_requests_challenge_id_fkey";
            columns: ["challenge_id"];
            isOneToOne: false;
            referencedRelation: "challenges";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "research_support_requests_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "research_support_requests_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "challenge_projects";
            referencedColumns: ["id"];
          },
        ];
      };
      research_support_listings: {
        Row: {
          id: string;
          support_request_id: string;
          challenge_id: string;
          institution_id: string;
          project_id: string;
          public_title: string;
          public_summary: string;
          category: SupportRequestCategory;
          public_specification: string | null;
          public_timeline: string | null;
          desired_outcome: string | null;
          status: ListingStatus;
          applications_count: number;
          published_at: string | null;
          published_by: string | null;
          expires_at: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
          listing_title?: string | null;
          deliverable_specs?: string | null;
          target_timeline?: string | null;
          expected_outcome?: string | null;
        };
        Insert: {
          id?: string;
          support_request_id: string;
          challenge_id: string;
          institution_id: string;
          project_id: string;
          public_title: string;
          public_summary: string;
          category: SupportRequestCategory;
          public_specification?: string | null;
          public_timeline?: string | null;
          desired_outcome?: string | null;
          status?: ListingStatus;
          applications_count?: number;
          published_at?: string | null;
          published_by?: string | null;
          expires_at?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
          listing_title?: string | null;
          deliverable_specs?: string | null;
          target_timeline?: string | null;
          expected_outcome?: string | null;
        };
        Update: {
          id?: string;
          support_request_id?: string;
          challenge_id?: string;
          institution_id?: string;
          project_id?: string;
          public_title?: string;
          public_summary?: string;
          category?: SupportRequestCategory;
          public_specification?: string | null;
          public_timeline?: string | null;
          desired_outcome?: string | null;
          status?: ListingStatus;
          applications_count?: number;
          published_at?: string | null;
          published_by?: string | null;
          expires_at?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
          listing_title?: string | null;
          deliverable_specs?: string | null;
          target_timeline?: string | null;
          expected_outcome?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "research_support_listings_support_request_id_fkey";
            columns: ["support_request_id"];
            isOneToOne: true;
            referencedRelation: "research_support_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      research_support_applications: {
        Row: {
          id: string;
          listing_id: string;
          support_request_id?: string | null;
          organization_id: string;
          applicant_profile_id: string;
          submitted_by?: string | null;
          proposed_contribution: string;
          offered_support?: string | null;
          capabilities_summary: string;
          proposal?: string | null;
          estimated_value: number | null;
          offered_amount?: number | null;
          timeline: string | null;
          estimated_timeline?: string | null;
          terms_or_conditions: string | null;
          conditions?: string | null;
          status: ApplicationStatus;
          review_notes: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          acceptance_agreement_notes: string | null;
          rejection_reason: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          support_request_id?: string | null;
          organization_id: string;
          applicant_profile_id: string;
          submitted_by?: string | null;
          proposed_contribution: string;
          offered_support?: string | null;
          capabilities_summary: string;
          proposal?: string | null;
          estimated_value?: number | null;
          offered_amount?: number | null;
          timeline?: string | null;
          estimated_timeline?: string | null;
          terms_or_conditions?: string | null;
          conditions?: string | null;
          status?: ApplicationStatus;
          review_notes?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          acceptance_agreement_notes?: string | null;
          rejection_reason?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          listing_id?: string;
          support_request_id?: string | null;
          organization_id?: string;
          applicant_profile_id?: string;
          submitted_by?: string | null;
          proposed_contribution?: string;
          offered_support?: string | null;
          capabilities_summary?: string;
          proposal?: string | null;
          estimated_value?: number | null;
          offered_amount?: number | null;
          timeline?: string | null;
          estimated_timeline?: string | null;
          terms_or_conditions?: string | null;
          conditions?: string | null;
          status?: ApplicationStatus;
          review_notes?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          acceptance_agreement_notes?: string | null;
          rejection_reason?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "research_support_applications_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "research_support_listings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "research_support_applications_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "industry_organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      project_support_partners: {
        Row: {
          id: string;
          project_id: string;
          support_request_id: string;
          application_id: string;
          organization_id: string;
          participation_status: PartnerParticipationStatus;
          access_scope: SupportAccessScope;
          agreement_notes: string | null;
          onboarded_at: string;
          completed_at: string | null;
          listing_id?: string | null;
          category?: SupportRequestCategory | null;
          contribution_summary?: string | null;
          status?: PartnerParticipationStatus;
          started_at?: string;
          notes?: string | null;
          metadata?: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          support_request_id: string;
          application_id: string;
          organization_id: string;
          participation_status?: PartnerParticipationStatus;
          access_scope?: SupportAccessScope;
          agreement_notes?: string | null;
          onboarded_at?: string;
          completed_at?: string | null;
          listing_id?: string | null;
          category?: SupportRequestCategory | null;
          contribution_summary?: string | null;
          status?: PartnerParticipationStatus;
          started_at?: string;
          notes?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          support_request_id?: string;
          application_id?: string;
          organization_id?: string;
          participation_status?: PartnerParticipationStatus;
          access_scope?: SupportAccessScope;
          agreement_notes?: string | null;
          onboarded_at?: string;
          completed_at?: string | null;
          listing_id?: string | null;
          category?: SupportRequestCategory | null;
          contribution_summary?: string | null;
          status?: PartnerParticipationStatus;
          started_at?: string;
          notes?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_support_partners_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "challenge_projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_support_partners_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "industry_organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      pilot_plans: {
        Row: {
          id: string;
          project_id: string;
          challenge_id: string;
          institution_id: string;
          created_by: string;
          title: string;
          summary: string;
          objective: string;
          research_hypothesis: string;
          test_environment_type: PilotEnvironmentType;
          test_environment_description: string;
          location_description: string;
          planned_start_date: string;
          planned_end_date: string;
          estimated_duration_days: number;
          baseline_description: string;
          baseline_metrics: Json;
          kpis: Json;
          success_criteria: string;
          participant_description: string | null;
          participant_count: number;
          participant_selection_method: string | null;
          risk_and_safety_considerations: string;
          risk_mitigation_plan: string;
          ethical_considerations: string | null;
          version: number;
          status: PilotPlanStatus;
          submitted_at: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          approved_at: string | null;
          approved_by: string | null;
          approval_notes: string | null;
          rejected_at: string | null;
          rejected_by: string | null;
          rejection_reason: string | null;
          revision_requested_at: string | null;
          revision_feedback: string | null;
          pilot_started_at: string | null;
          pilot_started_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          challenge_id: string;
          institution_id: string;
          created_by: string;
          title: string;
          summary: string;
          objective: string;
          research_hypothesis: string;
          test_environment_type?: PilotEnvironmentType;
          test_environment_description: string;
          location_description: string;
          planned_start_date: string;
          planned_end_date: string;
          estimated_duration_days?: number;
          baseline_description: string;
          baseline_metrics?: Json;
          kpis?: Json;
          success_criteria: string;
          participant_description?: string | null;
          participant_count?: number;
          participant_selection_method?: string | null;
          risk_and_safety_considerations: string;
          risk_mitigation_plan: string;
          ethical_considerations?: string | null;
          version?: number;
          status?: PilotPlanStatus;
          submitted_at?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          approved_at?: string | null;
          approved_by?: string | null;
          approval_notes?: string | null;
          rejected_at?: string | null;
          rejected_by?: string | null;
          rejection_reason?: string | null;
          revision_requested_at?: string | null;
          revision_feedback?: string | null;
          pilot_started_at?: string | null;
          pilot_started_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          challenge_id?: string;
          institution_id?: string;
          created_by?: string;
          title?: string;
          summary?: string;
          objective?: string;
          research_hypothesis?: string;
          test_environment_type?: PilotEnvironmentType;
          test_environment_description?: string;
          location_description?: string;
          planned_start_date?: string;
          planned_end_date?: string;
          estimated_duration_days?: number;
          baseline_description?: string;
          baseline_metrics?: Json;
          kpis?: Json;
          success_criteria?: string;
          participant_description?: string | null;
          participant_count?: number;
          participant_selection_method?: string | null;
          risk_and_safety_considerations?: string;
          risk_mitigation_plan?: string;
          ethical_considerations?: string | null;
          version?: number;
          status?: PilotPlanStatus;
          submitted_at?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          approved_at?: string | null;
          approved_by?: string | null;
          approval_notes?: string | null;
          rejected_at?: string | null;
          rejected_by?: string | null;
          rejection_reason?: string | null;
          revision_requested_at?: string | null;
          revision_feedback?: string | null;
          pilot_started_at?: string | null;
          pilot_started_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pilot_plans_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: true;
            referencedRelation: "challenge_projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pilot_plans_challenge_id_fkey";
            columns: ["challenge_id"];
            isOneToOne: false;
            referencedRelation: "innovation_challenges";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pilot_plans_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          },
        ];
      };
      pilot_plan_revisions: {
        Row: {
          id: string;
          pilot_plan_id: string;
          version: number;
          title: string;
          summary: string;
          objective: string;
          research_hypothesis: string;
          test_environment_type: string;
          test_environment_description: string;
          location_description: string;
          planned_start_date: string;
          planned_end_date: string;
          estimated_duration_days: number;
          baseline_description: string;
          baseline_metrics: Json;
          kpis: Json;
          success_criteria: string;
          participant_description: string | null;
          participant_count: number;
          participant_selection_method: string | null;
          risk_and_safety_considerations: string;
          risk_mitigation_plan: string;
          ethical_considerations: string | null;
          status: string;
          submitted_by: string | null;
          submitted_at: string;
          feedback: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          pilot_plan_id: string;
          version: number;
          title: string;
          summary: string;
          objective: string;
          research_hypothesis: string;
          test_environment_type: string;
          test_environment_description: string;
          location_description: string;
          planned_start_date: string;
          planned_end_date: string;
          estimated_duration_days: number;
          baseline_description: string;
          baseline_metrics?: Json;
          kpis?: Json;
          success_criteria: string;
          participant_description?: string | null;
          participant_count?: number;
          participant_selection_method?: string | null;
          risk_and_safety_considerations: string;
          risk_mitigation_plan: string;
          ethical_considerations?: string | null;
          status: string;
          submitted_by?: string | null;
          submitted_at?: string;
          feedback?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          pilot_plan_id?: string;
          version?: number;
          title?: string;
          summary?: string;
          objective?: string;
          research_hypothesis?: string;
          test_environment_type?: string;
          test_environment_description?: string;
          location_description?: string;
          planned_start_date?: string;
          planned_end_date?: string;
          estimated_duration_days?: number;
          baseline_description?: string;
          baseline_metrics?: Json;
          kpis?: Json;
          success_criteria?: string;
          participant_description?: string | null;
          participant_count?: number;
          participant_selection_method?: string | null;
          risk_and_safety_considerations?: string;
          risk_mitigation_plan?: string;
          ethical_considerations?: string | null;
          status?: string;
          submitted_by?: string | null;
          submitted_at?: string;
          feedback?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pilot_plan_revisions_pilot_plan_id_fkey";
            columns: ["pilot_plan_id"];
            isOneToOne: false;
            referencedRelation: "pilot_plans";
            referencedColumns: ["id"];
          },
        ];
      };
      pilot_validation_results: {
        Row: {
          id: string;
          pilot_plan_id: string;
          project_id: string;
          challenge_id: string;
          institution_id: string;
          version: number;
          status: "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "REQUESTED_REVISION" | "RESUBMITTED" | "APPROVED" | "REJECTED";
          overall_summary: string;
          observed_outcomes: string;
          deviations: Json;
          lessons_learned: string;
          limitations: string | null;
          recommendations: string | null;
          university_interpretation: string | null;
          final_outcome: "MEETS_SUCCESS_CRITERIA" | "PARTIALLY_MEETS_SUCCESS_CRITERIA" | "DOES_NOT_MEET_SUCCESS_CRITERIA" | "INCONCLUSIVE" | null;
          submitted_by: string | null;
          submitted_at: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          review_feedback: string | null;
          revision_requested_at: string | null;
          approved_at: string | null;
          approved_by: string | null;
          approval_notes: string | null;
          rejected_at: string | null;
          rejected_by: string | null;
          rejection_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          pilot_plan_id: string;
          project_id: string;
          challenge_id: string;
          institution_id: string;
          version?: number;
          status?: "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "REQUESTED_REVISION" | "RESUBMITTED" | "APPROVED" | "REJECTED";
          overall_summary: string;
          observed_outcomes: string;
          deviations?: Json;
          lessons_learned: string;
          limitations?: string | null;
          recommendations?: string | null;
          university_interpretation?: string | null;
          final_outcome?: "MEETS_SUCCESS_CRITERIA" | "PARTIALLY_MEETS_SUCCESS_CRITERIA" | "DOES_NOT_MEET_SUCCESS_CRITERIA" | "INCONCLUSIVE" | null;
          submitted_by?: string | null;
          submitted_at?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          review_feedback?: string | null;
          revision_requested_at?: string | null;
          approved_at?: string | null;
          approved_by?: string | null;
          approval_notes?: string | null;
          rejected_at?: string | null;
          rejected_by?: string | null;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          pilot_plan_id?: string;
          project_id?: string;
          challenge_id?: string;
          institution_id?: string;
          version?: number;
          status?: "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "REQUESTED_REVISION" | "RESUBMITTED" | "APPROVED" | "REJECTED";
          overall_summary?: string;
          observed_outcomes?: string;
          deviations?: Json;
          lessons_learned?: string;
          limitations?: string | null;
          recommendations?: string | null;
          university_interpretation?: string | null;
          final_outcome?: "MEETS_SUCCESS_CRITERIA" | "PARTIALLY_MEETS_SUCCESS_CRITERIA" | "DOES_NOT_MEET_SUCCESS_CRITERIA" | "INCONCLUSIVE" | null;
          submitted_by?: string | null;
          submitted_at?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          review_feedback?: string | null;
          revision_requested_at?: string | null;
          approved_at?: string | null;
          approved_by?: string | null;
          approval_notes?: string | null;
          rejected_at?: string | null;
          rejected_by?: string | null;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pilot_validation_results_pilot_plan_id_fkey";
            columns: ["pilot_plan_id"];
            isOneToOne: false;
            referencedRelation: "pilot_plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pilot_validation_results_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: true;
            referencedRelation: "challenge_projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pilot_validation_results_challenge_id_fkey";
            columns: ["challenge_id"];
            isOneToOne: false;
            referencedRelation: "innovation_challenges";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pilot_validation_results_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          },
        ];
      };
      pilot_validation_kpi_results: {
        Row: {
          id: string;
          validation_id: string;
          kpi_id: string;
          kpi_name: string;
          description: string | null;
          unit: string | null;
          baseline_value: string;
          target_value: string;
          observed_value: string;
          measurement_method: string | null;
          measurement_period: string | null;
          achievement_status: "ACHIEVED" | "PARTIALLY_ACHIEVED" | "NOT_ACHIEVED" | "INCONCLUSIVE";
          evidence_ids: Json;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          validation_id: string;
          kpi_id: string;
          kpi_name: string;
          description?: string | null;
          unit?: string | null;
          baseline_value: string;
          target_value: string;
          observed_value: string;
          measurement_method?: string | null;
          measurement_period?: string | null;
          achievement_status?: "ACHIEVED" | "PARTIALLY_ACHIEVED" | "NOT_ACHIEVED" | "INCONCLUSIVE";
          evidence_ids?: Json;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          validation_id?: string;
          kpi_id?: string;
          kpi_name?: string;
          description?: string | null;
          unit?: string | null;
          baseline_value?: string;
          target_value?: string;
          observed_value?: string;
          measurement_method?: string | null;
          measurement_period?: string | null;
          achievement_status?: "ACHIEVED" | "PARTIALLY_ACHIEVED" | "NOT_ACHIEVED" | "INCONCLUSIVE";
          evidence_ids?: Json;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pilot_validation_kpi_results_validation_id_fkey";
            columns: ["validation_id"];
            isOneToOne: false;
            referencedRelation: "pilot_validation_results";
            referencedColumns: ["id"];
          },
        ];
      };
      pilot_validation_revisions: {
        Row: {
          id: string;
          validation_id: string;
          version: number;
          overall_summary: string;
          observed_outcomes: string;
          deviations: Json;
          lessons_learned: string;
          limitations: string | null;
          recommendations: string | null;
          university_interpretation: string | null;
          kpi_results_snapshot: Json;
          status: string;
          submitted_by: string | null;
          submitted_at: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          review_feedback: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          validation_id: string;
          version: number;
          overall_summary: string;
          observed_outcomes: string;
          deviations?: Json;
          lessons_learned: string;
          limitations?: string | null;
          recommendations?: string | null;
          university_interpretation?: string | null;
          kpi_results_snapshot?: Json;
          status: string;
          submitted_by?: string | null;
          submitted_at?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          review_feedback?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          validation_id?: string;
          version?: number;
          overall_summary?: string;
          observed_outcomes?: string;
          deviations?: Json;
          lessons_learned?: string;
          limitations?: string | null;
          recommendations?: string | null;
          university_interpretation?: string | null;
          kpi_results_snapshot?: Json;
          status?: string;
          submitted_by?: string | null;
          submitted_at?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          review_feedback?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pilot_validation_revisions_validation_id_fkey";
            columns: ["validation_id"];
            isOneToOne: false;
            referencedRelation: "pilot_validation_results";
            referencedColumns: ["id"];
          },
        ];
      };
      deployment_plans: {
        Row: {
          id: string;
          project_id: string;
          pilot_plan_id: string;
          validation_id: string;
          challenge_id: string;
          institution_id: string;
          created_by: string;
          version: number;
          status: string;
          deployment_decision: string | null;
          title: string;
          summary: string;
          deployment_scope: string;
          target_geography: string;
          target_population: string;
          scale_multiplier: string | null;
          deployment_phases: Json;
          technical_readiness: string;
          operational_readiness: string;
          funding_requirements: string | null;
          hardware_requirements: string | null;
          technology_requirements: string | null;
          human_resource_requirements: string | null;
          infrastructure_requirements: string | null;
          training_plan: string | null;
          maintenance_plan: string | null;
          risk_management_plan: string;
          planned_start_date: string;
          planned_end_date: string;
          estimated_duration_days: number;
          deployment_started_at: string | null;
          deployment_completed_at: string | null;
          submitted_by: string | null;
          submitted_at: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          review_feedback: string | null;
          revision_requested_at: string | null;
          approved_by: string | null;
          approved_at: string | null;
          approval_notes: string | null;
          rejected_by: string | null;
          rejected_at: string | null;
          rejection_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          pilot_plan_id: string;
          validation_id: string;
          challenge_id: string;
          institution_id: string;
          created_by: string;
          version?: number;
          status?: string;
          deployment_decision?: string | null;
          title: string;
          summary: string;
          deployment_scope: string;
          target_geography: string;
          target_population: string;
          scale_multiplier?: string | null;
          deployment_phases?: Json;
          technical_readiness: string;
          operational_readiness: string;
          funding_requirements?: string | null;
          hardware_requirements?: string | null;
          technology_requirements?: string | null;
          human_resource_requirements?: string | null;
          infrastructure_requirements?: string | null;
          training_plan?: string | null;
          maintenance_plan?: string | null;
          risk_management_plan: string;
          planned_start_date: string;
          planned_end_date: string;
          estimated_duration_days?: number;
          deployment_started_at?: string | null;
          deployment_completed_at?: string | null;
          submitted_by?: string | null;
          submitted_at?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          review_feedback?: string | null;
          revision_requested_at?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          approval_notes?: string | null;
          rejected_by?: string | null;
          rejected_at?: string | null;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          pilot_plan_id?: string;
          validation_id?: string;
          challenge_id?: string;
          institution_id?: string;
          created_by?: string;
          version?: number;
          status?: string;
          deployment_decision?: string | null;
          title?: string;
          summary?: string;
          deployment_scope?: string;
          target_geography?: string;
          target_population?: string;
          scale_multiplier?: string | null;
          deployment_phases?: Json;
          technical_readiness?: string;
          operational_readiness?: string;
          funding_requirements?: string | null;
          hardware_requirements?: string | null;
          technology_requirements?: string | null;
          human_resource_requirements?: string | null;
          infrastructure_requirements?: string | null;
          training_plan?: string | null;
          maintenance_plan?: string | null;
          risk_management_plan?: string;
          planned_start_date?: string;
          planned_end_date?: string;
          estimated_duration_days?: number;
          deployment_started_at?: string | null;
          deployment_completed_at?: string | null;
          submitted_by?: string | null;
          submitted_at?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          review_feedback?: string | null;
          revision_requested_at?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          approval_notes?: string | null;
          rejected_by?: string | null;
          rejected_at?: string | null;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "deployment_plans_challenge_id_fkey";
            columns: ["challenge_id"];
            isOneToOne: false;
            referencedRelation: "innovation_challenges";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deployment_plans_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deployment_plans_pilot_plan_id_fkey";
            columns: ["pilot_plan_id"];
            isOneToOne: false;
            referencedRelation: "pilot_plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deployment_plans_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "challenge_projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deployment_plans_validation_id_fkey";
            columns: ["validation_id"];
            isOneToOne: false;
            referencedRelation: "pilot_validation_results";
            referencedColumns: ["id"];
          },
        ];
      };
      deployment_impact_metrics: {
        Row: {
          id: string;
          deployment_plan_id: string;
          project_id: string;
          metric_name: string;
          description: string | null;
          unit: string | null;
          baseline_value: string;
          target_value: string;
          observed_value: string;
          measurement_period: string | null;
          measurement_method: string | null;
          data_source: string | null;
          evidence_ids: Json;
          status: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          deployment_plan_id: string;
          project_id: string;
          metric_name: string;
          description?: string | null;
          unit?: string | null;
          baseline_value: string;
          target_value: string;
          observed_value?: string;
          measurement_period?: string | null;
          measurement_method?: string | null;
          data_source?: string | null;
          evidence_ids?: Json;
          status?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          deployment_plan_id?: string;
          project_id?: string;
          metric_name?: string;
          description?: string | null;
          unit?: string | null;
          baseline_value?: string;
          target_value?: string;
          observed_value?: string;
          measurement_period?: string | null;
          measurement_method?: string | null;
          data_source?: string | null;
          evidence_ids?: Json;
          status?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "deployment_impact_metrics_deployment_plan_id_fkey";
            columns: ["deployment_plan_id"];
            isOneToOne: false;
            referencedRelation: "deployment_plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deployment_impact_metrics_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "challenge_projects";
            referencedColumns: ["id"];
          },
        ];
      };
      deployment_impact_reports: {
        Row: {
          id: string;
          deployment_plan_id: string;
          project_id: string;
          reporting_period: string;
          period_start_date: string;
          period_end_date: string;
          key_findings: string;
          deployment_progress_summary: string;
          metric_measurements: Json;
          unexpected_effects: string | null;
          emerging_risks: string | null;
          corrective_actions: string | null;
          next_steps: string | null;
          evidence_ids: Json;
          submitted_by: string | null;
          submitted_at: string;
          acknowledged_by: string | null;
          acknowledged_at: string | null;
          acknowledgement_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          deployment_plan_id: string;
          project_id: string;
          reporting_period: string;
          period_start_date: string;
          period_end_date: string;
          key_findings: string;
          deployment_progress_summary: string;
          metric_measurements?: Json;
          unexpected_effects?: string | null;
          emerging_risks?: string | null;
          corrective_actions?: string | null;
          next_steps?: string | null;
          evidence_ids?: Json;
          submitted_by?: string | null;
          submitted_at?: string;
          acknowledged_by?: string | null;
          acknowledged_at?: string | null;
          acknowledgement_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          deployment_plan_id?: string;
          project_id?: string;
          reporting_period?: string;
          period_start_date?: string;
          period_end_date?: string;
          key_findings?: string;
          deployment_progress_summary?: string;
          metric_measurements?: Json;
          unexpected_effects?: string | null;
          emerging_risks?: string | null;
          corrective_actions?: string | null;
          next_steps?: string | null;
          evidence_ids?: Json;
          submitted_by?: string | null;
          submitted_at?: string;
          acknowledged_by?: string | null;
          acknowledged_at?: string | null;
          acknowledgement_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "deployment_impact_reports_deployment_plan_id_fkey";
            columns: ["deployment_plan_id"];
            isOneToOne: false;
            referencedRelation: "deployment_plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deployment_impact_reports_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "challenge_projects";
            referencedColumns: ["id"];
          },
        ];
      };
      deployment_plan_revisions: {
        Row: {
          id: string;
          deployment_plan_id: string;
          version: number;
          title: string;
          summary: string;
          deployment_scope: string;
          target_geography: string;
          target_population: string;
          scale_multiplier: string | null;
          deployment_phases: Json;
          technical_readiness: string;
          operational_readiness: string;
          funding_requirements: string | null;
          hardware_requirements: string | null;
          technology_requirements: string | null;
          human_resource_requirements: string | null;
          infrastructure_requirements: string | null;
          training_plan: string | null;
          maintenance_plan: string | null;
          risk_management_plan: string;
          impact_metrics_snapshot: Json;
          status: string;
          deployment_decision: string | null;
          submitted_by: string | null;
          submitted_at: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          review_feedback: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          deployment_plan_id: string;
          version: number;
          title: string;
          summary: string;
          deployment_scope: string;
          target_geography: string;
          target_population: string;
          scale_multiplier?: string | null;
          deployment_phases?: Json;
          technical_readiness: string;
          operational_readiness: string;
          funding_requirements?: string | null;
          hardware_requirements?: string | null;
          technology_requirements?: string | null;
          human_resource_requirements?: string | null;
          infrastructure_requirements?: string | null;
          training_plan?: string | null;
          maintenance_plan?: string | null;
          risk_management_plan: string;
          impact_metrics_snapshot?: Json;
          status: string;
          deployment_decision?: string | null;
          submitted_by?: string | null;
          submitted_at?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          review_feedback?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          deployment_plan_id?: string;
          version?: number;
          title?: string;
          summary?: string;
          deployment_scope?: string;
          target_geography?: string;
          target_population?: string;
          scale_multiplier?: string | null;
          deployment_phases?: Json;
          technical_readiness?: string;
          operational_readiness?: string;
          funding_requirements?: string | null;
          hardware_requirements?: string | null;
          technology_requirements?: string | null;
          human_resource_requirements?: string | null;
          infrastructure_requirements?: string | null;
          training_plan?: string | null;
          maintenance_plan?: string | null;
          risk_management_plan?: string;
          impact_metrics_snapshot?: Json;
          status?: string;
          deployment_decision?: string | null;
          submitted_by?: string | null;
          submitted_at?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          review_feedback?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "deployment_plan_revisions_deployment_plan_id_fkey";
            columns: ["deployment_plan_id"];
            isOneToOne: false;
            referencedRelation: "deployment_plans";
            referencedColumns: ["id"];
          },
        ];
      };
      simple_solution_knowledge_base: {
        Row: {
          id: string;
          source_issue_id: string;
          category: string;
          title: string;
          description: string;
          location_text: string | null;
          address_text: string | null;
          latitude: number | null;
          longitude: number | null;
          area_name: string;
          department_id: string | null;
          department_name: string | null;
          identified_root_cause: string | null;
          contributing_factors: string[];
          resolution_summary: string;
          resolution_method: string | null;
          materials_used: string[];
          resolution_duration_hours: number | null;
          before_evidence_images: Json;
          after_evidence_images: Json;
          citizen_verification_id: string | null;
          citizen_feedback: string | null;
          verified_at: string | null;
          occurrence_date: string;
          occurrence_month: number;
          occurrence_season: string;
          created_at: string;
          closed_at: string;
        };
        Insert: {
          id?: string;
          source_issue_id: string;
          category: string;
          title: string;
          description: string;
          location_text?: string | null;
          address_text?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          area_name: string;
          department_id?: string | null;
          department_name?: string | null;
          identified_root_cause?: string | null;
          contributing_factors?: string[];
          resolution_summary: string;
          resolution_method?: string | null;
          materials_used?: string[];
          resolution_duration_hours?: number | null;
          before_evidence_images?: Json;
          after_evidence_images?: Json;
          citizen_verification_id?: string | null;
          citizen_feedback?: string | null;
          verified_at?: string | null;
          occurrence_date: string;
          occurrence_month: number;
          occurrence_season?: string;
          created_at?: string;
          closed_at?: string;
        };
        Update: {
          id?: string;
          source_issue_id?: string;
          category?: string;
          title?: string;
          description?: string;
          location_text?: string | null;
          address_text?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          area_name?: string;
          department_id?: string | null;
          department_name?: string | null;
          identified_root_cause?: string | null;
          contributing_factors?: string[];
          resolution_summary?: string;
          resolution_method?: string | null;
          materials_used?: string[];
          resolution_duration_hours?: number | null;
          before_evidence_images?: Json;
          after_evidence_images?: Json;
          citizen_verification_id?: string | null;
          citizen_feedback?: string | null;
          verified_at?: string | null;
          occurrence_date?: string;
          occurrence_month?: number;
          occurrence_season?: string;
          created_at?: string;
          closed_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "simple_solution_knowledge_base_source_issue_id_fkey";
            columns: ["source_issue_id"];
            isOneToOne: true;
            referencedRelation: "issues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "simple_solution_knowledge_base_department_id_fkey";
            columns: ["department_id"];
            isOneToOne: false;
            referencedRelation: "departments";
            referencedColumns: ["id"];
          },
        ];
      };
      complex_solution_knowledge_base: {
        Row: {
          id: string;
          challenge_id: string;
          project_id: string;
          institution_id: string;
          source_issue_id: string | null;
          problem_title: string;
          problem_statement: string;
          problem_category: string;
          root_cause: string | null;
          affected_population: string | null;
          geographic_context: string | null;
          university_name: string;
          research_objective: string | null;
          methodology: string | null;
          technical_approach: string | null;
          solution_title: string;
          solution_summary: string;
          technologies_used: string[];
          required_infrastructure: string[];
          required_expertise: string[];
          pilot_plan_id: string | null;
          validation_result_id: string | null;
          validation_kpis_summary: Json;
          final_validation_outcome: string | null;
          deployment_plan_id: string | null;
          deployment_impact_summary: string | null;
          applicable_categories: string[];
          environmental_constraints: string | null;
          known_limitations: string | null;
          adaptation_requirements: string | null;
          reusability_status: "ELIGIBLE" | "ACTIVE_REUSABLE" | "NEEDS_ADAPTATION" | "SUPERSEDED" | "ARCHIVED";
          evidence_links: Json;
          reuse_count: number;
          created_at: string;
          closed_at: string;
        };
        Insert: {
          id?: string;
          challenge_id: string;
          project_id: string;
          institution_id: string;
          source_issue_id?: string | null;
          problem_title: string;
          problem_statement: string;
          problem_category: string;
          root_cause?: string | null;
          affected_population?: string | null;
          geographic_context?: string | null;
          university_name: string;
          research_objective?: string | null;
          methodology?: string | null;
          technical_approach?: string | null;
          solution_title: string;
          solution_summary: string;
          technologies_used?: string[];
          required_infrastructure?: string[];
          required_expertise?: string[];
          pilot_plan_id?: string | null;
          validation_result_id?: string | null;
          validation_kpis_summary?: Json;
          final_validation_outcome?: string | null;
          deployment_plan_id?: string | null;
          deployment_impact_summary?: string | null;
          applicable_categories?: string[];
          environmental_constraints?: string | null;
          known_limitations?: string | null;
          adaptation_requirements?: string | null;
          reusability_status?: "ELIGIBLE" | "ACTIVE_REUSABLE" | "NEEDS_ADAPTATION" | "SUPERSEDED" | "ARCHIVED";
          evidence_links?: Json;
          reuse_count?: number;
          created_at?: string;
          closed_at?: string;
        };
        Update: {
          id?: string;
          challenge_id?: string;
          project_id?: string;
          institution_id?: string;
          source_issue_id?: string | null;
          problem_title?: string;
          problem_statement?: string;
          problem_category?: string;
          root_cause?: string | null;
          affected_population?: string | null;
          geographic_context?: string | null;
          university_name?: string;
          research_objective?: string | null;
          methodology?: string | null;
          technical_approach?: string | null;
          solution_title?: string;
          solution_summary?: string;
          technologies_used?: string[];
          required_infrastructure?: string[];
          required_expertise?: string[];
          pilot_plan_id?: string | null;
          validation_result_id?: string | null;
          validation_kpis_summary?: Json;
          final_validation_outcome?: string | null;
          deployment_plan_id?: string | null;
          deployment_impact_summary?: string | null;
          applicable_categories?: string[];
          environmental_constraints?: string | null;
          known_limitations?: string | null;
          adaptation_requirements?: string | null;
          reusability_status?: "ELIGIBLE" | "ACTIVE_REUSABLE" | "NEEDS_ADAPTATION" | "SUPERSEDED" | "ARCHIVED";
          evidence_links?: Json;
          reuse_count?: number;
          created_at?: string;
          closed_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "complex_solution_knowledge_base_challenge_id_fkey";
            columns: ["challenge_id"];
            isOneToOne: false;
            referencedRelation: "innovation_challenges";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "complex_solution_knowledge_base_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: true;
            referencedRelation: "challenge_projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "complex_solution_knowledge_base_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          },
        ];
      };
      simple_issue_recurrence_patterns: {
        Row: {
          id: string;
          area_name: string;
          category: string;
          pattern_description: string;
          occurrence_count: number;
          first_observed_at: string;
          last_observed_at: string;
          seasonal_window: string | null;
          common_root_causes: string[];
          common_resolution_methods: string[];
          historical_issue_ids: string[];
          confidence: "LOW" | "MEDIUM" | "HIGH";
          status: "ACTIVE" | "MONITORED" | "RESOLVED";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          area_name: string;
          category: string;
          pattern_description: string;
          occurrence_count: number;
          first_observed_at: string;
          last_observed_at: string;
          seasonal_window?: string | null;
          common_root_causes?: string[];
          common_resolution_methods?: string[];
          historical_issue_ids?: string[];
          confidence?: "LOW" | "MEDIUM" | "HIGH";
          status?: "ACTIVE" | "MONITORED" | "RESOLVED";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          area_name?: string;
          category?: string;
          pattern_description?: string;
          occurrence_count?: number;
          first_observed_at?: string;
          last_observed_at?: string;
          seasonal_window?: string | null;
          common_root_causes?: string[];
          common_resolution_methods?: string[];
          historical_issue_ids?: string[];
          confidence?: "LOW" | "MEDIUM" | "HIGH";
          status?: "ACTIVE" | "MONITORED" | "RESOLVED";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      preventive_recommendations: {
        Row: {
          id: string;
          pattern_id: string | null;
          area_name: string;
          category: string;
          department_id: string | null;
          department_name: string | null;
          occurrence_count: number;
          seasonal_timing: string | null;
          title: string;
          recommended_action: string;
          justification: string;
          historical_issue_ids: string[];
          status: "NEW" | "UNDER_REVIEW" | "ACKNOWLEDGED" | "ACTIONED" | "DISMISSED";
          reviewed_by: string | null;
          reviewed_at: string | null;
          review_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          pattern_id?: string | null;
          area_name: string;
          category: string;
          department_id?: string | null;
          department_name?: string | null;
          occurrence_count: number;
          seasonal_timing?: string | null;
          title: string;
          recommended_action: string;
          justification: string;
          historical_issue_ids?: string[];
          status?: "NEW" | "UNDER_REVIEW" | "ACKNOWLEDGED" | "ACTIONED" | "DISMISSED";
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          review_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          pattern_id?: string | null;
          area_name?: string;
          category?: string;
          department_id?: string | null;
          department_name?: string | null;
          occurrence_count?: number;
          seasonal_timing?: string | null;
          title?: string;
          recommended_action?: string;
          justification?: string;
          historical_issue_ids?: string[];
          status?: "NEW" | "UNDER_REVIEW" | "ACKNOWLEDGED" | "ACTIONED" | "DISMISSED";
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          review_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "preventive_recommendations_pattern_id_fkey";
            columns: ["pattern_id"];
            isOneToOne: false;
            referencedRelation: "simple_issue_recurrence_patterns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "preventive_recommendations_department_id_fkey";
            columns: ["department_id"];
            isOneToOne: false;
            referencedRelation: "departments";
            referencedColumns: ["id"];
          },
        ];
      };
      complex_solution_reuse_reviews: {
        Row: {
          id: string;
          challenge_id: string;
          solution_kb_id: string;
          decision: "REUSE" | "ADAPT" | "NEW_RESEARCH";
          match_scores: Json;
          review_notes: string;
          decision_by: string;
          decided_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          challenge_id: string;
          solution_kb_id: string;
          decision: "REUSE" | "ADAPT" | "NEW_RESEARCH";
          match_scores?: Json;
          review_notes: string;
          decision_by: string;
          decided_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          challenge_id?: string;
          solution_kb_id?: string;
          decision?: "REUSE" | "ADAPT" | "NEW_RESEARCH";
          match_scores?: Json;
          review_notes?: string;
          decision_by?: string;
          decided_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "complex_solution_reuse_reviews_challenge_id_fkey";
            columns: ["challenge_id"];
            isOneToOne: false;
            referencedRelation: "innovation_challenges";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "complex_solution_reuse_reviews_solution_kb_id_fkey";
            columns: ["solution_kb_id"];
            isOneToOne: false;
            referencedRelation: "complex_solution_knowledge_base";
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
      role_code: "CITIZEN" | "MUNICIPAL_OFFICER" | "DEPARTMENT_MANAGER" | "FIELD_WORKER" | "ADMIN" | "INNOVATION_MANAGER" | "INSTITUTION" | "INDUSTRY_PARTNER";
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

export type InstitutionMatchRunRow = Database["public"]["Tables"]["institution_match_runs"]["Row"];
export type InstitutionMatchRunInsert = Database["public"]["Tables"]["institution_match_runs"]["Insert"];
export type InstitutionMatchRunUpdate = Database["public"]["Tables"]["institution_match_runs"]["Update"];

export type InstitutionMatchRow = Database["public"]["Tables"]["institution_matches"]["Row"];
export type InstitutionMatchInsert = Database["public"]["Tables"]["institution_matches"]["Insert"];
export type InstitutionMatchUpdate = Database["public"]["Tables"]["institution_matches"]["Update"];

export type ChallengeInstitutionSelectionRow = Database["public"]["Tables"]["challenge_institution_selections"]["Row"];
export type ChallengeInstitutionSelectionInsert = Database["public"]["Tables"]["challenge_institution_selections"]["Insert"];
export type ChallengeInstitutionSelectionUpdate = Database["public"]["Tables"]["challenge_institution_selections"]["Update"];

export type InstitutionInvitationRow = Database["public"]["Tables"]["institution_invitations"]["Row"];
export type InstitutionInvitationInsert = Database["public"]["Tables"]["institution_invitations"]["Insert"];
export type InstitutionInvitationUpdate = Database["public"]["Tables"]["institution_invitations"]["Update"];
export type InvitationStatus = InstitutionInvitationRow["status"];

export interface MatchDimensionScores {
  research_domains: number;
  technical_expertise: number;
  technologies: number;
  facilities_and_labs: number;
  previous_projects: number;
  research_requirements: number;
  field_capabilities: number;
  multidisciplinary_fit: number;
  geographic_scope: number;
  collaboration_readiness: number;
}

export type MatchConfidence = "HIGH" | "MEDIUM" | "LOW";

export type ChallengeProjectRow = Database["public"]["Tables"]["challenge_projects"]["Row"];
export type ChallengeProjectInsert = Database["public"]["Tables"]["challenge_projects"]["Insert"];
export type ChallengeProjectUpdate = Database["public"]["Tables"]["challenge_projects"]["Update"];
export type ProjectWorkspaceStatus = ChallengeProjectRow["status"];

export type ChallengeProjectMemberRow = Database["public"]["Tables"]["challenge_project_members"]["Row"];
export type ChallengeProjectMemberInsert = Database["public"]["Tables"]["challenge_project_members"]["Insert"];
export type ChallengeProjectMemberUpdate = Database["public"]["Tables"]["challenge_project_members"]["Update"];
export type ProjectMemberRole = ChallengeProjectMemberRow["role"];
export type ProjectMemberType = NonNullable<ChallengeProjectMemberRow["member_type"]>;

export type ChallengeProjectActivityRow = Database["public"]["Tables"]["challenge_project_activity"]["Row"];
export type ChallengeProjectActivityInsert = Database["public"]["Tables"]["challenge_project_activity"]["Insert"];
export type ChallengeProjectActivityUpdate = Database["public"]["Tables"]["challenge_project_activity"]["Update"];
export type ProjectActivityType = ChallengeProjectActivityRow["activity_type"];

export type ResearchProposalRow = Database["public"]["Tables"]["research_proposals"]["Row"];
export type ResearchProposalInsert = Database["public"]["Tables"]["research_proposals"]["Insert"];
export type ResearchProposalUpdate = Database["public"]["Tables"]["research_proposals"]["Update"];
export type ProposalStatus = ResearchProposalRow["status"];

export interface ProposalMilestone {
  id: string;
  name: string;
  description: string;
  expected_completion: string;
  deliverables: string;
  [key: string]: Json | undefined;
}

export interface ProposalDeliverable {
  id: string;
  title: string;
  description: string;
  format: string;
  [key: string]: Json | undefined;
}

export interface ProposalRisk {
  id: string;
  risk: string;
  impact: "LOW" | "MEDIUM" | "HIGH";
  mitigation: string;
  [key: string]: Json | undefined;
}

export interface ProposalMetric {
  id: string;
  metric: string;
  target: string;
  measurement_method: string;
  [key: string]: Json | undefined;
}

export interface ProposalResource {
  id: string;
  category: string;
  description: string;
  critical: boolean;
  [key: string]: Json | undefined;
}

export type ResearchMilestoneStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "BLOCKED"
  | "DELAYED"
  | "CANCELLED";

export type ResearchStage =
  | "RESEARCH_STARTED"
  | "PROTOTYPE_DEVELOPMENT"
  | "PROTOTYPE_COMPLETED"
  | "TESTING"
  | "PILOT_READY"
  | "PILOT_ACTIVE"
  | "VALIDATION"
  | "DEPLOYMENT_READY"
  | "DEPLOYMENT_ACTIVE"
  | "IMPACT_MONITORING"
  | "COMPLETED";

export type EvidenceType =
  | "REPORT"
  | "CODE_REPO"
  | "DATASET"
  | "IMAGE"
  | "VIDEO"
  | "DASHBOARD"
  | "PUBLICATION"
  | "PROTOTYPE_DOC"
  | "OTHER";

export type BlockerSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type BlockerStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED";

export type SupportCategory =
  | "HARDWARE"
  | "DATA_ACCESS"
  | "TESTBED"
  | "REGULATORY"
  | "FINANCIAL"
  | "TECHNICAL_ADVISORY"
  | "OTHER";

export type ResearchProjectMilestoneRow = Database["public"]["Tables"]["research_project_milestones"]["Row"];
export type ResearchProjectMilestoneInsert = Database["public"]["Tables"]["research_project_milestones"]["Insert"];
export type ResearchProjectMilestoneUpdate = Database["public"]["Tables"]["research_project_milestones"]["Update"];

export type ResearchProgressUpdateRow = Database["public"]["Tables"]["research_progress_updates"]["Row"];
export type ResearchProgressUpdateInsert = Database["public"]["Tables"]["research_progress_updates"]["Insert"];
export type ResearchProgressUpdateUpdate = Database["public"]["Tables"]["research_progress_updates"]["Update"];

export type ResearchEvidenceRow = Database["public"]["Tables"]["research_evidence"]["Row"];
export type ResearchEvidenceInsert = Database["public"]["Tables"]["research_evidence"]["Insert"];
export type ResearchEvidenceUpdate = Database["public"]["Tables"]["research_evidence"]["Update"];

export type ResearchBlockerRiskRow = Database["public"]["Tables"]["research_blockers_risks"]["Row"];
export type ResearchBlockerRiskInsert = Database["public"]["Tables"]["research_blockers_risks"]["Insert"];
export type ResearchBlockerRiskUpdate = Database["public"]["Tables"]["research_blockers_risks"]["Update"];

export type OrganizationType = "COMPANY" | "STARTUP" | "RND_LAB" | "FOUNDATION" | "CIVIC_TECH" | "OTHER";
export type VerificationStatus = "PENDING" | "VERIFIED" | "REJECTED" | "SUSPENDED";
export type SupportRequestCategory = "FUNDING" | "HARDWARE" | "TECHNOLOGY" | "EXPERTISE" | "INFRASTRUCTURE" | "DATA" | "MANUFACTURING";
export type SupportRequestPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type SupportConfidentiality = "PUBLIC" | "RESTRICTED" | "INTERNAL";
export type SupportRequestStatus = "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "PUBLISHED" | "IN_PROGRESS" | "FULFILLED" | "REJECTED" | "CANCELLED" | "CLOSED";
export type ListingStatus = "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "OPEN" | "PAUSED" | "FULFILLED" | "CLOSED" | "CANCELLED";
export type ApplicationStatus = "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "SHORTLISTED" | "ACCEPTED" | "REJECTED" | "WITHDRAWN";
export type SupportAccessScope = "SUPPORT_SPECIFIC";
export type PartnerParticipationStatus = "ACTIVE" | "COMPLETED" | "WITHDRAWN" | "TERMINATED";

export type IndustryOrganizationRow = Database["public"]["Tables"]["industry_organizations"]["Row"];
export type IndustryOrganizationInsert = Database["public"]["Tables"]["industry_organizations"]["Insert"];
export type IndustryOrganizationUpdate = Database["public"]["Tables"]["industry_organizations"]["Update"];

export type ResearchSupportRequestRow = Database["public"]["Tables"]["research_support_requests"]["Row"];
export type ResearchSupportRequestInsert = Database["public"]["Tables"]["research_support_requests"]["Insert"];
export type ResearchSupportRequestUpdate = Database["public"]["Tables"]["research_support_requests"]["Update"];

export type ResearchSupportListingRow = Database["public"]["Tables"]["research_support_listings"]["Row"];
export type ResearchSupportListingInsert = Database["public"]["Tables"]["research_support_listings"]["Insert"];
export type ResearchSupportListingUpdate = Database["public"]["Tables"]["research_support_listings"]["Update"];

export type ResearchSupportApplicationRow = Database["public"]["Tables"]["research_support_applications"]["Row"];
export type ResearchSupportApplicationInsert = Database["public"]["Tables"]["research_support_applications"]["Insert"];
export type ResearchSupportApplicationUpdate = Database["public"]["Tables"]["research_support_applications"]["Update"];

export type ProjectSupportPartnerRow = Database["public"]["Tables"]["project_support_partners"]["Row"];
export type ProjectSupportPartnerInsert = Database["public"]["Tables"]["project_support_partners"]["Insert"];
export type ProjectSupportPartnerUpdate = Database["public"]["Tables"]["project_support_partners"]["Update"];

export type PilotPlanStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "REQUESTED_REVISION"
  | "RESUBMITTED"
  | "APPROVED"
  | "REJECTED";

export type PilotEnvironmentType =
  | "LAB"
  | "CAMPUS"
  | "FIELD_SITE"
  | "AGRICULTURAL_SITE"
  | "PARTNER_SITE"
  | "INDUSTRIAL_SITE"
  | "COMMUNITY_SITE"
  | "PUBLIC_ENVIRONMENT"
  | "DIGITAL_ENVIRONMENT"
  | "SIMULATION"
  | "OTHER";

export interface PilotKPI {
  id: string;
  name: string;
  description: string;
  measurement_method: string;
  baseline_value: string;
  target_value: string;
  unit: string;
}

export interface PilotRisk {
  id: string;
  risk: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  mitigation: string;
}

export type PilotPlanRow = Database["public"]["Tables"]["pilot_plans"]["Row"];
export type PilotPlanInsert = Database["public"]["Tables"]["pilot_plans"]["Insert"];
export type PilotPlanUpdate = Database["public"]["Tables"]["pilot_plans"]["Update"];

export type PilotPlanRevisionRow = Database["public"]["Tables"]["pilot_plan_revisions"]["Row"];
export type PilotPlanRevisionInsert = Database["public"]["Tables"]["pilot_plan_revisions"]["Insert"];
export type PilotPlanRevisionUpdate = Database["public"]["Tables"]["pilot_plan_revisions"]["Update"];

export type PilotValidationStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "REQUESTED_REVISION"
  | "RESUBMITTED"
  | "APPROVED"
  | "REJECTED";

export type PilotValidationOutcome =
  | "MEETS_SUCCESS_CRITERIA"
  | "PARTIALLY_MEETS_SUCCESS_CRITERIA"
  | "DOES_NOT_MEET_SUCCESS_CRITERIA"
  | "INCONCLUSIVE";

export type PilotKPIAchievementStatus =
  | "ACHIEVED"
  | "PARTIALLY_ACHIEVED"
  | "NOT_ACHIEVED"
  | "INCONCLUSIVE";

export interface PilotDeviationItem {
  id: string;
  deviation: string;
  reason: string;
  impact: string;
  mitigation: string;
}

export type PilotValidationResultRow = Database["public"]["Tables"]["pilot_validation_results"]["Row"];
export type PilotValidationResultInsert = Database["public"]["Tables"]["pilot_validation_results"]["Insert"];
export type PilotValidationResultUpdate = Database["public"]["Tables"]["pilot_validation_results"]["Update"];

export type PilotValidationKPIResultRow = Database["public"]["Tables"]["pilot_validation_kpi_results"]["Row"];
export type PilotValidationKPIResultInsert = Database["public"]["Tables"]["pilot_validation_kpi_results"]["Insert"];
export type PilotValidationKPIResultUpdate = Database["public"]["Tables"]["pilot_validation_kpi_results"]["Update"];

export type PilotValidationRevisionRow = Database["public"]["Tables"]["pilot_validation_revisions"]["Row"];
export type PilotValidationRevisionInsert = Database["public"]["Tables"]["pilot_validation_revisions"]["Insert"];
export type PilotValidationRevisionUpdate = Database["public"]["Tables"]["pilot_validation_revisions"]["Update"];

export type DeploymentPlanStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "REQUESTED_REVISION"
  | "RESUBMITTED"
  | "APPROVED"
  | "REJECTED";

export type DeploymentDecision =
  | "PENDING_REVIEW"
  | "APPROVED_FOR_SCALE_UP"
  | "REQUESTED_REVISION"
  | "NOT_READY"
  | "REJECTED";

export type ImpactMetricStatus =
  | "PENDING"
  | "ON_TRACK"
  | "SURPASSED"
  | "BELOW_TARGET"
  | "INCONCLUSIVE";

export interface DeploymentPhaseItem {
  id: string;
  phase_name: string;
  target_timeline: string;
  description: string;
  key_milestones: string;
}

export type DeploymentPlanRow = Database["public"]["Tables"]["deployment_plans"]["Row"];
export type DeploymentPlanInsert = Database["public"]["Tables"]["deployment_plans"]["Insert"];
export type DeploymentPlanUpdate = Database["public"]["Tables"]["deployment_plans"]["Update"];

export type DeploymentImpactMetricRow = Database["public"]["Tables"]["deployment_impact_metrics"]["Row"];
export type DeploymentImpactMetricInsert = Database["public"]["Tables"]["deployment_impact_metrics"]["Insert"];
export type DeploymentImpactMetricUpdate = Database["public"]["Tables"]["deployment_impact_metrics"]["Update"];

export type DeploymentImpactReportRow = Database["public"]["Tables"]["deployment_impact_reports"]["Row"];
export type DeploymentImpactReportInsert = Database["public"]["Tables"]["deployment_impact_reports"]["Insert"];
export type DeploymentImpactReportUpdate = Database["public"]["Tables"]["deployment_impact_reports"]["Update"];

export type DeploymentPlanRevisionRow = Database["public"]["Tables"]["deployment_plan_revisions"]["Row"];
export type DeploymentPlanRevisionInsert = Database["public"]["Tables"]["deployment_plan_revisions"]["Insert"];
export type DeploymentPlanRevisionUpdate = Database["public"]["Tables"]["deployment_plan_revisions"]["Update"];

export type SimpleSolutionKnowledgeBaseRow = Database["public"]["Tables"]["simple_solution_knowledge_base"]["Row"];
export type SimpleSolutionKnowledgeBaseInsert = Database["public"]["Tables"]["simple_solution_knowledge_base"]["Insert"];
export type SimpleSolutionKnowledgeBaseUpdate = Database["public"]["Tables"]["simple_solution_knowledge_base"]["Update"];

export type ComplexSolutionKnowledgeBaseRow = Database["public"]["Tables"]["complex_solution_knowledge_base"]["Row"];
export type ComplexSolutionKnowledgeBaseInsert = Database["public"]["Tables"]["complex_solution_knowledge_base"]["Insert"];
export type ComplexSolutionKnowledgeBaseUpdate = Database["public"]["Tables"]["complex_solution_knowledge_base"]["Update"];
export type ComplexSolutionReusabilityStatus = ComplexSolutionKnowledgeBaseRow["reusability_status"];

export type SimpleIssueRecurrencePatternRow = Database["public"]["Tables"]["simple_issue_recurrence_patterns"]["Row"];
export type SimpleIssueRecurrencePatternInsert = Database["public"]["Tables"]["simple_issue_recurrence_patterns"]["Insert"];
export type SimpleIssueRecurrencePatternUpdate = Database["public"]["Tables"]["simple_issue_recurrence_patterns"]["Update"];

export type PreventiveRecommendationRow = Database["public"]["Tables"]["preventive_recommendations"]["Row"];
export type PreventiveRecommendationInsert = Database["public"]["Tables"]["preventive_recommendations"]["Insert"];
export type PreventiveRecommendationUpdate = Database["public"]["Tables"]["preventive_recommendations"]["Update"];
export type PreventiveRecommendationStatus = PreventiveRecommendationRow["status"];

export type ComplexSolutionReuseReviewRow = Database["public"]["Tables"]["complex_solution_reuse_reviews"]["Row"];
export type ComplexSolutionReuseReviewInsert = Database["public"]["Tables"]["complex_solution_reuse_reviews"]["Insert"];
export type ComplexSolutionReuseReviewUpdate = Database["public"]["Tables"]["complex_solution_reuse_reviews"]["Update"];
export type ComplexSolutionReuseDecision = ComplexSolutionReuseReviewRow["decision"];

export interface SolutionMatchScorecard {
  semantic_relevance: "HIGH" | "MEDIUM" | "LOW";
  root_cause_compatibility: "HIGH" | "MEDIUM" | "LOW";
  technology_compatibility: "HIGH" | "MEDIUM" | "LOW";
  deployment_compatibility: "HIGH" | "MEDIUM" | "LOW";
  overall_applicability: "HIGH" | "MEDIUM" | "LOW";
  key_strengths: string[];
  known_limitations: string[];
  adaptation_requirements: string[];
  reasoning: string;
}

export interface SolutionMatchResult {
  solution: ComplexSolutionKnowledgeBaseRow;
  scorecard: SolutionMatchScorecard;
}
