import { checkDefault } from '../utils.mjs';
import { Shape2D } from './shape_2d.mjs';

/**
 * Represents a CircleShape2D.
 * @class CircleShape2D
 * @extends Shape2D
 */
export class CircleShape2D extends Shape2D {
  /**
   * @param {Object} [props]
   * @param {number} [props.radius]
   */
  constructor({
    radius = 10,
  } = {}) {
    super();
    /** @type {number} */
    this.radius = radius.toFixed(2).replace(/\.?0+$/, "");

    this.setType("CircleShape2D");
  }

  getProperties() {
    return {
      radius: checkDefault(this.radius, 10),
    };
  }
}
