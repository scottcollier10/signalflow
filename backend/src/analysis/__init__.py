"""
Analysis Module

Provides workflow execution analysis capabilities including:
- Critical path calculation
- Bottleneck detection
- Error clustering and pattern detection
- Recommendation engine with 15 detection rules
"""

from .critical_path import CriticalPathAnalyzer, CriticalPathResult
from .bottlenecks import BottleneckAnalyzer, BottleneckScore
from .error_clustering import ErrorClusteringAnalyzer, ErrorAnalysisResult, ErrorCluster
from .embeddings import ErrorEmbedder, ErrorEvent
from .recommendations import RecommendationEngine, Recommendation, Evidence

__all__ = [
    'CriticalPathAnalyzer',
    'CriticalPathResult',
    'BottleneckAnalyzer',
    'BottleneckScore',
    'ErrorClusteringAnalyzer',
    'ErrorAnalysisResult',
    'ErrorCluster',
    'ErrorEmbedder',
    'ErrorEvent',
    'RecommendationEngine',
    'Recommendation',
    'Evidence'
]
