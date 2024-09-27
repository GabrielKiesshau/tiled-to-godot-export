import { getResPath, isTileUnused } from './utils.mjs';
import { prefix, physicsLayerTypeName, customDataLayerTypeName } from './constants.mjs';
import { AnimatedTileFrame } from './models/animated_tile_frame.mjs';
import { CustomDataLayer } from './models/custom_data_layer.mjs';
import { PhysicsData } from './models/physics_data.mjs';
import { PhysicsLayer } from './models/physics_layer.mjs';
import { Polygon } from './models/polygon.mjs';
import { Texture2D } from './models/texture_2d.mjs';
import { TileData } from './models/tile_data.mjs';
import { TileLayout } from './enums/tile_layout.mjs';
import { GDTileset } from './models/tileset.mjs';
import { TileSetAtlasSource } from './models/tileset_atlas_source.mjs';
import { TileShape } from './enums/tile_shape.mjs';
import { Vector2, Vector2i } from './models/vector2.mjs';

/**
 * @class GodotTilesetExporter
 */
class GodotTilesetExporter {
  /**
   * Constructs a new instance of the tileset exporter
   * @param {Tileset} [tileset] - The tileset to export.
   * @param {string} [fileName] - Path of the file the tileset should be exported to.
   */
  constructor(tileset, fileName) {
    /** @type {Tileset} - The tileset to export. */
    this.tileset = tileset;
    /** @type {string} - Path of the file the tileset should be exported to. */
    this.fileName = fileName;
  };

  write() {
    this.prepareTileset();
    this.saveToFile();

    tiled.log(`Tileset exported successfully to ${this.fileName}`);
  }

  prepareTileset() {
    const tileset = this.tileset;
    const texture = new Texture2D();
    const textureResourcePath = getResPath(tileset.property(`${prefix}project_root`), tileset.property(`${prefix}relative_path`), tileset.imageFileName);
    texture.path = textureResourcePath;

    const tilesetSource = new TileSetAtlasSource({
      margins: new Vector2i(tileset.margin, tileset.margin),
      separation: new Vector2i(
        tileset.tileSpacing,
        tileset.tileSpacing,
      ),
      texture,
      textureRegionSize: new Vector2i(
        tileset.tileWidth,
        tileset.tileHeight,
      ),
      useTexturePadding: tileset.property(`${prefix}use_texture_padding`),
    });

    const tilesetProperties = Object.entries(tileset.resolvedProperties());
    const physicsLayerList = tilesetProperties
      .filter(([_, { typeName, value }]) => typeName == physicsLayerTypeName && value)
      .map(([_, { value }]) => new PhysicsLayer({
        collisionLayer: value.collision_layer,
        collisionMask: value.collision_mask,
        id: value.id,
      }));
    const customDataLayerList = tilesetProperties
      .filter(([_, { typeName, value }]) => typeName == customDataLayerTypeName && value)
      .map(([_, { value }]) => new CustomDataLayer({
        name: value.name,
        type: value.type.value,
        id: value.id,
      }));

    /** @type {number[]} - The list of tile IDs that are animated. */
    const animated_tile_id_list = [];

    for (const tile of this.tileset.tiles) {
      if (isTileUnused(tile)) continue;

      if (animated_tile_id_list.find((tile_id) => tile_id == tile.id)) {
        continue;
      }

      const is_tile_animated = tile.animated;
      let animation_separation = new Vector2i(0, 0);
      let animation_columns = 1;
      /** @type {AnimatedTileFrame[]} */
      let animation_sequence = [];
      let is_animated = false;

      if (is_tile_animated) {
        const tile_frames = tile.frames;

        const starting_frame_id = tile_frames[0].tileId;

        if (starting_frame_id != tile.id) {
          tiled.log(`Tile ${tile.id} has an animation, but the tile must be the first frame. Skipping.`);
          continue;
        }

        //* Determine if frames are valid
        let is_valid = true;
        const frame_count = tile_frames.length;
        const tileset_width = tileset.imageWidth / tileset.tileWidth;

        //* Ensure there are at least two frames to compare
        if (frame_count > 1) {
          let separation = new Vector2i(tile_frames[1].tileId - starting_frame_id - 1, 0);
          let is_vertical_separation_set = false;
          let first_tile_id_of_current_row = starting_frame_id;

          //* Loop through the frames and check for consistent movement and crescent order
          for (let i = 0; i < frame_count; i++) {
            const current_tile_id = tile_frames[i].tileId;

            let next_tile_id;
            if (i < frame_count - 1) {
              next_tile_id = tile_frames[i + 1].tileId;

              //* Check if the next tile ID is lower than the current one (crescent check)
              if (next_tile_id <= current_tile_id) {
                is_valid = false;

                let result = "";
                tile.frames.forEach((frame, _) => {
                  result += `${frame.tileId}, `;
                });
                result = result.slice(0, -2);

                tiled.log(`Verifying animation with tile id sequence: ${result}`);
                tiled.log(`Invalid animation sequence: tile IDs must be crescent. Tile ${next_tile_id} is lower or equal to ${current_tile_id}`);
                break;
              }
            }

            const frame = new AnimatedTileFrame({ duration: 0.1 });
            animation_sequence.push(frame);

            if (i == frame_count - 1) {
              continue;
            }

            //* Calculate the horizontal and vertical separations
            const current_tile_row = Math.floor(current_tile_id / tileset_width);
            const next_tile_row = Math.floor(next_tile_id / tileset_width);

            if (current_tile_row === next_tile_row) {
              //* The next tile is in the same row as the current tile
              const next_horizontal_separation = next_tile_id - current_tile_id - 1;

              if (next_horizontal_separation !== separation.x) {
                is_valid = false;
                tiled.log(`Invalid animation sequence: inconsistent horizontal separation at tile ${next_tile_id}`);
                break;
              }
              animation_columns++;
              continue;
            }

            //* The next tile is in the next row
            if (!is_vertical_separation_set) {
              const vertical_separation = next_tile_id - starting_frame_id - tileset_width;

              separation.y = vertical_separation;
              is_vertical_separation_set = true;
            }

            const next_vertical_separation = next_tile_id - first_tile_id_of_current_row - tileset_width;
            if (next_vertical_separation !== separation.y || next_vertical_separation % tileset_width != 0) {
              is_valid = false;
              tiled.log(`Invalid animation sequence: inconsistent vertical separation at tile ${next_tile_id}`);
              break;
            }

            first_tile_id_of_current_row = next_tile_id;
          }
          animation_separation = separation;
        }

        if (!is_valid) {
          continue;
        }

        for (const frame of tile_frames) {
          animated_tile_id_list.push(frame.tileId);
        }

        is_animated = true;
      }

      const physicsDataList = this.setupTilePhysicsDataList(tile, physicsLayerList);
      const customDataList = this.setupTileCustomDataList(tile, customDataLayerList);

      const gdTile = new TileData({
        position: new Vector2i(
          tile.id % this.tileset.columnCount,
          Math.floor(tile.id / this.tileset.columnCount),
        ),
        physicsDataList,
        customDataList,
        is_animated,
        animation_columns,
        animation_separation,
        animation_speed: 1.0,
        animation_sequence,
      });

      tilesetSource.addTile(gdTile);
    }

    const tileLayout = tileset.orientation === Tileset.Isometric ? TileLayout.DiamondDown : TileLayout.Stacked;
    const tileShape = tileset.orientation === Tileset.Isometric ? TileShape.Isometric : TileShape.Square;

    this.gdTileset = new GDTileset({
      tileLayout,
      tileOffsetAxis: tileset.property(`${prefix}tile_offset_axis`),
      tileShape,
      tileSize: new Vector2i(
        tileset.tileSize.width,
        tileset.tileSize.height,
      ),
      tilesetSource,
      physicsLayerList,
      customDataLayerList,
    });
  }

  /**
   * 
   * @param {Tile} tile - 
   * @param {PhysicsLayer[]} physicsLayerList - 
   */
  setupTilePhysicsDataList(tile, physicsLayerList) {
    const tileProperties = Object.entries(tile.resolvedProperties());

    if (tileProperties.length === 0) {
      return [];
    }

    const physicsDataList = tileProperties
      .filter(([_, { typeName, value: physicsData }]) => {
        const isPhysicsData = typeName === "PhysicsData";

        if (!isPhysicsData) {
          return false;
        }

        if (!physicsData) {
          return false;
        }

        const isPhysicsIDRegistered = physicsLayerList.some(
          (layer) => {
            return layer.id === physicsData.id;
          }
        );

        if (!isPhysicsIDRegistered) {
          tiled.log(`Tile ${tile.id} has a layer with ID ${physicsData.id}. Add a collision layer with this ID in order to export it.`);
        }

        return isPhysicsIDRegistered;
      })
      .map(([_, { value: physicsData }]) => this.createPhysicsDataForTile(tile, physicsData, physicsLayerList));

    return physicsDataList;
  }

  /**
   * 
   * @param {Tile} tile - 
   * @param {PhysicsData} physicsData - 
   * @param {PhysicsLayer[]} physicsLayerList - 
   */
  createPhysicsDataForTile(tile, physicsData = {}, physicsLayerList) {
    const objectGroup = tile.objectGroup;
    /** @type {Polygon[]} */
    let polygonList = [];
    /** @type {number} */
    const layerID = physicsData.id?.value || 0;

    if (objectGroup) {
      const center = new Vector2(
        tile.width / 2,
        tile.height / 2,
      );

      for (const tiledObject of objectGroup.objects) {
        const shape = tiledObject.shape;

        if (shape != MapObject.Rectangle && shape != MapObject.Polygon) {
          tiled.warn("Godot exporter only supports collisions that are rectangles or polygons.");
          continue;
        }

        /** @type {number} */
        const polygonLayerID = tiledObject.resolvedProperty("physics_layer_id")?.value || 0;

        if (polygonLayerID != layerID) continue;

        /** @type {number[]} */
        let pointList = [];

        switch (shape) {
          case MapObject.Rectangle:
            const rect = {
              topLeft: {
                x: tiledObject.x - center.x,
                y: tiledObject.y - center.y,
              },
              botomRight: {
                x: tiledObject.x + tiledObject.width - center.x,
                y: tiledObject.y + tiledObject.height - center.y,
              },
            };

            pointList.push(rect.topLeft.x, rect.topLeft.y, rect.botomRight.x, rect.topLeft.y, rect.botomRight.x, rect.botomRight.y, rect.topLeft.x, rect.botomRight.y);
            break;
          case MapObject.Polygon:
            for (const polygonPoint of tiledObject.polygon) {
              const point = {
                x: tiledObject.x + polygonPoint.x - center.x,
                y: tiledObject.y + polygonPoint.y - center.y,
              }

              pointList.push(point.x, point.y);
            }
            break;
          default:
            break;
        }

        /** @type {bool} */
        const oneWay = tiledObject.resolvedProperty("one_way");

        const polygon = new Polygon({
          pointList,
          oneWay,
        });
        polygonList.push(polygon);
      }
    }

    const angularVelocity = physicsData.angular_velocity || 0;

    const linearVelocity = new Vector2(
      physicsData.linear_velocity?.value?.x || 0,
      physicsData.linear_velocity?.value?.y || 0,
    );


    const id = physicsLayerList.findIndex((physicsLayer) => {
      return physicsLayer.id.value == layerID;
    }) || 0;

    return new PhysicsData({
      angularVelocity,
      linearVelocity,
      polygonList,
      id,
    });
  }

  /**
   * 
   * @param {Tile} tile - 
   * @param {CustomDataLayer[]} customDataLayerList - 
   */
  setupTileCustomDataList(tile, customDataLayerList) {
    //! const propertyMap = propertiesToMap(properties);
    //! if (propertyMap.size != 0) {
    //!   for (const [key, value] of propertyMap) {
    //!     if (!customDataLayerList.has(key)) {
    //!       customDataLayerList.set(key, {})
    //!     }
    //!     tilesetString += `${tileName}/custom_data_${key} = ${value}\n`;
    //!   }
    //! }
    return [];
  }

  saveToFile() {
    const file = new TextFile(this.fileName, TextFile.WriteOnly);

    const serializedTileSet = this.gdTileset.serializeToGodot();

    file.write(serializedTileSet);
    file.commit();
  }
}

const customTilesetFormat = {
  name: "Godot Tileset format",
  extension: "tres",

  /**
   * Tileset exporter function
   * @param {Tileset} tileset the tileset to export
   * @param {string} fileName path of the file where to export the tileset
   * @returns {undefined}
   */
  write: function (tileset, fileName) {
    const exporter = new GodotTilesetExporter(tileset, fileName);
    exporter.write();

    return undefined;
  }
};

tiled.registerTilesetFormat("Godot", customTilesetFormat);
