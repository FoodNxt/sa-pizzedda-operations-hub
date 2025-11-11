import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckSquare,
  Save,
  AlertCircle,
  CheckCircle,
  User,
  FileText,
  Calendar,
  Settings
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";

export default function GestioneAccessoPagine() {
  const [pageConfig, setPageConfig] = useState({
    after_registration: ['ProfiloDipendente'],
    after_contract_received: ['ProfiloDipendente', 'ContrattiDipendente'],
    after_contract_signed: ['ProfiloDipendente', 'ContrattiDipendente', 'Academy'],
    after_contract_start: [
      'ProfiloDipendente',
      'ContrattiDipendente', 
      'Academy',
      'Valutazione',
      'ControlloPuliziaCassiere',
      'ControlloPuliziaPizzaiolo',
      'ControlloPuliziaStoreManager',
      'FormInventario',
      'ConteggioCassa',
      'TeglieButtate',
      'Preparazioni'
    ]
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const availablePages = [
    { value: 'ProfiloDipendente', label: 'Il Mio Profilo', icon: User },
    { value: 'ContrattiDipendente', label: 'Contratti', icon: FileText },
    { value: 'Academy', label: 'Academy', icon: CheckSquare },
    { value: 'Valutazione', label: 'La Tua Valutazione', icon: CheckSquare },
    { value: 'ControlloPuliziaCassiere', label: 'Controllo Pulizia Cassiere', icon: CheckSquare },
    { value: 'ControlloPuliziaPizzaiolo', label: 'Controllo Pulizia Pizzaiolo', icon: CheckSquare },
    { value: 'ControlloPuliziaStoreManager', label: 'Controllo Pulizia Store Manager', icon: CheckSquare },
    { value: 'FormInventario', label: 'Form Inventario', icon: CheckSquare },
    { value: 'ConteggioCassa', label: 'Conteggio Cassa', icon: CheckSquare },
    { value: 'TeglieButtate', label: 'Teglie Buttate', icon: CheckSquare },
    { value: 'Preparazioni', label: 'Preparazioni', icon: CheckSquare }
  ];

  const handlePageToggle = (stage, pageName) => {
    setPageConfig(prev => {
      const currentPages = prev[stage];
      const hasPage = currentPages.includes(pageName);
      
      return {
        ...prev,
        [stage]: hasPage
          ? currentPages.filter(p => p !== pageName)
          : [...currentPages, pageName]
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);

    try {
      // In a real implementation, you would save this to a database
      // For now, we'll just simulate a save
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      
      alert('Configurazione salvata! Nota: questa configurazione è attualmente hard-coded nel Layout.js. Per applicarla effettivamente, dovrai aggiornare il codice del Layout.');
    } catch (error) {
      alert('Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <CheckSquare className="w-10 h-10 text-[#8b7355]" />
          <h1 className="text-3xl font-bold text-[#6b6b6b]">Gestione Accesso Pagine</h1>
        </div>
        <p className="text-[#9b9b9b]">Configura quali pagine sono visibili ai dipendenti in base al loro stato</p>
      </div>

      {/* Current Logic Info */}
      <NeumorphicCard className="p-6 bg-blue-50 border-2 border-blue-300">
        <div className="flex items-start gap-3">
          <Settings className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-bold text-blue-800 mb-2">📋 Logica Attuale nel Sistema</h3>
            <p className="text-sm text-blue-700 mb-3">
              Questa pagina mostra la configurazione attuale dell'accesso progressivo per i dipendenti. 
              La logica è implementata nel <code className="bg-white px-2 py-1 rounded">Layout.js</code>.
            </p>
            <div className="text-xs text-blue-600">
              <p className="mb-1">🔹 Il sistema controlla automaticamente:</p>
              <ul className="list-disc list-inside space-y-1 ml-3">
                <li>Se l'utente ha ruoli assegnati</li>
                <li>Se ha ricevuto un contratto (status "inviato" o "firmato")</li>
                <li>Se ha firmato il contratto (status "firmato")</li>
                <li>Se la data di inizio contratto è passata</li>
              </ul>
            </div>
          </div>
        </div>
      </NeumorphicCard>

      {/* Stage 1: After Registration */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="neumorphic-flat w-12 h-12 rounded-full flex items-center justify-center">
            <span className="text-xl font-bold text-[#8b7355]">1</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#6b6b6b]">Utente Appena Registrato</h2>
            <p className="text-sm text-[#9b9b9b]">Senza ruoli assegnati</p>
          </div>
        </div>

        <div className="neumorphic-pressed p-5 rounded-xl">
          <p className="text-sm text-[#6b6b6b] mb-3 font-medium">Pagine Visibili:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {availablePages.map(page => (
              <div key={page.value} className="neumorphic-flat p-3 rounded-lg">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pageConfig.after_registration.includes(page.value)}
                    onChange={() => handlePageToggle('after_registration', page.value)}
                    className="w-5 h-5 rounded"
                  />
                  <span className="text-[#6b6b6b] text-sm">{page.label}</span>
                </label>
              </div>
            ))}
          </div>
        </div>
      </NeumorphicCard>

      {/* Stage 2: After Contract Received */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="neumorphic-flat w-12 h-12 rounded-full flex items-center justify-center">
            <span className="text-xl font-bold text-[#8b7355]">2</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#6b6b6b]">Contratto Ricevuto</h2>
            <p className="text-sm text-[#9b9b9b]">Ha ricevuto un contratto (status "inviato")</p>
          </div>
        </div>

        <div className="neumorphic-pressed p-5 rounded-xl">
          <p className="text-sm text-[#6b6b6b] mb-3 font-medium">Pagine Visibili:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {availablePages.map(page => (
              <div key={page.value} className="neumorphic-flat p-3 rounded-lg">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pageConfig.after_contract_received.includes(page.value)}
                    onChange={() => handlePageToggle('after_contract_received', page.value)}
                    className="w-5 h-5 rounded"
                  />
                  <span className="text-[#6b6b6b] text-sm">{page.label}</span>
                </label>
              </div>
            ))}
          </div>
        </div>
      </NeumorphicCard>

      {/* Stage 3: After Contract Signed */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="neumorphic-flat w-12 h-12 rounded-full flex items-center justify-center">
            <span className="text-xl font-bold text-[#8b7355]">3</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#6b6b6b]">Contratto Firmato</h2>
            <p className="text-sm text-[#9b9b9b]">Ha firmato il contratto (status "firmato")</p>
          </div>
        </div>

        <div className="neumorphic-pressed p-5 rounded-xl">
          <p className="text-sm text-[#6b6b6b] mb-3 font-medium">Pagine Visibili:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {availablePages.map(page => (
              <div key={page.value} className="neumorphic-flat p-3 rounded-lg">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pageConfig.after_contract_signed.includes(page.value)}
                    onChange={() => handlePageToggle('after_contract_signed', page.value)}
                    className="w-5 h-5 rounded"
                  />
                  <span className="text-[#6b6b6b] text-sm">{page.label}</span>
                </label>
              </div>
            ))}
          </div>
        </div>
      </NeumorphicCard>

      {/* Stage 4: After Contract Start Date */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="neumorphic-flat w-12 h-12 rounded-full flex items-center justify-center">
            <span className="text-xl font-bold text-[#8b7355]">4</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#6b6b6b]">Contratto Iniziato</h2>
            <p className="text-sm text-[#9b9b9b]">Data inizio contratto ≥ data odierna (E contratto firmato)</p>
          </div>
        </div>

        <div className="neumorphic-pressed p-5 rounded-xl">
          <p className="text-sm text-[#6b6b6b] mb-3 font-medium">Pagine Visibili:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {availablePages.map(page => (
              <div key={page.value} className="neumorphic-flat p-3 rounded-lg">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pageConfig.after_contract_start.includes(page.value)}
                    onChange={() => handlePageToggle('after_contract_start', page.value)}
                    className="w-5 h-5 rounded"
                  />
                  <span className="text-[#6b6b6b] text-sm">{page.label}</span>
                </label>
              </div>
            ))}
          </div>
        </div>
      </NeumorphicCard>

      {/* Save Button */}
      <div className="flex justify-end">
        <NeumorphicButton
          onClick={handleSave}
          variant="primary"
          disabled={saving}
          className="flex items-center gap-2 px-8 py-4"
        >
          {saving ? (
            <>
              <div className="w-5 h-5 border-2 border-[#8b7355] border-t-transparent rounded-full animate-spin" />
              Salvataggio...
            </>
          ) : saved ? (
            <>
              <CheckCircle className="w-5 h-5" />
              Salvato!
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Salva Configurazione
            </>
          )}
        </NeumorphicButton>
      </div>

      {/* Info Box */}
      <NeumorphicCard className="p-6 bg-yellow-50">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-yellow-700 flex-shrink-0 mt-1" />
          <div className="text-sm text-yellow-800">
            <p className="font-medium mb-2">⚠️ Nota Importante</p>
            <ul className="text-xs space-y-1 list-disc list-inside">
              <li>Questa pagina mostra la configurazione ATTUALE hard-coded nel <code className="bg-white px-2 py-1 rounded">Layout.js</code></li>
              <li>Le modifiche qui NON vengono applicate automaticamente al codice</li>
              <li>Per modificare effettivamente il comportamento, è necessario aggiornare la logica nel file Layout.js</li>
              <li>I campi "Controllo Pulizia" sono visibili SOLO ai dipendenti con i ruoli corrispondenti (Cassiere, Pizzaiolo, Store Manager)</li>
              <li>La logica attuale funziona così:
                <ul className="list-disc list-inside ml-4 mt-1 space-y-0.5">
                  <li><strong>Fase 1:</strong> Nessun ruolo → SOLO Profilo</li>
                  <li><strong>Fase 2:</strong> Contratto ricevuto → + Contratti</li>
                  <li><strong>Fase 3:</strong> Contratto firmato → + Academy</li>
                  <li><strong>Fase 4:</strong> Data inizio contratto passata + firmato → Accesso completo</li>
                </ul>
              </li>
            </ul>
          </div>
        </div>
      </NeumorphicCard>

      {/* Summary Visual */}
      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-[#6b6b6b] mb-4">Riepilogo Configurazione Attuale</h2>
        
        <div className="space-y-4">
          <div className="neumorphic-flat p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="neumorphic-pressed w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-[#8b7355]">1</span>
              <h3 className="font-bold text-[#6b6b6b]">Registrazione → {pageConfig.after_registration.length} pagina/e</h3>
            </div>
            <div className="flex flex-wrap gap-2 ml-10">
              {pageConfig.after_registration.map(p => (
                <span key={p} className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
                  {availablePages.find(ap => ap.value === p)?.label || p}
                </span>
              ))}
            </div>
          </div>

          <div className="neumorphic-flat p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="neumorphic-pressed w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-[#8b7355]">2</span>
              <h3 className="font-bold text-[#6b6b6b]">Contratto Ricevuto → {pageConfig.after_contract_received.length} pagina/e</h3>
            </div>
            <div className="flex flex-wrap gap-2 ml-10">
              {pageConfig.after_contract_received.map(p => (
                <span key={p} className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-medium">
                  {availablePages.find(ap => ap.value === p)?.label || p}
                </span>
              ))}
            </div>
          </div>

          <div className="neumorphic-flat p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="neumorphic-pressed w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-[#8b7355]">3</span>
              <h3 className="font-bold text-[#6b6b6b]">Contratto Firmato → {pageConfig.after_contract_signed.length} pagina/e</h3>
            </div>
            <div className="flex flex-wrap gap-2 ml-10">
              {pageConfig.after_contract_signed.map(p => (
                <span key={p} className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-medium">
                  {availablePages.find(ap => ap.value === p)?.label || p}
                </span>
              ))}
            </div>
          </div>

          <div className="neumorphic-flat p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="neumorphic-pressed w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-[#8b7355]">4</span>
              <h3 className="font-bold text-[#6b6b6b]">Contratto Iniziato → {pageConfig.after_contract_start.length} pagina/e</h3>
            </div>
            <div className="flex flex-wrap gap-2 ml-10">
              {pageConfig.after_contract_start.map(p => (
                <span key={p} className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
                  {availablePages.find(ap => ap.value === p)?.label || p}
                </span>
              ))}
            </div>
          </div>
        </div>
      </NeumorphicCard>

      {/* Workflow Visual */}
      <NeumorphicCard className="p-6 bg-green-50">
        <h3 className="font-bold text-green-800 mb-4 flex items-center gap-2">
          <CheckCircle className="w-6 h-6" />
          ✅ Workflow Progressivo Implementato
        </h3>
        <div className="space-y-3 text-sm text-green-700">
          <div className="flex items-start gap-3">
            <span className="font-bold text-green-900">→</span>
            <span>Il dipendente si <strong>registra</strong> → Vede solo <strong>Profilo</strong></span>
          </div>
          <div className="flex items-start gap-3">
            <span className="font-bold text-green-900">→</span>
            <span>Admin compila dati e <strong>manda contratto</strong> → Vede <strong>Profilo + Contratti</strong></span>
          </div>
          <div className="flex items-start gap-3">
            <span className="font-bold text-green-900">→</span>
            <span>Dipendente <strong>firma contratto</strong> → Vede <strong>Profilo + Contratti + Academy</strong></span>
          </div>
          <div className="flex items-start gap-3">
            <span className="font-bold text-green-900">→</span>
            <span>Arriva la <strong>data inizio contratto</strong> → Vede <strong>tutto</strong> (Valutazione, Form operativi, etc.)</span>
          </div>
        </div>
      </NeumorphicCard>
    </div>
  );
}