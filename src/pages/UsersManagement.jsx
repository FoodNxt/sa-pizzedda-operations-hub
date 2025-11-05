import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Edit,
  Save,
  X,
  Shield,
  User,
  Mail,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";

export default function UsersManagement() {
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    full_name: '',
    user_type: 'dipendente'
  });

  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list('-created_date'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditingUser(null);
    },
  });

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      full_name: user.full_name || '',
      user_type: user.user_type || 'dipendente'
    });
  };

  const handleSave = () => {
    if (!formData.full_name.trim()) {
      alert('Il nome è obbligatorio');
      return;
    }

    updateMutation.mutate({
      id: editingUser.id,
      data: formData
    });
  };

  const handleCancel = () => {
    setEditingUser(null);
    setFormData({ full_name: '', user_type: 'dipendente' });
  };

  const getUserTypeLabel = (type) => {
    switch(type) {
      case 'admin': return 'Amministratore';
      case 'manager': return 'Manager';
      case 'dipendente': return 'Dipendente';
      default: return 'N/A';
    }
  };

  const getUserTypeColor = (type) => {
    switch(type) {
      case 'admin': return 'bg-red-100 text-red-700';
      case 'manager': return 'bg-blue-100 text-blue-700';
      case 'dipendente': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <Users className="w-10 h-10 text-[#8b7355]" />
          <h1 className="text-3xl font-bold text-[#6b6b6b]">Gestione Utenti</h1>
        </div>
        <p className="text-[#9b9b9b]">Visualizza e modifica gli utenti del sistema</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Users className="w-8 h-8 text-[#8b7355]" />
          </div>
          <h3 className="text-3xl font-bold text-[#6b6b6b] mb-1">{users.length}</h3>
          <p className="text-sm text-[#9b9b9b]">Utenti Totali</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Shield className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-3xl font-bold text-red-600 mb-1">
            {users.filter(u => u.user_type === 'admin').length}
          </h3>
          <p className="text-sm text-[#9b9b9b]">Admin</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <User className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-3xl font-bold text-blue-600 mb-1">
            {users.filter(u => u.user_type === 'manager').length}
          </h3>
          <p className="text-sm text-[#9b9b9b]">Manager</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <User className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-3xl font-bold text-green-600 mb-1">
            {users.filter(u => u.user_type === 'dipendente').length}
          </h3>
          <p className="text-sm text-[#9b9b9b]">Dipendenti</p>
        </NeumorphicCard>
      </div>

      {/* Users Table */}
      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-[#6b6b6b] mb-6">Lista Utenti</h2>
        
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-[#9b9b9b]">Caricamento...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-[#9b9b9b] mx-auto mb-4 opacity-50" />
            <p className="text-[#6b6b6b] font-medium">Nessun utente trovato</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-[#8b7355]">
                  <th className="text-left p-3 text-[#9b9b9b] font-medium">Utente</th>
                  <th className="text-left p-3 text-[#9b9b9b] font-medium">Email</th>
                  <th className="text-left p-3 text-[#9b9b9b] font-medium">Tipo</th>
                  <th className="text-center p-3 text-[#9b9b9b] font-medium">Profilo Completato</th>
                  <th className="text-center p-3 text-[#9b9b9b] font-medium">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-[#d1d1d1] hover:bg-[#e8ecf3] transition-colors">
                    <td className="p-3">
                      {editingUser?.id === user.id ? (
                        <input
                          type="text"
                          value={formData.full_name}
                          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                          className="w-full neumorphic-pressed px-3 py-2 rounded-lg text-[#6b6b6b] outline-none"
                          placeholder="Nome Cognome"
                        />
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full neumorphic-flat flex items-center justify-center">
                            <span className="text-sm font-bold text-[#8b7355]">
                              {(user.full_name || user.email || 'U').charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="font-medium text-[#6b6b6b]">
                            {user.full_name || <span className="text-[#9b9b9b] italic">Nome non impostato</span>}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-[#9b9b9b]" />
                        <span className="text-[#6b6b6b]">{user.email}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      {editingUser?.id === user.id ? (
                        <select
                          value={formData.user_type}
                          onChange={(e) => setFormData({ ...formData, user_type: e.target.value })}
                          className="w-full neumorphic-pressed px-3 py-2 rounded-lg text-[#6b6b6b] outline-none"
                        >
                          <option value="dipendente">Dipendente</option>
                          <option value="manager">Manager</option>
                          <option value="admin">Amministratore</option>
                        </select>
                      ) : (
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getUserTypeColor(user.user_type)}`}>
                          {getUserTypeLabel(user.user_type)}
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex justify-center">
                        {user.profile_manually_completed ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <X className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-2">
                        {editingUser?.id === user.id ? (
                          <>
                            <button
                              onClick={handleSave}
                              disabled={updateMutation.isPending}
                              className="neumorphic-flat p-2 rounded-lg hover:bg-green-50 transition-colors disabled:opacity-50"
                              title="Salva"
                            >
                              <Save className="w-4 h-4 text-green-600" />
                            </button>
                            <button
                              onClick={handleCancel}
                              className="neumorphic-flat p-2 rounded-lg hover:bg-red-50 transition-colors"
                              title="Annulla"
                            >
                              <X className="w-4 h-4 text-red-600" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleEdit(user)}
                            className="neumorphic-flat p-2 rounded-lg hover:bg-blue-50 transition-colors"
                            title="Modifica"
                          >
                            <Edit className="w-4 h-4 text-blue-600" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </NeumorphicCard>

      {/* Info Box */}
      <NeumorphicCard className="p-6 bg-blue-50">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">ℹ️ Informazioni</p>
            <ul className="text-xs space-y-1 list-disc list-inside">
              <li>Puoi modificare il nome e il tipo di utente</li>
              <li>Il campo "Profilo Completato" indica se l'utente ha completato manualmente il profilo (protetto da Google)</li>
              <li>Gli utenti <strong>dipendente</strong> hanno accesso limitato solo a Profilo, Foto Locale e Valutazione</li>
              <li>Gli utenti <strong>manager</strong> hanno accesso a tutte le funzioni tranne gestione utenti</li>
              <li>Gli utenti <strong>admin</strong> hanno accesso completo al sistema</li>
            </ul>
          </div>
        </div>
      </NeumorphicCard>
    </div>
  );
}