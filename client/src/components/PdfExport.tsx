import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FileText, Printer, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

// ─── PDF Export Component ─────────────────────────────────────────────────────

interface PdfExportProps {
  tripId: number;
}

export function PdfExport({ tripId }: PdfExportProps) {
  const [open, setOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: summary, isLoading } = trpc.itinerary.exportSummary.useQuery(
    { tripId },
    { enabled: open }
  );

  const handlePrint = () => {
    setIsGenerating(true);
    // Build a print-ready HTML document
    const trip = summary?.trip;
    const members = summary?.members || [];
    const byIsland = summary?.byIsland || {};

    const categoryIcons: Record<string, string> = {
      activity: "🤿",
      lodging: "🏨",
      restaurant: "🍽️",
      transportation: "✈️",
      note: "📝",
    };

    const categoryLabels: Record<string, string> = {
      activity: "Activities",
      lodging: "Lodging",
      restaurant: "Dining",
      transportation: "Transportation",
      note: "Notes",
    };

    const islandSections = Object.entries(byIsland)
      .map(([island, items]) => {
        const byCategory: Record<string, typeof items> = {};
        for (const item of items) {
          if (!byCategory[item.category]) byCategory[item.category] = [];
          byCategory[item.category].push(item);
        }

        const categorySections = Object.entries(byCategory)
          .map(([cat, catItems]) => `
            <div class="category-section">
              <h3>${categoryIcons[cat] || "📌"} ${categoryLabels[cat] || cat}</h3>
              ${catItems.map((item) => `
                <div class="item">
                  <div class="item-title">${item.title}</div>
                  ${item.description ? `<div class="item-desc">${item.description}</div>` : ""}
                  ${item.location ? `<div class="item-meta">📍 ${item.location}</div>` : ""}
                  ${item.priceRange ? `<div class="item-meta">💰 ${item.priceRange}</div>` : ""}
                  ${item.date ? `<div class="item-meta">📅 ${item.date}${item.timeOfDay ? ` (${item.timeOfDay})` : ""}</div>` : ""}
                  ${item.notes ? `<div class="item-notes">${item.notes}</div>` : ""}
                  ${item.url ? `<div class="item-meta"><a href="${item.url}">${item.url}</a></div>` : ""}
                </div>
              `).join("")}
            </div>
          `).join("");

        return `
          <div class="island-section">
            <h2>🌺 ${island}</h2>
            ${categorySections}
          </div>
        `;
      })
      .join("");

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />
        <title>${trip?.title || "Trip Itinerary"} — Aloha Travel Agent</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: Georgia, 'Times New Roman', serif;
            font-size: 12pt;
            color: #1a1a1a;
            line-height: 1.6;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            border-bottom: 3px solid #0ea5e9;
            padding-bottom: 24px;
            margin-bottom: 32px;
          }
          .header h1 {
            font-size: 28pt;
            color: #0c4a6e;
            margin-bottom: 8px;
          }
          .header .subtitle {
            font-size: 14pt;
            color: #0ea5e9;
            font-style: italic;
          }
          .trip-meta {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
            background: #f0f9ff;
            border: 1px solid #bae6fd;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 32px;
          }
          .trip-meta-item {
            text-align: center;
          }
          .trip-meta-item .label {
            font-size: 9pt;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #64748b;
            margin-bottom: 4px;
          }
          .trip-meta-item .value {
            font-size: 12pt;
            font-weight: bold;
            color: #0c4a6e;
          }
          .members-section {
            margin-bottom: 32px;
          }
          .members-section h2 {
            font-size: 14pt;
            color: #0c4a6e;
            margin-bottom: 8px;
          }
          .member-list {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }
          .member-chip {
            background: #e0f2fe;
            border: 1px solid #7dd3fc;
            border-radius: 20px;
            padding: 4px 12px;
            font-size: 11pt;
            color: #0369a1;
          }
          .island-section {
            margin-bottom: 40px;
            page-break-inside: avoid;
          }
          .island-section h2 {
            font-size: 20pt;
            color: #0c4a6e;
            border-bottom: 2px solid #0ea5e9;
            padding-bottom: 8px;
            margin-bottom: 20px;
          }
          .category-section {
            margin-bottom: 24px;
          }
          .category-section h3 {
            font-size: 14pt;
            color: #0369a1;
            margin-bottom: 12px;
            padding-left: 8px;
            border-left: 3px solid #0ea5e9;
          }
          .item {
            background: #fafafa;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 12px 16px;
            margin-bottom: 8px;
          }
          .item-title {
            font-size: 13pt;
            font-weight: bold;
            color: #1e293b;
            margin-bottom: 4px;
          }
          .item-desc {
            font-size: 11pt;
            color: #475569;
            margin-bottom: 6px;
          }
          .item-meta {
            font-size: 10pt;
            color: #64748b;
            margin-top: 2px;
          }
          .item-meta a {
            color: #0ea5e9;
          }
          .item-notes {
            font-size: 10pt;
            color: #64748b;
            font-style: italic;
            margin-top: 6px;
            padding-top: 6px;
            border-top: 1px dashed #e2e8f0;
          }
          .footer {
            text-align: center;
            margin-top: 48px;
            padding-top: 16px;
            border-top: 1px solid #e2e8f0;
            font-size: 10pt;
            color: #94a3b8;
          }
          @media print {
            body { padding: 20px; }
            .island-section { page-break-before: auto; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="subtitle">🌺 Aloha Travel Agent — Your Personal Trip Plan</div>
          <h1>${trip?.title || "Hawaii Trip"}</h1>
          <div class="subtitle">${trip?.destination || "Hawaii"}</div>
        </div>

        ${trip?.startDate || trip?.budgetMin ? `
        <div class="trip-meta">
          ${trip?.startDate && trip?.endDate ? `
          <div class="trip-meta-item">
            <div class="label">Travel Dates</div>
            <div class="value">${trip.startDate} – ${trip.endDate}</div>
          </div>
          ` : ""}
          ${trip?.budgetMin && trip?.budgetMax ? `
          <div class="trip-meta-item">
            <div class="label">Budget</div>
            <div class="value">$${trip.budgetMin.toLocaleString()} – $${trip.budgetMax.toLocaleString()}</div>
          </div>
          ` : ""}
          <div class="trip-meta-item">
            <div class="label">Travelers</div>
            <div class="value">${trip?.guestCount || 2} people</div>
          </div>
        </div>
        ` : ""}

        ${members.length > 0 ? `
        <div class="members-section">
          <h2>👨‍👩‍👧‍👦 Traveling Party</h2>
          <div class="member-list">
            ${members.map((m) => `<span class="member-chip">${m.name}</span>`).join("")}
          </div>
        </div>
        ` : ""}

        ${Object.keys(byIsland).length > 0 ? islandSections : `
          <div style="text-align:center; padding: 40px; color: #94a3b8;">
            <p>No master itinerary items yet. Add items and promote them to the master plan to see them here.</p>
          </div>
        `}

        <div class="footer">
          <p>Generated by Aloha Travel Agent • ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
          <p style="margin-top: 4px;">Mahalo for choosing us to plan your adventure! 🌺</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        setIsGenerating(false);
      }, 500);
    } else {
      toast.error("Please allow pop-ups to export the PDF");
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FileText className="w-4 h-4" />
          Export PDF
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Export Itinerary as PDF</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h3 className="font-semibold text-blue-800 mb-1">📋 What's included:</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Trip dates, budget, and traveler names</li>
                  <li>• All items in the Master Itinerary</li>
                  <li>• Organized by island and category</li>
                  <li>• Descriptions, locations, and prices</li>
                </ul>
              </div>

              {summary && summary.totalItems === 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-sm text-amber-700">
                    ⚠️ Your master itinerary is empty. Go to the <strong>Merge & Finalize</strong> tab to promote items to the master plan before exporting.
                  </p>
                </div>
              )}

              <div className="bg-muted/50 rounded-xl p-4 text-sm text-muted-foreground">
                <p>A print dialog will open in a new window. Choose <strong>"Save as PDF"</strong> as the destination to download the file, or <strong>"Print"</strong> to print directly.</p>
              </div>

              <div className="flex gap-3">
                <Button
                  className="flex-1 h-11 text-base gap-2"
                  onClick={handlePrint}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Printer className="w-4 h-4" />
                  )}
                  {isGenerating ? "Opening..." : "Print / Save as PDF"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
