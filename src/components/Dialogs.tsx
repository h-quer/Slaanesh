import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { X, ChevronDown } from 'lucide-react';

export const Modal = ({ isOpen, onClose, title, children, zIndex = 50, headerActions, className }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode, zIndex?: number, headerActions?: React.ReactNode, className?: string }) => {
  if (!isOpen) return null;
  return (
    <div className={cn("fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm", `z-[${zIndex}]`)} style={{ zIndex }}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className={cn("glass-panel w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl shadow-slaanesh-accent/20", className)}
      >
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-slaanesh-gold/20">
          <h2 className="slaanesh-title text-lg md:text-xl tracking-[0.1em] truncate mr-4">{title}</h2>
          <div className="flex items-center gap-2">
            {headerActions}
            <button onClick={onClose} className="p-2 hover:bg-slaanesh-accent/10 rounded transition-colors flex-shrink-0">
              <X size={20} className="text-slaanesh-gold" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </div>
      </motion.div>
    </div>
  )
}

export const ConfirmDialog = ({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  isAlert = false,
  showInput = false,
  inputValue = '',
  onInputChange = () => {},
  showSelect = false,
  selectValue = '',
  onSelectChange = () => {},
  selectOptions = [],
  confirmLabel,
  cancelLabel
}: { 
  isOpen: boolean, 
  title: string, 
  message: string, 
  onConfirm: (val?: string) => void, 
  onCancel: () => void,
  isAlert?: boolean,
  showInput?: boolean,
  inputValue?: string,
  onInputChange?: (val: string) => void,
  showSelect?: boolean,
  selectValue?: string,
  onSelectChange?: (val: string) => void,
  selectOptions?: { id: string; label: string }[],
  confirmLabel?: string,
  cancelLabel?: string
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-panel w-full max-w-lg p-8 border border-slaanesh-gold/30 shadow-[0_0_50px_rgba(224,18,139,0.2)]"
      >
        <h2 className="slaanesh-title text-2xl mb-4 text-center text-slaanesh-gold">{title}</h2>
        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar mb-6 px-2">
          <p className="text-slaanesh-text/80 text-center italic leading-relaxed whitespace-pre-wrap">
            {message}
          </p>
        </div>

        {showInput && (
          <div className="mb-6">
            <input 
              type="text"
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              className="w-full bg-slaanesh-deep border border-slaanesh-gold/20 p-2 text-slaanesh-text focus:border-slaanesh-accent outline-none rounded"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') onConfirm(inputValue);
              }}
            />
          </div>
        )}

        {showSelect && (
          <div className="mb-6">
            <label className="block text-sm text-slaanesh-gold/60 mb-2 tracking-wide">New Secular Status</label>
            <div className="relative">
              <select
                value={selectValue}
                onChange={(e) => onSelectChange(e.target.value)}
                className="w-full bg-slaanesh-deep border border-slaanesh-gold/20 p-2 text-slaanesh-text focus:border-slaanesh-accent outline-none rounded appearance-none cursor-pointer pr-10"
              >
                {selectOptions.map(opt => (
                  <option key={opt.id} value={opt.id} className="bg-slaanesh-deep">
                    {opt.label}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <ChevronDown size={16} className="text-slaanesh-gold/50" />
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-4 justify-center">
          {isAlert ? (
            <button 
              onClick={() => onConfirm()}
              className="px-8 py-2 bg-slaanesh-gold text-slaanesh-deep font-bold hover:bg-slaanesh-accent hover:text-white transition-all rounded shadow-[0_0_15px_rgba(212,175,55,0.3)]"
            >
              {confirmLabel || "Acknowledge"}
            </button>
          ) : (
            <>
              <button 
                onClick={onCancel}
                className="px-6 py-2 border border-slaanesh-gold/50 text-slaanesh-gold hover:bg-slaanesh-accent/5 transition-all rounded"
              >
                {cancelLabel || "Cancel"}
              </button>
              <button 
                onClick={() => onConfirm(showInput ? inputValue : (showSelect ? selectValue : undefined))}
                className={cn(
                  "px-6 py-2 font-bold transition-all rounded shadow-lg",
                  showInput || showSelect || isAlert ? "bg-slaanesh-gold text-slaanesh-deep hover:bg-slaanesh-accent hover:text-white" : "bg-red-600 text-white hover:bg-red-500"
                )}
              >
                {confirmLabel || (showInput || showSelect ? "Confirm" : "Execute")}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};
