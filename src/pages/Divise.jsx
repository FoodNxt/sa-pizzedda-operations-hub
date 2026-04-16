import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Shirt, Settings, Users, Loader2, ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import NeumorphicCard from "@/components/neumorphic/NeumorphicCard";
import DivisaConfigSection from "@/components/divise/DivisaConfigSection";
import DivisaEmployeeTable from "@/components/divise/DivisaEmployeeTable";
import DivisaSummaryCards from "@/components/divise/DivisaSummaryCards";
import ConsegnaDivisaModal from "@/components/divise/ConsegnaDivisaModal";
import DivisaAcquistiTab from "@/components/divise/DivisaAcquistiTab";

export default function Divise() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("dipendenti");
  const [consegnaModal, setConsegnaModal] = useState(null); // { employee, contract }

  const { data: employees = [], isLoading: loadingEmp } = useQuery({
    queryKey: ["employees-divise"],
    queryFn: () => base44.entities.Employee.filter({ status: "active" }),
  });

  const { data: contratti = [] } = useQuery({
    queryKey: ["contratti-divise"],
    queryFn: () => base44.entities.Contratto.list(),
  });

  const { data: uscite = [] } = useQuery({
    queryKey: ["uscite-divise"],
    queryFn: () => base44.entities.Uscita.list(),
  });

  const { data: consegne = [] } = useQuery({
    queryKey: ["consegne-divise"],
    queryFn: () => base44.entities.ConsegnaDivisa.list(),
  });

  const { data: configs = [] } = useQuery({
    queryKey: ["divisa-config"],
    queryFn: () => base44.entities.DivisaConfig.list(),
  });

  const activeConfig = configs.find(c => c.is_active) || null;

  // Active employees (exclude those with a registered uscita where data_uscita <= today)
  // Uscita.dipendente_id stores the User ID, Employee.employee_id_external also stores the User ID
  const usciteDipendenteIds = useMemo(() => {
    const oggi = new Date().toISOString().split('T')[0];
    return new Set(
      uscite
        .filter(u => !u.data_uscita || u.data_uscita <= oggi)
        .map(u => u.dipendente_id)
    );
  }, [uscite]);
  const activeEmployees = useMemo(
    () => employees.filter(e => 
      !usciteDipendenteIds.has(e.id) && !usciteDipendenteIds.has(e.employee_id_external)
    ),
    [employees, usciteDipendenteIds]
  );

  // Save config mutation
  const saveConfigMutation = useMutation({
    mutationFn: async (data) => {
      if (activeConfig) {
        await base44.entities.DivisaConfig.update(activeConfig.id, data);
      } else {
        await base44.entities.DivisaConfig.create(data);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["divisa-config"] }),
  });

  // Toggle divisa non necessaria
  const toggleNonNecessariaMutation = useMutation({
    mutationFn: ({ id, value }) => base44.entities.Employee.update(id, { divisa_non_necessaria: value }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employees-divise"] }),
  });

  // Save consegna mutation
  const saveConsegnaMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.ConsegnaDivisa.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consegne-divise"] });
      setConsegnaModal(null);
    },
  });

  // Get delivered quantities for modal
  const getDeliveredQty = (empId) => {
    const empConsegne = consegne.filter(c => c.dipendente_id === empId && !c.riconsegnato);
    const totals = {};
    empConsegne.forEach(c => {
      (c.elementi_consegnati || []).forEach(el => {
        totals[el.elemento_nome] = (totals[el.elemento_nome] || 0) + (el.quantita || 1);
      });
    });
    return totals;
  };

  const tabs = [
    { id: "dipendenti", label: "Dipendenti", icon: Users },
    { id: "acquisti", label: "Acquisti", icon: ShoppingCart },
    { id: "config", label: "Configurazione", icon: Settings },
  ];

  if (loadingEmp) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to={createPageUrl("AdminHR")}>
          <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
        </Link>
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
          <Shirt className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#000000" }}>Divise</h1>
          <p className="text-sm text-slate-600">Gestione dotazione e consegna divise</p>
        </div>
      </div>

      {/* Summary */}
      {activeConfig && (
        <DivisaSummaryCards
          activeEmployees={activeEmployees}
          contratti={contratti}
          consegne={consegne}
          config={activeConfig}
          usciteIds={usciteIds}
        />
      )}

      {/* Tabs */}
      <NeumorphicCard className="p-1 flex gap-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all
              ${activeTab === tab.id ? "bg-blue-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-100"}`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </NeumorphicCard>

      {/* Content */}
      {activeTab === "dipendenti" && (
        activeConfig ? (
          <DivisaEmployeeTable
            employees={activeEmployees}
            contratti={contratti}
            uscite={uscite}
            consegne={consegne}
            config={activeConfig}
            onOpenConsegna={(emp, contract) => setConsegnaModal({ employee: emp, contract })}
            onToggleNonNecessaria={(id, value) => toggleNonNecessariaMutation.mutate({ id, value })}
          />
        ) : (
          <NeumorphicCard className="p-8 text-center">
            <Shirt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Configura prima la dotazione divise nella tab Configurazione</p>
            <Button className="mt-3" variant="outline" onClick={() => setActiveTab("config")}>
              Vai a Configurazione
            </Button>
          </NeumorphicCard>
        )
      )}

      {activeTab === "acquisti" && activeConfig && (
        <DivisaAcquistiTab
          activeEmployees={activeEmployees}
          contratti={contratti}
          consegne={consegne}
          config={activeConfig}
        />
      )}

      {activeTab === "config" && (
        <DivisaConfigSection
          config={activeConfig}
          onSave={(data) => saveConfigMutation.mutate(data)}
          isSaving={saveConfigMutation.isPending}
        />
      )}

      {/* Consegna Modal */}
      {consegnaModal && (
        <ConsegnaDivisaModal
          employee={consegnaModal.employee}
          contract={consegnaModal.contract}
          config={activeConfig}
          existingDelivered={getDeliveredQty(consegnaModal.employee.id)}
          onSave={(data) => saveConsegnaMutation.mutate(data)}
          onClose={() => setConsegnaModal(null)}
          isSaving={saveConsegnaMutation.isPending}
        />
      )}
    </div>
  );
}