import React from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Modal } from './Dialogs';
import { RefreshCw } from 'lucide-react';
import { cn, parseLocalDate, formatLocalDate, getPlatformMap, sortOriginalPlatformsByMap } from '../lib/utils';
import { motion } from 'motion/react';

export function RiteEditorModal(props: any) {
  const {
      isRiteEditorOpen, setIsRiteEditorOpen, editingRite, setEditingRite, riteForm, setRiteForm, 
      submitRite, statuses, sortPlatforms, selectedGame, playTimesArray, uiSettings
  } = props;
  
  return (
<Modal 
 isOpen={isRiteEditorOpen} 
 onClose={() => {
 setIsRiteEditorOpen(false);
 setEditingRite(null);
 }} 
 title={editingRite ? "Revising the Rite" : "Performing the Rite"}
 >
 <div className="flex flex-col gap-6">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="flex flex-col gap-2">
 <label className="text-sm text-slaanesh-gold/60 tracking-wide">Rite Date</label>
 <DatePicker
 selected={parseLocalDate(riteForm.date)}
 onChange={(date: Date | null) => setRiteForm((prev: any) => ({ ...prev, date: formatLocalDate(date) }))}
 dateFormat="yyyy-MM-dd"
 calendarStartDay={1}
 className="w-full bg-slaanesh-panel/40 border border-slaanesh-gold/20 rounded p-2 text-sm text-slaanesh-text outline-none focus:border-slaanesh-accent cursor-pointer"
 />
 </div>
 <div className="flex flex-col gap-2">
 <label className="text-sm text-slaanesh-gold/60 tracking-wide">Vessel</label>
 <select 
 className="bg-slaanesh-panel/40 border border-slaanesh-gold/20 rounded p-2 text-sm text-slaanesh-text outline-none focus:border-slaanesh-accent"
 value={riteForm.platform}
 onChange={e => setRiteForm(prev => ({ ...prev, platform: e.target.value }))}
 >
 <option value="" disabled>Select valid platform...</option>
 {sortOriginalPlatformsByMap(selectedGame?.platforms || [], getPlatformMap(uiSettings)).map(p => (
 <option key={p} value={p}>{p}</option>
 ))}
 </select>
 </div>
 </div>

 <div className="flex flex-col gap-2 border-b border-slaanesh-gold/10 pb-4">
 <label className="text-sm text-slaanesh-accent tracking-wide font-bold">New Game Status after selection</label>
 <select 
 className="bg-slaanesh-panel/40 border border-slaanesh-accent/40 rounded p-2 text-sm text-slaanesh-text outline-none focus:border-slaanesh-accent shadow-[0_0_10px_rgba(224,18,139,0.1)]"
 value={riteForm.game_status_id}
 onChange={(e) => setRiteForm(prev => ({ ...prev, game_status_id: e.target.value }))}
 >
 {statuses.game.filter(s => s.categories.includes('played')).map(s => (
 <option key={s.id} value={s.id}>{s.label} ({s.categories.join(', ')})</option>
 ))}
 </select>
 <p className="text-xs text-slaanesh-gold/40 italic">Note: Recording a ritual record REQUIRES that the game moves to the "Played" archival category.</p>
 </div>

   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div className="flex flex-col gap-2">
  <label className="text-sm text-slaanesh-gold/60 tracking-wide">Outcome</label>
 <select 
 className="bg-slaanesh-panel/40 border border-slaanesh-gold/20 rounded p-2 text-sm text-slaanesh-text outline-none focus:border-slaanesh-accent"
 value={riteForm.status_id}
 onChange={e => setRiteForm(prev => ({ ...prev, status_id: e.target.value }))}
 >
 {statuses.playthrough.map(s => (
 <option key={s.id} value={s.id}>{s.label}</option>
 ))}
 </select>
 </div>
 <div className="flex flex-col gap-2">
 <label className="text-sm text-slaanesh-gold/60 tracking-wide text-slaanesh-accent font-bold">Rating (0-100)</label>
 <input 
 type="number"
 min="0"
 max="100"
 className="bg-slaanesh-panel/40 border border-slaanesh-gold/20 rounded p-2 text-sm text-slaanesh-text outline-none focus:border-slaanesh-accent"
 value={riteForm.rating === undefined ? '' : riteForm.rating}
 onChange={e => setRiteForm(prev => ({ ...prev, rating: e.target.value === '' ? undefined : parseInt(e.target.value) }))}
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div className="flex flex-col gap-2">
 <label className="text-sm text-slaanesh-gold/60 tracking-wide">Volume of Excess (2h 30m, 1d, etc)</label>
 <input 
 placeholder="e.g. 5h 20m"
 className="bg-slaanesh-panel/40 border border-slaanesh-gold/20 rounded p-2 text-sm text-slaanesh-text"
 value={riteForm.time_played}
 onChange={e => setRiteForm(prev => ({ ...prev, time_played: e.target.value }))}
 />
 </div>
 <div className="flex flex-col gap-2">
 <label className="text-sm text-slaanesh-gold/60 tracking-wide">Software Version</label>
 <input 
 placeholder="e.g. 1.0.4"
 className="bg-slaanesh-panel/40 border border-slaanesh-gold/20 rounded p-2 text-sm text-slaanesh-text"
 value={riteForm.version}
 onChange={e => setRiteForm(prev => ({ ...prev, version: e.target.value }))}
 />
 </div>
 </div>

 <div className="flex flex-col gap-2">
 <label className="text-sm text-slaanesh-gold/60 tracking-wide">Manifestation Comment</label>
 <textarea 
 className="bg-slaanesh-panel/40 border border-slaanesh-gold/20 rounded p-2 text-sm text-slaanesh-gold h-20 resize-none outline-none focus:border-slaanesh-accent"
 value={riteForm.comment}
 onChange={e => setRiteForm(prev => ({ ...prev, comment: e.target.value }))}
 />
 </div>

 <button 
 onClick={submitRite}
 className="slaanesh-btn w-full mt-4 py-3 font-display tracking-[0.2em] relative group overflow-hidden"
 >
 <div className="absolute inset-0 bg-slaanesh-accent opacity-0 group-hover:opacity-20 transition-opacity"></div>
 {editingRite ? "Commit Revision" : "Conclude Rite"}
 </button>
 </div>
 </Modal>
  );
}
