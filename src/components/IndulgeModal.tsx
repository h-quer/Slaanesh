import React from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Modal } from './Dialogs';
import { Search, ChevronDown, Check, X, RefreshCw, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { cn, parseLocalDate, formatLocalDate, getPlatformMap, sortOriginalPlatformsByMap } from '../lib/utils';

export function IndulgeModal(props: any) {
  const {
      isIndulgeOpen, setIsIndulgeOpen, pendingIndulgence, setPendingIndulgence, 
      searchQuery, setSearchQuery, searchResults, setSearchResults, handleSearch, 
      searching, addGame, ritualPrepForm, setRitualPrepForm, 
      statuses, sortPlatforms, resetRitualForm, uiSettings
  } = props;
  
  return (
<Modal isOpen={isIndulgeOpen} onClose={() => { 
  setIsIndulgeOpen(false);
  setPendingIndulgence(null);
  setSearchQuery('');
  setSearchResults([]);
  resetRitualForm();
 }} title="Begin the Indulgence">
 <div className="flex flex-col gap-6">
 <div className="flex flex-col gap-4 border-b border-slaanesh-gold/10 pb-6">
 <div className="flex flex-col gap-2">
 <label className="text-sm text-slaanesh-gold/60 tracking-wide">Initial status for arrival</label>
 <select 
 value={ritualPrepForm.status_id}
 onChange={(e) => {
  setRitualPrepForm(prev => ({ ...prev, status_id: e.target.value }));
  // Clear pending if status changed to something non-played?
 }}
 className="bg-slaanesh-panel border border-slaanesh-gold/20 rounded p-3 text-sm text-slaanesh-text outline-none focus:border-slaanesh-accent appearance-none transition-all cursor-pointer w-full"
 style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%23c5a059\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.25rem' }}
 >
 {statuses.game.map(s => (
 <option key={s.id} value={s.id}>{s.label} ({s.categories.join(', ')})</option>
 ))}
 </select>
 </div>

 {statuses.game.find(s => s.id === ritualPrepForm.status_id)?.categories.includes('played') && (
 <motion.div 
 initial={{ height: 0, opacity: 0 }}
 animate={{ height: 'auto', opacity: 1 }}
 className="flex flex-col gap-4 border-t border-slaanesh-gold/10 pt-4"
 >
 {pendingIndulgence && (
  <div className="p-3 bg-slaanesh-accent/10 border border-slaanesh-accent/30 rounded flex items-center justify-between">
    <div className="flex items-center gap-3">
      <div className="w-8 h-10 bg-black/20 rounded overflow-hidden">
        {pendingIndulgence.cover && <img src={pendingIndulgence.cover.url.replace('t_thumb', 't_cover_big')} className="w-full h-full object-cover" alt="" />}
      </div>
      <span className="text-slaanesh-gold font-bold">{pendingIndulgence.name}</span>
    </div>
    <button 
      onClick={() => setPendingIndulgence(null)}
      className="text-slaanesh-gold/40 hover:text-slaanesh-gold p-1"
    >
      <X size={16} />
    </button>
  </div>
 )}

 <div className="grid grid-cols-2 gap-4">
 <div className="flex flex-col gap-2">
 <label className="text-sm text-slaanesh-gold/40 ">Rite date</label>
 <DatePicker
 selected={parseLocalDate(ritualPrepForm.date)}
 onChange={(date: Date | null) => setRitualPrepForm((prev: any) => ({ ...prev, date: formatLocalDate(date) }))}
 dateFormat="yyyy-MM-dd"
 calendarStartDay={1}
 className="w-full bg-slaanesh-panel/40 border border-slaanesh-gold/20 rounded p-2 text-sm text-slaanesh-text outline-none focus:border-slaanesh-accent cursor-pointer"
 />
 </div>
 <div className="flex flex-col gap-2">
 <label className="text-sm text-slaanesh-gold/40 font-bold">Outcome</label>
 <select 
 className="bg-slaanesh-panel/40 border border-slaanesh-gold/20 rounded p-2 text-sm text-slaanesh-text outline-none focus:border-slaanesh-accent"
 value={ritualPrepForm.playthrough_status_id || ''}
 onChange={e => setRitualPrepForm(prev => ({ ...prev, playthrough_status_id: e.target.value || null }))}
 >
 {statuses.playthrough.map(s => (
 <option key={s.id} value={s.id}>{s.label}</option>
 ))}
 </select>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
  <div className="flex flex-col gap-2">
    <label className="text-sm text-slaanesh-gold/40 ">Vessel (Platform)</label>
    <select 
      className="bg-slaanesh-panel border border-slaanesh-gold/20 rounded p-2 text-sm text-slaanesh-text outline-none focus:border-slaanesh-accent appearance-none transition-all cursor-pointer"
  style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%23c5a059\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1rem' }}
      value={ritualPrepForm.platform}
      onChange={e => setRitualPrepForm(prev => ({ ...prev, platform: e.target.value }))}
      disabled={!pendingIndulgence}
    >
      {!pendingIndulgence && <option value="">Select a game first...</option>}
      {pendingIndulgence && sortOriginalPlatformsByMap(pendingIndulgence.platforms?.map((p: any) => p.name) || [], getPlatformMap(uiSettings)).map(p => (
        <option key={p} value={p}>{p}</option>
      ))}
      {pendingIndulgence && (!pendingIndulgence.platforms || pendingIndulgence.platforms.length === 0) && (
        <option value="Unknown">Unknown Vessel</option>
      )}
    </select>
  </div>
  <div className="flex flex-col gap-2">
  <label className="text-sm text-slaanesh-gold/40 ">Intensity rating (0-100)</label>
  <input 
  type="number"
  min="0"
  max="100"
  placeholder="Optional"
  className="bg-slaanesh-panel/40 border border-slaanesh-gold/20 rounded p-2 text-sm text-slaanesh-text"
  value={ritualPrepForm.rating === undefined ? '' : ritualPrepForm.rating}
  onChange={e => setRitualPrepForm(prev => ({ ...prev, rating: e.target.value === '' ? undefined : parseInt(e.target.value) }))}
  />
  </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div className="flex flex-col gap-2">
 <label className="text-sm text-slaanesh-gold/40 font-bold">Volume of Excess</label>
 <input 
 placeholder="e.g. 25h"
 className="bg-slaanesh-panel/40 border border-slaanesh-gold/20 rounded p-2 text-sm text-slaanesh-text"
 value={ritualPrepForm.time_played}
 onChange={e => setRitualPrepForm(prev => ({ ...prev, time_played: e.target.value }))}
 />
 </div>
 <div className="flex flex-col gap-2">
 <label className="text-sm text-slaanesh-gold/40 font-bold">Software Version</label>
 <input 
 placeholder="e.g. 1.0.4"
 className="bg-slaanesh-panel/40 border border-slaanesh-gold/20 rounded p-2 text-sm text-slaanesh-text"
 value={ritualPrepForm.version}
 onChange={e => setRitualPrepForm(prev => ({ ...prev, version: e.target.value }))}
 />
 </div>
 </div>

 <div className="flex flex-col gap-2">
 <label className="text-sm text-slaanesh-gold/40 ">Manifestation Comment</label>
 <textarea 
 className="bg-slaanesh-panel/40 border border-slaanesh-gold/20 rounded p-2 text-sm text-slaanesh-gold h-16 resize-none outline-none focus:border-slaanesh-accent"
 value={ritualPrepForm.comment}
 onChange={e => setRitualPrepForm(prev => ({ ...prev, comment: e.target.value }))}
 placeholder="Log early thoughts..."
 />
 </div>

 {pendingIndulgence && (
   <button 
     onClick={() => addGame(pendingIndulgence)}
     className="mt-2 bg-slaanesh-accent text-white font-bold py-3 rounded-sm shadow-[0_0_20px_rgba(224,18,139,0.4)] hover:shadow-[0_0_30px_rgba(224,18,139,0.6)] transition-all tracking-wider"
   >
     Finalize the Indulgence
   </button>
 )}
 </motion.div>
 )}
 </div>

 <div className="relative">
 <input 
 type="text" 
 placeholder="Name or IGDB ID of the obsession..."
 className="w-full bg-slaanesh-panel border border-slaanesh-gold/30 rounded p-4 text-slaanesh-gold focus:outline-none focus:border-slaanesh-accent transition-colors placeholder:text-slaanesh-gold/30 tracking-wider font-sans"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
 />
 <button 
 onClick={handleSearch}
 className="absolute right-4 top-1/2 -translate-y-1/2 text-slaanesh-gold hover:text-slaanesh-accent transition-colors"
 >
 {searching ? <RefreshCw className="animate-spin" size={20} /> : <Search size={20} />}
 </button>
 </div>

 <div className="flex flex-col gap-3 max-h-80 overflow-y-auto pr-2">
 {searchResults.map((result: any) => (
 <div 
 key={result.id} 
 className={cn(
    "flex gap-4 p-3 bg-slaanesh-gold/5 rounded border transition-all cursor-pointer group",
    pendingIndulgence?.id === result.id ? "border-slaanesh-accent bg-slaanesh-accent/5" : "border-slaanesh-gold/10 hover:border-slaanesh-accent/50"
  )}
 onClick={() => {
    const targetStatus = statuses.game.find(s => s.id === ritualPrepForm.status_id);
    if (targetStatus?.categories.includes('played')) {
      setPendingIndulgence(result);
      setRitualPrepForm(prev => ({ ...prev, platform: sortOriginalPlatformsByMap(result.platforms?.map((p: any) => p.name) || [], getPlatformMap(uiSettings))[0] || 'Unknown' }));
    } else {
      addGame(result);
    }
  }}

 >
 <div className="w-16 h-20 bg-slaanesh-panel/40 rounded overflow-hidden flex-shrink-0">
 {result.cover && (
 <img src={result.cover.url.replace('t_thumb', 't_cover_big')} className="w-full h-full object-cover" alt="" />
 )}
 </div>
 <div className="flex flex-col justify-center gap-1 overflow-hidden">
 <h4 className="font-bold text-slaanesh-gold group-hover:text-slaanesh-accent transition-colors truncate">{result.name}</h4>
 <p className="text-sm text-slaanesh-text/50 tracking-wide">
 {result.first_release_date ? new Date(result.first_release_date * 1000).toISOString().split('T')[0] : 'Unknown Ritual'}
 {result.platforms && ` • ${sortPlatforms(result.platforms.map((p: any) => p.name)).join(', ')}`}
 </p>
 </div>
 <div className="ml-auto flex items-center">
 <Plus className="text-slaanesh-gold/30 group-hover:text-slaanesh-accent transition-colors" />
 </div>
 </div>
 ))}
 {searchResults.length === 0 && !searching && searchQuery && (
 <div className="text-center py-8 text-slaanesh-gold/30 tracking-wide text-xs">
 No visions found in the Immaterium...
 </div>
 )}
 </div>
 </div>
 </Modal>
  );
}
