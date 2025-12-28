import { Component, ChangeDetectionStrategy, signal, inject, viewChild } from '@angular/core';
import { RoomService } from './services/room.service';
import { CanvasEditorComponent } from './components/canvas-editor/canvas-editor.component';
import { FurniturePaletteComponent } from './components/furniture-palette/furniture-palette.component';
import { RoomPropertiesComponent } from './components/room-properties/room-properties.component';
import { WallToolbarComponent } from './components/wall-toolbar/wall-toolbar.component';
import { SaveLoadPanelComponent } from './components/save-load-panel/save-load-panel.component';
import { LandingPageComponent } from './components/landing-page/landing-page.component';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CanvasEditorComponent,
    FurniturePaletteComponent,
    RoomPropertiesComponent,
    WallToolbarComponent,
    SaveLoadPanelComponent,
    LandingPageComponent
  ],
})
export class AppComponent {
  // viewChild is now optional because it sits inside an @if block
  private canvasEditor = viewChild(CanvasEditorComponent);
  private roomService = inject(RoomService);
  
  showLandingPage = signal(true);
  mode = signal<'select' | 'drawWall' | 'pan'>('select');
  gridVisible = signal(true);
  snapToGrid = signal(true);

  enterPlanner(): void {
    this.showLandingPage.set(false);
  }

  setMode(newMode: 'select' | 'drawWall' | 'pan'): void {
    this.mode.set(newMode);
  }

  toggleGrid(): void {
    this.gridVisible.update(visible => !visible);
  }

  toggleSnapToGrid(): void {
    this.snapToGrid.update(snap => !snap);
  }

  deleteSelected(): void {
    const selected = this.roomService.selectedElement();
    if (selected) {
      if ('start' in selected) { // It's a wall
        this.roomService.removeWall(selected.id);
      } else if ('dimension' in selected) { // It's furniture
        this.roomService.removeFurniture(selected.id);
      }
      this.roomService.clearSelection();
    }
  }

  saveRoom(): void {
    this.roomService.saveCurrentRoom();
    console.log('Room saved successfully');
  }
  
  createNewRoom(): void {
    if (confirm('Create a new room? Unsaved changes will be lost.')) {
      const newRoomName = prompt("Enter a name for the new room:", `Room ${this.roomService.getRoomCount() + 1}`);
      if (newRoomName) {
        this.roomService.createNewRoom(newRoomName);
      }
    }
  }

  exportPNG(): void {
    this.canvasEditor()?.exportToPNG();
  }
  
  zoomIn(): void {
    this.canvasEditor()?.zoomIn();
  }
  
  zoomOut(): void {
    this.canvasEditor()?.zoomOut();
  }

  resetView(): void {
    this.canvasEditor()?.resetView();
  }
}