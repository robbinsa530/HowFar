import * as React from 'react';

// Noun project pin shape
const ICON = `m600 200c-152.5 0-275 122.5-275 275s275 525 275 525 275-372.5 275-525-122.5-275-275-275zm0 400c-70 0-125-55-125-125s55-125 125-125 125 55 125 125-55 125-125 125z`;

const pinStyle = {
  cursor: 'pointer',
  stroke: 'none'
};

function Pin({pinId, isOnEdge, size = 33}) {
  // Tighter viewBox to match the actual path bounds
  // Original path is centered at x=600, extends ±275 in x, from y=200 to y=1000
  return (
    <svg height={size} viewBox="325 200 550 800" style={{...pinStyle, ...(isOnEdge ? {opacity: 0.55} : null)}}>
      <path cursor="pointer" id={`pin-${pinId}`} d={ICON} fill="#e00" fillRule="evenodd" />
      <circle cursor="pointer" cx="600" cy="475" r="125" fill="white" />
    </svg>
  );
}

export default React.memo(Pin);