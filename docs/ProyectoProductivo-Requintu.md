# REQUINTU

### Plataforma web para la visibilización de atractivos, servicios y emprendimientos turísticos locales de Colombia

**Proyecto productivo — Etapa Práctica (SENA)**

---

## 0. Ficha de identificación del proyecto

| Dato | Valor |
|---|---|
| **Nombre del proyecto** | REQUINTU — Plataforma web de visibilización turística local de Colombia |
| **Aprendiz del proyecto** | Jaider Giraldo Arcila |
| **Programa de formación** | Procesamiento de Pruebas de Software |
| **Número de ficha** | 3236076 |
| **Instructor / asesor de Etapa Práctica** | Javier Alejandro López Oviedo |
| **Regional / Centro de formación** | **[Regional] — [Centro de formación]** |
| **Ciudad y fecha de elaboración** | **[Ciudad]**, 2026 |
| **Modalidad de la Etapa Práctica** | Proyecto productivo |
| **Producto en producción** | Web: `https://requintu.vercel.app` — API: `https://requintu-1.onrender.com` |

> **Instrucción:** reemplaza entre corchetes `[...]` los datos personales e institucionales antes de entregar el documento. El resto del documento describe el proyecto REQUINTU con datos reales de su implementación.

---

## 1. Introducción

Colombia es uno de los países con mayor riqueza turística de la región: miles de municipios ofrecen atractivos naturales, gastronómicos y culturales. Sin embargo, la mayoría de los pequeños emprendimientos turísticos (hospedajes, restaurantes, guías y artesanos) no tienen una presencia digital organizada: su información está repartida en redes sociales, sin horarios verificados, sin medio de contacto estructurado y sin una forma confiable de conocer su calidad.

REQUINTU es una plataforma web desarrollada como proyecto productivo que da solución a esta necesidad: permite a cualquier persona **publicar, localizar y valorar locales y servicios turísticos** de su municipio, consultarlos en un **mapa interactivo de Colombia**, y participar en un **muro social** de publicaciones, todo dentro de un marco de **moderación y seguridad** en el que la calidad del software se garantiza mediante un proceso completo de **pruebas automatizadas y funcionales**, alineado con el programa de formación.

Este documento presenta el proyecto productivo en sus componentes exigidos por la Etapa Práctica: alineación curricular, planteamiento del problema, estudio de mercado, estudio técnico y operativo, análisis financiero, estrategia de acompañamiento, entregables y evidencias.

---

## 2. Alineación curricular

El proyecto se enmarca en el programa de formación **Procesamiento de Pruebas de Software**. REQUINTU no solo se desarrolló como producto tecnológico; fue concebido y ejecutado como un **caso real de aseguramiento de la calidad de software**, permitiendo evidenciar la aplicación de las competencias del programa:

| Competencia aplicada (área del programa) | Evidencia en REQUINTU |
|---|---|
| Interpretación de requisitos y especificaciones funcionales | Definición de historias de usuario: registro e inicio de sesión, publicación de locales, muro, calificaciones, denuncias, panel administrativo. |
| Diseño de casos de prueba a partir de requisitos | Casos de prueba documentados en el *Informe de Pruebas Requintu v1.3* (más de 30 casos: autenticación, CRUD, denuncias, autorización por roles, seguridad). |
| Ejecución de pruebas funcionales y registro de resultados | Ejecución manual documentada y **pruebas automatizadas**: 22 casos de prueba de API (Node Test Runner) y 12 pruebas de extremo a extremo (Playwright). |
| Aplicación de técnicas de prueba de seguridad | Payloads de **XSS** probados en muro y comentarios (resultado: se procesan como texto inerte); protección con `helmet`, `express-rate-limit`, `express-validator`); validación de archivos e **moderación NSFW** de imágenes. |
| Automatización de pruebas | Suites `npm test` (API) y `npm run test:e2e` (Playwright sobre Chromium) ejecutadas en el flujo de trabajo del proyecto. |
| Gestión y reporte de defectos | Bitácoras de avance y corrección de hallazgos (p. ej., limpieza de advertencias del linter, fijación de dependencias para el despliegue). |
| Competencias transversales (formulación de proyectos, inglés técnico, trabajo en equipo) | Este documento, interfaz bilingüe ES/EN, repositorio compartido en GitHub. |

> **Nota:** en la versión final se recomienda listar uno a uno los **códigos de competencia y resultados de aprendizaje** del programa de formación (CR/RAP) con sus evidencias, tomándolos de la plataforma Sofía Plus.

---

## 3. Planteamiento del problema y justificación

**Problema.** Los atractivos y emprendimientos turísticos de municipios de Colombia —en particular los de menor tamaño— carecen de un canal digital centralizado que les permita:

1. Darse a conocer de forma verificable (horarios, dirección, fotos reales).
2. Ser localizados geográficamente por el turista (mapa).
3. Recibir y mostrar valoraciones honestas de sus visitantes.
4. Estar en un entorno ordenado y seguro, libre de contenido inapropiado o fraudulento.

La alternativa habitual (un perfil en redes sociales) no resuelve la búsqueda por ubicación ni genera confianza, y las plataformas internacionales generalistas no están ajustadas a la realidad de los municipios colombianos.

**Justificación.** Con REQUINTU, un emprendedor local publica su negocio en minutos, el turista lo encuentra en el mapa de Colombia, y la calidad del servicio se sostiene con un sistema de **calificaciones, comentarios, denuncias y moderación de contenido**. Además, el proyecto demuestra que la calidad de un producto de software se alcanza con un **proceso disciplinado de pruebas**, lo cual es competencia directa del programa.

**Necesidad que resuelve:** visibilización de oferta turística local, generación de confianza para el viajero y fomento del turismo de base comunitaria.

---

## 4. Objetivos

**Objetivo general**

Diseñar, desarrollar y poner en operación una plataforma web para la visibilización, localización y valoración de establecimientos turísticos de municipios colombianos, garantizando su calidad mediante pruebas funcionales, automatizadas y de seguridad.

**Objetivos específicos**

1. Desarrollar el módulo de autenticación y roles (viajero, propietario, administrador) con manejo seguro de contraseñas, sesiones y recuperación de cuenta.
2. Implementar el módulo de locales: publicación, edición, georreferenciación en el mapa de Colombia, galería de imágenes y calificaciones/comentarios.
3. Implementar el muro social de publicaciones con actualización en tiempo real y reglas de contenido seguro.
4. Implementar el sistema de moderación de imágenes (NSFW) y de denuncias con panel administrativo.
5. Definir y ejecutar el proceso de pruebas: casos de prueba, automatización de API y end-to-end, y pruebas de seguridad.
6. Desplegar el producto en ambientes reales (web y Android) y documentar su uso.

---

## 5. Estudio de mercado

### 5.1 Contexto del sector

El turismo interno colombiano crece de forma sostenida; los viajeros consultan primero medios digitales para decidir alojamiento, alimentación y actividades. Existe alta demanda de **información confiable y localizada**.

### 5.2 Cliente objetivo (segmentos)

| Segmento | Descripción | Propuesta de valor |
|---|---|---|
| **A) Propietarios de emprendimientos turísticos** | Hospedajes familiares, restaurantes, artesanos, guías locales de municipios de Colombia. | Perfil público verificable, ubicación en el mapa, valoraciones, idioma ES/EN. |
| **B) Viajeros y turistas** | Personas que planean viajes nacionales o internacionales hacia Colombia. | Descubrir, ubicar y elegir con confianza establecimientos locales. |
| **C) Administradores del ecosistema** | Secretarías de turismo, juntas, operadores. | Canal ordenado de promoción y control de la oferta local. |

### 5.3 Competencia

| Competidor | Fortaleza | Debilidad | Diferenciación de REQUINTU |
|---|---|---|---|
| Google Maps | Alcance masivo | Sin curaduría local; reseñas genéricas | Enfoque en municipios colombianos con ficha propia |
| TripAdvisor | Gran base de datos | Modelo internacional, poco ajustado a lo local | Muro social + mapa nacional + moderación activa |
| Redes sociales (Instagram/Facebook) | Notoriedad | Sin búsqueda por ubicación ni confianza | Estructura ordenada y valoraciones verificables |
| Perfiles institucionales de turismo | Oficiales | Información estática, difícil de actualizar | Actualización continua por el propio emprendedor |

### 5.4 Modelo de precios

Estrategia **freemium** (gratuito durante la Etapa Práctica para generación de base de usuarios; monetización posterior):

| Plan | Destinatario | Precio estimado | Beneficios |
|---|---|---|---|
| **Gratis** | Todos | $0 COP | Publicar local, muro, valoraciones, mapa. |
| **Destacado Pro** | Propietarios | **$19.900 COP/mes** (estimado) | Posicionamiento prioritario en buscador y mapa, insignia "Destacado", estadísticas básicas de visitas. |
| **Publicidad directa** | Negocios aliados | **$50.000 COP/mes** (estimado) | Banner en portada segmentado por municipio. |

> Los precios son proyecciones para la fase de comercialización (la validación durante la Etapa Práctica se hace a valor $0).

### 5.5 Estrategia de comercialización

- **Canales:** alianzas con secretarías de turismo y juntas locales, ferias de emprendimiento, redes sociales y referidos.
- **Campaña de lanzamiento:** cargue gratuito de los primeros 50 locales por municipio piloto (actividad académica).
- **Fidelización:** boletín a propietarios y soporte con manual de uso (se entrega *Manual de Uso Requintu*).
- **Internacionalización:** interfaz bilingüe ES/EN ya implementada para el turismo receptor.

---

## 6. Estudio técnico y operativo

### 6.1 Arquitectura del sistema

```
                 ┌─────────────────────────────────────────────┐
   Usuario ─────▶│  CLIENTE                                   │
  (Navegador /   │  React 19 (SPA) · Vite · React Router      │
   App Android)  │  i18next (ES/EN) · PWA · Capacitor (APK)   │
                 └──────────────┬──────────────────────────────┘
                                │ HTTPS / API REST (JSON)
                                ▼
                 ┌─────────────────────────────────────────────┐
                 │  BACKEND  (Node.js · Express.js)            │
                 │  jwt · bcrypt · multer · nodemailer         │
                 │  helmet · express-rate-limit · validator    │
                 │  Cola de correos · Filtro profano           │
                 │  Moderación NSFW (TensorFlow.js + nsfwjs)   │
                 └───────┬──────────────────────┬──────────────┘
                         │                      │
                         ▼                      ▼
                 ┌──────────────┐       ┌──────────────────┐
                 │  MySQL       │       │  Cloudinary      │
                 │  (datos)     │       │  (imágenes)      │
                 └──────────────┘       └──────────────────┘
```

### 6.2 Stack tecnológico

| Capa | Tecnología | Uso |
|---|---|---|
| Frontend | React 19, Vite 8, React Router 7 | Interfaz de usuario (SPA) |
| Internacionalización | i18next + react-i18next | Textos ES/EN |
| Estilos | CSS propio + Swiper (carruseles) | Diseño y componentes visuales |
| PWA / Android | vite-plugin-pwa, Capacitor 8 | Instalable en web y APK/AAB |
| Backend | Node.js, Express 4 | API REST |
| Base de datos | MySQL (mysql2) | Persistencia |
| Autenticación | JWT, bcryptjs, cookies | Sesiones seguras |
| Seguridad | helmet, express-rate-limit, express-validator | Cabeceras, límites, validación |
| Archivos | Multer + Cloudinary | Subida y almacenamiento de imágenes |
| Moderación de contenido | nsfwjs 4.3.0 + @tensorflow/tfjs; filtro profano propio | Imágenes y textos inapropiados |
| Correos | Nodemailer + cola de correos | Bienvenida, recuperación de contraseña |
| Pruebas | Node Test Runner (API), Playwright (e2e), oxlint | Calidad del software |
| Despliegue | Vercel (web), Render (API), GitHub | Ambientes reales |

### 6.3 Proceso de operación (flujo de trabajo)

**Desarrollo (iterativo):**
1. Backlog de historias de usuario → 2. Diseño (UI en componentes) → 3. Desarrollo (módulos) → 4. Pruebas (unitarias/API/e2e) → 5. Despliegue → 6. Retroalimentación y mantenimiento.

**Prestación del servicio (funcionamiento del producto):**
1. El propietario se registra y crea su local (nombre, categoría, municipio/departamento, ubicación en el mapa de Colombia, fotos y horarios).
2. El turista busca por nombre, categoría o departamento/municipio y lo ubica geográficamente.
3. Los visitantes publican en el muro y califican; el sistema modera contenido y denuncias llegan al panel administrativo.
4. El administrador gestiona usuarios, locales, publicaciones y reportes desde el panel.

**Insumos y herramientas operativas:**
- Cuentas gratuitas de despliegue: Vercel, Render (free/calidad), Cloudinary (plan gratuito), base de datos en la nube.
- Herramientas de desarrollo: VS Code, Node.js, Git/GitHub, npm.
- Equipo: computador portátil (disponible en la Etapa Práctica).

**Localización:** el desarrollo es en sitio de práctica/remoto; la operación es 100 % en la nube con infraestructura compartida (mínima huella local). No se requiere maquinaria física.

### 6.4 Aseguramiento de la calidad (proceso de pruebas implementado)

| Nivel | Técnica | Evidencia |
|---|---|---|
| Estático | Análisis de código (oxlint) | 0 errores; advertencias preexistentes documentadas |
| Unitario / API | Node Test Runner (`test/api.test.mjs`) | **22 pruebas automatizadas** de API |
| End-to-end | Playwright (Chromium, servidor real) | **12 pruebas e2e**: auth, denuncias, inicio, muro, privacidad, seguridad |
| Funcional manual | Ejecución de casos de prueba | *Informe de Pruebas Requintu v1.3* (>30 casos) |
| Seguridad | Payloads XSS, límites de tasa, moderación NSFW | Resultados en informe: contenido inerte, cabeceras seguras |

Este proceso demuestra la aplicación práctica de las competencias del programa y es una de las **evidencias centrales** del proyecto.

---

## 7. Análisis financiero y de viabilidad

> Cifras estimadas en pesos colombianos (COP) y ajustables a la realidad del aprendiz. Referencia US$1 ≈ $4.000 COP. Durante la Etapa Práctica el producto opera con planes gratuitos de cada servicio, por lo que el **costo de operación es cercano a $0**.

### 7.1 Inversión inicial

| Concepto | Valor estimado |
|---|---|
| Equipo de cómputo (ya disponible) | $0 (se asume como costo hundido) |
| Herramientas de desarrollo (gratuitas) | $0 |
| Dominio web (requintu.com.co, anual) | $60.000 |
| Registro de marca (opcional, ante la SIC) | $0–$80.000 |
| Diseño de identidad (logo, hecho en el proyecto) | $0 |
| **Total inversión inicial** | **$60.000 – $140.000** |

### 7.2 Costos fijos mensuales

| Concepto | Valor estimado |
|---|---|
| Hosting API (Render, plan básico) | $28.000 |
| Dominio (amortización mensual) | $5.000 |
| Base de datos (plan gratuito) | $0 |
| Vercel + Cloudinary + GitHub (planes gratuitos) | $0 |
| **Total costos fijos mensuales** | **≈ $33.000** |

### 7.3 Costos variables

| Concepto | Valor estimado |
|---|---|
| Comisión de pasarela de pagos (futura) | ≈ 3 % del valor transado |
| Almacenamiento adicional de imágenes (Cloudinary) | Bajo; gratuito al inicio |
| Envío de correos (plan gratuito) | $0 |
| Consumo de API de mapas (nivel gratuito) | $0 |

### 7.4 Proyección de ingresos (12 meses — escenario conservador)

| Mes | Locales Pro ($19.900) | Publicidad ($50.000/banner) | Ingreso mensual |
|---|---|---|---|
| 1–2 | 0 | 0 | $0 |
| 3 | 3 | 0 | $59.700 |
| 4 | 5 | 1 | $149.500 |
| 6 | 15 | 2 | $398.500 |
| 9 | 25 | 3 | $647.500 |
| 12 | 35 | 4 | $896.500 |

### 7.5 Punto de equilibrio

Con costos fijos de **$33.000/mes**, el punto de equilibrio se alcanza con aproximadamente **2 suscriptores Pro** (2 × $19.900 = $39.800) *o* **1 suscriptor Pro + 1 banner** publicitario. Bajo el escenario conservador, esto se lograría entre el **mes 3 y el mes 4** de la fase comercial.

**Viabilidad.** La estructura de costos es baja y escalable (planes gratuitos del proveedor + crecimiento marginal del gasto), lo que hace el proyecto financieramente viable; el riesgo principal es la **adopción por parte de los municipios**, mitigable con la estrategia de lanzamiento gratuito y aliados institucionales.

---

## 8. Acompañamiento y seguimiento

- **Instructor/asesor asignado:** Javier Alejandro López Oviedo — canal: [correo/teléfono].
- **Registro formal:** la Etapa Práctica se formaliza en el **sistema de gestión académica del SENA (SGA/Sofía Plus)**.
- **Plan de trabajo y hitos:** se establecen fechas de revisión (cronograma del apartado 10) con actas o correos de seguimiento.
- **Evidencias de acompañamiento:** correos, actas de reunión, avances en el repositorio GitHub (historial de commits) y bitácoras (ver Anexo A).

---

## 9. Entregables y evidencias

| Entregable | Formato | Estado |
|---|---|---|
| Documento del proyecto productivo | PDF (este documento) | Elaborado |
| Documentación técnica | `Documentacion_Tecnica_Requintu.pdf/docx` | Elaborado |
| Informe de pruebas (calidad/Q.A.) | `Informe_de_Pruebas_Requintu.pdf/docx` (v1.3) | Elaborado |
| Manual de uso | `Manual_de_Uso_Requintu.pdf` | Elaborado |
| Bitácoras de avance | Plantilla Anexo A | Llenar |
| Repositorio con código y pruebas | GitHub | Operativo |
| Producto funcional (web + Android) | Vercel + `Requintu-release.apk/.aab` | Operativo |
| Sustentación ante jurado | Presentación (10–15 min) | Planear |

### 9.1 Guía para la sustentación

1. **Contexto (1 min):** problema que resuelve REQUINTU.
2. **Demostración funcional (4–5 min):** registrar/ingresar, publicar un local, mapa, muro, denuncia, panel admin, cambio de idioma, instalación Android.
3. **Calidad (3–4 min):** mostrar las suites de pruebas (API + e2e) ejecutándose y casos del informe.
4. **Gestión (2–3 min):** mercado, financiero, cronograma y resultados de aprendizaje.
5. **Cierre (1 min):** conclusión y mejoras futuras (pagos en línea, geolocalización en tiempo real, app con más idiomas).

---

## 10. Cronograma propuesto (10 semanas)

| Semana | Actividad | Entregable |
|---|---|---|
| 1 | Definición de requerimientos y casos de uso | Documento de requisitos |
| 2 | Diseño de arquitectura y base de datos | Modelo ER, arquitectura |
| 3 | Módulo de autenticación y roles | CRUD de usuarios funcional |
| 4 | Módulo de locales y mapa | Mapa + publicación de locales |
| 5 | Muro social y tiempo real | Muro funcional |
| 6 | Moderación de contenido y denuncias | Panel admin + moderación NSFW |
| 7 | Pruebas automatizadas API + e2e | Suites de pruebas verdes |
| 8 | Pruebas de seguridad XSS y ajustes | Informe de seguridad |
| 9 | Despliegue web + Android + i18n | Producto en producción |
| 10 | Documentación final y sustentación | Documentos y bitácoras |

---

## 11. Conclusiones

1. REQUINTU demuestra que es posible dar visibilidad digital organizada al turismo local colombiano con tecnología de bajo costo y alto impacto social.
2. La calidad del producto fue garantizada mediante un **proceso real de pruebas** (22 pruebas de API, 12 e2e, >30 casos funcionales y pruebas de seguridad), que constituye la aplicación directa de las competencias del programa de *Procesamiento de Pruebas de Software*.
3. El modelo freemium y la estructura de costos basada en planes gratuitos hacen el proyecto **técnica y financieramente viable**.
4. El producto está **operativo** (web, API y APK Android) y sirve como evidencia tangible de la Etapa Práctica.

---

## Anexo A — Plantilla de bitácora de avance

| Fecha | Actividad realizada | Resultado / hallazgo | Acción siguiente | Tiempo |
|---|---|---|---|---|
| dd/mm/aaaa | (Ej.: ejecución de pruebas e2e) | (Ej.: 12/12 verdes) | (Ej.: documentar en informe) | 4 h |

*Llenar una fila por jornada; adjuntar capturas cuando aplique.*

## Anexo B — Evidencias de competencias (mapa de resultados de aprendizaje)

| Resultado de aprendizaje (del programa) | Evidencia entregada | Ubicación |
|---|---|---|
| (Copiar del programa de formación) | (Ej.: informe de pruebas, suite e2e, documento) | (Carpeta/URL) |