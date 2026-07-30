import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CallSession } from './call-session.entity';
import { Repository } from 'typeorm';
import { InitiateCallDto } from './dtos/initiate-call.dto';
import { CallStatus } from './enums/call-status.enum';
import { CallType } from './enums/call-type.enum';
import { AppLogger } from '../../logger/logger.service';
import { QueryFilterProvider } from '../../common/providers/query-filter-provider';
import { PaginationProvider } from '../../common/pagination/providers/pagination.provider';
import { CallHistoryQueryDto } from './dtos/call-history-query.dto';

@Injectable()
export class CallService {
  constructor(
    @InjectRepository(CallSession)
    private readonly callRepo: Repository<CallSession>,
    private readonly queryFilterProvider: QueryFilterProvider,
    private readonly paginateProvider: PaginationProvider,
    private readonly logger: AppLogger,
  ) {}

  async initiateCall(
    callerId: string,
    dto: InitiateCallDto,
  ): Promise<CallSession> {
    if (callerId === dto.calleeId) {
      throw new BadRequestException('You cannot call yourself');
    }

    // Check if callee already has an active/ringing call
    const existingCall = await this.callRepo.findOne({
      where: [
        {
          callerId,
          status: CallStatus.RINGING,
        },
        {
          callerId,
          status: CallStatus.ACTIVE,
        },
        {
          calleeId: callerId,
          status: CallStatus.RINGING,
        },
        {
          calleeId: callerId,
          status: CallStatus.ACTIVE,
        },
        {
          callerId: dto.calleeId,
          status: CallStatus.RINGING,
        },
        {
          callerId: dto.calleeId,
          status: CallStatus.ACTIVE,
        },
        {
          calleeId: dto.calleeId,
          status: CallStatus.RINGING,
        },
        {
          calleeId: dto.calleeId,
          status: CallStatus.ACTIVE,
        },
      ],
    });

    if (existingCall) {
      throw new BadRequestException('User is already in a call');
    }

    const session = this.callRepo.create({
      callerId,
      calleeId: dto.calleeId,
      type: dto.type,
      status: CallStatus.INITIATED,
      conversationId: dto.conversationId,
    });

    const saved = await this.callRepo.save(session);

    this.logger.log(
      `Call ${saved.id} initiated: ${callerId} -> ${dto.calleeId} (${dto.type})`,
    );

    return saved;
  }

  async updateStatus(
    callId: string,
    requesterId: string,
    newStatus: CallStatus,
  ): Promise<CallSession> {
    const call = await this.findById(callId);

    // Validate who is allowed to trigger which transistion
    this.assertTransitionAllowed(call, requesterId, newStatus);

    // Ignore redundant transitions
    if (call.status === newStatus) return call;

    call.status = newStatus;

    if (newStatus === CallStatus.RINGING) {
      // No timestamp change
      // Just change status
    }

    if (newStatus === CallStatus.ACTIVE) {
      call.startedAt = new Date();
    }

    if (
      newStatus === CallStatus.ENDED ||
      newStatus === CallStatus.DECLINED ||
      newStatus === CallStatus.MISSED ||
      newStatus === CallStatus.CANCELLED ||
      newStatus === CallStatus.FAILED
    ) {
      call.endedAt = new Date();
      if (call.startedAt) {
        call.durationSeconds = Math.round(
          (call.endedAt.getTime() - call.startedAt.getTime()) / 1000,
        );
      }
    }

    return this.callRepo.save(call);
  }

  private assertTransitionAllowed(
    call: CallSession,
    requesterId: string,
    newStatus: CallStatus,
  ) {
    const isCaller = call.callerId === requesterId;
    const isCallee = call.calleeId === requesterId;
    const isSystem = requesterId === 'system';

    switch (newStatus) {
      case CallStatus.RINGING:
        if (!isSystem)
          throw new ForbiddenException('Only system can set RINGING');
        break;
      case CallStatus.ACTIVE:
        if (!isCallee)
          throw new ForbiddenException('Only the callee can answer');
        break;
      case CallStatus.DECLINED:
        if (!isCallee)
          throw new ForbiddenException('Only the callee can decline');
        break;
      case CallStatus.CANCELLED:
        if (!isCaller)
          throw new ForbiddenException('Only the caller can answer');
        break;
      case CallStatus.ENDED:
        if (!isCaller && !isCallee)
          throw new ForbiddenException('Only call participants can end a call');
        break;
      case CallStatus.MISSED:
      case CallStatus.FAILED:
        if (!isSystem)
          throw new ForbiddenException('Only system can set this status');
        break;
    }
  }

  async getCallHistory(
    userId: string,
    query: CallHistoryQueryDto,
    baseUrl?: string,
  ) {
    let qb = this.callRepo
      .createQueryBuilder('call')
      .leftJoinAndSelect('call.caller', 'caller')
      .leftJoinAndSelect('call.callee', 'callee')
      .where('(call.callerId = :userId OR call.calleeId = :userId)', {
        userId,
      });

    if (query.type) {
      qb.andWhere('call.type = :type', {
        type: query.type,
      });
    }

    qb = this.queryFilterProvider.applyFilters(qb, query, {
      alias: 'call',

      searchableFields: [
        'caller:firstName',
        'caller:lastName',
        'caller:email',
        'callee:firstName',
        'callee:lastName',
        'callee:email',
      ],

      secondaryAliases: {
        caller: 'caller',
        callee: 'callee',
      },

      allowedSortFields: ['createdAt', 'duration', 'type', 'status'],

      sortMap: {
        newest: {
          field: 'createdAt',
          order: 'DESC',
        },
        oldest: {
          field: 'createdAt',
          order: 'ASC',
        },
      },

      dateField: 'createdAt',
    });

    if (!query.sortOrder) {
      qb.orderBy('call.createdAt', 'DESC');
    }

    return this.paginateProvider.paginateQuery(qb, query, baseUrl);
  }

  async findById(callId: string): Promise<CallSession> {
    const call = await this.callRepo.findOne({
      where: {
        id: callId,
      },
      relations: ['caller', 'callee'],
    });

    if (!call) throw new NotFoundException(`Call session ${callId} not found`);
    return call;
  }

  buildCallSummaryMessage(call: CallSession): string {
    const icon = call.type === CallType.VIDEO ? '📹' : '📞';
    const label = call.type === CallType.VIDEO ? 'Video call' : 'Voice call';

    if (!call.durationSeconds) {
      const outcome =
        call.status === CallStatus.MISSED
          ? 'Missed call'
          : call.status === CallStatus.DECLINED
            ? 'Declined'
            : 'Cancelled';
      return `${icon} ${outcome}`;
    }

    const mins = Math.floor(call.durationSeconds / 60);
    const secs = call.durationSeconds % 60;
    const duration =
      mins > 0
        ? `${mins} min${mins > 1 ? 's' : ''} ${secs} sec`
        : `${secs} sec`;

    return `${icon} ${label} · ${duration}`;
  }
}
