import type { Dispatch, SetStateAction } from "react";

const ProfileFooter = ({
  total,
  matched,
  curPage,
  pageSize,
  setCurPage,
}: {
  total: number;
  matched: number;
  curPage: number;
  pageSize: number;
  setCurPage: Dispatch<SetStateAction<number>>;
}) => {
  const totalPages = Math.max(1, Math.ceil(matched / pageSize) || 1);

  const normalizePage = (p: number) => Math.max(1, Math.floor(p) || 1);

  return (
    <div className="flex flex-row justify-between items-center">
      <span>Total Count: {total + " / Matched Count: " + matched}</span>
      <div className="flex flex-row gap-4 items-center">
        <button
          onClick={() => setCurPage(curPage - 1)}
          disabled={curPage === 1}
          className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900 border border-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
        >
          Previous
        </button>
        <span className="flex items-center justify-center gap-2">
          <input
            type="number"
            value={curPage}
            min={1}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === "") return;
              const n = Number(raw);
              if (!Number.isFinite(n)) return;
              setCurPage(n);
            }}
            onBlur={() => setCurPage((p) => normalizePage(p))}
            className="w-20 px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span>/</span>
          <span>{totalPages}</span>
        </span>
        <button
          onClick={() => setCurPage(curPage + 1)}
          disabled={curPage >= totalPages}
          className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900 border border-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default ProfileFooter;
