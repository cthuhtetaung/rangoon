import { Controller, MessageEvent, Req, Sse, UseGuards } from '@nestjs/common';
import { Observable } from 'rxjs';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RealtimeService } from '../services/realtime.service';

@Controller('realtime')
@UseGuards(JwtAuthGuard)
export class RealtimeController {
  constructor(private readonly realtimeService: RealtimeService) {}

  @Sse('stream')
  stream(@Req() req: any): Observable<MessageEvent> {
    return this.realtimeService.createUserStream(req.user || {});
  }
}
