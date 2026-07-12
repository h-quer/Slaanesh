import React, { useState } from 'react';
import { Modal } from './Dialogs';
import { Settings, Save, RefreshCw, Download, Play, CheckCircle, List, Clock, Calendar, Eye, Trash2, Crosshair, ArrowUp, ArrowDown, Plus, Trash, EyeOff, MessageSquare, Edit2, X, GripVertical } from 'lucide-react';
import { cn, getPlatformMap } from '../lib/utils';
import { motion, Reorder } from 'motion/react';
// @ts-ignore
import { ChromePicker } from 'react-color';

interface SortCriterion {
  field: string;
  dir: 'asc' | 'desc' | 'custom';
}

function PlatformMappingRow({ 
  fromPlatform, 
  toAlias, 
  onUpdate, 
  onDelete
}: { 
  fromPlatform: string, 
  toAlias: string, 
  onUpdate: (val: string) => void, 
  onDelete: () => void
}) {
  const [val, setVal] = useState(toAlias);
  const [isEditing, setIsEditing] = useState(false);
  
  React.useEffect(() => {
    setVal(toAlias);
  }, [toAlias]);

  const handleSave = () => {
    if (val.trim()) {
      onUpdate(val.trim());
      setIsEditing(false);
    } else {
      setVal(toAlias);
    }
  };

  return (
    <Reorder.Item
      as="div"
      value={fromPlatform}
      id={`platform-map-item-${fromPlatform}`}
      className="grid grid-cols-[80px_1fr_1.5fr_120px] border-b border-slaanesh-gold/10 hover:bg-white/5 transition-all select-none items-center px-3 py-1.5 cursor-grab active:cursor-grabbing bg-black/10"
    >
      {/* Drag column */}
      <div className="flex items-center justify-start text-slaanesh-gold/40 hover:text-slaanesh-gold/70 transition-colors w-10 pl-1">
        <GripVertical className="w-4 h-4 cursor-grab" />
      </div>

      {/* From Column */}
      <div className="text-sm text-slaanesh-gold/90 font-mono font-medium max-w-[200px] truncate pr-2" title={fromPlatform}>
        {fromPlatform}
      </div>

      {/* To Column */}
      <div className="pr-2">
        {isEditing ? (
          <input
            type="text"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSave();
              } else if (e.key === 'Escape') {
                setVal(toAlias);
                setIsEditing(false);
              }
            }}
            placeholder="e.g. PlayStation, PC, etc."
            className="w-full bg-black/60 border border-slaanesh-gold/25 focus:border-slaanesh-accent text-slaanesh-text rounded px-2.5 py-1 text-xs outline-none transition-all placeholder:text-slaanesh-gold/30"
            id={`platform-alias-input-${fromPlatform}`}
            autoFocus
          />
        ) : (
          <span className="text-xs text-slaanesh-text/80 font-medium pl-1 block truncate">
            {toAlias}
          </span>
        )}
      </div>

      {/* Actions Column */}
      <div className="flex items-center justify-end gap-1.5 pr-2">
        {isEditing ? (
          <button
            onClick={handleSave}
            title="Save mapping"
            className="p-1 px-2 border border-green-500/20 text-green-400 hover:bg-green-500/10 hover:border-green-500/40 rounded transition-all"
            id={`save-platform-map-btn-${fromPlatform}`}
          >
            <Save className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            title="Edit mapping"
            className="p-1 px-2 border border-slaanesh-gold/20 text-slaanesh-gold/80 hover:bg-slaanesh-gold/10 hover:border-slaanesh-gold/40 rounded transition-all"
            id={`edit-platform-map-btn-${fromPlatform}`}
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          onClick={onDelete}
          title="Remove mapping"
          className="p-1 px-2 border border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/40 rounded transition-all"
          id={`delete-platform-map-btn-${fromPlatform}`}
        >
          <Trash className="w-3.5 h-3.5" />
        </button>
      </div>
    </Reorder.Item>
  );
}

export function SettingsModal(props: any) {
  const {
      games = [],
      isSettingsOpen, setIsSettingsOpen, settingsTab, setSettingsTab, uiSettings, updateUiSetting,
      refreshing, refreshMetadata, exportCsv, statuses, setStatuses, 
      deleteStatus, addGameStatus, addPlaythroughStatus, updateStatus, reorderStatus,
      confirmDeleteStatus, editingStatus, setEditingStatus,
      getSortCriteria, isColVisible, getColSetting, toggleCategory, setRefreshing, showAlert, fetchData, fetchStatuses, setDialog,
      GAME_DISPLAY_COLS, PLAYTHROUGH_DISPLAY_COLS, PLAYTHROUGH_SORT_OPTS, GAME_SORT_OPTS
  } = props;

  const allExistingPlatforms = React.useMemo(() => {
    const set = new Set<string>();
    games.forEach((g: any) => {
      if (g.platforms && Array.isArray(g.platforms)) {
        g.platforms.forEach((p: string) => {
          if (p) set.add(p);
        });
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [games]);

  const platformMap = React.useMemo(() => {
    return getPlatformMap(uiSettings);
  }, [uiSettings]);

  const unmappedPlatforms = React.useMemo(() => {
    return allExistingPlatforms.filter(p => !platformMap[p]);
  }, [allExistingPlatforms, platformMap]);

  const handleAddMapping = (fromPlatform: string, toAlias: string) => {
    if (!fromPlatform || !toAlias.trim()) return;
    const newMap = { ...platformMap, [fromPlatform]: toAlias.trim() };
    updateUiSetting('ui_platform_map', JSON.stringify(newMap));
  };

  const handleDeleteMapping = (fromPlatform: string) => {
    const newMap = { ...platformMap };
    delete newMap[fromPlatform];
    updateUiSetting('ui_platform_map', JSON.stringify(newMap));
  };

  const handleUpdateMapping = (fromPlatform: string, newAlias: string) => {
    const newMap = { ...platformMap, [fromPlatform]: newAlias.trim() };
    updateUiSetting('ui_platform_map', JSON.stringify(newMap));
  };

  const [localKeys, setLocalKeys] = React.useState<string[]>([]);

  React.useEffect(() => {
    const keys = Object.keys(platformMap);
    const isSameOrder = localKeys.length === keys.length && localKeys.every((k, i) => k === keys[i]);
    if (!isSameOrder) {
      setLocalKeys(keys);
    }
  }, [platformMap]);

  const handleReorderKeys = (newKeys: string[]) => {
    setLocalKeys(newKeys);
    const newMap: Record<string, string> = {};
    newKeys.forEach((k) => {
      newMap[k] = platformMap[k];
    });
    updateUiSetting('ui_platform_map', JSON.stringify(newMap));
  };

  const handleReorderMapping = (fromPlatform: string, direction: 'up' | 'down') => {
    const entries = Object.entries(platformMap);
    const idx = entries.findIndex(([k]) => k === fromPlatform);
    if (idx === -1) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === entries.length - 1) return;

    const newEntries = [...entries];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const temp = newEntries[idx];
    newEntries[idx] = newEntries[targetIdx];
    newEntries[targetIdx] = temp;

    const newMap: Record<string, string> = {};
    newEntries.forEach(([k, v]) => {
      newMap[k] = v;
    });
    updateUiSetting('ui_platform_map', JSON.stringify(newMap));
  };

  const [newFrom, setNewFrom] = React.useState('');
  const [newTo, setNewTo] = React.useState('');
  
  return (
<Modal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title="Ritual Configuration" className="md:max-w-4xl xl:max-w-5xl">
 <div className="flex flex-col gap-6 h-[70vh] min-h-[600px]">
 {/* Settings Tabs */}
   <div className="flex border-b border-slaanesh-gold/20 shrink-0 overflow-x-auto no-scrollbar scrollbar-hide">
 {[
 { id: 'visual', label: 'Visual' },
 { id: 'editor', label: 'Game Editor' },
 { id: 'platforms', label: 'Platforms' },
 { id: 'playing', label: 'Playing' },
 { id: 'played', label: 'Played' },
 { id: 'backlog', label: 'Backlog' },
 { id: 'wishlist', label: 'Wishlist' },
 { id: 'rites', label: 'Statuses' },
 { id: 'refresh', label: 'Data' }
 ].map(tab => (
 <button
 key={tab.id}
 onClick={() => setSettingsTab(tab.id as any)}
 className={cn(
 "px-4 py-2 text-sm tracking-wide transition-all relative",
 settingsTab === tab.id ? "text-slaanesh-accent font-bold" : "text-slaanesh-gold/50 hover:text-slaanesh-gold"
 )}
 >
 {tab.label}
 {settingsTab === tab.id && (
 <motion.div 
 layoutId="settingsTab"
 className="absolute bottom-0 left-0 right-0 h-0.5 bg-slaanesh-accent"
 />
 )}
 </button>
 ))}
 </div>

 <div className="flex-1 overflow-y-auto pr-2">
 {settingsTab === 'visual' && (
 <motion.div 
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 className="flex flex-col gap-8"
 >
 <div className="flex flex-col gap-4">
 <h4 className="text-slaanesh-gold text-base font-bold border-b border-slaanesh-gold/10 pb-2">Theme Preference</h4>
 <div className="flex items-center justify-between">
 <label className="text-sm text-slaanesh-text/70 tracking-wide">Display Mode</label>
 <div className="flex gap-2">
 {['system', 'light', 'dark'].map(mode => (
 <button
 key={mode}
 onClick={() => updateUiSetting('ui_theme_mode', mode)}
 className={cn(
 "px-3 py-1 rounded border text-xs capitalize transition-all",
 (uiSettings['ui_theme_mode'] || 'system') === mode 
 ? "border-slaanesh-accent bg-slaanesh-accent/20 text-slaanesh-accent" 
 : "border-slaanesh-gold/20 text-slaanesh-gold/50 hover:border-slaanesh-gold/40"
 )}
 >
 {mode}
 </button>
 ))}
 </div>
 </div>
 </div>

 <div className="flex flex-col gap-4">
 <h4 className="text-slaanesh-gold text-base font-bold border-b border-slaanesh-gold/10 pb-2">Overview Statistics</h4>
 {[
  { id: 'totals', label: 'Volumes of Excess' },
  { id: 'categories', label: 'Distribution of Obsession' },
  { id: 'platforms', label: 'Vessels of Rite' },
  { id: 'genres', label: 'Nature of Indulgence' },
  { id: 'themes', label: 'Essence of Indulgence' },
  { id: 'yearly', label: 'Temporal Echoes' },
  { id: 'completion', label: 'Ritual Purity' }
 ].map(stat => {
  const isManifested = uiSettings[`ui_show_stats_${stat.id}`] !== 'false';
  const hasPositiveFilter = stat.id === 'genres' || stat.id === 'themes' || stat.id === 'platforms';
  const onlyPositive = stat.id === 'platforms'
    ? uiSettings[`ui_stats_${stat.id}_positive_only`] === 'true'
    : uiSettings[`ui_stats_${stat.id}_positive_only`] !== 'false';
  const isYearly = stat.id === 'yearly';
  const yearsCount = parseInt(uiSettings[`ui_stats_yearly_count`] || '7', 10);

  return (
   <div key={stat.id} className="flex items-center justify-between">
   <label className="text-sm text-slaanesh-text/70 tracking-wide">{stat.label}</label>
   <div className="flex gap-2">
    {isYearly && (
     <div className="flex items-center border border-slaanesh-gold/20 rounded overflow-hidden">
      <button
       onClick={() => updateUiSetting('ui_stats_yearly_count', Math.max(1, yearsCount - 1).toString())}
       className="px-2 py-1 text-xs hover:bg-slaanesh-accent/10 text-slaanesh-gold/70 hover:text-slaanesh-accent transition-colors font-mono font-bold"
       title="Decrease years"
      >
       -
      </button>
      <span className="px-3 py-1 text-xs text-slaanesh-gold font-mono bg-white/5 min-w-[4.5rem] text-center border-x border-slaanesh-gold/20">
       {yearsCount} Years
      </span>
      <button
       onClick={() => updateUiSetting('ui_stats_yearly_count', Math.min(30, yearsCount + 1).toString())}
       className="px-2 py-1 text-xs hover:bg-slaanesh-accent/10 text-slaanesh-gold/70 hover:text-slaanesh-accent transition-colors font-mono font-bold"
       title="Increase years"
      >
       +
      </button>
     </div>
    )}
    {hasPositiveFilter && (
     <button
      onClick={() => updateUiSetting(`ui_stats_${stat.id}_positive_only`, onlyPositive ? 'false' : 'true')}
      className={cn(
       "px-3 py-1 rounded border text-xs transition-all min-w-[110px]",
       onlyPositive 
        ? "border-slaanesh-accent bg-slaanesh-accent/20 text-slaanesh-accent" 
        : "border-slaanesh-gold/20 text-slaanesh-gold/50 hover:border-slaanesh-gold/40"
      )}
     >
      {onlyPositive ? 'Positive Only' : (stat.id === 'genres' || stat.id === 'themes' ? 'All Games' : 'All Playthroughs')}
     </button>
    )}
    <button
     onClick={() => updateUiSetting(`ui_show_stats_${stat.id}`, isManifested ? 'false' : 'true')}
     className={cn(
      "px-3 py-1 rounded border text-xs capitalize transition-all min-w-[75px]",
      isManifested 
       ? "border-slaanesh-accent bg-slaanesh-accent/20 text-slaanesh-accent font-bold" 
       : "border-slaanesh-gold/20 text-slaanesh-gold/50 hover:border-slaanesh-gold/40"
     )}
    >
     {isManifested ? 'Manifest' : 'Banish'}
    </button>
   </div>
   </div>
  );
 })}
 </div>
 </motion.div>
 )}  {['playing', 'played', 'backlog', 'wishlist'].map(cat => (
    settingsTab === cat && (
      <motion.div 
        key={cat}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col gap-8 pb-8"
      >
        <div className="flex flex-col gap-4">
          <h4 className="text-slaanesh-gold text-base font-bold border-b border-slaanesh-gold/10 pb-2 capitalize">{cat} Manifestations</h4>
          <div className="flex items-center justify-between">
            <label className="text-xs tracking-wide text-slaanesh-text/70 font-bold">Display Mode</label>
            <div className="flex gap-2">
              {['card', 'list'].map(mode => (
                <button
                  key={mode}
                  onClick={() => updateUiSetting(`ui_view_mode_${cat}`, mode)}
                  className={cn(
                    "px-3 py-1 rounded border text-xs transition-all",
                    (uiSettings[`ui_view_mode_${cat}`] || 'card') === mode 
                      ? "border-slaanesh-accent bg-slaanesh-accent/20 text-slaanesh-accent" 
                      : "border-slaanesh-gold/20 text-slaanesh-gold/50 hover:border-slaanesh-gold/40"
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <h4 className="text-slaanesh-gold text-sm tracking-widest font-bold border-b border-slaanesh-gold/10 pb-1">Sorting Order</h4>
          {(() => {
            const criteria = getSortCriteria(cat);
            const updateCriteria = (newCriteria: SortCriterion[]) => {
              updateUiSetting(`ui_sort_config_${cat}`, JSON.stringify(newCriteria));
            };
            const options = cat === 'played' ? PLAYTHROUGH_SORT_OPTS : GAME_SORT_OPTS;
            return (
              <div className="flex flex-col gap-3">
                {criteria.map((crit, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs text-slaanesh-gold/40 min-w-[50px] tracking-widest font-bold">
                      {idx === 0 ? 'Prim' : idx === 1 ? 'Sec' : idx === 2 ? 'Tert' : `${idx+1}th`}:
                    </span>
                    <select 
                      className="flex-1 bg-slaanesh-panel/60 border border-slaanesh-gold/10 rounded px-2 py-1 text-xs text-slaanesh-gold outline-none focus:border-slaanesh-accent transition-all"
                      value={crit.field}
                      onChange={(e) => {
                        const next = [...criteria];
                        const newField = e.target.value;
                        let newDir = next[idx].dir;
                        if (newField !== 'game_status' && newField !== 'p_status' && newDir === 'custom') {
                          newDir = 'asc';
                        }
                        next[idx] = { ...next[idx], field: newField, dir: newDir };
                        updateCriteria(next);
                      }}
                    >
                      {options.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
                    </select>
                    <button 
                      onClick={() => {
                        const next = [...criteria];
                        if (
                          next[idx].field === 'game_status' || 
                          next[idx].field === 'p_status'
                        ) {
                          if (next[idx].dir === 'asc') next[idx].dir = 'desc';
                          else if (next[idx].dir === 'desc') next[idx].dir = 'custom';
                          else next[idx].dir = 'asc';
                        } else {
                          next[idx].dir = next[idx].dir === 'asc' ? 'desc' : 'asc';
                        }
                        updateCriteria(next);
                      }}
                      className="px-2 py-1 border border-slaanesh-gold/10 rounded text-xs font-mono text-slaanesh-gold hover:border-slaanesh-accent transition-all w-12 text-center bg-black/20"
                    >
                      {crit.dir}
                    </button>
                    {idx > 0 && (
                      <button onClick={() => updateCriteria(criteria.filter((_, i) => i !== idx))} className="p-1 hover:text-red-500 text-slaanesh-gold/30">
                        <X size={12} />
                      </button>
                    )}
                  </div>
                ))}
                {criteria.length < 5 && (
                  <button 
                    onClick={() => updateCriteria([...criteria, { field: 'name', dir: 'asc' }])}
                    className="text-xs text-slaanesh-gold/40 hover:text-slaanesh-accent flex items-center gap-1 mt-1 font-bold tracking-[0.2em]"
                  >
                    <Plus size={10} /> Add Layer
                  </button>
                )}
              </div>
            );
          })()}
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <h4 className="text-slaanesh-gold text-sm tracking-widest font-bold border-b border-slaanesh-gold/10 pb-1">Card Columns</h4>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {GAME_DISPLAY_COLS.filter(col => cat === 'played' || col.id !== 'game_rating').map(col => (
                <div key={col.id} className="flex items-center justify-between">
                  <label className="text-xs text-slaanesh-text/60 tracking-wider">
                     {cat === 'played' && col.id === 'game_rating' ? 'Seduction score (avg. rating)' : col.label}
                  </label>
                  <button
                    onClick={() => updateUiSetting(`ui_show_card_${cat}_${col.id}`, isColVisible('card', col.id, cat) ? 'false' : 'true')}
                    className={cn(
                      "px-2 py-0.5 rounded border text-[10px] transition-all font-bold",
                      isColVisible('card', col.id, cat) 
                        ? "border-slaanesh-accent bg-slaanesh-accent/20 text-slaanesh-accent" 
                        : "border-slaanesh-gold/10 text-slaanesh-gold/30 hover:border-slaanesh-gold/30"
                    )}
                  >
                    {isColVisible('card', col.id, cat) ? 'Yes' : 'No'}
                  </button>
                </div>
              ))}
              {cat === 'played' && PLAYTHROUGH_DISPLAY_COLS.map(col => (
                <div key={col.id} className="flex items-center justify-between">
                  <label className="text-xs text-slaanesh-accent/60 tracking-wider font-bold">{col.label}</label>
                  <button
                    onClick={() => updateUiSetting(`ui_show_card_${cat}_${col.id}`, isColVisible('card', col.id, cat) ? 'false' : 'true')}
                    className={cn(
                      "px-2 py-0.5 rounded border text-[10px] transition-all font-bold",
                      isColVisible('card', col.id, cat) 
                        ? "border-slaanesh-accent bg-slaanesh-accent/20 text-slaanesh-accent" 
                        : "border-slaanesh-gold/10 text-slaanesh-gold/30 hover:border-slaanesh-gold/30"
                    )}
                  >
                    {isColVisible('card', col.id, cat) ? 'Yes' : 'No'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <h4 className="text-slaanesh-gold text-sm tracking-widest font-bold border-b border-slaanesh-gold/10 pb-1">Table Columns</h4>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {GAME_DISPLAY_COLS.filter(col => cat === 'played' || col.id !== 'game_rating').map(col => {
                const isGameRating = col.id === 'game_rating';
                const key = `ui_show_table_${cat}_${col.id}`;
                let currentVal = isGameRating && cat === 'played' ? getColSetting('table', col.id, cat) : (isColVisible('table', col.id, cat) ? 'true' : 'false');
                
                let options = [
                  { label: 'Yes', value: 'true' },
                  { label: 'No', value: 'false' },
                ];
                if (isGameRating && cat === 'played') {
                  options.push({ label: 'With Comment', value: 'with_comment' });
                }

                const currentOpt = options.find(o => o.value === currentVal) || options[0];

                const cycleOption = () => {
                  const currentIndex = options.findIndex(o => o.value === currentVal);
                  const nextIndex = (currentIndex + 1) % options.length;
                  updateUiSetting(key, options[nextIndex].value);
                };

                return (
                <div key={col.id} className="flex flex-col gap-1 justify-center border-b border-slaanesh-gold/5 pb-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-slaanesh-text/60 tracking-wider">
                      {cat === 'played' && col.id === 'game_rating' ? 'Seduction score (avg. rating)' : col.label}
                    </label>
                    <button
                      onClick={isGameRating && cat === 'played' ? cycleOption : () => updateUiSetting(`ui_show_table_${cat}_${col.id}`, isColVisible('table', col.id, cat) ? 'false' : 'true')}
                      className={cn(
                        "px-2 py-0.5 rounded border text-[10px] transition-all font-bold min-w-[3rem]",
                        currentVal === 'true' 
                          ? "border-slaanesh-accent bg-slaanesh-accent/20 text-slaanesh-accent" 
                          : currentVal === 'false'
                          ? "border-slaanesh-gold/10 text-slaanesh-gold/30 hover:border-slaanesh-gold/30"
                          : "border-slaanesh-gold/50 bg-slaanesh-gold/10 text-slaanesh-gold"
                      )}
                    >
                      {isGameRating && cat === 'played' ? currentOpt.label : (isColVisible('table', col.id, cat) ? 'Yes' : 'No')}
                    </button>
                  </div>
                </div>
              )})}
              {cat === 'played' && PLAYTHROUGH_DISPLAY_COLS.map(col => {
                const key = `ui_show_table_${cat}_${col.id}`;
                let currentVal = getColSetting('table', col.id, cat);
                
                // Allow specific options for these fields
                let options = [
                  { label: 'Yes', value: 'true' },
                  { label: 'No', value: 'false' },
                ];
                
                if (col.id === 'p_status') {
                  options.push({ label: 'With Status', value: 'with_status' });
                } else if (col.id === 'p_comment') {
                  options.push({ label: 'With Game Comment', value: 'with_game_comment' });
                } else if (['p_version', 'p_rating', 'p_time'].includes(col.id)) {
                  options.push({ label: 'With Comment', value: 'with_comment' });
                }

                const currentOpt = options.find(o => o.value === currentVal) || options[0];

                const cycleOption = () => {
                  const currentIndex = options.findIndex(o => o.value === currentVal);
                  const nextIndex = (currentIndex + 1) % options.length;
                  updateUiSetting(key, options[nextIndex].value);
                };

                return (
                  <div key={col.id} className="flex flex-col gap-1 justify-center border-b border-slaanesh-gold/5 pb-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-slaanesh-accent/60 tracking-wider font-bold">{col.label}</label>
                      <button
                        onClick={cycleOption}
                        className={cn(
                          "px-2 py-0.5 rounded border text-[10px] transition-all font-bold min-w-[3rem]",
                          currentVal === 'true' 
                            ? "border-slaanesh-accent bg-slaanesh-accent/20 text-slaanesh-accent" 
                            : currentVal === 'false'
                            ? "border-slaanesh-gold/10 text-slaanesh-gold/30 hover:border-slaanesh-gold/30"
                            : "border-slaanesh-gold/50 bg-slaanesh-gold/10 text-slaanesh-gold"
                        )}
                      >
                        {currentOpt.label}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>
    )
  ))}

  {settingsTab === 'editor' && (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col gap-8 pb-8"
    >
      <div className="flex flex-col gap-4">
        <h4 className="text-slaanesh-gold text-base font-bold border-b border-slaanesh-gold/10 pb-2">Editor Metadata Visibility</h4>
        <p className="text-[10px] text-slaanesh-text/60 italic">Govern which pieces of IGDB metadata are revealed within the manifestation editor.</p>
        
        <div className="flex flex-col gap-4 mt-2">
          {[
            { id: 'summary', label: 'Manifestation Summary' },
            { id: 'genres', label: 'Nature (Genres)' },
            { id: 'themes', label: 'Essence (Themes)' },
            { id: 'platforms', label: 'Vessels of Indulgence (Platforms)' },
            { id: 'release_date', label: 'Temporal Existence (Release Date)' },
            { id: 'release_status', label: 'Manifestation Status' },
            { id: 'developers', label: 'Architects (Developers)' },
            { id: 'publishers', label: 'Heralds (Publishers)' },
            { id: 'websites', label: 'Holy Web-Gateways (Websites)' },
            { id: 'shops', label: 'Gateways of Acquisition (Shops)' },
            { id: 'owned_vaults', label: 'Vaults of Possession (Owned Stores)' }
          ].map(field => (
            <div key={field.id} className="flex items-center justify-between bg-white/5 p-3 rounded-sm border border-white/5 hover:border-slaanesh-accent/20 transition-all">
              <label className="text-sm text-slaanesh-text/80 tracking-wide">{field.label}</label>
              <div className="flex gap-2">
                <button
                  onClick={() => updateUiSetting(`ui_editor_show_${field.id}`, 'true')}
                  className={cn(
                    "px-4 py-1.5 rounded border text-[10px] uppercase font-bold tracking-widest transition-all",
                    (uiSettings[`ui_editor_show_${field.id}`] !== 'false') 
                      ? "border-slaanesh-accent bg-slaanesh-accent/20 text-slaanesh-accent" 
                      : "border-slaanesh-gold/20 text-slaanesh-gold/50 hover:border-slaanesh-gold/40"
                  )}
                >
                  Reveal
                </button>
                <button
                  onClick={() => updateUiSetting(`ui_editor_show_${field.id}`, 'false')}
                  className={cn(
                    "px-4 py-1.5 rounded border text-[10px] uppercase font-bold tracking-widest transition-all",
                    uiSettings[`ui_editor_show_${field.id}`] === 'false'
                      ? "border-slaanesh-accent bg-slaanesh-accent/20 text-slaanesh-accent" 
                      : "border-slaanesh-gold/20 text-slaanesh-gold/50 hover:border-slaanesh-gold/40"
                  )}
                >
                  Conceal
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )}

  {settingsTab === 'platforms' && (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col gap-8 pb-8"
    >
      <div className="flex flex-col gap-4">
        <h4 className="text-slaanesh-gold text-base font-bold">Platform Display Map</h4>
        
        <div className="flex flex-col gap-6 mt-2">
          {/* Add Form Card */}
          <div className="bg-black/20 border border-slaanesh-gold/20 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 flex flex-col gap-1.5 w-full">
              <label className="text-xs text-slaanesh-gold/80 font-semibold">Unmapped vessel (From)</label>
              <select
                value={newFrom}
                onChange={(e) => setNewFrom(e.target.value)}
                className="w-full bg-black/40 border border-slaanesh-gold/20 focus:border-slaanesh-accent text-slaanesh-text text-xs rounded p-2 outline-none transition-all"
                id="new-platform-alias-from-select"
              >
                <option value="" className="bg-slaanesh-panel text-slaanesh-text">-- Select an unmapped vessel --</option>
                {unmappedPlatforms.map(p => (
                  <option key={p} value={p} className="bg-slaanesh-panel text-slaanesh-text">{p}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 flex flex-col gap-1.5 w-full">
              <label className="text-xs text-slaanesh-gold/80 font-semibold">Custom alias (To)</label>
              <input
                type="text"
                value={newTo}
                onChange={(e) => setNewTo(e.target.value)}
                placeholder="e.g. PlayStation, Nintendo"
                className="w-full bg-black/40 border border-slaanesh-gold/20 focus:border-slaanesh-accent text-slaanesh-text text-xs rounded p-2 outline-none transition-all"
                id="new-platform-alias-to-input"
              />
            </div>
            <button
              onClick={() => {
                if (!newFrom || !newTo.trim()) return;
                handleAddMapping(newFrom, newTo.trim());
                setNewFrom('');
                setNewTo('');
              }}
              disabled={!newFrom || !newTo.trim()}
              className="px-4 py-2 bg-slaanesh-accent/20 border border-slaanesh-accent text-slaanesh-accent hover:bg-slate-accent hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slaanesh-accent transition-all rounded text-xs font-bold shrink-0 flex items-center gap-1.5 h-[36px]"
              id="add-platform-alias-btn"
            >
              <Plus className="w-4 h-4" /> Add Alias
            </button>
          </div>

          {/* Draggable List of Aliases */}
          <div className="flex flex-col gap-2">
            <h5 className="text-xs text-slaanesh-gold/80 font-bold">Active vessel aliases</h5>
            {Object.keys(platformMap).length === 0 ? (
              <div className="border border-dashed border-slaanesh-gold/10 rounded-xl p-6 text-center text-xs text-slaanesh-text/40 italic">
                No active vessel mappings defined. Standard database values will be utilized.
              </div>
            ) : (
              <div className="border border-slaanesh-gold/15 rounded-xl overflow-hidden bg-black/20">
                {/* Pseudo-table header */}
                <div className="grid grid-cols-[80px_1fr_1.5fr_120px] bg-white/5 border-b border-slaanesh-gold/15 px-3 py-2 text-left items-center select-none">
                  <div className="text-xs font-bold text-slaanesh-gold/70 font-sans pl-1">Order</div>
                  <div className="text-xs font-bold text-slaanesh-gold/70 font-sans">From (database vessel)</div>
                  <div className="text-xs font-bold text-slaanesh-gold/70 font-sans pl-1">To (display alias)</div>
                  <div className="text-xs font-bold text-slaanesh-gold/70 font-sans text-right pr-2">Actions</div>
                </div>

                <Reorder.Group 
                  axis="y" 
                  values={localKeys} 
                  onReorder={handleReorderKeys}
                  className="flex flex-col divide-y divide-slaanesh-gold/10"
                >
                  {localKeys.map((fromP) => (
                    <PlatformMappingRow 
                      key={fromP}
                      fromPlatform={fromP}
                      toAlias={platformMap[fromP] || ''}
                      onUpdate={(newAlias) => handleUpdateMapping(fromP, newAlias)}
                      onDelete={() => handleDeleteMapping(fromP)}
                    />
                  ))}
                </Reorder.Group>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )}

 {settingsTab === 'rites' && (
 <motion.div 
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 className="flex flex-col gap-10"
 >
 {/* Game Statuses section */}
 <div className="flex flex-col gap-4">
 <div className="flex items-center justify-between border-b border-slaanesh-gold/10 pb-2">
 <h4 className="text-slaanesh-gold text-base tracking-wider font-bold">Game Statuses</h4>
 <button 
 onClick={() => addGameStatus()}
 className="text-xs text-slaanesh-accent hover:text-white flex items-center gap-1 tracking-wide transition-colors font-bold"
 >
 <Plus size={14} /> Add Manifestation
 </button>
 </div>
 
 <div className="flex flex-col gap-3">
 {statuses.game.map((s, idx) => (
 <div key={s.id} className="group flex flex-col gap-2 bg-slaanesh-gold/5 p-3 rounded-lg border border-slaanesh-gold/10 hover:border-slaanesh-accent/30 transition-all">
 <div className="flex items-center gap-3">
 <button 
 className="w-3 h-3 rounded-full shrink-0 shadow-[0_0_8px_rgba(var(--status-color),0.5)]" 
 style={s.color ? ({ backgroundColor: s.color, '--status-color': s.color } as any) : {}}
 onClick={() => setEditingStatus({ type: 'game', statusId: s.id })}
 />
 <div className="flex-1 flex items-center gap-2">
 <span className="text-xs font-bold text-slaanesh-gold tracking-wider">{s.label}</span>
 <button 
 onClick={() => setEditingStatus({ type: 'game', statusId: s.id })}
 className="opacity-0 group-hover:opacity-100 p-1 hover:text-slaanesh-accent transition-all"
 >
 <Edit2 size={10} />
 </button>
 </div>

 <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
 <button 
 disabled={idx === 0}
 onClick={() => reorderStatus('game', s.id, 'up')}
 className="p-1 hover:text-slaanesh-accent disabled:opacity-20 transition-colors"
 >
 <ArrowUp size={14} />
 </button>
 <button 
 disabled={idx === statuses.game.length - 1}
 onClick={() => reorderStatus('game', s.id, 'down')}
 className="p-1 hover:text-slaanesh-accent disabled:opacity-20 transition-colors"
 >
 <ArrowDown size={14} />
 </button>
 <button 
 onClick={() => confirmDeleteStatus('game', s.id)} 
 className="p-1 hover:text-red-500 transition-colors ml-2"
 >
 <Trash2 size={14} />
 </button>
 </div>
 </div>

 {/* Category Toggles */}
 <div className="flex flex-wrap items-center gap-2 mt-1">
 <div className="flex flex-wrap gap-2">
 {['playing', 'played', 'backlog', 'wishlist'].map(cat => {
 const isActive = s.categories.includes(cat);
 return (
 <button
 key={cat}
 onClick={() => toggleCategory(s.id, cat)}
 className={cn(
 "px-2 py-1 rounded text-xs transition-all border",
 isActive 
 ? "bg-slaanesh-accent/20 border-slaanesh-accent text-slaanesh-accent font-bold" 
 : "bg-black/20 border-slaanesh-gold/10 text-slaanesh-gold/30 hover:border-slaanesh-gold/30"
 )}
 >
 {cat}
 </button>
 );
 })}
 </div>

 {s.categories.includes('played') && (
 <>
 {/* Small visual separator */}
 <div className="h-4 w-[1px] bg-slaanesh-gold/20 mx-1 shrink-0" />

 <button
 onClick={() => {
 const newIsPositive = s.is_positive === 1 ? 0 : 1;
 updateStatus('game', s.id, { ...s, is_positive: newIsPositive });
 }}
 className={cn(
 "px-2 py-1 rounded text-[10px] uppercase font-bold tracking-widest transition-all border shrink-0",
 s.is_positive === 1
 ? "bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20"
 : "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
 )}
 >
 {s.is_positive === 1 ? "positive" : "negative"}
 </button>
 </>
 )}
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Playthrough Statuses section */}
 <div className="flex flex-col gap-4">
 <div className="flex items-center justify-between border-b border-slaanesh-gold/10 pb-2">
 <h4 className="text-slaanesh-gold text-base tracking-wider font-bold">Playthrough Statuses</h4>
 <button 
 onClick={() => addPlaythroughStatus()}
 className="text-xs text-slaanesh-accent hover:text-white flex items-center gap-1 tracking-wide transition-colors font-bold"
 >
 <Plus size={14} /> Add Ritual State
 </button>
 </div>
 
 <div className="flex flex-col gap-2">
 {statuses.playthrough.map((s, idx) => {
  const isNullStatus = s.id === '__null__';
  return (
 <div key={s.id} className="group flex items-center gap-3 bg-slaanesh-gold/5 p-3 rounded border border-slaanesh-gold/10 hover:border-slaanesh-accent/30 transition-all">
  <button 
  className={cn("w-3 h-3 rounded-full shrink-0", isNullStatus ? "border border-slaanesh-gold/30 bg-black/40" : "")} 
  style={s.color && !isNullStatus ? { backgroundColor: s.color } : {}}
  onClick={() => !isNullStatus && setEditingStatus({ type: 'playthrough', statusId: s.id })}
  disabled={isNullStatus}
  />
  <div className="flex-1 flex items-center gap-2">
  <span className={cn("text-xs tracking-widest", isNullStatus ? "text-slaanesh-accent font-bold" : "text-slaanesh-gold/80")}>
  {isNullStatus ? "Not Set" : s.label}
  </span>
  {!isNullStatus && (
  <button 
  onClick={() => setEditingStatus({ type: 'playthrough', statusId: s.id })}
  className="opacity-0 group-hover:opacity-100 p-1 hover:text-slaanesh-accent transition-all"
  >
  <Edit2 size={10} />
  </button>
  )}
  </div>

  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
  <button 
  disabled={idx === 0}
  onClick={() => reorderStatus('playthrough', s.id, 'up')}
  className="p-1 hover:text-slaanesh-accent disabled:opacity-20 transition-colors"
  >
  <ArrowUp size={14} />
  </button>
  <button 
  disabled={idx === statuses.playthrough.length - 1}
  onClick={() => reorderStatus('playthrough', s.id, 'down')}
  className="p-1 hover:text-slaanesh-accent disabled:opacity-20 transition-colors"
  >
  <ArrowDown size={14} />
  </button>
  {!isNullStatus && (
  <button 
  onClick={() => confirmDeleteStatus('playthrough', s.id)} 
  className="p-1 hover:text-red-500 transition-colors ml-2"
  >
  <Trash2 size={14} />
  </button>
  )}
  </div>
 </div>
 );
 })}
 </div>
 </div>
 </motion.div>
 )}

 {settingsTab === 'refresh' && (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="flex flex-col gap-8 pb-8"
  >
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h4 className="text-slaanesh-gold text-base font-bold border-b border-slaanesh-gold/10 pb-2">Archival Maintenance</h4>
        <p className="text-xs text-slaanesh-gold/40 italic">Synchronize our records with the Immaterium (IGDB). These rites may take time depending on your collection size.</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="p-4 bg-slaanesh-gold/5 border border-slaanesh-gold/10 rounded-sm flex items-center justify-between hover:border-slaanesh-accent/40 transition-all">
          <div className="flex flex-col gap-1">
            <span className="text-slaanesh-gold font-bold text-sm tracking-wide">Check Database Consistency</span>
            <p className="text-[10px] text-slaanesh-text/50">Verify database integrity rules regarding game statuses and ritual records.</p>
          </div>
          <button 
            disabled={!!refreshing}
            onClick={async () => {
              setRefreshing('consistency');
              try {
                const res = await fetch('/api/admin/check-consistency');
                if (!res.ok) throw new Error();
                const data = await res.json();
                if (data.issues && data.issues.length > 0) {
                  setDialog({
                    isOpen: true,
                    title: "Inconsistencies Detected",
                    message: data.issues.map((i: string) => `• ${i}`).join('\n\n'),
                    onConfirm: () => setDialog({ isOpen: false }),
                    isAlert: true,
                    confirmLabel: 'Close'
                  });
                } else {
                  showAlert('Consistency Check', 'No inconsistencies found. The archive is pure.');
                }
              } catch (e) {
                showAlert('Database Error', 'Failed to communicate with the archive.');
              } finally {
                setRefreshing(null);
              }
            }}
            className={cn(
              "px-4 py-2 rounded-sm text-[10px] font-bold tracking-widest transition-all",
              refreshing === 'consistency' ? "bg-slaanesh-accent text-white animate-pulse" : "bg-slaanesh-gold/10 text-slaanesh-gold border border-slaanesh-gold/30 hover:bg-slaanesh-gold hover:text-slaanesh-deep"
            )}
          >
            {refreshing === 'consistency' ? 'Verifying...' : 'Analyze Integrity'}
          </button>
        </div>

        <div className="p-4 bg-slaanesh-gold/5 border border-slaanesh-gold/10 rounded-sm flex items-center justify-between hover:border-slaanesh-accent/40 transition-all">
          <div className="flex flex-col gap-1">
            <span className="text-slaanesh-gold font-bold text-sm tracking-wide">Sync Arrival Metadata</span>
            <p className="text-[10px] text-slaanesh-text/50">Update full IGDB metadata and release info for wishlist items and future arrivals.</p>
          </div>
          <button 
            disabled={!!refreshing}
            onClick={async () => {
              setRefreshing('dates');
              try {
                const res = await fetch('/api/admin/refresh-dates', { method: 'POST' });
                if (!res.ok) throw new Error();
                const data = await res.json();
                showAlert('Archival Sync', data.message);
                fetchData();
              } catch (e) {
                showAlert('Sync Failed', 'Failed to communicate with the archival plane.');
              } finally {
                setRefreshing(null);
              }
            }}
            className={cn(
              "px-4 py-2 rounded-sm text-[10px] font-bold tracking-widest transition-all",
              refreshing === 'dates' ? "bg-slaanesh-accent text-white animate-pulse" : "bg-slaanesh-gold/10 text-slaanesh-gold border border-slaanesh-gold/30 hover:bg-slaanesh-gold hover:text-slaanesh-deep"
            )}
          >
            {refreshing === 'dates' ? 'Syncing...' : 'Perform Rite'}
          </button>
        </div>

        <div className="p-4 bg-slaanesh-gold/5 border border-slaanesh-gold/10 rounded-sm flex items-center justify-between hover:border-slaanesh-accent/40 transition-all">
          <div className="flex flex-col gap-1">
            <span className="text-slaanesh-gold font-bold text-sm tracking-wide">Purify Vessels (Covers)</span>
            <p className="text-[10px] text-slaanesh-text/50">Check for missing or updated cover art. Only downloads if changes are detected.</p>
          </div>
          <button 
            disabled={!!refreshing}
            onClick={async () => {
              setRefreshing('covers');
              try {
                const res = await fetch('/api/admin/refresh-covers', { method: 'POST' });
                if (!res.ok) throw new Error();
                const data = await res.json();
                showAlert('Archival Sync', data.message);
                fetchData();
              } catch (e) {
                showAlert('Sync Failed', 'Failed to communicate with the archival plane.');
              } finally {
                setRefreshing(null);
              }
            }}
            className={cn(
              "px-4 py-2 rounded-sm text-[10px] font-bold tracking-widest transition-all",
              refreshing === 'covers' ? "bg-slaanesh-accent text-white animate-pulse" : "bg-slaanesh-gold/10 text-slaanesh-gold border border-slaanesh-gold/30 hover:bg-slaanesh-gold hover:text-slaanesh-deep"
            )}
          >
            {refreshing === 'covers' ? 'Syncing...' : 'Perform Rite'}
          </button>
        </div>

        <div className="p-4 bg-slaanesh-accent/5 border border-slaanesh-accent/20 rounded-sm flex items-center justify-between hover:border-slaanesh-accent/40 transition-all">
          <div className="flex flex-col gap-1">
            <span className="text-slaanesh-accent font-bold text-sm tracking-wide">Total Epiphany (Sync All)</span>
            <p className="text-[10px] text-slaanesh-text/50">Full metadata refresh for all games in the archive. High resource consumption.</p>
          </div>
          <button 
            disabled={!!refreshing}
            onClick={() => {
              setDialog({
                isOpen: true,
                title: "Total Epiphany",
                message: "Are you certain? This will query IGDB for EVERY game in your collection and refresh all metadata, including covers. It may take some time.",
                onConfirm: async () => {
                  setRefreshing('all');
                  try {
                    const res = await fetch('/api/admin/refresh-all', { method: 'POST' });
                    if (!res.ok) throw new Error();
                    const data = await res.json();
                    showAlert('Total Epiphany', data.message);
                    fetchData();
                  } catch (e) {
                    showAlert('Total Epiphany Failed', 'Failed to communicate with the archival plane.');
                  } finally {
                    setRefreshing(null);
                  }
                }
              });
            }}
            className={cn(
              "px-4 py-2 rounded-sm text-[10px] font-bold tracking-widest transition-all shadow-[0_0_15px_rgba(224,18,139,0.1)]",
              refreshing === 'all' ? "bg-slaanesh-accent text-white animate-pulse" : "bg-slaanesh-accent/20 text-slaanesh-accent border border-slaanesh-accent/40 hover:bg-slaanesh-accent hover:text-white"
            )}
          >
            {refreshing === 'all' ? 'Transcending...' : 'Begin Rite'}
          </button>
        </div>

        <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-sm flex items-center justify-between hover:border-red-500/30 transition-all">
          <div className="flex flex-col gap-1">
            <span className="text-red-500 font-bold text-sm tracking-wide">Purge the Archives (Wipe Database)</span>
            <p className="text-[10px] text-slaanesh-text/50">Erase all archives, custom statuses, and logged walkthroughs. This action is absolute and irreversible.</p>
          </div>
          <button 
            disabled={!!refreshing}
            onClick={() => {
              setDialog({
                isOpen: true,
                title: "Purge the Archives",
                message: "WARNING: You are about to initiate a complete purge of your collection, including all games, custom statuses, and logged walkthroughs. All stored data will be permanently deleted. Are you absolutely certain you wish to proceed?",
                onConfirm: async () => {
                  setRefreshing('wipe');
                  try {
                    const res = await fetch('/api/admin/wipe-db', { method: 'POST' });
                    if (!res.ok) throw new Error();
                    const data = await res.json();
                    showAlert('Purge Complete', 'The archives have been cleansed. A fresh, empty database has been re-initialized.');
                    fetchStatuses();
                    fetchData();
                  } catch (e) {
                    showAlert('Purge Failed', 'Failed to cleanse the archival plane.');
                  } finally {
                    setRefreshing(null);
                  }
                }
              });
            }}
            className={cn(
              "px-4 py-2 rounded-sm text-[10px] font-bold tracking-widest transition-all",
              refreshing === 'wipe' ? "bg-red-500 text-white animate-pulse" : "bg-red-500/10 text-red-500 border border-red-500/25 hover:bg-red-500 hover:text-white"
            )}
          >
            {refreshing === 'wipe' ? 'Purging...' : 'Purge All'}
          </button>
        </div>
      </div>
    </div>
  </motion.div>
  )}
 </div>
 </div>
 </Modal>
  );
}
