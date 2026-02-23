import React, { useState, useMemo } from 'react';
import moment from 'moment';
import NeumorphicCard from '../neumorphic/NeumorphicCard';
import { ChevronDown } from 'lucide-react';

export default function DeltaTeglie({ 
  deltaStartDate, 
  setDeltaStartDate, 
  deltaEndDate, 
  setDeltaEndDate, 
  selectedStore,
  precottureForm,
  prodottiVendutiDelta,
  teglieButtate,
  teglieConfig
}) {
  const [scartiManuali, setScartiManuali] = useState({});
  const [expandedDays, setExpandedDays] = useState({});

  const deltaData = useMemo(() => {
    const data = [];
    let currentDate = moment(deltaStartDate);
    const endMoment = moment(deltaEndDate);
    
    while (currentDate.isSameOrBefore(endMoment)) {
      const dateStr = currentDate.format('YYYY-MM-DD');
      const dayOfWeek = moment(dateStr).format('dddd');
      
      const dayMapping = {
        'Monday': 'Lunedì',
        'Tuesday': 'Martedì',
        'Wednesday': 'Mercoledì',
        'Thursday': 'Giovedì',
        'Friday': 'Venerdì',
        'Saturday': 'Sabato',
        'Sunday': 'Domenica'
      };
      const dayIta = dayMapping[dayOfWeek] || 'Lunedì';
      
      const formsDelGiorno = precottureForm.filter(f => {
        const formDate = moment(f.data_compilazione).format('YYYY-MM-DD');
        return formDate === dateStr && (!selectedStore || f.store_id === selectedStore);
      });
      const teglieSuggerite = formsDelGiorno.reduce((sum, f) => sum + (f.rosse_da_fare || 0), 0);
      
      const venduteDelGiorno = prodottiVendutiDelta.filter(p => {
        if (p.data_vendita !== dateStr) return false;
        if (selectedStore && p.store_id !== selectedStore) return false;
        if (!teglieConfig.categorie.includes(p.category)) return false;
        return true;
      });
      const totaleUnitaVendute = venduteDelGiorno.reduce((sum, p) => sum + (p.total_pizzas_sold || 0), 0);
      const teglieVendute = totaleUnitaVendute / teglieConfig.unita_per_teglia;
      
      const teglieButtateDelGiorno = teglieButtate.filter(t => {
        if (!t.data_rilevazione) return false;
        const buttateDate = moment(t.data_rilevazione).format('YYYY-MM-DD');
        if (buttateDate !== dateStr) return false;
        if (selectedStore && t.store_id !== selectedStore) return false;
        return true;
      });
      const teglieSpreco = teglieButtateDelGiorno.reduce((sum, t) => {
        return sum + (t.teglie_rosse_buttate || 0) + (t.teglie_bianche_buttate || 0);
      }, 0);
      
      const scartoManuale = scartiManuali[dateStr] || 0;
      const teglieFatte = teglieVendute + teglieSpreco + scartoManuale;
      const delta = teglieFatte - teglieSuggerite;
      
      data.push({
        data: dateStr,
        dayIta,
        teglieSuggerite,
        teglieVendute,
        teglieSpreco,
        scartoManuale,
        teglieFatte,
        delta,
        forms: formsDelGiorno
      });
      
      currentDate.add(1, 'day');
    }
    
    return data;
  }, [deltaStartDate, deltaEndDate, selectedStore, precottureForm, prodottiVendutiDelta, teglieButtate, teglieConfig, scartiManuali]);

  return (
    <>
      {/* Date Range */}
      <NeumorphicCard className="p-6">
        <h3 className="text-sm font-medium text-slate-700 mb-3">Periodo di analisi</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Data inizio</label>
            <input
              type="date"
              value={deltaStartDate}
              onChange={(e) => setDeltaStartDate(e.target.value)}
              className="w-full neumorphic-pressed px-4 py-2 rounded-xl text-slate-700 outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Data fine</label>
            <input
              type="date"
              value={deltaEndDate}
              onChange={(e) => setDeltaEndDate(e.target.value)}
              className="w-full neumorphic-pressed px-4 py-2 rounded-xl text-slate-700 outline-none"
            />
          </div>
        </div>
      </NeumorphicCard>

      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Delta Teglie - Confronto Suggerite vs Fatte</h2>
        
        {deltaData.length === 0 ? (
          <p className="text-slate-500 text-center py-8">Nessun dato nel periodo selezionato</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="text-center py-3 px-2 w-8"></th>
                  <th className="text-left py-3 px-2 text-slate-700">Data</th>
                  <th className="text-left py-3 px-2 text-slate-700">Giorno</th>
                  <th className="text-center py-3 px-2 bg-blue-50 text-blue-700">Suggerite</th>
                  <th className="text-center py-3 px-2 bg-green-50 text-green-700">Vendute</th>
                  <th className="text-center py-3 px-2 bg-orange-50 text-orange-700">Sprechi</th>
                  <th className="text-center py-3 px-2 bg-purple-50 text-purple-700">Scarto Manuale</th>
                  <th className="text-center py-3 px-2 bg-yellow-50 text-yellow-700 font-bold">Fatte</th>
                  <th className="text-center py-3 px-2 font-bold">Delta</th>
                </tr>
              </thead>
              <tbody>
                {deltaData.map((d) => {
                  const isExpanded = expandedDays[d.data];
                  return (
                    <React.Fragment key={d.data}>
                      <tr className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="text-center py-3 px-2">
                          <button
                            onClick={() => setExpandedDays({...expandedDays, [d.data]: !isExpanded})}
                            className="nav-button p-1 rounded hover:bg-slate-200"
                          >
                            <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>
                        </td>
                        <td className="py-3 px-2 text-slate-700">{moment(d.data).format('DD/MM/YYYY')}</td>
                        <td className="py-3 px-2 text-slate-600">{d.dayIta}</td>
                        <td className="text-center py-3 px-2 bg-blue-50 font-medium text-blue-700">
                          {d.teglieSuggerite.toFixed(1)}
                        </td>
                        <td className="text-center py-3 px-2 bg-green-50 font-medium text-green-700">
                          {d.teglieVendute.toFixed(1)}
                        </td>
                        <td className="text-center py-3 px-2 bg-orange-50 font-medium text-orange-700">
                          {d.teglieSpreco.toFixed(1)}
                        </td>
                        <td className="text-center py-3 px-2 bg-purple-50">
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={scartiManuali[d.data] || 0}
                            onChange={(e) => setScartiManuali({
                              ...scartiManuali,
                              [d.data]: parseFloat(e.target.value) || 0
                            })}
                            className="w-20 text-center neumorphic-pressed px-2 py-1 rounded-lg text-purple-700 font-medium"
                          />
                        </td>
                        <td className="text-center py-3 px-2 bg-yellow-50 font-bold text-yellow-700">
                          {d.teglieFatte.toFixed(1)}
                        </td>
                        <td className="text-center py-3 px-2">
                          <span className={`font-bold text-lg ${
                            d.delta > 0 ? 'text-green-600' : d.delta < 0 ? 'text-red-600' : 'text-slate-600'
                          }`}>
                            {d.delta > 0 ? '+' : ''}{d.delta.toFixed(1)}
                          </span>
                        </td>
                      </tr>
                      {isExpanded && d.forms.length > 0 && (
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <td colSpan="9" className="py-4 px-4">
                            <div className="space-y-2">
                              <p className="text-sm font-semibold text-slate-700 mb-3">Form Precotture ({d.forms.length}):</p>
                              {d.forms.map((f) => (
                                <div key={f.id} className="bg-white rounded-lg p-3 border border-slate-200 text-sm">
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    <div>
                                      <p className="text-xs text-slate-500">Negozio</p>
                                      <p className="font-medium text-slate-700">{f.store_name}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-slate-500">Dipendente</p>
                                      <p className="font-medium text-slate-700">{f.dipendente_nome || '-'}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-slate-500">Turno</p>
                                      <p className="font-medium text-slate-700 capitalize">{f.turno || '-'}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-slate-500">Ora</p>
                                      <p className="font-medium text-slate-700">{moment(f.data_compilazione).format('HH:mm')}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-slate-500">Rosse Presenti</p>
                                      <p className="font-medium text-yellow-700">{f.rosse_presenti || 0}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-slate-500">Richieste</p>
                                      <p className="font-medium text-orange-700">{f.rosse_richieste || 0}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-slate-500">Da Fare</p>
                                      <p className="font-bold text-red-700">{f.rosse_da_fare || 0}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-slate-500">Note</p>
                                      <p className="font-medium text-slate-600 text-xs">{f.note || '-'}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300 bg-slate-100">
                  <td colSpan="3" className="py-3 px-2 font-bold text-slate-800">TOTALE</td>
                  <td className="text-center py-3 px-2 bg-blue-100 font-bold text-blue-700">
                    {deltaData.reduce((sum, d) => sum + d.teglieSuggerite, 0).toFixed(1)}
                  </td>
                  <td className="text-center py-3 px-2 bg-green-100 font-bold text-green-700">
                    {deltaData.reduce((sum, d) => sum + d.teglieVendute, 0).toFixed(1)}
                  </td>
                  <td className="text-center py-3 px-2 bg-orange-100 font-bold text-orange-700">
                    {deltaData.reduce((sum, d) => sum + d.teglieSpreco, 0).toFixed(1)}
                  </td>
                  <td className="text-center py-3 px-2 bg-purple-100 font-bold text-purple-700">
                    {deltaData.reduce((sum, d) => sum + d.scartoManuale, 0).toFixed(1)}
                  </td>
                  <td className="text-center py-3 px-2 bg-yellow-100 font-bold text-yellow-700">
                    {deltaData.reduce((sum, d) => sum + d.teglieFatte, 0).toFixed(1)}
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className={`font-bold text-xl ${
                      deltaData.reduce((sum, d) => sum + d.delta, 0) > 0 ? 'text-green-600' :
                      deltaData.reduce((sum, d) => sum + d.delta, 0) < 0 ? 'text-red-600' : 'text-slate-600'
                    }`}>
                      {deltaData.reduce((sum, d) => sum + d.delta, 0) > 0 ? '+' : ''}
                      {deltaData.reduce((sum, d) => sum + d.delta, 0).toFixed(1)}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </NeumorphicCard>

      {deltaData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <NeumorphicCard className="p-6 text-center">
            <p className="text-xs text-slate-500 mb-2">Media Suggerite/Giorno</p>
            <p className="text-3xl font-bold text-blue-600">
              {(deltaData.reduce((sum, d) => sum + d.teglieSuggerite, 0) / deltaData.length).toFixed(1)}
            </p>
          </NeumorphicCard>

          <NeumorphicCard className="p-6 text-center">
            <p className="text-xs text-slate-500 mb-2">Media Fatte/Giorno</p>
            <p className="text-3xl font-bold text-yellow-600">
              {(deltaData.reduce((sum, d) => sum + d.teglieFatte, 0) / deltaData.length).toFixed(1)}
            </p>
          </NeumorphicCard>

          <NeumorphicCard className="p-6 text-center">
            <p className="text-xs text-slate-500 mb-2">Delta Medio/Giorno</p>
            <p className={`text-3xl font-bold ${
              (deltaData.reduce((sum, d) => sum + d.delta, 0) / deltaData.length) > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {(deltaData.reduce((sum, d) => sum + d.delta, 0) / deltaData.length) > 0 ? '+' : ''}
              {(deltaData.reduce((sum, d) => sum + d.delta, 0) / deltaData.length).toFixed(1)}
            </p>
          </NeumorphicCard>
        </div>
      )}
    </>
  );
}