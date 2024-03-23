import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PayoutOdersComponent } from './payout-oders.component';

describe('PayoutOdersComponent', () => {
  let component: PayoutOdersComponent;
  let fixture: ComponentFixture<PayoutOdersComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PayoutOdersComponent]
    });
    fixture = TestBed.createComponent(PayoutOdersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
