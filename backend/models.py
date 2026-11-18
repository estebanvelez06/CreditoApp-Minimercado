
from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Date,
    DateTime,
    ForeignKey
)
from sqlalchemy.orm import relationship

from database import Base


class Cliente(Base):
    __tablename__ = "clientes"

    id = Column(Integer, primary_key=True, index=True)
    nombres = Column(String(100), nullable=False)
    apellidos = Column(String(100), nullable=False)
    cedula = Column(String(20), unique=True, nullable=False, index=True)
    telefono = Column(String(20), nullable=True)
    estado = Column(
        String(10),
        nullable=False,
        default="activo",
        server_default="activo"
    )

    creditos = relationship("Credito", back_populates="cliente")


class Credito(Base):
    __tablename__ = "creditos"

    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False)

    monto = Column(Float, nullable=False)
    tasa_interes = Column(Float, nullable=False)
    plazo_meses = Column(Integer, nullable=False)

    interes_total = Column(Float, nullable=False)
    total_pagar = Column(Float, nullable=False)
    valor_cuota = Column(Float, nullable=False)

    fecha_inicio = Column(Date, nullable=False)
    fecha_vencimiento = Column(Date, nullable=False)

    saldo_pendiente = Column(Float, nullable=False)
    estado = Column(String(20), nullable=False, default="activo")

    cliente = relationship("Cliente", back_populates="creditos")
    pagos = relationship("Pago", back_populates="credito")


class Pago(Base):
    __tablename__ = "pagos"

    id = Column(Integer, primary_key=True, index=True)
    credito_id = Column(Integer, ForeignKey("creditos.id"), nullable=False)

    monto = Column(Float, nullable=False)
    fecha_pago = Column(Date, nullable=False)
    metodo_pago = Column(String(30), nullable=False)
    observacion = Column(String(250), nullable=True)

    credito = relationship("Credito", back_populates="pagos")


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    rol = Column(String(20), nullable=False)
    activo = Column(String(10), nullable=False, default="activo")
    fecha_creacion = Column(DateTime, default=datetime.utcnow, nullable=False)

