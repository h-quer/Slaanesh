import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
 BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip,
 Legend, LabelList
} from 'recharts';

import { cn, sortPlatforms, getPlatformMap, getDisplayPlatform } from '../lib/utils';
import { Game, StatData } from '../types';

interface OverviewTabProps {
 stats: StatData | null;
 isStatVisible: (statId: string) => boolean;
 uiSettings?: any;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ stats, isStatVisible, uiSettings }) => {
 const onlyPositiveGenres = uiSettings?.ui_stats_genres_positive_only !== 'false';
 const onlyPositiveThemes = uiSettings?.ui_stats_themes_positive_only !== 'false';
 const onlyPositivePlatforms = uiSettings?.ui_stats_platforms_positive_only === 'true';

 const genresData = onlyPositiveGenres && stats?.genreStatsPositive ? stats.genreStatsPositive : (stats?.genreStats || []);
 const themesData = onlyPositiveThemes && stats?.themeStatsPositive ? stats.themeStatsPositive : (stats?.themeStats || []);
 
 const rawPlatformsData = onlyPositivePlatforms && stats?.platformStatsPositive ? stats.platformStatsPositive : (stats?.platformStats || []);
 const platformsData = React.useMemo(() => {
   const pMap = getPlatformMap(uiSettings);
   const consolidatedMap: Record<string, number> = {};
   rawPlatformsData.forEach((item: any) => {
     const displayLabel = getDisplayPlatform(item.label, pMap);
     consolidatedMap[displayLabel] = (consolidatedMap[displayLabel] || 0) + item.count;
   });
   return Object.entries(consolidatedMap).map(([label, count]) => ({
     label,
     count
   }));
 }, [rawPlatformsData, uiSettings]);
 return (
  <motion.div 
   key="overview"
   initial={{ opacity: 0 }}
   animate={{ opacity: 1 }}
   exit={{ opacity: 0 }}
   className="grid grid-cols-1 md:grid-cols-12 gap-6"
  >
   {/* Left Column: Main Stats */}
   <div className="col-span-1 md:col-span-8 flex flex-col gap-6 h-full">
    {/* Games vs Playthroughs (Totals) */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
     {isStatVisible('totals') && (
      <div className="glass-panel p-6 min-h-[300px] h-[27vh] max-h-[900px] flex flex-col">
       <h3 className="text-slaanesh-gold text-lg tracking-wider mb-4 font-bold">Volumes of Excess</h3>
       <div className="flex-1 w-full">
        <ResponsiveContainer width="100%" height="100%">
         <BarChart data={[
          { name: 'Total Games', count: stats?.totals?.games || 0 },
          { name: 'Total Playthroughs', count: stats?.totals?.playthroughs || 0 }
         ]} margin={{ top: 30, right: 20, left: -20, bottom: 5 }}>
          <XAxis dataKey="name" interval={0} tick={{ fill: 'var(--gold-color)', fontSize: 10 }} axisLine={{ stroke: 'var(--gold-color)', opacity: 0.3 }} />
          <YAxis tick={{ fill: 'var(--gold-color)', fontSize: 10 }} axisLine={{ stroke: 'var(--gold-color)', opacity: 0.3 }} />
          <RechartsTooltip 
           contentStyle={{ background: 'var(--panel-color)', border: '1px solid var(--gold-color)', borderRadius: '4px', opacity: 0.9 }}
           itemStyle={{ color: 'var(--text-color)', fontSize: '12px' }}
           cursor={{ fill: 'rgba(224, 18, 139, 0.05)' }}
          />
          <Bar dataKey="count" fill="var(--accent-color)" radius={[4, 4, 0, 0]} isAnimationActive={false}>
           <LabelList dataKey="count" position="top" fill="var(--gold-color)" fontSize={10} offset={10} />
          </Bar>
         </BarChart>
        </ResponsiveContainer>
       </div>
      </div>
     )}

     {isStatVisible('categories') && (
      <div className="glass-panel p-6 min-h-[300px] h-[27vh] max-h-[900px] flex flex-col">
       <h3 className="text-slaanesh-gold text-lg tracking-wider mb-4 font-bold">Distribution of Obsession</h3>
       <div className="flex-1 w-full">
        <ResponsiveContainer width="100%" height="100%">
         <BarChart data={(() => {
           const order = ['playing', 'played', 'backlog', 'wishlist'];
           return (stats?.categories || [])
             .filter((c: any) => c.count >= 1)
             .sort((a: any, b: any) => order.indexOf(a.category) - order.indexOf(b.category));
         })()} margin={{ top: 30, right: 20, left: -20, bottom: 5 }}>
          <XAxis dataKey="category" interval={0} tick={{ fill: 'var(--gold-color)', fontSize: 10 }} axisLine={{ stroke: 'var(--gold-color)', opacity: 0.3 }} />
          <YAxis scale="log" domain={[1, 'auto']} tick={{ fill: 'var(--gold-color)', fontSize: 10 }} axisLine={{ stroke: 'var(--gold-color)', opacity: 0.3 }} />
          <RechartsTooltip 
           contentStyle={{ background: 'var(--panel-color)', border: '1px solid var(--gold-color)', borderRadius: '4px', opacity: 0.9 }}
           itemStyle={{ color: 'var(--text-color)', fontSize: '12px' }}
           cursor={{ fill: 'rgba(224, 18, 139, 0.05)' }}
          />
          <Bar dataKey="count" fill="var(--accent-color)" radius={[4, 4, 0, 0]} isAnimationActive={false}>
           <LabelList dataKey="count" position="top" fill="var(--gold-color)" fontSize={10} offset={10} />
          </Bar>
         </BarChart>
        </ResponsiveContainer>
       </div>
      </div>
     )}
    </div>

    {/* Platform Distribution & Completion Pie */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
     {isStatVisible('platforms') && (
      <div className="glass-panel p-6 min-h-[300px] h-[27vh] max-h-[900px] flex flex-col">
       <h3 className="text-slaanesh-gold text-lg tracking-wider mb-4 font-bold">Vessels of Rite</h3>
       <div className="flex-1 w-full">
        <ResponsiveContainer width="100%" height="100%">
         <BarChart 
          data={(platformsData || [])
            .filter((p: any) => p.count >= 1)
            .map((p: any) => ({
              ...p,
              label: p.label
            }))} 
          margin={{ top: 30, right: 20, left: -20, bottom: (platformsData?.filter((p: any) => p.count >= 1).length || 0) > 8 ? 28 : 5 }}
         >
          <XAxis 
           dataKey="label" 
           interval={0}
           tick={(platformsData?.filter((p: any) => p.count >= 1).length || 0) > 8 
            ? { fill: 'var(--gold-color)', fontSize: 10, angle: -35, textAnchor: 'end' } 
            : { fill: 'var(--gold-color)', fontSize: 10 }
           } 
           axisLine={{ stroke: 'var(--gold-color)', opacity: 0.3 }}
           height={(platformsData?.filter((p: any) => p.count >= 1).length || 0) > 8 ? 42 : 30}
          />
          <YAxis scale="log" domain={[1, 'auto']} tick={{ fill: 'var(--gold-color)', fontSize: 10 }} axisLine={{ stroke: 'var(--gold-color)', opacity: 0.3 }} />
          <RechartsTooltip 
           contentStyle={{ background: 'var(--panel-color)', border: '1px solid var(--gold-color)', borderRadius: '4px', opacity: 0.9 }}
           itemStyle={{ color: 'var(--text-color)' }}
           cursor={{ fill: 'rgba(224, 18, 139, 0.05)' }}
          />
          <Bar dataKey="count" fill="var(--accent-color)" radius={[4, 4, 0, 0]} isAnimationActive={false}>
           <LabelList dataKey="count" position="top" fill="var(--gold-color)" fontSize={10} offset={10} />
          </Bar>
         </BarChart>
        </ResponsiveContainer>
       </div>
      </div>
     )}

     {isStatVisible('completion') && (
      <div className="glass-panel p-6 flex flex-col items-center min-h-[300px] h-[27vh] max-h-[900px]">
       <h3 className="text-slaanesh-gold text-lg tracking-wider mb-4 w-full font-bold">Ritual Purity</h3>
       <div className="flex-1 w-full">
        <ResponsiveContainer width="100%" height="100%">
         <PieChart margin={{ top: 10, bottom: 10 }}>
          <Pie isAnimationActive={false}
           data={(stats?.completion || []).filter((entry: any) => entry.count > 0)}
           cx="50%"
           cy="50%"
           innerRadius={40}
           outerRadius={70}
           paddingAngle={5}
           dataKey="count"
           nameKey="label"
           label={{ fill: 'var(--gold-color)', fontSize: 10, fontWeight: 'bold' }}
           labelLine={false}
          >
           {(stats?.completion || []).filter((entry: any) => entry.count > 0).map((entry: any, index: number) => (
            <Cell key={`cell-${index}`} fill={entry.color || 'var(--accent-color)'} />
           ))}
          </Pie>
          <RechartsTooltip 
           contentStyle={{ background: 'var(--panel-color)', border: '1px solid var(--gold-color)', borderRadius: '4px', opacity: 0.9 }}
           itemStyle={{ color: 'var(--text-color)', fontSize: '12px' }}
          />
          <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '10px', color: 'var(--text-color)', paddingTop: '20px' }} />
         </PieChart>
        </ResponsiveContainer>
       </div>
      </div>
     )}
    </div>

    {/* Top Genres & Themes */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
     {isStatVisible('genres') && stats?.genreStats && (
      <div className="glass-panel p-6 min-h-[300px] h-[27vh] max-h-[900px] flex flex-col">
       <h3 className="text-slaanesh-gold text-lg tracking-wider mb-4 font-bold">Nature of Indulgence</h3>
       <div className="flex-1 w-full">
        <ResponsiveContainer width="100%" height="100%">
         <BarChart 
          data={genresData} 
          layout="horizontal" 
          margin={{ top: 30, right: 10, left: 10, bottom: (genresData?.length || 0) > 8 ? 28 : 5 }}
         >
          <XAxis 
           dataKey="label" 
           type="category" 
           tick={(genresData?.length || 0) > 8 
            ? { fill: 'var(--gold-color)', fontSize: 9, angle: -35, textAnchor: 'end' } 
            : { fill: 'var(--gold-color)', fontSize: 9 }
           } 
           axisLine={{ stroke: 'var(--gold-color)', opacity: 0.3 }}
           interval={0}
           height={(genresData?.length || 0) > 8 ? 42 : 30}
          />
          <YAxis type="number" hide />
          <RechartsTooltip 
           contentStyle={{ background: 'var(--panel-color)', border: '1px solid var(--gold-color)', borderRadius: '4px', opacity: 0.9 }}
           itemStyle={{ color: 'var(--text-color)' }}
           cursor={{ fill: 'rgba(224, 18, 139, 0.05)' }}
          />
          <Bar dataKey="count" fill="var(--accent-color)" radius={[4, 4, 0, 0]} isAnimationActive={false}>
           <LabelList dataKey="count" position="top" fill="var(--gold-color)" fontSize={9} offset={8} />
          </Bar>
         </BarChart>
        </ResponsiveContainer>
       </div>
      </div>
     )}

     {isStatVisible('themes') && stats?.themeStats && (
      <div className="glass-panel p-6 min-h-[300px] h-[27vh] max-h-[900px] flex flex-col">
       <h3 className="text-slaanesh-gold text-lg tracking-wider mb-4 font-bold">Essence of Indulgence</h3>
       <div className="flex-1 w-full">
        <ResponsiveContainer width="100%" height="100%">
         <BarChart 
          data={themesData} 
          layout="horizontal" 
          margin={{ top: 30, right: 10, left: 10, bottom: (themesData?.length || 0) > 8 ? 28 : 5 }}
         >
          <XAxis 
           dataKey="label" 
           type="category" 
           tick={(themesData?.length || 0) > 8 
            ? { fill: 'var(--gold-color)', fontSize: 9, angle: -35, textAnchor: 'end' } 
            : { fill: 'var(--gold-color)', fontSize: 9 }
           } 
           axisLine={{ stroke: 'var(--gold-color)', opacity: 0.3 }}
           interval={0}
           height={(themesData?.length || 0) > 8 ? 42 : 30}
          />
          <YAxis type="number" hide />
          <RechartsTooltip 
           contentStyle={{ background: 'var(--panel-color)', border: '1px solid var(--gold-color)', borderRadius: '4px', opacity: 0.9 }}
           itemStyle={{ color: 'var(--text-color)' }}
           cursor={{ fill: 'rgba(224, 18, 139, 0.05)' }}
          />
          <Bar dataKey="count" fill="var(--accent-color)" radius={[4, 4, 0, 0]} isAnimationActive={false}>
           <LabelList dataKey="count" position="top" fill="var(--gold-color)" fontSize={9} offset={8} />
          </Bar>
         </BarChart>
        </ResponsiveContainer>
       </div>
      </div>
     )}
    </div>
   </div>

   {/* Right Column: Sidebar Stats */}
   <div className="col-span-1 md:col-span-4 flex flex-col gap-6 min-h-0 overflow-hidden">
    {/* Yearly Breakdown */}
    {isStatVisible('yearly') && (
     <div className="glass-panel p-6 flex flex-col min-h-0 h-full">
      <h3 className="text-slaanesh-gold text-lg tracking-wider mb-4 font-bold">Temporal Echoes</h3>
      <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-3">
       {(stats?.yearlyStats || []).map((yearData: any) => (
        <div key={yearData.year} className="flex flex-col gap-1 p-2 bg-slaanesh-gold/5 rounded border border-slaanesh-gold/10 flex-grow h-fit min-h-[80px] max-h-[240px]">
         <div className="text-slaanesh-gold font-bold text-xs tracking-widest border-b border-slaanesh-gold/10 pb-1 flex justify-between items-center opacity-80">
          <span>{yearData.year}</span>
          <span className="opacity-50">{yearData.statuses.reduce((a: any, b: any) => a + b.count, 0)} Arrivals</span>
         </div>
         <div className="flex-1 w-full min-h-[40px]">
          <ResponsiveContainer width="100%" height="100%">
           <BarChart layout="vertical" data={yearData.statuses.filter((s: any) => s.count >= 1)} margin={{ left: -25, right: 35 }} barCategoryGap="20%">
            <XAxis type="number" scale="log" domain={[1, 'auto']} hide />
            <YAxis dataKey="label" type="category" tick={{ fill: 'var(--gold-color)', fontSize: 7, opacity: 0.7 }} axisLine={false} tickLine={false} width={80} interval={0} minTickGap={0} />
            <RechartsTooltip 
             contentStyle={{ background: 'var(--panel-color)', border: '1px solid var(--gold-color)', borderRadius: '2px', opacity: 0.9, fontSize: '9px' }}
             itemStyle={{ color: 'var(--text-color)', padding: '2px 0' }}
             cursor={{ fill: 'rgba(224, 18, 139, 0.05)' }}
            />
            <Bar dataKey="count" radius={[0, 2, 2, 0]} maxBarSize={36} isAnimationActive={false}>
             <LabelList dataKey="count" position="right" fill="var(--gold-color)" fontSize={8} offset={5} />
             {yearData.statuses.filter((s: any) => s.count >= 1).map((entry: any, index: number) => (
              <Cell key={`cell-${index}`} fill={entry.color || 'var(--accent-color)'} />
             ))}
            </Bar>
           </BarChart>
          </ResponsiveContainer>
         </div>
        </div>
       ))}
      </div>
     </div>
    )}
   </div>
  </motion.div>
 );
};
