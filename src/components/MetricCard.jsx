export function MetricCard({ title, value, subtitle, trend, trendValue }) {
  const trendColor =
    trend === 'up' ? 'text-red-600 dark:text-red-400 font-semibold' : trend === 'down' ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-gray-600 dark:text-gray-400';
  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{title}</h3>
      <div className="mt-2 flex items-baseline justify-center">
        <p className="text-3xl font-semibold text-gray-900 dark:text-white">{value}</p>
        {trend && trendValue !== undefined && (
          <span className={`ml-2 text-sm ${trendColor}`}>
            {trendIcon} {trendValue}%
          </span>
        )}
      </div>
      {subtitle && <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>}
    </div>
  );
}
