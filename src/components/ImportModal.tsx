import React, { useState, useEffect, useRef } from 'react';
import { Upload, CheckCircle, Database, RefreshCw, X, ArrowUp, ArrowDown, ArrowRight, Download } from 'lucide-react';
import { cn } from '../lib/utils';
// @ts-ignore
import initSqlJs from 'sql.js';
// @ts-ignore
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import Papa from 'papaparse';

function ConflictResolutionView({ 
  analysisResults, 
  resolutions, 
  setResolutions, 
  onBack, 
  onFinalize 
}: { 
  analysisResults: any, 
  resolutions: any[], 
  setResolutions: (r: any[]) => void, 
  onBack: () => void, 
  onFinalize: () => void 
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h4 className="text-slaanesh-gold text-xs font-bold tracking-wider">Conflicting Vibrations</h4>
        <p className="text-[10px] text-slaanesh-text/60 italic">Resolving these discords will unify your archive.</p>
      </div>

      <div className="bg-black/40 border border-slaanesh-gold/10 rounded-sm max-h-96 overflow-y-auto p-4 flex flex-col gap-6 custom-scrollbar">
        {analysisResults.conflicts.map((c: any, idx: number) => {
          const res = resolutions.find(r => r.igdb_id === c.igdb_id && r.type === c.type && r.pt_id === c.pt_id);
          const setChoice = (choice: string) => {
            const newRes = resolutions.filter(r => !(r.igdb_id === c.igdb_id && r.type === c.type && r.pt_id === c.pt_id));
            newRes.push({ ...c, choice, value: choice === 'overwrite' ? c.import_value : c.db_value });
            setResolutions(newRes);
          };

          return (
            <div key={idx} className="flex flex-col gap-3 p-3 bg-white/5 rounded-sm border border-white/5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slaanesh-accent">{c.game_name}</span>
                <span className="text-[9px] px-2 py-0.5 bg-slaanesh-gold/10 text-slaanesh-gold rounded-full uppercase tracking-tighter">
                  {c.type.replace('_', ' ')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className={cn("p-2 rounded-sm border border-dashed transition-all cursor-pointer", res?.choice === 'keep' ? "bg-slaanesh-gold/10 border-slaanesh-gold/40" : "border-white/5 opacity-40")} onClick={() => setChoice('keep')}>
                  <div className="text-[8px] uppercase font-bold text-slaanesh-gold/50 mb-1">Archive Entry</div>
                  <div className="text-[10px] text-slaanesh-text line-clamp-3 overflow-hidden">
                    {typeof c.db_value === 'string' ? c.db_value : JSON.stringify(c.db_value)}
                  </div>
                </div>
                <div className={cn("p-2 rounded-sm border border-dashed transition-all cursor-pointer", res?.choice === 'overwrite' ? "bg-slaanesh-accent/10 border-slaanesh-accent/40" : "border-white/5 opacity-40")} onClick={() => setChoice('overwrite')}>
                  <div className="text-[8px] uppercase font-bold text-slaanesh-accent/50 mb-1">Manifest Inscription</div>
                  <div className="text-[10px] text-slaanesh-text line-clamp-3 overflow-hidden">
                    {typeof c.import_value === 'string' ? c.import_value : JSON.stringify(c.import_value)}
                  </div>
                </div>
              </div>

              {(c.type === 'game_comment' || c.type === 'pt_comment' || c.type === 'pt_dates') && (
                <button 
                  onClick={() => {
                    const newRes = resolutions.filter(r => !(r.igdb_id === c.igdb_id && r.type === c.type && r.pt_id === c.pt_id));
                    newRes.push({ ...c, choice: 'merge', value: c.import_value });
                    setResolutions(newRes);
                  }}
                  className={cn(
                    "w-full py-1.5 text-[9px] font-bold tracking-widest transition-all rounded-sm border",
                    res?.choice === 'merge' ? "bg-slaanesh-accent/20 border-slaanesh-accent text-slaanesh-accent" : "bg-black/20 border-white/5 text-slaanesh-gold/40 hover:text-slaanesh-gold"
                  )}
                >
                  MERGE VIBRATIONS
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-between items-center pt-6 border-t border-slaanesh-gold/10">
        <div className="text-[10px] text-slaanesh-text/40 italic">
          {resolutions.length} of {analysisResults.conflicts.length} discords resolved.
        </div>
        <div className="flex gap-3">
          <button onClick={onBack} className="slaanesh-btn-secondary px-6 py-2 text-[10px]">Retreat</button>
          <button 
            onClick={onFinalize}
            disabled={resolutions.length < analysisResults.conflicts.length}
            className="indulge-btn px-8 py-2 text-[10px]"
          >
            Finalize Manifestation
          </button>
        </div>
      </div>
    </div>
  );
}

function CsvImportTab({ onClose, fetchData }: { onClose: () => void, fetchData: () => void }) {
  const [gamesFile, setGamesFile] = useState<File | null>(null);
  const [playthroughsFile, setPlaythroughsFile] = useState<File | null>(null);
  const [step, setStep] = useState<'upload' | 'col_mapping' | 'status_mapping' | 'analyzing' | 'game_mapping' | 'pt_conflicts' | 'platform_mapping' | 'importing' | 'finished' | 'status_conflicts'>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [log, setLog] = useState<string[]>([]);
  const consoleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [log]);

  const [csvProgress, setCsvProgress] = useState<{ active: boolean; status: string; current: number; total: number } | null>(null);

  useEffect(() => {
    if (step !== 'analyzing') {
      setCsvProgress(null);
      return;
    }

    let intervalId = setInterval(async () => {
      try {
        const res = await fetch('/api/import/csv/analyze-progress');
        if (res.ok) {
          const data = await res.json();
          setCsvProgress(data);
        }
      } catch (err) {}
    }, 200);

    return () => clearInterval(intervalId);
  }, [step]);
  
  // Data State
  const [rawGames, setRawGames] = useState<any[]>([]);
  const [rawPlaythroughs, setRawPlaythroughs] = useState<any[]>([]);
  
  // Mapping State
  const [gameColMap, setGameColMap] = useState<Record<string, string>>({
    igdb_id: '',
    name: '',
    comment: '',
    game_status: '',
    platforms: '',
    owned_vaults: ''
  });
  const [ptColMap, setPtColMap] = useState<Record<string, string>>({
    igdb_id: '',
    date: '',
    platform: '',
    comment: '',
    playthrough_status: '',
    rating: '',
    version: '',
    time_played_minutes: ''
  });
  
  const [csvStatuses, setCsvStatuses] = useState<string[]>([]);
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});
  
  const [appStatuses, setAppStatuses] = useState<{id: string, label: string}[]>([]);
  const [appPTStatuses, setAppPTStatuses] = useState<{id: string, label: string}[]>([]);
  const [playedCategoryStatusIds, setPlayedCategoryStatusIds] = useState<string[]>([]);
  const [defaultBacklogId, setDefaultBacklogId] = useState<string>('');
  const [defaultCompletedId, setDefaultCompletedId] = useState<string>('');
  const [defaultDiscardedId, setDefaultDiscardedId] = useState<string>('');

  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [ptResolutions, setPtResolutions] = useState<Record<number, 'keep' | 'overwrite' | 'merge'>>({});
  const [statusOverrides, setStatusOverrides] = useState<Record<number, string>>({});
  const [platformMappings, setPlatformMappings] = useState<Record<string, string>>({});
  const [applyPlatformMappingsToAll, setApplyPlatformMappingsToAll] = useState(false);
  const [igdbMetadata, setIgdbMetadata] = useState<Map<number, any>>(new Map());
  const [resolutions, setResolutions] = useState<any[]>([]);
  const [gameIdMappings, setGameIdMappings] = useState<Record<string, string>>({});

  const addLog = (msg: string) => setLog(prev => [msg, ...prev]);

  useEffect(() => {
    // Fetch statuses for mapping
    const fetchStatuses = async () => {
      try {
        const res = await fetch('/api/statuses');
        const data = await res.json();
        // data is { game: [...], playthrough: [...] }
        const gameStatuses = data.game || [];
        setAppStatuses(gameStatuses);
        setAppPTStatuses(data.playthrough || []);
        
        // Find which statuses are in 'played' category
        const playedIds = gameStatuses
          .filter((s: any) => s.categories && s.categories.includes('played'))
          .map((s: any) => s.id);
        
        setPlayedCategoryStatusIds(playedIds);

        // Find best matches for default roles
        const backlog = gameStatuses.find((s: any) => s.categories && s.categories.includes('backlog')) || 
                        gameStatuses.find((s: any) => s.id === 'backlog') || 
                        gameStatuses[0];
        const completed = gameStatuses.find((s: any) => s.categories && s.categories.includes('played')) ||
                          gameStatuses.find((s: any) => s.id === 'completed') ||
                          gameStatuses[0];
        const discarded = gameStatuses.find((s: any) => s.categories && s.categories.includes('discarded')) ||
                          gameStatuses.find((s: any) => s.id === 'discarded') ||
                          gameStatuses.find((s: any) => s.label?.toLowerCase().includes('discarded')) ||
                          completed; 

        setDefaultBacklogId(backlog?.id || '');
        setDefaultCompletedId(completed?.id || '');
        setDefaultDiscardedId(discarded?.id || '');
      } catch (e) {
        console.error('Failed to fetch statuses', e);
      }
    };
    fetchStatuses();
  }, []);

  const handleFileUpload = async () => {
    if (!gamesFile || !playthroughsFile) return;
    setIsProcessing(true);
    setStatus('Reading Scrolls...');
    
    try {
      const parseFile = (file: File) => new Promise<any[]>((resolve, reject) => {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => resolve(results.data),
          error: (err) => reject(err)
        });
      });

      const [gData, pData] = await Promise.all([parseFile(gamesFile), parseFile(playthroughsFile)]);
      setRawGames(gData);
      setRawPlaythroughs(pData);

      // Attempt automatic mapping
      const gCols = Object.keys(gData[0] || {});
      const pCols = Object.keys(pData[0] || {});

      const findCol = (cols: string[], possible: string[]) => {
        return cols.find(c => possible.some(p => c.toLowerCase() === p.toLowerCase())) || '';
      }

      setGameColMap({
        igdb_id: findCol(gCols, ['IGDB_ID', 'igdb_id', 'igdb id', 'id', 'igdb', 'game_id', 'game id']),
        name: findCol(gCols, ['Name', 'Title', 'Game', 'Label']),
        comment: findCol(gCols, ['game_comment', 'Comment', 'notes', 'inscribed reflections', 'reflection']),
        game_status: findCol(gCols, ['Status', 'state', 'condition']),
        platforms: findCol(gCols, ['Platform', 'vessel', 'system']),
        owned_vaults: findCol(gCols, ['owned_vaults', 'owned vaults', 'vaults', 'stores', 'providers', 'owned_vaults_of_possession', 'possession'])
      });

      setPtColMap({
        igdb_id: findCol(pCols, ['IGDB_ID', 'igdb_id', 'igdb id', 'id', 'igdb', 'game_id', 'game id']),
        date: findCol(pCols, ['Date', 'arrival', 'play date']),
        platform: findCol(pCols, ['Platform', 'vessel', 'system']),
        comment: findCol(pCols, ['playthrough_comment', 'playthrough comment', 'Comment', 'notes', 'reflection', 'reflections', 'observations']),
        playthrough_status: findCol(pCols, ['Status', 'state']),
        rating: findCol(pCols, ['Rating', 'score']),
        version: findCol(pCols, ['Version', 'edition']),
        time_played_minutes: findCol(pCols, ['time_played', 'playtime', 'time played minutes', 'minutes', 'time played'])
      });

      setStep('col_mapping');
    } catch (e: any) {
      addLog(`CORRUPTION: ${e.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const proceedToStatusMapping = () => {
    // Collect unique statuses from Games CSV
    const statusCol = gameColMap.game_status;
    const statuses = new Set<string>();
    rawGames.forEach(g => {
      const val = String(g[statusCol] || '').trim();
      if (val) statuses.add(val);
    });
    const sortedStatuses = Array.from(statuses).sort();
    setCsvStatuses(sortedStatuses);
    
    // Auto-map 1:1 if label matches id or label
    const initialMap: Record<string, string> = {};
    sortedStatuses.forEach(s => {
      const match = appStatuses.find(as => 
        as.id.toLowerCase() === s.toLowerCase() || 
        as.label.toLowerCase() === s.toLowerCase() ||
        as.id.toLowerCase() === s.toLowerCase().replace(/\s+/g, '_')
      );
      if (match) initialMap[s] = match.id;
    });
    setStatusMap(initialMap);
    setStep('status_mapping');
  };

  const validateConstraints = () => {
    // 1. Played status games must have at least one playthrough
    const playedStatusInCsv = csvStatuses.filter(s => playedCategoryStatusIds.includes(statusMap[s]));
    const gIdCol = gameColMap.igdb_id;
    const gStatusCol = gameColMap.game_status;
    const pIdCol = ptColMap.igdb_id;

    const gamesWithPlayedStatus = rawGames.filter(g => playedStatusInCsv.includes(g[gStatusCol]));
    const ptIds = new Set(rawPlaythroughs.map(p => p[pIdCol]));

    const missingPts = gamesWithPlayedStatus.filter(g => !ptIds.has(g[gIdCol]));
    if (missingPts.length > 0) {
      addLog(`CONFLICTION: ${missingPts.length} games marked with Played status have no logged rites.`);
      addLog(`Example: ${missingPts[0].name || missingPts[0][gIdCol]}`);
      return false;
    }
    return true;
  };

  const startAnalysis = async () => {
    setIsProcessing(true);
    setStep('analyzing');
    setStatus('Analyzing Manifestations...');
    setLog([]);
    addLog('Peer into the database to find existing threads...');

    const gIdCol = gameColMap.igdb_id;
    const gStatusCol = gameColMap.game_status;
    const gCommentCol = gameColMap.comment;
    const gPlatformCol = gameColMap.platforms;

    // Create a map for platform fallback from games list
    const gamePlatforms: Record<string, string> = {};
    rawGames.forEach(g => {
      const id = String(g[gIdCol]).trim();
      if (id && g[gPlatformCol]) {
        gamePlatforms[id] = String(g[gPlatformCol]).trim();
      }
    });

    const parseDateStrictly = (dateStr: string | null | undefined) => {
      if (!dateStr) return new Date().toISOString().split('T')[0];
      const cleaned = String(dateStr).trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
        const d = new Date(cleaned);
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
      }
      const euMatch = cleaned.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
      if (euMatch) {
        const d = new Date(`${euMatch[3]}-${euMatch[2].padStart(2, '0')}-${euMatch[1].padStart(2, '0')}`);
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
      }
      const usMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (usMatch) {
        const d = new Date(`${usMatch[3]}-${usMatch[1].padStart(2, '0')}-${usMatch[2].padStart(2, '0')}`);
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
      }
      const d = new Date(cleaned);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
      return new Date().toISOString().split('T')[0];
    };

    const formattedGames = rawGames.filter(g => g[gIdCol]).map(g => {
      const gIdStr = String(g[gIdCol]).trim();
      const mappedId = gameIdMappings[gIdStr] || gIdStr;
      return {
        igdb_id: mappedId,
        status: statusMap[g[gStatusCol]] || defaultBacklogId,
        status_id: statusMap[g[gStatusCol]] || defaultBacklogId,
        comment: g[gCommentCol] || null,
        platform: g[gPlatformCol] || null,
        name: g[gameColMap.name] || gIdStr,
        owned_vaults: gameColMap.owned_vaults ? (g[gameColMap.owned_vaults] || null) : null
      };
    });

    const pIdCol = ptColMap.igdb_id;
    const formattedPTs = rawPlaythroughs.filter(p => p[pIdCol]).map(p => {
      const igdb_id_orig = String(p[pIdCol]).trim();
      const igdb_id = gameIdMappings[igdb_id_orig] || igdb_id_orig;

      let status_id = null;
      if (ptColMap.playthrough_status && p[ptColMap.playthrough_status]) {
        const rawStatus = String(p[ptColMap.playthrough_status]).trim();
        const ptStatusMatch = appPTStatuses.find((s: any) => s.id === rawStatus || s.label.toLowerCase() === rawStatus.toLowerCase());
        if (ptStatusMatch) {
          status_id = ptStatusMatch.id;
        }
      }

      let rating = null;
      if (ptColMap.rating && p[ptColMap.rating]) {
         const rawRating = parseInt(p[ptColMap.rating]);
         if (!isNaN(rawRating) && rawRating >= 0 && rawRating <= 100) rating = rawRating;
      }

      let time_played_minutes = null;
      if (ptColMap.time_played_minutes && p[ptColMap.time_played_minutes]) {
         const rawTime = parseInt(p[ptColMap.time_played_minutes]);
         if (!isNaN(rawTime) && rawTime >= 0) time_played_minutes = rawTime;
      }

      let version = null;
      if (ptColMap.version && p[ptColMap.version]) {
         version = String(p[ptColMap.version]).trim();
      }

      return {
        igdb_id,
        date: parseDateStrictly(p[ptColMap.date]),
        platform: p[ptColMap.platform] || gamePlatforms[igdb_id_orig] || null,
        comment: p[ptColMap.comment] || null,
        status_id,
        rating,
        version,
        time_played_minutes
      };
    });

    try {
      const res = await fetch('/api/import/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ games: formattedGames, playthroughs: formattedPTs })
      });
      const data = await res.json();
      setAnalysisResults(data);
      setIgdbMetadata(new Map(data.metadata));

      if (data.unmappedGames && data.unmappedGames.length > 0) {
        setStep('game_mapping');
      } else if (data.statusConflicts && data.statusConflicts.length > 0) {
        setStep('status_conflicts');
      } else if (data.ptConflicts && data.ptConflicts.length > 0) {
        setStep('pt_conflicts');
      } else if (data.platformConflicts && data.platformConflicts.length > 0) {
        setStep('platform_mapping');
      } else {
        await executeImport(data, {}, {});
      }
    } catch (e: any) {
      addLog(`ANALYSIS FAILED: ${e.message}`);
      setStep('status_mapping');
    } finally {
      setIsProcessing(false);
    }
  };

  const executeImport = async (analysis: any, resolutions: any, pMappings: any, sOverrides: any = {}) => {
    setIsProcessing(true);
    setStep('importing');
    setStatus('Final Manifestation...');

    let isPolling = true;
    const pollProgress = async () => {
      try {
        const pRes = await fetch('/api/import/csv/execute-progress');
        if (pRes.ok) {
          const pData = await pRes.json();
          if (pData.status) {
            setStatus(pData.status);
          }
          if (pData.logs && Array.isArray(pData.logs)) {
            setLog(pData.logs);
          }
        }
      } catch (e) {}
    };

    const intervalId = setInterval(() => {
      if (isPolling) pollProgress();
    }, 450);

    try {
      const res = await fetch('/api/import/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          gamesToImport: analysis.gamesToImport,
          gamesToUpdate: analysis.gamesToUpdate,
          ptsToAdd: analysis.ptsToAdd,
          ptConflicts: analysis.ptConflicts,
          ptResolutions: resolutions,
          platformMappings: pMappings,
          statusOverrides: sOverrides
        })
      });
      
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (data.success) {
        setStatus('Import Complete.');
        addLog('Ritual completed successfully.');
      } else {
        addLog(`ERROR: ${data.error}`);
      }
    } catch (e: any) {
      addLog(`FATAL: ${e.message}`);
    } finally {
      isPolling = false;
      clearInterval(intervalId);
      await pollProgress();
      setIsProcessing(false);
      setStep('finished');
      fetchData();
    }
  };

  const handleFinishPlatformMapping = () => {
    if (!analysisResults) return;

    const remaining = analysisResults.platformConflicts.filter((conf: any) => {
      const mapped = platformMappings[`${conf.igdb_id}::${conf.csv_platform}`];
      if (!mapped) return true;

      // Validate against this specific game's metadata
      const meta = igdbMetadata.get(conf.igdb_id);
      const allowed = meta?.platforms?.map((p: any) => p.name) || [];
      
      return !allowed.includes(mapped);
    });

    if (remaining.length === 0) {
      executeImport(analysisResults, ptResolutions, platformMappings);
    } else {
      setAnalysisResults({
        ...analysisResults,
        platformConflicts: remaining
      });
      addLog(`${analysisResults.platformConflicts.length - remaining.length} vessels aligned. ${remaining.length} remain erratic.`);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-2">
      {step === 'upload' && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs tracking-wide font-bold text-slaanesh-gold/60 uppercase">Manifestation Scroll (Games CSV)</label>
              <input type="file" accept=".csv" onChange={e => setGamesFile(e.target.files?.[0] || null)} className="csv-input" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs tracking-wide font-bold text-slaanesh-gold/60 uppercase">Rites Chronicles (Playthroughs CSV)</label>
              <input type="file" accept=".csv" onChange={e => setPlaythroughsFile(e.target.files?.[0] || null)} className="csv-input" />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4 border-t border-slaanesh-gold/10 pt-6">
            <button onClick={onClose} className="slaanesh-btn-secondary">Retreat</button>
            <button 
              onClick={handleFileUpload} 
              disabled={!gamesFile || !playthroughsFile || isProcessing}
              className="indulge-btn px-8"
            >
              Analyze Scrolls
            </button>
          </div>
        </div>
      )}

      {step === 'col_mapping' && ( rawGames.length > 0 ) && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex flex-col gap-4">
              <h5 className="text-[10px] font-bold text-slaanesh-accent tracking-[0.2em] uppercase underline underline-offset-4 decoration-slaanesh-accent/30">Manifestation Anchors</h5>
              {Object.keys(gameColMap).map(key => (
                <div key={key} className="flex flex-col gap-1">
                  <label className="text-[10px] text-slaanesh-gold/50 font-bold capitalize">{key.replace('_', ' ')}</label>
                  <select 
                    value={gameColMap[key]} 
                    onChange={e => setGameColMap(prev => ({...prev, [key]: e.target.value}))}
                    className="mapping-select"
                  >
                    <option value="">-- Not Mapped --</option>
                    {Object.keys(rawGames[0]).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-4">
              <h5 className="text-[10px] font-bold text-slaanesh-accent tracking-[0.2em] uppercase underline underline-offset-4 decoration-slaanesh-accent/30">Rites Parameters</h5>
              {Object.keys(ptColMap).map(key => (
                <div key={key} className="flex flex-col gap-1">
                  <label className="text-[10px] text-slaanesh-gold/50 font-bold capitalize">{key.replace('_', ' ')}</label>
                  <select 
                    value={ptColMap[key]} 
                    onChange={e => setPtColMap(prev => ({...prev, [key]: e.target.value}))}
                    className="mapping-select"
                  >
                    <option value="">-- Not Mapped --</option>
                    {Object.keys(rawPlaythroughs[0]).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t border-slaanesh-gold/10">
             <button onClick={() => setStep('upload')} className="slaanesh-btn-secondary">Revisit Scrolls</button>
             <button 
               onClick={proceedToStatusMapping}
               disabled={!gameColMap.igdb_id || !gameColMap.game_status || !ptColMap.igdb_id || !ptColMap.date}
               className="indulge-btn px-8"
             >
               Map Hierarchies
             </button>
          </div>
        </div>
      )}

      {step === 'game_mapping' && analysisResults && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h4 className="text-sm font-bold text-slaanesh-gold tracking-widest uppercase italic">Unknown Manifestations</h4>
            <p className="text-xs text-slaanesh-gold/60 leading-relaxed">
              Some games could not be found in the sacred archives. Search for them to align the threads.
            </p>
          </div>
          
          <div className="max-h-80 overflow-y-auto custom-scrollbar flex flex-col gap-4">
            {analysisResults.unmappedGames.map((game: any) => (
              <div key={game.original_igdb_id} className="bg-black/40 border border-slaanesh-gold/20 p-3 rounded-sm flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slaanesh-gold">{game.name || game.original_igdb_id}</span>
                    <span className="text-[10px] text-slaanesh-text/40 italic">Original ID: {game.original_igdb_id}</span>
                  </div>
                  {gameIdMappings[game.original_igdb_id] ? (
                    <span className="text-[10px] font-bold text-slaanesh-accent flex items-center gap-1">
                      <CheckCircle size={12} /> Mapped: {gameIdMappings[game.original_igdb_id]}
                    </span>
                  ) : (
                    <span className="text-[8px] font-bold uppercase text-slaanesh-gold/60 animate-pulse">Unmapped</span>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Search IGDB to map..." 
                      className="flex-1 bg-white/5 border border-white/10 p-2 text-[10px] text-white rounded-sm placeholder:text-slaanesh-gold/20 outline-none focus:border-slaanesh-gold/40 transition-colors"
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter') {
                          const target = e.currentTarget;
                          const q = target.value;
                          if (!q) return;
                          target.disabled = true;
                          try {
                            const params = new URLSearchParams({ q });
                            const res = await fetch('/api/search?' + params.toString());
                            const results = await res.json();
                            const container = target.parentElement?.nextElementSibling as HTMLDivElement;
                            if (container) {
                              container.innerHTML = '';
                              if (!Array.isArray(results)) {
                                const errMsg = results?.error || 'An error occurred during search';
                                container.innerHTML = `<div class="text-[10px] text-red-400 font-bold p-1">${errMsg}</div>`;
                              } else if (results.length === 0) {
                                container.innerHTML = '<div class="text-[10px] text-slaanesh-gold/40">No results found.</div>';
                              } else {
                                results.slice(0, 5).forEach((r: any) => {
                                  const btn = document.createElement('button');
                                  btn.className = "text-left text-[10px] text-slaanesh-text hover:text-slaanesh-gold bg-white/5 hover:bg-white/10 p-1.5 rounded-sm border border-transparent hover:border-slaanesh-gold/20 transition-all";
                                  btn.innerHTML = `<strong>${r.name}</strong> ${r.first_release_date ? `(${new Date(r.first_release_date * 1000).getFullYear()})` : ''}`;
                                  btn.onclick = () => {
                                    setGameIdMappings(prev => ({ ...prev, [game.original_igdb_id]: r.id }));
                                    target.value = r.name;
                                    container.innerHTML = '';
                                  };
                                  container.appendChild(btn);
                                });
                              }
                            }
                          } catch (e) {
                            console.error(e);
                          } finally {
                            target.disabled = false;
                          }
                        }
                      }}
                    />
                    <div className="text-[8px] text-slaanesh-gold/30 self-center">Press Enter to search</div>
                  </div>
                  <div className="flex flex-col gap-1"></div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 mt-4 border-t border-slaanesh-gold/10 pt-6">
            <button 
              onClick={() => setStep('status_mapping')} 
              className="slaanesh-btn-secondary"
            >
              Back
            </button>
            <button 
              onClick={() => {
                startAnalysis(); 
              }}
              disabled={analysisResults.unmappedGames.some((g: any) => !gameIdMappings[g.original_igdb_id])}
              className="indulge-btn px-8"
            >
              Re-Analyze Fragments
            </button>
          </div>
        </div>
      )}

      {step === 'status_conflicts' && analysisResults && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h4 className="text-sm font-bold text-slaanesh-gold tracking-widest uppercase italic">The Weaver's Dissonance</h4>
            <p className="text-xs text-slaanesh-gold/60 leading-relaxed">
              Ritual threads are tangled. Games with playthroughs must have a "Played" status, and those without must not. Select a compliant status to restore balance.
            </p>
          </div>
          
          <div className="max-h-80 overflow-y-auto custom-scrollbar flex flex-col gap-3">
            {analysisResults.statusConflicts.map((conf: any) => {
              const currentStatus = statusOverrides[conf.igdb_id] || conf.status || conf.status_id;
              const isPlayed = playedCategoryStatusIds.includes(currentStatus);
              const hasPTs = !!(analysisResults.ptsToAdd.some((p: any) => parseInt(p.igdb_id) === conf.igdb_id) || (analysisResults.ptConflicts || []).some((c: any) => c.igdb_id === conf.igdb_id));
              
              // We just need to know if the current selection is valid
              const isValid = (hasPTs && isPlayed) || (!hasPTs && !isPlayed);

              return (
                <div key={conf.igdb_id} className={cn(
                  "bg-black/40 border p-3 rounded-sm flex flex-col gap-3 transition-all",
                  isValid ? "border-slaanesh-gold/20" : "border-red-500/30"
                )}>
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slaanesh-gold">{conf.name}</span>
                      <span className="text-[10px] text-slaanesh-text/40 italic">
                        {hasPTs ? "Has ritual records" : "No ritual records found"}
                      </span>
                    </div>
                    {!isValid && (
                      <span className="text-[8px] font-bold uppercase text-red-400 animate-pulse">Dissonance</span>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[8px] font-bold uppercase text-slaanesh-gold/40">Select Compliant Status:</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {appStatuses.map(s => {
                        const sIsPlayed = playedCategoryStatusIds.includes(s.id);
                        const sCompliant = (hasPTs && sIsPlayed) || (!hasPTs && !sIsPlayed);
                        
                        return (
                          <button
                            key={s.id}
                            onClick={() => setStatusOverrides(prev => ({ ...prev, [conf.igdb_id]: s.id }))}
                            className={cn(
                              "px-2 py-1.5 text-[9px] font-bold transition-all rounded-[2px] border text-left",
                              currentStatus === s.id
                                ? (sCompliant ? "bg-slaanesh-accent/20 border-slaanesh-accent text-slaanesh-accent" : "bg-red-500/20 border-red-500 text-red-500")
                                : (sCompliant ? "bg-white/5 border-white/5 text-slaanesh-gold/60 hover:border-slaanesh-gold/20" : "bg-white/2 border-transparent text-slaanesh-gold/10 cursor-not-allowed")
                            )}
                            disabled={!sCompliant}
                          >
                            {s.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-3 mt-4 border-t border-slaanesh-gold/10 pt-6">
            <button 
              onClick={() => setStep('status_mapping')} 
              className="slaanesh-btn-secondary"
            >
              Back
            </button>
            <button 
              onClick={() => {
                const allFine = analysisResults.statusConflicts.every((conf: any) => {
                  const currentStatus = statusOverrides[conf.igdb_id] || conf.status || conf.status_id;
                  const isPlayed = playedCategoryStatusIds.includes(currentStatus);
                  const hasPTs = !!(analysisResults.ptsToAdd.some((p: any) => parseInt(p.igdb_id) === conf.igdb_id) || (analysisResults.ptConflicts || []).some((c: any) => c.igdb_id === conf.igdb_id));
                  return (hasPTs && isPlayed) || (!hasPTs && !isPlayed);
                });

                if (allFine) {
                  if (analysisResults.ptConflicts?.length > 0) setStep('pt_conflicts');
                  else if (analysisResults.platformConflicts?.length > 0) setStep('platform_mapping');
                  else executeImport(analysisResults, ptResolutions, platformMappings, statusOverrides);
                }
              }}
              disabled={!analysisResults.statusConflicts.every((conf: any) => {
                const currentStatus = statusOverrides[conf.igdb_id] || conf.status || conf.status_id;
                const isPlayed = playedCategoryStatusIds.includes(currentStatus);
                const hasPTs = !!(analysisResults.ptsToAdd.some((p: any) => parseInt(p.igdb_id) === conf.igdb_id) || (analysisResults.ptConflicts || []).some((c: any) => c.igdb_id === conf.igdb_id));
                return (hasPTs && isPlayed) || (!hasPTs && !isPlayed);
              })}
              className="indulge-btn px-8"
            >
              Synchronize Threads
            </button>
          </div>
        </div>
      )}

      {step === 'status_mapping' && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h4 className="text-slaanesh-gold text-xs font-bold tracking-wider">Status Hierarchies</h4>
            <p className="text-[10px] text-slaanesh-text/60 italic">Align the condition of your scrolls with the sacred statuses of this manifestation.</p>
          </div>
          
          <div className="bg-black/40 border border-slaanesh-gold/10 rounded-sm max-h-80 overflow-y-auto p-2 flex flex-col gap-2">
            {csvStatuses.map(s => (
              <div key={s} className="flex items-center justify-between bg-white/5 p-3 rounded-sm">
                <span className="text-[11px] text-slaanesh-gold font-medium">{s}</span>
                <select 
                  value={statusMap[s] || ''} 
                  onChange={e => setStatusMap(prev => ({...prev, [s]: e.target.value}))}
                  className="mapping-select w-48"
                >
                  <option value="">-- Select Status --</option>
                  {appStatuses.map(as => <option key={as.id} value={as.id}>{as.label}</option>)}
                </select>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slaanesh-gold/10">
             <button onClick={() => setStep('col_mapping')} className="slaanesh-btn-secondary">Back</button>
             <button 
               onClick={startAnalysis}
               disabled={csvStatuses.some(s => !statusMap[s])}
               className="indulge-btn px-8"
             >
               Analyze Manifestation
             </button>
          </div>
        </div>
      )}

      {step === 'analyzing' && (
        <div className="flex flex-col items-center justify-center p-12 gap-6 bg-black/30 border border-slaanesh-gold/10 rounded-sm">
          <RefreshCw className="text-slaanesh-accent animate-spin" size={36} />
          
          <div className="text-center flex flex-col gap-2 max-w-md w-full">
            <h3 className="text-slaanesh-gold font-bold tracking-[0.2em] text-xs uppercase underline underline-offset-4 decoration-slaanesh-gold/20">
              Deciphering Scrolls
            </h3>
            
            <p className="text-slaanesh-text text-[11px] font-medium min-h-[32px] flex items-center justify-center px-4">
              {csvProgress?.status || 'Analyzing structural threads and alignments...'}
            </p>

            {csvProgress && csvProgress.total > 0 && (
              <div className="flex flex-col gap-1.5 mt-2">
                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-slaanesh-gold/10">
                  <div 
                    className="bg-gradient-to-r from-slaanesh-accent to-slaanesh-gold h-full transition-all duration-300 rounded-full"
                    style={{ width: `${Math.min(100, Math.round((csvProgress.current / csvProgress.total) * 100))}%` }}
                  />
                </div>
                <div className="flex justify-between font-mono text-[9px] text-slaanesh-gold/55">
                  <span>Progress</span>
                  <span>
                    {csvProgress.current} / {csvProgress.total} records ({Math.min(100, Math.round((csvProgress.current / csvProgress.total) * 100))}%)
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {step === 'pt_conflicts' && analysisResults && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
             <h4 className="text-slaanesh-gold text-xs font-bold tracking-wider uppercase underline underline-offset-4 decoration-slaanesh-gold/20">Temporal Dissonance Found</h4>
             <p className="text-[10px] text-slaanesh-text/60 italic">These games have overlapping rites with different dates. Choose how to resolve the threads.</p>
          </div>
          
          <div className="max-h-80 overflow-y-auto custom-scrollbar flex flex-col gap-3">
            {analysisResults.ptConflicts.map((conf: any) => (
              <div key={conf.igdb_id} className="bg-black/40 border border-slaanesh-gold/10 p-3 rounded-sm flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold text-slaanesh-gold">{conf.gameName}</span>
                  <div className="flex gap-2">
                    {['keep', 'overwrite', 'merge'].map((choice: any) => (
                      <button
                        key={choice}
                        onClick={() => setPtResolutions(prev => ({ ...prev, [conf.igdb_id]: choice }))}
                        className={cn(
                          "px-2 py-1 text-[8px] font-bold uppercase transition-all rounded-[2px]",
                          ptResolutions[conf.igdb_id] === choice 
                            ? "bg-slaanesh-accent text-black" 
                            : "bg-white/5 text-slaanesh-gold/40 hover:bg-white/10"
                        )}
                      >
                        {choice}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[9px]">
                  <div className="flex flex-col gap-1">
                    <span className="text-slaanesh-gold/40 uppercase font-bold">Existing ({conf.db_pts.length})</span>
                    <div className="max-h-20 overflow-y-auto">
                      {conf.db_pts.map((p: any, idx: number) => (
                        <div key={idx} className="opacity-60">{p.date} - {p.platform}</div>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 border-l border-slaanesh-gold/10 pl-2">
                    <span className="text-slaanesh-accent/60 uppercase font-bold">New ({conf.import_pts.length})</span>
                    <div className="max-h-20 overflow-y-auto">
                      {conf.import_pts.map((p: any, idx: number) => (
                        <div key={idx} className="text-slaanesh-accent/80 font-bold">{p.date} - {p.platform}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 mt-4 border-t border-slaanesh-gold/10 pt-4">
            <button 
              onClick={() => setStep('status_mapping')}
              className="px-6 py-2 border border-slaanesh-gold/20 text-slaanesh-gold/50 hover:text-slaanesh-gold rounded-sm text-[10px] font-bold tracking-wider"
            >
              Back
            </button>
            <button 
              onClick={() => {
                if (analysisResults.platformConflicts?.length > 0) {
                  setStep('platform_mapping');
                } else {
                  executeImport(analysisResults, ptResolutions, platformMappings);
                }
              }}
              disabled={Object.keys(ptResolutions).length < analysisResults.ptConflicts.length}
              className="indulge-btn px-8"
            >
              Continue Ritual
            </button>
          </div>
        </div>
      )}

      {step === 'platform_mapping' && analysisResults && (
        <div className="flex flex-col gap-4">
           <div className="flex flex-col gap-2">
             <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1">
                  <h4 className="text-slaanesh-gold text-xs font-bold tracking-wider uppercase underline underline-offset-4 decoration-slaanesh-gold/20">Vessel Misalignment</h4>
                  <p className="text-[10px] text-slaanesh-text/60 italic">These platforms do not match the sacred vessel records on IGDB. Map them to allowed vessels.</p>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer w-max">
                    <input 
                      type="checkbox" 
                      checked={applyPlatformMappingsToAll} 
                      onChange={e => setApplyPlatformMappingsToAll(e.target.checked)} 
                      className="accent-slaanesh-accent"
                    />
                    <span className="text-[10px] tracking-widest uppercase font-bold text-slaanesh-gold/80">Apply to all remaining</span>
                  </label>
                  <button 
                    onClick={() => {
                    const headers = ["Game name", "IGDB ID", "Allowed platforms", "Playthrough platform", "Playthrough comment"];
                    const csvContent = [
                      headers.join(","),
                      ...(analysisResults.platformConflicts || []).map((c: any) => [
                        `"${c.gameName.replace(/"/g, '""')}"`,
                        c.igdb_id,
                        `"${c.allowed_platforms.join(', ').replace(/"/g, '""')}"`,
                        `"${c.csv_platform.replace(/"/g, '""')}"`,
                        `"${(c.comment || '').replace(/"/g, '""')}"`
                      ].join(","))
                    ].join("\n");
                    
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement("a");
                    link.href = URL.createObjectURL(blob);
                    link.setAttribute("download", `platform_conflicts_${new Date().toISOString().split('T')[0]}.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="text-[9px] font-bold uppercase tracking-widest text-slaanesh-accent hover:text-slaanesh-gold transition-colors flex items-center gap-1.5 border border-slaanesh-accent/20 px-2 py-1 rounded"
                >
                  <Download size={10} />
                  Export Dissonance CSV
                </button>
                </div>
              </div>
          </div>

          <div className="max-h-80 overflow-y-auto custom-scrollbar flex flex-col gap-3">
            {[...analysisResults.platformConflicts]
              .sort((a, b) => (a.csv_platform || '').localeCompare(b.csv_platform || ''))
              .map((conf: any, idx: number) => {
                const mapKey = `${conf.igdb_id}::${conf.csv_platform}`;
                const currentMapping = platformMappings[mapKey];
                const isMapped = !!currentMapping;
                
                return (
                  <div key={`${conf.igdb_id}-${conf.csv_platform}-${idx}`} className="bg-black/40 border border-slaanesh-gold/10 p-3 rounded-sm flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                       <div className="flex justify-between items-start">
                         <span className="text-[10px] font-bold text-slaanesh-gold uppercase tracking-widest">{conf.gameName}</span>
                         <span className="text-[8px] text-slaanesh-gold/40">IGDB: {conf.igdb_id}</span>
                       </div>
                       <div className="text-[9px] flex items-center gap-2">
                          <span className="text-red-400 font-bold">"{conf.csv_platform}"</span>
                          <ArrowRight size={10} className="text-slaanesh-gold/40" />
                          <span className={isMapped ? "text-slaanesh-accent font-bold" : "text-slaanesh-gold/20 italic"}>
                            {isMapped ? currentMapping : "Select Vessel..."}
                          </span>
                       </div>
                       {conf.comment && (
                         <div className="text-[8px] text-slaanesh-text/40 mt-1 italic line-clamp-1 border-l border-slaanesh-gold/10 pl-2">
                           "{conf.comment}"
                         </div>
                       )}
                    </div>

                  <div className="flex flex-wrap gap-1.5">
                    {conf.allowed_platforms.map((p: string) => (
                      <button
                        key={p}
                        onClick={() => {
                          setPlatformMappings(prev => {
                            const next = { ...prev, [mapKey]: p };
                            if (applyPlatformMappingsToAll) {
                              analysisResults.platformConflicts.forEach((otherConf: any) => {
                                const otherMapKey = `${otherConf.igdb_id}::${otherConf.csv_platform}`;
                                if (!prev[otherMapKey] && otherConf.csv_platform === conf.csv_platform && otherConf.allowed_platforms.includes(p)) {
                                  next[otherMapKey] = p;
                                }
                              });
                            }
                            return next;
                          });
                        }}
                        className={cn(
                          "px-2 py-1 text-[9px] font-bold transition-all rounded-[2px] border",
                          platformMappings[mapKey] === p 
                            ? "bg-slaanesh-accent/20 border-slaanesh-accent text-slaanesh-accent" 
                            : "bg-white/5 border-white/5 text-slaanesh-gold/40 hover:border-slaanesh-gold/20"
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-3 mt-4 border-t border-slaanesh-gold/10 pt-4">
            <button 
              onClick={() => {
                if (analysisResults.ptConflicts?.length > 0) setStep('pt_conflicts');
                else setStep('status_mapping');
              }}
              className="px-6 py-2 border border-slaanesh-gold/20 text-slaanesh-gold/50 hover:text-slaanesh-gold rounded-sm text-[10px] font-bold tracking-wider"
            >
              Back
            </button>
            <button 
              onClick={handleFinishPlatformMapping}
              className="indulge-btn px-8"
            >
              Begin Manifestation
            </button>
          </div>
        </div>
      )}

      {(step === 'importing' || step === 'finished') && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-slaanesh-gold/10 pb-1">
            <span className="text-[10px] font-bold text-slaanesh-gold tracking-wider">{status || 'Transcending...'}</span>
            {isProcessing && <RefreshCw size={12} className="text-slaanesh-accent animate-spin" />}
          </div>
          <div ref={consoleRef} className="bg-black/80 border border-slaanesh-gold/10 rounded-sm h-64 overflow-y-auto p-3 flex flex-col font-mono text-[10px] gap-1.5 custom-scrollbar">
            {log.map((l, i) => (
               <div key={i} className={cn(
                 "border-l-2 pl-2 transition-all",
                 l.startsWith('ERROR') || l.startsWith('FATAL') || l.startsWith('CONFLICTION') ? 'border-red-500 text-red-400' : 
                 l.startsWith('Ritual Result') ? 'border-slaanesh-accent text-slaanesh-accent font-bold' : 
                 'border-slaanesh-gold/20 text-slaanesh-gold/60'
               )}>
                 {l}
               </div>
            ))}
          </div>
          {!isProcessing && (
            <div className="flex justify-end mt-4">
              <button onClick={onClose} className="indulge-btn px-8">Close</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}


function tokenizeVdf(text: string): string[] {
  const tokens: string[] = [];
  const regex = /"([^"\\]*(?:\\.[^"\\]*)*)"|[{}]|([^\s{}"]+)/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match[1] !== undefined) {
      tokens.push(match[1]);
    } else if (match[2] !== undefined) {
      tokens.push(match[2]);
    } else {
      tokens.push(match[0]);
    }
  }
  return tokens;
}

function parseVdfTokens(tokens: string[]): any {
  let index = 0;
  
  function parseObject(): any {
    const obj: any = {};
    while (index < tokens.length) {
      const token = tokens[index];
      if (token === '}') {
        index++;
        return obj;
      }
      if (token === '{') {
        index++;
        continue;
      }
      
      const key = token;
      index++;
      if (index >= tokens.length) break;
      
      const nextToken = tokens[index];
      if (nextToken === '{') {
        index++;
        obj[key] = parseObject();
      } else if (nextToken === '}') {
        obj[key] = "";
      } else {
        obj[key] = nextToken;
        index++;
      }
    }
    return obj;
  }
  
  const root: any = {};
  while (index < tokens.length) {
    const key = tokens[index];
    index++;
    if (index < tokens.length && tokens[index] === '{') {
      index++;
      root[key] = parseObject();
    } else if (index < tokens.length) {
      root[key] = tokens[index];
      index++;
    }
  }
  return root;
}

function findAppsSection(obj: any): any {
  if (!obj || typeof obj !== 'object') return null;
  for (const key of Object.keys(obj)) {
    if (key.toLowerCase() === 'apps') {
      return obj[key];
    }
    const nested = findAppsSection(obj[key]);
    if (nested) return nested;
  }
  return null;
}

function getAppPlaytimeMinutes(appObj: any): number | null {
  if (!appObj || typeof appObj !== 'object') return null;
  for (const k of Object.keys(appObj)) {
    const lower = k.toLowerCase();
    if (lower === 'playtime' || lower === 'playtimeforever' || lower === 'playtime_forever' || lower === 'playtime2') {
      const val = Number(appObj[k]);
      if (!isNaN(val)) return val;
    }
  }
  return null;
}

function getAppLastPlayedTimestamp(appObj: any): number | null {
  if (!appObj || typeof appObj !== 'object') return null;
  for (const k of Object.keys(appObj)) {
    const lower = k.toLowerCase();
    if (lower === 'lastplayed' || lower === 'last_played' || lower === 'lastplay') {
      const val = Number(appObj[k]);
      if (!isNaN(val)) return val;
    }
  }
  return null;
}


function GogImportTab({ onClose, fetchData }: { onClose: () => void, fetchData: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [vdfFile, setVdfFile] = useState<File | null>(null);
  const [step, setStep] = useState<'upload' | 'diff_resolution' | 'game_mapping' | 'status_mapping' | 'platform_mapping' | 'playthrough_merge_resolution' | 'importing' | 'finished'>('upload');
  
  const [status, setStatus] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const consoleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [log]);
  
  const [importItems, setImportItems] = useState<any[]>([]);
  const [conflictItems, setConflictItems] = useState<any[]>([]);
  const [newItems, setNewItems] = useState<any[]>([]);
  const [duplicateCount, setDuplicateCount] = useState<number>(0);
  const [gameIdMappings, setGameIdMappings] = useState<Record<string, number | null>>({});
  
  const [appStatuses, setAppStatuses] = useState<{id: string, label: string, categories: string[], is_positive?: any}[]>([]);
  const [itemsNeedingStatus, setItemsNeedingStatus] = useState<any[]>([]);
  const [statusSelections, setStatusSelections] = useState<Record<string, string>>({});

  const [playthroughUpdates, setPlaythroughUpdates] = useState<any[]>([]);
  const [discardedPlaythroughUpdates, setDiscardedPlaythroughUpdates] = useState<number[]>([]);

  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [platformMappings, setPlatformMappings] = useState<Record<string, string>>({});
  const [applyPlatformMappingsToAll, setApplyPlatformMappingsToAll] = useState(false);
  const [incremental, setIncremental] = useState<boolean>(true);
  const [useImportStatuses, setUseImportStatuses] = useState<boolean>(true);

  const downloadAsCsv = (filename: string, headers: string[], rows: (string | number | null | undefined)[][]) => {
    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    const csvContent = [
      headers.map(escapeCsv).join(','),
      ...rows.map(row => row.map(escapeCsv).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    link.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const res = await fetch('/api/statuses');
        const data = await res.json();
        setAppStatuses(data.game || []);
      } catch (e) {
        console.error('Failed to fetch statuses', e);
      }
    };
    fetchStatuses();
  }, []);

  const addLog = (msg: string) => setLog(prev => [msg, ...prev]);

  const ensureAndPrioritizeImportStatuses = async () => {
    try {
      const res = await fetch('/api/statuses');
      const statusData = await res.json();
      const currentList = statusData.game || [];

      const required = [
        { id: 'import_completed', label: 'Import Completed', categories: ['played'], is_positive: 1 },
        { id: 'import_discarded', label: 'Import Discarded', categories: ['played'], is_positive: 0 },
        { id: 'import_backlog', label: 'Import Backlog', categories: ['playing', 'backlog'], is_positive: null }
      ];

      const listWithNewOnes = [...currentList];

      for (const reqStatus of required) {
        const exists = currentList.find((s: any) => s.id === reqStatus.id);
        if (!exists) {
          await fetch('/api/statuses/game', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: reqStatus.id,
              label: reqStatus.label,
              categories: reqStatus.categories,
              is_positive: reqStatus.is_positive,
              color: '#e0128b',
              sort_order: listWithNewOnes.length
            })
          });
          listWithNewOnes.push({
            id: reqStatus.id,
            label: reqStatus.label,
            categories: reqStatus.categories,
            is_positive: reqStatus.is_positive,
            sort_order: listWithNewOnes.length
          });
        }
      }

      const gogIds = ['import_completed', 'import_discarded', 'import_backlog'];
      const nonGog = listWithNewOnes.filter((s: any) => !gogIds.includes(s.id));
      const sortedGog = required.map(req => listWithNewOnes.find((s: any) => s.id === req.id)).filter(Boolean);
      
      const orderedList = [...sortedGog, ...nonGog];
      const orders: Record<string, number> = {};
      orderedList.forEach((s: any, idx) => {
        orders[s.id] = idx;
      });

      await fetch('/api/statuses/game/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders })
      });

      // Verification check-up step with automatic alignment retry
      addLog('Initiating verification check-up for GOG import statuses...');
      let verified = false;
      
      for (let attempt = 1; attempt <= 3; attempt++) {
        const verifyRes = await fetch('/api/statuses');
        const verifyJson = await verifyRes.json();
        const gamesList = verifyJson.game || [];
        
        const hasCompleted = gamesList.some((s: any) => s.id === 'import_completed');
        const hasDiscarded = gamesList.some((s: any) => s.id === 'import_discarded');
        const hasBacklog = gamesList.some((s: any) => s.id === 'import_backlog');
        
        const top3AreGog = 
          gamesList.length >= 3 &&
          gamesList[0].id === 'import_completed' &&
          gamesList[1].id === 'import_discarded' &&
          gamesList[2].id === 'import_backlog';
          
        if (hasCompleted && hasDiscarded && hasBacklog && top3AreGog) {
          verified = true;
          addLog('GOG Archival Concord: Verification check-up succeeded. Import statuses are correctly initialized and occupy the highest priority.');
          break;
        } else {
          addLog(`Verification check-up warning (Attempt ${attempt}/3): Setup state is out of alignment.`);
          if (!hasCompleted || !hasDiscarded || !hasBacklog) {
            addLog('Determined that one or more GOG import statuses are missing in the database. Re-transmitting creation directives...');
            // Try creating missing statuses again
            for (const reqStatus of required) {
              const exists = gamesList.find((s: any) => s.id === reqStatus.id);
              if (!exists) {
                await fetch('/api/statuses/game', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    id: reqStatus.id,
                    label: reqStatus.label,
                    categories: reqStatus.categories,
                    is_positive: reqStatus.is_positive,
                    color: '#e0128b',
                    sort_order: gamesList.length
                  })
                });
              }
            }
          }
          
          // Try re-applying the priorities/ordering
          addLog('Re-applying absolute status prioritization tree...');
          const updatedGamesListResponse = await fetch('/api/statuses');
          const updatedGamesListJson = await updatedGamesListResponse.json();
          const freshGamesList = updatedGamesListJson.game || [];
          
          const freshNonGog = freshGamesList.filter((s: any) => !gogIds.includes(s.id));
          const freshSortedGog = required.map(req => freshGamesList.find((s: any) => s.id === req.id)).filter(Boolean);
          const freshOrderedList = [...freshSortedGog, ...freshNonGog];
          const correctiveOrders: Record<string, number> = {};
          freshOrderedList.forEach((s: any, idx) => {
            correctiveOrders[s.id] = idx;
          });
          
          await fetch('/api/statuses/game/reorder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orders: correctiveOrders })
          });
        }
      }
      
      if (!verified) {
        addLog('CRITICAL: Verification check-up failed to establish GOG status alignment after 3 attempts. Manual alignment may be required in settings.');
      }

      const finalRefresh = await fetch('/api/statuses');
      const finalRefreshData = await finalRefresh.json();
      setAppStatuses(finalRefreshData.game || []);
    } catch (e) {
      console.error('Failed ensuring and prioritizing GOG statuses', e);
    }
  };

  const handleInitialParse = async () => {
    if (!file) return;
    setIsProcessing(true);
    setStatus('Reading Forbidden Texts...');
    addLog('Loading SQLite engine...');
    if (vdfFile) {
      addLog(`Steam localconfig.vdf detected: ${vdfFile.name} (${Math.round(vdfFile.size / 1024)} KB). Prepared for enrichment.`);
    }

    try {
      const SQL = await initSqlJs({
        locateFile: () => sqlWasmUrl
      });
      
      addLog('Opening database...');
      const buffer = await file.arrayBuffer();
      const db = new SQL.Database(new Uint8Array(buffer));

      addLog('Extracting game data...');
      
      const tablesInfo = db.exec(`SELECT name FROM sqlite_master WHERE type='table'`);
      const tables = tablesInfo[0] ? tablesInfo[0].values.map(v => v[0] as string) : [];
      
      let gamePieceTypeId = 492;
      const gptTable = tables.find(t => t.toLowerCase() === 'gamepiecetypes');
      if (gptTable) {
        try {
          const gptRes = db.exec(`SELECT id FROM ${gptTable} WHERE type = 'originalTitle'`);
          if (gptRes[0] && gptRes[0].values[0] && gptRes[0].values[0][0] !== null) {
            gamePieceTypeId = parseInt(String(gptRes[0].values[0][0])) || 492;
            addLog(`Detected GOG originalTitle piece type ID: ${gamePieceTypeId}`);
          } else {
            const gptRes2 = db.exec(`SELECT id FROM ${gptTable} WHERE type = 'title'`);
            if (gptRes2[0] && gptRes2[0].values[0] && gptRes2[0].values[0][0] !== null) {
              gamePieceTypeId = parseInt(String(gptRes2[0].values[0][0])) || 492;
              addLog(`Detected GOG title piece type ID fallback: ${gamePieceTypeId}`);
            }
          }
        } catch (gptErr) {
          console.error('Failed to resolve dynamic gamePieceTypeId, using 492 fallback', gptErr);
        }
      }
      
      let tagsSubquery = "'' as tags";
      const urtTable = tables.find(t => t.toLowerCase() === 'userreleasetags');
      if (urtTable) {
          const urtInfo = db.exec(`PRAGMA table_info(${urtTable})`);
          if (urtInfo[0]) {
              const columns = urtInfo[0].values.map(v => String(v[1]).toLowerCase());
              if (columns.includes('tag')) {
                  tagsSubquery = `(SELECT GROUP_CONCAT(urt.tag) FROM ${urtTable} urt WHERE urt.releaseKey = gp.releaseKey) as tags`;
              } else if (columns.includes('tagid') && tables.some(t => t.toLowerCase() === 'usertags')) {
                  const utTable = tables.find(t => t.toLowerCase() === 'usertags');
                  tagsSubquery = `(SELECT GROUP_CONCAT(ut.name) FROM ${urtTable} urt JOIN ${utTable} ut ON urt.tagId = ut.id WHERE urt.releaseKey = gp.releaseKey) as tags`;
              }
          }
      } else if (tables.some(t => t.toLowerCase() === 'tags') && tables.some(t => t.toLowerCase() === 'releasetags')) {
         const rtTable = tables.find(t => t.toLowerCase() === 'releasetags');
         const tTable = tables.find(t => t.toLowerCase() === 'tags');
         tagsSubquery = `(SELECT GROUP_CONCAT(t.name) FROM ${rtTable} rt JOIN ${tTable} t ON rt.tagId = t.id WHERE rt.releaseKey = gp.releaseKey) as tags`;
      }

      let gtMinutesColumn = "gt.minutesPlayed";
      let gtLastPlayedColumn = "lpd.lastPlayedDate";
      
      let btTableJoin = "LEFT JOIN Gametimes gt ON gp.releaseKey = gt.releaseKey LEFT JOIN LastPlayedDates lpd ON gp.releaseKey = lpd.releaseKey";
      const gtTable = tables.find(t => t.toLowerCase() === 'gametimes');
      if (gtTable) {
         const gtInfo = db.exec(`PRAGMA table_info(${gtTable})`);
         if (gtInfo[0]) {
             const columns = gtInfo[0].values.map(v => String(v[1]).toLowerCase());
             if (columns.includes('minutes')) gtMinutesColumn = "gt.minutes";
             else if (columns.includes('minutesplayed')) gtMinutesColumn = "gt.minutesPlayed";
             else if (columns.includes('minutesingame')) gtMinutesColumn = "gt.minutesInGame";
             else gtMinutesColumn = "0";
         }
      } else {
         gtMinutesColumn = "0";
      }

      const lpdTable = tables.find(t => t.toLowerCase() === 'lastplayeddates');
      if (lpdTable) {
         const lpdInfo = db.exec(`PRAGMA table_info(${lpdTable})`);
         if (lpdInfo[0]) {
             const columns = lpdInfo[0].values.map(v => String(v[1]).toLowerCase());
             if (columns.includes('lastplayeddate')) gtLastPlayedColumn = "lpd.lastPlayedDate";
             else if (columns.includes('lastplayed')) gtLastPlayedColumn = "lpd.lastPlayed";
             else gtLastPlayedColumn = "NULL";
         }
      } else {
         gtLastPlayedColumn = "NULL";
      }

      btTableJoin = "";
      if (gtTable) btTableJoin += ` LEFT JOIN ${gtTable} gt ON gp.releaseKey = gt.releaseKey`;
      if (lpdTable) {
        // use lpd.gameReleaseKey if it's the column name, actually we should check columns!
        const lpdInfo = db.exec(`PRAGMA table_info(${lpdTable})`);
        const columns = lpdInfo[0] ? lpdInfo[0].values.map(v => String(v[1]).toLowerCase()) : [];
        const joinCol = columns.includes('gamereleasekey') ? 'gameReleaseKey' : 'releaseKey';
        btTableJoin += ` LEFT JOIN ${lpdTable} lpd ON gp.releaseKey = lpd.${joinCol}`;
      }

      const libTable = tables.find(t => t.toLowerCase() === 'libraryreleases');
      const licTable = tables.find(t => t.toLowerCase() === 'licensedreleases');
      
      let libraryConstraint = "";
      if (libTable && licTable) {
        const licInfo = db.exec(`PRAGMA table_info(${licTable})`);
        const licCols = licInfo[0] ? licInfo[0].values.map(v => String(v[1]).toLowerCase()) : [];
        
        const libInfo = db.exec(`PRAGMA table_info(${libTable})`);
        const libCols = libInfo[0] ? libInfo[0].values.map(v => String(v[1]).toLowerCase()) : [];
        
        const hasLibraryId = libCols.includes('libraryid') && licCols.includes('libraryid');
        const hasIsOwned = licCols.includes('isowned');
        
        if (hasLibraryId && hasIsOwned) {
          const libIdCol = libInfo[0].values.find(v => String(v[1]).toLowerCase() === 'libraryid')![1] as string;
          const licIdCol = licInfo[0].values.find(v => String(v[1]).toLowerCase() === 'libraryid')![1] as string;
          const isOwnedCol = licInfo[0].values.find(v => String(v[1]).toLowerCase() === 'isowned')![1] as string;
          
          libraryConstraint = `AND gp.releaseKey IN (
            SELECT lr.releaseKey 
            FROM ${libTable} lr 
            JOIN ${licTable} lic ON lr.${libIdCol} = lic.${licIdCol} 
            WHERE lic.${isOwnedCol} = 1
          )`;
        } else {
          libraryConstraint = `AND gp.releaseKey IN (SELECT releaseKey FROM ${libTable})`;
        }
      } else if (libTable) {
        libraryConstraint = `AND gp.releaseKey IN (SELECT releaseKey FROM ${libTable})`;
      }

      const res = db.exec(`
        SELECT 
          gp.value as gameData, 
          gp.releaseKey, 
          ${gtMinutesColumn} as playtimeMinutes, 
          ${gtLastPlayedColumn} as lastPlayedDate,
          ${tagsSubquery}
        FROM GamePieces gp
        ${btTableJoin}
        WHERE gp.gamePieceTypeId = ${gamePieceTypeId}
        ${libraryConstraint}
      `);

      if (res.length === 0) throw new Error('Void database. No records found.');

      const rows = res[0].values;
      const rawItems: any[] = [];

      let vdfApps: any = null;
      if (vdfFile) {
        addLog('Parsing Steam localconfig.vdf file...');
        try {
          const vdfText = await vdfFile.text();
          const tokens = tokenizeVdf(vdfText);
          const parsed = parseVdfTokens(tokens);
          vdfApps = findAppsSection(parsed);
          if (vdfApps) {
            addLog(`Steam localconfig.vdf parsed successfully! Found apps data.`);
          } else {
            addLog('Steam localconfig.vdf parsed, but "apps" section was not found.');
          }
        } catch (vdfErr: any) {
          addLog(`Warning: Failed to parse localconfig.vdf: ${vdfErr.message}`);
        }
      }

      addLog('Scanning GamePieces for cross-store release references...');
      const releaseKeyToReleases = new Map<string, string[]>();
      try {
        const releasesRes = db.exec(`SELECT releaseKey, value FROM GamePieces WHERE value LIKE '%"releases"%'`);
        if (releasesRes.length > 0) {
          for (const row of releasesRes[0].values) {
            const rKey = String(row[0]);
            try {
              const obj = JSON.parse(String(row[1]));
              if (obj && Array.isArray(obj.releases)) {
                const filteredReleases = obj.releases.filter((r: any) => {
                  const s = String(r);
                  return s.startsWith('steam_') || s.startsWith('gog_') || s.startsWith('epic_');
                });
                releaseKeyToReleases.set(rKey, filteredReleases);
              }
            } catch (e) {}
          }
        }
        addLog(`Indexed ${releaseKeyToReleases.size} cross-store release relations.`);
      } catch (e: any) {
        addLog(`Warning: Failed to fetch releases mapping: ${e.message}`);
      }

      for (const row of rows) {
        const parsedData = row[0] ? JSON.parse(String(row[0])) : {};
        let title = parsedData.title;
        if (!title || title === 'null' || String(title).trim() === '') {
           title = String(row[1]).startsWith('gog_') ? 'GOG ' + String(row[1]).substring(4) : String(row[1]);
        }
        const releaseKey = String(row[1]);
        const playtimeMinutesDefault = Number(row[2] || 0);
        const lastPlayed = row[3];
        const tagsRaw = row[4] ? String(row[4]).split(',') : [];

        const match = releaseKey.match(/^([a-z]+)_([\w-]+)$/);
        if (!match) continue;

        const provider = match[1];
        const externalId = match[2];

        if (['steam', 'gog', 'epic'].includes(provider)) {
          let dateStr: string | null = null;
          let playtimeMinutes = playtimeMinutesDefault;
          
          let gogLastPlayedDate: string | null = null;
          if (lastPlayed && String(lastPlayed).trim() !== '') {
            try {
              const parsedNumber = Number(lastPlayed);
              if (!isNaN(parsedNumber) && parsedNumber > 0) {
                 if (parsedNumber > 2000000000) { 
                    gogLastPlayedDate = formatLocalDate(new Date(parsedNumber));
                 } else {
                    gogLastPlayedDate = formatLocalDate(new Date(parsedNumber * 1000));
                 }
              } else {
                 const maybeDate = new Date(String(lastPlayed));
                 if (!isNaN(maybeDate.getTime())) {
                    gogLastPlayedDate = formatLocalDate(maybeDate);
                 }
              }
            } catch (e) {}
          }

          if (provider === 'steam' && vdfFile) {
            if (vdfApps && vdfApps[externalId]) {
              const appObj = vdfApps[externalId];
              const parsedPt = getAppPlaytimeMinutes(appObj);
              const vdfPt = parsedPt !== null ? parsedPt : 0;
              playtimeMinutes = playtimeMinutesDefault + vdfPt;
              
              const lastPlSecs = getAppLastPlayedTimestamp(appObj);
              let vdfDateStr: string | null = null;
              if (lastPlSecs && lastPlSecs > 0) {
                try {
                  vdfDateStr = formatLocalDate(new Date(lastPlSecs * 1000));
                } catch (e) {}
              }

              if (vdfDateStr && gogLastPlayedDate) {
                dateStr = vdfDateStr > gogLastPlayedDate ? vdfDateStr : gogLastPlayedDate;
              } else {
                dateStr = vdfDateStr || gogLastPlayedDate;
              }
            } else {
              playtimeMinutes = playtimeMinutesDefault;
              dateStr = gogLastPlayedDate;
            }
          } else {
            playtimeMinutes = playtimeMinutesDefault;
            dateStr = gogLastPlayedDate;
          }
          
          let pre_selected_status_id = null;
          if (tagsRaw.length > 0) {
            for (const rawTag of tagsRaw) {
              const tagName = rawTag.trim().toLowerCase();
              if (!tagName) continue;
              const statusMatch = appStatuses.find(s => s.label.toLowerCase() === tagName);
              if (statusMatch) {
                  pre_selected_status_id = statusMatch.id;
                  break;
              }
            }
          }

          rawItems.push({
            title,
            externalId,
            provider,
            releaseKey,
            playtimeMinutes,
            lastPlayedDate: dateStr,
            pre_selected_status_id,
            tags: tagsRaw
          });
        }
      }

      // Group keys that are listed together inside game's releases GamePiece
      const parent: Record<string, string> = {};
      const activeReleaseKeys = new Set<string>();
      for (const item of rawItems) {
        parent[item.releaseKey] = item.releaseKey;
        activeReleaseKeys.add(item.releaseKey);
      }

      function findRoot(rk: string): string {
        if (parent[rk] === undefined) return rk;
        if (parent[rk] === rk) return rk;
        parent[rk] = findRoot(parent[rk]);
        return parent[rk];
      }

      function unionRoots(rk1: string, rk2: string) {
        const root1 = findRoot(rk1);
        const root2 = findRoot(rk2);
        if (root1 !== root2) {
          parent[root2] = root1;
        }
      }

      for (const item of rawItems) {
        const rKey = item.releaseKey;
        const rels = releaseKeyToReleases.get(rKey);
        if (rels) {
          for (const rel of rels) {
            if (activeReleaseKeys.has(rel)) {
              unionRoots(rKey, rel);
            }
          }
        }
      }

      const groups: Record<string, any[]> = {};
      for (const item of rawItems) {
        const root = findRoot(item.releaseKey);
        if (!groups[root]) {
          groups[root] = [];
        }
        groups[root].push(item);
      }

      const items: any[] = [];
      for (const rootKey of Object.keys(groups)) {
        const grouped = groups[rootKey];
        
        // Find best primary metadata/title provider
        let primaryItem = grouped.find(it => it.provider === 'gog');
        if (!primaryItem) primaryItem = grouped.find(it => it.provider === 'steam');
        if (!primaryItem) primaryItem = grouped[0];

        const stores = grouped.map(it => ({
          provider: it.provider,
          externalId: it.externalId,
          releaseKey: it.releaseKey,
          playtimeMinutes: it.playtimeMinutes,
          lastPlayedDate: it.lastPlayedDate
        }));

        // Playtime is sum
        let totalPlaytime: number | null = null;
        let anyPlaytimeVal = false;
        for (const it of grouped) {
          if (it.playtimeMinutes !== null && it.playtimeMinutes !== undefined) {
            anyPlaytimeVal = true;
            totalPlaytime = (totalPlaytime || 0) + it.playtimeMinutes;
          }
        }
        if (!anyPlaytimeVal) {
          totalPlaytime = null;
        }

        // Play date: latest / most current date
        let latestDate: string | null = null;
        for (const it of grouped) {
          if (it.lastPlayedDate) {
            if (!latestDate || it.lastPlayedDate > latestDate) {
              latestDate = it.lastPlayedDate;
            }
          }
        }

        let pre_selected_status_id = null;
        for (const it of grouped) {
          if (it.pre_selected_status_id) {
            pre_selected_status_id = it.pre_selected_status_id;
            break;
          }
        }
        
        const tagsSet = new Set<string>();
        for (const it of grouped) {
          if (it.tags) {
            it.tags.forEach((t: string) => tagsSet.add(t));
          }
        }

        // Pre-compute IGDB match UIDs
        const matchUidsSet = new Set<string>();
        const matchUids: { uid: string; category: number }[] = [];

        const addMatchUid = (category: number, uid: string) => {
          const k = `${category}::${uid}`;
          if (!matchUidsSet.has(k)) {
            matchUidsSet.add(k);
            matchUids.push({ uid, category });
          }
        };

        for (const s of stores) {
          if (s.provider === 'gog') {
            addMatchUid(5, s.externalId);
          } else if (s.provider === 'steam') {
            addMatchUid(1, s.externalId);
          } else if (s.provider === 'epic') {
            const epicRels = releaseKeyToReleases.get(s.releaseKey) || [];
            for (const r of epicRels) {
              const matchedRel = r.match(/^([a-z]+)_([\w-]+)$/);
              if (matchedRel) {
                const prov = matchedRel[1];
                const extId = matchedRel[2];
                if (prov === 'steam') {
                  addMatchUid(1, extId);
                } else if (prov === 'gog') {
                  addMatchUid(5, extId);
                }
              }
            }
          }
        }

        const ownedStores = Array.from(new Set(stores.map(s => s.provider)));

        items.push({
          title: primaryItem.title,
          provider: primaryItem.provider,
          externalId: primaryItem.externalId,
          releaseKey: primaryItem.releaseKey,
          playtimeMinutes: totalPlaytime,
          lastPlayedDate: latestDate,
          pre_selected_status_id,
          tags: Array.from(tagsSet),
          stores,
          matchUids,
          ownedStores
        });
      }

      if (incremental) {
        addLog(`Discovered ${items.length} consolidated games. Performing differential analysis...`);
        setStatus('Analyzing import history...');

        const diffRes = await fetch('/api/import/gog/diff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items })
        });

        if (!diffRes.ok) throw new Error(await diffRes.text());
        const diffData = await diffRes.json();

        if (diffData.hasReference && diffData.conflictItems && diffData.conflictItems.length > 0) {
          addLog(`${diffData.conflictItems.length} games have updated playtimes/dates. ${diffData.duplicateCount} duplicates bypassed.`);
          setConflictItems(diffData.conflictItems.map((c: any) => ({
            ...c,
            conflictResolution: c.hasPlaythroughs ? 'update_latest' : 'new_playthrough',
            conflictStatusId: ''
          })));
          setNewItems(diffData.newItems);
          setDuplicateCount(diffData.duplicateCount);
          setStatus('History Dissociancy Detected');
          setIsProcessing(false);
          setStep('diff_resolution');
        } else {
          const combined = [...diffData.newItems, ...diffData.conflictItems];
          if (combined.length === 0) {
            addLog("All games in this file already reside within our archives. Nothing to import.");
            setStatus("No new modifications found.");
            setIsProcessing(false);
            setStep('finished');
            return;
          }
          addLog(`Bypassed ${diffData.duplicateCount} unchanged duplicates. Proceeding with ${combined.length} alignments.`);
          handleProceedWithItems(combined);
        }
      } else {
        addLog(`Discovered ${items.length} consolidated games. Proceeding with direct full import alignment...`);
        handleProceedWithItems(items);
      }
    } catch (err: any) {
      addLog(`CORRUPTION: ${err.message}`);
      setStatus('Initial Parse Failed');
      setIsProcessing(false);
    }
  };

  const handleFinishDiffResolution = () => {
    const combined = [...newItems, ...conflictItems];
    handleProceedWithItems(combined);
  };

  const handleProceedWithItems = async (itemsToProceed: any[]) => {
    setIsProcessing(true);
    setStatus('Matching with IGDB...');
    addLog(`Consulting the Oracle (IGDB) for ${itemsToProceed.length} games...`);
    try {
      const matchRes = await fetch('/api/import/gog/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsToProceed })
      });
      
      if (!matchRes.ok) throw new Error(await matchRes.text());
      const data = await matchRes.json();
      
      setImportItems(data.items);
      
      // Check if there are unmapped items
      const unmapped = data.items.filter((it: any) => !it.igdb_id);
      if (unmapped.length > 0) {
        addLog(`${unmapped.length} games emerged from the shadow, unmapped.`);
        setStep('game_mapping');
      } else {
         // Proceed to check statuses
        handleAnalyzeGog(data.items);
      }
    } catch (err: any) {
      addLog(`CORRUPTION: ${err.message}`);
      setStatus('IGDB Match Failed');
      setIsProcessing(false);
    }
  };

  const handleAnalyzeGog = async (itemsToCheck: any[]) => {
    setIsProcessing(true);
    setStatus('Analyzing Alignments...');

    if (useImportStatuses) {
      addLog('Ensuring dedicated GOG statuses exist and are prioritized...');
      try {
        await ensureAndPrioritizeImportStatuses();
      } catch (err) {
        addLog(`Warning: Failed to auto-create and prioritize statuses: ${err}`);
      }
    }

    addLog('Checking if any imported playthroughs require a "played" status and validating vessels...');
    try {
      const res = await fetch('/api/import/gog/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsToCheck })
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setAnalysisResults(data);
      setPlaythroughUpdates(data.playthroughUpdates || []);
      setDiscardedPlaythroughUpdates([]);
      
      const updatedStatuses = (data.gameStatuses && data.gameStatuses.length > 0) ? data.gameStatuses : appStatuses;
      if (data.gameStatuses && data.gameStatuses.length > 0) {
        setAppStatuses(data.gameStatuses);
      }

      if (data.itemsNeedingStatus && data.itemsNeedingStatus.length > 0) {
        setItemsNeedingStatus(data.itemsNeedingStatus);
        
        const playedStatuses = updatedStatuses.filter((s: any) => s.categories && s.categories.includes('played'));
        const unplayedStatuses = updatedStatuses.filter((s: any) => !s.categories || !s.categories.includes('played'));
        const defaultPlayedId = playedStatuses.length > 0 ? playedStatuses[0].id : '';
        const defaultUnplayedId = unplayedStatuses.length > 0 ? unplayedStatuses[0].id : '';
        
        const initialSelections: Record<string, string> = {};
        data.itemsNeedingStatus.forEach((it: any) => {
          if (it.conflictType === 'needs_played') {
            const ptMinutes = it.playtimeMinutes || 0;
            if (ptMinutes <= 120) {
              const matched = playedStatuses.find((s: any) => !s.is_positive || s.is_positive === 0);
              initialSelections[it.externalId] = matched ? matched.id : defaultPlayedId;
            } else {
              const matched = playedStatuses.find((s: any) => s.is_positive === 1 || s.is_positive === true);
              initialSelections[it.externalId] = matched ? matched.id : defaultPlayedId;
            }
          } else {
            initialSelections[it.externalId] = defaultUnplayedId;
          }
        });
        setStatusSelections(initialSelections);
        
        addLog(`${data.itemsNeedingStatus.length} games require status alignment.`);
        setStep('status_mapping');
      } else if (data.platformConflicts && data.platformConflicts.length > 0) {
        addLog(`${data.platformConflicts.length} games require vessel mapping.`);
        setStep('platform_mapping');
      } else if (data.playthroughUpdates && data.playthroughUpdates.length > 0) {
        addLog(`${data.playthroughUpdates.length} existing playthroughs would be updated.`);
        setStep('playthrough_merge_resolution');
      } else {
        addLog('All aligned. Proceeding to manifestation...');
        handleExecute(itemsToCheck, {});
      }
    } catch (err: any) {
      addLog(`ANALYSIS FAILED: ${err.message}`);
      setStep('finished');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinishPlatformMapping = () => {
    if (!analysisResults) return;

    const remaining = analysisResults.platformConflicts.filter((conf: any) => {
      const mapped = platformMappings[`${conf.igdb_id}::${conf.csv_platform}`];
      if (!mapped) return true;

      // Validate against this specific game's metadata
      let allowed = [];
      if (analysisResults.metadata) {
         const m = analysisResults.metadata.find((x: any) => x[0] === conf.igdb_id);
         if (m) allowed = m[1].platforms?.map((p: any) => p.name) || [];
         if (allowed.length === 0) allowed = conf.allowed_platforms; // Fallback
      }
      
      return !allowed.includes(mapped);
    });

    if (remaining.length === 0) {
      const gogPlatformMappings: Record<string, string> = {};
      Object.entries(platformMappings).forEach(([k, v]) => {
          const id = k.split('::')[0];
          gogPlatformMappings[id] = v as string;
      });
      if (playthroughUpdates && playthroughUpdates.length > 0) {
        setStep('playthrough_merge_resolution');
      } else {
        handleExecute(importItems, gogPlatformMappings);
      }
    } else {
      setAnalysisResults({
        ...analysisResults,
        platformConflicts: remaining
      });
      addLog(`${analysisResults.platformConflicts.length - remaining.length} vessels aligned. ${remaining.length} remain erratic.`);
    }
  };

  const handleExecute = async (itemsToExecute: any[], platformMappings: Record<string, string>, discardedPTList?: number[]) => {
    setIsProcessing(true);
    setStep('importing');
    setStatus('Executing Import Ritual...');
    setLog([]);
    addLog('Commencing manifestation...');

    let isPolling = true;
    const pollProgress = async () => {
      try {
        const pRes = await fetch('/api/import/gog/progress');
        if (pRes.ok) {
          const pData = await pRes.json();
          if (pData.status) {
            setStatus(pData.status);
          }
          if (pData.logs && Array.isArray(pData.logs)) {
            setLog(pData.logs);
          }
        }
      } catch (e) {}
    };

    const intervalId = setInterval(() => {
      if (isPolling) pollProgress();
    }, 450);

    try {
      const res = await fetch('/api/import/gog/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          items: itemsToExecute, 
          platformMappings, 
          discardedPlaythroughUpdates: discardedPTList !== undefined ? discardedPTList : discardedPlaythroughUpdates
        })
      });
      
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      
      if (data.success) {
        setStatus('Import Complete.');
        addLog('Ritual completed successfully.');
      } else {
        addLog(`ERROR: ${data.error}`);
      }
    } catch (e: any) {
      addLog(`FATAL: ${e.message}`);
      setStatus('Manifestation Failed');
    } finally {
      isPolling = false;
      clearInterval(intervalId);
      await pollProgress();
      setIsProcessing(false);
      setStep('finished');
      fetchData();
    }
  };

  const handleSkipUnmappedAndExecute = () => {
    const finalizedItems = importItems.map(item => {
      // Use mapped igdb_id if originally missing
      if (!item.igdb_id && gameIdMappings[item.externalId]) {
        return { ...item, igdb_id: gameIdMappings[item.externalId] };
      }
      return item;
    });

    setImportItems(finalizedItems);
    handleAnalyzeGog(finalizedItems);
  };

  return (
    <div className="flex flex-col gap-6 p-2">
      {step === 'upload' && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-xs tracking-wide font-bold text-slaanesh-gold/60">
              Sanctuary Database (galaxy-2.0.db)
            </label>
            <div className="relative group">
              <input 
                type="file" 
                accept=".db"
                onChange={e => setFile(e.target.files?.[0] || null)}
                className="w-full bg-black/40 border border-slaanesh-gold/20 rounded-sm px-4 py-4 text-sm focus:border-slaanesh-accent outline-none transition-all file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border-0 file:text-xs file:font-bold file:bg-slaanesh-accent/20 file:text-slaanesh-accent hover:file:bg-slaanesh-accent/30"
                disabled={isProcessing}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <label className="text-xs tracking-wide font-bold text-slaanesh-gold/60">
                Steam configuration (localconfig.vdf)
              </label>
              <span className="text-[10px] text-slaanesh-accent/60 font-mono italic">Optional</span>
            </div>
            <div className="relative group">
              <input 
                type="file" 
                accept=".vdf"
                onChange={e => setVdfFile(e.target.files?.[0] || null)}
                className="w-full bg-black/40 border border-slaanesh-gold/20 rounded-sm px-4 py-4 text-sm focus:border-slaanesh-accent outline-none transition-all file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border-0 file:text-xs file:font-bold file:bg-slaanesh-accent/20 file:text-slaanesh-accent hover:file:bg-slaanesh-accent/30"
                disabled={isProcessing}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2 mt-2">
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={incremental} 
                  onChange={e => setIncremental(e.target.checked)} 
                  className="accent-slaanesh-accent rounded-[2px]"
                  disabled={isProcessing}
                />
                <span className="text-[10px] tracking-wider font-bold text-slaanesh-gold/85">
                  Incremental Import (skip unmodified games, resolve changes)
                </span>
              </label>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={useImportStatuses} 
                  onChange={e => setUseImportStatuses(e.target.checked)} 
                  className="accent-slaanesh-accent rounded-[2px]"
                  disabled={isProcessing}
                />
                <span className="text-[10px] tracking-wider font-bold text-slaanesh-gold/85">
                  Use import statuses (automatically assigns dedicated import statuses instead of generic defaults)
                </span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4 border-t border-slaanesh-gold/10 pt-6">
            <button 
              onClick={onClose}
              className="px-6 py-2 border border-slaanesh-gold/20 text-slaanesh-gold/50 hover:text-slaanesh-gold hover:border-slaanesh-gold transition-all rounded-sm text-[10px] font-bold tracking-wider"
            >
              Retreat
            </button>
            <button 
              onClick={handleInitialParse}
              disabled={!file || isProcessing}
              className="indulge-btn px-8 py-2 text-[10px] disabled:opacity-30 tracking-wider"
            >
              Parse Database
            </button>
          </div>
        </>
      )}

      {step === 'diff_resolution' && (
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-start gap-4">
            <div className="flex flex-col gap-1 text-left">
              <h4 className="text-sm font-bold text-slaanesh-gold tracking-widest uppercase italic">Differential Alignments</h4>
              <p className="text-xs text-slaanesh-gold/60 leading-relaxed">
                We detected <span className="text-slaanesh-accent font-bold">{conflictItems.length} alignment(s)</span> with newer playtimes/last played dates compared to your previous import. Choose how to merge each drift.
              </p>
              {duplicateCount > 0 && (
                <p className="text-[10px] text-green-400/80">
                  🌱 {duplicateCount} exact matching records were automatically bypassed.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                downloadAsCsv(
                  'gog_import_differential_alignments.csv',
                  [
                    "Game Title",
                    "IGDB ID",
                    "Current Status",
                    "Historical Playtime (Minutes)",
                    "Historical Last Played",
                    "GOG Playtime (Minutes)",
                    "GOG Last Played",
                    "Resolution Choice"
                  ],
                  conflictItems.map(item => [
                    item.igdb_name || item.title || '',
                    item.igdb_id || '',
                    appStatuses.find(s => s.id === item.localStatusId)?.label || 'None',
                    item.lastImportedPlaytime || 0,
                    item.lastImportedDate || 'Never',
                    item.playtimeMinutes || 0,
                    item.lastPlayedDate || 'Never',
                    item.conflictResolution === 'update_latest' 
                      ? 'Update Latest Playthrough' 
                      : item.conflictResolution === 'new_playthrough' 
                        ? 'New Playthrough' 
                        : 'Discard Update'
                  ])
                );
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slaanesh-gold/20 hover:border-slaanesh-accent text-slaanesh-gold hover:text-white bg-black/40 hover:bg-slaanesh-accent/10 transition-all rounded-[2px] font-bold text-[9px] uppercase tracking-wider shrink-0"
              title="Download alignments details as CSV"
            >
              <Download size={11} className="text-slaanesh-accent" />
              Download CSV
            </button>
          </div>

          <div className="bg-black/20 border border-slaanesh-gold/10 p-3 rounded-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <span className="text-[10px] font-bold text-slaanesh-gold/60 uppercase tracking-wider">Set resolution for all:</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setConflictItems(prev => prev.map(c => ({ ...c, conflictResolution: 'update_latest' })));
                }}
                className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-slaanesh-gold/20 text-slaanesh-gold text-[9px] font-bold uppercase rounded-[2px]"
              >
                Update Latest Playthrough
              </button>
              <button
                type="button"
                onClick={() => {
                  setConflictItems(prev => prev.map(c => ({ ...c, conflictResolution: 'new_playthrough' })));
                }}
                className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-slaanesh-gold/20 text-slaanesh-gold text-[9px] font-bold uppercase rounded-[2px]"
              >
                Create New Playthrough
              </button>
              <button
                type="button"
                onClick={() => {
                  setConflictItems(prev => prev.map(c => ({ ...c, conflictResolution: 'discard' })));
                }}
                className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-slaanesh-gold/20 text-slaanesh-gold text-[9px] font-bold uppercase rounded-[2px]"
              >
                Discard GOG Update
              </button>
            </div>
          </div>
          
          <div className="max-h-80 overflow-y-auto custom-scrollbar flex flex-col gap-4 pr-1">
            {conflictItems.map((game: any, idx: number) => {
              const playedStatuses = appStatuses.filter(s => s.categories && s.categories.includes('played'));
              const formatMins = (mins: number) => {
                const hrs = Math.floor(mins / 60);
                const m = Math.round(mins % 60);
                return hrs > 0 ? `${hrs}h ${m}m` : `${m}m`;
              };
              
              const historyTimeStr = formatMins(game.lastImportedPlaytime || 0);
              const gogTimeStr = formatMins(game.playtimeMinutes || 0);

              return (
                <div key={game.releaseKey} className="bg-black/40 border border-slaanesh-gold/20 p-3 rounded-sm flex flex-col gap-3">
                  <div className="flex justify-between items-start border-b border-white/5 pb-2">
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-bold text-slaanesh-gold">{game.igdb_name || game.title}</span>
                      <span className="text-[9px] text-slaanesh-text/50">
                        History: {historyTimeStr} ({game.lastImportedDate || 'Never'}) | GOG: {gogTimeStr} ({game.lastPlayedDate || 'Never'})
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {game.hasPlaythroughs ? (
                        <label className={cn(
                          "flex items-center gap-2 p-2 rounded-sm border cursor-pointer transition-all",
                          game.conflictResolution === 'update_latest' 
                            ? "bg-slaanesh-accent/10 border-slaanesh-accent hover:border-slaanesh-accent text-white" 
                            : "bg-white/5 border-white/5 text-slaanesh-gold/50 hover:border-slaanesh-gold/10"
                        )}>
                          <input
                            type="radio"
                            name={`resolution-${game.releaseKey}`}
                            checked={game.conflictResolution === 'update_latest'}
                            onChange={() => {
                              setConflictItems(prev => prev.map((c, i) => i === idx ? { ...c, conflictResolution: 'update_latest' } : c));
                            }}
                            className="accent-slaanesh-accent"
                          />
                          <div className="flex flex-col text-left">
                            <span className="text-[10px] font-bold">Update Latest</span>
                            <span className="text-[8px] opacity-60">Overwrites latest playthrough data</span>
                          </div>
                        </label>
                      ) : null}

                      <label className={cn(
                        "flex items-center gap-2 p-2 rounded-sm border cursor-pointer transition-all",
                        game.conflictResolution === 'new_playthrough' 
                          ? "bg-slaanesh-accent/10 border-slaanesh-accent hover:border-slaanesh-accent text-white" 
                          : "bg-white/5 border-white/5 text-slaanesh-gold/50 hover:border-slaanesh-gold/10"
                      )}>
                        <input
                          type="radio"
                          name={`resolution-${game.releaseKey}`}
                          checked={game.conflictResolution === 'new_playthrough'}
                          onChange={() => {
                            setConflictItems(prev => prev.map((c, i) => i === idx ? { ...c, conflictResolution: 'new_playthrough' } : c));
                          }}
                          className="accent-slaanesh-accent"
                        />
                        <div className="flex flex-col text-left">
                          <span className="text-[10px] font-bold">New Playthrough</span>
                          <span className="text-[8px] opacity-60">Appends fresh playthrough</span>
                        </div>
                      </label>

                      <label className={cn(
                        "flex items-center gap-2 p-2 rounded-sm border cursor-pointer transition-all",
                        game.conflictResolution === 'discard' 
                          ? "bg-slaanesh-accent/10 border-slaanesh-accent hover:border-slaanesh-accent text-white" 
                          : "bg-white/5 border-white/5 text-slaanesh-gold/50 hover:border-slaanesh-gold/10"
                      )}>
                        <input
                          type="radio"
                          name={`resolution-${game.releaseKey}`}
                          checked={game.conflictResolution === 'discard'}
                          onChange={() => {
                            setConflictItems(prev => prev.map((c, i) => i === idx ? { ...c, conflictResolution: 'discard' } : c));
                          }}
                          className="accent-slaanesh-accent"
                        />
                        <div className="flex flex-col text-left">
                          <span className="text-[10px] font-bold">Discard GOG Update</span>
                          <span className="text-[8px] opacity-60">Leaves existing playthrough as-is</span>
                        </div>
                      </label>
                    </div>

                    {game.conflictResolution === 'new_playthrough' && (
                      <div className="flex items-center gap-2 border-t border-white/5 pt-2 text-left">
                        <span className="text-[9px] text-slaanesh-gold/60 font-medium">Select status for new playthrough:</span>
                        <select
                          value={game.conflictStatusId || ''}
                          onChange={e => {
                            const val = e.target.value;
                            setConflictItems(prev => prev.map((c, i) => i === idx ? { ...c, conflictStatusId: val } : c));
                          }}
                          className="bg-black border border-slaanesh-gold/30 text-[9px] text-slaanesh-gold px-2 py-1 rounded-sm focus:border-slaanesh-accent outline-none"
                        >
                          <option value="">(Keep current: {appStatuses.find(s => s.id === game.localStatusId)?.label || 'none'})</option>
                          {playedStatuses.map(s => (
                            <option key={s.id} value={s.id}>{s.label}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-3 mt-4 border-t border-slaanesh-gold/10 pt-6">
            <button 
              type="button"
              onClick={() => {
                fetch('/api/import/gog/cancel', { method: 'POST' }).then(() => {
                  setStep('upload');
                });
              }} 
              className="slaanesh-btn-secondary"
            >
              Cancel Import
            </button>
            <button 
              type="button"
              onClick={handleFinishDiffResolution}
              className="indulge-btn px-8"
            >
              Continue from Diff
            </button>
          </div>
        </div>
      )}

      {step === 'game_mapping' && (
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-start gap-4">
            <div className="flex flex-col gap-1 text-left">
              <h4 className="text-sm font-bold text-slaanesh-gold tracking-widest uppercase italic">Unknown Manifestations</h4>
              <p className="text-xs text-slaanesh-gold/60 leading-relaxed">
                These spirits hover beyond the archives. Search IGDB to align them, or they shall be abandoned to the void.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                downloadAsCsv(
                  'gog_import_unknown_games.csv',
                  [
                    "GOG/Store Title",
                    "External ID",
                    "Provider",
                    "Playtime (Minutes)",
                    "Last Played Date",
                    "Mapped IGDB ID"
                  ],
                  importItems.filter(g => !g.igdb_id).map(item => [
                    item.title || '',
                    item.externalId || '',
                    item.provider || '',
                    item.playtimeMinutes || 0,
                    item.lastPlayedDate || 'Never',
                    gameIdMappings[item.externalId] || 'Unmapped'
                  ])
                );
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slaanesh-gold/20 hover:border-slaanesh-accent text-slaanesh-gold hover:text-white bg-black/40 hover:bg-slaanesh-accent/10 transition-all rounded-[2px] font-bold text-[9px] uppercase tracking-wider shrink-0"
              title="Download unknown games details as CSV"
            >
              <Download size={11} className="text-slaanesh-accent" />
              Download CSV
            </button>
          </div>
          
          <div className="max-h-[50vh] overflow-y-auto custom-scrollbar flex flex-col gap-4">
            {importItems.filter(g => !g.igdb_id).map((game: any) => (
              <div key={game.externalId} className="bg-black/40 border border-slaanesh-gold/20 p-3 rounded-sm flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slaanesh-gold">{game.title}</span>
                    <span className="text-[10px] text-slaanesh-text/40 italic">Provider: {game.provider}</span>
                  </div>
                  {gameIdMappings[game.externalId] ? (
                    <span className="text-[10px] font-bold text-slaanesh-accent flex items-center gap-1">
                      <CheckCircle size={12} /> Mapped to Ritual
                    </span>
                  ) : (
                    <span className="text-[8px] font-bold uppercase text-slaanesh-gold/60 animate-pulse">Unmapped (Will be Skipped)</span>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder={"Search IGDB for " + (game.title || 'Unknown') + "..."}
                      defaultValue={(game.title || '').replace(/[\u2122\u00A9\u00AE]/g, '')}
                      className="flex-1 bg-white/5 border border-white/10 p-2 text-[10px] text-white rounded-sm placeholder:text-slaanesh-gold/20 outline-none focus:border-slaanesh-gold/40 transition-colors"
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter') {
                          const target = e.currentTarget;
                          const q = target.value;
                          if (!q) return;
                          target.disabled = true;
                          try {
                            const params = new URLSearchParams({ q });
                            const res = await fetch('/api/search?' + params.toString());
                            const results = await res.json();
                            const container = target.parentElement?.nextElementSibling as HTMLDivElement;
                            if (container) {
                              container.innerHTML = '';
                              if (!Array.isArray(results)) {
                                const errMsg = results?.error || 'An error occurred during search';
                                container.innerHTML = `<div class="text-[10px] text-red-400 font-bold p-1">${errMsg}</div>`;
                              } else if (results.length === 0) {
                                container.innerHTML = '<div class="text-[10px] text-slaanesh-gold/40">No results found.</div>';
                              } else {
                                results.slice(0, 5).forEach((r: any) => {
                                  const btn = document.createElement('button');
                                  btn.className = "text-left text-[10px] text-slaanesh-text hover:text-slaanesh-gold bg-white/5 hover:bg-white/10 p-1.5 rounded-sm border border-transparent hover:border-slaanesh-gold/20 transition-all";
                                  btn.innerHTML = `<strong>${r.name}</strong> ${r.first_release_date ? `(${new Date(r.first_release_date * 1000).getFullYear()})` : ''}`;
                                  btn.onclick = () => {
                                    setGameIdMappings(prev => ({ ...prev, [game.externalId]: r.id }));
                                    target.value = r.name;
                                    container.innerHTML = '';
                                  };
                                  container.appendChild(btn);
                                });
                              }
                            }
                          } catch (e) {
                            console.error(e);
                          } finally {
                            target.disabled = false;
                          }
                        }
                      }}
                    />
                    <div className="text-[8px] text-slaanesh-gold/30 self-center">Press Enter to search</div>
                  </div>
                  <div className="flex flex-col gap-1"></div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 mt-4 border-t border-slaanesh-gold/10 pt-6">
            <button 
              onClick={() => setStep('upload')} 
              className="slaanesh-btn-secondary"
            >
              Abandon Upload
            </button>
            <button 
              onClick={handleSkipUnmappedAndExecute}
              className="indulge-btn px-8"
            >
              Continue Ritual (Skipping Unmapped)
            </button>
          </div>
        </div>
      )}

      {step === 'status_mapping' && (
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-start gap-4">
            <div className="flex flex-col gap-1 text-left">
              <h4 className="text-sm font-bold text-slaanesh-gold tracking-widest uppercase italic">Status Alignment</h4>
              <p className="text-xs text-slaanesh-gold/60 leading-relaxed">
                Certain games have contradictory states (e.g. tag says completed but has no playtime, or tag says backlog but has playtime). Please select a compliant status.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                downloadAsCsv(
                  'gog_import_status_alignments.csv',
                  [
                    "Game Title",
                    "Provider ID",
                    "Playtime (Minutes)",
                    "Conflict Reason",
                    "Status Resolution Choice"
                  ],
                  itemsNeedingStatus.map(item => [
                    item.igdb_name || item.title || '',
                    item.externalId || '',
                    item.playtimeMinutes || 0,
                    item.conflictType === 'needs_played' ? "Needs Played status" : "Needs Non-Played status",
                    appStatuses.find(s => s.id === statusSelections[item.externalId])?.label || 'Not Selected'
                  ])
                );
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slaanesh-gold/20 hover:border-slaanesh-accent text-slaanesh-gold hover:text-white bg-black/40 hover:bg-slaanesh-accent/10 transition-all rounded-[2px] font-bold text-[9px] uppercase tracking-wider shrink-0"
              title="Download status alignments as CSV"
            >
              <Download size={11} className="text-slaanesh-accent" />
              Download CSV
            </button>
          </div>
          
          <div className="max-h-[50vh] overflow-y-auto custom-scrollbar flex flex-col gap-4">
             {itemsNeedingStatus.map((game: any) => {
               const needsPlayed = game.conflictType === 'needs_played';
               
               const playtimeMinutes = game.playtimeMinutes || 0;
               const hours = Math.floor(playtimeMinutes / 60);
               const minutes = Math.round(playtimeMinutes % 60);
               const formattedPlaytime = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

               const prevStatusLabel = appStatuses.find(s => s.id === game.pre_selected_status_id)?.label || 'None';
               const existsLabel = game.existsInDb ? 'Existing Game' : 'New Game';

               const playthroughInfo = needsPlayed 
                 ? (game.hasPlaythroughInDb
                     ? 'played status is necessary because a playthrough was already present in the database beforehand'
                     : 'a playthrough is being created for this game with the import')
                 : null;

               return (
                 <div key={game.externalId} className="bg-black/40 border border-slaanesh-gold/20 p-3 rounded-sm flex flex-col gap-3">
                   <div className="flex flex-col">
                     <span className="text-xs font-bold text-slaanesh-gold">{game.igdb_name || game.title}</span>
                     <span className="text-[10px] text-slaanesh-text/40 italic">
                       Playtime: {formattedPlaytime} | Previous Status: {prevStatusLabel} | Library Status: {existsLabel}
                     </span>
                     {playthroughInfo && (
                       <span className="text-[10.5px] font-medium tracking-wide text-slaanesh-accent/80 italic mt-0.5">
                         Playthrough: {playthroughInfo}
                       </span>
                     )}
                     <span className="text-[8px] font-bold uppercase mt-1 text-red-400">
                       {needsPlayed ? "Requires a 'Played' status" : "Requires a non-'Played' status"}
                     </span>
                   </div>

                  <div className="flex gap-2">
                      <select 
                        value={statusSelections[game.externalId] || ''}
                        onChange={e => setStatusSelections(prev => ({ ...prev, [game.externalId]: e.target.value }))}
                        className="flex-1 bg-black border border-slaanesh-gold/30 text-[10px] text-slaanesh-gold px-2 py-2 rounded-sm focus:border-slaanesh-accent outline-none"
                      >
                        <option value="" disabled>Select a {needsPlayed ? "Played" : "Non-Played"} Status...</option>
                        {appStatuses
                          .filter(s => {
                            const isPlayedCategory = s.categories && s.categories.includes('played');
                            return needsPlayed ? isPlayedCategory : !isPlayedCategory;
                          })
                          .map(s => (
                          <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                      </select>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-3 mt-4 border-t border-slaanesh-gold/10 pt-6">
            <button 
              onClick={() => setStep('upload')} 
              className="slaanesh-btn-secondary"
            >
              Abandon Upload
            </button>
            <button 
              onClick={() => {
                 const finalizedItems = importItems.map(item => {
                    const sel = statusSelections[item.externalId];
                    if (sel) {
                       return { ...item, selected_status_id: sel };
                    }
                    return item;
                 });
                 if (analysisResults?.platformConflicts && analysisResults.platformConflicts.length > 0) {
                     setImportItems(finalizedItems);
                     addLog(`${analysisResults.platformConflicts.length} games require vessel mapping.`);
                     setStep('platform_mapping');
                 } else if (playthroughUpdates && playthroughUpdates.length > 0) {
                     setImportItems(finalizedItems);
                     setStep('playthrough_merge_resolution');
                 } else {
                     handleExecute(finalizedItems, {});
                 }
              }}
              disabled={Object.values(statusSelections).some(v => !v)}
              className="indulge-btn px-8 disabled:opacity-50"
            >
              Continue Ritual
            </button>
          </div>
        </div>
      )}

      {step === 'platform_mapping' && analysisResults && (
        <div className="flex flex-col gap-4">
           <div className="flex flex-col gap-2">
             <div className="flex justify-between items-start gap-4">
                <div className="flex flex-col gap-1 text-left">
                  <h4 className="text-slaanesh-gold text-xs font-bold tracking-wider uppercase underline underline-offset-4 decoration-slaanesh-gold/20">Vessel Misalignment</h4>
                  <p className="text-[10px] text-slaanesh-text/60 italic">These platforms do not match the sacred vessel records on IGDB. Map them to allowed vessels.</p>
                </div>
                <div className="flex items-center gap-4 shrink-0 font-sans">
                  <button
                    type="button"
                    onClick={() => {
                      downloadAsCsv(
                        'gog_import_vessel_alignments.csv',
                        [
                          "Game Title",
                          "IGDB ID",
                          "Sacred Platform (Imported)",
                          "Mapped Platform (Allowed)"
                        ],
                        analysisResults.platformConflicts.map((item: any) => [
                          item.gameName || '',
                          item.igdb_id || '',
                          item.csv_platform || '',
                          platformMappings[`${item.igdb_id}::${item.csv_platform}`] || 'Unmapped'
                        ])
                      );
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-slaanesh-gold/20 hover:border-slaanesh-accent text-slaanesh-gold hover:text-white bg-black/40 hover:bg-slaanesh-accent/10 transition-all rounded-[2px] font-bold text-[9px] uppercase tracking-wider shrink-0"
                    title="Download vessel mapping as CSV"
                  >
                    <Download size={11} className="text-slaanesh-accent" />
                    Download CSV
                  </button>
                  <label className="flex items-center gap-2 cursor-pointer w-max">
                    <input 
                      type="checkbox" 
                      checked={applyPlatformMappingsToAll} 
                      onChange={e => setApplyPlatformMappingsToAll(e.target.checked)} 
                      className="accent-slaanesh-accent"
                    />
                    <span className="text-[10px] tracking-widest uppercase font-bold text-slaanesh-gold/80">Apply to all remaining</span>
                  </label>
                </div>
              </div>
          </div>

          <div className="max-h-80 overflow-y-auto custom-scrollbar flex flex-col gap-3">
            {[...analysisResults.platformConflicts]
              .sort((a, b) => (a.csv_platform || '').localeCompare(b.csv_platform || ''))
              .map((conf: any, idx: number) => {
                const mapKey = `${conf.igdb_id}::${conf.csv_platform}`;
                const currentMapping = platformMappings[mapKey];
                const isMapped = !!currentMapping;
                
                return (
                  <div key={`${conf.igdb_id}-${conf.csv_platform}-${idx}`} className="bg-black/40 border border-slaanesh-gold/10 p-3 rounded-sm flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                       <div className="flex justify-between items-start">
                         <span className="text-[10px] font-bold text-slaanesh-gold uppercase tracking-widest">{conf.gameName}</span>
                         <span className="text-[8px] text-slaanesh-gold/40">IGDB: {conf.igdb_id}</span>
                       </div>
                       <div className="text-[9px] flex items-center gap-2">
                          <span className="text-red-400 font-bold">"{conf.csv_platform}"</span>
                          <ArrowRight size={10} className="text-slaanesh-gold/40" />
                          <span className={isMapped ? "text-slaanesh-accent font-bold" : "text-slaanesh-gold/20 italic"}>
                            {isMapped ? currentMapping : "Select Vessel..."}
                          </span>
                       </div>
                    </div>

                  <div className="flex flex-wrap gap-1.5">
                    {conf.allowed_platforms.map((p: string) => (
                      <button
                        key={p}
                        onClick={() => {
                          setPlatformMappings(prev => {
                            const next = { ...prev, [mapKey]: p };
                            if (applyPlatformMappingsToAll) {
                              analysisResults.platformConflicts.forEach((otherConf: any) => {
                                const otherMapKey = `${otherConf.igdb_id}::${otherConf.csv_platform}`;
                                if (!prev[otherMapKey] && otherConf.csv_platform === conf.csv_platform && otherConf.allowed_platforms.includes(p)) {
                                  next[otherMapKey] = p;
                                }
                              });
                            }
                            return next;
                          });
                        }}
                        className={cn(
                          "px-2 py-1 text-[9px] font-bold transition-all rounded-[2px] border",
                          platformMappings[mapKey] === p 
                            ? "bg-slaanesh-accent/20 border-slaanesh-accent text-slaanesh-accent" 
                            : "bg-white/5 border-white/5 text-slaanesh-gold/40 hover:border-slaanesh-gold/20"
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-3 mt-4 border-t border-slaanesh-gold/10 pt-4">
            <button 
              onClick={() => {
                setStep('status_mapping');
              }}
              className="px-6 py-2 border border-slaanesh-gold/20 text-slaanesh-gold/50 hover:text-slaanesh-gold rounded-sm text-[10px] font-bold tracking-wider"
            >
              Back
            </button>
            <button 
              onClick={handleFinishPlatformMapping}
              className="indulge-btn px-8"
            >
              Begin Manifestation
            </button>
          </div>
        </div>
      )}

      {step === 'playthrough_merge_resolution' && (
        <div className="flex flex-col gap-6 font-sans">
          <div className="flex justify-between items-start gap-4">
            <div className="flex flex-col gap-1 text-left">
              <h4 className="text-sm font-bold text-slaanesh-gold tracking-widest uppercase italic">Playthrough Unification</h4>
              <p className="text-xs text-slaanesh-gold/60 leading-relaxed">
                Playthrough records for these games already exist in your local library. Review the imported playtime and date updates below, and choose which updates to apply or discard.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                downloadAsCsv(
                  'gog_import_playthrough_unifications.csv',
                  [
                    "Game Title",
                    "IGDB ID",
                    "Playthrough ID",
                    "Old Date",
                    "New Date",
                    "Old Playtime (Minutes)",
                    "New Playtime (Minutes)",
                    "Action Decision"
                  ],
                  playthroughUpdates.map(item => [
                    item.game_name || '',
                    item.game_id || '',
                    item.playthrough_id || '',
                    item.old_date || 'N/A',
                    item.new_date || 'N/A',
                    item.old_playtime || 0,
                    item.new_playtime || 0,
                    discardedPlaythroughUpdates.includes(item.playthrough_id) 
                      ? "Discard (Keep Database)" 
                      : "Manifest (Overwrite Playthrough)"
                  ])
                );
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slaanesh-gold/20 hover:border-slaanesh-accent text-slaanesh-gold hover:text-white bg-black/40 hover:bg-slaanesh-accent/10 transition-all rounded-[2px] font-bold text-[9px] uppercase tracking-wider shrink-0"
              title="Download playthrough updates as CSV"
            >
              <Download size={11} className="text-slaanesh-accent" />
              Download CSV
            </button>
          </div>

          <div className="max-h-[50vh] overflow-y-auto custom-scrollbar flex flex-col gap-4">
            {playthroughUpdates.map((update: any) => {
              const keepFromDb = discardedPlaythroughUpdates.includes(update.playthrough_id);
              
              const formatMins = (mins: number) => {
                const hrs = Math.floor(mins / 60);
                const m = Math.round(mins % 60);
                return hrs > 0 ? `${hrs}h ${m}m` : `${m}m`;
              };

              return (
                <div 
                  key={update.playthrough_id} 
                  className={cn(
                    "border p-3 rounded-sm flex flex-col gap-3 transition-colors duration-200",
                    keepFromDb 
                      ? "bg-black/20 border-slaanesh-gold/10 opacity-70" 
                      : "bg-black/50 border-slaanesh-gold/30"
                  )}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-slaanesh-gold">{update.game_name}</span>
                    <span className="text-[9px] font-mono text-slaanesh-gold/40">ID: {update.game_id}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 bg-black/30 p-2.5 rounded border border-white/5">
                    <div>
                      <span className="text-[8px] font-bold text-slaanesh-gold/40 uppercase block tracking-wider mb-1">Date Last Played</span>
                      {update.old_date === update.new_date ? (
                        <span className="text-[10.5px] font-mono text-slaanesh-text">{update.old_date || 'N/A'}</span>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[10.5px] font-mono">
                          <span className="text-slaanesh-text/50 line-through">{update.old_date || 'N/A'}</span>
                          <span className="text-slaanesh-gold">➔</span>
                          <span className="text-slaanesh-accent font-bold">{update.new_date || 'N/A'}</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <span className="text-[8px] font-bold text-slaanesh-gold/40 uppercase block tracking-wider mb-1">Playtime Hours</span>
                      {update.old_playtime === update.new_playtime ? (
                        <span className="text-[10.5px] font-mono text-slaanesh-text">{formatMins(update.old_playtime)}</span>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[10.5px] font-mono text-slaanesh-text">
                          <span className="text-slaanesh-text/50 line-through">{formatMins(update.old_playtime)}</span>
                          <span className="text-slaanesh-gold">➔</span>
                          <span className="text-slaanesh-accent font-bold">{formatMins(update.new_playtime)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-1 pt-1 border-t border-white/5">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input 
                        type="checkbox"
                        checked={!keepFromDb}
                        onChange={(e) => {
                          const applyUpdate = e.target.checked;
                          setDiscardedPlaythroughUpdates(prev => {
                            if (applyUpdate) {
                              return prev.filter(id => id !== update.playthrough_id);
                            } else {
                              return [...prev, update.playthrough_id];
                            }
                          });
                        }}
                        className="accent-slaanesh-accent rounded-sm h-3.5 w-3.5 cursor-pointer bg-black border border-slaanesh-gold/30"
                      />
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-wider",
                        keepFromDb ? "text-slaanesh-text/40" : "text-slaanesh-accent"
                      )}>
                        {keepFromDb ? "Discard Update (Keep Db Data)" : "Manifest Imported Update"}
                      </span>
                    </label>

                    <span className="text-[9px] italic text-slaanesh-text/40">
                      {keepFromDb ? "Db values preserved" : "Will overwrite on confirmation"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-3 mt-4 border-t border-slaanesh-gold/10 pt-6">
            <button 
              onClick={() => {
                if (analysisResults?.platformConflicts && analysisResults.platformConflicts.length > 0) {
                  setStep('platform_mapping');
                } else if (itemsNeedingStatus && itemsNeedingStatus.length > 0) {
                  setStep('status_mapping');
                } else {
                  setStep('upload');
                }
              }} 
              className="slaanesh-btn-secondary"
            >
              Back
            </button>
            <button 
              onClick={() => {
                const gogPlatformMappings: Record<string, string> = {};
                if (platformMappings) {
                  Object.entries(platformMappings).forEach(([k, v]) => {
                     const id = k.split('::')[0];
                     gogPlatformMappings[id] = v as string;
                  });
                }
                handleExecute(importItems, gogPlatformMappings, discardedPlaythroughUpdates);
              }}
              className="indulge-btn px-8"
            >
              Confirm & Manifest
            </button>
          </div>
        </div>
      )}

      {(step === 'importing' || step === 'finished' || log.length > 0) && step !== 'game_mapping' && step !== 'status_mapping' && step !== 'platform_mapping' && step !== 'playthrough_merge_resolution' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-slaanesh-gold/10 pb-1">
            <span className="text-[10px] font-bold text-slaanesh-gold tracking-wider">{status || 'Transcending...'}</span>
            {isProcessing && <RefreshCw size={12} className="text-slaanesh-accent animate-spin" />}
          </div>
          <div ref={consoleRef} className="bg-black/80 border border-slaanesh-gold/10 rounded-sm h-[40vh] overflow-y-auto p-3 flex flex-col font-mono text-[10px] gap-1.5 custom-scrollbar">
            {log.map((l, i) => (
               <div key={i} className={cn(
                 "border-l-2 pl-2 transition-all",
                 l.startsWith('CORRUPTION') || l.startsWith('ERROR') || l.startsWith('FATAL') ? 'border-red-500 text-red-400' : 
                 l.startsWith('Final') || l.startsWith('Ritual') ? 'border-slaanesh-accent text-slaanesh-accent font-bold' : 
                 'border-slaanesh-gold/20 text-slaanesh-gold/60'
               )}>
                 {l}
               </div>
            ))}
          </div>
          {!isProcessing && (
            <div className="flex justify-end mt-4">
              <button 
                onClick={onClose}
                className="indulge-btn px-8 py-2 text-[10px] uppercase tracking-[0.2em]"
              >
                Close
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}



export function ImportModal({ onClose, fetchData }: { onClose: () => void, fetchData: () => void }) {
  const [activeTab, setActiveTab] = useState<'gog' | 'csv'>('gog');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 border-b border-slaanesh-gold/10 p-1">
        <button 
          onClick={() => setActiveTab('gog')}
          className={cn(
            "px-4 py-2 text-[10px] font-bold tracking-[0.1em] transition-all rounded-sm",
            activeTab === 'gog' 
              ? "bg-slaanesh-accent/20 text-slaanesh-accent border border-slaanesh-accent/40" 
              : "text-slaanesh-gold/40 hover:text-slaanesh-gold/60"
          )}
        >
          GOG GALAXY RITUAL
        </button>
        <button 
          onClick={() => setActiveTab('csv')}
          className={cn(
            "px-4 py-2 text-[10px] font-bold tracking-[0.1em] transition-all rounded-sm",
            activeTab === 'csv' 
              ? "bg-slaanesh-accent/20 text-slaanesh-accent border border-slaanesh-accent/40" 
              : "text-slaanesh-gold/40 hover:text-slaanesh-gold/60"
          )}
        >
          CSV SCROLL IMPORT
        </button>
      </div>

      {activeTab === 'gog' ? (
        <GogImportTab onClose={onClose} fetchData={fetchData} />
      ) : (
        <CsvImportTab onClose={onClose} fetchData={fetchData} />
      )}
    </div>
  );
}


