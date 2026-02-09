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

  // ... rest of logic from Ricette.js (all functions)
  
  return (
    <div className="space-y-4 lg:space-y-6">
      <p className="text-sm text-slate-500">Contenuto Ricette - in sviluppo</p>
    </div>
  );
}