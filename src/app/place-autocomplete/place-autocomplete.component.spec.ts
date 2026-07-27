import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';

import { PlaceAutocompleteComponent } from './place-autocomplete.component';

// Stub the Google Maps API which is not loaded in the test environment.
(window as any)['google'] = {
  maps: {
    places: {
      Autocomplete: class {
        addListener(_event: string, _cb: () => void) {}
        getPlace() { return { formatted_address: '', geometry: { location: { lat: 0, lng: 0 } } }; }
      }
    }
  }
};

describe('PlaceAutocompleteComponent', () => {
  let component: PlaceAutocompleteComponent;
  let fixture: ComponentFixture<PlaceAutocompleteComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ PlaceAutocompleteComponent ],
      imports: [ FormsModule ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PlaceAutocompleteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
