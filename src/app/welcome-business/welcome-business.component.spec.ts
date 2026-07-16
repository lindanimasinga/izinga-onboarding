import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';

import { WelcomeBusinessComponent } from './welcome-business.component';
import { StorageService } from '../service/storage-service.service';

describe('WelcomeBusinessComponent', () => {
  let component: WelcomeBusinessComponent;
  let fixture: ComponentFixture<WelcomeBusinessComponent>;
  let mockStorage: Partial<StorageService>;

  beforeEach(async () => {
    mockStorage = { referralPartnerRef: null };

    await TestBed.configureTestingModule({
      declarations: [WelcomeBusinessComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: StorageService, useValue: mockStorage },
        {
          provide: ActivatedRoute,
          useValue: { queryParams: of({}) }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(WelcomeBusinessComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('RP-005b: stores ref param in StorageService when ?ref= is present', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      declarations: [WelcomeBusinessComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: StorageService, useValue: mockStorage },
        {
          provide: ActivatedRoute,
          useValue: { queryParams: of({ ref: 'ABC123' }) }
        }
      ]
    });

    const localFixture = TestBed.createComponent(WelcomeBusinessComponent);
    localFixture.detectChanges();

    expect(mockStorage.referralPartnerRef).toBe('ABC123');
  });

  it('RP-005b: does not overwrite referralPartnerRef when ?ref= is absent', () => {
    mockStorage.referralPartnerRef = 'EXISTING';
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      declarations: [WelcomeBusinessComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: StorageService, useValue: mockStorage },
        {
          provide: ActivatedRoute,
          useValue: { queryParams: of({}) }
        }
      ]
    });

    const localFixture = TestBed.createComponent(WelcomeBusinessComponent);
    localFixture.detectChanges();

    expect(mockStorage.referralPartnerRef).toBe('EXISTING');
  });
});
