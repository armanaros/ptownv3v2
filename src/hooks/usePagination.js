import { useMemo, useState } from 'react';

const usePagination = (items = [], initialPageSize = 10) => {
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(initialPageSize);

	const totalItems = items.length;
	const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

	const currentPage = Math.min(page, totalPages);
	const start = (currentPage - 1) * pageSize;
	const end = start + pageSize;

	const paginatedItems = useMemo(() => items.slice(start, end), [items, start, end]);

	return {
		page: currentPage,
		pageSize,
		totalItems,
		totalPages,
		setPage,
		setPageSize,
		paginatedItems,
	};
};

export default usePagination;
