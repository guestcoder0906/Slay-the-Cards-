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

  // Eligible actions: not heal, not jokers, not diamonds, and not the diamond card itself
  const eligibleActions = playedActions.filter(
    a =>
      a.heartDeclaration !== 'heal' &&
      !a.isJokerAction &&
      a.card.suit !== 'diamonds' &&
      a.card.id !== diamondCard.id
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4">
      <div className="relative w-full max-w-md max-h-[92vh] overflow-y-auto scrollbar-thin bg-stone-900 border-2 border-amber-500/80 rounded-2xl p-4 sm:p-6 shadow-2xl text-stone-100 flex flex-col items-center">
        <Zap className="w-8 h-8 text-amber-400 mb-1" />
        <h3 className="text-xl font-serif font-bold text-amber-400">Action Overcharge</h3>
        <p className="text-xs text-stone-300 text-center mb-4">
          Diamonds grant an Action Overcharge. Choose one of your played actions to boost by{' '}
          <strong className="text-amber-400">+{points} points</strong>.
        </p>

        {eligibleActions.length === 0 ? (
          <div className="flex flex-col items-center gap-3 w-full my-2">
            <div className="text-stone-300 text-xs text-center p-4 bg-amber-950/40 border border-amber-600/40 rounded-xl w-full leading-relaxed">
              ⚡ <strong>No upgradeable cards on table yet!</strong>
              <div className="text-stone-400 text-[11px] mt-1.5">
                This +{points} Diamond Boost is saved on your battlefield and will <strong>automatically pop up</strong> right after you play an Attack, Block, or Debuff card!
              </div>
            </div>
            <button
              onClick={onCancel}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs rounded-xl shadow-lg cursor-pointer transition-all active:scale-95"
            >
              Continue (Will Auto-Show After Playing a Card)
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 w-full mb-4">
            {eligibleActions.map(action => (
              <button
                key={action.id}
                onClick={() => onConfirmBoost(action.id)}
                className="flex items-center justify-between p-3 rounded-xl bg-stone-800 border border-amber-500/40 hover:bg-amber-950/50 hover:border-amber-400 text-stone-200 cursor-pointer text-xs transition-all active:scale-98"
              >
                <div className="flex flex-col items-start gap-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-amber-300">{action.card.name}</span>
                    <span className="text-stone-400 text-[11px] capitalize">({action.card.suit})</span>
                  </div>
                  {action.boostedPoints > 0 && (
                    <span className="text-[10px] text-amber-400/90 font-medium">
                      Already boosted (+{action.boostedPoints} pts)
                    </span>
                  )}
                </div>
                <div className="text-stone-300 text-right">
                  <span className="text-stone-400 line-through mr-1">{action.finalPoints} pts</span>
                  <strong className="text-emerald-400 text-sm">
                    {action.finalPoints + points} pts
                  </strong>
                </div>
              </button>
            ))}
          </div>
        )}

        <button
          onClick={onCancel}
          className="text-stone-400 hover:text-stone-200 text-xs underline cursor-pointer mt-2"
        >
          {eligibleActions.length === 0 ? 'Close' : 'Cancel & Choose Later'}
        </button>
      </div>
    </div>
  );
};
