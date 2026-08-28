import { Link } from 'react-router-dom';

const SECCIONES = [
  {
    titulo: '1. Responsable del tratamiento',
    parrafos: ['Requintu (en adelante, "la aplicación") es una plataforma que conecta viajeros y usuarios con negocios locales de Colombia. Esta política explica qué datos personales recopilamos, para qué los usamos y qué derechos tienes sobre ellos.']
  },
  {
    titulo: '2. Datos que recopilamos',
    items: [
      'Cuenta: nombre, correo electrónico y contraseña (almacenada cifrada con bcrypt, nunca en texto plano).',
      'Localización e interés: departamento y municipios que consultas en el mapa para organizar la información por zonas.',
      'Contenido que publicas: locales creados, reseñas, calificaciones y publicaciones del muro, incluidos los textos que escribas.',
      'Imágenes: fotos que subes para tu perfil, locales u ofertas. Se almacenan de forma segura en servicios externos (Cloudinary).',
      'Datos técnicos: fecha y hora de acceso e identificadores de sesión necesarios para el funcionamiento.'
    ]
  },
  {
    titulo: '3. Finalidad del tratamiento',
    items: [
      'Crear y gestionar tu cuenta de usuario.',
      'Permitirte buscar, crear y reseñar negocios locales de Colombia.',
      'Mostrar el contenido del muro de publicaciones comunitarias.',
      'Enviarte correos de recuperación de contraseña cuando lo solicites.',
      'Garantizar la seguridad de la plataforma (prevención de abuso, contenido inapropiado y accesos no autorizados).'
    ],
    parrafos: ['No vendemos ni compartimos tus datos personales con terceros para fines publicitarios.']
  },
  {
    titulo: '4. Terceros que intervienen en el servicio',
    items: [
      'Infraestructura y base de datos: proveedor de alojamiento en la nube y base de datos administrada (TiDB Cloud).',
      'Almacenamiento de imágenes: Cloudinary.',
      'Correo transaccional: Brevo (solo para enviarte el enlace de recuperación de contraseña).',
      'Plataformas de distribución: Vercel (web) y Google Play (app Android).'
    ],
    parrafos: ['Estos proveedores solo acceden a los datos necesarios para prestar su servicio y cumplen sus propias políticas de seguridad.']
  },
  {
    titulo: '5. Seguridad de los datos',
    parrafos: ['Aplicamos medidas técnicas y organizativas: contraseñas cifradas (bcrypt), tokens de sesión con rotación, conexiones cifradas (HTTPS), validación de entradas y filtro de contenido inapropiado. Ningún sistema es infalible, pero actualizamos nuestras medidas de forma continua.']
  },
  {
    titulo: '6. Conservación de los datos',
    parrafos: ['Conservamos tus datos mientras tu cuenta esté activa. Si solicitas la eliminación de tu cuenta, borramos o anonimizamos tus datos personales, salvo aquello que la ley exija conservar.']
  },
  {
    titulo: '7. Tus derechos',
    parrafos: ['Puedes ejercer los derechos de acceso, rectificación, supresión y oposición escribiéndonos al correo que figura en el contacto. Desde tu perfil puedes editar tus datos, y la cuenta puede eliminarse a través de la propia aplicación o solicitándolo al administrador.']
  },
  {
    titulo: '8. Menores de edad',
    parrafos: ['El servicio está dirigido a mayores de 13 años. No recopilamos a sabiendas datos de menores de esa edad.']
  },
  {
    titulo: '9. Cambios en esta política',
    parrafos: ['Actualizaremos esta política cuando sea necesario. La versión vigente estará siempre disponible en esta página y, en caso de cambios relevantes, lo comunicaremos en la aplicación.']
  },
  {
    titulo: '10. Contacto',
    parrafos: ['Para cualquier duda sobre esta política de privacidad o el tratamiento de tus datos, escríbenos a: aycardy93@gmail.com.']
  }
];

function PoliticaPrivacidad() {
  return (
    <div style={{ background: '#f3f5f9', minHeight: '100vh', padding: '24px 16px 40px' }}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <h1 style={{ color: '#12283d', margin: 0, fontSize: '1.7em' }}>Política de privacidad de Requintu</h1>
          <p style={{ color: '#0284c7', marginTop: 6 }}>Última actualización: 28 de agosto de 2026</p>
        </div>

        {SECCIONES.map((s) => (
          <div
            key={s.titulo}
            style={{
              background: '#fff',
              borderRadius: 10,
              padding: '18px 20px',
              marginBottom: 14,
              boxShadow: '0 1px 4px rgba(18,40,61,.10)'
            }}
          >
            <h2 style={{ color: '#0ea5e9', margin: '0 0 8px', fontSize: '1.1em' }}>{s.titulo}</h2>
            {s.parrafos?.map((p) => <p key={p} style={{ margin: '6px 0', lineHeight: 1.55 }}>{p}</p>)}
            {s.items?.map((i) => (
              <li key={i} style={{ margin: '5px 0', lineHeight: 1.55 }}>{i}</li>
            ))}
          </div>
        ))}

        <div style={{ textAlign: 'center', marginTop: 18 }}>
          <Link to="/" style={{ color: '#0284c7', fontWeight: 'bold', textDecoration: 'none' }}>← Volver al inicio</Link>
        </div>
      </div>
    </div>
  );
}

export default PoliticaPrivacidad;