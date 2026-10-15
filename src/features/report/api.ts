import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { launchStoresKey } from '@/features/map/api'
import { toAppError } from '@/lib/errors'
import { getSupabase } from '@/lib/supabase'

export type ReportStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'restock_incoming'
export type Product = { id: string; name: string; type: string; sort_order: number }

export function useProducts() {
  return useQuery({
    queryKey: ['catalog'],
    staleTime: 24 * 60 * 60 * 1000,
    queryFn: async (): Promise<Product[]> => {
      const supabase = await getSupabase()
      if (!supabase) return []
      const { data, error } = await supabase
        .from('products')
        .select('id, name, type, sort_order')
        .eq('is_active', true)
        .order('sort_order')
      if (error) throw error
      return data as Product[]
    },
  })
}

export type CreateReportInput = {
  clientId: string
  storeId: string
  lat: number
  lng: number
  status: ReportStatus
  products: Array<{ productId: string; qty: number | null }>
  priceCents: number | null
  comment: string | null
  capturedAt: string
}

export type CreatedReport = { id: string; store_id: string }

export function useCreateReport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateReportInput): Promise<CreatedReport> => {
      const supabase = await getSupabase()
      if (!supabase) throw { code: 'network', detail: {} }
      const { data, error } = await supabase.rpc('create_report', {
        p_client_id: input.clientId,
        p_store_id: input.storeId,
        p_lat: input.lat,
        p_lng: input.lng,
        p_status: input.status,
        p_products: input.products.map((p) => ({ product_id: p.productId, qty: p.qty })),
        p_price_cents: input.priceCents ?? undefined,
        p_comment: input.comment ?? undefined,
        p_captured_at: input.capturedAt,
      })
      if (error) throw toAppError(error)
      return data as CreatedReport
    },
    onSuccess: (report) => {
      void queryClient.invalidateQueries({ queryKey: launchStoresKey })
      void queryClient.invalidateQueries({ queryKey: ['store', report.store_id] })
    },
  })
}
