import React, { useState } from 'react';
import NeumorphicCard from '../neumorphic/NeumorphicCard';
import NeumorphicButton from '../neumorphic/NeumorphicButton';
import { Info, TrendingUp, TrendingDown, ChevronDown, ChevronRight } from 'lucide-react';

export default function ROASCalculator({ foodCostPercentage, platformFeesPercentage }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCampaignB, setShowCampaignB] = useState(false);
  const [expandedCampaignA, setExpandedCampaignA] = useState(false);
  const [expandedCampaignB, setExpandedCampaignB] = useState(false);
  
  const [campaignA, setCampaignA] = useState({
    budget: '',
    roas: '',
    cofinanziamento: ''
  });

  const [campaignB, setCampaignB] = useState({
    budget: '',
    roas: '',
    cofinanziamento: ''
  });

  const calculateResults = (campaign) => {
    const budget = parseFloat(campaign.budget) || 0;
    const roas = parseFloat(campaign.roas) || 0;
    const cofinanziamento = parseFloat(campaign.cofinanziamento) || 0;

    if (budget === 0) return null;

    const marginePercentuale = 1 - (foodCostPercentage / 100) - (platformFeesPercentage / 100);
    const roasBreakEven = marginePercentuale > 0 ? (1 - cofinanziamento / 100) / marginePercentuale : 0;
    const costoEffettivo = budget * (1 - cofinanziamento / 100);
    
    const budgetTotalePerEuroSpeso = 1 / (1 - cofinanziamento / 100);
    const revenuePerEuroSpeso = roas * budgetTotalePerEuroSpeso;
    const marginePerEuro = revenuePerEuroSpeso * marginePercentuale;
    const profittoPerEuro = marginePerEuro - 1;
    
    const revenue = budget * roas;
    const margine = revenue * marginePercentuale;
    const profittoTotale = profittoPerEuro * costoEffettivo;
    const roi = profittoPerEuro * 100;

    return {
      budget,
      roas,
      cofinanziamento,
      costoEffettivo,
      roasBreakEven,
      revenue,
      margine,
      profittoPerEuro,
      profittoTotale,
      roi,
      isProfit: roas >= roasBreakEven
    };
  };

  const resultsA = calculateResults(campaignA);
  const resultsB = calculateResults(campaignB);

  const renderCampaignForm = (campaign, setCampaign, label) => (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-slate-800">{label}</h3>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Budget Totale (€)</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={campaign.budget}
          onChange={(e) => setCampaign({ ...campaign, budget: e.target.value })}
          placeholder="es. 5000"
          className="w-full neumorphic-pressed px-4 py-2 rounded-lg"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">ROAS Atteso</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={campaign.roas}
          onChange={(e) => setCampaign({ ...campaign, roas: e.target.value })}
          placeholder="es. 3.5"
          className="w-full neumorphic-pressed px-4 py-2 rounded-lg"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Cofinanziamento (%)</label>
        <input
          type="number"
          min="0"
          max="100"
          step="1"
          value={campaign.cofinanziamento}
          onChange={(e) => setCampaign({ ...campaign, cofinanziamento: e.target.value })}
          placeholder="es. 50"
          className="w-full neumorphic-pressed px-4 py-2 rounded-lg"
        />
      </div>
    </div>
  );

  const renderResults = (results, label) => {
    if (!results) {
      return (
        <div className="text-center py-6 text-slate-500">
          <p className="text-sm">Inserisci i dati della campagna per vedere i risultati</p>
        </div>
      );
    }

    const foodCost = results.revenue * (foodCostPercentage / 100);
    const platformFees = results.revenue * (platformFeesPercentage / 100);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">{label}</h3>
          {results.isProfit ? (
            <span className="px-3 py-1 bg-green-500 text-white rounded-lg text-xs font-bold flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              PROFITTO
            </span>
          ) : (
            <span className="px-3 py-1 bg-red-500 text-white rounded-lg text-xs font-bold flex items-center gap-1">
              <TrendingDown className="w-3 h-3" />
              PERDITA
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="neumorphic-pressed p-2 rounded-lg">
            <p className="text-xs text-slate-500">Budget</p>
            <p className="font-bold text-slate-800">€{results.budget.toFixed(2)}</p>
          </div>
          <div className="neumorphic-pressed p-2 rounded-lg">
            <p className="text-xs text-slate-500">ROAS</p>
            <p className="font-bold text-blue-600">{results.roas.toFixed(2)}</p>
          </div>
          <div className="neumorphic-pressed p-2 rounded-lg">
            <p className="text-xs text-slate-500">Cofinanziamento</p>
            <p className="font-bold text-slate-800">{results.cofinanziamento}%</p>
          </div>
          <div className="neumorphic-pressed p-2 rounded-lg">
            <p className="text-xs text-slate-500">Break-Even ROAS</p>
            <p className="font-bold text-purple-600">{results.roasBreakEven.toFixed(2)}</p>
          </div>
        </div>

        <div className={`rounded-xl p-4 border-2 space-y-3 ${
          results.isProfit ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'
        }`}>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center pb-2 border-b border-slate-300">
              <span className="text-slate-700">Revenue Generato</span>
              <span className="font-bold text-slate-800">€{results.revenue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-red-600">
              <span>- Food Cost ({foodCostPercentage}%)</span>
              <span className="font-bold">-€{foodCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-red-600">
              <span>- Platform Fees ({platformFeesPercentage}%)</span>
              <span className="font-bold">-€{platformFees.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-red-600">
              <span>- Investimento Ads</span>
              <span className="font-bold">-€{results.costoEffettivo.toFixed(2)}</span>
            </div>
            <div className={`flex justify-between items-center pt-2 border-t-2 border-slate-300 text-lg ${
              results.isProfit ? 'text-green-600' : 'text-red-600'
            }`}>
              <span className="font-bold">= Profitto/Perdita</span>
              <span className="font-bold">{results.profittoTotale >= 0 ? '+' : ''}€{results.profittoTotale.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="pt-2 border-t border-slate-300">
            <p className="text-xs text-slate-600 mb-1">ROI: {results.profittoPerEuro >= 0 ? '+' : ''}{results.roi.toFixed(1)}%</p>
            <p className="text-xs text-slate-600">Profitto per €1 investito: {results.profittoPerEuro >= 0 ? '+' : ''}€{results.profittoPerEuro.toFixed(2)}</p>
          </div>
        </div>
      </div>
    );
  };

  const renderComparison = () => {
    if (!resultsA || !resultsB) return null;

    const diff = {
      revenue: resultsA.revenue - resultsB.revenue,
      profittoTotale: resultsA.profittoTotale - resultsB.profittoTotale,
      roi: resultsA.roi - resultsB.roi,
      costoEffettivo: resultsA.costoEffettivo - resultsB.costoEffettivo
    };

    return (
      <div className="mt-6 pt-6 border-t-2 border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Confronto Campagne</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="neumorphic-pressed p-4 rounded-xl">
            <p className="text-xs text-slate-500 mb-1">Differenza Revenue</p>
            <p className={`text-xl font-bold ${diff.revenue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {diff.revenue >= 0 ? '+' : ''}€{diff.revenue.toFixed(2)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {diff.revenue >= 0 ? 'A genera più revenue' : 'B genera più revenue'}
            </p>
          </div>
          <div className="neumorphic-pressed p-4 rounded-xl">
            <p className="text-xs text-slate-500 mb-1">Differenza Profitto</p>
            <p className={`text-xl font-bold ${diff.profittoTotale >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {diff.profittoTotale >= 0 ? '+' : ''}€{diff.profittoTotale.toFixed(2)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {diff.profittoTotale >= 0 ? 'A è più profittevole' : 'B è più profittevole'}
            </p>
          </div>
          <div className="neumorphic-pressed p-4 rounded-xl">
            <p className="text-xs text-slate-500 mb-1">Differenza ROI</p>
            <p className={`text-xl font-bold ${diff.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {diff.roi >= 0 ? '+' : ''}{diff.roi.toFixed(1)}%
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {diff.roi >= 0 ? 'A ha ROI migliore' : 'B ha ROI migliore'}
            </p>
          </div>
          <div className="neumorphic-pressed p-4 rounded-xl">
            <p className="text-xs text-slate-500 mb-1">Differenza Costo</p>
            <p className={`text-xl font-bold ${diff.costoEffettivo <= 0 ? 'text-green-600' : 'text-orange-600'}`}>
              {diff.costoEffettivo >= 0 ? '+' : ''}€{diff.costoEffettivo.toFixed(2)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {diff.costoEffettivo <= 0 ? 'B costa meno' : 'A costa meno'}
            </p>
          </div>
        </div>

        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-sm font-bold text-blue-800 mb-2">💡 Raccomandazione</p>
          <p className="text-sm text-blue-700">
            {diff.profittoTotale >= 0 
              ? `La Campagna A è migliore con un profitto superiore di €${Math.abs(diff.profittoTotale).toFixed(2)} e ROI del ${resultsA.roi.toFixed(1)}%`
              : `La Campagna B è migliore con un profitto superiore di €${Math.abs(diff.profittoTotale).toFixed(2)} e ROI del ${resultsB.roi.toFixed(1)}%`
            }
          </p>
        </div>
      </div>
    );
  };

  return (
    <>
      <NeumorphicCard className="p-4">
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between hover:bg-slate-50 p-2 rounded-lg transition-colors"
        >
          <div className="flex items-center gap-3">
            {isExpanded ? <ChevronDown className="w-5 h-5 text-blue-600" /> : <ChevronRight className="w-5 h-5 text-blue-600" />}
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-800">ROAS Calculator</h2>
          </div>
          {!isExpanded && <span className="text-xs text-slate-500">Clicca per espandere</span>}
        </button>
      </NeumorphicCard>

      {isExpanded && (
        <NeumorphicCard className="p-6 mt-4">
          <div className="space-y-4">
            {/* Campagna A */}
            <NeumorphicCard className="p-0">
              <button 
                onClick={() => setExpandedCampaignA(!expandedCampaignA)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {expandedCampaignA ? <ChevronDown className="w-5 h-5 text-blue-600" /> : <ChevronRight className="w-5 h-5 text-blue-600" />}
                  <h3 className="font-bold text-slate-800">Campagna A</h3>
                </div>
              </button>
              
              {expandedCampaignA && (
                <div className="border-t border-slate-200 p-5 space-y-6">
                  {renderCampaignForm(campaignA, setCampaignA, 'Campagna A')}
                  {resultsA && renderResults(resultsA, 'Risultati A')}
                </div>
              )}
            </NeumorphicCard>

            {/* Campagna B Toggle + Collapse */}
            <NeumorphicCard className="p-0">
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h3 className="font-bold text-slate-800">Campagna B</h3>
                <button
                  onClick={() => setShowCampaignB(!showCampaignB)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                    showCampaignB 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  {showCampaignB ? 'Attiva ✓' : 'Disattiva'}
                </button>
              </div>

              {showCampaignB && (
                <>
                  <button 
                    onClick={() => setExpandedCampaignB(!expandedCampaignB)}
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b border-slate-200"
                  >
                    <div className="flex items-center gap-3">
                      {expandedCampaignB ? <ChevronDown className="w-5 h-5 text-blue-600" /> : <ChevronRight className="w-5 h-5 text-blue-600" />}
                      <span className="text-sm text-slate-700">Visualizza dettagli</span>
                    </div>
                  </button>
                  
                  {expandedCampaignB && (
                    <div className="p-5 space-y-6">
                      {renderCampaignForm(campaignB, setCampaignB, 'Campagna B')}
                      {resultsB && renderResults(resultsB, 'Risultati B')}
                    </div>
                  )}
                </>
              )}
            </NeumorphicCard>
          </div>

          {/* Confronto */}
          {showCampaignB && resultsA && resultsB && renderComparison()}
        </NeumorphicCard>
      )}
    </>
  );
}