import { InfoPopover } from '@/src/components/projectsTestCases/ui/InfoPopover.tsx';

/**
 * Product-facing explanation of the health value returned by the User Flow API.
 * Keep this aligned with deriveUserFlowHealth in the backend.
 */
export const UserFlowHealthHelp = () => (
  <InfoPopover label="Explain User Flow Health">
    <div className="space-y-2 text-xs leading-relaxed">
      <p className="font-semibold text-slate-900">Why this Health?</p>
      <p>
        Health uses the latest Test Run for this User Flow. It considers the result of each test
        case: Passed, Failed, Blocked, Skipped, or not yet completed.
      </p>
      <ul className="space-y-1">
        <li>
          <strong>Healthy:</strong> every case finished Passed.
        </li>
        <li>
          <strong>At Risk:</strong> no Failed case, but a case is Blocked, Skipped, incomplete, or
          untested.
        </li>
        <li>
          <strong>Broken:</strong> at least one case Failed.
        </li>
        <li>
          <strong>Unknown:</strong> there is no latest run or it has no cases.
        </li>
      </ul>
      <p className="border-t border-slate-100 pt-2 text-slate-500">
        Critical is a Priority, not a Health level. N/A is used for unavailable coverage, not for
        Health.
      </p>
    </div>
  </InfoPopover>
);
