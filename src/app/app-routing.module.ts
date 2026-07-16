import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PhoneVerifiedGuard } from './guards/phone-verified.guard';
import { AppComponent } from './app.component';
import { PhoneVerificationComponent } from './phone-verification/phone-verification.component';
import { UserInfoComponent } from './user-info/user-info.component';
import { UserUpdateComponent } from './user-update/user-update.component';
import { WelcomeIndivisualsComponent } from './welcome-indivisuals/welcome.component';
import { WelcomeBusinessComponent } from './welcome-business/welcome-business.component';
import { WelcomeSelectionComponent } from './welcome/welcome-selection.component';
import { BusinessUpdateComponent } from './business-update/business-update.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { StockUpdateComponent } from './stock-update/stock-update.component';
import { BusinessesComponent } from './businesses/businesses.component';
import { OrdersComponent } from './orders/orders.component';
import { OrderItemHistoryComponent } from './order-item-history/order-item-history.component';
import { PayoutComponent } from './payout/payout.component';
import { MessengerPayoutComponent } from './messenger-payout/messenger-payout.component';
import { PayoutDetailsComponent } from './payout-details/payout-details.component';
import { PayoutOdersComponent } from './payout-oders/payout-oders.component';
import { TermsConditionsComponent } from './terms-conditions/terms-conditions.component';
import { PendingApprovalsComponent } from './pending-approvals/pending-approvals.component';
import { RestrictedRegionsComponent } from './restricted-regions/restricted-regions.component';
import { AddRestrictedRegionComponent } from './add-restricted-region/add-restricted-region.component';
import { MessangerOrderComponent } from './quote-approval/quote-approval.component';
import { MessangerOrdersComponent } from './messanger-orders/messanger-orders.component';
import { ChatSessionsComponent } from './chat-sessions/chat-sessions.component';
import { SignupWelcomeComponent } from './signup-welcome/signup-welcome.component';
import { PrivacyPolicyComponent } from './privacy-policy/privacy-policy.component';
import { LegalInfoComponent } from './legal-info/legal-info.component';
import { UserManagementComponent } from './user-management/user-management.component';
import { TeamMessengersComponent } from './team-messengers/team-messengers.component';
import { TeamDeliveriesComponent } from './team-deliveries/team-deliveries.component';
import { UserConfigManagementComponent } from './user-config-management/user-config-management.component';
import { AdminOrdersComponent } from './admin-orders/admin-orders.component';
import { QuotesComponent } from './quotes/quotes.component';
import { AmbassadorQrComponent } from './ambassador-qr/ambassador-qr.component';
import { ReferralPartnerEnrollmentComponent } from './referral-partner-enrollment/referral-partner-enrollment.component';
import { ReferralPartnerDashboardComponent } from './referral-partner-dashboard/referral-partner-dashboard.component';

const routes: Routes = [
  { path: '', component: WelcomeSelectionComponent},
  { path: 'ambassador/qr', component: AmbassadorQrComponent },
  { path: 'referral-partner/enroll', component: ReferralPartnerEnrollmentComponent },
  { path: 'indivisuals', 
    children : [
      { path: '', component: WelcomeIndivisualsComponent}, 
      { path: 'verify', component: PhoneVerificationComponent}, 
      { path: 'dashboard', component: DashboardComponent}, 
      { path: 'card', component: UserInfoComponent }, 
      { path: 'user', component: UserUpdateComponent, canActivate: [PhoneVerifiedGuard] },
      { path: 'payout', component: MessengerPayoutComponent},
      { path: 'payout-details', component: PayoutDetailsComponent},
      { path: 'payout-orders', component: PayoutOdersComponent},
      { path: 'pending-approvals', component: PendingApprovalsComponent},
      { path: 'restricted-regions', component: RestrictedRegionsComponent},
      { path: 'add-restricted-region', component: AddRestrictedRegionComponent},
      { path: 'add-restricted-region/:id', component: AddRestrictedRegionComponent},
      { path: 'quote-approval/:orderId', component: MessangerOrderComponent },
      { path: 'orders', component: MessangerOrdersComponent },
      { path: 'chat-sessions', component: ChatSessionsComponent },
      { path: 'signup-welcome/:id', component: SignupWelcomeComponent },
      { path: 'terms/:id', component: TermsConditionsComponent},
      { path: 'privacy-policy', component: PrivacyPolicyComponent},
      { path: 'legal-info', component: LegalInfoComponent},
      { path: 'user-management', component: UserManagementComponent},
      { path: 'team-messengers', component: TeamMessengersComponent},
      { path: 'team-deliveries', component: TeamDeliveriesComponent},
      { path: 'user-config-management', component: UserConfigManagementComponent},
      { path: 'admin-orders', component: AdminOrdersComponent},
      { path: 'quotes', component: QuotesComponent},
      { path: 'info', component: UserInfoComponent},
      { path: 'rp-dashboard', component: ReferralPartnerDashboardComponent}
    ]},
  { path: 'business',
    children : [
      { path: '', component: WelcomeBusinessComponent}, 
      { path: 'verify', component: PhoneVerificationComponent}, 
      { path: 'dashboard', component: DashboardComponent}, 
      { path: 'card', component: UserInfoComponent },
      { path: 'user', component: UserUpdateComponent, canActivate: [PhoneVerifiedGuard] },
      { path: 'payout', component: PayoutComponent},
      { path: 'payout-details', component: PayoutDetailsComponent},
      { path: 'payout-orders', component: PayoutOdersComponent},
      { path: 'pending-approvals', component: PendingApprovalsComponent},
      { path: 'restricted-regions', component: RestrictedRegionsComponent},
      { path: 'add-restricted-region', component: AddRestrictedRegionComponent},
      { path: 'add-restricted-region/:id', component: AddRestrictedRegionComponent},
      { path: 'orders', component: MessangerOrdersComponent },
      { path: 'chat-sessions', component: ChatSessionsComponent },
      { path: 'signup-welcome/:id', component: SignupWelcomeComponent },
      { path: 'terms/:id', component: TermsConditionsComponent},
      { path: 'privacy-policy', component: PrivacyPolicyComponent},
      { path: 'legal-info', component: LegalInfoComponent},
      { path: 'user-management', component: UserManagementComponent},
      { path: 'user-config-management', component: UserConfigManagementComponent},
      { path: 'admin-orders', component: AdminOrdersComponent},
      { path: 'quotes', component: QuotesComponent},
      { path: 'info/:id', component: BusinessUpdateComponent},
      { path: 'info', component: BusinessUpdateComponent},
      { path: 'list', component: BusinessesComponent},
      { path: 'info/:businessId/stock/:stockId', component: StockUpdateComponent},
      { path: 'info/:businessId/stock', component: StockUpdateComponent},
      { path: 'info/:businessId/order', component: OrdersComponent},
      { path: 'info/:businessId/order/:orderId', component: OrderItemHistoryComponent}
    ]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
