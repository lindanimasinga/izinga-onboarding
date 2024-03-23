import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WelcomeBusinessComponent } from './welcome-business.component';

describe('WelcomeComponent', () => {
  let component: WelcomeBusinessComponent;
  let fixture: ComponentFixture<WelcomeBusinessComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [WelcomeBusinessComponent]
    });
    fixture = TestBed.createComponent(WelcomeBusinessComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
