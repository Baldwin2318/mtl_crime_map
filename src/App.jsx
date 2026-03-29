import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import Chart from './components/Chart'
import Loading from './components/Loading.jsx'

// source data: https://donnees.montreal.ca/dataset/actes-criminels
//              https://www.donneesquebec.ca/recherche/dataset/vmtl-actes-criminels/resource/c6f482bf-bf0f-4960-8b2f-9982c211addd?utm_source=chatgpt.com
//              https://donnees.montreal.ca/dataset/limites-pdq-spvm
//              https://donnees.montreal.ca/dataset/carte-postes-quartier
const URL_DATA_CRIME = 'https://donnees.montreal.ca/dataset/5829b5b0-ea6f-476f-be94-bc2b8797769a/resource/aacc4576-97b3-4d8d-883d-22bbca41dbe6/download/actes-criminels.geojson'
const URL_PDQ = '/limitespdq_wgs84.geojson'

const PDQ_BASE_STYLE = { weight: 3, color: '#333333ff', dashArray: '4 4', fill: true, fillOpacity: 0 };
const PDQ_HOVER_STYLE = { weight: 4, color: '#1d4ed8', dashArray: '', fill: true, fillOpacity: 0.82 }

function getPdqFillColor(count, maxCount) {
  if (!count || !maxCount) return '#e5e7eb'

  const intensity = count / maxCount
  if (intensity > 0.8) return '#7f1d1d'
  if (intensity > 0.6) return '#b91c1c'
  if (intensity > 0.4) return '#dc2626'
  if (intensity > 0.2) return '#f87171'
  return '#fecaca'
}

function getPdqStyle(count, maxCount) {
  return {
    ...PDQ_BASE_STYLE,
    fillOpacity: count ? 0.65 : 0.2,
    fillColor: getPdqFillColor(count, maxCount),
  }
}

function getPdqHoverStyle(count, maxCount) {
  return {
    ...getPdqStyle(count, maxCount),
    ...PDQ_HOVER_STYLE,
  }
}

export default function App() {
  const [raw, setRaw] = useState(null)
  const [category, setCategory] = useState('Vol de véhicule à moteur') // default car theft
  const [year, setYear] = useState('')
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
        // build options dynamically so labels match accents exactly
        const cats = new Set()
        const yrs = new Set()
        for (const f of json.features || []) {
          const p = f.properties || {}
          if (p.CATEGORIE) cats.add(p.CATEGORIE)
          if (typeof p.DATE === 'string' && p.DATE.length >= 4) yrs.add(p.DATE.slice(0,4))
        }
        const sortedCategories = Array.from(cats).sort((a,b)=>a.localeCompare(b))
        const sortedYears = Array.from(yrs).sort((a,b)=>Number(b)-Number(a))

        setCategories(sortedCategories)
        setYears(sortedYears)
        setYear(currentYear => currentYear || sortedYears[0] || '')
      })
      
    const promise_2 = fetch(URL_PDQ)
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

  const countsByPdq = useMemo(() => {
    if (!filtered?.features) return {}

    const map = {}
    for (const f of filtered.features) {
      const p = f.properties || {}
      if (p.PDQ != null) {
        const key = String(p.PDQ)
        map[key] = (map[key] || 0) + 1
      }
    }
    return map
  }, [filtered])

  const maxPdqCount = useMemo(() => {
    const values = Object.values(countsByPdq)
    return values.length ? Math.max(...values) : 0
  }, [countsByPdq])

  const [showChart, setShowChart] = useState(false)
  const [showPDQ, setShowPDQ] = useState(true)
  const totalFilteredRecords = filtered?.features?.length || 0

  const tag = import.meta.env.VITE_GIT_TAG
  const commit = import.meta.env.VITE_GIT_COMMIT
  const build = import.meta.env.VITE_BUILD_DATE

  return (
    <div className="relative h-screen">
      {/* Loading overlay */}
      <div className={`fixed inset-0 z-[999] flex items-center justify-center bg-[#b6b6b6af] ${filtered ? 'invisible' : 'visible'}`}>
        <Loading />
      </div>

      {/* Map full-screen background */}
      <MapContainer className="h-full w-full z-0" center={[45.55, -73.65]} zoom={11}>
        <TileLayer attribution="© OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>

        {showPDQ && pdq && (
          <GeoJSON
            key={`pdq-${category}-${year}`}
            data={pdq}
            style={(feature) => {
              const key = feature?.properties?.PDQ != null ? String(feature.properties.PDQ) : null
              const count = key ? (countsByPdq[key] || 0) : 0
              return getPdqStyle(count, maxPdqCount)
            }}
            onEachFeature={(feature, layer) => {
              const id = feature?.properties?.PDQ
              const key = id != null ? String(id) : null
              const count = key ? (countsByPdq[key] || 0) : 0
              const pdqName = feature?.properties?.Nom_PDQ || feature?.properties?.NOM_PDQ || null
              const percentage = totalFilteredRecords ? ((count / totalFilteredRecords) * 100).toFixed(1) : '0.0'
              const defaultStyle = getPdqStyle(count, maxPdqCount)
              const hoverStyle = getPdqHoverStyle(count, maxPdqCount)

              if (key) {
                layer.bindTooltip(
                  `
                    <div>
                      <strong>PDQ ${key}${pdqName ? ` – ${pdqName}` : ''}</strong><br/>
                      ${count.toLocaleString()} acte(s)<br/>
                      ${percentage}% du total sélectionné
                    </div>
                  `,
                  {
                    permanent: false,
                    direction: 'center',
                    className: 'pdq-label',
                  }
                )
              }

              layer.on({
                mouseover: (e) => {
                  e.target.setStyle(hoverStyle)
                  const map = e.target._map
                  if (map) map.getContainer().style.cursor = 'pointer'
                },
                mouseout: (e) => {
                  e.target.setStyle(defaultStyle)
                  const map = e.target._map
                  if (map) map.getContainer().style.cursor = ''
                },
              })
            }}
          />
        )}
      </MapContainer>

      {/* Header overlay */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-10">
        <div className="m-2 flex items-stretch gap-3 rounded-lg border border-gray-300 mask-alpha px-3 py-2 shadow backdrop-blur-sm pointer-events-auto">
          <label>
            {/* Catégorie:{' '} */}
            <select className="w-30" value={category} onChange={e => setCategory(e.target.value)}>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>

          <label>
            {/* Année:{' '} */}
            <select value={year} onChange={e => setYear(e.target.value)}>
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </label>

          <button
            className="bg-blue-500 hover:bg-blue-900 text-white rounded-xl px-3 text-sm"
            onClick={() => setShowPDQ(v => !v)}>
            {showPDQ ? 'Masquer PDQ' : 'Afficher PDQ'}
          </button>

          <button
            className="bg-blue-500 hover:bg-blue-900 text-white rounded-xl px-3 text-sm"
            onClick={() => setShowChart(true)}>
            Chart
          </button>

          <span className="ml-auto text-[13px] text-[#555]">
            {filtered ? `${filtered.features.length.toLocaleString()} records` : ''}
          </span>
        </div>
      </header>
    
      <label className=" rounded-lg border border-gray-300 mask-alpha text-gray-500 backdrop-blur-sm pointer-events-none absolute p-1 top-10 m-5 z-10">
        {category.toUpperCase()} {year}
      </label>

      {showPDQ && (
        <div className="absolute right-3 bottom-16 z-10 rounded-lg border border-gray-300 bg-white/85 px-3 py-2 text-xs shadow backdrop-blur-sm">
          <div className="mb-2 font-semibold text-gray-700">Incidents par PDQ</div>
          <div className="space-y-1 text-gray-600">
            <div className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: '#fecaca' }} /> Faible</div>
            <div className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: '#dc2626' }} /> Moyen</div>
            <div className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: '#7f1d1d' }} /> Elevé</div>
          </div>
        </div>
      )}

      {/* Chart overlay (assuming your Chart already renders as an overlay/modal) */}
      {showChart && (
        <Chart
          data={filtered}
          category={category}
          onClose={() => setShowChart(false)}
        />
      )}

      <footer className="pointer-events-none absolute inset-x-0 bottom-0 z-10">
        <div className="m-2 rounded-lg border border-gray-300 mask-alpha px-3 py-2 text-[12px] text-center shadow backdrop-blur-sm pointer-events-auto">
          Données sur la criminalité © Ville de Montréal / SPVM – « Actes criminels », 
          licence CC BY 4.0. Visualisation par <b>Baldwin Malabanan</b>. {tag}
        </div>
      </footer>

      {err && (
        <div className="absolute top-2 left-2 z-20 bg-red-100 text-red-800 px-3 py-1.5 rounded-lg text-sm shadow">
          {String(err)}
        </div>
      )}
    </div>
  )
}

//NOTE
/**
 * To run the program and debug,
 * npm run dev
 */
