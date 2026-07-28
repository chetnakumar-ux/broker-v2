import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

import { apiFetch } from '../../../lib/api';

import {
    useReactTable,
    getCoreRowModel,
    createColumnHelper,
    flexRender,
} from '@tanstack/react-table';

const PER_PAGE = 10;
const SEARCH_LIST_ENDPOINT = '/app/profile/carriers/searched/list';

const columnHelper = createColumnHelper();

const PLACEHOLDERS = {
    mc: 'MC  1234567',
    dot: 'DOT  1234567',
    company: 'e.g. Swift Transportation',
    phone: 'e.g. (555) 555-5555',
    email: 'e.g. dispatch@carrier.com',
};

// Tab options for search type selector
const SEARCH_TYPES = [
    { value: 'mc', label: 'MC' },
    { value: 'dot', label: 'DOT' },
    { value: 'company', label: 'COMPANY' },
    { value: 'phone', label: 'PHONE' },
    { value: 'email', label: 'EMAIL' },
];

const AUTHORITY_FILTERS = [
    { value: '', label: 'All authority' },
    { value: 'A', label: 'Active' },
    { value: 'I', label: 'Inactive' },
];

function SortableHeader({ label, sortKey, sorting, onSortChange }) {
    const isActive = sorting.id === sortKey;
    const direction = isActive ? sorting.desc : null; // true = desc, false = asc, null = inactive

    const handleClick = () => {
        if (!isActive) {
            onSortChange({ id: sortKey, desc: false }); // start ascending
        } else if (direction === false) {
            onSortChange({ id: sortKey, desc: true }); // asc -> desc
        } else {
            onSortChange({ id: null, desc: false }); // desc -> unsorted
        }
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            className="flex items-center gap-1 uppercase tracking-wide text-[11px] font-bold text-gray-500 hover:text-gray-700"
        >
            {label}
            {isActive ? (
                direction ? (
                    <ArrowDownwardIcon sx={{ fontSize: 13 }} className="text-blue-600" />
                ) : (
                    <ArrowUpwardIcon sx={{ fontSize: 13 }} className="text-blue-600" />
                )
            ) : (
                <UnfoldMoreIcon sx={{ fontSize: 13 }} className="text-gray-300" />
            )}
        </button>
    );
}

const carrierNameColumn = columnHelper.accessor('company_name', {
    header: 'Carrier',
    id: 'company_name',
    cell: (info) => {
        const row = info.row.original;
        return (
            <Link
                to={`/carriers/${row.carrier_id}`}
                className="text-[#003178] font-bold hover:underline"
            >
                {row.company_name || '-'}
            </Link>
        );
    },
});

function SearchVetTable({ keyword, refreshKey }) {

    const [data, setData] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [copiedRowId, setCopiedRowId] = useState(null);

    // Pagination
    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(PER_PAGE);

    // Sorting — { id: 'company_name' | 'carrier_operation' | ... | null, desc: bool }
    const [sorting, setSorting] = useState({ id: 'created_at', desc: true });

    // Filters
    const [authorityFilter, setAuthorityFilter] = useState('');
    const [tableSearch, setTableSearch] = useState(''); // filters the results list itself

    const fetchRecords = useCallback(() => {

        setLoading(true);

        const formData = new FormData();
        formData.append('page', pageIndex + 1);
        formData.append('per_page', pageSize);
        formData.append('sort_by', sorting.id || 'created_at');
        formData.append('sort_order', sorting.desc ? 'desc' : 'asc');

        if (keyword) formData.append('keyword', keyword);
        if (tableSearch) formData.append('keyword', tableSearch);
        if (authorityFilter) formData.append('carrier_operation', authorityFilter);

        apiFetch(SEARCH_LIST_ENDPOINT, { method: 'POST', body: formData })
            .then((res) => {
                if (res.status && res.records) {
                    setData(res.records);
                    setTotal(Number(res.total) || res.records.length);
                } else {
                    setData([]);
                    setTotal(0);
                }
            })
            .catch(() => {
                setData([]);
                setTotal(0);
            })
            .finally(() => {
                setLoading(false);
            });

    }, [pageIndex, pageSize, sorting, keyword, tableSearch, authorityFilter]);

    useEffect(() => {
        fetchRecords();
    }, [fetchRecords, refreshKey]);

    // Reset to page 1 whenever a filter/search/sort changes
    useEffect(() => {
        setPageIndex(0);
    }, [keyword, tableSearch, authorityFilter, sorting]);

    const copyToClipboard = useCallback((text, rowId) => {

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text);
        } else {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
        }

        setCopiedRowId(rowId);

        window.setTimeout(() => {
            setCopiedRowId((prev) => (prev === rowId ? null : prev));
        }, 1500);
    }, []);

    const columns = useMemo(() => ([
        carrierNameColumn,
        columnHelper.display({
            id: 'mc_dot',
            header: 'MC / DOT',
            cell: (info) => {
                const row = info.row.original;

                const mc = row.mc_number || '';
                const dot = row.dot_number || '';

                const display = `${mc || '-'} / ${dot || '-'}`;

                let copyText = '';
                if (mc && dot) {
                    copyText = `${mc} / ${dot}`;
                } else if (mc) {
                    copyText = mc;
                } else if (dot) {
                    copyText = dot;
                }

                const rowId = info.row.id;
                const isCopied = copiedRowId === rowId;

                return (
                    <span
                        onClick={() => copyText && copyToClipboard(copyText, rowId)}
                        title={copyText ? 'Click to copy' : undefined}
                        className={
                            'select-none ' +
                            (copyText ? 'cursor-pointer hover:text-[#2563eb] ' : '') +
                            (isCopied ? 'text-[#16a34a] font-[600]' : '')
                        }
                    >
                        {isCopied ? 'Copied!' : display}
                    </span>
                );
            },
        }),
        columnHelper.accessor('carrier_operation', {
            header: 'Authority',
            id: 'carrier_operation',
            cell: (info) => (
                info.getValue() === 'A'
                    ? <Chip label="Active" size="small" color="success" />
                    : <Chip label="Inactive" size="small" color="warning" />
            ),
        }),
        columnHelper.accessor('insurance_status', {
            header: 'Insurance',
            id: 'insurance_status',
            cell: (info) => <span>{info.getValue() || '-'}</span>,
        }),
        columnHelper.accessor('dt_score', {
            header: 'DT Score',
            id: 'dt_score',
            cell: (info) => <span className="font-bold">{info.getValue() || '-'}</span>,
        }),
        columnHelper.accessor('added_on', {
            header: 'Vetted',
            id: 'added_on',
            cell: (info) => <span>{info.getValue() || '-'}</span>,
        }),
    ]), [copiedRowId, copyToClipboard]);

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    // Which column ids are sortable server-side. "mc_dot" is a composite
    // display column with no single backend field, so it's excluded.
    const SORTABLE_COLUMNS = {
        company_name: 'Carrier',
        carrier_operation: 'Authority',
        insurance_status: 'Insurance',
        dt_score: 'DT Score',
        added_on: 'Vetted',
    };

    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const rangeStart = total === 0 ? 0 : pageIndex * pageSize + 1;
    const rangeEnd = Math.min(total, (pageIndex + 1) * pageSize);

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">

            {/* Filter bar */}
            <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50/60">
                <div className="flex items-center bg-white border border-gray-200 rounded-lg px-3 h-9 w-56">
                    <svg className="w-3.5 h-3.5 text-gray-400 mr-2 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Filter results…"
                        value={tableSearch}
                        onChange={(e) => setTableSearch(e.target.value)}
                        className="flex-1 bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400"
                    />
                </div>

                <select
                    value={authorityFilter}
                    onChange={(e) => setAuthorityFilter(e.target.value)}
                    className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 outline-none"
                >
                    {AUTHORITY_FILTERS.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                </select>

                <span className="ml-auto text-xs text-gray-400">
                    {rangeStart}-{rangeEnd} of {total}
                </span>
            </div>

            <table className="w-full text-sm border-collapse">
                <thead>
                    {table.getHeaderGroups().map((headerGroup) => (
                        <tr key={headerGroup.id}>
                            {headerGroup.headers.map((header) => {
                                const colId = header.column.id;
                                const isSortable = Object.prototype.hasOwnProperty.call(SORTABLE_COLUMNS, colId);

                                return (
                                    <th
                                        key={header.id}
                                        className="text-left bg-gray-50 border-b border-gray-200 px-4 py-3 whitespace-nowrap"
                                    >
                                        {isSortable ? (
                                            <SortableHeader
                                                label={SORTABLE_COLUMNS[colId]}
                                                sortKey={colId}
                                                sorting={sorting}
                                                onSortChange={setSorting}
                                            />
                                        ) : (
                                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                                                {flexRender(header.column.columnDef.header, header.getContext())}
                                            </span>
                                        )}
                                    </th>
                                );
                            })}
                        </tr>
                    ))}
                </thead>
                <tbody>
                    {loading && (
                        <tr>
                            <td colSpan={columns.length} className="text-center py-10 text-gray-400">
                                <div className="flex items-center justify-center gap-2">
                                    <CircularProgress size={18} />
                                    Loading…
                                </div>
                            </td>
                        </tr>
                    )}

                    {!loading && data.length === 0 && (
                        <tr>
                            <td colSpan={columns.length} className="text-center py-10 text-gray-400">
                                No carriers found.
                            </td>
                        </tr>
                    )}

                    {!loading && table.getRowModel().rows.map((row) => (
                        <tr
                            key={row.id}
                            className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors"
                        >
                            {row.getVisibleCells().map((cell) => (
                                <td key={cell.id} className="px-4 py-3 align-middle">
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Pagination footer */}
            <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-gray-100">
                <select
                    value={pageSize}
                    onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPageIndex(0);
                    }}
                    className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm font-semibold text-gray-700 outline-none"
                >
                    {[10, 25, 50, 100].map((size) => (
                        <option key={size} value={size}>{size} / page</option>
                    ))}
                </select>
                <IconButton
                    size="small"
                    disabled={pageIndex === 0}
                    onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                    sx={{ color: '#94a3b8' }}
                >
                    <ChevronLeftIcon fontSize="small" />
                </IconButton>
                <IconButton
                    size="small"
                    disabled={pageIndex + 1 >= pageCount}
                    onClick={() => setPageIndex((p) => Math.min(pageCount - 1, p + 1))}
                    sx={{ color: '#94a3b8' }}
                >
                    <ChevronRightIcon fontSize="small" />
                </IconButton>
            </div>
        </div>
    );
}

export default function SearchVet() {
    const navigate = useNavigate();

    const [searchQuery, setSearchQuery] = useState('');
    const [searchType, setSearchType] = useState('mc');
    const [searchError, setSearchError] = useState('');
    const [vetting, setVetting] = useState(false);
    const [activeSearch] = useState('');
    const [tableKey] = useState(0);

    const handleRunVet = () => {
        if (!searchQuery.trim()) {
            setSearchError('Please enter a MC #, DOT #, Company name, phone, or email to run a vet.');
            return;
        }

        if (vetting) return;

        setVetting(true);
        setSearchError('');

        window.setTimeout(() => {
            navigate(`/carriers/search?q=${encodeURIComponent(searchQuery.trim())}&searched_by=${searchType}`);
        }, 400);
    };

    const handleSearchQueryChange = (value) => {
        setSearchQuery(value);
        setSearchError((prev) => (prev && value.trim() ? '' : prev));
    };

    const placeholder = PLACEHOLDERS[searchType] || 'Search…';

    return (
        <div className="min-h-screen bg-[#F4F5F1] px-8 py-5 md:px-14">

            <div className="mb-8">
                <h1 className="text-[40px] font-semibold tracking-tight text-slate-900">Search &amp; Instant Vet</h1>
                <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-slate-500">
                    One lookup → FMCSA authority, insurance, safety, VIN, associations &amp; a live Trust Score.
                </p>
            </div>

            <div className="bg-white rounded-xl p-7 mb-5 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900 mb-1">Look up any carrier</h2>
                <p className="text-sm text-gray-500 mb-4">
                    Search by MC #, DOT #, Company name, phone, or email.
                </p>

                <div className="flex items-center flex-wrap gap-2 mb-3">
                    {SEARCH_TYPES.map((t) => {
                        const isActive = searchType === t.value;
                        return (
                            <button
                                key={t.value}
                                type="button"
                                onClick={() => setSearchType(t.value)}
                                className={
                                    'px-5 h-9 rounded-full border text-xs font-bold tracking-wide transition-colors ' +
                                    (isActive
                                        ? 'border-blue-600 text-white bg-blue-600 shadow-sm'
                                        : 'border-transparent text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-800')
                                }
                            >
                                {t.label}
                            </button>
                        );
                    })}
                </div>

                <div className="flex items-start gap-3">

                    <div className="flex-1">
                        <div
                            className={
                                'flex items-center bg-gray-100 rounded-lg px-4 h-12 ' +
                                (searchError ? 'ring-1 ring-red-400' : '')
                            }
                        >
                            <svg className="w-4 h-4 text-gray-400 mr-2 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                            <input
                                type="text"
                                className="flex-1 bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400"
                                placeholder={placeholder}
                                value={searchQuery}
                                onChange={(e) => handleSearchQueryChange(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleRunVet()}
                                disabled={vetting}
                            />
                        </div>

                        {searchError && (
                            <p className="text-xs text-red-500 mt-2">
                                {searchError}
                            </p>
                        )}
                    </div>

                    <button
                        onClick={handleRunVet}
                        disabled={vetting}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-6 h-12 rounded-lg whitespace-nowrap transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {vetting ? (
                            <CircularProgress size={16} sx={{ color: '#fff' }} />
                        ) : (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            </svg>
                        )}
                        {vetting ? 'Running…' : 'Run Vet'}
                    </button>
                </div>

                <div className="flex gap-6 mt-3">
                    {[
                        '2.34M carriers · FMCSA synced daily',
                        'Carrier411 + GenLogs physical layer',
                        'Sub-200ms pass/fail at load tender',
                    ].map((text) => (
                        <span key={text} className="flex items-center gap-1.5 text-xs text-gray-500">
                            <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                            {text}
                        </span>
                    ))}
                </div>
            </div>

            <SearchVetTable
                keyword={activeSearch}
                refreshKey={tableKey}
            />
        </div>
    );
}