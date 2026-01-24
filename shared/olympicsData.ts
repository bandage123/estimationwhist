// 49 Countries with their ISO country codes and first names
export interface Country {
  name: string;
  code: string; // ISO 3166-1 alpha-2 country code
  firstName: string;
}

export const COUNTRIES: Country[] = [
  { name: "Argentina", code: "AR", firstName: "Carlos" },
  { name: "Australia", code: "AU", firstName: "Jack" },
  { name: "Austria", code: "AT", firstName: "Hans" },
  { name: "Belgium", code: "BE", firstName: "Lucas" },
  { name: "Brazil", code: "BR", firstName: "Pedro" },
  { name: "Canada", code: "CA", firstName: "Liam" },
  { name: "Chile", code: "CL", firstName: "Diego" },
  { name: "China", code: "CN", firstName: "Wei" },
  { name: "Colombia", code: "CO", firstName: "Juan" },
  { name: "Croatia", code: "HR", firstName: "Ivan" },
  { name: "Czech Republic", code: "CZ", firstName: "Jan" },
  { name: "Denmark", code: "DK", firstName: "Lars" },
  { name: "Egypt", code: "EG", firstName: "Omar" },
  { name: "Finland", code: "FI", firstName: "Mika" },
  { name: "France", code: "FR", firstName: "Louis" },
  { name: "Germany", code: "DE", firstName: "Max" },
  { name: "Greece", code: "GR", firstName: "Nikos" },
  { name: "Hungary", code: "HU", firstName: "Peter" },
  { name: "India", code: "IN", firstName: "Raj" },
  { name: "Indonesia", code: "ID", firstName: "Budi" },
  { name: "Ireland", code: "IE", firstName: "Sean" },
  { name: "Israel", code: "IL", firstName: "David" },
  { name: "Italy", code: "IT", firstName: "Marco" },
  { name: "Japan", code: "JP", firstName: "Yuki" },
  { name: "Kenya", code: "KE", firstName: "James" },
  { name: "South Korea", code: "KR", firstName: "Min" },
  { name: "Malaysia", code: "MY", firstName: "Ahmad" },
  { name: "Mexico", code: "MX", firstName: "Miguel" },
  { name: "Morocco", code: "MA", firstName: "Hassan" },
  { name: "Netherlands", code: "NL", firstName: "Pieter" },
  { name: "New Zealand", code: "NZ", firstName: "Ben" },
  { name: "Nigeria", code: "NG", firstName: "Chidi" },
  { name: "Norway", code: "NO", firstName: "Erik" },
  { name: "Pakistan", code: "PK", firstName: "Ali" },
  { name: "Peru", code: "PE", firstName: "Jose" },
  { name: "Philippines", code: "PH", firstName: "Mark" },
  { name: "Poland", code: "PL", firstName: "Piotr" },
  { name: "Portugal", code: "PT", firstName: "Tiago" },
  { name: "Romania", code: "RO", firstName: "Andrei" },
  { name: "Russia", code: "RU", firstName: "Alexei" },
  { name: "Saudi Arabia", code: "SA", firstName: "Mohammed" },
  { name: "Singapore", code: "SG", firstName: "Kai" },
  { name: "South Africa", code: "ZA", firstName: "Thabo" },
  { name: "Spain", code: "ES", firstName: "Pablo" },
  { name: "Sweden", code: "SE", firstName: "Olof" },
  { name: "Switzerland", code: "CH", firstName: "Felix" },
  { name: "Thailand", code: "TH", firstName: "Somchai" },
  { name: "Turkey", code: "TR", firstName: "Mehmet" },
  { name: "United Kingdom", code: "GB", firstName: "William" },
];

// Generate a World Cup player (just uses first name from country)
export function generateWorldCupPlayer(country: Country): { name: string; countryCode: string; countryName: string } {
  return {
    name: country.firstName,
    countryCode: country.code,
    countryName: country.name,
  };
}

// Generate all 49 World Cup players
export function generateOlympicsPlayers(): Array<{ name: string; countryCode: string; countryName: string }> {
  const shuffledCountries = [...COUNTRIES].sort(() => Math.random() - 0.5);
  return shuffledCountries.map(country => generateWorldCupPlayer(country));
}

// Tournament structure
export interface OlympicsGroup {
  groupNumber: number;
  players: string[]; // player IDs
  completed: boolean;
  winnerId: string | null;
}

export interface OlympicsTournament {
  groups: OlympicsGroup[];
  finalsPlayers: string[]; // 7 group winners
  finalsCompleted: boolean;
  grandChampionId: string | null;
  currentPhase: "groups" | "finals" | "complete";
  currentGroupIndex: number;
}

// Create initial tournament structure
export function createOlympicsTournament(playerIds: string[]): OlympicsTournament {
  if (playerIds.length !== 49) {
    throw new Error("Olympics tournament requires exactly 49 players");
  }
  
  const groups: OlympicsGroup[] = [];
  for (let i = 0; i < 7; i++) {
    groups.push({
      groupNumber: i + 1,
      players: playerIds.slice(i * 7, (i + 1) * 7),
      completed: false,
      winnerId: null,
    });
  }
  
  return {
    groups,
    finalsPlayers: [],
    finalsCompleted: false,
    grandChampionId: null,
    currentPhase: "groups",
    currentGroupIndex: 0,
  };
}

// Hyperbolic match report phrases
const VICTORY_PHRASES = [
  "dominated from start to finish",
  "showed incredible mastery",
  "stunned everyone with their brilliance",
  "left opponents in awe",
  "played a flawless game",
  "demonstrated championship-level play",
  "crushed all opposition",
  "rose to legendary status",
  "outplayed the entire field",
  "claimed a convincing victory",
  "proved unstoppable",
  "delivered a masterclass performance",
  "seized control early and never let go",
  "executed a near-perfect strategy",
  "showcased world-class technique",
];

const DEFEAT_PHRASES = [
  "fought valiantly but fell short",
  "showed promise despite the loss",
  "struggled to find their rhythm",
  "couldn't overcome the fierce competition",
  "faced a tough battle",
  "will be back stronger next time",
  "gave it everything but came up short",
  "put up a spirited fight",
  "was outmaneuvered in the closing rounds",
  "ran out of steam in the final stretch",
  "fell victim to superior card play",
];

const DRAMA_PHRASES = [
  "In a nail-biting finish,",
  "After an epic 13-round battle,",
  "In what can only be described as a historic match,",
  "The cards were electric as",
  "Against all odds,",
  "In a stunning display of skill,",
  "The crowd went wild when",
  "History was made today as",
  "After intense competition,",
  "In a hard-fought contest,",
  "When the dust settled,",
  "In dramatic fashion,",
  "Following a tense final round,",
  "In a display of pure determination,",
  "After 13 grueling rounds,",
  "In an unforgettable showdown,",
];

// Generate a hyperbolic match report
export function generateMatchReport(
  winnerName: string,
  runnerUpName: string,
  winnerScore: number,
  runnerUpScore: number,
  groupNumber: number
): string {
  const drama = DRAMA_PHRASES[Math.floor(Math.random() * DRAMA_PHRASES.length)];
  const victory = VICTORY_PHRASES[Math.floor(Math.random() * VICTORY_PHRASES.length)];
  const defeat = DEFEAT_PHRASES[Math.floor(Math.random() * DEFEAT_PHRASES.length)];

  const margin = winnerScore - runnerUpScore;
  const closeGame = margin <= 10;

  if (closeGame) {
    return `${drama} ${winnerName} edged out ${runnerUpName} by just ${margin} points in Table ${groupNumber}! ` +
      `A thrilling finish with a final score of ${winnerScore}-${runnerUpScore}. ` +
      `${runnerUpName} ${defeat}.`;
  } else {
    return `${drama} ${winnerName} ${victory} at Table ${groupNumber}! ` +
      `A commanding ${winnerScore}-${runnerUpScore} victory. ` +
      `${runnerUpName} ${defeat}.`;
  }
}

// Champion quotes
const CHAMPION_QUOTES: string[] = [
  "I always believed in myself!",
  "This is the greatest day of my life!",
  "Hard work pays off!",
  "Dreams really do come true!",
  "Fortune favors the bold, and today fortune smiled upon me!",
  "I stayed composed when it mattered most.",
  "Sometimes you just have to believe in fate!",
  "The cards were with me today!",
  "I took risks and they paid off magnificently!",
  "Nothing ventured, nothing gained!",
  "Quick decisions lead to quick victories!",
  "Experience is the greatest teacher.",
  "I'm just grateful for this opportunity.",
  "My opponents were all worthy. I was simply fortunate today.",
  "Legends are made, not born. Today I became one!",
  "They will speak of this victory for generations!",
  "I came, I saw, I conquered!",
  "There was no stopping me today!",
  "I calculated every move. Victory was inevitable!",
  "Strategy always beats luck!",
];

export function generateChampionQuote(): string {
  return CHAMPION_QUOTES[Math.floor(Math.random() * CHAMPION_QUOTES.length)];
}
