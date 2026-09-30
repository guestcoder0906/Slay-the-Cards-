export type CardSuit = 'spades' | 'hearts' | 'diamonds' | 'clubs';

export type CardRank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 'Joker';

export interface Card {
  id: string;
  suit: CardSuit | 'joker';
  rank: CardRank;
  name: string;
  isJoker?: boolean;
}

export type PlayOrientation = 'horizontal' | 'vertical';

export type HeartDeclaration = 'block' | 'heal';

export interface PlayedActionCard {
  id: string;
  card: Card;
  orientation: 'horizontal';
  energyCost: number;
  basePoints: number;
  boostedPoints: number;
  fighterBoostedPoints?: number;
  debuffedPoints: number;
  finalPoints: number;
  heartDeclaration?: HeartDeclaration;
  targetActionId?: string; // e.g. for Diamond overcharge or Club debuff
  isJokerAction?: boolean; // joker negates attacks
  clubSpecial?: {
    type: 'jack' | 'queen' | 'king';
    targetCardId?: string;
    stolenCard?: Card;
    discardedCardName?: string;
  };
}

export interface MinionUnit {
  id: string;
  aceCard: Card;
  boostAceCard?: Card; // 2nd Ace underneath for 2 HP
  hp: number;
  maxHp: number; // 1 or 2
  equippedPermanent?: {
    card: Card;
    tierPoints: number;
    suit: CardSuit;
  };
}

export interface FighterUnit {
  card: Card;
  hp: number;
  maxHp: number; // 3 for 1-10, 4 for J/Q/K
  affinity: CardSuit;
}

export interface PlayerState {
  id: string;
  name: string;
  isAI: boolean;
  deck: Card[];
  hand: Card[];
  discardPile: Card[];
  fighter: FighterUnit | null;
  minion: MinionUnit | null;
  energy: number;
  maxEnergy: number;
  hasUsedJoker: boolean;
  mulliganCount: number;
  mulliganDone: boolean;
  isReadyForRound: boolean;
  playedActions: PlayedActionCard[];
  bankedCardId?: string | null;
  attacksBlockedByJoker?: boolean;
  hasUsedMinionDiamond?: boolean;
  // Stats
  shieldPointsThisRound: number;
  blockPointsThisRound: number;
  totalDamageDealtThisRound: number;
  healedThisRound: number;
}

export type GamePhase =
  | 'mulligan'
  | 'fighter_setup'
  | 'pre_round_face_clubs'
  | 'round_action'
  | 'resolution'
  | 'cleanup'
  | 'game_over';

export interface CombatLogStep {
  id: string;
  phase: 'clubs' | 'defense' | 'damage' | 'heal' | 'cleanup';
  title: string;
  description: string;
  sourcePlayerId?: string;
  targetPlayerId?: string;
  amount?: number;
  cardName?: string;
}

export interface GameState {
  gameId: string;
  roundNumber: number;
  phase: GamePhase;
  players: [PlayerState, PlayerState];
  activePlayerIndex: number; // For turns/commitments
  roundInitiativeSecondPlayerIndex: number; // Player who goes second
  roundWinnerId?: string | null;
  gameWinnerId?: string | null;
  combatLogs: CombatLogStep[];
  isResolving: boolean;
  currentResolutionStepIndex: number;
  preRoundPendingPlayerIndex?: number | null;
  pendingDebuffPlayerIndex?: number | null;
  pendingDebuffActionId?: string | null;
  tieBreakerInfo?: string;
}

export type MultiplayerMode = 'ai' | 'websocket_multiplayer' | 'hotseat';
