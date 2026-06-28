"use client";

import { useState } from "react";
import Link from "next/link";

const AGENTS = [
  { id: "administrativo", icon: "📁", color: "bg-blue-500" },
  { id: "financiero", icon: "💰", color: "bg-emerald-500" },
  { id: "contable", icon: "📊", color: "bg-violet-500" },
  { id: "operativo", icon: "⚙️", color: "bg-orange-500" },
  { id: "marketing", icon: "📣", color: "bg-pink-500" },
  { id: "comercial", icon: "🤝", color: "bg-cyan-500" },
  { id: "juridico", icon: "⚖️", color: "bg-amber-500" },
  { id: "gerencial", icon: "🎯", color: "bg-indigo-600" },
];

export default function DashboardPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runDailyClose(sendEmail = false) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/daily-close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sendEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error en cierre diario");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Empresario Virtual</h1>
            <p className="text-sm text-slate-400">Tu equipo administrativo con IA</p>
          </div>
          <nav className="flex gap-4 text-sm">
            <Link href="/" className="text-slate-400 hover:text-white">Inicio</Link>
            <Link href="/settings/integrations" className="text-slate-400 hover:text-white">Integraciones</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <section className="mb-8 rounded-2xl border border-slate-800 bg-gradient-to-br from-indigo-950/50 to-slate-900 p-6">
          <h2 className="mb-2 text-2xl font-semibold">Panel de control</h2>
          <p className="mb-6 text-slate-400">
            8 agentes especializados coordinados por el Agente Gerencial. Ejecuta el cierre diario para ver el flujo completo.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => runDailyClose(false)}
              disabled={loading}
              className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium hover:bg-indigo-500 disabled:opacity-50"
            >
              {loading ? "Ejecutando..." : "Cierre diario"}
            </button>
            <button
              onClick={() => runDailyClose(true)}
              disabled={loading}
              className="rounded-lg border border-slate-600 px-5 py-2.5 font-medium hover:bg-slate-800 disabled:opacity-50"
            >
              Cierre + enviar email
            </button>
          </div>
          {error && (
            <p className="mt-4 rounded-lg bg-red-950/50 border border-red-800 px-4 py-2 text-red-300 text-sm">{error}</p>
          )}
        </section>

        <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {AGENTS.map((a) => (
            <div key={a.id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <div className={`mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg ${a.color} text-lg`}>
                {a.icon}
              </div>
              <p className="font-medium capitalize">{a.id}</p>
              <p className="text-xs text-slate-500">Agente activo</p>
            </div>
          ))}
        </section>

        {result && (
          <section className="space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h3 className="mb-4 text-lg font-semibold">KPIs del día</h3>
              <div className="grid grid-cols-3 gap-4">
                <KpiCard label="Ventas" value={(result.kpis as { sales: number })?.sales} />
                <KpiCard label="Gastos" value={(result.kpis as { expenses: number })?.expenses} />
                <KpiCard label="Utilidad" value={(result.kpis as { profit: number })?.profit} highlight />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h3 className="mb-4 text-lg font-semibold">Reporte gerencial</h3>
              <pre className="whitespace-pre-wrap text-sm text-slate-300 font-mono leading-relaxed">
                {String(result.executiveSummary ?? "")}
              </pre>
              {"emailSent" in result && (
                <p className="mt-4 text-sm text-slate-500">
                  Email: {result.emailSent ? "✅ Enviado" : "❌ No enviado (conecta Gmail en Integraciones)"}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h3 className="mb-4 text-lg font-semibold">Resultados por agente</h3>
              <div className="space-y-3">
                {((result.agentResults as Array<{ agentId: string; summary: string; status: string }>) ?? []).map((r) => (
                  <div key={r.agentId} className="rounded-lg border border-slate-800 bg-slate-950/50 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium capitalize">{r.agentId}</span>
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="mt-1 text-sm text-slate-400">{r.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function KpiCard({ label, value, highlight }: { label: string; value?: number; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-4 ${highlight ? "bg-emerald-950/40 border border-emerald-800" : "bg-slate-950/50"}`}>
      <p className="text-sm text-slate-400">{label}</p>
      <p className="text-2xl font-bold">${(value ?? 0).toLocaleString("es-CO")}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    success: "text-emerald-400",
    partial: "text-amber-400",
    error: "text-red-400",
  };
  return <span className={`text-xs font-medium ${colors[status] ?? "text-slate-400"}`}>{status}</span>;
}
