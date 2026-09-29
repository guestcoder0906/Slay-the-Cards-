import React, { useState } from 'react';
import { MultiplayerMode } from '../types/game';
import { Users, Globe, Copy, Check, Radio, Share2, CheckCircle2, Zap } from 'lucide-react';
import { socketService } from '../services/socketService';

interface MultiplayerModalProps {
  currentMode: MultiplayerMode;
  roomCode: string;
  isHost: boolean;
  isConnected: boolean;
  playerCount: number;
  onJoinRoom: (code: string) => void;
  onCreateRoom: () => void;
  onClose: () => void;
}

export const MultiplayerModal: React.FC<MultiplayerModalProps> = ({
  currentMode,
  roomCode,
  isHost,
  isConnected,
  playerCount,
  onJoinRoom,
  onCreateRoom,
  onClose,
}) => {
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const isSupabase = socketService.isSupabaseConfigured();

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyInviteLink = () => {
    const inviteUrl = `${window.location.origin}?room=${roomCode}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="relative w-full max-w-lg bg-stone-900 border-2 border-emerald-600/80 rounded-3xl p-6 shadow-2xl text-stone-100 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-800 mb-4">
          <div className="flex items-center gap-2">
            <Radio className="w-6 h-6 text-emerald-400" />
            <div>
              <h3 className="text-xl font-serif font-bold text-emerald-300">
                {isSupabase ? 'Live Supabase Realtime Multiplayer' : 'Live Realtime Multiplayer'}
              </h3>
              <p className="text-[11px] text-stone-400">
                {isSupabase
                  ? 'Serverless 1v1 broadcast via Supabase Realtime (Vercel Ready)'
                  : 'Direct real-time 1v1 card combat'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white text-xs px-2.5 py-1.5 bg-stone-800 rounded-lg cursor-pointer"
          >
            Close
          </button>
        </div>

        {/* Realtime Engine Status */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-stone-950 border border-stone-800 mb-4 text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isConnected ? 'bg-emerald-400 animate-ping' : 'bg-amber-500'
              }`}
            />
            <span className="text-stone-300 font-semibold">
              {isConnected
                ? isSupabase
                  ? 'Supabase Realtime Live Connected'
                  : 'WebSocket Engine Online'
                : 'Connecting to Realtime Engine...'}
            </span>
          </div>
          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1 font-mono font-bold">
            <Zap className="w-3 h-3 text-emerald-400" />
            {isSupabase ? 'Supabase Realtime' : 'Local /ws'}
          </span>
        </div>

        {/* Current Active Room Status if connected */}
        {roomCode ? (
          <div className="p-4 bg-emerald-950/40 border border-emerald-500/50 rounded-2xl flex flex-col items-center text-center mb-4">
            <div className="text-xs text-emerald-300 font-bold uppercase tracking-wider mb-1">
              Active Room Code
            </div>
            <div className="text-3xl font-mono font-black text-amber-400 tracking-widest my-1 select-all">
              {roomCode}
            </div>
            <div className="text-xs text-stone-300 flex items-center gap-2 mb-3">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-rose-500'}`} />
              <span>
                {playerCount === 2
                  ? 'Challenger Connected! Ready for Combat.'
                  : 'Waiting for player 2 to join...'}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 w-full">
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-xs font-bold rounded-xl cursor-pointer transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Code Copied!' : 'Copy Code'}
              </button>
              <button
                onClick={handleCopyInviteLink}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors shadow"
              >
                {copiedLink ? <CheckCircle2 className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                {copiedLink ? 'Link Copied!' : 'Copy Invite Link'}
              </button>
            </div>
          </div>
        ) : null}

        {/* Create / Join Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <button
            onClick={onCreateRoom}
            className="flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold rounded-xl shadow-lg shadow-emerald-700/30 text-xs cursor-pointer transition-all active:scale-95"
          >
            <Users className="w-4 h-4" /> Create New Room
          </button>

          <div className="flex gap-1.5">
            <input
              type="text"
              placeholder="6-Char Room Code"
              value={joinCodeInput}
              onChange={e => setJoinCodeInput(e.target.value.toUpperCase())}
              maxLength={6}
              className="flex-1 px-3 py-2 bg-stone-950 border border-stone-700 rounded-xl text-xs font-mono text-center text-amber-300 placeholder:text-stone-600 focus:outline-none focus:border-emerald-500"
            />
            <button
              disabled={joinCodeInput.trim().length < 3}
              onClick={() => onJoinRoom(joinCodeInput.trim())}
              className={`px-4 py-2 font-bold text-xs rounded-xl transition-all ${
                joinCodeInput.trim().length >= 3
                  ? 'bg-amber-600 hover:bg-amber-500 text-stone-950 cursor-pointer active:scale-95'
                  : 'bg-stone-800 text-stone-500 cursor-not-allowed'
              }`}
            >
              Join
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-4 pt-3 border-t border-stone-800/80 text-[11px] text-stone-400 leading-relaxed">
          💡 <strong className="text-stone-300">How to play with a friend:</strong> Click "Create New Room", then copy your Room Code or Invite Link and share it with your opponent. Both players will connect in real time!
        </div>
      </div>
    </div>
  );
};
