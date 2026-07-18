"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../ui/button";

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export default function Pagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  const startRange = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRange = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Logic for truncated page lists (e.g. [1, 2, '...', 9, 10])
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, "...", totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2 w-full border-t border-white/[0.08] text-sm">
      {/* Items Range Info */}
      <div className="text-[#94A3B8] text-xs">
        Showing <span className="font-semibold text-[#F8FAFC]">{startRange}</span> to{" "}
        <span className="font-semibold text-[#F8FAFC]">{endRange}</span> of{" "}
        <span className="font-semibold text-[#F8FAFC]">{totalItems}</span> entries
      </div>

      {/* Controls Container */}
      <div className="flex flex-wrap items-center gap-4 sm:gap-6">
        {/* Rows Per Page Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#94A3B8] whitespace-nowrap">Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(1);
            }}
            className="h-8 px-2 py-1 text-xs rounded-lg border border-white/[0.08] bg-[#0F172A]/50 text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED] transition-all cursor-pointer font-semibold"
          >
            {[5, 10, 20, 50].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        {/* Page Buttons */}
        <div className="flex items-center gap-1.5">
          {/* Previous Button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="w-8 h-8 !p-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          {/* Page Numbers */}
          <div className="hidden xs:flex items-center gap-1">
            {getPageNumbers().map((page, index) => {
              if (page === "...") {
                return (
                  <span key={`ellipse-${index}`} className="px-2 text-[#94A3B8]">
                    ...
                  </span>
                );
              }

              const isCurrent = page === currentPage;
              return (
                <Button
                  key={`page-${page}`}
                  variant={isCurrent ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => onPageChange(page as number)}
                  className="w-8 h-8 !p-0 font-semibold text-xs"
                >
                  {page}
                </Button>
              );
            })}
          </div>

          {/* Current Page indicator for mobile */}
          <span className="xs:hidden text-xs text-[#94A3B8] font-semibold px-2">
            Page {currentPage} of {totalPages}
          </span>

          {/* Next Button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="w-8 h-8 !p-0"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
