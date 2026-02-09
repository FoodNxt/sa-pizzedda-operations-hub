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
      <p className="text-sm text-slate-500">Ricette - funzionalità complete in arrivo</p>
    </div>
  );
}