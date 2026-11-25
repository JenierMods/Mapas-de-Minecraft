"""Empaqueta SkyWars Rotativo (Creado por JenierMods OFC):
  dist/SkyWars-Rotativo.mcaddon     -> behavior pack + resource pack (para añadir a cualquier mundo)
  dist/SkyWars-Rotativo.mcworld     -> mundo vacío (void) con los packs ya activados
  dist/SkyWars-Rotativo.mctemplate  -> plantilla: aparece en "Crear mundo > Plantillas" con su
                                      ícono y créditos fijos

Uso: python3 tools/build.py
"""
import json
import random
import struct
import uuid
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BP, RP = ROOT / "behavior_pack", ROOT / "resource_pack"
DIST = ROOT / "dist"
NAME = "SkyWars Rotativo"
CREDITS = "Creado por JenierMods OFC"
# UUID fijos de la plantilla (no cambiarlos: así Minecraft la reconoce como la misma al actualizar)
TEMPLATE_UUID = "5b8f3e2a-6c1d-4f7e-9a2b-3c4d5e6f7a81"
TEMPLATE_MODULE = "8e7d6c5b-4a39-4281-b7c6-d5e4f3a2b190"

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
        "Generator": (INT, 2),                      # plano
        "FlatWorldLayers": (STRING, void_layers),   # ...solo aire = vacío
        "GameType": (INT, 2),                       # aventura (el script cambia el modo en partida)
        "Difficulty": (INT, 2),
        "ForceGameType": (BYTE, 0),
        "commandsEnabled": (BYTE, 1),
        "SpawnX": (INT, 1000), "SpawnY": (INT, 101), "SpawnZ": (INT, 8),
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
        "texturePacksRequired": (BYTE, 1),
    }
    body = struct.pack("<b", COMPOUND) + _str("") + _payload(COMPOUND, root)
    return struct.pack("<ii", 10, len(body)) + body


def add_dir(z, src: Path, prefix: str):
    for f in sorted(src.rglob("*")):
        if f.is_file():
            z.write(f, prefix + f.relative_to(src).as_posix())


def header(pack):
    m = json.loads((pack / "manifest.json").read_text(encoding="utf-8"))
    return m["header"]["uuid"], m["header"]["version"]


def world_files(z, with_template_manifest=False):
    bp_uuid, bp_ver = header(BP)
    rp_uuid, rp_ver = header(RP)
    z.writestr("level.dat", level_dat())
    z.writestr("levelname.txt", NAME)
    z.writestr("world_behavior_packs.json", json.dumps([{"pack_id": bp_uuid, "version": bp_ver}], indent=2))
    z.writestr("world_resource_packs.json", json.dumps([{"pack_id": rp_uuid, "version": rp_ver}], indent=2))
    icon = ROOT / "world_icon.jpeg"
    if icon.exists():
        z.write(icon, "world_icon.jpeg")
    add_dir(z, BP, "behavior_packs/skywars_rotativo_bp/")
    add_dir(z, RP, "resource_packs/skywars_rotativo_rp/")
    if with_template_manifest:
        z.writestr("manifest.json", json.dumps({
            "format_version": 2,
            "header": {"name": "pack.name", "description": "pack.description", "uuid": TEMPLATE_UUID,
                       "version": bp_ver, "lock_template_options": False, "base_game_version": [1, 21, 0]},
            "modules": [{"type": "world_template", "uuid": TEMPLATE_MODULE, "version": bp_ver}],
            "metadata": {"authors": ["JenierMods OFC"]},
        }, indent=2))
        lang = f"pack.name={NAME}\npack.description={CREDITS} · 10 mapas, lobby con minijuegos\n"
        for l in ["en_US", "es_ES", "es_MX"]:
            z.writestr(f"texts/{l}.lang", lang)
        z.writestr("texts/languages.json", json.dumps(["en_US", "es_ES", "es_MX"]))


def main():
    DIST.mkdir(exist_ok=True)
    for old in DIST.glob("*"):
        old.unlink()

    with zipfile.ZipFile(DIST / "SkyWars-Rotativo.mcaddon", "w", zipfile.ZIP_DEFLATED) as z:
        add_dir(z, BP, "SkyWars_BP/")
        add_dir(z, RP, "SkyWars_RP/")
    with zipfile.ZipFile(DIST / "SkyWars-Rotativo.mcworld", "w", zipfile.ZIP_DEFLATED) as z:
        world_files(z)
    with zipfile.ZipFile(DIST / "SkyWars-Rotativo.mctemplate", "w", zipfile.ZIP_DEFLATED) as z:
        world_files(z, with_template_manifest=True)

    for f in sorted(DIST.iterdir()):
        print(f"{f.name}: {f.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
