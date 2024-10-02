import { colorToValues, getAreaCenter, getFileName, getRotation, getTilesetColumns, isTileUnused, roundToDecimals, splitCommaSeparatedString } from './utils.mjs';
import { prefix } from './constants.mjs';
import { Area2D } from './models/area_2d.mjs';
import { CanvasItem } from './models/canvas_item.mjs';
import { CircleShape2D } from './models/circle_shape_2d.mjs';
import { CollisionPolygon2D } from './models/collision_polygon_2d.mjs';
import { CollisionShape2D } from './models/collision_shape_2d.mjs';
import { MapObjectShape } from './enums/map_object_shape.mjs';
import { Node as GDNode } from './models/node.mjs';
import { Node2D } from './models/node_2d.mjs';
import { PackedByteArray } from './models/packed_byte_array.mjs';
import { PackedScene } from './models/packed_scene.mjs';
import { PackedVector2Array } from './models/packed_vector2_array.mjs';
import { PolygonBuildMode } from './enums/polygon_build_mode.mjs';
import { RectangleShape2D } from './models/rectangle_shape_2d.mjs';
import { Resource } from './models/resource.mjs';
import { Room } from './models/room.mjs';
import { Script } from './models/script.mjs';
import { Sprite2D } from './models/sprite_2d.mjs';
import { TileMapLayer } from './models/tile_map_layer.mjs';
import { GDTileset } from './models/tileset.mjs';
import { Vector2 } from './models/vector2.mjs';

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

    /** @type {Room} */
    this.scene = new Room()
      .setName(this.map.property(`${prefix}name`) || getFileName(this.fileName));
    
    var room_instance = new PackedScene()
      .setPath("assets/data/prefabs/room.tscn");
    var room_resource = this.scene.addExternalResource(room_instance);
    this.scene.setInstance(room_resource.id);

    const room_data_path = map.property(`${prefix}data`);

    if (!room_data_path || !room_data_path.value.path) {
      tiled.error("Missing room data! Set the room data property in Map > Map Properties to the file that represents this room.");
    }

    const room_data_resource = this.registerResource(room_data_path.value.path);
    this.scene.data = room_data_resource;

    for (const layer of this.map.layers) {
      if (layer.isObjectLayer) {
        for (const mapObject of layer.objects) {
          if (mapObject.className == "Spawn Point") {
            this.scene.spawnPosition = new Vector2(mapObject.pos.x, mapObject.pos.y);
          }
        }
      }
    }

    this.scene.registerNode(this.scene);

    let hasCameraBoundary = false;

    for (const layer of map.layers) {
      if (layer.isObjectLayer && layer.objects) {
        for (const mapObject of layer.objects) {
          if (mapObject.className == "CameraBoundary") {
            //TODO Found a CameraBoundary object, add them separately
            hasCameraBoundary = true;
            break;
          }
        }
      }
    }

    if (!hasCameraBoundary) {
      const size = new Vector2(
        this.map.size.width * this.map.tileWidth,
        this.map.size.height * this.map.tileHeight,
      );
      const position = new Vector2(size.x / 2, size.y / 2);
      const shape = new RectangleShape2D({ size });
      this.scene.addSubResource(shape);

      const collisionShape = new CollisionShape2D({ shape })
        .setPosition(position)
        .setName("Camera Boundaries")
        .hideType();
      this.scene.registerNode(collisionShape);
    }
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
    const node = new Node2D()
      .setZIndex(objectGroup.property(`${prefix}z_index`))
      .setName(objectGroup.name)
      .setOwner(owner)
      .setGroups(groups);

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

    const node = new Node2D()
      .setZIndex(zIndex)
      .setName(groupLayer.name)
      .setOwner(owner)
      .setGroups(groups);

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
    const mapObjectPosition = new Vector2(
      mapObject.x + (mapObject.tile.width / 2),
      mapObject.y - (mapObject.tile.height / 2),
    );

    const node = new Sprite2D({
      texture: `ExtResource("${textureResourceID}")`,
      region_enabled: true,
      region_rect: `Rect2(${tileOffset.x}, ${tileOffset.y}, ${mapObject.tile.width}, ${mapObject.tile.height})`,
    }).setPosition(mapObjectPosition)
      .setZIndex(mapObject.property(`${prefix}z_index`))
      .setName(mapObject.name)
      .setOwner(owner)
      .setGroups(groups);

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
    const position = new Vector2(
      mapObject.x,
      mapObject.y,
    );
    const size = new Vector2(
      mapObject.width,
      mapObject.height,
    );

    const center = getAreaCenter(position, size, mapObject.rotation);

    const scriptPath = mapObject.property(`${prefix}script`);
    let script = null;

    if (scriptPath) {
      script = this.registerScript(scriptPath);
      script.properties = this.resolveScriptProperties(mapObject);
    }

    const area2DNode = new Area2D()
      .setCollisionLayer(mapObject.property(`${prefix}collision_layer`))
      .setCollisionMask(mapObject.property(`${prefix}collision_mask`))
      .setPosition(center)
      .setRotation(getRotation(mapObject.rotation))
      .setZIndex(mapObject.property(`${prefix}z_index`))
      .setName(mapObject.name)
      .setOwner(owner)
      .setGroups(groups)
      .setScript(script);

    this.scene.registerNode(area2DNode);

    const shape = new RectangleShape2D({ size });

    this.scene.addSubResource(shape);

    const shapeGroupList = splitCommaSeparatedString(mapObject.property(`${prefix}shape_groups`));

    const collisionShape2DNode = new CollisionShape2D({ shape })
      .setZIndex(mapObject.property(`${prefix}z_index`))
      .setOwner(area2DNode)
      .setGroups(shapeGroupList);

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
    const position = new Vector2(
      mapObject.x,
      mapObject.y,
    );
    const size = new Vector2(
      mapObject.width,
      mapObject.height,
    );

    const center = getAreaCenter(position, size, mapObject.rotation);

    const scriptPath = mapObject.property(`${prefix}script`);
    let script = null;

    if (scriptPath) {
      script = this.registerScript(scriptPath, scriptPropertyMap);
      script.properties = this.resolveScriptProperties(mapObject);
    }

    const area2DNode = new Area2D()
      .setCollisionLayer(mapObject.property(`${prefix}collision_layer`))
      .setCollisionMask(mapObject.property(`${prefix}collision_mask`))
      .setPosition(center)
      .setRotation(getRotation(mapObject.rotation))
      .setZIndex(mapObject.property(`${prefix}z_index`))
      .setName(mapObject.name)
      .setOwner(owner)
      .setGroups(groups)
      .setScript(script);

    this.scene.registerNode(area2DNode);

    const polygonPointsArray = mapObject.polygon.map(point => new Vector2(point.x, point.y));

    const polygon = new PackedVector2Array({
      array: polygonPointsArray,
    });

    const shapeGroupList = splitCommaSeparatedString(mapObject.property(`${prefix}shape_groups`));

    const collisionPolygon2DNode = new CollisionPolygon2D({
      buildMode,
      polygon,
    }).setZIndex(mapObject.property(`${prefix}z_index`))
      .setOwner(area2DNode)
      .setGroups(shapeGroupList);

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
    const position = new Vector2(
      mapObject.x,
      mapObject.y,
    );
    const size = new Vector2(
      mapObject.width,
      mapObject.height,
    );
    const radius = mapObject.width / 2;
    
    const center = getAreaCenter(position, size, mapObject.rotation);

    const scriptPath = mapObject.property(`${prefix}script`);
    let script = null;

    if (scriptPath) {
      script = this.registerScript(scriptPath);
      script.properties = this.resolveScriptProperties(mapObject);
    }

    const area2DNode = new Area2D()
      .setCollisionLayer(mapObject.property(`${prefix}collision_layer`))
      .setCollisionMask(mapObject.property(`${prefix}collision_mask`))
      .setPosition(center)
      .setRotation(getRotation(mapObject.rotation))
      .setZIndex(mapObject.property(`${prefix}z_index`))
      .setName(mapObject.name)
      .setOwner(owner)
      .setGroups(groups)
      .setScript(script);

    this.scene.registerNode(area2DNode);

    const shape = new CircleShape2D({ radius });

    this.scene.addSubResource(shape);

    const shapeGroupList = splitCommaSeparatedString(mapObject.property(`${prefix}shape_groups`));

    const collisionShape2DNode = new CollisionShape2D({ shape })
      .setZIndex(mapObject.property(`${prefix}z_index`))
      .setOwner(area2DNode)
      .setGroups(shapeGroupList);

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
    const position = new Vector2(
      roundToDecimals(mapObject.x),
      roundToDecimals(mapObject.y),
    );

    const scriptPath = mapObject.property(`${prefix}script`);
    let script = null;

    if (scriptPath) {
      script = this.registerScript(scriptPath);
      script.properties = this.resolveScriptProperties(mapObject);
    }

    const node = new Node2D({
      position,
      rotation: getRotation(mapObject.rotation),
    }).setZIndex(mapObject.property(`${prefix}z_index`))
      .setName(name)
      .setOwner(owner)
      .setGroups(groups)
      .setScript(script);

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
      script = this.registerScript(scriptPath);
      script.properties = this.resolveScriptProperties(mapObject);
    }

    const tint_color_string = JSON.stringify(tileLayer.tintColor);
    const modulate = colorToValues(tint_color_string);
    const zIndex = owner?.zIndex ?? tileLayer.property(`${prefix}z_index`);

    const node = new TileMapLayer({
      collisionEnabled: tileLayer.resolvedProperty(`${prefix}collision_enabled`) || false,
      tileset: this.getTilesetByName(tilesetName),
      tileMapData: new PackedByteArray({
        array: tilemapData,
      }),
    }).setModulate(modulate)
      .setZIndex(zIndex)
      .setName(`${tileLayer.name}_${tilesetName}`)
      .setOwner(owner)
      .setGroups(groups)
      .setScript(script);

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
  registerScript(path, properties = new Map()) {
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

    const serializedScene = this.scene.serializeToGodot();

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
