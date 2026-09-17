import {
  createBeaconTransport,
  createBehaviorPlugin,
  createErrorPlugin,
  createFetchTransport,
  createImageTransport,
  createMonitor,
  createPerformancePlugin,
  createReplayPlugin,
  createReporterPlugin,
  createWhiteScreenPlugin
} from "@monitor/sdk";
import { record } from "rrweb";
import { onCLS, onINP, onLCP, type Metric } from "web-vitals";

const apiUrl = (import.meta.env.VITE_MONITOR_API_URL ?? "http://localhost:3000").replace(
  /\/$/,
  ""
);
const endpoint = `${apiUrl}/api/events/batch`;
const release = import.meta.env.VITE_APP_RELEASE ?? "0.1.0";

const observeVitals = (report: (metric: Metric) => void) => {
  onCLS(report);
  onINP(report);
  onLCP(report);
};

export const monitor = createMonitor({
  appId: "mewhelp-web",
  endpoint,
  release,
  environment: import.meta.env.DEV ? "development" : "production",
  plugins: [
    createErrorPlugin(),
    createWhiteScreenPlugin(),
    createBehaviorPlugin(),
    createPerformancePlugin({ observeVitals }),
    createReplayPlugin({ record }),
    createReporterPlugin({
      transports: [
        createFetchTransport(endpoint),
        createBeaconTransport(endpoint),
        createImageTransport(endpoint)
      ]
    })
  ]
});

monitor.start();

export function trackBiz(
  type:
    | "biz:chat_start"
    | "biz:chat_ttfb"
    | "biz:chat_error"
    | "biz:chat_done"
    | "biz:interrupt",
  payload: Record<string, unknown>
): void {
  monitor.capture(type, payload);
}
