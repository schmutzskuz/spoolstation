# Actualizaciones

SpoolStation se mantiene al día por sí mismo: la **aplicación** mediante versiones de GitHub y el **firmware de la estación** por radio (OTA). La app y el firmware comparten un mismo número de versión.

## Actualizar la app

La app comprueba si hay una versión nueva al arrancar y con regularidad después, y la descarga en segundo plano. Cuando está lista, aparece arriba un aviso **«La versión X está lista»** con las novedades y un botón **«Reiniciar e instalar»**.

En **Ajustes → Actualizaciones** puedes configurar:

- **Buscar actualizaciones automáticamente** sí/no.
- **Canal**: Estable o Beta (versiones previas).
- **«Buscar ahora»** para una comprobación inmediata.

> Las actualizaciones de la app solo funcionan en el programa **instalado**, no en una versión de desarrollo.

## Actualizar el firmware de la estación (OTA)

Cuando hay firmware más reciente, lo ves en la página **Estación** en «Firmware de la estación» y como aviso en la barra de estado. Basta un clic:

1. Haz clic en **«Actualizar firmware»**.
2. La app verifica la suma de comprobación, sube el firmware (en la pantalla aparece un arco de progreso «Instalando actualización – no apagar») y espera el reinicio.
3. Después la app confirma la nueva versión.

Si algo sale mal durante la actualización, el **firmware antiguo se conserva**: la estación no queda inservible. En ese caso la app informa con claridad de que se revirtió.

Con **«Elegir archivo de firmware…»** también puedes instalar tu propio `ota.bin`. Usa solo un archivo pensado realmente para esta estación.

## Actualización única por USB con firmware antiguo

El firmware muy antiguo aún no conoce la actualización por radio. En ese caso, la página Estación muestra el aviso **«Este firmware aún no se puede actualizar por Wi-Fi. Actualízalo una vez por USB.»** con un botón que abre el asistente en el modo **«Actualizar firmware, conservar ajustes»**.

Esta vía reescribe **solo el firmware**; el Wi-Fi, la clave API y las impresoras se conservan. Conecta la estación por USB y sigue el asistente. A partir de ahí, cada actualización posterior se hace cómodamente por radio.
