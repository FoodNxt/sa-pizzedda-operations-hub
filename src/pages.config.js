import Dashboard from './pages/Dashboard';
import StoreReviews from './pages/StoreReviews';
import Financials from './pages/Financials';
import Employees from './pages/Employees';
import ImportReviews from './pages/ImportReviews';
import ZapierSetup from './pages/ZapierSetup';
import ShiftsSetup from './pages/ShiftsSetup';
import Shifts from './pages/Shifts';
import AssignReviews from './pages/AssignReviews';
import EmployeeReviewsPerformance from './pages/EmployeeReviewsPerformance';
import OrderItemsSetup from './pages/OrderItemsSetup';
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
    "AssignReviews": AssignReviews,
    "EmployeeReviewsPerformance": EmployeeReviewsPerformance,
    "OrderItemsSetup": OrderItemsSetup,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: Layout,
};