import { Component, OnInit } from '@angular/core';
import {CurrencyPipe} from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { IzingaOrderManagementService } from '../service/izinga-order-management.service';
import { StorageService } from '../service/storage-service.service';
import { Order } from '../model/order';
import { QuoteApproval } from '../model/quoteApproval';
import { UserProfile } from '../model/userProfile';

@Component({
  selector: 'app-pending-approvals',
  templateUrl: './pending-approvals.component.html',
  styleUrls: ['./pending-approvals.component.css']
})
export class MessangerOrderComponent implements OnInit {
  order: Order | null = null;
  messenger: UserProfile | null = null;
  quoteId: string | null = null;
  isLoading: boolean = true;
  isProcessing: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  showTipModal: boolean = false;

  // Quote details
  deliveryDistance: number = 0;
  estimatedTime: string = '';
  totalQuote: number = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private sanitizer: DomSanitizer,
    private orderService: IzingaOrderManagementService,
    private storageService: StorageService
  ) {}

  ngOnInit(): void {
    this.quoteId = this.route.snapshot.paramMap.get('orderId') || this.route.snapshot.queryParamMap.get('orderId');

    const activeQuoteId = this.quoteId;
    if (activeQuoteId) {
      this.loadQuoteDetails(activeQuoteId);
      setInterval(() => this.loadQuoteDetails(activeQuoteId), 10000);
    } else {
      this.errorMessage = 'Invalid order ID';
      this.isLoading = false;
    }
  }

  async loadQuoteDetails(orderId: string): Promise<void> {
    try {
      this.isLoading = this.order == null;

      this.orderService.getOrderById(orderId).subscribe({
        next: (order: Order) => {
          if (this.order == null) {
            this.order = order;
            this.calculateQuote();
            this.loadMessengerProfile();
          } else {
            this.order.stage = order.stage;
          }
          this.showTipModal = order.stage === 'STAGE_7_ALL_PAID';
        },
        error: (error: any) => {
          console.error('Error loading order:', error);
          this.errorMessage = 'Failed to load order details';
          this.isLoading = false;
        }
      });
    } catch (error) {
      console.error('Error in loadQuoteDetails:', error);
      this.errorMessage = 'Failed to load quote details';
      this.isLoading = false;
    }
  }

  loadMessengerProfile(): void {
    this.messenger = this.storageService.userProfile || null;
    if (!this.messenger) {
      this.router.navigate(['/indivisuals/verify']);
      return;
    }
    this.isLoading = false;
  }

  calculateQuote(): void {
    if (!this.order?.shippingData) return;

    this.deliveryDistance = this.order.shippingData.distance || 0;
    this.estimatedTime = this.calculateEstimatedTime(this.deliveryDistance);
    this.totalQuote = this.order.shippingData.fee || 0;
  }

  calculateEstimatedTime(distance: number): string {
    const timeInMinutes = distance * 3 + 15;

    if (timeInMinutes >= 60) {
      const hours = Math.floor(timeInMinutes / 60);
      const minutes = timeInMinutes % 60;
      return `${hours}h ${minutes}m`;
    }
    return `${timeInMinutes}m`;
  }

  approveQuote(): void {
    if (!this.order || !this.messenger || !this.quoteId) return;

    this.isProcessing = true;
    this.errorMessage = '';

    const quoteApproval: QuoteApproval = {
      approved: true,
      reason: `Approved delivery quote of R${this.totalQuote} for ${this.deliveryDistance}km distance`,
      orderId: this.quoteId,
      messengerId: this.messenger.id!
    };

    this.orderService.acceptQuote(this.quoteId, quoteApproval).subscribe({
      next: (updatedOrder: Order) => {
        this.order = updatedOrder;
        this.successMessage = 'Quote approved successfully!';
        this.isProcessing = false;

        if (this.isWaitingForConfirmation()) {
          setTimeout(() => {
            this.successMessage = '';
          }, 20000);
        }
      },
      error: (error: any) => {
        console.error('Error approving quote:', error);
        this.errorMessage = 'Failed to approve quote. Please try again.';
        this.isProcessing = false;
      }
    });
  }

  isWaitingForConfirmation(): boolean {
    return this.order?.stage === 'STAGE_0_CUSTOMER_NOT_PAID' && this.isApproved();
  }

  isApproved(): boolean {
    var approved = this.order?.tag != null && this.order?.tag['quoteAcceptedBy'] != null;
    console.log("Quote approved: ", approved)
    return approved;
  }

  startPickup(): void {
    if (!this.order || !this.quoteId) return;

    this.isProcessing = true;
    this.errorMessage = '';

    this.orderService.updateStage(this.quoteId).subscribe({
      next: (order: Order) => {
        this.order = order;
        this.successMessage = 'Pickup started! Opening navigation...';
        this.isProcessing = false;

        const fromGeoPoint = this.order.shippingData?.shippingDataGeoData?.fromGeoPoint;
        const latitude = fromGeoPoint?.latitude;
        const longitude = fromGeoPoint?.longitude;

        setTimeout(() => {
          if (latitude != null && longitude != null) {
            this.navigateToCoordinates(latitude, longitude);
          }
        }, 500);
      },
      error: (error: any) => {
        console.error('Error starting pickup:', error);
        this.errorMessage = 'Failed to start pickup. Please try again.';
        this.isProcessing = false;
      }
    });
  }

  rejectQuote(): void {
    if (!this.order || !this.messenger || !this.quoteId) return;

    this.isProcessing = true;
    this.errorMessage = '';

    const quoteApproval: QuoteApproval = {
      approved: false,
      reason: 'Quote declined by messenger',
      orderId: this.quoteId,
      messengerId: this.messenger.id!
    };

    this.orderService.acceptQuote(this.quoteId, quoteApproval).subscribe({
      next: (updatedOrder: Order) => {
        this.order = updatedOrder;
        this.successMessage = 'Quote declined successfully.';
        this.isProcessing = false;

        setTimeout(() => {
          this.router.navigate(['/indivisuals/dashboard']);
        }, 1000);
      },
      error: (error: any) => {
        console.error('Error declining quote:', error);
        this.errorMessage = 'Failed to decline quote. Please try again.';
        this.isProcessing = false;
      }
    });
  }

  navigateToAddress(address?: string): void {
    if (!address) return;

    const encodedAddress = encodeURIComponent(address);
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
    window.open(googleMapsUrl, '_blank');
  }

  navigateToCoordinates(latitude: number, longitude: number): void {
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`;
    window.open(googleMapsUrl, '_blank');
  }

  notifyCustomerArrived(): void {
    if (!this.order || !this.quoteId) return;

    this.isProcessing = true;
    this.errorMessage = '';

    this.orderService.updateStage(this.quoteId).subscribe({
      next: (order: Order) => {
        this.order = order;
        this.successMessage = 'Customer notified of arrival!';
        this.isProcessing = false;
      },
      error: (error: any) => {
        console.error('Error notifying customer:', error);
        this.errorMessage = 'Failed to notify customer. Please try again.';
        this.isProcessing = false;
      }
    });
  }

  startDropoff(): void {
    if (!this.order || !this.quoteId) return;

    this.isProcessing = true;
    this.errorMessage = '';

    this.orderService.updateStage(this.order.id!).subscribe({
      next: (order: Order) => {
        this.order = order;
        this.successMessage = 'Dropoff started! Opening navigation...';
        this.isProcessing = false;

        const toGeoPoint = this.order.shippingData?.shippingDataGeoData?.toGeoPoint;
        const latitude = toGeoPoint?.latitude;
        const longitude = toGeoPoint?.longitude;

        setTimeout(() => {
          if (latitude != null && longitude != null) {
            this.navigateToCoordinates(latitude, longitude);
            return;
          }

          if (this.order?.shippingData?.toAddress) {
            this.navigateToAddress(this.order.shippingData.toAddress);
          }
        }, 500);
      },
      error: (error: any) => {
        console.error('Error starting dropoff:', error);
        this.errorMessage = 'Failed to start dropoff. Please try again.';
        this.isProcessing = false;
      }
    });
  }

  notifyCustomerReachedDestination(): void {
    if (!this.order || !this.quoteId) return;

    this.isProcessing = true;
    this.errorMessage = '';

    this.orderService.updateStage(this.quoteId).subscribe({
      next: (order: Order) => {
        this.order = order;
        this.successMessage = 'Customer notified: driver has arrived at destination.';
        this.isProcessing = false;
      },
      error: (error: any) => {
        console.error('Error notifying customer at destination:', error);
        this.errorMessage = 'Failed to notify customer. Please try again.';
        this.isProcessing = false;
      }
    });
  }

  completeDelivery(): void {
    if (!this.order || !this.quoteId) return;
    this.isProcessing = true;
    this.errorMessage = '';
    this.updateStage();
  }

  closeTipModal(): void {
    this.showTipModal = false;
  }

  getDirectionsMapUrl(): SafeResourceUrl {
    if (!this.order?.shippingData?.fromAddress || !this.order?.shippingData?.toAddress) {
      return '';
    }

    const origin = encodeURIComponent(this.order.shippingData.fromAddress);
    const destination = encodeURIComponent(this.order.shippingData.toAddress);
    const fallbackUrl = `https://maps.google.com/maps?f=d&source=s_d&saddr=${origin}&daddr=${destination}&output=embed`;

    return this.sanitizer.bypassSecurityTrustResourceUrl(fallbackUrl);
  }

  openDirectionsInGoogleMaps(): void {
    if (!this.order?.shippingData?.fromAddress || !this.order?.shippingData?.toAddress) return;

    const origin = encodeURIComponent(this.order.shippingData.fromAddress);
    const destination = encodeURIComponent(this.order.shippingData.toAddress);
    const directionsUrl = `https://www.google.com/maps/dir/${origin}/${destination}`;

    window.open(directionsUrl, '_blank');
  }

  shareDirections(): void {
    if (!this.order?.shippingData?.fromAddress || !this.order?.shippingData?.toAddress) return;

    const origin = this.order.shippingData.fromAddress;
    const destination = this.order.shippingData.toAddress;
    const directionsUrl = `https://www.google.com/maps/dir/${encodeURIComponent(origin)}/${encodeURIComponent(destination)}`;
    const shareText = `Delivery Route:\nFrom: ${origin}\nTo: ${destination}\n\nView directions: ${directionsUrl}`;

    if (navigator.share) {
      navigator.share({
        title: 'Delivery Route',
        text: shareText,
        url: directionsUrl
      });
    } else {
      navigator.clipboard.writeText(shareText).then(() => {
        this.successMessage = 'Route details copied to clipboard';
        setTimeout(() => this.successMessage = '', 3000);
      });
    }
  }

  getEstimatedTime(): number {
    const baseTime = 10;
    const travelTime = (this.deliveryDistance / 25) * 30;
    return Math.round(baseTime + travelTime);
  }

  goBack(): void {
    window.history.back();
  }

  formatAddress(address: string): string {
    return address.length > 50 ? address.substring(0, 50) + '...' : address;
  }

  getBuildingTypeDisplay(buildingType: string): string {
    switch (buildingType) {
      case 'HOUSE':
        return 'House';
      case 'APARTMENT':
        return 'Apartment';
      case 'COMPLEX':
        return 'Complex';
      case 'OFFICE':
        return 'Office Building';
      default:
        return buildingType;
    }
  }

  updateStage(): void {
    if (!this.order || !this.quoteId) return;

    this.isProcessing = true;
    this.errorMessage = '';

    this.orderService.updateStage(this.quoteId).subscribe({
      next: (order: Order) => {
        this.order = order;
        this.successMessage = 'Order stage updated!';
        this.isProcessing = false;
      },
      error: (error: any) => {
        console.error('Error updating order stage:', error);
        this.errorMessage = 'Failed to update order stage. Please try again.';
        this.isProcessing = false;
      }
    });
  }
}