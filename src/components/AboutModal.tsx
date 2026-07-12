import React from 'react';
import { Modal } from './Dialogs';

export function AboutModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    return (
<Modal isOpen={isOpen} onClose={onClose} title="About Slaanesh">
 <div className="flex flex-col gap-6 text-base leading-relaxed text-slaanesh-text/80">
 <p>
 Welcome to <span className="text-slaanesh-accent font-bold">Slaanesh</span>, the ultimate ritual chamber for tracking your digital excesses. 
 Designed for those who crave completion and the finest details of their obsession.
 </p>
 <div className="p-4 bg-slaanesh-gold/5 rounded border border-slaanesh-gold/20">
 <h5 className="text-slaanesh-gold font-bold mb-2 text-sm tracking-widest">Archival Information</h5>
 <ul className="list-none flex flex-col gap-2 text-xs">
 <li className="flex items-center gap-2">
 <span className="text-slaanesh-gold">GitHub:</span>
 <a href="https://github.com/h-quer/Slaanesh" target="_blank" rel="noopener noreferrer" className="hover:text-slaanesh-accent transition-colors underline decoration-slaanesh-accent/30">h-quer/Slaanesh</a>
 </li>
 <li className="flex items-center gap-2">
 <span className="text-slaanesh-gold">License:</span>
 <a href="https://www.gnu.org/licenses/gpl-3.0.txt" target="_blank" rel="noopener noreferrer" className="hover:text-slaanesh-accent transition-colors underline decoration-slaanesh-accent/30">GNU General Public License v3.0</a>
 </li>
 <li>
 <a href="https://www.flaticon.com/free-icons/game-folder" target="_blank" rel="noopener noreferrer" className="hover:text-slaanesh-accent transition-colors underline decoration-slaanesh-accent/30">Game folder icons created by juicy_fish - Flaticon</a>
 </li>
 </ul>
 </div>
 </div>
 </Modal>
    );
}
