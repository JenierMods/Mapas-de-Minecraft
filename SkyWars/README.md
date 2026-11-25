# SkyWars Rotativo (Minecraft Bedrock)

Minijuego de SkyWars para **Minecraft Bedrock 1.21+** con **10 mapas que rotan entre partidas**. Está inspirado en el clásico *SkyWars (10 Maps)* de Team Cubitos MC: mismas funciones principales, pero con islas, temas y código originales.

![Todos los mapas](previews/todos-los-mapas.png)

## Funciones

| Función | Detalle |
|---|---|
| **10 mapas** | Pradera, Desierto, Glaciar, Infierno, El Fin, Champiñones, Jungla, Océano, Cerezos y Geoda |
| **Rotación de mapas** | Secuencial (1 → 10), Aleatoria (nunca repite el anterior) o **Votación** de los jugadores en el lobby |
| **2 modos** | **Normal** (todos contra todos) y **Rojo vs Azul** (equipos; el daño entre compañeros se devuelve) |
| **2 a 8 jugadores** | 8 islas de aparición con jaulas de cristal. Los que sobran entran como espectadores |
| **Botín Normal / Extremo** | Cofres de isla de aparición, de islas intermedias y de la isla central, con mejor botín en el centro |
| **Recarga de cofres** | Cada 2 minutos (configurable de 60 a 300 s) |
| **Muerte súbita** | A los 10 min (configurable) todos van al centro. A los 2 min se declara empate |
| **Cuenta atrás y jaulas** | 10 s dentro de la jaula. En Rojo vs Azul el suelo de la jaula es del color del equipo |
| **Espectador** | Al morir pasas a espectador sobre la arena |
| **Vacío** | Caer al vacío elimina. Si alguien te empujó, el asesinato cuenta para él |
| **Límite del mapa** | Quien se aleja más de 56 bloques del centro (o sube demasiado) es devuelto, para que nada quede fuera del área que se limpia |
| **Estadísticas** | Victorias y asesinatos (marcador `sw_wins` / `sw_kills`) |
| **Lobby flotante** | Con piso de cristal sobre la arena. La partida empieza sola al llegar al mínimo de jugadores |
| **Menú (brújula)** | Votar mapa, estadísticas, lista de mapas, iniciar partida y configuración |
| **Configuración** | Modo, botín, rotación, inicio automático, jugadores mínimos, espera, recarga, tiempo límite y activar o desactivar cada mapa |
| **Reinicio automático** | Cada partida limpia la arena y la reconstruye desde cero |

## Instalación

**Opción A: mundo listo**
1. Abre `dist/SkyWars-Rotativo.mcworld` y Minecraft lo importa.
2. Entra al mundo. El lobby se construye solo en unos segundos.

**Opción B: en tu propio mundo**
1. Abre `dist/SkyWars-Rotativo.mcpack`.
2. Crea un mundo, de preferencia **Plano**, y en *Paquetes de comportamiento* activa **SkyWars Rotativo**.
3. Las islas se construyen en el cielo (Y = 160 a 230) sobre el punto 0, 0, así que funciona con cualquier terreno.

> Las dos opciones necesitan los **trucos activados** (para los comandos `gamerule`, `tickingarea` y `fill`).

## Admins

Si nadie tiene la etiqueta `sw_admin`, cualquiera puede configurar e iniciar. Para limitarlo a un admin:

```
/tag TuNombre add sw_admin
```

Un admin puede iniciar con **un solo jugador** para probar los mapas. En ese caso la partida no termina sola.

## Estructura

```
behavior_pack/
  manifest.json
  scripts/main.js     ← lógica del juego (fases, menús, eventos)
  scripts/arenas.js   ← generador de las 10 arenas (lo usan el juego y las imágenes)
  scripts/loot.js     ← tablas de botín Normal y Extremo
tools/
  render-previews.mjs ← genera previews/*.png con el mismo generador del juego
  contact-sheet.mjs   ← junta las 10 imágenes en una
  check-arenas.mjs    ← verifica las arenas (cofres tapados, jaulas ocupadas, arena sin soporte…)
  build.py            ← crea dist/*.mcpack y dist/*.mcworld
previews/             ← imágenes de los mapas
dist/                 ← archivos para importar en Minecraft
```

Para volver a generar las imágenes y los paquetes:

```bash
NODE_PATH=$(npm root -g) node tools/render-previews.mjs
NODE_PATH=$(npm root -g) node tools/contact-sheet.mjs
python3 tools/build.py
```

## Notas

- Usa `@minecraft/server` 1.11.0 y `@minecraft/server-ui` 1.2.0 (API estable, sin experimentos).
- Los bloques que cambiaron de nombre entre versiones tienen un respaldo con el ID antiguo.
- Las imágenes son vistas isométricas generadas desde el código, no capturas del juego.
- **Fuego amigo (Rojo vs Azul):** la API estable no permite cancelar un golpe, así que la vida quitada por un compañero se devuelve justo después. Un golpe que mata de una sola vez (por ejemplo, TNT) sí puede eliminar a un compañero.
