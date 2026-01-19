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
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";

export default function Ricette() {
  const [showForm, setShowForm] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingRecipe, setViewingRecipe] = useState(null);
  const [formData, setFormData] = useState({
    nome_prodotto: '',
    categoria: 'pizza',
    tipo_teglia: 'nessuna',
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
  const [customNomeProdotto, setCustomNomeProdotto] = useState('');
  const [addingNewProduct, setAddingNewProduct] = useState(false);
  const [showProductsWithoutRecipe, setShowProductsWithoutRecipe] = useState(false);
  const [showFoodCostModal, setShowFoodCostModal] = useState(false);
  const [deliveryFeePercentage, setDeliveryFeePercentage] = useState(() => {
    const saved = localStorage.getItem('delivery_fee_percentage');
    return saved ? parseFloat(saved) : 0;
  });
  const [editingIngredientIndex, setEditingIngredientIndex] = useState(null);

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

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
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

  // Get unique product names from ProdottiVenduti
  const VALID_PRODUCT_NAMES = React.useMemo(() => {
    const uniqueFlavors = [...new Set(prodottiVenduti.map(p => p.flavor).filter(Boolean))];
    return uniqueFlavors.sort();
  }, [prodottiVenduti]);

  const resetForm = () => {
    setFormData({
      nome_prodotto: '',
      categoria: 'pizza',
      tipo_teglia: 'nessuna',
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
      is_semilavorato: ricetta.is_semilavorato || false,
      quantita_prodotta: ricetta.quantita_prodotta || '',
      unita_misura_prodotta: ricetta.unita_misura_prodotta || 'grammi',
      mostra_in_form_inventario: ricetta.mostra_in_form_inventario || false,
      stores_form_inventario: ricetta.stores_form_inventario || [],
      unita_misura_form_inventario: ricetta.unita_misura_form_inventario || 'grammi',
      somma_a_materia_prima_id: ricetta.somma_a_materia_prima_id || '',
      somma_a_materia_prima_nome: ricetta.somma_a_materia_prima_nome || '',
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
    
    // Handle products sold in "confezioni" with pieces inside (e.g., Coca Cola 3-pack)
    if (materiaPrima.unita_misura === 'confezioni' && materiaPrima.unita_per_confezione && ing.unita_misura === 'pezzi') {
      // Price per single piece = price per box / number of pieces in box
      pricePerBaseUnit = materiaPrima.prezzo_unitario / materiaPrima.unita_per_confezione;
      return ing.quantita * pricePerBaseUnit;
    }
    
    // CRITICAL: Handle products with internal units (weight/volume in confezioni)
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
    
    // Legacy handling
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
    
    // Handle ALL weight/volume conversions
    if (ing.unita_misura === 'g' && materiaPrima.unita_misura === 'kg') {
      quantityInBaseUnit = ing.quantita / 1000;
    } else if (ing.unita_misura === 'kg' && materiaPrima.unita_misura === 'g') {
      quantityInBaseUnit = ing.quantita * 1000;
    } else if (ing.unita_misura === 'ml' && materiaPrima.unita_misura === 'litri') {
      quantityInBaseUnit = ing.quantita / 1000;
    } else if (ing.unita_misura === 'litri' && materiaPrima.unita_misura === 'ml') {
      quantityInBaseUnit = ing.quantita * 1000;
    } else if (ing.unita_misura === 'g' && materiaPrima.unita_misura === 'litri') {
      // grammi -> litri (assuming density ~1, like oil/water)
      quantityInBaseUnit = ing.quantita / 1000;
    } else if (ing.unita_misura === 'ml' && materiaPrima.unita_misura === 'kg') {
      // ml -> kg (assuming density ~1)
      quantityInBaseUnit = ing.quantita / 1000;
    } else if (ing.unita_misura === 'pezzi' && materiaPrima.unita_misura === 'pezzi') {
      quantityInBaseUnit = ing.quantita;
    } else if (ing.unita_misura === 'pezzi' && materiaPrima.unita_misura === 'confezioni' && !materiaPrima.unita_per_confezione) {
      // If using pezzi but product is sold in confezioni, assume 1:1 if no unita_per_confezione
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

    if (editingIngredientIndex !== null) {
      // Update existing ingredient
      const updatedIngredienti = [...formData.ingredienti];
      updatedIngredienti[editingIngredientIndex] = newIngredient;
      setFormData(prev => ({
        ...prev,
        ingredienti: updatedIngredienti
      }));
      setEditingIngredientIndex(null);
    } else {
      // Add new ingredient
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
    // Reconstruct the selected value
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

    // Check for duplicate recipes (only if creating new or changing product name)
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

    const costoUnitario = calculateCosts();
    
    // Set prices based on venduto flags
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

  // Calculate products without recipes
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
          <div className="flex gap-2">
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
        </div>
      </div>

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
                <div className="neumorphic-flat p-4 rounded-xl space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_semilavorato}
                      onChange={(e) => {
                        setFormData({ 
                          ...formData, 
                          is_semilavorato: e.target.checked,
                          nome_prodotto: e.target.checked ? '' : '',
                          quantita_prodotta: '',
                          unita_misura_prodotta: 'grammi',
                          mostra_in_form_inventario: false,
                          stores_form_inventario: [],
                          unita_misura_form_inventario: 'grammi',
                          somma_a_materia_prima_id: '',
                          somma_a_materia_prima_nome: ''
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
                    <div className="mt-3 p-4 bg-purple-50 rounded-lg space-y-3">
                      <div>
                        <label className="text-sm font-medium text-purple-800 mb-2 block">
                          Quantità Prodotta
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.quantita_prodotta}
                            onChange={(e) => setFormData({ ...formData, quantita_prodotta: e.target.value })}
                            placeholder="es. 10"
                            className="flex-1 neumorphic-pressed px-4 py-2 rounded-xl text-slate-700 outline-none"
                          />
                          <select
                            value={formData.unita_misura_prodotta}
                            onChange={(e) => setFormData({ ...formData, unita_misura_prodotta: e.target.value })}
                            className="neumorphic-pressed px-3 py-2 rounded-xl text-slate-700 outline-none"
                          >
                            <option value="grammi">g</option>
                            <option value="kg">kg</option>
                            <option value="litri">L</option>
                            <option value="ml">ml</option>
                            <option value="pezzi">pezzi</option>
                            <option value="unità">unità</option>
                          </select>
                        </div>
                        <p className="text-xs text-purple-600 mt-1">
                          Specifica quanto semilavorato produce questa ricetta
                        </p>
                      </div>
                      
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.mostra_in_form_inventario}
                          onChange={(e) => {
                            setFormData({ 
                              ...formData, 
                              mostra_in_form_inventario: e.target.checked,
                              stores_form_inventario: e.target.checked ? formData.stores_form_inventario : [],
                              somma_a_materia_prima_id: e.target.checked ? formData.somma_a_materia_prima_id : '',
                              somma_a_materia_prima_nome: e.target.checked ? formData.somma_a_materia_prima_nome : ''
                            });
                          }}
                          className="w-5 h-5 rounded"
                        />
                        <span className="text-sm font-medium text-purple-800">
                          📋 Includi nel Form Inventario
                        </span>
                      </label>
                      
                      {formData.mostra_in_form_inventario && (
                        <>
                          <div>
                            <label className="text-sm font-medium text-purple-800 mb-2 block">
                              Negozi (Seleziona dove mostrarlo)
                            </label>
                            <div className="space-y-2">
                              {stores.map(store => (
                                <label key={store.id} className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={formData.stores_form_inventario.includes(store.id)}
                                    onChange={(e) => {
                                      const newStores = e.target.checked
                                        ? [...formData.stores_form_inventario, store.id]
                                        : formData.stores_form_inventario.filter(id => id !== store.id);
                                      setFormData({ ...formData, stores_form_inventario: newStores });
                                    }}
                                    className="w-4 h-4 rounded"
                                  />
                                  <span className="text-sm text-slate-700">{store.name}</span>
                                </label>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="text-sm font-medium text-purple-800 mb-2 block">
                              Unità di Misura nel Form
                            </label>
                            <select
                              value={formData.unita_misura_form_inventario}
                              onChange={(e) => setFormData({ ...formData, unita_misura_form_inventario: e.target.value })}
                              className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                            >
                              <option value="grammi">Grammi (g)</option>
                              <option value="kg">Kilogrammi (kg)</option>
                              <option value="litri">Litri</option>
                              <option value="ml">Millilitri (ml)</option>
                              <option value="pezzi">Pezzi</option>
                              <option value="unità">Unità</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="text-sm font-medium text-purple-800 mb-2 block">
                              Somma a Materia Prima (per calcolo ordini)
                            </label>
                            <select
                              value={formData.somma_a_materia_prima_id}
                              onChange={(e) => {
                                const mp = materiePrime.find(m => m.id === e.target.value);
                                setFormData({ 
                                  ...formData, 
                                  somma_a_materia_prima_id: e.target.value,
                                  somma_a_materia_prima_nome: mp?.nome_prodotto || ''
                                });
                              }}
                              className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                            >
                              <option value="">-- Nessuna (opzionale) --</option>
                              {materiePrime
                                .filter(mp => mp.attivo !== false)
                                .map(mp => (
                                  <option key={mp.id} value={mp.id}>
                                    {mp.nome_prodotto}
                                  </option>
                                ))}
                            </select>
                            <p className="text-xs text-purple-600 mt-1">
                              Se selezionato, la quantità di questo semilavorato verrà sommata alla materia prima per il calcolo degli ordini
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Ingredienti Section */}
                <div className="neumorphic-flat p-6 rounded-xl">
                  <h3 className="text-lg font-bold text-[#6b6b6b] mb-4">Ingredienti</h3>
                  
                  {/* Add Ingredient Form */}
                  {editingIngredientIndex !== null && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                      <p className="text-xs font-medium text-blue-800">
                        ✏️ Modifica ingrediente in corso
                      </p>
                    </div>
                  )}
                  
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
                            .filter(r => r.is_semilavorato && r.attivo !== false)
                            .map(sl => (
                              <option key={sl.id} value={`sl_${sl.id}`}>
                                {sl.nome_prodotto} (Semilavorato) {sl.costo_unitario ? `- €${sl.costo_unitario?.toFixed(2)}` : ''}
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

                  <div className="flex gap-2 mb-4">
                    {editingIngredientIndex !== null && (
                      <NeumorphicButton
                        type="button"
                        onClick={cancelEditIngredient}
                        className="flex-1"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Annulla
                      </NeumorphicButton>
                    )}
                    <NeumorphicButton
                      type="button"
                      onClick={addIngredient}
                      className="flex-1"
                    >
                      {editingIngredientIndex !== null ? (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Salva Modifica
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Aggiungi Ingrediente
                        </>
                      )}
                    </NeumorphicButton>
                  </div>

                  {/* Ingredients List */}
                  {formData.ingredienti.length > 0 && (
                    <div className="space-y-2">
                      {formData.ingredienti.map((ing, index) => (
                        <div 
                          key={index} 
                          className={`neumorphic-pressed p-4 rounded-lg flex items-center justify-between ${
                            editingIngredientIndex === index ? 'ring-2 ring-blue-400' : ''
                          }`}
                        >
                          <div className="flex-1">
                            <p className="font-medium text-[#6b6b6b]">{ing.nome_prodotto}</p>
                            <p className="text-sm text-[#9b9b9b]">
                              {ing.quantita} {ing.unita_misura} - €{ing.prezzo_unitario?.toFixed(2)}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => editIngredient(index)}
                              className="neumorphic-flat p-2 rounded-lg hover:bg-blue-50 transition-colors"
                              disabled={editingIngredientIndex !== null && editingIngredientIndex !== index}
                            >
                              <Edit className="w-4 h-4 text-blue-600" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (editingIngredientIndex === index) {
                                  cancelEditIngredient();
                                }
                                removeIngredient(index);
                              }}
                              className="neumorphic-flat p-2 rounded-lg hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Prezzi Section - Only show if not semilavorato */}
                {!formData.is_semilavorato && (
                  <div className="neumorphic-flat p-6 rounded-xl">
                    <h3 className="text-lg font-bold text-[#6b6b6b] mb-4">Prezzi di Vendita</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <input
                            type="checkbox"
                            id="venduto_online"
                            checked={formData.venduto_online}
                            onChange={(e) => setFormData({ ...formData, venduto_online: e.target.checked })}
                            className="w-4 h-4 rounded"
                          />
                          <label htmlFor="venduto_online" className="text-sm font-medium text-[#6b6b6b] flex items-center gap-2">
                            <Euro className="w-4 h-4" />
                            Venduto Online
                          </label>
                        </div>
                        {formData.venduto_online && (
                          <input
                            type="number"
                            step="0.01"
                            value={formData.prezzo_vendita_online}
                            onChange={(e) => setFormData({ ...formData, prezzo_vendita_online: e.target.value })}
                            placeholder="0.00"
                            className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                            required={formData.venduto_online}
                          />
                        )}
                        {!formData.venduto_online && (
                          <div className="neumorphic-pressed px-4 py-3 rounded-xl text-slate-400 text-sm">
                            Non venduto online
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <input
                            type="checkbox"
                            id="venduto_offline"
                            checked={formData.venduto_offline}
                            onChange={(e) => setFormData({ ...formData, venduto_offline: e.target.checked })}
                            className="w-4 h-4 rounded"
                          />
                          <label htmlFor="venduto_offline" className="text-sm font-medium text-[#6b6b6b] flex items-center gap-2">
                            <Euro className="w-4 h-4" />
                            Venduto Offline
                          </label>
                        </div>
                        {formData.venduto_offline && (
                          <input
                            type="number"
                            step="0.01"
                            value={formData.prezzo_vendita_offline}
                            onChange={(e) => setFormData({ ...formData, prezzo_vendita_offline: e.target.value })}
                            placeholder="0.00"
                            className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                            required={formData.venduto_offline}
                          />
                        )}
                        {!formData.venduto_offline && (
                          <div className="neumorphic-pressed px-4 py-3 rounded-xl text-slate-400 text-sm">
                            Non venduto offline
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Costi Preview - Only show if not semilavorato */}
                {!formData.is_semilavorato && formData.ingredienti.length > 0 && (formData.venduto_online || formData.venduto_offline) && (
                  <div className="neumorphic-flat p-6 rounded-xl bg-blue-50">
                    <h3 className="text-lg font-bold text-blue-800 mb-4">📊 Analisi Costi</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="neumorphic-pressed p-4 rounded-lg text-center">
                        <p className="text-sm text-[#9b9b9b] mb-1">Costo Unitario</p>
                        <p className="text-2xl font-bold text-[#8b7355]">
                          €{getCostoPreview().toFixed(2)}
                        </p>
                      </div>

                      {formData.venduto_online && formData.prezzo_vendita_online && (
                        <div className="neumorphic-pressed p-4 rounded-lg text-center">
                          <p className="text-sm text-[#9b9b9b] mb-1">Margine Online</p>
                          <p className="text-2xl font-bold text-green-600">
                            €{(parseFloat(formData.prezzo_vendita_online) - getCostoPreview()).toFixed(2)}
                          </p>
                        </div>
                      )}

                      {formData.venduto_offline && formData.prezzo_vendita_offline && (
                        <div className="neumorphic-pressed p-4 rounded-lg text-center">
                          <p className="text-sm text-[#9b9b9b] mb-1">Margine Offline</p>
                          <p className="text-2xl font-bold text-green-600">
                            €{(parseFloat(formData.prezzo_vendita_offline) - getCostoPreview()).toFixed(2)}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {formData.venduto_online && formData.prezzo_vendita_online && (
                        <>
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
                          
                          {deliveryFeePercentage > 0 && (
                            <div className="neumorphic-pressed p-4 rounded-lg">
                              <p className="text-sm text-[#9b9b9b] mb-2">FC Online (Netto Fees {deliveryFeePercentage}%)</p>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 neumorphic-pressed rounded-full overflow-hidden">
                                  <div
                                    className={`h-full ${
                                      calculateNetFoodCost(getCostoPreview(), parseFloat(formData.prezzo_vendita_online)) < 30 
                                        ? 'bg-green-600' 
                                        : calculateNetFoodCost(getCostoPreview(), parseFloat(formData.prezzo_vendita_online)) < 40
                                        ? 'bg-yellow-600'
                                        : 'bg-red-600'
                                    }`}
                                    style={{ width: `${Math.min(calculateNetFoodCost(getCostoPreview(), parseFloat(formData.prezzo_vendita_online)), 100)}%` }}
                                  />
                                </div>
                                <span className="font-bold text-[#6b6b6b] min-w-[60px]">
                                  {calculateNetFoodCost(getCostoPreview(), parseFloat(formData.prezzo_vendita_online)).toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {formData.venduto_offline && formData.prezzo_vendita_offline && (
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
                      )}
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
                <div className="space-y-3">
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
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="trasportabile"
                      checked={formData.trasportabile}
                      onChange={(e) => setFormData({ ...formData, trasportabile: e.target.checked })}
                      className="w-5 h-5 rounded"
                    />
                    <label htmlFor="trasportabile" className="text-sm font-medium text-[#6b6b6b]">
                      Prodotto trasportabile tra negozi
                    </label>
                  </div>
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

      {/* Food Cost Configuration Modal */}
      {showFoodCostModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <NeumorphicCard className="max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-800">Configurazione Food Cost</h2>
              <button
                onClick={() => setShowFoodCostModal(false)}
                className="neumorphic-flat p-2 rounded-lg hover:bg-red-50 transition-colors"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Fee Delivery (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={deliveryFeePercentage}
                  onChange={(e) => setDeliveryFeePercentage(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                />
                <p className="text-xs text-slate-500 mt-2">
                  Le fee delle piattaforme delivery che impattano sul food cost online netto
                </p>
              </div>

              <div className="neumorphic-flat p-4 rounded-xl bg-blue-50">
                <p className="text-sm font-medium text-blue-800 mb-2">Esempio:</p>
                <p className="text-xs text-slate-600">
                  Prodotto venduto a 10€ con costo di 2€ e fee del 20%:
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  • Food Cost: 20% (2€/10€)
                </p>
                <p className="text-xs text-slate-600">
                  • Food Cost Netto: 25% (2€/8€)
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <NeumorphicButton
                  onClick={() => setShowFoodCostModal(false)}
                  className="flex-1"
                >
                  Annulla
                </NeumorphicButton>
                <NeumorphicButton
                  onClick={handleSaveFee}
                  variant="primary"
                  className="flex-1"
                >
                  Salva
                </NeumorphicButton>
              </div>
            </div>
          </NeumorphicCard>
        </div>
      )}

      {/* Recipe Detail Modal */}
      {viewingRecipe && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <NeumorphicCard className="max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-[#6b6b6b]">{viewingRecipe.nome_prodotto}</h2>
              <button
                onClick={() => setViewingRecipe(null)}
                className="neumorphic-flat p-2 rounded-lg hover:bg-red-50 transition-colors"
              >
                <X className="w-5 h-5 text-[#9b9b9b]" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="neumorphic-pressed p-4 rounded-xl text-center">
                  <p className="text-xs text-[#9b9b9b] mb-1">Costo Unitario</p>
                  <p className="text-xl font-bold text-blue-600">€{viewingRecipe.costo_unitario?.toFixed(2)}</p>
                </div>
                <div className="neumorphic-pressed p-4 rounded-xl text-center">
                  <p className="text-xs text-[#9b9b9b] mb-1">Prezzo Online</p>
                  <p className="text-xl font-bold text-green-600">€{viewingRecipe.prezzo_vendita_online?.toFixed(2)}</p>
                </div>
                <div className="neumorphic-pressed p-4 rounded-xl text-center">
                  <p className="text-xs text-[#9b9b9b] mb-1">FC Online</p>
                  <p className="text-xl font-bold text-purple-600">{viewingRecipe.food_cost_online?.toFixed(1)}%</p>
                </div>
                <div className="neumorphic-pressed p-4 rounded-xl text-center">
                  <p className="text-xs text-[#9b9b9b] mb-1">Margine Online</p>
                  <p className="text-xl font-bold text-green-600">€{viewingRecipe.margine_online?.toFixed(2)}</p>
                </div>
              </div>

              {/* Ingredients */}
              <div className="neumorphic-flat p-6 rounded-xl">
                <h3 className="text-lg font-bold text-[#6b6b6b] mb-4">Ingredienti ({viewingRecipe.ingredienti?.length || 0})</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-blue-600">
                        <th className="text-left p-3 text-slate-600 font-medium text-sm">Ingrediente</th>
                        <th className="text-right p-3 text-slate-600 font-medium text-sm">Quantità</th>
                        <th className="text-right p-3 text-slate-600 font-medium text-sm">Prezzo/Unità</th>
                        <th className="text-right p-3 text-slate-600 font-medium text-sm">Costo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewingRecipe.ingredienti?.map((ing, idx) => {
                        const costoIngrediente = calculateIngredientCost(ing);
                        return (
                          <tr key={idx} className="border-b border-slate-200">
                            <td className="p-3">
                              <div>
                                <p className="text-sm font-medium text-slate-800">{ing.nome_prodotto}</p>
                                {ing.is_semilavorato && (
                                  <span className="text-xs text-purple-600">Semilavorato</span>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-right text-slate-700 text-sm">
                              {ing.quantita} {ing.unita_misura}
                            </td>
                            <td className="p-3 text-right text-slate-600 text-sm">
                              €{ing.prezzo_unitario?.toFixed(2)}
                            </td>
                            <td className="p-3 text-right font-bold text-blue-600 text-sm">
                              €{costoIngrediente.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="border-t-2 border-blue-600 font-bold">
                        <td colSpan="3" className="p-3 text-right text-slate-800">TOTALE COSTO:</td>
                        <td className="p-3 text-right text-blue-600 text-lg">
                          €{viewingRecipe.costo_unitario?.toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {viewingRecipe.note && (
                <div className="neumorphic-pressed p-4 rounded-xl bg-yellow-50">
                  <p className="text-sm text-slate-700"><strong>Note:</strong> {viewingRecipe.note}</p>
                </div>
              )}
            </div>
          </NeumorphicCard>
        </div>
      )}
    </div>
  );
}