import type { Person, PersonalityTrait } from './types';
import { mulberry32 } from '../sim/rng';

export const OPPOSING_PERSONALITY_TRAIT_PAIRS = [
  ['Ambitious', 'Content'],
  ['Arbitrary', 'Just'],
  ['Arrogant', 'Humble'],
  ['Brave', 'Craven'],
  ['Calm', 'Wrathful'],
  ['Chaste', 'Lustful'],
  ['Compassionate', 'Callous'],
  ['Cynical', 'Zealous'],
  ['Deceitful', 'Honest'],
  ['Diligent', 'Lazy'],
  ['Forgiving', 'Vengeful'],
  ['Generous', 'Greedy'],
  ['Gregarious', 'Shy'],
  ['Impatient', 'Patient'],
  ['Trusting', 'Paranoid'],
  ['Reckless', 'Cautious'],
] as const satisfies readonly (readonly [PersonalityTrait, PersonalityTrait])[];

export const UNOPPOSED_PERSONALITY_TRAITS = [
  'Cruel / Sadistic',
  'Stubborn',
  'Temperate',
  'Haunted / Anxious',
  'Drunkard',
  'Loyal',
  'Curious',
  'Superstitious',
  'Deformed / Badly Scarred',
  'Eccentric',
  'Fickle',
] as const satisfies readonly PersonalityTrait[];

const TRAIT_GROUPS = [
  ...OPPOSING_PERSONALITY_TRAIT_PAIRS,
  ...UNOPPOSED_PERSONALITY_TRAITS.map((trait) => [trait] as const),
] as const;

function hashText(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function personSeed(p: Person): string {
  return [
    p.id,
    p.role,
    p.title,
    p.name,
    p.stateId ?? '',
    p.religionName ?? p.religion ?? '',
  ].join('|');
}

export function assignPersonalityTraits(seed: string): [PersonalityTrait, PersonalityTrait, PersonalityTrait] {
  const rand = mulberry32(hashText(seed));
  const indexes = TRAIT_GROUPS.map((_, index) => index);
  for (let i = indexes.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [indexes[i], indexes[j]] = [indexes[j], indexes[i]];
  }

  return indexes.slice(0, 3).map((groupIndex) => {
    const group = TRAIT_GROUPS[groupIndex];
    return group[Math.floor(rand() * group.length)];
  }) as [PersonalityTrait, PersonalityTrait, PersonalityTrait];
}

export function withPersonalityTraits<T extends Person>(person: T): T {
  if (person.personalityTraits?.length === 3) return person;
  return {
    ...person,
    personalityTraits: assignPersonalityTraits(personSeed(person)),
  };
}
