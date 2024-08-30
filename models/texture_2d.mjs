import { ExternalResource } from './external_resource.mjs';

/**
* Represents a texture to be used in a TileSet.
* @class Texture2D
*/
export class Texture2D extends ExternalResource {
  constructor({
    externalResource = {
      name: "Texture2D",
      path: "",
    },
  } = {}) {
    super(externalResource);
    this.type = "Texture2D";
  }
}
