import React from 'react';
import { Card, PlayedActionCard } from '../types/game';
import { getUniversalPoints } from '../utils/cardUtils';
import { Zap } from 'lucide-react';

interface DiamondTargetModalProps {
  diamondCard: Card;
  playedActions: PlayedActionCard[];
  onConfirmBoost: (targetActionId: string) => void;
  onCancel: () => void;
}

export const DiamondTargetModal: React.FC<DiamondTargetModalProps> = ({
  diamondCard,
  playedActions,
  onConfirmBoost,
  onCancel,
}) => {
  const points = getUniversalPoints(diamondCard);

  // Eligible actions: not heal ("Heals cannot be debuffed and cannot be upgraded since they are used instantly")
  const eligibleActions = playedActions.filter(a => a.heartDeclaration !== 'heal');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-stone-900 border-2 border-amber-500/80 rounded-2xl p-6 shadow-2xl text-stone-100 flex flex-col items-center">
        <Zap className="w-8 h-8 text-amber-400 mb-1" />
        <h3 className="text-xl font-serif font-bold text-amber-400">Action Overcharge</h3>
        <p className="text-xs text-stone-300 text-center mb-4">
          Diamonds grant an Action Overcharge. Select one of your played action cards to boost by <strong className="text-amber-400">+{points} points</strong>.
        </p>

        {eligibleActions.length === 0 ? (
          <div className="text-stone-400 italic text-xs text-center p-4 bg-stone-800/60 rounded-xl mb-4 w-full">
            No eligible action card played yet to boost (Heals cannot be upgraded). Play an Attack or Block first!
          </div>
        ) : (
          <div className="flex flex-col gap-2 w-full mb-4">
            {eligibleActions.map(action => (
              <button
                key={action.id}
                onClick={() => onConfirmBoost(action.id)}
                className="flex items-center justify-between p-3 rounded-xl bg-stone-800 border border-amber-500/40 hover:bg-amber-950/50 hover:border-amber-400 text-stone-200 cursor-pointer text-xs transition-all"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-amber-300">{action.card.name}</span>
                  <span className="text-stone-400 capitalize">({action.card.suit})</span>
                </div>
                <div className="text-stone-300">
                  {action.finalPoints} pts → <strong className="text-emerald-400">{action.finalPoints + points} pts</strong>
                </div>
              </button>
            ))}
          </div>
        )}

        <button
          onClick={onCancel}
          className="text-stone-400 hover:text-stone-200 text-xs underline cursor-pointer"
        >
          Cancel play
        </button>
      </div>
    </div>
  );
};
