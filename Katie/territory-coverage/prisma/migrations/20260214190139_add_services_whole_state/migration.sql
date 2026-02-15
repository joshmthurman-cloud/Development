-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Group" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "colorHex" TEXT NOT NULL,
    "servicesWholeState" BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO "new_Group" ("colorHex", "id", "name") SELECT "colorHex", "id", "name" FROM "Group";
DROP TABLE "Group";
ALTER TABLE "new_Group" RENAME TO "Group";
CREATE UNIQUE INDEX "Group_name_key" ON "Group"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
