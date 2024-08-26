// import { checkDefault } from '../utils.mjs';
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
    radius = 10.0,
    shape2D = { },
  } = {}) {
    super(shape2D);
    this.radius = radius;
    this.type = "CircleShape2D";
  }

  getProperties() {
    return {
      radius: 10.0,
      //TODO check if Godot keeps the value even when default
      // radius: checkDefault(this.radius, 10.0),
    };
  }
}
