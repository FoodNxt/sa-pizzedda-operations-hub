import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Eye, User, Users, ChefHat, CreditCard } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";

export default function VistaDipendente() {
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedView, setSelectedView] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  const views = [
    {
      id: 'manager',
      title: 'Manager',
      icon: Users,
      color: 'blue',
      description: 'Visualizza l\'app come un Manager con accesso alle sezioni amministrative'
    },
    {
      id: 'dipendente',
      title: 'Dipendente',
      icon: User,
      color: 'purple',
      description: 'Visualizza l\'app come un Dipendente generico'
    },
    {
      id: 'cassiere',
      title: 'Cassiere',
      icon: CreditCard,
      color: 'green',
      description: 'Visualizza l\'app come un Cassiere con le sue specifiche pagine'
    },
    {
      id: 'pizzaiolo',
      title: 'Pizzaiolo',
      icon: ChefHat,
      color: 'orange',
      description: 'Visualizza l\'app come un Pizzaiolo con le sue specifiche pagine'
    }
  ];

  const handleActivateView = async (viewId) => {
    if (!currentUser) return;

    // Determine what to update based on view
    let updateData = {};

    if (viewId === 'manager') {
      updateData = {
        user_type: 'manager',
        ruoli_dipendente: [],
        data_inizio_contratto: new Date().toISOString().split('T')[0]
      };
    } else if (viewId === 'dipendente') {
      updateData = {
        user_type: 'dipendente',
        ruoli_dipendente: [],
        data_inizio_contratto: new Date().toISOString().split('T')[0]
      };
    } else if (viewId === 'cassiere') {
      updateData = {
        user_type: 'dipendente',
        ruoli_dipendente: ['Cassiere'],
        data_inizio_contratto: new Date().toISOString().split('T')[0]
      };
    } else if (viewId === 'pizzaiolo') {
      updateData = {
        user_type: 'dipendente',
        ruoli_dipendente: ['Pizzaiolo'],
        data_inizio_contratto: new Date().toISOString().split('T')[0]
      };
    }

    try {
      await base44.auth.updateMe(updateData);
      
      // Create a signed contract for dipendente views
      if (['dipendente', 'cassiere', 'pizzaiolo'].includes(viewId)) {
        const contratti = await base44.entities.Contratto.filter({ user_id: currentUser.id });
        if (contratti.length > 0) {
          await base44.entities.Contratto.update(contratti[0].id, {
            status: 'firmato',
            firma_dipendente: currentUser.nome_cognome || currentUser.full_name,
            data_firma: new Date().toISOString()
          });
        }
      }
      
      setSelectedView(viewId);
      
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Error updating user view:', error);
      alert('Errore durante l\'aggiornamento della vista');
    }
  };

  const handleResetView = async () => {
    if (!currentUser) return;

    try {
      await base44.auth.updateMe({
        user_type: 'admin',
        ruoli_dipendente: []
      });
      setSelectedView(null);
      
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Error resetting view:', error);
      alert('Errore durante il ripristino della vista');
    }
  };

  const getColorClasses = (color) => {
    const colors = {
      blue: 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
      purple: 'from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700',
      green: 'from-green-500 to-green-600 hover:from-green-600 hover:to-green-700',
      orange: 'from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700'
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Eye className="w-10 h-10 text-[#8b7355]" />
          <h1 className="text-3xl font-bold text-[#6b6b6b]">Vista Dipendente</h1>
        </div>
        <p className="text-[#9b9b9b]">Cambia vista per verificare l'esperienza dei dipendenti</p>
      </div>

      {/* Current User Info */}
      {currentUser && (
        <NeumorphicCard className="p-6 bg-blue-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-blue-900">Vista Attuale</h3>
              <p className="text-sm text-blue-700">
                {currentUser.user_type === 'admin' ? 'Admin' : 
                 currentUser.user_type === 'manager' ? 'Manager' : 
                 currentUser.ruoli_dipendente?.includes('Cassiere') ? 'Cassiere' :
                 currentUser.ruoli_dipendente?.includes('Pizzaiolo') ? 'Pizzaiolo' :
                 'Dipendente'}
              </p>
            </div>
          </div>
        </NeumorphicCard>
      )}

      {/* Views Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {views.map((view) => {
          const Icon = view.icon;
          return (
            <NeumorphicCard key={view.id} className="p-6 hover:shadow-xl transition-all">
              <div className="flex flex-col items-center text-center">
                <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${getColorClasses(view.color)} mb-4 flex items-center justify-center shadow-lg`}>
                  <Icon className="w-10 h-10 text-white" />
                </div>
                
                <h2 className="text-2xl font-bold text-[#6b6b6b] mb-2">{view.title}</h2>
                <p className="text-sm text-[#9b9b9b] mb-6">{view.description}</p>

                <NeumorphicButton
                  onClick={() => handleActivateView(view.id)}
                  variant="primary"
                  className="w-full"
                  disabled={selectedView === view.id}
                >
                  {selectedView === view.id ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Attivazione...
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 mr-2" />
                      Attiva Vista {view.title}
                    </>
                  )}
                </NeumorphicButton>
              </div>
            </NeumorphicCard>
          );
        })}
      </div>

      {/* Reset Button */}
      {currentUser?.user_type !== 'admin' && (
        <NeumorphicCard className="p-6 bg-orange-50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-orange-900 mb-1">Ripristina Vista Admin</h3>
              <p className="text-sm text-orange-700">Torna alla vista amministratore completa</p>
            </div>
            <NeumorphicButton
              onClick={handleResetView}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
            >
              Ripristina Admin
            </NeumorphicButton>
          </div>
        </NeumorphicCard>
      )}

      {/* Info Box */}
      <NeumorphicCard className="p-6 bg-slate-50">
        <h3 className="font-bold text-[#6b6b6b] mb-3">ℹ️ Come Funziona</h3>
        <ul className="space-y-2 text-sm text-[#9b9b9b]">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">1.</span>
            <span>Seleziona una vista per cambiare temporaneamente il tuo ruolo</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">2.</span>
            <span>La pagina si ricaricherà automaticamente con le nuove impostazioni</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">3.</span>
            <span>Verifica che le pagine e le funzionalità siano corrette per quel ruolo</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">4.</span>
            <span>Usa "Ripristina Admin" per tornare alla vista amministratore</span>
          </li>
        </ul>
      </NeumorphicCard>
    </div>
  );
}