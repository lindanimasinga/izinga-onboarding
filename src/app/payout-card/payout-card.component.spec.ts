import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PayoutCardComponent } from './payout-card.component';

describe('PayoutCardComponent', () => {
  let component: PayoutCardComponent;
  let fixture: ComponentFixture<PayoutCardComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PayoutCardComponent]
    });
    fixture = TestBed.createComponent(PayoutCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
