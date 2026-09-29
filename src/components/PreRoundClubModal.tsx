import React, { useState } from 'react';
import { Card, PlayerState } from '../types/game';
import { CardView } from './CardView';
import { isFaceCard, getCardEnergyCost, getUniversalPoints } from '../utils/cardUtils';
import { Scissors, Sparkles, ShieldAlert, ArrowRight, ShieldCheck } from 'lucide-react';

interface PreRoundClubModalProps {
  player: PlayerState;
  opponent: PlayerState;
  roundNumber: number;
  onApplyDisruption: (card: Card) => void;
  onApplyDebuff: (card: Card) => void;
  onPass: () => void;
}

export const PreRoundClubModal: React.FC<PreRoundClubModalProps> = ({
  player,
  opponent,
  roundNumber,
  onApplyDisruption,
  onApplyDebuff,
  onPass,
}) => {
  const faceClubs = player.hand.filter(c => c.suit === 'clubs' && isFaceCard(c.rank));
  const [selectedCardId, setSelectedCardId] = useState<string>(faceClubs[0]?.id || '');

  const selectedCard = faceClubs.find(c => c.id === selectedCardId) || faceClubs[0];

  if (!selectedCard) {
    return null;
  }

  const energyCost = getCardEnergyCost(selectedCard);
  const hasEnergy = player.energy >= energyCost;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto scrollbar-thin bg-stone-900 border-2 border-emerald-500 rounded-3xl p-4 sm:p-6 shadow-2xl text-stone-100 flex flex-col items-center">
        {/* Glow Header */}
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 rounded-xl bg-emerald-950 border border-emerald-500/50 text-emerald-400">
            <Scissors className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xl font-serif font-black text-emerald-300">
              Pre-Round Face Club Opportunity!
            </h3>
            <p className="text-[11px] text-stone-400">
              Round {roundNumber} Initiative Phase for {player.name}
            </p>
          </div>
        </div>

        <div className="text-xs text-stone-300 text-center my-3 bg-stone-950/80 p-3 rounded-2xl border border-stone-800 leading-relaxed">
          ⚡ <strong>Tactical Opportunity:</strong> You hold a <strong>Face Club Card</strong>! Official rules allow you to strike before the round begins. You can apply its <strong>Disruption Skill</strong> (discard/steal) or commit it as an immediate <strong>4-Point Action Debuff</strong>!
        </div>

        {/* Card Selector if player has multiple face clubs */}
        {faceClubs.length > 1 && (
          <div className="flex gap-2 mb-4">
            {faceClubs.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedCardId(c.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedCard.id === c.id
                    ? 'bg-emerald-600 text-white shadow-lg'
                    : 'bg-stone-800 text-stone-400 hover:text-stone-200'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        {/* Selected Card Spotlight */}
        <div className="flex flex-col sm:flex-row items-center gap-4 my-2 p-4 bg-stone-950 rounded-2xl border border-emerald-600/30 w-full justify-center">
          <CardView card={selectedCard} size="md" />

          <div className="flex flex-col gap-1 text-xs">
            <span className="font-serif font-black text-amber-300 text-base">
              {selectedCard.name}
            </span>
            <span className="text-stone-400">Universal Value: <strong className="text-emerald-400">4 Points</strong></span>
            <span className="text-stone-400">Energy Required: <strong className="text-blue-400">{energyCost} Energy</strong></span>
            <span className="text-stone-400">
              Target Opponent: <strong className="text-stone-200">{opponent.name}</strong> ({opponent.hand.length} cards in hand)
            </span>
          </div>
        </div>

        {/* Action Choice Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full my-4">
          {/* Option 1: Disruption Skill */}
          <button
            disabled={!hasEnergy}
            onClick={() => onApplyDisruption(selectedCard)}
            className={`flex flex-col items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer active:scale-95 ${
              hasEnergy
                ? 'bg-emerald-950/70 border-emerald-500/60 hover:bg-emerald-900/80 text-emerald-200 shadow-lg shadow-emerald-900/30'
                : 'bg-stone-800 border-stone-700 opacity-50 cursor-not-allowed text-stone-500'
            }`}
          >
            <div className="flex flex-col items-center gap-1 text-center">
              <div className="p-2 rounded-xl bg-emerald-900/80 border border-emerald-500/40 text-emerald-300">
                <Sparkles className="w-5 h-5 text-emerald-400" />
              </div>
              <span className="font-black text-xs text-emerald-300 mt-1">Disruption Skill</span>
              <span className="text-[10px] text-stone-300 text-center leading-tight">
                {selectedCard.rank === 11 && "Inspect opponent's hand & force 1 chosen discard"}
                {selectedCard.rank === 12 && "Inspect opponent's hand & force 1 chosen discard"}
                {selectedCard.rank === 13 && "Inspect hand & steal 1 card to play"}
              </span>
            </div>
            <span className="text-[9px] mt-2 px-2 py-0.5 rounded-full bg-emerald-800/60 text-emerald-200 font-bold border border-emerald-500/40">
              Costs {energyCost}⚡
            </span>
          </button>

          {/* Option 2: 4-Point Debuff */}
          <button
            disabled={!hasEnergy}
            onClick={() => onApplyDebuff(selectedCard)}
            className={`flex flex-col items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer active:scale-95 ${
              hasEnergy
                ? 'bg-amber-950/70 border-amber-500/60 hover:bg-amber-900/80 text-amber-200 shadow-lg shadow-amber-900/30'
                : 'bg-stone-800 border-stone-700 opacity-50 cursor-not-allowed text-stone-500'
            }`}
          >
            <div className="flex flex-col items-center gap-1 text-center">
              <div className="p-2 rounded-xl bg-amber-900/80 border border-amber-500/40 text-amber-300">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
              </div>
              <span className="font-black text-xs text-amber-300 mt-1">Apply 4-Point Debuff</span>
              <span className="text-[10px] text-stone-300 text-center leading-tight">
                Commit immediately to nullify 4 points from opponent's upcoming attack/block
              </span>
            </div>
            <span className="text-[9px] mt-2 px-2 py-0.5 rounded-full bg-amber-800/60 text-amber-200 font-bold border border-amber-500/40">
              Costs {energyCost}⚡
            </span>
          </button>

          {/* Option 3: Keep in Hand (Do not play pre-round, save for debuff later) */}
          <button
            onClick={onPass}
            className="flex flex-col items-center justify-between p-3.5 rounded-2xl border border-stone-700 bg-stone-950/80 hover:bg-stone-800/90 text-stone-200 transition-all cursor-pointer active:scale-95 group shadow-lg"
          >
            <div className="flex flex-col items-center gap-1 text-center">
              <div className="p-2 rounded-xl bg-stone-800 border border-stone-600 text-stone-300 group-hover:border-emerald-400 group-hover:text-emerald-300 transition-colors">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="font-black text-xs text-stone-100 group-hover:text-emerald-300 mt-1 transition-colors">
                Keep in Hand (Pass)
              </span>
              <span className="text-[10px] text-stone-400 text-center leading-tight">
                Do not play now. Keep in hand to optionally play as a Debuff or Action later during your turn
              </span>
            </div>
            <span className="text-[9px] mt-2 px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 font-bold border border-stone-700">
              0⚡ Cost (Free)
            </span>
          </button>
        </div>

        {/* Quick summary footer */}
        <div className="text-[11px] text-stone-400 text-center flex items-center justify-center gap-2">
          <span>Passing saves your energy and lets you tactically play this card as a debuff during your turn.</span>
        </div>
      </div>
    </div>
  );
};
