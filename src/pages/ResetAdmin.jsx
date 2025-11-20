import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function ResetAdmin() {
  const [status, setStatus] = useState('resetting');
  const [error, setError] = useState(null);

  useEffect(() => {
    const resetToAdmin = async () => {
      try {
        await base44.functions.invoke('resetToAdmin');
        setStatus('success');
        
        // Redirect to Dashboard after 1 second
        setTimeout(() => {
          window.location.href = createPageUrl('Dashboard');
        }, 1000);
      } catch (err) {
        console.error('Reset error:', err);
        setError(err.message);
        setStatus('error');
      }
    };

    resetToAdmin();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
        {status === 'resetting' && (
          <>
            <Loader2 className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-spin" />
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Ripristino Vista Admin...</h1>
            <p className="text-slate-600">Attendere prego</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Ripristino Completato!</h1>
            <p className="text-slate-600">Reindirizzamento alla Dashboard...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Errore</h1>
            <p className="text-slate-600 mb-4">{error || 'Si è verificato un errore'}</p>
            <a 
              href={createPageUrl('Dashboard')}
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Vai alla Dashboard
            </a>
          </>
        )}
      </div>
    </div>
  );
}