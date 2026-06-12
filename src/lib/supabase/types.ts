export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
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
          surface: string | null;
          status: string;
          resources: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          venue_id: string;
          name: string;
          sport_type: string;
          surface?: string | null;
          status?: string;
          resources?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          venue_id?: string;
          name?: string;
          sport_type?: string;
          surface?: string | null;
          status?: string;
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
      sessions: {
        Row: {
          id: string;
          field_id: string;
          title: string;
          home_team: string;
          away_team: string;
          start_time: string;
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
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          field_id: string;
          title: string;
          home_team: string;
          away_team: string;
          start_time: string;
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
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          field_id?: string;
          title?: string;
          home_team?: string;
          away_team?: string;
          start_time?: string;
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
        ];
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
