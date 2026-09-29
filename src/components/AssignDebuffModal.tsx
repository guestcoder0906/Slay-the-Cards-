import React from 'react';
import { PlayedActionCard, PlayerState } from '../types/game';
import { CardView } from './CardView';
import { Scissors, Target, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';

interface AssignDebuffModalProps {
  clubAction: PlayedActionCard;
  opponent: PlayerState;
  onConfirmTarget: (targetActionId: string) => void;
  onConfirmDestroyEquipment?: () => void;
  onAutoTargetHighest: () => void;
}

export const AssignDebuffModal: React.FC<AssignDebuffModalProps> = ({
  clubAction,
  opponent,
  onConfirmTarget,
  onConfirmDestroyEquipment,
  onAutoTargetHighest,
}) => {
  const points = clubAction.finalPoints;

  // Eligible actions: not heal ("Heals cannot be debuffed and cannot be upgraded since they are used instantly")
  const debuffableActions = opponent.playedActions.filter(
    a => a.heartDeclaration !== 'heal' && a.finalPoints > 0
  );

  const canDestroyEquipment =
    opponent.minion?.equippedPermanent &&
    points >= opponent.minion.equippedPermanent.tierPoints;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto scrollbar-thin bg-stone-900 border-2 border-emerald-500 rounded-3xl p-4 sm:p-6 shadow-2xl text-stone-100 flex flex-col items-center">
        {/* Glow Header */}
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 rounded-xl bg-emerald-950 border border-emerald-500/50 text-emerald-400">
            <Target className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xl font-serif font-black text-emerald-300">
              Assign Your Pre-Committed Debuff!
            </h3>
            <p className="text-[11px] text-stone-400">
              Target Selection Phase Before Round Combat Resolves
            </p>
          </div>
        </div>

        <div className="text-xs text-stone-300 text-center my-3 bg-stone-950/80 p-3 rounded-2xl border border-stone-800 leading-relaxed">
          ⚡ <strong>Tabletop Rule:</strong> You played <strong className="text-amber-300">{clubAction.card.name}</strong> (-{points} Points) while going first. Now that <strong>{opponent.name}</strong> has revealed their committed actions, select which card to weaken before attacks clash!
        </div>

        {/* Club Card Spotlight */}
        <div className="flex items-center gap-4 my-2 p-3 bg-stone-950 rounded-2xl border border-emerald-600/30 w-full justify-center">
          <CardView card={clubAction.card} size="sm" />
          <div className="flex flex-col text-xs">
            <span className="font-bold text-emerald-300 text-sm">{clubAction.card.name}</span>
            <span className="text-stone-400">Debuff Value: <strong className="text-amber-400">-{points} Points</strong></span>
            <span className="text-[11px] text-stone-500">Will strip up to {points} attack or defense points</span>
          </div>
        </div>

        {/* Target Options List */}
        <div className="w-full my-4 flex flex-col gap-3">
          <div className="text-xs font-bold text-stone-300 flex items-center justify-between">
            <span>Select Opponent Action to Debuff:</span>
            {debuffableActions.length > 0 && (
              <button
                onClick={onAutoTargetHighest}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold underline cursor-pointer"
              >
                <Sparkles className="w-3 h-3" /> Auto-target highest
              </button>
            )}
          </div>

          {debuffableActions.length === 0 ? (
            <div className="p-4 bg-stone-950 rounded-2xl border border-stone-800 text-center text-xs text-stone-500 italic">
              Opponent played no debuffable actions (e.g., only Heals or pass). The debuff will absorb any residual damage!
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
              {debuffableActions.map(action => (
                <button
                  key={action.id}
                  onClick={() => onConfirmTarget(action.id)}
                  className="flex items-center justify-between p-3 rounded-2xl bg-stone-950 border border-emerald-500/40 hover:bg-emerald-950/60 hover:border-emerald-400 text-stone-200 cursor-pointer text-xs transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base">
                      {action.card.suit === 'spades' ? '⚔️' : action.card.suit === 'hearts' ? '🛡️' : '✂️'}
                    </span>
                    <div className="text-left">
                      <div className="font-bold text-emerald-300">{action.card.name}</div>
                      <div className="text-[10px] text-stone-400 capitalize">
                        {action.card.suit} {action.heartDeclaration ? `(${action.heartDeclaration})` : 'Action'}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-stone-300">
                      <span className="font-bold">{action.finalPoints} pts</span>
                      <span className="text-stone-500 mx-1">→</span>
                      <strong className="text-amber-400">
                        {Math.max(0, action.finalPoints - points)} pts
                      </strong>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-semibold">
                      Click to Debuff
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Destroy Equipment Option */}
          {opponent.minion?.equippedPermanent && onConfirmDestroyEquipment && (
            <div className="p-3 bg-stone-950 rounded-2xl border border-amber-600/40 flex items-center justify-between mt-1">
              <div>
                <div className="text-xs font-bold text-amber-300">Opponent Permanent Equipment:</div>
                <div className="text-[11px] text-stone-300">
                  {opponent.minion.equippedPermanent.card.name} (Tier {opponent.minion.equippedPermanent.tierPoints})
                </div>
              </div>
              {canDestroyEquipment ? (
                <button
                  onClick={onConfirmDestroyEquipment}
                  className="px-3 py-1.5 bg-red-700 hover:bg-red-600 text-white font-bold text-xs rounded-xl cursor-pointer shadow transition-all active:scale-95"
                >
                  💥 Shatter Equipment
                </button>
              ) : (
                <span className="text-[10px] text-stone-500 italic">
                  Requires {opponent.minion.equippedPermanent.tierPoints} pts to destroy
                </span>
              )}
            </div>
          )}
        </div>

        {/* Footer: Confirm / Proceed */}
        <div className="w-full pt-3 border-t border-stone-800 flex justify-center">
          <button
            onClick={onAutoTargetHighest}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl cursor-pointer shadow-lg shadow-emerald-700/40 transition-all active:scale-95"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Confirm & Resolve Combat</span>
          </button>
        </div>
      </div>
    </div>
  );
};
