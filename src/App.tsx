import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Card,
  CombatLogStep,
  GamePhase,
  GameState,
  HeartDeclaration,
  MultiplayerMode,
  PlayedActionCard,
  PlayerState,
} from './types/game';
import {
  canEquipToMinion,
  canPlayActionOfSuit,
  createStandardDeck,
  getCardEnergyCost,
  getFighterMaxHealth,
  getUniversalPoints,
  isFaceCard,
  shuffleDeck,
  SUIT_NAMES,
  SUIT_SYMBOLS,
} from './utils/cardUtils';
import { resolveCombatRound } from './utils/resolutionEngine';
import { aiPlayer } from './services/aiPlayer';
import { socketService } from './services/socketService';
import { sounds } from './utils/audio';

// Components
import { TableBoard } from './components/TableBoard';
import { MulliganModal } from './components/MulliganModal';
import { SetupFighterModal } from './components/SetupFighterModal';
import { HeartChoiceModal } from './components/HeartChoiceModal';
import { ClubTargetModal } from './components/ClubTargetModal';
import { DiamondTargetModal } from './components/DiamondTargetModal';
import { ResolutionOverlay } from './components/ResolutionOverlay';
import { RulesModal } from './components/RulesModal';
import { MultiplayerModal } from './components/MultiplayerModal';
import { PreRoundClubModal } from './components/PreRoundClubModal';
import { AssignDebuffModal } from './components/AssignDebuffModal';

// Icons
import {
  Swords,
  Users,
  Bot,
  Globe,
  BookOpen,
  Volume2,
  VolumeX,
  RotateCcw,
  Trophy,
  Sparkles,
  Scissors,
  Loader2,
} from 'lucide-react';

export default function App() {
  const [mode, setMode] = useState<MultiplayerMode>('ai');
  const [localPlayerIndex, setLocalPlayerIndex] = useState(0);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);

  // Modals
  const [showRules, setShowRules] = useState(false);
  const [showMultiplayer, setShowMultiplayer] = useState(false);
  const [pendingHeartCard, setPendingHeartCard] = useState<Card | null>(null);
  const [pendingClubCard, setPendingClubCard] = useState<Card | null>(null);
  const [pendingDiamondCard, setPendingDiamondCard] = useState<Card | null>(null);
  const [preRoundPendingPlayerIndex, setPreRoundPendingPlayerIndex] = useState<number | null>(null);
  const [preRoundAnnouncement, setPreRoundAnnouncement] = useState<string | null>(null);
  const [pendingAssignDebuffAction, setPendingAssignDebuffAction] = useState<{
    playerIndex: number;
    actionId: string;
  } | null>(null);

  // Multiplayer info
  const [roomCode, setRoomCode] = useState('');
  const [isHost, setIsHost] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [playerCount, setPlayerCount] = useState(1);

  // Core Game State
  const [gameState, setGameState] = useState<GameState>(() => initNewGame('Player 1', 'Strategic AI', true));

  // Initialize fresh game
  function initNewGame(p1Name = 'Player 1', p2Name = 'Strategic AI', isAi = true): GameState {
    const p1Deck = createStandardDeck(true);
    const p2Deck = createStandardDeck(true);

    const p1Hand = p1Deck.splice(0, 5);
    const p2Hand = p2Deck.splice(0, 5);

    const p1: PlayerState = {
      id: 'player_1',
      name: p1Name,
      isAI: false,
      deck: p1Deck,
      hand: p1Hand,
      discardPile: [],
      fighter: null,
      minion: null,
      energy: 3,
      maxEnergy: 3,
      hasUsedJoker: false,
      mulliganCount: 0,
      mulliganDone: false,
      isReadyForRound: false,
      playedActions: [],
      bankedCardId: null,
      shieldPointsThisRound: 0,
      blockPointsThisRound: 0,
      totalDamageDealtThisRound: 0,
      healedThisRound: 0,
    };

    const p2: PlayerState = {
      id: 'player_2',
      name: p2Name,
      isAI: isAi,
      deck: p2Deck,
      hand: p2Hand,
      discardPile: [],
      fighter: null,
      minion: null,
      energy: 3,
      maxEnergy: 3,
      hasUsedJoker: false,
      mulliganCount: 0,
      mulliganDone: false,
      isReadyForRound: false,
      playedActions: [],
      bankedCardId: null,
      shieldPointsThisRound: 0,
      blockPointsThisRound: 0,
      totalDamageDealtThisRound: 0,
      healedThisRound: 0,
    };

    return {
      gameId: `game_${Date.now()}`,
      roundNumber: 1,
      phase: 'mulligan',
      players: [p1, p2],
      activePlayerIndex: 0,
      roundInitiativeSecondPlayerIndex: 1, // Determined after fighter setup
      combatLogs: [],
      isResolving: false,
      currentResolutionStepIndex: 0,
    };
  }

  // Check URL parameters for direct room joining
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam && roomParam.length >= 3) {
      setRoomCode(roomParam.toUpperCase());
      handleJoinRoom(roomParam.toUpperCase());
      setShowMultiplayer(true);
    }
  }, []);

  // Handle Audio mute toggle
  const toggleMute = () => {
    const next = !isAudioMuted;
    setIsAudioMuted(next);
    sounds.setMuted(next);
  };

  // Sync state across network via WebSockets
  const broadcastGameState = (stateToSync: GameState) => {
    if (mode === 'websocket_multiplayer' && roomCode) {
      socketService.syncGameState(stateToSync);
    }
  };

  // -------------------------------------------------------------
  // MULLIGAN LOGIC: Reset hand first, then put 1 card on the bottom
  // -------------------------------------------------------------
  const handlePlayerMulliganReset = () => {
    setGameState(prev => {
      const next: GameState = JSON.parse(JSON.stringify(prev));
      const player = next.players[localPlayerIndex];

      // Return current hand to deck
      player.deck.push(...player.hand);
      player.hand = [];

      // Reshuffle and draw fresh 5-card new hand reset
      player.deck = shuffleDeck(player.deck);
      player.hand = player.deck.splice(0, 5);

      broadcastGameState(next);
      return next;
    });
  };

  const handlePlayerPutCardsToBottom = (cards: Card[]) => {
    setGameState(prev => {
      const next: GameState = JSON.parse(JSON.stringify(prev));
      const player = next.players[localPlayerIndex];

      const cardIds = new Set(cards.map(c => c.id));
      // Remove chosen cards from fresh hand and place on the bottom of the deck
      player.hand = player.hand.filter(c => !cardIds.has(c.id));
      player.deck.push(...cards);
      player.mulliganCount += 1;

      broadcastGameState(next);
      return next;
    });
  };

  const handlePlayerKeepHand = () => {
    setGameState(prev => {
      const next: GameState = JSON.parse(JSON.stringify(prev));
      next.players[localPlayerIndex].mulliganDone = true;

      // If AI hasn't done mulligan, do it now: shuffle back, draw 5, put (mulliganCount + 1) cards to bottom
      const oppIndex = localPlayerIndex === 0 ? 1 : 0;
      if (next.players[oppIndex].isAI) {
        const aiMulligan = aiPlayer.decideMulligan(next.players[oppIndex]);
        if (aiMulligan.shouldMulligan) {
          const ai = next.players[oppIndex];
          ai.deck.push(...ai.hand);
          ai.hand = [];
          ai.deck = shuffleDeck(ai.deck);
          ai.hand = ai.deck.splice(0, 5);
          const countToBottom = ai.mulliganCount + 1;
          const sorted = [...ai.hand].sort((a, b) => getUniversalPoints(a) - getUniversalPoints(b));
          const toBottom = sorted.slice(0, countToBottom);
          const toBottomIds = new Set(toBottom.map(c => c.id));
          ai.hand = ai.hand.filter(c => !toBottomIds.has(c.id));
          ai.deck.push(...toBottom);
          ai.mulliganCount += 1;
        }
        next.players[oppIndex].mulliganDone = true;
      }

      // If both mulligans done, move to fighter setup
      if (next.players[0].mulliganDone && next.players[1].mulliganDone) {
        next.phase = 'fighter_setup';
      }

      broadcastGameState(next);
      return next;
    });
  };

  // -------------------------------------------------------------
  // FIGHTER SETUP LOGIC & ROUND 1 INITIATIVE
  // -------------------------------------------------------------
  const handleSelectFighter = (card: Card) => {
    setGameState(prev => {
      const next: GameState = JSON.parse(JSON.stringify(prev));
      const p = next.players[localPlayerIndex];

      // Remove card from hand and set as fighter
      p.hand = p.hand.filter(c => c.id !== card.id);
      const maxHp = getFighterMaxHealth(card.rank);
      p.fighter = {
        card,
        hp: maxHp,
        maxHp,
        affinity: card.suit as any,
      };

      // AI selects fighter if vs AI
      const oppIndex = localPlayerIndex === 0 ? 1 : 0;
      const opp = next.players[oppIndex];
      if (opp.isAI && !opp.fighter) {
        const aiFighterCard = aiPlayer.selectFighter(opp.hand);
        opp.hand = opp.hand.filter(c => c.id !== aiFighterCard.id);
        const aiMaxHp = getFighterMaxHealth(aiFighterCard.rank);
        opp.fighter = {
          card: aiFighterCard,
          hp: aiMaxHp,
          maxHp: aiMaxHp,
          affinity: aiFighterCard.suit as any,
        };
      }

      // Check if both have fighters: determine initiative according to official rules
      // "The player with the higher-value Fighter (excluding Minions) goes Second in Round 1.
      // If tied, the player who reveals an Ace in hand goes Second; if still tied, flip a coin."
      if (next.players[0].fighter && next.players[1].fighter) {
        const f1 = next.players[0].fighter.card;
        const f2 = next.players[1].fighter.card;
        const rank1 = typeof f1.rank === 'number' ? f1.rank : 0;
        const rank2 = typeof f2.rank === 'number' ? f2.rank : 0;

        let secondPlayerIndex = 0;
        let tieBreaker = '';

        if (rank1 > rank2) {
          secondPlayerIndex = 0; // P1 has higher fighter -> goes second in Round 1
          tieBreaker = `${next.players[0].name}'s higher value Fighter (${f1.name}) goes Second in Round 1.`;
        } else if (rank2 > rank1) {
          secondPlayerIndex = 1; // P2 (AI) has higher fighter -> goes second
          tieBreaker = `${next.players[1].name}'s higher value Fighter (${f2.name}) goes Second in Round 1.`;
        } else {
          // Tied: check who has an Ace in hand
          const p1HasAce = next.players[0].hand.some(c => c.rank === 1);
          const p2HasAce = next.players[1].hand.some(c => c.rank === 1);
          if (p1HasAce && !p2HasAce) {
            secondPlayerIndex = 0;
            tieBreaker = `${next.players[0].name} revealed an Ace in hand and goes Second in Round 1.`;
          } else if (p2HasAce && !p1HasAce) {
            secondPlayerIndex = 1;
            tieBreaker = `${next.players[1].name} revealed an Ace in hand and goes Second in Round 1.`;
          } else {
            // Coin flip
            secondPlayerIndex = Math.random() < 0.5 ? 0 : 1;
            tieBreaker = `Fighter values tied! Coin flip selected ${next.players[secondPlayerIndex].name} to go Second in Round 1.`;
          }
        }

        next.roundInitiativeSecondPlayerIndex = secondPlayerIndex;
        // The first player to act is whoever does NOT go second:
        const firstPlayerIndex = secondPlayerIndex === 0 ? 1 : 0;
        next.activePlayerIndex = firstPlayerIndex;
        next.tieBreakerInfo = tieBreaker;
        next.players[0].isReadyForRound = false;
        next.players[1].isReadyForRound = false;
        checkAndInitiateRound(next);
      }

      broadcastGameState(next);
      return next;
    });
  };

  // Auto-dismiss pre-round announcement toast
  useEffect(() => {
    if (preRoundAnnouncement) {
      const timer = setTimeout(() => setPreRoundAnnouncement(null), 7000);
      return () => clearTimeout(timer);
    }
  }, [preRoundAnnouncement]);

  const executeAiPreRoundFaceClub = (state: GameState) => {
    const ai = state.players[1];
    const opp = state.players[0];
    const faceClub = ai.hand.find(c => c.suit === 'clubs' && isFaceCard(c.rank));
    if (!faceClub) return;

    const cost = getCardEnergyCost(faceClub);
    if (ai.energy < cost) return;

    // AI strategy: 75% Disruption if opponent has cards in hand, otherwise 4-point debuff
    const preferDisruption = opp.hand.length > 0 && Math.random() < 0.75;

    if (preferDisruption) {
      if (faceClub.rank === 11) {
        // Jack: Ambush discard
        ai.hand = ai.hand.filter(c => c.id !== faceClub.id);
        ai.energy -= cost;
        const randIdx = Math.floor(Math.random() * opp.hand.length);
        const discarded = opp.hand.splice(randIdx, 1)[0];
        opp.discardPile.push(discarded);
        ai.playedActions.push({
          id: `ai_pre_jack_${Date.now()}`,
          card: faceClub,
          orientation: 'horizontal',
          energyCost: cost,
          basePoints: 0,
          boostedPoints: 0,
          debuffedPoints: 0,
          finalPoints: 0,
          clubSpecial: { type: 'jack' },
        });
        setPreRoundAnnouncement(`⚡ Pre-Round Strike! Strategic AI played Jack of Clubs and forced you to discard ${discarded.name}!`);
        sounds.playCardRotate();
      } else if (faceClub.rank === 12) {
        // Queen: Mind Vision targeted discard
        ai.hand = ai.hand.filter(c => c.id !== faceClub.id);
        ai.energy -= cost;
        const sorted = [...opp.hand].sort((a, b) => getUniversalPoints(b) - getUniversalPoints(a));
        const target = sorted[0];
        const tIdx = opp.hand.findIndex(c => c.id === target.id);
        if (tIdx >= 0) opp.hand.splice(tIdx, 1);
        opp.discardPile.push(target);
        ai.playedActions.push({
          id: `ai_pre_queen_${Date.now()}`,
          card: faceClub,
          orientation: 'horizontal',
          energyCost: cost,
          basePoints: 0,
          boostedPoints: 0,
          debuffedPoints: 0,
          finalPoints: 0,
          clubSpecial: { type: 'queen', targetCardId: target.id },
        });
        setPreRoundAnnouncement(`⚡ Pre-Round Strike! Strategic AI played Queen of Clubs and discarded your ${target.name}!`);
        sounds.playCardRotate();
      } else if (faceClub.rank === 13) {
        // King: Grand Heist
        ai.hand = ai.hand.filter(c => c.id !== faceClub.id);
        ai.energy -= 3;
        const sorted = [...opp.hand].sort((a, b) => getUniversalPoints(b) - getUniversalPoints(a));
        const stolen = sorted[0];
        const sIdx = opp.hand.findIndex(c => c.id === stolen.id);
        if (sIdx >= 0) opp.hand.splice(sIdx, 1);
        if (opp.bankedCardId === stolen.id) {
          opp.bankedCardId = null;
          opp.energy = Math.min(3, opp.energy + 1);
        }

        // If stolen card is an Ace and AI lacks a minion (or can boost), play as minion!
        if (stolen.rank === 1 && (!ai.minion || ai.minion.maxHp < 2)) {
          if (!ai.minion) {
            ai.minion = {
              id: `ai_minion_${Date.now()}`,
              aceCard: stolen,
              hp: 1,
              maxHp: 1,
            };
            sounds.playBlock();
          } else {
            ai.minion.boostAceCard = stolen;
            ai.minion.hp = 2;
            ai.minion.maxHp = 2;
            sounds.playHeal();
          }
          setPreRoundAnnouncement(`⚡ Pre-Round Grand Heist! Strategic AI played King of Clubs, stole your ${stolen.name}, and summoned it as a Minion!`);
        } else {
          ai.playedActions.push({
            id: `ai_stolen_${Date.now()}`,
            card: stolen,
            orientation: 'horizontal',
            energyCost: 0,
            basePoints: getUniversalPoints(stolen),
            boostedPoints: 0,
            debuffedPoints: 0,
            finalPoints: getUniversalPoints(stolen),
            heartDeclaration: stolen.suit === 'hearts' ? 'block' : undefined,
          });
          setPreRoundAnnouncement(`⚡ Pre-Round Grand Heist! Strategic AI played King of Clubs and stole your ${stolen.name}!`);
        }

        ai.playedActions.push({
          id: `ai_pre_king_${Date.now()}`,
          card: faceClub,
          orientation: 'horizontal',
          energyCost: 3,
          basePoints: 4,
          boostedPoints: 0,
          debuffedPoints: 0,
          finalPoints: 4,
        });
        sounds.playCardRotate();
      }
    } else {
      // 4-point general debuff
      ai.hand = ai.hand.filter(c => c.id !== faceClub.id);
      ai.energy -= cost;
      ai.playedActions.push({
        id: `ai_pre_debuff_${Date.now()}`,
        card: faceClub,
        orientation: 'horizontal',
        energyCost: cost,
        basePoints: 4,
        boostedPoints: 0,
        debuffedPoints: 0,
        finalPoints: 4,
      });
      setPreRoundAnnouncement(`🛡️ Pre-Round Defense! Strategic AI committed ${faceClub.name} as a 4-Point Debuff against your attacks this round.`);
      sounds.playBlock();
    }
  };

  const checkAndInitiateRound = (state: GameState) => {
    const p1HasFaceClub = state.players[0].hand.some(c => c.suit === 'clubs' && isFaceCard(c.rank));
    const p2HasFaceClub = state.players[1].hand.some(c => c.suit === 'clubs' && isFaceCard(c.rank));

    if (p1HasFaceClub) {
      state.phase = 'pre_round_face_clubs';
      state.preRoundPendingPlayerIndex = 0;
      setPreRoundPendingPlayerIndex(0);
    } else if (p2HasFaceClub) {
      if (state.players[1].isAI) {
        executeAiPreRoundFaceClub(state);
        state.phase = 'round_action';
        state.preRoundPendingPlayerIndex = null;
        setPreRoundPendingPlayerIndex(null);
      } else {
        state.phase = 'pre_round_face_clubs';
        state.preRoundPendingPlayerIndex = 1;
        setPreRoundPendingPlayerIndex(1);
      }
    } else {
      state.phase = 'round_action';
      state.preRoundPendingPlayerIndex = null;
      setPreRoundPendingPlayerIndex(null);
    }
  };

  const handlePreRoundPlayerFinished = (finishingPlayerIdx: number) => {
    setGameState(prev => {
      const next: GameState = JSON.parse(JSON.stringify(prev));
      if (finishingPlayerIdx === 0) {
        const p2HasFaceClub = next.players[1].hand.some(c => c.suit === 'clubs' && isFaceCard(c.rank));
        if (p2HasFaceClub) {
          if (next.players[1].isAI) {
            executeAiPreRoundFaceClub(next);
            next.phase = 'round_action';
            next.preRoundPendingPlayerIndex = null;
            setPreRoundPendingPlayerIndex(null);
          } else {
            next.phase = 'pre_round_face_clubs';
            next.preRoundPendingPlayerIndex = 1;
            setPreRoundPendingPlayerIndex(1);
          }
        } else {
          next.phase = 'round_action';
          next.preRoundPendingPlayerIndex = null;
          setPreRoundPendingPlayerIndex(null);
        }
      } else {
        next.phase = 'round_action';
        next.preRoundPendingPlayerIndex = null;
        setPreRoundPendingPlayerIndex(null);
      }
      broadcastGameState(next);
      return next;
    });
  };

  const handleApplyPreRoundDebuff = (card: Card) => {
    const cost = getCardEnergyCost(card);
    const targetIdx = preRoundPendingPlayerIndex ?? 0;
    const points = getUniversalPoints(card);
    setGameState(prev => {
      const next: GameState = JSON.parse(JSON.stringify(prev));
      const player = next.players[targetIdx];
      if (player.energy < cost) return prev;

      player.hand = player.hand.filter(c => c.id !== card.id);
      player.energy -= cost;

      player.playedActions.push({
        id: `act_preround_debuff_${Date.now()}`,
        card,
        orientation: 'horizontal',
        energyCost: cost,
        basePoints: points,
        boostedPoints: 0,
        debuffedPoints: 0,
        finalPoints: points,
      });

      sounds.playBlock();
      return next;
    });
    handlePreRoundPlayerFinished(targetIdx);
  };

  // -------------------------------------------------------------
  // AI TURN AUTOMATION (Effect Trigger)
  // -------------------------------------------------------------
  useEffect(() => {
    if (
      mode === 'ai' &&
      gameState.phase === 'round_action' &&
      !gameState.isResolving &&
      gameState.activePlayerIndex === 1 &&
      gameState.players[1].isAI &&
      !gameState.players[1].isReadyForRound
    ) {
      executeAiTurn();
    }
  }, [
    mode,
    gameState.phase,
    gameState.activePlayerIndex,
    gameState.isResolving,
    gameState.players[1]?.isReadyForRound,
    gameState.roundNumber,
  ]);

  const executeAiTurn = () => {
    setIsAiThinking(true);
    setTimeout(() => {
      setGameState(prev => {
        const next: GameState = JSON.parse(JSON.stringify(prev));
        const aiState = next.players[1];
        const playerState = next.players[0];

        aiPlayer.planRoundActions(
          aiState,
          playerState,
          action => {
            const basePts = getUniversalPoints(action.card);
            aiState.hand = aiState.hand.filter(c => c.id !== action.card.id);
            aiState.energy -= action.energyCost;

            if (action.heartDeclaration === 'heal') {
              if (aiState.fighter) {
                aiState.fighter.hp = Math.min(aiState.fighter.maxHp, aiState.fighter.hp + basePts);
                aiState.discardPile.push(action.card);
                sounds.playHeal();
              }
              return;
            }

            // If AI plays a Diamond card, boost the corresponding Spade attack (or first action)
            if (action.card.suit === 'diamonds' && !action.isJokerAction) {
              const targetAction = action.targetActionId
                ? aiState.playedActions.find(a => a.id === action.targetActionId)
                : aiState.playedActions.find(a => a.card.suit === 'spades') || aiState.playedActions[0];
              if (targetAction) {
                targetAction.boostedPoints += basePts;
                targetAction.finalPoints += basePts;
              }
            }

            aiState.playedActions.push({
              id: `ai_act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              card: action.card,
              orientation: 'horizontal',
              energyCost: action.energyCost,
              basePoints: basePts,
              boostedPoints: 0,
              debuffedPoints: 0,
              finalPoints: basePts,
              heartDeclaration: action.heartDeclaration,
              targetActionId: action.targetActionId,
              isJokerAction: action.isJokerAction,
              clubSpecial: action.clubSpecial,
            });
            sounds.playCardPlace();
          },
          aceCard => {
            aiState.hand = aiState.hand.filter(c => c.id !== aceCard.id);
            aiState.energy -= 1;
            aiState.minion = {
              id: `ai_minion_${Date.now()}`,
              aceCard,
              hp: 1,
              maxHp: 1,
            };
            sounds.playBlock();
          },
          aceCard => {
            if (aiState.minion) {
              aiState.hand = aiState.hand.filter(c => c.id !== aceCard.id);
              aiState.energy -= 1;
              aiState.minion.boostAceCard = aceCard;
              aiState.minion.hp = 2;
              aiState.minion.maxHp = 2;
              sounds.playHeal();
            }
          },
          card => {
            if (aiState.minion) {
              aiState.hand = aiState.hand.filter(c => c.id !== card.id);
              aiState.energy -= 2;
              aiState.minion.equippedPermanent = {
                card,
                tierPoints: getUniversalPoints(card),
                suit: card.suit as any,
              };
              sounds.playCardRotate();
            }
          },
          cardId => {
            if (aiState.bankedCardId === cardId) {
              aiState.bankedCardId = null;
              aiState.energy = Math.min(3, aiState.energy + 1);
            } else if (aiState.bankedCardId) {
              aiState.bankedCardId = cardId;
            } else if (aiState.energy >= 1) {
              aiState.bankedCardId = cardId;
              aiState.energy -= 1;
            }
          },
          () => {
            setIsAiThinking(false);
            aiState.isReadyForRound = true;

            const isAiSecond = next.roundInitiativeSecondPlayerIndex === 1;
            if (isAiSecond) {
              // AI was going second: both players have committed -> check unassigned debuffs and trigger resolution!
              checkPendingDebuffsAndResolve(next);
            } else {
              // AI was going first: pass turn to the Human player (index 0)!
              next.activePlayerIndex = 0;
              broadcastGameState(next);
            }
          }
        );

        return next;
      });
    }, 900);
  };

  // -------------------------------------------------------------
  // ACTION / CARD PLAY HANDLERS
  // -------------------------------------------------------------
  const handlePlayActionCard = (
    card: Card,
    orientation: 'horizontal',
    targetActionId?: string,
    heartDec?: HeartDeclaration
  ) => {
    setGameState(prev => {
      // Must be player's turn!
      if (prev.activePlayerIndex !== localPlayerIndex || prev.phase !== 'round_action') {
        return prev;
      }

      const next: GameState = JSON.parse(JSON.stringify(prev));
      const player = next.players[localPlayerIndex];

      // If this card was banked, unbank it and free its 1 reserved energy
      if (player.bankedCardId === card.id) {
        player.bankedCardId = null;
        player.energy += 1;
      }

      const cost = getCardEnergyCost(card);
      if (player.energy < cost) return prev;

      // Remove from hand and deduct energy
      player.hand = player.hand.filter(c => c.id !== card.id);
      player.energy -= cost;

      const basePts = getUniversalPoints(card);

      // INSTANT HEAL: If heart is declared as heal, instantly heal fighter and discard card!
      if (heartDec === 'heal') {
        if (player.fighter) {
          player.fighter.hp = Math.min(player.fighter.maxHp, player.fighter.hp + basePts);
          player.discardPile.push(card);
          sounds.playHeal();
        }
        broadcastGameState(next);
        return next;
      }

      const action: PlayedActionCard = {
        id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        card,
        orientation: 'horizontal',
        energyCost: cost,
        basePoints: basePts,
        boostedPoints: 0,
        debuffedPoints: 0,
        finalPoints: basePts,
        heartDeclaration: heartDec,
        targetActionId,
        isJokerAction: card.isJoker,
      };

      player.playedActions.push(action);
      sounds.playCardPlace();

      broadcastGameState(next);
      return next;
    });
  };

  const handleSummonMinion = (card: Card) => {
    setGameState(prev => {
      if (prev.activePlayerIndex !== localPlayerIndex || prev.phase !== 'round_action') return prev;
      const next: GameState = JSON.parse(JSON.stringify(prev));
      const player = next.players[localPlayerIndex];

      // If this card was banked, unbank and free its 1 energy
      if (player.bankedCardId === card.id) {
        player.bankedCardId = null;
        player.energy += 1;
      }
      if (player.energy < 1 || player.minion) return prev;

      player.hand = player.hand.filter(c => c.id !== card.id);
      player.energy -= 1;
      player.minion = {
        id: `minion_${Date.now()}`,
        aceCard: card,
        hp: 1,
        maxHp: 1,
      };
      sounds.playBlock();

      broadcastGameState(next);
      return next;
    });
  };

  const handleBoostMinionHp = (card: Card) => {
    setGameState(prev => {
      if (prev.activePlayerIndex !== localPlayerIndex || prev.phase !== 'round_action') return prev;
      const next: GameState = JSON.parse(JSON.stringify(prev));
      const player = next.players[localPlayerIndex];

      // If this card was banked, unbank and free its 1 energy
      if (player.bankedCardId === card.id) {
        player.bankedCardId = null;
        player.energy += 1;
      }
      if (player.energy < 1 || !player.minion || player.minion.maxHp >= 2) return prev;

      player.hand = player.hand.filter(c => c.id !== card.id);
      player.energy -= 1;
      player.minion.boostAceCard = card;
      player.minion.hp = 2;
      player.minion.maxHp = 2;
      sounds.playHeal();

      broadcastGameState(next);
      return next;
    });
  };

  const handleEquipPermanent = (card: Card) => {
    setGameState(prev => {
      if (prev.activePlayerIndex !== localPlayerIndex || prev.phase !== 'round_action') return prev;
      const next: GameState = JSON.parse(JSON.stringify(prev));
      const player = next.players[localPlayerIndex];

      // If this card was banked, unbank and free its 1 energy
      if (player.bankedCardId === card.id) {
        player.bankedCardId = null;
        player.energy += 1;
      }
      if (!player.minion || player.energy < 2 || isFaceCard(card.rank) || card.isJoker) return prev;

      player.hand = player.hand.filter(c => c.id !== card.id);
      player.energy -= 2;
      const tierPoints = getUniversalPoints(card);

      player.minion.equippedPermanent = {
        card,
        tierPoints,
        suit: card.suit as any,
      };
      sounds.playCardRotate();

      broadcastGameState(next);
      return next;
    });
  };

  const handleBankCard = (cardId: string) => {
    setGameState(prev => {
      if (prev.activePlayerIndex !== localPlayerIndex || prev.phase !== 'round_action') return prev;
      const next: GameState = JSON.parse(JSON.stringify(prev));
      const player = next.players[localPlayerIndex];

      if (player.bankedCardId === cardId) {
        // Toggle OFF (unbank): refund the 1 energy
        player.bankedCardId = null;
        player.energy = Math.min(3, player.energy + 1);
        sounds.playCardRotate();
      } else {
        // Toggle ON: If already banking another card, switch without extra energy cost
        if (player.bankedCardId) {
          player.bankedCardId = cardId;
          sounds.playCardPlace();
        } else {
          // First time banking this round requires and uses 1 energy
          if (player.energy < 1) return prev;
          player.bankedCardId = cardId;
          player.energy -= 1;
          sounds.playCardPlace();
        }
      }
      broadcastGameState(next);
      return next;
    });
  };

  const handleTriggerJoker = () => {
    const player = gameState.players[localPlayerIndex];
    if (gameState.activePlayerIndex !== localPlayerIndex || player.hasUsedJoker || player.energy < 2) return;

    const jokerCard = player.hand.find(c => c.isJoker);
    if (!jokerCard) return;

    handlePlayActionCard(jokerCard, 'horizontal');
    setGameState(prev => {
      const next: GameState = JSON.parse(JSON.stringify(prev));
      next.players[localPlayerIndex].hasUsedJoker = true;
      broadcastGameState(next);
      return next;
    });
    sounds.playJoker();
  };

  // -------------------------------------------------------------
  // END TURN & COMBAT RESOLUTION
  // -------------------------------------------------------------
  const handleEndTurn = () => {
    setGameState(prev => {
      if (prev.activePlayerIndex !== localPlayerIndex || prev.phase !== 'round_action') return prev;

      const next: GameState = JSON.parse(JSON.stringify(prev));
      const player = next.players[localPlayerIndex];
      player.isReadyForRound = true;

      const isHumanSecond = next.roundInitiativeSecondPlayerIndex === localPlayerIndex;

      if (isHumanSecond) {
        // Human was going second: both players have committed cards -> check debuffs & resolve combat!
        checkPendingDebuffsAndResolve(next);
      } else {
        // Human was going first: pass initiative to opponent!
        const oppIndex = localPlayerIndex === 0 ? 1 : 0;
        next.activePlayerIndex = oppIndex;
        broadcastGameState(next);
      }

      return next;
    });
  };

  const checkPendingDebuffsAndResolve = (state: GameState) => {
    // 1. Check Player 0 for any unassigned Club debuffs
    const p1UnassignedClub = state.players[0].playedActions.find(
      a => a.card.suit === 'clubs' && !a.isJokerAction && !a.clubSpecial && !a.targetActionId
    );

    const p2EligibleActions = state.players[1].playedActions.filter(
      a => a.heartDeclaration !== 'heal' && a.finalPoints > 0
    );
    const p2HasEquipment = Boolean(state.players[1].minion?.equippedPermanent);

    if (p1UnassignedClub && (p2EligibleActions.length > 0 || p2HasEquipment)) {
      state.pendingDebuffPlayerIndex = 0;
      state.pendingDebuffActionId = p1UnassignedClub.id;
      setPendingAssignDebuffAction({
        playerIndex: 0,
        actionId: p1UnassignedClub.id,
      });
      broadcastGameState(state);
      return;
    }

    // 2. Check Player 1 for any unassigned Club debuffs
    const p2UnassignedClub = state.players[1].playedActions.find(
      a => a.card.suit === 'clubs' && !a.isJokerAction && !a.clubSpecial && !a.targetActionId
    );

    if (p2UnassignedClub) {
      if (state.players[1].isAI) {
        // AI intelligently targets the highest player attack action or equipment
        const p1EligibleActions = state.players[0].playedActions
          .filter(a => a.heartDeclaration !== 'heal' && a.finalPoints > 0)
          .sort((a, b) => b.finalPoints - a.finalPoints);
        if (p1EligibleActions.length > 0) {
          p2UnassignedClub.targetActionId = p1EligibleActions[0].id;
        }
      } else {
        const p1EligibleActions = state.players[0].playedActions.filter(
          a => a.heartDeclaration !== 'heal' && a.finalPoints > 0
        );
        const p1HasEquipment = Boolean(state.players[0].minion?.equippedPermanent);
        if (p1EligibleActions.length > 0 || p1HasEquipment) {
          state.pendingDebuffPlayerIndex = 1;
          state.pendingDebuffActionId = p2UnassignedClub.id;
          setPendingAssignDebuffAction({
            playerIndex: 1,
            actionId: p2UnassignedClub.id,
          });
          broadcastGameState(state);
          return;
        }
      }
    }

    state.pendingDebuffPlayerIndex = null;
    state.pendingDebuffActionId = null;
    triggerCombatResolution(state);
  };

  const handleConfirmDebuffTarget = (targetActionId?: string) => {
    setGameState(prev => {
      const next: GameState = JSON.parse(JSON.stringify(prev));
      const targetDebuffPlayerIdx = next.pendingDebuffPlayerIndex ?? pendingAssignDebuffAction?.playerIndex ?? 0;
      const targetDebuffActionId = next.pendingDebuffActionId ?? pendingAssignDebuffAction?.actionId;

      if (targetDebuffActionId) {
        const player = next.players[targetDebuffPlayerIdx];
        const act = player.playedActions.find(a => a.id === targetDebuffActionId);
        if (act) {
          if (targetActionId) {
            act.targetActionId = targetActionId;
          } else {
            // Auto-target highest
            const oppIdx = targetDebuffPlayerIdx === 0 ? 1 : 0;
            const opp = next.players[oppIdx];
            const eligible = opp.playedActions
              .filter(a => a.heartDeclaration !== 'heal' && a.finalPoints > 0)
              .sort((a, b) => b.finalPoints - a.finalPoints);
            if (eligible.length > 0) {
              act.targetActionId = eligible[0].id;
            }
          }
        }
      }

      setPendingAssignDebuffAction(null);
      next.pendingDebuffPlayerIndex = null;
      next.pendingDebuffActionId = null;

      // Check if Player 1 also has an unassigned debuff (if not AI)
      const p2UnassignedClub = next.players[1].playedActions.find(
        a => a.card.suit === 'clubs' && !a.isJokerAction && !a.clubSpecial && !a.targetActionId
      );
      if (p2UnassignedClub) {
        if (next.players[1].isAI) {
          const p1Eligible = next.players[0].playedActions
            .filter(a => a.heartDeclaration !== 'heal' && a.finalPoints > 0)
            .sort((a, b) => b.finalPoints - a.finalPoints);
          if (p1Eligible.length > 0) {
            p2UnassignedClub.targetActionId = p1Eligible[0].id;
          }
        } else {
          next.pendingDebuffPlayerIndex = 1;
          next.pendingDebuffActionId = p2UnassignedClub.id;
          setPendingAssignDebuffAction({
            playerIndex: 1,
            actionId: p2UnassignedClub.id,
          });
          broadcastGameState(next);
          return next;
        }
      }

      const { updatedState } = resolveCombatRound(next);
      updatedState.phase = 'resolution';
      updatedState.isResolving = true;
      broadcastGameState(updatedState);
      return updatedState;
    });
  };

  const handleConfirmDebuffShatterEquipment = () => {
    setGameState(prev => {
      const next: GameState = JSON.parse(JSON.stringify(prev));
      const targetDebuffPlayerIdx = next.pendingDebuffPlayerIndex ?? pendingAssignDebuffAction?.playerIndex ?? 0;
      const oppIdx = targetDebuffPlayerIdx === 0 ? 1 : 0;
      const opp = next.players[oppIdx];

      if (opp.minion?.equippedPermanent) {
        const destroyed = opp.minion.equippedPermanent.card;
        opp.minion.equippedPermanent = undefined;
        opp.discardPile.push(destroyed);
        sounds.playCardRotate();
      }

      setPendingAssignDebuffAction(null);
      next.pendingDebuffPlayerIndex = null;
      next.pendingDebuffActionId = null;

      const { updatedState } = resolveCombatRound(next);
      updatedState.phase = 'resolution';
      updatedState.isResolving = true;
      broadcastGameState(updatedState);
      return updatedState;
    });
  };

  const triggerCombatResolution = (baseState?: GameState) => {
    setGameState(current => {
      const stateToResolve = baseState || current;
      const { updatedState, logs } = resolveCombatRound(stateToResolve);
      updatedState.phase = 'resolution';
      updatedState.isResolving = true;
      broadcastGameState(updatedState);
      return updatedState;
    });
  };

  // Complete resolution overlay
  const handleResolutionComplete = () => {
    setGameState(prev => {
      const next: GameState = JSON.parse(JSON.stringify(prev));
      next.isResolving = false;
      if (next.gameWinnerId) {
        next.phase = 'game_over';
        if (next.gameWinnerId === next.players[localPlayerIndex].id) {
          sounds.playVictory();
          confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
        }
      } else {
        checkAndInitiateRound(next);
      }
      broadcastGameState(next);
      return next;
    });
  };

  // -------------------------------------------------------------
  // MULTIPLAYER SETUP & HANDLERS (WebSocket-Exclusive)
  // -------------------------------------------------------------
  const handleCreateRoom = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomCode(code);
    setIsHost(true);
    joinMultiplayerRoom(code, 0);
  };

  const handleJoinRoom = (code: string) => {
    const cleanCode = code.toUpperCase().trim();
    setRoomCode(cleanCode);
    setIsHost(false);
    joinMultiplayerRoom(cleanCode, 1);
  };

  const joinMultiplayerRoom = (code: string, playerIdx: number) => {
    setMode('websocket_multiplayer');
    setLocalPlayerIndex(playerIdx);

    const playerName = playerIdx === 0 ? 'Player 1 (Host)' : 'Player 2 (Challenger)';
    const playerId = `player_${Math.random().toString(36).substring(2, 8)}`;

    socketService.connect(
      code,
      playerName,
      playerId,
      (type, data) => {
        if (type === 'room_joined') {
          setIsConnected(true);
          setPlayerCount(data.players.length);
          if (data.gameState) {
            setGameState(current => {
              const incoming = data.gameState;
              // If we already have a valid local hand in mulligan/fighter setup, protect it
              if (
                (current.phase === 'mulligan' || current.phase === 'fighter_setup') &&
                current.players[playerIdx].hand.length > 0
              ) {
                const merged: GameState = JSON.parse(JSON.stringify(incoming));
                merged.players[playerIdx] = {
                  ...merged.players[playerIdx],
                  hand: current.players[playerIdx].hand,
                  deck: current.players[playerIdx].deck,
                  mulliganCount: Math.max(merged.players[playerIdx].mulliganCount, current.players[playerIdx].mulliganCount),
                  mulliganDone: current.players[playerIdx].mulliganDone || merged.players[playerIdx].mulliganDone,
                  fighter: current.players[playerIdx].fighter || merged.players[playerIdx].fighter,
                };
                return merged;
              }
              return incoming;
            });
          }
        } else if (type === 'player_joined') {
          setPlayerCount(data.players.length);
          if (playerIdx === 0) {
            setGameState(curr => {
              socketService.syncGameState(curr);
              return curr;
            });
          }
        } else if (type === 'game_state_synced') {
          if (!data.gameState) return;
          setGameState(current => {
            const incoming: GameState = data.gameState;
            const oppIdx = playerIdx === 0 ? 1 : 0;

            // In concurrent phases (mulligan & fighter_setup), protect local player's hand and progress
            if (
              current.phase === 'mulligan' ||
              current.phase === 'fighter_setup' ||
              incoming.phase === 'mulligan' ||
              incoming.phase === 'fighter_setup'
            ) {
              const merged: GameState = JSON.parse(JSON.stringify(incoming));

              // Retain local player's hand, deck, mulligan progress, and chosen fighter
              merged.players[playerIdx] = {
                ...merged.players[playerIdx],
                hand: current.players[playerIdx].hand,
                deck: current.players[playerIdx].deck,
                mulliganCount: Math.max(merged.players[playerIdx].mulliganCount, current.players[playerIdx].mulliganCount),
                mulliganDone: current.players[playerIdx].mulliganDone || merged.players[playerIdx].mulliganDone,
                fighter: current.players[playerIdx].fighter || merged.players[playerIdx].fighter,
              };

              // Check if both mulligans are done -> transition to fighter_setup
              if (merged.players[0].mulliganDone && merged.players[1].mulliganDone) {
                if (merged.phase === 'mulligan') {
                  merged.phase = 'fighter_setup';
                }
              }

              // Check if both fighters are selected -> determine Round 1 initiative
              if (merged.players[0].fighter && merged.players[1].fighter) {
                if (merged.phase === 'fighter_setup' || merged.phase === 'mulligan') {
                  const f1 = merged.players[0].fighter.card;
                  const f2 = merged.players[1].fighter.card;
                  const rank1 = typeof f1.rank === 'number' ? f1.rank : 0;
                  const rank2 = typeof f2.rank === 'number' ? f2.rank : 0;

                  let secondPlayerIndex = 0;
                  let tieBreaker = '';

                  if (rank1 > rank2) {
                    secondPlayerIndex = 0;
                    tieBreaker = `${merged.players[0].name}'s higher value Fighter (${f1.name}) goes Second in Round 1.`;
                  } else if (rank2 > rank1) {
                    secondPlayerIndex = 1;
                    tieBreaker = `${merged.players[1].name}'s higher value Fighter (${f2.name}) goes Second in Round 1.`;
                  } else {
                    const p1HasAce = merged.players[0].hand.some(c => c.rank === 1);
                    const p2HasAce = merged.players[1].hand.some(c => c.rank === 1);
                    if (p1HasAce && !p2HasAce) {
                      secondPlayerIndex = 0;
                      tieBreaker = `${merged.players[0].name} revealed an Ace in hand and goes Second in Round 1.`;
                    } else if (p2HasAce && !p1HasAce) {
                      secondPlayerIndex = 1;
                      tieBreaker = `${merged.players[1].name} revealed an Ace in hand and goes Second in Round 1.`;
                    } else {
                      secondPlayerIndex = 0;
                      tieBreaker = `Fighter values tied! ${merged.players[0].name} goes Second in Round 1.`;
                    }
                  }

                  merged.roundInitiativeSecondPlayerIndex = secondPlayerIndex;
                  merged.activePlayerIndex = secondPlayerIndex === 0 ? 1 : 0;
                  merged.tieBreakerInfo = tieBreaker;
                  checkAndInitiateRound(merged);
                }
              }

              return merged;
            }

            // In round action, resolution, or game over, take incoming authoritative state
            return incoming;
          });
        }
      },
      connected => {
        setIsConnected(connected);
      }
    );

    if (playerIdx === 0) {
      const freshState = initNewGame('Player 1 (Host)', 'Player 2 (Challenger)', false);
      setGameState(freshState);
      broadcastGameState(freshState);
    }
  };

  // Restart match
  const handleRestartMatch = () => {
    sounds.playShuffle();
    const fresh = initNewGame('Player 1', mode === 'ai' ? 'Strategic AI' : 'Player 2', mode === 'ai');
    setGameState(fresh);
    broadcastGameState(fresh);
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black">
      {/* Top Header / Table Rail */}
      <header className="sticky top-0 z-40 bg-stone-900/95 backdrop-blur-md border-b border-stone-800 px-4 py-2.5 shadow-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          {/* Logo & Game Title */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-stone-950 font-black text-sm shadow-md">
              ♠
            </div>
            <div>
              <h1 className="text-base font-serif font-black tracking-tight text-amber-300">
                Slay the Cards!
              </h1>
              <p className="text-[10px] text-stone-400 leading-none">
                Tactical Clockwise Tabletop Combat
              </p>
            </div>
          </div>

          {/* Mode Selector & Quick Actions */}
          <div className="flex items-center gap-2">
            {/* Mode Pills */}
            <div className="hidden sm:flex bg-stone-950 p-1 rounded-xl border border-stone-800 text-xs">
              <button
                onClick={() => {
                  setMode('ai');
                  handleRestartMatch();
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  mode === 'ai'
                    ? 'bg-amber-600 text-stone-950 font-bold shadow'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Bot className="w-3.5 h-3.5" /> VS AI
              </button>
              <button
                onClick={() => setShowMultiplayer(true)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  mode === 'websocket_multiplayer'
                    ? 'bg-emerald-600 text-white font-bold shadow'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>
                  {mode === 'websocket_multiplayer' && roomCode
                    ? `Room: ${roomCode} ${isHost ? '(Host)' : '(Challenger)'}`
                    : 'Live Multiplayer'}
                </span>
              </button>
            </div>

            {/* Rules Button */}
            <button
              onClick={() => setShowRules(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold border border-stone-700 cursor-pointer transition-colors"
            >
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Official Rules</span>
            </button>

            {/* Multiplayer Button (Mobile / Global) */}
            <button
              onClick={() => setShowMultiplayer(true)}
              className="sm:hidden p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-emerald-400 border border-stone-700 cursor-pointer relative"
              title="Multiplayer"
            >
              <Globe className="w-4 h-4" />
              {mode === 'websocket_multiplayer' && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              )}
            </button>

            {/* Audio Toggle */}
            <button
              onClick={toggleMute}
              className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 cursor-pointer"
              title={isAudioMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isAudioMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Restart Match */}
            <button
              onClick={handleRestartMatch}
              className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-400 border border-stone-700 cursor-pointer"
              title="Restart Match"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Pre-Round Face Club Announcement Banner */}
      {preRoundAnnouncement && (
        <div className="bg-emerald-950/90 border border-emerald-500/70 text-emerald-200 px-4 py-2.5 rounded-2xl flex items-center justify-between text-xs max-w-4xl mx-auto shadow-lg mt-3 mb-1 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <Scissors className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium">{preRoundAnnouncement}</span>
          </div>
          <button
            onClick={() => setPreRoundAnnouncement(null)}
            className="text-stone-400 hover:text-white px-2 py-0.5 bg-stone-800 rounded-lg text-[10px] cursor-pointer ml-3 font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Table Felt Arena */}
      <main className="flex-1 p-3 sm:p-6 overflow-x-hidden flex flex-col justify-center">
        <TableBoard
          gameState={gameState}
          localPlayerIndex={localPlayerIndex}
          isAiThinking={isAiThinking}
          mode={mode}
          roomCode={roomCode}
          isHost={isHost}
          isConnected={isConnected}
          playerCount={playerCount}
          onOpenMultiplayer={() => setShowMultiplayer(true)}
          onPlayActionCard={handlePlayActionCard}
          onSummonMinion={handleSummonMinion}
          onBoostMinionHp={handleBoostMinionHp}
          onEquipPermanent={handleEquipPermanent}
          onBankCard={handleBankCard}
          onEndTurn={handleEndTurn}
          onTriggerJoker={handleTriggerJoker}
          onRequestHeartChoice={card => setPendingHeartCard(card)}
          onRequestClubTarget={card => setPendingClubCard(card)}
          onRequestDiamondTarget={card => setPendingDiamondCard(card)}
        />
      </main>

      {/* ================= MODALS & OVERLAYS ================= */}

      {/* Mulligan Modal */}
      {gameState.phase === 'mulligan' && !gameState.players[localPlayerIndex].mulliganDone && (
        <MulliganModal
          hand={gameState.players[localPlayerIndex].hand}
          mulliganCount={gameState.players[localPlayerIndex].mulliganCount}
          onMulliganReset={handlePlayerMulliganReset}
          onPutCardsToBottom={handlePlayerPutCardsToBottom}
          onKeepHand={handlePlayerKeepHand}
        />
      )}

      {/* Fighter Setup Modal */}
      {gameState.phase === 'fighter_setup' && !gameState.players[localPlayerIndex].fighter && (
        <SetupFighterModal
          hand={gameState.players[localPlayerIndex].hand}
          onSelectFighter={handleSelectFighter}
        />
      )}

      {/* Heart Choice (Block vs Heal) */}
      {pendingHeartCard && (
        <HeartChoiceModal
          card={pendingHeartCard}
          onDeclare={declaration => {
            handlePlayActionCard(pendingHeartCard, 'horizontal', undefined, declaration);
            setPendingHeartCard(null);
          }}
          onCancel={() => setPendingHeartCard(null)}
        />
      )}

      {/* Diamond Target (Boost Action) */}
      {pendingDiamondCard && (
        <DiamondTargetModal
          diamondCard={pendingDiamondCard}
          playedActions={gameState.players[localPlayerIndex].playedActions}
          onConfirmBoost={targetActionId => {
            const points = getUniversalPoints(pendingDiamondCard);
            setGameState(prev => {
              const next: GameState = JSON.parse(JSON.stringify(prev));
              const player = next.players[localPlayerIndex];
              if (player.bankedCardId === pendingDiamondCard.id) {
                player.bankedCardId = null;
                player.energy += 1;
              }
              const cost = getCardEnergyCost(pendingDiamondCard);
              if (player.energy < cost) return prev;

              player.hand = player.hand.filter(c => c.id !== pendingDiamondCard.id);
              player.energy -= cost;

              // Boost target action
              const targetAct = player.playedActions.find(a => a.id === targetActionId);
              if (targetAct) {
                targetAct.boostedPoints += points;
                targetAct.finalPoints += points;
              }

              // Also record diamond played action
              player.playedActions.push({
                id: `act_diamond_${Date.now()}`,
                card: pendingDiamondCard,
                orientation: 'horizontal',
                energyCost: cost,
                basePoints: points,
                boostedPoints: 0,
                debuffedPoints: 0,
                finalPoints: points,
                targetActionId,
              });

              sounds.playHeal();
              broadcastGameState(next);
              return next;
            });
            setPendingDiamondCard(null);
          }}
          onCancel={() => setPendingDiamondCard(null)}
        />
      )}

      {/* Club Target (Disruption & Skills & Debuffs) */}
      {pendingClubCard && (
        <ClubTargetModal
          clubCard={pendingClubCard}
          opponentState={gameState.players[localPlayerIndex === 0 ? 1 : 0]}
          onConfirmDebuffAction={targetActionId => {
            const cost = getCardEnergyCost(pendingClubCard);
            const points = getUniversalPoints(pendingClubCard);
            setGameState(prev => {
              const next: GameState = JSON.parse(JSON.stringify(prev));
              const player = next.players[localPlayerIndex];
              if (player.bankedCardId === pendingClubCard.id) {
                player.bankedCardId = null;
                player.energy += 1;
              }
              if (player.energy < cost) return prev;

              player.hand = player.hand.filter(c => c.id !== pendingClubCard.id);
              player.energy -= cost;

              player.playedActions.push({
                id: `act_club_${Date.now()}`,
                card: pendingClubCard,
                orientation: 'horizontal',
                energyCost: cost,
                basePoints: points,
                boostedPoints: 0,
                debuffedPoints: 0,
                finalPoints: points,
                targetActionId,
              });

              sounds.playCardRotate();
              broadcastGameState(next);
              return next;
            });
            setPendingClubCard(null);
            if (gameState.phase === 'pre_round_face_clubs') {
              handlePreRoundPlayerFinished(localPlayerIndex);
            }
          }}
          onConfirmDestroyEquipment={() => {
            handlePlayActionCard(pendingClubCard, 'horizontal');
            setPendingClubCard(null);
            if (gameState.phase === 'pre_round_face_clubs') {
              handlePreRoundPlayerFinished(localPlayerIndex);
            }
          }}
          onConfirmJackDiscard={(targetCardId?: string) => {
            setGameState(prev => {
              const next: GameState = JSON.parse(JSON.stringify(prev));
              const player = next.players[localPlayerIndex];
              const opp = next.players[localPlayerIndex === 0 ? 1 : 0];
              if (player.bankedCardId === pendingClubCard.id) {
                player.bankedCardId = null;
                player.energy += 1;
              }
              const cost = getCardEnergyCost(pendingClubCard);
              if (player.energy < cost) return prev;
              player.hand = player.hand.filter(c => c.id !== pendingClubCard.id);
              player.energy -= cost;

              // Immediately remove card from opponent hand & send to opponent discard pile!
              let discardedCard: Card | undefined = undefined;
              if (targetCardId) {
                const cIdx = opp.hand.findIndex(c => c.id === targetCardId);
                if (cIdx >= 0) {
                  discardedCard = opp.hand.splice(cIdx, 1)[0];
                  opp.discardPile.push(discardedCard);
                }
              } else if (opp.hand.length > 0) {
                const randIdx = Math.floor(Math.random() * opp.hand.length);
                discardedCard = opp.hand.splice(randIdx, 1)[0];
                opp.discardPile.push(discardedCard);
              }

              if (discardedCard && opp.bankedCardId === discardedCard.id) {
                opp.bankedCardId = null;
                opp.energy = Math.min(3, opp.energy + 1);
              }

              player.playedActions.push({
                id: `act_jack_${Date.now()}`,
                card: pendingClubCard,
                orientation: 'horizontal',
                energyCost: cost,
                basePoints: 0,
                boostedPoints: 0,
                debuffedPoints: 0,
                finalPoints: 0,
                clubSpecial: {
                  type: 'jack',
                  targetCardId,
                  discardedCardName: discardedCard?.name,
                },
              });

              if (discardedCard) {
                setPreRoundAnnouncement(`⚔️ Discard Ambush! ${player.name} played Jack of Clubs and forced ${opp.name} to discard ${discardedCard.name}!`);
              }

              sounds.playCardRotate();
              broadcastGameState(next);
              return next;
            });
            setPendingClubCard(null);
            if (gameState.phase === 'pre_round_face_clubs') {
              handlePreRoundPlayerFinished(localPlayerIndex);
            }
          }}
          onConfirmQueenDiscard={targetCardId => {
            setGameState(prev => {
              const next: GameState = JSON.parse(JSON.stringify(prev));
              const player = next.players[localPlayerIndex];
              const opp = next.players[localPlayerIndex === 0 ? 1 : 0];
              if (player.bankedCardId === pendingClubCard.id) {
                player.bankedCardId = null;
                player.energy += 1;
              }
              const cost = getCardEnergyCost(pendingClubCard);
              if (player.energy < cost) return prev;
              player.hand = player.hand.filter(c => c.id !== pendingClubCard.id);
              player.energy -= cost;

              // Immediately remove card from opponent hand & send to opponent discard pile!
              let discardedCard: Card | undefined = undefined;
              const cIdx = opp.hand.findIndex(c => c.id === targetCardId);
              if (cIdx >= 0) {
                discardedCard = opp.hand.splice(cIdx, 1)[0];
                opp.discardPile.push(discardedCard);
              }

              if (discardedCard && opp.bankedCardId === discardedCard.id) {
                opp.bankedCardId = null;
                opp.energy = Math.min(3, opp.energy + 1);
              }

              player.playedActions.push({
                id: `act_queen_${Date.now()}`,
                card: pendingClubCard,
                orientation: 'horizontal',
                energyCost: cost,
                basePoints: 0,
                boostedPoints: 0,
                debuffedPoints: 0,
                finalPoints: 0,
                clubSpecial: {
                  type: 'queen',
                  targetCardId,
                  discardedCardName: discardedCard?.name,
                },
              });

              if (discardedCard) {
                setPreRoundAnnouncement(`👁️ Mind Vision! ${player.name} played Queen of Clubs and discarded ${opp.name}'s ${discardedCard.name}!`);
              }

              sounds.playCardRotate();
              broadcastGameState(next);
              return next;
            });
            setPendingClubCard(null);
            if (gameState.phase === 'pre_round_face_clubs') {
              handlePreRoundPlayerFinished(localPlayerIndex);
            }
          }}
          onConfirmKingSteal={(stolenCardId, asMinion) => {
            setGameState(prev => {
              const next: GameState = JSON.parse(JSON.stringify(prev));
              const player = next.players[localPlayerIndex];
              const opp = next.players[localPlayerIndex === 0 ? 1 : 0];

              if (player.bankedCardId === pendingClubCard.id) {
                player.bankedCardId = null;
                player.energy += 1;
              }

              if (stolenCardId) {
                if (opp.bankedCardId === stolenCardId) {
                  opp.bankedCardId = null;
                  opp.energy = Math.min(3, opp.energy + 1);
                }
                const cIdx = opp.hand.findIndex(c => c.id === stolenCardId);
                let stolenCard: Card | undefined = undefined;
                if (cIdx >= 0) {
                  stolenCard = opp.hand.splice(cIdx, 1)[0];
                  if (asMinion && stolenCard.rank === 1) {
                    if (!player.minion) {
                      player.minion = {
                        id: `minion_${Date.now()}`,
                        aceCard: stolenCard,
                        hp: 1,
                        maxHp: 1,
                      };
                      sounds.playBlock();
                    } else if (player.minion.maxHp < 2) {
                      player.minion.boostAceCard = stolenCard;
                      player.minion.hp = 2;
                      player.minion.maxHp = 2;
                      sounds.playHeal();
                    } else {
                      player.minion.hp = player.minion.maxHp;
                      sounds.playHeal();
                    }
                  } else {
                    const basePts = getUniversalPoints(stolenCard);
                    if (stolenCard.suit === 'diamonds') {
                      const targetAction = player.playedActions.find(a => a.card.suit === 'spades');
                      if (targetAction) {
                        targetAction.boostedPoints += basePts;
                        targetAction.finalPoints += basePts;
                      }
                    }

                    player.playedActions.push({
                      id: `stolen_play_${Date.now()}`,
                      card: stolenCard,
                      orientation: 'horizontal',
                      energyCost: 0,
                      basePoints: basePts,
                      boostedPoints: 0,
                      debuffedPoints: 0,
                      finalPoints: basePts,
                      heartDeclaration: stolenCard.suit === 'hearts' ? 'block' : undefined,
                    });
                  }
                }

                const clubPts = getUniversalPoints(pendingClubCard);
                // Add the King of Clubs card itself to playedActions!
                player.playedActions.push({
                  id: `act_king_${Date.now()}`,
                  card: pendingClubCard,
                  orientation: 'horizontal',
                  energyCost: 3,
                  basePoints: clubPts,
                  boostedPoints: 0,
                  debuffedPoints: 0,
                  finalPoints: clubPts,
                  clubSpecial: {
                    type: 'king',
                    stolenCard: stolenCard,
                  },
                });

                if (stolenCard) {
                  setPreRoundAnnouncement(`👑 Grand Heist! ${player.name} played King of Clubs and stole ${opp.name}'s ${stolenCard.name}${asMinion && stolenCard.rank === 1 ? ' as a Minion' : ''}!`);
                }

                player.hand = player.hand.filter(c => c.id !== pendingClubCard.id);
                player.energy -= 3;
              } else {
                player.hand = player.hand.filter(c => c.id !== pendingClubCard.id);
                player.energy -= 1;
                player.discardPile.push(pendingClubCard);
              }

              sounds.playCardRotate();
              broadcastGameState(next);
              return next;
            });
            setPendingClubCard(null);
            if (gameState.phase === 'pre_round_face_clubs') {
              handlePreRoundPlayerFinished(localPlayerIndex);
            }
          }}
          onCancel={() => {
            setPendingClubCard(null);
            if (gameState.phase === 'pre_round_face_clubs') {
              handlePreRoundPlayerFinished(localPlayerIndex);
            }
          }}
        />
      )}

      {/* Pre-Round Face Club Modal */}
      {gameState.phase === 'pre_round_face_clubs' &&
        (gameState.preRoundPendingPlayerIndex ?? preRoundPendingPlayerIndex) === localPlayerIndex &&
        !pendingClubCard && (
          <PreRoundClubModal
            player={gameState.players[localPlayerIndex]}
            opponent={gameState.players[localPlayerIndex === 0 ? 1 : 0]}
            roundNumber={gameState.roundNumber}
            onApplyDisruption={card => setPendingClubCard(card)}
            onApplyDebuff={card => handleApplyPreRoundDebuff(card)}
            onPass={() => handlePreRoundPlayerFinished(localPlayerIndex)}
          />
        )}

      {/* Pre-Round Waiting indicator for the other player */}
      {gameState.phase === 'pre_round_face_clubs' &&
        (gameState.preRoundPendingPlayerIndex ?? preRoundPendingPlayerIndex) !== localPlayerIndex && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-stone-900 border-2 border-emerald-500 rounded-3xl p-6 shadow-2xl max-w-md w-full text-center flex flex-col items-center">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
              <h3 className="text-lg font-serif font-bold text-emerald-300">
                Pre-Round Face Club In Progress
              </h3>
              <p className="text-xs text-stone-300 mt-2">
                {gameState.players[gameState.preRoundPendingPlayerIndex ?? 0]?.name || 'Opponent'} holds a Face Club card and is choosing their Pre-Round strike (Disruption or 4-Point Debuff)...
              </p>
              <span className="text-[10px] text-stone-500 mt-4">Combat actions will begin once they decide.</span>
            </div>
          </div>
        )}

      {/* Assign Pre-Committed Debuff Modal (When Player Chooses Target Before Resolution) */}
      {(() => {
        const pendingIdx = gameState.pendingDebuffPlayerIndex ?? pendingAssignDebuffAction?.playerIndex;
        const pendingActionId = gameState.pendingDebuffActionId ?? pendingAssignDebuffAction?.actionId;
        if (pendingIdx === undefined || pendingIdx === null || !pendingActionId) return null;

        if (pendingIdx === localPlayerIndex) {
          const actingPlayer = gameState.players[pendingIdx];
          const targetOpponent = gameState.players[pendingIdx === 0 ? 1 : 0];
          const clubAct = actingPlayer.playedActions.find(a => a.id === pendingActionId);
          if (!clubAct) return null;

          return (
            <AssignDebuffModal
              clubAction={clubAct}
              opponent={targetOpponent}
              onConfirmTarget={targetActionId => handleConfirmDebuffTarget(targetActionId)}
              onConfirmDestroyEquipment={() => handleConfirmDebuffShatterEquipment()}
              onAutoTargetHighest={() => handleConfirmDebuffTarget(undefined)}
            />
          );
        } else {
          const oppName = gameState.players[pendingIdx]?.name || 'Opponent';
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-stone-900 border-2 border-emerald-500 rounded-3xl p-6 shadow-2xl max-w-md w-full text-center flex flex-col items-center">
                <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
                <h3 className="text-lg font-serif font-bold text-emerald-300">
                  Opponent Assigning Club Debuff
                </h3>
                <p className="text-xs text-stone-300 mt-2">
                  {oppName} played a Club Debuff earlier and is now selecting which of your cards to weaken before attacks clash!
                </p>
                <span className="text-[10px] text-stone-500 mt-4">Combat resolution will begin immediately after.</span>
              </div>
            </div>
          );
        }
      })()}

      {/* Resolution Overlay */}
      {gameState.phase === 'resolution' && (
        <ResolutionOverlay
          logs={gameState.combatLogs}
          onComplete={handleResolutionComplete}
        />
      )}

      {/* Game Over Dialog */}
      {gameState.phase === 'game_over' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="relative w-full max-w-md bg-stone-900 border-2 border-amber-500 rounded-3xl p-6 shadow-2xl text-stone-100 flex flex-col items-center text-center">
            <Trophy className="w-16 h-16 text-amber-400 mb-3 animate-bounce" />
            <h2 className="text-3xl font-serif font-black text-amber-300 mb-2">
              {gameState.gameWinnerId === gameState.players[localPlayerIndex].id
                ? 'VICTORY!'
                : gameState.gameWinnerId === 'tie'
                ? 'STALEMATE!'
                : 'DEFEAT'}
            </h2>
            <p className="text-stone-300 text-sm mb-6">
              {gameState.gameWinnerId === gameState.players[localPlayerIndex].id
                ? 'You successfully slayed the enemy Fighter! Outstanding card tactics!'
                : gameState.gameWinnerId === 'tie'
                ? 'Both champion Fighters fell at the exact same moment!'
                : 'Your champion Fighter has perished in battle.'}
            </p>

            <button
              onClick={handleRestartMatch}
              className="px-8 py-3 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-black text-sm rounded-xl shadow-lg shadow-amber-600/30 transition-all cursor-pointer"
            >
              Play Another Match
            </button>
          </div>
        </div>
      )}

      {/* Official Rules Modal */}
      {showRules && <RulesModal onClose={() => setShowRules(false)} />}

      {/* WebSocket / Supabase Multiplayer Modal */}
      {showMultiplayer && (
        <MultiplayerModal
          currentMode={mode}
          roomCode={roomCode}
          isHost={isHost}
          isConnected={isConnected}
          playerCount={playerCount}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onLeaveRoom={() => {
            socketService.disconnect();
            setMode('ai');
            setRoomCode('');
            setIsHost(false);
            setLocalPlayerIndex(0);
            setShowMultiplayer(false);
            handleRestartMatch();
          }}
          onClose={() => setShowMultiplayer(false)}
        />
      )}
    </div>
  );
}
