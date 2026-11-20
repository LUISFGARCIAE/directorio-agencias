export const CONFIG_BASE = {
  marca: "Guías Vayora",
  eslogan: "El mundo tiene más por descubrir",
  MODO_MULTISECTOR: false,
  apariencia: { paletaDefault: "caribe", temaDefault: "light" },
  hero: {
    badge: "🇲🇽 Guías Vayora • El mundo tiene más por descubrir",
    titulo: "Conecta directo con Especialistas en Viajes, Bodas y Experiencias",
    subtitulo: "Explora agencias de viajes, jardines para bodas, cabañas y servicios verificados en México sin intermediarios."
  },
  bannerPatrocinado: {
    visible: true,
    titulo: "¿Quieres destacar tu negocio en Guías Vayora?",
    descripcion: "Destaca tus promociones de temporada frente a miles de clientes buscando opciones en México.",
    textoBoton: "Reservar Banner",
    urlBoton: "pages/anunciate.html"
  },
  topBar: {
    visible: true,
    texto: "✨ Guías Vayora: El mundo tiene más por descubrir — promociones y experiencias verificadas en México",
    textoBoton: "Ver Ofertas",
    urlBoton: "#sec-ofertas"
  },
  whatsappConcierge: "525652415593",
  comercialB2B: {
    planEstandarPrecio: "$100 MXN",
    planEstandarNota: "/ mes",
    planDestacadoPrecio: "$499 MXN",
    planDestacadoNota: "/ mes",
    ofertaTemporadaPrecio: "$499 MXN / mes",
    bannerPatrocinadoPrecio: "$899 MXN / mes",
    tituloB2BPortada: "¿Tienes una Agencia, Jardín de Bodas, Quinta o Servicio?",
    subtituloB2BPortada: "Recibe clientes listos para reservar directo en tu WhatsApp, sin comisiones por venta.",
    planDestacadoPost: "Activación inmediata y prioridad en portada",
    correoAdmin: "directorioturistico.mx@gmail.com",
    whatsappAdmin: "525652415593"
  },
  pagosB2B: {
    mostrarModuloPagos: true,
    modoDemoVisual: false,
    checkoutAutoActivo: true,
    speiBanco: "Mercado Pago / STP",
    speiClabe: "0000 0000 0000 0000 00",
    speiBeneficiario: "Guías Vayora",
    mpLinkEstandar: "https://mpago.la/1nyBEsB",
    mpLinkDestacado: "https://mpago.la/1nyBEsB"
  },
  buzonNubeUrl: "/api/solicitudes"
};

export function jsonRes(obj, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: Object.assign({
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }, extraHeaders)
  });
}

export function limpiarTexto(val, maxLen = 400) {
  return String(val == null ? "" : val)
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, maxLen);
}

export function sanitizarProfundo(val, profundidad = 0) {
  if (profundidad > 8 || val == null) return val;
  if (typeof val === "string") {
    const limpio = val.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").replace(/<\s*\/?\s*script[^>]*>/gi, "").trim();
    return /^javascript:/i.test(limpio) ? "" : limpio;
  }
  if (Array.isArray(val)) return val.map(v => sanitizarProfundo(v, profundidad + 1));
  if (typeof val === "object") {
    const out = {};
    for (const [k, v] of Object.entries(val)) {
      if (k === "__proto__" || k === "constructor" || k === "prototype") continue;
      out[k] = sanitizarProfundo(v, profundidad + 1);
    }
    return out;
  }
  return val;
}

function bytesToHex(buf) {
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex) {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < arr.length; i++) arr[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return arr;
}

export function randomHex(bytesLen = 24) {
  const b = new Uint8Array(bytesLen);
  crypto.getRandomValues(b);
  return bytesToHex(b);
}

export async function sha256Hex(texto) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(texto)));
  return bytesToHex(digest);
}

export async function hashPassword(password, saltHex) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(String(password)), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: hexToBytes(saltHex), iterations: 100000, hash: "SHA-256" },
    key,
    256
  );
  return bytesToHex(bits);
}

export function timingSafeEqual(a, b) {
  const sa = String(a || "");
  const sb = String(b || "");
  if (sa.length !== sb.length) return false;
  let diff = 0;
  for (let i = 0; i < sa.length; i++) diff |= sa.charCodeAt(i) ^ sb.charCodeAt(i);
  return diff === 0;
}

export function getCookie(request, name) {
  const raw = request.headers.get("Cookie") || "";
  for (const part of raw.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return "";
}

export async function obtenerSesion(request, env) {
  const sid = getCookie(request, "vayora_sid");
  if (!sid || !env.DB) return null;
  const tokenHash = await sha256Hex(sid);
  const row = await env.DB.prepare(
    `SELECT s.email, s.rol, s.expires_at, a.nombre, a.activo
     FROM sesiones s JOIN admins a ON a.email = s.email
     WHERE s.token_hash = ?`
  ).bind(tokenHash).first();
  if (!row || row.activo !== 1 || Number(row.expires_at) < Date.now()) return null;
  return { email: row.email, nombre: row.nombre, rol: row.rol, tokenHash };
}

export async function auditar(env, email, accion, detalle) {
  if (!env.DB) return;
  await env.DB.prepare(
    "INSERT INTO auditoria (fecha, admin_email, accion, detalle) VALUES (?, ?, ?, ?)"
  ).bind(new Date().toISOString(), limpiarTexto(email, 100), limpiarTexto(accion, 60), limpiarTexto(detalle, 300)).run();
}

export async function leerEstado(env, clave, fallback) {
  const row = await env.DB.prepare("SELECT contenido_json FROM estado_sitio WHERE clave = ?").bind(clave).first();
  if (!row) return fallback;
  try { return JSON.parse(row.contenido_json); } catch { return fallback; }
}

export async function guardarEstado(env, clave, dataObj, email) {
  const limpio = sanitizarProfundo(dataObj);
  await env.DB.prepare(
    `INSERT INTO estado_sitio (clave, contenido_json, updated_by, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(clave) DO UPDATE SET contenido_json = excluded.contenido_json, updated_by = excluded.updated_by, updated_at = excluded.updated_at`
  ).bind(clave, JSON.stringify(limpio), email, new Date().toISOString()).run();
  return limpio;
}

export function extraerPrecioMXN(textoPrecio, defaultNum) {
  const n = parseFloat(String(textoPrecio || "").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : defaultNum;
}