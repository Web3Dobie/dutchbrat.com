// Temporary debug version - add this to see what data you're getting

'use client';

import React, { useEffect } from 'react';
import { useLatestBriefing } from '../../lib/useLatestBriefing';

export default function LatestBriefingCard() {
  const { briefingData, loading, error, refreshBriefing } = useLatestBriefing();

  // DEBUG: Log the actual data structure
  useEffect(() => {
    if (briefingData) {
      console.log('🔍 Full briefingData:', briefingData);
      console.log('🔍 Sentiment:', briefingData.sentiment);
      console.log('🔍 Momentum:', briefingData.momentum);
      console.log('🔍 Sectors:', briefingData.sectors);
    }
  }, [briefingData]);

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-lg p-6 border border-gray-700 animate-pulse">
        <div className="text-center text-gray-400">Loading latest briefing...</div>
      </div>
    );
  }

  if (error || !briefingData) {
    return (
      <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
        <div className="text-center">
          <div className="text-4xl mb-2">📊</div>
          <h3 className="text-lg font-semibold text-white mb-2">Market Analysis in Progress</h3>
          <p className="text-gray-400 text-sm mb-4">
            {error || "Latest briefing will appear here shortly"}
          </p>
          <button 
            onClick={refreshBriefing}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  // SAFE ACCESS: Check if briefing exists
  if (!briefingData.briefing) {
    return (
      <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
        <div className="text-center">
          <div className="text-yellow-500 text-lg mb-2">⚠️ No briefing data available</div>
          <pre className="text-xs text-gray-500 bg-gray-800 p-2 rounded overflow-auto">
            {JSON.stringify(briefingData, null, 2)}
          </pre>
        </div>
      </div>
    );
  }

  const { briefing, sentiment, momentum, sectors, insights, summary } = briefingData;

  return (
    <div className="bg-gray-900 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">{briefing.title || 'Unknown Briefing'}</h3>
        <time className="text-xs text-gray-400">
          {briefing.created_at ? new Date(briefing.created_at).toLocaleString() : 'Unknown time'}
        </time>
      </div>

      {/* DEBUG: Raw data display */}
      <details className="mb-4">
        <summary className="text-xs text-gray-500 cursor-pointer">🔍 Debug Data</summary>
        <pre className="text-xs text-gray-500 bg-gray-800 p-2 rounded mt-2 overflow-auto max-h-40">
          {JSON.stringify({ sentiment, momentum, sectors }, null, 2)}
        </pre>
      </details>

      {/* Sentiment Visual - SAFE */}
      {sentiment && (
        <div className="mb-4">
          <div 
            className="flex items-center px-3 py-2 rounded-lg"
            style={{ 
              backgroundColor: (sentiment.color || '#6b7280') + '20', 
              borderLeft: `4px solid ${sentiment.color || '#6b7280'}` 
            }}
          >
            <span className="text-2xl mr-3">{sentiment.emoji || '📊'}</span>
            <div>
              <div className="font-medium text-white">{sentiment.description || 'No description'}</div>
              {sentiment.confidence && typeof sentiment.confidence === 'number' && (
                <div className="text-sm text-gray-400">
                  Confidence: {(sentiment.confidence * 100).toFixed(0)}%
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Momentum Indicators - SAFE */}
      {momentum && (
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-300 mb-2">Market Momentum</div>
          <div className="flex space-x-2 text-xs">
            <div 
              className="px-2 py-1 rounded bg-green-600 text-white font-medium"
              style={{ width: `${Math.max(momentum.bullish_percentage || 0, 10)}%`, minWidth: '60px' }}
            >
              {(momentum.bullish_percentage || 0).toFixed(0)}% Bullish
            </div>
            <div 
              className="px-2 py-1 rounded bg-red-600 text-white font-medium"
              style={{ width: `${Math.max(momentum.bearish_percentage || 0, 10)}%`, minWidth: '60px' }}
            >
              {(momentum.bearish_percentage || 0).toFixed(0)}% Bearish
            </div>
          </div>
        </div>
      )}

      {/* Sector Highlights - SAFE */}
      {sectors && Array.isArray(sectors) && sectors.length > 0 && (
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-300 mb-2">Sector Highlights</div>
          <div className="space-y-1">
            {sectors.map((sector, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="mr-2">{sector.emoji || '📊'}</span>
                  <span className="text-sm text-gray-300">{sector.name || 'Unknown Sector'}</span>
                </div>
                <span className={`text-sm font-medium ${
                  (sector.performance || 0) > 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {(sector.performance || 0) > 0 ? '+' : ''}{(sector.performance || 0).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Insights - SAFE */}
      {insights && Array.isArray(insights) && insights.length > 0 && (
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-300 mb-2">Key Insights</div>
          <ul className="space-y-1">
            {insights.slice(0, 3).map((insight, index) => (
              <li key={index} className="text-sm text-gray-400 flex items-start">
                <span className="text-blue-400 mr-2">•</span>
                {insight || 'No insight available'}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Summary - SAFE */}
      {summary && (
        <div className="mb-4">
          <p className="text-sm text-gray-300 leading-relaxed">{summary}</p>
        </div>
      )}

      {/* Action Links - SAFE */}
      <div className="flex space-x-3">
        {briefing.urls?.website && (
          <a 
            href={briefing.urls.website} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex-1 px-4 py-2 bg-blue-600 text-white text-center rounded hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Read Full Analysis
          </a>
        )}
        {briefing.urls?.twitter && (
          <a 
            href={briefing.urls.twitter} 
            target="_blank" 
            rel="noopener noreferrer"
            className="px-4 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors text-sm font-medium"
          >
            View Tweet
          </a>
        )}
      </div>
    </div>
  );
}