import { useMemo, useState } from 'react';
import { useGame } from './store';
import { inspectPlace, findNearby, peopleFor, activeWars } from '../data/inspect';
import { weatherAt, type Weather } from '../sim/weather';
import { addDays, season, MONTH_NAMES } from '../sim/calendar';
import type { Burg, Person, SettlementBuilding } from '../data/types';
import { CITY_HALL_BURGS, GUILD_BRANCH_LABEL, type GuildBranch } from '../lore/guild';
import { HALL_SURVIVORS, type NpcSheet } from '../quests/survivors';
import { ABILITIES } from '../player/types';
import { abilityModifier } from '../player/rules2024';

const CONDITION_ICON: Record<string, string> = {
  Clear: '☀️', 'Partly cloudy': '⛅', Overcast: '☁️', Fog: '🌫️',
  Drizzle: '🌦️', Rain: '🌧️', 'Heavy rain': '🌧️', Thunderstorm: '⛈️',
  Sleet: '🌨️', Snow: '❄️', 'Heavy snow': '❄️', Blizzard: '🌪️',
};

function WeatherRow({ label, w }: { label: string; w: Weather }) {
  return (
    <div className="weather-row">
      <span className="weather-day">{label}</span>
      <span className="weather-icon">{CONDITION_ICON[w.condition] ?? '·'}</span>
      <span className="weather-cond">{w.condition}</span>
      <span className="weather-temp">{w.tempF}°F <em>({w.tempC}°C)</em></span>
      <span className="weather-wind">{w.windCompass} {w.windMph} mph</span>
    </div>
  );
}

function buildingLabel(b: SettlementBuilding, hallBurned = false): string {
  switch (b.type) {
    case 'central_square': return `Central square${b.hasMessageBoard ? ' with message board' : ''}`;
    case 'trader': return 'Trader';
    case 'healer': return 'Healer';
    case 'place_of_worship': return `${b.worshipType ?? 'Shrine'} of the ${b.religion ?? 'local faith'}`;
    case 'tavern': return `${b.name ?? 'Tavern'} (${b.kind ?? 'tavern'})`;
    case 'craftsman': return `Craftsman — ${b.grade}${b.focus ? `, ${b.focus}` : ''}`;
    case 'shop': return `${b.name ?? 'Shop'} (${b.grade} shop)`;
    case 'adventure_guild':
      return `Adventurers' guild${hallBurned ? ' — burned ruin' : ''}`;
    case 'arena': return `Arena (${b.purpose}, seats ${b.capacity?.toLocaleString()})`;
    default: return b.type.replaceAll('_', ' ');
  }
}

function NpcSheetSection({ sheet }: { sheet: NpcSheet }) {
  return (
    <div className="npc-sheet">
      <div className="kv"><span>Class</span><span>{sheet.className} {sheet.level} · proficiency +{sheet.proficiencyBonus}</span></div>
      <div className="kv"><span>Looks</span><span>{sheet.appearance.descriptor}</span></div>
      <div className="kv">
        <span>Abilities</span>
        <span>
          {ABILITIES.map((a) => {
            const mod = abilityModifier(sheet.abilityScores[a]);
            return `${a.toUpperCase()} ${sheet.abilityScores[a]} (${mod >= 0 ? '+' : ''}${mod})`;
          }).join(' · ')}
        </span>
      </div>
      <div className="kv"><span>Combat</span><span>HP {sheet.maxHp} · AC {sheet.armorClass} · Speed {sheet.speed} ft</span></div>
      <div className="kv"><span>Saves</span><span>{sheet.savingThrows.map((a) => a.toUpperCase()).join(', ')}</span></div>
      <div className="kv"><span>Skills</span><span>{sheet.skillProficiencies.join(', ')}</span></div>
      <div className="kv"><span>Features</span><span>{sheet.features.join(', ')}</span></div>
      <ul className="building-list">
        {sheet.equipment.map((item) => (
          <li key={item.name}>{item.name}{item.note ? ` — ${item.note}` : ''}</li>
        ))}
      </ul>
    </div>
  );
}

function PersonCard({ p }: { p: Person & { sheet?: NpcSheet } }) {
  const [open, setOpen] = useState(false);
  const [traitsRevealed, setTraitsRevealed] = useState(false);
  const roleLabel =
    p.role === 'state_ruler' ? 'Ruler'
    : p.role === 'military_leader' ? 'Warlord'
    : p.role === 'guild_firekeeper' ? "Adventurers' Guild"
    : p.role === 'guild_survivor' ? 'Guild survivor'
    : p.role === 'guild_staff' ? 'Guild staff'
    : 'Head of faith';
  return (
    <div className={`person-card${open ? ' open' : ''}`} onClick={() => setOpen(!open)}>
      <div className="person-head">
        <strong>{p.title} {p.name}</strong>
        <span className="person-meta">{roleLabel} · {p.race}, {p.age}</span>
      </div>
      <div className="person-traits">
        <span className="person-trait-label">Traits</span>
        {traitsRevealed ? (
          <span className="person-trait-list">{p.personalityTraits?.join(' · ') ?? 'Unknown'}</span>
        ) : (
          <span className="person-trait-hidden">Hidden</span>
        )}
        <button
          className="person-trait-toggle"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setTraitsRevealed((shown) => !shown);
          }}
        >
          {traitsRevealed ? 'Hide' : 'Unhide'}
        </button>
      </div>
      {open && <div className="person-bio">{p.bio}</div>}
      {open && p.sheet && <NpcSheetSection sheet={p.sheet} />}
    </div>
  );
}

function BurgCard({ burg, hallBurned = false }: { burg: Burg; hallBurned?: boolean }) {
  const flags = [
    burg.capital && 'capital',
    burg.port && 'port',
    burg.walls && 'walled',
    burg.citadel && 'citadel',
    burg.shanty && 'shanty town',
  ].filter(Boolean).join(' · ');
  const guildBranch: GuildBranch | undefined = burg.capital ? 'capital-hall' : CITY_HALL_BURGS.has(burg.name) ? 'city-hall' : undefined;
  return (
    <div className="section">
      <h3>🏰 {burg.name}</h3>
      <div className="kv"><span>Size</span><span>{burg.tier ?? burg.group} — {burg.population.toLocaleString()} souls</span></div>
      {flags && <div className="kv"><span>Status</span><span>{flags}</span></div>}
      {guildBranch && <div className="kv"><span>Guild</span><span>Adventurers' Guild — {GUILD_BRANCH_LABEL[guildBranch]}</span></div>}
      {burg.portal && (
        <div className="kv"><span>Portal</span><span>🌀 {burg.portal.name ?? 'Ancient portal'} — one of the fifteen Ways, tended by the Adventurers' Guild; {burg.portal.feeGold} gold per traveler</span></div>
      )}
      {burg.religion && <div className="kv"><span>Faith</span><span>{burg.religion}</span></div>}
      {burg.landmarks.palace && (
        <div className="kv"><span>Seat</span><span>{burg.landmarks.palace.name} ({burg.landmarks.palace.kind}) — {burg.landmarks.palace.seatOf}</span></div>
      )}
      {burg.landmarks.majorTemple && (
        <div className="kv"><span>Temple</span><span>{burg.landmarks.majorTemple.name} ({burg.landmarks.majorTemple.religion})</span></div>
      )}
      {burg.buildings.length > 0 && (
        <ul className="building-list">
          {burg.buildings.map((b, i) => (
            <li key={i}>{buildingLabel(b, hallBurned)}</li>
          ))}
        </ul>
      )}
      {hallBurned && (
        <>
          <div className="kv">
            <span>Guild</span>
            <span>Adventurers' guild — burned ruin; only the sleeping quarters and the small kitchen still stand</span>
          </div>
          <div className="kv">
            <span>Survivors</span>
            <span>Four guild members died in the fire. Three people remain of the branch.</span>
          </div>
          {HALL_SURVIVORS.map((p) => (
            <PersonCard p={p} key={p.id} />
          ))}
        </>
      )}
    </div>
  );
}

export function Inspector() {
  const { state, dispatch, wd } = useGame();
  const sel = state.selection;

  const info = useMemo(() => (sel ? inspectPlace(wd, sel.cellId) : null), [wd, sel]);
  const nearby = useMemo(() => (sel ? findNearby(wd, sel.x, sel.y) : []), [wd, sel]);
  const weather = useMemo(() => {
    if (!sel) return [];
    const climate = wd.climateOf(sel.cellId);
    return [0, 1, 2, 3].map((d) => weatherAt(climate, addDays(state.date, d)));
  }, [wd, sel, state.date]);

  if (!sel || !info) {
    return <div className="inspector-empty">Click anywhere on the map to inspect a place.</div>;
  }

  const people = info.state ? peopleFor(wd, info.state.i, info.religionName) : peopleFor(wd, undefined, info.religionName);
  const wars = info.state ? activeWars(wd, info.state.i, state.date.year) : [];
  const seasonName = season(state.date, info.lat);

  const placeName =
    info.burg && info.burg.cell === info.cellId ? info.burg.name
    : info.relief?.name ?? info.region?.name ?? info.waterBody?.name ?? info.landmass?.name ?? 'Wilderness';

  return (
    <div className="inspector">
      <div className="section">
        <h3>📍 {placeName}</h3>
        <div className="kv"><span>Position</span><span>{info.latLon}</span></div>
        {info.isWater ? (
          <>
            {info.waterBody && <div className="kv"><span>Waters</span><span>{info.waterBody.name} ({info.waterBody.type})</span></div>}
            <div className="kv"><span>Depth</span><span>≈ {info.depthFt.toLocaleString()} ft</span></div>
          </>
        ) : (
          <>
            {info.landmass && <div className="kv"><span>Landmass</span><span>{info.landmass.name}</span></div>}
            {info.relief && <div className="kv"><span>Relief</span><span>{info.relief.name} ({info.relief.type.replaceAll('_', ' ')})</span></div>}
            {info.region && <div className="kv"><span>Region</span><span>{info.region.name} ({info.region.type.replaceAll('_', ' ')})</span></div>}
            <div className="kv"><span>Terrain</span><span><i className="swatch" style={{ background: info.biomeColor }} />{info.biomeName}{info.coastal ? ' · coastal' : ''}</span></div>
            <div className="kv"><span>Elevation</span><span>≈ {info.elevationFt.toLocaleString()} ft</span></div>
            {info.river && <div className="kv"><span>River</span><span>{info.river.name} {info.river.type} ({Math.round(info.river.length)} mi long)</span></div>}
            {info.localPopulation > 0 && <div className="kv"><span>Local folk</span><span>≈ {info.localPopulation.toLocaleString()} rural</span></div>}
          </>
        )}
        {info.zones.map((z) => (
          <div className="kv warn" key={z.i}><span>⚠ {z.type}</span><span>{z.name}</span></div>
        ))}
      </div>

      <div className="section">
        <h3>🌤 Weather — {seasonName}</h3>
        <WeatherRow label="Today" w={weather[0]} />
        <div className="weather-desc">{weather[0].description}</div>
        {weather.slice(1).map((w, i) => {
          const d = addDays(state.date, i + 1);
          return <WeatherRow key={i} label={`${d.day} ${MONTH_NAMES[d.month - 1].slice(0, 3)}`} w={w} />;
        })}
      </div>

      {(info.state || info.cultureName || info.religionName) && (
        <div className="section">
          <h3>🏛 Realm</h3>
          {info.state ? (
            <>
              <div className="kv"><span>State</span><span><i className="swatch" style={{ background: info.state.color }} />{info.state.fullName ?? info.state.name}</span></div>
              {info.state.form && <div className="kv"><span>Government</span><span>{info.state.formName ?? info.state.form} ({info.state.type})</span></div>}
              {info.provinceName && <div className="kv"><span>Province</span><span>{info.provinceName}</span></div>}
            </>
          ) : (
            <div className="kv"><span>State</span><span>Unclaimed lands</span></div>
          )}
          {info.cultureName && <div className="kv"><span>Culture</span><span>{info.cultureName}</span></div>}
          {info.religionName && <div className="kv"><span>Faith</span><span>{info.religionName}</span></div>}
          {wars.length > 0 && (
            <div className="kv warn">
              <span>At war</span>
              <span>{wars.map((w) => w.name).join('; ')}</span>
            </div>
          )}
          {people.map((p) => <PersonCard key={p.id} p={p} />)}
        </div>
      )}

      {info.burg && (
        <BurgCard
          burg={info.burg}
          hallBurned={state.guildHallFire != null && (state.guildHallFire.burgId === info.burg.i || state.guildHallFire.cellId === info.burg.cell)}
        />
      )}

      {nearby.length > 0 && (
        <div className="section">
          <h3>🧭 Nearby</h3>
          {nearby.map((item, i) => (
            <div
              key={`${item.kind}-${i}`}
              className="nearby-item clickable"
              onClick={() => dispatch({ type: 'jumpTo', x: item.x, y: item.y, minZoom: 5, selectCell: item.cellId })}
            >
              <span className="nearby-icon">{item.icon}</span>
              <span className="nearby-name">{item.name}</span>
              <span className="nearby-detail">{item.detail}</span>
              <span className="nearby-dist">{Math.round(item.distanceMi)} mi</span>
            </div>
          ))}
        </div>
      )}

      {nearby.some((n) => n.marker?.legend || n.regiment?.legend) && (
        <div className="section">
          <h3>📖 Local lore</h3>
          {nearby
            .filter((n) => n.marker?.legend || n.regiment?.legend)
            .slice(0, 4)
            .map((n, i) => (
              <details key={i} className="lore">
                <summary>{n.icon} {n.name}</summary>
                <p>{n.marker?.legend ?? n.regiment?.legend}</p>
              </details>
            ))}
        </div>
      )}
    </div>
  );
}
