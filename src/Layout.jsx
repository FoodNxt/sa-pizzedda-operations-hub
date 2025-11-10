
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
  ShoppingCart // Added ShoppingCart import
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
      // Removed "Daily Aggregation"
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
        title: "Inventario Admin", // NEW: Combined form
        url: createPageUrl("InventarioAdmin"),
        icon: ClipboardCheck, // Using ClipboardCheck icon
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
        title: "Inventario", // CHANGED from "Quantità Minime"
        url: createPageUrl("QuantitaMinime"),
        icon: AlertTriangle,
      },
      {
        title: "Elenco Fornitori", // NEW
        url: createPageUrl("ElencoFornitori"),
        icon: Truck,
      },
      {
        title: "Upload Fatture XML", // NEW
        url: createPageUrl("UploadFattureXML"),
        icon: Upload,
      },
      {
        title: "Prodotti Venduti", // NEW ITEM ADDED HERE
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
        title: "Controllo Pulizie Master", // New item added here
        url: createPageUrl("ControlloPulizieMaster"),
        icon: CheckSquare,
      },
      {
        title: "Controllo Pulizia Cassiere",
        url: createPageUrl("ControlloPuliziaCassiere"),
        icon: Camera,
        requiredUserType: ["admin", "manager"],
        requiredRole: null // Accessible to admin/manager without role restriction
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
  { // NEW: Delivery section
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
        icon: LinkIcon, // Using LinkIcon from lucide-react
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
        title: "Zapier Prodotti Venduti", // NEW ITEM ADDED HERE
        url: createPageUrl("ZapierProdottiVenduti"),
        icon: ShoppingCart,
      },
      {
        title: "Bulk Import Prodotti Venduti", // NEW ITEM ADDED HERE
        url: createPageUrl("BulkImportProdottiVenduti"),
        icon: Upload,
      }
    ]
  },
  { // New "Sistema" section
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
      { // NEW: Gestione Accesso Pagine
        title: "Gestione Accesso Pagine",
        url: createPageUrl("GestioneAccessoPagine"),
        icon: CheckSquare,
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
    "Il Mio Profilo": true
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);

        // ALWAYS show modal if profile was not manually completed
        // This catches both new registrations and Google logins
        const needsProfile = !user.profile_manually_completed;
        setShowProfileModal(needsProfile);

        // CRITICAL RESTRICTION FOR DIPENDENTE WITH NO ROLES
        if (user.user_type === 'dipendente') {
          const userRoles = user.ruoli_dipendente || [];

          // If dipendente has NO roles, ONLY allow access to ProfiloDipendente
          if (userRoles.length === 0) {
            // If not on profile page, redirect
            if (location.pathname !== createPageUrl("ProfiloDipendente")) {
              navigate(createPageUrl("ProfiloDipendente"), { replace: true });
            }
            return; // Stop further checks
          }

          // If dipendente HAS roles, redirect from restricted pages to Valutazione
          const isOnRestrictedPage =
            location.pathname === createPageUrl("Dashboard") ||
            location.pathname === createPageUrl("StoreReviews") ||
            location.pathname === createPageUrl("Financials") ||
            location.pathname === createPageUrl("RealTime") ||
            location.pathname === createPageUrl("ChannelComparison") ||
            location.pathname === createPageUrl("Inventory") ||
            location.pathname === '/' ||
            location.pathname === '';

          if (isOnRestrictedPage) {
            navigate(createPageUrl("Valutazione"), { replace: true });
          }
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };
    fetchUser();
  }, [location.pathname, navigate]);

  const handleProfileComplete = () => {
    setShowProfileModal(false);
    // Refresh user data
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

    // CRITICAL: If dipendente has NO roles, ONLY show Profilo (handled by finalNavigation special case)
    // All other navigation items for such a user should be hidden by default
    if (userType === 'dipendente' && userRoles.length === 0) {
      // This will prevent all sections/items from showing up in filteredNavigation
      // The only exception (Profilo) will be hardcoded into finalNavigation
      return false;
    }

    // Check user type
    if (!requiredUserType.includes(userType)) return false;

    // Check role if specified and user is a dipendente
    if (requiredRole && userType === 'dipendente') {
      // User must have the required role in their roles array
      return userRoles.includes(requiredRole);
    }

    return true;
  };

  const filteredNavigation = navigationStructure
    .filter(section => hasAccess(section.requiredUserType))
    .map(section => ({
      ...section,
      items: section.items.filter(item => hasAccess(item.requiredUserType, item.requiredRole))
    }))
    .filter(section => section.items.length > 0);

  // SPECIAL CASE: If dipendente with NO roles, show ONLY Profilo in navigation
  const finalNavigation = currentUser?.user_type === 'dipendente' && (currentUser.ruoli_dipendente || []).length === 0
    ? [{
        title: "Il Mio Profilo",
        icon: User,
        type: "section",
        items: [{
          title: "Profilo",
          url: createPageUrl("ProfiloDipendente"),
          icon: User,
        }]
      }]
    : filteredNavigation;

  const getUserDisplayName = () => {
    if (!currentUser) return 'Caricamento...';
    // Prioritize nome_cognome, fallback to full_name
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
