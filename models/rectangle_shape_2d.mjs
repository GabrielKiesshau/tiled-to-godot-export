import { checkDefault } from '../utils.mjs';
import { Shape2D } from './shape_2d.mjs';
import { Vector2 } from './vector2.mjs';

/**
 * Represents a RectangleShape2D.
 * @class RectangleShape2D
 * @extends Shape2D
 */
export class RectangleShape2D extends Shape2D {
  /**
   * @param {Object} [props]
   * @param {Vector2} [props.size]
   */
  constructor({
    size = new Vector2({ x: 20, y: 20 }),
  } = {}) {
    super();
    /** @type {Vector2} */
    this.size = size;

    super.type = "RectangleShape2D";
  }

  getProperties() {
    return {
      size: checkDefault(this.size, new Vector2({ x: 20, y: 20 })),
    };
  }
}
