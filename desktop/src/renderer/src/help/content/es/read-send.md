# Leer etiquetas y enviar a la impresora

En la página **Estación** lees y escribes etiquetas desde el PC y ves el estado de la estación.

![La página Estación](images/station.png)

## Conectar con la estación

Arriba en la página Estación te conectas con el aparato:

- **«Buscar»** encuentra la estación automáticamente en la red (por mDNS).
- También puedes introducir la **dirección** directamente, p. ej. la IP fija de tu router o `spoolstation.local`.

Una vez conectado, el área de estado muestra el nombre, la IP, la señal Wi-Fi, el tiempo en marcha y si el módulo NFC está listo.

## Leer una etiqueta

1. Haz clic en **«Leer etiqueta»**.
2. Coloca la bobina con la etiqueta sobre la estación.
3. La app muestra la UID y los datos guardados (fabricante, material, color, temperaturas).

Si la bobina está en Spoolman, puedes abrirla directamente. Si no se detecta ninguna etiqueta válida, se agota el tiempo tras unos segundos y recibes un mensaje.

## Enviar una bobina a un hueco de impresora

No necesitas escribir una etiqueta para cargar un filamento: también puedes enviar una bobina directamente desde la biblioteca a un hueco:

1. Abre la bobina en la **Biblioteca**.
2. Haz clic en **«A hueco de impresora»**.
3. Elige la impresora y el **hueco (T1–T4)**.
4. Haz clic en **«Enviar»**.

La estación fija el hueco en la impresora y vincula la bobina para que se registre el consumo. En el propio aparato es aún más sencillo: gira hasta el hueco, coloca la bobina, pulsa corto; listo (ver [Manejo del aparato](chapter:device)).

## Vaciar un hueco

En la página **Impresora** puedes liberar un hueco de nuevo con **«Vaciar hueco»**. Eso desvincula la bobina del hueco y detiene el registro de consumo.
