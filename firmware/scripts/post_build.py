#  PlatformIO Post-Build: erzeugt aus dem fertigen Build
#    - factory.bin   (Bootloader + Partitionen + boot_app0 + App, flashbar ab 0x0)
#    - ota.bin       (nur App, fuer OTA-Updates)
#    - firmware-manifest.json (Version, api_version, Dateien mit Groesse + SHA-256)
#  Ausgabe nach firmware/dist/ und zusaetzlich nach desktop/resources/firmware/,
#  damit das PC-Programm die aktuelle factory.bin offline mitbringt.
import os, re, json, hashlib, shutil, subprocess

Import("env")  # noqa: F821  (von PlatformIO bereitgestellt)

FLASH_SIZE = "4MB"


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def read_define(header, name, default=""):
    try:
        txt = open(header, "r", encoding="utf-8").read()
        m = re.search(r'#define\s+' + name + r'\s+"?([^"\n]+)"?', txt)
        return m.group(1).strip() if m else default
    except OSError:
        return default


def read_int(header, name, default=0):
    try:
        txt = open(header, "r", encoding="utf-8").read()
        m = re.search(name + r'\s*=\s*(\d+)', txt)
        return int(m.group(1)) if m else default
    except OSError:
        return default


def after_build(source, target, env):
    build_dir = env.subst("$BUILD_DIR")
    proj = env.subst("$PROJECT_DIR")
    pyexe = env.subst("$PYTHONEXE")

    app = os.path.join(build_dir, "firmware.bin")
    boot = os.path.join(build_dir, "bootloader.bin")
    parts = os.path.join(build_dir, "partitions.bin")
    if not (os.path.isfile(app) and os.path.isfile(boot) and os.path.isfile(parts)):
        print("[post_build] bins noch nicht da – uebersprungen")
        return

    fw_pkg = env.PioPlatform().get_package_dir("framework-arduinoespressif32")
    boot_app0 = os.path.join(fw_pkg, "tools", "partitions", "boot_app0.bin")
    esptool = os.path.join(env.PioPlatform().get_package_dir("tool-esptoolpy"), "esptool.py")

    dist = os.path.join(proj, "dist")
    os.makedirs(dist, exist_ok=True)
    factory = os.path.join(dist, "factory.bin")
    ota = os.path.join(dist, "ota.bin")

    # factory.bin zusammenfuegen
    cmd = [pyexe, esptool, "--chip", "esp32", "merge_bin", "-o", factory,
           "--flash_mode", "dio", "--flash_freq", "40m", "--flash_size", FLASH_SIZE,
           "0x1000", boot, "0x8000", parts, "0xe000", boot_app0, "0x10000", app]
    print("[post_build] erstelle factory.bin")
    subprocess.run(cmd, check=True)

    shutil.copyfile(app, ota)

    version = read_define(os.path.join(proj, "include", "version.h"), "FW_VERSION", "0.0.0")
    # api_version = Version der HTTP-API (/api/*), gemeinsame Quelle version.json -> version.h.
    try:
        api_version = int(read_define(os.path.join(proj, "include", "version.h"), "FW_API_VERSION", "1"))
    except ValueError:
        api_version = 1

    manifest = {
        "device": "SpoolStation",
        "version": version,
        "api_version": api_version,
        "flash_size": FLASH_SIZE,
        "files": [
            {"name": "factory.bin", "role": "factory", "flash_offset": "0x0",
             "size": os.path.getsize(factory), "sha256": sha256(factory)},
            {"name": "ota.bin", "role": "ota",
             "size": os.path.getsize(ota), "sha256": sha256(ota)},
        ],
    }
    with open(os.path.join(dist, "firmware-manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    # Fuer das PC-Programm bereitstellen (offline mitgeliefert): factory.bin zum
    # Flashen, ota.bin fuer das OTA-Update ohne Internet, plus Manifest.
    res = os.path.join(proj, "..", "desktop", "resources", "firmware")
    try:
        os.makedirs(res, exist_ok=True)
        shutil.copyfile(factory, os.path.join(res, "factory.bin"))
        shutil.copyfile(ota, os.path.join(res, "ota.bin"))
        shutil.copyfile(os.path.join(dist, "firmware-manifest.json"),
                        os.path.join(res, "firmware-manifest.json"))
    except OSError as e:
        print("[post_build] Kopie nach desktop/resources fehlgeschlagen:", e)

    print("[post_build] fertig: %s (%d Bytes), ota.bin, manifest" % (factory, os.path.getsize(factory)))


env.AddPostAction("$BUILD_DIR/${PROGNAME}.bin", after_build)  # noqa: F821
