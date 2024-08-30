import { prefix } from './constants.mjs';
import { getResPath, hasColor, propertiesToMap } from './utils.mjs';
import { Resource } from './models/resource.mjs';
import { Texture2D } from './models/texture_2d.mjs';

const DEFAULT_MARGIN = 0;
const DEFAULT_TILE_SPACING = 0;
const DEFAULT_TILE_SIZE = 16;
const DEFAULT_TILE_SHAPE = 0;
const DEFAULT_TILE_LAYOUT = 0;
const DEFAULT_USE_TEXTURE_PADDING = true;
const Orientation = {
  ORTHOGONAL: 0,
  ISOMETRIC: 1,
};
const TileShape = {
  TILE_SHAPE_SQUARE: 0,
  TILE_SHAPE_ISOMETRIC: 1,
  TILE_SHAPE_HEXAGON: 2,
};
const TileLayout = {
  TILE_LAYOUT_STACKED: 0,
  TILE_LAYOUT_DIAMOND_DOWN: 1,
};
const MapObject = {
  Rectangle: 0,
  Polygon: 1,
  Polyline: 2,
  Ellipse: 3,
};
const Flip = {
  FlippedAntiDiagonally: 1 << 12,
  FlippedHorizontally: 1 << 13,
  FlippedVertically: 1 << 14,
};

/**
 * @class GodotTilesetExporter
 * @property {Tileset} tileset - The tileset to export.
 * @property {string} fileName - Path of the file the tileset should be exported to.
 */
class GodotTilesetExporter {
  /**
   * Constructs a new instance of the tileset exporter
   * @param {Object} [props]
   * @param {Tileset} [props.tileset] - The tileset to export.
   * @param {string} [props.fileName] - Path of the file the tileset should be exported to.
   */
  constructor(tileset, fileName) {
    this.asset = {
      id: "",
      atlasID: 0,
      tileset: tileset,
      usedTiles: [],
      hasCollisions: false,
    };
    this.fileName = fileName;
    this.customDataLayerList = new Map();
  };

  write() {
    this.saveToFile();
    tiled.log(`Tileset exported successfully to ${this.fileName}`);
  }

  saveToFile() {
    const file = new TextFile(this.fileName, TextFile.WriteOnly);

    const serializedTileSet = this.serializeToGodot();

    file.write(serializedTileSet);
    file.commit();
  }

  serializeToGodot() {
    const tileset = this.asset.tileset;
    const texture = new Texture2D({
      resource: {
        path: getResPath(tileset.property("projectRoot"), tileset.property("relativePath"), tileset.image),
      },
    });

    const type = "TileSet";
    const loadSteps = 3;

    let tilesetString = `[gd_resource type="${type}" load_steps=${loadSteps} format=3]`;
    tilesetString += `\n`;
    tilesetString += `\n${texture.serializeAsExternalResource()}`;

    // TileSetAtlasSource nodes
    tilesetString += `\n[sub_resource type="TileSetAtlasSource" id="TileSetAtlasSource_${this.asset.atlasID}"]\n`;
    if (tileset.name) {
      tilesetString += `resource_name = "${tileset.name}"\n`;
    }
    tilesetString += `texture = ExtResource("${texture.id}")\n`;

    if (tileset.margin != DEFAULT_MARGIN) {
      tilesetString += `margins = Vector2i(${tileset.margin}, ${tileset.margin})\n`;
    }

    if (tileset.tileSpacing != DEFAULT_TILE_SPACING) {
      tilesetString += `separation = Vector2i(${tileset.tileSpacing}, ${tileset.tileSpacing})\n`;
    }

    if (tileset.tileWidth != DEFAULT_TILE_SIZE || tileset.tileHeight != DEFAULT_TILE_SIZE) {
      tilesetString += `texture_region_size = Vector2i(${tileset.tileWidth}, ${tileset.tileHeight})\n`;
    }

    const useTexturePadding = tileset.property(`${prefix}use_texture_padding`) || DEFAULT_USE_TEXTURE_PADDING;
    if (useTexturePadding != DEFAULT_USE_TEXTURE_PADDING) {
      tilesetString += `use_texture_padding = ${useTexturePadding}\n`;
    }

    // Tile data
    for (const tile of tileset.tiles) {
      let blank = true;
      const properties = tile.resolvedProperties();

      if (tile.className !== "" || Object.keys(properties).length > 0) {
        blank = false;
      }
      else {
        const rect = tile.imageRect;

        pixelLoop:
        for (let y = rect.y; y < rect.y + rect.height; y++) {
          for (let x = rect.x; x < rect.x + rect.width; x++) {
            const pixelARGB = tile.image.pixelColor(x, y);
            const isPixelColored = hasColor(String(pixelARGB));

            if (isPixelColored) {
              blank = false;
              break pixelLoop;
            }
          }
        }
      }

      if (blank)
        continue;
      // Ignore animated tiles frames that are not the first
      
      const columnCount = tileset.columnCount;

      const x = tile.id % columnCount;
      const y = Math.floor(tile.id / columnCount);
      const alt = 0;

      const tileName = `${x}:${y}/${alt}`;

      tilesetString += `${tileName} = ${alt}\n`;

      if (alt & tile.FlippedHorizontally) {
        tilesetString += `${tileName}/flip_h = true\n`;
      }

      if (alt & tile.FlippedVertically) {
        tilesetString += `${tileName}/flip_v = true\n`;
      }

      if (alt & tile.RotatedHexagonal120) {
        tilesetString += `${tileName}/transpose = true\n`;
      }

      tilesetString += this.buildTileCollision(tile, tileName);
      
      const propertyMap = propertiesToMap(properties);
      if (propertyMap.size != 0) {
        for (const [key, value] of propertyMap) {
          if (!this.customDataLayerList.has(key)) {
            this.customDataLayerList.set(key, {})
          }
          tilesetString += `${tileName}/custom_data_${key} = ${value}\n`;
        }
      }
    }

    tilesetString += `\n`;

    // Tileset node
    tilesetString += `[resource]\n`;

    let tileShape = TileShape.TILE_SHAPE_SQUARE;
    let tileLayout = TileLayout.TILE_LAYOUT_STACKED;

    switch (tileset.orientation) {
      default:
      case Orientation.ORTHOGONAL:
        tileShape = TileShape.TILE_SHAPE_SQUARE;
        tileLayout = TileLayout.TILE_LAYOUT_STACKED;
        break;
      case Orientation.ISOMETRIC:
        tileShape = TileShape.TILE_SHAPE_ISOMETRIC;
        tileLayout = TileLayout.TILE_LAYOUT_DIAMOND_DOWN;
        break;
    }
    
    if (tileShape != DEFAULT_TILE_SHAPE) {
      tilesetString += `tile_shape = ${tileShape}\n`;
    }

    if (tileLayout != DEFAULT_TILE_LAYOUT) {
      tilesetString += `tile_layout = ${tileLayout}\n`;
    }

    if (this.asset.hasCollisions) {
      const collisionLayer = tileset.property(`${prefix}collision_layer`) || 1;
      tilesetString += `physics_layer_0/collision_layer = ${collisionLayer}\n`;
    }

    const collisionMask = tileset.property(`${prefix}collision_mask`) || 1;
    if (collisionMask != 1) {
      tilesetString += `physics_layer_0/collision_mask = ${collisionMask}\n`;
    }

    if (tileset.tileWidth != DEFAULT_TILE_SIZE || tileset.tileHeight != DEFAULT_TILE_SIZE) {
      tilesetString += `tile_size = Vector2i(${tileset.tileWidth}, ${tileset.tileHeight})\n`;
    }

    for (const [name, layer] of this.customDataLayerList) {
      tilesetString += `custom_data_layer_${layer.index}/name = "${name}"\n`;
      tilesetString += `custom_data_layer_${layer.index}/type = "${layer.type}"\n`;
    }

    tilesetString += `sources/${this.asset.atlasID} = SubResource("TileSetAtlasSource_${this.asset.atlasID}")\n`;

    return tilesetString;
  }

  buildTileCollision(tile, tileName) {
    let tileCollisionString = "";

    const linearVelocity = tile.property(`${prefix}linear_velocity`) || 0;
    if (linearVelocity != 0) {
      tileCollisionString += `${tileName}/physics_layer_0/linear_velocity = Vector2(${linearVelocity.x}, ${linearVelocity.y})\n`;
    }
    
    const angularVelocity = tile.property(`${prefix}angular_velocity`) || 0;
    if (angularVelocity != 0) {
      tileCollisionString += `${tileName}/physics_layer_0/angular_velocity = ${angularVelocity}\n`;
    }

    // const flippedState = tile.FlippedHorizontally;
    // tiled.log(`H: ${tile.FlippedHorizontally}, V: ${tile.FlippedVertically}, AD: ${tile.FlippedAntiDiagonally}`);
    const objectGroup = tile.objectGroup;

    if (objectGroup) {
      let polygonID = 0;

      const center = {
        x: tile.width / 2,
        y: tile.height / 2,
      };

      for (const tiledObject of objectGroup.objects) {
        const shape = tiledObject.shape;

        if (shape != MapObject.Rectangle && shape != MapObject.Polygon) {
          tiled.warn("Godot exporter only supports collisions that are rectangles or polygons.");
          continue;
        }

        this.asset.hasCollisions = true;
        let polygonPointList = "";

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
            
            // flipState(rect.topLeft, flippedState);
            // flipState(rect.botomRight, flippedState);

            polygonPointList = `${rect.topLeft.x}, ${rect.topLeft.y}, ${rect.botomRight.x}, ${rect.topLeft.y}, ${rect.botomRight.x}, ${rect.botomRight.y}, ${rect.topLeft.x}, ${rect.botomRight.y}`;
            break;
          case MapObject.Polygon:
            let first = true;

            for (const polygonPoint of tiledObject.polygon) {
              if (!first) {
                polygonPointList += ", ";
              }
              const point = {
                x: tiledObject.x + polygonPoint.x - center.x,
                y: tiledObject.y + polygonPoint.y - center.y,
              }
              
              // flipState(point, flippedState);
              polygonPointList += `${point.x}, ${point.y}`;

              first = false;
            }
            break;
          default:
            break;
        }

        tileCollisionString += `${tileName}/physics_layer_0/polygon_${polygonID}/points = PackedVector2Array(${polygonPointList})\n`;
        polygonID++;
      }
    }

    return tileCollisionString;
  }

  flipState(point, flippedState) {
    if (flippedState & Transposed) {
      [point.x, point.y] = [point.y, point.x];
    }
    if (flippedState & FlippedH) {
      point.x *= -1;
    }
    if (flippedState & FlippedV) {
      point.y *= -1;
    }
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
