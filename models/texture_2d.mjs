import { Resource } from './resource.mjs';

/**
* Represents a texture to be used in a TileSet.
* @class Texture2D
*/
export class Texture2D extends Resource {
  constructor() {
    super();

    this.setName("Texture2D");
    this.setType("Texture2D");
  }
}
