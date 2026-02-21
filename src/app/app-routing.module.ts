import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
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
import { PayoutDetailsComponent } from './payout-details/payout-details.component';
import { PayoutOdersComponent } from './payout-oders/payout-oders.component';
import { TermsConditionsComponent } from './terms-conditions/terms-conditions.component';
import { PendingApprovalsComponent } from './pending-approvals/pending-approvals.component';
import { RestrictedRegionsComponent } from './restricted-regions/restricted-regions.component';
import { AddRestrictedRegionComponent } from './add-restricted-region/add-restricted-region.component';

const routes: Routes = [
  { path: '', component: WelcomeSelectionComponent}, 
  { path: 'indivisuals', 
    children : [
      { path: '', component: WelcomeIndivisualsComponent}, 
      { path: 'verify', component: PhoneVerificationComponent}, 
      { path: 'dashboard', component: DashboardComponent}, 
      { path: 'card', component: UserInfoComponent }, 
      { path: 'user', component: UserUpdateComponent},
      { path: 'payout', component: PayoutComponent},
      { path: 'payout-details', component: PayoutDetailsComponent},
      { path: 'payout-orders', component: PayoutOdersComponent},
      { path: 'pending-approvals', component: PendingApprovalsComponent},
      { path: 'restricted-regions', component: RestrictedRegionsComponent},
      { path: 'add-restricted-region', component: AddRestrictedRegionComponent},
      { path: 'add-restricted-region/:id', component: AddRestrictedRegionComponent},
      { path: 'terms/:id', component: TermsConditionsComponent},
      { path: 'info', component: UserInfoComponent}
    ]},
  { path: 'business',
    children : [
      { path: '', component: WelcomeBusinessComponent}, 
      { path: 'verify', component: PhoneVerificationComponent}, 
      { path: 'dashboard', component: DashboardComponent}, 
      { path: 'card', component: UserInfoComponent }, 
      { path: 'user', component: UserUpdateComponent},
      { path: 'payout', component: PayoutComponent},
      { path: 'payout-details', component: PayoutDetailsComponent},
      { path: 'payout-orders', component: PayoutOdersComponent},
      { path: 'pending-approvals', component: PendingApprovalsComponent},
      { path: 'restricted-regions', component: RestrictedRegionsComponent},
      { path: 'add-restricted-region', component: AddRestrictedRegionComponent},
      { path: 'add-restricted-region/:id', component: AddRestrictedRegionComponent},
      { path: 'terms/:id', component: TermsConditionsComponent},
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
