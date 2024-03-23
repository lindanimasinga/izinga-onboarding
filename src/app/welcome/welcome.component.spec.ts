import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WelcomeSelectionComponent } from './welcome-selection.component';

describe('WelcomeComponent', () => {
  let component: WelcomeSelectionComponent;
  let fixture: ComponentFixture<WelcomeSelectionComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [WelcomeSelectionComponent]
    });
    fixture = TestBed.createComponent(WelcomeSelectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
