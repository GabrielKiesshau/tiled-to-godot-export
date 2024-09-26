import { checkDefault } from '../utils.mjs';
import { Resource } from './resource.mjs';
import { Texture2D } from './texture_2d.mjs';
import { TileData } from './tile_data.mjs';
import { Vector2, Vector2i } from './vector2.mjs';

/**
* Represents a TileSetAtlasSource.
* @class TileSetAtlasSource
*/
export class TileSetAtlasSource extends Resource {
  /**
   * @param {Object} [props]
   * @param {Vector2i} [props.margins]
   * @param {TileOffsetAxis} [props.separation]
   * @param {Texture2D} [props.texture]
   * @param {Vector2i} [props.textureRegionSize]
   * @param {boolean} [props.useTexturePadding]
   */
  constructor({
    margins = new Vector2i(0, 0),
    separation = new Vector2i(0, 0),
    texture = null,
    textureRegionSize = new Vector2i(16, 16),
    useTexturePadding = true,
  } = {}) {
    super();
    /** @type {TileLayout} */
    this.margins = margins;
    /** @type {TileOffsetAxis} */
    this.separation = separation;
    /** @type {Texture2D} */
    this.texture = texture;
    /** @type {Vector2i} */
    this.textureRegionSize = textureRegionSize;
    /** @type {boolean} */
    this.useTexturePadding = useTexturePadding;
    /** @type {TileData[]} */
    this.tileDataList = [];

    this.setType("TileSetAtlasSource");
  }

  /**
   * @param {TileData} tileData 
   */
  addTile(tileData) {
    this.tileDataList.push(tileData);
  }

  getProperties() {
    var properties = super.getProperties();

    properties.margins = checkDefault(this.margins, new Vector2i(0, 0));
    properties.separation = checkDefault(this.separation, new Vector2i(0, 0));
    properties.texture = `ExtResource("${this.texture.id}")`;
    properties.texture_region_size = checkDefault(this.textureRegionSize, new Vector2i(16, 16));
    properties.use_texture_padding = checkDefault(this.useTexturePadding, true);

    this.tileDataList.forEach((tileData, i) => {
      const tileKey = tileData.getKey();

      if (tileData.is_animated) {
        properties[`${tileKey}/animation_columns`] = tileData.animation_columns;
        properties[`${tileKey}/animation_separation`] = tileData.animation_separation.toString();
        properties[`${tileKey}/animation_speed`] = tileData.animation_speed;

        tileData.animation_sequence.forEach((frame, frame_index) => {
          properties[`${tileKey}/animation_frame_${frame_index}/duration`] = frame.duration;
        });
      }
      properties[`${tileKey}/0`] = 0;

      tileData.physicsDataList.forEach((physicsData, i) => {
        const physicsDataKey = `${tileKey}/0/physics_layer_${physicsData.id}`;

        properties[`${physicsDataKey}/angular_velocity`] = checkDefault(physicsData.angularVelocity, 0);
        properties[`${physicsDataKey}/linear_velocity`] = checkDefault(physicsData.linearVelocity, new Vector2(0, 0));

        physicsData.polygonList.forEach((polygon, j) => {
          const polygonKey = `${physicsDataKey}/polygon_${j}`;
          properties[`${polygonKey}/points`] = `PackedVector2Array(${polygon.getPointList()})`;
          properties[`${polygonKey}/one_way`] = checkDefault(polygon.oneWay, false);
        });
      });
    });

    return properties;
  }
}
