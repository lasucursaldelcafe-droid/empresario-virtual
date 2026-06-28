# Arquitectura técnica — Empresario Virtual

## Stack seleccionado (referencias 2026)

| Capa | Tecnología | Por qué |
|------|------------|---------|
| Frontend + API | Next.js 15 (App Router) | Full-stack TypeScript, SSR, API routes |
| Orquestación | Orquestador propio (patrón Foreman) | Control determinista, sin dependencia pesada en MVP |
| Validación | Zod | Contratos estructurados entre agentes |
| Persistencia | SQLite + Drizzle ORM | Cero config local; migración fácil a Postgres |
| IA | OpenAI API (configurable) | Análisis y generación de recomendaciones |
| Email | Gmail API (OAuth 2.0 + PKCE) | Estándar Google, scopes mínimos |
| Archivos | Google Drive API | Sincronización documental |
| Cola de eventos | Event Bus in-process → Redis (fase 2) | Comunicación desacoplada |

## Capas del sistema

```
┌─────────────────────────────────────────────────────────────┐
│                    INTERFAZ (Dashboard)                      │
│  Resumen gerencial · Alertas · Documentos · Reportes         │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│              AGENTE GERENCIAL (Orquestador)                  │
│  Prioriza · Sintetiza · Enruta · Aprueba escalaciones        │
└───────────────────────────┬─────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼──────┐   ┌────────▼────────┐   ┌─────▼──────┐
│ Administrativo│   │   Financiero    │   │  Contable  │
│ Operativo     │   │   Comercial     │   │  Marketing │
│ Jurídico      │   │                 │   │            │
└───────┬──────┘   └────────┬────────┘   └─────┬──────┘
        │                   │                   │
┌───────▼───────────────────▼───────────────────▼──────────┐
│              MEMORIA COMPARTIDA (Company Memory)            │
│  Documentos · KPIs · Alertas · Eventos · Historial         │
└───────┬───────────────────┬───────────────────┬──────────┘
        │                   │                   │
┌───────▼──────┐   ┌────────▼────────┐   ┌─────▼──────┐
│   SQLite     │   │  Gmail API      │   │ Drive API  │
│   (Drizzle)  │   │  (OAuth)        │   │  (OAuth)   │
└──────────────┘   └─────────────────┘   └────────────┘
```

## Flujos principales

### 1. Cierre diario (`daily-close`)

```
Usuario → API /daily-close
  → Administrativo: clasifica documentos del día
  → Financiero: calcula ventas, gastos, utilidad
  → Contable: valida soportes e impuestos
  → Operativo: registra incidencias de personal/inventario
  → Comercial: actualiza CRM y clientes inactivos
  → Marketing: métricas de campañas (si hay datos)
  → Jurídico: revisa vencimientos legales
  → Gerencial: sintetiza reporte diario + alertas
  → Gmail: envía resumen al empresario (opcional)
```

### 2. Ingesta de documento

```
Upload/Email/Drive → Administrativo (OCR + clasificación)
  → Evento DOCUMENT_CLASSIFIED
  → Financiero + Contable (si es factura/gasto)
  → Memoria compartida actualizada
  → Gerencial (si severidad >= warning)
```

### 3. Alerta temprana

```
Cualquier agente → Evento ALERT_CREATED
  → Gerencial evalúa prioridad
  → Si critical → notificación inmediata (email/WhatsApp fase 2)
  → Si info → acumula para reporte semanal
```

## Patrón de orquestación (Foreman)

Basado en [Knowlee Foreman Pattern](https://www.knowlee.ai/blog/how-to-build-multi-agent-ai-system) y [LangGraph production guide](https://pub.towardsai.net/langgraph-vs-crewai-vs-autogen-which-ai-agent-framework-should-your-enterprise-use-in-2026-3a9ebb407b09):

- **NO** peer-to-peer entre agentes especialistas
- **SÍ** todos escriben en memoria compartida vía Event Bus
- **SÍ** Gerencial lee eventos y decide qué agente invocar next
- **SÍ** cada handoff usa schema Zod validado

## Seguridad

- Tokens OAuth encriptados en DB (AES-256-GCM)
- `.env.local` nunca en git
- Scopes Gmail mínimos: `gmail.send`, `gmail.readonly`, `drive.file`
- Auditoría de cada decisión de agente en tabla `agent_runs`

## Escalabilidad (fase 2+)

- SQLite → PostgreSQL (Neon/Supabase)
- Event Bus → Redis Streams o BullMQ
- Orquestador → LangGraph.js con checkpointing
- Multi-tenant por `company_id`
