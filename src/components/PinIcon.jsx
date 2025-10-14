import * as React from 'react';

// Noun project pin shape
const ICON = `m600 200c-152.5 0-275 122.5-275 275s275 525 275 525 275-372.5 275-525-122.5-275-275-275zm0 400c-70 0-125-55-125-125s55-125 125-125 125 55 125 125-55 125-125 125z`;

const pinStyle = {
  cursor: 'pointer',
  stroke: 'none'
};

// Color mapping from color names to hex values
const COLOR_MAP = {
  red: '#e00',
  blue: '#0066cc',
  green: '#00bb00',
  yellow: '#ffcc00',
  orange: '#ff8800',
  purple: '#9933cc',
  pink: '#ff69b4',
  black: '#000000',
  white: '#ffffff'
};

function Pin({pinId, isOnEdge, size = 33, color = 'red'}) {
  const fillColor = COLOR_MAP[color] || COLOR_MAP.red;

  // Tighter viewBox to match the actual path bounds
  // Original path is centered at x=600, extends ±275 in x, from y=200 to y=1000
  return (
    <svg height={size} viewBox="325 200 550 800" style={{...pinStyle, ...(isOnEdge ? {opacity: 0.55} : null)}}>
      <path cursor="pointer" id={`pin-${pinId}`} d={ICON} fill={fillColor} fillRule="evenodd"
        strokeWidth={color === 'white' ? '12px' : '0'} stroke={color === 'white' ? 'black' : 'none'}/>
      <circle cursor="pointer" cx="600" cy="475" r="125" fill="white"
        strokeWidth={color === 'white' ? '12px' : '0'} stroke={color === 'white' ? 'black' : 'none'}/>
    </svg>
  );
}

export default React.memo(Pin);