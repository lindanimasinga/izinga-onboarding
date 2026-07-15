import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { StorageService } from '../service/storage-service.service';

/**
 * RP-005b: Capture ?ref=CODE query param at the start of the business registration
 * journey so the referral code can be attributed to the Referral Partner who assisted
 * the store owner.  The code is stored in sessionStorage via StorageService and
 * attached to the StoreProfile by BusinessUpdateComponent on store creation.
 */
@Component({
  selector: 'app-welcome',
  templateUrl: './welcome-business.component.html',
  styleUrls: ['./welcome-business.component.css']
})
export class WelcomeBusinessComponent implements OnInit {

  constructor(
    private route: ActivatedRoute,
    private storageService: StorageService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const ref = params['ref'];
      if (ref) {
        this.storageService.referralPartnerRef = ref;
      }
    });
  }
}

