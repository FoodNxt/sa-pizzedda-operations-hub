
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
  Search
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
    is_semilavorato: false, // NEW
    ingredienti: [],
    prezzo_vendita_online: '',
    prezzo_vendita_offline: '',
    note: '',
    attivo: true
  });

  // Ingredient form state
  const [selectedIngredient, setSelectedIngredient] = useState('');
  const [ingredientQuantity, setIngredientQuantity] = useState('');
  const [ingredientUnit, setIngredientUnit] = useState('g');
  const [ingredientUnitOptions, setIngredientUnitOptions] = useState([
    { value: 'g', label: 'Grammi (g)' },
    { value: 'kg', label: 'Kg' },
    { value: 'ml', label: 'Millilitri (ml)' },
    { value: 'litri', label: 'Litri' },
    { value: 'pezzi', label: 'Pezzi' },
  ]);

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
      is_semilavorato: false, // NEW
      ingredienti: [],
      prezzo_vendita_online: '',
      prezzo_vendita_offline: '',
      note: '',
      attivo: true
    });
    setSelectedIngredient('');
    setIngredientQuantity('');
    setIngredientUnit('g');
    setIngredientUnitOptions([
      { value: 'g', label: 'Grammi (g)' },
      { value: 'kg', label: 'Kg' },
      { value: 'ml', label: 'Millilitri (ml)' },
      { value: 'litri', label: 'Litri' },
      { value: 'pezzi', label: 'Pezzi' },
    ]);
    setEditingRecipe(null);
    setShowForm(false);
  };

  const handleEdit = (ricetta) => {
    setEditingRecipe(ricetta);
    setFormData({
      nome_prodotto: ricetta.nome_prodotto,
      categoria: ricetta.categoria || 'pizza',
      is_semilavorato: ricetta.is_semilavorato || false, // NEW
      ingredienti: ricetta.ingredienti || [],
      prezzo_vendita_online: ricetta.prezzo_vendita_online,
      prezzo_vendita_offline: ricetta.prezzo_vendita_offline,
      note: ricetta.note || '',
      attivo: ricetta.attivo !== false
    });
    setShowForm(true);
  };

  const handleSelectedIngredientChange = (e) => {
    const value = e.target.value;
    setSelectedIngredient(value);

    if (value.startsWith('ricetta-')) {
      // If a semilavorato is selected, restrict unit to 'pezzi'
      setIngredientUnit('pezzi');
      setIngredientUnitOptions([{ value: 'pezzi', label: 'Pezzi' }]);
    } else {
      // For materie prime or empty selection, restore full unit options
      setIngredientUnit('g'); // default unit
      setIngredientUnitOptions([
        { value: 'g', label: 'Grammi (g)' },
        { value: 'kg', label: 'Kg' },
        { value: 'ml', label: 'Millilitri (ml)' },
        { value: 'litri', label: 'Litri' },
        { value: 'pezzi', label: 'Pezzi' },
      ]);
    }
  };

  const addIngredient = () => {
    if (!selectedIngredient || !ingredientQuantity) {
      alert('Seleziona un ingrediente e inserisci la quantità');
      return;
    }

    const [type, id] = selectedIngredient.split('-');
    let newIngredient = {};

    if (type === 'mp') {
      const materiaPrima = materiePrime.find(m => m.id === id);
      if (!materiaPrima) return;
      newIngredient = {
        tipo_ingrediente: 'materia_prima',
        materia_prima_id: materiaPrima.id,
        nome_prodotto: materiaPrima.nome_prodotto,
        quantita: parseFloat(ingredientQuantity),
        unita_misura: ingredientUnit,
        prezzo_unitario: materiaPrima.prezzo_unitario || 0, // Base price of the MP
      };
    } else if (type === 'ricetta') {
      const semilavorato = ricette.find(r => r.id === id);
      if (!semilavorato) return;

      // For semilavorati, ingredientUnit is always 'pezzi' due to UI restriction.
      newIngredient = {
        tipo_ingrediente: 'semilavorato',
        ricetta_id: semilavorato.id,
        nome_prodotto: semilavorato.nome_prodotto,
        quantita: parseFloat(ingredientQuantity),
        unita_misura: 'pezzi', // Enforced to 'pezzi' for semilavorati
        prezzo_unitario: semilavorato.costo_unitario || 0, // Cost of one 'piece' of the semilavorato
      };
    } else {
      return; // Invalid selection
    }

    setFormData(prev => ({
      ...prev,
      ingredienti: [...prev.ingredienti, newIngredient]
    }));

    setSelectedIngredient('');
    setIngredientQuantity('');
    setIngredientUnit('g'); // Reset to default after adding
    setIngredientUnitOptions([ // Reset unit options
      { value: 'g', label: 'Grammi (g)' },
      { value: 'kg', label: 'Kg' },
      { value: 'ml', label: 'Millilitri (ml)' },
      { value: 'litri', label: 'Litri' },
      { value: 'pezzi', label: 'Pezzi' },
    ]);
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
      let ingredientCost = 0;

      if (ing.tipo_ingrediente === 'materia_prima') {
        const materiaPrima = materiePrime.find(m => m.id === ing.materia_prima_id);
        if (!materiaPrima || typeof materiaPrima.prezzo_unitario === 'undefined') return;

        // Calculate price per base unit of the raw material (e.g., price per kg if sold in a 25kg bag)
        let pricePerBaseUnit = materiaPrima.prezzo_unitario;
        const baseUnitOfRawMaterial = materiaPrima.unita_misura; // Unit corresponding to materiaPrima.prezzo_unitario
        let actualBaseUnitForConversion = baseUnitOfRawMaterial; // The unit that pricePerBaseUnit refers to

        if (materiaPrima.peso_dimensione_unita && materiaPrima.unita_misura_peso) {
          pricePerBaseUnit = materiaPrima.prezzo_unitario / materiaPrima.peso_dimensione_unita;
          actualBaseUnitForConversion = materiaPrima.unita_misura_peso; // e.g., 'kg' if 25kg bag
        }

        // Convert the recipe's ingredient quantity to the actualBaseUnitForConversion
        let quantityInActualBaseUnit = ing.quantita;

        if (ing.unita_misura === 'g' && actualBaseUnitForConversion === 'kg') {
          quantityInActualBaseUnit = ing.quantita / 1000;
        } else if (ing.unita_misura === 'kg' && actualBaseUnitForConversion === 'g') {
          quantityInActualBaseUnit = ing.quantita * 1000;
        } else if (ing.unita_misura === 'ml' && actualBaseUnitForConversion === 'litri') {
          quantityInActualBaseUnit = ing.quantita / 1000;
        } else if (ing.unita_misura === 'litri' && actualBaseUnitForConversion === 'ml') {
          quantityInActualBaseUnit = ing.quantita * 1000;
        } else if (ing.unita_misura === actualBaseUnitForConversion) {
          quantityInActualBaseUnit = ing.quantita;
        } else if (ing.unita_misura === 'pezzi' && actualBaseUnitForConversion === 'pezzi') {
          quantityInActualBaseUnit = ing.quantita;
        } else {
          // Fallback for incompatible units (e.g., using 'g' for a 'pezzi' priced item)
          // This scenario should ideally be prevented or warned about.
          // For now, treat it as direct usage, but this might be inaccurate.
          console.warn(`Unit mismatch for Materia Prima ${ing.nome_prodotto}: ingredient uses ${ing.unita_misura}, raw material priced per ${actualBaseUnitForConversion}. Assuming direct quantity use.`);
          quantityInActualBaseUnit = ing.quantita;
        }
        ingredientCost = quantityInActualBaseUnit * pricePerBaseUnit;

      } else if (ing.tipo_ingrediente === 'semilavorato') {
        const semilavorato = ricette.find(r => r.id === ing.ricetta_id);
        if (!semilavorato || typeof semilavorato.costo_unitario === 'undefined') return;

        // For semilavorati, we assume costo_unitario is the cost of ONE piece/unit of the semilavorato.
        // The `unita_misura` for semilavorati is enforced to 'pezzi' in `addIngredient` through UI restriction.
        // So we can directly multiply quantity by the semilavorato's cost_unitario.
        ingredientCost = ing.quantita * semilavorato.costo_unitario;
      }
      totalCost += ingredientCost;
    });

    return totalCost;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (formData.ingredienti.length === 0) {
      alert('Aggiungi almeno un ingrediente alla ricetta');
      return;
    }

    const costoUnitario = calculateCosts();
    const prezzoOnline = parseFloat(formData.prezzo_vendita_online);
    const prezzoOffline = parseFloat(formData.prezzo_vendita_offline);

    const data = {
      ...formData,
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

  const getCostoPreview = () => calculateCosts();

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <ChefHat className="w-10 h-10 text-[#8b7355]" />
              <h1 className="text-3xl font-bold text-[#6b6b6b]">Ricette</h1>
            </div>
            <p className="text-[#9b9b9b]">Gestisci ricette, ingredienti e calcola il food cost</p>
          </div>
          <NeumorphicButton
            onClick={() => setShowForm(true)}
            variant="primary"
            className="flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nuova Ricetta
          </NeumorphicButton>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <ChefHat className="w-8 h-8 text-[#8b7355]" />
          </div>
          <h3 className="text-3xl font-bold text-[#6b6b6b] mb-1">{ricette.length}</h3>
          <p className="text-sm text-[#9b9b9b]">Ricette Totali</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <TrendingDown className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-3xl font-bold text-green-600 mb-1">
            {ricette.filter(r => r.food_cost_online < 30).length}
          </h3>
          <p className="text-sm text-[#9b9b9b]">Food Cost Ottimale (&lt;30%)</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Package className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-3xl font-bold text-blue-600 mb-1">
            {ricette.filter(r => r.attivo !== false).length}
          </h3>
          <p className="text-sm text-[#9b9b9b]">Ricette Attive</p>
        </NeumorphicCard>
      </div>

      {/* Search */}
      <NeumorphicCard className="p-4">
        <div className="flex items-center gap-3">
          <Search className="w-5 h-5 text-[#9b9b9b]" />
          <input
            type="text"
            placeholder="Cerca ricetta..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                      Nome Prodotto <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.nome_prodotto}
                      onChange={(e) => setFormData({ ...formData, nome_prodotto: e.target.value })}
                      placeholder="es. Pizza Margherita"
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                      required
                    />
                  </div>

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
                </div>

                {/* NEW: Semilavorato Checkbox */}
                <div className="neumorphic-flat p-4 rounded-xl">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_semilavorato}
                      onChange={(e) => setFormData({ ...formData, is_semilavorato: e.target.checked })}
                      className="w-5 h-5 rounded"
                    />
                    <div>
                      <span className="font-medium text-[#6b6b6b]">Semilavorato</span>
                      <p className="text-xs text-[#9b9b9b]">
                        Spunta se questo prodotto è un semilavorato che può essere usato come ingrediente di altre ricette
                      </p>
                    </div>
                  </label>
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
                        onChange={handleSelectedIngredientChange}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                      >
                        <option value="">Seleziona ingrediente...</option>
                        <optgroup label="Materie Prime">
                          {materiePrime
                            .filter(m => m.attivo !== false && m.prezzo_unitario)
                            .map(mp => (
                              <option key={`mp-${mp.id}`} value={`mp-${mp.id}`}>
                                {mp.nome_prodotto} - €{mp.prezzo_unitario?.toFixed(2)}/{mp.unita_misura}
                                {mp.peso_dimensione_unita ? ` (${mp.peso_dimensione_unita}${mp.unita_misura_peso})` : ''}
                              </option>
                            ))}
                        </optgroup>
                        <optgroup label="Semilavorati">
                          {ricette
                            .filter(r => r.is_semilavorato && r.attivo !== false && r.id !== editingRecipe?.id) // Don't allow a recipe to be ingredient of itself
                            .map(r => (
                              <option key={`ricetta-${r.id}`} value={`ricetta-${r.id}`}>
                                {r.nome_prodotto} - €{r.costo_unitario?.toFixed(2)} (Semilavorato)
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
                        {ingredientUnitOptions.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
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
                            <p className="font-medium text-[#6b6b6b]">
                              {ing.nome_prodotto}
                              {ing.tipo_ingrediente === 'semilavorato' && (
                                <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                                  Semilavorato
                                </span>
                              )}
                            </p>
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

                {/* Prezzi Section */}
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

                {/* Costi Preview */}
                {formData.ingredienti.length > 0 && formData.prezzo_vendita_online && formData.prezzo_vendita_offline && (
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
          <p className="text-[#9b9b9b]">Caricamento...</p>
        </NeumorphicCard>
      ) : filteredRicette.length === 0 ? (
        <NeumorphicCard className="p-12 text-center">
          <ChefHat className="w-16 h-16 text-[#9b9b9b] mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-bold text-[#6b6b6b] mb-2">
            {searchTerm ? 'Nessuna ricetta trovata' : 'Nessuna ricetta'}
          </h3>
          <p className="text-[#9b9b9b]">
            {searchTerm ? 'Prova a modificare i criteri di ricerca' : 'Inizia creando la tua prima ricetta'}
          </p>
        </NeumorphicCard>
      ) : (
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-[#6b6b6b] mb-6">Lista Ricette</h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-[#8b7355]">
                  <th className="text-left p-3 text-[#9b9b9b] font-medium">Prodotto</th>
                  <th className="text-right p-3 text-[#9b9b9b] font-medium">Costo</th>
                  <th className="text-right p-3 text-[#9b9b9b] font-medium">Prezzo Online</th>
                  <th className="text-right p-3 text-[#9b9b9b] font-medium">Prezzo Offline</th>
                  <th className="text-center p-3 text-[#9b9b9b] font-medium">FC Online</th>
                  <th className="text-center p-3 text-[#9b9b9b] font-medium">FC Offline</th>
                  <th className="text-center p-3 text-[#9b9b9b] font-medium">Ingredienti</th>
                  <th className="text-center p-3 text-[#9b9b9b] font-medium">Stato</th>
                  <th className="text-center p-3 text-[#9b9b9b] font-medium">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filteredRicette.map((ricetta) => (
                  <tr key={ricetta.id} className="border-b border-[#d1d1d1] hover:bg-[#e8ecf3] transition-colors">
                    <td className="p-3">
                      <div>
                        <p className="font-medium text-[#6b6b6b]">
                          {ricetta.nome_prodotto}
                          {ricetta.is_semilavorato && (
                            <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                              Semilavorato
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-[#9b9b9b]">{ricetta.categoria}</p>
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <span className="font-bold text-[#8b7355]">
                        €{ricetta.costo_unitario?.toFixed(2)}
                      </span>
                    </td>
                    <td className="p-3 text-right text-[#6b6b6b]">
                      €{ricetta.prezzo_vendita_online?.toFixed(2)}
                      <span className="block text-xs text-green-600">
                        +€{ricetta.margine_online?.toFixed(2)}
                      </span>
                    </td>
                    <td className="p-3 text-right text-[#6b6b6b]">
                      €{ricetta.prezzo_vendita_offline?.toFixed(2)}
                      <span className="block text-xs text-green-600">
                        +€{ricetta.margine_offline?.toFixed(2)}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
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
                    <td className="p-3">
                      <div className="flex justify-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
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
                    <td className="p-3 text-center text-[#6b6b6b]">
                      {ricetta.ingredienti?.length || 0}
                    </td>
                    <td className="p-3">
                      <div className="flex justify-center">
                        {ricetta.attivo !== false ? (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                            ATTIVO
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
                            INATTIVO
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(ricetta)}
                          className="neumorphic-flat p-2 rounded-lg hover:bg-blue-50 transition-colors"
                          title="Modifica"
                        >
                          <Edit className="w-4 h-4 text-blue-600" />
                        </button>
                        <button
                          onClick={() => handleDelete(ricetta.id)}
                          className="neumorphic-flat p-2 rounded-lg hover:bg-red-50 transition-colors"
                          title="Elimina"
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
    </div>
  );
}
