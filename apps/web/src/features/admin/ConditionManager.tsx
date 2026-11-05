import React, { useState } from 'react';
import { Condition, conditionsApi } from '../../lib/api/conditions.api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Chip } from '../../components/ui/Chip';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { Stethoscope, Plus, Trash2, Edit3, ShieldAlert } from 'lucide-react';

interface ConditionManagerProps {
  conditions: Condition[];
  onUpdated?: () => void;
  className?: string;
}

export const ConditionManager: React.FC<ConditionManagerProps> = ({
  conditions,
  onUpdated,
  className = ''
}) => {
  const { addToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Neurology');
  const [defaultSeverity, setDefaultSeverity] = useState(4);
  const [wardReq, setWardReq] = useState('ICU');
  const [equipmentReq, setEquipmentReq] = useState('VENTILATOR');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await conditionsApi.createCondition({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        category,
        defaultSeverity,
        aliases: [name.trim().toLowerCase()],
        requirements: [
          { kind: 'BED', value: wardReq, qty: 1, mandatory: true, preferenceOrder: 1 },
          { kind: 'EQUIPMENT', value: equipmentReq, qty: 1, mandatory: true, preferenceOrder: 1 }
        ]
      });

      addToast({
        type: 'success',
        title: 'Clinical Condition Added',
        message: `${name} registered into citywide triage matching engine.`
      });

      setIsModalOpen(false);
      setCode('');
      setName('');
      if (onUpdated) onUpdated();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Registration Error',
        message: err.response?.data?.error?.message || 'Could not register condition'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`bg-white rounded-card border border-hairline/80 shadow-soft p-5 text-left ${className}`}>
      <div className="flex items-center justify-between pb-3 border-b border-hairline/60 mb-4">
        <div>
          <h3 className="font-display font-bold text-base text-ink">
            Clinical Conditions & Taxonomy ({conditions.length})
          </h3>
          <p className="text-xs text-muted mt-0.5">
            Pre-defined clinical profiles mapped to mandatory bed types, equipment, and medical specialties.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          leftIcon={<Plus className="w-3.5 h-3.5" />}
        >
          Add Condition
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {conditions.map((c) => (
          <div
            key={c.id}
            className="p-3.5 bg-card rounded-2xl border border-hairline/60 flex items-start justify-between gap-3"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-ink">{c.name}</span>
                <span className="text-[10px] font-mono text-muted uppercase">({c.code})</span>
              </div>
              <p className="text-xs text-muted mt-0.5">
                Category: {c.category} • Acuity: Level {c.defaultSeverity}
              </p>
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {c.requirements?.map((r, i) => (
                  <Chip key={i} variant={r.kind === 'BED' ? 'blue' : 'teal'} className="text-[10px]">
                    {r.kind}: {r.value}
                  </Chip>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Condition Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Register Clinical Condition"
        description="Map emergency triage requirements for citizen search."
      >
        <form onSubmit={handleCreate} className="space-y-3.5 pt-2">
          <Input
            label="Condition Name"
            placeholder="e.g. Acute Myocardial Infarction (Heart Attack)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Taxonomy Code"
              placeholder="e.g. CARD_AMI"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
                Clinical Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-12 bg-card rounded-pill px-4 text-xs font-semibold text-ink border border-hairline focus:border-blue focus:outline-none"
              >
                {['Neurology', 'Cardiology', 'Pediatrics', 'Obstetrics', 'Infectious', 'Trauma', 'Nephrology', 'Respiratory'].map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
                Mandatory Ward Type
              </label>
              <select
                value={wardReq}
                onChange={(e) => setWardReq(e.target.value)}
                className="w-full h-12 bg-card rounded-pill px-4 text-xs font-semibold text-ink border border-hairline focus:border-blue focus:outline-none"
              >
                {['ICU', 'NICU', 'PICU', 'HDU', 'CCU', 'GENERAL', 'EMERGENCY', 'ISOLATION'].map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
                Mandatory Equipment
              </label>
              <select
                value={equipmentReq}
                onChange={(e) => setEquipmentReq(e.target.value)}
                className="w-full h-12 bg-card rounded-pill px-4 text-xs font-semibold text-ink border border-hairline focus:border-blue focus:outline-none"
              >
                {['VENTILATOR', 'CT', 'MRI', 'DIALYSIS', 'INCUBATOR', 'OPERATION_THEATRE'].map((eq) => (
                  <option key={eq} value={eq}>
                    {eq}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Save Condition
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

