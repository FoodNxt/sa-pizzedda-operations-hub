
import { useState, useEffect } from "react";
import { Clock, Copy, CheckCircle, AlertCircle, Users, Store as StoreIcon, FileSpreadsheet } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

export default function ShiftsSetup() {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);
  const [webhookSecret, setWebhookSecret] = useState('');

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });

  useEffect(() => {
    const baseUrl = window.location.origin;
    setWebhookUrl(`${baseUrl}/api/functions/importShiftFromZapier`);
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const testWebhook = async () => {
    if (stores.length === 0) {
      setTestResult({
        success: false,
        message: 'Devi prima creare almeno un locale nella sezione Store Reviews'
      });
      return;
    }

    if (employees.length === 0) {
      setTestResult({
        success: false,
        message: 'Devi prima creare almeno un dipendente nella sezione Employees'
      });
      return;
    }

    if (!webhookSecret) {
      setTestResult({
        success: false,
        message: 'Inserisci il Webhook Secret prima di testare'
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const response = await base44.functions.invoke('importShiftFromZapier', {
        secret: webhookSecret,
        employee_name: employees[0].full_name,
        department_name: stores[0].name,
        start: '01/12/2025 09:30',
        end: '01/12/2025 15:00',
        minutes: 330,
        timeclock_start: '01/12/2025 09:25',
        timeclock_end: '01/12/2025 15:05',
        timeclock_minutes: 340,
        timesheet_type_name: 'Test',
        employee_group_name: 'Pizzaiolo' // Changed from 'Full Time' and removed employee_group: 'FT'
      });

      if (response.data.error) {
        setTestResult({
          success: false,
          message: response.data.error,
          data: response.data
        });
      } else {
        setTestResult({
          success: true,
          message: 'Webhook testato con successo! Il turno di test è stato creato.',
          data: response.data
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Errore durante il test: ' + error.message,
        data: {
          error: error.message,
          hint: 'Verifica che la funzione sia deployata in Dashboard → Code → Functions → importShiftFromZapier'
        }
      });
    }

    setTesting(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <Clock className="w-10 h-10 text-[#8b7355]" />
          <h1 className="text-3xl font-bold text-[#6b6b6b]">Configurazione Turni Zapier</h1>
        </div>
        <p className="text-[#9b9b9b]">Importa automaticamente i turni da Planday/Google Sheets</p>
      </div>

      {/* Prerequisites Check */}
      {(stores.length === 0 || employees.length === 0) && (
        <NeumorphicCard className="p-6 border-2 border-red-300">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 mt-1" />
            <div>
              <h3 className="font-bold text-red-700 mb-2">Attenzione: Configurazione incompleta</h3>
              {stores.length === 0 && (
                <p className="text-red-600 mb-2">
                  • Devi creare i tuoi locali nella sezione <strong>Store Reviews</strong>
                </p>
              )}
              {employees.length === 0 && (
                <p className="text-red-600 mb-2">
                  • Devi creare i dipendenti nella sezione <strong>Employees</strong>
                </p>
              )}
            </div>
          </div>
        </NeumorphicCard>
      )}

      {/* Webhook Secret Setup */}
      <NeumorphicCard className="p-6 border-2 border-[#8b7355]">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="w-6 h-6 text-[#8b7355]" />
          <h2 className="text-xl font-bold text-[#6b6b6b]">🔐 Step 1: Configura Webhook Secret</h2>
        </div>
        
        <div className="neumorphic-pressed p-4 rounded-xl mb-4">
          <p className="text-[#6b6b6b] mb-4">
            <strong>IMPORTANTE:</strong> Imposta un <strong>Webhook Secret</strong> per proteggere il tuo endpoint.
          </p>
          
          <ol className="space-y-3 text-[#6b6b6b] mb-4">
            <li className="flex items-start gap-2">
              <span className="font-bold text-[#8b7355]">1.</span>
              <span>Vai su <strong>Dashboard → Code → Secrets</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-[#8b7355]">2.</span>
              <span>Aggiungi: <code className="bg-white px-2 py-1 rounded">ZAPIER_SHIFTS_WEBHOOK_SECRET</code></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-[#8b7355]">3.</span>
              <span>Imposta un valore sicuro</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-[#8b7355]">4.</span>
              <span>Copia lo stesso valore qui sotto:</span>
            </li>
          </ol>

          <input
            type="password"
            placeholder="Incolla qui il tuo webhook secret..."
            value={webhookSecret}
            onChange={(e) => setWebhookSecret(e.target.value)}
            className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
          />
        </div>
      </NeumorphicCard>

      {/* Available Resources */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Stores */}
        {stores.length > 0 && (
          <NeumorphicCard className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <StoreIcon className="w-5 h-5 text-[#8b7355]" />
              <h2 className="text-xl font-bold text-[#6b6b6b]">Locali Disponibili</h2>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {stores.map(store => (
                <div key={store.id} className="neumorphic-pressed p-3 rounded-lg">
                  <p className="font-medium text-[#6b6b6b] text-sm">{store.name}</p>
                </div>
              ))}
            </div>
          </NeumorphicCard>
        )}

        {/* Employees */}
        {employees.length > 0 && (
          <NeumorphicCard className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-5 h-5 text-[#8b7355]" />
              <h2 className="text-xl font-bold text-[#6b6b6b]">Dipendenti Disponibili</h2>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {employees.slice(0, 10).map(emp => (
                <div key={emp.id} className="neumorphic-pressed p-3 rounded-lg">
                  <p className="font-medium text-[#6b6b6b] text-sm">{emp.full_name}</p>
                </div>
              ))}
              {employees.length > 10 && (
                <p className="text-sm text-[#9b9b9b] text-center mt-2">
                  ... e altri {employees.length - 10} dipendenti
                </p>
              )}
            </div>
          </NeumorphicCard>
        )}
      </div>

      {/* Webhook URL */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="w-5 h-5 text-[#8b7355]" />
          <h2 className="text-xl font-bold text-[#6b6b6b]">🔗 Step 2: URL Webhook</h2>
        </div>
        
        <div className="neumorphic-pressed p-4 rounded-xl mb-4">
          <div className="flex items-center gap-3">
            <code className="flex-1 text-sm text-[#6b6b6b] break-all">
              {webhookUrl || 'Caricamento...'}
            </code>
            <NeumorphicButton onClick={copyToClipboard} className="px-4 py-2">
              {copied ? <CheckCircle className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
            </NeumorphicButton>
          </div>
        </div>

        <NeumorphicButton
          onClick={testWebhook}
          disabled={testing || stores.length === 0 || employees.length === 0 || !webhookSecret}
          variant="primary"
          className="w-full"
        >
          {testing ? 'Test in corso...' : 'Testa Webhook'}
        </NeumorphicButton>

        {testResult && (
          <div className={`mt-4 p-4 rounded-xl ${testResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className="flex items-start gap-3">
              {testResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              )}
              <div className="flex-1">
                <p className={`font-medium ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
                  {testResult.message}
                </p>
                {testResult.data && (
                  <pre className="mt-2 text-xs overflow-auto">
                    {JSON.stringify(testResult.data, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          </div>
        )}
      </NeumorphicCard>

      {/* Zapier Configuration Guide */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <FileSpreadsheet className="w-6 h-6 text-[#8b7355]" />
          <h2 className="text-xl font-bold text-[#6b6b6b]">⚙️ Step 3: Configurazione Zapier</h2>
        </div>

        <div className="space-y-6">
          {/* Steps */}
          {[
            {
              num: 1,
              title: 'Crea nuovo Zap',
              content: 'Vai su Zapier.com e clicca "Create Zap"'
            },
            {
              num: 2,
              title: 'Configura Trigger',
              items: [
                'App: Google Sheets',
                'Trigger: New Spreadsheet Row',
                'Seleziona il tuo foglio con i turni Planday'
              ]
            },
            {
              num: 3,
              title: 'Configura Action',
              items: [
                'App: Webhooks by Zapier',
                'Action: POST',
                'URL: Copia l\'URL qui sopra',
                'Payload Type: JSON',
                'Header: Content-Type = application/json'
              ]
            },
            {
              num: 4,
              title: 'Mappa i Campi',
              highlight: true,
              fields: [
                { name: 'secret', desc: 'Il tuo ZAPIER_SHIFTS_WEBHOOK_SECRET', required: true },
                { name: 'employee_name', desc: 'Colonna "Name" dal Google Sheet', required: true },
                { name: 'department_name', desc: 'Colonna "DepartmentName" (nome locale)', required: true },
                { name: 'start', desc: 'Colonna "Start" (formato: DD/MM/YYYY HH:MM)', required: true },
                { name: 'end', desc: 'Colonna "End" (formato: DD/MM/YYYY HH:MM)', required: true },
                { name: 'minutes', desc: 'Colonna "Minutes"', required: false },
                { name: 'timeclock_start', desc: 'Colonna "TimeclockStart"', required: false },
                { name: 'timeclock_end', desc: 'Colonna "TimeclockEnd"', required: false },
                { name: 'timeclock_minutes', desc: 'Colonna "TimeclockMinutes"', required: false },
                { name: 'timesheet_type_name', desc: 'Colonna "TimesheetTypeName"', required: false },
                { name: 'employee_group_name', desc: 'Colonna "EmployeeGroupName"', required: false },
                { name: 'employee_id', desc: 'Colonna "EmployeeId" (ID esterno)', required: false } // Replaced external_id with employee_id and removed others
              ]
            },
            {
              num: 5,
              title: 'Testa e Pubblica',
              content: 'Clicca "Test & Continue" poi "Publish"'
            }
          ].map((step, idx) => (
            <div key={idx} className={`neumorphic-flat p-5 rounded-xl ${step.highlight ? 'border-2 border-[#8b7355]' : ''}`}>
              <div className="flex items-start gap-4">
                <div className="neumorphic-pressed w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="font-bold text-[#8b7355]">{step.num}</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-[#6b6b6b] mb-2">{step.title}</h3>
                  {step.content && <p className="text-[#6b6b6b]">{step.content}</p>}
                  {step.items && (
                    <ul className="space-y-1 text-[#6b6b6b]">
                      {step.items.map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-[#8b7355]">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {step.fields && (
                    <div className="space-y-2 mt-3">
                      {step.fields.map((field, i) => (
                        <div key={i} className={`neumorphic-pressed p-3 rounded-lg ${field.required ? 'bg-yellow-50' : ''}`}>
                          <div className="text-sm">
                            <span className="font-bold text-[#8b7355]">{field.name}</span>
                            {field.required && <span className="text-red-600 ml-1">*</span>}
                            <span className="text-[#6b6b6b] block mt-1">→ {field.desc}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </NeumorphicCard>

      {/* Google Sheet Structure */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <FileSpreadsheet className="w-5 h-5 text-[#8b7355]" />
          <h2 className="text-xl font-bold text-[#6b6b6b]">Struttura Google Sheet Planday</h2>
        </div>
        
        <div className="neumorphic-pressed p-4 rounded-xl mb-4">
          <p className="text-[#6b6b6b] mb-3">
            Il Google Sheet deve contenere le colonne esportate da Planday:
          </p>
          <div className="bg-white rounded-lg p-4 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b-2 border-[#8b7355]">
                  <th className="text-left p-2 text-[#8b7355]">Name</th>
                  <th className="text-left p-2 text-[#8b7355]">Start</th>
                  <th className="text-left p-2 text-[#8b7355]">End</th>
                  <th className="text-left p-2 text-[#8b7355]">DepartmentName</th>
                  <th className="text-left p-2 text-[#8b7355]">TimeclockStart</th>
                  <th className="text-left p-2 text-[#8b7355]">TimeclockEnd</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="p-2 text-[#6b6b6b]">Mario Rossi</td>
                  <td className="p-2 text-[#6b6b6b]">30/09/2025 09:30</td>
                  <td className="p-2 text-[#6b6b6b]">30/09/2025 15:00</td>
                  <td className="p-2 text-[#6b6b6b]">Ticinese</td>
                  <td className="p-2 text-[#6b6b6b]">30/09/2025 09:25</td>
                  <td className="p-2 text-[#6b6b6b]">30/09/2025 15:05</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="neumorphic-flat p-4 rounded-xl">
          <p className="text-sm text-[#6b6b6b]">
            💡 <strong>Suggerimento:</strong> Esporta i dati da Planday in formato CSV e caricali su Google Sheets
          </p>
        </div>
      </NeumorphicCard>
    </div>
  );
}
