import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Shirt, Plus, Send, Eye, Trash2, CheckCircle, Edit, X, Loader2, Search
} from "lucide-react";
import NeumorphicCard from "../neumorphic/NeumorphicCard";
import NeumorphicButton from "../neumorphic/NeumorphicButton";

const TEMPLATE_CONTRATTO = `CRUNCH S.R.L. — Sa Pizzedda

CONTRATTO DI COMODATO D'USO — DIVISA AZIENDALE

Ai sensi degli artt. 1803–1812 del Codice Civile italiano

1. PARTI DEL CONTRATTO

Comodante: Crunch S.r.l. (di seguito "l'Azienda"), datore di lavoro del dipendente sottoscritto.

Comodatario: il/la dipendente {NOME_COGNOME_DIPENDENTE}, nato/a a {LUOGO_NASCITA} il {DATA_NASCITA}, codice fiscale {CODICE_FISCALE}, residente in {INDIRIZZO_RESIDENZA}.

2. OGGETTO DEL CONTRATTO

L'Azienda concede in comodato d'uso gratuito al/alla dipendente i capi di abbigliamento di seguito descritti, costituenti la divisa aziendale, necessari per lo svolgimento delle mansioni lavorative. I capi restano di proprietà esclusiva di Crunch S.r.l.

Capi consegnati:

{ELENCO_CAPI}

VALORE TOTALE DIVISA: € {VALORE_TOTALE_DIVISA}

3. CONDIZIONI D'USO

3.1 — I capi di abbigliamento sono concessi esclusivamente per uso professionale, durante le ore e nei luoghi di lavoro stabiliti dal contratto di lavoro subordinato.

3.2 — Il/La dipendente si impegna a: (i) utilizzare la divisa con cura e diligenza; (ii) mantenerla pulita e in buono stato; (iii) non cedere, prestare o alienare i capi a terzi; (iv) segnalare tempestivamente all'Azienda qualsiasi danno accidentale.

3.3 — L'usura derivante dall'uso normale e corretto non è addebitabile al dipendente. È addebitabile, invece, qualsiasi danno dovuto a negligenza, uso improprio, dolo o colpa grave.

4. RESTITUZIONE DEI CAPI

4.1 — Il/La dipendente è obbligato/a a restituire tutti i capi elencati all'Art. 2 entro e non oltre l'ultimo giorno di lavoro effettivo, indipendentemente dalla causa di cessazione del rapporto di lavoro (dimissioni, licenziamento, scadenza di contratto a termine, ecc.).

4.2 — La restituzione avviene nelle mani del responsabile di turno o del/della Store Manager, che rilascerà apposita ricevuta scritta.

4.3 — I capi devono essere restituiti puliti e in condizioni di normale usura da utilizzo lavorativo.

5. PENALI PER MANCATA RESTITUZIONE O DANNEGGIAMENTO

5.1 — MANCATA RESTITUZIONE: Qualora il/la dipendente non restituisca uno o più capi entro il termine di cui all'Art. 4.1, verrà applicata una trattenuta sull'ultimo stipendio pari al valore unitario di ogni capo non restituito, come indicato nella tabella dell'Art. 2.

5.2 — DANNEGGIAMENTO: In caso di restituzione di capi con danni eccedenti la normale usura, attribuibili a negligenza o uso improprio, l'Azienda potrà applicare una trattenuta proporzionale al danno accertato, fino al valore pieno del capo. Il danno sarà valutato e documentato per iscritto dal responsabile al momento della restituzione, con possibilità per il dipendente di prenderne visione.

5.3 — Le trattenute di cui ai commi precedenti saranno applicate nel rispetto di quanto previsto dalla normativa vigente (art. 2107 c.c. e D.Lgs. 66/2003) e dal CCNL applicato, garantendo in ogni caso che l'importo netto percepito non sia inferiore alle soglie di impignorabilità previste dalla legge.

5.4 — Prima di procedere a qualsiasi trattenuta, l'Azienda comunicherà per iscritto al dipendente l'importo e la motivazione, concedendo 5 giorni lavorativi per eventuali contestazioni.

6. DURATA

Il presente contratto ha durata pari a quella del rapporto di lavoro intercorrente tra le parti e cessa automaticamente alla data di cessazione del medesimo rapporto, fatto salvo l'obbligo di restituzione di cui all'Art. 4.

7. CLAUSOLA SPECIFICA EX ART. 1341 C.C.

Il/La dipendente dichiara di aver letto e di approvare specificamente, ai sensi e per gli effetti di cui agli artt. 1341 e 1342 c.c., le seguenti clausole: Art. 5 (Penali per mancata restituzione o danneggiamento) e Art. 4 (Restituzione dei capi).

8. FORO COMPETENTE E LEGGE APPLICABILE

Per qualsiasi controversia relativa al presente contratto, le parti concordano la competenza del Giudice del Lavoro del luogo ove è svolta la prestazione lavorativa. Si applica la legge italiana.

9. TRATTAMENTO DEI DATI PERSONALI

I dati personali raccolti nel presente contratto sono trattati da Crunch S.r.l. in qualità di Titolare del trattamento, ai sensi del Reg. UE 2016/679 (GDPR), per le finalità connesse all'esecuzione del contratto di lavoro. Informativa completa disponibile presso la sede aziendale.

FIRME

Luogo e data: Milano, {DATA_FIRMA}

Nome e cognome: {NOME_COGNOME_DIPENDENTE}

Data: {DATA_FIRMA}

Firma: `;

const VALORI_UNITARI = {
  'Bandana': 5,
  'Pantaloni': 25,
  'Grembiule': 25,
  'Maglietta': 10,
  'Magliette': 10,
  'Scarpe': 30,
  'Scarpa': 30
};

const GRUPPI_LABELS = { FT: "Full Time", PT: "Part Time", CM: "Contratto Misto" };

function CreaComodatoModal({ users, employees, contratti, divisaConfig, onClose, onCreated }) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [previewText, setPreviewText] = useState('');

  // Build element list from config or fallback
  const configElementi = divisaConfig?.elementi_divisa || Object.keys(VALORI_UNITARI);
  const dotazione = divisaConfig?.dotazione_per_gruppo || {};

  const [capi, setCapi] = useState(
    configElementi.map(nome => ({
      nome,
      quantita: 0,
      valore_unitario: VALORI_UNITARI[nome] || 10,
      totale: 0,
      note: ''
    }))
  );

  // Use employees list (accessible by all roles) instead of users
  const allDipendenti = employees.filter(e => e.status === 'active');
  const filteredDipendenti = allDipendenti.filter(e => {
    const name = (e.full_name || e.email || '').toLowerCase();
    return name.includes(searchTerm.toLowerCase());
  });

  // Find selected employee and their contract/user data
  const selectedEmployee = employees.find(e => e.employee_id_external === selectedUserId || e.id === selectedUserId);
  const selectedUser = users.find(u => u.id === selectedUserId) || null;
  const selectedContratto = contratti.find(c => c.user_id === selectedUserId && c.status === 'firmato');
  const employeeGroup = selectedContratto?.employee_group || selectedEmployee?.employee_group || null;
  const recommendedQty = employeeGroup && dotazione[employeeGroup] ? dotazione[employeeGroup] : null;

  const updateCapo = (idx, field, value) => {
    setCapi(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      if (field === 'quantita') {
        updated[idx].totale = (parseInt(value) || 0) * updated[idx].valore_unitario;
      }
      return updated;
    });
  };

  // Auto-fill recommended quantities when employee selected
  const applyRecommended = () => {
    if (!recommendedQty) return;
    setCapi(prev => prev.map(c => {
      const rec = recommendedQty[c.nome] || 0;
      return { ...c, quantita: rec, totale: rec * c.valore_unitario };
    }));
  };

  const valoreTotale = capi.reduce((sum, c) => sum + c.totale, 0);
  const anySelected = capi.some(c => c.quantita > 0);

  const generateContratto = () => {
    const dipName = selectedEmployee?.full_name || selectedUser?.nome_cognome || selectedUser?.full_name || '';
    if (!dipName) return '';
    const oggi = new Date().toLocaleDateString('it-IT');

    const userData = selectedUser || {};
    const contrattoData = selectedContratto || {};

    const elencoCapi = capi
      .filter(c => c.quantita > 0)
      .map(c => `- ${c.nome} — valore unitario € ${c.valore_unitario.toFixed(2)} — quantità: ${c.quantita} — totale: € ${c.totale.toFixed(2)} — note: ${c.note || 'nessuna'}`)
      .join('\n\n');

    let text = TEMPLATE_CONTRATTO;
    text = text.replace(/{NOME_COGNOME_DIPENDENTE}/g, dipName);
    text = text.replace(/{LUOGO_NASCITA}/g, contrattoData.citta_nascita || userData.citta_nascita || '___');
    text = text.replace(/{DATA_NASCITA}/g, (contrattoData.data_nascita || userData.data_nascita) ? new Date(contrattoData.data_nascita || userData.data_nascita).toLocaleDateString('it-IT') : '___');
    text = text.replace(/{CODICE_FISCALE}/g, contrattoData.codice_fiscale || userData.codice_fiscale || '___');
    text = text.replace(/{INDIRIZZO_RESIDENZA}/g, contrattoData.indirizzo_residenza || userData.indirizzo_residenza || '___');
    text = text.replace(/{ELENCO_CAPI}/g, elencoCapi);
    text = text.replace(/{VALORE_TOTALE_DIVISA}/g, valoreTotale.toFixed(2));
    text = text.replace(/{DATA_FIRMA}/g, oggi);

    return text;
  };

  const handlePreview = () => {
    setPreviewText(generateContratto());
  };

  const handleSave = async () => {
    const dipName = selectedEmployee?.full_name || selectedUser?.nome_cognome || selectedUser?.full_name || '';
    const dipEmail = selectedEmployee?.email || selectedUser?.email || '';
    if (!dipName || !anySelected) return;
    setSaving(true);

    const contenuto = generateContratto();
    const elementiConsegnati = capi
      .filter(c => c.quantita > 0)
      .map(c => ({
        nome: c.nome,
        quantita: c.quantita,
        valore_unitario: c.valore_unitario,
        totale: c.totale,
        note: c.note
      }));

    await base44.entities.ComodatoDivisa.create({
      user_id: selectedUserId,
      user_email: dipEmail,
      dipendente_nome: dipName,
      contenuto_contratto: contenuto,
      elementi_consegnati: elementiConsegnati,
      valore_totale: valoreTotale,
      status: 'bozza',
      note
    });

    setSaving(false);
    onCreated();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="max-w-5xl w-full max-h-[90vh] flex gap-4">
        <NeumorphicCard className="w-1/2 p-6 overflow-y-auto">
          <div className="flex justify-between mb-4">
            <h2 className="text-xl font-bold">Nuovo Comodato d'Uso</h2>
            <button onClick={onClose}><X className="w-5 h-5" /></button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Dipendente *</label>
              <div className="relative mb-2">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Cerca dipendente..."
                  className="w-full neumorphic-pressed pl-9 pr-4 py-2.5 rounded-xl outline-none text-sm"
                />
              </div>
              <select
                value={selectedUserId}
                onChange={e => setSelectedUserId(e.target.value)}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
              >
                <option value="">Seleziona...</option>
                {filteredDipendenti.map(e => (
                  <option key={e.id} value={e.employee_id_external || e.id}>
                    {e.full_name || e.email}
                  </option>
                ))}
              </select>
            </div>

            {selectedEmployee && (
              <div className="neumorphic-pressed p-3 rounded-xl bg-blue-50 text-sm space-y-1">
                <p><strong>Dipendente:</strong> {selectedEmployee.full_name}</p>
                {employeeGroup && (
                  <p><strong>Contratto:</strong> {GRUPPI_LABELS[employeeGroup] || employeeGroup}</p>
                )}
                {recommendedQty && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-blue-600">Dotazione consigliata disponibile</span>
                    <button
                      type="button"
                      onClick={applyRecommended}
                      className="text-xs font-bold text-white bg-blue-500 px-2 py-0.5 rounded-lg hover:bg-blue-600"
                    >
                      Applica
                    </button>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Capi da consegnare *</label>
              <div className="space-y-3">
                {capi.map((c, idx) => (
                  <div key={c.nome} className="neumorphic-pressed p-3 rounded-xl">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-slate-700 text-sm">{c.nome}</span>
                      <div className="flex items-center gap-2">
                        {recommendedQty && recommendedQty[c.nome] > 0 && (
                          <span className="text-xs text-blue-500 font-medium">
                            (consigliato: {recommendedQty[c.nome]})
                          </span>
                        )}
                        <span className="text-xs text-slate-500">€ {c.valore_unitario.toFixed(2)}/pz</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={0}
                        value={c.quantita}
                        onChange={e => updateCapo(idx, 'quantita', e.target.value)}
                        className="w-20 neumorphic-flat px-3 py-1.5 rounded-lg text-center text-sm outline-none"
                      />
                      <input
                        type="text"
                        value={c.note}
                        onChange={e => updateCapo(idx, 'note', e.target.value)}
                        placeholder="Note (taglia, colore...)"
                        className="flex-1 neumorphic-flat px-3 py-1.5 rounded-lg text-sm outline-none"
                      />
                      {c.quantita > 0 && (
                        <span className="text-sm font-bold text-blue-600">€ {c.totale.toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {anySelected && (
              <div className="neumorphic-pressed p-3 rounded-xl bg-green-50 flex justify-between items-center">
                <span className="font-medium text-green-800">Totale Divisa</span>
                <span className="text-xl font-bold text-green-700">€ {valoreTotale.toFixed(2)}</span>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Note (opzionale)</label>
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Note aggiuntive..."
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
              />
            </div>

            <div className="flex gap-2">
              <NeumorphicButton
                onClick={handlePreview}
                disabled={!selectedEmployee || !anySelected}
                className="flex-1 flex items-center justify-center gap-2"
              >
                <Eye className="w-4 h-4" /> Anteprima
              </NeumorphicButton>
              <NeumorphicButton
                onClick={handleSave}
                disabled={!selectedEmployee || !anySelected || saving}
                variant="primary"
                className="flex-1 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Crea Bozza
              </NeumorphicButton>
            </div>
          </div>
        </NeumorphicCard>

        <NeumorphicCard className="w-1/2 p-6 overflow-y-auto">
          <h2 className="text-xl font-bold mb-4">Anteprima Contratto</h2>
          {previewText ? (
            <div className="neumorphic-pressed p-4 rounded-xl">
              <pre className="whitespace-pre-wrap text-xs text-slate-700 font-sans">{previewText}</pre>
            </div>
          ) : (
            <div className="neumorphic-pressed p-6 rounded-xl bg-slate-50 text-center">
              <Shirt className="w-16 h-16 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">Seleziona un dipendente e i capi da consegnare, poi clicca "Anteprima"</p>
            </div>
          )}
        </NeumorphicCard>
      </div>
    </div>
  );
}

export default function ComodatoDivisaAdmin() {
  const [showForm, setShowForm] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const queryClient = useQueryClient();

  const { data: comodati = [], isLoading } = useQuery({
    queryKey: ['comodati-divisa'],
    queryFn: () => base44.entities.ComodatoDivisa.list('-created_date')
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users-comodato'],
    queryFn: async () => { try { return await base44.entities.User.list(); } catch { return []; } }
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees-comodato'],
    queryFn: () => base44.entities.Employee.filter({ status: 'active' })
  });

  const { data: contratti = [] } = useQuery({
    queryKey: ['contratti-comodato'],
    queryFn: () => base44.entities.Contratto.list()
  });

  const { data: divisaConfigs = [] } = useQuery({
    queryKey: ['divisa-config-comodato'],
    queryFn: () => base44.entities.DivisaConfig.list()
  });

  const activeDivisaConfig = divisaConfigs.find(c => c.is_active) || null;

  const deleteMutation = useMutation({
    mutationFn: id => base44.entities.ComodatoDivisa.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comodati-divisa'] })
  });

  const sendMutation = useMutation({
    mutationFn: async (comodato) => {
      await base44.integrations.Core.SendEmail({
        to: comodato.user_email,
        subject: 'Contratto Comodato d\'Uso Divisa - Sa Pizzedda',
        body: `Gentile ${comodato.dipendente_nome},\n\nÈ stato generato il contratto di comodato d'uso per la divisa aziendale.\nPuoi visualizzarlo e firmarlo accedendo alla sezione Documenti della piattaforma.\n\nCordiali saluti,\nSa Pizzedda`
      });
      await base44.entities.ComodatoDivisa.update(comodato.id, {
        status: 'inviato',
        data_invio: new Date().toISOString()
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comodati-divisa'] })
  });

  const handleSend = (comodato) => {
    if (!confirm(`Inviare il comodato d'uso a ${comodato.dipendente_nome}?`)) return;
    sendMutation.mutate(comodato);
  };

  const getStatusBadge = (status) => {
    const map = {
      'bozza': { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Bozza' },
      'inviato': { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Inviato' },
      'firmato': { bg: 'bg-green-100', text: 'text-green-700', label: 'Firmato ✓' }
    };
    const b = map[status] || map.bozza;
    return <span className={`px-3 py-1 rounded-full text-xs font-bold ${b.bg} ${b.text}`}>{b.label}</span>;
  };

  if (isLoading) {
    return (
      <NeumorphicCard className="p-8 text-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
      </NeumorphicCard>
    );
  }

  const daFirmare = comodati.filter(c => c.status !== 'firmato');
  const firmati = comodati.filter(c => c.status === 'firmato');

  return (
    <>
      <div className="flex gap-3 mb-6">
        <NeumorphicButton onClick={() => setShowForm(true)} variant="primary" className="flex items-center gap-2">
          <Plus className="w-5 h-5" /> Nuovo Comodato d'Uso
        </NeumorphicButton>
      </div>

      {comodati.length === 0 ? (
        <NeumorphicCard className="p-8 text-center">
          <Shirt className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Nessun contratto di comodato creato</p>
          <p className="text-xs text-slate-400 mt-1">Crea un nuovo comodato quando consegni le divise ai dipendenti</p>
        </NeumorphicCard>
      ) : (
        <div className="space-y-6">
          {daFirmare.length > 0 && (
            <NeumorphicCard className="p-6">
              <h3 className="text-lg font-bold text-slate-700 mb-3 flex items-center gap-2">
                <Edit className="w-5 h-5 text-orange-600" />
                Da Firmare ({daFirmare.length})
              </h3>
              <div className="space-y-3">
                {daFirmare.map(c => (
                  <NeumorphicCard key={c.id} className="p-4 border-l-4 border-orange-400">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-bold text-slate-700">{c.dipendente_nome}</p>
                        <p className="text-sm text-slate-500">
                          {(c.elementi_consegnati || []).map(e => `${e.nome} x${e.quantita}`).join(', ')}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Valore: € {(c.valore_totale || 0).toFixed(2)} •
                          Creato: {new Date(c.created_date).toLocaleDateString('it-IT')}
                        </p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0 items-center">
                        {getStatusBadge(c.status)}
                        <button onClick={() => setPreviewDoc(c)} className="nav-button p-2 rounded-lg">
                          <Eye className="w-4 h-4 text-purple-600" />
                        </button>
                        {c.status === 'bozza' && (
                          <button onClick={() => handleSend(c)} className="nav-button p-2 rounded-lg">
                            <Send className="w-4 h-4 text-green-600" />
                          </button>
                        )}
                        <button onClick={() => { if (confirm('Eliminare?')) deleteMutation.mutate(c.id); }} className="nav-button p-2 rounded-lg">
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                  </NeumorphicCard>
                ))}
              </div>
            </NeumorphicCard>
          )}

          {firmati.length > 0 && (
            <NeumorphicCard className="p-6">
              <h3 className="text-lg font-bold text-slate-700 mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Firmati ({firmati.length})
              </h3>
              <div className="space-y-3">
                {firmati.map(c => (
                  <NeumorphicCard key={c.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-bold text-slate-700">{c.dipendente_nome}</p>
                        <p className="text-sm text-slate-500">
                          {(c.elementi_consegnati || []).map(e => `${e.nome} x${e.quantita}`).join(', ')}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Firmato: {c.data_firma ? new Date(c.data_firma).toLocaleDateString('it-IT') : 'N/A'}
                          {c.firma_dipendente && ` • Firma: ${c.firma_dipendente}`}
                        </p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0 items-center">
                        {getStatusBadge(c.status)}
                        <button onClick={() => setPreviewDoc(c)} className="nav-button p-2 rounded-lg">
                          <Eye className="w-4 h-4 text-purple-600" />
                        </button>
                      </div>
                    </div>
                  </NeumorphicCard>
                ))}
              </div>
            </NeumorphicCard>
          )}
        </div>
      )}

      {showForm && (
        <CreaComodatoModal
          users={users}
          employees={employees}
          contratti={contratti}
          divisaConfig={activeDivisaConfig}
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            queryClient.invalidateQueries({ queryKey: ['comodati-divisa'] });
          }}
        />
      )}

      {previewDoc && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <NeumorphicCard className="max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-bold">Comodato d'Uso - {previewDoc.dipendente_nome}</h2>
              <button onClick={() => setPreviewDoc(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="neumorphic-pressed p-6 rounded-xl bg-white">
              <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans">{previewDoc.contenuto_contratto}</pre>
            </div>
          </NeumorphicCard>
        </div>
      )}
    </>
  );
}