import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import FondoPagina from '../components/FondoPagina';
import { localeFecha } from '../i18n';
import BACKEND_ORIGIN, { API_URL } from '../config';

const resolverImagenUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('https://res.cloudinary.com/')) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return null; // origen externo no aceptado
  return `${BACKEND_ORIGIN}${url}`;
};

const estiloInput = {
  width: '100%',
  padding: '8px',
  borderRadius: '6px',
  border: '1px solid rgba(255,255,255,0.25)',
  backgroundColor: 'rgba(255,255,255,0.95)',
  color: '#12283d',
};

const estiloTarjeta = {
  border: '1px solid rgba(255,255,255,0.15)',
  background: 'rgba(18, 40, 61, 0.75)',
  borderRadius: '8px',
  padding: '15px',
  marginBottom: '15px',
};

function LocalDetalle() {
  const { id } = useParams();
  const { token, isAuthenticated, usuario: usuarioActual } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [local, setLocal] = useState(null);
  const [calificaciones, setCalificaciones] = useState([]);
  const [promedio, setPromedio] = useState(null);
  const [planes, setPlanes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [puntuacion, setPuntuacion] = useState(5);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [errorCalificacion, setErrorCalificacion] = useState('');

  // Estado del formulario de planes
  const [tituloPlan, setTituloPlan] = useState('');
  const [descripcionPlan, setDescripcionPlan] = useState('');
  const [fechaInicioPlan, setFechaInicioPlan] = useState('');
  const [fechaFinPlan, setFechaFinPlan] = useState('');
  const [imagenPlanFile, setImagenPlanFile] = useState(null);
  const [enviandoPlan, setEnviandoPlan] = useState(false);
  const [errorPlan, setErrorPlan] = useState('');
  const [exitoPlan, setExitoPlan] = useState('');
  const [planEditando, setPlanEditando] = useState(null);
  const [tituloEditado, setTituloEditado] = useState('');
  const [descripcionEditada, setDescripcionEditada] = useState('');
  const [fechaInicioEditada, setFechaInicioEditada] = useState('');
  const [fechaFinEditada, setFechaFinEditada] = useState('');
  const [imagenEditadaFile, setImagenEditadaFile] = useState(null);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [errorEdicion, setErrorEdicion] = useState('');
  const [eliminando, setEliminando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [formEdit, setFormEdit] = useState({ nombre: '', descripcion: '', direccion: '', telefono: '', imagen_url: '', id_categoria: '', id_municipio: '' });
  const [categoriasEdit, setCategoriasEdit] = useState([]);
  const [municipiosEdit, setMunicipiosEdit] = useState([]);
  const [guardandoEdit, setGuardandoEdit] = useState(false);
  const [errorEdit, setErrorEdit] = useState('');
  const [nuevasFotosEdit, setNuevasFotosEdit] = useState([]);
  const [confirmacion, setConfirmacion] = useState(null);
  const [aviso, setAviso] = useState('');
  const [imagenActiva, setImagenActiva] = useState(0);

  const galeriaLocal = () => {
    if (Array.isArray(local?.imagenes) && local.imagenes.length > 0) return local.imagenes;
    if (local?.imagen_url) return [local.imagen_url];
    return [];
  };

  useEffect(() => {
    setImagenActiva(0);
    setNuevasFotosEdit([]);
  }, [id]);

  const cargarDatos = () => {
    setCargando(true);
    setError('');

    fetch(`${API_URL}/locales/${id}`)
      .then((res) => res.json())
      .then((data) => setLocal(data.local || null))
      .catch(() => setError('No se pudo cargar el local.'));

    fetch(`${API_URL}/locales/${id}/calificaciones`)
      .then((res) => res.json())
      .then((data) => {
        setCalificaciones(data.calificaciones || []);
        setPromedio(data.promedio);
        setCargando(false);
      })
      .catch(() => setCargando(false));

    fetch(`${API_URL}/locales/${id}/planes`)
      .then((res) => res.json())
      .then((data) => setPlanes(data.planes || []))
      .catch(() => setPlanes([]));
  };

  useEffect(() => {
    cargarDatos();
  }, [id]);

  const esDueno = isAuthenticated && usuarioActual && local && (
    local.id_usuario === usuarioActual.id || usuarioActual.rol === 'admin'
  );

  const handleEliminarLocal = () => {
    setConfirmacion({
      mensaje: t('localDetalle.confirmarEliminarLocal'),
      accion: async () => {
        setEliminando(true);
        try {
          const res = await fetch(`${API_URL}/locales/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || t('localDetalle.errorEliminar'));
          navigate('/locales');
        } catch (err) {
          setAviso(err.message);
          setEliminando(false);
        }
      },
    });
  };

  const abrirEdicion = async () => {
    setFormEdit({
      nombre: local.nombre || '',
      descripcion: local.descripcion || '',
      direccion: local.direccion || '',
      telefono: local.telefono || '',
      imagen_url: local.imagen_url || '',
      id_categoria: local.id_categoria || '',
      id_municipio: local.id_municipio || '',
    });
    setNuevasFotosEdit([]);
    setErrorEdit('');
    try {
      const [catRes, munRes] = await Promise.all([
        fetch(`${API_URL}/categorias`),
        fetch(`${API_URL}/municipios`),
      ]);
      setCategoriasEdit(await catRes.json() || []);
      setMunicipiosEdit(await munRes.json() || []);
    } catch {}
    setEditando(true);
  };

  const handleGuardarEdit = async (e) => {
    e.preventDefault();
    setGuardandoEdit(true);
    setErrorEdit('');
    try {
      const bodyEdit = {
        nombre: formEdit.nombre,
        descripcion: formEdit.descripcion || null,
        direccion: formEdit.direccion,
        telefono: formEdit.telefono || null,
        id_categoria: formEdit.id_categoria || null,
        id_municipio: formEdit.id_municipio || null,
      };

      if (nuevasFotosEdit.length > 0) {
        const nuevosUrls = [];
        for (const archivo of nuevasFotosEdit.slice(0, 6)) {
          const fd = new FormData();
          fd.append('imagen', archivo);
          const upRes = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: fd,
          });
          const upData = await upRes.json();
          if (!upRes.ok) throw new Error(upData.error || t('localDetalle.errorSubirImagen'));
          nuevosUrls.push(upData.url);
        }
        const baseGaleria = galeriaLocal();
        bodyEdit.imagenes_url = [...baseGaleria, ...nuevosUrls];
      }

      const res = await fetch(`${API_URL}/locales/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(bodyEdit),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('localDetalle.errorActualizar'));
      setEditando(false);
      setNuevasFotosEdit([]);
      cargarDatos();
    } catch (err) {
      setErrorEdit(err.message);
    } finally {
      setGuardandoEdit(false);
    }
  };

  const handleCalificar = async (e) => {
    e.preventDefault();
    setErrorCalificacion('');
    setEnviando(true);

    try {
      const res = await fetch(`${API_URL}/locales/${id}/calificaciones`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ puntuacion: Number(puntuacion), comentario }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || t('localDetalle.errorCalificacion'));
      }

      setComentario('');
      setPuntuacion(5);
      cargarDatos();
    } catch (err) {
      setErrorCalificacion(err.message);
    } finally {
      setEnviando(false);
    }
  };

  const handleCrearPlan = async (e) => {
    e.preventDefault();
    setErrorPlan('');
    setExitoPlan('');

    if (!tituloPlan || !fechaInicioPlan || !fechaFinPlan) {
      setErrorPlan(t('localDetalle.camposObligatoriosPlan'));
      return;
    }

    setEnviandoPlan(true);

    try {
      let imagen_url = null;

      if (imagenPlanFile) {
        const formData = new FormData();
        formData.append('imagen', imagenPlanFile);

        const uploadRes = await fetch(`${API_URL}/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        const uploadData = await uploadRes.json();

        if (!uploadRes.ok) {
          throw new Error(uploadData.error || 'Error al subir la imagen.');
        }

        imagen_url = uploadData.url;
      }

      const res = await fetch(`${API_URL}/locales/${id}/planes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          titulo: tituloPlan,
          descripcion: descripcionPlan,
          fecha_inicio: fechaInicioPlan,
          fecha_fin: fechaFinPlan,
          imagen_url,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al crear el plan.');
      }

      setExitoPlan(t('localDetalle.planCreado'));
      setTituloPlan('');
      setDescripcionPlan('');
      setFechaInicioPlan('');
      setFechaFinPlan('');
      setImagenPlanFile(null);
      cargarDatos();
    } catch (err) {
      setErrorPlan(err.message);
    } finally {
      setEnviandoPlan(false);
    }
  };

  const iniciarEdicionPlan = (plan) => {
    setPlanEditando(plan.id_plan);
    setTituloEditado(plan.titulo || '');
    setDescripcionEditada(plan.descripcion || '');
    setFechaInicioEditada((plan.fecha_inicio || '').slice(0, 10));
    setFechaFinEditada((plan.fecha_fin || '').slice(0, 10));
    setImagenEditadaFile(null);
    setErrorEdicion('');
  };

  const cancelarEdicionPlan = () => {
    setPlanEditando(null);
    setImagenEditadaFile(null);
    setErrorEdicion('');
  };

  const guardarEdicionPlan = async (e, plan) => {
    e.preventDefault();
    setErrorEdicion('');

    if (!tituloEditado || !fechaInicioEditada || !fechaFinEditada) {
      setErrorEdicion(t('localDetalle.tituloFechasObligatorios'));
      return;
    }

    setGuardandoEdicion(true);

    try {
      let imagen_url = plan.imagen_url;

      if (imagenEditadaFile) {
        const formData = new FormData();
        formData.append('imagen', imagenEditadaFile);

        const uploadRes = await fetch(`${API_URL}/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const uploadData = await uploadRes.json();

        if (!uploadRes.ok) {
          throw new Error(uploadData.error || 'Error al subir la imagen.');
        }

        imagen_url = uploadData.url;
      }

      const res = await fetch(`${API_URL}/planes/${plan.id_plan}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          titulo: tituloEditado,
          descripcion: descripcionEditada,
          precio: plan.precio || null,
          fecha_inicio: fechaInicioEditada,
          fecha_fin: fechaFinEditada,
          imagen_url,
        }),
      });
      const data = await res.json();

if (!res.ok) {
          throw new Error(data.error || t('localDetalle.errorActualizarPlan'));
        }

        cancelarEdicionPlan();
        setExitoPlan(t('localDetalle.planActualizado'));
      cargarDatos();
    } catch (err) {
      setErrorEdicion(err.message);
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const eliminarPlan = (plan) => {
    setConfirmacion({
      mensaje: t('localDetalle.confirmarEliminarPlan', { titulo: plan.titulo }),
      accion: async () => {
        try {
          const res = await fetch(`${API_URL}/planes/${plan.id_plan}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();

if (!res.ok) {
              throw new Error(data.error || t('localDetalle.errorEliminarPlan'));
            }

            if (planEditando === plan.id_plan) {
              cancelarEdicionPlan();
            }
            setExitoPlan(t('localDetalle.planEliminado'));
          cargarDatos();
        } catch (err) {
          setAviso(err.message);
        }
      },
    });
  };

  if (cargando) return <FondoPagina><p style={{ padding: '20px' }}>{t('common.cargando')}</p></FondoPagina>;
  if (error) return <FondoPagina><p style={{ padding: '20px', color: '#ffb4b4' }}>{error}</p></FondoPagina>;
  if (!local) return <FondoPagina><p style={{ padding: '20px' }}>{t('localDetalle.noEncontrado')}</p></FondoPagina>;

  const puedeGestionarPlanes = usuarioActual && (
    local.id_usuario === usuarioActual.id || usuarioActual.rol === 'admin'
  );

  return (
    <FondoPagina>
    {galeriaLocal().length > 0 ? (
      <div style={{ position: 'relative', width: '100%', height: '320px', background: 'rgba(0,0,0,0.35)' }}>
        <img
          src={resolverImagenUrl(galeriaLocal()[imagenActiva] ?? galeriaLocal()[0])}
          alt={local.nombre}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            display: 'block',
          }}
        />
        {galeriaLocal().length > 1 && (
          <>
            <button
              onClick={() => setImagenActiva((imagenActiva + galeriaLocal().length - 1) % galeriaLocal().length)}
              aria-label={t('localDetalle.anterior')}
              style={{
                position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
                background: 'rgba(0,0,0,0.55)', color: 'white', border: 'none',
                borderRadius: '50%', width: '38px', height: '38px', fontSize: '18px', cursor: 'pointer',
              }}
            >‹</button>
            <button
              onClick={() => setImagenActiva((imagenActiva + 1) % galeriaLocal().length)}
              aria-label={t('localDetalle.siguiente')}
              style={{
                position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                background: 'rgba(0,0,0,0.55)', color: 'white', border: 'none',
                borderRadius: '50%', width: '38px', height: '38px', fontSize: '18px', cursor: 'pointer',
              }}
            >›</button>
            <div style={{ position: 'absolute', bottom: '10px', left: '0', right: '0', display: 'flex', justifyContent: 'center', gap: '10px' }}>
              {galeriaLocal().map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setImagenActiva(idx)}
                  aria-label={t('localDetalle.imagen', { numero: idx + 1 })}
                  style={{
                    width: '10px', height: '10px', borderRadius: '50%', border: 'none', cursor: 'pointer',
                    background: idx === imagenActiva ? '#ccff00' : 'rgba(255,255,255,0.6)',
                    padding: 0,
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>
    ) : (
      <div
        style={{
          width: '100%',
          height: '320px',
          background: 'rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#a9c9bb',
        }}
      >
        {t('locales.sinImagen')}
      </div>
    )}
    <div style={{ maxWidth: '700px', margin: '0 auto', fontFamily: 'sans-serif', padding: '20px 15px 30px 15px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
        <Link to="/locales" style={{ color: '#ccff00', fontWeight: 'bold', textDecoration: 'none' }}>← {t('localDetalle.volverLocales')}</Link>
        {esDueno && (
          <>
            <button
              onClick={abrirEdicion}
              style={{
                backgroundColor: '#ccff00', color: '#12283d', border: 'none',
                padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px',
                transition: 'transform 0.12s ease',
              }}
            >
              {t('localDetalle.editarLocal')}
            </button>
            <button
              onClick={handleEliminarLocal}
              disabled={eliminando}
              style={{
                backgroundColor: '#dc2626', color: 'white', border: 'none',
                padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px',
                opacity: eliminando ? 0.6 : 1,
              }}
            >
              {eliminando ? t('localDetalle.eliminando') : t('localDetalle.eliminarLocal')}
            </button>
          </>
        )}
      </div>

      {aviso && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px',
          color: '#ffb4b4', background: 'rgba(255,180,180,0.12)', padding: '10px 14px',
          borderRadius: '8px', marginTop: '15px',
        }}>
          <span style={{ fontSize: '14px' }}>{aviso}</span>
          <button onClick={() => setAviso('')} style={{
            background: 'none', border: 'none', color: '#ffb4b4', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px',
          }}>✕</button>
        </div>
      )}

      {editando && (
        <form onSubmit={handleGuardarEdit} style={{ background: 'rgba(18,40,61,0.85)', padding: '20px', borderRadius: '10px', marginTop: '20px' }}>
          <h3 style={{ marginTop: 0 }}>{t('localDetalle.editarLocal')}</h3>
          {errorEdit && <p style={{ color: '#f87171' }}>{errorEdit}</p>}
          <div style={{ marginBottom: '12px' }}>
            <label>{t('localDetalle.nombre')}:</label>
            <input value={formEdit.nombre} onChange={e => setFormEdit({ ...formEdit, nombre: e.target.value })} required style={estiloInput} />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label>{t('localDetalle.descripcion')}:</label>
            <textarea value={formEdit.descripcion} onChange={e => setFormEdit({ ...formEdit, descripcion: e.target.value })} rows={3} style={estiloInput} />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label>{t('localDetalle.direccion')}:</label>
            <input value={formEdit.direccion} onChange={e => setFormEdit({ ...formEdit, direccion: e.target.value })} style={estiloInput} />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label>{t('localDetalle.telefono')}:</label>
            <input value={formEdit.telefono} onChange={e => setFormEdit({ ...formEdit, telefono: e.target.value })} style={estiloInput} />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label>{t('localDetalle.categoria')}:</label>
            <select value={formEdit.id_categoria} onChange={e => setFormEdit({ ...formEdit, id_categoria: e.target.value })} style={estiloInput}>
              <option value="">{t('localDetalle.sinCategoria')}</option>
              {categoriasEdit.map(c => <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label>{t('localDetalle.municipio')}:</label>
            <select value={formEdit.id_municipio} onChange={e => setFormEdit({ ...formEdit, id_municipio: e.target.value })} style={estiloInput}>
              <option value="">{t('localDetalle.sinMunicipio')}</option>
              {municipiosEdit.map(m => <option key={m.id_municipio} value={m.id_municipio}>{m.nombre} - {m.departamento}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label>{t('localDetalle.agregarFotos')}:</label>
            <input type="file" accept=".jpg,.jpeg,.png,.webp" multiple onChange={(e) => setNuevasFotosEdit(Array.from(e.target.files))} style={{ color: 'white' }} />
            {nuevasFotosEdit.length > 0 && (
              <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', fontSize: '12px', color: '#ccff00' }}>
                {nuevasFotosEdit.map((f) => (
                  <li key={f.name}>{f.name}</li>
                ))}
              </ul>
            )}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" disabled={guardandoEdit} style={{ padding: '10px 18px', background: '#ccff00', color: '#12283d', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}>
              {guardandoEdit ? t('common.guardando') : t('common.guardarCambios')}
            </button>
            <button type="button" onClick={() => setEditando(false)} style={{ padding: '10px 18px', background: 'transparent', color: '#a9c9bb', border: '1px solid #a9c9bb', borderRadius: '6px', cursor: 'pointer' }}>
              {t('common.cancelar')}
            </button>
          </div>
        </form>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', margin: '15px 0 5px 0' }}>
        <h1 style={{ margin: 0 }}>{local.nombre}</h1>
        {(local.destacado === 1 || local.destacado === true) && (
          <span style={{
            background: 'rgba(0,200,255,0.2)', color: '#49c7ff',
            padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 'bold',
          }}>
            {t('localDetalle.oficial')}
          </span>
        )}
      </div>
      <p style={{ color: '#a9c9bb', margin: '0 0 15px 0' }}>
        {local.categoria || t('localDetalle.sinCategoria')} · {local.municipio || t('localDetalle.sinMunicipio')}
      </p>

      <p>{local.descripcion}</p>

      {local.direccion && <p><strong>{t('localDetalle.direccion')}:</strong> {local.direccion}</p>}
      {local.telefono && <p><strong>{t('localDetalle.telefono')}:</strong> {local.telefono}</p>}

      {(local.direccion || local.municipio) && (() => {
        const consultaMapa = [local.direccion, local.municipio, 'Colombia'].filter(Boolean).join(', ');
        return (
          <div style={{ marginTop: '20px' }}>
            <h2 style={{ marginBottom: '10px' }}>{t('localDetalle.ubicacion')}</h2>
            <iframe
              title={`${t('localDetalle.mapaDe')} ${local.nombre}`}
              src={`https://maps.google.com/maps?q=${encodeURIComponent(consultaMapa)}&z=15&output=embed`}
              style={{
                width: '100%',
                height: '300px',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '8px',
                display: 'block',
              }}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
            />
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(consultaMapa)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#ccff00', fontWeight: 'bold', textDecoration: 'none', display: 'inline-block', marginTop: '8px' }}
            >
              {t('localDetalle.abrirGoogleMaps')} ↗
            </a>
          </div>
        );
      })()}

      <hr style={{ margin: '25px 0', borderColor: 'rgba(255,255,255,0.15)' }} />

      {/* ===== PROMOCIONES / EVENTOS (PLANES) ===== */}
      <h2>{t('localDetalle.promocionesEventos')}</h2>

      {planes.length === 0 ? (
        <p>{t('localDetalle.sinPlanes')}</p>
      ) : (
        planes.map((plan) => (
          <div key={plan.id_plan} style={estiloTarjeta}>
            {planEditando === plan.id_plan ? (
              <form onSubmit={(e) => guardarEdicionPlan(e, plan)}>
                <h3 style={{ marginTop: 0 }}>{t('localDetalle.editarPromoEvento')}</h3>
                {errorEdicion && <p style={{ color: '#ffb4b4' }}>{errorEdicion}</p>}
                <input value={tituloEditado} onChange={(e) => setTituloEditado(e.target.value)} placeholder={t('localDetalle.titulo')} style={{ ...estiloInput, marginBottom: '8px' }} />
                <textarea value={descripcionEditada} onChange={(e) => setDescripcionEditada(e.target.value)} placeholder={t('localDetalle.descripcion')} style={{ ...estiloInput, minHeight: '60px', marginBottom: '8px' }} />
                <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                  <input type="date" value={fechaInicioEditada} onChange={(e) => setFechaInicioEditada(e.target.value)} style={{ ...estiloInput, flex: 1 }} />
                  <input type="date" value={fechaFinEditada} onChange={(e) => setFechaFinEditada(e.target.value)} style={{ ...estiloInput, flex: 1 }} />
                </div>
                <input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={(e) => setImagenEditadaFile(e.target.files[0])} style={{ marginBottom: '10px' }} />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" disabled={guardandoEdicion} style={{
                    backgroundColor: '#ccff00', color: '#12283d', border: 'none',
                    borderRadius: '6px', padding: '8px 14px', fontWeight: 'bold', cursor: 'pointer',
                    opacity: guardandoEdicion ? 0.6 : 1,
                  }}>{guardandoEdicion ? t('common.guardando') : t('common.guardarCambios')}</button>
                  <button type="button" onClick={cancelarEdicionPlan} style={{
                    background: 'transparent', border: '1px solid rgba(255,255,255,0.3)',
                    color: '#a9c9bb', borderRadius: '6px', padding: '8px 14px', cursor: 'pointer', fontWeight: 'bold',
                  }}>{t('common.cancelar')}</button>
                </div>
              </form>
            ) : (
              <>
                {plan.imagen_url && (
                  <img
                    src={resolverImagenUrl(plan.imagen_url)}
                    alt={plan.titulo}
                    style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', borderRadius: '6px', marginBottom: '10px' }}
                  />
                )}
                <h3 style={{ margin: '0 0 5px 0' }}>{plan.titulo}</h3>
                {plan.descripcion && <p style={{ margin: '0 0 5px 0' }}>{plan.descripcion}</p>}
                <p style={{ margin: 0, fontSize: '13px', color: '#a9c9bb' }}>
                  {t('localDetalle.vigenteDel', {
                    inicio: new Date(plan.fecha_inicio).toLocaleDateString(localeFecha()),
                    fin: new Date(plan.fecha_fin).toLocaleDateString(localeFecha()),
                  })}
                </p>
                {puedeGestionarPlanes && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    <button type="button" onClick={() => iniciarEdicionPlan(plan)} style={{
                      background: 'transparent', border: '1px solid rgba(255,255,255,0.3)',
                      color: '#a9c9bb', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontWeight: 'bold',
                    }}>
                      {t('common.editar')}
                    </button>
                    <button type="button" onClick={() => eliminarPlan(plan)} style={{
                      background: 'transparent', border: '1px solid rgba(255,128,128,0.4)',
                      color: '#ff8080', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontWeight: 'bold',
                    }}>
                      {t('common.eliminar')}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ))
      )}

      {puedeGestionarPlanes && (
        <div style={{ ...estiloTarjeta, borderStyle: 'dashed', marginTop: '20px' }}>
          <h3 style={{ marginTop: 0 }}>{t('localDetalle.crearPromoEvento')}</h3>

          {errorPlan && (
            <p style={{ color: '#ffb4b4', background: 'rgba(255,180,180,0.12)', padding: '8px', borderRadius: '6px' }}>{errorPlan}</p>
          )}
          {exitoPlan && (
            <p style={{ color: '#a9f0b4', background: 'rgba(169,240,180,0.12)', padding: '8px', borderRadius: '6px' }}>{exitoPlan}</p>
          )}

          <form onSubmit={handleCrearPlan}>
            <div style={{ marginBottom: '10px' }}>
              <label>{t('localDetalle.nombreEvento')}:</label><br />
              <input
                type="text"
                value={tituloPlan}
                onChange={(e) => setTituloPlan(e.target.value)}
                style={estiloInput}
              />
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label>{t('localDetalle.descripcionOpcional')}:</label><br />
              <textarea
                value={descripcionPlan}
                onChange={(e) => setDescripcionPlan(e.target.value)}
                style={{ ...estiloInput, minHeight: '60px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <div style={{ flex: 1 }}>
                <label>{t('localDetalle.fechaInicio')}:</label><br />
                <input
                  type="date"
                  value={fechaInicioPlan}
                  onChange={(e) => setFechaInicioPlan(e.target.value)}
                  style={estiloInput}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label>{t('localDetalle.fechaFin')}:</label><br />
                <input
                  type="date"
                  value={fechaFinPlan}
                  onChange={(e) => setFechaFinPlan(e.target.value)}
                  style={estiloInput}
                />
              </div>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label>{t('localDetalle.imagenOpcional')}:</label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={(e) => setImagenPlanFile(e.target.files[0])}
                style={{ display: 'block', marginTop: '5px' }}
              />
            </div>

            <button
              type="submit"
              disabled={enviandoPlan}
              style={{ padding: '10px 20px', background: '#ccff00', color: '#12283d', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              {enviandoPlan ? t('localDetalle.creando') : t('localDetalle.crearPromoEventoBtn')}
            </button>
          </form>
        </div>
      )}

      <hr style={{ margin: '25px 0', borderColor: 'rgba(255,255,255,0.15)' }} />

      {/* ===== CALIFICACIONES ===== */}
      <h2>
        {t('localDetalle.calificaciones')} {promedio && `— ${promedio} ⭐ (${calificaciones.length})`}
      </h2>

      {(() => {
        const esDueño = usuarioActual && local.id_usuario === usuarioActual.id;
        const yaCalifico = usuarioActual && calificaciones.some((c) => c.id_usuario === usuarioActual.id);

        if (esDueño) {
          return <p style={{ color: '#a9c9bb' }}>{t('localDetalle.noCalificarPropio')}</p>;
        }

        if (yaCalifico) {
          return <p style={{ color: '#a9c9bb' }}>{t('localDetalle.yaCalificaste')}</p>;
        }

        return isAuthenticated ? (
          <form onSubmit={handleCalificar} style={{ marginBottom: '25px' }}>
            {errorCalificacion && (
              <p style={{ color: '#ffb4b4', background: 'rgba(255,180,180,0.12)', padding: '8px', borderRadius: '6px' }}>{errorCalificacion}</p>
            )}

            <div style={{ marginBottom: '10px' }}>
              <label>{t('localDetalle.puntuacion')}:</label><br />
              <select
                value={puntuacion}
                onChange={(e) => setPuntuacion(e.target.value)}
                style={{ ...estiloInput, width: 'auto', padding: '8px' }}
              >
                <option value={5}>5 - {t('localDetalle.excelente')}</option>
                <option value={4}>4 - {t('localDetalle.muyBueno')}</option>
                <option value={3}>3 - {t('localDetalle.bueno')}</option>
                <option value={2}>2 - {t('localDetalle.regular')}</option>
                <option value={1}>1 - {t('localDetalle.malo')}</option>
              </select>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label>{t('localDetalle.comentarioOpcional')}:</label><br />
              <textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                style={{ ...estiloInput, minHeight: '60px' }}
              />
            </div>

            <button
              type="submit"
              disabled={enviando}
              style={{ padding: '10px 20px', background: '#ccff00', color: '#12283d', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              {enviando ? t('common.enviando') : t('localDetalle.enviarCalificacion')}
            </button>
          </form>
        ) : (
          <p>
            <Link to="/login" style={{ color: '#ccff00', fontWeight: 'bold' }}>{t('localDetalle.iniciaSesion')}</Link> {t('localDetalle.paraCalificar')}
          </p>
        );
      })()}

      {calificaciones.length === 0 ? (
        <p>{t('localDetalle.sinCalificaciones')}</p>
      ) : (
        calificaciones.map((c) => (
          <div key={c.id_resena} style={{ borderBottom: '1px solid rgba(255,255,255,0.15)', padding: '10px 0' }}>
            <strong>{c.usuario}</strong> — {c.puntuacion} ⭐
            {c.comentario && <p style={{ margin: '5px 0 0 0' }}>{c.comentario}</p>}
          </div>
        ))
      )}
    </div>

    {confirmacion && (
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 1500, background: 'rgba(0,0,0,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
        }}
        onClick={() => setConfirmacion(null)}
      >
        <div
          style={{
            maxWidth: '420px', width: '100%', background: '#12283d',
            border: '1px solid rgba(255,255,255,0.2)', borderRadius: '14px', padding: '24px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)', color: '#e2f3ff',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <h3 style={{ margin: '0 0 10px 0' }}>{t('localDetalle.confirmar')}</h3>
          <p style={{ margin: '0 0 20px 0', color: '#a9c9bb' }}>{confirmacion.mensaje}</p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setConfirmacion(null)}
              style={{
                padding: '9px 16px', background: 'transparent', border: '1px solid rgba(255,255,255,0.3)',
                color: '#a9c9bb', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold',
              }}
            >
              {t('common.cancelar')}
            </button>
            <button
              onClick={() => { const accion = confirmacion.accion; setConfirmacion(null); accion(); }}
              style={{
                padding: '9px 16px', background: '#ccff00', color: '#12283d',
                border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold',
              }}
            >
              {t('common.siContinuar')}
            </button>
          </div>
        </div>
      </div>
    )}
    </FondoPagina>
  );
}

export default LocalDetalle;