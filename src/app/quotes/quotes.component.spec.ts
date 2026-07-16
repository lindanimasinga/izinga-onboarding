import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { QuotesComponent } from './quotes.component';
import { IzingaOrderManagementService, Lead } from '../service/izinga-order-management.service';
import { StorageService } from '../service/storage-service.service';

const MOCK_LEADS: Lead[] = [
  {
    id: 'lead-001',
    phone: '0821234567',
    items: [{ stockId: 'stock-1', name: 'Couch', quantity: 1 }],
    fromAddress: '10 Main St, Johannesburg',
    toAddress: '5 Church St, Pretoria',
    estimatedDeliveryFee: 850,
    category: 'FURNITURE',
    distanceKm: 12.5,
    standardFee: 350,
    standardKm: 5,
    ratePerKm: 18,
    storeType: 'MOVERS',
    storeId: 'store-1',
    status: 'CAPTURED',
    anonymous: false,
    consentGiven: true,
    createdDate: '2026-07-01T10:00:00+02:00'
  },
  {
    id: 'lead-002',
    phone: undefined,
    items: [],
    fromAddress: '1 Long St, Cape Town',
    toAddress: '3 Short St, Cape Town',
    estimatedDeliveryFee: 400,
    storeType: 'MOVERS',
    storeId: 'store-1',
    status: 'CONVERTED',
    anonymous: true,
    consentGiven: false,
    createdDate: '2026-07-02T09:30:00+02:00'
  }
];

function buildTestBed(userProfile: any, getLeadsResult: any, updateLeadStatusResult?: any) {
  const orderSvc = jasmine.createSpyObj('IzingaOrderManagementService', ['getLeads', 'updateLeadStatus']);
  orderSvc.getLeads.and.returnValue(getLeadsResult);
  if (updateLeadStatusResult !== undefined) {
    orderSvc.updateLeadStatus.and.returnValue(updateLeadStatusResult);
  }

  // Use a plain object so properties are writable
  const storageSvc = { userProfile, userType: 'indivisuals' };
  const router = jasmine.createSpyObj('Router', ['navigate']);

  TestBed.configureTestingModule({
    declarations: [QuotesComponent],
    imports: [FormsModule],
    providers: [
      { provide: IzingaOrderManagementService, useValue: orderSvc },
      { provide: StorageService, useValue: storageSvc },
      { provide: Router, useValue: router }
    ]
  }).compileComponents();

  const fixture: ComponentFixture<QuotesComponent> = TestBed.createComponent(QuotesComponent);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, orderSvc, storageSvc, router };
}

describe('QuotesComponent', () => {

  afterEach(() => TestBed.resetTestingModule());

  it('should create without error', () => {
    const { component } = buildTestBed({ role: 'ADMIN' }, of([]));
    expect(component).toBeTruthy();
  });

  it('should call getLeads on init when user is ADMIN', () => {
    const { orderSvc } = buildTestBed({ role: 'ADMIN' }, of(MOCK_LEADS));
    expect(orderSvc.getLeads).toHaveBeenCalledOnceWith('MOVERS');
  });

  it('should NOT call getLeads on init when user is not ADMIN', () => {
    const { orderSvc } = buildTestBed({ role: 'MESSENGER' }, of([]));
    expect(orderSvc.getLeads).not.toHaveBeenCalled();
  });

  it('should display lead list when data returns', () => {
    const { component } = buildTestBed({ role: 'ADMIN' }, of(MOCK_LEADS));
    expect(component.leads.length).toBe(2);
    expect(component.leads[0].id).toBe('lead-001');
    expect(component.leads[1].id).toBe('lead-002');
  });

  it('should show access denied message when user is not ADMIN', () => {
    const { fixture } = buildTestBed({ role: 'MESSENGER' }, of([]));
    const compiled: HTMLElement = fixture.nativeElement;
    expect(compiled.textContent).toContain('Access Denied');
  });

  it('should set errorMessage when getLeads fails', () => {
    const { component } = buildTestBed(
      { role: 'ADMIN' },
      throwError(() => new Error('Network error'))
    );
    expect(component.errorMessage).toBe('Failed to load quotes. Please try again.');
  });

  it('should treat CONVERTED leads as display-only (isConverted returns true)', () => {
    const { component } = buildTestBed({ role: 'ADMIN' }, of(MOCK_LEADS));
    const convertedLead = component.leads.find(l => l.status === 'CONVERTED')!;
    expect(component.isConverted(convertedLead)).toBeTrue();
  });

  it('should call updateLeadStatus and reload leads on status change', () => {
    const updatedLead = { ...MOCK_LEADS[0], status: 'CONTACTED' as const };
    const { component, orderSvc } = buildTestBed(
      { role: 'ADMIN' },
      of(MOCK_LEADS),
      of(updatedLead)
    );

    component.onStatusChange(component.leads[0], 'CONTACTED');

    expect(orderSvc.updateLeadStatus).toHaveBeenCalledOnceWith('lead-001', 'CONTACTED');
    expect(orderSvc.getLeads).toHaveBeenCalledTimes(2); // init + after update
  });

  it('should set errorMessage when updateLeadStatus fails', () => {
    const { component, orderSvc } = buildTestBed(
      { role: 'ADMIN' },
      of(MOCK_LEADS),
      throwError(() => new Error('Patch error'))
    );

    component.onStatusChange(component.leads[0], 'CLOSED');
    expect(component.errorMessage).toBe('Failed to update lead status. Please try again.');
  });

  // --- estimatedDeliveryFee display ---

  it('should display estimatedDeliveryFee in the card when present', () => {
    const { fixture } = buildTestBed({ role: 'ADMIN' }, of(MOCK_LEADS));
    const compiled: HTMLElement = fixture.nativeElement;
    // R850.00 rendered via currency pipe — check for the numeric portion
    expect(compiled.textContent).toContain('850');
  });

  it('should NOT display a price row when estimatedDeliveryFee is null/undefined', () => {
    const legacyLead: Lead = {
      id: 'lead-old',
      phone: '0831111111',
      items: [],
      fromAddress: 'A',
      toAddress: 'B',
      estimatedDeliveryFee: null as any,
      storeType: 'MOVERS',
      storeId: 'store-1',
      status: 'CAPTURED',
      anonymous: false,
      consentGiven: false,
      createdDate: '2025-01-01T00:00:00+02:00'
    };
    const { fixture } = buildTestBed({ role: 'ADMIN' }, of([legacyLead]));
    const compiled: HTMLElement = fixture.nativeElement;
    // The attach_money icon row should not appear
    expect(compiled.querySelector('[data-testid="price-row"]')).toBeNull();
    // And there should be no "R0" artefact
    expect(compiled.textContent).not.toContain('R0');
  });

  // --- new enrichment fields ---

  it('should display category when present', () => {
    const { fixture } = buildTestBed({ role: 'ADMIN' }, of(MOCK_LEADS));
    expect(fixture.nativeElement.textContent).toContain('FURNITURE');
  });

  it('should display distanceKm when present', () => {
    const { fixture } = buildTestBed({ role: 'ADMIN' }, of(MOCK_LEADS));
    expect(fixture.nativeElement.textContent).toContain('12.5');
  });

  it('should display standardFee and standardKm when present', () => {
    const { fixture } = buildTestBed({ role: 'ADMIN' }, of(MOCK_LEADS));
    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('350');
    expect(text).toContain('5');
  });

  it('should display ratePerKm when present', () => {
    const { fixture } = buildTestBed({ role: 'ADMIN' }, of(MOCK_LEADS));
    expect(fixture.nativeElement.textContent).toContain('18');
  });

  it('should NOT display enrichment rows for a lead without those fields', () => {
    // MOCK_LEADS[1] has no category/distanceKm/standardFee/ratePerKm
    const legacyOnly: Lead[] = [MOCK_LEADS[1]];
    const { fixture } = buildTestBed({ role: 'ADMIN' }, of(legacyOnly));
    const compiled: HTMLElement = fixture.nativeElement;
    expect(compiled.textContent).not.toContain('FURNITURE');
    // distanceKm / ratePerKm rows absent — no "/km" text
    expect(compiled.textContent).not.toContain('/km');
    // category icon row absent
    expect(compiled.querySelector('i.material-icons + span')).toBeNull();
  });
});
