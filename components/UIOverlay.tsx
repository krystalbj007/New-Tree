
import React from 'react';
import { Volume2, VolumeX, Snowflake, Sparkles } from 'lucide-react';

interface UIOverlayProps {
  isSnowing: boolean;
  onToggleSnow: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onMakeWish: () => void;
  cursorRef: React.RefObject<HTMLDivElement | null>;
  displayMode: 'TREE' | 'EXPLODE';
}

const UIOverlay: React.FC<UIOverlayProps> = ({ 
  isSnowing, 
  onToggleSnow, 
  isMuted, 
  onToggleMute, 
  onMakeWish,
  cursorRef,
  displayMode
}) => {
  const stopPropagation = (e: React.PointerEvent | React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-5 md:p-8 z-10">
      {/* Header */}
      <div className="flex justify-between items-start pointer-events-auto">
        <div className="text-white drop-shadow-lg flex flex-col gap-0.5 md:gap-1">
          <h1 className="text-3xl md:text-5xl font-playfair italic font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-yellow-200 to-blue-200 leading-tight">
            Merry Christmas
          </h1>
          <p className="text-[8px] md:text-[10px] opacity-60 tracking-[0.2em] md:tracking-[0.3em] font-light">
            Wishing you a Merry Christmas — Krystal
          </p>
        </div>
        
        <button 
          onClick={onToggleMute}
          onPointerDown={stopPropagation}
          onPointerUp={stopPropagation}
          className="p-2 md:p-2.5 bg-white/5 hover:bg-white/15 backdrop-blur-xl rounded-full transition-all border border-white/10 group shadow-lg"
        >
          {isMuted ? (
            <VolumeX className="text-white/80 group-hover:text-white transition-colors w-[18px] h-[18px] md:w-5 md:h-5" />
          ) : (
            <Volume2 className="text-white/80 group-hover:text-white transition-colors w-[18px] h-[18px] md:w-5 md:h-5" />
          )}
        </button>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-end pointer-events-auto">
        <div className="flex flex-col gap-2.5 md:gap-3">
          <button 
            onClick={onMakeWish}
            onPointerDown={stopPropagation}
            onPointerUp={stopPropagation}
            className="group relative flex items-center gap-2 px-4 py-2.5 md:px-6 md:py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-full font-bold shadow-2xl shadow-pink-500/40 hover:scale-105 active:scale-95 transition-all border border-pink-400/30 text-xs md:text-sm overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 ease-in-out pointer-events-none" />
            <Sparkles className="group-hover:rotate-12 transition-transform w-[14px] h-[14px] md:w-4 md:h-4" />
            MAKE A WISH
          </button>
          
          <button 
            onClick={onToggleSnow}
            onPointerDown={stopPropagation}
            onPointerUp={stopPropagation}
            className={`flex items-center gap-2 px-4 py-2 md:px-5 md:py-2.5 rounded-full font-bold transition-all border backdrop-blur-md text-[10px] md:text-xs ${
              isSnowing 
                ? 'bg-white text-purple-900 border-white shadow-xl shadow-white/10' 
                : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Snowflake className={`${isSnowing ? "animate-spin" : ""} w-[12px] h-[12px] md:w-[14px] md:h-[14px]`} />
            {isSnowing ? "SNOWING" : "LET IT SNOW"}
          </button>
        </div>

        {/* Feedback section - Compact for mobile */}
        <div 
          onPointerDown={stopPropagation}
          onPointerUp={stopPropagation}
          className="flex gap-2.5 md:gap-4 items-center bg-black/40 backdrop-blur-2xl px-3 py-2 md:px-4 md:py-3 rounded-[24px] md:rounded-[28px] border border-white/10 shadow-2xl"
        >
          {/* Open Palm Icon (EXPLODE Mode) */}
          <div className={`flex flex-col items-center gap-1 transition-all duration-500 ${displayMode === 'EXPLODE' ? 'opacity-100 scale-100' : 'opacity-20 scale-90 grayscale'}`}>
            <div className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-xl md:rounded-2xl border transition-all duration-500 ${displayMode === 'EXPLODE' ? 'bg-blue-500/20 border-blue-400/50 shadow-[0_0_15px_rgba(96,165,250,0.3)]' : 'bg-white/5 border-white/10'}`}>
              <span className="text-xl md:text-2xl drop-shadow-md select-none" role="img" aria-label="explode">🖐️</span>
            </div>
            <span className="text-[7px] md:text-[8px] text-white font-bold uppercase tracking-widest">Explode</span>
          </div>

          <div className="w-[1px] h-6 md:h-8 bg-white/10 mx-0.5 md:mx-1" />

          {/* Fist Icon (TREE Mode) */}
          <div className={`flex flex-col items-center gap-1 transition-all duration-500 ${displayMode === 'TREE' ? 'opacity-100 scale-100' : 'opacity-20 scale-90 grayscale'}`}>
            <div className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-xl md:rounded-2xl border transition-all duration-500 ${displayMode === 'TREE' ? 'bg-pink-500/20 border-pink-400/50 shadow-[0_0_15px_rgba(244,114,182,0.3)]' : 'bg-white/5 border-white/10'}`}>
              <span className="text-xl md:text-2xl drop-shadow-md select-none" role="img" aria-label="gather">✊</span>
            </div>
            <span className="text-[7px] md:text-[8px] text-white font-bold uppercase tracking-widest">Gather</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UIOverlay;
