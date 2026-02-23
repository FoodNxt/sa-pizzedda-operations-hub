import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import ProtectedPage from '../components/ProtectedPage';
import NeumorphicCard from '../components/neumorphic/NeumorphicCard';
import { Settings, Package, AlertTriangle, ChefHat, TrendingUp, BarChart3, Truck, Link as LinkIcon } from 'lucide-react';

const sectionAdminPages = [
  { title: 'Analisi Sprechi', page: 'AnalisiSprechi', icon: AlertTriangle, description: 'Configura e monitora sprechi' },
  { title: 'Ricette', page: 'Ricette', icon: ChefHat, description: 'Gestione ricette e ingredienti' },
  { title: 'Materie Prime', page: 'MateriePrime', icon: Package, description: 'Catalogo materie prime' },
  { title: 'Confronto Listini', page: 'ConfrontoListini', icon: BarChart3, description: 'Confronta prezzi fornitori' },
  { title: 'Mapping Prodotti', page: 'MappingProdottiVenduti', icon: LinkIcon, description: 'Collega prodotti venduti e materie prime' },
  { title: 'Impasto', page: 'StoricoImpasti', icon: ChefHat, description: 'Storico e configurazione impasti' },
  { title: 'Ordini Fornitori', page: 'OrdiniAdmin', icon: Truck, description: 'Gestione ordini' },
  { title: 'Controllo Consumi', page: 'ControlloConsumi', icon: TrendingUp, description: 'Analizza consumi vs vendite' }
];

export default function AdminInventory() {
  const navigate = useNavigate();

  return (
    <ProtectedPage pageName="AdminInventory">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
            <Settings className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Admin Inventory</h1>
            <p className="text-slate-500">Configura e gestisci le impostazioni inventario</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sectionAdminPages.map((page) => {
            const Icon = page.icon;
            return (
              <NeumorphicCard
                key={page.page}
                className="p-6 cursor-pointer hover:shadow-xl transition-all"
                onClick={() => navigate(createPageUrl(page.page))}
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl">
                    <Icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-800 mb-1">{page.title}</h3>
                    <p className="text-sm text-slate-500">{page.description}</p>
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