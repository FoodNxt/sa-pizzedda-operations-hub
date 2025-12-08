import React, { useState, useRef, useEffect } from 'react';
import { Move, Trash2, Plus, Grid, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

export default function MappaLocaleCanvas({ 
  attrezzature = [], 
  posizioniAttrezzature = [], 
  onPosizioniChange,
  backgroundImage = null 
}) {
  const canvasRef = useRef(null);
  const [draggingId, setDraggingId] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);

  const handleMouseDown = (e, attrezzaturaId) => {
    e.stopPropagation();
    setDraggingId(attrezzaturaId);
  };

  const handleMouseMove = (e) => {
    if (!draggingId || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left - pan.x) / zoom / rect.width) * 100;
    const y = ((e.clientY - rect.top - pan.y) / zoom / rect.height) * 100;

    const updatedPosizioni = posizioniAttrezzature.map(pos => 
      pos.attrezzatura_id === draggingId 
        ? { ...pos, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) }
        : pos
    );
    onPosizioniChange(updatedPosizioni);
  };

  const handleMouseUp = () => {
    setDraggingId(null);
  };

  const aggiungiAttrezzatura = (attrezzaturaId) => {
    const attrezzatura = attrezzature.find(a => a.id === attrezzaturaId);
    if (!attrezzatura) return;

    const nuovaPosizione = {
      attrezzatura_id: attrezzaturaId,
      attrezzatura_nome: attrezzatura.nome,
      x: 50,
      y: 50
    };
    onPosizioniChange([...posizioniAttrezzature, nuovaPosizione]);
  };

  const rimuoviAttrezzatura = (attrezzaturaId) => {
    onPosizioniChange(posizioniAttrezzature.filter(p => p.attrezzatura_id !== attrezzaturaId));
  };

  const attrezzatureNonPresenti = attrezzature.filter(
    a => !posizioniAttrezzature.some(p => p.attrezzatura_id === a.id)
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setShowGrid(!showGrid)}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            showGrid ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
          }`}
        >
          <Grid className="w-4 h-4 inline mr-1" />
          Griglia
        </button>
        <button
          onClick={() => setZoom(z => Math.min(3, z + 0.2))}
          className="px-3 py-2 rounded-lg bg-slate-100 text-slate-600 text-sm font-medium"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom(z => Math.max(0.5, z - 0.2))}
          className="px-3 py-2 rounded-lg bg-slate-100 text-slate-600 text-sm font-medium"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
          className="px-3 py-2 rounded-lg bg-slate-100 text-slate-600 text-sm font-medium"
        >
          <RotateCcw className="w-4 h-4 inline mr-1" />
          Reset
        </button>
        <span className="text-sm text-slate-500 ml-auto">
          Zoom: {Math.round(zoom * 100)}%
        </span>
      </div>

      {/* Canvas */}
      <div 
        ref={canvasRef}
        className="relative w-full h-[500px] rounded-xl overflow-hidden border-2 border-slate-200 bg-slate-50"
        style={{
          backgroundImage: showGrid 
            ? 'linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)'
            : 'none',
          backgroundSize: '20px 20px',
          cursor: draggingId ? 'move' : 'default'
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {backgroundImage && (
          <img 
            src={backgroundImage} 
            alt="Background" 
            className="absolute inset-0 w-full h-full object-contain opacity-30 pointer-events-none"
            style={{ transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)` }}
          />
        )}
        
        {posizioniAttrezzature.map(pos => (
          <div
            key={pos.attrezzatura_id}
            className="absolute bg-white rounded-lg shadow-lg border-2 border-blue-500 px-3 py-2 cursor-move hover:shadow-xl transition-all"
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              transform: `translate(-50%, -50%) scale(${zoom})`,
              zIndex: draggingId === pos.attrezzatura_id ? 1000 : 1
            }}
            onMouseDown={(e) => handleMouseDown(e, pos.attrezzatura_id)}
          >
            <div className="flex items-center gap-2">
              <Move className="w-3 h-3 text-blue-600" />
              <span className="text-sm font-medium text-slate-800">{pos.attrezzatura_nome}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  rimuoviAttrezzatura(pos.attrezzatura_id);
                }}
                className="text-red-500 hover:text-red-700 ml-1"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Attrezzature Disponibili */}
      <div>
        <label className="text-sm font-medium text-slate-700 mb-2 block">
          Aggiungi Attrezzature alla Mappa
        </label>
        <div className="flex flex-wrap gap-2">
          {attrezzatureNonPresenti.length === 0 ? (
            <p className="text-sm text-slate-500 italic">Tutte le attrezzature sono già sulla mappa</p>
          ) : (
            attrezzatureNonPresenti.map(attr => (
              <button
                key={attr.id}
                onClick={() => aggiungiAttrezzatura(attr.id)}
                className="px-3 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-medium hover:from-blue-600 hover:to-blue-700 transition-all flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                {attr.nome}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Istruzioni */}
      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-xs text-blue-700">
          💡 Trascina le attrezzature per posizionarle sulla mappa. Usa i controlli di zoom per navigare.
        </p>
      </div>
    </div>
  );
}