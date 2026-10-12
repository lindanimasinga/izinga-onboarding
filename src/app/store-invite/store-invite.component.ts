import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IzingaOrderManagementService,
  InviteCodeResponse
} from '../service/izinga-order-management.service';
import { StorageService } from '../service/storage-service.service';
import { FirebaseService } from '../service/firebase.service';
import { AnalyticsService } from '../service/analytics.service';

/**
 * INVITE-DRV-01 / T-07 — Public invite landing page for drivers.
 *
 * Route: /indivisuals/store-invite?code={invitationCode}  (NO auth guard)
 *
 * A driver arrives here from a WhatsApp deep-link. The component:
 *  1. Loads the invite details via GET /invite/{code} (public, no Bearer token).
 *  2. Renders one of seven states: Loading, Not Found, Already Responded,
 *     Expired, Pending (with Accept/Reject), Accepted, Rejected.
 *  3. Before Accept/Reject, checks whether the driver is authenticated;
 *     if not, redirects to /indivisuals/verify?returnUrl=<current path> so the
 *     OTP flow can bring them back here (REQ-06, AC-13, AC-14).
 *  4. Routes accept/reject to the correct backend endpoint based on contextType
 *     from the invite response (AC-15, AC-16).
 */
@Component({
  selector: 'app-store-invite',
  templateUrl: './store-invite.component.html',
  styleUrls: ['./store-invite.component.css']
})
export class StoreInviteComponent implements OnInit {

  /** Invite code read from ?code= query param. */
  inviteCode: string | null = null;

  /** Invite details returned by GET /invite/{code}. */
  invite: InviteCodeResponse | null = null;

  /** Current render state — drives the template *ngIf switches. */
  state: 'loading' | 'not-found' | 'already-responded' | 'expired' | 'pending' | 'accepted' | 'rejected' = 'loading';

  /** Error message for the error banner shown during Accept/Reject. */
  actionError: string | null = null;

  /** True while an accept or reject HTTP call is in flight. */
  isActing = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private izingaService: IzingaOrderManagementService,
    private storageService: StorageService,
    private firebaseService: FirebaseService,
    private analytics: AnalyticsService
  ) {}

  ngOnInit(): void {
    this.analytics.logScreenView('store_invite_landing');

    this.route.queryParams.subscribe(params => {
      this.inviteCode = params['code'] || null;
      if (!this.inviteCode) {
        this.state = 'not-found';
        return;
      }
      this.loadInvite();
    });
  }

  // ── Data loading ──────────────────────────────────────────────────────────

  private loadInvite(): void {
    this.state = 'loading';
    this.actionError = null;

    this.izingaService.getInviteByCode(this.inviteCode!).subscribe({
      next: (data) => {
        this.invite = data;
        this.resolveState(data);
      },
      error: (err) => {
        if (err?.status === 404) {
          this.state = 'not-found';
        } else {
          // Treat unexpected errors the same as not-found for the driver UX
          this.state = 'not-found';
        }
      }
    });
  }

  private resolveState(invite: InviteCodeResponse): void {
    if (invite.status === 'ACCEPTED' || invite.status === 'REJECTED') {
      this.state = 'already-responded';
      return;
    }

    if (invite.status === 'EXPIRED') {
      this.state = 'expired';
      return;
    }

    // PENDING — check if expiry has passed client-side as a belt-and-suspenders guard
    if (invite.status === 'PENDING') {
      const expiresAt = new Date(String(invite.expiresAt));
      if (expiresAt < new Date()) {
        this.state = 'expired';
        return;
      }
    }

    this.state = 'pending';
  }

  // ── Auth guard ────────────────────────────────────────────────────────────

  /**
   * Returns true if a Firebase user is currently authenticated.
   * Uses auth.currentUser directly to avoid triggering the session-expired
   * redirect that getFirebaseIdToken() would fire for an unauthenticated driver
   * landing here cold from WhatsApp.
   */
  private get isAuthenticated(): boolean {
    return !!this.firebaseService.auth.currentUser;
  }

  private redirectToVerify(): void {
    // Build the returnUrl: the current path + query string so the driver comes
    // back to exactly this invite after OTP verification.
    const returnUrl = `/indivisuals/store-invite?code=${encodeURIComponent(this.inviteCode!)}`;
    this.router.navigate(['/indivisuals/verify'], { queryParams: { returnUrl } });
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  acceptInvite(): void {
    if (!this.invite || !this.inviteCode) { return; }

    if (!this.isAuthenticated) {
      this.redirectToVerify();
      return;
    }

    this.isActing = true;
    this.actionError = null;

    const accept$ = this.invite.contextType === 'STORE'
      ? this.izingaService.acceptStoreInvite(this.invite.storeId, this.inviteCode)
      : this.izingaService.acceptMessengerAdminInvite(this.invite.storeId, this.inviteCode);

    accept$.subscribe({
      next: () => {
        this.isActing = false;
        this.state = 'accepted';
        this.analytics.logEvent('invite_accepted');
      },
      error: (err) => {
        this.isActing = false;
        this.handleActionError(err);
      }
    });
  }

  rejectInvite(): void {
    if (!this.invite || !this.inviteCode) { return; }

    if (!this.isAuthenticated) {
      this.redirectToVerify();
      return;
    }

    this.isActing = true;
    this.actionError = null;

    const reject$ = this.invite.contextType === 'STORE'
      ? this.izingaService.rejectStoreInvite(this.invite.storeId, this.inviteCode)
      : this.izingaService.rejectMessengerAdminInvite(this.invite.storeId, this.inviteCode);

    reject$.subscribe({
      next: () => {
        this.isActing = false;
        this.state = 'rejected';
        this.analytics.logEvent('invite_rejected');
      },
      error: (err) => {
        this.isActing = false;
        this.handleActionError(err);
      }
    });
  }

  private handleActionError(err: any): void {
    if (err?.status === 403) {
      this.actionError = 'This invite was sent to a different phone number. Please check with the store.';
    } else if (err?.status === 410) {
      // Invite expired between landing and accept/reject
      this.state = 'expired';
    } else if (err?.status === 409) {
      this.actionError = 'You are already linked to another team. Contact support if this is an error.';
    } else {
      this.actionError = 'Something went wrong. Please try again.';
    }
  }

  // ── Template helpers ──────────────────────────────────────────────────────

  get contextName(): string {
    if (!this.invite) { return 'iZinga Team'; }
    if (this.invite.contextType === 'MESSENGER_ADMIN' || !this.invite.storeName) {
      return 'iZinga Team';
    }
    return this.invite.storeName;
  }

  get formattedExpiry(): string {
    if (!this.invite) { return ''; }
    try {
      const date = new Date(String(this.invite.expiresAt));
      return date.toLocaleDateString('en-ZA', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return this.invite.expiresAt;
    }
  }

  goToDashboard(): void {
    this.router.navigate(['/indivisuals/dashboard']);
  }
}
