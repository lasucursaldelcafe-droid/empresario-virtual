# Protocolo de comunicación entre agentes

## Regla fundamental

Los agentes **no se llaman entre sí directamente**. Comunican mediante:

1. **Event Bus** — eventos tipados publicados/suscritos
2. **Company Memory** — estado persistente compartido (KPIs, documentos, alertas)
3. **Gerencial** — único agente que orquesta secuencias multi-paso

## Tipos de evento

| Evento | Emisor típico | Consumidores | Payload |
|--------|---------------|--------------|---------|
| `DOCUMENT_UPLOADED` | API / Gmail | Administrativo | `{ documentId, source }` |
| `DOCUMENT_CLASSIFIED` | Administrativo | Financiero, Contable | `{ documentId, type, amount? }` |
| `TRANSACTION_RECORDED` | Financiero | Gerencial | `{ type, amount, category }` |
| `KPI_UPDATED` | Financiero | Gerencial | `{ kpis }` |
| `ALERT_CREATED` | Cualquiera | Gerencial | `{ severity, message, agentId }` |
| `CLIENT_INACTIVE` | Comercial | Gerencial, Marketing | `{ clientId, daysSincePurchase }` |
| `LEGAL_DEADLINE` | Jurídico | Gerencial | `{ obligation, dueDate }` |
| `DAILY_CLOSE_REQUESTED` | API / Cron | Gerencial | `{ date }` |
| `REPORT_GENERATED` | Gerencial | Gmail integration | `{ reportType, content }` |

## Contrato de salida (todos los agentes)

```typescript
interface AgentOutput {
  agentId: AgentId;
  status: "success" | "partial" | "error";
  summary: string;           // Texto humano breve
  data: Record<string, unknown>; // Datos estructurados
  alerts: Alert[];           // Alertas generadas
  events: AgentEvent[];      // Eventos para publicar
  confidence: number;        // 0-1
  requiresApproval: boolean;   // Human-in-the-loop
}
```

## Roles y responsabilidades

### 1. Administrativo (`administrativo`)
- **Entrada**: documentos crudos, emails con adjuntos
- **Salida**: clasificación, carpetas, vencimientos
- **NO hace**: cálculos financieros

### 2. Financiero (`financiero`)
- **Entrada**: transacciones, cierre de caja, eventos DOCUMENT_CLASSIFIED
- **Salida**: KPIs (ventas, gastos, utilidad, flujo de caja)
- **Ejemplo**: "Las utilidades disminuyeron 12% esta semana"

### 3. Contable (`contable`)
- **Entrada**: facturas, pagos, integración contable
- **Salida**: validación fiscal, variaciones de proveedores
- **Ejemplo**: "Proveedor A aumentó café 8% vs mes anterior"

### 4. Operativo (`operativo`)
- **Entrada**: turnos, inventario, tareas
- **Salida**: incidencias de personal, stock bajo
- **Ejemplo**: "3 llegadas tarde esta semana"

### 5. Marketing (`marketing`)
- **Entrada**: métricas redes, calendario contenido
- **Salida**: recomendaciones de campaña, cronograma

### 6. Comercial (`comercial`)
- **Entrada**: CRM, historial de compras
- **Salida**: clientes inactivos, oportunidades, cobranza
- **Ejemplo**: "Hace 45 días que este cliente no compra"

### 7. Jurídico (`juridico`)
- **Entrada**: contratos, calendario legal
- **Salida**: vencimientos, obligaciones laborales/fiscales

### 8. Gerencial (`gerencial`) — ORQUESTADOR
- **Entrada**: todos los eventos + memoria completa
- **Salida**: reporte ejecutivo, priorización, recomendaciones
- **Secuencia daily-close**: invoca agentes en orden definido, agrega resultados

## Secuencia determinista: cierre diario

```
1. administrativo.run({ phase: "daily-ingest" })
2. financiero.run({ phase: "daily-kpis" })
3. contable.run({ phase: "daily-reconciliation" })
4. operativo.run({ phase: "daily-ops" })
5. comercial.run({ phase: "daily-crm" })
6. marketing.run({ phase: "daily-metrics" })  // skip si no hay datos
7. juridico.run({ phase: "daily-compliance" })
8. gerencial.run({ phase: "synthesize", inputs: [1..7] })
```

## Niveles de alerta

| Nivel | Acción Gerencial |
|-------|------------------|
| `info` | Acumular en reporte |
| `warning` | Incluir destacado en reporte diario |
| `critical` | Notificación inmediata + requiere atención |

## Human-in-the-loop

Requiere aprobación cuando:
- Monto > umbral configurable (`APPROVAL_THRESHOLD`)
- Agente reporta `confidence < 0.7`
- Jurídico marca obligación legal no cumplida
- Contable detecta discrepancia fiscal
