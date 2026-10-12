import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';

import { StoreMessengersComponent } from './store-messengers.component';
import { IzingaOrderManagementService } from '../service/izinga-order-management.service';
import { AnalyticsService } from '../service/analytics.service';

describe('StoreMessengersComponent', () => {
  let component: StoreMessengersComponent;
  let fixture: ComponentFixture<StoreMessengersComponent>;
  let orderSvc: jasmine.SpyObj<IzingaOrderManagementService>;

  beforeEach(() => {
    orderSvc = jasmine.createSpyObj<IzingaOrderManagementService>(
      'IzingaOrderManagementService',
      ['getAllMessengersForStore', 'inviteDriverToStore', 'deleteUser']
    );
    orderSvc.getAllMessengersForStore.and.returnValue(of([]));

    const analyticsSvc = jasmine.createSpyObj<AnalyticsService>('AnalyticsService', ['logScreenView', 'logEvent']);

    TestBed.configureTestingModule({
      declarations: [StoreMessengersComponent],
      imports: [FormsModule],
      providers: [
        { provide: IzingaOrderManagementService, useValue: orderSvc },
        { provide: AnalyticsService, useValue: analyticsSvc }
      ]
    });

    fixture = TestBed.createComponent(StoreMessengersComponent);
    component = fixture.componentInstance;
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  describe('loading drivers', () => {
    it('does not call getAllMessengersForStore and shows a save-profile message when storeId is undefined', () => {
      component.storeId = undefined;
      fixture.detectChanges();

      expect(orderSvc.getAllMessengersForStore).not.toHaveBeenCalled();
      expect(component.errorMessage).toBe('Save your business profile first to manage drivers.');
      expect(component.isLoading).toBeFalse();
    });

    it('loads drivers for the given storeId on init when storeId is already set', () => {
      const drivers = [{ id: 'driver-1', name: 'Driver One' }] as any;
      orderSvc.getAllMessengersForStore.and.returnValue(of(drivers));
      component.storeId = 'store-abc';

      fixture.detectChanges();

      expect(orderSvc.getAllMessengersForStore).toHaveBeenCalledWith('store-abc');
      expect(component.drivers).toEqual(drivers);
      expect(component.isLoading).toBeFalse();
    });

    it('loads drivers when storeId transitions from undefined to a real value via ngOnChanges', () => {
      component.storeId = undefined;
      fixture.detectChanges();
      expect(orderSvc.getAllMessengersForStore).not.toHaveBeenCalled();

      component.storeId = 'store-abc';
      component.ngOnChanges({
        storeId: { currentValue: 'store-abc', previousValue: undefined, firstChange: false, isFirstChange: () => false }
      });

      expect(orderSvc.getAllMessengersForStore).toHaveBeenCalledWith('store-abc');
    });

    it('sets an error message when the load fails', () => {
      orderSvc.getAllMessengersForStore.and.returnValue(throwError(() => new Error('network error')));
      component.storeId = 'store-abc';

      fixture.detectChanges();

      expect(component.errorMessage).toBe('Unable to load drivers at the moment.');
      expect(component.isLoading).toBeFalse();
    });
  });

  // INVITE-DRV-01 / T-03: the old two-phase checkAndAddDriver() / createNewDriver() API was
  // removed. The component now calls a single POST /store/{storeId}/invite endpoint via
  // inviteDriverToStore(). Tests below cover all five outcomes and the validation guards.

  describe('sendInvite() — single-call invite form (AC-01 through AC-06)', () => {
    beforeEach(() => {
      component.storeId = 'store-abc';
      fixture.detectChanges();
      component.newDriverMobileNumber = '0821234567';
    });

    it('makes exactly one HTTP call to inviteDriverToStore — no preliminary phone lookup (AC-06)', () => {
      orderSvc.inviteDriverToStore.and.returnValue(of({ outcome: 'INVITED' }));
      component.sendInvite();
      expect(orderSvc.inviteDriverToStore).toHaveBeenCalledTimes(1);
    });

    it('shows "Driver added to your team." and reloads drivers on CREATED outcome (AC-01)', () => {
      orderSvc.inviteDriverToStore.and.returnValue(of({ outcome: 'CREATED' }));
      component.sendInvite();
      expect(component.inviteResultMessage).toContain('Driver added to your team');
      expect(component.inviteResultType).toBe('success');
      // CREATED triggers a driver list reload (regression guard — list must refresh)
      expect(orderSvc.getAllMessengersForStore).toHaveBeenCalled();
    });

    it('shows "already on your team" message on ALREADY_LINKED outcome (AC-02)', () => {
      orderSvc.inviteDriverToStore.and.returnValue(of({ outcome: 'ALREADY_LINKED' }));
      component.sendInvite();
      expect(component.inviteResultMessage).toContain('already on your team');
      expect(component.inviteResultType).toBe('info');
    });

    it('shows invite-sent message on INVITED outcome (AC-03)', () => {
      orderSvc.inviteDriverToStore.and.returnValue(of({ outcome: 'INVITED' }));
      component.sendInvite();
      expect(component.inviteResultMessage.length).toBeGreaterThan(0);
      expect(component.inviteResultType).toBe('success');
    });

    it('shows "already working with another team" on 409 CONFLICT (AC-05)', () => {
      orderSvc.inviteDriverToStore.and.returnValue(throwError(() => ({ status: 409 })));
      component.sendInvite();
      expect(component.inviteResultMessage).toContain('already working with another team');
      expect(component.inviteResultType).toBe('warning');
    });

    it('shows a validation message and does not call the service when mobile number is empty', () => {
      component.newDriverMobileNumber = '';
      component.sendInvite();
      expect(orderSvc.inviteDriverToStore).not.toHaveBeenCalled();
      expect(component.inviteResultMessage).toContain('mobile number');
    });

    it('shows "Store not found" and does not call the service when storeId is missing', () => {
      component.storeId = undefined;
      component.sendInvite();
      expect(orderSvc.inviteDriverToStore).not.toHaveBeenCalled();
      expect(component.inviteResultMessage).toContain('Store not found');
    });

    it('resets isSendingInvite to false after a service error', () => {
      orderSvc.inviteDriverToStore.and.returnValue(throwError(() => ({ status: 500 })));
      component.sendInvite();
      expect(component.isSendingInvite).toBeFalse();
    });
  });

  describe('removeDriver()', () => {
    beforeEach(() => {
      component.storeId = 'store-abc';
      fixture.detectChanges();
      component.drivers = [{ id: 'driver-1', name: 'Driver One' } as any];
    });

    it('removes the driver from the local list on success', () => {
      orderSvc.deleteUser.and.returnValue(of({}));

      component.removeDriver({ id: 'driver-1', name: 'Driver One' } as any);

      expect(orderSvc.deleteUser).toHaveBeenCalledWith('driver-1');
      expect(component.drivers.length).toBe(0);
      expect(component.successMessage).toContain('removed');
    });

    it('sets an error message and does not call deleteUser when the driver has no id', () => {
      component.removeDriver({ name: 'No Id Driver' } as any);

      expect(orderSvc.deleteUser).not.toHaveBeenCalled();
      expect(component.errorMessage).toBe('Unable to remove driver: ID not found.');
    });

    it('sets an error message and keeps the driver in the list when deleteUser fails', () => {
      orderSvc.deleteUser.and.returnValue(throwError(() => ({ error: { message: 'server error' } })));

      component.removeDriver({ id: 'driver-1', name: 'Driver One' } as any);

      expect(component.errorMessage).toBe('Failed to remove driver: server error');
      expect(component.isRemovingDriver['driver-1']).toBeFalse();
      expect(component.drivers.length).toBe(1);
    });
  });
});
