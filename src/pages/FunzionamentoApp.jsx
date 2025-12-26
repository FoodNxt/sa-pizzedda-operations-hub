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
  CheckSquare,
  Copy,
  Sparkles
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
    contratti: false,
    prompt: false
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

      {/* Replication Prompt Section */}
      <NeumorphicCard className="overflow-hidden">
        <button
          onClick={() => toggleSection('prompt')}
          className="w-full p-6 flex items-center justify-between hover:bg-[#d5dae3] transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="neumorphic-flat p-3 rounded-xl">
              <Sparkles className="w-6 h-6 text-purple-600" />
            </div>
            <h2 className="text-xl font-bold text-[#6b6b6b]">🤖 Prompt per Replicare l'Applicazione</h2>
          </div>
          {expandedSections.prompt ? (
            <ChevronDown className="w-6 h-6 text-[#9b9b9b]" />
          ) : (
            <ChevronRight className="w-6 h-6 text-[#9b9b9b]" />
          )}
        </button>

        {expandedSections.prompt && (
          <div className="px-6 pb-6">
            <div className="neumorphic-pressed p-5 rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[#6b6b6b]">Prompt Completo per Base44 AI</h3>
                <button
                  onClick={() => {
                    const promptText = document.getElementById('replication-prompt').innerText;
                    navigator.clipboard.writeText(promptText);
                    alert('Prompt copiato negli appunti!');
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  Copia Prompt
                </button>
              </div>
              
              <div id="replication-prompt" className="bg-white p-6 rounded-xl border-2 border-purple-200 text-sm text-[#6b6b6b] leading-relaxed space-y-4 max-h-[600px] overflow-y-auto">
                <p className="font-bold text-lg text-purple-800">Sistema di Gestione Aziendale Completo - Sa Pizzedda Workspace</p>
                
                <p className="font-semibold text-purple-700">PANORAMICA GENERALE:</p>
                <p>Crea un'applicazione web completa per la gestione di una catena di pizzerie con più locali. L'app deve supportare tre tipologie di utenti (Admin, Manager, Dipendente) con permessi differenziati e deve includere moduli integrati per gestione personale, inventario, finanze, qualità e formazione.</p>

                <p className="font-semibold text-purple-700">ARCHITETTURA UTENTI:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li><strong>Admin:</strong> Accesso completo, gestione configurazioni, utenti, analisi cross-store</li>
                  <li><strong>Manager:</strong> Dashboard operative, gestione dipendenti del proprio store, monitoraggio performance</li>
                  <li><strong>Dipendente:</strong> Sistema multi-ruolo (Pizzaiolo, Cassiere, Store Manager) con accesso progressivo basato su stato contrattuale</li>
                </ul>

                <p className="font-semibold text-purple-700">MODULO 1 - GESTIONE UTENTI E AUTENTICAZIONE:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Registrazione via email/Google OAuth con modale completamento profilo (Nome Cognome obbligatorio)</li>
                  <li>Sistema PageAccessConfig per controllo dinamico accesso pagine basato su: stato registrazione, ricezione contratto, firma contratto, inizio periodo lavorativo</li>
                  <li>Entità User con campi: nome_cognome, data_nascita, codice_fiscale, telefono, indirizzo, IBAN, ruoli_dipendente (array), gruppo_contrattuale (FT/PT/CM), data_inizio_contratto, store_assegnati</li>
                  <li>Matching automatico case-insensitive tra nome_cognome utente e dati esterni (turni, recensioni, ordini)</li>
                </ul>

                <p className="font-semibold text-purple-700">MODULO 2 - SISTEMA RECENSIONI:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Entità Review: store_id, rating (1-5), comment, customer_name, review_date, source (google/facebook/tripadvisor), employee_assigned_name, assignment_confidence (high/medium/low)</li>
                  <li>Import automatico via webhook Zapier da piattaforme recensioni</li>
                  <li>Algoritmo assegnazione automatica: cerca turno dipendente in orario recensione, assegna con livello confidenza basato su sovrapposizione temporale</li>
                  <li>Pagine: StoreReviews (mappa interattiva, rating per locale), EmployeeReviewsPerformance (ranking dipendenti), AssignReviews (gestione assegnazioni manuali)</li>
                  <li>Configurazione ReviewAssignmentConfig per includere/escludere tipi turno e ruoli dal matching</li>
                </ul>

                <p className="font-semibold text-purple-700">MODULO 3 - GESTIONE FINANZIARIA:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Entità iPratico: store_id, order_date, total_revenue, total_orders, breakdown per sourceApp (glovo/deliveroo/justeat/onlineordering), sourceType (delivery/takeaway/store), moneyType (cash/card/satispay)</li>
                  <li>Import giornaliero automatico via webhook da iPratico</li>
                  <li>Entità ConteggioCassa: store_id, data_conteggio, rilevato_da, valore_conteggio</li>
                  <li>Dashboard: RealTime (vendite live), Financials (analisi revenue multi-periodo), ChannelComparison (confronto canali con grafici), StoricoCassa (tracking conteggi)</li>
                  <li>Entità ProdottiVenduti: store_id, data_vendita, category, flavor, total_pizzas_sold per analisi performance prodotti</li>
                </ul>

                <p className="font-semibold text-purple-700">MODULO 4 - GESTIONE INVENTARIO:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Entità MateriePrime: nome_prodotto, nome_interno, categoria, unita_misura, quantita_critica, quantita_ordine, store_specific_quantita_critica (oggetto con override per store), peso_dimensione_unita, prezzo_unitario, fornitore, posizione (negozio/cantina), assigned_stores (array), trasportabile</li>
                  <li>Entità Ricetta: nome_prodotto, categoria, ingredienti (array con materia_prima_id, quantita), prezzo_vendita_online, prezzo_vendita_offline, costo_unitario (auto-calcolato), food_cost_online/offline (%), margine_online/offline. Supporto semilavorati (ricette usabili come ingredienti)</li>
                  <li>Entità RilevazioneInventario/RilevazioneInventarioCantina: store_id, data_rilevazione, rilevato_da, prodotto_id, quantita_rilevata, sotto_minimo (boolean)</li>
                  <li>Entità Fornitore: ragione_sociale, partita_iva, categorie_fornitore (array), giorni_consegna (array), tempo_consegna_giorni, metodologia_ricezione_ordine, ordine_minimo</li>
                  <li>Import fatture XML per aggiornamento automatico prezzi con entità MateriePrimeStoricoPrezzi</li>
                  <li>Entità Spostamento per tracking movimentazioni prodotti tra store</li>
                  <li>Pagine: MateriePrime (database prodotti), Ricette (food cost calculator), InventarioAdmin (form rilevazioni), AnalisiSprechi (calcolo costo teglie buttate)</li>
                </ul>

                <p className="font-semibold text-purple-700">MODULO 5 - GESTIONE PERSONALE:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Entità Employee sincronizzata con User: full_name, employee_id_external (da Planday), employee_group, function_name, status</li>
                  <li>Entità TurnoPlanday: dipendente_id, dipendente_nome, store_id, data, ora_inizio_prevista, ora_fine_prevista, ora_inizio_effettiva, ora_fine_effettiva, tipo_turno, in_ritardo (boolean), minuti_ritardo, stato (programmato/completato/assente), richiesta_scambio (oggetto con stato, richiesto_da, richiesto_a)</li>
                  <li>Import automatico turni via webhook da Planday con calcolo automatico ritardi</li>
                  <li>Sistema scambio turni peer-to-peer con workflow: richiesta → accettazione collega → approvazione manager</li>
                  <li>Entità RichiestaFerie, RichiestaMalattia, RichiestaTurnoLibero con stato (pending/approved/rejected) e turni_coinvolti (array)</li>
                  <li>Dashboard Employees con scoring combinato: recensioni positive/negative, ritardi, ordini sbagliati</li>
                  <li>Pagina Payroll con calcolo ore lavorate, straordinari, breakdown per dipendente</li>
                  <li>Entità BustaPaga con upload e splitting automatico PDF multi-dipendente</li>
                </ul>

                <p className="font-semibold text-purple-700">MODULO 6 - ACADEMY (FORMAZIONE):</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Entità CorsoTemplate: titolo, descrizione, categoria_id, video_url (YouTube), quiz (array di domande con opzioni e risposta corretta), ruoli_assegnati (array), obbligatorio (boolean)</li>
                  <li>Entità CorsoProgresso: user_id, corso_id, video_completato, quiz_completato, punteggio_quiz, certificato_ottenuto, tentativi_quiz</li>
                  <li>Logica: video deve essere visto completamente prima di accedere al quiz. Quiz richiede tutte risposte corrette per completamento. Reinvio automatico lezione se quiz fallito</li>
                  <li>Admin: creazione corsi, assegnazione per ruolo, tracking progressi. Dipendente: visualizzazione corsi assegnati, player YouTube integrato, quiz interattivo</li>
                </ul>

                <p className="font-semibold text-purple-700">MODULO 7 - CONTROLLO PULIZIE:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Entità CleaningInspection: store_id, inspection_date, inspector_name, inspector_role, domande_risposte (array con domanda_id, risposta, tipo_controllo)</li>
                  <li>Per ogni attrezzatura (forno, impastatrice, frigo, etc.): foto_url, pulizia_status (pulito/medio/sporco/non_valutabile), note_ai, corrected (boolean), corrected_status, correction_note</li>
                  <li>Entità DomandaPulizia: domanda_testo, tipo_controllo (foto/scelta_multipla), attrezzatura, prompt_ai, opzioni_risposta, ruoli_assegnati (Pizzaiolo/Cassiere/StoreManager), ordine</li>
                  <li>Entità Attrezzatura: nome, icona_url, stores_assegnati, ruoli_responsabili</li>
                  <li>Tre form separati per ruolo con domande specifiche configurabili. Upload foto, analisi AI automatica con modello InvokeLLM, possibilità correzione manuale valutazione</li>
                  <li>Dashboard ValutazionePulizie con storico, score 0-100, alert problemi critici</li>
                </ul>

                <p className="font-semibold text-purple-700">MODULO 8 - DELIVERY - ORDINI SBAGLIATI:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Entità WrongOrder: platform (glovo/deliveroo), order_id, order_date, store_name, store_id, order_total, refund_value, complaint_reason, cancellation_reason</li>
                  <li>Entità StoreMapping: platform, platform_store_name, store_id, auto_matched (boolean), confidence_score</li>
                  <li>Entità WrongOrderMatch: wrong_order_id, matched_employee_name, matched_shift_id, match_confidence (high/medium/low/manual), match_method (auto/manual)</li>
                  <li>Import CSV da Glovo/Deliveroo. Matching automatico store names con confidence score. Algoritmo assegnazione dipendente: trova turno in orario ordine sbagliato</li>
                  <li>Dashboard con analisi per dipendente: % ordini sbagliati, trend, confronto tra dipendenti</li>
                </ul>

                <p className="font-semibold text-purple-700">MODULO 9 - GESTIONE CONTRATTI:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Entità ContrattoTemplate: nome_template, contenuto_html (con variabili {'{{nome_cognome}}, {{codice_fiscale}}, {{iban}}, {{data_inizio_contratto}}'}, etc.), attivo</li>
                  <li>Entità Contratto: user_id, template_id, contenuto_finale (HTML con variabili sostituite), status (bozza/inviato/firmato/archiviato), data_invio, data_firma, firma_digitale</li>
                  <li>Workflow: Admin crea template → seleziona dipendente → sistema sostituisce variabili → invia email → dipendente visualizza e firma digitalmente → cambio status a firmato</li>
                  <li>Firma digitale semplice: inserimento nome cognome + timestamp. Privacy: solo admin e dipendente interessato vedono contenuto</li>
                </ul>

                <p className="font-semibold text-purple-700">MODULO 10 - PRECOTTURE E IMPASTI:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Entità GestioneImpasti: store_id, giorno_settimana, pranzo_rosse, pomeriggio_rosse, cena_rosse, totale_giornata, percentuale_pranzo/pomeriggio/cena</li>
                  <li>Entità ConfigurazioneTeglieCalcolo: categorie (array prodotti da considerare), unita_per_teglia, is_active, aggiornamento_automatico</li>
                  <li>Calcolo Media Ultimi 30gg: da ProdottiVenduti, raggruppa per giorno settimana, calcola teglie = unità / unita_per_teglia, media per giorno</li>
                  <li>Tabella pianificazione settimanale con colonne: Pranzo Rosse, Pomeriggio Rosse, Cena Rosse, Totale Giornata, Media Ultimi 30gg, Scostamento, Impasto 3 Giorni (somma prossimi 3 giorni)</li>
                  <li>Funzioni: edit percentuali per fascia oraria, calcolo automatico rosse da percentuali, aggiornamento manuale o automatico totale giornata a media 30gg</li>
                  <li>Form dipendente Precotture: inserimento rosse/bianche preparate per turno (pranzo/pomeriggio/cena)</li>
                </ul>

                <p className="font-semibold text-purple-700">MODULO 11 - COMPLIANCE E ALERTS:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Entità RequisitoCompliance: nome, descrizione, tipo (documento/certificazione/formazione), scadenza_obbligatoria, giorni_preavviso_scadenza, stores_applicabili, ruoli_applicabili</li>
                  <li>Entità DipendenteCompliance: user_id, requisito_id, status (completo/incompleto/scaduto), data_completamento, data_scadenza, documento_url</li>
                  <li>Pagina Alerts con sezioni: Dipendenti in periodo prova (calcolo turni lavorati vs totale configurato), Contratti in scadenza (prossimi 30 giorni), Compliance items scaduti/in scadenza</li>
                  <li>Entità PeriodoProvaConfig per configurare durata periodo prova in turni</li>
                </ul>

                <p className="font-semibold text-purple-700">MODULO 12 - SEGNALAZIONI:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Entità Segnalazione: tipo (problema_tecnico/mancanza_materiale/altro), descrizione, priorita (bassa/media/alta), store_id, segnalato_da, stato (aperta/in_lavorazione/risolta), assegnato_a, foto_url, risoluzione_note, data_risoluzione</li>
                  <li>Form dipendente per creare segnalazioni con upload foto opzionale. Dashboard admin/manager per gestione con filtri per store, tipo, priorità, stato</li>
                </ul>

                <p className="font-semibold text-purple-700">MODULO 13 - ATS (APPLICANT TRACKING):</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Entità Candidato: nome_cognome, email, telefono, posizione_desiderata, cv_url, stato (nuovo/colloquio_programmato/in_valutazione/assunto/rifiutato), store_interesse, note, colloquio_data, colloquio_store_id</li>
                  <li>Kanban board con colonne per stato. Drag & drop tra stati. Possibilità programmare colloquio (sincronizzazione con turni disponibili). Link registrazione per assunzione automatica</li>
                  <li>Entità ValutazioneProvaConfig con domande valutazione fine periodo prova. Form compilazione per manager con scoring</li>
                </ul>

                <p className="font-semibold text-purple-700">MODULO 14 - ASSISTENTE AI:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Entità AssistenteKnowledge: categoria_id, titolo, contenuto, tipo (testo/video/immagine), ordine, visibile_a_ruoli</li>
                  <li>Entità AssistenteCategoria: nome, icona, parent_id (per struttura gerarchica), ordine</li>
                  <li>Entità ConversazioneAssistente: user_id, messaggi (array con ruolo user/assistant e contenuto), attiva</li>
                  <li>Chat AI che usa knowledge base aziendale come contesto. Admin gestisce contenuti knowledge. Dipendenti chattano con assistente che risponde basandosi su KB</li>
                </ul>

                <p className="font-semibold text-purple-700">MODULO 15 - PAUSE:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Entità PauseConfig: durata_pausa_minuti_per_ore_lavorate (oggetto con soglie, es. {`{4: 15, 6: 30, 8: 45}`}), pausa_obbligatoria</li>
                  <li>Entità Pausa: turno_id, user_id, store_id, data, ora_inizio, ora_fine, durata_minuti, tipo_pausa (pranzo/sigaretta/bagno)</li>
                  <li>Dashboard tracking pause per dipendente, analisi durata media, confronto con ore lavorate, alert pause non conformi</li>
                </ul>

                <p className="font-semibold text-purple-700">FEATURES TECNICHE IMPORTANTI:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Design Neumorphic con componenti custom (NeumorphicCard, NeumorphicButton, NeumorphicInput)</li>
                  <li>Responsive design con layout diversi per mobile/desktop</li>
                  <li>Sistema notifiche in tempo reale per alert e scadenze</li>
                  <li>Export dati in CSV/Excel per tutte le dashboard principali</li>
                  <li>Sistema webhooks per integrazioni esterne (Zapier, Planday, iPratico)</li>
                  <li>Upload e processing file: CSV, XML, PDF con parsing automatico</li>
                  <li>Grafici interattivi con recharts per analisi trend e KPI</li>
                  <li>Sistema di permessi granulare basato su ruoli e stato contrattuale</li>
                  <li>Backup automatico dati e audit log per operazioni critiche</li>
                </ul>

                <p className="font-semibold text-purple-700">INTEGRAZIONI ESTERNE:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li><strong>Planday:</strong> Import turni dipendenti via webhook</li>
                  <li><strong>iPratico:</strong> Import dati vendite giornaliere via webhook</li>
                  <li><strong>Google/Facebook/TripAdvisor:</strong> Import recensioni via Zapier</li>
                  <li><strong>Glovo/Deliveroo:</strong> Import ordini problematici via CSV</li>
                  <li><strong>YouTube:</strong> Embed video per academy</li>
                  <li><strong>AI/LLM:</strong> Analisi foto pulizie, assistente conversazionale</li>
                </ul>

                <p className="font-bold text-purple-800 mt-4">IMPORTANTE: Implementa TUTTE le funzionalità descritte con particolare attenzione ai sistemi di matching automatico, workflow approvazioni, calcoli automatici (food cost, ritardi, scoring), e integrazioni webhooks. L'app deve essere production-ready con gestione errori, validazioni, e UX ottimizzata.</p>
              </div>
            </div>
          </div>
        )}
      </NeumorphicCard>

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