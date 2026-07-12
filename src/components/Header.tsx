import React from 'react';
import { Search, Info, Settings, Download, X, Upload } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export function Header(props: any) {
  const {
      globalQuery, setGlobalQuery, globalSearchResults, showGlobalResults, setShowGlobalResults,
      activeTab, setActiveTab, stats, playTimesArray,
      setIsAboutOpen, setIsSettingsOpen, setIsImportOpen, setIsIndulgeOpen, setSelectedGame, exportCsv, statuses
  } = props;
  
  return (
<header className="min-h-16 flex flex-col md:flex-row items-center justify-between px-4 md:px-8 border-b border-slaanesh-gold/30 bg-slaanesh-panel shadow-lg z-30 py-3 md:py-0 gap-4 md:gap-0">
 <div className="flex items-center justify-between w-full md:w-auto">
  <div className="flex items-center gap-3">
   <img src="/favicon-512.png" className="w-8 h-8 md:w-[50px] md:h-[50px] object-contain" alt="Slaanesh Logo" />
   <h1 className="font-fraktur text-slaanesh-gold text-3xl md:text-5xl leading-none slaanesh-glow flex items-center">Slaanesh</h1>
  </div>
  <div className="md:hidden flex items-center gap-4">
   <button onClick={() => setIsSettingsOpen(true)} className="text-slaanesh-gold/70 hover:text-slaanesh-accent">
    <Settings size={18} />
   </button>
  </div>
 </div>

 <div className="flex-1 w-full flex justify-center items-center gap-3 md:gap-4 px-0 md:px-8">
  <button 
   onClick={() => setIsIndulgeOpen(true)}
   className="indulge-btn whitespace-nowrap py-2 px-6 text-base"
  >
   Indulge
  </button>

  <div className="relative w-full max-w-xs group">
   <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slaanesh-gold/50 pointer-events-none" />
   <input 
    placeholder="Search archives" 
    className="w-full bg-black/20 border border-slaanesh-gold/10 rounded-full px-9 py-2 text-sm text-slaanesh-gold focus:border-slaanesh-accent/50 outline-none transition-all placeholder:text-slaanesh-gold/30"
    value={globalQuery}
    onChange={e => setGlobalQuery(e.target.value)}
    onBlur={() => setTimeout(() => setShowGlobalResults(false), 200)}
    onFocus={() => globalQuery.trim().length > 0 && setShowGlobalResults(true)}
   />
   {globalQuery && (
    <button 
     onClick={() => setGlobalQuery('')}
     className="absolute right-3 top-1/2 -translate-y-1/2 text-slaanesh-gold/30 hover:text-slaanesh-accent"
    >
     <X size={12} />
    </button>
   )}

   <AnimatePresence>
    {showGlobalResults && globalSearchResults.length > 0 && (
     <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="absolute top-full left-0 right-0 mt-2 bg-slaanesh-panel border border-slaanesh-gold/30 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden z-[100]"
     >
      <div className="max-h-96 overflow-y-auto">
       {globalSearchResults.map(game => (
        <div 
         key={game.igdb_id}
         onClick={() => {
          setSelectedGame(game);
          setGlobalQuery('');
          setShowGlobalResults(false);
         }}
         className="flex items-center gap-3 p-3 hover:bg-slaanesh-accent/10 cursor-pointer border-b border-slaanesh-gold/10 last:border-0 transition-colors"
        >
         <div className="w-10 h-14 bg-black/40 rounded flex-shrink-0 border border-slaanesh-gold/10 overflow-hidden">
          <img src={`/covers/${game.igdb_id}.jpg`} className="w-full h-full object-cover" alt="" />
         </div>
         <div className="flex flex-col min-w-0">
          <span className="text-sm font-bold truncate text-slaanesh-gold group-hover:text-slaanesh-accent">{game.name}</span>
          <span className="text-xs font-semibold opacity-70" style={statuses?.game?.find((s: any) => s.id === game.game_status)?.color ? { color: statuses?.game?.find((s: any) => s.id === game.game_status)?.color } : {}}>
           {statuses?.game?.find((s: any) => s.id === game.game_status)?.label || game.game_status}
          </span>
         </div>
        </div>
       ))}
      </div>
     </motion.div>
    )}
   </AnimatePresence>
  </div>
 </div>

 <div className="hidden md:flex items-center gap-4 text-slaanesh-gold/70 tracking-wide font-semibold">
  <div className="flex items-center gap-4">
   <button onClick={() => setIsImportOpen(true)} className="hover:text-slaanesh-accent transition-colors p-1.5" title="Import">
    <Upload size={20} />
   </button>
   <button onClick={exportCsv} className="hover:text-slaanesh-accent transition-colors p-1.5" title="Export">
    <Download size={20} />
   </button>
  </div>

  <div className="w-px h-6 bg-slaanesh-gold/20 mx-2" />

  <div className="flex items-center gap-4">
   <button onClick={() => setIsSettingsOpen(true)} className="hover:text-slaanesh-accent transition-colors p-1.5" title="Settings">
    <Settings size={20} />
   </button>
   <button onClick={() => setIsAboutOpen(true)} className="hover:text-slaanesh-accent transition-colors p-1.5" title="About">
    <Info size={20} />
   </button>
  </div>
 </div>
 </header>
  );
}
