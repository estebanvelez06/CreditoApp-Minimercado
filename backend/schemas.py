
from pydantic import BaseModel, ConfigDict, Field
from datetime import date, datetime
from typing import Literal


# ==============================
# CLIENTES
# ==============================

class ClienteCreate(BaseModel):
    nombres: str = Field(min_length=2, max_length=100)
    apellidos: str = Field(min_length=2, max_length=100)
    cedula: str = Field(min_length=5, max_length=20)
    telefono: str | None = Field(default=None, max_length=20)


class ClienteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombres: str
    apellidos: str
    cedula: str
    telefono: str | None
    estado: str


# ==============================
# CREDITOS
# ==============================

class CreditoCreate(BaseModel):
    cliente_id: int
    monto: float = Field(gt=0)
    tasa_interes: float = Field(ge=0, le=100)
    plazo_meses: int = Field(gt=0, le=120)
    fecha_inicio: date
    fecha_vencimiento: date


class CreditoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    cliente_id: int
    monto: float
    tasa_interes: float
    plazo_meses: int
    interes_total: float
    total_pagar: float
    valor_cuota: float
    fecha_inicio: date
    fecha_vencimiento: date
    saldo_pendiente: float
    estado: str


# ==============================
# PAGOS
# ==============================

class PagoCreate(BaseModel):
    credito_id: int
    monto: float = Field(gt=0)
    fecha_pago: date
    metodo_pago: str = Field(min_length=2, max_length=30)
    observacion: str | None = Field(default=None, max_length=250)


class PagoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    credito_id: int
    monto: float
    fecha_pago: date
    metodo_pago: str
    observacion: str | None


# ==============================
# USUARIOS
# ==============================

class UsuarioCreate(BaseModel):
    nombre: str = Field(min_length=2, max_length=100)
    username: str = Field(min_length=4, max_length=50)
    password: str = Field(min_length=8, max_length=128)
    rol: Literal["administrador", "asesor", "contador"]


class UsuarioUpdate(BaseModel):
    nombre: str = Field(min_length=2, max_length=100)
    username: str = Field(min_length=4, max_length=50)
    rol: Literal["administrador", "asesor", "contador"]

class UsuarioPasswordUpdate(BaseModel):
    password: str = Field(min_length=8, max_length=128)


class UsuarioResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    username: str
    rol: str
    activo: str
    fecha_creacion: datetime


# ==============================
# INICIO DE SESION
# ==============================

class LoginRequest(BaseModel):
    username: str = Field(min_length=4, max_length=50)
    password: str = Field(min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    usuario: UsuarioResponse
