import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { SubscriptionCancelComponent } from './subscription-cancel.component';
import { AnalyticsService } from '../service/analytics.service';

function makeAnalyticsStub(): AnalyticsService {
  return {
    logScreenView: jasmine.createSpy('logScreenView'),
    logEvent: jasmine.createSpy('logEvent')
  } as unknown as AnalyticsService;
}

describe('SubscriptionCancelComponent', () => {
  let component: SubscriptionCancelComponent;
  let fixture: ComponentFixture<SubscriptionCancelComponent>;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [SubscriptionCancelComponent],
      providers: [
        { provide: AnalyticsService, useValue: makeAnalyticsStub() }
      ]
    });
    fixture = TestBed.createComponent(SubscriptionCancelComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
  });

  afterEach(() => TestBed.resetTestingModule());

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should navigate to /business/dashboard when goToDashboard is called', () => {
    fixture.detectChanges();
    component.goToDashboard();
    expect(router.navigate).toHaveBeenCalledWith(['/business/dashboard']);
  });

  it('should navigate to /business/subscription/:storeId when tryAgain is called', () => {
    fixture.detectChanges();
    component.storeId = 'store-abc';
    component.tryAgain();
    expect(router.navigate).toHaveBeenCalledWith(['/business/subscription', 'store-abc']);
  });

  it('should render "Your store is ready" heading (positive framing)', () => {
    fixture.detectChanges();
    const compiled: HTMLElement = fixture.nativeElement;
    expect(compiled.textContent).toContain('Your store is ready');
  });

  it('should NOT contain the phrase "Payment cancelled" (per design direction)', () => {
    fixture.detectChanges();
    const compiled: HTMLElement = fixture.nativeElement;
    expect(compiled.textContent).not.toContain('Payment cancelled');
  });

  it('should show Free tier active badge', () => {
    fixture.detectChanges();
    const compiled: HTMLElement = fixture.nativeElement;
    expect(compiled.textContent?.toUpperCase()).toContain('FREE TIER ACTIVE');
  });

  it('should render both dashboard and try-again buttons', () => {
    fixture.detectChanges();
    const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('button');
    expect(buttons.length).toBe(2);
  });

  it('should log subscription_payment_cancelled event on init', () => {
    const analytics = TestBed.inject(AnalyticsService) as any;
    fixture.detectChanges();
    expect(analytics.logEvent).toHaveBeenCalledWith(
      'subscription_payment_cancelled',
      jasmine.any(Object)
    );
  });
});
