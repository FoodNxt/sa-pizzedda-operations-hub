import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const TAB_STACK_KEY = 'tab_navigation_stacks';

export function useTabStackManager(bottomNavItems) {
  const location = useLocation();
  const navigate = useNavigate();

  // Get current tab based on pathname
  const getCurrentTab = (pathname) => {
    for (const item of bottomNavItems) {
      if (pathname === item.url || pathname.startsWith(item.url + '/')) {
        return item.url;
      }
    }
    return null;
  };

  // Save current path for active tab
  useEffect(() => {
    const currentTab = getCurrentTab(location.pathname);
    if (!currentTab) return;

    try {
      const stacks = JSON.parse(localStorage.getItem(TAB_STACK_KEY) || '{}');
      stacks[currentTab] = location.pathname;
      localStorage.setItem(TAB_STACK_KEY, JSON.stringify(stacks));
    } catch (e) {
      console.error('Error saving tab stack:', e);
    }
  }, [location.pathname]);

  // Navigate to saved path when tab clicked
  const handleTabClick = (targetUrl, e) => {
    const currentTab = getCurrentTab(location.pathname);
    
    // If clicking same root tab, go to saved path or root
    if (currentTab === targetUrl && location.pathname !== targetUrl) {
      return; // Already in this tab, don't navigate
    }

    e?.preventDefault();
    
    try {
      const stacks = JSON.parse(localStorage.getItem(TAB_STACK_KEY) || '{}');
      const savedPath = stacks[targetUrl];
      
      // Navigate to saved path if exists and different from root, otherwise to tab root
      if (savedPath && savedPath !== targetUrl) {
        navigate(savedPath);
      } else {
        navigate(targetUrl);
      }
    } catch (e) {
      navigate(targetUrl);
    }
  };

  return { handleTabClick, getCurrentTab };
}