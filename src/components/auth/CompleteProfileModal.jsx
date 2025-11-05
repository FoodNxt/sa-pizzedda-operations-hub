import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { User, CheckCircle, AlertCircle } from 'lucide-react';
import NeumorphicCard from '../neumorphic/NeumorphicCard';

export default function CompleteProfileModal({ user, onComplete }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill with Google name if available
  useEffect(() => {
    if (user?.full_name && user.full_name.includes(' ')) {
      const parts = user.full_name.split(' ');
      setFirstName(parts[0]);
      setLastName(parts.slice(1).join(' '));
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!firstName.trim() || !lastName.trim()) {
      setError('Nome e cognome sono obbligatori');
      return;
    }

    if (firstName.trim().length < 2) {
      setError('Il nome deve avere almeno 2 caratteri');
      return;
    }

    if (lastName.trim().length < 2) {
      setError('Il cognome deve avere almeno 2 caratteri');
      return;
    }

    try {
      setSaving(true);

      // Combine first and last name
      const fullName = `${firstName.trim()} ${lastName.trim()}`;

      // Update user profile AND mark as manually completed
      await base44.auth.updateMe({
        full_name: fullName,
        profile_manually_completed: true
      });

      // Small delay to ensure the update is processed
      await new Promise(resolve => setTimeout(resolve, 500));

      // Notify parent component
      onComplete();
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Errore durante il salvataggio. Riprova.');
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
            Conferma o modifica il tuo nome e cognome
          </p>
        </div>

        {/* Info Box */}
        <div className="neumorphic-pressed p-4 rounded-xl mb-6 bg-blue-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Importante!</p>
              <p className="text-xs">
                Il nome e cognome che inserisci QUI verranno salvati e utilizzati per associare 
                turni e recensioni. Inserisci il nome esattamente come compare nel sistema aziendale.
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
              Nome <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="es. Mario"
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
              disabled={saving}
              autoFocus
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
              Cognome <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="es. Rossi"
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
              disabled={saving}
              required
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="neumorphic-pressed p-3 rounded-lg bg-red-50">
              <div className="flex items-center gap-2 text-red-700 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <p>{error}</p>
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
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={saving || !firstName.trim() || !lastName.trim()}
            className={`
              w-full neumorphic-flat px-6 py-4 rounded-xl font-bold text-lg
              transition-all flex items-center justify-center gap-3
              ${saving || !firstName.trim() || !lastName.trim()
                ? 'opacity-50 cursor-not-allowed text-[#9b9b9b]'
                : 'text-[#8b7355] hover:shadow-lg'
              }
            `}
          >
            {saving ? (
              <>
                <div className="w-5 h-5 border-2 border-[#8b7355] border-t-transparent rounded-full animate-spin" />
                Salvataggio...
              </>
            ) : (
              <>
                <CheckCircle className="w-6 h-6" />
                Salva e Continua
              </>
            )}
          </button>
        </form>

        {/* Footer Note */}
        <div className="mt-6 text-center">
          <p className="text-xs text-[#9b9b9b]">
            Dopo aver salvato, potrai modificare il nome dalla Dashboard → Data → User
          </p>
        </div>
      </NeumorphicCard>
    </div>
  );
}