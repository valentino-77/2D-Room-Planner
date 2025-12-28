import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { RoomService } from '../../services/room.service';
import { FormsModule } from '@angular/forms';
import { Wall } from '../../models/wall.model';
import { Furniture } from '../../models/furniture.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-room-properties',
  standalone: true,
  templateUrl: './room-properties.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, CommonModule]
})
export class RoomPropertiesComponent {
  roomService = inject(RoomService);
  selectedElement = this.roomService.selectedElement;

  isFurniture = computed(() => {
    const el = this.selectedElement();
    return el && 'dimension' in el;
  });

  isWall = computed(() => {
    const el = this.selectedElement();
    return el && 'start' in el;
  });

  get selectedAsFurniture(): Furniture {
    return this.selectedElement() as Furniture;
  }

  get selectedAsWall(): Wall {
    return this.selectedElement() as Wall;
  }
  
  // Computed property to check if start/end points are connected to other walls
  wallAttachmentState = computed(() => {
    const el = this.selectedElement();
    if (!el || !('start' in el)) return { start: false, end: false };
    
    const wall = el as Wall;
    const room = this.roomService.currentRoom();
    
    // Helper to check if an ID exists in any OTHER wall's endpoints
    const isConnected = (pointId: string | undefined) => {
        if (!pointId) return false;
        // Count how many times this ID appears in the room's walls
        let count = 0;
        for (const w of room.walls) {
            if (w.start.id === pointId) count++;
            if (w.end.id === pointId) count++;
        }
        // If it appears more than once, it's shared (attached)
        return count > 1;
    };

    return {
        start: isConnected(wall.start.id),
        end: isConnected(wall.end.id)
    };
  });

  updateRotation(event: Event) {
    const target = event.target as HTMLInputElement;
    const rotation = Number(target.value);
    const furniture = this.selectedAsFurniture;
    if (furniture) {
      const updatedFurniture = { ...furniture, rotation };
      this.roomService.updateFurniture(updatedFurniture);
      this.roomService.saveCurrentRoom();
    }
  }

  updateColor(event: Event) {
    const target = event.target as HTMLInputElement;
    const color = target.value;
    const furniture = this.selectedAsFurniture;
    if (furniture) {
      const updatedFurniture = { ...furniture, color };
      this.roomService.updateFurniture(updatedFurniture);
      this.roomService.saveCurrentRoom();
    }
  }

  updateDimension(prop: 'width' | 'height', event: Event) {
    const target = event.target as HTMLInputElement;
    const value = Number(target.value);
    const furniture = this.selectedAsFurniture;
    if (furniture) {
      const updatedFurniture = { ...furniture, dimension: {...furniture.dimension, [prop]: value }};
      this.roomService.updateFurniture(updatedFurniture);
      this.roomService.saveCurrentRoom();
    }
  }

  detachEndpoint(handle: 'start' | 'end'): void {
    if (this.isWall()) {
        this.roomService.detachWallEndpoint(this.selectedAsWall.id, handle);
    }
  }

  attachEndpoint(handle: 'start' | 'end'): void {
    if (this.isWall()) {
        this.roomService.attachWallEndpoint(this.selectedAsWall.id, handle);
    }
  }
}