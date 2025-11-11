import React, { useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Users,
  Star,
  DollarSign,
  Package,
  Clock,
  Camera,
  Truck,
  GraduationCap,
  FileText,
  Shield,
  CheckSquare
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";

export default function FunzionamentoApp() {
  const [expandedSections, setExpandedSections] = useState({
    overview: true,
    users: false,
    reviews: false,
    financials: false,
    inventory: false,
    people: false,
    pulizie: false,
    delivery: false,
    academy: false,
    contratti: false
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const sections = [
    {
      id: 'overview',
      title: 'Panoramica Generale',
      icon: BookOpen,
      color: 'text-[#8b7355]',
      content: [
        {
          subtitle: 'Struttura dell\'App',
          text: 'Sa Pizzedda Workspace è un sistema completo di gestione aziendale diviso in moduli specializzati per diverse funzioni operative.'
        },
        {
          subtitle: 'Tipi di Utenti',
          list: [
            '<strong>Admin:</strong> Accesso completo a tutte le funzionalità, configurazione sistema, gestione utenti',
            '<strong>Manager:</strong> Accesso alle dashboard operative, gestione dipendenti, monitoraggio performance',
            '<strong>Dipendente:</strong> Accesso limitato a funzioni operative specifiche (profilo, pulizie, inventario, academy)'
          ]
        },
        {
          subtitle: 'Sistema di Ruoli Multipli',
          text: 'I dipendenti possono avere più ruoli contemporaneamente (es. Pizzaiolo + Cassiere), permettendo flessibilità operativa e accesso a funzionalità specifiche per ciascun ruolo.'
        }
      ]
    },
    {
      id: 'users',
      title: 'Gestione Utenti e Autenticazione',
      icon: Users,
      color: 'text-blue-600',
      content: [
        {
          subtitle: 'Registrazione e Primo Accesso',
          list: [
            'Nuovo dipendente si registra via email o Google OAuth',
            'Modale di completamento profilo: inserimento Nome Cognome',
            '<strong>IMPORTANTE:</strong> Nome Cognome deve essere IDENTICO a quello nei turni Planday per matching automatico',
            'Redirect automatico alla pagina Profilo per completare dati anagrafici'
          ]
        },
        {
          subtitle: 'Restrizioni Dipendenti Senza Ruoli',
          text: 'Se un dipendente non ha ruoli assegnati, può accedere SOLO alla pagina Profilo fino a quando l\'admin non gli assegna almeno un ruolo.'
        },
        {
          subtitle: 'Dati Anagrafici Obbligatori',
          list: [
            'Nome Cognome, Data di Nascita, Codice Fiscale',
            'Telefono, Indirizzo di Residenza, IBAN',
            'Documenti: Carta d\'Identità, Codice Fiscale, Permesso Soggiorno (se applicabile)',
            'Dati lavorativi: Gruppo contrattuale, Ore settimanali, Data inizio, Durata contratto'
          ]
        },
        {
          subtitle: 'Matching Automatico',
          text: 'Il campo "nome_cognome" viene utilizzato per il matching automatico con: Turni (Shifts), Recensioni (Reviews), Ritardi, Ordini Sbagliati. Il matching è case-insensitive ma deve essere identico.'
        }
      ]
    },
    {
      id: 'reviews',
      title: 'Sistema Recensioni',
      icon: Star,
      color: 'text-yellow-600',
      content: [
        {
          subtitle: 'Importazione Recensioni',
          text: 'Le recensioni vengono importate automaticamente da Google, Facebook, TripAdvisor tramite Zapier. Ogni recensione contiene: Store, Rating (1-5), Testo, Data, Fonte.'
        },
        {
          subtitle: 'Assegnazione Automatica',
          list: [
            'Sistema analizza data/ora della recensione',
            'Cerca il turno corrispondente nel periodo',
            'Assegna la recensione al dipendente in servizio',
            'Livelli di confidenza: High (match perfetto), Medium (periodo vicino), Low (match incerto)'
          ]
        },
        {
          subtitle: 'Dashboard e Analisi',
          list: [
            '<strong>Store Reviews:</strong> Mappa interattiva, ratings per locale, trend temporali',
            '<strong>Employee Reviews:</strong> Performance individuale, recensioni positive/negative per dipendente',
            '<strong>Assign Reviews:</strong> Correzione manuale assegnazioni, override algoritmo automatico'
          ]
        }
      ]
    },
    {
      id: 'financials',
      title: 'Gestione Finanziaria',
      icon: DollarSign,
      color: 'text-green-600',
      content: [
        {
          subtitle: 'Dati iPratico',
          text: 'Importazione automatica via Zapier dei dati di vendita giornalieri da iPratico. Include: Revenue totale, Numero ordini, Breakdown per canale (Glovo, Deliveroo, JustEat, etc.), Tipo di servizio (Delivery, Takeaway, Dine-in), Metodi di pagamento.'
        },
        {
          subtitle: 'Dashboard Disponibili',
          list: [
            '<strong>Real Time:</strong> Monitoraggio live vendite giornaliere',
            '<strong>Financials:</strong> Analisi dettagliata revenue per periodo, store, canale',
            '<strong>Channel Comparison:</strong> Confronto performance tra canali di vendita',
            '<strong>Storico Cassa:</strong> Tracking conteggi cassa per locale e operatore'
          ]
        },
        {
          subtitle: 'Prodotti Venduti',
          text: 'Tracking vendite per singolo prodotto: Quantità vendute per prodotto, Trend temporali, Analisi per locale, Performance prodotti top/bottom.'
        }
      ]
    },
    {
      id: 'inventory',
      title: 'Gestione Inventario',
      icon: Package,
      color: 'text-purple-600',
      content: [
        {
          subtitle: 'Materie Prime',
          list: [
            'Database completo ingredienti e prodotti',
            'Quantità minime per locale (con possibilità di override per singolo store)',
            'Tracking prezzi storici via import fatture XML',
            'Assegnazione fornitori e gestione ordini'
          ]
        },
        {
          subtitle: 'Ricette e Food Cost',
          list: [
            'Creazione ricette con ingredienti e quantità',
            'Calcolo automatico costo unitario',
            'Food cost % per vendita online/offline',
            'Margine lordo per canale',
            'Supporto semilavorati (ricette usate come ingredienti)'
          ]
        },
        {
          subtitle: 'Rilevazioni Inventario',
          list: [
            '<strong>Form Inventario:</strong> Rilevazione quantità negozio',
            '<strong>Form Cantina:</strong> Rilevazione quantità cantina',
            '<strong>Inventario Admin:</strong> Form unificato per admin',
            'Alert automatici per prodotti sotto minimo',
            'Storico rilevazioni per analisi consumi'
          ]
        },
        {
          subtitle: 'Fornitori e Fatture',
          list: [
            'Database fornitori con info contatto, consegne, metodologie ordine',
            'Upload fatture XML per import automatico prezzi',
            'Matching automatico prodotti da fatture',
            'Storico prezzi per analisi variazioni costo'
          ]
        }
      ]
    },
    {
      id: 'people',
      title: 'Gestione Personale',
      icon: Users,
      color: 'text-indigo-600',
      content: [
        {
          subtitle: 'Dipendenti (Employees)',
          text: 'Database dipendenti sincronizzato con sistema turni Planday. Include: Dati anagrafici, Gruppo contrattuale (FT/PT/CM), Ruoli multipli, Store assegnati.'
        },
        {
          subtitle: 'Turni (Shifts)',
          list: [
            'Import automatico da Planday via Zapier',
            'Rilevazione automatica ritardi (confronto orario previsto vs effettivo)',
            'Tracking timbrature mancanti',
            'Dashboard con statistiche presenza/assenze per dipendente',
            'Possibilità ricalcolo ritardi e cleanup duplicati'
          ]
        },
        {
          subtitle: 'Performance e Payroll',
          list: [
            '<strong>Employees Dashboard:</strong> Ranking dipendenti con metriche combinate (recensioni, ritardi, ordini sbagliati)',
            '<strong>Payroll:</strong> Calcolo ore lavorate, straordinari, dati per buste paga',
            'Analisi costo del lavoro per locale e periodo'
          ]
        },
        {
          subtitle: 'Academy (Formazione)',
          list: [
            '<strong>Admin:</strong> Creazione corsi con video YouTube, quiz multi-risposta, assegnazione per ruolo',
            '<strong>Dipendente:</strong> Visualizzazione corsi assegnati, obbligo visione completa video, quiz con tutte risposte corrette per completamento',
            'Tracking progressi e certificazioni',
            'Sistema reinvio lezione se quiz fallito'
          ]
        }
      ]
    },
    {
      id: 'pulizie',
      title: 'Controllo Pulizie',
      icon: Camera,
      color: 'text-teal-600',
      content: [
        {
          subtitle: 'Sistema per Ruolo',
          text: 'Tre moduli separati per ruolo: Cassiere (cassa, lavandino, area clienti), Pizzaiolo (forno, impastatrice, tavolo lavoro, frigo), Store Manager (supervisione generale, sala clienti, stock).'
        },
        {
          subtitle: 'Funzionalità',
          list: [
            'Upload foto attrezzature e aree',
            'Analisi AI automatica stato pulizia (pulito/medio/sporco)',
            'Checklist manuale per aree comuni',
            'Possibilità correzione valutazione AI da parte utente',
            'Feedback su accuratezza AI per miglioramento continuo'
          ]
        },
        {
          subtitle: 'Storico e Reporting',
          list: [
            'Storico completo ispezioni per locale e data',
            'Score complessivo pulizia (0-100)',
            'Alert problemi critici',
            'Dashboard admin per monitoraggio cross-locale',
            'Tracking correzioni manuali per quality control AI'
          ]
        }
      ]
    },
    {
      id: 'delivery',
      title: 'Delivery - Ordini Sbagliati',
      icon: Truck,
      color: 'text-orange-600',
      content: [
        {
          subtitle: 'Import Dati',
          text: 'Import CSV da Glovo e Deliveroo con ordini problematici (rimborsi, cancellazioni, reclami). Include: Order ID, Data/ora, Store, Valore ordine, Valore rimborso, Motivo.'
        },
        {
          subtitle: 'Store Mapping',
          list: [
            'Sistema automatico di matching store names',
            'Confidence score per match automatici',
            'Interfaccia manuale per correzioni mapping',
            'Storico mapping per consistency'
          ]
        },
        {
          subtitle: 'Matching Dipendenti',
          list: [
            'Algoritmo automatico: cerca turno corrispondente a data/ora ordine',
            'Assegnazione ordine sbagliato al dipendente in servizio',
            'Livelli confidenza (high/medium/low)',
            'Override manuale per correzioni',
            'Dashboard performance con % ordini sbagliati per dipendente'
          ]
        }
      ]
    },
    {
      id: 'contratti',
      title: 'Gestione Contratti',
      icon: FileText,
      color: 'text-red-600',
      content: [
        {
          subtitle: 'Template Contratti (Admin)',
          list: [
            'Creazione template personalizzati con editor di testo',
            'Sistema variabili: {{nome_cognome}}, {{codice_fiscale}}, {{iban}}, {{data_inizio_contratto}}, etc.',
            'Possibilità creare multipli template per diverse tipologie contrattuali',
            'Preview con variabili sostituite prima dell\'invio'
          ]
        },
        {
          subtitle: 'Workflow Contratto',
          list: [
            '<strong>Admin compila dati dipendente</strong> in Gestione Utenti',
            '<strong>Admin seleziona template</strong> e manda contratto',
            '<strong>Sistema sostituisce variabili</strong> con dati reali dipendente',
            '<strong>Email automatica</strong> inviata al dipendente',
            '<strong>Dipendente visualizza contratto</strong> nella sua pagina Contratti',
            '<strong>Dipendente firma digitalmente</strong> inserendo nome cognome',
            '<strong>Admin monitora stato</strong> (bozza/inviato/firmato/archiviato)'
          ]
        },
        {
          subtitle: 'Stati Contratto',
          list: [
            '<strong>Bozza:</strong> Contratto creato ma non ancora inviato',
            '<strong>Inviato:</strong> Email inviata, in attesa firma dipendente',
            '<strong>Firmato:</strong> Dipendente ha firmato, contratto valido',
            '<strong>Archiviato:</strong> Contratto storico, non più attivo'
          ]
        },
        {
          subtitle: 'Sicurezza e Compliance',
          list: [
            'Timestamp data invio e firma',
            'Firma digitale con nome completo dipendente',
            'Log completo modifiche e stati',
            'Backup automatico dati contrattuali',
            'Privacy: solo dipendente interessato e admin vedono contenuto contratto'
          ]
        }
      ]
    }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <BookOpen className="w-10 h-10 text-[#8b7355]" />
          <h1 className="text-3xl font-bold text-[#6b6b6b]">Funzionamento App</h1>
        </div>
        <p className="text-[#9b9b9b]">
          Guida completa alle logiche e dinamiche di funzionamento del sistema Sa Pizzedda Workspace
        </p>
      </div>

      {/* Introduction Card */}
      <NeumorphicCard className="p-6 bg-blue-50">
        <h2 className="text-xl font-bold text-blue-800 mb-3">💡 Benvenuto nella Documentazione</h2>
        <p className="text-blue-700 mb-3">
          Questa guida spiega nel dettaglio come funziona ogni modulo dell'applicazione, le logiche di matching automatico, 
          i workflow operativi e le best practices per utilizzare al meglio il sistema.
        </p>
        <p className="text-sm text-blue-600">
          <strong>Suggerimento:</strong> Clicca su ogni sezione per espandere i dettagli. Le informazioni sono organizzate 
          per modulo funzionale per facilitare la consultazione.
        </p>
      </NeumorphicCard>

      {/* Sections */}
      <div className="space-y-4">
        {sections.map((section) => (
          <NeumorphicCard key={section.id} className="overflow-hidden">
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full p-6 flex items-center justify-between hover:bg-[#d5dae3] transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="neumorphic-flat p-3 rounded-xl">
                  <section.icon className={`w-6 h-6 ${section.color}`} />
                </div>
                <h2 className="text-xl font-bold text-[#6b6b6b]">{section.title}</h2>
              </div>
              {expandedSections[section.id] ? (
                <ChevronDown className="w-6 h-6 text-[#9b9b9b]" />
              ) : (
                <ChevronRight className="w-6 h-6 text-[#9b9b9b]" />
              )}
            </button>

            {expandedSections[section.id] && (
              <div className="px-6 pb-6 space-y-6">
                {section.content.map((item, idx) => (
                  <div key={idx} className="neumorphic-pressed p-5 rounded-xl">
                    {item.subtitle && (
                      <h3 className="text-lg font-bold text-[#6b6b6b] mb-3">{item.subtitle}</h3>
                    )}
                    {item.text && (
                      <p className="text-[#6b6b6b] leading-relaxed" dangerouslySetInnerHTML={{ __html: item.text }} />
                    )}
                    {item.list && (
                      <ul className="space-y-2">
                        {item.list.map((listItem, listIdx) => (
                          <li key={listIdx} className="flex items-start gap-3">
                            <span className="text-[#8b7355] mt-1">•</span>
                            <span className="text-[#6b6b6b] flex-1" dangerouslySetInnerHTML={{ __html: listItem }} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </NeumorphicCard>
        ))}
      </div>

      {/* Footer Info */}
      <NeumorphicCard className="p-6 bg-green-50">
        <div className="flex items-start gap-3">
          <CheckSquare className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-bold text-green-800 mb-2">✅ Best Practices Generali</h3>
            <ul className="text-sm text-green-700 space-y-2">
              <li><strong>Consistenza Dati:</strong> Assicurati che nomi dipendenti siano identici tra sistema e Planday</li>
              <li><strong>Import Regolari:</strong> Configura Zapier per import automatici giornalieri</li>
              <li><strong>Revisione Matching:</strong> Controlla settimanalmente i match automatici (recensioni, ordini sbagliati)</li>
              <li><strong>Backup Dati:</strong> Il sistema effettua backup automatici, ma esporta report importanti regolarmente</li>
              <li><strong>Formazione Staff:</strong> Usa Academy per onboarding nuovi dipendenti</li>
              <li><strong>Monitoraggio KPI:</strong> Usa le dashboard per tracking performance in real-time</li>
            </ul>
          </div>
        </div>
      </NeumorphicCard>
    </div>
  );
}