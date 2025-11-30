import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import {
  LayoutDashboard,
  MapPin,
  DollarSign,
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
  Calendar
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
        url: createPageUrl("Dashboard"),
        icon: LayoutDashboard,
      },
      {
        title: "Summary AI",
        url: createPageUrl("SummaryAI"),
        icon: Zap,
      },
      {
        title: "Form Tracker",
        url: createPageUrl("FormTracker"),
        icon: ClipboardCheck,
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
        url: createPageUrl("StoreReviews"),
        icon: MapPin,
      },
      {
        title: "Assign Reviews",
        url: createPageUrl("AssignReviews"),
        icon: UserCheck,
      },
      {
        title: "Employee Reviews",
        url: createPageUrl("EmployeeReviewsPerformance"),
        icon: Users,
      }
    ]
  },
  {
    title: "Financials",
    icon: DollarSign,
    type: "section",
    requiredUserType: ["admin", "manager"],
    items: [
      {
        title: "Real Time",
        url: createPageUrl("RealTime"),
        icon: Zap,
      },
      {
        title: "Financials",
        url: createPageUrl("Financials"),
        icon: DollarSign,
      },
      {
        title: "Channel Comparison",
        url: createPageUrl("ChannelComparison"),
        icon: BarChart3,
      },
      {
        title: "Storico Cassa",
        url: createPageUrl("StoricoCassa"),
        icon: DollarSign,
      },
      {
        title: "Forms",
        url: createPageUrl("FinancialForms"),
        icon: FileText,
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
        icon: DollarSign,
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
        title: "Inventario Store Manager",
        url: createPageUrl("InventarioStoreManager"),
        icon: Settings,
      },
      {
        title: "Inventory Admin",
        url: createPageUrl("InventarioAdmin"),
        icon: Settings,
        requiredUserType: ["admin"]
      },
      {
        title: "Forms",
        url: createPageUrl("InventoryForms"),
        icon: Edit,
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
        url: createPageUrl("Employees"),
        icon: Users,
      },
      {
        title: "Shifts",
        url: createPageUrl("Shifts"),
        icon: Clock,
      },
      {
        title: "Payroll",
        url: createPageUrl("Payroll"),
        icon: DollarSign,
      },
      {
        title: "Alerts",
        url: createPageUrl("Alerts"),
        icon: AlertTriangle,
      },
      {
        title: "Academy",
        url: createPageUrl("AcademyAdmin"),
        icon: GraduationCap,
      },
      {
        title: "Documenti",
        url: createPageUrl("Documenti"),
        icon: FileText,
      },
      {
        title: "Feedback P2P",
        url: createPageUrl("FeedbackP2P"),
        icon: Users,
      },
      {
        title: "Struttura Turno",
        url: createPageUrl("StrutturaTurno"),
        icon: Calendar,
      },
      {
        title: "Assistente AI",
        url: createPageUrl("GestioneAssistente"),
        icon: Users,
      },
      {
        title: "Planday",
        url: createPageUrl("Planday"),
        icon: Calendar,
      },
      {
        title: "HR Admin",
        url: createPageUrl("HRAdmin"),
        icon: Settings,
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
        title: "Storico Pulizie",
        url: createPageUrl("Pulizie"),
        icon: Zap,
      },
      {
        title: "Pulizie Match",
        url: createPageUrl("PulizieMatch"),
        icon: Users,
      },
      {
        title: "Form Pulizia",
        url: createPageUrl("FormPulizia"),
        icon: Camera,
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
        url: createPageUrl("ZapierSetup"),
        icon: Zap,
      },
      {
        title: "Zapier Shifts",
        url: createPageUrl("ShiftsSetup"),
        icon: Zap,
      },
      {
        title: "Zapier Orders",
        url: createPageUrl("OrderItemsSetup"),
        icon: Zap,
      },
      {
        title: "Zapier Inventory",
        url: createPageUrl("InventorySetup"),
        icon: Zap,
      },
      {
        title: "Zapier iPratico",
        url: createPageUrl("IPraticoSetup"),
        icon: Zap,
      },
      {
        title: "Bulk Import iPratico",
        url: createPageUrl("IPraticoBulkImport"),
        icon: Upload,
      },
      {
        title: "Zapier Prodotti Venduti",
        url: createPageUrl("ZapierProdottiVenduti"),
        icon: ShoppingCart,
      },
      {
        title: "Bulk Import Prodotti Venduti",
        url: createPageUrl("BulkImportProdottiVenduti"),
        icon: Upload,
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
        title: "Gestione Accesso Pagine",
        url: createPageUrl("GestioneAccessoPagine"),
        icon: CheckSquare,
      },
      {
        title: "Funzionamento App",
        url: createPageUrl("FunzionamentoApp"),
        icon: BookOpen,
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
    "Il Mio Profilo": true,
    "Area Dipendente": true
  });
  const [dipendenteNav, setDipendenteNav] = useState(null);
  const [pageAccessConfig, setPageAccessConfig] = useState(null);
  
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      setIsLoadingConfig(true);
      try {
        const configs = await base44.entities.PageAccessConfig.list();
        const activeConfig = configs.find(c => c.is_active);
        setPageAccessConfig(activeConfig || null);
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
    const fetchUser = async () => {
      setIsLoadingUser(true);
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);

        const needsProfile = !user.profile_manually_completed;
        setShowProfileModal(needsProfile);

        const normalizedUserType = getNormalizedUserType(user.user_type);

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
    if (currentUser && !isLoadingConfig && !isLoadingUser) {
      const normalizedUserType = getNormalizedUserType(currentUser.user_type);
      
      if (normalizedUserType === 'dipendente') {
        getFilteredNavigationForDipendente(currentUser).then(nav => {
          setDipendenteNav(nav);
        });
      }
    }
  }, [currentUser, pageAccessConfig, isLoadingConfig, isLoadingUser]);

  const checkIfContractSigned = async (userId) => {
    try {
      const contratti = await base44.entities.Contratto.filter({
        user_id: userId,
        status: 'firmato'
      });
      return contratti.length > 0;
    } catch (error) {
      console.error('Error checking contract status:', error);
      return false;
    }
  };

  const checkIfContractReceived = async (userId) => {
    try {
      const contratti = await base44.entities.Contratto.filter({
        user_id: userId
      });
      return contratti.length > 0;
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
    setExpandedSections(prev => ({
      ...prev,
      [sectionTitle]: !prev[sectionTitle]
    }));
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

  const hasAccess = (requiredUserType, requiredRole) => {
    if (!requiredUserType) return true;
    if (!currentUser) return false;

    const normalizedUserType = getNormalizedUserType(currentUser.user_type);
    const userRoles = currentUser.ruoli_dipendente || [];

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
    const normalizedUserType = getNormalizedUserType(user.user_type);
    
    if (normalizedUserType !== 'dipendente') return null;

    const userRoles = user.ruoli_dipendente || [];

    if (userRoles.length === 0) {
      const allowedPagesConfig = normalizePageConfig(pageAccessConfig?.after_registration || [{ page: 'ProfiloDipendente', showInMenu: true, showInForms: false }]);
      const menuPages = allowedPagesConfig
        .filter(p => p.showInMenu === true)
        .map(p => p.page);
      
      return [{
        title: "Area Dipendente",
        icon: User,
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
      'AssistenteDipendente': 'Assistente'
    };
    return titles[pageName] || pageName;
  };

  const getPageIcon = (pageName) => {
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
      'ConteggioCassa': DollarSign,
      'FormTeglieButtate': AlertTriangle,
      'Preparazioni': ChefHat,
      'FeedbackP2P': Users,
      'InventarioStoreManager': Package,
      'TurniDipendente': Clock
    };
    return icons[pageName] || User;
  };

  const filteredNavigation = (!isLoadingConfig && !isLoadingUser && currentUser) 
    ? navigationStructure
        .filter(section => hasAccess(section.requiredUserType))
        .map(section => ({
          ...section,
          items: section.items.filter(item => hasAccess(item.requiredUserType, item.requiredRole))
        }))
        .filter(section => section.items.length > 0)
    : [];

  const normalizedUserType = currentUser ? getNormalizedUserType(currentUser.user_type) : null;
  
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

  // Get main navigation items for bottom bar (dipendente only)
  const getBottomNavItems = () => {
    if (!dipendenteNav || dipendenteNav.length === 0) return [];

    const mainItems = dipendenteNav[0]?.items || [];
    return mainItems;
  };

  const bottomNavItems = normalizedUserType === 'dipendente' ? getBottomNavItems() : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {showProfileModal && currentUser && (
        <CompleteProfileModal
          user={currentUser}
          onComplete={handleProfileComplete}
        />
      )}

      <style>{`
        .neumorphic-card {
          background: linear-gradient(145deg, #f0f4f8, #d9e2ec);
          border-radius: 20px;
          box-shadow: 8px 8px 20px rgba(136, 165, 191, 0.48), -8px -8px 20px #ffffff;
        }

        .neumorphic-pressed {
          background: linear-gradient(145deg, #d9e2ec, #f0f4f8);
          border-radius: 16px;
          box-shadow: inset 4px 4px 10px rgba(136, 165, 191, 0.4), inset -4px -4px 10px #ffffff;
        }

        .neumorphic-flat {
          background: linear-gradient(145deg, #f0f4f8, #e1e8ed);
          border-radius: 12px;
          box-shadow: 4px 4px 12px rgba(136, 165, 191, 0.4), -4px -4px 12px #ffffff;
        }

        .nav-button {
          background: linear-gradient(145deg, #f0f4f8, #e1e8ed);
          border-radius: 14px;
          box-shadow: 4px 4px 10px rgba(136, 165, 191, 0.3), -4px -4px 10px #ffffff;
          transition: all 0.3s ease;
        }

        .nav-button:hover {
          box-shadow: 6px 6px 16px rgba(136, 165, 191, 0.4), -6px -6px 16px #ffffff;
          transform: translateY(-1px);
        }

        .nav-button-active {
          background: linear-gradient(145deg, #3b82f6, #2563eb);
          box-shadow: inset 3px 3px 8px rgba(0, 0, 0, 0.1), inset -3px -3px 8px rgba(255, 255, 255, 0.1);
          color: #1e293b;
        }

        .bottom-nav-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 8px 4px;
          background: linear-gradient(145deg, #f0f4f8, #e1e8ed);
          border-radius: 12px;
          transition: all 0.2s ease;
          min-height: 60px;
          min-width: 0;
        }

        .bottom-nav-item:active {
          transform: scale(0.95);
        }

        .bottom-nav-item.active {
          background: linear-gradient(145deg, #3b82f6, #2563eb);
          box-shadow: inset 3px 3px 8px rgba(0, 0, 0, 0.1);
        }

        .bottom-nav-item svg {
          width: 20px !important;
          height: 20px !important;
          margin-bottom: 2px;
          flex-shrink: 0;
        }

        .bottom-nav-item span {
          font-size: 10px !important;
          font-weight: 600 !important;
          text-align: center;
          line-height: 1.2;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 100%;
        }

        @media (max-width: 1024px) {
          .hide-on-mobile {
            display: none !important;
          }
        }
      `}</style>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 mx-2 mt-2">
        <div className="neumorphic-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                <Pizza className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-lg font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">
                  Sa Pizzedda
                </span>
                <p className="text-xs text-slate-500">{getUserTypeName()}</p>
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
            w-72 transform transition-transform duration-300 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            hide-on-mobile
            ${normalizedUserType !== 'admin' ? 'mt-12' : ''}
          `}>
            <div className="h-full neumorphic-card m-4 p-6 flex flex-col overflow-y-auto">
              <div className="hidden lg:flex items-center gap-3 mb-8">
                <div className="neumorphic-flat p-3 bg-gradient-to-br from-blue-500 to-blue-600">
                  <Pizza className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">Sa Pizzedda</h1>
                  <p className="text-xs text-slate-500">Admin Panel</p>
                </div>
              </div>

              <nav className="flex-1 space-y-1">
                {!isFullyLoaded ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
                    <p className="text-sm text-slate-500">Caricamento menu...</p>
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
                            flex items-center gap-3 px-4 py-3 rounded-xl
                            transition-all duration-200
                            ${isActive ? 'nav-button-active text-white' : 'nav-button text-slate-700'}
                          `}
                        >
                          <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-600'}`} />
                          <span className="font-medium">{item.title}</span>
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
                              w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl
                              transition-all duration-200 mb-1
                              ${sectionActive ? 'nav-button-active text-white' : 'nav-button text-slate-700'}
                            `}
                          >
                            <div className="flex items-center gap-3">
                              <item.icon className={`w-5 h-5 ${sectionActive ? 'text-white' : 'text-slate-600'}`} />
                              <span className="font-medium">{item.title}</span>
                            </div>
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>

                          {isExpanded && (
                            <div className="ml-4 mt-1 mb-2 space-y-1">
                              {item.items.map((subItem) => {
                                const isActive = isActiveLink(subItem.url);
                                return (
                                  <Link
                                    key={subItem.title}
                                    to={subItem.url}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`
                                      flex items-center gap-3 px-4 py-2 rounded-lg
                                      transition-all duration-200
                                      ${isActive ? 'neumorphic-pressed bg-blue-50' : 'hover:bg-slate-100'}
                                    `}
                                  >
                                    <subItem.icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
                                    <span className={`text-sm font-medium ${isActive ? 'text-slate-800' : 'text-slate-600'}`}>
                                      {subItem.title}
                                    </span>
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
                  <h1 className="text-xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">Sa Pizzedda</h1>
                  <p className="text-xs text-slate-500">Area Dipendente</p>
                </div>
              </div>

              <nav className="flex-1 space-y-2">
                {isFullyLoaded ? (
                  bottomNavItems.map((item) => {
                    const isActive = isActiveLink(item.url);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.url}
                        to={item.url}
                        className={`
                          flex items-center gap-3 px-4 py-3 rounded-xl
                          transition-all duration-200
                          ${isActive ? 'nav-button-active text-white' : 'nav-button text-slate-700'}
                        `}
                      >
                        <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-600'}`} />
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
          flex-1 min-h-screen 
          ${normalizedUserType === 'dipendente' ? 'pt-20 pb-20 lg:pt-8 lg:pb-8 lg:ml-0' : normalizedUserType !== 'admin' ? 'pt-32 lg:pt-16' : 'pt-20 lg:pt-0'} 
          px-3 py-4 lg:p-8
        `}>
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation (Dipendente only) */}
      {normalizedUserType === 'dipendente' && isFullyLoaded && bottomNavItems.length > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 px-1 pb-1 safe-area-bottom">
          <div className="neumorphic-card p-1.5">
            <div className="flex items-stretch justify-between gap-1">
              {bottomNavItems.map((item) => {
                const isActive = isActiveLink(item.url);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.url}
                    to={item.url}
                    className={`bottom-nav-item ${isActive ? 'active' : ''}`}
                  >
                    <Icon className={`${isActive ? 'text-white' : 'text-slate-600'}`} />
                    <span className={`${isActive ? 'text-white' : 'text-slate-600'}`}>
                      {item.title}
                    </span>
                  </Link>
                );
              })}
              <button
                onClick={() => base44.auth.logout()}
                className="bottom-nav-item"
              >
                <LogOut className="text-slate-600" />
                <span className="text-slate-600">Logout</span>
              </button>
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
    </div>
  );
}