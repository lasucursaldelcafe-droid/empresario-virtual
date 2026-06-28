import Link from "next/link";

const AGENTS = [
  { name: "Administrativo", desc: "Documentos, facturas, vencimientos" },
  { name: "Financiero", desc: "Flujo de caja, rentabilidad, KPIs" },
  { name: "Contable", desc: "Impuestos, soportes, proveedores" },
  { name: "Operativo", desc: "Turnos, inventario, productividad" },
  { name: "Marketing", desc: "Redes sociales, campañas, contenido" },
  { name: "Comercial", desc: "CRM, clientes inactivos, cobranza" },
  { name: "Jurídico", desc: "Contratos, obligaciones legales" },
  { name: "Gerencial", desc: "Director virtual — sintetiza todo" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <div className="mb-12 text-center">
          <p className="mb-3 text-indigo-400 font-medium tracking-wide uppercase text-sm">
            Plataforma administrativa con IA
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Empresario Virtual
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Un equipo administrativo completo impulsado por inteligencia artificial,
            disponible 24/7, a un costo muy inferior al de contratar varios profesionales.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/dashboard"
              className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold hover:bg-indigo-500 transition"
            >
              Abrir dashboard
            </Link>
            <Link
              href="/settings/integrations"
              className="rounded-xl border border-slate-700 px-6 py-3 font-semibold hover:bg-slate-900 transition"
            >
              Conectar Gmail
            </Link>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {AGENTS.map((a) => (
            <div
              key={a.name}
              className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 hover:border-indigo-800 transition"
            >
              <h3 className="font-semibold mb-1">{a.name}</h3>
              <p className="text-sm text-slate-500">{a.desc}</p>
            </div>
          ))}
        </div>

        <p className="mt-12 text-center text-sm text-slate-600">
          Arquitectura Foreman · 8 agentes · Comunicación vía Event Bus · Ver docs/
        </p>
      </div>
    </div>
  );
}
