import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import NeumorphicCard from './neumorphic/NeumorphicCard';
import { AlertTriangle } from 'lucide-react';

export default function ProtectedPage({ children, pageName, requiredUserTypes = [] }) {
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const user = await base44.auth.me();
        const normalizedUserType = user.user_type === 'user' ? 'dipendente' : user.user_type;

        // Fetch page access configuration
        const configs = await base44.entities.PageAccessConfig.list();
        const activeConfig = configs.find(c => c.is_active);

        if (!activeConfig) {
          // No config found, allow all pages for admin/manager, deny for dipendente
          if (normalizedUserType === 'admin' || normalizedUserType === 'manager') {
            setIsAuthorized(true);
            setIsLoading(false);
            return;
          }
          setIsAuthorized(false);
          setIsLoading(false);
          navigate(createPageUrl('ProfiloDipendente'), { replace: true });
          return;
        }

        let allowedPages = [];

        if (normalizedUserType === 'admin') {
          allowedPages = activeConfig.admin_pages || [];
          // Always allow access to admin/manager pages for these user types
          if (!allowedPages.includes(pageName)) {
            // Allow any page for admins if not explicitly restricted
            const adminPages = ['Dashboard', 'Presenze', 'SummaryAI', 'FormTracker', 'Pulizie', 'PulizieMatch', 'FormPulizia', 'Attrezzature', 'Employees', 'Shifts', 'StoreReviews', 'Financials', 'UsersManagement', 'ATS', 'StoreManagerAdmin', 'Planday', 'GestioneAssistente', 'ValutazioneProvaForm', 'StrutturaTurno', 'Compliance', 'Documenti', 'FeedbackP2P', 'Inventory', 'MateriePrime', 'ElencoFornitori', 'ConfrontoListini', 'AnalisiSprechi', 'StoricoImpasti', 'PrecottureAdmin', 'InventarioAdmin', 'InventarioStoreManager', 'GestioneAccessoPagine', 'FunzionamentoApp', 'Alerts', 'RealTime', 'ChannelComparison', 'StoricoCassa', 'OrdiniSbagliati', 'MatchingOrdiniSbagliati', 'ProdottiVenduti', 'AcademyAdmin', 'Assenze', 'InventoryForms', 'FinancialForms', 'AssignReviews', 'EmployeeReviewsPerformance', 'Payroll', 'Segnalazioni', 'Pause', 'FormInventario', 'FormCantina'];
            if (adminPages.includes(pageName)) {
              allowedPages.push(pageName);
            }
          }
        } else if (normalizedUserType === 'manager') {
          allowedPages = activeConfig.manager_pages || [];
          // Allow key pages for managers too
          if (!allowedPages.includes(pageName)) {
            const managerPages = ['Dashboard', 'Presenze', 'SummaryAI', 'FormTracker', 'Pulizie', 'PulizieMatch', 'FormPulizia', 'Attrezzature', 'Employees', 'Shifts', 'StoreReviews', 'Financials', 'ATS', 'StoreManagerAdmin', 'Planday', 'ValutazioneProvaForm', 'StrutturaTurno', 'Compliance', 'Documenti', 'FeedbackP2P', 'Inventory', 'MateriePrime', 'ConfrontoListini', 'Alerts', 'InventarioStoreManager', 'AssignReviews', 'EmployeeReviewsPerformance', 'Segnalazioni', 'Pause', 'FormInventario', 'FormCantina'];
            if (managerPages.includes(pageName)) {
              allowedPages.push(pageName);
            }
          }
        } else if (normalizedUserType === 'dipendente') {
          // Check contract status for dipendenti
          const userRoles = user.ruoli_dipendente || [];

          if (userRoles.length === 0) {
            const pagesConfig = activeConfig.after_registration || [];
            allowedPages = pagesConfig.map(p => typeof p === 'string' ? p : p.page);
          } else {
            const hasReceivedContract = await checkIfContractReceived(user.id);
            const hasSignedContract = await checkIfContractSigned(user.id);
            const contractStarted = user.data_inizio_contratto && new Date(user.data_inizio_contratto) <= new Date();

            let pagesConfig = [];

            if (contractStarted && hasSignedContract) {
              if (userRoles.includes('Pizzaiolo')) {
                pagesConfig = [...pagesConfig, ...(activeConfig.pizzaiolo_pages || [])];
              }
              if (userRoles.includes('Cassiere')) {
                pagesConfig = [...pagesConfig, ...(activeConfig.cassiere_pages || [])];
              }
              if (userRoles.includes('Store Manager')) {
                pagesConfig = [...pagesConfig, ...(activeConfig.store_manager_pages || [])];
              }
            } else if (hasSignedContract) {
              pagesConfig = activeConfig.after_contract_signed || [];
            } else if (hasReceivedContract) {
              pagesConfig = activeConfig.after_contract_received || [];
            } else {
              pagesConfig = activeConfig.after_registration || [];
            }

            // Extract page names
            allowedPages = pagesConfig.map(p => typeof p === 'string' ? p : p.page);
            // Remove duplicates
            allowedPages = [...new Set(allowedPages)];
          }
        }

        const hasAccess = allowedPages.includes(pageName);

        if (!hasAccess) {
          // Redirect to first allowed page
          const firstAllowedPage = allowedPages[0] || 'ProfiloDipendente';
          navigate(createPageUrl(firstAllowedPage), { replace: true });
          setIsAuthorized(false);
        } else {
          setIsAuthorized(true);
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Error checking page access:', error);
        setIsAuthorized(false);
        setIsLoading(false);
        navigate(createPageUrl('ProfiloDipendente'), { replace: true });
      }
    };

    checkAccess();
  }, [pageName, navigate]);

  const checkIfContractSigned = async (userId) => {
    try {
      const contratti = await base44.entities.Contratto.filter({
        user_id: userId,
        status: 'firmato'
      });
      return contratti.length > 0;
    } catch (error) {
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
      return false;
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <NeumorphicCard className="p-8 text-center">
          <p className="text-slate-500">Verifica permessi...</p>
        </NeumorphicCard>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <NeumorphicCard className="p-8 text-center">
          <AlertTriangle className="w-16 h-16 text-orange-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-700 mb-2">Accesso Negato</h2>
          <p className="text-slate-500">Non hai i permessi per visualizzare questa pagina.</p>
        </NeumorphicCard>
      </div>
    );
  }

  return <>{children}</>;
}