import React, { useEffect, useState } from 'react';
import { CombatLogStep, GameState } from '../types/game';
import { sounds } from '../utils/audio';
import { Shield, Sparkles, Swords, Scissors, Trash2, CheckCircle2, ChevronRight, Play, Pause } from 'lucide-react';

interface ResolutionOverlayProps {
  logs: CombatLogStep[];
  onComplete: () => void;
}

export const ResolutionOverlay: React.FC<ResolutionOverlayProps> = ({ logs, onComplete }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);

  const step = logs[currentStepIndex];

  useEffect(() => {
    if (!step) return;

    // Trigger procedural sound based on phase
    if (step.phase === 'clubs') {
      sounds.playCardRotate();
    } else if (step.phase === 'defense') {
      sounds.playBlock();
    } else if (step.phase === 'damage') {
      sounds.playAttack();
    } else if (step.phase === 'heal') {
      sounds.playHeal();
    } else if (step.phase === 'cleanup') {
      sounds.playShuffle();
    }
  }, [currentStepIndex, step]);

  useEffect(() => {
    if (!autoPlay) return;
    if (currentStepIndex >= logs.length - 1) {
      const timer = setTimeout(() => {
        onComplete();
      }, 1600);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      setCurrentStepIndex(prev => prev + 1);
    }, 1800);
    return () => clearTimeout(timer);
  }, [currentStepIndex, autoPlay, logs.length, onComplete]);

  const handleNext = () => {
    if (currentStepIndex < logs.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case 'clubs':
        return <Scissors className="w-6 h-6 text-emerald-400" />;
      case 'defense':
        return <Shield className="w-6 h-6 text-blue-400" />;
      case 'damage':
        return <Swords className="w-6 h-6 text-rose-500" />;
      case 'heal':
        return <Sparkles className="w-6 h-6 text-emerald-400" />;
      case 'cleanup':
        return <Trash2 className="w-6 h-6 text-amber-400" />;
      default:
        return <CheckCircle2 className="w-6 h-6 text-amber-400" />;
    }
  };

  if (!step) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4">
      <div className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto scrollbar-thin bg-stone-900 border-2 border-amber-600/80 rounded-3xl p-4 sm:p-6 shadow-2xl text-stone-100 flex flex-col items-center">
        {/* Phase Timeline Header */}
        <div className="w-full flex items-center justify-between pb-3 border-b border-stone-800 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest text-amber-400 font-bold">
              Combat Resolution Phase
            </span>
            <span className="text-xs text-stone-400">
              ({currentStepIndex + 1} of {logs.length})
            </span>
          </div>
          <button
            onClick={() => setAutoPlay(!autoPlay)}
            className="flex items-center gap-1 text-xs text-stone-300 hover:text-white px-2 py-1 rounded bg-stone-800 cursor-pointer"
          >
            {autoPlay ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
            {autoPlay ? 'Auto-Advancing' : 'Paused'}
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-stone-800 h-1.5 rounded-full overflow-hidden mb-6">
          <div
            className="bg-amber-500 h-full transition-all duration-300"
            style={{ width: `${((currentStepIndex + 1) / logs.length) * 100}%` }}
          />
        </div>

        {/* Current Resolution Step Spotlight */}
        <div className="w-full bg-stone-950/80 border border-stone-800 rounded-2xl p-6 flex flex-col items-center text-center shadow-inner mb-6 min-h-[160px] justify-center">
          <div className="p-3 bg-stone-900 rounded-2xl border border-stone-700/60 mb-3 shadow-lg">
            {getPhaseIcon(step.phase)}
          </div>

          <h3 className="text-lg font-serif font-bold text-amber-300 mb-1">{step.title}</h3>
          <p className="text-sm text-stone-200 max-w-md leading-relaxed">{step.description}</p>
        </div>

        {/* Step Navigation Controls */}
        <div className="w-full flex items-center justify-between">
          <button
            onClick={() => onComplete()}
            className="text-stone-400 hover:text-stone-200 text-xs cursor-pointer"
          >
            Skip to End
          </button>

          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-sm shadow-lg shadow-amber-600/30 transition-all cursor-pointer active:scale-95"
          >
            {currentStepIndex === logs.length - 1 ? 'Finish Resolution' : 'Next Effect'}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
