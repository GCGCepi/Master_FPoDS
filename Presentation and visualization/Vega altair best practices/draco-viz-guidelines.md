---
name: draco-vis-guidelines
description: >
  Directrices de diseño de visualizaciones basadas en Draco (University of Washington IDL),
  un sistema de restricciones formales derivado de la investigación empírica en percepción
  visual (Cleveland & McGill, APT, CompassQL). Úsala siempre que el usuario pida crear o
  evaluar una visualización de datos, elegir un tipo de gráfico, asignar campos a canales
  visuales, o decidir agregaciones y escalas. También aplica cuando se mencione Vega-Lite,
  Altair, o cualquier tarea de diseño de gráficos.
---

# Directrices de visualización — Draco (UW IDL)

Draco es un sistema de recomendación de visualizaciones basado en Answer Set Programming
(ASP) que codifica conocimiento empírico sobre percepción visual como restricciones
formales. Esta skill sintetiza sus restricciones **hard** (reglas que nunca deben
violarse) y **soft** (preferencias con peso) como directrices aplicables al diseño
de visualizaciones con Vega-Altair.

Fuente: draco-core v0.0.6, UW Interactive Data Lab (Dominik Moritz et al., 2019).

---

## 1. Restricciones hard — reglas que nunca deben violarse

Estas restricciones eliminan visualizaciones inválidas o engañosas. No tienen excepciones.

### Tipos de datos y encodings

| Restricción | Regla |
|---|---|
| `enc_type_valid` | Cuantitativo no puede usarse con campos string o boolean; temporal solo con datetime |
| `bin_q_o` | Solo se puede binar campos cuantitativos u ordinales |
| `log_q` | Solo se puede usar escala logarítmica con campos cuantitativos |
| `zero_q` | Solo se puede incluir el cero con campos cuantitativos |
| `log_discrete` | No se puede usar log con campos discretos (incluido binado) |
| `log_zero` | No se pueden combinar log y zero en el mismo encoding |
| `log_non_positive` | No usar log si el mínimo de los datos es ≤ 0 |
| `bin_and_aggregate` | No se puede binar y agregar el mismo campo |
| `aggregate_nominal` | No se puede agregar campos nominales |
| `count_q_without_field` | Count debe ser cuantitativo y no referenciar ningún campo |
| `shape_discrete_non_ordered` | Shape solo admite campos nominales |
| `detail_non_ordered` | Detail solo admite campos nominales |
| `size_nominal` | No usar size con nominal — size implica orden |
| `size_negative` | No usar size si los datos tienen valores negativos y positivos |

### Marcas y canales

| Restricción | Regla |
|---|---|
| `repeat_channel` | Un canal posicional (x, y, color…) no puede usarse dos veces |
| `no_encodings` | Debe haber al menos un encoding; si no, el gráfico no muestra nada |
| `row_or_column_c` | Row y column requieren campos discretos |
| `row_no_y` | No usar row sin y — es redundante |
| `column_no_x` | No usar column sin x — es redundante |
| `text_mark_without_text_channel` | Marca text requiere canal text |
| `text_channel_without_text_mark` | Canal text requiere marca text |
| `point_tick_bar_without_x_or_y` | Point, tick y bar requieren x o y |
| `line_area_without_x_y` | Line y area requieren x **e** y |
| `line_area_with_discrete` | Line y area no pueden tener x e y discretos |
| `bar_tick_continuous_x_y` | Bar y tick no pueden tener x e y continuos simultáneamente |
| `bar_area_without_zero` | Bar y area deben incluir el cero en el eje continuo |
| `shape_without_point` | Canal shape solo funciona con marca point |
| `size_without_point_text` | Canal size solo funciona con point o text |
| `area_bar_with_log` | No usar escala log con bar o area — es engañoso |
| `rect_without_d_d` | Rect requiere x e y discretos |
| `same_field_x_and_y` | No usar el mismo campo en x e y |
| `color_with_cardinality_gt_twenty` | Color discreto con más de 20 valores es ilegible |
| `shape_with_cardinality_gt_eight` | Shape con más de 8 valores — Vega-Lite solo soporta 8 formas |
| `bar_area_overlap` | Bar y area no pueden solaparse — usar stacking o agregación |

### Stacking

| Restricción | Regla |
|---|---|
| `stack_without_bar_area` | Stacking solo para bar y area |
| `stack_without_summative_agg` | No apilar con agregaciones no sumativas (media, mediana…) — solo count y sum |
| `no_stack_with_bar_area_discrete_color` | Bar/area con color discreto requieren stacking |
| `stack_without_discrete_color_or_detail` | Stack requiere color discreto o detail |

---

## 2. Restricciones soft — preferencias ordenadas por peso

Las restricciones soft penalizan diseños subóptimos. Mayor peso = mayor penalización = evitar más.
Aplica estas preferencias en orden cuando tengas varias opciones válidas.

### Preferencias de encoding (peso alto — evitar fuertemente)

| Peso | Restricción | Regla práctica |
|---|---|---|
| 50 | `count_twice` | No usar count más de una vez en el mismo gráfico |
| 32 | `ordered_text` | No mapear campos ordenados al canal text |
| 30 | `only_discrete` | Si todos los campos son discretos, añade un count u otro cuantitativo |
| 20 | `nominal_detail` | No usar detail si no es estrictamente necesario |
| 20 | `interesting_detail` | No desperdiciar campos interesantes en detail |
| 20 | `horizontal_scrolling` | No más de 50 categorías en x ni más de 5 en column |
| 20 | `d_d_overlap` | Evitar solapamiento en gráficos discreto × discreto |

### Elección de marca según tipo de datos

Draco penaliza estas combinaciones de marca × tipo de datos (usa la de menor penalización):

**Continuo × Continuo (scatter):**

| Penalización | Marca | Usar cuando |
|---|---|---|
| 0 | `point` ✅ | Primera opción para c×c |
| 2 | `text` | Solo si los valores son pocos y necesitan etiqueta |
| 5 | `tick` | Distribuciones densas 1D |
| 20 | `line` | Solo si hay orden temporal explícito |
| 20 | `area` | Evitar en c×c |

**Continuo × Discreto (barras/líneas):**

| Penalización | Marca | Con solapamiento | Sin solapamiento |
|---|---|---|---|
| 0 | `tick` | — | ✅ primera opción sin overlap |
| 0 | `bar` | — | ✅ primera opción sin overlap |
| 10 | `point` | evitar con overlap | — |
| 20 | `bar` | evitar con overlap | — |
| 20 | `line` | evitar con overlap | evitar sin overlap |
| 20 | `area` | evitar con overlap | evitar sin overlap |
| 50 | `text` | ❌ | ❌ muy penalizado |

**Discreto × Discreto (heatmap):**

| Penalización | Marca |
|---|---|
| 0 | `point` ✅ o `rect` ✅ |
| 1 | `text` |

### Canales según tipo de campo (ranking APT)

Para un campo **cuantitativo o continuo**, ordena los canales así (menor penalización = mejor):

```
x (0) → y (0) → color-secuencial (10) → size (1) → text (20)
```

Para un campo **ordinal**, ordena así:

```
x (1) → y (0) → color (8) → size (10) → row (10) → column (10) → text (32)
```

Para un campo **nominal**, ordena así:

```
y (0) → x (3) → color (10) → shape (11) → text (12) → row (7) → column (10)
```

### Preferencias de escala y transformaciones

| Peso | Restricción | Regla práctica en Vega-Altair |
|---|---|---|
| 10 | `includes_zero` | No forzar cero si el rango de datos incluye negativos y positivos |
| 5 | `zero_skew` | Evitar cero si MAX-MIN < distancia al cero (datos muy alejados de 0) |
| 3 | `zero_size` | Size debe incluir cero |
| 1 | `zero_positional` | Preferir cero en ejes posicionales |
| 1 | `log` | Evitar log salvo que la distribución lo justifique |
| 10 | `bin_high` | No usar más de 12 bins |
| 6 | `bin_low` | No usar menos de 7 bins |
| 2 | `bin` | Preferir no binar si no es necesario |

### Cardinalidad y cardinality warnings

| Peso | Restricción | Umbral |
|---|---|---|
| 10 | `high_cardinality_ordinal` | Ordinal con > 30 valores → usar cuantitativo o binar |
| 10 | `high_cardinality_nominal` | Nominal con > 12 valores → agrupar categorías menores |
| 10 | `high_cardinality_nominal_color` | Color nominal con > 10 valores → agrupar o usar otra codificación |
| 5 | `shape_cardinality` | Shape con > 5 valores → difícil de distinguir |
| 10 | `number_nominal` | Campos numéricos no deben ser nominales |
| 5 | `bin_cardinality` | Binado cuantitativo con < 15 valores únicos → innecesario |

### Preferencias de agregación

Cuando debas agregar, ordena así (menor peso = preferida):

```
count (0) → mean (1) → sum (2) → median (3) → min (4) → max (4) → stdev (5)
```

---

## 3. Aplicación práctica en Vega-Altair

### Flujo de decisión para elegir marca y canales

```
1. ¿Qué tipos de datos tengo en x e y?
   - Continuo × Continuo → point (scatter)
   - Continuo × Discreto → bar (sin overlap) o tick
   - Discreto × Discreto → rect o point
   - Solo continuo → tick o histogram (bin + bar)

2. ¿Cuántas categorías tiene el campo discreto?
   - ≤ 10 → color nominal
   - ≤ 12 → color nominal (límite)
   - > 12 → agrupar en "Otros" o usar facetas

3. ¿Necesito un tercer campo?
   - Cuantitativo → size (si pocos puntos) o color secuencial
   - Nominal (≤ 8) → shape + color (doble codificación)
   - Nominal (> 8) → faceta (row/column)

4. ¿Los datos tienen estructura temporal?
   - Sí → x = temporal, marca line o area
   - No → ordenar barras por valor descendente
```

### Checklist Draco antes de publicar una visualización

**Restricciones hard (bloqueantes):**
- [ ] Las barras y áreas incluyen el cero en el eje continuo
- [ ] No se usa log si hay valores ≤ 0
- [ ] Color discreto tiene ≤ 20 categorías
- [ ] Shape tiene ≤ 8 categorías
- [ ] No se usa size con campos nominales
- [ ] Line y area tienen x e y — al menos uno continuo
- [ ] Bar y tick no tienen x e y continuos simultáneamente
- [ ] No se usa el mismo campo en x e y
- [ ] No se apila con agregaciones no sumativas (media, mediana)

**Restricciones soft (preferencias):**
- [ ] El campo cuantitativo más importante está en x o y (posición)
- [ ] No hay más de 12 bins en campos binados
- [ ] Campos numéricos no están tipados como nominales
- [ ] Los campos ordinales con > 30 valores se tratan como cuantitativos
- [ ] Se usa count o una métrica cuantitativa cuando todos los campos son discretos
- [ ] Datos temporales van en el eje x
- [ ] No se usa text como canal para campos cuantitativos
