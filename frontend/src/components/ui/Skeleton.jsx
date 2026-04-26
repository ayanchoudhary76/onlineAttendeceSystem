import React from 'react';

/**
 * Skeleton — pulsing placeholder block.
 * @param {string} width  - CSS width  (default '100%')
 * @param {string} height - CSS height (default '1rem')
 * @param {string} className - extra classes
 */
const Skeleton = ({ width = '100%', height = '1rem', className = '' }) => (
  <div
    className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}
    style={{ width, height }}
  />
);

export default Skeleton;
