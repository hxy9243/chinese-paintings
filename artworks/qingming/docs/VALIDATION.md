# MVP verification

## Automated coverage

- Ten model tests cover the complete reference arrangement, sloping riverbank boundaries, path clearance, collisions, moves, the 40-object cap, save validation, corrupted/unavailable storage, tutorial completion and immutable history.
- Browser suites run the same three scenarios in desktop Chromium and an iPhone-sized Chromium touch context: guided composition through all four categories; variation, move, undo/redo, reload, reference viewing, Chinese switching and 1080 × 1920 PNG download; invalid placement and corrupt-save backup; palette collapse, pause and viewport overflow.
- Production TypeScript compilation and Vite build are checked.
- Runtime dependencies passed `npm audit --omit=dev` with no reported vulnerabilities at implementation time.
- Initial landscape and eight optimized sprites total approximately 0.79 MiB. The original museum detail and art proof are loaded only when their dialogs are opened.

## Visual inspection

Inspected the source detail, initial art proof, empty landscape, generated object studies, desktop editor, mobile editor and downloaded sharing card. Rejected generated checkerboard backgrounds and documented the compositing workaround. Adjusted the mobile camera to open closer to the bridge, keeping a full-composition fit control.

The local preview server needed a restart after a formatter briefly rewrote package.json while Vite was reading its PostCSS configuration. The production build was unaffected. If development ever retains a stale configuration error after a dependency/config edit, restart the preview process.

## Not yet physically verified

- Real iOS Safari and Android Chrome GPU performance, memory and thermal behavior at 40 elements/eight inhabitants.
- Real multi-touch pinch behavior and OS-native share-sheet destinations.
- A five-person, three-minute first-use trial.
- Expert historical/artistic fidelity review. The artwork is an interpretation, not a measured reconstruction.

Browser emulation is not physical device verification. Production delivery and local browser checks do not establish the above claims.
