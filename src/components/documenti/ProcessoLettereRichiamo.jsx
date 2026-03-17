import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  Send, Eye, CheckCircle, Clock, FileText, ChevronDown, ChevronUp,
  AlertTriangle, ArrowRight, Search, Filter
} from "lucide-react";
import NeumorphicCard from "../neumorphic/NeumorphicCard";
import { format } from "date-fns";
import { it } from "date-fns/locale";

const formatDate = (dateStr) => {
  if (!dateStr) return null;
  return format(new Date(dateStr), "dd MMM yyyy HH:mm", { locale: it });
};

const StepBadge = ({ done, label, date, icon: Icon, color }) => (
  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
    done ? `${color} border` : "bg-slate-50 text-slate-400 border border-slate-200"
  }`}>
    <Icon className="w-3.5 h-3.5 flex-shrink-0" />
    <div className="min-w-0">
      <p className="font-semibold">{label}</p>
      {date && <p className="text-[10px] opacity-80">{formatDate(date)}</p>}
      {!done && !date && <p className="text-[10px]">In attesa</p>}
    </div>
  </div>
);

const StepArrow = () => (
  <ArrowRight className="w-4 h-4 text-slate-300 flex-shrink-0 hidden sm:block" />
);

function ProcessCard({ richiamo, chiusura }) {
  const [expanded, setExpanded] = useState(false);

  const steps = {
    richiamoInviato: !!richiamo.data_invio,
    richiamoVisualizzato: !!richiamo.data_visualizzazione,
    richiamoFirmato: richiamo.status === "firmata",
    chiusuraInviata: !!chiusura,
    chiusuraVisualizzata: !!chiusura?.data_visualizzazione,
    chiusuraFirmata: chiusura?.status === "firmata",
  };

  const completedSteps = Object.values(steps).filter(Boolean).length;
  const totalSteps = 6;
  const progressPercent = Math.round((completedSteps / totalSteps) * 100);

  const isComplete = steps.chiusuraFirmata;
  const isStalled = !steps.richiamoFirmato && !chiusura;

  return (
    <NeumorphicCard className={`p-4 ${isComplete ? "border-l-4 border-green-500" : isStalled ? "border-l-4 border-orange-400" : "border-l-4 border-blue-400"}`}>
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <p className="font-bold text-slate-800 text-sm truncate">{richiamo.user_name}</p>
            {isComplete && (
              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-bold flex-shrink-0">
                ✓ Completata
              </span>
            )}
            {isStalled && (
              <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-[10px] font-bold flex-shrink-0">
                In corso
              </span>
            )}
            {!isComplete && !isStalled && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold flex-shrink-0">
                Chiusura avviata
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <p className="text-xs text-slate-500">
              Inviata: {richiamo.data_invio ? format(new Date(richiamo.data_invio), "dd/MM/yyyy", { locale: it }) : "N/A"}
            </p>
            <div className="flex-1 max-w-[200px] bg-slate-200 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all ${isComplete ? "bg-green-500" : "bg-blue-500"}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-500 font-medium">{completedSteps}/{totalSteps}</span>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-slate-400 flex-shrink-0 ml-3" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0 ml-3" />
        )}
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-slate-200">
          {/* Lettera di Richiamo flow */}
          <p className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
            Lettera di Richiamo
          </p>
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <StepBadge
              done={steps.richiamoInviato}
              label="Inviata"
              date={richiamo.data_invio}
              icon={Send}
              color="bg-blue-50 text-blue-700 border-blue-200"
            />
            <StepArrow />
            <StepBadge
              done={steps.richiamoVisualizzato}
              label="Visualizzata"
              date={richiamo.data_visualizzazione}
              icon={Eye}
              color="bg-purple-50 text-purple-700 border-purple-200"
            />
            <StepArrow />
            <StepBadge
              done={steps.richiamoFirmato}
              label="Firmata"
              date={steps.richiamoFirmato ? richiamo.data_firma : null}
              icon={CheckCircle}
              color="bg-green-50 text-green-700 border-green-200"
            />
          </div>

          {/* Chiusura Procedura flow */}
          <p className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-purple-500" />
            Chiusura Procedura
          </p>
          {chiusura ? (
            <div className="flex items-center gap-2 flex-wrap">
              <StepBadge
                done={steps.chiusuraInviata}
                label="Inviata"
                date={chiusura.data_invio}
                icon={Send}
                color="bg-indigo-50 text-indigo-700 border-indigo-200"
              />
              <StepArrow />
              <StepBadge
                done={steps.chiusuraVisualizzata}
                label="Visualizzata"
                date={chiusura.data_visualizzazione}
                icon={Eye}
                color="bg-pink-50 text-pink-700 border-pink-200"
              />
              <StepArrow />
              <StepBadge
                done={steps.chiusuraFirmata}
                label="Firmata"
                date={steps.chiusuraFirmata ? chiusura.data_firma : null}
                icon={CheckCircle}
                color="bg-emerald-50 text-emerald-700 border-emerald-200"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-dashed border-slate-300">
              <Clock className="w-4 h-4 text-slate-400" />
              <p className="text-xs text-slate-500">Chiusura procedura non ancora inviata</p>
            </div>
          )}
        </div>
      )}
    </NeumorphicCard>
  );
}

export default function ProcessoLettereRichiamo() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: lettere = [], isLoading } = useQuery({
    queryKey: ["lettere-richiamo-processo"],
    queryFn: () => base44.entities.LetteraRichiamo.list("-created_date"),
  });

  const richiami = lettere.filter((l) => l.tipo_lettera === "lettera_richiamo");
  const chiusure = lettere.filter((l) => l.tipo_lettera === "chiusura_procedura");

  // Match each richiamo with its chiusura
  const processes = richiami.map((richiamo) => {
    const chiusura = chiusure.find(
      (c) =>
        c.lettera_richiamo_id === richiamo.id ||
        (c.user_id === richiamo.user_id &&
          c.data_invio &&
          richiamo.data_invio &&
          new Date(c.data_invio) > new Date(richiamo.data_invio))
    );
    
    const isComplete = chiusura?.status === "firmata";
    const hasChiusura = !!chiusura;
    
    return { richiamo, chiusura, isComplete, hasChiusura };
  });

  // Filter
  const filtered = processes.filter((p) => {
    const nameMatch = !searchTerm || p.richiamo.user_name?.toLowerCase().includes(searchTerm.toLowerCase());
    if (!nameMatch) return false;

    if (statusFilter === "complete") return p.isComplete;
    if (statusFilter === "in_progress") return !p.isComplete && p.hasChiusura;
    if (statusFilter === "pending") return !p.hasChiusura;
    return true;
  });

  const stats = {
    total: processes.length,
    complete: processes.filter((p) => p.isComplete).length,
    inProgress: processes.filter((p) => !p.isComplete && p.hasChiusura).length,
    pending: processes.filter((p) => !p.hasChiusura).length,
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="neumorphic-pressed p-3 rounded-xl text-center">
          <p className="text-xl font-bold text-slate-700">{stats.total}</p>
          <p className="text-[10px] text-slate-500">Totali</p>
        </div>
        <div className="neumorphic-pressed p-3 rounded-xl text-center bg-green-50">
          <p className="text-xl font-bold text-green-700">{stats.complete}</p>
          <p className="text-[10px] text-green-600">Completate</p>
        </div>
        <div className="neumorphic-pressed p-3 rounded-xl text-center bg-blue-50">
          <p className="text-xl font-bold text-blue-700">{stats.inProgress}</p>
          <p className="text-[10px] text-blue-600">Chiusura avviata</p>
        </div>
        <div className="neumorphic-pressed p-3 rounded-xl text-center bg-orange-50">
          <p className="text-xl font-bold text-orange-700">{stats.pending}</p>
          <p className="text-[10px] text-orange-600">In attesa chiusura</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cerca dipendente..."
            className="w-full neumorphic-pressed pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { key: "all", label: "Tutti" },
            { key: "pending", label: "In attesa" },
            { key: "in_progress", label: "Chiusura" },
            { key: "complete", label: "Completate" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                statusFilter === f.key
                  ? "bg-blue-500 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Process list */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Nessuna lettera di richiamo trovata</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <ProcessCard
              key={p.richiamo.id}
              richiamo={p.richiamo}
              chiusura={p.chiusura}
            />
          ))}
        </div>
      )}
    </div>
  );
}