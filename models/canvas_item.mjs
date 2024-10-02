import { checkDefault } from '../utils.mjs';
import { Color } from './color.mjs';
import { Node as GDNode } from './node.mjs';

/**
 * Represents a drawable object in a 2D space.
 * @class CanvasItem
 * @extends GDNode
 */
export class CanvasItem extends GDNode {
  /**
   * @param {Object} [props]
   * @param {Color} [props.modulate]
   * @param {number} [props.zIndex]
   */
  constructor({
    modulate = new Color(1, 1, 1, 1),
    zIndex = 0,
  } = {}) {
    super();
    /** @type {Color} */
    this.modulate = modulate;
    /** @type {number} */
    this.zIndex = zIndex;

    this.setName("CanvasItem");
    this.setType("CanvasItem");
  }

  /**
   * Sets the modulate of this canvas.
   * 
   * @param {Color} modulate - The new modulate to set.
   * @returns {CanvasItem} - The canvas item, updated.
   */
  setModulate(modulate) {
    this.modulate = modulate;
    return this;
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

    properties.modulate = checkDefault(this.modulate, new Color(1, 1, 1, 1));
    properties.z_index = checkDefault(this.zIndex, 0);

    return properties;
  }
}
