export function CompanyComparison({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Company Comparison</h3>
        <p className="text-gray-500 text-center py-8">No data available</p>
      </div>
    );
  }

  // Take top 6 companies
  const topCompanies = data.slice(0, 6);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Company Comparison</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Company
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Timely Response
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Dispute Rate
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Relief Provided
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {topCompanies.map((company, index) => (
              <tr key={company.company} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {company.company.length > 30
                    ? `${company.company.substring(0, 30)}...`
                    : company.company}
                </td>
                <td className="px-4 py-3 text-sm text-right text-gray-700">
                  {company.total.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-sm text-right">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      company.timelyRate >= 90
                        ? 'bg-green-100 text-green-800'
                        : company.timelyRate >= 70
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {company.timelyRate}%
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-right">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      company.disputeRate <= 10
                        ? 'bg-green-100 text-green-800'
                        : company.disputeRate <= 25
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {company.disputeRate}%
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-right text-gray-700">
                  {company.reliefRate}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
