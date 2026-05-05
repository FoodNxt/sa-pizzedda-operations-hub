import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { getAllowedPagesForDipendente } from '@/lib/getAllowedPages';
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

        // Admins always have full access to all pages
        if (normalizedUserType === 'admin') {
          setIsAuthorized(true);
          setIsLoading(false);
          return;
        }

        // Fetch page access configuration
        const configs = await base44.entities.PageAccessConfig.list();
        const activeConfig = configs.find(c => c.is_active);

        if (!activeConfig) {
          if (normalizedUserType === 'manager') {
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

        if (normalizedUserType === 'manager') {
          const managerPages = activeConfig.manager_pages || [];
          allowedPages = managerPages.map(p => typeof p === 'string' ? p : p.page);
        } else if (normalizedUserType === 'dipendente') {
          // Use the SAME shared utility as Layout
          const result = await getAllowedPagesForDipendente(user, activeConfig);
          allowedPages = result.allowedPages;
        }

        const hasAccess = allowedPages.includes(pageName);

        if (!hasAccess) {
          let firstAllowedPage = 'ProfiloDipendente';
          if (allowedPages.length > 0) {
            firstAllowedPage = allowedPages[0];
          }
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