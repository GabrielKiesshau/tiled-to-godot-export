import { getResPath, hasColor } from './utils.mjs';

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

/*global tiled, TextFile */
class GodotTilesetExporter {
  // noinspection DuplicatedCode
  /**
   * Constructs a new instance of the tileset exporter
   * @param {Tileset} tileset the tileset to export
   * @param {string} fileName path of the file the tileset should be exported to
   */
  constructor(tileset, fileName) {
    this.asset = {
      id: "",
      atlasID: -1,
      tileset: tileset,
      usedTiles: [],
      hasCollisions: false,
    },
    this.fileName = fileName;
  };

  write() {
    this.writeToFile();
    tiled.log(`Tileset exported successfully to ${this.fileName}`);
  }

  writeToFile() {
    const file = new TextFile(this.fileName, TextFile.WriteOnly);
    let tilesetTemplate = this.buildTileset();
    file.write(tilesetTemplate);
    file.commit();
  }

  buildTileset() {
    const tileset = this.asset.tileset;
    const atlasID = "0";
    const subResource = {
      id: `TileSetAtlasSource_${atlasID}`,
    };
    const texture = {
      id: "1",
      filePath: getResPath(tileset.property("projectRoot"), tileset.property("relativePath"), tileset.image),
    };

    let result = "";

    result += `[gd_resource type="TileSet" load_steps=3 format=3]\n\n`;

    // Texture2D nodes
    result += `[ext_resource type="Texture2D" path="res://${texture.filePath}" id="${texture.id}"]\n\n`;

    // TileSetAtlasSource nodes
    result += `[sub_resource type="TileSetAtlasSource" id="${subResource.id}"]\n`;
    result += `resource_name = "${tileset.name}"\n`;
    result += `texture = ExtResource("${texture.id}")\n`;

    if (tileset.margin != DEFAULT_MARGIN) {
      result += `margins = Vector2i(${tileset.margin}, ${tileset.margin})\n`;
    }

    if (tileset.tileSpacing != DEFAULT_TILE_SPACING) {
      result += `separation = Vector2i(${tileset.tileSpacing}, ${tileset.tileSpacing})\n`;
    }

    if (tileset.tileWidth != DEFAULT_TILE_SIZE || tileset.tileHeight != DEFAULT_TILE_SIZE) {
      result += `texture_region_size = Vector2i(${tileset.tileWidth}, ${tileset.tileHeight})\n`;
    }

    const useTexturePadding = tileset.property("godot:use_texture_padding") || DEFAULT_USE_TEXTURE_PADDING;
    if (useTexturePadding != DEFAULT_USE_TEXTURE_PADDING) {
      result += `use_texture_padding = ${useTexturePadding}\n`;
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

      result += `${tileName} = ${alt}\n`;

      if (alt & tile.FlippedHorizontally) {
        result += `${tileName}/flip_h = true\n`;
      }

      if (alt & tile.FlippedVertically) {
        result += `${tileName}/flip_v = true\n`;
      }

      if (alt & tile.RotatedHexagonal120) {
        result += `${tileName}/transpose = true\n`;
      }

      result += this.buildTileCollision(tile, tileName);
    }

    result += `\n`;

    // Tileset node
    result += `[resource]\n`;

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
      result += `tile_shape = ${tileShape}\n`;
    }

    if (tileLayout != DEFAULT_TILE_LAYOUT) {
      result += `tile_layout = ${tileLayout}\n`;
    }

    if (this.asset.hasCollisions) {
      const collisionLayer = tileset.property("godot:collision_layer") || 1;
      result += `physics_layer_0/collision_layer = ${collisionLayer}\n`;
    }

    const collisionMask = tileset.property("godot:collision_mask") || 1;
    if (collisionMask != 1) {
      result += `physics_layer_0/collision_mask = ${collisionMask}\n`;
    }

    if (tileset.tileWidth != DEFAULT_TILE_SIZE || tileset.tileHeight != DEFAULT_TILE_SIZE) {
      result += `tile_size = Vector2i(${tileset.tileWidth}, ${tileset.tileHeight})\n`;
    }

    result += `sources/0 = SubResource("${subResource.id}")\n`;

    return result;
  }

  buildTileCollision(tile, tileName) {
    let result = "";

    const linearVelocity = tile.property("godot:linear_velocity") || 0;
    if (linearVelocity != 0) {
      result += `${tileName}/physics_layer_0/linear_velocity = Vector2(${linearVelocity.x}, ${linearVelocity.y})\n`;
    }
    
    const angularVelocity = tile.property("godot:angular_velocity") || 0;
    if (angularVelocity != 0) {
      result += `${tileName}/physics_layer_0/angular_velocity = ${angularVelocity}\n`;
    }

    const flippedState = tile.FlippedHorizontally;
    tiled.log(`H: ${tile.FlippedHorizontally}, V: ${tile.FlippedVertically}, AD: ${tile.FlippedAntiDiagonally}`);
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

        result += `${tileName}/physics_layer_0/polygon_${polygonID}/points = PackedVector2Array(${polygonPointList})\n`;
        polygonID++;
      }
    }

    return result;
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
