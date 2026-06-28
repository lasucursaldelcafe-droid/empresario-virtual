import Link from "next/link";

export default function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string; email?: string }>;
}) {
  return (
    <IntegrationsContent searchParams={searchParams} />
  );
}

async function IntegrationsContent({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string; email?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <h1 className="text-xl font-bold">Integraciones</h1>
          <Link href="/dashboard" className="text-sm text-slate-400 hover:text-white">← Dashboard</Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8 space-y-6">
        {params.success && (
          <div className="rounded-xl border border-emerald-800 bg-emerald-950/40 px-4 py-3 text-emerald-300">
            ✅ Gmail conectado: {params.email ?? "correo principal"}
          </div>
        )}
        {params.error && (
          <div className="rounded-xl border border-red-800 bg-red-950/40 px-4 py-3 text-red-300">
            ❌ Error: {params.error}
          </div>
        )}

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold mb-2">Gmail + Google Drive</h2>
          <p className="text-slate-400 text-sm mb-4">
            Conecta tu correo principal para enviar reportes automáticos y sincronizar documentos.
            Las credenciales OAuth se almacenan encriptadas localmente.
          </p>
          <a
            href="/api/oauth/google"
            className="inline-flex rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-slate-900 hover:bg-slate-100"
          >
            Conectar con Google
          </a>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold mb-2">Configuración requerida</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-slate-400">
            <li>Crea credenciales OAuth en Google Cloud Console</li>
            <li>Copia <code className="text-slate-300">.env.example</code> → <code className="text-slate-300">.env.local</code></li>
            <li>Ejecuta <code className="text-slate-300">npm run setup</code> para generar claves</li>
            <li>Conecta Gmail con el botón de arriba</li>
          </ol>
          <p className="mt-4 text-xs text-slate-500">
            Guía completa: docs/05-EMAIL-SETUP.md
          </p>
        </section>
      </main>
    </div>
  );
}
