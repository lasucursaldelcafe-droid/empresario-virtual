# Integraciones — Roadmap

## MVP (implementado / en progreso)

| Integración | Estado | Uso |
|-------------|--------|-----|
| Gmail API | OAuth setup + envío reportes | Notificaciones y lectura de adjuntos |
| Google Drive | OAuth compartido | Respaldo documental |
| SQLite local | Activo | Persistencia MVP |
| OpenAI API | Configurable | Análisis con IA |

## Fase 2

| Integración | Prioridad | Notas |
|-------------|-----------|-------|
| WhatsApp Business API | Alta | Alertas críticas al móvil |
| Siigo / Alegra (Colombia) | Alta | Contabilidad local |
| Facturación electrónica DIAN | Media | Según país |
| Meta (Instagram/Facebook) | Media | Agente Marketing |
| Bancos (Open Banking) | Baja | Conciliación automática |

## Canales de ingesta documental

1. **Web upload** — Dashboard drag & drop
2. **Email** — Forward a alias dedicado (ej. `docs@tuempresa.empresariovirtual.app`)
3. **Google Drive** — Carpeta monitoreada
4. **API** — Integraciones POS/ERP

## Scopes OAuth Google (mínimos)

```
https://www.googleapis.com/auth/gmail.send
https://www.googleapis.com/auth/gmail.readonly
https://www.googleapis.com/auth/drive.file
https://www.googleapis.com/auth/userinfo.email
```

Referencia: [Google OAuth best practices](https://developers.google.com/identity/protocols/oauth2/resources/best-practices)
