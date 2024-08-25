import { DebugVisibilityMode } from '../enums/debug_visibility_mode.mjs';
import { Node2D } from './node_2d.mjs';
import { PackedByteArray } from './packed_byte_array.mjs';
import { Tileset as GDTileset } from './tileset.mjs';

/**
 * Represents a layer within a TileMap.
 * @class TileMapLayer
 * @extends Node2D
 * @property {boolean} collisionEnabled - Whether collision detection is enabled for this layer.
 * @property {DebugVisibilityMode} collisionVisibilityMode - The mode for collision visibility.
 * @property {boolean} enabled - Whether the layer is enabled for rendering.
 * @property {boolean} navigationEnabled - Whether navigation is enabled for this layer.
 * @property {DebugVisibilityMode} navigationVisibilityMode - The mode for navigation visibility.
 * @property {number} renderingQuadrantSize - The size of the rendering quadrant for this layer.
 * @property {PackedByteArray} tileMapData - The tilemap data of this this layer.
 * @property {GDTileset} tileset - The tileset associated with this layer.
 * @property {boolean} useKinematicBodies - Whether to use kinematic bodies for collision.
 * @property {boolean} xDrawOrderReversed - 
 * @property {number} ySortOrigin - The Y-coordinate origin used for Y-sorting.
 */
export class TileMapLayer extends Node2D {
  constructor({
    collisionEnabled = true,
    collisionVisibilityMode = DebugVisibilityMode.Default,
    enabled = true,
    navigationEnabled = true,
    navigationVisibilityMode = DebugVisibilityMode.Default,
    renderingQuadrantSize = 16,
    tileMapData = new PackedByteArray(),
    tileset = null,
    useKinematicBodies = false,
    xDrawOrderReversed = false,
    ySortOrigin = 0,
    node2D = {
      
    },
  } = {}) {
    super(node2D);
    this.collisionEnabled = collisionEnabled;
    this.collisionVisibilityMode = collisionVisibilityMode;
    this.enabled = enabled;
    this.navigationEnabled = navigationEnabled;
    this.navigationVisibilityMode = navigationVisibilityMode;
    this.renderingQuadrantSize = renderingQuadrantSize;
    this.tileMapData = tileMapData;
    this.tileset = tileset;
    this.useKinematicBodies = useKinematicBodies;
    this.xDrawOrderReversed = xDrawOrderReversed;
    this.ySortOrigin = ySortOrigin;
    this.type = "TileMapLayer";
  }
}
