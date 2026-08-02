import React from 'react';
import { PROVINCIAS_ANGOLA } from '../constants/dpa';

interface BiSectorSelectProps {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  id?: string;
  disabled?: boolean;
  required?: boolean;
}

export default function BiSectorSelect({
  value,
  onChange,
  className = "w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500 cursor-pointer",
  id,
  disabled = false,
  required = true
}: BiSectorSelectProps) {
  return (
    <select
      id={id || "bi-sector-select"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      required={required}
      className={className}
    >
      <option value="" disabled>-- Selecione a Província de Emissão * --</option>
      {PROVINCIAS_ANGOLA.map((provincia) => (
        <option key={provincia} value={provincia}>
          {provincia}
        </option>
      ))}
    </select>
  );
}
