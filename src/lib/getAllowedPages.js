import { base44 } from '@/api/base44Client';

/**
 * Shared utility to compute allowed pages for a dipendente user.
 * Used by BOTH Layout and ProtectedPage to ensure consistency.
 * 
 * Returns { allowedPages: string[], contractStarted: boolean }
 */
export async function getAllowedPagesForDipendente(user, pageAccessConfig) {
  if (!user || !pageAccessConfig) {
    return { allowedPages: ['ProfiloDipendente', 'TurniDipendente'], contractStarted: false };
  }

  const userRoles = user.ruoli_dipendente || [];

  // Normalize helper
  const normalize = (pages) => {
    if (!pages || pages.length === 0) return [];
    return pages.map(p => typeof p === 'string' ? { page: p, showInMenu: true, showInForms: false } : p);
  };

  // Check contract status
  const hasReceivedContract = await checkIfContractReceived(user.id);
  const hasSignedContract = await checkIfContractSigned(user.id);
  const contractStarted = !!(user.data_inizio_contratto && new Date(user.data_inizio_contratto) <= new Date());

  let pagesConfig = [];

  if (userRoles.length === 0) {
    pagesConfig = normalize(pageAccessConfig.after_registration || [{ page: 'ProfiloDipendente', showInMenu: true, showInForms: false }]);
  } else if (contractStarted && hasSignedContract) {
    // Role-specific pages
    if (userRoles.includes('Pizzaiolo')) {
      pagesConfig = [...pagesConfig, ...normalize(pageAccessConfig.pizzaiolo_pages || [])];
    }
    if (userRoles.includes('Cassiere')) {
      pagesConfig = [...pagesConfig, ...normalize(pageAccessConfig.cassiere_pages || [])];
    }
    if (userRoles.includes('Store Manager')) {
      pagesConfig = [...pagesConfig, ...normalize(pageAccessConfig.store_manager_pages || [])];
    }
    // Remove duplicates
    const seen = new Set();
    pagesConfig = pagesConfig.filter(p => {
      if (seen.has(p.page)) return false;
      seen.add(p.page);
      return true;
    });
    // Fallback
    if (pagesConfig.length === 0) {
      pagesConfig = [
        { page: 'ProfiloDipendente', showInMenu: true, showInForms: false },
        { page: 'TurniDipendente', showInMenu: true, showInForms: false },
        { page: 'ContrattiDipendente', showInMenu: true, showInForms: false },
        { page: 'Academy', showInMenu: true, showInForms: false }
      ];
    }
  } else if (hasSignedContract) {
    pagesConfig = normalize(pageAccessConfig.after_contract_signed || []);
  } else if (hasReceivedContract) {
    pagesConfig = normalize(pageAccessConfig.after_contract_received || []);
  } else {
    pagesConfig = normalize(pageAccessConfig.after_registration || []);
  }

  // Extract ALL page names (both showInMenu and showInForms) - these are all "allowed" pages
  const allowedPages = [...new Set(pagesConfig.map(p => p.page))];

  // Core pages always accessible for all dipendenti
  const coreDipendentePages = ['TurniDipendente', 'ProfiloDipendente', 'ContrattiDipendente'];
  coreDipendentePages.forEach(page => {
    if (!allowedPages.includes(page)) {
      allowedPages.push(page);
    }
  });

  return { allowedPages, pagesConfig, contractStarted, hasSignedContract, hasReceivedContract };
}

/**
 * Get only the pages that should appear in the navigation menu.
 * Subset of allowedPages where showInMenu === true.
 */
export function getMenuPages(pagesConfig) {
  const menuPages = pagesConfig
    .filter(p => p.showInMenu === true)
    .map(p => p.page)
    .filter(pageName => !pageName.toLowerCase().includes('teglie'));

  // Core pages always in menu for dipendenti with roles
  const corePages = ['ProfiloDipendente', 'TurniDipendente', 'ContrattiDipendente'];
  corePages.forEach(corePage => {
    if (!menuPages.includes(corePage)) {
      menuPages.push(corePage);
    }
  });

  return menuPages;
}

async function checkIfContractSigned(userId) {
  try {
    const contratti = await base44.entities.Contratto.filter({ user_id: userId, status: 'firmato' });
    return contratti.length > 0;
  } catch {
    return false;
  }
}

async function checkIfContractReceived(userId) {
  try {
    const contratti = await base44.entities.Contratto.filter({ user_id: userId });
    return contratti.length > 0;
  } catch {
    return false;
  }
}