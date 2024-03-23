import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PayoutDetailsComponent } from './payout-details.component';

describe('PayoutDetailsComponent', () => {
  let component: PayoutDetailsComponent;
  let fixture: ComponentFixture<PayoutDetailsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PayoutDetailsComponent]
    });
    fixture = TestBed.createComponent(PayoutDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
