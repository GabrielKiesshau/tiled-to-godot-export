import { checkDefault, stringifyKeyValue } from '../utils.mjs';
import { CustomDataLayer } from './custom_data_layer.mjs';
import { PhysicsLayer } from './physics_layer.mjs';
import { Resource } from './resource.mjs';
import { TileLayout } from '../enums/tile_layout.mjs';
import { TileOffsetAxis } from '../enums/tile_offset_axis.mjs';
import { TileSetAtlasSource } from './tileset_atlas_source.mjs';
import { TileShape } from '../enums/tile_shape.mjs';
import { Vector2i } from './vector2.mjs';

/**
* Represents a collection of tiles used in a TileMapLayer.
* @class Tileset
*/
export class GDTileset extends Resource {
  /**
   * @param {Object} [props]
   * @param {TileLayout} [props.tileLayout]
   * @param {TileOffsetAxis} [props.tileOffsetAxis]
   * @param {TileShape} [props.tileShape]
   * @param {Vector2i} [props.tileSize]
   * @param {boolean} [props.uvClipping]
   * @param {TileSetAtlasSource} [props.tilesetSource]
   * @param {PhysicsLayer[]} [props.physicsLayerList]
   * @param {CustomDataLayer[]} [props.customDataLayerList]
   */
  constructor({
    tileLayout = TileLayout.Stacked,
    tileOffsetAxis = TileOffsetAxis.Horizontal,
    tileShape = TileShape.Square,
    tileSize = new Vector2i({ x: 16, y: 16 }),
    uvClipping = false,
    tilesetSource = null,
    physicsLayerList = [],
    customDataLayerList = [],
  } = {}) {
    super();
    /** @type {TileLayout} */
    this.tileLayout = tileLayout;
    /** @type {TileOffsetAxis} */
    this.tileOffsetAxis = tileOffsetAxis;
    /** @type {TileShape} */
    this.tileShape = tileShape;
    /** @type {Vector2i} */
    this.tileSize = tileSize;
    /** @type {boolean} */
    this.uvClipping = uvClipping;
    /** @type {TileSetAtlasSource} */
    this.tilesetSource = tilesetSource;
    /** @type {PhysicsLayer[]} */
    this.physicsLayerList = physicsLayerList;
    /** @type {CustomDataLayer[]} */
    this.customDataLayerList = customDataLayerList;

    this.setName("TileSet");
    this.setType("TileSet");
  }

  getProperties() {
    var properties = {};

    properties.tile_layout = checkDefault(this.tileLayout, TileLayout.Stacked);
    properties.tile_offset_axis = checkDefault(this.tileOffsetAxis, TileOffsetAxis.Horizontal);
    properties.tile_shape = checkDefault(this.tileShape, TileShape.Square);
    properties.tile_size = checkDefault(this.tileSize, new Vector2i({ x: 16, y: 16 }));
    properties.uv_clipping = checkDefault(this.uvClipping, false);

    this.physicsLayerList.forEach((physicsLayer, i) => {
      properties[`physics_layer_${i}/collision_layer`] = physicsLayer.collisionLayer;
      properties[`physics_layer_${i}/collision_mask`] = checkDefault(physicsLayer.collisionMask, 1);
    });

    this.customDataLayerList.forEach((customDataLayer, i) => {
      properties[`custom_data_layer_${i}/name`] = customDataLayer.name;
      properties[`custom_data_layer_${i}/type`] = customDataLayer.type;
    });

    properties['sources/0'] = `SubResource("${this.tilesetSource.id}")`;

    return properties;
  }

  /**
   * Serializes the object as a Godot file.
   *
   * @returns {string} - Serialized tileset in Godot string format.
   */
  serializeToGodot() {
    const loadSteps = 3;

    let tilesetString = `[gd_resource type="${this.type}" load_steps=${loadSteps} format=3]`;
    tilesetString += `\n`;
    tilesetString += `\n${this.tilesetSource.texture.serializeAsExternalResource()}`;
    tilesetString += `\n${this.tilesetSource.serializeAsSubResource()}`;
    tilesetString += `\n`;
    tilesetString += `\n[resource]`;

    for (let [key, value] of Object.entries(this.getProperties())) {
      if (value === undefined || value === null) continue;

      const keyValue = stringifyKeyValue(key, value, false, false, true);
      tilesetString += `\n${keyValue}`;
    }

    return tilesetString;
  }
}
