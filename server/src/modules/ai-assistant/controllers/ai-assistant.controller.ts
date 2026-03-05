import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../../common/enums/user-role.enum';
import { ChatQueryDto } from '../dto/chat-query.dto';
import { AiAssistantService } from '../services/ai-assistant.service';

@Controller('ai-assistant')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiAssistantController {
  constructor(private readonly aiAssistantService: AiAssistantService) {}

  @Post('chat')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  async chat(@Body() body: ChatQueryDto, @Req() req: any) {
    const user = req.user as { id: string; role: string; branchId: string | null };
    return this.aiAssistantService.askQuestion({
      question: body.question,
      branchId: body.branchId || user?.branchId || undefined,
      requestedByUserId: user?.id,
      requestedByRole: user?.role,
      lowStockThreshold: body.lowStockThreshold,
      period: body.period,
    });
  }
}
