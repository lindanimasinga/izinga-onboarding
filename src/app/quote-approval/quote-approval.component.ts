import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Order } from '../model/order';
import { UserProfile } from '../model/userProfile';
import { IzingaOrderManagementService } from '../service/izinga-order-management.service';
import { StorageService } from '../service/storage-service.service';
import { QuoteApproval } from '../model/quoteApproval';

@Component({
  selector: 'app-messanger-order',
  templateUrl: './quote-approval.component.html',
  styleUrls: ['./quote-approval.component.css']
})
export class MessangerOrderComponent implements OnInit {
  
  order: Order | null = null;
  messenger: UserProfile | null | undefined = null;
  quoteId: string | null = null;
  isLoading: boolean = true;
  isProcessing: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  
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
  ) { }

  ngOnInit(): void {
    this.quoteId = this.route.snapshot.paramMap.get('orderId'); // orderId is same as quoteId
    
    if (this.quoteId) {
      this.loadQuoteDetails(this.quoteId);
    } else {
      this.errorMessage = 'Invalid order ID';
      this.isLoading = false;
    }
  }

  async loadQuoteDetails(orderId: string): Promise<void> {
    try {
      this.isLoading = true;
      
      // Load order details
      this.orderService.getOrderById(orderId).subscribe({
        next: (order) => {
          this.order = order;
          this.calculateQuote();
          this.loadMessengerProfile();
        },
        error: (error) => {
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
    // Get messenger profile from storage or load from service
    this.messenger = this.storageService.userProfile;
    if (!this.messenger) {
      // If no messenger profile, redirect to login
      this.router.navigate(['/login']);
      return;
    }
    this.isLoading = false;
  }

  calculateQuote(): void {
    if (!this.order?.shippingData) return;
    
    // Calculate distance (mock calculation - replace with actual distance calculation)
    this.deliveryDistance = this.calculateDistance(
      this.order.shippingData.fromAddress || '',
      this.order.shippingData.toAddress || ''
    );
    
    // Calculate estimated time based on distance
    this.estimatedTime = this.calculateEstimatedTime(this.deliveryDistance);
    
    // Calculate total quote
    const distanceCharge = this.order.shippingData.fee;
    this.totalQuote = distanceCharge !== undefined ? distanceCharge : 0;
  }

  calculateDistance(fromAddress: string, toAddress: string): number {
    return this.order?.shippingData?.distance || 0;
  }

  calculateEstimatedTime(distance: number): string {
    const timeInMinutes = distance * 3 + 15; // Rough estimate: 3 mins per km + 15 min buffer
    
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
    
    // Create quote approval object
    const quoteApproval: QuoteApproval = {
      approved: true,
      reason: `Approved delivery quote of R${this.totalQuote} for ${this.deliveryDistance}km distance`,
      orderId: this.quoteId,
      messengerId: this.messenger.id!
    };

    this.orderService.acceptQuote(this.quoteId, quoteApproval).subscribe({
      next: (updatedOrder) => {
        this.order = updatedOrder;
        this.successMessage = 'Quote approved successfully!';
        this.isProcessing = false;
      },
      error: (error) => {
        console.error('Error approving quote:', error);
        this.errorMessage = `Failed to approve quote. ${error.error.message || 'Please try again.'}`;
        this.isProcessing = false;
      }
    });
  }

  rejectQuote(): void {
    if (!this.order || !this.messenger || !this.quoteId) return;
    
    this.isProcessing = true;
    this.errorMessage = '';
    
    // Create quote rejection object
    const quoteApproval: QuoteApproval = {
      approved: false,
      reason: 'Quote declined by messenger',
      orderId: this.quoteId,
      messengerId: this.messenger.id!
    };
    
    this.orderService.acceptQuote(this.quoteId, quoteApproval).subscribe(
      (updatedOrder: Order) => {
        this.order = updatedOrder;
        this.successMessage = 'Quote declined successfully.';
        this.isProcessing = false;
        
        // Redirect to messenger dashboard after 1 second
        setTimeout(() => {
          this.router.navigate(['/messenger-dashboard']);
        }, 1000);
      },
      (error : any) => {
        console.error('Error declining quote:', error);
        this.errorMessage = 'Failed to decline quote. Please try again.';
        this.isProcessing = false;
      }
    );
  }

  navigateToAddress(address?: string): void {
    if (!address) return;
    
    // Encode the address for URL
    const encodedAddress = encodeURIComponent(address);
    
    // Create Google Maps URL
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
    
    // Open in new tab
    window.open(googleMapsUrl, '_blank');
  }

  getDirectionsMapUrl(): SafeResourceUrl {
    if (!this.order?.shippingData?.fromAddress || !this.order?.shippingData?.toAddress) {
      return '';
    }

    const origin = encodeURIComponent(this.order.shippingData.fromAddress);
    const destination = encodeURIComponent(this.order.shippingData.toAddress);
    
    // Use Google Maps without API key for basic directions
    const mapUrl = `https://www.google.com/maps/embed?pb=!1m28!1m12!1m3!1d3000!2d0!3d0!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!4m13!3e6!4m5!1s${origin}!3m2!1d0!2d0!4m5!1s${destination}!3m2!1d0!2d0!5e0!3m2!1sen!2sza!4v1676543210000!5m2!1sen!2sza`;
    
    // Fallback: Use basic directions URL
    const fallbackUrl = `https://maps.google.com/maps?f=d&source=s_d&saddr=${origin}&daddr=${destination}&output=embed`;
    
    return this.sanitizer.bypassSecurityTrustResourceUrl(fallbackUrl);
  }

  openDirectionsInGoogleMaps(): void {
    if (!this.order?.shippingData?.fromAddress || !this.order?.shippingData?.toAddress) return;
    
    const origin = encodeURIComponent(this.order.shippingData.fromAddress);
    const destination = encodeURIComponent(this.order.shippingData.toAddress);
    
    // Google Maps directions URL
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
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareText).then(() => {
        this.successMessage = 'Route details copied to clipboard';
        setTimeout(() => this.successMessage = '', 3000);
      });
    }
  }

  getEstimatedTime(): number {
    // Simple estimation: 30 minutes per 25km + 10 minutes base time
    const baseTime = 10;
    const travelTime = (this.deliveryDistance / 25) * 30;
    return Math.round(baseTime + travelTime);
  }

  goBack(): void {
    window.history.back();
  }

  formatAddress(address: string): string {
    // Truncate long addresses for display
    return address.length > 50 ? address.substring(0, 50) + '...' : address;
  }

  getBuildingTypeDisplay(buildingType: string): string {
    switch (buildingType) {
      case 'HOUSE': return 'House';
      case 'APARTMENT': return 'Apartment';
      case 'COMPLEX': return 'Complex';
      case 'OFFICE': return 'Office Building';
      default: return buildingType;
    }
  }

  get floorLevel(): number | null {
    return this.order?.shippingData?.floorLevel ?? null;
  }

  get floorChargeAmount(): string {
    const level = this.floorLevel;
    return (level != null && level > 2) ? ((level - 2) * 10).toFixed(2) : '0.00';
  }
}