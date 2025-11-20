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
  Edit
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
        title: "Ricette",
        url: createPageUrl("Ricette"),
        icon: ChefHat,
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
        title: "Elenco Fornitori",
        url: createPageUrl("ElencoFornitori"),
        icon: Truck,
      },
      {
        title: "Upload Fatture XML",
        url: createPageUrl("UploadFattureXML"),
        icon: Upload,
      },
      {
        title: "Prodotti Venduti",
        url: createPageUrl("ProdottiVenduti"),
        icon: ShoppingCart,
      },
      {
        title: "Gestione Impasti/Precotture",
        url: createPageUrl("GestioneImpastiPrecotture"),
        icon: ChefHat,
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
        title: "Employees",
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
        title: "Contratti",
        url: createPageUrl("Contratti"),
        icon: FileText,
      },
      {
        title: "Alert Periodo Prova",
        url: createPageUrl("AlertPeriodoProva"),
        icon: AlertTriangle,
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
        title: "Controllo Pulizie Master",
        url: createPageUrl("ControlloPulizieMaster"),
        icon: CheckSquare,
      },
      {
        title: "Controllo Pulizia Cassiere",
        url: createPageUrl("ControlloPuliziaCassiere"),
        icon: Camera,
        requiredUserType: ["admin", "manager"],
        requiredRole: null
      },
      {
        title: "Controllo Pulizia Pizzaiolo",
        url: createPageUrl("ControlloPuliziaPizzaiolo"),
        icon: Camera,
        requiredUserType: ["admin", "manager"],
        requiredRole: null
      },
      {
        title: "Controllo Pulizia Store Manager",
        url: createPageUrl("ControlloPuliziaStoreManager"),
        icon: Camera,
        requiredUserType: ["admin", "manager"],
        requiredRole: null
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
    title: "View Dipendente",
    icon: Users,
    type: "section",
    requiredUserType: ["dipendente", "user"],
    items: [
      {
        title: "Valutazione",
        url: createPageUrl("Valutazione"),
        icon: ClipboardCheck,
      },
      {
        title: "Profilo",
        url: createPageUrl("ProfiloDipendente"),
        icon: User,
      },
      {
        title: "Contratti",
        url: createPageUrl("ContrattiDipendente"),
        icon: FileText,
      },
      {
        title: "Academy",
        url: createPageUrl("Academy"),
        icon: GraduationCap,
      },
      {
        title: "Controllo Pulizia Cassiere",
        url: createPageUrl("ControlloPuliziaCassiere"),
        icon: Camera,
        requiredRole: "Cassiere"
      },
      {
        title: "Controllo Pulizia Pizzaiolo",
        url: createPageUrl("ControlloPuliziaPizzaiolo"),
        icon: Camera,
        requiredRole: "Pizzaiolo"
      },
      {
        title: "Controllo Pulizia Store Manager",
        url: createPageUrl("ControlloPuliziaStoreManager"),
        icon: Camera,
        requiredRole: "Store Manager"
      },
      {
        title: "Forms",
        url: createPageUrl("InventoryForms"),
        icon: Edit,
      },
      {
        title: "Conteggio Cassa",
        url: createPageUrl("ConteggioCassa"),
        icon: DollarSign,
      },
      {
        title: "Impasto",
        url: createPageUrl("Impasto"),
        icon: ChefHat,
      },
      {
        title: "Precotture",
        url: createPageUrl("Precotture"),
        icon: Pizza,
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
      },
      {
        title: "Vista Dipendente",
        url: createPageUrl("VistaDipendente"),
        icon: User,
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
    "Dashboard": true,
    "Reviews": true,
    "Financials": true,
    "Inventory": true,
    "HR": true,
    "Pulizie": true,
    "Delivery": true,
    "View Dipendente": true,
    "Zapier Guide": true,
    "Sistema": true,
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
            const allowedPages = pageAccessConfig?.after_registration || ['ProfiloDipendente'];
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

          let allowedPages = [];

          if (contractStarted && hasSignedContract) {
            allowedPages = pageAccessConfig?.after_contract_start || [
              'ProfiloDipendente', 'ContrattiDipendente', 'Academy', 'Valutazione',
              'ControlloPuliziaCassiere', 'ControlloPuliziaPizzaiolo', 'ControlloPuliziaStoreManager',
              'InventoryForms',
              'ConteggioCassa'
            ];
          } else if (hasSignedContract) {
            allowedPages = pageAccessConfig?.after_contract_signed || ['ProfiloDipendente', 'ContrattiDipendente', 'Academy'];
          } else if (hasReceivedContract) {
            allowedPages = pageAccessConfig?.after_contract_received || ['ProfiloDipendente', 'ContrattiDipendente'];
          } else {
            allowedPages = pageAccessConfig?.after_registration || ['ProfiloDipendente'];
          }

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

  const getFilteredNavigationForDipendente = async (user) => {
    const normalizedUserType = getNormalizedUserType(user.user_type);
    
    if (normalizedUserType !== 'dipendente') return null;

    const userRoles = user.ruoli_dipendente || [];

    if (userRoles.length === 0) {
      const allowedPages = pageAccessConfig?.after_registration || ['ProfiloDipendente'];
      return [{
        title: "Area Dipendente",
        icon: User,
        type: "section",
        items: allowedPages.map(pageName => ({
          title: getPageTitle(pageName),
          url: createPageUrl(pageName),
          icon: getPageIcon(pageName)
        }))
      }];
    }

    const hasReceivedContract = await checkIfContractReceived(user.id);
    const hasSignedContract = await checkIfContractSigned(user.id);
    const contractStarted = user.data_inizio_contratto && new Date(user.data_inizio_contratto) <= new Date();

    let allowedPages = [];

    if (contractStarted && hasSignedContract) {
      allowedPages = pageAccessConfig?.after_contract_start || [
        'ProfiloDipendente', 'ContrattiDipendente', 'Academy', 'Valutazione',
        'ControlloPuliziaCassiere', 'ControlloPuliziaPizzaiolo', 'ControlloPuliziaStoreManager',
        'InventoryForms',
        'ConteggioCassa'
      ];
    } else if (hasSignedContract) {
      allowedPages = pageAccessConfig?.after_contract_signed || ['ProfiloDipendente', 'ContrattiDipendente', 'Academy'];
    } else if (hasReceivedContract) {
      allowedPages = pageAccessConfig?.after_contract_received || ['ProfiloDipendente', 'ContrattiDipendente'];
    } else {
      allowedPages = pageAccessConfig?.after_registration || ['ProfiloDipendente'];
    }

    const menuItems = allowedPages
      .filter(pageName => {
        if (pageName === 'ControlloPuliziaCassiere') return userRoles.includes('Cassiere');
        if (pageName === 'ControlloPuliziaPizzaiolo') return userRoles.includes('Pizzaiolo');
        if (pageName === 'ControlloPuliziaStoreManager') return userRoles.includes('Store Manager');
        return true;
      })
      .map(pageName => ({
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
      'ContrattiDipendente': 'Contratti',
      'Academy': 'Academy',
      'Valutazione': 'Valutazione',
      'ControlloPuliziaCassiere': 'Pulizia',
      'ControlloPuliziaPizzaiolo': 'Pulizia',
      'ControlloPuliziaStoreManager': 'Pulizia',
      'InventoryForms': 'Forms',
      'ConteggioCassa': 'Cassa',
      'FinancialForms': 'Forms',
      'Impasto': 'Impasto',
      'Precotture': 'Precotture'
    };
    return titles[pageName] || pageName;
  };

  const getPageIcon = (pageName) => {
    const icons = {
      'ProfiloDipendente': User,
      'ContrattiDipendente': FileText,
      'Academy': GraduationCap,
      'Valutazione': ClipboardCheck,
      'ControlloPuliziaCassiere': Camera,
      'ControlloPuliziaPizzaiolo': Camera,
      'ControlloPuliziaStoreManager': Camera,
      'InventoryForms': Edit,
      'ConteggioCassa': DollarSign,
      'Impasto': ChefHat,
      'Precotture': Pizza
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

    const mainItems = dipendenteNav[0]?.items?.slice(0, 5) || [];
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
          color: white;
        }

        .bottom-nav-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 14px 10px;
          background: linear-gradient(145deg, #f0f4f8, #e1e8ed);
          border-radius: 18px;
          transition: all 0.3s ease;
          min-height: 80px;
        }

        .bottom-nav-item:active {
          transform: scale(0.95);
        }

        .bottom-nav-item.active {
          background: linear-gradient(145deg, #3b82f6, #2563eb);
          box-shadow: inset 3px 3px 8px rgba(0, 0, 0, 0.1);
        }

        @media (max-width: 1024px) {
          .hide-on-mobile {
            display: none !important;
          }

          /* Increase font sizes for dipendente mobile view */
          body.dipendente-mobile h1 {
            font-size: 1.75rem !important;
          }
          body.dipendente-mobile h2 {
            font-size: 1.5rem !important;
          }
          body.dipendente-mobile h3 {
            font-size: 1.25rem !important;
          }
          body.dipendente-mobile p, 
          body.dipendente-mobile span,
          body.dipendente-mobile label {
            font-size: 1rem !important;
          }
          body.dipendente-mobile .text-xs {
            font-size: 0.875rem !important;
          }
          body.dipendente-mobile .text-sm {
            font-size: 1rem !important;
          }
          body.dipendente-mobile button {
            font-size: 1rem !important;
            padding: 0.875rem 1.25rem !important;
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
        {/* Desktop Sidebar (Admin/Manager only) */}
        {normalizedUserType !== 'dipendente' && (
          <aside className={`
            fixed lg:static inset-y-0 left-0 z-40
            w-72 transform transition-transform duration-300 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            hide-on-mobile
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
                              transition-all duration-200
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
                            <div className="ml-4 mt-1 space-y-1">
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
        )}

        {/* Main Content */}
        <main className={`
          flex-1 min-h-screen 
          ${normalizedUserType === 'dipendente' ? 'pt-24 pb-28 lg:pt-8 lg:pb-8' : 'pt-20 lg:pt-0'} 
          px-3 py-4 lg:p-8
        `}>
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation (Dipendente only) */}
      {normalizedUserType === 'dipendente' && isFullyLoaded && bottomNavItems.length > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 px-2 pb-2">
          <div className="neumorphic-card p-2">
            <div className="flex items-center justify-around gap-1">
              {bottomNavItems.map((item) => {
                const isActive = isActiveLink(item.url);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.url}
                    to={item.url}
                    className={`bottom-nav-item ${isActive ? 'active' : ''}`}
                  >
                    <Icon className={`w-7 h-7 mb-1.5 ${isActive ? 'text-white' : 'text-slate-600'}`} />
                    <span className={`text-xs font-semibold ${isActive ? 'text-white' : 'text-slate-600'}`}>
                      {item.title}
                    </span>
                  </Link>
                );
              })}
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