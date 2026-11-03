# Hardware

La estación se monta rápido: un ESP32, un módulo NFC, una pantalla redonda y una rueda giratoria. Aquí tienes la lista de piezas y la asignación de pines como resumen. Abre la **guía de montaje completa** con fotos, consejos de soldadura y la carcasa con el botón de abajo.

## Lista de piezas

- **ESP32 DevKit** (ESP32-WROOM-32, 30 pines) con USB-C y chip CH340
- **Adaptador de bornes de tornillo para ESP32** (30 pines, versión estrecha); el ESP32 solo se encaja
- **Módulo NFC PN532 V3** (placa roja)
- **Pantalla redonda GC9A01**, 1,28", 240 × 240
- **Encoder rotatorio EC11** con función de pulsador y rueda
- Adhesivos NFC **NTAG215** (uno por bobina)
- Cable de silicona, punteras, tubo termorretráctil, un **cable de datos USB-C** y una fuente de 5 V

## Asignación de pines

Esta asignación es obligatoria: el firmware espera exactamente estos pines.

| Función | GPIO | Nota |
| --- | --- | --- |
| Pantalla SCLK (SCL) | 18 | bus de pantalla |
| Pantalla MOSI (SDA) | 23 | bus de pantalla |
| Pantalla RST (RES) | 17 | |
| Pantalla DC | 16 | |
| Pantalla CS | 5 | |
| Retroiluminación (BLK) | 4 | si existe |
| PN532 SCK | 14 | bus NFC |
| PN532 MISO | 27 | bus NFC |
| PN532 MOSI | 13 | bus NFC |
| PN532 SS | 26 | bus NFC |
| Encoder A | 32 | |
| Encoder B | 33 | |
| Pulsador del encoder | 25 | pulsado = LOW |

La pantalla y el módulo NFC funcionan a **3,3 V**; el borne VIN (5 V) queda libre. Cada pieza necesita una conexión a **GND**.

## Importante: interruptor DIP del módulo NFC

El módulo PN532 debe estar en **SPI**, si no, no se detecta: **interruptor 1 en OFF, interruptor 2 en ON**.

## Primera configuración

El cableado se hace con el USB desenchufado. Una vez comprobado todo con el multímetro, enchufa el ESP32 y configura la estación por completo desde la app; mira [Primeros pasos](chapter:getting-started). No necesitas un entorno de programación.

> La guía de montaje completa con imágenes, comprobaciones de continuidad y solución de problemas se abre en el navegador.
