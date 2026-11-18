
import { useEffect, useState } from "react";
import type { FormEvent, CSSProperties } from "react";
import "./App.css";
import Usuarios from "./usuarios";

import {
  obtenerResumen,
  obtenerClientes,
  crearCliente,
  actualizarCliente,
  desactivarCliente,
  reactivarCliente,
  obtenerCreditos,
  crearCredito,
  obtenerPagos,
  crearPago,
  iniciarSesion,
  obtenerUsuarioActual,
  cerrarSesion,
  obtenerToken,
  type Usuario,
  type Resumen,
  type Cliente,
  type Credito,
  type Pago,
} from "./services/api";

const menu = [
  { id: "dashboard", label: "Panel principal", icon: "▦" },
  { id: "clientes", label: "Clientes", icon: "♙" },
  { id: "creditos", label: "Créditos", icon: "▤" },
  { id: "pagos", label: "Pagos", icon: "$" },
  { id: "reportes", label: "Reportes", icon: "▥" },
  { id: "usuarios", label: "Usuarios", icon: "♙" },
];

function formatoMoneda(valor: number) {
  return valor.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

function fechaActualLocal() {
  const hoy = new Date();
  const año = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const dia = String(hoy.getDate()).padStart(2, "0");
  return `${año}-${mes}-${dia}`;
}

function nombreRol(rol: string) {
  const nombres: Record<string, string> = {
    administrador: "Administrador",
    asesor: "Asesor",
    contador: "Contador",
  };

  return nombres[rol] || rol;
}

function App() {
  // =====================================
  // AUTENTICACIÓN
  // =====================================

  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [verificandoSesion, setVerificandoSesion] = useState(true);
  const [usuarioLogin, setUsuarioLogin] = useState("");
  const [passwordLogin, setPasswordLogin] = useState("");
  const [errorLogin, setErrorLogin] = useState("");
  const [cargandoLogin, setCargandoLogin] = useState(false);

  const esAdministrador = usuario?.rol === "administrador";
  const puedeGestionar = esAdministrador || usuario?.rol === "asesor";
  const puedeVerReportes =
    esAdministrador || usuario?.rol === "contador";

  const menuPermitido = menu.filter(
    (item) =>
      (item.id !== "reportes" || puedeVerReportes) &&
      (item.id !== "usuarios" || esAdministrador)
  );

  // =====================================
  // ESTADOS GENERALES
  // =====================================

  const [active, setActive] = useState("dashboard");

  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [creditos, setCreditos] = useState<Credito[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);

  const [busqueda, setBusqueda] = useState("");

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [clienteEditando, setClienteEditando] = useState<string | null>(null);

  const [mostrarFormularioCredito, setMostrarFormularioCredito] =
    useState(false);

  const [cargandoClientes, setCargandoClientes] = useState(false);
  const [cargandoCreditos, setCargandoCreditos] = useState(false);
  const [cargandoPagos, setCargandoPagos] = useState(false);

  const [guardando, setGuardando] = useState(false);
  const [guardandoCredito, setGuardandoCredito] = useState(false);
  const [guardandoPago, setGuardandoPago] = useState(false);

  const [procesandoCliente, setProcesandoCliente] = useState<number | null>(
    null
  );

  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [formulario, setFormulario] = useState({
    nombres: "",
    apellidos: "",
    cedula: "",
    telefono: "",
  });

  const [formularioCredito, setFormularioCredito] = useState({
    cliente_id: "",
    monto: "",
    tasa_interes: "2",
    plazo_meses: "3",
    fecha_inicio: fechaActualLocal(),
    fecha_vencimiento: "",
  });

  const [formularioPago, setFormularioPago] = useState({
    credito_id: "",
    monto: "",
    fecha_pago: fechaActualLocal(),
    metodo_pago: "efectivo",
    observacion: "",
  });

  const [filtroHistorial, setFiltroHistorial] = useState("todos");

  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [metodoReporte, setMetodoReporte] = useState("todos");

  // =====================================
  // VERIFICAR SESIÓN AL INICIAR
  // =====================================

  useEffect(() => {
    let componenteActivo = true;

    async function verificarSesion() {
      if (!obtenerToken()) {
        if (componenteActivo) {
          setVerificandoSesion(false);
        }
        return;
      }

      try {
        const datosUsuario = await obtenerUsuarioActual();

        if (componenteActivo) {
          setUsuario(datosUsuario);
        }
      } catch {
        cerrarSesion();

        if (componenteActivo) {
          setUsuario(null);
        }
      } finally {
        if (componenteActivo) {
          setVerificandoSesion(false);
        }
      }
    }

    void verificarSesion();

    return () => {
      componenteActivo = false;
    };
  }, []);

  // =====================================
  // INICIAR SESIÓN
  // =====================================

  async function manejarInicioSesion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorLogin("");
    setCargandoLogin(true);

    try {
      const datosUsuario = await iniciarSesion(
        usuarioLogin.trim(),
        passwordLogin
      );

      setUsuario(datosUsuario);
      setPasswordLogin("");
      setActive("dashboard");
      setError("");
      setMensaje("");
    } catch (err) {
      setErrorLogin(
        err instanceof Error
          ? err.message
          : "No se pudo iniciar sesión. Verifica tus datos."
      );
    } finally {
      setCargandoLogin(false);
    }
  }

  // =====================================
  // CERRAR SESIÓN
  // =====================================

  function manejarCerrarSesion() {
    const confirmado = window.confirm(
      "¿Estás seguro de que deseas cerrar sesión?"
    );

    if (!confirmado) return;

    cerrarSesion();

    setUsuario(null);
    setResumen(null);
    setClientes([]);
    setCreditos([]);
    setPagos([]);

    setActive("dashboard");
    setError("");
    setMensaje("");

    setPasswordLogin("");
    setUsuarioLogin("");

    setMostrarFormulario(false);
    setMostrarFormularioCredito(false);
  }

  // =====================================
  // CARGA INICIAL DE INFORMACIÓN
  // =====================================

  useEffect(() => {
    if (usuario) {
      void cargarResumen();
    }
  }, [usuario]);

  useEffect(() => {
    if (!usuario) return;

    if (active === "clientes") {
      void cargarClientes();
    }

    if (active === "creditos") {
      void cargarClientes();
      void cargarCreditos();
    }

    if (active === "pagos") {
      void cargarClientes();
      void cargarCreditos();
      void cargarPagos();
    }

    if (active === "reportes" && puedeVerReportes) {
      void cargarClientes();
      void cargarCreditos();
      void cargarPagos();
      void cargarResumen();
    }
  }, [active, usuario]);

  useEffect(() => {
    if (
      usuario &&
      !menuPermitido.some((item) => item.id === active)
    ) {
      setActive("dashboard");
    }
  }, [usuario, active]);

  async function cargarResumen() {
    try {
      const datos = await obtenerResumen();
      setResumen(datos);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo cargar el resumen."
      );
    }
  }

  async function cargarClientes() {
    setCargandoClientes(true);
    setError("");

    try {
      const datos = await obtenerClientes();
      setClientes(datos);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar los clientes."
      );
    } finally {
      setCargandoClientes(false);
    }
  }

  async function cargarCreditos() {
    setCargandoCreditos(true);
    setError("");

    try {
      const datos = await obtenerCreditos();
      setCreditos(datos);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar los créditos."
      );
    } finally {
      setCargandoCreditos(false);
    }
  }

  async function cargarPagos() {
    setCargandoPagos(true);
    setError("");

    try {
      const datos = await obtenerPagos();
      setPagos(datos);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar los pagos."
      );
    } finally {
      setCargandoPagos(false);
    }
  }

  // =====================================
  // CLIENTES
  // =====================================

  function limpiarFormulario() {
    setFormulario({
      nombres: "",
      apellidos: "",
      cedula: "",
      telefono: "",
    });

    setClienteEditando(null);
    setMostrarFormulario(false);
  }

  function iniciarEdicion(cliente: Cliente) {
    setFormulario({
      nombres: cliente.nombres,
      apellidos: cliente.apellidos,
      cedula: cliente.cedula,
      telefono: cliente.telefono || "",
    });

    setClienteEditando(cliente.cedula);
    setMostrarFormulario(true);
    setError("");
    setMensaje("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function iniciarNuevoCliente() {
    if (mostrarFormulario) {
      limpiarFormulario();
    } else {
      setFormulario({
        nombres: "",
        apellidos: "",
        cedula: "",
        telefono: "",
      });

      setClienteEditando(null);
      setMostrarFormulario(true);
    }

    setError("");
    setMensaje("");
  }

  async function guardarCliente(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setGuardando(true);
    setError("");
    setMensaje("");

    const datos = {
      nombres: formulario.nombres.trim(),
      apellidos: formulario.apellidos.trim(),
      cedula: formulario.cedula.trim(),
      telefono: formulario.telefono.trim() || undefined,
    };

    try {
      if (clienteEditando) {
        await actualizarCliente(clienteEditando, datos);
        setMensaje("Cliente actualizado correctamente.");
      } else {
        await crearCliente(datos);
        setMensaje("Cliente registrado correctamente.");
      }

      limpiarFormulario();
      await cargarClientes();
      await cargarResumen();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo guardar el cliente."
      );
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEstadoCliente(cliente: Cliente) {
    const estaActivo =
      (cliente.estado || "activo").toLowerCase() === "activo";

    const accion = estaActivo ? "desactivar" : "reactivar";

    const confirmado = window.confirm(
      `¿Estás seguro de que deseas ${accion} a ${cliente.nombres} ${cliente.apellidos}?`
    );

    if (!confirmado) return;

    setProcesandoCliente(cliente.id);
    setError("");
    setMensaje("");

    try {
      if (estaActivo) {
        await desactivarCliente(cliente.cedula);
        setMensaje("Cliente desactivado correctamente.");
      } else {
        await reactivarCliente(cliente.cedula);
        setMensaje("Cliente reactivado correctamente.");
      }

      await cargarClientes();
      await cargarResumen();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo cambiar el estado del cliente."
      );
    } finally {
      setProcesandoCliente(null);
    }
  }

  // =====================================
  // CRÉDITOS
  // =====================================

  async function guardarCredito(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setGuardandoCredito(true);
    setError("");
    setMensaje("");

    try {
      await crearCredito({
        cliente_id: Number(formularioCredito.cliente_id),
        monto: Number(formularioCredito.monto),
        tasa_interes: Number(formularioCredito.tasa_interes),
        plazo_meses: Number(formularioCredito.plazo_meses),
        fecha_inicio: formularioCredito.fecha_inicio,
        fecha_vencimiento: formularioCredito.fecha_vencimiento,
      });

      setMensaje("Crédito registrado correctamente.");

      setFormularioCredito({
        cliente_id: "",
        monto: "",
        tasa_interes: "2",
        plazo_meses: "3",
        fecha_inicio: fechaActualLocal(),
        fecha_vencimiento: "",
      });

      setMostrarFormularioCredito(false);

      await cargarCreditos();
      await cargarResumen();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo registrar el crédito."
      );
    } finally {
      setGuardandoCredito(false);
    }
  }

  // =====================================
  // PAGOS
  // =====================================

  async function guardarPago(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setMensaje("");

    const creditoSeleccionado = creditos.find(
      (credito) => credito.id === Number(formularioPago.credito_id)
    );

    if (!creditoSeleccionado) {
      setError("Debes seleccionar un crédito.");
      return;
    }

    const monto = Number(formularioPago.monto);

    if (monto <= 0) {
      setError("El monto del pago debe ser mayor que cero.");
      return;
    }

    if (monto > creditoSeleccionado.saldo_pendiente) {
      setError(
        `El pago no puede superar el saldo pendiente de ${formatoMoneda(
          creditoSeleccionado.saldo_pendiente
        )}.`
      );
      return;
    }

    setGuardandoPago(true);

    try {
      await crearPago({
        credito_id: Number(formularioPago.credito_id),
        monto,
        fecha_pago: formularioPago.fecha_pago,
        metodo_pago: formularioPago.metodo_pago,
        observacion: formularioPago.observacion.trim() || undefined,
      });

      setMensaje("¡Pago registrado correctamente!");

      setFormularioPago({
        credito_id: "",
        monto: "",
        fecha_pago: fechaActualLocal(),
        metodo_pago: "efectivo",
        observacion: "",
      });

      await Promise.all([
        cargarPagos(),
        cargarCreditos(),
        cargarResumen(),
      ]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo registrar el pago."
      );
    } finally {
      setGuardandoPago(false);
    }
  }

  // =====================================
  // FILTROS Y CÁLCULOS
  // =====================================

  const clientesFiltrados = clientes.filter((cliente) => {
    const texto = busqueda.toLowerCase();

    return (
      `${cliente.nombres} ${cliente.apellidos}`
        .toLowerCase()
        .includes(texto) ||
      cliente.cedula.toLowerCase().includes(texto)
    );
  });

  const creditosDisponibles = creditos.filter(
    (credito) =>
      credito.saldo_pendiente > 0 &&
      ["activo", "vencido"].includes((credito.estado || "").toLowerCase())
  );

  const creditoSeleccionado = creditos.find(
    (credito) => credito.id === Number(formularioPago.credito_id)
  );

  const pagosFiltrados = pagos
    .filter(
      (pago) =>
        filtroHistorial === "todos" ||
        String(pago.credito_id) === filtroHistorial
    )
    .slice()
    .sort((a, b) => b.fecha_pago.localeCompare(a.fecha_pago));

  const totalPagos = pagos.reduce((total, pago) => total + pago.monto, 0);

  const pagosReporte = pagos
    .filter((pago) => !fechaDesde || pago.fecha_pago >= fechaDesde)
    .filter((pago) => !fechaHasta || pago.fecha_pago <= fechaHasta)
    .filter(
      (pago) =>
        metodoReporte === "todos" ||
        pago.metodo_pago.toLowerCase() === metodoReporte
    )
    .slice()
    .sort((a, b) => b.fecha_pago.localeCompare(a.fecha_pago));

  const totalRecaudadoReporte = pagosReporte.reduce(
    (total, pago) => total + pago.monto,
    0
  );

  const currentPage = menu.find((item) => item.id === active);

  function nombreClientePorCredito(creditoId: number) {
    const credito = creditos.find((item) => item.id === creditoId);
    const cliente = clientes.find(
      (item) => item.id === credito?.cliente_id
    );

    return cliente
      ? `${cliente.nombres} ${cliente.apellidos}`
      : `Crédito #${creditoId}`;
  }

  // =====================================
  // PANTALLA DE VERIFICACIÓN
  // =====================================

  if (verificandoSesion) {
    return (
      <div style={estilos.pantallaAcceso}>
        <div style={estilos.tarjetaAcceso}>
          <div style={estilos.logoAcceso}>C</div>
          <h2 style={estilos.tituloAcceso}>CreditoApp</h2>
          <p style={estilos.subtituloAcceso}>Verificando sesión...</p>
        </div>
      </div>
    );
  }

  // =====================================
  // PANTALLA DE INICIO DE SESIÓN
  // =====================================

  if (!usuario) {
    return (
      <div style={estilos.pantallaAcceso}>
        <form
          style={estilos.tarjetaAcceso}
          onSubmit={manejarInicioSesion}
        >
          <div style={estilos.logoAcceso}>C</div>

          <h1 style={estilos.tituloAcceso}>CreditoApp</h1>
          <p style={estilos.subtituloAcceso}>MINIMERCADO</p>

          <div style={estilos.separadorAcceso} />

          <h2 style={estilos.tituloFormularioAcceso}>
            Iniciar sesión
          </h2>

          <p style={estilos.descripcionAcceso}>
            Ingresa tus credenciales para acceder al sistema.
          </p>

          {errorLogin && (
            <div style={estilos.errorAcceso}>{errorLogin}</div>
          )}

          <label style={estilos.labelAcceso}>
            Usuario
            <input
              style={estilos.inputAcceso}
              type="text"
              required
              autoComplete="username"
              value={usuarioLogin}
              onChange={(e) => setUsuarioLogin(e.target.value)}
              placeholder="Ingresa tu usuario"
            />
          </label>

          <label style={estilos.labelAcceso}>
            Contraseña
            <input
              style={estilos.inputAcceso}
              type="password"
              required
              autoComplete="current-password"
              value={passwordLogin}
              onChange={(e) => setPasswordLogin(e.target.value)}
              placeholder="Ingresa tu contraseña"
            />
          </label>

          <button
            type="submit"
            disabled={cargandoLogin}
            style={{
              ...estilos.botonAcceso,
              opacity: cargandoLogin ? 0.7 : 1,
            }}
          >
            {cargandoLogin ? "Ingresando..." : "Ingresar al sistema"}
          </button>

          <p style={estilos.pieAcceso}>
            Sistema de gestión de clientes y créditos
          </p>
        </form>
      </div>
    );
  }

  // =====================================
  // INTERFAZ PRINCIPAL
  // =====================================

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">C</div>
          <div>
            <h2>CreditoApp</h2>
            <span>MINIMERCADO</span>
          </div>
        </div>

        <p className="menu-title">MENÚ PRINCIPAL</p>

        <nav>
          {menuPermitido.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${active === item.id ? "active" : ""}`}
              onClick={() => {
                setActive(item.id);
                setError("");
                setMensaje("");
              }}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="user-avatar">
            {usuario.nombre.substring(0, 2).toUpperCase()}
          </div>

          <div style={{ minWidth: 0 }}>
            <strong>{usuario.nombre}</strong>
            <span>{nombreRol(usuario.rol)}</span>
          </div>

          <button
            type="button"
            onClick={manejarCerrarSesion}
            title="Cerrar sesión"
            style={estilos.botonCerrarSesion}
          >
            ↪
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h1>{currentPage?.label}</h1>
            <p>Bienvenido al sistema de gestión de créditos</p>
          </div>

          <div className="topbar-right">
            <span className="status-dot"></span>
            Sistema conectado
          </div>
        </header>

        {/* =====================================
            DASHBOARD
        ===================================== */}

        {active === "dashboard" && (
          <>
            <section className="welcome">
              <div>
                <h2>¡Bienvenido a CreditoApp!</h2>
                <p>
                  Administra tus clientes, créditos y pagos desde un solo lugar.
                </p>
              </div>
              <div className="welcome-icon">📊</div>
            </section>

            {error && <p className="error-message">{error}</p>}

            <section className="stats">
              <div className="stat-card">
                <div className="stat-icon blue">♙</div>
                <p>Clientes registrados</p>
                <h2>{resumen ? resumen.total_clientes : "..."}</h2>
                <span>Clientes en el sistema</span>
              </div>

              <div className="stat-card">
                <div className="stat-icon purple">▤</div>
                <p>Créditos activos</p>
                <h2>{resumen ? resumen.creditos_activos : "..."}</h2>
                <span>Créditos pendientes</span>
              </div>

              <div className="stat-card">
                <div className="stat-icon green">$</div>
                <p>Pagos recibidos</p>
                <h2>
                  {resumen ? formatoMoneda(resumen.total_recaudado) : "..."}
                </h2>
                <span>Total recaudado</span>
              </div>

              <div className="stat-card">
                <div className="stat-icon orange">◷</div>
                <p>Saldo pendiente</p>
                <h2>
                  {resumen ? formatoMoneda(resumen.saldo_pendiente) : "..."}
                </h2>
                <span>Cartera por recuperar</span>
              </div>
            </section>

            <section className="content-card">
              <div className="card-heading">
                <div>
                  <h3>Movimientos recientes</h3>
                  <p>Actividad registrada en el sistema</p>
                </div>
              </div>

              <div className="empty-state">
                <div>📋</div>
                <h3>Consulta los pagos desde el módulo de Pagos</h3>
                <p>
                  Allí encontrarás el historial de abonos registrados.
                </p>
              </div>
            </section>
          </>
        )}

        {/* =====================================
            CLIENTES
        ===================================== */}

        {active === "clientes" && (
          <section className="content-card customers-card">
            <div className="customers-heading">
              <div>
                <h2>Gestión de clientes</h2>
                <p>Consulta y administra los clientes del minimercado.</p>
              </div>

              {puedeGestionar && (
                <button
                  className="primary-button"
                  onClick={iniciarNuevoCliente}
                >
                  {mostrarFormulario ? "Cancelar" : "+ Nuevo cliente"}
                </button>
              )}
            </div>

            {error && <p className="error-message">{error}</p>}
            {mensaje && <p className="success-message">{mensaje}</p>}

            {puedeGestionar && mostrarFormulario && (
              <form className="customer-form" onSubmit={guardarCliente}>
                <h3>
                  {clienteEditando
                    ? "Editar información del cliente"
                    : "Registrar nuevo cliente"}
                </h3>

                <div className="form-grid">
                  <label>
                    Nombres *
                    <input
                      required
                      minLength={2}
                      maxLength={100}
                      value={formulario.nombres}
                      onChange={(e) =>
                        setFormulario({
                          ...formulario,
                          nombres: e.target.value,
                        })
                      }
                      placeholder="Ej. Carlos"
                    />
                  </label>

                  <label>
                    Apellidos *
                    <input
                      required
                      minLength={2}
                      maxLength={100}
                      value={formulario.apellidos}
                      onChange={(e) =>
                        setFormulario({
                          ...formulario,
                          apellidos: e.target.value,
                        })
                      }
                      placeholder="Ej. Ramírez"
                    />
                  </label>

                  <label>
                    Cédula *
                    <input
                      required
                      minLength={5}
                      maxLength={20}
                      value={formulario.cedula}
                      onChange={(e) =>
                        setFormulario({
                          ...formulario,
                          cedula: e.target.value,
                        })
                      }
                      placeholder="Número de identificación"
                    />
                  </label>

                  <label>
                    Teléfono
                    <input
                      maxLength={20}
                      value={formulario.telefono}
                      onChange={(e) =>
                        setFormulario({
                          ...formulario,
                          telefono: e.target.value,
                        })
                      }
                      placeholder="Ej. 3001234567"
                    />
                  </label>
                </div>

                <div className="form-actions">
                  <button
                    className="primary-button"
                    type="submit"
                    disabled={guardando}
                  >
                    {guardando
                      ? "Guardando..."
                      : clienteEditando
                        ? "Guardar cambios"
                        : "Guardar cliente"}
                  </button>

                  <button
                    className="secondary-button"
                    type="button"
                    onClick={limpiarFormulario}
                    disabled={guardando}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            <div className="customer-toolbar">
              <input
                className="search-input"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre o cédula..."
              />

              <button
                className="secondary-button"
                onClick={cargarClientes}
                disabled={cargandoClientes}
              >
                {cargandoClientes ? "Actualizando..." : "Actualizar"}
              </button>
            </div>

            <div className="table-container">
              <table className="customers-table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Cédula</th>
                    <th>Teléfono</th>
                    <th>Estado</th>
                    <th>Identificador</th>
                    {puedeGestionar && <th>Acciones</th>}
                  </tr>
                </thead>

                <tbody>
                  {cargandoClientes ? (
                    <tr>
                      <td colSpan={puedeGestionar ? 6 : 5} className="table-message">
                        Cargando clientes...
                      </td>
                    </tr>
                  ) : clientesFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={puedeGestionar ? 6 : 5} className="table-message">
                        No se encontraron clientes.
                      </td>
                    </tr>
                  ) : (
                    clientesFiltrados.map((cliente) => {
                      const estaActivo =
                        (cliente.estado || "activo").toLowerCase() === "activo";

                      return (
                        <tr key={cliente.id}>
                          <td>
                            <strong>
                              {cliente.nombres} {cliente.apellidos}
                            </strong>
                          </td>

                          <td>{cliente.cedula}</td>
                          <td>{cliente.telefono || "No registrado"}</td>

                          <td>
                            <span
                              className={`status-pill ${
                                estaActivo ? "status-active" : "status-inactive"
                              }`}
                            >
                              {estaActivo ? "Activo" : "Inactivo"}
                            </span>
                          </td>

                          <td>#{cliente.id}</td>

                          {puedeGestionar && (
                            <td>
                              <div className="customer-actions">
                                <button
                                  className="action-button edit-button"
                                  onClick={() => iniciarEdicion(cliente)}
                                  disabled={
                                    procesandoCliente !== null || guardando
                                  }
                                >
                                  Editar
                                </button>

                                <button
                                  className={`action-button ${
                                    estaActivo
                                      ? "deactivate-button"
                                      : "reactivate-button"
                                  }`}
                                  onClick={() => cambiarEstadoCliente(cliente)}
                                  disabled={
                                    procesandoCliente === cliente.id || guardando
                                  }
                                >
                                  {procesandoCliente === cliente.id
                                    ? "Procesando..."
                                    : estaActivo
                                      ? "Desactivar"
                                      : "Reactivar"}
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <p className="table-count">
              Mostrando {clientesFiltrados.length} de {clientes.length} clientes
            </p>
          </section>
        )}

        {/* =====================================
            CRÉDITOS
        ===================================== */}

        {active === "creditos" && (
          <section className="content-card customers-card">
            <div className="customers-heading">
              <div>
                <h2>Gestión de créditos</h2>
                <p>Registra y consulta los créditos de tus clientes.</p>
              </div>

              {puedeGestionar && (
                <button
                  className="primary-button"
                  onClick={() => {
                    setMostrarFormularioCredito(!mostrarFormularioCredito);
                    setError("");
                    setMensaje("");
                  }}
                >
                  {mostrarFormularioCredito ? "Cancelar" : "+ Nuevo crédito"}
                </button>
              )}
            </div>

            {error && <p className="error-message">{error}</p>}
            {mensaje && <p className="success-message">{mensaje}</p>}

            {puedeGestionar && mostrarFormularioCredito && (
              <form className="customer-form" onSubmit={guardarCredito}>
                <h3>Registrar nuevo crédito</h3>

                <div className="form-grid">
                  <label>
                    Cliente *
                    <select
                      required
                      value={formularioCredito.cliente_id}
                      onChange={(e) =>
                        setFormularioCredito({
                          ...formularioCredito,
                          cliente_id: e.target.value,
                        })
                      }
                    >
                      <option value="">Seleccionar cliente</option>

                      {clientes
                        .filter(
                          (cliente) =>
                            (cliente.estado || "activo").toLowerCase() ===
                            "activo"
                        )
                        .map((cliente) => (
                          <option key={cliente.id} value={cliente.id}>
                            {cliente.nombres} {cliente.apellidos} -{" "}
                            {cliente.cedula}
                          </option>
                        ))}
                    </select>
                  </label>

                  <label>
                    Monto del crédito *
                    <input
                      type="number"
                      required
                      min="1"
                      step="1"
                      value={formularioCredito.monto}
                      onChange={(e) =>
                        setFormularioCredito({
                          ...formularioCredito,
                          monto: e.target.value,
                        })
                      }
                      placeholder="Ej. 500000"
                    />
                  </label>

                  <label>
                    Tasa de interés mensual (%) *
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formularioCredito.tasa_interes}
                      onChange={(e) =>
                        setFormularioCredito({
                          ...formularioCredito,
                          tasa_interes: e.target.value,
                        })
                      }
                    />
                  </label>

                  <label>
                    Plazo (meses) *
                    <input
                      type="number"
                      required
                      min="1"
                      step="1"
                      value={formularioCredito.plazo_meses}
                      onChange={(e) =>
                        setFormularioCredito({
                          ...formularioCredito,
                          plazo_meses: e.target.value,
                        })
                      }
                    />
                  </label>

                  <label>
                    Fecha de inicio *
                    <input
                      type="date"
                      required
                      value={formularioCredito.fecha_inicio}
                      onChange={(e) =>
                        setFormularioCredito({
                          ...formularioCredito,
                          fecha_inicio: e.target.value,
                        })
                      }
                    />
                  </label>

                  <label>
                    Fecha de vencimiento *
                    <input
                      type="date"
                      required
                      min={formularioCredito.fecha_inicio}
                      value={formularioCredito.fecha_vencimiento}
                      onChange={(e) =>
                        setFormularioCredito({
                          ...formularioCredito,
                          fecha_vencimiento: e.target.value,
                        })
                      }
                    />
                  </label>
                </div>

                <div className="form-actions">
                  <button
                    className="primary-button"
                    type="submit"
                    disabled={guardandoCredito}
                  >
                    {guardandoCredito
                      ? "Registrando..."
                      : "Registrar crédito"}
                  </button>

                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => setMostrarFormularioCredito(false)}
                    disabled={guardandoCredito}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            <div className="customer-toolbar">
              <h3>Créditos registrados</h3>

              <button
                className="secondary-button"
                onClick={cargarCreditos}
                disabled={cargandoCreditos}
              >
                {cargandoCreditos ? "Actualizando..." : "Actualizar"}
              </button>
            </div>

            <div className="table-container">
              <table className="customers-table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Monto</th>
                    <th>Interés</th>
                    <th>Total a pagar</th>
                    <th>Saldo pendiente</th>
                    <th>Vencimiento</th>
                    <th>Estado</th>
                  </tr>
                </thead>

                <tbody>
                  {cargandoCreditos ? (
                    <tr>
                      <td colSpan={7} className="table-message">
                        Cargando créditos...
                      </td>
                    </tr>
                  ) : creditos.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="table-message">
                        Todavía no hay créditos registrados.
                      </td>
                    </tr>
                  ) : (
                    creditos.map((credito) => {
                      const cliente = clientes.find(
                        (item) => item.id === credito.cliente_id
                      );

                      const estado = (credito.estado || "").toLowerCase();

                      return (
                        <tr key={credito.id}>
                          <td>
                            <strong>
                              {cliente
                                ? `${cliente.nombres} ${cliente.apellidos}`
                                : `Cliente #${credito.cliente_id}`}
                            </strong>
                          </td>

                          <td>{formatoMoneda(credito.monto)}</td>
                          <td>{credito.tasa_interes}%</td>
                          <td>{formatoMoneda(credito.total_pagar)}</td>
                          <td>{formatoMoneda(credito.saldo_pendiente)}</td>

                          <td>
                            {new Date(
                              `${credito.fecha_vencimiento}T00:00:00`
                            ).toLocaleDateString("es-CO")}
                          </td>

                          <td>
                            <span
                              className={`status-pill ${
                                estado === "activo"
                                  ? "status-active"
                                  : estado === "vencido"
                                    ? "status-overdue"
                                    : "status-inactive"
                              }`}
                            >
                              {credito.estado}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <p className="table-count">
              Total de créditos: {creditos.length}
            </p>
          </section>
        )}

        {/* =====================================
            PAGOS
        ===================================== */}

        {active === "pagos" && (
          <section className="content-card customers-card">
            <div className="customers-heading">
              <div>
                <h2>Gestión de pagos</h2>
                <p>
                  Registra abonos y consulta los pagos realizados por tus
                  clientes.
                </p>
              </div>

              <button
                className="secondary-button"
                onClick={() => {
                  void cargarPagos();
                  void cargarCreditos();
                  void cargarResumen();
                }}
                disabled={cargandoPagos || cargandoCreditos}
              >
                Actualizar información
              </button>
            </div>

            {error && <p className="error-message">{error}</p>}
            {mensaje && <p className="success-message">{mensaje}</p>}

            <section className="stats">
              <div className="stat-card">
                <div className="stat-icon green">$</div>
                <p>Total de pagos registrados</p>
                <h2>{pagos.length}</h2>
                <span>Transacciones registradas</span>
              </div>

              <div className="stat-card">
                <div className="stat-icon blue">▤</div>
                <p>Dinero recibido</p>
                <h2>{formatoMoneda(totalPagos)}</h2>
                <span>Suma de los abonos registrados</span>
              </div>

              <div className="stat-card">
                <div className="stat-icon orange">◷</div>
                <p>Créditos con saldo</p>
                <h2>{creditosDisponibles.length}</h2>
                <span>Créditos que pueden recibir abonos</span>
              </div>
            </section>

            {puedeGestionar && (
              <form className="customer-form" onSubmit={guardarPago}>
                <h3>Registrar nuevo pago</h3>

                <div className="form-grid">
                  <label>
                    Crédito / Cliente *
                    <select
                      required
                      value={formularioPago.credito_id}
                      onChange={(e) =>
                        setFormularioPago({
                          ...formularioPago,
                          credito_id: e.target.value,
                          monto: "",
                        })
                      }
                    >
                      <option value="">Seleccionar crédito</option>

                      {creditosDisponibles.map((credito) => {
                        const cliente = clientes.find(
                          (item) => item.id === credito.cliente_id
                        );

                        return (
                          <option key={credito.id} value={credito.id}>
                            Crédito #{credito.id} —{" "}
                            {cliente
                              ? `${cliente.nombres} ${cliente.apellidos}`
                              : `Cliente #${credito.cliente_id}`}{" "}
                            — Saldo: {formatoMoneda(credito.saldo_pendiente)}
                          </option>
                        );
                      })}
                    </select>
                  </label>

                  <label>
                    Monto del abono *
                    <input
                      type="number"
                      required
                      min="1"
                      step="1"
                      max={creditoSeleccionado?.saldo_pendiente}
                      value={formularioPago.monto}
                      onChange={(e) =>
                        setFormularioPago({
                          ...formularioPago,
                          monto: e.target.value,
                        })
                      }
                      placeholder="Ej. 50000"
                    />
                  </label>

                  <label>
                    Fecha del pago *
                    <input
                      type="date"
                      required
                      max={fechaActualLocal()}
                      value={formularioPago.fecha_pago}
                      onChange={(e) =>
                        setFormularioPago({
                          ...formularioPago,
                          fecha_pago: e.target.value,
                        })
                      }
                    />
                  </label>

                  <label>
                    Método de pago *
                    <select
                      required
                      value={formularioPago.metodo_pago}
                      onChange={(e) =>
                        setFormularioPago({
                          ...formularioPago,
                          metodo_pago: e.target.value,
                        })
                      }
                    >
                      <option value="efectivo">Efectivo</option>
                      <option value="transferencia">Transferencia</option>
                      <option value="tarjeta">Tarjeta</option>
                    </select>
                  </label>

                  <label>
                    Observación
                    <input
                      maxLength={250}
                      value={formularioPago.observacion}
                      onChange={(e) =>
                        setFormularioPago({
                          ...formularioPago,
                          observacion: e.target.value,
                        })
                      }
                      placeholder="Detalle opcional del pago"
                    />
                  </label>
                </div>

                {creditoSeleccionado && (
                  <div className="success-message">
                    Saldo pendiente del crédito seleccionado:{" "}
                    <strong>
                      {formatoMoneda(creditoSeleccionado.saldo_pendiente)}
                    </strong>
                  </div>
                )}

                <div className="form-actions">
                  <button
                    className="primary-button"
                    type="submit"
                    disabled={guardandoPago || creditosDisponibles.length === 0}
                  >
                    {guardandoPago ? "Registrando..." : "Registrar pago"}
                  </button>

                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() =>
                      setFormularioPago({
                        credito_id: "",
                        monto: "",
                        fecha_pago: fechaActualLocal(),
                        metodo_pago: "efectivo",
                        observacion: "",
                      })
                    }
                    disabled={guardandoPago}
                  >
                    Limpiar
                  </button>
                </div>

                {creditosDisponibles.length === 0 && (
                  <p className="table-message">
                    No hay créditos pendientes que puedan recibir pagos.
                  </p>
                )}
              </form>
            )}

            {!puedeGestionar && (
              <p className="success-message">
                Tu perfil tiene permisos de consulta. No puedes registrar pagos.
              </p>
            )}

            <div className="customer-toolbar">
              <div>
                <h3>Historial de pagos</h3>
                <p>Consulta los abonos registrados en el sistema.</p>
              </div>

              <select
                value={filtroHistorial}
                onChange={(e) => setFiltroHistorial(e.target.value)}
              >
                <option value="todos">Todos los créditos</option>
                {creditos.map((credito) => (
                  <option key={credito.id} value={String(credito.id)}>
                    Crédito #{credito.id}
                  </option>
                ))}
              </select>
            </div>

            <div className="table-container">
              <table className="customers-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Cliente</th>
                    <th>Crédito</th>
                    <th>Monto pagado</th>
                    <th>Método de pago</th>
                    <th>Observación</th>
                  </tr>
                </thead>

                <tbody>
                  {cargandoPagos ? (
                    <tr>
                      <td colSpan={6} className="table-message">
                        Cargando historial de pagos...
                      </td>
                    </tr>
                  ) : pagosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="table-message">
                        No hay pagos registrados para esta consulta.
                      </td>
                    </tr>
                  ) : (
                    pagosFiltrados.map((pago) => (
                      <tr key={pago.id}>
                        <td>
                          {new Date(
                            `${pago.fecha_pago}T00:00:00`
                          ).toLocaleDateString("es-CO")}
                        </td>

                        <td>
                          <strong>
                            {nombreClientePorCredito(pago.credito_id)}
                          </strong>
                        </td>

                        <td>#{pago.credito_id}</td>
                        <td>{formatoMoneda(pago.monto)}</td>

                        <td>
                          <span className="status-pill status-active">
                            {pago.metodo_pago}
                          </span>
                        </td>

                        <td>{pago.observacion || "Sin observaciones"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <p className="table-count">
              Mostrando {pagosFiltrados.length} de {pagos.length} pagos
              registrados.
            </p>
          </section>
        )}

        {/* =====================================
            REPORTES
        ===================================== */}

        {active === "reportes" && puedeVerReportes && (
          <section className="content-card customers-card reports-card">
            <div className="customers-heading">
              <div>
                <h2>Reportes financieros</h2>
                <p>
                  Consulta el comportamiento de la cartera y los pagos
                  registrados en CreditoApp.
                </p>
              </div>

              <div className="report-actions">
                <button
                  className="secondary-button"
                  onClick={() => {
                    void cargarResumen();
                    void cargarClientes();
                    void cargarCreditos();
                    void cargarPagos();
                  }}
                  disabled={cargandoClientes || cargandoCreditos || cargandoPagos}
                >
                  Actualizar datos
                </button>

                <button
                  className="primary-button"
                  type="button"
                  onClick={() => window.print()}
                >
                  Imprimir / Guardar PDF
                </button>
              </div>
            </div>

            {error && <p className="error-message">{error}</p>}

            <h3 className="report-section-title">Resumen general</h3>

            <section className="stats report-stats">
              <div className="stat-card">
                <div className="stat-icon blue">♙</div>
                <p>Clientes activos</p>
                <h2>{resumen ? resumen.clientes_activos : "..."}</h2>
                <span>
                  {resumen
                    ? `${resumen.total_clientes} registrados en total`
                    : "Cargando"}
                </span>
              </div>

              <div className="stat-card">
                <div className="stat-icon purple">▤</div>
                <p>Créditos pendientes</p>
                <h2>
                  {resumen
                    ? resumen.creditos_activos + resumen.creditos_vencidos
                    : "..."}
                </h2>
                <span>
                  {resumen ? `${resumen.creditos_vencidos} vencidos` : "Cargando"}
                </span>
              </div>

              <div className="stat-card">
                <div className="stat-icon green">$</div>
                <p>Total recaudado</p>
                <h2>
                  {resumen ? formatoMoneda(resumen.total_recaudado) : "..."}
                </h2>
                <span>Abonos recibidos</span>
              </div>

              <div className="stat-card">
                <div className="stat-icon orange">◷</div>
                <p>Saldo por recuperar</p>
                <h2>
                  {resumen ? formatoMoneda(resumen.saldo_pendiente) : "..."}
                </h2>
                <span>Saldo pendiente de la cartera</span>
              </div>
            </section>

            <div className="report-detail-grid">
              <div className="report-detail-card">
                <span>Capital prestado</span>
                <strong>
                  {resumen ? formatoMoneda(resumen.total_prestado) : "..."}
                </strong>
              </div>

              <div className="report-detail-card">
                <span>Créditos pagados</span>
                <strong>{resumen ? resumen.creditos_pagados : "..."}</strong>
              </div>

              <div className="report-detail-card">
                <span>Total de créditos</span>
                <strong>{resumen ? resumen.total_creditos : "..."}</strong>
              </div>

              <div className="report-detail-card">
                <span>Pagos registrados</span>
                <strong>{pagos.length}</strong>
              </div>
            </div>

            <div className="report-divider" />

            <div className="customers-heading report-history-heading">
              <div>
                <h3>Detalle de pagos</h3>
                <p>Filtra los movimientos por periodo y método de pago.</p>
              </div>
            </div>

            <div className="report-filters">
              <label>
                Desde
                <input
                  type="date"
                  value={fechaDesde}
                  max={fechaHasta || undefined}
                  onChange={(e) => setFechaDesde(e.target.value)}
                />
              </label>

              <label>
                Hasta
                <input
                  type="date"
                  value={fechaHasta}
                  min={fechaDesde || undefined}
                  onChange={(e) => setFechaHasta(e.target.value)}
                />
              </label>

              <label>
                Método de pago
                <select
                  value={metodoReporte}
                  onChange={(e) => setMetodoReporte(e.target.value)}
                >
                  <option value="todos">Todos los métodos</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="tarjeta">Tarjeta</option>
                </select>
              </label>

              <button
                className="secondary-button"
                type="button"
                onClick={() => {
                  setFechaDesde("");
                  setFechaHasta("");
                  setMetodoReporte("todos");
                }}
              >
                Limpiar filtros
              </button>
            </div>

            <div className="report-total">
              <div>
                <span>Total recaudado en el periodo filtrado</span>
                <strong>{formatoMoneda(totalRecaudadoReporte)}</strong>
              </div>
              <span>{pagosReporte.length} movimientos</span>
            </div>

            <div className="table-container">
              <table className="customers-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Cliente</th>
                    <th>Crédito</th>
                    <th>Método</th>
                    <th>Valor recibido</th>
                    <th>Observación</th>
                  </tr>
                </thead>

                <tbody>
                  {cargandoPagos ? (
                    <tr>
                      <td colSpan={6} className="table-message">
                        Cargando información de pagos...
                      </td>
                    </tr>
                  ) : pagosReporte.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="table-message">
                        No hay pagos que coincidan con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    pagosReporte.map((pago) => (
                      <tr key={pago.id}>
                        <td>
                          {new Date(
                            `${pago.fecha_pago}T00:00:00`
                          ).toLocaleDateString("es-CO")}
                        </td>

                        <td>
                          <strong>
                            {nombreClientePorCredito(pago.credito_id)}
                          </strong>
                        </td>

                        <td>#{pago.credito_id}</td>

                        <td>
                          <span className="status-pill status-active">
                            {pago.metodo_pago}
                          </span>
                        </td>

                        <td>{formatoMoneda(pago.monto)}</td>
                        <td>{pago.observacion || "Sin observaciones"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <p className="table-count">
              Mostrando {pagosReporte.length} de {pagos.length} pagos registrados.
            </p>
          </section>
        )}

        {/* =====================================
            USUARIOS
        ===================================== */}

        {active === "usuarios" && esAdministrador && (
          <Usuarios />
        )}
      </main>
    </div>
  );
}

// =====================================
// ESTILOS DE INICIO DE SESIÓN
// =====================================

const estilos: Record<string, CSSProperties> = {
  pantallaAcceso: {
    minHeight: "100vh",
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    boxSizing: "border-box",
    background:
      "radial-gradient(circle at top left, #dceaff 0, transparent 38%), linear-gradient(135deg, #f4f7fc, #eaf0f8)",
    fontFamily: 'Inter, "Segoe UI", Arial, sans-serif',
  },

  tarjetaAcceso: {
    width: "100%",
    maxWidth: "430px",
    padding: "40px",
    boxSizing: "border-box",
    background: "#ffffff",
    border: "1px solid rgba(226, 232, 240, 0.9)",
    borderRadius: "20px",
    boxShadow: "0 18px 55px rgba(25, 48, 82, 0.12)",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },

  logoAcceso: {
    width: "66px",
    height: "66px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 3px",
    borderRadius: "18px",
    background: "linear-gradient(145deg, #4388ff, #2463d5)",
    color: "#ffffff",
    fontSize: "34px",
    fontWeight: 800,
    boxShadow: "0 8px 20px rgba(52, 120, 246, 0.28)",
  },

  tituloAcceso: {
    margin: 0,
    textAlign: "center",
    color: "#172b4d",
    fontSize: "30px",
    fontWeight: 800,
    letterSpacing: "-0.8px",
  },

  subtituloAcceso: {
    margin: "-12px 0 0",
    textAlign: "center",
    color: "#8291a7",
    fontSize: "10px",
    letterSpacing: "3px",
    fontWeight: 750,
  },

  separadorAcceso: {
    height: "1px",
    background: "#e8edf4",
    margin: "9px 0",
  },

  tituloFormularioAcceso: {
    margin: 0,
    color: "#1c2c43",
    fontSize: "22px",
    fontWeight: 750,
  },

  descripcionAcceso: {
    margin: "-8px 0 4px",
    color: "#8491a5",
    fontSize: "13px",
    lineHeight: 1.6,
  },

  labelAcceso: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    color: "#43536b",
    fontWeight: 650,
    fontSize: "13px",
  },

  inputAcceso: {
    width: "100%",
    padding: "14px",
    boxSizing: "border-box",
    border: "1px solid #dce4ef",
    borderRadius: "10px",
    outlineColor: "#3478f6",
    fontSize: "14px",
    color: "#26344a",
    background: "#ffffff",
  },

  botonAcceso: {
    border: "none",
    borderRadius: "10px",
    padding: "15px",
    marginTop: "7px",
    background: "linear-gradient(110deg, #3478f6, #2869df)",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: 750,
    cursor: "pointer",
    boxShadow: "0 6px 15px rgba(52, 120, 246, 0.2)",
  },

  errorAcceso: {
    padding: "12px",
    borderRadius: "9px",
    background: "#fff2f2",
    color: "#b93838",
    border: "1px solid #f5d0d0",
    fontSize: "12px",
    lineHeight: 1.5,
  },

  pieAcceso: {
    margin: "5px 0 0",
    textAlign: "center",
    color: "#9aa5b5",
    fontSize: "11px",
  },

  botonCerrarSesion: {
    marginLeft: "auto",
    flexShrink: 0,
    border: "none",
    borderRadius: "8px",
    background: "rgba(255,255,255,0.12)",
    color: "#ffffff",
    cursor: "pointer",
    fontSize: "20px",
    padding: "7px 10px",
    transition: "background 0.2s",
  },
};

export default App;
