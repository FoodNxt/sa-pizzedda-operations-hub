import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChefHat,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Euro,
  TrendingDown,
  TrendingUp,
  Package,
  Search,
  CheckCircle // Added CheckCircle import
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";

export default function Ricette() {
  const [showForm, setShowForm] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    nome_prodotto: '',
    categoria: 'pizza',
    tipo_teglia: 'nessuna',
    is_semilavorato: false,
    ingredienti: [],
    prezzo_vendita_online: '',
    prezzo_vendita_offline: '',
    note: '',
    attivo: true
  });
  const [customNomeProdotto, setCustomNomeProdotto] = useState('');
  const [addingNewProduct, setAddingNewProduct] = useState(false);

  // NEW: Define valid product names (all columns except data_vendita)
  const VALID_PRODUCT_NAMES = [
    'Acqua Frizzante',
    'Acqua Naturale',
    'Baione Cannonau',
    'Bottarga',
    'Capperi, olive e acciughe',
    'Cipolle caramellate e Gorgonzola',
    'Coca Cola 33cl',
    'Coca Cola Zero 33cl',
    'Contissa Vermentino',
    'Estathe 33cl',
    'Fanta 33cl',
    'Fregola',
    'Friarielli e Olive',
    'Gorgonzola e Radicchio',
    'Guttiau 70gr',
    'Guttiau Snack',
    'Ichnusa Ambra Limpida',
    'Ichnusa Classica',
    'Ichnusa Non Filtrata',
    'Malloreddus',
    'Malloreddus 4 sapori',
    'Margherita',
    'Nduja e stracciatella',
    'Nutella',
    'Pabassinos Anice',
    'Pabassinos Noci',
    'Pane Carasau',
    'Pesca Gianduia',
    'Pistacchio',
    'Pomodori e stracciatella',
    'Salsiccia e Patate',
    'Salsiccia Sarda e Pecorino'
  ];

  // Ingredient form state
  const [selectedIngredient, setSelectedIngredient] = useState('');
  const [ingredientQuantity, setIngredientQuantity] = useState('');
  const [ingredientUnit, setIngredientUnit] = useState('g');

  const queryClient = useQueryClient();

  const { data: ricette = [], isLoading } = useQuery({
    queryKey: ['ricette'],
    queryFn: () => base44.entities.Ricetta.list(),
  });

  const { data: materiePrime = [] } = useQuery({
    queryKey: ['materie-prime'],
    queryFn: () => base44.entities.MateriePrime.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Ricetta.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ricette'] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Ricetta.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ricette'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Ricetta.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ricette'] });
    },
  });

  const resetForm = () => {
    setFormData({
      nome_prodotto: '',
      categoria: 'pizza',
      tipo_teglia: 'nessuna',
      is_semilavorato: false,
      ingredienti: [],
      prezzo_vendita_online: '',
      prezzo_vendita_offline: '',
      note: '',
      attivo: true
    });
    setSelectedIngredient('');
    setIngredientQuantity('');
    setIngredientUnit('g');
    setCustomNomeProdotto('');
    setAddingNewProduct(false);
    setEditingRecipe(null);
    setShowForm(false);
  };

  const handleEdit = (ricetta) => {
    setEditingRecipe(ricetta);
    setFormData({
      nome_prodotto: ricetta.nome_prodotto,
      categoria: ricetta.categoria || 'pizza',
      tipo_teglia: ricetta.tipo_teglia || 'nessuna',
      is_semilavorato: ricetta.is_semilavorato || false,
      ingredienti: ricetta.ingredienti || [],
      prezzo_vendita_online: ricetta.prezzo_vendita_online,
      prezzo_vendita_offline: ricetta.prezzo_vendita_offline,
      note: ricetta.note || '',
      attivo: ricetta.attivo !== false
    });
    setShowForm(true);
  };

  const addIngredient = () => {
    if (!selectedIngredient || !ingredientQuantity) {
      alert('Seleziona un ingrediente e inserisci la quantità');
      return;
    }

    let newIngredient;

    if (selectedIngredient.startsWith('mp_')) {
      // Materia Prima
      const id = selectedIngredient.replace('mp_', '');
      const materiaPrima = materiePrime.find(m => m.id === id);
      if (!materiaPrima) return;

      newIngredient = {
        materia_prima_id: materiaPrima.id,
        nome_prodotto: materiaPrima.nome_prodotto,
        quantita: parseFloat(ingredientQuantity),
        unita_misura: ingredientUnit,
        prezzo_unitario: materiaPrima.prezzo_unitario || 0,
        is_semilavorato: false
      };
    } else if (selectedIngredient.startsWith('sl_')) {
      // Semilavorato
      const id = selectedIngredient.replace('sl_', '');
      const semilavorato = ricette.find(r => r.id === id);
      if (!semilavorato) return;

      newIngredient = {
        materia_prima_id: semilavorato.id,
        nome_prodotto: semilavorato.nome_prodotto + ' (Semilavorato)',
        quantita: parseFloat(ingredientQuantity),
        unita_misura: ingredientUnit,
        prezzo_unitario: semilavorato.costo_unitario || 0,
        is_semilavorato: true
      };
    } else {
      return;
    }

    setFormData(prev => ({
      ...prev,
      ingredienti: [...prev.ingredienti, newIngredient]
    }));

    setSelectedIngredient('');
    setIngredientQuantity('');
    setIngredientUnit('g');
  };

  const removeIngredient = (index) => {
    setFormData(prev => ({
      ...prev,
      ingredienti: prev.ingredienti.filter((_, i) => i !== index)
    }));
  };

  const calculateCosts = () => {
    let totalCost = 0;

    formData.ingredienti.forEach(ing => {
      // Check if it's a semilavorato
      if (ing.is_semilavorato) {
        // For semilavorati, use the stored cost directly multiplied by quantity
        // Assuming quantity is in "pezzi" or "unità" for semilavorati
        totalCost += ing.quantita * (ing.prezzo_unitario || 0);
        return;
      }

      const materiaPrima = materiePrime.find(m => m.id === ing.materia_prima_id);
      if (!materiaPrima || !materiaPrima.prezzo_unitario) return;

      // Calculate base unit price
      let pricePerBaseUnit = materiaPrima.prezzo_unitario;
      
      // If the product has peso_dimensione_unita, we need to calculate the price per base unit
      // Example: Sacco da 25kg costs €10 -> €10/25kg = €0.4 per kg
      if (materiaPrima.peso_dimensione_unita && materiaPrima.unita_misura_peso) {
        pricePerBaseUnit = materiaPrima.prezzo_unitario / materiaPrima.peso_dimensione_unita;
      }

      // Convert recipe quantity to base unit
      let quantityInBaseUnit = ing.quantita;
      
      // If product has peso_dimensione_unita, convert recipe quantity to that base unit
      if (materiaPrima.peso_dimensione_unita && materiaPrima.unita_misura_peso) {
        const baseUnit = materiaPrima.unita_misura_peso;
        
        // Convert recipe quantity to base unit
        if (ing.unita_misura === 'g' && baseUnit === 'kg') {
          quantityInBaseUnit = ing.quantita / 1000;
        } else if (ing.unita_misura === 'kg' && baseUnit === 'kg') {
          quantityInBaseUnit = ing.quantita;
        } else if (ing.unita_misura === 'ml' && baseUnit === 'litri') {
          quantityInBaseUnit = ing.quantita / 1000;
        } else if (ing.unita_misura === 'litri' && baseUnit === 'litri') {
          quantityInBaseUnit = ing.quantita;
        } else if (ing.unita_misura === 'g' && baseUnit === 'g') {
          quantityInBaseUnit = ing.quantita;
        } else if (ing.unita_misura === 'ml' && baseUnit === 'ml') {
          quantityInBaseUnit = ing.quantita;
        } else {
          // If units don't match, use quantity as is (e.g., pezzi)
          quantityInBaseUnit = ing.quantita;
        }
      } else {
        // No peso_dimensione_unita, so prezzo_unitario is already per unita_misura
        // Convert if needed
        if (ing.unita_misura === 'g' && materiaPrima.unita_misura === 'kg') {
          quantityInBaseUnit = ing.quantita / 1000;
        } else if (ing.unita_misura === 'ml' && materiaPrima.unita_misura === 'litri') {
          quantityInBaseUnit = ing.quantita / 1000;
        } else if (ing.unita_misura === materiaPrima.unita_misura) {
          quantityInBaseUnit = ing.quantita;
        } else {
          // Units don't match, use as is
          quantityInBaseUnit = ing.quantita;
        }
      }

      totalCost += quantityInBaseUnit * pricePerBaseUnit;
    });

    return totalCost;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.ingredienti.length === 0) {
      alert('Aggiungi almeno un ingrediente alla ricetta');
      return;
    }
    
    let nomeProdotto = formData.nome_prodotto;
    
    // If custom product name, add to ProdottiVenduti
    if (!formData.is_semilavorato && addingNewProduct && customNomeProdotto.trim()) {
      nomeProdotto = customNomeProdotto.trim();
      
      // Check if already exists in ProdottiVenduti
      const esistente = await base44.entities.ProdottiVenduti.filter({ nome_prodotto: nomeProdotto });
      
      if (esistente.length === 0) {
        // Add to ProdottiVenduti
        await base44.entities.ProdottiVenduti.create({
          nome_prodotto: nomeProdotto,
          categoria: formData.categoria,
          attivo: true
        });
        queryClient.invalidateQueries({ queryKey: ['prodotti-venduti'] });
      }
    }
    
    if (!formData.is_semilavorato && !nomeProdotto) {
      alert('Seleziona o inserisci un nome prodotto');
      return;
    }

    const costoUnitario = calculateCosts();
    
    // If semilavorato, set prices to 0
    const prezzoOnline = formData.is_semilavorato ? 0 : parseFloat(formData.prezzo_vendita_online);
    const prezzoOffline = formData.is_semilavorato ? 0 : parseFloat(formData.prezzo_vendita_offline);

    const data = {
      ...formData,
      nome_prodotto: nomeProdotto,
      prezzo_vendita_online: prezzoOnline,
      prezzo_vendita_offline: prezzoOffline,
      costo_unitario: costoUnitario,
      food_cost_online: prezzoOnline > 0 ? (costoUnitario / prezzoOnline) * 100 : 0,
      food_cost_offline: prezzoOffline > 0 ? (costoUnitario / prezzoOffline) * 100 : 0,
      margine_online: prezzoOnline - costoUnitario,
      margine_offline: prezzoOffline - costoUnitario
    };

    if (editingRecipe) {
      updateMutation.mutate({ id: editingRecipe.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id) => {
    if (confirm('Sei sicuro di voler eliminare questa ricetta?')) {
      deleteMutation.mutate(id);
    }
  };

  const filteredRicette = ricette.filter(r =>
    r.nome_prodotto?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Separate semilavorati and prodotti finiti
  const semilavorati = filteredRicette.filter(r => r.is_semilavorato);
  const prodottiFiniti = filteredRicette.filter(r => !r.is_semilavorato);

  const getCostoPreview = () => calculateCosts();

  return (
    <div className="max-w-7xl mx-auto space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="mb-4 lg:mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent mb-1">
              Ricette
            </h1>
            <p className="text-sm text-slate-500">Gestisci ricette, ingredienti e calcola il food cost</p>
          </div>
          <NeumorphicButton
            onClick={() => setShowForm(true)}
            variant="primary"
            className="flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Nuova</span>
          </NeumorphicButton>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
        <NeumorphicCard className="p-4">
          <div className="text-center">
            <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 mx-auto mb-2 lg:mb-3 flex items-center justify-center shadow-lg">
              <ChefHat className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
            </div>
            <h3 className="text-xl lg:text-2xl font-bold text-slate-800 mb-1">{ricette.length}</h3>
            <p className="text-xs text-slate-500">Ricette</p>
          </div>
        </NeumorphicCard>

        <NeumorphicCard className="p-4">
          <div className="text-center">
            <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 mx-auto mb-2 lg:mb-3 flex items-center justify-center shadow-lg">
              <TrendingDown className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
            </div>
            <h3 className="text-xl lg:text-2xl font-bold text-green-600 mb-1">
              {ricette.filter(r => r.food_cost_online < 30).length}
            </h3>
            <p className="text-xs text-slate-500">FC Ottimale</p>
          </div>
        </NeumorphicCard>

        <NeumorphicCard className="p-4">
          <div className="text-center">
            <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 mx-auto mb-2 lg:mb-3 flex items-center justify-center shadow-lg">
              <Package className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
            </div>
            <h3 className="text-xl lg:text-2xl font-bold text-purple-600 mb-1">
              {ricette.filter(r => r.attivo !== false).length}
            </h3>
            <p className="text-xs text-slate-500">Attive</p>
          </div>
        </NeumorphicCard>
      </div>

      {/* Search */}
      <NeumorphicCard className="p-4">
        <div className="flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Cerca ricetta..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm"
          />
        </div>
      </NeumorphicCard>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <NeumorphicCard className="p-6 my-8">
              <div className="flex items-center justify-between mb-6 sticky top-0 bg-[#e0e5ec] z-10 pb-4">
                <h2 className="text-2xl font-bold text-[#6b6b6b]">
                  {editingRecipe ? 'Modifica Ricetta' : 'Nuova Ricetta'}
                </h2>
                <button
                  onClick={resetForm}
                  className="neumorphic-flat p-2 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <X className="w-5 h-5 text-[#9b9b9b]" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                      Nome Prodotto <span className="text-red-600">*</span>
                    </label>
                    {formData.is_semilavorato ? (
                      <input
                        type="text"
                        value={formData.nome_prodotto}
                        onChange={(e) => setFormData({ ...formData, nome_prodotto: e.target.value })}
                        placeholder="es. Impasto Base"
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                        required
                      />
                    ) : addingNewProduct ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={customNomeProdotto}
                          onChange={(e) => setCustomNomeProdotto(e.target.value)}
                          placeholder="Inserisci nuovo nome prodotto..."
                          className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setAddingNewProduct(false);
                            setCustomNomeProdotto('');
                          }}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          ← Torna alla lista prodotti
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <select
                          value={formData.nome_prodotto}
                          onChange={(e) => setFormData({ ...formData, nome_prodotto: e.target.value })}
                          className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                          required={!addingNewProduct}
                        >
                          <option value="">Seleziona prodotto...</option>
                          {VALID_PRODUCT_NAMES.map(name => (
                            <option key={name} value={name}>{name}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setAddingNewProduct(true)}
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          Aggiungi nuovo prodotto alla lista
                        </button>
                      </div>
                    )}
                    {formData.is_semilavorato && (
                      <p className="text-xs text-blue-600 mt-1">
                        ℹ️ Semilavorato: puoi inserire un nome libero
                      </p>
                    )}
                    {!formData.is_semilavorato && !addingNewProduct && (
                      <p className="text-xs text-[#9b9b9b] mt-1">
                        ℹ️ Seleziona dalla lista o aggiungi un nuovo prodotto
                      </p>
                    )}
                    {addingNewProduct && (
                      <p className="text-xs text-green-600 mt-1">
                        ✓ Il nuovo prodotto verrà aggiunto automaticamente alla lista Prodotti Venduti
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                        Categoria
                      </label>
                      <select
                        value={formData.categoria}
                        onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                      >
                        <option value="pizza">Pizza</option>
                        <option value="dolce">Dolce</option>
                        <option value="bevanda">Bevanda</option>
                        <option value="altro">Altro</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                        Tipo Teglia
                      </label>
                      <select
                        value={formData.tipo_teglia}
                        onChange={(e) => setFormData({ ...formData, tipo_teglia: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                      >
                        <option value="nessuna">Nessuna</option>
                        <option value="rossa">🔴 Teglia Rossa</option>
                        <option value="bianca">⚪ Teglia Bianca</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* NEW: Semilavorato Checkbox */}
                <div className="neumorphic-flat p-4 rounded-xl">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_semilavorato}
                      onChange={(e) => {
                        setFormData({ 
                          ...formData, 
                          is_semilavorato: e.target.checked,
                          // Reset nome_prodotto if changing type
                          nome_prodotto: e.target.checked ? '' : '' 
                        });
                      }}
                      className="w-5 h-5 rounded"
                    />
                    <div>
                      <span className="text-sm font-medium text-[#6b6b6b]">
                        Semilavorato
                      </span>
                      <p className="text-xs text-[#9b9b9b]">
                        Spunta se questo prodotto è un semilavorato che può essere usato come ingrediente in altre ricette
                      </p>
                    </div>
                  </label>
                  {formData.is_semilavorato && (
                    <p className="text-xs text-green-600 mt-2">
                      ✓ Questo prodotto sarà disponibile come ingrediente nella creazione di altre ricette
                    </p>
                  )}
                </div>

                {/* Ingredienti Section */}
                <div className="neumorphic-flat p-6 rounded-xl">
                  <h3 className="text-lg font-bold text-[#6b6b6b] mb-4">Ingredienti</h3>
                  
                  {/* Add Ingredient Form */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                        Ingrediente
                      </label>
                      <select
                        value={selectedIngredient}
                        onChange={(e) => setSelectedIngredient(e.target.value)}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                      >
                        <option value="">Seleziona ingrediente...</option>
                        <optgroup label="📦 Materie Prime">
                          {materiePrime
                            .filter(m => m.attivo !== false && m.prezzo_unitario)
                            .map(mp => (
                              <option key={mp.id} value={`mp_${mp.id}`}>
                                {mp.nome_prodotto} - €{mp.prezzo_unitario?.toFixed(2)}/{mp.unita_misura}
                                {mp.peso_dimensione_unita ? ` (${mp.peso_dimensione_unita}${mp.unita_misura_peso})` : ''}
                              </option>
                            ))}
                        </optgroup>
                        <optgroup label="🍳 Semilavorati">
                          {ricette
                            .filter(r => r.is_semilavorato && r.attivo !== false && r.costo_unitario)
                            .map(sl => (
                              <option key={sl.id} value={`sl_${sl.id}`}>
                                {sl.nome_prodotto} (Semilavorato) - €{sl.costo_unitario?.toFixed(2)}
                              </option>
                            ))}
                        </optgroup>
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                        Quantità
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={ingredientQuantity}
                        onChange={(e) => setIngredientQuantity(e.target.value)}
                        placeholder="0"
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                        Unità
                      </label>
                      <select
                        value={ingredientUnit}
                        onChange={(e) => setIngredientUnit(e.target.value)}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                      >
                        <option value="g">Grammi (g)</option>
                        <option value="kg">Kg</option>
                        <option value="ml">Millilitri (ml)</option>
                        <option value="litri">Litri</option>
                        <option value="pezzi">Pezzi</option>
                      </select>
                    </div>
                  </div>

                  <NeumorphicButton
                    type="button"
                    onClick={addIngredient}
                    className="mb-4"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Aggiungi Ingrediente
                  </NeumorphicButton>

                  {/* Ingredients List */}
                  {formData.ingredienti.length > 0 && (
                    <div className="space-y-2">
                      {formData.ingredienti.map((ing, index) => (
                        <div key={index} className="neumorphic-pressed p-4 rounded-lg flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-[#6b6b6b]">{ing.nome_prodotto}</p>
                            <p className="text-sm text-[#9b9b9b]">
                              {ing.quantita} {ing.unita_misura} - €{ing.prezzo_unitario?.toFixed(2)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeIngredient(index)}
                            className="neumorphic-flat p-2 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Prezzi Section - Only show if not semilavorato */}
                {!formData.is_semilavorato && (
                  <div className="neumorphic-flat p-6 rounded-xl">
                    <h3 className="text-lg font-bold text-[#6b6b6b] mb-4">Prezzi di Vendita</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-[#6b6b6b] mb-2 block flex items-center gap-2">
                          <Euro className="w-4 h-4" />
                          Prezzo Online <span className="text-red-600">*</span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.prezzo_vendita_online}
                          onChange={(e) => setFormData({ ...formData, prezzo_vendita_online: e.target.value })}
                          placeholder="0.00"
                          className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-[#6b6b6b] mb-2 block flex items-center gap-2">
                          <Euro className="w-4 h-4" />
                          Prezzo Offline <span className="text-red-600">*</span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.prezzo_vendita_offline}
                          onChange={(e) => setFormData({ ...formData, prezzo_vendita_offline: e.target.value })}
                          placeholder="0.00"
                          className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Costi Preview - Only show if not semilavorato */}
                {!formData.is_semilavorato && formData.ingredienti.length > 0 && formData.prezzo_vendita_online && formData.prezzo_vendita_offline && (
                  <div className="neumorphic-flat p-6 rounded-xl bg-blue-50">
                    <h3 className="text-lg font-bold text-blue-800 mb-4">📊 Analisi Costi</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="neumorphic-pressed p-4 rounded-lg text-center">
                        <p className="text-sm text-[#9b9b9b] mb-1">Costo Unitario</p>
                        <p className="text-2xl font-bold text-[#8b7355]">
                          €{getCostoPreview().toFixed(2)}
                        </p>
                      </div>

                      <div className="neumorphic-pressed p-4 rounded-lg text-center">
                        <p className="text-sm text-[#9b9b9b] mb-1">Margine Online</p>
                        <p className="text-2xl font-bold text-green-600">
                          €{(parseFloat(formData.prezzo_vendita_online) - getCostoPreview()).toFixed(2)}
                        </p>
                      </div>

                      <div className="neumorphic-pressed p-4 rounded-lg text-center">
                        <p className="text-sm text-[#9b9b9b] mb-1">Margine Offline</p>
                        <p className="text-2xl font-bold text-green-600">
                          €{(parseFloat(formData.prezzo_vendita_offline) - getCostoPreview()).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="neumorphic-pressed p-4 rounded-lg">
                        <p className="text-sm text-[#9b9b9b] mb-2">Food Cost Online</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 neumorphic-pressed rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                (getCostoPreview() / parseFloat(formData.prezzo_vendita_online)) * 100 < 30 
                                  ? 'bg-green-600' 
                                  : (getCostoPreview() / parseFloat(formData.prezzo_vendita_online)) * 100 < 40
                                  ? 'bg-yellow-600'
                                  : 'bg-red-600'
                              }`}
                              style={{ width: `${Math.min((getCostoPreview() / parseFloat(formData.prezzo_vendita_online)) * 100, 100)}%` }}
                            />
                          </div>
                          <span className="font-bold text-[#6b6b6b] min-w-[60px]">
                            {((getCostoPreview() / parseFloat(formData.prezzo_vendita_online)) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      <div className="neumorphic-pressed p-4 rounded-lg">
                        <p className="text-sm text-[#9b9b9b] mb-2">Food Cost Offline</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 neumorphic-pressed rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                (getCostoPreview() / parseFloat(formData.prezzo_vendita_offline)) * 100 < 30 
                                  ? 'bg-green-600' 
                                  : (getCostoPreview() / parseFloat(formData.prezzo_vendita_offline)) * 100 < 40
                                  ? 'bg-yellow-600'
                                  : 'bg-red-600'
                              }`}
                              style={{ width: `${Math.min((getCostoPreview() / parseFloat(formData.prezzo_vendita_offline)) * 100, 100)}%` }}
                            />
                          </div>
                          <span className="font-bold text-[#6b6b6b] min-w-[60px]">
                            {((getCostoPreview() / parseFloat(formData.prezzo_vendita_offline)) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-blue-700 mt-4">
                      💡 Food Cost ottimale: &lt;30% | Accettabile: 30-40% | Alto: &gt;40%
                    </p>
                  </div>
                )}

                {/* Note */}
                <div>
                  <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                    Note
                  </label>
                  <textarea
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    placeholder="Note sulla ricetta..."
                    rows={3}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none resize-none"
                  />
                </div>

                {/* Active */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="attivo"
                    checked={formData.attivo}
                    onChange={(e) => setFormData({ ...formData, attivo: e.target.checked })}
                    className="w-5 h-5 rounded"
                  />
                  <label htmlFor="attivo" className="text-sm font-medium text-[#6b6b6b]">
                    Ricetta attiva nel menu
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-[#c1c1c1]">
                  <NeumorphicButton
                    type="button"
                    onClick={resetForm}
                    className="flex-1"
                  >
                    Annulla
                  </NeumorphicButton>
                  <NeumorphicButton
                    type="submit"
                    variant="primary"
                    className="flex-1 flex items-center justify-center gap-2"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    <Save className="w-5 h-5" />
                    {editingRecipe ? 'Aggiorna' : 'Salva Ricetta'}
                  </NeumorphicButton>
                </div>
              </form>
            </NeumorphicCard>
          </div>
        </div>
      )}

      {/* Ricette List */}
      {isLoading ? (
        <NeumorphicCard className="p-12 text-center">
          <p className="text-slate-500">Caricamento...</p>
        </NeumorphicCard>
      ) : filteredRicette.length === 0 ? (
        <NeumorphicCard className="p-12 text-center">
          <ChefHat className="w-16 h-16 text-slate-300 mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-bold text-slate-800 mb-2">
            {searchTerm ? 'Nessuna ricetta trovata' : 'Nessuna ricetta'}
          </h3>
        </NeumorphicCard>
      ) : (
        <>
          {/* Semilavorati */}
          {semilavorati.length > 0 && (
            <NeumorphicCard className="p-4 lg:p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                🍳 Semilavorati
                <span className="text-sm font-normal text-slate-500">({semilavorati.length})</span>
              </h2>

              <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="border-b-2 border-purple-600">
                      <th className="text-left p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Prodotto</th>
                      <th className="text-right p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Costo</th>
                      <th className="text-center p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Ing</th>
                      <th className="text-center p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Stato</th>
                      <th className="text-center p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {semilavorati.map((ricetta) => (
                      <tr key={ricetta.id} className="border-b border-slate-200 hover:bg-purple-50 transition-colors">
                        <td className="p-2 lg:p-3">
                          <div>
                            <p className="font-medium text-slate-800 text-sm">{ricetta.nome_prodotto}</p>
                            <p className="text-xs text-purple-600">{ricetta.categoria}</p>
                          </div>
                        </td>
                        <td className="p-2 lg:p-3 text-right font-bold text-purple-600 text-sm">
                          €{ricetta.costo_unitario?.toFixed(2)}
                        </td>
                        <td className="p-2 lg:p-3 text-center text-slate-700 text-sm">
                          {ricetta.ingredienti?.length || 0}
                        </td>
                        <td className="p-2 lg:p-3">
                          <div className="flex justify-center">
                            {ricetta.attivo !== false ? (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : (
                              <X className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                        </td>
                        <td className="p-2 lg:p-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEdit(ricetta)}
                              className="nav-button p-2 rounded-lg hover:bg-blue-50 transition-colors"
                            >
                              <Edit className="w-4 h-4 text-blue-600" />
                            </button>
                            <button
                              onClick={() => handleDelete(ricetta.id)}
                              className="nav-button p-2 rounded-lg hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </NeumorphicCard>
          )}

          {/* Prodotti Finiti */}
          {prodottiFiniti.length > 0 && (
            <NeumorphicCard className="p-4 lg:p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                🍕 Prodotti Finiti
                <span className="text-sm font-normal text-slate-500">({prodottiFiniti.length})</span>
              </h2>

              <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="border-b-2 border-blue-600">
                      <th className="text-left p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Prodotto</th>
                      <th className="text-right p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Costo</th>
                      <th className="text-right p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">P. Online</th>
                      <th className="text-right p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">P. Offline</th>
                      <th className="text-center p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">FC Online</th>
                      <th className="text-center p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">FC Offline</th>
                      <th className="text-center p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Ing</th>
                      <th className="text-center p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Stato</th>
                      <th className="text-center p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prodottiFiniti.map((ricetta) => (
                      <tr key={ricetta.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                        <td className="p-2 lg:p-3">
                          <div>
                            <p className="font-medium text-slate-800 text-sm">{ricetta.nome_prodotto}</p>
                            <p className="text-xs text-slate-500">{ricetta.categoria}</p>
                          </div>
                        </td>
                        <td className="p-2 lg:p-3 text-right font-bold text-blue-600 text-sm">
                          €{ricetta.costo_unitario?.toFixed(2)}
                        </td>
                        <td className="p-2 lg:p-3 text-right text-slate-700 text-sm">
                          €{ricetta.prezzo_vendita_online?.toFixed(2)}
                          <span className="block text-xs text-green-600">
                            +€{ricetta.margine_online?.toFixed(2)}
                          </span>
                        </td>
                        <td className="p-2 lg:p-3 text-right text-slate-700 text-sm">
                          €{ricetta.prezzo_vendita_offline?.toFixed(2)}
                          <span className="block text-xs text-green-600">
                            +€{ricetta.margine_offline?.toFixed(2)}
                          </span>
                        </td>
                        <td className="p-2 lg:p-3">
                          <div className="flex justify-center">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                              ricetta.food_cost_online < 30 
                                ? 'bg-green-100 text-green-700' 
                                : ricetta.food_cost_online < 40
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {ricetta.food_cost_online?.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="p-2 lg:p-3">
                          <div className="flex justify-center">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                              ricetta.food_cost_offline < 30 
                                ? 'bg-green-100 text-green-700' 
                                : ricetta.food_cost_offline < 40
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {ricetta.food_cost_offline?.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="p-2 lg:p-3 text-center text-slate-700 text-sm">
                          {ricetta.ingredienti?.length || 0}
                        </td>
                        <td className="p-2 lg:p-3">
                          <div className="flex justify-center">
                            {ricetta.attivo !== false ? (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : (
                              <X className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                        </td>
                        <td className="p-2 lg:p-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEdit(ricetta)}
                              className="nav-button p-2 rounded-lg hover:bg-blue-50 transition-colors"
                            >
                              <Edit className="w-4 h-4 text-blue-600" />
                            </button>
                            <button
                              onClick={() => handleDelete(ricetta.id)}
                              className="nav-button p-2 rounded-lg hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </NeumorphicCard>
          )}
        </>
      )}
    </div>
  );
}