export interface QuoteApproval {
    approved: boolean;
    reason?: string;
    orderId: string;
    messengerId: string;
}