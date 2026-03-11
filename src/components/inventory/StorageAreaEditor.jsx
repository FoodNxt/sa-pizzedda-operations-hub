import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Plus, Save, Trash2, Upload, X, Move, Loader2 } from "lucide-react";
import NeumorphicCard from "../neumorphic/NeumorphicCard";
import NeumorphicButton from "../neumorphic/NeumorphicButton";

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
];

export default function StorageAreaEditor({ store, mappa, onSaved }) {
  const [areas, setAreas] = useState([]);
  const [bgImage, setBgImage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [draggingIdx, setDraggingIdx] = useState(null);
  const [resizingIdx, setResizingIdx] = useState(null);
  const [editingName, setEditingName] = useState(null);
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (mappa) {
      setAreas(mappa.storage_areas || []);
      setBgImage(mappa.background_image || '');
    } else {
      setAreas([]);
      setBgImage('');
    }
  }, [mappa?.id, store?.id]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (mappa) {
        return base44.entities.MappaLocale.update(mappa.id, data);
      } else {
        return base44.entities.MappaLocale.create({
          store_id: store.id,
          store_name: store.name,
          ...data
        });
      }
    },
    onSuccess: () => {
      onSaved();
      setSaving(false);
    },
    onError: () => setSaving(false)
  });

  const handleSave = () => {
    setSaving(true);
    saveMutation.mutate({
      storage_areas: areas,
      background_image: bgImage
    });
  };

  const addArea = () => {
    const newArea = {
      id: `area_${Date.now()}`,
      nome: `Area ${areas.length + 1}`,
      x: 10 + (areas.length * 5) % 60,
      y: 10 + (areas.length * 5) % 60,
      width: 20,
      height: 15,
      colore: COLORS[areas.length % COLORS.length]
    };
    setAreas([...areas, newArea]);
  };

  const removeArea = (idx) => {
    setAreas(areas.filter((_, i) => i !== idx));
  };

  const updateAreaName = (idx, nome) => {
    const updated = [...areas];
    updated[idx] = { ...updated[idx], nome };
    setAreas(updated);
  };

  const handleUploadBg = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setBgImage(file_url);
    setUploading(false);
  };

  // Drag handling on the canvas
  const handleMouseDown = (e, idx, type) => {
    e.preventDefault();
    e.stopPropagation();
    if (type === 'move') setDraggingIdx(idx);
    if (type === 'resize') setResizingIdx(idx);
  };

  const handleMouseMove = (e) => {
    if (draggingIdx === null && resizingIdx === null) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;

    if (draggingIdx !== null) {
      const updated = [...areas];
      const a = updated[draggingIdx];
      updated[draggingIdx] = {
        ...a,
        x: Math.max(0, Math.min(100 - a.width, xPct - a.width / 2)),
        y: Math.max(0, Math.min(100 - a.height, yPct - a.height / 2))
      };
      setAreas(updated);
    }

    if (resizingIdx !== null) {
      const updated = [...areas];
      const a = updated[resizingIdx];
      const newW = Math.max(8, xPct - a.x);
      const newH = Math.max(6, yPct - a.y);
      updated[resizingIdx] = { ...a, width: Math.min(newW, 100 - a.x), height: Math.min(newH, 100 - a.y) };
      setAreas(updated);
    }
  };

  const handleMouseUp = () => {
    setDraggingIdx(null);
    setResizingIdx(null);
  };

  // Touch support
  const handleTouchMove = (e) => {
    if (draggingIdx === null && resizingIdx === null) return;
    const touch = e.touches[0];
    handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <NeumorphicCard className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-medium cursor-pointer hover:bg-slate-200 transition-colors">
            <Upload className="w-4 h-4" />
            {uploading ? 'Caricamento...' : bgImage ? 'Cambia Piantina' : 'Carica Piantina'}
            <input type="file" accept="image/*" onChange={handleUploadBg} className="hidden" disabled={uploading} />
          </label>

          {bgImage && (
            <button
              onClick={() => setBgImage('')}
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-red-50 text-red-600 text-sm hover:bg-red-100"
            >
              <X className="w-4 h-4" /> Rimuovi
            </button>
          )}

          <NeumorphicButton onClick={addArea} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Aggiungi Area
          </NeumorphicButton>

          <div className="ml-auto">
            <NeumorphicButton
              variant="primary"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salva
            </NeumorphicButton>
          </div>
        </div>
      </NeumorphicCard>

      {/* Canvas */}
      <NeumorphicCard className="p-2">
        <div
          ref={canvasRef}
          className="relative w-full bg-slate-100 rounded-xl overflow-hidden select-none"
          style={{
            paddingBottom: '60%',
            backgroundImage: bgImage ? `url(${bgImage})` : 'none',
            backgroundSize: 'contain',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleMouseUp}
        >
          {!bgImage && areas.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
              Carica una piantina o aggiungi aree di stoccaggio
            </div>
          )}

          {areas.map((area, idx) => (
            <div
              key={area.id}
              className="absolute border-2 rounded-lg flex items-center justify-center cursor-move group"
              style={{
                left: `${area.x}%`,
                top: `${area.y}%`,
                width: `${area.width}%`,
                height: `${area.height}%`,
                borderColor: area.colore,
                backgroundColor: `${area.colore}33`
              }}
              onMouseDown={(e) => handleMouseDown(e, idx, 'move')}
              onTouchStart={(e) => {
                e.preventDefault();
                setDraggingIdx(idx);
              }}
            >
              <span
                className="text-xs font-bold px-1 truncate max-w-full text-center"
                style={{ color: area.colore }}
              >
                {area.nome}
              </span>

              {/* Resize handle */}
              <div
                className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ backgroundColor: area.colore, borderRadius: '2px 0 6px 0' }}
                onMouseDown={(e) => handleMouseDown(e, idx, 'resize')}
                onTouchStart={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setResizingIdx(idx);
                }}
              />
            </div>
          ))}
        </div>
      </NeumorphicCard>

      {/* Area list for editing names */}
      {areas.length > 0 && (
        <NeumorphicCard className="p-4">
          <h3 className="font-bold text-slate-700 text-sm mb-3">Aree di Stoccaggio ({areas.length})</h3>
          <div className="space-y-2">
            {areas.map((area, idx) => (
              <div key={area.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: area.colore }} />
                {editingName === idx ? (
                  <input
                    autoFocus
                    value={area.nome}
                    onChange={(e) => updateAreaName(idx, e.target.value)}
                    onBlur={() => setEditingName(null)}
                    onKeyDown={(e) => e.key === 'Enter' && setEditingName(null)}
                    className="flex-1 px-3 py-1 rounded-lg border border-slate-300 text-sm outline-none"
                  />
                ) : (
                  <span
                    className="flex-1 text-sm font-medium text-slate-700 cursor-pointer hover:text-blue-600"
                    onClick={() => setEditingName(idx)}
                  >
                    {area.nome}
                  </span>
                )}
                <select
                  value={area.colore}
                  onChange={(e) => {
                    const updated = [...areas];
                    updated[idx] = { ...updated[idx], colore: e.target.value };
                    setAreas(updated);
                  }}
                  className="text-xs bg-slate-100 rounded-lg px-2 py-1 border-none outline-none"
                >
                  {COLORS.map(c => (
                    <option key={c} value={c}>{c === '#3b82f6' ? 'Blu' : c === '#10b981' ? 'Verde' : c === '#f59e0b' ? 'Giallo' : c === '#ef4444' ? 'Rosso' : c === '#8b5cf6' ? 'Viola' : c === '#ec4899' ? 'Rosa' : c === '#06b6d4' ? 'Ciano' : c === '#84cc16' ? 'Lime' : c === '#f97316' ? 'Arancio' : 'Indaco'}</option>
                  ))}
                </select>
                <button
                  onClick={() => removeArea(idx)}
                  className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </NeumorphicCard>
      )}
    </div>
  );
}