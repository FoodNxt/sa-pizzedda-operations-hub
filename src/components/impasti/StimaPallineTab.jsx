import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import NeumorphicCard from "../neumorphic/NeumorphicCard";
import { Store, Calendar, TrendingUp, TrendingDown, Minus, Loader2, Info } from "lucide-react";
import moment from "moment";

const PALLINE_PER_BARELLA = 6;
const PIZZE_PER_PALLINA = 12;
// Ogni teglia buttata = 1 pallina sprecata

export default function StimaPallineTab() {
  const [selectedStore, setSelectedStore] = useState("");
  const [days, setDays] = useState(14);

  const { data: stores = [] } = useQuery({
    queryKey: ["stores"],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: impastoLogs = [], isLoading: loadingLogs } = useQuery({
    queryKey: ["calcolo-impasto-logs-stima"],
    queryFn: () => base44.entities.CalcoloImpastoLog.list("-data_calcolo", 1000),
  });

  const { data: prodottiVenduti = [], isLoading: loadingProdotti } = useQuery({
    queryKey: ["prodotti-venduti-pizza-stima"],
    queryFn: () => base44.entities.ProdottiVenduti.filter({ category: "pizza" }, "-data_vendita", 5000),
  });

  const { data: teglieButtate = [], isLoading: loadingTeglie } = useQuery({
    queryKey: ["teglie-buttate-stima"],
    queryFn: () => base44.entities.TeglieButtate.list("-data_rilevazione", 2000),
  });

  const isLoading = loadingLogs || loadingProdotti || loadingTeglie;

  const analysis = useMemo(() => {
    if (!impastoLogs.length) return [];

    const cutoff = moment().subtract(days, "days").startOf("day");

    // Filter logs by store and date range
    const filteredLogs = impastoLogs.filter((log) => {
      if (selectedStore && log.store_id !== selectedStore) return false;
      return moment(log.data_calcolo).isAfter(cutoff);
    });

    // Group logs by store + date (take latest entry per day per store)
    const logsByStoreDate = {};
    filteredLogs.forEach((log) => {
      const date = moment(log.data_calcolo).format("YYYY-MM-DD");
      const key = `${log.store_id}_${date}`;
      if (!logsByStoreDate[key] || moment(log.data_calcolo).isAfter(moment(logsByStoreDate[key].data_calcolo))) {
        logsByStoreDate[key] = log;
      }
    });

    // Group pizza sold by store + date
    const pizzaByStoreDate = {};
    prodottiVenduti.forEach((pv) => {
      if (selectedStore && pv.store_id !== selectedStore) return;
      if (!pv.data_vendita) return;
      const date = pv.data_vendita;
      if (moment(date).isBefore(cutoff)) return;
      const key = `${pv.store_id}_${date}`;
      if (!pizzaByStoreDate[key]) pizzaByStoreDate[key] = 0;
      pizzaByStoreDate[key] += pv.total_pizzas_sold || 0;
    });

    // Group teglie buttate by store + date
    const teglieByStoreDate = {};
    teglieButtate.forEach((tb) => {
      if (selectedStore && tb.store_id !== selectedStore) return;
      if (!tb.data_rilevazione) return;
      const date = moment(tb.data_rilevazione).format("YYYY-MM-DD");
      if (moment(date).isBefore(cutoff)) return;
      const key = `${tb.store_id}_${date}`;
      if (!teglieByStoreDate[key]) teglieByStoreDate[key] = 0;
      teglieByStoreDate[key] += (tb.teglie_rosse_buttate || 0) + (tb.teglie_bianche_buttate || 0);
    });

    // Build daily analysis rows
    const rows = [];
    const allDates = new Set();
    Object.keys(logsByStoreDate).forEach((k) => {
      const date = k.split("_")[1];
      allDates.add(date);
    });

    const sortedDates = [...allDates].sort();

    sortedDates.forEach((date) => {
      const storeIds = selectedStore ? [selectedStore] : stores.map((s) => s.id);

      storeIds.forEach((storeId) => {
        const key = `${storeId}_${date}`;
        const log = logsByStoreDate[key];
        if (!log) return;

        const barelleFrigo = log.barelle_in_frigo || 0;
        const pallineDaBarelle = barelleFrigo * PALLINE_PER_BARELLA;

        // Impasto suggerito dello stesso giorno
        const impastoSuggerito = log.impasto_suggerito || 0;

        // Pizza vendute in quel giorno
        const pizzeVendute = pizzaByStoreDate[key] || 0;
        const pallineUsatePerPizze = pizzeVendute / PIZZE_PER_PALLINA;

        // Teglie buttate in quel giorno (ogni teglia = 1 pallina sprecata)
        const teglieButtateGiorno = teglieByStoreDate[key] || 0;

        // Formula Delta: Palline (barelle×6) - Impasto suggerito - Palline usate (pizze÷12)
        const stimaPalline = pallineDaBarelle - impastoSuggerito - pallineUsatePerPizze;
        const delta = Math.round(stimaPalline * 10) / 10;

        // Delta Mattina: confronto tra stima teorica (da ieri) e palline effettive oggi
        // Stima teorica = palline ieri + impasto suggerito ieri - palline usate ieri - teglie buttate ieri
        // Delta = palline effettive oggi - stima teorica (se positivo → ne abbiamo di più, segno invertito)
        const prevDate = moment(date).subtract(1, "days").format("YYYY-MM-DD");
        const prevKey = `${storeId}_${prevDate}`;
        const prevLog = logsByStoreDate[prevKey];
        let deltaMattina = null;
        if (prevLog) {
          const prevPalline = (prevLog.barelle_in_frigo || 0) * PALLINE_PER_BARELLA;
          const prevImpasto = prevLog.impasto_suggerito || 0;
          const prevPizzeVendute = pizzaByStoreDate[prevKey] || 0;
          const prevPallineUsate = prevPizzeVendute / PIZZE_PER_PALLINA;
          const prevTeglie = teglieByStoreDate[prevKey] || 0;
          const stimaTeorica = prevPalline + prevImpasto - prevPallineUsate - prevTeglie;
          // Differenza: palline reali oggi vs stima teorica, segno invertito (positivo = mancano palline)
          deltaMattina = Math.round((pallineDaBarelle - stimaTeorica) * 10) / 10;
        }

        const storeName = log.store_name || stores.find((s) => s.id === storeId)?.name || storeId;

        rows.push({
          date,
          storeId,
          storeName,
          barelleFrigo,
          pallineDaBarelle,
          impastoSuggerito,
          pizzeVendute: Math.round(pizzeVendute),
          pallineUsatePerPizze: Math.round(pallineUsatePerPizze * 10) / 10,
          teglieButtate: teglieButtateGiorno,
          stimaPalline: delta,
          deltaMattina,
        });
      });
    });

    return rows.sort((a, b) => b.date.localeCompare(a.date));
  }, [impastoLogs, prodottiVenduti, selectedStore, stores, days]);

  const summary = useMemo(() => {
    if (analysis.length === 0) return null;
    const validRows = analysis;
    const surplusCount = validRows.filter((r) => r.stimaPalline > 0).length;
    const deficitCount = validRows.filter((r) => r.stimaPalline < 0).length;
    const avgDelta = validRows.reduce((s, r) => s + r.stimaPalline, 0) / validRows.length;
    return { total: validRows.length, surplusCount, deficitCount, avgDelta: Math.round(avgDelta * 10) / 10 };
  }, [analysis]);

  return (
    <div className="space-y-6">
      {/* Info */}
      <NeumorphicCard className="p-4 bg-blue-50">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Come funziona la stima</p>
            <p>
              Per ogni giorno: <strong>Barelle in frigo × 6</strong> (palline presenti) 
              − <strong>Impasto suggerito</strong> (palline da preparare)
              − <strong>Pizze vendute ÷ 12</strong> (palline consumate).
            </p>
            <p className="mt-1">Un valore <span className="text-green-700 font-medium">positivo</span> indica surplus, un valore <span className="text-red-700 font-medium">negativo</span> indica deficit.</p>
          </div>
        </div>
      </NeumorphicCard>

      {/* Filtri */}
      <NeumorphicCard className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              <Store className="w-4 h-4 inline mr-1" />
              Negozio
            </label>
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
            >
              <option value="">Tutti i negozi</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              <Calendar className="w-4 h-4 inline mr-1" />
              Periodo
            </label>
            <div className="flex gap-2">
              {[
                { value: 7, label: "7 gg" },
                { value: 14, label: "14 gg" },
                { value: 30, label: "30 gg" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setDays(opt.value)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    days === opt.value
                      ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                      : "neumorphic-flat text-slate-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </NeumorphicCard>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <NeumorphicCard className="p-4 text-center">
            <p className="text-2xl font-bold text-slate-800">{summary.total}</p>
            <p className="text-xs text-slate-500">Giorni analizzati</p>
          </NeumorphicCard>
          <NeumorphicCard className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{summary.surplusCount}</p>
            <p className="text-xs text-slate-500">Giorni surplus</p>
          </NeumorphicCard>
          <NeumorphicCard className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{summary.deficitCount}</p>
            <p className="text-xs text-slate-500">Giorni deficit</p>
          </NeumorphicCard>
          <NeumorphicCard className="p-4 text-center">
            <p className={`text-2xl font-bold ${summary.avgDelta >= 0 ? "text-green-600" : "text-red-600"}`}>
              {summary.avgDelta > 0 ? "+" : ""}{summary.avgDelta}
            </p>
            <p className="text-xs text-slate-500">Media delta palline</p>
          </NeumorphicCard>
        </div>
      )}

      {/* Table */}
      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Dettaglio Giornaliero</h2>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : analysis.length === 0 ? (
          <p className="text-slate-500 text-center py-8">Nessun dato disponibile per il periodo selezionato</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="text-left py-3 px-2 text-slate-700">Data</th>
                  <th className="text-left py-3 px-2 text-slate-700">Locale</th>
                  <th className="text-right py-3 px-2 text-slate-700">Barelle Frigo</th>
                  <th className="text-right py-3 px-2 text-slate-700">Palline (×6)</th>
                  <th className="text-right py-3 px-2 text-slate-700">Impasto Suggerito</th>
                  <th className="text-right py-3 px-2 text-slate-700">Pizze Vendute</th>
                  <th className="text-right py-3 px-2 text-slate-700">Palline Usate (÷12)</th>
                  <th className="text-right py-3 px-2 text-slate-700">Teglie Buttate</th>
                  <th className="text-right py-3 px-2 text-slate-700 font-bold">Delta Palline</th>
                  <th className="text-right py-3 px-2 text-slate-700 font-bold">Delta Mattina</th>
                </tr>
              </thead>
              <tbody>
                {analysis.map((row, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-2 text-slate-700 font-medium">
                      {moment(row.date).format("DD/MM/YYYY")}
                    </td>
                    <td className="py-3 px-2 text-slate-800 font-medium">{row.storeName}</td>
                    <td className="py-3 px-2 text-right text-slate-700">{row.barelleFrigo}</td>
                    <td className="py-3 px-2 text-right text-blue-700 font-medium">{row.pallineDaBarelle}</td>
                    <td className="py-3 px-2 text-right text-slate-700">{row.impastoSuggerito}</td>
                    <td className="py-3 px-2 text-right text-slate-700">{row.pizzeVendute}</td>
                    <td className="py-3 px-2 text-right text-orange-700 font-medium">{row.pallineUsatePerPizze}</td>
                    <td className="py-3 px-2 text-right text-red-600">{row.teglieButtate || 0}</td>
                    <td className="py-3 px-2 text-right font-bold">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm ${
                          row.stimaPalline > 2
                            ? "bg-green-100 text-green-700"
                            : row.stimaPalline < -2
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}>
                          {row.stimaPalline > 0 ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : row.stimaPalline < 0 ? (
                            <TrendingDown className="w-3 h-3" />
                          ) : (
                            <Minus className="w-3 h-3" />
                          )}
                          {row.stimaPalline > 0 ? "+" : ""}{row.stimaPalline}
                        </span>
                    </td>
                    <td className="py-3 px-2 text-right font-bold">
                      {row.deltaMattina !== null ? (
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm ${
                          row.deltaMattina > 2
                            ? "bg-green-100 text-green-700"
                            : row.deltaMattina < -2
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}>
                          {row.deltaMattina > 0 ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : row.deltaMattina < 0 ? (
                            <TrendingDown className="w-3 h-3" />
                          ) : (
                            <Minus className="w-3 h-3" />
                          )}
                          {row.deltaMattina > 0 ? "+" : ""}{row.deltaMattina}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">N/D</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </NeumorphicCard>
    </div>
  );
}