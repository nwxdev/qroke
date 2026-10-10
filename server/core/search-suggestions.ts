import { normalizeQuery } from './rules'
export function suggestionQuery(query: string, karaoke: boolean) {
  const normalized = normalizeQuery(query)
  return karaoke && !/^karaok[eê](?:\s|$)/.test(normalized) ? 'karaoke ' + normalized : normalized
}
export function cleanSuggestions(values: string[], query: string, karaoke: boolean) {
  const current = normalizeQuery(query)
  const seen = new Set<string>()
  return values
    .flatMap((value) => {
      const text = (karaoke ? value.replace(/^karaok[eê]\s+/i, '') : value)
        .replace(/[\u0000-\u001f\u007f]/g, '')
        .trim()
        .slice(0, 120)
      const normalized = normalizeQuery(text)
      if (!normalized || normalized === current || seen.has(normalized)) return []
      seen.add(normalized)
      return [text]
    })
    .slice(0, 8)
}
