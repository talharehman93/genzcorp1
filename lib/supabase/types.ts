export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
    Tables: {
      vendors: {
        Row: {
          id: string
          name: string
          email: string
          link_slug: string
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          link_slug: string
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          link_slug?: string
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          role: 'super_admin' | 'vendor'
          vendor_id: string | null
          full_name: string | null
          is_suspended: boolean
          created_at: string
        }
        Insert: {
          id: string
          role?: 'super_admin' | 'vendor'
          vendor_id?: string | null
          full_name?: string | null
          is_suspended?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          role?: 'super_admin' | 'vendor'
          vendor_id?: string | null
          full_name?: string | null
          is_suspended?: boolean
          created_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          id: string
          vendor_id: string
          customer_email: string
          amount: number
          payment_method: 'cashapp' | 'googlepay' | 'applepay'
          status: 'pending' | 'processing' | 'completed' | 'expired' | 'failed'
          merchant_reference: string
          taptap_token: string | null
          taptap_order_id: string | null
          product_id: number | null
          custom_label: string | null
          is_verified: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          vendor_id: string
          customer_email: string
          amount: number
          payment_method: 'cashapp' | 'googlepay' | 'applepay'
          status?: 'pending' | 'processing' | 'completed' | 'expired' | 'failed'
          merchant_reference: string
          taptap_token?: string | null
          taptap_order_id?: string | null
          product_id?: number | null
          custom_label?: string | null
          is_verified?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          vendor_id?: string
          customer_email?: string
          amount?: number
          payment_method?: 'cashapp' | 'googlepay' | 'applepay'
          status?: 'pending' | 'processing' | 'completed' | 'expired' | 'failed'
          merchant_reference?: string
          taptap_token?: string | null
          taptap_order_id?: string | null
          product_id?: number | null
          custom_label?: string | null
          is_verified?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      customer_stats: {
        Row: {
          vendor_id: string | null
          customer_email: string | null
          total_transactions: number | null
          lifetime_value: number | null
          success_count: number | null
          failed_count: number | null
          pending_count: number | null
          last_transaction_at: string | null
        }
        Relationships: []
      }
      vendor_settlements: {
        Row: {
          vendor_id: string | null
          vendor_name: string | null
          vendor_email: string | null
          total_transactions: number | null
          success_count: number | null
          failed_count: number | null
          pending_count: number | null
          total_received: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      is_super_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      my_vendor_id: {
        Args: Record<string, never>
        Returns: string
      }
    }
  }
}

export type Vendor = Database['public']['Tables']['vendors']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Transaction = Database['public']['Tables']['transactions']['Row']
export type TransactionInsert = Database['public']['Tables']['transactions']['Insert']
export type TransactionUpdate = Database['public']['Tables']['transactions']['Update']
export type CustomerStats = Database['public']['Views']['customer_stats']['Row']
export type VendorSettlement = Database['public']['Views']['vendor_settlements']['Row']
