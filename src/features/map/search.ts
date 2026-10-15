// Case- and accent-insensitive search key ("Jouéclub" matches "joueclub").
export function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}
