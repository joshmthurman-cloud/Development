-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "colorHex" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Rep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "repColorHex" TEXT,
    CONSTRAINT "Rep_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Territory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerType" TEXT NOT NULL DEFAULT 'REP',
    "ownerId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "stateAbbr" TEXT NOT NULL,
    "countyFips" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "Territory_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Rep" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Group_name_key" ON "Group"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Rep_groupId_name_key" ON "Rep"("groupId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Territory_ownerId_stateAbbr_level_countyFips_key" ON "Territory"("ownerId", "stateAbbr", "level", "countyFips");
