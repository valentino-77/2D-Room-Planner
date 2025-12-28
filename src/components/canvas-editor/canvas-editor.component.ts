import { Component, OnInit, ElementRef, ViewChild, HostListener, effect, inject, input, ChangeDetectionStrategy, OnDestroy, AfterViewInit } from '@angular/core';
import { RoomService } from '../../services/room.service';
import { Room } from '../../models/room.model';
import { Wall } from '../../models/wall.model';
import { Furniture, FurnitureType } from '../../models/furniture.model';
import { Point } from '../../interfaces/point.interface';

@Component({
  selector: 'app-canvas-editor',
  standalone: true,
  templateUrl: './canvas-editor.component.html',
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CanvasEditorComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;
  private resizeObserver: ResizeObserver | null = null;
  
  roomService = inject(RoomService);

  mode = input.required<'select' | 'drawWall' | 'pan'>();
  gridVisible = input.required<boolean>();
  snapToGrid = input.required<boolean>();

  private isDrawingWall = false;
  private wallStartPoint: Point | null = null;
  private animationFrameId: number | null = null;
  
  private dragStartPoint: Point | null = null;
  private isDraggingFurniture = false;
  private isRotatingFurniture = false;
  private draggedFurniture: Furniture | null = null;
  private isDraggingWallHandle = false;
  private draggedWall: Wall | null = null;
  private draggedHandle: 'start' | 'end' | null = null;
  private isDraggingWallBody = false;
  private initialWallState: { start: Point, end: Point } | null = null;

  // Zoom and Pan State
  private zoomLevel = 1;
  private panOffset: Point = { x: 0, y: 0 };
  private isPanning = false;
  private lastMousePos: Point = { x: 0, y: 0 }; // Screen coords

  private readonly HANDLE_RADIUS = 8;
  private readonly ROTATION_HANDLE_OFFSET = 20;

  constructor() {
    effect(() => {
      this.roomService.currentRoom();
      this.roomService.selectedElement();
      this.gridVisible();
      this.scheduleDraw();
    });
  }

  ngOnInit(): void {
    this.ctx = this.canvasRef.nativeElement.getContext('2d')!;
    this.setupEventListeners();
    this.centerView();
    this.scheduleDraw();
  }

  ngAfterViewInit(): void {
    this.resizeObserver = new ResizeObserver(() => {
      this.scheduleDraw();
    });
    this.resizeObserver.observe(this.canvasRef.nativeElement);
  }
  
  ngOnDestroy(): void {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    if (this.resizeObserver) this.resizeObserver.disconnect();
    
    const canvas = this.canvasRef.nativeElement;
    canvas.removeEventListener('mousedown', this.onMouseDown);
    canvas.removeEventListener('mousemove', this.onMouseMove);
    canvas.removeEventListener('mouseup', this.onMouseUp);
    canvas.removeEventListener('contextmenu', this.onContextMenu);
    canvas.removeEventListener('wheel', this.onWheel);
  }

  private setupEventListeners(): void {
    const canvas = this.canvasRef.nativeElement;
    canvas.addEventListener('mousedown', this.onMouseDown);
    canvas.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('mouseup', this.onMouseUp);
    canvas.addEventListener('contextmenu', this.onContextMenu);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
  }

  private centerView(): void {
    if (this.canvasRef) {
        this.panOffset = { x: 0, y: 0 };
        this.zoomLevel = 1;
    }
  }

  public resetView(): void {
    this.centerView();
    this.scheduleDraw();
  }

  private onContextMenu = (event: MouseEvent) => {
    event.preventDefault();
  };

  private onWheel = (event: WheelEvent) => {
    event.preventDefault();
    const zoomIntensity = 0.1;
    const direction = event.deltaY < 0 ? 1 : -1;
    const factor = Math.exp(direction * zoomIntensity);
    
    const screenPos = this.getScreenCoordinates(event);
    const worldPosBefore = this.screenToWorld(screenPos);

    this.zoomLevel *= factor;
    this.zoomLevel = Math.max(0.1, Math.min(this.zoomLevel, 5));

    const worldPosAfter = this.screenToWorld(screenPos);
    
    this.panOffset.x += (worldPosAfter.x - worldPosBefore.x) * this.zoomLevel;
    this.panOffset.y += (worldPosAfter.y - worldPosBefore.y) * this.zoomLevel;

    this.scheduleDraw();
  };

  public zoomIn(): void {
    this.applyZoomCenter(1.2);
  }

  public zoomOut(): void {
    this.applyZoomCenter(0.8);
  }

  private applyZoomCenter(factor: number): void {
      const canvas = this.canvasRef.nativeElement;
      const centerScreen = { x: canvas.width / 2, y: canvas.height / 2 };
      const worldPosBefore = this.screenToWorld(centerScreen);
      
      this.zoomLevel *= factor;
      this.zoomLevel = Math.max(0.1, Math.min(this.zoomLevel, 5));
      
      const worldPosAfter = this.screenToWorld(centerScreen);
      this.panOffset.x += (worldPosAfter.x - worldPosBefore.x) * this.zoomLevel;
      this.panOffset.y += (worldPosAfter.y - worldPosBefore.y) * this.zoomLevel;
      
      this.scheduleDraw();
  }

  private onMouseDown = (event: MouseEvent) => {
    const screenPos = this.getScreenCoordinates(event);
    const worldPos = this.screenToWorld(screenPos);

    if (event.button === 1 || this.mode() === 'pan') {
        this.isPanning = true;
        this.lastMousePos = screenPos;
        this.canvasRef.nativeElement.style.cursor = 'grabbing';
        return;
    }

    if (event.button === 2) {
        this.roomService.clearSelection();
        return;
    }

    if (this.mode() === 'drawWall') {
      this.isDrawingWall = true;
      this.wallStartPoint = worldPos;
      return;
    }

    const rotationHandle = this.getFurnitureRotationHandleAtPosition(worldPos);
    if (rotationHandle) {
        this.isRotatingFurniture = true;
        this.draggedFurniture = rotationHandle;
        this.roomService.selectElement(rotationHandle);
        this.canvasRef.nativeElement.style.cursor = 'grabbing';
        return;
    }

    const handle = this.getHandleAtPosition(worldPos);
    if (handle) {
      this.isDraggingWallHandle = true;
      this.draggedWall = handle.wall;
      this.draggedHandle = handle.handle;
      this.roomService.selectElement(handle.wall);
      this.canvasRef.nativeElement.style.cursor = 'grabbing';
      return;
    }

    const { furniture, wall } = this.getElementAtPosition(worldPos);
    if (furniture) {
      this.isDraggingFurniture = true;
      this.draggedFurniture = furniture;
      this.dragStartPoint = worldPos;
      this.roomService.selectElement(furniture);
      this.canvasRef.nativeElement.style.cursor = 'grabbing';
      return;
    }
    if (wall) {
      this.isDraggingWallBody = true;
      this.draggedWall = wall;
      this.dragStartPoint = worldPos;
      this.initialWallState = { start: { ...wall.start }, end: { ...wall.end } };
      this.roomService.selectElement(wall);
      this.canvasRef.nativeElement.style.cursor = 'grabbing';
      return;
    }

    this.roomService.clearSelection();
  }
  
  private onMouseMove = (event: MouseEvent) => {
    const screenPos = this.getScreenCoordinates(event);
    const worldPos = this.screenToWorld(screenPos);
    
    if (this.isPanning) {
        const deltaX = screenPos.x - this.lastMousePos.x;
        const deltaY = screenPos.y - this.lastMousePos.y;
        this.panOffset.x += deltaX;
        this.panOffset.y += deltaY;
        this.lastMousePos = screenPos;
        this.scheduleDraw();
        return;
    }

    if (this.isRotatingFurniture && this.draggedFurniture) {
        const center = this.draggedFurniture.position;
        const deltaX = worldPos.x - center.x;
        const deltaY = worldPos.y - center.y;
        const angleRad = Math.atan2(deltaY, deltaX);
        const angleDeg = (angleRad * 180 / Math.PI) + 90;
        
        let newRotation = (angleDeg + 360) % 360;
        
        if (this.snapToGrid()) {
            newRotation = Math.round(newRotation / 15) * 15;
        }

        this.roomService.updateFurniture({ ...this.draggedFurniture, rotation: newRotation });
        return;
    }

    if (this.isDraggingWallHandle && this.draggedWall && this.draggedHandle) {
        const snappedPos = this.snapToGrid() ? this.snapToGridPoint(worldPos.x, worldPos.y) : worldPos;
        const vertexToMove = this.draggedHandle === 'start' ? this.draggedWall.start : this.draggedWall.end;
        if (!vertexToMove.id) return;
        
        const wallsToUpdate: {id: string, newStart: Point, newEnd: Point}[] = [];
        const walls = this.roomService.currentRoom().walls;

        walls.forEach(wall => {
            let newStart = wall.start;
            let newEnd = wall.end;
            let needsUpdate = false;
            if (wall.start.id === vertexToMove.id) {
                newStart = { ...snappedPos, id: wall.start.id };
                needsUpdate = true;
            }
            if (wall.end.id === vertexToMove.id) {
                newEnd = { ...snappedPos, id: wall.end.id };
                needsUpdate = true;
            }
            if (needsUpdate) {
                wallsToUpdate.push({ id: wall.id, newStart, newEnd });
            }
        });

        if (wallsToUpdate.length > 0) {
          this.roomService.updateWalls(wallsToUpdate);
        }
        return;
    }

    if (this.isDraggingWallBody && this.draggedWall && this.dragStartPoint && this.initialWallState) {
        const delta = { x: worldPos.x - this.dragStartPoint.x, y: worldPos.y - this.dragStartPoint.y };

        let finalDelta = delta;
        if (this.snapToGrid()) {
            const newStartPos = { x: this.initialWallState.start.x + delta.x, y: this.initialWallState.start.y + delta.y };
            const snappedStartPos = this.snapToGridPoint(newStartPos.x, newStartPos.y);
            finalDelta = { x: snappedStartPos.x - this.initialWallState.start.x, y: snappedStartPos.y - this.initialWallState.start.y };
        }

        const startPointIdToMove = this.initialWallState.start.id;
        const endPointIdToMove = this.initialWallState.end.id;
        const newStartPos = { ...this.initialWallState.start, x: this.initialWallState.start.x + finalDelta.x, y: this.initialWallState.start.y + finalDelta.y };
        const newEndPos = { ...this.initialWallState.end, x: this.initialWallState.end.x + finalDelta.x, y: this.initialWallState.end.y + finalDelta.y };
        
        const wallsToUpdate: {id: string, newStart: Point, newEnd: Point}[] = [];
        const walls = this.roomService.currentRoom().walls;

        walls.forEach(wall => {
            let wallNewStart = wall.start;
            let wallNewEnd = wall.end;
            let needsUpdate = false;

            if (wall.start.id === startPointIdToMove) { wallNewStart = newStartPos; needsUpdate = true; }
            if (wall.end.id === startPointIdToMove) { wallNewEnd = newStartPos; needsUpdate = true; }
            if (wall.start.id === endPointIdToMove) { wallNewStart = newEndPos; needsUpdate = true; }
            if (wall.end.id === endPointIdToMove) { wallNewEnd = newEndPos; needsUpdate = true; }
            
            if(needsUpdate) {
                 wallsToUpdate.push({id: wall.id, newStart: wallNewStart, newEnd: wallNewEnd});
            }
        });
        if (wallsToUpdate.length > 0) {
            this.roomService.updateWalls(wallsToUpdate);
        }
        return;
    }

    if (this.isDraggingFurniture && this.draggedFurniture) {
      const snappedPos = this.snapToGrid() ? this.snapToGridPoint(worldPos.x, worldPos.y) : worldPos;
      this.roomService.updateFurniture({ ...this.draggedFurniture, position: snappedPos });
      return;
    }

    if (this.isDrawingWall && this.wallStartPoint) {
      this.scheduleDraw(worldPos);
      return;
    }
    
    if (this.mode() === 'pan') {
        this.canvasRef.nativeElement.style.cursor = 'grab';
        return;
    }

    const rotationHandle = this.getFurnitureRotationHandleAtPosition(worldPos);
    if (rotationHandle) {
        this.canvasRef.nativeElement.style.cursor = 'grab';
    } else {
        const handle = this.getHandleAtPosition(worldPos);
        if (handle) {
        this.canvasRef.nativeElement.style.cursor = 'grab';
        } else {
        const { furniture, wall } = this.getElementAtPosition(worldPos);
        if (furniture) this.canvasRef.nativeElement.style.cursor = 'grab';
        else if (wall) this.canvasRef.nativeElement.style.cursor = 'move';
        else this.canvasRef.nativeElement.style.cursor = 'crosshair';
        }
    }
  }
  
  private onMouseUp = (event: MouseEvent) => {
    if (this.isDrawingWall && this.wallStartPoint) {
      const screenPos = this.getScreenCoordinates(event);
      const worldPos = this.screenToWorld(screenPos);
      const snappedStart = this.snapToGrid() ? this.snapToGridPoint(this.wallStartPoint.x, this.wallStartPoint.y) : this.wallStartPoint;
      const snappedEnd = this.snapToGrid() ? this.snapToGridPoint(worldPos.x, worldPos.y) : worldPos;

      const finalStart = this.findNearbyVertex(snappedStart) || snappedStart;
      const finalEnd = this.findNearbyVertex(snappedEnd) || snappedEnd;
      
      if (this.distance(finalStart, finalEnd) > 1) {
          this.roomService.addWall(finalStart, finalEnd);
      }
    }

    if (this.isDraggingFurniture || this.isDraggingWallHandle || this.isDraggingWallBody || this.isRotatingFurniture) {
      this.roomService.saveCurrentRoom();
    }

    this.isDrawingWall = false; this.wallStartPoint = null;
    this.isDraggingFurniture = false; this.draggedFurniture = null;
    this.isRotatingFurniture = false;
    this.isDraggingWallHandle = false; this.draggedWall = null; this.draggedHandle = null;
    this.isDraggingWallBody = false; this.initialWallState = null; this.dragStartPoint = null;
    this.isPanning = false;
    
    if (this.mode() === 'pan') {
         this.canvasRef.nativeElement.style.cursor = 'grab';
    } else {
         this.canvasRef.nativeElement.style.cursor = 'crosshair';
    }
    this.scheduleDraw();
  }

  private getScreenCoordinates(event: MouseEvent): Point {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }
  
  private screenToWorld(p: Point): Point {
      return {
          x: (p.x - this.panOffset.x) / this.zoomLevel,
          y: (p.y - this.panOffset.y) / this.zoomLevel
      };
  }
  
  private worldToScreen(p: Point): Point {
      return {
          x: p.x * this.zoomLevel + this.panOffset.x,
          y: p.y * this.zoomLevel + this.panOffset.y
      };
  }

  private getElementAtPosition(pos: Point): { furniture: Furniture | null, wall: Wall | null } {
    const room = this.roomService.currentRoom();
    for (const furniture of [...room.furniture].reverse()) {
      if (this.isPointInFurniture(pos, furniture, room.scale)) return { furniture, wall: null };
    }
    for (const wall of room.walls) {
      if (this.isPointNearWall(pos, wall)) return { furniture: null, wall };
    }
    return { furniture: null, wall: null };
  }

  private isPointInFurniture(pos: Point, furniture: Furniture, scale: number): boolean {
    const w = furniture.dimension.width / 100 * scale;
    const h = furniture.dimension.height / 100 * scale;
    const { x, y } = furniture.position;
    const angleRad = -furniture.rotation * Math.PI / 180;
    const rotatedX = (pos.x - x) * Math.cos(angleRad) - (pos.y - y) * Math.sin(angleRad);
    const rotatedY = (pos.x - x) * Math.sin(angleRad) + (pos.y - y) * Math.cos(angleRad);
    return Math.abs(rotatedX) < w / 2 && Math.abs(rotatedY) < h / 2;
  }

  private isPointNearWall(pos: Point, wall: Wall, threshold: number = 10): boolean {
    const effectiveThreshold = threshold / this.zoomLevel;

    const { x, y } = pos; const { start, end } = wall;
    const lenSq = (end.x - start.x) ** 2 + (end.y - start.y) ** 2;
    if (lenSq === 0) return this.distance(pos, start) < effectiveThreshold;
    let t = ((x - start.x) * (end.x - start.x) + (y - start.y) * (end.y - start.y)) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const projX = start.x + t * (end.x - start.x);
    const projY = start.y + t * (end.y - start.y);
    return this.distance(pos, { x: projX, y: projY }) < effectiveThreshold;
  }
  
  private findNearbyVertex(pos: Point, threshold: number = 15): Point | null {
    const effectiveThreshold = threshold / this.zoomLevel;
    const room = this.roomService.currentRoom();
    for (const wall of room.walls) {
        if (this.distance(pos, wall.start) < effectiveThreshold) return wall.start;
        if (this.distance(pos, wall.end) < effectiveThreshold) return wall.end;
    }
    return null;
  }

  private getHandleAtPosition(pos: Point): { wall: Wall; handle: 'start' | 'end' } | null {
    const selected = this.roomService.selectedElement();
    if (!selected || !('start' in selected)) return null; 
    
    const effectiveRadius = this.HANDLE_RADIUS / this.zoomLevel;
    
    const wall = selected as Wall;
    if (this.distance(pos, wall.start) < effectiveRadius) return { wall, handle: 'start' };
    if (this.distance(pos, wall.end) < effectiveRadius) return { wall, handle: 'end' };
    return null;
  }

  private getFurnitureRotationHandleAtPosition(pos: Point): Furniture | null {
    const selected = this.roomService.selectedElement();
    if (!selected || !('dimension' in selected)) return null;
    const furniture = selected as Furniture;

    const room = this.roomService.currentRoom();
    const height = furniture.dimension.height / 100 * room.scale;
    
    const handleDist = height/2 + 15/this.zoomLevel;
    const angleRad = (furniture.rotation - 90) * Math.PI / 180; 
    
    const handleX = furniture.position.x + handleDist * Math.cos(angleRad);
    const handleY = furniture.position.y + handleDist * Math.sin(angleRad);
    
    const effectiveRadius = 6 / this.zoomLevel;
    
    if (Math.sqrt((pos.x - handleX) ** 2 + (pos.y - handleY) ** 2) < effectiveRadius) {
        return furniture;
    }
    return null;
  }

  private distance = (p1: Point, p2: Point) => Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
  
  private snapToGridPoint = (x: number, y: number): Point => {
    const gridSize = this.roomService.currentRoom().gridSize;
    return { x: Math.round(x / gridSize) * gridSize, y: Math.round(y / gridSize) * gridSize };
  }
  
  private scheduleDraw(mousePos?: Point): void {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    this.animationFrameId = requestAnimationFrame(() => this.drawCanvas(mousePos));
  }
  
  private drawCanvas(mouseWorldPos?: Point): void {
    if (!this.canvasRef) return;
    const canvas = this.canvasRef.nativeElement;
    const { offsetWidth, offsetHeight } = canvas;
    
    if (offsetWidth === 0 || offsetHeight === 0) return;

    if (canvas.width !== offsetWidth || canvas.height !== offsetHeight) {
      canvas.width = offsetWidth;
      canvas.height = offsetHeight;
    }
    
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    const room = this.roomService.currentRoom();
    
    this.ctx.fillStyle = '#fafafa'; 
    this.ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    this.ctx.save();
    this.ctx.translate(this.panOffset.x, this.panOffset.y);
    this.ctx.scale(this.zoomLevel, this.zoomLevel);

    if (this.gridVisible()) this.drawGrid(this.ctx, room);
    
    room.walls.forEach(wall => this.drawWall(wall));
    room.furniture.forEach(item => this.drawFurniture(this.ctx, item, room.scale, this.zoomLevel));
    
    const selected = this.roomService.selectedElement();
    if (selected) this.highlightSelected(selected, room.scale);
    
    if (this.isDrawingWall && this.wallStartPoint && mouseWorldPos) this.drawTemporaryWall(this.wallStartPoint, mouseWorldPos);
    
    this.ctx.restore();
  }

  private drawGrid(ctx: CanvasRenderingContext2D, room: Room): void {
    const canvas = this.canvasRef.nativeElement;
    
    const topLeft = this.screenToWorld({ x: 0, y: 0 });
    const bottomRight = this.screenToWorld({ x: canvas.width, y: canvas.height });

    const startX = Math.floor(topLeft.x / room.gridSize) * room.gridSize;
    const endX = Math.ceil(bottomRight.x / room.gridSize) * room.gridSize;
    const startY = Math.floor(topLeft.y / room.gridSize) * room.gridSize;
    const endY = Math.ceil(bottomRight.y / room.gridSize) * room.gridSize;

    ctx.strokeStyle = '#e4e4e7';
    ctx.lineWidth = 1 / this.zoomLevel; 
    
    ctx.beginPath();
    if (room.gridSize <= 0) return;
    
    const MAX_LINES = 2000;
    if ((endX - startX) / room.gridSize > MAX_LINES || (endY - startY) / room.gridSize > MAX_LINES) return;

    for (let x = startX; x <= endX; x += room.gridSize) {
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
    }
    for (let y = startY; y <= endY; y += room.gridSize) {
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
    }
    ctx.stroke();
  }

  private drawWall(wall: Wall): void {
    const isSelected = this.roomService.selectedElement()?.id === wall.id;
    this.ctx.strokeStyle = isSelected ? '#18181b' : wall.color; 
    this.ctx.lineWidth = wall.thickness;
    this.ctx.lineCap = 'round';
    this.ctx.beginPath(); this.ctx.moveTo(wall.start.x, wall.start.y); this.ctx.lineTo(wall.end.x, wall.end.y); this.ctx.stroke();
    
    const midX = (wall.start.x + wall.end.x) / 2;
    const midY = (wall.start.y + wall.end.y) / 2;
    const lengthInMeters = wall.length / this.roomService.currentRoom().scale;
    
    this.ctx.save();
    this.ctx.translate(midX, midY); this.ctx.rotate(wall.angle);
    
    const labelScale = 1 / this.zoomLevel;
    
    if (isSelected || (lengthInMeters > 0.5 && this.zoomLevel > 0.5)) {
      this.ctx.scale(labelScale, labelScale);
      
      this.ctx.fillStyle = '#ffffff';
      this.ctx.strokeStyle = '#e4e4e7';
      this.ctx.lineWidth = 1;
      
      const text = `${lengthInMeters.toFixed(2)}m`;
      this.ctx.font = '500 11px Inter, sans-serif'; 
      const width = this.ctx.measureText(text).width + 12;
      
      this.ctx.beginPath();
      this.roundRect(this.ctx, -width/2, -10, width, 20, 10);
      this.ctx.fill();
      this.ctx.stroke();

      this.ctx.fillStyle = '#3f3f46';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(text, 0, 1);
    }
    this.ctx.restore();
  }

  private drawFurniture(ctx: CanvasRenderingContext2D, furniture: Furniture, scale: number, zoomLevel: number): void {
    ctx.save();
    const width = furniture.dimension.width / 100 * scale;
    const height = furniture.dimension.height / 100 * scale;
    ctx.translate(furniture.position.x, furniture.position.y);
    ctx.rotate(furniture.rotation * Math.PI / 180);
    
    // Shadow for depth
    ctx.shadowColor = 'rgba(0,0,0,0.1)';
    ctx.shadowBlur = 4 / zoomLevel;
    ctx.shadowOffsetY = 2 / zoomLevel;

    const w = width;
    const h = height;
    
    ctx.lineWidth = 1 / zoomLevel;
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';

    switch(furniture.type) {
        case FurnitureType.BED:
        case FurnitureType.DOUBLE_BED:
            // Base headboard
            ctx.fillStyle = furniture.color; 
            ctx.beginPath(); this.roundRect(ctx, -w/2, -h/2, w, h, 2); ctx.fill(); ctx.stroke();
            
            // Mattress/Sheets (White)
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); this.roundRect(ctx, -w/2 + 2, -h/2 + 2, w - 4, h - 4, 2); ctx.fill();
            
            // Blanket (Color)
            ctx.fillStyle = furniture.color;
            ctx.beginPath(); this.roundRect(ctx, -w/2 + 2, -h/2 + h*0.4, w - 4, h*0.6 - 2, 2); ctx.fill();
            
            // Pillows
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#d4d4d8';
            const pillowH = h * 0.2;
            if (furniture.type === FurnitureType.DOUBLE_BED) {
                const pillowW = w * 0.4;
                ctx.beginPath(); this.roundRect(ctx, -w/2 + w*0.05, -h/2 + h*0.05, pillowW, pillowH, 2); ctx.fill(); ctx.stroke();
                ctx.beginPath(); this.roundRect(ctx, w*0.05, -h/2 + h*0.05, pillowW, pillowH, 2); ctx.fill(); ctx.stroke();
            } else {
                const pillowW = w * 0.6;
                ctx.beginPath(); this.roundRect(ctx, -pillowW/2, -h/2 + h*0.05, pillowW, pillowH, 2); ctx.fill(); ctx.stroke();
            }
            break;

        case FurnitureType.TABLE:
        case FurnitureType.COFFEE_TABLE:
        case FurnitureType.END_TABLE:
        case FurnitureType.DESK:
            ctx.fillStyle = furniture.color;
            ctx.beginPath(); this.roundRect(ctx, -w/2, -h/2, w, h, 2); ctx.fill(); ctx.stroke();
            break;

        case FurnitureType.CHAIR:
        case FurnitureType.ARMCHAIR:
            // Backrest
            ctx.fillStyle = furniture.color; 
            ctx.beginPath(); this.roundRect(ctx, -w/2, -h/2, w, h*0.2, 2); ctx.fill(); ctx.stroke();
            
            // Arms
            if (furniture.type === FurnitureType.ARMCHAIR) {
                ctx.beginPath(); this.roundRect(ctx, -w/2, -h/2, w*0.15, h, 2); ctx.fill(); ctx.stroke();
                ctx.beginPath(); this.roundRect(ctx, w/2 - w*0.15, -h/2, w*0.15, h, 2); ctx.fill(); ctx.stroke();
            }
            
            // Seat
            ctx.fillStyle = furniture.color;
            const seatYStart = h * 0.2;
            ctx.beginPath(); this.roundRect(ctx, -w/2, -h/2 + seatYStart, w, h - seatYStart, 2); ctx.fill(); ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,0.1)';
            ctx.fill();
            break;

        case FurnitureType.SOFA:
            // Backrest
            ctx.fillStyle = furniture.color;
            ctx.beginPath(); this.roundRect(ctx, -w/2, -h/2, w, h*0.25, 2); ctx.fill(); ctx.stroke();
            
            // Arms
            ctx.beginPath(); this.roundRect(ctx, -w/2, -h/2, w*0.15, h, 2); ctx.fill(); ctx.stroke();
            ctx.beginPath(); this.roundRect(ctx, w/2 - w*0.15, -h/2, w*0.15, h, 2); ctx.fill(); ctx.stroke();
            
            // Cushions
            ctx.fillStyle = furniture.color;
            ctx.beginPath(); ctx.rect(-w/2 + w*0.15, -h/2 + h*0.25, w - w*0.3, h*0.75); ctx.fill(); ctx.stroke();
            
            // Cushion lines
            ctx.beginPath();
            if (w > h * 2.5) { 
                ctx.moveTo(-w/6, -h/2 + h*0.25); ctx.lineTo(-w/6, h/2);
                ctx.moveTo(w/6, -h/2 + h*0.25); ctx.lineTo(w/6, h/2);
            } else { 
                ctx.moveTo(0, -h/2 + h*0.25); ctx.lineTo(0, h/2);
            }
            ctx.stroke();
            break;

        case FurnitureType.TV_STAND:
            ctx.fillStyle = furniture.color;
            ctx.beginPath(); this.roundRect(ctx, -w/2, -h/2, w, h, 2); ctx.fill(); ctx.stroke();
            // TV
            ctx.fillStyle = '#111111';
            ctx.beginPath(); ctx.rect(-w/2 + w*0.1, -h/4, w*0.8, h*0.1); ctx.fill();
            break;

        case FurnitureType.WARDROBE:
        case FurnitureType.DRESSER:
        case FurnitureType.BOOKSHELF:
        case FurnitureType.NIGHTSTAND:
            ctx.fillStyle = furniture.color;
            ctx.beginPath(); this.roundRect(ctx, -w/2, -h/2, w, h, 1); ctx.fill(); ctx.stroke();
            // Front detail
            ctx.beginPath(); 
            ctx.moveTo(-w/2, h/2 - 2); ctx.lineTo(w/2, h/2 - 2);
            ctx.stroke();
            break;

        case FurnitureType.FLOOR_LAMP:
            ctx.fillStyle = furniture.color;
            ctx.beginPath(); ctx.arc(0, 0, w/2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            // Center bulb
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(0, 0, w/6, 0, Math.PI * 2); ctx.fill();
            // Cross struts
            ctx.beginPath();
            ctx.moveTo(-w/3, -w/3); ctx.lineTo(w/3, w/3);
            ctx.moveTo(w/3, -w/3); ctx.lineTo(-w/3, w/3);
            ctx.stroke();
            break;

        case FurnitureType.RUG:
            ctx.fillStyle = furniture.color;
            ctx.globalAlpha = 0.5;
            ctx.beginPath(); this.roundRect(ctx, -w/2, -h/2, w, h, 4); ctx.fill();
            ctx.globalAlpha = 1.0;
            ctx.setLineDash([2, 2]);
            ctx.stroke();
            ctx.setLineDash([]);
            break;

        default:
            ctx.fillStyle = furniture.color;
            ctx.fillRect(-w/2, -h/2, w, h);
            ctx.strokeStyle = 'rgba(0,0,0,0.2)';
            ctx.strokeRect(-w/2, -h/2, w, h);
    }
    
    // Reset shadow
    ctx.shadowColor = 'transparent';

    if (zoomLevel > 0.4 && furniture.type !== FurnitureType.RUG) {
        ctx.fillStyle = 'rgba(255,255,255,0.9)'; 
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'center'; 
        ctx.textBaseline = 'middle';
        if (width > 30) {
           ctx.fillText(furniture.name, 0, 0);
        }
    }
    
    ctx.restore();
  }

  // Helper for round rects
  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
      if (w < 2 * r) r = w / 2;
      if (h < 2 * r) r = h / 2;
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
  }

  private highlightSelected(element: any, scale: number): void {
    this.ctx.strokeStyle = '#3b82f6'; 
    this.ctx.lineWidth = 2 / this.zoomLevel; 
    
    if ('start' in element) { // Wall
      const wall = element as Wall;
      
      this.ctx.globalAlpha = 0.2;
      this.ctx.lineWidth = (wall.thickness + 12) / this.zoomLevel;
      
      this.ctx.beginPath(); this.ctx.moveTo(wall.start.x, wall.start.y); this.ctx.lineTo(wall.end.x, wall.end.y); this.ctx.stroke();
      this.ctx.globalAlpha = 1.0;

      // Draw handles
      this.ctx.fillStyle = '#ffffff'; 
      this.ctx.strokeStyle = '#3b82f6';
      this.ctx.lineWidth = 2 / this.zoomLevel; 
      
      const r = 5 / this.zoomLevel;
      this.ctx.beginPath(); this.ctx.arc(wall.start.x, wall.start.y, r, 0, 2 * Math.PI); this.ctx.fill(); this.ctx.stroke();
      this.ctx.beginPath(); this.ctx.arc(wall.end.x, wall.end.y, r, 0, 2 * Math.PI); this.ctx.fill(); this.ctx.stroke();
      
    } else if ('dimension' in element) { // Furniture
      const furniture = element as Furniture;
      const width = furniture.dimension.width / 100 * scale; 
      const height = furniture.dimension.height / 100 * scale;
      this.ctx.save();
      this.ctx.translate(furniture.position.x, furniture.position.y);
      this.ctx.rotate(furniture.rotation * Math.PI / 180);
      
      this.ctx.strokeStyle = '#3b82f6';
      this.ctx.setLineDash([4 / this.zoomLevel, 4 / this.zoomLevel]);
      const padding = 4;
      this.ctx.strokeRect(-width/2 - padding, -height/2 - padding, width + padding*2, height + padding*2);
      
      // Rotation handle
      this.ctx.beginPath();
      this.ctx.moveTo(0, -height/2 - padding);
      this.ctx.lineTo(0, -height/2 - 15/this.zoomLevel);
      this.ctx.stroke();
      
      this.ctx.fillStyle = '#3b82f6';
      this.ctx.setLineDash([]);
      this.ctx.beginPath();
      this.ctx.arc(0, -height/2 - 15/this.zoomLevel, 4/this.zoomLevel, 0, 2 * Math.PI);
      this.ctx.fill();

      this.ctx.restore();
    }
  }

  private drawTemporaryWall(start: Point, end: Point): void {
    this.ctx.strokeStyle = '#18181b'; 
    this.ctx.lineWidth = 4; 
    this.ctx.setLineDash([4, 4]);
    this.ctx.beginPath(); this.ctx.moveTo(start.x, start.y); this.ctx.lineTo(end.x, end.y); this.ctx.stroke();
    this.ctx.setLineDash([]);
  }

  @HostListener('window:resize') onResize(): void { this.scheduleDraw(); }

  public exportToPNG(): void {
    const room = this.roomService.currentRoom();
    if (room.walls.length === 0 && room.furniture.length === 0) {
      alert("Cannot export an empty room.");
      return;
    }

    const allPoints: Point[] = room.walls.flatMap(w => [w.start, w.end]);
    room.furniture.forEach(f => {
      const scale = room.scale;
      const w = f.dimension.width / 100 * scale / 2;
      const h = f.dimension.height / 100 * scale / 2;
      const angle = f.rotation * Math.PI / 180;
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      const corners = [{ x: w, y: h }, { x: -w, y: h }, { x: -w, y: -h }, { x: w, y: -h }];
      corners.forEach(corner => {
        allPoints.push({
          x: f.position.x + (corner.x * c - corner.y * s),
          y: f.position.y + (corner.x * s + corner.y * c)
        });
      });
    });

    if (allPoints.length === 0) return;

    const minX = Math.min(...allPoints.map(p => p.x));
    const maxX = Math.max(...allPoints.map(p => p.x));
    const minY = Math.min(...allPoints.map(p => p.y));
    const maxY = Math.max(...allPoints.map(p => p.y));

    const padding = 50;
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = (maxX - minX) + padding * 2;
    exportCanvas.height = (maxY - minY) + padding * 2;
    const exportCtx = exportCanvas.getContext('2d')!;

    exportCtx.fillStyle = '#ffffff';
    exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    exportCtx.translate(-minX + padding, -minY + padding);

    room.walls.forEach(wall => {
      exportCtx.strokeStyle = '#000000';
      exportCtx.lineWidth = wall.thickness;
      exportCtx.lineCap = 'round';
      exportCtx.beginPath();
      exportCtx.moveTo(wall.start.x, wall.start.y);
      exportCtx.lineTo(wall.end.x, wall.end.y);
      exportCtx.stroke();
    });

    // Reuse the detailed drawing logic
    room.furniture.forEach(furniture => {
        this.drawFurniture(exportCtx, furniture, room.scale, 1);
    });

    const link = document.createElement('a');
    link.download = `${room.name.replace(/\s+/g, '_')}_plan.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  }
}