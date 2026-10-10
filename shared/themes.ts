export const PARTY_THEME_IDS = ['classic', 'sonic-day'] as const
export type PartyTheme = (typeof PARTY_THEME_IDS)[number]
export const PARTY_THEMES = [
  {
    id: 'classic',
    name: 'QRokê original',
    description: 'Verde vibrante, visual limpo e o palco de sempre.',
    colors: ['#c4f332', '#ff5a24', '#191c1f'],
  },
  {
    id: 'sonic-day',
    name: 'Dia das Crianças · Supervelocidade',
    description:
      'Inspirado no Sonic: azul elétrico, anéis dourados e energia de arcade, para todas as idades.',
    colors: ['#63b4ff', '#ffd166', '#091c38'],
  },
] satisfies { id: PartyTheme; name: string; description: string; colors: string[] }[]
export function partyTheme(value: unknown): PartyTheme {
  return PARTY_THEME_IDS.includes(value as PartyTheme) ? (value as PartyTheme) : 'classic'
}
