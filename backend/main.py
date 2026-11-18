
from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import inspect, text, func
from datetime import date
from fastapi.middleware.cors import CORSMiddleware
from jwt.exceptions import InvalidTokenError

from database import engine, Base, SessionLocal

from models import Cliente, Credito, Pago, Usuario

from schemas import (
    ClienteCreate,
    ClienteResponse,
    CreditoCreate,
    CreditoResponse,
    PagoCreate,
    PagoResponse,
    LoginRequest,
    TokenResponse,
    UsuarioCreate,
    UsuarioUpdate,
    UsuarioPasswordUpdate,
    UsuarioResponse
)

from security import (
    verify_password,
    get_password_hash,
    create_access_token,
    decode_access_token
)

from pathlib import Path
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

# =====================================
# FRONTEND DE PRODUCCIÓN
# =====================================

FRONTEND_DIST = (
    Path(__file__).resolve().parent.parent
    / "frontend"
    / "dist"
)

app = FastAPI(
    title="CreditoApp Minimercado",
    description="Sistema de gestión de clientes, créditos y pagos",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================================
# BASE DE DATOS
# =====================================

Base.metadata.create_all(bind=engine)

columnas = inspect(engine).get_columns("clientes")

if "estado" not in [columna["name"] for columna in columnas]:
    with engine.begin() as conexion:
        conexion.execute(text(
            "ALTER TABLE clientes ADD COLUMN estado VARCHAR(10) NOT NULL DEFAULT 'activo'"
        ))

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# =====================================
# AUTENTICACIÓN Y PERMISOS
# =====================================

oauth2_scheme = HTTPBearer()

def get_current_user(
    credenciales: HTTPAuthorizationCredentials = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    credenciales_invalidas = HTTPException(
        status_code=401,
        detail="No se pudo validar la sesión",
        headers={"WWW-Authenticate": "Bearer"}
    )

    try:
        token = credenciales.credentials
        payload = decode_access_token(token)
        usuario_id = payload.get("sub")

        if usuario_id is None:
            raise credenciales_invalidas

        usuario_id = int(usuario_id)

    except (InvalidTokenError, ValueError, TypeError):
        raise credenciales_invalidas

    usuario = db.query(Usuario).filter(
        Usuario.id == usuario_id
    ).first()

    if not usuario or usuario.activo != "activo":
        raise credenciales_invalidas

    return usuario

def require_roles(*roles_permitidos):
    def verificar_rol(
        usuario: Usuario = Depends(get_current_user)
    ):
        if usuario.rol not in roles_permitidos:
            raise HTTPException(
                status_code=403,
                detail="No tienes permisos para realizar esta operación"
            )

        return usuario

    return verificar_rol

# =====================================
# INICIO DE SESIÓN
# =====================================

@app.post("/auth/login", response_model=TokenResponse)
def iniciar_sesion(
    datos: LoginRequest,
    db: Session = Depends(get_db)
):
    usuario = db.query(Usuario).filter(
        Usuario.username == datos.username
    ).first()

    if not usuario or not verify_password(
        datos.password,
        usuario.password_hash
    ):
        raise HTTPException(
            status_code=401,
            detail="Usuario o contraseña incorrectos"
        )

    if usuario.activo != "activo":
        raise HTTPException(
            status_code=403,
            detail="Esta cuenta se encuentra desactivada"
        )

    token = create_access_token(usuario.id)

    return {
        "access_token": token,
        "token_type": "bearer",
        "usuario": usuario
    }

# =====================================
# CONSULTAR USUARIO DE LA SESIÓN
# =====================================

@app.get("/auth/me", response_model=UsuarioResponse)
def consultar_usuario_actual(
    usuario: Usuario = Depends(get_current_user)
):
    return usuario

# =====================================
# GESTIÓN DE USUARIOS
# SOLO ADMINISTRADORES
# =====================================

# Consultar todos los usuarios
@app.get("/usuarios", response_model=list[UsuarioResponse])
def listar_usuarios(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(require_roles("administrador"))
):
    return db.query(Usuario).order_by(
        Usuario.id.desc()
    ).all()

# Crear un usuario
@app.post(
    "/usuarios",
    response_model=UsuarioResponse,
    status_code=201
)
def crear_usuario(
    datos: UsuarioCreate,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(require_roles("administrador"))
):
    usuario_existente = db.query(Usuario).filter(
        Usuario.username == datos.username
    ).first()

    if usuario_existente:
        raise HTTPException(
            status_code=409,
            detail="Ya existe un usuario con este nombre de usuario"
        )

    nuevo_usuario = Usuario(
        nombre=datos.nombre,
        username=datos.username,
        password_hash=get_password_hash(datos.password),
        rol=datos.rol,
        activo="activo"
    )

    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)

    return nuevo_usuario

# Actualizar nombre, usuario y rol
@app.put(
    "/usuarios/{usuario_id}",
    response_model=UsuarioResponse
)
def actualizar_usuario(
    usuario_id: int,
    datos: UsuarioUpdate,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(require_roles("administrador"))
):
    usuario_objetivo = db.query(Usuario).filter(
        Usuario.id == usuario_id
    ).first()

    if not usuario_objetivo:
        raise HTTPException(
            status_code=404,
            detail="Usuario no encontrado"
        )

    otro_usuario = db.query(Usuario).filter(
        Usuario.username == datos.username,
        Usuario.id != usuario_id
    ).first()

    if otro_usuario:
        raise HTTPException(
            status_code=409,
            detail="El nombre de usuario ya está en uso"
        )

    # Evitar que el administrador cambie su propio rol
    if usuario.id == usuario_id and datos.rol != usuario_objetivo.rol:
        raise HTTPException(
            status_code=400,
            detail="No puedes cambiar tu propio rol"
        )

    # Evitar dejar el sistema sin administradores activos
    if (
        usuario_objetivo.activo == "activo"
        and usuario_objetivo.rol == "administrador"
        and datos.rol != "administrador"
    ):
        otros_administradores = db.query(Usuario).filter(
            Usuario.rol == "administrador",
            Usuario.activo == "activo",
            Usuario.id != usuario_id
        ).count()

        if otros_administradores == 0:
            raise HTTPException(
                status_code=400,
                detail="No puedes cambiar el rol del último administrador activo"
            )

    usuario_objetivo.nombre = datos.nombre
    usuario_objetivo.username = datos.username
    usuario_objetivo.rol = datos.rol

    db.commit()
    db.refresh(usuario_objetivo)

    return usuario_objetivo

# Desactivar un usuario
@app.patch(
    "/usuarios/{usuario_id}/desactivar",
    response_model=UsuarioResponse
)
def desactivar_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(require_roles("administrador"))
):
    usuario_objetivo = db.query(Usuario).filter(
        Usuario.id == usuario_id
    ).first()

    if not usuario_objetivo:
        raise HTTPException(
            status_code=404,
            detail="Usuario no encontrado"
        )

    if usuario.id == usuario_id:
        raise HTTPException(
            status_code=400,
            detail="No puedes desactivar tu propia cuenta"
        )

    if usuario_objetivo.activo == "inactivo":
        raise HTTPException(
            status_code=400,
            detail="Este usuario ya está desactivado"
        )

    if usuario_objetivo.rol == "administrador":
        otros_administradores = db.query(Usuario).filter(
            Usuario.rol == "administrador",
            Usuario.activo == "activo",
            Usuario.id != usuario_id
        ).count()

        if otros_administradores == 0:
            raise HTTPException(
                status_code=400,
                detail="No puedes desactivar el último administrador activo"
            )

    usuario_objetivo.activo = "inactivo"

    db.commit()
    db.refresh(usuario_objetivo)

    return usuario_objetivo

# Reactivar un usuario
@app.patch(
    "/usuarios/{usuario_id}/reactivar",
    response_model=UsuarioResponse
)
def reactivar_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(require_roles("administrador"))
):
    usuario_objetivo = db.query(Usuario).filter(
        Usuario.id == usuario_id
    ).first()

    if not usuario_objetivo:
        raise HTTPException(
            status_code=404,
            detail="Usuario no encontrado"
        )

    if usuario_objetivo.activo == "activo":
        raise HTTPException(
            status_code=400,
            detail="Este usuario ya está activo"
        )

    usuario_objetivo.activo = "activo"

    db.commit()
    db.refresh(usuario_objetivo)

    return usuario_objetivo

# Cambiar contraseña de un usuario
@app.patch(
    "/usuarios/{usuario_id}/password",
    response_model=UsuarioResponse
)
def cambiar_password_usuario(
    usuario_id: int,
    datos: UsuarioPasswordUpdate,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(require_roles("administrador"))
):
    usuario_objetivo = db.query(Usuario).filter(
        Usuario.id == usuario_id
    ).first()

    if not usuario_objetivo:
        raise HTTPException(
            status_code=404,
            detail="Usuario no encontrado"
        )

    usuario_objetivo.password_hash = get_password_hash(
        datos.password
    )

    db.commit()
    db.refresh(usuario_objetivo)

    return usuario_objetivo

# =====================================
# RUTAS PÚBLICAS
# =====================================

@app.get("/")
def inicio():
    return FileResponse(FRONTEND_DIST / "index.html")

@app.get("/saludo")
def saludo():
    return {
        "mensaje": "Nuestro backend está funcionando"
    }

@app.get("/base-datos")
def verificar_base_datos():
    return {
        "mensaje": "Base de datos conectada correctamente",
        "tabla": "clientes"
    }

# =====================================
# CLIENTES
# =====================================

# Registrar un cliente
@app.post("/clientes", response_model=ClienteResponse, status_code=201)
def registrar_cliente(
    datos: ClienteCreate,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(require_roles("administrador", "asesor"))
):
    cliente_existente = db.query(Cliente).filter(
        Cliente.cedula == datos.cedula
    ).first()

    if cliente_existente:
        raise HTTPException(
            status_code=409,
            detail="Ya existe un cliente con esta cédula"
        )

    nuevo_cliente = Cliente(**datos.model_dump())

    db.add(nuevo_cliente)
    db.commit()
    db.refresh(nuevo_cliente)

    return nuevo_cliente

# Consultar todos los clientes
@app.get("/clientes", response_model=list[ClienteResponse])
def listar_clientes(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(
        require_roles("administrador", "asesor", "contador")
    )
):
    return db.query(Cliente).order_by(Cliente.id.desc()).all()

# Buscar un cliente por cédula
@app.get("/clientes/{cedula}", response_model=ClienteResponse)
def buscar_cliente(
    cedula: str,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(
        require_roles("administrador", "asesor", "contador")
    )
):
    cliente = db.query(Cliente).filter(
        Cliente.cedula == cedula
    ).first()

    if not cliente:
        raise HTTPException(
            status_code=404,
            detail="Cliente no encontrado"
        )

    return cliente

# Actualizar los datos de un cliente
@app.put("/clientes/{cedula}", response_model=ClienteResponse)
def actualizar_cliente(
    cedula: str,
    datos: ClienteCreate,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(require_roles("administrador", "asesor"))
):
    cliente = db.query(Cliente).filter(
        Cliente.cedula == cedula
    ).first()

    if not cliente:
        raise HTTPException(
            status_code=404,
            detail="Cliente no encontrado"
        )

    otro_cliente = db.query(Cliente).filter(
        Cliente.cedula == datos.cedula,
        Cliente.id != cliente.id
    ).first()

    if otro_cliente:
        raise HTTPException(
            status_code=409,
            detail="La cédula ya pertenece a otro cliente"
        )

    cliente.nombres = datos.nombres
    cliente.apellidos = datos.apellidos
    cliente.cedula = datos.cedula
    cliente.telefono = datos.telefono

    db.commit()
    db.refresh(cliente)

    return cliente

# Desactivar un cliente
@app.patch("/clientes/{cedula}/desactivar", response_model=ClienteResponse)
def desactivar_cliente(
    cedula: str,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(require_roles("administrador", "asesor"))
):
    cliente = db.query(Cliente).filter(
        Cliente.cedula == cedula
    ).first()

    if not cliente:
        raise HTTPException(
            status_code=404,
            detail="Cliente no encontrado"
        )

    cliente.estado = "inactivo"
    db.commit()
    db.refresh(cliente)

    return cliente

# Reactivar un cliente
@app.patch("/clientes/{cedula}/reactivar", response_model=ClienteResponse)
def reactivar_cliente(
    cedula: str,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(require_roles("administrador", "asesor"))
):
    cliente = db.query(Cliente).filter(
        Cliente.cedula == cedula
    ).first()

    if not cliente:
        raise HTTPException(
            status_code=404,
            detail="Cliente no encontrado"
        )

    cliente.estado = "activo"
    db.commit()
    db.refresh(cliente)

    return cliente

# =====================================
# CRÉDITOS
# =====================================

# Registrar un crédito
@app.post("/creditos", response_model=CreditoResponse, status_code=201)
def registrar_credito(
    datos: CreditoCreate,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(require_roles("administrador", "asesor"))
):
    cliente = db.query(Cliente).filter(
        Cliente.id == datos.cliente_id
    ).first()

    if not cliente:
        raise HTTPException(
            status_code=404,
            detail="El cliente no existe"
        )

    if cliente.estado != "activo":
        raise HTTPException(
            status_code=400,
            detail="No se pueden otorgar créditos a clientes inactivos"
        )

    if datos.fecha_vencimiento <= datos.fecha_inicio:
        raise HTTPException(
            status_code=400,
            detail="La fecha de vencimiento debe ser posterior a la fecha de inicio"
        )

    interes_total = round(
        datos.monto * (datos.tasa_interes / 100) * datos.plazo_meses,
        2
    )

    total_pagar = round(datos.monto + interes_total, 2)

    valor_cuota = round(
        total_pagar / datos.plazo_meses,
        2
    )

    nuevo_credito = Credito(
        cliente_id=datos.cliente_id,
        monto=datos.monto,
        tasa_interes=datos.tasa_interes,
        plazo_meses=datos.plazo_meses,
        interes_total=interes_total,
        total_pagar=total_pagar,
        valor_cuota=valor_cuota,
        fecha_inicio=datos.fecha_inicio,
        fecha_vencimiento=datos.fecha_vencimiento,
        saldo_pendiente=total_pagar,
        estado="activo"
    )

    db.add(nuevo_credito)
    db.commit()
    db.refresh(nuevo_credito)

    return nuevo_credito

# Consultar todos los créditos
@app.get("/creditos", response_model=list[CreditoResponse])
def listar_creditos(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(
        require_roles("administrador", "asesor", "contador")
    )
):
    return db.query(Credito).order_by(Credito.id.desc()).all()

# Consultar un crédito por su ID
@app.get("/creditos/{credito_id}", response_model=CreditoResponse)
def buscar_credito(
    credito_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(
        require_roles("administrador", "asesor", "contador")
    )
):
    credito = db.query(Credito).filter(
        Credito.id == credito_id
    ).first()

    if not credito:
        raise HTTPException(
            status_code=404,
            detail="Crédito no encontrado"
        )

    return credito

# =====================================
# PAGOS
# =====================================

# Registrar un pago
@app.post("/pagos", response_model=PagoResponse, status_code=201)
def registrar_pago(
    datos: PagoCreate,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(require_roles("administrador", "asesor"))
):
    credito = db.query(Credito).filter(
        Credito.id == datos.credito_id
    ).first()

    if not credito:
        raise HTTPException(
            status_code=404,
            detail="Crédito no encontrado"
        )

    if credito.estado == "pagado":
        raise HTTPException(
            status_code=400,
            detail="Este crédito ya está pagado"
        )

    if datos.monto > credito.saldo_pendiente:
        raise HTTPException(
            status_code=400,
            detail="El pago supera el saldo pendiente"
        )

    nuevo_pago = Pago(**datos.model_dump())

    credito.saldo_pendiente = round(
        credito.saldo_pendiente - datos.monto, 2
    )

    if credito.saldo_pendiente <= 0:
        credito.saldo_pendiente = 0
        credito.estado = "pagado"

    db.add(nuevo_pago)
    db.commit()
    db.refresh(nuevo_pago)

    return nuevo_pago

# Consultar pagos
@app.get("/pagos", response_model=list[PagoResponse])
def listar_pagos(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(
        require_roles("administrador", "asesor", "contador")
    )
):
    return db.query(Pago).order_by(Pago.id.desc()).all()

# Consultar pagos de un crédito
@app.get("/creditos/{credito_id}/pagos", response_model=list[PagoResponse])
def listar_pagos_credito(
    credito_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(
        require_roles("administrador", "asesor", "contador")
    )
):
    credito = db.query(Credito).filter(
        Credito.id == credito_id
    ).first()

    if not credito:
        raise HTTPException(
            status_code=404,
            detail="Crédito no encontrado"
        )

    return db.query(Pago).filter(
        Pago.credito_id == credito_id
    ).order_by(Pago.id.desc()).all()

# =====================================
# CÁLCULO DEL RESUMEN
# =====================================

def calcular_resumen(db: Session):

    hoy = date.today()

    # Actualizar créditos vencidos
    db.query(Credito).filter(
        Credito.fecha_vencimiento < hoy,
        Credito.saldo_pendiente > 0,
        Credito.estado != "vencido",
        Credito.estado != "pagado"
    ).update(
        {Credito.estado: "vencido"},
        synchronize_session=False
    )

    # Reactivar créditos que aún no han vencido
    db.query(Credito).filter(
        Credito.fecha_vencimiento >= hoy,
        Credito.saldo_pendiente > 0,
        Credito.estado == "vencido"
    ).update(
        {Credito.estado: "activo"},
        synchronize_session=False
    )

    db.commit()

    total_clientes = db.query(Cliente).count()

    clientes_activos = db.query(Cliente).filter(
        Cliente.estado == "activo"
    ).count()

    total_creditos = db.query(Credito).count()

    creditos_activos = db.query(Credito).filter(
        Credito.estado == "activo"
    ).count()

    creditos_vencidos = db.query(Credito).filter(
        Credito.estado == "vencido"
    ).count()

    creditos_pagados = db.query(Credito).filter(
        Credito.estado == "pagado"
    ).count()

    total_prestado = db.query(
        func.coalesce(func.sum(Credito.monto), 0)
    ).scalar()

    total_recaudado = db.query(
        func.coalesce(func.sum(Pago.monto), 0)
    ).scalar()

    saldo_pendiente = db.query(
        func.coalesce(func.sum(Credito.saldo_pendiente), 0)
    ).scalar()

    return {
        "total_clientes": total_clientes,
        "clientes_activos": clientes_activos,
        "total_creditos": total_creditos,
        "creditos_activos": creditos_activos,
        "creditos_vencidos": creditos_vencidos,
        "creditos_pagados": creditos_pagados,
        "total_prestado": round(float(total_prestado), 2),
        "total_recaudado": round(float(total_recaudado), 2),
        "saldo_pendiente": round(float(saldo_pendiente), 2)
    }

# =====================================
# DASHBOARD
# =====================================

@app.get("/dashboard/resumen")
def resumen_dashboard(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(
        require_roles("administrador", "asesor", "contador")
    )
):
    return calcular_resumen(db)

# =====================================
# REPORTES
# =====================================

@app.get("/reportes/resumen")
def resumen_general(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(
        require_roles("administrador", "contador")
    )
):
    return calcular_resumen(db)

# Historial de los últimos 10 pagos
@app.get("/reportes/movimientos")
def movimientos_recientes(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(
        require_roles("administrador", "contador")
    )
):
    resultados = (
        db.query(Pago, Credito, Cliente)
        .join(Credito, Pago.credito_id == Credito.id)
        .join(Cliente, Credito.cliente_id == Cliente.id)
        .order_by(Pago.id.desc())
        .limit(10)
        .all()
    )

    movimientos = []

    for pago, credito, cliente in resultados:
        movimientos.append({
            "tipo": "Pago",
            "pago_id": pago.id,
            "cliente": f"{cliente.nombres} {cliente.apellidos}",
            "credito_id": credito.id,
            "monto": pago.monto,
            "fecha": pago.fecha_pago,
            "metodo_pago": pago.metodo_pago
        })

    return movimientos

# =====================================
# ARCHIVOS DEL FRONTEND
# =====================================

app.mount(
    "/",
    StaticFiles(directory=FRONTEND_DIST, html=True),
    name="frontend"
)