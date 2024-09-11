import { getAreaCenter, getFileName, getRotation, getTilesetColumns, isTileUnused, roundToDecimals, splitCommaSeparatedString } from './utils.mjs';
import { prefix } from './constants.mjs';
import { Area2D } from './models/area_2d.mjs';
import { CircleShape2D } from './models/circle_shape_2d.mjs';
import { CollisionPolygon2D } from './models/collision_polygon_2d.mjs';
import { CollisionShape2D } from './models/collision_shape_2d.mjs';
import { Resource } from './models/resource.mjs';
import { MapObjectShape } from './enums/map_object_shape.mjs';
import { Node as GDNode } from './models/node.mjs';
import { Node2D } from './models/node_2d.mjs';
import { PackedByteArray } from './models/packed_byte_array.mjs';
import { PackedVector2Array } from './models/packed_vector2_array.mjs';
import { PolygonBuildMode } from './enums/polygon_build_mode.mjs';
import { PackedScene } from './models/scene.mjs';
import { Script } from './models/script.mjs';
import { Sprite2D } from './models/sprite_2d.mjs';
import { RectangleShape2D } from './models/rectangle_shape_2d.mjs';
import { TileMapLayer } from './models/tile_map_layer.mjs';
import { GDTileset } from './models/tileset.mjs';
import { Vector2 } from './models/vector2.mjs';
import { CanvasItem } from './models/canvas_item.mjs';

/**
 * @class GodotTilemapExporter
 */
class GodotTilemapExporter {
  /**
   * Constructs a new instance of the tilemap exporter.
   * 
   * @param {TileMap} [map] - The tilemap to export.
   * @param {string} [fileName] - Path of the file the tilemap should be exported to.
   */
  constructor(map, fileName) {
    /** @type {TileMap} - The tilemap to export. */
    this.map = map;
    /** @type {string} - Path of the file the tilemap should be exported to. */
    this.fileName = fileName;

    const name = this.map.property(`${prefix}name`) || getFileName(this.fileName);
    const rootNode = new GDNode({ name });

    /** @type {PackedScene} */
    this.scene = new PackedScene({ rootNode });
  };

  write() {
    this.determineTilesets();
    this.determineNodes();
    this.saveToFile();

    tiled.log(`Map exported successfully to ${this.fileName}`);
  }

  /**
   * Generate a string with all tilesets in the map.
   * Godot supports several image textures per tileset but Tiled Editor doesn't.
   * Tiled editor supports only one tile sprite image per tileset.
   */
  determineTilesets() {
    for (const tiledTileset of this.map.usedTilesets()) {
      //! let path = getResPath(tileset.property(`${prefix}project_root`), tileset.property(`${prefix}relative_path`), tileset.asset.fileName.replace('.tsx', '.tres'));
      const path = tiledTileset.property(`${prefix}res_path`);

      if (path === undefined) {
        tiled.warn(`${prefix}res_path is not defined for tileset ${tiledTileset.fileName}. The scene will be broken when imported in Godot.`);
      }

      for (const resource of this.scene.externalResourceList) {
        if (resource.path == path) return;
      }

      const tileset = new GDTileset();
      tileset.name = tiledTileset.name;
      tileset.path = path;

      this.scene.addExternalResource(tileset);
    }
  }

  /**
   * Creates the Tilemap nodes. One Tilemap per one layer from Tiled.
   */
  determineNodes() {
    for (const layer of this.map.layers) {
      this.handleLayer(layer, null);
    }
  }

  /**
   * Handle exporting a single layer.
   * 
   * @param {Layer} layer - The target layer.
   * @param {GDNode} owner - The owner node.
   */
  handleLayer(layer, owner) {
    const groups = splitCommaSeparatedString(layer.property(`${prefix}groups`));

    if (layer.isTileLayer) {
      this.handleTileLayer(layer, groups, owner);
      return;
    }
    if (layer.isObjectLayer) {
      this.handleObjectGroup(layer, groups, owner);
      return;
    }
    if (layer.isGroupLayer) {
      this.handleGroupLayer(layer, groups, owner);
    }
  }

  /**
   * Handle exporting a tile layer.
   * 
   * @param {TileLayer} tileLayer - The target layer.
   * @param {string[]} groups - The groups this layer is part of.
   * @param {GDNode} owner - The owner node.
   */
  handleTileLayer(tileLayer, groups, owner) {
    if (tileLayer.resolvedProperty(`${prefix}ignore`)) {
      return;
    }

    // const isIsometric = this.map.orientation === TileMap.Isometric;
    // const mode = isIsometric ? 1 : undefined;

    const layerBounds = tileLayer.region().boundingRect;
    const tilemapDataMap = new Map();

    //* Iterate over each cell in the layer's bounding rectangle
    for (let y = layerBounds.top; y <= layerBounds.bottom; ++y) {
      for (let x = layerBounds.left; x <= layerBounds.right; ++x) {
        const cell = tileLayer.cellAt(x, y);
        if (cell.empty) continue;

        const tile = tileLayer.tileAt(x, y);
        if (isTileUnused(tile)) continue;
        const tilesetName = tile.tileset.name;

        //* Initialize tilemapData if not already done
        let tilemapData = tilemapDataMap.get(tilesetName) || [0, 0];
        tilemapDataMap.set(tilesetName, tilemapData);

        //* Push tile data to the tilemapData array
        this.addTileData(tilemapData, tile, x, y);
      }
    }

    //* Create TileMapLayer nodes for each tileset and add them to the scene
    for (const [tilesetName, tilemapData] of tilemapDataMap) {
      this.createTileMapLayerNode(tileLayer, tilesetName, tilemapData, groups, owner);
    }
  }

  /**
   * Handle exporting an object group.
   * 
   * @param {ObjectGroup} objectGroup - The target layer.
   * @param {string[]} groups - The groups this layer is part of.
   * @param {GDNode} owner - The owner node.
   */
  handleObjectGroup(objectGroup, groups, owner) {
    const node = new Node2D();
    node.zIndex = objectGroup.property(`${prefix}z_index`);
    node.setName(objectGroup.name);
    node.owner = owner;
    node.groups = groups;

    this.scene.registerNode(node);

    for (const mapObject of objectGroup.objects) {
      const mapObjectGroups = splitCommaSeparatedString(mapObject.property(`${prefix}groups`));
      
      if (mapObject.tile) {
        this.generateTileNode(mapObject, mapObjectGroups, node);
        continue;
      }

      this.generateNode(mapObject, mapObjectGroups, node);
    }
  }

  /**
   * Handle exporting a group layer.
   * 
   * @param {GroupLayer} groupLayer - The target layer.
   * @param {string[]} groups - The groups this layer is part of.
   * @param {GDNode} owner - The owner node.
   */
  handleGroupLayer(groupLayer, groups, owner) {
    const zIndex = groupLayer.property(`${prefix}z_index`);
    
    const node = new Node2D();
    node.zIndex = zIndex;
    node.setName(groupLayer.name);
    node.owner = owner;
    node.groups = groups;

    this.scene.registerNode(node);

    for (const layer of groupLayer.layers) {
      this.handleLayer(layer, node);
    }
  }

  /**
   * Generates a Tile node.
   * 
   * @param {MapObject} mapObject - An object that can be part of an ObjectGroup.
   * @param {GDNode} owner - The owner node.
   */
  generateTileNode(mapObject, groups, owner) {
    const tilesetsIndexKey = `${mapObject.tile.tileset.name}_Image`;
    let textureResourceID = 0;

    //TODO
    // if (!this.tilesetIndexMap.get(tilesetsIndexKey)) {
    //   textureResourceID = this.externalResourceID;
    //   this.tilesetIndexMap.set(tilesetsIndexKey, this.externalResourceID);

    //   const tilesetPath = getResPath(
    //     this.map.property(`${prefix}project_root`),
    //     this.map.property(`${prefix}relative_path`),
    //     mapObject.tile.tileset.imageFileName,
    //   );

    //   const texture = new Texture2D();
    //   texture.path = tilesetPath;

    //   if (texture == null) {
    //     return;
    //   }

    //   this.scene.addExternalResource(texture);
    // } else {
    //   textureResourceID = this.tilesetIndexMap.get(tilesetsIndexKey);
    // }

    const tileOffset = this.getTileOffset(mapObject.tile.tileset, mapObject.tile.id);

    //* Converts Tiled pivot (top left corner) to Godot pivot (center);
    const mapObjectPosition = new Vector2({
      x: mapObject.x + (mapObject.tile.width / 2),
      y: mapObject.y - (mapObject.tile.height / 2),
    });

    const node = new Sprite2D({
      texture: `ExtResource("${textureResourceID}")`,
      region_enabled: true,
      region_rect: `Rect2(${tileOffset.x}, ${tileOffset.y}, ${mapObject.tile.width}, ${mapObject.tile.height})`,
    });
    node.position = mapObjectPosition;
    node.zIndex = mapObject.property(`${prefix}z_index`);
    node.setName(mapObject.name);
    node.owner = owner;
    node.groups = groups;

    this.scene.registerNode(node);
  }

  /**
   * Generates a node.
   * 
   * @param {MapObject} mapObject - An object that can be part of an ObjectGroup.
   * @param {Array<string>} groups - The groups this Node belongs to.
   * @param {GDNode} owner - The owner node.
   */
  generateNode(mapObject, groups, owner) {
    switch (mapObject.shape) {
      case MapObjectShape.Rectangle:
        this.generateRectangle(mapObject, groups, owner);
        break;
      case MapObjectShape.Polygon:
        this.generatePolygon(mapObject, groups, PolygonBuildMode.Polygon, owner);
        break;
      case MapObjectShape.Polyline:
        this.generatePolygon(mapObject, groups, PolygonBuildMode.Polyline, owner);
        break;
      case MapObjectShape.Ellipse:
        this.generateEllipse(mapObject, groups, owner);
        break;
      case MapObjectShape.Point:
        this.generatePoint(mapObject, groups, owner);
        break;
    }
  }

  /**
   * Generates a Area2D node with a rectangle shape.
   * 
   * @param {MapObject} mapObject - The object representing the Area2D.
   * @param {Array<string>} groups - The groups this Node belongs to.
   * @param {GDNode} owner - The owner node.
   */
  generateRectangle(mapObject, groups, owner) {
    const position = new Vector2({
      x: mapObject.x,
      y: mapObject.y,
    });
    const size = new Vector2({
      x: mapObject.width,
      y: mapObject.height,
    });
    
    const center = getAreaCenter(position, size, mapObject.rotation);

    const scriptPath = mapObject.property(`${prefix}script`);
    let script = null;

    if (scriptPath) {
      const scriptPropertyMap = this.resolveScriptProperties(mapObject);
      script = this.registerScript(scriptPath, scriptPropertyMap);
    }

    const area2DNode = new Area2D();
    area2DNode.collisionLayer = mapObject.property(`${prefix}collision_layer`);
    area2DNode.collisionMask = mapObject.property(`${prefix}collision_mask`);
    area2DNode.position = center;
    area2DNode.rotation = getRotation(mapObject.rotation);
    area2DNode.zIndex = mapObject.property(`${prefix}z_index`);
    area2DNode.setName(mapObject.name);
    area2DNode.owner = owner;
    area2DNode.groups = groups;
    area2DNode.script = script;

    this.scene.registerNode(area2DNode);

    const shape = new RectangleShape2D({ size });

    this.scene.addSubResource(shape);

    const shapeGroupList = splitCommaSeparatedString(mapObject.property(`${prefix}shape_groups`));

    const collisionShape2DNode = new CollisionShape2D({ shape });
    collisionShape2DNode.zIndex = mapObject.property(`${prefix}z_index`);
    collisionShape2DNode.owner = area2DNode;
    collisionShape2DNode.groups = shapeGroupList;

    this.scene.registerNode(collisionShape2DNode);
  }
  
  /**
   * Generates a Area2D node with a polygon shape.
   * 
   * @param {MapObject} mapObject - The object representing the Area2D.
   * @param {Array<string>} groups - The groups this Node belongs to.
   * @param {PolygonBuildMode} buildMode - Whether the mode of the polygon should be solid or just use lines for collision.
   * @param {GDNode} owner - The owner node.
   */
  generatePolygon(mapObject, groups, buildMode, owner) {
    const position = new Vector2({
      x: mapObject.x,
      y: mapObject.y,
    });
    const size = new Vector2({
      x: mapObject.width,
      y: mapObject.height,
    });

    const center = getAreaCenter(position, size, mapObject.rotation);

    const scriptPath = mapObject.property(`${prefix}script`);
    let script = null;

    if (scriptPath) {
      const scriptPropertyMap = this.resolveScriptProperties(mapObject);
      script = this.registerScript(scriptPath, scriptPropertyMap);
    }

    const area2DNode = new Area2D();
    area2DNode.collisionLayer = mapObject.property(`${prefix}collision_layer`);
    area2DNode.collisionMask = mapObject.property(`${prefix}collision_mask`);
    area2DNode.position = center;
    area2DNode.rotation = getRotation(mapObject.rotation);
    area2DNode.zIndex = mapObject.property(`${prefix}z_index`);
    area2DNode.setName(mapObject.name);
    area2DNode.owner = owner;
    area2DNode.groups = groups;
    area2DNode.script = script;

    this.scene.registerNode(area2DNode);

    const polygonPointsArray = mapObject.polygon.map(point => new Vector2({ x: point.x, y: point.y }));

    const polygon = new PackedVector2Array({
      array: polygonPointsArray,
    });

    const shapeGroupList = splitCommaSeparatedString(mapObject.property(`${prefix}shape_groups`));

    const collisionPolygon2DNode = new CollisionPolygon2D({
      buildMode,
      polygon,
    });
    collisionPolygon2DNode.zIndex = mapObject.property(`${prefix}z_index`);
    collisionPolygon2DNode.owner = area2DNode;
    collisionPolygon2DNode.groups = shapeGroupList;

    this.scene.registerNode(collisionPolygon2DNode);
  }

  /**
   * Generates a Area2D node with a polyline shape.
   * 
   * @param {MapObject} mapObject - The object representing the Area2D.
   * @param {Array<string>} groups - The groups this Node belongs to.
   * @param {GDNode} owner - The owner node.
   */
  generateEllipse(mapObject, groups, owner) {
    const position = new Vector2({
      x: mapObject.x,
      y: mapObject.y,
    });
    const size = new Vector2({
      x: mapObject.width,
      y: mapObject.height,
    });
    const radius = mapObject.width / 2;
    
    const center = getAreaCenter(position, size, mapObject.rotation);

    const scriptPath = mapObject.property(`${prefix}script`);
    let script = null;

    if (scriptPath) {
      const scriptPropertyMap = this.resolveScriptProperties(mapObject);
      script = this.registerScript(scriptPath, scriptPropertyMap);
    }

    const area2DNode = new Area2D();
    area2DNode.collisionLayer = mapObject.property(`${prefix}collision_layer`);
    area2DNode.collisionMask = mapObject.property(`${prefix}collision_mask`);
    area2DNode.position = center;
    area2DNode.rotation = getRotation(mapObject.rotation);
    area2DNode.zIndex = mapObject.property(`${prefix}z_index`);
    area2DNode.setName(mapObject.name);
    area2DNode.owner = owner;
    area2DNode.groups = groups;
    area2DNode.script = script;

    this.scene.registerNode(area2DNode);

    const shape = new CircleShape2D({ radius });

    this.scene.addSubResource(shape);

    const shapeGroupList = splitCommaSeparatedString(mapObject.property(`${prefix}shape_groups`));

    const collisionShape2DNode = new CollisionShape2D({ shape });
    collisionShape2DNode.zIndex = mapObject.property(`${prefix}z_index`);
    collisionShape2DNode.owner = area2DNode;
    collisionShape2DNode.groups = shapeGroupList;

    this.scene.registerNode(collisionShape2DNode);
  }

  /**
   * Generates a Point.
   * 
   * @param {MapObject} mapObject - The object representing the Node2D.
   * @param {Array<string>} groups - The groups this Node belongs to.
   * @param {GDNode} owner - The owner node.
   */
  generatePoint(mapObject, groups, owner) {
    const name = mapObject.name || "Point";
    const position = new Vector2({
      x: roundToDecimals(mapObject.x),
      y: roundToDecimals(mapObject.y),
    });

    const scriptPath = mapObject.property(`${prefix}script`);
    let script = null;

    if (scriptPath) {
      const scriptPropertyMap = this.resolveScriptProperties(mapObject);
      script = this.registerScript(scriptPath, scriptPropertyMap);
    }

    const node = new Node2D({
      position,
      rotation: getRotation(mapObject.rotation),
    });
    node.zIndex = mapObject.property(`${prefix}z_index`);
    node.setName(name);
    node.owner = owner;
    node.groups = groups;
    node.script = script;

    this.scene.registerNode(node);
  }

  /**
   * Add tile data to the tilemapData array.
   * 
   * @param {Array<number>} tilemapData - The array to add data to.
   * @param {Tile} tile - The tile to extract data from.
   * @param {number} x - The x-coordinate of the tile.
   * @param {number} y - The y-coordinate of the tile.
   */
  addTileData(tilemapData, tile, x, y) {
    const sourceID = 0; //TODO add support for extra tilesets using a TileAtlasSource
    const tileAtlasX = tile.imageRect.x / tile.tileset.tileWidth;
    const tileAtlasY = tile.imageRect.y / tile.tileset.tileHeight;
    const alternativeTileID = 0; //TODO add support for alternative tiles
    const tileFlipFlag = 0; //TODO add support for tile flipping flags

    tilemapData.push(
      x, 0, y, 0, sourceID, 0, 
      tileAtlasX, 0, tileAtlasY, 0, 
      alternativeTileID, tileFlipFlag
    );
  }

  /**
   * Create a TileMapLayer node and add it to the scene.
   * 
   * @param {TileLayer} tileLayer - The tile layer.
   * @param {string} tilesetName - The name of the tileset.
   * @param {Array<number>} tilemapData - The tilemap data.
   * @param {string[]} groups - The groups this layer is part of.
   * @param {CanvasItem} owner - The owner node.
   */
  createTileMapLayerNode(tileLayer, tilesetName, tilemapData, groups, owner) {
    const scriptPath = tileLayer.property(`${prefix}script`);
    let script = null;

    if (scriptPath) {
      const scriptPropertyMap = this.resolveScriptProperties(mapObject);
      script = this.registerScript(scriptPath, scriptPropertyMap);
    }

    const zIndex = owner?.zIndex ?? tileLayer.property(`${prefix}z_index`);

    const node = new TileMapLayer({
      tileset: this.getTilesetByName(tilesetName),
      tileMapData: new PackedByteArray({
        array: tilemapData,
      }),
    });
    node.zIndex = zIndex;
    node.setName(`${tileLayer.name}_${tilesetName}`);
    node.owner = owner;
    node.groups = groups;
    node.script = script;

    this.scene.registerNode(node);
  }

  /**
   * Resolve script properties and map them into a usable format.
   * 
   * @param {TiledObject} tiledObject - The object to extract the properties from.
   * @returns {Map} - A map with each property and its values.
   */
  resolveScriptProperties(tiledObject) {
    const objectProperties = tiledObject.resolvedProperties();

    // Filter and map properties that start with "💠" into a usable format
    const properties = Object.entries(objectProperties)
      .filter(([key]) => key.startsWith('💠'))
      .reduce((map, [key, value]) => {
        const cleanKey = key.slice(1); // Remove "💠" prefix
        let formattedValue;

        switch(value.typeName) {
          case 'Vector2':
            formattedValue = `Vector2(${value.value.x}, ${value.value.y})`;
            break;
          case 'Vector2i':
            formattedValue = `Vector2i(${value.value.x}, ${value.value.y})`;
            break;
          case 'Resource':
            if (!value.value.path) {
              const scriptPath = tiledObject.property(`${prefix}script`).value;
              tiled.log(`Ignoring property of ${tiledObject.className}'s ${scriptPath} because it is blank.`);
              break;
            }

            const resource = this.registerResource(value.value.path);
            formattedValue = `ExtResource("${resource.id}")`;
            break;
          case 'Direction':
            formattedValue = value.value;
            break;
          default:
            formattedValue = value;
        }

        map.set(cleanKey, formattedValue);
        return map;
      }, new Map());

    return properties;
  }

  /**
   * Register a script in the external resource list and returns it.
   * If the script is already registered, returns it instead.
   * 
   * @param {string} path - The filepath of the script.
   * @param {Map} properties - The properties of the script.
   * @returns {Script} - The registered script.
   */
  registerScript(path, properties) {
    for (const resource of this.scene.externalResourceList) {
      if (resource instanceof Script && resource.path == path) {
        return resource;
      }
    }

    const script = new Script({ properties });
    script.path = path;

    this.scene.addExternalResource(script);

    return script;
  }

  /**
   * Register a resource in the external resource list and returns it.
   * If the resource is already registered, returns it instead.
   * 
   * @param {string} path - The filepath of the script.
   * @returns {Resource} - The registered resource.
   */
  registerResource(path) {
    for (const resource of this.scene.externalResourceList) {
      if (resource instanceof Resource && resource.path == path) {
        return resource;
      }
    }

    const resource = new Resource({ path });

    this.scene.addExternalResource(resource);

    return resource;
  }

  /**
   * Find a tileset by its name.
   * 
   * @param {string} tilesetName - The name of the tileset to find the id of.
   * @returns {GDTileset|undefined} - The tileset if found, undefined otherwise.
   */
  getTilesetByName(tilesetName) {
    for (const resource of this.scene.externalResourceList) {
      if (resource instanceof GDTileset && resource.name === tilesetName) {
        return resource;
      }
    }

    return undefined;
  }

  /**
   * Calculate the X and Y offset (in pixels) for the specified tile
   * ID within the specified tileset image.
   *
   * @param {Tileset} tileset - The full Tileset object.
   * @param {int} tileId - Id for the tile to extract offset for.
   * @returns {object} - An object with pixel offset in the format {x: int, y: int}.
   */
  getTileOffset(tileset, tileId) {
    const columnCount = getTilesetColumns(tileset);
    const row = Math.floor(tileId / columnCount);
    const col = tileId % columnCount;
    const xOffset = tileset.margin + (tileset.tileSpacing * col);
    const yOffset = tileset.margin + (tileset.tileSpacing * row);

    return {
      x: (col * tileset.tileWidth) + xOffset,
      y: (row * tileset.tileHeight) + yOffset,
    };
  }

  saveToFile() {
    const file = new TextFile(this.fileName, TextFile.WriteOnly);

    const serializedScene = this.scene.serializeToGodot(this.map);

    file.write(serializedScene);
    file.commit();
  }
}

const customTileMapFormat = {
  name: "Godot 4 Tilemap format",
  extension: "tscn",

  /**
   * Map exporter function
   * 
   * @param {TileMap} map the map to export
   * @param {string} fileName path of the file where to export the map
   * @returns {undefined}
   */
  write: function (map, fileName) {
    const exporter = new GodotTilemapExporter(map, fileName);
    exporter.write();
    return undefined;
  }
};

tiled.registerMapFormat("Godot", customTileMapFormat);
