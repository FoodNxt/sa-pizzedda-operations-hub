import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import ProtectedPage from "../components/ProtectedPage";
import { Settings, ChefHat, Truck, BarChart3, Package } from "lucide-react";

const inventoryAdminPages = [
  {
    title: "Preparazioni",
    page: "PreparazioniAdmin",
    icon: ChefHat,
    description: "Gestisci preparazioni e semilavorati",
    gradient: "from-orange-500 to-red-600"
  },
  {
    title: "Spostamenti",
    page: "SpostamentiAdmin",
    icon: Truck,
    description: "Visualizza spostamenti tra locali",
    gradient: "from-blue-500 to-indigo-600"
  },
  {
    title: "Controllo Consumi",
    page: "ControlloConsumi",
    icon: BarChart3,
    description: "Analisi consumi e sprechi",
    gradient: "from-purple-500 to-pink-600"
  }
];

export default function AdminInventory() {
  const navigate = useNavigate();

  return (
    <ProtectedPage pageName="AdminInventory">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: '#000000' }}>Admin Inventory</h1>
              <p className="text-sm text-slate-600">Gestione e configurazione inventario</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {inventoryAdminPages.map((page) => {
            const Icon = page.icon;
            return (
              <NeumorphicCard
                key={page.page}
                className="p-6 cursor-pointer hover:shadow-xl transition-all group"
                onClick={() => navigate(createPageUrl(page.page))}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${page.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-800 mb-1">{page.title}</h3>
                    <p className="text-sm text-slate-600">{page.description}</p>
                  </div>
                </div>
              </NeumorphicCard>
            );
          })}
        </div>
      </div>
    </ProtectedPage>
  );
}