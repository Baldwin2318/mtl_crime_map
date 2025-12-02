import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// source data: https://donnees.montreal.ca/dataset/actes-criminels
//              https://www.donneesquebec.ca/recherche/dataset/vmtl-actes-criminels/resource/c6f482bf-bf0f-4960-8b2f-9982c211addd?utm_source=chatgpt.com
const URL = 'https://donnees.montreal.ca/dataset/5829b5b0-ea6f-476f-be94-bc2b8797769a/resource/aacc4576-97b3-4d8d-883d-22bbca41dbe6/download/actes-criminels.geojson'

// Simple category translations (extend as needed)
const translations = {
  'Infraction entraînant la mort': 'Offense leading to death',
  'Introduction': 'Breaking and entering',
  'Méfait': 'Mischief / vandalism',
  'Vol dans / sur véhicule à moteur': 'Theft from/in a motor vehicle',
  'Vol de véhicule à moteur': 'Motor vehicle theft',
  'Vols qualifiés': 'Robbery',
}

export default function App() {
  const [raw, setRaw] = useState(null)
  const [category, setCategory] = useState('Vol de véhicule à moteur') // default car theft
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [categories, setCategories] = useState([])
  const [years, setYears] = useState([])
  const [err, setErr] = useState(null)

  // fetch ONCE
  useEffect(() => {
    fetch(URL)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(json => {
        setRaw(json)
        // build options dynamically so labels match accents exactly
        const cats = new Set()
        const yrs = new Set()
        for (const f of json.features || []) {
          const p = f.properties || {}
          if (p.CATEGORIE) cats.add(p.CATEGORIE)
          if (typeof p.DATE === 'string' && p.DATE.length >= 4) yrs.add(p.DATE.slice(0,4))
        }
        setCategories(Array.from(cats).sort((a,b)=>a.localeCompare(b)))
        setYears(Array.from(yrs).sort((a,b)=>Number(b)-Number(a)))
      })
      .catch(e => setErr(e.message))
  }, [])

  // filter in memory
  const filtered = useMemo(() => {
    if (!raw?.features) return null
    const feats = raw.features.filter(f => {
      const p = f.properties || {}
      const y = (p.DATE || '').slice(0,4)
      const catOK = !category || p.CATEGORIE === category
      const yearOK = !year || y === year
      return catOK && yearOK
    })
    return { type: 'FeatureCollection', features: feats }
  }, [raw, category, year])

  // const label = (c) => `${translations[c] ?? c} (${c})` // e.g., "Motor vehicle theft (Vol de véhicule à moteur)"
  const label = (c) => `${translations[c] ?? c}` // e.g., "Motor vehicle theft"

  return (
    <div>
      <div style={{ position: 'fixed', display:'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, backgroundColor: '#b6b6b6af', height: '100%', width: '100%', visibility: filtered ? 'hidden' : 'visible'}}>
        Loading...
      </div>
      <div style={{ height: '100vh', display: 'grid', gridTemplateRows: 'auto 1fr auto' }}>
        {/* Controls */}
        <div style={{ padding: 8, borderBottom: '1px solid #ddd', display: 'flex', gap: 12, alignItems: 'center' }}>
          <label>
            Category:{' '}
            <select value={category} onChange={e => setCategory(e.target.value)}>
              {/* keep default visible even before fetch completes */}
              {!categories.includes('Vol de véhicule à moteur') && (
                <option value="Vol de véhicule à moteur">{label('Vol de véhicule à moteur')}</option>
              )}
              {categories.map(c => <option key={c} value={c}>{label(c)}</option>)}
            </select>
          </label>
          <label>
            Year:{' '}
            <select value={year} onChange={e => setYear(e.target.value)}>
              {!years.includes(String(new Date().getFullYear())) && (
                <option value={String(new Date().getFullYear())}>{String(new Date().getFullYear())}</option>
              )}
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </label>
          <span style={{ marginLeft: 'auto', fontSize: 13, color: '#555' }}>
            {filtered ? `${filtered.features.length.toLocaleString()} records` : ''}
          </span>
        </div>

        {/* Map */}
        <div style={{ height: '100%' }}>
          <MapContainer center={[45.55, -73.65]} zoom={11} style={{ height: '100%', width: '100%' }}>
            <TileLayer attribution="© OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {filtered && (
              <GeoJSON
                key={`${category}-${year}-${filtered.features.length}`} 
                data={filtered}
                pointToLayer={(_, latlng) => L.circleMarker(latlng, { radius: 5 })}
                onEachFeature={(f, layer) => {
                  const p = f.properties || {}
                  const eng = translations[p.CATEGORIE] || p.CATEGORIE
                  layer.bindPopup(
                    `<b>${eng}</b><br><small>${p.CATEGORIE}</small><br>${p.DATE || ''} — ${p.QUART || ''}<br>PDQ: ${p.PDQ || '—'}`
                  )
                }}
              />
            )}
          </MapContainer>
        </div>
        <footer style={{ padding: 8, borderTop: '1px solid #ddd', fontSize: 12, textAlign: 'center' }}>
          Crime data © Ville de Montréal / SPVM – “Actes criminels”, 
          licence CC BY 4.0. Visualization by <b>Malabanan</b>.
        </footer>
        
        {err && (
          <div style={{ position: 'absolute', top: 8, left: 8, background: '#fee2e2', color: '#991b1b', padding: '6px 10px', borderRadius: 8 }}>{String(err)}</div>
        )}
      </div>
    </div>
  )
}


//NOTE
/**
 * To run the program and debug,
 * run npm dev
 */