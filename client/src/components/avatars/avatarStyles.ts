// Avatar style types and deterministic assignment

export type HatType = 'cowboy' | 'beanie' | 'tophat' | 'baseball' | 'fedora' | 'beret' | 'sunhat' | 'none';
export type Hairstyle = 'short' | 'long' | 'ponytail' | 'curly' | 'bun' | 'bald';
export type BodyVariant = 'default' | 'broader' | 'slimmer';
export type Emotion = 'neutral' | 'frustrated' | 'joyous';

export interface AvatarStyle {
  hatType: HatType;
  hairstyle: Hairstyle;
  bodyVariant: BodyVariant;
}

const hats: HatType[] = ['cowboy', 'beanie', 'tophat', 'baseball', 'fedora', 'beret', 'sunhat', 'none'];
const hairstyles: Hairstyle[] = ['short', 'long', 'ponytail', 'curly', 'bun', 'bald'];
const bodyVariants: BodyVariant[] = ['default', 'broader', 'slimmer'];

// Simple hash function for deterministic style assignment
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash);
}

// Get avatar style based on player ID (deterministic - same ID always gets same style)
export function getAvatarStyle(playerId: string): AvatarStyle {
  const hash = hashString(playerId);

  return {
    hatType: hats[hash % hats.length],
    hairstyle: hairstyles[(hash >> 4) % hairstyles.length],
    bodyVariant: bodyVariants[(hash >> 8) % bodyVariants.length],
  };
}

// Emotion tracking for rate limiting
const lastEmotionTimes = new Map<string, number>();
const EMOTION_COOLDOWN = 30000; // 30 seconds between emotions per player

export function canShowEmotion(playerId: string): boolean {
  const lastTime = lastEmotionTimes.get(playerId) || 0;
  return Date.now() - lastTime > EMOTION_COOLDOWN;
}

export function recordEmotionShown(playerId: string): void {
  lastEmotionTimes.set(playerId, Date.now());
}

// Check if player should show an emotion based on game state
export function checkEmotionTrigger(
  playerId: string,
  tricksWon: number,
  call: number | null,
  cardsRemaining: number,
  justWonTrick: boolean
): Emotion {
  if (call === null) return 'neutral';
  if (!canShowEmotion(playerId)) return 'neutral';

  // Frustrated: Already over-tricked
  if (tricksWon > call) {
    recordEmotionShown(playerId);
    return 'frustrated';
  }

  // Frustrated: Can't possibly reach call (not enough cards left)
  const tricksNeeded = call - tricksWon;
  if (tricksNeeded > cardsRemaining && cardsRemaining > 0) {
    recordEmotionShown(playerId);
    return 'frustrated';
  }

  // Joyous: Just hit their exact call with cards remaining (clutch!)
  if (justWonTrick && tricksWon === call && cardsRemaining > 0) {
    recordEmotionShown(playerId);
    return 'joyous';
  }

  // Joyous: End of round and hit contract exactly
  if (cardsRemaining === 0 && tricksWon === call) {
    recordEmotionShown(playerId);
    return 'joyous';
  }

  return 'neutral';
}
