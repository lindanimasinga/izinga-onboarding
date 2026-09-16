import { Injectable } from '@angular/core';

/**
 * FixedBarService — reference-counted body-class gate for pages that render a
 * position:fixed bottom action bar.
 *
 * Problem solved: Angular fires the incoming component's ngOnInit BEFORE the
 * outgoing component's ngOnDestroy, so a naive add/remove pair on two fixed-bar
 * pages strips the class and lets the bar overlap content.
 *
 * acquire() increments the counter and adds the class.
 * release() decrements and removes the class only when the counter reaches 0.
 *
 * Components call acquire() in ngOnInit and release() in ngOnDestroy.
 */
@Injectable({ providedIn: 'root' })
export class FixedBarService {
  private count = 0;

  acquire(): void {
    this.count++;
    document.body.classList.add('has-fixed-bar');
  }

  release(): void {
    if (this.count > 0) {
      this.count--;
    }
    if (this.count === 0) {
      document.body.classList.remove('has-fixed-bar');
    }
  }
}
