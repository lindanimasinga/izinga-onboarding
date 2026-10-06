import { Component, OnDestroy, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { UserProfile } from '../model/models';
import { IzingaOrderManagementService } from '../service/izinga-order-management.service';
import { ActivatedRoute, Route, Router } from '@angular/router';

import { map, mergeMap, catchError, flatMap } from 'rxjs/operators';
import { from, Observable, of, throwError } from 'rxjs';
import { Category, StoreProfile } from '../model/storeProfile';
import { Stock } from '../model/stock';
import { BusinessHours } from '../model/businessHours';
import { Bank } from '../model/bank';
import { BankConfig } from '../model/bank-config';
import { StorageService } from '../service/storage-service.service';
import { AnalyticsService } from '../service/analytics.service';
import { FixedBarService } from '../service/fixed-bar.service';
import { FirebaseService } from '../service/firebase.service';

// FIX-02: canonical day order used to initialise closed state and guard last-open-day
const ALL_DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

@Component({
  selector: 'app-business-update',
  templateUrl: './business-update.component.html',
  styleUrls: ['./business-update.component.css']
})
export class BusinessUpdateComponent implements OnInit, OnDestroy {

  previewVehicleType: 'BIKE' | 'CAR' | 'BAKKIE' | 'TRUCK' = 'CAR';
  shop: StoreProfile = {
    name: '',
    description: '',
    businessHours: [
      { day: 'MONDAY', open: new Date(), close: new Date() },
      { day: 'TUESDAY', open: new Date(), close: new Date() },
      { day: 'WEDNESDAY', open: new Date(), close: new Date() },
      { day: 'THURSDAY', open: new Date(), close: new Date() },
      { day: 'FRIDAY', open: new Date(), close: new Date() },
      { day: 'SATURDAY', open: new Date(), close: new Date() },
      { day: 'SUNDAY', open: new Date(), close: new Date() }
    ] as BusinessHours[],
    rates: {
      standardDeliveryPrice: 0,
      standardDeliveryKm: 0,
      standardDeliveryPriceBike: 0,
      standardDeliveryPriceCar: 0,
      standardDeliveryPriceBakkie: 0,
      standardDeliveryPriceTruck: 0,
      ratePerKmBike: 0,
      ratePerKmCar: 0,
      ratePerKmBakkie: 0,
      ratePerKmTruck: 0,
      ratePerKm: 0,
      ratePerVolumeCM2: 0,
      ratePerWeightKg: 0,
      labourRatePerFloor: 0
    },
    // Initialise bank to an empty-but-defined object so the Payout Bank Account
    // section in the template (guarded by *ngIf="shop.bank") always renders,
    // even before ngOnInit's async calls (getStoreById, loadBankConfigs) resolve
    // and even when the merchant's user profile has no bank saved (Profile.bank
    // defaults to null on fresh signup per izinga-commons Profile.kt line 30).
    // prePopulateStoreBankIfNeeded() will overwrite this with real data once it loads.
    bank: { type: 'CHEQUE' as any, name: '', accountId: '', branchCode: '', phone: '' }
  }

  stockList: Stock[] = [];
  storeId?: string| null;
  categories = new Set<string | undefined>()
  // REQ-07: per-day closed state (keyed by DayEnum string)
  businessHoursClosed: { [day: string]: boolean } = {};
  /** NOTE-02: per-category accordion open state; defaults to open (true). */
  accordionOpenStates: { [key: string]: boolean } = {};
  selectedFile: File | null = null;
  userId: string | undefined
  previewWeightKg = 2;
  previewFloors = 0;

  // --- Issue #11/#12: Delivery category management ---
  /** Working copy of the store's delivery categories. */
  deliveryCategories: Category[] = [];
  /** Tracks which category row is in add-field editing mode. */
  newCategoryName = '';
  categoryValidationError = '';
  /** Per-category upload state: maps category id to upload-in-progress flag. */
  categoryUploading: { [id: string]: boolean } = {};
  /** Per-category image load error flag for placeholder fallback. */
  categoryImageError: { [id: string]: boolean } = {};

  // --- Store bank account ---
  /** Available bank configurations loaded from /bank/config/all. */
  bankConfigs: BankConfig[] = [];
  /** The BankConfig entry currently selected in the store's bank name dropdown. */
  selectedStoreBankConfig?: BankConfig;
  /** True when the merchant submits with BANK_ACC type but a blank Account Number. */
  showStoreBankAccountNumberError = false;


  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private izingaOrderManagementService: IzingaOrderManagementService,
    private datePipe: DatePipe,
    private storageService: StorageService,
    private analytics: AnalyticsService,
    private fixedBarService: FixedBarService,
    private firebaseService: FirebaseService
  ) {}

  ngOnInit(): void {
    // FAIL-01: use FixedBarService counter so router-transition order does not strip the class.
    this.fixedBarService.acquire();
    this.analytics.logScreenView('store_menu');
    this.loadBankConfigs();
    // Get the store ID from the route parameters
    this.route.params.subscribe(params => {
      this.izingaOrderManagementService.getStoreById(params['id'])
      .subscribe({
        next: store => {
          this.shop = store
          this.categories = new Set(this.shop?.stockList?.sort((a, b) => this.isPromotion(a) ? -1 : 1).map(stk => stk.group))
          this.stockList = this.shop.stockList!
          // FIX-02: initialise closed state from days absent in the backend response.
          // Any DayOfWeek absent from businessHours is treated as closed by the backend
          // (StoreProfile.isStoreOffline). We add a placeholder entry (disabled in UI)
          // so the row is always rendered; buildPayloadHours() excludes closed days.
          this.initBusinessHoursClosed();
          // Issue #11: initialise delivery categories — treat missing as empty
          this.deliveryCategories = this.shop.categories ? [...this.shop.categories] : [];
          console.log('Store details fetched successfully:', this.shop);
          if (this.shop.rates == undefined) {
            this.shop.rates = {
              standardDeliveryPrice: 0,
              standardDeliveryKm: 0,
              ratePerKmBike: 0,
              ratePerKmCar: 0,
              ratePerKmBakkie: 0,
              ratePerKmTruck: 0,
              ratePerKm: 0,
              ratePerVolumeCM2: 0,
              ratePerWeightKg: 0,
              labourRatePerFloor: 0,
              standardDeliveryPriceBike: 0,
              standardDeliveryPriceCar: 0,
              standardDeliveryPriceBakkie: 0,
              standardDeliveryPriceTruck: 0,
            }
          }
          // Pre-populate store bank from the owner's user profile when the store
          // has no bank of its own (e.g. first load of an existing store that was
          // created before store-level bank capture was added).
          this.prePopulateStoreBankIfNeeded();
        },
        error: () => {
          // getStoreById 404/error means this is a NEW merchant with no store yet.
          // Pre-populate the store's bank section from their user profile so they
          // don't have to re-enter details they already provided.
          this.prePopulateStoreBankIfNeeded();
        }
      })
    })
  }

  formatTime(date?: Date): string | null {
    // Convert Date object to a time string in the format of "HH:MM"
    return date ? this.datePipe.transform(date, 'HH:mm') : '';
  }

  updateTime(hours: BusinessHours, event: string, type: 'open' | 'close'): void {
    // Update the open or close time in the BusinessHours array with the selected time
    const timeParts = event.split(':');
    const updatedDate = new Date();
    updatedDate.setHours(+timeParts[0], +timeParts[1], 0); // Set hours, minutes, and reset seconds
    hours[type] = updatedDate;
  }

  // REQ-07: copy Monday open/close to all other days
  applyMondayToAll(): void {
    const monday = this.shop.businessHours?.find(h => h.day === 'MONDAY');
    if (!monday) { return; }
    this.shop.businessHours?.forEach(h => {
      if (h.day !== 'MONDAY') {
        h.open = monday.open;
        h.close = monday.close;
      }
    });
  }

  ngOnDestroy(): void {
    this.fixedBarService.release();
  }

  // FIX-02: mark days absent from the backend response as closed; add placeholder entries
  // so the template can render a disabled row for each of the 7 canonical days.
  initBusinessHoursClosed(): void {
    const presentDays = new Set((this.shop.businessHours ?? []).map(h => h.day as string));
    ALL_DAYS.forEach(day => {
      if (!presentDays.has(day)) {
        this.businessHoursClosed[day] = true;
        // Add a placeholder entry with default times (will be excluded from payload)
        const d09 = new Date(); d09.setHours(9, 0, 0, 0);
        const d17 = new Date(); d17.setHours(17, 0, 0, 0);
        this.shop.businessHours = [...(this.shop.businessHours ?? []), { day: day as any, open: d09, close: d17 }];
      }
    });
  }

  // FIX-02: build the outgoing businessHours payload — omit closed days entirely.
  // Backend contract: BusinessHours(day: DayOfWeek, open: Date, close: Date) — non-nullable.
  // A day absent from the array is treated as closed by isStoreOffline().
  buildPayloadHours(): BusinessHours[] {
    return (this.shop.businessHours ?? []).filter(h => !this.businessHoursClosed[h.day as string]);
  }

  // REQ-07 guard: returns true when the given day is the only remaining open day.
  // Used to disable the Closed checkbox so the user cannot close all 7 days.
  isLastOpenDay(day: string): boolean {
    const openDays = ALL_DAYS.filter(d => !this.businessHoursClosed[d]);
    return openDays.length === 1 && openDays[0] === day;
  }

  // REQ-07: toggle closed state per day.
  // FIX-02: never mutate open/close to undefined — buildPayloadHours() excludes closed days.
  // Last-open-day guard: prevent the user from closing all 7 days (@NotEmpty on backend).
  toggleDayClosed(day: string): void {
    const willClose = !this.businessHoursClosed[day];
    if (willClose) {
      const openCount = ALL_DAYS.filter(d => !this.businessHoursClosed[d]).length;
      if (openCount <= 1) { return; } // guard: at least one day must remain open
    }
    this.businessHoursClosed[day] = willClose;
    if (!willClose) {
      // Re-opening: ensure the entry has valid Date values (never undefined).
      const existing = this.shop.businessHours?.find(h => h.day === day);
      if (existing && (!existing.open || !existing.close)) {
        const monday = this.shop.businessHours?.find(h => h.day === 'MONDAY' && !this.businessHoursClosed['MONDAY']);
        existing.open = monday?.open ?? new Date(new Date().setHours(9, 0, 0, 0));
        existing.close = monday?.close ?? new Date(new Date().setHours(17, 0, 0, 0));
      }
    }
  }

  // Fetch store details using the store ID
  fetchStoreDetails(storeId: string): void {
    this.izingaOrderManagementService.getStoreById(storeId).
    subscribe(
      data => {
        this.shop = data;
        this.stockList = data.stockList!
        console.log('Store details fetched successfully:', data);
      },
      (error) => {
        console.error('Error fetching store details:', error);
      }
    );
  }

  // Add a new stock item to the list
  addStockItem() {
    const newStockItem: Stock = {
      name: '',
      description: '',
      detailedDescription: '',
      price: 0,
      quantity: 0,
      images: [],
      mandatorySelection: [],
      optionalSelection: [],
      group: 'Items' // Default group if none is specified
    };
    this.stockList.push(newStockItem);
  }

  removeStockItem(stockItem: Stock) {
    const index = this.stockList.indexOf(stockItem);
    if (index > -1) {
      this.stockList.splice(index, 1);
    }
  }

  // Register the business and stock items
  registerBusinessAndStock() {

    if (this.shop.featuredExpiry == undefined) {
      this.shop.featuredExpiry = new Date()
    }

    if (!this.shop.ownerId) {
      console.log(`setting store owner id to ${this.storageService?.userProfile?.id}`);
      this.shop.ownerId = this.storageService.userProfile?.id

      // RP-005b: attach referral code on new store creation only.
      // The ref value was captured from ?ref= at the /business entry point and
      // stored in sessionStorage. Clear it after attaching to prevent double-attribution.
      const rpRef = this.storageService.referralPartnerRef;
      if (rpRef) {
        this.shop.referralCode = rpRef;
        this.storageService.referralPartnerRef = null;
      }
    }

    // Bug #12 fix: recalculate shortName on every NEW-store attempt, not just the first.
    // Previously this lived inside the !ownerId block above, which only runs once —
    // ownerId is set client-side on the first attempt regardless of whether the HTTP
    // call succeeds, so on any retry within the same page load the entire block was
    // skipped and shortName was frozen at the first-attempt value even after the
    // merchant corrected the business name.
    // !shop.id is the correct predicate: it stays falsy for all retries within a single
    // page load because the component never writes data.id back on the new-store path
    // (a successful creation navigates away; a failed one leaves id undefined).
    // Updates (shop.id already truthy from ngOnInit) are correctly excluded.
    if (!this.shop.id) {
      this.shop.shortName = this.replaceSpecialChars(this.shop.name);
    }

    // Issue #11: always send the full categories array to the backend
    this.syncCategoriesToShop();

    // FIX-02: omit closed days from payload — backend contract requires non-nullable open/close;
    // absent days are treated as closed by isStoreOffline(). Restore on error so UI is consistent.
    const originalHours = this.shop.businessHours;
    this.shop.businessHours = this.buildPayloadHours();

    // Bank account number validation: the store form now captures a bank section
    // (pre-populated from the merchant's user profile but independently editable).
    // When the merchant has selected a bank account type (not EWALLET) the account
    // number is required — the backend StoreService.validateBankForCreate() will
    // reject a blank accountId with 400 {"error":"Bank account ID is required"}.
    // Validate here so the error is surfaced inline rather than from a failed POST.
    // Only applies to NEW stores (shop.id falsy); updates may already have a valid bank.
    this.showStoreBankAccountNumberError = false;
    if (!this.shop.id && this.shop.bank?.type !== 'EWALLET' && !this.shop.bank?.accountId?.trim()) {
      this.showStoreBankAccountNumberError = true;
      this.shop.businessHours = originalHours;
      return;
    }

    // Merchant ICA gate: stamp acceptance fields onto the store payload before
    // POST /store. The backend StoreService.create() reads icaAccepted /
    // icaAcceptedDate / icaVersion from the payload and returns 403
    // MERCHANT_ICA_NOT_ACCEPTED when they are absent or at a stale version.
    // Only applies to NEW store creation (shop.id is falsy); updates are exempt.
    if (!this.shop.id) {
      const userProfile = this.storageService.userProfile;
      if (!userProfile?.icaAccepted || !userProfile?.icaVersion) {
        // ICA fields missing — redirect back to the merchant ICA acceptance screen.
        // This state should not arise given the TermsConditionsComponent gate, but
        // prevents a doomed 403 if the session storage is in an unexpected state.
        this.router.navigate(['/business/terms', userProfile?.id]);
        this.shop.businessHours = originalHours;
        return;
      }
      this.shop.icaAccepted = true;
      this.shop.icaAcceptedDate = userProfile.icaAcceptedDate;
      this.shop.icaVersion = userProfile.icaVersion;
    }

    var call = this.selectedFile ? this.uploadImage() : of("")
      call.pipe(
        mergeMap(() => this.shop.id ? this.izingaOrderManagementService.updateStore(this.shop) : this.izingaOrderManagementService.createStore(this.shop)),
        // TIER-BILLING-01 (token refresh): POST /store triggers StoreService.create() which
        // calls FirebaseAuth.setCustomUserClaims() to stamp a storeId onto the merchant's
        // Firebase account. The SDK caches ID tokens and will NOT pick up that new claim
        // unless we force a server round-trip with getIdToken(true). Without this refresh,
        // POST /merchant/subscription/initiate returns 422 STORE_ID_NOT_IN_JWT because the
        // JWT still reflects the pre-creation claim state.
        //
        // Only new store creation (shop.id falsy) grants a new claim — updates are exempt.
        // This step must be in the pipe (not fire-and-forget) so the navigation to the
        // subscription checkout cannot race ahead of the refresh completing.
        mergeMap((data) => {
          if (!this.shop.id) {
            return this.firebaseService.refreshIdToken().pipe(map(() => data));
          }
          return of(data);
        })
      ).subscribe(
      data => {
        this.stockList = data.stockList!
        console.log('Store details updated successfully:', data);
        this.storageService.infoMessage = "Store details updated successfully"
        if(this.shop.id) {
          this.reloadPage()
        } else {
          // TIER-BILLING-01 (T-14): branch on the tier selected during this session.
          // FREE (or no tier in session): navigate to the dashboard — no subscription step.
          // PREMIUM_1 or PREMIUM_2: navigate to the subscription checkout.
          // The storeId from the backend response is used as the route parameter.
          const selectedTier = this.storageService.selectedTier;
          if (selectedTier === 'PREMIUM_1' || selectedTier === 'PREMIUM_2') {
            this.router.navigate(['/business/subscription', data.id]);
          } else {
            this.router.navigate(['/business/dashboard']);
          }
        }

      },
      (error) => {
        // FIX-02: restore full hours array (including closed-day placeholders) so UI is intact
        this.shop.businessHours = originalHours;
        // Extract the real backend error message when present (e.g. "Bank account ID is required"
        // from StoreService.validateBankForCreate()) so the merchant sees actionable guidance
        // rather than a generic "Updated store details failed". Fall back to the generic message
        // only when the backend didn't send an error body (network failures, 5xx, etc.).
        const backendMessage: string | undefined = error?.error?.error;
        this.storageService.errorMessage = backendMessage?.trim()
          ? backendMessage.trim()
          : 'Updated store details failed';
      }
    );
  }

    onFileSelected(event: any): void {
      this.selectedFile = event.target.files[0];  // Capture the file
    }
  
    uploadImage(): Observable<string> {
      return this.izingaOrderManagementService.uploadFile(this.selectedFile!, false)
        .pipe(
          map ((response: any) => {
            console.log('File uploaded successfully:', response);
            this.shop.imageUrl=response.url
            return response.url
          })
        );
      
    }

    replaceSpecialChars(input?: string): string| undefined {
      return input?.replace(/[^a-zA-Z0-9]/g, '_');
    }

  /**
   * Pre-populates the store's bank from the owner's user profile when the store
   * has no bank set. Uses a shallow copy so editing the store's copy does not
   * mutate the cached user profile. Also matches selectedStoreBankConfig so the
   * Bank Name dropdown shows the correct value.
   */
  private prePopulateStoreBankIfNeeded(): void {
    // Always ensure shop.bank is defined (the class-level default handles this for
    // the synchronous render, but async paths — getStoreById returning a store with
    // no bank, or the error path for a brand-new merchant — need this guard too).
    if (!this.shop.bank) {
      this.shop.bank = { type: 'CHEQUE' as any, name: '', accountId: '', branchCode: '', phone: '' };
    }
    // If the store has no meaningful bank data yet, copy from the owner's user
    // profile bank (shallow copy — mutating the store's copy must not affect the
    // cached user profile). If the user profile also has no bank, the empty default
    // stays so the section is still visible and the merchant can fill it in.
    if (!this.shop.bank.accountId?.trim()) {
      const userBank = this.storageService.userProfile?.bank;
      if (userBank) {
        this.shop.bank = { ...userBank };
      }
    }
    // Sync the Bank Name dropdown selection to whatever bank is now on the store.
    if (this.shop.bank?.name && this.bankConfigs.length > 0) {
      this.selectedStoreBankConfig = this.bankConfigs.find(b =>
        b.bankName === this.shop.bank?.name || b.branchCode === this.shop.bank?.branchCode
      );
    }
  }

  /** Called when the merchant selects a bank from the Bank Name dropdown. */
  onStoreBankSelected(bankConfig: BankConfig): void {
    if (!this.shop.bank) {
      this.shop.bank = { accountId: '', name: '', branchCode: '', type: 'CHEQUE' as Bank.AccountTypeEnum };
    }
    this.shop.bank.name = bankConfig.bankName;
    this.shop.bank.branchCode = bankConfig.branchCode;
    // Preserve an existing account number; keep phone from existing value or mobile number.
    this.shop.bank.accountId = this.shop.bank.accountId || '';
    this.shop.bank.phone = this.shop.bank.phone || this.storageService.userProfile?.mobileNumber || '';
  }

  /** Loads available bank configurations from the backend for the Bank Name dropdown. */
  private loadBankConfigs(): void {
    this.izingaOrderManagementService.getBankConfigs().subscribe({
      next: (banks) => {
        this.bankConfigs = banks;
        // Re-sync dropdown selection now that configs are loaded.
        if (this.shop.bank?.name) {
          this.selectedStoreBankConfig = banks.find(b =>
            b.bankName === this.shop.bank?.name || b.branchCode === this.shop.bank?.branchCode
          );
        }
      },
      error: () => {
        console.error('Error loading bank configs for store form');
      }
    });
  }

  /** REQ-22: true only when the logged-in user has platform ADMIN role. */
  get isAdmin(): boolean {
    return this.storageService.userProfile?.role === 'ADMIN';
  }

  /**
   * Exposes the selected subscription tier to the template so premium-tier
   * merchants see a muted reminder that a payment step follows the store-info
   * form (Fix 3 — TIER-BILLING-01 DS review).
   */
  get selectedTier(): string | null {
    return this.storageService.selectedTier;
  }

  shopItems(category?: string): Stock[] | undefined {
    return this.shop?.stockList?.filter(item => item.group?.toLowerCase() == category?.toLowerCase())
  }

  /** NOTE-02: returns true when the accordion panel for this category key is open (default open). */
  isOpen(key: string): boolean {
    return this.accordionOpenStates[key] !== false;
  }

  /** NOTE-02: toggle the open/closed state for this category key. */
  toggleOpen(key: string): void {
    this.accordionOpenStates[key] = !this.isOpen(key);
  }

  isPromotion(stock: Stock): boolean {
    return this.isPromotionCategory(stock.group!)
  }

  isPromotionCategory(category: string): boolean {
    var promoTags = ["deal", "special", "promotion", "promotions", "deals", "specials", "family meals", "featured items"]
    return promoTags.includes(category?.toLowerCase())
  }

  setAvailabilityStatus(status: 'ONLINE' | 'AWAY' | 'OFFLINE') {
    if (this.shop) {
      this.shop.availabilityStatus = status;
      this.izingaOrderManagementService.updateStore(this.shop)
      .subscribe(resp => {
        console.log("Updated availability status to ", status)
        alert(`Your availability status has been set to ${status}`);
      });
    }
  }

  /**
   * Calculate delivery rate based on distance, volume, weight, and floors.
   */
  calculateDeliveryRate(
    distance: number,
    volumeCM2: number,
    weightKg: number,
    floors: number = 0,
    vehicleType: 'BIKE' | 'CAR' | 'BAKKIE' | 'TRUCK' = 'CAR'
  ): number {
    if (!this.shop?.rates) {
      return 0;
    }

    const rates = this.shop.rates;
    let totalRate = 0;

    // Base delivery price for selected vehicle type with fallback
    const baseVehicleRate = this.getVehicleStandardRate(vehicleType);
    if (baseVehicleRate > 0) {
      totalRate += baseVehicleRate;
    } else if (rates.standardDeliveryPrice) {
      totalRate += rates.standardDeliveryPrice;
    }

    // Additional rate for distance beyond standard delivery km
    const selectedRatePerKm = this.getVehicleRatePerKm(vehicleType);
    if (rates.standardDeliveryKm && selectedRatePerKm && distance > rates.standardDeliveryKm) {
      const extraDistance = distance - rates.standardDeliveryKm;
      totalRate += extraDistance * selectedRatePerKm;
    }

    // Volume-based rate
    if (rates.ratePerVolumeCM2 && volumeCM2 > 0) {
      totalRate += volumeCM2 * rates.ratePerVolumeCM2;
    }

    // Weight-based rate
    if (rates.ratePerWeightKg && weightKg > 0) {
      totalRate += weightKg * rates.ratePerWeightKg;
    }

    // Labour-based rate for carrying items across floors
    if (rates.labourRatePerFloor && floors > 0) {
      totalRate += floors * rates.labourRatePerFloor * weightKg;
    }

    return Math.max(totalRate, 0); // Ensure rate is never negative
  }

  private getVehicleStandardRate(vehicleType: 'BIKE' | 'CAR' | 'BAKKIE' | 'TRUCK'): number {
    if (!this.shop?.rates) {
      return 0;
    }

    switch (vehicleType) {
      case 'BIKE':
        return this.shop.rates.standardDeliveryPriceBike || 0;
      case 'CAR':
        return this.shop.rates.standardDeliveryPriceCar || 0;
      case 'BAKKIE':
        return this.shop.rates.standardDeliveryPriceBakkie || 0;
      case 'TRUCK':
        return this.shop.rates.standardDeliveryPriceTruck || 0;
      default:
        return this.shop.rates.standardDeliveryPrice || 0;
    }
  }

  private getVehicleRatePerKm(vehicleType: 'BIKE' | 'CAR' | 'BAKKIE' | 'TRUCK'): number {
    if (!this.shop?.rates) {
      return 0;
    }

    switch (vehicleType) {
      case 'BIKE':
        return this.shop.rates.ratePerKmBike || this.shop.rates.ratePerKm || 0;
      case 'CAR':
        return this.shop.rates.ratePerKmCar || this.shop.rates.ratePerKm || 0;
      case 'BAKKIE':
        return this.shop.rates.ratePerKmBakkie || this.shop.rates.ratePerKm || 0;
      case 'TRUCK':
        return this.shop.rates.ratePerKmTruck || this.shop.rates.ratePerKm || 0;
      default:
        return this.shop.rates.ratePerKm || 0;
    }
  }

  getDistanceAdjustmentKm(distance: number): number {
    const standardKm = this.shop?.rates?.standardDeliveryKm || 0;
    return distance > standardKm ? distance - standardKm : 0;
  }

  getDistanceAdjustmentAmount(distance: number): number {
    const extraDistance = this.getDistanceAdjustmentKm(distance);
    const ratePerKm = this.getVehicleRatePerKm(this.previewVehicleType);
    return extraDistance * ratePerKm;
  }

  // -----------------------------------------------------------------------
  // Issue #11: Delivery category management
  // -----------------------------------------------------------------------

  /** Validate and add a new category to the working list. */
  addDeliveryCategory(): void {
    this.categoryValidationError = '';
    const name = this.newCategoryName.trim();
    if (!name) {
      this.categoryValidationError = 'Category name must not be empty.';
      return;
    }
    const duplicate = this.deliveryCategories.some(
      c => c.name.trim().toLowerCase() === name.toLowerCase()
    );
    if (duplicate) {
      this.categoryValidationError = `A category named "${name}" already exists.`;
      return;
    }
    const newCategory: Category = {
      id: this.generateTempId(),
      name,
      image: '',
      active: true
    };
    this.deliveryCategories = [...this.deliveryCategories, newCategory];
    this.newCategoryName = '';
  }

  /** Remove a category from the working list by id. */
  removeDeliveryCategory(category: Category): void {
    this.deliveryCategories = this.deliveryCategories.filter(c => c.id !== category.id);
  }

  /** Toggle active flag on a category. */
  toggleCategoryActive(category: Category): void {
    category.active = !category.active;
  }

  /**
   * Validate an edited category name inline.
   * Returns an error string, or empty string if valid.
   */
  validateCategoryName(category: Category): string {
    const name = category.name.trim();
    if (!name) {
      return 'Category name must not be empty.';
    }
    const duplicate = this.deliveryCategories.some(
      c => c.id !== category.id && c.name.trim().toLowerCase() === name.toLowerCase()
    );
    return duplicate ? `Another category named "${name}" already exists.` : '';
  }

  /** Returns true when any category has a validation error — blocks save. */
  hasCategoryErrors(): boolean {
    return this.deliveryCategories.some(c => !!this.validateCategoryName(c));
  }

  // -----------------------------------------------------------------------
  // Issue #12: Category image upload via existing S3 endpoint
  // -----------------------------------------------------------------------

  onCategoryImageSelected(event: Event, category: Category): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }
    const file = input.files[0];
    this.categoryUploading[category.id] = true;
    this.izingaOrderManagementService.uploadFile(file, false)
      .pipe(
        map((response: any) => response.url as string)
      )
      .subscribe({
        next: (url: string) => {
          category.image = url;
          this.categoryImageError[category.id] = false;
          this.categoryUploading[category.id] = false;
        },
        error: (_err: any) => {
          this.categoryUploading[category.id] = false;
          this.storageService.errorMessage = 'Image upload failed. Please try again.';
        }
      });
  }

  onCategoryImageError(category: Category): void {
    this.categoryImageError[category.id] = true;
  }

  /** Generate a temporary client-side id for newly created categories. */
  private generateTempId(): string {
    return 'tmp-' + Math.random().toString(36).slice(2, 10);
  }

  /**
   * Sync deliveryCategories back to shop.categories before saving.
   * Called inside registerBusinessAndStock so the full array is always sent.
   */
  private syncCategoriesToShop(): void {
    this.shop.categories = [...this.deliveryCategories];
  }

  /** Extracted so tests can spy on it without touching window.location directly. */
  protected reloadPage(): void {
    window.location.reload();
  }

}
