import { Card, GameState, HeartDeclaration, PlayedActionCard, PlayerState } from '../types/game';
import {
  canEquipToMinion,
  canPlayActionOfSuit,
  getCardEnergyCost,
  getFighterMaxHealth,
  getUniversalPoints,
  isFaceCard,
  SUIT_NAMES,
} from '../utils/cardUtils';

export class AIPlayerService {
  /**
   * AI decides whether to mulligan.
   * Strategically evaluates hand quality:
   * - Does hand have high-HP Face Cards (J, Q, K)?
   * - Does hand have Aces (Minion summons)?
   * - Does hand have high suit concentration (3+ cards of same suit for Affinity)?
   * - Does hand have Joker?
   */
  public decideMulligan(player: PlayerState): { shouldMulligan: boolean; cardToBottom?: Card } {
    if (player.mulliganCount >= 2) {
      return { shouldMulligan: false };
    }

    const hasFaceCard = player.hand.some(c => isFaceCard(c.rank));
    const hasAce = player.hand.some(c => c.rank === 1);
    const hasJoker = player.hand.some(c => c.isJoker);

    const suitCounts: Record<string, number> = {};
    player.hand.forEach(c => {
      if (c.suit !== 'joker') {
        suitCounts[c.suit] = (suitCounts[c.suit] || 0) + 1;
      }
    });

    const maxSuitSynergy = Math.max(...Object.values(suitCounts), 0);

    // Keep if we have strong synergy: (Face Card + 2 matching suit, or Ace + 3 matching suit, or Joker + synergy)
    const isStrongHand =
      (hasFaceCard && maxSuitSynergy >= 2) ||
      (hasAce && maxSuitSynergy >= 3) ||
      maxSuitSynergy >= 4 ||
      (hasJoker && maxSuitSynergy >= 3);

    if (!isStrongHand && player.mulliganCount < 2) {
      // Find the card with lowest utility to place on bottom
      const sorted = [...player.hand].sort((a, b) => {
        // Keep Aces and Jokers
        if (a.rank === 1 || a.isJoker) return 1;
        if (b.rank === 1 || b.isJoker) return -1;
        // Keep highest suit synergy
        const countA = suitCounts[a.suit] || 0;
        const countB = suitCounts[b.suit] || 0;
        if (countA !== countB) return countA - countB;
        // Keep higher universal points
        return getUniversalPoints(a) - getUniversalPoints(b);
      });

      return { shouldMulligan: true, cardToBottom: sorted[0] };
    }

    return { shouldMulligan: false };
  }

  /**
   * AI selects its starting Champion Fighter from hand.
   * Deep strategy:
   * 1. Evaluates suit synergy: having multiple cards matching the Fighter's suit is critical
   *    because the player can play unlimited cards of that suit per round!
   * 2. Evaluates starting Health: Face Cards start with 4 HP (25% more durability than numbered cards).
   * 3. Evaluates Round 1 Initiative: high cards (King=13, Queen=12) give Second-player initiative (counter-play advantage).
   */
  public selectFighter(hand: Card[]): Card {
    const suitCounts: Record<string, number> = {};
    hand.forEach(c => {
      if (c.suit !== 'joker') {
        suitCounts[c.suit] = (suitCounts[c.suit] || 0) + 1;
      }
    });

    const scored = hand
      .filter(c => !c.isJoker)
      .map(card => {
        const hp = getFighterMaxHealth(card.rank);
        const matchingCardsInHand = (suitCounts[card.suit] || 1) - 1;
        const rankValue = typeof card.rank === 'number' ? card.rank : 0;

        let score = 0;
        // Base durability
        score += hp * 20;

        // Affinity synergy (huge multiplier for multiple playable cards in hand)
        score += matchingCardsInHand * 16;

        // Initiative advantage (Kings and Queens go second, granting reaction advantage)
        score += rankValue * 1.5;

        // Face card prestige
        if (isFaceCard(card.rank)) {
          score += 15;
        }

        // Slight preference for Spades (attack) or Hearts (sustain) if tied
        if (card.suit === 'spades' || card.suit === 'hearts') {
          score += 3;
        }

        return { card, score };
      });

    scored.sort((a, b) => b.score - a.score);
    return scored[0]?.card || hand[0];
  }

  /**
   * Master Tactical Engine: Plans and executes round actions with full situational awareness.
   */
  public planRoundActions(
    aiState: PlayerState,
    opponentState: PlayerState,
    onPlayAction: (action: Omit<PlayedActionCard, 'id' | 'basePoints' | 'boostedPoints' | 'debuffedPoints' | 'finalPoints'>) => void,
    onSummonMinion: (aceCard: Card) => void,
    onBoostMinion: (aceCard: Card) => void,
    onEquipMinion: (card: Card) => void,
    onBankCard: (cardId: string) => void,
    onReady: () => void,
    roundNumber = 1,
    onActivateMinionDiamond?: (targetActionId: string) => void
  ) {
    let currentEnergy = aiState.energy;
    let hand = [...aiState.hand];
    let playedActions: PlayedActionCard[] = [...aiState.playedActions];
    const affinity = aiState.fighter?.affinity || 'spades';

    const isAiGoingSecond = opponentState.playedActions.length > 0;

    // -------------------------------------------------------------
    // TACTICAL INTELLIGENCE: CALCULATE OPPONENT THREATS & DEFENSES
    // -------------------------------------------------------------
    let incomingOpponentAttack = 0;
    let opponentPassiveShield = 0;
    let opponentTemporaryBlocks = 0;

    // Fighter passives
    if (opponentState.fighter?.affinity === 'spades') {
      incomingOpponentAttack += 1;
    }
    if (opponentState.fighter?.affinity === 'hearts') {
      opponentPassiveShield += 1;
    }

    if (opponentState.minion?.equippedPermanent?.suit === 'hearts') {
      opponentPassiveShield += opponentState.minion.equippedPermanent.tierPoints;
    }

    opponentState.playedActions.forEach(a => {
      if (a.card.suit === 'spades' && !a.isJokerAction) {
        incomingOpponentAttack += a.finalPoints;
      }
      if (a.card.suit === 'hearts' && a.heartDeclaration === 'block') {
        opponentTemporaryBlocks += a.finalPoints;
      }
    });

    if (incomingOpponentAttack > 0 && opponentState.minion?.equippedPermanent?.suit === 'spades') {
      incomingOpponentAttack += opponentState.minion.equippedPermanent.tierPoints;
    }

    const totalOpponentDefense = opponentPassiveShield + opponentTemporaryBlocks;
    const opponentEffectiveHp = (opponentState.minion?.hp || 0) + (opponentState.fighter?.hp || 3);
    const aiTotalHp = (aiState.minion?.hp || 0) + (aiState.fighter?.hp || 3);

    // AI's own passive defense
    let aiPassiveShield = aiState.fighter?.affinity === 'hearts' ? 1 : 0;
    if (aiState.minion?.equippedPermanent?.suit === 'hearts') {
      aiPassiveShield += aiState.minion.equippedPermanent.tierPoints;
    }

    // -------------------------------------------------------------
    // PRIORITY 1: JOKER ENERGY EXPANSION (0 ENERGY, 4 MAX ENERGY)
    // -------------------------------------------------------------
    // If AI has Joker in hand and multiple playable cards that would benefit from 4 max energy, play Joker!
    const jokerCard = hand.find(c => c.isJoker);
    const nonJokerPlayableCards = hand.filter(c => !c.isJoker);

    if (jokerCard && !aiState.hasUsedJoker && nonJokerPlayableCards.length >= 2) {
      onPlayAction({
        card: jokerCard,
        orientation: 'horizontal',
        energyCost: 0,
        isJokerAction: true,
      });
      const jIdx = hand.findIndex(c => c.id === jokerCard.id);
      if (jIdx >= 0) hand.splice(jIdx, 1);
      currentEnergy += 1;
    }

    // -------------------------------------------------------------
    // PRIORITY 2: LETHAL CHECK (ALL-IN FINISHER)
    // -------------------------------------------------------------
    // Calculate if AI has enough Attack points to eliminate opponent right now!
    const spadeCardsInHand = hand.filter(c => c.suit === 'spades' && !c.isJoker);
    const diamondCardsInHand = hand.filter(c => c.suit === 'diamonds' && !c.isJoker);

    let potentialAttackPoints = 0;
    let attackEnergyNeeded = 0;
    const potentialAttackCards: Card[] = [];

    // Check spade cards that are playable within suit rules
    for (const spade of spadeCardsInHand) {
      const cost = getCardEnergyCost(spade);
      if (attackEnergyNeeded + cost <= currentEnergy) {
        const check = canPlayActionOfSuit(spade, affinity, [
          ...playedActions,
          ...potentialAttackCards.map(c => ({
            id: '',
            card: c,
            orientation: 'horizontal' as const,
            energyCost: getCardEnergyCost(c),
            basePoints: getUniversalPoints(c),
            boostedPoints: 0,
            debuffedPoints: 0,
            finalPoints: getUniversalPoints(c),
          })),
        ]);
        if (check.allowed) {
          potentialAttackCards.push(spade);
          attackEnergyNeeded += cost;
          potentialAttackPoints += getUniversalPoints(spade);
        }
      }
    }

    const upgradeableAttack = potentialAttackCards.find(c => !isFaceCard(c.rank));

    // Inherent Spades Fighter passive (+1 Attack damage)
    if (aiState.fighter?.affinity === 'spades') {
      potentialAttackPoints += 1;
    }

    // Inherent Diamonds Fighter passive (+1 to chosen attack)
    if (aiState.fighter?.affinity === 'diamonds' && upgradeableAttack) {
      potentialAttackPoints += 1;
    }

    // Passive spade equipment boost
    if (potentialAttackCards.length > 0 && aiState.minion?.equippedPermanent?.suit === 'spades') {
      potentialAttackPoints += aiState.minion.equippedPermanent.tierPoints;
    }

    // Check if Diamond overcharge can push over the finish line (only if round > 1 and there is a non-face attack)
    let diamondBoostCard: Card | null = null;
    if (roundNumber > 1 && upgradeableAttack && currentEnergy - attackEnergyNeeded >= 1) {
      for (const d of diamondCardsInHand) {
        const cost = getCardEnergyCost(d);
        if (attackEnergyNeeded + cost <= currentEnergy) {
          diamondBoostCard = d;
          potentialAttackPoints += getUniversalPoints(d);
          attackEnergyNeeded += cost;
          break;
        }
      }
    }

    const netLethalDamage = Math.max(0, potentialAttackPoints - totalOpponentDefense);
    const isLethalPossible = netLethalDamage >= opponentEffectiveHp;

    if (isLethalPossible && potentialAttackCards.length > 0) {
      // Execute Lethal Attacks!
      for (const attackCard of potentialAttackCards) {
        const cost = getCardEnergyCost(attackCard);
        onPlayAction({
          card: attackCard,
          orientation: 'horizontal',
          energyCost: cost,
        });
        const idx = hand.findIndex(c => c.id === attackCard.id);
        if (idx >= 0) hand.splice(idx, 1);
        currentEnergy -= cost;
      }

      // If Diamond boost needed, apply it to the upgradeable attack
      if (diamondBoostCard && upgradeableAttack) {
        const dCost = getCardEnergyCost(diamondBoostCard);
        onPlayAction({
          card: diamondBoostCard,
          orientation: 'horizontal',
          energyCost: dCost,
          targetActionId: upgradeableAttack.id,
        });
        const dIdx = hand.findIndex(c => c.id === diamondBoostCard.id);
        if (dIdx >= 0) hand.splice(dIdx, 1);
        currentEnergy -= dCost;
      }

      // Finish turn immediately
      setTimeout(() => onReady(), 400);
      return;
    }

    // -------------------------------------------------------------
    // PRIORITY 3: MINION BOARD CONTROL (DEFENSIVE MEAT SHIELD)
    // -------------------------------------------------------------
    // Summon Minion with Ace if unsummoned (costs 1 Energy)
    if (!aiState.minion && currentEnergy >= 1) {
      const aceIndex = hand.findIndex(c => c.rank === 1 && !c.isJoker);
      if (aceIndex >= 0) {
        const aceCard = hand[aceIndex];
        onSummonMinion(aceCard);
        hand.splice(aceIndex, 1);
        currentEnergy -= 1;
      }
    } else if (aiState.minion && aiState.minion.maxHp === 1 && currentEnergy >= 1) {
      // Boost Minion with 2nd Ace if available
      const aceIndex = hand.findIndex(c => c.rank === 1 && !c.isJoker);
      if (aceIndex >= 0) {
        const aceCard = hand[aceIndex];
        onBoostMinion(aceCard);
        hand.splice(aceIndex, 1);
        currentEnergy -= 1;
      }
    }

    // Equip Minion Permanent (costs 2 Energy, only from Round 2 onwards)
    // Matching suit only, numbered cards (2-10). Gives massive continuous value!
    if (aiState.minion && !aiState.minion.equippedPermanent && currentEnergy >= 2 && roundNumber > 1) {
      const equipableIndex = hand.findIndex(c => {
        return canEquipToMinion(c, aiState.minion, currentEnergy, roundNumber).allowed;
      });
      if (equipableIndex >= 0) {
        const equipCard = hand[equipableIndex];
        onEquipMinion(equipCard);
        hand.splice(equipableIndex, 1);
        currentEnergy -= 2;
      }
    }

    // -------------------------------------------------------------
    // PRIORITY 4: COUNTER-PLAY DISRUPTIONS & BLOCKS (WHEN GOING SECOND)
    // -------------------------------------------------------------
    if (isAiGoingSecond && currentEnergy > 0) {
      // 1. Club Sabotage: Can we destroy opponent's equipped permanent or debuff heavy attacks?
      const clubCardsInHand = hand.filter(c => c.suit === 'clubs' && !c.isJoker);
      for (const club of clubCardsInHand) {
        const cost = getCardEnergyCost(club);
        if (cost <= currentEnergy) {
          const check = canPlayActionOfSuit(club, affinity, playedActions);
          if (check.allowed) {
            const clubPoints = getUniversalPoints(club);

            // Destroy equipment priority
            if (
              opponentState.minion?.equippedPermanent &&
              clubPoints >= opponentState.minion.equippedPermanent.tierPoints
            ) {
              onPlayAction({
                card: club,
                orientation: 'horizontal',
                energyCost: cost,
              });
              const idx = hand.findIndex(c => c.id === club.id);
              if (idx >= 0) hand.splice(idx, 1);
              currentEnergy -= cost;
              break;
            }

            // Or debuff opponent's strongest attack
            const heavyOpponentAttack = opponentState.playedActions.find(
              a => a.card.suit === 'spades' && a.finalPoints >= 2
            );
            if (heavyOpponentAttack) {
              onPlayAction({
                card: club,
                orientation: 'horizontal',
                energyCost: cost,
                targetActionId: heavyOpponentAttack.id,
              });
              const idx = hand.findIndex(c => c.id === club.id);
              if (idx >= 0) hand.splice(idx, 1);
              currentEnergy -= cost;
              incomingOpponentAttack = Math.max(0, incomingOpponentAttack - clubPoints);
              break;
            }

            // Jack of clubs: inspect hand & discard highest value card
            if (club.rank === 11 && opponentState.hand.length > 0 && currentEnergy >= 2) {
              const sortedOppHand = [...opponentState.hand].sort(
                (a, b) => getUniversalPoints(b) - getUniversalPoints(a)
              );
              const targetCard = sortedOppHand[0];
              onPlayAction({
                card: club,
                orientation: 'horizontal',
                energyCost: 2,
                clubSpecial: { type: 'jack', targetCardId: targetCard.id },
              });
              const idx = hand.findIndex(c => c.id === club.id);
              if (idx >= 0) hand.splice(idx, 1);
              currentEnergy -= 2;
              break;
            }

            // Queen of clubs: targeted discard
            if (club.rank === 12 && opponentState.hand.length > 0 && currentEnergy >= 2) {
              // Discard opponent's highest value card
              const sortedOppHand = [...opponentState.hand].sort(
                (a, b) => getUniversalPoints(b) - getUniversalPoints(a)
              );
              const targetCard = sortedOppHand[0];
              onPlayAction({
                card: club,
                orientation: 'horizontal',
                energyCost: 2,
                clubSpecial: { type: 'queen', targetCardId: targetCard.id },
              });
              const idx = hand.findIndex(c => c.id === club.id);
              if (idx >= 0) hand.splice(idx, 1);
              currentEnergy -= 2;
              break;
            }

            // King of clubs: Grand Heist (steal & play opponent's highest value card, costs 2 Energy)
            if (club.rank === 13 && opponentState.hand.length > 0 && currentEnergy >= 2) {
              const sortedOppHand = [...opponentState.hand].sort(
                (a, b) => getUniversalPoints(b) - getUniversalPoints(a)
              );
              const targetCard = sortedOppHand[0];
              onPlayAction({
                card: club,
                orientation: 'horizontal',
                energyCost: 2,
                clubSpecial: { type: 'king', targetCardId: targetCard.id, stolenCard: targetCard },
              });
              const idx = hand.findIndex(c => c.id === club.id);
              if (idx >= 0) hand.splice(idx, 1);
              currentEnergy -= 2;
              break;
            }
          }
        }
      }

      // 2. Heart Block: If incoming damage will hurt Minion/Fighter, declare BLOCK
      const unabsorbedDamage = Math.max(0, incomingOpponentAttack - aiPassiveShield);
      if (unabsorbedDamage > 0 && currentEnergy > 0) {
        const heartCards = hand.filter(c => c.suit === 'hearts' && !c.isJoker);
        for (const heart of heartCards) {
          const cost = getCardEnergyCost(heart);
          if (cost <= currentEnergy) {
            const check = canPlayActionOfSuit(heart, affinity, playedActions);
            if (check.allowed) {
              onPlayAction({
                card: heart,
                orientation: 'horizontal',
                energyCost: cost,
                heartDeclaration: 'block',
              });
              const idx = hand.findIndex(c => c.id === heart.id);
              if (idx >= 0) hand.splice(idx, 1);
              currentEnergy -= cost;
              break;
            }
          }
        }
      }
    }

    // -------------------------------------------------------------
    // PRIORITY 5: HEALING (RESTORING DAMAGED FIGHTER)
    // -------------------------------------------------------------
    const fighterHp = aiState.fighter?.hp || 3;
    const fighterMaxHp = aiState.fighter?.maxHp || 3;
    const isFighterDamaged = fighterHp < fighterMaxHp;

    if (isFighterDamaged && currentEnergy > 0) {
      const heartCards = hand.filter(c => c.suit === 'hearts' && !c.isJoker);
      for (const heart of heartCards) {
        const cost = getCardEnergyCost(heart);
        if (cost <= currentEnergy) {
          const check = canPlayActionOfSuit(heart, affinity, playedActions);
          if (check.allowed) {
            onPlayAction({
              card: heart,
              orientation: 'horizontal',
              energyCost: cost,
              heartDeclaration: 'heal',
            });
            const idx = hand.findIndex(c => c.id === heart.id);
            if (idx >= 0) hand.splice(idx, 1);
            currentEnergy -= cost;
            break;
          }
        }
      }
    }

    // -------------------------------------------------------------
    // PRIORITY 6: OFFENSIVE ATTACKS & DIAMOND OVERCHARGES
    // -------------------------------------------------------------
    // Play attacks with remaining energy, favoring affinity suit
    let attempts = 0;
    while (currentEnergy > 0 && hand.length > 0 && attempts < 10) {
      attempts++;

      // Find playable action cards respecting suit limits and current energy
      const playableCards = hand.filter(card => {
        if (card.isJoker) return false;
        const cost = getCardEnergyCost(card);
        if (cost > currentEnergy) return false;
        return canPlayActionOfSuit(card, affinity, playedActions, roundNumber).allowed;
      });

      if (playableCards.length === 0) break;

      // Sort playable cards strategically:
      // 1. Spades (damage to pressure opponent) & Hearts/Clubs
      // 2. Diamonds (to overcharge existing attacks/actions)
      // 3. Affinity bonus
      playableCards.sort((a, b) => {
        // Diamonds should be played after the actions they intend to boost!
        const suitPriority = (suit: string) => {
          if (suit === 'spades') return 4;
          if (suit === 'hearts') return 3;
          if (suit === 'clubs') return 2;
          if (suit === 'diamonds') return 1;
          return 0;
        };
        const aSuitPri = suitPriority(a.suit);
        const bSuitPri = suitPriority(b.suit);
        if (aSuitPri !== bSuitPri) return bSuitPri - aSuitPri;

        const aIsAffinity = a.suit === affinity ? 10 : 0;
        const bIsAffinity = b.suit === affinity ? 10 : 0;
        const aPts = getUniversalPoints(a);
        const bPts = getUniversalPoints(b);
        return (bIsAffinity + bPts) - (aIsAffinity + aPts);
      });

      const cardToPlay = playableCards[0];
      const cost = getCardEnergyCost(cardToPlay);

      let heartDec: HeartDeclaration | undefined = undefined;
      if (cardToPlay.suit === 'hearts') {
        heartDec = isFighterDamaged ? 'heal' : 'block';
      }

      onPlayAction({
        card: cardToPlay,
        orientation: 'horizontal',
        energyCost: cost,
        heartDeclaration: heartDec,
      });

      playedActions.push({
        id: `ai_plan_${cardToPlay.id}`,
        card: cardToPlay,
        orientation: 'horizontal',
        energyCost: cost,
        basePoints: getUniversalPoints(cardToPlay),
        boostedPoints: 0,
        debuffedPoints: 0,
        finalPoints: getUniversalPoints(cardToPlay),
        heartDeclaration: heartDec,
      });

      const idx = hand.findIndex(c => c.id === cardToPlay.id);
      if (idx >= 0) hand.splice(idx, 1);
      currentEnergy -= cost;
    }

    // -------------------------------------------------------------
    // PRIORITY 6.5: MINION DIAMOND ENGINE BOOSTER (COSTS 1 ENERGY)
    // -------------------------------------------------------------
    // If minion has equipped Diamond permanent and AI has 1 Energy, boost the best action card!
    if (
      aiState.minion?.equippedPermanent?.suit === 'diamonds' &&
      currentEnergy >= 1 &&
      !aiState.hasUsedMinionDiamond &&
      playedActions.length > 0 &&
      roundNumber > 1
    ) {
      const eligibleTargets = playedActions.filter(
        a => a.heartDeclaration !== 'heal' && !a.isJokerAction && a.card.suit !== 'diamonds' && !isFaceCard(a.card.rank)
      );
      if (eligibleTargets.length > 0) {
        // Prioritize Spades attacks, then blocks/debuffs
        const spadeTarget = eligibleTargets.find(a => a.card.suit === 'spades');
        const chosenTarget = spadeTarget || eligibleTargets[0];
        const boostAmount = aiState.minion.equippedPermanent.tierPoints;

        chosenTarget.boostedPoints += boostAmount;
        chosenTarget.finalPoints += boostAmount;
        currentEnergy -= 1;

        if (onActivateMinionDiamond) {
          onActivateMinionDiamond(chosenTarget.id);
        }
      }
    }

    // -------------------------------------------------------------
    // PRIORITY 7: STRATEGIC CARD BANKING (1 LEFTOVER ENERGY)
    // -------------------------------------------------------------
    // If exactly 1 or more energy remains and cards are left in hand, bank the highest-value card for next round!
    if (currentEnergy >= 1 && hand.length > 0) {
      const sorted = [...hand].sort((a, b) => {
        // Prefer banking Face cards or Aces or Affinity cards
        const aAffinityBonus = a.suit === affinity ? 3 : 0;
        const bAffinityBonus = b.suit === affinity ? 3 : 0;
        return (getUniversalPoints(b) + bAffinityBonus) - (getUniversalPoints(a) + aAffinityBonus);
      });

      if (sorted[0]) {
        onBankCard(sorted[0].id);
      }
    }

    // Complete AI round planning
    setTimeout(() => {
      onReady();
    }, 450);
  }
}

export const aiPlayer = new AIPlayerService();
