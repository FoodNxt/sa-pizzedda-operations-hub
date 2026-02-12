import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ProtectedPage from "../components/ProtectedPage";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { GripVertical, Save, RotateCcw, Menu as MenuIcon, ChevronDown, ChevronRight } from "lucide-react";

const DEFAULT_MENU_STRUCTURE = [
  {
    title: "Dashboard",
    icon: "LayoutDashboard",
    type: "section",
    items: [
      { title: "Dashboard", page: "Dashboard", icon: "LayoutDashboard" },
      { title: "Presenze", page: "Presenze", icon: "Users" },
      { title: "To-Do", page: "ToDo", icon: "CheckSquare" },
      { title: "Summary AI", page: "SummaryAI", icon: "Zap" },
      { title: "Form Tracker", page: "FormTracker", icon: "ClipboardCheck" },
      { title: "Meteo", page: "Meteo", icon: "Cloud" }
    ]
  },
  {
    title: "Reviews",
    icon: "Star",
    type: "section",
    items: [
      { title: "Store Reviews", page: "StoreReviews", icon: "MapPin" },
      { title: "Assign Reviews", page: "AssignReviews", icon: "UserCheck" },
      { title: "Employee Reviews", page: "EmployeeReviewsPerformance", icon: "Users" }
    ]
  },
  {
    title: "Financials",
    icon: "DollarSign",
    type: "section",
    items: [
      { title: "Financials", page: "Financials", icon: "DollarSign" },
      { title: "Channel Comparison", page: "ChannelComparison", icon: "BarChart3" },
      { title: "Storico Cassa", page: "StoricoCassa", icon: "DollarSign" },
      { title: "Forms", page: "FinancialForms", icon: "FileText" },
      { title: "Produttività", page: "Produttivita", icon: "Clock" },
      { title: "Target", page: "Target", icon: "Target", parent_admin_section: "Financials" },
      { title: "Costi", page: "Costi", icon: "DollarSign", parent_admin_section: "Financials" },
      { title: "Food Cost", page: "FoodCost", icon: "TrendingUp", parent_admin_section: "Financials" },
      { title: "Sconti", page: "Sconti", icon: "TrendingUp", parent_admin_section: "Financials" },
      { title: "Banche", page: "Banche", icon: "DollarSign", parent_admin_section: "Financials" }
    ]
  },
  {
    title: "Inventory",
    icon: "Package",
    type: "section",
    items: [
      { title: "Analisi Inventario", page: "Inventory", icon: "Package" },
      { title: "Materie Prime", page: "MateriePrime", icon: "Package" },
      { title: "Confronto Listini", page: "ConfrontoListini", icon: "DollarSign" },
      { title: "Analisi Sprechi", page: "AnalisiSprechi", icon: "AlertTriangle" },
      { title: "Prodotti Venduti", page: "ProdottiVenduti", icon: "ShoppingCart" },
      { title: "Impasti", page: "StoricoImpasti", icon: "ChefHat" },
      { title: "Precotture", page: "PrecottureAdmin", icon: "Pizza" },
      { title: "Ordini Fornitori", page: "OrdiniAdmin", icon: "ShoppingCart" },
      { title: "Forms", page: "InventoryForms", icon: "Edit" },
      { title: "Controllo Consumi", page: "ControlloConsumi", icon: "BarChart3" },
      { title: "Inventory Admin", page: "InventarioAdmin", icon: "Settings" }
    ]
  },
  {
    title: "HR",
    icon: "Users",
    type: "section",
    items: [
      { title: "Performance Dipendenti", page: "Employees", icon: "Users" },
      { title: "Payroll", page: "Payroll", icon: "DollarSign" },
      { title: "Overview Contratti", page: "OverviewContratti", icon: "FileText" },
      { title: "Academy", page: "AcademyAdmin", icon: "GraduationCap" },
      { title: "Documenti", page: "Documenti", icon: "FileText" },
      { title: "Feedback P2P", page: "FeedbackP2P", icon: "Users" },
      { title: "Struttura Turno", page: "StrutturaTurno", icon: "Calendar" },
      { title: "Assistente AI", page: "GestioneAssistente", icon: "Users" },
      { title: "Planday", page: "Planday", icon: "Calendar" },
      { title: "Richieste", page: "Assenze", icon: "Calendar" },
      { title: "Pause", page: "Pause", icon: "Clock" },
      { title: "Ritardi", page: "Ritardi", icon: "AlertTriangle" },
      { title: "ATS", page: "ATS", icon: "Users" },
      { title: "Segnalazioni", page: "Segnalazioni", icon: "AlertTriangle" },
      { title: "Pagamento Straordinari", page: "PagamentoStraordinari", icon: "DollarSign" },
      { title: "Uscite", page: "Uscite", icon: "AlertTriangle" },
      { title: "Admin HR", page: "AdminHR", icon: "Settings", admin_section: true }
    ]
  },
  {
    title: "Pulizie",
    icon: "Zap",
    type: "section",
    items: [
      { title: "Valutazione Pulizie", page: "ValutazionePulizie", icon: "ClipboardCheck" },
      { title: "Form Pulizia", page: "FormPulizia", icon: "Camera" },
      { title: "Attrezzature", page: "Attrezzature", icon: "Package" }
    ]
  },
  {
    title: "Delivery",
    icon: "Truck",
    type: "section",
    items: [
      { title: "Ordini Sbagliati", page: "OrdiniSbagliati", icon: "AlertTriangle" },
      { title: "Matching Ordini Sbagliati", page: "MatchingOrdiniSbagliati", icon: "LinkIcon" }
    ]
  },
  {
    title: "Marketing",
    icon: "TrendingUp",
    type: "section",
    items: [
      { title: "Google", page: "Google", icon: "BarChart3" },
      { title: "Meta", page: "Meta", icon: "BarChart3" },
      { title: "Configurazione", page: "MarketingSettings", icon: "Settings" }
    ]
  },
  {
    title: "Zapier Guide",
    icon: "Zap",
    type: "section",
    items: [
      { title: "Zapier Reviews", page: "ZapierSetup", icon: "Zap" },
      { title: "Zapier Orders", page: "OrderItemsSetup", icon: "Zap" },
      { title: "Zapier iPratico", page: "IPraticoSetup", icon: "Zap" },
      { title: "Bulk Import iPratico", page: "IPraticoBulkImport", icon: "Upload" },
      { title: "Zapier Prodotti Venduti", page: "ZapierProdottiVenduti", icon: "ShoppingCart" },
      { title: "Bulk Import Prodotti Venduti", page: "BulkImportProdottiVenduti", icon: "Upload" },
      { title: "Zapier Produttività", page: "ZapierProduttivita", icon: "Zap" },
      { title: "Bulk Import Produttività", page: "BulkImportProduttivita", icon: "Upload" }
    ]
  },
  {
    title: "Sistema",
    icon: "User",
    type: "section",
    items: [
      { title: "Gestione Utenti", page: "UsersManagement", icon: "Users" },
      { title: "Gestione Accesso Pagine", page: "GestioneAccessoPagine", icon: "CheckSquare" },
      { title: "Struttura Menu", page: "StrutturaMenù", icon: "Menu" },
      { title: "Funzionamento App", page: "FunzionamentoApp", icon: "BookOpen" }
    ]
  }
];

export default function StrutturaMenù() {
  const [menuStructure, setMenuStructure] = useState(DEFAULT_MENU_STRUCTURE);
  const [expandedSections, setExpandedSections] = useState({});
  const [hasChanges, setHasChanges] = useState(false);

  const queryClient = useQueryClient();

  const { data: configs = [] } = useQuery({
    queryKey: ['menu-structure-config'],
    queryFn: () => base44.entities.MenuStructureConfig.list(),
  });

  const activeConfig = configs.find(c => c.is_active);

  useEffect(() => {
    if (activeConfig?.menu_structure) {
      setMenuStructure(activeConfig.menu_structure);
    }
  }, [activeConfig]);

  const saveMutation = useMutation({
    mutationFn: async (structure) => {
      // Disattiva tutte le configurazioni esistenti
      for (const config of configs) {
        if (config.is_active) {
          await base44.entities.MenuStructureConfig.update(config.id, { is_active: false });
        }
      }
      // Crea nuova configurazione attiva
      return base44.entities.MenuStructureConfig.create({
        config_name: `menu_${Date.now()}`,
        menu_structure: structure,
        is_active: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-structure-config'] });
      setHasChanges(false);
      alert('Struttura menu salvata! Ricarica la pagina per vedere le modifiche.');
    },
  });

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const { source, destination, type } = result;

    if (type === 'section') {
      // Riordina sezioni
      const newStructure = Array.from(menuStructure);
      const [moved] = newStructure.splice(source.index, 1);
      newStructure.splice(destination.index, 0, moved);
      setMenuStructure(newStructure);
      setHasChanges(true);
    } else if (type.startsWith('items-')) {
      // Riordina items dentro una sezione
      const sectionIndex = parseInt(type.split('-')[1]);
      const newStructure = [...menuStructure];
      const items = Array.from(newStructure[sectionIndex].items);
      const [moved] = items.splice(source.index, 1);
      items.splice(destination.index, 0, moved);
      newStructure[sectionIndex].items = items;
      setMenuStructure(newStructure);
      setHasChanges(true);
    }
  };

  const handleReset = () => {
    if (confirm('Ripristinare la struttura menu predefinita?')) {
      setMenuStructure(DEFAULT_MENU_STRUCTURE);
      setHasChanges(true);
    }
  };

  const toggleSection = (index) => {
    setExpandedSections(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  return (
    <ProtectedPage pageName="StrutturaMenù">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">
              Struttura Menu
            </h1>
            <p className="text-slate-500 mt-1">Riordina le voci del menu amministratore</p>
          </div>
          <div className="flex gap-2">
            <NeumorphicButton onClick={handleReset} className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4" />
              Ripristina
            </NeumorphicButton>
            <NeumorphicButton 
              onClick={() => saveMutation.mutate(menuStructure)} 
              variant="primary" 
              className="flex items-center gap-2"
              disabled={!hasChanges || saveMutation.isPending}
            >
              <Save className="w-4 h-4" />
              Salva Modifiche
            </NeumorphicButton>
          </div>
        </div>

        {hasChanges && (
          <div className="neumorphic-flat p-4 rounded-xl bg-orange-50 border border-orange-200">
            <p className="text-sm text-orange-800 font-medium">
              ⚠️ Hai modifiche non salvate. Clicca "Salva Modifiche" per applicarle.
            </p>
          </div>
        )}

        <NeumorphicCard className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <MenuIcon className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-800">Sezioni Menu</h2>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            Trascina le sezioni e le voci per riordinarle. Le modifiche si applicheranno dopo il salvataggio e il ricaricamento della pagina.
          </p>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="sections" type="section">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                  {menuStructure.map((section, sectionIndex) => (
                    <Draggable key={section.title} draggableId={section.title} index={sectionIndex}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`neumorphic-pressed rounded-xl overflow-hidden ${snapshot.isDragging ? 'shadow-xl' : ''}`}
                        >
                          {/* Section Header */}
                          <div className="p-4 bg-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                                <GripVertical className="w-5 h-5 text-slate-400" />
                              </div>
                              <div className="flex items-center gap-2 flex-1">
                                <span className="text-lg font-bold text-slate-800">{section.title}</span>
                                <span className="text-xs text-slate-500">({section.items.length} voci)</span>
                              </div>
                            </div>
                            <button
                              onClick={() => toggleSection(sectionIndex)}
                              className="nav-button p-2 rounded-lg"
                            >
                              {expandedSections[sectionIndex] ? (
                                <ChevronDown className="w-4 h-4 text-slate-600" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-slate-600" />
                              )}
                            </button>
                          </div>

                          {/* Section Items */}
                          {expandedSections[sectionIndex] && (
                            <div className="p-4">
                              <Droppable droppableId={`items-${sectionIndex}`} type={`items-${sectionIndex}`}>
                                {(provided) => (
                                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                                    {section.items.map((item, itemIndex) => (
                                      <Draggable key={item.title} draggableId={`${section.title}-${item.title}`} index={itemIndex}>
                                        {(provided, snapshot) => (
                                          <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            className={`neumorphic-flat p-3 rounded-lg flex items-center gap-3 ${
                                              snapshot.isDragging ? 'shadow-lg bg-blue-50' : ''
                                            }`}
                                          >
                                            <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                                              <GripVertical className="w-4 h-4 text-slate-400" />
                                            </div>
                                            <div className="flex-1">
                                              <div className="font-medium text-slate-800">{item.title}</div>
                                              <div className="text-xs text-slate-500">Pagina: {item.page}</div>
                                            </div>
                                            <select
                                              value={item.parent_admin_section || ''}
                                              onChange={(e) => {
                                                const newStructure = [...menuStructure];
                                                const newItem = { ...newStructure[sectionIndex].items[itemIndex] };
                                                newItem.parent_admin_section = e.target.value || null;
                                                newStructure[sectionIndex].items[itemIndex] = newItem;
                                                setMenuStructure(newStructure);
                                                setHasChanges(true);
                                              }}
                                              className="text-xs px-2 py-1 rounded border border-slate-300 bg-white"
                                            >
                                              <option value="">Menu principale</option>
                                              {['HR', 'Inventory', 'Financials', 'Marketing', 'Sistema'].map(section => (
                                                <option key={section} value={section}>Admin {section}</option>
                                              ))}
                                            </select>
                                          </div>
                                        )}
                                      </Draggable>
                                    ))}
                                    {provided.placeholder}
                                  </div>
                                )}
                              </Droppable>
                            </div>
                          )}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </NeumorphicCard>
      </div>
    </ProtectedPage>
  );
}