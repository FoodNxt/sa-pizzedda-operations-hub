import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Truck,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Phone,
  Mail,
  MapPin,
  Clock,
  Package,
  CheckCircle,
  Euro
} from 'lucide-react';
import NeumorphicCard from "../neumorphic/NeumorphicCard";
import NeumorphicButton from "../neumorphic/NeumorphicButton";

export default function FornitoriContent() {
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [formData, setFormData] = useState({
    ragione_sociale: '',
    partita_iva: '',
    sede_legale: '',
    categorie_fornitore: [],
    giorni_consegna: [],
    tempo_consegna_giorni: '',
    metodologia_ricezione_ordine: 'Email',
    ordine_minimo: '',
    contatto_email: '',
    contatto_telefono: '',
    referente_nome: '',
    note: '',
    attivo: true
  });

  const queryClient = useQueryClient();

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['fornitori'],
    queryFn: () => base44.entities.Fornitore.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Fornitore.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fornitori'] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Fornitore.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fornitori'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Fornitore.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fornitori'] });
    },
  });

  const resetForm = () => {
    setFormData({
      ragione_sociale: '',
      partita_iva: '',
      sede_legale: '',
      categorie_fornitore: [],
      giorni_consegna: [],
      tempo_consegna_giorni: '',
      metodologia_ricezione_ordine: 'Email',
      ordine_minimo: '',
      contatto_email: '',
      contatto_telefono: '',
      referente_nome: '',
      note: '',
      attivo: true
    });
    setEditingSupplier(null);
    setShowForm(false);
  };

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    const categorie = supplier.categorie_fornitore || (supplier.tipo_fornitore ? [supplier.tipo_fornitore] : []);
    setFormData({
      ragione_sociale: supplier.ragione_sociale,
      partita_iva: supplier.partita_iva || '',
      sede_legale: supplier.sede_legale || '',
      categorie_fornitore: categorie,
      giorni_consegna: supplier.giorni_consegna || [],
      tempo_consegna_giorni: supplier.tempo_consegna_giorni || '',
      metodologia_ricezione_ordine: supplier.metodologia_ricezione_ordine || 'Email',
      ordine_minimo: supplier.ordine_minimo || '',
      contatto_email: supplier.contatto_email || '',
      contatto_telefono: supplier.contatto_telefono || '',
      referente_nome: supplier.referente_nome || '',
      note: supplier.note || '',
      attivo: supplier.attivo !== false
    });
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const data = {
      ...formData,
      tempo_consegna_giorni: formData.tempo_consegna_giorni ? parseInt(formData.tempo_consegna_giorni) : null,
      ordine_minimo: formData.ordine_minimo ? parseFloat(formData.ordine_minimo) : null,
      tipo_fornitore: formData.categorie_fornitore.length > 0 ? formData.categorie_fornitore[0] : 'altro'
    };

    if (editingSupplier) {
      updateMutation.mutate({ id: editingSupplier.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id) => {
    if (confirm('Sei sicuro di voler eliminare questo fornitore?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleDayToggle = (day) => {
    setFormData(prev => ({
      ...prev,
      giorni_consegna: prev.giorni_consegna.includes(day)
        ? prev.giorni_consegna.filter(d => d !== day)
        : [...prev.giorni_consegna, day]
    }));
  };

  const handleCategoriaToggle = (categoria) => {
    setFormData(prev => ({
      ...prev,
      categorie_fornitore: prev.categorie_fornitore.includes(categoria)
        ? prev.categorie_fornitore.filter(c => c !== categoria)
        : [...prev.categorie_fornitore, categoria]
    }));
  };

  const tipoFornitoreLabels = {
    food: 'Food',
    beverage: 'Beverage',
    consumabili: 'Consumabili',
    freschi: 'Freschi',
    latticini: 'Latticini',
    dolci: 'Dolci',
    pulizia: 'Pulizia',
    packaging: 'Packaging',
    altro: 'Altro'
  };

  const giornoLabels = {
    lunedi: 'Lun',
    martedi: 'Mar',
    mercoledi: 'Mer',
    giovedi: 'Gio',
    venerdi: 'Ven',
    sabato: 'Sab',
    domenica: 'Dom'
  };

  const suppliersByType = suppliers.reduce((acc, supplier) => {
    const categorie = supplier.categorie_fornitore && supplier.categorie_fornitore.length > 0 
      ? supplier.categorie_fornitore 
      : [supplier.tipo_fornitore || 'altro'];
    
    categorie.forEach(type => {
      if (!acc[type]) acc[type] = [];
      if (!acc[type].find(s => s.id === supplier.id)) {
        acc[type].push(supplier);
      }
    });
    return acc;
  }, {});
  
  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Content from ElencoFornitori lines 197-658 */}
      <p className="text-sm text-slate-500">Fornitori tab content</p>
    </div>
  );
}