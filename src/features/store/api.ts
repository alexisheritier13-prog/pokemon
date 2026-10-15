import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/auth-context'
import { getSupabase } from '@/lib/supabase'

export type StoreDetail = {
  id: string
  name: string
  status: 'pending' | 'active' | 'rejected' | 'disabled'
  brand_slug: string | null
  brand_name: string | null
  brand_kind: string | null
  category_color: string | null
  address: string | null
  city: string | null
  postcode: string | null
  department: string
  opening_hours: string | null
  lat: number
  lng: number
  current_report_id: string | null
  current_status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'restock_incoming' | null
  current_state: 'active' | 'sold_out' | null
  current_reported_at: string | null
  current_trust: number | null
  current_confirm_count: number | null
}

export function useStore(storeId: string | undefined) {
  return useQuery({
    queryKey: ['store', storeId],
    enabled: Boolean(storeId),
    queryFn: async (): Promise<StoreDetail | null> => {
      const supabase = await getSupabase()
      if (!supabase) return null
      const { data, error } = await supabase.rpc('get_store', { p_store_id: storeId! })
      if (error) throw error
      return ((data as StoreDetail[] | null) ?? [])[0] ?? null
    },
  })
}

// Whether the signed-in user follows this store. Favorites are owner-only (RLS).
export function useFavorite(storeId: string) {
  const auth = useAuth()
  const userId = auth.session?.user.id
  const queryClient = useQueryClient()
  const key = ['favorite', userId, storeId]

  const query = useQuery({
    queryKey: key,
    enabled: Boolean(userId),
    queryFn: async () => {
      const supabase = await getSupabase()
      if (!supabase) return false
      const { count, error } = await supabase
        .from('store_favorites')
        .select('store_id', { count: 'exact', head: true })
        .eq('store_id', storeId)
      if (error) throw error
      return (count ?? 0) > 0
    },
  })

  const toggle = useMutation({
    mutationFn: async (next: boolean) => {
      const supabase = await getSupabase()
      if (!supabase || !userId) throw new Error('not_signed_in')
      const { error } = next
        ? await supabase.from('store_favorites').insert({ user_id: userId, store_id: storeId })
        : await supabase
            .from('store_favorites')
            .delete()
            .eq('store_id', storeId)
            .eq('user_id', userId)
      if (error) throw error
      return next
    },
    // Optimistic: the heart flips immediately and rolls back on error.
    onMutate: async (next) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<boolean>(key)
      queryClient.setQueryData(key, next)
      return { previous }
    },
    onError: (_error, _next, context) => queryClient.setQueryData(key, context?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  return { isFavorite: query.data ?? false, toggle }
}
