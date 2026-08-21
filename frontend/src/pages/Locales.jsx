import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';

export default function Locales() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedMunicipality, setSelectedMunicipality] = useState('');

  // Datos de ejemplo
  const locales = [
    {
      id: 1,
      name: 'Café La Montaña',
      description: 'Cafetería artesanal en el centro del pueblo',
      category: 'Restaurante',
      department: 'Antioquia',
      municipality: 'Medellín',
      address: 'Calle 10 #5-20',
      image: ''
    },
    {
      id: 2,
      name: 'Café La Montaña',
      description: 'Cafetería artesanal en el centro del pueblo',
      category: 'Restaurante',
      department: 'Quindío',
      municipality: 'Quimbaya',
      address: 'Calle 10 #5-20',
      image: ''
    },
    {
      id: 3,
      name: 'Café La Montaña',
      description: 'Cafetería artesanal',
      category: 'Restaurante',
      department: 'Quindío',
      municipality: 'Quimbaya',
      address: '',
      image: ''
    }
  ];

  // Obtener lista única de departamentos
  const departments = useMemo(() => {
    return [...new Set(locales.map((l) => l.department).filter(Boolean))];
  }, [locales]);

  // Obtener municipios filtrados según el departamento seleccionado
  const municipalities = useMemo(() => {
    const filtered = selectedDepartment
      ? locales.filter((l) => l.department === selectedDepartment)
      : locales;
    return [...new Set(filtered.map((l) => l.municipality).filter(Boolean))];
  }, [locales, selectedDepartment]);

  // Filtrado final de locales
  const filteredLocales = locales.filter((local) => {
    const matchesSearch = local.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory ? local.category === selectedCategory : true;
    const matchesDepartment = selectedDepartment ? local.department === selectedDepartment : true;
    const matchesMunicipality = selectedMunicipality ? local.municipality === selectedMunicipality : true;

    return matchesSearch && matchesCategory && matchesDepartment && matchesMunicipality;
  });

  return (
    <div style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>Locales turísticos</h1>
        <Link to="/" style={{ color: '#0284c7', textDecoration: 'none', fontWeight: '500' }}>
          ← Volver
        </Link>
      </div>

      {/* Barra de Filtros */}
      <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '30px' }}>
        <input
          type="text"
          placeholder="Buscar por nombre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: '1 1 200px',
            padding: '10px 14px',
            borderRadius: '6px',
            border: '1px solid #ccc',
            fontSize: '14px'
          }}
        />

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={{
            padding: '10px 14px',
            borderRadius: '6px',
            border: '1px solid #ccc',
            backgroundColor: '#fff',
            fontSize: '14px'
          }}
        >
          <option value="">Todas las categorías</option>
          <option value="Restaurante">Restaurante</option>
          <option value="Hotel">Hotel</option>
          <option value="Artesanías">Artesanías</option>
        </select>

        <select
          value={selectedDepartment}
          onChange={(e) => {
            setSelectedDepartment(e.target.value);
            setSelectedMunicipality(''); // Reinicia el municipio al cambiar de departamento
          }}
          style={{
            padding: '10px 14px',
            borderRadius: '6px',
            border: '1px solid #ccc',
            backgroundColor: '#fff',
            fontSize: '14px'
          }}
        >
          <option value="">Todos los departamentos</option>
          {departments.map((dept, index) => (
            <option key={index} value={dept}>
              {dept}
            </option>
          ))}
        </select>

        <select
          value={selectedMunicipality}
          onChange={(e) => setSelectedMunicipality(e.target.value)}
          style={{
            padding: '10px 14px',
            borderRadius: '6px',
            border: '1px solid #ccc',
            backgroundColor: '#fff',
            fontSize: '14px'
          }}
        >
          <option value="">Todos los municipios</option>
          {municipalities.map((muni, index) => (
            <option key={index} value={muni}>
              {muni}
            </option>
          ))}
        </select>
      </div>

      {/* Grid de Tarjetas */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '20px'
        }}
      >
        {filteredLocales.map((local) => (
          <div
            key={local.id}
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              backgroundColor: '#fff'
            }}
          >
            <div
              style={{
                height: '180px',
                backgroundColor: '#f3f4f6',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                color: '#9ca3af'
              }}
            >
              {local.image ? (
                <img src={local.image} alt={local.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                'Sin imagen'
              )}
            </div>
            <div style={{ padding: '15px' }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', color: '#111827' }}>{local.name}</h3>
              <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#4b5563' }}>{local.description}</p>
              <p style={{ margin: '0 0 5px 0', fontSize: '13px', color: '#6b7280' }}>
                {local.category} · {local.municipality}{local.department ? `, ${local.department}` : ''}
              </p>
              {local.address && (
                <p style={{ margin: 0, fontSize: '13px', color: '#9ca3af' }}>{local.address}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}