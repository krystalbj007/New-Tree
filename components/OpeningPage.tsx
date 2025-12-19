
import React from 'react';
import { Sparkles, Camera } from 'lucide-react';

interface OpeningPageProps {
  onStart: () => void;
}

const OpeningPage: React.FC<OpeningPageProps> = ({ onStart }) => {
  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-2xl transition-all duration-1000">
      <div className="max-w-xl w-full mx-4 p-8 md:p-12 rounded-[40px] md:rounded-[50px] bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl flex flex-col items-center text-center gap-6 md:gap-8">
        
        <div className="flex flex-col gap-3 md:gap-4">
          <h1 className="text-5xl md:text-8xl font-playfair glitter-text italic font-bold leading-tight">
            Best Wishes
          </h1>
          <div className="w-16 md:w-24 h-1 bg-gradient-to-r from-transparent via-yellow-200 to-transparent mx-auto opacity-50" />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-center gap-2 text-white/60 mb-1 px-4">
            <Camera size={14} className="text-yellow-200/70 shrink-0" />
            <span className="text-[9px] md:text-[10px] uppercase tracking-[0.15em] md:tracking-[0.2em] font-medium leading-relaxed">
              Allow camera access for hand gesture control
            </span>
          </div>
        </div>

        <button 
          onClick={onStart}
          className="group relative flex items-center gap-3 md:gap-4 px-8 py-4 md:px-12 md:py-5 bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-600 text-black rounded-full font-bold shadow-2xl shadow-yellow-500/20 hover:scale-105 active:scale-95 transition-all text-lg md:text-xl overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
          {/* Fix: Lucide icons do not support responsive props like md:size. Using Tailwind classes instead. */}
          <Sparkles className="animate-pulse shrink-0 w-5 h-5 md:w-6 md:h-6" />
          <span>MAKE A WISH</span>
        </button>

        <div className="text-white/20 text-[8px] md:text-[9px] uppercase tracking-[0.1em] font-light mt-2">
          © 2025 Krystal. All rights reserved · Powered by AI
        </div>
      </div>
    </div>
  );
};

export default OpeningPage;
