import React from 'react';

function TimelineHeader({
  startHour,
  blockCount,
  timezone,
  isViewAll = false,
}) {
  const timeLabels = [];

  // ✅ UPDATED: Proper timezone conversion including EST
  const convertTimeToTimezone = (hour, minute, targetTimezone) => {
    // The timeline always represents PST times as the base
    // We need to convert PST times to the selected timezone

    // Define timezone offsets from PST
    const timezoneOffsets = {
      PST: 0,  // PST is the base (no offset)
      CST: 2,  // CST is 2 hours ahead of PST
      EST: 3,  // EST is 3 hours ahead of PST
      GMT: 8,  // GMT is 8 hours ahead of PST
    };

    // Get the offset for the target timezone
    const offsetHours = timezoneOffsets[targetTimezone] || 0;

    // Apply the offset
    let convertedHour = hour + offsetHours;

    // Handle day overflow/underflow
    if (convertedHour >= 24) {
      convertedHour -= 24;
    } else if (convertedHour < 0) {
      convertedHour += 24;
    }

    // Format the time
    const period = convertedHour >= 12 ? 'PM' : 'AM';
    const displayHour =
      convertedHour === 0
        ? 12
        : convertedHour > 12
        ? convertedHour - 12
        : convertedHour;
    const displayMinute = minute.toString().padStart(2, '0');

    return `${displayHour}:${displayMinute} ${period}`;
  };

  for (let i = 0; i < blockCount; i++) {
    const hour = startHour + Math.floor(i / 2);
    const minute = i % 2 === 0 ? 0 : 30;

    // ✅ UPDATED: Use proper timezone conversion including EST
    const formattedTime = convertTimeToTimezone(hour, minute, timezone);
    timeLabels.push(formattedTime);
  }

  return (
    <div className="timeline">
      <div className="timeline-header">
        Team Member
        {/* ✅ UPDATED: Show current timezone in header */}
        <div
          className="timezone-indicator"
          style={{
            fontSize: '10px',
            color: '#6c757d',
            fontWeight: 'normal',
            marginTop: '2px',
          }}
        >
          ({timezone})
        </div>
      </div>
      <div
        className="timeline-track"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${blockCount}, 1fr)`,
          gap: '1px',
          // Force single horizontal row
          gridTemplateRows: '1fr',
          width: '100%',
        }}
      >
        {timeLabels.map((label, index) => (
          <div
            key={index}
            className={`timeline-cell timeline-header-cell ${
              isViewAll ? 'view-all-header' : 'team-view-header'
            }`}
            title={`${label} ${timezone}`} // ✅ UPDATED: Tooltip showing full timezone info
          >
            {/* ✅ SIMPLIFIED: Just wrap in span for CSS rotation - much cleaner */}
            {isViewAll ? <span className="rotated-text">{label}</span> : label}
          </div>
        ))}
      </div>
    </div>
  );
}

export default TimelineHeader;
