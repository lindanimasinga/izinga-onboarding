/**
 * User Configuration Models
 * Models for user configuration and service type definitions
 */

import { UserProfile } from "./models";

export enum DataType {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
  DATE = 'DATE',
  ENUM = 'ENUM',
  DOCUMENT_URL = 'DOCUMENT_URL'
}

export interface FieldDefinition {
  name: string;
  label: string;
  dataType: DataType;
  description?: string;
}

export interface UserConfig {
    name: string;
    label: string;
    userRole: UserProfile.RoleEnum;
    mandatoryFields: FieldDefinition[];
    optionalFields: FieldDefinition[];
    /** Fields that are never rendered on the onboarding form but still travel with the
     *  profile payload — e.g. set programmatically from document extraction rather than
     *  typed by the user. */
    hiddenFields: FieldDefinition[];
}

// Predefined service type names for type safety
export enum ServiceTypeName {
  DELIVERY_DRIVER = 'DELIVERY_DRIVER',
  CAB_DRIVER = 'CAB_DRIVER',
  BARBER = 'BARBER',
  HAIRSTYLIST = 'HAIRSTYLIST',
  CAR_GUARD = 'CAR_GUARD',
  PROMOTER = 'PROMOTER',
  RESELLER = 'RESELLER',
  PLUMBER = 'PLUMBER',
  ELECTRICIAN = 'ELECTRICIAN',
  BUILDER = 'BUILDER',
  OTHER = 'OTHER'
}

// Helper interface for form field rendering
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'file' | 'textarea';
  required: boolean;
  description?: string;
  placeholder?: string;
  options?: string[];
}