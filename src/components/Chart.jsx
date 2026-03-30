import { useMemo, useState } from 'react'
import Plot from 'react-plotly.js'

export default function Chart({
  rawData,
  category,
  categories,
  year,
  years,
  onCategoryChange,
  onYearChange,
  onClose,
}) {
  const [comparePreviousYear, setComparePreviousYear] = useState(false)

  const previousYear = useMemo(() => {
    const currentIndex = years.findIndex((item) => item === year)
    return currentIndex >= 0 && currentIndex < years.length - 1 ? years[currentIndex + 1] : ''
  }, [year, years])

  const { months, currentYearCounts, previousYearCounts } = useMemo(() => {
    const monthsLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const currentCountsArr = Array(12).fill(0)
    const previousCountsArr = Array(12).fill(0)

    if (rawData?.features?.length) {
      for (const feature of rawData.features) {
        const p = feature.properties || {}
        const d = p.DATE
        const featureYear = typeof d === 'string' ? d.slice(0, 4) : ''

        if (p.CATEGORIE === category && typeof d === 'string' && d.length >= 7) {
          // assuming DATE format "YYYY-MM-DD"
          const monthStr = d.slice(5, 7) // 01–12
          const monthIdx = Number(monthStr) - 1
          if (monthIdx >= 0 && monthIdx < 12) {
            if (featureYear === year) currentCountsArr[monthIdx]++
            if (previousYear && featureYear === previousYear) previousCountsArr[monthIdx]++
          }
        }
      }
    }

    return { months: monthsLabels, currentYearCounts: currentCountsArr, previousYearCounts: previousCountsArr }
  }, [rawData, category, year, previousYear])

  // If no data or hidden, render nothing
  if (!rawData || !rawData.features) return null

  const plotData = [
    {
      x: months,
      y: currentYearCounts,
      type: 'bar',
      name: year,
      marker: { color: '#2563eb' },
    },
  ]

  if (comparePreviousYear && previousYear) {
    plotData.push({
      x: months,
      y: previousYearCounts,
      type: 'bar',
      name: previousYear,
      marker: { color: '#94a3b8' },
    })
  }

  return (
    <div style={{ position: 'fixed', inset: 0,  zIndex: 1000, backgroundColor: '#b6b6b6af', display: 'flex', alignItems: 'center', justifyContent: 'center', }} >
      <div style={{ background: '#fff', borderRadius: 8, padding: 16, width: 'min(92vw, 800px)', maxHeight: 'min(86dvh, 90vh)', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: '1 1 100%' }}>
            <select value={category} onChange={(e) => onCategoryChange(e.target.value)} style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: '8px 10px', fontSize: 14, minWidth: 0, flex: '1 1 220px' }}>
              {categories.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
            <select value={year} onChange={(e) => onYearChange(e.target.value)} style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: '8px 10px', fontSize: 14, flex: '0 0 auto' }}>
              {years.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#374151', flex: '1 1 100%' }}>
              <input
                type="checkbox"
                checked={comparePreviousYear}
                onChange={(e) => setComparePreviousYear(e.target.checked)}
                disabled={!previousYear}
              />
              Comparer
            </label>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: 4, }} >×</button>
        </div>
        <div style={{ flex: 1, minHeight: 260, height: 'min(56dvh, 480px)' }}>
            <Plot
                data={plotData}
                layout={{
                title: { text: `${category} par mois${comparePreviousYear && previousYear ? ` (${year} vs ${previousYear})` : ` (${year})`}`, font: { size: 16 },},
                xaxis: { title: { text: 'Mois', font: { size: 12 }  }, automargin: true, tickfont: { size: 10 } },
                yaxis: { title: { text: "Nombre d'actes", font: { size: 12 }  }, automargin: true, tickfont: { size: 10 } },
                margin: { t: 50, l: 45, r: 16, b: 45 },
                autosize: true,
                barmode: comparePreviousYear && previousYear ? 'group' : 'relative',
                legend: { orientation: 'h', y: 1.08, x: 0, font: { size: 10 } },
                }}
                useResizeHandler={true}
                style={{ width: '100%', height: '100%' }}
                config={{ displayModeBar: false }}
            />
        </div>
      </div>
    </div>
  )
}
