import React, { useState, useRef, useCallback, useEffect } from "react";
import { Plus, Trash2, RotateCw, Move, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const COLORS = ["#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#06B6D4", "#F97316"];

function ResizeHandle({ position, onMouseDown, rotation }) {
  const positionStyles = {
    "top-left": { top: -5, left: -5, cursor: "nwse-resize" },
    "top-right": { top: -5, right: -5, cursor: "nesw-resize" },
    "bottom-left": { bottom: -5, left: -5, cursor: "nesw-resize" },
    "bottom-right": { bottom: -5, right: -5, cursor: "nwse-resize" },
    "top": { top: -5, left: "50%", transform: "translateX(-50%)", cursor: "ns-resize" },
    "bottom": { bottom: -5, left: "50%", transform: "translateX(-50%)", cursor: "ns-resize" },
    "left": { top: "50%", left: -5, transform: "translateY(-50%)", cursor: "ew-resize" },
    "right": { top: "50%", right: -5, transform: "translateY(-50%)", cursor: "ew-resize" },
  };

  return (
    <div
      onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e, position); }}
      onTouchStart={(e) => { e.stopPropagation(); onMouseDown(e, position); }}
      className="absolute w-3 h-3 bg-white border-2 border-blue-600 rounded-full z-20 hover:bg-blue-100"
      style={positionStyles[position]}
    />
  );
}

function RotateHandle({ onMouseDown }) {
  return (
    <div
      onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e); }}
      onTouchStart={(e) => { e.stopPropagation(); onMouseDown(e); }}
      className="absolute -top-8 left-1/2 -translate-x-1/2 w-6 h-6 bg-white border-2 border-purple-500 rounded-full z-20 flex items-center justify-center cursor-grab hover:bg-purple-100"
      title="Ruota"
    >
      <RotateCw className="w-3 h-3 text-purple-600" />
    </div>
  );
}

function StorageAreaBox({ area, isSelected, onSelect, onUpdate, onDelete, containerRef }) {
  const boxRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const dragStart = useRef({});

  const getContainerRect = () => containerRef.current?.getBoundingClientRect();
  const getEventPos = (e) => {
    const t = e.touches ? e.touches[0] : e;
    return { clientX: t.clientX, clientY: t.clientY };
  };

  // DRAG
  const handleDragStart = (e) => {
    if (isResizing || isRotating) return;
    e.preventDefault();
    const pos = getEventPos(e);
    const rect = getContainerRect();
    dragStart.current = { startX: pos.clientX, startY: pos.clientY, origX: area.x, origY: area.y, rect };
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e) => {
      const pos = getEventPos(e);
      const { startX, startY, origX, origY, rect } = dragStart.current;
      const dx = ((pos.clientX - startX) / rect.width) * 100;
      const dy = ((pos.clientY - startY) / rect.height) * 100;
      onUpdate({ ...area, x: Math.max(0, Math.min(100 - area.width, origX + dx)), y: Math.max(0, Math.min(100 - area.height, origY + dy)) });
    };
    const handleUp = () => setIsDragging(false);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("touchmove", handleMove);
    window.addEventListener("touchend", handleUp);
    return () => { window.removeEventListener("mousemove", handleMove); window.removeEventListener("mouseup", handleUp); window.removeEventListener("touchmove", handleMove); window.removeEventListener("touchend", handleUp); };
  }, [isDragging]);

  // RESIZE
  const handleResizeStart = (e, direction) => {
    e.preventDefault();
    const pos = getEventPos(e);
    const rect = getContainerRect();
    dragStart.current = { startX: pos.clientX, startY: pos.clientY, origX: area.x, origY: area.y, origW: area.width, origH: area.height, direction, rect };
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return;
    const handleMove = (e) => {
      const pos = getEventPos(e);
      const { startX, startY, origX, origY, origW, origH, direction, rect } = dragStart.current;
      const dx = ((pos.clientX - startX) / rect.width) * 100;
      const dy = ((pos.clientY - startY) / rect.height) * 100;
      let newX = origX, newY = origY, newW = origW, newH = origH;

      if (direction.includes("right")) newW = Math.max(3, origW + dx);
      if (direction.includes("left")) { newW = Math.max(3, origW - dx); newX = origX + (origW - newW); }
      if (direction.includes("bottom")) newH = Math.max(3, origH + dy);
      if (direction.includes("top")) { newH = Math.max(3, origH - dy); newY = origY + (origH - newH); }

      newX = Math.max(0, newX);
      newY = Math.max(0, newY);
      if (newX + newW > 100) newW = 100 - newX;
      if (newY + newH > 100) newH = 100 - newY;

      onUpdate({ ...area, x: newX, y: newY, width: newW, height: newH });
    };
    const handleUp = () => setIsResizing(false);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("touchmove", handleMove);
    window.addEventListener("touchend", handleUp);
    return () => { window.removeEventListener("mousemove", handleMove); window.removeEventListener("mouseup", handleUp); window.removeEventListener("touchmove", handleMove); window.removeEventListener("touchend", handleUp); };
  }, [isResizing]);

  // ROTATE
  const handleRotateStart = (e) => {
    e.preventDefault();
    const rect = getContainerRect();
    const centerX = rect.left + (area.x + area.width / 2) / 100 * rect.width;
    const centerY = rect.top + (area.y + area.height / 2) / 100 * rect.height;
    dragStart.current = { centerX, centerY, origRotation: area.rotation || 0 };
    const pos = getEventPos(e);
    dragStart.current.startAngle = Math.atan2(pos.clientY - centerY, pos.clientX - centerX) * (180 / Math.PI);
    setIsRotating(true);
  };

  useEffect(() => {
    if (!isRotating) return;
    const handleMove = (e) => {
      const pos = getEventPos(e);
      const { centerX, centerY, startAngle, origRotation } = dragStart.current;
      const currentAngle = Math.atan2(pos.clientY - centerY, pos.clientX - centerX) * (180 / Math.PI);
      let newRotation = origRotation + (currentAngle - startAngle);
      // Snap to 15 degree increments if close
      const snapped = Math.round(newRotation / 15) * 15;
      if (Math.abs(newRotation - snapped) < 3) newRotation = snapped;
      onUpdate({ ...area, rotation: newRotation });
    };
    const handleUp = () => setIsRotating(false);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("touchmove", handleMove);
    window.addEventListener("touchend", handleUp);
    return () => { window.removeEventListener("mousemove", handleMove); window.removeEventListener("mouseup", handleUp); window.removeEventListener("touchmove", handleMove); window.removeEventListener("touchend", handleUp); };
  }, [isRotating]);

  const rotation = area.rotation || 0;

  return (
    <div
      ref={boxRef}
      onClick={(e) => { e.stopPropagation(); onSelect(area.id); }}
      onMouseDown={handleDragStart}
      onTouchStart={handleDragStart}
      className={`absolute cursor-move select-none ${isSelected ? "z-10" : "z-5"}`}
      style={{
        left: `${area.x}%`, top: `${area.y}%`,
        width: `${area.width}%`, height: `${area.height}%`,
        transform: `rotate(${rotation}deg)`,
        transformOrigin: "center center",
      }}
    >
      <div
        className={`w-full h-full rounded-md border-2 flex items-center justify-center transition-shadow ${isSelected ? "shadow-lg ring-2 ring-blue-400" : ""}`}
        style={{
          backgroundColor: `${area.colore || "#3B82F6"}30`,
          borderColor: area.colore || "#3B82F6",
        }}
      >
        <span className="text-xs font-bold text-center px-1 leading-tight truncate" style={{ color: area.colore || "#3B82F6" }}>
          {area.nome || "Area"}
        </span>
      </div>

      {isSelected && (
        <>
          <ResizeHandle position="top-left" onMouseDown={handleResizeStart} />
          <ResizeHandle position="top-right" onMouseDown={handleResizeStart} />
          <ResizeHandle position="bottom-left" onMouseDown={handleResizeStart} />
          <ResizeHandle position="bottom-right" onMouseDown={handleResizeStart} />
          <ResizeHandle position="top" onMouseDown={handleResizeStart} />
          <ResizeHandle position="bottom" onMouseDown={handleResizeStart} />
          <ResizeHandle position="left" onMouseDown={handleResizeStart} />
          <ResizeHandle position="right" onMouseDown={handleResizeStart} />
          <RotateHandle onMouseDown={handleRotateStart} />
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onDelete(area.id); }}
            className="absolute -top-3 -right-3 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center z-20 hover:bg-red-600"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </>
      )}
    </div>
  );
}

export default function StorageAreaEditor({ areas = [], onChange, backgroundImage }) {
  const containerRef = useRef(null);
  const [selectedId, setSelectedId] = useState(null);
  const [editingName, setEditingName] = useState("");

  const selectedArea = areas.find((a) => a.id === selectedId);

  useEffect(() => {
    if (selectedArea) setEditingName(selectedArea.nome || "");
  }, [selectedId]);

  const addArea = () => {
    const newArea = {
      id: `area_${Date.now()}`,
      nome: `Area ${areas.length + 1}`,
      x: 10, y: 10, width: 15, height: 15,
      colore: COLORS[areas.length % COLORS.length],
      rotation: 0,
    };
    onChange([...areas, newArea]);
    setSelectedId(newArea.id);
  };

  const updateArea = (updated) => {
    onChange(areas.map((a) => (a.id === updated.id ? updated : a)));
  };

  const deleteArea = (id) => {
    onChange(areas.filter((a) => a.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const handleNameSave = () => {
    if (selectedArea && editingName.trim()) {
      updateArea({ ...selectedArea, nome: editingName.trim() });
    }
  };

  const handleColorChange = (color) => {
    if (selectedArea) updateArea({ ...selectedArea, colore: color });
  };

  const handleRotationInput = (val) => {
    if (selectedArea) {
      const deg = parseInt(val) || 0;
      updateArea({ ...selectedArea, rotation: deg });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Aree di stoccaggio</h3>
        <Button size="sm" variant="outline" onClick={addArea} className="gap-1">
          <Plus className="w-4 h-4" /> Aggiungi area
        </Button>
      </div>

      <div
        ref={containerRef}
        className="relative w-full bg-slate-100 rounded-lg overflow-hidden border-2 border-slate-300"
        style={{ aspectRatio: "16/10" }}
        onClick={() => setSelectedId(null)}
      >
        {backgroundImage && (
          <img src={backgroundImage} alt="Planimetria" className="absolute inset-0 w-full h-full object-contain opacity-50" />
        )}
        {!backgroundImage && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
            Carica una planimetria come sfondo
          </div>
        )}
        {areas.map((area) => (
          <StorageAreaBox
            key={area.id}
            area={area}
            isSelected={selectedId === area.id}
            onSelect={setSelectedId}
            onUpdate={updateArea}
            onDelete={deleteArea}
            containerRef={containerRef}
          />
        ))}
      </div>

      {selectedArea && (
        <div className="p-3 bg-slate-50 rounded-lg border space-y-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-600 w-16">Nome:</label>
            <Input
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onBlur={handleNameSave}
              onKeyDown={(e) => e.key === "Enter" && handleNameSave()}
              className="h-8 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-600 w-16">Colore:</label>
            <div className="flex gap-1">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => handleColorChange(c)}
                  className={`w-6 h-6 rounded-full border-2 ${selectedArea.colore === c ? "border-slate-800 scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-600 w-16">Rotazione:</label>
            <Input
              type="number"
              value={Math.round(selectedArea.rotation || 0)}
              onChange={(e) => handleRotationInput(e.target.value)}
              className="h-8 text-sm w-24"
              min={-360}
              max={360}
            />
            <span className="text-xs text-slate-500">gradi</span>
            <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => updateArea({ ...selectedArea, rotation: 0 })}>
              Reset
            </Button>
          </div>
          <div className="text-xs text-slate-400">
            Trascina per spostare • 8 maniglie per ridimensionare • icona viola per ruotare
          </div>
        </div>
      )}
    </div>
  );
}