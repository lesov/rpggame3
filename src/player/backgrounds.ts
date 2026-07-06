import type { BackstoryRule } from './types';

export const BACKSTORIES: BackstoryRule[] = [
  {
    id: 'escaped_prisoner',
    title: 'Escaped from a Quiet Cell',
    premise:
      'You woke before dawn in a nameless holding cell, stripped of gear and marked for transfer. A sympathetic novice left the latch loose; you walked out wearing only the plain clothing issued to prisoners.',
    powerExplanation:
      'Your captivity followed years of hard lessons and secret drills, and the escape put that training under pressure for the first time.',
    minorBonus: {
      name: 'Hard to Break',
      description: 'Once per long rest, add +1 to a saving throw against fear, exhaustion, or forced movement.',
    },
    suggestedBackgrounds: ['criminal', 'guard', 'soldier', 'wayfarer'],
    spawnPreference: 'settlement-edge',
  },
  {
    id: 'failed_initiate',
    title: 'Failed Initiate of the Inner Rite',
    premise:
      'Your temple accepted you, trained you, and then rejected you after a rite went wrong. They sent you away in penitent clothing, forbidden to carry temple property.',
    powerExplanation:
      'Even a failed initiate carries years of discipline, doctrine, fasting, weaponless drills, and prayer.',
    minorBonus: {
      name: 'Rite Memory',
      description: 'Once per long rest, add +1 to a Religion, Medicine, or Insight check tied to a sacred place or holy custom.',
    },
    suggestedBackgrounds: ['acolyte', 'hermit', 'sage', 'scribe'],
    spawnPreference: 'faith-center',
  },
  {
    id: 'battlefield_witness',
    title: 'The Last One Standing',
    premise:
      'A levy, raid, or border clash swallowed everyone around you. You survived by instinct, woke beneath a burial cloth, and left the field before the scavengers returned.',
    powerExplanation:
      'You moved, endured, and remembered your training under blood and smoke.',
    minorBonus: {
      name: 'Battle Nerve',
      description: 'Once per long rest, add +1 to initiative or to a Wisdom saving throw made during the first round of combat.',
    },
    suggestedBackgrounds: ['guard', 'soldier', 'farmer', 'noble'],
    spawnPreference: 'border',
  },
  {
    id: 'shipwrecked_pilgrim',
    title: 'Thrown Back by the Sea',
    premise:
      'A pilgrim vessel broke apart in black water. Your pack, weapons, and companions are gone; only the soaked clothing you wore made landfall with you.',
    powerExplanation:
      'You survived the wreckage, cold, and reef-cut surf because your body and will were already tempered.',
    minorBonus: {
      name: 'Saltwise',
      description: 'Once per long rest, add +1 to a Survival, Athletics, or Perception check made on a coast, river, or aboard a vessel.',
    },
    suggestedBackgrounds: ['sailor', 'merchant', 'guide', 'acolyte'],
    spawnPreference: 'coast',
  },
  {
    id: 'exiled_heir',
    title: 'Hidden Bloodline',
    premise:
      'Someone powerful decided your name was dangerous. Loyal servants smuggled you away disguised as a penitent, then vanished before they could return your arms or coin.',
    powerExplanation:
      'Tutors, court drills, languages, etiquette, and guarded lessons in survival shaped you before exile stripped the trappings away.',
    minorBonus: {
      name: 'Old Bearing',
      description: 'Once per long rest, add +1 to a Persuasion, History, or Insight check involving nobility, officers, or officials.',
    },
    suggestedBackgrounds: ['noble', 'scribe', 'guard', 'merchant'],
    spawnPreference: 'settlement-edge',
  },
  {
    id: 'wild_omen',
    title: 'Chosen by a Bad Omen',
    premise:
      'The village seer named you the center of a coming disaster. Your kin dressed you for the road and sent you into the wild before panic turned violent.',
    powerExplanation:
      'The omen followed real signs: strange endurance, uncanny perception, and power surfacing under stress.',
    minorBonus: {
      name: 'Omen Sense',
      description: 'Once per long rest, add +1 to a Nature, Arcana, or Perception check made in isolated or supernatural terrain.',
    },
    suggestedBackgrounds: ['guide', 'hermit', 'farmer', 'sage'],
    spawnPreference: 'remote',
  },
];

export function getBackstory(id: BackstoryRule['id']): BackstoryRule {
  const story = BACKSTORIES.find((b) => b.id === id);
  if (!story) throw new Error(`Unknown backstory: ${id}`);
  return story;
}
