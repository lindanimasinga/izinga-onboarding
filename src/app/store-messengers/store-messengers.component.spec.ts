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
      ['getAllMessengersForStore', 'getCustomerByPhoneNumber', 'registerCustomer', 'deleteUser']
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

  describe('checkAndAddDriver() — phase 1 lookup', () => {
    beforeEach(() => {
      component.storeId = 'store-abc';
      fixture.detectChanges();
    });

    it('shows an info-only message and does not auto-link when a profile already exists', () => {
      orderSvc.getCustomerByPhoneNumber.and.returnValue(of({ id: 'existing-1', role: 'MESSENGER', mobileNumber: '0821234567' } as any));
      component.newDriverMobileNumber = '0821234567';

      component.checkAndAddDriver();

      expect(component.duplicateFoundMessage).toContain('Profile exists');
      expect(component.showCreateForm).toBeFalse();
      expect(orderSvc.registerCustomer).not.toHaveBeenCalled();
    });

    it('shows the create-new-driver form when no profile is found', () => {
      orderSvc.getCustomerByPhoneNumber.and.returnValue(throwError(() => ({ status: 404 })));
      component.newDriverMobileNumber = '0827654321';

      component.checkAndAddDriver();

      expect(component.showCreateForm).toBeTrue();
    });
  });

  describe('createNewDriver() — phase 2 create', () => {
    beforeEach(() => {
      component.storeId = 'store-abc';
      fixture.detectChanges();
      component.newDriverName = 'Jane';
      component.newDriverSurname = 'Doe';
      component.newDriverMobileNumber = '0821234567';
    });

    it('creates a MESSENGER-role driver tagged with this storeId — not driverAdminId or messengerAdminId', () => {
      orderSvc.registerCustomer.and.returnValue(of({ id: 'new-driver-1', name: 'Jane' } as any));

      component.createNewDriver();

      expect(orderSvc.registerCustomer).toHaveBeenCalled();
      const posted = orderSvc.registerCustomer.calls.mostRecent().args[0];
      expect(posted.role).toBe('MESSENGER' as any);
      expect(posted.tag).toEqual({ storeId: 'store-abc' });
      expect(posted.tag!['driverAdminId']).toBeUndefined();
      expect(posted.tag!['messengerAdminId']).toBeUndefined();
    });

    it('shows an error and does not call registerCustomer when storeId is missing', () => {
      component.storeId = undefined;

      component.createNewDriver();

      expect(orderSvc.registerCustomer).not.toHaveBeenCalled();
      expect(component.createErrorMessage).toContain('Store not found');
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
  });
});
