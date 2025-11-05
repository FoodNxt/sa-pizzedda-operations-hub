import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Calendar, DollarSign, TrendingUp, Database, CheckCircle, AlertCircle, CalendarRange, ShoppingBag } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

export default function DailyRevenueAggregation() {
  const { data: iPraticoData = [], refetch: refetchData } = useQuery({
    queryKey: ['iPratico'],
    queryFn: () => base44.entities.iPratico.list('-order_date', 100),
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <Database className="w-10 h-10 text-[#8b7355]" />
          <h1 className="text-3xl font-bold text-[#6b6b6b]">Dati iPratico - Revenue Giornaliera</h1>
        </div>
        <p className="text-[#9b9b9b]">Visualizza i dati di vendita importati da iPratico</p>
      </div>

      {/* Info Card */}
      <NeumorphicCard className="p-6 border-2 border-blue-500">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-6 h-6 text-blue-600 mt-1" />
          <div>
            <h3 className="font-bold text-blue-700 mb-2">📊 Dati da iPratico</h3>
            <p className="text-blue-600 mb-3">
              Questa pagina mostra i dati importati automaticamente da <strong>Google Sheets</strong> tramite <strong>Zapier</strong>.
            </p>
            <div className="neumorphic-pressed p-3 rounded-lg bg-blue-50">
              <p className="text-sm text-blue-800">
                ✅ I dati vengono importati dal tuo Google Sheet iPratico e includono breakdown dettagliati per:
              </p>
              <ul className="text-sm text-blue-700 ml-4 mt-2 space-y-1">
                <li>• <strong>Source App</strong> - Glovo, Deliveroo, JustEat, Tabesto, Store, ecc.</li>
                <li>• <strong>Source Type</strong> - Delivery, Takeaway, Store</li>
                <li>• <strong>Money Type</strong> - Bancomat, Cash, Online, Satispay, ecc.</li>
                <li>• <strong>Ordini + Revenue</strong> - Per ogni categoria hai sia il numero ordini che il revenue</li>
              </ul>
            </div>
          </div>
        </div>
      </NeumorphicCard>

      {/* Recent Data */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-6 h-6 text-[#8b7355]" />
            <h2 className="text-xl font-bold text-[#6b6b6b]">Dati Recenti - iPratico</h2>
          </div>
          <button
            onClick={() => refetchData()}
            className="neumorphic-flat px-4 py-2 rounded-lg text-[#6b6b6b] hover:text-[#8b7355] transition-colors flex items-center gap-2"
          >
            <Database className="w-4 h-4" />
            <span className="text-sm">Aggiorna</span>
          </button>
        </div>

        {iPraticoData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-[#8b7355]">
                  <th className="text-left p-3 text-[#9b9b9b] font-medium">Data</th>
                  <th className="text-left p-3 text-[#9b9b9b] font-medium">Locale</th>
                  <th className="text-right p-3 text-[#9b9b9b] font-medium">Revenue Totale</th>
                  <th className="text-right p-3 text-[#9b9b9b] font-medium">Ordini</th>
                  <th className="text-right p-3 text-[#9b9b9b] font-medium">Scontrino Medio</th>
                </tr>
              </thead>
              <tbody>
                {iPraticoData.map((data, index) => {
                  const avgOrderValue = data.total_orders > 0 
                    ? data.total_revenue / data.total_orders 
                    : 0;
                  
                  return (
                    <tr key={index} className="border-b border-[#d1d1d1] hover:bg-[#e8ecf3] transition-colors">
                      <td className="p-3 text-[#6b6b6b]">
                        {format(new Date(data.order_date), 'dd MMM yyyy', { locale: it })}
                      </td>
                      <td className="p-3 text-[#6b6b6b] font-medium">{data.store_name}</td>
                      <td className="p-3 text-right text-[#6b6b6b] font-bold">
                        €{data.total_revenue?.toFixed(2)}
                      </td>
                      <td className="p-3 text-right text-[#6b6b6b]">
                        {data.total_orders}
                      </td>
                      <td className="p-3 text-right text-[#6b6b6b]">
                        €{avgOrderValue.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-[#9b9b9b]">
            <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nessun dato iPratico ancora</p>
            <p className="text-sm mt-2">Importa i dati da Google Sheets tramite Zapier</p>
          </div>
        )}
      </NeumorphicCard>

      {/* Sample Breakdown */}
      {iPraticoData.length > 0 && (
        <NeumorphicCard className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <DollarSign className="w-6 h-6 text-[#8b7355]" />
            <h2 className="text-xl font-bold text-[#6b6b6b]">
              Breakdown Dettagliato - {iPraticoData[0].store_name} ({format(new Date(iPraticoData[0].order_date), 'dd MMM yyyy', { locale: it })})
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Source App Breakdown */}
            <div className="neumorphic-pressed p-4 rounded-xl">
              <h3 className="font-bold text-[#6b6b6b] mb-3 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" />
                Per App di Provenienza
              </h3>
              <div className="space-y-2">
                {iPraticoData[0].sourceApp_glovo > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-[#6b6b6b] font-medium">Glovo</span>
                    <div className="text-right">
                      <div className="text-[#8b7355] font-bold">€{iPraticoData[0].sourceApp_glovo?.toFixed(2)}</div>
                      <div className="text-xs text-[#9b9b9b]">{iPraticoData[0].sourceApp_glovo_orders} ordini</div>
                    </div>
                  </div>
                )}
                {iPraticoData[0].sourceApp_deliveroo > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-[#6b6b6b] font-medium">Deliveroo</span>
                    <div className="text-right">
                      <div className="text-[#8b7355] font-bold">€{iPraticoData[0].sourceApp_deliveroo?.toFixed(2)}</div>
                      <div className="text-xs text-[#9b9b9b]">{iPraticoData[0].sourceApp_deliveroo_orders} ordini</div>
                    </div>
                  </div>
                )}
                {iPraticoData[0].sourceApp_justeat > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-[#6b6b6b] font-medium">JustEat</span>
                    <div className="text-right">
                      <div className="text-[#8b7355] font-bold">€{iPraticoData[0].sourceApp_justeat?.toFixed(2)}</div>
                      <div className="text-xs text-[#9b9b9b]">{iPraticoData[0].sourceApp_justeat_orders} ordini</div>
                    </div>
                  </div>
                )}
                {iPraticoData[0].sourceApp_tabesto > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-[#6b6b6b] font-medium">Tabesto</span>
                    <div className="text-right">
                      <div className="text-[#8b7355] font-bold">€{iPraticoData[0].sourceApp_tabesto?.toFixed(2)}</div>
                      <div className="text-xs text-[#9b9b9b]">{iPraticoData[0].sourceApp_tabesto_orders} ordini</div>
                    </div>
                  </div>
                )}
                {iPraticoData[0].sourceApp_store > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-[#6b6b6b] font-medium">Store</span>
                    <div className="text-right">
                      <div className="text-[#8b7355] font-bold">€{iPraticoData[0].sourceApp_store?.toFixed(2)}</div>
                      <div className="text-xs text-[#9b9b9b]">{iPraticoData[0].sourceApp_store_orders} ordini</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Source Type Breakdown */}
            <div className="neumorphic-pressed p-4 rounded-xl">
              <h3 className="font-bold text-[#6b6b6b] mb-3">Per Tipo Sorgente</h3>
              <div className="space-y-2">
                {iPraticoData[0].sourceType_delivery > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-[#6b6b6b] font-medium">Delivery</span>
                    <div className="text-right">
                      <div className="text-[#8b7355] font-bold">€{iPraticoData[0].sourceType_delivery?.toFixed(2)}</div>
                      <div className="text-xs text-[#9b9b9b]">{iPraticoData[0].sourceType_delivery_orders} ordini</div>
                    </div>
                  </div>
                )}
                {iPraticoData[0].sourceType_takeaway > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-[#6b6b6b] font-medium">Takeaway</span>
                    <div className="text-right">
                      <div className="text-[#8b7355] font-bold">€{iPraticoData[0].sourceType_takeaway?.toFixed(2)}</div>
                      <div className="text-xs text-[#9b9b9b]">{iPraticoData[0].sourceType_takeaway_orders} ordini</div>
                    </div>
                  </div>
                )}
                {iPraticoData[0].sourceType_store > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-[#6b6b6b] font-medium">Store</span>
                    <div className="text-right">
                      <div className="text-[#8b7355] font-bold">€{iPraticoData[0].sourceType_store?.toFixed(2)}</div>
                      <div className="text-xs text-[#9b9b9b]">{iPraticoData[0].sourceType_store_orders} ordini</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Money Type Breakdown */}
            <div className="neumorphic-pressed p-4 rounded-xl">
              <h3 className="font-bold text-[#6b6b6b] mb-3">Per Tipo Pagamento</h3>
              <div className="space-y-2">
                {iPraticoData[0].moneyType_online > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-[#6b6b6b] font-medium">Online</span>
                    <div className="text-right">
                      <div className="text-[#8b7355] font-bold">€{iPraticoData[0].moneyType_online?.toFixed(2)}</div>
                      <div className="text-xs text-[#9b9b9b]">{iPraticoData[0].moneyType_online_orders} ordini</div>
                    </div>
                  </div>
                )}
                {iPraticoData[0].moneyType_cash > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-[#6b6b6b] font-medium">Contanti</span>
                    <div className="text-right">
                      <div className="text-[#8b7355] font-bold">€{iPraticoData[0].moneyType_cash?.toFixed(2)}</div>
                      <div className="text-xs text-[#9b9b9b]">{iPraticoData[0].moneyType_cash_orders} ordini</div>
                    </div>
                  </div>
                )}
                {iPraticoData[0].moneyType_bancomat > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-[#6b6b6b] font-medium">Bancomat</span>
                    <div className="text-right">
                      <div className="text-[#8b7355] font-bold">€{iPraticoData[0].moneyType_bancomat?.toFixed(2)}</div>
                      <div className="text-xs text-[#9b9b9b]">{iPraticoData[0].moneyType_bancomat_orders} ordini</div>
                    </div>
                  </div>
                )}
                {iPraticoData[0].moneyType_satispay > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-[#6b6b6b] font-medium">Satispay</span>
                    <div className="text-right">
                      <div className="text-[#8b7355] font-bold">€{iPraticoData[0].moneyType_satispay?.toFixed(2)}</div>
                      <div className="text-xs text-[#9b9b9b]">{iPraticoData[0].moneyType_satispay_orders} ordini</div>
                    </div>
                  </div>
                )}
                {iPraticoData[0].moneyType_credit_card > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-[#6b6b6b] font-medium">Carta di Credito</span>
                    <div className="text-right">
                      <div className="text-[#8b7355] font-bold">€{iPraticoData[0].moneyType_credit_card?.toFixed(2)}</div>
                      <div className="text-xs text-[#9b9b9b]">{iPraticoData[0].moneyType_credit_card_orders} ordini</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Summary */}
            <div className="neumorphic-pressed p-4 rounded-xl bg-green-50">
              <h3 className="font-bold text-green-700 mb-3">Riepilogo Giornata</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-green-700 font-medium">Revenue Totale:</span>
                  <span className="text-green-800 font-bold text-lg">
                    €{iPraticoData[0].total_revenue?.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-green-700 font-medium">Ordini Totali:</span>
                  <span className="text-green-800 font-bold text-lg">
                    {iPraticoData[0].total_orders}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-green-700 font-medium">Scontrino Medio:</span>
                  <span className="text-green-800 font-bold text-lg">
                    €{(iPraticoData[0].total_revenue / iPraticoData[0].total_orders).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </NeumorphicCard>
      )}

      {/* Info */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle className="w-5 h-5 text-[#8b7355]" />
          <h3 className="text-lg font-bold text-[#6b6b6b]">ℹ️ Informazioni iPratico</h3>
        </div>
        <div className="neumorphic-pressed p-4 rounded-xl space-y-2 text-sm text-[#6b6b6b]">
          <p>📊 Questi dati vengono importati <strong>automaticamente</strong> da Google Sheets tramite Zapier</p>
          <p>🔄 Ogni nuova riga nel Google Sheet crea o aggiorna un record in questa tabella</p>
          <p>📈 I dati includono breakdown completi per:</p>
          <ul className="ml-6 list-disc space-y-1">
            <li><strong>Source App</strong> - Glovo, Deliveroo, JustEat, Tabesto, Store, OnlineOrdering, OrderTable</li>
            <li><strong>Source Type</strong> - Delivery, Takeaway, TakeawayOnSite, Store</li>
            <li><strong>Money Type</strong> - Bancomat, Cash, Online, Satispay, Credit Card, Fidelity Points</li>
            <li>Per ogni categoria hai sia il <strong>revenue (€)</strong> che il <strong>numero di ordini</strong></li>
          </ul>
          <div className="border-t border-[#c1c1c1] pt-3 mt-3">
            <p className="font-bold text-[#8b7355] mb-2">🔗 Setup Zapier</p>
            <p>Vai su <strong>Zapier Guide → Zapier iPratico</strong> per configurare l'importazione automatica</p>
          </div>
          <div className="border-t border-[#c1c1c1] pt-3 mt-3">
            <p className="font-bold text-[#8b7355] mb-2">📦 Bulk Import</p>
            <p>Vai su <strong>Zapier Guide → Bulk Import iPratico</strong> per caricare dati storici in massa</p>
          </div>
        </div>
      </NeumorphicCard>
    </div>
  );
}