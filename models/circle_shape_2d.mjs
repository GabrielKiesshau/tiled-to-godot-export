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
   * @param {Shape2D} [props.shape2D]
   */
  constructor({
    radius = 10,
    shape2D = { },
  } = {}) {
    super(shape2D);
    /** @type {number} */
    this.radius = radius;
    /** @type {string} */
    this.type = "CircleShape2D";
  }

  getProperties() {
    return {
      radius: checkDefault(this.radius, 10),
    };
  }
}
