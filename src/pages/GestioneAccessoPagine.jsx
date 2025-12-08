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
  Users,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";

export default function GestioneAccessoPagine() {
  const queryClient = useQueryClient();
  const [expandedSections, setExpandedSections] = useState({});

  const toggleSection = (sectionKey) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['page-access-config'],
    queryFn: async () => {
      const result = await base44.entities.PageAccessConfig.list();
      return result;
    },
  });

  const activeConfig = configs.find(c => c.is_active) || null;

  // Helper to convert old format (string[]) to new format (object[])
  const normalizePages = (pages) => {
    if (!pages || pages.length === 0) return [];
    if (typeof pages[0] === 'string') {
      return pages.map(p => ({ page: p, showInMenu: true, showInForms: false }));
    }
    return pages;
  };

  const [pageConfig, setPageConfig] = useState({
    admin_pages: activeConfig?.admin_pages || [],
    manager_pages: activeConfig?.manager_pages || [],
    after_registration: normalizePages(activeConfig?.after_registration || [{ page: 'ProfiloDipendente', showInMenu: true, showInForms: false }]),
    after_contract_received: normalizePages(activeConfig?.after_contract_received || [
      { page: 'ProfiloDipendente', showInMenu: true, showInForms: false },
      { page: 'ContrattiDipendente', showInMenu: true, showInForms: false }
    ]),
    after_contract_signed: normalizePages(activeConfig?.after_contract_signed || [
      { page: 'ProfiloDipendente', showInMenu: true, showInForms: false },
      { page: 'ContrattiDipendente', showInMenu: true, showInForms: false },
      { page: 'Academy', showInMenu: true, showInForms: false }
    ]),
    pizzaiolo_pages: normalizePages(activeConfig?.pizzaiolo_pages || [
      { page: 'ProfiloDipendente', showInMenu: true, showInForms: false },
      { page: 'ContrattiDipendente', showInMenu: true, showInForms: false },
      { page: 'Academy', showInMenu: true, showInForms: false },
      { page: 'Valutazione', showInMenu: true, showInForms: false },
      { page: 'FormsDipendente', showInMenu: true, showInForms: false },
      { page: 'ControlloPuliziaPizzaiolo', showInMenu: false, showInForms: true }
    ]),
    cassiere_pages: normalizePages(activeConfig?.cassiere_pages || [
      { page: 'ProfiloDipendente', showInMenu: true, showInForms: false },
      { page: 'ContrattiDipendente', showInMenu: true, showInForms: false },
      { page: 'Academy', showInMenu: true, showInForms: false },
      { page: 'Valutazione', showInMenu: true, showInForms: false },
      { page: 'FormsDipendente', showInMenu: true, showInForms: false },
      { page: 'ControlloPuliziaCassiere', showInMenu: false, showInForms: true }
    ]),
    store_manager_pages: normalizePages(activeConfig?.store_manager_pages || [
      { page: 'ProfiloDipendente', showInMenu: true, showInForms: false },
      { page: 'ContrattiDipendente', showInMenu: true, showInForms: false },
      { page: 'Academy', showInMenu: true, showInForms: false },
      { page: 'Valutazione', showInMenu: true, showInForms: false },
      { page: 'FormsDipendente', showInMenu: true, showInForms: false },
      { page: 'DashboardStoreManager', showInMenu: true, showInForms: false }
    ])
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
        after_registration: normalizePages(activeConfig.after_registration || [{ page: 'ProfiloDipendente', showInMenu: true, showInForms: false }]),
        after_contract_received: normalizePages(activeConfig.after_contract_received || [
          { page: 'ProfiloDipendente', showInMenu: true, showInForms: false },
          { page: 'ContrattiDipendente', showInMenu: true, showInForms: false }
        ]),
        after_contract_signed: normalizePages(activeConfig.after_contract_signed || [
          { page: 'ProfiloDipendente', showInMenu: true, showInForms: false },
          { page: 'ContrattiDipendente', showInMenu: true, showInForms: false },
          { page: 'Academy', showInMenu: true, showInForms: false }
        ]),
        pizzaiolo_pages: normalizePages(activeConfig.pizzaiolo_pages || [
          { page: 'ProfiloDipendente', showInMenu: true, showInForms: false },
          { page: 'ContrattiDipendente', showInMenu: true, showInForms: false },
          { page: 'Academy', showInMenu: true, showInForms: false },
          { page: 'Valutazione', showInMenu: true, showInForms: false },
          { page: 'FormsDipendente', showInMenu: true, showInForms: false },
          { page: 'ControlloPuliziaPizzaiolo', showInMenu: false, showInForms: true }
        ]),
        cassiere_pages: normalizePages(activeConfig.cassiere_pages || [
          { page: 'ProfiloDipendente', showInMenu: true, showInForms: false },
          { page: 'ContrattiDipendente', showInMenu: true, showInForms: false },
          { page: 'Academy', showInMenu: true, showInForms: false },
          { page: 'Valutazione', showInMenu: true, showInForms: false },
          { page: 'FormsDipendente', showInMenu: true, showInForms: false },
          { page: 'ControlloPuliziaCassiere', showInMenu: false, showInForms: true }
        ]),
        store_manager_pages: normalizePages(activeConfig.store_manager_pages || [
          { page: 'ProfiloDipendente', showInMenu: true, showInForms: false },
          { page: 'ContrattiDipendente', showInMenu: true, showInForms: false },
          { page: 'Academy', showInMenu: true, showInForms: false },
          { page: 'Valutazione', showInMenu: true, showInForms: false },
          { page: 'FormsDipendente', showInMenu: true, showInForms: false },
          { page: 'DashboardStoreManager', showInMenu: true, showInForms: false }
        ])
      });
    }
  }, [activeConfig]);

  const allAdminPages = [
    { value: 'Dashboard', label: 'Dashboard Overview', category: 'Dashboard' },
    { value: 'SummaryAI', label: 'Summary AI', category: 'Dashboard' },
    { value: 'FormTracker', label: 'Form Tracker', category: 'Dashboard' },
    { value: 'Alerts', label: 'Alerts', category: 'Dashboard' },
    { value: 'StoreReviews', label: 'Store Reviews', category: 'Reviews' },
    { value: 'AssignReviews', label: 'Assign Reviews', category: 'Reviews' },
    { value: 'EmployeeReviewsPerformance', label: 'Employee Reviews', category: 'Reviews' },
    { value: 'RealTime', label: 'Real Time', category: 'Financials' },
    { value: 'Financials', label: 'Financials', category: 'Financials' },
    { value: 'ChannelComparison', label: 'Channel Comparison', category: 'Financials' },
    { value: 'StoricoCassa', label: 'Storico Cassa', category: 'Financials' },
    { value: 'FinancialForms', label: 'Financial Forms', category: 'Financials' },
    { value: 'Inventory', label: 'Inventory Dashboard', category: 'Inventory' },
    { value: 'MateriePrime', label: 'Materie Prime', category: 'Inventory' },
    { value: 'Ricette', label: 'Ricette', category: 'Inventory' },
    { value: 'ConfrontoListini', label: 'Confronto Listini', category: 'Inventory' },
    { value: 'AnalisiSprechi', label: 'Analisi Sprechi', category: 'Inventory' },
    { value: 'InventarioAdmin', label: 'Inventario Admin', category: 'Inventory' },
    { value: 'InventarioStoreManager', label: 'Inventario Store Manager', category: 'Inventory' },
    { value: 'FormInventario', label: 'Form Inventario', category: 'Inventory' },
    { value: 'FormCantina', label: 'Form Cantina', category: 'Inventory' },
    { value: 'QuantitaMinime', label: 'Quantità Minime', category: 'Inventory' },
    { value: 'ElencoFornitori', label: 'Elenco Fornitori', category: 'Inventory' },
    { value: 'UploadFattureXML', label: 'Upload Fatture XML', category: 'Inventory' },
    { value: 'ProdottiVenduti', label: 'Prodotti Venduti', category: 'Inventory' },
    { value: 'StoricoImpasti', label: 'Storico Impasti', category: 'Inventory' },
    { value: 'PrecottureAdmin', label: 'Precotture Admin', category: 'Inventory' },
    { value: 'TeglieButtate', label: 'Teglie Buttate', category: 'Inventory' },
    { value: 'Preparazioni', label: 'Preparazioni', category: 'Inventory' },
    { value: 'InventoryForms', label: 'Inventory Forms', category: 'Inventory' },
    { value: 'Employees', label: 'Employees', category: 'HR' },
    { value: 'Shifts', label: 'Shifts', category: 'HR' },
    { value: 'Payroll', label: 'Payroll', category: 'HR' },
    { value: 'Contratti', label: 'Contratti', category: 'HR' },
    { value: 'AlertPeriodoProva', label: 'Alert Periodo Prova', category: 'HR' },
    { value: 'HRAdmin', label: 'HR Admin', category: 'HR' },
    { value: 'AcademyAdmin', label: 'Academy Admin', category: 'HR' },
    { value: 'Planday', label: 'Planday - Gestione Turni', category: 'HR' },
    { value: 'StrutturaTurno', label: 'Struttura Turno', category: 'HR' },
    { value: 'Assenze', label: 'Assenze (Ferie/Malattia)', category: 'HR' },
    { value: 'ATS', label: 'ATS - Candidati', category: 'HR' },
    { value: 'Compliance', label: 'Compliance', category: 'HR' },
    { value: 'Documenti', label: 'Documenti', category: 'HR' },
    { value: 'FeedbackP2P', label: 'Feedback P2P', category: 'HR' },
    { value: 'StoreManagerAdmin', label: 'Store Manager Admin', category: 'HR' },
    { value: 'GestioneAssistente', label: 'Gestione Assistente', category: 'HR' },
    { value: 'RecalculateShifts', label: 'Ricalcola Ritardi Turni', category: 'HR' },
    { value: 'CleanupDuplicateShifts', label: 'Elimina Turni Duplicati', category: 'HR' },
    { value: 'Pulizie', label: 'Storico Pulizie', category: 'Pulizie' },
    { value: 'PulizieMatch', label: 'Pulizie Match', category: 'Pulizie' },
    { value: 'FormPulizia', label: 'Form Pulizia', category: 'Pulizie' },
    { value: 'Attrezzature', label: 'Attrezzature', category: 'Pulizie' },
    { value: 'ControlloPulizieMaster', label: 'Controllo Pulizie Master', category: 'Pulizie' },
    { value: 'ControlloPuliziaCassiere', label: 'Controllo Pulizia Cassiere', category: 'Pulizie' },
    { value: 'ControlloPuliziaPizzaiolo', label: 'Controllo Pulizia Pizzaiolo', category: 'Pulizie' },
    { value: 'ControlloPuliziaStoreManager', label: 'Controllo Pulizia Store Manager', category: 'Pulizie' },
    { value: 'OrdiniSbagliati', label: 'Ordini Sbagliati', category: 'Delivery' },
    { value: 'MatchingOrdiniSbagliati', label: 'Matching Ordini Sbagliati', category: 'Delivery' },
    { value: 'ZapierSetup', label: 'Zapier Reviews', category: 'Zapier' },
    { value: 'ShiftsSetup', label: 'Zapier Shifts', category: 'Zapier' },
    { value: 'OrderItemsSetup', label: 'Zapier Orders', category: 'Zapier' },
    { value: 'InventorySetup', label: 'Zapier Inventory', category: 'Zapier' },
    { value: 'IPraticoSetup', label: 'Zapier iPratico', category: 'Zapier' },
    { value: 'IPraticoBulkImport', label: 'Bulk Import iPratico', category: 'Zapier' },
    { value: 'ZapierProdottiVenduti', label: 'Zapier Prodotti Venduti', category: 'Zapier' },
    { value: 'BulkImportProdottiVenduti', label: 'Bulk Import Prodotti Venduti', category: 'Zapier' },
    { value: 'UsersManagement', label: 'Gestione Utenti', category: 'Sistema' },
    { value: 'GestioneAccessoPagine', label: 'Gestione Accesso Pagine', category: 'Sistema' },
    { value: 'FunzionamentoApp', label: 'Funzionamento App', category: 'Sistema' }
  ];

  const availableDipendentiPages = [
    { value: 'ProfiloDipendente', label: '✅ Il Mio Profilo', icon: User, category: 'Area Dipendente', recommended: true },
    { value: 'ContrattiDipendente', label: '✅ I Miei Contratti', icon: FileText, category: 'Area Dipendente', recommended: true },
    { value: 'Academy', label: '✅ Academy', icon: CheckSquare, category: 'Area Dipendente', recommended: true },
    { value: 'Valutazione', label: '✅ La Mia Valutazione', icon: CheckSquare, category: 'Area Dipendente', recommended: true },
    { value: 'FormsDipendente', label: '✅ Forms', icon: CheckSquare, category: 'Area Dipendente', recommended: true },
    { value: 'Segnalazioni', label: '✅ Segnalazioni', icon: AlertCircle, category: 'Area Dipendente', recommended: true },
    { value: 'ValutazioneProvaForm', label: '✅ Valutazione Prove', icon: CheckSquare, category: 'Area Dipendente', recommended: true },
    { value: 'ControlloPuliziaCassiere', label: '✅ Controllo Pulizia Cassiere', icon: CheckSquare, category: 'Area Dipendente', recommended: true },
    { value: 'ControlloPuliziaPizzaiolo', label: '✅ Controllo Pulizia Pizzaiolo', icon: CheckSquare, category: 'Area Dipendente', recommended: true },
    { value: 'ControlloPuliziaStoreManager', label: '✅ Controllo Pulizia Store Manager', icon: CheckSquare, category: 'Area Dipendente', recommended: true },
    { value: 'FormInventario', label: '✅ Form Inventario', icon: CheckSquare, category: 'Area Dipendente', recommended: true },
    { value: 'ConteggioCassa', label: '✅ Conteggio Cassa', icon: CheckSquare, category: 'Area Dipendente', recommended: true },
    { value: 'FormTeglieButtate', label: '✅ Teglie Buttate', icon: CheckSquare, category: 'Area Dipendente', recommended: true },
    { value: 'Preparazioni', label: '✅ Preparazioni', icon: CheckSquare, category: 'Area Dipendente', recommended: true },
    { value: 'Impasto', label: '✅ Impasto', icon: CheckSquare, category: 'Area Dipendente', recommended: true },
    { value: 'Precotture', label: '✅ Precotture', icon: CheckSquare, category: 'Area Dipendente', recommended: true },
    { value: 'FeedbackP2P', label: '✅ Feedback P2P', icon: CheckSquare, category: 'Area Dipendente', recommended: true },
    { value: 'InventarioStoreManager', label: '✅ Inventario Store Manager', icon: CheckSquare, category: 'Area Dipendente', recommended: true },
    { value: 'OreLavorate', label: '✅ Ore Lavorate', icon: CheckSquare, category: 'Area Dipendente', recommended: true },
    { value: 'TurniDipendente', label: '✅ I Miei Turni (Timbratura)', icon: CheckSquare, category: 'Area Dipendente', recommended: true },
    { value: 'DashboardStoreManager', label: '✅ Dashboard Store Manager', icon: CheckSquare, category: 'Area Dipendente', recommended: true },
    { value: 'FormSpostamenti', label: '✅ Spostamenti tra Negozi', icon: CheckSquare, category: 'Area Dipendente', recommended: true },
    { value: 'FormCantina', label: '✅ Form Cantina', icon: CheckSquare, category: 'Area Dipendente', recommended: true },
    { value: 'Dashboard', label: '🚫 Dashboard Overview (DATI FINANZIARI)', icon: AlertCircle, category: 'Pagine Sensibili', recommended: false },
    { value: 'SummaryAI', label: '🚫 Summary AI (DATI FINANZIARI)', icon: AlertCircle, category: 'Pagine Sensibili', recommended: false },
    { value: 'StoreReviews', label: '🚫 Store Reviews', icon: AlertCircle, category: 'Pagine Sensibili', recommended: false },
    { value: 'AssignReviews', label: '🚫 Assign Reviews', icon: AlertCircle, category: 'Pagine Sensibili', recommended: false },
    { value: 'EmployeeReviewsPerformance', label: '🚫 Employee Reviews', icon: AlertCircle, category: 'Pagine Sensibili', recommended: false },
    { value: 'RealTime', label: '🚫 Real Time (DATI FINANZIARI)', icon: AlertCircle, category: 'Pagine Sensibili', recommended: false },
    { value: 'Financials', label: '🚫 Financials (DATI FINANZIARI)', icon: AlertCircle, category: 'Pagine Sensibili', recommended: false },
    { value: 'ChannelComparison', label: '🚫 Channel Comparison', icon: AlertCircle, category: 'Pagine Sensibili', recommended: false },
    { value: 'StoricoCassa', label: '🚫 Storico Cassa', icon: AlertCircle, category: 'Pagine Sensibili', recommended: false },
    { value: 'Inventory', label: '🚫 Inventory Dashboard', icon: AlertCircle, category: 'Pagine Sensibili', recommended: false },
    { value: 'Employees', label: '🚫 Employees (DATI HR)', icon: AlertCircle, category: 'Pagine Sensibili', recommended: false },
    { value: 'Payroll', label: '🚫 Payroll (DATI HR)', icon: AlertCircle, category: 'Pagine Sensibili', recommended: false },
    { value: 'Contratti', label: '🚫 Contratti Admin', icon: AlertCircle, category: 'Pagine Sensibili', recommended: false },
    { value: 'HRAdmin', label: '🚫 HR Admin', icon: AlertCircle, category: 'Pagine Sensibili', recommended: false },
    { value: 'AcademyAdmin', label: '🚫 Academy Admin', icon: AlertCircle, category: 'Pagine Sensibili', recommended: false },
    { value: 'Pulizie', label: '🚫 Storico Pulizie', icon: AlertCircle, category: 'Pagine Sensibili', recommended: false },
    { value: 'Attrezzature', label: '🚫 Attrezzature', icon: AlertCircle, category: 'Pagine Sensibili', recommended: false }
  ];

  const handlePageToggle = (userType, pageName) => {
    setPageConfig(prev => {
      const key = userType === 'admin' ? 'admin_pages' : userType === 'manager' ? 'manager_pages' : userType;
      const currentPages = prev[key];
      
      if (userType === 'admin' || userType === 'manager') {
        const hasPage = currentPages.includes(pageName);
        return {
          ...prev,
          [key]: hasPage
            ? currentPages.filter(p => p !== pageName)
            : [...currentPages, pageName]
        };
      }
      
      const hasPage = currentPages.some(p => p.page === pageName);
      
      return {
        ...prev,
        [key]: hasPage
          ? currentPages.filter(p => p.page !== pageName)
          : [...currentPages, { page: pageName, showInMenu: true, showInForms: false }]
      };
    });
  };

  const handlePageMenuToggle = (userType, pageName) => {
    setPageConfig(prev => {
      const key = userType;
      const currentPages = prev[key];
      
      return {
        ...prev,
        [key]: currentPages.map(p => 
          p.page === pageName 
            ? { ...p, showInMenu: !p.showInMenu }
            : p
        )
      };
    });
  };

  const handlePageFormsToggle = (userType, pageName) => {
    setPageConfig(prev => {
      const key = userType;
      const currentPages = prev[key];
      
      return {
        ...prev,
        [key]: currentPages.map(p => 
          p.page === pageName 
            ? { ...p, showInForms: !p.showInForms }
            : p
        )
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
      alert('✅ Configurazione salvata! Ricarica la pagina per applicare.');
    } catch (error) {
      console.error('Error saving config:', error);
      alert('Errore: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const groupPagesByCategory = () => {
    const grouped = {};
    allAdminPages.forEach(page => {
      if (!grouped[page.category]) grouped[page.category] = [];
      grouped[page.category].push(page);
    });
    return grouped;
  };

  const groupDipendentePagesByCategory = () => {
    const grouped = {};
    availableDipendentiPages.forEach(page => {
      if (!grouped[page.category]) grouped[page.category] = [];
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
  const groupedDipendentePages = groupDipendentePagesByCategory();

  // Collapsible Section Component
  const CollapsibleSection = ({ sectionKey, title, subtitle, icon, iconBg, children, defaultOpen = false }) => {
    const isExpanded = expandedSections[sectionKey] ?? defaultOpen;
    
    return (
      <NeumorphicCard className="overflow-hidden">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className={`neumorphic-flat w-12 h-12 rounded-full flex items-center justify-center ${iconBg || ''}`}>
              {icon}
            </div>
            <div className="text-left">
              <h2 className="text-xl font-bold text-[#6b6b6b]">{title}</h2>
              <p className="text-sm text-[#9b9b9b]">{subtitle}</p>
            </div>
          </div>
          {isExpanded ? (
            <ChevronDown className="w-6 h-6 text-[#6b6b6b]" />
          ) : (
            <ChevronRight className="w-6 h-6 text-[#6b6b6b]" />
          )}
        </button>
        
        {isExpanded && (
          <div className="px-6 pb-6 border-t border-slate-200">
            {children}
          </div>
        )}
      </NeumorphicCard>
    );
  };

  // Render page list for dipendenti sections
  const renderDipendentePageList = (configKey) => {
    return Object.entries(groupedDipendentePages).map(([category, pages]) => (
      <div key={category} className="mb-4 mt-4">
        <h3 className={`font-bold mb-2 text-sm ${
          category === 'Pagine Sensibili' ? 'text-red-600' : 'text-[#6b6b6b]'
        }`}>
          {category}
        </h3>
        <div className="grid grid-cols-1 gap-2">
          {pages.map(page => {
            const pageData = pageConfig[configKey]?.find(p => p.page === page.value);
            const isChecked = !!pageData;

            return (
              <div key={page.value} className={`neumorphic-pressed p-3 rounded-lg ${
                !page.recommended && isChecked ? 'border-2 border-red-500' : ''
              }`}>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handlePageToggle(configKey, page.value)}
                    className="w-5 h-5 rounded mt-0.5"
                  />
                  <div className="flex-1">
                    <span className={`text-sm block mb-2 ${
                      page.recommended ? 'text-[#6b6b6b]' : 'text-red-600 font-bold'
                    }`}>
                      {page.label}
                    </span>
                    {isChecked && (
                      <div className="flex gap-4 text-xs">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={pageData.showInMenu}
                            onChange={() => handlePageMenuToggle(configKey, page.value)}
                            className="w-4 h-4"
                          />
                          <span className="text-slate-600">Menu</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={pageData.showInForms}
                            onChange={() => handlePageFormsToggle(configKey, page.value)}
                            className="w-4 h-4"
                          />
                          <span className="text-slate-600">Forms</span>
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    ));
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <CheckSquare className="w-10 h-10 text-[#8b7355]" />
          <h1 className="text-3xl font-bold text-[#6b6b6b]">Gestione Accesso Pagine</h1>
        </div>
        <p className="text-[#9b9b9b]">Configura quali pagine sono visibili per ogni tipo di utente</p>
      </div>

      {/* Info Card */}
      <NeumorphicCard className="p-4 bg-blue-50 border-2 border-blue-300">
        <div className="flex items-start gap-3">
          <Settings className="w-6 h-6 text-blue-600 flex-shrink-0" />
          <div className="text-sm text-blue-700">
            <p className="font-bold mb-1">🔒 Configurazione Dinamica Accesso Pagine</p>
            <p>Clicca sulle sezioni per espandere/comprimere. Le pagine NON selezionate saranno inaccessibili.</p>
          </div>
        </div>
      </NeumorphicCard>

      {/* Admin Pages */}
      <CollapsibleSection
        sectionKey="admin"
        title="Amministratori"
        subtitle="Pagine accessibili agli utenti admin"
        icon={<Shield className="w-6 h-6 text-red-600" />}
      >
        {Object.entries(groupedPages).map(([category, pages]) => (
          <div key={category} className="mb-4 mt-4">
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
      </CollapsibleSection>

      {/* Manager Pages */}
      <CollapsibleSection
        sectionKey="manager"
        title="Manager"
        subtitle="Pagine accessibili ai manager"
        icon={<Users className="w-6 h-6 text-blue-600" />}
      >
        {Object.entries(groupedPages).filter(([category]) => category !== 'Zapier' && category !== 'Sistema').map(([category, pages]) => (
          <div key={category} className="mb-4 mt-4">
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
      </CollapsibleSection>

      {/* Dipendenti - Stage 1 */}
      <CollapsibleSection
        sectionKey="after_registration"
        title="Dipendenti - Appena Registrato"
        subtitle="Senza ruoli assegnati"
        icon={<span className="text-xl font-bold text-[#8b7355]">1</span>}
      >
        {renderDipendentePageList('after_registration')}
      </CollapsibleSection>

      {/* Dipendenti - Stage 2 */}
      <CollapsibleSection
        sectionKey="after_contract_received"
        title="Dipendenti - Contratto Ricevuto"
        subtitle="Ha ricevuto un contratto"
        icon={<span className="text-xl font-bold text-[#8b7355]">2</span>}
      >
        {renderDipendentePageList('after_contract_received')}
      </CollapsibleSection>

      {/* Dipendenti - Stage 3 */}
      <CollapsibleSection
        sectionKey="after_contract_signed"
        title="Dipendenti - Contratto Firmato"
        subtitle="Ha firmato il contratto"
        icon={<span className="text-xl font-bold text-[#8b7355]">3</span>}
      >
        {renderDipendentePageList('after_contract_signed')}
      </CollapsibleSection>

      {/* Pizzaiolo */}
      <CollapsibleSection
        sectionKey="pizzaiolo_pages"
        title="Ruolo: Pizzaiolo"
        subtitle="Pagine per dipendenti Pizzaiolo"
        icon={<span className="text-2xl">🍕</span>}
      >
        {renderDipendentePageList('pizzaiolo_pages')}
      </CollapsibleSection>

      {/* Cassiere */}
      <CollapsibleSection
        sectionKey="cassiere_pages"
        title="Ruolo: Cassiere"
        subtitle="Pagine per dipendenti Cassiere"
        icon={<span className="text-2xl">💰</span>}
      >
        {renderDipendentePageList('cassiere_pages')}
      </CollapsibleSection>

      {/* Store Manager */}
      <CollapsibleSection
        sectionKey="store_manager_pages"
        title="Ruolo: Store Manager"
        subtitle="Pagine per dipendenti Store Manager"
        icon={<span className="text-2xl">👔</span>}
      >
        {renderDipendentePageList('store_manager_pages')}
      </CollapsibleSection>

      {/* Save Button */}
      <div className="flex justify-end sticky bottom-4">
        <NeumorphicButton
          onClick={handleSave}
          variant="primary"
          disabled={saving}
          className="flex items-center gap-2 px-8 py-4 shadow-xl"
        >
          {saving ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
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

      {/* Warning Box */}
      <NeumorphicCard className="p-4 bg-red-50 border-2 border-red-300">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-700 flex-shrink-0" />
          <div className="text-xs text-red-800">
            <p className="font-bold mb-1">⚠️ IMPORTANTE</p>
            <p>🚫 Pagine rosse = dati sensibili (non selezionare per dipendenti). Dopo il salvataggio, ricarica la pagina.</p>
          </div>
        </div>
      </NeumorphicCard>
    </div>
  );
}