import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Plus, AlertTriangle, CheckCircle } from "lucide-react";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage";
import moment from "moment";

export default function Uscite() {
  const [formData, setFormData] = useState({
    dipendente_id: "",
    dipendente_nome: "",
    tipo_uscita: "dimissioni",
    data_uscita: "",
    turni_futuri_liberi: false,
    note: ""
  });
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: allUsers = [] } = useQuery({
    queryKey: ["users-list"],
    queryFn: () => base44.entities.User.list()
  });

  const { data: uscite = [] } = useQuery({
    queryKey: ["uscite"],
    queryFn: () => base44.entities.Uscita.list("-registrato_il", 100)
  });

  const { data: turni = [] } = useQuery({
    queryKey: ["turni-all"],
    queryFn: () => base44.entities.TurnoPlanday.list()
  });

  const createUscitaMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke("registraUscitaDipendente", {
        dipendente_id: data.dipendente_id,
        dipendente_nome: data.dipendente_nome,
        tipo_uscita: data.tipo_uscita,
        data_uscita: data.data_uscita,
        turni_futuri_liberi: data.turni_futuri_liberi,
        note: data.note
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["uscite"] });
      queryClient.invalidateQueries({ queryKey: ["turni-all"] });
      setFormData({
        dipendente_id: "",
        dipendente_nome: "",
        tipo_uscita: "dimissioni",
        data_uscita: "",
        turni_futuri_liberi: false,
        note: ""
      });
      setShowForm(false);
    }
  });

  const deleteUscitaMutation = useMutation({
    mutationFn: (uscitaId) => base44.entities.Uscita.delete(uscitaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["uscite"] });
      queryClient.invalidateQueries({ queryKey: ["turni-all"] });
    }
  });

  const dipendenteAttivi = useMemo(() => {
    return allUsers
      .filter(u => u.user_type === 'dipendente' || u.user_type === 'user')
      .filter(u => !uscite.some(usc => usc.dipendente_id === u.id))
      .sort((a, b) => (a.nome_cognome || a.full_name).localeCompare(b.nome_cognome || b.full_name));
  }, [allUsers, uscite]);

  const handleSelectDipendente = (userId) => {
    const dipendente = allUsers.find(u => u.id === userId);
    if (dipendente) {
      setFormData(prev => ({
        ...prev,
        dipendente_id: dipendente.id,
        dipendente_nome: dipendente.nome_cognome || dipendente.full_name
      }));
    }
  };

  const handleSubmit = () => {
    if (!formData.dipendente_id || !formData.data_uscita) {
      alert("Seleziona dipendente e data uscita");
      return;
    }
    createUscitaMutation.mutate(formData);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setFormData({
      dipendente_id: "",
      dipendente_nome: "",
      tipo_uscita: "dimissioni",
      data_uscita: "",
      turni_futuri_liberi: false,
      note: ""
    });
  };

  const getTurniLiberatiCount = (uscita) => {
    if (!uscita.turni_futuri_liberi) return 0;
    const dataUscita = moment(uscita.data_uscita);
    const turniDopo = turni.filter(
      t => t.dipendente_id === uscita.dipendente_id && moment(t.data).isSameOrAfter(dataUscita)
    );
    return turniDopo.length;
  };

  return (
    <ProtectedPage pageName="Uscite">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent mb-2">
              Gestione Uscite Dipendenti
            </h1>
            <p className="text-slate-500">Registra licenziamenti e dimissioni</p>
          </div>
          <NeumorphicButton
            onClick={() => setShowForm(true)}
            variant="primary"
            className="flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Registra Uscita
          </NeumorphicButton>
        </div>

        {showForm && (
          <NeumorphicCard className="p-6 border-2 border-blue-200">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Nuova Uscita</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Dipendente
                </label>
                <Select value={formData.dipendente_id} onValueChange={handleSelectDipendente}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleziona dipendente" />
                  </SelectTrigger>
                  <SelectContent>
                    {dipendenteAttivi.map(dip => (
                      <SelectItem key={dip.id} value={dip.id}>
                        {dip.nome_cognome || dip.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Tipo di Uscita
                  </label>
                  <Select
                    value={formData.tipo_uscita}
                    onValueChange={(value) =>
                      setFormData(prev => ({ ...prev, tipo_uscita: value }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dimissioni">Dimissioni</SelectItem>
                      <SelectItem value="licenziamento">Licenziamento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Data Uscita
                  </label>
                  <Input
                    type="date"
                    value={formData.data_uscita}
                    onChange={(e) =>
                      setFormData(prev => ({ ...prev, data_uscita: e.target.value }))
                    }
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Note
                </label>
                <Input
                  placeholder="Note sulla motivazione..."
                  value={formData.note}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, note: e.target.value }))
                  }
                  className="w-full"
                />
              </div>

              <div className="flex items-center gap-3 p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                <Checkbox
                  checked={formData.turni_futuri_liberi}
                  onCheckedChange={(checked) =>
                    setFormData(prev => ({ ...prev, turni_futuri_liberi: checked }))
                  }
                />
                <div>
                  <label className="text-sm font-medium text-slate-700 cursor-pointer">
                    Libera tutti i turni futuri
                  </label>
                  <p className="text-xs text-slate-500 mt-1">
                    Se abilitato, tutti i turni assegnati da questa data diventeranno non assegnati
                  </p>
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={handleCancelForm}
                  className="px-6"
                >
                  Annulla
                </Button>
                <NeumorphicButton
                  onClick={handleSubmit}
                  variant="primary"
                  disabled={createUscitaMutation.isPending}
                  className="px-6"
                >
                  {createUscitaMutation.isPending ? "Registrando..." : "Registra"}
                </NeumorphicButton>
              </div>
            </div>
          </NeumorphicCard>
        )}

        <div className="grid gap-4">
          {uscite.length === 0 ? (
            <NeumorphicCard className="p-8 text-center">
              <p className="text-slate-500">Nessuna uscita registrata</p>
            </NeumorphicCard>
          ) : (
            uscite.map(uscita => {
              const dipendente = allUsers.find(u => u.id === uscita.dipendente_id);
              return (
                <NeumorphicCard key={uscita.id} className="p-4 hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {uscita.tipo_uscita === "licenziamento" ? (
                          <AlertTriangle className="w-5 h-5 text-red-600" />
                        ) : (
                          <CheckCircle className="w-5 h-5 text-blue-600" />
                        )}
                        <h3 className="text-lg font-bold text-slate-800">
                          {uscita.dipendente_nome}
                        </h3>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-slate-500">Tipo</p>
                          <p className="font-medium text-slate-700 capitalize">
                            {uscita.tipo_uscita}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Data Uscita</p>
                          <p className="font-medium text-slate-700">
                            {moment(uscita.data_uscita).format("DD/MM/YYYY")}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Turni Liberati</p>
                          <p className="font-medium text-slate-700">
                            {uscita.turni_futuri_liberi ? getTurniLiberatiCount(uscita) : "No"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Registrato</p>
                          <p className="font-medium text-slate-700">
                            {moment(uscita.registrato_il).format("DD/MM/YYYY")}
                          </p>
                        </div>
                      </div>
                      {uscita.note && (
                        <p className="text-sm text-slate-600 mt-3 p-2 bg-slate-50 rounded">
                          {uscita.note}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => deleteUscitaMutation.mutate(uscita.id)}
                      className="nav-button p-2 hover:bg-red-50 text-red-600"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </NeumorphicCard>
              );
            })
          )}
        </div>
      </div>
    </ProtectedPage>
  );
}