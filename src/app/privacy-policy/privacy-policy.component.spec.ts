import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Router } from '@angular/router';

import { PrivacyPolicyComponent } from './privacy-policy.component';
import { AnalyticsService } from '../service/analytics.service';

describe('PrivacyPolicyComponent', () => {
  let fixture: ComponentFixture<PrivacyPolicyComponent>;

  const routerStub = { navigate: () => {} };
  const analyticsStub = { logScreenView: () => {} };

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PrivacyPolicyComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: Router, useValue: routerStub },
        { provide: AnalyticsService, useValue: analyticsStub },
      ],
    });
    fixture = TestBed.createComponent(PrivacyPolicyComponent);
    fixture.detectChanges();
  });

  // TC-PP-01: component creation smoke test
  it('TC-PP-01: should create the component', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  // TC-PP-02: Information Officer name guard — prevents silent regression
  it('TC-PP-02: rendered template contains "Lindani Masinga" as Information Officer', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Lindani Masinga');
  });

  // TC-PP-03: Information Officer email guard — prevents silent regression
  it('TC-PP-03: rendered template contains privacy@izinga.co.za as the contact email', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('privacy@izinga.co.za');
  });
});
