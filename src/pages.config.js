/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import ATS from './pages/ATS';
import Academy from './pages/Academy';
import AcademyAdmin from './pages/AcademyAdmin';
import Activation from './pages/Activation';
import Alerts from './pages/Alerts';
import AnalisiSprechi from './pages/AnalisiSprechi';
import Assenze from './pages/Assenze';
import AssignReviews from './pages/AssignReviews';
import AssistenteDipendente from './pages/AssistenteDipendente';
import Attrezzature from './pages/Attrezzature';
import BulkImportProdottiVenduti from './pages/BulkImportProdottiVenduti';
import BulkImportProduttivita from './pages/BulkImportProduttivita';
import BulkImportSconti from './pages/BulkImportSconti';
import ChannelComparison from './pages/ChannelComparison';
import CleanupDuplicateShifts from './pages/CleanupDuplicateShifts';
import Compliance from './pages/Compliance';
import ConfrontoListini from './pages/ConfrontoListini';
import Contatti from './pages/Contatti';
import ConteggioCassa from './pages/ConteggioCassa';
import Contratti from './pages/Contratti';
import ContrattiDipendente from './pages/ContrattiDipendente';
import ControlloConsumi from './pages/ControlloConsumi';
import ControlloPuliziaCassiere from './pages/ControlloPuliziaCassiere';
import ControlloPuliziaPizzaiolo from './pages/ControlloPuliziaPizzaiolo';
import ControlloPuliziaStoreManager from './pages/ControlloPuliziaStoreManager';
import ControlloPulizieMaster from './pages/ControlloPulizieMaster';
import ControlloStoreManager from './pages/ControlloStoreManager';
import Costi from './pages/Costi';
import CreaCorso from './pages/CreaCorso';
import DailyRevenueAggregation from './pages/DailyRevenueAggregation';
import Dashboard from './pages/Dashboard';
import DashboardStoreManager from './pages/DashboardStoreManager';
import Disponibilita from './pages/Disponibilita';
import Documenti from './pages/Documenti';
import ElencoFornitori from './pages/ElencoFornitori';
import EmployeeReviewsPerformance from './pages/EmployeeReviewsPerformance';
import Employees from './pages/Employees';
import FeedbackP2P from './pages/FeedbackP2P';
import FinancialForms from './pages/FinancialForms';
import Financials from './pages/Financials';
import FormCantina from './pages/FormCantina';
import FormDebug from './pages/FormDebug';
import FormDeposito from './pages/FormDeposito';
import FormInventario from './pages/FormInventario';
import FormPagamentiContanti from './pages/FormPagamentiContanti';
import FormPrelievi from './pages/FormPrelievi';
import FormPreparazioni from './pages/FormPreparazioni';
import FormPulizia from './pages/FormPulizia';
import FormSpostamenti from './pages/FormSpostamenti';
import FormSprechi from './pages/FormSprechi';
import FormTeglieButtate from './pages/FormTeglieButtate';
import FormTracker from './pages/FormTracker';
import FormsDipendente from './pages/FormsDipendente';
import FotoLocale from './pages/FotoLocale';
import FunzionamentoApp from './pages/FunzionamentoApp';
import GestioneAccessoPagine from './pages/GestioneAccessoPagine';
import GestioneAssistente from './pages/GestioneAssistente';
import Google from './pages/Google';
import HRAdmin from './pages/HRAdmin';
import Home from './pages/Home';
import IPraticoBulkImport from './pages/IPraticoBulkImport';
import IPraticoSetup from './pages/IPraticoSetup';
import Impasto from './pages/Impasto';
import ImportReviews from './pages/ImportReviews';
import InventarioAdmin from './pages/InventarioAdmin';
import InventarioStoreManager from './pages/InventarioStoreManager';
import Inventory from './pages/Inventory';
import InventoryForms from './pages/InventoryForms';
import LettereRichiamo from './pages/LettereRichiamo';
import Marketing from './pages/Marketing';
import MarketingSettings from './pages/MarketingSettings';
import MatchingOrdiniSbagliati from './pages/MatchingOrdiniSbagliati';
import MateriePrime from './pages/MateriePrime';
import Meta from './pages/Meta';
import NotificheMail from './pages/NotificheMail';
import OrderItemsSetup from './pages/OrderItemsSetup';
import Ordini from './pages/Ordini';
import OrdiniAdmin from './pages/OrdiniAdmin';
import OrdiniSbagliati from './pages/OrdiniSbagliati';
import OreLavorate from './pages/OreLavorate';
import OverviewContratti from './pages/OverviewContratti';
import Pause from './pages/Pause';
import Payroll from './pages/Payroll';
import PianoQuarter from './pages/PianoQuarter';
import Planday from './pages/Planday';
import PlandayStoreManager from './pages/PlandayStoreManager';
import Precotture from './pages/Precotture';
import PrecottureAdmin from './pages/PrecottureAdmin';
import Preparazioni from './pages/Preparazioni';
import PreparazioniAdmin from './pages/PreparazioniAdmin';
import Presenze from './pages/Presenze';
import ProdottiVenduti from './pages/ProdottiVenduti';
import Produttivita from './pages/Produttivita';
import ProfiloDipendente from './pages/ProfiloDipendente';
import PulizieMatch from './pages/PulizieMatch';
import QuantitaMinime from './pages/QuantitaMinime';
import RecalculateShifts from './pages/RecalculateShifts';
import RegolamentoDipendenti from './pages/RegolamentoDipendenti';
import ResetAdmin from './pages/ResetAdmin';
import Ricette from './pages/Ricette';
import Ritardi from './pages/Ritardi';
import Sconti from './pages/Sconti';
import Segnalazioni from './pages/Segnalazioni';
import SpostamentiAdmin from './pages/SpostamentiAdmin';
import StoreManagerAdmin from './pages/StoreManagerAdmin';
import StoreReviews from './pages/StoreReviews';
import StoricoCassa from './pages/StoricoCassa';
import StoricoImpasti from './pages/StoricoImpasti';
import Straordinari from './pages/Straordinari';
import strutturamen from './pages/StrutturaMenù';
import StrutturaTurno from './pages/StrutturaTurno';
import SummaryAI from './pages/SummaryAI';
import TeglieButtate from './pages/TeglieButtate';
import TurniDipendente from './pages/TurniDipendente';
import UploadFattureXML from './pages/UploadFattureXML';
import Uscite from './pages/Uscite';
import UsersManagement from './pages/UsersManagement';
import Valutazione from './pages/Valutazione';
import ValutazioneProvaForm from './pages/ValutazioneProvaForm';
import ValutazionePulizie from './pages/ValutazionePulizie';
import ZapierProdottiVenduti from './pages/ZapierProdottiVenduti';
import ZapierProduttivita from './pages/ZapierProduttivita';
import ZapierSconti from './pages/ZapierSconti';
import ZapierSetup from './pages/ZapierSetup';
import __Layout from './Layout.jsx';


export const PAGES = {
    "ATS": ATS,
    "Academy": Academy,
    "AcademyAdmin": AcademyAdmin,
    "Activation": Activation,
    "Alerts": Alerts,
    "AnalisiSprechi": AnalisiSprechi,
    "Assenze": Assenze,
    "AssignReviews": AssignReviews,
    "AssistenteDipendente": AssistenteDipendente,
    "Attrezzature": Attrezzature,
    "BulkImportProdottiVenduti": BulkImportProdottiVenduti,
    "BulkImportProduttivita": BulkImportProduttivita,
    "BulkImportSconti": BulkImportSconti,
    "ChannelComparison": ChannelComparison,
    "CleanupDuplicateShifts": CleanupDuplicateShifts,
    "Compliance": Compliance,
    "ConfrontoListini": ConfrontoListini,
    "Contatti": Contatti,
    "ConteggioCassa": ConteggioCassa,
    "Contratti": Contratti,
    "ContrattiDipendente": ContrattiDipendente,
    "ControlloConsumi": ControlloConsumi,
    "ControlloPuliziaCassiere": ControlloPuliziaCassiere,
    "ControlloPuliziaPizzaiolo": ControlloPuliziaPizzaiolo,
    "ControlloPuliziaStoreManager": ControlloPuliziaStoreManager,
    "ControlloPulizieMaster": ControlloPulizieMaster,
    "ControlloStoreManager": ControlloStoreManager,
    "Costi": Costi,
    "CreaCorso": CreaCorso,
    "DailyRevenueAggregation": DailyRevenueAggregation,
    "Dashboard": Dashboard,
    "DashboardStoreManager": DashboardStoreManager,
    "Disponibilita": Disponibilita,
    "Documenti": Documenti,
    "ElencoFornitori": ElencoFornitori,
    "EmployeeReviewsPerformance": EmployeeReviewsPerformance,
    "Employees": Employees,
    "FeedbackP2P": FeedbackP2P,
    "FinancialForms": FinancialForms,
    "Financials": Financials,
    "FormCantina": FormCantina,
    "FormDebug": FormDebug,
    "FormDeposito": FormDeposito,
    "FormInventario": FormInventario,
    "FormPagamentiContanti": FormPagamentiContanti,
    "FormPrelievi": FormPrelievi,
    "FormPreparazioni": FormPreparazioni,
    "FormPulizia": FormPulizia,
    "FormSpostamenti": FormSpostamenti,
    "FormSprechi": FormSprechi,
    "FormTeglieButtate": FormTeglieButtate,
    "FormTracker": FormTracker,
    "FormsDipendente": FormsDipendente,
    "FotoLocale": FotoLocale,
    "FunzionamentoApp": FunzionamentoApp,
    "GestioneAccessoPagine": GestioneAccessoPagine,
    "GestioneAssistente": GestioneAssistente,
    "Google": Google,
    "HRAdmin": HRAdmin,
    "Home": Home,
    "IPraticoBulkImport": IPraticoBulkImport,
    "IPraticoSetup": IPraticoSetup,
    "Impasto": Impasto,
    "ImportReviews": ImportReviews,
    "InventarioAdmin": InventarioAdmin,
    "InventarioStoreManager": InventarioStoreManager,
    "Inventory": Inventory,
    "InventoryForms": InventoryForms,
    "LettereRichiamo": LettereRichiamo,
    "Marketing": Marketing,
    "MarketingSettings": MarketingSettings,
    "MatchingOrdiniSbagliati": MatchingOrdiniSbagliati,
    "MateriePrime": MateriePrime,
    "Meta": Meta,
    "NotificheMail": NotificheMail,
    "OrderItemsSetup": OrderItemsSetup,
    "Ordini": Ordini,
    "OrdiniAdmin": OrdiniAdmin,
    "OrdiniSbagliati": OrdiniSbagliati,
    "OreLavorate": OreLavorate,
    "OverviewContratti": OverviewContratti,
    "Pause": Pause,
    "Payroll": Payroll,
    "PianoQuarter": PianoQuarter,
    "Planday": Planday,
    "PlandayStoreManager": PlandayStoreManager,
    "Precotture": Precotture,
    "PrecottureAdmin": PrecottureAdmin,
    "Preparazioni": Preparazioni,
    "PreparazioniAdmin": PreparazioniAdmin,
    "Presenze": Presenze,
    "ProdottiVenduti": ProdottiVenduti,
    "Produttivita": Produttivita,
    "ProfiloDipendente": ProfiloDipendente,
    "PulizieMatch": PulizieMatch,
    "QuantitaMinime": QuantitaMinime,
    "RecalculateShifts": RecalculateShifts,
    "RegolamentoDipendenti": RegolamentoDipendenti,
    "ResetAdmin": ResetAdmin,
    "Ricette": Ricette,
    "Ritardi": Ritardi,
    "Sconti": Sconti,
    "Segnalazioni": Segnalazioni,
    "SpostamentiAdmin": SpostamentiAdmin,
    "StoreManagerAdmin": StoreManagerAdmin,
    "StoreReviews": StoreReviews,
    "StoricoCassa": StoricoCassa,
    "StoricoImpasti": StoricoImpasti,
    "Straordinari": Straordinari,
    "StrutturaMenù": strutturamen,
    "StrutturaTurno": StrutturaTurno,
    "SummaryAI": SummaryAI,
    "TeglieButtate": TeglieButtate,
    "TurniDipendente": TurniDipendente,
    "UploadFattureXML": UploadFattureXML,
    "Uscite": Uscite,
    "UsersManagement": UsersManagement,
    "Valutazione": Valutazione,
    "ValutazioneProvaForm": ValutazioneProvaForm,
    "ValutazionePulizie": ValutazionePulizie,
    "ZapierProdottiVenduti": ZapierProdottiVenduti,
    "ZapierProduttivita": ZapierProduttivita,
    "ZapierSconti": ZapierSconti,
    "ZapierSetup": ZapierSetup,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};