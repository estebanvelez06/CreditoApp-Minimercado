
import { useEffect, useState } from "react";

import {
  obtenerUsuarios,
  crearUsuario,
  actualizarUsuario,
  desactivarUsuario,
  reactivarUsuario,
  cambiarPasswordUsuario,
  type Usuario,
  type RolUsuario,
  type UsuarioNuevo,
  type UsuarioActualizacion,
} from "./services/api";

function nombreDelRol(rol: RolUsuario) {
  const nombres: Record<RolUsuario, string> = {
    administrador: "Administrador",
    asesor: "Asesor",
    contador: "Contador",
  };

  return nombres[rol];
}

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [usuarioEditando, setUsuarioEditando] = useState<number | null>(null);
  const [usuarioPassword, setUsuarioPassword] = useState<Usuario | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const [nuevaPassword, setNuevaPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");

  const [formulario, setFormulario] = useState({
    nombre: "",
    username: "",
    password: "",
    rol: "asesor" as RolUsuario,
  });

  async function cargarUsuarios() {
    setCargando(true);
    setError("");

    try {
      const datos = await obtenerUsuarios();
      setUsuarios(datos);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar los usuarios."
      );
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    void cargarUsuarios();
  }, []);

  function limpiarFormulario() {
    setFormulario({
      nombre: "",
      username: "",
      password: "",
      rol: "asesor",
    });

    setUsuarioEditando(null);
    setMostrarFormulario(false);
  }

  function nuevoUsuario() {
    limpiarFormulario();
    setUsuarioPassword(null);
    setError("");
    setMensaje("");
    setMostrarFormulario(true);
  }

  function editarUsuario(usuario: Usuario) {
    setUsuarioPassword(null);

    setFormulario({
      nombre: usuario.nombre,
      username: usuario.username,
      password: "",
      rol: usuario.rol,
    });

    setUsuarioEditando(usuario.id);
    setMostrarFormulario(true);
    setError("");
    setMensaje("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function abrirCambioPassword(usuario: Usuario) {
    limpiarFormulario();
    setNuevaPassword("");
    setConfirmarPassword("");
    setUsuarioPassword(usuario);
    setError("");
    setMensaje("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function guardarUsuario(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setGuardando(true);
    setError("");
    setMensaje("");

    try {
      if (usuarioEditando !== null) {
        const datos: UsuarioActualizacion = {
          nombre: formulario.nombre.trim(),
          username: formulario.username.trim(),
          rol: formulario.rol,
        };

        await actualizarUsuario(usuarioEditando, datos);
        setMensaje("Usuario actualizado correctamente.");
      } else {
        const datos: UsuarioNuevo = {
          nombre: formulario.nombre.trim(),
          username: formulario.username.trim(),
          password: formulario.password,
          rol: formulario.rol,
        };

        await crearUsuario(datos);
        setMensaje("Usuario creado correctamente.");
      }

      limpiarFormulario();
      await cargarUsuarios();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo guardar el usuario."
      );
    } finally {
      setGuardando(false);
    }
  }

  async function guardarNuevaPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setMensaje("");

    if (nuevaPassword.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (nuevaPassword.length > 128) {
      setError("La contraseña no puede superar los 128 caracteres.");
      return;
    }

    if (nuevaPassword !== confirmarPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (!usuarioPassword) return;

    setGuardando(true);

    try {
      await cambiarPasswordUsuario(
        usuarioPassword.id,
        nuevaPassword
      );

      setMensaje(
        `Contraseña de ${usuarioPassword.nombre} actualizada correctamente.`
      );

      setUsuarioPassword(null);
      setNuevaPassword("");
      setConfirmarPassword("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo cambiar la contraseña."
      );
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEstado(usuario: Usuario) {
    const estaActivo = usuario.activo.toLowerCase() === "activo";
    const accion = estaActivo ? "desactivar" : "reactivar";

    const confirmado = window.confirm(
      `¿Estás seguro de que deseas ${accion} al usuario ${usuario.nombre}?`
    );

    if (!confirmado) return;

    setError("");
    setMensaje("");

    try {
      if (estaActivo) {
        await desactivarUsuario(usuario.id);
        setMensaje("Usuario desactivado correctamente.");
      } else {
        await reactivarUsuario(usuario.id);
        setMensaje("Usuario reactivado correctamente.");
      }

      await cargarUsuarios();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo cambiar el estado del usuario."
      );
    }
  }

  return (
    <section className="content-card customers-card">
      <div className="customers-heading">
        <div>
          <h2>Gestión de usuarios</h2>
          <p>
            Administra las cuentas y los permisos de acceso al sistema.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={() => {
            if (mostrarFormulario) {
              limpiarFormulario();
            } else {
              nuevoUsuario();
            }
          }}
        >
          {mostrarFormulario ? "Cerrar formulario" : "+ Nuevo usuario"}
        </button>
      </div>

      {error && <p className="error-message">{error}</p>}
      {mensaje && <p className="success-message">{mensaje}</p>}

      {mostrarFormulario && (
        <form className="customer-form" onSubmit={guardarUsuario}>
          <h3>
            {usuarioEditando !== null
              ? "Editar usuario"
              : "Registrar nuevo usuario"}
          </h3>

          <div className="form-grid">
            <label>
              Nombre completo *
              <input
                required
                minLength={2}
                maxLength={100}
                value={formulario.nombre}
                onChange={(e) =>
                  setFormulario({
                    ...formulario,
                    nombre: e.target.value,
                  })
                }
                placeholder="Ej. Carlos Ramírez"
              />
            </label>

            <label>
              Nombre de usuario *
              <input
                required
                minLength={4}
                maxLength={50}
                autoComplete="off"
                value={formulario.username}
                onChange={(e) =>
                  setFormulario({
                    ...formulario,
                    username: e.target.value,
                  })
                }
                placeholder="Ej. carlos"
              />
            </label>

            {usuarioEditando === null && (
              <label>
                Contraseña *
                <input
                  required
                  type="password"
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  value={formulario.password}
                  onChange={(e) =>
                    setFormulario({
                      ...formulario,
                      password: e.target.value,
                    })
                  }
                  placeholder="Mínimo 8 caracteres"
                />
              </label>
            )}

            <label>
              Rol del usuario *
              <select
                required
                value={formulario.rol}
                onChange={(e) =>
                  setFormulario({
                    ...formulario,
                    rol: e.target.value as RolUsuario,
                  })
                }
              >
                <option value="administrador">Administrador</option>
                <option value="asesor">Asesor</option>
                <option value="contador">Contador</option>
              </select>
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
                : usuarioEditando !== null
                  ? "Guardar cambios"
                  : "Crear usuario"}
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

      {usuarioPassword && (
        <form
          className="customer-form"
          onSubmit={guardarNuevaPassword}
        >
          <h3>Cambiar contraseña</h3>

          <p>
            Estás cambiando la contraseña de{" "}
            <strong>{usuarioPassword.nombre}</strong>.
          </p>

          <div className="form-grid">
            <label>
              Nueva contraseña *
              <input
                required
                type="password"
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
                value={nuevaPassword}
                onChange={(e) => setNuevaPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
              />
            </label>

            <label>
              Confirmar nueva contraseña *
              <input
                required
                type="password"
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
                value={confirmarPassword}
                onChange={(e) => setConfirmarPassword(e.target.value)}
                placeholder="Repite la contraseña"
              />
            </label>
          </div>

          <div className="form-actions">
            <button
              className="primary-button"
              type="submit"
              disabled={guardando}
            >
              {guardando ? "Actualizando..." : "Cambiar contraseña"}
            </button>

            <button
              className="secondary-button"
              type="button"
              disabled={guardando}
              onClick={() => {
                setUsuarioPassword(null);
                setNuevaPassword("");
                setConfirmarPassword("");
                setError("");
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="customer-toolbar">
        <div>
          <h3>Usuarios registrados</h3>
          <p>Listado de cuentas del sistema.</p>
        </div>

        <button
          className="secondary-button"
          onClick={() => void cargarUsuarios()}
          disabled={cargando}
        >
          {cargando ? "Actualizando..." : "Actualizar"}
        </button>
      </div>

      <div className="table-container">
        <table className="customers-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Usuario</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Identificador</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={6} className="table-message">
                  Cargando usuarios...
                </td>
              </tr>
            ) : usuarios.length === 0 ? (
              <tr>
                <td colSpan={6} className="table-message">
                  No hay usuarios registrados.
                </td>
              </tr>
            ) : (
              usuarios.map((usuario) => {
                const estaActivo =
                  usuario.activo.toLowerCase() === "activo";

                return (
                  <tr key={usuario.id}>
                    <td>
                      <strong>{usuario.nombre}</strong>
                    </td>

                    <td>{usuario.username}</td>

                    <td>{nombreDelRol(usuario.rol)}</td>

                    <td>
                      <span
                        className={`status-pill ${
                          estaActivo
                            ? "status-active"
                            : "status-inactive"
                        }`}
                      >
                        {estaActivo ? "Activo" : "Inactivo"}
                      </span>
                    </td>

                    <td>#{usuario.id}</td>

                    <td>
                      <div className="customer-actions">
                        <button
                          className="action-button edit-button"
                          onClick={() => editarUsuario(usuario)}
                          disabled={guardando}
                        >
                          Editar
                        </button>

                        <button
                          className="action-button edit-button"
                          onClick={() => abrirCambioPassword(usuario)}
                          disabled={guardando}
                        >
                          Cambiar contraseña
                        </button>

                        <button
                          className={`action-button ${
                            estaActivo
                              ? "deactivate-button"
                              : "reactivate-button"
                          }`}
                          onClick={() => void cambiarEstado(usuario)}
                          disabled={guardando}
                        >
                          {estaActivo ? "Desactivar" : "Reactivar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="table-count">
        Total de usuarios: {usuarios.length}
      </p>
    </section>
  );
}
