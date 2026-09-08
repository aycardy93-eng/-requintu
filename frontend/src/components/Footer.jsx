import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();
  return (
    <footer style={{
      backgroundColor: '#0c1f30',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      color: '#a9c9bb',
      fontFamily: 'sans-serif',
      fontSize: '13px',
      padding: '20px 20px 24px',
      textAlign: 'center',
    }}>
      <Link
        to="/politica-de-privacidad"
        style={{ color: '#ccff00', fontWeight: 'bold', textDecoration: 'none' }}
      >
        {t('footer.politica')}
      </Link>
      <div style={{ marginTop: '6px', opacity: 0.85 }}>
        {t('footer.copyright', { año: new Date().getFullYear() })}
      </div>
    </footer>
  );
}