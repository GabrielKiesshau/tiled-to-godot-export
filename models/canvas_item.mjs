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

    super.name = "CanvasItem";
    super.type = "CanvasItem";
  }

  getProperties() {
    var properties = {};

    properties.z_index = checkDefault(this.zIndex, 0);

    return properties;
  }
}
