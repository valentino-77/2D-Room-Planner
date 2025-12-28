import { Component, ChangeDetectionStrategy, inject, computed, signal, OnInit, effect } from '@angular/core';
import { RoomService } from '../../services/room.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-wall-toolbar',
  standalone: true,
  templateUrl: './wall-toolbar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule]
})
export class WallToolbarComponent implements OnInit {
    roomService = inject(RoomService);
    currentRoom = this.roomService.currentRoom;

    roomWidth = signal(0);
    roomDepth = signal(0);

    constructor() {
      effect(() => {
        this.updateDimensionsFromRoom();
      });
    }

    ngOnInit(): void {
      this.updateDimensionsFromRoom();
    }

    private updateDimensionsFromRoom(): void {
      const room = this.currentRoom();
      if (!room || !room.walls || room.walls.length < 4) {
        if (room && room.walls.length > 0) {
           const allX = room.walls.flatMap(w => [w.start.x, w.end.x]);
           const allY = room.walls.flatMap(w => [w.start.y, w.end.y]);
           const minX = Math.min(...allX);
           const maxX = Math.max(...allX);
           const minY = Math.min(...allY);
           const maxY = Math.max(...allY);
           this.roomWidth.set(Number(((maxX - minX) / room.scale).toFixed(2)));
           this.roomDepth.set(Number(((maxY - minY) / room.scale).toFixed(2)));
        } else {
            this.roomWidth.set(0);
            this.roomDepth.set(0);
        }
        return;
      }

      const allX = room.walls.flatMap(w => [w.start.x, w.end.x]);
      const allY = room.walls.flatMap(w => [w.start.y, w.end.y]);

      const minX = Math.min(...allX);
      const maxX = Math.max(...allX);
      const minY = Math.min(...allY);
      const maxY = Math.max(...allY);
      
      this.roomWidth.set(Number(((maxX - minX) / room.scale).toFixed(2)));
      this.roomDepth.set(Number(((maxY - minY) / room.scale).toFixed(2)));
    }

    totalWallLength = computed(() => {
        const walls = this.currentRoom().walls;
        const scale = this.currentRoom().scale;
        if (!walls || walls.length === 0) return '0.00';
        const totalPixels = walls.reduce((sum, wall) => sum + wall.length, 0);
        return (totalPixels / scale).toFixed(2);
    });

    totalFurniture = computed(() => {
        return this.currentRoom().furniture.length;
    });

    applyDimensions(): void {
        const width = this.roomWidth();
        const depth = this.roomDepth();
        if (width > 0 && depth > 0) {
            this.roomService.updateRoomDimensions(width, depth);
        } else {
            alert('Please enter valid dimensions greater than 0.');
        }
    }
}
