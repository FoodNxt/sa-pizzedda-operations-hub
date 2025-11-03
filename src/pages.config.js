import Dashboard from './pages/Dashboard';
import StoreReviews from './pages/StoreReviews';
import Financials from './pages/Financials';
import Employees from './pages/Employees';
import ImportReviews from './pages/ImportReviews';
import Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "StoreReviews": StoreReviews,
    "Financials": Financials,
    "Employees": Employees,
    "ImportReviews": ImportReviews,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: Layout,
};