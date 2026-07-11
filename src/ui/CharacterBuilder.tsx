import { useEffect, useMemo, useState } from 'react';
import { buildPlayerCharacter, validateCharacterInput } from '../player/character';
import { DUHI_WASHOUT } from '../player/backgrounds';
import { PREGENERATED_CHARACTERS } from '../player/pregens';
import {
  ABILITY_LABELS,
  BACKGROUND_RULES,
  CLASS_RULES,
  SKILL_LABELS,
  SPECIES_RULES,
  getBackgroundRule,
  getClassRule,
  getSpeciesRule,
  suggestAbilityScores,
} from '../player/rules2024';
import { findReputation } from '../player/reputation';
import { ABILITIES, type Ability, type CharacterBuildInput, type CharacterClassId, type Gender, type OriginBackgroundId, type PlayerCharacter, type Skill, type SpeciesId } from '../player/types';
import { useGame } from './store';

function optionName(id: string, options: { id: string; name: string }[]): string {
  return options.find((o) => o.id === id)?.name ?? id;
}

function formatModifier(value: number): string {
  return value >= 0 ? `+${value}` : String(value);
}

function defaultSkills(classId: CharacterClassId): Skill[] {
  const cls = getClassRule(classId);
  return cls.skillChoices.slice(0, cls.skillCount);
}

function CharacterSheet({ player }: { player: PlayerCharacter }) {
  const { dispatch } = useGame();
  const originCulture = player.cultureId
    ? findReputation(player.reputations.cultures, player.cultureId)
    : undefined;
  const chosenReligion = findReputation(player.reputations.religions, player.religionId);
  return (
    <div className="character-panel">
      <button className="primary-action battle-test-btn" onClick={() => dispatch({ type: 'startCombat' })}>
        ⚔ Test battle
      </button>
      <div className="section character-summary">
        <h3>{player.name}</h3>
        <div className="kv"><span>Level</span><span>1 {player.speciesName} {player.className}</span></div>
        <div className="kv"><span>Origin</span><span>{player.backgroundName} · {player.nationalityName}</span></div>
        <div className="kv"><span>Faith</span><span>{player.religionName}</span></div>
        <div className="kv"><span>Start</span><span>{player.location.placeName}</span></div>
      </div>

      <div className="section">
        <h3>Stats</h3>
        <div className="ability-readout">
          {ABILITIES.map((ability) => (
            <div className="ability-score" key={ability}>
              <span>{ABILITY_LABELS[ability].slice(0, 3)}</span>
              <strong>{player.abilityScores[ability]}</strong>
              <em>{formatModifier(player.abilityModifiers[ability])}</em>
            </div>
          ))}
        </div>
        <div className="derived-row">
          <span>HP {player.maxHp}</span>
          <span>AC {player.armorClass}</span>
          <span>Speed {player.speed}</span>
          <span>PB +2</span>
        </div>
      </div>

      <div className="section">
        <h3>Training</h3>
        <div className="kv"><span>Origin feat</span><span>{player.originFeat}</span></div>
        <div className="kv"><span>Features</span><span>{player.levelOneFeatures.join(', ')}</span></div>
        <div className="kv"><span>Saves</span><span>{player.savingThrows.map((a) => ABILITY_LABELS[a]).join(', ')}</span></div>
        <div className="kv"><span>Skills</span><span>{player.skillProficiencies.map((s) => SKILL_LABELS[s]).join(', ')}</span></div>
        <div className="kv"><span>Languages</span><span>{player.languages.join(', ')}</span></div>
      </div>

      <div className="section">
        <h3>Biography</h3>
        {player.story.split(/\n\n+/).map((para, i) => (
          <p className="story-text" key={i}>{para}</p>
        ))}
        <div className="kv"><span>Bonus</span><span>{player.minorBonus.name}: {player.minorBonus.description}</span></div>
      </div>

      <div className="section">
        <h3>Reputation</h3>
        <div className="kv"><span>Cultures</span><span>{player.reputations.cultures.length} known · all Neutral</span></div>
        <div className="kv"><span>Religions</span><span>{player.reputations.religions.length} known · all Neutral</span></div>
        {originCulture && <div className="kv"><span>Origin culture</span><span>{originCulture.name}: {originCulture.label} ({originCulture.score})</span></div>}
        {chosenReligion && <div className="kv"><span>Chosen faith</span><span>{chosenReligion.name}: {chosenReligion.label} ({chosenReligion.score})</span></div>}
      </div>

      <div className="section">
        <h3>Inventory</h3>
        <div className="kv"><span>Carried</span><span>{player.inventory.map((item) => item.name).join(', ')}</span></div>
        <div className="small-note">Includes one class-proficient weapon, travel supplies, vosels, and wizard spellbook when applicable.</div>
      </div>
    </div>
  );
}

export function CharacterBuilder() {
  const { state, dispatch, wd } = useGame();
  const nations = useMemo(() => wd.world.states.filter((s) => s.i > 0), [wd]);
  const religions = useMemo(() => wd.world.religions.filter((r) => r.i > 0), [wd]);
  const [name, setName] = useState('Rook');
  const [gender, setGender] = useState<Gender>('male');
  const [classId, setClassId] = useState<CharacterClassId>('fighter');
  const [speciesId, setSpeciesId] = useState<SpeciesId>('human');
  const [backgroundId, setBackgroundId] = useState<OriginBackgroundId>('soldier');
  const [nationalityId, setNationalityId] = useState(nations[0]?.i ?? 1);
  const [religionId, setReligionId] = useState(religions[0]?.i ?? 1);
  const [abilityScores, setAbilityScores] = useState(() => suggestAbilityScores('fighter', 'soldier'));
  const [skillProficiencies, setSkillProficiencies] = useState<Skill[]>(() => defaultSkills('fighter'));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAbilityScores(suggestAbilityScores(classId, backgroundId));
    setSkillProficiencies(defaultSkills(classId));
  }, [classId, backgroundId]);

  const cls = getClassRule(classId);
  const species = getSpeciesRule(speciesId);
  const background = getBackgroundRule(backgroundId);
  const conMod = Math.floor((abilityScores.con - 10) / 2);
  const dexMod = Math.floor((abilityScores.dex - 10) / 2);
  const hp = Math.max(1, cls.hitDie + conMod);
  const ac = 10 + dexMod;
  const input: CharacterBuildInput = {
    name,
    gender,
    classId,
    speciesId,
    backgroundId,
    nationalityId,
    religionId,
    abilityScores,
    skillProficiencies,
  };
  const validation = validateCharacterInput(input);

  const updateAbility = (ability: Ability, value: number) => {
    setAbilityScores((scores) => ({ ...scores, [ability]: value }));
  };

  const toggleSkill = (skill: Skill) => {
    setSkillProficiencies((skills) => {
      if (skills.includes(skill)) return skills.filter((s) => s !== skill);
      if (skills.length >= cls.skillCount) return skills;
      return [...skills, skill];
    });
  };

  const createCharacter = (buildInput: CharacterBuildInput) => {
    try {
      const pc = buildPlayerCharacter(buildInput, wd, state.date);
      dispatch({ type: 'setPlayer', player: pc });
      // The starting character is thrown straight into a battle test.
      dispatch({ type: 'startCombat' });
      setError(null);
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    }
  };

  if (state.player) return <CharacterSheet player={state.player} />;

  return (
    <div className="character-panel">
      <div className="section">
        <h3>Pregenerated characters</h3>
        <div className="pregen-list">
          {PREGENERATED_CHARACTERS.map((pregen) => (
            <button key={pregen.id} className="pregen-card" onClick={() => createCharacter(pregen.input)}>
              <strong>{pregen.name}</strong>
              <span>{pregen.summary}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="section">
        <h3>Custom character</h3>
        <label className="field">
          <span>Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <div className="form-grid">
          <label className="field">
            <span>Gender</span>
            <select value={gender} onChange={(e) => setGender(e.target.value as Gender)}>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </label>
          <label className="field">
            <span>Class</span>
            <select value={classId} onChange={(e) => setClassId(e.target.value as CharacterClassId)}>
              {CLASS_RULES.map((rule) => <option key={rule.id} value={rule.id}>{rule.name}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Species</span>
            <select value={speciesId} onChange={(e) => setSpeciesId(e.target.value as SpeciesId)}>
              {SPECIES_RULES.map((rule) => <option key={rule.id} value={rule.id}>{rule.name}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Background</span>
            <select value={backgroundId} onChange={(e) => setBackgroundId(e.target.value as OriginBackgroundId)}>
              {BACKGROUND_RULES.map((rule) => <option key={rule.id} value={rule.id}>{rule.name}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Nationality</span>
            <select value={nationalityId} onChange={(e) => setNationalityId(Number(e.target.value))}>
              {nations.map((nation) => <option key={nation.i} value={nation.i}>{nation.fullName ?? nation.name}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Religion</span>
            <select value={religionId} onChange={(e) => setReligionId(Number(e.target.value))}>
              {religions.map((religion) => <option key={religion.i} value={religion.i}>{religion.name}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="section">
        <h3>Ability scores</h3>
        <div className="ability-grid">
          {ABILITIES.map((ability) => (
            <label className="ability-field" key={ability}>
              <span>{ABILITY_LABELS[ability].slice(0, 3)}</span>
              <input
                type="number"
                min={3}
                max={20}
                value={abilityScores[ability]}
                onChange={(e) => updateAbility(ability, Number(e.target.value))}
              />
              <em>{formatModifier(Math.floor((abilityScores[ability] - 10) / 2))}</em>
            </label>
          ))}
        </div>
        <div className="derived-row">
          <span>HP {hp}</span>
          <span>AC {ac}</span>
          <span>Speed {species.speed}</span>
          <span>PB +2</span>
        </div>
      </div>

      <div className="section">
        <h3>Class skills</h3>
        <div className="skill-picker">
          {cls.skillChoices.map((skill) => {
            const checked = skillProficiencies.includes(skill);
            const disabled = !checked && skillProficiencies.length >= cls.skillCount;
            return (
              <button
                key={skill}
                className={checked ? 'skill-chip active' : 'skill-chip'}
                disabled={disabled}
                onClick={() => toggleSkill(skill)}
              >
                {SKILL_LABELS[skill]}
              </button>
            );
          })}
        </div>
        <div className="small-note">{skillProficiencies.length}/{cls.skillCount} class skills selected. Background adds {background.skillProficiencies.map((s) => SKILL_LABELS[s]).join(', ')}.</div>
      </div>

      <div className="section">
        <h3>Start profile</h3>
        <div className="kv"><span>Origin feat</span><span>{background.feat}</span></div>
        <div className="kv"><span>Features</span><span>{cls.levelOneFeatures.join(', ')}</span></div>
        <div className="kv"><span>Species</span><span>{optionName(speciesId, SPECIES_RULES)}: {species.traits.join(', ')}</span></div>
        <div className="kv"><span>Backstory</span><span>{DUHI_WASHOUT.title} — cast out of the Troupe into a city of your nation to make a living from the Adventurers' Guild.</span></div>
        <div className="kv"><span>Minor bonus</span><span>{DUHI_WASHOUT.minorBonus.name}: {DUHI_WASHOUT.minorBonus.description}</span></div>
        <div className="kv"><span>Start</span><span>Assigned when you begin: a non-capital city in your chosen nation.</span></div>
        <div className="kv"><span>Inventory</span><span>Climate clothing, one proficient weapon, 2 healing potions, 5 days provisions, and 118 vosels. Wizards also receive a spellbook.</span></div>
      </div>

      {(validation.length > 0 || error) && (
        <div className="section form-errors">
          {[...validation, error].filter(Boolean).map((msg) => <div key={msg}>{msg}</div>)}
        </div>
      )}
      <button className="primary-action" disabled={validation.length > 0} onClick={() => createCharacter(input)}>
        Start this character
      </button>
    </div>
  );
}
