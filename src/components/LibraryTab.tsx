import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Filter, Star, ExternalLink, Calendar } from "lucide-react";
import { cn, sortPlatforms, getPlatformMap, getDisplayPlatform, sortOriginalPlatformsByMap } from "../lib/utils";
import { FilterMenu } from "./FilterMenu";

import { Game } from "../types";

const getFormattedPlatforms = (platforms: string[], uiSettings: any) => {
  const pMap = getPlatformMap(uiSettings);
  const sortedOriginal = sortOriginalPlatformsByMap(platforms || [], pMap);
  const mapped = sortedOriginal.map(p => getDisplayPlatform(p, pMap));
  const uniqueMapped = Array.from(new Set(mapped));
  return uniqueMapped;
};

interface LibraryTabProps {
  activeTab: string;
  sortedGames: Game[];
  isColVisible: (viewType: "table" | "card", colId: string) => boolean;
  columnFilters: Record<string, any>;
  setColumnFilters: (filters: any) => void;
  activeFilterCol: string | null;
  setActiveFilterCol: (col: string | null) => void;
  setSelectedGame: (game: Game) => void;
  uiSettings: any;
  statuses: { game: any[]; playthrough: any[] };
}

export const LibraryTab: React.FC<LibraryTabProps> = ({
  activeTab,
  sortedGames,
  isColVisible,
  columnFilters,
  setColumnFilters,
  activeFilterCol,
  setActiveFilterCol,
  setSelectedGame,
  uiSettings,
  statuses,
}) => {
  const [displayLimit, setDisplayLimit] = useState(50);
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDisplayLimit(50);
  }, [activeTab, sortedGames.length]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && displayLimit < sortedGames.length) {
          setDisplayLimit((prev) => Math.min(prev + 50, sortedGames.length));
        }
      },
      { threshold: 0.1 },
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [displayLimit, sortedGames.length]);

  const visibleGames = sortedGames.slice(0, displayLimit);

  return (
    <motion.div
      key={activeTab}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col gap-6 flex-1 min-h-0"
    >
      {uiSettings[`ui_view_mode_${activeTab}`] === "list" ? (
        <div id="library-list-scroll-viewport" className="glass-panel flex-1 min-h-[300px] overflow-auto relative custom-scrollbar">
          <table className="w-full text-left text-[10px] md:text-xs border-collapse min-w-[800px] md:min-w-0">
            <thead className="sticky top-0 z-10 bg-slaanesh-panel/40 text-slaanesh-gold tracking-widest border-b border-slaanesh-gold/20 text-sm font-bold">
              <tr>
                <th className="p-4 w-20 min-w-[70px]"></th>
                <th className="p-4 relative">
                  <div className="flex items-center gap-2">
                    <span>Obsession</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveFilterCol(
                          activeFilterCol === "name" ? null : "name",
                        );
                      }}
                      className={cn(
                        "p-0.5 rounded hover:bg-slaanesh-accent/20 transition-colors",
                        columnFilters["name"]
                          ? "text-slaanesh-accent"
                          : "opacity-30",
                      )}
                    >
                      <Filter size={10} />
                    </button>
                  </div>
                  <FilterMenu
                    colId="name"
                    columnFilters={columnFilters}
                    setColumnFilters={setColumnFilters}
                    activeFilterCol={activeFilterCol}
                    setActiveFilterCol={setActiveFilterCol}
                  />
                </th>
                {isColVisible("table", "game_status") && (
                  <th className="p-4 relative text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span>Status</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveFilterCol(
                            activeFilterCol === "game_status"
                              ? null
                              : "game_status",
                          );
                        }}
                        className={cn(
                          "p-0.5 rounded hover:bg-slaanesh-accent/20 transition-colors",
                          columnFilters["game_status"]
                            ? "text-slaanesh-accent"
                            : "opacity-30",
                        )}
                      >
                        <Filter size={10} />
                      </button>
                    </div>
                    <FilterMenu
                      colId="game_status"
                      columnFilters={columnFilters}
                      setColumnFilters={setColumnFilters}
                      activeFilterCol={activeFilterCol}
                      setActiveFilterCol={setActiveFilterCol}
                    />
                  </th>
                )}
                {isColVisible("table", "game_release_date") && (
                  <th className="p-4 relative text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span>Release Date</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveFilterCol(
                            activeFilterCol === "game_release_date"
                              ? null
                              : "game_release_date",
                          );
                        }}
                        className={cn(
                          "p-0.5 rounded hover:bg-slaanesh-accent/20 transition-colors",
                          columnFilters["game_release_date"]
                            ? "text-slaanesh-accent"
                            : "opacity-30",
                        )}
                      >
                        <Filter size={10} />
                      </button>
                    </div>
                    <FilterMenu
                      colId="game_release_date"
                      columnFilters={columnFilters}
                      setColumnFilters={setColumnFilters}
                      activeFilterCol={activeFilterCol}
                      setActiveFilterCol={setActiveFilterCol}
                    />
                  </th>
                )}
                {isColVisible("table", "game_release_status") && (
                  <th className="p-4 relative">
                    <div className="flex items-center gap-2">
                      <span>Release Status</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveFilterCol(
                            activeFilterCol === "game_release_status"
                              ? null
                              : "game_release_status",
                          );
                        }}
                        className={cn(
                          "p-0.5 rounded hover:bg-slaanesh-accent/20 transition-colors",
                          columnFilters["game_release_status"]
                            ? "text-slaanesh-accent"
                            : "opacity-30",
                        )}
                      >
                        <Filter size={10} />
                      </button>
                    </div>
                    <FilterMenu
                      colId="game_release_status"
                      columnFilters={columnFilters}
                      setColumnFilters={setColumnFilters}
                      activeFilterCol={activeFilterCol}
                      setActiveFilterCol={setActiveFilterCol}
                    />
                  </th>
                )}
                {isColVisible("table", "game_platforms") && (
                  <th className="p-4 relative">
                    <div className="flex items-center gap-2">
                      <span>Vessels</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveFilterCol(
                            activeFilterCol === "game_platforms"
                              ? null
                              : "game_platforms",
                          );
                        }}
                        className={cn(
                          "p-0.5 rounded hover:bg-slaanesh-accent/20 transition-colors",
                          columnFilters["game_platforms"]
                            ? "text-slaanesh-accent"
                            : "opacity-30",
                        )}
                      >
                        <Filter size={10} />
                      </button>
                    </div>
                    <FilterMenu
                      colId="game_platforms"
                      columnFilters={columnFilters}
                      setColumnFilters={setColumnFilters}
                      activeFilterCol={activeFilterCol}
                      setActiveFilterCol={setActiveFilterCol}
                    />
                  </th>
                )}
                {isColVisible("table", "game_shops") && (
                  <th className="p-4 relative">
                    <div className="flex items-center gap-2">
                      <span>Gateways</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveFilterCol(
                            activeFilterCol === "game_shops"
                              ? null
                              : "game_shops",
                          );
                        }}
                        className={cn(
                          "p-0.5 rounded hover:bg-slaanesh-accent/20 transition-colors",
                          columnFilters["game_shops"]
                            ? "text-slaanesh-accent"
                            : "opacity-30",
                        )}
                      >
                        <Filter size={10} />
                      </button>
                    </div>
                    <FilterMenu
                      colId="game_shops"
                      columnFilters={columnFilters}
                      setColumnFilters={setColumnFilters}
                      activeFilterCol={activeFilterCol}
                      setActiveFilterCol={setActiveFilterCol}
                    />
                  </th>
                )}
                {isColVisible("table", "game_owned_vaults") && (
                  <th className="p-4 relative">
                    <div className="flex items-center gap-2">
                      <span>Vaults</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveFilterCol(
                            activeFilterCol === "game_owned_vaults"
                              ? null
                              : "game_owned_vaults",
                          );
                        }}
                        className={cn(
                          "p-0.5 rounded hover:bg-slaanesh-accent/20 transition-colors",
                          columnFilters["game_owned_vaults"]
                            ? "text-slaanesh-accent"
                            : "opacity-30",
                        )}
                      >
                        <Filter size={10} />
                      </button>
                    </div>
                    <FilterMenu
                      colId="game_owned_vaults"
                      columnFilters={columnFilters}
                      setColumnFilters={setColumnFilters}
                      activeFilterCol={activeFilterCol}
                      setActiveFilterCol={setActiveFilterCol}
                    />
                  </th>
                )}
                {isColVisible("table", "game_genres") && (
                  <th className="p-4 relative">
                    <div className="flex items-center gap-2">
                      <span>Genres</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveFilterCol(
                            activeFilterCol === "game_genres"
                              ? null
                              : "game_genres",
                          );
                        }}
                        className={cn(
                          "p-0.5 rounded hover:bg-slaanesh-accent/20 transition-colors",
                          columnFilters["game_genres"]
                            ? "text-slaanesh-accent"
                            : "opacity-30",
                        )}
                      >
                        <Filter size={10} />
                      </button>
                    </div>
                    <FilterMenu
                      colId="game_genres"
                      columnFilters={columnFilters}
                      setColumnFilters={setColumnFilters}
                      activeFilterCol={activeFilterCol}
                      setActiveFilterCol={setActiveFilterCol}
                    />
                  </th>
                )}
                {isColVisible("table", "game_themes") && (
                  <th className="p-4 relative">
                    <div className="flex items-center gap-2">
                      <span>Themes</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveFilterCol(
                            activeFilterCol === "game_themes"
                              ? null
                              : "game_themes",
                          );
                        }}
                        className={cn(
                          "p-0.5 rounded hover:bg-slaanesh-accent/20 transition-colors",
                          columnFilters["game_themes"]
                            ? "text-slaanesh-accent"
                            : "opacity-30",
                        )}
                      >
                        <Filter size={10} />
                      </button>
                    </div>
                    <FilterMenu
                      colId="game_themes"
                      columnFilters={columnFilters}
                      setColumnFilters={setColumnFilters}
                      activeFilterCol={activeFilterCol}
                      setActiveFilterCol={setActiveFilterCol}
                    />
                  </th>
                )}
                {isColVisible("table", "game_comment") && (
                  <th className="p-4 relative">
                    <div className="flex items-center gap-2">
                      <span>Game Comment</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveFilterCol(
                            activeFilterCol === "game_comment"
                              ? null
                              : "game_comment",
                          );
                        }}
                        className={cn(
                          "p-0.5 rounded hover:bg-slaanesh-accent/20 transition-colors",
                          columnFilters["game_comment"]
                            ? "text-slaanesh-accent"
                            : "opacity-30",
                        )}
                      >
                        <Filter size={10} />
                      </button>
                    </div>
                    <FilterMenu
                      colId="game_comment"
                      columnFilters={columnFilters}
                      setColumnFilters={setColumnFilters}
                      activeFilterCol={activeFilterCol}
                      setActiveFilterCol={setActiveFilterCol}
                    />
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {visibleGames.map((game) => (
                <tr
                  key={game._unique_key}
                  className="border-b border-slaanesh-gold/5 hover:bg-slaanesh-accent/10 cursor-pointer transition-colors"
                  onClick={() => setSelectedGame(game)}
                >
                  <td className="p-4 min-w-[70px]">
                    <img
                      src={`/covers/${game.igdb_id}.jpg`}
                      className="w-12 h-16 object-cover rounded border border-slaanesh-gold/10"
                      alt=""
                    />
                  </td>
                  <td className="p-4 font-bold text-slaanesh-gold text-sm">
                    {game.name}
                  </td>
                  {isColVisible("table", "game_status") && (
                    <td className="p-4 text-center">
                      <span
                        className="px-2 py-0.5 rounded border border-current font-bold text-xs"
                        style={
                          statuses?.game?.find(
                            (s: any) => s.id === game.game_status,
                          )?.color
                            ? {
                                color: statuses?.game?.find(
                                  (s: any) => s.id === game.game_status,
                                )?.color,
                              }
                            : {}
                        }
                      >
                        {statuses?.game?.find(
                          (s: any) => s.id === game.game_status,
                        )?.label || game.game_status}
                      </span>
                    </td>
                  )}
                  {isColVisible("table", "game_release_date") && (
                    <td className="p-4 text-center font-mono opacity-80 text-xs md:text-sm">
                      {game.release_date || "-"}
                    </td>
                  )}
                  {isColVisible("table", "game_release_status") && (
                    <td className="p-4 font-mono opacity-80 text-[11px]">
                      {game.release_status || "-"}
                    </td>
                  )}
                  {isColVisible("table", "game_platforms") && (
                    <td className="p-4 opacity-70 italic">
                      {getFormattedPlatforms(game.platforms, uiSettings)
                        .join(", ")}
                    </td>
                  )}
                  {isColVisible("table", "game_shops") && (
                    <td className="p-4 text-xs">
                      {game.shops && game.shops.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {game.shops.map((s: any, i: number) => (
                            <React.Fragment key={i}>
                              <a
                                href={s.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-slaanesh-accent hover:underline flex items-center gap-0.5"
                              >
                                {s.name} <ExternalLink size={8} />
                              </a>
                              {i < game.shops.length - 1 && (
                                <span className="opacity-30">,</span>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      ) : (
                        <span className="opacity-20 italic">None</span>
                      )}
                    </td>
                  )}
                  {isColVisible("table", "game_genres") && (
                    <td
                      className="p-4 opacity-70 italic truncate max-w-[120px]"
                      title={game.genres?.join(", ")}
                    >
                      {game.genres?.join(", ") || "-"}
                    </td>
                  )}
                  {isColVisible("table", "game_owned_vaults") && (
                    <td className="p-4 text-xs font-serif italic text-slaanesh-accent/85">
                      {game.owned_vaults || (
                        <span className="opacity-20">None</span>
                      )}
                    </td>
                  )}
                  {isColVisible("table", "game_themes") && (
                    <td
                      className="p-4 opacity-70 italic truncate max-w-[120px]"
                      title={game.themes?.join(", ")}
                    >
                      {game.themes?.join(", ") || "-"}
                    </td>
                  )}
                  {isColVisible("table", "game_comment") && (
                    <td className="p-4 italic opacity-80">
                      {game.comment || "-"}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {sortedGames.length === 0 && (
            <div className="p-12 text-center text-slaanesh-gold/30 tracking-wide">
              The archives remain silent...
            </div>
          )}

          <div
            ref={observerTarget}
            className="h-20 flex-shrink-0 flex items-center justify-center"
          >
            {displayLimit < sortedGames.length && (
              <div className="text-slaanesh-gold animate-pulse text-xs tracking-widest font-bold">
                DESCENDING DEEPER INTO THE ARCHIVES...
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7 gap-6 p-4 md:pt-0 md:px-0">
            {visibleGames.map((game) => (
              <div
                key={game._unique_key}
                className="card-border group cursor-pointer"
                onClick={() => setSelectedGame(game)}
              >
                <div className="aspect-[3/4] relative overflow-hidden bg-slaanesh-panel/40">
                  <img
                    src={`/covers/${game.igdb_id}.jpg`}
                    className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-110"
                    alt={game.name}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                  <div className="absolute bottom-3 left-3 right-3">
                    <p className="text-slaanesh-gold font-bold text-lg xl:text-xl truncate shadow-black drop-shadow-md">
                      {game.name}
                    </p>
                  </div>
                </div>
                <div className="p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    {isColVisible("card", "game_status") && (
                      <span
                        className="text-sm px-3 py-1 rounded-full font-bold tracking-wide border border-current"
                        style={
                          statuses?.game?.find(
                            (s: any) => s.id === game.game_status,
                          )?.color
                            ? {
                                color: statuses?.game?.find(
                                  (s: any) => s.id === game.game_status,
                                )?.color,
                              }
                            : {}
                        }
                      >
                        {statuses?.game?.find(
                          (s: any) => s.id === game.game_status,
                        )?.label || game.game_status}
                      </span>
                    )}
                  </div>
                  {isColVisible("card", "game_platforms") && (
                    <p className="text-sm text-slaanesh-text/60 italic leading-tight">
                      {getFormattedPlatforms(game.platforms || [], uiSettings)
                        .join(", ") || "Unknown Platform"}
                    </p>
                  )}
                  {isColVisible("card", "game_shops") &&
                    game.shops &&
                    game.shops.length > 0 && (
                      <div
                        className="text-[11px] flex flex-wrap gap-x-1 items-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-slaanesh-gold/30 text-xs font-bold">
                          Gateways:
                        </span>
                        {game.shops.map((s: any, i: number) => (
                          <React.Fragment key={i}>
                            <a
                              href={s.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slaanesh-accent/80 hover:text-slaanesh-accent hover:underline flex items-center gap-0.5"
                            >
                              {s.name}
                            </a>
                            {i < game.shops.length - 1 && (
                              <span className="text-slaanesh-gold/20">,</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    )}
                  {isColVisible("card", "game_owned_vaults") &&
                    game.owned_vaults && (
                      <div className="text-[11px] flex flex-wrap gap-x-1 items-center">
                        <span className="text-slaanesh-gold/30 text-xs font-bold">
                          Vaults:
                        </span>
                        <span className="text-slaanesh-accent/80 font-serif italic">
                          {game.owned_vaults}
                        </span>
                      </div>
                    )}
                  {isColVisible("card", "game_release_date") && (
                    <div className="flex flex-col">
                      <p className="text-[10px] text-slaanesh-gold/40 font-mono italic">
                        {game.release_date || "Unknown Date"}
                      </p>
                      {isColVisible("card", "game_release_status") &&
                        game.release_status && (
                          <p className="text-xs text-slaanesh-accent/60 font-bold tracking-wider">
                            {game.release_status}
                          </p>
                        )}
                    </div>
                  )}
                  {isColVisible("card", "game_genres") &&
                    game.genres &&
                    game.genres.length > 0 && (
                      <p className="text-[10px] text-slaanesh-gold/60 truncate font-bold tracking-wider">
                        {game.genres.join(", ")}
                      </p>
                    )}
                  {isColVisible("card", "game_themes") &&
                    game.themes &&
                    game.themes.length > 0 && (
                      <p className="text-[9px] text-slaanesh-accent/40 truncate italic">
                        {game.themes.join(", ")}
                      </p>
                    )}
                  {isColVisible("card", "game_comment") && game.comment && (
                    <p className="text-xs text-slaanesh-text/60 italic line-clamp-2 leading-relaxed">
                      {game.comment}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
          {sortedGames.length === 0 && (
            <div className="p-12 text-center text-slaanesh-gold/30 tracking-wide">
              The archives remain silent...
            </div>
          )}
        </>
      )}

      {uiSettings[`ui_view_mode_${activeTab}`] !== "list" && (
        <div
          ref={observerTarget}
          className="h-20 flex items-center justify-center"
        >
          {displayLimit < sortedGames.length && (
            <div className="text-slaanesh-gold animate-pulse text-xs tracking-widest font-bold">
              DESCENDING DEEPER INTO THE ARCHIVES...
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};
