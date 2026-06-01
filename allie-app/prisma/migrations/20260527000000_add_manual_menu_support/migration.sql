-- AlterTable FoodOrder: add orderType + menuImageUrl
ALTER TABLE "FoodOrder" ADD COLUMN "orderType" TEXT NOT NULL DEFAULT 'link';
ALTER TABLE "FoodOrder" ADD COLUMN "menuImageUrl" TEXT;

-- AlterTable FoodOrderSelection: add customName, make menuItemId nullable
ALTER TABLE "FoodOrderSelection" ADD COLUMN "customName" TEXT;
ALTER TABLE "FoodOrderSelection" ALTER COLUMN "menuItemId" DROP NOT NULL;

-- Recreate FK on FoodOrderSelection.menuItemId with ON DELETE SET NULL
ALTER TABLE "FoodOrderSelection" DROP CONSTRAINT "FoodOrderSelection_menuItemId_fkey";
ALTER TABLE "FoodOrderSelection" ADD CONSTRAINT "FoodOrderSelection_menuItemId_fkey"
  FOREIGN KEY ("menuItemId") REFERENCES "FoodMenuItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
