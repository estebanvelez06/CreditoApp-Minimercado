
from getpass import getpass

from database import Base, engine, SessionLocal
from models import Usuario
from security import get_password_hash

def crear_administrador():
    print("\n=== CREAR ADMINISTRADOR DE CREDITOAPP ===\n")

    nombre = input("Nombre completo [Administrador]: ").strip()
    if not nombre:
        nombre = "Administrador"

    username = input("Nombre de usuario [Admin]: ").strip()
    if not username:
        username = "Admin"

    if len(username) < 4:
        print("Error: el usuario debe tener al menos 4 caracteres.")
        return

    # Crear tablas que todavía no existan, sin borrar las existentes.
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        existente = db.query(Usuario).filter(
            Usuario.username == username
        ).first()

        if existente:
            print("\nEse nombre de usuario ya está registrado.")
            return

        password = getpass("Introduce una contraseña nueva: ")
        confirmar = getpass("Confirma la contraseña: ")

        if len(password) < 8 or len(password) > 128:
            print("\nLa contraseña debe tener entre 8 y 128 caracteres.")
            return

        if password != confirmar:
            print("\nLas contraseñas no coinciden.")
            return

        nuevo_usuario = Usuario(
            nombre=nombre,
            username=username,
            password_hash=get_password_hash(password),
            rol="administrador",
            activo="activo"
        )

        db.add(nuevo_usuario)
        db.commit()
        db.refresh(nuevo_usuario)

        print("\n¡Administrador creado correctamente!")
        print(f"Nombre: {nuevo_usuario.nombre}")
        print(f"Usuario: {nuevo_usuario.username}")
        print(f"Rol: {nuevo_usuario.rol}")
        print("\nLa contraseña no se muestra ni se almacena en texto plano.")

    except Exception as error:
        db.rollback()
        print(f"\nNo se pudo crear el administrador: {error}")

    finally:
        db.close()

if __name__ == "__main__":
    crear_administrador()