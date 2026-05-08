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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      account_share_visibilities: {
        Row: {
          account_id: string
          created_at: string
          space_id: string
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          space_id: string
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          space_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_share_visibilities_account_id_space_id_fkey"
            columns: ["account_id", "space_id"]
            isOneToOne: false
            referencedRelation: "account_shares"
            referencedColumns: ["account_id", "space_id"]
          },
          {
            foreignKeyName: "account_share_visibilities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      account_shares: {
        Row: {
          account_id: string
          created_at: string
          share_balances: boolean
          share_transactions: boolean
          space_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          share_balances?: boolean
          share_transactions?: boolean
          space_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          share_balances?: boolean
          share_transactions?: boolean
          space_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_shares_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_shares_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          available_balance: number | null
          color: string | null
          created_at: string
          currency: string
          current_balance: number | null
          display_name: string | null
          id: string
          last_synced_at: string | null
          mask: string | null
          name: string
          owner_user_id: string
          plaid_account_id: string
          plaid_item_id: string
          subtype: string | null
          type: Database["public"]["Enums"]["account_type_t"]
          updated_at: string
        }
        Insert: {
          available_balance?: number | null
          color?: string | null
          created_at?: string
          currency?: string
          current_balance?: number | null
          display_name?: string | null
          id?: string
          last_synced_at?: string | null
          mask?: string | null
          name: string
          owner_user_id: string
          plaid_account_id: string
          plaid_item_id: string
          subtype?: string | null
          type: Database["public"]["Enums"]["account_type_t"]
          updated_at?: string
        }
        Update: {
          available_balance?: number | null
          color?: string | null
          created_at?: string
          currency?: string
          current_balance?: number | null
          display_name?: string | null
          id?: string
          last_synced_at?: string | null
          mask?: string | null
          name?: string
          owner_user_id?: string
          plaid_account_id?: string
          plaid_item_id?: string
          subtype?: string | null
          type?: Database["public"]["Enums"]["account_type_t"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_plaid_item_id_fkey"
            columns: ["plaid_item_id"]
            isOneToOne: false
            referencedRelation: "plaid_items"
            referencedColumns: ["id"]
          },
        ]
      }
      // hand-edited: see migration 20260511_bill_reminders_payee
      bill_reminders: {
        Row: {
          bill_id: string
          created_at: string
          days_before: number | null
          enabled: boolean
          id: string
          kind: Database["public"]["Enums"]["bill_reminder_kind_t"]
          time_of_day: string
          updated_at: string
        }
        Insert: {
          bill_id: string
          created_at?: string
          days_before?: number | null
          enabled?: boolean
          id?: string
          kind: Database["public"]["Enums"]["bill_reminder_kind_t"]
          time_of_day?: string
          updated_at?: string
        }
        Update: {
          bill_id?: string
          created_at?: string
          days_before?: number | null
          enabled?: boolean
          id?: string
          kind?: Database["public"]["Enums"]["bill_reminder_kind_t"]
          time_of_day?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bill_reminders_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_payments: {
        Row: {
          amount: number
          bill_id: string
          id: string
          paid_at: string
          status: Database["public"]["Enums"]["bill_payment_status_t"]
          transaction_id: string | null
        }
        Insert: {
          amount: number
          bill_id: string
          id?: string
          paid_at: string
          status?: Database["public"]["Enums"]["bill_payment_status_t"]
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          bill_id?: string
          id?: string
          paid_at?: string
          status?: Database["public"]["Enums"]["bill_payment_status_t"]
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bill_payments_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_payments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      bills: {
        Row: {
          amount: number
          autopay: boolean
          cadence: Database["public"]["Enums"]["cadence_t"]
          // hand-edited: see migration 20260507_bills_income_category
          category: string | null
          created_at: string
          due_day: number | null
          id: string
          linked_account_id: string | null
          name: string
          next_due_at: string
          // hand-edited: see migration 20260511_bill_reminders_payee
          notes: string | null
          owner_user_id: string
          // hand-edited: see migration 20260511_bill_reminders_payee
          payee_glyph: string | null
          // hand-edited: see migration 20260511_bill_reminders_payee
          payee_hue: number | null
          recurring_group_id: string | null
          source: Database["public"]["Enums"]["bill_source_t"]
          space_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          autopay?: boolean
          cadence: Database["public"]["Enums"]["cadence_t"]
          category?: string | null
          created_at?: string
          due_day?: number | null
          id?: string
          linked_account_id?: string | null
          name: string
          next_due_at: string
          notes?: string | null
          owner_user_id: string
          payee_glyph?: string | null
          payee_hue?: number | null
          recurring_group_id?: string | null
          source?: Database["public"]["Enums"]["bill_source_t"]
          space_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          autopay?: boolean
          cadence?: Database["public"]["Enums"]["cadence_t"]
          category?: string | null
          created_at?: string
          due_day?: number | null
          id?: string
          linked_account_id?: string | null
          name?: string
          next_due_at?: string
          notes?: string | null
          owner_user_id?: string
          payee_glyph?: string | null
          payee_hue?: number | null
          recurring_group_id?: string | null
          source?: Database["public"]["Enums"]["bill_source_t"]
          space_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bills_linked_account_id_fkey"
            columns: ["linked_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          category: string
          created_at: string
          id: string
          limit_amount: number
          period: Database["public"]["Enums"]["budget_period_t"]
          rollover: boolean
          space_id: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          limit_amount: number
          period?: Database["public"]["Enums"]["budget_period_t"]
          rollover?: boolean
          space_id: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          limit_amount?: number
          period?: Database["public"]["Enums"]["budget_period_t"]
          rollover?: boolean
          space_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          apr_bps: number | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["goal_kind_t"]
          linked_account_id: string | null
          monthly_contribution: number | null
          name: string
          space_id: string
          starting_amount: number | null
          target_amount: number
          target_date: string | null
          term_months: number | null
          updated_at: string
        }
        Insert: {
          apr_bps?: number | null
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["goal_kind_t"]
          linked_account_id?: string | null
          monthly_contribution?: number | null
          name: string
          space_id: string
          starting_amount?: number | null
          target_amount: number
          target_date?: string | null
          term_months?: number | null
          updated_at?: string
        }
        Update: {
          apr_bps?: number | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["goal_kind_t"]
          linked_account_id?: string | null
          monthly_contribution?: number | null
          name?: string
          space_id?: string
          starting_amount?: number | null
          target_amount?: number
          target_date?: string | null
          term_months?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_linked_account_id_fkey"
            columns: ["linked_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_shares: {
        Row: {
          created_at: string
          goal_id: string
          space_id: string
        }
        Insert: {
          created_at?: string
          goal_id: string
          space_id: string
        }
        Update: {
          created_at?: string
          goal_id?: string
          space_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_shares_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_shares_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      income_events: {
        Row: {
          actual_amount: number | null
          amount: number
          // hand-edited: see migration 20260512_income_redesign
          amount_high: number | null
          amount_low: number | null
          autopay: boolean
          cadence: Database["public"]["Enums"]["cadence_t"]
          // hand-edited: see migration 20260507_bills_income_category
          category: string | null
          created_at: string
          due_day: number | null
          id: string
          linked_account_id: string | null
          name: string
          next_due_at: string
          owner_user_id: string
          // hand-edited: see migration 20260512_income_redesign
          paused_at: string | null
          received_at: string | null
          recurring_group_id: string | null
          source: Database["public"]["Enums"]["bill_source_t"]
          // hand-edited: see migration 20260512_income_redesign
          source_type: Database["public"]["Enums"]["income_source_t"]
          space_id: string
          updated_at: string
        }
        Insert: {
          actual_amount?: number | null
          amount: number
          amount_high?: number | null
          amount_low?: number | null
          autopay?: boolean
          cadence: Database["public"]["Enums"]["cadence_t"]
          category?: string | null
          created_at?: string
          due_day?: number | null
          id?: string
          linked_account_id?: string | null
          name: string
          next_due_at: string
          owner_user_id: string
          paused_at?: string | null
          received_at?: string | null
          recurring_group_id?: string | null
          source?: Database["public"]["Enums"]["bill_source_t"]
          source_type?: Database["public"]["Enums"]["income_source_t"]
          space_id: string
          updated_at?: string
        }
        Update: {
          actual_amount?: number | null
          amount?: number
          amount_high?: number | null
          amount_low?: number | null
          autopay?: boolean
          cadence?: Database["public"]["Enums"]["cadence_t"]
          category?: string | null
          created_at?: string
          due_day?: number | null
          id?: string
          linked_account_id?: string | null
          name?: string
          next_due_at?: string
          owner_user_id?: string
          paused_at?: string | null
          received_at?: string | null
          recurring_group_id?: string | null
          source?: Database["public"]["Enums"]["bill_source_t"]
          source_type?: Database["public"]["Enums"]["income_source_t"]
          space_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "income_events_linked_account_id_fkey"
            columns: ["linked_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "income_events_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "income_events_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      // hand-edited: see migration 20260512_income_redesign
      income_receipts: {
        Row: {
          amount: number
          created_at: string
          id: string
          income_event_id: string
          received_at: string
          transaction_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          income_event_id: string
          received_at: string
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          income_event_id?: string
          received_at?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "income_receipts_income_event_id_fkey"
            columns: ["income_event_id"]
            isOneToOne: false
            referencedRelation: "income_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "income_receipts_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_user_id: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          space_id: string
          token: string
        }
        Insert: {
          accepted_user_id?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          space_id: string
          token?: string
        }
        Update: {
          accepted_user_id?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          space_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_accepted_user_id_fkey"
            columns: ["accepted_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_renames: {
        Row: {
          created_at: string
          display_name: string
          id: string
          normalized_merchant: string
          owner_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          normalized_merchant: string
          owner_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          normalized_merchant?: string
          owner_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_renames_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          kind: string
          payload: Json
          read_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          payload?: Json
          read_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          payload?: Json
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_link_cards: {
        Row: {
          card_account_id: string
          payment_link_id: string
          split_pct: number
        }
        Insert: {
          card_account_id: string
          payment_link_id: string
          split_pct: number
        }
        Update: {
          card_account_id?: string
          payment_link_id?: string
          split_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "payment_link_cards_card_account_id_fkey"
            columns: ["card_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_link_cards_payment_link_id_fkey"
            columns: ["payment_link_id"]
            isOneToOne: false
            referencedRelation: "payment_links"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_links: {
        Row: {
          created_at: string
          cross_space: boolean
          funding_account_id: string
          id: string
          name: string
          owner_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cross_space?: boolean
          funding_account_id: string
          id?: string
          name: string
          owner_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cross_space?: boolean
          funding_account_id?: string
          id?: string
          name?: string
          owner_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_links_funding_account_id_fkey"
            columns: ["funding_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_links_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      plaid_items: {
        Row: {
          access_token: string
          created_at: string
          cursor: string | null
          id: string
          institution_name: string | null
          owner_user_id: string
          plaid_item_id: string
          status: string
          updated_at: string
        }
        Insert: {
          access_token: string
          created_at?: string
          cursor?: string | null
          id?: string
          institution_name?: string | null
          owner_user_id: string
          plaid_item_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          created_at?: string
          cursor?: string | null
          id?: string
          institution_name?: string | null
          owner_user_id?: string
          plaid_item_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plaid_items_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      space_members: {
        Row: {
          accepted_at: string | null
          can_delete: boolean
          can_invite: boolean
          can_rename: boolean
          created_at: string
          id: string
          invited_email: string | null
          role: Database["public"]["Enums"]["space_role_t"]
          space_id: string
          user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          can_delete?: boolean
          can_invite?: boolean
          can_rename?: boolean
          created_at?: string
          id?: string
          invited_email?: string | null
          role?: Database["public"]["Enums"]["space_role_t"]
          space_id: string
          user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          can_delete?: boolean
          can_invite?: boolean
          can_rename?: boolean
          created_at?: string
          id?: string
          invited_email?: string | null
          role?: Database["public"]["Enums"]["space_role_t"]
          space_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "space_members_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "space_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      spaces: {
        Row: {
          created_at: string
          id: string
          members_can_edit: boolean
          mine_shared_enabled: boolean
          name: string
          owner_user_id: string
          share_balances_default: boolean
          share_transactions_default: boolean
          tint: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          members_can_edit?: boolean
          mine_shared_enabled?: boolean
          name: string
          owner_user_id: string
          share_balances_default?: boolean
          share_transactions_default?: boolean
          tint?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          members_can_edit?: boolean
          mine_shared_enabled?: boolean
          name?: string
          owner_user_id?: string
          share_balances_default?: boolean
          share_transactions_default?: boolean
          tint?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "spaces_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          bill_reminders: boolean
          budget_warnings: boolean
          email_enabled: boolean
          goal_milestones: boolean
          large_transactions: boolean
          large_txn_personal_cents: number
          large_txn_shared_cents: number
          low_balance: boolean
          low_balance_threshold_cents: number
          plaid_connection_issues: boolean
          push_enabled: boolean
          quiet_hours_enabled: boolean
          quiet_hours_end: string
          quiet_hours_start: string
          sms_enabled: boolean
          time_zone: string
          unusual_spending: boolean
          updated_at: string
          user_id: string
          weekly_summary: boolean
        }
        Insert: {
          bill_reminders?: boolean
          budget_warnings?: boolean
          email_enabled?: boolean
          goal_milestones?: boolean
          large_transactions?: boolean
          large_txn_personal_cents?: number
          large_txn_shared_cents?: number
          low_balance?: boolean
          low_balance_threshold_cents?: number
          plaid_connection_issues?: boolean
          push_enabled?: boolean
          quiet_hours_enabled?: boolean
          quiet_hours_end?: string
          quiet_hours_start?: string
          sms_enabled?: boolean
          time_zone?: string
          unusual_spending?: boolean
          updated_at?: string
          user_id: string
          weekly_summary?: boolean
        }
        Update: {
          bill_reminders?: boolean
          budget_warnings?: boolean
          email_enabled?: boolean
          goal_milestones?: boolean
          large_transactions?: boolean
          large_txn_personal_cents?: number
          large_txn_shared_cents?: number
          low_balance?: boolean
          low_balance_threshold_cents?: number
          plaid_connection_issues?: boolean
          push_enabled?: boolean
          quiet_hours_enabled?: boolean
          quiet_hours_end?: string
          quiet_hours_start?: string
          sms_enabled?: boolean
          time_zone?: string
          unusual_spending?: boolean
          updated_at?: string
          user_id?: string
          weekly_summary?: boolean
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          status: string
          stripe_subscription_id: string | null
          tier: Database["public"]["Enums"]["tier_t"]
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          status: string
          stripe_subscription_id?: string | null
          tier: Database["public"]["Enums"]["tier_t"]
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          status?: string
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["tier_t"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_shares: {
        Row: {
          hidden: boolean
          space_id: string
          transaction_id: string
        }
        Insert: {
          hidden?: boolean
          space_id: string
          transaction_id: string
        }
        Update: {
          hidden?: boolean
          space_id?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_shares_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_shares_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_splits: {
        Row: {
          amount: number
          category: string
          created_at: string
          id: string
          space_id: string
          transaction_id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          id?: string
          space_id: string
          transaction_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          id?: string
          space_id?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_splits_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_splits_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          category: string | null
          created_at: string
          display_name: string | null
          id: string
          is_recurring: boolean
          merchant_name: string | null
          note: string | null
          owner_user_id: string
          pending: boolean
          plaid_transaction_id: string
          posted_at: string
          recurring_group_id: string | null
          subcategory: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          amount: number
          category?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_recurring?: boolean
          merchant_name?: string | null
          note?: string | null
          owner_user_id: string
          pending?: boolean
          plaid_transaction_id: string
          posted_at: string
          recurring_group_id?: string | null
          subcategory?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          amount?: number
          category?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_recurring?: boolean
          merchant_name?: string | null
          note?: string | null
          owner_user_id?: string
          pending?: boolean
          plaid_transaction_id?: string
          posted_at?: string
          recurring_group_id?: string | null
          subcategory?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          default_space_id: string | null
          display_name: string | null
          id: string
          stripe_customer_id: string | null
          tier: Database["public"]["Enums"]["tier_t"]
          tier_expires_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_space_id?: string | null
          display_name?: string | null
          id: string
          stripe_customer_id?: string | null
          tier?: Database["public"]["Enums"]["tier_t"]
          tier_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_space_id?: string | null
          display_name?: string | null
          id?: string
          stripe_customer_id?: string | null
          tier?: Database["public"]["Enums"]["tier_t"]
          tier_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_default_space_fk"
            columns: ["default_space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _push: { Args: { t: string }; Returns: undefined }
      claim_invitation: { Args: { p_token: string }; Returns: Json }
      payment_link_visible_to_member: {
        Args: { p_link_id: string }
        Returns: boolean
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      user_can_see_space: { Args: { p_space_id: string }; Returns: boolean }
      user_is_space_owner: { Args: { p_space_id: string }; Returns: boolean }
    }
    Enums: {
      account_type_t: "depository" | "credit" | "loan" | "investment" | "other"
      bill_payment_status_t: "paid" | "overdue" | "skipped"
      bill_reminder_kind_t: "days_before" | "on_due_date" | "mute_all"
      bill_source_t: "detected" | "manual"
      budget_period_t: "monthly" | "weekly"
      cadence_t:
        | "monthly"
        | "weekly"
        | "biweekly"
        | "yearly"
        | "custom"
        | "once"
      goal_kind_t: "save" | "payoff"
      // hand-edited: see migration 20260512_income_redesign
      income_source_t:
        | "paycheck"
        | "freelance"
        | "rental"
        | "investment"
        | "one_time"
      space_role_t: "owner" | "member"
      tier_t: "starter" | "pro" | "household"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          deleted_at: string | null
          format: string
          id: string
          name: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      buckets_vectors: {
        Row: {
          created_at: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          metadata: Json | null
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_indexes: {
        Row: {
          bucket_id: string
          created_at: string
          data_type: string
          dimension: number
          distance_metric: string
          id: string
          metadata_configuration: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          data_type: string
          dimension: number
          distance_metric: string
          id?: string
          metadata_configuration?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          data_type?: string
          dimension?: number
          distance_metric?: string
          id?: string
          metadata_configuration?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets_vectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allow_any_operation: {
        Args: { expected_operations: string[] }
        Returns: boolean
      }
      allow_only_operation: {
        Args: { expected_operation: string }
        Returns: boolean
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      get_common_prefix: {
        Args: { p_delimiter: string; p_key: string; p_prefix: string }
        Returns: string
      }
      get_size_by_bucket: {
        Args: never
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          _bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      operation: { Args: never; Returns: string }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_by_timestamp: {
        Args: {
          p_bucket_id: string
          p_level: number
          p_limit: number
          p_prefix: string
          p_sort_column: string
          p_sort_column_after: string
          p_sort_order: string
          p_start_after: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          sort_column?: string
          sort_column_after?: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      account_type_t: ["depository", "credit", "loan", "investment", "other"],
      bill_payment_status_t: ["paid", "overdue", "skipped"],
      bill_reminder_kind_t: ["days_before", "on_due_date", "mute_all"],
      bill_source_t: ["detected", "manual"],
      budget_period_t: ["monthly", "weekly"],
      cadence_t: ["monthly", "weekly", "biweekly", "yearly", "custom", "once"],
      goal_kind_t: ["save", "payoff"],
      // hand-edited: see migration 20260512_income_redesign
      income_source_t: ["paycheck", "freelance", "rental", "investment", "one_time"],
      space_role_t: ["owner", "member"],
      tier_t: ["starter", "pro", "household"],
    },
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const
