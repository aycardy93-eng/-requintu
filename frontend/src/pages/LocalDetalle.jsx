import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API_URL = 'http://localhost:3000/api';

function LocalDetalle() {
  const { id } = useParams();
  const { token, isAuthenticated, usuario: usuarioActual } = useAuth();

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
        throw new Error(data.message || 'Error al enviar la calificación.');
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
      setErrorPlan('Nombre del evento, fecha de inicio y fecha de fin son obligatorios.');
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
          throw new Error(uploadData.message || 'Error al subir la imagen.');
        }

        imagen_url = uploadData.imagen_url;
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
        throw new Error(data.message || 'Error al crear el plan.');
      }

      setExitoPlan('¡Promoción/evento creado con éxito!');
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
      setErrorEdicion('El título y las fechas son obligatorios.');
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
          throw new Error(uploadData.message || 'Error al subir la imagen.');
        }

        imagen_url = uploadData.imagen_url;
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
        throw new Error(data.message || 'Error al actualizar la promoción o evento.');
      }

      cancelarEdicionPlan();
      setExitoPlan('Promoción/evento actualizado correctamente.');
      cargarDatos();
    } catch (err) {
      setErrorEdicion(err.message);
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const eliminarPlan = async (plan) => {
    const confirmar = window.confirm(`¿Eliminar "${plan.titulo}"? Esta acción no se puede deshacer.`);
    if (!confirmar) return;

    try {
      const res = await fetch(`${API_URL}/planes/${plan.id_plan}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Error al eliminar la promoción o evento.');
      }

      if (planEditando === plan.id_plan) {
        cancelarEdicionPlan();
      }
      setExitoPlan('Promoción/evento eliminado correctamente.');
      cargarDatos();
    } catch (err) {
      alert(err.message);
    }
  };

  if (cargando) return <p style={{ padding: '20px' }}>Cargando...</p>;
  if (error) return <p style={{ padding: '20px', color: 'red' }}>{error}</p>;
  if (!local) return <p style={{ padding: '20px' }}>Local no encontrado.</p>;

  const puedeGestionarPlanes = usuarioActual && (
    local.id_usuario === usuarioActual.id || usuarioActual.rol === 'admin'
  );

  return (
    <div style={{ maxWidth: '700px', margin: '30px auto', fontFamily: 'sans-serif', padding: '0 15px' }}>
      <Link to="/locales">← Volver a locales</Link>

      {local.imagen_url ? (
        <img
          src={local.imagen_url}
          alt={local.nombre}
          style={{ width: '100%', maxHeight: '300px', objectFit: 'cover', borderRadius: '8px', margin: '15px 0' }}
        />
      ) : (
        <div style={{ width: '100%', height: '200px', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', borderRadius: '8px', margin: '15px 0' }}>
          Sin imagen
        </div>
      )}

      <h1 style={{ margin: '0 0 5px 0' }}>{local.nombre}</h1>
      <p style={{ color: '#888', margin: '0 0 15px 0' }}>
        {local.categoria || 'Sin categoría'} · {local.municipio || 'Sin municipio'}
      </p>

      <p>{local.descripcion}</p>

      {local.direccion && <p><strong>Dirección:</strong> {local.direccion}</p>}
      {local.telefono && <p><strong>Teléfono:</strong> {local.telefono}</p>}

      <hr style={{ margin: '25px 0' }} />

      {/* ===== PROMOCIONES / EVENTOS (PLANES) ===== */}
      <h2>Promociones y eventos</h2>

      {planes.length === 0 ? (
        <p>Este local no tiene promociones o eventos activos por ahora.</p>
      ) : (
        planes.map((plan) => (
          <div key={plan.id_plan} style={{ border: '1px solid #eee', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
            {planEditando === plan.id_plan ? (
              <form onSubmit={(e) => guardarEdicionPlan(e, plan)}>
                <h3 style={{ marginTop: 0 }}>Editar promoción o evento</h3>
                {errorEdicion && <p style={{ color: 'red' }}>{errorEdicion}</p>}
                <input value={tituloEditado} onChange={(e) => setTituloEditado(e.target.value)} placeholder="Título" style={{ width: '100%', padding: '8px', marginBottom: '8px' }} />
                <textarea value={descripcionEditada} onChange={(e) => setDescripcionEditada(e.target.value)} placeholder="Descripción" style={{ width: '100%', padding: '8px', minHeight: '60px', marginBottom: '8px' }} />
                <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                  <input type="date" value={fechaInicioEditada} onChange={(e) => setFechaInicioEditada(e.target.value)} style={{ flex: 1, padding: '8px' }} />
                  <input type="date" value={fechaFinEditada} onChange={(e) => setFechaFinEditada(e.target.value)} style={{ flex: 1, padding: '8px' }} />
                </div>
                <input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={(e) => setImagenEditadaFile(e.target.files[0])} style={{ marginBottom: '10px' }} />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" disabled={guardandoEdicion}>{guardandoEdicion ? 'Guardando...' : 'Guardar cambios'}</button>
                  <button type="button" onClick={cancelarEdicionPlan}>Cancelar</button>
                </div>
              </form>
            ) : (
              <>
                {plan.imagen_url && (
                  <img
                    src={plan.imagen_url}
                    alt={plan.titulo}
                    style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', borderRadius: '6px', marginBottom: '10px' }}
                  />
                )}
                <h3 style={{ margin: '0 0 5px 0' }}>{plan.titulo}</h3>
                {plan.descripcion && <p style={{ margin: '0 0 5px 0' }}>{plan.descripcion}</p>}
                <p style={{ margin: 0, fontSize: '13px', color: '#888' }}>
                  Vigente del {new Date(plan.fecha_inicio).toLocaleDateString('es-CO')} al {new Date(plan.fecha_fin).toLocaleDateString('es-CO')}
                </p>
                {puedeGestionarPlanes && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    <button type="button" onClick={() => iniciarEdicionPlan(plan)}>
                      Editar
                    </button>
                    <button type="button" onClick={() => eliminarPlan(plan)} style={{ color: '#b00020' }}>
                      Eliminar
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ))
      )}

      {puedeGestionarPlanes && (
        <div style={{ marginTop: '20px', padding: '15px', border: '1px dashed #aaa', borderRadius: '8px' }}>
          <h3 style={{ marginTop: 0 }}>Crear nueva promoción o evento</h3>

          {errorPlan && (
            <p style={{ color: 'red', background: '#fee', padding: '8px' }}>{errorPlan}</p>
          )}
          {exitoPlan && (
            <p style={{ color: 'green', background: '#efe', padding: '8px' }}>{exitoPlan}</p>
          )}

          <form onSubmit={handleCrearPlan}>
            <div style={{ marginBottom: '10px' }}>
              <label>Nombre del evento:</label><br />
              <input
                type="text"
                value={tituloPlan}
                onChange={(e) => setTituloPlan(e.target.value)}
                style={{ width: '100%', padding: '8px' }}
              />
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label>Descripción (opcional):</label><br />
              <textarea
                value={descripcionPlan}
                onChange={(e) => setDescripcionPlan(e.target.value)}
                style={{ width: '100%', padding: '8px', minHeight: '60px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <div style={{ flex: 1 }}>
                <label>Fecha de inicio:</label><br />
                <input
                  type="date"
                  value={fechaInicioPlan}
                  onChange={(e) => setFechaInicioPlan(e.target.value)}
                  style={{ width: '100%', padding: '8px' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label>Fecha de fin:</label><br />
                <input
                  type="date"
                  value={fechaFinPlan}
                  onChange={(e) => setFechaFinPlan(e.target.value)}
                  style={{ width: '100%', padding: '8px' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label>Imagen (opcional):</label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={(e) => setImagenPlanFile(e.target.files[0])}
                style={{ display: 'block', marginTop: '5px' }}
              />
            </div>

            <button type="submit" disabled={enviandoPlan} style={{ padding: '10px 20px' }}>
              {enviandoPlan ? 'Creando...' : 'Crear promoción/evento'}
            </button>
          </form>
        </div>
      )}

      <hr style={{ margin: '25px 0' }} />

      {/* ===== CALIFICACIONES ===== */}
      <h2>
        Calificaciones {promedio && `— ${promedio} ⭐ (${calificaciones.length})`}
      </h2>

      {(() => {
        const yaCalifico = usuarioActual && calificaciones.some((c) => c.id_usuario === usuarioActual.id);

        if (yaCalifico) {
          return <p style={{ color: '#666' }}>Ya calificaste este local. ¡Gracias por tu opinión!</p>;
        }

        return isAuthenticated ? (
          <form onSubmit={handleCalificar} style={{ marginBottom: '25px' }}>
            {errorCalificacion && (
              <p style={{ color: 'red', background: '#fee', padding: '8px' }}>{errorCalificacion}</p>
            )}

            <div style={{ marginBottom: '10px' }}>
              <label>Puntuación:</label><br />
              <select
                value={puntuacion}
                onChange={(e) => setPuntuacion(e.target.value)}
                style={{ padding: '8px' }}
              >
                <option value={5}>5 - Excelente</option>
                <option value={4}>4 - Muy bueno</option>
                <option value={3}>3 - Bueno</option>
                <option value={2}>2 - Regular</option>
                <option value={1}>1 - Malo</option>
              </select>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label>Comentario (opcional):</label><br />
              <textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                style={{ width: '100%', padding: '8px', minHeight: '60px' }}
              />
            </div>

            <button type="submit" disabled={enviando} style={{ padding: '10px 20px' }}>
              {enviando ? 'Enviando...' : 'Enviar calificación'}
            </button>
          </form>
        ) : (
          <p>
            <Link to="/login">Inicia sesión</Link> para calificar este local.
          </p>
        );
      })()}

      {calificaciones.length === 0 ? (
        <p>Este local aún no tiene calificaciones.</p>
      ) : (
        calificaciones.map((c) => (
          <div key={c.id_resena} style={{ borderBottom: '1px solid #eee', padding: '10px 0' }}>
            <strong>{c.usuario}</strong> — {c.puntuacion} ⭐
            {c.comentario && <p style={{ margin: '5px 0 0 0' }}>{c.comentario}</p>}
          </div>
        ))
      )}
    </div>
  );
}

export default LocalDetalle;
