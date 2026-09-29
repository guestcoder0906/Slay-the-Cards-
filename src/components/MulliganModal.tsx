import React, { useState } from 'react';
import { Card } from '../types/game';
import { CardView } from './CardView';
import { sounds } from '../utils/audio';
import { RotateCcw, Check, ArrowDown } from 'lucide-react';

interface MulliganModalProps {
  hand: Card[];
  mulliganCount: number;
  onMulligan: (cardsToBottom: Card[]) => void;
  onKeepHand: () => void;
}

export const MulliganModal: React.FC<MulliganModalProps> = ({
  hand,
  mulliganCount,
  onMulligan,
  onKeepHand,
}) => {
  const cardsNeededToBottom = mulliganCount + 1;
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  const [step, setStep] = useState<'decision' | 'pick_bottom'>('decision');

  const toggleSelectCard = (card: Card) => {
    sounds.playCardPlace();
    if (selectedCards.some(c => c.id === card.id)) {
      setSelectedCards(selectedCards.filter(c => c.id !== card.id));
    } else {
      if (selectedCards.length < cardsNeededToBottom) {
        setSelectedCards([...selectedCards, card]);
      }
    }
  };

  const handleStartMulligan = () => {
    // If we need to put cards on the bottom, prompt selection
    setStep('pick_bottom');
    setSelectedCards([]);
  };

  const handleConfirmMulligan = () => {
    if (selectedCards.length === cardsNeededToBottom) {
      sounds.playShuffle();
      onMulligan(selectedCards);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl bg-stone-900 border-2 border-amber-600/70 rounded-2xl p-6 shadow-2xl text-stone-100 flex flex-col items-center">
        {/* Title Badge */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl font-serif text-amber-400 font-bold">Mulligan Phase</span>
          <span className="bg-amber-500/20 text-amber-300 text-xs px-2.5 py-0.5 rounded-full border border-amber-500/40">
            Mulligan #{mulliganCount + 1}
          </span>
        </div>

        {step === 'decision' ? (
          <>
            <p className="text-stone-300 text-sm text-center max-w-lg mb-6">
              Review your 5 starting cards. You may mulligan any amount of times: shuffle back into
              the deck, draw 5 fresh cards, and put <strong className="text-amber-400">+{cardsNeededToBottom} card(s)</strong> on
              the bottom of the deck.
            </p>

            {/* Hand cards display */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
              {hand.map(card => (
                <CardView key={card.id} card={card} size="md" />
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4">
              <button
                onClick={onKeepHand}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-700/40 transition-all cursor-pointer active:scale-95"
              >
                <Check className="w-5 h-5" /> Keep Starting Hand
              </button>
              <button
                onClick={handleStartMulligan}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-lg shadow-amber-700/40 transition-all cursor-pointer active:scale-95"
              >
                <RotateCcw className="w-5 h-5" /> Mulligan ({cardsNeededToBottom} to bottom)
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-stone-300 text-sm text-center max-w-lg mb-4">
              Select <strong className="text-amber-400">{cardsNeededToBottom} card(s)</strong> from your hand to place on the bottom of the deck.
              ({selectedCards.length} / {cardsNeededToBottom} chosen)
            </p>

            {/* Pick cards to bottom */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
              {hand.map(card => {
                const isSelected = selectedCards.some(c => c.id === card.id);
                return (
                  <div key={card.id} className="relative cursor-pointer" onClick={() => toggleSelectCard(card)}>
                    <CardView card={card} size="md" isSelected={isSelected} />
                    {isSelected && (
                      <div className="absolute inset-0 bg-red-950/60 rounded-xl flex flex-col items-center justify-center text-red-300 font-bold text-xs pointer-events-none">
                        <ArrowDown className="w-6 h-6 animate-bounce" />
                        <span>TO BOTTOM</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setStep('decision')}
                className="px-4 py-2 rounded-xl bg-stone-700 hover:bg-stone-600 text-stone-200 text-sm font-semibold cursor-pointer"
              >
                Back
              </button>
              <button
                disabled={selectedCards.length !== cardsNeededToBottom}
                onClick={handleConfirmMulligan}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold shadow-lg transition-all cursor-pointer ${
                  selectedCards.length === cardsNeededToBottom
                    ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/40'
                    : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                }`}
              >
                <ArrowDown className="w-5 h-5" /> Confirm Bottom Placement & Draw
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
