import { TileLayout } from '../enums/tile_layout.mjs';
import { TileOffsetAxis } from '../enums/tile_offset_axis.mjs';
import { TileShape } from '../enums/tile_shape.mjs';
import { Vector2i } from './vector2.mjs';

/**
* Represents a collection of tiles used in a TileMapLayer.
* @class Tileset
 * @property {TileLayout} tileLayout - 
 * @property {TileOffsetAxis} tileOffsetAxis - 
 * @property {TileShape} tileShape - 
 * @property {Vector2i} tileSize - 
 * @property {boolean} uvClipping - 
*/
export class Tileset {
  constructor({
    tileLayout = TileLayout.Stacked,
    tileOffsetAxis = TileOffsetAxis.Horizontal,
    tileShape = TileShape.Square,
    tileSize = new Vector2i({x: 16, y: 16}),
    uvClipping = false,
  } = {}) {
    this.tileLayout = tileLayout;
    this.tileOffsetAxis = tileOffsetAxis;
    this.tileShape = tileShape;
    this.tileSize = tileSize;
    this.uvClipping = uvClipping;
  }
}
