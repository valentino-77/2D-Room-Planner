import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RoomService } from '../../services/room.service';

@Component({
  selector: 'app-save-load-panel',
  standalone: true,
  templateUrl: './save-load-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
})
export class SaveLoadPanelComponent {
  roomService = inject(RoomService);
  rooms = this.roomService.roomsSignal;
  currentRoom = this.roomService.currentRoom;

  loadRoom(roomId: string): void {
    if (this.currentRoom().id === roomId) return;
    if (confirm('Load this room? Unsaved changes to the current room will be lost.')) {
      this.roomService.loadRoom(roomId);
    }
  }

  deleteRoom(event: MouseEvent, roomId: string): void {
    event.stopPropagation(); // Prevent loadRoom from firing
    this.roomService.deleteRoom(roomId);
  }
}
