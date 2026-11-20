---
name: jupyter-accessible-notebook
description: >
  Impone que todo el código de análisis y visualización de datos se desarrolle
  en Jupyter Notebooks (.ipynb), con explicaciones intermedias de las decisiones
  clave, y aplicando las directivas de accesibilidad de la skill wcag-accessibility
  en todas las visualizaciones generadas. Úsala siempre que el usuario pida crear
  código de análisis de datos, visualizaciones, dashboards, pipelines de datos,
  o cualquier tarea que implique procesar o representar datos. También aplica cuando
  el usuario mencione Python, pandas, Vega-Altair, gráficos, o exploración de datos.
---

# Jupyter Notebooks accesibles — guía de desarrollo

## Regla fundamental

**Todo el código se escribe en Jupyter Notebook (.ipynb).** No se generan scripts
Python sueltos (`.py`) ni código inline en el chat como entregable final. El notebook
es el único artefacto de código. Si el usuario pide "un script" o "código Python",
entrégalo como notebook igualmente y explica por qué.

**Todo el procesamiento de datos usa pandas.** No se usan alternativas como polars,
dask, vaex o spark salvo petición explícita del usuario. Cualquier operación sobre
datos tabulares — carga, limpieza, filtrado, agrupación, joins, exportación — se
resuelve con pandas. Si una operación requiere numpy, se importa como apoyo pero
pandas es siempre la capa principal.

```python
# BIEN: pandas como capa principal
import pandas as pd
import numpy as np   # solo como apoyo cuando pandas no llega

df = pd.read_csv(...)
resultado = df.groupby('dimension').agg(...)

# MAL: alternativas no autorizadas salvo petición explícita
import polars as pl   # ❌
import dask.dataframe  # ❌
```

**Toda visualización aplica las skills `draco-vis-guidelines` y
`wcag-accessibility`.** Antes de generar cualquier gráfico, lee ambas skills:
usa DRACO-VIS para validar tipos de datos, marcas, canales, agregaciones y escalas;
usa WCAG para contraste, patrones, SVG, navegación por teclado y ayuda accesible.

---

## Estructura obligatoria del notebook

Todo notebook sigue esta estructura de celdas, en este orden:

```
1. [Markdown] Título y descripción del notebook
2. [Markdown] Índice de secciones
3. [Code]     Imports y configuración global
4. [Markdown] ## 1. Carga de datos
5. [Code]     Carga
6. [Markdown] Explicación de decisiones de carga
7. [Markdown] ## 2. Exploración inicial
8. [Code]     Exploración
9. [Markdown] Hallazgos clave
10.[Markdown] ## 3. Limpieza y preparación
11.[Code]     Limpieza
12.[Markdown] Decisiones de limpieza tomadas
13.[Markdown] ## 4. Análisis
14.[Code]     Análisis
15.[Markdown] Interpretación de resultados
16.[Markdown] ## 5. Visualización accesible
17.[Code]     Gráficos con wcag-accessibility
18.[Markdown] ## 6. Exportación
19.[Code]     Exportación de datos y gráficos
20.[Markdown] ## Conclusiones
```

---

## 1. Celda de título (obligatoria, primera celda)

```markdown
# [Título descriptivo del análisis]

**Fuente de datos:** [nombre y URL si es pública]
**Fecha de actualización:** [fecha]
**Autor:** [nombre o equipo]
**Descripción:** Una o dos frases explicando qué analiza este notebook y qué
pregunta responde.

---
```

## 2. Celda de índice (obligatoria, segunda celda)

```markdown
## Contenido

1. [Carga de datos](#carga)
2. [Exploración inicial](#exploracion)
3. [Limpieza y preparación](#limpieza)
4. [Análisis](#analisis)
5. [Visualización accesible](#visualizacion)
6. [Exportación](#exportacion)
7. [Conclusiones](#conclusiones)
```

## 3. Celda de imports (obligatoria, tercera celda)

```python
# ── Imports ──────────────────────────────────────────────────────────────────
import pandas as pd
import altair as alt
import json
from pathlib import Path

# Configuración global de Altair
alt.data_transformers.disable_max_rows()  # permite datasets grandes
alt.renderers.enable('default')           # SVG en Jupyter Notebook

# Rutas
DATA_DIR   = Path('data')
OUTPUT_DIR = Path('dashboard')
OUTPUT_DIR.mkdir(exist_ok=True)
(OUTPUT_DIR).mkdir(exist_ok=True)
```

---

## 4. Normas de celdas Markdown (explicaciones intermedias)

Las celdas Markdown explican **decisiones clave**, no cada línea de código.
Nivel intermedio: el lector conoce pandas y Python, pero no el contexto del análisis.

### Qué explicar (sí)
- Por qué se elige un tipo de limpieza sobre otro ("Eliminamos duplicados en lugar
  de imputar porque representan menos del 0.5% y su origen es desconocido")
- Qué revela un resultado antes de visualizarlo ("La distribución es muy asimétrica,
  con el 80% de valores por debajo de X — esto justifica usar escala logarítmica")
- Por qué se elige un tipo de gráfico ("Usamos barras horizontales porque hay más
  de 5 categorías y los nombres son largos")
- Limitaciones o advertencias de los datos

### Qué no explicar (no)
- Sintaxis obvia de pandas o Python
- Cada parámetro de una función estándar
- Lo que ya es evidente en el output de la celda

### Formato de las celdas Markdown

```markdown
### Decisión: [nombre de la decisión]

**Contexto:** Una frase que sitúa el problema.

**Decisión tomada:** Qué se ha hecho y por qué.

**Alternativas consideradas:** Qué otras opciones existían y por qué se descartaron
(solo si es relevante).

> ⚠️ **Limitación:** Si hay algo que el lector debe tener en cuenta al interpretar
> los resultados, indícalo aquí.
```

---

## 5. Normas de celdas de código

### Estructura interna de cada celda

```python
# ── Título de la celda ────────────────────────────────────────────────────────

# Comentario de bloque: qué hace este bloque y por qué
resultado = df.groupby('dimension').agg(
    metrica=('campo', 'sum'),
    n=('campo', 'count')
).reset_index()

# Muestra siempre el resultado para que el notebook sea autoexplicativo
resultado.head(10)
```

### Reglas
- **Una responsabilidad por celda** — no mezcles carga, limpieza y análisis
- **Muestra siempre el output** — cada celda de código termina con una expresión
  que produce output visible (`.head()`, `.shape`, `print()`, el gráfico)
- **Variables con nombres descriptivos** — `df_limpio` no `df2`; `accidentes_por_año` no `result`
- **Sin código muerto** — elimina prints de debug antes de entregar el notebook
- **Celdas ejecutables en orden** — el notebook debe poder ejecutarse de principio
  a fin con Kernel → Restart & Run All sin errores

---

## 6. Pipeline completo — patrones de código

### 6.1 Carga de datos

```python
# ── Carga ─────────────────────────────────────────────────────────────────────

# Carga con tipos explícitos cuando sea posible para evitar inferencias incorrectas
df = pd.read_csv(
    DATA_DIR / 'tu-archivo.csv',
    dtype={
        'campo_categorico': 'str',
        'campo_numerico':   'int32',
    },
    parse_dates=['campo_fecha'],   # si hay fechas
    encoding='utf-8'
)

print(f"Filas: {df.shape[0]:,} | Columnas: {df.shape[1]}")
df.head()
```

### 6.2 Exploración inicial

```python
# ── Exploración ───────────────────────────────────────────────────────────────

# Visión general de tipos y nulos
print("=== Tipos y nulos ===")
print(df.dtypes)
print(f"\nValores nulos:\n{df.isnull().sum()[df.isnull().sum() > 0]}")

# Estadísticas descriptivas de columnas numéricas
df.describe().round(2)
```

```python
# Distribución de columnas categóricas clave
for col in df.select_dtypes('object').columns[:5]:   # ajusta el límite
    print(f"\n{col} ({df[col].nunique()} valores únicos):")
    print(df[col].value_counts().head(10))
```

### 6.3 Limpieza y preparación

```python
# ── Limpieza ──────────────────────────────────────────────────────────────────

df_limpio = df.copy()  # nunca modifica el df original

# Elimina duplicados
n_duplicados = df_limpio.duplicated().sum()
df_limpio = df_limpio.drop_duplicates()
print(f"Duplicados eliminados: {n_duplicados}")

# Normaliza texto en columnas categóricas
cols_texto = ['campo_cat_1', 'campo_cat_2']   # adapta
for col in cols_texto:
    df_limpio[col] = df_limpio[col].str.strip().str.title()

# Verifica el resultado
print(f"\nShape final: {df_limpio.shape}")
df_limpio.head()
```

### 6.4 Análisis

```python
# ── Análisis ──────────────────────────────────────────────────────────────────

# Agrupación principal — adapta campos y métricas
resumen = df_limpio.groupby(['dimension_1', 'dimension_2']).agg(
    total    = ('metrica', 'sum'),
    promedio = ('metrica', 'mean'),
    n        = ('metrica', 'count')
).reset_index().sort_values('total', ascending=False)

resumen.head(10)
```

### 6.5 Visualización accesible (aplica wcag-accessibility)

```python
# ── Visualización ─────────────────────────────────────────────────────────────
# WCAG 2.2 AA + COGA: paleta daltónico-safe, SVG, patrones, tooltips con unidades

# Define escala de color reutilizable (paleta de Wong)
CATEGORIAS  = resumen['dimension_1'].unique().tolist()
WONG_COLORS = ['#4477AA','#EE6677','#228833','#CCBB44','#AA3377',
               '#66CCEE','#BBBBBB'][:len(CATEGORIAS)]

escala_color = alt.Scale(domain=CATEGORIAS, range=WONG_COLORS)

# Gráfico principal
grafico = alt.Chart(resumen).mark_bar().encode(
    x=alt.X('dimension_1:N', sort='-y', title='[Etiqueta eje X con unidades]'),
    y=alt.Y('total:Q',        title='[Etiqueta eje Y con unidades]'),
    color=alt.Color('dimension_1:N',
        scale=escala_color,
        legend=alt.Legend(title='[Categoría]', orient='right', labelLimit=200)
    ),
    tooltip=[
        alt.Tooltip('dimension_1:N', title='[Campo]'),
        alt.Tooltip('total:Q',       title='[Métrica]', format=',.0f'),
        alt.Tooltip('promedio:Q',    title='[Promedio]', format='.1f'),
    ]
).properties(
    title=alt.TitleParams(
        text='[Título descriptivo — qué muestra el gráfico]',
        fontSize=16,
        anchor='start'
    ),
    width=600,
    height=350
).configure_axis(
    labelColor='#595959',   # contraste 7:1 sobre blanco
    titleColor='#333333',
    gridColor='#DDDDDD',
    gridOpacity=0.5,
).configure_view(strokeWidth=0)

grafico
```

### 6.6 Exportación

```python
# ── Exportación ───────────────────────────────────────────────────────────────

# Exporta datos procesados a JSON para el dashboard HTML
columnas_dashboard = ['dimension_1', 'dimension_2', 'total', 'promedio']  # adapta
datos_export = df_limpio[columnas_dashboard].to_dict(orient='records')

with open(OUTPUT_DIR / 'data.json', 'w', encoding='utf-8') as f:
    json.dump(datos_export, f, ensure_ascii=False)

print(f"Datos exportados: {len(datos_export):,} registros → {OUTPUT_DIR / 'data.json'}")

# Exporta el spec Vega del gráfico para el dashboard HTML
with open(OUTPUT_DIR / 'grafico_principal.json', 'w') as f:
    json.dump(grafico.to_dict(), f)

print(f"Spec Vega exportado → {OUTPUT_DIR / 'grafico_principal.json'}")
```

---

## 7. Celda de conclusiones (obligatoria, última celda)

```markdown
## Conclusiones

### Hallazgos principales
1. [Hallazgo 1 — en una frase]
2. [Hallazgo 2]
3. [Hallazgo 3]

### Limitaciones del análisis
- [Limitación 1]
- [Limitación 2]

### Próximos pasos sugeridos
- [Acción o análisis adicional recomendado]
```

---

## 8. Checklist antes de entregar el notebook

- [ ] Todo el procesamiento de datos usa pandas (no polars, dask ni equivalentes)
- [ ] El notebook se ejecuta sin errores con Kernel → Restart & Run All
- [ ] Todas las celdas tienen output visible
- [ ] La primera celda tiene título, fuente, fecha y descripción
- [ ] Hay una celda Markdown de índice
- [ ] Cada sección tiene al menos una celda Markdown explicando decisiones clave
- [ ] Las variables tienen nombres descriptivos
- [ ] No hay código de debug ni celdas vacías
- [ ] Los gráficos usan paleta daltónico-safe y renderer SVG (wcag-accessibility)
- [ ] Los tooltips incluyen unidades y están formateados
- [ ] Los datos se exportan a `data.json` separado del HTML
- [ ] La última celda contiene las conclusiones
