import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import ProtectedPage from "../components/ProtectedPage";
import { TrendingUp, Zap, Users, Calendar, Settings } from "lucide-react";

export default function Marketing() {
  const marketingPages = [
    {
      title: "Activation",
      description: "Gestisci activation e progetti marketing",
      icon: Zap,
      url: createPageUrl("Activation"),
      color: "from-purple-500 to-pink-600"
    },
    {
      title: "Contatti Marketing",
      description: "Database contatti influencer, PR e ADV",
      icon: Users,
      url: createPageUrl("Contatti"),
      color: "from-blue-500 to-cyan-600"
    },
    {
      title: "Piano Quarter",
      description: "Pianificazione trimestrale ads e promo",
      icon: Calendar,
      url: createPageUrl("PianoQuarter"),
      color: "from-green-500 to-emerald-600"
    },
    {
      title: "Google Ads",
      description: "Campagne e performance Google",
      icon: TrendingUp,
      url: createPageUrl("Google"),
      color: "from-red-500 to-orange-600"
    },
    {
      title: "Meta Ads",
      description: "Campagne Facebook e Instagram",
      icon: TrendingUp,
      url: createPageUrl("Meta"),
      color: "from-indigo-500 to-blue-600"
    },
    {
      title: "Configurazione",
      description: "Impostazioni marketing",
      icon: Settings,
      url: createPageUrl("MarketingSettings"),
      color: "from-slate-500 to-slate-600"
    }
  ];

  return (
    <ProtectedPage pageName="Marketing">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent mb-2">
            Marketing
          </h1>
          <p className="text-slate-500">Gestisci tutte le attività marketing</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {marketingPages.map((page) => {
            const Icon = page.icon;
            return (
              <Link key={page.url} to={page.url}>
                <NeumorphicCard className="p-6 hover:shadow-xl transition-all duration-300 cursor-pointer group">
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${page.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-slate-800 mb-1">{page.title}</h3>
                      <p className="text-sm text-slate-500">{page.description}</p>
                    </div>
                  </div>
                </NeumorphicCard>
              </Link>
            );
          })}
        </div>
      </div>
    </ProtectedPage>
  );
}