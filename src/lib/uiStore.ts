import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { roundToGrid, type LatLng } from './geo'

export type Zone = LatLng & { label: string; source: 'default' | 'search' | 'gps' }

type UiState = {
  viewMode: 'map' | 'list'
  zone: Zone | null
  setViewMode: (mode: 'map' | 'list') => void
  setZone: (zone: Zone) => void
}

// Device-only UI preferences. The zone is stored rounded to ~1 km, never the precise position.
export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      viewMode: 'map',
      zone: null,
      setViewMode: (viewMode) => set({ viewMode }),
      setZone: (zone) => set({ zone: { ...zone, ...roundToGrid(zone) } }),
    }),
    {
      name: 'rr-ui',
      version: 1,
      storage: createJSONStorage(() => {
        try {
          return localStorage
        } catch {
          return sessionStorage
        }
      }),
    },
  ),
)
