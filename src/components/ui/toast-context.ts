import { createContext, useContext } from 'react'

export type ToastOptions = { message: string; onUndo?: () => void }

export const ToastContext = createContext<{ show: (options: ToastOptions) => void } | null>(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside <ToastProvider>')
  return context
}
