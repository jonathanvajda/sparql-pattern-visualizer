These browser modules are local copies of the ReasonLynx shared packages.
Keep the upstream copyright/license notices when synchronizing them.

- `ui-feedback/src/`: shared notification renderer, status helpers, and toast CSS.
- `indexeddb-data-management/src/`: project portfolio schema and its required
  record, transaction, and legacy read adapters.
- `normalization-utils/src/`: dependencies needed by shared record ID generation.

Only the dependency closure used by this app is included. This folder is served
with the app so imports do not depend on another repository or a remote host.
The storage schema and toast code are unchanged from the ReasonLynx copies.
