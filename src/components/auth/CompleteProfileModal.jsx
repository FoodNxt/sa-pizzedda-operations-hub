import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { User, CheckCircle, AlertCircle } from 'lucide-react';
import NeumorphicCard from '../neumorphic/NeumorphicCard';

export default function CompleteProfileModal({ user, onComplete }) {
  const [nomeCognome, setNomeCognome] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  // Pre-fill with Google name if available
  useEffect(() => {
    if (user?.full_name) {
      setNomeCognome(user.full_name);
    }
  }, [user]);

  const verifyUpdate = async (expectedName, maxRetries = 5) => {
    for (let i = 0; i < maxRetries; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      
      const updatedUser = await base44.auth.me();
      
      if (updatedUser.nome_cognome === expectedName && updatedUser.profile_manually_completed === true) {
        return { success: true, user: updatedUser };
      }
      
      console.log(`Verifica ${i + 1}/${maxRetries}: Nome attuale="${updatedUser.nome_cognome}", Atteso="${expectedName}", Completato=${updatedUser.profile_manually_completed}`);
    }
    
    return { success: false };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!nomeCognome.trim()) {
      setError('Il Nome Cognome è obbligatorio');
      return;
    }

    if (nomeCognome.trim().length < 3) {
      setError('Il Nome Cognome deve avere almeno 3 caratteri');
      return;
    }

    try {
      setSaving(true);
      setRetryCount(prev => prev + 1);

      const trimmedName = nomeCognome.trim();

      console.log('💾 Tentativo salvataggio:', { nome_cognome: trimmedName, attempt: retryCount + 1 });

      // MULTIPLE SAVE ATTEMPTS
      for (let attempt = 1; attempt <= 3; attempt++) {
        console.log(`🔄 Salvataggio tentativo ${attempt}/3...`);
        
        await base44.auth.updateMe({
          nome_cognome: trimmedName,
          profile_manually_completed: true
        });

        await new Promise(resolve => setTimeout(resolve, 500));
      }

      console.log('✅ Salvataggio completato, inizio verifica...');

      // Verify with retries
      const verification = await verifyUpdate(trimmedName, 5);
      
      if (!verification.success) {
        throw new Error(
          `❌ ERRORE CRITICO: Il nome non è stato salvato correttamente dopo 5 tentativi.\n\n` +
          `Nome inserito: "${trimmedName}"\n` +
          `Prova a:\n` +
          `1. Ricaricare la pagina (F5)\n` +
          `2. Fare logout e re-login\n` +
          `3. Modificare il nome dalla pagina "Profilo" dopo il login\n` +
          `4. Contattare l'amministratore`
        );
      }

      console.log('✅ Verifica completata con successo!');
      
      onComplete();

    } catch (error) {
      console.error('❌ Errore durante il salvataggio:', error);
      setError(error.message || 'Errore durante il salvataggio. Riprova.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <NeumorphicCard className="max-w-md w-full p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 rounded-full neumorphic-flat mx-auto mb-4 flex items-center justify-center">
            <User className="w-10 h-10 text-[#8b7355]" />
          </div>
          <h2 className="text-2xl font-bold text-[#6b6b6b] mb-2">
            Completa il tuo Profilo
          </h2>
          <p className="text-[#9b9b9b] text-sm">
            Inserisci il tuo Nome Cognome come appare nel sistema aziendale
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
              Nome Cognome <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={nomeCognome}
              onChange={(e) => setNomeCognome(e.target.value)}
              placeholder="es. Mario Rossi"
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
              disabled={saving}
              autoFocus
              required
            />
            <p className="text-xs text-[#9b9b9b] mt-1">
              Verrà usato per il matching automatico con i turni, recensioni e ritardi
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="neumorphic-pressed p-3 rounded-lg bg-red-50 max-h-40 overflow-y-auto">
              <div className="flex items-start gap-2 text-red-700 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p className="whitespace-pre-wrap">{error}</p>
              </div>
            </div>
          )}

          {/* Current Info */}
          <div className="neumorphic-pressed p-3 rounded-lg">
            <p className="text-xs text-[#9b9b9b] mb-1">Account email:</p>
            <p className="text-sm text-[#6b6b6b] font-medium">{user?.email}</p>
            {user?.full_name && (
              <p className="text-xs text-[#9b9b9b] mt-2">
                Nome da Google: <span className="text-[#6b6b6b] line-through">{user.full_name}</span>
                <span className="text-red-600 ml-1">(verrà sostituito)</span>
              </p>
            )}
            {retryCount > 0 && (
              <p className="text-xs text-yellow-600 mt-2">
                Tentativi effettuati: {retryCount}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={saving || !nomeCognome.trim()}
            className={`
              w-full neumorphic-flat px-6 py-4 rounded-xl font-bold text-lg
              transition-all flex items-center justify-center gap-3
              ${saving || !nomeCognome.trim()
                ? 'opacity-50 cursor-not-allowed text-[#9b9b9b]'
                : 'text-[#8b7355] hover:shadow-lg'
              }
            `}
          >
            {saving ? (
              <>
                <div className="w-5 h-5 border-2 border-[#8b7355] border-t-transparent rounded-full animate-spin" />
                Salvataggio e verifica in corso...
              </>
            ) : (
              <>
                <CheckCircle className="w-6 h-6" />
                Salva Nome
              </>
            )}
          </button>
        </form>

        {/* Footer Note */}
        <div className="mt-6 text-center">
          <p className="text-xs text-[#9b9b9b]">
            Dopo il salvataggio, potrai modificare il nome dalla pagina "Profilo"
          </p>
        </div>
      </NeumorphicCard>
    </div>
  );
}