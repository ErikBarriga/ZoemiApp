# ZoemiApp

Aplicación web (PWA) para niños con discapacidad: actividades que ayudan a su desarrollo y aprendizaje.
Pensada para móviles y tablets, con botones grandes (motricidad fina limitada), mucho contraste, audio en
español de México y un panel aparte para que un administrador cargue el contenido.

El proyecto tiene **dos aplicaciones separadas**:

| Carpeta | Qué es | Quién la usa | Puerto local |
|---|---|---|---|
| `frontoffice/` | La app de los niños (PWA). **Solo lee** contenido publicado. | Niños, familias, escuelas | 5173 |
| `backoffice/` | Panel de contenido. Protegido con **correo + contraseña + código de 2 pasos**. | Solo administradores | 5174 |

Las dos se publican como **sitios distintos** (`app.tudominio.com` y `admin.tudominio.com`). El código del panel
nunca viaja en la app de los niños.

```
                    ┌──────────────────────────┐
  Niños ──────────► │  frontoffice (PWA)       │──── lee ────┐
                    │  Cloudflare Pages        │             ▼
                    └──────────────────────────┘      ┌─────────────────┐
                                                       │   Supabase      │
                    ┌──────────────────────────┐      │  · PostgreSQL   │
  Administrador ──► │  backoffice (panel)      │─ lee │  · Auth + 2FA   │
   (usuario +       │  Cloudflare Pages        │  y ─►│  · Storage      │
   contraseña + 2FA)└──────────────────────────┘ escribe └───────────────┘
```

La seguridad de los datos **no depende de esconder el panel**: la aplican las reglas de la base de datos
(Row Level Security, ver `supabase/schema.sql`).

## Estructura del repositorio

```
ZoemiApp/
├─ README.md
├─ supabase/schema.sql        Tablas, reglas de seguridad (RLS), bucket de archivos y datos iniciales
├─ frontoffice/               App de los niños (React + TypeScript + Vite + PWA)
│  ├─ src/pages/              Home, Listen, Quiz, Voice, Noise, Karaoke
│  ├─ src/components/         Tile, ScreenHeader, íconos…
│  ├─ src/lib/                api.ts (datos + copia sin conexión), hooks.ts (audio y micrófono), reveal.ts
│  └─ public/                 Íconos de la PWA, _headers, _redirects
├─ backoffice/                Panel de contenido (React + TypeScript + Vite)
│  ├─ src/lib/auth.tsx        Inicio de sesión + verificación en dos pasos (TOTP)
│  ├─ src/pages/              Login, Questions, QuestionForm, Sections, NoiseList/Form, Songs, SongForm
│  └─ public/                 _headers, _redirects, robots.txt
└─ .github/workflows/keepalive.yml   Evita que Supabase gratuito se pause por inactividad
```

## Funciones

### App de los niños (`frontoffice`)

- **Menú principal** con dos mosaicos grandes: *Escucha la Pregunta* y *Practica tu Voz*.
- **Escucha la Pregunta**: el submenú se arma con las **secciones** de la base de datos (por defecto: Animales,
  Adivinanzas, Letras y números). Cada pregunta tiene texto, audio (botón *Escuchar*), un audio opcional de
  sonido y **3 opciones** (imagen o texto corto). Si el niño toca una incorrecta, se marca y **puede elegir otra**;
  al acertar se marca la correcta. Siguiente (aleatoria, sin repetir hasta agotarlas) y Anterior.
- **Practica tu Voz**
  - **Haz ruido**: con el micrófono, la imagen se asoma desde abajo, arriba, izquierda, derecha o se abre
    en un círculo al centro; puede *descubrirse* o *taparse* con el ruido. Tiene ajuste de sensibilidad. El micrófono
    solo mide volumen: **no graba ni envía audio**.
  - **Karaoke**: letra sincronizada con la canción; la línea actual se resalta. Botones de línea anterior/siguiente.
- **Sin conexión**: el texto se guarda en el dispositivo y los audios/imágenes se guardan en caché (service worker).

### Panel de contenido (`backoffice`)

- **Acceso**: correo + contraseña, y código de 6 dígitos (app de autenticación). La primera vez pide activar el
  2.º paso con un código QR. No existe pantalla de “crear cuenta”.
- **Preguntas**: elegir sección → texto → audio → 3 opciones (imagen o texto) → marcar la correcta. Lista con
  publicar/ocultar, editar y borrar.
- **Secciones**: crear, ordenar (mosaicos), cambiar color/ícono, ocultar y borrar.
- **Haz ruido**: instrucción, audio, imagen, por dónde aparece, efecto y **vista previa** con una barra de volumen simulada.
- **Karaoke**: audio, origen de la canción (propia / dominio público / con licencia), letra y **marcado de tiempos**
  mientras suena el audio.

## Requisitos

- Windows 10/11, **Node.js 22 LTS** (`node -v`), Git y VS Code (o Visual Studio con “Abrir carpeta”).
- Cuenta gratuita en [Supabase](https://supabase.com), [Cloudflare](https://dash.cloudflare.com) y [GitHub](https://github.com).

## 1. Configurar Supabase (una sola vez)

1. Crea un proyecto en Supabase (elige una región cercana a México, por ejemplo *East US*).
2. **SQL Editor → New query**: pega **todo** `supabase/schema.sql` y pulsa **Run**. Crea tablas, reglas de seguridad,
   el bucket `media` (10 MB por archivo; solo PNG/JPG/WebP y MP3/M4A/AAC/WAV) y las 3 secciones iniciales.
3. **Primer administrador** (tú):
   1. **Authentication → Users → Add user → Create new user**. Escribe tu correo y una contraseña larga y única
      (guárdala en un administrador de contraseñas). Marca **Auto Confirm User**.
   2. En el **SQL Editor** ejecuta (con tu correo):
      ```sql
      insert into public.admins (user_id)
      select id from auth.users where email = 'tu-correo@ejemplo.com';
      ```
4. **Desactiva el registro público**: en **Authentication → Sign In / Providers** (o *Settings*) apaga
   **“Allow new users to sign up”**. Así nadie más puede crear cuentas. (El nombre exacto puede cambiar entre
   versiones del panel de Supabase.)
5. Verifica que **MFA con app de autenticación (TOTP)** esté habilitado (Authentication → Multi-Factor).
6. **Project Settings → API**: copia **Project URL** y la llave **anon / public**. *(Nunca uses ni compartas la
   `service_role`.)*

> Las escrituras exigen estar en la tabla `admins` **y** haber verificado el 2.º paso. Si por algún motivo quedas
> bloqueado, puedes quitar temporalmente la condición `aal2` en la función `is_admin()` de `schema.sql`.

## 2. Ejecutar y depurar en local

Abre dos terminales de PowerShell.

```powershell
# Terminal 1 · app de los niños
cd C:\Users\erik.barriga\source\repos\ZoemiApp\frontoffice
copy .env.example .env.local      # edita .env.local con tu URL y anon key
npm install
npm run dev                       # http://localhost:5173
```

```powershell
# Terminal 2 · panel de contenido
cd C:\Users\erik.barriga\source\repos\ZoemiApp\backoffice
copy .env.example .env.local      # mismos valores
npm install
npm run dev                       # http://localhost:5174
```

Orden recomendado para probar: entra al panel → entra con tu usuario → activa el 2.º paso → crea una pregunta con
audio e imágenes → abre la app de los niños → *Escucha la Pregunta*.

**Depurar**

- Abre la carpeta `ZoemiApp` en VS Code, deja corriendo `npm run dev` y pulsa **F5** con la configuración
  *Front office (Chrome)* o *Back office (Chrome)* (`.vscode/launch.json`). Puedes poner puntos de interrupción en
  los archivos `.tsx`.
- También sirven las herramientas del navegador (F12): los *source maps* están activados.
- `npm run typecheck` revisa los tipos de TypeScript; `npm run build` genera la versión de producción en `dist/`.
- Para probar la PWA y el modo sin conexión (service worker) usa la versión compilada:
  `npm run build` y luego `npm run preview` (http://localhost:4173). En `npm run dev` el service worker no se registra.

**Probar en el celular**

- El navegador solo permite usar el **micrófono** en páginas `https://` o `localhost`. Por eso, en el celular la
  actividad *Haz ruido* no funciona con `http://192.168.x.x:5173`.
- Opción simple: instala [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/)
  (`winget install Cloudflare.cloudflared`) y ejecuta `cloudflared tunnel --url http://localhost:5173`. Abre en el
  celular la dirección `https://….trycloudflare.com` que muestra. (Ya está permitida en `vite.config.ts`.)
- Otra opción: publicar en Cloudflare Pages (siguiente sección) y probar ahí.

## 3. Publicar (Cloudflare Pages + Supabase)

Cada app es un proyecto de Pages distinto, ambos conectados al mismo repositorio de GitHub.

1. **Sube el código a GitHub** (repositorio privado recomendado):
   ```powershell
   cd C:\Users\erik.barriga\source\repos\ZoemiApp
   git init
   git add .
   git commit -m "ZoemiApp: primera versión"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/ZoemiApp.git
   git push -u origin main
   ```
   Los archivos `.env*` no se suben (están en `.gitignore`).
2. En Cloudflare: **Workers & Pages → Create → Pages → Connect to Git** y elige el repositorio. Crea **dos proyectos**:

   | | App de los niños | Panel |
   |---|---|---|
   | Nombre del proyecto | `zoemiapp-app` | `zoemiapp-admin` |
   | Root directory | `frontoffice` | `backoffice` |
   | Build command | `npm run build` | `npm run build` |
   | Build output directory | `dist` | `dist` |
   | Variables de entorno | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `NODE_VERSION=22` | las mismas |

   Las variables `VITE_…` se incorporan **al compilar**: si las cambias, vuelve a desplegar.
3. **Dominios**: en cada proyecto, *Custom domains* → `app.tudominio.com` y `admin.tudominio.com`
   (o usa los `*.pages.dev` mientras tanto). El HTTPS es automático.
4. En Supabase, **Authentication → URL Configuration**: pon como *Site URL* la dirección del panel
   (`https://admin.tudominio.com`).
5. **Evitar la pausa del proyecto gratuito de Supabase** (se pausa tras ~7 días sin actividad): en GitHub,
   *Settings → Secrets and variables → Actions* agrega `SUPABASE_URL` y `SUPABASE_ANON_KEY`. El workflow
   `.github/workflows/keepalive.yml` hace una consulta mínima cada 3 días. (GitHub desactiva los workflows
   programados si el repositorio pasa 60 días sin actividad: vuelve a activarlo desde la pestaña *Actions*.)
   Aun si Supabase se pausara, la app de los niños sigue mostrando la última copia guardada en cada dispositivo.

**Alternativa por línea de comandos** (sin conectar GitHub):

```powershell
cd C:\Users\erik.barriga\source\repos\ZoemiApp\frontoffice
npm run build
npx wrangler login
npx wrangler pages deploy dist --project-name zoemiapp-app
```

Los archivos `public/_headers` y `public/_redirects` de cada app ya configuran las cabeceras de seguridad
(CSP, sin iframes, `noindex` en el panel) y el enrutado de una sola página. Si cambias de dominio de Supabase o
agregas servicios externos, actualiza el `connect-src`/`img-src` de la CSP en `_headers`.

### Capa extra opcional para el panel

Puedes poner `admin.tudominio.com` detrás de **Cloudflare Access** (Zero Trust) para pedir identificación antes de que
cargue la página. Revisa los límites de su plan gratuito. No sustituye al inicio de sesión de la app.

## Seguridad: resumen

- La app de los niños usa la llave pública (*anon*) y solo puede **leer** contenido publicado.
- Escribir, subir o borrar requiere: estar en la tabla `admins` **y** sesión con 2.º paso (`aal2`), tanto en las tablas
  como en el almacenamiento. Aunque alguien obtenga la llave pública, no puede modificar nada.
- No hay registro de usuarios. Los administradores se crean desde la consola de Supabase.
- La llave `service_role` nunca va en el código ni en el repositorio. Activa verificación en dos pasos también en tus
  cuentas de GitHub, Cloudflare y Supabase.
- La app no pide ni guarda datos personales de los niños. El micrófono solo mide volumen en el dispositivo.
- Sube solo canciones propias, de dominio público o con licencia (campo *Origen*).
- Haz copias periódicas de la base de datos y de los archivos; confirma qué respaldos incluye tu plan de Supabase.
- `npm audit` puede mostrar avisos de nivel *bajo* en `vite-plugin-pwa` (solo herramientas de compilación, no van en
  el sitio publicado). Revísalo de vez en cuando con `npm audit` y `npm update`.

## Agregar nuevas funcionalidades

**Nueva sección de preguntas**: no requiere código. Panel → *Secciones* → *Agregar sección*; aparece sola como mosaico.

**Nueva sub app** (ejemplo: “Colores”):

1. **Base de datos**: agrega la tabla y sus reglas de seguridad al final de `supabase/schema.sql` (lectura pública solo si
   está publicada; escritura con `public.is_admin()`) y ejecútalo en Supabase.
2. **Front office**: agrega los tipos en `src/types.ts`, la consulta en `src/lib/api.ts` (con `cached(...)` para el modo
   sin conexión), una página en `src/pages/`, la ruta en `src/App.tsx` y un `<Tile>` en `Voice.tsx` o `Listen.tsx`.
3. **Back office**: tipos en `src/types.ts`, páginas de lista y formulario (copia `NoiseList.tsx` / `NoiseForm.tsx`),
   rutas en `src/App.tsx` y el enlace en `src/components/Layout.tsx`.

Los tipos de datos están duplicados en ambas apps a propósito (son proyectos independientes). Si crecen mucho,
conviene moverlos a un paquete compartido.

## Ideas y pendientes para siguientes versiones

- Grabar el audio directamente desde el panel (hoy se sube MP3/M4A/AAC/WAV).
- Paso de **Publicar** que exporte el contenido a un archivo estático (así la app de los niños no depende de la base de datos).
- Ajustes de accesibilidad por niño: tiempo de espera antes de aceptar un toque, tamaño de botones, voz más lenta.
- Seguimiento de avance (sin datos personales), reordenar preguntas arrastrando, y limpieza de archivos huérfanos del almacenamiento.
- Guardar pregunta y opciones en una sola transacción (hoy son varias llamadas seguidas).
- Pruebas automáticas (Vitest / Playwright).

## Solución de problemas

| Síntoma | Qué revisar |
|---|---|
| “Falta configurar Supabase” | Falta `.env.local` (o las variables en Cloudflare) y reiniciar `npm run dev`. |
| “La cuenta … no tiene permiso de administrador” | Ejecuta el `insert into public.admins …` con tu correo (paso 1.3). |
| El panel entra pero no deja guardar (“row-level security”) | No completaste el 2.º paso, o tu usuario no está en `admins`. |
| No pide / no acepta el código de 2 pasos | Confirma que MFA TOTP esté habilitado en Supabase y que la hora del celular sea automática. |
| La app de los niños sale vacía | Hay que crear preguntas y dejarlas **publicadas**, y la sección debe estar **visible**. |
| *Haz ruido* no pide micrófono en el celular | Necesita `https://` (ver “Probar en el celular”) y permitir el micrófono. |
| Los audios no suenan sin conexión | Primero abre la actividad con internet para que se guarden; en iPhone el audio se guarda al iniciar la reproducción. |
| Error 403 “host is not allowed” en local | Agrega el dominio del túnel a `server.allowedHosts` en `vite.config.ts`. |
