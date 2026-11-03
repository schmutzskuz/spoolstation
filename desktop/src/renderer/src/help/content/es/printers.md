# Página de impresora y varias impresoras

La página **Impresora** muestra los huecos de filamento de tu impresora, tal como los ve ahora mismo el Snapmaker. La vista se actualiza cada 5 segundos aproximadamente.

![La página Impresora con los huecos](images/drucker.png)

## Qué muestran los huecos

Para cada hueco (T1–T4) ves el color, el nombre del filamento, el material, la temperatura de boquilla y de cama y, si la bobina está vinculada en Spoolman, el **peso restante**. Arriba ves el nombre de la impresora, el estado de conexión y, si hay una impresión en curso, el progreso.

Un hueco vacío se muestra como «Vacío».

## Asignar una bobina

En la propia página Impresora puedes asignar una bobina a un hueco, incluso **sin etiqueta NFC**:

1. Haz clic en **«Asignar bobina»** en el hueco.
2. Elige una bobina de Spoolman.
3. Confirma: la estación fija el hueco y registra el consumo en esa bobina.

Con **«Vaciar hueco»** liberas el hueco de nuevo.

## Requisitos

Los datos de los huecos vienen de la impresora a través de Moonraker. Para ello, el Snapmaker U1 debe ejecutar el **Paxx Extended Firmware** con la integración de Spoolman activada. El peso restante y la vinculación solo funcionan si las bobinas están mantenidas en Spoolman.

## Varias impresoras

Puedes configurar hasta **cuatro impresoras**. Hazlo en **Ajustes → Impresoras**:

1. Haz clic en **«Añadir impresora»**.
2. Introduce el nombre, la IP y el puerto y compruébalo con **«Probar conexión»**.
3. La primera impresora de la lista es la **impresora predeterminada**. Con **«Como predeterminada»** lo cambias.

La lista de impresoras se sincroniza automáticamente con la estación (guardada en la NVS de la estación). En el aparato, la rueda recorre entonces los huecos de todas las impresoras y la pantalla muestra también el nombre de la impresora.
