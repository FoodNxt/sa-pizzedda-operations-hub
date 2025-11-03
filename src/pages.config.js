import Dashboard from './pages/Dashboard';
import StoreReviews from './pages/StoreReviews';
import Financials from './pages/Financials';
import Employees from './pages/Employees';
import ImportReviews from './pages/ImportReviews';
import ZapierSetup from './pages/ZapierSetup';
import ShiftsSetup from './pages/ShiftsSetup';
import Shifts from './pages/Shifts';
import Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "StoreReviews": StoreReviews,
    "Financials": Financials,
    "Employees": Employees,
    "ImportReviews": ImportReviews,
    "ZapierSetup": ZapierSetup,
    "ShiftsSetup": ShiftsSetup,
    "Shifts": Shifts,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: Layout,
};