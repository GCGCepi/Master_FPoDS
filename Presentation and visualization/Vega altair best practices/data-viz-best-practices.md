---
name: "data-viz-best-practices"
description: "Guía de buenas prácticas para crear dashboards HTML interactivos con Vega-Altair orientados a datos públicos y público general. Úsala siempre que el usuario pida crear o mejorar un dashboard, visualización de datos, gráfico interactivo, o cuando trabaje con open data y quiera presentarlo visualmente. También aplica cuando el usuario mencione Vega-Altair, quiera elegir el tipo de gráfico correcto, definir una paleta de colores, o estructurar el layout de un dashboard.\n"
---

# Buenas prácticas de visualización de datos

## Contexto de uso
- Dashboards HTML interactivos publicados para **público general**
- Librería principal: **Vega-Altair** (Python → HTML/JSON embebido)
- Datos: open data / datos públicos
- Objetivo: claridad, accesibilidad y honestidad en la representación

---

## 1. Elección del tipo de gráfico

Antes de elegir un gráfico, consulta la skill `draco-vis-guidelines` y valida
sus restricciones hard y preferencias soft. Después identifica qué relación
quieres mostrar:

| Relación | Gráfico recomendado | Evitar |
|---|---|---|
| Comparación entre categorías | Barras horizontales | Pie/donut con >5 segmentos |
| Evolución temporal | Línea | Barras apiladas en el tiempo |
| Proporción de un todo | Donut (≤5 categorías) | 3D pie charts |
| Distribución | Histograma, box plot | Gráfico de barras con bins manuales |
| Correlación entre variables | Scatter plot | Línea si no hay orden temporal |
| Ranking | Barras horizontales ordenadas | Columnas verticales con labels rotados |
| Geográfico | Choropleth / mapa de puntos | Mapas de calor no georreferenciados |

**Reglas de oro:**
- Un gráfico = una pregunta. Si necesitas responder dos preguntas, usa dos gráficos.
- Las barras siempre empiezan en 0. Los ejes de líneas pueden no hacerlo, pero indícalo.
- No uses 3D nunca: distorsiona la percepción de los valores.

---

## 2. Paleta de colores

### Criterios para público general
- Usa paletas **daltónicas-safe** por defecto (evita rojo+verde juntos).
- Máximo **7 colores categóricos** distintos; si hay más categorías, agrupa las menores en "Otros".
- Reserva el color de mayor saturación para el dato más importante.

### Paletas recomendadas en Vega-Altair

```python
# Categórico (hasta 10 categorías) — daltónico-safe
alt.Scale(scheme='tableau10')       # buena opción general
alt.Scale(scheme='set2')            # más suave, mejor para print
alt.Scale(scheme='okabe')           # diseñada específicamente para daltonismo

# Secuencial (valores de menor a mayor)
alt.Scale(scheme='blues')
alt.Scale(scheme='viridis')         # perceptualmente uniforme
alt.Scale(scheme='oranges')

# Divergente (valores positivos y negativos)
alt.Scale(scheme='redblue')
alt.Scale(scheme='blueorange')

# Evitar: rainbow/jet (no perceptualmente uniforme), colores corporativos sin ajuste
```

### Semántica del color
- Usa colores con significado consistente en todo el dashboard (rojo = alerta, verde = positivo).
- No uses el color como **única** forma de transmitir información — añade siempre etiquetas o patrones.

---

## 3. Jerarquía visual y layout

### Estructura recomendada para dashboards de público general

```
┌─────────────────────────────────────────┐
│  Título claro + fuente de datos + fecha │
├────────────┬────────────┬───────────────┤
│   KPI 1    │   KPI 2    │    KPI 3      │  ← métricas clave (máx. 4)
├────────────┴────────────┴───────────────┤
│         Gráfico principal               │  ← responde la pregunta central
├─────────────────┬───────────────────────┤
│  Gráfico 2°     │    Gráfico 3°         │  ← contexto y detalle
├─────────────────┴───────────────────────┤
│  Filtros / controles interactivos       │
└─────────────────────────────────────────┘
```

### Reglas de layout
- **El gráfico principal ocupa al menos el 40% del espacio visual.**
- Los KPIs van arriba: el usuario debe ver el resumen antes que el detalle.
- Los filtros van abajo o en sidebar — no interrumpen la lectura del gráfico.
- Usa espaciado generoso: márgenes ≥ 16px entre elementos.
- En mobile: apila verticalmente, sin scroll horizontal.

### Tipografía
- Título del dashboard: ≥ 20px, weight 600
- Títulos de gráficos: ≥ 14px, weight 500, descriptivos ("Accidentes por distrito" no "Gráfico 1")
- Etiquetas de ejes: ≥ 11px
- Fuente de datos: pequeña (11px), color secundario, siempre visible

---

## 4. Interactividad con Vega-Altair

### Patrones recomendados

```python
# Tooltip informativo — muestra siempre unidad y contexto
chart = alt.Chart(df).mark_bar().encode(
    x='categoria:N',
    y='valor:Q',
    tooltip=[
        alt.Tooltip('categoria:N', title='Categoría'),
        alt.Tooltip('valor:Q', title='Nº accidentes', format=','),
    ]
)

# Selección para filtrar — highlight al hacer clic
selection = alt.selection_point(fields=['categoria'])
chart = chart.add_params(selection).encode(
    opacity=alt.condition(selection, alt.value(1), alt.value(0.3))
)

# Zoom y pan en series temporales
chart = chart.interactive()

# Vinculación entre gráficos (brushing)
brush = alt.selection_interval()
scatter = scatter.add_params(brush)
bar = bar.transform_filter(brush)
```

### Qué hacer y qué evitar

| Hacer | Evitar |
|---|---|
| Tooltips con unidades y contexto | Tooltips con IDs internos o nombres técnicos |
| Highlight al hover | Animaciones que no aportan información |
| Filtros que actualizan todos los gráficos | Filtros que solo afectan a un gráfico |
| Estado inicial significativo | Dashboard vacío hasta que el usuario filtre |
| Botón de reset de filtros | Filtros sin forma de deshacerlos |

---

## 5. Honestidad y claridad en los datos

- **Siempre cita la fuente** y la fecha de actualización de los datos.
- Indica claramente si los datos son parciales (ej. "2025: datos hasta octubre").
- Si hay valores nulos o excluidos, explícalo en una nota visible.
- No truncues ejes para exagerar diferencias sin advertirlo.
- En datos de población (accidentes, salud, etc.), ofrece tasas per cápita además de valores absolutos cuando sea relevante.

---

## 6. Percepción y principios Gestalt aplicados a Vega-Altair

Los principios Gestalt describen cómo el cerebro agrupa y organiza la información visual. En dashboards para público general son especialmente importantes porque el usuario no tiene formación técnica y debe entender el gráfico en segundos.

### Proximidad — *lo que está cerca parece relacionado*
Agrupa los gráficos que responden a la misma pregunta colocándolos juntos. En Vega-Altair, usa `hconcat` o `vconcat` para mantener gráficos relacionados como una unidad visual, y separa grupos con espaciado mayor.

```python
# Gráficos relacionados juntos
grupo_temporal = alt.hconcat(grafico_anual, grafico_mensual).properties(spacing=12)
# Separados del resto con más margen en el layout HTML externo
```

### Similitud — *lo que se parece parece del mismo tipo*
Usa el mismo color, forma o tamaño para datos de la misma categoría en todos los gráficos del dashboard. Si "Eixample" es azul en el gráfico de barras, debe ser azul también en el mapa y en la línea temporal.

```python
# Define la escala de color una sola vez y reutilízala
escala_districtes = alt.Scale(domain=lista_districtes, range=colores_districtes)

barras = alt.Chart(df).mark_bar().encode(
    color=alt.Color('nom_districte:N', scale=escala_districtes)
)
mapa = alt.Chart(geo).mark_geoshape().encode(
    color=alt.Color('nom_districte:N', scale=escala_districtes)
)
```

### Continuidad — *el ojo sigue líneas y trayectorias*
Los gráficos de línea son más efectivos que los de barras para mostrar tendencias temporales porque aprovechan este principio: el ojo sigue la línea y percibe la tendencia sin esfuerzo. Ordena siempre el eje X cronológicamente y evita líneas que se cruzan innecesariamente.

```python
# Ordena explícitamente el eje temporal
alt.Chart(df).mark_line().encode(
    x=alt.X('any:O', sort=list(range(2019, 2026))),
    y='accidents:Q'
)
```

### Figura y fondo — *el dato es figura, el contexto es fondo*
El dato principal debe destacar visualmente sobre la cuadrícula, los ejes y las etiquetas. En Vega-Altair, reduce el peso visual de los elementos de soporte:

```python
alt.Chart(df).mark_bar().configure_axis(
    gridColor='#e8e8e8',      # cuadrícula muy suave
    gridOpacity=0.5,
    domainColor='#cccccc',    # ejes discretos
    tickColor='#cccccc',
    labelColor='#666666',     # etiquetas en gris medio
    titleColor='#333333'
).configure_view(
    strokeWidth=0             # elimina el borde del área del gráfico
)
```

### Pregnancia — *las formas simples se entienden antes*
Elige siempre la representación más simple que comunique el dato. Un gráfico de barras básico bien ejecutado comunica más rápido que un gráfico de radar o una visualización compleja. Añade complejidad solo si el dato la requiere, no como ornamento.

---

## 7. Jerarquía de encodings perceptuales (Wilkinson y Cleveland & McGill)

La investigación en percepción visual (Cleveland & McGill 1984, Wilkinson *The Grammar of Graphics* 1999, y estudios posteriores de Heer & Bostock 2010) establece que no todos los canales visuales son igual de precisos para codificar datos cuantitativos. Usa siempre el canal más alto posible para el dato más importante.

### Ranking de precisión perceptual (de mayor a menor)

| Rank | Canal | Precisión | Uso recomendado en Vega-Altair |
|---|---|---|---|
| 1 | **Posición en eje común** | Muy alta | `x`, `y` — siempre para el dato principal |
| 2 | **Posición en ejes alineados** | Alta | Facetas con `facet` o `row`/`column` |
| 3 | **Longitud** | Alta | `mark_bar()` — barras desde cero |
| 4 | **Ángulo / pendiente** | Media-alta | `mark_line()` para tendencias |
| 5 | **Área** | Media | `mark_point(size=)` solo como canal secundario |
| 6 | **Volumen** | Baja | Evitar en dashboards para público general |
| 7 | **Color (intensidad/luminancia)** | Media-baja | `color` con escala secuencial para magnitud |
| 8 | **Color (tono/hue)** | Baja para cantidad | Solo para categorías, nunca para valores numéricos |
| 9 | **Textura / forma** | Baja | `shape` solo como canal de refuerzo accesible |

### Principios de aplicación en Vega-Altair

**Regla 1 — El dato más importante va en posición (x o y)**
```python
# BIEN: accidentes en eje Y (posición), distrito en eje X
alt.Chart(df).mark_bar().encode(
    x=alt.X('nom_districte:N', sort='-y'),
    y=alt.Y('accidents:Q', title='Nº accidentes')
)

# MAL: accidentes codificados solo en color
alt.Chart(df).mark_point(size=200).encode(
    color=alt.Color('accidents:Q')  # difícil comparar magnitudes
)
```

**Regla 2 — No uses área para comparar cantidades**
Los scatter plots con tamaño de punto (`size`) son difíciles de comparar con precisión. Úsalos solo para mostrar magnitud relativa aproximada, nunca para comparaciones exactas. Si necesitas precisión, usa barras.

```python
# Área como canal secundario (aceptable para magnitud relativa)
alt.Chart(df).mark_point().encode(
    x='longitud:Q',
    y='latitud:Q',
    size=alt.Size('accidents:Q', scale=alt.Scale(range=[20, 400])),
    color='nom_districte:N',  # categoría en color (tono)
    tooltip=['nom_barri:N', 'accidents:Q']
)
```

**Regla 3 — Color (tono) solo para categorías, nunca para cantidades**
```python
# BIEN: tono para categorías nominales
color=alt.Color('nom_districte:N', scale=alt.Scale(scheme='tableau10'))

# BIEN: luminancia para cantidades (escala secuencial)
color=alt.Color('accidents:Q', scale=alt.Scale(scheme='blues'))

# MAL: tono para cantidades — el cerebro no percibe orden en colores
color=alt.Color('accidents:Q', scale=alt.Scale(scheme='tableau10'))
```

**Regla 4 — Facetas mejor que color para comparar grupos**
Cuando hay más de 4-5 categorías, las facetas (pequeños múltiplos) permiten comparar por posición (rank 2) en lugar de por color (rank 7-8), lo que mejora mucho la precisión perceptual.

```python
# Facetas por año — comparación por posición
alt.Chart(df).mark_line().encode(
    x='mes_any:O',
    y='accidents:Q',
    color='nom_districte:N'   # máx. 4-5 districtes
).facet(
    facet='nk_any:O',
    columns=4
)
```

**Regla 5 — Forma como canal de refuerzo accesible**
El canal `shape` tiene baja precisión perceptual pero es útil como refuerzo de categorías ya codificadas en color, mejorando la accesibilidad para usuarios daltónicos.

```python
alt.Chart(df).mark_point().encode(
    x='mes_any:O',
    y='accidents:Q',
    color=alt.Color('gravedad:N', scale=alt.Scale(scheme='set2')),
    shape='gravedad:N'  # refuerza la categoría sin depender del color
)
```

---

## 8. Checklist antes de publicar

- [ ] ¿El título del dashboard responde "¿qué muestro aquí?"?
- [ ] ¿Cada gráfico tiene título descriptivo y etiquetas de ejes con unidades?
- [ ] ¿La paleta de colores es daltónica-safe?
- [ ] ¿Los tooltips muestran información útil con unidades?
- [ ] ¿La fuente de datos y fecha son visibles?
- [ ] ¿Funciona bien en mobile (sin scroll horizontal)?
- [ ] ¿Hay un estado inicial con datos visibles (no vacío)?
- [ ] ¿Los filtros tienen opción de reset?
