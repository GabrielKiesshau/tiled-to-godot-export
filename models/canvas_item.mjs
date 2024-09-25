import { checkDefault } from '../utils.mjs';
import { Node as GDNode } from './node.mjs';

/**
 * Represents a drawable object in a 2D space.
 * @class CanvasItem
 * @extends GDNode
 */
export class CanvasItem extends GDNode {
  /**
   * @param {Object} [props]
   * @param {number} [props.zIndex]
   */
  constructor({
    zIndex = 0,
  } = {}) {
    super();
    /** @type {number} */
    this.zIndex = zIndex;

    this.setName("CanvasItem");
    this.setType("CanvasItem");
  }

  /**
   * Sets the z-index of this canvas.
   * 
   * @param {number} zIndex - The new z-index to set.
   * @returns {CanvasItem} - The canvas item, updated.
   */
  setZIndex(zIndex) {
    this.zIndex = zIndex;
    return this;
  }

  getProperties() {
    var properties = {};

    properties.z_index = checkDefault(this.zIndex, 0);

    return properties;
  }
}
