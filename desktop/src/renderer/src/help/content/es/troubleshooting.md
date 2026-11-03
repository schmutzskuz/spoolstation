# Solución de problemas / Preguntas frecuentes

Aquí tienes soluciones para los problemas más habituales. A menudo basta con mirar el estado de conexión en la parte superior de la app.

## No se encuentra la estación

- ¿Está la estación en la **misma red Wi-Fi** que el PC? La estación solo admite **2,4 GHz**.
- Introduce la dirección **manualmente** en la página Estación (IP fija del router o `spoolstation.local`).
- Comprueba la IP actual en el aparato con una **pulsación larga**.
- ¿Bloquea el **cortafuegos de Windows** el programa? Permite SpoolStation para **redes privadas**.
- Consejo: asigna a la estación una **IP fija** en el router para que no cambie nunca.

## NFC no está listo

Si arriba pone «NFC no listo», la estación no encontró el módulo PN532:

- El **interruptor DIP** debe estar en SPI: interruptor 1 OFF, interruptor 2 ON.
- Revisa el cableado, sobre todo **MISO → GPIO 27** y **MOSI → GPIO 13** (es fácil intercambiarlos).
- El módulo necesita **3,3 V** y GND.

## La etiqueta no se reconoce

- Usa solo **NTAG215** (la NTAG213 es demasiado pequeña).
- Coloca la etiqueta **plana y centrada** sobre la superficie de lectura, a 2–4 cm.
- Sin **metal** justo debajo de la etiqueta.
- Pega el adhesivo en la **pared lateral** de la bobina, cerca del borde.

## No se alcanza la impresora

- ¿Son correctos la **IP y el puerto** (por defecto 7125)? Prueba la conexión en Ajustes → Impresoras.
- ¿Ejecuta el Snapmaker U1 el **Paxx Extended Firmware** con la integración de Spoolman activada?
- ¿Está la impresora en la misma red y encendida?

## No se alcanza Spoolman

- Comprueba la **URL de Spoolman** (p. ej. `http://192.168.1.50:7912`). Si no responde, prueba el puerto **8000**.
- ¿Está en marcha el servidor Spoolman (p. ej. en la Raspberry Pi)?
- Prueba la URL una vez en el navegador.

## El flasheo se bloquea / la pantalla se queda en negro

Algunas placas baratas no tienen condensador de auto-reset y no arrancan solas tras el flasheo:

1. Mantén pulsado el botón **BOOT** del ESP32 al conectar/flashear.
2. Si la pantalla sigue en negro, pulsa **EN** una vez y haz clic en **«Reintentar»**.
3. Si no ayuda: usa otro **cable de datos USB** (los de solo carga no sirven) y conéctalo directo al PC, no a través de un hub.

## Falta el controlador CH340

Si al flashear no aparece ningún puerto para elegir, probablemente falta el **controlador USB CH340**:

- Instala el controlador del fabricante **WCH** (CH340/CH341).
- Luego vuelve a enchufar el ESP32 y haz clic en «Conectar» de nuevo.

## La lista de Wi-Fi está vacía

- La estación solo ve **redes de 2,4 GHz**. Las redes de solo 5 GHz no aparecen.
- Si tu router usa el mismo nombre para 2,4 y 5 GHz, elige la entrada de todas formas: la estación se conecta a la banda de 2,4 GHz.
- Usa **«Buscar de nuevo»** para refrescar la lista, o escribe el nombre de la red a mano.

## La app y la estación no coinciden

Si la app muestra «La versión no coincide», la app y el firmware están en niveles distintos. Actualiza ambos: primero la app y luego el firmware de la estación (ver [Actualizaciones](chapter:updates)).
