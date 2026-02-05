import React from 'react';

export default function ResponsiveTable({ headers, data, renderRow, renderMobileCard }) {
  return (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-blue-600">
              {headers.map((header, idx) => (
                <th 
                  key={idx}
                  className={`p-3 text-slate-600 font-medium text-sm ${
                    header.align === 'right' ? 'text-right' : 
                    header.align === 'center' ? 'text-center' : 'text-left'
                  }`}
                >
                  {header.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item, idx) => renderRow(item, idx))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {data.map((item, idx) => renderMobileCard(item, idx))}
      </div>
    </>
  );
}