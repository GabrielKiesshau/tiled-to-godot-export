import { Resource } from './resource.mjs';

/**
* Represents a texture to be used in a TileSet.
* @class Texture2D
*/
export class Texture2D extends Resource {
  constructor({
    resource = {
      name: "Texture2D",
      path: "",
    },
  } = {}) {
    super(resource);
    this.type = "Texture2D";
  }
}
