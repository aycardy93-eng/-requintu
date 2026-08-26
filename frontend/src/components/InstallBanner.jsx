import { useState, useEffect } from 'react';

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const dismissed = sessionStorage.getItem('pwa-dismissed');
      if (!dismissed) {
        setShowBanner(true);
      }
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowBanner(false);
    if (outcome === 'accepted') {
      sessionStorage.setItem('pwa-installed', 'true');
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    sessionStorage.setItem('pwa-dismissed', 'true');
  };

  if (!showBanner || !deferredPrompt) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: 'linear-gradient(135deg, #0284c7, #0369a1)',
      color: 'white',
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
      zIndex: 9999,
      gap: '10px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
        <img src="/icon-192.png" alt="" style={{ width: 36, height: 36, borderRadius: 8 }} />
        <div style={{ fontSize: 13, lineHeight: 1.3 }}>
          <strong>Instalar Requintu</strong>
          <div style={{ opacity: 0.85, fontSize: 11 }}>Accede rapido desde tu pantalla de inicio</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button onClick={handleDismiss} style={{
          background: 'transparent', border: '1px solid rgba(255,255,255,0.4)',
          color: 'white', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12
        }}>Ahora no</button>
        <button onClick={handleInstall} style={{
          background: 'white', color: '#0284c7', border: 'none',
          padding: '6px 14px', borderRadius: 6, cursor: 'pointer',
          fontWeight: 'bold', fontSize: 12
        }}>Instalar</button>
      </div>
    </div>
  );
}
