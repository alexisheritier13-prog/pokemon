
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "alert_preferences": {
                  Row: {
                    "brand_ids": (string)[],"enabled": boolean,"favorites_only": boolean,"product_ids": (string)[],"product_types": (Database["public"]['Enums']["product_type"])[],"quiet_end": string | null,"quiet_start": string | null,"radius_km": number,"trigger": Database["public"]['Enums']["push_trigger"],"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "brand_ids"?: (string)[],"enabled"?: boolean,"favorites_only"?: boolean,"product_ids"?: (string)[],"product_types"?: (Database["public"]['Enums']["product_type"])[],"quiet_end"?: string | null,"quiet_start"?: string | null,"radius_km"?: number,"trigger"?: Database["public"]['Enums']["push_trigger"],"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "brand_ids"?: (string)[],"enabled"?: boolean,"favorites_only"?: boolean,"product_ids"?: (string)[],"product_types"?: (Database["public"]['Enums']["product_type"])[],"quiet_end"?: string | null,"quiet_start"?: string | null,"radius_km"?: number,"trigger"?: Database["public"]['Enums']["push_trigger"],"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "alert_preferences_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"brands": {
                  Row: {
                    "category_color": string,"id": string,"kind": string,"name": string,"osm_match": (string)[],"slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category_color"?: string,"id"?: string,"kind": string,"name": string,"osm_match"?: (string)[],"slug": string
                  }
                  Update: {
                    "category_color"?: string,"id"?: string,"kind"?: string,"name"?: string,"osm_match"?: (string)[],"slug"?: string
                  }
                  Relationships: [
                    
                  ]
                },"games": {
                  Row: {
                    "id": string,"is_active": boolean,"name": string,"slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"is_active"?: boolean,"name": string,"slug": string
                  }
                  Update: {
                    "id"?: string,"is_active"?: boolean,"name"?: string,"slug"?: string
                  }
                  Relationships: [
                    
                  ]
                },"products": {
                  Row: {
                    "created_at": string,"game_id": string,"id": string,"image_path": string | null,"is_active": boolean,"name": string,"set_name": string | null,"sort_order": number,"type": Database["public"]['Enums']["product_type"]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"game_id": string,"id"?: string,"image_path"?: string | null,"is_active"?: boolean,"name": string,"set_name"?: string | null,"sort_order"?: number,"type": Database["public"]['Enums']["product_type"]
                  }
                  Update: {
                    "created_at"?: string,"game_id"?: string,"id"?: string,"image_path"?: string | null,"is_active"?: boolean,"name"?: string,"set_name"?: string | null,"sort_order"?: number,"type"?: Database["public"]['Enums']["product_type"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "products_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_key": string,"banned_at": string | null,"created_at": string,"id": string,"pseudo": string,"reports_count": number,"reports_disputed_count": number,"reputation_score": number,"role": Database["public"]['Enums']["app_role"],"scout_count": number,"badges": (string)[] | null
                  }
                  ComputedFields: "badges"
                  Insert: {
                    "avatar_key"?: string,"banned_at"?: string | null,"created_at"?: string,"id": string,"pseudo": string,"reports_count"?: number,"reports_disputed_count"?: number,"reputation_score"?: number,"role"?: Database["public"]['Enums']["app_role"],"scout_count"?: number
                  }
                  Update: {
                    "avatar_key"?: string,"banned_at"?: string | null,"created_at"?: string,"id"?: string,"pseudo"?: string,"reports_count"?: number,"reports_disputed_count"?: number,"reputation_score"?: number,"role"?: Database["public"]['Enums']["app_role"],"scout_count"?: number
                  }
                  Relationships: [
                    
                  ]
                },"store_favorites": {
                  Row: {
                    "created_at": string,"store_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"store_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"store_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "store_favorites_store_id_fkey"
      columns: ["store_id"]
isOneToOne: false
      referencedRelation: "stores"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "store_favorites_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"stores": {
                  Row: {
                    "address": string | null,"brand_id": string | null,"city": string | null,"created_at": string,"created_by": string | null,"department": string,"id": string,"location": unknown,"name": string,"opening_hours": string | null,"osm_ref": string | null,"postcode": string | null,"review_note": string | null,"reviewed_by": string | null,"status": Database["public"]['Enums']["store_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"brand_id"?: string | null,"city"?: string | null,"created_at"?: string,"created_by"?: string | null,"department": string,"id"?: string,"location": unknown,"name": string,"opening_hours"?: string | null,"osm_ref"?: string | null,"postcode"?: string | null,"review_note"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["store_status"],"updated_at"?: string
                  }
                  Update: {
                    "address"?: string | null,"brand_id"?: string | null,"city"?: string | null,"created_at"?: string,"created_by"?: string | null,"department"?: string,"id"?: string,"location"?: unknown,"name"?: string,"opening_hours"?: string | null,"osm_ref"?: string | null,"postcode"?: string | null,"review_note"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["store_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "stores_brand_id_fkey"
      columns: ["brand_id"]
isOneToOne: false
      referencedRelation: "brands"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stores_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stores_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"user_settings": {
                  Row: {
                    "home_area": unknown,"home_label": string | null,"onboarded_at": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "home_area"?: unknown,"home_label"?: string | null,"onboarded_at"?: string | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "home_area"?: unknown,"home_label"?: string | null,"onboarded_at"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_settings_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "badges":
{ Args: { "p": Omit<Database["public"]['Tables']["profiles"]['Row'], Database["public"]['Tables']["profiles"]['ComputedFields']> }; Returns: (string)[]
                           },
"get_launch_stores":
{ Args: Record<PropertyKey, never>; Returns: {
              "address": string,"brand_kind": string,"brand_name": string,"brand_slug": string,"category_color": string,"city": string,"id": string,"lat": number,"lng": number,"name": string,"postcode": string
            }[]
                           },
"get_me":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"get_public_config":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"get_stores_within":
{ Args: { "p_lat": number,"p_limit"?: number,"p_lng": number,"p_radius_km"?: number }; Returns: {
              "brand_id": string,"city": string,"distance_m": number,"id": string,"lat": number,"lng": number,"name": string
            }[]
                           },
"log_client_error":
{ Args: { "p_message": string,"p_stack"?: string,"p_url"?: string }; Returns: undefined
                           },
"svc_client_error_count":
{ Args: { "p_since": string }; Returns: number
                           }
          }
          Enums: {
            "app_role": "user"|"admin","product_type": "booster"|"blister"|"display"|"etb"|"coffret"|"tin"|"bundle"|"other","push_trigger": "created"|"first_confirm","store_status": "pending"|"active"|"rejected"|"disabled"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "app_role": ["user", "admin"],"product_type": ["booster", "blister", "display", "etb", "coffret", "tin", "bundle", "other"],"push_trigger": ["created", "first_confirm"],"store_status": ["pending", "active", "rejected", "disabled"]
          }
        }
} as const
