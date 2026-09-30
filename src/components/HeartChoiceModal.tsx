import React from 'react';
import { Card, FighterUnit, HeartDeclaration, MinionUnit } from '../types/game';
import { CardView } from './CardView';
import { getUniversalPoints } from '../utils/cardUtils';
import { Shield, Heart, Sparkles } from 'lucide-react';

interface HeartChoiceModalProps {
  card: Card;
  fighter?: FighterUnit | null;
  minion?: MinionUnit | null;
  onDeclare: (declaration: HeartDeclaration, healTarget?: 'fighter' | 'minion') => void;
  onCancel: () => void;
}

export const HeartChoiceModal: React.FC<HeartChoiceModalProps> = ({
  card,
  fighter,
  minion,
  onDeclare,
  onCancel,
}) => {
  const points = getUniversalPoints(card);
  const hasDamagedMinion = Boolean(minion && minion.hp < minion.maxHp);
  const isFighterDamaged = Boolean(fighter && fighter.hp < fighter.maxHp);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4">
      <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto scrollbar-thin bg-stone-900 border-2 border-rose-600/80 rounded-2xl p-4 sm:p-6 shadow-2xl text-stone-100 flex flex-col items-center">
        <div className="flex items-center gap-2 mb-2 text-rose-500">
          <Heart className="w-6 h-6 fill-rose-500" />
          <h3 className="text-xl font-serif font-bold text-rose-400">Declare Heart Effect</h3>
        </div>

        <p className="text-stone-300 text-xs text-center mb-4">
          Hearts provide Defense or Recovery. Choose whether to absorb damage or restore health:
        </p>

        <div className="mb-5 flex justify-center">
          <CardView card={card} size="md" />
        </div>

        {/* Action Choice Buttons */}
        <div className={`grid gap-3 w-full mb-4 ${hasDamagedMinion ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2'}`}>
          {/* Block Option */}
          <button
            onClick={() => onDeclare('block')}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-blue-950/60 border border-blue-500/60 hover:bg-blue-900/60 hover:border-blue-400 text-stone-100 transition-all cursor-pointer group shadow-md hover:scale-[1.02]"
          >
            <Shield className="w-7 h-7 text-blue-400 mb-1 group-hover:scale-110 transition-transform" />
            <span className="font-bold text-sm text-blue-300">Declare Block</span>
            <span className="text-[11px] text-blue-200/80 text-center mt-1">
              Absorbs <strong className="text-white">+{points}</strong> incoming attack pts (protects Minion first)
            </span>
          </button>

          {/* Heal Fighter Option */}
          <button
            onClick={() => onDeclare('heal', 'fighter')}
            className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all cursor-pointer group shadow-md hover:scale-[1.02] ${
              isFighterDamaged || !hasDamagedMinion
                ? 'bg-rose-950/60 border-rose-500/60 hover:bg-rose-900/60 hover:border-rose-400 text-stone-100'
                : 'bg-stone-950/40 border-stone-800 text-stone-400 hover:border-rose-500/40'
            }`}
          >
            <Sparkles className="w-7 h-7 text-rose-400 mb-1 group-hover:scale-110 transition-transform" />
            <span className="font-bold text-sm text-rose-300">Heal Fighter</span>
            {fighter && (
              <span className="text-[10px] font-mono font-bold text-rose-400/90 mt-0.5">
                Current HP: {fighter.hp}/{fighter.maxHp}
              </span>
            )}
            <span className="text-[11px] text-rose-200/80 text-center mt-1">
              Restore <strong className="text-white">+{points}</strong> HP to Fighter Champion & discard card
            </span>
          </button>

          {/* Heal Damaged Minion Ace Option */}
          {hasDamagedMinion && minion && (
            <button
              onClick={() => onDeclare('heal', 'minion')}
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-emerald-950/70 border-2 border-emerald-400/80 hover:bg-emerald-900/70 hover:border-emerald-300 text-stone-100 transition-all cursor-pointer group shadow-lg shadow-emerald-950/50 hover:scale-[1.02] ring-2 ring-emerald-500/40"
            >
              <div className="relative mb-1">
                <Shield className="w-7 h-7 text-emerald-400 group-hover:scale-110 transition-transform" />
                <Sparkles className="w-3.5 h-3.5 text-amber-300 absolute -top-1 -right-1 animate-pulse" />
              </div>
              <span className="font-bold text-sm text-emerald-300">Heal 1/2 HP Ace</span>
              <span className="text-[10px] font-mono font-bold text-emerald-400 mt-0.5 px-1.5 py-0.5 rounded bg-emerald-900/80 border border-emerald-500/40">
                Ace: {minion.hp}/{minion.maxHp} HP ➔ 2/2 HP
              </span>
              <span className="text-[11px] text-emerald-200/90 text-center mt-1">
                Restore Ace Minion back to <strong className="text-white">full 2/2 HP</strong> & discard card
              </span>
            </button>
          )}
        </div>

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
