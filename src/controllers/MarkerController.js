import { v4 as uuidv4 } from 'uuid';

// Helper function for creating markers
// This way when we add new fields, we only have to change this function
// and not all the places we create markers (there are a lot...)
export function Marker ({
    id=uuidv4(),
    lngLat=[0.0, 0.0],
    associatedLines=[],
    isDragging=false,
    snappedToRoad=false,
    elevation=0.0,
    selectedForEdit=false,
    originalLngLat=null,
    hidden=false
  }) {
  return {
    id: id,
    lngLat: lngLat,
    associatedLines: associatedLines,
    isDragging: isDragging,
    snappedToRoad: snappedToRoad,
    elevation: elevation,
    selectedForEdit: selectedForEdit,
    originalLngLat: originalLngLat,
    hidden: hidden
  }
}
