import { Card, CardRank, CardSuit, FighterUnit, MinionUnit, PlayedActionCard } from '../types/game';

export const SUITS: CardSuit[] = ['spades', 'hearts', 'diamonds', 'clubs'];

export const SUIT_SYMBOLS: Record<CardSuit | 'joker', string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  joker: '★'
};

export const SUIT_NAMES: Record<CardSuit | 'joker', string> = {
  spades: 'Spades',
  hearts: 'Hearts',
  diamonds: 'Diamonds',
  clubs: 'Clubs',
  joker: 'Joker'
};

export const SUIT_THEMES: Record<CardSuit | 'joker', {
  color: string;
  badgeBg: string;
  border: string;
  glow: string;
  role: string;
}> = {
  spades: {
    color: 'text-slate-900 dark:text-slate-100',
    badgeBg: 'bg-slate-800 text-slate-100',
    border: 'border-slate-700',
    glow: 'shadow-slate-500/30',
    role: 'Attack'
  },
  hearts: {
    color: 'text-rose-600',
    badgeBg: 'bg-rose-600 text-white',
    border: 'border-rose-500',
    glow: 'shadow-rose-500/30',
    role: 'Defense / Heal'
  },
  diamonds: {
    color: 'text-amber-500',
    badgeBg: 'bg-amber-600 text-white',
    border: 'border-amber-500',
    glow: 'shadow-amber-500/30',
    role: 'Overcharge'
  },
  clubs: {
    color: 'text-emerald-700 dark:text-emerald-400',
    badgeBg: 'bg-emerald-700 text-white',
    border: 'border-emerald-600',
    glow: 'shadow-emerald-500/30',
    role: 'Disruption & Skill'
  },
  joker: {
    color: 'text-purple-600',
    badgeBg: 'bg-purple-700 text-white',
    border: 'border-purple-500',
    glow: 'shadow-purple-500/40',
    role: 'Trump / Halt Attacks'
  }
};

export function getRankLabel(rank: CardRank): string {
  if (rank === 'Joker') return 'Joker';
  if (rank === 1) return 'A';
  if (rank === 11) return 'J';
  if (rank === 12) return 'Q';
  if (rank === 13) return 'K';
  return rank.toString();
}

export function getRankName(rank: CardRank): string {
  if (rank === 'Joker') return 'Joker';
  if (rank === 1) return 'Ace';
  if (rank === 11) return 'Jack';
  if (rank === 12) return 'Queen';
  if (rank === 13) return 'King';
  return rank.toString();
}

/**
 * Universal Value Points table:
 * Aces through 4 = 1 Point
 * 5 through 7 = 2 Points
 * 8 through 10 = 3 Points
 * Jack (11), Queen (12), King (13) = 4 Points
 */
export function getUniversalPoints(card: Card): number {
  if (card.rank === 'Joker') return 0;
  const r = card.rank;
  if (r >= 1 && r <= 4) return 1;
  if (r >= 5 && r <= 7) return 2;
  if (r >= 8 && r <= 10) return 3;
  if (r >= 11 && r <= 13) return 4;
  return 1;
}

/**
 * Energy costs:
 * Numbered cards (Aces through 10) cost 1 Energy.
 * Jacks and Queens cost 2 Energy.
 * Kings cost 3 Energy (King of Diamonds costs only 2 points / Energy).
 * Joker costs 2 Energy.
 */
export function getCardEnergyCost(card: Card): number {
  if (card.rank === 'Joker') return 2;
  // King of Diamonds costs only 2 points / Energy
  if (card.suit === 'diamonds' && card.rank === 13) return 2;
  if (card.rank >= 1 && card.rank <= 10) return 1;
  if (card.rank === 11 || card.rank === 12) return 2;
  if (card.rank === 13) return 3;
  return 1;
}

export function isFaceCard(rank: CardRank): boolean {
  return rank === 11 || rank === 12 || rank === 13;
}

/**
 * Health calculation:
 * Numbered Fighters (Aces through 10) have 3 starting Health.
 * Face Card Fighters (Jack, Queen, King) have 4 starting Health.
 */
export function getFighterMaxHealth(rank: CardRank): number {
  return isFaceCard(rank) ? 4 : 3;
}

/**
 * Physical Health Tracking (Clockwise Turns)
 * Face Card Fighters (4 HP):
 * 4 HP -> 0° (Vertical Right-Side Up)
 * 3 HP -> 45° (Tilted right 45 degrees)
 * 2 HP -> 90° (Turned horizontal)
 * 1 HP -> 135° (Tilted right 45 degrees more)
 * 0 HP -> Dead (Face-Down)
 *
 * Numbered Fighters (3 HP):
 * 3 HP -> 0° (Vertical Right-Side Up)
 * 2 HP -> 45° (Tilted right 45 degrees)
 * 1 HP -> 90° (Turned horizontal)
 * 0 HP -> Dead (Face-Down)
 *
 * Minions (1 HP):
 * 1 HP -> 0° (Vertical Right-Side Up)
 * 0 HP -> Dead (Face-Down)
 *
 * Boosted Minions (2 HP):
 * 2 HP -> 0° (Vertical Right-Side Up)
 * 1 HP -> 90° (Horizontal)
 * 0 HP -> Dead (Face-Down)
 */
export function getCardRotationAngle(hp: number, maxHp: number): number {
  if (hp <= 0) return 0; // Handled with flip face down
  if (maxHp === 4) {
    if (hp === 4) return 0;
    if (hp === 3) return 45;
    if (hp === 2) return 90;
    if (hp === 1) return 135;
  } else if (maxHp === 3) {
    if (hp === 3) return 0;
    if (hp === 2) return 45;
    if (hp === 1) return 90;
  } else if (maxHp === 2) {
    if (hp === 2) return 0;
    if (hp === 1) return 90;
  }
  return 0;
}

export function createStandardDeck(includeJoker = false): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (let rank = 1; rank <= 13; rank++) {
      deck.push({
        id: `${suit}_${rank}_${Math.random().toString(36).substring(2, 7)}`,
        suit,
        rank: rank as CardRank,
        name: `${getRankLabel(rank as CardRank)}${SUIT_SYMBOLS[suit]}`
      });
    }
  }

  if (includeJoker) {
    deck.push({
      id: `joker_${Math.random().toString(36).substring(2, 7)}`,
      suit: 'joker',
      rank: 'Joker',
      name: 'JOKER ★',
      isJoker: true
    });
  }

  return shuffleDeck(deck);
}

export function shuffleDeck(cards: Card[]): Card[] {
  const result = [...cards];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Checks whether playing a card violates non-affinity suit limits:
 * - Can play multiple cards matching Fighter's suit.
 * - Strictly limited to at most 1 action card and optionally 1 minion card (if Ace) of any non-matching suit per round.
 */
export function canPlayActionOfSuit(
  card: Card,
  affinitySuit: CardSuit,
  currentlyPlayedActions: PlayedActionCard[],
  roundNumber = 1
): { allowed: boolean; reason?: string } {
  if (card.isJoker) return { allowed: true };

  // First Round Restriction: Upgrade / Overcharge cards (Diamonds) cannot be used in Round 1
  if (card.suit === 'diamonds' && roundNumber === 1) {
    return {
      allowed: false,
      reason: 'Upgrade rule: Upgrade cards (Diamonds Action Overcharges) cannot be used during the first round of the game.'
    };
  }

  if (card.suit === affinitySuit) return { allowed: true };

  const hasPlayedSameNonAffinitySuit = currentlyPlayedActions.some(
    a => !a.card.isJoker && a.card.suit === card.suit
  );

  if (hasPlayedSameNonAffinitySuit) {
    return {
      allowed: false,
      reason: `Affinity rule: You have already played a ${SUIT_NAMES[card.suit]} action card this round. Only cards matching your Fighter's suit (${SUIT_NAMES[affinitySuit]}) can be played multiple times per round.`
    };
  }

  return { allowed: true };
}

/**
 * Minion equipment rule:
 * "Only your minion (if you have one) on the table may equip at most 1 (non-face) card vertically on top of it by paying 2 Energy.
 * Minions can only attach a permanent same to their suit."
 */
export function canEquipToMinion(
  card: Card,
  minion: MinionUnit | null,
  currentEnergy: number,
  roundNumber = 1
): { allowed: boolean; reason?: string } {
  // First Round Restriction: Permanent upgrade equipment cannot be equipped in Round 1
  if (roundNumber === 1) {
    return {
      allowed: false,
      reason: 'Upgrade rule: Minion permanent upgrades cannot be equipped during the first round of the game.'
    };
  }
  if (!minion) {
    return { allowed: false, reason: 'You do not have an active minion on the table.' };
  }
  if (minion.equippedPermanent) {
    return { allowed: false, reason: 'Minion already has an equipment permanent attached (max 1).' };
  }
  if (card.rank === 'Joker' || isFaceCard(card.rank)) {
    return { allowed: false, reason: 'Equip minion is disabled for face cards (Jacks, Queens, Kings). Only numbered cards (2-10) can be equipped.' };
  }
  if (card.rank === 1) {
    return { allowed: false, reason: 'Aces are used to summon or boost minions, not as equipment.' };
  }
  if (card.suit !== minion.aceCard.suit) {
    return {
      allowed: false,
      reason: `Minions can only attach a permanent same to their suit (${SUIT_NAMES[minion.aceCard.suit as CardSuit]}).`
    };
  }
  if (currentEnergy < 2) {
    return { allowed: false, reason: 'Equipping a permanent requires 2 Energy.' };
  }
  return { allowed: true };
}
