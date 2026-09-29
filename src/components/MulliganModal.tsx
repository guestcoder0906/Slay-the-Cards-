import React, { useState } from 'react';
import { Card } from '../types/game';
import { CardView } from './CardView';
import { sounds } from '../utils/audio';
import { RotateCcw, Check, ArrowDown, Sparkles } from 'lucide-react';

interface MulliganModalProps {
  hand: Card[];
  mulliganCount: number;
  onMulliganReset: () => void;
  onPutCardToBottom: (card: Card) => void;
  onKeepHand: () => void;
}

export const MulliganModal: React.FC<MulliganModalProps> = ({
  hand,
  mulliganCount,
  onMulliganReset,
  onPutCardToBottom,
  onKeepHand,
}) => {
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [step, setStep] = useState<'decision' | 'pick_bottom'>('decision');

  const handleStartMulligan = () => {
    sounds.playShuffle();
    onMulliganReset();
    setStep('pick_bottom');
    setSelectedCard(null);
  };

  const handleConfirmBottomCard = () => {
    if (selectedCard) {
      sounds.playCardRotate();
      onPutCardToBottom(selectedCard);
      setSelectedCard(null);
      setStep('decision');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl bg-stone-900 border-2 border-amber-600/70 rounded-2xl p-6 shadow-2xl text-stone-100 flex flex-col items-center">
        {/* Title Badge */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl font-serif text-amber-400 font-bold">Mulligan Phase</span>
          <span className="bg-amber-500/20 text-amber-300 text-xs px-2.5 py-0.5 rounded-full border border-amber-500/40">
            {mulliganCount === 0 ? 'Starting Hand' : `Mulligan #${mulliganCount}`}
          </span>
        </div>

        {step === 'decision' ? (
          <>
            <p className="text-stone-300 text-sm text-center max-w-lg mb-6 leading-relaxed">
              {mulliganCount === 0 ? (
                <>
                  Review your 5 starting cards. If you want a fresh hand, you can <strong>Mulligan</strong>:
                  shuffle your cards back, draw a fresh 5-card reset, and then put <strong>1 card</strong> from your new hand on the bottom of the deck.
                </>
              ) : (
                <>
                  Mulligan #{mulliganCount} complete (1 card was placed on the bottom). You can keep this{' '}
                  <strong className="text-amber-400">{hand.length}-card hand</strong> or mulligan again.
                </>
              )}
            </p>

            {/* Hand cards display */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
              {hand.map(card => (
                <CardView key={card.id} card={card} size="md" />
              ))}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={onKeepHand}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-700/40 transition-all cursor-pointer active:scale-95"
              >
                <Check className="w-5 h-5" /> Keep Hand ({hand.length} Cards)
              </button>
              {hand.length > 1 && (
                <button
                  onClick={handleStartMulligan}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-lg shadow-amber-700/40 transition-all cursor-pointer active:scale-95"
                >
                  <RotateCcw className="w-5 h-5" /> Reset Hand & Mulligan
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm mb-1">
              <Sparkles className="w-4 h-4 animate-spin text-emerald-400" />
              <span>New Hand Reset Dealt!</span>
            </div>
            <p className="text-stone-300 text-sm text-center max-w-lg mb-4">
              Select <strong className="text-amber-400">1 card</strong> from your fresh hand to place on the bottom of the deck.
            </p>

            {/* Pick 1 card to bottom from the new hand reset */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
              {hand.map(card => {
                const isSelected = selectedCard?.id === card.id;
                return (
                  <div
                    key={card.id}
                    className="relative cursor-pointer transition-transform hover:scale-105"
                    onClick={() => {
                      sounds.playCardPlace();
                      setSelectedCard(card);
                    }}
                  >
                    <CardView card={card} size="md" isSelected={isSelected} />
                    {isSelected && (
                      <div className="absolute inset-0 bg-red-950/70 rounded-xl flex flex-col items-center justify-center text-red-300 font-bold text-xs pointer-events-none border-2 border-red-500">
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
                disabled={!selectedCard}
                onClick={handleConfirmBottomCard}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold shadow-lg transition-all ${
                  selectedCard
                    ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/40 cursor-pointer active:scale-95'
                    : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                }`}
              >
                <ArrowDown className="w-5 h-5" /> Confirm 1 Card to Bottom
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
