// File: frontend/lib/useLatestBriefing.ts
// Create this file in your DutchBrat website frontend

'use client';

import { useState, useEffect } from 'react';

interface BriefingData {
  success: boolean;
  briefing: {
    id: number;
    type: string;
    title: string;
    created_at: string;
    urls: {
      website: string | null;
      twitter: string | null;
    };
  } | null;
  sentiment: {
    sentiment: string;
    confidence?: number;
    emoji: string;
    color: string;
    description: string;
  };
  momentum: {
    bullish_percentage: number;
    bearish_percentage: number;
    neutral_percentage: number;
    momentum_direction: string;
  };
  sectors: Array<{
    type: 'top_performer' | 'underperformer';
    name: string;
    performance: number;
    emoji: string;
  }>;
  insights: string[];
  summary: string;
  confidence: string;
  health_score: number;
  lastUpdated: string;
}

interface UseLatestBriefingReturn {
  briefingData: BriefingData | null;
  loading: boolean;
  error: string | null;
  refreshBriefing: () => Promise<void>;
  // Helper accessors
  briefing: BriefingData['briefing'] | null;
  sentiment: BriefingData['sentiment'] | null;
  momentum: BriefingData['momentum'] | null;
  sectors: BriefingData['sectors'];
  insights: BriefingData['insights'];
  summary: string;
  confidence: string;
  healthScore: number;
}

export const useLatestBriefing = (): UseLatestBriefingReturn => {
  const [briefingData, setBriefingData] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use your internal Docker networking - the frontend container can call htd-agent directly
  const API_BASE_URL = '/api/hedgefund-news'; // Use your existing proxy route

  const fetchLatestBriefing = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Call your new endpoint via the existing proxy pattern
      const response = await fetch('/api/latest-briefing', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        cache: 'no-store', // Ensure fresh data
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: BriefingData = await response.json();
      
      if (data.success) {
        setBriefingData(data);
        setError(null);
        console.log('✅ Latest briefing loaded:', data.briefing?.title);
      } else {
        setError('No recent briefing available');
        setBriefingData(null);
      }
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes('fetch')) {
          setError('Unable to connect to briefing service');
        } else {
          setError('Failed to load briefing data');
        }
        console.error('Briefing fetch error:', err);
      } else {
        setError('An unexpected error occurred');
      }
      setBriefingData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchLatestBriefing();
    
    // Refresh every 5 minutes (your briefings are generated 4x daily)
    const interval = setInterval(fetchLatestBriefing, 5 * 60 * 1000);
    
    // Cleanup on unmount
    return () => {
      clearInterval(interval);
    };
  }, []);

  // Manual refresh function
  const refreshBriefing = async () => {
    await fetchLatestBriefing();
  };

  return { 
    briefingData, 
    loading, 
    error, 
    refreshBriefing,
    // Helper functions to access nested data easily
    briefing: briefingData?.briefing || null,
    sentiment: briefingData?.sentiment || null,
    momentum: briefingData?.momentum || null,
    sectors: briefingData?.sectors || [],
    insights: briefingData?.insights || [],
    summary: briefingData?.summary || '',
    confidence: briefingData?.confidence || 'moderate',
    healthScore: briefingData?.health_score || 50,
  };
};