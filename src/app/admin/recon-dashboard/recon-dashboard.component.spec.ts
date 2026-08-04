import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';

import { ReconDashboardComponent } from './recon-dashboard.component';
import { ReconPayoutService } from '../../service/recon-payout.service';

describe('ReconDashboardComponent — CSV confirm/cancel state machine', () => {
  let component: ReconDashboardComponent;
  let fixture: ComponentFixture<ReconDashboardComponent>;
  let reconServiceSpy: jasmine.SpyObj<ReconPayoutService>;

  beforeEach(async () => {
    reconServiceSpy = jasmine.createSpyObj('ReconPayoutService', [
      'getPayoutBundles',
      'triggerShopCsvDownload',
      'triggerMessengerCsvDownload',
      'patchShopPayoutBundle',
      'patchMessengerPayoutBundle'
    ]);

    // Default: return empty arrays so ngOnInit doesn't blow up.
    reconServiceSpy.getPayoutBundles.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      declarations: [ReconDashboardComponent],
      imports: [RouterTestingModule],
      providers: [
        { provide: ReconPayoutService, useValue: reconServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ReconDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('requestCsvDownload()', () => {
    it('sets pendingCsvType to "shop" without calling the service (shows confirm dialog)', () => {
      component.requestCsvDownload('shop');

      expect(component.pendingCsvType).toBe('shop');
      expect(reconServiceSpy.triggerShopCsvDownload).not.toHaveBeenCalled();
    });

    it('sets pendingCsvType to "messenger" without calling the service', () => {
      component.requestCsvDownload('messenger');

      expect(component.pendingCsvType).toBe('messenger');
      expect(reconServiceSpy.triggerMessengerCsvDownload).not.toHaveBeenCalled();
    });
  });

  describe('cancelCsvDownload()', () => {
    it('clears pendingCsvType and does NOT call the service', () => {
      component.pendingCsvType = 'shop';

      component.cancelCsvDownload();

      expect(component.pendingCsvType).toBeNull();
      expect(reconServiceSpy.triggerShopCsvDownload).not.toHaveBeenCalled();
    });

    it('clears pendingCsvType for messenger type and does NOT call the service', () => {
      component.pendingCsvType = 'messenger';

      component.cancelCsvDownload();

      expect(component.pendingCsvType).toBeNull();
      expect(reconServiceSpy.triggerMessengerCsvDownload).not.toHaveBeenCalled();
    });
  });

  describe('confirmCsvDownload()', () => {
    it('calls triggerShopCsvDownload when pendingCsvType is "shop" and clears pendingCsvType', () => {
      reconServiceSpy.triggerShopCsvDownload.and.returnValue(of(undefined));
      component.pendingCsvType = 'shop';

      component.confirmCsvDownload();

      expect(reconServiceSpy.triggerShopCsvDownload).toHaveBeenCalledTimes(1);
      expect(component.pendingCsvType).toBeNull();
    });

    it('calls triggerMessengerCsvDownload when pendingCsvType is "messenger" and clears pendingCsvType', () => {
      reconServiceSpy.triggerMessengerCsvDownload.and.returnValue(of(undefined));
      component.pendingCsvType = 'messenger';

      component.confirmCsvDownload();

      expect(reconServiceSpy.triggerMessengerCsvDownload).toHaveBeenCalledTimes(1);
      expect(component.pendingCsvType).toBeNull();
    });

    it('does NOT call either CSV service when pendingCsvType is null', () => {
      component.pendingCsvType = null;

      component.confirmCsvDownload();

      expect(reconServiceSpy.triggerShopCsvDownload).not.toHaveBeenCalled();
      expect(reconServiceSpy.triggerMessengerCsvDownload).not.toHaveBeenCalled();
    });
  });
});
