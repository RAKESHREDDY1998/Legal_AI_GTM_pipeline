# GTM Data Pipeline Writeup

## Approach

I built a full-stack TypeScript application to orchestrate the GTM data pipeline. The backend is an Express server that handles the pipeline execution and serves the mock API endpoints. The frontend is a React application that provides a real-time dashboard to monitor the pipeline's progress and view the results.

### Pipeline Architecture

1.  **Orchestrator (`pipeline.ts`)**: The main entry point for the pipeline. It fetches the initial list of firms, deduplicates them, and then processes each firm sequentially through the enrichment, scoring, routing, and experiment assignment stages.
2.  **API Client (`utils.ts`)**: Implements exponential backoff and rate limit handling (429 errors) using `axios`. It respects the `Retry-After` header and automatically retries failed requests.
3.  **Enricher (`enricher.ts`)**: Fetches firmographic and contact data. It handles missing fields and inconsistent schemas (e.g., `num_lawyers` vs. `lawyer_count`) by normalizing the data into a consistent format.
4.  **Scorer (`scorer.ts`)**: Scores firms against the Ideal Customer Profile (ICP) based on size, practice areas, and location. It uses configurable weights and thresholds from `config.yaml`.
5.  **Router (`router.ts`)**: Routes leads into categories (`enterprise`, `mid-market`, `smb`, `nurture`, `discard`) based on their score and firmographic data.
6.  **Experiment Assignment (`experiment.ts`)**: Assigns leads to A/B test variants based on configurable weights.
7.  **Webhook Integration (`webhook.ts`)**: Sends data to downstream systems (CRM and Email) with retry logic for failed deliveries.

### Deduplication Strategy

I used the `string-similarity` library to compare firm names. Firms with the same domain and a name similarity score > 0.8 are considered duplicates. This handles slight variations like "Law Firm 1 LLC" vs. "Law Firm 1 L.L.C.".

### Error Handling

The pipeline uses a robust error handling strategy. API failures are caught and retried using exponential backoff. If a firm fails to enrich completely, it is assigned default values (e.g., 0 lawyers) to prevent the entire pipeline from crashing. Webhook failures are also retried.

## Trade-offs and Future Improvements

*   **Sequential vs. Parallel Processing**: Currently, the pipeline processes firms sequentially. With more time, I would implement parallel processing using a worker pool or a message queue (e.g., RabbitMQ, Celery/BullMQ) to improve throughput.
*   **State Management**: The pipeline currently runs in memory. For a production system, I would use a database (e.g., PostgreSQL) to track the state of each firm through the pipeline, allowing for resumability in case of a crash.
*   **More Sophisticated Deduplication**: The current deduplication strategy is basic. I would integrate a more advanced entity resolution system or use machine learning models to identify duplicates more accurately.
*   **Monitoring and Alerting**: I would add comprehensive monitoring and alerting (e.g., Datadog, Sentry) to track pipeline health, API error rates, and webhook delivery success.
