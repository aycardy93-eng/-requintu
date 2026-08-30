import { useState, useEffect } from 'react';

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showIOSHelp, setShowIOSHelp] = useState(false);

  useEffect(() => {
    if (isStandalone) return;

    if (isIOS) {
      const dismissed = sessionStorage.getItem('pwa-ios-dismissed');
      if (!dismissed) {
        setShowBanner(true);
      }
      return;
    }

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
    if (isIOS) {
      sessionStorage.setItem('pwa-ios-dismissed', 'true');
    } else {
      sessionStorage.setItem('pwa-dismissed', 'true');
    }
  };

  if (isStandalone || !showBanner) return null;

  if (showIOSHelp) {
    return (
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'linear-gradient(135deg, #12283d, #0d1f30)',
        borderTop: '1px solid rgba(204,255,0,0.35)',
        color: 'white', padding: '16px', zIndex: 9999,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div>
            <strong style={{ fontSize: 15 }}>Instalar Requintu en iPhone</strong>
            <ol style={{ margin: '8px 0', paddingLeft: '18px', fontSize: 13, lineHeight: 1.8 }}>
              <li>Toca el botón <strong>Compartir</strong> abajo</li>
              <li>Desplaza hacia abajo y toca <strong>"Agregar a pantalla de inicio"</strong></li>
              <li>Toca <strong>"Agregar"</strong> arriba a la derecha</li>
            </ol>
          </div>
          <button onClick={() => { setShowIOSHelp(false); handleDismiss(); }} style={{
            background: 'transparent', border: '1px solid rgba(255,255,255,0.4)',
            color: 'white', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 11, flexShrink: 0, marginLeft: 8
          }}>Cerrar</button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button onClick={() => { setShowIOSHelp(false); handleDismiss(); }} style={{
            flex: 1, background: 'transparent', border: '1px solid rgba(255,255,255,0.4)',
            color: 'white', padding: '8px', borderRadius: 6, cursor: 'pointer', fontSize: 12
          }}>Ahora no</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: 'linear-gradient(135deg, #12283d, #0d1f30)',
      borderTop: '1px solid rgba(204,255,0,0.35)',
      color: 'white', padding: '12px 16px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      boxShadow: '0 -4px 20px rgba(0,0,0,0.3)', zIndex: 9999, gap: '10px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
        <img src="/icon-192.png" alt="" style={{ width: 36, height: 36, borderRadius: 8 }} />
        <div style={{ fontSize: 13, lineHeight: 1.3 }}>
          <strong>Instalar Requintu</strong>
          <div style={{ opacity: 0.85, fontSize: 11 }}>Accede rápido desde tu pantalla de inicio</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button onClick={() => {
          if (isIOS) { setShowIOSHelp(true); } else { handleDismiss(); }
        }} style={{
          background: 'transparent', border: '1px solid rgba(255,255,255,0.4)',
          color: 'white', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12
        }}>{isIOS ? 'Cómo instalar' : 'Ahora no'}</button>
        {isIOS ? (
          <button onClick={() => setShowIOSHelp(true)} style={{
            background: 'white', color: '#12283d', border: 'none',
            padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold', fontSize: 12
          }}>Ver pasos</button>
        ) : (
          <button onClick={handleInstall} style={{
            background: '#ccff00', color: '#12283d', border: 'none',
            padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold', fontSize: 12
          }}>Instalar</button>
        )}
      </div>
    </div>
  );
}
