import React from 'react';
import { cn } from '../lib/utils';

interface FilterMenuProps {
  colId: string;
  activeFilterCol: string | null;
  columnFilters: Record<string, { value: string; type: 'text' | 'empty' | 'not_empty' }>;
  setColumnFilters: React.Dispatch<React.SetStateAction<Record<string, { value: string; type: 'text' | 'empty' | 'not_empty' }>>>;
  setActiveFilterCol: (val: string | null) => void;
}

export const FilterMenu: React.FC<FilterMenuProps> = ({ colId, activeFilterCol, columnFilters, setColumnFilters, setActiveFilterCol }) => {
  const filter = columnFilters[colId] || { value: '', type: 'text' };
  if (activeFilterCol !== colId) return null;

  return (
    <div className="absolute top-full left-0 mt-1 bg-slaanesh-panel border border-slaanesh-gold/30 rounded shadow-2xl p-3 z-[60] w-48 flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-slaanesh-gold/50 font-bold tracking-wider">Search Archive</label>
        <input 
          autoFocus
          type="text"
          className="bg-black/40 border border-slaanesh-gold/10 rounded p-1.5 text-xs text-slaanesh-gold outline-none focus:border-slaanesh-accent/50 w-full"
          value={filter.value}
          onChange={(e) => setColumnFilters(prev => ({ 
            ...prev, 
            [colId]: { ...filter, value: e.target.value } 
          }))}
          placeholder="..."
          onClick={e => e.stopPropagation()}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-slaanesh-gold/50 font-bold tracking-wider">Condition</label>
        <div className="flex flex-col gap-1">
          {[
            { id: 'text', label: 'Contains text' },
            { id: 'empty', label: 'Is empty' },
            { id: 'not_empty', label: 'Is not empty' }
          ].map(opt => (
            <button 
              key={opt.id}
              onClick={(e) => {
                e.stopPropagation();
                setColumnFilters(prev => ({ 
                  ...prev, 
                  [colId]: { ...filter, type: opt.id as 'text'|'empty'|'not_empty' } 
                }));
              }}
              className={cn(
                "text-left p-1.5 rounded text-xs transition-colors",
                filter.type === opt.id ? "bg-slaanesh-accent/20 text-slaanesh-accent" : "hover:bg-slaanesh-accent/10 text-slaanesh-gold/70"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <button 
        onClick={(e) => {
          e.stopPropagation();
          setColumnFilters(newFilters => {
            const copy = { ...newFilters };
            delete copy[colId];
            return copy;
          });
          setActiveFilterCol(null);
        }}
        className="text-[10px] text-red-400 hover:text-red-300 transition-colors uppercase font-bold mt-1 text-right"
      >
        Clear Filter
      </button>
    </div>
  );
};
