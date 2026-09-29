import React from 'react';
import { Card, HeartDeclaration } from '../types/game';
import { CardView } from './CardView';
import { getUniversalPoints } from '../utils/cardUtils';
import { Shield, Heart, Sparkles } from 'lucide-react';

interface HeartChoiceModalProps {
  card: Card;
  onDeclare: (declaration: HeartDeclaration) => void;
  onCancel: () => void;
}

export const HeartChoiceModal: React.FC<HeartChoiceModalProps> = ({ card, onDeclare, onCancel }) => {
  const points = getUniversalPoints(card);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4">
      <div className="relative w-full max-w-md max-h-[92vh] overflow-y-auto scrollbar-thin bg-stone-900 border-2 border-rose-600/80 rounded-2xl p-4 sm:p-6 shadow-2xl text-stone-100 flex flex-col items-center">
        <div className="flex items-center gap-2 mb-2 text-rose-500">
          <Heart className="w-6 h-6 fill-rose-500" />
          <h3 className="text-xl font-serif font-bold text-rose-400">Declare Heart Effect</h3>
        </div>

        <p className="text-stone-300 text-xs text-center mb-4">
          Hearts provide Defense or Recovery. Declare your mode immediately upon play:
        </p>

        <div className="mb-6 flex justify-center">
          <CardView card={card} size="md" />
        </div>

        <div className="grid grid-cols-2 gap-3 w-full mb-4">
          {/* Block Option */}
          <button
            onClick={() => onDeclare('block')}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-blue-950/60 border border-blue-500/60 hover:bg-blue-900/60 hover:border-blue-400 text-stone-100 transition-all cursor-pointer group"
          >
            <Shield className="w-7 h-7 text-blue-400 mb-1 group-hover:scale-110 transition-transform" />
            <span className="font-bold text-sm text-blue-300">Declare Block</span>
            <span className="text-[11px] text-blue-200/80 text-center mt-1">
              Absorbs <strong className="text-white">+{points}</strong> incoming attack pts (protects Minion first)
            </span>
          </button>

          {/* Heal Option */}
          <button
            onClick={() => onDeclare('heal')}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-rose-950/60 border border-rose-500/60 hover:bg-rose-900/60 hover:border-rose-400 text-stone-100 transition-all cursor-pointer group"
          >
            <Sparkles className="w-7 h-7 text-rose-400 mb-1 group-hover:scale-110 transition-transform" />
            <span className="font-bold text-sm text-rose-300">Instant Heal</span>
            <span className="text-[11px] text-rose-200/80 text-center mt-1">
              Instantly restores <strong className="text-white">+{points}</strong> HP to Fighter & discards card
            </span>
          </button>
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
