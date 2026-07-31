import {
  matchesAutomationReadinessFilter,
  type FilterState,
  type SortField,
  type SortOrder,
  type TestCase,
} from '@/src/components/projectsTestCases/types.ts';

const calendarDateValue = (date: Date): number =>
  date.getFullYear() * 10_000 + (date.getMonth() + 1) * 100 + date.getDate();

const compareValues = (a: string | number, b: string | number): number => {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
};

/**
 * Sorts table data using the same local calendar date rendered in the Updated column.
 * The original index is used as a tie breaker so equal values retain API/input order.
 */
export const sortTestCases = (
  testCases: TestCase[],
  { field, order }: { field: SortField; order: SortOrder },
): TestCase[] => testCases
  .map((testCase, index) => ({ testCase, index }))
  .sort((a, b) => {
    let comparison: number;

    if (field === 'id') {
      comparison = compareValues(a.testCase.tcNumber ?? 0, b.testCase.tcNumber ?? 0);
    } else if (field === 'updatedAt') {
      comparison = compareValues(calendarDateValue(a.testCase.updatedAt), calendarDateValue(b.testCase.updatedAt));
    } else {
      const aValue = a.testCase[field];
      const bValue = b.testCase[field];
      comparison = compareValues(String(aValue ?? '').toLowerCase(), String(bValue ?? '').toLowerCase());
    }

    if (comparison === 0) return a.index - b.index;
    return order === 'asc' ? comparison : -comparison;
  })
  .map(({ testCase }) => testCase);

/** The filter, sort, and pagination sequence used by the Test Cases table. */
export const getVisibleTestCases = (
  testCases: TestCase[],
  filters: FilterState,
  sortConfig: { field: SortField; order: SortOrder },
  currentPage: number,
  itemsPerPage: number,
): TestCase[] => {
  let result = testCases;

  if (filters.search) {
    const query = filters.search.toLowerCase();
    result = result.filter((testCase) =>
      testCase.title.toLowerCase().includes(query) || testCase.id.toLowerCase().includes(query));
  }
  if (filters.section.length > 0) result = result.filter((testCase) => filters.section.includes(testCase.section));
  if (filters.priority.length > 0) result = result.filter((testCase) => filters.priority.includes(testCase.priority));
  if (filters.status.length > 0) result = result.filter((testCase) => filters.status.includes(testCase.status));
  if (filters.automationType.length > 0) result = result.filter((testCase) => filters.automationType.includes(testCase.automationType));
  if (filters.automationReadiness.length > 0) {
    result = result.filter((testCase) => matchesAutomationReadinessFilter(testCase.automationReadiness, filters.automationReadiness));
  }

  const sorted = sortTestCases(result, sortConfig);
  if (itemsPerPage === -1) return sorted;
  const startIndex = (currentPage - 1) * itemsPerPage;
  return sorted.slice(startIndex, startIndex + itemsPerPage);
};
