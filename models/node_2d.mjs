import { CanvasItem } from './canvas_item.mjs';
import { Vector2 } from './vector2.mjs';

/**
 * Represents a 2D node in a scene.
 * @class Node2D
 * @extends CanvasItem
 * @property {Vector2} position - The position of the node in 2D space.
 * @property {number} rotation - The rotation of the node in degrees.
 * @property {Vector2} scale - The scale of the node in 2D space.
 * @property {number} skew - The skew of the node.
 */
export class Node2D extends CanvasItem {
  constructor({
    position = new Vector2(0, 0),
    rotation = 0,
    scale = new Vector2(1, 1),
    skew = 0,
  } = {}) {
    super();
    this.position = position;
    this.rotation = rotation;
    this.scale = scale;
    this.skew = skew;
  }
}
