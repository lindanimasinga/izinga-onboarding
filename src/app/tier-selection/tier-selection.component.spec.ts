import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { TierSelectionComponent } from './tier-selection.component';
import { StorageService } from '../service/storage-service.service';
import { AnalyticsService } from '../service/analytics.service';

const mockStorageService: Partial<StorageService> = {
  selectedTier: null as any,
  userProfile: undefined
};

const mockAnalyticsService: Partial<AnalyticsService> = {
  logScreenView: jasmine.createSpy('logScreenView'),
  logEvent: jasmine.createSpy('logEvent')
};

describe('TierSelectionComponent', () => {
  let component: TierSelectionComponent;
  let fixture: ComponentFixture<TierSelectionComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TierSelectionComponent],
      imports: [RouterTestingModule.withRoutes([])],
      providers: [
        { provide: StorageService, useValue: mockStorageService },
        { provide: AnalyticsService, useValue: mockAnalyticsService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TierSelectionComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should log screen view on init', () => {
    expect(mockAnalyticsService.logScreenView).toHaveBeenCalledWith('tier_selection');
  });

  describe('selectTier()', () => {
    beforeEach(() => {
      component.userId = 'test-user-id';
    });

    it('should store FREE in storageService', () => {
      const navigateSpy = spyOn(router, 'navigate');
      component.selectTier('FREE');
      expect(mockStorageService.selectedTier).toBe('FREE');
    });

    it('should store PREMIUM_1 in storageService', () => {
      spyOn(router, 'navigate');
      component.selectTier('PREMIUM_1');
      expect(mockStorageService.selectedTier).toBe('PREMIUM_1');
    });

    it('should store PREMIUM_2 in storageService', () => {
      spyOn(router, 'navigate');
      component.selectTier('PREMIUM_2');
      expect(mockStorageService.selectedTier).toBe('PREMIUM_2');
    });

    it('should navigate to /business/terms/:id after selection', () => {
      const navigateSpy = spyOn(router, 'navigate');
      component.selectTier('FREE');
      expect(navigateSpy).toHaveBeenCalledWith(['/business/terms', 'test-user-id']);
    });

    it('should navigate with empty string when userId is undefined', () => {
      component.userId = undefined;
      const navigateSpy = spyOn(router, 'navigate');
      component.selectTier('PREMIUM_1');
      expect(navigateSpy).toHaveBeenCalledWith(['/business/terms', '']);
    });

    it('should log analytics event with tier and userId', () => {
      spyOn(router, 'navigate');
      component.selectTier('PREMIUM_2');
      expect(mockAnalyticsService.logEvent).toHaveBeenCalledWith(
        'tier_selected',
        { tier: 'PREMIUM_2', userId: 'test-user-id' }
      );
    });
  });
});
