import React, { useState } from 'react';
import { Card } from '../types/game';
import { CardView } from './CardView';
import {
  getFighterMaxHealth,
  isFaceCard,
  SUIT_NAMES,
  SUIT_SYMBOLS,
  SUIT_THEMES,
} from '../utils/cardUtils';
import { ShieldAlert, Sparkles, Swords } from 'lucide-react';

interface SetupFighterModalProps {
  hand: Card[];
  onSelectFighter: (card: Card) => void;
}

export const SetupFighterModal: React.FC<SetupFighterModalProps> = ({ hand, onSelectFighter }) => {
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  const eligibleCards = hand.filter(c => !c.isJoker);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 sm:p-4">
      <div className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto scrollbar-thin bg-stone-900 border-2 border-amber-600/80 rounded-2xl p-4 sm:p-6 shadow-2xl text-stone-100 flex flex-col items-center">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <Swords className="w-6 h-6 text-amber-400" />
          <h2 className="text-2xl font-serif text-amber-400 font-bold">Select Your Champion Fighter</h2>
        </div>
        <p className="text-stone-300 text-sm text-center max-w-xl mb-4">
          Choose 1 card from your starting hand to lead your board as your <strong className="text-amber-300">Fighter</strong>.
          Face Cards (J, Q, K) boast <span className="text-emerald-400 font-bold">4 starting HP</span>.
          Numbered cards have <span className="text-emerald-400 font-bold">3 starting HP</span>.
          Your Fighter's suit establishes your <strong className="text-amber-300">Affinity</strong> (no limit on matching suit actions!).
        </p>

        {/* Card Options */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-6">
          {eligibleCards.map(card => {
            const isSelected = selectedCard?.id === card.id;
            const hp = getFighterMaxHealth(card.rank);
            const isFace = isFaceCard(card.rank);
            const theme = SUIT_THEMES[card.suit];

            return (
              <div
                key={card.id}
                onClick={() => setSelectedCard(card)}
                className={`flex flex-col items-center p-2 rounded-xl border-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-amber-400 bg-amber-950/40 ring-2 ring-amber-400 scale-105 shadow-xl'
                    : 'border-stone-700 hover:border-stone-500 bg-stone-800/40'
                }`}
              >
                <CardView card={card} size="md" isSelected={isSelected} />

                <div className="mt-2 text-center text-xs">
                  <div className="font-bold flex items-center justify-center gap-1">
                    <span className="text-emerald-400 font-extrabold">{hp} HP</span>
                    {isFace && <Sparkles className="w-3 h-3 text-amber-400" />}
                  </div>
                  <div className="text-[11px] text-stone-400 mt-0.5">
                    {SUIT_SYMBOLS[card.suit]} {SUIT_NAMES[card.suit]}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Fighter Details & Confirm */}
        {selectedCard ? (
          <div className="w-full bg-stone-800/80 border border-amber-500/40 rounded-xl p-4 mb-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="font-bold text-base text-amber-300">
                Chosen: {selectedCard.name} ({SUIT_NAMES[selectedCard.suit]})
              </div>
              <div className="text-xs text-stone-300 mt-0.5">
                Starting Health: <strong className="text-emerald-400">{getFighterMaxHealth(selectedCard.rank)} HP</strong> |
                Affinity: <strong className="text-amber-300">{SUIT_NAMES[selectedCard.suit]} ({SUIT_THEMES[selectedCard.suit].role})</strong>
              </div>
            </div>
            <button
              onClick={() => onSelectFighter(selectedCard)}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-black text-sm shadow-lg shadow-amber-600/30 transition-all cursor-pointer active:scale-95"
            >
              Commit Fighter to Table
            </button>
          </div>
        ) : (
          <div className="text-stone-400 text-xs italic mb-4 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            Click any card above to preview stats and commit your Fighter.
          </div>
        )}
      </div>
    </div>
  );
};
