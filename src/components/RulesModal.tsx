import React, { useState } from 'react';
import { BookOpen, X, Shield, Swords, Zap, Scissors, Heart, Sparkles, RotateCw } from 'lucide-react';

interface RulesModalProps {
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ onClose }) => {
  const [tab, setTab] = useState<'overview' | 'points' | 'actions' | 'equipment' | 'minions' | 'health' | 'resolution'>('overview');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-stone-900 border-2 border-amber-600/80 rounded-3xl shadow-2xl text-stone-100 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-950/60">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-amber-400" />
            <div>
              <h2 className="text-xl font-serif font-bold text-amber-300">Slay the Cards! Complete Official Rules</h2>
              <p className="text-xs text-stone-400">Master the tactical tabletop card combat</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 py-2.5 bg-stone-950/40 border-b border-stone-800 overflow-x-auto text-xs font-semibold">
          {[
            { id: 'overview', label: 'Setup & Deck' },
            { id: 'points', label: 'Universal Points & Energy' },
            { id: 'actions', label: 'Horizontal Actions' },
            { id: 'equipment', label: 'Vertical Permanents' },
            { id: 'minions', label: 'Aces & Minions' },
            { id: 'health', label: 'Clockwise Turns (HP)' },
            { id: 'resolution', label: 'Combat Resolution' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                tab === t.id
                  ? 'bg-amber-600 text-stone-950 font-bold shadow'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto scrollbar-thin space-y-4 text-sm text-stone-300 leading-relaxed">
          {tab === 'overview' && (
            <div className="space-y-4">
              <h3 className="text-lg font-serif font-bold text-amber-400">Deck & Fighter Setup</h3>
              <p>
                Each player starts with a standard 52-card deck (plus 1 Joker card). Both players draw 5 cards to form their private hand.
              </p>
              <div className="p-4 bg-stone-950 rounded-xl border border-stone-800 space-y-2">
                <h4 className="font-bold text-amber-300">The Mulligan Rule</h4>
                <p className="text-xs">
                  Players may mulligan up to 4 times: each time you mulligan, shuffle your cards back into the deck, draw a 5-card new hand reset, and place <strong className="text-amber-400">+1 more card on the bottom of the deck</strong> from your new hand (not before). For example, if you mulligan 1 time you put back 1 card, if you mulligan 2 times you put back 2 cards, and if you mulligan 3 times you put back 3 cards after the new hand reset.
                </p>
              </div>
              <div className="p-4 bg-stone-950 rounded-xl border border-stone-800 space-y-2">
                <h4 className="font-bold text-amber-300">Fighters & Affinity</h4>
                <p className="text-xs">
                  Each player selects 1 card from their starting hand to serve as their <strong>Fighter</strong> and places it face-up on the table.
                </p>
                <ul className="text-xs list-disc list-inside space-y-1 text-stone-300">
                  <li><strong>Numbered Fighters (Aces through 10)</strong>: 3 starting Health.</li>
                  <li><strong>Face Card Fighters (Jack, Queen, King)</strong>: 4 starting Health.</li>
                  <li><strong>Affinity</strong>: Your Fighter's printed suit determines your Affinity. You may play multiple cards matching your Fighter's suit per round! You are strictly limited to playing at most 1 action card and optionally 1 minion card (if Ace) per round of any non-matching suit. Minions can only attach a permanent same to their suit. You cannot use upgrade cards (Diamond Action Overcharges or Minion Equipment Permanents) during the 1st round of the game.</li>
                </ul>
              </div>
              <div className="p-4 bg-stone-950 rounded-xl border border-stone-800 space-y-2">
                <h4 className="font-bold text-amber-300">Round 1 Initiative</h4>
                <p className="text-xs">
                  The player with the higher-value Fighter (excluding Minions) goes <strong>Second</strong> in Round 1 (providing the tactical advantage to react). If tied, the player who reveals an Ace in hand goes Second; if still tied, flip a coin. Second-player initiative alternates each round thereafter.
                </p>
              </div>
            </div>
          )}

          {tab === 'points' && (
            <div className="space-y-4">
              <h3 className="text-lg font-serif font-bold text-amber-400">Universal Value Points & Energy</h3>
              <p>
                Card values translate directly into effect points: divide the card's face value by 3, rounded normally.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-stone-950 rounded-xl border border-stone-800">
                  <span className="font-bold text-amber-400">Aces through 4</span>: <strong>1 Point</strong>
                </div>
                <div className="p-3 bg-stone-950 rounded-xl border border-stone-800">
                  <span className="font-bold text-amber-400">Cards 5 through 7</span>: <strong>2 Points</strong>
                </div>
                <div className="p-3 bg-stone-950 rounded-xl border border-stone-800">
                  <span className="font-bold text-amber-400">Cards 8 through 10</span>: <strong>3 Points</strong>
                </div>
                <div className="p-3 bg-stone-950 rounded-xl border border-stone-800">
                  <span className="font-bold text-amber-400">Jack (11), Queen (12), King (13)</span>: <strong>4 Points</strong>
                </div>
              </div>
              <div className="p-4 bg-stone-950 rounded-xl border border-stone-800 space-y-2">
                <h4 className="font-bold text-blue-400">Energy System</h4>
                <p className="text-xs">
                  Each player receives <strong>3 Energy each round</strong>. Committed cards cannot be recalled.
                </p>
                <ul className="text-xs list-disc list-inside space-y-1 text-stone-300">
                  <li>Numbered cards (Aces through 10): <strong>1 Energy</strong></li>
                  <li>Jacks & Queens: <strong>2 Energy</strong></li>
                  <li>Kings: <strong>3 Energy</strong> (King of Diamonds and King of Clubs cost only <strong>2 Energy</strong>).</li>
                  <li>Joker: <strong>2 Energy</strong> (Can only be used once per player; makes opponent unable to attack this round).</li>
                  <li>Fighter setup: <strong>0 Energy</strong></li>
                  <li>Minion permanent equipment: <strong>2 Energy</strong></li>
                </ul>
              </div>
            </div>
          )}

          {tab === 'actions' && (
            <div className="space-y-4">
              <h3 className="text-lg font-serif font-bold text-amber-400">Temporary Action Cards (Played Horizontally)</h3>
              <p className="text-xs">
                Horizontal cards resolve their effect during the current round and are sent to the discard pile during cleanup.
              </p>
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-stone-950 rounded-xl border border-slate-700 flex gap-3">
                  <Swords className="w-5 h-5 text-slate-300 shrink-0" />
                  <div>
                    <strong className="text-slate-200">Spades (Attacks)</strong>: Deal immediate damage equal to the card's active points (plus Spade equipment bonus, Diamond overcharges).
                  </div>
                </div>
                <div className="p-3 bg-stone-950 rounded-xl border border-rose-900/60 flex gap-3">
                  <Heart className="w-5 h-5 text-rose-500 shrink-0" />
                  <div>
                    <strong className="text-rose-400">Hearts (Defense or Recovery)</strong>: Declare Block or Heal upon play. Block is played horizontally to absorb incoming attack points 1-for-1 during combat (protecting Minions first). Heal instantly restores lost health to your damaged Fighter up to max health, and the heal card is discarded immediately after instead of remaining on the table.
                  </div>
                </div>
                <div className="p-3 bg-stone-950 rounded-xl border border-amber-900/60 flex gap-3">
                  <Zap className="w-5 h-5 text-amber-500 shrink-0" />
                  <div>
                    <strong className="text-amber-400">Diamonds (Action Overcharge)</strong>: Boosts another action card by its Universal Value Points.
                  </div>
                </div>
                <div className="p-3 bg-stone-950 rounded-xl border border-emerald-900/60 flex gap-3">
                  <Scissors className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <strong className="text-emerald-400">Clubs (Skills, Disruption & Debuff)</strong>: Trigger before attacks land! All Clubs can be used either as an <strong>Action Debuff</strong> (reducing opponent action points) OR for <strong>Disruption</strong> (Numbered clubs can shatter equipment if points ≥ tier; <strong>Jack and Queen of Clubs</strong> allow you to inspect the opponent's hand and force them to discard 1 chosen card; <strong>King of Clubs</strong> steals 1 card to play this round, or summon as your minion if that card is an Ace). Before each round begins, players with <strong>Face Club Cards</strong> (J, Q, K) are given the prompt to strike early before regular turn actions commence! If you play <strong>first</strong> (1st Initiative), you can still place your Club debuff on the table; right before the round resolves, once your opponent has revealed their cards, you choose which opponent action to debuff or equipment to shatter!
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'equipment' && (
            <div className="space-y-4">
              <h3 className="text-lg font-serif font-bold text-amber-400">Persistent Equipment Permanents (Played Vertically)</h3>
              <p className="text-xs">
                Only your minion (if you have one) on the table may equip at most 1 numbered card (2-10) vertically on top of it by paying <strong>2 Energy</strong>. Equipping is strictly disabled for face cards (J, Q, K).
                Equipped permanents persist across rounds, cannot exceed 1 card per unit, and minions can only attach a permanent of the <strong>same suit</strong>!
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-stone-950 rounded-xl border border-stone-800">
                  <strong className="text-slate-300">♠ Spade Permanent</strong>: Passive Attack bonus. Automatically adds tier points to your attacks each round (applies only if you attack).
                </div>
                <div className="p-3 bg-stone-950 rounded-xl border border-stone-800">
                  <strong className="text-rose-400">♥ Heart Permanent</strong>: Passive Shield. Automatically absorbs incoming attack points equal to tier points every round before temporary blocks are played.
                </div>
                <div className="p-3 bg-stone-950 rounded-xl border border-stone-800">
                  <strong className="text-amber-400">♦ Diamond Permanent</strong>: Passive Engine booster. Permanently adds tier points to any 1 played action card of your choice for 1 energy.
                </div>
                <div className="p-3 bg-stone-950 rounded-xl border border-stone-800">
                  <strong className="text-emerald-400">♣ Club Permanent</strong>: Passive Sabotage. Reduces opponent's incoming attack or defense total by tier points each round.
                </div>
              </div>
            </div>
          )}

          {tab === 'minions' && (
            <div className="space-y-4">
              <h3 className="text-lg font-serif font-bold text-amber-400">Aces as Minions</h3>
              <p className="text-xs">
                Any player may play an Ace to the table for <strong>1 Energy</strong> to summon a Minion (maximum 1 active Minion per player).
              </p>
              <div className="p-4 bg-stone-950 rounded-xl border border-stone-800 space-y-2 text-xs">
                <p>
                  Minions possess <strong>1 base Health</strong> and absorb enemy attacks first. Played blocking heart cards protect the minion first also!
                </p>
                <p>
                  Unblocked damage destroys the Minion, and any remaining damage immediately spills over onto the player's Fighter.
                </p>
                <p>
                  <strong>Health Boost</strong>: You can attach one (1 max) other Ace vertically underneath a minion to boost their max HP to <strong>2 HP</strong>!
                </p>
              </div>
            </div>
          )}

          {tab === 'health' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <RotateCw className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-serif font-bold text-amber-400">Physical Health Tracking (Clockwise Turns)</h3>
              </div>
              <p className="text-xs">
                Cards rotate physically clockwise on the table to indicate remaining health points:
              </p>
              <div className="space-y-2 text-xs">
                <div className="p-3 bg-stone-950 rounded-xl border border-stone-800">
                  <strong className="text-amber-300">Face Card Fighters (4 HP)</strong>:
                  <div className="text-stone-400 mt-1">
                    Vertical Right-Side Up (4 HP, 0°) → Tilted right 45 degrees (3 HP, 45°) → Horizontal (2 HP, 90°) → Tilted right 45 degrees more (1 HP, 135°) → Face-Down (0 HP / Dead)
                  </div>
                </div>
                <div className="p-3 bg-stone-950 rounded-xl border border-stone-800">
                  <strong className="text-amber-300">Numbered Fighters (3 HP)</strong>:
                  <div className="text-stone-400 mt-1">
                    Vertical Right-Side Up (3 HP, 0°) → Tilted Right 45 degrees (2 HP, 45°) → Turned horizontal (1 HP, 90°) → Face-Down (0 HP / Dead)
                  </div>
                </div>
                <div className="p-3 bg-stone-950 rounded-xl border border-stone-800">
                  <strong className="text-amber-300">Minions (1 HP)</strong>:
                  <div className="text-stone-400 mt-1">
                    Vertical Right-Side Up (1 HP, 0°) → Face-Down (0 HP / Dead)
                  </div>
                </div>
                <div className="p-3 bg-stone-950 rounded-xl border border-stone-800">
                  <strong className="text-amber-300">Boosted Minions (2 HP)</strong>:
                  <div className="text-stone-400 mt-1">
                    Vertical Right-Side Up (2 HP, 0°) → Horizontal (1 HP, 90°) → Face-Down (0 HP / Dead)
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'resolution' && (
            <div className="space-y-4">
              <h3 className="text-lg font-serif font-bold text-amber-400">Resolution, Cleanup & Deck Cycle</h3>
              <p className="text-xs">Once open card placement concludes, effects resolve in strict order:</p>
              <ol className="list-decimal list-inside space-y-2 text-xs bg-stone-950 p-4 rounded-xl border border-stone-800">
                <li><strong>Clubs</strong>: Resolve disruptions and hand-control effects first, nullifying action points or destroying equipment.</li>
                <li><strong>Shields & Blocks</strong>: Passive equipment shields and declared Heart blocks absorb incoming Spades attack points, protecting Minions before Fighters.</li>
                <li><strong>Attack Damage</strong>: Remaining unblocked damage hits Minions first, overflowing to Fighters.</li>
                <li><strong>Heals</strong>: Declared Heart heals restore damaged fighters up to their starting caps.</li>
                <li><strong>Cleanup</strong>: Move all horizontally played temporary action cards to the discard pile. Persistent vertically equipped cards remain on active table units.</li>
                <li><strong>Hand Discard / Banking</strong>: Discard all unplayed cards from hand, unless you spend 1 leftover Energy to bank 1 card into the next round.</li>
                <li><strong>Draw Deck</strong>: Draw cards until hand reaches 5 cards. Only reshuffle discard pile when draw deck runs out of cards.</li>
                <li><strong>Energy Reset</strong>: Energy resets to 3 for both players to begin the next round.</li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
