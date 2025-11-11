
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
  BookOpen
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
        title: "Inventory Dashboard",
        url: createPageUrl("Inventory"),
        icon: Package,
      },
      {
        title: "Ricette",
        url: createPageUrl("Ricette"),
        icon: ChefHat,
      },
      {
        title: "Inventario Admin",
        url: createPageUrl("InventarioAdmin"),
        icon: ClipboardCheck,
      },
      {
        title: "Form Inventario",
        url: createPageUrl("FormInventario"),
        icon: ClipboardList,
      },
      {
        title: "Form Cantina",
        url: createPageUrl("FormCantina"),
        icon: ClipboardList,
      },
      {
        title: "Inventario",
        url: createPageUrl("QuantitaMinime"),
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
        title: "Teglie Buttate",
        url: createPageUrl("TeglieButtate"),
        icon: AlertTriangle,
      },
      {
        title: "Preparazioni",
        url: createPageUrl("Preparazioni"),
        icon: Package,
      }
    ]
  },
  {
    title: "People",
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
        title: "Academy Admin",
        url: createPageUrl("AcademyAdmin"),
        icon: GraduationCap,
      },
      {
        title: "Contratti",
        url: createPageUrl("Contratti"),
        icon: FileText,
      },
      {
        title: "Ricalcola Ritardi",
        url: createPageUrl("RecalculateShifts"),
        icon: Clock,
      },
      {
        title: "Elimina Duplicati",
        url: createPageUrl("CleanupDuplicateShifts"),
        icon: AlertTriangle,
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
    requiredUserType: ["dipendente"],
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
        title: "Form Inventario",
        url: createPageUrl("FormInventario"),
        icon: ClipboardList,
      },
      {
        title: "Conteggio Cassa",
        url: createPageUrl("ConteggioCassa"),
        icon: DollarSign,
      },
      {
        title: "Teglie Buttate",
        url: createPageUrl("TeglieButtate"),
        icon: AlertTriangle,
      },
      {
        title: "Preparazioni",
        url: createPageUrl("Preparazioni"),
        icon: Package,
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
    "People": true,
    "Pulizie": true,
    "Delivery": true,
    "View Dipendente": true,
    "Zapier Guide": true,
    "Sistema": true,
    "Il Mio Profilo": true // Added for default expansion, used by dipendente special case
  });
  const [dipendenteNav, setDipendenteNav] = useState(null); // State for dipendente's progressive navigation

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);

        // ALWAYS show modal if profile was not manually completed
        const needsProfile = !user.profile_manually_completed;
        setShowProfileModal(needsProfile);

        // CRITICAL RESTRICTION FOR DIPENDENTE
        if (user.user_type === 'dipendente') {
          const userRoles = user.ruoli_dipendente || [];

          // 1. If NO roles → ONLY Profilo
          if (userRoles.length === 0) {
            if (location.pathname !== createPageUrl("ProfiloDipendente")) {
              navigate(createPageUrl("ProfiloDipendente"), { replace: true });
            }
            return;
          }

          // 2. Check contract status
          const hasReceivedContract = await checkIfContractReceived(user.id);
          const hasSignedContract = await checkIfContractSigned(user.id);
          const contractStarted = user.data_inizio_contratto && new Date(user.data_inizio_contratto) <= new Date();

          // Determine allowed pages based on status
          const allowedPages = [createPageUrl("ProfiloDipendente")];

          // After receiving contract (inviato status)
          if (hasReceivedContract) { // Changed from hasSignedContract || contractStarted to just hasReceivedContract for "ContrattiDipendente"
            allowedPages.push(createPageUrl("ContrattiDipendente"));
          }

          // After signing contract
          if (hasSignedContract) {
            allowedPages.push(createPageUrl("Academy"));
          }

          // After contract start date AND signed
          if (contractStarted && hasSignedContract) {
            allowedPages.push(
              createPageUrl("Valutazione"),
              createPageUrl("ControlloPuliziaCassiere"),
              createPageUrl("ControlloPuliziaPizzaiolo"),
              createPageUrl("ControlloPuliziaStoreManager"),
              createPageUrl("FormInventario"),
              createPageUrl("ConteggioCassa"),
              createPageUrl("TeglieButtate"),
              createPageUrl("Preparazioni")
            );
          }

          // If current page is not in allowed pages, redirect to Profilo
          if (!allowedPages.includes(location.pathname)) {
            navigate(createPageUrl("ProfiloDipendente"), { replace: true });
          }
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };
    fetchUser();
  }, [location.pathname, navigate]);


  useEffect(() => {
    if (currentUser?.user_type === 'dipendente') {
      getFilteredNavigationForDipendente(currentUser).then(nav => {
        setDipendenteNav(nav);
      });
    }
  }, [currentUser]); // Re-run when currentUser changes

  // Helper function to check if contract is signed
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

  // Helper function to check if user has received any contract (status is 'inviato' or 'firmato')
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

    const userType = currentUser.user_type || 'dipendente';
    const userRoles = currentUser.ruoli_dipendente || [];

    // Check user type
    if (!requiredUserType.includes(userType)) return false;

    // Check role if specified and user is a dipendente
    if (requiredRole && userType === 'dipendente') {
      return userRoles.includes(requiredRole);
    }

    return true;
  };

  // Filter navigation based on dipendente's progressive access
  const getFilteredNavigationForDipendente = async (user) => {
    if (user.user_type !== 'dipendente') return null;

    const userRoles = user.ruoli_dipendente || [];

    // 1. No roles → ONLY Profilo
    if (userRoles.length === 0) {
      return [{
        title: "Il Mio Profilo",
        icon: User,
        type: "section",
        items: [{
          title: "Profilo",
          url: createPageUrl("ProfiloDipendente"),
          icon: User,
        }]
      }];
    }

    // 2. Check contract status
    const hasReceivedContract = await checkIfContractReceived(user.id);
    const hasSignedContract = await checkIfContractSigned(user.id);
    const contractStarted = user.data_inizio_contratto && new Date(user.data_inizio_contratto) <= new Date();

    // Build menu items progressively
    const menuItems = [
      {
        title: "Profilo",
        url: createPageUrl("ProfiloDipendente"),
        icon: User,
      }
    ];

    // Add Contratti if received or signed
    if (hasReceivedContract) { // If contract was received, show "Contratti"
      menuItems.push({
        title: "Contratti",
        url: createPageUrl("ContrattiDipendente"),
        icon: FileText,
      });
    }

    // Add Academy if contract signed
    if (hasSignedContract) {
      menuItems.push({
        title: "Academy",
        url: createPageUrl("Academy"),
        icon: GraduationCap,
      });
    }

    // Add operational pages if contract started AND signed
    if (contractStarted && hasSignedContract) {
      menuItems.push({
        title: "Valutazione",
        url: createPageUrl("Valutazione"),
        icon: ClipboardCheck,
      });

      // Add role-specific cleaning pages if the user has the role
      if (userRoles.includes("Cassiere")) {
        menuItems.push({
          title: "Controllo Pulizia Cassiere",
          url: createPageUrl("ControlloPuliziaCassiere"),
          icon: Camera,
          requiredRole: "Cassiere"
        });
      }
      if (userRoles.includes("Pizzaiolo")) {
        menuItems.push({
          title: "Controllo Pulizia Pizzaiolo",
          url: createPageUrl("ControlloPuliziaPizzaiolo"),
          icon: Camera,
          requiredRole: "Pizzaiolo"
        });
      }
      if (userRoles.includes("Store Manager")) {
        menuItems.push({
          title: "Controllo Pulizia Store Manager",
          url: createPageUrl("ControlloPuliziaStoreManager"),
          icon: Camera,
          requiredRole: "Store Manager"
        });
      }

      menuItems.push(
        {
          title: "Form Inventario",
          url: createPageUrl("FormInventario"),
          icon: ClipboardList,
        },
        {
          title: "Conteggio Cassa",
          url: createPageUrl("ConteggioCassa"),
          icon: DollarSign,
        },
        {
          title: "Teglie Buttate",
          url: createPageUrl("TeglieButtate"),
          icon: AlertTriangle,
        },
        {
          title: "Preparazioni",
          url: createPageUrl("Preparazioni"),
          icon: Package,
        }
      );
    }

    return [{
      title: "Area Dipendente",
      icon: Users,
      type: "section",
      items: menuItems
    }];
  };

  const filteredNavigation = navigationStructure
    .filter(section => hasAccess(section.requiredUserType))
    .map(section => ({
      ...section,
      items: section.items.filter(item => hasAccess(item.requiredUserType, item.requiredRole))
    }))
    .filter(section => section.items.length > 0);

  // Use progressive navigation for dipendenti
  const finalNavigation = currentUser?.user_type === 'dipendente'
    ? (dipendenteNav || [])
    : filteredNavigation;

  const getUserDisplayName = () => {
    if (!currentUser) return 'Caricamento...';
    return currentUser.nome_cognome || currentUser.full_name || currentUser.email || 'Utente';
  };

  const getUserTypeName = () => {
    if (!currentUser) return '';
    const userType = currentUser.user_type || 'dipendente';
    return userType === 'admin' ? 'Amministratore' :
           userType === 'manager' ? 'Manager' :
           'Dipendente';
  };

  return (
    <div className="min-h-screen bg-[#e0e5ec]">
      {/* Complete Profile Modal */}
      {showProfileModal && currentUser && (
        <CompleteProfileModal
          user={currentUser}
          onComplete={handleProfileComplete}
        />
      )}

      <style>{`
        .neumorphic-card {
          background: #e0e5ec;
          border-radius: 16px;
          box-shadow: 8px 8px 16px #b8bec8, -8px -8px 16px #ffffff;
        }

        .neumorphic-pressed {
          background: #e0e5ec;
          border-radius: 16px;
          box-shadow: inset 4px 4px 8px #b8bec8, inset -4px -4px 8px #ffffff;
        }

        .neumorphic-flat {
          background: #e0e5ec;
          border-radius: 12px;
          box-shadow: 4px 4px 8px #b8bec8, -4px -4px 8px #ffffff;
        }

        .nav-button {
          background: #e0e5ec;
          border-radius: 12px;
          box-shadow: 4px 4px 8px #b8bec8, -4px -4px 8px #ffffff;
          transition: all 0.2s ease;
        }

        .nav-button:hover {
          box-shadow: 6px 6px 12px #b8bec8, -6px -6px 12px #ffffff;
        }

        .nav-button-active {
          background: #e0e5ec;
          box-shadow: inset 3px 3px 6px #b8bec8, inset -3px -3px 6px #ffffff;
        }

        .logo-shadow {
          filter: drop-shadow(2px 2px 4px #b8bec8) drop-shadow(-2px -2px 4px #ffffff);
        }
      `}</style>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 neumorphic-card m-4 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Pizza className="w-8 h-8 text-[#8b7355] logo-shadow" />
            <span className="text-xl font-bold text-[#6b6b6b]">Sa Pizzedda</span>
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="nav-button p-2"
          >
            {sidebarOpen ? <X className="w-6 h-6 text-[#6b6b6b]" /> : <Menu className="w-6 h-6 text-[#6b6b6b]" />}
          </button>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-72 transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <div className="h-full neumorphic-card m-4 p-6 flex flex-col overflow-y-auto">
            {/* Logo */}
            <div className="hidden lg:flex items-center gap-3 mb-8">
              <div className="neumorphic-flat p-3">
                <Pizza className="w-8 h-8 text-[#8b7355]" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#6b6b6b]">Sa Pizzedda</h1>
                <p className="text-xs text-[#9b9b9b]">Workspace</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1">
              {finalNavigation.map((item) => {
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
                        ${isActive ? 'nav-button-active' : 'nav-button'}
                      `}
                    >
                      <item.icon className={`w-5 h-5 ${isActive ? 'text-[#8b7355]' : 'text-[#9b9b9b]'}`} />
                      <span className={`font-medium ${isActive ? 'text-[#6b6b6b]' : 'text-[#9b9b9b]'}`}>
                        {item.title}
                      </span>
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
                          ${sectionActive ? 'nav-button-active' : 'nav-button'}
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon className={`w-5 h-5 ${sectionActive ? 'text-[#8b7355]' : 'text-[#9b9b9b]'}`} />
                          <span className={`font-medium ${sectionActive ? 'text-[#6b6b6b]' : 'text-[#9b9b9b]'}`}>
                            {item.title}
                          </span>
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-[#9b9b9b]" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-[#9b9b9b]" />
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
                                  ${isActive ? 'neumorphic-pressed' : 'hover:bg-[#d5dae3]'}
                                `}
                              >
                                <subItem.icon className={`w-4 h-4 ${isActive ? 'text-[#8b7355]' : 'text-[#9b9b9b]'}`} />
                                <span className={`text-sm font-medium ${isActive ? 'text-[#6b6b6b]' : 'text-[#9b9b9b]'}`}>
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
              })}
            </nav>

            {/* User Info */}
            <div className="neumorphic-pressed p-4 rounded-xl mt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full neumorphic-flat flex items-center justify-center">
                  <span className="text-sm font-bold text-[#8b7355]">
                    {getUserDisplayName().charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-[#6b6b6b]">{getUserDisplayName()}</p>
                  <p className="text-xs text-[#9b9b9b]">{getUserTypeName()}</p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-h-screen pt-20 lg:pt-0 p-4 lg:p-8">
          {children}
        </main>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-20 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
