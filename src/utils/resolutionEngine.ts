import { CombatLogStep, GameState, PlayerState, Card } from '../types/game';
import { getUniversalPoints, shuffleDeck } from './cardUtils';

export function resolveCombatRound(currentState: GameState): {
  updatedState: GameState;
  logs: CombatLogStep[];
} {
  // Clone state
  const state: GameState = JSON.parse(JSON.stringify(currentState));
  const logs: CombatLogStep[] = [];
  const [p1, p2] = state.players;

  // Track Joker effects
  const p1PlayedJoker = p1.playedActions.some(a => a.isJokerAction);
  const p2PlayedJoker = p2.playedActions.some(a => a.isJokerAction);

  if (p1PlayedJoker) {
    logs.push({
      id: `joker_p1_${Date.now()}`,
      phase: 'clubs',
      title: `${p1.name} Played Joker!`,
      description: `The Joker unlocked a maximum energy expansion to 4 for this round!`,
      sourcePlayerId: p1.id,
    });
  }
  if (p2PlayedJoker) {
    logs.push({
      id: `joker_p2_${Date.now()}`,
      phase: 'clubs',
      title: `${p2.name} Played Joker!`,
      description: `The Joker unlocked a maximum energy expansion to 4 for this round!`,
      sourcePlayerId: p2.id,
    });
  }

  // -------------------------------------------------------------
  // STEP 0: DIAMONDS FIGHTER PASSIVE (+1 BOOST) VERIFICATION
  // -------------------------------------------------------------
  // Ensures Diamond Champion Fighter Passive (+1 Boost) always applies to an action card
  // even if no Diamonds were played that match the Fighter's suit!
  [p1, p2].forEach(p => {
    if (p.fighter?.affinity === 'diamonds') {
      const alreadyHasBoost = p.playedActions.some(a => (a.fighterBoostedPoints || 0) > 0);
      if (!alreadyHasBoost) {
        const eligible = p.playedActions.filter(a => a.heartDeclaration !== 'heal' && !a.isJokerAction);
        if (eligible.length > 0) {
          const targetAction = eligible.find(a => a.card.suit === 'spades') || eligible[0];
          targetAction.fighterBoostedPoints = 1;
          targetAction.boostedPoints += 1;
          targetAction.finalPoints += 1;
          logs.push({
            id: `diamond_fighter_passive_${p.id}_${Date.now()}`,
            phase: 'damage',
            title: `${p.name}'s Diamonds Champion Passive Activated!`,
            description: `Inherent +1 passive Boost applied to ${targetAction.card.name}!`,
            sourcePlayerId: p.id,
            amount: 1,
          });
        }
      }
    }
  });

  // -------------------------------------------------------------
  // STEP 1: CLUBS DISRUPTIONS & HAND CONTROL (INCLUDING CLUBS FIGHTER PASSIVE)
  // -------------------------------------------------------------
  [
    { source: p1, target: p2 },
    { source: p2, target: p1 },
  ].forEach(({ source, target }) => {
    // 1A. Clubs Champion Fighter Passive (+1 Debuff automatically each round with 0 Energy)
    if (source.fighter?.affinity === 'clubs') {
      const eligible = target.playedActions
        .filter(a => a.heartDeclaration !== 'heal' && a.finalPoints > 0)
        .sort((a, b) => b.finalPoints - a.finalPoints);
      if (eligible.length > 0) {
        const targetAction = eligible[0];
        targetAction.debuffedPoints += 1;
        targetAction.finalPoints = Math.max(0, targetAction.finalPoints - 1);

        logs.push({
          id: `club_fighter_passive_${source.id}_${Date.now()}`,
          phase: 'clubs',
          title: `${source.name}'s Clubs Champion Passive Activated!`,
          description: `Inherent +1 Club Debuff nullified 1 point from ${target.name}'s ${targetAction.card.name}!`,
          sourcePlayerId: source.id,
          targetPlayerId: target.id,
          amount: 1,
        });
      }
    }

    source.playedActions.forEach(action => {
      if (action.card.suit === 'clubs' && !action.isJokerAction) {
        const points = action.finalPoints;

        // Club action debuff or equipment shatter (only when played as debuff, not Jack/Queen disruption)
        if (!action.clubSpecial) {
          let targetAction = action.targetActionId
            ? target.playedActions.find(a => a.id === action.targetActionId)
            : undefined;

          // If no specific target was set, or target already reduced to 0, target highest eligible action
          if (!targetAction || targetAction.finalPoints <= 0) {
            const eligible = target.playedActions
              .filter(a => a.heartDeclaration !== 'heal' && a.finalPoints > 0)
              .sort((a, b) => b.finalPoints - a.finalPoints);
            if (eligible.length > 0) {
              targetAction = eligible[0];
            }
          }

          if (targetAction && targetAction.heartDeclaration !== 'heal' && targetAction.finalPoints > 0) {
            const debuffAmt = Math.min(targetAction.finalPoints, points);
            targetAction.debuffedPoints += debuffAmt;
            targetAction.finalPoints = Math.max(0, targetAction.finalPoints - debuffAmt);

            logs.push({
              id: `club_debuff_${action.id}`,
              phase: 'clubs',
              title: `${source.name}'s Club Debuff`,
              description: `${action.card.name} nullified ${debuffAmt} points from ${target.name}'s ${targetAction.card.name}!`,
              sourcePlayerId: source.id,
              targetPlayerId: target.id,
              amount: debuffAmt,
            });
          }

          // Equipment destruction check
          if (target.minion?.equippedPermanent) {
            const eqTier = target.minion.equippedPermanent.tierPoints;
            if (points >= eqTier) {
              const destroyedCard = target.minion.equippedPermanent.card;
              target.minion.equippedPermanent = undefined;
              target.discardPile.push(destroyedCard);

              logs.push({
                id: `club_destroy_eq_${action.id}`,
                phase: 'clubs',
                title: `${source.name} Shattered Equipment!`,
                description: `${action.card.name} (${points} pts) destroyed ${target.name}'s equipped ${destroyedCard.name} (Tier ${eqTier})!`,
                sourcePlayerId: source.id,
                targetPlayerId: target.id,
              });
            }
          }
        }

        // Jack of clubs: ambush discard log
        if (action.clubSpecial?.type === 'jack') {
          logs.push({
            id: `jack_discard_${action.id}`,
            phase: 'clubs',
            title: `${source.name}'s Jack of Clubs Ambush!`,
            description: `${source.name} forced ${target.name} to discard ${action.clubSpecial.discardedCardName || 'a card'}!`,
            sourcePlayerId: source.id,
            targetPlayerId: target.id,
          });
        }

        // Queen of clubs: targeted discard log
        if (action.clubSpecial?.type === 'queen') {
          logs.push({
            id: `queen_discard_${action.id}`,
            phase: 'clubs',
            title: `${source.name}'s Queen of Clubs Mind Vision!`,
            description: `${source.name} inspected ${target.name}'s hand and forced them to discard ${action.clubSpecial.discardedCardName || 'a card'}!`,
            sourcePlayerId: source.id,
            targetPlayerId: target.id,
          });
        }

        // King of clubs: grand heist log
        if (action.clubSpecial?.type === 'king') {
          logs.push({
            id: `king_heist_${action.id}`,
            phase: 'clubs',
            title: `${source.name}'s King of Clubs Grand Heist!`,
            description: `${source.name} executed a Grand Heist, stealing ${action.clubSpecial.stolenCard?.name || 'opponent card'}!`,
            sourcePlayerId: source.id,
            targetPlayerId: target.id,
          });
        }
      }
    });
  });

  // -------------------------------------------------------------
  // STEP 2: DEFENSE CALCULATION (HEARTS FIGHTER PASSIVE & DECLARED HEART BLOCKS)
  // -------------------------------------------------------------
  const calculateDefense = (player: PlayerState) => {
    let passiveShield = 0;
    // Inherent Hearts Champion Fighter Passive (+1 Shield every round for 0 Energy)
    if (player.fighter?.affinity === 'hearts') {
      passiveShield += 1;
    }
    // Vertically equipped Heart on minion
    if (player.minion?.equippedPermanent?.suit === 'hearts') {
      passiveShield += player.minion.equippedPermanent.tierPoints;
    }

    let temporaryBlocks = 0;
    player.playedActions.forEach(a => {
      if (a.card.suit === 'hearts' && a.heartDeclaration === 'block') {
        temporaryBlocks += a.finalPoints;
      }
    });

    return { passiveShield, temporaryBlocks, total: passiveShield + temporaryBlocks };
  };

  const p1Def = calculateDefense(p1);
  const p2Def = calculateDefense(p2);

  // -------------------------------------------------------------
  // STEP 3: ATTACK RESOLUTION & DAMAGE TO MINIONS & FIGHTERS
  // -------------------------------------------------------------
  const calculateTotalAttack = (attacker: PlayerState) => {
    let attackPoints = 0;
    let hasAttack = false;

    // Spades action attacks
    attacker.playedActions.forEach(a => {
      if (a.card.suit === 'spades' && !a.isJokerAction) {
        attackPoints += a.finalPoints;
        hasAttack = true;
      }
    });

    // Inherent Spades Champion Fighter Passive (+1 Attack every round for 0 Energy)
    if (attacker.fighter?.affinity === 'spades') {
      attackPoints += 1;
      logs.push({
        id: `spade_fighter_passive_${attacker.id}_${Date.now()}`,
        phase: 'damage',
        title: `${attacker.name}'s Spades Champion Passive Activated!`,
        description: `Inherent +1 passive Attack damage dealt!`,
        sourcePlayerId: attacker.id,
        amount: 1,
      });
    }

    // Vertically equipped Spade on minion gives passive attack bonus IF attacker attacks
    if (hasAttack && attacker.minion?.equippedPermanent?.suit === 'spades') {
      const spadeBonus = attacker.minion.equippedPermanent.tierPoints;
      attackPoints += spadeBonus;
      logs.push({
        id: `spade_eq_${attacker.id}_${Date.now()}`,
        phase: 'damage',
        title: `${attacker.name}'s Minion Spade Equipment Activated!`,
        description: `Equipped ${attacker.minion.equippedPermanent.card.name} added +${spadeBonus} passive Attack damage!`,
        sourcePlayerId: attacker.id,
        amount: spadeBonus,
      });
    }

    return attackPoints;
  };

  const p1IncomingAttack = calculateTotalAttack(p2);
  const p2IncomingAttack = calculateTotalAttack(p1);

  // Apply damage with Minion first, then spillover to Fighter
  const applyDamage = (
    defender: PlayerState,
    incomingAttack: number,
    defense: { passiveShield: number; temporaryBlocks: number; total: number },
    attackerName: string
  ) => {
    if (incomingAttack <= 0) {
      return;
    }

    let remainingAttack = incomingAttack;

    // 0. Absorb by equipped Club passive sabotage on minion
    if (defender.minion?.equippedPermanent?.suit === 'clubs' && remainingAttack > 0) {
      const sabotageAmt = Math.min(remainingAttack, defender.minion.equippedPermanent.tierPoints);
      remainingAttack -= sabotageAmt;
      logs.push({
        id: `club_eq_sabotage_${defender.id}_${Date.now()}`,
        phase: 'defense',
        title: `${defender.name}'s Minion Club Sabotage Activated!`,
        description: `Equipped ${defender.minion.equippedPermanent.card.name} sabotaged and reduced incoming attack damage by ${sabotageAmt} points!`,
        targetPlayerId: defender.id,
        amount: sabotageAmt,
      });
    }

    // 1. Absorb by passive shield (from equipped Heart permanent)
    if (defense.passiveShield > 0 && remainingAttack > 0) {
      const absorbed = Math.min(remainingAttack, defense.passiveShield);
      remainingAttack -= absorbed;
      logs.push({
        id: `def_shield_${defender.id}_${Date.now()}`,
        phase: 'defense',
        title: `${defender.name}'s Minion Shield Absorbed Damage`,
        description: `Passive shield from equipped ${defender.minion?.equippedPermanent?.card.name || 'Heart permanent'} absorbed ${absorbed} attack points from ${attackerName}.`,
        targetPlayerId: defender.id,
        amount: absorbed,
      });
    }

    // 2. Absorb by temporary Heart blocks
    if (remainingAttack > 0 && defense.temporaryBlocks > 0) {
      const absorbed = Math.min(remainingAttack, defense.temporaryBlocks);
      remainingAttack -= absorbed;
      logs.push({
        id: `def_block_${defender.id}_${Date.now()}`,
        phase: 'defense',
        title: `${defender.name}'s Heart Block`,
        description: `Declared Heart block absorbed ${absorbed} attack points from ${attackerName}.`,
        targetPlayerId: defender.id,
        amount: absorbed,
      });
    }

    // 3. Damage strikes Minion first
    if (remainingAttack > 0 && defender.minion && defender.minion.hp > 0) {
      const minionDamage = Math.min(defender.minion.hp, remainingAttack);
      defender.minion.hp -= minionDamage;
      remainingAttack -= minionDamage;

      logs.push({
        id: `dmg_minion_${defender.id}_${Date.now()}`,
        phase: 'damage',
        title: `${defender.name}'s Minion Took ${minionDamage} Damage!`,
        description: `The minion intercepted enemy attacks.`,
        targetPlayerId: defender.id,
        amount: minionDamage,
      });

      // Minion destroyed?
      if (defender.minion.hp <= 0) {
        defender.discardPile.push(defender.minion.aceCard);
        if (defender.minion.boostAceCard) defender.discardPile.push(defender.minion.boostAceCard);
        if (defender.minion.equippedPermanent) defender.discardPile.push(defender.minion.equippedPermanent.card);

        logs.push({
          id: `minion_destroyed_${defender.id}_${Date.now()}`,
          phase: 'damage',
          title: `${defender.name}'s Minion Destroyed!`,
          description: `The minion fell in battle and was sent to the discard pile with all attachments.`,
          targetPlayerId: defender.id,
        });

        defender.minion = null;
      }
    }

    // 4. Overflow damage hits Fighter!
    if (remainingAttack > 0 && defender.fighter && defender.fighter.hp > 0) {
      const fighterDamage = Math.min(defender.fighter.hp, remainingAttack);
      defender.fighter.hp -= fighterDamage;
      remainingAttack -= fighterDamage;

      logs.push({
        id: `dmg_fighter_${defender.id}_${Date.now()}`,
        phase: 'damage',
        title: `${defender.name}'s Fighter Hit for ${fighterDamage} Damage!`,
        description: `Unblocked damage spilled over to ${defender.name}'s Fighter! (Fighter HP: ${defender.fighter.hp}/${defender.fighter.maxHp})`,
        targetPlayerId: defender.id,
        amount: fighterDamage,
      });

      if (defender.fighter.hp <= 0) {
        logs.push({
          id: `fighter_slain_${defender.id}_${Date.now()}`,
          phase: 'damage',
          title: `${defender.name}'s Fighter Has Fallen!`,
          description: `The champion has perished! The battle concludes.`,
          targetPlayerId: defender.id,
        });
      }
    }
  };

  applyDamage(p1, p1IncomingAttack, p1Def, p2.name);
  applyDamage(p2, p2IncomingAttack, p2Def, p1.name);

  // -------------------------------------------------------------
  // STEP 4: DECLARED HEART HEALS RESTORE DAMAGED FIGHTERS
  // -------------------------------------------------------------
  [p1, p2].forEach(player => {
    if (!player.fighter || player.fighter.hp <= 0) return;

    let healAmount = 0;
    player.playedActions.forEach(a => {
      if (a.card.suit === 'hearts' && a.heartDeclaration === 'heal') {
        healAmount += a.finalPoints;
      }
    });

    if (healAmount > 0) {
      const missingHp = player.fighter.maxHp - player.fighter.hp;
      const actualHeal = Math.min(missingHp, healAmount);
      player.fighter.hp += actualHeal;

      logs.push({
        id: `heal_${player.id}_${Date.now()}`,
        phase: 'heal',
        title: `${player.name} Restored Health!`,
        description: `Heart Heal restored +${actualHeal} HP to Fighter (Now ${player.fighter.hp}/${player.fighter.maxHp} HP).`,
        sourcePlayerId: player.id,
        amount: actualHeal,
      });
    }
  });

  // -------------------------------------------------------------
  // STEP 5: CLEANUP & DECK REPLENISHMENT
  // -------------------------------------------------------------
  [
    { player: p1, opponent: p2 },
    { player: p2, opponent: p1 },
  ].forEach(({ player, opponent }) => {
    // Discard horizontal action cards (returning any stolen card to opponent's discard)
    player.playedActions.forEach(a => {
      if (a.id.startsWith('stolen_') || a.id.startsWith('ai_stolen_')) {
        opponent.discardPile.push(a.card);
      } else {
        player.discardPile.push(a.card);
      }
    });
    player.playedActions = [];

    // Hand discard / banking
    // "Discard all unplayed cards from hand, unless you spend 1 leftover Energy to bank 1 card into the next round."
    const bankedCard = player.bankedCardId
      ? player.hand.find(c => c.id === player.bankedCardId)
      : null;

    const remainingToDiscard = player.hand.filter(c => c.id !== player.bankedCardId);
    remainingToDiscard.forEach(c => {
      player.discardPile.push(c);
    });

    // Retain only the banked card if valid
    player.hand = bankedCard ? [bankedCard] : [];
    player.bankedCardId = null;

    // Draw up to 5 cards (or mulligan cap)
    const targetHandSize = 5;
    while (player.hand.length < targetHandSize) {
      if (player.deck.length === 0) {
        if (player.discardPile.length === 0) break; // Out of cards
        // "Only reshuffle the discard pile back into the deck when the draw deck runs out of cards."
        player.deck = shuffleDeck(player.discardPile);
        player.discardPile = [];
        logs.push({
          id: `reshuffle_${player.id}`,
          phase: 'cleanup',
          title: `${player.name}'s Deck Reshuffled`,
          description: `Discard pile was reshuffled back into the draw deck.`,
          sourcePlayerId: player.id,
        });
      }

      const drawn = player.deck.pop();
      if (drawn) {
        player.hand.push(drawn);
      }
    }

    // Energy resets to 3
    player.energy = 3;
    player.maxEnergy = 3;
    player.isReadyForRound = false;
    player.hasUsedMinionDiamond = false;
  });

  logs.push({
    id: `cleanup_done_${Date.now()}`,
    phase: 'cleanup',
    title: 'Round Complete & Energy Reset',
    description: 'Temporary action cards discarded, fresh hands drawn, and both players restored to 3 Energy.',
  });

  // Check Game Winner
  if ((p1.fighter?.hp || 0) <= 0 && (p2.fighter?.hp || 0) <= 0) {
    state.gameWinnerId = 'tie';
    state.phase = 'game_over';
  } else if ((p1.fighter?.hp || 0) <= 0) {
    state.gameWinnerId = p2.id;
    state.phase = 'game_over';
  } else if ((p2.fighter?.hp || 0) <= 0) {
    state.gameWinnerId = p1.id;
    state.phase = 'game_over';
  } else {
    // Advance round and alternate initiative
    state.roundNumber += 1;
    state.roundInitiativeSecondPlayerIndex =
      state.roundInitiativeSecondPlayerIndex === 0 ? 1 : 0;
    state.activePlayerIndex = state.roundInitiativeSecondPlayerIndex === 0 ? 1 : 0;
    state.phase = 'round_action';
    state.awaitingFirstPlayerResolution = false;
  }

  state.combatLogs = logs;
  return { updatedState: state, logs };
}
