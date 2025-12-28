import { Component, OnInit, inject, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { FurnitureService } from '../../services/furniture.service';
import { RoomService } from '../../services/room.service';
import { FurnitureType } from '../../models/furniture.model';

@Component({
  selector: 'app-furniture-palette',
  standalone: true,
  templateUrl: './furniture-palette.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FurniturePaletteComponent implements OnInit {
  private furnitureService = inject(FurnitureService);
  private roomService = inject(RoomService);
  
  allFurnitureTemplates: any[] = [];
  isExpanded = signal(false);

  visibleFurnitureTemplates = computed(() => {
    if (this.isExpanded()) {
      return this.allFurnitureTemplates;
    }
    return this.allFurnitureTemplates.slice(0, 8);
  });
  
  ngOnInit(): void {
    this.allFurnitureTemplates = this.furnitureService.getFurnitureTemplates();
  }

  toggleExpanded(): void {
    this.isExpanded.update(value => !value);
  }
  
  addFurniture(templateType: FurnitureType): void {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const position = {
        x: rect.width / 2,
        y: rect.height / 2
      };
      
      const newFurniture = this.furnitureService.createFurnitureFromTemplate(templateType, position);
      this.roomService.addFurniture(newFurniture);
      this.roomService.selectElement(newFurniture);
    }
  }
}
