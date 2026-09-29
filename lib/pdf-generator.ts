import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DomainResult } from './api';
import { avatarBase64 } from './avatar';

interface ReportFilters {
  maxPrice: number;
  extensions: string[];
  availability?: 'all' | 'available' | 'taken';
}

export function generateDomainReport(
  keyword: string,
  domains: DomainResult[],
  filters: ReportFilters
) {
  // Create a new PDF document in portrait mode, A4 size
  const doc = new jsPDF('p', 'pt', 'a4');
  const pageWidth = doc.internal.pageSize.width;

  // Colors & Styles from provided design images
  const darkGreen = [26, 59, 43]; // #1a3b2b
  const lightGreenHeader = [193, 235, 213]; // #c1ebd5
  const paleGrey = [246, 242, 242]; // #f6f2f2
  const badgeBg = [240, 245, 240]; // Less bright green bg
  const badgeText = [50, 100, 60]; // Less bright green text

  const availableColor = [22, 163, 74]; // Green 600
  const takenColor = [220, 38, 38]; // Red 600

  // 1. Draw Badge (Top Left)
  doc.setFillColor(badgeBg[0], badgeBg[1], badgeBg[2]);
  doc.roundedRect(40, 40, 160, 24, 6, 6, 'F');
  doc.setTextColor(badgeText[0], badgeText[1], badgeText[2]);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
  doc.text(`By Isra on ${dateStr}`, 120, 56, { align: 'center' });

  // 2. Avatar moved to the end of the document generation to prevent clipping bugs

  // 3. Document Title
  doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
  doc.setFontSize(36);
  doc.setFont('helvetica', 'bold');
  doc.text('Domain Report', 40, 120);

  // 4. Summary & Filters
  const availText = filters.availability && filters.availability !== 'all'
    ? filters.availability.charAt(0).toUpperCase() + filters.availability.slice(1)
    : 'Any';

  const extList = filters.extensions.length > 0 ? filters.extensions : ['All'];
  const keywordList = keyword.split(',').map(k => k.trim()).filter(Boolean);

  let currentX = 40;
  let currentY = 150;
  const maxContentWidth = pageWidth - 40;

  const drawFilterGroup = (label: string, values: string[]) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    const labelWidth = doc.getTextWidth(label + " ");

    if (currentX > 40 && currentX + labelWidth > maxContentWidth) {
      currentX = 40;
      currentY += 25;
    }

    doc.setTextColor(26, 59, 43); // darkGreen
    doc.text(label, currentX, currentY);
    currentX += labelWidth;

    values.forEach(value => {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const valueWidth = doc.getTextWidth(value);
      const pillWidth = valueWidth + 16;

      if (currentX + pillWidth > maxContentWidth) {
        currentX = 40 + labelWidth; // Align with previous pills on new row if possible
        if (currentX + pillWidth > maxContentWidth) {
          currentX = 40; // If still doesn't fit, start from the very left
        }
        currentY += 25;
      }

      doc.setFillColor(241, 245, 249); // slate-100
      doc.roundedRect(currentX, currentY - 13, pillWidth, 18, 4, 4, 'F');

      doc.setTextColor(50, 60, 70);
      doc.text(value, currentX + 8, currentY);

      currentX += pillWidth + 8; // gap between pills
    });

    currentX += 16; // gap to next filter group
  };

  // Row 1: Keywords
  drawFilterGroup("Keywords:", keywordList);

  // Row 2: Filters
  currentX = 40;
  currentY += 25;
  drawFilterGroup("Price:", [`Max $${filters.maxPrice}`]);
  drawFilterGroup("Extensions:", extList);
  drawFilterGroup("Status:", [availText]);

  const tableStartY = currentY + 30;

  // 5. Data Structuring: Group by Base Domain
  const grouped: Record<string, DomainResult[]> = {};
  domains.forEach(d => {
    const base = d.domain.replace(d.extension, '');
    if (!grouped[base]) grouped[base] = [];
    grouped[base].push(d);
  });

  const tableBody: any[] = [];
  const rowSpans: Record<number, number> = {};
  let rowIndex = 0;

  for (const [base, extensions] of Object.entries(grouped)) {
    rowSpans[rowIndex] = extensions.length;
    extensions.forEach((d, idx) => {
      tableBody.push([
        idx === 0 ? base : '', // Only print the base domain on the first row of the merged group
        d.extension,
        d.isAvailable ? 'Available' : 'Taken',
        d.isAvailable && d.price > 0 ? `$${d.price.toFixed(2)}` : '-' // Price valuation, leave empty (-) if taken or 0
      ]);
      rowIndex++;
    });
  }

  // 6. Draw Table
  autoTable(doc, {
    startY: tableStartY,
    head: [['Domain Name', 'Extension', 'Status', 'Price']],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: lightGreenHeader as [number, number, number],
      textColor: darkGreen as [number, number, number],
      fontStyle: 'bold',
      halign: 'left',
      lineColor: [220, 220, 220],
      lineWidth: 0.5,
      fontSize: 12,
    },
    bodyStyles: {
      textColor: [50, 50, 50],
      lineColor: [220, 220, 220],
      lineWidth: 0.5,
      fontSize: 11,
      cellPadding: 8,
    },
    columnStyles: {
      0: { fontStyle: 'bold', halign: 'left' },
      1: { halign: 'center' },
      2: { halign: 'center', fontStyle: 'bold' },
      3: { halign: 'right' },
    },
    didParseCell: function (data) {
      if (data.section === 'body') {
        // Grouped Base Domain Column
        if (data.column.index === 0) {
          if (rowSpans[data.row.index]) {
            data.cell.rowSpan = rowSpans[data.row.index];
            data.cell.styles.fillColor = paleGrey as [number, number, number];
            data.cell.styles.valign = 'middle';
            data.cell.styles.textColor = darkGreen as [number, number, number];
          }
        }
        // Availability Status Column Colors
        if (data.column.index === 2) {
          if (data.cell.raw === 'Available') {
            data.cell.styles.fillColor = [240, 250, 240];
            data.cell.styles.textColor = [40, 100, 60];
          } else {
            data.cell.styles.fillColor = [253, 240, 240];
            data.cell.styles.textColor = [160, 50, 50];
          }
          data.cell.styles.fontStyle = 'normal';
        }
        // Price Column Styling
        if (data.column.index === 3 && data.cell.raw === '-') {
          data.cell.styles.textColor = [150, 150, 150];
        }
      }
    },
    margin: { bottom: 80 } // Leave room for signature and footer
  });

  // 7. Footer & Signature on every page
  const pageCount = doc.internal.pages.length - 1;

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Draw footer line
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(40, doc.internal.pageSize.height - 70, pageWidth - 40, doc.internal.pageSize.height - 70);

    // Page Number (Left)
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
    doc.text(`PAGE ${i}`, 40, doc.internal.pageSize.height - 40);

    // Signature Area (Right)
    doc.setFontSize(11);
    doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
    doc.setFont('helvetica', 'bold');
    doc.text("© (Isra) Ben T. Degbe - 2026", pageWidth - 40, doc.internal.pageSize.height - 45, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(10);
    doc.text("Contact Me: https://on.contra.com/q7GjBp", pageWidth - 40, doc.internal.pageSize.height - 30, { align: 'right' });
  }

  // 8. Draw Avatar (Top Right)
  // Drawn at the very end to safely use clipping without breaking jsPDF rendering
  doc.setPage(1);
  const avatarX = pageWidth - 60;
  const avatarY = 52;

  try {
    // Draw the square image
    doc.addImage(avatarBase64, 'PNG', avatarX - 22, avatarY - 22, 44, 44);

    // Draw a thick white ring over the edges to mask it into a perfect circle
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(16);
    doc.circle(avatarX, avatarY, 30, 'S');
  } catch (e) {
    doc.setFillColor(250, 204, 21);
    doc.circle(avatarX, avatarY, 22, 'F');
    doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
    doc.setFontSize(16);
    doc.text("BD", avatarX, avatarY + 6, { align: 'center' });
  }

  // Download the PDF
  doc.save(`${keyword.split(',')[0].replace(/[^a-z0-9-]/g, '')}-domain-report.pdf`);
}
