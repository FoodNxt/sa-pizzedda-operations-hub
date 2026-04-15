import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Save, Loader2, CheckSquare } from "lucide-react";

export default function ConsegnaDivisaModal({
  employee, contract, config, existingDelivered, onSave, onClose, isSaving
}) {
  const elementi = config?.elementi_divisa || [];
  const dotazione = config?.dotazione_per_gruppo || {};
  const gruppo = contract?.employee_group || employee?.employee_group;
  const expected = (gruppo && dotazione[gruppo]) || {};

  const [quantities, setQuantities] = useState(() => {
    const init = {};
    elementi.forEach(el => { init[el] = 0; });
    return init;
  });
  const [note, setNote] = useState("");

  const updateQty = (el, val) => {
    setQuantities(prev => ({ ...prev, [el]: Math.max(0, parseInt(val) || 0) }));
  };

  const fillComplete = () => {
    const filled = {};
    elementi.forEach(el => {
      const exp = expected[el] || 0;
      const alreadyDel = existingDelivered[el] || 0;
      filled[el] = Math.max(0, exp - alreadyDel);
    });
    setQuantities(filled);
  };

  const handleSave = () => {
    const elementiConsegnati = elementi
      .filter(el => quantities[el] > 0)
      .map(el => ({
        elemento_nome: el,
        taglia: contract?.taglia_maglietta || "",
        quantita: quantities[el]
      }));

    if (elementiConsegnati.length === 0) return;

    const hasFullSet = elementi.every(el => {
      const exp = expected[el] || 0;
      if (exp === 0) return true;
      const alreadyDel = existingDelivered[el] || 0;
      return (alreadyDel + quantities[el]) >= exp;
    });

    onSave({
      dipendente_id: employee.id,
      dipendente_nome: employee.full_name,
      data_consegna: new Date().toISOString(),
      tipo_consegna: hasFullSet ? "divisa_completa" : "elemento_singolo",
      elementi_consegnati: elementiConsegnati,
      note
    });
  };

  const anySelected = elementi.some(el => quantities[el] > 0);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="font-bold text-slate-800">Consegna Divisa</h3>
            <p className="text-sm text-slate-500">{employee.full_name} {gruppo ? `(${gruppo})` : ""}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {contract?.taglia_maglietta && (
            <div className="px-3 py-2 bg-blue-50 rounded-lg text-sm">
              <span className="text-slate-600">Taglia: </span>
              <span className="font-bold text-blue-700">{contract.taglia_maglietta}</span>
            </div>
          )}

          {gruppo && (
            <Button variant="outline" size="sm" onClick={fillComplete} className="w-full gap-2">
              <CheckSquare className="w-4 h-4" />
              Compila set completo (mancanti)
            </Button>
          )}

          <div className="space-y-2">
            {elementi.map(el => {
              const exp = expected[el] || 0;
              const alreadyDel = existingDelivered[el] || 0;
              const remaining = Math.max(0, exp - alreadyDel);

              return (
                <div key={el} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <span className="font-medium text-slate-700">{el}</span>
                    {exp > 0 && (
                      <span className="text-xs text-slate-400 ml-2">
                        ({alreadyDel}/{exp} consegnati{remaining > 0 ? ` - ${remaining} mancanti` : " ✓"})
                      </span>
                    )}
                  </div>
                  <Input
                    type="number"
                    min={0}
                    value={quantities[el]}
                    onChange={e => updateQty(el, e.target.value)}
                    className="h-8 w-20 text-center"
                  />
                </div>
              );
            })}
          </div>

          <div>
            <label className="text-sm font-medium text-slate-600 block mb-1">Note (opzionale)</label>
            <Input
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Note sulla consegna..."
              className="h-9"
            />
          </div>
        </div>

        <div className="p-4 border-t flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>Annulla</Button>
          <Button onClick={handleSave} disabled={!anySelected || isSaving} className="gap-2">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salva Consegna
          </Button>
        </div>
      </div>
    </div>
  );
}