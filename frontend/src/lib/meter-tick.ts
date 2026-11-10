export type TickAction = 'OK' | 'ENDED' | 'RECOVER' | 'TOPUP' | 'LOGIN' | 'TRANSIENT';

export function classifyTick(status: number, data: any): TickAction {
  if (status === 401) return 'LOGIN';
  if (status === 402) return 'TOPUP';
  if (status < 200 || status >= 300 || !data) return 'TRANSIENT';
  if (data.canContinue === true) return 'OK';
  switch (data.reason) {
    case 'STREAM_ENDED':
      return 'ENDED';
    case 'SESSION_EXPIRED':
      return 'RECOVER';
    case 'ZERO_BALANCE':
    case undefined:
      return 'TOPUP';
    default:
      return 'RECOVER';
  }
}
