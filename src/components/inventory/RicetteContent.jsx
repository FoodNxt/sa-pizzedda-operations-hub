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
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Calculator
} from 'lucide-react';
import NeumorphicCard from "../neumorphic/NeumorphicCard";
import NeumorphicButton from "../neumorphic/NeumorphicButton";

export default function RicetteContent() {
  // Copy all logic from Ricette.js but WITHOUT ProtectedPage wrapper
  const [showForm, setShowForm] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingRecipe, setViewingRecipe] = useState(null);
  const [formData, setFormData] = useState({
    nome_prodotto: '',
    categoria: 'pizza',
    tipo_teglia: 'nessuna',
    allergeni: [],
    is_semilavorato: false,
    quantita_prodotta: '',
    unita_misura_prodotta: 'grammi',
    mostra_in_form_inventario: false,
    stores_form_inventario: [],
    unita_misura_form_inventario: 'grammi',
    somma_a_materia_prima_id: '',
    somma_a_materia_prima_nome: '',
    somma_ingrediente_id: '',
    somma_ingrediente_nome: '',
    ingredienti: [],
    prezzo_vendita_online: '',
    prezzo_vendita_offline: '',
    venduto_online: true,
    venduto_offline: true,
    note: '',
    attivo: true,
    trasportabile: false
  });
  const [customNomeProdotto, setCustomNomeProdotto] = useState('');
  const [addingNewProduct, setAddingNewProduct] = useState(false);
  const [showProductsWithoutRecipe, setShowProductsWithoutRecipe] = useState(false);
  const [showFoodCostModal, setShowFoodCostModal] = useState(false);
  const [deliveryFeePercentage, setDeliveryFeePercentage] = useState(() => {
    const saved = localStorage.getItem('delivery_fee_percentage');
    return saved ? parseFloat(saved) : 0;
  });
  const [editingIngredientIndex, setEditingIngredientIndex] = useState(null);
  const [selectedIngredient, setSelectedIngredient] = useState('');
  const [ingredientQuantity, setIngredientQuantity] = useState('');
  const [ingredientUnit, setIngredientUnit] = useState('g');

  const queryClient = useQueryClient();

  const { data: ricette = [], isLoading } = useQuery({
    queryKey: ['ricette'],
    queryFn: () => base44.entities.Ricetta.list(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const { data: materiePrime = [] } = useQuery({
    queryKey: ['materie-prime'],
    queryFn: () => base44.entities.MateriePrime.list(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const { data: prodottiVenduti = [] } = useQuery({
    queryKey: ['prodotti-venduti'],
    queryFn: () => base44.entities.ProdottiVenduti.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Ricetta.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ricette'] });
      resetForm();
      alert('Ricetta creata con successo! ✅');
    },
    onError: (error) => {
      console.error('Errore nel salvataggio della ricetta:', error);
      alert(`Errore: ${error.message || 'Non è stato possibile salvare la ricetta'}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Ricetta.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ricette'] });
      resetForm();
      alert('Ricetta aggiornata con successo! ✅');
    },
    onError: (error) => {
      console.error('Errore nel salvataggio della ricetta:', error);
      alert(`Errore: ${error.message || 'Non è stato possibile salvare la ricetta'}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Ricetta.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ricette'] });
    },
  });

  const VALID_PRODUCT_NAMES = React.useMemo(() => {
    const uniqueFlavors = [...new Set(prodottiVenduti.map(p => p.flavor).filter(Boolean))];
    return uniqueFlavors.sort();
  }, [prodottiVenduti]);

  const resetForm = () => {
    setFormData({
      nome_prodotto: '',
      categoria: 'pizza',
      tipo_teglia: 'nessuna',
      allergeni: [],
      is_semilavorato: false,
      quantita_prodotta: '',
      unita_misura_prodotta: 'grammi',
      mostra_in_form_inventario: false,
      stores_form_inventario: [],
      unita_misura_form_inventario: 'grammi',
      somma_a_materia_prima_id: '',
      somma_a_materia_prima_nome: '',
      ingredienti: [],
      prezzo_vendita_online: '',
      prezzo_vendita_offline: '',
      venduto_online: true,
      venduto_offline: true,
      note: '',
      attivo: true,
      trasportabile: false
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
      allergeni: ricetta.allergeni || [],
      is_semilavorato: ricetta.is_semilavorato || false,
      quantita_prodotta: ricetta.quantita_prodotta || '',
      unita_misura_prodotta: ricetta.unita_misura_prodotta || 'grammi',
      mostra_in_form_inventario: ricetta.mostra_in_form_inventario || false,
      stores_form_inventario: ricetta.stores_form_inventario || [],
      unita_misura_form_inventario: ricetta.unita_misura_form_inventario || 'grammi',
      somma_a_materia_prima_id: ricetta.somma_a_materia_prima_id || '',
      somma_a_materia_prima_nome: ricetta.somma_a_materia_prima_nome || '',
      somma_ingrediente_id: ricetta.somma_ingrediente_id || '',
      somma_ingrediente_nome: ricetta.somma_ingrediente_nome || '',
      ingredienti: ricetta.ingredienti || [],
      prezzo_vendita_online: ricetta.prezzo_vendita_online,
      prezzo_vendita_offline: ricetta.prezzo_vendita_offline,
      venduto_online: ricetta.venduto_online !== false,
      venduto_offline: ricetta.venduto_offline !== false,
      note: ricetta.note || '',
      attivo: ricetta.attivo !== false,
      trasportabile: ricetta.trasportabile || false
    });
    setShowForm(true);
  };

  const calculateIngredientCost = (ing) => {
    if (ing.is_semilavorato) {
      return ing.quantita * (ing.prezzo_unitario || 0);
    }

    const materiaPrima = materiePrime.find(m => m.id === ing.materia_prima_id);
    if (!materiaPrima || !materiaPrima.prezzo_unitario) return 0;

    let pricePerBaseUnit = materiaPrima.prezzo_unitario;
    
    if (materiaPrima.unita_misura === 'confezioni' && materiaPrima.unita_per_confezione && ing.unita_misura === 'pezzi') {
      pricePerBaseUnit = materiaPrima.prezzo_unitario / materiaPrima.unita_per_confezione;
      return ing.quantita * pricePerBaseUnit;
    }
    
    if (materiaPrima.unita_per_confezione && materiaPrima.peso_unita_interna && materiaPrima.unita_misura_interna) {
      const totalInPackage = materiaPrima.unita_per_confezione * materiaPrima.peso_unita_interna;
      pricePerBaseUnit = materiaPrima.prezzo_unitario / totalInPackage;
      
      let quantityInBaseUnit = ing.quantita;
      const internalUnit = materiaPrima.unita_misura_interna;
      
      if (ing.unita_misura === 'g' && internalUnit === 'kg') {
        quantityInBaseUnit = ing.quantita / 1000;
      } else if (ing.unita_misura === 'kg' && internalUnit === 'kg') {
        quantityInBaseUnit = ing.quantita;
      } else if (ing.unita_misura === 'ml' && internalUnit === 'litri') {
        quantityInBaseUnit = ing.quantita / 1000;
      } else if (ing.unita_misura === 'litri' && internalUnit === 'litri') {
        quantityInBaseUnit = ing.quantita;
      } else if (ing.unita_misura === 'g' && internalUnit === 'g') {
        quantityInBaseUnit = ing.quantita;
      } else if (ing.unita_misura === 'ml' && internalUnit === 'ml') {
        quantityInBaseUnit = ing.quantita;
      }
      
      return quantityInBaseUnit * pricePerBaseUnit;
    }
    
    if (materiaPrima.peso_dimensione_unita && materiaPrima.unita_misura_peso) {
      pricePerBaseUnit = materiaPrima.prezzo_unitario / materiaPrima.peso_dimensione_unita;
      
      let quantityInBaseUnit = ing.quantita;
      const baseUnit = materiaPrima.unita_misura_peso;
      
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
      }
      
      return quantityInBaseUnit * pricePerBaseUnit;
    }

    let quantityInBaseUnit = ing.quantita;
    
    if (ing.unita_misura === 'g' && materiaPrima.unita_misura === 'kg') {
      quantityInBaseUnit = ing.quantita / 1000;
    } else if (ing.unita_misura === 'kg' && materiaPrima.unita_misura === 'g') {
      quantityInBaseUnit = ing.quantita * 1000;
    } else if (ing.unita_misura === 'ml' && materiaPrima.unita_misura === 'litri') {
      quantityInBaseUnit = ing.quantita / 1000;
    } else if (ing.unita_misura === 'litri' && materiaPrima.unita_misura === 'ml') {
      quantityInBaseUnit = ing.quantita * 1000;
    } else if (ing.unita_misura === 'g' && materiaPrima.unita_misura === 'litri') {
      quantityInBaseUnit = ing.quantita / 1000;
    } else if (ing.unita_misura === 'ml' && materiaPrima.unita_misura === 'kg') {
      quantityInBaseUnit = ing.quantita / 1000;
    } else if (ing.unita_misura === 'pezzi' && materiaPrima.unita_misura === 'pezzi') {
      quantityInBaseUnit = ing.quantita;
    } else if (ing.unita_misura === 'pezzi' && materiaPrima.unita_misura === 'confezioni' && !materiaPrima.unita_per_confezione) {
      quantityInBaseUnit = ing.quantita;
    }

    return quantityInBaseUnit * pricePerBaseUnit;
  };

  const addIngredient = () => {
    if (!selectedIngredient || !ingredientQuantity) {
      alert('Seleziona un ingrediente e inserisci la quantità');
      return;
    }

    let newIngredient;

    if (selectedIngredient.startsWith('mp_')) {
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

    if (editingIngredientIndex !== null) {
      const updatedIngredienti = [...formData.ingredienti];
      updatedIngredienti[editingIngredientIndex] = newIngredient;
      setFormData(prev => ({
        ...prev,
        ingredienti: updatedIngredienti
      }));
      setEditingIngredientIndex(null);
    } else {
      setFormData(prev => ({
        ...prev,
        ingredienti: [...prev.ingredienti, newIngredient]
      }));
    }

    setSelectedIngredient('');
    setIngredientQuantity('');
    setIngredientUnit('g');
  };

  const editIngredient = (index) => {
    const ingredient = formData.ingredienti[index];
    const prefix = ingredient.is_semilavorato ? 'sl_' : 'mp_';
    setSelectedIngredient(prefix + ingredient.materia_prima_id);
    setIngredientQuantity(ingredient.quantita.toString());
    setIngredientUnit(ingredient.unita_misura);
    setEditingIngredientIndex(index);
  };

  const cancelEditIngredient = () => {
    setSelectedIngredient('');
    setIngredientQuantity('');
    setIngredientUnit('g');
    setEditingIngredientIndex(null);
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
      totalCost += calculateIngredientCost(ing);
    });
    return totalCost;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.is_semilavorato && formData.ingredienti.length === 0) {
      alert('Aggiungi almeno un ingrediente alla ricetta');
      return;
    }
    
    if (formData.is_semilavorato && !formData.nome_prodotto.trim()) {
      alert('Inserisci il nome del semilavorato');
      return;
    }
    
    let nomeProdotto = formData.nome_prodotto;
    
    if (!formData.is_semilavorato && addingNewProduct && customNomeProdotto.trim()) {
      nomeProdotto = customNomeProdotto.trim();
      
      const esistente = await base44.entities.ProdottiVenduti.filter({ nome_prodotto: nomeProdotto });
      
      if (esistente.length === 0) {
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

    if (!editingRecipe || editingRecipe.nome_prodotto !== nomeProdotto) {
      const existingRecipe = ricette.find(r => 
        r.nome_prodotto.toLowerCase() === nomeProdotto.toLowerCase() &&
        r.is_semilavorato === formData.is_semilavorato
      );
      
      if (existingRecipe) {
        alert(`Esiste già una ricetta per "${nomeProdotto}". Ogni prodotto può avere una sola ricetta.`);
        return;
      }
    }

    let costoUnitario = calculateCosts();
    
    if (formData.is_semilavorato && formData.quantita_prodotta) {
      costoUnitario = costoUnitario / parseFloat(formData.quantita_prodotta);
    }
    
    const prezzoOnline = formData.is_semilavorato || !formData.venduto_online ? 0 : (parseFloat(formData.prezzo_vendita_online) || 0);
    const prezzoOffline = formData.is_semilavorato || !formData.venduto_offline ? 0 : (parseFloat(formData.prezzo_vendita_offline) || 0);

    const data = {
      ...formData,
      nome_prodotto: nomeProdotto,
      prezzo_vendita_online: prezzoOnline,
      prezzo_vendita_offline: prezzoOffline,
      venduto_online: formData.venduto_online,
      venduto_offline: formData.venduto_offline,
      costo_unitario: costoUnitario,
      food_cost_online: prezzoOnline > 0 ? (costoUnitario / prezzoOnline) * 100 : 0,
      food_cost_offline: prezzoOffline > 0 ? (costoUnitario / prezzoOffline) * 100 : 0,
      margine_online: prezzoOnline - costoUnitario,
      margine_offline: prezzoOffline - costoUnitario
    };
    
    if (!formData.is_semilavorato) {
      delete data.quantita_prodotta;
      delete data.unita_misura_prodotta;
      delete data.mostra_in_form_inventario;
      delete data.stores_form_inventario;
      delete data.unita_misura_form_inventario;
      delete data.somma_a_materia_prima_id;
      delete data.somma_a_materia_prima_nome;
      delete data.somma_ingrediente_id;
      delete data.somma_ingrediente_nome;
    } else {
      data.quantita_prodotta = formData.quantita_prodotta ? parseFloat(formData.quantita_prodotta) : null;
    }

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

  const semilavorati = filteredRicette.filter(r => r.is_semilavorato);
  const prodottiFiniti = filteredRicette.filter(r => !r.is_semilavorato);

  const productsWithRecipes = ricette
    .filter(r => !r.is_semilavorato)
    .map(r => r.nome_prodotto.toLowerCase());
  
  const productsWithoutRecipes = VALID_PRODUCT_NAMES.filter(
    name => !productsWithRecipes.includes(name.toLowerCase())
  );

  const getCostoPreview = () => calculateCosts();

  const handleCreateRecipeForProduct = (productName) => {
    setFormData({
      nome_prodotto: productName,
      categoria: 'pizza',
      tipo_teglia: 'nessuna',
      is_semilavorato: false,
      ingredienti: [],
      prezzo_vendita_online: '',
      prezzo_vendita_offline: '',
      venduto_online: true,
      venduto_offline: true,
      note: '',
      attivo: true
    });
    setShowForm(true);
    setShowProductsWithoutRecipe(false);
  };

  const handleSaveFee = () => {
    localStorage.setItem('delivery_fee_percentage', deliveryFeePercentage.toString());
    setShowFoodCostModal(false);
  };

  const calculateNetFoodCost = (costo, prezzoOnline) => {
    if (!prezzoOnline || prezzoOnline === 0) return 0;
    const nettoFees = prezzoOnline - (prezzoOnline * (deliveryFeePercentage / 100));
    if (nettoFees <= 0) return 0;
    return (costo / nettoFees) * 100;
  };
  
  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
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
            <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 mx-auto mb-2 lg:mb-3 flex items-center justify-center shadow-lg">
              <AlertTriangle className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
            </div>
            <h3 className="text-xl lg:text-2xl font-bold text-orange-600 mb-1">
              {productsWithoutRecipes.length}
            </h3>
            <p className="text-xs text-slate-500">Senza Ricetta</p>
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

      <div className="flex gap-2 justify-end">
        <NeumorphicButton
          onClick={() => setShowFoodCostModal(true)}
          className="flex items-center gap-2"
        >
          <Calculator className="w-5 h-5" />
          <span className="hidden sm:inline">Food Cost</span>
        </NeumorphicButton>
        <NeumorphicButton
          onClick={() => setShowForm(true)}
          variant="primary"
          className="flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Nuova</span>
        </NeumorphicButton>
      </div>

      {/* Products Without Recipe */}
      {productsWithoutRecipes.length > 0 && (
        <NeumorphicCard className="overflow-hidden">
          <button
            onClick={() => setShowProductsWithoutRecipe(!showProductsWithoutRecipe)}
            className="w-full p-4 lg:p-6 text-left hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Prodotti Senza Ricetta</h3>
                  <p className="text-xs text-slate-500">{productsWithoutRecipes.length} prodotti</p>
                </div>
              </div>
              
              {showProductsWithoutRecipe ? (
                <ChevronDown className="w-5 h-5 text-slate-600" />
              ) : (
                <ChevronRight className="w-5 h-5 text-slate-600" />
              )}
            </div>
          </button>
          
          {showProductsWithoutRecipe && (
            <div className="p-4 lg:p-6 pt-0 border-t border-slate-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {productsWithoutRecipes.map(productName => (
                  <div key={productName} className="neumorphic-flat p-4 rounded-xl flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">{productName}</span>
                    <button
                      onClick={() => handleCreateRecipeForProduct(productName)}
                      className="nav-button p-2 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      <Plus className="w-4 h-4 text-blue-600" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </NeumorphicCard>
      )}

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
          {semilavorati.length > 0 && (
            <NeumorphicCard className="p-4 lg:p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                🍳 Semilavorati
                <span className="text-sm font-normal text-slate-500">({semilavorati.length})</span>
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full">
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
                             onClick={() => setViewingRecipe(ricetta)}
                             className="nav-button p-2 rounded-lg hover:bg-green-50 transition-colors"
                           >
                             <Package className="w-4 h-4 text-green-600" />
                           </button>
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

          {prodottiFiniti.length > 0 && (
            <NeumorphicCard className="p-4 lg:p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                🍕 Prodotti Finiti
                <span className="text-sm font-normal text-slate-500">({prodottiFiniti.length})</span>
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="border-b-2 border-blue-600">
                      <th className="text-left p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Prodotto</th>
                      <th className="text-right p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Costo</th>
                      <th className="text-right p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">P. Online</th>
                      <th className="text-right p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">P. Offline</th>
                      <th className="text-center p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">FC Online</th>
                      {deliveryFeePercentage > 0 && (
                        <th className="text-center p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">FC Netto</th>
                      )}
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
                        {deliveryFeePercentage > 0 && (
                          <td className="p-2 lg:p-3">
                            <div className="flex justify-center">
                              <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                calculateNetFoodCost(ricetta.costo_unitario, ricetta.prezzo_vendita_online) < 30 
                                  ? 'bg-green-100 text-green-700' 
                                  : calculateNetFoodCost(ricetta.costo_unitario, ricetta.prezzo_vendita_online) < 40
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {calculateNetFoodCost(ricetta.costo_unitario, ricetta.prezzo_vendita_online).toFixed(1)}%
                              </span>
                            </div>
                          </td>
                        )}
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
                              onClick={() => setViewingRecipe(ricetta)}
                              className="nav-button p-2 rounded-lg hover:bg-green-50 transition-colors"
                            >
                              <Package className="w-4 h-4 text-green-600" />
                            </button>
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

          {prodottiFiniti.length > 0 && (
            <NeumorphicCard className="p-4 lg:p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                🍕 Prodotti Finiti
                <span className="text-sm font-normal text-slate-500">({prodottiFiniti.length})</span>
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="border-b-2 border-blue-600">
                      <th className="text-left p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Prodotto</th>
                      <th className="text-right p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Costo</th>
                      <th className="text-right p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">P. Online</th>
                      <th className="text-right p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">P. Offline</th>
                      <th className="text-center p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">FC Online</th>
                      {deliveryFeePercentage > 0 && (
                        <th className="text-center p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">FC Netto</th>
                      )}
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
                        {deliveryFeePercentage > 0 && (
                          <td className="p-2 lg:p-3">
                            <div className="flex justify-center">
                              <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                calculateNetFoodCost(ricetta.costo_unitario, ricetta.prezzo_vendita_online) < 30 
                                  ? 'bg-green-100 text-green-700' 
                                  : calculateNetFoodCost(ricetta.costo_unitario, ricetta.prezzo_vendita_online) < 40
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {calculateNetFoodCost(ricetta.costo_unitario, ricetta.prezzo_vendita_online).toFixed(1)}%
                              </span>
                            </div>
                          </td>
                        )}
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
                              onClick={() => setViewingRecipe(ricetta)}
                              className="nav-button p-2 rounded-lg hover:bg-green-50 transition-colors"
                            >
                              <Package className="w-4 h-4 text-green-600" />
                            </button>
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

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <NeumorphicCard className="max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-800">
                {editingRecipe ? 'Modifica Ricetta' : 'Nuova Ricetta'}
              </h2>
              <button onClick={resetForm} className="p-2 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="neumorphic-flat p-4 rounded-xl">
                <h3 className="font-bold text-slate-700 mb-3 text-sm">Dati Base</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_semilavorato"
                      checked={formData.is_semilavorato}
                      onChange={(e) => setFormData({ ...formData, is_semilavorato: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <label htmlFor="is_semilavorato" className="text-sm font-medium text-slate-700">
                      Semilavorato
                    </label>
                  </div>

                  {!formData.is_semilavorato && (
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">
                        Nome Prodotto <span className="text-red-600">*</span>
                      </label>
                      <select
                        value={formData.nome_prodotto}
                        onChange={(e) => {
                          if (e.target.value === '__new__') {
                            setAddingNewProduct(true);
                            setFormData({ ...formData, nome_prodotto: '' });
                          } else {
                            setAddingNewProduct(false);
                            setFormData({ ...formData, nome_prodotto: e.target.value });
                          }
                        }}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm"
                        required={!addingNewProduct}
                      >
                        <option value="">Seleziona prodotto...</option>
                        {VALID_PRODUCT_NAMES.map(name => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                        <option value="__new__">+ Aggiungi nuovo prodotto</option>
                      </select>
                      {addingNewProduct && (
                        <input
                          type="text"
                          value={customNomeProdotto}
                          onChange={(e) => setCustomNomeProdotto(e.target.value)}
                          placeholder="Nome nuovo prodotto..."
                          className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm mt-2"
                          required
                        />
                      )}
                    </div>
                  )}

                  {formData.is_semilavorato && (
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">
                        Nome Semilavorato <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.nome_prodotto}
                        onChange={(e) => setFormData({ ...formData, nome_prodotto: e.target.value })}
                        placeholder="es. Impasto Base"
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm"
                        required
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">Categoria</label>
                      <select
                        value={formData.categoria}
                        onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm"
                      >
                        <option value="pizza">Pizza</option>
                        <option value="dolce">Dolce</option>
                        <option value="bevanda">Bevanda</option>
                        <option value="altro">Altro</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">Tipo Teglia</label>
                      <select
                        value={formData.tipo_teglia}
                        onChange={(e) => setFormData({ ...formData, tipo_teglia: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm"
                      >
                        <option value="nessuna">Nessuna</option>
                        <option value="rossa">Rossa</option>
                        <option value="bianca">Bianca</option>
                      </select>
                    </div>
                  </div>

                  {/* Allergeni */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Allergeni</label>
                    <div className="neumorphic-pressed p-3 rounded-xl">
                      <div className="grid grid-cols-2 gap-2">
                        {['Glutine', 'Crostacei', 'Uova', 'Pesce', 'Arachidi', 'Soia', 'Latte', 'Frutta a guscio', 'Sedano', 'Senape', 'Semi di sesamo', 'Anidride solforosa e solfiti', 'Lupini', 'Molluschi'].map(allergene => (
                          <label key={allergene} className="flex items-center gap-2 cursor-pointer text-xs">
                            <input
                              type="checkbox"
                              checked={formData.allergeni?.includes(allergene)}
                              onChange={(e) => {
                                const newAllergeni = e.target.checked
                                  ? [...(formData.allergeni || []), allergene]
                                  : (formData.allergeni || []).filter(a => a !== allergene);
                                setFormData({ ...formData, allergeni: newAllergeni });
                              }}
                              className="w-3 h-3"
                            />
                            <span className="text-slate-700">{allergene}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="neumorphic-flat p-4 rounded-xl">
                <h3 className="font-bold text-slate-700 mb-3 text-sm">Ingredienti</h3>
                
                <div className="grid grid-cols-12 gap-2 mb-3">
                  <div className="col-span-6">
                    <select
                      value={selectedIngredient}
                      onChange={(e) => setSelectedIngredient(e.target.value)}
                      className="w-full neumorphic-pressed px-3 py-2 rounded-xl text-slate-700 outline-none text-sm"
                    >
                      <option value="">Seleziona ingrediente...</option>
                      <optgroup label="Materie Prime">
                        {materiePrime
                          .filter(m => m.attivo !== false)
                          .sort((a, b) => a.nome_prodotto.localeCompare(b.nome_prodotto))
                          .map(m => (
                            <option key={`mp_${m.id}`} value={`mp_${m.id}`}>
                              {m.nome_prodotto} ({m.categoria})
                            </option>
                          ))}
                      </optgroup>
                      <optgroup label="Semilavorati">
                        {ricette
                          .filter(r => r.is_semilavorato && r.attivo !== false)
                          .map(r => (
                            <option key={`sl_${r.id}`} value={`sl_${r.id}`}>
                              {r.nome_prodotto} (Semilavorato)
                            </option>
                          ))}
                      </optgroup>
                    </select>
                  </div>
                  
                  <div className="col-span-3">
                    <input
                      type="number"
                      step="0.01"
                      value={ingredientQuantity}
                      onChange={(e) => setIngredientQuantity(e.target.value)}
                      placeholder="Quantità"
                      className="w-full neumorphic-pressed px-3 py-2 rounded-xl text-slate-700 outline-none text-sm"
                    />
                  </div>

                  <div className="col-span-2">
                    <select
                      value={ingredientUnit}
                      onChange={(e) => setIngredientUnit(e.target.value)}
                      className="w-full neumorphic-pressed px-3 py-2 rounded-xl text-slate-700 outline-none text-sm"
                    >
                      <option value="g">g</option>
                      <option value="kg">kg</option>
                      <option value="ml">ml</option>
                      <option value="litri">litri</option>
                      <option value="pezzi">pezzi</option>
                    </select>
                  </div>

                  <div className="col-span-1 flex items-center">
                    <button
                      type="button"
                      onClick={addIngredient}
                      className="w-full h-full p-2 rounded-xl bg-blue-500 text-white hover:bg-blue-600"
                    >
                      {editingIngredientIndex !== null ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {editingIngredientIndex !== null && (
                  <button
                    type="button"
                    onClick={cancelEditIngredient}
                    className="mb-3 px-3 py-1 text-xs bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
                  >
                    Annulla modifica
                  </button>
                )}

                {formData.ingredienti.length > 0 && (
                  <div className="space-y-2">
                    {formData.ingredienti.map((ing, idx) => (
                      <div key={idx} className="neumorphic-pressed p-3 rounded-lg flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-700">{ing.nome_prodotto}</p>
                          <p className="text-xs text-slate-500">
                            {ing.quantita} {ing.unita_misura} • €{calculateIngredientCost(ing).toFixed(2)}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => editIngredient(idx)}
                            className="p-2 rounded-lg hover:bg-blue-50"
                          >
                            <Edit className="w-4 h-4 text-blue-600" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeIngredient(idx)}
                            className="p-2 rounded-lg hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="neumorphic-flat p-3 rounded-lg bg-blue-50">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-800">Costo Totale:</span>
                        <span className="text-lg font-bold text-blue-600">€{getCostoPreview().toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {!formData.is_semilavorato && (
                <div className="neumorphic-flat p-4 rounded-xl">
                  <h3 className="font-bold text-slate-700 mb-3 text-sm">Prezzi Vendita</h3>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.venduto_online}
                          onChange={(e) => setFormData({ ...formData, venduto_online: e.target.checked })}
                          className="w-4 h-4"
                        />
                        Prezzo Online
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.prezzo_vendita_online}
                        onChange={(e) => setFormData({ ...formData, prezzo_vendita_online: e.target.value })}
                        disabled={!formData.venduto_online}
                        placeholder="0.00"
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm disabled:opacity-50"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.venduto_offline}
                          onChange={(e) => setFormData({ ...formData, venduto_offline: e.target.checked })}
                          className="w-4 h-4"
                        />
                        Prezzo Negozio
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.prezzo_vendita_offline}
                        onChange={(e) => setFormData({ ...formData, prezzo_vendita_offline: e.target.value })}
                        disabled={!formData.venduto_offline}
                        placeholder="0.00"
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-3 rounded-xl neumorphic-flat text-slate-700 font-medium"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Salva
                </button>
              </div>
            </form>
          </NeumorphicCard>
        </div>
      )}

      {/* Food Cost Modal */}
      {showFoodCostModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <NeumorphicCard className="max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800">Configurazione Food Cost</h2>
              <button onClick={() => setShowFoodCostModal(false)} className="p-2 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Commissione Delivery (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={deliveryFeePercentage}
                  onChange={(e) => setDeliveryFeePercentage(parseFloat(e.target.value) || 0)}
                  placeholder="es. 30"
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Calcola Food Cost netto al netto delle commissioni delivery
                </p>
              </div>

              <button
                onClick={handleSaveFee}
                className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium"
              >
                Salva
              </button>
            </div>
          </NeumorphicCard>
        </div>
      )}

      {/* View Recipe Modal */}
      {viewingRecipe && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <NeumorphicCard className="max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-800">{viewingRecipe.nome_prodotto}</h2>
              <button onClick={() => setViewingRecipe(null)} className="p-2 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="neumorphic-pressed p-3 rounded-xl">
                  <p className="text-xs text-slate-500">Categoria</p>
                  <p className="font-bold text-slate-800">{viewingRecipe.categoria}</p>
                </div>
                <div className="neumorphic-pressed p-3 rounded-xl">
                  <p className="text-xs text-slate-500">Costo Unitario</p>
                  <p className="font-bold text-blue-600">€{viewingRecipe.costo_unitario?.toFixed(2)}</p>
                </div>
              </div>

              {!viewingRecipe.is_semilavorato && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="neumorphic-pressed p-3 rounded-xl">
                    <p className="text-xs text-slate-500">Prezzo Online</p>
                    <p className="font-bold text-slate-800">€{viewingRecipe.prezzo_vendita_online?.toFixed(2)}</p>
                    <p className="text-xs text-green-600">FC: {viewingRecipe.food_cost_online?.toFixed(1)}%</p>
                  </div>
                  <div className="neumorphic-pressed p-3 rounded-xl">
                    <p className="text-xs text-slate-500">Prezzo Negozio</p>
                    <p className="font-bold text-slate-800">€{viewingRecipe.prezzo_vendita_offline?.toFixed(2)}</p>
                    <p className="text-xs text-green-600">FC: {viewingRecipe.food_cost_offline?.toFixed(1)}%</p>
                  </div>
                </div>
              )}

              <div>
                <h3 className="font-bold text-slate-700 mb-2">Ingredienti</h3>
                <div className="space-y-2">
                  {viewingRecipe.ingredienti?.map((ing, idx) => (
                    <div key={idx} className="neumorphic-pressed p-3 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-700">{ing.nome_prodotto}</span>
                        <span className="text-sm font-bold text-blue-600">
                          {ing.quantita} {ing.unita_misura}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </NeumorphicCard>
        </div>
      )}
    </div>
  );
}