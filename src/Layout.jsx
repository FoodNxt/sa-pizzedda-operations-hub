import { useState, useEffect, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import moment from "moment";
import { motion } from "framer-motion";
import PullToRefresh from "react-simple-pull-to-refresh";
import { useQueryClient } from "@tanstack/react-query";
import { useTabStackManager } from "./components/navigation/TabStackManager";
import {
  LayoutDashboard,
  MapPin,
  Euro,
  Users,
  Menu,
  X,
  Pizza,
  Zap,
  Star,
  ChevronDown,
  ChevronRight,
  Clock,
  UserCheck,
  BarChart3,
  AlertTriangle,
  Package,
  Upload,
  Camera,
  ClipboardCheck,
  User,
  ClipboardList,
  ChefHat,
  CheckSquare,
  Truck,
  Link as LinkIcon,
  ShoppingCart,
  GraduationCap,
  FileText,
  BookOpen,
  Settings,
  Loader2,
  Home,
  Edit,
  LogOut,
  Calendar,
  Bell,
  Cloud,
  TrendingUp,
  MessageCircle,
  DollarSign
} from "lucide-react";
import CompleteProfileModal from "./components/auth/CompleteProfileModal";

const navigationStructure = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    type: "section",
    requiredUserType: ["admin", "manager"],
    items: [
      {
        title: "Dashboard",
        page: "Dashboard",
        url: createPageUrl("Dashboard"),
        icon: LayoutDashboard,
      },
      {
        title: "Presenze",
        page: "Presenze",
        url: createPageUrl("Presenze"),
        icon: Users,
      }
      ]
      },
  {
    title: "Reviews",
    icon: Star,
    type: "section",
    requiredUserType: ["admin", "manager"],
    items: [
      {
        title: "Store Reviews",
        page: "StoreReviews",
        url: createPageUrl("StoreReviews"),
        icon: MapPin,
      },
      {
        title: "Employee Reviews",
        page: "EmployeeReviewsPerformance",
        url: createPageUrl("EmployeeReviewsPerformance"),
        icon: Users,
      }
    ]
  },
  {
    title: "Analisi Ricavi",
    icon: Euro,
    type: "section",
    requiredUserType: ["admin", "manager"],
    items: [
      {
        title: "Analisi Ricavi",
        page: "Financials",
        url: createPageUrl("Financials"),
        icon: Euro,
      },
      {
        title: "Channel Comparison",
        page: "ChannelComparison",
        url: createPageUrl("ChannelComparison"),
        icon: BarChart3,
      },
      {
        title: "Storico Cassa",
        page: "StoricoCassa",
        url: createPageUrl("StoricoCassa"),
        icon: Euro,
      },
      {
        title: "Costi",
        page: "Costi",
        url: createPageUrl("Costi"),
        icon: TrendingUp,
      },
      {
        title: "Food Cost",
        page: "FoodCost",
        url: createPageUrl("FoodCost"),
        icon: ChefHat,
      },
      {
        title: "Sconti",
        page: "Sconti",
        url: createPageUrl("Sconti"),
        icon: TrendingUp,
      },
      {
        title: "Forms",
        page: "FinancialForms",
        url: createPageUrl("FinancialForms"),
        icon: FileText,
      },
      {
        title: "Target",
        page: "Target",
        url: createPageUrl("Target"),
        icon: TrendingUp,
      },
      {
        title: "Produttività",
        page: "Produttivita",
        url: createPageUrl("Produttivita"),
        icon: Clock,
      }
      ]
      },
  {
    title: "Inventory",
    icon: Package,
    type: "section",
    requiredUserType: ["admin", "manager"],
    items: [
      {
        title: "Analisi Inventario",
        url: createPageUrl("Inventory"),
        icon: Package,
      },
      {
        title: "Materie Prime",
        url: createPageUrl("MateriePrime"),
        icon: Package,
      },
      {
        title: "Confronto Listini",
        url: createPageUrl("ConfrontoListini"),
        icon: Euro,
      },
      {
        title: "Analisi Sprechi",
        url: createPageUrl("AnalisiSprechi"),
        icon: AlertTriangle,
      },
      {
        title: "Prodotti Venduti",
        url: createPageUrl("ProdottiVenduti"),
        icon: ShoppingCart,
      },
      {
        title: "Impasti",
        url: createPageUrl("StoricoImpasti"),
        icon: ChefHat,
      },
      {
        title: "Precotture",
        url: createPageUrl("PrecottureAdmin"),
        icon: Pizza,
      },
      {
        title: "Preparazioni",
        url: createPageUrl("PreparazioniAdmin"),
        icon: ChefHat,
      },
      {
        title: "Ordini Fornitori",
        url: createPageUrl("OrdiniAdmin"),
        icon: ShoppingCart,
      },
      {
        title: "Spostamenti",
        url: createPageUrl("SpostamentiAdmin"),
        icon: Truck,
      },
      {
        title: "Forms",
        url: createPageUrl("InventoryForms"),
        icon: Edit,
      },
      {
        title: "Controllo Consumi",
        url: createPageUrl("ControlloConsumi"),
        icon: BarChart3,
        requiredUserType: ["admin"]
      },
      {
        title: "Inventory Admin",
        url: createPageUrl("InventarioAdmin"),
        icon: Settings,
        requiredUserType: ["admin"]
      }
    ]
  },
  {
    title: "HR",
    icon: Users,
    type: "section",
    requiredUserType: ["admin", "manager"],
    items: [
      {
        title: "Performance Dipendenti",
        page: "Employees",
        url: createPageUrl("Employees"),
        icon: Users,
      },
      {
        title: "Payroll",
        page: "Payroll",
        url: createPageUrl("Payroll"),
        icon: Euro,
      },
      {
        title: "Alerts",
        page: "Alerts",
        url: createPageUrl("Alerts"),
        icon: AlertTriangle,
      },
      {
        title: "Overview Contratti",
        page: "OverviewContratti",
        url: createPageUrl("OverviewContratti"),
        icon: FileText,
      },
      {
        title: "Academy",
        page: "AcademyAdmin",
        url: createPageUrl("AcademyAdmin"),
        icon: GraduationCap,
      },
      {
        title: "Documenti",
        page: "Documenti",
        url: createPageUrl("Documenti"),
        icon: FileText,
      },
      {
        title: "Feedback P2P",
        page: "FeedbackP2P",
        url: createPageUrl("FeedbackP2P"),
        icon: Users,
      },
      {
        title: "Struttura Turno",
        page: "StrutturaTurno",
        url: createPageUrl("StrutturaTurno"),
        icon: Calendar,
      },
      {
        title: "Assistente AI",
        page: "GestioneAssistente",
        url: createPageUrl("GestioneAssistente"),
        icon: Users,
      },
      {
        title: "Planday",
        page: "Planday",
        url: createPageUrl("Planday"),
        icon: Calendar,
      },
      {
        title: "Richieste",
        page: "Assenze",
        url: createPageUrl("Assenze"),
        icon: Calendar,
      },
      {
        title: "Pause",
        page: "Pause",
        url: createPageUrl("Pause"),
        icon: Clock,
      },
      {
        title: "Ritardi",
        page: "Ritardi",
        url: createPageUrl("Ritardi"),
        icon: AlertTriangle,
      },
      {
        title: "Assegnazione Locali",
        page: "HRAdmin",
        url: createPageUrl("HRAdmin"),
        icon: MapPin,
      },
      {
        title: "Disponibilità",
        page: "Disponibilita",
        url: createPageUrl("Disponibilita"),
        icon: Clock,
      },
      {
        title: "Store Manager",
        page: "StoreManagerAdmin",
        url: createPageUrl("StoreManagerAdmin"),
        icon: Users,
      },
      {
        title: "Compliance",
        page: "Compliance",
        url: createPageUrl("Compliance"),
        icon: CheckSquare,
      },
      {
        title: "ATS",
        page: "ATS",
        url: createPageUrl("ATS"),
        icon: Users,
        requiredUserType: ["admin", "manager"]
      },
      {
        title: "Segnalazioni",
        page: "Segnalazioni",
        url: createPageUrl("Segnalazioni"),
        icon: AlertTriangle,
        requiredUserType: ["admin", "manager"]
      },
      {
        title: "Straordinari",
        page: "Straordinari",
        url: createPageUrl("Straordinari"),
        icon: Clock,
        requiredUserType: ["admin"]
      },
      {
        title: "Pagamento Straordinari",
        page: "PagamentoStraordinari",
        url: createPageUrl("PagamentoStraordinari"),
        icon: DollarSign,
        requiredUserType: ["admin", "manager"]
      },
      {
        title: "Uscite",
        page: "Uscite",
        url: createPageUrl("Uscite"),
        icon: AlertTriangle,
        requiredUserType: ["admin"]
      }
       ]
       },
  {
    title: "Pulizie",
    icon: Zap,
    type: "section",
    requiredUserType: ["admin", "manager"],
    items: [
      {
        title: "Valutazione Pulizie",
        url: createPageUrl("ValutazionePulizie"),
        icon: ClipboardCheck,
      },
      {
        title: "Match Pulizie",
        url: createPageUrl("PulizieMatch"),
        icon: UserCheck,
      },
      {
        title: "Form Pulizia",
        url: createPageUrl("FormPulizia"),
        icon: Camera,
      },
      {
        title: "Attrezzature",
        url: createPageUrl("Attrezzature"),
        icon: Package,
      }
    ]
  },
  {
    title: "Delivery",
    icon: Truck,
    type: "section",
    requiredUserType: ["admin", "manager"],
    items: [
      {
        title: "Ordini Sbagliati",
        url: createPageUrl("OrdiniSbagliati"),
        icon: AlertTriangle,
      },
      {
        title: "Matching Ordini Sbagliati",
        url: createPageUrl("MatchingOrdiniSbagliati"),
        icon: LinkIcon,
      },
      {
        title: "Piano Quarter",
        page: "PianoQuarter",
        url: createPageUrl("PianoQuarter"),
        icon: Calendar,
      }
    ]
  },

  {
    title: "Marketing",
    icon: TrendingUp,
    type: "section",
    requiredUserType: ["admin", "manager"],
    items: [
      {
        title: "Google",
        url: createPageUrl("Google"),
        icon: BarChart3,
      },
      {
        title: "Meta",
        url: createPageUrl("Meta"),
        icon: BarChart3,
      },
      {
        title: "Activation",
        page: "Activation",
        url: createPageUrl("Activation"),
        icon: Zap,
      },
      {
        title: "Contatti",
        page: "Contatti",
        url: createPageUrl("Contatti"),
        icon: Users,
      },
      {
        title: "Configurazione",
        page: "MarketingSettings",
        url: createPageUrl("MarketingSettings"),
        icon: Settings,
        requiredUserType: ["admin"]
      }
    ]
  },

  {
    title: "Zapier Guide",
    icon: Zap,
    type: "section",
    requiredUserType: ["admin"],
    items: [
      {
        title: "Zapier Reviews",
        page: "ZapierSetup",
        url: createPageUrl("ZapierSetup"),
        icon: Zap,
      },
      {
        title: "Zapier Orders",
        page: "OrderItemsSetup",
        url: createPageUrl("OrderItemsSetup"),
        icon: Zap,
      },
      {
        title: "Zapier iPratico",
        page: "IPraticoSetup",
        url: createPageUrl("IPraticoSetup"),
        icon: Zap,
      },
      {
        title: "Bulk Import iPratico",
        page: "IPraticoBulkImport",
        url: createPageUrl("IPraticoBulkImport"),
        icon: Upload,
      },
      {
        title: "Zapier Prodotti Venduti",
        page: "ZapierProdottiVenduti",
        url: createPageUrl("ZapierProdottiVenduti"),
        icon: ShoppingCart,
      },
      {
        title: "Bulk Import Prodotti Venduti",
        page: "BulkImportProdottiVenduti",
        url: createPageUrl("BulkImportProdottiVenduti"),
        icon: Upload,
      },
      {
        title: "Zapier Produttività",
        page: "ZapierProduttivita",
        url: createPageUrl("ZapierProduttivita"),
        icon: Zap,
      },
      {
        title: "Bulk Import Produttività",
        page: "BulkImportProduttivita",
        url: createPageUrl("BulkImportProduttivita"),
        icon: Upload,
      },
      {
        title: "Zapier Sconti",
        page: "ZapierSconti",
        url: createPageUrl("ZapierSconti"),
        icon: Zap,
      },
      {
        title: "Bulk Import Sconti",
        page: "BulkImportSconti",
        url: createPageUrl("BulkImportSconti"),
        icon: Upload,
      }
      ]
      },
  {
    title: "Impostazioni",
    icon: Settings,
    type: "section",
    requiredUserType: ["admin"],
    items: [
      {
        title: "Assign Reviews",
        page: "AssignReviews",
        url: createPageUrl("AssignReviews"),
        icon: UserCheck,
      }
    ]
  },
  {
    title: "Sistema",
    icon: User,
    type: "section",
    requiredUserType: ["admin"],
    items: [
      {
        title: "Gestione Utenti",
        url: createPageUrl("UsersManagement"),
        icon: Users,
      },
      {
        title: "Form Debug",
        url: createPageUrl("FormDebug"),
        icon: ClipboardCheck,
        requiredUserType: ["admin"]
      },
      {
        title: "Gestione Accesso Pagine",
        url: createPageUrl("GestioneAccessoPagine"),
        icon: CheckSquare,
        requiredUserType: ["admin"]
      },
      {
        title: "Struttura Menu",
        url: createPageUrl("StrutturaMenù"),
        icon: Menu,
        requiredUserType: ["admin"]
      },
      {
        title: "Funzionamento App",
        url: createPageUrl("FunzionamentoApp"),
        icon: BookOpen,
        requiredUserType: ["admin"]
      },
      {
        title: "Notifiche Mail",
        url: createPageUrl("NotificheMail"),
        icon: Bell,
        requiredUserType: ["admin"]
      },
      {
        title: "Optimizations",
        url: createPageUrl("Optimizations"),
        icon: Zap,
        requiredUserType: ["admin"]
      }
    ]
  },
  {
    title: "Altro",
    icon: Settings,
    type: "section",
    requiredUserType: ["admin", "manager"],
    items: [
      {
        title: "Meteo",
        page: "Meteo",
        url: createPageUrl("Meteo"),
        icon: Cloud,
      },
      {
        title: "Form Tracker",
        page: "FormTracker",
        url: createPageUrl("FormTracker"),
        icon: ClipboardCheck,
      }
    ]
  }
];

const getNormalizedUserType = (userType) => {
  if (userType === 'admin' || userType === 'manager') {
    return userType;
  }
  return 'dipendente';
};

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    "Dashboard": false,
    "Reviews": false,
    "Financials": false,
    "Inventory": false,
    "HR": false,
    "Pulizie": false,
    "Delivery": false,
    "View Dipendente": false,
    "Zapier Guide": false,
    "Sistema": false,
    "Altro": false,
    "Il Mio Profilo": true,
    "Area Dipendente": true
  });
  const [dipendenteNav, setDipendenteNav] = useState(null);
  const [pageAccessConfig, setPageAccessConfig] = useState(null);
  const [compactMenu, setCompactMenu] = useState(false);
  const [menuStructure, setMenuStructure] = useState(null);
  
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [notifications, setNotifications] = useState({});
  const [managerAllowedPages, setManagerAllowedPages] = useState([]);

  useEffect(() => {
    const loadMenuStructure = async () => {
      try {
        const configs = await base44.entities.MenuStructureConfig.list();
        const activeConfig = configs.find(c => c.is_active);
        if (activeConfig?.menu_structure) {
          setMenuStructure(activeConfig.menu_structure);
        }
      } catch (error) {
        console.error('Error loading menu structure:', error);
      }
    };
    loadMenuStructure();
  }, []);

  useEffect(() => {
    const fetchConfig = async () => {
      setIsLoadingConfig(true);
      try {
        const configs = await base44.entities.PageAccessConfig.list();
        const activeConfig = configs.find(c => c.is_active);
        setPageAccessConfig(activeConfig || null);
        
        // Extract manager allowed pages
        if (activeConfig?.manager_pages) {
          const pages = activeConfig.manager_pages.map(p => typeof p === 'string' ? p : p.page);
          setManagerAllowedPages(pages);
        }
      } catch (error) {
        console.error('Error fetching page access config:', error);
        setPageAccessConfig(null);
      } finally {
        setIsLoadingConfig(false);
      }
    };
    fetchConfig();
  }, []);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const user = await base44.auth.me();
        const newNotifications = {};
        const normalizedUserType = getNormalizedUserType(user.user_type);

        if (normalizedUserType === 'admin' || normalizedUserType === 'manager') {
          // Segnalazioni aperte
          const segnalazioni = await base44.entities.Segnalazione.filter({ stato: 'aperta' });
          if (segnalazioni.length > 0) {
            newNotifications.Segnalazioni = segnalazioni.length;
          }

          // Richieste ferie/malattia in pending
          const ferie = await base44.entities.RichiestaFerie.filter({ stato: 'pending' });
          const malattie = await base44.entities.RichiestaMalattia.filter({ stato: 'pending' });
          const turniLiberi = await base44.entities.RichiestaTurnoLibero.filter({ stato: 'pending' });
          const totalRichieste = ferie.length + malattie.length + turniLiberi.length;
          if (totalRichieste > 0) {
            newNotifications.Richieste = totalRichieste;
          }

          // Candidati nuovi
          const candidati = await base44.entities.Candidato.filter({ stato: 'nuovo' });
          if (candidati.length > 0) {
            newNotifications.ATS = candidati.length;
          }

          // Scambi turni da approvare
          const oggi = new Date().toISOString().split('T')[0];
          const maxData = moment().add(30, 'days').format('YYYY-MM-DD');
          const turniConScambi = await base44.entities.TurnoPlanday.filter({
            data: { $gte: oggi, $lte: maxData },
            'richiesta_scambio.stato': 'accepted_by_colleague'
          });
          if (turniConScambi.length > 0) {
            newNotifications.Planday = turniConScambi.length;
          }

          // Ordini con differenze non verificate
          const ordiniConDifferenze = await base44.entities.OrdineFornitore.filter({
            status: 'completato'
          });
          const ordiniConDifferenzeEffettive = ordiniConDifferenze.filter(o => 
            !o.differenza_verificata && o.prodotti?.some(p => p.quantita_ricevuta !== p.quantita_ordinata)
          );
          if (ordiniConDifferenzeEffettive.length > 0) {
            newNotifications['Ordini Fornitori'] = ordiniConDifferenzeEffettive.length;
          }
        } else if (normalizedUserType === 'dipendente') {
          // Turni di oggi non timbrati
          const oggi = new Date().toISOString().split('T')[0];
          const turniOggi = await base44.entities.TurnoPlanday.filter({
            dipendente_id: user.id,
            data: oggi,
            stato: 'programmato'
          });
          if (turniOggi.length > 0) {
            newNotifications.Turni = turniOggi.length;
          }

          // Richieste scambio turno in attesa della mia risposta
          const maxData = moment().add(30, 'days').format('YYYY-MM-DD');
          const turniDaRispondere = await base44.entities.TurnoPlanday.filter({
            data: { $gte: oggi, $lte: maxData },
            'richiesta_scambio.richiesto_a': user.id,
            'richiesta_scambio.stato': 'pending'
          });
          if (turniDaRispondere.length > 0) {
            newNotifications.Turni = (newNotifications.Turni || 0) + turniDaRispondere.length;
          }
        }

        setNotifications(newNotifications);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    if (!isLoadingUser && currentUser) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 120000); // Refresh ogni 2 minuti
      return () => clearInterval(interval);
    }
  }, [isLoadingUser, currentUser]);

  useEffect(() => {
    const fetchUser = async () => {
      setIsLoadingUser(true);
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);

        const needsProfile = !user.profile_manually_completed;
        setShowProfileModal(needsProfile);

        const normalizedUserType = getNormalizedUserType(user.user_type);

        // Check if employee has an exit record and if the exit date has passed
        if (normalizedUserType === 'dipendente') {
          const uscite = await base44.entities.Uscita.filter({ dipendente_id: user.id });
          if (uscite.length > 0) {
            const uscita = uscite[0];
            const dataUscita = new Date(uscita.data_uscita);
            const oggi = new Date();
            oggi.setHours(0, 0, 0, 0);
            dataUscita.setHours(0, 0, 0, 0);
            
            // Only redirect if exit date has passed
            if (oggi > dataUscita) {
              base44.auth.redirectToLogin();
              setIsLoadingUser(false);
              return;
            }
          }
        }

        if (normalizedUserType === 'dipendente') {
          if (isLoadingConfig) {
            return;
          }

          const userRoles = user.ruoli_dipendente || [];

          if (userRoles.length === 0) {
            const allowedPagesConfig = pageAccessConfig?.after_registration || [{ page: 'ProfiloDipendente', showInMenu: true, showInForms: false }];
            const allowedPages = allowedPagesConfig.map(p => typeof p === 'string' ? p : p.page);
            const allowedFullPaths = allowedPages.map(p => createPageUrl(p));
            
            if (!allowedFullPaths.includes(location.pathname)) {
              navigate(allowedFullPaths[0] || createPageUrl("ProfiloDipendente"), { replace: true });
            }
            setIsLoadingUser(false);
            return;
          }

          const hasReceivedContract = await checkIfContractReceived(user.id);
          const hasSignedContract = await checkIfContractSigned(user.id);
          const contractStarted = user.data_inizio_contratto && new Date(user.data_inizio_contratto) <= new Date();

          let allowedPagesConfig = [];

          if (contractStarted && hasSignedContract) {
            // Use role-specific pages directly
            allowedPagesConfig = [];

            if (userRoles.includes('Pizzaiolo')) {
              allowedPagesConfig = [...allowedPagesConfig, ...(pageAccessConfig?.pizzaiolo_pages || [])];
            }
            if (userRoles.includes('Cassiere')) {
              allowedPagesConfig = [...allowedPagesConfig, ...(pageAccessConfig?.cassiere_pages || [])];
            }
            if (userRoles.includes('Store Manager')) {
              allowedPagesConfig = [...allowedPagesConfig, ...(pageAccessConfig?.store_manager_pages || [])];
            }

            // Remove duplicates by page name
            const seen = new Set();
            allowedPagesConfig = allowedPagesConfig.filter(p => {
              const pageName = typeof p === 'string' ? p : p.page;
              if (seen.has(pageName)) return false;
              seen.add(pageName);
              return true;
            });

            // Fallback if no role-specific pages
            if (allowedPagesConfig.length === 0) {
              allowedPagesConfig = [
                { page: 'ProfiloDipendente', showInMenu: true, showInForms: false },
                { page: 'ContrattiDipendente', showInMenu: true, showInForms: false },
                { page: 'Academy', showInMenu: true, showInForms: false }
              ];
            }
          } else if (hasSignedContract) {
            allowedPagesConfig = pageAccessConfig?.after_contract_signed || [];
          } else if (hasReceivedContract) {
            allowedPagesConfig = pageAccessConfig?.after_contract_received || [];
          } else {
            allowedPagesConfig = pageAccessConfig?.after_registration || [];
          }

          const allowedPages = allowedPagesConfig.map(p => typeof p === 'string' ? p : p.page);

          const allowedFullPaths = allowedPages.map(p => createPageUrl(p));

          if (!allowedFullPaths.includes(location.pathname)) {
            navigate(allowedFullPaths[0] || createPageUrl("ProfiloDipendente"), { replace: true });
          }
        }

        setIsLoadingUser(false);
      } catch (error) {
        console.error('Error fetching user:', error);
        setIsLoadingUser(false);
      }
    };
    
    if (!isLoadingConfig) {
      fetchUser();
    }
  }, [location.pathname, navigate, pageAccessConfig, isLoadingConfig]);

  useEffect(() => {
    if (currentUser && !isLoadingConfig && !isLoadingUser && pageAccessConfig) {
      const normalizedUserType = getNormalizedUserType(currentUser.user_type);
      
      if (normalizedUserType === 'dipendente') {
        // Always ensure nav is loaded
        getFilteredNavigationForDipendente(currentUser).then(nav => {
          if (nav && nav.length > 0 && nav[0]?.items && nav[0].items.length > 0) {
            setDipendenteNav(nav);
          } else {
            // Fallback garantito
            setDipendenteNav([{
              title: "Area Dipendente",
              icon: Users,
              type: "section",
              items: [
                { title: 'Profilo', url: createPageUrl('ProfiloDipendente'), icon: User },
                { title: 'Turni', url: createPageUrl('TurniDipendente'), icon: Clock }
              ]
            }]);
          }
        }).catch(error => {
          console.error('Error loading dipendente navigation:', error);
          // Fallback in caso di errore
          setDipendenteNav([{
            title: "Area Dipendente",
            icon: Users,
            type: "section",
            items: [
              { title: 'Profilo', url: createPageUrl('ProfiloDipendente'), icon: User },
              { title: 'Turni', url: createPageUrl('TurniDipendente'), icon: Clock }
            ]
          }]);
        });
      }
    }
  }, [currentUser?.id, pageAccessConfig, isLoadingConfig, isLoadingUser]);

  const [contractCache, setContractCache] = useState({});

  const checkIfContractSigned = async (userId) => {
    const cacheKey = `signed_${userId}`;
    if (contractCache[cacheKey] !== undefined) {
      return contractCache[cacheKey];
    }
    
    try {
      const contratti = await base44.entities.Contratto.filter({
        user_id: userId,
        status: 'firmato'
      });
      const result = contratti.length > 0;
      setContractCache(prev => ({ ...prev, [cacheKey]: result }));
      return result;
    } catch (error) {
      console.error('Error checking contract status:', error);
      return false;
    }
  };

  const checkIfContractReceived = async (userId) => {
    const cacheKey = `received_${userId}`;
    if (contractCache[cacheKey] !== undefined) {
      return contractCache[cacheKey];
    }
    
    try {
      const contratti = await base44.entities.Contratto.filter({
        user_id: userId
      });
      const result = contratti.length > 0;
      setContractCache(prev => ({ ...prev, [cacheKey]: result }));
      return result;
    } catch (error) {
      console.error('Error checking if contract received:', error);
      return false;
    }
  };

  const handleProfileComplete = () => {
    setShowProfileModal(false);
    base44.auth.me().then(user => {
      setCurrentUser(user);
    }).catch(error => {
      console.error('Error refreshing user after profile complete:', error);
    });
  };

  const toggleSection = (sectionTitle) => {
    setExpandedSections(prev => {
      const isCurrentlyExpanded = prev[sectionTitle];
      
      // Se la sezione è chiusa e la stiamo aprendo, chiudi tutte le altre
      if (!isCurrentlyExpanded) {
        const newState = {};
        Object.keys(prev).forEach(key => {
          newState[key] = false;
        });
        newState[sectionTitle] = true;
        return newState;
      }
      
      // Altrimenti solo toggle questa sezione
      return {
        ...prev,
        [sectionTitle]: !prev[sectionTitle]
      };
    });
  };

  const isActiveLink = (url) => {
    return location.pathname === url;
  };

  const isSectionActive = (section) => {
    if (section.type === 'link') {
      return isActiveLink(section.url);
    }
    if (section.type === 'section') {
      return section.items.some(item => isActiveLink(item.url));
    }
    return false;
  };

  const hasAccess = (requiredUserType, requiredRole, pageName) => {
    if (!currentUser) return false;

    const normalizedUserType = getNormalizedUserType(currentUser.user_type);
    const userRoles = currentUser.ruoli_dipendente || [];

    // For managers, ALWAYS check the allowed list first, regardless of requiredUserType
    if (normalizedUserType === 'manager') {
      if (pageName) {
        return managerAllowedPages.includes(pageName);
      }
      return false;
    }

    // For non-managers (admin and dipendente), check requiredUserType
    if (!requiredUserType) return true;
    if (!requiredUserType.includes(normalizedUserType)) return false;

    if (requiredRole && normalizedUserType === 'dipendente') {
      return userRoles.includes(requiredRole);
    }

    return true;
  };

  // Helper to normalize page config (convert strings to objects)
  const normalizePageConfig = (pages) => {
    if (!pages || pages.length === 0) return [];
    return pages.map(p => {
      if (typeof p === 'string') {
        return { page: p, showInMenu: true, showInForms: false };
      }
      return p;
    });
  };

  const getFilteredNavigationForDipendente = async (user) => {
    try {
      const normalizedUserType = getNormalizedUserType(user.user_type);
      
      if (normalizedUserType !== 'dipendente') return null;

    const userRoles = user.ruoli_dipendente || [];

    if (userRoles.length === 0) {
      const allowedPagesConfig = normalizePageConfig(pageAccessConfig?.after_registration || [{ page: 'ProfiloDipendente', showInMenu: true, showInForms: false }]);
      const menuPages = allowedPagesConfig
        .filter(p => p.showInMenu === true)
        .map(p => p.page);
      
      // Assicura sempre Profilo e Turni
      if (!menuPages.includes('ProfiloDipendente')) menuPages.unshift('ProfiloDipendente');
      if (!menuPages.includes('TurniDipendente')) menuPages.push('TurniDipendente');
      
      return [{
        title: "Area Dipendente",
        icon: Users,
        type: "section",
        items: menuPages.map(pageName => ({
          title: getPageTitle(pageName),
          url: createPageUrl(pageName),
          icon: getPageIcon(pageName)
        }))
      }];
    }

    const hasReceivedContract = await checkIfContractReceived(user.id);
    const hasSignedContract = await checkIfContractSigned(user.id);
    const contractStarted = user.data_inizio_contratto && new Date(user.data_inizio_contratto) <= new Date();

    let allowedPagesConfig = [];

    if (contractStarted && hasSignedContract) {
      // Use role-specific pages directly
      allowedPagesConfig = [];

      if (userRoles.includes('Pizzaiolo')) {
        allowedPagesConfig = [...allowedPagesConfig, ...normalizePageConfig(pageAccessConfig?.pizzaiolo_pages || [])];
      }
      if (userRoles.includes('Cassiere')) {
        allowedPagesConfig = [...allowedPagesConfig, ...normalizePageConfig(pageAccessConfig?.cassiere_pages || [])];
      }
      if (userRoles.includes('Store Manager')) {
        allowedPagesConfig = [...allowedPagesConfig, ...normalizePageConfig(pageAccessConfig?.store_manager_pages || [])];
      }

      // Remove duplicates by page name
      const seen = new Set();
      allowedPagesConfig = allowedPagesConfig.filter(p => {
        const pageName = p.page;
        if (seen.has(pageName)) return false;
        seen.add(pageName);
        return true;
      });

      // Fallback if no role-specific pages
      if (allowedPagesConfig.length === 0) {
        allowedPagesConfig = [
          { page: 'ProfiloDipendente', showInMenu: true, showInForms: false },
          { page: 'TurniDipendente', showInMenu: true, showInForms: false },
          { page: 'ContrattiDipendente', showInMenu: true, showInForms: false },
          { page: 'Academy', showInMenu: true, showInForms: false }
        ];
      }
    } else if (hasSignedContract) {
      allowedPagesConfig = normalizePageConfig(pageAccessConfig?.after_contract_signed || []);
    } else if (hasReceivedContract) {
      allowedPagesConfig = normalizePageConfig(pageAccessConfig?.after_contract_received || []);
    } else {
      allowedPagesConfig = normalizePageConfig(pageAccessConfig?.after_registration || []);
    }

    // Filter only pages that should show in menu (NEVER show TeglieButtate in any form)
    const menuPages = allowedPagesConfig
      .filter(p => p.showInMenu === true)
      .map(p => p.page)
      .filter(pageName => !pageName.toLowerCase().includes('teglie'));

    // Pagine core che devono sempre essere presenti per dipendenti con ruoli
    const corePages = ['ProfiloDipendente', 'TurniDipendente', 'ContrattiDipendente'];
    corePages.forEach(corePage => {
      if (!menuPages.includes(corePage)) {
        menuPages.push(corePage);
      }
    });

    const menuItems = menuPages.map(pageName => ({
      title: getPageTitle(pageName),
      url: createPageUrl(pageName),
      icon: getPageIcon(pageName)
    }));

    return [{
      title: "Area Dipendente",
      icon: Users,
      type: "section",
      items: menuItems
    }];
    } catch (error) {
      console.error('Error in getFilteredNavigationForDipendente:', error);
      return [{
        title: "Area Dipendente",
        icon: Users,
        type: "section",
        items: [
          { title: 'Profilo', url: createPageUrl('ProfiloDipendente'), icon: User },
          { title: 'Turni', url: createPageUrl('TurniDipendente'), icon: Clock }
        ]
      }];
    }
  };

  const getPageTitle = (pageName) => {
    const titles = {
      'ProfiloDipendente': 'Profilo',
      'ContrattiDipendente': 'Documenti',
      'OreLavorate': 'Ore Lavorate',
      'Academy': 'Academy',
      'Valutazione': 'Valutazione',
      'FormsDipendente': 'Forms',
      'Impasto': 'Impasto',
      'Precotture': 'Precotture',
      'ControlloPuliziaCassiere': 'Form Pulizia Cassiere',
      'ControlloPuliziaPizzaiolo': 'Form Pulizia Pizzaiolo',
      'ControlloPuliziaStoreManager': 'Form Pulizia SM',
      'FormInventario': 'Inventario',
      'ConteggioCassa': 'Cassa',
      'FormTeglieButtate': 'Teglie',
      'Preparazioni': 'Preparazioni',
      'FeedbackP2P': 'Feedback',
      'InventarioStoreManager': 'Inventario SM',
      'TurniDipendente': 'Turni',
      'AssistenteDipendente': 'Assistente',
      'DashboardStoreManager': 'Dashboard',
      'Segnalazioni': 'Segnalazioni',
      'ValutazioneProvaForm': 'Valutazioni',
      'PlandayStoreManager': 'Planday',
      'FormSprechi': 'Sprechi',
      'FormSpostamenti': 'Spostamenti',
      'PagamentoStraordinari': 'Pagamento Straordinari',
      'Presenze': 'Presenze'
    };
    return titles[pageName] || pageName;
  };

  const getPageIcon = (pageName) => {
    try {
      const icons = {
        'ProfiloDipendente': User,
        'ContrattiDipendente': FileText,
        'OreLavorate': Clock,
        'Academy': GraduationCap,
        'Valutazione': ClipboardCheck,
        'FormsDipendente': Edit,
        'Impasto': ChefHat,
        'Precotture': Pizza,
        'ControlloPuliziaCassiere': Camera,
        'ControlloPuliziaPizzaiolo': Camera,
        'ControlloPuliziaStoreManager': Camera,
        'FormInventario': ClipboardList,
        'ConteggioCassa': Euro,
        'FormTeglieButtate': AlertTriangle,
        'FormSpostamenti': Truck,
        'Preparazioni': ChefHat,
        'FeedbackP2P': Users,
        'InventarioStoreManager': Package,
        'TurniDipendente': Clock,
        'DashboardStoreManager': LayoutDashboard,
        'Segnalazioni': AlertTriangle,
        'ValutazioneProvaForm': UserCheck,
        'PlandayStoreManager': Calendar,
        'FormSprechi': AlertTriangle,
        'AssistenteDipendente': Users,
        'PagamentoStraordinari': Euro,
        'Presenze': Users
      };
      return icons[pageName] || User;
    } catch (error) {
      console.error('Error getting page icon:', error, pageName);
      return User;
    }
  };

  const normalizedUserType = currentUser ? getNormalizedUserType(currentUser.user_type) : null;
  
  // Map page names to URLs for loaded menu structure
  const getUrlForPage = (pageName) => {
    return createPageUrl(pageName);
  };

  const getIconComponent = (iconName) => {
    const iconMap = {
      LayoutDashboard, MapPin, Euro, Users, Pizza, Zap, Star, Clock, UserCheck, 
      BarChart3, AlertTriangle, Package, Upload, Camera, ClipboardCheck, User, 
      ClipboardList, ChefHat, CheckSquare, Truck, LinkIcon, ShoppingCart, GraduationCap, 
      FileText, BookOpen, Settings, Home, Edit, LogOut, Calendar, Bell, Cloud, TrendingUp, Menu,
      DollarSign: Euro
    };
    return iconMap[iconName] || User;
  };

  const processMenuStructure = (structure) => {
    if (!structure) return [];
    
    return structure.map(section => ({
      ...section,
      icon: getIconComponent(section.icon),
      items: section.items.map(item => ({
        ...item,
        url: getUrlForPage(item.page),
        icon: getIconComponent(item.icon)
      }))
    }));
  };

  const processedNavigation = menuStructure ? processMenuStructure(menuStructure) : navigationStructure;
  
  const filteredNavigation = (!isLoadingConfig && !isLoadingUser && currentUser) 
    ? processedNavigation
        .map(section => {
          // For managers, filter items based on allowed pages
          const filteredItems = section.items.filter(item => {
            // Extract page name from URL - handle both /PageName and PageName formats
            let pageName = item.page || item.url?.split('/').filter(Boolean).pop() || '';

            // For managers, ALWAYS check managerAllowedPages list
            const normalizedUserType = currentUser ? getNormalizedUserType(currentUser.user_type) : null;
            if (normalizedUserType === 'manager') {
              return managerAllowedPages.includes(pageName);
            }

            // For non-managers, check normal access
            return hasAccess(item.requiredUserType, item.requiredRole, pageName);
          });

          return {
            ...section,
            items: filteredItems
          };
        })
        .filter(section => {
          // Remove sections with no accessible items
          if (section.items.length === 0) return false;

          // For managers, also check section-level access
          const normalizedUserType = currentUser ? getNormalizedUserType(currentUser.user_type) : null;
          if (normalizedUserType === 'manager' && section.requiredUserType) {
            return section.requiredUserType.includes('manager');
          }

          return true;
        })
    : [];

  const finalNavigation = (!isLoadingConfig && !isLoadingUser && currentUser)
    ? (normalizedUserType === 'dipendente' ? (dipendenteNav || []) : filteredNavigation)
    : [];

  const getUserDisplayName = () => {
    if (!currentUser) return 'Caricamento...';
    return currentUser.nome_cognome || currentUser.full_name || currentUser.email || 'Utente';
  };

  const getUserTypeName = () => {
    if (!currentUser) return '';
    const normalizedType = getNormalizedUserType(currentUser.user_type);
    return normalizedType === 'admin' ? 'Admin' :
           normalizedType === 'manager' ? 'Manager' :
           'Dipendente';
  };

  // Add class to body for dipendente mobile styling
  useEffect(() => {
    if (normalizedUserType === 'dipendente' && window.innerWidth < 1024) {
      document.body.classList.add('dipendente-mobile');
    } else {
      document.body.classList.remove('dipendente-mobile');
    }

    const handleResize = () => {
      if (normalizedUserType === 'dipendente' && window.innerWidth < 1024) {
        document.body.classList.add('dipendente-mobile');
      } else {
        document.body.classList.remove('dipendente-mobile');
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      document.body.classList.remove('dipendente-mobile');
    };
  }, [normalizedUserType]);

  const isFullyLoaded = !isLoadingUser && !isLoadingConfig && currentUser;

  // Get main navigation items for bottom bar (ALL roles) - STABILE
  const bottomNavItems = useMemo(() => {
    if (normalizedUserType === 'dipendente') {
      // ALWAYS ensure we have items - never return empty
      if (!dipendenteNav || dipendenteNav.length === 0 || !dipendenteNav[0]?.items || dipendenteNav[0].items.length === 0) {
        // Fallback garantito - SEMPRE visibile
        return [
          { title: 'Profilo', url: createPageUrl('ProfiloDipendente'), icon: User },
          { title: 'Turni', url: createPageUrl('TurniDipendente'), icon: Clock }
        ];
      }
      
      // Return all items from dipendente nav
      return dipendenteNav[0].items;
    }
    
    // For admin and manager - get top-level sections
    if (!filteredNavigation || filteredNavigation.length === 0) return [];
    
    // Extract main sections as bottom nav items
    const mainSections = filteredNavigation.slice(0, 5).map(section => ({
      title: section.title,
      url: section.items[0]?.url || '#',
      icon: section.icon,
      isSection: true
    }));
    
    return mainSections;
  }, [normalizedUserType, dipendenteNav, filteredNavigation]);

  const { handleTabClick } = useTabStackManager(bottomNavItems);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-gradient)' }}>
      {showProfileModal && currentUser && (
        <CompleteProfileModal
          user={currentUser}
          onComplete={handleProfileComplete}
        />
      )}

      <style>{`
                .neumorphic-card {
                  background: #ffffff;
                  border-radius: 12px;
                  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04);
                  border: 1px solid #f0f4f8;
                }

                .neumorphic-pressed {
                  background: #f9fafb;
                  border-radius: 10px;
                  border: 1px solid #e5e7eb;
                }

                .neumorphic-flat {
                  background: #ffffff;
                  border-radius: 10px;
                  border: 1px solid #f0f4f8;
                }

                .nav-button {
                  background: transparent;
                  transition: all 0.2s ease;
                }

                .nav-button:hover {
                  background: #f3f4f6;
                }

                .nav-button-active {
                  background: #eff6ff;
                  color: #2563eb;
                }

        .bottom-nav-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 10px 6px;
          background: linear-gradient(145deg, #f0f4f8, #e1e8ed);
          border-radius: 12px;
          transition: all 0.2s ease;
          min-height: 54px;
          box-shadow: 2px 2px 6px rgba(136, 165, 191, 0.3), -2px -2px 6px #ffffff;
        }

        .bottom-nav-item:active {
          transform: scale(0.95);
        }

        .bottom-nav-item.active {
          background: linear-gradient(145deg, #3b82f6, #2563eb);
          box-shadow: inset 2px 2px 6px rgba(0, 0, 0, 0.15);
        }

        .bottom-nav-item svg {
          width: 22px !important;
          height: 22px !important;
          margin-bottom: 4px;
          flex-shrink: 0;
        }

        .bottom-nav-item span {
          font-size: 11px !important;
          font-weight: 600 !important;
          text-align: center;
          line-height: 1.2;
          white-space: nowrap;
        }

        .bottom-nav-item.compact {
          min-height: 44px;
          padding: 8px 4px;
        }

        .bottom-nav-item.compact svg {
          margin-bottom: 0;
        }

        .bottom-nav-item.compact span {
          display: none;
        }

        @media (max-width: 1024px) {
          .hide-on-mobile {
            display: none !important;
          }
        }
      `}</style>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-[60] mx-2 mt-2">
        <div className="neumorphic-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {(() => {
                const isRootTab = bottomNavItems.some(item => item.url === location.pathname);
                if (!isRootTab) {
                  return (
                    <button
                      onClick={() => navigate(-1)}
                      className="nav-button p-2 -ml-2"
                    >
                      <ChevronRight className="w-5 h-5 text-slate-700 rotate-180" />
                    </button>
                  );
                }
                return (
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                    <Pizza className="w-6 h-6 text-white" />
                  </div>
                );
              })()}
              <div>
                    <span style={{ color: '#000000' }} className="text-lg font-bold">
                      {normalizedUserType === 'dipendente' ? getUserDisplayName() : 'Sa Pizzedda'}
                    </span>
                    <p className="text-xs text-slate-500">
                      {normalizedUserType === 'dipendente' 
                        ? (currentUser?.ruoli_dipendente?.join(', ') || 'Dipendente')
                        : getUserTypeName()}
                    </p>
                  </div>
            </div>
            {normalizedUserType !== 'dipendente' && (
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="nav-button p-3"
              >
                {sidebarOpen ? <X className="w-5 h-5 text-slate-700" /> : <Menu className="w-5 h-5 text-slate-700" />}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex">

        {/* Desktop Sidebar */}
        {normalizedUserType !== 'dipendente' ? (
          <aside className={`
            fixed lg:static inset-y-0 left-0 z-40
            transform transition-all duration-300 ease-in-out
            ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}
            ${sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'}
            pt-20 lg:pt-0 bg-white
          `}>
            <div className="h-full flex flex-col overflow-y-auto" style={{ background: '#0f172a' }}>
              <div className="hidden lg:flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: 'rgba(148, 163, 184, 0.2)' }}>
                {!sidebarCollapsed && (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-lg">
                        SP
                      </div>
                      <h1 className="text-sm font-semibold text-slate-100">Sa Pizzedda</h1>
                    </div>
                  </>
                )}
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                  title={sidebarCollapsed ? "Espandi menu" : "Comprimi menu"}
                >
                  <ChevronRight className={`w-5 h-5 transition-transform ${sidebarCollapsed ? 'rotate-0' : 'rotate-180'}`} />
                </button>
              </div>

              <nav className="flex-1 space-y-0 px-3 py-4">
                {!isFullyLoaded ? (
                  <div className="space-y-2">
                    {Array.from({ length: 8 }).map((_, idx) => (
                      <div key={idx} className="animate-pulse flex items-center gap-3 px-3 py-3 rounded-lg">
                        <div className="w-4 h-4 bg-slate-700 rounded" />
                        <div className="h-4 bg-slate-700 rounded w-32" />
                      </div>
                    ))}
                  </div>
                ) : (
                  finalNavigation.map((item) => {
                    if (item.type === 'link') {
                      const isActive = isActiveLink(item.url);
                      return (
                        <Link
                          key={item.title}
                          to={item.url}
                          onClick={() => setSidebarOpen(false)}
                          className={`
                            flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} gap-3 px-3 py-2 rounded-lg text-sm
                            transition-all duration-200
                            ${isActive ? 'bg-gradient-to-r from-blue-500/20 to-blue-600/20 font-medium text-blue-400 border border-blue-500/30' : 'text-slate-300 hover:bg-slate-800/50 hover:text-slate-100'}
                          `}
                          title={sidebarCollapsed ? item.title : ''}
                        >
                          <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
                            <item.icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                            {!sidebarCollapsed && <span>{item.title}</span>}
                          </div>
                          {!sidebarCollapsed && <ChevronRight className="w-4 h-4 text-slate-400" />}
                        </Link>
                      );
                    }

                    if (item.type === 'section') {
                      const isExpanded = expandedSections[item.title];
                      const sectionActive = isSectionActive(item);

                      return (
                        <div key={item.title}>
                          <button
                            onClick={() => toggleSection(item.title)}
                            className={`
                              w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} gap-3 px-3 py-2 rounded-lg text-sm
                              transition-all duration-200
                              ${sectionActive ? 'bg-gradient-to-r from-blue-500/20 to-blue-600/20 font-medium text-blue-400 border border-blue-500/30' : 'text-slate-300 hover:bg-slate-800/50 hover:text-slate-100'}
                            `}
                            title={sidebarCollapsed ? item.title : ''}
                          >
                            <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
                              <item.icon className={`w-4 h-4 ${sectionActive ? 'text-blue-400' : 'text-slate-400'}`} />
                              {!sidebarCollapsed && <span>{item.title}</span>}
                            </div>
                            {!sidebarCollapsed && (
                              isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-slate-400" />
                              )
                            )}
                          </button>

                          {isExpanded && !sidebarCollapsed && (
                            <div className="ml-0 mt-1 space-y-0">
                              {item.items.map((subItem) => {
                                const isActive = isActiveLink(subItem.url);
                                return (
                                  <Link
                                    key={subItem.title}
                                    to={subItem.url}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`
                                      flex items-center gap-3 px-3 py-2 rounded-lg text-xs ml-6
                                      transition-all duration-200
                                      ${isActive ? 'bg-blue-500/10 text-blue-400 font-medium border-l-2 border-blue-500' : 'text-slate-400 hover:bg-slate-800/30 hover:text-slate-200'}
                                    `}
                                  >
                                    <subItem.icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
                                    <span>{subItem.title}</span>
                                    {notifications[subItem.title] && (
                                      <span className="ml-auto bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                                        {notifications[subItem.title]}
                                      </span>
                                    )}
                                  </Link>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    }

                    return null;
                  })
                )}
              </nav>

              {isFullyLoaded && (
                <>
                  <div className="neumorphic-pressed p-4 rounded-xl mt-4 bg-gradient-to-br from-slate-100 to-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                        <span className="text-sm font-bold text-white">
                          {getUserDisplayName().charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{getUserDisplayName()}</p>
                        <p className="text-xs text-slate-500">{getUserTypeName()}</p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => base44.auth.logout()}
                    className="w-full nav-button px-4 py-3 rounded-xl mt-3 text-slate-700 font-medium hover:bg-red-50 hover:text-red-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </>
              )}
            </div>
          </aside>
        ) : (
          /* Desktop Sidebar for Dipendente */
          <aside className="hidden lg:block fixed lg:static inset-y-0 left-0 z-40 w-72">
            <div className="h-full neumorphic-card m-4 p-6 flex flex-col">
              <div className="flex items-center gap-3 mb-8">
                <div className="neumorphic-flat p-3 bg-gradient-to-br from-blue-500 to-blue-600">
                  <Pizza className="w-8 h-8 text-white" />
                </div>
                <div>
                   <h1 style={{ color: '#000000' }} className="text-xl font-bold">Sa Pizzedda</h1>
                  <p className="text-xs text-slate-500">Area Dipendente</p>
                </div>
              </div>

              <nav className="flex-1 space-y-1">
              {!isFullyLoaded ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <div key={idx} className="animate-pulse flex items-center gap-3 px-3 py-3 rounded-lg">
                      <div className="w-4 h-4 bg-slate-300 rounded" />
                      <div className="h-4 bg-slate-300 rounded w-24" />
                    </div>
                  ))}
                </div>
              ) : bottomNavItems && bottomNavItems.length > 0 ? (
                bottomNavItems.map((item) => {
                  const isActive = isActiveLink(item.url);
                  const Icon = item.icon || User;
                  return (
                    <Link
                      key={item.url}
                      to={item.url}
                      className={`
                        flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                        transition-all duration-200
                        ${isActive ? 'nav-button-active text-white' : 'nav-button text-slate-700'}
                      `}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-600'}`} />
                      <span className="font-medium">{item.title}</span>
                    </Link>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
                  <p className="text-sm text-slate-500">Caricamento...</p>
                </div>
              )}
              </nav>

              {isFullyLoaded && (
                <>
                  <div className="neumorphic-pressed p-4 rounded-xl mt-4 bg-gradient-to-br from-slate-100 to-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                        <span className="text-sm font-bold text-white">
                          {getUserDisplayName().charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{getUserDisplayName()}</p>
                        <p className="text-xs text-slate-500">{getUserTypeName()}</p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => base44.auth.logout()}
                    className="w-full nav-button px-4 py-3 rounded-xl mt-3 text-slate-700 font-medium hover:bg-red-50 hover:text-red-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </>
              )}
            </div>
          </aside>
        )}

        {/* Main Content */}
        <main className={`
          flex-1 min-h-screen compact-layout
          ${normalizedUserType === 'dipendente' ? 'pt-24 pb-44 lg:pt-8 lg:pb-8 lg:ml-0' : normalizedUserType !== 'admin' ? 'pt-32 lg:pt-16' : 'pt-20 lg:pt-0'} 
          px-3 py-3 lg:px-6 lg:py-4
        `}>
          <PullToRefresh
            onRefresh={async () => {
              await queryClient.refetchQueries();
            }}
            pullingContent=""
            refreshingContent={
              <div className="flex justify-center py-4">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            }
          >
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </PullToRefresh>
        </main>
      </div>

      {/* Mobile Bottom Navigation (ALL roles) */}
      {bottomNavItems && bottomNavItems.length > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[100] safe-area-bottom bg-gradient-to-br from-slate-50 to-slate-100">
          <div className="px-2 pb-2 pt-1">
            <button
              onClick={() => setCompactMenu(!compactMenu)}
              className="w-full flex justify-center py-1 mb-1"
            >
              <div className="w-10 h-1 bg-slate-300 rounded-full" />
            </button>
            <div className="neumorphic-card p-2">
              {(() => {
                const allItems = [...bottomNavItems, { title: 'Logout', icon: LogOut, isLogout: true }];

                if (compactMenu) {
                  return (
                    <div className="flex items-stretch justify-between gap-1">
                      {allItems.map((item) => {
                        const isActive = !item.isLogout && isActiveLink(item.url);
                        const Icon = item.icon || User;
                        if (item.isLogout) {
                          return (
                            <button
                              key="logout"
                              onClick={() => base44.auth.logout()}
                              className="bottom-nav-item compact"
                            >
                              <Icon className="text-slate-600" />
                            </button>
                          );
                        }
                        return (
                          <Link
                            key={item.url}
                            to={item.url}
                            onClick={(e) => {
                              if (isActive) {
                                e.preventDefault();
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              } else {
                                handleTabClick(item.url, e);
                              }
                            }}
                            className={`bottom-nav-item compact ${isActive ? 'active' : ''}`}
                          >
                            <Icon className={`${isActive ? 'text-white' : 'text-slate-600'}`} />
                          </Link>
                        );
                      })}
                    </div>
                  );
                }

                const itemsPerRow = Math.ceil(allItems.length / 2);
                const firstRow = allItems.slice(0, itemsPerRow);
                const secondRow = allItems.slice(itemsPerRow);

                return (
                  <div className="space-y-1.5">
                    <div className="flex items-stretch justify-between gap-1.5">
                      {firstRow.map((item) => {
                        const isActive = !item.isLogout && isActiveLink(item.url);
                        const Icon = item.icon || User;
                        if (item.isLogout) {
                          return (
                            <button
                              key="logout"
                              onClick={() => base44.auth.logout()}
                              className="bottom-nav-item"
                            >
                              <Icon className="text-slate-600" />
                              <span className="text-slate-600">{item.title}</span>
                            </button>
                          );
                        }
                        return (
                          <Link
                            key={item.url}
                            to={item.url}
                            onClick={(e) => {
                              if (isActive) {
                                e.preventDefault();
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              } else {
                                handleTabClick(item.url, e);
                              }
                            }}
                            className={`bottom-nav-item ${isActive ? 'active' : ''}`}
                          >
                            <Icon className={`${isActive ? 'text-white' : 'text-slate-600'}`} />
                            <span className={`${isActive ? 'text-white' : 'text-slate-600'}`}>
                              {item.title}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                    {secondRow.length > 0 && (
                      <div className="flex items-stretch justify-between gap-1.5">
                        {secondRow.map((item) => {
                          const isActive = !item.isLogout && isActiveLink(item.url);
                          const Icon = item.icon || User;
                          if (item.isLogout) {
                            return (
                              <button
                                key="logout"
                                onClick={() => base44.auth.logout()}
                                className="bottom-nav-item"
                              >
                                <Icon className="text-slate-600" />
                                <span className="text-slate-600">{item.title}</span>
                              </button>
                            );
                          }
                          return (
                            <Link
                              key={item.url}
                              to={item.url}
                              onClick={(e) => {
                                if (isActive) {
                                  e.preventDefault();
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                } else {
                                  handleTabClick(item.url, e);
                                }
                              }}
                              className={`bottom-nav-item ${isActive ? 'active' : ''}`}
                            >
                              <Icon className={`${isActive ? 'text-white' : 'text-slate-600'}`} />
                              <span className={`${isActive ? 'text-white' : 'text-slate-600'}`}>
                                {item.title}
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && normalizedUserType !== 'dipendente' && (
        <div
          className="fixed inset-0 bg-black bg-opacity-20 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* WhatsApp Floating Button (Admin/Manager only) */}
      {normalizedUserType === 'admin' || normalizedUserType === 'manager' ? (
        <a
          href={base44.agents.getWhatsAppConnectURL('assistente_dipendenti')}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-green-600 shadow-lg hover:shadow-xl transition-all flex items-center justify-center group hover:scale-110"
          title="WhatsApp Assistente">
          <MessageCircle className="w-7 h-7 text-white" />
          <span className="absolute right-16 top-1/2 -translate-y-1/2 bg-slate-800 text-white px-3 py-1.5 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            WhatsApp Bot
          </span>
        </a>
      ) : null}
      </div>
      );
      }