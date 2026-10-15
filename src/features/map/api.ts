import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase'

export type LaunchStore = {
  id: string
  name: string
  brand_slug: string | null
  brand_name: string | null
  brand_kind: string | null
  category_color: string | null
  address: string | null
  city: string | null
  postcode: string | null
  lat: number
  lng: number
  status?: 'in_stock' | 'low_stock' | 'out_of_stock' | 'restock_incoming' | null
}

export const launchStoresKey = ['stores', 'launch'] as const

// All active stores of the launch zone (~350 rows): loaded once, cached for a day.
export function useLaunchStores() {
  return useQuery({
    queryKey: launchStoresKey,
    staleTime: 24 * 60 * 60 * 1000,
    queryFn: async (): Promise<LaunchStore[]> => {
      const supabase = await getSupabase()
      if (!supabase) return []
      const { data, error } = await supabase.rpc('get_launch_stores')
      if (error) throw error
      return (data ?? []) as LaunchStore[]
    },
  })
}
