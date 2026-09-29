import React, { useState } from 'react';
import { MultiplayerMode } from '../types/game';
import {
  Users,
  Copy,
  Check,
  Radio,
  Share2,
  CheckCircle2,
  Zap,
  ArrowRight,
  LogOut,
  ShieldCheck,
  UserCheck,
  Sparkles,
  PlayCircle,
  HelpCircle,
  Wifi,
  Globe,
} from 'lucide-react';
import { socketService } from '../services/socketService';

interface MultiplayerModalProps {
  currentMode: MultiplayerMode;
  roomCode: string;
  isHost: boolean;
  isConnected: boolean;
  playerCount: number;
  onJoinRoom: (code: string) => void;
  onCreateRoom: () => void;
  onLeaveRoom?: () => void;
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
  onLeaveRoom,
  onClose,
}) => {
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showSwitchRoom, setShowSwitchRoom] = useState(false);
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
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

  const isInRoom = currentMode === 'websocket_multiplayer' && Boolean(roomCode);

  const handleJoinSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (joinCodeInput.trim().length >= 3) {
      onJoinRoom(joinCodeInput.trim().toUpperCase());
      setShowSwitchRoom(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-stone-900 border-2 border-emerald-500/80 rounded-3xl p-6 shadow-2xl text-stone-100 flex flex-col max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-800 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-emerald-950 border border-emerald-500/40 text-emerald-400">
              <Globe className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-xl font-serif font-black text-emerald-300">
                1v1 Live Multiplayer Match
              </h3>
              <p className="text-[11px] text-stone-400">
                Real-time tabletop card combat with another player
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white text-xs px-3 py-1.5 bg-stone-800 hover:bg-stone-700 rounded-xl cursor-pointer transition-colors"
          >
            ✕ Close
          </button>
        </div>

        {/* Network Engine Status Pill */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-950 border border-stone-800/90 mb-4 text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isConnected
                  ? 'bg-emerald-400 animate-ping'
                  : 'bg-amber-400 animate-pulse'
              }`}
            />
            <span className="text-stone-300 font-semibold">
              {isConnected
                ? isSupabase
                  ? 'Supabase Realtime Live Network'
                  : 'WebSocket Engine Synchronized'
                : 'Connecting to Realtime Network...'}
            </span>
          </div>
          <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-700 flex items-center gap-1 font-mono font-bold">
            <Wifi className="w-3 h-3 text-emerald-400" />
            {isSupabase ? 'Supabase Realtime' : 'WebSockets'}
          </span>
        </div>

        {/* ================= ALREADY IN ROOM ================= */}
        {isInRoom ? (
          <div className="flex flex-col gap-4">
            <div className="p-5 bg-gradient-to-b from-emerald-950/70 via-stone-950 to-stone-950 border-2 border-emerald-500/70 rounded-2xl flex flex-col items-center text-center shadow-xl">
              {/* Active Badge */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 text-xs font-bold uppercase tracking-wider mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Active Multiplayer Session
              </div>

              {/* Room Code Display */}
              <div className="text-xs text-stone-400 font-medium">Match Room Code:</div>
              <div className="text-4xl font-mono font-black text-amber-300 tracking-widest my-1 select-all bg-stone-900/80 px-4 py-1.5 rounded-xl border border-stone-800">
                {roomCode}
              </div>

              {/* Player Role */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-stone-900 border border-stone-700 text-xs text-stone-200 my-2 shadow-inner">
                <span className="text-emerald-400 font-semibold">Your Role:</span>
                <span className="font-black text-white">
                  {isHost ? 'Player 1 (Host)' : 'Player 2 (Challenger)'}
                </span>
              </div>

              {/* Player connection cards */}
              <div className="w-full bg-stone-900/90 rounded-2xl p-3.5 border border-stone-800 my-2 text-xs flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-stone-200 font-medium">
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    Player 1 (Host):
                  </span>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                    <span>🟢 Connected</span>
                    {isHost && <span className="text-stone-400 font-normal">(You)</span>}
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-stone-800/80 pt-2.5">
                  <span className="flex items-center gap-2 text-stone-200 font-medium">
                    <Users className="w-4 h-4 text-amber-400" />
                    Player 2 (Challenger):
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1 ${
                      playerCount >= 2
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                    }`}
                  >
                    {playerCount >= 2 ? (
                      <>
                        <span>🟢 Connected & Ready</span>
                        {!isHost && <span className="text-stone-400 font-normal">(You)</span>}
                      </>
                    ) : (
                      '🟡 Waiting for opponent to join...'
                    )}
                  </span>
                </div>
              </div>

              {/* Share & Copy Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-2 w-full mt-2">
                <button
                  onClick={handleCopyInviteLink}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl cursor-pointer transition-all shadow-md active:scale-95 border border-emerald-400/50"
                >
                  {copiedLink ? <CheckCircle2 className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                  <span>{copiedLink ? 'Invite Link Copied!' : 'Copy Invite Link'}</span>
                </button>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-xs font-bold text-stone-200 rounded-xl cursor-pointer transition-all border border-stone-700"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Code Copied!' : 'Copy Code'}</span>
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2.5">
              <button
                onClick={onClose}
                className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-stone-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
              >
                <span>Return to Live Game Table</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowSwitchRoom(prev => !prev)}
                  className="flex-1 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold rounded-xl cursor-pointer transition-colors border border-stone-700"
                >
                  {showSwitchRoom ? 'Hide Switch Options' : 'Switch Room / Create New'}
                </button>
                {onLeaveRoom && (
                  <button
                    onClick={onLeaveRoom}
                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-stone-800 hover:bg-rose-950 text-rose-300 hover:border-rose-700 border border-stone-700 text-xs font-semibold rounded-xl cursor-pointer transition-colors"
                    title="Leave multiplayer room and play vs AI"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-400" />
                    <span>Leave Match</span>
                  </button>
                )}
              </div>
            </div>

            {/* Collapsible Switch Room Form */}
            {showSwitchRoom && (
              <div className="p-4 bg-stone-950 rounded-2xl border border-stone-800 animate-in fade-in duration-200">
                <div className="text-xs font-bold text-stone-300 mb-2">Switch or Join Another Room:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    onClick={() => {
                      onCreateRoom();
                      setShowSwitchRoom(false);
                    }}
                    className="flex items-center justify-center gap-2 p-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs cursor-pointer shadow transition-all active:scale-95"
                  >
                    <Users className="w-4 h-4" /> Create New Room
                  </button>

                  <form onSubmit={handleJoinSubmit} className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="Room Code"
                      value={joinCodeInput}
                      onChange={e => setJoinCodeInput(e.target.value.toUpperCase())}
                      maxLength={6}
                      className="flex-1 px-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs font-mono text-center text-amber-300 placeholder:text-stone-600 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="submit"
                      disabled={joinCodeInput.trim().length < 3}
                      className={`px-4 py-2 font-bold text-xs rounded-xl transition-all ${
                        joinCodeInput.trim().length >= 3
                          ? 'bg-amber-600 hover:bg-amber-500 text-stone-950 cursor-pointer active:scale-95'
                          : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                      }`}
                    >
                      Join
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ================= NOT IN ROOM YET ================= */
          <div className="flex flex-col gap-4">
            {/* Tab switchers */}
            <div className="flex bg-stone-950 p-1 rounded-2xl border border-stone-800 w-full">
              <button
                onClick={() => setActiveTab('create')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  activeTab === 'create'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Create New Room</span>
              </button>
              <button
                onClick={() => setActiveTab('join')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  activeTab === 'join'
                    ? 'bg-amber-600 text-stone-950 font-black shadow-md'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <ArrowRight className="w-4 h-4" />
                <span>Join with Code</span>
              </button>
            </div>

            {/* Create Match Tab */}
            {activeTab === 'create' && (
              <div className="p-5 bg-stone-950/90 rounded-2xl border border-stone-800 flex flex-col items-center text-center gap-3">
                <div className="p-3 rounded-2xl bg-emerald-950 border border-emerald-500/30 text-emerald-400">
                  <Sparkles className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-base font-serif font-bold text-amber-300">
                    Host a 1v1 Tabletop Match
                  </h4>
                  <p className="text-xs text-stone-400 mt-1 max-w-sm">
                    Generate a new room code. Share the invite link with a friend to battle on the tabletop in real time!
                  </p>
                </div>

                <button
                  onClick={onCreateRoom}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-700/30 cursor-pointer transition-all active:scale-[0.98] border border-emerald-400/40"
                >
                  Create & Launch Match
                </button>
              </div>
            )}

            {/* Join Match Tab */}
            {activeTab === 'join' && (
              <form onSubmit={handleJoinSubmit} className="p-5 bg-stone-950/90 rounded-2xl border border-stone-800 flex flex-col items-center text-center gap-3">
                <div className="p-3 rounded-2xl bg-amber-950 border border-amber-500/30 text-amber-400">
                  <PlayCircle className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-base font-serif font-bold text-amber-300">
                    Join an Existing Match
                  </h4>
                  <p className="text-xs text-stone-400 mt-1 max-w-sm">
                    Enter the 6-character room code shared by your friend to join their game.
                  </p>
                </div>

                <div className="w-full flex gap-2 mt-2">
                  <input
                    type="text"
                    placeholder="ENTER 6-CHAR CODE"
                    value={joinCodeInput}
                    onChange={e => setJoinCodeInput(e.target.value.toUpperCase())}
                    maxLength={6}
                    autoFocus
                    className="flex-1 px-4 py-3 bg-stone-900 border-2 border-stone-700 focus:border-amber-400 rounded-2xl text-sm font-mono font-black text-center text-amber-300 placeholder:text-stone-600 focus:outline-none transition-colors tracking-widest uppercase"
                  />
                  <button
                    type="submit"
                    disabled={joinCodeInput.trim().length < 3}
                    className={`px-6 py-3 font-black text-xs rounded-2xl transition-all ${
                      joinCodeInput.trim().length >= 3
                        ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 cursor-pointer active:scale-95 shadow-lg shadow-amber-500/20'
                        : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                    }`}
                  >
                    Join Match
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Footer info */}
        <div className="mt-4 pt-3 border-t border-stone-800/80 text-[11px] text-stone-400 leading-relaxed">
          💡 <strong className="text-stone-300">Real-time sync:</strong> All card plays, steals, discards, and combat calculations are mirrored immediately on both players' screens.
        </div>
      </div>
    </div>
  );
};
