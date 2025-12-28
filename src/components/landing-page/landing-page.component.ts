import { Component, output, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  templateUrl: './landing-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingPageComponent {
  start = output<void>();

  onStart(): void {
    this.start.emit();
  }
}