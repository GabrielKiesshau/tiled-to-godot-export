import { Resource } from './resource.mjs';

/**
* Represents a packed scene.
* @class PackedScene
*/
export class PackedScene extends Resource {
  constructor() {
    super();

    this.setType("PackedScene");
  }
}
