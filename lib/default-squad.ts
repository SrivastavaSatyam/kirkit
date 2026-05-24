/** Default roster for new series / create flow (order = batting priority seed). */
export const DEFAULT_SQUAD_NAMES = [
  'Satyam',
  'Subhanshu',
  'Sarthak',
  'Pranjal',
  'Anmol',
  'Sanket',
] as const;

/** Distinct Dicebear background colors (hex, no #) for the default squad. */
const ACCENT_BY_NAME: Record<string, string> = {
  Satyam: '0ea5e9',
  Subhanshu: 'a855f7',
  Sarthak: '22c55e',
  Pranjal: 'f97316',
  Anmol: 'ec4899',
  Sanket: 'eab308',
};

const FALLBACK_ACCENTS = ['39ff14', '00f3ff', 'ffd700', 'f43f5e', '6366f1', '14b8a6'];

function simpleHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function dicebearAvatarUrl(name: string, backgroundColorHex: string): string {
  const bg = backgroundColorHex.replace(/^#/, '');
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}&backgroundColor=${bg}`;
}

/** Avatar URL for a name in the create-series list (before `Player` rows exist). */
export function defaultSquadAvatarUrl(name: string, listIndex: number): string {
  const hex =
    ACCENT_BY_NAME[name] ?? FALLBACK_ACCENTS[listIndex % FALLBACK_ACCENTS.length];
  return dicebearAvatarUrl(name, hex);
}

/** Assign when creating a `Player` (series start or mid-series add). */
export function newPlayerAvatarUrl(name: string, salt = 0): string {
  const hex =
    ACCENT_BY_NAME[name] ??
    FALLBACK_ACCENTS[(simpleHash(name + String(salt))) % FALLBACK_ACCENTS.length];
  return dicebearAvatarUrl(name, hex);
}

export function avatarImgSrc(player: { name: string; avatar?: string }): string {
  if (player.avatar?.startsWith('http')) return player.avatar;
  return newPlayerAvatarUrl(player.name);
}
