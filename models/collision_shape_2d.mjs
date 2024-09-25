import { Node2D } from './node_2d.mjs';
import { Shape2D } from './shape_2d.mjs';

/**
 * Represents a CollisionShape2D.
 * @class CollisionShape2D
 * @extends Node2D
 */
export class CollisionShape2D extends Node2D {
  /**
   * @param {Object} [props]
   * @param {Shape2D} [props.shape]
   */
  constructor({
    shape = null,
  } = {}) {
    super();
    /** @type {Shape2D} */
    this.shape = shape;

    this.setName("CollisionShape2D");
    this.setType("CollisionShape2D");
    this.setZIndex(0);
  }

  getProperties() {
    var parentProperties = super.getProperties();

    parentProperties.shape = `SubResource("${this.shape.id}")`;

    return parentProperties;
  }
}
