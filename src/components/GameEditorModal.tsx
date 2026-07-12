import React, { useState, useEffect } from "react";
import { Modal } from "./Dialogs";
import {
  RefreshCw,
  Trash2,
  ChevronDown,
  ChevronUp,
  Star,
  ExternalLink,
  Plus,
  Clock,
  Edit2,
  CheckCircle,
  X,
} from "lucide-react";
import {
  cn,
  getPlatformMap,
  getDisplayPlatform,
  sortOriginalPlatformsByMap,
} from "../lib/utils";
import { Game } from "../types";

interface GameEditorModalProps {
  selectedGame: Game | null;
  setSelectedGame: React.Dispatch<React.SetStateAction<Game | null>>;
  playthroughs: any[];
  uiSettings: any;
  statuses: any;
  refreshMetadata: () => Promise<void>;
  deleteGame: (igdb_id: number) => void;
  updateGameStatus: (
    statusId: string,
    customComment?: string,
    customOwnedVaults?: string,
  ) => Promise<void>;
  logPlaythrough: () => void;
  editPlaythrough: (p: any) => void;
  deletePlaythrough: (uuid: any) => void;
  sortPlaythroughs: (playthroughs: any[], criteria: any) => any[];
  getSortCriteria: (tab: string) => any;
}

export function GameEditorModal({
  selectedGame,
  setSelectedGame,
  playthroughs,
  uiSettings,
  statuses,
  refreshMetadata,
  deleteGame,
  updateGameStatus,
  logPlaythrough,
  editPlaythrough,
  deletePlaythrough,
  sortPlaythroughs,
  getSortCriteria,
}: GameEditorModalProps) {
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);

  const [isEditingVaults, setIsEditingVaults] = useState(false);
  const [isEditingComment, setIsEditingComment] = useState(false);
  const [vaultsValue, setVaultsValue] = useState("");
  const [commentValue, setCommentValue] = useState("");

  useEffect(() => {
    if (selectedGame) {
      setVaultsValue(selectedGame.owned_vaults || "");
      setCommentValue(selectedGame.comment || "");
      setIsEditingVaults(false);
      setIsEditingComment(false);
    }
  }, [selectedGame]);

  const handleSaveVaults = () => {
    if (!selectedGame) return;
    updateGameStatus(
      selectedGame.game_status,
      selectedGame.comment,
      vaultsValue,
    );
    setIsEditingVaults(false);
  };

  const handleSaveComment = () => {
    if (!selectedGame) return;
    updateGameStatus(
      selectedGame.game_status,
      commentValue,
      selectedGame.owned_vaults,
    );
    setIsEditingComment(false);
  };

  return (
    <Modal
      isOpen={!!selectedGame}
      className="md:max-w-4xl xl:max-w-5xl"
      headerActions={
        <div className="flex items-center gap-1">
          <button
            onClick={refreshMetadata}
            className="p-2 text-slaanesh-gold/60 hover:text-slaanesh-accent hover:bg-slaanesh-accent/10 rounded transition-all"
            title="Refresh Rite"
          >
            <RefreshCw size={18} />
          </button>
          <button
            onClick={() => selectedGame && deleteGame(selectedGame.igdb_id)}
            className="p-2 text-slaanesh-gold/60 hover:text-red-400 hover:bg-red-400/10 rounded transition-all"
            title="Purge Record"
          >
            <Trash2 size={18} />
          </button>
        </div>
      }
      onClose={() => setSelectedGame(null)}
      title={selectedGame?.name || "Examining Rite"}
    >
      <div className="flex flex-col gap-10">
        <div className="flex flex-col lg:flex-row lg:items-stretch gap-8">
          {/* Cover Section */}
          <div className="w-full lg:w-auto aspect-[3/4] flex-shrink-0 bg-slaanesh-panel/40 rounded-sm border border-slaanesh-gold/40 shadow-[0_0_30px_rgba(224,18,139,0.15)] relative overflow-hidden flex items-center justify-center">
            <img
              src={`/covers/${selectedGame?.igdb_id}.jpg`}
              className="absolute w-full h-full object-contain"
              alt={selectedGame?.name}
            />
          </div>
          <div className="flex-1 flex flex-col gap-8">
            {uiSettings["ui_editor_show_summary"] !== "false" && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-slaanesh-gold/20" />
                  <label className="text-[10px] text-slaanesh-gold font-bold tracking-wider px-2 whitespace-nowrap">
                    The Sacred Lore
                  </label>
                  <div className="h-px flex-1 bg-slaanesh-gold/20" />
                </div>
                <div
                  className={cn(
                    "relative p-5 bg-slaanesh-panel/30 rounded border border-slaanesh-gold/5 text-sm text-slaanesh-text/70 leading-relaxed italic cursor-pointer group transition-all duration-500 hover:bg-slaanesh-panel/50",
                    !isSummaryExpanded && "max-h-[100px] overflow-hidden",
                  )}
                  onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
                >
                  <div
                    className={cn(
                      "transition-all duration-500 font-serif",
                      !isSummaryExpanded ? "line-clamp-3" : "",
                    )}
                  >
                    {selectedGame?.summary ||
                      "No archival lore recorded in the Immaterium."}
                  </div>
                  {!isSummaryExpanded &&
                    selectedGame?.summary &&
                    selectedGame.summary.length > 150 && (
                      <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-slaanesh-bg/95 via-slaanesh-bg/50 to-transparent flex items-end justify-center pb-2">
                        <ChevronDown
                          size={16}
                          className="text-slaanesh-gold animate-bounce"
                        />
                      </div>
                    )}
                  {isSummaryExpanded && (
                    <div className="flex justify-center mt-4 border-t border-slaanesh-gold/10 pt-2">
                      <ChevronUp
                        size={14}
                        className="text-slaanesh-gold/50 hover:text-slaanesh-gold transition-colors"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              {/* Row 1 / Pair 1: Immaterial ID & Latest Epiphany */}
              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slaanesh-gold/40 tracking-wider font-bold">
                    Immaterial ID
                  </label>
                  <span className="text-sm font-mono text-slaanesh-accent/80 tracking-tighter">
                    {selectedGame?.igdb_id}
                  </span>
                </div>
                {selectedGame?.game_rating !== null && (
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-slaanesh-gold/40 tracking-wider font-bold">
                      Sacred Score (Avg)
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center text-slaanesh-accent font-bold text-lg">
                        <Star size={14} fill="currentColor" className="mr-1" />
                        {Math.round(selectedGame?.game_rating || 0)}%
                      </div>
                      <span className="text-xs text-slaanesh-gold/30 italic">
                        Calculated from{" "}
                        {playthroughs.filter((p) => p.rating !== null).length}{" "}
                        rites
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-slaanesh-gold/40 tracking-widest font-bold">
                  Latest Epiphany
                </label>
                <span className="text-xs font-mono opacity-60 tracking-wider">
                  {selectedGame?.last_updated
                    ? (() => {
                        const d = new Date(selectedGame.last_updated);
                        const datePart = d.toISOString().split("T")[0];
                        const timePart = d.toLocaleTimeString(undefined, {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        });
                        return `${datePart} ${timePart}`;
                      })()
                    : "Everlasting"}
                </span>
              </div>

              {/* Row 2 / Pair 2: Ritual Arrival & Architects (Developers) */}
              {uiSettings["ui_editor_show_release_date"] !== "false" ||
              (uiSettings["ui_editor_show_release_status"] !== "false" &&
                selectedGame?.release_status) ? (
                <div className="flex flex-col gap-2">
                  {uiSettings["ui_editor_show_release_date"] !== "false" && (
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-slaanesh-gold/40 tracking-wider font-bold">
                        Ritual Arrival
                      </label>
                      <span className="text-sm font-mono font-bold text-slaanesh-gold/90">
                        {selectedGame?.release_date || "Unknown Aeon"}
                      </span>
                    </div>
                  )}
                  {uiSettings["ui_editor_show_release_status"] !== "false" &&
                    selectedGame?.release_status && (
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-slaanesh-gold/40 tracking-wider font-bold">
                          Manifestation Status
                        </label>
                        <p className="text-xs text-slaanesh-accent/60 font-bold tracking-widest">
                          {selectedGame.release_status}
                        </p>
                      </div>
                    )}
                </div>
              ) : (
                <div className="hidden md:block" />
              )}

              {uiSettings["ui_editor_show_developers"] !== "false" &&
              selectedGame?.developers &&
              selectedGame.developers.length > 0 ? (
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slaanesh-gold/40 tracking-wider font-bold">
                    Architects (Developers)
                  </label>
                  <div className="text-xs text-slaanesh-text/60 italic font-medium leading-tight">
                    {selectedGame.developers.join(", ")}
                  </div>
                </div>
              ) : (
                <div className="hidden md:block" />
              )}

              {/* Row 3 / Pair 3: Essence (Themes) & Heralds (Publishers) */}
              {uiSettings["ui_editor_show_themes"] !== "false" &&
              selectedGame?.themes &&
              selectedGame.themes.length > 0 ? (
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slaanesh-gold/40 tracking-widest font-bold">
                    Essence (Themes)
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedGame.themes.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] px-2 py-0.5 bg-slaanesh-accent/5 border border-slaanesh-accent/20 rounded-sm text-slaanesh-accent/80 font-bold"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="hidden md:block" />
              )}

              {uiSettings["ui_editor_show_publishers"] !== "false" &&
              selectedGame?.publishers &&
              selectedGame.publishers.length > 0 ? (
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slaanesh-gold/40 tracking-widest font-bold">
                    Heralds (Publishers)
                  </label>
                  <div className="text-xs text-slaanesh-text/60 italic font-medium leading-tight">
                    {selectedGame.publishers.join(", ")}
                  </div>
                </div>
              ) : (
                <div className="hidden md:block" />
              )}

              {/* Row 4 / Pair 4: Nature (Genres) & Vessels of Indulgence (Platforms) */}
              {uiSettings["ui_editor_show_genres"] !== "false" &&
              selectedGame?.genres &&
              selectedGame.genres.length > 0 ? (
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slaanesh-gold/40 tracking-wider font-bold">
                    Nature (Genres)
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedGame.genres.map((g) => (
                      <span
                        key={g}
                        className="text-[10px] px-2 py-0.5 bg-slaanesh-gold/5 border border-slaanesh-gold/20 rounded-sm text-slaanesh-gold/80 font-bold"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="hidden md:block" />
              )}

              {uiSettings["ui_editor_show_platforms"] !== "false" &&
              selectedGame?.platforms &&
              selectedGame.platforms.length > 0 ? (
                (() => {
                  const pMap = getPlatformMap(uiSettings);
                  const sortedOriginal = sortOriginalPlatformsByMap(
                    selectedGame.platforms || [],
                    pMap,
                  );
                  const mapped = sortedOriginal.map((p) =>
                    getDisplayPlatform(p, pMap),
                  );
                  const uniqueMapped = Array.from(new Set(mapped));
                  return (
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-slaanesh-gold/40 tracking-widest font-bold">
                        Vessels of Indulgence
                      </label>
                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                        {uniqueMapped.map((platform) => (
                          <span
                            key={platform}
                            className="text-[10px] font-bold text-slaanesh-gold/70 tracking-wider transition-colors"
                          >
                            {platform}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="hidden md:block" />
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {(uiSettings["ui_editor_show_websites"] !== "false" ||
            uiSettings["ui_editor_show_shops"] !== "false") && (
            <label className="text-xs text-slaanesh-gold/40 tracking-wider font-bold">
              Aetheric Gateways
            </label>
          )}
          <div className="flex flex-wrap gap-2">
            {uiSettings["ui_editor_show_websites"] !== "false" && (
              <a
                href={`https://www.igdb.com/games/${selectedGame?.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 bg-slaanesh-gold/5 border border-slaanesh-gold/10 rounded-sm text-[10px] hover:border-slaanesh-accent hover:bg-slaanesh-accent/10 transition-all font-bold tracking-wider"
              >
                <ExternalLink size={10} /> IGDB
              </a>
            )}
            {uiSettings["ui_editor_show_shops"] !== "false" &&
              selectedGame?.shops?.map((s, i) => (
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
        <div className="bg-slaanesh-panel/20 p-6 rounded-sm border border-slaanesh-gold/10 shadow-inner">
          <div
            className={cn(
              "grid grid-cols-1 gap-6 items-start",
              uiSettings["ui_editor_show_owned_vaults"] !== "false"
                ? "lg:grid-cols-3"
                : "lg:grid-cols-2",
            )}
          >
            {/* Column 1: Ritual Status */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between h-[22px]">
                <label className="text-xs text-slaanesh-gold/60 font-bold tracking-wider">
                  Ritual Status
                </label>
              </div>
              <div className="relative group">
                <select
                  value={selectedGame?.game_status}
                  onChange={(e) => updateGameStatus(e.target.value)}
                  className="w-full h-[42px] bg-slaanesh-panel/60 border border-slaanesh-gold/30 rounded-sm px-3 text-xs text-slaanesh-text appearance-none cursor-pointer focus:border-slaanesh-accent transition-all group-hover:border-slaanesh-gold/60"
                >
                  {statuses.game.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slaanesh-gold/40 group-hover:text-slaanesh-gold/80 transition-colors">
                  <ChevronDown size={14} />
                </div>
              </div>
            </div>

            {/* Column 2: Vaults of Possession */}
            {uiSettings["ui_editor_show_owned_vaults"] !== "false" && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between h-[22px]">
                  <label className="text-xs text-slaanesh-gold/60 font-bold tracking-wider">
                    Vaults of Possession
                  </label>
                  <div className="flex items-center gap-1.5 h-[22px]">
                    {isEditingVaults ? (
                      <>
                        <button
                          onClick={handleSaveVaults}
                          title="Save Vaults"
                          className="p-1 border border-green-500/20 text-green-400 hover:bg-green-500/10 rounded transition-all flex items-center justify-center"
                        >
                          <CheckCircle size={13} />
                        </button>
                        <button
                          onClick={() => {
                            setVaultsValue(selectedGame?.owned_vaults || "");
                            setIsEditingVaults(false);
                          }}
                          title="Cancel"
                          className="p-1 border border-red-500/20 text-red-500/40 hover:bg-red-500/10 rounded transition-all flex items-center justify-center"
                        >
                          <X size={13} />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setIsEditingVaults(true)}
                        title="Edit Vaults"
                        className="p-1 border border-slaanesh-gold/20 text-slaanesh-gold/80 hover:bg-slaanesh-gold/10 rounded transition-all flex items-center justify-center"
                      >
                        <Edit2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
                {isEditingVaults ? (
                  <input
                    type="text"
                    className="bg-slaanesh-panel/60 border border-slaanesh-accent rounded-sm h-[42px] px-3 text-xs text-slaanesh-gold shadow-inner outline-none focus:border-slaanesh-accent placeholder:text-slaanesh-gold/20 transition-all font-serif italic w-full"
                    value={vaultsValue}
                    onChange={(e) => setVaultsValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveVaults();
                      else if (e.key === "Escape") {
                        setVaultsValue(selectedGame?.owned_vaults || "");
                        setIsEditingVaults(false);
                      }
                    }}
                    placeholder="e.g. Steam, GOG, Epic"
                    autoFocus
                  />
                ) : (
                  <div className="h-[42px] flex items-center text-xs text-slaanesh-gold/90 font-serif italic pl-[13px]">
                    {selectedGame?.owned_vaults || (
                      <span className="text-slaanesh-gold/20">
                        None possessed
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Column 3: Inscribed Reflections */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between h-[22px]">
                <label className="text-xs text-slaanesh-gold/60 font-bold tracking-wider">
                  Inscribed Reflections
                </label>
                <div className="flex items-center gap-1.5 h-[22px]">
                  {isEditingComment ? (
                    <>
                      <button
                        onClick={handleSaveComment}
                        title="Save Reflections"
                        className="p-1 border border-green-500/20 text-green-400 hover:bg-green-500/10 rounded transition-all flex items-center justify-center"
                      >
                        <CheckCircle size={13} />
                      </button>
                      <button
                        onClick={() => {
                          setCommentValue(selectedGame?.comment || "");
                          setIsEditingComment(false);
                        }}
                        title="Cancel"
                        className="p-1 border border-red-500/20 text-red-500/40 hover:bg-red-500/10 rounded transition-all flex items-center justify-center"
                      >
                        <X size={13} />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsEditingComment(true)}
                      title="Edit reflections"
                      className="p-1 border border-slaanesh-gold/20 text-slaanesh-gold/80 hover:bg-slaanesh-gold/10 rounded transition-all flex items-center justify-center"
                    >
                      <Edit2 size={13} />
                    </button>
                  )}
                </div>
              </div>
              {isEditingComment ? (
                <input
                  type="text"
                  className="bg-slaanesh-panel/60 border border-slaanesh-accent rounded-sm h-[42px] px-3 text-xs text-slaanesh-gold shadow-inner outline-none focus:border-slaanesh-accent placeholder:text-slaanesh-gold/20 transition-all font-serif italic w-full"
                  value={commentValue}
                  onChange={(e) => setCommentValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSaveComment();
                    } else if (e.key === "Escape") {
                      setCommentValue(selectedGame?.comment || "");
                      setIsEditingComment(false);
                    }
                  }}
                  placeholder="Inscribe your thoughts"
                  autoFocus
                />
              ) : (
                <div
                  className="h-[42px] flex items-center text-xs text-slaanesh-gold/90 font-serif italic pl-[13px] truncate"
                  title={selectedGame?.comment || ""}
                >
                  {selectedGame?.comment || (
                    <span className="text-slaanesh-gold/20">Empty thought</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6 pt-2">
          <div className="flex items-center justify-between border-b border-slaanesh-gold/10 pb-3">
            <div className="flex items-center gap-4">
              <h4 className="text-slaanesh-gold text-sm tracking-widest font-display">
                Chronicles of Rite
              </h4>
              <span className="bg-slaanesh-accent/10 border border-slaanesh-accent/30 text-slaanesh-accent text-[10px] px-2 py-0.5 rounded-full font-mono">
                {playthroughs.length}
              </span>
            </div>
            <button
              onClick={logPlaythrough}
              className="px-4 py-1.5 bg-slaanesh-gold/10 border border-slaanesh-gold/30 rounded-sm text-[10px] font-bold tracking-wider text-slaanesh-gold hover:bg-slaanesh-gold hover:text-slaanesh-deep transition-all flex items-center gap-2 group"
            >
              <Plus
                size={14}
                className="group-hover:rotate-90 transition-transform"
              />{" "}
              New Rite
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
              sortPlaythroughs(playthroughs, getSortCriteria("played")).map(
                (p) => (
                  <div
                    key={p.uuid}
                    className="group relative flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 sm:py-2 bg-slaanesh-panel/30 rounded-sm border border-slaanesh-gold/10 hover:border-slaanesh-accent/40 transition-all duration-300 shadow-lg overflow-hidden min-h-[44px] gap-3 sm:gap-0"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-slaanesh-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 flex-1 min-w-0 relative z-10 font-mono">
                      <div className="flex items-center gap-2 flex-shrink-0 w-auto sm:w-24">
                        <Clock size={10} className="text-slaanesh-accent/50" />
                        <span className="text-[10px] text-slaanesh-accent tracking-tighter">
                          {p.date}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-[10px] font-bold text-slaanesh-gold tracking-wider">
                          {getDisplayPlatform(
                            p.platform,
                            getPlatformMap(uiSettings),
                          )}
                        </span>
                        {p.playthrough_status && (
                          <span className="text-[9px] px-2 py-0.5 bg-slaanesh-accent/10 text-slaanesh-accent rounded-full border border-slaanesh-accent/20 font-bold tracking-tighter shrink-0">
                            {p.playthrough_status}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-4 flex-1 min-w-0 opacity-60 group-hover:opacity-100 transition-opacity">
                        {p.version && (
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[8px] text-slaanesh-gold/40 font-bold">
                              Ver:
                            </span>
                            <span className="text-[9px] text-slaanesh-gold/70">
                              {p.version}
                            </span>
                          </div>
                        )}
                        {p.time_played_minutes != null && (
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[8px] text-slaanesh-gold/40 font-bold">
                              Time:
                            </span>
                            <span className="text-[9px] text-slaanesh-gold/70">
                              {p.time_played_minutes === 0
                                ? "0m"
                                : `${Math.floor(p.time_played_minutes / 60)}h${p.time_played_minutes % 60 > 0 ? `${p.time_played_minutes % 60}m` : ""}`}
                            </span>
                          </div>
                        )}
                        {p.rating !== null && (
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[8px] uppercase text-slaanesh-gold/40 font-bold">
                              Fav:
                            </span>
                            <span className="text-[9px] text-slaanesh-accent font-bold">
                              {p.rating}%
                            </span>
                          </div>
                        )}
                        {p.comment && (
                          <div className="flex items-center gap-2 sm:ml-2 min-w-0 w-full sm:w-auto mt-1 sm:mt-0">
                            <div className="hidden sm:block w-[2px] h-3 bg-slaanesh-gold/20" />
                            <span className="text-[10px] font-serif italic truncate text-slaanesh-text/60 group-hover:text-slaanesh-text/90 transition-colors">
                              "{p.comment}"
                            </span>
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
                ),
              )
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
