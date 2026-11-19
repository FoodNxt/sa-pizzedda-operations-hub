import React from 'react';
import TabellaScarti from '@/components/inventario2/verifica/TabellaScarti';

// Quanto i conteggi dei dipendenti si allontanano dalle verifiche admin. dati = undefined mentre carica
export default function AffidabilitaTab({ dati }) {
  return (
    <div className="space-y-6">
      <TabellaScarti
        titolo="Affidabilità per prodotto"
        descrizione="Ultimi 56 giorni. Verifica admin contro l'ultimo conteggio dei dipendenti delle 48 ore precedenti, tolto il teorico delle vendite tra i due orari. Oltre il 15% di scarto medio il prodotto va spiegato meglio allo staff."
        intestazione="Prodotto"
        righe={dati?.prodotti}
        evidenzia={15}
      />
      <TabellaScarti
        titolo="Affidabilità per dipendente"
        descrizione="Stessi confronti, raggruppati per chi ha fatto il conteggio. Lo scarto in unità somma prodotti con unità diverse: vale come indicazione."
        intestazione="Dipendente"
        righe={dati?.dipendenti}
      />
    </div>
  );
}