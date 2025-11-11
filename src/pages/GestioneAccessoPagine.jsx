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
  Settings,
  Shield,
  Users
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";

export default function GestioneAccessoPagine() {
  const queryClient = useQueryClient();

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['page-access-config'],
    queryFn: async () => {
      const result = await base44.entities.PageAccessConfig.list();
      return result;
    },
  });

  const activeConfig = configs.find(c => c.is_active) || null;

  const [pageConfig, setPageConfig] = useState({
    admin_pages: activeConfig?.admin_pages || [],
    manager_pages: activeConfig?.manager_pages || [],
    after_registration: activeConfig?.after_registration || ['ProfiloDipendente'],
    after_contract_received: activeConfig?.after_contract_received || ['ProfiloDipendente', 'ContrattiDipendente'],
    after_contract_signed: activeConfig?.after_contract_signed || ['ProfiloDipendente', 'ContrattiDipendente', 'Academy'],
    after_contract_start: activeConfig?.after_contract_start || [
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

  const updateConfigMutation = useMutation({
    mutationFn: async (data) => {
      if (activeConfig) {
        return await base44.entities.PageAccessConfig.update(activeConfig.id, data);
      } else {
        return await base44.entities.PageAccessConfig.create({
          ...data,
          config_name: 'default_config',
          is_active: true
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page-access-config'] });
    },
  });

  React.useEffect(() => {
    if (activeConfig) {
      setPageConfig({
        admin_pages: activeConfig.admin_pages || [],
        manager_pages: activeConfig.manager_pages || [],
        after_registration: activeConfig.after_registration || ['ProfiloDipendente'],
        after_contract_received: activeConfig.after_contract_received || ['ProfiloDipendente', 'ContrattiDipendente'],
        after_contract_signed: activeConfig.after_contract_signed || ['ProfiloDipendente', 'ContrattiDipendente', 'Academy'],
        after_contract_start: activeConfig.after_contract_start || [
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
    }
  }, [activeConfig]);

  const allAdminPages = [
    // Dashboard
    { value: 'Dashboard', label: 'Dashboard Overview', category: 'Dashboard' },
    { value: 'SummaryAI', label: 'Summary AI', category: 'Dashboard' },
    
    // Reviews
    { value: 'StoreReviews', label: 'Store Reviews', category: 'Reviews' },
    { value: 'AssignReviews', label: 'Assign Reviews', category: 'Reviews' },
    { value: 'EmployeeReviewsPerformance', label: 'Employee Reviews', category: 'Reviews' },
    
    // Financials
    { value: 'RealTime', label: 'Real Time', category: 'Financials' },
    { value: 'Financials', label: 'Financials', category: 'Financials' },
    { value: 'ChannelComparison', label: 'Channel Comparison', category: 'Financials' },
    { value: 'StoricoCassa', label: 'Storico Cassa', category: 'Financials' },
    
    // Inventory
    { value: 'Inventory', label: 'Inventory Dashboard', category: 'Inventory' },
    { value: 'Ricette', label: 'Ricette', category: 'Inventory' },
    { value: 'InventarioAdmin', label: 'Inventario Admin', category: 'Inventory' },
    { value: 'FormInventario', label: 'Form Inventario', category: 'Inventory' },
    { value: 'FormCantina', label: 'Form Cantina', category: 'Inventory' },
    { value: 'QuantitaMinime', label: 'Quantità Minime', category: 'Inventory' },
    { value: 'ElencoFornitori', label: 'Elenco Fornitori', category: 'Inventory' },
    { value: 'UploadFattureXML', label: 'Upload Fatture XML', category: 'Inventory' },
    { value: 'ProdottiVenduti', label: 'Prodotti Venduti', category: 'Inventory' },
    { value: 'TeglieButtate', label: 'Teglie Buttate', category: 'Inventory' },
    { value: 'Preparazioni', label: 'Preparazioni', category: 'Inventory' },
    
    // HR
    { value: 'Employees', label: 'Employees', category: 'HR' },
    { value: 'Shifts', label: 'Shifts', category: 'HR' },
    { value: 'Payroll', label: 'Payroll', category: 'HR' },
    { value: 'Contratti', label: 'Contratti', category: 'HR' },
    { value: 'AlertPeriodoProva', label: 'Alert Periodo Prova', category: 'HR' },
    { value: 'HRAdmin', label: 'HR Admin', category: 'HR' },
    { value: 'AcademyAdmin', label: 'Academy Admin', category: 'HR' },
    { value: 'RecalculateShifts', label: 'Ricalcola Ritardi Turni', category: 'HR' },
    { value: 'CleanupDuplicateShifts', label: 'Elimina Turni Duplicati', category: 'HR' },
    
    // Pulizie
    { value: 'Pulizie', label: 'Storico Pulizie', category: 'Pulizie' },
    { value: 'ControlloPulizieMaster', label: 'Controllo Pulizie Master', category: 'Pulizie' },
    { value: 'ControlloPuliziaCassiere', label: 'Controllo Pulizia Cassiere', category: 'Pulizie' },
    { value: 'ControlloPuliziaPizzaiolo', label: 'Controllo Pulizia Pizzaiolo', category: 'Pulizie' },
    { value: 'ControlloPuliziaStoreManager', label: 'Controllo Pulizia Store Manager', category: 'Pulizie' },
    
    // Delivery
    { value: 'OrdiniSbagliati', label: 'Ordini Sbagliati', category: 'Delivery' },
    { value: 'MatchingOrdiniSbagliati', label: 'Matching Ordini Sbagliati', category: 'Delivery' },
    
    // Zapier (Admin Only)
    { value: 'ZapierSetup', label: 'Zapier Reviews', category: 'Zapier' },
    { value: 'ShiftsSetup', label: 'Zapier Shifts', category: 'Zapier' },
    { value: 'OrderItemsSetup', label: 'Zapier Orders', category: 'Zapier' },
    { value: 'InventorySetup', label: 'Zapier Inventory', category: 'Zapier' },
    { value: 'IPraticoSetup', label: 'Zapier iPratico', category: 'Zapier' },
    { value: 'IPraticoBulkImport', label: 'Bulk Import iPratico', category: 'Zapier' },
    { value: 'ZapierProdottiVenduti', label: 'Zapier Prodotti Venduti', category: 'Zapier' },
    { value: 'BulkImportProdottiVenduti', label: 'Bulk Import Prodotti Venduti', category: 'Zapier' },
    
    // Sistema (Admin Only)
    { value: 'UsersManagement', label: 'Gestione Utenti', category: 'Sistema' },
    { value: 'GestioneAccessoPagine', label: 'Gestione Accesso Pagine', category: 'Sistema' },
    { value: 'FunzionamentoApp', label: 'Funzionamento App', category: 'Sistema' }
  ];

  const availableDipendentiPages = [
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

  const handlePageToggle = (userType, pageName) => {
    setPageConfig(prev => {
      const key = userType === 'admin' ? 'admin_pages' : userType === 'manager' ? 'manager_pages' : userType;
      const currentPages = prev[key];
      const hasPage = currentPages.includes(pageName);
      
      return {
        ...prev,
        [key]: hasPage
          ? currentPages.filter(p => p !== pageName)
          : [...currentPages, pageName]
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);

    try {
      await updateConfigMutation.mutateAsync(pageConfig);
      
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      
      alert('✅ Configurazione salvata con successo! Le modifiche sono ora attive. Ricarica la pagina per vedere i cambiamenti.');
    } catch (error) {
      console.error('Error saving config:', error);
      alert('Errore durante il salvataggio: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const groupPagesByCategory = () => {
    const grouped = {};
    allAdminPages.forEach(page => {
      if (!grouped[page.category]) {
        grouped[page.category] = [];
      }
      grouped[page.category].push(page);
    });
    return grouped;
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto">
        <NeumorphicCard className="p-8 text-center">
          <p className="text-[#9b9b9b]">Caricamento configurazione...</p>
        </NeumorphicCard>
      </div>
    );
  }

  const groupedPages = groupPagesByCategory();

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <CheckSquare className="w-10 h-10 text-[#8b7355]" />
          <h1 className="text-3xl font-bold text-[#6b6b6b]">Gestione Accesso Pagine</h1>
        </div>
        <p className="text-[#9b9b9b]">Configura quali pagine sono visibili per ogni tipo di utente</p>
      </div>

      {/* Current Logic Info */}
      <NeumorphicCard className="p-6 bg-blue-50 border-2 border-blue-300">
        <div className="flex items-start gap-3">
          <Settings className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-bold text-blue-800 mb-2">🔒 Configurazione Dinamica Accesso Pagine</h3>
            <p className="text-sm text-blue-700 mb-3">
              Questa configurazione controlla l'accesso a TUTTE le pagine dell'app. 
              Le pagine NON selezionate saranno completamente inaccessibili per quel tipo di utente.
            </p>
            <div className="text-xs text-blue-600">
              <p className="mb-1">🔹 Controlli applicati:</p>
              <ul className="list-disc list-inside space-y-1 ml-3">
                <li>Menu di navigazione filtrato dinamicamente</li>
                <li>Redirect automatico se si tenta di accedere a pagina non autorizzata</li>
                <li>Protezione a livello di componente per pagine sensibili</li>
              </ul>
            </div>
          </div>
        </div>
      </NeumorphicCard>

      {/* Admin Pages Configuration */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="neumorphic-flat w-12 h-12 rounded-full flex items-center justify-center">
            <Shield className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#6b6b6b]">Amministratori</h2>
            <p className="text-sm text-[#9b9b9b]">Pagine accessibili agli utenti admin</p>
          </div>
        </div>

        {Object.entries(groupedPages).map(([category, pages]) => (
          <div key={category} className="mb-4">
            <h3 className="font-bold text-[#6b6b6b] mb-2 text-sm">{category}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {pages.map(page => (
                <div key={page.value} className="neumorphic-pressed p-2 rounded-lg">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pageConfig.admin_pages.includes(page.value)}
                      onChange={() => handlePageToggle('admin', page.value)}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-[#6b6b6b] text-xs">{page.label}</span>
                  </label>
                </div>
              ))}
            </div>
          </div>
        ))}
      </NeumorphicCard>

      {/* Manager Pages Configuration */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="neumorphic-flat w-12 h-12 rounded-full flex items-center justify-center">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#6b6b6b]">Manager</h2>
            <p className="text-sm text-[#9b9b9b]">Pagine accessibili ai manager (escluso Zapier e Sistema)</p>
          </div>
        </div>

        {Object.entries(groupedPages).filter(([category]) => category !== 'Zapier' && category !== 'Sistema').map(([category, pages]) => (
          <div key={category} className="mb-4">
            <h3 className="font-bold text-[#6b6b6b] mb-2 text-sm">{category}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {pages.map(page => (
                <div key={page.value} className="neumorphic-pressed p-2 rounded-lg">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pageConfig.manager_pages.includes(page.value)}
                      onChange={() => handlePageToggle('manager', page.value)}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-[#6b6b6b] text-xs">{page.label}</span>
                  </label>
                </div>
              ))}
            </div>
          </div>
        ))}
      </NeumorphicCard>

      {/* Dipendenti - Stage 1: After Registration */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="neumorphic-flat w-12 h-12 rounded-full flex items-center justify-center">
            <span className="text-xl font-bold text-[#8b7355]">1</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#6b6b6b]">Dipendenti - Appena Registrato</h2>
            <p className="text-sm text-[#9b9b9b]">Senza ruoli assegnati</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {availableDipendentiPages.map(page => (
            <div key={page.value} className="neumorphic-pressed p-3 rounded-lg">
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
      </NeumorphicCard>

      {/* Dipendenti - Stage 2: After Contract Received */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="neumorphic-flat w-12 h-12 rounded-full flex items-center justify-center">
            <span className="text-xl font-bold text-[#8b7355]">2</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#6b6b6b]">Dipendenti - Contratto Ricevuto</h2>
            <p className="text-sm text-[#9b9b9b]">Ha ricevuto un contratto (status "inviato")</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {availableDipendentiPages.map(page => (
            <div key={page.value} className="neumorphic-pressed p-3 rounded-lg">
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
      </NeumorphicCard>

      {/* Dipendenti - Stage 3: After Contract Signed */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="neumorphic-flat w-12 h-12 rounded-full flex items-center justify-center">
            <span className="text-xl font-bold text-[#8b7355]">3</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#6b6b6b]">Dipendenti - Contratto Firmato</h2>
            <p className="text-sm text-[#9b9b9b]">Ha firmato il contratto (status "firmato")</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {availableDipendentiPages.map(page => (
            <div key={page.value} className="neumorphic-pressed p-3 rounded-lg">
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
      </NeumorphicCard>

      {/* Dipendenti - Stage 4: After Contract Start Date */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="neumorphic-flat w-12 h-12 rounded-full flex items-center justify-center">
            <span className="text-xl font-bold text-[#8b7355]">4</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#6b6b6b]">Dipendenti - Contratto Iniziato</h2>
            <p className="text-sm text-[#9b9b9b]">Data inizio contratto ≥ data odierna (E contratto firmato)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {availableDipendentiPages.map(page => (
            <div key={page.value} className="neumorphic-pressed p-3 rounded-lg">
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
      <NeumorphicCard className="p-6 bg-red-50 border-2 border-red-300">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-red-700 flex-shrink-0 mt-1" />
          <div className="text-sm text-red-800">
            <p className="font-medium mb-2">⚠️ IMPORTANTE - Sicurezza Accesso Pagine</p>
            <ul className="text-xs space-y-1 list-disc list-inside">
              <li><strong>Le pagine NON selezionate saranno INACCESSIBILI</strong> per quel tipo di utente</li>
              <li>Un nuovo utente registrato (user_type: "user") viene trattato come "Dipendente"</li>
              <li>La Dashboard e altre pagine sensibili sono protette anche se digitate direttamente nell'URL</li>
              <li>I campi "Controllo Pulizia" sono visibili SOLO ai dipendenti con i ruoli corrispondenti</li>
              <li><strong>Clicca "Salva Configurazione" e RICARICA LA PAGINA</strong> per applicare le modifiche</li>
              <li>Pagine Zapier e Sistema sono disponibili SOLO per Admin</li>
            </ul>
          </div>
        </div>
      </NeumorphicCard>
    </div>
  );
}