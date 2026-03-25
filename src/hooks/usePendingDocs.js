import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export function usePendingDocs(userId) {
  return useQuery({
    queryKey: ['pending-docs-clockin', userId],
    queryFn: async () => {
      if (!userId) return { hasPending: false, messages: [] };
      const [contratti, lettere, regolamenti] = await Promise.all([
        base44.entities.Contratto.filter({ user_id: userId, status: 'inviato' }),
        base44.entities.LetteraRichiamo.filter({ user_id: userId }),
        base44.entities.RegolamentoFirmato.filter({ user_id: userId, firmato: false })
      ]);
      const pendingLettere = lettere.filter(l => l.tipo_lettera === 'lettera_richiamo' && (l.status === 'inviata' || l.status === 'visualizzata'));
      const msgs = [];
      if (contratti.length > 0) msgs.push(`${contratti.length} contratt${contratti.length === 1 ? 'o' : 'i'} da firmare`);
      if (pendingLettere.length > 0) msgs.push(`${pendingLettere.length} letter${pendingLettere.length === 1 ? 'a' : 'e'} da firmare`);
      if (regolamenti.length > 0) msgs.push(`${regolamenti.length} regolament${regolamenti.length === 1 ? 'o' : 'i'} da firmare`);
      return { hasPending: msgs.length > 0, messages: msgs };
    },
    enabled: !!userId,
    staleTime: 30000
  });
}