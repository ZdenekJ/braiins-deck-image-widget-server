// Remove stale build output before `tsc` (e.g. widgets deleted from src/ that would
// otherwise still be discovered in dist/widgets/).
// Only files are deleted: removing directories fails with EBUSY when a sync client
// (Dropbox, OneDrive) holds them open, and empty directories are harmless.
import { existsSync, readdirSync, rmSync } from "fs";
import { join } from "path";

function removeFiles(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      removeFiles(path);
    } else {
      rmSync(path, { force: true });
    }
  }
}

removeFiles("dist");
