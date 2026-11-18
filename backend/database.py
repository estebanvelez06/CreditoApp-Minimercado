
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Archivo de nuestra base de datos
DATABASE_URL = "sqlite:///./creditoapp.db"

# Conexión con SQLite
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

# Sesiones para interactuar con la base de datos
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Clase base para nuestros modelos
Base = declarative_base()
