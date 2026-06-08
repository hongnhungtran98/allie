-- CreateTable
CREATE TABLE "UserWebhook" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "webhookUrl" TEXT NOT NULL,
    "messageTemplate" TEXT NOT NULL DEFAULT 'Đã có món ở {tên_quán}, mời mọi người nhận món. Danh sách đặt hàng như sau:\n{danh_sách}',

    CONSTRAINT "UserWebhook_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserWebhook_userId_key" ON "UserWebhook"("userId");

-- AddForeignKey
ALTER TABLE "UserWebhook" ADD CONSTRAINT "UserWebhook_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
