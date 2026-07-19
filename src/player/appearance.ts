import type {
  AbilityScores,
  BodyBuild,
  CharacterAppearance,
  CharacterAppearanceInput,
  EyeColor,
  FacialHair,
  HairColor,
  HairLength,
  Posture,
  RelativeHeight,
  SkinColor,
  SpeciesId,
} from './types';

export const SKIN_COLOR_OPTIONS: { id: SkinColor; label: string }[] = [
  { id: 'porcelain', label: 'Porcelain' },
  { id: 'fair', label: 'Fair' },
  { id: 'olive', label: 'Olive' },
  { id: 'warm-brown', label: 'Warm brown' },
  { id: 'deep-brown', label: 'Deep brown' },
  { id: 'ebony', label: 'Ebony' },
  { id: 'copper', label: 'Copper' },
  { id: 'ash-grey', label: 'Ash grey' },
  { id: 'green', label: 'Green' },
  { id: 'red-bronze', label: 'Red bronze' },
];

export const HAIR_COLOR_OPTIONS: { id: HairColor; label: string }[] = [
  { id: 'black', label: 'Black' },
  { id: 'dark-brown', label: 'Dark brown' },
  { id: 'brown', label: 'Brown' },
  { id: 'auburn', label: 'Auburn' },
  { id: 'red', label: 'Red' },
  { id: 'blond', label: 'Blond' },
  { id: 'silver', label: 'Silver' },
  { id: 'white', label: 'White' },
  { id: 'blue-black', label: 'Blue-black' },
  { id: 'none', label: 'No hair' },
];

export const HAIR_LENGTH_OPTIONS: { id: HairLength; label: string }[] = [
  { id: 'shaved', label: 'Shaved' },
  { id: 'close-cropped', label: 'Close-cropped' },
  { id: 'short', label: 'Short' },
  { id: 'shoulder-length', label: 'Shoulder-length' },
  { id: 'long', label: 'Long' },
  { id: 'braided', label: 'Braided' },
];

export const FACIAL_HAIR_OPTIONS: { id: FacialHair; label: string }[] = [
  { id: 'clean-shaven', label: 'Clean-shaven' },
  { id: 'stubble', label: 'Stubble' },
  { id: 'trimmed-beard', label: 'Trimmed beard' },
  { id: 'full-beard', label: 'Full beard' },
  { id: 'mustache', label: 'Mustache' },
  { id: 'none', label: 'No facial hair' },
];

export const EYE_COLOR_OPTIONS: { id: EyeColor; label: string }[] = [
  { id: 'black', label: 'Black' },
  { id: 'brown', label: 'Brown' },
  { id: 'hazel', label: 'Hazel' },
  { id: 'green', label: 'Green' },
  { id: 'blue', label: 'Blue' },
  { id: 'grey', label: 'Grey' },
  { id: 'amber', label: 'Amber' },
  { id: 'gold', label: 'Gold' },
  { id: 'violet', label: 'Violet' },
];

export const RELATIVE_HEIGHT_OPTIONS: { id: RelativeHeight; label: string }[] = [
  { id: 'very-short', label: 'Very short' },
  { id: 'short', label: 'Short' },
  { id: 'average', label: 'Average height' },
  { id: 'tall', label: 'Tall' },
  { id: 'very-tall', label: 'Very tall' },
];

export const POSTURE_OPTIONS: { id: Posture; label: string }[] = [
  { id: 'upright', label: 'Upright' },
  { id: 'relaxed', label: 'Relaxed' },
  { id: 'guarded', label: 'Guarded' },
  { id: 'forward-leaning', label: 'Forward-leaning' },
  { id: 'stooped', label: 'Stooped' },
  { id: 'formal', label: 'Formal' },
];

export const DEFAULT_APPEARANCE: CharacterAppearanceInput = {
  skinColor: 'warm-brown',
  hairColor: 'dark-brown',
  hairLength: 'short',
  facialHair: 'clean-shaven',
  eyeColor: 'brown',
  relativeHeight: 'average',
  posture: 'guarded',
};

const SKIN_LABEL: Record<SkinColor, string> = {
  porcelain: 'porcelain',
  fair: 'fair',
  olive: 'olive',
  'warm-brown': 'warm brown',
  'deep-brown': 'deep brown',
  ebony: 'ebony',
  copper: 'copper',
  'ash-grey': 'ash-grey',
  green: 'green',
  'red-bronze': 'red-bronze',
};

const HAIR_LABEL: Record<HairColor, string> = {
  black: 'black',
  'dark-brown': 'dark brown',
  brown: 'brown',
  auburn: 'auburn',
  red: 'red',
  blond: 'blond',
  silver: 'silver',
  white: 'white',
  'blue-black': 'blue-black',
  none: '',
};

const HEIGHT_LABEL: Record<RelativeHeight, string> = {
  'very-short': 'very short',
  short: 'short',
  average: 'average-height',
  tall: 'tall',
  'very-tall': 'very tall',
};

const POSTURE_LABEL: Record<Posture, string> = {
  upright: 'upright',
  relaxed: 'relaxed',
  guarded: 'guarded',
  'forward-leaning': 'forward-leaning',
  stooped: 'slightly stooped',
  formal: 'formal',
};

export function bodyBuildForStrength(strength: number): BodyBuild {
  if (strength <= 7) return 'slight';
  if (strength <= 10) return 'lean';
  if (strength <= 13) return 'balanced';
  if (strength <= 15) return 'sturdy';
  if (strength <= 17) return 'powerful';
  return 'massive';
}

function skinNoun(speciesId: SpeciesId): string {
  return speciesId === 'dragonborn' ? 'scales' : 'skin';
}

function hairPhrase(input: CharacterAppearanceInput): string {
  if (input.hairColor === 'none' || input.hairLength === 'shaved') return 'a shaved head';
  const color = HAIR_LABEL[input.hairColor];
  if (input.hairLength === 'braided') return `braided ${color} hair`;
  return `${input.hairLength} ${color} hair`;
}

function facialHairPhrase(input: CharacterAppearanceInput): string | null {
  switch (input.facialHair) {
    case 'clean-shaven':
      return 'clean-shaven';
    case 'stubble':
      return 'stubble';
    case 'trimmed-beard':
      return 'a trimmed beard';
    case 'full-beard':
      return 'a full beard';
    case 'mustache':
      return 'a mustache';
    case 'none':
      return null;
  }
}

export function buildAppearance(
  input: CharacterAppearanceInput | undefined,
  speciesId: SpeciesId,
  speciesName: string,
  scores: AbilityScores,
): CharacterAppearance {
  const base = { ...DEFAULT_APPEARANCE, ...input };
  const build = bodyBuildForStrength(scores.str);
  const face = facialHairPhrase(base);
  const pieces = [
    `${HEIGHT_LABEL[base.relativeHeight]} ${speciesName.toLowerCase()}`,
    `${SKIN_LABEL[base.skinColor]} ${skinNoun(speciesId)}`,
    hairPhrase(base),
    `${base.eyeColor} eyes`,
    face,
    `a ${build} build`,
    `${POSTURE_LABEL[base.posture]} posture`,
  ].filter((piece): piece is string => Boolean(piece));
  return {
    ...base,
    build,
    descriptor: `A ${pieces.join(', ')}.`,
  };
}
