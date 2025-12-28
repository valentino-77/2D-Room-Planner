import { Point } from '../interfaces/point.interface';
import { Dimension } from '../interfaces/dimension.interface';

export enum FurnitureType {
  BED = 'bed',
  DESK = 'desk',
  CHAIR = 'chair',
  SOFA = 'sofa',
  TABLE = 'table',
  WARDROBE = 'wardrobe',
  BOOKSHELF = 'bookshelf',
  // Bedroom
  DOUBLE_BED = 'double_bed',
  NIGHTSTAND = 'nightstand',
  DRESSER = 'dresser',
  RUG = 'rug',
  // Living Room
  TV_STAND = 'tv_stand',
  COFFEE_TABLE = 'coffee_table',
  ARMCHAIR = 'armchair',
  FLOOR_LAMP = 'floor_lamp',
  END_TABLE = 'end_table',
}

export interface Furniture {
  id: string;
  type: FurnitureType;
  position: Point;
  dimension: Dimension;
  rotation: number; // in degrees
  color: string;
  iconName?: string;
  name: string;
}
