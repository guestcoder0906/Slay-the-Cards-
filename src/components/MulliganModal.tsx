import React, { useState } from 'react';
import { Card } from '../types/game';
import { CardView } from './CardView';
import { sounds } from '../utils/audio';
import { RotateCcw, Check, ArrowDown, Sparkles, Globe } from 'lucide-react';

interface MulliganModalProps {
  hand: Card[];
  mulliganCount: number;
  onMulliganReset: () => void;
  onPutCardsToBottom: (cards: Card[]) => void;
  onKeepHand: () => void;
  onOpenMultiplayer?: () => void;
}

export const MulliganModal: React.FC<MulliganModalProps> = ({
  hand,
  mulliganCount,
  onMulliganReset,
  onPutCardsToBottom,
  onKeepHand,
  onOpenMultiplayer,
}) => {
  const cardsNeededToBottom = mulliganCount + 1;
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  const [step, setStep] = useState<'decision' | 'pick_bottom'>('decision');

  const handleStartMulligan = () => {
    sounds.playShuffle();
    onMulliganReset();
    setStep('pick_bottom');
    setSelectedCards([]);
  };

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

  const handleConfirmBottomCards = () => {
    if (selectedCards.length === cardsNeededToBottom) {
      sounds.playCardRotate();
      onPutCardsToBottom(selectedCards);
      setSelectedCards([]);
      setStep('decision');
    }
  };

  const canMulliganAgain = mulliganCount < 4;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4">
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto scrollbar-thin bg-stone-900 border-2 border-amber-600/70 rounded-2xl p-4 sm:p-6 shadow-2xl text-stone-100 flex flex-col items-center">
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
                  shuffle your cards back, draw a fresh 5-card reset, and then put{' '}
                  <strong className="text-amber-400">1 card</strong> from your new hand on the bottom of the deck.
                </>
              ) : (
                <>
                  Mulligan #{mulliganCount} complete ({mulliganCount} card{mulliganCount > 1 ? 's were' : ' was'} placed on bottom).
                  You can keep this <strong className="text-amber-400">{hand.length}-card hand</strong> or mulligan again
                  {canMulliganAgain && (
                    <> (putting <strong className="text-amber-400">+{cardsNeededToBottom} cards</strong> on the bottom after a 5-card reset)</>
                  )}.
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
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={onKeepHand}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-700/40 transition-all cursor-pointer active:scale-95"
              >
                <Check className="w-5 h-5" /> Keep Hand ({hand.length} Cards)
              </button>
              {canMulliganAgain && (
                <button
                  onClick={handleStartMulligan}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-lg shadow-amber-700/40 transition-all cursor-pointer active:scale-95"
                >
                  <RotateCcw className="w-5 h-5" /> Reset Hand & Mulligan ({cardsNeededToBottom} to bottom)
                </button>
              )}
              {onOpenMultiplayer && (
                <button
                  onClick={onOpenMultiplayer}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-emerald-400 font-bold border border-emerald-500/40 transition-all cursor-pointer active:scale-95 text-xs"
                >
                  <Globe className="w-4 h-4" /> Live Multiplayer
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm mb-1">
              <Sparkles className="w-4 h-4 animate-spin text-emerald-400" />
              <span>New 5-Card Hand Reset Dealt!</span>
            </div>
            <p className="text-stone-300 text-sm text-center max-w-lg mb-4">
              Select <strong className="text-amber-400">{cardsNeededToBottom} card{cardsNeededToBottom > 1 ? 's' : ''}</strong> from your fresh hand to place on the bottom of the deck.
              <span className="block text-xs text-amber-300/80 mt-1 font-semibold">
                ({selectedCards.length} / {cardsNeededToBottom} selected)
              </span>
            </p>

            {/* Pick cardsNeededToBottom cards to bottom from the new hand reset */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
              {hand.map(card => {
                const isSelected = selectedCards.some(c => c.id === card.id);
                return (
                  <div
                    key={card.id}
                    className="relative cursor-pointer transition-transform hover:scale-105"
                    onClick={() => toggleSelectCard(card)}
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
                disabled={selectedCards.length !== cardsNeededToBottom}
                onClick={handleConfirmBottomCards}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold shadow-lg transition-all ${
                  selectedCards.length === cardsNeededToBottom
                    ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/40 cursor-pointer active:scale-95'
                    : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                }`}
              >
                <ArrowDown className="w-5 h-5" /> Confirm {cardsNeededToBottom} Card{cardsNeededToBottom > 1 ? 's' : ''} to Bottom
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
