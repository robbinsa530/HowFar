import React, { useMemo, useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Line } from 'react-chartjs-2';
import CircularProgress from '@mui/material/CircularProgress';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { mergeFill } from '../utils/mergeFill';
import { interpolateSpottyElevationData } from '../utils/interpolate';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// For tooltip
const verticalLinePlugin = {
  id: "verticalLine",
  afterDatasetsDraw(chart) {
    const active = chart.tooltip?.getActiveElements?.();
    if (!active || active.length === 0) return;

    const { ctx } = chart;
    const x = active[0].element.x;
    const topY = chart.chartArea.top;
    const bottomY = chart.chartArea.bottom;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, topY);
    ctx.lineTo(x, bottomY);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
    ctx.stroke();
    ctx.restore();
  },
};

// For the removed/new elevation sections (when route is being edited)
function createDiagonalPattern(color = 'black', shift = 0) {
  const shape = document.createElement('canvas');
  shape.width = 10;
  shape.height = 10;
  const c = shape.getContext('2d');

  c.strokeStyle = color;
  c.lineWidth = 2;
  c.lineCap = 'butt';

  // draw the pattern once at its neutral position
  c.beginPath();
  c.moveTo(2, 0);
  c.lineTo(10, 8);
  c.stroke();

  c.beginPath();
  c.moveTo(0, 8);
  c.lineTo(2, 10);
  c.stroke();

  const pattern = c.createPattern(shape, 'repeat');

  // shift the pattern when painting
  if (pattern && typeof pattern.setTransform === 'function') {
    // DOMMatrix is standard; translate by shift px on x axis
    pattern.setTransform(new DOMMatrix().translate(shift, 0));
  } // Else the lines will just overlap. Big whoop.

  return pattern;
}

const ElevationProfileChart = () => {
  // Local state
  const [ chartDataPoints, setChartDataPoints ] = useState([]);
  const [ chartDataPointsBefore, setChartDataPointsBefore ] = useState([]);
  const [ chartDataPointsRemoved, setChartDataPointsRemoved ] = useState([]);
  const [ chartDataPointsAfter, setChartDataPointsAfter ] = useState([]);
  const [ chartDataPointsNew, setChartDataPointsNew ] = useState([]);

  const { imperialOrMetric } = useSelector((state) => state.settings);
  const {
    distance: routeDistance,
    justEditingDistance,
    newDistance
  } = useSelector((state) => state.map);
  const {
    elevationProfile,
    newElevationProfile,
    newElevationProfileExtraData
  } = useSelector((state) => state.map);
  const {
    elevationLoading,
    newElevationLoading
  } = useSelector((state) => state.display);
  const { editRedrawingRoute, editGapClosed } = useSelector((state) => state.editRoute);

  // Build data and chart options based on geojson
  useEffect(() => {
    const dataPoints = elevationProfile.map((elevation) => ({
      x: elevation[0],
      y: elevation[1]
    }));
    setChartDataPoints(dataPoints);
  }, [elevationProfile]);

  // Build data and chart options based on editingGeojson (during a bulk edit)
  useEffect(() => {
    if (!editRedrawingRoute) return;

    // First, split elevationProfile into before, removed, and after based on the edit points
    let dataPointsBefore = elevationProfile.filter((_, i) => i < newElevationProfileExtraData.splitIndexStart);
    let dataPointsRemoved = elevationProfile.filter((_, i) => i >= newElevationProfileExtraData.splitIndexStart && i < newElevationProfileExtraData.splitIndexEnd);
    let dataPointsAfter = elevationProfile.filter((_, i) => i >= newElevationProfileExtraData.splitIndexEnd);

    // Add in the interpolated points
    // If we don't have real new-data, use interpolated before point, otherwise use first of newElevationProfile
    let interpBefore;
    if (newElevationProfile.length > 0) {
      interpBefore = newElevationProfile[0];
    } else {
      interpBefore = newElevationProfileExtraData.interpolatedPointBefore;
    }
    // If the gap is closed, then we have a more accurate elevation than the interpolated one. Use that so the graph looks nice
    // For this one, just take the elevation
    let interpAfter;
    if (editGapClosed) {
      interpAfter = [newElevationProfileExtraData.interpolatedPointAfter[0], newElevationProfile[newElevationProfile.length - 1][1]];
    } else {
      interpAfter = newElevationProfileExtraData.interpolatedPointAfter;
    }
    dataPointsBefore.push(interpBefore);
    dataPointsRemoved.unshift(interpBefore);
    dataPointsRemoved.push(interpAfter);
    dataPointsAfter.unshift(interpAfter);

    // Calculate distance of removed section (to know if we need to shift the "after" part of the graph to the right)
    const removedSectionDistance = newElevationProfileExtraData.interpolatedPointAfter[0] - newElevationProfileExtraData.interpolatedPointBefore[0];
    if (justEditingDistance > removedSectionDistance) {
      const diff = justEditingDistance - removedSectionDistance;
      dataPointsAfter = dataPointsAfter.map(pt => [pt[0] + diff, pt[1]]);
    }

    // This part is gross but I don't really know a better way
    // Interpolate all overlapping points between the removed and new sections so we can always see data for both when hovering over graph
    let [dataPointsRemovedFilled, newDataPointsFilled] = mergeFill(dataPointsRemoved, newElevationProfile);
    dataPointsRemoved = interpolateSpottyElevationData(dataPointsRemovedFilled);
    let newDataPoints = interpolateSpottyElevationData(newDataPointsFilled);

    // Convert to chart data points
    dataPointsBefore = dataPointsBefore.map(pt => ({
      x: pt[0],
      y: pt[1]
    }));
    dataPointsRemoved = dataPointsRemoved.map(pt => ({
      x: pt[0],
      y: pt[1]
    }));
    dataPointsAfter = dataPointsAfter.map(pt => ({
      x: pt[0],
      y: pt[1]
    }));
    newDataPoints = newDataPoints.map(pt => ({
      x: pt[0],
      y: pt[1]
    }));

    // Set all the state variables
    setChartDataPointsBefore(dataPointsBefore);
    setChartDataPointsRemoved(dataPointsRemoved);
    setChartDataPointsAfter(dataPointsAfter);
    setChartDataPointsNew(newDataPoints);
  }, [
    justEditingDistance,
    elevationProfile,
    newElevationProfile,
    newElevationProfileExtraData,
    editRedrawingRoute,
    editGapClosed
  ]);

  // Memoized chart datasets and chart options
  const datasets = useMemo(() => {
    if (!editRedrawingRoute) {
      return [
        // Elevation for normal routing
        {
          label: 'Elevation',
          data: chartDataPoints,
          borderColor: 'rgba(255, 255, 255, 0.8)',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          tension: 0.4, // Higher tension for smoother curves
          fill: true,
          pointRadius: 0, // Hide individual points for cleaner look
          borderWidth: 1.5,
          hidden: editRedrawingRoute
        }
      ];
    }

    return [
      // Elevations to be shown when bulk editing (before, removed, after, new)
      { // Before the edited section
        label: 'Elevation',
        data: chartDataPointsBefore,
        borderColor: 'rgba(255, 255, 255, 0.8)',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        tension: 0.4, // Higher tension for smoother curves
        fill: true,
        pointRadius: 0, // Hide individual points for cleaner look
        borderWidth: 1.5,
        hidden: !editRedrawingRoute
      },
      { // Section being edited/replaced
        label: 'Removed Elevation',
        data: chartDataPointsRemoved,
        borderColor: 'rgba(255, 255, 255, 0.8)',
        // backgroundColor: 'rgba(226, 18, 18, 0.38)',
        backgroundColor: createDiagonalPattern('rgba(255, 0, 0)', 0),
        tension: 0.4, // Higher tension for smoother curves
        fill: true,
        pointRadius: 0, // Hide individual points for cleaner look
        borderWidth: 1.5,
        hidden: !editRedrawingRoute
      },
      { // After the edited section
        label: 'Elevation',
        data: chartDataPointsAfter,
        borderColor: 'rgba(255, 255, 255, 0.8)',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        tension: 0.4, // Higher tension for smoother curves
        fill: true,
        pointRadius: 0, // Hide individual points for cleaner look
        borderWidth: 1.5,
        hidden: !editRedrawingRoute
      },
      { // New section (being added)
        label: 'New Elevation',
        data: chartDataPointsNew,
        borderColor: 'rgba(255, 255, 255, 0.8)',
        // backgroundColor: 'rgba(21, 232, 35, 0.3)',
        backgroundColor: createDiagonalPattern('rgba(21, 232, 35)', 4),
        tension: 0.4, // Higher tension for smoother curves
        fill: true,
        pointRadius: 0, // Hide individual points for cleaner look
        borderWidth: 1.5,
        hidden: !editRedrawingRoute
      }
    ];
  }, [chartDataPoints, chartDataPointsBefore, chartDataPointsRemoved, chartDataPointsAfter, chartDataPointsNew, editRedrawingRoute]);

  const chartOptions = useMemo(() => {
    return {
      responsive: true,
      animation: false,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        title: {
          display: false,
        },
        decimation: {
          enabled: true,
          // algorithm: 'lttb', // "Largest Triangle Three Buckets" method (preserves trends/general shape... Can switch to this if we want later)
          algorithm: 'min-max', // Keeps min/max points from each bucket (good for preserving mountain peaks/valley floors)
        },
        tooltip: {
          enabled: true,
          mode: 'nearest',
          axis: 'x',
          intersect: false,
          backgroundColor: 'rgba(35, 55, 75, 0.95)',
          titleColor: 'rgba(255, 255, 255, 1)',
          bodyColor: 'rgba(255, 255, 255, 1)',
          borderColor: 'rgba(255, 255, 255, 0.3)',
          borderWidth: 1,
          callbacks: {
            title: function(context) {
              const valueToUse = (imperialOrMetric === 'imperial') ? context[0].parsed.x : (context[0].parsed.x * 1.609344);
              const unitToUse = (imperialOrMetric === 'imperial') ? 'miles' : 'km';
              return `${valueToUse.toFixed(2)} ${unitToUse}`;
            },
            label: function(context) {
              const valueToUse = (imperialOrMetric === 'imperial') ? context.parsed.y : (context.parsed.y / 3.28084);
              const unitToUse = (imperialOrMetric === 'imperial') ? 'ft' : 'm';
              return `${context.dataset.label}: ${valueToUse.toFixed(0)} ${unitToUse}`;
            }
          }
        },
      },
      scales: {
        x: {
          type: 'linear',
          title: {
            display: true,
            text: `Distance (${imperialOrMetric === 'imperial' ? 'miles' : 'km'})`,
            color: 'rgba(255, 255, 255, 1.0)',
            font: {
              size: 12,
            },
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)',
          },
          ticks: {
            color: 'rgba(255, 255, 255, 1.0)',
            maxTicksLimit: 11, // Limit number of ticks for cleaner look (11 so we can have 0 -> distance)
            stepSize: routeDistance / 10, // Show about 10 ticks
            callback: function(value) {
              const valueToUse = (imperialOrMetric === 'imperial') ? value : (value * 1.609344);
              return valueToUse.toFixed(1); // Limit to 1 decimal place
            }
          },
          min: 0,
          max: editRedrawingRoute ? Math.max(newDistance, routeDistance) : routeDistance,
        },
        y: {
          title: {
            display: true,
            text: `Elevation (${imperialOrMetric === 'imperial' ? 'ft' : 'm'})`,
            color: 'rgba(255, 255, 255, 1.0)',
            font: {
              size: 12,
            },
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)',
          },
          ticks: {
            color: 'rgba(255, 255, 255, 1.0)',
            callback: function(value) {
              const valueToUse = (imperialOrMetric === 'imperial') ? value : (value / 3.28084);
              return valueToUse.toFixed(0); // Limit to 0 decimal place
            }
          },
        },
      },
    };
  }, [imperialOrMetric, editRedrawingRoute, routeDistance, newDistance]);

  return (
    <div className="elevation-profile-chart" style={{ position: 'relative' }}>
      {(elevationLoading || (editRedrawingRoute && newElevationLoading)) && (
        <div className="loading-elevation-data"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '14px'
          }}
        >
          <CircularProgress
            size={30}
            sx={{ color: 'rgba(255, 255, 255, 0.8)' }}
          />
          <div>Loading elevation data...</div>
        </div>
      )}
      <Line
        data={{ datasets }}
        options={chartOptions}
        plugins={[verticalLinePlugin]}
      />
    </div>
  );
};

export default ElevationProfileChart;
