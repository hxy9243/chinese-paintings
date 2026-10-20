# Artwork imports

Both projects now live in the public umbrella repository. Their original working directories and remote configuration were left unchanged.

- Qingming was imported as `artworks/qingming/` with Git subtree and its complete existing commit history.
- Thousand Miles was imported as `artworks/thousand-miles/` with Git subtree and a squashed snapshot. That isolated snapshot includes the existing working-tree brush/mineral study, its scripts, gallery images, and recorded check output.
- Both imported directory trees were checked against their source trees before geometry development started. The original Thousand Miles repository remains the archive for its earlier history.
- 327 Thousand Miles reference, render, model, QA, and manifest files were verified by SHA-256 after import. The [migration record](migration-record.json) lists the source commits, included working changes, and preserved artifact hashes.
- Historical reports and exported media retain the meaning of their saved revisions. New Qingming work and verification are documented separately in [the geometry revision](GEOMETRY_REVISION.md).

The GitHub remote belongs to this new repository. Existing Site identities remain inside the imported project records; no Site was created, changed, or deployed during migration.
