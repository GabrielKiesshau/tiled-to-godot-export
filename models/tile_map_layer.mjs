import { checkDefault } from '../utils.mjs';
import { DebugVisibilityMode } from '../enums/debug_visibility_mode.mjs';
import { Node2D } from './node_2d.mjs';
import { PackedByteArray } from './packed_byte_array.mjs';

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
      canvasItem: {
        name: "TileMapLayer",
      },
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

  getProperties() {
    return {
      collision_enabled: checkDefault(this.collisionEnabled, true),
      collision_visibility_mode: checkDefault(this.collisionVisibilityMode, DebugVisibilityMode.Default),
      enabled: checkDefault(this.enabled, true),
      navigation_enabled: checkDefault(this.navigationEnabled, true),
      navigation_visibility_mode: checkDefault(this.navigationVisibilityMode, DebugVisibilityMode.Default),
      rendering_quadrant_size: checkDefault(this.renderingQuadrantSize, 16),
      tile_set: `ExtResource("${this.tileset.id}")`,
      tile_map_data: checkDefault(this.tileMapData, new PackedByteArray()),
      use_kinematic_bodies: checkDefault(this.useKinematicBodies, false),
      x_draw_order_reversed: checkDefault(this.xDrawOrderReversed, false),
      y_sort_origin: checkDefault(this.ySortOrigin, 0),
    };
  }
}
