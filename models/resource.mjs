import { GDObject } from './gd_object.mjs';

/**
 * Represents a resource.
 * @class Resource
 * 
 * @property {string} name - 
 * @property {string} path - 
 */
export class Resource extends GDObject {
  constructor({
    name = "Resource",
    path = "",
  } = {}) {
    super();
    this.name = name;
    this.type = "Resource";
    this.path = path;
  }
}
