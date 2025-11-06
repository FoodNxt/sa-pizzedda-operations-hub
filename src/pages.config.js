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
import ChannelComparison from './pages/ChannelComparison';
import RecalculateShifts from './pages/RecalculateShifts';
import CleanupDuplicateShifts from './pages/CleanupDuplicateShifts';
import InventorySetup from './pages/InventorySetup';
import Inventory from './pages/Inventory';
import RealTime from './pages/RealTime';
import Payroll from './pages/Payroll';
import Pulizie from './pages/Pulizie';
import FotoLocale from './pages/FotoLocale';
import SummaryAI from './pages/SummaryAI';
import DailyRevenueAggregation from './pages/DailyRevenueAggregation';
import IPraticoSetup from './pages/IPraticoSetup';
import IPraticoBulkImport from './pages/IPraticoBulkImport';
import Valutazione from './pages/Valutazione';
import ProfiloDipendente from './pages/ProfiloDipendente';
import QuantitaMinime from './pages/QuantitaMinime';
import FormInventario from './pages/FormInventario';
import UsersManagement from './pages/UsersManagement';
import ConteggioCassa from './pages/ConteggioCassa';
import TeglieButtate from './pages/TeglieButtate';
import Preparazioni from './pages/Preparazioni';
import StoricoCassa from './pages/StoricoCassa';
import FormCantina from './pages/FormCantina';
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
    "ChannelComparison": ChannelComparison,
    "RecalculateShifts": RecalculateShifts,
    "CleanupDuplicateShifts": CleanupDuplicateShifts,
    "InventorySetup": InventorySetup,
    "Inventory": Inventory,
    "RealTime": RealTime,
    "Payroll": Payroll,
    "Pulizie": Pulizie,
    "FotoLocale": FotoLocale,
    "SummaryAI": SummaryAI,
    "DailyRevenueAggregation": DailyRevenueAggregation,
    "IPraticoSetup": IPraticoSetup,
    "IPraticoBulkImport": IPraticoBulkImport,
    "Valutazione": Valutazione,
    "ProfiloDipendente": ProfiloDipendente,
    "QuantitaMinime": QuantitaMinime,
    "FormInventario": FormInventario,
    "UsersManagement": UsersManagement,
    "ConteggioCassa": ConteggioCassa,
    "TeglieButtate": TeglieButtate,
    "Preparazioni": Preparazioni,
    "StoricoCassa": StoricoCassa,
    "FormCantina": FormCantina,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: Layout,
};