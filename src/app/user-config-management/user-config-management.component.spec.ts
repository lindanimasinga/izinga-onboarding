import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { UserConfigManagementComponent } from './user-config-management.component';
import { IzingaOrderManagementService } from '../service/izinga-order-management.service';
import { AnalyticsService } from '../service/analytics.service';

describe('UserConfigManagementComponent', () => {
  let component: UserConfigManagementComponent;
  let fixture: ComponentFixture<UserConfigManagementComponent>;
  let mockIzingaOrderService: jasmine.SpyObj<IzingaOrderManagementService>;
  let mockAnalyticsService: jasmine.SpyObj<AnalyticsService>;

  beforeEach(async () => {
    mockIzingaOrderService = jasmine.createSpyObj('IzingaOrderManagementService', [
      'getUserConfig',
      'createUserConfig',
      'updateUserConfig',
      'deleteUserConfig'
    ]);
    mockAnalyticsService = jasmine.createSpyObj('AnalyticsService', ['logScreenView']);

    await TestBed.configureTestingModule({
      declarations: [ UserConfigManagementComponent ],
      imports: [ FormsModule, HttpClientTestingModule ],
      providers: [
        { provide: IzingaOrderManagementService, useValue: mockIzingaOrderService },
        { provide: AnalyticsService, useValue: mockAnalyticsService }
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UserConfigManagementComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should log screen view on init', () => {
    mockIzingaOrderService.getUserConfig.and.returnValue(
      { subscribe: (callback: any) => callback([]) } as any
    );
    fixture.detectChanges();
    expect(mockAnalyticsService.logScreenView).toHaveBeenCalledWith('user_config_management');
  });
});
