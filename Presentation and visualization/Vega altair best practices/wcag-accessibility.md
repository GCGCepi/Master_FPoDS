---
name: "wcag-accessibility"
description: "Guía de accesibilidad WCAG 2.2 AA aplicada a dashboards HTML interactivos con Vega-Altair. Úsala siempre que el usuario pida crear o revisar un dashboard, visualización de datos o interfaz web con criterios de accesibilidad. También aplica cuando el usuario mencione WCAG, contraste, ARIA, navegación por teclado, lectores de pantalla, daltonismo, o quiera auditar la accesibilidad de un componente HTML existente. Coordínala con draco-vis-guidelines para elegir marcas, canales y escalas válidos según los tipos de datos.\n"
---

# Accesibilidad WCAG 2.2 AA para dashboards interactivos

## Contexto de uso
- Dashboards HTML interactivos con **Vega-Altair** (genera SVG embebido en HTML)
- Referencia normativa: **WCAG 2.2 nivel AA**
- Los gráficos SVG de Vega-Altair requieren trabajo adicional de accesibilidad
  porque no generan roles ARIA ni alternativas de texto por defecto
- Los patrones y ejemplos de código son genéricos — adapta los nombres de campos
  y variables a tu dataset concreto

## Coordinación con DRACO-VIS
- Consulta `draco-vis-guidelines` antes de elegir marcas, canales, agregaciones o escalas.
- Aplica primero las restricciones hard de Draco y después sus preferencias soft; la accesibilidad no justifica un encoding inválido para el tipo de dato.
- No añadas `shape` como refuerzo de forma indiscriminada: Draco lo reserva para campos nominales y marcas `point`; más de cinco formas son difíciles de distinguir.
- Para series temporales, combina color con `strokeDash`; para patrones de relleno, conserva el color cuando codifique una magnitud y usa la textura para una dimensión categórica distinta.
- WCAG determina contraste, redundancia visual y acceso por teclado/lector de pantalla; Draco determina la validez y adecuación perceptual de la codificación.

---

## 1. Contraste de color (WCAG 1.4.3, 1.4.11)

### Ratios mínimos requeridos en AA

| Elemento | Ratio mínimo | Ratio recomendado |
|---|---|---|
| Texto normal (< 18px) | 4.5:1 | 7:1 |
| Texto grande (≥ 18px o ≥ 14px bold) | 3:1 | 4.5:1 |
| Componentes UI e infografía | 3:1 | 4.5:1 |
| Etiquetas de ejes y leyendas | 4.5:1 | 7:1 |
| Líneas de datos sobre fondo | 3:1 | — |

### Verificación de contraste en Vega-Altair

```python
# Configura colores de texto con contraste suficiente
chart = alt.Chart(df).mark_bar().encode(...).configure_axis(
    labelColor='#595959',    # 7:1 sobre blanco
    titleColor='#333333',    # 12.6:1 sobre blanco
    gridColor='#DDDDDD',     # cuadrícula suave, no interfiere
).configure_legend(
    labelColor='#595959',
    titleColor='#333333',
).configure_title(
    color='#1a1a1a'          # máximo contraste
)
```

### Herramientas de verificación
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Colour Contrast Analyser](https://www.tpgi.com/color-contrast-checker/) (app de escritorio, permite cuentagotas)
- DevTools → Accessibility → Contrast en Chrome/Firefox

### No dependas solo del color (WCAG 1.4.1)
Siempre añade un canal visual adicional al color para transmitir información:

```python
# MAL: solo color diferencia las categorías
alt.Color('categoria:N')

# BIEN: color + forma como refuerzo
alt.Chart(df).mark_point().encode(
    color=alt.Color('categoria:N', scale=alt.Scale(scheme='okabe')),
    shape='categoria:N'   # refuerzo para usuarios daltónicos
)

# BIEN: color + etiqueta directa en el gráfico
# Añade anotaciones de texto sobre las líneas en lugar de solo leyenda
```

---

## 2. Patrones visuales para rellenos y líneas (WCAG 1.4.1)

El color como único diferenciador es una barrera para usuarios con daltonismo (afecta al 8% de hombres y 0.5% de mujeres). Combinar color con patrones de relleno y tipos de línea garantiza que la información sea distinguible sin depender del color.

Para decidir cuándo aplicar patrones, mantener una correspondencia 1:1 y codificar densidad en heatmaps cuantitativos, sigue la [guía ampliada de patrones](./references/pattern-rules.md). Consulta también `draco-vis-guidelines` para validar que cada canal corresponde al tipo de dato.

### Patrones de relleno en SVG (para gráficos de barras y áreas)

Vega-Altair no soporta patrones de relleno nativamente. La solución es definir patrones SVG en el HTML y aplicarlos como `fill` mediante postprocesado.

```html
<!-- Define patrones SVG reutilizables -->
<svg width="0" height="0" style="position:absolute">
  <defs>
    <pattern id="pat-diagonal" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="8" stroke="#4477AA" stroke-width="3"/>
    </pattern>
    <pattern id="pat-dots" patternUnits="userSpaceOnUse" width="8" height="8">
      <circle cx="4" cy="4" r="2" fill="#EE6677"/>
    </pattern>
    <pattern id="pat-horizontal" patternUnits="userSpaceOnUse" width="8" height="8">
      <line x1="0" y1="4" x2="8" y2="4" stroke="#228833" stroke-width="2"/>
    </pattern>
    <pattern id="pat-grid" patternUnits="userSpaceOnUse" width="8" height="8">
      <path d="M 8 0 L 0 0 0 8" fill="none" stroke="#CCBB44" stroke-width="1.5"/>
    </pattern>
    <pattern id="pat-cross" patternUnits="userSpaceOnUse" width="8" height="8">
      <line x1="0" y1="4" x2="8" y2="4" stroke="#AA3377" stroke-width="1.5"/>
      <line x1="4" y1="0" x2="4" y2="8" stroke="#AA3377" stroke-width="1.5"/>
    </pattern>
  </defs>
</svg>

<script>
// Aplica patrones a las marcas del SVG generado por Vega-Altair tras el render
// Adapta el selector '.role-mark' si tu versión de Vega usa clases distintas
function aplicarPatrones(contenedorId) {
  const patrones = ['pat-diagonal','pat-dots','pat-horizontal','pat-grid','pat-cross'];
  const contenedor = document.getElementById(contenedorId);
  const marcas = contenedor.querySelectorAll('.role-mark path, .role-mark rect');
  const categorias = [...new Set([...marcas].map(e => e.getAttribute('aria-label')))];
  marcas.forEach(el => {
    const idx = categorias.indexOf(el.getAttribute('aria-label')) % patrones.length;
    el.style.fill = `url(#${patrones[idx]})`;
  });
}
vegaEmbed('#grafico', spec, { renderer: 'svg' }).then(() => aplicarPatrones('grafico'));
</script>
```

### Paleta con patrones coordinados (paleta de Wong, daltónico-safe)

```python
# Define categorías, colores y patrones según tu dataset
# La paleta de Wong es distinguible con deuteranopia y protanopia
CATEGORIAS = ['cat-1', 'cat-2', 'cat-3', 'cat-4', 'cat-5']  # reemplaza con tus valores
WONG_COLORS = ['#4477AA', '#EE6677', '#228833', '#CCBB44', '#AA3377']
PATRONES    = ['pat-diagonal', 'pat-dots', 'pat-horizontal', 'pat-grid', 'pat-cross']

scale = alt.Scale(domain=CATEGORIAS, range=WONG_COLORS)
```

### Tipos de línea para gráficos lineales

Vega-Altair soporta `strokeDash` nativamente — úsalo siempre junto al color:

```python
# BIEN: triple codificación — color + trazo + forma de punto
alt.Chart(df).mark_line(point=True).encode(
    x='dimension_x:O',
    y='metrica:Q',
    color=alt.Color('categoria:N', scale=alt.Scale(
        domain=CATEGORIAS,
        range=WONG_COLORS
    )),
    strokeDash=alt.StrokeDash('categoria:N', scale=alt.Scale(
        domain=CATEGORIAS,
        range=[[1,0], [6,3], [4,4], [2,2], [8,4,2,4]]
    )),
    shape=alt.Shape('categoria:N', scale=alt.Scale(
        domain=CATEGORIAS,
        range=['circle', 'square', 'diamond', 'triangle-up', 'cross']
    ))
)
```

### Referencia de patrones de línea (`strokeDash`)

| Patrón | Valor `strokeDash` | Uso recomendado |
|---|---|---|
| Sólida | `[1, 0]` | Categoría principal |
| Guiones largos | `[8, 4]` | Categoría secundaria |
| Guiones cortos | `[4, 4]` | Categoría terciaria |
| Puntos | `[2, 2]` | Categoría cuaternaria |
| Punto-guión | `[8, 4, 2, 4]` | Categoría quinaria |

### Formas de punto (`shape`) disponibles en Vega-Altair

`circle`, `square`, `diamond`, `triangle-up`, `triangle-down`, `triangle-right`, `triangle-left`, `cross`

---

## 3. Renderizado SVG y navegación por teclado en puntos de gráfico (WCAG 2.1.1, 4.1.2)

### Por qué SVG y no Canvas

| | SVG | Canvas |
|---|---|---|
| Accesibilidad | Cada elemento es un nodo DOM accesible | Píxeles opacos, sin estructura accesible |
| Lectores de pantalla | Soportado con `role` y `aria-label` | No soportado sin capa adicional |
| Navegación por teclado | Nativa con `tabindex` | Requiere reimplementación completa |
| Zoom del navegador | Escala sin pérdida | Puede pixelarse |
| WCAG 2.2 AA | Alcanzable | Muy difícil sin workarounds |

**Regla: usa siempre SVG.** Nunca cambies el renderer a Canvas.

```python
# BIEN: fuerza SVG explícitamente
alt.renderers.enable('svg')   # en notebooks Jupyter

# En vegaEmbed (HTML):
vegaEmbed('#grafico', spec, { renderer: 'svg' })

# MAL: nunca uses canvas
vegaEmbed('#grafico', spec, { renderer: 'canvas' })  # ❌ inaccesible
```

### Datos en archivo externo, no embebidos en el HTML

Los datos **nunca deben ir inline** en el HTML ni en la especificación Vega. Guárdalos en un JSON separado en la misma carpeta y referencialos por URL relativa.

**Estructura de carpeta requerida:**
```
dashboard/
├── index.html
├── data.json          ← datos aquí, nunca en el HTML
└── (otros assets)
```

**Exporta solo las columnas necesarias:**
```python
import pandas as pd, json

df = pd.read_csv('tu-archivo.csv')

# Selecciona solo los campos que el dashboard necesita
columnas_necesarias = ['campo_1', 'campo_2', 'metrica_1', 'metrica_2']  # adapta
datos = df[columnas_necesarias].to_dict(orient='records')

with open('dashboard/data.json', 'w', encoding='utf-8') as f:
    json.dump(datos, f, ensure_ascii=False)
```

**Referencia los datos por URL relativa en Vega-Altair:**
```python
# BIEN: fuente externa
source = alt.UrlData(url='data.json', format=alt.DataFormat(type='json'))
chart = alt.Chart(source).mark_bar().encode(...)

# MAL: datos inline — genera HTML enorme e inmantenible
chart = alt.Chart(df).mark_bar().encode(...)  # ❌ embebe todos los datos
```

> **Nota:** para servir el dashboard localmente necesitas un servidor HTTP (`python -m http.server 8000`). Los navegadores bloquean peticiones `fetch` desde `file://`.

### Hacer navegables por teclado todos los puntos del gráfico

```javascript
// Patrón genérico — adapta 'campoEtiqueta' y 'campoValor' a tu dataset
function hacerGraficoAccesible(contenedorId, nombreGrafico, camposEtiqueta) {
  vegaEmbed(`#${contenedorId}`, spec, { renderer: 'svg' }).then(resultado => {
    const svg = document.querySelector(`#${contenedorId} svg`);

    // 1. Marca el SVG como imagen con nombre
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', nombreGrafico);

    // 2. Selecciona todos los elementos de datos
    const elementos = svg.querySelectorAll(
      '.role-mark path, .role-mark rect, .role-mark circle, .role-mark line'
    );

    elementos.forEach((el, idx) => {
      // 3. Hazlos focusables (roving tabindex)
      el.setAttribute('tabindex', idx === 0 ? '0' : '-1');
      el.setAttribute('role', 'graphics-symbol');

      // 4. Etiqueta desde los datos — adapta los campos a tu dataset
      const datum = resultado.view.data('source_0')[idx];
      if (datum) {
        const etiqueta = camposEtiqueta
          .filter(c => datum[c] !== undefined)
          .map(c => `${c}: ${datum[c]}`)
          .join(', ');
        el.setAttribute('aria-label', etiqueta);
      }

      // 5. Navegación con flechas
      el.addEventListener('keydown', e => {
        const dir = (e.key==='ArrowRight'||e.key==='ArrowDown') ? 1
                  : (e.key==='ArrowLeft' ||e.key==='ArrowUp')   ? -1 : 0;
        if (dir !== 0) {
          e.preventDefault();
          const siguiente = elementos[idx + dir];
          if (siguiente) {
            el.setAttribute('tabindex', '-1');
            siguiente.setAttribute('tabindex', '0');
            siguiente.focus();
          }
        }
        if (e.key==='Enter' || e.key===' ') {
          e.preventDefault();
          mostrarTooltipAccesible(el, resultado.view.data('source_0')[idx], camposEtiqueta);
        }
      });

      // 6. Foco visible en SVG — obligatorio y siempre presente
      // Los elementos SVG no heredan el outline CSS por defecto;
      // hay que aplicarlo manualmente y nunca eliminarlo
      el.addEventListener('focus', () => {
        el.style.outline = '3px solid #0066CC';
        el.style.outlineOffset = '2px';
        el.style.outlineStyle = 'solid'; // nunca 'none' ni 'auto'

        // Scroll automático al elemento si está fuera del viewport
        el.scrollIntoView({ block: 'nearest', inline: 'nearest' });

        // Anuncia la posición al lector de pantalla
        const anunciador = document.querySelector(`#${contenedorId} [aria-live]`);
        if (anunciador) {
          anunciador.textContent = `Punto ${idx + 1} de ${elementos.length}: ${el.getAttribute('aria-label')}`;
        }
      });
      el.addEventListener('blur', () => {
        // Elimina el foco visual pero mantiene el outlineOffset para cuando vuelva
        el.style.outline = '';
      });
    });

    // 7. Región live para lectores de pantalla
    const anunciador = document.createElement('div');
    anunciador.setAttribute('aria-live', 'polite');
    anunciador.setAttribute('aria-atomic', 'true');
    anunciador.className = 'sr-only';
    document.getElementById(contenedorId).appendChild(anunciador);
  });
}

function mostrarTooltipAccesible(el, datum, campos) {
  let tooltip = document.getElementById('tooltip-accesible');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'tooltip-accesible';
    tooltip.setAttribute('role', 'tooltip');
    tooltip.style.cssText = `position:absolute;background:#1a1a1a;color:#fff;
      padding:8px 12px;border-radius:4px;font-size:14px;
      max-width:220px;z-index:1000;pointer-events:none;`;
    document.body.appendChild(tooltip);
  }
  tooltip.textContent = campos
    .filter(c => datum[c] !== undefined)
    .map(c => `${c}: ${datum[c]}`)
    .join(' · ');
  const rect = el.getBoundingClientRect();
  tooltip.style.left = `${rect.left + window.scrollX}px`;
  tooltip.style.top  = `${rect.top  + window.scrollY - 44}px`;
  tooltip.hidden = false;
  el.setAttribute('aria-describedby', 'tooltip-accesible');
  setTimeout(() => { tooltip.hidden = true; }, 3000);
}

// Uso — adapta el array de campos a tu dataset:
hacerGraficoAccesible('grafico-1', 'Título descriptivo del gráfico', ['campo_x', 'campo_y', 'categoria']);
```

### Indicador de foco adaptado a la forma del elemento (obligatorio)

El `outline` CSS no funciona correctamente en SVG — no sigue la forma del elemento
ni respeta su geometría. El indicador de foco debe construirse con primitivas SVG
y renderizarse en un grupo dedicado **al final del SVG**, siempre por encima de
todas las marcas (z-order correcto).

#### Por qué insertar el indicador dentro del SVG de Vega no funciona

Insertar un grupo de foco dentro del SVG de Vega-Altair parece la solución
obvia, pero falla en tres casos reales confirmados por inspección del DOM:

- **Faceted charts**: cada celda tiene orden `axis → mark-rect → role-title`.
  El título de faceta se renderiza **después** de las marcas y tapa cualquier
  grupo insertado dentro de la celda.
- **Bar/Layered**: `path.foreground` tiene `display:none` en el SVG estático
  y Vega lo activa en runtime, haciendo que el punto de inserción sea
  inconsistente según el momento de ejecución.
- **Layered charts**: la leyenda tiene su propio `background` y se renderiza
  tras el último grupo de marcas, tapando el indicador.

**La solución correcta es un SVG superpuesto con `position:absolute`**,
completamente fuera del DOM de Vega, coordinado mediante `getBoundingClientRect`.
Así el z-order es siempre correcto independientemente de la estructura interna.

#### Patrón: SVG de foco superpuesto (overlay)

```javascript
// ── Crea el SVG overlay de foco ──────────────────────────────────────────────
function crearOverlayFoco(contenedorId) {
  const contenedor = document.getElementById(contenedorId);
  contenedor.style.position = 'relative'; // ancla el overlay

  const prev = contenedor.querySelector('.foco-overlay');
  if (prev) prev.remove();

  const NS = 'http://www.w3.org/2000/svg';
  const svgOverlay = document.createElementNS(NS, 'svg');
  svgOverlay.classList.add('foco-overlay');
  svgOverlay.setAttribute('aria-hidden', 'true');    // invisible para lectores
  svgOverlay.setAttribute('pointer-events', 'none'); // no intercepta clicks
  svgOverlay.style.cssText = `
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 100%;
    overflow: visible;
    z-index: 10;
  `;

  contenedor.appendChild(svgOverlay);
  return svgOverlay;
}

function limpiarOverlay(overlay) {
  while (overlay.firstChild) overlay.removeChild(overlay.firstChild);
}

// ── Dibuja el indicador adaptado a la forma ───────────────────────────────────
function dibujarFocoOverlay(el, overlay, tipoMarca) {
  limpiarOverlay(overlay);

  const NS = 'http://www.w3.org/2000/svg';
  const COLOR_FOCO   = '#0066CC';
  const COLOR_BLANCO = '#FFFFFF';

  // Convierte coordenadas de viewport al sistema del contenedor
  const baseRect = overlay.parentElement.getBoundingClientRect();
  const elRect   = el.getBoundingClientRect();

  const top    = elRect.top    - baseRect.top;
  const left   = elRect.left   - baseRect.left;
  const width  = elRect.width;
  const height = elRect.height;
  const cx     = left + width  / 2;
  const cy     = top  + height / 2;

  if (tipoMarca === 'barra') {
    // Rectángulo doble (blanco exterior + azul interior)
    [
      { stroke: COLOR_BLANCO, sw: 5 },
      { stroke: COLOR_FOCO,   sw: 3 },
    ].forEach(({ stroke, sw }) => {
      const rect = document.createElementNS(NS, 'rect');
      rect.setAttribute('x',      left   - sw / 2);
      rect.setAttribute('y',      top    - sw / 2);
      rect.setAttribute('width',  width  + sw);
      rect.setAttribute('height', height + sw);
      rect.setAttribute('fill',         'none');
      rect.setAttribute('stroke',        stroke);
      rect.setAttribute('stroke-width',  sw);
      rect.setAttribute('rx', '1');
      overlay.appendChild(rect);
    });

  } else if (tipoMarca === 'punto') {
    // Círculo concéntrico — radio desde el bounding box del elemento
    const r = Math.max(width, height) / 2;
    [
      { stroke: COLOR_BLANCO, r: r + 5, sw: 3   },
      { stroke: COLOR_FOCO,   r: r + 3, sw: 2.5 },
    ].forEach(({ stroke, r: cr, sw }) => {
      const circle = document.createElementNS(NS, 'circle');
      circle.setAttribute('cx',          cx);
      circle.setAttribute('cy',          cy);
      circle.setAttribute('r',           cr);
      circle.setAttribute('fill',        'none');
      circle.setAttribute('stroke',       stroke);
      circle.setAttribute('stroke-width', sw);
      overlay.appendChild(circle);
    });

  } else if (tipoMarca === 'linea') {
    // Rombo posicional centrado en el bounding box del segmento activo
    const size = 9;
    [
      { stroke: COLOR_BLANCO, sw: 3, fill: 'none',       opacity: '1'    },
      { stroke: COLOR_FOCO,   sw: 2, fill: COLOR_FOCO,   opacity: '0.15' },
    ].forEach(({ stroke, sw, fill, opacity }) => {
      const path = document.createElementNS(NS, 'path');
      path.setAttribute('d',
        `M${cx},${cy-size} L${cx+size},${cy} L${cx},${cy+size} L${cx-size},${cy} Z`
      );
      path.setAttribute('fill',         fill);
      path.setAttribute('fill-opacity', opacity);
      path.setAttribute('stroke',        stroke);
      path.setAttribute('stroke-width',  sw);
      overlay.appendChild(path);
    });
  }
}

// ── Detección del tipo de marca ───────────────────────────────────────────────
function detectarTipoMarca(el) {
  const grupo = el.closest('g[class]');
  if (!grupo) return 'barra';
  const cls = grupo.getAttribute('class');
  if (cls.includes('mark-symbol')) return 'punto';
  if (cls.includes('mark-line'))   return 'linea';
  return 'barra';
}
```

#### Integración con `hacerGraficoAccesible` y `hacerGraficoMultiserieAccesible`

Sustituye el bloque `focus`/`blur` anterior por esto en ambas funciones:

```javascript
const overlay = crearOverlayFoco(contenedorId);

elementos.forEach((el, idx) => {
  // ... resto del setup (tabindex, aria-label, keydown) ...

  el.addEventListener('focus', () => {
    el.style.outline = 'none'; // desactiva outline CSS en SVG

    dibujarFocoOverlay(el, overlay, detectarTipoMarca(el));
    el.scrollIntoView({ block: 'nearest', inline: 'nearest' });

    const anunciador = document.querySelector(`#${contenedorId} [aria-live]`);
    if (anunciador) {
      anunciador.textContent =
        `Punto ${idx + 1} de ${elementos.length}: ${el.getAttribute('aria-label')}`;
    }
  });

  el.addEventListener('blur', () => limpiarOverlay(overlay));
});

// Limpia el overlay si el contenedor se redimensiona
new ResizeObserver(() => limpiarOverlay(overlay))
  .observe(document.getElementById(contenedorId));
```

#### Por qué este enfoque resuelve los tres problemas

| Problema | Causa | Solución con overlay |
|---|---|---|
| Faceted: título tapa el foco | `role-title` después de `mark-rect` en DOM interno | El overlay está fuera del SVG de Vega — nada puede taparlo |
| Bar/Layered: `path.foreground` inconsistente | Vega activa `display:none` en runtime | No dependemos del DOM interno |
| Layered: leyenda tapa el foco | `role-legend` con `background` propio al final | El overlay tiene `z-index:10` sobre todo el contenedor |

#### Resumen visual por tipo de marca

| Marca | Indicador | Geometría |
|---|---|---|
| Barra (`mark-rect`) | Rectángulo doble blanco + azul | `getBoundingClientRect()` |
| Punto (`mark-symbol`) | Círculo concéntrico | `getBoundingClientRect()` centro |
| Línea (`mark-line`) | Rombo posicional centrado | `getBoundingClientRect()` centro |


### Navegación visible en gráficos (obligatoria)

Cuando un gráfico permita recorrer o seleccionar varias categorías, muestra siempre junto al gráfico la categoría seleccionada y su valor exacto.
Al cambiarla desde los botones, el teclado o el gráfico, actualiza el mismo estado,
destaca visualmente la marca seleccionada sin depender solo del color y anuncia
el cambio con `aria-live="polite"`.

Desactiva «Anterior» y «Siguiente» en los extremos. La ayuda de
accesibilidad debe explicar estas opciones.

Antes de dar por terminado el dashboard, verifica en navegador que:
- los controles se ven y cambian la categoría y el valor;
- las flechas del teclado actualizan esa misma selección;
- el foco y la selección se distinguen visualmente;
- los controles caben en móvil.

### Navegación por teclado en gráficos multiserie

Cuando un gráfico tiene varias series, combina la navegación horizontal (puntos) con
la navegación vertical (series) usando `Alt + ↑/↓` para cambiar de serie. Esta
combinación no colisiona con lectores de pantalla (NVDA, JAWS usan `Shift+flechas`)
ni con atajos del sistema operativo (`Ctrl+flechas`).

Al cambiar de serie, el foco salta al punto del mismo índice en la nueva serie —
el usuario no pierde la referencia posicional. Si la nueva serie tiene menos puntos,
salta al último disponible.

```javascript
function hacerGraficoMultiserieAccesible(contenedorId, nombreGrafico, campoSerie, camposEtiqueta) {
  vegaEmbed(`#${contenedorId}`, spec, { renderer: 'svg' }).then(resultado => {
    const svg = document.querySelector(`#${contenedorId} svg`);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', nombreGrafico);

    // Agrupa los elementos por serie
    const datos = resultado.view.data('source_0');
    const series = [...new Set(datos.map(d => d[campoSerie]))];
    const marcasPorSerie = {};

    series.forEach(serie => {
      marcasPorSerie[serie] = [...svg.querySelectorAll('.role-mark path, .role-mark circle, .role-mark rect')]
        .filter((_, i) => datos[i]?.[campoSerie] === serie);
    });

    let serieActualIdx = 0;
    let puntoActualIdx = 0;

    function enfocarPunto(serieIdx, puntoIdx) {
      // Desenfoca todo
      series.forEach(s => marcasPorSerie[s].forEach(el => {
        el.setAttribute('tabindex', '-1');
        el.style.outline = '';
        el.style.opacity = '0.4'; // atenúa series inactivas
      }));

      // Enfoca la serie activa
      const serieActual = series[serieIdx];
      const puntos = marcasPorSerie[serieActual];
      puntoIdx = Math.min(puntoIdx, puntos.length - 1);

      marcasPorSerie[serieActual].forEach(el => {
        el.style.opacity = '1'; // destaca la serie activa
      });

      const el = puntos[puntoIdx];
      if (!el) return;

      el.setAttribute('tabindex', '0');
      el.focus();
      el.style.outline = '3px solid #0066CC';
      el.style.outlineOffset = '2px';
      el.scrollIntoView({ block: 'nearest', inline: 'nearest' });

      // Anuncia serie + punto al lector de pantalla
      const datum = datos.filter(d => d[campoSerie] === serieActual)[puntoIdx];
      const etiqueta = datum
        ? camposEtiqueta.filter(c => datum[c] !== undefined).map(c => `${c}: ${datum[c]}`).join(', ')
        : '';
      const anunciador = document.querySelector(`#${contenedorId} [aria-live]`);
      if (anunciador) {
        anunciador.textContent =
          `Serie: ${serieActual}. Punto ${puntoIdx + 1} de ${puntos.length}. ${etiqueta}`;
      }

      serieActualIdx = serieIdx;
      puntoActualIdx = puntoIdx;
    }

    // Tabindex inicial
    const primerPunto = marcasPorSerie[series[0]]?.[0];
    if (primerPunto) {
      primerPunto.setAttribute('tabindex', '0');
      primerPunto.setAttribute('role', 'graphics-symbol');
    }

    // Eventos de teclado en el contenedor SVG
    svg.addEventListener('keydown', e => {
      const puntos = marcasPorSerie[series[serieActualIdx]];

      switch (true) {
        case e.key === 'ArrowRight': {
          e.preventDefault();
          enfocarPunto(serieActualIdx, Math.min(puntoActualIdx + 1, puntos.length - 1));
          break;
        }
        case e.key === 'ArrowLeft': {
          e.preventDefault();
          enfocarPunto(serieActualIdx, Math.max(puntoActualIdx - 1, 0));
          break;
        }
        case e.altKey && e.key === 'ArrowDown': {
          // Serie siguiente
          e.preventDefault();
          enfocarPunto(Math.min(serieActualIdx + 1, series.length - 1), puntoActualIdx);
          break;
        }
        case e.altKey && e.key === 'ArrowUp': {
          // Serie anterior
          e.preventDefault();
          enfocarPunto(Math.max(serieActualIdx - 1, 0), puntoActualIdx);
          break;
        }
        case e.key === 'Enter' || e.key === ' ': {
          e.preventDefault();
          const datum = datos.filter(d => d[campoSerie] === series[serieActualIdx])[puntoActualIdx];
          if (datum) mostrarTooltipAccesible(puntos[puntoActualIdx], datum, camposEtiqueta);
          break;
        }
      }
    });

    // Región live
    const anunciador = document.createElement('div');
    anunciador.setAttribute('aria-live', 'polite');
    anunciador.setAttribute('aria-atomic', 'true');
    anunciador.className = 'sr-only';
    document.getElementById(contenedorId).appendChild(anunciador);
  });
}

// Uso — adapta los campos a tu dataset:
hacerGraficoMultiserieAccesible(
  'grafico-series',
  'Título descriptivo del gráfico multiserie',
  'campo_serie',              // campo que distingue las series (ej. 'categoria', 'año')
  ['campo_x', 'campo_y', 'campo_serie']  // campos para la etiqueta del tooltip
);
```

### Comportamiento esperado para el usuario de teclado

| Acción | Resultado |
|---|---|
| `Tab` | Entra al primer punto de la primera serie |
| `→` | Avanza al punto siguiente dentro de la serie actual |
| `←` | Retrocede al punto anterior dentro de la serie actual |
| `Alt + ↓` | Cambia a la serie siguiente (mismo índice de punto) |
| `Alt + ↑` | Cambia a la serie anterior (mismo índice de punto) |
| `Enter` / `Espacio` | Muestra el tooltip con los datos del punto |
| `Tab` (de nuevo) | Sale del gráfico al siguiente elemento |

> La serie activa se destaca con opacidad completa; el resto se atenúa a 0.4.
> Al cambiar de serie, si la nueva tiene menos puntos, el foco va al último disponible.

### Tabla de datos colapsable como alternativa

```html
<details>
  <summary>Ver datos en tabla</summary>
  <table>
    <caption>Datos del gráfico: [título descriptivo]</caption>
    <thead>
      <tr>
        <th scope="col">Dimensión</th>
        <th scope="col">Valor</th>
      </tr>
    </thead>
    <tbody>
      <!-- Genera las filas dinámicamente desde tu dataset -->
    </tbody>
  </table>
</details>
```

---

## 4. Página de ayuda de accesibilidad (obligatoria en todo dashboard)

Cada dashboard debe incluir una página HTML adicional `accesibilidad.html` en la misma carpeta, enlazada desde el dashboard principal, con instrucciones mínimas de navegación por teclado. Esta página debe ser la primera referencia que encuentre un usuario de teclado o lector de pantalla.

### Enlace desde el dashboard principal

Coloca el enlace justo después del skip link, visible en todo momento:

```html
<!-- En index.html, tras el skip link -->
<a href="#contenido-principal" class="skip-link">Saltar al contenido principal</a>
<a href="accesibilidad.html" class="help-link">
  <svg aria-hidden="true" width="16" height="16"><!-- icono teclado --></svg>
  Ayuda de accesibilidad y navegación por teclado
</a>
```

### Plantilla `accesibilidad.html`

Copia y adapta esta plantilla para cada dashboard. Sustituye `[Nombre del dashboard]` y añade atajos específicos si los hay.

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Ayuda de accesibilidad — [Nombre del dashboard]</title>
  <style>
    body {
      font-family: system-ui, sans-serif;
      max-width: 720px;
      margin: 2rem auto;
      padding: 0 1.5rem;
      line-height: 1.7;
      color: #1a1a1a;
    }
    h1 { font-size: 1.6rem; margin-bottom: 0.5rem; }
    h2 { font-size: 1.2rem; margin-top: 2rem; border-bottom: 1px solid #ddd; padding-bottom: 0.3rem; }
    table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
    th, td { text-align: left; padding: 0.6rem 0.75rem; border: 1px solid #ddd; font-size: 0.95rem; }
    th { background: #f5f5f5; font-weight: 600; }
    kbd {
      display: inline-block;
      padding: 2px 8px;
      font-family: monospace;
      font-size: 0.9rem;
      background: #f0f0f0;
      border: 1px solid #aaa;
      border-radius: 4px;
      box-shadow: 0 1px 0 #aaa;
    }
    .volver { display: inline-block; margin-top: 2rem; }
    *:focus-visible {
      outline: 3px solid #0066CC;
      outline-offset: 2px;
    }
  </style>
</head>
<body>

  <a href="index.html">← Volver al dashboard</a>

  <h1>Ayuda de accesibilidad</h1>
  <p>Esta página explica cómo navegar <strong>[Nombre del dashboard]</strong>
     usando solo el teclado o un lector de pantalla.</p>

  <h2>Navegación general</h2>
  <table>
    <thead>
      <tr><th>Tecla</th><th>Acción</th></tr>
    </thead>
    <tbody>
      <tr><td><kbd>Tab</kbd></td><td>Avanza al siguiente elemento interactivo (filtro, botón, gráfico)</td></tr>
      <tr><td><kbd>Shift</kbd> + <kbd>Tab</kbd></td><td>Retrocede al elemento anterior</td></tr>
      <tr><td><kbd>Enter</kbd> / <kbd>Espacio</kbd></td><td>Activa el elemento seleccionado (botón, opción de menú)</td></tr>
      <tr><td><kbd>Esc</kbd></td><td>Cierra menús desplegables o tooltips abiertos</td></tr>
    </tbody>
  </table>

  <h2>Navegación dentro de los gráficos</h2>
  <p>Al llegar a un gráfico con <kbd>Tab</kbd>, puedes explorar cada punto de datos:</p>
  <table>
    <thead>
      <tr><th>Tecla</th><th>Acción</th></tr>
    </thead>
    <tbody>
      <tr><td><kbd>→</kbd></td><td>Avanza al siguiente punto dentro de la serie actual</td></tr>
      <tr><td><kbd>←</kbd></td><td>Retrocede al punto anterior dentro de la serie actual</td></tr>
      <tr><td><kbd>Alt</kbd> + <kbd>↓</kbd></td><td>Cambia a la serie siguiente (mantiene la posición del punto)</td></tr>
      <tr><td><kbd>Alt</kbd> + <kbd>↑</kbd></td><td>Cambia a la serie anterior (mantiene la posición del punto)</td></tr>
      <tr><td><kbd>Enter</kbd> / <kbd>Espacio</kbd></td><td>Muestra los datos detallados del punto seleccionado</td></tr>
      <tr><td><kbd>Tab</kbd></td><td>Sale del gráfico y pasa al siguiente elemento</td></tr>
    </tbody>
  </table>
  <p>El lector de pantalla anunciará la serie activa y el valor de cada punto al navegar.
     La serie activa se destaca visualmente; el resto se atenúa.
     La categoría seleccionada y su valor exacto se muestran siempre junto al gráfico.
     Los botones «Anterior» y «Siguiente» se desactivan al llegar al primer o último elemento.</p>

  <h2>Filtros y controles</h2>
  <table>
    <thead>
      <tr><th>Tecla</th><th>Acción</th></tr>
    </thead>
    <tbody>
      <tr><td><kbd>Tab</kbd></td><td>Mueve el foco al siguiente filtro o botón</td></tr>
      <tr><td><kbd>↑</kbd> / <kbd>↓</kbd></td><td>Cambia el valor de un selector desplegable</td></tr>
      <tr><td><kbd>Enter</kbd></td><td>Confirma la selección y actualiza el dashboard</td></tr>
    </tbody>
  </table>
  <p>Al cambiar un filtro, el lector de pantalla anunciará cuántos resultados se muestran.</p>

  <h2>Atajos específicos de este dashboard</h2>
  <table>
    <thead>
      <tr><th>Tecla</th><th>Acción</th></tr>
    </thead>
    <tbody>
      <!-- Añade aquí los atajos específicos de tu dashboard -->
      <!-- Ejemplo: -->
      <!-- <tr><td><kbd>R</kbd></td><td>Restablece todos los filtros</td></tr> -->
      <tr><td colspan="2"><em>Este dashboard no tiene atajos adicionales.</em></td></tr>
    </tbody>
  </table>

  <h2>Compatibilidad con lectores de pantalla</h2>
  <p>Este dashboard ha sido diseñado para funcionar con:</p>
  <ul>
    <li>NVDA + Firefox (Windows)</li>
    <li>JAWS + Chrome (Windows)</li>
    <li>VoiceOver + Safari (macOS, iOS)</li>
    <li>TalkBack + Chrome (Android)</li>
  </ul>

  <h2>¿Problemas de accesibilidad?</h2>
  <p>Si encuentras alguna barrera de accesibilidad, puedes reportarla en:
     <a href="mailto:[contacto@tudominio.com]">[contacto@tudominio.com]</a>.</p>

  <a href="index.html" class="volver">← Volver al dashboard</a>

</body>
</html>
```

### Estructura de carpeta actualizada

```
dashboard/
├── index.html
├── accesibilidad.html   ← nueva, obligatoria
├── data.json
└── (otros assets)
```

### Atajos de teclado opcionales (mejora progresiva)

Si el dashboard tiene muchos controles, añade atajos globales y docúmentalos en `accesibilidad.html`:

```javascript
// Atajos globales de teclado — solo activos cuando el foco no está en un input
document.addEventListener('keydown', e => {
  if (['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName)) return;

  switch(e.key) {
    case 'r': case 'R':
      resetFiltros();
      document.getElementById('estado-dashboard').textContent = 'Filtros restablecidos.';
      break;
    case 'h': case 'H':
      window.location.href = 'accesibilidad.html';
      break;
    case '?':
      window.location.href = 'accesibilidad.html';
      break;
  }
});
```

---

## 5. Alternativas de texto para gráficos (WCAG 1.1.1)

Los SVG generados por Vega-Altair no tienen texto alternativo por defecto.

```html
<figure role="img" aria-labelledby="titulo-g1" aria-describedby="desc-g1">
  <div id="grafico-1"></div>
  <figcaption>
    <span id="titulo-g1" class="sr-only">
      [Título del gráfico: qué muestra y en qué periodo]
    </span>
    <span id="desc-g1" class="sr-only">
      [Tipo de gráfico]. [Valor destacado o tendencia principal].
      [Rango de valores y unidades si no son obvias].
    </span>
  </figcaption>
</figure>

<style>
  .sr-only {
    position:absolute; width:1px; height:1px; padding:0;
    margin:-1px; overflow:hidden; clip:rect(0,0,0,0);
    white-space:nowrap; border:0;
  }
</style>
```

**Plantilla para la descripción alternativa:**
1. Tipo de gráfico ("gráfico de barras horizontales")
2. Qué compara o muestra ("compara X por categoría Y")
3. Valor más destacado o tendencia principal
4. Unidades y escala si no son obvias

---

## 6. Navegación por teclado en controles (WCAG 2.1.1, 2.4.3, 2.4.7)

```html
<!-- BIEN: elementos HTML nativos — accesibles por teclado sin código extra -->
<label for="filtro-categoria">Filtrar por categoría</label>
<select id="filtro-categoria">
  <option value="all">Todas</option>
</select>

<button type="button" onclick="resetFiltros()">Restablecer filtros</button>

<!-- MAL: div con click — no es accesible por teclado -->
<div onclick="filtrar()" style="cursor:pointer">Filtrar</div>
```

```css
/* ── Foco siempre visible — reglas globales obligatorias ── */

/* 1. Nunca elimines el outline sin reemplazarlo */
/* MAL: *:focus { outline: none; } */

/* 2. Foco visible para navegación por teclado (WCAG 2.4.7, 2.4.11) */
*:focus-visible {
  outline: 3px solid #0066CC;
  outline-offset: 2px;
  border-radius: 2px;
}

/* 3. Elimina el foco al hacer clic con ratón (no molesta a usuarios de ratón)
      pero lo mantiene para teclado — usa :focus-visible, no :focus */
*:focus:not(:focus-visible) {
  outline: none;
}

/* 4. Elementos sobre fondo oscuro — foco con doble anillo para contraste */
.fondo-oscuro *:focus-visible {
  outline: 3px solid #FFFFFF;
  box-shadow: 0 0 0 5px #0066CC; /* anillo exterior azul */
}

/* 5. Tamaño mínimo del indicador de foco (WCAG 2.4.11 — nuevo en 2.2)
      El área del foco debe tener perímetro ≥ al del componente
      y contraste ≥ 3:1 entre enfocado y no enfocado */
button:focus-visible,
select:focus-visible,
input:focus-visible,
a:focus-visible {
  outline: 3px solid #0066CC; /* contraste 4.5:1 sobre blanco */
  outline-offset: 3px;        /* separa del borde del componente */
}

/* 6. El foco no queda oculto por headers o footers fijos (WCAG 2.4.11) */
:root {
  scroll-padding-top: 80px;    /* ajusta al alto de tu header fijo */
  scroll-padding-bottom: 60px; /* ajusta al alto de tu footer fijo */
}
```

**Por qué `focus-visible` y no `focus`:**
- `:focus` se activa con ratón y teclado — eliminar el outline con `:focus` rompe la accesibilidad por teclado
- `:focus-visible` solo se activa cuando el navegador determina que el foco debe ser visible (teclado, no ratón)
- Soportado en todos los navegadores modernos; para IE/Edge legacy usa el polyfill `focus-visible`

---

## 7. Formularios y controles (WCAG 1.3.1, 3.3.2, 2.5.3, 2.5.8)

```html
<!-- Etiqueta asociada programáticamente -->
<label for="selector-dimension">Dimensión</label>
<select id="selector-dimension">...</select>

<!-- Región live para anunciar actualizaciones del dashboard -->
<div aria-live="polite" aria-atomic="true" class="sr-only" id="estado-dashboard"></div>
<script>
function aplicarFiltro(valor, nResultados) {
  // ... lógica de filtro ...
  document.getElementById('estado-dashboard').textContent =
    `Dashboard actualizado: ${nResultados} registros para "${valor}".`;
}
</script>
```

```css
/* Objetivos táctiles mínimos: 24×24px (AA), recomendado 44×44px (WCAG 2.5.8) */
button, select, input[type="checkbox"], input[type="radio"] {
  min-height: 44px;
  min-width: 44px;
  padding: 8px 12px;
}
```

---

## 8. Estructura y navegación (WCAG 1.3.1, 2.4.1, 2.4.6)

```html
<!-- Skip link — primera cosa en el <body> -->
<a href="#contenido-principal" class="skip-link">Saltar al contenido principal</a>
<style>
  .skip-link { position:absolute; top:-100%; left:0; background:#000;
    color:#fff; padding:8px 16px; z-index:9999; }
  .skip-link:focus { top:0; }
</style>

<!-- Jerarquía de encabezados — adapta los títulos a tu dashboard -->
<main id="contenido-principal">
  <h1>[Título del dashboard]</h1>
  <h2>Resumen</h2>       <!-- KPIs -->
  <h2>[Sección 1]</h2>
    <h3>[Subsección 1.1]</h3>
  <h2>[Sección 2]</h2>
</main>

<!-- Tablas accesibles — siempre con caption y scope -->
<table>
  <caption>[Descripción de la tabla]</caption>
  <thead>
    <tr><th scope="col">Dimensión</th><th scope="col">Valor</th></tr>
  </thead>
  <tbody>
    <tr><th scope="row">[fila]</th><td>[valor]</td></tr>
  </tbody>
</table>
```

---

## 9. Accesibilidad cognitiva — COGA y WCAG 2.2 (W3C Cognitive Accessibility)

Las directivas COGA (*Cognitive Accessibility Guidance*, W3C 2021) amplían WCAG con recomendaciones específicas para usuarios con dificultades cognitivas, de aprendizaje, memoria o atención. En dashboards de datos para público general son especialmente relevantes porque el usuario no tiene formación técnica y puede sentirse abrumado por la cantidad de información.

### Criterios WCAG 2.2 con base cognitiva

| Criterio | Nivel | Qué exige |
|---|---|---|
| 1.3.5 Identify Input Purpose | AA | Los campos de formulario declaran su propósito con `autocomplete` |
| 2.4.6 Headings and Labels | AA | Encabezados y etiquetas son descriptivos |
| 2.4.11 Focus Not Obscured | AA | El elemento enfocado no queda tapado por elementos fijos |
| 2.5.3 Label in Name | AA | El nombre accesible contiene el texto visible del control |
| 2.5.8 Target Size | AA | Área táctil mínima 24×24px |
| 3.2.1 On Focus | A | El foco no provoca cambios de contexto inesperados |
| 3.2.2 On Input | A | Cambiar un control no provoca cambios automáticos inesperados |
| 3.3.1 Error Identification | A | Los errores se identifican y describen en texto |
| 3.3.2 Labels or Instructions | A | Los controles tienen instrucciones claras |

### 1. Lenguaje claro y simple (COGA 4.1)

El lenguaje complejo es una barrera para usuarios con dislexia, discapacidad intelectual o baja alfabetización.

```html
<!-- BIEN: lenguaje directo, sin jerga -->
<h1>Accidentes de tráfico — Barcelona 2019–2025</h1>
<p>Explora cuántos accidentes ocurrieron, dónde y cuándo.</p>

<!-- MAL: lenguaje técnico o ambiguo -->
<h1>Análisis spacio-temporal de siniestralidad vial</h1>
```

**Reglas para dashboards:**
- Títulos de gráficos en forma de pregunta o afirmación simple: "¿Cuándo ocurren más accidentes?" en lugar de "Distribución temporal de eventos"
- Etiquetas de ejes con unidades explícitas: "Número de accidentes" no "N"
- Evita abreviaturas sin expansión; si las usas, explícalas la primera vez
- Números grandes formateados: `10.027` no `10027`; `1,4M` con tooltip que muestra el valor exacto

```python
# Formatea los números en tooltips para facilitar la lectura
alt.Tooltip('metrica:Q', title='Número de casos', format=',.0f')  # 10,027
alt.Tooltip('porcentaje:Q', title='Porcentaje', format='.1%')      # 17,1%
```

### 2. Ayudas a la memoria y navegación predecible (COGA 3.3, 4.2)

Los usuarios con problemas de memoria a corto plazo o atención necesitan que la interfaz sea predecible y no les obligue a recordar información entre pasos.

**Navegación predecible:**
```html
<!-- El estado actual de los filtros siempre visible -->
<div aria-live="polite" role="status" id="filtros-activos">
  <p>Mostrando: <strong>Todos los años</strong> · <strong>Todos los distritos</strong></p>
</div>

<!-- Botón de reset siempre visible, no solo cuando hay filtros activos -->
<button type="button" id="btn-reset" onclick="resetFiltros()">
  Restablecer filtros
</button>
```

**No dependas de la memoria del usuario:**
```html
<!-- BIEN: muestra el valor seleccionado junto al control -->
<label for="sel-año">Año</label>
<select id="sel-año" aria-describedby="sel-año-actual">
  <option value="all">Todos</option>
  <option value="2024">2024</option>
</select>
<span id="sel-año-actual" class="filtro-activo">Seleccionado: Todos</span>

<!-- BIEN: tooltip persistente en gráficos (no solo en hover) -->
<!-- Activa el último punto seleccionado con Enter y mantenlo visible -->
```

**Cambios de contexto predecibles (WCAG 3.2.1, 3.2.2):**
```javascript
// MAL: el gráfico se actualiza automáticamente al cambiar el select
// (desorientador para usuarios con problemas cognitivos)
select.addEventListener('change', () => actualizarGrafico());

// BIEN: requiere confirmación explícita, o al menos anuncia el cambio
select.addEventListener('change', () => {
  document.getElementById('estado-dashboard').textContent =
    `Filtro cambiado a "${select.value}". El gráfico se actualizará.`;
  setTimeout(() => actualizarGrafico(), 300); // pequeña pausa para no sorprender
});
```

### 3. Gestión de errores y formularios (COGA 4.3, WCAG 3.3.1, 3.3.2)

```html
<!-- Instrucciones antes del control, no solo en placeholder -->
<div id="instruccion-rango">
  Selecciona un año entre 2019 y 2025, o elige "Todos" para ver el periodo completo.
</div>
<label for="sel-año">Año</label>
<select id="sel-año" aria-describedby="instruccion-rango">
  <option value="all">Todos (2019–2025)</option>
  <option value="2024">2024</option>
</select>

<!-- Error descriptivo: qué pasó y qué hacer -->
<div role="alert" aria-live="assertive" id="error-filtro" hidden>
  <p>No hay datos para la combinación seleccionada.</p>
  <p>Prueba a ampliar el rango de años o seleccionar otro distrito.</p>
  <button type="button" onclick="resetFiltros()">Restablecer filtros</button>
</div>

<script>
function mostrarErrorSinDatos() {
  document.getElementById('error-filtro').hidden = false;
  document.getElementById('error-filtro').focus(); // lleva el foco al mensaje
}
</script>
```

### 4. Reducción de la carga cognitiva (COGA 4.4)

El exceso de información simultánea agota la memoria de trabajo, especialmente en usuarios con TDAH, ansiedad o fatiga cognitiva.

**En el diseño del dashboard:**
- Muestra un máximo de **4 KPIs** en el área de resumen
- No uses más de **2-3 gráficos visibles simultáneamente** sin scroll
- Ofrece una vista simplificada y una vista detallada (patrón progresivo):

```html
<!-- Vista simplificada por defecto, detalle opcional -->
<button type="button"
        aria-expanded="false"
        aria-controls="detalle-datos"
        onclick="toggleDetalle(this)">
  Ver análisis detallado
</button>

<div id="detalle-datos" hidden>
  <!-- gráficos secundarios y tablas de datos -->
</div>

<script>
function toggleDetalle(btn) {
  const detalle = document.getElementById('detalle-datos');
  const expandido = btn.getAttribute('aria-expanded') === 'true';
  btn.setAttribute('aria-expanded', String(!expandido));
  detalle.hidden = expandido;
  btn.textContent = expandido ? 'Ver análisis detallado' : 'Ocultar análisis detallado';
}
</script>
```

**Animaciones y movimiento (WCAG 2.3.3, COGA):**
```css
/* Respeta la preferencia del usuario de reducir movimiento */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 5. Ayudas al reconocimiento (COGA 4.5)

Los iconos y controles deben ser reconocibles sin necesidad de aprendizaje previo.

```html
<!-- BIEN: icono + etiqueta de texto siempre visible -->
<button type="button">
  <svg aria-hidden="true"><!-- icono filtro --></svg>
  Filtrar
</button>

<!-- MAL: solo icono sin texto -->
<button type="button" aria-label="Filtrar">
  <svg><!-- icono filtro --></svg>
</button>
```

```python
# En Vega-Altair: leyenda siempre visible, no solo en hover
alt.Chart(df).mark_line().encode(
    color=alt.Color('categoria:N',
        legend=alt.Legend(
            title='Categoría',
            orient='right',        # posición fija, no flotante
            labelLimit=200,        # no trunca las etiquetas
        )
    )
)
```

---

## 10. Checklist WCAG 2.2 AA + COGA para dashboards

### Percepción
- [ ] Contraste de texto ≥ 4.5:1 (normal) y ≥ 3:1 (grande y UI)
- [ ] El color no es el único canal para transmitir información (+ patrón o forma)
- [ ] Cada gráfico tiene alternativa de texto descriptiva (`figcaption` + `.sr-only`)
- [ ] Renderer forzado a SVG — nunca Canvas
- [ ] Animaciones respetan `prefers-reduced-motion`

### Operabilidad
- [ ] Todos los puntos del gráfico son navegables con flechas de teclado
- [ ] Todos los controles son navegables con Tab en orden lógico
- [ ] El foco es visible en todo momento — `focus-visible` definido, nunca `outline: none` sin reemplazo
- [ ] En gráficos multiserie, `Alt+↑/↓` cambia de serie manteniendo el índice de punto
- [ ] Al cambiar de serie se anuncia "Serie: [nombre], punto N de M: [valor]" con `aria-live`
- [ ] La serie activa se destaca visualmente (opacidad) respecto a las demás
- [ ] La categoría seleccionada y su valor exacto son siempre visibles junto al gráfico
- [ ] Botones Anterior/Siguiente desactivados en los extremos
- [ ] Foco y selección se distinguen visualmente (no solo por color)
- [ ] Los controles de navegación caben en móvil
- [ ] El indicador de foco SVG se dibuja en un grupo `#foco-accesible` al final del DOM (z-order correcto)
- [ ] Nunca se usa `outline` CSS en elementos SVG — se usa stroke/círculo/rombo según el tipo de marca
- [ ] Barras: stroke doble (blanco + azul) sobre el path clonado
- [ ] Puntos: círculo concéntrico calculado desde `transform="translate(cx,cy)"`
- [ ] Líneas: rombo posicional calculado desde `getBBox()`
- [ ] El grupo de foco se limpia en el evento `blur`
- [ ] El foco anuncia posición al lector de pantalla (`aria-live`) y hace scroll automático al elemento
- [ ] El foco sobre fondo oscuro usa doble anillo para mantener contraste ≥ 3:1 (WCAG 2.4.11)
- [ ] El elemento enfocado no queda tapado por elementos fijos (WCAG 2.4.11)
- [ ] Área táctil mínima 24×24px en todos los controles (recomendado 44×44px)
- [ ] Skip link al inicio de la página
- [ ] Los cambios de contexto no se producen al enfocar un control (WCAG 3.2.1)

### Comprensibilidad
- [ ] Cada control tiene etiqueta asociada (label, aria-label o aria-labelledby)
- [ ] Los cambios de estado se anuncian con `aria-live`
- [ ] El idioma de la página está declarado (`<html lang="...">`)
- [ ] Los datos están en archivo externo `data.json`, no embebidos en el HTML
- [ ] Títulos de gráficos en lenguaje claro, sin jerga técnica (COGA 4.1)
- [ ] Números formateados con separadores de miles y unidades explícitas (COGA 4.1)
- [ ] El estado activo de los filtros es siempre visible (COGA 3.3)
- [ ] Hay botón de reset de filtros siempre visible (COGA 3.3)
- [ ] Los errores describen qué pasó y cómo resolverlo (WCAG 3.3.1, COGA 4.3)
- [ ] Máximo 4 KPIs y 2-3 gráficos visibles simultáneamente (COGA 4.4)
- [ ] Los iconos llevan siempre etiqueta de texto visible (COGA 4.5)
- [ ] La leyenda de los gráficos es fija y no se trunca (COGA 4.5)

### Robustez
- [ ] El HTML es válido (sin atributos duplicados, etiquetas mal cerradas)
- [ ] Los roles ARIA se usan correctamente
- [ ] Los gráficos SVG tienen `role="img"` y `aria-label`
- [ ] Funciona con zoom del navegador al 200% sin pérdida de contenido

### Página de ayuda de accesibilidad
- [ ] Existe `accesibilidad.html` en la misma carpeta que `index.html`
- [ ] El enlace a `accesibilidad.html` es visible desde el dashboard principal
- [ ] La página documenta la navegación general, dentro de gráficos y filtros
- [ ] La página lista los atajos específicos del dashboard (o indica que no hay)
- [ ] La página incluye un contacto para reportar problemas de accesibilidad
