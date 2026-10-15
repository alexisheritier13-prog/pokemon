import { copy } from '@/copy/fr'
import type { AppError } from '@/lib/errors'

const t = copy.reportFlow.errors

// Server refusal → message that says what happened and what to do.
export function reportErrorMessage(error: AppError): string {
  const num = (key: string) => Number(error.detail[key] ?? 0)
  switch (error.code) {
    case 'too_far':
      return t.too_far(num('distance_m'))
    case 'rate_limited_user':
      return t.rate_limited_user(num('retry_in_min'))
    case 'rate_limited_store':
      return t.rate_limited_store(num('retry_in_min'))
    case 'capture_too_old':
    case 'invalid_products':
    case 'store_not_found':
    case 'banned':
    case 'comment_too_long':
    case 'network':
      return t[error.code]
    default:
      return t.unknown
  }
}
