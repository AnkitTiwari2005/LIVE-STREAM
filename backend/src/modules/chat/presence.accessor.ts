/**
 * Global presence accessor — holds the singleton PresenceService reference
 * so it can be accessed by controllers in other modules (e.g. LiveKitWebhookController)
 * without introducing a circular NestJS module dependency.
 *
 * Set once by ChatGateway.afterInit() during application bootstrap.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _presenceService: any = null;

export const PresenceAccessor = {
  set(svc: any) {
    _presenceService = svc;
  },
  get(): any {
    return _presenceService;
  },
};
