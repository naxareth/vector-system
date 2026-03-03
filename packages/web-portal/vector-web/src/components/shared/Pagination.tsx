'use client';

interface PaginationProps {
    currentPage: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalItems, itemsPerPage, onPageChange }: PaginationProps) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    if (totalPages <= 1) return null;

    const start = (currentPage - 1) * itemsPerPage + 1;
    const end = Math.min(currentPage * itemsPerPage, totalItems);

    // Build visible page numbers: always show first, last, current, and neighbors
    const pages: (number | '...')[] = [];
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            pages.push(i);
        } else if (pages[pages.length - 1] !== '...') {
            pages.push('...');
        }
    }

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 py-3">
            <p className="text-xs text-gray-500 dark:text-[#64748B]">
                Showing <span className="font-semibold text-gray-700 dark:text-[#E2E8F0]">{start}–{end}</span> of{' '}
                <span className="font-semibold text-gray-700 dark:text-[#E2E8F0]">{totalItems}</span>
            </p>

            <div className="flex items-center gap-1">
                {/* Prev */}
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg text-gray-400 dark:text-[#64748B] hover:bg-gray-100 dark:hover:bg-[#1E2536] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label="Previous page"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>

                {/* Page numbers */}
                {pages.map((p, i) =>
                    p === '...' ? (
                        <span key={`dots-${i}`} className="px-1 text-gray-400 dark:text-[#64748B] text-xs">…</span>
                    ) : (
                        <button
                            key={p}
                            onClick={() => onPageChange(p)}
                            className={`min-w-[32px] h-8 rounded-lg text-sm font-medium transition-colors ${p === currentPage
                                    ? 'bg-[#06B4C9] text-white'
                                    : 'text-gray-600 dark:text-[#94A3B8] hover:bg-gray-100 dark:hover:bg-[#1E2536]'
                                }`}
                        >
                            {p}
                        </button>
                    )
                )}

                {/* Next */}
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg text-gray-400 dark:text-[#64748B] hover:bg-gray-100 dark:hover:bg-[#1E2536] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label="Next page"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
            </div>
        </div>
    );
}
