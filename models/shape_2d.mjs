import { Resource } from './resource.mjs';

/**
 * Represents a Shape2D.
 * @class Shape2D
 * @extends Resource
 */
export class Shape2D extends Resource {
  /**
   * @param {Object} [props]
   * @param {Node2D} [props.node2D]
   */
  constructor({ } = {}) {
    super({});
    this.type = "Shape2D";
  }
}
