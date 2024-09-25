import { checkDefault } from '../utils.mjs';
import { CanvasItem } from './canvas_item.mjs';
import { Vector2 } from './vector2.mjs';

/**
 * Represents a 2D node in a scene.
 * @class Node2D
 * @extends CanvasItem
 */
export class Node2D extends CanvasItem {
  /**
   * @param {Object} [props]
   * @param {Vector2} [props.position]
   * @param {number} [props.rotation]
   * @param {Vector2} [props.scale]
   * @param {number} [props.skew]
   */
  constructor({
    position = new Vector2(0, 0),
    rotation = 0,
    scale = new Vector2(1, 1),
    skew = 0,
  } = {}) {
    super();
    /** @type {Vector2} */
    this.position = position;
    /** @type {number} */
    this.rotation = rotation;
    /** @type {Vector2} */
    this.scale = scale;
    /** @type {number} */
    this.skew = skew;

    this.setName("Node2D");
    this.setType("Node2D");
    this.setZIndex(0);
  }

  /**
   * Sets the position of this Node2D.
   * 
   * @param {Vector2} position - The new position to set.
   * @returns {Node2D} - The Node2D, updated.
   */
  setPosition(position) {
    this.position = position;
    return this;
  }

  /**
   * Sets the rotation of this Node2D.
   * 
   * @param {number} rotation - The new rotation to set.
   * @returns {Node2D} - The Node2D, updated.
   */
  setRotation(rotation) {
    this.rotation = rotation;
    return this;
  }

  getProperties() {
    var properties = super.getProperties();

    properties.position = checkDefault(this.position, new Vector2(0, 0));
    properties.rotation = checkDefault(this.rotation, 0);
    properties.scale = checkDefault(this.scale, new Vector2(1, 1));
    properties.skew = checkDefault(this.skew, 0);

    return properties;
  }
}
