import { Component, ElementRef, ViewChild } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { IzingaOrderManagementService } from '../service/izinga-order-management.service';
import { UserProfile } from '../model/userProfile';
import { catchError, of, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import jsPDF, { jsPDFOptions } from 'jspdf';
import { StoreProfile } from '../model/storeProfile';
import { StorageService } from '../service/storage-service.service';

@Component({
  selector: 'app-user-info',
  templateUrl: './user-info.component.html',
  styleUrls: ['./user-info.component.css']
})
export class UserInfoComponent {

  userProfile?: UserProfile
  mobileNumber?: string
  @ViewChild('exportPdf', { static: false }) 
  exportPdf?: ElementRef;
  @ViewChild('logoImage', { static: false }) 
  logoImage?: ElementRef;
  isStoreAdmin?: boolean
  nfcStatus: string = 'ready'  // ready, writing, reading, success, error
  nfcMessage: string = ''
  private nfcReader?: any  // Store NFC reader instance

  constructor(private izingaOrderManager: IzingaOrderManagementService,
    private router: Router,
    private route: ActivatedRoute, 
    private storageService: StorageService) {
  }

  ngOnInit() {
    var userObservable = this.storageService.userProfile != null ? of(this.storageService.userProfile!) : this.izingaOrderManager.getCustomerByPhoneNumber(this.storageService.phoneNumber!)
    userObservable.subscribe(user => {
      this.userProfile = user
      this.isStoreAdmin = user?.role == StoreProfile.RoleEnum.STOREADMIN
    })

    // Request NFC permission if available
    this.requestNFCPermission();
  }

  findCustomer() {
    this.izingaOrderManager.getCustomerByPhoneNumber(this.mobileNumber!)
    .pipe(
      catchError(error => {
        if(error.status === 404) {
          console.log("Not found user")
          return of(this.userProfile)
        } else {
          return throwError(error); 
        }
      }),
    )
    .subscribe(user => {
      this.userProfile = user
      this.isStoreAdmin = user?.role == StoreProfile.RoleEnum.STOREADMIN
    })
  }

  get appleWalletUrl(): String {
    var deviceType = this.isAndroid() ? "ANDROID" : "APPLE";
    return `${environment.izingaUrl}/walletpass/${this.userProfile!.id}/${deviceType}`
  }

  isAndroid(): boolean {
    return /Android/i.test(navigator.userAgent);
  }

  isIOS(): boolean {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  downloadPdf() {
    console.log("downloading qrcode as pdf")
    const width = this.exportPdf?.nativeElement.clientWidth;
    const height = this.exportPdf?.nativeElement.clientWidth;
    let jsPdfOptions: jsPDFOptions = {
      orientation: "p",
      unit: 'px',
      format: [430-32, 575]
    };

    const pdf = new jsPDF(jsPdfOptions);
    pdf.setFillColor(0, 0, 0);

    //QR Code
    
    pdf.html(this.exportPdf?.nativeElement, {
      callback: pdf => pdf.save(`iZinga_TipCard_${this.userProfile?.name}_${this.userProfile?.mobileNumber}.pdf`)
    });
  }

  copyTipLink() {
    const tipLink = `https://tips.izinga.co.za/tip?messengerId=${this.userProfile?.id}`;
    
    if (navigator.clipboard && window.isSecureContext) {
      // Modern browsers with secure context
      navigator.clipboard.writeText(tipLink).then(() => {
        console.log('Tip link copied to clipboard');
        // You could add a toast notification here
        alert('Tip link copied to clipboard!');
      }).catch(err => {
        console.error('Failed to copy tip link: ', err);
        this.fallbackCopyTextToClipboard(tipLink);
      });
    } else {
      // Fallback for older browsers
      this.fallbackCopyTextToClipboard(tipLink);
    }
  }

  private fallbackCopyTextToClipboard(text: string) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    
    // Avoid scrolling to bottom
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand('copy');
      if (successful) {
        console.log('Tip link copied to clipboard (fallback)');
        alert('Tip link copied to clipboard!');
      } else {
        console.error('Failed to copy tip link (fallback)');
        alert('Failed to copy tip link. Please copy manually.');
      }
    } catch (err) {
      console.error('Failed to copy tip link (fallback): ', err);
      alert('Failed to copy tip link. Please copy manually.');
    }

    document.body.removeChild(textArea);
  }

  shareTip() {
    const tipLink = `https://tips.izinga.co.za/tip?messengerId=${this.userProfile?.id}`;
    const shareData = {
      title: this.isStoreAdmin ? 'Scan To Pay' : 'Tip Me',
      text: this.isStoreAdmin 
        ? 'Scan this QR code to pay' 
        : `Send a tip to ${this.userProfile?.name}`,
      url: tipLink
    };

    if (navigator.share && this.isWebShareAvailable) {
      navigator.share(shareData)
        .then(() => console.log('Tip shared successfully'))
        .catch((error) => {
          console.error('Error sharing tip:', error);
          // Fall back to copying link if sharing fails
          this.copyTipLink();
        });
    } else {
      // Fallback: copy to clipboard
      this.copyTipLink();
    }
  }

  get isWebShareAvailable(): boolean {
    return typeof navigator !== 'undefined' && 'share' in navigator;
  }

  get isNFCAvailable(): boolean {
    return typeof navigator !== 'undefined' && 'nfc' in navigator;
  }

  async requestNFCPermission() {
    if (!this.isNFCAvailable) {
      console.log('NFC is not supported on this device');
      return;
    }

    try {
      // Check if permissions API is available
      if ('permissions' in navigator) {
        const nfcPermission = await (navigator as any).permissions.query({ name: 'nfc' });
        
        console.log('NFC permission state:', nfcPermission.state);
        
        if (nfcPermission.state === 'prompt') {
          console.log('NFC permission will be requested when user tries to use NFC features');
        } else if (nfcPermission.state === 'granted') {
          console.log('NFC permission is already granted');
        } else if (nfcPermission.state === 'denied') {
          console.log('NFC permission is denied');
        }

        // Listen for permission state changes
        nfcPermission.addEventListener('change', () => {
          console.log('NFC permission state changed to:', nfcPermission.state);
        });
      } else {
        console.log('Permissions API not available, NFC permission will be requested when needed');
      }
    } catch (error) {
      console.log('Error checking NFC permission:', error);
      // NFC permission query might not be supported on all browsers
      // This is fine, permission will be requested when NFC is actually used
    }
  }

  async shareViaNFC() {
    if (!this.isNFCAvailable) {
      this.nfcStatus = 'error';
      this.nfcMessage = 'NFC is not supported on this device';
      return;
    }

    const tipLink = `https://tips.izinga.co.za/tip?messengerId=${this.userProfile?.id}`;
    
    try {
      this.nfcStatus = 'writing';
      this.nfcMessage = 'Preparing to write NFC tag...';
      
      // Request NFC permission
      const nfcPermission = await (navigator as any).permissions.query({ name: 'nfc' });
      
      if (nfcPermission.state === 'denied') {
        this.nfcStatus = 'error';
        this.nfcMessage = 'NFC permission is denied. Please enable NFC in your browser settings.';
        return;
      }

      // Create NDEF message with the tip link
      const ndefMessage = {
        records: [{
          recordType: "url",
          data: tipLink
        }]
      };

      this.nfcMessage = 'Hold your device near an NFC tag to write...';

      // Write to NFC tag
      const nfcWriter = new (window as any).NDEFWriter();
      await nfcWriter.write(ndefMessage);
      
      this.nfcStatus = 'success';
      this.nfcMessage = 'NFC tag written successfully! Your tip link is now stored on the tag.';
      
      // Reset status after 3 seconds
      setTimeout(() => {
        this.nfcStatus = 'ready';
        this.nfcMessage = '';
      }, 3000);
      
    } catch (error: any) {
      console.error('NFC write failed:', error);
      this.nfcStatus = 'error';
      
      if (error.name === 'NotAllowedError') {
        this.nfcMessage = 'NFC access was denied. Please grant NFC permission and try again.';
      } else if (error.name === 'NetworkError') {
        this.nfcMessage = 'NFC is not enabled. Please enable NFC on your device.';
      } else if (error.name === 'InvalidStateError') {
        this.nfcMessage = 'NFC is busy. Please try again in a moment.';
      } else {
        this.nfcMessage = 'Failed to write NFC tag. Make sure NFC is enabled and a writable tag is nearby.';
      }
      
      // Reset status after 3 seconds
      setTimeout(() => {
        this.nfcStatus = 'ready';
        this.nfcMessage = '';
      }, 3000);
    }
  }

  async readNFCTag() {
    if (!this.isNFCAvailable) {
      this.nfcStatus = 'error';
      this.nfcMessage = 'NFC is not supported on this device';
      return;
    }

    try {
      this.nfcStatus = 'reading';
      this.nfcMessage = 'Starting NFC scanner...';
      
      // Create NDEF reader
      const ndefReader = new (window as any).NDEFReader();
      
      // Start scanning for NFC tags
      await ndefReader.scan();
      
      this.nfcMessage = 'Ready to scan! Hold your device near an NFC tag.';
      
      ndefReader.addEventListener('reading', ({ message, serialNumber }: any) => {
        console.log(`NFC tag read, serial number: ${serialNumber}`);
        
        this.nfcMessage = 'Reading NFC tag data...';
        
        let foundTipLink = false;
        
        for (const record of message.records) {
          const decoder = new TextDecoder();
          const text = decoder.decode(record.data);
          
          console.log('NFC record type:', record.recordType);
          console.log('NFC record data:', text);
          
          if (record.recordType === 'url' || text.includes('tips.izinga.co.za')) {
            console.log('Tip link found:', text);
            
            this.nfcStatus = 'success';
            this.nfcMessage = 'Tip link found! Opening payment page...';
            
            // Open the tip link
            window.open(text, '_blank');
            foundTipLink = true;
            
            // Reset status after 2 seconds
            setTimeout(() => {
              this.nfcStatus = 'ready';
              this.nfcMessage = '';
            }, 2000);
            
            return;
          }
        }
        
        if (!foundTipLink) {
          this.nfcStatus = 'error';
          this.nfcMessage = 'No tip link found on this NFC tag. Try scanning a different tag.';
          
          // Reset status after 3 seconds
          setTimeout(() => {
            this.nfcStatus = 'ready';
            this.nfcMessage = '';
          }, 3000);
        }
      });
      
      ndefReader.addEventListener('readingerror', () => {
        this.nfcStatus = 'error';
        this.nfcMessage = 'Error reading NFC tag. Please try again.';
        
        setTimeout(() => {
          this.nfcStatus = 'ready';
          this.nfcMessage = '';
        }, 3000);
      });
      
    } catch (error: any) {
      console.error('NFC read failed:', error);
      this.nfcStatus = 'error';
      
      if (error.name === 'NotAllowedError') {
        this.nfcMessage = 'NFC access was denied. Please grant NFC permission and try again.';
      } else if (error.name === 'NetworkError') {
        this.nfcMessage = 'NFC is not enabled. Please enable NFC on your device.';
      } else {
        this.nfcMessage = 'Failed to read NFC tag. Make sure NFC is enabled and try again.';
      }
      
      // Reset status after 3 seconds
      setTimeout(() => {
        this.nfcStatus = 'ready';
        this.nfcMessage = '';
      }, 3000);
    }
  }

  clearNFCStatus() {
    this.nfcStatus = 'ready';
    this.nfcMessage = '';
  }

  stopNFCScanning() {
    if (this.nfcReader) {
      try {
        // Note: NDEFReader doesn't have a stop method in current spec
        // but we can manage the state locally
        this.clearNFCStatus();
        console.log('NFC scanning stopped');
      } catch (error) {
        console.log('Error stopping NFC:', error);
      }
    }
  }

  // Enhanced NFC write with user data
  async writeUserDataToNFC() {
    if (!this.isNFCAvailable || !this.userProfile) {
      this.nfcStatus = 'error';
      this.nfcMessage = 'NFC not available or user profile not loaded';
      return;
    }

    const tipLink = `https://tips.izinga.co.za/tip?messengerId=${this.userProfile.id}`;
    
    try {
      this.nfcStatus = 'writing';
      this.nfcMessage = 'Preparing to write comprehensive user data to NFC tag...';
      
      // Create enhanced NDEF message with multiple records
      const ndefMessage = {
        records: [
          {
            recordType: "url",
            data: tipLink
          },
          {
            recordType: "text",
            data: `iZinga Tip Card - ${this.userProfile.name}`,
            lang: "en"
          },
          {
            recordType: "text", 
            data: `Contact: ${this.userProfile.mobileNumber}`,
            lang: "en"
          }
        ]
      };

      this.nfcMessage = 'Hold your device near an NFC tag to write user data...';

      const nfcWriter = new (window as any).NDEFWriter();
      await nfcWriter.write(ndefMessage);
      
      this.nfcStatus = 'success';
      this.nfcMessage = `NFC tag written with ${this.userProfile.name}'s tip card data!`;
      
      setTimeout(() => this.clearNFCStatus(), 4000);
      
    } catch (error: any) {
      console.error('Enhanced NFC write failed:', error);
      this.nfcStatus = 'error';
      this.nfcMessage = 'Failed to write enhanced user data to NFC tag.';
      
      setTimeout(() => this.clearNFCStatus(), 3000);
    }
  }

}
