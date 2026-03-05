import { Injectable, MessageEvent } from '@nestjs/common';
import { filter, interval, map, merge, Observable, Subject } from 'rxjs';

type RealtimeEvent = {
  type: string;
  branchId?: string | null;
  payload?: Record<string, any>;
  ts: string;
};

@Injectable()
export class RealtimeService {
  private readonly stream$ = new Subject<RealtimeEvent>();

  emit(type: string, branchId?: string | null, payload?: Record<string, any>) {
    this.stream$.next({
      type,
      branchId: branchId ?? null,
      payload: payload || {},
      ts: new Date().toISOString(),
    });
  }

  createUserStream(user: { role?: string; branchId?: string | null }): Observable<MessageEvent> {
    const role = String(user?.role || '').toLowerCase();
    const branchId = user?.branchId ?? null;
    const canSeeAll = role === 'admin' || role === 'owner' || role === 'manager';

    const events$ = this.stream$.pipe(
      filter((event) => canSeeAll || !event.branchId || event.branchId === branchId),
      map((event) => ({ data: event })),
    );

    const heartbeat$ = interval(25000).pipe(
      map(() => ({ data: { type: 'heartbeat', ts: new Date().toISOString() } })),
    );

    return merge(events$, heartbeat$);
  }
}
