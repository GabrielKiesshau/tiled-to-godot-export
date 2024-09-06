import { Node2D } from './node_2d.mjs';

/**
 * Represents a Sprite2D.
 * @class Sprite2D
 * @extends Node2D
 */
export class Sprite2D extends Node2D {
  /**
   * @param {Object} [props]
   * @param {Node2D} [props.node2D]
   */
  constructor({
    node2D = {
      canvasItem: {
        zIndex: 0,
        node: {
          name: "Node2D",
        },
      },
    },
  } = {}) {
    super(node2D);
    this.type = "Sprite2D";
  }
}
