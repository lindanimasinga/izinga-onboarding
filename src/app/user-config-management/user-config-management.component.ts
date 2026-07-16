import { Component, OnInit } from '@angular/core';
import { IzingaOrderManagementService } from '../service/izinga-order-management.service';
import { AnalyticsService } from '../service/analytics.service';
import { DataType, FieldDefinition, UserConfig } from '../model/user-config';
import { UserProfile } from '../model/userProfile';

@Component({
  selector: 'app-user-config-management',
  templateUrl: './user-config-management.component.html',
  styleUrls: ['./user-config-management.component.css']
})
export class UserConfigManagementComponent implements OnInit {
  userConfigs: UserConfig[] = [];
  selectedUserConfig: UserConfig | null = null;
  isLoading = false;
  isSaving = false;
  errorMessage = '';
  successMessage = '';
  showForm = false;
  isEditMode = false;
  dataTypeEnum = DataType;

  // Form fields
  formData: UserConfig = {
    name: '',
    label: '',
    userRole: UserProfile.RoleEnum.CUSTOMER,
    mandatoryFields: [],
    optionalFields: [],
    hiddenFields: []
  };

  newMandatoryField: FieldDefinition = {
    name: '',
    label: '',
    dataType: DataType.STRING,
    description: ''
  };

  newOptionalField: FieldDefinition = {
    name: '',
    label: '',
    dataType: DataType.STRING,
    description: ''
  };

  newHiddenField: FieldDefinition = {
    name: '',
    label: '',
    dataType: DataType.STRING,
    description: ''
  };

  dataTypes = Object.values(DataType);
  userRoles = Object.values(UserProfile.RoleEnum);

  constructor(
    private izingaOrderService: IzingaOrderManagementService,
    private analytics: AnalyticsService
  ) {}

  ngOnInit(): void {
    this.analytics.logScreenView('user_config_management');
    this.loadUserConfigs();
  }

  loadUserConfigs(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.izingaOrderService.getUserConfig().subscribe(
      (configs) => {
        this.userConfigs = configs;
        this.isLoading = false;
      },
      (error) => {
        this.errorMessage = 'Failed to load user configurations: ' + (error.error?.message || error.message);
        this.isLoading = false;
      }
    );
  }

  selectUserConfig(config: UserConfig): void {
    this.selectedUserConfig = config;
    this.formData = JSON.parse(JSON.stringify(config));
    if (!this.formData.hiddenFields) {
      this.formData.hiddenFields = [];
    }
    this.isEditMode = true;
    this.showForm = true;
  }

  openCreateForm(): void {
    this.selectedUserConfig = null;
    this.isEditMode = false;
    this.showForm = true;
    this.formData = {
      name: '',
      label: '',
      userRole: UserProfile.RoleEnum.CUSTOMER,
      mandatoryFields: [],
      optionalFields: [],
      hiddenFields: []
    };
    this.newMandatoryField = { name: '', label: '', dataType: DataType.STRING, description: '' };
    this.newOptionalField = { name: '', label: '', dataType: DataType.STRING, description: '' };
    this.newHiddenField = { name: '', label: '', dataType: DataType.STRING, description: '' };
    this.errorMessage = '';
    this.successMessage = '';
  }

  closeForm(): void {
    this.showForm = false;
    this.formData = {
      name: '',
      label: '',
      userRole: UserProfile.RoleEnum.CUSTOMER,
      mandatoryFields: [],
      optionalFields: [],
      hiddenFields: []
    };
    this.selectedUserConfig = null;
  }

  addMandatoryField(): void {
    const name = this.newMandatoryField.name?.trim();
    const label = this.newMandatoryField.label?.trim();
    if (name && label) {
      this.formData.mandatoryFields.push({
        ...JSON.parse(JSON.stringify(this.newMandatoryField)),
        name,
        label,
        description: this.newMandatoryField.description?.trim() || ''
      });
      this.newMandatoryField = { name: '', label: '', dataType: DataType.STRING, description: '' };
    }
  }

  removeMandatoryField(index: number): void {
    this.formData.mandatoryFields.splice(index, 1);
  }

  addOptionalField(): void {
    const name = this.newOptionalField.name?.trim();
    const label = this.newOptionalField.label?.trim();
    if (name && label) {
      this.formData.optionalFields.push({
        ...JSON.parse(JSON.stringify(this.newOptionalField)),
        name,
        label,
        description: this.newOptionalField.description?.trim() || ''
      });
      this.newOptionalField = { name: '', label: '', dataType: DataType.STRING, description: '' };
    }
  }

  removeOptionalField(index: number): void {
    this.formData.optionalFields.splice(index, 1);
  }

  addHiddenField(): void {
    const name = this.newHiddenField.name?.trim();
    const label = this.newHiddenField.label?.trim();
    if (name && label) {
      this.formData.hiddenFields.push({
        ...JSON.parse(JSON.stringify(this.newHiddenField)),
        name,
        label,
        description: this.newHiddenField.description?.trim() || ''
      });
      this.newHiddenField = { name: '', label: '', dataType: DataType.STRING, description: '' };
    }
  }

  removeHiddenField(index: number): void {
    this.formData.hiddenFields.splice(index, 1);
  }

  saveUserConfig(): void {
    if (!this.validateForm()) {
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const saveOperation = this.isEditMode
      ? this.izingaOrderService.updateUserConfig(this.selectedUserConfig!.name, this.formData)
      : this.izingaOrderService.createUserConfig(this.formData);

    saveOperation.subscribe(
      (result) => {
        this.isSaving = false;
        this.successMessage = `User configuration "${result.label}" ${this.isEditMode ? 'updated' : 'created'} successfully.`;
        this.loadUserConfigs();
        this.closeForm();
      },
      (error) => {
        this.isSaving = false;
        this.errorMessage = 'Failed to save user configuration: ' + (error.error?.message || error.message);
      }
    );
  }

  deleteUserConfig(config: UserConfig): void {
    if (confirm(`Are you sure you want to delete "${config.label}"?`)) {
      this.isLoading = true;
      this.errorMessage = '';
      this.izingaOrderService.deleteUserConfig(config.name).subscribe(
        () => {
          this.successMessage = `User configuration "${config.label}" deleted successfully.`;
          this.loadUserConfigs();
          if (this.selectedUserConfig?.name === config.name) {
            this.closeForm();
          }
        },
        (error) => {
          this.isLoading = false;
          this.errorMessage = 'Failed to delete user configuration: ' + (error.error?.message || error.message);
        }
      );
    }
  }

  validateForm(): boolean {
    if (!this.formData.name || !this.formData.name.trim()) {
      this.errorMessage = 'Configuration name is required.';
      return false;
    }
    if (!this.formData.label || !this.formData.label.trim()) {
      this.errorMessage = 'Label is required.';
      return false;
    }
    if (this.formData.mandatoryFields.length === 0) {
      this.errorMessage = 'At least one mandatory field is required.';
      return false;
    }

    if (this.formData.mandatoryFields.some(field => !field.name?.trim() || !field.label?.trim())) {
      this.errorMessage = 'All mandatory fields must include a field name and label.';
      return false;
    }

    if (this.formData.optionalFields.some(field => !field.name?.trim() || !field.label?.trim())) {
      this.errorMessage = 'All optional fields must include a field name and label.';
      return false;
    }

    if (this.formData.hiddenFields.some(field => !field.name?.trim() || !field.label?.trim())) {
      this.errorMessage = 'All hidden fields must include a field name and label.';
      return false;
    }

    return true;
  }
}
