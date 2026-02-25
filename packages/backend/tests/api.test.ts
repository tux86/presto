// Single entry point — imports test suites in sequential order.
// Bun discovers only this file (*.test.ts) and runs all describe/test
// blocks in the order they are imported.

import "./01-health-config";
import "./02-auth";
import "./03-clients";
import "./04-companies";
import "./05-missions";
import "./06-activity-reports";
import "./07-report-entries";
import "./08-report-lifecycle";
import "./09-reporting";
import "./10-edge-cases";
import "./11-settings";
import "./12-auth-extended";
import "./13-cross-user-isolation";
import "./14-report-extended";
import "./15-reporting-extended";
