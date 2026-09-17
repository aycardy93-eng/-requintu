import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import FondoPagina from '../components/FondoPagina';
import { localeFecha } from '../i18n';
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
  const { t } = useTranslation();
  const tarjetas = [
    { label: t('admin.usuarios'), valor: stats?.totalUsuarios ?? '-', icono: '👤' },
    { label: t('admin.nuevos7dias'), valor: stats?.usuariosNuevos7dias ?? '-', icono: '🆕' },
    { label: t('admin.locales'), valor: stats?.totalLocales ?? '-', icono: '🏪' },
    { label: t('admin.publicaciones'), valor: stats?.totalPublicaciones ?? '-', icono: '📝' },
    { label: t('admin.calificaciones'), valor: stats?.totalCalificaciones ?? '-', icono: '⭐' },
    { label: t('admin.promedio'), valor: stats ? Number(stats.promedioCalificaciones).toFixed(1) : '-', icono: '📊' },
    { label: t('admin.promociones'), valor: stats?.totalPlanes ?? '-', icono: '🎉' },
  ];

  const rolLabels = { admin: t('admin.administradores'), alcaldia: t('admin.alcaldias'), comerciante: t('admin.comerciantes'), comerciante_premium: t('admin.comerciantesPremium'), turista: t('admin.turistas') };

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
          <h3 style={{ marginTop: 0 }}>{t('admin.usuariosPorRol')}</h3>
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
  const { t } = useTranslation();
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
      if (!res.ok) throw new Error(data.error || t('admin.errorCargarUsuarios'));
      setUsuarios(data.usuarios || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [token, q, filtroRol, pagina, porPagina, t]);

  useEffect(() => {
    const temporizador = setTimeout(cargar, 400);
    return () => clearTimeout(temporizador);
  }, [cargar]);

  const cambiarRol = async (id, nuevoRol) => {
    if (!window.confirm(t('admin.confirmarCambiarRol'))) return;
    setCambiando(id);
    setError('');
    try {
      const res = await fetch(`${API_URL}/admin/usuarios/${id}/rol`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rol: nuevoRol }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('admin.errorCambiarRol'));
      cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setCambiando(null);
    }
  };

  const eliminar = async (u) => {
    if (!window.confirm(t('admin.confirmarEliminarUsuario', { nombre: u.nombre, email: u.email }))) return;
    setCambiando(u.id_usuario);
    setError('');
    try {
      const res = await fetch(`${API_URL}/admin/usuarios/${u.id_usuario}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('admin.errorEliminarUsuario'));
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
          placeholder={t('admin.buscarUsuario')}
          value={q}
          onChange={(e) => { setQ(e.target.value); setPagina(1); }}
          style={{ ...estilos.input, flex: 1, minWidth: '220px', marginBottom: '15px' }}
        />
        <select
          value={filtroRol}
          onChange={(e) => { setFiltroRol(e.target.value); setPagina(1); }}
          style={{ ...estilos.input, width: 'auto', marginBottom: '15px' }}
        >
          <option value="">{t('admin.todosRoles')}</option>
          <option value="admin">Admin</option>
          <option value="alcaldia">{t('admin.alcaldia')}</option>
          <option value="comerciante">{t('admin.comerciante')}</option>
          <option value="comerciante_premium">{t('admin.comerciantePremium')}</option>
          <option value="turista">{t('admin.turista')}</option>
        </select>
      </div>

      <div style={estilos.tarjeta}>
        {cargando ? (
          <p>{t('common.cargando')}</p>
        ) : usuarios.length === 0 ? (
          <p>{t('admin.sinUsuarios')}</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ ...estilos.tabla, minWidth: '640px' }}>
            <thead>
              <tr>
                <th style={estilos.th}>{t('admin.usuario')}</th>
                <th style={estilos.th}>{t('admin.rol')}</th>
                <th style={estilos.th}>{t('admin.locales')}</th>
                <th style={estilos.th}>{t('admin.publicaciones')}</th>
                <th style={estilos.th}>{t('admin.acciones')}</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id_usuario}>
                  <td style={estilos.td}>
                    <strong>{u.nombre}</strong>
                    <div style={{ fontSize: '12px', color: '#a9c9bb' }}>{u.email}</div>
                    <div style={{ fontSize: '12px', color: '#8aa6a0' }}>
                      {t('admin.registro')}: {new Date(u.fecha_registro).toLocaleDateString(localeFecha())}
                    </div>
                  </td>
                  <td style={estilos.td}>
                    <span style={{
                      background: u.rol === 'admin' ? 'rgba(204,255,0,0.2)' : u.rol === 'comerciante_premium' ? 'rgba(255,200,0,0.2)' : u.rol === 'alcaldia' ? 'rgba(0,200,255,0.2)' : 'rgba(255,255,255,0.1)',
                      color: u.rol === 'admin' ? '#ccff00' : u.rol === 'comerciante_premium' ? '#ffc800' : u.rol === 'alcaldia' ? '#49c7ff' : '#dce8e3',
                      padding: '3px 10px', borderRadius: '999px', fontSize: '12px',
                    }}>
                      {u.rol === 'comerciante_premium' ? t('admin.comerciantePremium') : u.rol === 'alcaldia' ? t('admin.alcaldia') : u.rol}
                    </span>
                  </td>
                  <td style={estilos.td}>{u.total_locales}</td>
                  <td style={estilos.td}>{u.total_publicaciones}</td>
                  <td style={estilos.td}>
                    <select
                      value={u.rol}
                      onChange={(e) => cambiarRol(u.id_usuario, e.target.value)}
                      disabled={cambiando === u.id_usuario}
                      style={{ ...estilos.boton, background: '#2a6a94', color: 'white', marginRight: '6px', padding: '6px 10px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                    >
                      <option value="comerciante">{t('admin.comerciante')}</option>
                      <option value="comerciante_premium">{t('admin.comerciantePremium')}</option>
                      <option value="alcaldia">{t('admin.alcaldia')}</option>
                      <option value="turista">{t('admin.turista')}</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      onClick={() => eliminar(u)}
                      disabled={cambiando === u.id_usuario}
                      style={{ ...estilos.boton, background: '#dc2626', color: 'white' }}
                    >
                      {t('common.eliminar')}
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
            ← {t('admin.anterior')}
          </button>
          <span>{t('admin.paginaDe', { pagina, total: totalPaginas })}</span>
          <button onClick={() => setPagina(Math.min(totalPaginas, pagina + 1))} disabled={pagina === totalPaginas} style={estilos.boton}>
            {t('admin.siguiente')} →
          </button>
        </div>
      )}
    </div>
  );
}

function LocalesAdmin({ token }) {
  const { t } = useTranslation();
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
      if (!res.ok) throw new Error(data.error || t('admin.errorCargarLocales'));
      setLocales(data.locales || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [token, q, pagina, porPagina, t]);

  useEffect(() => {
    const temporizador = setTimeout(cargar, 400);
    return () => clearTimeout(temporizador);
  }, [cargar]);

  const eliminar = async (l) => {
    if (!window.confirm(t('admin.confirmarEliminarLocal', { nombre: l.nombre }))) return;
    setEliminando(l.id_local);
    setError('');
    try {
      const res = await fetch(`${API_URL}/locales/${l.id_local}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('admin.errorEliminarLocal'));
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
        placeholder={t('admin.buscarLocal')}
        value={q}
        onChange={(e) => { setQ(e.target.value); setPagina(1); }}
        style={estilos.input}
      />
      <div style={estilos.tarjeta}>
        {cargando ? (
          <p>{t('common.cargando')}</p>
        ) : locales.length === 0 ? (
          <p>{t('admin.sinLocales')}</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ ...estilos.tabla, minWidth: '760px' }}>
            <thead>
              <tr>
                <th style={estilos.th}>{t('admin.local')}</th>
                <th style={estilos.th}>{t('admin.ubicacion')}</th>
                <th style={estilos.th}>{t('admin.propietario')}</th>
                <th style={estilos.th}>{t('admin.estrellas')}</th>
                <th style={estilos.th}>{t('admin.promociones')}</th>
                <th style={estilos.th}>{t('admin.acciones')}</th>
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
                        <div style={{ fontSize: '12px', color: '#a9c9bb' }}>{l.categoria || t('localDetalle.sinCategoria')}</div>
                      </div>
                    </div>
                  </td>
                  <td style={estilos.td}>{l.municipio || t('localDetalle.sinMunicipio')}</td>
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
                      {eliminando === l.id_local ? '...' : t('common.eliminar')}
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
          <button onClick={() => setPagina(Math.max(1, pagina - 1))} disabled={pagina === 1} style={estilos.boton}>← {t('admin.anterior')}</button>
          <span>{t('admin.paginaDe', { pagina, total: totalPaginas })}</span>
          <button onClick={() => setPagina(Math.min(totalPaginas, pagina + 1))} disabled={pagina === totalPaginas} style={estilos.boton}>{t('admin.siguiente')} →</button>
        </div>
      )}
    </div>
  );
}

function PublicacionesAdmin({ token }) {
  const { t } = useTranslation();
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
      if (!res.ok) throw new Error(data.error || t('admin.errorCargarPublicaciones'));
      setPublicaciones(data.publicaciones || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [token, q, pagina, porPagina, t]);

  useEffect(() => {
    const temporizador = setTimeout(cargar, 400);
    return () => clearTimeout(temporizador);
  }, [cargar]);

  const eliminar = async (p) => {
    if (!window.confirm(t('admin.confirmarEliminarPublicacion'))) return;
    setEliminando(p.id);
    setError('');
    try {
      const res = await fetch(`${API_URL}/admin/publicaciones/${p.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('admin.errorEliminarPublicacion'));
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
        placeholder={t('admin.buscarContenido')}
        value={q}
        onChange={(e) => { setQ(e.target.value); setPagina(1); }}
        style={estilos.input}
      />
      <div style={estilos.tarjeta}>
        {cargando ? (
          <p>{t('common.cargando')}</p>
        ) : publicaciones.length === 0 ? (
          <p>{t('admin.sinPublicaciones')}</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ ...estilos.tabla, minWidth: '560px' }}>
            <thead>
              <tr>
                <th style={estilos.th}>{t('admin.autor')}</th>
                <th style={estilos.th}>{t('admin.contenido')}</th>
                <th style={estilos.th}>{t('admin.fecha')}</th>
                <th style={estilos.th}>{t('admin.acciones')}</th>
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
                    {new Date(p.fecha_creacion).toLocaleDateString(localeFecha(), {
                      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </td>
                  <td style={estilos.td}>
                    <button
                      onClick={() => eliminar(p)}
                      disabled={eliminando === p.id}
                      style={{ ...estilos.boton, background: '#dc2626', color: 'white' }}
                    >
                      {eliminando === p.id ? '...' : t('common.eliminar')}
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
          <button onClick={() => setPagina(Math.max(1, pagina - 1))} disabled={pagina === 1} style={estilos.boton}>← {t('admin.anterior')}</button>
          <span>{t('admin.paginaDe', { pagina, total: totalPaginas })}</span>
          <button onClick={() => setPagina(Math.min(totalPaginas, pagina + 1))} disabled={pagina === totalPaginas} style={estilos.boton}>{t('admin.siguiente')} →</button>
        </div>
      )}
    </div>
  );
}

function DenunciasAdmin({ token }) {
  const { t } = useTranslation();
  const [denuncias, setDenuncias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [actuando, setActuando] = useState(null);

  const MOTIVOS = {
    pornografia: t('admin.motivoPornografia'),
    violencia: t('admin.motivoViolencia'),
    spam: t('admin.motivoSpam'),
    otro: t('admin.motivoOtro'),
  };

  const ESTADOS = {
    pendiente: { label: t('admin.estadoPendiente'), color: '#fbbf24' },
    resuelta: { label: t('admin.estadoResuelta'), color: '#4ade80' },
    descartada: { label: t('admin.estadoDescartada'), color: '#94a3b8' },
  };

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/admin/denuncias`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('admin.errorCargarDenuncias'));
      setDenuncias(data.denuncias || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [token, t]);

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
      if (!res.ok) throw new Error(data.error || t('admin.errorActualizarDenuncia'));
      cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setActuando(null);
    }
  };

  const eliminarPublicacion = (d) => async () => {
    if (!window.confirm(t('admin.confirmarEliminarDenunciada'))) return;
    setActuando(d.id);
    setError('');
    try {
      const res = await fetch(`${API_URL}/admin/publicaciones/${d.publicacion_id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('admin.errorEliminarPublicacion'));
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
          <p>{t('common.cargando')}</p>
        ) : denuncias.length === 0 ? (
          <p>{t('admin.sinDenuncias')}</p>
        ) : (
          <table style={{ ...estilos.tabla, minWidth: '720px' }}>
            <thead>
              <tr>
                <th style={estilos.th}>{t('admin.publicacion')}</th>
                <th style={estilos.th}>{t('admin.motivo')}</th>
                <th style={estilos.th}>{t('admin.reportadaPor')}</th>
                <th style={estilos.th}>{t('admin.estado')}</th>
                <th style={estilos.th}>{t('admin.acciones')}</th>
              </tr>
            </thead>
            <tbody>
              {denuncias.map((d) => (
                <tr key={d.id}>
                  <td style={estilos.td}>
                    <strong>{d.autor_publicacion}</strong>
                    <div style={{ fontSize: '13px', color: '#a9c9bb' }}>{d.contenido}</div>
                    {d.detalle && <div style={{ fontSize: '12px', color: '#ffb4b4' }}>{t('admin.detalle')}: {d.detalle}</div>}
                    <div style={{ fontSize: '11px', color: '#8aa6a0', marginTop: '4px' }}>
                      {new Date(d.creada_en).toLocaleDateString(localeFecha(), {
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
                        {actuando === d.id ? '...' : t('admin.eliminarPublicacion')}
                      </button>
                      {d.estado === 'pendiente' && (
                        <>
                          <button
                            onClick={resolver(d.id, 'resuelta')}
                            disabled={actuando === d.id}
                            style={{ ...estilos.boton, background: '#2a6a94', color: 'white' }}
                          >
                            {t('admin.aprobarla')}
                          </button>
                          <button
                            onClick={resolver(d.id, 'descartada')}
                            disabled={actuando === d.id}
                            style={{ ...estilos.boton, background: '#4b5563', color: 'white' }}
                          >
                            {t('admin.descartar')}
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
  const { t } = useTranslation();
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
    { id: 'resumen', label: t('admin.resumen') },
    { id: 'usuarios', label: t('admin.usuarios') },
    { id: 'locales', label: t('admin.locales') },
    { id: 'publicaciones', label: t('admin.publicaciones') },
    { id: 'reportes', label: t('admin.reportes') },
  ];

  return (
    <FondoPagina>
      <div style={estilos.contenedor}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <h1 style={{ margin: 0 }}>{t('admin.panel')}</h1>
          <Link to="/" style={{ color: '#ccff00', fontWeight: 'bold', textDecoration: 'none' }}>← {t('admin.volverInicio')}</Link>
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
          cargandoStats ? <p>{t('common.cargando')}</p> : (
            stats ? <Resumen stats={stats} /> : <div style={estilos.aviso}>{t('admin.errorEstadisticas')}</div>
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