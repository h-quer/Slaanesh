import { RiteEditorModal } from './components/RiteEditorModal';
import { GameEditorModal } from './components/GameEditorModal';
import { ImportModal } from './components/ImportModal';
import { Header } from './components/Header';
import { SettingsModal } from './components/SettingsModal';
import { IndulgeModal } from './components/IndulgeModal';
import { AboutModal } from './components/AboutModal';
import { OverviewTab } from './components/OverviewTab';
import { LibraryTab } from './components/LibraryTab';
import { PlaythroughTab } from './components/PlaythroughTab';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
 Plus, Settings, Download, Info, Search, X, Trash2, Edit2, ChevronRight, ChevronDown, ChevronUp,
 Clock, Calendar, Star, ExternalLink, RefreshCw, Filter, ArrowUp, ArrowDown, Upload
} from 'lucide-react';
import { Modal, ConfirmDialog } from './components/Dialogs';
import { FilterMenu } from './components/FilterMenu';
import initSqlJs from 'sql.js';
import Papa from 'papaparse';
import { cn, sortPlatforms, getPlatformMap, getDisplayPlatform, sortOriginalPlatformsByMap } from './lib/utils';
import { Game, StatData, SortCriterion } from './types';

const GAME_SORT_OPTS = [
 { id: 'name', label: 'Title' },
 { id: 'last_updated', label: 'Last Activity' },
 { id: 'game_status', label: 'Status' },
 { id: 'game_platforms', label: 'Vessels' },
 { id: 'game_release_date', label: 'Release Date' },
 { id: 'game_release_status', label: 'Release Status' },
 { id: 'game_shops', label: 'Gateways' },
 { id: 'game_owned_vaults', label: 'Vaults of Possession' },
 { id: 'game_genres', label: 'Genres' },
 { id: 'game_themes', label: 'Themes' },
 { id: 'game_comment', label: 'Game Comment' }
];

const PLAYTHROUGH_SORT_OPTS = [
 { id: 'name', label: 'Title' },
 { id: 'last_updated', label: 'Last Activity' },
 { id: 'game_status', label: 'Status' },
 { id: 'game_platforms', label: 'Vessels' },
 { id: 'game_rating', label: 'Seduction Score (avg. rating)' },
 { id: 'game_release_date', label: 'Release Date' },
 { id: 'game_release_status', label: 'Release Status' },
 { id: 'game_shops', label: 'Gateways' },
 { id: 'game_owned_vaults', label: 'Vaults of Possession' },
 { id: 'game_genres', label: 'Genres' },
 { id: 'game_themes', label: 'Themes' },
 { id: 'game_comment', label: 'Game Comment' },
 { id: 'p_date', label: 'Play Date' },
 { id: 'p_platform', label: 'Rite Vessel' },
 { id: 'p_status', label: 'Outcome' },
 { id: 'p_rating', label: 'Playthrough Rating' },
 { id: 'p_time', label: 'Time Played' },
 { id: 'p_comment', label: 'Ritual Comment' },
 { id: 'p_version', label: 'Version' }
];

const GAME_DISPLAY_COLS = [
  { id: 'game_status', label: 'Status' },
  { id: 'game_platforms', label: 'Vessels' },
  { id: 'game_rating', label: 'Seduction Score' },
  { id: 'game_release_date', label: 'Release Date' },
  { id: 'game_release_status', label: 'Release Status' },
  { id: 'game_shops', label: 'Gateways' },
  { id: 'game_owned_vaults', label: 'Vaults of Possession' },
  { id: 'game_genres', label: 'Genres' },
  { id: 'game_themes', label: 'Themes' },
  { id: 'game_comment', label: 'Game Comment' },
];

const PLAYTHROUGH_DISPLAY_COLS = [
  { id: 'p_date', label: 'Play Date' },
  { id: 'p_platform', label: 'Rite Vessel' },
  { id: 'p_status', label: 'Outcome' },
  { id: 'p_rating', label: 'Rating' },
  { id: 'p_time', label: 'Time Played' },
  { id: 'p_comment', label: 'Ritual Comment' },
  { id: 'p_version', label: 'Version' },
];

// --- Components ---



// --- Import Modal Component ---
// ImportModal extracted
export default function App() {
 const [hasIgdbCreds, setHasIgdbCreds] = useState(true);
 const [activeTab, setActiveTab] = useState<'overview' | 'playing' | 'played' | 'backlog' | 'wishlist'>(() => {
  const saved = localStorage.getItem('last_active_tab');
  const validTabs = ['overview', 'playing', 'played', 'backlog', 'wishlist'];
  if (saved && validTabs.includes(saved)) {
   return saved as 'overview' | 'playing' | 'played' | 'backlog' | 'wishlist';
  }
  return 'overview';
 });

 useEffect(() => {
  localStorage.setItem('last_active_tab', activeTab);
 }, [activeTab]);

 const [games, setGames] = useState<Game[]>([]);
 const [loading, setLoading] = useState(true);
 const [stats, setStats] = useState<StatData | null>(null);

 // Filters & Global Search
 const [columnFilters, setColumnFilters] = useState<Record<string, Record<string, { value: string; type: 'text' | 'empty' | 'not_empty' }>>>({
  playing: {},
  played: {},
  backlog: {},
  wishlist: {}
 });
 const [activeFilterCol, setActiveFilterCol] = useState<Record<string, string | null>>({
  playing: null,
  played: null,
  backlog: null,
  wishlist: null
 });
 const [globalQuery, setGlobalQuery] = useState('');
 const [globalSearchResults, setGlobalSearchResults] = useState<Game[]>([]);
 const [showGlobalResults, setShowGlobalResults] = useState(false);

 useEffect(() => {
  if (globalQuery.trim().length > 0) {
   const results = games
    .filter(g => g.name.toLowerCase().includes(globalQuery.toLowerCase()))
    .slice(0, 10);
   setGlobalSearchResults(results);
   setShowGlobalResults(true);
  } else {
   setGlobalSearchResults([]);
   setShowGlobalResults(false);
  }
 }, [globalQuery, games]);

 // Legacy Filters
 const [tabFilters, setTabFilters] = useState<Record<string, string>>({
 name: '',
 platform: '',
 status: '',
 comment: ''
 });
 
 // Modals
 const [isIndulgeOpen, setIsIndulgeOpen] = useState(false);
 const [pendingIndulgence, setPendingIndulgence] = useState<any | null>(null);
 const [isSettingsOpen, setIsSettingsOpen] = useState(false);
 const [refreshing, setRefreshing] = useState<string | null>(null);
 const [settingsTab, setSettingsTab] = useState<'visual' | 'playing' | 'played' | 'backlog' | 'wishlist' | 'rites' | 'refresh' | 'editor'>('visual');
 const [isAboutOpen, setIsAboutOpen] = useState(false);
 const [isImportOpen, setIsImportOpen] = useState(false);
 const [dialog, setDialog] = useState<{
 isOpen: boolean;
 title: string;
 message: string;
 onConfirm: ((value?: string) => void) | null;
 isAlert?: boolean;
 showInput?: boolean;
 defaultValue?: string;
 showSelect?: boolean;
 selectOptions?: { id: string; label: string }[];
 confirmLabel?: string;
 cancelLabel?: string;
 }>({
 isOpen: false,
 title: '',
 message: '',
 onConfirm: null,
 isAlert: false,
 showInput: false,
 defaultValue: '',
 showSelect: false,
 selectOptions: [],
 confirmLabel: '',
 cancelLabel: ''
 });

 const [dialogInputValue, setDialogInputValue] = useState('');
 const [dialogSelectValue, setDialogSelectValue] = useState('');

 const showConfirm = (title: string, message: string, onConfirm: () => void) => {
 setDialog({ isOpen: true, title, message, onConfirm, isAlert: false });
 };

 const showAlert = (title: string, message: string) => {
 setDialog({ isOpen: true, title, message, onConfirm: null, isAlert: true });
 };

 const showPrompt = (title: string, message: string, onConfirm: (value: string) => void, defaultValue = '') => {
 setDialogInputValue(defaultValue);
 setDialog({ isOpen: true, title, message, onConfirm, isAlert: false, showInput: true, defaultValue });
 };

 const showSelectionDialog = (title: string, message: string, options: { id: string, label: string }[], onConfirm: (value: string) => void, defaultVal = '') => {
 setDialogSelectValue(defaultVal || (options[0]?.id || ''));
 setDialog({ 
 isOpen: true, 
 title, 
 message, 
 onConfirm, 
 isAlert: false, 
 showSelect: true, 
 selectOptions: options 
 });
 };

 const closeDialog = () => {
 setDialog(prev => ({ ...prev, isOpen: false, showInput: false, showSelect: false }));
 };
 const [selectedGame, setSelectedGame] = useState<Game | null>(null);

 // Search in Indulge
 const [searchQuery, setSearchQuery] = useState('');
 const [searchResults, setSearchResults] = useState<any[]>([]);
 const [searching, setSearching] = useState(false);
 const [uiSettings, setUiSettings] = useState<any>({});

 const getColSetting = (viewType: 'table' | 'card', colId: string, customTab?: string) => {
  const tab = customTab || activeTab;
  const key = `ui_show_${viewType}_${tab}_${colId}`;
  
  if (uiSettings[key] !== undefined) return uiSettings[key];

  // Apply requested defaults if no setting exists
  if (viewType === 'table' && tab === 'played') {
    if (colId === 'p_status') return 'with_status';
    if (colId === 'p_comment') return 'with_game_comment';
    if (['p_version', 'p_rating', 'p_time', 'game_rating'].includes(colId)) return 'with_comment';
  }

  const defaults: Record<string, string[]> = {
    'playing': ['game_status', 'game_platforms', 'game_comment'],
    'played': ['game_status', 'p_date', 'p_platform', 'game_comment'],
    'backlog': ['game_status', 'game_platforms', 'game_comment'],
    'wishlist': ['game_status', 'game_release_date', 'game_release_status', 'game_platforms', 'game_comment']
  };

  if (defaults[tab]) {
    return defaults[tab].includes(colId) ? 'true' : 'false';
  }

  // Fallback to legacy global setting if category-specific is not set
  return uiSettings[`ui_show_${viewType}_${colId}`] !== 'false' ? 'true' : 'false';
 };

 const isColVisible = (viewType: 'table' | 'card', colId: string, customTab?: string) => {
  return getColSetting(viewType, colId, customTab) === 'true';
 };

 const isStatVisible = (statId: string) => {
  return uiSettings[`ui_show_stats_${statId}`] !== 'false';
 };



 useEffect(() => {
 fetchUiSettings();
 }, []);

 useEffect(() => {
 const root = window.document.documentElement;
 const mode = uiSettings['ui_theme_mode'] || 'system';
 
 if (mode === 'system') {
 root.classList.remove('light', 'dark');
 } else if (mode === 'light') {
 root.classList.add('light');
 root.classList.remove('dark');
 } else {
 root.classList.add('dark');
 root.classList.remove('light');
 }
 }, [uiSettings]);

 const fetchUiSettings = async () => {
 try {
 const res = await fetch('/api/settings');
 const data = await res.json();
 setUiSettings(data);
 } catch (e) {
 console.error(e);
 }
 }

  // Support intuitive keyboard scrolling (PageUp/Down, ArrowUp/Down, Space, Home, End)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;
      const tagName = target.tagName?.toLowerCase();
      if (
        tagName === 'input' || 
        tagName === 'textarea' || 
        tagName === 'select' || 
        target.hasAttribute('contenteditable') ||
        target.closest('[contenteditable="true"]')
      ) {
        return;
      }

      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      const scrollKeys = ['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Space', 'Home', 'End'];
      if (!scrollKeys.includes(e.key)) {
        return;
      }

      const isModalOpen = document.querySelector('.fixed.inset-0') !== null;
      if (isModalOpen) {
        return;
      }

      let container: HTMLElement | null = null;
      const isListMode = activeTab !== 'overview' && uiSettings[`ui_view_mode_${activeTab}`] === 'list';
      if (isListMode) {
        const listId = activeTab === 'played' ? 'playthrough-list-scroll-viewport' : 'library-list-scroll-viewport';
        container = document.getElementById(listId);
      } else {
        container = document.getElementById('main-scroll-viewport');
      }

      if (!container) return;

      let scrollAmount = 0;
      switch (e.key) {
        case 'ArrowDown':
          scrollAmount = 40;
          break;
        case 'ArrowUp':
          scrollAmount = -40;
          break;
        case 'PageDown':
          scrollAmount = container.clientHeight * 0.8;
          break;
        case 'PageUp':
          scrollAmount = -container.clientHeight * 0.8;
          break;
        case 'Space':
          if (e.shiftKey) {
            scrollAmount = -container.clientHeight * 0.8;
          } else {
            scrollAmount = container.clientHeight * 0.8;
          }
          break;
        case 'Home':
          container.scrollTo({ top: 0, behavior: 'auto' });
          e.preventDefault();
          return;
        case 'End':
          container.scrollTo({ top: container.scrollHeight, behavior: 'auto' });
          e.preventDefault();
          return;
        default:
          return;
      }

      if (scrollAmount !== 0) {
        container.scrollBy({ top: scrollAmount, behavior: 'auto' });
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [activeTab, uiSettings]);

 const updateUiSetting = async (key: string, value: string) => {
 try {
 await fetch('/api/settings', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ [key]: value })
 });
 fetchUiSettings();
 } catch (e) {
 console.error(e);
 }
 }
 const [statuses, setStatuses] = useState<{ game: any[], playthrough: any[] }>({ game: [], playthrough: [] });

 const sortGames = (items: any[], criteria: SortCriterion[]) => {
 return [...items].sort((a, b) => {
 for (const crit of criteria) {
 const getVal = (g: any, field: string): any => {
 const p = g._playthrough;
 if (field === 'game_status' && crit.dir === 'custom') {
 const s = statuses.game.find(st => st.id === g.game_status);
 return s ? s.sort_order : 999;
 }
   if (field === 'p_status' && crit.dir === 'custom') {
  const ptStatus = p?.playthrough_status || p?.status_id || p?.status_label;
  if (!ptStatus) {
   const latest = (!g.playthrough_info || g.playthrough_info.length === 0) ? null : [...g.playthrough_info].sort((p1, p2) => new Date(p2.date).getTime() - new Date(p1.date).getTime())[0];
   const pStatus = latest?.playthrough_status || latest?.status_id || latest?.status_label;
   const s = statuses.playthrough.find(st => st.id === pStatus || st.label === pStatus);
   return s ? s.sort_order : 999;
  }
  const s = statuses.playthrough.find(st => st.id === ptStatus || st.label === ptStatus);
  return s ? s.sort_order : 999;
  }
  switch (field) {
 case 'name': return g.name.toLowerCase();
 case 'game_comment': return (g.comment || '').toLowerCase();
 case 'last_updated': return new Date(g.last_updated).getTime();
 case 'game_status': return (g.game_status || '').toLowerCase();
 case 'game_rating': return g.game_rating || 0;
 case 'game_release_date': return g.release_date || '';
 case 'game_release_status': return (g.release_status || '').toLowerCase();
 case 'game_platforms': return (g.platforms || []).join(', ').toLowerCase();
 case 'game_genres': return (g.genres || []).join(', ').toLowerCase();
 case 'game_themes': return (g.themes || []).join(', ').toLowerCase();
 case 'game_owned_vaults': return (g.owned_vaults || '').toLowerCase();
 case 'game_shops': return (g.shops || []).map((s: any) => s.name).join(', ').toLowerCase();
 case 'p_platform': {
  const pPlat = p?.platform || (g.playthrough_info && g.playthrough_info.length > 0 ? [...g.playthrough_info].sort((p1, p2) => new Date(p2.date).getTime() - new Date(p1.date).getTime())[0]?.platform : '');
  return (pPlat || '').toLowerCase();
 }
 case 'p_date': {
  if (p) return new Date(p.date).getTime();
  if (!g.playthrough_info || g.playthrough_info.length === 0) return 0;
  return Math.max(...g.playthrough_info.map(pt => new Date(pt.date).getTime()));
 }
 case 'p_status': {
  if (p) return (p.status_label || p.playthrough_status || '').toLowerCase();
  const latest = (!g.playthrough_info || g.playthrough_info.length === 0) ? null : [...g.playthrough_info].sort((p1, p2) => new Date(p2.date).getTime() - new Date(p1.date).getTime())[0];
  return (latest?.status_label || latest?.playthrough_status || '').toLowerCase();
 }
 case 'p_rating': {
  if (p) return p.rating || 0;
  if (!g.playthrough_info || g.playthrough_info.length === 0) return 0;
  const latest = [...g.playthrough_info].sort((p1, p2) => new Date(p2.date).getTime() - new Date(p1.date).getTime())[0];
  return latest.rating || 0;
 }
 case 'p_time': {
  if (p) return p.time_played_minutes || 0;
  if (!g.playthrough_info || g.playthrough_info.length === 0) return 0;
  const latest = [...g.playthrough_info].sort((p1, p2) => new Date(p2.date).getTime() - new Date(p1.date).getTime())[0];
  return latest.time_played_minutes || 0;
 }
 case 'p_comment': {
  if (p) return (p.comment || '').toLowerCase();
  if (!g.playthrough_info || g.playthrough_info.length === 0) return '';
  const latest = [...g.playthrough_info].sort((p1, p2) => new Date(p2.date).getTime() - new Date(p1.date).getTime())[0];
  return (latest?.comment || '').toLowerCase();
 }
 case 'p_version': {
  if (p) return (p.version || '').toLowerCase();
  if (!g.playthrough_info || g.playthrough_info.length === 0) return '';
  const latest = [...g.playthrough_info].sort((p1, p2) => new Date(p2.date).getTime() - new Date(p1.date).getTime())[0];
  return (latest?.version || '').toLowerCase();
 }
 default: return (g as any)[field] || '';
 }
 };

 const valA = getVal(a, crit.field);
 const valB = getVal(b, crit.field);

 if (valA < valB) return (crit.dir === 'asc' || crit.dir === 'custom') ? -1 : 1;
 if (valA > valB) return (crit.dir === 'asc' || crit.dir === 'custom') ? 1 : -1;
 }
 return 0;
 });
 };
 const sortPlaythroughs = (items: any[], criteria: SortCriterion[]) => {
    return [...items].sort((a, b) => {
      for (const crit of criteria) {
        const getVal = (p: any, field: string): any => {
          if (field === 'p_status' && crit.dir === 'custom') {
            const s = statuses.playthrough.find(st => st.id === p.playthrough_status || st.label === p.playthrough_status);
            return s ? s.sort_order : 999;
          }
          switch (field) {
            case 'p_date': return new Date(p.date || 0).getTime();
            case 'p_status': return (p.playthrough_status || '').toLowerCase();
            case 'p_rating': return p.rating || 0;
            case 'p_time': return p.time_played_minutes || 0;
            case 'p_platform': return (p.platform || '').toLowerCase();
            case 'p_comment': return (p.comment || '').toLowerCase();
            case 'p_version': return (p.version || '').toLowerCase();
            
            case 'name': return (selectedGame?.name || '').toLowerCase();
            case 'game_release_date': return selectedGame?.release_date || '';
            case 'last_updated': return new Date(selectedGame?.last_updated || 0).getTime();
            case 'game_status': return (selectedGame?.game_status || '').toLowerCase();
            case 'game_rating': return selectedGame?.game_rating || 0;
            case 'game_platforms': return (selectedGame?.platforms || []).join(', ').toLowerCase();
            case 'game_release_status': return selectedGame?.release_status || '';
            case 'game_shops': return (selectedGame?.shops || []).map((s: any) => s.name).join(', ').toLowerCase();
            case 'game_owned_vaults': return (selectedGame?.owned_vaults || '').toLowerCase();
            case 'game_genres': return (selectedGame?.genres || []).join(', ').toLowerCase();
            case 'game_themes': return (selectedGame?.themes || []).join(', ').toLowerCase();
            case 'game_comment': return (selectedGame?.comment || '').toLowerCase();
            default: return (p as any)[field] || '';
          }
        };

        const valA = getVal(a, crit.field);
        const valB = getVal(b, crit.field);

        if (valA < valB) return (crit.dir === 'asc' || crit.dir === 'custom') ? -1 : 1;
        if (valA > valB) return (crit.dir === 'asc' || crit.dir === 'custom') ? 1 : -1;
      }
      return 0;
    });
  };

 const [editingStatus, setEditingStatus] = useState<{ type: 'game' | 'playthrough', statusId: string | null } | null>(null);
 const [playthroughs, setPlaythroughs] = useState<any[]>([]);
 const [isRiteEditorOpen, setIsRiteEditorOpen] = useState(false);
 const [editingRite, setEditingRite] = useState<any | null>(null);
 const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
 const [ritualPrepForm, setRitualPrepForm] = useState({
 status_id: '',
 date: new Date().toISOString().split('T')[0],
 platform: '',
 time_played: '',
 rating: undefined as number | undefined,
 version: '',
 comment: '',
 playthrough_status_id: null as string | null
 });

 const resetRitualForm = (defaultId?: string) => {
  const firstStatusId = statuses.game[0]?.id || '';
                    
   const playthroughId = statuses.playthrough[0]?.id || null;

  setRitualPrepForm({
   status_id: defaultId || firstStatusId,
   date: new Date().toISOString().split('T')[0],
   platform: '',
   time_played: '',
   rating: undefined,
   version: '',
   comment: '',
   playthrough_status_id: playthroughId
  });
 };

 useEffect(() => {
  if (statuses.game.length > 0 && !ritualPrepForm.status_id) {
   resetRitualForm();
  }
 }, [statuses]);
 const [riteForm, setRiteForm] = useState({
 date: new Date().toISOString().split('T')[0],
 platform: '',
 status_id: '' as string | null,
 game_status_id: '' as string,
 time_played: '',
 rating: undefined as number | undefined,
 version: '',
 comment: ''
 });

 const parseTimePlayed = (str: string): number | null => {
 if (!str || str.trim() === '') return null;
 // Returns minutes
 let total = 0;
 const days = str.match(/(\d+)\s*d/);
 const hours = str.match(/(\d+)\s*h/);
 const mins = str.match(/(\d+)\s*(m|min)/);
 
 if (days) total += parseInt(days[1]) * 24 * 60;
 if (hours) total += parseInt(hours[1]) * 60;
 if (mins) total += parseInt(mins[1]);
 
 if (!days && !hours && !mins) {
 // Direct number input assumption: hours
 const raw = parseFloat(str);
 if (!isNaN(raw)) {
  total = raw * 60;
 } else {
  return null;
 }
 }
 
 return total;
 }

 useEffect(() => {
 fetchStatuses();
 }, []);

 const fetchStatuses = async () => {
  try {
    const res = await fetch('/api/statuses');
    if (!res.ok) {
      throw new Error(`Archival connection failed: ${res.statusText}`);
    }
    const data = await res.json();
    if (data && Array.isArray(data.game) && Array.isArray(data.playthrough)) {
      setStatuses(data);
    } else {
      console.warn('Malformed statuses data received:', data);
    }
  } catch (e) {
    console.error('Failed to fetch statuses', e);
  }
 }

 const fetchPlaythroughs = async (gameId: number) => {
   try {
     const res = await fetch(`/api/games/${gameId}/playthroughs`);
     if (!res.ok) {
       throw new Error(`Record fetch failed: ${res.statusText}`);
     }
     const data = await res.json();
     if (Array.isArray(data)) {
       setPlaythroughs(data);
     }
   } catch (e) {
     console.error(e);
   }
 }

 useEffect(() => {
 if (selectedGame) {
 fetchPlaythroughs(selectedGame.igdb_id);
 setIsSummaryExpanded(false);
 }
 }, [selectedGame]);

 const updateGameStatus = async (statusId: string, customComment?: string, customOwnedVaults?: string) => {
   if (!selectedGame) return;
   
   const newStatus = statuses.game.find(s => s.id === statusId);
   const isOldPlayed = selectedGame.categories?.includes('played');
   const isNewPlayed = newStatus?.categories?.includes('played');
    const finalComment = customComment !== undefined ? customComment : selectedGame.comment;
    const finalVaults = customOwnedVaults !== undefined ? customOwnedVaults : selectedGame.owned_vaults;
   
   const performUpdate = async (purge_rites = false) => {
     try {
       const res = await fetch(`/api/games/${selectedGame.igdb_id}`, {
         method: 'PUT',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ status: statusId, comment: finalComment, owned_vaults: finalVaults, purge_rites })
       });
       if (res.ok) {
         fetchData();
         setSelectedGame(prev => prev ? { ...prev, game_status: statusId, categories: newStatus?.categories || [], comment: finalComment, owned_vaults: finalVaults } : null);
       } else {
         const err = await res.json();
         showAlert('Constraint Violation', `Archival failure: ${err.error}`);
       }
     } catch (e) {
       console.error(e);
       showAlert('Archival Error', 'Failed to communicate with the archival plane.');
     }
   };

   if (isNewPlayed && !isOldPlayed && playthroughs.length === 0) {
     const defaultPlatform = sortOriginalPlatformsByMap(selectedGame.platforms || [], getPlatformMap(uiSettings))[0] || 'Unknown';
     const todayDateStr = new Date().toISOString().split('T')[0];
     showConfirm(
       'Consistency Requirement',
       `Moving this game to the Played category requires at least one logged ritual record (playthrough) to satisfy database integrity.\n\nWould you like to automatically log a default ritual record (vessel: ${defaultPlatform}, date: ${todayDateStr}) to satisfy this constraint and satisfy the transition? (If canceled, the status change will roll back.)`,
       async () => {
         try {
           const res = await fetch('/api/playthroughs', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({
               game_id: selectedGame.igdb_id,
               date: todayDateStr,
               platform: defaultPlatform,
               status_id: null,
               game_status_id: statusId,
               time_played_minutes: null,
               rating: null,
               version: null
             })
           });
           if (res.ok) {
             fetchPlaythroughs(selectedGame.igdb_id);
             fetchData();
             const gamesRes = await fetch('/api/games');
             const gamesData = await gamesRes.json();
             const updated = gamesData.find((g: any) => g.igdb_id === selectedGame.igdb_id);
             if (updated) setSelectedGame(updated);
           } else {
             const err = await res.json();
             showAlert('Constraint Violation', `Failed to initialize mandatory rite: ${err.error}`);
           }
         } catch (e) {
           console.error(e);
           showAlert('Failure', 'Failed to communicate with the archival plane.');
         }
       }
     );
   } else if (isOldPlayed && !isNewPlayed && playthroughs.length > 0) {
     showConfirm(
       'Warning of Oblivion',
       'Moving this game out of the PLAYED category will purge all logged playthrough rites. Do you wish to proceed?',
       () => performUpdate(true)
     );
   } else {
     performUpdate(false);
   }
 }

 const logPlaythrough = () => {
 if (!selectedGame) return;
 
 // Pick first compatible status from 'played' category
 const compatibleStatuses = statuses.game.filter(s => s.categories.includes('played'));
 const isCompatible = compatibleStatuses.some(s => s.id === selectedGame.game_status);
 const defaultStatusId = isCompatible ? selectedGame.game_status : (compatibleStatuses[0]?.id || selectedGame.game_status);

 setEditingRite(null);
 setRiteForm({
 date: new Date().toISOString().split('T')[0],
 platform: sortOriginalPlatformsByMap(selectedGame.platforms || [], getPlatformMap(uiSettings))[0] || '',
 status_id: '',
 game_status_id: defaultStatusId,
 time_played: '',
 rating: undefined,
 version: '',
 comment: ''
 });
 setIsRiteEditorOpen(true);
 }

 const editPlaythrough = (rite: any) => {
 if (!selectedGame) return;
 setEditingRite(rite);
 
 // Format minutes back to readable h/m
 let timeStr = '';
 if (rite.time_played_minutes != null) {
  const h = Math.floor(rite.time_played_minutes / 60);
  const m = rite.time_played_minutes % 60;
  if (h === 0 && m === 0) {
   timeStr = '0m';
  } else {
   timeStr = h > 0 ? `${h}h ${m > 0 ? m + 'm' : ''}` : `${m}m`;
  }
 }

 setRiteForm({
 date: rite.date,
 platform: (selectedGame.platforms || []).includes(rite.platform) ? rite.platform : '',
 status_id: rite.playthrough_status || '',
 game_status_id: selectedGame.game_status, // Keep current game status
 time_played: timeStr,
 rating: rite.rating !== null ? rite.rating : undefined,
 version: rite.version || '',
 comment: rite.comment || ''
 });
 setIsRiteEditorOpen(true);
 }

 const submitRite = async () => {
 if (!selectedGame) return;
 if (!riteForm.platform) {
   showAlert('Invalid Vessel', 'Please select a valid platform (vessel) for this ritual.');
   return;
 }
 try {
 const url = editingRite ? `/api/playthroughs/${editingRite.uuid}` : '/api/playthroughs';
 const method = editingRite ? 'PUT' : 'POST';
 
 const res = await fetch(url, {
 method,
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 game_id: selectedGame.igdb_id,
 date: riteForm.date,
 platform: riteForm.platform,
 status_id: (riteForm.status_id === '__null__' || !riteForm.status_id) ? null : riteForm.status_id,
 game_status_id: riteForm.game_status_id,
 time_played_minutes: parseTimePlayed(riteForm.time_played),
 rating: riteForm.rating !== undefined ? riteForm.rating : null,
 version: riteForm.version || null,
 comment: riteForm.comment || null
 })
 });
 if (res.ok) {
 setIsRiteEditorOpen(false);
 setEditingRite(null);
 fetchPlaythroughs(selectedGame.igdb_id);
 fetchData();
 const gamesRes = await fetch('/api/games');
 const gamesData = await gamesRes.json();
 const updated = gamesData.find((g: any) => g.igdb_id === selectedGame.igdb_id);
 setSelectedGame(updated);
 } else {
 const err = await res.json();
 showAlert('Ritual Submission Failure', `An error occurred during the rite: ${err.error}`);
 }
 } catch (e) {
 console.error(e);
 }
 }

 const deletePlaythrough = (id: number) => {
 if (!selectedGame) return;
 
 const isLastPlaythrough = playthroughs.length === 1;
 const isPlayedCategory = selectedGame.categories?.includes('played');
 
 if (isLastPlaythrough && isPlayedCategory) {
 const safeStatuses = statuses.game.filter(s => !s.categories.includes('played'));
 const options = safeStatuses.map(s => ({ id: s.id, label: s.label }));
 const defaultId = safeStatuses.find(s => s.categories?.includes('backlog'))?.id || safeStatuses.find(s => s.id === 'backlog')?.id || safeStatuses[0]?.id || '';
 
 showSelectionDialog(
 'The Final Purge',
 `Purging the last ritual record for "${selectedGame.name}" requires its removal from the "Played" category.\n\nPlease select a new status for this game to finalize the transition:`,
 options,
 async (newStatusId) => {
 if (!newStatusId) return;
 try {
 const res = await fetch(`/api/playthroughs/${id}?target_status_id=${encodeURIComponent(newStatusId)}`, { method: 'DELETE' });
 if (!res.ok) {
 const err = await res.json();
 showAlert('Purge Failure', `Archival error: ${err.error}`);
 return;
 }
 fetchPlaythroughs(selectedGame.igdb_id);
 fetchData();
 // Refresh selected game info
 const gamesRes = await fetch('/api/games');
 const allGames = await gamesRes.json();
 const updatedGame = allGames.find((g: any) => g.igdb_id === selectedGame.igdb_id);
 if (updatedGame) setSelectedGame(updatedGame);
 } catch (e) {
 console.error(e);
 showAlert('Failure', 'Failed to communicate with the archival plane.');
 }
 },
 defaultId
 );
 } else {
 showConfirm(
 'Purge Decree',
 'Purge this specific ritual record?',
 async () => {
 try {
 const res = await fetch(`/api/playthroughs/${id}`, { method: 'DELETE' });
 if (!res.ok) {
 const err = await res.json();
 showAlert('Purge Failure', `Error: ${err.error || 'Unknown error'}`);
 return;
 }
 fetchPlaythroughs(selectedGame.igdb_id);
 fetchData();
 } catch (e) {
 console.error('Delete playthrough failed:', e);
 showAlert('Failure', 'Failed to connect to the archival server.');
 }
 }
 );
 }
 }

 const updateStatus = async (type: 'game' | 'playthrough', id: string, data: any) => {
 try {
 const list = type === 'game' ? statuses.game : statuses.playthrough;
 const existing = list.find(s => s.id === id);
 const res = await fetch(`/api/statuses/${type}`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ id, sort_order: existing?.sort_order, ...data })
 });
 if (res.ok) fetchStatuses();
 } catch (e) { console.error(e); }
 }

 const reorderStatus = async (type: 'game' | 'playthrough', id: string, direction: 'up' | 'down') => {
 const list = type === 'game' ? statuses.game : statuses.playthrough;
 const idx = list.findIndex(s => s.id === id);
 if (idx === -1) return;

 const newList = [...list];
 const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
 if (targetIdx < 0 || targetIdx >= list.length) return;

 [newList[idx], newList[targetIdx]] = [newList[targetIdx], newList[idx]];

 const orders = newList.reduce((acc, s, i) => {
 acc[s.id] = i;
 return acc;
 }, {} as Record<string, number>);

 try {
 await fetch(`/api/statuses/${type}/reorder`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ orders })
 });
 fetchStatuses();
 } catch (e) { console.error(e); }
 }

 const toggleCategory = async (statusId: string, category: string) => {
 const status = statuses.game.find(s => s.id === statusId);
 if (!status) return;

 const isRemoving = status.categories.includes(category);
 const newCats = isRemoving
 ? status.categories.filter((c: string) => c !== category)
 : [...status.categories, category];

 // When removing any category, if status is in use, we must move games to a status that still HAS that category.
 // Also must satisfy the 'played' constraint.
 const affectedGames = games.filter(g => g.game_status === statusId);
 
 if (isRemoving && affectedGames.length > 0) {
 const mustBePlayed = status.categories.includes('played');
 
 const moveOptions = statuses.game.filter(s => 
 s.id !== statusId && 
 s.categories.includes(category) && // Must maintain the category being removed
 s.categories.includes('played') === mustBePlayed // Must maintain ritual consistency
 ).map(s => ({ id: s.id, label: s.label }));
 
 if (moveOptions.length === 0) {
 showAlert('Transition Blocked', `Cannot remove "${category}" from this status as there are active archives and no alternative "${category}" status exists with the same manifestation constraints.`);
 return;
 }

 showSelectionDialog(
 'Relational Shift',
 `Removing the "${category}" category from "${status.label}" will affect ${affectedGames.length} archive(s).\n\nPlease select a new status for these games to maintain their role in the ${category} archives:`,
 moveOptions,
 async (targetId) => {
 try {
 // Update the games first to avoid trigger violations if we changed status categories first
 for (const g of affectedGames) {
 await fetch(`/api/games/${g.igdb_id}`, {
 method: 'PUT',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ status: targetId, comment: g.comment, owned_vaults: g.owned_vaults })
 });
 }
 // Now update the status categories
 await updateStatus('game', statusId, { ...status, categories: newCats });
 fetchStatuses();
 fetchData();
 } catch (e) { console.error(e); }
 }
 );
 return;
 }

 updateStatus('game', statusId, { ...status, categories: newCats });
 }

 const confirmDeleteStatus = async (type: 'game' | 'playthrough', id: string) => {
 try {
 const res = await fetch(`/api/statuses/${type}/${id}`, { method: 'DELETE' });
 if (res.ok) {
 fetchStatuses();
 } else {
 const data = await res.json();
 if (data.error === 'In use') {
 // Show replacement dialog
 const currentStatus = (type === 'game' ? statuses.game : statuses.playthrough).find(s => s.id === id);
 if (!currentStatus) return;

 let options = [];
 if (type === 'game') {
 const mustBePlayed = currentStatus.categories.includes('played');
 options = statuses.game
 .filter(s => s.id !== id && s.categories.includes('played') === mustBePlayed)
 .map(s => ({ id: s.id, label: s.label }));
 } else {
 options = statuses.playthrough
 .filter(s => s.id !== id)
 .map(s => ({ id: s.id, label: s.label }));
 }

 if (options.length === 0) {
 showAlert('Erasure Blocked', `This status is the final anchor for your ${type === 'game' ? 'archives' : 'rituals'}. It cannot be purged until another manifestation with compatible constraints is established.`);
 return;
 }

 showSelectionDialog(
 'Legacy Transition',
 `${data.message}\n\nSelect a new manifestation to inherit these records:`,
 options,
 async (targetId) => {
 const delRes = await fetch(`/api/statuses/${type}/${id}?target_id=${encodeURIComponent(targetId)}`, { method: 'DELETE' });
 if (delRes.ok) {
 fetchStatuses();
 fetchData();
 } else {
 const err = await delRes.json();
 showAlert('Purge Failure', err.error);
 }
 }
 );
 } else {
 showAlert('Purge Failure', data.error);
 }
 }
 } catch (e) { console.error(e); }
 }

 const addPlaythroughStatus = () => {
    setEditingStatus({ type: 'playthrough', statusId: null });
  }

 const addGameStatus = () => {
    setEditingStatus({ type: 'game', statusId: null });
  }

 const [refreshConflictData, setRefreshConflictData] = useState<any>(null);
 const [refreshPlatformMappings, setRefreshPlatformMappings] = useState<Record<string, string>>({});

 const submitRefreshWithMappings = async () => {
    if (!selectedGame || !refreshConflictData) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/games/${selectedGame.igdb_id}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform_mappings: refreshPlatformMappings })
      });
      if (res.ok) {
        setRefreshConflictData(null);
        setRefreshPlatformMappings({});
        fetchData();
        const gamesRes = await fetch('/api/games');
        const gamesData = await gamesRes.json();
        const updated = gamesData.find((g: any) => g.igdb_id === selectedGame.igdb_id);
        setSelectedGame(updated);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
 };

 const refreshMetadata = async () => {
 if (!selectedGame) return;
 setLoading(true);
 try {
 const res = await fetch(`/api/games/${selectedGame.igdb_id}/refresh`, { method: 'POST' });
 if (res.ok) {
        const data = await res.json();
        if (data.has_conflicts) {
            setRefreshConflictData(data);
            setRefreshPlatformMappings({});
        } else {
            fetchData();
            const gamesRes = await fetch('/api/games');
            const gamesData = await gamesRes.json();
            const updated = gamesData.find((g: any) => g.igdb_id === selectedGame.igdb_id);
            setSelectedGame(updated);
        }
 }
 } catch (e) {
 console.error(e);
 } finally {
 setLoading(false);
 }
 }

 useEffect(() => {
 if (isIndulgeOpen) {
 setSearchQuery('');
 setSearchResults([]);
 }
 }, [isIndulgeOpen]);

 useEffect(() => {
    fetchData();
  }, [activeTab, uiSettings?.ui_stats_yearly_count]);

  const fetchData = async () => {
    try {
      const yearsCount = uiSettings?.ui_stats_yearly_count || '7';
      const [gamesRes, statsRes, configRes] = await Promise.all([
        fetch('/api/games'),
        fetch(`/api/stats?years=${yearsCount}`),
        fetch('/api/config-status')
      ]);

      if (!gamesRes.ok || !statsRes.ok || !configRes.ok) {
        throw new Error(`Archival fetch failed. (Games: ${gamesRes.status}, Stats: ${statsRes.status})`);
      }

      const gamesData = await gamesRes.json();
      const statsData = await statsRes.json();
      const configData = await configRes.json();

      setGames(gamesData);
      setStats(statsData);
      setHasIgdbCreds(configData.hasIgdbCreds);
      await fetchStatuses();
    } catch (e) {
      console.error("Failed to fetch library records:", e);
    } finally {
      setLoading(false);
    }
  }

 const handleSearch = async () => {
 if (!searchQuery) return;
 setSearching(true);
  setPendingIndulgence(null);
 try {
 const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
 const data = await res.json();
 setSearchResults(data);
 } catch (e) {
 console.error(e);
 } finally {
 setSearching(false);
 }
 }

 const addGame = async (game: any) => {
 try {
 const targetStatus = statuses.game.find(s => s.id === ritualPrepForm.status_id);
    const targetCategories = targetStatus?.categories || [];
    const isPlayed = targetCategories.includes('played');
 
 let playthrough = null;
 if (isPlayed) {
  let ptStatusId = ritualPrepForm.playthrough_status_id;
  if (ptStatusId === '__null__' || ptStatusId === '') ptStatusId = null;

  playthrough = {
  date: ritualPrepForm.date,
  platform: ritualPrepForm.platform || (game.platforms?.map((p: any) => p.name) || [])[0] || 'Unknown',
  status_id: ptStatusId,
  time_played_minutes: parseTimePlayed(ritualPrepForm.time_played),
 rating: ritualPrepForm.rating,
 version: ritualPrepForm.version,
 comment: ritualPrepForm.comment
 };
 }

 const res = await fetch('/api/games', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ 
 igdb_id: game.id, 
 status_id: ritualPrepForm.status_id,
 playthrough
 })
 });
 if (res.ok) {
  setIsIndulgeOpen(false);
  setPendingIndulgence(null);
  setSearchQuery('');
  setSearchResults([]);
  resetRitualForm();
      if (targetCategories && targetCategories.length > 0) {
        setActiveTab(targetCategories[0] as any);
      }
      fetchData();
 } else {
 const error = await res.json();
 showAlert('Manifestation Failed', error.error);
 }
 } catch (e) {
 console.error(e);
 showAlert('Failure', 'Failed to communicate with the IGDB oracle.');
 }
 }

 const deleteGame = (id: number) => {
 showConfirm(
 'Purge Decree',
 'Are you sure you wish to purge this game from your collection?',
 async () => {
 try {
 await fetch(`/api/games/${id}`, { method: 'DELETE' });
 setSelectedGame(null);
 fetchData();
 } catch (e) {
 console.error(e);
 showAlert('Failure', 'Failed to execute the purge.');
 }
 }
 );
 }

 const exportCsv = () => {
 const links = [
  { url: '/api/export/games', name: 'slaanesh_games.csv' },
  { url: '/api/export/playthroughs', name: 'slaanesh_playthroughs.csv' }
 ];
 
 links.forEach(link => {
  const a = document.createElement('a');
  a.href = link.url;
  a.download = link.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
 });
 }

 const filteredGames = games.filter(g => {
 if (activeTab === 'overview') return false;
 if (!g.categories?.includes(activeTab)) return false;
 
 // Apply column filters
 const currentTabFilters = columnFilters[activeTab] || {};
 for (const [colId, filter] of Object.entries(currentTabFilters) as [string, any][]) {
  let val = '';
  switch(colId) {
   case 'name': val = g.name; break;
   case 'game_status': val = g.game_status; break;
   case 'game_platforms': val = g.platforms.join(', '); break;
   case 'game_release_date': val = g.release_date; break;
			case 'game_release_status': val = g.release_status || ''; break;
   case 'game_comment': val = g.comment; break;
  }
  const lowerVal = (val || '').toLowerCase();
  const lowerFilter = (filter.value || '').toLowerCase();
  if (filter.type === 'empty') {
   if (val && val.trim() !== '') return false;
  } else if (filter.type === 'not_empty') {
   if (!val || val.trim() === '') return false;
  } else if (filter.value) {
   if (!lowerVal.includes(lowerFilter)) return false;
  }
 }
 return true;
 });

 const getSortCriteria = (category: string): SortCriterion[] => {
   const raw = uiSettings[`ui_sort_config_${category}`];
   let criteria: SortCriterion[] = [];
   if (raw) {
     try {
       criteria = JSON.parse(raw) as SortCriterion[];
     } catch (e) {
       console.error('Failed to parse sort config', e);
     }
   }
   
   if (!criteria || criteria.length === 0) {
     if (category === 'wishlist') {
       criteria = [
         { field: 'game_release_date', dir: 'desc' },
         { field: 'game_status', dir: 'custom' },
         { field: 'name', dir: 'asc' }
       ];
     } else if (category === 'played') {
       criteria = [
         { field: 'p_date', dir: 'desc' },
         { field: 'game_status', dir: 'custom' },
         { field: 'p_platform', dir: 'asc' }
       ];
     } else if (category === 'playing' || category === 'backlog') {
       criteria = [
         { field: 'game_status', dir: 'custom' },
         { field: 'game_comment', dir: 'asc' }
       ];
     } else {
       criteria = [
         { field: 'game_status', dir: 'custom' },
         { field: 'name', dir: 'asc' }
       ];
     }
   }

   return criteria;
 };


  const filteredGamesByTab = games.filter(g => {
    if (activeTab === 'overview') return false;
    return g.categories?.includes(activeTab);
  });

  const rawDisplayGames = activeTab === 'played' 
    ? filteredGamesByTab.flatMap(g => (g.playthrough_info || []).map(p => ({
        ...g,
        _playthrough: p,
        _unique_key: `${g.igdb_id}-${p.uuid}`
      })))
    : filteredGamesByTab.map(g => ({
        ...g,
        _unique_key: String(g.igdb_id)
      }));

  const displayGames = rawDisplayGames.filter(item => {
    // Apply column filters
    const currentTabFilters = columnFilters[activeTab] || {};
    for (const [colId, filter] of Object.entries(currentTabFilters) as [string, any][]) {
      let val = '';
      const p = (item as any)._playthrough;
      switch(colId) {
        case 'name': val = item.name; break;
        case 'game_status': val = item.game_status; break;
        case 'game_platforms': {
          const originalList = item.platforms || [];
          const pMap = getPlatformMap(uiSettings);
          const mappedList = originalList.map(pl => getDisplayPlatform(pl, pMap));
          val = [...originalList, ...mappedList].join(', ');
          break;
        }
        case 'game_genres': val = (item.genres || []).join(', '); break;
        case 'game_themes': val = (item.themes || []).join(', '); break;
        case 'game_release_date': val = item.release_date; break;
        case 'game_release_status': val = item.release_status || ''; break;
        case 'game_rating': val = item.game_rating !== undefined && item.game_rating !== null ? String(item.game_rating) : ''; break;
        case 'game_shops': val = (item.shops || []).map((s: any) => s.name).join(', '); break;
        case 'game_owned_vaults': val = item.owned_vaults || ''; break;
        case 'game_comment': {
          let composite = item.comment || '';
          if (p) {
            if (getColSetting('table', 'p_comment') === 'with_game_comment' && p.comment) {
              composite += ' ' + p.comment;
            }
            if (getColSetting('table', 'p_version') === 'with_comment' && p.version) {
              composite += ' Version: ' + p.version;
            }
            if (getColSetting('table', 'p_rating') === 'with_comment' && p.rating != null) {
              composite += ' Rating: ' + p.rating + '%';
            }
            if (getColSetting('table', 'p_time') === 'with_comment' && p.time_played_minutes != null) {
              const h = Math.floor(p.time_played_minutes / 60);
              const m = p.time_played_minutes % 60;
              composite += ` Playtime: ${h}h ${m}m`;
            }
          }
          if (getColSetting('table', 'game_rating') === 'with_comment' && item.game_rating != null) {
            composite += ' Score: ' + Math.round(item.game_rating) + '%';
          }
          val = composite;
          break;
        }
        case 'p_date': val = p?.date || ''; break;
        case 'p_platform': {
          const orig = p?.platform || '';
          const pMap = getPlatformMap(uiSettings);
          const mapped = getDisplayPlatform(orig, pMap);
          val = orig === mapped ? orig : `${orig}, ${mapped}`;
          break;
        }
        case 'p_status': val = p?.status_label || ''; break;
        case 'p_rating': val = p?.rating !== undefined && p?.rating !== null ? String(p.rating) : ''; break;
        case 'p_time': {
          if (!p || p.time_played_minutes == null) { val = '-'; break; }
          const h = Math.floor(p.time_played_minutes / 60);
          const m = p.time_played_minutes % 60;
          val = `${h}h ${m}m`; 
          break;
        }
        case 'p_version': val = p?.version || ''; break;
        case 'p_comment': val = p?.comment || ''; break;
      }
      const lowerVal = (val || '').toLowerCase();
      const lowerFilter = (filter.value || '').toLowerCase();
      if (filter.type === 'empty') {
        if (val && val.trim() !== '') return false;
      } else if (filter.type === 'not_empty') {
        if (!val || val.trim() === '') return false;
      } else if (filter.value) {
        if (!lowerVal.includes(lowerFilter)) return false;
      }
    }
    return true;
   });

  const sortedGames = sortGames(displayGames, getSortCriteria(activeTab));

 return (
 <div className="h-screen w-screen flex flex-col bg-slaanesh-bg text-slaanesh-text selection:bg-slaanesh-accent/30 overflow-hidden transition-colors duration-300 md:h-screen h-[100dvh]">
 
 {!hasIgdbCreds && (
 <div className="bg-red-900/50 border-b border-red-500 text-red-200 px-8 py-2 text-xs flex items-center justify-between animate-pulse">
 <span className="flex items-center gap-2 font-medium">
 <Info size={14} /> 
 Warning: IGDB API credentials missing. Indulgence is restricted.
 </span>
 <span className="font-bold">Missing Credentials</span>
 </div>
 )}

 {/* Title Bar */}
 <Header {...{globalQuery, setGlobalQuery, globalSearchResults, showGlobalResults, setShowGlobalResults, activeTab, setActiveTab, stats, setIsAboutOpen, setIsSettingsOpen, setIsImportOpen, setIsIndulgeOpen, setSelectedGame, exportCsv, statuses}} />

 {/* View Pane Selector */}
 <nav className="h-12 bg-slaanesh-panel border-b border-slaanesh-gold/20 flex items-center justify-start md:justify-center gap-4 md:gap-10 text-sm md:text-base font-medium tracking-widest z-20 transition-colors duration-300 overflow-x-auto no-scrollbar px-4 md:px-0 scrollbar-hide">
 {[
 { id: 'overview', label: 'Overview' },
 { id: 'playing', label: 'Playing' },
 { id: 'played', label: 'Played' },
 { id: 'backlog', label: 'Backlog' },
 { id: 'wishlist', label: 'Wishlist' }
 ].map(tab => (
 <React.Fragment key={tab.id}>
 <button 
 onClick={() => setActiveTab(tab.id as any)}
 className={cn(
 "h-full px-4 flex items-center transition-all duration-300 whitespace-nowrap",
 activeTab === tab.id ? "tab-active" : "text-slaanesh-text/70 hover:text-slaanesh-text transition-colors"
 )}
 >
 {tab.label}
 </button>
 {tab.id === 'overview' && (
 <div className="h-5 w-px bg-slaanesh-gold/20 flex-shrink-0" />
 )}
 </React.Fragment>
 ))}
 </nav>

 {/* Main View Area */}
 <main id="main-scroll-viewport" className={cn("flex-1 p-4 md:px-8 md:pb-8 md:pt-6 relative scroll-smooth flex flex-col min-h-0", (activeTab === 'overview' || uiSettings[`ui_view_mode_${activeTab}`] !== "list") ? "overflow-y-auto" : "overflow-hidden")}>
 <AnimatePresence mode="wait">
  {activeTab === 'overview' ? (
    <OverviewTab 
      stats={stats} 
      isStatVisible={isStatVisible} 
      uiSettings={uiSettings}
    />
  ) : activeTab === 'played' ? (
    <PlaythroughTab
      activeTab={activeTab}
      sortedGames={sortedGames}
      isColVisible={isColVisible}
      getColSetting={getColSetting}
      columnFilters={columnFilters[activeTab] || {}}
      setColumnFilters={(newFilters: any) => setColumnFilters(prev => ({ ...prev, [activeTab]: typeof newFilters === 'function' ? newFilters(prev[activeTab] || {}) : newFilters }))}
      activeFilterCol={activeFilterCol[activeTab] || null}
      setActiveFilterCol={(val: string | null) => setActiveFilterCol(prev => ({ ...prev, [activeTab]: val }))}
      setSelectedGame={setSelectedGame}
      uiSettings={uiSettings}
      statuses={statuses}
    />
  ) : (
    <LibraryTab
      activeTab={activeTab}
      sortedGames={sortedGames}
      isColVisible={isColVisible}
      columnFilters={columnFilters[activeTab] || {}}
      setColumnFilters={(newFilters: any) => setColumnFilters(prev => ({ ...prev, [activeTab]: typeof newFilters === 'function' ? newFilters(prev[activeTab] || {}) : newFilters }))}
      activeFilterCol={activeFilterCol[activeTab] || null}
      setActiveFilterCol={(val: string | null) => setActiveFilterCol(prev => ({ ...prev, [activeTab]: val }))}
      setSelectedGame={setSelectedGame}
      uiSettings={uiSettings}
      statuses={statuses}
    />
  )}


  {/* END OF MAIN VIEW */}
 </AnimatePresence>
 </main>

 {/* Modals */}

 {/* Indulge Modal */}
 <IndulgeModal {...{isIndulgeOpen, setIsIndulgeOpen, pendingIndulgence, setPendingIndulgence, searchQuery, setSearchQuery, searchResults, setSearchResults, handleSearch, searching, addGame, ritualPrepForm, setRitualPrepForm, statuses, sortPlatforms, resetRitualForm, uiSettings}} />

 <GameEditorModal 
   selectedGame={selectedGame}
   setSelectedGame={setSelectedGame}
   playthroughs={playthroughs}
   uiSettings={uiSettings}
   statuses={statuses}
   refreshMetadata={refreshMetadata}
   deleteGame={deleteGame}
   updateGameStatus={updateGameStatus}
   logPlaythrough={logPlaythrough}
   editPlaythrough={editPlaythrough}
   deletePlaythrough={deletePlaythrough}
   sortPlaythroughs={sortPlaythroughs}
   getSortCriteria={getSortCriteria}
 />

 <div className="hidden">
 <div className="flex flex-col gap-10">
  <div className="flex flex-col lg:flex-row gap-8">
   {/* Cover Section */}
   <div className="w-full lg:w-48 xl:w-56 flex-shrink-0">
    <div className="aspect-[3/4] bg-slaanesh-panel/40 rounded-sm overflow-hidden border border-slaanesh-gold/40 shadow-[0_0_30px_rgba(224,18,139,0.15)] group relative">
     <img 
      src={`/covers/${selectedGame?.igdb_id}.jpg`} 
      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
      alt={selectedGame?.name} 
     />
     <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
      <span className="text-[10px] text-slaanesh-gold font-bold tracking-wider">Ritual Mask</span>
     </div>
    </div>
   </div>
   <div className="flex-1 flex flex-col gap-8">
     {(uiSettings['ui_editor_show_summary'] !== 'false') && (
      <div className="flex flex-col gap-3">
       <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-slaanesh-gold/20" />
        <label className="text-[10px] text-slaanesh-gold font-bold tracking-wider px-2 whitespace-nowrap">The Sacred Lore</label>
      <div className="h-px flex-1 bg-slaanesh-gold/20" />
     </div>
     <div 
      className={cn(
       "relative p-5 bg-slaanesh-panel/30 rounded border border-slaanesh-gold/5 text-sm text-slaanesh-text/70 leading-relaxed italic cursor-pointer group transition-all duration-500 hover:bg-slaanesh-panel/50",
       !isSummaryExpanded && "max-h-[100px] overflow-hidden"
      )}
      onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
     >
      <div className={cn(
       "transition-all duration-500 font-serif",
       !isSummaryExpanded ? "line-clamp-3" : ""
      )}>
       {selectedGame?.summary || 'No archival lore recorded in the Immaterium.'}
      </div>
      {!isSummaryExpanded && selectedGame?.summary && selectedGame.summary.length > 150 && (
       <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-slaanesh-bg/95 via-slaanesh-bg/50 to-transparent flex items-end justify-center pb-2">
        <ChevronDown size={16} className="text-slaanesh-gold animate-bounce" />
       </div>
      )}
      {isSummaryExpanded && (
       <div className="flex justify-center mt-4 border-t border-slaanesh-gold/10 pt-2">
        <ChevronUp size={14} className="text-slaanesh-gold/50 hover:text-slaanesh-gold transition-colors" />
       </div>
      )}
     </div>
    </div>
    )}
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
     <div className="space-y-4">
      <div className="flex flex-col gap-1">
       <label className="text-xs text-slaanesh-gold/40 tracking-wider font-bold">Immaterial ID</label>
       <span className="text-sm font-mono text-slaanesh-accent/80 tracking-tighter">{selectedGame?.igdb_id}</span>
      </div>
      {selectedGame?.game_rating !== null && (
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slaanesh-gold/40 tracking-wider font-bold">Sacred Score (Avg)</label>
          <div className="flex items-center gap-2">
            <div className="flex items-center text-slaanesh-accent font-bold text-lg">
              <Star size={14} fill="currentColor" className="mr-1" />
              {Math.round(selectedGame?.game_rating || 0)}%
            </div>
            <span className="text-xs text-slaanesh-gold/30 italic">Calculated from {playthroughs.filter(p => p.rating !== null).length} rites</span>
          </div>
        </div>
      )}
      {(uiSettings['ui_editor_show_release_date'] !== 'false') && (
       <div className="flex flex-col gap-1">
       <label className="text-xs text-slaanesh-gold/40 tracking-wider font-bold">Ritual Arrival</label>
       <span className="text-sm font-mono font-bold text-slaanesh-gold/90">{selectedGame?.release_date || 'Unknown Aeon'}</span>
      </div>
      )}
      {(uiSettings['ui_editor_show_release_status'] !== 'false') && selectedGame?.release_status && (
       <div className="flex flex-col gap-1">
         <label className="text-xs text-slaanesh-gold/40 tracking-wider font-bold">Manifestation Status</label>
         <p className="text-xs text-slaanesh-accent/60 font-bold tracking-widest">{selectedGame.release_status}</p>
       </div>
      )}
      {(uiSettings['ui_editor_show_developers'] !== 'false') && selectedGame?.developers && selectedGame.developers.length > 0 && (
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slaanesh-gold/40 tracking-wider font-bold">Architects (Developers)</label>
          <div className="text-xs text-slaanesh-text/60 italic font-medium leading-tight">
            {selectedGame.developers.join(', ')}
          </div>
        </div>
      )}
      {(uiSettings['ui_editor_show_genres'] !== 'false') && selectedGame?.genres && selectedGame.genres.length > 0 && (
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slaanesh-gold/40 tracking-wider font-bold">Nature (Genres)</label>
          <div className="flex flex-wrap gap-1.5">
            {selectedGame.genres.map(g => (
              <span key={g} className="text-[10px] px-2 py-0.5 bg-slaanesh-gold/5 border border-slaanesh-gold/20 rounded-sm text-slaanesh-gold/80 font-bold">{g}</span>
            ))}
          </div>
        </div>
      )}
     </div>

     <div className="space-y-4">
      <div className="flex flex-col gap-1">
       <label className="text-xs text-slaanesh-gold/40 tracking-widest font-bold">Latest Epiphany</label>
       <span className="text-xs font-mono opacity-60 tracking-wider">
        {selectedGame?.last_updated ? (() => {
         const d = new Date(selectedGame.last_updated);
         const datePart = d.toISOString().split('T')[0];
         const timePart = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
         return `${datePart} ${timePart}`;
        })() : 'Everlasting'}
       </span>
      </div>
      {(uiSettings['ui_editor_show_themes'] !== 'false') && selectedGame?.themes && selectedGame.themes.length > 0 && (
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slaanesh-gold/40 tracking-widest font-bold">Essence (Themes)</label>
          <div className="flex flex-wrap gap-1.5">
            {selectedGame.themes.map(t => (
              <span key={t} className="text-[10px] px-2 py-0.5 bg-slaanesh-accent/5 border border-slaanesh-accent/20 rounded-sm text-slaanesh-accent/80 font-bold">{t}</span>
            ))}
          </div>
        </div>
      )}
      {(uiSettings['ui_editor_show_platforms'] !== 'false') && selectedGame?.platforms && selectedGame.platforms.length > 0 && (() => {
        const pMap = getPlatformMap(uiSettings);
        const sortedOriginal = sortOriginalPlatformsByMap(selectedGame.platforms || [], pMap);
        const mapped = sortedOriginal.map(p => getDisplayPlatform(p, pMap));
        const uniqueMapped = Array.from(new Set(mapped));
        return (
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slaanesh-gold/40 tracking-widest font-bold">Vessels of Indulgence</label>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {uniqueMapped.map(platform => (
                <span key={platform} className="text-[10px] font-bold text-slaanesh-gold/70 tracking-wider transition-colors">{platform}</span>
              ))}
            </div>
          </div>
        );
      })()}
      {(uiSettings['ui_editor_show_publishers'] !== 'false') && selectedGame?.publishers && selectedGame.publishers.length > 0 && (
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slaanesh-gold/40 tracking-widest font-bold">Heralds (Publishers)</label>
          <div className="text-xs text-slaanesh-text/60 italic font-medium leading-tight">
            {selectedGame.publishers.join(', ')}
          </div>
        </div>
      )}
     </div>
    </div>
   </div>
  </div>

  <div className="flex flex-col gap-3">
        {((uiSettings['ui_editor_show_websites'] !== 'false') || (uiSettings['ui_editor_show_shops'] !== 'false')) && (
          <label className="text-xs text-slaanesh-gold/40 tracking-wider font-bold">Aetheric Gateways</label>
        )}
        <div className="flex flex-wrap gap-2">
         {(uiSettings['ui_editor_show_websites'] !== 'false') && (
           <a 
            href={`https://www.igdb.com/games/${selectedGame?.slug}`}
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-1.5 bg-slaanesh-gold/5 border border-slaanesh-gold/10 rounded-sm text-[10px] hover:border-slaanesh-accent hover:bg-slaanesh-accent/10 transition-all font-bold tracking-wider"
           >
            <ExternalLink size={10} /> IGDB
           </a>
         )}
         {(uiSettings['ui_editor_show_shops'] !== 'false') && selectedGame?.shops?.map((s, i) => (
          <a 
           key={`${s.url}-${i}`}
           href={s.url} 
           target="_blank" 
           rel="noopener noreferrer"
           className="flex items-center gap-2 px-3 py-1.5 bg-slaanesh-accent/5 border border-slaanesh-accent/20 rounded-sm text-[10px] hover:border-slaanesh-accent hover:bg-slaanesh-accent/20 transition-all text-slaanesh-accent font-bold tracking-wider"
          >
           <ExternalLink size={10} /> {s.name}
          </a>
         ))}
        </div>
      </div>

      {/* Platform & Status Controls */}
  <div className="bg-slaanesh-panel/20 p-6 rounded-sm border border-slaanesh-gold/10 space-y-6 shadow-inner">
   <div className="flex items-center gap-4">
    <div className="h-[1px] w-8 bg-slaanesh-gold/40" />
    <h4 className="text-slaanesh-gold text-xs font-bold tracking-wider">Manifestation Parameters</h4>
    <div className="h-[1px] flex-1 bg-gradient-to-r from-slaanesh-gold/40 to-transparent" />
   </div>
   
   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
    <div className="flex flex-col gap-6 md:col-span-1">
     <div className="flex flex-col gap-3">
      <label className="text-xs text-slaanesh-gold/60 font-bold tracking-wider">Ritual Status</label>
      <div className="relative group">
       <select 
        value={selectedGame?.game_status}
        onChange={(e) => updateGameStatus(e.target.value)}
        className="w-full bg-slaanesh-panel/60 border border-slaanesh-gold/30 rounded-sm p-3 text-xs text-slaanesh-text appearance-none cursor-pointer focus:border-slaanesh-accent transition-all group-hover:border-slaanesh-gold/60"
       >
        {statuses.game.map(s => (
         <option key={s.id} value={s.id}>{s.label}</option>
        ))}
       </select>
       <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slaanesh-gold/40 group-hover:text-slaanesh-gold/80 transition-colors">
         <ChevronDown size={14} />
       </div>
      </div>
     </div>

     {(uiSettings['ui_editor_show_owned_vaults'] !== 'false') && (
      <div className="flex flex-col gap-3">
       <div className="flex items-center justify-between">
        <label className="text-xs text-slaanesh-gold/60 font-bold tracking-wider">Vaults of Possession</label>
        <span className="text-[10px] text-slaanesh-accent/40 font-mono italic">Comma-separated owned stores.</span>
       </div>
       <input 
        type="text"
        className="bg-slaanesh-panel/60 border border-slaanesh-gold/20 rounded-sm p-3 text-xs text-slaanesh-gold shadow-inner outline-none focus:border-slaanesh-accent/60 placeholder:text-slaanesh-gold/20 transition-all font-serif italic w-full"
        value={selectedGame?.owned_vaults || ''}
        onChange={(e) => setSelectedGame(prev => prev ? { ...prev, owned_vaults: e.target.value } : null)}
        onBlur={() => selectedGame && updateGameStatus(selectedGame.game_status)}
        placeholder="e.g. Steam, GOG, Epic"
       />
      </div>
     )}
    </div>

    <div className="flex flex-col gap-3 md:col-span-1 pt-0">
     <div className="flex items-center justify-between">
      <label className="text-xs text-slaanesh-gold/60 font-bold tracking-wider">Inscribed Reflections</label>
      <span className="text-xs text-slaanesh-accent/40 font-mono italic">Sacred text field.</span>
     </div>
     <textarea 
      rows={1}
      ref={(el) => {
       if (el) {
        el.style.height = 'auto';
        el.style.height = el.scrollHeight + 'px';
       }
      }}
      onInput={(e) => {
       e.currentTarget.style.height = 'auto';
       e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
      }}
      className="bg-slaanesh-panel/60 border border-slaanesh-gold/20 rounded-sm p-3 text-sm text-slaanesh-gold shadow-inner resize-none outline-none focus:border-slaanesh-accent/60 placeholder:text-slaanesh-gold/20 transition-all font-serif italic overflow-hidden w-full"
      value={selectedGame?.comment || ''}
      onChange={(e) => setSelectedGame(prev => prev ? { ...prev, comment: e.target.value } : null)}
      onBlur={() => selectedGame && updateGameStatus(selectedGame.game_status)}
      placeholder="Inscribe your thoughts"
     />
    </div>
   </div>
  </div>

  <div className="space-y-6 pt-2">
   <div className="flex items-center justify-between border-b border-slaanesh-gold/10 pb-3">
    <div className="flex items-center gap-4">
     <h4 className="text-slaanesh-gold text-sm tracking-widest font-display">Chronicles of Rite</h4>
     <span className="bg-slaanesh-accent/10 border border-slaanesh-accent/30 text-slaanesh-accent text-[10px] px-2 py-0.5 rounded-full font-mono">{playthroughs.length}</span>
    </div>
    <button 
     onClick={logPlaythrough}
     className="px-4 py-1.5 bg-slaanesh-gold/10 border border-slaanesh-gold/30 rounded-sm text-[10px] font-bold tracking-wider text-slaanesh-gold hover:bg-slaanesh-gold hover:text-slaanesh-deep transition-all flex items-center gap-2 group"
    >
     <Plus size={14} className="group-hover:rotate-90 transition-transform" /> New Rite
    </button>
   </div>

   <div className="flex flex-col gap-2">
    {playthroughs.length === 0 ? (
     <div className="py-3 text-center bg-slaanesh-panel/10 rounded border border-slaanesh-gold/5">
       <div className="text-[10px] text-slaanesh-gold/30 tracking-[0.2em] font-display uppercase italic px-2">
        No rites have been performed... yet.
       </div>
     </div>
    ) : (
     sortPlaythroughs(playthroughs, getSortCriteria('played')).map(p => (
      <div key={p.uuid} className="group relative flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 sm:py-2 bg-slaanesh-panel/30 rounded-sm border border-slaanesh-gold/10 hover:border-slaanesh-accent/40 transition-all duration-300 shadow-lg overflow-hidden min-h-[44px] gap-3 sm:gap-0">
       <div className="absolute inset-0 bg-gradient-to-r from-slaanesh-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
       
       <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 flex-1 min-w-0 relative z-10 font-mono">
        <div className="flex items-center gap-2 flex-shrink-0 w-auto sm:w-24">
         <Clock size={10} className="text-slaanesh-accent/50" />
         <span className="text-[10px] text-slaanesh-accent tracking-tighter">{p.date}</span>
        </div>
        
        <div className="flex items-center gap-3 flex-shrink-0">
         <span className="text-[10px] font-bold text-slaanesh-gold tracking-wider">{getDisplayPlatform(p.platform, getPlatformMap(uiSettings))}</span>
         {p.playthrough_status && (
           <span className="text-[9px] px-2 py-0.5 bg-slaanesh-accent/10 text-slaanesh-accent rounded-full border border-slaanesh-accent/20 font-bold tracking-tighter shrink-0">
             {p.playthrough_status}
           </span>
         )}
        </div>

        <div className="flex flex-wrap items-center gap-4 flex-1 min-w-0 opacity-60 group-hover:opacity-100 transition-opacity">
         {p.version && (
           <div className="flex items-center gap-1 shrink-0">
             <span className="text-[8px] text-slaanesh-gold/40 font-bold">Ver:</span>
             <span className="text-[9px] text-slaanesh-gold/70">{p.version}</span>
           </div>
         )}
         {p.time_played_minutes != null && (
           <div className="flex items-center gap-1 shrink-0">
             <span className="text-[8px] text-slaanesh-gold/40 font-bold">Time:</span>
             <span className="text-[9px] text-slaanesh-gold/70">{p.time_played_minutes === 0 ? '0m' : `${Math.floor(p.time_played_minutes/60)}h${p.time_played_minutes%60 > 0 ? `${p.time_played_minutes%60}m` : ''}`}</span>
           </div>
         )}
         {p.rating !== null && (
           <div className="flex items-center gap-1 shrink-0">
             <span className="text-[8px] uppercase text-slaanesh-gold/40 font-bold">Fav:</span>
             <span className="text-[9px] text-slaanesh-accent font-bold">{p.rating}%</span>
           </div>
         )}
         {p.comment && (
           <div className="flex items-center gap-2 sm:ml-2 min-w-0 w-full sm:w-auto mt-1 sm:mt-0">
             <div className="hidden sm:block w-[2px] h-3 bg-slaanesh-gold/20" />
             <span className="text-[10px] font-serif italic truncate text-slaanesh-text/60 group-hover:text-slaanesh-text/90 transition-colors">"{p.comment}"</span>
           </div>
         )}
        </div>
       </div>

       <div className="flex items-center gap-1 relative z-10 sm:ml-4 flex-shrink-0 justify-end border-t border-slaanesh-gold/10 sm:border-0 pt-2 sm:pt-0">
        <button 
         onClick={(e) => {
          e.stopPropagation();
          editPlaythrough(p);
         }} 
         className="p-2 text-slaanesh-gold/40 hover:text-slaanesh-accent hover:bg-slaanesh-accent/10 rounded-sm transition-all"
         title="Edit Rite"
        >
         <Edit2 size={13} />
        </button>
        <button 
         onClick={(e) => {
          e.stopPropagation();
          deletePlaythrough(p.uuid);
         }} 
         className="p-2 text-slaanesh-gold/40 hover:text-red-400 hover:bg-red-400/10 rounded-sm transition-all"
         title="Purge Rite"
        >
         <Trash2 size={13} />
        </button>
       </div>
      </div>
     ))
    )}
   </div>
  </div>
  </div>
 </div>

 <RiteEditorModal uiSettings={uiSettings} {...{isRiteEditorOpen, setIsRiteEditorOpen, editingRite, setEditingRite, riteForm, setRiteForm, submitRite, statuses, sortPlatforms, selectedGame}} />

 <SettingsModal games={games} {...{isSettingsOpen, setIsSettingsOpen, settingsTab, setSettingsTab, uiSettings, updateUiSetting, refreshing, refreshMetadata, exportCsv, statuses, setStatuses, deleteStatus: confirmDeleteStatus, addGameStatus, addPlaythroughStatus, updateStatus, reorderStatus, confirmDeleteStatus, editingStatus, setEditingStatus, GAME_SORT_OPTS, PLAYTHROUGH_SORT_OPTS, getSortCriteria, isColVisible, getColSetting, toggleCategory, setRefreshing, showAlert, fetchData, fetchStatuses, setDialog, GAME_DISPLAY_COLS, PLAYTHROUGH_DISPLAY_COLS}} />

 {/* Status Editor Modal */}
  {editingStatus && (() => {
    const list = editingStatus.type === 'game' ? statuses.game : statuses.playthrough;
    const isNew = editingStatus.statusId === null;
    if (editingStatus.statusId === '__null__') return null; // Safety check
    const status = isNew ? null : list.find(s => s.id === editingStatus.statusId);
    if (!isNew && !status) return null;

 // We use a small inner component to manage local state cleanly
     const StatusForm = () => {
      const [localLabel, setLocalLabel] = useState(status?.label || '');
      const [localColor, setLocalColor] = useState(status?.color || (editingStatus.type === 'game' ? '#e0128b' : '#22c55e'));

      const handleSave = () => {
        if (!localLabel) return;
        if (isNew) {
           const newId = localLabel.toLowerCase().replace(/\s+/g, '_');
           const data = editingStatus.type === 'game' 
             ? { label: localLabel, color: localColor, categories: ['backlog'], sort_order: list.length }
             : { label: localLabel, color: localColor, sort_order: list.length };
           updateStatus(editingStatus.type, newId, data);
        } else if (status) {
           updateStatus(editingStatus.type, status.id, { 
             label: localLabel, 
             color: localColor 
           });
        }
      };

      const handleColorChange = (newColor: string | null) => {
        setLocalColor(newColor);
        if (!isNew && status) {
          updateStatus(editingStatus.type, status.id, { color: newColor });
        }
      };

return (
 <div className="flex flex-col gap-6">
 <div className="flex flex-col gap-2">
 <label className="text-sm tracking-wide text-slaanesh-gold/60 font-bold">Label</label>
 <input 
 type="text" 
 value={localLabel}
 onChange={(e) => setLocalLabel(e.target.value)}
 onBlur={isNew ? undefined : handleSave}
 className="bg-black/40 border border-slaanesh-gold/20 rounded p-3 text-slaanesh-gold outline-none focus:border-slaanesh-accent transition-all"
 />
 </div>

 <div className="flex flex-col gap-2">
 <label className="text-sm tracking-wide text-slaanesh-gold/60 font-bold">Color Coding</label>
 <div className="flex items-center gap-4">
 <input 
 type="color" 
 value={localColor || '#000000'}
 onChange={(e) => handleColorChange(e.target.value)}
 className="w-12 h-12 bg-transparent border-0 cursor-pointer p-0"
 />
 <div className="flex-1 flex flex-col gap-1">
 <input 
 type="text" 
 placeholder="Hex, color name..."
 value={localColor || ''}
 onChange={(e) => {
                  setLocalColor(e.target.value || null);
                  if (e.target.value.match(/^#[0-9a-fA-F]{6}$/)) {
                    handleColorChange(e.target.value);
                  }
                }}
 onBlur={isNew ? undefined : handleSave}
 className="bg-black/40 border border-slaanesh-gold/20 rounded p-2 text-sm text-slaanesh-gold outline-none focus:border-slaanesh-accent transition-all"
 />
 <button 
 onClick={() => handleColorChange(null)}
 className="text-xs text-slaanesh-accent/60 hover:text-slaanesh-accent tracking-wide text-left w-fit transition-colors"
 >
 Clear / No Color
 </button>
 </div>
 </div>
 </div>

 <div className="flex justify-end mt-4">
 <button 
 onClick={() => {
 handleSave();
 setEditingStatus(null);
 }}
 className="px-6 py-2 bg-slaanesh-accent/20 border border-slaanesh-accent text-slaanesh-accent text-xs tracking-wide font-bold hover:bg-slaanesh-accent hover:text-white transition-all rounded"
 >
 Confirm Decree
 </button>
 </div>
 </div>
 );
 };

 return (
 <Modal 
 isOpen={true} 
 onClose={() => setEditingStatus(null)} 
 title={`${isNew ? "New" : "Edit"} ${editingStatus.type === "game" ? "Manifestation" : "Ritual State"}`}
 zIndex={60}
 >
 <StatusForm />
 </Modal>
 );
 })()}

 {refreshConflictData && (
        <Modal
          isOpen={true}
          onClose={() => setRefreshConflictData(null)}
          title="Vessel Misalignment"
          zIndex={70}
        >
          <div className="flex flex-col gap-4">
            <p className="text-slaanesh-text/80 text-sm">
              The updated archive records do not support some previously used platforms. Please reassign the platform for the affected entries.
            </p>
            <div className="flex flex-col gap-3 py-2">
              {refreshConflictData.platformConflicts.map((c: any) => (
                <div key={c.playthrough_id} className="flex flex-col gap-1 p-3 bg-black/40 border border-slaanesh-gold/20 rounded">
                   <div className="flex justify-between items-center text-sm">
                     <span className="text-slaanesh-gold/80 italic">Previous: <span className="text-slaanesh-accent font-bold pl-1">{c.old_platform}</span></span>
                   </div>
                   <select
                     value={refreshPlatformMappings[c.playthrough_id] || ''}
                     onChange={(e) => setRefreshPlatformMappings(prev => ({...prev, [c.playthrough_id]: e.target.value}))}
                     className="bg-black border border-slaanesh-gold/30 rounded p-2 text-slaanesh-gold outline-none w-full"
                   >
                     <option value="" disabled>Select valid platform...</option>
                     {refreshConflictData.platforms.map((p: string) => (
                       <option key={p} value={p}>{p}</option>
                     ))}
                   </select>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 mt-4">
               <button
                 onClick={() => setRefreshConflictData(null)}
                 className="px-4 py-2 border border-slaanesh-gold/20 text-slaanesh-gold/60 hover:text-slaanesh-gold hover:bg-white/5 transition-all rounded text-xs tracking-wide uppercase font-bold"
               >
                 Cancel
               </button>
               <button
                 onClick={submitRefreshWithMappings}
                 disabled={refreshConflictData.platformConflicts.some((c: any) => !refreshPlatformMappings[c.playthrough_id]) || loading}
                 className="px-4 py-2 bg-slaanesh-accent/20 border border-slaanesh-accent text-slaanesh-accent hover:bg-slaanesh-accent hover:text-white transition-all rounded text-xs tracking-wide uppercase font-bold disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 {loading ? 'Refreshing...' : 'Confirm Reassignment'}
               </button>
            </div>
          </div>
        </Modal>
      )}

 {/* About Modal */}
 {isImportOpen && (
  <Modal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} title="Ritual Import">
   <ImportModal 
    onClose={() => setIsImportOpen(false)} 
    fetchData={fetchData} 
   />
  </Modal>
 )}

 <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />

 <ConfirmDialog 
 isOpen={dialog.isOpen}
 title={dialog.title}
 message={dialog.message}
 onConfirm={(val) => {
 if (dialog.onConfirm) dialog.onConfirm(val);
 closeDialog();
 }}
 onCancel={closeDialog}
 isAlert={dialog.isAlert}
 showInput={dialog.showInput}
 inputValue={dialogInputValue}
 onInputChange={setDialogInputValue}
 showSelect={dialog.showSelect}
 selectValue={dialogSelectValue}
 onSelectChange={setDialogSelectValue}
 selectOptions={dialog.selectOptions}
 confirmLabel={dialog.confirmLabel}
 cancelLabel={dialog.cancelLabel}
 />
 </div>
 );
}
