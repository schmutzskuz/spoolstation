# Primeros pasos

Bienvenido a SpoolStation. Con SpoolStation gestionas tus bobinas de filamento, escribes etiquetas NFC y envías filamentos a tu Snapmaker U1. La pequeña «estación» es un aparato con lector NFC que montas tú mismo; esta aplicación de escritorio lo controla todo.

## Qué necesitas

- La **aplicación SpoolStation** (este programa).
- Una **estación** (el aparato NFC con pantalla y rueda giratoria). Mira el capítulo [Hardware](chapter:hardware) para montarla.
- Un **servidor Spoolman** en tu red. Spoolman es un software gratuito que guarda tus bobinas en una base de datos.
- Un **Snapmaker U1** con el **Paxx Extended Firmware** y la integración de Spoolman activada (solo si quieres enviar filamentos a la impresora).

La estación, Spoolman y la impresora están en la **misma red Wi-Fi**. La estación solo se conecta a una red de **2,4 GHz**.

## Configurar la aplicación

Al abrirla por primera vez aparece el **asistente de configuración**, que te guía en unos pocos pasos:

1. Elige el **idioma**.
2. Introduce la **dirección de Spoolman** y compruébala con «Probar conexión» (p. ej. `http://192.168.1.50:7912`).
3. Añade una **impresora** (nombre y dirección IP) y pruébala. Puedes saltarte este paso si no usas impresora.
4. **Configura la estación**: flashea una estación nueva por USB o empareja una existente.

Puedes volver a abrir el asistente en cualquier momento en **Ajustes → «Configurar estación»**.

![Ajustes con conexiones e impresoras](images/einstellungen.png)

## Configurar una estación nueva por USB

Para un ESP32 nuevo o vacío, elige **«Configurar estación nueva (USB)»** en el asistente:

1. Conecta el ESP32 con un **cable de datos USB** (los cables de solo carga no sirven).
2. Haz clic en **«Conectar»** y elige el puerto marcado como **CH340**.
3. La app flashea el firmware: tarda uno o dos minutos, no lo desconectes.
4. Elige tu **Wi-Fi** de la lista e introduce la contraseña.
5. Haz clic en **«Configurar»**. La estación se reinicia y luego aparece en la app.

> ¿Se queda bloqueado al conectar o la pantalla se queda en negro? Entonces tu placa no tiene auto-reset. Mantén pulsado el botón **BOOT** al flashear y pulsa **EN** una vez después. Más detalles en [Solución de problemas](chapter:troubleshooting).

## Emparejar una estación existente

Si la estación ya está configurada (p. ej. en otro PC), elige **«Emparejar estación existente»**. Puedes reconfigurarla por USB o simplemente conectarte por red introduciendo su dirección y la clave API.

## Cómo está organizada la app

La barra lateral de la izquierda tiene estas secciones:

- **Impresora**: muestra los huecos de tu impresora. Ver [Página de impresora](chapter:printers).
- **Estación**: conexión con la estación, leer y escribir etiquetas. Ver [Leer etiquetas y enviar](chapter:read-send).
- **Biblioteca**: todas tus bobinas, filamentos y fabricantes. Ver [Gestionar la biblioteca](chapter:library).
- **Ajustes**: conexiones, impresoras, idioma, actualizaciones.
- **Ayuda**: esta página.

Arriba ves siempre el **estado de conexión** de la estación, la impresora y Spoolman. Junto a cada título de sección hay un pequeño **«?»** que te lleva directo al capítulo de ayuda correspondiente.
