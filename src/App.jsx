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
const URL_PDQ_1 = 'https://donnees.montreal.ca/dataset/186892b8-bba5-426c-aa7e-9db8c43cbdfe/resource/e18f0da9-3a16-4ba4-b378-59f698b47261/download/limitespdq.geojson'
const URL_PDQ_2 = '/limitespdq_wgs84.geojson'
const URL_PDQ_NAME = 'https://montreal-prod.storage.googleapis.com/resources/c9d0b8d6-c7a6-4766-a5cc-98e8b1392bbc/pdq.geojson?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Credential=test-datapusher-delete%40amplus-data.iam.gserviceaccount.com%2F20251206%2Fauto%2Fstorage%2Fgoog4_request&X-Goog-Date=20251206T154115Z&X-Goog-Expires=604800&X-Goog-SignedHeaders=host&x-goog-signature=32295069d98f111f332922f27e717291a89f2c1f1ba0686d79a278128d2e63c78a85db266135d75ec2248840bc187c3d8bd5b86cffc3dadb3b258fbabb8a65cbfd85d73eab454627b9b7006c441a3ba929083d99287e3756dc335d287d24c9946b5838cfc6bd492520ceca3a6652ff58475f8419d3bd9c59ea7124e99ee520408d0abec98ee343f6dc6aad3e28f1969ec29769826de5a070a4c30b0f794c12189b3659dc2d82939813401d4b2927a93e5ce285aa2f5d7d684747b856b2f4165a74da05c9cc79eee41edae077e0168a7d1f901a7e212dcd02001440e8e1116a78925daa1455b4d280d0721e9b9b5033bbaf81c2d3b88e288e9014ee59630dbf10'

const PDQ_BASE_STYLE = { weight: 3, color: '#333333ff', dashArray: '4 4', fillOpacity: 0, };
const PDQ_HOVER_STYLE = {  weight: 3, color: '#2563eb', fillOpacity: 0.8, }

export default function App() {
  const [raw, setRaw] = useState(null)
  const [category, setCategory] = useState('Vol de véhicule à moteur') // default car theft
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [categories, setCategories] = useState([])
  const [years, setYears] = useState([])
  const [err, setErr] = useState(null)
  const [pdq, setPdq] = useState(null)  
  const [pdqNames, setPdqNames] = useState({})

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
        setCategories(Array.from(cats).sort((a,b)=>a.localeCompare(b)))
        setYears(Array.from(yrs).sort((a,b)=>Number(b)-Number(a)))
      })
      
    const promise_2 = fetch(URL_PDQ_2)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(json => {
        setPdq(json)
      })

    const promise_3 = fetch(URL_PDQ_NAME)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(json => {
        const map = {}
        for (const f of json.features || []) {
          const p = f.properties || {}
          if (p.DESC_LIEU && p.NOM_TEMP) {
            const key = p.DESC_LIEU.split(" ").pop();
            map[key] = p.NOM_TEMP
          }
        }
        setPdqNames(map)
      })
    
    var Promise1 = Promise.all(promise_1) //.catch(e => setErr(e.message))
    var Promise2 = Promise.all(promise_2) //.catch(e => setErr(e.message))
    var Promise3 = Promise.all(promise_3) //.catch(e => setErr(e.message))
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

  const [showChart, setShowChart] = useState(false)
  const [showPDQ, setShowPDQ] = useState(false)

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

        {filtered && (
          <GeoJSON
            key={`${category}-${year}-${filtered.features.length}`}
            data={filtered}
            pointToLayer={(_, latlng) =>
              L.circleMarker(latlng, { radius: 2, color: '#ff1010ff' })
            }
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
            key={`pdq-${category}-${year}`}
            data={pdq}
            style={() => PDQ_BASE_STYLE}
            onEachFeature={(feature, layer) => {
              const id = feature?.properties?.PDQ
              const key = id != null ? String(id) : null
              const count = key ? (countsByPdq[key] || 0) : 0
              const pdqName = key ? pdqNames[key] : null

              if (key) {
                layer.bindTooltip(
                  `
                    PDQ ${key}${pdqName ? ` – ${pdqName}` : ''}<br/>
                    ${count.toLocaleString()} acte(s) pour « ${category} »
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
              {!years.includes(String(new Date().getFullYear())) && (
                <option value={String(new Date().getFullYear())}>
                  {String(new Date().getFullYear())}
                </option>
              )}
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </label>

          <button
            className="bg-blue-500 hover:bg-blue-900 text-white rounded-xl px-3 text-sm"
            onClick={() => setShowPDQ(v => !v)}>
            {showPDQ ? 'Cacher layer' : 'Afficher layer'}
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