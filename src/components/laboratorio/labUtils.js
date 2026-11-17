export const oggiLocale = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

// created_date arriva in UTC, a volte senza fuso
export const dataCreazione = (p) => new Date(/(Z|[+-]\d\d:?\d\d)$/.test(p.created_date) ? p.created_date : `${p.created_date}Z`);

export const numero = (n) => (n == null ? '—' : Number(n).toLocaleString('it-IT', { maximumFractionDigits: 2 }));

export const giorno = (iso) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—');

export const erroreFunzione = (e) => e.response?.data?.error || e.message;