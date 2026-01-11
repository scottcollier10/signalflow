"""
Analysis Module

Provides workflow execution analysis capabilities including:
- Critical path calculation
- Bottleneck detection (coming in Week 3 Day 2)
"""

from .critical_path import CriticalPathAnalyzer, CriticalPathResult

__all__ = ['CriticalPathAnalyzer', 'CriticalPathResult']
