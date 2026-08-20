import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, Navigation, EffectFade } from 'swiper/modules';

// Nombres exactos de tu carpeta assets
import imgArmenia from '../assets/armenia1.jpg';
import imgBogota from '../assets/bogota.jpg';
import imgBucaramanga from '../assets/bucaramanga.jpg';

import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';
import 'swiper/css/effect-fade';

const imagenesInicio = [
  {
    id: 1,
    url: imgArmenia,
    titulo: 'Armenia',
    subtitulo: 'Ciudad Milagro en el corazón del Eje Cafetero'
  },
  {
    id: 2,
    url: imgBogota,
    titulo: 'Bogotá',
    subtitulo: 'Capital cultural y gastronómica de Colombia'
  },
  {
    id: 3,
    url: imgBucaramanga,
    titulo: 'Bucaramanga',
    subtitulo: 'La ciudad bonita de Colombia'
  }
];

export default function Home() {
  return (
    <div style={{ width: '100%', margin: 0, padding: 0, overflowX: 'hidden' }}>
      <Swiper
        modules={[Autoplay, Pagination, Navigation, EffectFade]}
        effect={'fade'}
        fadeEffect={{ crossFade: true }}
        slidesPerView={1}
        loop={true}
        autoplay={{
          delay: 4000,
          disableOnInteraction: false,
        }}
        pagination={{ clickable: true }}
        navigation={true}
        style={{ width: '100vw', height: 'calc(100vh - 70px)' }}
      >
        {imagenesInicio.map((item) => (
          <SwiperSlide key={item.id} style={{ position: 'relative', width: '100%', height: '100%' }}>
            <img
              src={item.url}
              alt={item.titulo}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div style={estilos.overlay}>
              <h1 style={{ margin: '0 0 10px 0', fontSize: '2.5rem', fontWeight: 'bold' }}>{item.titulo}</h1>
              <p style={{ margin: 0, fontSize: '1.3rem', opacity: 0.9 }}>{item.subtitulo}</p>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}

const estilos = {
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '50px 20px',
    background: 'linear-gradient(transparent, rgba(0, 0, 0, 0.85))',
    color: '#ffffff',
    textAlign: 'center',
    pointerEvents: 'none',
  }
};