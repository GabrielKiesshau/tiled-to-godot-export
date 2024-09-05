export class Polygon {
  constructor({
    pointList = [],
  } = {}) {
    this.pointList = pointList;
  }

  getPointList() {
    return this.pointList.join(', ');
  }
}
