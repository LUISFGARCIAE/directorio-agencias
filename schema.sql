CREATE TABLE IF NOT EXISTS estado_sitio (
  clave TEXT PRIMARY KEY,
  contenido_json TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS solicitudes (
  id TEXT PRIMARY KEY,
  fecha TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'Pendiente',
  plan TEXT NOT NULL,
  metodo_pago TEXT NOT NULL,
  referencia_pago TEXT UNIQUE NOT NULL,
  monto REAL NOT NULL DEFAULT 0,
  negocio TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  datos_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admins (
  email TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  pass_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'editor',
  activo INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sesiones (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  rol TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS auditoria (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha TEXT NOT NULL,
  admin_email TEXT NOT NULL,
  accion TEXT NOT NULL,
  detalle TEXT NOT NULL
);