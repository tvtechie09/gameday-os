export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          logo_url: string | null;
          banner_url: string | null;
          primary_color: string | null;
          secondary_color: string | null;
          website_url: string | null;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          logo_url?: string | null;
          banner_url?: string | null;
          primary_color?: string | null;
          secondary_color?: string | null;
          website_url?: string | null;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          logo_url?: string | null;
          banner_url?: string | null;
          primary_color?: string | null;
          secondary_color?: string | null;
          website_url?: string | null;
          description?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      role_assignments: {
        Row: {
          id: string;
          organization_id: string | null;
          role_type: string;
          display_name: string;
          email: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          role_type: string;
          display_name: string;
          email: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          role_type?: string;
          display_name?: string;
          email?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "role_assignments_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      alerts: {
        Row: {
          id: string;
          organization_id: string | null;
          title: string;
          message: string;
          alert_type: string;
          alert_scope: string;
          alert_priority: string;
          alert_visibility: string;
          venue_id: string;
          tournament_id: string | null;
          field_id: string | null;
          start_time: string;
          end_time: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          title: string;
          message: string;
          alert_type: string;
          alert_scope?: string;
          alert_priority?: string;
          alert_visibility?: string;
          venue_id: string;
          tournament_id?: string | null;
          field_id?: string | null;
          start_time: string;
          end_time: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          title?: string;
          message?: string;
          alert_type?: string;
          alert_scope?: string;
          alert_priority?: string;
          alert_visibility?: string;
          venue_id?: string;
          tournament_id?: string | null;
          field_id?: string | null;
          start_time?: string;
          end_time?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "alerts_venue_id_fkey";
            columns: ["venue_id"];
            isOneToOne: false;
            referencedRelation: "venues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alerts_tournament_id_fkey";
            columns: ["tournament_id"];
            isOneToOne: false;
            referencedRelation: "tournaments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alerts_field_id_fkey";
            columns: ["field_id"];
            isOneToOne: false;
            referencedRelation: "fields";
            referencedColumns: ["id"];
          },
        ];
      };
      external_sources: {
        Row: {
          id: string;
          organization_id: string | null;
          venue_id: string;
          source_type: string;
          source_name: string;
          source_url: string | null;
          source_status: string;
          last_sync_at: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          venue_id: string;
          source_type: string;
          source_name: string;
          source_url?: string | null;
          source_status?: string;
          last_sync_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          venue_id?: string;
          source_type?: string;
          source_name?: string;
          source_url?: string | null;
          source_status?: string;
          last_sync_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "external_sources_venue_id_fkey";
            columns: ["venue_id"];
            isOneToOne: false;
            referencedRelation: "venues";
            referencedColumns: ["id"];
          },
        ];
      };
      follows: {
        Row: {
          id: string;
          field_id: string;
          session_id: string | null;
          follow_type: string;
          display_name: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          field_id: string;
          session_id?: string | null;
          follow_type: string;
          display_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          field_id?: string;
          session_id?: string | null;
          follow_type?: string;
          display_name?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "follows_field_id_fkey";
            columns: ["field_id"];
            isOneToOne: false;
            referencedRelation: "fields";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "follows_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          notification_type: string;
          title: string;
          message: string;
          venue_id: string | null;
          field_id: string | null;
          session_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          notification_type: string;
          title: string;
          message: string;
          venue_id?: string | null;
          field_id?: string | null;
          session_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          notification_type?: string;
          title?: string;
          message?: string;
          venue_id?: string | null;
          field_id?: string | null;
          session_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_venue_id_fkey";
            columns: ["venue_id"];
            isOneToOne: false;
            referencedRelation: "venues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_field_id_fkey";
            columns: ["field_id"];
            isOneToOne: false;
            referencedRelation: "fields";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      sync_jobs: {
        Row: {
          id: string;
          source_id: string | null;
          source_type: string;
          status: string;
          records_found: number;
          records_imported: number;
          records_skipped: number;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          source_id?: string | null;
          source_type: string;
          status?: string;
          records_found?: number;
          records_imported?: number;
          records_skipped?: number;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          source_id?: string | null;
          source_type?: string;
          status?: string;
          records_found?: number;
          records_imported?: number;
          records_skipped?: number;
          created_at?: string;
          completed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "sync_jobs_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "external_sources";
            referencedColumns: ["id"];
          },
        ];
      };
      sync_queue: {
        Row: {
          id: string;
          sync_job_id: string;
          source_record_id: string;
          source_data: Json;
          review_status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          sync_job_id: string;
          source_record_id: string;
          source_data: Json;
          review_status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          sync_job_id?: string;
          source_record_id?: string;
          source_data?: Json;
          review_status?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sync_queue_sync_job_id_fkey";
            columns: ["sync_job_id"];
            isOneToOne: false;
            referencedRelation: "sync_jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      venues: {
        Row: {
          id: string;
          organization_id: string | null;
          name: string;
          description: string | null;
          address: string | null;
          city: string | null;
          state: string | null;
          parking_note: string | null;
          status: string;
          logo_url: string | null;
          banner_url: string | null;
          map_image_url: string | null;
          map_notes: string | null;
          primary_color: string | null;
          secondary_color: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          name: string;
          description?: string | null;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          parking_note?: string | null;
          status?: string;
          logo_url?: string | null;
          banner_url?: string | null;
          map_image_url?: string | null;
          map_notes?: string | null;
          primary_color?: string | null;
          secondary_color?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          name?: string;
          description?: string | null;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          parking_note?: string | null;
          status?: string;
          logo_url?: string | null;
          banner_url?: string | null;
          map_image_url?: string | null;
          map_notes?: string | null;
          primary_color?: string | null;
          secondary_color?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      fields: {
        Row: {
          id: string;
          organization_id: string | null;
          venue_id: string;
          name: string;
          sport_type: string;
          map_label: string | null;
          map_x: number | null;
          map_y: number | null;
          surface: string | null;
          status: string;
          field_status: string;
          resources: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          venue_id: string;
          name: string;
          sport_type: string;
          map_label?: string | null;
          map_x?: number | null;
          map_y?: number | null;
          surface?: string | null;
          status?: string;
          field_status?: string;
          resources?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          venue_id?: string;
          name?: string;
          sport_type?: string;
          map_label?: string | null;
          map_x?: number | null;
          map_y?: number | null;
          surface?: string | null;
          status?: string;
          field_status?: string;
          resources?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fields_venue_id_fkey";
            columns: ["venue_id"];
            isOneToOne: false;
            referencedRelation: "venues";
            referencedColumns: ["id"];
          },
        ];
      };
      resources: {
        Row: {
          id: string;
          organization_id: string | null;
          venue_id: string;
          field_id: string | null;
          resource_name: string;
          resource_type: string;
          manufacturer: string | null;
          model: string | null;
          serial_number: string | null;
          status: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          venue_id: string;
          field_id?: string | null;
          resource_name: string;
          resource_type: string;
          manufacturer?: string | null;
          model?: string | null;
          serial_number?: string | null;
          status?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          venue_id?: string;
          field_id?: string | null;
          resource_name?: string;
          resource_type?: string;
          manufacturer?: string | null;
          model?: string | null;
          serial_number?: string | null;
          status?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "resources_venue_id_fkey";
            columns: ["venue_id"];
            isOneToOne: false;
            referencedRelation: "venues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "resources_field_id_fkey";
            columns: ["field_id"];
            isOneToOne: false;
            referencedRelation: "fields";
            referencedColumns: ["id"];
          },
        ];
      };
      scoreboard_profiles: {
        Row: {
          id: string;
          organization_id: string | null;
          venue_id: string;
          field_id: string;
          resource_id: string | null;
          manufacturer: string;
          model: string;
          connection_type: string;
          integration_mode: string;
          scoreboard_status: string;
          ip_address: string | null;
          controller_location: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          venue_id: string;
          field_id: string;
          resource_id?: string | null;
          manufacturer?: string;
          model?: string;
          connection_type?: string;
          integration_mode?: string;
          scoreboard_status?: string;
          ip_address?: string | null;
          controller_location?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          venue_id?: string;
          field_id?: string;
          resource_id?: string | null;
          manufacturer?: string;
          model?: string;
          connection_type?: string;
          integration_mode?: string;
          scoreboard_status?: string;
          ip_address?: string | null;
          controller_location?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "scoreboard_profiles_venue_id_fkey";
            columns: ["venue_id"];
            isOneToOne: false;
            referencedRelation: "venues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scoreboard_profiles_field_id_fkey";
            columns: ["field_id"];
            isOneToOne: false;
            referencedRelation: "fields";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scoreboard_profiles_resource_id_fkey";
            columns: ["resource_id"];
            isOneToOne: false;
            referencedRelation: "resources";
            referencedColumns: ["id"];
          },
        ];
      };
      scoreboard_adapters: {
        Row: {
          id: string;
          scoreboard_id: string;
          adapter_type: string;
          adapter_status: string;
          last_sync_at: string | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          scoreboard_id: string;
          adapter_type?: string;
          adapter_status?: string;
          last_sync_at?: string | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          scoreboard_id?: string;
          adapter_type?: string;
          adapter_status?: string;
          last_sync_at?: string | null;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "scoreboard_adapters_scoreboard_id_fkey";
            columns: ["scoreboard_id"];
            isOneToOne: false;
            referencedRelation: "scoreboard_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      audio_profiles: {
        Row: {
          id: string;
          organization_id: string | null;
          venue_id: string;
          field_id: string;
          session_id: string | null;
          audio_mode: string;
          speaker_type: string | null;
          provider: string | null;
          status: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          venue_id: string;
          field_id: string;
          session_id?: string | null;
          audio_mode?: string;
          speaker_type?: string | null;
          provider?: string | null;
          status?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          venue_id?: string;
          field_id?: string;
          session_id?: string | null;
          audio_mode?: string;
          speaker_type?: string | null;
          provider?: string | null;
          status?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audio_profiles_venue_id_fkey";
            columns: ["venue_id"];
            isOneToOne: false;
            referencedRelation: "venues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audio_profiles_field_id_fkey";
            columns: ["field_id"];
            isOneToOne: false;
            referencedRelation: "fields";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audio_profiles_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      resource_activations: {
        Row: {
          id: string;
          resource_id: string | null;
          venue_id: string;
          field_id: string;
          session_id: string | null;
          activation_type: string;
          display_name: string;
          contact_name: string | null;
          contact_email: string | null;
          resource_url: string | null;
          status: string;
          notes: string | null;
          starts_at: string;
          ends_at: string;
          assigned_to_session: boolean;
          approved_by: string | null;
          approved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          resource_id?: string | null;
          venue_id: string;
          field_id: string;
          session_id?: string | null;
          activation_type: string;
          display_name: string;
          contact_name?: string | null;
          contact_email?: string | null;
          resource_url?: string | null;
          status?: string;
          notes?: string | null;
          starts_at: string;
          ends_at: string;
          assigned_to_session?: boolean;
          approved_by?: string | null;
          approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          resource_id?: string | null;
          venue_id?: string;
          field_id?: string;
          session_id?: string | null;
          activation_type?: string;
          display_name?: string;
          contact_name?: string | null;
          contact_email?: string | null;
          resource_url?: string | null;
          status?: string;
          notes?: string | null;
          starts_at?: string;
          ends_at?: string;
          assigned_to_session?: boolean;
          approved_by?: string | null;
          approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "resource_activations_resource_id_fkey";
            columns: ["resource_id"];
            isOneToOne: false;
            referencedRelation: "resources";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "resource_activations_venue_id_fkey";
            columns: ["venue_id"];
            isOneToOne: false;
            referencedRelation: "venues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "resource_activations_field_id_fkey";
            columns: ["field_id"];
            isOneToOne: false;
            referencedRelation: "fields";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "resource_activations_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      volunteer_roles: {
        Row: {
          id: string;
          venue_id: string;
          field_id: string;
          session_id: string | null;
          role_type: string;
          display_name: string;
          contact_name: string | null;
          contact_email: string | null;
          contact_phone: string | null;
          status: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          venue_id: string;
          field_id: string;
          session_id?: string | null;
          role_type: string;
          display_name: string;
          contact_name?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          status?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          venue_id?: string;
          field_id?: string;
          session_id?: string | null;
          role_type?: string;
          display_name?: string;
          contact_name?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          status?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "volunteer_roles_venue_id_fkey";
            columns: ["venue_id"];
            isOneToOne: false;
            referencedRelation: "venues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "volunteer_roles_field_id_fkey";
            columns: ["field_id"];
            isOneToOne: false;
            referencedRelation: "fields";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "volunteer_roles_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      sessions: {
        Row: {
          id: string;
          organization_id: string | null;
          field_id: string;
          tournament_id: string | null;
          title: string;
          sport_type: string;
          home_team: string;
          away_team: string;
          start_time: string;
          end_time: string | null;
          status: string;
          home_score: number;
          away_score: number;
          is_demo: boolean;
          inning: number;
          inning_half: string;
          balls: number;
          strikes: number;
          outs: number;
          game_status: string;
          primary_link_label: string | null;
          primary_link_url: string | null;
          secondary_link_label: string | null;
          secondary_link_url: string | null;
          external_source: string | null;
          external_source_id: string | null;
          external_source_url: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          field_id: string;
          tournament_id?: string | null;
          title: string;
          sport_type?: string;
          home_team: string;
          away_team: string;
          start_time: string;
          end_time?: string | null;
          status?: string;
          home_score?: number;
          away_score?: number;
          is_demo?: boolean;
          inning?: number;
          inning_half?: string;
          balls?: number;
          strikes?: number;
          outs?: number;
          game_status?: string;
          primary_link_label?: string | null;
          primary_link_url?: string | null;
          secondary_link_label?: string | null;
          secondary_link_url?: string | null;
          external_source?: string | null;
          external_source_id?: string | null;
          external_source_url?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          field_id?: string;
          tournament_id?: string | null;
          title?: string;
          sport_type?: string;
          home_team?: string;
          away_team?: string;
          start_time?: string;
          end_time?: string | null;
          status?: string;
          home_score?: number;
          away_score?: number;
          is_demo?: boolean;
          inning?: number;
          inning_half?: string;
          balls?: number;
          strikes?: number;
          outs?: number;
          game_status?: string;
          primary_link_label?: string | null;
          primary_link_url?: string | null;
          secondary_link_label?: string | null;
          secondary_link_url?: string | null;
          external_source?: string | null;
          external_source_id?: string | null;
          external_source_url?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sessions_field_id_fkey";
            columns: ["field_id"];
            isOneToOne: false;
            referencedRelation: "fields";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sessions_tournament_id_fkey";
            columns: ["tournament_id"];
            isOneToOne: false;
            referencedRelation: "tournaments";
            referencedColumns: ["id"];
          },
        ];
      };
      session_events: {
        Row: {
          id: string;
          session_id: string;
          event_type: string;
          event_message: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          event_type: string;
          event_message: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          event_type?: string;
          event_message?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "session_events_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      tournaments: {
        Row: {
          id: string;
          organization_id: string | null;
          name: string;
          description: string | null;
          start_date: string;
          end_date: string;
          logo_url: string | null;
          website_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          name: string;
          description?: string | null;
          start_date: string;
          end_date: string;
          logo_url?: string | null;
          website_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          name?: string;
          description?: string | null;
          start_date?: string;
          end_date?: string;
          logo_url?: string | null;
          website_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      sponsors: {
        Row: {
          id: string;
          organization_id: string | null;
          name: string;
          logo_url: string | null;
          website_url: string | null;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          name: string;
          logo_url?: string | null;
          website_url?: string | null;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          name?: string;
          logo_url?: string | null;
          website_url?: string | null;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      sponsor_assignments: {
        Row: {
          id: string;
          sponsor_id: string;
          assignment_type: string;
          venue_id: string | null;
          field_id: string | null;
          session_id: string | null;
          placement_label: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          sponsor_id: string;
          assignment_type: string;
          venue_id?: string | null;
          field_id?: string | null;
          session_id?: string | null;
          placement_label: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          sponsor_id?: string;
          assignment_type?: string;
          venue_id?: string | null;
          field_id?: string | null;
          session_id?: string | null;
          placement_label?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sponsor_assignments_venue_id_fkey";
            columns: ["venue_id"];
            isOneToOne: false;
            referencedRelation: "venues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sponsor_assignments_field_id_fkey";
            columns: ["field_id"];
            isOneToOne: false;
            referencedRelation: "fields";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sponsor_assignments_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sponsor_assignments_sponsor_id_fkey";
            columns: ["sponsor_id"];
            isOneToOne: false;
            referencedRelation: "sponsors";
            referencedColumns: ["id"];
          },
        ];
      };
      sponsor_impressions: {
        Row: {
          id: string;
          sponsor_id: string;
          field_id: string | null;
          session_id: string | null;
          viewed_at: string;
          page_type: string;
        };
        Insert: {
          id?: string;
          sponsor_id: string;
          field_id?: string | null;
          session_id?: string | null;
          viewed_at?: string;
          page_type: string;
        };
        Update: {
          id?: string;
          sponsor_id?: string;
          field_id?: string | null;
          session_id?: string | null;
          viewed_at?: string;
          page_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sponsor_impressions_sponsor_id_fkey";
            columns: ["sponsor_id"];
            isOneToOne: false;
            referencedRelation: "sponsors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sponsor_impressions_field_id_fkey";
            columns: ["field_id"];
            isOneToOne: false;
            referencedRelation: "fields";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sponsor_impressions_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      sponsor_clicks: {
        Row: {
          id: string;
          sponsor_id: string;
          field_id: string | null;
          session_id: string | null;
          clicked_at: string;
          page_type: string;
        };
        Insert: {
          id?: string;
          sponsor_id: string;
          field_id?: string | null;
          session_id?: string | null;
          clicked_at?: string;
          page_type: string;
        };
        Update: {
          id?: string;
          sponsor_id?: string;
          field_id?: string | null;
          session_id?: string | null;
          clicked_at?: string;
          page_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sponsor_clicks_sponsor_id_fkey";
            columns: ["sponsor_id"];
            isOneToOne: false;
            referencedRelation: "sponsors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sponsor_clicks_field_id_fkey";
            columns: ["field_id"];
            isOneToOne: false;
            referencedRelation: "fields";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sponsor_clicks_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      field_page_views: {
        Row: {
          id: string;
          venue_id: string;
          field_id: string;
          session_id: string | null;
          viewed_at: string;
          page_type: string;
          user_agent: string | null;
        };
        Insert: {
          id?: string;
          venue_id: string;
          field_id: string;
          session_id?: string | null;
          viewed_at?: string;
          page_type?: string;
          user_agent?: string | null;
        };
        Update: {
          id?: string;
          venue_id?: string;
          field_id?: string;
          session_id?: string | null;
          viewed_at?: string;
          page_type?: string;
          user_agent?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "field_page_views_venue_id_fkey";
            columns: ["venue_id"];
            isOneToOne: false;
            referencedRelation: "venues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "field_page_views_field_id_fkey";
            columns: ["field_id"];
            isOneToOne: false;
            referencedRelation: "fields";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "field_page_views_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
