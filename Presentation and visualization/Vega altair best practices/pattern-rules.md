# Reglas de patrones y heatmaps

Estas reglas amplían la sección de patrones de `SKILL.md`. Aplícalas junto con `draco-vis-guidelines`: DRACO determina si los canales son válidos para los tipos de datos; WCAG determina la redundancia perceptual y su accesibilidad.

## Cuándo aplicar patrones

- Si el color codifica más de una categoría nominal u ordinal, asigna un patrón distinto a cada categoría. La correspondencia es 1:1: no reutilices texturas cuando haya más categorías que patrones; amplía la biblioteca.
- Si el color representa una sola categoría o es decorativo, el patrón no añade información y no hace falta.
- Si el color representa una magnitud continua en gráficos que no son heatmaps, conserva la escala y no añadas patrones categóricos.
- Excepción: en un heatmap `mark_rect` con color cuantitativo, añade puntos cuya densidad aumente con el valor. El color original debe permanecer visible bajo el patrón.

## Detección

Antes de postprocesar el SVG, comprueba el tipo del encoding `color` y la cardinalidad de sus datos. Aplica patrones categóricos solo con color nominal/ordinal y más de una categoría. Trata los heatmaps cuantitativos por separado, aunque su `color` sea `quantitative`.

## Heatmaps cuantitativos

1. Obtén el valor cuantitativo de cada celda y normalízalo entre 0 y 1 usando el mínimo y el máximo visibles.
2. Mapea valores bajos a puntos pequeños y espaciados, y valores altos a puntos mayores y más densos. Para celdas medianas (20–40 px), la guía de origen propone radios de 0.8–2.8 px y separación de 12–4 px.
3. Dibuja las texturas en un overlay SVG transparente, con `pointer-events="none"` y `aria-hidden="true"`; no reemplaces el `fill` de la celda. El overlay debe alinearse con las celdas y reconstruirse al cambiar datos o filtros.
4. Elige puntos oscuros o claros según la luminancia del relleno para mantener contraste; evita un color fijo que desaparezca sobre parte de la escala.
5. Añade una leyenda o subtítulo visible que explique: el color y la densidad de puntos codifican el valor, y una mayor densidad significa un valor mayor.
6. Si el gráfico está facetado o su SVG puede recortar o tapar el overlay, colócalo en una capa SVG externa con el z-order correcto.

## Biblioteca base

La biblioteca puede empezar con ocho patrones distintos:

`diagonal`, `dots`, `horizontal`, `grid`, `cross`, `diagonal-inv`, `dots-large`, `vertical`.

Verifica que el número de patrones asignados cubra todas las categorías. Si la cardinalidad supera la biblioteca, define patrones adicionales en vez de repetirlos.
