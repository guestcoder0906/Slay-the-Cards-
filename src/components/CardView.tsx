import React from 'react';
import { Card, CardSuit } from '../types/game';
import {
  getCardEnergyCost,
  getCardRotationAngle,
  getRankLabel,
  getUniversalPoints,
  isFaceCard,
  SUIT_NAMES,
  SUIT_SYMBOLS,
  SUIT_THEMES,
} from '../utils/cardUtils';
import { sounds } from '../utils/audio';

interface CardViewProps {
  card: Card;
  orientation?: 'vertical' | 'horizontal';
  hp?: number;
  maxHp?: number;
  isFaceDown?: boolean;
  isSelected?: boolean;
  isDraggable?: boolean;
  isPlayable?: boolean;
  showPoints?: boolean;
  showEnergy?: boolean;
  customBadge?: string;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  className?: string;
}

export const CardView: React.FC<CardViewProps> = ({
  card,
  orientation = 'vertical',
  hp,
  maxHp,
  isFaceDown = false,
  isSelected = false,
  isDraggable = false,
  isPlayable = true,
  showPoints = true,
  showEnergy = true,
  customBadge,
  size = 'md',
  onClick,
  onDragStart,
  className = '',
}) => {
  const isJoker = card.isJoker || card.suit === 'joker';
  const suitTheme = SUIT_THEMES[card.suit];
  const suitSymbol = SUIT_SYMBOLS[card.suit];
  const rankLabel = getRankLabel(card.rank);
  const points = getUniversalPoints(card);
  const energy = getCardEnergyCost(card);

  // Rotation angle for physical health tracking
  const rotationAngle = hp !== undefined && maxHp !== undefined ? getCardRotationAngle(hp, maxHp) : 0;
  const isDead = hp !== undefined && hp <= 0;

  // Base sizing
  const sizeClasses = {
    sm: 'w-16 h-24 text-xs',
    md: 'w-24 h-36 text-sm',
    lg: 'w-32 h-48 text-base',
  }[size];

  // Colors
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  const textColor = isJoker
    ? 'text-purple-700'
    : isRed
    ? 'text-rose-600'
    : 'text-slate-900';

  const handleDragStart = (e: React.DragEvent) => {
    if (!isDraggable) return;
    e.dataTransfer.setData('text/plain', JSON.stringify(card));
    e.dataTransfer.effectAllowed = 'move';
    sounds.playCardPlace();
    if (onDragStart) onDragStart(e);
  };

  if (isFaceDown || isDead) {
    return (
      <div
        className={`relative rounded-xl border-2 border-amber-900/60 shadow-xl overflow-hidden cursor-default transition-all duration-300 ${sizeClasses} ${className}`}
        style={{
          background: 'radial-gradient(circle, #78350f 0%, #451a03 100%)',
        }}
      >
        {/* Card back ornamental pattern */}
        <div className="absolute inset-1 border border-amber-500/30 rounded-lg flex items-center justify-center p-2">
          <div className="w-full h-full border border-dashed border-amber-400/40 rounded flex flex-col items-center justify-center text-amber-300/40">
            <span className="text-xl font-serif">🂠</span>
            {isDead && (
              <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest mt-1 bg-black/60 px-1 rounded">
                FALLEN
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      draggable={isDraggable}
      onDragStart={handleDragStart}
      onClick={() => {
        if (onClick) {
          sounds.playCardPlace();
          onClick();
        }
      }}
      style={{
        transform: `rotate(${rotationAngle}deg)`,
        transformOrigin: 'center center',
      }}
      className={`
        relative select-none rounded-xl bg-gradient-to-b from-stone-50 to-stone-100 dark:from-stone-100 dark:to-stone-200
        border-2 transition-all duration-300 shadow-md
        ${isSelected ? 'ring-4 ring-amber-400 scale-105 z-20 shadow-amber-400/50' : 'hover:shadow-lg'}
        ${isDraggable ? 'cursor-grab active:cursor-grabbing hover:-translate-y-1' : ''}
        ${!isPlayable ? 'opacity-35 grayscale contrast-75 cursor-not-allowed hover:shadow-none hover:translate-y-0' : ''}
        ${orientation === 'horizontal' ? 'rotate-90' : ''}
        ${isRed ? 'border-rose-300/80' : 'border-slate-400/80'}
        ${sizeClasses}
        ${className}
      `}
      title={`${card.name} (${SUIT_NAMES[card.suit]}) - ${points} Pts, ${energy} Energy`}
    >
      {/* Outer Card Border Glow */}
      <div className="absolute inset-0.5 rounded-lg border border-black/10 pointer-events-none" />

      {/* Top Left Corner Index */}
      <div className={`absolute top-1 left-1.5 flex flex-col items-center leading-none ${textColor}`}>
        <span className="font-extrabold tracking-tighter text-sm font-serif">{rankLabel}</span>
        <span className="text-xs">{suitSymbol}</span>
      </div>

      {/* Top Right Badges: Energy & Points */}
      <div className="absolute top-1 right-1 flex flex-col items-end gap-0.5">
        {showEnergy && (
          <span
            className="flex items-center justify-center w-4 h-4 rounded-full bg-blue-600 text-white font-bold text-[9px] shadow-sm"
            title={`${energy} Energy Cost`}
          >
            ⚡{energy}
          </span>
        )}
        {showPoints && !isJoker && (
          <span
            className="flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-black font-extrabold text-[9px] shadow-sm"
            title={`${points} Effect Points (Universal Table)`}
          >
            ★{points}
          </span>
        )}
      </div>

      {/* Center Art / Large Suit Symbol */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-1">
        {isJoker ? (
          <div className="flex flex-col items-center text-center">
            <span className="text-3xl text-purple-600 animate-pulse">🃏</span>
            <span className="text-[9px] font-black text-purple-900 tracking-wider">JOKER</span>
            <span className="text-[7px] text-purple-700 leading-tight">Halt Atk</span>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <span
              className={`text-3xl font-serif filter drop-shadow-sm ${textColor} ${
                isFaceCard(card.rank) ? 'scale-110' : ''
              }`}
            >
              {suitSymbol}
            </span>
            <span className="text-[9px] font-semibold text-stone-600 tracking-tight">
              {suitTheme.role}
            </span>
          </div>
        )}
      </div>

      {/* Bottom Right Corner Index (Inverted) */}
      <div
        className={`absolute bottom-1 right-1.5 flex flex-col items-center leading-none rotate-180 ${textColor}`}
      >
        <span className="font-extrabold tracking-tighter text-sm font-serif">{rankLabel}</span>
        <span className="text-xs">{suitSymbol}</span>
      </div>

      {/* Custom Label or Physical Rotation Indicator */}
      {customBadge && (
        <div className="absolute bottom-1 left-1.5">
          <span className="text-[8px] bg-black/75 text-amber-200 px-1 py-0.2 rounded font-mono">
            {customBadge}
          </span>
        </div>
      )}

      {/* HP Physical Angle Badge if unit */}
      {hp !== undefined && maxHp !== undefined && (
        <div className="absolute -bottom-2 inset-x-1 flex justify-center z-10">
          <span
            className={`px-1.5 py-0.5 rounded-full text-[9px] font-black border shadow-md ${
              hp > 1
                ? 'bg-emerald-600 text-white border-emerald-400'
                : 'bg-rose-600 text-white border-rose-400 animate-bounce'
            }`}
          >
            {hp}/{maxHp} HP ({rotationAngle}°)
          </span>
        </div>
      )}
    </div>
  );
};
