# SkyWars Rotativo · Creado por JenierMods OFC

<img src="assets/logo-jeniermods.png" width="96" align="right">

Minijuego de SkyWars para **Minecraft Bedrock 1.21+**: **10 mapas que rotan entre partidas** y un **lobby con minijuegos**. Está inspirado en el clásico *SkyWars (10 Maps)* de Team Cubitos MC, con las mismas funciones principales pero con islas, temas y código originales.

![Lobby](previews/lobby-00-vista-general.png)

## Lobby

El lobby es una isla aparte, a 1000 bloques de la arena, así que desde las islas de juego no se ve.

| Zona | Qué hace |
|---|---|
| **Portal (JUGAR)** | Entras al portal y pasas a la **sala de espera** (la cola). La partida empieza sola **30 segundos** después de que haya jugadores suficientes. Si ya hay una partida en curso, el portal te lleva a **mirarla como espectador** |
| **Sala de espera** | Muestra cuántos hay en la cola y la cuenta atrás. Para **salir de la cola**, te paras en el bloque verde |
| **Aldeano de Kits** | Eliges entre 8 kits (Constructor, Guerrero, Arquero, Explorador, Médico, Demoledor, Pescador o sin kit) |
| **Aldeano de Mapas** | Lista de los 10 mapas con su descripción, y **votación** del siguiente mapa |
| **Aldeano de Estadísticas** | Tus victorias, asesinatos, muertes, partidas, K/D, % de victorias y récords, más el **top 10** |
| **Aldeano de Ajustes** (admin) | Configuración de la partida, forzar inicio, terminar la partida actual y reconstruir el lobby |
| **Parkour** | 36 saltos en espiral con 4 puntos de control y cronómetro. En la cima aparecen los créditos **Creado por JenierMods OFC** frente al **mural gigante del logo**. Si caes, vuelves al último punto de control. Agáchate para salir |
| **Tiro con arco** | Al entrar recibes un arco y flechas. Las dianas cuentan aciertos y guardan tu mejor marca |
| **Laberinto** | Laberinto de azalea con cronómetro: encuentra el bloque de oro del centro |
| **Trampolines** | Bloques de slime con torres para saltar |
| **Hologramas** | Textos flotantes: créditos, estado de la cola, **ranking de victorias** y **mejores tiempos del parkour** en vivo |

En el lobby no se recibe daño ni se pasa hambre. Los aldeanos se abren al tocarlos o al golpearlos. Sobre la fuente de la plaza está el nombre **SkyWars** con los créditos. Si alguien cae dentro de la fuente, a los **30 segundos** vuelve solo al punto de inicio. El portal se **enciende con fuego**, como lo haría un jugador, y se revisa y repara solo cada 15 segundos.

| | |
|---|---|
| ![Plaza](previews/lobby-01-plaza-y-aldeanos.png) | ![Portal](previews/lobby-02-portal-y-sala-de-espera.png) |
| ![Parkour](previews/lobby-03-parkour-y-mural.png) | ![Laberinto](previews/lobby-04-laberinto-y-arco.png) |

## Los 10 mapas

![Todos los mapas](previews/todos-los-mapas.png)

Cada mapa tiene su propia **forma de isla** (cono, meseta, hongo, esfera o escalonada), su propia distribución y su propio estilo de construcción.

**Cada isla de aparición tiene 3 cofres:**
1. **Arriba**, junto a la jaula. Trae lo básico asegurado: bloques y una espada.
2. **Dentro de una casita** con puerta, ventanas, farol y techo según el tema.
3. **En una cueva** debajo de la isla, a la que se baja por una escalera. Tiene mesa de trabajo, horno, farol y luz en el techo.

**La isla central tiene un salón** con 4 puertas, **8 cofres ordenados** contra las paredes y una **mesa de encantamientos** con librerías (en los cofres del centro hay lapislázuli).

**Cofres escondidos con mejor botín:**
- Un **sótano secreto** bajo el salón. Hay que picar el bloque marcado del piso.
- **Túneles** que atraviesan la isla central.
- Un cofre **enterrado** en cada isla intermedia.

| Isla de aparición (corte) | Salón central (sin techo) |
|---|---|
| ![Isla](previews/detalle-isla-de-aparicion.png) | ![Salón](previews/detalle-salon-central.png) |

| # | Mapa | Forma | Casitas | Salón central | Extra |
|---|---|---|---|---|---|
| 1 | Pradera | Cono | Cabañas de madera | Mansión con techo de pirámide | Molinos |
| 2 | Desierto | Meseta | Casas de adobe | Salón-pirámide | Obeliscos |
| 3 | Glaciar | Cono con picos de hielo | Iglús | Palacio con cúpula | Torres de hielo |
| 4 | Infierno | Escalonada con basalto | Chozas de ladrillo del Nether | Fortaleza con almenas | **Puentes** al centro |
| 5 | El Fin | Esfera | Torres de purpur | Castillo elevado | Pilares de obsidiana |
| 6 | Champiñones | Hongo | Casitas-hongo | Gran salón champiñón | 6 islas intermedias |
| 7 | Jungla | Escalonada | Chozas con techo de hojas | Templo | **Puentes** y árboles gigantes |
| 8 | Océano | Meseta | Casas de prismarina | Monumento con cúpula | Barcos naufragados |
| 9 | Cerezos | Escalonada | Casas de té | Pagoda de 2 pisos | **Puentes** y pabellones |
| 10 | Geoda | Esfera | Casas de calcita | Salón de amatista | Medias geodas |

## Funciones de la partida

| Función | Detalle |
|---|---|
| **Rotación de mapas** | Secuencial (1 → 10), aleatoria (nunca repite el anterior) o **por votación** |
| **2 modos** | **Normal** (todos contra todos) y **Rojo vs Azul** (equipos; el daño entre compañeros se devuelve) |
| **2 a 8 jugadores** | Jaulas de cristal y 10 s de cuenta atrás. En Rojo vs Azul el suelo de la jaula es del color del equipo |
| **Kits** | Se entregan al abrir la jaula (los puede desactivar un admin) |
| **Botín Normal / Extremo** | Cofres de aparición, intermedios, centrales y secretos |
| **Recarga de cofres** | Cada 2 minutos (configurable) |
| **Muerte súbita** | A los 10 min (configurable) todos van al centro. 2 min después se declara empate |
| **Vacío y empujones** | Si alguien te tira al vacío, el asesinato cuenta para él |
| **Límite del mapa** | Quien se aleja demasiado es devuelto |
| **Espectador** | Al morir, o entrando al portal con una partida en curso. Agáchate 2 s para volver |
| **Reinicio automático** | Cada partida limpia la arena y la reconstruye desde cero |

## Instalación

| Archivo | Para qué |
|---|---|
| `dist/SkyWars-Rotativo.mctemplate` | **Recomendado.** Aparece en *Crear mundo nuevo → Plantillas* con su **ícono y créditos fijos**. Cada mundo que crees con ella ya trae todo |
| `dist/SkyWars-Rotativo.mcworld` | El mundo listo para jugar |
| `dist/SkyWars-Rotativo.mcaddon` | Solo los packs, para añadirlos a otro mundo (actívalos los dos) |

- Hacen falta los **trucos activados** (para `gamerule`, `tickingarea` y `fill`).
- La primera vez, el lobby se construye solo en unos segundos. Mientras tanto se ve una **pantalla de carga** en negro ("SkyWars · Cargando… %"), sin poder moverse. Cuando todo está listo, apareces en la plaza con un fundido. Las veces siguientes la pantalla dura solo un instante.
- **Sobre la miniatura del mundo:** Minecraft siempre reemplaza la imagen de un mundo por una captura al salir de él, y no hay forma de bloquearlo. La **plantilla** sí conserva su imagen y sus créditos en la lista de plantillas, así que úsala para que la portada siempre se vea bien.

### Admins

Si nadie tiene la etiqueta `sw_admin`, cualquiera puede usar el aldeano de Ajustes. Para limitarlo:

```
/tag TuNombre add sw_admin
```

**Probar estando solo:** si eres la única persona en el mundo, entra al portal y la partida empieza contigo en **modo prueba** a los 30 segundos (por si entra alguien más). La prueba termina cuando mueres o con la muerte súbita. Con más gente en el mundo, un admin también puede usar *Ajustes → Forzar inicio* con una sola persona en la cola.

## Estructura

```
behavior_pack/
  manifest.json
  entities/texto.json     ← entidad invisible para los hologramas
  scripts/main.js         ← lógica: partida, cola, aldeanos, minijuegos, menús
  scripts/arenas.js       ← generador de las 10 arenas
  scripts/lobby.js        ← generador del lobby y sus zonas
  scripts/gen.js          ← utilidades de generación (islas, árboles…)
  scripts/loot.js         ← botín Normal, Extremo y cofres secretos
  scripts/kits.js         ← kits
  scripts/logo.js         ← pixel art del logo (generado)
resource_pack/            ← modelo de los hologramas, textos, ícono
assets/logo-jeniermods.png
tools/
  render-previews.mjs     ← imágenes de previews/ e ícono del mundo
  iso.mjs                 ← renderizador isométrico
  check-arenas.mjs        ← verificador de las arenas
  check-lobby.mjs         ← verificador del lobby (saltos del parkour, portal, laberinto…)
  make-logo.py            ← convierte el logo en pixel art
  build.py                ← crea dist/*.mcaddon, *.mcworld y *.mctemplate
```

Para volver a generar todo:

```bash
python3 tools/make-logo.py
node tools/check-arenas.mjs && node tools/check-lobby.mjs
NODE_PATH=$(npm root -g) node tools/render-previews.mjs
python3 tools/build.py
```

## Notas

- Usa `@minecraft/server` 1.11.0 y `@minecraft/server-ui` 1.2.0 (API estable, sin experimentos).
- Los bloques que cambiaron de nombre entre versiones tienen un respaldo con el ID antiguo.
- Las imágenes son vistas isométricas generadas con el mismo código que construye los mapas, no capturas del juego.
- **Fuego amigo (Rojo vs Azul):** la API estable no permite cancelar un golpe, así que la vida quitada por un compañero se devuelve justo después. Un golpe que mata de una vez (por ejemplo, TNT) sí puede eliminar a un compañero.
