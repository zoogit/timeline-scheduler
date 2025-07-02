import React from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

function ExportButton({ timelineData, startHour, blockCount }) {
  const getColorHexForUser = (user) => {
    const colorMap = {
      Ashley: '3E8ED0',
      Doue: 'D636A6',
      Danissa: '9C27B0',
      Matt: 'FF9800',
      Marie: '4CAF50',
      Shaida: 'F44336',
      // Add others as needed
    };
    return colorMap[user] || 'CCCCCC';
  };

  const exportToExcel = () => {
    const times = Array.from({ length: blockCount }, (_, i) => {
      const hour = startHour + Math.floor(i / 2);
      const min = i % 2 === 0 ? '00' : '30';
      const suffix = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 === 0 ? 12 : hour % 12;
      return `${hour12}:${min} ${suffix}`;
    });

    const sheetData = [['Team Member', ...times]];
    const cellStyles = [];

    for (const user in timelineData) {
      const row = [user];
      const styleRow = [{ s: {} }];

      const blocks = timelineData[user] || Array(blockCount).fill(null);

      for (let i = 0; i < blockCount; i++) {
        const block = blocks[i];

        if (block) {
          const cellValue = block.type === 'break' ? 'Break' : block.ticket;
          const fillColor =
            block.type === 'break' ? 'F0F0F0' : getColorHexForUser(block.user);

          row.push(cellValue);
          styleRow.push({
            v: cellValue,
            s: {
              fill: {
                patternType: 'solid',
                fgColor: { rgb: fillColor },
              },
              font: {
                bold: block.type === 'break',
                color: { rgb: block.type === 'break' ? '28A745' : 'FFFFFF' },
              },
              alignment: { horizontal: 'center' },
            },
          });
        } else {
          row.push('');
          styleRow.push({ v: '', s: {} });
        }
      }

      sheetData.push(row);
      cellStyles.push(styleRow);
    }

    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

    for (let r = 1; r < cellStyles.length + 1; r++) {
      for (let c = 1; c <= blockCount; c++) {
        const cellAddress = XLSX.utils.encode_cell({ r, c });
        const styled = cellStyles[r - 1][c];
        if (styled && styled.s) {
          worksheet[cellAddress] = {
            ...(worksheet[cellAddress] || {}),
            v: styled.v,
            s: styled.s,
          };
        }
      }
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Schedule');

    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
      cellStyles: true,
    });

    const file = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    saveAs(
      file,
      `Team_Schedule_${new Date().toISOString().split('T')[0]}.xlsx`
    );
  };

  return (
    <button className="export-btn" onClick={exportToExcel}>
      Export to Excel
    </button>
  );
}

export default ExportButton;
