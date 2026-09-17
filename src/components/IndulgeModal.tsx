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

  const currentStatus = statuses.game.find((s: any) => s.id === ritualPrepForm.status_id);
  const isPlayingCategory = currentStatus?.categories?.includes('playing');
  const isPlayedCategory = currentStatus?.categories?.includes('played');

  const pMap = getPlatformMap(uiSettings);
  const gamePlatforms = pendingIndulgence 
    ? (pendingIndulgence.platforms?.map((p: any) => p.name || p) || [])
    : [];
  const sortedPlatforms = sortOriginalPlatformsByMap(gamePlatforms, pMap);

  const handleSelectGame = (result: any) => {
    const originalPlatforms = result.platforms?.map((p: any) => p.name || p) || [];
    const sorted = sortOriginalPlatformsByMap(originalPlatforms, pMap);
    const topPlatform = sorted[0] || '';

    setPendingIndulgence(result);
    setRitualPrepForm((prev: any) => ({
      ...prev,
      platform: prev.platform || topPlatform || 'Unknown',
      active_platform: prev.active_platform !== undefined && prev.active_platform !== '' ? prev.active_platform : topPlatform
    }));
  };

  const handleStatusChange = (newStatusId: string) => {
    const nextStatus = statuses.game.find((s: any) => s.id === newStatusId);
    const willBePlaying = nextStatus?.categories?.includes('playing');
    const willBePlayed = nextStatus?.categories?.includes('played');

    setRitualPrepForm((prev: any) => {
      let nextActive = prev.active_platform;
      if (willBePlaying && (!nextActive || nextActive === '') && pendingIndulgence) {
        nextActive = sortedPlatforms[0] || '';
      }
      let nextPtPlatform = prev.platform;
      if (willBePlayed && (!nextPtPlatform || nextPtPlatform === 'Unknown') && pendingIndulgence) {
        nextPtPlatform = sortedPlatforms[0] || 'Unknown';
      }
      return {
        ...prev,
        status_id: newStatusId,
        active_platform: nextActive,
        platform: nextPtPlatform
      };
    });
  };

  return (
    <Modal 
      isOpen={isIndulgeOpen} 
      onClose={() => { 
        setIsIndulgeOpen(false);
        setPendingIndulgence(null);
        setSearchQuery('');
        setSearchResults([]);
        resetRitualForm();
      }} 
      title="Begin the Indulgence"
    >
      <div className="flex flex-col gap-6">
        {/* Game Selection Mode: Search vs Selected Game */}
        {!pendingIndulgence ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs text-slaanesh-gold/60 font-bold tracking-wider uppercase">Initial Arrival Status</label>
              <select 
                value={ritualPrepForm.status_id}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="bg-slaanesh-panel border border-slaanesh-gold/20 rounded p-3 text-sm text-slaanesh-text outline-none focus:border-slaanesh-accent appearance-none transition-all cursor-pointer w-full"
                style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%23c5a059\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.25rem' }}
              >
                {statuses.game.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.label} ({s.categories.join(', ')})</option>
                ))}
              </select>
            </div>

            <div className="relative">
              <input 
                type="text" 
                placeholder="Name or IGDB ID of the obsession..."
                className="w-full bg-slaanesh-panel border border-slaanesh-gold/30 rounded p-4 text-slaanesh-gold focus:outline-none focus:border-slaanesh-accent transition-colors placeholder:text-slaanesh-gold/30 tracking-wider font-sans text-sm"
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
                    "border-slaanesh-gold/10 hover:border-slaanesh-accent/50 hover:bg-slaanesh-gold/10"
                  )}
                  onClick={() => handleSelectGame(result)}
                >
                  <div className="w-16 h-20 bg-slaanesh-panel/40 rounded overflow-hidden flex-shrink-0 border border-slaanesh-gold/20">
                    {result.cover && (
                      <img src={result.cover.url.replace('t_thumb', 't_cover_big')} className="w-full h-full object-cover" alt="" />
                    )}
                  </div>
                  <div className="flex flex-col justify-center gap-1 overflow-hidden min-w-0 flex-1">
                    <h4 className="font-bold text-slaanesh-gold group-hover:text-slaanesh-accent transition-colors truncate">{result.name}</h4>
                    <p className="text-xs text-slaanesh-text/50 tracking-wide truncate">
                      {result.first_release_date ? new Date(result.first_release_date * 1000).toISOString().split('T')[0] : 'Unknown Ritual'}
                      {result.platforms && ` • ${sortPlatforms(result.platforms.map((p: any) => p.name)).join(', ')}`}
                    </p>
                  </div>
                  <div className="ml-auto flex items-center pr-1">
                    <Plus className="text-slaanesh-gold/40 group-hover:text-slaanesh-accent transition-colors" size={20} />
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
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-5"
          >
            {/* Selected Game Card */}
            <div className="p-3 bg-slaanesh-accent/10 border border-slaanesh-accent/30 rounded flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-16 bg-black/40 rounded overflow-hidden flex-shrink-0 border border-slaanesh-gold/20 shadow-sm">
                  {pendingIndulgence.cover && (
                    <img src={pendingIndulgence.cover.url.replace('t_thumb', 't_cover_big')} className="w-full h-full object-cover" alt="" />
                  )}
                </div>
                <div className="min-w-0">
                  <span className="text-slaanesh-gold font-bold text-base block truncate">{pendingIndulgence.name}</span>
                  <span className="text-xs text-slaanesh-gold/60 block truncate mt-0.5">
                    {pendingIndulgence.first_release_date ? new Date(pendingIndulgence.first_release_date * 1000).getFullYear() : 'Unknown Year'}
                    {sortedPlatforms.length > 0 && ` • ${sortedPlatforms.join(', ')}`}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setPendingIndulgence(null)}
                className="text-slaanesh-gold/50 hover:text-slaanesh-gold p-2 rounded hover:bg-slaanesh-gold/10 transition-colors flex items-center gap-1 text-xs shrink-0 font-medium"
                title="Choose a different game"
              >
                <X size={16} />
                <span>Change</span>
              </button>
            </div>

            {/* Core Game Attributes */}
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Ritual Status */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slaanesh-gold/60 font-bold tracking-wider uppercase">Ritual Status</label>
                  <select 
                    value={ritualPrepForm.status_id}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="bg-slaanesh-panel border border-slaanesh-gold/20 rounded p-2.5 text-xs text-slaanesh-text outline-none focus:border-slaanesh-accent appearance-none transition-all cursor-pointer w-full"
                    style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%23c5a059\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1rem' }}
                  >
                    {statuses.game.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.label} ({s.categories.join(', ')})</option>
                    ))}
                  </select>
                </div>

                {/* Active Vessel (Playing Category Only) */}
                {isPlayingCategory ? (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-slaanesh-gold/60 font-bold tracking-wider uppercase">Active Vessel</label>
                    <select 
                      value={ritualPrepForm.active_platform || ''}
                      onChange={(e) => setRitualPrepForm((prev: any) => ({ ...prev, active_platform: e.target.value }))}
                      className="bg-slaanesh-panel border border-slaanesh-gold/20 rounded p-2.5 text-xs text-slaanesh-text outline-none focus:border-slaanesh-accent appearance-none transition-all cursor-pointer w-full"
                      style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%23c5a059\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1rem' }}
                    >
                      <option value="">None (Unset)</option>
                      {sortedPlatforms.map((p: string) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                      {sortedPlatforms.length === 0 && (
                        <option value="Unknown">Unknown Vessel</option>
                      )}
                    </select>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-slaanesh-gold/60 font-bold tracking-wider uppercase">Vaults of Possession</label>
                    <input 
                      type="text"
                      placeholder="e.g. Steam, GOG, Epic"
                      value={ritualPrepForm.owned_vaults || ''}
                      onChange={(e) => setRitualPrepForm((prev: any) => ({ ...prev, owned_vaults: e.target.value }))}
                      className="bg-slaanesh-panel border border-slaanesh-gold/20 rounded p-2.5 text-xs text-slaanesh-gold placeholder:text-slaanesh-gold/20 outline-none focus:border-slaanesh-accent transition-all font-serif italic w-full"
                    />
                  </div>
                )}
              </div>

              {/* If Playing category, show Vaults of Possession on second row alongside Reflections */}
              {isPlayingCategory && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slaanesh-gold/60 font-bold tracking-wider uppercase">Vaults of Possession</label>
                  <input 
                    type="text"
                    placeholder="e.g. Steam, GOG, Epic"
                    value={ritualPrepForm.owned_vaults || ''}
                    onChange={(e) => setRitualPrepForm((prev: any) => ({ ...prev, owned_vaults: e.target.value }))}
                    className="bg-slaanesh-panel border border-slaanesh-gold/20 rounded p-2.5 text-xs text-slaanesh-gold placeholder:text-slaanesh-gold/20 outline-none focus:border-slaanesh-accent transition-all font-serif italic w-full"
                  />
                </div>
              )}

              {/* Inscribed Reflections (Game comment) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slaanesh-gold/60 font-bold tracking-wider uppercase">Inscribed Reflections</label>
                <input 
                  type="text"
                  placeholder="Inscribe your thoughts"
                  value={ritualPrepForm.game_comment || ''}
                  onChange={(e) => setRitualPrepForm((prev: any) => ({ ...prev, game_comment: e.target.value }))}
                  className="bg-slaanesh-panel border border-slaanesh-gold/20 rounded p-2.5 text-xs text-slaanesh-gold placeholder:text-slaanesh-gold/20 outline-none focus:border-slaanesh-accent transition-all font-serif italic w-full"
                />
              </div>
            </div>

            {/* Chronicle of Rite (Playthrough) - Displayed when status is in the Played category */}
            {isPlayedCategory && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex flex-col gap-4 border border-slaanesh-gold/20 bg-slaanesh-panel/50 rounded p-4"
              >
                <div className="border-b border-slaanesh-gold/15 pb-2">
                  <h4 className="text-xs font-bold text-slaanesh-gold tracking-widest uppercase">Chronicle of Rite</h4>
                  <p className="text-[11px] text-slaanesh-gold/40">Initial playthrough required for the Played archive</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-slaanesh-gold/60 font-bold tracking-wider uppercase">Rite Date</label>
                    <DatePicker
                      selected={parseLocalDate(ritualPrepForm.date)}
                      onChange={(date: Date | null) => setRitualPrepForm((prev: any) => ({ ...prev, date: formatLocalDate(date) }))}
                      dateFormat="yyyy-MM-dd"
                      calendarStartDay={1}
                      className="w-full bg-slaanesh-panel border border-slaanesh-gold/20 rounded p-2 text-xs text-slaanesh-text outline-none focus:border-slaanesh-accent cursor-pointer"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-slaanesh-gold/60 font-bold tracking-wider uppercase">Outcome</label>
                    <select 
                      className="bg-slaanesh-panel border border-slaanesh-gold/20 rounded p-2 text-xs text-slaanesh-text outline-none focus:border-slaanesh-accent appearance-none transition-all cursor-pointer"
                      style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%23c5a059\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1rem' }}
                      value={ritualPrepForm.playthrough_status_id || ''}
                      onChange={e => setRitualPrepForm((prev: any) => ({ ...prev, playthrough_status_id: e.target.value || null }))}
                    >
                      {statuses.playthrough.map((s: any) => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-slaanesh-gold/60 font-bold tracking-wider uppercase">Vessel (Platform)</label>
                    <select 
                      className="bg-slaanesh-panel border border-slaanesh-gold/20 rounded p-2 text-xs text-slaanesh-text outline-none focus:border-slaanesh-accent appearance-none transition-all cursor-pointer"
                      style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%23c5a059\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1rem' }}
                      value={ritualPrepForm.platform}
                      onChange={e => setRitualPrepForm((prev: any) => ({ ...prev, platform: e.target.value }))}
                    >
                      {sortedPlatforms.map((p: string) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                      {sortedPlatforms.length === 0 && (
                        <option value="Unknown">Unknown Vessel</option>
                      )}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-slaanesh-gold/60 font-bold tracking-wider uppercase">Intensity Rating (0-100)</label>
                    <input 
                      type="number"
                      min="0"
                      max="100"
                      placeholder="Optional"
                      className="bg-slaanesh-panel border border-slaanesh-gold/20 rounded p-2 text-xs text-slaanesh-text outline-none focus:border-slaanesh-accent"
                      value={ritualPrepForm.rating === undefined ? '' : ritualPrepForm.rating}
                      onChange={e => setRitualPrepForm((prev: any) => ({ ...prev, rating: e.target.value === '' ? undefined : parseInt(e.target.value) }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-slaanesh-gold/60 font-bold tracking-wider uppercase">Volume of Excess</label>
                    <input 
                      placeholder="e.g. 25h"
                      className="bg-slaanesh-panel border border-slaanesh-gold/20 rounded p-2 text-xs text-slaanesh-text outline-none focus:border-slaanesh-accent"
                      value={ritualPrepForm.time_played}
                      onChange={e => setRitualPrepForm((prev: any) => ({ ...prev, time_played: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-slaanesh-gold/60 font-bold tracking-wider uppercase">Software Version</label>
                    <input 
                      placeholder="e.g. 1.0.4"
                      className="bg-slaanesh-panel border border-slaanesh-gold/20 rounded p-2 text-xs text-slaanesh-text outline-none focus:border-slaanesh-accent"
                      value={ritualPrepForm.version}
                      onChange={e => setRitualPrepForm((prev: any) => ({ ...prev, version: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slaanesh-gold/60 font-bold tracking-wider uppercase">Manifestation Comment</label>
                  <textarea 
                    className="bg-slaanesh-panel border border-slaanesh-gold/20 rounded p-2 text-xs text-slaanesh-gold h-16 resize-none outline-none focus:border-slaanesh-accent"
                    value={ritualPrepForm.comment}
                    onChange={e => setRitualPrepForm((prev: any) => ({ ...prev, comment: e.target.value }))}
                    placeholder="Log early thoughts..."
                  />
                </div>
              </motion.div>
            )}

            {/* Submission Action */}
            <button 
              onClick={() => addGame(pendingIndulgence)}
              className="mt-2 bg-slaanesh-accent text-white font-bold py-3 rounded-sm shadow-[0_0_20px_rgba(224,18,139,0.4)] hover:shadow-[0_0_30px_rgba(224,18,139,0.6)] transition-all tracking-wider text-sm uppercase cursor-pointer"
            >
              Finalize the Indulgence
            </button>
          </motion.div>
        )}
      </div>
    </Modal>
  );
}
