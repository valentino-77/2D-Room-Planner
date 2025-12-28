import { Wall } from './wall.model';
import { Furniture } from './furniture.model';

export interface Room {
  id: string;
  name: string;
  walls: Wall[];
  furniture: Furniture[];
  gridSize: number;
  scale: number; // pixels per unit (e.g., 20px = 1m)
  backgroundColor: string;
  createdAt: Date;
  updatedAt: Date;
}
