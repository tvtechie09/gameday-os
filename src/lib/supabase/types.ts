export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      alerts: {
        Row: {
          id: string;
          title: string;
          message: string;
          alert_type: string;
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
          title: string;
          message: string;
          alert_type: string;
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
          title?: string;
          message?: string;
          alert_type?: string;
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
      venues: {
        Row: {
          id: string;
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
      tournaments: {
        Row: {
          id: string;
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
          name: string;
          logo_url: string | null;
          website_url: string | null;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          logo_url?: string | null;
          website_url?: string | null;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
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
