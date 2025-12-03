import { useMemo, useState } from 'react'
import Plot from 'react-plotly.js'

export default function Chart({ data, category, onClose }) {
    const { months, counts } = useMemo(() => {
    const monthsLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const countsArr = Array(12).fill(0)

    if (data?.features?.length) {
      for (const feature of data.features) {
        const p = feature.properties || {}
        const d = p.DATE

        if (typeof d === 'string' && d.length >= 7) {
          // assuming DATE format "YYYY-MM-DD"
          const monthStr = d.slice(5, 7) // 01–12
          const monthIdx = Number(monthStr) - 1
          if (monthIdx >= 0 && monthIdx < 12) {
            countsArr[monthIdx]++
          }
        }
      }
    }

    return { months: monthsLabels, counts: countsArr }
  }, [data])

  // If no data or hidden, render nothing
  if (!data || !data.features) return null

  return (
    <div style={{ position: 'fixed', inset: 0,  zIndex: 1000, backgroundColor: 'rgba(0, 0, 0, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', }} >
      <div style={{ background: '#fff', borderRadius: 8, padding: 16, maxWidth: '90vw',  maxHeight: '90vh', width: 800, boxShadow: '0 10px 25px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer', }} >×</button>
        </div>
        <div style={{ flex: 1, minHeight: 300 }}>
            <Plot
                data={[
                {
                    x: months,
                    y: counts,
                    type: 'bar',
                },
                ]}
                layout={{
                title: { text: `${category} par mois`, font: { size: 20 },},
                xaxis: { title: { text: 'Mois', font: { size: 14 }  } },
                yaxis: { title: { text: category, font: { size: 14 }  } },
                margin: { t: 40, l: 50, r: 20, b: 50 },
                autosize: true,
                }}
                useResizeHandler
                style={{ width: '100%', height: '100%' }}
                config={{ displayModeBar: false }}
            />
        </div>
      </div>
    </div>
  )
}
