import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FondoPagina from '../components/FondoPagina';
import { API_URL } from '../config';
import BACKEND_ORIGIN from '../config';

const resolverImagenUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${BACKEND_ORIGIN}${url}`;
};

const estilos = {
  contenedor: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '40px 20px',
    fontFamily: 'sans-serif',
  },
  pestañas: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    marginBottom: '20px',
  },
  pestaña: {
    padding: '10px 18px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
  },
  pestañaActiva: {
    backgroundColor: '#ccff00',
    color: '#12283d',
  },
  pestañaInactiva: {
    backgroundColor: 'rgba(18,40,61,0.6)',
    color: '#a9c9bb',
  },
  tarjeta: {
    background: 'rgba(18,40,61,0.8)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '10px',
    padding: '18px',
    marginBottom: '12px',
  },
  tabla: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
  },
  th: {
    textAlign: 'left',
    padding: '10px 8px',
    borderBottom: '1px solid rgba(255,255,255,0.2)',
    color: '#ccff00',
  },
  td: {
    padding: '10px 8px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    verticalAlign: 'top',
  },
  input: {
    width: '100%',
    padding: '8px',
    borderRadius: '6px',
    border: '1px solid rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.95)',
    color: '#12283d',
    marginBottom: '15px',
  },
  boton: {
    padding: '6px 12px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '12px',
  },
  aviso: {
    padding: '10px',
    borderRadius: '6px',
    marginBottom: '12px',
    color: '#ffb4b4',
    background: 'rgba(255,180,180,0.12)',
  },
};

function Resumen({ stats }) {
  const tarjetas = [
    { label: 'Usuarios', valor: stats?.totalUsuarios ?? '-', icono: '👤' },
    { label: 'Nuevos (7 días)', valor: stats?.usuariosNuevos7dias ?? '-', icono: '🆕' },
    { label: 'Locales', valor: stats?.totalLocales ?? '-', icono: '🏪' },
    { label: 'Publicaciones', valor: stats?.totalPublicaciones ?? '-', icono: '📝' },
    { label: 'Calificaciones', valor: stats?.totalCalificaciones ?? '-', icono: '⭐' },
    { label: 'Promedio', valor: stats ? Number(stats.promedioCalificaciones).toFixed(1) : '-', icono: '📊' },
    { label: 'Promociones', valor: stats?.totalPlanes ?? '-', icono: '🎉' },
  ];

  const rolLabels = { admin: 'Administradores', comerciante: 'Comerciantes', turista: 'Turistas' };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        {tarjetas.map((t) => (
          <div key={t.label} style={estilos.tarjeta}>
            <div style={{ fontSize: '26px' }}>{t.icono}</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', margin: '4px 0' }}>{t.valor}</div>
            <div style={{ color: '#a9c9bb', fontSize: '13px' }}>{t.label}</div>
          </div>
        ))}
      </div>

      {stats?.usuariosPorRol?.length > 0 && (
        <div style={estilos.tarjeta}>
          <h3 style={{ marginTop: 0 }}>Usuarios por rol</h3>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {stats.usuariosPorRol.map((r) => (
              <div key={r.rol} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '6px', padding: '10px 16px' }}>
                <strong>{rolLabels[r.rol] || r.rol}</strong>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ccff00' }}>{r.total}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Usuarios({ token }) {
  const [usuarios, setUsuarios] = useState([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [filtroRol, setFiltroRol] = useState('');
  const [pagina, setPagina] = useState(1);
  const [porPagina] = useState(20);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [cambiando, setCambiando] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    const params = new URLSearchParams({ pagina, porPagina });
    if (q.trim()) params.set('q', q.trim());
    if (filtroRol) params.set('rol', filtroRol);
    try {
      const res = await fetch(`${API_URL}/admin/usuarios?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar usuarios');
      setUsuarios(data.usuarios || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [token, q, filtroRol, pagina, porPagina]);

  useEffect(() => {
    const temporizador = setTimeout(cargar, 400);
    return () => clearTimeout(temporizador);
  }, [cargar]);

  const cambiarRol = async (id, rolActual) => {
    if (!window.confirm('¿Cambiar el rol de este usuario?')) return;
    const nuevoRol = rolActual === 'admin' ? 'comerciante' : 'admin';
    setCambiando(id);
    setError('');
    try {
      const res = await fetch(`${API_URL}/admin/usuarios/${id}/rol`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rol: nuevoRol }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cambiar rol');
      cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setCambiando(null);
    }
  };

  const eliminar = async (u) => {
    if (!window.confirm(`¿Eliminar a "${u.nombre}" (${u.email})? Se borrarán sus locales, publicaciones y calificaciones.`)) return;
    setCambiando(u.id_usuario);
    setError('');
    try {
      const res = await fetch(`${API_URL}/admin/usuarios/${u.id_usuario}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar usuario');
      cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setCambiando(null);
    }
  };

  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  return (
    <div>
      {error && <div style={estilos.aviso}>{error}</div>}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <input
          placeholder="Buscar por nombre o correo..."
          value={q}
          onChange={(e) => { setQ(e.target.value); setPagina(1); }}
          style={{ ...estilos.input, flex: 1, minWidth: '220px', marginBottom: '15px' }}
        />
        <select
          value={filtroRol}
          onChange={(e) => { setFiltroRol(e.target.value); setPagina(1); }}
          style={{ ...estilos.input, width: 'auto', marginBottom: '15px' }}
        >
          <option value="">Todos los roles</option>
          <option value="admin">Admin</option>
          <option value="comerciante">Comerciante</option>
          <option value="turista">Turista</option>
        </select>
      </div>

      <div style={estilos.tarjeta}>
        {cargando ? (
          <p>Cargando...</p>
        ) : usuarios.length === 0 ? (
          <p>No hay usuarios.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ ...estilos.tabla, minWidth: '640px' }}>
            <thead>
              <tr>
                <th style={estilos.th}>Usuario</th>
                <th style={estilos.th}>Rol</th>
                <th style={estilos.th}>Locales</th>
                <th style={estilos.th}>Publicaciones</th>
                <th style={estilos.th}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id_usuario}>
                  <td style={estilos.td}>
                    <strong>{u.nombre}</strong>
                    <div style={{ fontSize: '12px', color: '#a9c9bb' }}>{u.email}</div>
                    <div style={{ fontSize: '12px', color: '#8aa6a0' }}>
                      Registro: {new Date(u.fecha_registro).toLocaleDateString('es-CO')}
                    </div>
                  </td>
                  <td style={estilos.td}>
                    <span style={{
                      background: u.rol === 'admin' ? 'rgba(204,255,0,0.2)' : 'rgba(255,255,255,0.1)',
                      color: u.rol === 'admin' ? '#ccff00' : '#dce8e3',
                      padding: '3px 10px', borderRadius: '999px', fontSize: '12px',
                    }}>
                      {u.rol}
                    </span>
                  </td>
                  <td style={estilos.td}>{u.total_locales}</td>
                  <td style={estilos.td}>{u.total_publicaciones}</td>
                  <td style={estilos.td}>
                    <button
                      onClick={() => cambiarRol(u.id_usuario, u.rol)}
                      disabled={cambiando === u.id_usuario}
                      style={{ ...estilos.boton, background: '#2a6a94', color: 'white', marginRight: '6px' }}
                    >
                      {cambiando === u.id_usuario ? '...' : u.rol === 'admin' ? 'Quitar admin' : 'Hacer admin'}
                    </button>
                    <button
                      onClick={() => eliminar(u)}
                      disabled={cambiando === u.id_usuario}
                      style={{ ...estilos.boton, background: '#dc2626', color: 'white' }}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {totalPaginas > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
          <button onClick={() => setPagina(Math.max(1, pagina - 1))} disabled={pagina === 1} style={estilos.boton}>
            ← Anterior
          </button>
          <span>Página {pagina} de {totalPaginas}</span>
          <button onClick={() => setPagina(Math.min(totalPaginas, pagina + 1))} disabled={pagina === totalPaginas} style={estilos.boton}>
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}

function LocalesAdmin({ token }) {
  const [locales, setLocales] = useState([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [pagina, setPagina] = useState(1);
  const [porPagina] = useState(30);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [eliminando, setEliminando] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    const params = new URLSearchParams({ pagina, porPagina });
    if (q.trim()) params.set('q', q.trim());
    try {
      const res = await fetch(`${API_URL}/admin/locales?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar locales');
      setLocales(data.locales || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [token, q, pagina, porPagina]);

  useEffect(() => {
    const temporizador = setTimeout(cargar, 400);
    return () => clearTimeout(temporizador);
  }, [cargar]);

  const eliminar = async (l) => {
    if (!window.confirm(`¿Eliminar el local "${l.nombre}"? También se borran sus calificaciones y promociones.`)) return;
    setEliminando(l.id_local);
    setError('');
    try {
      const res = await fetch(`${API_URL}/locales/${l.id_local}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar local');
      cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setEliminando(null);
    }
  };

  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  return (
    <div>
      {error && <div style={estilos.aviso}>{error}</div>}
      <input
        placeholder="Buscar local por nombre..."
        value={q}
        onChange={(e) => { setQ(e.target.value); setPagina(1); }}
        style={estilos.input}
      />
      <div style={estilos.tarjeta}>
        {cargando ? (
          <p>Cargando...</p>
        ) : locales.length === 0 ? (
          <p>No hay locales.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ ...estilos.tabla, minWidth: '760px' }}>
            <thead>
              <tr>
                <th style={estilos.th}>Local</th>
                <th style={estilos.th}>Ubicación</th>
                <th style={estilos.th}>Propietario</th>
                <th style={estilos.th}>Estrellas</th>
                <th style={estilos.th}>Promociones</th>
                <th style={estilos.th}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {locales.map((l) => (
                <tr key={l.id_local}>
                  <td style={estilos.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {l.imagen_url ? (
                        <img
                          src={resolverImagenUrl(l.imagen_url)}
                          alt={l.nombre}
                          style={{ width: '42px', height: '42px', borderRadius: '6px', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{ width: '42px', height: '42px', borderRadius: '6px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🏪</div>
                      )}
                      <div>
                        <Link to={`/locales/${l.id_local}`} style={{ color: '#ccff00', fontWeight: 'bold', textDecoration: 'none' }}>
                          {l.nombre}
                        </Link>
                        <div style={{ fontSize: '12px', color: '#a9c9bb' }}>{l.categoria || 'Sin categoría'}</div>
                      </div>
                    </div>
                  </td>
                  <td style={estilos.td}>{l.municipio || 'Sin municipio'}</td>
                  <td style={estilos.td}>
                    {l.propietario || '—'}
                    <div style={{ fontSize: '12px', color: '#8aa6a0' }}>{l.email_propietario}</div>
                  </td>
                  <td style={estilos.td}>{l.total_calificaciones}</td>
                  <td style={estilos.td}>{l.total_planes}</td>
                  <td style={estilos.td}>
                    <button
                      onClick={() => eliminar(l)}
                      disabled={eliminando === l.id_local}
                      style={{ ...estilos.boton, background: '#dc2626', color: 'white' }}
                    >
                      {eliminando === l.id_local ? '...' : 'Eliminar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {totalPaginas > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
          <button onClick={() => setPagina(Math.max(1, pagina - 1))} disabled={pagina === 1} style={estilos.boton}>← Anterior</button>
          <span>Página {pagina} de {totalPaginas}</span>
          <button onClick={() => setPagina(Math.min(totalPaginas, pagina + 1))} disabled={pagina === totalPaginas} style={estilos.boton}>Siguiente →</button>
        </div>
      )}
    </div>
  );
}

function PublicacionesAdmin({ token }) {
  const [publicaciones, setPublicaciones] = useState([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [pagina, setPagina] = useState(1);
  const [porPagina] = useState(30);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [eliminando, setEliminando] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    const params = new URLSearchParams({ pagina, porPagina });
    if (q.trim()) params.set('q', q.trim());
    try {
      const res = await fetch(`${API_URL}/admin/publicaciones?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar publicaciones');
      setPublicaciones(data.publicaciones || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [token, q, pagina, porPagina]);

  useEffect(() => {
    const temporizador = setTimeout(cargar, 400);
    return () => clearTimeout(temporizador);
  }, [cargar]);

  const eliminar = async (p) => {
    if (!window.confirm('¿Eliminar esta publicación?')) return;
    setEliminando(p.id);
    setError('');
    try {
      const res = await fetch(`${API_URL}/admin/publicaciones/${p.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar publicación');
      cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setEliminando(null);
    }
  };

  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  return (
    <div>
      {error && <div style={estilos.aviso}>{error}</div>}
      <input
        placeholder="Buscar por contenido..."
        value={q}
        onChange={(e) => { setQ(e.target.value); setPagina(1); }}
        style={estilos.input}
      />
      <div style={estilos.tarjeta}>
        {cargando ? (
          <p>Cargando...</p>
        ) : publicaciones.length === 0 ? (
          <p>No hay publicaciones.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ ...estilos.tabla, minWidth: '560px' }}>
            <thead>
              <tr>
                <th style={estilos.th}>Autor</th>
                <th style={estilos.th}>Contenido</th>
                <th style={estilos.th}>Fecha</th>
                <th style={estilos.th}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {publicaciones.map((p) => (
                <tr key={p.id}>
                  <td style={estilos.td}>
                    <strong>{p.autor || '—'}</strong>
                    <div style={{ fontSize: '12px', color: '#a9c9bb' }}>{p.email_autor}</div>
                  </td>
                  <td style={estilos.td}>
                    {p.contenido}
                    {p.imagen_url && (
                      <div style={{ marginTop: '6px' }}>
                        <img src={resolverImagenUrl(p.imagen_url)} alt="Publicación" style={{ maxWidth: '160px', maxHeight: '110px', borderRadius: '6px', objectFit: 'cover' }} />
                      </div>
                    )}
                  </td>
                  <td style={estilos.td}>
                    {new Date(p.fecha_creacion).toLocaleDateString('es-CO', {
                      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </td>
                  <td style={estilos.td}>
                    <button
                      onClick={() => eliminar(p)}
                      disabled={eliminando === p.id}
                      style={{ ...estilos.boton, background: '#dc2626', color: 'white' }}
                    >
                      {eliminando === p.id ? '...' : 'Eliminar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {totalPaginas > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
          <button onClick={() => setPagina(Math.max(1, pagina - 1))} disabled={pagina === 1} style={estilos.boton}>← Anterior</button>
          <span>Página {pagina} de {totalPaginas}</span>
          <button onClick={() => setPagina(Math.min(totalPaginas, pagina + 1))} disabled={pagina === totalPaginas} style={estilos.boton}>Siguiente →</button>
        </div>
      )}
    </div>
  );
}

function DenunciasAdmin({ token }) {
  const [denuncias, setDenuncias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [actuando, setActuando] = useState(null);

  const MOTIVOS = {
    pornografia: 'Pornografía / contenido sexual',
    violencia: 'Violencia',
    spam: 'Spam',
    otro: 'Otro',
  };

  const ESTADOS = {
    pendiente: { label: 'Pendiente', color: '#fbbf24' },
    resuelta: { label: 'Resuelta', color: '#4ade80' },
    descartada: { label: 'Descartada', color: '#94a3b8' },
  };

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/admin/denuncias`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar denuncias');
      setDenuncias(data.denuncias || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const resolver = (id, estado) => async () => {
    setActuando(id);
    setError('');
    try {
      const res = await fetch(`${API_URL}/admin/denuncias/${id}/resolver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ estado }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al actualizar la denuncia');
      cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setActuando(null);
    }
  };

  const eliminarPublicacion = (d) => async () => {
    if (!window.confirm('¿Eliminar la publicación denunciada? La denuncia quedará resuelta.')) return;
    setActuando(d.id);
    setError('');
    try {
      const res = await fetch(`${API_URL}/admin/publicaciones/${d.publicacion_id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar publicación');
      await fetch(`${API_URL}/admin/denuncias/${d.id}/resolver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ estado: 'resuelta' }),
      });
      cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setActuando(null);
    }
  };

  return (
    <div>
      {error && <div style={estilos.aviso}>{error}</div>}
      <div style={estilos.tarjeta}>
        {cargando ? (
          <p>Cargando...</p>
        ) : denuncias.length === 0 ? (
          <p>No hay denuncias. El clasificador automático se encarga de las imágenes sexuales.</p>
        ) : (
          <table style={{ ...estilos.tabla, minWidth: '720px' }}>
            <thead>
              <tr>
                <th style={estilos.th}>Publicación</th>
                <th style={estilos.th}>Motivo</th>
                <th style={estilos.th}>Reportada por</th>
                <th style={estilos.th}>Estado</th>
                <th style={estilos.th}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {denuncias.map((d) => (
                <tr key={d.id}>
                  <td style={estilos.td}>
                    <strong>{d.autor_publicacion}</strong>
                    <div style={{ fontSize: '13px', color: '#a9c9bb' }}>{d.contenido}</div>
                    {d.detalle && <div style={{ fontSize: '12px', color: '#ffb4b4' }}>Detalle: {d.detalle}</div>}
                    <div style={{ fontSize: '11px', color: '#8aa6a0', marginTop: '4px' }}>
                      {new Date(d.creada_en).toLocaleDateString('es-CO', {
                        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </div>
                  </td>
                  <td style={estilos.td}>{MOTIVOS[d.motivo] || d.motivo}</td>
                  <td style={estilos.td}>{d.autor_denuncia}</td>
                  <td style={estilos.td}>
                    <span style={{ color: ESTADOS[d.estado]?.color || '#fff', fontWeight: 'bold' }}>
                      {ESTADOS[d.estado]?.label || d.estado}
                    </span>
                  </td>
                  <td style={estilos.td}>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button
                        onClick={eliminarPublicacion(d)}
                        disabled={actuando === d.id || d.estado !== 'pendiente'}
                        style={{ ...estilos.boton, background: '#dc2626', color: 'white' }}
                      >
                        {actuando === d.id ? '...' : 'Eliminar publicación'}
                      </button>
                      {d.estado === 'pendiente' && (
                        <>
                          <button
                            onClick={resolver(d.id, 'resuelta')}
                            disabled={actuando === d.id}
                            style={{ ...estilos.boton, background: '#2a6a94', color: 'white' }}
                          >
                            Aprobarla
                          </button>
                          <button
                            onClick={resolver(d.id, 'descartada')}
                            disabled={actuando === d.id}
                            style={{ ...estilos.boton, background: '#4b5563', color: 'white' }}
                          >
                            Descartar
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Admin() {
  const { token } = useAuth();
  const [pestaña, setPestaña] = useState('resumen');
  const [stats, setStats] = useState(null);
  const [cargandoStats, setCargandoStats] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/admin/estadisticas`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch(() => setStats(null))
      .finally(() => setCargandoStats(false));
  }, [token]);

  const pestañas = [
    { id: 'resumen', label: 'Resumen' },
    { id: 'usuarios', label: 'Usuarios' },
    { id: 'locales', label: 'Locales' },
    { id: 'publicaciones', label: 'Publicaciones' },
    { id: 'reportes', label: 'Reportes' },
  ];

  return (
    <FondoPagina>
      <div style={estilos.contenedor}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <h1 style={{ margin: 0 }}>Panel de administración</h1>
          <Link to="/" style={{ color: '#ccff00', fontWeight: 'bold', textDecoration: 'none' }}>← Volver al inicio</Link>
        </div>

        <div style={estilos.pestañas}>
          {pestañas.map((p) => (
            <button
              key={p.id}
              onClick={() => setPestaña(p.id)}
              style={{ ...estilos.pestaña, ...(pestaña === p.id ? estilos.pestañaActiva : estilos.pestañaInactiva) }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {pestaña === 'resumen' && (
          cargandoStats ? <p>Cargando...</p> : (
            stats ? <Resumen stats={stats} /> : <div style={estilos.aviso}>No se pudieron cargar las estadísticas.</div>
          )
        )}
        {pestaña === 'usuarios' && <Usuarios token={token} />}
        {pestaña === 'locales' && <LocalesAdmin token={token} />}
        {pestaña === 'publicaciones' && <PublicacionesAdmin token={token} />}
        {pestaña === 'reportes' && <DenunciasAdmin token={token} />}
      </div>
    </FondoPagina>
  );
}

export default Admin;