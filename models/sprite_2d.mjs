import { Node2D } from './node_2d.mjs';

/**
 * Represents a Sprite2D.
 * @class Sprite2D
 * @extends Node2D
 */
export class Sprite2D extends Node2D {
  constructor() {
    super();

    this.setName("Node2D");
    this.setType("Sprite2D");
    this.setZIndex(0);
  }
}
