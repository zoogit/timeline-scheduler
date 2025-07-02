import React, { useState } from 'react';

function ShiftCoveragePanel({ team }) {
  const [coverage, setCoverage] = useState({
    early: 0,
    late: 0,
  });

  const getConfigForTeam = (team) => {
    switch (team) {
      case 'Night':
        return {
          earlyLabel: 'UK 12AM',
          earlyTotal: 4,
          lateLabel: 'UK 1AM',
          lateTotal: 5,
        };
      case 'Day':
        return {
          earlyLabel: 'Night 1PM',
          earlyTotal: 4,
          lateLabel: 'Night 3PM',
          lateTotal: 2,
        };
      case 'London':
        return {
          earlyLabel: 'Day 6:30AM',
          earlyTotal: 3,
          lateLabel: 'Day 8AM',
          lateTotal: 8,
        };
      default:
        return null;
    }
  };

  const config = getConfigForTeam(team);

  const toggleTick = (windowType, index) => {
    setCoverage((prev) => {
      const current = prev[windowType];
      if (index >= current) {
        return { ...prev, [windowType]: current + 1 };
      } else {
        return { ...prev, [windowType]: current - 1 };
      }
    });
  };

  const renderTicks = (count, total, windowType) =>
    Array.from({ length: total }, (_, i) => (
      <span
        key={i}
        className={`coverage-tick ${
          i < count ? 'tick-active' : 'tick-inactive'
        }`}
        onClick={() => toggleTick(windowType, i)}
      >
        ✓
      </span>
    ));

  if (!config) return null;

  return (
    <div className="coverage-panel">
      <div className="coverage-row">
        <span className="coverage-label">{config.earlyLabel}:</span>
        {renderTicks(coverage.early, config.earlyTotal, 'early')}
      </div>
      <div className="coverage-row">
        <span className="coverage-label">{config.lateLabel}:</span>
        {renderTicks(coverage.late, config.lateTotal, 'late')}
      </div>
    </div>
  );
}

export default ShiftCoveragePanel;
