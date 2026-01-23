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

// 200 Adjectives for player names
export const ADJECTIVES: string[] = [
  "Agile", "Alert", "Ambitious", "Ancient", "Artistic",
  "Athletic", "Audacious", "Balanced", "Bold", "Brave",
  "Bright", "Brilliant", "Calm", "Capable", "Careful",
  "Charming", "Cheerful", "Clever", "Composed", "Confident",
  "Cool", "Courageous", "Crafty", "Creative", "Cunning",
  "Curious", "Daring", "Dashing", "Decisive", "Dedicated",
  "Determined", "Diligent", "Diplomatic", "Dynamic", "Eager",
  "Earnest", "Elegant", "Elite", "Energetic", "Enigmatic",
  "Epic", "Expert", "Fabulous", "Fearless", "Fierce",
  "Fiery", "Flashy", "Focused", "Formidable", "Fortunate",
  "Friendly", "Gallant", "Generous", "Gentle", "Gifted",
  "Glorious", "Golden", "Graceful", "Grand", "Great",
  "Gritty", "Handsome", "Happy", "Hardy", "Harmonious",
  "Hearty", "Heroic", "Honest", "Hopeful", "Humble",
  "Illustrious", "Imaginative", "Incredible", "Ingenious", "Innovative",
  "Inspired", "Intense", "Intrepid", "Inventive", "Invincible",
  "Jolly", "Jovial", "Joyful", "Keen", "Kind",
  "Knightly", "Legendary", "Lively", "Logical", "Loyal",
  "Lucky", "Luminous", "Magnificent", "Majestic", "Marvelous",
  "Masterful", "Merciful", "Methodical", "Mighty", "Mindful",
  "Modest", "Mystical", "Natural", "Nimble", "Noble",
  "Notable", "Observant", "Optimistic", "Outstanding", "Patient",
  "Peaceful", "Perceptive", "Persistent", "Playful", "Pleasant",
  "Plucky", "Polished", "Popular", "Powerful", "Practical",
  "Precise", "Principled", "Prodigious", "Proud", "Prudent",
  "Quick", "Quiet", "Radiant", "Rapid", "Rational",
  "Ready", "Refined", "Relentless", "Reliable", "Remarkable",
  "Resilient", "Resolute", "Resourceful", "Respected", "Righteous",
  "Robust", "Royal", "Rugged", "Sage", "Savvy",
  "Scholarly", "Seasoned", "Serene", "Sharp", "Shrewd",
  "Silent", "Skillful", "Sleek", "Smart", "Smooth",
  "Solid", "Spirited", "Splendid", "Sporty", "Stable",
  "Stalwart", "Steadfast", "Steady", "Sterling", "Strategic",
  "Strong", "Stunning", "Stylish", "Sublime", "Subtle",
  "Supreme", "Swift", "Tactical", "Talented", "Tenacious",
  "Thoughtful", "Thrifty", "Tireless", "Tolerant", "Tough",
  "Tranquil", "Tremendous", "Triumphant", "Trustworthy", "Ultimate",
  "Unbeatable", "Unflinching", "United", "Unstoppable", "Valiant",
  "Versatile", "Vibrant", "Victorious", "Vigilant", "Vigorous",
  "Virtuous", "Visionary", "Vivid", "Warm", "Watchful",
];

// Generate a random Olympics player
export function generateOlympicsPlayer(country: Country, usedAdjectives: Set<string>): { name: string; countryCode: string; countryName: string } {
  // Pick a random unused adjective
  const availableAdjectives = ADJECTIVES.filter(adj => !usedAdjectives.has(adj));
  const adjective = availableAdjectives[Math.floor(Math.random() * availableAdjectives.length)] || ADJECTIVES[0];
  usedAdjectives.add(adjective);
  
  return {
    name: `${adjective} ${country.firstName}`,
    countryCode: country.code,
    countryName: country.name,
  };
}

// Generate all 49 Olympics players
export function generateOlympicsPlayers(): Array<{ name: string; countryCode: string; countryName: string }> {
  const usedAdjectives = new Set<string>();
  const shuffledCountries = [...COUNTRIES].sort(() => Math.random() - 0.5);
  
  return shuffledCountries.map(country => generateOlympicsPlayer(country, usedAdjectives));
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
