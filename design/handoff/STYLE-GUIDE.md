# Be Water Diving — App interna · Guía de estilo

Referencia de diseño para Claude Code. Usa estos tokens y estilos para construir
la landing, el login y todas las vistas internas del panel de gestión.
La app es **interna** (uso del equipo), no de cara al público.

> Ejemplo visual vivo: `Landing App Interna.dc.html` (landing + login + kit + tablas).

---

## Marca

- **Logo oficial:** `assets/logo-be-water.png` (incluido). Badge circular negro con
  raya-manta roja y texto blanco; esquinas transparentes. Sobre fondos oscuros
  colócalo siempre sobre **chip blanco** (radio 16px) para que resalte; sobre
  fondos claros va directo.
- **Favicon:** `assets/favicon.png` (marca de olas en degradado del mar, ya generado).

---

## Color (tokens)

```css
:root {
  /* Océano / marca */
  --abyss:  #04222f;  /* fondo más profundo, headers oscuros */
  --deep:   #0a3a4f;  /* fondo oscuro secundario */
  --sea:    #0f7488;  /* PRIMARIO (bordes activos, texto de acento, botón sólido) */
  --aqua:   #25c2d6;  /* ACENTO (foco, degradado de botón, highlights) */
  --aqua-2: #2fd0e3;  /* acento claro para degradados */
  --foam:   #8fe3ec;  /* detalles claros sobre oscuro */

  /* Neutros (fríos, del mar) */
  --mist:   #f4fafb;  /* fondo de página */
  --surface:#ffffff;  /* tarjetas / superficies */
  --line:   #d4e6ea;  /* bordes de inputs */
  --line-2: #eef4f6;  /* separadores suaves */
  --ink:    #0b2a35;  /* texto principal */
  --slate:  #5b7a84;  /* texto secundario */
  --muted:  #8aa2ab;  /* texto terciario / placeholder */

  /* Estados */
  --success:#1f9d6b;  --success-bg:#e3f6ee;
  --warning:#c9820a;  --warning-bg:#fff3e0;
  --danger: #d64237;  --danger-bg:#fdeceb;
  --info:   #0f7488;  --info-bg:#e8f5f7;
  --course: #5566d6;  --course-bg:#eef1ff;
}
```

**Degradado de marca** (botón primario, avatares, acentos):
`linear-gradient(135deg, #2fd0e3, #0f7488)`

**Fondo oceánico** (hero / panel de login):
```css
background:
  radial-gradient(120% 90% at 78% 8%, rgba(37,194,214,.22), transparent 55%),
  linear-gradient(180deg,#04222f 0%,#0a3a4f 100%);
```

---

## Tipografía

- **Familia:** `Manrope` (Google Fonts, pesos 400/500/600/700/800).
- Títulos: 800, `letter-spacing:-0.02em`.
- Etiquetas / overline: 700, `text-transform:uppercase`, `letter-spacing:.12em`, color `--sea`.
- Cuerpo: 400/500, color `--ink` / `--slate`.
- Datos monoespaciados (hex, códigos): `ui-monospace, monospace`.

Escala sugerida: H1 52 · H2 34 · H3 30 · título tarjeta 16–18 · cuerpo 15 · label 13 · caption 12.5.

---

## Radios · sombras · espaciado

```css
--r-sm: 9px;   /* chips pequeños, botón pequeño */
--r-md: 12px;  /* inputs, botones */
--r-lg: 16px;  /* chips de logo, tiles */
--r-xl: 20px;  /* tarjetas */
--r-2xl:24px;  /* tarjeta de login */
--pill: 999px; /* badges */

--shadow-card:  0 24px 60px -40px rgba(4,34,47,.35);
--shadow-btn:   0 14px 34px -12px rgba(37,194,214,.8);
--focus-ring:   0 0 0 4px rgba(37,194,214,.15);
```

---

## Componentes

### Botones (alto 44px; pequeño 36px)
```css
.btn-primary   { background:linear-gradient(135deg,#2fd0e3,#0f7488); color:#04222f;
                 font-weight:800; border:none; box-shadow:var(--shadow-btn); }
.btn-secondary { background:#fff; color:#0f7488; border:1.5px solid #0f7488; font-weight:700; }
.btn-subtle    { background:#e8f5f7; color:#0f7488; border:none; font-weight:700; }
.btn-ghost     { background:transparent; color:#5b7a84; border:none; font-weight:700; }
.btn-success   { background:#1f9d6b; color:#fff; font-weight:700; }
.btn-danger    { background:#e0574f; color:#fff; font-weight:700; }
.btn:disabled  { background:#eef4f6; color:#a9bec6; cursor:not-allowed; }
/* hover primario: translateY(-2px) */
```

### Inputs (alto 46–50px, radio 12px)
- Reposo: `border:1.5px solid var(--line)`.
- Foco: `border:2px solid var(--aqua); box-shadow:var(--focus-ring)`.
- Label: 13px, 700, `--ink`. Icono guía en `--sea`.

### Toggle / Checkbox
- Check activo: cuadro `--sea`, palomita blanca, radio 6px.
- Toggle activo: pista `--aqua`, perilla blanca 18px.

### Badges de estado (pill, 700, 12.5px)
| Estado | texto | fondo |
|---|---|---|
| Confirmado | `--success` | `--success-bg` |
| Pendiente | `--warning` | `--warning-bg` |
| Cancelado | `--danger` | `--danger-bg` |
| En el barco | `--info` | `--info-bg` |
| Curso SSI | `--course` | `--course-bg` |

### Tabla
- Contenedor: `--surface`, `border:1px solid #e0eef1`, radio 20px, `overflow:hidden`, `--shadow-card`.
- Toolbar superior: título + contador (pill info) a la izquierda; búsqueda + botón primario a la derecha.
- Encabezado: fondo `#f7fbfc`, texto 12px 800 uppercase `--muted`, borde inferior `--line-2`.
- Filas: `display:grid` con las mismas columnas; borde inferior `#f2f7f8`; fila alterna `#fbfeff`.
- Celda cliente: avatar 36px (degradado de marca, iniciales blancas) + nombre 700 + subtítulo `--muted`.
- Footer: “Mostrando X de N” + paginación (página activa fondo `--sea`, blanco).
- Usa `display:grid` + `gap` para las columnas (no floats ni tablas HTML), así se mantiene alineado.

### Avatares
Cuadro redondeado 36–46px, degradado de marca, iniciales en blanco 800.
Variantes de color por tipo: marca (aqua→sea), curso (`#5566d6→#31409e`), éxito, peligro.

---

## Layout

- **Landing:** fondo oceánico, logo en chip blanco arriba, copy de bienvenida + tarjeta de
  acceso con botón **“Iniciar sesión”**. Deja claro “acceso interno / no público”.
- **Login:** split 50/50 → izquierda panel oceánico con logo + beneficios; derecha
  formulario blanco (correo, contraseña con foco aqua, “mantener sesión”, botón primario).
- **Vistas internas:** fondo `--mist`, tarjetas blancas, tablas como arriba.

---

## Reglas rápidas
1. Un solo acento fuerte: **aqua** para acciones/foco. El **mar** (teal) para sólidos y texto de acento.
2. Máximo 1–2 fondos oscuros por pantalla; el resto claro (`--mist` / blanco).
3. Nada de emojis en la UI (salvo el ⋯ de menú, sustituible por icono).
4. Logo siempre legible: sobre oscuro → chip blanco.
5. Espaciado generoso, esquinas suaves, sombras muy difusas y de bajo alfa.
