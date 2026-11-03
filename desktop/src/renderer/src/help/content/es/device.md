# Manejo del aparato

La estación tiene solo dos controles: una **rueda giratoria** que también puedes pulsar. Con eso haces todo directamente en el aparato, sin PC.

## Pantalla de inicio

![Pantalla de inicio con los cuatro huecos](images/display-start.png)

El anillo exterior de cuatro segmentos representa los **huecos 1 a 4** de tu impresora, cada uno en el **color real del filamento**. En el centro se dibuja una bobina; lo llena que está muestra el peso restante. Debajo ves el número de hueco, el nombre del filamento, el material y el peso restante.

Un hueco vacío o desconocido se dibuja como un arco gris fino.

## Girar: elegir un hueco

Gira la rueda para seleccionar un hueco. El segmento elegido crece y recibe una marca de latón por fuera. Si configuras varias impresoras, la rueda recorre los huecos de todas; la pantalla muestra entonces también el nombre de la impresora.

> ¿La rueda gira «al revés»? Puedes invertirla: **Ajustes → Configuración de la estación → Invertir sentido** (o directamente en el aparato desde la página Estación).

## Pulsación corta: leer y enviar

![Leyendo: coloca la bobina](images/display-lesen.png)

Una pulsación corta inicia la **lectura**. Un arco de latón se vacía como una cuenta atrás, pulsan ondas NFC y aparece el texto «Coloca la bobina». Pon la bobina con la etiqueta NFC sobre la superficie de lectura.

![Éxito: hueco cargado](images/display-erfolg.png)

Cuando se reconoce la etiqueta, la bobina se rellena del color del filamento, aparece una marca de verificación y el filamento se **envía automáticamente al hueco de impresora elegido**. Tras unos segundos la pantalla vuelve atrás.

Si algo falla, la pantalla tiembla un instante y muestra un círculo rojo con un mensaje claro.

## Pulsación larga: pantalla de información

Mantén la rueda pulsada más tiempo (más de 1,5 segundos) para abrir la **pantalla de información** con la dirección IP, el nombre mDNS (`spoolstation.local`), la señal Wi-Fi y la versión del firmware. Útil cuando buscas la dirección de la estación.

## Trabajos desde el PC

Si inicias una lectura o escritura desde el PC, el aparato muestra «PC – coloca la etiqueta» y la rueda queda bloqueada mientras tanto. Después ves la misma animación de éxito o error que en el aparato.

## Atenuado automático

Tras 60 segundos sin uso, la pantalla se atenúa suavemente. El siguiente giro o pulsación la devuelve al brillo máximo al instante.

## Restablecer de fábrica

Para borrar todo de la estación (Wi-Fi, clave API, impresoras, URL de Spoolman), haz un **restablecimiento de fábrica**:

1. **Desconecta** la estación de la corriente.
2. **Mantén pulsada la rueda** mientras la vuelves a enchufar.
3. Sigue pulsando (unos 10 segundos) hasta que aparezca la pregunta de confirmación.
4. Confirma con la rueda.

La estación queda como nueva y arranca en modo de configuración. Tu base de datos de Spoolman y las etiquetas de las bobinas no se ven afectadas.
