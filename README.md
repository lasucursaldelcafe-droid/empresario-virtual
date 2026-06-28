# Empresario Virtual

Plataforma administrativa con **8 agentes de IA** coordinados por un Agente Gerencial (patrón Foreman).

## Inicio rápido

```bash
npm install
npm run setup          # Genera .env.local + ENCRYPTION_KEY
# Edita .env.local con GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, MAIN_EMAIL
npm run db:init        # Crea BD + datos demo
npm run dev            # http://localhost:3000
```

## Arquitectura

```
Dashboard → Orquestador → 7 agentes especialistas → Agente Gerencial
                ↓
         Memoria compartida (SQLite) + Event Bus
                ↓
         Gmail / Google Drive (OAuth)
```

Documentación completa en `docs/`:

- `01-VISION.md` — Problema, objetivos, propuesta de valor
- `02-ARCHITECTURE.md` — Stack y capas del sistema
- `03-AGENTS-PROTOCOL.md` — Comunicación entre agentes
- `04-INTEGRATIONS.md` — Roadmap de integraciones
- `05-EMAIL-SETUP.md` — Conectar correo principal vía OAuth

## Agentes

| Agente | Función |
|--------|---------|
| Administrativo | Documentos, clasificación, vencimientos |
| Financiero | KPIs, flujo de caja, rentabilidad |
| Contable | Soportes, impuestos, proveedores |
| Operativo | Turnos, inventario, productividad |
| Marketing | Redes sociales, campañas |
| Comercial | CRM, clientes inactivos |
| Jurídico | Obligaciones legales |
| Gerencial | Director virtual — sintetiza todo |

## API

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/daily-close` | POST | Ejecuta cierre diario completo |
| `/api/agents` | GET/POST | Lista / ejecuta agente individual |
| `/api/oauth/google` | GET | Inicia OAuth Gmail |
| `/api/dashboard` | GET | Alertas, reportes, estado integraciones |

## Conectar Gmail

1. Sigue `docs/05-EMAIL-SETUP.md`
2. Abre `/settings/integrations`
3. Clic en **Conectar con Google**

Los refresh tokens se almacenan **encriptados** en la base de datos local.

## App Android

```bash
cd mobile
npm install
npm run android   # requiere Android Studio / emulador
```

Configura `EXPO_PUBLIC_API_URL` con tu URL de Vercel. Ver `mobile/README.md`.

## Despliegue en línea

Ver `docs/06-DEPLOY.md` — GitHub → Vercel + Turso (base de datos cloud).

- [Foreman Pattern — Knowlee](https://www.knowlee.ai/blog/how-to-build-multi-agent-ai-system)
- [LangGraph Production Guide](https://pub.towardsai.net/langgraph-vs-crewai-vs-autogen-which-ai-agent-framework-should-your-enterprise-use-in-2026-3a9ebb407b09)
- [Google OAuth Best Practices](https://developers.google.com/identity/protocols/oauth2/resources/best-practices)
