import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Filter, Star, ExternalLink, Calendar, Clock } from "lucide-react";
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

interface PlaythroughTabProps {
  activeTab: string;
  sortedGames: Game[];
  isColVisible: (
    viewType: "table" | "card",
    colId: string,
    customTab?: string,
  ) => boolean;
  getColSetting: (
    viewType: "table" | "card",
    colId: string,
    customTab?: string,
  ) => string;
  columnFilters: Record<string, any>;
  setColumnFilters: (filters: any) => void;
  activeFilterCol: string | null;
  setActiveFilterCol: (col: string | null) => void;
  setSelectedGame: (game: Game) => void;
  uiSettings: any;
  statuses: { game: any[]; playthrough: any[] };
}

export const PlaythroughTab: React.FC<PlaythroughTabProps> = ({
  activeTab,
  sortedGames,
  isColVisible,
  getColSetting,
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
        <div id="playthrough-list-scroll-viewport" className="glass-panel flex-1 min-h-[300px] overflow-auto relative custom-scrollbar">
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
                {isColVisible("table", "p_date") && (
                  <th className="p-4 relative text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span>Rite Date</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveFilterCol(
                            activeFilterCol === "p_date" ? null : "p_date",
                          );
                        }}
                        className={cn(
                          "p-0.5 rounded hover:bg-slaanesh-accent/20 transition-colors",
                          columnFilters["p_date"]
                            ? "text-slaanesh-accent"
                            : "opacity-30",
                        )}
                      >
                        <Filter size={10} />
                      </button>
                    </div>
                    <FilterMenu
                      colId="p_date"
                      columnFilters={columnFilters}
                      setColumnFilters={setColumnFilters}
                      activeFilterCol={activeFilterCol}
                      setActiveFilterCol={setActiveFilterCol}
                    />
                  </th>
                )}
                {isColVisible("table", "p_platform") && (
                  <th className="p-4 relative">
                    <div className="flex items-center gap-2">
                      <span>Rite Vessel</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveFilterCol(
                            activeFilterCol === "p_platform"
                              ? null
                              : "p_platform",
                          );
                        }}
                        className={cn(
                          "p-0.5 rounded hover:bg-slaanesh-accent/20 transition-colors",
                          columnFilters["p_platform"]
                            ? "text-slaanesh-accent"
                            : "opacity-30",
                        )}
                      >
                        <Filter size={10} />
                      </button>
                    </div>
                    <FilterMenu
                      colId="p_platform"
                      columnFilters={columnFilters}
                      setColumnFilters={setColumnFilters}
                      activeFilterCol={activeFilterCol}
                      setActiveFilterCol={setActiveFilterCol}
                    />
                  </th>
                )}
                {isColVisible("table", "p_status") && (
                  <th className="p-4 relative text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span>Outcome</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveFilterCol(
                            activeFilterCol === "p_status" ? null : "p_status",
                          );
                        }}
                        className={cn(
                          "p-0.5 rounded hover:bg-slaanesh-accent/20 transition-colors",
                          columnFilters["p_status"]
                            ? "text-slaanesh-accent"
                            : "opacity-30",
                        )}
                      >
                        <Filter size={10} />
                      </button>
                    </div>
                    <FilterMenu
                      colId="p_status"
                      columnFilters={columnFilters}
                      setColumnFilters={setColumnFilters}
                      activeFilterCol={activeFilterCol}
                      setActiveFilterCol={setActiveFilterCol}
                    />
                  </th>
                )}
                {isColVisible("table", "p_rating") && (
                  <th className="p-4 relative text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span>Rating</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveFilterCol(
                            activeFilterCol === "p_rating" ? null : "p_rating",
                          );
                        }}
                        className={cn(
                          "p-0.5 rounded hover:bg-slaanesh-accent/20 transition-colors",
                          columnFilters["p_rating"]
                            ? "text-slaanesh-accent"
                            : "opacity-30",
                        )}
                      >
                        <Filter size={10} />
                      </button>
                    </div>
                    <FilterMenu
                      colId="p_rating"
                      columnFilters={columnFilters}
                      setColumnFilters={setColumnFilters}
                      activeFilterCol={activeFilterCol}
                      setActiveFilterCol={setActiveFilterCol}
                    />
                  </th>
                )}
                {isColVisible("table", "p_time") && (
                  <th className="p-4 relative text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span>Time Played</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveFilterCol(
                            activeFilterCol === "p_time" ? null : "p_time",
                          );
                        }}
                        className={cn(
                          "p-0.5 rounded hover:bg-slaanesh-accent/20 transition-colors",
                          columnFilters["p_time"]
                            ? "text-slaanesh-accent"
                            : "opacity-30",
                        )}
                      >
                        <Filter size={10} />
                      </button>
                    </div>
                    <FilterMenu
                      colId="p_time"
                      columnFilters={columnFilters}
                      setColumnFilters={setColumnFilters}
                      activeFilterCol={activeFilterCol}
                      setActiveFilterCol={setActiveFilterCol}
                    />
                  </th>
                )}
                {isColVisible("table", "p_version") && (
                  <th className="p-4 relative">
                    <div className="flex items-center gap-2">
                      <span>Version</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveFilterCol(
                            activeFilterCol === "p_version"
                              ? null
                              : "p_version",
                          );
                        }}
                        className={cn(
                          "p-0.5 rounded hover:bg-slaanesh-accent/20 transition-colors",
                          columnFilters["p_version"]
                            ? "text-slaanesh-accent"
                            : "opacity-30",
                        )}
                      >
                        <Filter size={10} />
                      </button>
                    </div>
                    <FilterMenu
                      colId="p_version"
                      columnFilters={columnFilters}
                      setColumnFilters={setColumnFilters}
                      activeFilterCol={activeFilterCol}
                      setActiveFilterCol={setActiveFilterCol}
                    />
                  </th>
                )}
                {isColVisible("table", "p_comment") && (
                  <th className="p-4 relative">
                    <div className="flex items-center gap-2">
                      <span>Ritual Comment</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveFilterCol(
                            activeFilterCol === "p_comment"
                              ? null
                              : "p_comment",
                          );
                        }}
                        className={cn(
                          "p-0.5 rounded hover:bg-slaanesh-accent/20 transition-colors",
                          columnFilters["p_comment"]
                            ? "text-slaanesh-accent"
                            : "opacity-30",
                        )}
                      >
                        <Filter size={10} />
                      </button>
                    </div>
                    <FilterMenu
                      colId="p_comment"
                      columnFilters={columnFilters}
                      setColumnFilters={setColumnFilters}
                      activeFilterCol={activeFilterCol}
                      setActiveFilterCol={setActiveFilterCol}
                    />
                  </th>
                )}
                {isColVisible("table", "game_rating") && (
                  <th className="p-4 relative text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span>Score</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveFilterCol(
                            activeFilterCol === "game_rating"
                              ? null
                              : "game_rating",
                          );
                        }}
                        className={cn(
                          "p-0.5 rounded hover:bg-slaanesh-accent/20 transition-colors",
                          columnFilters["game_rating"]
                            ? "text-slaanesh-accent"
                            : "opacity-30",
                        )}
                      >
                        <Filter size={10} />
                      </button>
                    </div>
                    <FilterMenu
                      colId="game_rating"
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
                      <span>
                        {getColSetting("table", "p_comment") ===
                        "with_game_comment"
                          ? "Comment"
                          : "Game Comment"}
                      </span>
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
              {visibleGames.map((game) => {
                const psToRender = game._playthrough
                  ? [game._playthrough]
                  : game.playthrough_info || [];
                const hasMergedContent =
                  psToRender.some((p: any) => {
                    const showComment =
                      getColSetting("table", "p_comment") ===
                        "with_game_comment" && p.comment;
                    const showVersion =
                      getColSetting("table", "p_version") === "with_comment" &&
                      p.version;
                    const showRating =
                      getColSetting("table", "p_rating") === "with_comment" &&
                      p.rating !== null;
                    const showTime =
                      getColSetting("table", "p_time") === "with_comment" &&
                      p.time_played_minutes != null;
                    return showComment || showVersion || showRating || showTime;
                  }) ||
                  (getColSetting("table", "game_rating") === "with_comment" &&
                    game.game_rating !== null);
                return (
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
                        <div className="flex flex-col gap-1 items-center">
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
                          {getColSetting("table", "p_status") ===
                            "with_status" &&
                            psToRender.map(
                              (p: any) =>
                                p.status_label &&
                                p.status_label !== "-" && (
                                  <div
                                    key={`s_${p.uuid}`}
                                    className="text-[10px] opacity-70 underline whitespace-nowrap mt-0.5"
                                    style={
                                      p.status_color
                                        ? { color: p.status_color }
                                        : {}
                                    }
                                  >
                                    [{p.status_label}]
                                  </div>
                                ),
                            )}
                        </div>
                      </td>
                    )}
                    {isColVisible("table", "p_date") && (
                      <td className="p-4 text-center">
                        <div className="flex flex-col gap-1 items-center">
                          {psToRender.map((p: any) => (
                            <div
                              key={p.uuid}
                              className="text-sm text-slaanesh-gold/80 flex items-center gap-1"
                            >
                              <Calendar size={10} />
                              {p.date}
                            </div>
                          ))}
                        </div>
                      </td>
                    )}
                    {isColVisible("table", "p_platform") && (
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          {psToRender.map((p: any) => (
                            <div
                              key={p.uuid}
                              className="text-sm text-slaanesh-gold/80 flex items-center gap-1"
                            >
                              {getDisplayPlatform(p.platform, getPlatformMap(uiSettings))}
                            </div>
                          ))}
                        </div>
                      </td>
                    )}
                    {isColVisible("table", "p_status") && (
                      <td className="p-4 text-center">
                        <div className="flex flex-col gap-1 items-center">
                          {psToRender.map((p: any) => (
                            <div
                              key={p.uuid}
                              className="text-xs text-slaanesh-gold/80 flex items-center gap-1"
                            >
                              {p.status_label && p.status_label !== "-" && (
                                <span
                                  className="opacity-70"
                                  style={
                                    p.status_color
                                      ? { color: p.status_color }
                                      : {}
                                  }
                                >
                                  [{p.status_label}]
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>
                    )}
                    {isColVisible("table", "p_rating") && (
                      <td className="p-4 text-center">
                        <div className="flex flex-col gap-1 items-center">
                          {psToRender.map((p: any) => (
                            <div
                              key={p.uuid}
                              className="text-xs text-slaanesh-gold/80 flex items-center gap-1 font-mono"
                            >
                              {p.rating !== null ? `${p.rating}%` : "-"}
                            </div>
                          ))}
                        </div>
                      </td>
                    )}
                    {isColVisible("table", "p_time") && (
                      <td className="p-4 text-center">
                        <div className="flex flex-col gap-1 items-center">
                          {psToRender.map((p: any) => {
                            const h = Math.floor(
                              (p.time_played_minutes || 0) / 60,
                            );
                            const m = (p.time_played_minutes || 0) % 60;
                            return (
                              <div
                                key={p.uuid}
                                className="text-xs text-slaanesh-gold/80 flex items-center gap-1 font-mono"
                              >
                                {p.time_played_minutes != null
                                  ? `${h}h ${m}m`
                                  : "-"}
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    )}
                    {isColVisible("table", "p_version") && (
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          {psToRender.map((p: any) => (
                            <div
                              key={p.uuid}
                              className="text-xs text-slaanesh-gold/80 flex items-center gap-1 font-mono italic"
                            >
                              {p.version || "-"}
                            </div>
                          ))}
                        </div>
                      </td>
                    )}
                    {isColVisible("table", "p_comment") && (
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          {psToRender.map((p: any) => (
                            <div
                              key={p.uuid}
                              className="text-xs text-slaanesh-gold/80 italic max-w-[150px] truncate"
                              title={p.comment || ""}
                            >
                              {p.comment || "-"}
                            </div>
                          ))}
                        </div>
                      </td>
                    )}
                    {isColVisible("table", "game_rating") && (
                      <td className="p-4 text-center font-mono">
                        {game.game_rating !== null ? (
                          <div className="flex items-center justify-center gap-1 text-slaanesh-accent font-bold">
                            <Star size={10} fill="currentColor" />
                            {Math.round(game.game_rating)}%
                          </div>
                        ) : (
                          <span className="opacity-20 italic">n/a</span>
                        )}
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
                      <td className="p-4">
                        <div className="flex flex-col gap-1.5">
                          {(game.comment || !hasMergedContent) && (
                            <div
                              className="italic opacity-80 max-w-[200px] truncate"
                              title={game.comment || ""}
                            >
                              {game.comment || "-"}
                            </div>
                          )}
                          {getColSetting("table", "p_comment") ===
                            "with_game_comment" &&
                            psToRender.map(
                              (p: any) =>
                                p.comment && (
                                  <div
                                    key={`c_${p.uuid}`}
                                    className="text-xs text-slaanesh-text/60 max-w-[200px] truncate mt-0.5"
                                    title={p.comment}
                                  >
                                    {p.comment}
                                  </div>
                                ),
                            )}
                          {getColSetting("table", "p_version") ===
                            "with_comment" &&
                            psToRender.map(
                              (p: any) =>
                                p.version && (
                                  <div
                                    key={`v_${p.uuid}`}
                                    className="text-[10px] text-slaanesh-text/50 max-w-[200px] mt-0.5 font-mono"
                                  >
                                    Version: {p.version}
                                  </div>
                                ),
                            )}
                          {getColSetting("table", "p_rating") ===
                            "with_comment" &&
                            psToRender.map(
                              (p: any) =>
                                p.rating !== null && (
                                  <div
                                    key={`r_${p.uuid}`}
                                    className="text-[10px] text-slaanesh-text/50 max-w-[200px] mt-0.5 font-mono"
                                  >
                                    Rating: {p.rating}%
                                  </div>
                                ),
                            )}
                          {getColSetting("table", "p_time") ===
                            "with_comment" &&
                            psToRender.map(
                              (p: any) =>
                                p.time_played_minutes != null && (
                                  <div
                                    key={`t_${p.uuid}`}
                                    className="text-[10px] text-slaanesh-text/50 max-w-[200px] mt-0.5 font-mono"
                                  >
                                    Playtime:{" "}
                                    {Math.floor(p.time_played_minutes / 60)}h{" "}
                                    {p.time_played_minutes % 60}m
                                  </div>
                                ),
                            )}
                          {getColSetting("table", "game_rating") ===
                            "with_comment" &&
                            game.game_rating !== null && (
                              <div
                                key={`gr_${game._unique_key}`}
                                className="text-[10px] text-slaanesh-text/50 max-w-[200px] mt-0.5 font-mono"
                              >
                                Score: {Math.round(game.game_rating)}%
                              </div>
                            )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
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
            {visibleGames.map((game) => {
              const psToRender = game._playthrough
                ? [game._playthrough]
                : game.playthrough_info || [];
              return (
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
                      {isColVisible("card", "game_rating") &&
                        game.game_rating !== null && (
                          <div className="flex items-center gap-1 text-slaanesh-accent font-bold text-xs">
                            <Star size={10} fill="currentColor" />
                            {Math.round(game.game_rating)}%
                          </div>
                        )}
                      {!isColVisible("card", "game_rating") && (
                        <Star size={12} className="text-slaanesh-gold/50" />
                      )}
                    </div>

                    <div className="mt-1 flex flex-col gap-1 border-t border-slaanesh-gold/10 pt-2 pb-1">
                      {psToRender.slice(0, 3).map((p: any) => {
                        const h = Math.floor((p.time_played_minutes || 0) / 60);
                        return (
                          <div
                            key={p.uuid}
                            className="flex flex-col gap-0.5 border-b border-slaanesh-gold/5 pb-1"
                          >
                            <div className="flex items-center justify-between text-[10px] opacity-70">
                              <div className="flex items-center gap-2">
                                {isColVisible("card", "p_date") && (
                                  <div className="flex items-center gap-1">
                                    <Calendar
                                      size={10}
                                      className="text-slaanesh-accent"
                                    />
                                    <span>{p.date}</span>
                                  </div>
                                )}
                                {isColVisible("card", "p_platform") && (
                                  <div className="flex items-center gap-1 opacity-80 italic">
                                    <span>{getDisplayPlatform(p.platform, getPlatformMap(uiSettings))}</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {isColVisible("card", "p_status") &&
                                  p.status_label &&
                                  p.status_label !== "-" && (
                                    <span
                                      className="opacity-70"
                                      style={
                                        p.status_color
                                          ? { color: p.status_color }
                                          : {}
                                      }
                                    >
                                      [{p.status_label}]
                                    </span>
                                  )}
                                {isColVisible("card", "p_rating") &&
                                  p.rating !== null && (
                                    <div className="flex items-center gap-0.5 text-slaanesh-gold">
                                      <Star size={8} fill="currentColor" />
                                      <span>{p.rating}%</span>
                                    </div>
                                  )}
                                {isColVisible("card", "p_time") &&
                                  p.time_played_minutes != null && (
                                    <div className="flex items-center gap-0.5">
                                      <Clock size={8} />
                                      <span>
                                        {Math.floor(
                                          (p.time_played_minutes || 0) / 60,
                                        )}
                                        h
                                        {(p.time_played_minutes || 0) % 60 > 0
                                          ? `${(p.time_played_minutes || 0) % 60}m`
                                          : ""}
                                      </span>
                                    </div>
                                  )}
                                {isColVisible("card", "p_version") &&
                                  p.version && (
                                    <div className="flex items-center gap-0.5 opacity-60">
                                      <span className="text-[7px] uppercase font-bold tracking-tighter">
                                        v.
                                      </span>
                                      <span>{p.version}</span>
                                    </div>
                                  )}
                              </div>
                            </div>
                            {isColVisible("card", "p_comment") && p.comment && (
                              <div className="w-full text-[9px] italic opacity-50 truncate pt-0.5">
                                {p.comment}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {psToRender.length > 3 && (
                        <div className="text-center text-[9px] opacity-40 font-bold uppercase tracking-tighter">
                          + {psToRender.length - 3} more records
                        </div>
                      )}
                    </div>

                    {isColVisible("card", "game_platforms") && (
                      <p className="text-[10px] text-slaanesh-text/60 italic leading-tight">
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
                      <p className="text-xs text-slaanesh-text/60 italic line-clamp-1 leading-relaxed opacity-50">
                        {game.comment}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
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
