"""Empaqueta el SkyWars:
  dist/SkyWars-Rotativo.mcpack   -> solo el behavior pack (para añadir a cualquier mundo)
  dist/SkyWars-Rotativo.mcworld  -> mundo vacío (void) con el pack ya activado

Uso: python3 tools/build.py
"""
import io
import json
import random
import struct
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BP = ROOT / "behavior_pack"
DIST = ROOT / "dist"
NAME = "SkyWars Rotativo"

# --- NBT little-endian mínimo ------------------------------------------------
BYTE, INT, LONG, STRING, LIST, COMPOUND = 1, 3, 4, 8, 9, 10


def _str(s):
    b = s.encode("utf-8")
    return struct.pack("<H", len(b)) + b


def _payload(tag, value):
    if tag == BYTE:
        return struct.pack("<b", value)
    if tag == INT:
        return struct.pack("<i", value)
    if tag == LONG:
        return struct.pack("<q", value)
    if tag == STRING:
        return _str(value)
    if tag == LIST:
        inner, items = value
        return struct.pack("<bi", inner, len(items)) + b"".join(_payload(inner, v) for v in items)
    if tag == COMPOUND:
        out = b""
        for k, (t, v) in value.items():
            out += struct.pack("<b", t) + _str(k) + _payload(t, v)
        return out + b"\x00"
    raise ValueError(tag)


def level_dat():
    void_layers = json.dumps({
        "biome_id": 1,
        "block_layers": [{"block_name": "minecraft:air", "count": 1}],
        "encoding_version": 6,
        "structure_options": None,
        "world_version": "version.post_1_18",
    })
    ver = (INT, [1, 21, 0, 0, 0])
    root = {
        "StorageVersion": (INT, 10),
        "LevelName": (STRING, NAME),
        "Generator": (INT, 2),               # plano
        "FlatWorldLayers": (STRING, void_layers),  # ...solo aire = vacío
        "GameType": (INT, 2),                # aventura (el script cambia el modo en partida)
        "Difficulty": (INT, 2),
        "ForceGameType": (BYTE, 0),
        "commandsEnabled": (BYTE, 1),
        "SpawnX": (INT, 0), "SpawnY": (INT, 231), "SpawnZ": (INT, 0),
        "RandomSeed": (LONG, random.randint(1, 2**31)),
        "Time": (LONG, 6000),
        "lastOpenedWithVersion": (LIST, ver),
        "MinimumCompatibleClientVersion": (LIST, ver),
        "NetworkVersion": (INT, 685),
        "InventoryVersion": (STRING, "1.21.0"),
        "spawnMobs": (BYTE, 0),
        "dodaylightcycle": (BYTE, 0),
        "domobspawning": (BYTE, 0),
        "doweathercycle": (BYTE, 0),
        "doimmediaterespawn": (BYTE, 1),
        "showcoordinates": (BYTE, 0),
        "mobgriefing": (BYTE, 0),
        "texturePacksRequired": (BYTE, 0),
    }
    body = struct.pack("<b", COMPOUND) + _str("") + _payload(COMPOUND, root)
    return struct.pack("<ii", 10, len(body)) + body


def add_dir(z, src: Path, prefix: str):
    for f in sorted(src.rglob("*")):
        if f.is_file():
            z.write(f, prefix + f.relative_to(src).as_posix())


def main():
    DIST.mkdir(exist_ok=True)
    manifest = json.loads((BP / "manifest.json").read_text(encoding="utf-8"))
    uuid, version = manifest["header"]["uuid"], manifest["header"]["version"]

    with zipfile.ZipFile(DIST / "SkyWars-Rotativo.mcpack", "w", zipfile.ZIP_DEFLATED) as z:
        add_dir(z, BP, "")

    with zipfile.ZipFile(DIST / "SkyWars-Rotativo.mcworld", "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("level.dat", level_dat())
        z.writestr("levelname.txt", NAME)
        z.writestr("world_behavior_packs.json", json.dumps([{"pack_id": uuid, "version": version}], indent=2))
        icon = ROOT / "world_icon.jpeg"
        if icon.exists():
            z.write(icon, "world_icon.jpeg")
        add_dir(z, BP, "behavior_packs/skywars_rotativo/")

    for f in sorted(DIST.iterdir()):
        print(f"{f.name}: {f.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
