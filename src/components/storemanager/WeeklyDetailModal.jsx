import React from "react";
import { X, Star, AlertTriangle, User } from "lucide-react";
import moment from "moment";

export default function WeeklyDetailModal({ type, items = [], matches = [], storeName, onClose }) {
  const isReviews = type === "reviews";
  const title = isReviews ? `Recensioni - ${storeName}` : `Ordini Sbagliati - ${storeName}`;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            {isReviews ? <Star className="w-5 h-5 text-yellow-500" /> : <AlertTriangle className="w-5 h-5 text-red-500" />}
            <h3 className="font-bold text-slate-800">{title}</h3>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{items.length}</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 && (
            <p className="text-center text-slate-400 py-8">Nessun elemento</p>
          )}

          {isReviews && items.map((r) => (
            <div key={r.id} className="neumorphic-flat p-3 rounded-xl">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`w-3.5 h-3.5 ${i < (r.rating || 0) ? "text-yellow-400 fill-yellow-400" : "text-slate-200"}`} />
                  ))}
                </div>
                <span className="text-[10px] text-slate-400">{moment(r.review_date).format("DD/MM HH:mm")}</span>
              </div>
              {r.comment && <p className="text-xs text-slate-600 mb-2 line-clamp-3">{r.comment}</p>}
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400">{r.customer_name || "Anonimo"} · {r.source || ""}</span>
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3 text-blue-500" />
                  <span className="text-[10px] font-medium text-blue-600">
                    {r.employee_assigned_name || r.employee_mentioned || "Non assegnato"}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {!isReviews && items.map((o) => {
            const match = matches.find((m) => m.wrong_order_id === o.id);
            return (
              <div key={o.id} className="neumorphic-flat p-3 rounded-xl">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-slate-700 capitalize">{o.platform}</span>
                  <span className="text-[10px] text-slate-400">{moment(o.order_date).format("DD/MM HH:mm")}</span>
                </div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-slate-500">Ordine #{o.order_id}</span>
                  {o.refund_value > 0 && <span className="text-[10px] font-medium text-red-500">-€{o.refund_value.toFixed(2)}</span>}
                </div>
                {(o.complaint_reason || o.cancellation_reason) && (
                  <p className="text-[10px] text-slate-500 mb-1">{o.complaint_reason || o.cancellation_reason}</p>
                )}
                <div className="flex items-center justify-between">
                  {o.contestato && <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded">Contestato</span>}
                  {!o.contestato && <span />}
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3 text-blue-500" />
                    <span className="text-[10px] font-medium text-blue-600">
                      {match?.matched_employee_name || "Non assegnato"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}