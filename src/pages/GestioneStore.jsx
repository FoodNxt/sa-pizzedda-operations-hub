import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPin, Plus, Pencil, Trash2, X, Check, Store as StoreIcon } from "lucide-react";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";

const emptyStore = {
  name: "", address: "", city: "", phone: "", status: "active",
  manager_name: "", store_manager_id: "", latitude: "", longitude: "", opening_date: ""
};

export default function GestioneStore() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyStore);
  const [showForm, setShowForm] = useState(false);

  const { data: stores = [], isLoading } = useQuery({
    queryKey: ["stores-admin"],
    queryFn: () => base44.entities.Store.list()
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users-for-stores"],
    queryFn: () => base44.entities.User.list()
  });

  const storeManagers = users.filter(u =>
    u.ruoli_dipendente?.includes("Store Manager") || u.user_type === "manager"
  );

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        ...data,
        latitude: data.latitude ? Number(data.latitude) : undefined,
        longitude: data.longitude ? Number(data.longitude) : undefined
      };
      if (editing) {
        return base44.entities.Store.update(editing, payload);
      }
      return base44.entities.Store.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stores-admin"] });
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Store.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["stores-admin"] })
  });

  const resetForm = () => {
    setForm(emptyStore);
    setEditing(null);
    setShowForm(false);
  };

  const startEdit = (store) => {
    setForm({
      name: store.name || "",
      address: store.address || "",
      city: store.city || "",
      phone: store.phone || "",
      status: store.status || "active",
      manager_name: store.manager_name || "",
      store_manager_id: store.store_manager_id || "",
      latitude: store.latitude || "",
      longitude: store.longitude || "",
      opening_date: store.opening_date || ""
    });
    setEditing(store.id);
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.address) return;
    saveMutation.mutate(form);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: "#000" }}>Gestione Store</h1>
          <p style={{ color: "#000" }}>Aggiungi, modifica o rimuovi i locali</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="neumorphic-flat px-4 py-2 rounded-lg flex items-center gap-2 text-white bg-blue-600 hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Nuovo Store
        </button>
      </div>

      {showForm && (
        <NeumorphicCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-700">
              {editing ? "Modifica Store" : "Nuovo Store"}
            </h2>
            <button onClick={resetForm} className="p-2 hover:bg-slate-100 rounded-lg">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-500 mb-1 block">Nome *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none" required />
            </div>
            <div>
              <label className="text-sm text-slate-500 mb-1 block">Indirizzo *</label>
              <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none" required />
            </div>
            <div>
              <label className="text-sm text-slate-500 mb-1 block">Città</label>
              <input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none" />
            </div>
            <div>
              <label className="text-sm text-slate-500 mb-1 block">Telefono</label>
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none" />
            </div>
            <div>
              <label className="text-sm text-slate-500 mb-1 block">Stato</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none">
                <option value="active">Attivo</option>
                <option value="inactive">Inattivo</option>
                <option value="maintenance">Manutenzione</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-500 mb-1 block">Store Manager</label>
              <select value={form.store_manager_id} onChange={e => {
                const sm = storeManagers.find(u => u.id === e.target.value);
                setForm({ ...form, store_manager_id: e.target.value, manager_name: sm?.full_name || sm?.nome_cognome || "" });
              }} className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none">
                <option value="">-- Nessuno --</option>
                {storeManagers.map(u => (
                  <option key={u.id} value={u.id}>{u.full_name || u.nome_cognome || u.email}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-500 mb-1 block">Data Apertura</label>
              <input type="date" value={form.opening_date} onChange={e => setForm({ ...form, opening_date: e.target.value })}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none" />
            </div>
            <div className="flex items-end">
              <button type="submit" disabled={saveMutation.isPending}
                className="neumorphic-flat px-6 py-3 rounded-lg flex items-center gap-2 text-white bg-green-600 hover:bg-green-700 transition-colors">
                <Check className="w-4 h-4" />
                {saveMutation.isPending ? "Salvataggio..." : editing ? "Aggiorna" : "Crea Store"}
              </button>
            </div>
          </form>
        </NeumorphicCard>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-slate-400">Caricamento...</div>
      ) : stores.length === 0 ? (
        <div className="text-center py-12 text-slate-400">Nessuno store trovato</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stores.map(store => (
            <NeumorphicCard key={store.id} className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-700">{store.name}</h3>
                    <p className="text-sm text-slate-500">{store.address}{store.city ? `, ${store.city}` : ""}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => startEdit(store)} className="p-2 hover:bg-slate-100 rounded-lg">
                    <Pencil className="w-4 h-4 text-slate-500" />
                  </button>
                  <button onClick={() => { if (confirm(`Eliminare "${store.name}"?`)) deleteMutation.mutate(store.id); }}
                    className="p-2 hover:bg-red-50 rounded-lg">
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-slate-400">Stato:</span>{" "}
                  <span className={store.status === "active" ? "text-green-600 font-medium" : "text-red-500 font-medium"}>
                    {store.status === "active" ? "Attivo" : store.status === "inactive" ? "Inattivo" : "Manutenzione"}
                  </span>
                </div>
                {store.phone && <div><span className="text-slate-400">Tel:</span> {store.phone}</div>}
                {store.manager_name && <div><span className="text-slate-400">SM:</span> {store.manager_name}</div>}
                {store.opening_date && <div><span className="text-slate-400">Apertura:</span> {new Date(store.opening_date).toLocaleDateString("it-IT")}</div>}
              </div>
            </NeumorphicCard>
          ))}
        </div>
      )}
    </div>
  );
}