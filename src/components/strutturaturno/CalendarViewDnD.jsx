import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Clock, FileText, GraduationCap, Sparkles } from 'lucide-react';

const COLORI = [
  { value: 'blue', class: 'bg-blue-200 border-blue-400' },
  { value: 'green', class: 'bg-green-200 border-green-400' },
  { value: 'yellow', class: 'bg-yellow-200 border-yellow-400' },
  { value: 'red', class: 'bg-red-200 border-red-400' },
  { value: 'purple', class: 'bg-purple-200 border-purple-400' },
  { value: 'orange', class: 'bg-orange-200 border-orange-400' },
  { value: 'pink', class: 'bg-pink-200 border-pink-400' },
  { value: 'gray', class: 'bg-gray-200 border-gray-400' },
];

// Generate time slots from 06:00 to 02:00 in 5-minute increments
const generateTimeSlots = () => {
  const slots = [];
  for (let h = 6; h < 24; h++) {
    for (let m = 0; m < 60; m += 5) {
      slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
  }
  for (let h = 0; h <= 2; h++) {
    for (let m = 0; m < 60; m += 5) {
      slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

const getColoreClass = (colore) => {
  return COLORI.find(c => c.value === colore)?.class || 'bg-gray-200 border-gray-400';
};

const getFormLabel = (formPage) => {
  const AVAILABLE_FORMS = [
    { value: 'FormInventario', label: 'Inventario' },
    { value: 'FormCantina', label: 'Cantina' },
    { value: 'FormTeglieButtate', label: 'Teglie Buttate' },
    { value: 'FormPreparazioni', label: 'Preparazioni' },
    { value: 'ConteggioCassa', label: 'Conteggio Cassa' },
    { value: 'ControlloPuliziaCassiere', label: 'Pulizia Cassiere' },
    { value: 'ControlloPuliziaPizzaiolo', label: 'Pulizia Pizzaiolo' },
    { value: 'ControlloPuliziaStoreManager', label: 'Pulizia Store Manager' },
    { value: 'Impasto', label: 'Impasto' },
    { value: 'Precotture', label: 'Precotture' },
  ];
  return AVAILABLE_FORMS.find(f => f.value === formPage)?.label || formPage;
};

export default function CalendarViewDnD({ slots, onSlotsChange, getCorsoName, isProvaAffiancamento }) {
  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    
    if (sourceIndex === destinationIndex) return;
    
    const newSlots = Array.from(slots);
    const [movedSlot] = newSlots.splice(sourceIndex, 1);
    newSlots.splice(destinationIndex, 0, movedSlot);
    
    onSlotsChange(newSlots);
  };

  // Separate necessary slots from timed slots
  const necessarySlots = slots.filter(s => s.necessario_in_ogni_turno);
  const timedSlots = slots.filter(s => !s.necessario_in_ogni_turno);

  const getSlotCorsi = (slot) => {
    if (slot.corsi_ids && slot.corsi_ids.length > 0) {
      return slot.corsi_ids;
    }
    if (slot.corso_id) {
      return [slot.corso_id];
    }
    return [];
  };

  // Map slots to time slots for visualization
  const slotsByTime = {};
  timedSlots.forEach(slot => {
    const startTime = slot.ora_inizio || '09:00';
    if (!slotsByTime[startTime]) {
      slotsByTime[startTime] = [];
    }
    slotsByTime[startTime].push(slot);
  });

  return (
    <div className="neumorphic-flat p-6 rounded-xl">
      <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5 text-blue-600" />
        Vista Calendario - Drag & Drop
      </h3>

      {/* Necessary Slots */}
      {necessarySlots.length > 0 && (
        <div className="mb-6 neumorphic-pressed p-4 rounded-xl bg-purple-50">
          <h4 className="text-sm font-bold text-purple-800 mb-3">⭐ Necessario in Ogni Turno</h4>
          <div className="space-y-2">
            {necessarySlots.map((slot, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border-2 ${getColoreClass(slot.colore)}`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold text-purple-600 text-sm">
                    {slot.posizione_turno === 'inizio' ? '⬆️ Inizio' : '⬇️ Fine'}
                  </span>
                  <span className="text-slate-800 font-medium">{slot.attivita}</span>
                  {slot.richiede_form && slot.form_page && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {getFormLabel(slot.form_page)}
                    </span>
                  )}
                  {getSlotCorsi(slot).length > 0 && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 flex items-center gap-1">
                      <GraduationCap className="w-3 h-3" />
                      {getSlotCorsi(slot).length}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DnD Calendar View */}
      {isProvaAffiancamento ? (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            ⏱️ Per schemi "Prova e Affiancamento" la vista calendario non è disponibile (usa minuti relativi)
          </p>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              {/* Time Grid */}
              <div className="space-y-0">
                {TIME_SLOTS.map(timeSlot => {
                  const slotsAtThisTime = slotsByTime[timeSlot] || [];
                  
                  return (
                    <div key={timeSlot} className="flex border-b border-slate-200 hover:bg-slate-50 transition-colors">
                      {/* Time Label */}
                      <div className="w-20 flex-shrink-0 p-2 border-r border-slate-200 flex items-center justify-center bg-slate-100">
                        <span className="text-xs font-mono font-bold text-slate-600">{timeSlot}</span>
                      </div>

                      {/* Slots at this time */}
                      <div className="flex-1 p-2 min-h-[48px]">
                        <Droppable droppableId={timeSlot}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={`min-h-[32px] rounded-lg transition-colors ${
                                snapshot.isDraggingOver ? 'bg-blue-100' : ''
                              }`}
                            >
                              {slotsAtThisTime.map((slot, idx) => {
                                const globalIndex = timedSlots.indexOf(slot);
                                return (
                                  <Draggable key={`${timeSlot}-${idx}`} draggableId={`slot-${globalIndex}`} index={globalIndex}>
                                    {(provided, snapshot) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        className={`mb-2 ${snapshot.isDragging ? 'opacity-50' : ''}`}
                                      >
                                        <div className={`p-2 rounded-lg border-2 ${getColoreClass(slot.colore)} cursor-move hover:shadow-lg transition-shadow`}>
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-mono text-xs font-bold text-slate-700">
                                              {slot.ora_inizio} - {slot.ora_fine}
                                            </span>
                                            <span className="text-sm text-slate-800 font-medium">{slot.attivita}</span>
                                            {slot.richiede_form && slot.form_page && (
                                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 flex items-center gap-1">
                                                <FileText className="w-3 h-3" />
                                                {getFormLabel(slot.form_page)}
                                              </span>
                                            )}
                                            {getSlotCorsi(slot).length > 0 && (
                                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 flex items-center gap-1">
                                                <GraduationCap className="w-3 h-3" />
                                                {getSlotCorsi(slot).length === 1 ? getCorsoName(getSlotCorsi(slot)[0]) : `${getSlotCorsi(slot).length} corsi`}
                                              </span>
                                            )}
                                            {(slot.attrezzature_pulizia || []).length > 0 && (
                                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 flex items-center gap-1">
                                                <Sparkles className="w-3 h-3" />
                                                {slot.attrezzature_pulizia.length}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </Draggable>
                                );
                              })}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </DragDropContext>
      )}
    </div>
  );
}