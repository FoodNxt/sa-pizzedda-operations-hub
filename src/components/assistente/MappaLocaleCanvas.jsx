import React, { useState, useRef } from 'react';
import { Move, Trash2, Plus, Grid, ZoomIn, ZoomOut, RotateCcw, Pencil, Square } from 'lucide-react';

export default function MappaLocaleCanvas({ 
  attrezzature = [], 
  posizioniAttrezzature = [], 
  onPosizioniChange,
  backgroundImage = null,
  linee = [],
  onLineeChange
}) {
  const canvasRef = useRef(null);
  const [draggingId, setDraggingId] = useState(null);
  const [resizingId, setResizingId] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [drawingMode, setDrawingMode] = useState(false);
  const [currentLine, setCurrentLine] = useState(null);

  const handleMouseDown = (e, attrezzaturaId, action = 'drag') => {
    e.stopPropagation();
    if (action === 'resize') {
      setResizingId(attrezzaturaId);
    } else {
      setDraggingId(attrezzaturaId);
    }
  };

  const handleCanvasMouseDown = (e) => {
    if (!drawingMode || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / zoom / rect.width) * 100;
    const y = ((e.clientY - rect.top) / zoom / rect.height) * 100;
    
    setCurrentLine({ x1: x, y1: y, x2: x, y2: y });
  };

  const handleMouseMove = (e) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / zoom / rect.width) * 100;
    const y = ((e.clientY - rect.top) / zoom / rect.height) * 100;

    if (draggingId) {
      const updatedPosizioni = posizioniAttrezzature.map(pos => 
        pos.attrezzatura_id === draggingId 
          ? { ...pos, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) }
          : pos
      );
      onPosizioniChange(updatedPosizioni);
    } else if (resizingId) {
      const updatedPosizioni = posizioniAttrezzature.map(pos => {
        if (pos.attrezzatura_id === resizingId) {
          const newWidth = Math.max(5, Math.min(30, Math.abs(x - pos.x) * 2));
          const newHeight = Math.max(5, Math.min(30, Math.abs(y - pos.y) * 2));
          return { ...pos, width: newWidth, height: newHeight };
        }
        return pos;
      });
      onPosizioniChange(updatedPosizioni);
    } else if (currentLine) {
      setCurrentLine({ ...currentLine, x2: x, y2: y });
    }
  };

  const handleMouseUp = () => {
    if (currentLine && drawingMode) {
      onLineeChange([...(linee || []), currentLine]);
      setCurrentLine(null);
    }
    setDraggingId(null);
    setResizingId(null);
  };

  const aggiungiAttrezzatura = (attrezzaturaId) => {
    const attrezzatura = attrezzature.find(a => a.id === attrezzaturaId);
    if (!attrezzatura) return;

    const nuovaPosizione = {
      attrezzatura_id: attrezzaturaId,
      attrezzatura_nome: attrezzatura.nome,
      icona_url: attrezzatura.icona_url || '',
      x: 50,
      y: 50,
      width: 10,
      height: 10
    };
    onPosizioniChange([...posizioniAttrezzature, nuovaPosizione]);
  };

  const rimuoviAttrezzatura = (attrezzaturaId) => {
    onPosizioniChange(posizioniAttrezzature.filter(p => p.attrezzatura_id !== attrezzaturaId));
  };

  const rimuoviLinea = (index) => {
    onLineeChange((linee || []).filter((_, i) => i !== index));
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
          onClick={() => setDrawingMode(!drawingMode)}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            drawingMode ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'
          }`}
        >
          <Pencil className="w-4 h-4 inline mr-1" />
          Disegna Linee
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
          onClick={() => setZoom(1)}
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
          cursor: drawingMode ? 'crosshair' : draggingId || resizingId ? 'move' : 'default'
        }}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {backgroundImage && (
          <img 
            src={backgroundImage} 
            alt="Background" 
            className="absolute inset-0 w-full h-full object-contain opacity-30 pointer-events-none"
            style={{ transform: `scale(${zoom})` }}
          />
        )}

        {/* Linee disegnate */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ transform: `scale(${zoom})` }}>
          {(linee || []).map((line, idx) => (
            <line
              key={idx}
              x1={`${line.x1}%`}
              y1={`${line.y1}%`}
              x2={`${line.x2}%`}
              y2={`${line.y2}%`}
              stroke="#3b82f6"
              strokeWidth="3"
              strokeLinecap="round"
            />
          ))}
          {currentLine && (
            <line
              x1={`${currentLine.x1}%`}
              y1={`${currentLine.y1}%`}
              x2={`${currentLine.x2}%`}
              y2={`${currentLine.y2}%`}
              stroke="#8b5cf6"
              strokeWidth="3"
              strokeDasharray="5,5"
              strokeLinecap="round"
            />
          )}
        </svg>
        
        {/* Attrezzature */}
        {posizioniAttrezzature.map(pos => {
          const width = pos.width || 10;
          const height = pos.height || 10;
          const showName = width > 8;
          
          return (
            <div
              key={pos.attrezzatura_id}
              className="absolute bg-white rounded-lg shadow-lg border-2 border-blue-500 cursor-move hover:shadow-xl transition-all group"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                width: `${width}%`,
                height: `${height}%`,
                transform: `translate(-50%, -50%) scale(${zoom})`,
                zIndex: draggingId === pos.attrezzatura_id || resizingId === pos.attrezzatura_id ? 1000 : 1,
                minWidth: '40px',
                minHeight: '40px'
              }}
              onMouseDown={(e) => handleMouseDown(e, pos.attrezzatura_id, 'drag')}
            >
              <div className="w-full h-full flex flex-col items-center justify-center p-2 relative">
                {pos.icona_url ? (
                  <img src={pos.icona_url} alt={pos.attrezzatura_nome} className="max-w-full max-h-full object-contain" />
                ) : (
                  <Square className="w-6 h-6 text-blue-600" />
                )}
                {showName && (
                  <span className="text-xs font-medium text-slate-800 text-center mt-1 line-clamp-2">
                    {pos.attrezzatura_nome}
                  </span>
                )}
                {!showName && !pos.icona_url && (
                  <span className="text-xs font-medium text-slate-800 text-center absolute bottom-1 left-1 right-1 truncate">
                    {pos.attrezzatura_nome.substring(0, 3)}
                  </span>
                )}
                
                {/* Resize handle */}
                <div
                  className="absolute bottom-0 right-0 w-4 h-4 bg-blue-600 rounded-tl-lg cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    handleMouseDown(e, pos.attrezzatura_id, 'resize');
                  }}
                />
                
                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    rimuoviAttrezzatura(pos.attrezzatura_id);
                  }}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ pointerEvents: 'auto' }}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Gestione Linee */}
      {(linee || []).length > 0 && (
        <div>
          <label className="text-sm font-medium text-slate-700 mb-2 block">
            Linee Disegnate ({(linee || []).length})
          </label>
          <div className="flex flex-wrap gap-2">
            {(linee || []).map((line, idx) => (
              <button
                key={idx}
                onClick={() => rimuoviLinea(idx)}
                className="px-3 py-1 rounded-lg bg-blue-100 text-blue-700 text-xs font-medium hover:bg-red-100 hover:text-red-700 flex items-center gap-1"
              >
                Linea {idx + 1}
                <Trash2 className="w-3 h-3" />
              </button>
            ))}
          </div>
        </div>
      )}

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
          💡 <strong>Trascina</strong> per spostare • <strong>Angolo in basso a destra</strong> per ridimensionare • 
          <strong> Disegna Linee</strong> per creare pareti/divisori • <strong>X</strong> per eliminare
        </p>
      </div>
    </div>
  );
}