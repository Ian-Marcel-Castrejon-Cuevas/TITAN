'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface CustomDropdownProps {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  icon?: React.ReactNode;
  placeholder?: string;
}

export function CustomDropdown({ 
  label, 
  options, 
  value, 
  onChange, 
  icon,
  placeholder = 'Selecciona una opción'
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt === value);

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="form-label">
        {icon && <span>{icon}</span>}
        {label}
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white text-left flex items-center justify-between hover:border-primary-500/50 transition-all duration-200"
      >
        <span className={selectedOption ? 'text-white' : 'text-slate-500'}>
          {selectedOption || placeholder}
        </span>
        <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 rounded-xl bg-slate-800 border border-slate-700 shadow-xl overflow-hidden animate-fade-in">
          <div className="max-h-60 overflow-y-auto">
            {options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
                className="w-full px-4 py-3 text-left text-white hover:bg-white/5 transition-colors flex items-center justify-between group"
              >
                <span>{option}</span>
                {value === option && <Check className="w-4 h-4 text-primary-500" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}