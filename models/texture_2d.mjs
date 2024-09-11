import { Resource } from './resource.mjs';

/**
* Represents a texture to be used in a TileSet.
* @class Texture2D
*/
export class Texture2D extends Resource {
  constructor() {
    super();

    super.name = "Texture2D";
    super.type = "Texture2D";
  }
}
