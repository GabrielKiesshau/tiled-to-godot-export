import { Resource } from './resource.mjs';

/**
 * Represents a Shape2D.
 * @class Shape2D
 * @extends Resource
 */
export class Shape2D extends Resource {
  constructor() {
    super();

    this.setType("Shape2D");
  }
}
