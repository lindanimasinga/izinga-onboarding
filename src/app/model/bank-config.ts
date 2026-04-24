export interface BankConfig {
  id: string;
  bankId: string;
  bankName: string;
  branchCode: string;
  switchCode: string;
  date?: string;
  modifiedDate?: string;
  tag?: { [key: string]: any };
}
