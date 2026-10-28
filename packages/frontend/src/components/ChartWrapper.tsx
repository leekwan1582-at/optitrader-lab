import { useMemo } from 'react';
import ReactApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

interface ChartWrapperProps {
  series: Array<{ name: string; data: number[] }>;
  type?: 'area' | 'line' | 'bar';
  height?: number;
  options?: ApexOptions;
  emptyMessage?: string;
}

const baseOptions: ApexOptions = {
  chart: {
    type: 'area',
    background: 'transparent',
    toolbar: { show: false },
    fontFamily: 'Inter, sans-serif',
    animations: { speed: 450 },
  },
  theme: { mode: 'dark' },
  colors: ['#00d2ff', '#ffb020', '#00ff88', '#ff5d5d'],
  dataLabels: { enabled: false },
  stroke: { curve: 'smooth', width: 3 },
  fill: {
    type: 'gradient',
    gradient: { opacityFrom: 0.35, opacityTo: 0.02 },
  },
  grid: {
    borderColor: '#2a3447',
    strokeDashArray: 3,
  },
  xaxis: {
    labels: { style: { colors: '#94a3b8' } },
    axisBorder: { show: false },
    axisTicks: { show: false },
  },
  yaxis: {
    labels: {
      style: { colors: '#94a3b8' },
      formatter: (value: number) => `$${Math.round(value).toLocaleString()}`,
    },
  },
  tooltip: { theme: 'dark' },
  legend: {
    position: 'top',
    labels: { colors: '#e2e8f0' },
  },
};

export default function ChartWrapper({
  series,
  type = 'area',
  height = 350,
  options = {},
  emptyMessage = 'No chart data yet.',
}: ChartWrapperProps) {
  const mergedOptions = useMemo<ApexOptions>(() => ({
    ...baseOptions,
    ...options,
    chart: {
      ...baseOptions.chart,
      ...options.chart,
      type,
    },
    tooltip: {
      ...baseOptions.tooltip,
      ...options.tooltip,
    },
  }), [options, type]);

  const hasData = Array.isArray(series)
    ? series.some((item) => Array.isArray(item.data) && item.data.length > 0)
    : false;

  if (!hasData) {
    return <div className="empty-state chart-empty">{emptyMessage}</div>;
  }

  return (
    <ReactApexChart
      options={mergedOptions}
      series={series}
      type={type}
      height={height}
    />
  );
}
