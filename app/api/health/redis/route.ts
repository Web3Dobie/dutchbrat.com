// frontend/app/api/health/redis/route.ts
import { NextResponse } from 'next/server';
import { getRedisService } from '../../../../lib/redis';

export async function GET() {
    const redis = getRedisService();
    
    try {
        const status = await redis.getStatus();
        
        const response = {
            timestamp: new Date().toISOString(),
            redis: {
                connected: status.connected,
                status: status.status,
                keyCount: status.keyCount,
                memoryUsed: status.memory?.used_memory_human,
                memoryPeak: status.memory?.used_memory_peak_human,
            },
            cache: {
                service: 'briefings-cache',
                ttl: {
                    briefings: '6 hours',
                    list: '30 minutes',
                    locks: '30 seconds'
                }
            }
        };

        const httpStatus = status.connected ? 200 : 503;
        
        return NextResponse.json(response, { status: httpStatus });
        
    } catch (error: any) {
        console.error('Redis health check failed:', error);
        
        return NextResponse.json({
            timestamp: new Date().toISOString(),
            redis: {
                connected: false,
                status: 'error',
                error: error.message
            },
            cache: {
                service: 'briefings-cache',
                status: 'unavailable'
            }
        }, { status: 503 });
    }
}