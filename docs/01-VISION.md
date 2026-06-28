# Empresario Virtual — Visión del producto

## Problema

Micro y pequeñas empresas producen y venden bien, pero carecen de equipo administrativo especializado. Contratar contador, financiero, administrador, marketing y analista es costoso. El resultado: datos dispersos, decisiones sin información, costos sin control y el empresario haciendo todo.

## Propuesta de valor

> Un equipo administrativo completo impulsado por IA, disponible 24/7, a un costo muy inferior al de contratar varios profesionales.

## Usuario objetivo

- Cafeterías, restaurantes, tiendas, talleres, fincas, pequeñas industrias
- 1–20 empleados
- Sin ERP formal o con contabilidad básica desconectada

## Objetivo general

Plataforma administrativa basada en IA que permita gestionar áreas administrativas, financieras, operativas y comerciales mediante agentes especializados coordinados.

## Objetivos específicos (MVP → completo)

| # | Objetivo | Fase |
|---|----------|------|
| 1 | Organización documental automática | MVP |
| 2 | Indicadores financieros | MVP |
| 3 | Control de costos y rentabilidad | MVP |
| 4 | Marketing y ventas | Fase 2 |
| 5 | Operaciones y talento humano | Fase 2 |
| 6 | Reportes automáticos | MVP |
| 7 | Integraciones (Drive, Gmail, contabilidad) | MVP parcial |
| 8 | Alertas tempranas | MVP |

## Referencias de mercado analizadas

- **DocWeaver / KrinoDoc / Boki**: automatización documental + ERP (OCR, validación, human-in-the-loop)
- **Patrón Foreman (Knowlee 2026)**: un orquestador central, no comunicación caótica entre agentes
- **LangGraph / CrewAI**: orquestación determinística con estado persistente para producción
- **MCP**: protocolo estándar para herramientas externas (Gmail, Drive, contabilidad)

## Principios de diseño

1. **Un cerebro, muchas especialidades** — El Agente Gerencial sintetiza; los demás producen señales estructuradas.
2. **Salidas JSON validadas** — Nunca parsear texto libre entre agentes.
3. **Human-in-the-loop** — Decisiones de alto impacto requieren aprobación.
4. **Empezar simple** — Validar valor con 3 agentes antes de activar los 8.
