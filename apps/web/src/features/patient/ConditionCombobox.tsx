import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { conditionsApi, Condition } from '../../lib/api/conditions.api';
import { useDebounce } from '../../hooks/useDebounce';
import { Search, Loader2, Stethoscope, ChevronRight } from 'lucide-react';

interface ConditionComboboxProps {
  value: string;
  selectedCondition: Condition | null;
  onSelect: (condition: Condition) => void;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  className?: string;
}

export const ConditionCombobox: React.FC<ConditionComboboxProps> = ({
  value,
  selectedCondition,
  onSelect,
  onChangeText,
  placeholder = 'e.g. Brain Stroke, Premature Baby, Dengue...',
  className = ''
}) => {
  const [searchTerm, setSearchTerm] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const debouncedSearch = useDebounce(searchTerm, 200);

  // Sync external value
  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  const { data: conditions = [], isLoading } = useQuery({
    queryKey: ['conditions-search', debouncedSearch],
    queryFn: () => conditionsApi.searchConditions(debouncedSearch),
    staleTime: 60000
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    setIsOpen(true);
    setHighlightedIndex(-1);
    if (onChangeText) onChangeText(val);
  };

  const handleSelectCondition = (condition: Condition) => {
    setSearchTerm(condition.name);
    setIsOpen(false);
    onSelect(condition);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsOpen(true);
      return;
    }

    if (!conditions.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < conditions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : conditions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < conditions.length) {
        handleSelectCondition(conditions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const el = listRef.current.children[highlightedIndex] as HTMLElement;
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  return (
    <div className={`relative w-full text-left ${className}`}>
      <div className="relative flex items-center">
        <div className="absolute left-4 flex items-center pointer-events-none text-muted">
          <Search className="w-5 h-5 text-ink" />
        </div>
        <input
          ref={inputRef}
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls="condition-autocomplete-list"
          aria-activedescendant={highlightedIndex >= 0 ? `condition-option-${highlightedIndex}` : undefined}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          placeholder={placeholder}
          className="w-full h-14 bg-white text-ink text-base font-medium rounded-pill pl-12 pr-12 border border-hairline shadow-xs focus:border-blue focus:ring-2 focus:ring-blue/20 focus:outline-none transition-all placeholder:text-muted/60"
        />
        {isLoading && (
          <div className="absolute right-4 flex items-center pointer-events-none text-muted">
            <Loader2 className="w-4 h-4 animate-spin text-blue" />
          </div>
        )}
      </div>

      {/* Autocomplete Dropdown List */}
      {isOpen && conditions.length > 0 && (
        <ul
          id="condition-autocomplete-list"
          ref={listRef}
          role="listbox"
          className="absolute left-0 right-0 mt-2 max-h-72 bg-surface rounded-2xl shadow-float border border-hairline/80 p-2 z-50 overflow-y-auto animate-in fade-in zoom-in-95"
        >
          {conditions.map((item, idx) => {
            const isHighlighted = idx === highlightedIndex;
            const isSelected = selectedCondition?.id === item.id;
            return (
              <li
                key={item.id}
                id={`condition-option-${idx}`}
                role="option"
                aria-selected={isSelected}
                onMouseDown={() => handleSelectCondition(item)}
                onMouseEnter={() => setHighlightedIndex(idx)}
                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer text-sm transition-colors ${
                  isHighlighted ? 'bg-card-soft text-ink' : 'text-ink hover:bg-card-soft/60'
                } ${isSelected ? 'font-bold bg-blue-light text-blue' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-card border border-hairline flex items-center justify-center shrink-0">
                    <Stethoscope className="w-4 h-4 text-blue" />
                  </div>
                  <div>
                    <span className="block font-semibold text-ink leading-tight">{item.name}</span>
                    <span className="block text-xs text-muted mt-0.5">
                      Category: {item.category} • Required ward: {item.requirements?.find(r => r.kind === 'BED')?.value || 'ICU'}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted shrink-0" />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

