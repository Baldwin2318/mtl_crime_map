import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import Chart from './components/Chart'

// source data: https://donnees.montreal.ca/dataset/actes-criminels
//              https://www.donneesquebec.ca/recherche/dataset/vmtl-actes-criminels/resource/c6f482bf-bf0f-4960-8b2f-9982c211addd?utm_source=chatgpt.com
//              https://donnees.montreal.ca/dataset/limites-pdq-spvm
const URL_DATA_CRIME = 'https://donnees.montreal.ca/dataset/5829b5b0-ea6f-476f-be94-bc2b8797769a/resource/aacc4576-97b3-4d8d-883d-22bbca41dbe6/download/actes-criminels.geojson'
const URL_PDQ_1 = 'https://donnees.montreal.ca/dataset/186892b8-bba5-426c-aa7e-9db8c43cbdfe/resource/e18f0da9-3a16-4ba4-b378-59f698b47261/download/limitespdq.geojson'
const URL_PDQ_2 = '/limitespdq_wgs84.geojson'

const PDQ_BASE_STYLE = { weight: 1, color: '#333', fillOpacity: 0, }
const PDQ_HOVER_STYLE = {  weight: 3, color: '#2563eb', fillOpacity: 0.8, }

export default function App() {
  const [raw, setRaw] = useState(null)
  const [category, setCategory] = useState('Vol de véhicule à moteur') // default car theft
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [categories, setCategories] = useState([])
  const [years, setYears] = useState([])
  const [err, setErr] = useState(null)
  const [pdq, setPdq] = useState(null)  

  // fetch ONCE
  useEffect(() => {
    const promise_1 = fetch(URL_DATA_CRIME)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(json => {
        setRaw(json)
        console.log(json)
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
      
    const promise_2 = fetch(URL_PDQ_2)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(json => {
        setPdq(json)
      })
    
    var Promise1 = Promise.all(promise_1) //.catch(e => setErr(e.message))
    var Promise2 = Promise.all(promise_2) //.catch(e => setErr(e.message))
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

  const [showChart, setShowChart] = useState(false)
  const [showPDQ, setShowPDQ] = useState(false)

  const tag = import.meta.env.VITE_GIT_TAG
  const commit = import.meta.env.VITE_GIT_COMMIT
  const build = import.meta.env.VITE_BUILD_DATE

  return (
    <div>
      <div style={{ position: 'fixed', display:'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, backgroundColor: '#b6b6b6af', height: '100%', width: '100%', visibility: filtered ? 'hidden' : 'visible'}}>
        Chargement...
      </div>
      <div style={{ height: '100vh', display: 'grid', gridTemplateRows: 'auto 1fr auto' }}>
        {/* Controls */}
        <div style={{ padding: 8, borderBottom: '1px solid #ddd', display: 'flex', gap: 12, alignItems: 'center' }}>
          <label>
            Catégorie:{' '}
            <select value={category} onChange={e => setCategory(e.target.value)}>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label>
            Année:{' '}
            <select value={year} onChange={e => setYear(e.target.value)}>
              {!years.includes(String(new Date().getFullYear())) && (
                <option value={String(new Date().getFullYear())}>{String(new Date().getFullYear())}</option>
              )}
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </label>
          <button onClick={() => setShowChart(true)}>Show Chart</button>
          <button onClick={() => setShowPDQ(v => !v)}>{showPDQ ? "Disable PDQ" : "Enable PDQ"}</button>
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
                pointToLayer={(_, latlng) => L.circleMarker(latlng, { radius: 2, color: '#ff1010ff' })}
                onEachFeature={(f, layer) => {
                  const p = f.properties || {}
                  const eng = p.CATEGORIE
                  layer.bindPopup(
                    `<b>${eng}</b><br><small>${p.CATEGORIE}</small><br>${p.DATE || ''} — ${p.QUART || ''}<br>PDQ: ${p.PDQ || '—'}`
                  )
                }}
              />
            )}

            {showPDQ && pdq && (
              <GeoJSON
                data={pdq}
                style={() => PDQ_BASE_STYLE}
                onEachFeature={(feature, layer) => {
                  // const id = feature?.properties?.PDQ
                  // if (id != null) {
                  //   layer.bindTooltip(String(id), {
                  //     permanent: true,
                  //     direction: 'center',
                  //     className: 'pdq-label',
                  //   })
                  // }

                  layer.on({
                    mouseover: (e) => {
                      e.target.setStyle(PDQ_HOVER_STYLE)
                      if (e.target.bringToFront) e.target.bringToFront()
                      const map = e.target._map
                      if (map) map.getContainer().style.cursor = 'pointer'
                    },
                    mouseout: (e) => {
                      e.target.setStyle(PDQ_BASE_STYLE)
                      const map = e.target._map
                      if (map) map.getContainer().style.cursor = ''
                    },
                  })
                }}
              />
            )}

          </MapContainer>
        </div>

        {/* Overlays */}
        {showChart && <Chart data={filtered} category={category} onClose={() => setShowChart(false)} />}

        <footer style={{ padding: 8, borderTop: '1px solid #ddd', fontSize: 12, textAlign: 'center' }}>
        Données sur la criminalité © Ville de Montréal / SPVM – « Actes criminels », 
        licence CC BY 4.0. Visualisation par <b>Baldwin Malabanan</b>. {tag}
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
 * npm run dev
 */