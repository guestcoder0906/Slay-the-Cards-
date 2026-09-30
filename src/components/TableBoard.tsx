import React, { useState } from 'react';
import { Card, GameState, HeartDeclaration, MultiplayerMode, PlayedActionCard, PlayerState } from '../types/game';
import { CardView } from './CardView';
import {
  canEquipToMinion,
  canPlayActionOfSuit,
  getCardEnergyCost,
  getFighterMaxHealth,
  getRankLabel,
  getUniversalPoints,
  isFaceCard,
  SUIT_NAMES,
  SUIT_SYMBOLS,
  SUIT_THEMES,
} from '../utils/cardUtils';
import { sounds } from '../utils/audio';
import {
  Shield,
  Swords,
  Heart,
  Zap,
  Scissors,
  Crown,
  Sparkles,
  Info,
  Layers,
  HelpCircle,
  Play,
  RotateCw,
  PlusCircle,
  AlertCircle,
  Lock,
  ArrowRight,
  Clock,
  Loader2,
  Share2,
} from 'lucide-react';

interface TableBoardProps {
  gameState: GameState;
  localPlayerIndex: number;
  isAiThinking?: boolean;
  mode?: MultiplayerMode;
  roomCode?: string;
  isHost?: boolean;
  isConnected?: boolean;
  playerCount?: number;
  onOpenMultiplayer?: () => void;
  onPlayActionCard: (card: Card, orientation: 'horizontal', targetActionId?: string, heartDec?: HeartDeclaration) => void;
  onSummonMinion: (card: Card) => void;
  onBoostMinionHp: (card: Card) => void;
  onEquipPermanent: (card: Card) => void;
  onBankCard: (cardId: string) => void;
  onEndTurn: () => void;
  onTriggerJoker: () => void;
  onRequestHeartChoice: (card: Card) => void;
  onRequestClubTarget: (card: Card) => void;
  onRequestDiamondTarget: (card: Card) => void;
  onActivateMinionDiamond?: (targetActionId: string) => void;
}

export const TableBoard: React.FC<TableBoardProps> = ({
  gameState,
  localPlayerIndex,
  isAiThinking = false,
  mode,
  roomCode,
  isHost = false,
  isConnected = false,
  playerCount = 1,
  onOpenMultiplayer,
  onPlayActionCard,
  onSummonMinion,
  onBoostMinionHp,
  onEquipPermanent,
  onBankCard,
  onEndTurn,
  onTriggerJoker,
  onRequestHeartChoice,
  onRequestClubTarget,
  onRequestDiamondTarget,
  onActivateMinionDiamond,
}) => {
  const opponentIndex = localPlayerIndex === 0 ? 1 : 0;
  const player = gameState.players[localPlayerIndex];
  const opponent = gameState.players[opponentIndex];

  const [selectedCardForAction, setSelectedCardForAction] = useState<Card | null>(null);
  const [dragOverZone, setDragOverZone] = useState<'action' | 'minion' | 'equipment' | null>(null);
  const [showDiamondEnginePicker, setShowDiamondEnginePicker] = useState<boolean>(false);

  // Auto-deselect if card was discarded or removed from hand
  React.useEffect(() => {
    if (selectedCardForAction && !player.hand.some(c => c.id === selectedCardForAction.id)) {
      setSelectedCardForAction(null);
    }
  }, [player.hand, selectedCardForAction]);

  // Turn logic
  const isPlayerSecond = gameState.roundInitiativeSecondPlayerIndex === localPlayerIndex;
  const isMyTurn =
    gameState.phase === 'round_action' &&
    gameState.activePlayerIndex === localPlayerIndex &&
    !gameState.isResolving;
  const affinity = player.fighter?.affinity || 'spades';

  // Non-affinity suits already played this round
  const playedNonAffinitySuits = new Set(
    player.playedActions
      .filter(a => !a.card.isJoker && a.card.suit !== affinity)
      .map(a => a.card.suit)
  );

  // -------------------------------------------------------------
  // OPPONENT TELEMETRY: ATTACK, BLOCK, DEBUFF, MINION & CARD EFFECTS
  // -------------------------------------------------------------
  let oppRawAttackPoints = 0;
  let oppBlockPoints = 0;
  let oppHealPoints = 0;
  let oppDebuffPoints = 0;
  const oppSpecialEffects: string[] = [];

  // Opponent Minion effects
  let oppMinionAttackBonus = 0;
  let oppMinionPassiveShield = 0;

  if (opponent.minion) {
    oppSpecialEffects.push(
      `🛡️ Minion Guards (${opponent.minion.hp}/${opponent.minion.maxHp} HP absorbs damage first)`
    );

    if (opponent.minion.equippedPermanent?.suit === 'spades') {
      oppMinionAttackBonus = opponent.minion.equippedPermanent.tierPoints;
      oppSpecialEffects.push(`⚔️ Spade Eq (+${oppMinionAttackBonus} Attack per attack)`);
    }
    if (opponent.minion.equippedPermanent?.suit === 'hearts') {
      oppMinionPassiveShield = opponent.minion.equippedPermanent.tierPoints;
      oppSpecialEffects.push(`🛡️ Heart Eq (+${oppMinionPassiveShield} Passive Shield every round)`);
    }
    if (opponent.minion.equippedPermanent?.suit === 'diamonds') {
      oppSpecialEffects.push(`⚡ Diamond Eq (Action Boost Synergy)`);
    }
    if (opponent.minion.equippedPermanent?.suit === 'clubs') {
      oppSpecialEffects.push(`✂️ Club Eq (Disruption Synergy)`);
    }
  }

  opponent.playedActions.forEach(action => {
    if (action.isJokerAction) {
      oppSpecialEffects.push('🃏 Joker Aura (All your attacks negated this round!)');
    }
    if (action.card.suit === 'spades' && !action.isJokerAction) {
      oppRawAttackPoints += action.finalPoints;
      if (action.boostedPoints > 0) {
        oppSpecialEffects.push(`⚡ ${action.card.name} boosted by +${action.boostedPoints} pts`);
      }
      if (action.debuffedPoints > 0) {
        oppSpecialEffects.push(`✂️ ${action.card.name} debuffed by -${action.debuffedPoints} pts`);
      }
    }
    if (action.card.suit === 'hearts') {
      if (action.heartDeclaration === 'block') {
        oppBlockPoints += action.finalPoints;
      } else if (action.heartDeclaration === 'heal') {
        oppHealPoints += action.finalPoints;
        oppSpecialEffects.push(`❤️ Healing Declared (+${action.finalPoints} HP)`);
      }
    }
    if (action.card.suit === 'clubs' && !action.isJokerAction) {
      if (action.clubSpecial?.type === 'jack') {
        oppSpecialEffects.push('⚔️ Jack Ambush (Forced random discard)');
      } else if (action.clubSpecial?.type === 'queen') {
        oppSpecialEffects.push('👁️ Queen Vision (Forced card discard)');
      } else if (action.clubSpecial?.type === 'king') {
        oppSpecialEffects.push('👑 King Grand Heist (Stolen card played)');
      } else {
        oppDebuffPoints += action.finalPoints;
        oppSpecialEffects.push(`✂️ Club Debuff (-${action.finalPoints} pts)`);
      }
    }
    if (action.card.suit === 'diamonds' && !action.isJokerAction) {
      oppSpecialEffects.push(`⚡ Diamond Overcharge (+${action.finalPoints} pts applied)`);
    }
  });

  const hasOppAttackActions = opponent.playedActions.some(a => a.card.suit === 'spades' && !a.isJokerAction);
  const totalOppAttack = hasOppAttackActions
    ? oppRawAttackPoints + oppMinionAttackBonus
    : (oppMinionAttackBonus > 0 ? oppMinionAttackBonus : oppRawAttackPoints);
  const totalOppBlock = oppBlockPoints + oppMinionPassiveShield;

  // Check if player played Joker (negating opponent attacks)
  const isOppAttackNegatedByPlayerJoker = player.playedActions.some(a => a.isJokerAction);

  // -------------------------------------------------------------
  // PLAYER TELEMETRY: ATTACK, BLOCK, DEBUFF, MINION & CARD EFFECTS
  // -------------------------------------------------------------
  let playerRawAttackPoints = 0;
  let playerBlockPoints = 0;
  let playerHealPoints = 0;
  let playerDebuffPoints = 0;
  const playerSpecialEffects: string[] = [];

  // Player Minion effects
  let playerMinionAttackBonus = 0;
  let playerMinionPassiveShield = 0;

  if (player.minion) {
    playerSpecialEffects.push(
      `🛡️ Minion Guards (${player.minion.hp}/${player.minion.maxHp} HP absorbs damage first)`
    );

    if (player.minion.equippedPermanent?.suit === 'spades') {
      playerMinionAttackBonus = player.minion.equippedPermanent.tierPoints;
      playerSpecialEffects.push(`⚔️ Spade Eq (+${playerMinionAttackBonus} Attack per attack)`);
    }
    if (player.minion.equippedPermanent?.suit === 'hearts') {
      playerMinionPassiveShield = player.minion.equippedPermanent.tierPoints;
      playerSpecialEffects.push(`🛡️ Heart Eq (+${playerMinionPassiveShield} Passive Shield every round)`);
    }
    if (player.minion.equippedPermanent?.suit === 'diamonds') {
      playerSpecialEffects.push(`⚡ Diamond Eq (Action Boost Synergy)`);
    }
    if (player.minion.equippedPermanent?.suit === 'clubs') {
      playerSpecialEffects.push(`✂️ Club Eq (Disruption Synergy)`);
    }
  }

  player.playedActions.forEach(action => {
    if (action.isJokerAction) {
      playerSpecialEffects.push('🃏 Joker Aura (All opponent attacks negated this round!)');
    }
    if (action.card.suit === 'spades' && !action.isJokerAction) {
      playerRawAttackPoints += action.finalPoints;
      if (action.boostedPoints > 0) {
        playerSpecialEffects.push(`⚡ ${action.card.name} boosted by +${action.boostedPoints} pts`);
      }
      if (action.debuffedPoints > 0) {
        playerSpecialEffects.push(`✂️ ${action.card.name} debuffed by -${action.debuffedPoints} pts`);
      }
    }
    if (action.card.suit === 'hearts') {
      if (action.heartDeclaration === 'block') {
        playerBlockPoints += action.finalPoints;
      } else if (action.heartDeclaration === 'heal') {
        playerHealPoints += action.finalPoints;
        playerSpecialEffects.push(`❤️ Healing Declared (+${action.finalPoints} HP)`);
      }
    }
    if (action.card.suit === 'clubs' && !action.isJokerAction) {
      if (action.clubSpecial?.type === 'jack') {
        playerSpecialEffects.push('⚔️ Jack Ambush (Forced random discard)');
      } else if (action.clubSpecial?.type === 'queen') {
        playerSpecialEffects.push('👁️ Queen Vision (Forced card discard)');
      } else if (action.clubSpecial?.type === 'king') {
        playerSpecialEffects.push('👑 King Grand Heist (Stolen card played)');
      } else {
        playerDebuffPoints += action.finalPoints;
        playerSpecialEffects.push(`✂️ Club Debuff (-${action.finalPoints} pts)`);
      }
    }
    if (action.card.suit === 'diamonds' && !action.isJokerAction) {
      playerSpecialEffects.push(`⚡ Diamond Overcharge (+${action.finalPoints} pts applied)`);
    }
  });

  const hasPlayerAttackActions = player.playedActions.some(
    a => a.card.suit === 'spades' && !a.isJokerAction
  );
  const totalPlayerAttack = hasPlayerAttackActions
    ? playerRawAttackPoints + playerMinionAttackBonus
    : (playerMinionAttackBonus > 0 ? playerMinionAttackBonus : playerRawAttackPoints);
  const totalPlayerBlock = playerBlockPoints + playerMinionPassiveShield;

  // Check if opponent played Joker (negating player attacks)
  const isPlayerAttackNegatedByOpponentJoker = opponent.playedActions.some(a => a.isJokerAction);

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent, zone: 'action' | 'minion' | 'equipment') => {
    e.preventDefault();
    if (!isMyTurn) return;
    setDragOverZone(zone);
  };

  const handleDragLeave = () => {
    setDragOverZone(null);
  };

  const handleDrop = (e: React.DragEvent, zone: 'action' | 'minion' | 'equipment') => {
    e.preventDefault();
    setDragOverZone(null);
    if (!isMyTurn) {
      alert("It is not your turn yet! Please wait for your opponent.");
      return;
    }
    try {
      const cardData = e.dataTransfer.getData('text/plain');
      if (!cardData) return;
      const card: Card = JSON.parse(cardData);
      executeCardPlay(card, zone);
    } catch (err) {
      console.error('Drop error:', err);
    }
  };

  const executeCardPlay = (card: Card, zone: 'action' | 'minion' | 'equipment') => {
    if (!isMyTurn) {
      alert("It is not your turn yet! Please wait for your opponent to take their turn.");
      return;
    }

    const cost = getCardEnergyCost(card);

    if (zone === 'action') {
      if (card.isJoker) {
        onTriggerJoker();
        return;
      }
      if (player.energy < cost) {
        alert(`Need ${cost} Energy to play this card. (You have ${player.energy}⚡ remaining)`);
        return;
      }
      const check = canPlayActionOfSuit(card, affinity, player.playedActions, gameState.roundNumber);
      if (!check.allowed) {
        alert(check.reason);
        return;
      }

      if (card.suit === 'hearts') {
        onRequestHeartChoice(card);
      } else if (card.suit === 'diamonds') {
        onRequestDiamondTarget(card);
      } else if (card.suit === 'clubs') {
        onRequestClubTarget(card);
      } else {
        // Spades Attack
        onPlayActionCard(card, 'horizontal');
      }
    } else if (zone === 'minion') {
      if (card.rank !== 1 || card.isJoker) {
        alert('Only Aces can summon or boost Minions!');
        return;
      }
      if (player.energy < 1) {
        alert('Summoning or boosting a Minion costs 1 Energy.');
        return;
      }
      if (!player.minion) {
        onSummonMinion(card);
      } else if (player.minion.maxHp === 1) {
        onBoostMinionHp(card);
      } else {
        alert('Max 1 Minion on table and max 2 HP boost reached!');
      }
    } else if (zone === 'equipment') {
      if (isFaceCard(card.rank) || card.isJoker) {
        alert("Equip minion is disabled for face cards! Only numbered cards (2-10) matching your minion's suit can be equipped.");
        return;
      }
      const check = canEquipToMinion(card, player.minion, player.energy, gameState.roundNumber);
      if (!check.allowed) {
        alert(check.reason);
        return;
      }
      onEquipPermanent(card);
      setSelectedCardForAction(null);
    }
  };

  // Helper to click on card in hand: always allows selecting/toggling card
  const handleCardClick = (card: Card) => {
    if (!isMyTurn) {
      return;
    }

    if (selectedCardForAction?.id === card.id) {
      setSelectedCardForAction(null);
    } else {
      setSelectedCardForAction(card);
    }
  };

  return (
    <div className="relative w-full max-w-6xl mx-auto flex flex-col gap-4">
      {/* Multiplayer Room Status Bar */}
      {mode === 'websocket_multiplayer' && roomCode && (
        <div
          className={`p-3.5 rounded-2xl border transition-all flex flex-wrap items-center justify-between gap-3 shadow-xl ${
            playerCount < 2
              ? 'bg-amber-950/50 border-amber-500/60 text-amber-200 ring-1 ring-amber-500/30'
              : 'bg-emerald-950/50 border-emerald-500/60 text-emerald-200 ring-1 ring-emerald-500/30'
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`w-3 h-3 rounded-full shrink-0 ${
                isConnected
                  ? playerCount < 2
                    ? 'bg-amber-400 animate-ping'
                    : 'bg-emerald-400 animate-pulse'
                  : 'bg-rose-500'
              }`}
            />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-xs uppercase tracking-wider text-stone-200">
                  {playerCount < 2 ? 'Multiplayer Match Waiting' : 'Live 1v1 Multiplayer Active'}
                </span>
                <span className="font-mono font-black text-amber-300 px-2 py-0.5 rounded-md bg-stone-900 border border-stone-700 text-xs tracking-wider select-all">
                  ROOM: {roomCode}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 font-semibold border border-stone-700">
                  {isHost ? 'You are Host (P1)' : 'You are Challenger (P2)'}
                </span>
              </div>
              <p className="text-[11px] text-stone-300 mt-1">
                {playerCount < 2
                  ? 'Waiting for challenger to join. Copy and share your invite link to begin!'
                  : 'Both players connected & synchronized! Play turns and cards in real time.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const inviteUrl = `${window.location.origin}?room=${roomCode}`;
                navigator.clipboard.writeText(inviteUrl);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-md transition-all active:scale-95"
              title="Copy shareable invite link"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Copy Link</span>
            </button>
            {onOpenMultiplayer && (
              <button
                onClick={onOpenMultiplayer}
                className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold border border-stone-700 cursor-pointer transition-colors"
              >
                Match Info
              </button>
            )}
          </div>
        </div>
      )}

      {/* ================= OPPONENT ZONE ================= */}
      <div className="relative rounded-2xl bg-gradient-to-b from-stone-900/90 to-stone-950/90 border border-stone-800 p-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-stone-800/80 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-stone-200 text-sm">{opponent.name}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-800 text-stone-400">
              {opponent.isAI ? 'Strategic Bot' : 'Challenger'}
            </span>
            {gameState.roundInitiativeSecondPlayerIndex === opponentIndex ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                2nd Initiative (Responds)
              </span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40">
                1st Initiative (Plays First)
              </span>
            )}
            {gameState.activePlayerIndex === opponentIndex && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse flex items-center gap-1">
                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                Active Turn
              </span>
            )}
            {opponent.isReadyForRound && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                ✓ Turn Completed
              </span>
            )}
          </div>

          {/* Opponent Energy Crystals */}
          <div className="flex items-center gap-1.5">
            <span className="text-stone-400 font-semibold mr-1">Energy:</span>
            <span className="text-xs font-mono font-bold text-stone-300 mr-1">{opponent.energy}/3</span>
            {opponent.bankedCardId && (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 mr-1"
                title="1 Energy is reserved to bank 1 card into the next round"
              >
                ⚡ 1 Banked
              </span>
            )}
            <div className="flex gap-1">
              {[...Array(opponent.maxEnergy || 3)].map((_, i) => {
                const isBankedSlot = Boolean(opponent.bankedCardId) && i === opponent.energy;
                return (
                  <div
                    key={i}
                    className={`w-4 h-4 rounded-full border shadow-sm transition-all ${
                      i < opponent.energy
                        ? 'bg-blue-500 border-blue-300 shadow-blue-500/50'
                        : isBankedSlot
                        ? 'bg-emerald-600 border-emerald-400 shadow-emerald-500/30 ring-1 ring-emerald-400/50'
                        : 'bg-stone-800 border-stone-700 opacity-40'
                    }`}
                    title={isBankedSlot ? '1 Energy reserved for banked card' : undefined}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Opponent Table: Fighter, Minion, Played Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 pt-3 items-stretch">
          {/* Opponent Fighter Slot */}
          <div className="flex flex-col items-center p-3 rounded-xl bg-stone-950/60 border border-stone-800/80 justify-center">
            <div className="flex items-center gap-1.5 text-xs text-stone-400 font-bold mb-2">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>Opponent Fighter</span>
              {opponent.fighter && (
                <span className="text-[10px] text-amber-300 uppercase">
                  ({opponent.fighter.affinity} Affinity)
                </span>
              )}
            </div>

            {opponent.fighter ? (
              <div className="relative">
                <CardView
                  card={opponent.fighter.card}
                  hp={opponent.fighter.hp}
                  maxHp={opponent.fighter.maxHp}
                  size="md"
                />
              </div>
            ) : (
              <div className="w-24 h-36 border-2 border-dashed border-stone-800 rounded-xl flex items-center justify-center text-stone-600 text-xs text-center p-2">
                Awaiting Fighter
              </div>
            )}
          </div>

          {/* Opponent Minion Slot */}
          <div className="flex flex-col items-center p-3 rounded-xl bg-stone-950/60 border border-stone-800/80">
            <div className="flex items-center gap-1.5 text-xs text-stone-400 font-bold mb-2">
              <Shield className="w-3.5 h-3.5 text-blue-400" />
              <span>Opponent Minion</span>
            </div>

            {opponent.minion ? (
              <div className="flex items-center gap-2">
                <div className="relative">
                  {opponent.minion.boostAceCard && (
                    <div className="absolute -bottom-2 -right-2 opacity-70 z-0">
                      <CardView card={opponent.minion.boostAceCard} size="sm" />
                    </div>
                  )}
                  <CardView
                    card={opponent.minion.aceCard}
                    hp={opponent.minion.hp}
                    maxHp={opponent.minion.maxHp}
                    size="md"
                  />
                </div>

                {opponent.minion.equippedPermanent && (
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] text-amber-300 font-bold mb-0.5">Equipped Permanent</span>
                    <CardView card={opponent.minion.equippedPermanent.card} size="sm" />
                    <span className="text-[9px] px-1.5 py-0.5 mt-1 rounded font-bold bg-stone-900 border border-amber-500/40 text-amber-300 text-center">
                      {opponent.minion.equippedPermanent.suit === 'spades' && `⚔️ +${opponent.minion.equippedPermanent.tierPoints} Atk`}
                      {opponent.minion.equippedPermanent.suit === 'hearts' && `🛡️ +${opponent.minion.equippedPermanent.tierPoints} Shield`}
                      {opponent.minion.equippedPermanent.suit === 'diamonds' && `⚡ Engine Boost (1⚡)`}
                      {opponent.minion.equippedPermanent.suit === 'clubs' && `✂️ -${opponent.minion.equippedPermanent.tierPoints} Sabotage`}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-24 h-36 border-2 border-dashed border-stone-800 rounded-xl flex items-center justify-center text-stone-600 text-xs text-center p-2">
                No Minion
              </div>
            )}
          </div>

          {/* Opponent Played Actions Zone with Telemetry Breakdown */}
          <div className="flex flex-col p-3 rounded-xl bg-stone-950/70 border border-stone-800/90 min-h-[170px]">
            {/* Header: Title + Real-Time Stat Pills */}
            <div className="flex flex-wrap items-center justify-between gap-1.5 pb-2 border-b border-stone-800/80 mb-2">
              <div className="flex items-center gap-1.5 text-xs text-stone-300 font-bold">
                <Swords className="w-3.5 h-3.5 text-rose-400" />
                <span>Opponent Actions ({opponent.playedActions.length})</span>
              </div>

              {/* Total Attack, Block, Debuff, Heal Badges */}
              <div className="flex flex-wrap items-center gap-1 text-[10px]">
                {/* Attack Badge */}
                <div
                  className={`px-2 py-0.5 rounded-full font-black border flex items-center gap-1 ${
                    isOppAttackNegatedByPlayerJoker
                      ? 'bg-purple-950/70 border-purple-500/50 text-purple-300 line-through'
                      : 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                  }`}
                  title={
                    isOppAttackNegatedByPlayerJoker
                      ? 'Opponent attack negated by your Joker!'
                      : `Total Attack: ${totalOppAttack} (${oppRawAttackPoints} from Spades + ${oppMinionAttackBonus} Minion bonus)`
                  }
                >
                  ⚔️ {totalOppAttack} Atk
                  {isOppAttackNegatedByPlayerJoker && <span className="text-[9px] no-underline">🚫 Joker</span>}
                </div>

                {/* Defense Badge */}
                <div
                  className="px-2 py-0.5 rounded-full font-black bg-blue-500/20 border border-blue-500/50 text-blue-300 flex items-center gap-1"
                  title={`Total Defense: ${totalOppBlock} (${oppBlockPoints} declared Block + ${oppMinionPassiveShield} Minion passive Shield)`}
                >
                  🛡️ {totalOppBlock} Def
                  {oppMinionPassiveShield > 0 && (
                    <span className="text-[9px] text-blue-400">(+{oppMinionPassiveShield}s)</span>
                  )}
                </div>

                {/* Debuff Badge */}
                <div
                  className={`px-2 py-0.5 rounded-full font-black border flex items-center gap-1 ${
                    oppDebuffPoints > 0
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                      : 'bg-stone-800/60 border-stone-700/60 text-stone-400'
                  }`}
                  title={`Total Debuff: -${oppDebuffPoints} points applied against your actions`}
                >
                  ✂️ -{oppDebuffPoints} Debuff
                </div>

                {/* Heal Badge */}
                {oppHealPoints > 0 && (
                  <div
                    className="px-2 py-0.5 rounded-full font-black bg-pink-500/20 border border-pink-500/50 text-pink-300"
                    title={`Healing Declared: +${oppHealPoints} HP restored to damaged Fighter`}
                  >
                    ❤️ +{oppHealPoints} Heal
                  </div>
                )}
              </div>
            </div>

            {/* Active Card & Minion Effects Strip */}
            {oppSpecialEffects.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2.5 max-h-24 overflow-y-auto pr-1">
                {oppSpecialEffects.map((effect, idx) => (
                  <span
                    key={idx}
                    className="text-[9px] px-2 py-0.5 rounded-md bg-stone-900 border border-stone-700/80 text-stone-300 font-medium"
                  >
                    {effect}
                  </span>
                ))}
              </div>
            )}

            {/* Cards List */}
            {opponent.playedActions.length === 0 ? (
              <div className="text-stone-500 text-xs italic my-auto text-center py-4">
                {gameState.activePlayerIndex === opponentIndex
                  ? 'Opponent is choosing cards...'
                  : 'No actions committed yet this round'}
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-2 my-auto overflow-x-auto max-w-full p-1 scrollbar-thin">
                {opponent.playedActions.map(action => (
                  <div key={action.id} className="relative group shrink-0">
                    <CardView
                      card={action.card}
                      orientation="horizontal"
                      size="sm"
                      customBadge={
                        action.heartDeclaration
                          ? action.heartDeclaration.toUpperCase()
                          : action.clubSpecial?.type === 'jack' || action.clubSpecial?.type === 'queen'
                          ? 'DISCARD'
                          : action.clubSpecial?.type === 'king'
                          ? 'HEIST'
                          : `${action.finalPoints} PTS`
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Opponent Hand Indicator (Face down cards) */}
        <div className="flex items-center justify-center gap-1 mt-3 pt-2 border-t border-stone-800/60">
          <span className="text-[11px] text-stone-400 mr-2">Opponent Hand ({opponent.hand.length}):</span>
          {[...Array(opponent.hand.length)].map((_, i) => (
            <div
              key={i}
              className="w-5 h-8 rounded bg-amber-950 border border-amber-800 shadow-sm"
            />
          ))}
        </div>
      </div>

      {/* ================= BATTLEFIELD CENTER / TURN BAR ================= */}
      <div
        className={`relative rounded-2xl border-2 p-4 shadow-2xl overflow-hidden transition-all duration-300 ${
          isMyTurn
            ? 'bg-emerald-950/50 border-emerald-500/80 ring-2 ring-emerald-500/30'
            : 'bg-stone-950/70 border-stone-800'
        }`}
      >
        {/* Subtle Felt Texture */}
        <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />

        {/* Turn Status Banner */}
        <div className="relative flex flex-wrap items-center justify-between gap-4 mb-4 pb-3 border-b border-emerald-800/40">
          <div className="flex items-center gap-3">
            <span className="text-lg font-serif font-bold text-amber-300">
              Round {gameState.roundNumber}
            </span>

            {/* Turn Announcement Pill */}
            {isMyTurn ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-600/30 border border-emerald-400 text-emerald-200 text-xs font-bold animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>
                  YOUR TURN — {isPlayerSecond ? 'Going Second (Respond to Opponent)' : 'Going First (Set Opening Plays)'}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-800 border border-stone-700 text-stone-300 text-xs font-medium">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {isAiThinking
                    ? 'AI is calculating moves and committing cards...'
                    : `Awaiting ${opponent.name}'s turn (${isPlayerSecond ? 'Opponent Plays First' : 'Opponent Responds'})...`}
                </span>
              </div>
            )}
          </div>

          {/* Round Controls */}
          <div className="flex items-center gap-3">
            {/* Diamond Engine Booster Button */}
            {player.minion?.equippedPermanent?.suit === 'diamonds' && (
              <button
                disabled={!isMyTurn || player.energy < 1}
                onClick={() => {
                  const eligible = player.playedActions.filter(
                    a => a.heartDeclaration !== 'heal' && !a.isJokerAction
                  );
                  if (eligible.length === 0) {
                    alert(
                      'Play an action card first (Attack, Block, Debuff), then activate your Diamond Engine to boost it by +' +
                        player.minion?.equippedPermanent?.tierPoints +
                        ' points for 1 Energy!'
                    );
                  } else if (eligible.length === 1) {
                    onActivateMinionDiamond?.(eligible[0].id);
                  } else {
                    setShowDiamondEnginePicker(true);
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all shadow-md ${
                  isMyTurn && player.energy >= 1
                    ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-amber-900/40 cursor-pointer active:scale-95 animate-pulse'
                    : 'bg-stone-800 text-stone-500 cursor-not-allowed opacity-50'
                }`}
                title={`Diamond Engine: Spend 1 Energy to boost an action card by +${player.minion.equippedPermanent.tierPoints} Universal Value Points`}
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Engine Boost (+{player.minion.equippedPermanent.tierPoints} pts, 1⚡)</span>
              </button>
            )}

            {/* Joker Button */}
            {!player.hasUsedJoker && (
              <button
                disabled={!isMyTurn || player.energy < 2}
                onClick={onTriggerJoker}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md ${
                  isMyTurn && player.energy >= 2
                    ? 'bg-purple-700 hover:bg-purple-600 text-white shadow-purple-900/40 cursor-pointer active:scale-95'
                    : 'bg-stone-800 text-stone-500 cursor-not-allowed opacity-50'
                }`}
                title="Joker costs 2 Energy. Prevents opponent attacks this round! (Once per game)"
              >
                <span>🃏 Play Joker (2⚡)</span>
              </button>
            )}

            {/* End Turn / Resolve Button */}
            <button
              disabled={!isMyTurn}
              onClick={onEndTurn}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg ${
                isMyTurn
                  ? isPlayerSecond
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-emerald-700/40 cursor-pointer active:scale-95 ring-2 ring-emerald-400'
                    : 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 shadow-amber-600/30 cursor-pointer active:scale-95'
                  : 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700'
              }`}
            >
              {isMyTurn ? (
                isPlayerSecond ? (
                  <>
                    <Swords className="w-4 h-4 fill-current" />
                    <span>End Turn & Resolve Combat</span>
                  </>
                ) : (
                  <>
                    <span>End Turn (Pass to Opponent)</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-stone-500" />
                  <span>Waiting for Opponent...</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Turn Help Prompt */}
        <div className="mb-3 px-1 text-xs">
          {isMyTurn ? (
            <p className="text-emerald-300/90 font-medium">
              ⚡ You have <strong className="text-white font-bold">{player.energy}/3 Energy</strong> available.
              You may play <strong className="text-amber-300">multiple cards</strong> matching your {SUIT_NAMES[affinity]} affinity (or 1 non-matching action). Drag cards below or tap them to play!
            </p>
          ) : (
            <p className="text-stone-400 italic">
              Cards in hand are locked while opponent is taking their turn.
            </p>
          )}
        </div>

        {/* Tactical Drag & Drop Play Zones */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Action Card Drop Zone (Horizontal) */}
          <div
            onDragOver={e => handleDragOver(e, 'action')}
            onDragLeave={handleDragLeave}
            onDrop={e => handleDrop(e, 'action')}
            className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed transition-all min-h-[110px] ${
              !isMyTurn
                ? 'border-stone-800 bg-stone-950/30 opacity-50 cursor-not-allowed'
                : dragOverZone === 'action'
                ? 'border-amber-400 bg-amber-950/40 scale-[1.02]'
                : 'border-emerald-700/60 bg-emerald-950/20 hover:border-emerald-500 cursor-pointer'
            }`}
          >
            <Swords className="w-6 h-6 text-amber-400 mb-1" />
            <span className="font-bold text-xs text-amber-200">Play Action (Horizontal)</span>
            <span className="text-[10px] text-stone-400 text-center mt-0.5">
              Drag or select Attack (♠), Block/Heal (♥), Boost (♦), Disruption (♣)
            </span>
          </div>

          {/* Minion Summon / Boost Zone */}
          <div
            onDragOver={e => handleDragOver(e, 'minion')}
            onDragLeave={handleDragLeave}
            onDrop={e => handleDrop(e, 'minion')}
            className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed transition-all min-h-[110px] ${
              !isMyTurn
                ? 'border-stone-800 bg-stone-950/30 opacity-50 cursor-not-allowed'
                : dragOverZone === 'minion'
                ? 'border-blue-400 bg-blue-950/40 scale-[1.02]'
                : 'border-blue-800/60 bg-blue-950/20 hover:border-blue-500 cursor-pointer'
            }`}
          >
            <Shield className="w-6 h-6 text-blue-400 mb-1" />
            <span className="font-bold text-xs text-blue-200">Summon / Boost Minion (1⚡)</span>
            <span className="text-[10px] text-stone-400 text-center mt-0.5">
              Drag an <strong className="text-white">Ace</strong> here (1 HP base, +1 HP with 2nd Ace)
            </span>
          </div>

          {/* Minion Equipment Zone (Vertical Permanent) */}
          <div
            onDragOver={e => handleDragOver(e, 'equipment')}
            onDragLeave={handleDragLeave}
            onDrop={e => handleDrop(e, 'equipment')}
            className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed transition-all min-h-[110px] ${
              !isMyTurn || gameState.roundNumber === 1
                ? 'border-stone-800 bg-stone-950/30 opacity-50 cursor-not-allowed'
                : dragOverZone === 'equipment'
                ? 'border-purple-400 bg-purple-950/40 scale-[1.02]'
                : 'border-purple-800/60 bg-purple-950/20 hover:border-purple-500 cursor-pointer'
            }`}
          >
            <Layers className="w-6 h-6 text-purple-400 mb-1" />
            <span className="font-bold text-xs text-purple-200">
              {gameState.roundNumber === 1 ? 'Equip Locked (Round 1)' : 'Equip Minion Permanent (2⚡)'}
            </span>
            <span className="text-[10px] text-stone-400 text-center mt-0.5">
              {gameState.roundNumber === 1
                ? 'Upgrade cards & equipment permanents unlock starting in Round 2'
                : 'Drag non-face card matching Minion suit (ATK, Shield, Boost, Sabotage)'}
            </span>
          </div>
        </div>

        {/* Selected Card Quick Action Bar (for tap/click without dragging) */}
        {isMyTurn && selectedCardForAction && (
          <div className="mt-3 p-3 bg-stone-900/90 border border-amber-500/60 rounded-xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-300">Selected Card:</span>
              <strong className="text-amber-300 text-sm">{selectedCardForAction.name}</strong>
              <span className="text-xs text-stone-400">
                ({getUniversalPoints(selectedCardForAction)} Pts, {getCardEnergyCost(selectedCardForAction)}⚡)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Play as Action */}
              {(() => {
                const actionCheck = canPlayActionOfSuit(selectedCardForAction, affinity, player.playedActions, gameState.roundNumber);
                const cost = getCardEnergyCost(selectedCardForAction);
                const hasEnergy = player.energy >= cost;
                const canPlayAction = (actionCheck.allowed || selectedCardForAction.isJoker) && hasEnergy;

                let actionLabel = 'Play Action (Horizontal)';
                if (selectedCardForAction.isJoker) {
                  actionLabel = 'Play Joker Aura';
                } else if (selectedCardForAction.suit === 'clubs') {
                  actionLabel = 'Play Disruption / Debuff';
                } else if (selectedCardForAction.suit === 'hearts') {
                  actionLabel = 'Play Block or Heal';
                } else if (selectedCardForAction.suit === 'spades') {
                  actionLabel = 'Play Attack';
                } else if (selectedCardForAction.suit === 'diamonds') {
                  actionLabel = gameState.roundNumber === 1 ? 'Action Boost (Locked Rd 1)' : 'Play Action Boost';
                }

                return (
                  <button
                    disabled={!canPlayAction}
                    onClick={() => executeCardPlay(selectedCardForAction, 'action')}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                      canPlayAction
                        ? 'bg-amber-600 hover:bg-amber-500 text-stone-950 cursor-pointer shadow-md'
                        : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                    }`}
                    title={!hasEnergy ? `Need ${cost} Energy (have ${player.energy}⚡)` : actionCheck.reason}
                  >
                    {actionLabel} {!hasEnergy && `(${cost}⚡)`}
                  </button>
                );
              })()}

              {/* If Ace: Summon or Boost Minion */}
              {selectedCardForAction.rank === 1 && !selectedCardForAction.isJoker && (
                <button
                  disabled={player.energy < 1 || Boolean(player.minion && player.minion.maxHp >= 2)}
                  onClick={() => executeCardPlay(selectedCardForAction, 'minion')}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                    player.energy >= 1 && (!player.minion || player.minion.maxHp < 2)
                      ? 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer shadow-md'
                      : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                  }`}
                >
                  {player.minion ? 'Boost Minion HP to 2 (1⚡)' : 'Summon Minion (1⚡)'}
                </button>
              )}

              {/* If Minion exists: Equip (Explicitly disabled for face cards and Round 1!) */}
              {player.minion && !player.minion.equippedPermanent && (
                gameState.roundNumber === 1 ? (
                  <button
                    disabled
                    className="px-3 py-1.5 rounded-lg bg-stone-800/80 text-stone-500 font-bold text-xs cursor-not-allowed border border-stone-700/60"
                    title="Minion permanent upgrades unlock starting in Round 2"
                  >
                    🚫 Equip Locked (Round 1)
                  </button>
                ) : isFaceCard(selectedCardForAction.rank) ? (
                  <button
                    disabled
                    className="px-3 py-1.5 rounded-lg bg-stone-800/80 text-stone-500 font-bold text-xs cursor-not-allowed border border-stone-700/60"
                    title="Equip minion is disabled for face cards (Numbered 2-10 only)"
                  >
                    🚫 Equip Disabled (Face Card)
                  </button>
                ) : selectedCardForAction.rank !== 1 && !selectedCardForAction.isJoker ? (
                  (() => {
                    const equipCheck = canEquipToMinion(selectedCardForAction, player.minion, player.energy, gameState.roundNumber);
                    return (
                      <button
                        disabled={!equipCheck.allowed}
                        onClick={() => executeCardPlay(selectedCardForAction, 'equipment')}
                        className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                          equipCheck.allowed
                            ? 'bg-purple-600 hover:bg-purple-500 text-white cursor-pointer shadow-md'
                            : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                        }`}
                        title={equipCheck.reason}
                      >
                        Equip to Minion (2⚡)
                      </button>
                    );
                  })()
                ) : null
              )}

              {/* Bank for next round */}
              <button
                disabled={player.energy < 1 && player.bankedCardId !== selectedCardForAction.id && !player.bankedCardId}
                onClick={() => onBankCard(selectedCardForAction.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  player.bankedCardId === selectedCardForAction.id
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-md'
                    : player.energy >= 1 || player.bankedCardId
                    ? 'bg-stone-800 hover:bg-stone-700 text-stone-200 cursor-pointer'
                    : 'bg-stone-800 text-stone-600 cursor-not-allowed'
                }`}
                title={
                  player.bankedCardId === selectedCardForAction.id
                    ? 'Card is banked for next round (1⚡ used). Click to unbank and refund 1⚡.'
                    : player.bankedCardId
                    ? 'Switch banked card (already spent 1⚡)'
                    : player.energy >= 1
                    ? 'Bank this card for next round (costs 1⚡)'
                    : 'Need 1 Energy to bank a card'
                }
              >
                {player.bankedCardId === selectedCardForAction.id
                  ? '✓ Banked (Uses 1⚡ - Click to Unbank)'
                  : player.bankedCardId
                  ? 'Switch Banked Card'
                  : 'Bank for Next Round (1⚡)'}
              </button>

              <button
                onClick={() => setSelectedCardForAction(null)}
                className="text-stone-400 hover:text-white text-xs px-2 py-1 cursor-pointer"
              >
                Deselect
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ================= PLAYER ZONE ================= */}
      <div className="relative rounded-2xl bg-gradient-to-b from-stone-900/90 to-stone-950/90 border border-stone-800 p-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-stone-800/80 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-stone-200 text-sm">{player.name} (You)</span>
            {affinity && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                {SUIT_SYMBOLS[affinity]} {SUIT_NAMES[affinity]} Affinity (Multiple Plays Allowed)
              </span>
            )}
            {isPlayerSecond ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                2nd Initiative (Responds)
              </span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40">
                1st Initiative (Plays First)
              </span>
            )}
            {isMyTurn && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse font-bold">
                ✓ Your Turn Now
              </span>
            )}
          </div>

          {/* Player Energy Crystals */}
          <div className="flex items-center gap-2">
            <span className="text-stone-300 font-bold">Energy:</span>
            <span className="text-xs font-mono font-black text-white">{player.energy}/3</span>
            {player.bankedCardId && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 shadow-sm flex items-center gap-1"
                title="1 Energy is currently reserved to bank 1 card into next round"
              >
                ⚡ 1 Banked
              </span>
            )}
            <div className="flex items-center gap-1.5">
              {[...Array(player.maxEnergy || 3)].map((_, i) => {
                const isBankedSlot = Boolean(player.bankedCardId) && i === player.energy;
                return (
                  <div
                    key={i}
                    className={`w-5 h-5 rounded-full border shadow-md transition-all flex items-center justify-center ${
                      i < player.energy
                        ? 'bg-blue-500 border-blue-300 text-white shadow-blue-500/60 scale-105'
                        : isBankedSlot
                        ? 'bg-emerald-700 border-emerald-400 text-emerald-200 shadow-emerald-500/40 ring-1 ring-emerald-400/50 scale-105'
                        : 'bg-stone-800 border-stone-700 opacity-40'
                    }`}
                    title={isBankedSlot ? '1 Energy reserved for banked card' : undefined}
                  >
                    <span className="text-[10px] font-bold">⚡</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Player Table: Fighter, Minion, Played Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 pt-3 items-stretch">
          {/* Player Fighter Slot */}
          <div className="flex flex-col items-center p-3 rounded-xl bg-stone-950/60 border border-stone-800/80 justify-center">
            <div className="flex items-center gap-1.5 text-xs text-stone-400 font-bold mb-2">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>Your Champion Fighter</span>
            </div>

            {player.fighter && (
              <div className="relative">
                <CardView
                  card={player.fighter.card}
                  hp={player.fighter.hp}
                  maxHp={player.fighter.maxHp}
                  size="md"
                />
              </div>
            )}
          </div>

          {/* Player Minion Slot */}
          <div className="flex flex-col items-center p-3 rounded-xl bg-stone-950/60 border border-stone-800/80">
            <div className="flex items-center gap-1.5 text-xs text-stone-400 font-bold mb-2">
              <Shield className="w-3.5 h-3.5 text-blue-400" />
              <span>Your Active Minion</span>
            </div>

            {player.minion ? (
              <div className="flex items-center gap-2">
                <div className="relative">
                  {player.minion.boostAceCard && (
                    <div className="absolute -bottom-2 -right-2 opacity-80 z-0">
                      <CardView card={player.minion.boostAceCard} size="sm" />
                    </div>
                  )}
                  <CardView
                    card={player.minion.aceCard}
                    hp={player.minion.hp}
                    maxHp={player.minion.maxHp}
                    size="md"
                  />
                </div>

                {player.minion.equippedPermanent ? (
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] text-amber-300 font-bold mb-0.5">Equipped Permanent</span>
                    <CardView card={player.minion.equippedPermanent.card} size="sm" />
                    
                    {/* Status Badge according to suit */}
                    <div className="mt-1 flex flex-col items-center gap-1">
                      {player.minion.equippedPermanent.suit === 'spades' && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-slate-900 border border-slate-700 text-slate-200 text-center">
                          ⚔️ +{player.minion.equippedPermanent.tierPoints} Atk on Spades
                        </span>
                      )}
                      {player.minion.equippedPermanent.suit === 'hearts' && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-rose-950/80 border border-rose-600/50 text-rose-300 text-center">
                          🛡️ +{player.minion.equippedPermanent.tierPoints} Passive Shield
                        </span>
                      )}
                      {player.minion.equippedPermanent.suit === 'clubs' && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-emerald-950/80 border border-emerald-600/50 text-emerald-300 text-center">
                          ✂️ -{player.minion.equippedPermanent.tierPoints} Sabotage
                        </span>
                      )}

                      {/* Diamond Permanent Engine: Interactive Action Boost */}
                      {player.minion.equippedPermanent.suit === 'diamonds' && (
                        <div className="flex flex-col items-center gap-0.5">
                          {isMyTurn && onActivateMinionDiamond ? (
                            <button
                              disabled={player.energy < 1}
                              onClick={() => {
                                const eligible = player.playedActions.filter(
                                  a => a.heartDeclaration !== 'heal' && !a.isJokerAction
                                );
                                if (eligible.length === 0) {
                                  alert(
                                    'Play an action card first (Attack, Block, Debuff), then activate your Diamond Engine to boost it by +' +
                                      player.minion?.equippedPermanent?.tierPoints +
                                      ' points for 1 Energy!'
                                  );
                                } else if (eligible.length === 1) {
                                  onActivateMinionDiamond(eligible[0].id);
                                } else {
                                  setShowDiamondEnginePicker(true);
                                }
                              }}
                              className={`text-[10px] px-2.5 py-1 rounded-xl font-black border transition-all flex items-center gap-1 ${
                                player.energy >= 1
                                  ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 border-amber-300 shadow-md shadow-amber-500/20 cursor-pointer active:scale-95 animate-pulse'
                                  : 'bg-stone-800 border-stone-700 text-stone-500 cursor-not-allowed'
                              }`}
                              title={`Spend 1 Energy to boost an action card by +${player.minion.equippedPermanent.tierPoints} points`}
                            >
                              <Zap className="w-3 h-3 fill-current" />
                              <span>Use Engine (1⚡)</span>
                            </button>
                          ) : (
                            <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-amber-950/50 border border-amber-700/50 text-amber-400 text-center">
                              ⚡ Engine (+{player.minion.equippedPermanent.tierPoints} pts, 1⚡)
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div
                    onDragOver={e => handleDragOver(e, 'equipment')}
                    onDragLeave={handleDragLeave}
                    onDrop={e => handleDrop(e, 'equipment')}
                    onClick={() => {
                      if (selectedCardForAction) {
                        executeCardPlay(selectedCardForAction, 'equipment');
                      }
                    }}
                    className={`w-16 h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-[10px] text-center p-1 transition-all ${
                      dragOverZone === 'equipment'
                        ? 'border-purple-400 bg-purple-950/60 text-purple-200 scale-105'
                        : 'border-purple-800/60 bg-purple-950/20 text-purple-300 hover:border-purple-500 cursor-pointer'
                    }`}
                    title="Drag or click with card selected to equip (2⚡)"
                  >
                    <Layers className="w-4 h-4 mb-0.5 text-purple-400" />
                    <span>Equip Slot (2⚡)</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-24 h-36 border-2 border-dashed border-stone-800 rounded-xl flex items-center justify-center text-stone-600 text-xs text-center p-2">
                Play an Ace to Summon Minion
              </div>
            )}
          </div>

          {/* Player Played Actions Slot with Telemetry Breakdown */}
          <div className="flex flex-col p-3 rounded-xl bg-stone-950/70 border border-stone-800/90 min-h-[170px]">
            {/* Header: Title + Real-Time Stat Pills */}
            <div className="flex flex-wrap items-center justify-between gap-1.5 pb-2 border-b border-stone-800/80 mb-2">
              <div className="flex items-center gap-1.5 text-xs text-stone-200 font-bold">
                <Swords className="w-3.5 h-3.5 text-amber-400" />
                <span>Your Placed Actions ({player.playedActions.length})</span>
              </div>

              {/* Total Attack, Block, Debuff, Heal Badges */}
              <div className="flex flex-wrap items-center gap-1 text-[10px]">
                {/* Attack Badge */}
                <div
                  className={`px-2 py-0.5 rounded-full font-black border flex items-center gap-1 ${
                    isPlayerAttackNegatedByOpponentJoker
                      ? 'bg-purple-950/70 border-purple-500/50 text-purple-300 line-through'
                      : 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                  }`}
                  title={
                    isPlayerAttackNegatedByOpponentJoker
                      ? 'Your attack is negated by opponent Joker!'
                      : `Total Attack: ${totalPlayerAttack} (${playerRawAttackPoints} from Spades + ${playerMinionAttackBonus} Minion bonus)`
                  }
                >
                  ⚔️ {totalPlayerAttack} Atk
                  {isPlayerAttackNegatedByOpponentJoker && <span className="text-[9px] no-underline">🚫 Joker</span>}
                </div>

                {/* Defense Badge */}
                <div
                  className="px-2 py-0.5 rounded-full font-black bg-blue-500/20 border border-blue-500/50 text-blue-300 flex items-center gap-1"
                  title={`Total Defense: ${totalPlayerBlock} (${playerBlockPoints} declared Block + ${playerMinionPassiveShield} Minion passive Shield)`}
                >
                  🛡️ {totalPlayerBlock} Def
                  {playerMinionPassiveShield > 0 && (
                    <span className="text-[9px] text-blue-400">(+{playerMinionPassiveShield}s)</span>
                  )}
                </div>

                {/* Debuff Badge */}
                <div
                  className={`px-2 py-0.5 rounded-full font-black border flex items-center gap-1 ${
                    playerDebuffPoints > 0
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                      : 'bg-stone-800/60 border-stone-700/60 text-stone-400'
                  }`}
                  title={`Total Debuff: -${playerDebuffPoints} points applied against opponent actions`}
                >
                  ✂️ -{playerDebuffPoints} Debuff
                </div>

                {/* Heal Badge */}
                {playerHealPoints > 0 && (
                  <div
                    className="px-2 py-0.5 rounded-full font-black bg-pink-500/20 border border-pink-500/50 text-pink-300"
                    title={`Healing Declared: +${playerHealPoints} HP will be restored to your damaged Champion`}
                  >
                    ❤️ +{playerHealPoints} Heal
                  </div>
                )}
              </div>
            </div>

            {/* Active Card & Minion Effects Strip */}
            {playerSpecialEffects.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2.5 max-h-24 overflow-y-auto pr-1">
                {playerSpecialEffects.map((effect, idx) => (
                  <span
                    key={idx}
                    className="text-[9px] px-2 py-0.5 rounded-md bg-stone-900 border border-stone-700/80 text-stone-300 font-medium"
                  >
                    {effect}
                  </span>
                ))}
              </div>
            )}

            {/* Cards List */}
            {player.playedActions.length === 0 ? (
              <div className="text-stone-500 text-xs italic my-auto text-center py-4">
                {isMyTurn ? 'No actions placed yet. Drag cards or tap below to play!' : 'Waiting for your turn...'}
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-2 my-auto overflow-x-auto max-w-full p-1 scrollbar-thin">
                {player.playedActions.map(action => (
                  <div key={action.id} className="relative group shrink-0 flex flex-col items-center">
                    <CardView
                      card={action.card}
                      orientation="horizontal"
                      size="sm"
                      customBadge={
                        action.heartDeclaration
                          ? action.heartDeclaration.toUpperCase()
                          : action.clubSpecial?.type === 'jack' || action.clubSpecial?.type === 'queen'
                          ? 'DISCARD'
                          : action.clubSpecial?.type === 'king'
                          ? 'HEIST'
                          : action.card.suit === 'diamonds' && !action.isJokerAction
                          ? action.targetActionId
                            ? '⚡ BOOSTED'
                            : '⚡ TARGET'
                          : `${action.finalPoints} PTS`
                      }
                    />

                    {/* Choose Target Button for Unassigned Played/Stolen Diamond Card */}
                    {action.card.suit === 'diamonds' &&
                      !action.isJokerAction &&
                      !action.targetActionId &&
                      isMyTurn && (
                        <button
                          onClick={() => onRequestDiamondTarget(action.card)}
                          className="mt-1 text-[9px] px-2 py-0.5 rounded-md font-black bg-amber-500 hover:bg-amber-400 text-stone-950 flex items-center gap-0.5 transition-all shadow-md animate-pulse ring-1 ring-amber-300 cursor-pointer active:scale-95"
                          title={`Click to choose which action card receives this +${action.finalPoints} Diamond boost`}
                        >
                          <Zap className="w-2.5 h-2.5 fill-current" />
                          <span>Choose Target (+{action.finalPoints})</span>
                        </button>
                      )}

                    {/* Direct 1-Click Diamond Engine Booster Button (Numbered cards only, Face cards cannot be upgraded) */}
                    {player.minion?.equippedPermanent?.suit === 'diamonds' &&
                      isMyTurn &&
                      action.heartDeclaration !== 'heal' &&
                      !action.isJokerAction &&
                      action.card.suit !== 'diamonds' &&
                      !isFaceCard(action.card.rank) && (
                        <button
                          disabled={player.energy < 1}
                          onClick={() => onActivateMinionDiamond?.(action.id)}
                          className={`mt-1 text-[9px] px-2 py-0.5 rounded-md font-black flex items-center gap-0.5 transition-all shadow-sm ${
                            player.energy >= 1
                              ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 cursor-pointer active:scale-95 animate-pulse ring-1 ring-amber-300'
                              : 'bg-stone-800 text-stone-600 cursor-not-allowed'
                          }`}
                          title={`Spend 1 Energy to boost this action by +${player.minion.equippedPermanent.tierPoints} Universal Value Points (Face cards cannot be upgraded)`}
                        >
                          <Zap className="w-2.5 h-2.5 fill-current" />
                          <span>+{player.minion.equippedPermanent.tierPoints} Boost (1⚡)</span>
                        </button>
                      )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Player Hand Tray */}
        <div className="mt-4 pt-3 border-t border-stone-800/80">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-400">
                Your Private Hand ({player.hand.length} cards)
              </span>
              {isMyTurn ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                  Ready to Play
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-800 text-stone-400 font-semibold">
                  Locked (Waiting)
                </span>
              )}
            </div>
            <span className="text-[11px] text-stone-400">
              {isMyTurn
                ? 'Drag cards to drop zones or tap cards to play'
                : 'Cards will unlock when your turn starts'}
            </span>
          </div>

          <div
            className={`flex flex-wrap items-center justify-center gap-2 sm:gap-3 min-h-[140px] p-2 sm:p-3 rounded-2xl border overflow-x-auto scrollbar-thin transition-all ${
              isMyTurn
                ? 'bg-stone-950/60 border-stone-800 ring-1 ring-emerald-500/20'
                : 'bg-stone-950/30 border-stone-800/50 opacity-80'
            }`}
          >
            {player.hand.length === 0 ? (
              <div className="text-stone-500 italic text-xs">Hand is empty!</div>
            ) : (
              player.hand.map(card => {
                const isSelected = selectedCardForAction?.id === card.id;
                const isBanked = player.bankedCardId === card.id;
                const energyCost = getCardEnergyCost(card);
                // If this card is currently banked, playing it frees its 1 reserved energy
                const effectiveEnergy = isBanked ? player.energy + 1 : player.energy;
                const hasEnoughEnergy = effectiveEnergy >= energyCost;

                // Card is same suit as an already-played action card, but is NOT the fighter's suit:
                const isSameSuitAsPlayedNonAffinity =
                  !card.isJoker && card.suit !== affinity && playedNonAffinitySuits.has(card.suit);

                // Minion summon/boost check for Ace
                const canSummonMinionWithAce =
                  card.rank === 1 &&
                  !card.isJoker &&
                  effectiveEnergy >= 1 &&
                  (!player.minion || player.minion.maxHp === 1);

                // Equipment check (numbered 2-10 cards matching minion suit)
                const canEquipMinion = canEquipToMinion(card, player.minion, effectiveEnergy).allowed;

                // Action play check
                const canPlayAsAction =
                  hasEnoughEnergy && (!isSameSuitAsPlayedNonAffinity || card.isJoker || card.suit === affinity);

                // Can bank check (requires 1 Energy, or is already banked, or switching from another banked card)
                const canBank = player.energy >= 1 || Boolean(player.bankedCardId);

                // A card is active and interactable if it can be played as an action, summoned as minion, equipped, or banked
                const isCardActive =
                  isMyTurn && (canPlayAsAction || canSummonMinionWithAce || canEquipMinion || canBank);

                // The card is draggable if it can be dropped into any drop zone
                const isDraggable =
                  isMyTurn && (canPlayAsAction || canSummonMinionWithAce || canEquipMinion);

                let customBadge: string | undefined = undefined;
                if (isBanked) {
                  customBadge = 'BANKED (1⚡)';
                } else if (isSameSuitAsPlayedNonAffinity && !canEquipMinion && !canSummonMinionWithAce) {
                  customBadge = 'SUIT PLAYED';
                } else if (!hasEnoughEnergy && !canSummonMinionWithAce && !canEquipMinion) {
                  customBadge = `NEED ${energyCost}⚡`;
                }

                return (
                  <div
                    key={card.id}
                    className={`relative transition-all duration-300 ${
                      !isMyTurn ? 'opacity-70' : ''
                    }`}
                  >
                    <CardView
                      card={card}
                      size="md"
                      isDraggable={isDraggable}
                      isPlayable={isCardActive}
                      isSelected={isSelected}
                      onClick={() => handleCardClick(card)}
                      customBadge={customBadge}
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Diamond Engine Target Selection Modal */}
      {showDiamondEnginePicker && player.minion?.equippedPermanent?.suit === 'diamonds' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-stone-900 border-2 border-amber-500 rounded-3xl p-5 sm:p-6 shadow-2xl max-w-lg w-full text-stone-100 flex flex-col items-center">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-xl bg-amber-950 border border-amber-500/50 text-amber-400">
                <Zap className="w-6 h-6 fill-current" />
              </div>
              <div>
                <h3 className="text-lg font-serif font-black text-amber-300">
                  Activate Diamond Engine Booster (1⚡)
                </h3>
                <p className="text-[11px] text-stone-400">
                  Select which played action to boost by +{player.minion.equippedPermanent.tierPoints} Universal Value Points
                </p>
              </div>
            </div>

            <div className="w-full my-4 flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
              {player.playedActions
                .filter(a => a.heartDeclaration !== 'heal' && !a.isJokerAction)
                .map(action => (
                  <button
                    key={action.id}
                    onClick={() => {
                      if (onActivateMinionDiamond) {
                        onActivateMinionDiamond(action.id);
                      }
                      setShowDiamondEnginePicker(false);
                    }}
                    className="flex items-center justify-between p-3 rounded-2xl bg-stone-950 border border-amber-500/40 hover:bg-amber-950/60 hover:border-amber-400 text-stone-200 cursor-pointer text-xs transition-all active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">
                        {action.card.suit === 'spades' ? '⚔️' : action.card.suit === 'hearts' ? '🛡️' : '✂️'}
                      </span>
                      <div className="text-left">
                        <div className="font-bold text-amber-300">{action.card.name}</div>
                        <div className="text-[10px] text-stone-400 capitalize">
                          {action.card.suit} {action.heartDeclaration ? `(${action.heartDeclaration})` : 'Action'}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-stone-300">
                        <span className="font-bold">{action.finalPoints} pts</span>
                        <span className="text-stone-500 mx-1">→</span>
                        <strong className="text-amber-300 font-bold text-sm">
                          {action.finalPoints + (player.minion?.equippedPermanent?.tierPoints || 0)} pts
                        </strong>
                      </div>
                      <span className="text-[10px] text-amber-400 font-semibold">
                        Click to Boost (+{player.minion?.equippedPermanent?.tierPoints} pts)
                      </span>
                    </div>
                  </button>
                ))}
            </div>

            <button
              onClick={() => setShowDiamondEnginePicker(false)}
              className="px-5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-bold cursor-pointer transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
