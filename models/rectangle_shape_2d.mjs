// import { checkDefault } from '../utils.mjs';
import { Shape2D } from './shape_2d.mjs';

/**
 * Represents a RectangleShape2D.
 * @class RectangleShape2D
 * @extends Shape2D
 */
export class RectangleShape2D extends Shape2D {
  /**
   * @param {Object} [props]
   * @param {Vector2} [props.size]
   * @param {Shape2D} [props.shape2D]
   */
  constructor({
    size = new Vector2(20, 20),
    shape2D = { },
  } = {}) {
    super(shape2D);
    this.size = size;
    this.type = "RectangleShape2D";
  }

  getProperties() {
    return {
      size: this.size,
      //TODO check if Godot keeps the value even when default
      // size: checkDefault(this.size, new Vector2(20, 20)),
    };
  }
}
