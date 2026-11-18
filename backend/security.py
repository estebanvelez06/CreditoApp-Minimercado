
from datetime import datetime, timedelta, timezone
from pathlib import Path
import secrets

import jwt
from pwdlib import PasswordHash


# =====================================
# CONFIGURACIÓN DE SEGURIDAD
# =====================================

# Crear una clave secreta local si todavía no existe.
# Así los tokens siguen siendo válidos después de reiniciar FastAPI.

CARPETA_BACKEND = Path(__file__).resolve().parent
ARCHIVO_CLAVE = CARPETA_BACKEND / ".creditoapp_secret"

if not ARCHIVO_CLAVE.exists():
    ARCHIVO_CLAVE.write_text(
        secrets.token_urlsafe(64),
        encoding="utf-8"
    )

SECRET_KEY = ARCHIVO_CLAVE.read_text(encoding="utf-8").strip()

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480

password_hasher = PasswordHash.recommended()


# =====================================
# CONTRASEÑAS
# =====================================

def get_password_hash(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(
    password: str,
    password_hash: str
) -> bool:
    try:
        return password_hasher.verify(password, password_hash)
    except Exception:
        return False


# =====================================
# TOKENS JWT
# =====================================

def create_access_token(user_id: int) -> str:
    expiration = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload = {
        "sub": str(user_id),
        "exp": expiration
    }

    token = jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM
    )

    return token


def decode_access_token(token: str) -> dict:
    return jwt.decode(
        token,
        SECRET_KEY,
        algorithms=[ALGORITHM]
    )
