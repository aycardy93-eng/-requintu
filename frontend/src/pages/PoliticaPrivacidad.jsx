import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

function PoliticaPrivacidad() {
  const { t } = useTranslation();

  const secciones = t('politica.secciones', { returnObjects: true });

  return (
    <div style={{ background: 'linear-gradient(135deg, #0c1f30 0%, #12283d 55%, #1c3b56 100%)', minHeight: '100vh', padding: '24px 16px 40px' }}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <h1 style={{ color: '#e2f3ff', margin: 0, fontSize: '1.7em' }}>{t('politica.titulo')}</h1>
          <p style={{ color: '#a9c9bb', marginTop: 6 }}>{t('politica.actualizada')}</p>
        </div>

        {Array.isArray(secciones) && secciones.map((s, indice) => (
          <div
            key={indice}
            style={{
              background: 'rgba(18,40,61,0.55)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10,
              padding: '18px 20px',
              marginBottom: 14
            }}
          >
            <h2 style={{ color: '#ccff00', margin: '0 0 8px', fontSize: '1.1em' }}>{s.titulo}</h2>
            {Array.isArray(s.parrafos) && s.parrafos.map((p, i) => <p key={i} style={{ margin: '6px 0', lineHeight: 1.55, color: '#e2f3ff' }}>{p}</p>)}
            {Array.isArray(s.items) && s.items.map((item, i) => (
              <li key={i} style={{ margin: '5px 0', lineHeight: 1.55, color: '#e2f3ff' }}>{item}</li>
            ))}
          </div>
        ))}

        <div style={{ textAlign: 'center', marginTop: 18 }}>
          <Link to="/" style={{ color: '#ccff00', fontWeight: 'bold', textDecoration: 'none' }}>← {t('politica.volver')}</Link>
        </div>
      </div>
    </div>
  );
}

export default PoliticaPrivacidad;