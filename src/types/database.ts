export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      ai_generations: {
        Row: {
          created_at: string;
          duration_ms: number | null;
          error_code: string | null;
          estimated_cost_cents: number | null;
          id: string;
          input_tokens: number | null;
          interview_id: string | null;
          model: string;
          output_tokens: number | null;
          prompt_version_id: string | null;
          provider: string;
          status: Database["public"]["Enums"]["ai_generation_status"];
          task: string;
          usage_event_id: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          duration_ms?: number | null;
          error_code?: string | null;
          estimated_cost_cents?: number | null;
          id?: string;
          input_tokens?: number | null;
          interview_id?: string | null;
          model: string;
          output_tokens?: number | null;
          prompt_version_id?: string | null;
          provider: string;
          status: Database["public"]["Enums"]["ai_generation_status"];
          task: string;
          usage_event_id?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          duration_ms?: number | null;
          error_code?: string | null;
          estimated_cost_cents?: number | null;
          id?: string;
          input_tokens?: number | null;
          interview_id?: string | null;
          model?: string;
          output_tokens?: number | null;
          prompt_version_id?: string | null;
          provider?: string;
          status?: Database["public"]["Enums"]["ai_generation_status"];
          task?: string;
          usage_event_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_generations_interview_id_fkey";
            columns: ["interview_id"];
            isOneToOne: false;
            referencedRelation: "interviews";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_generations_prompt_version_id_fkey";
            columns: ["prompt_version_id"];
            isOneToOne: false;
            referencedRelation: "prompt_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_generations_usage_event_id_fkey";
            columns: ["usage_event_id"];
            isOneToOne: false;
            referencedRelation: "usage_events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_generations_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      answers: {
        Row: {
          created_at: string;
          feedback_status: Database["public"]["Enums"]["answer_feedback_status"];
          id: string;
          question_id: string | null;
          session_id: string | null;
          text: string;
          turn_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          feedback_status?: Database["public"]["Enums"]["answer_feedback_status"];
          id?: string;
          question_id?: string | null;
          session_id?: string | null;
          text: string;
          turn_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          feedback_status?: Database["public"]["Enums"]["answer_feedback_status"];
          id?: string;
          question_id?: string | null;
          session_id?: string | null;
          text?: string;
          turn_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "answers_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "questions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "answers_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "practice_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "answers_turn_id_fkey";
            columns: ["turn_id"];
            isOneToOne: false;
            referencedRelation: "practice_turns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "answers_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          action: string;
          actor: Database["public"]["Enums"]["audit_actor"];
          created_at: string;
          id: string;
          metadata: Json;
          resource_id: string | null;
          resource_type: string | null;
          user_id: string | null;
        };
        Insert: {
          action: string;
          actor?: Database["public"]["Enums"]["audit_actor"];
          created_at?: string;
          id?: string;
          metadata?: Json;
          resource_id?: string | null;
          resource_type?: string | null;
          user_id?: string | null;
        };
        Update: {
          action?: string;
          actor?: Database["public"]["Enums"]["audit_actor"];
          created_at?: string;
          id?: string;
          metadata?: Json;
          resource_id?: string | null;
          resource_type?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      brief_section_sources: {
        Row: {
          created_at: string;
          id: string;
          interview_source_id: string | null;
          saved_source_id: string | null;
          section_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          interview_source_id?: string | null;
          saved_source_id?: string | null;
          section_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          interview_source_id?: string | null;
          saved_source_id?: string | null;
          section_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "brief_section_sources_interview_source_id_fkey";
            columns: ["interview_source_id"];
            isOneToOne: false;
            referencedRelation: "interview_sources";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "brief_section_sources_saved_source_id_fkey";
            columns: ["saved_source_id"];
            isOneToOne: false;
            referencedRelation: "saved_sources";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "brief_section_sources_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "brief_sections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "brief_section_sources_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      brief_sections: {
        Row: {
          ai_generation_id: string | null;
          brief_id: string;
          completed_at: string | null;
          content: Json | null;
          created_at: string;
          generated_at: string | null;
          id: string;
          section_key: Database["public"]["Enums"]["brief_section_key"];
          sort_order: number;
          status: Database["public"]["Enums"]["brief_section_status"];
          updated_at: string;
          user_id: string;
          user_notes: string | null;
        };
        Insert: {
          ai_generation_id?: string | null;
          brief_id: string;
          completed_at?: string | null;
          content?: Json | null;
          created_at?: string;
          generated_at?: string | null;
          id?: string;
          section_key: Database["public"]["Enums"]["brief_section_key"];
          sort_order?: number;
          status?: Database["public"]["Enums"]["brief_section_status"];
          updated_at?: string;
          user_id: string;
          user_notes?: string | null;
        };
        Update: {
          ai_generation_id?: string | null;
          brief_id?: string;
          completed_at?: string | null;
          content?: Json | null;
          created_at?: string;
          generated_at?: string | null;
          id?: string;
          section_key?: Database["public"]["Enums"]["brief_section_key"];
          sort_order?: number;
          status?: Database["public"]["Enums"]["brief_section_status"];
          updated_at?: string;
          user_id?: string;
          user_notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "brief_sections_ai_generation_id_fkey";
            columns: ["ai_generation_id"];
            isOneToOne: false;
            referencedRelation: "ai_generations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "brief_sections_brief_id_fkey";
            columns: ["brief_id"];
            isOneToOne: false;
            referencedRelation: "peel_briefs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "brief_sections_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      candidate_documents: {
        Row: {
          created_at: string;
          extracted_text: string | null;
          extraction_status: Database["public"]["Enums"]["document_extraction_status"];
          id: string;
          kind: Database["public"]["Enums"]["candidate_document_kind"];
          mime_type: string;
          organization_id: string | null;
          size_bytes: number;
          storage_path: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          extracted_text?: string | null;
          extraction_status?: Database["public"]["Enums"]["document_extraction_status"];
          id?: string;
          kind?: Database["public"]["Enums"]["candidate_document_kind"];
          mime_type: string;
          organization_id?: string | null;
          size_bytes: number;
          storage_path: string;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          extracted_text?: string | null;
          extraction_status?: Database["public"]["Enums"]["document_extraction_status"];
          id?: string;
          kind?: Database["public"]["Enums"]["candidate_document_kind"];
          mime_type?: string;
          organization_id?: string | null;
          size_bytes?: number;
          storage_path?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "candidate_documents_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "candidate_documents_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      checklist_items: {
        Row: {
          checklist_id: string;
          completed_at: string | null;
          created_at: string;
          detail: string | null;
          id: string;
          label: string;
          sort_order: number;
          source: Database["public"]["Enums"]["checklist_item_source"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          checklist_id: string;
          completed_at?: string | null;
          created_at?: string;
          detail?: string | null;
          id?: string;
          label: string;
          sort_order?: number;
          source?: Database["public"]["Enums"]["checklist_item_source"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          checklist_id?: string;
          completed_at?: string | null;
          created_at?: string;
          detail?: string | null;
          id?: string;
          label?: string;
          sort_order?: number;
          source?: Database["public"]["Enums"]["checklist_item_source"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "checklist_items_checklist_id_fkey";
            columns: ["checklist_id"];
            isOneToOne: false;
            referencedRelation: "checklists";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "checklist_items_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      checklists: {
        Row: {
          created_at: string;
          id: string;
          interview_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          interview_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          interview_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "checklists_interview_id_fkey";
            columns: ["interview_id"];
            isOneToOne: true;
            referencedRelation: "interviews";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "checklists_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      feedback: {
        Row: {
          ai_generation_id: string | null;
          answer_id: string;
          created_at: string;
          example_answer: string | null;
          id: string;
          improved_outline: string | null;
          missing: string | null;
          rubric: Json;
          top_improvement: string;
          unclear: string | null;
          user_id: string;
          worked_well: string | null;
        };
        Insert: {
          ai_generation_id?: string | null;
          answer_id: string;
          created_at?: string;
          example_answer?: string | null;
          id?: string;
          improved_outline?: string | null;
          missing?: string | null;
          rubric: Json;
          top_improvement: string;
          unclear?: string | null;
          user_id: string;
          worked_well?: string | null;
        };
        Update: {
          ai_generation_id?: string | null;
          answer_id?: string;
          created_at?: string;
          example_answer?: string | null;
          id?: string;
          improved_outline?: string | null;
          missing?: string | null;
          rubric?: Json;
          top_improvement?: string;
          unclear?: string | null;
          user_id?: string;
          worked_well?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "feedback_ai_generation_id_fkey";
            columns: ["ai_generation_id"];
            isOneToOne: false;
            referencedRelation: "ai_generations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "feedback_answer_id_fkey";
            columns: ["answer_id"];
            isOneToOne: true;
            referencedRelation: "answers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "feedback_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      generation_feedback: {
        Row: {
          comment: string | null;
          created_at: string;
          id: string;
          rating: Database["public"]["Enums"]["generation_feedback_rating"];
          target_id: string;
          target_type: Database["public"]["Enums"]["generation_feedback_target"];
          user_id: string;
        };
        Insert: {
          comment?: string | null;
          created_at?: string;
          id?: string;
          rating: Database["public"]["Enums"]["generation_feedback_rating"];
          target_id: string;
          target_type: Database["public"]["Enums"]["generation_feedback_target"];
          user_id: string;
        };
        Update: {
          comment?: string | null;
          created_at?: string;
          id?: string;
          rating?: Database["public"]["Enums"]["generation_feedback_rating"];
          target_id?: string;
          target_type?: Database["public"]["Enums"]["generation_feedback_target"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "generation_feedback_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      interview_documents: {
        Row: {
          created_at: string;
          document_id: string;
          id: string;
          interview_id: string;
          role: Database["public"]["Enums"]["interview_document_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          document_id: string;
          id?: string;
          interview_id: string;
          role?: Database["public"]["Enums"]["interview_document_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          document_id?: string;
          id?: string;
          interview_id?: string;
          role?: Database["public"]["Enums"]["interview_document_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "interview_documents_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "candidate_documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "interview_documents_interview_id_fkey";
            columns: ["interview_id"];
            isOneToOne: false;
            referencedRelation: "interviews";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "interview_documents_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      interview_sources: {
        Row: {
          content: string | null;
          created_at: string;
          document_id: string | null;
          id: string;
          interview_id: string;
          kind: Database["public"]["Enums"]["interview_source_kind"];
          origin: Database["public"]["Enums"]["interview_source_origin"];
          title: string;
          updated_at: string;
          url: string | null;
          user_id: string;
        };
        Insert: {
          content?: string | null;
          created_at?: string;
          document_id?: string | null;
          id?: string;
          interview_id: string;
          kind: Database["public"]["Enums"]["interview_source_kind"];
          origin?: Database["public"]["Enums"]["interview_source_origin"];
          title: string;
          updated_at?: string;
          url?: string | null;
          user_id: string;
        };
        Update: {
          content?: string | null;
          created_at?: string;
          document_id?: string | null;
          id?: string;
          interview_id?: string;
          kind?: Database["public"]["Enums"]["interview_source_kind"];
          origin?: Database["public"]["Enums"]["interview_source_origin"];
          title?: string;
          updated_at?: string;
          url?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "interview_sources_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "candidate_documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "interview_sources_interview_id_fkey";
            columns: ["interview_id"];
            isOneToOne: false;
            referencedRelation: "interviews";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "interview_sources_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      interviewers: {
        Row: {
          created_at: string;
          id: string;
          interview_id: string;
          manual_background: string | null;
          name: string;
          public_profile_url: string | null;
          sort_order: number;
          title: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          interview_id: string;
          manual_background?: string | null;
          name: string;
          public_profile_url?: string | null;
          sort_order?: number;
          title?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          interview_id?: string;
          manual_background?: string | null;
          name?: string;
          public_profile_url?: string | null;
          sort_order?: number;
          title?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "interviewers_interview_id_fkey";
            columns: ["interview_id"];
            isOneToOne: false;
            referencedRelation: "interviews";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "interviewers_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      interviews: {
        Row: {
          company_name: string;
          confirmed_at: string | null;
          created_at: string;
          duration_minutes: number | null;
          employment_type:
            Database["public"]["Enums"]["employment_type"] | null;
          format: Database["public"]["Enums"]["interview_format"] | null;
          id: string;
          intake_step: number;
          interview_at: string | null;
          interview_timezone: string | null;
          job_description: string | null;
          job_posting_url: string | null;
          location: string | null;
          meeting_location: string | null;
          notes: string | null;
          organization_id: string | null;
          portfolio_url: string | null;
          position_title: string;
          stage: Database["public"]["Enums"]["interview_stage"] | null;
          status: Database["public"]["Enums"]["interview_status"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          company_name?: string;
          confirmed_at?: string | null;
          created_at?: string;
          duration_minutes?: number | null;
          employment_type?:
            Database["public"]["Enums"]["employment_type"] | null;
          format?: Database["public"]["Enums"]["interview_format"] | null;
          id?: string;
          intake_step?: number;
          interview_at?: string | null;
          interview_timezone?: string | null;
          job_description?: string | null;
          job_posting_url?: string | null;
          location?: string | null;
          meeting_location?: string | null;
          notes?: string | null;
          organization_id?: string | null;
          portfolio_url?: string | null;
          position_title?: string;
          stage?: Database["public"]["Enums"]["interview_stage"] | null;
          status?: Database["public"]["Enums"]["interview_status"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          company_name?: string;
          confirmed_at?: string | null;
          created_at?: string;
          duration_minutes?: number | null;
          employment_type?:
            Database["public"]["Enums"]["employment_type"] | null;
          format?: Database["public"]["Enums"]["interview_format"] | null;
          id?: string;
          intake_step?: number;
          interview_at?: string | null;
          interview_timezone?: string | null;
          job_description?: string | null;
          job_posting_url?: string | null;
          location?: string | null;
          meeting_location?: string | null;
          notes?: string | null;
          organization_id?: string | null;
          portfolio_url?: string | null;
          position_title?: string;
          stage?: Database["public"]["Enums"]["interview_stage"] | null;
          status?: Database["public"]["Enums"]["interview_status"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "interviews_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "interviews_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      organization_members: {
        Row: {
          created_at: string;
          id: string;
          member_role: Database["public"]["Enums"]["org_member_role"];
          organization_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          member_role?: Database["public"]["Enums"]["org_member_role"];
          organization_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          member_role?: Database["public"]["Enums"]["org_member_role"];
          organization_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "organization_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      organizations: {
        Row: {
          created_at: string;
          id: string;
          kind: Database["public"]["Enums"]["organization_kind"];
          name: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["organization_kind"];
          name: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["organization_kind"];
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      outcomes: {
        Row: {
          advanced: boolean | null;
          completed_on: string | null;
          confidence: number | null;
          created_at: string;
          difficulty: number | null;
          id: string;
          interview_id: string;
          lessons: string | null;
          private_notes: string | null;
          questions_encountered: string | null;
          received_offer: boolean | null;
          research_optin_snapshot: boolean;
          updated_at: string;
          user_id: string;
          went_poorly: string | null;
          went_well: string | null;
        };
        Insert: {
          advanced?: boolean | null;
          completed_on?: string | null;
          confidence?: number | null;
          created_at?: string;
          difficulty?: number | null;
          id?: string;
          interview_id: string;
          lessons?: string | null;
          private_notes?: string | null;
          questions_encountered?: string | null;
          received_offer?: boolean | null;
          research_optin_snapshot?: boolean;
          updated_at?: string;
          user_id: string;
          went_poorly?: string | null;
          went_well?: string | null;
        };
        Update: {
          advanced?: boolean | null;
          completed_on?: string | null;
          confidence?: number | null;
          created_at?: string;
          difficulty?: number | null;
          id?: string;
          interview_id?: string;
          lessons?: string | null;
          private_notes?: string | null;
          questions_encountered?: string | null;
          received_offer?: boolean | null;
          research_optin_snapshot?: boolean;
          updated_at?: string;
          user_id?: string;
          went_poorly?: string | null;
          went_well?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "outcomes_interview_id_fkey";
            columns: ["interview_id"];
            isOneToOne: true;
            referencedRelation: "interviews";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "outcomes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      peel_briefs: {
        Row: {
          created_at: string;
          depth: Database["public"]["Enums"]["brief_depth"];
          generated_at: string | null;
          id: string;
          inputs_fingerprint: string | null;
          interview_id: string;
          status: Database["public"]["Enums"]["brief_status"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          depth?: Database["public"]["Enums"]["brief_depth"];
          generated_at?: string | null;
          id?: string;
          inputs_fingerprint?: string | null;
          interview_id: string;
          status?: Database["public"]["Enums"]["brief_status"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          depth?: Database["public"]["Enums"]["brief_depth"];
          generated_at?: string | null;
          id?: string;
          inputs_fingerprint?: string | null;
          interview_id?: string;
          status?: Database["public"]["Enums"]["brief_status"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "peel_briefs_interview_id_fkey";
            columns: ["interview_id"];
            isOneToOne: true;
            referencedRelation: "interviews";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "peel_briefs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      plans: {
        Row: {
          created_at: string;
          description: string | null;
          is_active: boolean;
          key: string;
          name: string;
          price_cents_monthly: number;
          stripe_price_id_monthly: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          is_active?: boolean;
          key: string;
          name: string;
          price_cents_monthly: number;
          stripe_price_id_monthly?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          is_active?: boolean;
          key?: string;
          name?: string;
          price_cents_monthly?: number;
          stripe_price_id_monthly?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      practice_sessions: {
        Row: {
          completed_at: string | null;
          config: Json;
          created_at: string;
          id: string;
          interview_id: string;
          modality: Database["public"]["Enums"]["practice_modality"];
          started_at: string;
          status: Database["public"]["Enums"]["practice_session_status"];
          summary_feedback: Json | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          config?: Json;
          created_at?: string;
          id?: string;
          interview_id: string;
          modality?: Database["public"]["Enums"]["practice_modality"];
          started_at?: string;
          status?: Database["public"]["Enums"]["practice_session_status"];
          summary_feedback?: Json | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          config?: Json;
          created_at?: string;
          id?: string;
          interview_id?: string;
          modality?: Database["public"]["Enums"]["practice_modality"];
          started_at?: string;
          status?: Database["public"]["Enums"]["practice_session_status"];
          summary_feedback?: Json | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "practice_sessions_interview_id_fkey";
            columns: ["interview_id"];
            isOneToOne: false;
            referencedRelation: "interviews";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "practice_sessions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      practice_turns: {
        Row: {
          ai_generation_id: string | null;
          content: string;
          created_at: string;
          id: string;
          media_path: string | null;
          question_id: string | null;
          role: Database["public"]["Enums"]["practice_turn_role"];
          session_id: string;
          turn_index: number;
          turn_type: Database["public"]["Enums"]["practice_turn_type"];
          user_id: string;
        };
        Insert: {
          ai_generation_id?: string | null;
          content: string;
          created_at?: string;
          id?: string;
          media_path?: string | null;
          question_id?: string | null;
          role: Database["public"]["Enums"]["practice_turn_role"];
          session_id: string;
          turn_index: number;
          turn_type: Database["public"]["Enums"]["practice_turn_type"];
          user_id: string;
        };
        Update: {
          ai_generation_id?: string | null;
          content?: string;
          created_at?: string;
          id?: string;
          media_path?: string | null;
          question_id?: string | null;
          role?: Database["public"]["Enums"]["practice_turn_role"];
          session_id?: string;
          turn_index?: number;
          turn_type?: Database["public"]["Enums"]["practice_turn_type"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "practice_turns_ai_generation_id_fkey";
            columns: ["ai_generation_id"];
            isOneToOne: false;
            referencedRelation: "ai_generations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "practice_turns_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "questions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "practice_turns_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "practice_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "practice_turns_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          default_resume_id: string | null;
          full_name: string | null;
          headline: string | null;
          id: string;
          onboarding_completed_at: string | null;
          role: Database["public"]["Enums"]["user_role"];
          timezone: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          default_resume_id?: string | null;
          full_name?: string | null;
          headline?: string | null;
          id: string;
          onboarding_completed_at?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          default_resume_id?: string | null;
          full_name?: string | null;
          headline?: string | null;
          id?: string;
          onboarding_completed_at?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_default_resume_id_fkey";
            columns: ["default_resume_id"];
            isOneToOne: false;
            referencedRelation: "candidate_documents";
            referencedColumns: ["id"];
          },
        ];
      };
      prompt_versions: {
        Row: {
          content_hash: string;
          created_at: string;
          id: string;
          task: string;
          version: string;
        };
        Insert: {
          content_hash: string;
          created_at?: string;
          id?: string;
          task: string;
          version: string;
        };
        Update: {
          content_hash?: string;
          created_at?: string;
          id?: string;
          task?: string;
          version?: string;
        };
        Relationships: [];
      };
      question_story_links: {
        Row: {
          created_at: string;
          id: string;
          question_id: string;
          source: Database["public"]["Enums"]["question_story_source"];
          story_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          question_id: string;
          source?: Database["public"]["Enums"]["question_story_source"];
          story_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          question_id?: string;
          source?: Database["public"]["Enums"]["question_story_source"];
          story_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "question_story_links_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "questions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "question_story_links_story_id_fkey";
            columns: ["story_id"];
            isOneToOne: false;
            referencedRelation: "stories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "question_story_links_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      questions: {
        Row: {
          ai_generation_id: string | null;
          category: Database["public"]["Enums"]["question_category"];
          created_at: string;
          evaluates: string | null;
          id: string;
          interview_id: string;
          origin: Database["public"]["Enums"]["question_origin"];
          saved: boolean;
          sort_order: number;
          suggested_structure: string | null;
          text: string;
          updated_at: string;
          user_id: string;
          why_asked: string | null;
        };
        Insert: {
          ai_generation_id?: string | null;
          category: Database["public"]["Enums"]["question_category"];
          created_at?: string;
          evaluates?: string | null;
          id?: string;
          interview_id: string;
          origin?: Database["public"]["Enums"]["question_origin"];
          saved?: boolean;
          sort_order?: number;
          suggested_structure?: string | null;
          text: string;
          updated_at?: string;
          user_id: string;
          why_asked?: string | null;
        };
        Update: {
          ai_generation_id?: string | null;
          category?: Database["public"]["Enums"]["question_category"];
          created_at?: string;
          evaluates?: string | null;
          id?: string;
          interview_id?: string;
          origin?: Database["public"]["Enums"]["question_origin"];
          saved?: boolean;
          sort_order?: number;
          suggested_structure?: string | null;
          text?: string;
          updated_at?: string;
          user_id?: string;
          why_asked?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "questions_ai_generation_id_fkey";
            columns: ["ai_generation_id"];
            isOneToOne: false;
            referencedRelation: "ai_generations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "questions_interview_id_fkey";
            columns: ["interview_id"];
            isOneToOne: false;
            referencedRelation: "interviews";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "questions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      rate_limit_counters: {
        Row: {
          count: number;
          key: string;
          window_start: string;
        };
        Insert: {
          count?: number;
          key: string;
          window_start: string;
        };
        Update: {
          count?: number;
          key?: string;
          window_start?: string;
        };
        Relationships: [];
      };
      readiness_components: {
        Row: {
          component: Database["public"]["Enums"]["readiness_component_key"];
          created_at: string;
          explanation: string;
          id: string;
          raw_value: number;
          score_id: string;
          user_id: string;
          weighted_points: number;
        };
        Insert: {
          component: Database["public"]["Enums"]["readiness_component_key"];
          created_at?: string;
          explanation: string;
          id?: string;
          raw_value: number;
          score_id: string;
          user_id: string;
          weighted_points: number;
        };
        Update: {
          component?: Database["public"]["Enums"]["readiness_component_key"];
          created_at?: string;
          explanation?: string;
          id?: string;
          raw_value?: number;
          score_id?: string;
          user_id?: string;
          weighted_points?: number;
        };
        Relationships: [
          {
            foreignKeyName: "readiness_components_score_id_fkey";
            columns: ["score_id"];
            isOneToOne: false;
            referencedRelation: "readiness_scores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "readiness_components_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      readiness_scores: {
        Row: {
          ai_generation_id: string | null;
          computed_at: string;
          created_at: string;
          id: string;
          interview_id: string;
          recommended_action: string | null;
          score: number;
          trigger_event: string | null;
          user_id: string;
        };
        Insert: {
          ai_generation_id?: string | null;
          computed_at?: string;
          created_at?: string;
          id?: string;
          interview_id: string;
          recommended_action?: string | null;
          score: number;
          trigger_event?: string | null;
          user_id: string;
        };
        Update: {
          ai_generation_id?: string | null;
          computed_at?: string;
          created_at?: string;
          id?: string;
          interview_id?: string;
          recommended_action?: string | null;
          score?: number;
          trigger_event?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "readiness_scores_ai_generation_id_fkey";
            columns: ["ai_generation_id"];
            isOneToOne: false;
            referencedRelation: "ai_generations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "readiness_scores_interview_id_fkey";
            columns: ["interview_id"];
            isOneToOne: false;
            referencedRelation: "interviews";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "readiness_scores_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      saved_sources: {
        Row: {
          created_at: string;
          id: string;
          interview_id: string | null;
          published_at: string | null;
          publisher: string | null;
          snippet: string | null;
          title: string;
          url: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          interview_id?: string | null;
          published_at?: string | null;
          publisher?: string | null;
          snippet?: string | null;
          title: string;
          url?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          interview_id?: string | null;
          published_at?: string | null;
          publisher?: string | null;
          snippet?: string | null;
          title?: string;
          url?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "saved_sources_interview_id_fkey";
            columns: ["interview_id"];
            isOneToOne: false;
            referencedRelation: "interviews";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "saved_sources_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      stories: {
        Row: {
          action: string | null;
          ai_generation_id: string | null;
          answers_questions: string | null;
          created_at: string;
          id: string;
          measurable_result: string | null;
          origin: Database["public"]["Enums"]["story_origin"];
          result: string | null;
          resume_reference: string | null;
          situation: string | null;
          skills: string[];
          tags: string[];
          task: string | null;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          action?: string | null;
          ai_generation_id?: string | null;
          answers_questions?: string | null;
          created_at?: string;
          id?: string;
          measurable_result?: string | null;
          origin?: Database["public"]["Enums"]["story_origin"];
          result?: string | null;
          resume_reference?: string | null;
          situation?: string | null;
          skills?: string[];
          tags?: string[];
          task?: string | null;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          action?: string | null;
          ai_generation_id?: string | null;
          answers_questions?: string | null;
          created_at?: string;
          id?: string;
          measurable_result?: string | null;
          origin?: Database["public"]["Enums"]["story_origin"];
          result?: string | null;
          resume_reference?: string | null;
          situation?: string | null;
          skills?: string[];
          tags?: string[];
          task?: string | null;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stories_ai_generation_id_fkey";
            columns: ["ai_generation_id"];
            isOneToOne: false;
            referencedRelation: "ai_generations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stories_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      stripe_webhook_events: {
        Row: {
          created_at: string;
          error: string | null;
          id: string;
          payload: Json;
          processed_at: string | null;
          type: string;
        };
        Insert: {
          created_at?: string;
          error?: string | null;
          id: string;
          payload: Json;
          processed_at?: string | null;
          type: string;
        };
        Update: {
          created_at?: string;
          error?: string | null;
          id?: string;
          payload?: Json;
          processed_at?: string | null;
          type?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean;
          created_at: string;
          current_period_end: string | null;
          current_period_start: string | null;
          id: string;
          plan_key: string;
          status: Database["public"]["Enums"]["subscription_status"];
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          trial_end: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          cancel_at_period_end?: boolean;
          created_at?: string;
          current_period_end?: string | null;
          current_period_start?: string | null;
          id?: string;
          plan_key?: string;
          status?: Database["public"]["Enums"]["subscription_status"];
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          trial_end?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          cancel_at_period_end?: boolean;
          created_at?: string;
          current_period_end?: string | null;
          current_period_start?: string | null;
          id?: string;
          plan_key?: string;
          status?: Database["public"]["Enums"]["subscription_status"];
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          trial_end?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_key_fkey";
            columns: ["plan_key"];
            isOneToOne: false;
            referencedRelation: "plans";
            referencedColumns: ["key"];
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      usage_events: {
        Row: {
          ai_generation_id: string | null;
          created_at: string;
          estimated_cost_cents: number | null;
          feature: Database["public"]["Enums"]["usage_feature"];
          id: string;
          input_tokens: number | null;
          interview_id: string | null;
          model: string | null;
          organization_id: string | null;
          output_tokens: number | null;
          period_end: string;
          period_start: string;
          provider: string | null;
          quantity: number;
          status: Database["public"]["Enums"]["usage_status"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          ai_generation_id?: string | null;
          created_at?: string;
          estimated_cost_cents?: number | null;
          feature: Database["public"]["Enums"]["usage_feature"];
          id?: string;
          input_tokens?: number | null;
          interview_id?: string | null;
          model?: string | null;
          organization_id?: string | null;
          output_tokens?: number | null;
          period_end: string;
          period_start: string;
          provider?: string | null;
          quantity?: number;
          status?: Database["public"]["Enums"]["usage_status"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          ai_generation_id?: string | null;
          created_at?: string;
          estimated_cost_cents?: number | null;
          feature?: Database["public"]["Enums"]["usage_feature"];
          id?: string;
          input_tokens?: number | null;
          interview_id?: string | null;
          model?: string | null;
          organization_id?: string | null;
          output_tokens?: number | null;
          period_end?: string;
          period_start?: string;
          provider?: string | null;
          quantity?: number;
          status?: Database["public"]["Enums"]["usage_status"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "usage_events_ai_generation_id_fkey";
            columns: ["ai_generation_id"];
            isOneToOne: false;
            referencedRelation: "ai_generations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "usage_events_interview_id_fkey";
            columns: ["interview_id"];
            isOneToOne: false;
            referencedRelation: "interviews";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "usage_events_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "usage_events_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_consents: {
        Row: {
          consent_type: Database["public"]["Enums"]["consent_type"];
          created_at: string;
          granted: boolean;
          granted_at: string | null;
          id: string;
          revoked_at: string | null;
          user_id: string;
          version: string;
        };
        Insert: {
          consent_type: Database["public"]["Enums"]["consent_type"];
          created_at?: string;
          granted: boolean;
          granted_at?: string | null;
          id?: string;
          revoked_at?: string | null;
          user_id: string;
          version: string;
        };
        Update: {
          consent_type?: Database["public"]["Enums"]["consent_type"];
          created_at?: string;
          granted?: boolean;
          granted_at?: string | null;
          id?: string;
          revoked_at?: string | null;
          user_id?: string;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_consents_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      hit_rate_limit: {
        Args: { p_key: string; p_max_hits: number; p_window_seconds: number };
        Returns: boolean;
      };
      reserve_usage: {
        Args: {
          p_feature: Database["public"]["Enums"]["usage_feature"];
          p_interview?: string;
          p_limit: number;
          p_period_end: string;
          p_period_start: string;
          p_quantity: number;
          p_user: string;
        };
        Returns: string;
      };
      settle_usage: {
        Args: {
          p_cost_cents?: number;
          p_event_id: string;
          p_generation_id?: string;
          p_input_tokens?: number;
          p_model?: string;
          p_output_tokens?: number;
          p_provider?: string;
          p_status: Database["public"]["Enums"]["usage_status"];
        };
        Returns: boolean;
      };
      sweep_stale_usage_reservations: { Args: never; Returns: number };
      upsert_prompt_version: {
        Args: { p_content_hash: string; p_task: string; p_version: string };
        Returns: string;
      };
    };
    Enums: {
      ai_generation_status:
        | "succeeded"
        | "validation_failed"
        | "provider_error"
        | "refused"
        | "timeout";
      answer_feedback_status: "none" | "pending" | "ready" | "failed";
      audit_actor: "user" | "system" | "admin" | "stripe_webhook";
      brief_depth: "basic" | "detailed";
      brief_section_key:
        | "snapshot"
        | "company_overview"
        | "company_priorities"
        | "role_analysis"
        | "interviewer_intel"
        | "likely_themes"
        | "questions_to_ask"
        | "risks_gaps"
        | "next_action"
        | "condensed_summary";
      brief_section_status:
        "pending" | "generating" | "ready" | "failed" | "skipped";
      brief_status: "empty" | "generating" | "partial" | "ready" | "failed";
      candidate_document_kind:
        "resume" | "cover_letter" | "portfolio_note" | "other";
      checklist_item_source: "template" | "ai_suggested" | "user_added";
      consent_type:
        | "terms_of_service"
        | "privacy_policy"
        | "outcome_research_optin"
        | "marketing_emails";
      document_extraction_status: "pending" | "succeeded" | "failed";
      employment_type:
        "full_time" | "part_time" | "internship" | "contract" | "other";
      generation_feedback_rating: "up" | "down";
      generation_feedback_target:
        "brief_section" | "question" | "feedback" | "practice_turn" | "story";
      interview_document_role: "resume" | "cover_letter" | "other";
      interview_format: "phone" | "video" | "onsite" | "take_home" | "other";
      interview_source_kind:
        | "job_description"
        | "company_info"
        | "interviewer_background"
        | "candidate_note"
        | "document_text"
        | "url_reference";
      interview_source_origin:
        "user_provided" | "document_extract" | "mock_research";
      interview_stage:
        "screen" | "technical" | "behavioral" | "panel" | "final" | "other";
      interview_status: "draft" | "preparing" | "completed" | "archived";
      org_member_role: "member" | "org_admin";
      organization_kind:
        | "university"
        | "bootcamp"
        | "career_center"
        | "employer_program"
        | "other";
      practice_modality: "text";
      practice_session_status: "in_progress" | "completed" | "abandoned";
      practice_turn_role: "interviewer" | "candidate";
      practice_turn_type:
        "question" | "followup" | "answer" | "wrapup" | "candidate_question";
      question_category:
        | "introductory"
        | "behavioral"
        | "situational"
        | "role_specific"
        | "technical"
        | "company_specific"
        | "interviewer_informed"
        | "motivation_fit"
        | "leadership"
        | "conflict"
        | "failure"
        | "closing";
      question_origin: "predicted" | "user_added" | "outcome_import";
      question_story_source: "ai_recommended" | "user_linked";
      readiness_component_key:
        | "company_understanding"
        | "role_understanding"
        | "interviewer_context"
        | "stories_prepared"
        | "questions_practiced"
        | "answer_quality"
        | "questions_to_ask";
      story_origin: "user_created" | "ai_draft";
      subscription_status:
        "active" | "trialing" | "past_due" | "canceled" | "incomplete";
      usage_feature:
        | "brief_generate"
        | "section_regenerate"
        | "questions_generate"
        | "story_suggest"
        | "practice_session"
        | "practice_turn"
        | "answer_feedback"
        | "readiness_advice";
      usage_status: "reserved" | "completed" | "refunded" | "failed";
      user_role: "user" | "admin";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      ai_generation_status: [
        "succeeded",
        "validation_failed",
        "provider_error",
        "refused",
        "timeout",
      ],
      answer_feedback_status: ["none", "pending", "ready", "failed"],
      audit_actor: ["user", "system", "admin", "stripe_webhook"],
      brief_depth: ["basic", "detailed"],
      brief_section_key: [
        "snapshot",
        "company_overview",
        "company_priorities",
        "role_analysis",
        "interviewer_intel",
        "likely_themes",
        "questions_to_ask",
        "risks_gaps",
        "next_action",
        "condensed_summary",
      ],
      brief_section_status: [
        "pending",
        "generating",
        "ready",
        "failed",
        "skipped",
      ],
      brief_status: ["empty", "generating", "partial", "ready", "failed"],
      candidate_document_kind: [
        "resume",
        "cover_letter",
        "portfolio_note",
        "other",
      ],
      checklist_item_source: ["template", "ai_suggested", "user_added"],
      consent_type: [
        "terms_of_service",
        "privacy_policy",
        "outcome_research_optin",
        "marketing_emails",
      ],
      document_extraction_status: ["pending", "succeeded", "failed"],
      employment_type: [
        "full_time",
        "part_time",
        "internship",
        "contract",
        "other",
      ],
      generation_feedback_rating: ["up", "down"],
      generation_feedback_target: [
        "brief_section",
        "question",
        "feedback",
        "practice_turn",
        "story",
      ],
      interview_document_role: ["resume", "cover_letter", "other"],
      interview_format: ["phone", "video", "onsite", "take_home", "other"],
      interview_source_kind: [
        "job_description",
        "company_info",
        "interviewer_background",
        "candidate_note",
        "document_text",
        "url_reference",
      ],
      interview_source_origin: [
        "user_provided",
        "document_extract",
        "mock_research",
      ],
      interview_stage: [
        "screen",
        "technical",
        "behavioral",
        "panel",
        "final",
        "other",
      ],
      interview_status: ["draft", "preparing", "completed", "archived"],
      org_member_role: ["member", "org_admin"],
      organization_kind: [
        "university",
        "bootcamp",
        "career_center",
        "employer_program",
        "other",
      ],
      practice_modality: ["text"],
      practice_session_status: ["in_progress", "completed", "abandoned"],
      practice_turn_role: ["interviewer", "candidate"],
      practice_turn_type: [
        "question",
        "followup",
        "answer",
        "wrapup",
        "candidate_question",
      ],
      question_category: [
        "introductory",
        "behavioral",
        "situational",
        "role_specific",
        "technical",
        "company_specific",
        "interviewer_informed",
        "motivation_fit",
        "leadership",
        "conflict",
        "failure",
        "closing",
      ],
      question_origin: ["predicted", "user_added", "outcome_import"],
      question_story_source: ["ai_recommended", "user_linked"],
      readiness_component_key: [
        "company_understanding",
        "role_understanding",
        "interviewer_context",
        "stories_prepared",
        "questions_practiced",
        "answer_quality",
        "questions_to_ask",
      ],
      story_origin: ["user_created", "ai_draft"],
      subscription_status: [
        "active",
        "trialing",
        "past_due",
        "canceled",
        "incomplete",
      ],
      usage_feature: [
        "brief_generate",
        "section_regenerate",
        "questions_generate",
        "story_suggest",
        "practice_session",
        "practice_turn",
        "answer_feedback",
        "readiness_advice",
      ],
      usage_status: ["reserved", "completed", "refunded", "failed"],
      user_role: ["user", "admin"],
    },
  },
} as const;
