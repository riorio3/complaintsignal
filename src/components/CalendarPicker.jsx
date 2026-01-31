import { useState, useRef, useEffect } from 'react';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function formatDate(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseDate(str) {
  if (!str) return null;
  const [y, m, d] = str.split('-').map(Number);
  return { year: y, month: m - 1, day: d };
}

export function CalendarPicker({ value, onChange, label }) {
  const parsed = parseDate(value);
  const today = new Date();
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(parsed?.year ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.month ?? today.getMonth());
  const [showYearGrid, setShowYearGrid] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setShowYearGrid(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // When value changes externally, sync the view
  useEffect(() => {
    const p = parseDate(value);
    if (p) {
      setViewYear(p.year);
      setViewMonth(p.month);
    }
  }, [value]);

  const handleSelect = (day) => {
    onChange(formatDate(viewYear, viewMonth, day));
    setOpen(false);
    setShowYearGrid(false);
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const total = daysInMonth(viewYear, viewMonth);
  const startDay = new Date(viewYear, viewMonth, 1).getDay();

  // Year grid: show range around current viewYear
  const yearStart = viewYear - 4;
  const years = Array.from({ length: 12 }, (_, i) => yearStart + i);

  const displayValue = value
    ? `${MONTHS[parsed.month]} ${parsed.day}, ${parsed.year}`
    : '';

  return (
    <div className="relative" ref={ref}>
      <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      <button
        type="button"
        onClick={() => { setOpen(!open); setShowYearGrid(false); }}
        className="w-full text-left rounded-md border-gray-300 dark:border-gray-600 shadow-sm text-sm p-2 border bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
      >
        {displayValue || <span className="text-gray-400">Select date</span>}
      </button>

      {open && (
        <div className="absolute z-50 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl p-3 w-64">
          {/* Header: month/year nav */}
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={prevMonth} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-300">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button
              type="button"
              onClick={() => setShowYearGrid(!showYearGrid)}
              className="text-sm font-semibold text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded"
            >
              {MONTHS[viewMonth]} {viewYear}
            </button>
            <button type="button" onClick={nextMonth} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-300">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>

          {showYearGrid ? (
            /* Year selection grid */
            <div>
              <div className="flex items-center justify-between mb-2">
                <button type="button" onClick={() => setViewYear(y => y - 12)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-300 text-xs">
                  ‹‹
                </button>
                <span className="text-xs text-gray-500 dark:text-gray-400">{years[0]}–{years[years.length - 1]}</span>
                <button type="button" onClick={() => setViewYear(y => y + 12)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-300 text-xs">
                  ››
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {years.map(y => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => { setViewYear(y); setShowYearGrid(false); }}
                    className={`py-1.5 text-xs rounded transition-colors ${
                      y === viewYear
                        ? 'bg-blue-600 text-white'
                        : y === today.getFullYear()
                          ? 'text-blue-600 dark:text-blue-400 font-medium hover:bg-gray-100 dark:hover:bg-gray-700'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Day grid */
            <div>
              <div className="grid grid-cols-7 mb-1">
                {DAYS.map(d => (
                  <div key={d} className="text-center text-[10px] font-medium text-gray-400 dark:text-gray-500 py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {Array.from({ length: startDay }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: total }, (_, i) => i + 1).map(day => {
                  const isSelected = parsed && parsed.year === viewYear && parsed.month === viewMonth && parsed.day === day;
                  const isToday = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleSelect(day)}
                      className={`py-1.5 text-xs rounded transition-colors ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : isToday
                            ? 'text-blue-600 dark:text-blue-400 font-semibold hover:bg-gray-100 dark:hover:bg-gray-700'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Clear button */}
          {value && (
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false); setShowYearGrid(false); }}
              className="w-full mt-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
