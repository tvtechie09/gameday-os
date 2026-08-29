export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          is_demo?: boolean;
          name: string;
          slug: string;
          logo_url: string | null;
          banner_url: string | null;
          primary_color: string | null;
          secondary_color: string | null;
          website_url: string | null;
          description: string | null;
          prohibited_sponsor_categories?: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          is_demo?: boolean;
          name: string;
          slug: string;
          logo_url?: string | null;
          banner_url?: string | null;
          primary_color?: string | null;
          secondary_color?: string | null;
          website_url?: string | null;
          description?: string | null;
          prohibited_sponsor_categories?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          is_demo?: boolean;
          name?: string;
          slug?: string;
          logo_url?: string | null;
          banner_url?: string | null;
          primary_color?: string | null;
          secondary_color?: string | null;
          website_url?: string | null;
          description?: string | null;
          prohibited_sponsor_categories?: Json | null;
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
      users: {
        Row: {
          id: string;
          auth_user_id: string | null;
          email: string | null;
          display_name: string | null;
          avatar_url: string | null;
          user_status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auth_user_id?: string | null;
          email?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          user_status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          auth_user_id?: string | null;
          email?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          user_status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      roles: {
        Row: {
          id: string;
          key: string;
          name: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          name: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      permissions: {
        Row: {
          id: string;
          key: string;
          name: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          name: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      role_permissions: {
        Row: {
          role_id: string;
          permission_id: string;
        };
        Insert: {
          role_id: string;
          permission_id: string;
        };
        Update: {
          role_id?: string;
          permission_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "role_permissions_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "role_permissions_permission_id_fkey";
            columns: ["permission_id"];
            isOneToOne: false;
            referencedRelation: "permissions";
            referencedColumns: ["id"];
          },
        ];
      };
      field_bookings: {
        Row: {
          id: string;
          field_id: string;
          organization_name: string;
          purpose: string;
          contact_name: string | null;
          contact_email: string | null;
          starts_at: string;
          ends_at: string;
          status: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          field_id: string;
          organization_name: string;
          purpose?: string;
          contact_name?: string | null;
          contact_email?: string | null;
          starts_at: string;
          ends_at: string;
          status?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          field_id?: string;
          organization_name?: string;
          purpose?: string;
          contact_name?: string | null;
          contact_email?: string | null;
          starts_at?: string;
          ends_at?: string;
          status?: string;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "field_bookings_field_id_fkey";
            columns: ["field_id"];
            isOneToOne: false;
            referencedRelation: "fields";
            referencedColumns: ["id"];
          },
        ];
      };
      field_work_orders: {
        Row: {
          id: string;
          field_id: string;
          title: string;
          detail: string | null;
          priority: string;
          status: string;
          reported_by: string | null;
          created_at: string;
          updated_at: string;
          closed_at: string | null;
          assigned_role?: string | null;
          assigned_to_user_id?: string | null;
          acknowledged_at?: string | null;
          acknowledged_by?: string | null;
          due_at?: string | null;
          resolution_notes?: string | null;
          source?: string;
          game_id?: string | null;
          asset_id?: string | null;
        };
        Insert: {
          id?: string;
          field_id: string;
          title: string;
          detail?: string | null;
          priority?: string;
          status?: string;
          reported_by?: string | null;
          created_at?: string;
          updated_at?: string;
          closed_at?: string | null;
          assigned_role?: string | null;
          assigned_to_user_id?: string | null;
          acknowledged_at?: string | null;
          acknowledged_by?: string | null;
          due_at?: string | null;
          resolution_notes?: string | null;
          source?: string;
          game_id?: string | null;
          asset_id?: string | null;
        };
        Update: {
          id?: string;
          field_id?: string;
          title?: string;
          detail?: string | null;
          priority?: string;
          status?: string;
          reported_by?: string | null;
          updated_at?: string;
          closed_at?: string | null;
          assigned_role?: string | null;
          assigned_to_user_id?: string | null;
          acknowledged_at?: string | null;
          acknowledged_by?: string | null;
          due_at?: string | null;
          resolution_notes?: string | null;
          source?: string;
          game_id?: string | null;
          asset_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "field_work_orders_field_id_fkey";
            columns: ["field_id"];
            isOneToOne: false;
            referencedRelation: "fields";
            referencedColumns: ["id"];
          },
        ];
      };
      billing_accounts: {
        Row: {
          id: string;
          organization_id: string;
          plan_label: string;
          amount_cents: number;
          billing_interval: string;
          status: string;
          po_number: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          plan_label?: string;
          amount_cents?: number;
          billing_interval?: string;
          status?: string;
          po_number?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          plan_label?: string;
          amount_cents?: number;
          billing_interval?: string;
          status?: string;
          po_number?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      billing_invoices: {
        Row: {
          id: string;
          organization_id: string;
          description: string;
          amount_cents: number;
          status: string;
          issued_on: string;
          due_on: string | null;
          paid_on: string | null;
          po_number: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          description: string;
          amount_cents?: number;
          status?: string;
          issued_on?: string;
          due_on?: string | null;
          paid_on?: string | null;
          po_number?: string | null;
          created_at?: string;
        };
        Update: {
          description?: string;
          amount_cents?: number;
          status?: string;
          issued_on?: string;
          due_on?: string | null;
          paid_on?: string | null;
          po_number?: string | null;
        };
        Relationships: [];
      };
      sponsor_campaigns: {
        Row: {
          id: string;
          organization_id: string | null;
          sponsor_id: string;
          venue_id: string | null;
          name: string;
          package_name: string | null;
          starts_on: string;
          ends_on: string;
          contracted: Record<string, number>;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          sponsor_id: string;
          venue_id?: string | null;
          name: string;
          package_name?: string | null;
          starts_on: string;
          ends_on: string;
          contracted?: Record<string, number>;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          sponsor_id?: string;
          venue_id?: string | null;
          name?: string;
          package_name?: string | null;
          starts_on?: string;
          ends_on?: string;
          contracted?: Record<string, number>;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sponsor_campaigns_sponsor_id_fkey";
            columns: ["sponsor_id"];
            isOneToOne: false;
            referencedRelation: "sponsors";
            referencedColumns: ["id"];
          },
        ];
      };
      session_officials: {
        Row: {
          id: string;
          session_id: string;
          official_name: string;
          official_email: string | null;
          official_phone: string | null;
          role: string;
          status: string;
          confirm_token: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          official_name: string;
          official_email?: string | null;
          official_phone?: string | null;
          role?: string;
          status?: string;
          confirm_token: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          official_name?: string;
          official_email?: string | null;
          official_phone?: string | null;
          role?: string;
          status?: string;
          confirm_token?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "session_officials_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      organization_memberships: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          membership_status: string;
          joined_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          membership_status?: string;
          joined_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          membership_status?: string;
          joined_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organization_memberships_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "organization_memberships_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      user_role_assignments: {
        Row: {
          id: string;
          user_id: string;
          role_id: string;
          scope_type: string;
          scope_id: string;
          starts_at: string | null;
          ends_at: string | null;
          granted_by: string | null;
          assignment_status: string;
          revoked_by: string | null;
          revoked_at: string | null;
          approval_notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role_id: string;
          scope_type: string;
          scope_id: string;
          starts_at?: string | null;
          ends_at?: string | null;
          granted_by?: string | null;
          assignment_status?: string;
          revoked_by?: string | null;
          revoked_at?: string | null;
          approval_notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role_id?: string;
          scope_type?: string;
          scope_id?: string;
          starts_at?: string | null;
          ends_at?: string | null;
          granted_by?: string | null;
          assignment_status?: string;
          revoked_by?: string | null;
          revoked_at?: string | null;
          approval_notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_role_assignments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_role_assignments_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_role_assignments_granted_by_fkey";
            columns: ["granted_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      identity_invites: {
        Row: {
          id: string;
          organization_id: string | null;
          email: string;
          role_id: string;
          scope_type: string;
          scope_id: string;
          invite_status: string;
          invited_by: string | null;
          approved_by: string | null;
          expires_at: string | null;
          approved_at: string | null;
          revoked_at: string | null;
          approval_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          email: string;
          role_id: string;
          scope_type: string;
          scope_id: string;
          invite_status?: string;
          invited_by?: string | null;
          approved_by?: string | null;
          expires_at?: string | null;
          approved_at?: string | null;
          revoked_at?: string | null;
          approval_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          email?: string;
          role_id?: string;
          scope_type?: string;
          scope_id?: string;
          invite_status?: string;
          invited_by?: string | null;
          approved_by?: string | null;
          expires_at?: string | null;
          approved_at?: string | null;
          revoked_at?: string | null;
          approval_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "identity_invites_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "identity_invites_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "identity_invites_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      identity_access_requests: {
        Row: {
          id: string;
          user_id: string | null;
          email: string | null;
          requested_role_id: string | null;
          requested_by: string | null;
          scope_type: string;
          scope_id: string;
          request_status: string;
          reason: string | null;
          approved_by: string | null;
          approved_at: string | null;
          revoked_by: string | null;
          revoked_at: string | null;
          approval_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          email?: string | null;
          requested_role_id?: string | null;
          requested_by?: string | null;
          scope_type: string;
          scope_id: string;
          request_status?: string;
          reason?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          revoked_by?: string | null;
          revoked_at?: string | null;
          approval_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          email?: string | null;
          requested_role_id?: string | null;
          requested_by?: string | null;
          scope_type?: string;
          scope_id?: string;
          request_status?: string;
          reason?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          revoked_by?: string | null;
          revoked_at?: string | null;
          approval_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "identity_access_requests_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "identity_access_requests_requested_role_id_fkey";
            columns: ["requested_role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "identity_access_requests_requested_by_fkey";
            columns: ["requested_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "identity_access_requests_approved_by_fkey";
            columns: ["approved_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "identity_access_requests_revoked_by_fkey";
            columns: ["revoked_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      identity_approvals: {
        Row: {
          id: string;
          approval_status: string;
          approval_type: string;
          invite_id: string | null;
          access_request_id: string | null;
          assignment_id: string | null;
          scope_type: string;
          scope_id: string;
          requested_by: string | null;
          approved_by: string | null;
          revoked_by: string | null;
          reason: string | null;
          approval_notes: string | null;
          starts_at: string | null;
          ends_at: string | null;
          decided_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          approval_status?: string;
          approval_type: string;
          invite_id?: string | null;
          access_request_id?: string | null;
          assignment_id?: string | null;
          scope_type: string;
          scope_id: string;
          requested_by?: string | null;
          approved_by?: string | null;
          revoked_by?: string | null;
          reason?: string | null;
          approval_notes?: string | null;
          starts_at?: string | null;
          ends_at?: string | null;
          decided_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          approval_status?: string;
          approval_type?: string;
          invite_id?: string | null;
          access_request_id?: string | null;
          assignment_id?: string | null;
          scope_type?: string;
          scope_id?: string;
          requested_by?: string | null;
          approved_by?: string | null;
          revoked_by?: string | null;
          reason?: string | null;
          approval_notes?: string | null;
          starts_at?: string | null;
          ends_at?: string | null;
          decided_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "identity_approvals_invite_id_fkey";
            columns: ["invite_id"];
            isOneToOne: false;
            referencedRelation: "identity_invites";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "identity_approvals_access_request_id_fkey";
            columns: ["access_request_id"];
            isOneToOne: false;
            referencedRelation: "identity_access_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "identity_approvals_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "user_role_assignments";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          id: string;
          actor_user_id: string | null;
          action: string;
          resource_type: string;
          resource_id: string | null;
          scope_type: string;
          scope_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_user_id?: string | null;
          action: string;
          resource_type: string;
          resource_id?: string | null;
          scope_type: string;
          scope_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_user_id?: string | null;
          action?: string;
          resource_type?: string;
          resource_id?: string | null;
          scope_type?: string;
          scope_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
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
      alert_deliveries: {
        Row: {
          id: string;
          alert_id: string;
          follow_id: string | null;
          email: string;
          status: string;
          provider: string;
          error: string;
          created_at: string;
          sent_at: string | null;
        };
        Insert: {
          id?: string;
          alert_id: string;
          follow_id?: string | null;
          email: string;
          status?: string;
          provider?: string;
          error?: string;
          created_at?: string;
          sent_at?: string | null;
        };
        Update: {
          id?: string;
          alert_id?: string;
          follow_id?: string | null;
          email?: string;
          status?: string;
          provider?: string;
          error?: string;
          created_at?: string;
          sent_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "alert_deliveries_alert_id_fkey";
            columns: ["alert_id"];
            isOneToOne: false;
            referencedRelation: "alerts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alert_deliveries_follow_id_fkey";
            columns: ["follow_id"];
            isOneToOne: false;
            referencedRelation: "follows";
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
          email: string | null;
          email_enabled: boolean;
          notification_level: string;
          manage_token: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          field_id: string;
          session_id?: string | null;
          follow_type: string;
          display_name?: string | null;
          email?: string | null;
          email_enabled?: boolean;
          notification_level?: string;
          manage_token?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          field_id?: string;
          session_id?: string | null;
          follow_type?: string;
          display_name?: string | null;
          email?: string | null;
          email_enabled?: boolean;
          notification_level?: string;
          manage_token?: string;
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
          is_demo?: boolean;
          organization_id: string | null;
          name: string;
          description: string | null;
          address: string | null;
          city: string | null;
          state: string | null;
          // Optional on the Row so code that selects an explicit column list
          // without it still type-checks; the column itself is NOT NULL with a
          // default, so a row that selects it always has a value.
          timezone?: string;
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
          is_demo?: boolean;
          organization_id?: string | null;
          name: string;
          description?: string | null;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          timezone?: string;
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
          is_demo?: boolean;
          organization_id?: string | null;
          name?: string;
          description?: string | null;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          timezone?: string;
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
          is_demo?: boolean;
          organization_id: string | null;
          venue_id: string;
          zone_id: string | null;
          parent_field_id: string | null;
          name: string;
          sport_type: string;
          surface_code: string | null;
          layout_role: string;
          layout_type: string | null;
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
          is_demo?: boolean;
          organization_id?: string | null;
          venue_id: string;
          zone_id?: string | null;
          parent_field_id?: string | null;
          name: string;
          sport_type: string;
          surface_code?: string | null;
          layout_role?: string;
          layout_type?: string | null;
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
          is_demo?: boolean;
          organization_id?: string | null;
          venue_id?: string;
          zone_id?: string | null;
          parent_field_id?: string | null;
          name?: string;
          sport_type?: string;
          surface_code?: string | null;
          layout_role?: string;
          layout_type?: string | null;
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
          {
            foreignKeyName: "fields_zone_id_fkey";
            columns: ["zone_id"];
            isOneToOne: false;
            referencedRelation: "venue_zones";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fields_parent_field_id_fkey";
            columns: ["parent_field_id"];
            isOneToOne: false;
            referencedRelation: "fields";
            referencedColumns: ["id"];
          },
        ];
      };
      venue_zones: {
        Row: {
          id: string;
          organization_id: string | null;
          venue_id: string;
          name: string;
          description: string | null;
          zone_type: string;
          map_label: string | null;
          map_x: number | null;
          map_y: number | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          venue_id: string;
          name: string;
          description?: string | null;
          zone_type?: string;
          map_label?: string | null;
          map_x?: number | null;
          map_y?: number | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          venue_id?: string;
          name?: string;
          description?: string | null;
          zone_type?: string;
          map_label?: string | null;
          map_x?: number | null;
          map_y?: number | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "venue_zones_venue_id_fkey";
            columns: ["venue_id"];
            isOneToOne: false;
            referencedRelation: "venues";
            referencedColumns: ["id"];
          },
        ];
      };
      play_surfaces: {
        Row: {
          id: string;
          organization_id: string | null;
          venue_id: string;
          zone_id: string | null;
          parent_field_id: string | null;
          field_id: string | null;
          name: string;
          surface_code: string | null;
          sport_types: string[];
          surface_type: string;
          layout_role: string;
          status: string;
          map_label: string | null;
          map_x: number | null;
          map_y: number | null;
          capacity: number | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          venue_id: string;
          zone_id?: string | null;
          parent_field_id?: string | null;
          field_id?: string | null;
          name: string;
          surface_code?: string | null;
          sport_types?: string[];
          surface_type?: string;
          layout_role?: string;
          status?: string;
          map_label?: string | null;
          map_x?: number | null;
          map_y?: number | null;
          capacity?: number | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          venue_id?: string;
          zone_id?: string | null;
          parent_field_id?: string | null;
          field_id?: string | null;
          name?: string;
          surface_code?: string | null;
          sport_types?: string[];
          surface_type?: string;
          layout_role?: string;
          status?: string;
          map_label?: string | null;
          map_x?: number | null;
          map_y?: number | null;
          capacity?: number | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "play_surfaces_venue_id_fkey";
            columns: ["venue_id"];
            isOneToOne: false;
            referencedRelation: "venues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "play_surfaces_zone_id_fkey";
            columns: ["zone_id"];
            isOneToOne: false;
            referencedRelation: "venue_zones";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "play_surfaces_parent_field_id_fkey";
            columns: ["parent_field_id"];
            isOneToOne: false;
            referencedRelation: "fields";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "play_surfaces_field_id_fkey";
            columns: ["field_id"];
            isOneToOne: false;
            referencedRelation: "fields";
            referencedColumns: ["id"];
          },
        ];
      };
      field_layouts: {
        Row: {
          id: string;
          organization_id: string | null;
          venue_id: string;
          parent_field_id: string | null;
          layout_name: string;
          layout_type: string;
          is_active: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          venue_id: string;
          parent_field_id?: string | null;
          layout_name: string;
          layout_type?: string;
          is_active?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          venue_id?: string;
          parent_field_id?: string | null;
          layout_name?: string;
          layout_type?: string;
          is_active?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "field_layouts_venue_id_fkey";
            columns: ["venue_id"];
            isOneToOne: false;
            referencedRelation: "venues";
            referencedColumns: ["id"];
          },
        ];
      };
      field_layout_surfaces: {
        Row: {
          layout_id: string;
          play_surface_id: string;
          created_at: string;
        };
        Insert: {
          layout_id: string;
          play_surface_id: string;
          created_at?: string;
        };
        Update: {
          layout_id?: string;
          play_surface_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "field_layout_surfaces_layout_id_fkey";
            columns: ["layout_id"];
            isOneToOne: false;
            referencedRelation: "field_layouts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "field_layout_surfaces_play_surface_id_fkey";
            columns: ["play_surface_id"];
            isOneToOne: false;
            referencedRelation: "play_surfaces";
            referencedColumns: ["id"];
          },
        ];
      };
      venue_mode_endpoints: {
        Row: {
          id: string;
          organization_id: string | null;
          venue_id: string;
          endpoint_type: string;
          provider_key: string;
          endpoint_label: string;
          endpoint_url: string | null;
          status: string;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          venue_id: string;
          endpoint_type: string;
          provider_key?: string;
          endpoint_label: string;
          endpoint_url?: string | null;
          status?: string;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          venue_id?: string;
          endpoint_type?: string;
          provider_key?: string;
          endpoint_label?: string;
          endpoint_url?: string | null;
          status?: string;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "venue_mode_endpoints_venue_id_fkey";
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
      weather_profiles: {
        Row: {
          id: string;
          venue_id: string;
          location_name: string;
          latitude: number | null;
          longitude: number | null;
          weather_source: string;
          status: string;
          notes: string | null;
          auto_response_mode: string;
          wind_threshold_mph: number;
          rain_sensitivity: string;
          notify_parents: boolean;
          notify_umpires: boolean;
          notify_staff: boolean;
          auto_last_triggered_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          venue_id: string;
          location_name: string;
          latitude?: number | null;
          longitude?: number | null;
          weather_source?: string;
          status?: string;
          notes?: string | null;
          auto_response_mode?: string;
          wind_threshold_mph?: number;
          rain_sensitivity?: string;
          notify_parents?: boolean;
          notify_umpires?: boolean;
          notify_staff?: boolean;
          auto_last_triggered_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          venue_id?: string;
          location_name?: string;
          latitude?: number | null;
          longitude?: number | null;
          weather_source?: string;
          status?: string;
          notes?: string | null;
          auto_response_mode?: string;
          wind_threshold_mph?: number;
          rain_sensitivity?: string;
          notify_parents?: boolean;
          notify_umpires?: boolean;
          notify_staff?: boolean;
          auto_last_triggered_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "weather_profiles_venue_id_fkey";
            columns: ["venue_id"];
            isOneToOne: false;
            referencedRelation: "venues";
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
          play_surface_id: string | null;
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
          lifecycle_status?: string | null;
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
          scorekeeper_token: string | null;
          scorekeeper_pin: string | null;
          scorekeeper_seq: number;
          gdt_team_season_id: string | null;
          gdt_home_team_season_id: string | null;
          gdt_away_team_season_id: string | null;
          gdt_sync_status: string;
          gdt_last_synced_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          field_id: string;
          play_surface_id?: string | null;
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
          lifecycle_status?: string | null;
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
          scorekeeper_token?: string | null;
          scorekeeper_pin?: string | null;
          scorekeeper_seq?: number;
          gdt_team_season_id?: string | null;
          gdt_home_team_season_id?: string | null;
          gdt_away_team_season_id?: string | null;
          gdt_sync_status?: string;
          gdt_last_synced_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          field_id?: string;
          play_surface_id?: string | null;
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
          lifecycle_status?: string | null;
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
          scorekeeper_token?: string | null;
          scorekeeper_pin?: string | null;
          scorekeeper_seq?: number;
          gdt_team_season_id?: string | null;
          gdt_home_team_season_id?: string | null;
          gdt_away_team_season_id?: string | null;
          gdt_sync_status?: string;
          gdt_last_synced_at?: string | null;
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
            foreignKeyName: "sessions_play_surface_id_fkey";
            columns: ["play_surface_id"];
            isOneToOne: false;
            referencedRelation: "play_surfaces";
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
          category?: string | null;
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
          category?: string | null;
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
          category?: string | null;
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
      game_live_state: {
        Row: {
          game_id: string;
          organization_id: string | null;
          sport_type: string;
          score_home: number;
          score_away: number;
          state: Record<string, unknown>;
          version: number;
          updated_by_actor_type: string | null;
          updated_by_actor_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          game_id: string;
          organization_id?: string | null;
          sport_type?: string;
          score_home?: number;
          score_away?: number;
          state?: Record<string, unknown>;
          version?: number;
          updated_by_actor_type?: string | null;
          updated_by_actor_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          organization_id?: string | null;
          sport_type?: string;
          score_home?: number;
          score_away?: number;
          state?: Record<string, unknown>;
          version?: number;
          updated_by_actor_type?: string | null;
          updated_by_actor_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "game_live_state_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: true;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      game_events: {
        Row: {
          id: string;
          organization_id: string | null;
          game_id: string;
          event_type: string;
          event_version: number;
          occurred_at: string;
          recorded_at: string;
          actor_type: string;
          actor_id: string | null;
          source_type: string;
          source_id: string | null;
          correlation_id: string | null;
          causation_id: string | null;
          idempotency_key: string | null;
          payload: Record<string, unknown>;
          metadata: Record<string, unknown>;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          game_id: string;
          event_type: string;
          event_version?: number;
          occurred_at?: string;
          recorded_at?: string;
          actor_type?: string;
          actor_id?: string | null;
          source_type?: string;
          source_id?: string | null;
          correlation_id?: string | null;
          causation_id?: string | null;
          idempotency_key?: string | null;
          payload?: Record<string, unknown>;
          metadata?: Record<string, unknown>;
        };
        Update: never;
        Relationships: [
          {
            foreignKeyName: "game_events_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      game_engine_apply: {
        Args: {
          p_game_id: string;
          p_expected_version: number | null;
          p_score_home: number | null;
          p_score_away: number | null;
          p_state: Record<string, unknown>;
          p_lifecycle_status: string | null;
          p_organization_id: string | null;
          p_sport_type: string;
          p_event_type: string;
          p_event_version: number;
          p_occurred_at: string;
          p_actor_type: string;
          p_actor_id: string | null;
          p_source_type: string;
          p_source_id: string | null;
          p_correlation_id: string | null;
          p_causation_id: string | null;
          p_idempotency_key: string | null;
          p_payload: Record<string, unknown>;
          p_metadata: Record<string, unknown>;
        };
        Returns: Array<{ accepted: boolean; replayed: boolean; new_version: number }>;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
