import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Complaint, DriverReview } from '../types';

export interface PDFIncidentReportData {
  id?: string;
  driver_name?: string;
  driver_first_name?: string;
  driver_surname?: string;
  driver_phone?: string;
  driver_email?: string;
  driver_id_number?: string;
  driver_id_number_masked?: string;
  driver_city?: string;
  driver_province?: string;
  driver_platform?: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical' | string;
  status: string;
  resolution_status?: string;
  vehicle_registration?: string;
  vehicle_make_model?: string;
  handover_date?: string;
  incident_date: string;
  description: string;
  evidence_strength?: string;
  admin_notes?: string;
  rejected_reason?: string;
  reporter_company?: string;
  created_at?: string;
}

export interface PDFExportOptions {
  companyName?: string;
  operatorName?: string;
  operatorEmail?: string;
}

/**
 * Generates an official, beautifully styled Incident Report PDF document
 */
export function exportIncidentReportToPDF(
  incident: PDFIncidentReportData,
  options: PDFExportOptions = {}
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let currentY = margin;

  // Colors
  const primaryColor: [number, number, number] = [31, 31, 31]; // #1f1f1f
  const accentColor: [number, number, number] = [40, 116, 166]; // Blue slate
  const stoneBg: [number, number, number] = [246, 247, 237]; // FleetCheck light olive
  const textDark: [number, number, number] = [20, 20, 20];
  const textMuted: [number, number, number] = [100, 100, 100];
  const borderGrey: [number, number, number] = [220, 220, 220];

  // Severity color mapping
  const getSeverityRGB = (sev: string): [number, number, number] => {
    switch (sev?.toLowerCase()) {
      case 'critical': return [185, 28, 28]; // Red
      case 'high': return [194, 65, 12]; // Orange-red
      case 'medium': return [180, 83, 9]; // Amber
      default: return [71, 85, 105]; // Slate
    }
  };

  // --- HEADER SECTION ---
  // Top header background bar
  doc.setFillColor(...primaryColor);
  doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 24, 3, 3, 'F');

  // Logo Icon Box
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin + 4, currentY + 3.5, 17, 17, 2, 2, 'F');
  
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('FC', margin + 7.5, currentY + 14.5);

  // Header Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('FLEETCHECK VERIFIED INCIDENT DOSSIER', margin + 25, currentY + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(200, 200, 200);
  doc.text('National Driver Risk Reference & Vetting Platform | POPIA Compliant', margin + 25, currentY + 16.5);

  currentY += 28;

  // Metadata Subheader Bar
  const refNumber = incident.id ? `FC-INC-${incident.id.replace('comp_', '').toUpperCase()}` : `FC-INC-${Date.now().toString().slice(-6)}`;
  const dateGenerated = new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  doc.setFillColor(...stoneBg);
  doc.setDrawColor(...borderGrey);
  doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 12, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...textDark);
  doc.text(`REFERENCE ID:`, margin + 4, currentY + 7.5);
  doc.setFont('helvetica', 'normal');
  doc.text(refNumber, margin + 32, currentY + 7.5);

  doc.setFont('helvetica', 'bold');
  doc.text(`ISSUED TO:`, margin + 75, currentY + 7.5);
  doc.setFont('helvetica', 'normal');
  doc.text(options.companyName || options.operatorName || 'Verified Fleet Owner', margin + 96, currentY + 7.5);

  doc.setFont('helvetica', 'bold');
  doc.text(`DATE EXPORTED:`, margin + 140, currentY + 7.5);
  doc.setFont('helvetica', 'normal');
  doc.text(dateGenerated, margin + 172, currentY + 7.5);

  currentY += 16;

  // --- DRIVER & VEHICLE IDENTIFICATION TABLE ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...textDark);
  doc.text('1. DRIVER & ASSET PARTICULARS', margin, currentY);
  currentY += 3;

  const driverFullName = incident.driver_name || 
    `${incident.driver_first_name || ''} ${incident.driver_surname || ''}`.trim() || 
    'Recorded Driver Profile';

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 2.8,
      textColor: textDark,
      lineColor: borderGrey,
      lineWidth: 0.2
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 42, fillColor: [250, 250, 250] },
      1: { cellWidth: 50 },
      2: { fontStyle: 'bold', cellWidth: 42, fillColor: [250, 250, 250] },
      3: { cellWidth: 48 }
    },
    body: [
      ['Driver Full Name', driverFullName, 'Platform / Operating', incident.driver_platform || 'Uber / Bolt'],
      ['Driver Contact Phone', incident.driver_phone || 'Protected / Masked', 'Driver Email', incident.driver_email || 'Protected / Masked'],
      ['National ID (POPIA)', incident.driver_id_number_masked || incident.driver_id_number || 'POPIA Masked Reference', 'Location / Province', `${incident.driver_city || 'Gauteng'}, ${incident.driver_province || 'RSA'}`],
      ['Vehicle Make & Model', incident.vehicle_make_model || 'Not specified', 'Vehicle Registration', incident.vehicle_registration || 'Not specified'],
      ['Handover Date', incident.handover_date || 'N/A', 'Incident Date', incident.incident_date || 'N/A']
    ]
  });

  currentY = (doc as any).lastAutoTable.finalY + 7;

  // --- INCIDENT CLASSIFICATION & SEVERITY ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...textDark);
  doc.text('2. INCIDENT AUDIT & SEVERITY CLASSIFICATION', margin, currentY);
  currentY += 3;

  const severityRGB = getSeverityRGB(incident.severity);
  const formattedCategory = (incident.category || '').replace(/_/g, ' ').toUpperCase();
  const formattedStatus = (incident.status || 'SUBMITTED').replace(/_/g, ' ').toUpperCase();
  const formattedResolution = (incident.resolution_status || 'UNRESOLVED').replace(/_/g, ' ').toUpperCase();

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 3,
      textColor: textDark,
      lineColor: borderGrey,
      lineWidth: 0.2
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 42, fillColor: [250, 250, 250] },
      1: { cellWidth: 50 },
      2: { fontStyle: 'bold', cellWidth: 42, fillColor: [250, 250, 250] },
      3: { cellWidth: 48 }
    },
    body: [
      ['Incident Category', formattedCategory, 'Severity Rating', `${(incident.severity || 'MEDIUM').toUpperCase()} SEVERITY`],
      ['Compliance Status', formattedStatus, 'Resolution Standing', formattedResolution],
      ['Reporting Fleet Operator', incident.reporter_company || options.companyName || 'Verified Fleet Operator', 'Evidence Quality', (incident.evidence_strength || 'Verified').toUpperCase()]
    ]
  });

  currentY = (doc as any).lastAutoTable.finalY + 7;

  // --- INCIDENT NARRATIVE & PARTICULARS ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...textDark);
  doc.text('3. DETAILED INCIDENT NARRATIVE & PARTICULARS', margin, currentY);
  currentY += 4;

  // Narrative Box
  doc.setFillColor(252, 252, 252);
  doc.setDrawColor(...borderGrey);
  const narrativeBoxHeight = 36;
  doc.roundedRect(margin, currentY, pageWidth - (margin * 2), narrativeBoxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(40, 40, 40);

  const cleanDescription = incident.description || 'No detailed narrative provided for this incident record.';
  const splitText = doc.splitTextToSize(`"${cleanDescription}"`, pageWidth - (margin * 2) - 8);
  doc.text(splitText, margin + 4, currentY + 6);

  currentY += narrativeBoxHeight + 6;

  // --- COMPLIANCE & ADMIN MODERATION NOTES ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...textDark);
  doc.text('4. COMPLIANCE AUDIT & MODERATION NOTES', margin, currentY);
  currentY += 4;

  doc.setFillColor(...stoneBg);
  doc.setDrawColor(...borderGrey);
  const adminBoxHeight = 22;
  doc.roundedRect(margin, currentY, pageWidth - (margin * 2), adminBoxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...textDark);
  doc.text('Admin Compliance Review Notes:', margin + 4, currentY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  const adminNotesText = incident.admin_notes || 
    (incident.rejected_reason ? `Rejected: ${incident.rejected_reason}` : 'Audited and verified in accordance with national operator reference criteria.');
  const splitAdminNotes = doc.splitTextToSize(adminNotesText, pageWidth - (margin * 2) - 8);
  doc.text(splitAdminNotes, margin + 4, currentY + 11.5);

  currentY += adminBoxHeight + 7;

  // --- LEGAL & POPIA PRIVACY DISCLAIMER ---
  doc.setFillColor(245, 245, 245);
  doc.setDrawColor(210, 210, 210);
  doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 24, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(90, 90, 90);
  doc.text('LEGAL NOTICE & STATUTORY PRIVACY DECLARATION (POPIA ACT 4 OF 2013)', margin + 4, currentY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  const legalNotice = 'This document is generated strictly for authorized and verified fleet operators in South Africa for legitimate vehicle vetting and risk assessment under the Protection of Personal Information Act (POPIA). The information contained herein constitutes confidential verified operator feedback. Unauthorized publication, alteration, or sharing without consent is subject to platform sanction and legal prosecution.';
  const splitLegal = doc.splitTextToSize(legalNotice, pageWidth - (margin * 2) - 8);
  doc.text(splitLegal, margin + 4, currentY + 10);

  // --- FOOTER ---
  const footerY = pageHeight - 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(150, 150, 150);
  doc.text('FleetCheck Verified Record', margin, footerY);
  doc.text(`Document Reference: ${refNumber}`, pageWidth / 2, footerY, { align: 'center' });
  doc.text(`Page 1 of 1`, pageWidth - margin, footerY, { align: 'right' });

  // Save the document
  const fileName = `FleetCheck_Incident_${incident.id || refNumber}.pdf`.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
  doc.save(fileName);

  return doc;
}

/**
 * Generates an executive summary table PDF for multiple incident reports
 */
export function exportAllIncidentsToPDF(
  incidents: PDFIncidentReportData[],
  options: PDFExportOptions = {}
): jsPDF {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  let currentY = margin;

  const primaryColor: [number, number, number] = [31, 31, 31];
  const stoneBg: [number, number, number] = [246, 247, 237];
  const textDark: [number, number, number] = [20, 20, 20];
  const borderGrey: [number, number, number] = [220, 220, 220];

  // Header Banner
  doc.setFillColor(...primaryColor);
  doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 18, 2, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('FLEETCHECK - INCIDENT FILING & RISK LOG SUMMARY', margin + 6, currentY + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(200, 200, 200);
  doc.text(`Exported by: ${options.companyName || options.operatorName || 'Verified Fleet Owner'} | Total Incidents: ${incidents.length} | Generated: ${new Date().toLocaleDateString()}`, margin + 6, currentY + 14);

  currentY += 22;

  // Table Data
  const tableData = incidents.map((inc, index) => {
    const driverName = inc.driver_name || `${inc.driver_first_name || ''} ${inc.driver_surname || ''}`.trim() || 'Recorded Driver';
    const category = (inc.category || '').replace(/_/g, ' ');
    const severity = (inc.severity || 'medium').toUpperCase();
    const status = (inc.status || 'submitted').toUpperCase();
    const resolution = (inc.resolution_status || 'unresolved').replace(/_/g, ' ');
    const vehicle = inc.vehicle_registration || inc.vehicle_make_model || 'N/A';

    return [
      String(index + 1),
      driverName,
      category,
      inc.incident_date || 'N/A',
      severity,
      vehicle,
      status,
      resolution,
      inc.admin_notes || (inc.rejected_reason ? `Rejected: ${inc.rejected_reason}` : '-')
    ];
  });

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    head: [['#', 'Driver Name', 'Category', 'Date', 'Severity', 'Vehicle', 'Status', 'Resolution', 'Compliance Notes']],
    body: tableData,
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 2.5
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: textDark,
      lineColor: borderGrey,
      lineWidth: 0.2
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 38, fontStyle: 'bold' },
      2: { cellWidth: 30 },
      3: { cellWidth: 22 },
      4: { cellWidth: 24, fontStyle: 'bold' },
      5: { cellWidth: 30 },
      6: { cellWidth: 26, fontStyle: 'bold' },
      7: { cellWidth: 30 },
      8: { cellWidth: 'auto' }
    }
  });

  // Footer on all pages
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(140, 140, 140);
    doc.text('FleetCheck Verified Registry • Confidential Fleet Document', margin, pageHeight - 6);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 6, { align: 'right' });
  }

  const fileName = `FleetCheck_Incident_Log_Archive_${Date.now().toString().slice(-6)}.pdf`;
  doc.save(fileName);

  return doc;
}
