-- DropTable
DROP TABLE IF EXISTS "UserWebhook";

-- CreateTable
CREATE TABLE "SystemWebhook" (
    "id" TEXT NOT NULL DEFAULT 'system',
    "webhookUrl" TEXT NOT NULL,
    "messageTemplate" TEXT NOT NULL DEFAULT 'Đã có món ở {tên_quán}, mời mọi người nhận món. Danh sách đặt hàng như sau:\n{danh_sách}',

    CONSTRAINT "SystemWebhook_pkey" PRIMARY KEY ("id")
);
