import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { SubscriptionCheckoutComponent } from './subscription-checkout.component';
import { IzingaOrderManagementService } from '../service/izinga-order-management.service';
import { StorageService } from '../service/storage-service.service';
import { AnalyticsService } from '../service/analytics.service';

function makeServiceStub(params: { [key: string]: string } = {}) {
  return {
    initiateSubscription: jasmine.createSpy('initiateSubscription').and.returnValue(of(params))
  } as unknown as IzingaOrderManagementService;
}

function makeStorageStub(tier: string | null): StorageService {
  return { selectedTier: tier } as unknown as StorageService;
}

function makeAnalyticsStub(): AnalyticsService {
  return {
    logScreenView: jasmine.createSpy('logScreenView'),
    logEvent: jasmine.createSpy('logEvent')
  } as unknown as AnalyticsService;
}

describe('SubscriptionCheckoutComponent', () => {
  let component: SubscriptionCheckoutComponent;
  let fixture: ComponentFixture<SubscriptionCheckoutComponent>;
  let router: Router;

  function setup(tier: string | null, serviceStub?: IzingaOrderManagementService) {
    const storageStub = makeStorageStub(tier);
    const svc = serviceStub ?? makeServiceStub({ m_payment_id: 'pay-001', merchant_id: '16791971' });

    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [SubscriptionCheckoutComponent],
      providers: [
        { provide: IzingaOrderManagementService, useValue: svc },
        { provide: StorageService, useValue: storageStub },
        { provide: AnalyticsService, useValue: makeAnalyticsStub() }
      ]
    });
    fixture = TestBed.createComponent(SubscriptionCheckoutComponent);
    component = fixture.componentInstance;

    // Prevent actual DOM form submission in tests.
    spyOn(component as any, 'submitPayFastForm').and.stub();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
  }

  afterEach(() => TestBed.resetTestingModule());

  it('should create', () => {
    setup('PREMIUM_1');
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  // Fix 1 (TIER-BILLING-01 DS review): initiateCheckout() must NOT be called on init —
  // the checkout card must render first so the merchant sees the billing disclosure.
  it('should NOT call initiateSubscription automatically on init', () => {
    const svc = makeServiceStub({ m_payment_id: 'pay-001', merchant_id: '16791971' });
    setup('PREMIUM_1', svc);
    fixture.detectChanges();
    expect(svc.initiateSubscription).not.toHaveBeenCalled();
  });

  it('loading should be false on init (checkout card is the resting state)', () => {
    setup('PREMIUM_1');
    fixture.detectChanges();
    expect(component.loading).toBeFalse();
  });

  it('errorMessage should be null on init', () => {
    setup('PREMIUM_1');
    fixture.detectChanges();
    expect(component.errorMessage).toBeNull();
  });

  it('should call initiateSubscription with PREMIUM_1 when initiateCheckout is explicitly called', () => {
    const svc = makeServiceStub({ m_payment_id: 'pay-001', merchant_id: '16791971' });
    setup('PREMIUM_1', svc);
    fixture.detectChanges();
    component.initiateCheckout();
    expect(svc.initiateSubscription).toHaveBeenCalledWith('PREMIUM_1');
  });

  it('should call initiateSubscription with PREMIUM_2 when initiateCheckout is explicitly called', () => {
    const svc = makeServiceStub({ m_payment_id: 'pay-002', merchant_id: '16791971' });
    setup('PREMIUM_2', svc);
    fixture.detectChanges();
    component.initiateCheckout();
    expect(svc.initiateSubscription).toHaveBeenCalledWith('PREMIUM_2');
  });

  it('should call submitPayFastForm on successful initiation', () => {
    setup('PREMIUM_1');
    fixture.detectChanges();
    component.initiateCheckout();
    expect((component as any).submitPayFastForm).toHaveBeenCalled();
  });

  it('should navigate to /business/dashboard on HTTP 409', () => {
    const errorStub = {
      initiateSubscription: jasmine.createSpy('initiateSubscription').and.returnValue(
        throwError({ status: 409 })
      )
    } as unknown as IzingaOrderManagementService;
    setup('PREMIUM_1', errorStub);
    fixture.detectChanges();
    component.initiateCheckout();
    expect(router.navigate).toHaveBeenCalledWith(['/business/dashboard']);
  });

  it('should show error message on non-409 error', () => {
    const errorStub = {
      initiateSubscription: jasmine.createSpy('initiateSubscription').and.returnValue(
        throwError({ status: 500 })
      )
    } as unknown as IzingaOrderManagementService;
    setup('PREMIUM_1', errorStub);
    fixture.detectChanges();
    component.initiateCheckout();
    expect(component.errorMessage).not.toBeNull();
    expect(component.errorMessage).toContain("couldn't start");
  });

  it('should redirect to dashboard when tier is FREE (belt-and-suspenders)', () => {
    setup('FREE');
    fixture.detectChanges();
    component.initiateCheckout();
    expect(router.navigate).toHaveBeenCalledWith(['/business/dashboard']);
  });

  it('should redirect to dashboard when tier is null', () => {
    setup(null);
    fixture.detectChanges();
    component.initiateCheckout();
    expect(router.navigate).toHaveBeenCalledWith(['/business/dashboard']);
  });

  it('tierPrice should return R800 for PREMIUM_1', () => {
    setup('PREMIUM_1');
    fixture.detectChanges();
    expect(component.tierPrice).toBe('R800');
  });

  it('tierPrice should return R3,000 for PREMIUM_2', () => {
    setup('PREMIUM_2');
    fixture.detectChanges();
    expect(component.tierPrice).toBe('R3,000');
  });

  it('loading should be false after a successful initiation', () => {
    setup('PREMIUM_1');
    fixture.detectChanges();
    component.initiateCheckout();
    expect(component.loading).toBeFalse();
  });

  it('loading should be false after an error', () => {
    const errorStub = {
      initiateSubscription: jasmine.createSpy().and.returnValue(throwError({ status: 500 }))
    } as unknown as IzingaOrderManagementService;
    setup('PREMIUM_1', errorStub);
    fixture.detectChanges();
    component.initiateCheckout();
    expect(component.loading).toBeFalse();
  });
});
