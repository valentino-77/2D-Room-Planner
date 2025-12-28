import { Injectable } from '@angular/core';
import { Furniture, FurnitureType } from '../models/furniture.model';
import { Point } from '../interfaces/point.interface';

@Injectable({
  providedIn: 'root'
})
export class FurnitureService {
  
  private furnitureTemplates = [
    {
      type: FurnitureType.CHAIR,
      name: 'Chair',
      defaultDimension: { width: 50, height: 50, unit: 'cm' as const },
      color: '#fb923c', 
      iconName: 'chair'
    },
    {
      type: FurnitureType.TABLE,
      name: 'Dining Table',
      defaultDimension: { width: 150, height: 90, unit: 'cm' as const },
      color: '#94a3b8', 
      iconName: 'table'
    },
    {
      type: FurnitureType.BOOKSHELF,
      name: 'Bookshelf',
      defaultDimension: { width: 80, height: 30, unit: 'cm' as const },
      color: '#f87171', 
      iconName: 'bookshelf'
    },
     {
      type: FurnitureType.RUG,
      name: 'Rug',
      defaultDimension: { width: 160, height: 230, unit: 'cm' as const },
      color: '#38bdf8',
      iconName: 'rug'
    },
    {
      type: FurnitureType.BED,
      name: 'Single Bed',
      defaultDimension: { width: 90, height: 200, unit: 'cm' as const },
      color: '#86efac', 
      iconName: 'bed'
    },
    {
      type: FurnitureType.DOUBLE_BED,
      name: 'Double Bed',
      defaultDimension: { width: 150, height: 200, unit: 'cm' as const },
      color: '#4ade80',
      iconName: 'bed'
    },
    {
      type: FurnitureType.WARDROBE,
      name: 'Wardrobe',
      defaultDimension: { width: 100, height: 60, unit: 'cm' as const },
      color: '#c084fc', 
      iconName: 'wardrobe'
    },
    {
      type: FurnitureType.DRESSER,
      name: 'Dresser',
      defaultDimension: { width: 140, height: 50, unit: 'cm' as const },
      color: '#a78bfa',
      iconName: 'dresser'
    },
     {
      type: FurnitureType.NIGHTSTAND,
      name: 'Nightstand',
      defaultDimension: { width: 45, height: 40, unit: 'cm' as const },
      color: '#e879f9', 
      iconName: 'nightstand'
    },
    
    {
      type: FurnitureType.SOFA,
      name: 'Sofa',
      defaultDimension: { width: 180, height: 80, unit: 'cm' as const },
      color: '#818cf8',
      iconName: 'sofa'
    },
    {
      type: FurnitureType.ARMCHAIR,
      name: 'Armchair',
      defaultDimension: { width: 80, height: 80, unit: 'cm' as const },
      color: '#60a5fa', 
      iconName: 'armchair'
    },
    {
      type: FurnitureType.COFFEE_TABLE,
      name: 'Coffee Table',
      defaultDimension: { width: 100, height: 60, unit: 'cm' as const },
      color: '#ca8a04',
      iconName: 'table'
    },
    {
      type: FurnitureType.END_TABLE,
      name: 'End Table',
      defaultDimension: { width: 40, height: 40, unit: 'cm' as const },
      color: '#d97706', 
      iconName: 'table'
    },
    {
      type: FurnitureType.TV_STAND,
      name: 'TV Stand',
      defaultDimension: { width: 160, height: 40, unit: 'cm' as const },
      color: '#475569', 
      iconName: 'tv'
    },
    {
      type: FurnitureType.FLOOR_LAMP,
      name: 'Floor Lamp',
      defaultDimension: { width: 30, height: 30, unit: 'cm' as const },
      color: '#fbbf24',
      iconName: 'lamp'
    },
     
    {
      type: FurnitureType.DESK,
      name: 'Desk',
      defaultDimension: { width: 120, height: 60, unit: 'cm' as const },
      color: '#a8a29e', 
      iconName: 'desk'
    },
  ];
  
  getFurnitureTemplates() {
    return this.furnitureTemplates;
  }
  
  createFurnitureFromTemplate(templateType: FurnitureType, position: Point): Furniture {
    const template = this.furnitureTemplates.find(t => t.type === templateType);
    if (!template) {
      throw new Error(`Template not found for type: ${templateType}`);
    }
    
    return {
      id: 'furniture_' + Date.now() + Math.random(),
      type: template.type,
      position: position,
      dimension: { ...template.defaultDimension },
      rotation: 0,
      color: template.color,
      iconName: template.iconName,
      name: template.name,
    };
  }
}