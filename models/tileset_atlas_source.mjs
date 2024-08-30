import { Resource } from './resource.mjs';
import { Vector2i } from './vector2.mjs';

/**
* Represents a TileSetAtlasSource.
* @class TileSetAtlasSource
 * @property {TileLayout} margins - 
 * @property {TileOffsetAxis} separation - 
 * @property {Texture2D} texture - 
 * @property {Vector2i} textureRegionSize - 
 * @property {boolean} useTexturePadding - 
*/
export class TileSetAtlasSource extends Resource {
  constructor({
    margins = new Vector2i({x: 0, y: 0}),
    separation = new Vector2i({x: 0, y: 0}),
    texture = null,
    textureRegionSize = new Vector2i({x: 0, y: 0}),
    useTexturePadding = true,
    resource = {
      type: "TileSetAtlasSource",
    },
  } = {}) {
    super(resource);
    this.margins = margins;
    this.separation = separation;
    this.texture = texture;
    this.textureRegionSize = textureRegionSize;
    this.useTexturePadding = useTexturePadding;
    this.type = "TileSetAtlasSource";
  }
}
