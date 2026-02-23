// Single entry point — imports test suites in sequential order.
// Bun discovers only this file (*.test.ts) and runs all describe/test
// blocks in the order they are imported.

import "./01-health-config";
import "./02-auth";
import "./03-clients";
import "./04-missions";
import "./05-activity-reports";
import "./06-report-entries";
import "./07-report-lifecycle";
import "./08-reporting";
import "./09-edge-cases";
