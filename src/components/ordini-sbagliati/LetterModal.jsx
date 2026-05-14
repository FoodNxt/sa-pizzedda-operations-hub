import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { X, Send } from "lucide-react";
import NeumorphicCard from "../neumorphic/NeumorphicCard";
import NeumorphicButton from "../neumorphic/NeumorphicButton";

export default function LetterModal({ selectedEmployee, letterTemplates, dateRange, customStartDate, customEndDate, onClose }) {
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [letterContent, setLetterContent] = useState('');
  const [includeOrderDetails, setIncludeOrderDetails] = useState(true);
  const queryClient = useQueryClient();

  const handleSend = async () => {
    if (!selectedTemplate) { alert('Seleziona un template'); return; }
    const template = letterTemplates.find((t) => t.id === selectedTemplate);
    const currentUser = await base44.auth.me();
    const users = await base44.entities.User.list();
    const user = users.find((u) => u.nome_cognome === selectedEmployee.dipendente_nome);
    if (!user) { alert('Dipendente non trovato nel sistema.'); return; }

    let finalContent = letterContent.replace(/\{\{nome_dipendente\}\}/g, user.nome_cognome).replace(/\{\{data_oggi\}\}/g, new Date().toLocaleDateString('it-IT'));
    if (includeOrderDetails) {
      finalContent += '\n\n--- DETTAGLIO ORDINI SBAGLIATI ---\n\n' + selectedEmployee.orders.map((o, i) =>
        `${i+1}. ${o.platform.toUpperCase()} - Order ID: ${o.order_id}\n   Data: ${new Date(o.order_date).toLocaleDateString('it-IT')} ${new Date(o.order_date).toLocaleTimeString('it-IT', {hour:'2-digit',minute:'2-digit'})}\n   Negozio: ${o.store_name}\n`
      ).join('\n');
    }

    const letteraRichiamo = await base44.entities.LetteraRichiamo.create({ user_id: user.id, user_email: user.email, user_name: user.nome_cognome, tipo_lettera: template.tipo_lettera || 'lettera_richiamo', contenuto_lettera: finalContent, data_invio: new Date().toISOString(), status: 'inviata' });
    for (const order of selectedEmployee.orders) { await base44.entities.WrongOrder.update(order.id, { lettera_richiamo_inviata: true, lettera_richiamo_data: new Date().toISOString(), lettera_richiamo_id: letteraRichiamo.id }); }

    try {
      const emailTemplates = await base44.entities.EmailNotificationTemplate.filter({ tipo_notifica: 'lettera_richiamo', attivo: true });
      if (emailTemplates.length > 0 && user.email) {
        const et = emailTemplates[0];
        const replaceFn = (s) => s.replace(/\{\{nome_dipendente\}\}/g, user.nome_cognome).replace(/\{\{data\}\}/g, new Date().toLocaleDateString('it-IT')).replace(/\{\{tipo_lettera\}\}/g, template.tipo_lettera).replace(/\{\{motivo\}\}/g, `Ordini sbagliati: ${selectedEmployee.count} ordini`).replace(/\{\{giorno_turno\}\}/g, 'N/A').replace(/\{\{orario_turno\}\}/g, 'N/A');
        const emailBody = replaceFn(et.corpo);
        const emailSubject = replaceFn(et.oggetto);
        await base44.integrations.Core.SendEmail({ to: user.email, subject: emailSubject, body: emailBody });
        await base44.entities.EmailLog.create({ tipo_notifica: 'lettera_richiamo', destinatario_email: user.email, destinatario_nome: user.nome_cognome, oggetto: emailSubject, corpo: emailBody, data_invio: new Date().toISOString(), inviato_da: currentUser.email, status: 'inviata', riferimento_id: letteraRichiamo.id });
      }
    } catch (emailError) {
      console.error('Errore invio email:', emailError);
      await base44.entities.EmailLog.create({ tipo_notifica: 'lettera_richiamo', destinatario_email: user?.email || 'N/A', destinatario_nome: user?.nome_cognome || selectedEmployee.dipendente_nome, oggetto: 'Notifica Lettera di Richiamo', corpo: 'Errore durante l\'invio', data_invio: new Date().toISOString(), inviato_da: currentUser.email, status: 'fallita', errore: emailError.message, riferimento_id: letteraRichiamo.id });
    }

    alert('✅ Lettera di richiamo creata con successo!');
    queryClient.invalidateQueries({ queryKey: ['wrong-orders'] });
    onClose();
  };

  const periodLabel = dateRange === 'week' ? 'Questa settimana' : dateRange === 'month' ? 'Questo mese' : dateRange === 'custom' ? `${customStartDate} - ${customEndDate}` : 'Tutti i periodi';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <NeumorphicCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-[#6b6b6b]">Lettera di Richiamo - {selectedEmployee.dipendente_nome}</h2>
            <button onClick={onClose} className="neumorphic-flat p-2 rounded-lg hover:bg-red-50"><X className="w-5 h-5 text-[#9b9b9b]" /></button>
          </div>
          <div className="neumorphic-pressed p-4 rounded-xl bg-orange-50 mb-6">
            <p className="text-sm font-bold text-orange-800 mb-2">📊 Riepilogo</p>
            <div className="text-xs text-orange-700 space-y-1">
              <p>• Ordini: <strong>{selectedEmployee.count}</strong></p>
              <p>• Rimborsi: <strong>€{selectedEmployee.totalRefunds.toFixed(2)}</strong></p>
              <p>• Periodo: <strong>{periodLabel}</strong></p>
            </div>
          </div>
          <div className="mb-6">
            <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">Template <span className="text-red-600">*</span></label>
            <select value={selectedTemplate} onChange={(e) => { setSelectedTemplate(e.target.value); const t = letterTemplates.find((t) => t.id === e.target.value); if (t) setLetterContent(t.contenuto || ''); }} className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none">
              <option value="">-- Seleziona --</option>
              {letterTemplates.map((t) => <option key={t.id} value={t.id}>{t.nome_template} - {t.tipo_lettera}</option>)}
            </select>
          </div>
          {selectedTemplate && <>
            <label className="flex items-center gap-2 text-sm text-[#6b6b6b] cursor-pointer mb-4"><input type="checkbox" checked={includeOrderDetails} onChange={(e) => setIncludeOrderDetails(e.target.checked)} className="w-4 h-4" /> Includi dettaglio ordini</label>
            <div className="mb-6">
              <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">Anteprima</label>
              <div className="neumorphic-pressed px-4 py-3 rounded-xl bg-white overflow-y-auto max-h-[300px]">
                <pre className="text-xs text-[#6b6b6b] whitespace-pre-wrap font-sans">{letterContent}{includeOrderDetails && '\n\n--- DETTAGLIO ORDINI SBAGLIATI ---\n\n' + selectedEmployee.orders.map((o,i) => `${i+1}. ${o.platform.toUpperCase()} - ${o.order_id} - ${new Date(o.order_date).toLocaleDateString('it-IT')}\n`).join('')}</pre>
              </div>
            </div>
            <textarea value={letterContent} onChange={(e) => setLetterContent(e.target.value)} className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none min-h-[150px] font-mono text-sm mb-6" placeholder="Modifica..." />
          </>}
          <div className="flex gap-3">
            <NeumorphicButton onClick={onClose} className="flex-1">Annulla</NeumorphicButton>
            <NeumorphicButton onClick={handleSend} variant="primary" className="flex-1" disabled={!selectedTemplate}><Send className="w-4 h-4 mr-2" />Invia</NeumorphicButton>
          </div>
        </NeumorphicCard>
      </div>
    </div>
  );
}