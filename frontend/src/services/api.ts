
const API_URL = import.meta.env.DEV
  ? "http://127.0.0.1:8000"
  : "";
const TOKEN_KEY = "creditoapp_token";

// =====================================================
// TIPOS
// =====================================================

export type RolUsuario = "administrador" | "asesor" | "contador";

export interface Usuario {
  id: number;
  nombre: string;
  username: string;
  rol: RolUsuario;
  activo: string;
  fecha_creacion: string;
}

export interface UsuarioNuevo {
  nombre: string;
  username: string;
  password: string;
  rol: RolUsuario;
}

export interface UsuarioActualizacion {
  nombre: string;
  username: string;
  rol: RolUsuario;
}

interface LoginRespuesta {
  access_token: string;
  token_type: string;
  usuario: Usuario;
}

export interface Resumen {
  total_clientes: number;
  clientes_activos: number;
  total_creditos: number;
  creditos_activos: number;
  creditos_vencidos: number;
  creditos_pagados: number;
  total_prestado: number;
  total_recaudado: number;
  saldo_pendiente: number;
}

export interface Cliente {
  id: number;
  nombres: string;
  apellidos: string;
  cedula: string;
  telefono: string | null;
  estado: string;
}

export interface ClienteNuevo {
  nombres: string;
  apellidos: string;
  cedula: string;
  telefono?: string;
}

export interface Credito {
  id: number;
  cliente_id: number;
  monto: number;
  tasa_interes: number;
  plazo_meses: number;
  interes_total: number;
  total_pagar: number;
  valor_cuota: number;
  fecha_inicio: string;
  fecha_vencimiento: string;
  saldo_pendiente: number;
  estado: string;
}

export interface CreditoNuevo {
  cliente_id: number;
  monto: number;
  tasa_interes: number;
  plazo_meses: number;
  fecha_inicio: string;
  fecha_vencimiento: string;
}

export interface Pago {
  id: number;
  credito_id: number;
  monto: number;
  fecha_pago: string;
  metodo_pago: string;
  observacion: string | null;
}

export interface PagoNuevo {
  credito_id: number;
  monto: number;
  fecha_pago: string;
  metodo_pago: string;
  observacion?: string;
}

// =====================================================
// TOKEN Y SESIÓN
// =====================================================

export function obtenerToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

function guardarToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function cerrarSesion(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}

// =====================================================
// MANEJO DE RESPUESTAS
// =====================================================

async function comprobarRespuesta(
  respuesta: Response
): Promise<Response> {
  if (!respuesta.ok) {
    const error = await respuesta.json().catch(() => null);

    throw new Error(
      error?.detail ||
        "Ocurrió un error al comunicarse con el servidor."
    );
  }

  return respuesta;
}

// =====================================================
// SOLICITUDES AUTENTICADAS
// =====================================================

async function solicitud(
  ruta: string,
  opciones: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(opciones.headers);

  headers.set("Accept", "application/json");

  const token = obtenerToken();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (opciones.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const respuesta = await fetch(`${API_URL}${ruta}`, {
    ...opciones,
    headers,
  });

  return comprobarRespuesta(respuesta);
}

// =====================================================
// AUTENTICACIÓN
// =====================================================

export async function iniciarSesion(
  username: string,
  password: string
): Promise<Usuario> {
  const respuesta = await comprobarRespuesta(
    await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ username, password }),
    })
  );

  const datos: LoginRespuesta = await respuesta.json();

  guardarToken(datos.access_token);

  return datos.usuario;
}

export async function obtenerUsuarioActual(): Promise<Usuario> {
  const respuesta = await solicitud("/auth/me");
  return respuesta.json();
}

// =====================================================
// DASHBOARD
// =====================================================

export async function obtenerResumen(): Promise<Resumen> {
  const respuesta = await solicitud("/dashboard/resumen");
  return respuesta.json();
}

// =====================================================
// CLIENTES
// =====================================================

export async function obtenerClientes(): Promise<Cliente[]> {
  const respuesta = await solicitud("/clientes");
  return respuesta.json();
}

export async function crearCliente(
  datos: ClienteNuevo
): Promise<Cliente> {
  const respuesta = await solicitud("/clientes", {
    method: "POST",
    body: JSON.stringify(datos),
  });

  return respuesta.json();
}

export async function actualizarCliente(
  cedulaOriginal: string,
  datos: ClienteNuevo
): Promise<Cliente> {
  const respuesta = await solicitud(
    `/clientes/${encodeURIComponent(cedulaOriginal)}`,
    {
      method: "PUT",
      body: JSON.stringify(datos),
    }
  );

  return respuesta.json();
}

export async function desactivarCliente(
  cedula: string
): Promise<Cliente> {
  const respuesta = await solicitud(
    `/clientes/${encodeURIComponent(cedula)}/desactivar`,
    {
      method: "PATCH",
    }
  );

  return respuesta.json();
}

export async function reactivarCliente(
  cedula: string
): Promise<Cliente> {
  const respuesta = await solicitud(
    `/clientes/${encodeURIComponent(cedula)}/reactivar`,
    {
      method: "PATCH",
    }
  );

  return respuesta.json();
}

// =====================================================
// CRÉDITOS
// =====================================================

export async function obtenerCreditos(): Promise<Credito[]> {
  const respuesta = await solicitud("/creditos");
  return respuesta.json();
}

export async function crearCredito(
  datos: CreditoNuevo
): Promise<Credito> {
  const respuesta = await solicitud("/creditos", {
    method: "POST",
    body: JSON.stringify(datos),
  });

  return respuesta.json();
}

// =====================================================
// PAGOS
// =====================================================

export async function obtenerPagos(): Promise<Pago[]> {
  const respuesta = await solicitud("/pagos");
  return respuesta.json();
}

export async function crearPago(
  datos: PagoNuevo
): Promise<Pago> {
  const respuesta = await solicitud("/pagos", {
    method: "POST",
    body: JSON.stringify(datos),
  });

  return respuesta.json();
}

export async function obtenerPagosCredito(
  creditoId: number
): Promise<Pago[]> {
  const respuesta = await solicitud(
    `/creditos/${creditoId}/pagos`
  );

  return respuesta.json();
}

// =====================================================
// GESTIÓN DE USUARIOS
// =====================================================

// Consultar todos los usuarios
export async function obtenerUsuarios(): Promise<Usuario[]> {
  const respuesta = await solicitud("/usuarios");
  return respuesta.json();
}

// Crear un usuario
export async function crearUsuario(
  datos: UsuarioNuevo
): Promise<Usuario> {
  const respuesta = await solicitud("/usuarios", {
    method: "POST",
    body: JSON.stringify(datos),
  });

  return respuesta.json();
}

// Actualizar nombre, username y rol
export async function actualizarUsuario(
  usuarioId: number,
  datos: UsuarioActualizacion
): Promise<Usuario> {
  const respuesta = await solicitud(`/usuarios/${usuarioId}`, {
    method: "PUT",
    body: JSON.stringify(datos),
  });

  return respuesta.json();
}

// Desactivar un usuario
export async function desactivarUsuario(
  usuarioId: number
): Promise<Usuario> {
  const respuesta = await solicitud(
    `/usuarios/${usuarioId}/desactivar`,
    {
      method: "PATCH",
    }
  );

  return respuesta.json();
}

// Reactivar un usuario
export async function reactivarUsuario(
  usuarioId: number
): Promise<Usuario> {
  const respuesta = await solicitud(
    `/usuarios/${usuarioId}/reactivar`,
    {
      method: "PATCH",
    }
  );

  return respuesta.json();
}


// Cambiar contraseña de un usuario
export async function cambiarPasswordUsuario(
  usuarioId: number,
  password: string
): Promise<Usuario> {
  const respuesta = await solicitud(
    `/usuarios/${usuarioId}/password`,
    {
      method: "PATCH",
      body: JSON.stringify({ password }),
    }
  );

  return respuesta.json();
}

