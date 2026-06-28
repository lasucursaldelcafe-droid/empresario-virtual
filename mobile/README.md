# Empresario Virtual — App Android

App móvil (Expo / React Native) conectada al backend Next.js.

## Requisitos

- Node.js 20+
- [Android Studio](https://developer.android.com/studio) con emulador, o dispositivo físico
- Backend corriendo (local o Vercel)

## Configuración

```bash
cd mobile
npm install
```

Crea `.env`:

```env
# Producción (tras deploy en Vercel)
EXPO_PUBLIC_API_URL=https://tu-proyecto.vercel.app

# Emulador Android + backend local
# EXPO_PUBLIC_API_URL=http://10.0.2.2:3000

# Dispositivo físico en la misma red WiFi
# EXPO_PUBLIC_API_URL=http://192.168.x.x:3000
```

También puedes cambiar la URL desde la app (botón ⚙️ API).

## Ejecutar en Android

```bash
npm run android
```

O con Expo Go:

```bash
npm start
# Escanea QR con Expo Go en tu teléfono
```

## Generar APK (EAS Build)

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build -p android --profile preview
```

## Funciones

- Estado de conexión con el servidor
- Cierre diario con los 8 agentes
- KPIs, alertas y reporte gerencial
- Lista de agentes activos
- Enlace al dashboard web
