import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import NeumorphicCard from "../neumorphic/NeumorphicCard";
import NeumorphicButton from "../neumorphic/NeumorphicButton";
import {
  Search,
  Loader2,
  Instagram,
  Users,
  MapPin,
  TrendingUp,
  ExternalLink,
  UserPlus,
  Star,
  Filter,
  RefreshCw,
  X,
  AlertCircle
} from "lucide-react";
import { useEffect } from "react";

const PLATFORM_OPTIONS = [
  { value: "instagram", label: "Instagram", icon: "📸" },
  { value: "tiktok", label: "TikTok", icon: "🎵" },
  { value: "youtube", label: "YouTube", icon: "▶️" },
];

const NICHE_OPTIONS = [
  { value: "food", label: "🍕 Food & Restaurant" },
  { value: "lifestyle", label: "✨ Lifestyle" },
  { value: "travel", label: "✈️ Travel" },
  { value: "family", label: "👨‍👩‍👧 Family" },
  { value: "fitness", label: "💪 Fitness" },
  { value: "fashion", label: "👗 Fashion" },
  { value: "pizza", label: "🍕 Pizza / Street food" },
  { value: "local", label: "📍 Local / City" },
];

const FOLLOWER_RANGES = [
  { value: "nano", label: "Nano (1K–10K)", min: 1000, max: 10000 },
  { value: "micro", label: "Micro (10K–100K)", min: 10000, max: 100000 },
  { value: "mid", label: "Mid (100K–500K)", min: 100000, max: 500000 },
  { value: "macro", label: "Macro (500K+)", min: 500000, max: null },
];

export default function TrovaInfluencers({ onAddContact }) {
  const [filters, setFilters] = useState({
    platform: "instagram",
    niche: "food",
    followerRange: "micro",
    city: "",
  });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [addingId, setAddingId] = useState(null);
  const [addedIds, setAddedIds] = useState(new Set());
  const [existingContacts, setExistingContacts] = useState([]);
  const [scartatiIds, setScartatiIds] = useState(new Set());
  const [scarcandiId, setScarcandiId] = useState(null);

  // Carica contatti esistenti e scartati al mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [contatti, scartati] = await Promise.all([
          base44.entities.ContattoMarketing.filter({ categoria: "Food influencers" }),
          base44.entities.InfluencerScartato.list()
        ]);
        setExistingContacts(contatti.map(c => c.link?.split('/').pop() || ''));
        setScartatiIds(new Set(scartati.map(s => s.username)));
      } catch (err) {
        console.error('Errore caricamento dati:', err);
      }
    };
    loadData();
  }, []);

  const handleScarta = async (influencer) => {
    setScarcandiId(influencer.username);
    try {
      await base44.entities.InfluencerScartato.create({
        username: influencer.username,
        platform: filters.platform,
        full_name: influencer.full_name,
        scartato_il: new Date().toISOString()
      });
      setScartatiIds(prev => new Set([...prev, influencer.username]));
    } catch (err) {
      console.error('Errore scarto:', err);
    } finally {
      setScarcandiId(null);
    }
  };

  const isDuplicate = (influencer) => {
    return existingContacts.includes(influencer.username);
  };

  const handleSearch = async () => {
    setLoading(true);
    setHasSearched(true);
    setResults([]);

    const range = FOLLOWER_RANGES.find((r) => r.value === filters.followerRange);
    const niche = NICHE_OPTIONS.find((n) => n.value === filters.niche);
    const platform = PLATFORM_OPTIONS.find((p) => p.value === filters.platform);

    const prompt = `Cercare e trovare 10 VERI influencer su ${platform?.label} che corrispondono a questi criteri:
- Niche/Categoria: ${niche?.label}
- Città/Zona: ${filters.city || "Italia (qualsiasi città)"}
- Range follower: ${range?.label} (${range?.min?.toLocaleString()}${range?.max ? "–" + range?.max?.toLocaleString() : "+"} followers)
- Lingua: Preferibilmente italiano

Usa SEMPRE i risultati di ricerca Google AGGIORNATI per trovare SOLO account REALI e verificati su ${platform?.label}.
IMPORTANTE: Verifica ATTENTAMENTE il numero di follower da Google e ${platform?.label} - deve essere ESATTO e AGGIORNATO. Se non trovi i dati esatti su Google, NON INCLUDERE l'influencer.

Per ogni influencer, fornire DATI VERIFICATI DA INTERNET:
- username (account reale verificato su ${platform?.label})
- full_name (nome e cognome reale - verificare da profilo ${platform?.label})
- followers_count (numero follower ESATTO e AGGIORNATO da Google/profilo ${platform?.label} - NO stime)
- city (città italiana dal profilo)
- niche (categoria contenuti effettivi)
- bio (descrizione esatta dal profilo)
- engagement_rate (engagement rate medio reale %)
- profile_url (link diretto al profilo ${platform?.label})
- contact_hint (come contattarli - email, link contatti, DM, etc.)

Restituisci un JSON array di 10 oggetti influencer con questi campi esatti.
Focalizzati su creatori di contenuti food, lifestyle, locali rilevanti per attività pizza/ristorazione in Italia.
I profili DEVONO essere verificati e reali. I follower DEVONO essere accurati.`;

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        model: "gemini_3_flash",
        response_json_schema: {
          type: "object",
          properties: {
            influencers: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  username: { type: "string" },
                  full_name: { type: "string" },
                  followers_count: { type: "number" },
                  city: { type: "string" },
                  niche: { type: "string" },
                  bio: { type: "string" },
                  engagement_rate: { type: "number" },
                  profile_url: { type: "string" },
                  contact_hint: { type: "string" },
                },
              },
            },
          },
        },
      });
      setResults(result?.influencers || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToContatti = async (influencer) => {
    setAddingId(influencer.username);
    try {
      const nameParts = (influencer.full_name || influencer.username).split(" ");
      await base44.entities.ContattoMarketing.create({
        categoria: "Food influencers",
        nome: nameParts[0] || influencer.username,
        cognome: nameParts.slice(1).join(" ") || "",
        link: influencer.profile_url || "",
        followers: influencer.followers_count || 0,
        note: `${influencer.bio || ""}${influencer.city ? " | Città: " + influencer.city : ""}${influencer.niche ? " | Niche: " + influencer.niche : ""} | Engagement: ${influencer.engagement_rate || 0}%`,
        visite_negozio: [],
        proposte_commerciali: [],
        collaborazioni_completate: [],
      });
      setAddedIds((prev) => new Set([...prev, influencer.username]));
      if (onAddContact) onAddContact();
    } catch (err) {
      console.error(err);
    } finally {
      setAddingId(null);
    }
  };

  const formatFollowers = (n) => {
    if (!n) return "–";
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(1) + "K";
    return n.toString();
  };

  const getEngagementColor = (rate) => {
    if (!rate) return "text-slate-500";
    if (rate >= 5) return "text-green-600";
    if (rate >= 3) return "text-blue-600";
    return "text-orange-500";
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center gap-2 mb-5">
          <Filter className="w-5 h-5 text-purple-600" />
          <h2 className="text-lg font-bold text-slate-800">Filtri di Ricerca</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          {/* Platform */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">
              Piattaforma
            </label>
            <div className="flex gap-2 flex-wrap">
              {PLATFORM_OPTIONS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setFilters({ ...filters, platform: p.value })}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-all border-2 ${
                    filters.platform === p.value
                      ? "border-purple-500 bg-purple-50 text-purple-700"
                      : "border-transparent neumorphic-pressed text-slate-600"
                  }`}
                >
                  {p.icon} {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Niche */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">
              Categoria / Niche
            </label>
            <select
              value={filters.niche}
              onChange={(e) => setFilters({ ...filters, niche: e.target.value })}
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm"
            >
              {NICHE_OPTIONS.map((n) => (
                <option key={n.value} value={n.value}>
                  {n.label}
                </option>
              ))}
            </select>
          </div>

          {/* Follower Range */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">
              Range Follower
            </label>
            <div className="flex flex-col gap-2">
              {FOLLOWER_RANGES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setFilters({ ...filters, followerRange: r.value })}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-all border-2 text-left ${
                    filters.followerRange === r.value
                      ? "border-purple-500 bg-purple-50 text-purple-700"
                      : "border-transparent neumorphic-pressed text-slate-600"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* City */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">
              Città / Zona
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="es. Milano, Roma, Torino..."
                value={filters.city}
                onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                className="w-full neumorphic-pressed pl-9 pr-4 py-3 rounded-xl text-slate-700 outline-none text-sm"
              />
            </div>
            <p className="text-xs text-slate-400 mt-2">Lascia vuoto per tutta Italia</p>
          </div>
        </div>

        <NeumorphicButton
          onClick={handleSearch}
          variant="primary"
          disabled={loading}
          className="flex items-center gap-2 px-8"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Search className="w-5 h-5" />
          )}
          {loading ? "Ricerca in corso..." : "Trova Influencers"}
        </NeumorphicButton>
      </NeumorphicCard>

      {/* Results */}
      {loading && (
        <div className="text-center py-16">
          <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Analisi dei profili in corso...</p>
          <p className="text-slate-400 text-sm mt-1">Stiamo cercando influencer che corrispondono ai tuoi filtri</p>
        </div>
      )}

      {!loading && hasSearched && results.length === 0 && (
        <div className="text-center py-16">
          <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Nessun risultato trovato. Prova con filtri diversi.</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800">
              {results.length} Influencer Trovati
            </h3>
            <button
              onClick={handleSearch}
              className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-800 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Nuova ricerca
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.map((influencer, idx) => {
              const isAdded = addedIds.has(influencer.username);
              const isAdding = addingId === influencer.username;
              const duplicate = isDuplicate(influencer);
              const isScartato = scartatiIds.has(influencer.username);
              const isScarcando = scarcandiId === influencer.username;

              if (isScartato) return null;

              return (
                <NeumorphicCard key={idx} className={`p-5 ${duplicate ? 'border-2 border-orange-300' : ''}`}>
                  {duplicate && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 mb-3 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0" />
                      <span className="text-xs text-orange-700 font-medium">Duplicato - già nei tuoi contatti</span>
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-3">
                    {/* Avatar placeholder */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                      {(influencer.full_name || influencer.username || "?")[0].toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold text-slate-800 text-sm">
                            {influencer.full_name || influencer.username}
                          </p>
                          <a
                            href={influencer.profile_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1"
                          >
                            @{influencer.username}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAddToContatti(influencer)}
                            disabled={isAdded || isAdding || duplicate}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                              isAdded
                                ? "bg-green-100 text-green-700 cursor-default"
                                : duplicate
                                ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                                : "bg-purple-100 text-purple-700 hover:bg-purple-200"
                            }`}
                          >
                            {isAdding ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : isAdded ? (
                              <>✓ Aggiunto</>
                            ) : (
                              <>
                                <UserPlus className="w-3 h-3" />
                                Aggiungi
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleScarta(influencer)}
                            disabled={isScarcando}
                            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-all"
                            title="Scarta questo influencer"
                          >
                            {isScarcando ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <X className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Bio */}
                      {influencer.bio && (
                        <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{influencer.bio}</p>
                      )}

                      {/* Stats row */}
                      <div className="flex items-center gap-4 mt-3 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-sm font-bold text-slate-700">
                            {formatFollowers(influencer.followers_count)}
                          </span>
                          <span className="text-xs text-slate-400">followers</span>
                        </div>

                        {influencer.engagement_rate && (
                          <div className="flex items-center gap-1.5">
                            <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                            <span className={`text-sm font-bold ${getEngagementColor(influencer.engagement_rate)}`}>
                              {influencer.engagement_rate}%
                            </span>
                            <span className="text-xs text-slate-400">eng.</span>
                          </div>
                        )}

                        {influencer.city && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-xs text-slate-500">{influencer.city}</span>
                          </div>
                        )}
                      </div>

                      {/* Tags */}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {influencer.niche && (
                          <span className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full text-xs font-medium">
                            {influencer.niche}
                          </span>
                        )}
                        {influencer.contact_hint && (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs">
                            {influencer.contact_hint}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </NeumorphicCard>
              );
            })}
          </div>
        </div>
      )}

      {!hasSearched && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-bold text-slate-700 mb-2">Trova i tuoi Influencer</h3>
          <p className="text-slate-500 max-w-md mx-auto">
            Seleziona la piattaforma, la categoria, il range di follower e la città per trovare i migliori influencer da contattare per la tua campagna.
          </p>
        </div>
      )}
    </div>
  );
}