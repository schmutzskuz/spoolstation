# Crear una bobina y escribir una etiqueta

Una **bobina** es una unidad concreta de un [filamento](chapter:filament) con su propio peso. En la etiqueta NFC de la bobina escribes los datos del filamento; así la estación reconoce la bobina en el aparato.

## Crear una bobina

1. En la **Biblioteca**, haz clic arriba en **«Bobina»** (o usa «Crear + añadir bobina» justo después de crear un filamento).
2. Elige el **filamento** correspondiente.
3. Introduce el **peso de la bobina vacía** (solo el núcleo sin filamento). Si ya está en el filamento, se toma de ahí.
4. Haz clic en **«Crear bobina»**.

La nueva bobina aparece en la biblioteca. Luego puedes escribir una etiqueta enseguida.

## Escribir una etiqueta y vincularla

Primero pega un adhesivo **NTAG215** en blanco en la pared lateral de la bobina, cerca del borde.

1. Abre la bobina en la biblioteca y haz clic en **«Escribir etiqueta»**.
2. Coloca la etiqueta en blanco sobre la estación.
3. La app escribe los datos del filamento, vuelve a leer la etiqueta para verificar y **vincula** la UID de la etiqueta con la bobina en Spoolman.

![Detalle de bobina con «Escribir etiqueta»](images/spool.png)

Listo: a partir de ahora la estación reconoce la bobina en cuanto la colocas y registra el consumo exactamente en esta bobina al imprimir.

> Una UID pertenece siempre a **una sola** bobina. Si escribes una etiqueta para otra bobina, el vínculo anterior se elimina automáticamente.

## Escribir datos en bruto (sin Spoolman)

Si solo quieres escribir datos rápidamente en una etiqueta sin crear una bobina en Spoolman, usa **«Escribir datos en bruto»** en la página **Estación**. Ahí introduces el fabricante, el material, el color y las temperaturas directamente. Esas etiquetas **no** quedan vinculadas a una bobina, así que no se registra consumo.

## Si la escritura falla

Si acabas de crear una bobina y la escritura falla (p. ej. no colocaste ninguna etiqueta), la app elimina la bobina recién creada para que no quede huérfana. Coloca bien la etiqueta e inténtalo de nuevo. Más en [Solución de problemas](chapter:troubleshooting).
