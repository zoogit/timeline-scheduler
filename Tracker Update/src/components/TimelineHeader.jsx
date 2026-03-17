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

      // Calculate correct UK offset accounting for both US and UK DST
      const getUKOffset = () => {
        const now = new Date();
        const year = now.getFullYear();

        // US PDT starts: 2nd Sunday of March
        const pdtStart = new Date(year, 2, 1);
        pdtStart.setDate(1 + (7 - pdtStart.getDay()) % 7 + 7);

        // US PDT ends: 1st Sunday of November
        const pdtEnd = new Date(year, 10, 1);
        pdtEnd.setDate(1 + (7 - pdtEnd.getDay()) % 7);

        // UK BST starts: last Sunday of March
        const bstStart = new Date(year, 2, 31);
        bstStart.setDate(31 - bstStart.getDay());

        // UK BST ends: last Sunday of October
        const bstEnd = new Date(year, 9, 31);
        bstEnd.setDate(31 - bstEnd.getDay());

        const usIsPDT = now >= pdtStart && now < pdtEnd;
        const ukIsBST = now >= bstStart && now < bstEnd;

        // Base PST (UTC-8) to GMT (UTC+0) = 8
        // US on PDT (UTC-7): subtract 1; UK on BST (UTC+1): add 1
        return 8 - (usIsPDT ? 1 : 0) + (ukIsBST ? 1 : 0);
      };

      // Define timezone offsets from PST
      const timezoneOffsets = {
        PST: 0,  // PST is the base (no offset)
        CST: 2,  // CST is 2 hours ahead of PST
        EST: 3,  // EST is 3 hours ahead of PST
        GMT: getUKOffset(),  // Adjusts automatically for US and UK DST
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
