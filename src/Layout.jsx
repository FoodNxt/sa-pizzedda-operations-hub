
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
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
  AlertTriangle
} from "lucide-react";

const navigationStructure = [
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: LayoutDashboard,
    type: "link"
  },
  {
    title: "Reviews",
    icon: Star,
    type: "section",
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
    items: [
      {
        title: "Financials",
        url: createPageUrl("Financials"),
        icon: DollarSign,
      },
      {
        title: "Channel Comparison",
        url: createPageUrl("ChannelComparison"),
        icon: BarChart3,
      }
    ]
  },
  {
    title: "People",
    icon: Users,
    type: "section",
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
    title: "Zapier Guide",
    icon: Zap,
    type: "section",
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
      }
    ]
  }
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    "Reviews": true,
    "Financials": true,
    "People": true,
    "Zapier Guide": true
  });

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

  return (
    <div className="min-h-screen bg-[#e0e5ec]">
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
              {navigationStructure.map((item) => {
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
                  <span className="text-sm font-bold text-[#8b7355]">U</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-[#6b6b6b]">Admin User</p>
                  <p className="text-xs text-[#9b9b9b]">Workspace Admin</p>
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
