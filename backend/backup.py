
import sqlite3
from pathlib import Path
from datetime import datetime

# Carpeta donde se encuentra este archivo
BASE_DIR = Path(__file__).resolve().parent

# Base de datos original
DATABASE_PATH = BASE_DIR / "creditoapp.db"

# Carpeta de copias de seguridad
BACKUP_DIR = BASE_DIR / "backups"


def crear_respaldo():
    """Crea una copia consistente de la base de datos SQLite."""

    if not DATABASE_PATH.exists():
        raise FileNotFoundError("No se encontró creditoapp.db")

    BACKUP_DIR.mkdir(exist_ok=True)

    fecha = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    destino = BACKUP_DIR / f"creditoapp_{fecha}.db"

    with sqlite3.connect(DATABASE_PATH) as origen:
        with sqlite3.connect(destino) as respaldo:
            origen.backup(respaldo)

    return destino


if __name__ == "__main__":
    try:
        archivo = crear_respaldo()
        print(f"Respaldo creado correctamente: {archivo}")
    except Exception as error:
        print(f"No se pudo crear el respaldo: {error}")
