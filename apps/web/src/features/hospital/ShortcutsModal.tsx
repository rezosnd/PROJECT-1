import React from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  const shortcuts = [
    { key: '+', desc: 'Increment focused ward counter by 1' },
    { key: '-', desc: 'Decrement focused ward counter by 1' },
    { key: 'O', desc: 'Adjust Occupied beds' },
    { key: 'R', desc: 'Adjust Reserved bed holds' },
    { key: 'C', desc: 'Adjust Cleaning beds' },
    { key: 'M', desc: 'Adjust Maintenance beds' },
    { key: 'Esc', desc: 'Dismiss active dialog or drawer' }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Rapid Triage Keyboard Shortcuts"
      description="Quickly update inventory counters during high-volume emergency influxes."
      maxWidth="sm"
    >
      <div className="space-y-2 py-2">
        {shortcuts.map((s) => (
          <div
            key={s.key}
            className="flex items-center justify-between p-2.5 bg-card rounded-xl text-xs border border-hairline/60"
          >
            <span className="text-muted">{s.desc}</span>
            <kbd className="px-2.5 py-1 bg-white border border-hairline font-mono font-bold text-ink rounded-lg shadow-xs">
              {s.key}
            </kbd>
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-end">
        <Button variant="primary" size="sm" onClick={onClose}>
          Got it
        </Button>
      </div>
    </Modal>
  );
};

