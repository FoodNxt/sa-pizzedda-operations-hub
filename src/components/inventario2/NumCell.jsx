import React, { useEffect, useState } from 'react';

// Campo numerico che salva solo all'uscita dal campo
export default function NumCell({ value, onCommit, label }) {
  const [text, setText] = useState(value ?? '');

  useEffect(() => {
    setText(value ?? '');
  }, [value]);

  const commit = () => {
    const next = text === '' ? undefined : Number(text);
    if (next !== value) onCommit(next);
  };

  return (
    <input
      type="number"
      min="0"
      step="any"
      className="dt1-num"
      placeholder="–"
      value={text}
      aria-label={label}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
    />
  );
}