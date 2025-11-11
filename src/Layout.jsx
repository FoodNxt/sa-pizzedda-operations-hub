
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
  const [finalNavigation, setFinalNavigation] = useState([]);
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
    "Il Mio Profilo": true
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);

        // ALWAYS show modal if profile was not manually completed
        const needsProfile = !user.profile_manually_completed;
        setShowProfileModal(needsProfile);

        // CRITICAL: Dipendente visibility logic
        if (user.user_type === 'dipendente') {
          const userRoles = user.ruoli_dipendente || [];

          // PHASE 1: ONLY Profile - if no roles
          if (userRoles.length === 0) {
            if (location.pathname !== createPageUrl("ProfiloDipendente")) {
              navigate(createPageUrl("ProfiloDipendente"), { replace: true });
            }
            return;
          }

          // PHASE 2: Check if contract received
          const hasContracts = await base44.entities.Contratto.filter({ user_id: user.id });
          const hasContract = hasContracts && hasContracts.length > 0;

          // PHASE 3: Check if contract signed
          const hasSignedContract = hasContracts?.some(c => c.status === 'firmato');

          // PHASE 4: Check if contract started (data_inizio_contratto <= today)
          const contractStarted = hasSignedContract && user.data_inizio_contratto
            ? new Date(user.data_inizio_contratto) <= new Date()
            : false;

          // Define allowed pages based on phase
          const allowedPages = [createPageUrl("ProfiloDipendente")];

          // Add Contratti if has received contract
          if (hasContract) {
            allowedPages.push(createPageUrl("ContrattiDipendente"));
          }

          // Add Academy if signed contract
          if (hasSignedContract) {
            allowedPages.push(createPageUrl("Academy"));
          }

          // Add all forms + Valutazione if contract started
          if (contractStarted) {
            allowedPages.push(
              createPageUrl("Valutazione")
            );
            // Dynamically add cleaning forms if user has the role AND contract has started
            if (userRoles.includes("Cassiere")) allowedPages.push(createPageUrl("ControlloPuliziaCassiere"));
            if (userRoles.includes("Pizzaiolo")) allowedPages.push(createPageUrl("ControlloPuliziaPizzaiolo"));
            if (userRoles.includes("Store Manager")) allowedPages.push(createPageUrl("ControlloPuliziaStoreManager"));

            allowedPages.push(
              createPageUrl("FormInventario"),
              createPageUrl("ConteggioCassa"),
              createPageUrl("TeglieButtate"),
              createPageUrl("Preparazioni"),
              createPageUrl("FormCantina")
            );
          }

          // If current page is not allowed, redirect to appropriate page
          if (!allowedPages.includes(location.pathname)) {
            if (contractStarted) {
              navigate(createPageUrl("Valutazione"), { replace: true });
            } else if (hasSignedContract) {
              navigate(createPageUrl("Academy"), { replace: true });
            } else if (hasContract) {
              navigate(createPageUrl("ContrattiDipendente"), { replace: true });
            } else {
              navigate(createPageUrl("ProfiloDipendente"), { replace: true });
            }
            return; // Stop further checks after redirect
          }

          // Block access to economic/admin pages for dipendente
          const restrictedPages = [
            createPageUrl("Dashboard"),
            createPageUrl("StoreReviews"),
            createPageUrl("Financials"),
            createPageUrl("RealTime"),
            createPageUrl("ChannelComparison"),
            createPageUrl("Inventory"),
            createPageUrl("Employees"),
            createPageUrl("Shifts"),
            createPageUrl("Payroll"),
            createPageUrl("AcademyAdmin"),
            createPageUrl("Contratti"),
            createPageUrl("UsersManagement"),
            createPageUrl("SummaryAI"),
            createPageUrl("StoricoCassa"),
            createPageUrl("Ricette"),
            createPageUrl("QuantitaMinime"),
            createPageUrl("ElencoFornitori"),
            createPageUrl("UploadFattureXML"),
            createPageUrl("ProdottiVenduti"),
            createPageUrl("OrdiniSbagliati"),
            createPageUrl("MatchingOrdiniSbagliati"),
            createPageUrl("Pulizie"),
            createPageUrl("InventarioAdmin"),
            createPageUrl("ControlloPulizieMaster"),
            createPageUrl("RecalculateShifts"),
            createPageUrl("CleanupDuplicateShifts"),
            createPageUrl("ZapierSetup"),
            createPageUrl("ShiftsSetup"),
            createPageUrl("OrderItemsSetup"),
            createPageUrl("InventorySetup"),
            createPageUrl("IPraticoSetup"),
            createPageUrl("IPraticoBulkImport"),
            createPageUrl("ZapierProdottiVenduti"),
            createPageUrl("BulkImportProdottiVenduti"),
            createPageUrl("GestioneAccessoPagine"),
            createPageUrl("FunzionamentoApp")
          ];

          if (restrictedPages.includes(location.pathname)) {
            navigate(createPageUrl("ProfiloDipendente"), { replace: true });
          }
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        // Optionally redirect to login or error page if user fetch fails
        // navigate('/login', { replace: true });
      }
    };
    fetchUser();
  }, [location.pathname, navigate]); // Removed currentUser from dependencies to avoid infinite loop with setCurrentUser

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

  const buildNavigationForDipendente = async (user) => {
    if (!user || user.user_type !== 'dipendente') {
      return [];
    }

    const userRoles = user.ruoli_dipendente || [];

    // PHASE 1: No roles - ONLY Profilo
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

    // Get contract info
    const hasContracts = await base44.entities.Contratto.filter({ user_id: user.id });
    const hasContract = hasContracts && hasContracts.length > 0;
    const hasSignedContract = hasContracts?.some(c => c.status === 'firmato');
    const contractStarted = hasSignedContract && user.data_inizio_contratto
      ? new Date(user.data_inizio_contratto) <= new Date()
      : false;

    const items = [
      {
        title: "Profilo",
        url: createPageUrl("ProfiloDipendente"),
        icon: User,
      }
    ];

    // PHASE 2: Add Contratti if received
    if (hasContract) {
      items.push({
        title: "Contratti",
        url: createPageUrl("ContrattiDipendente"),
        icon: FileText,
      });
    }

    // PHASE 3: Add Academy if signed
    if (hasSignedContract) {
      items.push({
        title: "Academy",
        url: createPageUrl("Academy"),
        icon: GraduationCap,
      });
    }

    // PHASE 4: Add forms + Valutazione if started
    if (contractStarted) {
      items.push({
        title: "Valutazione",
        url: createPageUrl("Valutazione"),
        icon: ClipboardCheck,
      });

      // Add role-specific pulizie items only if the user has the role
      if (userRoles.includes("Cassiere")) {
        items.push({
          title: "Controllo Pulizia Cassiere",
          url: createPageUrl("ControlloPuliziaCassiere"),
          icon: Camera,
        });
      }
      if (userRoles.includes("Pizzaiolo")) {
        items.push({
          title: "Controllo Pulizia Pizzaiolo",
          url: createPageUrl("ControlloPuliziaPizzaiolo"),
          icon: Camera,
        });
      }
      if (userRoles.includes("Store Manager")) {
        items.push({
          title: "Controllo Pulizia Store Manager",
          url: createPageUrl("ControlloPuliziaStoreManager"),
          icon: Camera,
        });
      }

      items.push(
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
        },
        {
          title: "Form Cantina", // Add Form Cantina for dipendente if contract started
          url: createPageUrl("FormCantina"),
          icon: ClipboardList,
        }
      );
    }

    // Filter out potential duplicates or nulls and return as a section
    return [{
      title: "Il Mio Profilo",
      icon: User,
      type: "section",
      items: items.filter(Boolean) // Ensure no nulls in items array
    }];
  };

  useEffect(() => {
    const buildNav = async () => {
      if (!currentUser) {
        setFinalNavigation([]);
        return;
      }

      if (currentUser.user_type === 'dipendente') {
        const nav = await buildNavigationForDipendente(currentUser);
        setFinalNavigation(nav);
      } else {
        // Admin/Manager - show full navigation based on their user_type
        const filteredNav = navigationStructure
          .filter(section => {
            const requiredUserType = section.requiredUserType;
            // If requiredUserType is not defined, it's accessible to all types (or an error in config)
            if (!requiredUserType) return false; // Or true, depending on default policy
            return requiredUserType.includes(currentUser.user_type);
          })
          .map(section => ({
            ...section,
            items: section.items.filter(item => {
              const requiredUserType = item.requiredUserType;
              // If requiredUserType is not defined for an item, assume it inherits from section or is universally accessible
              if (!requiredUserType) return true;
              return requiredUserType.includes(currentUser.user_type);
            })
          }))
          .filter(section => section.items.length > 0); // Only keep sections with accessible items

        setFinalNavigation(filteredNav);
      }
    };

    buildNav();
  }, [currentUser]); // Re-run when currentUser changes

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
