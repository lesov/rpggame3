import { PRONOUNS, type BackstoryRule, type Gender } from './types';

/**
 * Every player character — custom or pregenerated — shares this one biography:
 * a washout of the Duhi Troupe, cast out into a city to make a living from the
 * Adventurers' Guild. The template is filled per character with name, class,
 * gender pronouns (binary he/she), and the starting city.
 */
export const DUHI_BIOGRAPHY_TEMPLATE = `For as long as [Name] could remember, life was defined by the cold, regimented walls of the Duhi Troupe's secret facility. Plucked from obscurity at a tender age, [Name]'s natural aptitude quickly caught the attention of the instructors, who began molding [him/her] into a weapon of singular purpose: a master [Class].

For years, [Name] excelled, surviving the grueling trials and advancing seamlessly from one brutal tier of instruction to the next. By age eighteen, the finish line was in sight—only two years remained to complete the ultimate mastery of the craft.

Then came the shattering verdict. Without warning, the masters declared that [Name] lacked the final, intangible spark required to truly graduate. Deemed an incomplete project, [he/she] was abruptly severed from the only home [he/she] had ever known and cast out into the sprawling, chaotic streets of [City]—entirely on [his/her] own for the first time in [his/her] life.

Stranded in a world without structure, [Name] quickly learned that the "incomplete" training of the Duhi Troupe was still far superior to anything the civilian world had to offer. To secure food and shelter, [he/she] enlisted in the local Adventurers' Guild. What the masters saw as a failure, the guild saw as an elite asset. Over the last three years, [Name] has navigated the cutthroat world of freelance contracting, relying on [his/her] lethal foundations to rise to the Bronze rank.

Though the masters of the Duhi Troupe discarded [him/her], [Name] is proving on the streets of [City] that a weapon doesn't need a certificate of completion to draw blood.`;

export const DUHI_WASHOUT: BackstoryRule = {
  id: 'duhi_washout',
  title: 'Duhi Troupe Washout',
  biographyTemplate: DUHI_BIOGRAPHY_TEMPLATE,
  minorBonus: {
    name: 'Troupe Foundations',
    description:
      'Your elite conditioning never fully left you. Once per long rest, add +1 to a saving throw or an ability check that relies on trained discipline, reflex, or endurance.',
  },
};

export const BACKSTORIES: BackstoryRule[] = [DUHI_WASHOUT];

export function getBackstory(_id?: BackstoryRule['id']): BackstoryRule {
  // There is only one canonical biography.
  return DUHI_WASHOUT;
}

export interface BiographyFields {
  name: string;
  className: string;
  city: string;
  gender: Gender;
}

/** Fill the shared biography template for a specific character. */
export function fillBiography(fields: BiographyFields, template: string = DUHI_BIOGRAPHY_TEMPLATE): string {
  const p = PRONOUNS[fields.gender];
  return template
    .replaceAll('[Name]', fields.name)
    .replaceAll('[Class]', fields.className)
    .replaceAll('[City]', fields.city)
    .replaceAll('[he/she]', p.subject)
    .replaceAll('[him/her]', p.object)
    .replaceAll('[his/her]', p.possessive)
    .replaceAll('[himself/herself]', p.reflexive);
}
