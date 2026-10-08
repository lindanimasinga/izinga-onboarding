import { ComponentFixture, TestBed, fakeAsync, tick, discardPeriodicTasks } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { SubscriptionSuccessComponent } from './subscription-success.component';
import { AnalyticsService } from '../service/analytics.service';

function makeAnalyticsStub(): AnalyticsService {
  return {
    logScreenView: jasmine.createSpy('logScreenView'),
    logEvent: jasmine.createSpy('logEvent')
  } as unknown as AnalyticsService;
}

describe('SubscriptionSuccessComponent', () => {
  let component: SubscriptionSuccessComponent;
  let fixture: ComponentFixture<SubscriptionSuccessComponent>;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [SubscriptionSuccessComponent],
      providers: [
        { provide: AnalyticsService, useValue: makeAnalyticsStub() }
      ]
    });
    fixture = TestBed.createComponent(SubscriptionSuccessComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
  });

  afterEach(() => TestBed.resetTestingModule());

  it('should create', fakeAsync(() => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    discardPeriodicTasks();
  }));

  it('should navigate to /business/dashboard when goToDashboard is called', fakeAsync(() => {
    fixture.detectChanges();
    component.goToDashboard();
    expect(router.navigate).toHaveBeenCalledWith(['/business/dashboard']);
    discardPeriodicTasks();
  }));

  it('should start countdown at 5 when not in reduced-motion', fakeAsync(() => {
    // Patch reducedMotion to false for this test.
    Object.defineProperty(component, 'reducedMotion', { value: false });
    fixture.detectChanges();
    expect(component.countdown).toBe(5);
    discardPeriodicTasks();
  }));

  it('should decrement countdown over time (reduced-motion off)', fakeAsync(() => {
    Object.defineProperty(component, 'reducedMotion', { value: false });
    fixture.detectChanges();
    tick(1000);
    expect(component.countdown).toBe(4);
    tick(1000);
    expect(component.countdown).toBe(3);
    // Discard remaining ticks to avoid auto-navigate during test teardown.
    discardPeriodicTasks();
  }));

  it('should auto-navigate when countdown reaches 0', fakeAsync(() => {
    Object.defineProperty(component, 'reducedMotion', { value: false });
    fixture.detectChanges();
    tick(5000);
    expect(router.navigate).toHaveBeenCalledWith(['/business/dashboard']);
    discardPeriodicTasks();
  }));

  it('should log subscription_payment_received event on init', fakeAsync(() => {
    const analytics = TestBed.inject(AnalyticsService) as any;
    fixture.detectChanges();
    expect(analytics.logEvent).toHaveBeenCalledWith('subscription_payment_received', jasmine.any(Object));
    discardPeriodicTasks();
  }));

  it('should not render a tier badge indicating ACTIVE status', fakeAsync(() => {
    fixture.detectChanges();
    const compiled: HTMLElement = fixture.nativeElement;
    // The word "successful" must not appear (per AC-16 / design direction).
    expect(compiled.textContent).not.toContain('successful');
    // "Payment received" badge is present; "Payment successful" is not.
    expect(compiled.textContent).toContain('Payment received');
    discardPeriodicTasks();
  }));

  it('should render "Go to my dashboard now" CTA', fakeAsync(() => {
    fixture.detectChanges();
    const compiled: HTMLElement = fixture.nativeElement;
    expect(compiled.textContent).toContain('Go to my dashboard now');
    discardPeriodicTasks();
  }));

  it('CTA button should never be disabled', fakeAsync(() => {
    fixture.detectChanges();
    const btn: HTMLButtonElement | null = fixture.nativeElement.querySelector('button');
    expect(btn?.disabled).toBeFalse();
    discardPeriodicTasks();
  }));
});
