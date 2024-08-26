import { checkDefault } from '../utils.mjs';
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
  /**
   * @param {Object} [props]
   * @param {Vector2} [props.position]
   * @param {number} [props.rotation]
   * @param {Vector2} [props.scale]
   * @param {number} [props.skew]
   * @param {CanvasItem} [props.canvasItem]
   */
  constructor({
    position = new Vector2({x: 0, y: 0}),
    rotation = 0,
    scale = new Vector2({x: 1, y: 1}),
    skew = 0,
    canvasItem = {
      node: {
        name: "Node2D",
      },
    },
  } = {}) {
    super(canvasItem);
    this.position = position;
    this.rotation = rotation;
    this.scale = scale;
    this.skew = skew;
    this.type = "Node2D";
  }

  getProperties() {
    return {
      position: checkDefault(this.position, new Vector2({x: 0, y: 0})),
      rotation: checkDefault(this.rotation, 0),
      scale: checkDefault(this.scale, new Vector2({x: 1, y: 1})),
      skew: checkDefault(this.skew, 0),
    };
  }
}
