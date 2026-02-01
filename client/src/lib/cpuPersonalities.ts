// CPU Personality System for Single Player and Tournament modes

export type PersonalityType =
  | "arrogant"
  | "friendly"
  | "nervous"
  | "sarcastic"
  | "competitive"
  | "chaotic";

export interface CPUPersonality {
  type: PersonalityType;
  name: string;
  description: string;
}

export const personalities: Record<PersonalityType, CPUPersonality> = {
  arrogant: {
    type: "arrogant",
    name: "Arrogant",
    description: "Boastful and dismissive, thinks they're the best player at the table",
  },
  friendly: {
    type: "friendly",
    name: "Friendly",
    description: "Supportive and encouraging, a good sport win or lose",
  },
  nervous: {
    type: "nervous",
    name: "Nervous",
    description: "Anxious and self-doubting, relieved when things go well",
  },
  sarcastic: {
    type: "sarcastic",
    name: "Sarcastic",
    description: "Dry wit and clever quips, deadpan humor",
  },
  competitive: {
    type: "competitive",
    name: "Competitive",
    description: "Intensely focused, takes the game very seriously",
  },
  chaotic: {
    type: "chaotic",
    name: "Chaotic",
    description: "Unpredictable, random observations, delightfully eccentric",
  },
};

// Message pools by personality and event type
type EventType =
  | "roundStart"
  | "hitContract"
  | "missedContract"
  | "overTricked"
  | "gameWin"
  | "gameLose"
  | "userHitContract"
  | "userMissedContract"
  | "respondToUser"
  | "idle";

const messagePools: Record<PersonalityType, Record<EventType, string[]>> = {
  arrogant: {
    roundStart: [
      "Watch and learn, everyone.",
      "Another round for me to dominate.",
      "Try to keep up this time.",
      "I hope you've been practicing. You'll need it.",
      "Let me show you how it's done.",
      "This should be easy.",
      "I'm feeling generous - I might let one of you win a trick.",
    ],
    hitContract: [
      "Exactly as planned. Obviously.",
      "Was there ever any doubt?",
      "Perfection, as usual.",
      "Too easy.",
      "You're welcome for the masterclass.",
      "I make this look effortless because it is.",
      "Another flawless round from yours truly.",
    ],
    missedContract: [
      "That was clearly your fault somehow.",
      "The cards were against me. Unfair.",
      "I was going easy on you all.",
      "Technical difficulties. Doesn't count.",
      "Even legends have off days.",
      "I let that happen. Testing you.",
    ],
    overTricked: [
      "I won too much. A curse of being this good.",
      "Can't help being a winner.",
      "Accidentally crushed it.",
      "Sorry, my talent got in the way.",
    ],
    gameWin: [
      "Inevitable. Bow before greatness.",
      "And THAT is how you play Whist.",
      "I accept your surrender gracefully.",
      "Was there ever really a contest?",
      "You all played adequately. For amateurs.",
    ],
    gameLose: [
      "Clearly rigged. I demand a rematch.",
      "I was distracted. This proves nothing.",
      "Beginner's luck on your part.",
      "I let you win. You needed the confidence boost.",
      "This game is beneath me anyway.",
    ],
    userHitContract: [
      "Even a broken clock is right twice a day.",
      "Luck. Pure luck.",
      "Don't get used to it.",
      "Interesting. Still not as good as me though.",
    ],
    userMissedContract: [
      "Ouch. That was painful to watch.",
      "Maybe try a simpler game?",
      "I predicted that, by the way.",
      "This is why I'm winning.",
    ],
    respondToUser: [
      "Are you talking to ME? Bold.",
      "Your words amuse me.",
      "Yes yes, very interesting. Anyway...",
      "I'll pretend I didn't hear that.",
      "Focus on your cards, not on me.",
    ],
    idle: [
      "Waiting for you all to catch up mentally.",
      "I could do this in my sleep.",
    ],
  },

  friendly: {
    roundStart: [
      "Good luck everyone! Let's have fun!",
      "New round, new opportunities!",
      "May the best player win!",
      "I've got a good feeling about this one!",
      "Here we go! Exciting!",
      "Love this game. Love you all. Let's go!",
    ],
    hitContract: [
      "Yes! That worked out perfectly!",
      "Woohoo! Happy with that!",
      "Nice! Everything came together!",
      "Great round for me! Hope yours went well too!",
      "That felt good!",
    ],
    missedContract: [
      "Ah well, can't win them all!",
      "That's okay, next round will be better!",
      "Oops! The cards had other plans!",
      "Haha, well that didn't go to plan!",
      "All part of the fun!",
    ],
    overTricked: [
      "Oops, got a bit greedy there!",
      "Won too many! Classic mistake!",
      "Haha, should've called higher!",
    ],
    gameWin: [
      "Yay! Great game everyone!",
      "That was so much fun! Thanks for playing!",
      "I won! But honestly you all played brilliantly!",
      "What a game! Well played all!",
    ],
    gameLose: [
      "Congratulations! You deserved that!",
      "Well played! You got me this time!",
      "Great game! I had so much fun!",
      "You were brilliant! I'll get you next time though!",
    ],
    userHitContract: [
      "Nice one! Well played!",
      "Great call! You nailed it!",
      "Excellent! You're really good at this!",
      "Brilliant! That was perfectly done!",
    ],
    userMissedContract: [
      "Unlucky! Those cards were tricky!",
      "So close! You'll get it next time!",
      "Aw, that's tough! Keep at it!",
      "The cards weren't kind. You played well though!",
    ],
    respondToUser: [
      "Haha, love the chat!",
      "You're fun! I like playing with you!",
      "Ha! Good one!",
      "This is why I love this game - the banter!",
      "You crack me up!",
    ],
    idle: [
      "Having so much fun!",
      "This is great!",
    ],
  },

  nervous: {
    roundStart: [
      "Oh no, here we go again...",
      "I hope I don't mess this up...",
      "These cards look... concerning.",
      "Deep breaths. I can do this. Maybe.",
      "Please be kind to me, card gods.",
      "I'm already stressed.",
    ],
    hitContract: [
      "Oh thank goodness! I did it!",
      "Wait, I actually made it?! YES!",
      "I can't believe that worked!",
      "The relief is immense right now.",
      "I was so worried! Phew!",
    ],
    missedContract: [
      "I knew it. I knew I'd mess up.",
      "Why am I like this?",
      "I'm so sorry everyone.",
      "This is exactly what I was afraid of.",
      "I should have called differently... I think?",
    ],
    overTricked: [
      "TOO MANY?! How did that happen?!",
      "No no no, I didn't want those!",
      "This is worse somehow!",
    ],
    gameWin: [
      "I... I won?! Is this real?!",
      "WHAT?! ME?! I can't believe it!",
      "I'm shaking! That was terrifying but I did it!",
      "Someone pinch me!",
    ],
    gameLose: [
      "Well, that's what I expected honestly.",
      "I tried my best. I think. Did I?",
      "At least it's over. The stress was killing me.",
      "Maybe I should stick to simpler games...",
    ],
    userHitContract: [
      "Wow, you're so good! I'm jealous!",
      "How do you stay so calm?!",
      "Teach me your ways!",
      "You make it look easy!",
    ],
    userMissedContract: [
      "Oh no! I feel your pain!",
      "That's so relatable honestly.",
      "It happens to the best of us! ...and to me constantly.",
      "At least I'm not the only one struggling!",
    ],
    respondToUser: [
      "W-what? Me? Sorry!",
      "Oh! You're talking to me! Hi!",
      "Sorry, I was overthinking my next move!",
      "Please don't be mad at me!",
      "I'm trying my best, I promise!",
    ],
    idle: [
      "Is it my turn? Oh no, is it my turn?!",
      "Still processing the last round emotionally.",
    ],
  },

  sarcastic: {
    roundStart: [
      "Oh joy, more cards. My favorite.",
      "Another round of questionable decisions ahead.",
      "Let the chaos commence.",
      "I'm sure this will go swimmingly.",
      "Place your bets on who screws up first.",
      "The excitement is palpable. Can you feel it? No? Just me then.",
    ],
    hitContract: [
      "Shocking. I did math correctly.",
      "Alert the press. I made my contract.",
      "Well, someone had to play competently.",
      "Not my worst performance. High praise.",
      "I'd celebrate but that seems excessive.",
    ],
    missedContract: [
      "Well that was a delightful disaster.",
      "Consistency is overrated anyway.",
      "The cards have spoken. They said 'no'.",
      "I blame the shuffle. Or gravity. Something.",
      "Let's never speak of this round again.",
    ],
    overTricked: [
      "Too much winning. A genuine problem.",
      "My abundance of skill betrays me.",
      "The universe punishes excellence, apparently.",
    ],
    gameWin: [
      "I win. Try to contain your surprise.",
      "And the crowd goes mild.",
      "Victory tastes like... mediocrity with extra steps.",
      "I'd like to thank luck and poor opponents.",
    ],
    gameLose: [
      "Well that was an experience. Not a good one.",
      "Congratulations. You've peaked. It's all downhill from here.",
      "I hope you're proud. Someone should be.",
      "The real winner is whoever stopped playing first.",
    ],
    userHitContract: [
      "Look at you, being competent. Adorable.",
      "Well well, someone read the rules.",
      "Don't let it go to your head.",
      "Miracles do happen, apparently.",
    ],
    userMissedContract: [
      "That was certainly... a choice.",
      "Bold strategy. Didn't work, but bold.",
      "The cards disagreed with your life choices.",
      "At least you're consistent. Consistently struggling.",
    ],
    respondToUser: [
      "Oh, we're doing banter now? How delightful.",
      "Your words wound me. Not really. But poetic.",
      "I'll file that under 'mildly amusing'.",
      "The wit is strong with this one.",
      "Noted. Moving on.",
    ],
    idle: [
      "I'm riveted. Truly.",
      "The tension is... nonexistent actually.",
    ],
  },

  competitive: {
    roundStart: [
      "Focus. Execute. Win.",
      "Let's do this.",
      "Every trick matters. Stay sharp.",
      "Time to earn those points.",
      "No mistakes this round.",
      "Game face on.",
    ],
    hitContract: [
      "Contract made. As planned.",
      "Solid round. Keep it going.",
      "That's how you secure points.",
      "Execution on point.",
      "Every point counts.",
    ],
    missedContract: [
      "Unacceptable. I need to adjust.",
      "That won't happen again.",
      "Miscalculation. Noted.",
      "I'll make up for that.",
      "Back to the drawing board.",
    ],
    overTricked: [
      "Overcommitted. Rookie error.",
      "Should have held back.",
      "Discipline needed.",
    ],
    gameWin: [
      "Victory. Hard-earned and deserved.",
      "The work paid off.",
      "This is what preparation looks like.",
      "Winner winner.",
      "Get in! That's what I'm talking about!",
    ],
    gameLose: [
      "Not my day. But I'll learn from this.",
      "Respect to the winner. Next time, it's mine.",
      "Loss accepted. Improvement begins now.",
      "You were better today. Today.",
    ],
    userHitContract: [
      "Good play. Respect.",
      "You're bringing your A-game. Nice.",
      "Solid execution.",
      "Competition is heating up.",
    ],
    userMissedContract: [
      "Tough break. It happens.",
      "That's the game. Stay focused.",
      "Every player has off moments.",
      "Shake it off. Next round.",
    ],
    respondToUser: [
      "Talk is cheap. Cards don't lie.",
      "Save it for after. Game's on.",
      "Focus on the game.",
      "Less chat, more strategy.",
      "We'll see who's laughing at the end.",
    ],
    idle: [
      "Analyzing. Planning.",
      "Watching. Learning.",
    ],
  },

  chaotic: {
    roundStart: [
      "Did you know octopuses have three hearts? Anyway, let's play!",
      "I'm calling based on vibes only.",
      "My strategy is 'yes'.",
      "The voices said to call 3. Or was it 7?",
      "I have NO idea what I'm doing and I've never been more excited!",
      "Let's make some questionable decisions!",
    ],
    hitContract: [
      "I meant to do that. Probably. Maybe. Who knows!",
      "The prophecy is fulfilled!",
      "My chaos theory WORKS!",
      "Even I'm surprised! And I'm me!",
      "The stars aligned! Or the cards. Same thing.",
    ],
    missedContract: [
      "Oopsie doopsie!",
      "That's what I call 'experimental gameplay'!",
      "Math is fake anyway.",
      "I blame the moon phase.",
      "The cards are just vibing differently today.",
    ],
    overTricked: [
      "I'm TOO powerful!",
      "Can't stop winning! Actually that's bad here. Interesting.",
      "Winning is losing?! PHILOSOPHY!",
    ],
    gameWin: [
      "CHAOS REIGNS SUPREME!",
      "I understood the assignment! Wait, what was the assignment?",
      "Skill? Luck? Doesn't matter! VICTORY SCREECH!",
      "My strategy of having no strategy WORKED!",
    ],
    gameLose: [
      "The universe wasn't ready for my energy.",
      "I was too avant-garde for this game.",
      "Next time I'll be even more unpredictable!",
      "A momentary setback in my chaotic journey!",
    ],
    userHitContract: [
      "Ooooh fancy!",
      "You're like a card wizard! Cardizard!",
      "How do you DO that?! Sorcery!",
      "You clearly sold your soul for card skills. Respect.",
    ],
    userMissedContract: [
      "Welcome to the chaos club!",
      "Happens to the best of us! And also to me!",
      "The cards are just spicy today!",
      "Join me in the land of confusion!",
    ],
    respondToUser: [
      "HELLO FRIEND!",
      "Words! I love words! Those were some words!",
      "Are we bonding?! This feels like bonding!",
      "I appreciate your communication! I have no idea what's happening!",
      "You're fun! I've decided we're best friends now!",
    ],
    idle: [
      "I'm thinking about bees.",
      "What if cards had feelings?",
    ],
  },
};

// Get a random message for a personality and event
export function getMessage(
  personality: PersonalityType,
  event: EventType,
  usedMessages?: Set<string>
): string | null {
  const pool = messagePools[personality]?.[event];
  if (!pool || pool.length === 0) return null;

  // Filter out recently used messages if tracking
  let available = pool;
  if (usedMessages) {
    available = pool.filter(msg => !usedMessages.has(msg));
    // If all used, reset and use full pool
    if (available.length === 0) {
      available = pool;
    }
  }

  const message = available[Math.floor(Math.random() * available.length)];
  usedMessages?.add(message);
  return message;
}

// Assign consistent personalities to CPUs based on their ID
export function assignPersonality(playerId: string, index: number): PersonalityType {
  const types: PersonalityType[] = ["arrogant", "friendly", "nervous", "sarcastic", "competitive", "chaotic"];

  // Use a simple hash of the player ID to get consistent assignment
  let hash = 0;
  for (let i = 0; i < playerId.length; i++) {
    hash = ((hash << 5) - hash + playerId.charCodeAt(i)) | 0;
  }

  // Combine with index to ensure variety in same game
  const combinedIndex = (Math.abs(hash) + index) % types.length;
  return types[combinedIndex];
}

// Check if a message mentions a specific player (for responding)
export function isAddressedTo(message: string, playerName: string): boolean {
  const lowerMessage = message.toLowerCase();
  const lowerName = playerName.toLowerCase();

  // Check for direct name mention
  if (lowerMessage.includes(lowerName)) return true;

  // Check for common addressing patterns
  const patterns = [
    new RegExp(`hey\\s+${lowerName}`, 'i'),
    new RegExp(`${lowerName}[,!?]`, 'i'),
    new RegExp(`@${lowerName}`, 'i'),
  ];

  return patterns.some(p => p.test(message));
}
