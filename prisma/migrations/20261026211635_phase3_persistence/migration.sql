-- CreateTable
CREATE TABLE "Book" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'published',
    "price" INTEGER NOT NULL DEFAULT 0,
    "salesCount" INTEGER NOT NULL DEFAULT 0,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Book_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookOrder" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "userId" TEXT,
    "userEmail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending_payment',
    "finalTotal" INTEGER NOT NULL DEFAULT 0,
    "razorpayOrderId" TEXT,
    "razorpayPaymentId" TEXT,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookCoupon" (
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "discountType" TEXT NOT NULL DEFAULT 'PERCENT',
    "value" INTEGER NOT NULL DEFAULT 0,
    "minCartValue" INTEGER NOT NULL DEFAULT 0,
    "usageLimit" INTEGER,
    "redemptions" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookCoupon_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "PlatformSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "BookWishlistItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookWishlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Book_slug_key" ON "Book"("slug");

-- CreateIndex
CREATE INDEX "Book_status_idx" ON "Book"("status");

-- CreateIndex
CREATE UNIQUE INDEX "BookOrder_orderNumber_key" ON "BookOrder"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "BookOrder_razorpayOrderId_key" ON "BookOrder"("razorpayOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "BookOrder_razorpayPaymentId_key" ON "BookOrder"("razorpayPaymentId");

-- CreateIndex
CREATE INDEX "BookOrder_userId_idx" ON "BookOrder"("userId");

-- CreateIndex
CREATE INDEX "BookOrder_status_idx" ON "BookOrder"("status");

-- CreateIndex
CREATE INDEX "BookWishlistItem_userId_idx" ON "BookWishlistItem"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BookWishlistItem_userId_bookId_key" ON "BookWishlistItem"("userId", "bookId");
