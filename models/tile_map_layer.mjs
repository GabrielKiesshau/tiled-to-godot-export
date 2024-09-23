import { checkDefault } from '../utils.mjs';
import { DebugVisibilityMode } from '../enums/debug_visibility_mode.mjs';
import { Node2D } from './node_2d.mjs';
import { PackedByteArray } from './packed_byte_array.mjs';
import { GDTileset } from './tileset.mjs';

/**
 * Represents a layer within a TileMap.
 * @class TileMapLayer
 * @extends Node2D
 */
export class TileMapLayer extends Node2D {
  /**
   * @param {Object} [props]
   * @param {boolean} [props.collisionEnabled] - Whether collision detection is enabled for this layer.
   * @param {DebugVisibilityMode} [props.collisionVisibilityMode] - The mode for collision visibility.
   * @param {boolean} [props.enabled] - Whether the layer is enabled for rendering.
   * @param {boolean} [props.navigationEnabled] - Whether navigation is enabled for this layer.
   * @param {DebugVisibilityMode} [props.navigationVisibilityMode] - The mode for navigation visibility.
   * @param {number} [props.renderingQuadrantSize] - The size of the rendering quadrant for this layer.
   * @param {PackedByteArray} [props.tileMapData] - The tilemap data of this this layer.
   * @param {GDTileset} [props.tileset] - The tileset associated with this layer.
   * @param {boolean} [props.useKinematicBodies] - Whether to use kinematic bodies for collision.
   * @param {boolean} [props.xDrawOrderReversed] - 
   * @param {number} [props.ySortOrigin] - The Y-coordinate origin used for Y-sorting.
   */
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
  } = {}) {
    super();
    /** @type {boolean} */
    this.collisionEnabled = collisionEnabled;
    /** @type {DebugVisibilityMode} */
    this.collisionVisibilityMode = collisionVisibilityMode;
    /** @type {boolean} */
    this.enabled = enabled;
    /** @type {boolean} */
    this.navigationEnabled = navigationEnabled;
    /** @type {DebugVisibilityMode} */
    this.navigationVisibilityMode = navigationVisibilityMode;
    /** @type {number} */
    this.renderingQuadrantSize = renderingQuadrantSize;
    /** @type {PackedByteArray} */
    this.tileMapData = tileMapData;
    /** @type {GDTileset} */
    this.tileset = tileset;
    /** @type {boolean} */
    this.useKinematicBodies = useKinematicBodies;
    /** @type {boolean} */
    this.xDrawOrderReversed = xDrawOrderReversed;
    /** @type {number} */
    this.ySortOrigin = ySortOrigin;

    this.setName("TileMapLayer");
    this.setType("TileMapLayer");
    this.setZIndex(0);
  }

  getProperties() {
    var parentProperties = super.getProperties();

    parentProperties.collision_enabled = checkDefault(this.collisionEnabled, true);
    parentProperties.collision_visibility_mode = checkDefault(this.collisionVisibilityMode, DebugVisibilityMode.Default);
    parentProperties.enabled = checkDefault(this.enabled, true);
    parentProperties.navigation_enabled = checkDefault(this.navigationEnabled, true);
    parentProperties.navigation_visibility_mode = checkDefault(this.navigationVisibilityMode, DebugVisibilityMode.Default);
    parentProperties.rendering_quadrant_size = checkDefault(this.renderingQuadrantSize, 16);
    parentProperties.tile_set = `ExtResource("${this.tileset.id}")`;
    parentProperties.tile_map_data = checkDefault(this.tileMapData, new PackedByteArray());
    parentProperties.use_kinematic_bodies = checkDefault(this.useKinematicBodies, false);
    parentProperties.x_draw_order_reversed = checkDefault(this.xDrawOrderReversed, false);
    parentProperties.y_sort_origin = checkDefault(this.ySortOrigin, 0);

    return parentProperties;
  }
}
