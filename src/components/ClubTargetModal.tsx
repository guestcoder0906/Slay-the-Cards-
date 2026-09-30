import React, { useState } from 'react';
import { Card, PlayedActionCard, PlayerState } from '../types/game';
import { CardView } from './CardView';
import { getUniversalPoints } from '../utils/cardUtils';
import { Skull, Eye, Hand, Scissors, Trash2, ShieldAlert, Sparkles, Shield } from 'lucide-react';

interface ClubTargetModalProps {
  clubCard: Card;
  opponentState: PlayerState;
  onConfirmDebuffAction: (targetActionId?: string) => void;
  onConfirmDestroyEquipment: () => void;
  onConfirmJackDiscard: (targetCardId?: string) => void;
  onConfirmQueenDiscard: (targetCardId: string) => void;
  onConfirmKingSteal: (targetCardId?: string, asMinion?: boolean) => void;
  onCancel: () => void;
}

export const ClubTargetModal: React.FC<ClubTargetModalProps> = ({
  clubCard,
  opponentState,
  onConfirmDebuffAction,
  onConfirmDestroyEquipment,
  onConfirmJackDiscard,
  onConfirmQueenDiscard,
  onConfirmKingSteal,
  onCancel,
}) => {
  const points = getUniversalPoints(clubCard);
  const isFace = clubCard.rank === 11 || clubCard.rank === 12 || clubCard.rank === 13;

  // Mode tab: 'disruption' or 'debuff'
  const [mode, setMode] = useState<'disruption' | 'debuff'>('disruption');
  const [selectedHandCardId, setSelectedHandCardId] = useState<string | null>(null);

  // Eligible actions: not heal ("Heals cannot be debuffed and cannot be upgraded since they are used instantly")
  const debuffableActions = opponentState.playedActions.filter(
    a => a.heartDeclaration !== 'heal'
  );

  const canDestroyEquipment =
    opponentState.minion?.equippedPermanent &&
    points >= opponentState.minion.equippedPermanent.tierPoints;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 sm:p-4">
      <div className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto scrollbar-thin bg-stone-900 border-2 border-emerald-600/80 rounded-3xl p-4 sm:p-6 shadow-2xl text-stone-100 flex flex-col items-center">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <Scissors className="w-7 h-7 text-emerald-400" />
          <h3 className="text-xl font-serif font-bold text-emerald-400">
            {clubCard.name} ({points} Universal Points)
          </h3>
        </div>

        <p className="text-xs text-stone-300 text-center mb-4">
          Choose how you wish to deploy this Club card: activate its unique <strong>Disruption Skill</strong> or use it as a powerful <strong>Action Debuff</strong>.
        </p>

        {/* Tab Toggle: Disruption vs Pure Debuff */}
        <div className="flex bg-stone-950 p-1 rounded-xl border border-stone-800 mb-5 w-full max-w-md">
          <button
            onClick={() => setMode('disruption')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              mode === 'disruption'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            {isFace ? 'Disruption Skill' : 'Shatter Equipment'}
          </button>
          <button
            onClick={() => setMode('debuff')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              mode === 'debuff'
                ? 'bg-amber-600 text-stone-950 font-black shadow'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Action Debuff (-{points} Pts)
          </button>
        </div>

        {/* ---------------- MODE: ACTION DEBUFF ---------------- */}
        {mode === 'debuff' && (
          <div className="w-full flex flex-col items-center gap-4 mb-4">
            <div className="text-xs text-stone-300 text-center bg-stone-950/80 p-3 rounded-xl border border-stone-800 w-full">
              🛡️ <strong>Debuff Option:</strong> Weakens opponent actions by <strong className="text-amber-400">-{points} points</strong>. You can target a specific played action, or commit as a general debuff to intercept incoming attacks!
            </div>

            {/* Target Specific Opponent Action */}
            <div className="w-full">
              <div className="text-xs font-bold text-stone-300 mb-2">Target Opponent's Active Card:</div>
              {debuffableActions.length === 0 ? (
                <div className="text-xs text-stone-500 italic p-3 bg-stone-950 rounded-xl text-center border border-stone-800/60">
                  No active opponent action cards on table to debuff (or opponent only played Heal).
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 justify-center">
                  {debuffableActions.map(action => (
                    <button
                      key={action.id}
                      onClick={() => onConfirmDebuffAction(action.id)}
                      className="flex items-center gap-2 p-2.5 rounded-xl bg-stone-800 border border-emerald-500/40 hover:bg-emerald-950 hover:border-emerald-400 text-stone-200 cursor-pointer text-xs transition-colors"
                    >
                      <span className="font-bold text-emerald-400">
                        {action.card.name} ({action.finalPoints} pts)
                      </span>
                      <span className="text-[10px] text-stone-400">
                        → {Math.max(0, action.finalPoints - points)} pts
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* General Debuff Commitment */}
            <div className="w-full pt-2 border-t border-stone-800 flex flex-col items-center">
              <button
                onClick={() => onConfirmDebuffAction(undefined)}
                className="w-full max-w-sm py-2.5 px-4 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-black text-xs rounded-xl shadow-lg shadow-amber-600/30 cursor-pointer transition-all active:scale-95"
              >
                Apply as Debuff (-{points} Pts)
              </button>
              <span className="text-[10px] text-stone-400 mt-1 text-center max-w-md">
                {debuffableActions.length === 0
                  ? `Places debuff on table. You will choose which card to weaken once your opponent reveals their cards before combat resolves!`
                  : `Or apply as general debuff to automatically weaken opponent's highest action card.`}
              </span>
            </div>
          </div>
        )}

        {/* ---------------- MODE: DISRUPTION SKILL ---------------- */}
        {mode === 'disruption' && (
          <div className="w-full flex flex-col items-center">
            {/* Jack of Clubs (Rank 11) */}
            {clubCard.rank === 11 && (
              <div className="flex flex-col items-center w-full">
                <Skull className="w-8 h-8 text-emerald-400 mb-1" />
                <h4 className="text-base font-serif font-bold text-emerald-300">Jack of Clubs: Ambush Discard</h4>
                <p className="text-xs text-stone-300 text-center mb-4">
                  Inspect {opponentState.name}'s hand and force them to discard 1 chosen card.
                </p>

                <div className="flex flex-wrap justify-center gap-3 mb-4 max-h-52 overflow-y-auto p-2 w-full bg-stone-950/60 rounded-2xl border border-stone-800">
                  {opponentState.hand.length === 0 ? (
                    <span className="text-stone-400 italic text-xs py-4">Opponent hand is empty!</span>
                  ) : (
                    opponentState.hand.map(card => {
                      const isSelected = selectedHandCardId === card.id;
                      return (
                        <div
                          key={card.id}
                          onClick={() => setSelectedHandCardId(card.id)}
                          className="cursor-pointer transition-transform hover:scale-105"
                        >
                          <CardView card={card} size="sm" isSelected={isSelected} />
                        </div>
                      );
                    })
                  )}
                </div>

                <button
                  disabled={!selectedHandCardId && opponentState.hand.length > 0}
                  onClick={() => {
                    onConfirmJackDiscard(selectedHandCardId || undefined);
                  }}
                  className={`flex items-center gap-2 px-6 py-2.5 font-bold text-xs rounded-xl transition-all ${
                    selectedHandCardId || opponentState.hand.length === 0
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-lg shadow-emerald-700/40 active:scale-95'
                      : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                  }`}
                >
                  <Trash2 className="w-4 h-4" /> Force Discard Selected Card
                </button>
              </div>
            )}

            {/* Queen of Clubs (Rank 12) */}
            {clubCard.rank === 12 && (
              <div className="flex flex-col items-center w-full">
                <Eye className="w-8 h-8 text-emerald-400 mb-1" />
                <h4 className="text-base font-serif font-bold text-emerald-300">Queen of Clubs: Mind Vision</h4>
                <p className="text-xs text-stone-300 text-center mb-4">
                  Inspect opponent's hand and force them to discard 1 chosen card.
                </p>

                <div className="flex flex-wrap justify-center gap-3 mb-4 max-h-52 overflow-y-auto p-2 w-full bg-stone-950/60 rounded-2xl border border-stone-800">
                  {opponentState.hand.length === 0 ? (
                    <span className="text-stone-400 italic text-xs py-4">Opponent hand is empty!</span>
                  ) : (
                    opponentState.hand.map(card => {
                      const isSelected = selectedHandCardId === card.id;
                      return (
                        <div
                          key={card.id}
                          onClick={() => setSelectedHandCardId(card.id)}
                          className="cursor-pointer"
                        >
                          <CardView card={card} size="sm" isSelected={isSelected} />
                        </div>
                      );
                    })
                  )}
                </div>

                <button
                  disabled={!selectedHandCardId && opponentState.hand.length > 0}
                  onClick={() => {
                    if (selectedHandCardId) onConfirmQueenDiscard(selectedHandCardId);
                  }}
                  className={`flex items-center gap-2 px-6 py-2.5 font-bold text-xs rounded-xl transition-all ${
                    selectedHandCardId || opponentState.hand.length === 0
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-lg shadow-emerald-700/40'
                      : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                  }`}
                >
                  <Trash2 className="w-4 h-4" /> Force Discard Selected Card
                </button>
              </div>
            )}

            {/* King of Clubs (Rank 13) */}
            {clubCard.rank === 13 && (
              <div className="flex flex-col items-center w-full">
                <Hand className="w-8 h-8 text-emerald-400 mb-1" />
                <h4 className="text-base font-serif font-bold text-emerald-300">King of Clubs: Grand Heist</h4>
                <p className="text-xs text-stone-300 text-center mb-4">
                  Inspect opponent's hand. Choose 1 card to steal and play this round for <strong>0 Energy (Free)</strong>, or pass with 1 energy refunded.
                </p>

                <div className="flex flex-wrap justify-center gap-3 mb-4 max-h-52 overflow-y-auto p-2 w-full bg-stone-950/60 rounded-2xl border border-stone-800">
                  {opponentState.hand.length === 0 ? (
                    <span className="text-stone-400 italic text-xs py-4">Opponent hand is empty!</span>
                  ) : (
                    opponentState.hand.map(card => {
                      const isSelected = selectedHandCardId === card.id;
                      return (
                        <div
                          key={card.id}
                          onClick={() => setSelectedHandCardId(card.id)}
                          className="cursor-pointer"
                        >
                          <CardView card={card} size="sm" isSelected={isSelected} />
                        </div>
                      );
                    })
                  )}
                </div>

                {(() => {
                  const selectedCard = opponentState.hand.find(c => c.id === selectedHandCardId);
                  const isAce = selectedCard?.rank === 1;

                  return (
                    <div className="flex flex-wrap gap-2 justify-center">
                      <button
                        onClick={() => onConfirmKingSteal(undefined)}
                        className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs rounded-xl cursor-pointer"
                      >
                        Pass (Discard Only, 1 Energy)
                      </button>
                      <button
                        disabled={!selectedHandCardId}
                        onClick={() => {
                          if (selectedHandCardId) onConfirmKingSteal(selectedHandCardId, false);
                        }}
                        className={`flex items-center gap-2 px-5 py-2 font-bold text-xs rounded-xl transition-all ${
                          selectedHandCardId
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-lg shadow-emerald-700/40 active:scale-95'
                            : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                        }`}
                      >
                        <Hand className="w-4 h-4" /> Steal & Play This Round (Free / 0⚡)
                      </button>
                      {isAce && (
                        <button
                          onClick={() => {
                            if (selectedHandCardId) onConfirmKingSteal(selectedHandCardId, true);
                          }}
                          className="flex items-center gap-2 px-5 py-2 font-bold text-xs rounded-xl bg-blue-600 hover:bg-blue-500 text-white cursor-pointer shadow-lg shadow-blue-700/40 transition-all active:scale-95 border border-blue-400/50"
                        >
                          <Shield className="w-4 h-4 text-blue-200" /> Steal & Play as Minion (Free / 0⚡)
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Numbered Clubs (Rank 1-10): Shatter Equipment Permanent */}
            {!isFace && (
              <div className="flex flex-col items-center w-full">
                <Scissors className="w-8 h-8 text-emerald-400 mb-2" />
                <h4 className="text-base font-serif font-bold text-emerald-300">Shatter Equipment Permanent</h4>
                <p className="text-xs text-stone-300 text-center mb-4">
                  Clubs can shatter an attached equipment permanent if club points ({points}) ≥ equipment tier.
                </p>

                {opponentState.minion?.equippedPermanent ? (
                  <div className="p-4 bg-stone-950 rounded-2xl border border-amber-600/40 text-center w-full max-w-sm mb-4">
                    <div className="text-xs text-stone-300 mb-2">
                      Opponent Equipped: <strong className="text-amber-400">{opponentState.minion.equippedPermanent.card.name}</strong> (Tier {opponentState.minion.equippedPermanent.tierPoints})
                    </div>
                    {canDestroyEquipment ? (
                      <button
                        onClick={onConfirmDestroyEquipment}
                        className="px-5 py-2.5 bg-red-700 hover:bg-red-600 text-white font-bold text-xs rounded-xl cursor-pointer shadow-lg shadow-red-700/40 transition-all active:scale-95"
                      >
                        💥 Shatter & Destroy Equipment!
                      </button>
                    ) : (
                      <div className="text-[11px] text-amber-500/80 italic">
                        Club points ({points}) are less than equipment tier ({opponentState.minion.equippedPermanent.tierPoints}). Cannot destroy.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-stone-950 rounded-2xl border border-stone-800 text-center text-xs text-stone-500 italic mb-4 w-full">
                    Opponent does not have an active equipment permanent on table.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer Cancel */}
        <div className="mt-5 pt-3 border-t border-stone-800 w-full flex justify-center">
          <button
            onClick={onCancel}
            className="text-stone-400 hover:text-stone-200 text-xs underline cursor-pointer"
          >
            Cancel Card Play
          </button>
        </div>
      </div>
    </div>
  );
};
