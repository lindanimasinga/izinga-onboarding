import { NgModule, isDevMode } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { PhoneVerificationComponent } from './phone-verification/phone-verification.component';
import { FormsModule } from '@angular/forms';
import { IzingaOrderManagementService } from './service/izinga-order-management.service';
import { FirebaseService } from './service/firebase.service';
import { HttpClientModule } from '@angular/common/http';
import { UserInfoComponent } from './user-info/user-info.component';
import { UserUpdateComponent } from './user-update/user-update.component';
import { WelcomeIndivisualsComponent } from './welcome-indivisuals/welcome.component';
import { QRCodeModule } from 'angularx-qrcode';
import { WelcomeBusinessComponent } from './welcome-business/welcome-business.component';
import { WelcomeSelectionComponent } from './welcome/welcome-selection.component';
import { BusinessUpdateComponent } from './business-update/business-update.component';
import { DatePipe, DecimalPipe } from '@angular/common';
import { DashboardComponent } from './dashboard/dashboard.component';
import { StorageService } from './service/storage-service.service';
import { StockItemComponent } from './stock-item/stock-item.component';
import { StockUpdateComponent } from './stock-update/stock-update.component';
import { StoreCardComponent } from './store-card/store-card.component';
import { BusinessesComponent } from './businesses/businesses.component';
import { OrderCardComponent } from './order-card/order-card.component';
import { OrdersComponent } from './orders/orders.component';
import { OrderItemHistoryComponent } from './order-item-history/order-item-history.component';
import { ServiceWorkerModule } from '@angular/service-worker';
import { PayoutComponent } from './payout/payout.component';
import { PayoutCardComponent } from './payout-card/payout-card.component';
import { PayoutDetailsComponent } from './payout-details/payout-details.component';
import { PayoutOdersComponent } from './payout-oders/payout-oders.component';
import { PlaceAutocompleteComponent } from './place-autocomplete/place-autocomplete.component';
import { TermsConditionsComponent } from './terms-conditions/terms-conditions.component';
import { PendingApprovalsComponent } from './pending-approvals/pending-approvals.component';
import { RestrictedRegionsComponent } from './restricted-regions/restricted-regions.component';
import { AddRestrictedRegionComponent } from './add-restricted-region/add-restricted-region.component';
import { MessangerOrderComponent } from './quote-approval/quote-approval.component';
import { MessangerOrdersComponent } from './messanger-orders/messanger-orders.component';
import { ChatSessionsComponent } from './chat-sessions/chat-sessions.component';
import { SignupWelcomeComponent } from './signup-welcome/signup-welcome.component';

@NgModule({
  declarations: [
    AppComponent,
    PhoneVerificationComponent,
    UserInfoComponent,
    UserUpdateComponent,
    WelcomeIndivisualsComponent,
    WelcomeSelectionComponent,
    WelcomeBusinessComponent,
    BusinessUpdateComponent,
    DashboardComponent,
    StockItemComponent,
    StockUpdateComponent,
    StoreCardComponent,
    BusinessesComponent,
    OrderCardComponent,
    OrdersComponent,
    OrderItemHistoryComponent,
    PayoutComponent,
    PayoutCardComponent,
    PayoutDetailsComponent,
    PayoutOdersComponent,
    PlaceAutocompleteComponent,
    TermsConditionsComponent,
    PendingApprovalsComponent,
    RestrictedRegionsComponent,
    AddRestrictedRegionComponent,
    MessangerOrderComponent,
    MessangerOrdersComponent,
    ChatSessionsComponent,
    SignupWelcomeComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    HttpClientModule,
    QRCodeModule,
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: !isDevMode(),
      // Register the ServiceWorker as soon as the application is stable
      // or after 30 seconds (whichever comes first).
      registrationStrategy: 'registerWhenStable:30000'
    })
  ],
  providers: [
    IzingaOrderManagementService,
    FirebaseService,
    StorageService,
    DatePipe,
    DecimalPipe
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
