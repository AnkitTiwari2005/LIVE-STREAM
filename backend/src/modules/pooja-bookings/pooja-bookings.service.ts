import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { KycStatus, PoojaBookingStatus, UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreatePoojaBookingDto, RespondPoojaBookingDto } from './dto/pooja-booking.dto';

const LEGACY_CATALOG_ID_TO_SLUG: Record<string, string> = {
  '73b080c9-8bfb-41e6-8c5a-dba40c9409c5': 'rohit-tiwari',
  '8cfb4f7f-f337-4475-8885-d0d91ae0939e': 'santosh-shastri',
  pandit_ravi_pathak: 'ravi-pathak',
  pandit_nitin_sharma: 'nitin-sharma',
  pandit_umesh_shastri: 'umesh-shastri',
  acharya_kuber_tripathi: 'kuber-tripathi',
  pandit_subhash_shastri: 'subhash-shastri',
  pandit_sumit_shastri: 'sumit-shastri',
  pandit_nandkishor_tripathi: 'nandkishor-tripathi',
};

function sanitizeText(value: string | undefined | null, maxLen: number): string {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, maxLen);
}

@Injectable()
export class PoojaBookingsService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveVerifiedPandit(panditKey: string) {
    const rawKey = sanitizeText(panditKey, 120);
    if (!rawKey) {
      throw new BadRequestException('Pandit identifier is required');
    }
    const mappedSlug = LEGACY_CATALOG_ID_TO_SLUG[rawKey] || rawKey.toLowerCase();

    const profile = await this.prisma.streamerProfile.findFirst({
      where: {
        kycStatus: KycStatus.APPROVED,
        user: {
          deletedAt: null,
          status: UserStatus.ACTIVE,
        },
        OR: [{ userId: rawKey }, { id: rawKey }, { slug: mappedSlug }],
      },
      include: {
        user: {
          select: { id: true, name: true, avatarUrl: true, role: true },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Selected verified Pandit Ji is not currently available');
    }
    return profile;
  }

  private async assertApprovedPandit(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { streamerProfile: true },
    });
    if (!user || user.deletedAt || user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Account is not active');
    }
    const isApproved =
      user.role === UserRole.STREAMER ||
      (user.role === UserRole.ADMIN && user.streamerProfile?.kycStatus === KycStatus.APPROVED);
    if (!isApproved) {
      throw new ForbiddenException('Only verified Pandit Ji accounts can access pooja requests');
    }
    return user;
  }

  private formatBooking(b: any) {
    return {
      id: b.id,
      refCode: b.refCode,
      poojaId: b.poojaId,
      poojaName: b.poojaName,
      category: b.category || 'Vedic Ritual',
      panditId: b.panditId,
      panditSlug: b.streamerProfile?.slug ?? null,
      panditName: b.pandit?.name || 'Verified Pandit Ji',
      panditAvatar: b.pandit?.avatarUrl || '/images/pandits/pandit-rohit-tiwari.webp',
      panditTitle: b.streamerProfile?.specialBadgeTitle || 'Verified Vedic Acharya',
      dakshinaCoins: b.dakshinaCoins ?? 0,
      devoteeId: b.devoteeId ?? null,
      devoteeName: b.devoteeName,
      devoteeGotra: b.devoteeGotra || 'Kashyap',
      scheduledDate: b.scheduledDate,
      timeSlot: b.timeSlot,
      sankalpIntent: b.sankalpIntent,
      status: b.status,
      confirmedTime: b.confirmedTime ?? undefined,
      roomLink: b.roomLink ?? undefined,
      declineReason: b.declineReason ?? undefined,
      confirmedAt: b.confirmedAt ?? undefined,
      createdAt: b.createdAt,
    };
  }

  async createBooking(devoteeId: string, dto: CreatePoojaBookingDto) {
    const devotee = await this.prisma.user.findUnique({
      where: { id: devoteeId },
      select: { id: true, name: true, status: true, deletedAt: true },
    });
    if (!devotee || devotee.deletedAt || devotee.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Your account cannot submit booking requests');
    }

    const panditProfile = await this.resolveVerifiedPandit(dto.panditIdOrSlug);
    if (panditProfile.userId === devoteeId) {
      throw new BadRequestException('You cannot submit a pooja booking request to yourself');
    }

    const cleanDevoteeName = sanitizeText(dto.devoteeName, 100) || devotee.name;
    const cleanGotra = sanitizeText(dto.devoteeGotra, 100) || 'Kashyap';
    const cleanPoojaName = sanitizeText(dto.poojaName, 180);
    const cleanIntent = sanitizeText(dto.sankalpIntent, 500);
    if (!cleanPoojaName || !cleanIntent) {
      throw new BadRequestException('Pooja name and sankalp intent are required');
    }

    const refCode = `PD-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const created = await this.prisma.poojaBooking.create({
      data: {
        refCode,
        devoteeId,
        devoteeName: cleanDevoteeName,
        devoteeGotra: cleanGotra,
        panditId: panditProfile.userId,
        streamerProfileId: panditProfile.id,
        poojaId: sanitizeText(dto.poojaId, 80),
        poojaName: cleanPoojaName,
        category: sanitizeText(dto.category, 100) || 'Vedic Ritual',
        dakshinaCoins: Math.max(0, Math.floor(Number(dto.dakshinaCoins) || 0)),
        scheduledDate: sanitizeText(dto.scheduledDate, 32),
        timeSlot: sanitizeText(dto.timeSlot, 120),
        sankalpIntent: cleanIntent,
        status: PoojaBookingStatus.PENDING,
      },
      include: {
        pandit: { select: { id: true, name: true, avatarUrl: true } },
        streamerProfile: { select: { id: true, slug: true, specialBadgeTitle: true } },
      },
    });

    return this.formatBooking(created);
  }

  async getMyBookings(devoteeId: string) {
    const rows = await this.prisma.poojaBooking.findMany({
      where: {
        devoteeId,
        status: { not: PoojaBookingStatus.CANCELLED },
      },
      include: {
        pandit: { select: { id: true, name: true, avatarUrl: true } },
        streamerProfile: { select: { id: true, slug: true, specialBadgeTitle: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return rows.map((r) => this.formatBooking(r));
  }

  async cancelMyBooking(devoteeId: string, bookingId: string) {
    const booking = await this.prisma.poojaBooking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Pooja booking request not found');
    if (booking.devoteeId !== devoteeId) {
      throw new ForbiddenException('You do not have permission to cancel this booking');
    }
    if (booking.status === PoojaBookingStatus.APPROVED) {
      throw new BadRequestException('Approved pooja sessions cannot be dismissed from here');
    }

    await this.prisma.poojaBooking.update({
      where: { id: bookingId },
      data: { status: PoojaBookingStatus.CANCELLED },
    });
    return { message: 'Booking request removed.', id: bookingId };
  }

  async getStreamerRequests(panditUserId: string) {
    await this.assertApprovedPandit(panditUserId);
    const rows = await this.prisma.poojaBooking.findMany({
      where: {
        panditId: panditUserId,
        status: { not: PoojaBookingStatus.CANCELLED },
      },
      include: {
        pandit: { select: { id: true, name: true, avatarUrl: true } },
        streamerProfile: { select: { id: true, slug: true, specialBadgeTitle: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return rows.map((r) => this.formatBooking(r));
  }

  async respondToRequest(panditUserId: string, bookingId: string, dto: RespondPoojaBookingDto) {
    const panditUser = await this.assertApprovedPandit(panditUserId);

    const booking = await this.prisma.poojaBooking.findUnique({
      where: { id: bookingId },
      include: {
        pandit: { select: { id: true, name: true, avatarUrl: true } },
        streamerProfile: { select: { id: true, slug: true, specialBadgeTitle: true } },
      },
    });
    if (!booking) throw new NotFoundException('Pooja booking request not found');
    if (booking.panditId !== panditUserId) {
      throw new ForbiddenException('Only the assigned Pandit Ji can respond to this request');
    }
    if (booking.status !== PoojaBookingStatus.PENDING) {
      throw new BadRequestException(`This booking request has already been marked ${booking.status}`);
    }

    const isApprove = dto.decision === 'APPROVED';
    const nextStatus = isApprove ? PoojaBookingStatus.APPROVED : PoojaBookingStatus.DECLINED;
    const confirmedTime = isApprove
      ? sanitizeText(dto.confirmedTime, 200) || `${booking.scheduledDate} • ${booking.timeSlot}`
      : null;
    const roomLink = isApprove ? sanitizeText(dto.roomLink, 300) || '/join/invite' : null;
    const declineReason = !isApprove
      ? sanitizeText(dto.declineReason, 300) || 'Pandit Ji had a scheduling conflict for this slot'
      : null;

    const updated = await this.prisma.poojaBooking.update({
      where: { id: bookingId },
      data: {
        status: nextStatus,
        confirmedTime,
        roomLink,
        declineReason,
        confirmedAt: isApprove ? new Date() : null,
      },
      include: {
        pandit: { select: { id: true, name: true, avatarUrl: true } },
        streamerProfile: { select: { id: true, slug: true, specialBadgeTitle: true } },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: panditUserId,
        actorEmail: panditUser.email,
        action: isApprove ? 'PANDIT_BOOKING_APPROVED' : 'PANDIT_BOOKING_DECLINED',
        targetResource: `PoojaBooking:${bookingId}`,
        details: {
          refCode: booking.refCode,
          poojaName: booking.poojaName,
          decision: dto.decision,
        },
      },
    });

    return this.formatBooking(updated);
  }
}
