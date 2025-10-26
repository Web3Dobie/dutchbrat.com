// lib/imageOrientationUtils.ts
// Utility functions for handling EXIF image orientation

/**
 * Convert EXIF orientation value to CSS transform
 * EXIF Orientation values:
 * 1 = Normal (0°)
 * 2 = Flip horizontal  
 * 3 = Rotate 180°
 * 4 = Flip vertical
 * 5 = Flip horizontal + rotate 270° CW
 * 6 = Rotate 90° CW (clockwise)
 * 7 = Flip horizontal + rotate 90° CW  
 * 8 = Rotate 270° CW (90° counter-clockwise)
 */
export function getOrientationTransform(orientation?: number | null): string {
  if (!orientation || orientation === 1) {
    return 'none' // Normal orientation
  }

  switch (orientation) {
    case 2:
      return 'scaleX(-1)' // Flip horizontal
    case 3:
      return 'rotate(180deg)' // Rotate 180°
    case 4:
      return 'scaleY(-1)' // Flip vertical
    case 5:
      return 'scaleX(-1) rotate(270deg)' // Flip horizontal + rotate 270° CW
    case 6:
      return 'rotate(90deg)' // Rotate 90° CW
    case 7:
      return 'scaleX(-1) rotate(90deg)' // Flip horizontal + rotate 90° CW
    case 8:
      return 'rotate(270deg)' // Rotate 270° CW (90° counter-clockwise)
    default:
      return 'none'
  }
}

/**
 * Get CSS style object for image orientation
 * This is the main function used by the React components
 */
export function getOrientationStyle(orientation?: number | null): React.CSSProperties {
  const transform = getOrientationTransform(orientation)
  
  if (transform === 'none') {
    return {}
  }

  return {
    transform,
    transformOrigin: 'center center'
  }
}

/**
 * Get CSS class name for orientation (if you prefer CSS classes)
 */
export function getOrientationClass(orientation?: number | null): string {
  if (!orientation || orientation === 1) {
    return ''
  }

  return `orientation-${orientation}`
}

/**
 * Check if an orientation value requires transformation
 */
export function needsOrientation(orientation?: number | null): boolean {
  return orientation !== null && orientation !== undefined && orientation !== 1
}

/**
 * Get a human-readable description of the orientation
 */
export function getOrientationDescription(orientation?: number | null): string {
  if (!orientation || orientation === 1) {
    return 'Normal'
  }

  switch (orientation) {
    case 2:
      return 'Flipped horizontally'
    case 3:
      return 'Rotated 180°'
    case 4:
      return 'Flipped vertically'
    case 5:
      return 'Flipped horizontally + rotated 270°'
    case 6:
      return 'Rotated 90° clockwise'
    case 7:
      return 'Flipped horizontally + rotated 90°'
    case 8:
      return 'Rotated 270° clockwise'
    default:
      return `Unknown orientation (${orientation})`
  }
}