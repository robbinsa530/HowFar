class LayersControl {
  _container;
  _dropdown;
  _isOpen = false;
  _boundHandleClickOutside;
  _currentMapType = 0;

  constructor(initialMapType = 0) {
    this._currentMapType = initialMapType;
    this._boundHandleClickOutside = this.handleClickOutside.bind(this);
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
      position: relative;
    `;

    // Create button
    const button = document.createElement('button');
    button.className = 'mapboxgl-ctrl-icon';
    button.type = 'button';
    button.title = 'Map Type';
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
      if (!this._isOpen) {
        button.style.backgroundColor = '#0000000d';
      }
    });

    button.addEventListener('mouseleave', () => {
      if (!this._isOpen) {
        button.style.backgroundColor = 'transparent';
      }
    });

    // Create Material UI Layers icon using SVG (exact path from @mui/icons-material)
    const layersIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    layersIcon.setAttribute('width', '20');
    layersIcon.setAttribute('height', '20');
    layersIcon.setAttribute('viewBox', '0 0 24 24');
    layersIcon.setAttribute('fill', 'black');
    layersIcon.innerHTML = `
      <path d="m11.99 18.54-7.37-5.73L3 14.07l9 7 9-7-1.63-1.27zM12 16l7.36-5.73L21 9l-9-7-9 7 1.63 1.27z"/>
    `;

    button.appendChild(layersIcon);
    this._container.appendChild(button);

    // Create dropdown menu
    this._dropdown = document.createElement('div');
    this._dropdown.className = 'layers-control-dropdown';
    this._dropdown.style.cssText = `
      position: absolute;
      top: 100%;
      right: 0;
      margin-top: 4px;
      background: white;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      min-width: 150px;
      z-index: 1000;
      display: none;
      overflow: hidden;
    `;

    // Map type options
    const mapTypes = [
      { value: 0, label: 'Standard' },
      { value: 1, label: 'Outdoors' },
      { value: 2, label: 'Satellite' },
      { value: 3, label: 'Dark Theme' }
    ];

    mapTypes.forEach((type) => {
      const option = document.createElement('div');
      option.className = 'layers-control-option';
      option.style.cssText = `
        padding: 10px 16px;
        cursor: pointer;
        transition: background-color 0.2s ease;
        font-size: 14px;
        color: #333;
      `;
      option.textContent = type.label;
      option.dataset.value = type.value;

      option.addEventListener('mouseenter', () => {
        option.style.backgroundColor = '#f5f5f5';
      });

      option.addEventListener('mouseleave', () => {
        if (parseInt(option.dataset.value) !== this._currentMapType) {
          option.style.backgroundColor = 'transparent';
        }
      });

      option.addEventListener('click', () => {
        // Dispatch event with the selected map type
        const event = new CustomEvent('layersControlMapTypeChange', {
          detail: { mapType: type.value }
        });
        window.dispatchEvent(event);
        this.closeDropdown();
      });

      this._dropdown.appendChild(option);
    });

    // Set initial selected state
    this.updateSelectedMapType(this._currentMapType);

    this._container.appendChild(this._dropdown);

    // Add click handler to toggle dropdown
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleDropdown();
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', this._boundHandleClickOutside);
    document.addEventListener('contextmenu', this._boundHandleClickOutside);

    return this._container;
  }

  toggleDropdown() {
    this._isOpen = !this._isOpen;
    if (this._isOpen) {
      this._dropdown.style.display = 'block';
      const button = this._container.querySelector('button');
      if (button) {
        button.style.backgroundColor = '#0000000d';
      }
    } else {
      this.closeDropdown();
    }
  }

  closeDropdown() {
    this._isOpen = false;
    this._dropdown.style.display = 'none';
    const button = this._container.querySelector('button');
    if (button) {
      button.style.backgroundColor = 'transparent';
    }
  }

  handleClickOutside(event) {
    if (this._container && !this._container.contains(event.target)) {
      this.closeDropdown();
    }
  }

  updateSelectedMapType(mapType) {
    this._currentMapType = mapType;
    if (!this._dropdown) return;

    const options = this._dropdown.querySelectorAll('.layers-control-option');
    options.forEach((option) => {
      const value = parseInt(option.dataset.value);
      if (value === mapType) {
        option.style.backgroundColor = '#e3f2fd';
        option.style.fontWeight = '500';
      } else {
        option.style.backgroundColor = 'transparent';
        option.style.fontWeight = 'normal';
      }
    });
  }

  onRemove() {
    // Clean up event listeners
    document.removeEventListener('click', this._boundHandleClickOutside);
    document.removeEventListener('contextmenu', this._boundHandleClickOutside);

    // Clean up container
    if (this._container && this._container.parentNode) {
      this._container.parentNode.removeChild(this._container);
    }
    this._map = undefined;
  }
}

export default LayersControl;
