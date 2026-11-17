import React from 'react';
import { Check } from 'lucide-react';

export default function CheckCell({ checked, onChange, label }) {
  return (
    <label className="dt1-check">
      <input
        type="checkbox"
        className="dt1-check-input"
        checked={!!checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={label}
      />
      <span className="dt1-check-box" aria-hidden="true">
        <Check className="dt1-check-icon" />
      </span>
    </label>
  );
}