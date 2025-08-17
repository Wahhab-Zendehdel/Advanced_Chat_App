// src/mediasoup.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import * as mediasoup from 'mediasoup';
import { types } from 'mediasoup';

@Injectable()
export class MediasoupService implements OnModuleInit {
  private worker: types.Worker;
  private router: types.Router;
  // FIX: Create a map to manually store and manage transports.
  private transports = new Map<string, types.WebRtcTransport>();

  async onModuleInit() {
    this.worker = await mediasoup.createWorker({
      logLevel: 'warn',
    });

    this.worker.on('died', () => {
      console.error('mediasoup worker has died');
      setTimeout(() => process.exit(1), 2000);
    });

    const mediaCodecs: types.RtpCodecCapability[] = [
      {
        kind: 'audio',
        mimeType: 'audio/opus',
        clockRate: 48000,
        channels: 2,
        // FIX: Added the required 'preferredPayloadType' property.
        preferredPayloadType: 111,
      },
    ];

    this.router = await this.worker.createRouter({ mediaCodecs });
  }

  getRouterRtpCapabilities(): types.RtpCapabilities {
    return this.router.rtpCapabilities;
  }

  async createWebRtcTransport(): Promise<{ transport: types.WebRtcTransport; params: any }> {
    const transport = await this.router.createWebRtcTransport({
      listenIps: [{ ip: '0.0.0.0', announcedIp: '127.0.0.1' }], // Use 127.0.0.1 for localhost
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
    });

    // Store the transport in our map.
    this.transports.set(transport.id, transport);

    // When the transport is closed, remove it from the map.
    // FIX: The 'close' event is on the transport's observer property.
    transport.observer.on('close', () => {
      this.transports.delete(transport.id);
    });

    return {
      transport,
      params: {
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
      },
    };
  }

  findTransport(transportId: string): types.WebRtcTransport | undefined {
    // FIX: Look up the transport in our local map instead of the router.
    return this.transports.get(transportId);
  }
}
