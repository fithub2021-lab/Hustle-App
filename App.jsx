import React, { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts'

const STORAGE_KEY = 'hustle-app-mvp-data'
const COLORS = ['#0f172a', '#475569', '#94a3b8', '#cbd5e1']

const starterEntries = [
  { id: 1, date: '2026-03-18', type: 'Amazon Flex', title: 'Early morning block', income: 96, expenses: 12, hours: 2.5, miles: 54 },
  { id: 2, date: '2026-03-17', type: 'FedEx', title: 'Route shift', income: 180, expenses: 18, hours: 8.5, miles: 36 },
  { id: 3, date: '2026-03-16', type: 'Side Hustle', title: 'Flip profit', income: 65, expenses: 10, hours: 1, miles: 8 },
]

const money = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value || 0)
const number = (value) => Number.parseFloat(value || 0) || 0

function Card({ children, className = '' }) {
  return <div className={`card ${className}`}>{children}</div>
}

function Stat({ label, value }) {
  return (
    <Card>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </Card>
  )
}

export default function App() {
  const [entries, setEntries] = useState(starterEntries)
  const [weeklyGoal, setWeeklyGoal] = useState(1200)
  const [filter, setFilter] = useState('All')
  const [timeframe, setTimeframe] = useState('7d')
  const [mileageRate, setMileageRate] = useState(0.67)
  const [taxRate, setTaxRate] = useState(0.3)
  const [tab, setTab] = useState('dashboard')
  const [form, setForm] = useState({
    date: '2026-03-19',
    type: 'Amazon Flex',
    title: '',
    income: '',
    expenses: '',
    hours: '',
    miles: '',
  })

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (!saved) return
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed.entries)) setEntries(parsed.entries)
      if (typeof parsed.weeklyGoal === 'number') setWeeklyGoal(parsed.weeklyGoal)
      if (typeof parsed.mileageRate === 'number') setMileageRate(parsed.mileageRate)
      if (typeof parsed.taxRate === 'number') setTaxRate(parsed.taxRate)
    } catch {}
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ entries, weeklyGoal, mileageRate, taxRate }))
  }, [entries, weeklyGoal, mileageRate, taxRate])

  const filteredEntries = useMemo(() => (filter === 'All' ? entries : entries.filter((e) => e.type === filter)), [entries, filter])

  const filterByTimeframe = (items) => {
    if (timeframe === 'all') return items
    const now = new Date('2026-03-19')
    return items.filter((item) => {
      const d = new Date(item.date)
      const diff = (now - d) / (1000 * 60 * 60 * 24)
      if (timeframe === '7d') return diff <= 7
      if (timeframe === '30d') return diff <= 30
      return true
    })
  }

  const stats = useMemo(() => {
    const gross = filteredEntries.reduce((sum, item) => sum + item.income, 0)
    const expenses = filteredEntries.reduce((sum, item) => sum + item.expenses, 0)
    const hours = filteredEntries.reduce((sum, item) => sum + item.hours, 0)
    const miles = filteredEntries.reduce((sum, item) => sum + item.miles, 0)
    const mileageDeduction = miles * mileageRate
    const net = gross - expenses
    const taxableIncome = Math.max(net - mileageDeduction, 0)
    const estimatedTaxes = taxableIncome * taxRate
    const afterTaxProfit = net - estimatedTaxes
    const afterTaxHourly = hours > 0 ? afterTaxProfit / hours : 0
    const progress = weeklyGoal > 0 ? Math.min((net / weeklyGoal) * 100, 100) : 0
    return { gross, expenses, net, hours, miles, mileageDeduction, taxableIncome, estimatedTaxes, afterTaxProfit, afterTaxHourly, progress }
  }, [filteredEntries, weeklyGoal, mileageRate, taxRate])

  const groupedTypeTotals = useMemo(() => {
    const map = new Map()
    entries.forEach((entry) => {
      const current = map.get(entry.type) || { gross: 0, net: 0, hours: 0, miles: 0 }
      current.gross += entry.income
      current.net += entry.income - entry.expenses
      current.hours += entry.hours
      current.miles += entry.miles
      map.set(entry.type, current)
    })
    return Array.from(map.entries()).map(([type, totals]) => {
      const mileageDeduction = totals.miles * mileageRate
      const taxableIncome = Math.max(totals.net - mileageDeduction, 0)
      const estimatedTaxes = taxableIncome * taxRate
      const afterTaxNet = totals.net - estimatedTaxes
      return {
        type,
        ...totals,
        afterTaxNet,
        hourly: totals.hours > 0 ? totals.net / totals.hours : 0,
        afterTaxHourly: totals.hours > 0 ? afterTaxNet / totals.hours : 0,
      }
    })
  }, [entries, mileageRate, taxRate])

  const dailyChartData = useMemo(() => {
    const filtered = filterByTimeframe(entries)
    const map = new Map()
    filtered.sort((a, b) => a.date.localeCompare(b.date)).forEach((entry) => {
      const current = map.get(entry.date) || { date: entry.date, gross: 0, net: 0, afterTax: 0 }
      const net = entry.income - entry.expenses
      const mileageDeduction = entry.miles * mileageRate
      const taxableIncome = Math.max(net - mileageDeduction, 0)
      const estimatedTaxes = taxableIncome * taxRate
      current.gross += entry.income
      current.net += net
      current.afterTax += net - estimatedTaxes
      map.set(entry.date, current)
    })
    return Array.from(map.values())
  }, [entries, mileageRate, taxRate, timeframe])

  const hustlePieData = useMemo(() => {
    const filtered = filterByTimeframe(entries)
    const map = new Map()
    filtered.forEach((entry) => {
      const net = entry.income - entry.expenses
      const mileageDeduction = entry.miles * mileageRate
      const taxableIncome = Math.max(net - mileageDeduction, 0)
      const estimatedTaxes = taxableIncome * taxRate
      map.set(entry.type, (map.get(entry.type) || 0) + (net - estimatedTaxes))
    })
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
  }, [entries, mileageRate, taxRate, timeframe])

  const cumulativeGoalData = useMemo(() => {
    let running = 0
    return dailyChartData.map((item) => {
      running += item.net
      return { date: item.date, runningNet: Number(running.toFixed(2)), goal: weeklyGoal }
    })
  }, [dailyChartData, weeklyGoal])

  const addEntry = () => {
    if (!form.title.trim()) return
    const nextEntry = {
      id: Date.now(),
      date: form.date,
      type: form.type,
      title: form.title.trim(),
      income: number(form.income),
      expenses: number(form.expenses),
      hours: number(form.hours),
      miles: number(form.miles),
    }
    setEntries((prev) => [nextEntry, ...prev])
    setForm((prev) => ({ ...prev, title: '', income: '', expenses: '', hours: '', miles: '' }))
    setTab('history')
  }

  const exportData = () => navigator.clipboard.writeText(JSON.stringify({ entries, weeklyGoal, mileageRate, taxRate }, null, 2))
  const resetData = () => {
    localStorage.removeItem(STORAGE_KEY)
    setEntries(starterEntries)
    setWeeklyGoal(1200)
    setMileageRate(0.67)
    setTaxRate(0.3)
  }

  return (
    <div className="app-shell">
      <div className="hero card dark">
        <div>
          <div className="badges"><span>Hustle App</span><span>Mileage + Tax + Charts</span></div>
          <h1>Track every dollar you hustle</h1>
          <p>Log your gigs, track miles, estimate taxes, and watch your real take-home move.</p>
        </div>
        <div className="goal-box">
          <div className="small">Weekly Net Goal</div>
          <div className="big">{money(stats.net)}</div>
          <div className="small">of {money(weeklyGoal)}</div>
          <progress value={stats.progress} max="100" />
          <div className="small">After tax estimate: {money(stats.afterTaxProfit)}</div>
        </div>
      </div>

      <div className="grid stats-grid">
        <Stat label="Gross Income" value={money(stats.gross)} />
        <Stat label="Net Profit" value={money(stats.net)} />
        <Stat label="Mileage Deduction" value={money(stats.mileageDeduction)} />
        <Stat label="Estimated Taxes" value={money(stats.estimatedTaxes)} />
      </div>

      <Card>
        <div className="tabs">
          {['dashboard', 'add', 'history', 'data'].map((t) => (
            <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t[0].toUpperCase() + t.slice(1)}</button>
          ))}
        </div>
      </Card>

      {tab === 'dashboard' && (
        <>
          <Card>
            <div className="toolbar">
              <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                <option>All</option>
                <option>Amazon Flex</option>
                <option>FedEx</option>
                <option>Side Hustle</option>
              </select>
              <div className="time-buttons">
                <button className={timeframe === '7d' ? 'active' : ''} onClick={() => setTimeframe('7d')}>7 Days</button>
                <button className={timeframe === '30d' ? 'active' : ''} onClick={() => setTimeframe('30d')}>30 Days</button>
                <button className={timeframe === 'all' ? 'active' : ''} onClick={() => setTimeframe('all')}>All</button>
              </div>
            </div>
          </Card>

          <div className="grid two-col">
            <Card>
              <h3>Best paying hustles</h3>
              {groupedTypeTotals.map((item) => (
                <div className="list-item" key={item.type}>
                  <div>
                    <strong>{item.type}</strong>
                    <div className="small">Net {money(item.net)} • After tax {money(item.afterTaxNet)} • Miles {item.miles.toFixed(1)}</div>
                  </div>
                  <div className="align-right">
                    <strong>{money(item.hourly)}/hr</strong>
                    <div className="small">After tax {money(item.afterTaxHourly)}/hr</div>
                  </div>
                </div>
              ))}
            </Card>
            <Card>
              <h3>Quick strategy</h3>
              <div className="note">Taxable income estimate: <strong>{money(stats.taxableIncome)}</strong></div>
              <div className="note">After-tax take-home: <strong>{money(stats.afterTaxProfit)}</strong></div>
              <div className="note">After-tax hourly: <strong>{money(stats.afterTaxHourly)}</strong></div>
            </Card>
          </div>

          <div className="grid two-col">
            <Card>
              <h3>Daily earnings</h3>
              <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={dailyChartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip /><Bar dataKey="net" radius={[8,8,0,0]} fill="#0f172a" /></BarChart></ResponsiveContainer></div>
            </Card>
            <Card>
              <h3>After-tax hustle split</h3>
              <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={hustlePieData} dataKey="value" nameKey="name" outerRadius={100} label>{hustlePieData.map((entry, index) => <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>
            </Card>
          </div>

          <Card>
            <h3>Goal trend</h3>
            <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><LineChart data={cumulativeGoalData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip /><Line type="monotone" dataKey="runningNet" stroke="#0f172a" strokeWidth={3} dot /><Line type="monotone" dataKey="goal" stroke="#94a3b8" strokeDasharray="6 6" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div>
          </Card>
        </>
      )}

      {tab === 'add' && (
        <Card>
          <h3>Add a new hustle entry</h3>
          <div className="grid form-grid">
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option>Amazon Flex</option><option>FedEx</option><option>Side Hustle</option>
            </select>
            <input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <input type="number" placeholder="Income" value={form.income} onChange={(e) => setForm({ ...form, income: e.target.value })} />
            <input type="number" placeholder="Expenses" value={form.expenses} onChange={(e) => setForm({ ...form, expenses: e.target.value })} />
            <input type="number" placeholder="Hours" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} />
            <input type="number" placeholder="Miles" value={form.miles} onChange={(e) => setForm({ ...form, miles: e.target.value })} />
          </div>
          <button className="primary" onClick={addEntry}>Save Hustle Entry</button>
        </Card>
      )}

      {tab === 'history' && (
        <Card>
          <h3>Hustle history</h3>
          {filteredEntries.map((entry) => {
            const net = entry.income - entry.expenses
            const deduction = entry.miles * mileageRate
            const taxes = Math.max(net - deduction, 0) * taxRate
            const afterTax = net - taxes
            return (
              <div className="list-item" key={entry.id}>
                <div>
                  <strong>{entry.title}</strong>
                  <div className="small">{entry.date} • {entry.type} • Income {money(entry.income)} • Expenses {money(entry.expenses)} • Hours {entry.hours} • Miles {entry.miles}</div>
                  <div className="small">Deduction {money(deduction)} • Tax est. {money(taxes)} • After tax {money(afterTax)}</div>
                </div>
                <button className="danger" onClick={() => setEntries((prev) => prev.filter((e) => e.id !== entry.id))}>Delete</button>
              </div>
            )
          })}
        </Card>
      )}

      {tab === 'data' && (
        <Card>
          <h3>Saved data</h3>
          <div className="grid form-grid">
            <input type="number" value={weeklyGoal} onChange={(e) => setWeeklyGoal(number(e.target.value))} placeholder="Weekly Goal" />
            <input type="number" step="0.01" value={mileageRate} onChange={(e) => setMileageRate(number(e.target.value))} placeholder="Mileage Rate" />
            <input type="number" step="0.01" value={taxRate} onChange={(e) => setTaxRate(number(e.target.value))} placeholder="Tax Rate" />
          </div>
          <div className="button-row">
            <button onClick={exportData}>Copy Backup Data</button>
            <button className="danger" onClick={resetData}>Reset App Data</button>
          </div>
        </Card>
      )}
    </div>
  )
}
