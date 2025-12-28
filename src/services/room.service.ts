import { Injectable, signal, WritableSignal } from '@angular/core';
import { Room } from '../models/room.model';
import { Wall } from '../models/wall.model';
import { Furniture } from '../models/furniture.model';
import { Point } from '../interfaces/point.interface';

@Injectable({
  providedIn: 'root'
})
export class RoomService {
  currentRoom: WritableSignal<Room>;
  selectedElement: WritableSignal<any | null> = signal(null);
  roomsSignal = signal<Room[]>([]);
  
  private rooms: Room[] = [];
  
  constructor() {
    this.loadRoomsFromStorage();
    if (this.rooms.length > 0) {
      this.currentRoom = signal(this.rooms[0]);
    } else {
      const defaultRoom = this.createDefaultRoom();
      this.rooms.push(defaultRoom);
      this.currentRoom = signal(defaultRoom);
      this.saveRoomsToStorage();
    }
    this.roomsSignal.set(this.rooms);
  }
  
  private createDefaultRoom(name = 'New Room'): Room {
    const p1: Point = { x: 100, y: 100, id: 'p' + Math.random() };
    const p2: Point = { x: 500, y: 100, id: 'p' + Math.random() };
    const p3: Point = { x: 500, y: 420, id: 'p' + Math.random() };
    const p4: Point = { x: 100, y: 420, id: 'p' + Math.random() };

    return {
      id: 'room_' + Date.now(),
      name: name,
      walls: [
        new Wall(p1, p2),
        new Wall(p2, p3),
        new Wall(p3, p4),
        new Wall(p4, p1)
      ],
      furniture: [],
      gridSize: 20,
      scale: 80, // 80px = 1m
      backgroundColor: '#fafafa', // Light zinc background
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
  
  updateRoomDimensions(widthInMeters: number, depthInMeters: number): void {
    this.currentRoom.update(room => {
      const widthInPixels = widthInMeters * room.scale;
      const depthInPixels = depthInMeters * room.scale;

      const startX = 100;
      const startY = 100;
      
      const p1: Point = { x: startX, y: startY, id: 'p' + Math.random() };
      const p2: Point = { x: startX + widthInPixels, y: startY, id: 'p' + Math.random() };
      const p3: Point = { x: startX + widthInPixels, y: startY + depthInPixels, id: 'p' + Math.random() };
      const p4: Point = { x: startX, y: startY + depthInPixels, id: 'p' + Math.random() };

      const newWalls = [
        new Wall(p1, p2),
        new Wall(p2, p3),
        new Wall(p3, p4),
        new Wall(p4, p1)
      ];
      
      return {
        ...room,
        walls: newWalls,
        furniture: []
      };
    });
    this.saveCurrentRoom();
  }
  
  private saveRoomsToStorage(): void {
    localStorage.setItem('roomPlannerRooms', JSON.stringify(this.rooms));
    this.roomsSignal.set([...this.rooms]);
  }

  private updateCurrentRoomInList(room: Room): void {
    const existingIndex = this.rooms.findIndex(r => r.id === room.id);
    if (existingIndex >= 0) {
      this.rooms[existingIndex] = room;
    } else {
      this.rooms.push(room);
    }
    this.saveRoomsToStorage();
  }

  addWall(start: Point, end: Point): void {
    this.currentRoom.update(room => {
      if (!start.id) start.id = 'p' + Math.random();
      if (!end.id) end.id = 'p' + Math.random();
      const newWall = new Wall(start, end);
      room.walls.push(newWall);
      return {...room};
    });
    this.saveCurrentRoom();
  }

  updateWalls(updates: {id: string, newStart: Point, newEnd: Point}[]): void {
    this.currentRoom.update(room => {
      const updatedWalls = room.walls.map(wall => {
        const update = updates.find(u => u.id === wall.id);
        return update ? new Wall(update.newStart, update.newEnd, wall.thickness, wall.color, wall.id) : wall;
      });
      return { ...room, walls: updatedWalls };
    });
  }

  detachWallEndpoint(wallId: string, handle: 'start' | 'end'): void {
    this.currentRoom.update(room => {
      const wall = room.walls.find(w => w.id === wallId);
      if (wall) {
        if (handle === 'start') {
          wall.start = { ...wall.start, id: 'p' + Math.random() };
        } else { // handle === 'end'
          wall.end = { ...wall.end, id: 'p' + Math.random() };
        }
      }
      return { ...room };
    });
    this.saveCurrentRoom();
  }

  attachWallEndpoint(wallId: string, handle: 'start' | 'end'): void {
    this.currentRoom.update(room => {
        const wall = room.walls.find(w => w.id === wallId);
        if (!wall) return room;

        const currentPoint = handle === 'start' ? wall.start : wall.end;
        let closestPoint: Point | null = null;
        let minDist = Infinity;
        const threshold = 50; // pixels, adjust as needed

        for (const otherWall of room.walls) {
            if (otherWall.id === wallId) continue;

            const distStart = Math.sqrt(Math.pow(currentPoint.x - otherWall.start.x, 2) + Math.pow(currentPoint.y - otherWall.start.y, 2));
            if (distStart < threshold && distStart < minDist) {
                minDist = distStart;
                closestPoint = otherWall.start;
            }

            const distEnd = Math.sqrt(Math.pow(currentPoint.x - otherWall.end.x, 2) + Math.pow(currentPoint.y - otherWall.end.y, 2));
            if (distEnd < threshold && distEnd < minDist) {
                minDist = distEnd;
                closestPoint = otherWall.end;
            }
        }

        if (closestPoint) {
            if (handle === 'start') {
                wall.start = closestPoint; // Share reference/ID
            } else {
                wall.end = closestPoint; // Share reference/ID
            }
        } else {
            // Optional: visual feedback that no point was found?
            // For now, silent fail or maybe just logic update
        }

        return { ...room };
    });
    this.saveCurrentRoom();
  }
  
  removeWall(wallId: string): void {
    this.currentRoom.update(room => {
      room.walls = room.walls.filter(w => w.id !== wallId);
      return {...room};
    });
    this.saveCurrentRoom();
  }
  
  addFurniture(furniture: Furniture): void {
    this.currentRoom.update(room => {
      room.furniture.push(furniture);
      return {...room};
    });
    this.saveCurrentRoom();
  }
  
  removeFurniture(furnitureId: string): void {
    this.currentRoom.update(room => {
      room.furniture = room.furniture.filter(f => f.id !== furnitureId);
      return {...room};
    });
     this.saveCurrentRoom();
  }
  
  updateFurniture(updatedFurniture: Furniture): void {
    this.currentRoom.update(room => {
      const index = room.furniture.findIndex(f => f.id === updatedFurniture.id);
      if (index > -1) {
        room.furniture[index] = updatedFurniture;
      }
      return {...room};
    });
  }

  selectElement(element: any): void {
    this.selectedElement.set(element);
  }
  
  clearSelection(): void {
    this.selectedElement.set(null);
  }
  
  private loadRoomsFromStorage(): void {
    try {
      const saved = localStorage.getItem('roomPlannerRooms');
      if (saved) {
        this.rooms = JSON.parse(saved).map((roomData: any) => {
            const walls = roomData.walls.map((w: any) => new Wall(w.start, w.end, w.thickness, w.color, w.id));
            return {
              ...roomData, 
              walls,
              createdAt: new Date(roomData.createdAt),
              updatedAt: new Date(roomData.updatedAt)
            };
        });
      }
    } catch (e) {
      console.error("Could not load rooms from storage", e);
      this.rooms = [];
    }
  }
  
  saveCurrentRoom(): void {
    const room = this.currentRoom();
    room.updatedAt = new Date();
    this.updateCurrentRoomInList(room);
  }
  
  getRoomCount(): number {
    return this.rooms.length;
  }

  createNewRoom(name: string): void {
    const newRoom = this.createDefaultRoom(name);
    this.rooms.push(newRoom);
    this.currentRoom.set(newRoom);
    this.clearSelection();
    this.saveRoomsToStorage();
  }

  loadRoom(roomId: string): void {
    const room = this.rooms.find(r => r.id === roomId);
    if (room) {
      this.currentRoom.set(room);
      this.clearSelection();
    }
  }

  deleteRoom(roomId: string): void {
    const roomIndex = this.rooms.findIndex(r => r.id === roomId);
    if (roomIndex === -1) return;

    if (this.rooms.length <= 1) {
      alert("Cannot delete the last room.");
      return;
    }

    if (confirm(`Are you sure you want to delete "${this.rooms[roomIndex].name}"?`)) {
      const isDeletingCurrent = this.currentRoom().id === roomId;
      this.rooms.splice(roomIndex, 1);
      
      if (isDeletingCurrent) {
        this.currentRoom.set(this.rooms[0]);
      }

      this.saveRoomsToStorage();
    }
  }
}