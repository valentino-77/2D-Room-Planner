import { Point } from '../interfaces/point.interface';

export class Wall {
  id: string;
  start: Point;
  end: Point;
  thickness: number;
  color: string;
  
  constructor(start: Point, end: Point, thickness: number = 8, color: string = '#4A5568', id?: string) {
    this.id = id || 'wall_' + Date.now() + Math.random();
    this.start = start;
    this.end = end;
    this.thickness = thickness;
    this.color = color;
  }
  
  get length(): number {
    return Math.sqrt(
      Math.pow(this.end.x - this.start.x, 2) + 
      Math.pow(this.end.y - this.start.y, 2)
    );
  }
  
  get angle(): number {
    return Math.atan2(this.end.y - this.start.y, this.end.x - this.start.x);
  }
}
