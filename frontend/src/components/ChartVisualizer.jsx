import { useState, useMemo, useRef } from 'react';
import { toPng } from 'html-to-image';
import {
  BarChart, Bar,
  LineChart, Line,
  AreaChart, Area,
  ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const CHART_TYPES = [
  { id: 'bar', label: 'Bar Chart' },
  { id: 'line', label: 'Line Chart' },
  { id: 'area', label: 'Area Chart' },
  { id: 'scatter', label: 'Scatter Chart' }
];

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const ChartVisualizer = ({ results }) => {
  const { columns, values } = results;

  const [chartType, setChartType] = useState('bar');
  const [xAxisCol, setXAxisCol] = useState(columns[0] || '');
  const [yAxisCol, setYAxisCol] = useState(columns.length > 1 ? columns[1] : columns[0]);

  // Limits
  const [yAxisLimitMin, setYAxisLimitMin] = useState('');
  const [yAxisLimitMax, setYAxisLimitMax] = useState('');
  const [dataLimit, setDataLimit] = useState(''); // limit number of rendered points for X-axis

  const chartRef = useRef(null);

  // Transform sql.js results { columns: [...], values: [[...], [...]] }
  // to an array of objects for recharts: [{ col1: val1, col2: val2 }, ...]
  const chartData = useMemo(() => {
    if (!columns || !values) return [];
    return values.map((row) => {
      const rowObject = {};
      columns.forEach((col, idx) => {
        // Convert string numbers to actual numbers for correct charting
        const val = row[idx];
        if (typeof val === 'string' && !isNaN(Number(val)) && val.trim() !== '') {
          rowObject[col] = Number(val);
        } else {
          rowObject[col] = val;
        }
      });
      return rowObject;
    });
  }, [columns, values]);

  const filteredData = useMemo(() => {
    let data = [...chartData];
    if (dataLimit && !isNaN(Number(dataLimit)) && Number(dataLimit) > 0) {
      data = data.slice(0, Number(dataLimit));
    }
    return data;
  }, [chartData, dataLimit]);

  if (!columns || columns.length === 0) {
    return <div className="p-4 text-zinc-500 italic">No data to visualize.</div>;
  }

  // Handle Image Download
  const handleDownload = () => {
    const captureElement = document.getElementById("chart-capture-area");
    if (!captureElement) {
      alert("Capture element not found");
      return;
    }
    
    // Using html-to-image for a robust, complete element screenshot
    // This captures the chart exactly as it renders, with all constraints/limits applied
    toPng(captureElement, { backgroundColor: '#18181b', pixelRatio: 2 })
      .then(function (dataUrl) {
        var link = document.createElement('a');
        link.download = `${chartType}-chart.png`;
        link.href = dataUrl;
        link.click();
      })
      .catch(function (error) {
        console.error('oops, something went wrong!', error);
        alert('Failed to export image: ' + error);
      });
  };

  // Determine Y Domain
  const yDomain = useMemo(() => {
    const min = yAxisLimitMin !== '' && !isNaN(Number(yAxisLimitMin)) ? Number(yAxisLimitMin) : 'auto';
    const max = yAxisLimitMax !== '' && !isNaN(Number(yAxisLimitMax)) ? Number(yAxisLimitMax) : 'auto';
    return [min, max];
  }, [yAxisLimitMin, yAxisLimitMax]);

  // Render the selected chart based on chartType
  const renderChart = () => {
    const CustomTooltip = ({ active, payload, label }) => {
      if (active && payload && payload.length) {
        return (
          <div className="bg-zinc-900 border border-zinc-700 p-3 rounded-lg shadow-xl text-sm">
            <p className="text-zinc-300 font-bold mb-2">{`${xAxisCol} : ${label}`}</p>
            {payload.map((entry, index) => (
              <p key={index} style={{ color: entry.color }} className="font-mono">
                {`${entry.name} : ${entry.value}`}
              </p>
            ))}
          </div>
        );
      }
      return null;
    };

    const commonProps = {
      data: filteredData,
      margin: { top: 20, right: 30, left: 20, bottom: 20 },
    };

    switch (chartType) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
            <XAxis dataKey={xAxisCol} stroke="#a1a1aa" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
            <YAxis domain={yDomain} stroke="#a1a1aa" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            <Line type="monotone" dataKey={yAxisCol} stroke={COLORS[0]} strokeWidth={3} dot={{ r: 4, fill: COLORS[0] }} activeDot={{ r: 6 }} />
          </LineChart>
        );
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
            <XAxis dataKey={xAxisCol} stroke="#a1a1aa" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
            <YAxis domain={yDomain} stroke="#a1a1aa" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            <Area type="monotone" dataKey={yAxisCol} stroke={COLORS[1]} fill={COLORS[1]} fillOpacity={0.3} strokeWidth={2} />
          </AreaChart>
        );
      case 'scatter':
        return (
          <ScatterChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
            <XAxis dataKey={xAxisCol} name={xAxisCol} stroke="#a1a1aa" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
            <YAxis domain={yDomain} dataKey={yAxisCol} name={yAxisCol} stroke="#a1a1aa" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            <Scatter name={yAxisCol} data={filteredData} fill={COLORS[2]} />
          </ScatterChart>
        );
      case 'bar':
      default:
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
            <XAxis dataKey={xAxisCol} stroke="#a1a1aa" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
            <YAxis domain={yDomain} stroke="#a1a1aa" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#27272a' }} />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            <Bar dataKey={yAxisCol} fill={COLORS[0]} radius={[4, 4, 0, 0]} />
          </BarChart>
        );
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden shrink-0">
      {/* Chart Controls */}
      <div className="flex flex-wrap items-center gap-4 p-4 border-b border-zinc-800 bg-zinc-950">
        
        {/* Type Selector */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-zinc-500 uppercase">Chart Type</label>
          <div className="flex bg-zinc-900 rounded-md border border-zinc-700 p-0.5">
            {CHART_TYPES.map(type => (
              <button
                key={type.id}
                onClick={() => setChartType(type.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  chartType === type.id 
                    ? 'bg-zinc-700 text-white shadow-sm' 
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* X Axis Selector */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-zinc-500 uppercase">X Axis</label>
          <select
            value={xAxisCol}
            onChange={(e) => setXAxisCol(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 text-zinc-300 text-sm rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {columns.map(col => (
              <option key={col} value={col}>{col}</option>
            ))}
          </select>
        </div>

        {/* Y Axis Selector */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-zinc-500 uppercase">Y Axis (Value)</label>
          <select
            value={yAxisCol}
            onChange={(e) => setYAxisCol(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 text-zinc-300 text-sm rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {columns.map(col => (
               <option key={col} value={col}>{col}</option>
            ))}
          </select>
        </div>

        {/* Data Limit (X-Axis Items Limit) */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-zinc-500 uppercase">Max Data Points</label>
          <input
            type="number"
            min="1"
            placeholder="All"
            value={dataLimit}
            onChange={(e) => setDataLimit(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 text-zinc-300 text-sm rounded-md px-3 py-1.5 w-24 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Y Axis Range Limits */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-zinc-500 uppercase">Y Min / Max</label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              placeholder="Auto"
              value={yAxisLimitMin}
              onChange={(e) => setYAxisLimitMin(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 text-zinc-300 text-sm rounded-md px-2 py-1.5 w-16 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <span className="text-zinc-500">-</span>
            <input
              type="number"
              placeholder="Auto"
              value={yAxisLimitMax}
              onChange={(e) => setYAxisLimitMax(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 text-zinc-300 text-sm rounded-md px-2 py-1.5 w-16 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Download Button */}
        <div className="flex items-end ml-auto">
          <button
            onClick={handleDownload}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md shadow-sm transition-colors flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Export PNG
          </button>
        </div>
      </div>

      {/* Chart Render Area */}
      <div id="chart-capture-area" className="flex-1 p-4 min-h-[300px] relative bg-zinc-900" ref={chartRef}>
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ChartVisualizer;
