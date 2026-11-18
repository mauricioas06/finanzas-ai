// Generado desde Supabase. No editar a mano: regenerar tras cada migración.
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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      ai_conversations: {
        Row: {
          agent: string
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agent: string
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agent?: string
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          cost_usd: number | null
          created_at: string
          id: string
          input_tokens: number | null
          model: string | null
          output_tokens: number | null
          role: string
          tool_calls: Json | null
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          cost_usd?: number | null
          created_at?: string
          id?: string
          input_tokens?: number | null
          model?: string | null
          output_tokens?: number | null
          role: string
          tool_calls?: Json | null
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          cost_usd?: number | null
          created_at?: string
          id?: string
          input_tokens?: number | null
          model?: string | null
          output_tokens?: number | null
          role?: string
          tool_calls?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_user_id_fkey"
            columns: ["conversation_id", "user_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor: string | null
          created_at: string
          id: number
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          actor?: string | null
          created_at?: string
          id?: never
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          actor?: string | null
          created_at?: string
          id?: never
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      billing_cycles: {
        Row: {
          created_at: string
          credit_card_id: string
          fees_charged: number
          id: string
          interest_charged: number
          minimum_payment: number | null
          no_interest_payment: number | null
          payment_due_date: string
          period_start: string
          statement_balance: number | null
          statement_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credit_card_id: string
          fees_charged?: number
          id?: string
          interest_charged?: number
          minimum_payment?: number | null
          no_interest_payment?: number | null
          payment_due_date: string
          period_start: string
          statement_balance?: number | null
          statement_date: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credit_card_id?: string
          fees_charged?: number
          id?: string
          interest_charged?: number
          minimum_payment?: number | null
          no_interest_payment?: number | null
          payment_due_date?: string
          period_start?: string
          statement_balance?: number | null
          statement_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_cycles_credit_card_id_user_id_fkey"
            columns: ["credit_card_id", "user_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      bucket_movements: {
        Row: {
          allocation_item_id: string | null
          amount: number
          bucket_id: string
          created_at: string
          id: string
          kind: string
          note: string | null
          occurred_on: string
          user_id: string
        }
        Insert: {
          allocation_item_id?: string | null
          amount: number
          bucket_id: string
          created_at?: string
          id?: string
          kind: string
          note?: string | null
          occurred_on: string
          user_id: string
        }
        Update: {
          allocation_item_id?: string | null
          amount?: number
          bucket_id?: string
          created_at?: string
          id?: string
          kind?: string
          note?: string | null
          occurred_on?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bucket_movements_allocation_item_id_user_id_fkey"
            columns: ["allocation_item_id", "user_id"]
            isOneToOne: false
            referencedRelation: "income_allocation_items"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "bucket_movements_bucket_id_user_id_fkey"
            columns: ["bucket_id", "user_id"]
            isOneToOne: false
            referencedRelation: "financial_buckets"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      credit_cards: {
        Row: {
          created_at: string
          credit_limit: number
          debt_id: string
          id: string
          payment_due_day: number
          statement_day: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credit_limit: number
          debt_id: string
          id?: string
          payment_due_day: number
          statement_day: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credit_limit?: number
          debt_id?: string
          id?: string
          payment_due_day?: number
          statement_day?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_cards_debt_id_user_id_fkey"
            columns: ["debt_id", "user_id"]
            isOneToOne: false
            referencedRelation: "debts"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      debt_payments: {
        Row: {
          amount: number
          billing_cycle_id: string | null
          created_at: string
          debt_id: string
          id: string
          kind: string
          notes: string | null
          occurred_on: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          billing_cycle_id?: string | null
          created_at?: string
          debt_id: string
          id?: string
          kind: string
          notes?: string | null
          occurred_on: string
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          billing_cycle_id?: string | null
          created_at?: string
          debt_id?: string
          id?: string
          kind?: string
          notes?: string | null
          occurred_on?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "debt_payments_billing_cycle_id_user_id_fkey"
            columns: ["billing_cycle_id", "user_id"]
            isOneToOne: false
            referencedRelation: "billing_cycles"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "debt_payments_debt_id_user_id_fkey"
            columns: ["debt_id", "user_id"]
            isOneToOne: false
            referencedRelation: "debts"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "debt_payments_transaction_id_user_id_fkey"
            columns: ["transaction_id", "user_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      debts: {
        Row: {
          annual_interest_rate: number | null
          created_at: string
          current_balance: number
          debt_type: string
          end_date: string | null
          fixed_payment: number | null
          id: string
          institution: string
          minimum_payment: number | null
          name: string
          notes: string | null
          original_amount: number | null
          payment_due_day: number | null
          start_date: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          annual_interest_rate?: number | null
          created_at?: string
          current_balance?: number
          debt_type: string
          end_date?: string | null
          fixed_payment?: number | null
          id?: string
          institution: string
          minimum_payment?: number | null
          name: string
          notes?: string | null
          original_amount?: number | null
          payment_due_day?: number | null
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          annual_interest_rate?: number | null
          created_at?: string
          current_balance?: number
          debt_type?: string
          end_date?: string | null
          fixed_payment?: number | null
          id?: string
          institution?: string
          minimum_payment?: number | null
          name?: string
          notes?: string | null
          original_amount?: number | null
          payment_due_day?: number | null
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      expense_categories: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          is_archived: boolean
          is_essential: boolean
          monthly_budget: number | null
          name: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_archived?: boolean
          is_essential?: boolean
          monthly_budget?: number | null
          name: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_archived?: boolean
          is_essential?: boolean
          monthly_budget?: number | null
          name?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      financial_buckets: {
        Row: {
          balance: number
          bucket_type: string
          color: string | null
          contribution_frequency: string | null
          created_at: string
          icon: string | null
          id: string
          is_archived: boolean
          linked_debt_id: string | null
          name: string
          priority: number
          target_amount: number | null
          target_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          bucket_type: string
          color?: string | null
          contribution_frequency?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_archived?: boolean
          linked_debt_id?: string | null
          name: string
          priority?: number
          target_amount?: number | null
          target_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          bucket_type?: string
          color?: string | null
          contribution_frequency?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_archived?: boolean
          linked_debt_id?: string | null
          name?: string
          priority?: number
          target_amount?: number | null
          target_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_buckets_linked_debt_id_user_id_fkey"
            columns: ["linked_debt_id", "user_id"]
            isOneToOne: false
            referencedRelation: "debts"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      financial_goals: {
        Row: {
          bucket_id: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          priority: number
          status: string
          target_amount: number
          target_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          priority?: number
          status?: string
          target_amount: number
          target_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bucket_id?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          priority?: number
          status?: string
          target_amount?: number
          target_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_goals_bucket_id_user_id_fkey"
            columns: ["bucket_id", "user_id"]
            isOneToOne: false
            referencedRelation: "financial_buckets"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      financial_news: {
        Row: {
          event_date: string | null
          fetched_at: string
          headline: string
          id: string
          impact: string | null
          provider: string | null
          published_at: string
          related_symbols: string[]
          risks: string | null
          sentiment: string | null
          source: string
          summary: string | null
          topics: string[]
          url: string
          verification_status: string
        }
        Insert: {
          event_date?: string | null
          fetched_at?: string
          headline: string
          id?: string
          impact?: string | null
          provider?: string | null
          published_at: string
          related_symbols?: string[]
          risks?: string | null
          sentiment?: string | null
          source: string
          summary?: string | null
          topics?: string[]
          url: string
          verification_status?: string
        }
        Update: {
          event_date?: string | null
          fetched_at?: string
          headline?: string
          id?: string
          impact?: string | null
          provider?: string | null
          published_at?: string
          related_symbols?: string[]
          risks?: string | null
          sentiment?: string | null
          source?: string
          summary?: string | null
          topics?: string[]
          url?: string
          verification_status?: string
        }
        Relationships: []
      }
      financial_snapshots: {
        Row: {
          allocated_total: number
          cash_total: number
          committed_total: number
          created_at: string
          debt_total: number
          details: Json
          expense_month: number
          id: string
          income_month: number
          invested_total: number
          net_worth: number
          snapshot_date: string
          user_id: string
        }
        Insert: {
          allocated_total: number
          cash_total: number
          committed_total: number
          created_at?: string
          debt_total: number
          details?: Json
          expense_month: number
          id?: string
          income_month: number
          invested_total: number
          net_worth: number
          snapshot_date: string
          user_id: string
        }
        Update: {
          allocated_total?: number
          cash_total?: number
          committed_total?: number
          created_at?: string
          debt_total?: number
          details?: Json
          expense_month?: number
          id?: string
          income_month?: number
          invested_total?: number
          net_worth?: number
          snapshot_date?: string
          user_id?: string
        }
        Relationships: []
      }
      income_allocation_items: {
        Row: {
          accepted_amount: number | null
          allocation_id: string
          bucket_id: string | null
          contribution_date: string | null
          debt_id: string | null
          explanation: string
          id: string
          label: string
          percentage: number
          priority: number
          recommended_amount: number
          sort_order: number
          status: string
          use_date: string | null
          user_id: string
        }
        Insert: {
          accepted_amount?: number | null
          allocation_id: string
          bucket_id?: string | null
          contribution_date?: string | null
          debt_id?: string | null
          explanation: string
          id?: string
          label: string
          percentage: number
          priority: number
          recommended_amount: number
          sort_order?: number
          status?: string
          use_date?: string | null
          user_id: string
        }
        Update: {
          accepted_amount?: number | null
          allocation_id?: string
          bucket_id?: string | null
          contribution_date?: string | null
          debt_id?: string | null
          explanation?: string
          id?: string
          label?: string
          percentage?: number
          priority?: number
          recommended_amount?: number
          sort_order?: number
          status?: string
          use_date?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "income_allocation_items_allocation_id_user_id_fkey"
            columns: ["allocation_id", "user_id"]
            isOneToOne: false
            referencedRelation: "income_allocations"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "income_allocation_items_bucket_id_user_id_fkey"
            columns: ["bucket_id", "user_id"]
            isOneToOne: false
            referencedRelation: "financial_buckets"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "income_allocation_items_debt_id_user_id_fkey"
            columns: ["debt_id", "user_id"]
            isOneToOne: false
            referencedRelation: "debts"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      income_allocations: {
        Row: {
          created_at: string
          decided_at: string | null
          engine_version: string
          id: string
          received_amount: number
          received_on: string
          status: string
          summary: string | null
          transaction_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          engine_version: string
          id?: string
          received_amount: number
          received_on: string
          status?: string
          summary?: string | null
          transaction_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          engine_version?: string
          id?: string
          received_amount?: number
          received_on?: string
          status?: string
          summary?: string | null
          transaction_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "income_allocations_transaction_id_user_id_fkey"
            columns: ["transaction_id", "user_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      income_sources: {
        Row: {
          created_at: string
          description: string | null
          expected_amount: number | null
          frequency: string
          id: string
          income_type: string
          is_active: boolean
          is_variable: boolean
          name: string
          next_expected_date: string | null
          pay_days: number[] | null
          pay_weekday: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          expected_amount?: number | null
          frequency: string
          id?: string
          income_type: string
          is_active?: boolean
          is_variable?: boolean
          name: string
          next_expected_date?: string | null
          pay_days?: number[] | null
          pay_weekday?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          expected_amount?: number | null
          frequency?: string
          id?: string
          income_type?: string
          is_active?: boolean
          is_variable?: boolean
          name?: string
          next_expected_date?: string | null
          pay_days?: number[] | null
          pay_weekday?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      investment_accounts: {
        Row: {
          account_type: string
          created_at: string
          currency: string
          id: string
          institution: string
          is_active: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_type: string
          created_at?: string
          currency?: string
          id?: string
          institution: string
          is_active?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_type?: string
          created_at?: string
          currency?: string
          id?: string
          institution?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      investment_analyses: {
        Row: {
          analysis_date: string
          asset_id: string
          catalysts: string[]
          created_at: string
          data_as_of: string
          fundamentals: Json
          horizon: string
          id: string
          model: string | null
          prompt_version: string
          rationale: string
          risk_level: string
          risks: string[]
          score_breakdown: Json
          technicals: Json
          total_score: number
        }
        Insert: {
          analysis_date: string
          asset_id: string
          catalysts?: string[]
          created_at?: string
          data_as_of: string
          fundamentals?: Json
          horizon: string
          id?: string
          model?: string | null
          prompt_version: string
          rationale: string
          risk_level: string
          risks?: string[]
          score_breakdown?: Json
          technicals?: Json
          total_score: number
        }
        Update: {
          analysis_date?: string
          asset_id?: string
          catalysts?: string[]
          created_at?: string
          data_as_of?: string
          fundamentals?: Json
          horizon?: string
          id?: string
          model?: string | null
          prompt_version?: string
          rationale?: string
          risk_level?: string
          risks?: string[]
          score_breakdown?: Json
          technicals?: Json
          total_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "investment_analyses_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "market_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      investment_positions: {
        Row: {
          account_id: string
          annual_rate: number | null
          asset_id: string | null
          average_cost: number
          created_at: string
          currency: string
          id: string
          instrument_name: string
          instrument_type: string
          manual_current_value: number | null
          manual_value_date: string | null
          maturity_date: string | null
          quantity: number
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          annual_rate?: number | null
          asset_id?: string | null
          average_cost?: number
          created_at?: string
          currency?: string
          id?: string
          instrument_name: string
          instrument_type: string
          manual_current_value?: number | null
          manual_value_date?: string | null
          maturity_date?: string | null
          quantity?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          annual_rate?: number | null
          asset_id?: string | null
          average_cost?: number
          created_at?: string
          currency?: string
          id?: string
          instrument_name?: string
          instrument_type?: string
          manual_current_value?: number | null
          manual_value_date?: string | null
          maturity_date?: string | null
          quantity?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investment_positions_account_id_user_id_fkey"
            columns: ["account_id", "user_id"]
            isOneToOne: false
            referencedRelation: "investment_accounts"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "investment_positions_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "market_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      investment_recommendations: {
        Row: {
          amount_available: number
          analysis_ids: string[]
          created_at: string
          data_as_of: string
          disclaimer_version: string
          id: string
          model: string | null
          recommendation: Json
          risk_profile: string
          status: string
          user_id: string
        }
        Insert: {
          amount_available: number
          analysis_ids?: string[]
          created_at?: string
          data_as_of: string
          disclaimer_version: string
          id?: string
          model?: string | null
          recommendation: Json
          risk_profile: string
          status?: string
          user_id: string
        }
        Update: {
          amount_available?: number
          analysis_ids?: string[]
          created_at?: string
          data_as_of?: string
          disclaimer_version?: string
          id?: string
          model?: string | null
          recommendation?: Json
          risk_profile?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      investment_transactions: {
        Row: {
          account_id: string
          created_at: string
          currency: string
          fees: number
          fx_rate_to_mxn: number | null
          id: string
          notes: string | null
          position_id: string | null
          price: number | null
          quantity: number | null
          total_amount: number
          trade_date: string
          tx_type: string
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          currency?: string
          fees?: number
          fx_rate_to_mxn?: number | null
          id?: string
          notes?: string | null
          position_id?: string | null
          price?: number | null
          quantity?: number | null
          total_amount: number
          trade_date: string
          tx_type: string
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          currency?: string
          fees?: number
          fx_rate_to_mxn?: number | null
          id?: string
          notes?: string | null
          position_id?: string | null
          price?: number | null
          quantity?: number | null
          total_amount?: number
          trade_date?: string
          tx_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investment_transactions_account_id_user_id_fkey"
            columns: ["account_id", "user_id"]
            isOneToOne: false
            referencedRelation: "investment_accounts"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "investment_transactions_position_id_user_id_fkey"
            columns: ["position_id", "user_id"]
            isOneToOne: false
            referencedRelation: "investment_positions"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      market_assets: {
        Row: {
          asset_class: string
          country: string | null
          created_at: string
          currency: string
          exchange: string | null
          id: string
          is_active: boolean
          name: string
          sector: string | null
          symbol: string
        }
        Insert: {
          asset_class: string
          country?: string | null
          created_at?: string
          currency: string
          exchange?: string | null
          id?: string
          is_active?: boolean
          name: string
          sector?: string | null
          symbol: string
        }
        Update: {
          asset_class?: string
          country?: string | null
          created_at?: string
          currency?: string
          exchange?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sector?: string | null
          symbol?: string
        }
        Relationships: []
      }
      market_prices: {
        Row: {
          asset_id: string
          close: number
          fetched_at: string
          high: number | null
          id: number
          low: number | null
          open: number | null
          price_date: string
          source: string
          volume: number | null
        }
        Insert: {
          asset_id: string
          close: number
          fetched_at?: string
          high?: number | null
          id?: never
          low?: number | null
          open?: number | null
          price_date: string
          source: string
          volume?: number | null
        }
        Update: {
          asset_id?: string
          close?: number
          fetched_at?: string
          high?: number | null
          id?: never
          low?: number | null
          open?: number | null
          price_date?: string
          source?: string
          volume?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "market_prices_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "market_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      money_accounts: {
        Row: {
          account_type: string
          balance: number
          created_at: string
          id: string
          institution: string | null
          is_active: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_type: string
          balance?: number
          created_at?: string
          id?: string
          institution?: string | null
          is_active?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_type?: string
          balance?: number
          created_at?: string
          id?: string
          institution?: string | null
          is_active?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          dedupe_key: string | null
          id: string
          read_at: string | null
          related_id: string | null
          related_table: string | null
          scheduled_for: string | null
          sent_at: string | null
          severity: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          dedupe_key?: string | null
          id?: string
          read_at?: string | null
          related_id?: string | null
          related_table?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          severity?: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          dedupe_key?: string | null
          id?: string
          read_at?: string | null
          related_id?: string | null
          related_table?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          severity?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      plan_limits: {
        Row: {
          description: string | null
          feature: string
          monthly_limit: number | null
          plan: string
        }
        Insert: {
          description?: string | null
          feature: string
          monthly_limit?: number | null
          plan: string
        }
        Update: {
          description?: string | null
          feature?: string
          monthly_limit?: number | null
          plan?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          currency: string
          emergency_fund_months: number
          full_name: string | null
          id: string
          locale: string
          onboarding_completed: boolean
          pay_frequency: string
          privacy_accepted_at: string | null
          risk_profile: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          emergency_fund_months?: number
          full_name?: string | null
          id: string
          locale?: string
          onboarding_completed?: boolean
          pay_frequency?: string
          privacy_accepted_at?: string | null
          risk_profile?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          emergency_fund_months?: number
          full_name?: string | null
          id?: string
          locale?: string
          onboarding_completed?: boolean
          pay_frequency?: string
          privacy_accepted_at?: string | null
          risk_profile?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      recurring_expenses: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          due_day: number | null
          frequency: string
          id: string
          is_active: boolean
          is_essential: boolean
          name: string
          next_due_date: string | null
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          due_day?: number | null
          frequency: string
          id?: string
          is_active?: boolean
          is_essential?: boolean
          name: string
          next_due_date?: string | null
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          due_day?: number | null
          frequency?: string
          id?: string
          is_active?: boolean
          is_essential?: boolean
          name?: string
          next_due_date?: string | null
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_expenses_category_id_user_id_fkey"
            columns: ["category_id", "user_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          plan: string
          provider: string | null
          provider_customer_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          plan?: string
          provider?: string | null
          provider_customer_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          plan?: string
          provider?: string | null
          provider_customer_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account_id: string | null
          amount: number
          category_id: string | null
          created_at: string
          debt_id: string | null
          description: string | null
          id: string
          income_source_id: string | null
          income_type: string | null
          kind: string
          occurred_on: string
          recurring_expense_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          category_id?: string | null
          created_at?: string
          debt_id?: string | null
          description?: string | null
          id?: string
          income_source_id?: string | null
          income_type?: string | null
          kind: string
          occurred_on: string
          recurring_expense_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          category_id?: string | null
          created_at?: string
          debt_id?: string | null
          description?: string | null
          id?: string
          income_source_id?: string | null
          income_type?: string | null
          kind?: string
          occurred_on?: string
          recurring_expense_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_user_id_fkey"
            columns: ["account_id", "user_id"]
            isOneToOne: false
            referencedRelation: "money_accounts"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "transactions_category_id_user_id_fkey"
            columns: ["category_id", "user_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "transactions_debt_id_user_id_fkey"
            columns: ["debt_id", "user_id"]
            isOneToOne: false
            referencedRelation: "debts"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "transactions_income_source_id_user_id_fkey"
            columns: ["income_source_id", "user_id"]
            isOneToOne: false
            referencedRelation: "income_sources"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "transactions_recurring_expense_id_user_id_fkey"
            columns: ["recurring_expense_id", "user_id"]
            isOneToOne: false
            referencedRelation: "recurring_expenses"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      usage_events: {
        Row: {
          cost_usd: number
          created_at: string
          feature: string
          id: number
          metadata: Json
          units: number
          user_id: string
        }
        Insert: {
          cost_usd?: number
          created_at?: string
          feature: string
          id?: never
          metadata?: Json
          units?: number
          user_id: string
        }
        Update: {
          cost_usd?: number
          created_at?: string
          feature?: string
          id?: never
          metadata?: Json
          units?: number
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
