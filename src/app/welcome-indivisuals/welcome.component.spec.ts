import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WelcomeIndivisualsComponent } from './welcome.component';

describe('WelcomeIndivisualsComponent', () => {
  let component: WelcomeIndivisualsComponent;
  let fixture: ComponentFixture<WelcomeIndivisualsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [WelcomeIndivisualsComponent]
    });
    fixture = TestBed.createComponent(WelcomeIndivisualsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
