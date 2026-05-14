import React from "react";
import { X, Sparkles } from "lucide-react";
import NeumorphicCard from "../neumorphic/NeumorphicCard";
import NeumorphicButton from "../neumorphic/NeumorphicButton";

export default function AIAnalysisModal({ content, loading, onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <NeumorphicCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-[#6b6b6b] flex items-center gap-2"><Sparkles className="w-6 h-6 text-purple-600" />Analisi AI</h2>
            <button onClick={onClose} className="neumorphic-flat p-2 rounded-lg hover:bg-red-50"><X className="w-5 h-5 text-[#9b9b9b]" /></button>
          </div>
          <div className="neumorphic-pressed p-6 rounded-xl bg-gradient-to-br from-purple-50 to-blue-50">
            {loading ? <div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div> : <div className="prose prose-sm max-w-none text-[#6b6b6b] whitespace-pre-wrap">{content}</div>}
          </div>
          <div className="mt-4"><NeumorphicButton onClick={onClose} className="w-full">Chiudi</NeumorphicButton></div>
        </NeumorphicCard>
      </div>
    </div>
  );
}