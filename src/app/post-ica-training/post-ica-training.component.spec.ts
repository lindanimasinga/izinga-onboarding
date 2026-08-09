import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { PostIcaTrainingComponent } from './post-ica-training.component';
import { StorageService } from '../service/storage-service.service';
import { AnalyticsService } from '../service/analytics.service';
import { UserProfile } from '../model/userProfile';

/**
 * ONB-POST-ICA unit tests — PostIcaTrainingComponent
 *
 * TRAIN-01  role=AMBASSADOR: renders ambassador heading.
 * TRAIN-02  role=AMBASSADOR: download link points to ambassador PDF.
 * TRAIN-03  role=REFERRALPARTNER: renders referral partner heading.
 * TRAIN-04  role=REFERRALPARTNER: download link points to referral partner PDF.
 * TRAIN-05  no profile in storage: redirects to "/".
 * TRAIN-06  analytics screen view event fires on init with correct role.
 * TRAIN-07  analytics download event fires on download button click.
 * TRAIN-08  Continue button navigates AMBASSADOR to /indivisuals/dashboard.
 * TRAIN-09  Continue button navigates REFERRALPARTNER to /indivisuals/rp-referral-code.
 * TRAIN-10  direct/repeat navigation: renders without error when profile already in storage (REQ-12).
 */
describe('PostIcaTrainingComponent', () => {
  let component: PostIcaTrainingComponent;
  let fixture: ComponentFixture<PostIcaTrainingComponent>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockStorage: Partial<StorageService>;
  let mockAnalytics: jasmine.SpyObj<AnalyticsService>;

  const ambassadorProfile: Partial<UserProfile> = {
    id: 'amb-001',
    name: 'Test Ambassador',
    role: UserProfile.RoleEnum.AMBASSADOR
  };

  const rpProfile: Partial<UserProfile> = {
    id: 'rp-001',
    name: 'Test RP',
    role: UserProfile.RoleEnum.REFERRALPARTNER
  };

  function setup(profile: Partial<UserProfile> | undefined) {
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockStorage = { userProfile: profile as UserProfile | undefined };
    mockAnalytics = jasmine.createSpyObj('AnalyticsService', ['logScreenView', 'logEvent']);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      declarations: [PostIcaTrainingComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: StorageService, useValue: mockStorage },
        { provide: AnalyticsService, useValue: mockAnalytics }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PostIcaTrainingComponent);
    component = fixture.componentInstance;
  }

  // TRAIN-01
  it('TRAIN-01: AMBASSADOR role renders ambassador heading', () => {
    setup(ambassadorProfile);
    fixture.detectChanges();
    expect(component.heading).toBe('Your Ambassador Training Guide');
    const h2: HTMLElement = fixture.nativeElement.querySelector('h2');
    expect(h2.textContent).toContain('Your Ambassador Training Guide');
  });

  // TRAIN-02
  it('TRAIN-02: AMBASSADOR role download link points to ambassador PDF', () => {
    setup(ambassadorProfile);
    fixture.detectChanges();
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('a[download]');
    expect(link).not.toBeNull();
    expect(link.getAttribute('href')).toContain('ambassador-training-pack-v1.pdf');
  });

  // TRAIN-03
  it('TRAIN-03: REFERRALPARTNER role renders referral partner heading', () => {
    setup(rpProfile);
    fixture.detectChanges();
    expect(component.heading).toBe('Your Referral Partner Training Guide');
    const h2: HTMLElement = fixture.nativeElement.querySelector('h2');
    expect(h2.textContent).toContain('Your Referral Partner Training Guide');
  });

  // TRAIN-04
  it('TRAIN-04: REFERRALPARTNER role download link points to referral partner PDF', () => {
    setup(rpProfile);
    fixture.detectChanges();
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('a[download]');
    expect(link).not.toBeNull();
    expect(link.getAttribute('href')).toContain('referral-partner-training-pack-v1.pdf');
  });

  // TRAIN-05
  it('TRAIN-05: redirects to "/" when no user profile in storage', () => {
    setup(undefined);
    fixture.detectChanges();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
  });

  // TRAIN-06
  it('TRAIN-06: fires training_guide_viewed analytics event on init with role', () => {
    setup(ambassadorProfile);
    fixture.detectChanges();
    expect(mockAnalytics.logScreenView).toHaveBeenCalledWith(
      'training_guide_viewed',
      jasmine.objectContaining({ role: UserProfile.RoleEnum.AMBASSADOR })
    );
  });

  // TRAIN-07
  it('TRAIN-07: fires training_guide_downloaded analytics event on download click', () => {
    setup(ambassadorProfile);
    fixture.detectChanges();
    component.onDownloadClicked();
    expect(mockAnalytics.logEvent).toHaveBeenCalledWith(
      'training_guide_downloaded',
      jasmine.objectContaining({ role: UserProfile.RoleEnum.AMBASSADOR })
    );
  });

  // TRAIN-08
  it('TRAIN-08: Continue button navigates AMBASSADOR to /indivisuals/dashboard', () => {
    setup(ambassadorProfile);
    fixture.detectChanges();
    component.continueToDashboard();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/indivisuals/dashboard']);
  });

  // TRAIN-09
  it('TRAIN-09: Continue button navigates REFERRALPARTNER to /indivisuals/rp-referral-code', () => {
    setup(rpProfile);
    fixture.detectChanges();
    component.continueToDashboard();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/indivisuals/rp-referral-code']);
  });

  // TRAIN-10
  it('TRAIN-10: renders without error on direct/repeat navigation when profile already in storage (REQ-12)', () => {
    // Simulate a returning user who navigates directly to /indivisuals/training-guide
    setup({ ...ambassadorProfile, icaAccepted: true, icaVersion: 'v1' });
    expect(() => fixture.detectChanges()).not.toThrow();
    expect(component.heading).toBe('Your Ambassador Training Guide');
    expect(mockRouter.navigate).not.toHaveBeenCalledWith(['/']);
  });
});
