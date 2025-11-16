class ElevationControl {
  _container;

  constructor() {
    // No arguments needed for now
  }

  onAdd(map) {
    this._map = map;

    // Create main container
    this._container = document.createElement('div');
    this._container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group';
    this._container.style.cssText = `
      box-shadow: 0 0 0 2px #0000001a;
      background: #fff;
      border-radius: 4px;
      margin: 10px 10px 0 0;
    `;

    // Create button
    const button = document.createElement('button');
    button.className = 'mapboxgl-ctrl-icon';
    button.type = 'button';
    button.title = 'Elevation Profile';
    button.style.cssText = `
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      background: transparent;
      cursor: pointer;
      padding: 0;
      transition: background-color 0.2s ease;
    `;

    // Add hover effect
    button.addEventListener('mouseenter', () => {
      button.style.backgroundColor = '#0000000d';
    });

    button.addEventListener('mouseleave', () => {
      button.style.backgroundColor = 'transparent';
    });

    // Create Material UI Terrain icon using SVG (exact path from @mui/icons-material)
    const terrainIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    terrainIcon.setAttribute('width', '20');
    terrainIcon.setAttribute('height', '20');
    terrainIcon.setAttribute('viewBox', '0 0 24 24');
    terrainIcon.setAttribute('fill', 'black');
    terrainIcon.innerHTML = `
      <path d="M14 6l-3.75 5 2.85 3.8-1.6 1.2C9.81 13.75 7 10 7 10l-6 8h22l-9-12z"/>
    `;

    button.appendChild(terrainIcon);
    this._container.appendChild(button);

    // Add click handler
    button.addEventListener('click', () => {
      // Dispatch a custom event that the React component can listen to
      const event = new CustomEvent('elevationControlClick');
      window.dispatchEvent(event);
    });

    return this._container;
  }

  onRemove() {
    // Clean up container
    if (this._container && this._container.parentNode) {
      this._container.parentNode.removeChild(this._container);
    }
    this._map = undefined;
  }
}

export default ElevationControl;
